/**
 * LLM-powered content extractor for Memory System v2
 *
 * Generates tiered ContextLayer representations (L0/L1/L2) for memory content
 * using Claude Haiku via AutonomousLLMProvider. Degrades gracefully to
 * deterministic truncation when the LLM is unavailable or rate-limited.
 *
 * Feature 029: Memory System v2 - Tiered Context Loading
 */

import { AutonomousLLMProvider } from '../LLMProvider';
import type { ContextLayer } from '../types';

// Token budgets for LLM calls
const ABSTRACT_MAX_TOKENS = 100;
const OVERVIEW_MAX_TOKENS = 500; // Haiku token budget; actual text target is ~2000 chars

// Fallback char limits when LLM is unavailable
const ABSTRACT_FALLBACK_CHARS = 100;
const OVERVIEW_FALLBACK_CHARS = 2000;

/**
 * Prompt template for L0 (one-sentence abstract, ~100 tokens).
 * Inline system instruction keeps the single-message Haiku call simple.
 */
const ABSTRACT_PROMPT_HEADER =
  'Respond with exactly one sentence (under 100 tokens) that captures the core meaning ' +
  'of the content below. Output the sentence only—no preamble, no trailing punctuation ' +
  'beyond a period.\n\nContent:\n';

/**
 * Prompt template for L1 (key-points overview, ~2000 chars / ~500 tokens).
 * Inline system instruction for the single-message Haiku call.
 */
const OVERVIEW_PROMPT_HEADER =
  'Extract the key points from the content below into a concise structured overview ' +
  '(under 500 tokens). Use bullet points where helpful. Output the overview only—no preamble.\n\nContent:\n';

/**
 * Extracts tiered ContextLayer representations from raw content.
 *
 * Uses AutonomousLLMProvider (Claude Haiku) when available; falls back to
 * deterministic truncation for offline / rate-limited scenarios.
 *
 * @example
 * ```typescript
 * const extractor = new LLMExtractor(provider);
 * const layers = await extractor.generateLayers(memoryContent);
 * console.log(layers.abstract); // one sentence
 * console.log(layers.overview); // key points
 * console.log(await layers.detail()); // full content
 * ```
 */
export class LLMExtractor {
  private readonly provider: AutonomousLLMProvider | null;

  /**
   * @param provider - Optional pre-configured AutonomousLLMProvider instance.
   * @param workspaceRoot - Optional workspace root used to construct a default
   *   provider when `provider` is omitted. Ignored if `provider` is supplied.
   */
  constructor(provider?: AutonomousLLMProvider, workspaceRoot?: string) {
    if (provider !== undefined) {
      this.provider = provider;
    } else if (workspaceRoot !== undefined) {
      this.provider = new AutonomousLLMProvider({ workspaceRoot });
    } else {
      this.provider = null;
    }
  }

  /**
   * Returns whether a configured LLM provider is available for generation.
   */
  isAvailable(): boolean {
    return this.provider !== null && this.provider.isAvailable();
  }

  /**
   * Generate a one-sentence abstract for the given content (L0 tier, ~100 tokens).
   *
   * Falls back to the first {@link ABSTRACT_FALLBACK_CHARS} characters of content
   * (with ellipsis) when the LLM is unavailable or returns no result.
   *
   * @param content - Raw content to summarize
   * @returns One-sentence abstract string
   */
  async generateAbstract(content: string): Promise<string> {
    if (this.isAvailable() && this.provider !== null) {
      const prompt = ABSTRACT_PROMPT_HEADER + content;
      const result = await this.provider.summarize(prompt, ABSTRACT_MAX_TOKENS);
      if (result !== null) {
        return result.text.trim();
      }
    }
    return this.truncate(content, ABSTRACT_FALLBACK_CHARS);
  }

  /**
   * Generate a key-points overview for the given content (L1 tier, ~2000 chars).
   *
   * Falls back to the first {@link OVERVIEW_FALLBACK_CHARS} characters of content
   * (with ellipsis) when the LLM is unavailable or returns no result.
   *
   * @param content - Raw content to summarize
   * @returns Overview string with key points
   */
  async generateOverview(content: string): Promise<string> {
    if (this.isAvailable() && this.provider !== null) {
      const prompt = OVERVIEW_PROMPT_HEADER + content;
      const result = await this.provider.summarize(prompt, OVERVIEW_MAX_TOKENS);
      if (result !== null) {
        return result.text.trim();
      }
    }
    return this.truncate(content, OVERVIEW_FALLBACK_CHARS);
  }

  /**
   * Generate all three ContextLayer tiers (L0/L1/L2) for the given content.
   *
   * L0 (`abstract`) and L1 (`overview`) are produced concurrently.
   * L2 (`detail`) is a lazy async getter that returns the original full content
   * on demand, incurring no upfront cost.
   *
   * @param content - Raw content to layer
   * @returns Complete {@link ContextLayer} with abstract, overview, and detail
   */
  async generateLayers(content: string): Promise<ContextLayer> {
    const [abstract, overview] = await Promise.all([
      this.generateAbstract(content),
      this.generateOverview(content),
    ]);

    return {
      abstract,
      overview,
      detail: async (): Promise<string> => content,
    };
  }

  /**
   * Truncate `content` to at most `maxChars` characters.
   * Appends `'...'` when truncation occurs.
   */
  private truncate(content: string, maxChars: number): string {
    if (content.length <= maxChars) {
      return content;
    }
    return `${content.slice(0, maxChars)}...`;
  }
}
