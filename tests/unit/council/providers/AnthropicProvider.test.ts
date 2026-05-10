/**
 * AnthropicProvider Unit Tests
 *
 * Tests for the Anthropic Claude provider implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AnthropicProvider,
  AnthropicClient,
} from '../../../../extension/src/council/providers/AnthropicProvider';
import { ProviderError } from '../../../../extension/src/council/providers/ProviderError';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockClient: AnthropicClient;
  let mockCreate: ReturnType<typeof vi.fn>;
  const mockApiKey = 'sk-ant-test-key';
  const mockModel = 'claude-opus-4-5-20251101';

  beforeEach(() => {
    mockCreate = vi.fn();
    mockClient = {
      messages: {
        create: mockCreate,
      },
    };
    provider = new AnthropicProvider(mockApiKey, mockModel, mockClient);
  });

  describe('constructor', () => {
    it('should create provider with correct id', () => {
      expect(provider.id).toBe('anthropic');
    });

    it('should create provider with correct name', () => {
      expect(provider.name).toBe('Anthropic Claude');
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
        content: [{ type: 'text', text: 'Hello, I am Claude.' }],
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
        model: mockModel,
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.query({
        prompt: 'Hello',
        maxTokens: 1000,
        temperature: 0,
      });

      expect(response.content).toBe('Hello, I am Claude.');
      expect(response.usage.inputTokens).toBe(10);
      expect(response.usage.outputTokens).toBe(20);
      expect(response.model).toBe(mockModel);
      expect(response.providerId).toBe('anthropic');
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
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 20 },
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
        content: [{ type: 'text', text: 'OK' }],
        usage: { input_tokens: 5, output_tokens: 2 },
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

    it('should return false when status is unknown', () => {
      provider.status = 'unknown';
      expect(provider.isAvailable()).toBe(false);
    });

    it('should return false when status is rate_limited', () => {
      provider.status = 'rate_limited';
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('isRateLimited', () => {
    it('should return true when status is rate_limited', () => {
      provider.status = 'rate_limited';
      expect(provider.isRateLimited()).toBe(true);
    });

    it('should return true when request count exceeds limit', () => {
      provider.rateLimit.currentCount = 100;
      provider.rateLimit.requestsPerMinute = 60;
      provider.rateLimit.windowResetAt = new Date(Date.now() + 30000).toISOString();
      expect(provider.isRateLimited()).toBe(true);
    });

    it('should return false when request count is within limit', () => {
      provider.rateLimit.currentCount = 10;
      provider.rateLimit.requestsPerMinute = 60;
      expect(provider.isRateLimited()).toBe(false);
    });

    it('should reset count when window has expired', () => {
      provider.rateLimit.currentCount = 100;
      provider.rateLimit.requestsPerMinute = 60;
      provider.rateLimit.windowResetAt = new Date(Date.now() - 1000).toISOString(); // Past
      expect(provider.isRateLimited()).toBe(false);
      expect(provider.rateLimit.currentCount).toBe(0);
    });
  });
});
