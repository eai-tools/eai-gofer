import * as vscode from 'vscode';
import { SpecKitParser, Spec, Task, SpecStatus, TaskStatus } from './specKitParser';
import { SpecLoader } from './autonomous/SpecLoader';
import { DependencyGraph } from './autonomous/DependencyGraph';

class SpecItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly spec?: Spec,
    public readonly task?: Task,
    public readonly dependencies?: string[],
    public readonly dependents?: string[]
  ) {
    super(label, collapsibleState);

    if (spec && !task) {
      // This is a spec item - show Harvey ball icon with percentage at end
      const total = spec.tasks.length;
      const completed = spec.tasks.filter((t) => t.status === 'completed').length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      const harveyBall = this.getHarveyBall(percentage);

      // T110: Add dependency info to description
      this.description = this.getSpecStatusWithDeps(spec, percentage, dependencies);

      // T111: Add full dependency chain to tooltip
      this.tooltip = this.buildSpecTooltip(spec, dependencies, dependents);

      this.label = `${harveyBall} ${label}`; // Harvey ball at front
      this.contextValue = 'spec';
      // Add click command to show spec details
      this.command = {
        command: 'specGofer.showSpecDetails',
        title: 'Show Spec Details',
        arguments: [spec],
      };
    } else if (task) {
      // This is a task item - show Harvey ball icon
      const harveyBall = this.getTaskHarveyBall(task);

      this.tooltip = task.description;
      this.description = this.getTaskDescription(task);
      this.label = `${harveyBall} ${label}`; // Harvey ball at front
      this.contextValue = 'task';
      // Add click command to show task details
      this.command = {
        command: 'specGofer.showTaskDetails',
        title: 'Show Task Details',
        arguments: [task, spec],
      };
    }
  }

  /**
   * T110: Get spec status with dependency indicators
   */
  private getSpecStatusWithDeps(spec: Spec, percentage: number, dependencies?: string[]): string {
    const failed = spec.tasks.filter((t) => t.status === 'failed').length;
    const inProgress = spec.tasks.filter((t) => t.status === 'in_progress').length;
    const testing = spec.tasks.filter((t) => t.status === 'testing').length;
    const blocked = spec.tasks.filter((t) => t.status === 'blocked').length;

    const parts: string[] = [];

    // Show dependency indicator first if present
    if (dependencies && dependencies.length > 0) {
      parts.push(`→ depends on: ${dependencies.join(', ')}`);
    }

    // Show active states
    if (inProgress > 0) {
      parts.push(`${inProgress} in progress`);
    }
    if (testing > 0) {
      parts.push(`${testing} testing`);
    }
    if (blocked > 0) {
      parts.push(`${blocked} blocked`);
    }
    if (failed > 0) {
      parts.push(`${failed} failed`);
    }

    // Add percentage at the end
    parts.push(`${percentage}%`);

    return parts.join(' • ');
  }

  /**
   * T111: Build tooltip with full dependency chain
   */
  private buildSpecTooltip(spec: Spec, dependencies?: string[], dependents?: string[]): string {
    const parts: string[] = [];

    // Add spec description
    if (spec.description) {
      parts.push(spec.description);
      parts.push(''); // Empty line
    }

    // Add dependency information
    if (dependencies && dependencies.length > 0) {
      parts.push('Dependencies:');
      dependencies.forEach((dep) => {
        parts.push(`  → ${dep}`);
      });
      parts.push(''); // Empty line
    }

    // Add dependent information
    if (dependents && dependents.length > 0) {
      parts.push('Depended on by:');
      dependents.forEach((dep) => {
        parts.push(`  ← ${dep}`);
      });
    }

    return parts.join('\n');
  }

  private getHarveyBall(percentage: number): string {
    // Harvey ball representation using Unicode
    if (percentage === 0) {
      return '○'; // Empty circle
    }
    if (percentage <= 25) {
      return '◔'; // Quarter filled
    }
    if (percentage <= 50) {
      return '◑'; // Half filled
    }
    if (percentage <= 75) {
      return '◕'; // Three quarters filled
    }
    return '●'; // Full circle
  }

  private getTaskHarveyBall(task: Task): string {
    // Task Harvey balls based on status
    switch (task.status) {
      case 'completed':
        return '●'; // Full circle
      case 'in_progress':
        return '◑'; // Half filled (in progress)
      case 'testing':
        return '◕'; // Three quarters (almost done)
      case 'failed':
        return '⊗'; // Circled X
      case 'blocked':
        return '⊘'; // Circled slash
      case 'pending':
      default:
        return '○'; // Empty circle
    }
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
  private specLoader: SpecLoader;
  private dependencyGraph: DependencyGraph;
  private workspacePath: string;

  constructor(workspacePath: string, branchSpecManager?: any) {
    console.log(`[SpecGofer] ProgressProvider initialized for workspace: ${workspacePath}`);
    this.workspacePath = workspacePath;
    this.branchSpecManager = branchSpecManager;
    this.parser = new SpecKitParser(workspacePath, branchSpecManager);
    this.specLoader = new SpecLoader(workspacePath);
    this.dependencyGraph = new DependencyGraph(workspacePath);
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
      // Root level - check if .specify folder exists
      // If no .specify folder, return empty array to show welcome view with Initialize button
      if (this.loadError?.includes('.specify folder not found')) {
        return []; // Shows welcome view with "Initialize SpecGofer" button
      }

      // Check for other load errors
      if (this.loadError) {
        const errorItem = new SpecItem(
          `Error: ${this.loadError}`,
          vscode.TreeItemCollapsibleState.None
        );
        errorItem.iconPath = new vscode.ThemeIcon('error');
        errorItem.tooltip = `Workspace: ${this.parser['workspacePath']}\n\nError: ${this.loadError}`;
        return [errorItem];
      }

      // .specify folder exists but no specs found
      if (this.specs.length === 0) {
        const noSpecsItem = new SpecItem('No specs found', vscode.TreeItemCollapsibleState.None);
        noSpecsItem.iconPath = new vscode.ThemeIcon('info');
        noSpecsItem.tooltip = `Workspace: ${this.parser['workspacePath']}\n\nLooking for specs in: .specify/specs/\n\nCreate a spec with: SpecGofer: Create New Spec`;
        noSpecsItem.command = {
          command: 'specGofer.createSpec',
          title: 'Create New Spec',
        };
        return [noSpecsItem];
      }

      // Sort specs by ID (numeric part) before displaying
      const sortedSpecs = [...this.specs].sort((a, b) => {
        // Extract numeric prefix from spec IDs (e.g., "001" from "001-vscode-extension")
        const aNum = parseInt(a.id.split('-')[0]) || 0;
        const bNum = parseInt(b.id.split('-')[0]) || 0;
        return aNum - bNum;
      });

      // T108-T109: Add dependency information to tree items
      return sortedSpecs.map((spec) => {
        const dependencies = this.dependencyGraph.getDependencies(spec.id);
        const dependents = this.dependencyGraph.getDependents(spec.id);

        // Extract numeric prefix from ID (e.g., "001" from "001-vscode-extension")
        // and combine with title for display (e.g., "001 - VSCode Extension")
        const numericPrefix = spec.id.match(/^(\d+)-/)?.[1];
        const displayLabel = numericPrefix ? `${numericPrefix} - ${spec.title}` : spec.title;

        return new SpecItem(
          displayLabel,
          vscode.TreeItemCollapsibleState.Expanded,
          spec,
          undefined,
          dependencies,
          dependents
        );
      });
    } else if (element.spec && !element.task) {
      // Spec level - show tasks
      return element.spec.tasks.map(
        (task) =>
          new SpecItem(task.description, vscode.TreeItemCollapsibleState.None, element.spec, task)
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

      // T106: Load dependency graph from spec frontmatter
      await this.loadDependencyGraph();

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
   * T106: Load dependency graph from spec frontmatter
   */
  private async loadDependencyGraph(): Promise<void> {
    try {
      // Try to load existing graph from disk
      const path = require('path');
      const graphPath = path.join(
        this.workspacePath,
        '.specify',
        'memory',
        'dependency-graph.json'
      );
      const fs = require('fs').promises;

      try {
        await fs.access(graphPath);
        this.dependencyGraph = await DependencyGraph.load(this.workspacePath);
        console.log(`[SpecGofer] Loaded dependency graph from ${graphPath}`);
      } catch {
        // Graph doesn't exist, create new one
        this.dependencyGraph = new DependencyGraph(this.workspacePath);
        console.log('[SpecGofer] Created new dependency graph');
      }

      // Get all dependencies from spec frontmatter
      const allDependencies = this.specLoader.getAllDependencies();

      // Populate graph with specs and their dependencies
      for (const [specId, dependencies] of allDependencies.entries()) {
        // Add spec node if not exists
        if (!this.dependencyGraph.getSpec(specId)) {
          this.dependencyGraph.addSpec(specId);
        }

        // Add dependencies
        for (const depId of dependencies) {
          try {
            // Validate dependency exists
            if (!allDependencies.has(depId)) {
              console.warn(`[SpecGofer] Spec ${specId} depends on non-existent spec ${depId}`);
              continue;
            }

            // Add dependency edge (if not already present)
            if (!this.dependencyGraph.hasDependency(specId, depId)) {
              this.dependencyGraph.addDependency(specId, depId, 'required_by', {
                reason: 'Declared in spec frontmatter',
                addedAt: Date.now(),
              });
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes('cycle')) {
              console.warn(
                `[SpecGofer] Cannot add dependency ${specId} -> ${depId}: would create cycle`
              );
            } else {
              console.error(`[SpecGofer] Error adding dependency ${specId} -> ${depId}:`, error);
            }
          }
        }
      }

      // Save updated graph
      await this.dependencyGraph.save();
      console.log('[SpecGofer] Dependency graph updated and saved');
    } catch (error) {
      console.error('[SpecGofer] Error loading dependency graph:', error);
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
        if (task.status === 'pending' && this.areDependenciesMet(spec, task)) {
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

  /**
   * Get dependency graph for external use
   */
  getDependencyGraph(): DependencyGraph {
    return this.dependencyGraph;
  }

  /**
   * Get impact report for a spec
   */
  getImpactReport(specId: string): ReturnType<DependencyGraph['getImpactReport']> {
    return this.dependencyGraph.getImpactReport(specId);
  }
}
