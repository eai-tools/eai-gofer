/**
 * ContextUsageLogger - JSONL Logging for Context Usage
 *
 * Provides append-only JSONL logging for context health events.
 * Each log entry is a single line of JSON for easy parsing and analysis.
 *
 * Key Features:
 * - Append-only JSONL format
 * - Automatic directory creation
 * - Health check logging
 * - Masking event logging
 * - Stage transition logging
 *
 * @see .specify/specs/011-context-health-recursive-memory/data-model.md
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import type { HealthStatus, TokenBreakdown } from './ContextHealthMonitor';
import type { CostBudgetEnforcer, CostSnapshot } from './CostBudgetEnforcer';
import type { ContextHealthStatusBar } from '../ui/ContextHealthStatusBar';

/**
 * Log entry for context usage tracking.
 */
export interface ContextUsageLogEntry {
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Session identifier */
  sessionId: string;
  /** Current Gofer stage */
  stage: string;
  /** Health status at time of log */
  status: HealthStatus;
  /** Tokens used */
  tokensUsed: number;
  /** Context limit */
  tokensLimit: number;
  /** Usage percentage */
  utilizationPercent: number;
  /** Recommended or taken action */
  action?: string;
  /** Detailed breakdown */
  breakdown?: TokenBreakdown;
  /** Count of masked observations */
  maskedObservations?: number;
  /** Tokens saved from masking */
  tokensSaved?: number;
  /** Event type for filtering */
  eventType:
    | 'health_check'
    | 'masking'
    | 'stage_transition'
    | 'handoff'
    | 'session_start'
    | 'session_end'
    | 'memory_save'
    | 'memory_search'
    | 'memory_load'
    | 'loading_decision'
    | 'reseed'
    | 'llm_call'
    | 'delegation_recommendation';
  /** Memory-specific fields (Spec 012) */
  memoryId?: string;
  category?: string;
  scope?: 'local' | 'global';
  tags?: string[];
  resultCount?: number;
  searchTimeMs?: number;
  memoriesLoaded?: number;
  coveragePercent?: number;
  source?: 'memory' | 'research' | 'hints' | 'budget-enforcement';
  decision?: 'loaded' | 'skipped' | 'blocked';
  reason?: string;
  /** T051: Reseed metrics */
  observationsCleared?: number;
  memoriesPreserved?: number;
  reseedTimestamp?: string;
  /** T054: Cost tracking fields */
  llmInputTokens?: number;
  llmOutputTokens?: number;
  stageDuration?: number;
  slopCount?: number;
}

/**
 * Input for health check log entry.
 */
export interface HealthCheckLogInput {
  sessionId: string;
  stage: string;
  status: HealthStatus;
  tokensUsed: number;
  tokensLimit: number;
  utilizationPercent: number;
  breakdown?: TokenBreakdown;
  action?: string;
}

/**
 * Input for masking event log entry.
 */
export interface MaskingEventLogInput {
  sessionId: string;
  stage: string;
  status: HealthStatus;
  tokensUsed: number;
  tokensLimit: number;
  utilizationPercent: number;
  maskedObservations: number;
  tokensSaved: number;
}

/**
 * Input for stage transition log entry.
 */
export interface StageTransitionLogInput {
  sessionId: string;
  fromStage: string;
  toStage: string;
  status: HealthStatus;
  tokensUsed: number;
  tokensLimit: number;
  utilizationPercent: number;
}

/**
 * Input for memory save log entry (Spec 012).
 */
export interface MemorySaveLogInput {
  sessionId?: string;
  memoryId: string;
  category: string;
  scope: 'local' | 'global';
  tags?: string[];
  /** Estimated token count of the memory */
  tokenEstimate?: number;
}

/**
 * Input for memory search log entry (Spec 012).
 */
export interface MemorySearchLogInput {
  sessionId?: string;
  /** Query keywords used */
  queryKeywords?: string;
  /** Query category filter */
  queryCategory?: string;
  /** Number of results returned */
  resultCount: number;
  /** Total tokens in returned results */
  totalTokensReturned?: number;
  /** Search time in milliseconds */
  searchTimeMs: number;
}

/**
 * Input for memory load log entry (Spec 012).
 */
