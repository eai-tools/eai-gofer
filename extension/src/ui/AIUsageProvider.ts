/**
 * AIUsageProvider - TreeDataProvider for AI Token Usage Panel
 *
 * Displays hierarchical AI usage data in the Gofer sidebar:
 *   Period (Current Session/Today/Week) -> Provider -> Token Details
 *
 * Subscribes to AIUsageMonitor 'usage-update' events for real-time updates.
 *
 * Feature 025: AI Token Usage Tracking Panel
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import type { AIUsageMonitor } from '../autonomous/AIUsageMonitor';
import {
  AIUsageItem,
  type AIUsageData,
  type ProviderUsage,
  type UsagePeriod,
  type UsageUpdateEvent,
} from '../types/aiUsage';
import { COST_PER_1K_TOKENS } from '../config/pricing';

/**
 * Period display configuration
 */
const PERIOD_CONFIG: Record<UsagePeriod, { label: string; icon: string }> = {
  current: { label: 'Current Session', icon: 'pulse' },
  today: { label: 'Today', icon: 'calendar' },
  week: { label: 'This Week', icon: 'calendar' },
};

/**
 * Provider display icons
 */
const PROVIDER_ICONS: Record<string, string> = {
  anthropic: 'symbol-class',
  openai: 'symbol-interface',
  google: 'symbol-method',
};

/**
 * AIUsageProvider implements vscode.TreeDataProvider for the AI TOKEN USAGE panel.
 *
 * Tree structure:
 *   Current Session ($X.XX)
 *     Anthropic: $X.XX (N tokens)
 *       Input Tokens: N ($X.XX)
 *       Output Tokens: N ($X.XX)
 *     OpenAI: ...
 *     Google: ...
 *   Today ($X.XX)
 *     ...
 *   This Week ($X.XX)
 *     ...
 */
export class AIUsageProvider implements vscode.TreeDataProvider<AIUsageItem>, vscode.Disposable {
  private readonly logger = Logger.for('AIUsageProvider');

  private _onDidChangeTreeData: vscode.EventEmitter<AIUsageItem | undefined | null | void> =
    new vscode.EventEmitter<AIUsageItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AIUsageItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private monitor: AIUsageMonitor | null = null;
  private disposables: vscode.Disposable[] = [];
  private latestData: AIUsageData[] = [];
  private _visible = false;

  constructor() {}

