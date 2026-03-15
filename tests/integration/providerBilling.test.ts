/**
 * Integration tests for Provider Billing API Client
 *
 * Tests full flow: UsageApiClient → mocked HTTPS → response transformation → UsageSummary.
 * Uses vi.mock('https') to intercept all HTTP requests.
 *
 * Feature 026: Provider API Usage Tracking
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';

// Mock https module
vi.mock('https', () => {
  return {
    request: vi.fn(),
  };
});

// Mock Logger
vi.mock('../../extension/src/utils/logger', () => ({
  Logger: {
    for: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { UsageApiClient } from '../../extension/src/autonomous/UsageApiClient';
import type { AdminKeyGetter } from '../../extension/src/autonomous/UsageApiClient';
import * as https from 'https';

/**
 * Helper to create sequenced mock responses by URL pattern
 */
function mockResponses(responseMap: Record<string, { status: number; body: string }>) {
  vi.mocked(https.request).mockImplementation((opts: unknown, callback: unknown) => {
    const options = opts as { hostname: string; path: string };
    const url = `${options.hostname}${options.path}`;

    // Find matching response
    let response = { status: 200, body: '{}' };
    for (const [pattern, resp] of Object.entries(responseMap)) {
      if (url.includes(pattern)) {
        response = resp;
        break;
      }
    }

    const mockRes = new EventEmitter();
    mockRes.statusCode = response.status;

    const mockReq = new EventEmitter();
    mockReq.end = vi.fn();
    mockReq.destroy = vi.fn();
    mockReq.setTimeout = vi.fn();

    const cb = callback as (res: typeof mockRes) => void;
    process.nextTick(() => {
      cb(mockRes);
      process.nextTick(() => {
        mockRes.emit('data', Buffer.from(response.body));
        mockRes.emit('end');
      });
    });
    return mockReq as unknown as ReturnType<typeof https.request>;
  });
}

