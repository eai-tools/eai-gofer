/**
 * Progress Reporter Module
 *
 * Handles:
 * - Updating task status in UI via ProgressProvider
 * - Marking tasks as complete in tasks.md with checkboxes
 * - Persisting session state to disk
 * - Resuming sessions after restart
 * - Updating status bar with live metrics
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { AutonomousSession, ProgressUpdate, TaskStatus } from './types';

export class ProgressReporter {
  private workspacePath: string;
  private progressProvider: any; // ProgressProvider interface
  private statusBarItem: vscode.StatusBarItem;

  constructor(workspacePath: string, progressProvider: any) {
    this.workspacePath = workspacePath;
    this.progressProvider = progressProvider;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  }

  /**
   * Update task status in the UI via ProgressProvider
   * Requirement: <100ms latency
   */
  async updateTaskStatus(specId: string, taskId: string, status: TaskStatus): Promise<void> {
    await this.progressProvider.updateTaskStatus(specId, taskId, status);
    this.progressProvider.refresh();
  }

  /**
   * Update tasks.md file with checkbox status
   * Uses atomic write for safety
   */
  async updateTasksFile(specId: string, taskId: string, status: TaskStatus): Promise<void> {
    const tasksFilePath = path.join(this.workspacePath, '.specify', 'specs', specId, 'tasks.md');

    // Read current content
    const content = await fs.readFile(tasksFilePath, 'utf-8');

    // Update checkbox based on status
    const checkbox = this.getCheckboxForStatus(status);
    const updatedContent = this.updateTaskCheckbox(content, taskId, checkbox);

    // Atomic write: write to temp file, then rename
    const tempFilePath = `${tasksFilePath}.tmp`;
    await fs.writeFile(tempFilePath, updatedContent, 'utf-8');
    await fs.rename(tempFilePath, tasksFilePath);
  }

  /**
   * Save session state to disk
   * Uses atomic write for safety
   * Requirement: <200ms latency
   */
  async saveSession(session: AutonomousSession): Promise<void> {
    const sessionDir = path.join(this.workspacePath, '.specify', 'state', 'sessions');

    // Ensure directory exists
    await fs.mkdir(sessionDir, { recursive: true });

    const sessionFilePath = path.join(sessionDir, `${session.sessionId}.json`);
    const jsonContent = JSON.stringify(session, null, 2);

    // Atomic write: write to temp file, then rename
    const tempFilePath = `${sessionFilePath}.tmp`;
    await fs.writeFile(tempFilePath, jsonContent, 'utf-8');
    await fs.rename(tempFilePath, sessionFilePath);
  }

  /**
   * Resume session from disk with validation
   */
  async resumeSession(sessionId: string): Promise<AutonomousSession> {
    const sessionFilePath = path.join(
      this.workspacePath,
      '.specify',
      'state',
      'sessions',
      `${sessionId}.json`
    );

    // Read session file
    const jsonContent = await fs.readFile(sessionFilePath, 'utf-8');
    const session = JSON.parse(jsonContent) as AutonomousSession;

    // Validate session data
    this.validateSession(session);

    return session;
  }

  /**
   * Update status bar with live metrics
   * Requirement: <50ms latency
   */
  async updateStatusBar(update: ProgressUpdate): Promise<void> {
    // Build status bar text
    const percentText = `${update.percentComplete}%`;
    const progressText = `${update.tasksCompleted}/${update.tasksTotal}`;
    const taskText = update.currentTask || 'Idle';

    // Add icon based on test results
    let icon = '$(sync~spin)';
    if (update.testsFailed > 0) {
      icon = '$(warning)';
    } else if (update.testsPassed > 0) {
      icon = '$(pass)';
    }

    this.statusBarItem.text = `${icon} SpecGofer: ${progressText} ${percentText} | ${taskText}`;

    // Build tooltip with detailed info
    const tooltipParts: string[] = [];

    // Progress
    tooltipParts.push(
      `Progress: ${update.tasksCompleted}/${update.tasksTotal} tasks (${percentText})`
    );

    // Current activity
    tooltipParts.push(`Current: ${update.currentAction}`);

    // Test results
    if (update.testsRun > 0) {
      tooltipParts.push(`Tests: ${update.testsPassed} passed, ${update.testsFailed} failed`);
    }

    // Elapsed time
    const elapsedMin = Math.round(update.elapsedTime / 60000);
    tooltipParts.push(`Elapsed: ${this.formatDuration(update.elapsedTime)}`);

    // Estimated time remaining
    if (update.estimatedTimeRemaining !== null) {
      tooltipParts.push(`~${this.formatDuration(update.estimatedTimeRemaining)} remaining`);
    }

    // Token usage
    const tokenWarning = update.tokensUsed > 150000 ? '⚠️ ' : '';
    tooltipParts.push(`${tokenWarning}${update.tokensUsed.toLocaleString()} tokens`);

    // Context switches
    if (update.contextSwitches > 0) {
      tooltipParts.push(`${update.contextSwitches} context switches`);
    }

    this.statusBarItem.tooltip = tooltipParts.join('\n');
    this.statusBarItem.show();
  }

  /**
   * Hide status bar
   */
  hideStatusBar(): void {
    this.statusBarItem.hide();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get checkbox marker for task status
   */
  private getCheckboxForStatus(status: TaskStatus): string {
    switch (status) {
      case 'completed':
        return '[X]';
      case 'in_progress':
        return '[~]';
      case 'testing':
        return '[~]';
      case 'failed':
        return '[ ]'; // Reset to pending
      case 'pending':
      default:
        return '[ ]';
    }
  }

  /**
   * Update task checkbox in markdown content
   */
  private updateTaskCheckbox(content: string, taskId: string, checkbox: string): string {
    // Match task line with checkbox
    // Pattern: - [X|~| ] T001 ...
    const regex = new RegExp(`^(\\s*-\\s+)\\[[X~\\s]\\](\\s+${taskId}\\b.*)$`, 'gm');

    return content.replace(regex, `$1${checkbox}$2`);
  }

  /**
   * Validate session data integrity
   */
  private validateSession(session: any): void {
    // Required fields
    if (!session.sessionId) {
      throw new Error('Invalid session data: missing sessionId');
    }
    if (!session.specId) {
      throw new Error('Invalid session data: missing specId');
    }

    // Validate arrays
    if (!Array.isArray(session.completedTasks)) {
      throw new Error('Invalid session data: completedTasks must be an array');
    }
    if (!Array.isArray(session.terminals)) {
      throw new Error('Invalid session data: terminals must be an array');
    }
    if (!Array.isArray(session.failedTasks)) {
      throw new Error('Invalid session data: failedTasks must be an array');
    }
    if (!Array.isArray(session.events)) {
      throw new Error('Invalid session data: events must be an array');
    }

    // Validate status is resumable
    if (session.status === 'completed') {
      throw new Error('Cannot resume completed session');
    }
    if (session.status === 'cancelled') {
      throw new Error('Cannot resume cancelled session');
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      if (remainingMinutes > 0) {
        return `${hours}h ${remainingMinutes}m`;
      }
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }
}
