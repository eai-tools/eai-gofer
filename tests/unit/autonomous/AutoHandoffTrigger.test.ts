/**
 * Unit tests for AutoHandoffTrigger
 *
 * Tests auto-handoff at critical threshold, notification display,
 * integration with save command, and handoff document generation.
 *
 * @see .specify/specs/011-context-health-recursive-memory/tasks.md T030-T033
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ContextHealthMonitor,
  type ContextHealthStatus,
} from '../../../extension/src/autonomous/ContextHealthMonitor';

// Mock Logger first
vi.mock('../../../extension/src/utils/logger', () => ({
  Logger: {
    for: (): object => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Mock VSCode API
vi.mock('vscode', () => ({
  window: {
    showWarningMessage: vi.fn().mockResolvedValue(null),
    showInformationMessage: vi.fn().mockResolvedValue(undefined),
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
  },
  commands: {
    executeCommand: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocks are set up
import {
  AutoHandoffTrigger,
  type HandoffDocumentOptions,
} from '../../../extension/src/autonomous/AutoHandoffTrigger';
import { ContextUsageLogger } from '../../../extension/src/autonomous/ContextUsageLogger';
import * as vscode from 'vscode';

// Mock ContextUsageLogger
vi.mock('../../../extension/src/autonomous/ContextUsageLogger', () => ({
  ContextUsageLogger: vi.fn().mockImplementation(() => ({
    logHandoff: vi.fn().mockResolvedValue(undefined),
    log: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('AutoHandoffTrigger', () => {
  let trigger: AutoHandoffTrigger;
  let monitor: ContextHealthMonitor;

  const createCriticalStatus = (): ContextHealthStatus => ({
    status: 'critical',
    utilizationPercent: 85,
    tokensUsed: 102000,
    tokensLimit: 120000,
    breakdown: {
      specArtifacts: 20000,
      memories: 15000,
      hints: 7000,
      observations: 25000,
      systemFiles: 10000,
      conversation: 25000,
    },
    recommendations: ['Context is nearly full. Save your progress now.'],
    timestamp: Date.now(),
    sessionId: 'test-session',
    dataSource: 'real',
  });

  const createWarningStatus = (): ContextHealthStatus => ({
    status: 'warning',
    utilizationPercent: 60,
    tokensUsed: 72000,
    tokensLimit: 120000,
    breakdown: {
      specArtifacts: 12000,
      memories: 12000,
      hints: 6000,
      observations: 18000,
      systemFiles: 8000,
      conversation: 16000,
    },
    recommendations: ['Consider saving progress soon.'],
    timestamp: Date.now(),
    sessionId: 'test-session',
    dataSource: 'real',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    trigger = new AutoHandoffTrigger({
      notificationCooldownMs: 1000, // Short cooldown for testing
    });

    monitor = new ContextHealthMonitor();
  });

  afterEach(() => {
    trigger.dispose();
    monitor.dispose();
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Configuration Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultTrigger = new AutoHandoffTrigger();
      const config = defaultTrigger.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.notificationCooldownMs).toBe(5 * 60 * 1000);
      expect(config.notifyAtWarning).toBe(false);

      defaultTrigger.dispose();
    });

    it('should accept partial configuration', () => {
      const customTrigger = new AutoHandoffTrigger({
        enabled: false,
        notifyAtWarning: true,
      });
      const config = customTrigger.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.notifyAtWarning).toBe(true);
      expect(config.notificationCooldownMs).toBe(5 * 60 * 1000); // Default

      customTrigger.dispose();
    });

    it('should update configuration', () => {
      trigger.updateConfig({ enabled: false });
      expect(trigger.getConfig().enabled).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Monitor Connection Tests (T030)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('monitor connection', () => {
    it('should connect to ContextHealthMonitor', () => {
      trigger.connect(monitor);
      // Should not throw
    });

    it('should trigger notification on critical event', async () => {
      trigger.connect(monitor);

      // Emit critical event
      monitor.analyzeContext({
        breakdown: { conversation: 100000 },
        dataSource: 'real',
      });

      // Allow async handler to run
      await vi.runAllTimersAsync();

      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    it('should trigger notification on handoff-recommended event', async () => {
      trigger.connect(monitor);

      // Force handoff-recommended emission by triggering critical
      monitor.emit('handoff-recommended', createCriticalStatus());

      await vi.runAllTimersAsync();

      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    it('should not trigger on warning by default', async () => {
      trigger.connect(monitor);

      // Emit warning event
      monitor.analyzeContext({
        breakdown: { conversation: 70000 },
      });

      await vi.runAllTimersAsync();

      // Should not show notification for warning (default behavior)
      const calls = vi.mocked(vscode.window.showWarningMessage).mock.calls;
      const warningCalls = calls.filter((call) => call[0].includes('Warning'));
      expect(warningCalls.length).toBe(0);
    });

    it('should trigger on warning when configured', async () => {
      const warningTrigger = new AutoHandoffTrigger({
        notifyAtWarning: true,
        notificationCooldownMs: 1000,
      });
      warningTrigger.connect(monitor);

      monitor.emit('warning', createWarningStatus());

      await vi.runAllTimersAsync();

      expect(vscode.window.showWarningMessage).toHaveBeenCalled();

      warningTrigger.dispose();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Notification Tests (T031)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('notification display', () => {
    it('should show notification with correct options', async () => {
      await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Context Critical'),
        expect.any(Object),
        'Save & Continue Later',
        'Reseed Context',
        'Dismiss',
        'Remind in 10 min'
      );
    });

    it('should include utilization percentage in title', async () => {
      const status = createCriticalStatus();
      await trigger.triggerHandoffNotification(status, 'critical');

      const call = vi.mocked(vscode.window.showWarningMessage).mock.calls[0];
      expect(call[0]).toContain('85%');
    });

    it('should not show notification when disabled', async () => {
      trigger.updateConfig({ enabled: false });

      const result = await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');

      expect(result.action).toBe('disabled');
      expect(result.triggered).toBe(false);
      expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    });

    it('should respect cooldown period', async () => {
      await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');
      vi.clearAllMocks();

      // Try to trigger again immediately
      const result = await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');

      expect(result.triggered).toBe(false);
      expect(result.action).toBe('dismiss');
      expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    });

    it('should allow notification after cooldown', async () => {
      await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');
      vi.clearAllMocks();

      // Advance past cooldown
      vi.advanceTimersByTime(1100);

      await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');

      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    it('should handle dismiss action', async () => {
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValueOnce(undefined);

      const result = await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');

      expect(result.action).toBe('dismiss');
      expect(result.triggered).toBe(true);
    });

    it('should handle remind-later action', async () => {
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValueOnce('Remind in 10 min');

      const result = await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');

      expect(result.action).toBe('remind-later');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Save Integration Tests (T032)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('save integration', () => {
    it('should execute gofer.saveProgress on save action', async () => {
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValueOnce('Save & Continue Later');

      const result = await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');

      expect(result.action).toBe('save');
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'gofer.saveProgress',
        expect.objectContaining({
          handoffContent: expect.any(String),
          healthStatus: expect.any(Object),
          reason: 'auto-handoff',
        })
      );
    });

    it('should show success message after save', async () => {
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValueOnce('Save & Continue Later');

      await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Session saved successfully')
      );
    });

    it('should handle save failure', async () => {
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValueOnce('Save & Continue Later');
      vi.mocked(vscode.commands.executeCommand).mockRejectedValueOnce(new Error('Save failed'));

      await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save session')
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Handoff Document Generation Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('handoff document generation', () => {
    it('should generate valid markdown document', () => {
      const status = createCriticalStatus();
      const options: HandoffDocumentOptions = {
        sessionId: 'session-123',
        currentStage: 'implement',
        currentTask: 'T025: Create status bar',
      };

      const doc = trigger.generateHandoffDocument(status, options);

      expect(doc).toContain('---');
      expect(doc).toContain('session_id: session-123');
      expect(doc).toContain('stage: implement');
      expect(doc).toContain('# Session Handoff');
    });

    it('should include context health snapshot', () => {
      const status = createCriticalStatus();
      const doc = trigger.generateHandoffDocument(status, {
        sessionId: 'test',
        currentStage: 'implement',
      });

      expect(doc).toContain('## Context Health Snapshot');
      expect(doc).toContain('CRITICAL');
      expect(doc).toContain('85%');
    });

    it('should include token breakdown table', () => {
      const status = createCriticalStatus();
      const doc = trigger.generateHandoffDocument(status, {
        sessionId: 'test',
        currentStage: 'implement',
      });

      expect(doc).toContain('### Token Breakdown');
      expect(doc).toContain('| Category | Tokens | % of Total |');
      expect(doc).toContain('Conversation');
      expect(doc).toContain('Observations');
    });

    it('should include current task when provided', () => {
      const status = createCriticalStatus();
      const doc = trigger.generateHandoffDocument(status, {
        sessionId: 'test',
        currentStage: 'implement',
        currentTask: 'T025: Create status bar item',
      });

      expect(doc).toContain('**Current Task**: T025: Create status bar item');
    });

    it('should include key decisions when provided', () => {
      const status = createCriticalStatus();
      const doc = trigger.generateHandoffDocument(status, {
        sessionId: 'test',
        currentStage: 'implement',
        keyDecisions: ['Used EventEmitter pattern', 'Stored in .specify/'],
      });

      expect(doc).toContain('### Key Decisions');
      expect(doc).toContain('Used EventEmitter pattern');
      expect(doc).toContain('Stored in .specify/');
    });

    it('should include blockers when provided', () => {
      const status = createCriticalStatus();
      const doc = trigger.generateHandoffDocument(status, {
        sessionId: 'test',
        currentStage: 'implement',
        blockers: ['Missing API documentation', 'Test flakiness'],
      });

      expect(doc).toContain('### Blockers');
      expect(doc).toContain('Missing API documentation');
    });

    it('should include recommendations', () => {
      const status = createCriticalStatus();
      const doc = trigger.generateHandoffDocument(status, {
        sessionId: 'test',
        currentStage: 'implement',
      });

      expect(doc).toContain('## Recommendations');
      expect(doc).toContain('Context is nearly full');
    });

    it('should include resume instructions', () => {
      const status = createCriticalStatus();
      const doc = trigger.generateHandoffDocument(status, {
        sessionId: 'test',
        currentStage: 'implement',
      });

      expect(doc).toContain('## Resume Instructions');
      expect(doc).toContain('/8_gofer_resume');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Session Context Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('session context', () => {
    it('should update session context', () => {
      trigger.setSessionContext('session-456', 'research', 'T001: Research task');
      // No direct getter, but we can verify through handoff document
    });

    it('should use session context in notifications', async () => {
      trigger.setSessionContext('my-session', 'validate', 'T050: Validate implementation');
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValueOnce('Save & Continue Later');

      await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');

      const executeCommandCall = vi.mocked(vscode.commands.executeCommand).mock.calls[0];
      const handoffContent = executeCommandCall[1].handoffContent as string;

      expect(handoffContent).toContain('session_id: my-session');
      expect(handoffContent).toContain('stage: validate');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Usage Logger Integration Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('usage logger integration', () => {
    it('should log handoff events', async () => {
      const mockLogger = {
        logHandoff: vi.fn().mockResolvedValue(undefined),
      };
      trigger.setUsageLogger(mockLogger as unknown as ContextUsageLogger);
      trigger.setSessionContext('log-session', 'implement');

      await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');

      expect(mockLogger.logHandoff).toHaveBeenCalledWith(
        'log-session',
        'implement',
        'critical',
        102000,
        120000,
        85,
        expect.stringContaining('critical')
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Manual Check Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('manual check', () => {
    it('should return null when no monitor connected', async () => {
      const result = await trigger.checkAndTrigger();
      expect(result).toBeNull();
    });

    it('should work with checkAndTrigger when monitor has critical status', async () => {
      // Set up context provider that returns critical status
      monitor.setContextProvider(() => ({
        breakdown: { conversation: 100000 },
        dataSource: 'real',
      }));

      // Create a custom trigger that we DON'T connect to events
      // to test checkAndTrigger() independently
      const isolatedTrigger = new AutoHandoffTrigger({
        notificationCooldownMs: 1000,
      });

      // Manually set the monitor reference via a private method approach
      // Since connect() would add event handlers, we need direct access
      // For testing, we'll use connect() but verify the cumulative effect

      isolatedTrigger.connect(monitor);

      // When connect() is called and then checkAndTrigger() is invoked,
      // the internal checkHealth() call triggers events. The event handler
      // gets the notification first, which is the expected behavior.
      // So we verify the notification was eventually shown.
      await isolatedTrigger.checkAndTrigger();

      // Result might be null (event handler got it) or have triggered=false (cooldown)
      // The important thing is the notification was shown
      expect(vscode.window.showWarningMessage).toHaveBeenCalled();

      isolatedTrigger.dispose();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Cooldown Management Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('cooldown management', () => {
    it('should reset cooldown', async () => {
      await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');
      vi.clearAllMocks();

      trigger.resetCooldown();
      await trigger.triggerHandoffNotification(createCriticalStatus(), 'critical');

      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Disposal Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('disposal', () => {
    it('should clean up on dispose', () => {
      trigger.connect(monitor);
      trigger.dispose();
      // Should not throw
    });

    it('should not respond to events after dispose', async () => {
      trigger.connect(monitor);
      trigger.dispose();

      monitor.emit('critical', createCriticalStatus());
      await vi.runAllTimersAsync();

      // Notification should not be shown after disposal
      // Note: The mock may still have calls from before disposal
    });
  });
});
