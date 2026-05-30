/**
 * Google Provider Implementation
 *
 * LLM Provider for Google's Gemini models using the official SDK.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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
 * Interface for Google generative model response
 */
interface GoogleGenerateResponse {
  response: {
    text: () => string;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
    };
  };
}

/**
 * Interface for Google generative model (for dependency injection in tests)
 */
export interface GoogleGenerativeModel {
  generateContent: (params: {
    contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    generationConfig?: {
      maxOutputTokens?: number;
      temperature?: number;
    };
  }) => Promise<GoogleGenerateResponse>;
}

/**
 * Google Gemini provider implementation
 */
export class GoogleProvider extends BaseLLMProvider {
  readonly id: ProviderId = 'google';
  readonly name = 'Google Gemini';
  readonly model: string;

  private generativeModel: GoogleGenerativeModel;

  constructor(apiKey: string, model: string, generativeModel?: GoogleGenerativeModel) {
    super();
    this.model = model;
    if (generativeModel) {
      this.generativeModel = generativeModel;
    } else {
      const client = new GoogleGenerativeAI(apiKey);
      this.generativeModel = client.getGenerativeModel({
        model,
      }) as unknown as GoogleGenerativeModel;
    }
  }

  /**
   * Query Gemini with a prompt
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    try {
      // Combine system prompt with user prompt if provided
      const prompt = request.systemPrompt
        ? `${request.systemPrompt}\n\n${request.prompt}`
        : request.prompt;

      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: request.maxTokens,
          temperature: request.temperature,
        },
      });

      // Update rate limit tracking
      this.updateRateLimit();

      const response = result.response;
      const content = response.text();
      const usage = response.usageMetadata;
      const usageWithCache = usage as
        | (typeof usage & {
            cachedContentTokenCount?: number;
          })
        | undefined;
      const cacheReadTokens = usageWithCache?.cachedContentTokenCount ?? 0;
      const uncachedInputTokens = Math.max(0, (usage?.promptTokenCount ?? 0) - cacheReadTokens);

      return {
        content,
        usage: {
          inputTokens: uncachedInputTokens,
          outputTokens: usage?.candidatesTokenCount ?? 0,
          cacheReadTokens,
        },
        model: this.model,
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
      await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        generationConfig: { maxOutputTokens: 10 },
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

    // Handle Google SDK errors
    const sdkError = error as { status?: number; message?: string };

    if (sdkError.status === 401 || sdkError.message?.includes('API key')) {
      return authenticationError(this.id, sdkError.message);
    }

    if (sdkError.status === 429 || sdkError.message?.includes('Resource exhausted')) {
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
registerProvider('google', GoogleProvider);
