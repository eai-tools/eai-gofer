/**
 * Unit tests for HookBridgeWatcher
 *
 * Tests bridge file watching, event emission, staleness detection,
 * and session state transitions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { BridgeData } from '../../../extension/src/autonomous/HookBridgeWatcher';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

// Track file system watcher callbacks
let onDidChangeCallback: (() => void) | null = null;
let onDidDeleteCallback: (() => void) | null = null;

// Mock vscode module
vi.mock('vscode', () => {
  const mockWatcher = {
    onDidChange: vi.fn((cb: () => void) => {
      onDidChangeCallback = cb;
    }),
    onDidCreate: vi.fn(),
    onDidDelete: vi.fn((cb: () => void) => {
      onDidDeleteCallback = cb;
    }),
    dispose: vi.fn(),
  };

  return {
    workspace: {
      createFileSystemWatcher: vi.fn(() => mockWatcher),
    },
    RelativePattern: vi.fn(),
  };
});

import * as fs from 'fs';
import * as vscode from 'vscode';
import { HookBridgeWatcher } from '../../../extension/src/autonomous/HookBridgeWatcher';

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

describe('HookBridgeWatcher', () => {
  let watcher: HookBridgeWatcher;
  const readFileSync = vi.mocked(fs.readFileSync);

  beforeEach(() => {
    vi.clearAllMocks();
    onDidChangeCallback = null;
    onDidDeleteCallback = null;
    watcher = new HookBridgeWatcher('/test/workspace');
  });

  afterEach(() => {
    watcher.dispose();
  });

  describe('start()', () => {
    it('creates a file system watcher', () => {
      watcher.start();
      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
    });

    it('performs an initial read of the bridge file', () => {
      const data = makeBridgeData();
      readFileSync.mockReturnValue(JSON.stringify(data));

      watcher.start();
      expect(watcher.getLatestData()).not.toBeNull();
    });
  });

  describe('bridge-update event', () => {
    it('emits bridge-update when file changes', () => {
      const data = makeBridgeData();
      readFileSync.mockReturnValue(JSON.stringify(data));

      const handler = vi.fn();
      watcher.on('bridge-update', handler);
      watcher.start();

      // Simulate file change
      onDidChangeCallback?.();

      // Called twice: once during start() initial read, once on change
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('updates latestData on file change', () => {
      const data = makeBridgeData({ sessionId: 'new-session' });
      readFileSync.mockReturnValue(JSON.stringify(data));

      watcher.start();
      onDidChangeCallback?.();

      expect(watcher.getLatestData()?.sessionId).toBe('new-session');
    });
  });

  describe('session transitions', () => {
    it('emits session-start when session becomes active', () => {
      // First read: inactive
      const inactive = makeBridgeData({ session: { active: false, lastActivity: Date.now() } });
      readFileSync.mockReturnValue(JSON.stringify(inactive));

      const startHandler = vi.fn();
      watcher.on('session-start', startHandler);
      watcher.start();

      // Second read: active
      const active = makeBridgeData({ session: { active: true, lastActivity: Date.now() } });
      readFileSync.mockReturnValue(JSON.stringify(active));
      onDidChangeCallback?.();

      expect(startHandler).toHaveBeenCalledTimes(1);
    });

    it('emits session-end when session becomes inactive', () => {
      // First read: active
      const active = makeBridgeData({ session: { active: true, lastActivity: Date.now() } });
      readFileSync.mockReturnValue(JSON.stringify(active));

      const endHandler = vi.fn();
      watcher.on('session-end', endHandler);
      watcher.start();

      // Second read: inactive
      const inactive = makeBridgeData({ session: { active: false, lastActivity: Date.now() } });
      readFileSync.mockReturnValue(JSON.stringify(inactive));
      onDidChangeCallback?.();

      expect(endHandler).toHaveBeenCalledTimes(1);
    });

    it('emits session-end when bridge file is deleted', () => {
      const data = makeBridgeData();
      readFileSync.mockReturnValue(JSON.stringify(data));

      const endHandler = vi.fn();
      watcher.on('session-end', endHandler);
      watcher.start();

      // Simulate deletion
      onDidDeleteCallback?.();

      expect(endHandler).toHaveBeenCalledTimes(1);
      expect(watcher.getLatestData()).toBeNull();
    });
  });

  describe('isHookDataAvailable()', () => {
    it('returns false when no data has been read', () => {
      readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      watcher.start();
      expect(watcher.isHookDataAvailable()).toBe(false);
    });

    it('returns true when fresh data is available', () => {
      const data = makeBridgeData();
      readFileSync.mockReturnValue(JSON.stringify(data));
      watcher.start();
      expect(watcher.isHookDataAvailable()).toBe(true);
    });
  });

  describe('staleness detection', () => {
    it('emits session-stale when data is older than threshold', () => {
      vi.useFakeTimers();

      const oldData = makeBridgeData({ timestamp: Date.now() - 6 * 60 * 1000 });
      readFileSync.mockReturnValue(JSON.stringify(oldData));

      const staleHandler = vi.fn();
      watcher.on('session-stale', staleHandler);
      watcher.start();

      // Advance time past staleness check interval
      vi.advanceTimersByTime(61 * 1000);

      expect(staleHandler).toHaveBeenCalledTimes(1);
      expect(watcher.isDataStale()).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('observation fields in bridge data (T020)', () => {
    it('parses bridge data with observationId and toolInput', () => {
      const data = makeBridgeData({
        lastToolUse: {
          toolName: 'Read',
          timestamp: Date.now(),
          observationId: 'abc-123-def-456',
          toolInput: { file_path: '/tmp/test.ts' },
        },
      });
      readFileSync.mockReturnValue(JSON.stringify(data));

      watcher.start();
      const latest = watcher.getLatestData();
      expect(latest?.lastToolUse?.observationId).toBe('abc-123-def-456');
      expect(latest?.lastToolUse?.toolInput).toEqual({ file_path: '/tmp/test.ts' });
    });

    it('parses bridge data without observationId (backward compat)', () => {
      const data = makeBridgeData({
        lastToolUse: {
          toolName: 'Bash',
          timestamp: Date.now(),
        },
      });
      readFileSync.mockReturnValue(JSON.stringify(data));

      watcher.start();
      const latest = watcher.getLatestData();
      expect(latest?.lastToolUse?.toolName).toBe('Bash');
      expect(latest?.lastToolUse?.observationId).toBeUndefined();
      expect(latest?.lastToolUse?.toolInput).toBeUndefined();
    });

    it('emits bridge-update with observation fields accessible', () => {
      const data = makeBridgeData({
        lastToolUse: {
          toolName: 'Grep',
          timestamp: Date.now(),
          observationId: 'grep-obs-id',
          toolInput: { pattern: 'TODO', path: '/src' },
        },
      });
      readFileSync.mockReturnValue(JSON.stringify(data));

      const handler = vi.fn();
      watcher.on('bridge-update', handler);
      watcher.start();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          lastToolUse: expect.objectContaining({
            observationId: 'grep-obs-id',
            toolInput: { pattern: 'TODO', path: '/src' },
          }),
        })
      );
    });
  });

  describe('dispose()', () => {
    it('cleans up resources', () => {
      watcher.start();
      watcher.dispose();

      // Should not throw
      expect(() => watcher.emit('bridge-update', {})).not.toThrow();
    });
  });
});
