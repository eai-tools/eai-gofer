/**
 * Gofer Markdown Parser
 *
 * Parses Gofer Markdown files:
 * - spec.md (with YAML frontmatter)
 * - tasks.md (Markdown task lists with checkboxes)
 * - plan.md (technical plan)
 *
 * Converts to structured data for use by ProgressProvider and LSP
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { Logger } from './utils/logger';
import { TIMEOUTS } from './config/timeouts';

export interface Spec {
  id: string; // "001-login-feature"
  title: string;
  description: string;
  status: SpecStatus;
  created: Date;
  updated: Date;
  author?: string;
  tasks: Task[];
  plan?: TechnicalPlan;
  dependencies: string[]; // Spec IDs this depends on
}

export type SpecStatus = 'draft' | 'ready' | 'in_progress' | 'completed' | 'blocked';

export interface Task {
  id: string; // "T001", "T002", etc.
  description: string;
  status: TaskStatus;
  dependencies: string[]; // Task IDs this depends on
  parallel: boolean; // [P] marker = can run in parallel
  estimated?: string; // "2 hours", "1 day", etc.
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

export interface YAMLFrontmatter {
  // Modern format (preferred)
  id?: string;
  title?: string;
  status: string;
  created: string;
  updated: string;
  priority?: string;
  assignee?: string;
  dependencies?: string[];

  // Legacy format (for backward compatibility)
  feature?: string;
  author?: string;
}

/**
 * GoferParser - Parses Gofer format
 */
export class GoferParser {
  private readonly logger = Logger.for('GoferParser');

  constructor(
    private workspacePath: string,
    private branchSpecManager?: any
  ) {}

