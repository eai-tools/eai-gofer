/**
 * Unit tests for AIUsageProvider
 *
 * Tests coverage for Feature 025 - AI Usage Tracking Panel:
 * - Tree data generation from monitor events
 * - manualRefresh() method with loading state
 * - Loading state display during refresh
 * - onDidChangeTreeData emission
 * - Error handling for missing monitor
 * - getTreeItem() and getChildren() behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIUsageProvider } from '../../../src/ui/AIUsageProvider';
import { AIUsageItem } from '../../../src/types/aiUsage';
import type { AIUsageMonitor } from '../../../src/autonomous/AIUsageMonitor';
import type { UsageUpdateEvent, AIUsageData } from '../../../src/types/aiUsage';

// Mock vscode module
vi.mock('vscode', () => ({
  TreeItem: class TreeItem {
    constructor(public label: string, public collapsibleState: number) {}
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  EventEmitter: class EventEmitter {
    private listeners: Array<(data: any) => void> = [];

    get event() {
      return (listener: (data: any) => void) => {
        this.listeners.push(listener);
      };
    }

    fire(data?: any) {
      this.listeners.forEach(listener => listener(data));
    }

    dispose() {
      this.listeners = [];
    }
  },
  ThemeIcon: class ThemeIcon {
    constructor(public id: string, public color?: any) {}
  },
  ThemeColor: class ThemeColor {
    constructor(public id: string) {}
  },
}));

// Mock pricing module
vi.mock('../../../src/config/pricing', () => ({
  COST_PER_1K_TOKENS: {
    anthropic: { input: 0.003, output: 0.015 },
    openai: { input: 0.01, output: 0.03 },
    google: { input: 0.001, output: 0.002 },
  },
}));

describe('AIUsageProvider', () => {
  let provider: AIUsageProvider;
  let mockMonitor: AIUsageMonitor;
  let mockTreeView: any;

  const createMockUsageData = (): AIUsageData[] => [
    {
      period: 'current',
      totalCostUsd: 2.45,
      totalTokens: 150000,
      providers: [
        {
          providerId: 'anthropic',
          inputTokens: 100000,
          outputTokens: 50000,
          costUsd: 1.50,
        },
      ],
      budgetLimitUsd: 10.0,
      budgetPercentUsed: 24.5,
      budgetStatus: 'healthy',
    },
    {
      period: 'today',
      totalCostUsd: 5.67,
      totalTokens: 300000,
      providers: [
        {
          providerId: 'anthropic',
          inputTokens: 200000,
          outputTokens: 100000,
          costUsd: 3.0,
        },
        {
          providerId: 'openai',
          inputTokens: 50000,
          outputTokens: 25000,
          costUsd: 2.67,
        },
      ],
    },
    {
      period: 'week',
      totalCostUsd: 18.42,
      totalTokens: 1000000,
      providers: [
        {
          providerId: 'anthropic',
          inputTokens: 500000,
          outputTokens: 250000,
          costUsd: 7.5,
        },
        {
          providerId: 'openai',
          inputTokens: 150000,
          outputTokens: 75000,
          costUsd: 6.75,
        },
        {
          providerId: 'google',
          inputTokens: 200000,
          outputTokens: 100000,
          costUsd: 4.17,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock monitor
    mockMonitor = {
      on: vi.fn(),
      off: vi.fn(),
      forceRefresh: vi.fn().mockResolvedValue(undefined),
      getUsageData: vi.fn().mockResolvedValue(createMockUsageData()[0]),
    } as unknown as AIUsageMonitor;

    // Setup mock tree view
    mockTreeView = {
      onDidChangeVisibility: vi.fn((handler) => {
        return { dispose: vi.fn() };
      }),
    };

    // Create AIUsageProvider
    provider = new AIUsageProvider();
  });

  afterEach(() => {
    if (provider) {
      provider.dispose();
    }
  });

  describe('setMonitor()', () => {
    it('should register usage-update event listener', () => {
      provider.setMonitor(mockMonitor);

      expect(mockMonitor.on).toHaveBeenCalledWith('usage-update', expect.any(Function));
    });

    it('should update latestData when receiving usage-update event', () => {
      provider.setMonitor(mockMonitor);

      const eventHandler = vi.mocked(mockMonitor.on).mock.calls[0][1];
      const mockEvent: UsageUpdateEvent = {
        periods: createMockUsageData(),
        trigger: 'manual',
        timestamp: Date.now(),
      };

      eventHandler(mockEvent);

      expect((provider as any).latestData).toEqual(mockEvent.periods);
    });
  });

  describe('manualRefresh()', () => {
    it('should set loading state before refresh', async () => {
      provider.setMonitor(mockMonitor);

      const refreshPromise = provider.manualRefresh();

      // Loading should be true during refresh
      expect((provider as any)._loading).toBe(true);

      await refreshPromise;
    });

    it('should clear loading state after refresh', async () => {
      provider.setMonitor(mockMonitor);

      await provider.manualRefresh();

      // Loading should be false after completion
      expect((provider as any)._loading).toBe(false);
    });

    it('should call monitor.forceRefresh()', async () => {
      provider.setMonitor(mockMonitor);

      await provider.manualRefresh();

      expect(mockMonitor.forceRefresh).toHaveBeenCalled();
    });

    it('should emit onDidChangeTreeData twice (loading + completion)', async () => {
      provider.setMonitor(mockMonitor);

      const emitSpy = vi.spyOn((provider as any)._onDidChangeTreeData, 'fire');

      await provider.manualRefresh();

      // Once for loading state, once for clearing loading
      expect(emitSpy).toHaveBeenCalledTimes(2);
    });

    it('should clear loading state even if refresh fails', async () => {
      provider.setMonitor(mockMonitor);
      vi.mocked(mockMonitor.forceRefresh).mockRejectedValue(new Error('Refresh failed'));

      await provider.manualRefresh();

      // Loading should still be cleared
      expect((provider as any)._loading).toBe(false);
    });

    it('should handle missing monitor gracefully', async () => {
      // Don't set monitor
      await expect(provider.manualRefresh()).resolves.not.toThrow();
    });
  });

  describe('getChildren()', () => {
    it('should return loading item when _loading is true', async () => {
      provider.setMonitor(mockMonitor);
      (provider as any)._loading = true;

      const children = await provider.getChildren();

      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('Refreshing...');
      expect(children[0].description).toBe('Please wait');
    });

    it('should return period items when data is available', async () => {
      provider.setMonitor(mockMonitor);
      (provider as any).latestData = createMockUsageData();

      const children = await provider.getChildren();

      // Should have 3 period items (current, today, week) plus potential user/all-projects items
      const periodItems = children.filter((item: AIUsageItem) => item.contextType === 'period');
      expect(periodItems.length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array if monitor is not set', async () => {
      // Don't set monitor
      const children = await provider.getChildren();

      expect(children).toEqual([]);
    });

    it('should return provider items for a period element', async () => {
      provider.setMonitor(mockMonitor);
      const periodData = createMockUsageData()[0];

      const periodItem = new AIUsageItem('Current Session', 'period', 0);
      periodItem.usageData = periodData;

      const children = await provider.getChildren(periodItem);

      // Should have provider items (at least 1 for anthropic)
      expect(children.length).toBeGreaterThan(0);
    });

    it('should return token breakdown items for a provider element', async () => {
      provider.setMonitor(mockMonitor);
      const periodData = createMockUsageData()[0];

      const providerItem = new AIUsageItem('Anthropic', 'provider', 0);
      providerItem.usageData = periodData.providers[0];
      providerItem.period = 'current';

      const children = await provider.getChildren(providerItem);

      // Should have 2 items: input tokens, output tokens
      expect(children).toHaveLength(2);
      expect(children[0].label).toBe('Input Tokens');
      expect(children[1].label).toBe('Output Tokens');
    });
  });

  describe('getTreeItem()', () => {
    it('should return the item itself (identity)', () => {
      const item = new AIUsageItem('Test', 'period', 0);
      const result = provider.getTreeItem(item);

      expect(result).toBe(item);
    });
  });

  describe('refresh()', () => {
    it('should emit onDidChangeTreeData event', () => {
      const emitSpy = vi.spyOn((provider as any)._onDidChangeTreeData, 'fire');

      provider.refresh();

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('setTreeView()', () => {
    it('should register visibility change listener', () => {
      provider.setTreeView(mockTreeView);

      expect(mockTreeView.onDidChangeVisibility).toHaveBeenCalled();
    });

    it('should update _visible state on visibility change', () => {
      provider.setMonitor(mockMonitor);
      provider.setTreeView(mockTreeView);

      const visibilityHandler = vi.mocked(mockTreeView.onDidChangeVisibility).mock.calls[0][0];

      // Simulate visibility change to true
      visibilityHandler({ visible: true });
      expect((provider as any)._visible).toBe(true);

      // Simulate visibility change to false
      visibilityHandler({ visible: false });
      expect((provider as any)._visible).toBe(false);
    });

    it('should call setPanelVisible on monitor when visibility changes', () => {
      const mockSetPanelVisible = vi.fn();
      (mockMonitor as any).setPanelVisible = mockSetPanelVisible;

      provider.setMonitor(mockMonitor);
      provider.setTreeView(mockTreeView);

      const visibilityHandler = vi.mocked(mockTreeView.onDidChangeVisibility).mock.calls[0][0];

      visibilityHandler({ visible: true });
      expect(mockSetPanelVisible).toHaveBeenCalledWith(true);

      visibilityHandler({ visible: false });
      expect(mockSetPanelVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('dispose()', () => {
    it('should dispose event emitter', () => {
      const disposeSpy = vi.spyOn((provider as any)._onDidChangeTreeData, 'dispose');

      provider.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should dispose all registered disposables', () => {
      provider.setMonitor(mockMonitor);
      provider.setTreeView(mockTreeView);

      const disposables = (provider as any).disposables;
      const initialLength = disposables.length;

      provider.dispose();

      expect((provider as any).disposables).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle monitor.getUsageData() failure gracefully', async () => {
      vi.mocked(mockMonitor.getUsageData).mockRejectedValue(new Error('Data fetch failed'));
      provider.setMonitor(mockMonitor);

      // Should not throw
      await expect(provider.getChildren()).resolves.not.toThrow();
    });

    it('should log error when manualRefresh fails', async () => {
      vi.mocked(mockMonitor.forceRefresh).mockRejectedValue(new Error('Refresh failed'));
      provider.setMonitor(mockMonitor);

      await provider.manualRefresh();

      // Should complete without throwing
      expect((provider as any)._loading).toBe(false);
    });
  });
});
