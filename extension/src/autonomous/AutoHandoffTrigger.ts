/**
 * AutoHandoffTrigger - Automatic Context Reduction at Critical Thresholds
 *
 * Monitors context health and automatically reduces AI slop when context
 * usage exceeds 70% (critical threshold). Runs SlopReducer on the entire
 * workspace and shows a summary notification.
 *
 * Key Features:
 * - Listens for critical health events from ContextHealthMonitor
 * - Automatically runs SlopReducer.reduceWorkspace() at 70%
 * - Shows summary of what was cleaned up
 * - Falls back to save/reseed options if no slop found
 *
 * @see .specify/specs/011-context-health-recursive-memory/tasks.md T030-T033
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ContextHealthMonitor, type ContextHealthStatus } from './ContextHealthMonitor';
import { ContextUsageLogger } from './ContextUsageLogger';
import type { ContextBuilder } from './ContextBuilder';
import type { TaskContext } from './ContextBuilder';
import { Logger } from '../utils/logger';
import { CheckpointValidator } from './CheckpointValidator';
import type { SlopReducer, WorkspaceReduceResult } from './SlopReducer';
import type { IPty } from 'node-pty';

/**
 * Configuration for auto-handoff trigger.
 */
export interface AutoHandoffConfig {
  /** Enable auto-handoff notifications (default: true) */
  enabled: boolean;
  /** Cooldown between notifications in milliseconds (default: 5 minutes) */
  notificationCooldownMs: number;
  /** Auto-dismiss notification after milliseconds (default: none) */
  autoDismissMs?: number;
  /** Show notification at warning level too (default: false) */
  notifyAtWarning: boolean;
  /** Auto-execute session save at threshold (default: false) */
  autoExecuteSave: boolean;
  /** Threshold for auto-save trigger (default: 0.69 = 69%) */
  autoSaveThreshold: number;
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: AutoHandoffConfig = {
  enabled: true,
  notificationCooldownMs: 5 * 60 * 1000, // 5 minutes
  autoDismissMs: undefined,
  notifyAtWarning: false,
  autoExecuteSave: false,
  autoSaveThreshold: 0.69,
};

/**
 * Handoff document generation options.
 */
export interface HandoffDocumentOptions {
  /** Current session ID */
  sessionId: string;
  /** Current Gofer stage */
  currentStage: string;
  /** Current task being worked on */
  currentTask?: string;
  /** Additional context to include */
  additionalContext?: string;
  /** Key decisions made during session */
  keyDecisions?: string[];
  /** Blockers or issues encountered */
  blockers?: string[];
}

/**
 * Result of handoff trigger action.
 */
export interface HandoffTriggerResult {
  /** Whether handoff was triggered */
  triggered: boolean;
  /** User's selected action */
  action: 'save' | 'dismiss' | 'remind-later' | 'reseed' | 'auto-dismissed' | 'disabled';
  /** Timestamp of the action */
  timestamp: number;
  /** Health status that triggered the handoff */
  healthStatus?: ContextHealthStatus;
}

/**
 * AutoHandoffTrigger manages automatic session handoff at critical thresholds.
 */
export class AutoHandoffTrigger implements vscode.Disposable {
  private readonly config: AutoHandoffConfig;
  private readonly logger: Logger;
  private readonly disposables: vscode.Disposable[] = [];
  private monitor: ContextHealthMonitor | null = null;
  private usageLogger: ContextUsageLogger | null = null;
  private contextBuilder: ContextBuilder | null = null;
  private slopReducer: SlopReducer | null = null;
  private claudePtyProcess: IPty | null = null;
  private lastNotificationTime: number = 0;
  private currentSessionId: string = '';
  private currentStage: string = 'implement';
  private currentTask: string = '';
  private pendingNotification: boolean = false;
  private workspaceRoot: string = '';

  /**
   * Creates a new AutoHandoffTrigger instance.
   *
   * @param config - Optional partial configuration
   */
  // T006: CheckpointValidator for handoff document validation
  private readonly checkpointValidator = new CheckpointValidator();

