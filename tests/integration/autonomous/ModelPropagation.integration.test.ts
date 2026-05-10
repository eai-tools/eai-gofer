/**
 * Integration Test: Model Propagation (T016)
 *
 * Verifies that model information flows correctly through the pricing calculation:
 * Model detection → calculateCost() with modelId parameter
 *
 * This ensures Bug #2 fix (model detection) works end-to-end without VSCode dependencies.
 */

import { describe, it, expect } from 'vitest';
import { calculateCost, getPricingForModel } from '../../../extension/src/config/pricing';

describe('ModelPropagation Integration Test', () => {
  describe('getPricingForModel fallback hierarchy', () => {
    it('should use exact match for known models', () => {
      // Exact matches should return model-specific rates
      const haikuRates = getPricingForModel('claude-haiku-3-5', 'anthropic');
      expect(haikuRates).toEqual({ input: 0.00025, output: 0.00125 });

      const opusRates = getPricingForModel('claude-opus-4-6', 'anthropic');
      expect(opusRates).toEqual({ input: 0.005, output: 0.025 });

      const gpt4Rates = getPricingForModel('gpt-4-turbo', 'openai');
      expect(gpt4Rates).toEqual({ input: 0.01, output: 0.03 });
    });

    it('should use prefix match for dated variants', () => {
      // Dated variants should match base model via prefix
      const sonnetDated = getPricingForModel('claude-sonnet-4-5-20250929', 'anthropic');
      const sonnetBase = getPricingForModel('claude-sonnet-4-5', 'anthropic');
      expect(sonnetDated).toEqual(sonnetBase);

      const gpt4oDated = getPricingForModel('gpt-4o-2024-05-13', 'openai');
      const gpt4oBase = getPricingForModel('gpt-4o', 'openai');
      expect(gpt4oDated).toEqual(gpt4oBase);
    });

    it('should fallback to DEFAULT_MODELS for unknown model', () => {
      // Unknown model should fallback to provider default
      const unknownAnthropicRates = getPricingForModel('claude-unknown-xyz', 'anthropic');
      const defaultAnthropicRates = getPricingForModel('claude-sonnet-4-5', 'anthropic');
      expect(unknownAnthropicRates).toEqual(defaultAnthropicRates);

      const unknownOpenAIRates = getPricingForModel('gpt-unknown', 'openai');
      const defaultOpenAIRates = getPricingForModel('gpt-4-turbo', 'openai');
      expect(unknownOpenAIRates).toEqual(defaultOpenAIRates);
    });

    it('should fallback to provider rates for unknown provider', () => {
      // Unknown provider should fallback to DEFAULT_PROVIDER (anthropic)
      const unknownProviderRates = getPricingForModel('some-model', 'unknown-provider');
      const defaultProviderRates = getPricingForModel('claude-sonnet-4-5', 'anthropic');
      expect(unknownProviderRates).toEqual(defaultProviderRates);
    });
  });

  describe('calculateCost with modelId parameter', () => {
    it('should apply model-specific rates when modelId provided', () => {
      const inputTokens = 100_000;
      const outputTokens = 50_000;

      // Haiku 3.5 should use model-specific rate
      const haikuCost = calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-haiku-3-5');
      expect(haikuCost).toBe(0.0875);

      // Opus 4.6 should use model-specific rate
      const opusCost = calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-opus-4-6');
      expect(opusCost).toBe(1.75);

      // Model-specific rates differ significantly
      expect(opusCost / haikuCost).toBeCloseTo(20, 0); // Opus is 20x more expensive
    });

    it('should apply provider-level rates when modelId not provided', () => {
      const inputTokens = 100_000;
      const outputTokens = 50_000;

      // Without modelId, should use provider-level default
      const anthropicCost = calculateCost(inputTokens, outputTokens, 'anthropic');
      expect(anthropicCost).toBe(1.05);

      const openaiCost = calculateCost(inputTokens, outputTokens, 'openai');
      expect(openaiCost).toBe(1.25);
    });

    it('should propagate modelId through getPricingForModel', () => {
      // Verify calculateCost uses getPricingForModel internally
      const inputTokens = 100_000;
      const outputTokens = 50_000;
      const modelId = 'claude-haiku-3-5';

      // Get rates from getPricingForModel
      const rates = getPricingForModel(modelId, 'anthropic');
      const expectedCost = (inputTokens * rates.input + outputTokens * rates.output) / 1000;

      // Get cost from calculateCost
      const actualCost = calculateCost(inputTokens, outputTokens, 'anthropic', modelId);

      // Should be identical (proving modelId propagates correctly)
      expect(actualCost).toBe(expectedCost);
      expect(actualCost).toBe(0.0875);
    });
  });

  describe('Cross-provider model propagation', () => {
    it('should track costs correctly across different providers', () => {
      const inputTokens = 50_000;
      const outputTokens = 25_000;

      // Anthropic Haiku
      const haikuCost = calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-haiku-3-5');
      expect(haikuCost).toBeCloseTo(0.04375, 5);

      // OpenAI GPT-3.5-turbo
      const gpt35Cost = calculateCost(inputTokens, outputTokens, 'openai', 'gpt-3.5-turbo');
      expect(gpt35Cost).toBeCloseTo(0.0625, 4);

      // Google Gemini Flash
      const geminiCost = calculateCost(inputTokens, outputTokens, 'google', 'gemini-1.5-flash');
      expect(geminiCost).toBeCloseTo(0.01125, 5);

      // Cumulative tracking would sum these
      const totalCost = haikuCost + gpt35Cost + geminiCost;
      expect(totalCost).toBeCloseTo(0.1175, 4);
    });
  });

  describe('Model ID variations', () => {
    it('should handle multiple dated variants correctly', () => {
      const inputTokens = 100_000;
      const outputTokens = 50_000;

      // All these should match claude-sonnet-4-5
      const variants = [
        'claude-sonnet-4-5',
        'claude-sonnet-4-5-20250929',
        'claude-sonnet-4-5-20241215',
        'claude-sonnet-4-5-v2',
      ];

      const costs = variants.map((model) =>
        calculateCost(inputTokens, outputTokens, 'anthropic', model)
      );

      // All should have the same cost (1.05)
      costs.forEach((cost) => {
        expect(cost).toBe(1.05);
      });
    });

    it('should prefer longer prefix matches (gpt-4o vs gpt-4)', () => {
      const inputTokens = 100_000;
      const outputTokens = 50_000;

      // gpt-4o should match gpt-4o, not gpt-4
      const gpt4oCost = calculateCost(inputTokens, outputTokens, 'openai', 'gpt-4o');
      expect(gpt4oCost).toBe(1.25); // gpt-4o rate ($5/$15)

      // gpt-4 should match gpt-4
      const gpt4Cost = calculateCost(inputTokens, outputTokens, 'openai', 'gpt-4');
      expect(gpt4Cost).toBe(6.0); // gpt-4 rate ($30/$60)

      // Verify different models have different costs
      expect(gpt4Cost).toBeGreaterThan(gpt4oCost);
    });
  });

  describe('Cost accuracy with real-world usage patterns', () => {
    it('should calculate mixed-model session costs correctly', () => {
      // Simulate a real session with different models
      const calls = [
        { model: 'claude-haiku-3-5', input: 50_000, output: 10_000, expectedCost: 0.025 },
        { model: 'claude-sonnet-4-5', input: 100_000, output: 50_000, expectedCost: 1.05 },
        { model: 'claude-haiku-3-5', input: 30_000, output: 5_000, expectedCost: 0.013750 },
        { model: 'claude-opus-4-6', input: 80_000, output: 40_000, expectedCost: 1.4 },
      ];

      let totalCost = 0;
      for (const call of calls) {
        const cost = calculateCost(call.input, call.output, 'anthropic', call.model);
        expect(cost).toBeCloseTo(call.expectedCost, 4);
        totalCost += cost;
      }

      // Total session cost
      expect(totalCost).toBeCloseTo(2.48875, 4);
    });
  });
});
