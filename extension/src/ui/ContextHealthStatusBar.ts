/**
 * ContextHealthStatusBar - VSCode Status Bar Integration
 *
 * Displays context health status in the VSCode status bar with color-coded
 * indicators and click-to-show detailed breakdown.
 *
 * Key Features:
 * - Color-coded status display (green/yellow/red)
 * - Real-time utilization percentage
 * - Click handler for detailed breakdown
 * - Automatic updates from ContextHealthMonitor events
 *
 * @see .specify/specs/011-context-health-recursive-memory/tasks.md T025-T029
 */

import * as vscode from 'vscode';
import {
  ContextHealthMonitor,
  type ContextHealthStatus,
  type HealthStatus,
  type TokenBreakdown,
} from '../autonomous/ContextHealthMonitor';
import { Logger } from '../utils/logger';
import type { GoferStage, StageContextProfile } from '../autonomous/StageContextProfile';

/**
 * Masking statistics for display
 * @see T069
 */
export interface MaskingStatistics {
  /** Number of observations masked */
  maskedCount: number;
  /** Tokens saved by masking */
  tokensSaved: number;
  /** Total observations tracked */
  totalObservations: number;
  /** Expansion requests count */
  expansionRequests: number;
  /** T024: Per-tier observation counts */
  tierCounts?: {
    full: number;
    keyPoints: number;
    masked: number;
  };
}

/**
 * Stage profile usage for display
 * @see T070
 */
export interface StageProfileUsage {
  /** Current Gofer stage */
  currentStage: GoferStage;
  /** Active stage profile */
  profile: StageContextProfile;
  /** Budget utilization per category */
  budgetUtilization: {
    research: number;
    memory: number;
    code: number;
    conversation: number;
  };
  /** Stage history (most recent first) */
  stageHistory: Array<{ stage: GoferStage; timestamp: number }>;
}

/**
 * Status bar icons for each health status.
 */
const STATUS_ICONS: Record<HealthStatus, string> = {
  healthy: '$(check)',
  warning: '$(warning)',
  critical: '$(error)',
};

/**
 * Status bar colors for each health status.
 * Using ThemeColor for proper VS Code theme integration.
 */
const STATUS_COLORS: Record<HealthStatus, vscode.ThemeColor> = {
  healthy: new vscode.ThemeColor('statusBarItem.foreground'),
  warning: new vscode.ThemeColor('statusBarItem.warningForeground'),
  critical: new vscode.ThemeColor('statusBarItem.errorForeground'),
};

/**
 * Status bar background colors for each health status.
 */
const STATUS_BACKGROUNDS: Record<HealthStatus, vscode.ThemeColor | undefined> = {
  healthy: undefined,
  warning: new vscode.ThemeColor('statusBarItem.warningBackground'),
  critical: new vscode.ThemeColor('statusBarItem.errorBackground'),
};

/**
 * Command ID for showing context health details.
 */
export const SHOW_CONTEXT_HEALTH_COMMAND = 'gofer.showContextHealth';

/**
 * ContextHealthStatusBar manages the status bar item for context health display.
 */
