/**
 * Council Orchestrator Integration Tests - Real API Calls
 *
 * These tests make REAL API calls to external LLM providers.
 * API keys must be provided via environment variables:
 * - ANTHROPIC_API_KEY
 * - GOOGLE_API_KEY
 * - OPENAI_API_KEY
 *
 * Run with: npm test -- tests/integration/council/orchestrator.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CouncilOrchestrator,
  OrchestratorConfig,
} from '../../../extension/src/council/CouncilOrchestrator';
import { ConfigLoader } from '../../../extension/src/council/ConfigLoader';
import { ResponseAggregator } from '../../../extension/src/council/ResponseAggregator';
import { AnthropicProvider } from '../../../extension/src/council/providers/AnthropicProvider';
import { GoogleProvider } from '../../../extension/src/council/providers/GoogleProvider';
import { OpenAIProvider } from '../../../extension/src/council/providers/OpenAIProvider';
import { LLMProvider } from '../../../extension/src/council/providers/LLMProvider';

// Helper to check if a valid API key is available
const hasApiKey = (envVar: string): boolean => {
  const key = process.env[envVar];
  if (!key || key.length < 10) return false;
  // Validate key format per provider
  if (envVar === 'ANTHROPIC_API_KEY') return key.startsWith('sk-ant-');
  if (envVar === 'GOOGLE_API_KEY') return key.startsWith('AIza');
  if (envVar === 'OPENAI_API_KEY') return key.startsWith('sk-');
  return true;
};

// Count available provider keys
const countAvailableProviders = (): number => {
  let count = 0;
  if (hasApiKey('ANTHROPIC_API_KEY')) {
    count++;
  }
  if (hasApiKey('GOOGLE_API_KEY')) {
    count++;
  }
  if (hasApiKey('OPENAI_API_KEY')) {
    count++;
  }
  return count;
};

describe.skip('Council Orchestrator - Real API Integration Tests', () => {
  let tempDir: string;
  let configPath: string;
  let configLoader: ConfigLoader;
  let providers: Map<string, LLMProvider>;
  let orchestrator: CouncilOrchestrator;
  let progressMessages: string[];

  beforeAll(async () => {
    // Create temp directory for config - match the path structure ConfigLoader expects
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'council-test-'));
    // ConfigLoader looks in: workspacePath/.specify/memory/council-config.yaml
    const configDir = path.join(tempDir, '.specify', 'memory');
    fs.mkdirSync(configDir, { recursive: true });
    configPath = path.join(configDir, 'council-config.yaml');

    // Initialize providers map with available AND HEALTHY providers only
    providers = new Map();

    if (hasApiKey('ANTHROPIC_API_KEY')) {
      const provider = new AnthropicProvider(
        process.env.ANTHROPIC_API_KEY!,
        'claude-sonnet-4-20250514'
      );
      const healthy = await provider.healthCheck();
      if (healthy) {
        providers.set('anthropic', provider);
        console.log('  ✓ Anthropic provider healthy');
      } else {
        console.log('  ✗ Anthropic provider not healthy');
      }
    }

    if (hasApiKey('GOOGLE_API_KEY')) {
      const provider = new GoogleProvider(process.env.GOOGLE_API_KEY!, 'gemini-2.0-flash');
      const healthy = await provider.healthCheck();
      if (healthy) {
        providers.set('google', provider);
        console.log('  ✓ Google provider healthy');
      } else {
        console.log('  ✗ Google provider not healthy');
      }
    }

    if (hasApiKey('OPENAI_API_KEY')) {
      const provider = new OpenAIProvider(process.env.OPENAI_API_KEY!, 'gpt-3.5-turbo');
      const healthy = await provider.healthCheck();
      if (healthy) {
        providers.set('openai', provider);
        console.log('  ✓ OpenAI provider healthy');
      } else {
        console.log('  ✗ OpenAI provider not healthy');
      }
    }

    console.log(
      `Available healthy providers for integration tests: ${Array.from(providers.keys()).join(', ') || 'none'}`
    );
  });

  afterEach(() => {
    // Clean up config file
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  /**
   * Helper to build proper YAML config in the format expected by ConfigLoader
   */
  const buildCouncilConfig = (options: {
    enabled?: boolean;
    minQuorum?: number;
    peerReview?: boolean;
    providerIds: string[];
    stages: Record<string, string>;
  }): string => {
    const providersYaml = options.providerIds
      .map((id) => `    ${id}:\n      enabled: true`)
      .join('\n');

    const stagesYaml = Object.entries(options.stages)
      .map(([stage, mode]) => `    ${stage}: ${mode}`)
      .join('\n');

    return `council:
  enabled: ${options.enabled ?? true}
  min_quorum: ${options.minQuorum ?? 2}
  peer_review: ${options.peerReview ?? false}
  providers:
${providersYaml}
  stages:
${stagesYaml}
`;
  };

  const createOrchestrator = (
    configContent: string,
    aggregatorMinQuorum = 1
  ): CouncilOrchestrator => {
    fs.writeFileSync(configPath, configContent);
    // ConfigLoader expects workspace path, it will append .specify/memory/council-config.yaml
    configLoader = new ConfigLoader(tempDir);
    progressMessages = [];

    const config: OrchestratorConfig = {
      configLoader,
      providers,
      responseAggregator: new ResponseAggregator({
        timeout: 60000,
        minQuorum: aggregatorMinQuorum,
      }),
      onProgress: (message: string) => {
        progressMessages.push(message);
        console.log(`[Progress] ${message}`);
      },
    };

    return new CouncilOrchestrator(config);
  };

  describe('Single Provider Mode - Real API', () => {
    it.runIf(countAvailableProviders() >= 1)(
      'should dispatch request to single provider',
      async () => {
        const availableProviderIds = Array.from(providers.keys());
        const primaryProvider = availableProviderIds[0];

        const configYaml = buildCouncilConfig({
          enabled: true,
          minQuorum: 2,
          providerIds: [primaryProvider],
          stages: { planning: 'single', analysis: 'single' },
        });
        orchestrator = createOrchestrator(configYaml);

        const result = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'planning',
          request: {
            prompt: 'What is 2 + 2? Reply with just the number.',
            maxTokens: 10,
            temperature: 0,
          },
        });

        expect(result.mode).toBe('single');
        expect(result.synthesis).toContain('4');
        expect(result.singleResponse).toBeDefined();
        expect(result.singleResponse!.providerId).toBe(primaryProvider);
      },
      { timeout: 60000 }
    );
  });

  describe('Council Mode - Real API', () => {
    it.runIf(countAvailableProviders() >= 2)(
      'should dispatch request to multiple providers in parallel',
      async () => {
        const availableProviderIds = Array.from(providers.keys());

        // Skip if we don't have enough healthy providers
        if (availableProviderIds.length < 2) {
          console.log(
            `  Skipping: Only ${availableProviderIds.length} healthy provider(s) available, need 2+`
          );
          return;
        }

        const configYaml = buildCouncilConfig({
          enabled: true,
          minQuorum: 2,
          providerIds: availableProviderIds,
          stages: { planning: 'council', analysis: 'council' },
        });
        orchestrator = createOrchestrator(configYaml);

        const result = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'planning',
          request: {
            prompt: 'What is the capital of France? Reply with just the city name.',
            maxTokens: 20,
            temperature: 0,
          },
        });

        expect(result.mode).toBe('council');
        expect(result.synthesis).toBeDefined();
        expect(result.synthesis.toLowerCase()).toContain('paris');
        expect(result.session).toBeDefined();
        expect(result.session!.members.length).toBeGreaterThanOrEqual(2);
        expect(result.usage).toBeDefined();
        expect(result.usage!.totalTokensInput).toBeGreaterThan(0);
        expect(result.usage!.totalTokensOutput).toBeGreaterThan(0);
      },
      { timeout: 90000 }
    );

    it.runIf(countAvailableProviders() >= 2)(
      'should synthesize responses from multiple providers',
      async () => {
        const availableProviderIds = Array.from(providers.keys());

        // Skip if we don't have enough healthy providers
        if (availableProviderIds.length < 2) {
          console.log(
            `  Skipping: Only ${availableProviderIds.length} healthy provider(s) available, need 2+`
          );
          return;
        }

        const configYaml = buildCouncilConfig({
          enabled: true,
          minQuorum: 2,
          providerIds: availableProviderIds,
          stages: { planning: 'council' },
        });
        orchestrator = createOrchestrator(configYaml);

        const result = await orchestrator.dispatch({
          agentType: 'codebase-pattern-finder',
          stage: 'planning',
          request: {
            prompt: 'List 2 programming languages. Just list the names.',
            maxTokens: 50,
            temperature: 0.3,
          },
        });

        expect(result.mode).toBe('council');
        expect(result.synthesis.length).toBeGreaterThan(0);
        expect(result.session).toBeDefined();

        // Should have anonymized members
        const memberIds = result.session!.members.map((m) => m.anonymousId);
        expect(memberIds).toContain('Member A');
        expect(memberIds).toContain('Member B');
      },
      { timeout: 90000 }
    );

    it.runIf(countAvailableProviders() >= 2)(
      'should track usage metrics across providers',
      async () => {
        const availableProviderIds = Array.from(providers.keys());

        const configYaml = buildCouncilConfig({
          enabled: true,
          minQuorum: 1,
          providerIds: availableProviderIds,
          stages: { analysis: 'council' },
        });
        orchestrator = createOrchestrator(configYaml);

        const result = await orchestrator.dispatch({
          agentType: 'codebase-locator',
          stage: 'analysis',
          request: {
            prompt: 'Say "test"',
            maxTokens: 10,
            temperature: 0,
          },
        });

        expect(result.usage).toBeDefined();
        expect(result.usage!.totalTokensInput).toBeGreaterThan(0);
        expect(result.usage!.totalTokensOutput).toBeGreaterThan(0);
        expect(result.usage!.providerBreakdown).toBeDefined();

        // Should have breakdown for each provider that responded
        const providerBreakdown = result.usage!.providerBreakdown;
        const respondedProviders = Object.keys(providerBreakdown);
        expect(respondedProviders.length).toBeGreaterThanOrEqual(1);

        for (const providerId of respondedProviders) {
          expect(
            providerBreakdown[providerId as keyof typeof providerBreakdown].tokens
          ).toBeGreaterThan(0);
        }
      },
      { timeout: 90000 }
    );
  });

  describe('Peer Review Mode - Real API', () => {
    it.runIf(countAvailableProviders() >= 3)(
      'should collect peer reviews when enabled',
      async () => {
        const availableProviderIds = Array.from(providers.keys());

        // Skip if we don't have enough healthy providers
        if (availableProviderIds.length < 3) {
          console.log(
            `  Skipping: Only ${availableProviderIds.length} healthy provider(s) available, need 3+`
          );
          return;
        }

        // Use actual provider count for quorum
        const quorum = Math.min(3, availableProviderIds.length);

        const configYaml = buildCouncilConfig({
          enabled: true,
          minQuorum: quorum,
          peerReview: true,
          providerIds: availableProviderIds,
          stages: { analysis: 'council' },
        });
        orchestrator = createOrchestrator(configYaml);

        const result = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'analysis',
          request: {
            prompt: 'Explain what a variable is in programming. One sentence.',
            maxTokens: 100,
            temperature: 0,
          },
        });

        // With 3+ providers, expect council mode
        expect(result.mode).toBe('council');
        expect(result.session).toBeDefined();

        // If peer reviews were collected
        if (result.peerReviews && result.peerReviews.length > 0) {
          expect(result.peerReviews.length).toBeGreaterThanOrEqual(1);
          for (const review of result.peerReviews) {
            expect(review.reviewerId).toBeDefined();
            expect(review.rankings).toBeDefined();
          }
        }
      },
      { timeout: 120000 }
    );
  });

  describe('Fallback Behavior - Real API', () => {
    it.runIf(countAvailableProviders() >= 1)(
      'should fallback to single mode when quorum not met',
      async () => {
        // Set high quorum that cannot be met
        const availableProviderIds = Array.from(providers.keys());
        const primaryProvider = availableProviderIds[0];

        const configYaml = buildCouncilConfig({
          enabled: true,
          minQuorum: 2,
          providerIds: [primaryProvider], // Only 1 provider
          stages: { planning: 'council' },
        });
        // Create orchestrator with minQuorum: 10 for the aggregator - way more than 1 provider can satisfy
        orchestrator = createOrchestrator(configYaml, 10);

        const result = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'planning',
          request: {
            prompt: 'Say "fallback test"',
            maxTokens: 20,
            temperature: 0,
          },
        });

        // Should fallback to single mode (quorum of 10 not met with 1 provider)
        expect(result.mode).toBe('single');
        expect(result.synthesis.toLowerCase()).toContain('fallback');
      },
      { timeout: 60000 }
    );
  });

  describe('Stage Configuration - Real API', () => {
    it.runIf(countAvailableProviders() >= 2)(
      'should use council mode only for enabled stages',
      async () => {
        const availableProviderIds = Array.from(providers.keys());

        // Skip if we don't have enough healthy providers
        if (availableProviderIds.length < 2) {
          console.log(
            `  Skipping: Only ${availableProviderIds.length} healthy provider(s) available, need 2+`
          );
          return;
        }

        // Use actual available provider count for quorum
        const quorum = Math.min(2, availableProviderIds.length);

        const configYaml = buildCouncilConfig({
          enabled: true,
          minQuorum: quorum,
          providerIds: availableProviderIds,
          stages: { planning: 'council', analysis: 'single', validation: 'council' },
        });
        orchestrator = createOrchestrator(configYaml);

        // Planning stage should use council (we have enough providers)
        const planningResult = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'planning',
          request: {
            prompt: 'Say "planning"',
            maxTokens: 20,
            temperature: 0,
          },
        });

        expect(planningResult.mode).toBe('council');

        // Analysis stage should always use single (disabled)
        const analysisResult = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'analysis',
          request: {
            prompt: 'Say "analysis"',
            maxTokens: 20,
            temperature: 0,
          },
        });

        expect(analysisResult.mode).toBe('single');
      },
      { timeout: 120000 }
    );
  });

  describe('Error Handling - Real API', () => {
    it.runIf(countAvailableProviders() >= 1)(
      'should handle provider errors gracefully',
      async () => {
        // Create orchestrator with invalid API key for one provider
        const availableProviderIds = Array.from(providers.keys());
        const validProvider = availableProviderIds[0];

        // Add an invalid provider to the map (use Anthropic since it's more reliable for testing)
        const invalidProvider = new AnthropicProvider(
          'sk-ant-invalid-key',
          'claude-sonnet-4-20250514'
        );
        providers.set('invalid', invalidProvider);

        try {
          const configYaml = buildCouncilConfig({
            enabled: true,
            minQuorum: 1,
            providerIds: [validProvider, 'invalid'],
            stages: { planning: 'council' },
          });
          orchestrator = createOrchestrator(configYaml);

          const result = await orchestrator.dispatch({
            agentType: 'codebase-analyzer',
            stage: 'planning',
            request: {
              prompt: 'Say "error handling test"',
              maxTokens: 30,
              temperature: 0,
            },
          });

          // Should still succeed with valid provider
          expect(result.synthesis).toBeDefined();
          expect(result.synthesis.length).toBeGreaterThan(0);
        } finally {
          // Remove invalid provider
          providers.delete('invalid');
        }
      },
      { timeout: 60000 }
    );
  });
});
