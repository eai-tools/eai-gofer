/**
 * Context Compactor Implementation
 *
 * Automatically manages context window limits by summarizing completed work.
 * Triggers at configurable threshold (default 80%) to reduce context by 40-60%.
 *
 * T124-T168: Phase 6 User Story 4 - Automatic Context Compaction
 */

import type {
  ContextCompactor as IContextCompactor,
  CompactionSummary,
  CompactionStrategy,
  Session,
  Task,
  ContextAnalysis,
  ContextBreakdown,
  CompactionPreview,
  CompactorConfig,
} from './compaction';
import { Logger } from '../utils/logger';
import { telemetry } from './telemetryIntegration';

/**
 * ContextCompactor - Manages context window by summarizing completed work
 *
 * Features:
 * - Token usage estimation (chars/4 approximation)
 * - Automatic compaction at threshold (default 80%)
 * - Intelligent task summarization preserving recent work
 * - Fallback truncation strategy
 * - Session state backup/restore
 */
/**
 * T042: Duck-typed interface for LLM summarization.
 */
interface LLMSummarizerLike {
  isAvailable(): boolean;
  isRateLimited(): boolean;
  summarize(prompt: string, maxTokens?: number): Promise<{ text: string } | null>;
}

export class ContextCompactor implements IContextCompactor {
  private config: CompactorConfig;
  private threshold: number;
  private readonly workspacePath: string;
  private readonly logger: Logger;
  private llmProvider?: LLMSummarizerLike;

  /**
   * Default summarization prompt template
   */
  private static readonly DEFAULT_SUMMARY_PROMPT = `Summarize the following completed tasks concisely. Focus on:
- Key decisions made
- Files created or modified
- Final outcomes (success/failure)
- Important learnings or discoveries

Do NOT include:
- Debugging steps
- Trial and error details
- Compilation/linting output
- Verbose file contents

Keep the summary under 500 characters per 5 tasks.

Tasks to summarize:
{tasks}

Summary:`;

  /**
   * Constructor
   *
   * T124: Create ContextCompactor class skeleton
   *
   * @param workspacePath - Path to workspace root
   * @param config - Optional custom configuration
   */
  constructor(workspacePath: string, config?: Partial<CompactorConfig>) {
    this.workspacePath = workspacePath;
    this.threshold = config?.threshold ?? 0.8; // 80% default
    this.logger = Logger.for('ContextCompactor');

    // T134: Create CompactionStrategy default configuration
    const defaultStrategy: CompactionStrategy = {
      preserveLastN: 10,
      summarizeBatchSize: 5,
      summaryPrompt: ContextCompactor.DEFAULT_SUMMARY_PROMPT,
      useFallbackModel: false,
      targetReduction: 50, // 50% reduction target
    };

    this.config = {
      contextWindowSize: config?.contextWindowSize ?? 200000, // Claude 200k tokens
      threshold: this.threshold,
      defaultStrategy: { ...defaultStrategy, ...config?.defaultStrategy },
      autoCompact: config?.autoCompact ?? true,
      enableBackup: config?.enableBackup ?? true,
      maxBackups: config?.maxBackups ?? 5,
    };

    this.logger.debug('ContextCompactor initialized', {
      workspacePath,
      threshold: this.threshold * 100,
      contextWindowSize: this.config.contextWindowSize,
    });
  }

  /**
   * T042: Set optional LLM provider for enhanced task summarization.
   */
  setLLMProvider(provider: LLMSummarizerLike): void {
    this.llmProvider = provider;
  }

  /**
   * T126: Implement estimateTokenUsage() using chars/4 approximation
   *
   * Estimates token count using character count / 4 rule of thumb.
   * Fast approximation suitable for threshold checks.
   *
   * @param context - Text to estimate
   * @returns Estimated token count
   */
  estimateTokenUsage(context: string): number {
    return Math.ceil(context.length / 4);
  }

