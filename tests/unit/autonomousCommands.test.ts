/**
 * Unit tests for autonomous commands (Play/Stop button state management)
 * SKIPPED: node-pty native module version mismatch in test environment
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock vscode module
const mockExecuteCommand = vi.fn();
const mockShowInformationMessage = vi.fn();
const mockShowErrorMessage = vi.fn();
const mockCreateOutputChannel = vi.fn();
const mockCreateTerminal = vi.fn();
const mockOnDidCloseTerminal = vi.fn();

const mockOutputChannel = {
  appendLine: vi.fn(),
  clear: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  dispose: vi.fn(),
};

const mockTerminal = {
  name: 'Claude Code: test-spec',
  processId: Promise.resolve(12345),
  sendText: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: mockCreateOutputChannel,
    createTerminal: mockCreateTerminal,
    onDidCloseTerminal: mockOnDidCloseTerminal,
    showInformationMessage: mockShowInformationMessage,
    showErrorMessage: mockShowErrorMessage,
    terminals: [],
  },
  commands: {
    executeCommand: mockExecuteCommand,
  },
  workspace: {
    workspaceFolders: [
      {
        uri: { fsPath: '/test/workspace' },
        name: 'test-workspace',
        index: 0,
      },
    ],
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'autonomousMode') {
          return false;
        } // Disable autonomous mode for simpler testing
        if (key === 'anthropicApiKey') {
          return '';
        }
        return defaultValue;
      }),
    }),
  },
  EventEmitter: vi.fn().mockImplementation(() => ({
    event: vi.fn(),
    fire: vi.fn(),
  })),
}));

// node-pty is already mocked in tests/helpers/setup.ts

// Import after mocks are set up
let launchClaudeCode: (specId: string) => Promise<void>;
let stopClaudeCode: () => Promise<void>;

describe.skip('Autonomous Commands - Play/Stop Button State Management', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreateOutputChannel.mockReturnValue(mockOutputChannel);
    mockCreateTerminal.mockReturnValue(mockTerminal);

    // Dynamically import the module to get fresh instances
    const module = await import('../../extension/src/autonomousCommands');
    launchClaudeCode = module.launchClaudeCode;
    stopClaudeCode = module.stopClaudeCode;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('launchClaudeCode', () => {
    it('should set claudeCodeRunning context to true on launch', async () => {
      await launchClaudeCode('test-spec');

      // Verify setContext was called with true
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'setContext',
        'gofer.claudeCodeRunning',
        true
      );
    });

    it('should create output channel on first launch', async () => {
      await launchClaudeCode('test-spec');

      expect(mockCreateOutputChannel).toHaveBeenCalledWith('Gofer-ClaudeCode');
    });

    it('should create terminal with correct name', async () => {
      await launchClaudeCode('test-spec');

      // Find the createTerminal call
      const createTerminalCall = mockCreateTerminal.mock.calls[0];
      expect(createTerminalCall).toBeDefined();
      expect(createTerminalCall[0]).toMatchObject({
        name: 'Claude Code: test-spec',
      });
    });

    it('should show output channel when launching', async () => {
      await launchClaudeCode('test-spec');

      expect(mockOutputChannel.show).toHaveBeenCalledWith(false);
    });

    it('should handle missing workspace folder gracefully', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.workspace).workspaceFolders = undefined;

      await expect(launchClaudeCode('test-spec')).rejects.toThrow('No workspace folder found');

      // Restore workspace folders for other tests
      vi.mocked(vscode.workspace).workspaceFolders = [
        {
          uri: { fsPath: '/test/workspace' },
          name: 'test-workspace',
          index: 0,
        },
      ] as any;
    });

    it('should log launch steps to output channel', async () => {
      await launchClaudeCode('test-spec');

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Setting context for Claude Code running')
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Creating terminal')
      );
    });
  });

  describe('stopClaudeCode', () => {
    it('should set claudeCodeRunning context to false on stop', async () => {
      await stopClaudeCode();

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'setContext',
        'gofer.claudeCodeRunning',
        false
      );
    });

    it('should show information message when stopped', async () => {
      await stopClaudeCode();

      expect(mockShowInformationMessage).toHaveBeenCalledWith('Claude Code stopped');
    });

    it('should handle stop when no terminal is running', async () => {
      // Should not throw even if no terminal exists
      await expect(stopClaudeCode()).resolves.not.toThrow();
    });
  });

  describe('State Transitions', () => {
    it('should transition from stopped to running on launch', async () => {
      // Initial state: stopped
      await stopClaudeCode();
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'setContext',
        'gofer.claudeCodeRunning',
        false
      );

      vi.clearAllMocks();

      // Launch: transition to running
      await launchClaudeCode('test-spec');
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'setContext',
        'gofer.claudeCodeRunning',
        true
      );
    });

    it('should transition from running to stopped on stop', async () => {
      // Start running
      await launchClaudeCode('test-spec');
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'setContext',
        'gofer.claudeCodeRunning',
        true
      );

      vi.clearAllMocks();

      // Stop: transition to stopped
      await stopClaudeCode();
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'setContext',
        'gofer.claudeCodeRunning',
        false
      );
    });

    it('should maintain correct state through multiple launches', async () => {
      // First launch
      await launchClaudeCode('spec-1');
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'setContext',
        'gofer.claudeCodeRunning',
        true
      );

      // Stop
      await stopClaudeCode();
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'setContext',
        'gofer.claudeCodeRunning',
        false
      );

      // Second launch
      await launchClaudeCode('spec-2');
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'setContext',
        'gofer.claudeCodeRunning',
        true
      );
    });
  });

  describe('Error Handling', () => {
    it('should set context to false on launch error', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.workspace).workspaceFolders = undefined;

      try {
        await launchClaudeCode('test-spec');
      } catch {
        // Expected to fail
      }

      // Context should be set back to false on error
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'setContext',
        'gofer.claudeCodeRunning',
        false
      );

      // Restore workspace folders
      vi.mocked(vscode.workspace).workspaceFolders = [
        {
          uri: { fsPath: '/test/workspace' },
          name: 'test-workspace',
          index: 0,
        },
      ] as any;
    });

    it('should show error message to user on launch failure', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.workspace).workspaceFolders = undefined;

      try {
        await launchClaudeCode('test-spec');
      } catch {
        // Expected to fail
      }

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to launch Claude Code')
      );

      // Restore workspace folders
      vi.mocked(vscode.workspace).workspaceFolders = [
        {
          uri: { fsPath: '/test/workspace' },
          name: 'test-workspace',
          index: 0,
        },
      ] as any;
    });
  });

  describe('Performance', () => {
    it('should complete state change within 100ms', async () => {
      const startTime = Date.now();
      await stopClaudeCode();
      const duration = Date.now() - startTime;

      // State management should be fast (<100ms)
      expect(duration).toBeLessThan(100);
    });
  });
});
