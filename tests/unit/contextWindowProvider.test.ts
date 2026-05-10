/**
 * Unit tests for ContextWindowProvider
 *
 * Tests: empty state, 1 session, 3 sessions, categories (both scanner and fallback),
 * stale session display, lifecycle icons.
 *
 * Feature 023: Updated to test real scanner-based categories + fallback mode.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BridgeData } from '../../extension/src/autonomous/HookBridgeWatcher';
import type {
  ClaudeCodeContextScanner,
  ScanResult,
  CategoryBreakdown,
} from '../../extension/src/autonomous/ClaudeCodeContextScanner';

// Mock vscode module
vi.mock('vscode', () => ({
  TreeItem: class {
    label: string;
    collapsibleState: number;
    description?: string;
    iconPath?: unknown;
    tooltip?: string;
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
  ThemeIcon: class {
    id: string;
    color?: unknown;
    constructor(id: string, color?: unknown) {
      this.id = id;
      this.color = color;
    }
  },
  ThemeColor: class {
    id: string;
    constructor(id: string) {
      this.id = id;
    }
  },
  EventEmitter: class {
    private listeners: Array<(...args: unknown[]) => void> = [];
    event = (listener: (...args: unknown[]) => void) => {
      this.listeners.push(listener);
      return { dispose: () => {} };
    };
    fire = vi.fn();
    dispose = vi.fn();
  },
}));

import {
  ContextWindowProvider,
  ContextWindowItem,
} from '../../extension/src/contextWindowProvider';

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

/** Create a mock MultiSessionBridgeWatcher */
function createMockWatcher(
  sessions: Map<string, BridgeData> = new Map(),
  staleSessions: Set<string> = new Set()
) {
  const eventHandlers: Record<string, Array<() => void>> = {};
  return {
    getSessions: vi.fn(() => new Map(sessions)),
    getSessionCount: vi.fn(() => sessions.size),
    getFocusedSession: vi.fn(() => {
      const entries = Array.from(sessions.values());
      return entries.length > 0 ? entries[entries.length - 1] : null;
    }),
    isSessionStale: vi.fn((id: string) => staleSessions.has(id)),
    hasRealData: vi.fn(() => {
      for (const data of sessions.values()) {
        if (data.context !== null) return true;
      }
      return false;
    }),
    on: vi.fn((event: string, handler: () => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = [];
      eventHandlers[event].push(handler);
    }),
    _eventHandlers: eventHandlers,
  };
}

/** Create a mock scanner with configurable scan results */
function createMockScanner(overrides: Partial<ScanResult> = {}): ClaudeCodeContextScanner {
  const defaultCategories: CategoryBreakdown[] = [
    {
      name: 'CLAUDE.md & Rules',
      icon: 'file-text',
      totalTokens: 8000,
      files: [],
      expandable: false,
    },
    { name: 'Auto Memory', icon: 'brain', totalTokens: 1100, files: [], expandable: false },
    { name: 'Agents & Commands', icon: 'robot', totalTokens: 10000, files: [], expandable: false },
    { name: 'Spec Artifacts', icon: 'file-code', totalTokens: 5700, files: [], expandable: false },
    { name: 'System Overhead', icon: 'gear', totalTokens: 14800, files: [], expandable: false },
  ];
  const defaultResult: ScanResult = {
    categories: defaultCategories,
    measuredTokens: defaultCategories.reduce((s, c) => s + c.totalTokens, 0),
    scannedAt: Date.now(),
    ...overrides,
  };

  return {
    scan: vi.fn(() => defaultResult),
    invalidate: vi.fn(),
  } as unknown as ClaudeCodeContextScanner;
}

