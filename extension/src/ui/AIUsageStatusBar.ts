/**
 * AIUsageStatusBar - Status bar item for AI usage cost display
 *
 * Shows current session AI cost in the VSCode status bar with color-coded
 * budget indicators. Click to show QuickPick with provider breakdown.
 *
 * Follows the ContextHealthStatusBar pattern (alignment, priority, color-coding).
 *
 * Feature 025: AI Token Usage Tracking Panel
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import type { AIUsageMonitor } from '../autonomous/AIUsageMonitor';
import type { AIUsageData, UsageUpdateEvent } from '../types/aiUsage';

/**
 * Command ID for showing AI usage details (QuickPick).
 */
export const SHOW_AI_USAGE_COMMAND = 'gofer.showAIUsage';

/**
 * AIUsageStatusBar displays current session cost in the status bar.
 *
 * - Color-coded: green (<80% budget), yellow (80-100%), red (>100%)
 * - Click opens QuickPick with provider breakdown
 * - Configurable via gofer.aiUsage.statusBar.enabled
 */
export class AIUsageStatusBar implements vscode.Disposable {
  private readonly logger = Logger.for('AIUsageStatusBar');
  private readonly statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];
  private currentData: AIUsageData | null = null;
  private allPeriodData: AIUsageData[] = [];

  /**
   * Create a new AIUsageStatusBar.
   *
   * @param context - VSCode extension context for registering disposables
   */
  constructor(context: vscode.ExtensionContext) {
    // Create status bar item with left alignment, priority 99
    // (next to ContextHealthStatusBar at 100)
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);

    this.statusBarItem.command = SHOW_AI_USAGE_COMMAND;
    this.statusBarItem.tooltip = 'AI Usage: Click for details';

    // Register the QuickPick command
    const commandDisposable = vscode.commands.registerCommand('gofer.showAIUsage', () =>
      this.showDetailedBreakdown()
    );
    this.disposables.push(commandDisposable);

    // Add to extension subscriptions
    context.subscriptions.push(this);
    context.subscriptions.push(commandDisposable);

    // Listen for configuration changes
    const configDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('gofer.aiUsage.statusBar.enabled')) {
        this.updateVisibility();
      }
    });
    this.disposables.push(configDisposable);

    // Set initial state
    this.updateDisplay(null);
    this.updateVisibility();

    this.logger.debug('AIUsageStatusBar created');
  }

  /**
   * Connect to AIUsageMonitor for real-time updates.
   *
   * @param monitor - AIUsageMonitor instance to subscribe to
   */
  connect(monitor: AIUsageMonitor): void {
    const onUpdate = (event: UsageUpdateEvent): void => {
      this.allPeriodData = event.periods;
      // Find current session data
      const currentData = event.periods.find((p) => p.period === 'current') ?? null;
      this.updateDisplay(currentData);
    };

    monitor.on('usage-update', onUpdate);
    this.disposables.push({
      dispose: () => monitor.off('usage-update', onUpdate),
    });

    this.logger.debug('Connected to AIUsageMonitor');
  }

  /**
   * Update the status bar display with new usage data.
   *
   * @param data - Current session usage data, or null for no data
   */
  updateDisplay(data: AIUsageData | null): void {
    this.currentData = data;

    if (!data) {
      this.statusBarItem.text = '$(dollar) AI: $0.00';
      this.statusBarItem.color = undefined;
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = 'AI Usage: No data yet';
      return;
    }

    // Format text
    this.statusBarItem.text = `$(dollar) AI: $${data.totalCostUsd.toFixed(2)}`;

    // Color-code by budget status
    if (data.budgetStatus) {
      switch (data.budgetStatus) {
        case 'healthy':
          this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.foreground');
          this.statusBarItem.backgroundColor = undefined;
          break;
        case 'warning':
          this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
          this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.warningBackground'
          );
          break;
        case 'exceeded':
          this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
          this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.errorBackground'
          );
          break;
      }
    } else {
      this.statusBarItem.color = undefined;
      this.statusBarItem.backgroundColor = undefined;
    }

    // Build tooltip
    const tooltipParts = [`AI Usage: $${data.totalCostUsd.toFixed(2)}`];

    if (data.budgetLimitUsd !== undefined) {
      const percent = Math.round(data.budgetPercentUsed ?? 0);
      tooltipParts[0] = `AI Usage: $${data.totalCostUsd.toFixed(2)} / $${data.budgetLimitUsd.toFixed(2)} (${percent}%)`;
    }

    tooltipParts.push('Click for details');
    this.statusBarItem.tooltip = tooltipParts.join(' - ');

    this.logger.debug('Status bar updated', {
      cost: data.totalCostUsd,
      status: data.budgetStatus ?? 'none',
    });
  }

  /**
   * Show or hide the status bar based on configuration.
   */
  private updateVisibility(): void {
    const config = vscode.workspace.getConfiguration('gofer');
    const enabled = config.get<boolean>('aiUsage.statusBar.enabled', true);

    if (enabled) {
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  /**
   * Show QuickPick with detailed provider breakdown.
   */
  private async showDetailedBreakdown(): Promise<void> {
    if (!this.currentData && this.allPeriodData.length === 0) {
      vscode.window.showInformationMessage('No AI usage data available.');
      return;
    }

    const items: vscode.QuickPickItem[] = [];

    // Show all time periods
    for (const data of this.allPeriodData) {
      const periodLabels: Record<string, string> = {
        current: 'Current Session',
        today: 'Today',
        week: 'This Week',
      };

      items.push({
        label: `$(graph) ${periodLabels[data.period] ?? data.period}`,
        kind: vscode.QuickPickItemKind.Separator,
      });

      items.push({
        label: `$(credit-card) Total: $${data.totalCostUsd.toFixed(2)}`,
        description: `${data.totalTokens.toLocaleString()} tokens`,
        detail: data.budgetLimitUsd
          ? `Budget: $${data.totalCostUsd.toFixed(2)} / $${data.budgetLimitUsd.toFixed(2)} (${Math.round(data.budgetPercentUsed ?? 0)}%)`
          : undefined,
      });

      for (const provider of data.providers) {
        const totalTokens = provider.inputTokens + provider.outputTokens;
        const providerName = this.formatProviderName(provider.providerId);
        items.push({
          label: `  $(symbol-class) ${providerName}: $${provider.costUsd.toFixed(2)}`,
          description: `${totalTokens.toLocaleString()} tokens`,
          detail: `Input: ${provider.inputTokens.toLocaleString()} | Output: ${provider.outputTokens.toLocaleString()}`,
        });
      }
    }

    // Actions
    items.push({
      label: '$(tools) Actions',
      kind: vscode.QuickPickItemKind.Separator,
    });

    items.push({
      label: '$(refresh) Refresh Usage Data',
      description: 'Force refresh all usage data',
    });

    const title = this.currentData
      ? `AI Usage: $${this.currentData.totalCostUsd.toFixed(2)}`
      : 'AI Usage';

    await vscode.window.showQuickPick(items, {
      title,
      placeHolder: 'View AI usage breakdown by provider',
    });
  }

  /**
   * Format provider ID to display name.
   */
  private formatProviderName(providerId: string): string {
    const names: Record<string, string> = {
      anthropic: 'Anthropic',
      openai: 'OpenAI',
      google: 'Google',
    };
    return names[providerId] ?? providerId.charAt(0).toUpperCase() + providerId.slice(1);
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.statusBarItem.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    this.logger.debug('AIUsageStatusBar disposed');
  }
}
