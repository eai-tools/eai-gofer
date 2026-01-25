/**
 * MCP Tool Handler
 *
 * Handles MCP tool invocations from Claude Code or GitHub Copilot
 * via VSCode's native MCP support (1.102+)
 */

import { Connection } from 'vscode-languageserver';
import { GoferLoader, Spec, Task } from '../utils/goferLoader';
import { ValidationService } from '../utils/ValidationService';
import { TestHarnessGenerator } from '../utils/TestHarnessGenerator';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

// Type definitions for MCP tool responses
interface SpecSummary {
  id: string;
  title: string;
  status: string;
  taskCount: number;
  completedTasks: number;
  tasks: Array<{
    id: string;
    description: string;
    status: string;
    dependencies: string[];
  }>;
}

interface GetSpecsResponse {
  success: boolean;
  count?: number;
  specs?: SpecSummary[];
  error?: string;
}

interface GetNextTaskResponse {
  success?: boolean;
  spec?: Partial<Spec> | null;
  task?: Partial<Task> | null;
  message?: string;
  error?: string;
}

interface ExecuteTaskResponse {
  success?: boolean;
  spec?: Spec;
  task?: Task;
  constitution?: string;
  testHarnessPath?: string;
  error?: string;
  errorCode?: string;
}

interface UpdateTaskStatusResponse {
  success: boolean;
  spec?: Spec;
  task?: Task;
  message?: string;
  error?: string;
  errorCode?: string;
}

interface ValidationIssue {
  file: string;
  line?: number;
  severity: 'error' | 'warning';
  message: string;
}

interface ValidateCodeResponse {
  success?: boolean;
  isValid?: boolean;
  files?: string[];
  issues?: ValidationIssue[];
  summary?: string;
  message?: string;
  error?: string;
}

interface TestResult {
  success?: boolean;
  passed?: boolean;
  total?: number;
  passed_count?: number;
  failed_count?: number;
  failed_tests?: string[];
  output?: string;
  message?: string;
  note?: string;
  specId?: string;
  error?: string;
}

export class MCPToolHandler {
  private goferLoader: GoferLoader;
  private anthropic: Anthropic | null = null;
  private validationService: ValidationService | null = null;
  private testHarnessGenerator: TestHarnessGenerator;

