/**
 * AIUsageMonitor - Service for tracking AI token usage and costs
 *
 * Watches `.specify/logs/council-usage.jsonl` via FileSystemWatcher for real-time
 * updates. Falls back to polling when file watcher is unavailable. Aggregates
 * usage by provider and time period (current session, today, this week).
 *
 * Emits 'usage-update' events consumed by AIUsageProvider (TreeView) and
 * AIUsageStatusBar.
 *
 * Feature 025: AI Token Usage Tracking Panel
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { COST_PER_1K_TOKENS, isPricingStale, calculateCost } from '../config/pricing';
import type {
  AIUsageData,
  UsagePeriod,
  ProviderUsage,
  UsageUpdateEvent,
  UsageDataSource,
} from '../types/aiUsage';
import type { UsageSummary } from '../council/UsageLogger';
import type { CostBudgetEnforcer } from './CostBudgetEnforcer';
import type { MultiSessionBridgeWatcher } from './MultiSessionBridgeWatcher';
import { UsageApiClient } from './UsageApiClient';

/**
 * AIUsageMonitor aggregates AI usage data and emits update events.
 *
 * Uses a hybrid approach: FileSystemWatcher for immediate updates (<500ms)
 * with periodic polling as a fallback (configurable interval, default 5s).
 */
export class AIUsageMonitor extends EventEmitter implements vscode.Disposable {
  private readonly logger = Logger.for('AIUsageMonitor');
  private watcher: vscode.FileSystemWatcher | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  /** Cached usage data by period */
  private cachedData: Map<UsagePeriod, AIUsageData> = new Map();
  private cacheTimestamp = 0;
  private static readonly CACHE_TTL_MS = 5000;
  private static readonly DEBOUNCE_MS = 100;
  private static readonly IDLE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

  /** Session subscription cleanup */
  private sessionListenerCleanup: (() => void) | null = null;

  /** Config change listener disposable */
  private configChangeDisposable: vscode.Disposable | null = null;

  /** Panel visibility and idle tracking */
  private panelVisible = true;
  private lastApiCallTimestamp = 0;

