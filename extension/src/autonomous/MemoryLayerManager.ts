/**
 * MemoryLayerManager - MemGPT-inspired Three-Layer Memory Architecture
 *
 * Provides a three-layer memory system inspired by MemGPT:
 * - Core Memory: Always loaded (current task, key decisions)
 * - Recall Memory: Recent memories limited by recency window
 * - Archival Memory: Searchable long-term storage
 *
 * The layer manager sits on top of MemoryManager and ObservationMasker,
 * providing a unified API for ContextBuilder to use when
 * `useLayeredMemory: true`.
 *
 * @see spec 017 T062: MemGPT three-layer architecture
 */

import { Logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

/** Duck-typed interface for MemoryManager dependency */
export interface MemoryManagerLike {
  search(query: {
    keywords?: string;
    tags?: string[];
    scope?: string;
    excludeSystemMemories?: boolean;
  }): Promise<{ memories: MemoryItem[] }>;
  loadByPriority(options: {
    limit?: number;
    taskContext?: string;
    scope?: 'local' | 'global' | 'both';
    excludeSystemMemories?: boolean;
  }): Promise<{ memories: MemoryItem[] }>;
}

/** Duck-typed memory item */
export interface MemoryItem {
  id: string;
  content: string;
  category: string;
  tags: string[];
  created: number;
  lastUsed: number;
  usedCount: number;
  priorityIndex?: number;
  type?: string;
  confidence?: number;
  stale?: boolean;
}

/** Duck-typed LLM provider for scoring */
export interface LLMScorerLike {
  isAvailable(): boolean;
  isRateLimited(): boolean;
  summarize(prompt: string, maxTokens?: number): Promise<{ text: string } | null>;
}

/** Layer classification */
export type MemoryLayer = 'core' | 'recall' | 'archival';

/** Result of a layer query */
export interface LayerResult {
  layer: MemoryLayer;
  memories: MemoryItem[];
  tokenEstimate: number;
}

/** Configuration for the layer manager */
export interface MemoryLayerConfig {
  /** Max memories in recall window (default: 20) */
  recallLimit: number;
  /** Max age in ms for recall memories (default: 1 hour) */
  recallWindowMs: number;
  /** Core memory tags (always loaded) */
  coreTags: string[];
  /** Core memory categories (always loaded) */
  coreCategories: string[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: MemoryLayerConfig = {
  recallLimit: 20,
  recallWindowMs: 60 * 60 * 1000, // 1 hour
  coreTags: ['#task-context', '#key-decision', '#core'],
  coreCategories: ['task_context', 'decisions'],
};

// ============================================================================
// MemoryLayerManager
// ============================================================================

export class MemoryLayerManager {
  private readonly config: MemoryLayerConfig;
  private readonly logger: Logger;
  private readonly workspaceRoot: string;
  private memoryManager?: MemoryManagerLike;
  private llmProvider?: LLMScorerLike;

  constructor(workspaceRoot: string, config?: Partial<MemoryLayerConfig>) {
    this.workspaceRoot = workspaceRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = Logger.for('MemoryLayerManager');
  }

  /**
   * Set the memory manager dependency.
   */
  setMemoryManager(manager: MemoryManagerLike): void {
    this.memoryManager = manager;
  }

  /**
   * T073: Set optional LLM provider for scored memory demotion.
   */
  setLLMProvider(provider: LLMScorerLike): void {
    this.llmProvider = provider;
  }

  // --------------------------------------------------------------------------
  // Core Memory Layer
  // --------------------------------------------------------------------------

  /**
   * Get core memories: current task context, key decisions.
   * These are always loaded into context, never demoted.
   * Note: Constitution is loaded separately by ContextBuilder, not as a memory.
   */
  async getCoreMemory(): Promise<LayerResult> {
    const memories: MemoryItem[] = [];

    // Load memories tagged as core
    if (this.memoryManager) {
      for (const tag of this.config.coreTags) {
        try {
          const result = await this.memoryManager.search({
            tags: [tag],
            excludeSystemMemories: true,
          });
          for (const mem of result.memories) {
            if (!memories.find((m) => m.id === mem.id)) {
              memories.push(mem);
            }
          }
        } catch {
          this.logger.warn('Failed to search core memories', { tag });
        }
      }
    }

    const tokenEstimate = memories.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    this.logger.debug('Core memory loaded', { count: memories.length, tokenEstimate });

    return { layer: 'core', memories, tokenEstimate };
  }

  // --------------------------------------------------------------------------
  // Recall Memory Layer
  // --------------------------------------------------------------------------

  /**
   * Get recall memories: recent memories within the recency window.
   * Limited by count and recency.
   */
  async getRecallMemory(limit?: number): Promise<LayerResult> {
    const recallLimit = limit ?? this.config.recallLimit;
    const memories: MemoryItem[] = [];

    if (!this.memoryManager) {
      return { layer: 'recall', memories: [], tokenEstimate: 0 };
    }

    try {
      const result = await this.memoryManager.loadByPriority({
        limit: recallLimit,
        excludeSystemMemories: true,
      });
      const now = Date.now();
      const windowStart = now - this.config.recallWindowMs;

      for (const mem of result.memories) {
        // Only include memories used recently (within recall window)
        if (mem.lastUsed >= windowStart) {
          memories.push(mem);
        }
      }
    } catch {
      this.logger.warn('Failed to load recall memories');
    }

    const tokenEstimate = memories.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    this.logger.debug('Recall memory loaded', { count: memories.length, tokenEstimate });

    return { layer: 'recall', memories, tokenEstimate };
  }

  // --------------------------------------------------------------------------
  // Archival Memory Layer
  // --------------------------------------------------------------------------

  /**
   * Search archival memories by query. Archival is everything not in core/recall.
   */
  async searchArchival(query: string): Promise<LayerResult> {
    if (!this.memoryManager) {
      return { layer: 'archival', memories: [], tokenEstimate: 0 };
    }

    try {
      const result = await this.memoryManager.search({
        keywords: query,
        excludeSystemMemories: true,
      });
      const tokenEstimate = result.memories.reduce(
        (sum, m) => sum + Math.ceil(m.content.length / 4),
        0
      );

      this.logger.debug('Archival search', { query, resultCount: result.memories.length });
      return { layer: 'archival', memories: result.memories, tokenEstimate };
    } catch {
      this.logger.warn('Archival search failed', { query });
      return { layer: 'archival', memories: [], tokenEstimate: 0 };
    }
  }

  // --------------------------------------------------------------------------
  // T073: Memory Demotion
  // --------------------------------------------------------------------------

  /**
   * Demote low-relevance memories from recall to archival.
   *
   * When LLM is available, uses LLM scoring to determine relevance
   * to the current task. Falls back to priority-based demotion.
   *
   * @param currentTask - Description of current task for relevance scoring
   * @returns Number of memories demoted
   */
  async demoteMemories(currentTask?: string): Promise<number> {
    if (!this.memoryManager) {
      return 0;
    }

    try {
      const recall = await this.getRecallMemory(50); // Get more than usual for demotion candidates
      if (recall.memories.length <= this.config.recallLimit) {
        return 0; // Nothing to demote
      }

      const candidates = recall.memories.slice(this.config.recallLimit);

      if (
        this.llmProvider &&
        this.llmProvider.isAvailable() &&
        !this.llmProvider.isRateLimited() &&
        currentTask
      ) {
        // LLM-scored demotion
        return this.demoteWithLLM(candidates, currentTask);
      }

      // Fallback: priority-based demotion (lowest priorityIndex first)
      return this.demoteByPriority(candidates);
    } catch {
      this.logger.warn('Memory demotion failed');
      return 0;
    }
  }

  private async demoteWithLLM(candidates: MemoryItem[], currentTask: string): Promise<number> {
    let demoted = 0;

    for (const mem of candidates) {
      if (this.llmProvider!.isRateLimited()) {
        break;
      }

      try {
        const prompt = `Rate the relevance of this memory to the current task on a scale of 0-10. Return ONLY a number.\n\nTask: ${currentTask.slice(0, 500)}\n\nMemory: ${mem.content.slice(0, 500)}`;
        const result = await this.llmProvider!.summarize(prompt, 10);
        if (result && result.text) {
          const score = parseInt(result.text.trim(), 10);
          if (!isNaN(score) && score <= 3) {
            // Low relevance — mark as stale for demotion
            mem.stale = true;
            demoted++;
          }
        }
      } catch {
        // Skip on error
      }
    }

    this.logger.info('LLM-scored demotion', { candidates: candidates.length, demoted });
    return demoted;
  }

  private demoteByPriority(candidates: MemoryItem[]): number {
    // Sort by priority (lowest first) and mark bottom half as stale
    const sorted = [...candidates].sort((a, b) => (a.priorityIndex || 0) - (b.priorityIndex || 0));
    const demoteCount = Math.floor(sorted.length / 2);

    for (let i = 0; i < demoteCount; i++) {
      sorted[i].stale = true;
    }

    this.logger.info('Priority-based demotion', {
      candidates: candidates.length,
      demoted: demoteCount,
    });
    return demoteCount;
  }

  // --------------------------------------------------------------------------
  // Utility
  // --------------------------------------------------------------------------

  /**
   * Format all layers as a context section for ContextBuilder.
   */
  async formatAsContextSection(_taskContext?: string): Promise<string> {
    const core = await this.getCoreMemory();
    const recall = await this.getRecallMemory();

    const sections: string[] = [];

    if (core.memories.length > 0) {
      sections.push('## Core Memory\n');
      for (const mem of core.memories) {
        sections.push(`### ${mem.category}\n${mem.content}\n`);
      }
    }

    if (recall.memories.length > 0) {
      sections.push('## Recall Memory\n');
      for (const mem of recall.memories) {
        const tags = mem.tags.join(', ');
        sections.push(
          `- **[${mem.category}]** ${mem.content.slice(0, 200)}${mem.content.length > 200 ? '...' : ''} _(${tags})_`
        );
      }
    }

    return sections.join('\n');
  }
}
