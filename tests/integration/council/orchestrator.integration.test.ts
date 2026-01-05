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

// Helper to check if API key is available
const hasApiKey = (envVar: string): boolean => {
  const key = process.env[envVar];
  return key !== undefined && key.length > 0;
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

describe('Council Orchestrator - Real API Integration Tests', () => {
  let tempDir: string;
  let configPath: string;
  let configLoader: ConfigLoader;
  let providers: Map<string, LLMProvider>;
  let orchestrator: CouncilOrchestrator;
  let progressMessages: string[];

  beforeAll(async () => {
    // Create temp directory for config
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'council-test-'));
    configPath = path.join(tempDir, 'council-config.yaml');

    // Initialize providers map with available providers
    providers = new Map();

    if (hasApiKey('ANTHROPIC_API_KEY')) {
      const provider = new AnthropicProvider(
        process.env.ANTHROPIC_API_KEY!,
        'claude-opus-4-5-20251101'
      );
      await provider.healthCheck();
      providers.set('anthropic', provider);
    }

    if (hasApiKey('GOOGLE_API_KEY')) {
      const provider = new GoogleProvider(process.env.GOOGLE_API_KEY!, 'gemini-3-flash-preview');
      await provider.healthCheck();
      providers.set('google', provider);
    }

    if (hasApiKey('OPENAI_API_KEY')) {
      const provider = new OpenAIProvider(process.env.OPENAI_API_KEY!, 'gpt-5.2');
      await provider.healthCheck();
      providers.set('openai', provider);
    }

    console.log(
      `Available providers for integration tests: ${Array.from(providers.keys()).join(', ')}`
    );
  });

  afterEach(() => {
    // Clean up config file
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  const createOrchestrator = (configContent: string): CouncilOrchestrator => {
    fs.writeFileSync(configPath, configContent);
    configLoader = new ConfigLoader(configPath);
    progressMessages = [];

    const config: OrchestratorConfig = {
      configLoader,
      providers,
      responseAggregator: new ResponseAggregator({ timeout: 60000, minQuorum: 1 }),
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

        orchestrator = createOrchestrator(`
enabled: true
defaultMode: single
providers:
  - providerId: ${primaryProvider}
    enabled: true
stages:
  planning: false
  analysis: false
`);

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

        const providerConfigLines = availableProviderIds
          .map((id) => `  - providerId: ${id}\n    enabled: true`)
          .join('\n');

        orchestrator = createOrchestrator(`
enabled: true
defaultMode: council
quorum: 2
providers:
${providerConfigLines}
stages:
  planning: true
  analysis: true
`);

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

        const providerConfigLines = availableProviderIds
          .map((id) => `  - providerId: ${id}\n    enabled: true`)
          .join('\n');

        orchestrator = createOrchestrator(`
enabled: true
defaultMode: council
quorum: 2
providers:
${providerConfigLines}
stages:
  planning: true
`);

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

        const providerConfigLines = availableProviderIds
          .map((id) => `  - providerId: ${id}\n    enabled: true`)
          .join('\n');

        orchestrator = createOrchestrator(`
enabled: true
defaultMode: council
quorum: 1
providers:
${providerConfigLines}
stages:
  analysis: true
`);

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

        const providerConfigLines = availableProviderIds
          .map((id) => `  - providerId: ${id}\n    enabled: true`)
          .join('\n');

        orchestrator = createOrchestrator(`
enabled: true
defaultMode: council
quorum: 3
peerReview: true
providers:
${providerConfigLines}
stages:
  analysis: true
`);

        const result = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'analysis',
          request: {
            prompt: 'Explain what a variable is in programming. One sentence.',
            maxTokens: 100,
            temperature: 0,
          },
        });

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

        orchestrator = createOrchestrator(`
enabled: true
defaultMode: council
quorum: 10
providers:
  - providerId: ${primaryProvider}
    enabled: true
stages:
  planning: true
`);

        const result = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'planning',
          request: {
            prompt: 'Say "fallback test"',
            maxTokens: 20,
            temperature: 0,
          },
        });

        // Should fallback to single mode
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

        const providerConfigLines = availableProviderIds
          .map((id) => `  - providerId: ${id}\n    enabled: true`)
          .join('\n');

        orchestrator = createOrchestrator(`
enabled: true
defaultMode: council
quorum: 2
providers:
${providerConfigLines}
stages:
  planning: true
  analysis: false
  validation: true
`);

        // Planning stage should use council
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

        // Analysis stage should use single (disabled)
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

        // Add an invalid provider to the map
        const invalidProvider = new AnthropicProvider('sk-invalid-key', 'claude-opus-4-5-20251101');
        providers.set('invalid', invalidProvider);

        try {
          orchestrator = createOrchestrator(`
enabled: true
defaultMode: council
quorum: 1
providers:
  - providerId: ${validProvider}
    enabled: true
  - providerId: invalid
    enabled: true
stages:
  planning: true
`);

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
