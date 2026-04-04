/**
 * MemoryHookManager - Automatic Memory Operations at Key Agent Decision Points
 *
 * Implements memory hooks that automatically store/retrieve memories:
 * - beforeToolCall: Query relevant memories before tool execution
 * - afterTaskCompletion: Store learnings when tasks complete
 * - onErrorRecovery: Capture error recovery patterns
 * - onUserClarification: Store user preferences from AskUserQuestion responses
 *
 * Rate limited to max 10 saves per stage to prevent memory spam.
 *
 * @see spec.md FR-009 through FR-012
 * @see 010-gofer-memory-journey/tasks.md T020-T028
 */

import type { Memory, MemoryType, MemoryQuery, Citation } from './memory';

// ============================================================================
// Types
// ============================================================================

/** Interface for MemoryManager (minimal subset needed) */
export interface MemoryManagerLike {
  save(memory: Omit<Memory, 'id' | 'created'>): Promise<Memory>;
  search(query: MemoryQuery): Promise<{ memories: Memory[]; count: number }>;
  recordUsage(id: string): Promise<void>;
}

/** Context provided to beforeToolCall hook */
export interface ToolCallContext {
  toolName: string;
  toolArgs: Record<string, unknown>;
  filePaths?: string[];
  taskContext?: string;
  stage?: string;
}

/** Context provided to afterTaskCompletion hook */
export interface TaskCompletionContext {
  taskId: string;
  specId: string;
  description: string;
  filesModified: string[];
  patternsUsed?: string[];
  decisionsMode?: string[];
  outcome: 'success' | 'partial' | 'failed';
}

/** Context provided to onErrorRecovery hook */
export interface ErrorRecoveryContext {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  recoverySteps: string[];
  whatWorked?: string;
  whatDidntWork?: string;
  affectedFiles?: string[];
}

/** Context provided to onUserClarification hook */
export interface UserClarificationContext {
  question: string;
  answer: string;
  questionType?: 'preference' | 'approach' | 'confirmation' | 'other';
  specId?: string;
  tags?: string[];
}

/** Result of beforeToolCall hook */
export interface ToolCallMemories {
  /** Formatted memory context for LLM injection */
  formattedContext: string;
  /** Raw memories retrieved */
  memories: Memory[];
  /** Token estimate for the formatted context */
  tokenEstimate: number;
  /** Whether any relevant memories were found */
  hasRelevant: boolean;
}

/** Hook execution result */
export interface HookResult {
  success: boolean;
  memorySaved?: Memory;
  memoriesRetrieved?: Memory[];
  error?: string;
  rateLimited?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum saves per stage to prevent memory spam */
const MAX_SAVES_PER_STAGE = 10;

/** Maximum memories to return from beforeToolCall */
const MAX_TOOL_CALL_MEMORIES = 5;

/** Token budget for formatted memory context */
const DEFAULT_TOKEN_BUDGET = 2000;

// ============================================================================
// MemoryHookManager Class
// ============================================================================

export class MemoryHookManager {
  private readonly memoryManager: MemoryManagerLike;
  private readonly stageSaveCounts: Map<string, number> = new Map();
  private currentStage: string = 'unknown';
  private currentSpecId: string = 'unknown';

  constructor(memoryManager: MemoryManagerLike) {
    this.memoryManager = memoryManager;
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  /**
   * Set the current pipeline stage (for rate limiting and tagging).
   */
  setCurrentStage(stage: string): void {
    this.currentStage = stage;
  }

  /**
   * Set the current spec ID (for memory tagging).
   */
  setCurrentSpecId(specId: string): void {
    this.currentSpecId = specId;
  }

  /**
   * Reset rate limit counters (call at start of new pipeline run).
   */
  resetRateLimits(): void {
    this.stageSaveCounts.clear();
  }

  /**
   * Get current save count for a stage (for testing/monitoring).
   */
  getSaveCount(stage?: string): number {
    return this.stageSaveCounts.get(stage ?? this.currentStage) ?? 0;
  }

  // --------------------------------------------------------------------------
  // beforeToolCall Hook (FR-009)
  // --------------------------------------------------------------------------

  /**
   * Query memories relevant to a tool call before execution.
   *
   * Searches by:
   * - Tool name (e.g., "Edit", "Bash", "Read")
   * - File paths being accessed
   * - Current task context
   *
   * Returns formatted context suitable for LLM injection.
   */
  async beforeToolCall(
    context: ToolCallContext,
    tokenBudget: number = DEFAULT_TOKEN_BUDGET
  ): Promise<ToolCallMemories> {
    const keywords: string[] = [];

    // Add tool name
    keywords.push(context.toolName);

    // Add file paths (extract filename without extension for better matching)
    if (context.filePaths) {
      for (const filePath of context.filePaths) {
        const fileName = filePath
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, '');
        if (fileName) {
          keywords.push(fileName);
        }
      }
    }

    // Add task context keywords
    if (context.taskContext) {
      keywords.push(...this.extractKeywords(context.taskContext));
    }

    // Search for relevant memories
    const query: MemoryQuery = {
      keywords: keywords.join(' '),
      scope: 'both',
      sortByPriority: true,
      excludeStale: true,
      taskContext: context.taskContext,
    };

    try {
      const result = await this.memoryManager.search(query);
      const memories = result.memories.slice(0, MAX_TOOL_CALL_MEMORIES);

      // Record usage for retrieved memories (without incrementing priority)
      // Note: recordUsage only updates lastUsed and usedCount, not priorityIndex
      for (const memory of memories) {
        try {
          await this.memoryManager.recordUsage(memory.id);
        } catch {
          // Usage recording is best-effort - don't block memory retrieval
        }
      }

      // Format for LLM context
      const formatted = this.formatMemoriesForContext(memories, tokenBudget);

      return {
        formattedContext: formatted.text,
        memories,
        tokenEstimate: formatted.tokenEstimate,
        hasRelevant: memories.length > 0,
      };
    } catch (_error) {
      return {
        formattedContext: '',
        memories: [],
        tokenEstimate: 0,
        hasRelevant: false,
      };
    }
  }

