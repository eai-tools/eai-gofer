/** Retry Handler - Tasks T044-T046 */
import { logger } from '../utils/Logger.js';
import type { Task } from '../types/index.js';

const RETRY_INTERVALS = [10000, 30000, 120000];

export class RetryHandler {
  shouldRetry(task: Task): boolean {
    if (task.attemptCount < 3) {
      logger.info({
        event: 'retry_scheduled',
        taskId: task.id,
        context: { attempt: task.attemptCount + 1 },
      });
      return true;
    }
    return false;
  }

  async escalateToHuman(task: Task): Promise<void> {
    logger.error({
      event: 'task_escalated',
      taskId: task.id,
      context: { reason: 'max_retries_exceeded' },
    });
  }

  getRetryDelay(attemptCount: number): number {
    return RETRY_INTERVALS[attemptCount] || 120000;
  }
}
