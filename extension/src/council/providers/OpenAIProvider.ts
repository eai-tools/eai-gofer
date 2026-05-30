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

      // GPT-5-family models use max_completion_tokens instead of max_tokens.
      const isGpt5 = this.model.startsWith('gpt-5');
      const tokenParam = isGpt5
        ? { max_completion_tokens: request.maxTokens }
        : { max_tokens: request.maxTokens };

      const response = await this.client.chat.completions.create({
        model: this.model,
        temperature: request.temperature,
        messages,
        ...tokenParam,
      } as OpenAI.ChatCompletionCreateParamsNonStreaming);

      // Update rate limit tracking
      this.updateRateLimit();

      const content = response.choices[0]?.message?.content ?? '';
      const usage = response.usage;
      const usageDetails = usage?.prompt_tokens_details as
        | { cached_tokens?: number }
        | undefined;
      const cachedInputTokens = usageDetails?.cached_tokens ?? 0;
      const uncachedInputTokens = Math.max(0, (usage?.prompt_tokens ?? 0) - cachedInputTokens);

      return {
        content,
        usage: {
          inputTokens: uncachedInputTokens,
          outputTokens: usage?.completion_tokens ?? 0,
          cachedInputTokens,
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
      // GPT-5-family models use max_completion_tokens instead of max_tokens.
      const isGpt5 = this.model.startsWith('gpt-5');
      const tokenParam = isGpt5 ? { max_completion_tokens: 10 } : { max_tokens: 10 };

      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        ...tokenParam,
      } as OpenAI.ChatCompletionCreateParamsNonStreaming);

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
