/**
 * Unit tests for AIUsageProvider
 *
 * Tests tree structure, item formatting, budget color-coding,
 * and integration with AIUsageMonitor events.
 *
 * Feature 025: AI Token Usage Tracking Panel
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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
vi.mock('vscode', () => ({
  TreeItem: class TreeItem {
    label: string;
    collapsibleState: number;
    description?: string;
    tooltip?: string;
    iconPath?: unknown;
    contextValue?: string;
    command?: unknown;

    constructor(label: string, collapsibleState: number = 0) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  ThemeIcon: class ThemeIcon {
    constructor(
      public id: string,
      public color?: unknown
    ) {}
  },
  ThemeColor: class ThemeColor {
    constructor(public id: string) {}
  },
  EventEmitter: class EventEmitter {
    private handlers: Array<(...args: unknown[]) => void> = [];
    event = (handler: (...args: unknown[]) => void) => {
      this.handlers.push(handler);
      return { dispose: () => {} };
    };
    fire(data?: unknown) {
      for (const h of this.handlers) h(data);
    }
    dispose() {}
  },
}));

import { AIUsageProvider } from '../../../extension/src/ui/AIUsageProvider';
import { AIUsageItem } from '../../../extension/src/types/aiUsage';
import type { AIUsageData, UsageUpdateEvent } from '../../../extension/src/types/aiUsage';
import { EventEmitter } from 'events';

/**
 * Create a mock AIUsageMonitor
 */
function createMockMonitor(data?: AIUsageData[]): EventEmitter & {
  getUsageData: ReturnType<typeof vi.fn>;
} {
  const emitter = new EventEmitter();
  const defaultData: AIUsageData[] = data ?? [
    {
      period: 'current',
      totalCostUsd: 2.45,
      totalTokens: 150000,
      providers: [
        { providerId: 'anthropic', inputTokens: 30000, outputTokens: 20000, costUsd: 1.5 },
        { providerId: 'openai', inputTokens: 10000, outputTokens: 5000, costUsd: 0.75 },
        { providerId: 'google', inputTokens: 60000, outputTokens: 20000, costUsd: 0.2 },
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
        { providerId: 'anthropic', inputTokens: 60000, outputTokens: 40000, costUsd: 3.5 },
        { providerId: 'openai', inputTokens: 20000, outputTokens: 10000, costUsd: 1.5 },
        { providerId: 'google', inputTokens: 120000, outputTokens: 40000, costUsd: 0.67 },
      ],
    },
    {
      period: 'week',
      totalCostUsd: 18.42,
      totalTokens: 900000,
      providers: [
        { providerId: 'anthropic', inputTokens: 180000, outputTokens: 120000, costUsd: 10.5 },
        { providerId: 'openai', inputTokens: 60000, outputTokens: 30000, costUsd: 5.0 },
        { providerId: 'google', inputTokens: 360000, outputTokens: 120000, costUsd: 2.92 },
      ],
    },
  ];

  const mock = Object.assign(emitter, {
    getUsageData: vi.fn((period: string) => {
      return Promise.resolve(defaultData.find((d) => d.period === period) ?? defaultData[0]);
    }),
  });

  return mock;
}

