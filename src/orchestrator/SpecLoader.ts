import fs from 'fs/promises';
import path from 'path';
import { Spec } from '../types.js';

export class SpecLoader {
  private specDir: string;

  constructor(specDir: string = '.specify/specs') {
    this.specDir = specDir;
  }

  async loadAllSpecs(): Promise<Spec[]> {
    try {
      // Check if it's the new Spec Kit format (.specify/specs/)
      if (this.specDir.endsWith('/specs') || this.specDir.endsWith('/specs/')) {
        return this.loadSpecKitSpecs();
      }
      
      // Fallback to legacy JSON format for backwards compatibility
      return this.loadLegacyJsonSpecs();
    } catch (error) {
      console.error('Error loading specs:', error);
      return [];
    }
  }

  /**
   * Load specs from GitHub Spec Kit format (.specify/specs/)
   */
  private async loadSpecKitSpecs(): Promise<Spec[]> {
    try {
      const entries = await fs.readdir(this.specDir, { withFileTypes: true });
      const specDirs = entries.filter((e) => e.isDirectory());

      const specs = await Promise.all(
        specDirs.map(async (dir) => {
          try {
            return await this.loadSpecKitSpec(dir.name);
          } catch (error) {
            console.error(`Failed to load spec ${dir.name}:`, error);
            return null;
          }
        })
      );

      return specs.filter((s): s is Spec => s !== null);
    } catch (error) {
      console.error('Error loading Spec Kit specs:', error);
      return [];
    }
  }

  /**
   * Parse header metadata from official GitHub Spec Kit format
   */
  private parseSpecHeader(content: string): { metadata: any; content: string } {
    const lines = content.split('\n');
    const metadata: any = {};
    let contentStartIndex = 0;

    // Extract title from first line
    const titleMatch = lines[0]?.match(/^#\s*(?:Feature Specification:\s*)?(.+)$/);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
      contentStartIndex = 1;
    }

    // Parse metadata lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        contentStartIndex = i + 1;
        continue;
      }

      // Stop parsing metadata when we hit a markdown header
      if (line.startsWith('#')) {
        contentStartIndex = i;
        break;
      }

