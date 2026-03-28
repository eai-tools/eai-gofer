/**
 * SubAgentContextFactory - Memory context for sub-agents
 * Feature 029: Memory System v2 - US-P1-01
 *
 * Builds targeted memory context for sub-agents (validation, research, etc.)
 * with category-specific filtering, token budget enforcement, and L1 layer selection.
 *
 * T027: Factory class
 * T028: buildValidationContext() for 6 validation categories
 * T029: Category-specific filtering
 * T030: Token budget enforcement (5k-10k per agent)
 * T031: formatMemories() with L1 layer selection
 */

import type { MemoryManager } from '../MemoryManager';
import type { ScoredMemory } from '../memory';

// ============================================================================
// Constants
// ============================================================================

/** Minimum token budget per sub-agent (5k tokens ≈ 20k chars) */
const MIN_TOKEN_BUDGET = 5_000;
/** Maximum token budget per sub-agent (10k tokens ≈ 40k chars) */
const MAX_TOKEN_BUDGET = 10_000;
/** Chars-per-token estimate (4 chars ≈ 1 token) */
const CHARS_PER_TOKEN = 4;

/** Validation categories mapped to their relevant memory tags */
const VALIDATION_CATEGORY_TAGS: Record<string, string[]> = {
  correctness: ['#correctness', '#logic', '#bug', '#test', '#validation_pattern'],
  security: ['#security', '#auth', '#vulnerability', '#owasp', '#validation_pattern'],
  performance: ['#performance', '#optimization', '#bottleneck', '#cache'],
  integration: ['#integration', '#api', '#contract', '#interface', '#integration_point'],
  'test-quality': ['#test', '#coverage', '#mock', '#assertion', '#test_quality'],
  standards: ['#standards', '#convention', '#style', '#lint', '#pattern'],
};

/** Research categories mapped to relevant memory tags */
const RESEARCH_CATEGORY_TAGS: string[] = [
  '#codebase_pattern',
  '#integration_point',
  '#architectural_decision',
  '#technical_debt',
];

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a sub-agent context build operation.
 */
export interface SubAgentContext {
  /** Scored and filtered memories for injection */
  memories: ScoredMemory[];
  /** Approximate token count of the formatted output */
  tokenCount: number;
  /** Categories represented in the result */
  categories: string[];
  /** Formatted string ready for injection into agent prompt */
  formattedContext: string;
}

// ============================================================================
// SubAgentContextFactory
// ============================================================================

/**
 * Builds memory context for sub-agents with category filtering and token budgets.
 *
 * @example
 * ```typescript
 * const factory = new SubAgentContextFactory(memoryManager);
 * const ctx = await factory.buildValidationContext('security', 'Review JWT auth code');
 * // inject ctx.formattedContext into agent prompt
 * ```
 */
export class SubAgentContextFactory {
  constructor(private readonly memoryManager: MemoryManager) {}

  /**
   * T028: Build memory context for a validation sub-agent.
   *
   * Filters memories by the agent's category tags and enforces a 5k-10k token
   * budget.  Always returns at least the most relevant memories up to the budget.
   *
   * @param agentCategory - One of: correctness | security | performance |
   *   integration | test-quality | standards
   * @param taskContext - Task description for relevance scoring
   * @returns SubAgentContext ready for injection
   */
  async buildValidationContext(
    agentCategory: string,
    taskContext: string
  ): Promise<SubAgentContext> {
    const relevantTags = VALIDATION_CATEGORY_TAGS[agentCategory] ?? [];

    // Load memories by priority, biased toward the task context
    const result = await this.memoryManager.loadByPriority({
      limit: 20, // Load more, then filter down
      taskContext,
      priorityWeight: 0.4,
      relevanceWeight: 0.6,
    });

    // T029: Filter by category-specific tags
    const filtered = this.filterByTags(result.memories, relevantTags);

    // T030: Enforce token budget
    const budgeted = this.enforceBudget(filtered, MAX_TOKEN_BUDGET);

    // Ensure minimum of 5 memories when possible
    if (budgeted.length < 5 && result.memories.length >= 5) {
      const extra = result.memories
        .filter((m) => !budgeted.some((b) => b.id === m.id))
        .slice(0, 5 - budgeted.length);
      budgeted.push(...extra);
    }

    const categories = [...new Set(budgeted.map((m) => m.category))];
    const formattedContext = this.formatMemories(budgeted, 'overview');
    const tokenCount = this.estimateTokens(formattedContext);

    return { memories: budgeted, tokenCount, categories, formattedContext };
  }

