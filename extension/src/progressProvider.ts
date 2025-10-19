import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Spec {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
  acceptanceCriteria: AcceptanceCriteria[];
}

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'testing' | 'completed' | 'failed';
  dependencies: string[];
  attempts?: number;
}

interface AcceptanceCriteria {
  id: string;
  description: string;
  testType: string;
  testPath: string;
}

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

    if (failed > 0) {
      return `${completed}/${total} (${failed} failed)`;
    }
    return `${completed}/${total}`;
  }

  private getSpecIcon(spec: Spec): string {
    const allCompleted = spec.tasks.every((t) => t.status === 'completed');
    const anyFailed = spec.tasks.some((t) => t.status === 'failed');
    const anyInProgress = spec.tasks.some(
      (t) => t.status === 'in_progress' || t.status === 'testing'
    );

    if (allCompleted) return 'check';
    if (anyFailed) return 'error';
    if (anyInProgress) return 'sync~spin';
    return 'circle-outline';
  }

  private getTaskDescription(task: Task): string {
    const parts: string[] = [];

    if (task.attempts && task.attempts > 1) {
      parts.push(`Attempt ${task.attempts}`);
    }

    if (task.dependencies.length > 0) {
      parts.push(`${task.dependencies.length} deps`);
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
      case 'pending':
      default:
        return 'circle-outline';
    }
  }
}

/**
 * Provides a tree view of spec progress
 */
export class ProgressProvider implements vscode.TreeDataProvider<SpecItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SpecItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private workspacePath: string;
  private specs: Spec[] = [];

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
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
    if (!element) {
      // Root level - show specs
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
    const specDir = path.join(this.workspacePath, '.specify');

    try {
      const files = await fs.readdir(specDir);
      const specFiles = files.filter((f) => f.endsWith('.json') && f !== 'spec-schema.json');

      this.specs = [];

      for (const file of specFiles) {
        try {
          const content = await fs.readFile(path.join(specDir, file), 'utf-8');
          const spec = JSON.parse(content) as Spec;
          this.specs.push(spec);
        } catch (error) {
          console.error(`Error loading spec ${file}:`, error);
        }
      }

      // Sort specs by completion status
      this.specs.sort((a, b) => {
        const aCompleted = a.tasks.filter((t) => t.status === 'completed').length;
        const bCompleted = b.tasks.filter((t) => t.status === 'completed').length;
        return bCompleted - aCompleted;
      });
    } catch (error) {
      console.error('Error loading specs:', error);
      this.specs = [];
    }
  }

  /**
   * Get the current active task (first in_progress or pending task)
   */
  getCurrentTask(): { spec: Spec; task: Task } | undefined {
    for (const spec of this.specs) {
      for (const task of spec.tasks) {
        if (task.status === 'in_progress' || task.status === 'pending') {
          return { spec, task };
        }
      }
    }
    return undefined;
  }

  /**
   * Get overall progress statistics
   */
  getProgress(): {
    totalSpecs: number;
    completedSpecs: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
  } {
    const totalSpecs = this.specs.length;
    const completedSpecs = this.specs.filter((s) =>
      s.tasks.every((t) => t.status === 'completed')
    ).length;

    let totalTasks = 0;
    let completedTasks = 0;
    let failedTasks = 0;

    for (const spec of this.specs) {
      totalTasks += spec.tasks.length;
      completedTasks += spec.tasks.filter((t) => t.status === 'completed').length;
      failedTasks += spec.tasks.filter((t) => t.status === 'failed').length;
    }

    return {
      totalSpecs,
      completedSpecs,
      totalTasks,
      completedTasks,
      failedTasks,
    };
  }
}