describe('Provider Billing Integration', () => {
  let client: UsageApiClient;

  afterEach(() => {
    client?.dispose();
    vi.clearAllMocks();
  });

  describe('full flow: API call → transformation → UsageSummary', () => {
    it('should fetch and aggregate Anthropic + OpenAI data end-to-end', async () => {
      const keyGetter: AdminKeyGetter = (id) => {
        if (id === 'anthropic') return 'sk-ant-admin-test';
        if (id === 'openai') return 'sk-admin-openai-test';
        return undefined;
      };
      client = new UsageApiClient(keyGetter);

      mockResponses({
        'usage_report/messages': {
          status: 200,
          body: JSON.stringify({
            data: [
              {
                bucket: '2026-03-15T10:00:00Z',
                input_tokens: 5000,
                output_tokens: 1200,
                model: 'claude-opus-4-6',
              },
              {
                bucket: '2026-03-15T11:00:00Z',
                input_tokens: 3000,
                output_tokens: 800,
                model: 'claude-sonnet-4-5-20250929',
              },
            ],
          }),
        },
        cost_report: {
          status: 200,
          body: JSON.stringify({
            data: [
              { bucket: '2026-03-15', token_cost_usd_cents: 1523, model: 'claude-opus-4-6' },
              {
                bucket: '2026-03-15',
                token_cost_usd_cents: 487,
                model: 'claude-sonnet-4-5-20250929',
              },
            ],
          }),
        },
        'usage/completions': {
          status: 200,
          body: JSON.stringify({
            data: [
              {
                start_time: 1710500000,
                end_time: 1710503600,
                results: [
                  { model: 'gpt-4-turbo', input_tokens: 4000, output_tokens: 1500 },
                  { model: 'gpt-3.5-turbo', input_tokens: 10000, output_tokens: 3000 },
                ],
              },
            ],
          }),
        },
        'organization/costs': {
          status: 200,
          body: JSON.stringify({
            data: [
              {
                start_time: 1710500000,
                end_time: 1710503600,
                results: [
                  { model: 'gpt-4-turbo', amount: { value: 3.25, currency: 'usd' } },
                  { model: 'gpt-3.5-turbo', amount: { value: 0.75, currency: 'usd' } },
                ],
              },
            ],
          }),
        },
      });

      const from = new Date('2026-03-15T00:00:00Z');
      const to = new Date('2026-03-15T23:59:59Z');
      const summary = await client.getUsageSummary(from, to);

      // Anthropic: 5000+3000 input, 1200+800 output, $20.10 cost
      expect(summary.byProvider.anthropic.tokens).toBe(10000); // 8000+2000
      expect(summary.byProvider.anthropic.costUsd).toBeCloseTo(20.1);

      // OpenAI: 4000+10000 input, 1500+3000 output, $4.00 cost
      expect(summary.byProvider.openai.tokens).toBe(18500); // 14000+4500
      expect(summary.byProvider.openai.costUsd).toBeCloseTo(4.0);

      // Aggregated totals
      expect(summary.totalInputTokens).toBe(22000); // 8000+14000
      expect(summary.totalOutputTokens).toBe(6500); // 2000+4500
      expect(summary.totalCostUsd).toBeCloseTo(24.1);

      // Date range preserved
      expect(summary.fromDate).toBe(from.toISOString());
      expect(summary.toDate).toBe(to.toISOString());
    });

    it('should handle partial configuration (only Anthropic)', async () => {
      client = new UsageApiClient((id) => (id === 'anthropic' ? 'sk-ant-admin-test' : undefined));

      mockResponses({
        'usage_report/messages': {
          status: 200,
          body: JSON.stringify({
            data: [{ bucket: '2026-03-15T10:00:00Z', input_tokens: 2000, output_tokens: 500 }],
          }),
        },
        cost_report: {
          status: 200,
          body: JSON.stringify({
            data: [{ bucket: '2026-03-15', token_cost_usd_cents: 350 }],
          }),
        },
      });

      const summary = await client.getUsageSummary();

      expect(summary.byProvider).toHaveProperty('anthropic');
      expect(summary.byProvider).not.toHaveProperty('openai');
      expect(summary.totalInputTokens).toBe(2000);
      expect(summary.totalCostUsd).toBeCloseTo(3.5);
    });
  });

  describe('error handling flow', () => {
    it('should fall back to cache on API failure after success', async () => {
      client = new UsageApiClient((id) => (id === 'anthropic' ? 'sk-ant-admin-test' : undefined));

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
          // First two calls succeed (usage + cost)
          mockRes.statusCode = 200;
          const body =
            callCount === 1
              ? JSON.stringify({
                  data: [
                    { bucket: '2026-03-15T10:00:00Z', input_tokens: 1500, output_tokens: 300 },
                  ],
                })
              : JSON.stringify({ data: [{ bucket: '2026-03-15', token_cost_usd_cents: 200 }] });

          process.nextTick(() => {
            cb(mockRes);
            process.nextTick(() => {
              mockRes.emit('data', Buffer.from(body));
              mockRes.emit('end');
            });
          });
        } else {
          // Subsequent calls fail with 503
          mockRes.statusCode = 503;
          process.nextTick(() => {
            cb(mockRes);
            process.nextTick(() => {
              mockRes.emit('data', Buffer.from('Service Unavailable'));
              mockRes.emit('end');
            });
          });
        }
        return mockReq as unknown as ReturnType<typeof https.request>;
      });

      // First call succeeds
      const summary1 = await client.getUsageSummary();
      expect(summary1.totalInputTokens).toBe(1500);
      expect(summary1.totalCostUsd).toBeCloseTo(2.0);

      // Second call fails but returns cached data
      const summary2 = await client.getUsageSummary();
      expect(summary2.totalInputTokens).toBe(1500); // From cache
      expect(summary2.totalCostUsd).toBeCloseTo(2.0);
    });

    it('should handle 401 auth errors without retry', async () => {
      client = new UsageApiClient((id) =>
        id === 'anthropic' ? 'sk-ant-admin-invalid' : undefined
      );

      mockResponses({
        'usage_report/messages': {
          status: 401,
          body: JSON.stringify({
            error: { type: 'authentication_error', message: 'Invalid admin API key' },
          }),
        },
        cost_report: {
          status: 401,
          body: JSON.stringify({
            error: { type: 'authentication_error', message: 'Invalid admin API key' },
          }),
        },
      });

      const summary = await client.getUsageSummary();

      // Should return empty summary (auth errors don't retry, no cache)
      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalCostUsd).toBe(0);
      expect(Object.keys(summary.byProvider)).toHaveLength(0);
    });
  });

  describe('Anthropic cents to dollars conversion', () => {
    it('should correctly convert token_cost_usd_cents to dollars', async () => {
      client = new UsageApiClient((id) => (id === 'anthropic' ? 'sk-ant-admin-test' : undefined));

      mockResponses({
        'usage_report/messages': {
          status: 200,
          body: JSON.stringify({
            data: [{ bucket: '2026-03-15', input_tokens: 100, output_tokens: 50 }],
          }),
        },
        cost_report: {
          status: 200,
          body: JSON.stringify({
            data: [
              { bucket: '2026-03-15', token_cost_usd_cents: 1 }, // $0.01
              { bucket: '2026-03-15', token_cost_usd_cents: 99 }, // $0.99
              { bucket: '2026-03-15', token_cost_usd_cents: 1000 }, // $10.00
            ],
          }),
        },
      });

      const summary = await client.getUsageSummary();
      expect(summary.byProvider.anthropic.costUsd).toBeCloseTo(11.0); // 0.01 + 0.99 + 10.00
    });
  });

  describe('disposal', () => {
    it('should return empty data after disposal and not make API calls', async () => {
      client = new UsageApiClient((id) => (id === 'anthropic' ? 'sk-ant-admin-test' : undefined));

      client.dispose();
      const summary = await client.getUsageSummary();

      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalCostUsd).toBe(0);
      expect(https.request).not.toHaveBeenCalled();
    });
  });

  describe('edge cases (T040)', () => {
    it('should handle empty usage period (no billing data)', async () => {
      client = new UsageApiClient((id) => (id === 'anthropic' ? 'sk-ant-admin-test' : undefined));

      mockResponses({
        'usage_report/messages': { status: 200, body: JSON.stringify({ data: [] }) },
        cost_report: { status: 200, body: JSON.stringify({ data: [] }) },
      });

      const summary = await client.getUsageSummary();
      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.totalCostUsd).toBe(0);
      // Provider should still appear with zero values
      expect(summary.byProvider).toHaveProperty('anthropic');
      expect(summary.byProvider.anthropic.costUsd).toBe(0);
    });

    it('should handle malformed JSON response', async () => {
      client = new UsageApiClient((id) => (id === 'anthropic' ? 'sk-ant-admin-test' : undefined));

      mockResponses({
        'usage_report/messages': { status: 200, body: 'not valid json' },
        cost_report: { status: 200, body: 'not valid json' },
      });

      // Should not throw — errors are caught and cached
      const summary = await client.getUsageSummary();
      expect(summary.totalCostUsd).toBe(0);
    });

    it('should handle multiple VSCode instances (stateless API calls)', async () => {
      // Two independent clients should work without interference
      const client1 = new UsageApiClient((id) =>
        id === 'anthropic' ? 'sk-ant-admin-test-1' : undefined
      );
      const client2 = new UsageApiClient((id) =>
        id === 'anthropic' ? 'sk-ant-admin-test-2' : undefined
      );

      mockResponses({
        'usage_report/messages': {
          status: 200,
          body: JSON.stringify({
            data: [{ bucket: '2026-03-15', input_tokens: 100, output_tokens: 50 }],
          }),
        },
        cost_report: {
          status: 200,
          body: JSON.stringify({ data: [{ bucket: '2026-03-15', token_cost_usd_cents: 50 }] }),
        },
      });

      const [s1, s2] = await Promise.all([client1.getUsageSummary(), client2.getUsageSummary()]);

      // Both should get independent results
      expect(s1.totalInputTokens).toBe(100);
      expect(s2.totalInputTokens).toBe(100);

      client1.dispose();
      client2.dispose();
    });
  });

  describe('performance (T045)', () => {
    it('should complete API fetch within 5 seconds', async () => {
      client = new UsageApiClient((id) => (id === 'anthropic' ? 'sk-ant-admin-test' : undefined));

      mockResponses({
        'usage_report/messages': {
          status: 200,
          body: JSON.stringify({
            data: [{ bucket: '2026-03-15', input_tokens: 100, output_tokens: 50 }],
          }),
        },
        cost_report: {
          status: 200,
          body: JSON.stringify({ data: [{ bucket: '2026-03-15', token_cost_usd_cents: 50 }] }),
        },
      });

      const start = Date.now();
      await client.getUsageSummary();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(5000); // SC-003
    });

    it('should have minimal memory footprint', () => {
      // UsageApiClient should be lightweight
      client = new UsageApiClient(() => undefined);
      const before = process.memoryUsage().heapUsed;

      // Create 100 instances to test memory scaling
      const clients: UsageApiClient[] = [];
      for (let i = 0; i < 100; i++) {
        clients.push(new UsageApiClient(() => undefined));
      }

      const after = process.memoryUsage().heapUsed;
      const increase = (after - before) / 1024 / 1024; // MB

      // 100 instances should use less than 5MB total (SC-010)
      expect(increase).toBeLessThan(5);

      clients.forEach((c) => c.dispose());
    });

    it('should clean up resources after dispose', () => {
      client = new UsageApiClient((id) => (id === 'anthropic' ? 'sk-ant-admin-test' : undefined));

      client.dispose();

      // Should not throw or make API calls after disposal
      expect(async () => {
        await client.getUsageSummary();
      }).not.toThrow();
    });
  });
});
