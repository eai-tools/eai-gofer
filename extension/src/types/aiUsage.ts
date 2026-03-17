/**
 * AI Usage Types
 *
 * Type definitions for the AI Token Usage Tracking Panel (Feature 025).
 * Defines data structures for usage aggregation, provider breakdown,
 * and tree view display items.
 */

import * as vscode from 'vscode';

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
  error?: 'admin_key_required' | 'not_configured' | 'api_not_available' | 'api_error';
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
  | 'provider-summary';

/**
 * Tree view item for display in VSCode TreeDataProvider
 */
export class AIUsageItem extends vscode.TreeItem {
  /** Item type for context menu registration */
  contextType: AIUsageItemContext;
  /** Child items (for internal tree building) */
  children?: AIUsageItem[];
  /** Underlying data for this item */
  usageData?: AIUsageData | ProviderUsage | any;
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
 * Abstraction for usage data sources (file-based or API-based).
 * Implemented by UsageLogger (local JSONL) and UsageApiClient (provider APIs).
 */
export interface UsageDataSource {
  getUsageSummary(fromDate?: Date, toDate?: Date): Promise<UsageSummary>;
}

/**
 * Re-export UsageSummary type for consumers that import from this module.
 * The canonical definition lives in council/UsageLogger.ts.
 */
import type { UsageSummary } from '../council/UsageLogger';
export type { UsageSummary };

/**
 * Pricing configuration per provider
 */
export interface PricingConfig {
  /** Cost per 1K input tokens in USD */
  input: number;
  /** Cost per 1K output tokens in USD */
  output: number;
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
