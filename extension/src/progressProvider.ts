import * as vscode from 'vscode';
import { SpecKitParser, Spec, Task, SpecStatus, TaskStatus } from './specKitParser';

class SpecItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly spec?: Spec,
    public readonly task?: Task
  ) {
    super(label, collapsibleState);

    if (spec && !task) {
      // This is a spec item
      this.tooltip = spec.description;
      this.description = this.getSpecStatus(spec);
      this.iconPath = new vscode.ThemeIcon(this.getSpecIcon(spec));
      this.contextValue = 'spec';
    } else if (task) {
      // This is a task item
      this.tooltip = task.description;
      this.description = this.getTaskDescription(task);
      this.iconPath = new vscode.ThemeIcon(this.getTaskIcon(task));
      this.contextValue = 'task';
    }
  }

  private getSpecStatus(spec: Spec): string {
    const total = spec.tasks.length;
    const completed = spec.tasks.filter((t) => t.status === 'completed').length;
    const failed = spec.tasks.filter((t) => t.status === 'failed').length;
    const inProgress = spec.tasks.filter((t) => t.status === 'in_progress').length;

    const parts: string[] = [];

    if (inProgress > 0) {
      parts.push(`${inProgress} in progress`);
    }

    parts.push(`${completed}/${total}`);

    if (failed > 0) {
      parts.push(`${failed} failed`);
    }

    return parts.join(' • ');
  }

  private getSpecIcon(spec: Spec): string {
    const allCompleted = spec.tasks.every((t) => t.status === 'completed');
    const anyFailed = spec.tasks.some((t) => t.status === 'failed');
    const anyInProgress = spec.tasks.some(
      (t) => t.status === 'in_progress' || t.status === 'testing'
    );
    const anyBlocked = spec.tasks.some((t) => t.status === 'blocked');

    if (allCompleted) return 'check';
    if (anyFailed) return 'error';
    if (anyBlocked) return 'lock';
    if (anyInProgress) return 'sync~spin';
    return 'circle-outline';
  }

  private getTaskDescription(task: Task): string {
    const parts: string[] = [];

    // Show task ID
    parts.push(task.id);

    // Show attempts if > 0
    if (task.attempts && task.attempts > 0) {
      parts.push(`Attempt ${task.attempts + 1}`);
    }

    // Show dependencies
    if (task.dependencies.length > 0) {
      parts.push(`Deps: ${task.dependencies.join(', ')}`);
    }

    // Show parallel marker
    if (task.parallel) {
      parts.push('[P]');
    }

    // Show estimated time
    if (task.estimated) {
      parts.push(task.estimated);
    }

    return parts.join(' • ');
  }

  private getTaskIcon(task: Task): string {
    switch (task.status) {
      case 'completed':
        return 'check';
      case 'failed':
        return 'error';
      case 'in_progress':
        return 'sync~spin';
      case 'testing':
        return 'beaker';
      case 'blocked':
        return 'lock';
      case 'pending':
      default:
        return 'circle-outline';
    }
  }
}

/**
 * Provides a tree view of spec progress (GitHub Spec Kit format)
 */
