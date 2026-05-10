/**
 * Unit tests for ProgressReporter
 *
 * Tests T042-T051 from tasks.md:
 * - updateTaskStatus() calling ProgressProvider
 * - updateTasksFile() checkbox marking with atomic writes
 * - saveSession() state persistence with atomic writes
 * - resumeSession() from disk with validation
 * - updateStatusBar() with live metrics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProgressReporter } from '../../../src/autonomous/ProgressReporter';
import type { AutonomousSession, ProgressUpdate, TaskStatus } from '../../../src/autonomous/types';
import type * as vscode from 'vscode';

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    createStatusBarItem: vi.fn(),
  },
  StatusBarAlignment: {
    Left: 1,
  },
}));

// Mock file system promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
  rename: vi.fn(),
}));

describe('ProgressReporter', () => {
  let progressReporter: ProgressReporter;
  let mockProgressProvider: any;
  let mockStatusBarItem: any;
  let mockFs: any;

  beforeEach(async () => {
    // Setup mock ProgressProvider
    mockProgressProvider = {
      updateTaskStatus: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn(),
      getProgress: vi.fn().mockReturnValue({
        totalSpecs: 2,
        completedSpecs: 0,
        inProgressSpecs: 1,
        totalTasks: 10,
        completedTasks: 3,
        inProgressTasks: 1,
        failedTasks: 0,
        blockedTasks: 0,
        pendingTasks: 6,
      }),
    };

    // Setup mock StatusBarItem
    mockStatusBarItem = {
      text: '',
      tooltip: '',
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    };

    // Setup mock vscode
    const vscode = await import('vscode');
    vi.mocked(vscode.window.createStatusBarItem).mockReturnValue(mockStatusBarItem);

    // Setup mock file system
    mockFs = await import('fs/promises');
    vi.mocked(mockFs.rename).mockResolvedValue(undefined);

    // Create ProgressReporter
    progressReporter = new ProgressReporter(
      '/test/workspace',
      mockProgressProvider
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // T042-T043: updateTaskStatus()
  // ============================================================================

  describe('T042-T043: updateTaskStatus', () => {
    it('should update task status via ProgressProvider', async () => {
      const specId = '005-autonomous-claude-driver';
      const taskId = 'T001';
      const status: TaskStatus = 'completed';

      await progressReporter.updateTaskStatus(specId, taskId, status);

      expect(mockProgressProvider.updateTaskStatus).toHaveBeenCalledWith(
        specId,
        taskId,
        status
      );
    });

    it('should refresh ProgressProvider after update', async () => {
      await progressReporter.updateTaskStatus('005', 'T001', 'in_progress');

      expect(mockProgressProvider.refresh).toHaveBeenCalled();
    });

    it('should handle all task status types', async () => {
      const statuses: TaskStatus[] = [
        'pending',
        'in_progress',
        'testing',
        'completed',
        'failed',
      ];

      for (const status of statuses) {
        await progressReporter.updateTaskStatus('005', 'T001', status);
        expect(mockProgressProvider.updateTaskStatus).toHaveBeenCalledWith(
          '005',
          'T001',
          status
        );
      }
    });

    it('should throw error when ProgressProvider update fails', async () => {
      mockProgressProvider.updateTaskStatus.mockRejectedValue(
        new Error('Update failed')
      );

      await expect(
        progressReporter.updateTaskStatus('005', 'T001', 'completed')
      ).rejects.toThrow('Update failed');
    });

    it('should update within 100ms (performance requirement)', async () => {
      const startTime = Date.now();
      await progressReporter.updateTaskStatus('005', 'T001', 'completed');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });
  });

  // ============================================================================
  // T044-T045: updateTasksFile()
  // ============================================================================

  describe('T044-T045: updateTasksFile', () => {
    it('should mark task as completed with checkbox', async () => {
      const tasksContent = `
## Tasks

### Foundation
- [ ] T001 [US1] Write unit tests for TerminalManager
- [ ] T002 [US1] Implement TerminalManager
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      await progressReporter.updateTasksFile('005', 'T001', 'completed');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('tasks.md'),
        expect.stringContaining('- [X] T001'),
        'utf-8'
      );
    });

    it('should mark task as in-progress with checkbox', async () => {
      const tasksContent = `
- [ ] T001 Write tests
- [ ] T002 Implement feature
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      await progressReporter.updateTasksFile('005', 'T001', 'in_progress');

      // In-progress tasks are marked with partial checkbox
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('tasks.md'),
        expect.stringContaining('- [~] T001'),
        'utf-8'
      );
    });

    it('should unmark completed tasks when status changes', async () => {
      const tasksContent = `
- [X] T001 Write tests
- [ ] T002 Implement feature
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      await progressReporter.updateTasksFile('005', 'T001', 'pending');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('tasks.md'),
        expect.stringContaining('- [ ] T001'),
        'utf-8'
      );
    });

    it('should use atomic write with temp file', async () => {
      const tasksContent = '- [ ] T001 Test';
      mockFs.readFile.mockResolvedValue(tasksContent);

      await progressReporter.updateTasksFile('005', 'T001', 'completed');

      // Should write to temp file first, then rename
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\.tmp$/),
        expect.any(String),
        'utf-8'
      );
    });

    it('should preserve file content around updated task', async () => {
      const tasksContent = `
# Tasks

## Phase 1
- [ ] T001 First task
- [ ] T002 Second task
- [ ] T003 Third task

## Phase 2
- [ ] T004 Fourth task
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      await progressReporter.updateTasksFile('005', 'T002', 'completed');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenContent = writeCall[1];

      // Should preserve structure
      expect(writtenContent).toContain('# Tasks');
      expect(writtenContent).toContain('## Phase 1');
      expect(writtenContent).toContain('## Phase 2');
      expect(writtenContent).toContain('- [ ] T001 First task');
      expect(writtenContent).toContain('- [X] T002 Second task');
      expect(writtenContent).toContain('- [ ] T003 Third task');
    });

    it('should handle missing tasks.md file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: file not found'));

      await expect(
        progressReporter.updateTasksFile('005', 'T001', 'completed')
      ).rejects.toThrow('file not found');
    });

    it('should handle tasks with various formats', async () => {
      const tasksContent = `
- [ ] T001 [US1] Task with user story
- [ ] T002 [P] Task with parallel marker
- [ ] T003 [US1] [P] Task with both
- [ ] T004 Simple task
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      await progressReporter.updateTasksFile('005', 'T002', 'completed');

      const writtenContent = mockFs.writeFile.mock.calls[0][1];
      expect(writtenContent).toContain('- [X] T002 [P]');
    });
  });

  // ============================================================================
  // T046-T047: saveSession()
  // ============================================================================

  describe('T046-T047: saveSession', () => {
    let mockSession: AutonomousSession;

    beforeEach(() => {
      mockSession = {
        sessionId: 'session-123',
        specId: '005-autonomous-claude-driver',
        startedAt: new Date().toISOString(),
        pausedAt: null,
        resumedAt: null,
        completedAt: null,
        status: 'running',
        terminals: [],
        totalTasks: 10,
        completedTasks: ['T001', 'T002'],
        currentTask: 'T003',
        failedTasks: [],
        tokenCount: 5000,
        contextSwitches: 0,
        events: [],
        errorHistory: [],
        questionHistory: [],
        options: {
          enableParallelTester: false,
          showTerminals: true,
          notificationChannel: 'vscode',
          whatsappPhoneNumber: null,
          emailAddress: null,
          maxRetries: 3,
          tokenWarningThreshold: 150000,
          tokenActionThreshold: 180000,
          questionTimeout: 300000,
          runFinalValidation: true,
          validateConstitution: true,
        },
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should save session to disk as JSON', async () => {
      await progressReporter.saveSession(mockSession);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('session-123.json'),
        expect.any(String),
        'utf-8'
      );

      // Verify JSON format
      const writeCall = mockFs.writeFile.mock.calls[0];
      const jsonContent = writeCall[1];
      const parsed = JSON.parse(jsonContent);

      expect(parsed.sessionId).toBe('session-123');
      expect(parsed.specId).toBe('005-autonomous-claude-driver');
      expect(parsed.status).toBe('running');
    });

    it('should save to .specify/state/sessions/ directory', async () => {
      await progressReporter.saveSession(mockSession);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const filePath = writeCall[0];

      expect(filePath).toContain('.specify/state/sessions/');
      expect(filePath).toContain('session-123.json');
    });

    it('should create directory if not exists', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);

      await progressReporter.saveSession(mockSession);

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.specify/state/sessions'),
        { recursive: true }
      );
    });

    it('should use atomic write with temp file', async () => {
      await progressReporter.saveSession(mockSession);

      // Should write to temp file first
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\.tmp$/),
        expect.any(String),
        'utf-8'
      );
    });

    it('should preserve all session fields', async () => {
      mockSession.pausedAt = new Date().toISOString();
      mockSession.failedTasks.push({
        taskId: 'T005',
        error: 'Test failure',
        timestamp: new Date().toISOString(),
        recoveryAttempts: 2,
      });
      mockSession.tokenCount = 150000;
      mockSession.contextSwitches = 3;

      await progressReporter.saveSession(mockSession);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const jsonContent = writeCall[1];
      const parsed = JSON.parse(jsonContent);

      expect(parsed.pausedAt).toBeDefined();
      expect(parsed.failedTasks.length).toBe(1);
      expect(parsed.tokenCount).toBe(150000);
      expect(parsed.contextSwitches).toBe(3);
    });

    it('should handle save errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(
        progressReporter.saveSession(mockSession)
      ).rejects.toThrow('Disk full');
    });

    it('should save within 200ms (performance requirement)', async () => {
      const startTime = Date.now();
      await progressReporter.saveSession(mockSession);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });
  });

  // ============================================================================
  // T048-T049: resumeSession()
  // ============================================================================

  describe('T048-T049: resumeSession', () => {
    let savedSession: AutonomousSession;

    beforeEach(() => {
      savedSession = {
        sessionId: 'session-456',
        specId: '005-autonomous-claude-driver',
        startedAt: '2025-01-15T10:00:00Z',
        pausedAt: '2025-01-15T10:30:00Z',
        resumedAt: null,
        completedAt: null,
        status: 'paused',
        terminals: [],
        totalTasks: 10,
        completedTasks: ['T001', 'T002', 'T003'],
        currentTask: 'T004',
        failedTasks: [],
        tokenCount: 8000,
        contextSwitches: 1,
        events: [],
        errorHistory: [],
        questionHistory: [],
        options: {
          enableParallelTester: false,
          showTerminals: true,
          notificationChannel: 'vscode',
          whatsappPhoneNumber: null,
          emailAddress: null,
          maxRetries: 3,
          tokenWarningThreshold: 150000,
          tokenActionThreshold: 180000,
          questionTimeout: 300000,
          runFinalValidation: true,
          validateConstitution: true,
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(savedSession));
    });

    it('should load session from disk', async () => {
      const session = await progressReporter.resumeSession('session-456');

      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('session-456.json'),
        'utf-8'
      );

      expect(session.sessionId).toBe('session-456');
      expect(session.status).toBe('paused');
      expect(session.completedTasks.length).toBe(3);
    });

    it('should validate required session fields', async () => {
      const invalidSession = { ...savedSession };
      delete (invalidSession as any).sessionId;

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidSession));

      await expect(
        progressReporter.resumeSession('session-456')
      ).rejects.toThrow('Invalid session data: missing sessionId');
    });

    it('should validate session status is resumable', async () => {
      savedSession.status = 'completed';
      mockFs.readFile.mockResolvedValue(JSON.stringify(savedSession));

      await expect(
        progressReporter.resumeSession('session-456')
      ).rejects.toThrow('Cannot resume completed session');
    });

    it('should validate specId exists', async () => {
      delete (savedSession as any).specId;
      mockFs.readFile.mockResolvedValue(JSON.stringify(savedSession));

      await expect(
        progressReporter.resumeSession('session-456')
      ).rejects.toThrow('Invalid session data: missing specId');
    });

    it('should validate arrays are not corrupted', async () => {
      (savedSession as any).completedTasks = 'not-an-array';
      mockFs.readFile.mockResolvedValue(JSON.stringify(savedSession));

      await expect(
        progressReporter.resumeSession('session-456')
      ).rejects.toThrow('Invalid session data: completedTasks must be an array');
    });

    it('should handle missing session file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: file not found'));

      await expect(
        progressReporter.resumeSession('session-456')
      ).rejects.toThrow('file not found');
    });

    it('should handle corrupted JSON', async () => {
      mockFs.readFile.mockResolvedValue('{ invalid json }');

      await expect(
        progressReporter.resumeSession('session-456')
      ).rejects.toThrow();
    });

    it('should restore all session state', async () => {
      const session = await progressReporter.resumeSession('session-456');

      expect(session.totalTasks).toBe(10);
      expect(session.completedTasks).toEqual(['T001', 'T002', 'T003']);
      expect(session.currentTask).toBe('T004');
      expect(session.tokenCount).toBe(8000);
      expect(session.contextSwitches).toBe(1);
    });
  });

  // ============================================================================
  // T050-T051: updateStatusBar()
  // ============================================================================

  describe('T050-T051: updateStatusBar', () => {
    let mockProgressUpdate: ProgressUpdate;

    beforeEach(() => {
      mockProgressUpdate = {
        sessionId: 'session-789',
        timestamp: new Date().toISOString(),
        tasksCompleted: 5,
        tasksTotal: 20,
        percentComplete: 25,
        estimatedTimeRemaining: 3600000, // 1 hour in ms
        currentTask: 'T006',
        currentTerminal: 'term-engineer',
        currentAction: 'Running tests',
        testsRun: 15,
        testsPassed: 14,
        testsFailed: 1,
        elapsedTime: 1800000, // 30 minutes
        tokensUsed: 50000,
        contextSwitches: 2,
      };
    });

    it('should update status bar text with progress', async () => {
      await progressReporter.updateStatusBar(mockProgressUpdate);

      expect(mockStatusBarItem.text).toContain('5/20');
      expect(mockStatusBarItem.text).toContain('25%');
    });

    it('should show current task in status bar', async () => {
      await progressReporter.updateStatusBar(mockProgressUpdate);

      expect(mockStatusBarItem.text).toContain('T006');
    });

    it('should show test results in tooltip', async () => {
      await progressReporter.updateStatusBar(mockProgressUpdate);

      expect(mockStatusBarItem.tooltip).toContain('Tests: 14 passed, 1 failed');
    });

    it('should show elapsed time in tooltip', async () => {
      await progressReporter.updateStatusBar(mockProgressUpdate);

      expect(mockStatusBarItem.tooltip).toContain('30m'); // 30 minutes
    });

    it('should show token usage in tooltip', async () => {
      await progressReporter.updateStatusBar(mockProgressUpdate);

      expect(mockStatusBarItem.tooltip).toContain('50,000 tokens');
    });

    it('should show estimated time remaining', async () => {
      await progressReporter.updateStatusBar(mockProgressUpdate);

      expect(mockStatusBarItem.tooltip).toContain('~1h remaining');
    });

    it('should handle null estimated time', async () => {
      mockProgressUpdate.estimatedTimeRemaining = null;

      await progressReporter.updateStatusBar(mockProgressUpdate);

      expect(mockStatusBarItem.tooltip).not.toContain('remaining');
    });

    it('should show status bar item', async () => {
      await progressReporter.updateStatusBar(mockProgressUpdate);

      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should update within 50ms (performance requirement)', async () => {
      const startTime = Date.now();
      await progressReporter.updateStatusBar(mockProgressUpdate);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });

    it('should show warning color when tests fail', async () => {
      mockProgressUpdate.testsFailed = 5;

      await progressReporter.updateStatusBar(mockProgressUpdate);

      expect(mockStatusBarItem.text).toContain('$(warning)');
    });

    it('should show success color when all tests pass', async () => {
      mockProgressUpdate.testsFailed = 0;

      await progressReporter.updateStatusBar(mockProgressUpdate);

      expect(mockStatusBarItem.text).toContain('$(pass)');
    });

    it('should handle high token usage warning', async () => {
      mockProgressUpdate.tokensUsed = 160000; // Above warning threshold

      await progressReporter.updateStatusBar(mockProgressUpdate);

      expect(mockStatusBarItem.tooltip).toContain('⚠️');
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration: Full Session Flow', () => {
    it('should handle complete session lifecycle', async () => {
      // Create session
      const session: AutonomousSession = {
        sessionId: 'integration-test',
        specId: '005',
        startedAt: new Date().toISOString(),
        pausedAt: null,
        resumedAt: null,
        completedAt: null,
        status: 'running',
        terminals: [],
        totalTasks: 5,
        completedTasks: [],
        currentTask: 'T001',
        failedTasks: [],
        tokenCount: 0,
        contextSwitches: 0,
        events: [],
        errorHistory: [],
        questionHistory: [],
        options: {
          enableParallelTester: false,
          showTerminals: true,
          notificationChannel: 'vscode',
          whatsappPhoneNumber: null,
          emailAddress: null,
          maxRetries: 3,
          tokenWarningThreshold: 150000,
          tokenActionThreshold: 180000,
          questionTimeout: 300000,
          runFinalValidation: true,
          validateConstitution: true,
        },
      };

      // Save initial state
      mockFs.readFile.mockResolvedValue(JSON.stringify(session));
      await progressReporter.saveSession(session);
      expect(mockFs.writeFile).toHaveBeenCalled();

      // Update task to in-progress
      await progressReporter.updateTaskStatus('005', 'T001', 'in_progress');
      expect(mockProgressProvider.updateTaskStatus).toHaveBeenCalledWith(
        '005',
        'T001',
        'in_progress'
      );

      // Complete task
      await progressReporter.updateTaskStatus('005', 'T001', 'completed');

      // Update session with completed task
      session.completedTasks.push('T001');
      session.currentTask = 'T002';
      await progressReporter.saveSession(session);

      // Mock the saved session for resume
      mockFs.readFile.mockResolvedValue(JSON.stringify(session));

      // Resume session
      const resumedSession = await progressReporter.resumeSession('integration-test');
      expect(resumedSession.completedTasks).toContain('T001');
    });
  });
});
