/**
 * CouncilOrchestrator Unit Tests
 *
 * Tests for the CouncilOrchestrator which coordinates multi-provider
 * parallel execution, handles progress reporting, and manages fallback
 * to single-provider mode on quorum failure.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CouncilOrchestrator,
  DispatchOptions,
} from '../../../extension/src/council/CouncilOrchestrator';
import { LLMProvider } from '../../../extension/src/council/providers/LLMProvider';
import { ConfigLoader } from '../../../extension/src/council/ConfigLoader';
import { ResponseAggregator } from '../../../extension/src/council/ResponseAggregator';
import {
  CouncilConfig,
  QueryResponse,
  AgentType,
  DEFAULT_COUNCIL_CONFIG,
} from '../../../extension/src/council/types';

// Mock dependencies
vi.mock('../../../extension/src/council/ConfigLoader');
vi.mock('../../../extension/src/council/ResponseAggregator');

// Mock provider factory for testing
function createMockProvider(id: string, response?: QueryResponse, error?: Error): LLMProvider {
  const mockQuery = vi.fn().mockImplementation(async () => {
    if (error) {
      throw error;
    }
    return (
      response ?? {
        content: `Response from ${id}`,
        usage: { inputTokens: 10, outputTokens: 20 },
        model: 'mock-model',
        providerId: id,
      }
    );
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

describe('CouncilOrchestrator', () => {
  let orchestrator: CouncilOrchestrator;
  let mockConfigLoader: jest.Mocked<ConfigLoader>;
  let mockResponseAggregator: jest.Mocked<ResponseAggregator>;
  let mockProviders: Map<string, LLMProvider>;

  const defaultConfig: CouncilConfig = {
    ...DEFAULT_COUNCIL_CONFIG,
    enabled: true,
    minQuorum: 2,
    timeout: 30000,
    providers: [
      { providerId: 'anthropic', enabled: true },
      { providerId: 'google', enabled: true },
      { providerId: 'openai', enabled: true },
    ],
    stages: {
      gofer_plan: 'council',
      gofer_analyze: 'council',
      research_codebase: 'single',
      validate_plan: 'council',
      implement: 'single',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock config loader
    mockConfigLoader = {
      loadConfig: vi.fn().mockResolvedValue(defaultConfig),
      shouldUseCouncil: vi.fn().mockImplementation((stage: string) => {
        return defaultConfig.stages[stage] === 'council';
      }),
      getConfigPath: vi.fn().mockReturnValue('/mock/path'),
      invalidateCache: vi.fn(),
    } as unknown as jest.Mocked<ConfigLoader>;

    // Setup mock providers
    mockProviders = new Map([
      ['anthropic', createMockProvider('anthropic')],
      ['google', createMockProvider('google')],
      ['openai', createMockProvider('openai')],
    ]);

    // Setup mock response aggregator
    mockResponseAggregator = {
      timeout: 30000,
      minQuorum: 2,
      collectResponses: vi.fn().mockResolvedValue({
        successful: [
          {
            providerId: 'anthropic',
            response: {
              content: 'Anthropic response',
              usage: { inputTokens: 10, outputTokens: 20 },
              model: 'claude-opus-4-5',
              providerId: 'anthropic',
            },
          },
          {
            providerId: 'google',
            response: {
              content: 'Google response',
              usage: { inputTokens: 15, outputTokens: 25 },
              model: 'gemini-3-flash-preview',
              providerId: 'google',
            },
          },
        ],
        failed: [],
        quorumMet: true,
        durationMs: 500,
      }),
      validateQuorum: vi.fn().mockReturnValue(true),
      anonymize: vi.fn().mockReturnValue([
        { anonymousId: 'Member A', content: 'Anthropic response', tokenCount: 20 },
        { anonymousId: 'Member B', content: 'Google response', tokenCount: 25 },
      ]),
      createCouncilMembers: vi.fn().mockReturnValue([]),
      calculateUsageMetrics: vi.fn().mockReturnValue({
        totalTokensInput: 25,
        totalTokensOutput: 45,
        estimatedCostUsd: 0.001,
        durationMs: 500,
        providerBreakdown: {},
      }),
    } as unknown as jest.Mocked<ResponseAggregator>;

    orchestrator = new CouncilOrchestrator({
      configLoader: mockConfigLoader,
      providers: mockProviders,
      responseAggregator: mockResponseAggregator,
    });
  });

  describe('constructor', () => {
    it('should create orchestrator with provided dependencies', () => {
      expect(orchestrator).toBeDefined();
    });

    it('should accept optional progress callback', () => {
      const progressCallback = vi.fn();
      const orch = new CouncilOrchestrator({
        configLoader: mockConfigLoader,
        providers: mockProviders,
        responseAggregator: mockResponseAggregator,
        onProgress: progressCallback,
      });

      expect(orch).toBeDefined();
    });
  });

  describe('dispatch', () => {
    const defaultOptions: DispatchOptions = {
      agentType: 'codebase-analyzer' as AgentType,
      stage: 'gofer_plan',
      request: {
        prompt: 'Analyze the codebase',
        maxTokens: 4000,
        temperature: 0,
      },
    };

    it('should use council mode when stage is configured for council', async () => {
      const result = await orchestrator.dispatch(defaultOptions);

      expect(result.mode).toBe('council');
      expect(mockResponseAggregator.collectResponses).toHaveBeenCalled();
    });

    it('should use single mode when stage is configured for single', async () => {
      const singleStageOptions: DispatchOptions = {
        ...defaultOptions,
        stage: 'implement',
      };

      mockConfigLoader.shouldUseCouncil.mockReturnValue(false);

      const result = await orchestrator.dispatch(singleStageOptions);

      expect(result.mode).toBe('single');
      expect(mockResponseAggregator.collectResponses).not.toHaveBeenCalled();
    });

    it('should use single mode when council is globally disabled', async () => {
      const disabledConfig = { ...defaultConfig, enabled: false };
      mockConfigLoader.loadConfig.mockResolvedValue(disabledConfig);
      mockConfigLoader.shouldUseCouncil.mockReturnValue(false);

      const result = await orchestrator.dispatch(defaultOptions);

      expect(result.mode).toBe('single');
    });

    it('should collect responses from all enabled providers in council mode', async () => {
      await orchestrator.dispatch(defaultOptions);

      expect(mockResponseAggregator.collectResponses).toHaveBeenCalledWith(
        expect.any(Array),
        defaultOptions.request
      );

      // Should pass the enabled providers
      const passedProviders = mockResponseAggregator.collectResponses.mock.calls[0][0];
      expect(passedProviders.length).toBeGreaterThanOrEqual(2);
    });

    it('should return synthesis from anonymized responses', async () => {
      const result = await orchestrator.dispatch(defaultOptions);

      expect(result.synthesis).toBeDefined();
      expect(typeof result.synthesis).toBe('string');
    });

    it('should include usage metrics in result', async () => {
      const result = await orchestrator.dispatch(defaultOptions);

      expect(result.usage).toBeDefined();
      expect(result.usage.totalTokensInput).toBeGreaterThanOrEqual(0);
      expect(result.usage.totalTokensOutput).toBeGreaterThanOrEqual(0);
    });

    it('should include session details in council mode', async () => {
      const result = await orchestrator.dispatch(defaultOptions);

      expect(result.mode).toBe('council');
      expect(result.session).toBeDefined();
      expect(result.session?.id).toBeDefined();
      expect(result.session?.agentType).toBe('codebase-analyzer');
      expect(result.session?.stage).toBe('gofer_plan');
    });

    it('should call progress callback during execution', async () => {
      const progressCallback = vi.fn();
      const orch = new CouncilOrchestrator({
        configLoader: mockConfigLoader,
        providers: mockProviders,
        responseAggregator: mockResponseAggregator,
        onProgress: progressCallback,
      });

      await orch.dispatch(defaultOptions);

      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('graceful degradation', () => {
    it('should fallback to single provider when quorum not met', async () => {
      // Setup quorum failure
      mockResponseAggregator.collectResponses.mockResolvedValue({
        successful: [
          {
            providerId: 'anthropic',
            response: {
              content: 'Only Anthropic responded',
              usage: { inputTokens: 10, outputTokens: 20 },
              model: 'claude-opus-4-5',
              providerId: 'anthropic',
            },
          },
        ],
        failed: [
          { providerId: 'google', error: 'timeout' },
          { providerId: 'openai', error: 'rate limit' },
        ],
        quorumMet: false,
        durationMs: 500,
      });
      mockResponseAggregator.validateQuorum.mockReturnValue(false);

      const options: DispatchOptions = {
        agentType: 'codebase-analyzer' as AgentType,
        stage: 'gofer_plan',
        request: {
          prompt: 'Analyze the codebase',
          maxTokens: 4000,
          temperature: 0,
        },
      };

      const result = await orchestrator.dispatch(options);

      // Should fallback to single mode with available response
      expect(result.mode).toBe('single');
      expect(result.synthesis).toBe('Only Anthropic responded');
    });

    it('should throw error when no providers respond', async () => {
      mockResponseAggregator.collectResponses.mockResolvedValue({
        successful: [],
        failed: [
          { providerId: 'anthropic', error: 'timeout' },
          { providerId: 'google', error: 'timeout' },
          { providerId: 'openai', error: 'timeout' },
        ],
        quorumMet: false,
        durationMs: 500,
      });
      mockResponseAggregator.validateQuorum.mockReturnValue(false);

      const options: DispatchOptions = {
        agentType: 'codebase-analyzer' as AgentType,
        stage: 'gofer_plan',
        request: {
          prompt: 'Analyze the codebase',
          maxTokens: 4000,
          temperature: 0,
        },
      };

      await expect(orchestrator.dispatch(options)).rejects.toThrow(/no providers responded/i);
    });

    it('should prefer primary provider (anthropic) for single mode fallback', async () => {
      // First provider fails, second succeeds
      mockResponseAggregator.collectResponses.mockResolvedValue({
        successful: [
          {
            providerId: 'google',
            response: {
              content: 'Google fallback response',
              usage: { inputTokens: 10, outputTokens: 20 },
              model: 'gemini-3-flash-preview',
              providerId: 'google',
            },
          },
        ],
        failed: [
          { providerId: 'anthropic', error: 'timeout' },
          { providerId: 'openai', error: 'timeout' },
        ],
        quorumMet: false,
        durationMs: 500,
      });
      mockResponseAggregator.validateQuorum.mockReturnValue(false);
      mockConfigLoader.shouldUseCouncil.mockReturnValue(false);

      const options: DispatchOptions = {
        agentType: 'codebase-analyzer' as AgentType,
        stage: 'implement', // Single mode stage
        request: {
          prompt: 'Implement feature',
          maxTokens: 4000,
          temperature: 0,
        },
      };

      const result = await orchestrator.dispatch(options);

      expect(result.mode).toBe('single');
      expect(result.singleResponse).toBeDefined();
    });
  });

  describe('getAvailableProviders', () => {
    it('should return only enabled and available providers', async () => {
      const providers = await orchestrator.getAvailableProviders();

      expect(providers.length).toBeGreaterThan(0);
      providers.forEach((p) => {
        expect(p.isAvailable()).toBe(true);
      });
    });

    it('should filter out rate-limited providers', async () => {
      const rateLimitedProvider = createMockProvider('anthropic');
      (rateLimitedProvider.isRateLimited as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (rateLimitedProvider.isAvailable as ReturnType<typeof vi.fn>).mockReturnValue(false);

      mockProviders.set('anthropic', rateLimitedProvider);

      const orch = new CouncilOrchestrator({
        configLoader: mockConfigLoader,
        providers: mockProviders,
        responseAggregator: mockResponseAggregator,
      });

      const providers = await orch.getAvailableProviders();

      // Anthropic should be filtered out
      const hasAnthropic = providers.some((p) => p.id === 'anthropic');
      expect(hasAnthropic).toBe(false);
    });

    it('should filter out disabled providers from config', async () => {
      const configWithDisabled = {
        ...defaultConfig,
        providers: [
          { providerId: 'anthropic' as const, enabled: true },
          { providerId: 'google' as const, enabled: false }, // Disabled
          { providerId: 'openai' as const, enabled: true },
        ],
      };
      mockConfigLoader.loadConfig.mockResolvedValue(configWithDisabled);

      const providers = await orchestrator.getAvailableProviders();

      const hasGoogle = providers.some((p) => p.id === 'google');
      expect(hasGoogle).toBe(false);
    });
  });

  describe('shouldUseCouncil', () => {
    it('should delegate to config loader', async () => {
      await orchestrator.shouldUseCouncil('gofer_plan');

      expect(mockConfigLoader.shouldUseCouncil).toHaveBeenCalledWith('gofer_plan');
    });

    it('should return true for council stages', async () => {
      mockConfigLoader.shouldUseCouncil.mockReturnValue(true);

      const result = await orchestrator.shouldUseCouncil('gofer_plan');

      expect(result).toBe(true);
    });

    it('should return false for single stages', async () => {
      mockConfigLoader.shouldUseCouncil.mockReturnValue(false);

      const result = await orchestrator.shouldUseCouncil('implement');

      expect(result).toBe(false);
    });
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = orchestrator.generateSessionId();
      const id2 = orchestrator.generateSessionId();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    it('should generate UUID-like format', () => {
      const id = orchestrator.generateSessionId();

      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('buildSynthesisFromResponses', () => {
    it('should combine anonymized responses into synthesis format', () => {
      const anonymized = [
        { anonymousId: 'Member A', content: 'Analysis point 1', tokenCount: 50 },
        { anonymousId: 'Member B', content: 'Analysis point 2', tokenCount: 60 },
      ];

      const synthesis = orchestrator.buildSynthesisFromResponses(anonymized);

      expect(synthesis).toContain('Member A');
      expect(synthesis).toContain('Member B');
      expect(synthesis).toContain('Analysis point 1');
      expect(synthesis).toContain('Analysis point 2');
    });

    it('should handle single response gracefully', () => {
      const anonymized = [{ anonymousId: 'Member A', content: 'Single response', tokenCount: 30 }];

      const synthesis = orchestrator.buildSynthesisFromResponses(anonymized);

      expect(synthesis).toContain('Member A');
      expect(synthesis).toContain('Single response');
    });
  });
});