  constructor(config?: Partial<AutoHandoffConfig>, workspaceRoot?: string) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.workspaceRoot = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.logger = Logger.for('AutoHandoffTrigger');
    this.logger.debug('AutoHandoffTrigger initialized', { config: this.config });
  }

  /**
   * Connects to a ContextHealthMonitor for event handling.
   *
   * @param monitor - ContextHealthMonitor instance
   */
  connect(monitor: ContextHealthMonitor): void {
    this.monitor = monitor;

    // Listen for auto-save threshold events (69% by default)
    const autoSaveHandler = (status: ContextHealthStatus): void => {
      this.handleAutoSaveThreshold(status);
    };

    // Listen for critical events
    const criticalHandler = (status: ContextHealthStatus): void => {
      this.handleCriticalStatus(status);
    };

    // Listen for handoff-recommended events
    const handoffHandler = (status: ContextHealthStatus): void => {
      this.handleHandoffRecommended(status);
    };

    // Optionally listen for warning events
    if (this.config.notifyAtWarning) {
      const warningHandler = (status: ContextHealthStatus): void => {
        this.handleWarningStatus(status);
      };
      monitor.on('warning', warningHandler);
      this.disposables.push({
        dispose: () => monitor.off('warning', warningHandler),
      });
    }

    monitor.on('auto-save', autoSaveHandler);
    monitor.on('critical', criticalHandler);
    monitor.on('handoff-recommended', handoffHandler);

    this.disposables.push({
      dispose: () => {
        monitor.off('auto-save', autoSaveHandler);
        monitor.off('critical', criticalHandler);
        monitor.off('handoff-recommended', handoffHandler);
      },
    });

    this.logger.debug('Connected to ContextHealthMonitor');
  }

  /**
   * Sets the usage logger for tracking handoff events.
   *
   * @param logger - ContextUsageLogger instance
   */
  setUsageLogger(logger: ContextUsageLogger): void {
    this.usageLogger = logger;
  }

  /**
   * Sets the ContextBuilder for reseed support (T035).
   *
   * @param builder - ContextBuilder instance
   */
  setContextBuilder(builder: ContextBuilder): void {
    this.contextBuilder = builder;
  }

  /**
   * Sets the SlopReducer for automatic workspace reduction at critical threshold.
   */
  setSlopReducer(reducer: SlopReducer): void {
    this.slopReducer = reducer;
  }

  /**
   * Sets the Claude Code pty process for sending /compact commands.
   */
  setClaudePtyProcess(pty: IPty | null): void {
    this.claudePtyProcess = pty;
  }

  /**
   * Sets the current session context.
   *
   * @param sessionId - Session identifier
   * @param stage - Current Gofer stage
   * @param task - Current task description
   */
  setSessionContext(sessionId: string, stage: string, task?: string): void {
    this.currentSessionId = sessionId;
    this.currentStage = stage;
    this.currentTask = task || '';
    this.logger.debug('Session context updated', { sessionId, stage, task });
  }

  /**
   * Handles auto-save threshold crossing (69% by default).
   * Automatically executes /7_gofer_save if autoExecuteSave is enabled.
   */
  private async handleAutoSaveThreshold(status: ContextHealthStatus): Promise<void> {
    // Only act on real session data — filesystem estimates are not context usage
    if (status.dataSource !== 'real') {
      return;
    }

    this.logger.info('Auto-save threshold reached', {
      threshold: this.config.autoSaveThreshold,
      utilization: status.utilizationPercent,
      tokensUsed: status.tokensUsed,
    });

    // If auto-execute is enabled, automatically run /7_gofer_save
    if (this.config.autoExecuteSave) {
      await this.executeAutoSave(status);
    } else {
      // Otherwise, just show an information notification
      const percent = Math.round(status.utilizationPercent);
      void vscode.window
        .showInformationMessage(
          `Gofer: Context at ${percent}% (auto-save threshold). Consider running /7_gofer_save to create a checkpoint.`,
          'Save Now',
          'Later'
        )
        .then((choice) => {
          if (choice === 'Save Now' && this.claudePtyProcess) {
            this.claudePtyProcess.write('/7_gofer_save\r');
          }
        });
    }
  }

