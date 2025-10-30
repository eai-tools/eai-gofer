/**
 * Autonomous Orchestrator
 * Tasks: T027, T028
 */

import { logger } from '../utils/Logger.js';
import { SpecLoader } from './SpecLoader.js';
import { TaskQueue } from './TaskQueue.js';
import type { Task } from '../types/index.js';

export class AutonomousOrchestrator {
  private specLoader: SpecLoader;
  private taskQueue: TaskQueue;
  private isRunning = false;

  constructor(specsDir: string) {
    this.specLoader = new SpecLoader(specsDir);
    this.taskQueue = new TaskQueue();
  }

  async start(): Promise<void> {
    this.isRunning = true;
    logger.info({ event: 'orchestrator_started', context: {} });

    const specs = await this.specLoader.loadAllSpecs();
    const allTasks = specs.flatMap((s) => s.tasks);
    await this.taskQueue.buildQueue(allTasks);

    while (this.isRunning) {
      const task = this.taskQueue.getNextTask();
      if (!task) {
        break;
      }

      await this.executeTask(task);
    }

    logger.info({ event: 'orchestrator_stopped', context: {} });
  }

  stop(): void {
    this.isRunning = false;
  }

  async executeTask(task: Task): Promise<void> {
    logger.info({ event: 'task_started', taskId: task.id, specId: task.specId, context: {} });

    task.status = 'in_progress';
    task.startedAt = new Date().toISOString();

    // Actual execution would happen here via ClaudeCodeInterceptor
    // For now, mark as completed
    task.status = 'completed';
    task.completedAt = new Date().toISOString();

    await this.specLoader.updateTaskStatus(task.specId, task.id, task.status);

    logger.info({ event: 'task_completed', taskId: task.id, context: {} });
  }
}