  /**
   * T070: Build memory context for a research sub-agent.
   *
   * Filters for codebase_pattern, integration_point, and architectural decision
   * memories to surface past patterns and avoid redundant research.
   *
   * @param taskContext - Research task description for relevance scoring
   * @returns SubAgentContext ready for injection
   */
  async buildResearchContext(taskContext: string): Promise<SubAgentContext> {
    const result = await this.memoryManager.loadByPriority({
      limit: 20,
      taskContext,
      priorityWeight: 0.35,
      relevanceWeight: 0.65,
    });

    // T071: Filter to research-relevant tags
    const filtered = this.filterByTags(result.memories, RESEARCH_CATEGORY_TAGS);

    // T030: Enforce token budget
    const budgeted = this.enforceBudget(filtered, MAX_TOKEN_BUDGET);

    const categories = [...new Set(budgeted.map((m) => m.category))];
    const formattedContext = this.formatMemories(budgeted, 'overview');
    const tokenCount = this.estimateTokens(formattedContext);

    return { memories: budgeted, tokenCount, categories, formattedContext };
  }

  /**
   * T072: Get agent-specific guidance string for memory injection.
   */
  getResearchGuidance(): string {
    return (
      '## Past Codebase Patterns\n\n' +
      'The following memories from previous features are relevant to your research. ' +
      'Reference them using their IDs when citing prior patterns.\n\n'
    );
  }

  /**
   * T031: Format memories for injection using the specified layer.
   *
   * Uses L1 (overview) by default for a compact but informative representation.
   * Falls back to L0 (abstract) when overview is unavailable.
   * Falls back to content truncation when neither layer exists.
   *
   * @param memories - Scored memories to format
   * @param useLayer - Which ContextLayer tier to use (default: 'overview')
   * @returns Markdown-formatted string for agent prompt injection
   */
  formatMemories(
    memories: ScoredMemory[],
    useLayer: 'abstract' | 'overview' | 'detail' = 'overview'
  ): string {
    if (memories.length === 0) {
      return '';
    }

    const lines: string[] = ['## Relevant Memories\n'];

    for (const memory of memories) {
      const text = this.getLayerText(memory, useLayer);
      lines.push(`### Memory: ${memory.id.substring(0, 8)}`);
      lines.push(`**Category**: ${memory.category} | **Tags**: ${memory.tags.join(', ')}`);
      lines.push(`**Score**: ${memory.combinedScore.toFixed(1)} | **Used**: ${memory.usedCount}x`);
      lines.push('');
      lines.push(text);
      lines.push('');
    }

    return lines.join('\n');
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * T029: Filter memories by tag overlap with the given tag list.
   * Returns all matching memories in order of most tags matched.
   */
  private filterByTags(memories: ScoredMemory[], tags: string[]): ScoredMemory[] {
    if (tags.length === 0) {
      return memories;
    }

    const tagSet = new Set(tags.map((t) => t.toLowerCase()));
    return memories.filter((m) =>
      m.tags.some((tag) => tagSet.has(tag.toLowerCase()))
    );
  }

  /**
   * T030: Truncate memories list to fit within the token budget.
   * Greedy approach: add memories until budget exhausted.
   */
  private enforceBudget(memories: ScoredMemory[], maxTokens: number): ScoredMemory[] {
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    const result: ScoredMemory[] = [];
    let usedChars = 0;
    const minChars = MIN_TOKEN_BUDGET * CHARS_PER_TOKEN;

    for (const memory of memories) {
      const text = this.getLayerText(memory, 'overview');
      const textLen = text.length + 150; // overhead for formatting
      if (usedChars + textLen > maxChars && usedChars >= minChars) {
        break;
      }
      result.push(memory);
      usedChars += textLen;
    }

    return result;
  }

  /**
   * Get text from the best available layer for a memory.
   */
  private getLayerText(memory: ScoredMemory, layer: 'abstract' | 'overview' | 'detail'): string {
    if (layer === 'overview' && memory.layers?.overview) {
      return memory.layers.overview;
    }
    if ((layer === 'overview' || layer === 'abstract') && memory.layers?.abstract) {
      return memory.layers.abstract;
    }
    // Fallback: truncate content
    const maxChars = layer === 'abstract' ? 150 : 2000;
    return memory.content.length > maxChars
      ? `${memory.content.slice(0, maxChars)}...`
      : memory.content;
  }

  /** Estimate token count from character length */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }
}
