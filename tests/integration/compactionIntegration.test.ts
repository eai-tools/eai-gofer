/**
 * Integration Tests for Context Compaction Workflow
 *
 * Tests the complete compaction workflow:
 * - Trigger detection when context exceeds threshold
 * - Summarization of completed tasks
 * - Preservation of recent tasks
 * - Session state updates
 * - AutonomousDriver integration
 *
 * T164: Write integration test for compaction workflow (trigger, summarize, preserve)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import { ContextCompactor } from '../../extension/src/autonomous/ContextCompactor';
import type { Session, Task, CompactionStrategy } from '../../extension/src/autonomous/compaction';

// Unmock fs for this integration test (needs real file system)
vi.unmock('fs');
vi.unmock('fs/promises');

// Import fs after unmocking
import * as fs from 'fs';

describe('Context Compaction Integration Tests', () => {
  const testWorkspaceRoot = path.join(__dirname, 'test-workspace-compaction');
  let compactor: ContextCompactor;

  /**
   * Creates a mock session with configurable parameters
   */
  function createMockSession(options: {
    id?: string;
    taskCount?: number;
    contextSize?: number;
    status?: Session['status'];
  }): Session {
    const taskCount = options.taskCount ?? 20;
    const completedTasks = Array.from(
      { length: taskCount },
      (_, i) => `T${String(i + 1).padStart(3, '0')}`
    );

    return {
      id: options.id ?? `session-${Date.now()}`,
      specId: '001-test-spec',
      status: options.status ?? 'active',
      currentTask: `T${String(taskCount + 1).padStart(3, '0')}`,
      completedTasks,
      failedTasks: [],
      context: 'A'.repeat(options.contextSize ?? 100000),
      compactionHistory: [],
      startedAt: Date.now() - 3600000, // 1 hour ago
      lastUpdatedAt: Date.now(),
    };
  }

  /**
   * Creates detailed task objects with metadata
   */
  function createDetailedTasks(count: number): Task[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `T${String(i + 1).padStart(3, '0')}`,
      description: `Task ${i + 1}: Implement feature ${i + 1} with complex logic`,
      status: 'completed' as const,
      completedAt: Date.now() - (count - i) * 60000, // Spread over time
      affectedFiles: [`src/feature${i + 1}.ts`, `tests/feature${i + 1}.test.ts`],
    }));
  }

  beforeEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true });
    }
    fs.mkdirSync(testWorkspaceRoot, { recursive: true });

    compactor = new ContextCompactor(testWorkspaceRoot);
  });

  afterEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true });
    }
  });

  describe('Complete Compaction Workflow', () => {
    it('should detect, trigger, summarize, and preserve in sequence', async () => {
      // Step 1: Create session with large context (above 80% threshold)
      const session = createMockSession({
        taskCount: 30,
        contextSize: 700000, // 175k tokens (~87.5% of 200k)
      });

      // Step 2: Verify compaction is needed
      const shouldCompact = await compactor.shouldCompact(session);
      expect(shouldCompact).toBe(true);

      // Step 3: Analyze context before compaction
      const analysisBefore = await compactor.analyzeContext(session);
      expect(analysisBefore.usagePercentage).toBeGreaterThan(80);
      expect(analysisBefore.shouldCompact).toBe(true);

      // Step 4: Preview what will be compacted
      const preview = await compactor.previewCompaction(session);
      expect(preview.tasksToCompact.length).toBeGreaterThan(0);
      expect(preview.tasksToPreserve.length).toBe(10); // Default preserveLastN

      // Step 5: Perform compaction
      const result = await compactor.compact(session);

      // Step 6: Verify compaction results
      expect(result.tasksCompacted.length).toBe(20); // 30 - 10 preserved
      expect(result.preservedTasks.length).toBe(10);
      expect(result.summaryText).toBeDefined();
      expect(result.summaryText.length).toBeGreaterThan(0);
      expect(result.tokensSaved).toBeGreaterThan(0);

      // Step 7: Verify session was updated
      expect(session.compactionHistory.length).toBe(1);
      expect(session.compactionHistory[0]).toEqual(result);

      // Step 8: Verify context is now below threshold
      const shouldCompactAfter = await compactor.shouldCompact(session);
      expect(shouldCompactAfter).toBe(false);
    });

    it('should chain multiple compactions in long-running session', async () => {
      const session = createMockSession({
        id: 'long-running-session',
        taskCount: 25,
        contextSize: 650000, // Start at ~81% threshold
      });

      // First compaction
      await compactor.compact(session);
      expect(session.compactionHistory.length).toBe(1);

      // Simulate more work - add more tasks and context
      for (let i = 26; i <= 50; i++) {
        session.completedTasks.push(`T${String(i).padStart(3, '0')}`);
      }
      session.context = 'A'.repeat(680000); // Grow context again

      // Should need compaction again
      const needsSecondCompaction = await compactor.shouldCompact(session);
      expect(needsSecondCompaction).toBe(true);

      // Second compaction
      await compactor.compact(session);
      expect(session.compactionHistory.length).toBe(2);

      // Verify both compactions are recorded
      expect(session.compactionHistory[0].tasksCompacted.length).toBeGreaterThan(0);
      expect(session.compactionHistory[1].tasksCompacted.length).toBeGreaterThan(0);
    });

    it('should handle session with minimal tasks gracefully', async () => {
      const session = createMockSession({
        taskCount: 5, // Less than preserveLastN (10)
        contextSize: 700000,
      });

      const preview = await compactor.previewCompaction(session);

      // All tasks should be preserved since < preserveLastN
      expect(preview.tasksToPreserve.length).toBe(5);
      expect(preview.tasksToCompact.length).toBe(0);

      // Compaction should still work (but not compact any tasks)
      const result = await compactor.compact(session);
      expect(result.tasksCompacted.length).toBe(0);
      expect(result.preservedTasks.length).toBe(5);
    });
  });

  describe('Task Summarization Quality', () => {
    it('should include file information in summaries', async () => {
      const tasks = createDetailedTasks(15);
      const strategy = compactor.getDefaultStrategy();

      const summary = await compactor.summarizeTasks(tasks.slice(0, 10), strategy);

      // Summary should mention file modifications
      expect(summary).toContain('Files modified');
      expect(summary).toContain('Completed');
    });

    it('should handle mixed success/failure tasks', async () => {
      const tasks: Task[] = [
        { id: 'T001', description: 'Create API', status: 'completed', completedAt: Date.now() },
        { id: 'T002', description: 'Add auth', status: 'completed', completedAt: Date.now() },
        { id: 'T003', description: 'Broken task', status: 'failed', completedAt: Date.now() },
        { id: 'T004', description: 'Fixed task', status: 'completed', completedAt: Date.now() },
      ];

      const strategy = compactor.getDefaultStrategy();
      const summary = await compactor.summarizeTasks(tasks, strategy);

      // Summary should reflect both completed and failed
      expect(summary).toContain('Completed');
      expect(summary).toContain('failed');
    });

    it('should summarize large batches efficiently', async () => {
      const tasks = createDetailedTasks(50);
      const strategy = compactor.getDefaultStrategy();

      const startTime = Date.now();
      const summary = await compactor.summarizeTasks(tasks, strategy);
      const duration = Date.now() - startTime;

      // Should complete quickly
      expect(duration).toBeLessThan(1000); // Under 1 second
      expect(summary.length).toBeGreaterThan(0);
    });
  });

  describe('Context Analysis Accuracy', () => {
    it('should provide accurate usage breakdown', async () => {
      const session = createMockSession({
        taskCount: 20,
        contextSize: 400000, // 100k tokens = 50%
      });

      const analysis = await compactor.analyzeContext(session);

      expect(analysis.estimatedTokens).toBe(100000);
      expect(analysis.usagePercentage).toBe(50);
      expect(analysis.contextWindowSize).toBe(200000);
      expect(analysis.shouldCompact).toBe(false); // 50% < 80%

      // Breakdown should sum to roughly total
      const breakdown = analysis.breakdown;
      const breakdownTotal =
        breakdown.systemPrompt +
        breakdown.tasks +
        breakdown.completedWork +
        breakdown.errors +
        breakdown.memories +
        breakdown.hints +
        breakdown.other;

      // Allow some variance in estimation
      expect(breakdownTotal).toBeGreaterThan(analysis.estimatedTokens * 0.8);
      expect(breakdownTotal).toBeLessThan(analysis.estimatedTokens * 1.2);
    });

    it('should recommend compaction at exact threshold', async () => {
      // Test at exactly 80% threshold
      const session = createMockSession({
        taskCount: 20,
        contextSize: 640000, // 160k tokens = 80%
      });

      const analysis = await compactor.analyzeContext(session);

      expect(analysis.usagePercentage).toBe(80);
      expect(analysis.shouldCompact).toBe(true);
      expect(analysis.reason).toContain('exceeds threshold');
    });

    it('should not recommend compaction just below threshold', async () => {
      // Test just below 80% threshold
      const session = createMockSession({
        taskCount: 20,
        contextSize: 636000, // 159k tokens = 79.5%
      });

      const analysis = await compactor.analyzeContext(session);

      expect(analysis.usagePercentage).toBeLessThan(80);
      expect(analysis.shouldCompact).toBe(false);
      expect(analysis.reason).toContain('below threshold');
    });
  });

  describe('Backup and Recovery', () => {
    it('should create backup before compaction and restore on rollback', async () => {
      const session = createMockSession({
        id: 'backup-test-session',
        taskCount: 25,
        contextSize: 700000,
      });

      const originalContext = session.context;

      // Perform compaction (creates backup)
      await compactor.compact(session);

      // Verify context changed
      expect(session.context).not.toBe(originalContext);
      expect(session.compactionHistory.length).toBe(1);

      // Verify backup file exists
      const backupDir = path.join(testWorkspaceRoot, '.specify', 'state', 'sessions', 'backups');
      expect(fs.existsSync(backupDir)).toBe(true);

      const backups = fs.readdirSync(backupDir);
      const sessionBackups = backups.filter((f) => f.startsWith('backup-test-session'));
      expect(sessionBackups.length).toBeGreaterThan(0);

      // Rollback
      const rollbackSuccess = await compactor.rollbackCompaction(session);

      expect(rollbackSuccess).toBe(true);
      expect(session.context).toBe(originalContext);
      expect(session.compactionHistory.length).toBe(0);
    });

    it('should limit backup count to maxBackups', async () => {
      const customCompactor = new ContextCompactor(testWorkspaceRoot, {
        maxBackups: 3,
      });

      const session = createMockSession({
        id: 'max-backup-session',
        taskCount: 20,
        contextSize: 650000,
      });

      // Create multiple compactions to exceed maxBackups
      for (let i = 0; i < 5; i++) {
        session.context = 'A'.repeat(650000 + i * 10000);
        session.completedTasks.push(`EXTRA-T${i}`);
        await customCompactor.compact(session);

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Verify only maxBackups (3) are retained
      const backupDir = path.join(testWorkspaceRoot, '.specify', 'state', 'sessions', 'backups');
      const backups = fs.readdirSync(backupDir);
      const sessionBackups = backups.filter((f) => f.startsWith('max-backup-session'));

      expect(sessionBackups.length).toBeLessThanOrEqual(3);
    });

    it('should return false when no backup exists for rollback', async () => {
      const session = createMockSession({
        id: 'no-backup-session',
        taskCount: 10,
        contextSize: 100000,
      });

      // Try to rollback without ever compacting
      const rollbackSuccess = await compactor.rollbackCompaction(session);

      expect(rollbackSuccess).toBe(false);
    });
  });

  describe('Custom Strategy Application', () => {
    it('should respect preserveLastN override', async () => {
      const session = createMockSession({
        taskCount: 30,
        contextSize: 700000,
      });

      const customStrategy: Partial<CompactionStrategy> = {
        preserveLastN: 5,
      };

      const result = await compactor.compact(session, customStrategy);

      expect(result.preservedTasks.length).toBe(5);
      expect(result.tasksCompacted.length).toBe(25);
    });

    it('should use default strategy when none provided', async () => {
      const session = createMockSession({
        taskCount: 30,
        contextSize: 700000,
      });

      const defaultStrategy = compactor.getDefaultStrategy();
      const result = await compactor.compact(session);

      expect(result.preservedTasks.length).toBe(defaultStrategy.preserveLastN);
      expect(result.strategy.preserveLastN).toBe(defaultStrategy.preserveLastN);
    });

    it('should merge custom strategy with defaults', async () => {
      const session = createMockSession({
        taskCount: 30,
        contextSize: 700000,
      });

      const customStrategy: Partial<CompactionStrategy> = {
        targetReduction: 70, // Only override this
      };

      const result = await compactor.compact(session, customStrategy);

      // Custom value applied
      expect(result.strategy.targetReduction).toBe(70);

      // Defaults preserved
      const defaultStrategy = compactor.getDefaultStrategy();
      expect(result.strategy.preserveLastN).toBe(defaultStrategy.preserveLastN);
      expect(result.strategy.summarizeBatchSize).toBe(defaultStrategy.summarizeBatchSize);
    });
  });

  describe('Threshold Management', () => {
    it('should respect dynamically changed threshold', async () => {
      const session = createMockSession({
        taskCount: 20,
        contextSize: 500000, // 125k tokens = 62.5%
      });

      // With default 80% threshold, should not need compaction
      expect(await compactor.shouldCompact(session)).toBe(false);

      // Change to 60% threshold
      compactor.setThreshold(60);
      expect(compactor.getThreshold()).toBe(60);

      // Now should need compaction
      expect(await compactor.shouldCompact(session)).toBe(true);

      // Change back to 80%
      compactor.setThreshold(80);
      expect(await compactor.shouldCompact(session)).toBe(false);
    });

    it('should support emergency high threshold', async () => {
      const emergencyCompactor = new ContextCompactor(testWorkspaceRoot, {
        threshold: 0.95, // 95% emergency threshold
      });

      const session = createMockSession({
        taskCount: 30,
        contextSize: 760000, // 190k tokens = 95%
      });

      const shouldCompact = await emergencyCompactor.shouldCompact(session);
      expect(shouldCompact).toBe(true);

      const analysis = await emergencyCompactor.analyzeContext(session);
      expect(analysis.usagePercentage).toBe(95);
    });
  });

  describe('Performance Under Load', () => {
    it('should complete workflow for 100+ task session in <10s', async () => {
      const session = createMockSession({
        taskCount: 150,
        contextSize: 800000,
      });

      const startTime = Date.now();

      // Full workflow
      await compactor.shouldCompact(session);
      await compactor.analyzeContext(session);
      await compactor.previewCompaction(session);
      await compactor.compact(session);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000);
      expect(session.compactionHistory.length).toBe(1);
    });

    it('should handle very large context efficiently', async () => {
      const session = createMockSession({
        taskCount: 50,
        contextSize: 1600000, // 400k tokens - exceeds window significantly
      });

      const startTime = Date.now();
      const result = await compactor.compact(session);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(result.tokensSaved).toBeGreaterThan(0);
    });
  });

  describe('Session State Integrity', () => {
    it('should maintain session consistency after compaction', async () => {
      const session = createMockSession({
        id: 'integrity-test',
        taskCount: 30,
        contextSize: 700000,
        status: 'running',
      });

      const originalStartedAt = session.startedAt;
      const originalSpecId = session.specId;
      const originalStatus = session.status;

      await compactor.compact(session);

      // Core session properties should be unchanged
      expect(session.id).toBe('integrity-test');
      expect(session.specId).toBe(originalSpecId);
      expect(session.status).toBe(originalStatus);
      expect(session.startedAt).toBe(originalStartedAt);

      // Only context and history should change
      expect(session.compactionHistory.length).toBe(1);
      expect(session.context).not.toBe('A'.repeat(700000));
    });

    it('should preserve completed task list correctly', async () => {
      const session = createMockSession({
        taskCount: 25,
        contextSize: 700000,
      });

      const originalCompletedTasks = [...session.completedTasks];

      await compactor.compact(session);

      // Completed tasks list should be unchanged
      expect(session.completedTasks).toEqual(originalCompletedTasks);
      expect(session.completedTasks.length).toBe(25);
    });
  });
});