export interface MemoryLoadLogInput {
  sessionId?: string;
  /** Scope loaded from */
  scope?: 'local' | 'global' | 'both';
  /** Number of memories loaded */
  memoriesLoaded: number;
  /** Total tokens loaded */
  totalTokensLoaded?: number;
  /** Load time in milliseconds */
  loadTimeMs?: number;
}

/**
 * Input for loading decision log entry (Spec 012).
 */
export interface LoadingDecisionLogInput {
  sessionId?: string;
  source: 'memory' | 'research' | 'hints' | 'budget-enforcement';
  decision: 'loaded' | 'skipped' | 'blocked';
  reason: string;
  /** Tokens loaded (if decision was 'loaded') */
  tokensLoaded?: number;
  /** Memory coverage percentage at time of decision */
  memoryCoveragePercent?: number;
  /** Current Gofer stage */
  stage?: string;
}

/**
 * Configuration for ContextUsageLogger.
 */
export interface ContextUsageLoggerConfig {
  /** Log file path (default: .specify/logs/context-usage.jsonl) */
  logPath: string;
  /** Enable logging (default: true) */
  enabled: boolean;
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: ContextUsageLoggerConfig = {
  logPath: '.specify/logs/context-usage.jsonl',
  enabled: true,
};

/**
 * ContextUsageLogger implementation.
 *
 * Provides structured JSONL logging for context usage events.
 */
export class ContextUsageLogger {
  private readonly config: ContextUsageLoggerConfig;
  private readonly logger: Logger;
  private readonly workspaceRoot: string;
  private initialized: boolean = false;
  private runLedger?: import('./RunLedger').RunLedger;
  private costBudgetEnforcer?: CostBudgetEnforcer;
  private contextHealthStatusBar?: ContextHealthStatusBar;
  private lastHealthStatus?: HealthStatus;

  /**
   * Creates a new ContextUsageLogger instance.
   *
   * @param workspaceRoot - Workspace root directory
   * @param config - Optional partial configuration
   */
  constructor(workspaceRoot: string, config?: Partial<ContextUsageLoggerConfig>) {
    this.workspaceRoot = workspaceRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = Logger.for('ContextUsageLogger');
    this.logger.debug('ContextUsageLogger initialized', {
      logPath: this.getLogPath(),
      enabled: this.config.enabled,
    });
  }

  /**
   * Wire RunLedger for milestone event emission.
   */
  setRunLedger(ledger: import('./RunLedger').RunLedger): void {
    this.runLedger = ledger;
  }

  /**
   * 002 AC-6.4: Wire CostBudgetEnforcer for dollar/token budget tracking.
   * When set, logLLMCall() forwards token counts to recordUsage().
   */
  setCostBudgetEnforcer(enforcer: CostBudgetEnforcer): void {
    this.costBudgetEnforcer = enforcer;
  }

  /**
   * 002 AC-6.7: Wire ContextHealthStatusBar for budget snapshot display.
   */
  setContextHealthStatusBar(statusBar: ContextHealthStatusBar): void {
    this.contextHealthStatusBar = statusBar;
  }

  /**
   * Gets the full path to the log file.
   */
  getLogPath(): string {
    return path.join(this.workspaceRoot, this.config.logPath);
  }

  /**
   * Ensures the log directory exists.
   */
  private async ensureDirectory(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const logDir = path.dirname(this.getLogPath());
    try {
      await fs.promises.mkdir(logDir, { recursive: true });
      this.initialized = true;
    } catch (error) {
      this.logger.error('Failed to create log directory', error as Error);
      throw error;
    }
  }

  /**
   * Appends a log entry to the JSONL file.
   *
   * @param entry - Log entry to append
   */
  async log(entry: ContextUsageLogEntry): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    await this.ensureDirectory();

