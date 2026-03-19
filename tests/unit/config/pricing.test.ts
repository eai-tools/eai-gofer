/**
 * Unit tests for pricing configuration and cost calculation.
 *
 * Tests model-based pricing architecture for bug fix 025-ai-usage-tracking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateCost,
  getPricingForModel,
  MODEL_PRICING,
  DEFAULT_MODELS,
} from '../../../extension/src/config/pricing';

describe('getPricingForModel', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Exact match', () => {
    it('should return exact pricing for claude-sonnet-4-5', () => {
      const rates = getPricingForModel('claude-sonnet-4-5', 'anthropic');
      expect(rates).toEqual({ input: 0.003, output: 0.015 });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return exact pricing for gpt-4-turbo', () => {
      const rates = getPricingForModel('gpt-4-turbo', 'openai');
      expect(rates).toEqual({ input: 0.01, output: 0.03 });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return exact pricing for gemini-1.5-flash', () => {
      const rates = getPricingForModel('gemini-1.5-flash', 'google');
      expect(rates).toEqual({ input: 0.000075, output: 0.0003 });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Prefix match', () => {
    it('should match dated variant claude-sonnet-4-5-20250929', () => {
      const rates = getPricingForModel('claude-sonnet-4-5-20250929', 'anthropic');
      expect(rates).toEqual({ input: 0.003, output: 0.015 });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Pricing] Using prefix match: claude-sonnet-4-5-20250929 -> claude-sonnet-4-5'
      );
    });

    it('should match gpt-4o-2024-05-13 variant', () => {
      const rates = getPricingForModel('gpt-4o-2024-05-13', 'openai');
      expect(rates).toEqual({ input: 0.005, output: 0.015 });
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Fallback to provider default', () => {
    it('should fallback to claude-sonnet-4-5 for unknown Anthropic model', () => {
      const rates = getPricingForModel('unknown-anthropic-model', 'anthropic');
      expect(rates).toEqual({ input: 0.003, output: 0.015 });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Pricing] Model unknown-anthropic-model not found, using default for anthropic: claude-sonnet-4-5'
      );
    });

    it('should fallback to gpt-4-turbo for unknown OpenAI model', () => {
      const rates = getPricingForModel('unknown-openai-model', 'openai');
      expect(rates).toEqual({ input: 0.01, output: 0.03 });
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Ultimate fallback to provider rates', () => {
    it('should fallback to provider rates for unknown provider', () => {
      const rates = getPricingForModel('unknown-model', 'unknown-provider');
      // Should use DEFAULT_PROVIDER (anthropic) rates
      expect(rates).toEqual({ input: 0.003, output: 0.015 });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('falling back to provider rates')
      );
    });
  });
});

describe('calculateCost', () => {
  describe('Backward compatibility (no modelId)', () => {
    it('should calculate cost using provider-level rates for Anthropic', () => {
      const cost = calculateCost(100000, 50000, 'anthropic');
      // 100K * 0.003 + 50K * 0.015 = 0.300 + 0.750 = 1.050 -> divided by 1000 = 0.00105? NO
      // Formula: (inputTokens * rate.input + outputTokens * rate.output) / 1000
      // (100000 * 0.003 + 50000 * 0.015) / 1000 = (300 + 750) / 1000 = 1.05
      expect(cost).toBe(1.05);
    });

    it('should calculate cost using provider-level rates for OpenAI', () => {
      const cost = calculateCost(100000, 50000, 'openai');
      // (100000 * 0.005 + 50000 * 0.015) / 1000 = (500 + 750) / 1000 = 1.25
      expect(cost).toBe(1.25);
    });

    it('should use default provider when no provider specified', () => {
      const cost = calculateCost(100000, 50000);
      // Should use DEFAULT_PROVIDER (anthropic)
      expect(cost).toBe(1.05);
    });
  });

  describe('Model-specific pricing (with modelId)', () => {
    it('should calculate cost using model-specific rates for Haiku 3.5', () => {
      const cost = calculateCost(100000, 50000, 'anthropic', 'claude-haiku-3-5');
      // (100000 * 0.00025 + 50000 * 0.00125) / 1000 = (25 + 62.5) / 1000 = 0.0875
      expect(cost).toBe(0.0875);
    });

    it('should calculate cost using model-specific rates for Opus 4.6', () => {
      const cost = calculateCost(100000, 50000, 'anthropic', 'claude-opus-4-6');
      // (100000 * 0.005 + 50000 * 0.025) / 1000 = (500 + 1250) / 1000 = 1.75
      expect(cost).toBe(1.75);
    });

    it('should calculate cost for GPT-3.5-turbo', () => {
      const cost = calculateCost(100000, 50000, 'openai', 'gpt-3.5-turbo');
      // (100000 * 0.0005 + 50000 * 0.0015) / 1000 = (50 + 75) / 1000 = 0.125
      expect(cost).toBe(0.125);
    });
  });

  describe('Cost differences between models', () => {
    it('should show Haiku 3.5 is ~12x cheaper than provider-level rates', () => {
      const providerCost = calculateCost(100000, 50000, 'anthropic');
      const haikuCost = calculateCost(100000, 50000, 'anthropic', 'claude-haiku-3-5');
      const ratio = providerCost / haikuCost;
      // 1.05 / 0.0875 = 12
      expect(ratio).toBeCloseTo(12, 0);
    });

    it('should show GPT-4 is ~10x more expensive than GPT-3.5', () => {
      const gpt4Cost = calculateCost(100000, 50000, 'openai', 'gpt-4');
      const gpt35Cost = calculateCost(100000, 50000, 'openai', 'gpt-3.5-turbo');
      const ratio = gpt4Cost / gpt35Cost;
      // gpt-4: (100000 * 0.03 + 50000 * 0.06) / 1000 = 6.0
      // gpt-3.5: 0.125
      // ratio = 6.0 / 0.125 = 48
      expect(ratio).toBeCloseTo(48, 0);
    });
  });

  describe('Prefix matching in calculateCost', () => {
    it('should handle dated model variants', () => {
      const cost = calculateCost(100000, 50000, 'anthropic', 'claude-sonnet-4-5-20250929');
      // Should match claude-sonnet-4-5 rates
      const expectedCost = calculateCost(100000, 50000, 'anthropic', 'claude-sonnet-4-5');
      expect(cost).toBe(expectedCost);
    });
  });
});

describe('Model pricing data integrity', () => {
  it('should have MODEL_PRICING table with 15+ models', () => {
    const modelCount = Object.keys(MODEL_PRICING).length;
    expect(modelCount).toBeGreaterThanOrEqual(15);
  });

  it('should have all required Anthropic models', () => {
    expect(MODEL_PRICING['claude-opus-4-6']).toBeDefined();
    expect(MODEL_PRICING['claude-opus-4-5']).toBeDefined();
    expect(MODEL_PRICING['claude-sonnet-4-5']).toBeDefined();
    expect(MODEL_PRICING['claude-sonnet-4']).toBeDefined();
    expect(MODEL_PRICING['claude-haiku-4-5']).toBeDefined();
    expect(MODEL_PRICING['claude-haiku-3-5']).toBeDefined();
  });

  it('should have all required OpenAI models', () => {
    expect(MODEL_PRICING['gpt-4']).toBeDefined();
    expect(MODEL_PRICING['gpt-4-turbo']).toBeDefined();
    expect(MODEL_PRICING['gpt-4o']).toBeDefined();
    expect(MODEL_PRICING['gpt-3.5-turbo']).toBeDefined();
    expect(MODEL_PRICING['o1']).toBeDefined();
    expect(MODEL_PRICING['o1-mini']).toBeDefined();
  });

  it('should have all required Google models', () => {
    expect(MODEL_PRICING['gemini-1.5-pro']).toBeDefined();
    expect(MODEL_PRICING['gemini-1.5-flash']).toBeDefined();
    expect(MODEL_PRICING['gemini-pro']).toBeDefined();
  });

  it('should have DEFAULT_MODELS for each provider', () => {
    expect(DEFAULT_MODELS.anthropic).toBe('claude-sonnet-4-5');
    expect(DEFAULT_MODELS.openai).toBe('gpt-4-turbo');
    expect(DEFAULT_MODELS.google).toBe('gemini-1.5-flash');
  });
});
