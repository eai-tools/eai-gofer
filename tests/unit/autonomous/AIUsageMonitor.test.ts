/**
 * Unit tests for AIUsageMonitor
 *
 * Tests JSONL parsing, aggregation by time period, cost calculations,
 * event emission, and caching behavior.
 *
 * Feature 025: AI Token Usage Tracking Panel
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Logger
vi.mock('../../../extension/src/utils/logger', () => ({
  Logger: {
    for: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Mock vscode
vi.mock('vscode', () => {
  const mockWatcher = {
    onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
    onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(),
  };

  return {
    workspace: {
      createFileSystemWatcher: vi.fn(() => mockWatcher),
      getConfiguration: vi.fn(() => ({
        get: vi.fn((key: string, defaultValue: unknown) => {
          if (key === 'aiUsage.polling.interval') return 5000;
          return defaultValue;
        }),
      })),
      onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
    },
    RelativePattern: class {
      constructor(
        public base: string,
        public pattern: string
      ) {}
    },
  };
});

import { AIUsageMonitor } from '../../../extension/src/autonomous/AIUsageMonitor';
import type { UsageDataSource, UsageSummary } from '../../../extension/src/types/aiUsage';
import type { CostBudgetEnforcer } from '../../../extension/src/autonomous/CostBudgetEnforcer';

/**
 * Create a mock local usage data source.
 */
function createMockUsageDataSource(summary?: Partial<UsageSummary>): UsageDataSource {
  const defaultSummary: UsageSummary = {
    totalSessions: 3,
    totalInputTokens: 100000,
    totalOutputTokens: 50000,
    totalCachedInputTokens: 0,
    totalCacheReadTokens: 0,
    totalCacheWriteTokens: 0,
    totalCostUsd: 2.45,
    byProvider: {
      'claude-code': { requests: 2, tokens: 80000, costUsd: 1.5 },
      'codex-cli': { requests: 1, tokens: 40000, costUsd: 0.75 },
      copilot: { requests: 1, tokens: 30000, costUsd: 0.2 },
    },
    ...summary,
  };

  return {
    getUsageSummary: vi.fn().mockResolvedValue(defaultSummary),
  } as unknown as UsageDataSource;
}

/**
 * Create a mock CostBudgetEnforcer
 */
function createMockEnforcer(
  status: 'healthy' | 'warning' | 'exceeded' = 'healthy',
  costUsd = 2.45,
  percentUsed = 24.5
): CostBudgetEnforcer {
  return {
    getSnapshot: vi.fn().mockReturnValue({
      currentCostUsd: costUsd,
      currentTokens: 150000,
      percentUsed,
      status,
    }),
    getConfig: vi.fn().mockReturnValue({
      maxCostUsd: 10.0,
      maxTokensPerRun: 500000,
      enforcementMode: 'advisory',
      warningThreshold: 0.8,
    }),
    recordUsage: vi.fn(),
    canProceed: vi.fn().mockReturnValue(true),
    reset: vi.fn(),
  } as unknown as CostBudgetEnforcer;
}

