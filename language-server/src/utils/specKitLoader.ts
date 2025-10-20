/**
 * SpecKitLoader - Loads specifications from .specify/specs/ directory
 *
 * This is a simplified version of the extension's SpecKitParser
 * for use in the Language Server
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';

export interface Spec {
  id: string;
  title: string;
  description: string;
  status: SpecStatus;
  created: Date;
  updated: Date;
  author?: string;
  tasks: Task[];
  plan?: TechnicalPlan;
  dependencies: string[];
}

export type SpecStatus = 'draft' | 'ready' | 'in_progress' | 'completed' | 'blocked';

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  dependencies: string[];
  parallel: boolean;
  estimated?: string;
  attempts: number;
  error?: string;
  completedAt?: Date;
}

export type TaskStatus = 'pending' | 'in_progress' | 'testing' | 'completed' | 'failed' | 'blocked';

export interface TechnicalPlan {
  techStack: string[];
  architecture: string;
  testingApproach: string;
  dependencies: string[];
  risks: string[];
}

export class SpecKitLoader {
  constructor(private workspacePath: string) {}

  async loadAllSpecs(): Promise<Spec[]> {
    const specsDir = path.join(this.workspacePath, '.specify', 'specs');

    try {
      const entries = await fs.readdir(specsDir, { withFileTypes: true });
      const specDirs = entries.filter((e) => e.isDirectory());

      const specs = await Promise.all(
        specDirs.map(async (dir) => {
          try {
            return await this.loadSpec(dir.name);
          } catch (error) {
            console.error(`Failed to load spec ${dir.name}:`, error);
            return null;
          }
        })
      );

      return specs.filter((s): s is Spec => s !== null);
    } catch (error) {
      console.error('Failed to read specs directory:', error);
      return [];
    }
  }

  async loadSpec(specId: string): Promise<Spec> {
    const specDir = path.join(this.workspacePath, '.specify', 'specs', specId);
    const specPath = path.join(specDir, 'spec.md');
    const tasksPath = path.join(specDir, 'tasks.md');

    // Parse spec.md
    const specContent = await fs.readFile(specPath, 'utf-8');
    const { frontmatter, content } = this.parseFrontmatter(specContent);

    // Parse tasks.md
    const tasksContent = await fs.readFile(tasksPath, 'utf-8');
    const tasks = this.parseTasks(tasksContent);

    return {
      id: specId,
      title: frontmatter.feature || specId,
      description: content,
      status: this.parseSpecStatus(frontmatter.status),
      created: new Date(frontmatter.created),
      updated: new Date(frontmatter.updated),
      author: frontmatter.author,
      tasks,
      dependencies: frontmatter.dependencies || [],
    };
  }

  private parseFrontmatter(content: string): { frontmatter: any; content: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      throw new Error('No YAML frontmatter found');
    }

    const frontmatter = yaml.parse(match[1]);
    const bodyContent = match[2].trim();

    return { frontmatter, content: bodyContent };
  }

  private parseTasks(content: string): Task[] {
    const tasks: Task[] = [];
    const lines = content.split('\n');

    let currentTask: Partial<Task> | null = null;
    let taskIndex = 0;

    for (const line of lines) {
      // Support both formats: "- [ ] **T001**: Description" and "- [ ] #1 Description"
      const taskMatchBold = line.match(/^-\s+\[([x ])\]\s+\*\*([A-Z]\d+)\*\*:\s+(.+)$/);
      const taskMatchHash = line.match(/^-\s+\[([x ])\]\s+#(\d+)\s+(.+)$/);
      const taskMatch = taskMatchBold || taskMatchHash;

      if (taskMatch) {
        if (currentTask && currentTask.id) {
          tasks.push(this.completeTask(currentTask, taskIndex++));
        }

        const [, checkbox, id, description] = taskMatch;
        currentTask = {
          id,
          description: description.trim(),
          status: checkbox === 'x' ? 'completed' : 'pending',
          dependencies: [],
          parallel: false,
          attempts: 0,
        };
        continue;
      }

      if (currentTask && line.trim().startsWith('-')) {
        const depMatch = line.match(/Dependencies:\s*(.+)/i);
        if (depMatch) {
          const deps = depMatch[1].trim();
          if (deps !== 'None' && deps !== 'none') {
            currentTask.dependencies = deps.split(',').map((d) => d.trim());
          }
          continue;
        }

        const estMatch = line.match(/Estimated:\s*(.+)/i);
        if (estMatch) {
          currentTask.estimated = estMatch[1].trim();
          continue;
        }

        if (line.includes('[P]')) {
          currentTask.parallel = true;
          continue;
        }
      }
    }

    if (currentTask && currentTask.id) {
      tasks.push(this.completeTask(currentTask, taskIndex));
    }

    return tasks;
  }

  private completeTask(partial: Partial<Task>, index: number): Task {
    return {
      id: partial.id || `T${String(index + 1).padStart(3, '0')}`,
      description: partial.description || 'Untitled task',
      status: partial.status || 'pending',
      dependencies: partial.dependencies || [],
      parallel: partial.parallel || false,
      estimated: partial.estimated,
      attempts: partial.attempts || 0,
    };
  }

  private parseSpecStatus(status: string): SpecStatus {
    const normalized = status.toLowerCase();
    switch (normalized) {
      case 'draft':
        return 'draft';
      case 'ready':
        return 'ready';
      case 'in_progress':
      case 'in progress':
        return 'in_progress';
      case 'completed':
        return 'completed';
      case 'blocked':
        return 'blocked';
      default:
        return 'draft';
    }
  }

  async updateTaskStatus(specId: string, taskId: string, status: string): Promise<void> {
    const tasksPath = path.join(this.workspacePath, '.specify', 'specs', specId, 'tasks.md');
    let content = await fs.readFile(tasksPath, 'utf-8');

    const taskRegex = new RegExp(`^(-\\s+\\[)[x ]\\](\\s+\\*\\*${taskId}\\*\\*:.+)$`, 'gm');
    const checkbox = status === 'completed' ? 'x' : ' ';

    content = content.replace(taskRegex, `$1${checkbox}$2`);

    await fs.writeFile(tasksPath, content, 'utf-8');
  }
}
