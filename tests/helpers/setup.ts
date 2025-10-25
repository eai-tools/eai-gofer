/**
 * Test Setup and Global Mocks
 * 
 * This file runs before all tests to set up the test environment.
 */

import { vi } from 'vitest';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
  Anthropic: vi.fn(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

// Mock Twilio
vi.mock('twilio', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

// Mock VSCode API
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
    file: (path: string) => ({ fsPath: path, scheme: 'file', path }),
  },
};

// Mock Node.js built-in modules
vi.mock('fs', () => ({
  promises: {
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
  },
}));

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  stat: vi.fn(),
  access: vi.fn(),
}));

vi.mock('child_process', () => ({
  exec: vi.fn(),
  spawn: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn((fn) => fn),
}));

// Mock environment variables
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
process.env.TWILIO_PHONE_NUMBER = '+1234567890';
process.env.YOUR_PHONE_NUMBER = '+0987654321';