      // Parse metadata fields
      const featureBranchMatch = line.match(/^Feature Branch:\s*`?([^`]+)`?$/);
      if (featureBranchMatch) {
        metadata.branch = featureBranchMatch[1];
        continue;
      }

      const createdMatch = line.match(/^Created:\s*(.+)$/);
      if (createdMatch) {
        metadata.created = createdMatch[1];
        continue;
      }

      const statusMatch = line.match(/^Status:\s*(.+)$/);
      if (statusMatch) {
        metadata.status = statusMatch[1];
        continue;
      }

      const inputMatch = line.match(/^Input:\s*(.+)$/);
      if (inputMatch) {
        metadata.input = inputMatch[1];
        continue;
      }
    }

    const bodyContent = lines.slice(contentStartIndex).join('\n').trim();
    return { metadata, content: bodyContent };
  }

  /**
   * Load a single spec from Spec Kit format
   */
  private async loadSpecKitSpec(specId: string): Promise<Spec | null> {
    const specPath = path.join(this.specDir, specId, 'spec.md');
    
    try {
      const content = await fs.readFile(specPath, 'utf-8');
      
      // Try YAML frontmatter first (legacy format)
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
      let frontmatter: any = {};
      let markdownContent: string;

      if (yamlMatch) {
        // Legacy YAML frontmatter format
        const frontmatterText = yamlMatch[1];
        markdownContent = content.slice(yamlMatch[0].length).trim();

        // Simple YAML parsing for basic fields
        const yamlLines = frontmatterText.split('\n');
        for (const line of yamlLines) {
          const match = line.match(/^([^:]+):\s*"?([^"]*)"?$/);
          if (match) {
            frontmatter[match[1].trim()] = match[2].trim();
          }
        }
      } else {
        // Official GitHub Spec Kit format
        const { metadata, content: bodyContent } = this.parseSpecHeader(content);
        frontmatter = {
          id: metadata.branch || specId,
          title: metadata.title || 'Untitled',
          status: metadata.status || 'draft',
          created: metadata.created || new Date().toISOString(),
        };
        markdownContent = bodyContent;
      }

      // Load tasks if they exist
      const tasks = await this.loadSpecKitTasks(specId);

      return {
        id: frontmatter.id || specId,
        title: frontmatter.title || 'Untitled',
        status: frontmatter.status || 'draft',
        created: frontmatter.created || new Date().toISOString(),
        featureBranch: frontmatter.branch || frontmatter.id,
        description: markdownContent.split('\n').slice(0, 3).join('\n'),
        tasks: tasks,
        acceptanceCriteria: [], // TODO: Parse from spec content if needed
        qaRules: []
      };
    } catch (error) {
      console.error(`Failed to load spec ${specId}:`, error);
      return null;
    }
  }

  /**
   * Load tasks from tasks.md file
   */
  private async loadSpecKitTasks(specId: string): Promise<any[]> {
    const tasksPath = path.join(this.specDir, specId, 'tasks.md');
    
    try {
      const content = await fs.readFile(tasksPath, 'utf-8');
      const tasks: any[] = [];

      // Parse task lines (simple implementation)
      const lines = content.split('\n');
      for (const line of lines) {
        const taskMatch = line.match(/^- \[([x ])\] (.+)/);
        if (taskMatch) {
          const isCompleted = taskMatch[1] === 'x';
          const description = taskMatch[2];
          
          tasks.push({
            id: `task-${tasks.length + 1}`,
            description,
            status: isCompleted ? 'completed' : 'pending',
            dependencies: [],
            deliveryPrompt: description
          });
        }
      }

      return tasks;
    } catch (error) {
      // Tasks file is optional
      return [];
    }
  }

  /**
   * Legacy JSON format loader (backwards compatibility)
   */
  private async loadLegacyJsonSpecs(): Promise<Spec[]> {
    try {
      const files = await fs.readdir(this.specDir);
      const specFiles = files.filter(f => f.endsWith('.json') && f !== 'spec-schema.json');

      const specs = await Promise.all(
        specFiles.map(async (file) => {
          const content = await fs.readFile(path.join(this.specDir, file), 'utf-8');
          return JSON.parse(content) as Spec;
        })
      );

      return specs;
    } catch (error) {
      console.error('Error loading legacy JSON specs:', error);
      return [];
    }
  }

  async loadSpec(specId: string): Promise<Spec | null> {
    if (this.specDir.endsWith('/specs') || this.specDir.endsWith('/specs/')) {
      return this.loadSpecKitSpec(specId);
    } else {
      // Legacy JSON format - load from all specs
      try {
        const specs = await this.loadAllSpecs();
        return specs.find(s => s.id === specId) || null;
      } catch (error) {
        console.error(`Error loading spec ${specId}:`, error);
        return null;
      }
    }
  }

  async saveSpec(spec: Spec): Promise<void> {
    if (this.specDir.endsWith('/specs') || this.specDir.endsWith('/specs/')) {
      // For Spec Kit format, we would need to update tasks.md
      // This is a complex operation, so for now we'll log a warning
      console.warn('Saving Spec Kit format specs is not fully implemented. Task status updates will be ignored.');
    } else {
      // Legacy JSON format
      const filePath = path.join(this.specDir, `${spec.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(spec, null, 2));
    }
  }

  async updateTaskStatus(specId: string, taskId: string, status: Spec['tasks'][0]['status']): Promise<void> {
    if (this.specDir.endsWith('/specs') || this.specDir.endsWith('/specs/')) {
      // For Spec Kit format, we would need to update the checkbox in tasks.md
      // This is complex as it requires markdown parsing and rewriting
      console.warn(`Task status update for ${specId}:${taskId} -> ${status} (Spec Kit format updates not fully implemented)`);
    } else {
      // Legacy JSON format
      const spec = await this.loadSpec(specId);
      if (!spec) throw new Error(`Spec ${specId} not found`);

      const task = spec.tasks.find(t => t.id === taskId);
      if (!task) throw new Error(`Task ${taskId} not found in spec ${specId}`);

      task.status = status;
      await this.saveSpec(spec);
    }
  }
}

// Standalone function for backwards compatibility
export async function loadSpecs(): Promise<Spec[]> {
  const loader = new SpecLoader();
  return loader.loadAllSpecs();
}
