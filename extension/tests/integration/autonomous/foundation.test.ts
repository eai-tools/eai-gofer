/**
 * Integration tests for Autonomous Driver Foundation
 * Tests the integration between TerminalManager and OutputMonitor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TerminalManager } from '../../../src/autonomous/TerminalManager';
import { OutputMonitor } from '../../../src/autonomous/OutputMonitor';
import type * as vscode from 'vscode';

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    createTerminal: vi.fn(),
    terminals: [],
  },
}));

describe('Foundation Integration Tests', () => {
  let terminalManager: TerminalManager;
  let outputMonitor: OutputMonitor;
  let mockTerminal: any;

  beforeEach(() => {
    terminalManager = new TerminalManager();
    outputMonitor = new OutputMonitor();

    mockTerminal = {
      name: 'Integration Test Terminal',
      processId: Promise.resolve(99999),
      sendText: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    };
  });

  afterEach(async () => {
    await terminalManager.disposeAll();
    vi.clearAllMocks();
  });

  /**
   * T031: Integration test - Spawn terminal → Send command → Capture output
   */
  describe('T031: Terminal Lifecycle Integration', () => {
    it('should spawn terminal, send command, and capture output', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      // 1. Spawn terminal
      const terminal = await terminalManager.createTerminal('Gofer: Integration Test');

      expect(terminal).toBeDefined();
      expect(terminal.terminalId).toBeDefined();
      expect(terminal.isAlive).toBe(true);
      expect(vscode.window.createTerminal).toHaveBeenCalledWith({
        name: 'Gofer: Integration Test',
        hideFromUser: false,
      });

      // 2. Send command
      const command = '/5_gofer_implement';
      await terminalManager.sendCommand(terminal.terminalId, command);

      expect(mockTerminal.sendText).toHaveBeenCalledWith(command);

      const state = terminalManager.getTerminalState(terminal.terminalId);
      expect(state?.currentCommand).toBe(command);

      // 3. Simulate output and capture it
      const simulatedOutput = `
        Starting implementation...
        ✅ Task #T001: Created directory structure
        Installing dependencies...
        Done!
      `;

      // Add output to buffer
      (terminalManager as any)._addOutputToBuffer(terminal.terminalId, simulatedOutput);

      // 4. Capture and parse output
      const outputIterator = terminalManager.captureOutput(terminal.terminalId);
      const capturedLines: string[] = [];

      for await (const line of outputIterator) {
        capturedLines.push(line);
      }

      expect(capturedLines.length).toBeGreaterThan(0);

      // 5. Parse output with OutputMonitor
      const events = outputMonitor.parseStream(simulatedOutput);

      expect(events.length).toBeGreaterThan(0);

      const taskEvents = events.filter((e) => e.type === 'task_update');
      expect(taskEvents.length).toBeGreaterThanOrEqual(1);

      // Verify task was detected
      const taskUpdate = taskEvents[0].data as any;
      expect(taskUpdate.taskId).toBe('T001');
      expect(taskUpdate.newStatus).toBe('completed');
    });

    it('should track token count from captured output', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Token Test');

      // Simulate 700 characters (~200 tokens)
      const largeOutput = 'a'.repeat(700);
      (terminalManager as any)._addOutputToBuffer(terminal.terminalId, largeOutput);

      const state = terminalManager.getTerminalState(terminal.terminalId);

      // Should estimate ~200 tokens (700 / 3.5)
      expect(state?.tokenCount).toBeGreaterThan(180);
      expect(state?.tokenCount).toBeLessThan(220);
    });

    it('should handle multiple commands sequentially', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Sequential Test');

      // Send multiple commands
      await terminalManager.sendCommand(terminal.terminalId, 'npm install');
      await terminalManager.sendCommand(terminal.terminalId, 'npm test');
      await terminalManager.sendCommand(terminal.terminalId, 'npm run build');

      // Verify last command is tracked
      const state = terminalManager.getTerminalState(terminal.terminalId);
      expect(state?.currentCommand).toBe('npm run build');

      // Verify all commands were sent
      expect(mockTerminal.sendText).toHaveBeenCalledTimes(3);
    });
  });

  /**
   * T032: Integration test - Terminal crash → Auto-restart → Resume capture
   */
  describe('T032: Terminal Crash Recovery', () => {
    it('should restart crashed terminal and restore state', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      // 1. Create initial terminal
      const terminal = await terminalManager.createTerminal('Crash Test');
      const originalTerminalId = terminal.terminalId;

      // 2. Send command
      await terminalManager.sendCommand(originalTerminalId, '/5_gofer_implement');

      // 3. Simulate crash by closing terminal
      await terminalManager.closeTerminal(originalTerminalId);

      // Verify terminal is dead
      expect(terminalManager.isAlive(originalTerminalId)).toBe(false);

      // 4. Restart terminal
      const restartedTerminal = await terminalManager.restartTerminal(originalTerminalId);

      // 5. Verify new terminal is alive
      expect(restartedTerminal.isAlive).toBe(true);
      expect(restartedTerminal.terminalId).not.toBe(originalTerminalId);

      // 6. Verify last command was restored
      expect(mockTerminal.sendText).toHaveBeenCalledWith('/5_gofer_implement');

      // 7. Verify old terminal is marked as dead
      const oldState = terminalManager.getTerminalState(originalTerminalId);
      expect(oldState?.isAlive).toBe(false);
      expect(oldState?.closedAt).toBeDefined();
    });

    it('should maintain output buffer during restart', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Buffer Test');

      // Add output to buffer before crash
      const outputBeforeCrash = 'Output before crash';
      (terminalManager as any)._addOutputToBuffer(terminal.terminalId, outputBeforeCrash);

      // Get state before restart
      const stateBeforeRestart = terminalManager.getTerminalState(terminal.terminalId);
      const bufferSizeBeforeRestart = stateBeforeRestart?.outputBuffer.length;

      // Restart terminal (this creates a new terminal, old buffer is preserved)
      await terminalManager.restartTerminal(terminal.terminalId);

      // Old terminal state should still have the buffer
      const oldState = terminalManager.getTerminalState(terminal.terminalId);
      expect(oldState?.outputBuffer.length).toBe(bufferSizeBeforeRestart);
    });

    it('should handle rapid restart attempts gracefully', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Rapid Restart');

      // Restart multiple times rapidly
      const restart1 = await terminalManager.restartTerminal(terminal.terminalId);
      const restart2 = await terminalManager.restartTerminal(terminal.terminalId); // Use original ID
      const restart3 = await terminalManager.restartTerminal(terminal.terminalId); // Use original ID

      // Get the latest terminal state
      const activeTerminals = terminalManager.getActiveTerminals();

      // Should have active terminals after restarts
      expect(activeTerminals.length).toBeGreaterThan(0);

      // Each restart should create a new terminal
      expect(restart1.terminalId).not.toBe(terminal.terminalId);
      expect(restart2.terminalId).not.toBe(terminal.terminalId);
      expect(restart3.terminalId).not.toBe(terminal.terminalId);
    });
  });

  /**
   * T033: Integration test - Parse real Claude output → Detect all event types
   */
  describe('T033: Real-World Output Parsing', () => {
    it('should detect all event types from realistic Claude output', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const terminal = await terminalManager.createTerminal('Parse Test');

      // Simulate realistic Claude output with multiple event types
      const realisticOutput = `
Starting implementation of feature 005...

🔄 Task #T001: Setting up project structure
Creating directories...
✅ Task #T001: Project structure created

🔄 Task #T002: Installing dependencies
Running npm install...
npm WARN deprecated package@1.0.0
✅ Task #T002: Dependencies installed

🔄 Task #T003: Running TypeScript compiler
src/models/User.ts:42:5 - error TS2322: Type 'string' is not assignable to type 'number'.
42     age: "invalid"
       ~~~

I need to fix this type error. Should I:
Option A: Change the type to string | number
Option B: Add runtime validation
Which approach should I use?

Warning: Context window approaching limit (165K tokens)
      `;

      // Add output to terminal
      (terminalManager as any)._addOutputToBuffer(terminal.terminalId, realisticOutput);

      // Parse all events
      const events = outputMonitor.parseStream(realisticOutput);

      // Should detect multiple event types
      expect(events.length).toBeGreaterThan(0);

      // 1. Check for task updates
      const taskEvents = events.filter((e) => e.type === 'task_update');
      expect(taskEvents.length).toBeGreaterThanOrEqual(4); // 2 starts + 2 completions

      // Verify task IDs
      const taskIds = taskEvents.map((e: any) => e.data.taskId);
      expect(taskIds).toContain('T001');
      expect(taskIds).toContain('T002');
      expect(taskIds).toContain('T003');

      // 2. Check for error detection
      const errorEvents = events.filter((e) => e.type === 'error_detected');
      expect(errorEvents.length).toBeGreaterThanOrEqual(1);

      const errorData = errorEvents[0].data as any;
      expect(errorData.errorType).toBe('type_error');
      expect(errorData.affectedFiles).toContain('src/models/User.ts');

      // 3. Check for question detection
      const questionEvents = events.filter((e) => e.type === 'question_detected');
      expect(questionEvents.length).toBeGreaterThanOrEqual(1);

      const questionData = questionEvents[0].data as any;
      expect(questionData.confidence).toBe('high'); // Has "Option A:" and "Option B:"
      expect(questionData.options.length).toBe(2);

      // 4. Check for context warning
      const contextEvents = events.filter((e) => e.type === 'context_warning');
      expect(contextEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse output with mixed success and failure tasks', async () => {
      const output = `
        ✅ Task #T001: Setup complete
        🔄 Task #T002: Running tests
        FAIL tests/user.test.ts
          ● User › should validate email
            expect(received).toBe(expected)
        ❌ Task #T002: Tests failed
        🔄 Task #T003: Retrying with fixes
        ✅ Task #T003: All tests pass
      `;

      const events = outputMonitor.parseStream(output);

      const taskEvents = events.filter((e) => e.type === 'task_update');
      const statuses = taskEvents.map((e: any) => ({ id: e.data.taskId, status: e.data.newStatus }));

      // Should detect completion, in_progress, failed, in_progress, completed
      expect(statuses).toContainEqual({ id: 'T001', status: 'completed' });
      expect(statuses).toContainEqual({ id: 'T002', status: 'failed' });
      expect(statuses).toContainEqual({ id: 'T003', status: 'completed' });
    });

    it('should handle edge cases in output parsing', async () => {
      // Test various edge cases
      const edgeCases = [
        {
          name: 'Task with lowercase "task" word',
          output: '✅ task #T001: lowercase "task" word is accepted (case-insensitive)',
          shouldDetect: true, // Regex has /i flag - case insensitive
        },
        {
          name: 'Task ID with lowercase t',
          output: '✅ Task #t001: lowercase ID is accepted (regex has /i flag)',
          shouldDetect: true, // The /i flag makes the whole pattern case-insensitive
        },
        {
          name: 'Multiple task markers on one line (only first detected)',
          output: '✅ Task #T001: Done ✅ Task #T002: Also done',
          shouldDetect: true,
          expectedCount: 1, // detectTaskCompletion returns first match only
        },
        {
          name: 'Task marker without colon (supported by regex)',
          output: '✅ Task #T001 Completed without colon',
          shouldDetect: true, // :? makes colon optional
        },
        {
          name: 'Empty output',
          output: '',
          shouldDetect: false,
        },
        {
          name: 'Only whitespace',
          output: '   \n\t\n   ',
          shouldDetect: false,
        },
      ];

      for (const testCase of edgeCases) {
        const events = outputMonitor.parseStream(testCase.output);
        const taskEvents = events.filter((e) => e.type === 'task_update');

        if (testCase.shouldDetect) {
          expect(taskEvents.length).toBeGreaterThan(0);
          if (testCase.expectedCount) {
            expect(taskEvents.length).toBe(testCase.expectedCount);
          }
        } else {
          expect(taskEvents.length).toBe(0);
        }
      }
    });
  });

  describe('Integration: Performance Requirements', () => {
    it('should create terminal within 500ms', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);

      const startTime = Date.now();
      await terminalManager.createTerminal('Performance Test');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should parse large output efficiently', () => {
      // Generate large output (1000 lines)
      const lines = [];
      for (let i = 0; i < 1000; i++) {
        if (i % 100 === 0) {
          lines.push(`✅ Task #T${String(i).padStart(3, '0')}: Completed task ${i}`);
        } else {
          lines.push(`Processing item ${i}...`);
        }
      }
      const largeOutput = lines.join('\n');

      const startTime = Date.now();
      const events = outputMonitor.parseStream(largeOutput);
      const duration = Date.now() - startTime;

      // Should parse in under 100ms
      expect(duration).toBeLessThan(100);

      // Should detect all 10 tasks
      const taskEvents = events.filter((e) => e.type === 'task_update');
      expect(taskEvents.length).toBe(10);
    });
  });
});
