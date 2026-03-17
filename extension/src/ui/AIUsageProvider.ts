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
    this.logger.info('[setMonitor] Monitor connected');
    this.monitor = monitor;

    const onUpdate = (event: UsageUpdateEvent): void => {
      this.logger.info('[setMonitor.onUpdate] Received usage-update event:', {
        trigger: event.trigger,
        periodCount: event.periods.length,
        totalCosts: event.periods.map(p => `${p.period}: $${p.totalCostUsd.toFixed(2)}`),
      });
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
    // Root level: return user info + all projects + workspace period items
    if (!element) {
      const items: AIUsageItem[] = [];

      // Add user account info at top
      const userItem = await this.getUserAccountItem();
      if (userItem) {
        items.push(userItem);
      }

      // Add all-projects aggregate
      const allProjectsItem = await this.getAllProjectsItem();
      if (allProjectsItem) {
        items.push(allProjectsItem);
      }

      // Add separator (visual only, using disabled item)
      if (items.length > 0) {
        const separator = new AIUsageItem('─────────────────', 'separator', vscode.TreeItemCollapsibleState.None);
        separator.description = '';
        items.push(separator);
      }

      // Add workspace period items
      const periodItems = await this.getPeriodItems();
      items.push(...periodItems);

      return items;
    }

    // All Projects level: return per-project or per-provider breakdown
    if (element.contextType === 'all-projects') {
      return this.getAllProjectsChildren();
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
    this.logger.info('[getPeriodItems] Start:', {
      latestDataLength: this.latestData.length,
      hasMonitor: !!this.monitor,
    });

    // If no monitor is set, the extension may not have initialized properly
    if (!this.monitor) {
      this.logger.error('[getPeriodItems] CRITICAL: No monitor set! Extension initialization may have failed.');
      this.logger.error('[getPeriodItems] Check the Output > Gofer logs for "Workspace initialization failed"');
      return [];
    }

    if (periodData.length === 0 && this.monitor) {
      // Load from monitor if no event data yet
      this.logger.info('[getPeriodItems] No cached data, fetching from monitor');
      const periods: AIUsageData[] = [];
      for (const period of ['current', 'today', 'week'] as UsagePeriod[]) {
        try {
          const data = await this.monitor.getUsageData(period);
          this.logger.info(`[getPeriodItems] Got data for ${period}:`, {
            totalCost: data.totalCostUsd,
            totalTokens: data.totalTokens,
            providersCount: data.providers.length,
          });
          periods.push(data);
        } catch (error) {
          this.logger.warn(`[getPeriodItems] Failed to load ${period}`, { error });
          // Skip periods that fail to load
        }
      }
      periodData = periods;
    }

    if (periodData.length === 0) {
      this.logger.warn('[getPeriodItems] No period data available');
      return [];
    }

    this.logger.info('[getPeriodItems] Creating items from data:', {
      periodCount: periodData.length,
      totalCosts: periodData.map(d => `${d.period}: $${d.totalCostUsd.toFixed(2)}`),
    });

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

  /**
   * Get user account item (top-level informational).
   */
  private async getUserAccountItem(): Promise<AIUsageItem | null> {
    if (!this.monitor) {
      return null;
    }

    try {
      // Get user from ClaudeCodeUsageAdapter
      const { getClaudeCodeAdapter } = await import('../autonomous/ClaudeCodeUsageAdapter');
      const adapter = getClaudeCodeAdapter((this.monitor as any).workspacePath);
      const userEmail = await adapter.getCurrentUser();

      if (!userEmail) {
        return null;
      }

      const item = new AIUsageItem(
        `👤 Logged in as: ${userEmail}`,
        'user-info',
        vscode.TreeItemCollapsibleState.None
      );
      item.description = '';
      item.iconPath = new vscode.ThemeIcon('account');
      item.tooltip = `Anthropic Account: ${userEmail}`;

      return item;
    } catch (error) {
      this.logger.warn('Failed to get user account info');
      return null;
    }
  }

  /**
   * Get all-projects aggregate item.
   */
  private async getAllProjectsItem(): Promise<AIUsageItem | null> {
    if (!this.monitor) {
      return null;
    }

    try {
      // Get all projects usage from adapter
      const { getClaudeCodeAdapter } = await import('../autonomous/ClaudeCodeUsageAdapter');
      const adapter = getClaudeCodeAdapter((this.monitor as any).workspacePath);

      // Get last 30 days
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      const allUsage = await adapter.getAllProjectsUsage(monthAgo);

      if (allUsage.length === 0) {
        return null;
      }

      // Aggregate total cost and tokens
      const totalCost = allUsage.reduce((sum, u) => sum + u.costUsd, 0);
      const totalTokens = allUsage.reduce((sum, u) => sum + u.totalTokens, 0);
      const projectCount = new Set(allUsage.map((u) => u.projectName)).size;

      const item = new AIUsageItem(
        '📊 All Projects (last 30 days)',
        'all-projects',
        vscode.TreeItemCollapsibleState.Collapsed
      );
      item.description = `$${totalCost.toFixed(2)} (${this.formatTokenCount(totalTokens)} tokens)`;
      item.iconPath = new vscode.ThemeIcon('folder-library');
      item.tooltip = `${projectCount} projects, ${allUsage.length} conversations`;
      item.usageData = allUsage; // Store raw usage for children

      return item;
    } catch (error) {
      this.logger.warn('Failed to get all projects usage');
      return null;
    }
  }

  /**
   * Get children for all-projects item (per-provider breakdown).
   */
  private async getAllProjectsChildren(): Promise<AIUsageItem[]> {
    const allProjectsItem = (await this.getAllProjectsItem());
    if (!allProjectsItem || !allProjectsItem.usageData) {
      return [];
    }

    const allUsage = allProjectsItem.usageData as any[];

    // Aggregate by provider
    const providerStats = new Map<string, { cost: number; tokens: number; count: number }>();

    for (const usage of allUsage) {
      const provider = usage.provider || 'unknown';
      const existing = providerStats.get(provider);

      if (existing) {
        existing.cost += usage.costUsd;
        existing.tokens += usage.totalTokens;
        existing.count++;
      } else {
        providerStats.set(provider, {
          cost: usage.costUsd,
          tokens: usage.totalTokens,
          count: 1,
        });
      }
    }

    // Create provider items
    const items: AIUsageItem[] = [];

    for (const [provider, stats] of providerStats) {
      const item = new AIUsageItem(
        this.formatProviderNameEnhanced(provider),
        'provider-summary',
        vscode.TreeItemCollapsibleState.None
      );
      item.description = `$${stats.cost.toFixed(2)} (${this.formatTokenCount(stats.tokens)} tokens)`;
      item.iconPath = new vscode.ThemeIcon(this.getProviderIcon(provider));
      item.tooltip = `${stats.count} conversations`;

      items.push(item);
    }

    // Sort by cost descending
    items.sort((a, b) => {
      const aDesc = typeof a.description === 'string' ? a.description : '';
      const bDesc = typeof b.description === 'string' ? b.description : '';
      const aCost = parseFloat(aDesc.split('$')[1] || '0');
      const bCost = parseFloat(bDesc.split('$')[1] || '0');
      return bCost - aCost;
    });

    return items;
  }

  /**
   * Format provider name with enhanced detection.
   */
  private formatProviderNameEnhanced(provider: string): string {
    const names: Record<string, string> = {
      'claude-code': 'Claude Code',
      codex: 'Codex CLI',
      copilot: 'GitHub Copilot',
      anthropic: 'Anthropic',
      openai: 'OpenAI',
      google: 'Google',
      unknown: 'Unknown',
    };
    return names[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  /**
   * Get icon for provider.
   */
  private getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      'claude-code': 'symbol-class',
      codex: 'terminal',
      copilot: 'github',
      anthropic: 'symbol-class',
      openai: 'symbol-interface',
      google: 'symbol-method',
      unknown: 'question',
    };
    return icons[provider] ?? 'symbol-misc';
  }
}