  /**
   * Automatically executes /7_gofer_save to create a session checkpoint.
   *
   * Flow:
   * 1. Send /7_gofer_save command to Claude Code terminal
   * 2. Log the auto-save event
   * 3. Show confirmation notification
   */
  private async executeAutoSave(status: ContextHealthStatus): Promise<void> {
    if (!this.config.enabled) return;
    if (this.isInCooldown()) return;
    if (this.pendingNotification) return;

    this.pendingNotification = true;
    this.lastNotificationTime = Date.now();

    try {
      this.logger.info('Executing automatic session save at 69% threshold');

      // Send /7_gofer_save to Claude Code terminal
      const saved = this.sendSaveToTerminal();

      // Log the event
      if (this.usageLogger) {
        await this.usageLogger.logHandoff(
          this.currentSessionId || status.sessionId || 'unknown',
          this.currentStage,
          status.status,
          status.tokensUsed,
          status.tokensLimit,
          status.utilizationPercent,
          `auto-save: executed at ${status.utilizationPercent.toFixed(1)}%`
        );
      }

      // Show notification
      const percent = Math.round(status.utilizationPercent);
      if (saved) {
        vscode.window.showInformationMessage(
          `Gofer: Context at ${percent}% — session automatically saved via /7_gofer_save. Continue working or start fresh session with /8_gofer_resume.`
        );
      } else {
        vscode.window.showWarningMessage(
          `Gofer: Context at ${percent}% — attempted auto-save but no active Claude Code terminal found. Please save manually with /7_gofer_save.`
        );
      }
    } finally {
      this.pendingNotification = false;
    }
  }

  /**
   * Sends /7_gofer_save command to the Claude Code terminal.
   *
   * @returns true if command was sent successfully, false if no terminal available
   */
  private sendSaveToTerminal(): boolean {
    if (!this.claudePtyProcess) {
      this.logger.warn('No Claude Code pty process available for auto-save');
      return false;
    }

    try {
      this.claudePtyProcess.write('/7_gofer_save\r');
      this.logger.info('Sent /7_gofer_save command to Claude Code terminal');
      return true;
    } catch (error) {
      this.logger.error('Failed to send /7_gofer_save to terminal', error as Error);
      return false;
    }
  }

  /**
   * Handles critical health status event.
   * Automatically runs slop reduction on the workspace, then shows a summary.
   */
  private async handleCriticalStatus(status: ContextHealthStatus): Promise<void> {
    // Only act on real session data — filesystem estimates are not context usage
    if (status.dataSource !== 'real') {
      return;
    }

    this.logger.info('Critical health status detected', {
      utilization: status.utilizationPercent,
      tokensUsed: status.tokensUsed,
    });

    // Auto-reduce slop if SlopReducer is available
    if (this.slopReducer) {
      await this.autoReduceSlop(status);
    } else {
      await this.triggerHandoffNotification(status, 'critical');
    }
  }

