/**
 * AI Usage Types
 *
 * Type definitions for the AI Token Usage Tracking Panel (Feature 025).
 * Defines data structures for usage aggregation, provider breakdown,
 * and tree view display items.
 */

import * as vscode from 'vscode';
import type { ConversationUsage } from '../autonomous/ClaudeCodeUsageAdapter';

/**
 * Supported AI provider identifiers
 */
export type ProviderId = 'anthropic' | 'openai' | 'google';

/**
 * Time period for usage aggregation
 */
export type UsagePeriod = 'current' | 'today' | 'week';

/**
 * Budget health status
 */
export type BudgetStatus = 'healthy' | 'warning' | 'exceeded';

/**
 * Usage and cost data for a single AI provider
 */
export interface ProviderUsage {
  /** Provider identifier */
  providerId: ProviderId | string;
  /** Number of input tokens consumed */
  inputTokens: number;
  /** Number of output tokens generated */
  outputTokens: number;
  /** Total cost in USD (input + output) */
  costUsd: number;
}

/**
 * Aggregated usage data for a specific time period
 */
export interface AIUsageData {
  /** Time period identifier */
  period: UsagePeriod;
  /** Total cost across all providers in USD */
  totalCostUsd: number;
  /** Total tokens (input + output) across all providers */
  totalTokens: number;
  /** Per-provider usage breakdown */
  providers: ProviderUsage[];
  /** Budget limit in USD (only for 'current' period) */
  budgetLimitUsd?: number;
  /** Percentage of budget used (only for 'current' period) */
  budgetPercentUsed?: number;
  /** Budget status (only for 'current' period) */
  budgetStatus?: BudgetStatus;
  /** Active session ID (only for 'current' period) */
  sessionId?: string;
  /** Error state for this period's data */
  error?: 'not_configured' | 'api_not_available' | 'api_error';
  /** Detailed error message for display */
  errorMessage?: string;
  /** Unix timestamp (ms) of last successful data fetch */
  lastUpdated?: number;
}

/**
 * Context value types for tree view items
 */
export type AIUsageItemContext =
  | 'period'
  | 'provider'
  | 'tokens'
  | 'user-info'
  | 'all-projects'
  | 'separator'
  | 'provider-summary'
  | 'loading';

/**
 * Tree view item for display in VSCode TreeDataProvider
 */
export class AIUsageItem extends vscode.TreeItem {
  /** Item type for context menu registration */
  contextType: AIUsageItemContext;
  /** Child items (for internal tree building) */
  children?: AIUsageItem[];
  /** Underlying data for this item */
  usageData?: AIUsageData | ProviderUsage | UsageSummary | ConversationUsage[];
  /** Period this item belongs to */
  period?: UsagePeriod;

  constructor(
    label: string,
    contextType: AIUsageItemContext,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(label, collapsibleState);
    this.contextType = contextType;
    this.contextValue = contextType;
  }
}

/**
 * Provider-level usage totals used by AIUsageMonitor data sources.
 */
export interface UsageProviderSummary {
  requests: number;
  tokens: number;
  costUsd: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

/**
 * Aggregated usage summary across one or more local CLI data sources.
 */
export interface UsageSummary {
  totalSessions: number;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedInputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  byProvider: Record<string, UsageProviderSummary>;
}

/**
 * Abstraction for local CLI usage data sources.
 */
export interface UsageDataSource {
  getUsageSummary(fromDate?: Date, toDate?: Date): Promise<UsageSummary>;
}

/**
 * Pricing configuration per provider
 */
export interface PricingConfig {
  /** Cost per 1K input tokens in USD */
  input: number;
  /** Cost per 1K output tokens in USD */
  output: number;
  /** Cost per 1K cached input/cache-read tokens in USD */
  cachedInput?: number;
  /** Cost per 1K provider cache-read tokens in USD */
  cacheRead?: number;
  /** Cost per 1K provider cache-write/cache-creation tokens in USD */
  cacheWrite?: number;
  /** Cost per 1K cached tokens per hour in USD, where a provider bills storage separately */
  cacheStoragePerHour?: number;
}

/**
 * Event payload emitted by AIUsageMonitor on data updates
 */
export interface UsageUpdateEvent {
  /** All time period data */
  periods: AIUsageData[];
  /** What triggered this update */
  trigger: 'file-watch' | 'polling' | 'manual' | 'session-change';
  /** Timestamp of the update */
  timestamp: number;
}
