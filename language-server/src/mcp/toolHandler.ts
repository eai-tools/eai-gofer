/**
 * MCP Tool Handler
 *
 * Handles MCP tool invocations from Claude Code or GitHub Copilot
 * via VSCode's native MCP support (1.102+)
 */

import { Connection } from 'vscode-languageserver';
import { SpecKitLoader, Spec, Task } from '../utils/specKitLoader';
import Anthropic from '@anthropic-ai/sdk';

export class MCPToolHandler {
  private specKitLoader: SpecKitLoader;
  private anthropic: Anthropic | null = null;

  constructor(
    private workspacePath: string,
    private connection: Connection
  ) {
    this.specKitLoader = new SpecKitLoader(workspacePath);

    // Initialize Anthropic client if API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  /**
   * Validate and sanitize spec ID to prevent path traversal attacks
   */
  private validateSpecId(specId: string): { valid: boolean; error?: string } {
    if (!specId || typeof specId !== 'string') {
      return { valid: false, error: 'specId must be a non-empty string' };
    }

    // Check for path traversal attempts
    if (specId.includes('..') || specId.includes('/') || specId.includes('\\')) {
      return { valid: false, error: 'specId contains invalid characters (path traversal)' };
    }

    // Check for reasonable length
    if (specId.length > 100) {
      return { valid: false, error: 'specId is too long (max 100 characters)' };
    }

    // Validate format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(specId)) {
      return { valid: false, error: 'specId must contain only alphanumeric characters, hyphens, and underscores' };
    }

    return { valid: true };
  }