  /**
   * Automatically cleans workspace files, then compacts the Claude Code context.
   *
   * Flow:
   * 1. Run SlopReducer on workspace files (removes console.log, debugger, etc.)
   * 2. Send /compact to Claude Code terminal (rebuilds context from clean files)
   * 3. Show notification summarizing what was done
   */
  private async autoReduceSlop(status: ContextHealthStatus): Promise<void> {
    if (!this.config.enabled) return;
    if (this.isInCooldown()) return;
    if (this.pendingNotification) return;

    this.pendingNotification = true;
    this.lastNotificationTime = Date.now();

    try {
      // Step 1: Clean workspace files
      this.logger.info('Running automatic slop reduction at critical threshold');
      const result = this.slopReducer!.reduceWorkspace();

      // Step 2: Send /compact to Claude Code terminal to rebuild context
      const compacted = this.sendCompactToTerminal();

      // Log the event
      if (this.usageLogger) {
        await this.usageLogger.logHandoff(
          this.currentSessionId || status.sessionId || 'unknown',
          this.currentStage,
          status.status,
          status.tokensUsed,
          status.tokensLimit,
          status.utilizationPercent,
          `auto-context-clean: ${result.totalFixes} file fixes, compacted=${compacted}`
        );
      }

      // Step 3: Show summary notification
      const percent = Math.round(status.utilizationPercent);
      if (result.totalFixes > 0 && compacted) {
        const patternSummary = Object.entries(result.fixesByPattern)
          .map(([pattern, count]) => `${pattern}: ${count}`)
          .join(', ');

        vscode.window.showInformationMessage(
          `Gofer: Context at ${percent}% — cleaned ${result.totalFixes} issues in ${result.filesFixed} files (${patternSummary}) and compacted context`
        );
      } else if (compacted) {
        vscode.window.showInformationMessage(
          `Gofer: Context at ${percent}% — workspace clean, context compacted for fresh start`
        );
      } else if (result.totalFixes > 0) {
        vscode.window.showInformationMessage(
          `Gofer: Cleaned ${result.totalFixes} issues in ${result.filesFixed} files. No active terminal for compaction.`
        );
      } else {
        vscode.window.showInformationMessage(
          `Gofer: Context at ${percent}% — workspace already clean. Use /compact in Claude Code to free context.`
        );
      }
    } finally {
      this.pendingNotification = false;
    }
  }

  /**
   * Sends /compact to the active Claude Code pty process.
   * Returns true if the command was sent successfully.
   */
  private sendCompactToTerminal(): boolean {
    if (!this.claudePtyProcess) {
      this.logger.warn('No Claude Code pty process available for /compact');
      return false;
    }

    try {
      // Send /compact followed by Enter to the Claude Code CLI
      this.claudePtyProcess.write('/compact\r');
      this.logger.info('Sent /compact to Claude Code terminal');
      return true;
    } catch (error) {
      this.logger.error('Failed to send /compact to terminal', error as Error);
      return false;
    }
  }

  /**
   * Handles handoff-recommended event.
   *
   * @param status - Health status with handoff recommendation
   */
  private async handleHandoffRecommended(status: ContextHealthStatus): Promise<void> {
    // Only notify for real session data
    if (status.dataSource !== 'real') {
      return;
    }

    this.logger.info('Handoff recommended', {
      utilization: status.utilizationPercent,
      recommendations: status.recommendations,
    });

    await this.triggerHandoffNotification(status, 'handoff-recommended');
  }

  /**
   * Handles warning health status event (if configured).
   *
   * @param status - Warning health status
   */
  private async handleWarningStatus(status: ContextHealthStatus): Promise<void> {
    // Only notify for real session data
    if (status.dataSource !== 'real') {
      return;
    }

    this.logger.debug('Warning health status detected', {
      utilization: status.utilizationPercent,
    });

    // Only show warning notification if not in cooldown
    if (this.isInCooldown()) {
      return;
    }

    await this.triggerHandoffNotification(status, 'warning');
  }

