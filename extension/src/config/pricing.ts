/**
 * Consolidated AI Provider Pricing Configuration
 *
 * Single source of truth for provider pricing rates.
 * Used by AIUsageMonitor, CostBudgetEnforcer, and UsageLogger.
 *
 * Rates as of March 2026:
 * - Anthropic (Claude): $3/M input, $15/M output
 * - OpenAI (GPT): $5/M input, $15/M output
 * - Google (Gemini): $0.25/M input, $0.50/M output
 *
 * Feature 025: AI Token Usage Tracking Panel
 */

import type { PricingConfig } from '../types/aiUsage';

/**
 * Cost per 1,000 tokens by provider (USD).
 *
 * Formula: (tokens / 1000) * rate = cost in USD
 * Equivalent to per-million rates: anthropic input = $3/M = $0.003/K
 */
export const COST_PER_1K_TOKENS: Record<string, PricingConfig> = {
  anthropic: { input: 0.003, output: 0.015 },
  google: { input: 0.00025, output: 0.0005 },
  openai: { input: 0.005, output: 0.015 },
};

/**
 * Timestamp when pricing data was last updated.
 * Used by isPricingStale() to warn when rates may be outdated.
 */
export const PRICING_LAST_UPDATED = new Date('2026-03-15').getTime();

/**
 * Default provider used when providerId is not specified
 */
export const DEFAULT_PROVIDER = 'anthropic';

/**
 * Check if pricing data is stale (>90 days old).
 *
 * @returns true if pricing data should be reviewed
 */
export function isPricingStale(): boolean {
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  return Date.now() - PRICING_LAST_UPDATED > NINETY_DAYS_MS;
}

/**
 * Calculate cost for a given token count and provider.
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param providerId - Provider identifier (defaults to 'anthropic')
 * @returns Cost in USD
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  providerId: string = DEFAULT_PROVIDER
): number {
  const rates = COST_PER_1K_TOKENS[providerId] ?? COST_PER_1K_TOKENS[DEFAULT_PROVIDER];
  return (inputTokens * rates.input + outputTokens * rates.output) / 1000;
}
