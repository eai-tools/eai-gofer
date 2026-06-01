/**
 * CLI provider types used by Gofer's autonomous execution layer.
 *
 * Direct model API execution is no longer part of the VS Code extension surface.
 */

export type ProviderStatus = 'available' | 'unavailable' | 'rate_limited' | 'unknown';

export type CLIProviderId = 'claude-cli' | 'codex-cli';

export type ProviderId = CLIProviderId;

export interface RateLimitConfig {
  requestsPerMinute: number;
  currentCount: number;
  windowResetAt?: string;
}

export interface QueryRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stage?: string;
  metadata?: Record<string, unknown>;
}

export interface QueryResponse {
  content: string;
  structuredData?: unknown;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  providerId: ProviderId;
  durationMs: number;
  finishReason?: string;
}

export interface ProviderUsageBreakdown {
  tokens: number;
  costUsd: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 60,
  currentCount: 0,
};

export const PROVIDER_NAMES: Record<ProviderId, string> = {
  'claude-cli': 'Claude Code CLI',
  'codex-cli': 'Codex CLI',
};

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  'claude-cli': 'claude-haiku-4-5',
  'codex-cli': 'gpt-5.4-mini',
};
