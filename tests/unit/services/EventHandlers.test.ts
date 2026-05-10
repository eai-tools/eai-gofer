/**
 * Unit tests for EventHandlers - tasks.md file watcher
 *
 * Tests that the tasks file watcher triggers progressProvider.refresh()
 * on file change and create events.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Track file system watcher callbacks
let onDidChangeCallback: ((uri: unknown) => void) | null = null;
let onDidCreateCallback: ((uri: unknown) => void) | null = null;

const mockTasksWatcher = {
  onDidChange: vi.fn((cb: (uri: unknown) => void) => {
    onDidChangeCallback = cb;
  }),
  onDidCreate: vi.fn((cb: (uri: unknown) => void) => {
    onDidCreateCallback = cb;
  }),
  onDidDelete: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('vscode', () => ({
  workspace: {
    createFileSystemWatcher: vi.fn(() => mockTasksWatcher),
  },
  RelativePattern: vi.fn(),
}));

vi.mock('tsyringe', () => ({
  injectable: () => (target: unknown) => target,
}));

vi.mock('../../../extension/src/services/Logger', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../../../extension/src/config', () => ({
  ConfigManager: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
  })),
}));

import { EventHandlers } from '../../../extension/src/services/EventHandlers';
import { Logger } from '../../../extension/src/services/Logger';

describe('EventHandlers - tasks.md file watcher', () => {
  let eventHandlers: EventHandlers;
  let mockProgressProvider: { refresh: ReturnType<typeof vi.fn> };
  let mockDeps: {
    workspacePath: string;
    context: { subscriptions: unknown[] };
    progressProvider?: unknown;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    onDidChangeCallback = null;
    onDidCreateCallback = null;

    const logger = new Logger();
    eventHandlers = new EventHandlers(logger);

    mockProgressProvider = {
      refresh: vi.fn(),
    };

    mockDeps = {
      workspacePath: '/test/workspace',
      context: {
        subscriptions: [],
      },
      progressProvider: mockProgressProvider,
    };
  });

  // Access the private method directly for focused testing
  function callRegisterTasksFileWatcher(): void {
    (eventHandlers as unknown as Record<string, (deps: unknown) => void>)[
      'registerTasksFileWatcher'
    ](mockDeps);
  }

  it('should create a file system watcher for tasks.md pattern', () => {
    callRegisterTasksFileWatcher();

    // Verify watcher was registered by checking it was pushed to subscriptions
    expect(mockDeps.context.subscriptions).toContain(mockTasksWatcher);
    // Verify both change and create handlers were registered
    expect(mockTasksWatcher.onDidChange).toHaveBeenCalledTimes(1);
    expect(mockTasksWatcher.onDidCreate).toHaveBeenCalledTimes(1);
  });

  it('should call progressProvider.refresh() on tasks.md change', () => {
    callRegisterTasksFileWatcher();

    expect(onDidChangeCallback).not.toBeNull();
    onDidChangeCallback!({ fsPath: '/test/workspace/.specify/specs/feature/tasks.md' });

    expect(mockProgressProvider.refresh).toHaveBeenCalledTimes(1);
  });

  it('should call progressProvider.refresh() on tasks.md create', () => {
    callRegisterTasksFileWatcher();

    expect(onDidCreateCallback).not.toBeNull();
    onDidCreateCallback!({ fsPath: '/test/workspace/.specify/specs/feature/tasks.md' });

    expect(mockProgressProvider.refresh).toHaveBeenCalledTimes(1);
  });

  it('should not throw if progressProvider is undefined', () => {
    mockDeps.progressProvider = undefined;
    callRegisterTasksFileWatcher();

    expect(onDidChangeCallback).not.toBeNull();
    expect(() => {
      onDidChangeCallback!({ fsPath: '/test/workspace/.specify/specs/feature/tasks.md' });
    }).not.toThrow();
  });

  it('should push tasks watcher to context subscriptions', () => {
    callRegisterTasksFileWatcher();

    expect(mockDeps.context.subscriptions).toContain(mockTasksWatcher);
  });
});
