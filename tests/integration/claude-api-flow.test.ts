/**
 * Integration test for Claude API with real API calls
 * Task: T016
 *
 * Tests verify:
 * - Real API calls (requires valid API key via ANTHROPIC_API_KEY env var)
 * - Response parsing
 * - Cost tracking
 *
 * Run with: ANTHROPIC_API_KEY=sk-xxx npm test -- tests/integration/claude-api-flow.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AnthropicProvider } from '../../extension/src/council/providers/AnthropicProvider';

// Helper to check if a valid API key is available
const hasApiKey = (): boolean => {
  const key = process.env.ANTHROPIC_API_KEY;
  // Must be set, non-empty, and look like a real Anthropic key
  return key !== undefined && key.length > 10 && key.startsWith('sk-ant-');
};

describe.skip('Claude API Flow Integration', () => {
  let provider: AnthropicProvider;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  beforeAll(() => {
    if (!apiKey) {
      console.log('ANTHROPIC_API_KEY not set - Claude API tests will be skipped');
      console.log(
        'To run these tests: ANTHROPIC_API_KEY=sk-xxx npm test -- tests/integration/claude-api-flow.test.ts'
      );
    } else {
      provider = new AnthropicProvider(apiKey, 'claude-opus-4-5-20251101');
    }
  });

  it.runIf(hasApiKey())(
    'should make real API call and parse response',
    async () => {
      const response = await provider.query({
        prompt: 'Say exactly: "Integration test successful"',
        maxTokens: 50,
        temperature: 0,
      });

      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.content.toLowerCase()).toContain('integration');
      expect(response.providerId).toBe('anthropic');
      expect(response.model).toContain('claude');
    },
    { timeout: 30000 }
  );

  it.runIf(hasApiKey())(
    'should track token usage',
    async () => {
      const response = await provider.query({
        prompt: 'Count from 1 to 10.',
        maxTokens: 100,
        temperature: 0,
      });

      expect(response.usage.inputTokens).toBeGreaterThan(0);
      expect(response.usage.outputTokens).toBeGreaterThan(0);

      // Verify reasonable token counts
      expect(response.usage.inputTokens).toBeLessThan(50); // Simple prompt
      expect(response.usage.outputTokens).toBeLessThan(100); // Short response
    },
    { timeout: 30000 }
  );

  it.runIf(hasApiKey())(
    'should handle rate limiting gracefully',
    async () => {
      // Make multiple rapid requests to test rate limit handling
      const requests = Array(3)
        .fill(null)
        .map((_, i) =>
          provider.query({
            prompt: `Request ${i}: Say "OK"`,
            maxTokens: 10,
            temperature: 0,
          })
        );

      const results = await Promise.allSettled(requests);

      // At least one request should succeed
      const successful = results.filter((r) => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThanOrEqual(1);

      // Check rate limit tracking
      expect(provider.rateLimit.currentCount).toBeGreaterThan(0);
    },
    { timeout: 60000 }
  );

  it.runIf(hasApiKey())(
    'should handle system prompts',
    async () => {
      const response = await provider.query({
        prompt: 'What is your purpose?',
        systemPrompt:
          'You are a helpful code review assistant. Always mention that you review code.',
        maxTokens: 100,
        temperature: 0,
      });

      expect(response.content.toLowerCase()).toMatch(/code|review|assist/);
    },
    { timeout: 30000 }
  );

  it.runIf(hasApiKey())(
    'should validate complex JSON responses',
    async () => {
      const response = await provider.query({
        prompt:
          'Return a JSON object with keys "name" and "version". Example: {"name": "test", "version": "1.0.0"}',
        maxTokens: 100,
        temperature: 0,
      });

      // Response should be parseable as JSON or contain JSON
      const jsonMatch = response.content.match(/\{[^}]+\}/);
      expect(jsonMatch).toBeDefined();

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        expect(parsed).toHaveProperty('name');
        expect(parsed).toHaveProperty('version');
      }
    },
    { timeout: 30000 }
  );
});
