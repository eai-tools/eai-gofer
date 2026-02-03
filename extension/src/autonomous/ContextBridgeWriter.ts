/**
 * ContextBridgeWriter
 *
 * Writes enriched context from the extension's ContextBuilder to a JSON file
 * that the language server can read. This enables cross-process communication
 * between the extension host and the language server via a file-based bridge.
 *
 * Spec 013 Phase 3 (T020-T022)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ContextBuilder, TaskContext, BuiltContext } from './ContextBuilder';

/** Shape of the bridge file written to disk */
export interface EnrichedContextBridge {
  timestamp: number;
  specId: string;
  taskId: string;
  sections: {
    constitution?: string;
    hints?: string;
    memories?: string;
    research?: string;
    /** Code context including entity graph data */
    code?: string;
  };
  memoryCoverage?: {
    coveredKeywords: string[];
    uncoveredKeywords: string[];
    coveragePercent: number;
    memoriesLoaded: number;
    researchLoadedForGaps: boolean;
    researchTriggers: string[];
  };
  budgetUsage?: {
    stage: string;
    usage: Record<string, number>;
    limits: Record<string, number>;
    exceededCategories: string[];
    totalExceeded: boolean;
  };
}

export class ContextBridgeWriter {
  private contextBuilder: ContextBuilder;
  private workspacePath: string;
  private bridgePath: string;

  constructor(contextBuilder: ContextBuilder, workspacePath: string) {
    this.contextBuilder = contextBuilder;
    this.workspacePath = workspacePath;
    this.bridgePath = path.join(workspacePath, '.specify', 'memory', 'enriched-context.json');
  }

  /**
   * Build context for a task and write to bridge file.
   * Uses atomic write (temp file + rename) to prevent partial reads.
   */
  async writeEnrichedContext(task: TaskContext): Promise<void> {
    const builtContext = await this.contextBuilder.buildContext(task);
    const bridge = this.buildBridgeData(task, builtContext);

    // Ensure directory exists
    const dir = path.dirname(this.bridgePath);
    await fs.promises.mkdir(dir, { recursive: true });

    // Atomic write: write to temp file, then rename
    const tmpPath = path.join(os.tmpdir(), `gofer-bridge-${Date.now()}.json`);
    await fs.promises.writeFile(tmpPath, JSON.stringify(bridge, null, 2), 'utf-8');
    await fs.promises.rename(tmpPath, this.bridgePath);
  }

  /** Build the bridge data structure from ContextBuilder output */
  private buildBridgeData(task: TaskContext, built: BuiltContext): EnrichedContextBridge {
    const bridge: EnrichedContextBridge = {
      timestamp: Date.now(),
      specId: task.specId,
      taskId: task.taskId,
      sections: {
        constitution: built.sections.constitution,
        hints: built.sections.hints,
        memories: built.sections.memories,
        research: built.sections.research,
        code: built.sections.code,
      },
    };

    if (built.memoryCoverage) {
      bridge.memoryCoverage = {
        coveredKeywords: built.memoryCoverage.coveredKeywords || [],
        uncoveredKeywords: built.memoryCoverage.uncoveredKeywords || [],
        coveragePercent: built.memoryCoverage.coveragePercent || 0,
        memoriesLoaded: built.memoryCoverage.memoriesLoaded || 0,
        researchLoadedForGaps: built.memoryCoverage.researchLoadedForGaps || false,
        researchTriggers: built.memoryCoverage.researchTriggers || [],
      };
    }

    if (built.budgetUsage) {
      bridge.budgetUsage = {
        stage: built.stage || 'unknown',
        usage: built.budgetUsage.usage || {},
        limits: built.budgetUsage.limits || {},
        exceededCategories: built.budgetUsage.exceededCategories || [],
        totalExceeded: built.budgetUsage.totalExceeded || false,
      };
    }

    return bridge;
  }
}
