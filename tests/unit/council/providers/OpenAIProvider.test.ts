/**
 * OpenAIProvider Unit Tests
 *
 * Tests for the OpenAI GPT provider implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OpenAIProvider,
  OpenAIClient,
} from '../../../../extension/src/council/providers/OpenAIProvider';
import { ProviderError } from '../../../../extension/src/council/providers/ProviderError';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockClient: OpenAIClient;
  let mockCreate: ReturnType<typeof vi.fn>;
  const mockApiKey = 'sk-test-key';
  const mockModel = 'gpt-5.2';

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn();
    mockClient = {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
    provider = new OpenAIProvider(mockApiKey, mockModel, mockClient);
  });

  describe('constructor', () => {
    it('should create provider with correct id', () => {
      expect(provider.id).toBe('openai');
    });

    it('should create provider with correct name', () => {
      expect(provider.name).toBe('OpenAI GPT');
    });

    it('should create provider with specified model', () => {
      expect(provider.model).toBe(mockModel);
    });

    it('should initialize with unknown status', () => {
      expect(provider.status).toBe('unknown');
    });
  });

  describe('query', () => {
    it('should return response with content and usage', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Hello from GPT!' } }],
        usage: {
          prompt_tokens: 14,
          completion_tokens: 22,
        },
        model: mockModel,
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.query({
        prompt: 'Hello',
        maxTokens: 1000,
        temperature: 0,
      });

      expect(response.content).toBe('Hello from GPT!');
      expect(response.usage.inputTokens).toBe(14);
      expect(response.usage.outputTokens).toBe(22);
      expect(response.model).toBe(mockModel);
      expect(response.providerId).toBe('openai');
    });

    it('should throw ProviderError on authentication failure', async () => {
      mockCreate.mockRejectedValueOnce({
        status: 401,
        message: 'Invalid API key',
      });

      await expect(
        provider.query({
          prompt: 'Hello',
          maxTokens: 1000,
          temperature: 0,
        })
      ).rejects.toThrow(ProviderError);
    });

    it('should throw ProviderError on rate limit', async () => {
      mockCreate.mockRejectedValueOnce({
        status: 429,
        message: 'Rate limit exceeded',
      });

      await expect(
        provider.query({
          prompt: 'Hello',
          maxTokens: 1000,
          temperature: 0,
        })
      ).rejects.toThrow(ProviderError);
    });

    it('should update rate limit after successful query', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
        model: mockModel,
      };

      mockCreate.mockResolvedValueOnce(mockResponse);
      const initialCount = provider.rateLimit.currentCount;

      await provider.query({
        prompt: 'Hello',
        maxTokens: 1000,
        temperature: 0,
      });

      expect(provider.rateLimit.currentCount).toBe(initialCount + 1);
    });
  });

  describe('healthCheck', () => {
    it('should return true and mark available on success', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'OK' } }],
        usage: { prompt_tokens: 5, completion_tokens: 2 },
        model: mockModel,
      };

      mockCreate.mockResolvedValueOnce(mockResponse);
      const result = await provider.healthCheck();

      expect(result).toBe(true);
      expect(provider.status).toBe('available');
      expect(provider.lastChecked).toBeDefined();
    });

    it('should return false and mark unavailable on failure', async () => {
      mockCreate.mockRejectedValueOnce({
        status: 401,
        message: 'Invalid API key',
      });

      const result = await provider.healthCheck();

      expect(result).toBe(false);
      expect(provider.status).toBe('unavailable');
      expect(provider.errorMessage).toBeDefined();
    });
  });

  describe('isAvailable', () => {
    it('should return true when status is available', () => {
      provider.status = 'available';
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return false when status is unavailable', () => {
      provider.status = 'unavailable';
      expect(provider.isAvailable()).toBe(false);
    });
  });
});
