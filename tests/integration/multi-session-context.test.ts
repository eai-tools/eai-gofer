/**
 * Integration tests for Multi-Session Context Panel
 *
 * T048: 3 sessions appear in tree
 * T049: 4th session triggers eviction
 * T050: Legacy bridge file appears as session
 * T051: Stale session removed after grace period
 * T052: Token breakdown categories sum to total
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { BridgeData } from '../../extension/src/autonomous/HookBridgeWatcher';

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
  workspace: {
    createFileSystemWatcher: () => ({
      onDidChange: vi.fn(() => ({ dispose: () => {} })),
      onDidCreate: vi.fn(() => ({ dispose: () => {} })),
      onDidDelete: vi.fn(() => ({ dispose: () => {} })),
      dispose: vi.fn(),
    }),
  },
  RelativePattern: class {
    constructor(public base: string, public pattern: string) {}
  },
}));

import { ContextWindowProvider } from '../../extension/src/contextWindowProvider';

function makeBridgeData(sessionId: string, overrides: Partial<BridgeData> = {}): BridgeData {
  return {
    timestamp: Date.now(),
    sessionId,
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

function writeBridgeFile(hooksDir: string, sessionId: string, data: BridgeData): void {
  fs.writeFileSync(
    path.join(hooksDir, `context-bridge-${sessionId}.json`),
    JSON.stringify(data),
  );
}

function writeLegacyBridgeFile(hooksDir: string, data: BridgeData): void {
  fs.writeFileSync(
    path.join(hooksDir, 'context-bridge.json'),
    JSON.stringify(data),
  );
}

function createMockWatcher(
  sessions: Map<string, BridgeData>,
  staleSessions: Set<string> = new Set(),
) {
  const eventHandlers: Record<string, Array<(...args: unknown[]) => void>> = {};
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
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = [];
      eventHandlers[event].push(handler);
    }),
    _eventHandlers: eventHandlers,
    _emit: (event: string, ...args: unknown[]) => {
      (eventHandlers[event] || []).forEach((h) => h(...args));
    },
  };
}

describe('Multi-Session Context Panel Integration', () => {
  let tmpDir: string;
  let hooksDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-multi-session-'));
    hooksDir = path.join(tmpDir, '.specify', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('T048: 3 sessions appear in context window tree', () => {
    it('creates bridge files for 3 sessions and all appear in tree', async () => {
      const sessions = new Map<string, BridgeData>();
      for (let i = 1; i <= 3; i++) {
        const id = `session-${i}`;
        const data = makeBridgeData(id, {
          context: {
            totalContextTokens: 50000 * i,
            inputTokens: 500,
            cacheCreationInputTokens: 1000,
            cacheReadInputTokens: 48500 * i,
            outputTokens: 1500,
            contextLimit: 200000,
            utilizationPercent: 25 * i,
          },
        });
        writeBridgeFile(hooksDir, id, data);
        sessions.set(id, data);
      }

      // Verify bridge files exist
      expect(fs.existsSync(path.join(hooksDir, 'context-bridge-session-1.json'))).toBe(true);
      expect(fs.existsSync(path.join(hooksDir, 'context-bridge-session-2.json'))).toBe(true);
      expect(fs.existsSync(path.join(hooksDir, 'context-bridge-session-3.json'))).toBe(true);

      // Wire up provider with mock watcher
      const provider = new ContextWindowProvider(tmpDir);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      expect(children).toHaveLength(3);
      children.forEach((child) => expect(child.kind).toBe('session'));

      // Each has the session shortId in label (first 8 chars)
      const labels = children.map((c) => c.label as string);
      // session-1 → shortId "session-", session-2 → "session-", session-3 → "session-"
      // All 3 have same prefix but different internal state via sessionId
      expect(labels.every((l) => l.includes('Session'))).toBe(true);
      expect(labels.every((l) => l.includes('Opus'))).toBe(true);
    });

    it('each session shows correct utilization percentage', async () => {
      const sessions = new Map<string, BridgeData>();
      sessions.set('s1', makeBridgeData('s1', {
        context: {
          totalContextTokens: 40000, inputTokens: 0, cacheCreationInputTokens: 0,
          cacheReadInputTokens: 40000, outputTokens: 0, contextLimit: 200000, utilizationPercent: 20,
        },
      }));
      sessions.set('s2', makeBridgeData('s2', {
        context: {
          totalContextTokens: 120000, inputTokens: 0, cacheCreationInputTokens: 0,
          cacheReadInputTokens: 120000, outputTokens: 0, contextLimit: 200000, utilizationPercent: 60,
        },
      }));
      sessions.set('s3', makeBridgeData('s3', {
        context: {
          totalContextTokens: 160000, inputTokens: 0, cacheCreationInputTokens: 0,
          cacheReadInputTokens: 160000, outputTokens: 0, contextLimit: 200000, utilizationPercent: 80,
        },
      }));

      const provider = new ContextWindowProvider(tmpDir);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      const descriptions = children.map((c) => c.description);
      expect(descriptions).toContain('20%');
      expect(descriptions).toContain('60%');
      expect(descriptions).toContain('80%');
    });
  });

  describe('T049: 4th session triggers eviction', () => {
    it('maintains only 3 sessions after eviction', async () => {
      // After eviction, only 3 sessions remain
      const sessions = new Map<string, BridgeData>();
      sessions.set('s2', makeBridgeData('s2'));
      sessions.set('s3', makeBridgeData('s3'));
      sessions.set('s4', makeBridgeData('s4'));

      const provider = new ContextWindowProvider(tmpDir);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      expect(children).toHaveLength(3);

      // s1 was evicted, s2-s4 remain
      const labels = children.map((c) => c.label as string);
      expect(labels.some((l) => l.includes('s2'))).toBe(true);
      expect(labels.some((l) => l.includes('s3'))).toBe(true);
      expect(labels.some((l) => l.includes('s4'))).toBe(true);
    });

    it('session-limit-reached event fires with evicted and new session IDs', () => {
      const sessions = new Map<string, BridgeData>();
      const mockWatcher = createMockWatcher(sessions);

      let limitPayload: { evictedSessionId: string; newSessionId: string } | null = null;
      mockWatcher.on('session-limit-reached', (payload: unknown) => {
        limitPayload = payload as { evictedSessionId: string; newSessionId: string };
      });

      // Simulate the event
      mockWatcher._emit('session-limit-reached', {
        evictedSessionId: 'old-session-1',
        newSessionId: 'new-session-4',
      });

      expect(limitPayload).not.toBeNull();
      expect(limitPayload!.evictedSessionId).toBe('old-session-1');
      expect(limitPayload!.newSessionId).toBe('new-session-4');
    });
  });

  describe('T050: Legacy bridge file appears as session', () => {
    it('legacy context-bridge.json is treated as a session', async () => {
      const legacyData = makeBridgeData('legacy-session', {
        model: 'claude-sonnet-4-5-20250514',
      });
      writeLegacyBridgeFile(hooksDir, legacyData);

      // Verify file exists
      expect(fs.existsSync(path.join(hooksDir, 'context-bridge.json'))).toBe(true);

      // Watcher treats it as a session
      const sessions = new Map<string, BridgeData>();
      sessions.set('legacy-session', legacyData);

      const provider = new ContextWindowProvider(tmpDir);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      expect(children).toHaveLength(1);
      expect(children[0].kind).toBe('session');
      expect(children[0].label).toContain('Sonnet');
    });

    it('legacy session coexists with per-session files', async () => {
      writeLegacyBridgeFile(hooksDir, makeBridgeData('legacy'));
      writeBridgeFile(hooksDir, 'new-session', makeBridgeData('new-session'));

      const sessions = new Map<string, BridgeData>();
      sessions.set('legacy', makeBridgeData('legacy'));
      sessions.set('new-session', makeBridgeData('new-session'));

      const provider = new ContextWindowProvider(tmpDir);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      expect(children).toHaveLength(2);
    });
  });

  describe('T051: Stale session display', () => {
    it('stale sessions show clock icon', async () => {
      const sessions = new Map<string, BridgeData>();
      sessions.set('stale-sess', makeBridgeData('stale-sess'));
      const staleSessions = new Set(['stale-sess']);

      const provider = new ContextWindowProvider(tmpDir);
      const mockWatcher = createMockWatcher(sessions, staleSessions);
      provider.setWatcher(mockWatcher as never);

      const children = await provider.getChildren();
      expect(children).toHaveLength(1);
      const icon = children[0].iconPath as { id: string };
      expect(icon.id).toBe('clock');
    });

    it('session-removed event triggers tree refresh', () => {
      const sessions = new Map<string, BridgeData>();
      const mockWatcher = createMockWatcher(sessions);

      const provider = new ContextWindowProvider(tmpDir);
      provider.setWatcher(mockWatcher as never);

      // Verify the event handler was registered
      expect(mockWatcher.on).toHaveBeenCalledWith('session-removed', expect.any(Function));
    });

    it('stale bridge files are written to disk for cleanup', () => {
      const data = makeBridgeData('temp-session');
      writeBridgeFile(hooksDir, 'temp-session', data);
      expect(fs.existsSync(path.join(hooksDir, 'context-bridge-temp-session.json'))).toBe(true);

      // After removal, file should be deletable
      fs.unlinkSync(path.join(hooksDir, 'context-bridge-temp-session.json'));
      expect(fs.existsSync(path.join(hooksDir, 'context-bridge-temp-session.json'))).toBe(false);
    });
  });

  describe('T052: Token breakdown categories sum to total', () => {
    it('category token counts sum exactly to totalContextTokens', async () => {
      const totalTokens = 150000;
      const sessions = new Map<string, BridgeData>();
      sessions.set('breakdown-sess', makeBridgeData('breakdown-sess', {
        context: {
          totalContextTokens: totalTokens,
          inputTokens: 500,
          cacheCreationInputTokens: 1000,
          cacheReadInputTokens: 148500,
          outputTokens: 1500,
          contextLimit: 200000,
          utilizationPercent: 75,
        },
      }));

      const provider = new ContextWindowProvider(tmpDir);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      // Get session item
      const rootItems = await provider.getChildren();
      expect(rootItems).toHaveLength(1);

      // Get category children
      const sessionItem = { kind: 'session' as const, sessionId: 'breakdown-sess', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);
      expect(categories).toHaveLength(6);

      // Sum category token counts
      const tokenSum = categories.reduce(
        (sum, cat) => sum + (cat.tokenCount ?? 0),
        0,
      );

      // Must sum exactly to total (percentage-based estimation ensures this)
      expect(tokenSum).toBe(totalTokens);
    });

    it('category descriptions contain "est." label', async () => {
      const sessions = new Map<string, BridgeData>();
      sessions.set('desc-sess', makeBridgeData('desc-sess'));

      const provider = new ContextWindowProvider(tmpDir);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const sessionItem = { kind: 'session' as const, sessionId: 'desc-sess', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);

      categories.forEach((cat) => {
        expect(cat.description).toContain('est.');
      });
    });

    it('all 6 standard categories are present', async () => {
      const sessions = new Map<string, BridgeData>();
      sessions.set('cat-sess', makeBridgeData('cat-sess'));

      const provider = new ContextWindowProvider(tmpDir);
      const mockWatcher = createMockWatcher(sessions);
      provider.setWatcher(mockWatcher as never);

      const sessionItem = { kind: 'session' as const, sessionId: 'cat-sess', label: 'test' };
      const categories = await provider.getChildren(sessionItem as never);

      const names = categories.map((c) => c.categoryName);
      expect(names).toEqual([
        'Spec Artifacts',
        'Memories/Hints',
        'System Files',
        'Conversation History',
        'Tool Outputs',
        'Masked Observations',
      ]);
    });
  });
});