  constructor(
    private readonly workspacePath: string,
    private readonly dataSource: UsageDataSource,
    private readonly costBudgetEnforcer?: CostBudgetEnforcer,
    private readonly multiSessionWatcher?: MultiSessionBridgeWatcher
  ) {
    super();

    if (isPricingStale()) {
      this.logger.warn(
        'Pricing data may be stale (>90 days old). Consider updating config/pricing.ts'
      );
    }

    // Listen for admin API key config changes (T021)
    this.configChangeDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('gofer.anthropicAdminApiKey') ||
        e.affectsConfiguration('gofer.openaiAdminApiKey') ||
        e.affectsConfiguration('gofer.aiUsage.api.pollingInterval')
      ) {
        this.logger.info('Admin API key or polling config changed, refreshing');
        this.forceRefresh();
      }
    });
  }

  /**
   * Start monitoring for usage changes.
   * Sets up FileSystemWatcher and polling fallback.
   */
  startMonitoring(): void {
    if (this.disposed) {
      this.logger.warn('Cannot start monitoring on disposed AIUsageMonitor');
      return;
    }

    this.setupFileWatcher();
    this.setupPolling();
    this.setupSessionListener();

    // Initial data load
    this.forceRefresh();

    this.logger.info('AIUsageMonitor started monitoring');
  }

  /**
   * Stop monitoring and clean up watchers/timers.
   */
  stopMonitoring(): void {
    this.cleanupWatcher();
    this.cleanupPolling();
    this.cleanupDebounce();
    this.cleanupSessionListener();

    this.logger.info('AIUsageMonitor stopped monitoring');
  }

  /**
   * Get aggregated usage data for a specific time period.
   * Returns cached data if within TTL, otherwise fetches fresh.
   *
   * @param period - Time period to aggregate ('current', 'today', 'week')
   * @returns Aggregated usage data
   */
  async getUsageData(period: UsagePeriod): Promise<AIUsageData> {
    const now = Date.now();

    // Return cached data if within TTL
    if (now - this.cacheTimestamp < AIUsageMonitor.CACHE_TTL_MS && this.cachedData.has(period)) {
      return this.cachedData.get(period)!;
    }

    const data = await this.fetchUsageData(period);
    this.cachedData.set(period, data);
    this.cacheTimestamp = now;
    return data;
  }

  /**
   * Force refresh all usage data, clearing cache.
   * Emits 'usage-update' event with fresh data.
   */
  async forceRefresh(): Promise<void> {
    this.cacheTimestamp = 0;
    this.cachedData.clear();

    const periods: AIUsageData[] = [];
    for (const period of ['current', 'today', 'week'] as UsagePeriod[]) {
      const data = await this.fetchUsageData(period);
      this.cachedData.set(period, data);
      periods.push(data);
    }
    this.cacheTimestamp = Date.now();

    const event: UsageUpdateEvent = {
      periods,
      trigger: 'manual',
      timestamp: Date.now(),
    };
    this.emit('usage-update', event);
  }

  /**
   * Get all cached period data.
   * Returns empty array if no data is cached.
   */
  getAllCachedData(): AIUsageData[] {
    return Array.from(this.cachedData.values());
  }

  /**
   * Set panel visibility state. When panel becomes visible after idle,
   * triggers immediate refresh.
   */
  setPanelVisible(visible: boolean): void {
    const wasHidden = !this.panelVisible;
    this.panelVisible = visible;

    if (visible && wasHidden) {
      const idleMs = Date.now() - this.lastApiCallTimestamp;
      if (this.lastApiCallTimestamp > 0 && idleMs > AIUsageMonitor.IDLE_THRESHOLD_MS) {
        this.logger.info('Panel visible after idle, triggering immediate refresh');
        this.forceRefresh();
      }
    }
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.stopMonitoring();
    this.cachedData.clear();
    this.removeAllListeners();

    if (this.configChangeDisposable) {
      this.configChangeDisposable.dispose();
      this.configChangeDisposable = null;
    }

    this.logger.debug('AIUsageMonitor disposed');
  }

  // --- Private Methods ---

  /**
   * Fetch fresh usage data for a specific period.
   */
  private async fetchUsageData(period: UsagePeriod): Promise<AIUsageData> {
    const { fromDate, toDate } = this.getDateRange(period);

    try {
      const summary = await this.dataSource.getUsageSummary(fromDate, toDate);
      this.lastApiCallTimestamp = Date.now();
      const data = this.mapSummaryToUsageData(period, summary);

      // Add budget info for current session
      if (period === 'current' && this.costBudgetEnforcer) {
        const snapshot = this.costBudgetEnforcer.getSnapshot();
        const config = this.costBudgetEnforcer.getConfig();
        data.budgetLimitUsd = config.maxCostUsd;
        data.budgetPercentUsed = snapshot.percentUsed;
        data.budgetStatus = snapshot.status;
      }

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to fetch usage data', { period, error: errorMsg });

      // Return empty data with error state for UI display
      return {
        period,
        totalCostUsd: 0,
        totalTokens: 0,
        providers: [],
        error: 'api_error',
        errorMessage: errorMsg,
      };
    }
  }

  /**
   * Map UsageLogger summary to AIUsageData format.
   */
  private mapSummaryToUsageData(period: UsagePeriod, summary: UsageSummary): AIUsageData {
    const providers: ProviderUsage[] = [];

    for (const [providerId, providerData] of Object.entries(summary.byProvider)) {
      // UsageLogger provides total tokens and cost per provider.
      // Estimate input/output split: use summary-level ratios if available.
      const totalTokens = providerData.tokens;
      let inputTokens: number;
      let outputTokens: number;

      if (summary.totalInputTokens > 0 || summary.totalOutputTokens > 0) {
        // Use the global input/output ratio from the summary
        const totalGlobal = summary.totalInputTokens + summary.totalOutputTokens;
        const inputRatio = totalGlobal > 0 ? summary.totalInputTokens / totalGlobal : 0.6;
        inputTokens = Math.round(totalTokens * inputRatio);
        outputTokens = totalTokens - inputTokens;
      } else {
        // Default 60/40 split
        inputTokens = Math.round(totalTokens * 0.6);
        outputTokens = totalTokens - inputTokens;
      }

      providers.push({
        providerId,
        inputTokens,
        outputTokens,
        costUsd: providerData.costUsd,
      });
    }

    return {
      period,
      totalCostUsd: summary.totalCostUsd,
      totalTokens: summary.totalInputTokens + summary.totalOutputTokens,
      providers,
    };
  }

  /**
   * Get date range for a time period.
   */
  private getDateRange(period: UsagePeriod): { fromDate?: Date; toDate?: Date } {
    const now = new Date();

    switch (period) {
      case 'current':
        // For current session, we use no date filter - the session filtering
        // happens via the log entries that match the current session.
        // If no session data is available, show all-time data.
        return {};

      case 'today': {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        return { fromDate: startOfDay, toDate: now };
      }

      case 'week': {
        const startOfWeek = new Date(now);
        const dayOfWeek = startOfWeek.getDay();
        // Adjust to Monday (day 1). If Sunday (0), go back 6 days.
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(startOfWeek.getDate() - daysToMonday);
        startOfWeek.setHours(0, 0, 0, 0);
        return { fromDate: startOfWeek, toDate: now };
      }

      default:
        return {};
    }
  }

  /**
   * Set up FileSystemWatcher for council-usage.jsonl.
   * Only used when data source is file-based (UsageLogger).
   */
  private setupFileWatcher(): void {
    // Skip file watching when using API client
    if (this.dataSource instanceof UsageApiClient) return;
    // Guard against duplicate watchers
    if (this.watcher) return;

    try {
      const pattern = new vscode.RelativePattern(
        this.workspacePath,
        '.specify/logs/council-usage.jsonl'
      );
      this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

      const onFileChange = () => this.handleFileChange('file-watch');
      this.watcher.onDidChange(onFileChange);
      this.watcher.onDidCreate(onFileChange);

      this.logger.debug('FileSystemWatcher started for council-usage.jsonl');
    } catch (error) {
      this.logger.warn('Failed to create FileSystemWatcher, relying on polling', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Set up periodic polling.
   * Uses API polling interval (60s default) for UsageApiClient,
   * file polling interval (5s default) for UsageLogger.
   */
  private setupPolling(): void {
    // Guard against duplicate intervals
    if (this.pollingTimer) return;

    const config = vscode.workspace.getConfiguration('gofer');
    const interval =
      this.dataSource instanceof UsageApiClient
        ? config.get<number>('aiUsage.api.pollingInterval', 60000)
        : config.get<number>('aiUsage.polling.interval', 5000);

    this.pollingTimer = setInterval(() => {
      // Skip polling when panel is not visible (T022)
      if (!this.panelVisible) return;
      this.handleFileChange('polling');
    }, interval);

    this.logger.debug(`Polling started with ${interval}ms interval`);
  }

  /**
   * Set up session change listener.
   */
  private setupSessionListener(): void {
    if (!this.multiSessionWatcher || this.sessionListenerCleanup) return;

    const onBridgeUpdate = () => {
      this.handleFileChange('session-change');
    };

    this.multiSessionWatcher.on('bridge-update', onBridgeUpdate);
    this.multiSessionWatcher.on('session-added', onBridgeUpdate);
    this.multiSessionWatcher.on('session-removed', onBridgeUpdate);

    this.sessionListenerCleanup = () => {
      this.multiSessionWatcher?.off('bridge-update', onBridgeUpdate);
      this.multiSessionWatcher?.off('session-added', onBridgeUpdate);
      this.multiSessionWatcher?.off('session-removed', onBridgeUpdate);
    };
  }

  /**
   * Handle file change with debouncing.
   * Multiple writes within DEBOUNCE_MS trigger only one update.
   */
  private handleFileChange(trigger: UsageUpdateEvent['trigger']): void {
    if (this.disposed) return;

    // Debounce rapid changes
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      this.debounceTimer = null;

      // Clear cache and fetch fresh data
      this.cacheTimestamp = 0;
      this.cachedData.clear();

      const periods: AIUsageData[] = [];
      for (const period of ['current', 'today', 'week'] as UsagePeriod[]) {
        const data = await this.fetchUsageData(period);
        this.cachedData.set(period, data);
        periods.push(data);
      }
      this.cacheTimestamp = Date.now();

      const event: UsageUpdateEvent = {
        periods,
        trigger,
        timestamp: Date.now(),
      };
      this.emit('usage-update', event);

      this.logger.debug('Usage updated', {
        trigger,
        totalCost: periods.find((p) => p.period === 'current')?.totalCostUsd ?? 0,
      });
    }, AIUsageMonitor.DEBOUNCE_MS);
  }

  // --- Cleanup Methods ---

  private cleanupWatcher(): void {
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }
  }

  private cleanupPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private cleanupDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private cleanupSessionListener(): void {
    if (this.sessionListenerCleanup) {
      this.sessionListenerCleanup();
      this.sessionListenerCleanup = null;
    }
  }
}
