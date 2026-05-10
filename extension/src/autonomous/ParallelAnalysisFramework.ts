/**
 * ParallelAnalysisFramework - Sub-agent partition recommendations
 *
 * Generates partition recommendations for parallel analysis by suggesting
 * how to split codebase exploration across sub-agents. Recommendations
 * are based on directory structure, file types, and current task context.
 *
 * Pure advisory — Claude Code decides whether to act on the recommendations.
 * When included in buildContext() output, recommends which sub-agents to spawn
 * via the Task tool and what each should search for.
 *
 * @see spec 017 T066: Parallel analysis framework
 */

import * as path from 'path';
import { Logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

/** A recommended partition for parallel analysis */
export interface PartitionRecommendation {
  /** Sub-agent type to use (e.g., 'codebase-locator', 'codebase-analyzer') */
  agentType: string;
  /** What to search for */
  searchTarget: string;
  /** Directory or file scope */
  scope: string;
  /** Reason for this partition */
  reason: string;
  /** Priority (1=highest) */
  priority: number;
}

/** Full analysis recommendation */
export interface AnalysisRecommendation {
  partitions: PartitionRecommendation[];
  strategy: 'by-directory' | 'by-filetype' | 'by-concern';
  totalPartitions: number;
  estimatedTokenSavings: number;
}

/** Configuration */
export interface ParallelAnalysisConfig {
  /** Maximum partitions to recommend (default: 5) */
  maxPartitions: number;
  /** Minimum files in a directory to warrant a partition (default: 3) */
  minFilesPerPartition: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: ParallelAnalysisConfig = {
  maxPartitions: 5,
  minFilesPerPartition: 3,
};

/** File type groups for by-filetype partitioning */
const FILE_TYPE_GROUPS: Record<string, string[]> = {
  source: ['.ts', '.tsx', '.js', '.jsx'],
  test: ['.test.ts', '.test.tsx', '.spec.ts', '.test.js'],
  config: ['.json', '.yaml', '.yml', '.toml'],
  docs: ['.md', '.txt'],
};

// ============================================================================
// ParallelAnalysisFramework
// ============================================================================

export class ParallelAnalysisFramework {
  private readonly workspaceRoot: string;
  private readonly config: ParallelAnalysisConfig;
  private readonly logger: Logger;

  constructor(workspaceRoot: string, config?: Partial<ParallelAnalysisConfig>) {
    this.workspaceRoot = workspaceRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = Logger.for('ParallelAnalysisFramework');
  }

  /**
   * Generate partition recommendations for analyzing a set of files.
   *
   * @param affectedFiles - Files relevant to the current task
   * @param taskDescription - Description of what needs analysis
   * @returns Analysis recommendation with partitions
   */
  generateRecommendations(
    affectedFiles: string[],
    taskDescription: string
  ): AnalysisRecommendation {
    if (affectedFiles.length === 0) {
      return this.generateDefaultRecommendations(taskDescription);
    }

    // Determine best strategy
    const dirGroups = this.groupByDirectory(affectedFiles);
    const typeGroups = this.groupByType(affectedFiles);

    // Pick strategy with most balanced partitions
    const dirPartitions = Object.keys(dirGroups).length;
    const typePartitions = Object.keys(typeGroups).length;

    if (dirPartitions >= 2 && dirPartitions <= this.config.maxPartitions) {
      return this.buildDirectoryRecommendation(dirGroups, taskDescription);
    } else if (typePartitions >= 2) {
      return this.buildFileTypeRecommendation(typeGroups, taskDescription);
    }

    return this.buildConcernRecommendation(affectedFiles, taskDescription);
  }

  /**
   * Format recommendations as a context section for ContextBuilder.
   */
  formatAsContextSection(recommendation: AnalysisRecommendation): string {
    if (recommendation.partitions.length === 0) {return '';}

    const lines = [
      '## Parallel Analysis Recommendations',
      '',
      `**Strategy**: ${recommendation.strategy} (${recommendation.totalPartitions} partitions)`,
      '',
      '| Priority | Agent | Scope | Target | Reason |',
      '|----------|-------|-------|--------|--------|',
    ];

    for (const p of recommendation.partitions) {
      lines.push(`| ${p.priority} | ${p.agentType} | ${p.scope} | ${p.searchTarget} | ${p.reason} |`);
    }

    lines.push('');
    lines.push('_These are advisory recommendations. Use the Task tool to spawn sub-agents as needed._');

    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // Partitioning strategies
  // --------------------------------------------------------------------------

  private groupByDirectory(files: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    for (const file of files) {
      const dir = path.dirname(file);
      // Group by top-level directory under src/
      const parts = dir.split(path.sep);
      const groupKey = parts.length >= 2 ? parts.slice(0, 2).join('/') : dir;
      if (!groups[groupKey]) {groups[groupKey] = [];}
      groups[groupKey].push(file);
    }
    return groups;
  }

  private groupByType(files: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    for (const file of files) {
      let group = 'other';
      for (const [typeName, extensions] of Object.entries(FILE_TYPE_GROUPS)) {
        if (extensions.some(ext => file.endsWith(ext))) {
          group = typeName;
          break;
        }
      }
      if (!groups[group]) {groups[group] = [];}
      groups[group].push(file);
    }
    return groups;
  }

  private buildDirectoryRecommendation(
    dirGroups: Record<string, string[]>,
    taskDescription: string
  ): AnalysisRecommendation {
    const partitions: PartitionRecommendation[] = [];
    let priority = 1;

    const sortedDirs = Object.entries(dirGroups).sort((a, b) => b[1].length - a[1].length);

    for (const [dir, files] of sortedDirs) {
      if (partitions.length >= this.config.maxPartitions) {break;}
      if (files.length < this.config.minFilesPerPartition) {continue;}

      partitions.push({
        agentType: priority <= 2 ? 'codebase-analyzer' : 'codebase-locator',
        searchTarget: taskDescription.slice(0, 100),
        scope: dir,
        reason: `${files.length} relevant files in ${dir}`,
        priority: priority++,
      });
    }

    return {
      partitions,
      strategy: 'by-directory',
      totalPartitions: partitions.length,
      estimatedTokenSavings: partitions.length * 2000, // ~2k tokens saved per parallel agent
    };
  }

  private buildFileTypeRecommendation(
    typeGroups: Record<string, string[]>,
    taskDescription: string
  ): AnalysisRecommendation {
    const partitions: PartitionRecommendation[] = [];
    let priority = 1;

    for (const [typeName, files] of Object.entries(typeGroups)) {
      if (partitions.length >= this.config.maxPartitions) {break;}

      const agentType = typeName === 'test' ? 'codebase-pattern-finder' :
        typeName === 'source' ? 'codebase-analyzer' : 'codebase-locator';

      partitions.push({
        agentType,
        searchTarget: `${typeName} files related to: ${taskDescription.slice(0, 80)}`,
        scope: `**/*.{${files.map(f => path.extname(f).slice(1)).filter((v, i, a) => a.indexOf(v) === i).join(',')}}`,
        reason: `${files.length} ${typeName} files to analyze`,
        priority: priority++,
      });
    }

    return {
      partitions,
      strategy: 'by-filetype',
      totalPartitions: partitions.length,
      estimatedTokenSavings: partitions.length * 2000,
    };
  }

  private buildConcernRecommendation(
    files: string[],
    taskDescription: string
  ): AnalysisRecommendation {
    // Split by concern: implementation vs tests vs config
    const partitions: PartitionRecommendation[] = [
      {
        agentType: 'codebase-analyzer',
        searchTarget: `Implementation for: ${taskDescription.slice(0, 80)}`,
        scope: 'extension/src/',
        reason: 'Analyze implementation code',
        priority: 1,
      },
      {
        agentType: 'codebase-pattern-finder',
        searchTarget: `Patterns for: ${taskDescription.slice(0, 80)}`,
        scope: '.',
        reason: 'Find similar implementations to model after',
        priority: 2,
      },
    ];

    return {
      partitions,
      strategy: 'by-concern',
      totalPartitions: partitions.length,
      estimatedTokenSavings: partitions.length * 2000,
    };
  }

  private generateDefaultRecommendations(taskDescription: string): AnalysisRecommendation {
    return this.buildConcernRecommendation([], taskDescription);
  }

  /**
   * 019 T048-T049: Generate explicit parallel dispatch instructions.
   * Returns structured dispatch blocks that can be injected into context,
   * with result collection points for each partition.
   */
  executeParallelQueries(
    affectedFiles: string[],
    taskDescription: string
  ): string {
    const recommendation = this.generateRecommendations(affectedFiles, taskDescription);
    if (recommendation.partitions.length === 0) {return '';}

    const lines: string[] = [
      '## Parallel Analysis Dispatch',
      '',
      `**Strategy**: ${recommendation.strategy}`,
      `**Partitions**: ${recommendation.totalPartitions}`,
      `**Estimated token savings**: ~${recommendation.estimatedTokenSavings} tokens`,
      '',
    ];

    for (const partition of recommendation.partitions) {
      lines.push(`### Partition ${partition.priority}: ${partition.agentType}`);
      lines.push('');
      lines.push(`Use the Task tool with \`subagent_type="${partition.agentType}"\``);
      lines.push(`- **Scope**: ${partition.scope}`);
      lines.push(`- **Target**: ${partition.searchTarget}`);
      lines.push(`- **Reason**: ${partition.reason}`);
      lines.push('');
      lines.push(`<!-- PARALLEL_RESULT_START partition="${partition.priority}" agent="${partition.agentType}" -->`);
      lines.push(`[Sub-agent result for partition ${partition.priority}]`);
      lines.push(`<!-- PARALLEL_RESULT_END -->`);
      lines.push('');
    }

    return lines.join('\n');
  }
}
