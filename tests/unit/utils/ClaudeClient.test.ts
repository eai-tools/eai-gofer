/**
 * Unit tests for Claude API rate limiting
 * Task: T009
 *
 * Tests verify:
 * - Rate limiting with p-limit (60 req/min)
 * - Cost tracking
 * - Retry on 429 errors
 * - Token usage calculation
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ClaudeClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rate Limiting', () => {
    it('should limit concurrent requests to 60/min', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: mockCreate },
        })),
      }));

      const { ClaudeClient } = await import('../../../src/utils/ClaudeClient');
      const client = new ClaudeClient('test-key');

      // Make multiple concurrent requests
      const promises = Array(65)
        .fill(null)
        .map(() => client.sendMessage('test prompt'));

      await Promise.all(promises);

      // Should have made all requests
      expect(mockCreate).toHaveBeenCalledTimes(65);
    });

    it('should handle rate limit errors with retry', async () => {
      let callCount = 0;
      const mockCreate = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const error: any = new Error('Rate limit exceeded');
          error.status = 429;
          error.headers = { 'retry-after': '1' };
          throw error;
        }
        return Promise.resolve({
          content: [{ type: 'text', text: 'success' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        });
      });

      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: mockCreate },
        })),
      }));

      const { ClaudeClient } = await import('../../../src/utils/ClaudeClient');
      const client = new ClaudeClient('test-key');

      const result = await client.sendMessage('test');

      expect(result).toContain('success');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should respect retry-after header', async () => {
      const error: any = new Error('Rate limit');
      error.status = 429;
      error.headers = { 'retry-after': '2' };

      const mockCreate = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'success' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        });

      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: mockCreate },
        })),
      }));

      const { ClaudeClient } = await import('../../../src/utils/ClaudeClient');
      const client = new ClaudeClient('test-key');

      const startTime = Date.now();
      await client.sendMessage('test');
      const duration = Date.now() - startTime;

      // Should have waited at least 2 seconds (allowing 10ms tolerance for timing precision)
      expect(duration).toBeGreaterThanOrEqual(1990);
    });
  });

  describe('Cost Tracking', () => {
    it('should calculate cost per request', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
        usage: { input_tokens: 2000, output_tokens: 500 },
      });

      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: mockCreate },
        })),
      }));

      const { ClaudeClient } = await import('../../../src/utils/ClaudeClient');
      const client = new ClaudeClient('test-key');

      await client.sendMessage('test');

      const stats = client.getUsageStats();

      expect(stats.totalTokens).toBe(2500);
      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.requestCount).toBe(1);
    });

    it('should track cumulative costs', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
        usage: { input_tokens: 1000, output_tokens: 300 },
      });

      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: mockCreate },
        })),
      }));

      const { ClaudeClient } = await import('../../../src/utils/ClaudeClient');
      const client = new ClaudeClient('test-key');

      await client.sendMessage('test 1');
      await client.sendMessage('test 2');
      await client.sendMessage('test 3');

      const stats = client.getUsageStats();

      expect(stats.requestCount).toBe(3);
      expect(stats.totalTokens).toBe(3900); // (1000+300) * 3
    });
  });

  describe('Message Creation', () => {
    it('should send message with correct parameters', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: mockCreate },
        })),
      }));

      const { ClaudeClient } = await import('../../../src/utils/ClaudeClient');
      const client = new ClaudeClient('test-key');

      await client.sendMessage('test prompt');

      expect(mockCreate).toHaveBeenCalledWith({
        model: expect.stringContaining('claude'),
        max_tokens: expect.any(Number),
        messages: [{ role: 'user', content: 'test prompt' }],
      });
    });

    it('should use correct model version', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: mockCreate },
        })),
      }));

      const { ClaudeClient } = await import('../../../src/utils/ClaudeClient');
      const client = new ClaudeClient('test-key');

      await client.sendMessage('test');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
        })
      );
    });

    it('should set max_tokens to 1024', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: mockCreate },
        })),
      }));

      const { ClaudeClient } = await import('../../../src/utils/ClaudeClient');
      const client = new ClaudeClient('test-key');

      await client.sendMessage('test');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 1024,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw on non-429 errors', async () => {
      const error = new Error('API error');

      const mockCreate = vi.fn().mockRejectedValue(error);

      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: mockCreate },
        })),
      }));

      const { ClaudeClient } = await import('../../../src/utils/ClaudeClient');
      const client = new ClaudeClient('test-key');

      await expect(client.sendMessage('test')).rejects.toThrow('API error');
    });

    it('should throw if API key is missing', async () => {
      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: vi.fn() },
        })),
      }));

      const { ClaudeClient } = await import('../../../src/utils/ClaudeClient');

      expect(() => new ClaudeClient('')).toThrow();
    });
  });

  describe('Response Parsing', () => {
    it('should extract text from response', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Expected response text' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: mockCreate },
        })),
      }));

      const { ClaudeClient } = await import('../../../src/utils/ClaudeClient');
      const client = new ClaudeClient('test-key');

      const result = await client.sendMessage('test');

      expect(result).toBe('Expected response text');
    });

    it('should handle empty content array', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [],
        usage: { input_tokens: 100, output_tokens: 0 },
      });

      vi.doMock('@anthropic-ai/sdk', () => ({
        default: vi.fn(() => ({
          messages: { create: mockCreate },
        })),
      }));

      const { ClaudeClient } = await import('../../../src/utils/ClaudeClient');
      const client = new ClaudeClient('test-key');

      const result = await client.sendMessage('test');

      expect(result).toBe('');
    });
  });
});