export class ProgressProvider implements vscode.TreeDataProvider<SpecItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SpecItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private parser: SpecKitParser;
  private specs: Spec[] = [];
  private loadError: string | null = null;
  private branchSpecManager: any;

  constructor(workspacePath: string, branchSpecManager?: any) {
    console.log(`[SpecGofer] ProgressProvider initialized for workspace: ${workspacePath}`);
    this.branchSpecManager = branchSpecManager;
    this.parser = new SpecKitParser(workspacePath, branchSpecManager);
    this.loadSpecs();
  }

  refresh(): void {
    this.loadSpecs();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SpecItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SpecItem): Promise<SpecItem[]> {
    // Check for load errors
    if (this.loadError && !element) {
      const errorItem = new SpecItem(
        `Error: ${this.loadError}`,
        vscode.TreeItemCollapsibleState.None
      );
      errorItem.iconPath = new vscode.ThemeIcon('error');
      errorItem.tooltip = `Workspace: ${this.parser['workspacePath']}\n\nError: ${this.loadError}`;
      return [errorItem];
    }

    if (!element) {
      // Root level - show specs
      if (this.specs.length === 0) {
        const noSpecsItem = new SpecItem(
          'No specs found',
          vscode.TreeItemCollapsibleState.None
        );
        noSpecsItem.iconPath = new vscode.ThemeIcon('info');
        noSpecsItem.tooltip = `Workspace: ${this.parser['workspacePath']}\n\nLooking for specs in: .specify/specs/\n\nClick "Initialize SpecGofer" to create the structure.`;
        noSpecsItem.command = {
          command: 'specKit.initialize',
          title: 'Initialize SpecGofer'
        };
        return [noSpecsItem];
      }

      return this.specs.map(
        (spec) =>
          new SpecItem(
            spec.title,
            vscode.TreeItemCollapsibleState.Expanded,
            spec,
            undefined
          )
      );
    } else if (element.spec && !element.task) {
      // Spec level - show tasks
      return element.spec.tasks.map(
        (task) =>
          new SpecItem(
            task.description,
            vscode.TreeItemCollapsibleState.None,
            element.spec,
            task
          )
      );
    }

    return [];
  }

  private async loadSpecs(): Promise<void> {
    try {
      // Check if .specify exists in this workspace
      const fs = require('fs').promises;
      const path = require('path');
      const specifyPath = path.join(this.parser['workspacePath'], '.specify');

      try {
        await fs.access(specifyPath);
      } catch (error) {
        this.loadError = `.specify folder not found in this workspace`;
        this.specs = [];
        console.log(`[SpecGofer] .specify folder not found at ${specifyPath}`);
        return;
      }

      this.specs = await this.parser.loadAllSpecs();
      this.loadError = null;
      console.log(`[SpecGofer] Loaded ${this.specs.length} spec(s) from ${specifyPath}`);

      // Sort specs by status and completion
      this.specs.sort((a, b) => {
        // Priority order: in_progress > ready > draft > completed > blocked
        const statusPriority: Record<SpecStatus, number> = {
          in_progress: 1,
          ready: 2,
          draft: 3,
          completed: 4,
          blocked: 5,
        };

        const aPriority = statusPriority[a.status] || 99;
        const bPriority = statusPriority[b.status] || 99;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // Within same status, sort by completion percentage
        const aCompleted = a.tasks.filter((t) => t.status === 'completed').length / a.tasks.length;
        const bCompleted = b.tasks.filter((t) => t.status === 'completed').length / b.tasks.length;
        return bCompleted - aCompleted;
      });
    } catch (error) {
      console.error('Error loading specs:', error);
      this.loadError = error instanceof Error ? error.message : 'Unknown error';
      this.specs = [];
    }
  }

  /**
   * Get the current active task (first in_progress or pending task)
   */
  getCurrentTask(): { spec: Spec; task: Task } | undefined {
    for (const spec of this.specs) {
      for (const task of spec.tasks) {
        if (task.status === 'in_progress') {
          return { spec, task };
        }
      }
    }

    // If no in_progress, find first pending with dependencies met
    for (const spec of this.specs) {
      for (const task of spec.tasks) {
        if (task.status === 'pending' && this.areDependenciesMet(spec, task)) {
          return { spec, task };
        }
      }
    }

    return undefined;
  }

  /**
   * Check if task dependencies are met
   */
  private areDependenciesMet(spec: Spec, task: Task): boolean {
    if (task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every((depId) => {
      const depTask = spec.tasks.find((t) => t.id === depId);
      return depTask && depTask.status === 'completed';
    });
  }

  /**
   * Get next available tasks (pending with dependencies met)
   */
  getNextAvailableTasks(): Array<{ spec: Spec; task: Task }> {
    const available: Array<{ spec: Spec; task: Task }> = [];

    for (const spec of this.specs) {
      for (const task of spec.tasks) {
        if (
          task.status === 'pending' &&
          this.areDependenciesMet(spec, task)
        ) {
          available.push({ spec, task });
        }
      }
    }

    return available;
  }

  /**
   * Get parallel tasks (tasks marked [P] that can run concurrently)
   */
  getParallelTasks(): Array<{ spec: Spec; task: Task }> {
    return this.getNextAvailableTasks().filter(({ task }) => task.parallel);
  }

  /**
   * Get overall progress statistics
   */
  getProgress(): {
    totalSpecs: number;
    completedSpecs: number;
    inProgressSpecs: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    failedTasks: number;
    blockedTasks: number;
    pendingTasks: number;
  } {
    const totalSpecs = this.specs.length;
    const completedSpecs = this.specs.filter((s) =>
      s.tasks.every((t) => t.status === 'completed')
    ).length;
    const inProgressSpecs = this.specs.filter((s) =>
      s.tasks.some((t) => t.status === 'in_progress')
    ).length;

    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let failedTasks = 0;
    let blockedTasks = 0;
    let pendingTasks = 0;

    for (const spec of this.specs) {
      totalTasks += spec.tasks.length;
      completedTasks += spec.tasks.filter((t) => t.status === 'completed').length;
      inProgressTasks += spec.tasks.filter((t) => t.status === 'in_progress').length;
      failedTasks += spec.tasks.filter((t) => t.status === 'failed').length;
      blockedTasks += spec.tasks.filter((t) => t.status === 'blocked').length;
      pendingTasks += spec.tasks.filter((t) => t.status === 'pending').length;
    }

    return {
      totalSpecs,
      completedSpecs,
      inProgressSpecs,
      totalTasks,
      completedTasks,
      inProgressTasks,
      failedTasks,
      blockedTasks,
      pendingTasks,
    };
  }

  /**
   * Get all specs
   */
  getSpecs(): Spec[] {
    return this.specs;
  }

  /**
   * Get spec by ID
   */
  getSpec(specId: string): Spec | undefined {
    return this.specs.find((s) => s.id === specId);
  }

  /**
   * Update task status
   */
  async updateTaskStatus(specId: string, taskId: string, status: TaskStatus): Promise<void> {
    await this.parser.updateTaskStatus(specId, taskId, status);
    this.refresh();
  }

  /**
   * Update spec status
   */
  async updateSpecStatus(specId: string, status: SpecStatus): Promise<void> {
    await this.parser.updateSpecStatus(specId, status);
    this.refresh();
  }
}