    const line = JSON.stringify(entry) + '\n';
    try {
      await fs.promises.appendFile(this.getLogPath(), line, 'utf-8');
      this.logger.debug('Logged context usage entry', {
        eventType: entry.eventType,
        status: entry.status,
      });
    } catch (error) {
      this.logger.error('Failed to write log entry', error as Error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Convenience Methods (T023)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Logs a health check event.
   *
   * @param input - Health check data
   */
  async logHealthCheck(input: HealthCheckLogInput): Promise<void> {
    const entry: ContextUsageLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: input.sessionId,
      stage: input.stage,
      status: input.status,
      tokensUsed: input.tokensUsed,
      tokensLimit: input.tokensLimit,
      utilizationPercent: input.utilizationPercent,
      breakdown: input.breakdown,
      action: input.action,
      eventType: 'health_check',
    };
    await this.log(entry);
    await this.emitMilestone(input.status, input.stage);
  }

  /**
   * Emit milestone event to RunLedger on health status transitions only.
   * Only emits when status transitions to 'warning' or 'critical'.
   */
  private async emitMilestone(currentStatus: HealthStatus, stage: string): Promise<void> {
    if (!this.runLedger) return;

    const previousStatus = this.lastHealthStatus;
    this.lastHealthStatus = currentStatus;

    // Only emit on transitions to warning or critical
    if (currentStatus === 'warning' && previousStatus !== 'warning') {
      await this.runLedger.log({
        runId: '',
        timestamp: new Date().toISOString(),
        eventType: 'health_warning',
        stage,
        feature: '',
        source: 'ContextUsageLogger',
        severity: 'warning',
      });
    } else if (currentStatus === 'critical' && previousStatus !== 'critical') {
      await this.runLedger.log({
        runId: '',
        timestamp: new Date().toISOString(),
        eventType: 'health_critical',
        stage,
        feature: '',
        source: 'ContextUsageLogger',
        severity: 'error',
      });
    }
  }

  /**
   * Logs a masking event.
   *
   * @param input - Masking event data
   */
  async logMaskingEvent(input: MaskingEventLogInput): Promise<void> {
    const entry: ContextUsageLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: input.sessionId,
      stage: input.stage,
      status: input.status,
      tokensUsed: input.tokensUsed,
      tokensLimit: input.tokensLimit,
      utilizationPercent: input.utilizationPercent,
      maskedObservations: input.maskedObservations,
      tokensSaved: input.tokensSaved,
      eventType: 'masking',
    };
    await this.log(entry);
  }

  /**
   * Logs a stage transition event.
   *
   * @param input - Stage transition data
   */
  async logStageTransition(input: StageTransitionLogInput): Promise<void> {
    const entry: ContextUsageLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: input.sessionId,
      stage: input.toStage,
      status: input.status,
      tokensUsed: input.tokensUsed,
      tokensLimit: input.tokensLimit,
      utilizationPercent: input.utilizationPercent,
      action: `Transitioned from ${input.fromStage} to ${input.toStage}`,
      eventType: 'stage_transition',
    };
    await this.log(entry);
  }

