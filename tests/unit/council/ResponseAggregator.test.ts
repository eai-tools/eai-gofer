/**
 * ResponseAggregator Unit Tests
 *
 * Tests for the ResponseAggregator which collects responses from multiple
 * LLM providers in parallel, handles timeouts, and validates quorum.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ResponseAggregator,
  AggregatedResponses,
  ProviderResult,
} from '../../../extension/src/council/ResponseAggregator';
import { LLMProvider } from '../../../extension/src/council/providers/LLMProvider';
import { QueryRequest, QueryResponse } from '../../../extension/src/council/types';

// Mock provider factory for testing
function createMockProvider(id: string, response: QueryResponse | Error, delay = 0): LLMProvider {
  const mockQuery = vi.fn().mockImplementation(async () => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    if (response instanceof Error) {
      throw response;
    }
    return response;
  });

  return {
    id: id as never,
    name: `Mock ${id}`,
    model: 'mock-model',
    status: 'available',
    rateLimit: { requestsPerMinute: 60, currentCount: 0 },
    query: mockQuery,
    healthCheck: vi.fn().mockResolvedValue(true),
    isAvailable: vi.fn().mockReturnValue(true),
    isRateLimited: vi.fn().mockReturnValue(false),
    updateRateLimit: vi.fn(),
  } as unknown as LLMProvider;
}

describe('ResponseAggregator', () => {
  let aggregator: ResponseAggregator;
  const defaultTimeout = 30000;
  const defaultMinQuorum = 2;

  beforeEach(() => {
    vi.clearAllMocks();
    aggregator = new ResponseAggregator({
      timeout: defaultTimeout,
      minQuorum: defaultMinQuorum,
    });
  });

  describe('constructor', () => {
    it('should create aggregator with provided configuration', () => {
      const config = { timeout: 45000, minQuorum: 3 };
      const agg = new ResponseAggregator(config);

      expect(agg.timeout).toBe(45000);
      expect(agg.minQuorum).toBe(3);
    });

    it('should use default values when not specified', () => {
      const agg = new ResponseAggregator({});

      expect(agg.timeout).toBe(30000);
      expect(agg.minQuorum).toBe(2);
    });
  });

  describe('collectResponses', () => {
    const mockRequest: QueryRequest = {
      prompt: 'Test prompt',
      maxTokens: 1000,
      temperature: 0,
    };

    it('should collect responses from all providers in parallel', async () => {
      const providers = [
        createMockProvider('anthropic', {
          content: 'Response from Anthropic',
          usage: { inputTokens: 10, outputTokens: 20 },
          model: 'claude-opus-4-5',
          providerId: 'anthropic',
        }),
        createMockProvider('google', {
          content: 'Response from Google',
          usage: { inputTokens: 15, outputTokens: 25 },
          model: 'gemini-3-flash-preview',
          providerId: 'google',
        }),
        createMockProvider('openai', {
          content: 'Response from OpenAI',
          usage: { inputTokens: 12, outputTokens: 22 },
          model: 'gpt-5.2',
          providerId: 'openai',
        }),
      ];

      const result = await aggregator.collectResponses(providers, mockRequest);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.quorumMet).toBe(true);
    });

    it('should handle partial failures gracefully', async () => {
      const providers = [
        createMockProvider('anthropic', {
          content: 'Response from Anthropic',
          usage: { inputTokens: 10, outputTokens: 20 },
          model: 'claude-opus-4-5',
          providerId: 'anthropic',
        }),
        createMockProvider('google', new Error('API rate limit exceeded')),
        createMockProvider('openai', {
          content: 'Response from OpenAI',
          usage: { inputTokens: 12, outputTokens: 22 },
          model: 'gpt-5.2',
          providerId: 'openai',
        }),
      ];

      const result = await aggregator.collectResponses(providers, mockRequest);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].providerId).toBe('google');
      expect(result.failed[0].error).toBe('API rate limit exceeded');
      expect(result.quorumMet).toBe(true);
    });

    it('should set quorumMet to false when insufficient responses', async () => {
      const agg = new ResponseAggregator({ timeout: 30000, minQuorum: 3 });
      const providers = [
        createMockProvider('anthropic', {
          content: 'Response from Anthropic',
          usage: { inputTokens: 10, outputTokens: 20 },
          model: 'claude-opus-4-5',
          providerId: 'anthropic',
        }),
        createMockProvider('google', new Error('API error')),
        createMockProvider('openai', new Error('Timeout')),
      ];

      const result = await agg.collectResponses(providers, mockRequest);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(2);
      expect(result.quorumMet).toBe(false);
    });

    it('should timeout slow providers', async () => {
      const agg = new ResponseAggregator({ timeout: 100, minQuorum: 2 });
      const providers = [
        createMockProvider('anthropic', {
          content: 'Fast response',
          usage: { inputTokens: 10, outputTokens: 20 },
          model: 'claude-opus-4-5',
          providerId: 'anthropic',
        }),
        createMockProvider(
          'google',
          {
            content: 'Slow response',
            usage: { inputTokens: 15, outputTokens: 25 },
            model: 'gemini-3-flash-preview',
            providerId: 'google',
          },
          200 // 200ms delay - will timeout
        ),
        createMockProvider('openai', {
          content: 'Another fast response',
          usage: { inputTokens: 12, outputTokens: 22 },
          model: 'gpt-5.2',
          providerId: 'openai',
        }),
      ];

      const result = await agg.collectResponses(providers, mockRequest);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].providerId).toBe('google');
      expect(result.failed[0].error).toContain('timeout');
      expect(result.quorumMet).toBe(true);
    });

    it('should track total duration', async () => {
      const providers = [
        createMockProvider('anthropic', {
          content: 'Response',
          usage: { inputTokens: 10, outputTokens: 20 },
          model: 'claude-opus-4-5',
          providerId: 'anthropic',
        }),
      ];

      const startTime = Date.now();
      const result = await aggregator.collectResponses(providers, mockRequest);
      const endTime = Date.now();

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeLessThanOrEqual(endTime - startTime + 100);
    });

    it('should include request in each provider call', async () => {
      const mockProvider = createMockProvider('anthropic', {
        content: 'Response',
        usage: { inputTokens: 10, outputTokens: 20 },
        model: 'claude-opus-4-5',
        providerId: 'anthropic',
      });

      await aggregator.collectResponses([mockProvider], mockRequest);

      expect(mockProvider.query).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('anonymize', () => {
    it('should convert responses to Member A, B, C format', () => {
      const responses: ProviderResult[] = [
        {
          providerId: 'anthropic' as never,
          response: {
            content: 'Anthropic response',
            usage: { inputTokens: 10, outputTokens: 20 },
            model: 'claude-opus-4-5',
            providerId: 'anthropic',
          },
        },
        {
          providerId: 'google' as never,
          response: {
            content: 'Google response',
            usage: { inputTokens: 15, outputTokens: 25 },
            model: 'gemini-3-flash-preview',
            providerId: 'google',
          },
        },
        {
          providerId: 'openai' as never,
          response: {
            content: 'OpenAI response',
            usage: { inputTokens: 12, outputTokens: 22 },
            model: 'gpt-5.2',
            providerId: 'openai',
          },
        },
      ];

      const anonymized = aggregator.anonymize(responses);

      expect(anonymized).toHaveLength(3);
      expect(anonymized[0].anonymousId).toBe('Member A');
      expect(anonymized[1].anonymousId).toBe('Member B');
      expect(anonymized[2].anonymousId).toBe('Member C');
    });

    it('should preserve response content in anonymized form', () => {
      const responses: ProviderResult[] = [
        {
          providerId: 'anthropic' as never,
          response: {
            content: 'Detailed Anthropic analysis here',
            usage: { inputTokens: 50, outputTokens: 100 },
            model: 'claude-opus-4-5',
            providerId: 'anthropic',
          },
        },
      ];

      const anonymized = aggregator.anonymize(responses);

      expect(anonymized[0].content).toBe('Detailed Anthropic analysis here');
      expect(anonymized[0].tokenCount).toBe(100);
    });

    it('should handle fourth provider as Member D', () => {
      const responses: ProviderResult[] = [
        {
          providerId: 'anthropic' as never,
          response: {
            content: 'A',
            usage: { inputTokens: 10, outputTokens: 20 },
            model: 'model',
            providerId: 'anthropic',
          },
        },
        {
          providerId: 'google' as never,
          response: {
            content: 'B',
            usage: { inputTokens: 10, outputTokens: 20 },
            model: 'model',
            providerId: 'google',
          },
        },
        {
          providerId: 'openai' as never,
          response: {
            content: 'C',
            usage: { inputTokens: 10, outputTokens: 20 },
            model: 'model',
            providerId: 'openai',
          },
        },
        {
          providerId: 'anthropic' as never,
          response: {
            content: 'D',
            usage: { inputTokens: 10, outputTokens: 20 },
            model: 'model',
            providerId: 'anthropic',
          },
        },
      ];

      const anonymized = aggregator.anonymize(responses);

      expect(anonymized).toHaveLength(4);
      expect(anonymized[3].anonymousId).toBe('Member D');
    });

    it('should return empty array for empty input', () => {
      const anonymized = aggregator.anonymize([]);

      expect(anonymized).toHaveLength(0);
    });
  });

  describe('validateQuorum', () => {
    it('should return true when responses meet minimum quorum', () => {
      const result: AggregatedResponses = {
        successful: [
          { providerId: 'anthropic' as never, response: {} as QueryResponse },
          { providerId: 'google' as never, response: {} as QueryResponse },
        ],
        failed: [],
        quorumMet: true,
        durationMs: 100,
      };

      expect(aggregator.validateQuorum(result)).toBe(true);
    });

    it('should return false when responses below minimum quorum', () => {
      const result: AggregatedResponses = {
        successful: [{ providerId: 'anthropic' as never, response: {} as QueryResponse }],
        failed: [{ providerId: 'google' as never, error: 'timeout' }],
        quorumMet: false,
        durationMs: 100,
      };

      expect(aggregator.validateQuorum(result)).toBe(false);
    });

    it('should respect custom minQuorum setting', () => {
      const agg = new ResponseAggregator({ timeout: 30000, minQuorum: 3 });

      const twoResponses: AggregatedResponses = {
        successful: [
          { providerId: 'anthropic' as never, response: {} as QueryResponse },
          { providerId: 'google' as never, response: {} as QueryResponse },
        ],
        failed: [],
        quorumMet: false,
        durationMs: 100,
      };

      const threeResponses: AggregatedResponses = {
        successful: [
          { providerId: 'anthropic' as never, response: {} as QueryResponse },
          { providerId: 'google' as never, response: {} as QueryResponse },
          { providerId: 'openai' as never, response: {} as QueryResponse },
        ],
        failed: [],
        quorumMet: true,
        durationMs: 100,
      };

      expect(agg.validateQuorum(twoResponses)).toBe(false);
      expect(agg.validateQuorum(threeResponses)).toBe(true);
    });
  });

  describe('createCouncilMembers', () => {
    it('should create council members from aggregated responses', () => {
      const sessionId = 'session-123';
      const result: AggregatedResponses = {
        successful: [
          {
            providerId: 'anthropic' as never,
            response: {
              content: 'Anthropic response',
              usage: { inputTokens: 10, outputTokens: 20 },
              model: 'claude-opus-4-5',
              providerId: 'anthropic',
            },
          },
          {
            providerId: 'google' as never,
            response: {
              content: 'Google response',
              usage: { inputTokens: 15, outputTokens: 25 },
              model: 'gemini-3-flash-preview',
              providerId: 'google',
            },
          },
        ],
        failed: [{ providerId: 'openai' as never, error: 'Timeout' }],
        quorumMet: true,
        durationMs: 500,
      };

      const members = aggregator.createCouncilMembers(sessionId, result);

      expect(members).toHaveLength(3);

      // Check successful members
      const anthropicMember = members.find((m) => m.providerId === 'anthropic');
      expect(anthropicMember).toBeDefined();
      expect(anthropicMember?.status).toBe('responded');
      expect(anthropicMember?.anonymousId).toBe('Member A');
      expect(anthropicMember?.firstOpinion?.content).toBe('Anthropic response');
      expect(anthropicMember?.sessionId).toBe(sessionId);

      // Check failed member
      const openaiMember = members.find((m) => m.providerId === 'openai');
      expect(openaiMember).toBeDefined();
      expect(openaiMember?.status).toBe('error');
      expect(openaiMember?.errorMessage).toBe('Timeout');
    });

    it('should assign sequential anonymous IDs to successful members only', () => {
      const result: AggregatedResponses = {
        successful: [
          {
            providerId: 'google' as never,
            response: {
              content: 'Google',
              usage: { inputTokens: 10, outputTokens: 20 },
              model: 'model',
              providerId: 'google',
            },
          },
          {
            providerId: 'openai' as never,
            response: {
              content: 'OpenAI',
              usage: { inputTokens: 10, outputTokens: 20 },
              model: 'model',
              providerId: 'openai',
            },
          },
        ],
        failed: [],
        quorumMet: true,
        durationMs: 100,
      };

      const members = aggregator.createCouncilMembers('session-1', result);

      const googleMember = members.find((m) => m.providerId === 'google');
      const openaiMember = members.find((m) => m.providerId === 'openai');

      expect(googleMember?.anonymousId).toBe('Member A');
      expect(openaiMember?.anonymousId).toBe('Member B');
    });
  });

  describe('calculateUsageMetrics', () => {
    it('should calculate total tokens and duration from responses', () => {
      const result: AggregatedResponses = {
        successful: [
          {
            providerId: 'anthropic' as never,
            response: {
              content: 'Response',
              usage: { inputTokens: 100, outputTokens: 200 },
              model: 'claude-opus-4-5',
              providerId: 'anthropic',
            },
          },
          {
            providerId: 'google' as never,
            response: {
              content: 'Response',
              usage: { inputTokens: 150, outputTokens: 250 },
              model: 'gemini-3-flash-preview',
              providerId: 'google',
            },
          },
        ],
        failed: [],
        quorumMet: true,
        durationMs: 1500,
      };

      const metrics = aggregator.calculateUsageMetrics(result);

      expect(metrics.totalTokensInput).toBe(250);
      expect(metrics.totalTokensOutput).toBe(450);
      expect(metrics.durationMs).toBe(1500);
      expect(metrics.providerBreakdown['anthropic']).toBeDefined();
      expect(metrics.providerBreakdown['anthropic'].tokens).toBe(300);
      expect(metrics.providerBreakdown['google'].tokens).toBe(400);
    });

    it('should estimate cost based on token usage', () => {
      const result: AggregatedResponses = {
        successful: [
          {
            providerId: 'anthropic' as never,
            response: {
              content: 'Response',
              usage: { inputTokens: 1000, outputTokens: 500 },
              model: 'claude-opus-4-5',
              providerId: 'anthropic',
            },
          },
        ],
        failed: [],
        quorumMet: true,
        durationMs: 1000,
      };

      const metrics = aggregator.calculateUsageMetrics(result);

      // Cost should be positive and reasonable
      expect(metrics.estimatedCostUsd).toBeGreaterThan(0);
      expect(metrics.estimatedCostUsd).toBeLessThan(1); // Reasonable for a single request
    });

    it('should handle empty successful responses', () => {
      const result: AggregatedResponses = {
        successful: [],
        failed: [{ providerId: 'anthropic' as never, error: 'timeout' }],
        quorumMet: false,
        durationMs: 500,
      };

      const metrics = aggregator.calculateUsageMetrics(result);

      expect(metrics.totalTokensInput).toBe(0);
      expect(metrics.totalTokensOutput).toBe(0);
      expect(metrics.estimatedCostUsd).toBe(0);
    });
  });
});