describe('ContextWindowProvider', () => {
  let provider: ContextWindowProvider;

  beforeEach(() => {
    provider = new ContextWindowProvider('/test/workspace');
  });

  describe('empty state', () => {
    it('returns empty array when no watcher is set', async () => {
      const children = await provider.getChildren();
      expect(children).toEqual([]);
    });

    it('returns empty array when watcher has no sessions', async () => {
      const mockWatcher = createMockWatcher();
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      expect(children).toEqual([]);
    });
  });

  describe('1 session display', () => {
    it('returns one session item at root', async () => {
      const sessions = new Map([
        [
          'sess-abc123',
          makeBridgeData({ sessionId: 'sess-abc123', model: 'claude-opus-4-5-20251101' }),
        ],
      ]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      expect(children).toHaveLength(1);
      expect(children[0].kind).toBe('session');
      expect(children[0].label).toContain('sess-abc');
      expect(children[0].label).toContain('Opus');
      expect(children[0].description).toBe('50%');
    });
  });

  describe('3 sessions display', () => {
    it('returns three session items at root', async () => {
      const sessions = new Map([
        ['sess-1', makeBridgeData({ sessionId: 'sess-1' })],
        ['sess-2', makeBridgeData({ sessionId: 'sess-2' })],
        ['sess-3', makeBridgeData({ sessionId: 'sess-3' })],
      ]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      expect(children).toHaveLength(3);
      children.forEach((child) => expect(child.kind).toBe('session'));
    });
  });

  describe('category breakdown with scanner (Feature 023)', () => {
    it('returns 6 categories (5 scanned + Conversation History) when scanner is set', async () => {
      const sessions = new Map([['sess-1', makeBridgeData({ sessionId: 'sess-1' })]]);
      const mockWatcher = createMockWatcher(sessions);
      const mockScanner = createMockScanner();
      provider.setWatcher(mockWatcher as never);
      provider.setScanner(mockScanner);

      const sessionItem = { kind: 'session' as const, sessionId: 'sess-1', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);

      expect(categories).toHaveLength(6);
      expect(categories.map((c) => c.categoryName)).toEqual([
        'CLAUDE.md & Rules',
        'Auto Memory',
        'Agents & Commands',
        'Spec Artifacts',
        'System Overhead',
        'Conversation History',
      ]);
    });

    it('scanned category tokens come from scanner, not percentages', async () => {
      const sessions = new Map([['sess-1', makeBridgeData({ sessionId: 'sess-1' })]]);
      const mockWatcher = createMockWatcher(sessions);
      const mockScanner = createMockScanner();
      provider.setWatcher(mockWatcher as never);
      provider.setScanner(mockScanner);

      const sessionItem = { kind: 'session' as const, sessionId: 'sess-1', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);

      const claudeItem = categories.find((c) => c.categoryName === 'CLAUDE.md & Rules')!;
      expect(claudeItem.tokenCount).toBe(8000);

      const memoryItem = categories.find((c) => c.categoryName === 'Auto Memory')!;
      expect(memoryItem.tokenCount).toBe(1100);
    });

    it('Conversation History is residual (total - measured)', async () => {
      const sessions = new Map([
        [
          'sess-1',
          makeBridgeData({
            sessionId: 'sess-1',
            context: {
              totalContextTokens: 100000,
              inputTokens: 500,
              cacheCreationInputTokens: 1000,
              cacheReadInputTokens: 98500,
              outputTokens: 1500,
              contextLimit: 200000,
              utilizationPercent: 50,
            },
          }),
        ],
      ]);
      const mockWatcher = createMockWatcher(sessions);
      // measuredTokens = 8000 + 1100 + 10000 + 5700 + 14800 = 39600
      const mockScanner = createMockScanner();
      provider.setWatcher(mockWatcher as never);
      provider.setScanner(mockScanner);

      const sessionItem = { kind: 'session' as const, sessionId: 'sess-1', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);

      const convItem = categories.find((c) => c.categoryName === 'Conversation History')!;
      expect(convItem.tokenCount).toBe(100000 - 39600); // 60400
    });

    it('all categories sum to totalContextTokens', async () => {
      const sessions = new Map([
        [
          'sess-1',
          makeBridgeData({
            sessionId: 'sess-1',
            context: {
              totalContextTokens: 100000,
              inputTokens: 500,
              cacheCreationInputTokens: 1000,
              cacheReadInputTokens: 98500,
              outputTokens: 1500,
              contextLimit: 200000,
              utilizationPercent: 50,
            },
          }),
        ],
      ]);
      const mockWatcher = createMockWatcher(sessions);
      const mockScanner = createMockScanner();
      provider.setWatcher(mockWatcher as never);
      provider.setScanner(mockScanner);

      const sessionItem = { kind: 'session' as const, sessionId: 'sess-1', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);

      const total = categories.reduce((sum, cat) => sum + (cat.tokenCount ?? 0), 0);
      expect(total).toBe(100000);
    });

    it('descriptions do NOT contain "(est.)" when scanner is active', async () => {
      const sessions = new Map([['sess-1', makeBridgeData({ sessionId: 'sess-1' })]]);
      const mockWatcher = createMockWatcher(sessions);
      const mockScanner = createMockScanner();
      provider.setWatcher(mockWatcher as never);
      provider.setScanner(mockScanner);

      const sessionItem = { kind: 'session' as const, sessionId: 'sess-1', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);

      categories.forEach((cat) => {
        expect(cat.description).not.toContain('est.');
      });
    });

    it('each category has click command', async () => {
      const sessions = new Map([['sess-1', makeBridgeData({ sessionId: 'sess-1' })]]);
      const mockWatcher = createMockWatcher(sessions);
      const mockScanner = createMockScanner();
      provider.setWatcher(mockWatcher as never);
      provider.setScanner(mockScanner);

      const sessionItem = { kind: 'session' as const, sessionId: 'sess-1', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);

      for (const cat of categories) {
        expect(cat.command).toBeDefined();
        expect(cat.command!.command).toBe('gofer.showContextCategoryContent');
      }
    });

    it('Conversation History is expandable (collapsed state)', async () => {
      const sessions = new Map([['sess-1', makeBridgeData({ sessionId: 'sess-1' })]]);
      const mockWatcher = createMockWatcher(sessions);
      const mockScanner = createMockScanner();
      provider.setWatcher(mockWatcher as never);
      provider.setScanner(mockScanner);

      const sessionItem = { kind: 'session' as const, sessionId: 'sess-1', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);

      const convItem = categories.find((c) => c.categoryName === 'Conversation History')!;
      expect(convItem.collapsibleState).toBe(1); // Collapsed
    });

    it('returns empty categories when session has no context data', async () => {
      const sessions = new Map([
        ['sess-1', makeBridgeData({ sessionId: 'sess-1', context: null })],
      ]);
      const mockWatcher = createMockWatcher(sessions);
      const mockScanner = createMockScanner();
      provider.setWatcher(mockWatcher as never);
      provider.setScanner(mockScanner);

      const sessionItem = { kind: 'session' as const, sessionId: 'sess-1', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);
      expect(categories).toEqual([]);
    });
  });

  describe('category breakdown fallback (no scanner)', () => {
    it('returns 6 old categories when no scanner is set', async () => {
      const sessions = new Map([['sess-1', makeBridgeData({ sessionId: 'sess-1' })]]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const sessionItem = { kind: 'session' as const, sessionId: 'sess-1', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);

      expect(categories).toHaveLength(6);
      expect(categories.map((c) => c.categoryName)).toEqual([
        'Spec Artifacts',
        'Memories & Hints',
        'System Files',
        'Conversation History',
        'Tool Outputs',
        'Masked Observations',
      ]);
    });

    it('fallback tokens sum to totalContextTokens', async () => {
      const sessions = new Map([['sess-1', makeBridgeData({ sessionId: 'sess-1' })]]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const sessionItem = { kind: 'session' as const, sessionId: 'sess-1', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);

      const total = categories.reduce((sum, cat) => sum + (cat.tokenCount ?? 0), 0);
      expect(total).toBe(100000);
    });

    it('fallback descriptions contain "(est.)"', async () => {
      const sessions = new Map([['sess-1', makeBridgeData({ sessionId: 'sess-1' })]]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const sessionItem = { kind: 'session' as const, sessionId: 'sess-1', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);

      categories.forEach((cat) => {
        expect(cat.description).toContain('est.');
      });
    });
  });

  describe('session lifecycle icons', () => {
    it('shows pulse icon for active sessions', async () => {
      const sessions = new Map([
        [
          'sess-1',
          makeBridgeData({
            sessionId: 'sess-1',
            session: { active: true, lastActivity: Date.now() },
          }),
        ],
      ]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      const icon = children[0].iconPath as { id: string };
      expect(icon.id).toBe('pulse');
    });

    it('shows clock icon for stale sessions', async () => {
      const sessions = new Map([
        [
          'sess-stale',
          makeBridgeData({
            sessionId: 'sess-stale',
            session: { active: true, lastActivity: Date.now() },
          }),
        ],
      ]);
      const staleSessions = new Set(['sess-stale']);
      const mockWatcher = createMockWatcher(sessions, staleSessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      const icon = children[0].iconPath as { id: string };
      expect(icon.id).toBe('clock');
    });

    it('shows circle-slash icon for inactive sessions', async () => {
      const sessions = new Map([
        [
          'sess-1',
          makeBridgeData({
            sessionId: 'sess-1',
            session: { active: false, lastActivity: Date.now() },
          }),
        ],
      ]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      const icon = children[0].iconPath as { id: string };
      expect(icon.id).toBe('circle-slash');
    });

    it('uses green color for low utilization (<50%)', async () => {
      const sessions = new Map([
        [
          'sess-1',
          makeBridgeData({
            sessionId: 'sess-1',
            context: {
              totalContextTokens: 40000,
              inputTokens: 500,
              cacheCreationInputTokens: 1000,
              cacheReadInputTokens: 38500,
              outputTokens: 1500,
              contextLimit: 200000,
              utilizationPercent: 20,
            },
          }),
        ],
      ]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      const icon = children[0].iconPath as { id: string; color: { id: string } };
      expect(icon.color.id).toBe('charts.green');
    });

    it('uses yellow color for medium utilization (50-70%)', async () => {
      const sessions = new Map([
        [
          'sess-1',
          makeBridgeData({
            sessionId: 'sess-1',
            context: {
              totalContextTokens: 120000,
              inputTokens: 500,
              cacheCreationInputTokens: 1000,
              cacheReadInputTokens: 118500,
              outputTokens: 1500,
              contextLimit: 200000,
              utilizationPercent: 60,
            },
          }),
        ],
      ]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      const icon = children[0].iconPath as { id: string; color: { id: string } };
      expect(icon.color.id).toBe('charts.yellow');
    });

    it('uses red color for high utilization (>70%)', async () => {
      const sessions = new Map([
        [
          'sess-1',
          makeBridgeData({
            sessionId: 'sess-1',
            context: {
              totalContextTokens: 160000,
              inputTokens: 500,
              cacheCreationInputTokens: 1000,
              cacheReadInputTokens: 158500,
              outputTokens: 1500,
              contextLimit: 200000,
              utilizationPercent: 80,
            },
          }),
        ],
      ]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      const icon = children[0].iconPath as { id: string; color: { id: string } };
      expect(icon.color.id).toBe('charts.red');
    });
  });

  describe('model name formatting', () => {
    it('formats Opus model name', async () => {
      const sessions = new Map([
        ['s1', makeBridgeData({ sessionId: 's1', model: 'claude-opus-4-5-20251101' })],
      ]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      expect(children[0].label).toContain('Opus');
    });

    it('formats Sonnet model name', async () => {
      const sessions = new Map([
        ['s1', makeBridgeData({ sessionId: 's1', model: 'claude-sonnet-4-5-20250514' })],
      ]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      expect(children[0].label).toContain('Sonnet');
    });

    it('shows unknown for empty model', async () => {
      const sessions = new Map([['s1', makeBridgeData({ sessionId: 's1', model: '' })]]);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      expect(children[0].label).toContain('unknown');
    });
  });

  describe('watcher event subscription', () => {
    it('subscribes to session-update, session-added, session-removed', () => {
      const mockWatcher = createMockWatcher();
      provider.setWatcher(mockWatcher as never);

      expect(mockWatcher.on).toHaveBeenCalledWith('session-update', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('session-added', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('session-removed', expect.any(Function));
    });
  });

  describe('getTreeItem()', () => {
    it('returns the element itself', () => {
      const item = new ContextWindowItem('test', 'session');
      expect(provider.getTreeItem(item)).toBe(item);
    });
  });
});