  /**
   * Validate task ID
   */
  private validateTaskId(taskId: string): { valid: boolean; error?: string } {
    if (!taskId || typeof taskId !== 'string') {
      return { valid: false, error: 'taskId must be a non-empty string' };
    }

    if (taskId.length > 20) {
      return { valid: false, error: 'taskId is too long (max 20 characters)' };
    }

    // Allow formats like "T001", "#1", "1"
    if (!/^[#]?\d+$|^[A-Z]\d+$/.test(taskId)) {
      return { valid: false, error: 'taskId must match format: T001, #1, or 1' };
    }

    return { valid: true };
  }

  /**
   * MCP Tool: specgofer_get_specs
   * Returns all specifications
   */
  async getSpecs(): Promise<any> {
    try {
      const specs = await this.specKitLoader.loadAllSpecs();

      return {
        success: true,
        count: specs.length,
        specs: specs.map((spec) => ({
          id: spec.id,
          title: spec.title,
          status: spec.status,
          taskCount: spec.tasks.length,
          completedTasks: spec.tasks.filter((t) => t.status === 'completed').length,
          tasks: spec.tasks.map((t) => ({
            id: t.id,
            description: t.description,
            status: t.status,
            dependencies: t.dependencies,
          })),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * MCP Tool: specgofer_get_next_task
   * Returns the next available task to work on
   */
  async getNextTask(): Promise<any> {
    try {
      const specs = await this.specKitLoader.loadAllSpecs();

      // Find first in_progress task
      for (const spec of specs) {
        for (const task of spec.tasks) {
          if (task.status === 'in_progress') {
            return {
              success: true,
              spec: {
                id: spec.id,
                title: spec.title,
                description: spec.description,
              },
              task: {
                id: task.id,
                description: task.description,
                status: task.status,
                dependencies: task.dependencies,
                attempts: task.attempts,
              },
            };
          }
        }
      }

      // Find first pending task with dependencies met
      for (const spec of specs) {
        for (const task of spec.tasks) {
          if (task.status === 'pending' && this.areDependenciesMet(spec, task)) {
            return {
              success: true,
              spec: {
                id: spec.id,
                title: spec.title,
                description: spec.description,
              },
              task: {
                id: task.id,
                description: task.description,
                status: task.status,
                dependencies: task.dependencies,
                attempts: task.attempts,
              },
            };
          }
        }
      }

      return {
        success: true,
        message: 'No tasks available',
        task: null,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

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
   * MCP Tool: specgofer_execute_task
   * Execute a specific task (returns task context for Claude to implement)
   */
  async executeTask(specId: string, taskId: string): Promise<any> {
    // Validate inputs
    const specValidation = this.validateSpecId(specId);
    if (!specValidation.valid) {
      return { success: false, error: specValidation.error, errorCode: 'INVALID_SPEC_ID' };
    }

    const taskValidation = this.validateTaskId(taskId);
    if (!taskValidation.valid) {
      return { success: false, error: taskValidation.error, errorCode: 'INVALID_TASK_ID' };
    }

    try {
      const spec = await this.specKitLoader.loadSpec(specId);
      const task = spec.tasks.find((t) => t.id === taskId);

      if (!task) {
        return {
          success: false,
          error: `Task ${taskId} not found in spec ${specId}`,
        };
      }

      // Check dependencies
      if (!this.areDependenciesMet(spec, task)) {
        return {
          success: false,
          error: `Task ${taskId} has unmet dependencies: ${task.dependencies.join(', ')}`,
        };
      }

      // Load constitution for context
      const constitutionPath = `${this.workspacePath}/.specify/memory/constitution.md`;
      let constitution = '';
      try {
        const fs = require('fs').promises;
        constitution = await fs.readFile(constitutionPath, 'utf-8');
      } catch {
        // Constitution is optional
      }

      // Return task context for Claude to implement
      return {
        success: true,
        message: 'Task ready for implementation',
        context: {
          spec: {
            id: spec.id,
            title: spec.title,
            description: spec.description,
          },
          task: {
            id: task.id,
            description: task.description,
            status: task.status,
            dependencies: task.dependencies,
            estimated: task.estimated,
          },
          constitution: constitution ? constitution.substring(0, 2000) : undefined,
          instructions: `Please implement the following task:\n\n**Task ${task.id}:** ${task.description}\n\n**Spec:** ${spec.title}\n${spec.description}\n\nFollow TDD principles: write tests first, then implementation.\nEnsure code quality according to the constitutional requirements.`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * MCP Tool: specgofer_update_task_status
   * Update the status of a task
   */
  async updateTaskStatus(specId: string, taskId: string, status: string): Promise<any> {
    // Validate inputs
    const specValidation = this.validateSpecId(specId);
    if (!specValidation.valid) {
      return { success: false, error: specValidation.error, errorCode: 'INVALID_SPEC_ID' };
    }

    const taskValidation = this.validateTaskId(taskId);
    if (!taskValidation.valid) {
      return { success: false, error: taskValidation.error, errorCode: 'INVALID_TASK_ID' };
    }

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'failed'];
    if (!validStatuses.includes(status)) {
      return { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`, errorCode: 'INVALID_STATUS' };
    }

    try {
      await this.specKitLoader.updateTaskStatus(specId, taskId, status);

      // Notify extension via LSP
      this.connection.sendNotification('specKit/taskProgress', {
        specId,
        taskId,
        status,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Task ${taskId} status updated to ${status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * MCP Tool: specgofer_validate_code
   * Validate code against constitutional requirements
   */
  async validateCode(files: string[]): Promise<any> {
    try {
      // Placeholder for constitutional validation
      // Full implementation will use ESLint, TypeScript compiler, coverage tools, etc.

      return {
        success: true,
        message: 'Validation not yet implemented',
        note: 'Constitutional validation will be implemented in Phase 2',
        files,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * MCP Tool: specgofer_run_tests
   * Run tests for a specification
   */
  async runTests(specId: string): Promise<any> {
    try {
      // Placeholder for test runner
      // Full implementation will detect framework and run tests

      return {
        success: true,
        message: 'Test runner not yet implemented',
        note: 'Test runner will be implemented in Phase 3',
        specId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
