/**
 * Unit tests for AIUsageStatusBar
 *
 * Tests status bar display formatting, color-coding, visibility toggle,
 * and QuickPick provider breakdown.
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

// Create shared mock objects
const mockStatusBarItem = {
  text: '',
  tooltip: '' as string | undefined,
  command: '' as string | undefined,
  color: undefined as unknown,
  backgroundColor: undefined as unknown,
  show: vi.fn(),
  hide: vi.fn(),
  dispose: vi.fn(),
};

let configValues: Record<string, unknown> = {};
let configChangeHandlers: Array<(e: { affectsConfiguration: (key: string) => boolean }) => void> =
  [];

// Mock vscode
vi.mock('vscode', () => ({
  window: {
    createStatusBarItem: vi.fn(() => mockStatusBarItem),
    showQuickPick: vi.fn().mockResolvedValue(null),
    showInformationMessage: vi.fn().mockResolvedValue(undefined),
  },
  commands: {
    registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, defaultValue: unknown) => {
        return configValues[key] ?? defaultValue;
      }),
    })),
    onDidChangeConfiguration: vi.fn(
      (handler: (e: { affectsConfiguration: (key: string) => boolean }) => void) => {
        configChangeHandlers.push(handler);
        return { dispose: vi.fn() };
      }
    ),
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  ThemeColor: class ThemeColor {
    constructor(public id: string) {}
  },
  QuickPickItemKind: {
    Separator: -1,
    Default: 0,
  },
}));

import { AIUsageStatusBar } from '../../../extension/src/ui/AIUsageStatusBar';
import type { UsageUpdateEvent } from '../../../extension/src/types/aiUsage';
import { EventEmitter } from 'events';

function createMockContext(): import('vscode').ExtensionContext {
  return {
    subscriptions: [],
  } as unknown as import('vscode').ExtensionContext;
}

describe('AIUsageStatusBar', () => {
  let statusBar: AIUsageStatusBar;
  let mockContext: import('vscode').ExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    configValues = {};
    configChangeHandlers = [];
    mockStatusBarItem.text = '';
    mockStatusBarItem.tooltip = '';
    mockStatusBarItem.command = '';
    mockStatusBarItem.color = undefined;
    mockStatusBarItem.backgroundColor = undefined;
    mockContext = createMockContext();
    statusBar = new AIUsageStatusBar(mockContext);
  });

  describe('Initial state', () => {
    it('should show $0.00 initially', () => {
      expect(mockStatusBarItem.text).toBe('$(dollar) AI: $0.00');
    });

    it('should set command to gofer.showAIUsage', () => {
      expect(mockStatusBarItem.command).toBe('gofer.showAIUsage');
    });

    it('should be visible when enabled (default)', () => {
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });
  });

  describe('updateDisplay()', () => {
    it('should format cost with 2 decimals', () => {
      statusBar.updateDisplay({
        period: 'current',
        totalCostUsd: 2.456,
        totalTokens: 100000,
        providers: [],
      });

      expect(mockStatusBarItem.text).toBe('$(dollar) AI: $2.46');
    });

    it('should show $0.00 when data is null', () => {
      statusBar.updateDisplay(null);

      expect(mockStatusBarItem.text).toBe('$(dollar) AI: $0.00');
    });

    it('should include budget info in tooltip when available', () => {
      statusBar.updateDisplay({
        period: 'current',
        totalCostUsd: 2.45,
        totalTokens: 150000,
        providers: [],
        budgetLimitUsd: 10.0,
        budgetPercentUsed: 25,
        budgetStatus: 'healthy',
      });

      expect(mockStatusBarItem.tooltip).toContain('$2.45');
      expect(mockStatusBarItem.tooltip).toContain('$10.00');
      expect(mockStatusBarItem.tooltip).toContain('25%');
    });
  });

  describe('Color coding', () => {
    it('should use default color for healthy status', () => {
      statusBar.updateDisplay({
        period: 'current',
        totalCostUsd: 2.45,
        totalTokens: 150000,
        providers: [],
        budgetStatus: 'healthy',
      });

      expect((mockStatusBarItem.color as { id: string })?.id).toBe('statusBarItem.foreground');
      expect(mockStatusBarItem.backgroundColor).toBeUndefined();
    });

    it('should use warning color for warning status', () => {
      statusBar.updateDisplay({
        period: 'current',
        totalCostUsd: 8.5,
        totalTokens: 400000,
        providers: [],
        budgetStatus: 'warning',
      });

      expect((mockStatusBarItem.color as { id: string })?.id).toBe(
        'statusBarItem.warningForeground'
      );
      expect((mockStatusBarItem.backgroundColor as { id: string })?.id).toBe(
        'statusBarItem.warningBackground'
      );
    });

    it('should use error color for exceeded status', () => {
      statusBar.updateDisplay({
        period: 'current',
        totalCostUsd: 12.0,
        totalTokens: 600000,
        providers: [],
        budgetStatus: 'exceeded',
      });

      expect((mockStatusBarItem.color as { id: string })?.id).toBe('statusBarItem.errorForeground');
      expect((mockStatusBarItem.backgroundColor as { id: string })?.id).toBe(
        'statusBarItem.errorBackground'
      );
    });

    it('should clear colors when no budget status', () => {
      statusBar.updateDisplay({
        period: 'current',
        totalCostUsd: 2.45,
        totalTokens: 150000,
        providers: [],
      });

      expect(mockStatusBarItem.color).toBeUndefined();
      expect(mockStatusBarItem.backgroundColor).toBeUndefined();
    });
  });

  describe('Configuration toggle', () => {
    it('should hide status bar when disabled via config', () => {
      configValues['aiUsage.statusBar.enabled'] = false;

      // Trigger config change
      for (const handler of configChangeHandlers) {
        handler({
          affectsConfiguration: (key: string) => key === 'gofer.aiUsage.statusBar.enabled',
        });
      }

      expect(mockStatusBarItem.hide).toHaveBeenCalled();
    });

    it('should show status bar when re-enabled via config', () => {
      configValues['aiUsage.statusBar.enabled'] = true;

      for (const handler of configChangeHandlers) {
        handler({
          affectsConfiguration: (key: string) => key === 'gofer.aiUsage.statusBar.enabled',
        });
      }

      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });
  });

  describe('Monitor connection', () => {
    it('should update display when monitor emits usage-update', () => {
      const mockMonitor = new EventEmitter();
      statusBar.connect(
        mockMonitor as unknown as import('../../../extension/src/autonomous/AIUsageMonitor').AIUsageMonitor
      );

      const event: UsageUpdateEvent = {
        periods: [
          {
            period: 'current',
            totalCostUsd: 5.67,
            totalTokens: 300000,
            providers: [
              { providerId: 'anthropic', inputTokens: 60000, outputTokens: 40000, costUsd: 3.5 },
            ],
            budgetLimitUsd: 10.0,
            budgetPercentUsed: 56.7,
            budgetStatus: 'healthy',
          },
          {
            period: 'today',
            totalCostUsd: 8.0,
            totalTokens: 500000,
            providers: [],
          },
        ],
        trigger: 'file-watch',
        timestamp: Date.now(),
      };

      mockMonitor.emit('usage-update', event);

      expect(mockStatusBarItem.text).toBe('$(dollar) AI: $5.67');
    });

    it('should show $0.00 when no current period in event', () => {
      const mockMonitor = new EventEmitter();
      statusBar.connect(
        mockMonitor as unknown as import('../../../extension/src/autonomous/AIUsageMonitor').AIUsageMonitor
      );

      const event: UsageUpdateEvent = {
        periods: [
          {
            period: 'today',
            totalCostUsd: 8.0,
            totalTokens: 500000,
            providers: [],
          },
        ],
        trigger: 'polling',
        timestamp: Date.now(),
      };

      mockMonitor.emit('usage-update', event);

      expect(mockStatusBarItem.text).toBe('$(dollar) AI: $0.00');
    });
  });

  describe('dispose()', () => {
    it('should dispose status bar item', () => {
      statusBar.dispose();
      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });

    it('should be safe to call dispose twice', () => {
      statusBar.dispose();
      expect(() => statusBar.dispose()).not.toThrow();
    });
  });
});