  /**
   * Load all specs from .specify/specs/ directory
   * If branchSpecManager is provided, loads branch-aware specs
   */
  async loadAllSpecs(): Promise<Spec[]> {
    this.logger.info('loadAllSpecs starting...');
    let specsDirs: string[];

    try {
      if (this.branchSpecManager) {
        // Get branch-aware spec paths with timeout protection
        this.logger.debug('Using branchSpecManager to get spec paths...');
        const getPathsPromise = this.branchSpecManager.getAllSpecPaths();
        const timeoutPromise = new Promise<string[]>((_, reject) => {
          setTimeout(() => reject(new Error('getAllSpecPaths timed out')), TIMEOUTS.SPEC_DIR_DISCOVERY_TIMEOUT);
        });
        specsDirs = await Promise.race([getPathsPromise, timeoutPromise]);
      } else {
        // Fallback to simple .specify/specs with timeout protection
        this.logger.debug('Reading specs directory directly...');
        const specsDir = path.join(this.workspacePath, '.specify', 'specs');

        // Timeout for directory reading (2 seconds)
        const readdirPromise = fs.readdir(specsDir, { withFileTypes: true });
        const readdirTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('readdir timed out')), TIMEOUTS.SPEC_DIR_READ_TIMEOUT);
        });
        const entries = await Promise.race([readdirPromise, readdirTimeout]);
        specsDirs = entries
          .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
          .map((e) => path.join(specsDir, e.name));
      }
      this.logger.debug(`Found ${specsDirs.length} spec directories`);

      // Early return if no specs
      if (specsDirs.length === 0) {
        this.logger.debug('No spec directories found, returning empty');
        return [];
      }
    } catch (error) {
      this.logger.error('Failed to get specs directories:', error as Error);
      return [];
    }

    // Load specs with per-spec timeout
    const specs = await Promise.all(
      specsDirs.map(async (specPath) => {
        try {
          const specId = path.basename(specPath);
          const loadPromise = this.loadSpecFromPath(specId, specPath);
          const loadTimeout = new Promise<null>((resolve) => {
            setTimeout(() => {
              this.logger.warn(`Spec ${specId} load timed out`);
              resolve(null);
            }, TIMEOUTS.SPEC_LOAD_TIMEOUT);
          });
          return await Promise.race([loadPromise, loadTimeout]);
        } catch (error) {
          this.logger.error(`Failed to load spec ${specPath}:`, error as Error);
          return null;
        }
      })
    );

    this.logger.info(`Loaded ${specs.filter(Boolean).length} specs successfully`);
    return specs.filter((s): s is Spec => s !== null);
  }

  /**
   * Validate spec ID to prevent path traversal attacks
   * @param specId - e.g., "001-login-feature"
   */
  private validateSpecId(specId: string): void {
    // Check for path traversal attempts
    if (specId.includes('..') || specId.includes('/') || specId.includes('\\')) {
      throw new Error(
        `Invalid spec ID: ${specId}. Spec IDs cannot contain path traversal characters.`
      );
    }

    // Check for valid characters (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(specId)) {
      throw new Error(
        `Invalid spec ID: ${specId}. Spec IDs can only contain alphanumeric characters, hyphens, and underscores.`
      );
    }

    // Check length
    if (specId.length > 100) {
      throw new Error(`Invalid spec ID: ${specId}. Spec IDs must be 100 characters or less.`);
    }
  }

  /**
   * Load a single spec by ID
   * @param specId - e.g., "001-login-feature"
   */
  async loadSpec(specId: string): Promise<Spec> {
    this.validateSpecId(specId);
    const specDir = path.join(this.workspacePath, '.specify', 'specs', specId);
    return this.loadSpecFromPath(specId, specDir);
  }

  /**
   * Load a single spec from a specific path
   * @param specId - e.g., "001-login-feature"
   * @param specDir - full path to spec directory
   */
  private async loadSpecFromPath(specId: string, specDir: string): Promise<Spec> {
    // Validate spec ID even when loading from path
    this.validateSpecId(specId);

    const specPath = path.join(specDir, 'spec.md');
    const tasksPath = path.join(specDir, 'tasks.md');
    const planPath = path.join(specDir, 'plan.md');

    // Parse spec.md (required)
    const specContent = await fs.readFile(specPath, 'utf-8');
    const { frontmatter, content } = this.parseFrontmatter(specContent);

    // Parse tasks.md (optional - may not exist yet)
    let tasks: Task[] = [];
    try {
      const tasksContent = await fs.readFile(tasksPath, 'utf-8');
      tasks = this.parseTasks(tasksContent);
    } catch {
      // Tasks file is optional
      this.logger.debug(`No tasks.md found for spec ${specId}`);
    }

    // Parse plan.md (optional)
    let plan: TechnicalPlan | undefined;
    try {
      const planContent = await fs.readFile(planPath, 'utf-8');
      plan = this.parsePlan(planContent);
    } catch {
      // Plan is optional
      this.logger.debug(`No plan.md found for spec ${specId}`);
    }

    return {
      id: specId,
      // Prefer modern format (title), fallback to legacy (feature), then specId
      title: frontmatter.title || frontmatter.feature || specId,
      description: content,
      status: this.parseSpecStatus(frontmatter.status),
      created: new Date(frontmatter.created),
      updated: new Date(frontmatter.updated),
      author: frontmatter.author || frontmatter.assignee,
      tasks,
      plan,
      dependencies: frontmatter.dependencies || [],
    };
  }

  /**
   * Parse header metadata from official Gofer format
   *
   * Example:
   * # Feature Specification: My Feature
   * Feature Branch: `001-my-feature`
   * Created: 2025-01-01
   * Status: Draft
   * Input: User description: "Build a feature"
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

      // If we hit a non-metadata line, start content from here
      contentStartIndex = i;
      break;
    }

    const bodyContent = lines.slice(contentStartIndex).join('\n').trim();
    return { metadata, content: bodyContent };
  }

  /**
   * Parse YAML frontmatter from Markdown (legacy support)
   */
  private parseFrontmatter(content: string): { frontmatter: YAMLFrontmatter; content: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      // Try to parse as official Gofer format
      const { metadata, content: bodyContent } = this.parseSpecHeader(content);

      // Convert to legacy format for compatibility
      const frontmatter: YAMLFrontmatter = {
        feature: metadata.title || 'Unknown Feature',
        status: metadata.status || 'draft',
        created: metadata.created || new Date().toISOString(),
        updated: metadata.created || new Date().toISOString(),
        author: undefined,
        dependencies: [],
      };

      return { frontmatter, content: bodyContent };
    }

    const frontmatter = yaml.parse(match[1]) as YAMLFrontmatter;
    const bodyContent = match[2].trim();

    return { frontmatter, content: bodyContent };
  }

  /**
   * Parse tasks.md Markdown task list
   *
   * Example format:
   * - [ ] **T001**: Create login form component
   *   - Dependencies: None
   *   - Estimated: 2 hours
   *   - [P] Can run in parallel
   *
   * - [x] **T002**: Add form validation
   *   - Dependencies: T001
   *
   * Also supports simple format:
   * - [ ] #1 Create calculator.ts module structure
   */
  private parseTasks(content: string): Task[] {
    const tasks: Task[] = [];
    const lines = content.split('\n');

    let currentTask: Partial<Task> | null = null;
    let taskIndex = 0;

    for (const line of lines) {
      // Match task line with **T001** prefix: - [ ] **T001**: Description
      let taskMatch = line.match(/^-\s+\[([x ])\]\s+\*\*([A-Z]\d+)\*\*:\s+(.+)$/);
      if (taskMatch) {
        // Save previous task if exists
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

      // Match task line with #T001 prefix: - [ ] #T001 Description
      taskMatch = line.match(/^-\s+\[([x ])\]\s+#(T\d+)\s+(.+)$/);
      if (taskMatch) {
        // Save previous task if exists
        if (currentTask && currentTask.id) {
          tasks.push(this.completeTask(currentTask, taskIndex++));
        }

        const [, checkbox, taskId, description] = taskMatch;
        currentTask = {
          id: taskId,
          description: description.trim(),
          status: checkbox === 'x' ? 'completed' : 'pending',
          dependencies: [],
          parallel: false,
          attempts: 0,
        };
        continue;
      }

      // Match task line with T001 prefix (no #): - [ ] T001 Description
      // Also handles inline tags like [P] and [US1]: - [ ] T001 [P] [US1] Description
      taskMatch = line.match(/^-\s+\[([xX ])\]\s+(T\d+)\s+(.+)$/);
      if (taskMatch) {
        // Save previous task if exists
        if (currentTask && currentTask.id) {
          tasks.push(this.completeTask(currentTask, taskIndex++));
        }

        const [, checkbox, taskId, fullDescription] = taskMatch;

        // Extract inline tags ([P], [US1], etc.) and check for parallel marker
        const hasParallelTag = fullDescription.includes('[P]');

        // Remove inline tags from description for cleaner display
        // Note: Don't include taskId here as getTaskDescription() adds it in the tree view
        const cleanDescription = fullDescription
          .replace(/\[P\]\s*/g, '')
          .replace(/\[US\d+\]\s*/g, '')
          .trim();

        currentTask = {
          id: taskId,
          description: cleanDescription,
          status: checkbox.toLowerCase() === 'x' ? 'completed' : 'pending',
          dependencies: [],
          parallel: hasParallelTag,
          attempts: 0,
        };
        continue;
      }

      // Match task line with #N prefix: - [ ] #1 Description
      taskMatch = line.match(/^-\s+\[([x ])\]\s+#(\d+)\s+(.+)$/);
      if (taskMatch) {
        // Save previous task if exists
        if (currentTask && currentTask.id) {
          tasks.push(this.completeTask(currentTask, taskIndex++));
        }

        const [, checkbox, taskNum, description] = taskMatch;
        currentTask = {
          id: `T${taskNum.padStart(3, '0')}`,
          description: description.trim(),
          status: checkbox === 'x' ? 'completed' : 'pending',
          dependencies: [],
          parallel: false,
          attempts: 0,
        };
        continue;
      }

      // Parse task metadata (indented lines)
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

        // Check for [P] parallel marker
        if (line.includes('[P]')) {
          currentTask.parallel = true;
          continue;
        }
      }
    }

    // Save last task
    if (currentTask && currentTask.id) {
      tasks.push(this.completeTask(currentTask, taskIndex));
    }

    return tasks;
  }

  /**
   * Complete task object with required fields
   */
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

  /**
   * Parse plan.md for technical details
   */
  private parsePlan(content: string): TechnicalPlan {
    const plan: TechnicalPlan = {
      techStack: [],
      architecture: '',
      testingApproach: '',
      dependencies: [],
      risks: [],
    };

    // Extract sections using headers
    const sections = this.extractSections(content);

    // Tech Stack
    if (sections['Tech Stack'] || sections['Technology Stack']) {
      plan.techStack = this.extractListItems(
        sections['Tech Stack'] || sections['Technology Stack']
      );
    }

    // Architecture
    if (sections['Architecture']) {
      plan.architecture = sections['Architecture'].trim();
    }

    // Testing
    if (sections['Testing'] || sections['Testing Approach']) {
      plan.testingApproach = sections['Testing'] || sections['Testing Approach'];
    }

    // Dependencies
    if (sections['Dependencies']) {
      plan.dependencies = this.extractListItems(sections['Dependencies']);
    }

    // Risks
    if (sections['Risks'] || sections['Known Risks']) {
      plan.risks = this.extractListItems(sections['Risks'] || sections['Known Risks']);
    }

    return plan;
  }

  /**
   * Extract Markdown sections by header
   */
  private extractSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = content.split('\n');

    let currentSection: string | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      // Match headers: ## Section Name or ### Section Name
      const headerMatch = line.match(/^#{2,3}\s+(.+)$/);
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = headerMatch[1].trim();
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  }

  /**
   * Extract list items from Markdown content
   */
  private extractListItems(content: string): string[] {
    const items: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^[-*]\s+(.+)$/);
      if (match) {
        items.push(match[1].trim());
      }
    }

    return items;
  }

  /**
   * Parse spec status from string
   */
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

  /**
   * Update task status in tasks.md file
   */
  async updateTaskStatus(specId: string, taskId: string, status: TaskStatus): Promise<void> {
    const tasksPath = path.join(this.workspacePath, '.specify', 'specs', specId, 'tasks.md');
    let content = await fs.readFile(tasksPath, 'utf-8');

    // Find task line and update checkbox
    const taskRegex = new RegExp(`^(-\\s+\\[)[x ]\\](\\s+\\*\\*${taskId}\\*\\*:.+)$`, 'gm');
    const checkbox = status === 'completed' ? 'x' : ' ';

    content = content.replace(taskRegex, `$1${checkbox}$2`);

    await fs.writeFile(tasksPath, content, 'utf-8');
  }

  /**
   * Update spec status in spec.md frontmatter
   */
  async updateSpecStatus(specId: string, status: SpecStatus): Promise<void> {
    const specPath = path.join(this.workspacePath, '.specify', 'specs', specId, 'spec.md');
    let content = await fs.readFile(specPath, 'utf-8');

    // Update status in frontmatter
    content = content.replace(/^status:\s*.+$/m, `status: ${status}`);
    // Update timestamp
    content = content.replace(/^updated:\s*.+$/m, `updated: ${new Date().toISOString()}`);

    await fs.writeFile(specPath, content, 'utf-8');
  }
}