  /**
   * T128: Implement shouldCompact() checking threshold
   *
   * Determines if compaction should occur based on context usage.
   *
   * @param session - Current session state
   * @returns True if compaction recommended
   */
  async shouldCompact(session: Session): Promise<boolean> {
    const tokens = this.estimateTokenUsage(session.context);
    const usagePercent = tokens / this.config.contextWindowSize;
    const shouldTrigger = usagePercent >= this.threshold;

    // Track threshold check
    telemetry.trackCompactionThreshold(usagePercent * 100, this.threshold * 100, shouldTrigger);

    return shouldTrigger;
  }

  /**
   * T130-T131: Implement analyzeContext() with breakdown and recommendations
   *
   * Analyzes current context usage and provides detailed breakdown.
   *
   * @param session - Current session
   * @returns Detailed context analysis
   */
  async analyzeContext(session: Session): Promise<ContextAnalysis> {
    const estimatedTokens = this.estimateTokenUsage(session.context);
    const usagePercentage = (estimatedTokens / this.config.contextWindowSize) * 100;
    const shouldCompact = usagePercentage >= this.threshold * 100;

    // Simple breakdown estimation
    // In production, would parse context sections
    const breakdown: ContextBreakdown = this.estimateBreakdown(session.context);

    let reason: string;
    if (shouldCompact) {
      reason = `Usage at ${usagePercentage.toFixed(1)}% exceeds threshold of ${this.threshold * 100}%`;
    } else {
      const remaining = this.threshold * 100 - usagePercentage;
      reason = `Usage at ${usagePercentage.toFixed(1)}%, ${remaining.toFixed(1)}% below threshold`;
    }

    // Track context analysis
    telemetry.trackContextAnalysis(estimatedTokens, usagePercentage, shouldCompact);

    return {
      context: session.context,
      estimatedTokens,
      contextWindowSize: this.config.contextWindowSize,
      usagePercentage,
      shouldCompact,
      reason,
      breakdown,
    };
  }

  /**
   * T133: Implement previewCompaction() simulation
   *
   * Previews compaction results without executing.
   *
   * @param session - Session to preview
   * @returns Preview of compaction
   */
  async previewCompaction(session: Session): Promise<CompactionPreview> {
    const strategy = this.config.defaultStrategy;
    const allTasks = session.completedTasks;

    // Determine what would be compacted
    const tasksToPreserve = allTasks.slice(-strategy.preserveLastN);
    const tasksToCompact = allTasks.slice(0, -strategy.preserveLastN);

    const tokensBefore = this.estimateTokenUsage(session.context);

    // Estimate tokens after (assume 50% reduction of compacted portion)
    const compactedPortion =
      tasksToCompact.length / (tasksToCompact.length + tasksToPreserve.length);
    const tokensAfter = Math.ceil(tokensBefore * (1 - compactedPortion * 0.5));
    const tokensSaved = tokensBefore - tokensAfter;

    return {
      tasksToCompact,
      tasksToPreserve,
      tokensBefore,
      tokensAfter,
      tokensSaved,
      reductionPercent: (tokensSaved / tokensBefore) * 100,
      summaryPreview: `Would summarize ${tasksToCompact.length} tasks, preserve ${tasksToPreserve.length} recent tasks`,
    };
  }

  /**
   * T136-T138: Implement summarizeTasks() with LLM
   *
   * Summarizes completed tasks using language model.
   * Focuses on decisions, file changes, and outcomes.
   *
   * @param tasks - Tasks to summarize
   * @param strategy - Compaction strategy
   * @returns Concise summary text
   */
  async summarizeTasks(tasks: Task[], strategy: CompactionStrategy): Promise<string> {
    if (tasks.length === 0) {
      return 'No tasks to summarize.';
    }

    // Format tasks for summary prompt
    const taskDescriptions = tasks
      .map((task, i) => `${i + 1}. ${task.id}: ${task.description}`)
      .join('\n');

    const prompt = strategy.summaryPrompt.replace('{tasks}', taskDescriptions);

    // T042: Use LLM when available, fall back to deterministic summary
    if (this.llmProvider && this.llmProvider.isAvailable() && !this.llmProvider.isRateLimited()) {
      try {
        const result = await this.llmProvider.summarize(prompt, 500);
        if (result && result.text) {
          return result.text;
        }
      } catch (error) {
        this.logger.warn('LLM summarization failed, using fallback', { error });
      }
    }

    return this.generateFallbackSummary(tasks);
  }