  /**
   * Connect to tree view to track visibility changes.
   */
  setTreeView(treeView: vscode.TreeView<AIUsageItem>): void {
    treeView.onDidChangeVisibility(
      (e) => {
        this._visible = e.visible;
        if (this.monitor) {
          (this.monitor as unknown as { setPanelVisible(v: boolean): void }).setPanelVisible(
            e.visible
          );
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Connect to AIUsageMonitor for real-time updates.
   *
   * @param monitor - AIUsageMonitor instance to subscribe to
   */
  setMonitor(monitor: AIUsageMonitor): void {
    this.monitor = monitor;

    const onUpdate = (event: UsageUpdateEvent): void => {
      this.latestData = event.periods;
      this.refresh();
    };

    monitor.on('usage-update', onUpdate);
    this.disposables.push({
      dispose: () => monitor.off('usage-update', onUpdate),
    });
  }

  /**
   * Trigger a tree view refresh.
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
    this.logger.debug('AI Usage panel refreshed');
  }

  /**
   * Get the tree item representation for display.
   *
   * @param element - Tree item to render
   * @returns The tree item (identity - already fully constructed)
   */
  getTreeItem(element: AIUsageItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for a tree element.
   *
   * @param element - Parent element, or undefined for root
   * @returns Array of child items
   */
  async getChildren(element?: AIUsageItem): Promise<AIUsageItem[]> {
    // Root level: return time period items
    if (!element) {
      return this.getPeriodItems();
    }

    // Period level: return provider items
    if (element.contextType === 'period' && element.usageData) {
      return this.getProviderItems(element.usageData as AIUsageData);
    }

    // Provider level: return token breakdown items
    if (element.contextType === 'provider' && element.usageData && element.period) {
      return this.getTokenItems(element.usageData as ProviderUsage);
    }

    return [];
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this._onDidChangeTreeData.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }

  // --- Private Methods ---

  /**
   * Build root-level period items.
   */
  private async getPeriodItems(): Promise<AIUsageItem[]> {
    // Use latest data from events, or fetch from monitor
    let periodData = this.latestData;

    if (periodData.length === 0 && this.monitor) {
      // Load from monitor if no event data yet
      const periods: AIUsageData[] = [];
      for (const period of ['current', 'today', 'week'] as UsagePeriod[]) {
        try {
          periods.push(await this.monitor.getUsageData(period));
        } catch {
          // Skip periods that fail to load
        }
      }
      periodData = periods;
    }

    if (periodData.length === 0) {
      return [];
    }

    return periodData.map((data) => this.createPeriodItem(data));
  }

  /**
   * Create a period tree item.
   */
  private createPeriodItem(data: AIUsageData): AIUsageItem {
    const config = PERIOD_CONFIG[data.period];
    const item = new AIUsageItem(config.label, 'period', vscode.TreeItemCollapsibleState.Collapsed);

    // Build description with cost
    let description = `$${data.totalCostUsd.toFixed(2)}`;

    // Add budget info for current session
    if (data.period === 'current' && data.budgetLimitUsd !== undefined) {
      const percent = data.budgetPercentUsed ?? 0;
      description = `$${data.totalCostUsd.toFixed(2)} / $${data.budgetLimitUsd.toFixed(2)} (${Math.round(percent)}%)`;
    }

    item.description = description;
    item.usageData = data;
    item.period = data.period;

    // Color-code icon based on budget status
    const iconColor = this.getBudgetColor(data);
    item.iconPath = new vscode.ThemeIcon(config.icon, iconColor);

    // Build tooltip
    item.tooltip = this.buildPeriodTooltip(data);

    return item;
  }

  /**
   * Build provider items for a period.
   */
  private getProviderItems(data: AIUsageData): AIUsageItem[] {
    // Show error/status messages when applicable
    if (data.error) {
      const errorItem = new AIUsageItem(
        this.getErrorLabel(data.error),
        'tokens',
        vscode.TreeItemCollapsibleState.None
      );
      errorItem.description = data.errorMessage;
      errorItem.iconPath = new vscode.ThemeIcon(
        data.error === 'api_error' ? 'warning' : 'info',
        data.error === 'api_error' ? new vscode.ThemeColor('charts.yellow') : undefined
      );
      if (data.error === 'admin_key_required' || data.error === 'not_configured') {
        errorItem.command = {
          command: 'workbench.action.openSettings',
          title: 'Open Settings',
          arguments: ['gofer.anthropicAdminApiKey'],
        };
      }

      // If we have stale data with an error, show both the error and the data
      if (data.providers.length > 0) {
        const lastUpdatedNote = data.lastUpdated
          ? ` (last updated ${new Date(data.lastUpdated).toLocaleTimeString()})`
          : '';
        errorItem.description = (data.errorMessage ?? '') + lastUpdatedNote;
        return [errorItem, ...this.buildProviderList(data)];
      }
      return [errorItem];
    }

    if (data.providers.length === 0) {
      const emptyItem = new AIUsageItem(
        'No usage data',
        'tokens',
        vscode.TreeItemCollapsibleState.None
      );
      emptyItem.iconPath = new vscode.ThemeIcon('info');
      return [emptyItem];
    }

    return this.buildProviderList(data);
  }

  /**
   * Get user-friendly label for error types.
   */
  private getErrorLabel(error: string): string {
    switch (error) {
      case 'admin_key_required':
        return 'Admin API key required';
      case 'not_configured':
        return 'Not configured';
      case 'api_not_available':
        return 'Billing API not available';
      case 'api_error':
        return 'Unable to fetch data';
      default:
        return 'Error';
    }
  }

  /**
   * Build the sorted list of provider items.
   */
  private buildProviderList(data: AIUsageData): AIUsageItem[] {
    // Sort by cost descending
    const sorted = [...data.providers].sort((a, b) => b.costUsd - a.costUsd);

    return sorted.map((provider) => {
      const totalTokens = provider.inputTokens + provider.outputTokens;
      const providerName = this.formatProviderName(provider.providerId);
      const icon = PROVIDER_ICONS[provider.providerId] || 'symbol-misc';

      const item = new AIUsageItem(
        providerName,
        'provider',
        vscode.TreeItemCollapsibleState.Collapsed
      );

      item.description = `$${provider.costUsd.toFixed(2)} (${this.formatTokenCount(totalTokens)} tokens)`;
      item.iconPath = new vscode.ThemeIcon(icon);
      item.usageData = provider;
      item.period = data.period;

      // Build provider tooltip
      const lines = [
        `${providerName}: $${provider.costUsd.toFixed(2)} total`,
        `Input: ${this.formatTokenCount(provider.inputTokens)} tokens`,
        `Output: ${this.formatTokenCount(provider.outputTokens)} tokens`,
      ];
      item.tooltip = lines.join('\n');

      return item;
    });
  }

  /**
   * Build token breakdown items for a provider.
   */
  private getTokenItems(provider: ProviderUsage): AIUsageItem[] {
    const rates = COST_PER_1K_TOKENS[provider.providerId] ?? COST_PER_1K_TOKENS['anthropic'];
    const inputCost = (provider.inputTokens * rates.input) / 1000;
    const outputCost = (provider.outputTokens * rates.output) / 1000;

    const inputItem = new AIUsageItem(
      'Input Tokens',
      'tokens',
      vscode.TreeItemCollapsibleState.None
    );
    inputItem.description = `${this.formatTokenCount(provider.inputTokens)} ($${inputCost.toFixed(2)})`;
    inputItem.iconPath = new vscode.ThemeIcon('arrow-right');
    inputItem.tooltip = `${this.formatTokenCount(provider.inputTokens)} input tokens at $${(rates.input * 1000).toFixed(2)} per 1M = $${inputCost.toFixed(2)}`;

    const outputItem = new AIUsageItem(
      'Output Tokens',
      'tokens',
      vscode.TreeItemCollapsibleState.None
    );
    outputItem.description = `${this.formatTokenCount(provider.outputTokens)} ($${outputCost.toFixed(2)})`;
    outputItem.iconPath = new vscode.ThemeIcon('arrow-left');
    outputItem.tooltip = `${this.formatTokenCount(provider.outputTokens)} output tokens at $${(rates.output * 1000).toFixed(2)} per 1M = $${outputCost.toFixed(2)}`;

    return [inputItem, outputItem];
  }

  /**
   * Get ThemeColor for budget status.
   */
  private getBudgetColor(data: AIUsageData): vscode.ThemeColor | undefined {
    if (data.period !== 'current' || !data.budgetStatus) {
      return undefined;
    }

    switch (data.budgetStatus) {
      case 'healthy':
        return new vscode.ThemeColor('charts.green');
      case 'warning':
        return new vscode.ThemeColor('charts.yellow');
      case 'exceeded':
        return new vscode.ThemeColor('charts.red');
      default:
        return undefined;
    }
  }

  /**
   * Build tooltip for a period item.
   */
  private buildPeriodTooltip(data: AIUsageData): string {
    const lines: string[] = [];
    const config = PERIOD_CONFIG[data.period];

    lines.push(`${config.label}: $${data.totalCostUsd.toFixed(2)}`);
    lines.push(`Total tokens: ${this.formatTokenCount(data.totalTokens)}`);

    if (data.providers.length > 0) {
      lines.push('');
      lines.push('Provider breakdown:');
      for (const p of data.providers) {
        lines.push(`  ${this.formatProviderName(p.providerId)}: $${p.costUsd.toFixed(2)}`);
      }
    }

    if (data.budgetLimitUsd !== undefined) {
      lines.push('');
      lines.push(
        `Budget: $${data.totalCostUsd.toFixed(2)} / $${data.budgetLimitUsd.toFixed(2)} (${Math.round(data.budgetPercentUsed ?? 0)}%)`
      );
      lines.push(`Status: ${(data.budgetStatus ?? 'unknown').toUpperCase()}`);
    }

    return lines.join('\n');
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
   * Format token count with thousands separator.
   */
  private formatTokenCount(tokens: number): string {
    return tokens.toLocaleString();
  }
}
