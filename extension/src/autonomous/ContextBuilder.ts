/**
 * Context Builder - Merges memories, hints, and task context for LLM prompts
 *
 * Responsibilities:
 * - Load and merge memories from MemoryManager
 * - Load and merge hints from HintLoader
 * - Build constitution context
 * - Combine all context sources into single prompt
 *
 * Priority hierarchy:
 * 1. Task-specific context (from tasks.md)
 * 2. Directory hints (priority 10)
 * 3. Project hints (priority 5)
 * 4. Global hints (priority 1)
 * 5. Relevant memories
 * 6. Constitution
 */

import * as path from 'path';
import * as fs from 'fs';
import { HintLoader } from './HintLoader';
import { MemoryManager } from './MemoryManager';
import type { Memory } from './memory';

/**
 * Task information for context building
 */
export interface TaskContext {
  taskId: string;
  specId: string;
  description: string;
  affectedFiles?: string[];
  declaredHints?: string[]; // From spec frontmatter
  customContext?: string; // Additional context from task definition
}

/**
 * Built context result
 */
export interface BuiltContext {
  fullContext: string;
  sections: {
    constitution?: string;
    hints?: string;
    memories?: string;
    taskContext?: string;
  };
  loadTime: number;
  hintsLoadTime: number;
  memoriesLoadTime: number;
}

export class ContextBuilder {
  private readonly workspaceRoot: string;
  private readonly hintLoader: HintLoader;
  private readonly memoryManager: MemoryManager;

  constructor(workspaceRoot: string, memoryManager: MemoryManager, hintLoader?: HintLoader) {
    this.workspaceRoot = workspaceRoot;
    this.memoryManager = memoryManager;
    this.hintLoader = hintLoader || new HintLoader(workspaceRoot);
  }

  /**
   * Build complete context for a task
   *
   * Merges all context sources in priority order:
   * 1. Constitution
   * 2. Hints (directory > project > global)
   * 3. Memories
   * 4. Task-specific context
   *
   * @param task - Task information
   * @returns Built context with all sections
   */
  async buildContext(task: TaskContext): Promise<BuiltContext> {
    const startTime = Date.now();
    const sections: BuiltContext['sections'] = {};

    // 1. Load constitution
    const constitutionPath = path.join(this.workspaceRoot, '.specify', 'memory', 'constitution.md');

    if (fs.existsSync(constitutionPath)) {
      sections.constitution = fs.readFileSync(constitutionPath, 'utf-8');
    }

    // 2. Load hints
    const hintsStartTime = Date.now();
    const hintResult = await this.hintLoader.loadForTask({
      affectedFiles: task.affectedFiles || [],
      declaredHints: task.declaredHints || [],
      includeGlobal: true,
      includeProject: true,
    });
    const hintsLoadTime = Date.now() - hintsStartTime;

    if (hintResult.mergedContent) {
      sections.hints = hintResult.mergedContent;
    }

    // 3. Load memories
    const memoriesStartTime = Date.now();
    const memories = await this.loadRelevantMemories(task);
    const memoriesLoadTime = Date.now() - memoriesStartTime;

    if (memories.length > 0) {
      sections.memories = this.formatMemories(memories);
    }

    // 4. Task-specific context
    if (task.customContext) {
      sections.taskContext = task.customContext;
    }

    // Build full context
    const fullContext = this.mergeContextSections(sections);
    const loadTime = Date.now() - startTime;

    return {
      fullContext,
      sections,
      loadTime,
      hintsLoadTime,
      memoriesLoadTime,
    };
  }

  /**
   * Load memories relevant to the task
   *
   * Searches for memories by:
   * - Tags matching task description keywords
   * - Concepts related to affected files
   * - Recent memories (within last 30 days)
   *
   * @param task - Task information
   * @returns Array of relevant memories
   */
  private async loadRelevantMemories(task: TaskContext): Promise<Memory[]> {
    // Extract keywords from task description
    const keywords = this.extractKeywords(task.description);

    // Load memories by tags using search()
    const searchResults = await Promise.all(
      keywords.map((keyword) =>
        this.memoryManager.search({
          tags: [keyword],
        })
      )
    );

    // Flatten and deduplicate
    const allMemories = searchResults.flatMap((result) => result.memories);
    const uniqueMemories = Array.from(new Map(allMemories.map((m: Memory) => [m.id, m])).values());

    // Sort by relevance (more recent = more relevant)
    uniqueMemories.sort((a: Memory, b: Memory) => {
      return b.created - a.created; // Descending (more recent first)
    });

    // Limit to 10 most relevant memories
    return uniqueMemories.slice(0, 10);
  }

  /**
   * Extract keywords from text for memory search
   *
   * Simple keyword extraction:
   * - Lowercase
   * - Remove common words
   * - Split on whitespace
   *
   * @param text - Text to extract keywords from
   * @returns Array of keywords
   */
  private extractKeywords(text: string): string[] {
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'be',
      'been',
      'are',
      'have',
      'has',
      'had',
    ]);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3 && !commonWords.has(word))
      .slice(0, 5); // Limit to 5 keywords
  }

  /**
   * Format memories into markdown string
   *
   * Each memory is formatted as:
   * ```
   * ### Memory: [Category]
   * **Tags**: tag1, tag2
   * **Created**: 2025-01-15
   *
   * [Content]
   * ```
   *
   * @param memories - Array of memories
   * @returns Formatted markdown string
   */
  private formatMemories(memories: Memory[]): string {
    if (memories.length === 0) {
      return '';
    }

    const parts: string[] = ['# Relevant Memories\n'];

    for (const memory of memories) {
      parts.push(`### Memory: ${memory.category}\n`);
      parts.push(`**Tags**: ${memory.tags.join(', ')}\n`);
      parts.push(`**Created**: ${new Date(memory.created).toISOString().split('T')[0]}\n`);
      parts.push('\n');
      parts.push(memory.content);
      parts.push('\n');
    }

    return parts.join('\n');
  }

  /**
   * Merge context sections into single string
   *
   * Order:
   * 1. Constitution
   * 2. Hints
   * 3. Memories
   * 4. Task context
   *
   * Each section separated by "---"
   *
   * @param sections - Context sections
   * @returns Merged context string
   */
  private mergeContextSections(sections: BuiltContext['sections']): string {
    const parts: string[] = [];

    if (sections.constitution) {
      parts.push('# Constitution\n');
      parts.push(sections.constitution);
    }

    if (sections.hints) {
      parts.push('# Coding Hints\n');
      parts.push(sections.hints);
    }

    if (sections.memories) {
      parts.push(sections.memories);
    }

    if (sections.taskContext) {
      parts.push('# Task Context\n');
      parts.push(sections.taskContext);
    }

    return parts.join('\n\n---\n\n');
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.hintLoader.dispose();
  }
}
