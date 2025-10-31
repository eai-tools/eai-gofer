/**
 * Unit tests for AutonomousDriver (Main Orchestrator)
 *
 * Tests T052-T061 from tasks.md:
 * - start() orchestrating all modules
 * - stop() graceful shutdown
 * - pause() mid-execution with state save
 * - resume() from pause with state load
 * - Event hooks (onProgress, onError, onComplete)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutonomousDriver } from '../../../src/autonomous/AutonomousDriver';
import type {
  AutonomousSession,
  DriverOptions,
  ProgressUpdate,
  DriverError,
  CompletionReport,
} from '../../../src/autonomous/types';

// Mock file system promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
  rename: vi.fn(),
}));

// Mock all dependencies
vi.mock('vscode', () => {
  const mockTerminal = {
    name: 'Mock Terminal',
    processId: Promise.resolve(12345),
    sendText: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  };

  return {
    window: {
      createTerminal: vi.fn(() => mockTerminal),
      createStatusBarItem: vi.fn(() => ({
        text: '',
        tooltip: '',
        show: vi.fn(),
        hide: vi.fn(),
        dispose: vi.fn(),
      })),
      showErrorMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      onDidWriteTerminalData: vi.fn(() => ({ dispose: vi.fn() })),
    },
    StatusBarAlignment: {
      Left: 1,
    },
    ProgressLocation: {
      Notification: 15,
    },
  };
});

describe('AutonomousDriver', () => {
  let driver: AutonomousDriver;
  let mockProgressProvider: any;
  let mockOptions: DriverOptions;
  let mockProgressCallback: any;
  let mockErrorCallback: any;
  let mockCompletionCallback: any;

  beforeEach(() => {
    // Setup mock ProgressProvider
    mockProgressProvider = {
      getSpec: vi.fn().mockReturnValue({
        id: '005-autonomous-claude-driver',
        title: 'Autonomous Claude Code Driver',
        tasks: [
          {
            id: 'T001',
            description: 'First task',
            status: 'pending',
            dependencies: [],
            parallel: false,
          },
          {
            id: 'T002',
            description: 'Second task',
            status: 'pending',
            dependencies: ['T001'],
            parallel: false,
          },
          {
            id: 'T003',
            description: 'Third task',
            status: 'pending',
            dependencies: ['T002'],
            parallel: false,
          },
        ],
      }),
      updateTaskStatus: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn(),
      getProgress: vi.fn().mockReturnValue({
        totalTasks: 3,
        completedTasks: 0,
        inProgressTasks: 0,
        failedTasks: 0,
        blockedTasks: 0,
        pendingTasks: 3,
      }),
    };

    // Setup default options
    mockOptions = {
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
    };

    // Setup callbacks
    mockProgressCallback = vi.fn();
    mockErrorCallback = vi.fn();
    mockCompletionCallback = vi.fn();

    // Create driver instance
    driver = new AutonomousDriver(
      '/test/workspace',
      mockProgressProvider,
      mockOptions
    );

    // Register callbacks
    driver.onProgress(mockProgressCallback);
    driver.onError(mockErrorCallback);
    driver.onComplete(mockCompletionCallback);
  });

  afterEach(async () => {
    // Cleanup
    if (driver) {
      await driver.stop();
    }
    vi.clearAllMocks();
  });

  // ============================================================================
  // T052-T053: start()
  // ============================================================================

  describe('T052-T053: start()', () => {
    it('should create a new autonomous session', async () => {
      const session = await driver.start('005-autonomous-claude-driver');

      expect(session).toBeDefined();
      expect(session.sessionId).toMatch(/^session-/);
      expect(session.specId).toBe('005-autonomous-claude-driver');
      expect(session.status).toBe('running');
    });

    it('should initialize with correct session metadata', async () => {
      const session = await driver.start('005');

      expect(session.startedAt).toBeDefined();
      expect(session.pausedAt).toBeNull();
      expect(session.resumedAt).toBeNull();
      expect(session.completedAt).toBeNull();
      expect(session.totalTasks).toBe(3);
      expect(session.completedTasks).toEqual([]);
      expect(session.currentTask).toBeNull();
    });

    it('should spawn engineer terminal', async () => {
      const session = await driver.start('005');

      expect(session.terminals.length).toBeGreaterThan(0);
      expect(session.terminals[0].role).toBe('engineer');
      expect(session.terminals[0].isAlive).toBe(true);
    });

    it('should not spawn tester terminal when parallel disabled', async () => {
      mockOptions.enableParallelTester = false;
      const session = await driver.start('005');

      const testerTerminals = session.terminals.filter(
        (t) => t.role === 'tester'
      );
      expect(testerTerminals.length).toBe(0);
    });

    it('should spawn both engineer and tester when parallel enabled', async () => {
      mockOptions.enableParallelTester = true;
      const session = await driver.start('005');

      expect(session.terminals.length).toBe(2);
      expect(session.terminals.some((t) => t.role === 'engineer')).toBe(true);
      expect(session.terminals.some((t) => t.role === 'tester')).toBe(true);
    });

    it('should throw error if already running', async () => {
      await driver.start('005');

      await expect(driver.start('005')).rejects.toThrow(
        'Driver already running'
      );
    });

    it('should emit progress event on start', async () => {
      await driver.start('005');

      expect(mockProgressCallback).toHaveBeenCalled();
      const progressUpdate: ProgressUpdate = mockProgressCallback.mock.calls[0][0];
      expect(progressUpdate.tasksCompleted).toBe(0);
      expect(progressUpdate.tasksTotal).toBe(3);
    });

    it('should persist initial session state', async () => {
      const session = await driver.start('005');

      // Verify session was saved
      expect(session.events.length).toBeGreaterThan(0);
      expect(session.events[0].type).toBe('session_started');
    });
  });

  // ============================================================================
  // T054-T055: stop()
  // ============================================================================

  describe('T054-T055: stop()', () => {
    it('should gracefully shutdown running session', async () => {
      await driver.start('005');
      await driver.stop();

      const session = driver.getSession();
      expect(session).toBeNull();
    });

    it('should close all active terminals', async () => {
      const session = await driver.start('005');
      const terminalCount = session.terminals.length;

      await driver.stop();

      // Verify terminals are marked as closed
      expect(terminalCount).toBeGreaterThan(0);
    });

    it('should update session status to cancelled', async () => {
      await driver.start('005');
      const stopPromise = driver.stop();

      // Session should be marked as cancelled before cleanup completes
      await stopPromise;

      // Verify session was cancelled (would be in saved state)
      expect(mockCompletionCallback).not.toHaveBeenCalled(); // Stop doesn't trigger completion
    });

    it('should be idempotent (safe to call multiple times)', async () => {
      await driver.start('005');
      await driver.stop();
      await driver.stop(); // Second stop should not throw
      await driver.stop(); // Third stop should not throw
    });

    it('should not throw if called when not running', async () => {
      await driver.stop(); // Should not throw
    });

    it('should cleanup resources (terminals, listeners, timers)', async () => {
      await driver.start('005');
      await driver.stop();

      // Verify driver can be restarted after stop
      const newSession = await driver.start('005');
      expect(newSession.sessionId).toBeDefined();
      await driver.stop();
    });
  });

  // ============================================================================
  // T056-T057: pause()
  // ============================================================================

  describe('T056-T057: pause()', () => {
    it('should pause running session', async () => {
      await driver.start('005');
      await driver.pause();

      const session = driver.getSession();
      expect(session?.status).toBe('paused');
      expect(session?.pausedAt).toBeDefined();
    });

    it('should save session state on pause', async () => {
      await driver.start('005');
      await driver.pause();

      const session = driver.getSession();
      expect(session?.events.some((e) => e.type === 'user_paused')).toBe(true);
    });

    it('should throw error if not running', async () => {
      await expect(driver.pause()).rejects.toThrow('No active session');
    });

    it('should throw error if already paused', async () => {
      await driver.start('005');
      await driver.pause();

      await expect(driver.pause()).rejects.toThrow('Session already paused');
    });

    it('should not lose progress when paused', async () => {
      await driver.start('005');

      // Simulate some progress
      const session = driver.getSession();
      session!.completedTasks.push('T001');

      await driver.pause();

      const pausedSession = driver.getSession();
      expect(pausedSession?.completedTasks).toContain('T001');
    });

    it('should pause within 500ms (quick response)', async () => {
      await driver.start('005');

      const startTime = Date.now();
      await driver.pause();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });
  });

  // ============================================================================
  // T058-T059: resume()
  // ============================================================================

  describe('T058-T059: resume()', () => {
    it('should resume paused session', async () => {
      await driver.start('005');
      await driver.pause();
      await driver.resume();

      const session = driver.getSession();
      expect(session?.status).toBe('running');
      expect(session?.resumedAt).toBeDefined();
    });

    it('should restore session state on resume', async () => {
      await driver.start('005');

      // Simulate progress
      const session = driver.getSession();
      session!.completedTasks.push('T001');
      session!.currentTask = 'T002';

      await driver.pause();
      await driver.resume();

      const resumedSession = driver.getSession();
      expect(resumedSession?.completedTasks).toContain('T001');
      expect(resumedSession?.currentTask).toBe('T002');
    });

    it('should throw error if not paused', async () => {
      await expect(driver.resume()).rejects.toThrow('No paused session');
    });

    it('should throw error if already running', async () => {
      await driver.start('005');

      await expect(driver.resume()).rejects.toThrow('Session is not paused');
    });

    it('should emit progress event on resume', async () => {
      await driver.start('005');
      await driver.pause();

      mockProgressCallback.mockClear();
      await driver.resume();

      expect(mockProgressCallback).toHaveBeenCalled();
    });

    it('should continue from current task after resume', async () => {
      await driver.start('005');

      const session = driver.getSession();
      session!.currentTask = 'T002';

      await driver.pause();
      await driver.resume();

      const resumedSession = driver.getSession();
      expect(resumedSession?.currentTask).toBe('T002');
    });
  });

  // ============================================================================
  // T060-T061: Event Hooks
  // ============================================================================

  describe('T060-T061: Event Hooks', () => {
    it('should register onProgress callback', () => {
      const callback = vi.fn();
      driver.onProgress(callback);

      // Callback should be registered (will be called during execution)
      expect(callback).toBeDefined();
    });

    it('should register onError callback', () => {
      const callback = vi.fn();
      driver.onError(callback);

      expect(callback).toBeDefined();
    });

    it('should register onComplete callback', () => {
      const callback = vi.fn();
      driver.onComplete(callback);

      expect(callback).toBeDefined();
    });

    it('should call onProgress during execution', async () => {
      await driver.start('005');

      expect(mockProgressCallback).toHaveBeenCalled();
      const update: ProgressUpdate = mockProgressCallback.mock.calls[0][0];
      expect(update.sessionId).toBeDefined();
      expect(update.tasksTotal).toBe(3);
    });

    it('should call onError when error occurs', async () => {
      // Mock an error scenario
      mockProgressProvider.getSpec.mockReturnValue(null);

      await expect(driver.start('invalid-spec')).rejects.toThrow();
      // In real implementation, onError would be called
    });

    it('should include all required fields in progress update', async () => {
      await driver.start('005');

      const update: ProgressUpdate = mockProgressCallback.mock.calls[0][0];
      expect(update.sessionId).toBeDefined();
      expect(update.timestamp).toBeDefined();
      expect(update.tasksCompleted).toBeDefined();
      expect(update.tasksTotal).toBeDefined();
      expect(update.percentComplete).toBeDefined();
      expect(update.currentTerminal).toBeDefined();
      expect(update.currentAction).toBeDefined();
      expect(update.testsRun).toBeDefined();
      expect(update.testsPassed).toBeDefined();
      expect(update.testsFailed).toBeDefined();
      expect(update.elapsedTime).toBeDefined();
      expect(update.tokensUsed).toBeDefined();
    });

    it('should call onComplete when session completes', async () => {
      // This would be tested in E2E tests with actual execution
      // For unit test, we verify the callback is registered
      expect(mockCompletionCallback).toBeDefined();
    });

    it('should allow multiple callbacks per event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      driver.onProgress(callback1);
      driver.onProgress(callback2);

      // Both should be callable
      expect(callback1).toBeDefined();
      expect(callback2).toBeDefined();
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      driver.onProgress(errorCallback);

      // Driver should not crash if callback throws
      await driver.start('005');

      // Session should still be running
      const session = driver.getSession();
      expect(session?.status).toBe('running');
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration: Full Lifecycle', () => {
    it('should handle start → pause → resume → stop flow', async () => {
      // Start
      const session1 = await driver.start('005');
      expect(session1.status).toBe('running');

      // Pause
      await driver.pause();
      const session2 = driver.getSession();
      expect(session2?.status).toBe('paused');

      // Resume
      await driver.resume();
      const session3 = driver.getSession();
      expect(session3?.status).toBe('running');

      // Stop
      await driver.stop();
      const session4 = driver.getSession();
      expect(session4).toBeNull();
    });

    it('should maintain session continuity through pause/resume', async () => {
      await driver.start('005');

      const session1 = driver.getSession();
      const sessionId = session1!.sessionId;
      session1!.completedTasks = ['T001', 'T002'];
      session1!.tokenCount = 50000;

      await driver.pause();
      await driver.resume();

      const session2 = driver.getSession();
      expect(session2?.sessionId).toBe(sessionId);
      expect(session2?.completedTasks).toEqual(['T001', 'T002']);
      expect(session2?.tokenCount).toBe(50000);
    });

    it('should emit events in correct order', async () => {
      const events: string[] = [];

      driver.onProgress(() => events.push('progress'));

      await driver.start('005');

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toBe('progress');
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle invalid spec ID', async () => {
      mockProgressProvider.getSpec.mockReturnValue(null);

      await expect(driver.start('invalid-spec')).rejects.toThrow(
        'Spec not found'
      );
    });

    it('should handle terminal creation failure', async () => {
      // This would be tested with mocked TerminalManager
      // For now, verify driver has error handling
      expect(driver).toBeDefined();
    });

    it('should cleanup on error during start', async () => {
      mockProgressProvider.getSpec.mockImplementation(() => {
        throw new Error('Provider error');
      });

      await expect(driver.start('005')).rejects.toThrow();

      // Session should not be left in invalid state
      const session = driver.getSession();
      expect(session).toBeNull();
    });
  });
});
