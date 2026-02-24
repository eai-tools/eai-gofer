/**
 * Lightweight LLM Provider for Autonomous Context Management
 *
 * Wraps @anthropic-ai/sdk for summarization tasks (observation compression,
 * research summarization, context compaction). Uses Claude Haiku for cost-effective
 * operations. Degrades gracefully when no API key is configured.
 *
 * Rate limits to 10 calls/min and logs usage to context-usage JSONL.
 *
 * T038: Phase 5 - LLM Integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../services/Logger';

/**
 * Duck-typed interface for the Anthropic SDK client.
 * Allows injection for testing without importing the full SDK.
 */
export interface AnthropicClient {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    }): Promise<{
      content: Array<{ type: string; text?: string }>;
      usage: { input_tokens: number; output_tokens: number };
    }>;
  };
}

/**
 * Configuration for the autonomous LLM provider.
 */
export interface AutonomousLLMConfig {
  /** Anthropic API key. If empty/undefined, provider is disabled. */
  apiKey?: string;
  /** Model to use (default: claude-haiku-4-5-20251001) */
  model: string;
  /** Maximum calls per minute (default: 10) */
  rateLimitPerMinute: number;
  /** Workspace root for JSONL logging */
  workspaceRoot: string;
}

/**
 * Result of a summarize() call.
 */
export interface SummarizeResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
}

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Lightweight LLM provider for autonomous context management operations.
 *
 * Provides a simple `summarize(prompt, maxTokens)` interface with:
 * - Rate limiting (10 calls/min default)
 * - JSONL usage logging
 * - Graceful degradation when no API key
 */
export class AutonomousLLMProvider {
  private readonly config: AutonomousLLMConfig;
  private client: AnthropicClient | null = null;
  private callTimestamps: number[] = [];
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private totalCalls = 0;
  private logger?: Logger;

  constructor(config: Partial<AutonomousLLMConfig> & { workspaceRoot: string }, logger?: Logger) {
    this.config = {
      model: config.model ?? DEFAULT_MODEL,
      rateLimitPerMinute: config.rateLimitPerMinute ?? 10,
      apiKey: config.apiKey,
      workspaceRoot: config.workspaceRoot,
    };
    this.logger = logger;
  }

  /**
   * Check if the provider is available (has API key and SDK).
   */
  isAvailable(): boolean {
    return !!this.config.apiKey && this.config.apiKey.trim().length > 0;
  }

  /**
   * Check if rate limited (exceeded calls/min).
   */
  isRateLimited(): boolean {
    const now = Date.now();
    // Remove timestamps older than 1 minute
    this.callTimestamps = this.callTimestamps.filter((t) => now - t < 60_000);
    return this.callTimestamps.length >= this.config.rateLimitPerMinute;
  }

  /**
   * Summarize text using the LLM.
   *
   * @param prompt - The prompt to send (including text to summarize)
   * @param maxTokens - Maximum output tokens (default: 500)
   * @returns Summary text, or null if unavailable/rate-limited/error
   */
  async summarize(prompt: string, maxTokens = 500): Promise<SummarizeResult | null> {
    if (!this.isAvailable()) {
      return null;
    }

    if (this.isRateLimited()) {
      console.warn('[AutonomousLLMProvider] Rate limited, skipping call');
      return null;
    }

    try {
      const client = this.getOrCreateClient();
      if (!client) {
        return null;
      }

      this.callTimestamps.push(Date.now());
      this.totalCalls++;

      const response = await client.messages.create({
        model: this.config.model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content
        .filter((block) => block.type === 'text' && block.text)
        .map((block) => block.text!)
        .join('');

      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;

      this.totalInputTokens += inputTokens;
      this.totalOutputTokens += outputTokens;

      // Log usage to JSONL (fire-and-forget)
      this.logUsage(inputTokens, outputTokens).catch((err) =>
        this.logger?.error('AutonomousLLMProvider:LogUsage', err as Error, {
          operation: 'log-usage',
          inputTokens,
          outputTokens,
        })
      );

      return { text, inputTokens, outputTokens, cached: false };
    } catch (error) {
      console.error('[AutonomousLLMProvider] Summarize failed:', error);
      return null;
    }
  }

  /**
   * Get usage statistics.
   */
  getUsageStats(): { totalCalls: number; totalInputTokens: number; totalOutputTokens: number } {
    return {
      totalCalls: this.totalCalls,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
    };
  }

  /**
   * Inject a pre-created client (for testing).
   */
  setClient(client: AnthropicClient): void {
    this.client = client;
  }

  private getOrCreateClient(): AnthropicClient | null {
    if (this.client) {
      return this.client;
    }

    if (!this.config.apiKey) {
      return null;
    }

    try {
      // Dynamic import to avoid requiring the SDK at module load time
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: Anthropic } = require('@anthropic-ai/sdk');
      this.client = new Anthropic({ apiKey: this.config.apiKey }) as AnthropicClient;
      return this.client;
    } catch {
      console.warn('[AutonomousLLMProvider] @anthropic-ai/sdk not available');
      return null;
    }
  }

  private async logUsage(inputTokens: number, outputTokens: number): Promise<void> {
    const logDir = path.join(this.config.workspaceRoot, '.specify', 'logs');
    const logPath = path.join(logDir, 'context-usage.jsonl');

    const entry = {
      timestamp: new Date().toISOString(),
      eventType: 'llm_call',
      model: this.config.model,
      inputTokens,
      outputTokens,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalCalls: this.totalCalls,
    };

    try {
      fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
    } catch {
      // Logging is best-effort
    }
  }
}
