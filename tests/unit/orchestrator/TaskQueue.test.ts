/**
 * Unit tests for TaskQueue
 * Task: T019
 *
 * Tests verify:
 * - buildQueue() with dependency resolution
 * - Topological sort
 * - Circular dependency detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Task } from '../../../src/types';

describe('TaskQueue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('buildQueue()', () => {
    it('should sort tasks topologically by dependencies', async () => {
      const tasks: Task[] = [
        { id: 'T003', specId: '001', description: 'Task 3', status: 'pending', dependencies: ['T001', 'T002'], attemptCount: 0 },
        { id: 'T001', specId: '001', description: 'Task 1', status: 'pending', dependencies: [], attemptCount: 0 },
        { id: 'T002', specId: '001', description: 'Task 2', status: 'pending', dependencies: ['T001'], attemptCount: 0 },
      ];

      const { TaskQueue } = await import('../../../src/orchestrator/TaskQueue');
      const queue = new TaskQueue();

      const sorted = await queue.buildQueue(tasks);

      expect(sorted[0].id).toBe('T001');
      expect(sorted[1].id).toBe('T002');
      expect(sorted[2].id).toBe('T003');
    });

    it('should handle tasks with no dependencies', async () => {
      const tasks: Task[] = [
        { id: 'T001', specId: '001', description: 'Task 1', status: 'pending', dependencies: [], attemptCount: 0 },
        { id: 'T002', specId: '001', description: 'Task 2', status: 'pending', dependencies: [], attemptCount: 0 },
      ];

      const { TaskQueue } = await import('../../../src/orchestrator/TaskQueue');
      const queue = new TaskQueue();

      const sorted = await queue.buildQueue(tasks);

      expect(sorted).toHaveLength(2);
    });

    it('should detect circular dependencies', async () => {
      const tasks: Task[] = [
        { id: 'T001', specId: '001', description: 'Task 1', status: 'pending', dependencies: ['T002'], attemptCount: 0 },
        { id: 'T002', specId: '001', description: 'Task 2', status: 'pending', dependencies: ['T001'], attemptCount: 0 },
      ];

      const mockLogError = vi.fn();
      vi.doMock('../../../src/utils/Logger', () => ({
        logger: { error: mockLogError, warn: vi.fn(), info: vi.fn() },
      }));

      const { TaskQueue } = await import('../../../src/orchestrator/TaskQueue');
      const queue = new TaskQueue();

      await expect(queue.buildQueue(tasks)).rejects.toThrow('circular');
    });

    it('should handle complex dependency graphs', async () => {
      const tasks: Task[] = [
        { id: 'T005', specId: '001', description: 'Task 5', status: 'pending', dependencies: ['T003', 'T004'], attemptCount: 0 },
        { id: 'T003', specId: '001', description: 'Task 3', status: 'pending', dependencies: ['T001'], attemptCount: 0 },
        { id: 'T004', specId: '001', description: 'Task 4', status: 'pending', dependencies: ['T002'], attemptCount: 0 },
        { id: 'T001', specId: '001', description: 'Task 1', status: 'pending', dependencies: [], attemptCount: 0 },
        { id: 'T002', specId: '001', description: 'Task 2', status: 'pending', dependencies: [], attemptCount: 0 },
      ];

      const { TaskQueue } = await import('../../../src/orchestrator/TaskQueue');
      const queue = new TaskQueue();

      const sorted = await queue.buildQueue(tasks);

      const t5Index = sorted.findIndex(t => t.id === 'T005');
      const t3Index = sorted.findIndex(t => t.id === 'T003');
      const t4Index = sorted.findIndex(t => t.id === 'T004');

      expect(t5Index).toBeGreaterThan(t3Index);
      expect(t5Index).toBeGreaterThan(t4Index);
    });
  });

  describe('getNextTask()', () => {
    it('should return task with satisfied dependencies', async () => {
      const tasks: Task[] = [
        { id: 'T001', specId: '001', description: 'Task 1', status: 'completed', dependencies: [], attemptCount: 0 },
        { id: 'T002', specId: '001', description: 'Task 2', status: 'pending', dependencies: ['T001'], attemptCount: 0 },
      ];

      const { TaskQueue } = await import('../../../src/orchestrator/TaskQueue');
      const queue = new TaskQueue();

      await queue.buildQueue(tasks);
      const next = queue.getNextTask();

      expect(next?.id).toBe('T002');
    });

    it('should skip tasks with unsatisfied dependencies', async () => {
      const tasks: Task[] = [
        { id: 'T001', specId: '001', description: 'Task 1', status: 'pending', dependencies: [], attemptCount: 0 },
        { id: 'T002', specId: '001', description: 'Task 2', status: 'pending', dependencies: ['T001'], attemptCount: 0 },
      ];

      const { TaskQueue } = await import('../../../src/orchestrator/TaskQueue');
      const queue = new TaskQueue();

      await queue.buildQueue(tasks);
      const next = queue.getNextTask();

      expect(next?.id).toBe('T001');
    });

    it('should return null when no tasks available', async () => {
      const tasks: Task[] = [
        { id: 'T001', specId: '001', description: 'Task 1', status: 'completed', dependencies: [], attemptCount: 0 },
      ];

      const { TaskQueue } = await import('../../../src/orchestrator/TaskQueue');
      const queue = new TaskQueue();

      await queue.buildQueue(tasks);
      const next = queue.getNextTask();

      expect(next).toBeNull();
    });

    it('should warn if queue has >100 tasks', async () => {
      const tasks = Array.from({ length: 101 }, (_, i) => ({
        id: `T${String(i + 1).padStart(3, '0')}`,
        specId: '001',
        description: `Task ${i + 1}`,
        status: 'pending' as const,
        dependencies: [],
        attemptCount: 0,
      }));

      const mockLogWarn = vi.fn();
      vi.doMock('../../../src/utils/Logger', () => ({
        logger: { warn: mockLogWarn, info: vi.fn(), error: vi.fn() },
      }));

      const { TaskQueue } = await import('../../../src/orchestrator/TaskQueue');
      const queue = new TaskQueue();

      await queue.buildQueue(tasks);

      expect(mockLogWarn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'scale_limit_exceeded',
        })
      );
    });
  });
});
