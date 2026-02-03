/**
 * AutoHandoffTrigger - Automatic Session Handoff at Critical Thresholds
 *
 * Monitors context health and triggers session handoff when context usage
 * exceeds critical thresholds. Integrates with VSCode notifications and
 * the Gofer save workflow.
 *
 * Key Features:
 * - Listens for critical health events
 * - Shows warning notification with actionable options
 * - Integrates with /7_gofer_save command
 * - Generates session-handoff.md content
 *
 * @see .specify/specs/011-context-health-recursive-memory/tasks.md T030-T033
 */

import * as vscode from 'vscode';
import { ContextHealthMonitor, type ContextHealthStatus } from './ContextHealthMonitor';
import { ContextUsageLogger } from './ContextUsageLogger';
import { Logger } from '../utils/logger';

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
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: AutoHandoffConfig = {
  enabled: true,
  notificationCooldownMs: 5 * 60 * 1000, // 5 minutes
  autoDismissMs: undefined,
  notifyAtWarning: false,
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
  action: 'save' | 'dismiss' | 'remind-later' | 'auto-dismissed' | 'disabled';
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
  private lastNotificationTime: number = 0;
  private currentSessionId: string = '';
  private currentStage: string = 'implement';
  private currentTask: string = '';
  private pendingNotification: boolean = false;

  /**
   * Creates a new AutoHandoffTrigger instance.
   *
   * @param config - Optional partial configuration
   */
  constructor(config?: Partial<AutoHandoffConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
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

    monitor.on('critical', criticalHandler);
    monitor.on('handoff-recommended', handoffHandler);

    this.disposables.push({
      dispose: () => {
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
   * Handles critical health status event.
   *
   * @param status - Critical health status
   */
  private async handleCriticalStatus(status: ContextHealthStatus): Promise<void> {
    // Only notify for real session data — filesystem estimates are not context usage
    if (status.dataSource !== 'real') {
      return;
    }

    this.logger.info('Critical health status detected', {
      utilization: status.utilizationPercent,
      tokensUsed: status.tokensUsed,
    });

    await this.triggerHandoffNotification(status, 'critical');
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
    const dismissAction = 'Dismiss';
    const remindAction = 'Remind in 10 min';

    this.logger.debug('Showing handoff notification', { title, reason });

    const showNotification =
      reason === 'warning' ? vscode.window.showWarningMessage : vscode.window.showWarningMessage;

    const selection = await showNotification(
      `${title}\n${message}`,
      { modal: false },
      saveAction,
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

    if (options.additionalContext) {
      lines.push('## Additional Context');
      lines.push('');
      lines.push(options.additionalContext);
      lines.push('');
    }

    lines.push('## Resume Instructions');
    lines.push('');
    lines.push('1. Start a new Claude session');
    lines.push('2. Run `/8_gofer_resume`');
    lines.push('3. The session will be restored with this context');
    lines.push('');
    lines.push('---');
    lines.push(`*Generated automatically at ${timestamp}*`);

    return lines.join('\n');
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
