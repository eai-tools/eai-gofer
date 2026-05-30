/**
 * Integration Test: Model Propagation
 *
 * Verifies that detected model identifiers flow through pricing lookup and
 * cost calculation with current cheap defaults and cache-aware rates.
 */

import { describe, expect, it } from 'vitest';
import { calculateCost, getPricingForModel } from '../../../extension/src/config/pricing';

describe('ModelPropagation Integration Test', () => {
  const inputTokens = 100_000;
  const outputTokens = 50_000;

  describe('getPricingForModel fallback hierarchy', () => {
    it('uses exact match for known current models', () => {
      expect(getPricingForModel('claude-haiku-4-5', 'anthropic')).toMatchObject({
        input: 0.001,
        cachedInput: 0.0001,
        output: 0.005,
      });

      expect(getPricingForModel('gpt-5.4-mini', 'openai')).toMatchObject({
        input: 0.00075,
        cachedInput: 0.000075,
        output: 0.0045,
      });

      expect(getPricingForModel('gemini-3.1-flash-lite', 'google')).toMatchObject({
        input: 0.00025,
        cachedInput: 0.000025,
        output: 0.0015,
      });
    });

    it('uses prefix match for dated variants', () => {
      const sonnetDated = getPricingForModel('claude-sonnet-4-5-20250929', 'anthropic');
      const sonnetBase = getPricingForModel('claude-sonnet-4-5', 'anthropic');
      expect(sonnetDated).toEqual(sonnetBase);

      const gpt4oDated = getPricingForModel('gpt-4o-2024-05-13', 'openai');
      const gpt4oBase = getPricingForModel('gpt-4o', 'openai');
      expect(gpt4oDated).toEqual(gpt4oBase);
    });

    it('falls back to cost-optimized DEFAULT_MODELS for unknown models', () => {
      expect(getPricingForModel('claude-unknown-xyz', 'anthropic')).toEqual(
        getPricingForModel('claude-haiku-4-5', 'anthropic')
      );

      expect(getPricingForModel('gpt-unknown', 'openai')).toEqual(
        getPricingForModel('gpt-5.4-mini', 'openai')
      );
    });

    it('falls back to the default provider rates for unknown providers', () => {
      expect(getPricingForModel('some-model', 'unknown-provider')).toMatchObject({
        input: 0.001,
        output: 0.005,
      });
    });
  });

  describe('calculateCost model propagation', () => {
    it('applies model-specific rates when modelId is provided', () => {
      const haiku = calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-haiku-4-5');
      const sonnet = calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-sonnet-4-5');
      const opus = calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-opus-4-6');

      expect(haiku).toBe(0.35);
      expect(sonnet).toBe(1.05);
      expect(opus).toBe(1.75);
      expect(opus / haiku).toBeCloseTo(5, 0);
    });

    it('applies provider-level cheap defaults when modelId is omitted', () => {
      expect(calculateCost(inputTokens, outputTokens, 'anthropic')).toBe(0.35);
      expect(calculateCost(inputTokens, outputTokens, 'openai')).toBe(0.3);
      expect(calculateCost(inputTokens, outputTokens, 'google')).toBe(0.1);
    });

    it('propagates modelId through getPricingForModel consistently', () => {
      const modelId = 'claude-haiku-4-5';
      const rates = getPricingForModel(modelId, 'anthropic');
      const expectedCost = (inputTokens * rates.input + outputTokens * rates.output) / 1000;

      expect(calculateCost(inputTokens, outputTokens, 'anthropic', modelId)).toBe(expectedCost);
      expect(expectedCost).toBe(0.35);
    });
  });

  describe('Cross-provider routing economics', () => {
    it('tracks costs correctly across cheap scout models', () => {
      const halfInput = 50_000;
      const halfOutput = 25_000;

      const haiku = calculateCost(halfInput, halfOutput, 'anthropic', 'claude-haiku-4-5');
      const gptNano = calculateCost(halfInput, halfOutput, 'openai', 'gpt-5.4-nano');
      const geminiLite = calculateCost(halfInput, halfOutput, 'google', 'gemini-3.1-flash-lite');

      expect(haiku).toBeCloseTo(0.175);
      expect(gptNano).toBeCloseTo(0.04125);
      expect(geminiLite).toBeCloseTo(0.05);
      expect(haiku + gptNano + geminiLite).toBeCloseTo(0.26625);
    });

    it('keeps longer prefix matching for gpt-4o versus gpt-4', () => {
      const gpt4o = calculateCost(inputTokens, outputTokens, 'openai', 'gpt-4o');
      const gpt4 = calculateCost(inputTokens, outputTokens, 'openai', 'gpt-4');

      expect(gpt4o).toBe(0.75);
      expect(gpt4).toBe(6.0);
      expect(gpt4).toBeGreaterThan(gpt4o);
    });

    it('calculates mixed-model session costs correctly', () => {
      const calls = [
        { model: 'claude-haiku-4-5', input: 50_000, output: 10_000, expectedCost: 0.1 },
        { model: 'claude-sonnet-4-5', input: 100_000, output: 50_000, expectedCost: 1.05 },
        { model: 'claude-haiku-4-5', input: 30_000, output: 5_000, expectedCost: 0.055 },
        { model: 'claude-opus-4-6', input: 80_000, output: 40_000, expectedCost: 1.4 },
      ];

      let totalCost = 0;
      for (const call of calls) {
        const cost = calculateCost(call.input, call.output, 'anthropic', call.model);
        expect(cost).toBeCloseTo(call.expectedCost, 4);
        totalCost += cost;
      }

      expect(totalCost).toBeCloseTo(2.605, 4);
    });
  });
});