  /**
   * Triggers the handoff notification.
   *
   * @param status - Health status that triggered notification
   * @param reason - Reason for triggering
   * @returns Promise<HandoffTriggerResult>
   */
  async triggerHandoffNotification(
    status: ContextHealthStatus,
    reason: 'critical' | 'warning' | 'handoff-recommended'
  ): Promise<HandoffTriggerResult> {
    if (!this.config.enabled) {
      this.logger.debug('Auto-handoff disabled, skipping notification');
      return {
        triggered: false,
        action: 'disabled',
        timestamp: Date.now(),
        healthStatus: status,
      };
    }

    if (this.isInCooldown()) {
      this.logger.debug('Notification in cooldown period', {
        lastNotification: this.lastNotificationTime,
        cooldown: this.config.notificationCooldownMs,
      });
      return {
        triggered: false,
        action: 'dismiss',
        timestamp: Date.now(),
        healthStatus: status,
      };
    }

    if (this.pendingNotification) {
      this.logger.debug('Notification already pending');
      return {
        triggered: false,
        action: 'dismiss',
        timestamp: Date.now(),
        healthStatus: status,
      };
    }

    this.pendingNotification = true;
    this.lastNotificationTime = Date.now();

    const result = await this.showHandoffNotification(status, reason);

    this.pendingNotification = false;

    // Log the handoff event
    if (this.usageLogger) {
      await this.usageLogger.logHandoff(
        this.currentSessionId || status.sessionId || 'unknown',
        this.currentStage,
        status.status,
        status.tokensUsed,
        status.tokensLimit,
        status.utilizationPercent,
        `${reason}: ${result.action}`
      );
    }

    return result;
  }

  /**
   * Shows the handoff notification to the user.
   *
   * @param status - Health status
   * @param reason - Reason for notification
   * @returns Promise<HandoffTriggerResult>
   */
  private async showHandoffNotification(
    status: ContextHealthStatus,
    reason: 'critical' | 'warning' | 'handoff-recommended'
  ): Promise<HandoffTriggerResult> {
    const title = this.getNotificationTitle(status, reason);
    const message = this.getNotificationMessage(status, reason);

    const saveAction = 'Save & Continue Later';
    const reseedAction = 'Reseed Context';
    const dismissAction = 'Dismiss';
    const remindAction = 'Remind in 10 min';

    this.logger.debug('Showing handoff notification', { title, reason });

    const showNotification =
      reason === 'warning' ? vscode.window.showWarningMessage : vscode.window.showWarningMessage;

    const selection = await showNotification(
      `${title}\n${message}`,
      { modal: false },
      saveAction,
      reseedAction,
      dismissAction,
      remindAction
    );

    if (!selection) {
      // User dismissed the notification
      return {
        triggered: true,
        action: 'dismiss',
        timestamp: Date.now(),
        healthStatus: status,
      };
    }

    switch (selection) {
      case saveAction:
        await this.executeSaveAndHandoff(status);
        return {
          triggered: true,
          action: 'save',
          timestamp: Date.now(),
          healthStatus: status,
        };

      case reseedAction:
        await this.executeReseed(status);
        return {
          triggered: true,
          action: 'reseed',
          timestamp: Date.now(),
          healthStatus: status,
        };

      case remindAction:
        // Reset cooldown to 10 minutes
        this.lastNotificationTime =
          Date.now() - this.config.notificationCooldownMs + 10 * 60 * 1000;
        return {
          triggered: true,
          action: 'remind-later',
          timestamp: Date.now(),
          healthStatus: status,
        };

      default:
        return {
          triggered: true,
          action: 'dismiss',
          timestamp: Date.now(),
          healthStatus: status,
        };
    }
  }

  /**
   * Gets the notification title based on reason.
   *
   * @param status - Health status
   * @param reason - Notification reason
   * @returns Title string
   */
  private getNotificationTitle(
    status: ContextHealthStatus,
    reason: 'critical' | 'warning' | 'handoff-recommended'
  ): string {
    const percent = Math.round(status.utilizationPercent);
    switch (reason) {
      case 'critical':
        return `⚠️ Context Critical (${percent}%)`;
      case 'handoff-recommended':
        return `📋 Handoff Recommended (${percent}%)`;
      case 'warning':
        return `⚡ Context Warning (${percent}%)`;
    }
  }

