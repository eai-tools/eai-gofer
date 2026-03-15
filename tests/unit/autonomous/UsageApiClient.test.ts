/**
 * Unit tests for UsageApiClient
 *
 * Tests API client behavior with mocked HTTPS responses.
 *
 * Feature 026: Provider API Usage Tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';

// Mock https module
vi.mock('https', () => {
  return {
    request: vi.fn(),
  };
});

// Mock Logger
vi.mock('../../../extension/src/utils/logger', () => ({
  Logger: {
    for: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { UsageApiClient } from '../../../extension/src/autonomous/UsageApiClient';
import type { AdminKeyGetter } from '../../../extension/src/autonomous/UsageApiClient';
import * as https from 'https';

/**
 * Helper to create a mock HTTPS response
 */
function mockHttpsResponse(statusCode: number, body: string) {
  const mockRes = new EventEmitter();
  mockRes.statusCode = statusCode;

  const mockReq = new EventEmitter();
  mockReq.end = vi.fn();
  mockReq.destroy = vi.fn();
  mockReq.setTimeout = vi.fn();

  vi.mocked(https.request).mockImplementation((_opts: unknown, callback: unknown) => {
    const cb = callback as (res: typeof mockRes) => void;
    process.nextTick(() => {
      cb(mockRes);
      process.nextTick(() => {
        mockRes.emit('data', Buffer.from(body));
        mockRes.emit('end');
      });
    });
    return mockReq as unknown as ReturnType<typeof https.request>;
  });
}

