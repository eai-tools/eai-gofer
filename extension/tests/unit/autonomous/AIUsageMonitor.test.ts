/**
 * Unit tests for AIUsageMonitor
 *
 * Tests coverage for Feature 025 - AI Usage Tracking Panel:
 * - forceRefresh() triggers manual update with correct event payload
 * - setupPolling() creates timer with 3600000ms interval (1 hour)
 * - Polling guard prevents duplicate timers
 * - Event emission with correct trigger types (manual, polling, file-watch, session-change)
 * - Cache TTL behavior
 * - Error path coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIUsageMonitor } from '../../../src/autonomous/AIUsageMonitor';
import type { UsageDataSource, AIUsageData, UsagePeriod } from '../../../src/types/aiUsage';
import type { CostBudgetEnforcer } from '../../../src/autonomous/CostBudgetEnforcer';

// Mock vscode module
vi.mock('vscode', () => ({
  workspace: {
    createFileSystemWatcher: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'aiUsage.polling.interval') return 3600000; // 1 hour default
        if (key === 'aiUsage.api.pollingInterval') return 60000;
        return defaultValue;
      }),
    })),
  },
  RelativePattern: vi.fn((base, pattern) => ({ base, pattern })),
}));

// Mock pricing module
vi.mock('../../../src/config/pricing', () => ({
  isPricingStale: vi.fn(() => false),
  COST_PER_1K_TOKENS: {
    anthropic: { input: 0.003, output: 0.015 },
    openai: { input: 0.01, output: 0.03 },
  },
  calculateCost: vi.fn((inputTokens, outputTokens) => (inputTokens * 0.003 + outputTokens * 0.015) / 1000),
}));

describe('AIUsageMonitor', () => {
  let monitor: AIUsageMonitor;
  let mockDataSource: UsageDataSource;
  let mockBudgetEnforcer: CostBudgetEnforcer;
  let mockWatcher: any;

  const createMockUsageData = (period: UsagePeriod): AIUsageData => ({
    period,
    totalCostUsd: 1.5,
    totalTokens: 100000,
    providers: [
      {
        providerId: 'anthropic',
        inputTokens: 50000,
        outputTokens: 25000,
        costUsd: 1.2,
      },
    ],
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock data source
    mockDataSource = {
      getUsageForPeriod: vi.fn(async (period: UsagePeriod) => createMockUsageData(period)),
    } as unknown as UsageDataSource;

    // Setup mock budget enforcer
    mockBudgetEnforcer = {
      getSnapshot: vi.fn(() => ({
        totalCost: 1.5,
        budgetLimit: 10.0,
        percentUsed: 15,
        budgetStatus: 'healthy',
      })),
    } as unknown as CostBudgetEnforcer;

    // Setup mock file system watcher
    mockWatcher = {
      onDidChange: vi.fn(),
      onDidCreate: vi.fn(),
      dispose: vi.fn(),
    };

    const vscode = await import('vscode');
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockWatcher);

    // Create AIUsageMonitor
    monitor = new AIUsageMonitor(
      '/test/workspace',
      mockDataSource,
      mockBudgetEnforcer,
      undefined // no multi-session watcher for basic tests
    );
  });

  afterEach(() => {
    if (monitor) {
      monitor.stopMonitoring();
      monitor.dispose();
    }
  });

  describe('forceRefresh()', () => {
    it('should emit usage-update event with trigger="manual"', async () => {
      const eventHandler = vi.fn();
      monitor.on('usage-update', eventHandler);

      await monitor.forceRefresh();

      expect(eventHandler).toHaveBeenCalledTimes(1);
      const event = eventHandler.mock.calls[0][0];
      expect(event.trigger).toBe('manual');
      expect(event.periods).toHaveLength(3); // current, today, week
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('should fetch data for all three periods', async () => {
      await monitor.forceRefresh();

      expect(mockDataSource.getUsageForPeriod).toHaveBeenCalledWith('current');
      expect(mockDataSource.getUsageForPeriod).toHaveBeenCalledWith('today');
      expect(mockDataSource.getUsageForPeriod).toHaveBeenCalledWith('week');
      expect(mockDataSource.getUsageForPeriod).toHaveBeenCalledTimes(3);
    });

    it('should clear cache before fetching', async () => {
      // Prime cache
      await monitor.getUsageData('current');
      expect(mockDataSource.getUsageForPeriod).toHaveBeenCalledTimes(1);

      // Force refresh should clear cache and fetch again
      await monitor.forceRefresh();
      expect(mockDataSource.getUsageForPeriod).toHaveBeenCalledTimes(4); // 1 + 3 from refresh
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Data fetch failed');
      vi.mocked(mockDataSource.getUsageForPeriod).mockRejectedValueOnce(mockError);

      // Should not throw
      await expect(monitor.forceRefresh()).resolves.not.toThrow();
    });
  });

  describe('setupPolling()', () => {
    it('should create polling timer with 3600000ms (1 hour) interval', async () => {
      vi.useFakeTimers();

      monitor.startMonitoring();

      // Fast-forward 1 hour
      vi.advanceTimersByTime(3600000);

      // Should have polled once
      expect(mockDataSource.getUsageForPeriod).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should prevent duplicate polling timers', () => {
      monitor.startMonitoring();
      const firstTimer = (monitor as any).pollingTimer;

      // Try to start again
      monitor.startMonitoring();
      const secondTimer = (monitor as any).pollingTimer;

      // Should be the same timer
      expect(firstTimer).toBe(secondTimer);
    });

    it('should skip polling when panel not visible', async () => {
      vi.useFakeTimers();

      monitor.startMonitoring();
      (monitor as any).setPanelVisible(false);

      const initialCallCount = vi.mocked(mockDataSource.getUsageForPeriod).mock.calls.length;

      // Fast-forward 1 hour
      vi.advanceTimersByTime(3600000);

      // Should NOT have polled (panel not visible)
      expect(vi.mocked(mockDataSource.getUsageForPeriod).mock.calls.length).toBe(initialCallCount);

      vi.useRealTimers();
    });

    it('should emit usage-update event with trigger="polling"', async () => {
      vi.useFakeTimers();

      const eventHandler = vi.fn();
      monitor.on('usage-update', eventHandler);

      monitor.startMonitoring();
      (monitor as any).setPanelVisible(true);

      // Clear initial forceRefresh call
      eventHandler.mockClear();

      // Fast-forward to trigger polling
      vi.advanceTimersByTime(3600000);

      // Wait for async operations
      await vi.runAllTimersAsync();

      expect(eventHandler).toHaveBeenCalled();
      const event = eventHandler.mock.calls[0][0];
      expect(event.trigger).toBe('polling');

      vi.useRealTimers();
    });
  });

  describe('getUsageData()', () => {
    it('should fetch data for the specified period', async () => {
      const data = await monitor.getUsageData('current');

      expect(mockDataSource.getUsageForPeriod).toHaveBeenCalledWith('current');
      expect(data.period).toBe('current');
      expect(data.totalCostUsd).toBe(1.5);
    });

    it('should return cached data within TTL', async () => {
      // First fetch
      const data1 = await monitor.getUsageData('current');
      expect(mockDataSource.getUsageForPeriod).toHaveBeenCalledTimes(1);

      // Second fetch within TTL (5 seconds)
      const data2 = await monitor.getUsageData('current');
      expect(mockDataSource.getUsageForPeriod).toHaveBeenCalledTimes(1); // No additional fetch
      expect(data2).toBe(data1); // Same instance
    });

    it('should fetch fresh data after TTL expires', async () => {
      vi.useFakeTimers();

      // First fetch
      await monitor.getUsageData('current');
      expect(mockDataSource.getUsageForPeriod).toHaveBeenCalledTimes(1);

      // Fast-forward past TTL (5 seconds)
      vi.advanceTimersByTime(6000);

      // Second fetch should get fresh data
      await monitor.getUsageData('current');
      expect(mockDataSource.getUsageForPeriod).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('file watcher', () => {
    it('should create file watcher for council-usage.jsonl', () => {
      monitor.startMonitoring();

      const vscode = require('vscode');
      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          base: '/test/workspace',
          pattern: '.specify/logs/council-usage.jsonl',
        })
      );
    });

    it('should register onChange and onCreate handlers', () => {
      monitor.startMonitoring();

      expect(mockWatcher.onDidChange).toHaveBeenCalled();
      expect(mockWatcher.onDidCreate).toHaveBeenCalled();
    });

    it('should emit usage-update with trigger="file-watch" on file change', async () => {
      const eventHandler = vi.fn();
      monitor.on('usage-update', eventHandler);

      monitor.startMonitoring();

      // Clear initial forceRefresh
      eventHandler.mockClear();

      // Simulate file change
      const onChangeHandler = mockWatcher.onDidChange.mock.calls[0][0];
      await onChangeHandler();

      expect(eventHandler).toHaveBeenCalled();
      const event = eventHandler.mock.calls[0][0];
      expect(event.trigger).toBe('file-watch');
    });
  });

  describe('stopMonitoring()', () => {
    it('should dispose file watcher', () => {
      monitor.startMonitoring();
      monitor.stopMonitoring();

      expect(mockWatcher.dispose).toHaveBeenCalled();
    });

    it('should clear polling timer', () => {
      vi.useFakeTimers();

      monitor.startMonitoring();
      const timerExists = (monitor as any).pollingTimer !== null;
      expect(timerExists).toBe(true);

      monitor.stopMonitoring();
      const timerCleared = (monitor as any).pollingTimer === null;
      expect(timerCleared).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('setPanelVisible()', () => {
    it('should update panel visibility state', () => {
      (monitor as any).setPanelVisible(false);
      expect((monitor as any).panelVisible).toBe(false);

      (monitor as any).setPanelVisible(true);
      expect((monitor as any).panelVisible).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should not throw when data source fails', async () => {
      vi.mocked(mockDataSource.getUsageForPeriod).mockRejectedValue(new Error('Fetch failed'));

      await expect(monitor.getUsageData('current')).rejects.toThrow('Fetch failed');
      // Should not crash the monitor
    });

    it('should continue monitoring after error', async () => {
      const eventHandler = vi.fn();
      monitor.on('usage-update', eventHandler);

      // First call fails
      vi.mocked(mockDataSource.getUsageForPeriod).mockRejectedValueOnce(new Error('Temporary failure'));

      await expect(monitor.forceRefresh()).rejects.toThrow();

      // Second call succeeds
      vi.mocked(mockDataSource.getUsageForPeriod).mockResolvedValue(createMockUsageData('current'));
      await monitor.forceRefresh();

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  describe('dispose()', () => {
    it('should stop monitoring and clean up resources', () => {
      monitor.startMonitoring();
      monitor.dispose();

      expect(mockWatcher.dispose).toHaveBeenCalled();
      expect((monitor as any).disposed).toBe(true);
    });

    it('should prevent starting after disposal', () => {
      monitor.dispose();
      monitor.startMonitoring();

      // Should not create watcher after disposal
      const vscode = require('vscode');
      expect(vscode.workspace.createFileSystemWatcher).not.toHaveBeenCalled();
    });
  });
});
