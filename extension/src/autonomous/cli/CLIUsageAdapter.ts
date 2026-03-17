/**
 * CLI Usage Adapter Interface (T044)
 *
 * Generic interface for CLI provider usage tracking.
 * Each CLI provider (Claude, Codex) implements this to parse its specific log format.
 *
 * @see .specify/specs/027-multi-provider-cli-support/spec.md User Story 5
 * @see .specify/specs/027-multi-provider-cli-support/plan.md Phase 7
 */

import type { ProviderId } from '../../council/types';

/**
 * Usage entry format (normalized across providers)
 */
export interface UsageEntry {
  timestamp: string; // ISO-8601
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  totalTokens: number;
  costUsd: number;
  provider: ProviderId;
  sessionId?: string;
  conversationId?: string;
}

/**
 * CLI Usage Adapter Interface
 *
 * Implementations provide provider-specific log parsing and usage extraction.
 */
export interface CLIUsageAdapter {
  /**
   * Provider identifier (e.g., 'claude-cli', 'codex-cli')
   */
  readonly providerId: ProviderId;

  /**
   * Human-readable provider name (e.g., 'Claude CLI', 'Codex CLI')
   */
  readonly providerName: string;

  /**
   * Parse log file and extract usage entries
   *
   * @param logFilePath - Absolute path to log file
   * @param fromDate - Optional start date filter
   * @param toDate - Optional end date filter
   * @returns Array of normalized usage entries
   */
  parseLogFile(logFilePath: string, fromDate?: Date, toDate?: Date): Promise<UsageEntry[]>;

  /**
   * Get default log file path for this provider
   * Typically in user's home directory (e.g., ~/.claude/*, ~/.codex/*)
   *
   * @returns Absolute path to log directory or file
   */
  getDefaultLogPath(): string;

  /**
   * Extract usage from a single log entry
   * Handles provider-specific log format (JSON, JSONL, etc.)
   *
   * @param logEntry - Raw log entry (string or parsed object)
   * @returns Normalized UsageEntry or null if no usage data
   */
  extractUsage(logEntry: string | object): UsageEntry | null;

  /**
   * Check if this provider's CLI is installed and has logs
   *
   * @returns Promise resolving to true if CLI is installed and has accessible logs
   */
  isInstalled(): Promise<boolean>;
}