  /**
   * Gets the notification message based on status.
   *
   * @param status - Health status
   * @param reason - Notification reason
   * @returns Message string
   */
  private getNotificationMessage(
    status: ContextHealthStatus,
    reason: 'critical' | 'warning' | 'handoff-recommended'
  ): string {
    const recommendation = status.recommendations[0] || 'Consider saving your progress.';

    if (reason === 'critical') {
      return `Context window is nearly full. ${recommendation} Save your session to continue later with a fresh context.`;
    }

    if (reason === 'handoff-recommended') {
      return `${recommendation} This is a good time to save your progress.`;
    }

    return `${recommendation}`;
  }

  /**
   * Executes a context reseed to reclaim context space (T035).
   * Clears stale observations and rebuilds from memory store.
   *
   * @param status - Health status at time of reseed
   */
  private async executeReseed(status: ContextHealthStatus): Promise<void> {
    this.logger.info('Executing context reseed', {
      sessionId: this.currentSessionId,
      stage: this.currentStage,
      utilizationBefore: status.utilizationPercent,
    });

    try {
      if (this.contextBuilder) {
        const task: TaskContext = {
          taskId: this.currentTask || 'current',
          specId: '',
          description: this.currentTask || 'Active task',
        };
        await this.contextBuilder.reseedContext(task);
        vscode.window.showInformationMessage(
          'Context reseeded. Stale observations cleared and memories refreshed.'
        );
        this.logger.info('Context reseed completed');
      } else {
        vscode.window.showWarningMessage(
          'Context reseed unavailable. No ContextBuilder connected. Consider saving instead.'
        );
      }
    } catch (error) {
      this.logger.error('Failed to reseed context', error as Error);
      vscode.window.showErrorMessage(`Context reseed failed: ${(error as Error).message}`);
    }
  }

  /**
   * Executes the save and handoff workflow.
   *
   * @param status - Health status at time of handoff
   */
  private async executeSaveAndHandoff(status: ContextHealthStatus): Promise<void> {
    this.logger.info('Executing save and handoff', {
      sessionId: this.currentSessionId,
      stage: this.currentStage,
    });

    try {
      // Generate handoff document content
      const handoffContent = this.generateHandoffDocument(status, {
        sessionId: this.currentSessionId,
        currentStage: this.currentStage,
        currentTask: this.currentTask,
      });

      // Try to execute the gofer.saveProgress command
      await vscode.commands.executeCommand('gofer.saveProgress', {
        handoffContent,
        healthStatus: status,
        reason: 'auto-handoff',
      });

      vscode.window.showInformationMessage(
        `Session saved successfully. Resume with /8_gofer_resume when ready.`
      );

      this.logger.info('Handoff completed successfully');
    } catch (error) {
      this.logger.error('Failed to execute save and handoff', error as Error);
      vscode.window.showErrorMessage(`Failed to save session: ${(error as Error).message}`);
    }
  }

