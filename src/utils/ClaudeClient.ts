/**
 * Claude API Client with Rate Limiting and Cost Tracking
 * Task: T010
 *
 * Features:
 * - Rate limiting with p-limit (60 req/min)
 * - Cost tracking per request
 * - Retry on 429 errors
 * - Token usage calculation
 *
 * @see .specify/specs/003-orchestrator-agents/contracts/claude-api.md
 * @see .specify/specs/003-orchestrator-agents/research.md (R8)
 */

import Anthropic from '@anthropic-ai/sdk';
import pLimit from 'p-limit';
import { logger } from './Logger.js';

/**
 * Usage statistics for Claude API
 */
export interface ClaudeUsageStats {
  requestCount: number;
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Claude API Client with rate limiting and cost tracking
 */
export class ClaudeClient {
  private client: Anthropic;
  private limiter = pLimit(60); // 60 concurrent requests max
  private stats: ClaudeUsageStats = {
    requestCount: 0,
    totalTokens: 0,
    totalCost: 0,
    inputTokens: 0,
    outputTokens: 0,
  };

  // Cost per million tokens (approximate for Claude Sonnet)
  private readonly COST_PER_MILLION_TOKENS = 15.0;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Claude API key is required');
    }

    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Send a message to Claude API with rate limiting
   *
   * @param prompt - The message to send
   * @param maxTokens - Maximum tokens in response (default: 1024)
   * @returns The response text
   */
  async sendMessage(prompt: string, maxTokens: number = 1024): Promise<string> {
    return this.limiter(async () => {
      const startTime = Date.now();

      try {
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        });

        // Track usage
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        const totalTokens = inputTokens + outputTokens;
        const cost = (totalTokens / 1_000_000) * this.COST_PER_MILLION_TOKENS;

        this.stats.requestCount++;
        this.stats.inputTokens += inputTokens;
        this.stats.outputTokens += outputTokens;
        this.stats.totalTokens += totalTokens;
        this.stats.totalCost += cost;

        logger.info({
          event: 'claude_api_call',
          context: {
            duration: Date.now() - startTime,
            tokens: totalTokens,
            inputTokens,
            outputTokens,
            cost: cost.toFixed(4),
          },
        });

        // Extract text from response
        if (response.content.length === 0) {
          return '';
        }

        const firstBlock = response.content[0];
        if (firstBlock.type === 'text') {
          return firstBlock.text;
        }

        return '';
      } catch (error: any) {
        // Handle rate limiting
        if (error.status === 429) {
          const retryAfter = parseInt(error.headers?.['retry-after'] || '5');

          logger.warn({
            event: 'claude_rate_limit',
            context: {
              retryAfter,
              message: 'Rate limit exceeded, retrying after delay',
            },
          });

          // Wait for retry-after duration
          await this.sleep(retryAfter * 1000);

          // Retry the request
          return this.sendMessage(prompt, maxTokens);
        }

        // Re-throw other errors
        throw error;
      }
    });
  }

  /**
   * Get cumulative usage statistics
   *
   * @returns Usage stats object
   */
  getUsageStats(): ClaudeUsageStats {
    return { ...this.stats };
  }

  /**
   * Reset usage statistics
   */
  resetStats(): void {
    this.stats = {
      requestCount: 0,
      totalTokens: 0,
      totalCost: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  /**
   * Sleep for a specified duration
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
