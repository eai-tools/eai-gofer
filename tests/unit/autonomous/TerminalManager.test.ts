/**
 * Unit tests for TerminalManager
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TerminalManager } from '../../../extension/src/autonomous/TerminalManager';
import type * as vscode from 'vscode';

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    createTerminal: vi.fn(),
    terminals: [],
  },
}));

describe('TerminalManager', () => {
  let terminalManager: TerminalManager;
  let mockTerminal: any;

  beforeEach(() => {
    terminalManager = new TerminalManager();

    // Setup mock terminal
    mockTerminal = {
      name: 'Test Terminal',
      processId: Promise.resolve(12345),
      sendText: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createTerminal', () => {
    it('should create a new terminal with given name', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Gofer: Engineer');

      expect(vscode.window.createTerminal).toHaveBeenCalledWith({
        name: 'Gofer: Engineer',
        hideFromUser: false,
      });
      expect(terminal).toBeDefined();
      expect(terminal.terminalId).toBeDefined();
    });

    it('should create terminal within 500ms (performance requirement)', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const startTime = Date.now();
      await terminalManager.createTerminal('Gofer: Test');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should track terminal state', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Gofer: Engineer');

      expect(terminal.terminalName).toBe('Gofer: Engineer');
      expect(terminal.isAlive).toBe(true);
      expect(terminal.createdAt).toBeDefined();
    });
  });

  describe('sendCommand', () => {
    it('should send command to terminal', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Test');
      await terminalManager.sendCommand(terminal.terminalId, '/speckit.implement');

      expect(mockTerminal.sendText).toHaveBeenCalledWith('/speckit.implement');
    });

    it('should track current command in terminal state', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Test');
      await terminalManager.sendCommand(terminal.terminalId, 'npm test');

      const state = terminalManager.getTerminalState(terminal.terminalId);
      expect(state?.currentCommand).toBe('npm test');
    });
  });

  describe('isAlive', () => {
    it('should return true for active terminal', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Test');
      const alive = terminalManager.isAlive(terminal.terminalId);

      expect(alive).toBe(true);
    });

    it('should return false for closed terminal', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Test');
      await terminalManager.closeTerminal(terminal.terminalId);

      const alive = terminalManager.isAlive(terminal.terminalId);
      expect(alive).toBe(false);
    });
  });

  describe('closeTerminal', () => {
    it('should dispose terminal and remove state for garbage collection', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Test');
      await terminalManager.closeTerminal(terminal.terminalId);

      expect(mockTerminal.dispose).toHaveBeenCalled();

      // State should be removed entirely to allow garbage collection
      const state = terminalManager.getTerminalState(terminal.terminalId);
      expect(state).toBeUndefined();
    });
  });

  describe('sendCommand - edge cases', () => {
    it('should throw error when terminal does not exist', async () => {
      await expect(terminalManager.sendCommand('non-existent-id', 'test')).rejects.toThrow(
        'Terminal non-existent-id not found'
      );
    });

    it('should throw error when terminal is not alive', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Test');
      await terminalManager.closeTerminal(terminal.terminalId);

      // After closeTerminal, state is deleted entirely for GC (not just marked as not alive)
      await expect(terminalManager.sendCommand(terminal.terminalId, 'test')).rejects.toThrow(
        `Terminal ${terminal.terminalId} not found`
      );
    });

    it('should update lastActivity timestamp when sending command', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Test');
      const initialActivity = terminalManager.getTerminalState(terminal.terminalId)?.lastActivity;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      await terminalManager.sendCommand(terminal.terminalId, 'test');

      const state = terminalManager.getTerminalState(terminal.terminalId);
      expect(state?.lastActivity).not.toBe(initialActivity);
    });
  });

  describe('captureOutput', () => {
    it('should capture terminal output via async iterator', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Test');

      // Add output to buffer using internal method
      (terminalManager as any)._addOutputToBuffer(terminal.terminalId, 'Test output line 1\n');
      (terminalManager as any)._addOutputToBuffer(terminal.terminalId, 'Test output line 2\n');

      const outputIterator = terminalManager.captureOutput(terminal.terminalId);
      const lines: string[] = [];

      for await (const line of outputIterator) {
        lines.push(line);
      }

      expect(lines.length).toBe(2);
      expect(lines[0]).toContain('Test output line 1');
      expect(lines[1]).toContain('Test output line 2');
    });

    it('should maintain circular buffer with max 10,000 lines', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Test');

      // Simulate adding 10,001 lines
      for (let i = 0; i < 10001; i++) {
        (terminalManager as any)._addOutputToBuffer(terminal.terminalId, `Line ${i}\n`);
      }

      const state = terminalManager.getTerminalState(terminal.terminalId);

      // Buffer should be capped at 10,000
      expect(state?.outputBuffer.length).toBe(10000);
      // First line should have been removed (circular buffer)
      expect(state?.outputBuffer[0]).toContain('Line 1');
    });

    it('should estimate token count from output (chars / 3.5)', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Test');

      const testOutput = 'a'.repeat(350); // 350 chars = ~100 tokens
      (terminalManager as any)._addOutputToBuffer(terminal.terminalId, testOutput);

      const state = terminalManager.getTerminalState(terminal.terminalId);
      expect(state?.tokenCount).toBeGreaterThan(90);
      expect(state?.tokenCount).toBeLessThan(110);
    });

    it('should throw error when capturing output from non-existent terminal', async () => {
      const outputIterator = terminalManager.captureOutput('non-existent-id');

      await expect(outputIterator.next()).rejects.toThrow('Terminal non-existent-id not found');
    });
  });

  describe('restartTerminal', () => {
    it('should close old terminal and create new one', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Gofer: Engineer');
      const oldTerminalId = terminal.terminalId;

      const newTerminal = await terminalManager.restartTerminal(oldTerminalId);

      // Old terminal should be fully cleaned up (removed from map for GC)
      const oldState = terminalManager.getTerminalState(oldTerminalId);
      expect(oldState).toBeUndefined();
      expect(mockTerminal.dispose).toHaveBeenCalled();

      // New terminal should be alive
      expect(newTerminal.isAlive).toBe(true);
      expect(newTerminal.terminalId).not.toBe(oldTerminalId);
    });

    it('should restore last command in restarted terminal', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Test');
      await terminalManager.sendCommand(terminal.terminalId, '/speckit.implement');

      // Clear mock call history
      mockTerminal.sendText.mockClear();

      await terminalManager.restartTerminal(terminal.terminalId);

      // Should have resent the last command
      expect(mockTerminal.sendText).toHaveBeenCalledWith('/speckit.implement');
    });

    it('should throw error when restarting non-existent terminal', async () => {
      await expect(terminalManager.restartTerminal('non-existent-id')).rejects.toThrow(
        'Terminal non-existent-id not found'
      );
    });
  });

  describe('getActiveTerminals', () => {
    it('should return only alive terminals', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal1 = await terminalManager.createTerminal('Test 1');
      const terminal2 = await terminalManager.createTerminal('Test 2');
      const terminal3 = await terminalManager.createTerminal('Test 3');

      // Close one terminal
      await terminalManager.closeTerminal(terminal2.terminalId);

      const activeTerminals = terminalManager.getActiveTerminals();

      expect(activeTerminals.length).toBe(2);
      expect(activeTerminals.map((t) => t.terminalId)).toContain(terminal1.terminalId);
      expect(activeTerminals.map((t) => t.terminalId)).toContain(terminal3.terminalId);
      expect(activeTerminals.map((t) => t.terminalId)).not.toContain(terminal2.terminalId);
    });
  });

  describe('disposeAll', () => {
    it('should close all terminals', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      await terminalManager.createTerminal('Test 1');
      await terminalManager.createTerminal('Test 2');
      await terminalManager.createTerminal('Test 3');

      await terminalManager.disposeAll();

      const activeTerminals = terminalManager.getActiveTerminals();
      expect(activeTerminals.length).toBe(0);
    });
  });
});