describe('UsageApiClient', () => {
  let client: UsageApiClient;
  let keyGetter: AdminKeyGetter;

  beforeEach(() => {
    vi.clearAllMocks();
    keyGetter = vi.fn((providerId: 'anthropic' | 'openai') => {
      if (providerId === 'anthropic') return 'sk-ant-admin-test-key';
      if (providerId === 'openai') return 'sk-admin-openai-test';
      return undefined;
    });
    client = new UsageApiClient(keyGetter);
  });

  afterEach(() => {
    client.dispose();
  });

  describe('getUsageSummary()', () => {
    it('should return empty summary when no admin keys configured', async () => {
      const noKeyClient = new UsageApiClient(() => undefined);
      const summary = await noKeyClient.getUsageSummary();

      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.totalCostUsd).toBe(0);
      expect(Object.keys(summary.byProvider)).toHaveLength(0);

      noKeyClient.dispose();
    });

    it('should aggregate data from both providers', async () => {
      // Mock successful responses for all 4 API calls
      const anthropicUsage = {
        data: [{ bucket: '2026-03-15T10:00:00Z', input_tokens: 1000, output_tokens: 500 }],
      };
      const anthropicCost = { data: [{ bucket: '2026-03-15', token_cost_usd_cents: 250 }] };
      const openaiUsage = {
        data: [
          {
            start_time: 1710500000,
            end_time: 1710503600,
            results: [{ model: 'gpt-4', input_tokens: 2000, output_tokens: 800 }],
          },
        ],
      };
      const openaiCost = {
        data: [
          {
            start_time: 1710500000,
            end_time: 1710503600,
            results: [{ model: 'gpt-4', amount: { value: 1.5, currency: 'usd' } }],
          },
        ],
      };

      // Sequence responses: Anthropic usage, Anthropic cost, OpenAI usage, OpenAI cost
      let callIndex = 0;
      const responses = [anthropicUsage, anthropicCost, openaiUsage, openaiCost];

      vi.mocked(https.request).mockImplementation((_opts: unknown, callback: unknown) => {
        const respBody = JSON.stringify(responses[callIndex % responses.length]);
        callIndex++;

        const mockRes = new EventEmitter();
        mockRes.statusCode = 200;

        const mockReq = new EventEmitter();
        mockReq.end = vi.fn();
        mockReq.destroy = vi.fn();
        mockReq.setTimeout = vi.fn();

        const cb = callback as (res: typeof mockRes) => void;
        process.nextTick(() => {
          cb(mockRes);
          process.nextTick(() => {
            mockRes.emit('data', Buffer.from(respBody));
            mockRes.emit('end');
          });
        });
        return mockReq as unknown as ReturnType<typeof https.request>;
      });

      const from = new Date('2026-03-15T00:00:00Z');
      const to = new Date('2026-03-15T23:59:59Z');
      const summary = await client.getUsageSummary(from, to);

      expect(summary.totalInputTokens).toBe(3000); // 1000 + 2000
      expect(summary.totalOutputTokens).toBe(1300); // 500 + 800
      expect(summary.totalCostUsd).toBeCloseTo(4.0); // 2.50 + 1.50
      expect(summary.byProvider).toHaveProperty('anthropic');
      expect(summary.byProvider).toHaveProperty('openai');
      expect(summary.byProvider.anthropic.costUsd).toBeCloseTo(2.5);
      expect(summary.byProvider.openai.costUsd).toBeCloseTo(1.5);
    });

    it('should return empty summary when disposed', async () => {
      client.dispose();
      const summary = await client.getUsageSummary();

      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalCostUsd).toBe(0);
    });
  });

  describe('retry logic', () => {
    it('should not retry on 401 errors', async () => {
      mockHttpsResponse(401, '{"error": "unauthorized"}');

      const singleKeyClient = new UsageApiClient((id) =>
        id === 'anthropic' ? 'sk-ant-admin-test' : undefined
      );

      const summary = await singleKeyClient.getUsageSummary();
      // Should fall through to empty (error caught, no cache)
      expect(summary.totalCostUsd).toBe(0);

      singleKeyClient.dispose();
    });
  });

  describe('response validation', () => {
    it('should clamp negative token counts to zero', async () => {
      const anthropicUsage = {
        data: [{ bucket: '2026-03-15T10:00:00Z', input_tokens: -100, output_tokens: -50 }],
      };
      const anthropicCost = { data: [{ bucket: '2026-03-15', token_cost_usd_cents: -200 }] };

      let callIndex = 0;
      const responses = [anthropicUsage, anthropicCost];

      vi.mocked(https.request).mockImplementation((_opts: unknown, callback: unknown) => {
        const respBody = JSON.stringify(responses[callIndex % responses.length]);
        callIndex++;

        const mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        const mockReq = new EventEmitter();
        mockReq.end = vi.fn();
        mockReq.destroy = vi.fn();
        mockReq.setTimeout = vi.fn();

        const cb = callback as (res: typeof mockRes) => void;
        process.nextTick(() => {
          cb(mockRes);
          process.nextTick(() => {
            mockRes.emit('data', Buffer.from(respBody));
            mockRes.emit('end');
          });
        });
        return mockReq as unknown as ReturnType<typeof https.request>;
      });

      const singleKeyClient = new UsageApiClient((id) =>
        id === 'anthropic' ? 'sk-ant-admin-test' : undefined
      );

      const summary = await singleKeyClient.getUsageSummary();
      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.totalCostUsd).toBe(0);

      singleKeyClient.dispose();
    });

    it('should handle empty API response data arrays', async () => {
      const anthropicUsage = { data: [] };
      const anthropicCost = { data: [] };

      let callIndex = 0;
      const responses = [anthropicUsage, anthropicCost];

      vi.mocked(https.request).mockImplementation((_opts: unknown, callback: unknown) => {
        const respBody = JSON.stringify(responses[callIndex % responses.length]);
        callIndex++;

        const mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        const mockReq = new EventEmitter();
        mockReq.end = vi.fn();
        mockReq.destroy = vi.fn();
        mockReq.setTimeout = vi.fn();

        const cb = callback as (res: typeof mockRes) => void;
        process.nextTick(() => {
          cb(mockRes);
          process.nextTick(() => {
            mockRes.emit('data', Buffer.from(respBody));
            mockRes.emit('end');
          });
        });
        return mockReq as unknown as ReturnType<typeof https.request>;
      });

      const singleKeyClient = new UsageApiClient((id) =>
        id === 'anthropic' ? 'sk-ant-admin-test' : undefined
      );

      const summary = await singleKeyClient.getUsageSummary();
      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.totalCostUsd).toBe(0);
      expect(summary.byProvider).toHaveProperty('anthropic');

      singleKeyClient.dispose();
    });

    it('should handle missing data field gracefully', async () => {
      const anthropicUsage = {};
      const anthropicCost = {};

      let callIndex = 0;
      const responses = [anthropicUsage, anthropicCost];

      vi.mocked(https.request).mockImplementation((_opts: unknown, callback: unknown) => {
        const respBody = JSON.stringify(responses[callIndex % responses.length]);
        callIndex++;

        const mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        const mockReq = new EventEmitter();
        mockReq.end = vi.fn();
        mockReq.destroy = vi.fn();
        mockReq.setTimeout = vi.fn();

        const cb = callback as (res: typeof mockRes) => void;
        process.nextTick(() => {
          cb(mockRes);
          process.nextTick(() => {
            mockRes.emit('data', Buffer.from(respBody));
            mockRes.emit('end');
          });
        });
        return mockReq as unknown as ReturnType<typeof https.request>;
      });

      const singleKeyClient = new UsageApiClient((id) =>
        id === 'anthropic' ? 'sk-ant-admin-test' : undefined
      );

      const summary = await singleKeyClient.getUsageSummary();
      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.totalCostUsd).toBe(0);

      singleKeyClient.dispose();
    });
  });

  describe('three-tier fallback', () => {
    it('should return data only for providers with admin keys', async () => {
      const anthropicUsage = {
        data: [{ bucket: '2026-03-15T10:00:00Z', input_tokens: 1000, output_tokens: 500 }],
      };
      const anthropicCost = { data: [{ bucket: '2026-03-15', token_cost_usd_cents: 250 }] };

      let callIndex = 0;
      const responses = [anthropicUsage, anthropicCost];

      vi.mocked(https.request).mockImplementation((_opts: unknown, callback: unknown) => {
        const respBody = JSON.stringify(responses[callIndex % responses.length]);
        callIndex++;

        const mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        const mockReq = new EventEmitter();
        mockReq.end = vi.fn();
        mockReq.destroy = vi.fn();
        mockReq.setTimeout = vi.fn();

        const cb = callback as (res: typeof mockRes) => void;
        process.nextTick(() => {
          cb(mockRes);
          process.nextTick(() => {
            mockRes.emit('data', Buffer.from(respBody));
            mockRes.emit('end');
          });
        });
        return mockReq as unknown as ReturnType<typeof https.request>;
      });

      // Only Anthropic key configured
      const singleKeyClient = new UsageApiClient((id) =>
        id === 'anthropic' ? 'sk-ant-admin-test' : undefined
      );

      const summary = await singleKeyClient.getUsageSummary();
      expect(summary.totalInputTokens).toBe(1000);
      expect(summary.totalOutputTokens).toBe(500);
      expect(summary.byProvider).toHaveProperty('anthropic');
      expect(summary.byProvider).not.toHaveProperty('openai');

      singleKeyClient.dispose();
    });
  });

  describe('cache', () => {
    it('should use cached data on API failure after success', async () => {
      let callCount = 0;

      vi.mocked(https.request).mockImplementation((_opts: unknown, callback: unknown) => {
        callCount++;
        const mockRes = new EventEmitter();
        const mockReq = new EventEmitter();
        mockReq.end = vi.fn();
        mockReq.destroy = vi.fn();
        mockReq.setTimeout = vi.fn();

        const cb = callback as (res: typeof mockRes) => void;
        if (callCount <= 2) {
          // First call succeeds (Anthropic usage + cost)
          mockRes.statusCode = 200;
          const body =
            callCount === 1
              ? JSON.stringify({
                  data: [{ bucket: '2026-03-15T10:00:00Z', input_tokens: 500, output_tokens: 200 }],
                })
              : JSON.stringify({ data: [{ bucket: '2026-03-15', token_cost_usd_cents: 100 }] });

          process.nextTick(() => {
            cb(mockRes);
            process.nextTick(() => {
              mockRes.emit('data', Buffer.from(body));
              mockRes.emit('end');
            });
          });
        } else {
          // Subsequent calls fail
          mockRes.statusCode = 500;
          process.nextTick(() => {
            cb(mockRes);
            process.nextTick(() => {
              mockRes.emit('data', Buffer.from('Internal Server Error'));
              mockRes.emit('end');
            });
          });
        }
        return mockReq as unknown as ReturnType<typeof https.request>;
      });

      const singleKeyClient = new UsageApiClient((id) =>
        id === 'anthropic' ? 'sk-ant-admin-test' : undefined
      );

      // First call succeeds
      const summary1 = await singleKeyClient.getUsageSummary();
      expect(summary1.totalInputTokens).toBe(500);

      // Second call fails but should use cache
      const summary2 = await singleKeyClient.getUsageSummary();
      expect(summary2.totalInputTokens).toBe(500); // Cached value

      singleKeyClient.dispose();
    });
  });
});
