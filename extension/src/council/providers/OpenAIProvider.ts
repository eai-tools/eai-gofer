/**
 * OpenAI Provider Implementation
 *
 * LLM Provider for OpenAI's GPT models using the official SDK.
 */

import OpenAI from 'openai';
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
 * Interface for OpenAI chat completions client (for dependency injection in tests)
 */
interface OpenAICompletionsClient {
  create: (params: OpenAI.ChatCompletionCreateParamsNonStreaming) => Promise<OpenAI.ChatCompletion>;
}

/**
 * Interface for OpenAI client (for dependency injection in tests)
 */
export interface OpenAIClient {
  chat: {
    completions: OpenAICompletionsClient;
  };
}

/**
 * OpenAI GPT provider implementation
 */
export class OpenAIProvider extends BaseLLMProvider {
  readonly id: ProviderId = 'openai';
  readonly name = 'OpenAI GPT';
  readonly model: string;

  private client: OpenAIClient;

  constructor(apiKey: string, model: string, client?: OpenAIClient) {
    super();
    this.model = model;
    // Cast SDK client to our interface - the SDK satisfies the interface but TypeScript
    // can't verify this due to overloaded method signatures
    this.client = client ?? (new OpenAI({ apiKey }) as unknown as OpenAIClient);
  }

  /**
   * Query GPT with a prompt
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    try {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];

      // Add system message if provided
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }

      messages.push({ role: 'user', content: request.prompt });

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        messages,
      });

      // Update rate limit tracking
      this.updateRateLimit();

      const content = response.choices[0]?.message?.content ?? '';
      const usage = response.usage;

      return {
        content,
        usage: {
          inputTokens: usage?.prompt_tokens ?? 0,
          outputTokens: usage?.completion_tokens ?? 0,
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
      await this.client.chat.completions.create({
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

    // Handle OpenAI SDK errors
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
registerProvider('openai', OpenAIProvider);
