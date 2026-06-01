/**
 * Unit tests for GoferActivityStatusBar
 *
 * Tests status bar display states, click handler,
 * and integration with HookBridgeWatcher events.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import type {
  BridgeData,
  HookBridgeWatcher,
} from '../../../extension/src/autonomous/HookBridgeWatcher';

// Mock vscode
const mockStatusBarItem = {
  text: '',
  tooltip: '',
  command: '',
  color: undefined as unknown,
  backgroundColor: undefined as unknown,
  show: vi.fn(),
  hide: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('vscode', () => {
  const mockDisposable = { dispose: vi.fn() };

  return {
    window: {
      createStatusBarItem: vi.fn(() => mockStatusBarItem),
      showQuickPick: vi.fn().mockResolvedValue(null),
      showInformationMessage: vi.fn().mockResolvedValue(undefined),
    },
    commands: {
      registerCommand: vi.fn(() => mockDisposable),
      executeCommand: vi.fn(),
    },
    StatusBarAlignment: { Left: 1, Right: 2 },
    ThemeColor: class ThemeColor {
      constructor(public id: string) {}
    },
    QuickPickItemKind: { Separator: -1 },
  };
});

import { GoferActivityStatusBar } from '../../../extension/src/ui/GoferActivityStatusBar';

function makeBridgeData(overrides: Partial<BridgeData> = {}): BridgeData {
  return {
    timestamp: Date.now(),
    sessionId: 'test-session-123',
    model: 'claude-opus-4-5-20251101',
    context: {
      totalContextTokens: 100000,
      inputTokens: 500,
      cacheCreationInputTokens: 1000,
      cacheReadInputTokens: 98500,
      outputTokens: 1500,
      contextLimit: 200000,
      utilizationPercent: 50,
    },
    lastToolUse: {
      toolName: 'Edit',
      timestamp: Date.now(),
    },
    session: {
      active: true,
      lastActivity: Date.now(),
    },
    ...overrides,
  };
}

// Create a mock watcher that extends EventEmitter
class MockHookBridgeWatcher extends EventEmitter {
  isDataStale(): boolean {
    return false;
  }
  getLatestData(): BridgeData | null {
    return null;
  }
  isHookDataAvailable(): boolean {
    return false;
  }
}

describe('GoferActivityStatusBar', () => {
  let statusBar: GoferActivityStatusBar;
  let mockWatcher: MockHookBridgeWatcher;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStatusBarItem.text = '';
    mockStatusBarItem.tooltip = '';
    mockStatusBarItem.color = undefined;
    mockStatusBarItem.backgroundColor = undefined;

    mockWatcher = new MockHookBridgeWatcher();
    statusBar = new GoferActivityStatusBar(mockWatcher as unknown as HookBridgeWatcher);
  });

  afterEach(() => {
    statusBar.dispose();
  });

  describe('initial state', () => {
    it('shows "Gofer Memory: --" when no session', () => {
      expect(mockStatusBarItem.text).toBe('Gofer Memory: --');
    });

    it('sets disabled foreground color', () => {
      expect(mockStatusBarItem.color).toEqual({ id: 'disabledForeground' });
    });
  });

  describe('active state', () => {
    it('shows "Gofer Memory: Active" when recent tool call', () => {
      const data = makeBridgeData({
        lastToolUse: {
          toolName: 'Edit',
          timestamp: Date.now(), // Just now
        },
      });

      mockWatcher.emit('bridge-update', data);

      expect(mockStatusBarItem.text).toBe('$(pulse) Gofer Memory: Active');
    });

    it('includes tool name in tooltip', () => {
      const data = makeBridgeData({
        lastToolUse: {
          toolName: 'Read',
          timestamp: Date.now(),
        },
      });

      mockWatcher.emit('bridge-update', data);

      expect(mockStatusBarItem.tooltip).toContain('Read');
    });
  });

  describe('idle state', () => {
    it('shows "Gofer Memory: Idle" when tool call is old', () => {
      const data = makeBridgeData({
        lastToolUse: {
          toolName: 'Edit',
          timestamp: Date.now() - 60000, // 1 minute ago
        },
      });

      mockWatcher.emit('bridge-update', data);

      expect(mockStatusBarItem.text).toBe('$(clock) Gofer Memory: Idle');
    });
  });

  describe('session end', () => {
    it('shows "Gofer Memory: --" when session ends', () => {
      // First activate
      const data = makeBridgeData();
      mockWatcher.emit('bridge-update', data);
      expect(mockStatusBarItem.text).toBe('$(pulse) Gofer Memory: Active');

      // Then end
      mockWatcher.emit('session-end', null);
      expect(mockStatusBarItem.text).toBe('Gofer Memory: --');
    });
  });

  describe('stale state', () => {
    it('shows "Gofer Memory: --" when data becomes stale', () => {
      // First activate
      const data = makeBridgeData();
      mockWatcher.emit('bridge-update', data);

      // Mock stale
      vi.spyOn(mockWatcher, 'isDataStale').mockReturnValue(true);
      mockWatcher.emit('session-stale', data);

      expect(mockStatusBarItem.text).toBe('Gofer Memory: --');
    });
  });

  describe('show/hide', () => {
    it('shows status bar', () => {
      statusBar.show();
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('hides status bar', () => {
      statusBar.hide();
      expect(mockStatusBarItem.hide).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('disposes status bar item', () => {
      statusBar.dispose();
      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });
  });
});