  /**
   * T140-T144: Implement compact() core logic
   *
   * Performs context compaction on a session.
   * - Identifies tasks to compact vs preserve
   * - Summarizes older tasks
   * - Builds new context with summary + preserved tasks
   * - Backs up session state
   * - Returns CompactionSummary
   *
   * @param session - Session to compact
   * @param strategyOverride - Optional strategy override
   * @returns Compaction summary
   */
  async compact(
    session: Session,
    strategyOverride?: Partial<CompactionStrategy>
  ): Promise<CompactionSummary> {
    this.logger.info('Starting context compaction', {
      sessionId: session.id,
      completedTasks: session.completedTasks.length,
    });

    const strategy: CompactionStrategy = {
      ...this.config.defaultStrategy,
      ...strategyOverride,
    };

    // T144: Save session state backup before compaction
    if (this.config.enableBackup) {
      await this.backupSession(session);
      this.logger.debug('Session backup created');
    }

    const startTime = Date.now();

    // Identify tasks to compact and preserve
    const allCompletedTaskIds = session.completedTasks;
    const preservedTaskIds = allCompletedTaskIds.slice(-strategy.preserveLastN);
    const compactedTaskIds = allCompletedTaskIds.slice(0, -strategy.preserveLastN);

    // Get task objects (simplified - in production would load from session)
    const compactedTasks: Task[] = compactedTaskIds.map((id) => ({
      id,
      description: `Task ${id}`,
      status: 'completed' as const,
      completedAt: Date.now(),
    }));

    // T136: Summarize tasks
    let summaryText: string;
    try {
      summaryText = await this.summarizeTasks(compactedTasks, strategy);
    } catch (error) {
      console.error('[ContextCompactor] Summarization failed, using fallback:', error);
      summaryText = this.generateFallbackSummary(compactedTasks);
    }

    // T142: Build new context with summary + preserved tasks
    const tokensBefore = this.estimateTokenUsage(session.context);
    const newContext = this.buildCompactedContext(session, summaryText, preservedTaskIds);
    const tokensAfter = this.estimateTokenUsage(newContext);

    // T143: Calculate tokens saved and return CompactionSummary
    const tokensSaved = tokensBefore - tokensAfter;

    const summary: CompactionSummary = {
      sessionId: session.id,
      tasksCompacted: compactedTaskIds,
      summaryText,
      tokensSaved,
      compactedAt: Date.now(),
      preservedTasks: preservedTaskIds,
      strategy,
    };

    // Update session context
    session.context = newContext;
    session.compactionHistory.push(summary);

    const duration = Date.now() - startTime;
    const reductionPercent = Math.round((tokensSaved / tokensBefore) * 100);

    this.logger.info('Context compaction completed', {
      sessionId: session.id,
      tasksCompacted: compactedTaskIds.length,
      tasksPreserved: preservedTaskIds.length,
      tokensSaved,
      reductionPercent,
      duration,
    });

    // Track compaction
    telemetry.trackCompaction(summary);

    return summary;
  }

  /**
   * T155: Implement setThreshold()
   *
   * Sets compaction threshold percentage.
   *
   * @param threshold - Threshold (50-95)
   */
  setThreshold(threshold: number): void {
    if (threshold < 50 || threshold > 95) {
      throw new Error('Threshold must be between 50 and 95');
    }
    this.threshold = threshold / 100;
    this.config.threshold = this.threshold;
  }

