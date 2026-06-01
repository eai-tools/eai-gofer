/**
 * Test Setup and Global Mocks
 *
 * This file runs before all tests to set up the test environment.
 *
 * CLI-provider integration tests should use the provider CLI login/session
 * state, not direct provider API keys in this repository.
 */

import { vi } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables from .env file
// This must happen before any other code runs
dotenv.config();

// Mock Twilio
vi.mock('twilio', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

// Mock VSCode module for imports
vi.mock('vscode', () => {
  // Type for VSCode Uri-like object
  interface MockUri {
    fsPath: string;
    scheme: string;
    path: string;
  }

  type UriListener = (uri: MockUri) => void;

  // File system watcher mock
  class MockFileSystemWatcher {
    private createListeners: UriListener[] = [];
    private changeListeners: UriListener[] = [];
    private deleteListeners: UriListener[] = [];

    onDidCreate(listener: UriListener): { dispose: () => void } {
      this.createListeners.push(listener);
      return { dispose: vi.fn() };
    }

    onDidChange(listener: UriListener): { dispose: () => void } {
      this.changeListeners.push(listener);
      return { dispose: vi.fn() };
    }

    onDidDelete(listener: UriListener): { dispose: () => void } {
      this.deleteListeners.push(listener);
      return { dispose: vi.fn() };
    }

    dispose(): void {
      this.createListeners = [];
      this.changeListeners = [];
      this.deleteListeners = [];
    }

    // Internal methods for testing
    _triggerCreate(uri: MockUri): void {
      this.createListeners.forEach((listener) => listener(uri));
    }

    _triggerChange(uri: MockUri): void {
      this.changeListeners.forEach((listener) => listener(uri));
    }

    _triggerDelete(uri: MockUri): void {
      this.deleteListeners.forEach((listener) => listener(uri));
    }
  }

  return {
    window: {
      showInformationMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      showWarningMessage: vi.fn(),
      createOutputChannel: vi.fn(() => ({
        appendLine: vi.fn(),
        append: vi.fn(),
        clear: vi.fn(),
        show: vi.fn(),
        dispose: vi.fn(),
      })),
    },
    workspace: {
      getConfiguration: vi.fn(() => ({
        get: vi.fn(),
        update: vi.fn(),
      })),
      workspaceFolders: [],
      onDidChangeWorkspaceFolders: vi.fn(),
      getWorkspaceFolder: vi.fn(),
      asRelativePath: vi.fn((pathOrUri: string | { fsPath?: string; path?: string }) => {
        if (typeof pathOrUri === 'string') {
          return pathOrUri;
        }
        return pathOrUri.fsPath || pathOrUri.path;
      }),
      createFileSystemWatcher: vi.fn(() => new MockFileSystemWatcher()),
    },
    extensions: {
      getExtension: vi.fn(),
    },
    commands: {
      registerCommand: vi.fn(),
      executeCommand: vi.fn(),
    },
    TreeItem: class {},
    TreeItemCollapsibleState: {
      None: 0,
      Collapsed: 1,
      Expanded: 2,
    },
    Uri: {
      file: (path: string): { fsPath: string; scheme: string; path: string } => ({
        fsPath: path,
        scheme: 'file',
        path,
      }),
    },
    RelativePattern: class {
      constructor(
        public base: string,
        public pattern: string
      ) {}
    },
    ProgressLocation: {
      Notification: 15,
    },
    ConfigurationTarget: {
      Global: 1,
      Workspace: 2,
      WorkspaceFolder: 3,
    },
    env: {
      openExternal: vi.fn(),
    },
  };
});

// Also set as global for backward compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).vscode = {
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      append: vi.fn(),
      clear: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    })),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
    })),
    workspaceFolders: [],
    onDidChangeWorkspaceFolders: vi.fn(),
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  TreeItem: class {},
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  Uri: {
    file: (path: string): { fsPath: string; scheme: string; path: string } => ({
      fsPath: path,
      scheme: 'file',
      path,
    }),
  },
};

// DO NOT mock fs, fs/promises, child_process, or util globally
// Integration tests need real file system access
// Unit tests that need mocks should mock them individually

// Mock Logger from extension utils
vi.mock('../../extension/src/utils/logger', () => ({
  Logger: {
    getInstance: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      exception: vi.fn(),
    })),
    for: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      exception: vi.fn(),
    })),
  },
  LogLevel: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
}));

if (!process.env.GOFER_TEST_CLI_SESSION) {
  process.env.GOFER_TEST_CLI_SESSION = 'mock';
}