  /**
   * Generates the handoff document content.
   *
   * @param status - Current health status
   * @param options - Handoff options
   * @returns Markdown content for session-handoff.md
   */
  generateHandoffDocument(status: ContextHealthStatus, options: HandoffDocumentOptions): string {
    const timestamp = new Date().toISOString();
    const breakdown = status.breakdown;

    const lines = [
      '---',
      `session_id: ${options.sessionId || 'auto-generated'}`,
      `timestamp: ${timestamp}`,
      `stage: ${options.currentStage}`,
      `context_utilization: ${Math.round(status.utilizationPercent)}%`,
      `status: ${status.status}`,
      '---',
      '',
      '# Session Handoff',
      '',
      '## Context Health Snapshot',
      '',
      `- **Status**: ${status.status.toUpperCase()}`,
      `- **Utilization**: ${Math.round(status.utilizationPercent)}% (${status.tokensUsed.toLocaleString()} / ${status.tokensLimit.toLocaleString()} tokens)`,
      '',
      '### Token Breakdown',
      '',
      `| Category | Tokens | % of Total |`,
      `|----------|--------|------------|`,
      `| Conversation | ${breakdown.conversation.toLocaleString()} | ${this.percentage(breakdown.conversation, status.tokensUsed)}% |`,
      `| Observations | ${breakdown.observations.toLocaleString()} | ${this.percentage(breakdown.observations, status.tokensUsed)}% |`,
      `| Spec Artifacts | ${breakdown.specArtifacts.toLocaleString()} | ${this.percentage(breakdown.specArtifacts, status.tokensUsed)}% |`,
      `| Memories | ${breakdown.memories.toLocaleString()} | ${this.percentage(breakdown.memories, status.tokensUsed)}% |`,
      `| Hints | ${breakdown.hints.toLocaleString()} | ${this.percentage(breakdown.hints, status.tokensUsed)}% |`,
      `| System Files | ${breakdown.systemFiles.toLocaleString()} | ${this.percentage(breakdown.systemFiles, status.tokensUsed)}% |`,
      '',
      '## Current Progress',
      '',
      `**Stage**: ${options.currentStage}`,
    ];

    if (options.currentTask) {
      lines.push(`**Current Task**: ${options.currentTask}`);
    }

    lines.push('');

    if (options.keyDecisions && options.keyDecisions.length > 0) {
      lines.push('### Key Decisions');
      lines.push('');
      for (const decision of options.keyDecisions) {
        lines.push(`- ${decision}`);
      }
      lines.push('');
    }

    if (options.blockers && options.blockers.length > 0) {
      lines.push('### Blockers');
      lines.push('');
      for (const blocker of options.blockers) {
        lines.push(`- ${blocker}`);
      }
      lines.push('');
    }

    if (status.recommendations.length > 0) {
      lines.push('## Recommendations');
      lines.push('');
      for (const rec of status.recommendations) {
        lines.push(`- ${rec}`);
      }
      lines.push('');
    }

    // Include failed approaches from JSONL if they exist
    const failedApproachesContent = this.readFailedApproaches();
    if (failedApproachesContent) {
      lines.push('## Failed Approaches');
      lines.push('');
      lines.push(failedApproachesContent);
      lines.push('');
    }

    // Include session memories from JSONL if they exist
    const sessionMemoriesContent = this.readSessionMemories();
    if (sessionMemoriesContent) {
      lines.push('## Session Memories');
      lines.push('');
      lines.push(sessionMemoriesContent);
      lines.push('');
    }

    if (options.additionalContext) {
      lines.push('## Additional Context');
      lines.push('');
      lines.push(options.additionalContext);
      lines.push('');
    }

    // T049: Include observation cache and knowledge graph stats
    lines.push('## Context State Summary');
    lines.push('');
    if (this.contextBuilder) {
      const masker = this.contextBuilder.getObservationMasker();
      const allObs = masker.getAllObservations();
      const tiers = { full: 0, keyPoints: 0, masked: 0 };
      let totalObsTokens = 0;
      for (const obs of allObs) {
        if (obs.decayTier === 'full') tiers.full++;
        else if (obs.decayTier === 'key-points') tiers.keyPoints++;
        else tiers.masked++;
        totalObsTokens += obs.tokenEstimate;
      }
      lines.push(
        `- **Observation Cache**: ${allObs.length} entries (Full: ${tiers.full}, Key-Points: ${tiers.keyPoints}, Masked: ${tiers.masked}), ~${totalObsTokens.toLocaleString()} tokens`
      );

      const kg = this.contextBuilder.getKnowledgeGraph();
      if (kg) {
        const stats = kg.getStats();
        lines.push(`- **Knowledge Graph**: ${stats.nodeCount} nodes, ${stats.edgeCount} edges`);
      }
    }
    lines.push('');

    lines.push('## Resume Instructions');
    lines.push('');
    lines.push('1. Start a new Claude session');
    lines.push('2. Run `/8_gofer_resume`');
    lines.push('3. The session will be restored with this context');
    lines.push('');
    lines.push('---');
    lines.push(`*Generated automatically at ${timestamp}*`);

    const document = lines.join('\n');

    // T006: Validate handoff document before returning
    const validation = this.checkpointValidator.validate(document);
    if (validation.warnings.length > 0) {
      this.logger.warn('Handoff document validation warnings', { warnings: validation.warnings });
    }
    if (!validation.valid) {
      this.logger.warn('Handoff document validation errors', { errors: validation.errors });
    }

    return document;
  }

