/**
 * Integration Test: AI Usage Accuracy
 *
 * Verifies that current model-specific and cache-aware pricing is applied
 * end-to-end by calculateCost().
 */

import { describe, expect, it } from 'vitest';
import { calculateCost } from '../../../extension/src/config/pricing';

describe('AIUsageAccuracy Integration Test', () => {
  const inputTokens = 100_000;
  const outputTokens = 50_000;

  it('uses cost-optimized Anthropic provider defaults', () => {
    expect(calculateCost(inputTokens, outputTokens, 'anthropic')).toBe(0.35);
    expect(calculateCost(inputTokens, outputTokens)).toBe(0.35);
  });

  it('prices Claude model tiers with Haiku cheaper than Sonnet and Opus', () => {
    const haiku = calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-haiku-4-5');
    const sonnet = calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-sonnet-4-5');
    const opus = calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-opus-4-6');

    expect(haiku).toBe(0.35);
    expect(sonnet).toBe(1.05);
    expect(opus).toBe(1.75);
    expect(haiku).toBeLessThan(sonnet);
    expect(sonnet).toBeLessThan(opus);
  });

  it('prices OpenAI nano, mini, codex, and flagship models distinctly', () => {
    const nano = calculateCost(inputTokens, outputTokens, 'openai', 'gpt-5.4-nano');
    const mini = calculateCost(inputTokens, outputTokens, 'openai', 'gpt-5.4-mini');
    const codex = calculateCost(inputTokens, outputTokens, 'openai', 'gpt-5.3-codex');
    const flagship = calculateCost(inputTokens, outputTokens, 'openai', 'gpt-5.4');

    expect(nano).toBeCloseTo(0.0825);
    expect(mini).toBeCloseTo(0.3);
    expect(codex).toBeCloseTo(0.875);
    expect(flagship).toBeCloseTo(1.0);
    expect(nano).toBeLessThan(mini);
    expect(mini).toBeLessThan(codex);
    expect(codex).toBeLessThan(flagship);
  });

  it('prices current Gemini Flash-Lite lower than Flash and Pro', () => {
    const lite = calculateCost(inputTokens, outputTokens, 'google', 'gemini-3.1-flash-lite');
    const flash = calculateCost(inputTokens, outputTokens, 'google', 'gemini-3-flash-preview');
    const pro = calculateCost(inputTokens, outputTokens, 'google', 'gemini-3.1-pro-preview');

    expect(lite).toBeCloseTo(0.1);
    expect(flash).toBeCloseTo(0.2);
    expect(pro).toBeCloseTo(0.8);
    expect(lite).toBeLessThan(flash);
    expect(flash).toBeLessThan(pro);
  });

  it('keeps legacy model detection accurate where older models still appear in logs', () => {
    expect(calculateCost(inputTokens, outputTokens, 'openai', 'gpt-4')).toBe(6.0);
    expect(calculateCost(inputTokens, outputTokens, 'openai', 'gpt-4-turbo')).toBe(2.5);
    expect(calculateCost(inputTokens, outputTokens, 'openai', 'gpt-4o')).toBe(0.75);
    expect(calculateCost(inputTokens, outputTokens, 'google', 'gemini-1.5-flash')).toBeCloseTo(
      0.0225
    );
  });

  it('matches dated model variants by the longest known prefix', () => {
    expect(
      calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-sonnet-4-5-20250929')
    ).toBe(calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-sonnet-4-5'));

    expect(calculateCost(inputTokens, outputTokens, 'openai', 'gpt-4o-2024-05-13')).toBe(
      calculateCost(inputTokens, outputTokens, 'openai', 'gpt-4o')
    );
  });

  it('prices cached reads and cache writes separately from uncached input', () => {
    const cost = calculateCost(inputTokens, outputTokens, 'anthropic', 'claude-haiku-4-5', {
      cacheReadTokens: 100_000,
      cacheWriteTokens: 100_000,
    });

    expect(cost).toBeCloseTo(0.485);
  });

  it('uses cheap provider-level rates when no model is supplied', () => {
    expect(calculateCost(inputTokens, outputTokens, 'anthropic')).toBe(0.35);
    expect(calculateCost(inputTokens, outputTokens, 'openai')).toBe(0.3);
    expect(calculateCost(inputTokens, outputTokens, 'google')).toBe(0.1);
  });
});