  constructor(
    private workspacePath: string,
    private connection: Connection
  ) {
    this.goferLoader = new GoferLoader(workspacePath);
    this.testHarnessGenerator = new TestHarnessGenerator(workspacePath);

    // Initialize Anthropic client if API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      this.validationService = new ValidationService(apiKey, workspacePath);
    }
  }

  /**
   * Log security violations for monitoring
   */
  private logSecurityViolation(message: string, details: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type: 'SECURITY_VIOLATION',
      message,
      details,
      workspacePath: this.workspacePath,
    };

    // Send to stderr for proper logging (don't use console.log/warn in production)
    process.stderr.write(`🔒 Security Violation: ${JSON.stringify(logEntry)}\n`);

    // Send notification to extension for monitoring
    this.connection.sendNotification('gofer/securityViolation', logEntry);
  }

  /**
   * Validate and sanitize spec ID to prevent path traversal attacks
   */
  private validateSpecId(specId: string): { valid: boolean; error?: string } {
    if (!specId || typeof specId !== 'string') {
      this.logSecurityViolation('Invalid specId type', { specId, type: typeof specId });
      return { valid: false, error: 'specId must be a non-empty string' };
    }

    // Check for path traversal attempts
    if (specId.includes('..') || specId.includes('/') || specId.includes('\\')) {
      this.logSecurityViolation('Path traversal attempt in specId', { specId });
      return { valid: false, error: 'specId contains invalid characters (path traversal)' };
    }

    // Check for reasonable length
    if (specId.length > 100) {
      this.logSecurityViolation('SpecId exceeds maximum length', {
        specId: specId.substring(0, 50) + '...',
        length: specId.length,
      });
      return { valid: false, error: 'specId is too long (max 100 characters)' };
    }

    // Validate format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(specId)) {
      this.logSecurityViolation('Invalid characters in specId', { specId });
      return {
        valid: false,
        error: 'specId must contain only alphanumeric characters, hyphens, and underscores',
      };
    }

    return { valid: true };
  }

  /**
   * Validate task ID
   */
  private validateTaskId(taskId: string): { valid: boolean; error?: string } {
    if (!taskId || typeof taskId !== 'string') {
      this.logSecurityViolation('Invalid taskId type', { taskId, type: typeof taskId });
      return { valid: false, error: 'taskId must be a non-empty string' };
    }

    if (taskId.length > 20) {
      this.logSecurityViolation('TaskId exceeds maximum length', {
        taskId: taskId.substring(0, 10) + '...',
        length: taskId.length,
      });
      return { valid: false, error: 'taskId is too long (max 20 characters)' };
    }

    // Allow formats like "T001", "#1", "1"
    if (!/^[#]?\d+$|^[A-Z]\d+$/.test(taskId)) {
      this.logSecurityViolation('Invalid characters in taskId', { taskId });
      return { valid: false, error: 'taskId must match format: T001, #1, or 1' };
    }

    return { valid: true };
  }

  /**
   * MCP Tool: gofer_get_specs
   * Returns all specifications
   */
  async getSpecs(): Promise<GetSpecsResponse> {
    try {
      const specs = await this.goferLoader.loadAllSpecs();

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
   * MCP Tool: gofer_get_next_task
   * Returns the next available task to work on
   */
  async getNextTask(): Promise<GetNextTaskResponse> {
    try {
      const specs = await this.goferLoader.loadAllSpecs();

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
   * MCP Tool: gofer_execute_task
   * Execute a specific task (returns task context for Claude to implement)
   */
  async executeTask(specId: string, taskId: string): Promise<ExecuteTaskResponse> {
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
      const spec = await this.goferLoader.loadSpec(specId);

      if (!spec) {
        return {
          success: false,
          error: `Spec ${specId} not found or could not be loaded`,
          errorCode: 'SPEC_NOT_FOUND',
        };
      }

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
        constitution = await fs.readFile(constitutionPath, 'utf-8');
      } catch {
        // Constitution is optional
      }

      // Generate Test Harness (Phase 3 Improvement) - non-fatal if it fails
      let testHarnessPath: string | undefined;
      try {
        testHarnessPath = await this.testHarnessGenerator.ensureTestHarness(
          specId,
          taskId,
          task.description
        );
      } catch {
        // Test harness generation is optional - don't fail the task
      }

      // Return task context for Claude to implement
      return {
        success: true,
        spec,
        task,
        constitution: constitution ? constitution.substring(0, 2000) : undefined,
        testHarnessPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * MCP Tool: gofer_update_task_status
   * Update the status of a task
   */
  async updateTaskStatus(
    specId: string,
    taskId: string,
    status: string
  ): Promise<UpdateTaskStatusResponse> {
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
      return {
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        errorCode: 'INVALID_STATUS',
      };
    }

    try {
      await this.goferLoader.updateTaskStatus(specId, taskId, status);

      // Notify extension via LSP
      this.connection.sendNotification('gofer/taskProgress', {
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
   * MCP Tool: gofer_validate_code
   * Validate code against constitutional requirements
   */
  async validateCode(files: string[]): Promise<ValidateCodeResponse> {
    if (!this.validationService) {
      return {
        success: false,
        error: 'Validation service not initialized (missing API key)',
        issues: [],
      };
    }

    try {
      const allIssues: ValidationIssue[] = [];
      let allValid = true;

      for (const file of files) {
        // Handle both relative and absolute paths
        const fullPath = path.isAbsolute(file) ? file : path.join(this.workspacePath, file);

        // Use the Constitutional Council to validate
        const result = await this.validationService.validateWithCouncil(fullPath, true);

        if (!result.isValid) {
          allValid = false;
        }

        // Map service issues to tool response issues
        const mappedIssues: ValidationIssue[] = result.issues.map(
          (i: {
            severity?: string;
            category?: string;
            description?: string;
            location?: string;
          }) => {
            // Attempt to parse line number from location (e.g. "L10" or "10:5")
            let line: number | undefined;
            if (i.location) {
              const match = i.location.match(/(\d+)/);
              if (match) {
                line = parseInt(match[1]);
              }
            }

            return {
              file,
              severity: i.severity === 'critical' ? 'error' : 'warning',
              message: `[${i.category}] ${i.description}`,
              line,
            };
          }
        );

        allIssues.push(...mappedIssues);
      }

      return {
        success: true,
        isValid: allValid,
        files: files,
        message: allValid
          ? 'All files approved by the Constitutional Council.'
          : `Political deadlock: Council rejects changes with ${allIssues.filter((i) => i.severity === 'error').length} critical issues.`,
        issues: allIssues,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * MCP Tool: gofer_run_tests
   * Run tests for a specification
   */
  async runTests(specId: string): Promise<TestResult> {
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