  /**
   * Reads failed approaches from JSONL file and formats as markdown.
   * Returns null if no entries exist.
   */
  private readFailedApproaches(): string | null {
    if (!this.workspaceRoot) return null;
    const filePath = path.join(this.workspaceRoot, '.specify/logs/failed-approaches.jsonl');
    return this.readJsonlEntries(filePath, (entry: Record<string, unknown>) => {
      const approach = entry.approach || 'Unknown approach';
      const reason = entry.reason || 'No reason given';
      return `- **${approach}**: ${reason}`;
    });
  }

  /**
   * Reads session memories from JSONL file and formats as markdown.
   * Returns null if no entries exist.
   */
  private readSessionMemories(): string | null {
    if (!this.workspaceRoot) return null;
    const filePath = path.join(this.workspaceRoot, '.specify/logs/session-memory.jsonl');
    return this.readJsonlEntries(filePath, (entry: Record<string, unknown>) => {
      const type = entry.type || 'learning';
      const content = entry.content || '';
      const taskId = entry.taskId || '';
      return `- **[${type}]** ${taskId ? `(${taskId}) ` : ''}${content}`;
    });
  }

  /**
   * Reads entries from a JSONL file and formats them with a formatter function.
   * Returns null if file doesn't exist or has no entries.
   */
  private readJsonlEntries(
    filePath: string,
    formatter: (entry: Record<string, unknown>) => string
  ): string | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim().length > 0);
      if (lines.length === 0) return null;

      const formatted: string[] = [];
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as Record<string, unknown>;
          formatted.push(formatter(entry));
        } catch {
          continue; // Skip invalid JSONL lines
        }
      }
      return formatted.length > 0 ? formatted.join('\n') : null;
    } catch {
      return null;
    }
  }

  /**
   * Calculates percentage for breakdown.
   *
   * @param value - Value
   * @param total - Total
   * @returns Percentage string
   */
  private percentage(value: number, total: number): string {
    if (total === 0) {
      return '0';
    }
    return Math.round((value / total) * 100).toString();
  }

  /**
   * Checks if notification is in cooldown period.
   *
   * @returns True if in cooldown
   */
  private isInCooldown(): boolean {
    return Date.now() - this.lastNotificationTime < this.config.notificationCooldownMs;
  }

  /**
   * Manually triggers a handoff check.
   *
   * @returns Promise<HandoffTriggerResult | null>
   */
  async checkAndTrigger(): Promise<HandoffTriggerResult | null> {
    if (!this.monitor) {
      this.logger.warn('Cannot check: no monitor connected');
      return null;
    }

    const status = this.monitor.checkHealth();
    if (!status) {
      return null;
    }

    if (status.status === 'critical') {
      return this.triggerHandoffNotification(status, 'critical');
    }

    if (status.status === 'warning' && this.config.notifyAtWarning) {
      return this.triggerHandoffNotification(status, 'warning');
    }

    return null;
  }

  /**
   * Gets the current configuration.
   *
   * @returns Current configuration copy
   */
  getConfig(): AutoHandoffConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration.
   *
   * @param config - Partial configuration to merge
   */
  updateConfig(config: Partial<AutoHandoffConfig>): void {
    Object.assign(this.config, config);
    this.logger.debug('Configuration updated', { config: this.config });
  }

  /**
   * Resets the cooldown timer.
   */
  resetCooldown(): void {
    this.lastNotificationTime = 0;
    this.logger.debug('Cooldown reset');
  }

  /**
   * Disposes all resources.
   */
  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
    this.logger.debug('AutoHandoffTrigger disposed');
  }
}