export class ContextHealthStatusBar implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly logger: Logger;
  private readonly disposables: vscode.Disposable[] = [];
  private currentStatus: ContextHealthStatus | null = null;
  private monitor: ContextHealthMonitor | null = null;
  private maskingStats: MaskingStatistics | null = null;
  private stageProfileUsage: StageProfileUsage | null = null;

  /**
   * Creates a new ContextHealthStatusBar instance.
   *
   * @param context - VSCode extension context for registering disposables
   */
  constructor(context: vscode.ExtensionContext) {
    this.logger = Logger.for('ContextHealthStatusBar');

    // Create status bar item with left alignment and high priority
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100 // High priority to appear near the left
    );

    // Set command for click handler
    this.statusBarItem.command = SHOW_CONTEXT_HEALTH_COMMAND;
    this.statusBarItem.tooltip = 'Click to view context health details';

    // Register command for showing details
    const commandDisposable = vscode.commands.registerCommand(SHOW_CONTEXT_HEALTH_COMMAND, () =>
      this.showDetailedBreakdown()
    );
    this.disposables.push(commandDisposable);

    // Add to extension subscriptions
    context.subscriptions.push(this);
    context.subscriptions.push(commandDisposable);

    // Set initial state (no data)
    this.updateDisplay(null);

    this.logger.debug('ContextHealthStatusBar created');
  }

  /**
   * Connects the status bar to a ContextHealthMonitor for automatic updates.
   *
   * @param monitor - ContextHealthMonitor instance
   */
  connect(monitor: ContextHealthMonitor): void {
    this.monitor = monitor;

    // Listen to all status events
    const healthyHandler = (status: ContextHealthStatus): void => this.updateDisplay(status);
    const warningHandler = (status: ContextHealthStatus): void => this.updateDisplay(status);
    const criticalHandler = (status: ContextHealthStatus): void => this.updateDisplay(status);

    monitor.on('healthy', healthyHandler);
    monitor.on('warning', warningHandler);
    monitor.on('critical', criticalHandler);

    // Store handlers for cleanup
    this.disposables.push({
      dispose: () => {
        monitor.off('healthy', healthyHandler);
        monitor.off('warning', warningHandler);
        monitor.off('critical', criticalHandler);
      },
    });

    // Initialize with current status if available
    const lastStatus = monitor.getLastStatus();
    if (lastStatus) {
      this.updateDisplay(lastStatus);
    }

    this.logger.debug('Connected to ContextHealthMonitor');
  }

  /**
   * Shows the status bar item.
   */
  show(): void {
    this.statusBarItem.show();
    this.logger.debug('Status bar shown');
  }

  /**
   * Hides the status bar item.
   */
  hide(): void {
    this.statusBarItem.hide();
    this.logger.debug('Status bar hidden');
  }

  /**
   * Manually updates the status bar with new health status.
   * Supports three display modes:
   * - Real data: "Context: 54% (Opus)" with health colors
   * - No session: "Context: No session" in neutral color
   * - Estimated/no data: "Context: N%" or "Context: --"
   *
   * @param status - Context health status or null for no data
   */
  updateDisplay(status: ContextHealthStatus | null): void {
    this.currentStatus = status;

    if (!status) {
      this.statusBarItem.text = '$(pulse) Context: --';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.color = undefined;
      this.statusBarItem.tooltip = 'Context health monitoring not active';
      return;
    }

    // T026/T027: Check dataSource from enhanced analysis
    const dataSource = status.dataSource;
    const model = status.model;

    // T027: No-session or estimated-only display mode
    if (dataSource !== 'real') {
      this.statusBarItem.text = '$(pulse) Context: --';
      this.statusBarItem.color = new vscode.ThemeColor('disabledForeground');
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip =
        'No active Claude Code session detected.\nStart Claude Code to see real context usage.';
      return;
    }

    const icon = STATUS_ICONS[status.status];
    const percent = Math.round(status.utilizationPercent);

    // T026: Real data mode — show model name; T007: data-source indicator
    const sourceIndicator = dataSource === 'real' ? '(real)' : '(est)';
    if (dataSource === 'real' && model) {
      const shortModel = this.getShortModelName(model);
      this.statusBarItem.text = `${icon} Context: ${percent}% ${sourceIndicator} (${shortModel})`;
    } else {
      this.statusBarItem.text = `${icon} Context: ${percent}% ${sourceIndicator}`;
    }

    this.statusBarItem.color = STATUS_COLORS[status.status];
    this.statusBarItem.backgroundColor = STATUS_BACKGROUNDS[status.status];
    this.statusBarItem.tooltip = this.buildTooltip(status);

    this.logger.debug('Status bar updated', {
      status: status.status,
      percent,
      dataSource,
    });
  }

  /**
   * Returns a short, human-readable model name for display.
   * e.g., "claude-opus-4-5-20251101" → "Opus 4.5"
   */
  private getShortModelName(modelId: string): string {
    if (modelId.includes('opus-4-5') || modelId.includes('opus-4.5')) {
      return 'Opus 4.5';
    }
    if (modelId.includes('opus-4')) {
      return 'Opus 4';
    }
    if (modelId.includes('opus')) {
      return 'Opus';
    }
    if (modelId.includes('sonnet-4-5') || modelId.includes('sonnet-4.5')) {
      return 'Sonnet 4.5';
    }
    if (modelId.includes('sonnet-4')) {
      return 'Sonnet 4';
    }
    if (modelId.includes('sonnet')) {
      return 'Sonnet';
    }
    if (modelId.includes('haiku')) {
      return 'Haiku';
    }
    return modelId.split('-').slice(0, 2).join(' ');
  }

  /**
   * Builds the tooltip string for the status bar item.
   *
   * @param status - Context health status
   * @returns Tooltip string
   */
  private buildTooltip(status: ContextHealthStatus): string {
    const lines: string[] = [];

    if (status.dataSource === 'real') {
      lines.push(
        `Last API call: ${status.tokensUsed.toLocaleString()} / ${status.tokensLimit.toLocaleString()} tokens`,
        `Point-in-time snapshot from hook data`
      );
      if (status.utilizationPercent > 50) {
        lines.push('Note: Accuracy may degrade above ~100K tokens');
      }
    } else {
      lines.push(
        `Context Health: ${status.status.toUpperCase()}`,
        `Usage: ${status.tokensUsed.toLocaleString()} / ${status.tokensLimit.toLocaleString()} tokens (${Math.round(status.utilizationPercent)}%)`
      );
    }

    lines.push('', 'Click for details');

    if (status.recommendations.length > 0 && status.status !== 'healthy') {
      lines.splice(lines.length - 2, 0, `Tip: ${status.recommendations[0]}`);
    }

    return lines.join('\n');
  }

  /**
   * Shows the detailed breakdown in a QuickPick dialog.
   */
  private async showDetailedBreakdown(): Promise<void> {
    if (!this.currentStatus) {
      vscode.window.showInformationMessage('No context health data available.');
      return;
    }

    const status = this.currentStatus;

    // No real session: show a simple message, not a full breakdown
    if (status.dataSource !== 'real') {
      const config = vscode.workspace.getConfiguration('gofer');
      const mode = config.get<string>('claudeCodeMode', 'standard');
      const modeLabel = mode === 'yolo' ? 'Yolo' : mode === 'custom' ? 'Custom' : 'Standard';
      const items: Array<vscode.QuickPickItem & { action?: string }> = [
        {
          label: '$(info) No active Claude Code session',
          detail: 'Start a Claude Code session to see real context usage from API token data.',
        },
        {
          label: `$(play) Start Claude Code (${modeLabel})`,
          description: mode === 'yolo' ? 'Skips permission prompts' : 'Open a terminal and launch',
          action: 'startClaude',
        },
        {
          label: '$(refresh) Refresh Status',
          description: 'Check for an active session now',
          action: 'refresh',
        },
      ];
      const selected = await vscode.window.showQuickPick(items, {
        title: 'Context Health',
        placeHolder: 'No session detected',
      });
      if (selected?.action) {
        await this.handleQuickPickAction(selected.action);
      }
      return;
    }

    const items = this.buildQuickPickItems(status);

    const selected = await vscode.window.showQuickPick(items, {
      title: `Context Health: ${status.status.toUpperCase()} (${Math.round(status.utilizationPercent)}%)`,
      placeHolder: 'Select an action or view details',
      ignoreFocusOut: true,
    });

    if (selected?.action) {
      await this.handleQuickPickAction(selected.action);
    }
  }

  /**
   * Builds QuickPick items for the detailed breakdown.
   *
   * @param status - Context health status
   * @returns Array of QuickPickItems
   */
  private buildQuickPickItems(
    status: ContextHealthStatus
  ): Array<vscode.QuickPickItem & { action?: string }> {
    const items: Array<vscode.QuickPickItem & { action?: string }> = [];

    // Summary section
    items.push({
      label: '$(graph) Summary',
      kind: vscode.QuickPickItemKind.Separator,
    });

    items.push({
      label: `${STATUS_ICONS[status.status]} Status: ${status.status.toUpperCase()}`,
      description: `${status.tokensUsed.toLocaleString()} / ${status.tokensLimit.toLocaleString()} tokens`,
      detail: `${Math.round(status.utilizationPercent)}% context utilization`,
    });

    // T028: Session info section (when real data available)
    if (status.dataSource === 'real') {
      items.push({
        label: '$(server) Session Info',
        kind: vscode.QuickPickItemKind.Separator,
      });

      if (status.model) {
        items.push({
          label: `$(rocket) Model: ${this.getShortModelName(status.model)}`,
          description: status.model,
        });
      }

      if (status.sessionId) {
        items.push({
          label: `$(key) Session: ${status.sessionId.substring(0, 8)}...`,
          description: status.sessionId,
        });
      }

      if (typeof status.sessionAge === 'number') {
        const ageMinutes = Math.round(status.sessionAge / 60000);
        const ageDisplay =
          ageMinutes < 60
            ? `${ageMinutes}m`
            : `${Math.floor(ageMinutes / 60)}h ${ageMinutes % 60}m`;
        items.push({
          label: `$(clock) Session Age: ${ageDisplay}`,
        });
      }

      if (typeof status.apiCallCount === 'number') {
        items.push({
          label: `$(symbol-event) API Calls: ${status.apiCallCount.toLocaleString()}`,
        });
      }
    }

    // Breakdown section — only show when we have per-category data (not real data
    // where everything is lumped into "conversation")
    if (status.dataSource !== 'real') {
      items.push({
        label: '$(list-flat) Token Breakdown',
        kind: vscode.QuickPickItemKind.Separator,
      });

      const breakdown = status.breakdown;
      const total = status.tokensUsed || 1;

      items.push(...this.buildBreakdownItems(breakdown, total));
    }

    // Observation Masking section (T069)
    if (this.maskingStats) {
      items.push({
        label: '$(eye-closed) Observation Masking',
        kind: vscode.QuickPickItemKind.Separator,
      });

      items.push(...this.buildMaskingStatsItems(this.maskingStats));
    }

    // Stage Profile section (T070)
    if (this.stageProfileUsage) {
      items.push({
        label: '$(milestone) Stage Profile',
        kind: vscode.QuickPickItemKind.Separator,
      });

      items.push(...this.buildStageProfileItems(this.stageProfileUsage));
    }

    // Recommendations section
    if (status.recommendations.length > 0) {
      items.push({
        label: '$(lightbulb) Recommendations',
        kind: vscode.QuickPickItemKind.Separator,
      });

      for (const rec of status.recommendations) {
        items.push({
          label: `$(info) ${rec}`,
        });
      }
    }

    // Actions section
    items.push({
      label: '$(tools) Actions',
      kind: vscode.QuickPickItemKind.Separator,
    });

    if (status.status === 'critical' || status.status === 'warning') {
      items.push({
        label: '$(save) Save Progress (/7_gofer_save)',
        description: 'Save current session for continuation',
        action: 'save',
      });
    }

    items.push({
      label: '$(refresh) Refresh Status',
      description: 'Check context health now',
      action: 'refresh',
    });

    items.push({
      label: '$(history) View History',
      description: 'Show recent health status changes',
      action: 'history',
    });

    return items;
  }

  /**
   * Builds QuickPick items for the token breakdown.
   *
   * @param breakdown - Token breakdown by category
   * @param total - Total token count
   * @returns Array of QuickPickItems
   */
  private buildBreakdownItems(breakdown: TokenBreakdown, total: number): vscode.QuickPickItem[] {
    const categories: Array<{ name: string; icon: string; key: keyof TokenBreakdown }> = [
      { name: 'Conversation', icon: '$(comment-discussion)', key: 'conversation' },
      { name: 'Observations', icon: '$(eye)', key: 'observations' },
      { name: 'Spec Artifacts', icon: '$(file-code)', key: 'specArtifacts' },
      { name: 'Memories', icon: '$(database)', key: 'memories' },
      { name: 'Hints', icon: '$(lightbulb)', key: 'hints' },
      { name: 'System Files', icon: '$(gear)', key: 'systemFiles' },
    ];

    // Sort by token count descending
    const sorted = categories
      .map((cat) => ({ ...cat, tokens: breakdown[cat.key] }))
      .sort((a, b) => b.tokens - a.tokens);

    return sorted.map((cat) => {
      const percent = total > 0 ? Math.round((cat.tokens / total) * 100) : 0;
      const bar = this.buildProgressBar(percent);
      return {
        label: `${cat.icon} ${cat.name}`,
        description: `${cat.tokens.toLocaleString()} tokens (${percent}%)`,
        detail: bar,
      };
    });
  }

  /**
   * Builds a simple ASCII progress bar.
   *
   * @param percent - Percentage (0-100)
   * @returns Progress bar string
   */
  private buildProgressBar(percent: number): string {
    const width = 20;
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Builds QuickPick items for masking statistics display.
   * @see T069
   *
   * @param stats - Masking statistics
   * @returns Array of QuickPickItems
   */
  private buildMaskingStatsItems(stats: MaskingStatistics): vscode.QuickPickItem[] {
    const items: vscode.QuickPickItem[] = [];

    // Masking summary
    const maskingPercent =
      stats.totalObservations > 0
        ? Math.round((stats.maskedCount / stats.totalObservations) * 100)
        : 0;

    items.push({
      label: '$(eye-closed) Masked Observations',
      description: `${stats.maskedCount} of ${stats.totalObservations} (${maskingPercent}%)`,
      detail: this.buildProgressBar(maskingPercent),
    });

    // Tokens saved
    items.push({
      label: '$(arrow-down) Tokens Saved',
      description: `${stats.tokensSaved.toLocaleString()} tokens`,
      detail: 'By replacing older observations with placeholders',
    });

    // T024: Per-tier observation counts
    if (stats.tierCounts) {
      const { full, keyPoints, masked } = stats.tierCounts;
      items.push({
        label: '$(layers) Decay Tiers',
        description: `Full: ${full} | Key-Points: ${keyPoints} | Masked: ${masked}`,
        detail: `Three-tier decay: full → key-points → masked`,
      });
    }

    // Expansion requests
    if (stats.expansionRequests > 0) {
      items.push({
        label: '$(unfold) Expansion Requests',
        description: `${stats.expansionRequests} requests`,
        detail: 'Times masked content was re-expanded on demand',
      });
    }

    return items;
  }

  /**
   * Builds QuickPick items for stage profile usage display.
   * @see T070
   *
   * @param usage - Stage profile usage
   * @returns Array of QuickPickItems
   */
  private buildStageProfileItems(usage: StageProfileUsage): vscode.QuickPickItem[] {
    const items: vscode.QuickPickItem[] = [];

    // Current stage
    const stageIcons: Record<GoferStage, string> = {
      research: '$(search)',
      specify: '$(file-text)',
      plan: '$(list-tree)',
      tasks: '$(checklist)',
      implement: '$(code)',
      validate: '$(verified)',
    };

    items.push({
      label: `${stageIcons[usage.currentStage]} Current Stage`,
      description: usage.currentStage.charAt(0).toUpperCase() + usage.currentStage.slice(1),
      detail: `Observation window: ${usage.profile.observationWindow} turns`,
    });

    // Budget utilization
    const budgetCategories: Array<{
      name: string;
      key: keyof typeof usage.budgetUtilization;
      icon: string;
    }> = [
      { name: 'Research', key: 'research', icon: '$(search)' },
      { name: 'Memory', key: 'memory', icon: '$(database)' },
      { name: 'Code', key: 'code', icon: '$(code)' },
      { name: 'Conversation', key: 'conversation', icon: '$(comment-discussion)' },
    ];

    for (const cat of budgetCategories) {
      const utilization = Math.round(usage.budgetUtilization[cat.key] * 100);
      items.push({
        label: `${cat.icon} ${cat.name} Budget`,
        description: `${utilization}% utilized`,
        detail: this.buildProgressBar(utilization),
      });
    }

    // Stage history (show last 3)
    if (usage.stageHistory.length > 1) {
      const recentHistory = usage.stageHistory.slice(0, 3);
      const historyText = recentHistory
        .map((h) => `${h.stage} (${new Date(h.timestamp).toLocaleTimeString()})`)
        .join(' → ');

      items.push({
        label: '$(history) Recent Stages',
        description: historyText,
      });
    }

    return items;
  }

  /**
   * Handles QuickPick action selection.
   *
   * @param action - Action identifier
   */
  private async handleQuickPickAction(action: string): Promise<void> {
    switch (action) {
      case 'save':
        await vscode.commands.executeCommand('gofer.saveProgress');
        break;

      case 'refresh':
        if (this.monitor) {
          const status = this.monitor.checkHealth();
          if (status) {
            this.updateDisplay(status);
            vscode.window.showInformationMessage(
              `Context Health: ${status.status.toUpperCase()} (${Math.round(status.utilizationPercent)}%)`
            );
          }
        }
        break;

      case 'history':
        await this.showStatusHistory();
        break;

      case 'startClaude':
        await this.launchClaudeCodeTerminal();
        break;
    }
  }

  /**
   * Launch Claude Code in a new terminal using the configured command.
   * Ensures hooks are installed before launching.
   */
  private async launchClaudeCodeTerminal(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showWarningMessage('No workspace folder open.');
      return;
    }

    // Ensure hooks are installed before launching
    try {
      const { GoferMigrator } = await import('../goferMigrator');
      const migrator = new GoferMigrator(workspaceFolder.uri.fsPath);
      await migrator.installHooksConfig();
    } catch (error) {
      console.warn('[ContextHealthStatusBar] Failed to install hooks before launch:', error);
    }

    const config = vscode.workspace.getConfiguration('gofer');
    const mode = config.get<string>('claudeCodeMode', 'standard');
    let claudeCmd: string;
    switch (mode) {
      case 'yolo':
        claudeCmd = 'claude --dangerously-skip-permissions';
        break;
      case 'custom':
        claudeCmd = config.get<string>('claudeCodeCommand', 'claude');
        break;
      default:
        claudeCmd = 'claude';
    }

    const terminal = vscode.window.createTerminal({
      name: 'Claude Code',
      cwd: workspaceFolder.uri,
    });
    terminal.show();
    terminal.sendText(claudeCmd);
  }

  /**
   * Shows the status history in a QuickPick dialog.
   */
  private async showStatusHistory(): Promise<void> {
    if (!this.monitor) {
      vscode.window.showInformationMessage('Context health monitoring not connected.');
      return;
    }

    const history = this.monitor.getStatusHistory(10);
    if (history.length === 0) {
      vscode.window.showInformationMessage('No status history available.');
      return;
    }

    const items = history.map((status) => {
      const time = new Date(status.timestamp).toLocaleTimeString();
      const icon = STATUS_ICONS[status.status];
      return {
        label: `${icon} ${status.status.toUpperCase()}`,
        description: `${Math.round(status.utilizationPercent)}% at ${time}`,
        detail: `${status.tokensUsed.toLocaleString()} tokens used`,
      };
    });

    await vscode.window.showQuickPick(items, {
      title: 'Context Health History (Most Recent First)',
      placeHolder: 'View past health status entries',
    });
  }

  /**
   * Gets the current health status.
   *
   * @returns Current ContextHealthStatus or null
   */
  getCurrentStatus(): ContextHealthStatus | null {
    return this.currentStatus;
  }

  /**
   * Updates the masking statistics for dashboard display.
   * @see T069
   *
   * @param stats - Masking statistics
   */
  updateMaskingStats(stats: MaskingStatistics): void {
    this.maskingStats = stats;
    this.logger.debug('Masking stats updated', {
      maskedCount: stats.maskedCount,
      tokensSaved: stats.tokensSaved,
    });
  }

  /**
   * Gets the current masking statistics.
   *
   * @returns Current MaskingStatistics or null
   */
  getMaskingStats(): MaskingStatistics | null {
    return this.maskingStats;
  }

  /**
   * Updates the stage profile usage for dashboard display.
   * @see T070
   *
   * @param usage - Stage profile usage
   */
  updateStageProfileUsage(usage: StageProfileUsage): void {
    this.stageProfileUsage = usage;
    this.logger.debug('Stage profile usage updated', {
      currentStage: usage.currentStage,
      historyLength: usage.stageHistory.length,
    });
  }

  /**
   * Gets the current stage profile usage.
   *
   * @returns Current StageProfileUsage or null
   */
  getStageProfileUsage(): StageProfileUsage | null {
    return this.stageProfileUsage;
  }

  /**
   * Disposes the status bar item and all related resources.
   */
  dispose(): void {
    this.statusBarItem.dispose();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.logger.debug('ContextHealthStatusBar disposed');
  }
}
