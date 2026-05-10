/**
 * Anthropic Provider Implementation
 *
 * LLM Provider for Anthropic's Claude models using the official SDK.
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './LLMProvider';
import {
  ProviderError,
  authenticationError,
  rateLimitError,
  apiError,
  wrapError,
} from './ProviderError';
import { registerProvider } from './ProviderFactory';
import { ProviderId, QueryRequest, QueryResponse } from '../types';

/**
 * Interface for Anthropic client messages API
 */
interface AnthropicMessagesClient {
  create: (params: Anthropic.MessageCreateParams) => Promise<Anthropic.Message>;
}

/**
 * Interface for Anthropic client (for dependency injection in tests)
 */
export interface AnthropicClient {
  messages: AnthropicMessagesClient;
}

/**
 * Anthropic Claude provider implementation
 */
export class AnthropicProvider extends BaseLLMProvider {
  readonly id: ProviderId = 'anthropic';
  readonly name = 'Anthropic Claude';
  readonly model: string;

  private client: AnthropicClient;

  constructor(apiKey: string, model: string, client?: AnthropicClient) {
    super();
    this.model = model;
    // Cast SDK client to our interface - the SDK satisfies the interface but TypeScript
    // can't verify this due to overloaded method signatures
    this.client = client ?? (new Anthropic({ apiKey }) as unknown as AnthropicClient);
  }

  /**
   * Query Claude with a prompt
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    try {
      const messages: Anthropic.MessageParam[] = [{ role: 'user', content: request.prompt }];

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        system: request.systemPrompt,
        messages,
      });

      // Update rate limit tracking
      this.updateRateLimit();

      // Extract text content from response
      const textContent = response.content.find((block) => block.type === 'text');
      const content = textContent && 'text' in textContent ? textContent.text : '';

      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        model: response.model,
        providerId: this.id,
      };
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate API key with a minimal request
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });

      this.markAvailable();
      return true;
    } catch (error: unknown) {
      const providerError = this.handleError(error);
      this.markUnavailable(providerError.message);
      return false;
    }
  }

  /**
   * Convert SDK errors to ProviderError
   */
  private handleError(error: unknown): ProviderError {
    if (error instanceof ProviderError) {
      return error;
    }

    // Handle Anthropic SDK errors
    const sdkError = error as { status?: number; message?: string };

    if (sdkError.status === 401) {
      return authenticationError(this.id, sdkError.message);
    }

    if (sdkError.status === 429) {
      this.markRateLimited();
      return rateLimitError(this.id, sdkError.message);
    }

    if (sdkError.status && sdkError.status >= 400) {
      return apiError(this.id, sdkError.message ?? 'API error', sdkError.status);
    }

    return wrapError(this.id, error);
  }
}

// Register the provider
registerProvider('anthropic', AnthropicProvider);
