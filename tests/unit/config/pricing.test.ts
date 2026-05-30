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
      expect(rates).toEqual({
        input: 0.003,
        cachedInput: 0.0003,
        cacheWrite: 0.00375,
        output: 0.015,
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return exact pricing for gpt-4-turbo', () => {
      const rates = getPricingForModel('gpt-4-turbo', 'openai');
      expect(rates).toEqual({ input: 0.01, output: 0.03 });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return exact pricing for current Gemini Flash-Lite', () => {
      const rates = getPricingForModel('gemini-3.1-flash-lite', 'google');
      expect(rates).toEqual({
        input: 0.00025,
        cachedInput: 0.000025,
        cacheStoragePerHour: 0.001,
        output: 0.0015,
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Prefix match', () => {
    it('should match dated variant claude-sonnet-4-5-20250929', () => {
      const rates = getPricingForModel('claude-sonnet-4-5-20250929', 'anthropic');
      expect(rates).toMatchObject({ input: 0.003, output: 0.015 });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Pricing] Using prefix match: claude-sonnet-4-5-20250929 -> claude-sonnet-4-5'
      );
    });

    it('should match gpt-4o-2024-05-13 variant', () => {
      const rates = getPricingForModel('gpt-4o-2024-05-13', 'openai');
      expect(rates).toMatchObject({ input: 0.0025, output: 0.01 });
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Fallback to provider default', () => {
    it('should fallback to claude-haiku-4-5 for unknown Anthropic model', () => {
      const rates = getPricingForModel('unknown-anthropic-model', 'anthropic');
      expect(rates).toMatchObject({ input: 0.001, output: 0.005 });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Pricing] Model unknown-anthropic-model not found, using default for anthropic: claude-haiku-4-5'
      );
    });

    it('should fallback to gpt-5.4-mini for unknown OpenAI model', () => {
      const rates = getPricingForModel('unknown-openai-model', 'openai');
      expect(rates).toMatchObject({ input: 0.00075, output: 0.0045 });
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Ultimate fallback to provider rates', () => {
    it('should fallback to provider rates for unknown provider', () => {
      const rates = getPricingForModel('unknown-model', 'unknown-provider');
      // Should use DEFAULT_PROVIDER (anthropic) rates
      expect(rates).toMatchObject({ input: 0.001, output: 0.005 });
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
      expect(cost).toBe(0.35);
    });

    it('should calculate cost using provider-level rates for OpenAI', () => {
      const cost = calculateCost(100000, 50000, 'openai');
      expect(cost).toBe(0.3);
    });

    it('should use default provider when no provider specified', () => {
      const cost = calculateCost(100000, 50000);
      // Should use DEFAULT_PROVIDER (anthropic)
      expect(cost).toBe(0.35);
    });
  });

  describe('Model-specific pricing (with modelId)', () => {
    it('should calculate cost using model-specific rates for Haiku 3.5', () => {
      const cost = calculateCost(100000, 50000, 'anthropic', 'claude-haiku-3-5');
      expect(cost).toBe(0.28);
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

    it('should price cached reads and cache writes separately', () => {
      const cost = calculateCost(100000, 50000, 'anthropic', 'claude-haiku-4-5', {
        cacheReadTokens: 100000,
        cacheWriteTokens: 100000,
      });

      expect(cost).toBeCloseTo(0.485);
    });
  });

  describe('Cost differences between models', () => {
    it('should show GPT nano is materially cheaper than GPT flagship', () => {
      const flagshipCost = calculateCost(100000, 50000, 'openai', 'gpt-5.4');
      const nanoCost = calculateCost(100000, 50000, 'openai', 'gpt-5.4-nano');
      const ratio = flagshipCost / nanoCost;
      expect(ratio).toBeGreaterThan(10);
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
    expect(MODEL_PRICING['gpt-5.4']).toBeDefined();
    expect(MODEL_PRICING['gpt-5.4-mini']).toBeDefined();
    expect(MODEL_PRICING['gpt-5.4-nano']).toBeDefined();
    expect(MODEL_PRICING['gpt-5.3-codex']).toBeDefined();
    expect(MODEL_PRICING['gpt-4']).toBeDefined();
    expect(MODEL_PRICING['gpt-4-turbo']).toBeDefined();
    expect(MODEL_PRICING['gpt-4o']).toBeDefined();
    expect(MODEL_PRICING['gpt-3.5-turbo']).toBeDefined();
    expect(MODEL_PRICING['o1']).toBeDefined();
    expect(MODEL_PRICING['o1-mini']).toBeDefined();
  });

  it('should have all required Google models', () => {
    expect(MODEL_PRICING['gemini-3.5-flash']).toBeDefined();
    expect(MODEL_PRICING['gemini-3.1-flash-lite']).toBeDefined();
    expect(MODEL_PRICING['gemini-3-flash-preview']).toBeDefined();
    expect(MODEL_PRICING['gemini-3.1-pro-preview']).toBeDefined();
    expect(MODEL_PRICING['gemini-2.5-flash-lite']).toBeDefined();
    expect(MODEL_PRICING['gemini-2.5-flash']).toBeDefined();
    expect(MODEL_PRICING['gemini-2.5-pro']).toBeDefined();
    expect(MODEL_PRICING['gemini-1.5-pro']).toBeDefined();
    expect(MODEL_PRICING['gemini-1.5-flash']).toBeDefined();
    expect(MODEL_PRICING['gemini-pro']).toBeDefined();
  });

  it('should have DEFAULT_MODELS for each provider', () => {
    expect(DEFAULT_MODELS.anthropic).toBe('claude-haiku-4-5');
    expect(DEFAULT_MODELS.openai).toBe('gpt-5.4-mini');
    expect(DEFAULT_MODELS.google).toBe('gemini-3.1-flash-lite');
  });
});
