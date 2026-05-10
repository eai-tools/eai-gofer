/**
 * GoogleProvider Unit Tests
 *
 * Tests for the Google Gemini provider implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GoogleProvider,
  GoogleGenerativeModel,
} from '../../../../extension/src/council/providers/GoogleProvider';
import { ProviderError } from '../../../../extension/src/council/providers/ProviderError';

describe('GoogleProvider', () => {
  let provider: GoogleProvider;
  let mockGenerativeModel: GoogleGenerativeModel;
  let mockGenerateContent: ReturnType<typeof vi.fn>;
  const mockApiKey = 'AIzaTest-key';
  const mockModel = 'gemini-3-flash-preview';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent = vi.fn();
    mockGenerativeModel = {
      generateContent: mockGenerateContent,
    };
    provider = new GoogleProvider(mockApiKey, mockModel, mockGenerativeModel);
  });

  describe('constructor', () => {
    it('should create provider with correct id', () => {
      expect(provider.id).toBe('google');
    });

    it('should create provider with correct name', () => {
      expect(provider.name).toBe('Google Gemini');
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
        response: {
          text: () => 'Hello from Gemini!',
          usageMetadata: {
            promptTokenCount: 15,
            candidatesTokenCount: 25,
          },
        },
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      const response = await provider.query({
        prompt: 'Hello',
        maxTokens: 1000,
        temperature: 0,
      });

      expect(response.content).toBe('Hello from Gemini!');
      expect(response.usage.inputTokens).toBe(15);
      expect(response.usage.outputTokens).toBe(25);
      expect(response.model).toBe(mockModel);
      expect(response.providerId).toBe('google');
    });

    it('should throw ProviderError on authentication failure', async () => {
      mockGenerateContent.mockRejectedValueOnce({
        status: 401,
        message: 'API key not valid',
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
      mockGenerateContent.mockRejectedValueOnce({
        status: 429,
        message: 'Resource exhausted',
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
        response: {
          text: () => 'Response',
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
          },
        },
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);
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
        response: {
          text: () => 'OK',
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 2,
          },
        },
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);
      const result = await provider.healthCheck();

      expect(result).toBe(true);
      expect(provider.status).toBe('available');
      expect(provider.lastChecked).toBeDefined();
    });

    it('should return false and mark unavailable on failure', async () => {
      mockGenerateContent.mockRejectedValueOnce({
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