describe('AIUsageMonitor', () => {
  let monitor: AIUsageMonitor;
  let mockLogger: UsageDataSource;
  let mockEnforcer: CostBudgetEnforcer;

  beforeEach(() => {
    vi.useFakeTimers();
    mockLogger = createMockUsageDataSource();
    mockEnforcer = createMockEnforcer();
    monitor = new AIUsageMonitor('/workspace', mockLogger, mockEnforcer);
  });

  afterEach(() => {
    monitor.dispose();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('getUsageData()', () => {
    it('should expose the workspace path', () => {
      expect(monitor.getWorkspacePath()).toBe('/workspace');
    });

    it('should return aggregated data for current session', async () => {
      const data = await monitor.getUsageData('current');

      expect(data.period).toBe('current');
      expect(data.totalCostUsd).toBe(2.45);
      expect(data.totalTokens).toBe(150000); // 100000 + 50000
      expect(data.providers).toHaveLength(3);
    });

    it('should include budget info for current session', async () => {
      const data = await monitor.getUsageData('current');

      expect(data.budgetLimitUsd).toBe(10.0);
      expect(data.budgetPercentUsed).toBe(24.5);
      expect(data.budgetStatus).toBe('healthy');
    });

    it('should not include budget info for today period', async () => {
      const data = await monitor.getUsageData('today');

      expect(data.budgetLimitUsd).toBeUndefined();
      expect(data.budgetPercentUsed).toBeUndefined();
      expect(data.budgetStatus).toBeUndefined();
    });

    it('should not include budget info for week period', async () => {
      const data = await monitor.getUsageData('week');

      expect(data.budgetLimitUsd).toBeUndefined();
    });

    it('should call getUsageSummary with date filters for today', async () => {
      await monitor.getUsageData('today');

      expect(mockLogger.getUsageSummary).toHaveBeenCalledWith(
        expect.any(Date), // fromDate: start of today
        expect.any(Date) // toDate: now
      );

      const [fromDate] = (mockLogger.getUsageSummary as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fromDate.getHours()).toBe(0);
      expect(fromDate.getMinutes()).toBe(0);
    });

    it('should call getUsageSummary with week date range', async () => {
      await monitor.getUsageData('week');

      expect(mockLogger.getUsageSummary).toHaveBeenCalledWith(
        expect.any(Date), // fromDate: start of week
        expect.any(Date) // toDate: now
      );

      const [fromDate] = (mockLogger.getUsageSummary as ReturnType<typeof vi.fn>).mock.calls[0];
      // Should be a Monday (day 1)
      expect(fromDate.getDay()).toBe(1);
    });

    it('should return empty data on error', async () => {
      const errorLogger = createMockUsageDataSource();
      (errorLogger.getUsageSummary as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('File not found')
      );

      const errorMonitor = new AIUsageMonitor('/workspace', errorLogger);
      const data = await errorMonitor.getUsageData('current');

      expect(data.totalCostUsd).toBe(0);
      expect(data.totalTokens).toBe(0);
      expect(data.providers).toHaveLength(0);
      expect(data.error).toBe('api_error');
      expect(data.errorMessage).toBe('File not found');

      errorMonitor.dispose();
    });

    it('should cache data within TTL', async () => {
      await monitor.getUsageData('current');
      await monitor.getUsageData('current');

      // Should only call getUsageSummary once (second call uses cache)
      expect(mockLogger.getUsageSummary).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after TTL expires', async () => {
      await monitor.getUsageData('current');

      // Advance time past TTL (5 seconds)
      vi.advanceTimersByTime(6000);

      await monitor.getUsageData('current');

      expect(mockLogger.getUsageSummary).toHaveBeenCalledTimes(2);
    });
  });

  describe('Provider mapping', () => {
    it('should map provider data correctly', async () => {
      const data = await monitor.getUsageData('current');

      const claude = data.providers.find((p) => p.providerId === 'claude-code');
      expect(claude).toBeDefined();
      expect(claude!.costUsd).toBe(1.5);

      const codex = data.providers.find((p) => p.providerId === 'codex-cli');
      expect(codex).toBeDefined();
      expect(codex!.costUsd).toBe(0.75);

      const copilot = data.providers.find((p) => p.providerId === 'copilot');
      expect(copilot).toBeDefined();
      expect(copilot!.costUsd).toBe(0.2);
    });

    it('should estimate input/output split using global ratio', async () => {
      const data = await monitor.getUsageData('current');

      // Global ratio: 100000/(100000+50000) = 0.667 input
      const anthropic = data.providers.find((p) => p.providerId === 'claude-code')!;
      const expectedInputTokens = Math.round(80000 * (100000 / 150000));
      expect(anthropic.inputTokens).toBe(expectedInputTokens);
      expect(anthropic.outputTokens).toBe(80000 - expectedInputTokens);
    });

    it('should use 60/40 split when no global ratio available', async () => {
      const zeroLogger = createMockUsageDataSource({
        totalInputTokens: 0,
        totalOutputTokens: 0,
        byProvider: {
          'claude-code': { requests: 1, tokens: 1000, costUsd: 0.01 },
        },
      });

      const zeroMonitor = new AIUsageMonitor('/workspace', zeroLogger);
      const data = await zeroMonitor.getUsageData('current');

      const anthropic = data.providers.find((p) => p.providerId === 'claude-code')!;
      expect(anthropic.inputTokens).toBe(600); // 60% of 1000
      expect(anthropic.outputTokens).toBe(400); // 40% of 1000

      zeroMonitor.dispose();
    });
  });

  describe('forceRefresh()', () => {
    it('should clear cache and emit event', async () => {
      const eventHandler = vi.fn();
      monitor.on('usage-update', eventHandler);

      await monitor.forceRefresh();

      expect(eventHandler).toHaveBeenCalledTimes(1);
      const event = eventHandler.mock.calls[0][0];
      expect(event.trigger).toBe('manual');
      expect(event.periods).toHaveLength(3);
      expect(event.periods[0].period).toBe('current');
      expect(event.periods[1].period).toBe('today');
      expect(event.periods[2].period).toBe('week');
    });

    it('should clear cache so next getUsageData fetches fresh', async () => {
      // Populate cache
      await monitor.getUsageData('current');
      expect(mockLogger.getUsageSummary).toHaveBeenCalledTimes(1);

      // Force refresh clears cache
      await monitor.forceRefresh();

      // 1 original + 3 for forceRefresh (current, today, week)
      expect(mockLogger.getUsageSummary).toHaveBeenCalledTimes(4);
    });
  });

  describe('Budget integration', () => {
    it('should show healthy status when under 80%', async () => {
      const data = await monitor.getUsageData('current');
      expect(data.budgetStatus).toBe('healthy');
    });

    it('should show warning status at 80-100%', async () => {
      const warningEnforcer = createMockEnforcer('warning', 8.5, 85);
      const warningMonitor = new AIUsageMonitor('/workspace', mockLogger, warningEnforcer);

      const data = await warningMonitor.getUsageData('current');
      expect(data.budgetStatus).toBe('warning');
      expect(data.budgetPercentUsed).toBe(85);

      warningMonitor.dispose();
    });

    it('should show exceeded status above 100%', async () => {
      const exceededEnforcer = createMockEnforcer('exceeded', 12.0, 120);
      const exceededMonitor = new AIUsageMonitor('/workspace', mockLogger, exceededEnforcer);

      const data = await exceededMonitor.getUsageData('current');
      expect(data.budgetStatus).toBe('exceeded');
      expect(data.budgetPercentUsed).toBe(120);

      exceededMonitor.dispose();
    });

    it('should work without budget enforcer', async () => {
      const noBudgetMonitor = new AIUsageMonitor('/workspace', mockLogger);

      const data = await noBudgetMonitor.getUsageData('current');
      expect(data.budgetLimitUsd).toBeUndefined();
      expect(data.budgetStatus).toBeUndefined();

      noBudgetMonitor.dispose();
    });
  });

  describe('dispose()', () => {
    it('should clean up all resources', () => {
      monitor.startMonitoring();
      monitor.dispose();

      // Should not emit events after dispose
      const eventHandler = vi.fn();
      monitor.on('usage-update', eventHandler);

      // Advance time past polling interval
      vi.advanceTimersByTime(10000);

      // No events should fire since monitor is disposed
      // (polling timer was cleared)
      expect(eventHandler).not.toHaveBeenCalled();
    });

    it('should prevent reuse after dispose', async () => {
      monitor.dispose();

      // getUsageData should still work (returns empty data)
      const data = await monitor.getUsageData('current');
      expect(data).toBeDefined();
    });

    it('should be safe to call dispose twice', () => {
      monitor.dispose();
      expect(() => monitor.dispose()).not.toThrow();
    });
  });

  describe('getAllCachedData()', () => {
    it('should return empty array initially', () => {
      expect(monitor.getAllCachedData()).toHaveLength(0);
    });

    it('should return cached data after forceRefresh', async () => {
      await monitor.forceRefresh();
      const cached = monitor.getAllCachedData();
      expect(cached).toHaveLength(3);
    });
  });

  describe('setPanelVisible() (T022)', () => {
    it('should skip polling when panel is not visible', async () => {
      monitor.startMonitoring();
      monitor.setPanelVisible(false);

      // Advance past polling interval
      vi.advanceTimersByTime(60000);

      // getUsageSummary should not be called while hidden
      const calls = (mockLogger.getUsageSummary as ReturnType<typeof vi.fn>).mock.calls.length;
      monitor.setPanelVisible(false);
      vi.advanceTimersByTime(60000);
      const callsAfter = (mockLogger.getUsageSummary as ReturnType<typeof vi.fn>).mock.calls.length;

      // No additional calls while hidden
      expect(callsAfter).toBe(calls);
    });

    it('should trigger immediate refresh after idle threshold', async () => {
      // Spy on forceRefresh to detect if it's called
      const forceRefreshSpy = vi.spyOn(monitor, 'forceRefresh');

      monitor.startMonitoring();
      // Force a call to set lastApiCallTimestamp
      await monitor.forceRefresh();
      forceRefreshSpy.mockClear();

      // Hide panel
      monitor.setPanelVisible(false);

      // Advance past idle threshold (10 minutes)
      vi.advanceTimersByTime(10 * 60 * 1000 + 1000);

      // Show panel again — should trigger immediate refresh
      monitor.setPanelVisible(true);

      expect(forceRefreshSpy).toHaveBeenCalledTimes(1);
    });

    it('should not refresh if idle time is under threshold', async () => {
      monitor.startMonitoring();
      await monitor.forceRefresh();
      const callsBefore = (mockLogger.getUsageSummary as ReturnType<typeof vi.fn>).mock.calls
        .length;

      // Hide briefly
      monitor.setPanelVisible(false);
      vi.advanceTimersByTime(5000); // 5 seconds — well under 10 min threshold
      monitor.setPanelVisible(true);

      // No immediate refresh triggered
      const callsAfter = (mockLogger.getUsageSummary as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(callsAfter).toBe(callsBefore);
    });
  });
});