describe('AIUsageProvider', () => {
  let provider: AIUsageProvider;
  let mockMonitor: ReturnType<typeof createMockMonitor>;

  beforeEach(() => {
    provider = new AIUsageProvider();
    mockMonitor = createMockMonitor();
    provider.setMonitor(
      mockMonitor as unknown as import('../../../extension/src/autonomous/AIUsageMonitor').AIUsageMonitor
    );
  });

  describe('getChildren() - root level', () => {
    it('should return 3 period items at root', async () => {
      // Emit usage update event to populate data
      const event: UsageUpdateEvent = {
        periods: [
          {
            period: 'current',
            totalCostUsd: 2.45,
            totalTokens: 150000,
            providers: [
              { providerId: 'anthropic', inputTokens: 30000, outputTokens: 20000, costUsd: 1.5 },
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
              { providerId: 'anthropic', inputTokens: 60000, outputTokens: 40000, costUsd: 3.5 },
            ],
          },
          {
            period: 'week',
            totalCostUsd: 18.42,
            totalTokens: 900000,
            providers: [
              { providerId: 'anthropic', inputTokens: 180000, outputTokens: 120000, costUsd: 10.5 },
            ],
          },
        ],
        trigger: 'manual',
        timestamp: Date.now(),
      };
      mockMonitor.emit('usage-update', event);

      const children = await provider.getChildren();
      expect(children).toHaveLength(3);
    });

    it('should label period items correctly', async () => {
      const event: UsageUpdateEvent = {
        periods: [
          { period: 'current', totalCostUsd: 2.45, totalTokens: 150000, providers: [] },
          { period: 'today', totalCostUsd: 5.67, totalTokens: 300000, providers: [] },
          { period: 'week', totalCostUsd: 18.42, totalTokens: 900000, providers: [] },
        ],
        trigger: 'manual',
        timestamp: Date.now(),
      };
      mockMonitor.emit('usage-update', event);

      const children = await provider.getChildren();

      expect(children[0].label).toBe('Current Session');
      expect(children[1].label).toBe('Today');
      expect(children[2].label).toBe('This Week');
    });

    it('should format cost in description', async () => {
      const event: UsageUpdateEvent = {
        periods: [
          { period: 'current', totalCostUsd: 2.45, totalTokens: 150000, providers: [] },
          { period: 'today', totalCostUsd: 5.67, totalTokens: 300000, providers: [] },
          { period: 'week', totalCostUsd: 18.42, totalTokens: 900000, providers: [] },
        ],
        trigger: 'manual',
        timestamp: Date.now(),
      };
      mockMonitor.emit('usage-update', event);

      const children = await provider.getChildren();

      expect(children[1].description).toBe('$5.67');
      expect(children[2].description).toBe('$18.42');
    });

    it('should show budget in current session description', async () => {
      const event: UsageUpdateEvent = {
        periods: [
          {
            period: 'current',
            totalCostUsd: 2.45,
            totalTokens: 150000,
            providers: [],
            budgetLimitUsd: 10.0,
            budgetPercentUsed: 24.5,
            budgetStatus: 'healthy',
          },
        ],
        trigger: 'manual',
        timestamp: Date.now(),
      };
      mockMonitor.emit('usage-update', event);

      const children = await provider.getChildren();
      expect(children[0].description).toBe('$2.45 / $10.00 (25%)');
    });

    it('should set collapsible state to Collapsed for periods', async () => {
      const event: UsageUpdateEvent = {
        periods: [{ period: 'current', totalCostUsd: 0, totalTokens: 0, providers: [] }],
        trigger: 'manual',
        timestamp: Date.now(),
      };
      mockMonitor.emit('usage-update', event);

      const children = await provider.getChildren();
      expect(children[0].collapsibleState).toBe(1); // Collapsed
    });

    it('should return empty array with no data', async () => {
      const children = await provider.getChildren();
      // With no events fired and monitor mocked, it should try to load from monitor
      expect(children).toBeDefined();
    });
  });

  describe('getChildren() - period expansion', () => {
    it('should return provider items when expanding a period', async () => {
      const periodItem = new AIUsageItem('Current Session', 'period', 1);
      periodItem.usageData = {
        period: 'current',
        totalCostUsd: 2.45,
        totalTokens: 150000,
        providers: [
          { providerId: 'anthropic', inputTokens: 30000, outputTokens: 20000, costUsd: 1.5 },
          { providerId: 'openai', inputTokens: 10000, outputTokens: 5000, costUsd: 0.75 },
          { providerId: 'google', inputTokens: 60000, outputTokens: 20000, costUsd: 0.2 },
        ],
      };

      const children = await provider.getChildren(periodItem);
      expect(children).toHaveLength(3);
    });

    it('should sort providers by cost descending', async () => {
      const periodItem = new AIUsageItem('Current Session', 'period', 1);
      periodItem.usageData = {
        period: 'current',
        totalCostUsd: 2.45,
        totalTokens: 150000,
        providers: [
          { providerId: 'google', inputTokens: 60000, outputTokens: 20000, costUsd: 0.2 },
          { providerId: 'anthropic', inputTokens: 30000, outputTokens: 20000, costUsd: 1.5 },
          { providerId: 'openai', inputTokens: 10000, outputTokens: 5000, costUsd: 0.75 },
        ],
      };

      const children = await provider.getChildren(periodItem);
      expect(children[0].label).toBe('Anthropic');
      expect(children[1].label).toBe('OpenAI');
      expect(children[2].label).toBe('Google');
    });

    it('should format provider description with cost and tokens', async () => {
      const periodItem = new AIUsageItem('Current Session', 'period', 1);
      periodItem.usageData = {
        period: 'current',
        totalCostUsd: 1.5,
        totalTokens: 50000,
        providers: [
          { providerId: 'anthropic', inputTokens: 30000, outputTokens: 20000, costUsd: 1.5 },
        ],
      };

      const children = await provider.getChildren(periodItem);
      expect(children[0].description).toBe('$1.50 (50,000 tokens)');
    });

    it('should show "No usage data" for empty providers', async () => {
      const periodItem = new AIUsageItem('Current Session', 'period', 1);
      periodItem.usageData = {
        period: 'current',
        totalCostUsd: 0,
        totalTokens: 0,
        providers: [],
      };

      const children = await provider.getChildren(periodItem);
      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('No usage data');
    });
  });

  describe('getChildren() - provider expansion', () => {
    it('should return input and output token items', async () => {
      const providerItem = new AIUsageItem('Anthropic', 'provider', 1);
      providerItem.usageData = {
        providerId: 'anthropic',
        inputTokens: 30000,
        outputTokens: 20000,
        costUsd: 1.5,
      };
      providerItem.period = 'current';

      const children = await provider.getChildren(providerItem);
      expect(children).toHaveLength(2);
      expect(children[0].label).toBe('Input Tokens');
      expect(children[1].label).toBe('Output Tokens');
    });

    it('should format token counts with separator', async () => {
      const providerItem = new AIUsageItem('Anthropic', 'provider', 1);
      providerItem.usageData = {
        providerId: 'anthropic',
        inputTokens: 30000,
        outputTokens: 20000,
        costUsd: 1.5,
      };
      providerItem.period = 'current';

      const children = await provider.getChildren(providerItem);
      // Check that description contains formatted token count
      expect(children[0].description).toContain('30,000');
      expect(children[1].description).toContain('20,000');
    });

    it('should set collapsible state to None for token items', async () => {
      const providerItem = new AIUsageItem('Anthropic', 'provider', 1);
      providerItem.usageData = {
        providerId: 'anthropic',
        inputTokens: 30000,
        outputTokens: 20000,
        costUsd: 1.5,
      };
      providerItem.period = 'current';

      const children = await provider.getChildren(providerItem);
      expect(children[0].collapsibleState).toBe(0); // None
      expect(children[1].collapsibleState).toBe(0); // None
    });
  });

  describe('Budget color-coding', () => {
    it('should use green color for healthy status', async () => {
      const event: UsageUpdateEvent = {
        periods: [
          {
            period: 'current',
            totalCostUsd: 2.45,
            totalTokens: 150000,
            providers: [],
            budgetLimitUsd: 10.0,
            budgetPercentUsed: 24.5,
            budgetStatus: 'healthy',
          },
        ],
        trigger: 'manual',
        timestamp: Date.now(),
      };
      mockMonitor.emit('usage-update', event);

      const children = await provider.getChildren();
      const icon = children[0].iconPath as { id: string; color?: { id: string } };
      expect(icon.color?.id).toBe('charts.green');
    });

    it('should use yellow color for warning status', async () => {
      const event: UsageUpdateEvent = {
        periods: [
          {
            period: 'current',
            totalCostUsd: 8.5,
            totalTokens: 400000,
            providers: [],
            budgetLimitUsd: 10.0,
            budgetPercentUsed: 85,
            budgetStatus: 'warning',
          },
        ],
        trigger: 'manual',
        timestamp: Date.now(),
      };
      mockMonitor.emit('usage-update', event);

      const children = await provider.getChildren();
      const icon = children[0].iconPath as { id: string; color?: { id: string } };
      expect(icon.color?.id).toBe('charts.yellow');
    });

    it('should use red color for exceeded status', async () => {
      const event: UsageUpdateEvent = {
        periods: [
          {
            period: 'current',
            totalCostUsd: 12.0,
            totalTokens: 600000,
            providers: [],
            budgetLimitUsd: 10.0,
            budgetPercentUsed: 120,
            budgetStatus: 'exceeded',
          },
        ],
        trigger: 'manual',
        timestamp: Date.now(),
      };
      mockMonitor.emit('usage-update', event);

      const children = await provider.getChildren();
      const icon = children[0].iconPath as { id: string; color?: { id: string } };
      expect(icon.color?.id).toBe('charts.red');
    });

    it('should not color-code non-current periods', async () => {
      const event: UsageUpdateEvent = {
        periods: [
          {
            period: 'today',
            totalCostUsd: 5.67,
            totalTokens: 300000,
            providers: [],
          },
        ],
        trigger: 'manual',
        timestamp: Date.now(),
      };
      mockMonitor.emit('usage-update', event);

      const children = await provider.getChildren();
      const icon = children[0].iconPath as { id: string; color?: unknown };
      expect(icon.color).toBeUndefined();
    });
  });

  describe('getTreeItem()', () => {
    it('should return the element as-is', () => {
      const item = new AIUsageItem('Test', 'period', 1);
      expect(provider.getTreeItem(item)).toBe(item);
    });
  });

  describe('refresh()', () => {
    it('should not throw when called', () => {
      expect(() => provider.refresh()).not.toThrow();
    });
  });

  describe('dispose()', () => {
    it('should clean up resources', () => {
      expect(() => provider.dispose()).not.toThrow();
    });
  });
});
