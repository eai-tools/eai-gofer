/**
 * Usage Logger
 *
 * Tracks and logs LLM Council usage metrics for cost visibility.
 * Writes usage data to .specify/logs/council-usage.jsonl for historical analysis.
 *
 * @see .specify/specs/009-llm-council-integration/data-model.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { UsageMetrics, ProviderId, CouncilConfig } from './types';
import type { UsageDataSource } from '../types/aiUsage';

/**
 * A single usage log entry
 */
export interface UsageLogEntry {
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Council session ID */
  sessionId: string;
  /** Stage that was executed */
  stage: string;
  /** Whether council mode was used */
  councilMode: boolean;
  /** Total input tokens */
  inputTokens: number;
  /** Total output tokens */
  outputTokens: number;
  /** Estimated cost in USD */
  estimatedCostUsd: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Number of providers used */
  providerCount: number;
  /** Provider breakdown */
  providers: Record<string, { tokens: number; costUsd: number }>;
}

/**
 * Usage summary for a time period
 */
export interface UsageSummary {
  /** Total sessions */
  totalSessions: number;
  /** Total council sessions */
  councilSessions: number;
  /** Total single-provider sessions */
  singleSessions: number;
  /** Total input tokens */
  totalInputTokens: number;
  /** Total output tokens */
  totalOutputTokens: number;
  /** Total estimated cost in USD */
  totalCostUsd: number;
  /** Average session duration in ms */
  avgDurationMs: number;
  /** Cost breakdown by provider */
  byProvider: Record<string, { tokens: number; costUsd: number; sessions: number }>;
  /** Cost breakdown by stage */
  byStage: Record<string, { tokens: number; costUsd: number; sessions: number }>;
  /** Time range */
  fromDate: string;
  toDate: string;
}

/**
 * Estimated cost per 1000 tokens by provider (in USD)
 */
const COST_PER_1K_TOKENS: Record<ProviderId, { input: number; output: number }> = {
  anthropic: { input: 0.003, output: 0.015 },
  google: { input: 0.00025, output: 0.0005 },
  openai: { input: 0.005, output: 0.015 },
};

/**
 * Usage Logger for tracking council costs
 */
export class UsageLogger implements UsageDataSource {
  private readonly workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  /**
   * Get the path to the usage log file
   */
  getLogPath(): string {
    return path.join(this.workspacePath, '.specify', 'logs', 'council-usage.jsonl');
  }