  /**
   * T155: Implement getThreshold()
   *
   * Gets current threshold.
   *
   * @returns Threshold percentage
   */
  getThreshold(): number {
    return this.threshold * 100;
  }

  /**
   * Get default compaction strategy.
   *
   * @returns Default strategy
   */
  getDefaultStrategy(): CompactionStrategy {
    return { ...this.config.defaultStrategy };
  }

  /**
   * T161: Implement rollbackCompaction()
   *
   * Restores session from backup.
   *
   * @param session - Session to rollback
   * @returns True if successful
   */
  async rollbackCompaction(session: Session): Promise<boolean> {
    try {
      const backup = await this.loadSessionBackup(session.id);
      if (!backup) {
        telemetry.trackCompactionRollback(session.id, false);
        return false;
      }

      // Restore context and compaction history
      session.context = backup.context;
      session.compactionHistory = backup.compactionHistory.slice(0, -1); // Remove last compaction

      console.log(`[ContextCompactor] Rolled back compaction for session ${session.id}`);
      telemetry.trackCompactionRollback(session.id, true);
      return true;
    } catch (error) {
      console.error('[ContextCompactor] Rollback failed:', error);
      telemetry.trackCompactionRollback(session.id, false);
      return false;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Estimate context breakdown by section.
   * Simplified implementation - production would parse actual sections.
   */
  private estimateBreakdown(context: string): ContextBreakdown {
    const totalTokens = this.estimateTokenUsage(context);

    // Rough estimation based on typical distribution
    return {
      systemPrompt: Math.floor(totalTokens * 0.05),
      tasks: Math.floor(totalTokens * 0.3),
      completedWork: Math.floor(totalTokens * 0.4),
      errors: Math.floor(totalTokens * 0.1),
      memories: Math.floor(totalTokens * 0.05),
      hints: Math.floor(totalTokens * 0.05),
      other: Math.floor(totalTokens * 0.05),
    };
  }

  /**
   * T158: Generate fallback summary without LLM.
   * Simple truncation strategy preserving essential info.
   */
  private generateFallbackSummary(tasks: Task[]): string {
    if (tasks.length === 0) {
      return 'No completed tasks.';
    }

    const completedCount = tasks.filter((t) => t.status === 'completed').length;
    const failedCount = tasks.filter((t) => t.status === 'failed').length;

    const filesAffected = new Set<string>();
    tasks.forEach((task) => {
      task.affectedFiles?.forEach((file) => filesAffected.add(file));
    });

    let summary = `Completed ${completedCount} tasks`;
    if (failedCount > 0) {
      summary += `, ${failedCount} failed`;
    }
    if (filesAffected.size > 0) {
      summary += `. Modified ${filesAffected.size} files`;
    }
    summary += '.';

    // Add sample task IDs
    if (tasks.length > 5) {
      const sampleIds = tasks.slice(0, 3).map((t) => t.id);
      summary += ` Tasks: ${sampleIds.join(', ')}, ...`;
    } else {
      const ids = tasks.map((t) => t.id);
      summary += ` Tasks: ${ids.join(', ')}`;
    }

    return summary;
  }

  /**
   * Build new context with summary replacing compacted tasks.
   */
  private buildCompactedContext(
    session: Session,
    summaryText: string,
    preservedTaskIds: string[]
  ): string {
    // Simplified implementation
    // Production would parse context, replace compacted section with summary

    const header = `# Autonomous Execution Session: ${session.specId}\n\n`;
    const summary = `## Completed Work Summary\n${summaryText}\n\n`;
    const preserved = `## Recent Tasks (Last ${preservedTaskIds.length})\n${preservedTaskIds.join(', ')}\n`;

    return header + summary + preserved;
  }

  /**
   * T162: Backup session state to disk.
   */
  private async backupSession(session: Session): Promise<void> {
    const path = require('path');
    const fs = require('fs').promises;

    const backupDir = path.join(this.workspacePath, '.specify', 'state', 'sessions', 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    const backupPath = path.join(backupDir, `${session.id}-${Date.now()}.json`);
    const contextSize = session.context.length;

    await fs.writeFile(
      backupPath,
      JSON.stringify(
        {
          id: session.id,
          context: session.context,
          compactionHistory: session.compactionHistory,
          backedUpAt: Date.now(),
        },
        null,
        2
      ),
      'utf-8'
    );

    // Track backup
    telemetry.trackSessionBackup(session.id, contextSize);

    // Clean up old backups (keep only maxBackups)
    const backups = await fs.readdir(backupDir);
    const sessionBackups = backups.filter((f: string) => f.startsWith(session.id));

    if (sessionBackups.length > this.config.maxBackups) {
      const toDelete = sessionBackups
        .sort()
        .slice(0, sessionBackups.length - this.config.maxBackups);
      for (const backup of toDelete) {
        await fs.unlink(path.join(backupDir, backup));
      }
    }
  }

  /**
   * Load session backup from disk.
   */
  private async loadSessionBackup(
    sessionId: string
  ): Promise<{ context: string; compactionHistory: CompactionSummary[] } | null> {
    const path = require('path');
    const fs = require('fs').promises;

    const backupDir = path.join(this.workspacePath, '.specify', 'state', 'sessions', 'backups');

    try {
      const backups = await fs.readdir(backupDir);
      const sessionBackups = backups
        .filter((f: string) => f.startsWith(sessionId))
        .sort()
        .reverse();

      if (sessionBackups.length === 0) {
        return null;
      }

      const latestBackup = sessionBackups[0];
      const backupPath = path.join(backupDir, latestBackup);
      const data = await fs.readFile(backupPath, 'utf-8');

      return JSON.parse(data);
    } catch (error) {
      console.error('[ContextCompactor] Failed to load backup:', error);
      return null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 018 T078: Debounce/cooldown to prevent rapid compaction cycles
  // ──────────────────────────────────────────────────────────────────────────

  private lastCompactionTime = 0;
  private readonly compactionCooldownMs = 5 * 60 * 1000; // 5 minute cooldown

  /**
   * Check if compaction is allowed (respects cooldown).
   */
  isCompactionAllowed(): boolean {
    return Date.now() - this.lastCompactionTime > this.compactionCooldownMs;
  }

  /**
   * 018 T077: Monitor context health and trigger compaction on critical events.
   * Returns true if compaction was triggered.
   */
  async monitorAndCompactContext(session: Session): Promise<boolean> {
    if (!this.isCompactionAllowed()) {
      this.logger.debug('Compaction skipped (cooldown active)');
      return false;
    }

    const shouldTrigger = await this.shouldCompact(session);
    if (!shouldTrigger) return false;

    this.lastCompactionTime = Date.now();
    const summary = await this.compact(session);
    this.logCompactionTelemetry(summary);
    return true;
  }

  /**
   * 018 T079: Log compaction telemetry for observability.
   */
  private logCompactionTelemetry(summary: CompactionSummary): void {
    const telemetryEntry = {
      timestamp: new Date().toISOString(),
      eventType: 'compaction',
      sessionId: summary.sessionId,
      tasksCompacted: summary.tasksCompacted.length,
      tasksPreserved: summary.preservedTasks.length,
      tokensSaved: summary.tokensSaved,
    };
    this.logger.info('Compaction telemetry', telemetryEntry);
    // Also write to JSONL log
    const pathModule = require('path') as typeof import('path');
    const logDir = pathModule.join(this.workspacePath, '.specify', 'logs');
    const logPath = pathModule.join(logDir, 'context-usage.jsonl');
    try {
      require('fs').mkdirSync(logDir, { recursive: true });
      require('fs').appendFileSync(logPath, JSON.stringify(telemetryEntry) + '\n');
    } catch {
      // Best-effort telemetry
    }
  }
}
