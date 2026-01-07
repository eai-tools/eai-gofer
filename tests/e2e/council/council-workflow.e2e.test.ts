/**
 * Council Integration E2E Tests - Real API Workflow
 *
 * These tests validate the complete LLM Council workflow with REAL API calls.
 * This is not a mock test - it will make actual calls to configured LLM providers.
 *
 * Required environment variables:
 * - ANTHROPIC_API_KEY: Required for Anthropic/Claude provider
 * - GOOGLE_API_KEY: Optional for Google/Gemini provider
 * - OPENAI_API_KEY: Optional for OpenAI provider
 *
 * Run with: npm test -- tests/e2e/council/council-workflow.e2e.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CouncilOrchestrator,
  OrchestratorConfig,
} from '../../../extension/src/council/CouncilOrchestrator';
import { ConfigLoader } from '../../../extension/src/council/ConfigLoader';
import { ResponseAggregator } from '../../../extension/src/council/ResponseAggregator';
import { UsageLogger } from '../../../extension/src/council/UsageLogger';
import { AnthropicProvider } from '../../../extension/src/council/providers/AnthropicProvider';
import { GoogleProvider } from '../../../extension/src/council/providers/GoogleProvider';
import { OpenAIProvider } from '../../../extension/src/council/providers/OpenAIProvider';
import { LLMProvider } from '../../../extension/src/council/providers/LLMProvider';

// Test configuration
const TEST_TIMEOUT = 120000; // 2 minutes for real API calls

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

// Skip entire test suite if no API keys available
const shouldRunTests = countAvailableProviders() >= 1;

describe.runIf(shouldRunTests)('Council E2E Workflow - Real API Integration', () => {
  let tempDir: string;
  let configPath: string;
  let logPath: string;
  let providers: Map<string, LLMProvider>;
  let usageLogger: UsageLogger;
  let progressMessages: string[];

  beforeAll(async () => {
    // Create temp directory for test artifacts
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'council-e2e-'));
    configPath = path.join(tempDir, 'council-config.yaml');
    logPath = path.join(tempDir, 'council-usage.jsonl');

    // Initialize providers with available API keys
    providers = new Map();

    if (hasApiKey('ANTHROPIC_API_KEY')) {
      const provider = new AnthropicProvider(
        process.env.ANTHROPIC_API_KEY!,
        'claude-sonnet-4-20250514'
      );
      const healthy = await provider.healthCheck();
      if (healthy) {
        providers.set('anthropic', provider);
        console.log('✓ Anthropic provider initialized');
      }
    }

    if (hasApiKey('GOOGLE_API_KEY')) {
      const provider = new GoogleProvider(process.env.GOOGLE_API_KEY!, 'gemini-2.0-flash');
      const healthy = await provider.healthCheck();
      if (healthy) {
        providers.set('google', provider);
        console.log('✓ Google provider initialized');
      }
    }

    if (hasApiKey('OPENAI_API_KEY')) {
      const provider = new OpenAIProvider(process.env.OPENAI_API_KEY!, 'gpt-4o');
      const healthy = await provider.healthCheck();
      if (healthy) {
        providers.set('openai', provider);
        console.log('✓ OpenAI provider initialized');
      }
    }

    console.log(`\nAvailable providers: ${Array.from(providers.keys()).join(', ')}`);
    console.log(`Test artifacts directory: ${tempDir}\n`);
  });

  afterAll(async () => {
    // Log final usage summary
    if (usageLogger && fs.existsSync(logPath)) {
      const logs = fs.readFileSync(logPath, 'utf-8');
      console.log('\n=== Council Usage Summary ===');
      console.log(logs);
    }

    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    progressMessages = [];
    usageLogger = new UsageLogger(logPath);
  });

  const createOrchestrator = (configContent: string): CouncilOrchestrator => {
    fs.writeFileSync(configPath, configContent);
    const configLoader = new ConfigLoader(configPath);

    const config: OrchestratorConfig = {
      configLoader,
      providers,
      responseAggregator: new ResponseAggregator({
        timeout: 60000,
        minQuorum: Math.min(providers.size, 2),
      }),
      usageLogger,
      onProgress: (message: string) => {
        progressMessages.push(message);
        console.log(`  [Progress] ${message}`);
      },
    };

    return new CouncilOrchestrator(config);
  };

  describe('Complete Council Workflow', () => {
    it(
      'should execute full research workflow with council synthesis',
      async () => {
        const availableProviderIds = Array.from(providers.keys());

        // Build provider config dynamically
        const providerConfigLines = availableProviderIds
          .map((id) => `  - providerId: ${id}\n    enabled: true\n    weight: 1.0`)
          .join('\n');

        const orchestrator = createOrchestrator(`
enabled: true
defaultMode: council
quorum: ${Math.min(availableProviderIds.length, 2)}
timeout: 60000
peerReview: false
providers:
${providerConfigLines}
stages:
  planning: true
  analysis: true
  validation: true
`);

        console.log('\n--- Test: Full Research Workflow ---');

        // Execute research query
        const result = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'planning',
          request: {
            prompt: `Analyze the following code pattern and provide insights:

\`\`\`typescript
class UserService {
  private cache: Map<string, User> = new Map();

  async getUser(id: string): Promise<User | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    const user = await this.repository.findById(id);
    if (user) {
      this.cache.set(id, user);
    }
    return user;
  }
}
\`\`\`

What are the potential issues with this caching approach?`,
            maxTokens: 500,
            temperature: 0.3,
          },
        });

        // Validate result structure
        expect(result).toBeDefined();
        expect(result.synthesis).toBeDefined();
        expect(result.synthesis.length).toBeGreaterThan(100);
        expect(result.usage).toBeDefined();

        // If council mode was used
        if (result.mode === 'council') {
          expect(result.session).toBeDefined();
          expect(result.session!.members.length).toBeGreaterThanOrEqual(1);

          console.log(`  Mode: ${result.mode}`);
          console.log(`  Members: ${result.session!.members.map((m) => m.anonymousId).join(', ')}`);
          console.log(
            `  Total tokens: ${result.usage!.totalTokensInput + result.usage!.totalTokensOutput}`
          );
        } else {
          console.log(`  Mode: ${result.mode} (single provider fallback)`);
        }

        // Verify synthesis contains relevant analysis
        const synthesis = result.synthesis.toLowerCase();
        expect(
          synthesis.includes('cache') ||
            synthesis.includes('memory') ||
            synthesis.includes('issue') ||
            synthesis.includes('problem')
        ).toBe(true);

        console.log('  ✓ Research workflow completed successfully');
      },
      TEST_TIMEOUT
    );

    it(
      'should handle multi-stage validation workflow',
      async () => {
        const availableProviderIds = Array.from(providers.keys());

        const providerConfigLines = availableProviderIds
          .map((id) => `  - providerId: ${id}\n    enabled: true`)
          .join('\n');

        const orchestrator = createOrchestrator(`
enabled: true
defaultMode: council
quorum: 1
providers:
${providerConfigLines}
stages:
  planning: true
  analysis: true
  validation: true
`);

        console.log('\n--- Test: Multi-Stage Validation ---');

        // Stage 1: Planning query
        const planningResult = await orchestrator.dispatch({
          agentType: 'codebase-pattern-finder',
          stage: 'planning',
          request: {
            prompt: 'List 3 common TypeScript design patterns. Just names.',
            maxTokens: 100,
            temperature: 0,
          },
        });

        expect(planningResult.synthesis).toBeDefined();
        console.log('  ✓ Planning stage completed');

        // Stage 2: Analysis query
        const analysisResult = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'analysis',
          request: {
            prompt: 'What is the Singleton pattern? One sentence.',
            maxTokens: 100,
            temperature: 0,
          },
        });

        expect(analysisResult.synthesis).toBeDefined();
        expect(analysisResult.synthesis.toLowerCase()).toContain('singleton');
        console.log('  ✓ Analysis stage completed');

        // Stage 3: Validation query
        const validationResult = await orchestrator.dispatch({
          agentType: 'codebase-locator',
          stage: 'validation',
          request: {
            prompt: 'Is "const instance = new Singleton()" a valid Singleton usage? Yes or No.',
            maxTokens: 50,
            temperature: 0,
          },
        });

        expect(validationResult.synthesis).toBeDefined();
        console.log('  ✓ Validation stage completed');

        // Verify usage was tracked across all stages
        expect(fs.existsSync(logPath)).toBe(true);
        const logContent = fs.readFileSync(logPath, 'utf-8');
        expect(logContent.split('\n').filter((l) => l.trim()).length).toBeGreaterThanOrEqual(3);

        console.log('  ✓ Multi-stage workflow completed');
      },
      TEST_TIMEOUT
    );
  });

  describe('Error Handling and Resilience', () => {
    it(
      'should gracefully handle provider failures',
      async () => {
        const availableProviderIds = Array.from(providers.keys());
        if (availableProviderIds.length < 1) {
          console.log('  Skipping: requires at least 1 provider');
          return;
        }

        const validProvider = availableProviderIds[0];

        // Add an invalid provider to test error handling
        const invalidProvider = new AnthropicProvider(
          'sk-invalid-key-12345',
          'claude-sonnet-4-20250514'
        );
        providers.set('invalid', invalidProvider);

        try {
          const orchestrator = createOrchestrator(`
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

          console.log('\n--- Test: Error Handling ---');

          const result = await orchestrator.dispatch({
            agentType: 'codebase-analyzer',
            stage: 'planning',
            request: {
              prompt: 'Say "resilience test passed"',
              maxTokens: 30,
              temperature: 0,
            },
          });

          // Should still succeed with valid provider
          expect(result.synthesis).toBeDefined();
          expect(result.synthesis.length).toBeGreaterThan(0);

          console.log('  ✓ Gracefully handled provider failure');
        } finally {
          // Remove invalid provider
          providers.delete('invalid');
        }
      },
      TEST_TIMEOUT
    );

    it(
      'should fallback to single mode when council quorum not met',
      async () => {
        const availableProviderIds = Array.from(providers.keys());
        if (availableProviderIds.length < 1) {
          console.log('  Skipping: requires at least 1 provider');
          return;
        }

        const singleProvider = availableProviderIds[0];

        const orchestrator = createOrchestrator(`
enabled: true
defaultMode: council
quorum: 10
providers:
  - providerId: ${singleProvider}
    enabled: true
stages:
  planning: true
`);

        console.log('\n--- Test: Quorum Fallback ---');

        const result = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'planning',
          request: {
            prompt: 'Say "fallback works"',
            maxTokens: 20,
            temperature: 0,
          },
        });

        // Should fallback to single mode
        expect(result.mode).toBe('single');
        expect(result.synthesis).toBeDefined();

        console.log(`  ✓ Correctly fell back to single mode (quorum: 10, available: 1)`);
      },
      TEST_TIMEOUT
    );
  });

  describe('Usage Tracking and Metrics', () => {
    it(
      'should accurately track token usage across providers',
      async () => {
        const availableProviderIds = Array.from(providers.keys());

        const providerConfigLines = availableProviderIds
          .map((id) => `  - providerId: ${id}\n    enabled: true`)
          .join('\n');

        const orchestrator = createOrchestrator(`
enabled: true
defaultMode: council
quorum: 1
providers:
${providerConfigLines}
stages:
  analysis: true
`);

        console.log('\n--- Test: Usage Tracking ---');

        const result = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'analysis',
          request: {
            prompt: 'Count from 1 to 5',
            maxTokens: 50,
            temperature: 0,
          },
        });

        // Verify usage metrics
        expect(result.usage).toBeDefined();
        expect(result.usage!.totalTokensInput).toBeGreaterThan(0);
        expect(result.usage!.totalTokensOutput).toBeGreaterThan(0);

        if (result.mode === 'council' && result.usage!.providerBreakdown) {
          const breakdown = result.usage!.providerBreakdown;
          console.log('  Provider breakdown:');
          for (const [providerId, metrics] of Object.entries(breakdown)) {
            console.log(`    ${providerId}: ${metrics.tokens} tokens`);
          }
        }

        // Verify usage was logged
        expect(fs.existsSync(logPath)).toBe(true);
        const logContent = fs.readFileSync(logPath, 'utf-8');
        const logLines = logContent.split('\n').filter((l) => l.trim());
        expect(logLines.length).toBeGreaterThanOrEqual(1);

        // Parse and validate log entry
        const lastEntry = JSON.parse(logLines[logLines.length - 1]);
        expect(lastEntry.tokensInput).toBeGreaterThan(0);
        expect(lastEntry.tokensOutput).toBeGreaterThan(0);

        console.log(
          `  Total tokens: ${result.usage!.totalTokensInput + result.usage!.totalTokensOutput}`
        );
        console.log('  ✓ Usage tracking verified');
      },
      TEST_TIMEOUT
    );
  });

  describe('Real-World Codebase Analysis', () => {
    it.runIf(countAvailableProviders() >= 2)(
      'should analyze code with multiple perspectives',
      async () => {
        const availableProviderIds = Array.from(providers.keys());

        const providerConfigLines = availableProviderIds
          .map((id) => `  - providerId: ${id}\n    enabled: true`)
          .join('\n');

        const orchestrator = createOrchestrator(`
enabled: true
defaultMode: council
quorum: 2
peerReview: false
providers:
${providerConfigLines}
stages:
  analysis: true
`);

        console.log('\n--- Test: Multi-Perspective Analysis ---');

        const result = await orchestrator.dispatch({
          agentType: 'codebase-analyzer',
          stage: 'analysis',
          request: {
            prompt: `Review this function for potential improvements:

\`\`\`typescript
async function processItems(items: any[]) {
  let results = [];
  for (let i = 0; i < items.length; i++) {
    const result = await fetch('/api/process', {
      method: 'POST',
      body: JSON.stringify(items[i])
    });
    results.push(await result.json());
  }
  return results;
}
\`\`\`

Identify the top 2 issues.`,
            maxTokens: 400,
            temperature: 0.2,
          },
        });

        expect(result.mode).toBe('council');
        expect(result.session).toBeDefined();
        expect(result.session!.members.length).toBeGreaterThanOrEqual(2);

        // Should identify common issues
        const synthesis = result.synthesis.toLowerCase();
        expect(
          synthesis.includes('any') ||
            synthesis.includes('type') ||
            synthesis.includes('parallel') ||
            synthesis.includes('sequential') ||
            synthesis.includes('batch')
        ).toBe(true);

        console.log(`  Received ${result.session!.members.length} provider perspectives`);
        console.log('  ✓ Multi-perspective analysis completed');
      },
      TEST_TIMEOUT
    );
  });
});

// Summary test that always runs
describe('Council E2E Summary', () => {
  it('should report available providers', () => {
    const available: string[] = [];
    if (hasApiKey('ANTHROPIC_API_KEY')) {
      available.push('Anthropic');
    }
    if (hasApiKey('GOOGLE_API_KEY')) {
      available.push('Google');
    }
    if (hasApiKey('OPENAI_API_KEY')) {
      available.push('OpenAI');
    }

    console.log('\n=== Council E2E Test Summary ===');
    console.log(`Available providers: ${available.length > 0 ? available.join(', ') : 'None'}`);

    if (available.length === 0) {
      console.log('Set ANTHROPIC_API_KEY, GOOGLE_API_KEY, or OPENAI_API_KEY to run E2E tests');
    } else {
      console.log(`Tests will run with ${available.length} provider(s)`);
    }

    expect(true).toBe(true); // Always passes
  });
});
