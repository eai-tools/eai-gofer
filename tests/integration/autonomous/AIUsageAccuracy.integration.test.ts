/**
 * Integration Test: AI Usage Accuracy (T010)
 *
 * Verifies that model-specific pricing is applied correctly end-to-end,
 * fixing the 40-1100% cost calculation errors from Bug #2/#3.
 *
 * This test exercises REAL calculateCost() with model-specific rates,
 * NOT provider-level rates, proving the bug fix works.
 */

import { describe, it, expect } from 'vitest';
import { calculateCost } from '../../../extension/src/config/pricing';

describe('AIUsageAccuracy Integration Test', () => {
  describe('Bug #3 Fix: Model-specific pricing vs provider-level', () => {
    it('Haiku 3.5 should cost $0.0875, not $0.45 (provider-level)', () => {
      // Bug #3: Using provider-level anthropic rates ($3/$15 per million)
      // 100K input + 50K output = (100K * 0.003 + 50K * 0.015) / 1000 = $1.05
      //
      // Fix: Using model-specific Haiku 3.5 rates ($0.25/$1.25 per million)
      // 100K input + 50K output = (100K * 0.00025 + 50K * 0.00125) / 1000 = $0.0875

      const inputTokens = 100_000;
      const outputTokens = 50_000;
      const providerId = 'anthropic';
      const modelId = 'claude-haiku-3-5';

      const cost = calculateCost(inputTokens, outputTokens, providerId, modelId);

      // Should be $0.0875 (model-specific), not $1.05 (provider-level)
      expect(cost).toBe(0.0875);
      expect(cost).not.toBe(1.05); // Verify NOT using provider-level rates

      // Verify 12x cost reduction
      const providerLevelCost = calculateCost(inputTokens, outputTokens, providerId);
      const savingsRatio = providerLevelCost / cost;
      expect(savingsRatio).toBeCloseTo(12, 0); // 1.05 / 0.0875 = 12
    });

    it('Opus 4.6 should cost $1.75 (not $1.05 provider-level)', () => {
      // Opus 4.6: $5/$25 per million tokens
      // 100K input + 50K output = (100K * 0.005 + 50K * 0.025) / 1000 = $1.75

      const inputTokens = 100_000;
      const outputTokens = 50_000;
      const providerId = 'anthropic';
      const modelId = 'claude-opus-4-6';

      const cost = calculateCost(inputTokens, outputTokens, providerId, modelId);

      expect(cost).toBe(1.75); // Model-specific Opus rate
      expect(cost).not.toBe(1.05); // NOT provider-level rate

      // Verify Opus is ~1.67x MORE expensive than provider-level
      const providerLevelCost = calculateCost(inputTokens, outputTokens, providerId);
      const costRatio = cost / providerLevelCost;
      expect(costRatio).toBeCloseTo(1.67, 1); // 1.75 / 1.05 ≈ 1.67
    });

    it('Sonnet 4.5 should match provider-level (both $3/$15)', () => {
      // Sonnet 4.5: $3/$15 per million (same as provider-level default)
      // 100K input + 50K output = $1.05

      const inputTokens = 100_000;
      const outputTokens = 50_000;
      const providerId = 'anthropic';
      const modelId = 'claude-sonnet-4-5';

      const cost = calculateCost(inputTokens, outputTokens, providerId, modelId);

      expect(cost).toBe(1.05);

      // Should equal provider-level (Sonnet is the default)
      const providerLevelCost = calculateCost(inputTokens, outputTokens, providerId);
      expect(cost).toBe(providerLevelCost);
    });
  });

  describe('Bug #2 Fix: Model detection from logs', () => {
    it('GPT-4-turbo should cost less than GPT-4', () => {
      // GPT-4: $30/$60 per million
      // GPT-4-turbo: $10/$30 per million
      // 100K input + 50K output:
      //   GPT-4: (100K * 0.03 + 50K * 0.06) / 1000 = $6.00
      //   GPT-4-turbo: (100K * 0.01 + 50K * 0.03) / 1000 = $2.50

      const inputTokens = 100_000;
      const outputTokens = 50_000;
      const providerId = 'openai';

      const gpt4Cost = calculateCost(inputTokens, outputTokens, providerId, 'gpt-4');
      const gpt4TurboCost = calculateCost(inputTokens, outputTokens, providerId, 'gpt-4-turbo');

      expect(gpt4Cost).toBe(6.0);
      expect(gpt4TurboCost).toBe(2.5);
      expect(gpt4TurboCost).toBeLessThan(gpt4Cost);

      // GPT-4-turbo is 2.4x cheaper
      const savingsRatio = gpt4Cost / gpt4TurboCost;
      expect(savingsRatio).toBeCloseTo(2.4, 1);
    });

    it('Gemini 1.5 Flash should be extremely cheap', () => {
      // Gemini 1.5 Flash: $0.075/$0.30 per million (cheapest model)
      // 100K input + 50K output = (100K * 0.000075 + 50K * 0.0003) / 1000 = $0.0225

      const inputTokens = 100_000;
      const outputTokens = 50_000;
      const providerId = 'google';
      const modelId = 'gemini-1.5-flash';

      const cost = calculateCost(inputTokens, outputTokens, providerId, modelId);

      expect(cost).toBeCloseTo(0.0225, 4); // Use toBeCloseTo for floating-point precision

      // Should be ~47x cheaper than Anthropic provider-level
      const anthropicCost = calculateCost(inputTokens, outputTokens, 'anthropic');
      const savingsRatio = anthropicCost / cost;
      expect(savingsRatio).toBeCloseTo(46.67, 0); // 1.05 / 0.0225 ≈ 46.67
    });
  });

  describe('Prefix matching for dated model variants', () => {
    it('claude-sonnet-4-5-20250929 should match claude-sonnet-4-5 rates', () => {
      const inputTokens = 100_000;
      const outputTokens = 50_000;
      const providerId = 'anthropic';

      const baseCost = calculateCost(inputTokens, outputTokens, providerId, 'claude-sonnet-4-5');
      const datedCost = calculateCost(inputTokens, outputTokens, providerId, 'claude-sonnet-4-5-20250929');

      expect(datedCost).toBe(baseCost);
      expect(datedCost).toBe(1.05);
    });

    it('gpt-4o-2024-05-13 should match gpt-4o rates', () => {
      const inputTokens = 100_000;
      const outputTokens = 50_000;
      const providerId = 'openai';

      const baseCost = calculateCost(inputTokens, outputTokens, providerId, 'gpt-4o');
      const datedCost = calculateCost(inputTokens, outputTokens, providerId, 'gpt-4o-2024-05-13');

      expect(datedCost).toBe(baseCost);
      expect(datedCost).toBe(1.25); // $5/$15 per million
    });
  });

  describe('Backward compatibility (no modelId)', () => {
    it('calculateCost without modelId should use provider-level rates', () => {
      const inputTokens = 100_000;
      const outputTokens = 50_000;

      // Without modelId, should use provider-level default rates
      const anthropicCost = calculateCost(inputTokens, outputTokens, 'anthropic');
      const openaiCost = calculateCost(inputTokens, outputTokens, 'openai');
      const googleCost = calculateCost(inputTokens, outputTokens, 'google');

      expect(anthropicCost).toBe(1.05); // $3/$15 per million
      expect(openaiCost).toBe(1.25); // $5/$15 per million
      expect(googleCost).toBe(0.05); // $0.25/$0.50 per million
    });

    it('calculateCost without provider should default to anthropic', () => {
      const inputTokens = 100_000;
      const outputTokens = 50_000;

      const cost = calculateCost(inputTokens, outputTokens);

      expect(cost).toBe(1.05); // Anthropic default ($3/$15)
    });
  });

  describe('Cost accuracy validation', () => {
    it('All Claude models should calculate correctly', () => {
      const inputTokens = 100_000;
      const outputTokens = 50_000;

      const costs = {
        'claude-opus-4-6': calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-opus-4-6'),
        'claude-opus-4-5': calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-opus-4-5'),
        'claude-sonnet-4-5': calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-sonnet-4-5'),
        'claude-sonnet-4': calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-sonnet-4'),
        'claude-haiku-4-5': calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-haiku-4-5'),
        'claude-haiku-3-5': calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-haiku-3-5'),
      };

      // Verify expected costs (from pricing.ts)
      expect(costs['claude-opus-4-6']).toBe(1.75); // $5/$25
      expect(costs['claude-opus-4-5']).toBe(1.75); // $5/$25
      expect(costs['claude-sonnet-4-5']).toBe(1.05); // $3/$15
      expect(costs['claude-sonnet-4']).toBe(1.05); // $3/$15
      expect(costs['claude-haiku-4-5']).toBe(0.35); // $1/$5
      expect(costs['claude-haiku-3-5']).toBe(0.0875); // $0.25/$1.25

      // Verify price ordering: Haiku < Sonnet < Opus
      expect(costs['claude-haiku-3-5']).toBeLessThan(costs['claude-haiku-4-5']);
      expect(costs['claude-haiku-4-5']).toBeLessThan(costs['claude-sonnet-4']);
      expect(costs['claude-sonnet-4-5']).toBeLessThan(costs['claude-opus-4-5']);
    });

    it('All OpenAI models should calculate correctly', () => {
      const inputTokens = 100_000;
      const outputTokens = 50_000;

      const costs = {
        'gpt-4': calculateCost(inputTokens, outputTokens, 'openai', 'gpt-4'),
        'gpt-4-turbo': calculateCost(inputTokens, outputTokens, 'openai', 'gpt-4-turbo'),
        'gpt-4o': calculateCost(inputTokens, outputTokens, 'openai', 'gpt-4o'),
        'gpt-3.5-turbo': calculateCost(inputTokens, outputTokens, 'openai', 'gpt-3.5-turbo'),
        'o1': calculateCost(inputTokens, outputTokens, 'openai', 'o1'),
        'o1-mini': calculateCost(inputTokens, outputTokens, 'openai', 'o1-mini'),
      };

      // Verify expected costs
      expect(costs['gpt-4']).toBe(6.0); // $30/$60
      expect(costs['gpt-4-turbo']).toBe(2.5); // $10/$30
      expect(costs['gpt-4o']).toBe(1.25); // $5/$15
      expect(costs['gpt-3.5-turbo']).toBe(0.125); // $0.50/$1.50
      expect(costs['o1']).toBe(4.5); // $15/$60
      expect(costs['o1-mini']).toBe(0.9); // $3/$12

      // Verify price ordering
      expect(costs['gpt-3.5-turbo']).toBeLessThan(costs['gpt-4o']);
      expect(costs['gpt-4o']).toBeLessThan(costs['gpt-4-turbo']);
      expect(costs['gpt-4-turbo']).toBeLessThan(costs['gpt-4']);
    });
  });
});
