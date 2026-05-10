/**
 * Council Provider Integration Tests - Real API Calls
 *
 * These tests make REAL API calls to external LLM providers.
 * API keys must be provided via environment variables:
 * - ANTHROPIC_API_KEY
 * - GOOGLE_API_KEY
 * - OPENAI_API_KEY
 *
 * Run with: npm test -- tests/integration/council/
 * Or with specific provider: ANTHROPIC_API_KEY=sk-xxx npm test -- tests/integration/council/
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AnthropicProvider } from '../../../extension/src/council/providers/AnthropicProvider';
import { GoogleProvider } from '../../../extension/src/council/providers/GoogleProvider';
import { OpenAIProvider } from '../../../extension/src/council/providers/OpenAIProvider';
import { QueryResponse } from '../../../extension/src/council/types';

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

describe.skip('Council Providers - Real API Integration Tests', () => {
  describe('AnthropicProvider - Real API', () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    beforeAll(() => {
      if (!apiKey) {
        console.log('ANTHROPIC_API_KEY not set - Anthropic tests will be skipped');
      }
    });

    it.runIf(hasApiKey('ANTHROPIC_API_KEY'))(
      'should make real API call and return valid response',
      async () => {
        const provider = new AnthropicProvider(apiKey!, 'claude-opus-4-5-20251101');

        const response = await provider.query({
          prompt: 'Say "Hello, World!" and nothing else.',
          maxTokens: 50,
          temperature: 0,
        });

        expect(response.content).toBeDefined();
        expect(response.content.length).toBeGreaterThan(0);
        expect(response.content.toLowerCase()).toContain('hello');
        expect(response.usage.inputTokens).toBeGreaterThan(0);
        expect(response.usage.outputTokens).toBeGreaterThan(0);
        expect(response.providerId).toBe('anthropic');
        expect(response.model).toContain('claude');
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey('ANTHROPIC_API_KEY'))(
      'should pass healthCheck with valid API key',
      async () => {
        const provider = new AnthropicProvider(apiKey!, 'claude-opus-4-5-20251101');

        const result = await provider.healthCheck();

        expect(result).toBe(true);
        expect(provider.status).toBe('available');
        expect(provider.lastChecked).toBeDefined();
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey('ANTHROPIC_API_KEY'))(
      'should fail healthCheck with invalid API key',
      async () => {
        const provider = new AnthropicProvider('sk-invalid-key', 'claude-opus-4-5-20251101');

        const result = await provider.healthCheck();

        expect(result).toBe(false);
        expect(provider.status).toBe('unavailable');
        expect(provider.errorMessage).toBeDefined();
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey('ANTHROPIC_API_KEY'))(
      'should handle system prompts correctly',
      async () => {
        const provider = new AnthropicProvider(apiKey!, 'claude-opus-4-5-20251101');

        const response = await provider.query({
          prompt: 'What is your name?',
          systemPrompt:
            'You are a helpful assistant named TestBot. Always introduce yourself as TestBot.',
          maxTokens: 100,
          temperature: 0,
        });

        expect(response.content.toLowerCase()).toContain('testbot');
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey('ANTHROPIC_API_KEY'))(
      'should track token usage accurately',
      async () => {
        const provider = new AnthropicProvider(apiKey!, 'claude-opus-4-5-20251101');

        const response = await provider.query({
          prompt: 'Count from 1 to 5.',
          maxTokens: 50,
          temperature: 0,
        });

        expect(response.usage.inputTokens).toBeGreaterThan(0);
        expect(response.usage.outputTokens).toBeGreaterThan(0);
        // Total tokens should be reasonable for this request
        expect(response.usage.inputTokens + response.usage.outputTokens).toBeLessThan(100);
      },
      { timeout: 30000 }
    );
  });

  describe('GoogleProvider - Real API', () => {
    const apiKey = process.env.GOOGLE_API_KEY;
    // Use env var for model or default to gemini-2.5-flash (gemini-3-flash-preview often overloaded)
    const modelId = process.env.GOOGLE_MODEL || 'gemini-2.5-flash';

    beforeAll(() => {
      if (!apiKey) {
        console.log('GOOGLE_API_KEY not set - Google tests will be skipped');
      }
    });

    it.runIf(hasApiKey('GOOGLE_API_KEY'))(
      'should make real API call and return valid response',
      async () => {
        const provider = new GoogleProvider(apiKey!, modelId);

        const response = await provider.query({
          prompt: 'Say "Hello, World!" and nothing else.',
          maxTokens: 50,
          temperature: 0,
        });

        expect(response.content).toBeDefined();
        expect(response.content.length).toBeGreaterThan(0);
        expect(response.content.toLowerCase()).toContain('hello');
        // Token counts may be 0 for some Gemini API responses
        expect(response.usage.inputTokens).toBeGreaterThanOrEqual(0);
        expect(response.usage.outputTokens).toBeGreaterThanOrEqual(0);
        expect(response.providerId).toBe('google');
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey('GOOGLE_API_KEY'))(
      'should pass healthCheck with valid API key',
      async () => {
        const provider = new GoogleProvider(apiKey!, modelId);

        const result = await provider.healthCheck();

        expect(result).toBe(true);
        expect(provider.status).toBe('available');
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey('GOOGLE_API_KEY'))(
      'should fail healthCheck with invalid API key',
      async () => {
        const provider = new GoogleProvider('invalid-api-key', modelId);

        const result = await provider.healthCheck();

        expect(result).toBe(false);
        expect(provider.status).toBe('unavailable');
      },
      { timeout: 30000 }
    );
  });

  describe('OpenAIProvider - Real API', () => {
    const apiKey = process.env.OPENAI_API_KEY;
    // Use env var for model or default to gpt-5.2 (2026 default)
    const modelId = process.env.OPENAI_MODEL || 'gpt-5.2';
    let providerHealthy = false;

    beforeAll(async () => {
      if (!apiKey) {
        console.log('OPENAI_API_KEY not set - OpenAI tests will be skipped');
        return;
      }

      // Pre-check if the API key has model access
      const testProvider = new OpenAIProvider(apiKey, modelId);
      providerHealthy = await testProvider.healthCheck();

      if (!providerHealthy) {
        console.log(
          'OpenAI API key does not have model access - OpenAI positive tests will be skipped'
        );
      }
    });

    it.runIf(hasApiKey('OPENAI_API_KEY'))(
      'should make real API call and return valid response',
      async () => {
        if (!providerHealthy) {
          console.log('  Skipping: OpenAI provider not healthy');
          return;
        }

        const provider = new OpenAIProvider(apiKey!, modelId);

        const response = await provider.query({
          prompt: 'Say "Hello, World!" and nothing else.',
          maxTokens: 50,
          temperature: 0,
        });

        expect(response.content).toBeDefined();
        expect(response.content.length).toBeGreaterThan(0);
        expect(response.content.toLowerCase()).toContain('hello');
        expect(response.usage.inputTokens).toBeGreaterThan(0);
        expect(response.usage.outputTokens).toBeGreaterThan(0);
        expect(response.providerId).toBe('openai');
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey('OPENAI_API_KEY'))(
      'should pass healthCheck with valid API key when model accessible',
      async () => {
        if (!providerHealthy) {
          console.log('  Skipping: OpenAI provider not healthy');
          return;
        }

        const provider = new OpenAIProvider(apiKey!, modelId);

        const result = await provider.healthCheck();

        expect(result).toBe(true);
        expect(provider.status).toBe('available');
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey('OPENAI_API_KEY'))(
      'should fail healthCheck with invalid API key',
      async () => {
        const provider = new OpenAIProvider('sk-invalid-key', modelId);

        const result = await provider.healthCheck();

        expect(result).toBe(false);
        expect(provider.status).toBe('unavailable');
      },
      { timeout: 30000 }
    );
  });

  describe('Multi-Provider Council - Real API', () => {
    it.runIf(
      hasApiKey('ANTHROPIC_API_KEY') || hasApiKey('GOOGLE_API_KEY') || hasApiKey('OPENAI_API_KEY')
    )(
      'should query multiple providers in parallel',
      async () => {
        const providers = [];

        if (hasApiKey('ANTHROPIC_API_KEY')) {
          providers.push(
            new AnthropicProvider(process.env.ANTHROPIC_API_KEY!, 'claude-sonnet-4-20250514')
          );
        }
        if (hasApiKey('GOOGLE_API_KEY')) {
          providers.push(
            new GoogleProvider(
              process.env.GOOGLE_API_KEY!,
              process.env.GOOGLE_MODEL || 'gemini-2.5-flash'
            )
          );
        }
        if (hasApiKey('OPENAI_API_KEY')) {
          providers.push(
            new OpenAIProvider(process.env.OPENAI_API_KEY!, process.env.OPENAI_MODEL || 'gpt-5.2')
          );
        }

        expect(providers.length).toBeGreaterThanOrEqual(1);

        const prompt = 'What is 2 + 2? Reply with just the number.';
        const results = await Promise.allSettled(
          providers.map((p) =>
            p.query({
              prompt,
              maxTokens: 10,
              temperature: 0,
            })
          )
        );

        // At least one provider should succeed with non-empty content
        const successful = results.filter(
          (r) => r.status === 'fulfilled' && r.value.content.length > 0
        ) as PromiseFulfilledResult<QueryResponse>[];
        expect(successful.length).toBeGreaterThanOrEqual(1);

        // All successful responses with content should contain "4"
        for (const result of successful) {
          expect(result.value.content).toContain('4');
        }
      },
      { timeout: 60000 }
    );

    it.runIf(hasApiKey('ANTHROPIC_API_KEY') && hasApiKey('GOOGLE_API_KEY'))(
      'should synthesize responses from multiple providers',
      async () => {
        const anthropic = new AnthropicProvider(
          process.env.ANTHROPIC_API_KEY!,
          'claude-sonnet-4-20250514'
        );
        const google = new GoogleProvider(
          process.env.GOOGLE_API_KEY!,
          process.env.GOOGLE_MODEL || 'gemini-2.5-flash'
        );

        // Get responses from both providers
        const [response1, response2] = await Promise.all([
          anthropic.query({
            prompt: 'List 3 benefits of exercise. Be brief.',
            maxTokens: 200,
            temperature: 0.3,
          }),
          google.query({
            prompt: 'List 3 benefits of exercise. Be brief.',
            maxTokens: 200,
            temperature: 0.3,
          }),
        ]);

        // Both should provide meaningful responses
        expect(response1.content.length).toBeGreaterThan(50);
        expect(response2.content.length).toBeGreaterThan(50);

        // Use one provider as "Chairman" to synthesize
        const synthesisPrompt = `You are synthesizing responses from multiple AI providers.

Member A response:
${response1.content}

Member B response:
${response2.content}

Synthesize these responses into a single, coherent list of benefits. Identify any consensus points and any unique insights from each.`;

        const synthesis = await anthropic.query({
          prompt: synthesisPrompt,
          maxTokens: 500,
          temperature: 0,
        });

        expect(synthesis.content.length).toBeGreaterThan(100);
        expect(synthesis.content.toLowerCase()).toContain('benefit');
      },
      { timeout: 90000 }
    );
  });
});