  /**
   * Append a usage entry to the log file
   */
  async appendUsageLog(entry: UsageLogEntry): Promise<void> {
    const logPath = this.getLogPath();
    const logDir = path.dirname(logPath);

    // Ensure directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Append entry as JSONL (one JSON object per line)
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logPath, line, 'utf-8');
  }

  /**
   * Create a usage log entry from session metrics
   */
  createLogEntry(
    sessionId: string,
    stage: string,
    councilMode: boolean,
    usage: UsageMetrics
  ): UsageLogEntry {
    return {
      timestamp: new Date().toISOString(),
      sessionId,
      stage,
      councilMode,
      inputTokens: usage.totalTokensInput,
      outputTokens: usage.totalTokensOutput,
      estimatedCostUsd: usage.estimatedCostUsd,
      durationMs: usage.durationMs,
      providerCount: Object.keys(usage.providerBreakdown).length,
      providers: usage.providerBreakdown as Record<string, { tokens: number; costUsd: number }>,
    };
  }

  /**
   * Estimate usage cost before execution
   *
   * Provides a pre-execution estimate based on typical token counts
   * and the number of providers that will be queried.
   */
  estimateUsage(
    config: CouncilConfig,
    estimatedInputTokens: number,
    estimatedOutputTokens: number
  ): { estimatedCostUsd: number; providerCount: number; breakdown: Record<string, number> } {
    const enabledProviders = config.providers.filter((p) => p.enabled);
    const breakdown: Record<string, number> = {};
    let totalCost = 0;

    for (const provider of enabledProviders) {
      const rates = COST_PER_1K_TOKENS[provider.providerId];
      const providerCost =
        (estimatedInputTokens / 1000) * rates.input + (estimatedOutputTokens / 1000) * rates.output;

      breakdown[provider.providerId] = providerCost;
      totalCost += providerCost;
    }

    // If peer review is enabled, multiply by 2 (first opinions + peer reviews)
    if (config.peerReview && enabledProviders.length >= 3) {
      totalCost *= 2;
      for (const key of Object.keys(breakdown)) {
        breakdown[key] *= 2;
      }
    }

    return {
      estimatedCostUsd: totalCost,
      providerCount: enabledProviders.length,
      breakdown,
    };
  }

  /**
   * Format an estimate for display
   */
  formatEstimate(estimate: { estimatedCostUsd: number; providerCount: number }): string {
    const cost = estimate.estimatedCostUsd.toFixed(4);
    return `Estimated cost: $${cost} (${estimate.providerCount} providers)`;
  }

  /**
   * Get usage summary for a time period
   *
   * Reads the log file and aggregates usage data.
   */
  async getUsageSummary(fromDate?: Date, toDate?: Date): Promise<UsageSummary> {
    const logPath = this.getLogPath();

    const summary: UsageSummary = {
      totalSessions: 0,
      councilSessions: 0,
      singleSessions: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      avgDurationMs: 0,
      byProvider: {},
      byStage: {},
      fromDate: fromDate?.toISOString() ?? '',
      toDate: toDate?.toISOString() ?? new Date().toISOString(),
    };

    if (!fs.existsSync(logPath)) {
      return summary;
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    let totalDuration = 0;
    let firstTimestamp = '';
    let lastTimestamp = '';

    for (const line of lines) {
      try {
        const entry: UsageLogEntry = JSON.parse(line);
        const entryDate = new Date(entry.timestamp);

        // Apply date filters
        if (fromDate && entryDate < fromDate) {
          continue;
        }
        if (toDate && entryDate > toDate) {
          continue;
        }

        // Track timestamps
        if (!firstTimestamp || entry.timestamp < firstTimestamp) {
          firstTimestamp = entry.timestamp;
        }
        if (!lastTimestamp || entry.timestamp > lastTimestamp) {
          lastTimestamp = entry.timestamp;
        }

        // Aggregate metrics
        summary.totalSessions++;
        if (entry.councilMode) {
          summary.councilSessions++;
        } else {
          summary.singleSessions++;
        }

        summary.totalInputTokens += entry.inputTokens;
        summary.totalOutputTokens += entry.outputTokens;
        summary.totalCostUsd += entry.estimatedCostUsd;
        totalDuration += entry.durationMs;

        // Aggregate by stage
        if (!summary.byStage[entry.stage]) {
          summary.byStage[entry.stage] = { tokens: 0, costUsd: 0, sessions: 0 };
        }
        summary.byStage[entry.stage].tokens += entry.inputTokens + entry.outputTokens;
        summary.byStage[entry.stage].costUsd += entry.estimatedCostUsd;
        summary.byStage[entry.stage].sessions++;

        // Aggregate by provider
        for (const [providerId, data] of Object.entries(entry.providers)) {
          if (!summary.byProvider[providerId]) {
            summary.byProvider[providerId] = { tokens: 0, costUsd: 0, sessions: 0 };
          }
          summary.byProvider[providerId].tokens += data.tokens;
          summary.byProvider[providerId].costUsd += data.costUsd;
          summary.byProvider[providerId].sessions++;
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Calculate averages
    if (summary.totalSessions > 0) {
      summary.avgDurationMs = totalDuration / summary.totalSessions;
    }

    // Set date range
    summary.fromDate = firstTimestamp || summary.fromDate;
    if (!summary.toDate) {
      summary.toDate = lastTimestamp || new Date().toISOString();
    }

    return summary;
  }

  /**
   * Format usage summary for display
   */
  formatSummary(summary: UsageSummary): string {
    const lines: string[] = [];

    lines.push('=== LLM Council Usage Summary ===\n');

    if (summary.fromDate && summary.toDate) {
      lines.push(`Period: ${summary.fromDate.split('T')[0]} to ${summary.toDate.split('T')[0]}`);
    }

    lines.push(`\nSessions: ${summary.totalSessions}`);
    lines.push(`  - Council mode: ${summary.councilSessions}`);
    lines.push(`  - Single provider: ${summary.singleSessions}`);

    lines.push(
      `\nTokens: ${(summary.totalInputTokens + summary.totalOutputTokens).toLocaleString()}`
    );
    lines.push(`  - Input: ${summary.totalInputTokens.toLocaleString()}`);
    lines.push(`  - Output: ${summary.totalOutputTokens.toLocaleString()}`);

    lines.push(`\nEstimated Cost: $${summary.totalCostUsd.toFixed(4)}`);
    lines.push(`Average Duration: ${(summary.avgDurationMs / 1000).toFixed(2)}s`);

    if (Object.keys(summary.byProvider).length > 0) {
      lines.push('\nBy Provider:');
      for (const [provider, data] of Object.entries(summary.byProvider)) {
        lines.push(`  ${provider}: $${data.costUsd.toFixed(4)} (${data.sessions} sessions)`);
      }
    }

    if (Object.keys(summary.byStage).length > 0) {
      lines.push('\nBy Stage:');
      for (const [stage, data] of Object.entries(summary.byStage)) {
        lines.push(`  ${stage}: $${data.costUsd.toFixed(4)} (${data.sessions} sessions)`);
      }
    }

    return lines.join('\n');
  }
}

/**
 * Singleton instance holder
 */
let usageLoggerInstance: UsageLogger | undefined;

/**
 * Get or create the UsageLogger singleton
 */
export function getUsageLogger(workspacePath: string): UsageLogger {
  if (!usageLoggerInstance || usageLoggerInstance['workspacePath'] !== workspacePath) {
    usageLoggerInstance = new UsageLogger(workspacePath);
  }
  return usageLoggerInstance;
}

/**
 * Reset the UsageLogger singleton (for testing)
 */
export function resetUsageLogger(): void {
  usageLoggerInstance = undefined;
}
