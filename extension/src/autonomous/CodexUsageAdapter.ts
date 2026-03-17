/**
 * Codex CLI Usage Adapter (T045)
 *
 * Parses Codex CLI usage logs from ~/.codex/history.json
 * Extracts token usage and normalizes to UsageEntry format.
 *
 * @see .specify/specs/027-multi-provider-cli-support/spec.md User Story 5
 * @see .specify/specs/027-multi-provider-cli-support/plan.md Phase 7
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ProviderId } from '../council/types';
import type { CLIUsageAdapter, UsageEntry } from './cli/CLIUsageAdapter';
import { calculateCost } from '../config/pricing';
import { Logger } from '../utils/logger';

/**
 * Codex log entry format (from ~/.codex/history.json)
 */
interface CodexLogEntry {
  timestamp: string; // ISO-8601
  sessionId: string;
  model: string;
  tokens?: {
    prompt: number;
    completion: number;
    total?: number;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Codex history file format
 */
interface CodexHistoryFile {
  sessions: CodexLogEntry[];
}

/**
 * Codex CLI Usage Adapter
 *
 * Parses ~/.codex/history.json to extract token usage
 */
export class CodexUsageAdapter implements CLIUsageAdapter {
  private readonly logger = Logger.for('CodexUsageAdapter');
  readonly providerId: ProviderId = 'codex-cli';
  readonly providerName = 'Codex CLI';

  private readonly codexDir: string;
  private readonly workspacePath: string;

  constructor(workspacePath: string, codexDir?: string) {
    this.workspacePath = workspacePath;
    this.codexDir = codexDir ?? path.join(os.homedir(), '.codex');
  }

  /**
   * Check if Codex CLI is installed and has logs
   */
  async isInstalled(): Promise<boolean> {
    try {
      await fs.promises.access(this.codexDir);
      const historyPath = this.getDefaultLogPath();
      await fs.promises.access(historyPath);

      this.logger.info('Checking Codex CLI installation', {
        codexDir: this.codexDir,
        codexDirExists: true,
        historyExists: true,
      });

      return true;
    } catch {
      this.logger.info('Checking Codex CLI installation', {
        codexDir: this.codexDir,
        codexDirExists: false,
        historyExists: false,
      });
      return false;
    }
  }

  /**
   * Get default log path for Codex CLI
   * @returns ~/.codex/history.json
   */
  getDefaultLogPath(): string {
    return path.join(this.codexDir, 'history.json');
  }

  /**
   * Parse Codex history file and extract usage entries
   */
  async parseLogFile(
    logFilePath: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<UsageEntry[]> {
    const usageEntries: UsageEntry[] = [];

    try {
      // Check file existence asynchronously
      try {
        await fs.promises.access(logFilePath);
      } catch {
        this.logger.warn('Codex history file not found', { logFilePath });
        return [];
      }

      const content = await fs.promises.readFile(logFilePath, 'utf-8');
      const historyData: CodexHistoryFile = JSON.parse(content);

      if (!historyData.sessions || !Array.isArray(historyData.sessions)) {
        this.logger.warn('Invalid Codex history format - no sessions array');
        return [];
      }

      for (const session of historyData.sessions) {
        const entry = this.extractUsage(session);
        if (!entry) continue;

        // Apply date filters
        const timestamp = new Date(entry.timestamp);
        if (fromDate && timestamp < fromDate) continue;
        if (toDate && timestamp > toDate) continue;

        usageEntries.push(entry);
      }

      this.logger.info('Parsed Codex usage entries', {
        totalEntries: usageEntries.length,
        fromDate: fromDate?.toISOString(),
        toDate: toDate?.toISOString(),
      });

      return usageEntries;
    } catch (error) {
      this.logger.error(
        'Failed to parse Codex history file',
        error as Error,
        { logFilePath }
      );
      return [];
    }
  }

  /**
   * Extract usage from a single Codex log entry
   */
  extractUsage(logEntry: string | object): UsageEntry | null {
    try {
      const entry: CodexLogEntry =
        typeof logEntry === 'string' ? JSON.parse(logEntry) : logEntry;

      // Extract token usage (support both formats)
      let inputTokens = 0;
      let outputTokens = 0;
      let totalTokens = 0;

      if (entry.tokens) {
        inputTokens = entry.tokens.prompt || 0;
        outputTokens = entry.tokens.completion || 0;
        totalTokens = entry.tokens.total || inputTokens + outputTokens;
      } else if (entry.usage) {
        inputTokens = entry.usage.prompt_tokens || 0;
        outputTokens = entry.usage.completion_tokens || 0;
        totalTokens = entry.usage.total_tokens || inputTokens + outputTokens;
      } else {
        // No usage data in this entry
        return null;
      }

      // Calculate cost using pricing config
      const model = entry.model || 'gpt-4o';
      const costUsd = calculateCost(inputTokens, outputTokens, 'openai');

      return {
        timestamp: entry.timestamp,
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        costUsd,
        provider: this.providerId,
        sessionId: entry.sessionId,
      };
    } catch (error) {
      this.logger.warn('Failed to extract usage from Codex log entry', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

/**
 * Singleton instance
 */
let codexAdapterInstance: CodexUsageAdapter | undefined;

/**
 * Get the singleton Codex Usage Adapter instance
 * @param workspacePath - Current workspace path
 * @returns CodexUsageAdapter instance
 */
export function getCodexAdapter(workspacePath: string): CodexUsageAdapter {
  if (!codexAdapterInstance || codexAdapterInstance['workspacePath'] !== workspacePath) {
    codexAdapterInstance = new CodexUsageAdapter(workspacePath);
  }
  return codexAdapterInstance;
}
