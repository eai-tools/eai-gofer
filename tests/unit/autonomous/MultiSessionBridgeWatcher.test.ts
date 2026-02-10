/**
 * Unit tests for MultiSessionBridgeWatcher
 *
 * Tests: T006 — session add, update, remove, evict, stale, legacy compat,
 * focused session tracking, and legacy event forwarding.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { BridgeData } from '../../../extension/src/autonomous/HookBridgeWatcher';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
  readdirSync: vi.fn(() => []),
  unlinkSync: vi.fn(),
}));

// Track file system watcher callbacks per pattern
type WatcherCallbacks = {
  onChange: ((uri: { fsPath: string }) => void) | null;
  onCreate: ((uri: { fsPath: string }) => void) | null;
  onDelete: ((uri: { fsPath: string }) => void) | null;
};

let perSessionCallbacks: WatcherCallbacks = { onChange: null, onCreate: null, onDelete: null };
let legacyCallbacks: WatcherCallbacks = { onChange: null, onCreate: null, onDelete: null };
let watcherCreateCount = 0;

// Mock vscode module
vi.mock('vscode', () => {
  return {
    workspace: {
      createFileSystemWatcher: vi.fn(() => {
        watcherCreateCount++;
        // First watcher is per-session, second is legacy
        const callbacks = watcherCreateCount <= 1 ? perSessionCallbacks : legacyCallbacks;
        return {
          onDidChange: vi.fn((cb: (uri: { fsPath: string }) => void) => {
            callbacks.onChange = cb;
          }),
          onDidCreate: vi.fn((cb: (uri: { fsPath: string }) => void) => {
            callbacks.onCreate = cb;
          }),
          onDidDelete: vi.fn((cb: (uri: { fsPath: string }) => void) => {
            callbacks.onDelete = cb;
          }),
          dispose: vi.fn(),
        };
      }),
    },
    RelativePattern: vi.fn(),
    Uri: {
      file: vi.fn((path: string) => ({ fsPath: path })),
    },
  };
});

import * as fs from 'fs';
import * as vscode from 'vscode';
import { MultiSessionBridgeWatcher } from '../../../extension/src/autonomous/MultiSessionBridgeWatcher';

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

function makeUri(sessionId: string): { fsPath: string } {
  return { fsPath: `/test/workspace/.specify/hooks/context-bridge-${sessionId}.json` };
}

describe('MultiSessionBridgeWatcher', () => {
  let watcher: MultiSessionBridgeWatcher;
  const readFileSync = vi.mocked(fs.readFileSync);
  const existsSync = vi.mocked(fs.existsSync);
  const readdirSync = vi.mocked(fs.readdirSync);
  const unlinkSync = vi.mocked(fs.unlinkSync);

  beforeEach(() => {
    vi.clearAllMocks();
    watcherCreateCount = 0;
    perSessionCallbacks = { onChange: null, onCreate: null, onDelete: null };
    legacyCallbacks = { onChange: null, onCreate: null, onDelete: null };
    existsSync.mockReturnValue(false);
    readdirSync.mockReturnValue([]);
    watcher = new MultiSessionBridgeWatcher('/test/workspace');
  });

  afterEach(() => {
    watcher.dispose();
    vi.useRealTimers();
  });

  describe('start()', () => {
    it('creates two file system watchers (per-session and legacy)', () => {
      watcher.start();
      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledTimes(2);
    });

    it('starts staleness timer', () => {
      vi.useFakeTimers();
      watcher.start();
      // Timer is running - advancing time should not throw
      vi.advanceTimersByTime(60 * 1000);
    });

    it('performs initial scan for existing bridge files', () => {
      existsSync.mockReturnValue(true);
      readdirSync.mockReturnValue([
        'context-bridge-session-A.json' as unknown as fs.Dirent,
      ]);
      const dataA = makeBridgeData({ sessionId: 'session-A' });
      readFileSync.mockReturnValue(JSON.stringify(dataA));

      watcher.start();
      expect(watcher.getSessionCount()).toBe(1);
    });
  });

  describe('session add (session-added event)', () => {
    it('emits session-added when a new per-session file appears', () => {
      watcher.start();
      const handler = vi.fn();
      watcher.on('session-added', handler);

      const data = makeBridgeData({ sessionId: 'new-session' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('new-session'));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'new-session' })
      );
    });

    it('adds session to registry', () => {
      watcher.start();
      const data = makeBridgeData({ sessionId: 'abc' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('abc'));

      expect(watcher.getSessionCount()).toBe(1);
      const sessions = watcher.getSessions();
      expect(sessions.has('abc')).toBe(true);
    });
  });

  describe('session update (session-update event)', () => {
    it('emits session-update on every bridge file change', () => {
      watcher.start();
      const handler = vi.fn();
      watcher.on('session-update', handler);

      const data = makeBridgeData({ sessionId: 'sess-1' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      // Update same session
      const data2 = makeBridgeData({ sessionId: 'sess-1', timestamp: Date.now() + 1000 });
      readFileSync.mockReturnValue(JSON.stringify(data2));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('updates existing session data in registry', () => {
      watcher.start();
      const data1 = makeBridgeData({ sessionId: 'sess-1', model: 'model-1' });
      readFileSync.mockReturnValue(JSON.stringify(data1));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      const data2 = makeBridgeData({ sessionId: 'sess-1', model: 'model-2' });
      readFileSync.mockReturnValue(JSON.stringify(data2));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      const sessions = watcher.getSessions();
      expect(sessions.get('sess-1')?.model).toBe('model-2');
    });
  });

  describe('session remove (session-removed event)', () => {
    it('emits session-removed when per-session file is deleted', () => {
      watcher.start();
      const data = makeBridgeData({ sessionId: 'sess-1' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      const handler = vi.fn();
      watcher.on('session-removed', handler);
      perSessionCallbacks.onDelete?.(makeUri('sess-1'));

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'sess-1', reason: 'inactive' })
      );
      expect(watcher.getSessionCount()).toBe(0);
    });
  });

  describe('3-session cap and eviction', () => {
    it('tracks up to 3 sessions', () => {
      watcher.start();

      for (let i = 1; i <= 3; i++) {
        const data = makeBridgeData({ sessionId: `sess-${i}`, timestamp: Date.now() + i * 1000 });
        readFileSync.mockReturnValue(JSON.stringify(data));
        perSessionCallbacks.onChange?.(makeUri(`sess-${i}`));
      }

      expect(watcher.getSessionCount()).toBe(3);
    });

    it('evicts oldest inactive session when 4th session arrives', () => {
      watcher.start();
      const evictHandler = vi.fn();
      watcher.on('session-limit-reached', evictHandler);
      const removeHandler = vi.fn();
      watcher.on('session-removed', removeHandler);

      // Add 3 sessions, first one inactive
      const data1 = makeBridgeData({
        sessionId: 'sess-1',
        timestamp: Date.now(),
        session: { active: false, lastActivity: Date.now() },
      });
      readFileSync.mockReturnValue(JSON.stringify(data1));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      const data2 = makeBridgeData({
        sessionId: 'sess-2',
        timestamp: Date.now() + 1000,
        session: { active: true, lastActivity: Date.now() + 1000 },
      });
      readFileSync.mockReturnValue(JSON.stringify(data2));
      perSessionCallbacks.onChange?.(makeUri('sess-2'));

      const data3 = makeBridgeData({
        sessionId: 'sess-3',
        timestamp: Date.now() + 2000,
        session: { active: true, lastActivity: Date.now() + 2000 },
      });
      readFileSync.mockReturnValue(JSON.stringify(data3));
      perSessionCallbacks.onChange?.(makeUri('sess-3'));

      // 4th session triggers eviction of oldest inactive (sess-1)
      const data4 = makeBridgeData({
        sessionId: 'sess-4',
        timestamp: Date.now() + 3000,
      });
      readFileSync.mockReturnValue(JSON.stringify(data4));
      existsSync.mockReturnValue(true); // for cleanup
      perSessionCallbacks.onChange?.(makeUri('sess-4'));

      expect(evictHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          evictedSessionId: 'sess-1',
          newSessionId: 'sess-4',
        })
      );
      expect(watcher.getSessionCount()).toBe(3);
      expect(watcher.getSessions().has('sess-1')).toBe(false);
      expect(watcher.getSessions().has('sess-4')).toBe(true);
    });

    it('evicts oldest by activity when all sessions are active', () => {
      watcher.start();
      const evictHandler = vi.fn();
      watcher.on('session-limit-reached', evictHandler);

      // Add 3 active sessions with increasing timestamps
      for (let i = 1; i <= 3; i++) {
        const data = makeBridgeData({
          sessionId: `sess-${i}`,
          timestamp: Date.now() + i * 1000,
          session: { active: true, lastActivity: Date.now() + i * 1000 },
        });
        readFileSync.mockReturnValue(JSON.stringify(data));
        perSessionCallbacks.onChange?.(makeUri(`sess-${i}`));
      }

      // 4th session triggers eviction of oldest (sess-1)
      const data4 = makeBridgeData({ sessionId: 'sess-4', timestamp: Date.now() + 4000 });
      readFileSync.mockReturnValue(JSON.stringify(data4));
      existsSync.mockReturnValue(true);
      perSessionCallbacks.onChange?.(makeUri('sess-4'));

      expect(evictHandler).toHaveBeenCalledWith(
        expect.objectContaining({ evictedSessionId: 'sess-1' })
      );
      expect(watcher.getSessionCount()).toBe(3);
    });
  });

  describe('staleness detection', () => {
    it('marks session as stale after 5 minutes of no updates', () => {
      vi.useFakeTimers();
      watcher.start();

      const staleHandler = vi.fn();
      watcher.on('session-stale', staleHandler);

      // Add a session with old timestamp
      const oldData = makeBridgeData({
        sessionId: 'old-sess',
        timestamp: Date.now() - 6 * 60 * 1000,
      });
      readFileSync.mockReturnValue(JSON.stringify(oldData));
      perSessionCallbacks.onChange?.(makeUri('old-sess'));

      // Advance past staleness check interval
      vi.advanceTimersByTime(61 * 1000);

      expect(watcher.isSessionStale('old-sess')).toBe(true);
    });

    it('emits session-stale for focused session', () => {
      vi.useFakeTimers();
      watcher.start();

      const staleHandler = vi.fn();
      watcher.on('session-stale', staleHandler);

      const oldData = makeBridgeData({
        sessionId: 'stale-sess',
        timestamp: Date.now() - 6 * 60 * 1000,
      });
      readFileSync.mockReturnValue(JSON.stringify(oldData));
      perSessionCallbacks.onChange?.(makeUri('stale-sess'));

      vi.advanceTimersByTime(61 * 1000);

      expect(staleHandler).toHaveBeenCalledTimes(1);
      expect(watcher.isDataStale()).toBe(true);
    });

    it('removes session after staleness + grace period', () => {
      vi.useFakeTimers();
      watcher.start();

      const removeHandler = vi.fn();
      watcher.on('session-removed', removeHandler);

      const oldData = makeBridgeData({
        sessionId: 'expire-sess',
        timestamp: Date.now() - 6 * 60 * 1000,
      });
      readFileSync.mockReturnValue(JSON.stringify(oldData));
      existsSync.mockReturnValue(true);
      perSessionCallbacks.onChange?.(makeUri('expire-sess'));

      // First check marks as stale (staleness check interval = 60s)
      vi.advanceTimersByTime(61 * 1000);
      expect(watcher.isSessionStale('expire-sess')).toBe(true);

      // Advance past grace period (5 min) plus enough for staleness checks to fire
      // Grace = 5 min = 300s. Need a staleness check to fire AFTER grace period elapsed.
      // Checks fire every 60s. After marking stale at ~61s, next checks at 120s, 180s, ...
      // At 361s (61+300) the grace has elapsed. Next check at 420s will catch it.
      vi.advanceTimersByTime(6 * 60 * 1000);

      expect(removeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'expire-sess', reason: 'stale' })
      );
      expect(watcher.getSessionCount()).toBe(0);
    });

    it('clears staleness when session updates', () => {
      vi.useFakeTimers();
      watcher.start();

      const oldData = makeBridgeData({
        sessionId: 'refreshed',
        timestamp: Date.now() - 6 * 60 * 1000,
      });
      readFileSync.mockReturnValue(JSON.stringify(oldData));
      perSessionCallbacks.onChange?.(makeUri('refreshed'));

      // Mark stale
      vi.advanceTimersByTime(61 * 1000);
      expect(watcher.isSessionStale('refreshed')).toBe(true);

      // Session sends fresh update
      const freshData = makeBridgeData({
        sessionId: 'refreshed',
        timestamp: Date.now(),
      });
      readFileSync.mockReturnValue(JSON.stringify(freshData));
      perSessionCallbacks.onChange?.(makeUri('refreshed'));

      expect(watcher.isSessionStale('refreshed')).toBe(false);
    });

    it('cleans up bridge file on stale removal', () => {
      vi.useFakeTimers();
      watcher.start();

      const oldData = makeBridgeData({
        sessionId: 'cleanup-sess',
        timestamp: Date.now() - 6 * 60 * 1000,
      });
      readFileSync.mockReturnValue(JSON.stringify(oldData));
      existsSync.mockReturnValue(true);
      perSessionCallbacks.onChange?.(makeUri('cleanup-sess'));

      // Mark stale + advance past grace period with enough checks
      vi.advanceTimersByTime(61 * 1000);
      vi.advanceTimersByTime(6 * 60 * 1000);

      expect(unlinkSync).toHaveBeenCalled();
    });
  });

  describe('focused session tracking', () => {
    it('sets focused session to most recently updated', () => {
      watcher.start();

      const data1 = makeBridgeData({ sessionId: 'sess-A' });
      readFileSync.mockReturnValue(JSON.stringify(data1));
      perSessionCallbacks.onChange?.(makeUri('sess-A'));

      const data2 = makeBridgeData({ sessionId: 'sess-B' });
      readFileSync.mockReturnValue(JSON.stringify(data2));
      perSessionCallbacks.onChange?.(makeUri('sess-B'));

      expect(watcher.getFocusedSession()?.sessionId).toBe('sess-B');
    });

    it('emits focused-session-change when focus shifts', () => {
      watcher.start();
      const handler = vi.fn();
      watcher.on('focused-session-change', handler);

      const data1 = makeBridgeData({ sessionId: 'sess-A' });
      readFileSync.mockReturnValue(JSON.stringify(data1));
      perSessionCallbacks.onChange?.(makeUri('sess-A'));

      const data2 = makeBridgeData({ sessionId: 'sess-B' });
      readFileSync.mockReturnValue(JSON.stringify(data2));
      perSessionCallbacks.onChange?.(makeUri('sess-B'));

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'sess-B' })
      );
    });

    it('does not emit focused-session-change for same session update', () => {
      watcher.start();
      const handler = vi.fn();
      watcher.on('focused-session-change', handler);

      const data1 = makeBridgeData({ sessionId: 'sess-A' });
      readFileSync.mockReturnValue(JSON.stringify(data1));
      perSessionCallbacks.onChange?.(makeUri('sess-A'));

      // Update same session
      const data2 = makeBridgeData({ sessionId: 'sess-A', timestamp: Date.now() + 1000 });
      readFileSync.mockReturnValue(JSON.stringify(data2));
      perSessionCallbacks.onChange?.(makeUri('sess-A'));

      // Only called once (initial focus)
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('updates focused session when focused session is removed', () => {
      watcher.start();

      const data1 = makeBridgeData({ sessionId: 'sess-A', timestamp: Date.now() });
      readFileSync.mockReturnValue(JSON.stringify(data1));
      perSessionCallbacks.onChange?.(makeUri('sess-A'));

      const data2 = makeBridgeData({ sessionId: 'sess-B', timestamp: Date.now() + 1000 });
      readFileSync.mockReturnValue(JSON.stringify(data2));
      perSessionCallbacks.onChange?.(makeUri('sess-B'));

      // Remove focused session (sess-B)
      perSessionCallbacks.onDelete?.(makeUri('sess-B'));

      // Falls back to remaining session
      expect(watcher.getFocusedSession()?.sessionId).toBe('sess-A');
    });
  });

  describe('legacy bridge file support', () => {
    it('handles legacy context-bridge.json as a session', () => {
      watcher.start();

      const data = makeBridgeData({ sessionId: '' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      existsSync.mockReturnValue(false); // No per-session file exists

      legacyCallbacks.onChange?.({ fsPath: '/test/workspace/.specify/hooks/context-bridge.json' });

      // Legacy session uses '__legacy__' id
      expect(watcher.getSessionCount()).toBe(1);
    });

    it('skips legacy file if per-session file already tracks the session', () => {
      watcher.start();

      // First, add via per-session file
      const data = makeBridgeData({ sessionId: 'shared-id' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('shared-id'));

      // Now legacy file updates with same session_id
      existsSync.mockReturnValue(true); // per-session file exists
      legacyCallbacks.onChange?.({ fsPath: '/test/workspace/.specify/hooks/context-bridge.json' });

      // Should still be 1 session, not 2
      expect(watcher.getSessionCount()).toBe(1);
    });

    it('removes legacy session on legacy file delete', () => {
      watcher.start();

      const data = makeBridgeData({ sessionId: '' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      existsSync.mockReturnValue(false);
      legacyCallbacks.onChange?.({ fsPath: '/test/workspace/.specify/hooks/context-bridge.json' });

      expect(watcher.getSessionCount()).toBe(1);

      legacyCallbacks.onDelete?.({ fsPath: '/test/workspace/.specify/hooks/context-bridge.json' });

      expect(watcher.getSessionCount()).toBe(0);
    });
  });

  describe('legacy event forwarding', () => {
    it('emits bridge-update for focused session updates', () => {
      watcher.start();
      const handler = vi.fn();
      watcher.on('bridge-update', handler);

      const data = makeBridgeData({ sessionId: 'sess-1' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      expect(handler).toHaveBeenCalledWith(data);
    });

    it('emits session-start when focused session becomes active', () => {
      watcher.start();
      const handler = vi.fn();
      watcher.on('session-start', handler);

      // Add inactive session first to set wasFocusedActive = false
      const inactive = makeBridgeData({
        sessionId: 'sess-1',
        session: { active: false, lastActivity: Date.now() },
      });
      readFileSync.mockReturnValue(JSON.stringify(inactive));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      // Now session becomes active
      const active = makeBridgeData({
        sessionId: 'sess-1',
        session: { active: true, lastActivity: Date.now() },
      });
      readFileSync.mockReturnValue(JSON.stringify(active));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      expect(handler).toHaveBeenCalled();
    });

    it('emits session-end when focused session becomes inactive', () => {
      watcher.start();
      const handler = vi.fn();
      watcher.on('session-end', handler);

      // Start active
      const active = makeBridgeData({
        sessionId: 'sess-1',
        session: { active: true, lastActivity: Date.now() },
      });
      readFileSync.mockReturnValue(JSON.stringify(active));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      // Become inactive
      const inactive = makeBridgeData({
        sessionId: 'sess-1',
        session: { active: false, lastActivity: Date.now() },
      });
      readFileSync.mockReturnValue(JSON.stringify(inactive));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      expect(handler).toHaveBeenCalled();
    });

    it('emits session-end when all sessions are removed', () => {
      watcher.start();
      const handler = vi.fn();
      watcher.on('session-end', handler);

      const data = makeBridgeData({ sessionId: 'only-sess' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('only-sess'));

      perSessionCallbacks.onDelete?.(makeUri('only-sess'));

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('legacy API compatibility', () => {
    it('getLatestData() returns focused session data', () => {
      watcher.start();

      const data = makeBridgeData({ sessionId: 'sess-1' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      expect(watcher.getLatestData()?.sessionId).toBe('sess-1');
    });

    it('isHookDataAvailable() returns true when focused session is not stale', () => {
      watcher.start();

      const data = makeBridgeData({ sessionId: 'sess-1' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      expect(watcher.isHookDataAvailable()).toBe(true);
    });

    it('isHookDataAvailable() returns false when no sessions', () => {
      watcher.start();
      expect(watcher.isHookDataAvailable()).toBe(false);
    });

    it('isDataStale() returns false when focused session is fresh', () => {
      watcher.start();

      const data = makeBridgeData({ sessionId: 'sess-1' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      expect(watcher.isDataStale()).toBe(false);
    });
  });

  describe('hasRealData()', () => {
    it('returns true when any session has non-null context', () => {
      watcher.start();

      const data = makeBridgeData({ sessionId: 'sess-1' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      expect(watcher.hasRealData()).toBe(true);
    });

    it('returns false when all sessions have null context', () => {
      watcher.start();

      const data = makeBridgeData({ sessionId: 'sess-1', context: null });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      expect(watcher.hasRealData()).toBe(false);
    });

    it('returns false when no sessions exist', () => {
      watcher.start();
      expect(watcher.hasRealData()).toBe(false);
    });
  });

  describe('getSessions()', () => {
    it('returns a copy of the sessions map', () => {
      watcher.start();

      const data = makeBridgeData({ sessionId: 'sess-1' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      const sessions = watcher.getSessions();
      sessions.delete('sess-1'); // Modify the copy

      // Original should be unaffected
      expect(watcher.getSessionCount()).toBe(1);
    });
  });

  describe('dispose()', () => {
    it('cleans up all resources', () => {
      watcher.start();

      const data = makeBridgeData({ sessionId: 'sess-1' });
      readFileSync.mockReturnValue(JSON.stringify(data));
      perSessionCallbacks.onChange?.(makeUri('sess-1'));

      watcher.dispose();

      expect(watcher.getSessionCount()).toBe(0);
      expect(watcher.getFocusedSession()).toBeNull();
    });

    it('clears staleness timer', () => {
      vi.useFakeTimers();
      watcher.start();
      watcher.dispose();

      // Advancing time should not trigger staleness checks
      vi.advanceTimersByTime(120 * 1000);
      // Should not throw
    });
  });

  describe('error handling', () => {
    it('ignores corrupted bridge files', () => {
      watcher.start();

      readFileSync.mockReturnValue('not valid json');
      perSessionCallbacks.onChange?.(makeUri('bad-sess'));

      expect(watcher.getSessionCount()).toBe(0);
    });

    it('ignores files with invalid names', () => {
      watcher.start();

      const data = makeBridgeData({ sessionId: 'sess-1' });
      readFileSync.mockReturnValue(JSON.stringify(data));

      // File without the expected prefix
      perSessionCallbacks.onChange?.({ fsPath: '/test/workspace/.specify/hooks/something-else.json' });

      expect(watcher.getSessionCount()).toBe(0);
    });
  });
});