  /**
   * Logs a handoff event.
   *
   * @param sessionId - Session ID
   * @param stage - Current stage
   * @param status - Health status
   * @param tokensUsed - Tokens used
   * @param tokensLimit - Token limit
   * @param utilizationPercent - Utilization percentage
   * @param reason - Reason for handoff
   */
  async logHandoff(
    sessionId: string,
    stage: string,
    status: HealthStatus,
    tokensUsed: number,
    tokensLimit: number,
    utilizationPercent: number,
    reason?: string
  ): Promise<void> {
    const entry: ContextUsageLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      stage,
      status,
      tokensUsed,
      tokensLimit,
      utilizationPercent,
      action: reason || 'Handoff triggered',
      eventType: 'handoff',
    };
    await this.log(entry);
  }

  /**
   * Logs a session start event.
   *
   * @param sessionId - Session ID
   * @param stage - Starting stage
   */
  async logSessionStart(sessionId: string, stage: string): Promise<void> {
    const entry: ContextUsageLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      stage,
      status: 'healthy',
      tokensUsed: 0,
      tokensLimit: 120000,
      utilizationPercent: 0,
      action: 'Session started',
      eventType: 'session_start',
    };
    await this.log(entry);
  }

  /**
   * Logs a session end event.
   *
   * @param sessionId - Session ID
   * @param stage - Final stage
   * @param status - Final health status
   * @param tokensUsed - Final tokens used
   * @param tokensLimit - Token limit
   * @param utilizationPercent - Final utilization percentage
   */
  async logSessionEnd(
    sessionId: string,
    stage: string,
    status: HealthStatus,
    tokensUsed: number,
    tokensLimit: number,
    utilizationPercent: number
  ): Promise<void> {
    const entry: ContextUsageLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      stage,
      status,
      tokensUsed,
      tokensLimit,
      utilizationPercent,
      action: 'Session ended',
      eventType: 'session_end',
    };
    await this.log(entry);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Memory Event Logging (Spec 012)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Logs a memory save event.
   *
   * @param input - Memory save data
   */
  async logMemorySave(input: MemorySaveLogInput): Promise<void> {
    const entry: ContextUsageLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: input.sessionId || 'unknown',
      stage: 'memory',
      status: 'healthy',
      tokensUsed: input.tokenEstimate || 0,
      tokensLimit: 120000,
      utilizationPercent: 0,
      eventType: 'memory_save',
      memoryId: input.memoryId,
      category: input.category,
      scope: input.scope,
      tags: input.tags,
    };
    await this.log(entry);
  }

  /**
   * Logs a memory search event.
   *
   * @param input - Memory search data
   */
  async logMemorySearch(input: MemorySearchLogInput): Promise<void> {
    const queryDesc = input.queryKeywords || input.queryCategory || 'all';
    const entry: ContextUsageLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: input.sessionId || 'unknown',
      stage: 'memory',
      status: 'healthy',
      tokensUsed: input.totalTokensReturned || 0,
      tokensLimit: 120000,
      utilizationPercent: 0,
      eventType: 'memory_search',
      action: `Searched for: ${queryDesc}`,
      resultCount: input.resultCount,
      searchTimeMs: input.searchTimeMs,
    };
    await this.log(entry);
  }

  /**
   * Logs a memory load event.
   *
   * @param input - Memory load data
   */
  async logMemoryLoad(input: MemoryLoadLogInput): Promise<void> {
    const entry: ContextUsageLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: input.sessionId || 'unknown',
      stage: 'memory',
      status: 'healthy',
      tokensUsed: input.totalTokensLoaded || 0,
      tokensLimit: 120000,
      utilizationPercent: 0,
      eventType: 'memory_load',
      action: `Loaded from scope: ${input.scope || 'both'} in ${input.loadTimeMs || 0}ms`,
      memoriesLoaded: input.memoriesLoaded,
    };
    await this.log(entry);
  }

  /**
   * Logs a loading decision event.
   *
   * @param input - Loading decision data
   */
  async logLoadingDecision(input: LoadingDecisionLogInput): Promise<void> {
    const entry: ContextUsageLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: input.sessionId || 'unknown',
      stage: input.stage || 'context_building',
      status: 'healthy',
      tokensUsed: input.tokensLoaded || 0,
      tokensLimit: 120000,
      utilizationPercent: 0,
      eventType: 'loading_decision',
      source: input.source,
      decision: input.decision,
      reason: input.reason,
      coveragePercent: input.memoryCoveragePercent,
    };
    await this.log(entry);
  }

  /**
   * T051: Log a reseed event with observation and memory metrics.
   */
  async logReseed(input: {
    sessionId: string;
    stage: string;
    observationsCleared: number;
    memoriesPreserved: number;
  }): Promise<void> {
    const entry: ContextUsageLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: input.sessionId,
      stage: input.stage,
      status: 'healthy',
      tokensUsed: 0,
      tokensLimit: 120000,
      utilizationPercent: 0,
      eventType: 'reseed',
      observationsCleared: input.observationsCleared,
      memoriesPreserved: input.memoriesPreserved,
      reseedTimestamp: new Date().toISOString(),
    };
    await this.log(entry);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Log Reading and Analysis
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Reads and parses the log file.
   *
   * @param limit - Maximum entries to return (from end of file)
   * @returns Array of log entries (most recent last)
   */
  async readLog(limit?: number): Promise<ContextUsageLogEntry[]> {
    const logPath = this.getLogPath();

    try {
      const content = await fs.promises.readFile(logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const entries = lines.map((line) => JSON.parse(line) as ContextUsageLogEntry);

      if (limit) {
        return entries.slice(-limit);
      }
      return entries;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Filters log entries by event type.
   *
   * @param eventType - Event type to filter by
   * @param limit - Maximum entries to return
   * @returns Filtered log entries
   */
  async filterByEventType(
    eventType: ContextUsageLogEntry['eventType'],
    limit?: number
  ): Promise<ContextUsageLogEntry[]> {
    const entries = await this.readLog();
    const filtered = entries.filter((e) => e.eventType === eventType);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Filters log entries by session ID.
   *
   * @param sessionId - Session ID to filter by
   * @returns Filtered log entries
   */
  async filterBySession(sessionId: string): Promise<ContextUsageLogEntry[]> {
    const entries = await this.readLog();
    return entries.filter((e) => e.sessionId === sessionId);
  }

  /**
   * Gets the configuration.
   *
   * @returns Current configuration
   */
  getConfig(): ContextUsageLoggerConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration.
   *
   * @param config - Partial configuration to merge
   */
  updateConfig(config: Partial<ContextUsageLoggerConfig>): void {
    Object.assign(this.config, config);
    this.initialized = false; // Re-check directory on next write
    this.logger.debug('Configuration updated', { config });
  }

  /**
   * 018 T072: Log an LLM call with token usage.
   * 002 AC-6.4: Forwards token counts to CostBudgetEnforcer.recordUsage() when wired.
   * 002 AC-6.5: Shows vscode notification on budget warning/exceeded transitions.
   * 002 AC-6.7: Updates ContextHealthStatusBar with budget snapshot.
   */
  async logLLMCall(
    sessionId: string,
    stage: string,
    inputTokens: number,
    outputTokens: number,
    providerId?: string
  ): Promise<void> {
    const entry: ContextUsageLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      stage,
      status: 'healthy',
      tokensUsed: inputTokens + outputTokens,
      tokensLimit: 120000,
      utilizationPercent: 0,
      eventType: 'llm_call',
      llmInputTokens: inputTokens,
      llmOutputTokens: outputTokens,
    };
    await this.log(entry);

    // 002 AC-6.4: Forward to CostBudgetEnforcer for budget tracking
    if (this.costBudgetEnforcer) {
      const snapshot = this.costBudgetEnforcer.recordUsage(inputTokens, outputTokens, providerId);
      this.handleBudgetSnapshot(snapshot);
    }
  }

  /**
   * 002 AC-6.5/6.7: Handle budget snapshot — update status bar and show notifications.
   */
  private handleBudgetSnapshot(snapshot: CostSnapshot): void {
    // AC-6.7: Update status bar with current budget state
    if (this.contextHealthStatusBar && this.costBudgetEnforcer) {
      this.contextHealthStatusBar.setBudgetSnapshot(
        snapshot,
        this.costBudgetEnforcer.getConfig().maxCostUsd
      );
    }

    // AC-6.5: Show notification on warning/exceeded
    if (snapshot.status === 'warning') {
      vscode.window.showWarningMessage(
        `Gofer Budget Warning: $${snapshot.currentCostUsd.toFixed(2)} spent (${Math.round(snapshot.percentUsed)}% of budget)`
      );
    } else if (snapshot.status === 'exceeded') {
      vscode.window.showErrorMessage(
        `Gofer Budget Exceeded: $${snapshot.currentCostUsd.toFixed(2)} spent (${Math.round(snapshot.percentUsed)}% of budget)`
      );
    }
  }

  /**
   * 018 T073: Aggregate costs per stage from the log.
   */
  async aggregateCostsByStage(): Promise<
    Map<string, { calls: number; inputTokens: number; outputTokens: number; totalTokens: number }>
  > {
    const entries = await this.readLog();
    const costs = new Map<
      string,
      { calls: number; inputTokens: number; outputTokens: number; totalTokens: number }
    >();

    for (const entry of entries) {
      if (entry.eventType !== 'llm_call' && entry.eventType !== 'health_check') continue;
      const stage = entry.stage || 'unknown';
      const current = costs.get(stage) || {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      };
      current.calls++;
      current.inputTokens += entry.llmInputTokens || 0;
      current.outputTokens += entry.llmOutputTokens || 0;
      current.totalTokens += (entry.llmInputTokens || 0) + (entry.llmOutputTokens || 0);
      costs.set(stage, current);
    }

    return costs;
  }
}