  // --------------------------------------------------------------------------
  // afterTaskCompletion Hook (FR-010)
  // --------------------------------------------------------------------------

  /**
   * Store learnings after task completion as procedural memory.
   *
   * Extracts:
   * - Patterns used
   * - Decisions made
   * - Files modified
   *
   * Saves as procedural memory with appropriate tags.
   */
  async afterTaskCompletion(context: TaskCompletionContext): Promise<HookResult> {
    if (this.isRateLimited()) {
      return { success: false, rateLimited: true };
    }

    // Build memory content
    const contentParts: string[] = [
      `Task ${context.taskId} completed (${context.outcome}): ${context.description}`,
    ];

    if (context.filesModified.length > 0) {
      contentParts.push(`Files modified: ${context.filesModified.join(', ')}`);
    }

    if (context.patternsUsed && context.patternsUsed.length > 0) {
      contentParts.push(`Patterns used: ${context.patternsUsed.join(', ')}`);
    }

    if (context.decisionsMode && context.decisionsMode.length > 0) {
      contentParts.push(`Decisions: ${context.decisionsMode.join('; ')}`);
    }

    // Build tags
    const tags = [
      '#auto',
      '#task-completion',
      `#task-${context.taskId}`,
      `#spec-${context.specId}`,
      `#stage-${this.currentStage}`,
      `#outcome-${context.outcome}`,
    ];

    // Build citations from modified files
    const citations: Citation[] = context.filesModified.map((file) => ({
      file,
    }));

    try {
      this.incrementSaveCount();

      const memory = await this.memoryManager.save({
        category: 'task_completion',
        tags,
        scope: 'local',
        content: contentParts.join('\n'),
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: context.specId,
        type: 'procedural' as MemoryType,
        citations: citations.length > 0 ? citations : undefined,
        confidence: context.outcome === 'success' ? 90 : context.outcome === 'partial' ? 60 : 30,
      });

      return { success: true, memorySaved: memory };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // --------------------------------------------------------------------------
  // onErrorRecovery Hook (FR-011)
  // --------------------------------------------------------------------------

  /**
   * Capture error recovery patterns when errors are resolved.
   *
   * Stores:
   * - Error type and message
   * - Recovery steps taken
   * - What worked and what didn't
   *
   * Saves as episodic memory with #error-recovery tag.
   */
  async onErrorRecovery(context: ErrorRecoveryContext): Promise<HookResult> {
    if (this.isRateLimited()) {
      return { success: false, rateLimited: true };
    }

    // Build memory content
    const contentParts: string[] = [
      `Error recovered: ${context.errorType}`,
      `Message: ${context.errorMessage}`,
      '',
      '## Recovery Steps',
      ...context.recoverySteps.map((step, i) => `${i + 1}. ${step}`),
    ];

    if (context.whatWorked) {
      contentParts.push('', `## What Worked`, context.whatWorked);
    }

    if (context.whatDidntWork) {
      contentParts.push('', `## What Didn't Work`, context.whatDidntWork);
    }

    if (context.stackTrace) {
      contentParts.push('', '## Stack Trace (truncated)', context.stackTrace.substring(0, 500));
    }

    // Build tags
    const tags = [
      '#auto',
      '#error-recovery',
      `#error-${context.errorType.toLowerCase().replace(/\s+/g, '-')}`,
      `#stage-${this.currentStage}`,
      `#spec-${this.currentSpecId}`,
    ];

    // Build citations from affected files
    const citations: Citation[] = (context.affectedFiles ?? []).map((file) => ({
      file,
    }));

    try {
      this.incrementSaveCount();

      const memory = await this.memoryManager.save({
        category: 'error_recovery',
        tags,
        scope: 'local',
        content: contentParts.join('\n'),
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: `error:${context.errorType}`,
        type: 'episodic' as MemoryType,
        citations: citations.length > 0 ? citations : undefined,
        confidence: 80, // Error recovery patterns are generally reliable
      });

      return { success: true, memorySaved: memory };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // --------------------------------------------------------------------------
  // onUserClarification Hook (FR-012)
  // --------------------------------------------------------------------------

  /**
   * Store user preferences from AskUserQuestion responses.
   *
   * Extracts user preferences and stores as semantic memory
   * with #preference tag for future reference.
   */
  async onUserClarification(context: UserClarificationContext): Promise<HookResult> {
    if (this.isRateLimited()) {
      return { success: false, rateLimited: true };
    }

    // Build memory content
    const contentParts: string[] = [
      `User preference captured:`,
      `Q: ${context.question}`,
      `A: ${context.answer}`,
    ];

    if (context.questionType) {
      contentParts.push(`Type: ${context.questionType}`);
    }

    // Build tags
    const tags = ['#auto', '#preference', `#stage-${this.currentStage}`, ...(context.tags ?? [])];

    if (context.specId) {
      tags.push(`#spec-${context.specId}`);
    }

    if (context.questionType) {
      tags.push(`#${context.questionType}`);
    }

    try {
      this.incrementSaveCount();

      const memory = await this.memoryManager.save({
        category: 'user_preference',
        tags,
        scope: 'local',
        content: contentParts.join('\n'),
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: context.specId ?? 'user_interaction',
        type: 'semantic' as MemoryType,
        confidence: 100, // User-provided preferences are 100% confident
      });

      return { success: true, memorySaved: memory };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // --------------------------------------------------------------------------
  // Memory Formatting (T026)
  // --------------------------------------------------------------------------

  /**
   * Format retrieved memories for LLM context injection.
   *
   * Includes:
   * - Memory content
   * - Citation info
   * - Confidence level
   * - Tags (for context)
   *
   * Respects token budget.
   */
  formatMemoriesForContext(
    memories: Memory[],
    tokenBudget: number = DEFAULT_TOKEN_BUDGET
  ): { text: string; tokenEstimate: number } {
    if (memories.length === 0) {
      return { text: '', tokenEstimate: 0 };
    }

    const parts: string[] = ['<relevant-memories>'];
    let currentTokens = 10; // Overhead for tags

    for (const memory of memories) {
      // Estimate tokens for this memory (rough: 1 token ≈ 4 chars)
      const memoryText = this.formatSingleMemory(memory);
      const memoryTokens = Math.ceil(memoryText.length / 4);

      // Check if adding this memory would exceed budget
      if (currentTokens + memoryTokens > tokenBudget) {
        break;
      }

      parts.push(memoryText);
      currentTokens += memoryTokens;
    }

    parts.push('</relevant-memories>');

    return {
      text: parts.join('\n'),
      tokenEstimate: currentTokens,
    };
  }

  /**
   * Format a single memory for context injection.
   */
  private formatSingleMemory(memory: Memory): string {
    const lines: string[] = [`<memory id="${memory.id}" confidence="${memory.confidence ?? 50}">`];

    // Category and type
    lines.push(`  Category: ${memory.category}`);
    if (memory.type) {
      lines.push(`  Type: ${memory.type}`);
    }

    // Content (potentially truncated)
    const maxContentLength = 500;
    const content =
      memory.content.length > maxContentLength
        ? memory.content.substring(0, maxContentLength) + '...'
        : memory.content;
    lines.push(`  Content: ${content}`);

    // Citations
    if (memory.citations && memory.citations.length > 0) {
      const citationStrs = memory.citations.map((c) => (c.line ? `${c.file}:${c.line}` : c.file));
      lines.push(`  Citations: ${citationStrs.join(', ')}`);
    }

    // Stale warning
    if (memory.stale) {
      lines.push(`  ⚠️ This memory may be stale (cited files have changed)`);
    }

    // Tags (filtered for relevance)
    const relevantTags = memory.tags.filter(
      (t) => !t.startsWith('#auto') && !t.startsWith('#stage-')
    );
    if (relevantTags.length > 0) {
      lines.push(`  Tags: ${relevantTags.join(' ')}`);
    }

    lines.push('</memory>');
    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  /**
   * Check if the current stage has hit its rate limit.
   */
  private isRateLimited(): boolean {
    const count = this.stageSaveCounts.get(this.currentStage) ?? 0;
    return count >= MAX_SAVES_PER_STAGE;
  }

  /**
   * Increment the save count for the current stage.
   */
  private incrementSaveCount(): void {
    const count = this.stageSaveCounts.get(this.currentStage) ?? 0;
    this.stageSaveCounts.set(this.currentStage, count + 1);
  }

  /**
   * Extract keywords from text for memory search.
   */
  private extractKeywords(text: string): string[] {
    const stopwords = new Set([
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
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'this',
      'that',
      'these',
      'those',
      'it',
      'its',
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s#-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopwords.has(word))
      .slice(0, 10); // Limit keywords
  }
}
