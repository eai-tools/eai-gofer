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
 * Model-specific pricing rates (cost per 1,000 tokens in USD).
 *
 * Sources:
 * - Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
 * - OpenAI: https://openai.com/pricing
 * - Google: https://ai.google.dev/pricing
 *
 * Last verified: 2026-03-19
 */
export const MODEL_PRICING: Record<string, PricingConfig> = {
  // Anthropic Claude Models
  'claude-opus-4-6': { input: 0.005, output: 0.025 }, // $5/M, $25/M
  'claude-opus-4-5': { input: 0.005, output: 0.025 }, // $5/M, $25/M
  'claude-sonnet-4-5': { input: 0.003, output: 0.015 }, // $3/M, $15/M
  'claude-sonnet-4': { input: 0.003, output: 0.015 }, // $3/M, $15/M
  'claude-haiku-4-5': { input: 0.001, output: 0.005 }, // $1/M, $5/M
  'claude-haiku-3-5': { input: 0.00025, output: 0.00125 }, // $0.25/M, $1.25/M

  // OpenAI Models
  'gpt-4': { input: 0.03, output: 0.06 }, // $30/M, $60/M
  'gpt-4-turbo': { input: 0.01, output: 0.03 }, // $10/M, $30/M
  'gpt-4o': { input: 0.005, output: 0.015 }, // $5/M, $15/M
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }, // $0.50/M, $1.50/M
  o1: { input: 0.015, output: 0.06 }, // $15/M, $60/M
  'o1-mini': { input: 0.003, output: 0.012 }, // $3/M, $12/M

  // Google Gemini Models
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 }, // $1.25/M, $5/M
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 }, // $0.075/M, $0.30/M
  'gemini-pro': { input: 0.0005, output: 0.0015 }, // $0.50/M, $1.50/M
};

/**
 * Default model to use for each provider when model cannot be determined.
 */
export const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-5',
  openai: 'gpt-4-turbo',
  google: 'gemini-1.5-flash',
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
 * Get pricing rates for a specific model with fallback hierarchy.
 *
 * Fallback strategy:
 * 1. Exact match in MODEL_PRICING
 * 2. Prefix match (handles dated variants like "claude-sonnet-4-5-20250929")
 * 3. DEFAULT_MODELS[providerId]
 * 4. COST_PER_1K_TOKENS[providerId]
 *
 * @param modelId - Model identifier (e.g., "claude-sonnet-4-5")
 * @param providerId - Provider identifier (e.g., "anthropic")
 * @returns Pricing configuration with input/output rates
 */
export function getPricingForModel(modelId: string, providerId: string): PricingConfig {
  // 1. Exact match
  if (MODEL_PRICING[modelId]) {
    return MODEL_PRICING[modelId];
  }

  // 2. Prefix match (handles dated variants)
  // e.g., "claude-sonnet-4-5-20250929" matches "claude-sonnet-4-5"
  // Sort by key length DESC to prefer longer matches (gpt-4o before gpt-4)
  const sortedModels = Object.entries(MODEL_PRICING).sort((a, b) => b[0].length - a[0].length);
  for (const [model, rates] of sortedModels) {
    if (modelId.startsWith(model)) {
      console.warn(`[Pricing] Using prefix match: ${modelId} -> ${model}`);
      return rates;
    }
  }

  // 3. Fallback to default model for provider
  const defaultModel = DEFAULT_MODELS[providerId];
  if (defaultModel && MODEL_PRICING[defaultModel]) {
    console.warn(
      `[Pricing] Model ${modelId} not found, using default for ${providerId}: ${defaultModel}`
    );
    return MODEL_PRICING[defaultModel];
  }

  // 4. Ultimate fallback: provider-level rates
  const providerRates = COST_PER_1K_TOKENS[providerId] ?? COST_PER_1K_TOKENS[DEFAULT_PROVIDER];
  console.warn(
    `[Pricing] No model pricing for ${modelId}, falling back to provider rates for ${providerId}`
  );
  return providerRates;
}

/**
 * Calculate cost for a given token count and provider/model.
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param providerId - Provider identifier (defaults to 'anthropic')
 * @param modelId - Optional model identifier for model-specific pricing
 * @returns Cost in USD
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  providerId: string = DEFAULT_PROVIDER,
  modelId?: string
): number {
  let rates: PricingConfig;

  if (modelId) {
    // Use model-specific pricing
    rates = getPricingForModel(modelId, providerId);
  } else {
    // Backward compatibility: use provider-level rates
    rates = COST_PER_1K_TOKENS[providerId] ?? COST_PER_1K_TOKENS[DEFAULT_PROVIDER];
  }

  return (inputTokens * rates.input + outputTokens * rates.output) / 1000;
}
