/**
 * Task Queue with Dependency Resolution
 * Tasks: T025, T026
 */

import { logger } from '../utils/Logger.js';
import type { Task } from '../types/index.js';

export class TaskQueue {
  private queue: Task[] = [];

  async buildQueue(tasks: Task[]): Promise<Task[]> {
    if (tasks.length > 100) {
      logger.warn({
        event: 'scale_limit_exceeded',
        context: {
          limit: 100,
          actual: tasks.length,
          message: 'Task queue has >100 tasks',
        },
      });
    }

    this.queue = this.topologicalSort(tasks);
    return this.queue;
  }

  getNextTask(): Task | null {
    for (const task of this.queue) {
      if (task.status === 'pending' && this.areDependenciesSatisfied(task)) {
        return task;
      }
    }
    return null;
  }

  private topologicalSort(tasks: Task[]): Task[] {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const sorted: Task[] = [];

    const visit = (taskId: string): void => {
      if (visited.has(taskId)) {
        return;
      }
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected involving task ${taskId}`);
      }

      visiting.add(taskId);
      const task = taskMap.get(taskId);

      if (task) {
        for (const depId of task.dependencies) {
          visit(depId);
        }
        visited.add(taskId);
        sorted.push(task);
      }

      visiting.delete(taskId);
    };

    for (const task of tasks) {
      visit(task.id);
    }

    return sorted;
  }

  private areDependenciesSatisfied(task: Task): boolean {
    return task.dependencies.every((depId) => {
      const dep = this.queue.find((t) => t.id === depId);
      return dep?.status === 'completed';
    });
  }
}
