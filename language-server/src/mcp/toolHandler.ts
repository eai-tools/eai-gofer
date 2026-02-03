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
import { ResearchChunker } from '../utils/ResearchChunker';
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
  // Additive fields from enriched context bridge (Spec 013 Phase 3)
  memories?: string;
  hints?: string;
  researchChunks?: string;
  memoryCoverage?: {
    coveragePercent: number;
    memoriesLoaded: number;
    researchLoadedForGaps: boolean;
  };
}

/** Shape of the enriched context bridge file */
interface EnrichedContextBridge {
  timestamp: number;
  specId: string;
  taskId: string;
  sections: {
    constitution?: string;
    hints?: string;
    memories?: string;
    research?: string;
  };
  memoryCoverage?: {
    coveredKeywords: string[];
    uncoveredKeywords: string[];
    coveragePercent: number;
    memoriesLoaded: number;
    researchLoadedForGaps: boolean;
    researchTriggers: string[];
  };
  budgetUsage?: Record<string, unknown>;
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

// ─────────────────────────────────────────────────────────────────────────────
// Context Health Enhancement Types (spec 011)
// ─────────────────────────────────────────────────────────────────────────────

interface ObservationData {
  id: string;
  type: 'file_read' | 'command_output' | 'api_response' | 'search_result' | 'test_output';
  timestamp: number;
  turnNumber: number;
  tokenEstimate: number;
  content: string;
  metadata?: Record<string, unknown>;
}

interface ExpandObservationResponse {
  success: boolean;
  observation?: ObservationData;
  error?: string;
  errorCode?: string;
}

interface ContextHealthResponse {
  success: boolean;
  health?: {
    status: 'healthy' | 'warning' | 'critical';
    utilizationPercent: number;
    tokensUsed: number;
    tokensLimit: number;
    breakdown?: {
      specArtifacts: number;
      memories: number;
      hints: number;
      observations: number;
      systemFiles: number;
      conversation: number;
    };
    recommendations: string[];
    timestamp: number;
    // Real context monitoring fields (Spec 014 T042)
    dataSource?: 'real' | 'estimated' | 'none';
    model?: string;
    sessionId?: string;
  };
  error?: string;
}

interface ResearchChunkData {
  id: string;
  sectionTitle: string;
  content: string;
  tokenEstimate: number;
  relevanceKeywords: string[];
  order: number;
}

interface ResearchIndexResponse {
  success: boolean;
  index?: {
    sourceFile: string;
    totalTokens: number;
    chunkCount: number;
    created: number;
    chunks: Array<{
      id: string;
      title: string;
      tokens: number;
      keywords: string[];
    }>;
  };
  error?: string;
  errorCode?: string;
}

interface LoadResearchChunkResponse {
  success: boolean;
  chunk?: ResearchChunkData;
  error?: string;
  errorCode?: string;
}

interface TriggerHandoffResponse {
  success: boolean;
  handoff?: {
    file: string;
    created: number;
    contextSnapshot: {
      tokensUsed: number;
      utilizationPercent: number;
      completedTasks: string[];
      currentTask?: string;
      stage: string;
    };
    resumeCommand: string;
  };
  error?: string;
  errorCode?: string;
}

export class MCPToolHandler {
  private goferLoader: GoferLoader;
  private anthropic: Anthropic | null = null;
  private validationService: ValidationService | null = null;
  private testHarnessGenerator: TestHarnessGenerator;
  private researchChunker: ResearchChunker;

  constructor(
    private workspacePath: string,
    private connection: Connection
  ) {
    this.goferLoader = new GoferLoader(workspacePath);
    this.testHarnessGenerator = new TestHarnessGenerator(workspacePath);
    this.researchChunker = new ResearchChunker(workspacePath);

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

  /**
   * Read enriched context from bridge file with 60-second freshness check.
   * Returns null if file doesn't exist, is stale, or can't be read.
   */
  private async readEnrichedContext(): Promise<EnrichedContextBridge | null> {
    try {
      const bridgePath = path.join(
        this.workspacePath,
        '.specify',
        'memory',
        'enriched-context.json'
      );
      const content = await fs.readFile(bridgePath, 'utf-8');
      const bridge: EnrichedContextBridge = JSON.parse(content);

      // Freshness check: ignore data older than 60 seconds
      if (Date.now() - bridge.timestamp > 60000) {
        return null;
      }

      return bridge;
    } catch {
      // File doesn't exist or can't be parsed — graceful fallback
      return null;
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

      // Try to read enriched context from bridge file (Spec 013 Phase 3)
      const enriched = await this.readEnrichedContext();

      // Build response with enriched data if available
      const response: ExecuteTaskResponse = {
        success: true,
        spec,
        task,
        constitution:
          enriched?.sections.constitution ||
          (constitution ? constitution.substring(0, 2000) : undefined),
        testHarnessPath,
      };

      // Add enriched fields if bridge data is fresh (T025, T026)
      if (enriched) {
        response.memories = enriched.sections.memories;
        response.hints = enriched.sections.hints;
        response.researchChunks = enriched.sections.research;
        if (enriched.memoryCoverage) {
          response.memoryCoverage = {
            coveragePercent: enriched.memoryCoverage.coveragePercent,
            memoriesLoaded: enriched.memoryCoverage.memoriesLoaded,
            researchLoadedForGaps: enriched.memoryCoverage.researchLoadedForGaps,
          };
        }
      }

      return response;
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Context Health Enhancement Tools (spec 011)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Validate observation ID format (UUID v4)
   */
  private validateObservationId(observationId: string): { valid: boolean; error?: string } {
    if (!observationId || typeof observationId !== 'string') {
      return { valid: false, error: 'observationId must be a non-empty string' };
    }

    // UUID v4 format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(observationId)) {
      this.logSecurityViolation('Invalid observation ID format', { observationId });
      return { valid: false, error: 'observationId must be a valid UUID v4' };
    }

    return { valid: true };
  }

  /**
   * MCP Tool: gofer_expand_observation
   * Retrieves the full content of a masked observation
   */
  async expandObservation(observationId: string): Promise<ExpandObservationResponse> {
    try {
      // Validate observation ID
      const validation = this.validateObservationId(observationId);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          errorCode: 'INVALID_OBSERVATION_ID',
        };
      }

      // Look up observation in cache
      const cachePath = path.join(
        this.workspacePath,
        '.specify',
        'memory',
        'observation-cache',
        'index.json'
      );

      try {
        const cacheContent = await fs.readFile(cachePath, 'utf-8');
        const cache = JSON.parse(cacheContent) as {
          version: number;
          observations: Array<{
            id: string;
            type: 'file_read' | 'command_output' | 'api_response' | 'search_result' | 'test_output';
            timestamp: number;
            turnNumber: number;
            tokenEstimate: number;
            originalContent: string;
            metadata?: Record<string, unknown>;
          }>;
        };

        const observation = cache.observations.find((o) => o.id === observationId);
        if (!observation) {
          return {
            success: false,
            error: 'Observation not found',
            errorCode: 'OBSERVATION_NOT_FOUND',
          };
        }

        return {
          success: true,
          observation: {
            id: observation.id,
            type: observation.type,
            timestamp: observation.timestamp,
            turnNumber: observation.turnNumber,
            tokenEstimate: observation.tokenEstimate,
            content: observation.originalContent,
            metadata: observation.metadata,
          },
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return {
            success: false,
            error: 'Observation cache not found',
            errorCode: 'CACHE_ERROR',
          };
        }
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CACHE_ERROR',
      };
    }
  }

  /**
   * MCP Tool: gofer_get_context_health
   * Returns the current context health status with breakdown
   *
   * Reads from extension-written state file first (Spec 012),
   * falls back to file-based calculation if state is stale or missing.
   */
  async getContextHealth(includeBreakdown: boolean = true): Promise<ContextHealthResponse> {
    try {
      // Try to read real state from extension (Spec 012)
      const stateFile = path.join(this.workspacePath, '.specify/memory/context-health-state.json');
      try {
        const stateContent = await fs.readFile(stateFile, 'utf-8');
        const state = JSON.parse(stateContent);

        // Check if state is fresh (within last 30 seconds)
        if (Date.now() - state.timestamp < 30000) {
          return {
            success: true,
            health: {
              status: state.status,
              utilizationPercent: Math.round(state.utilizationPercent * 10) / 10,
              tokensUsed: state.tokensUsed,
              tokensLimit: state.tokensLimit,
              breakdown: includeBreakdown ? state.breakdown : undefined,
              recommendations: state.recommendations || [],
              timestamp: state.timestamp,
              // Real context monitoring fields (Spec 014 T042)
              dataSource: state.dataSource,
              model: state.model,
              sessionId: state.sessionId,
            },
          };
        }
      } catch {
        // State file doesn't exist or is invalid, fall through to calculation
      }

      // Fallback: calculate from file sizes (similar to check-context-health.sh)
      return this.calculateContextHealthFromFiles(includeBreakdown);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate context health from file sizes.
   * Fallback when extension state is not available.
   */
  private async calculateContextHealthFromFiles(
    includeBreakdown: boolean
  ): Promise<ContextHealthResponse> {
    const effectiveLimit = 120000;

    // Calculate token estimates from files
    const breakdown = {
      specArtifacts: await this.estimateTokensFromGlob('.specify/specs/**/*.md'),
      memories: await this.estimateTokensFromGlob('.specify/memory/**/*.md'),
      hints: await this.estimateTokensFromFile('hints.md'),
      observations: 0, // Cannot calculate without runtime state
      systemFiles:
        (await this.estimateTokensFromFile('CLAUDE.md')) +
        (await this.estimateTokensFromFile('AGENTS.md')) +
        (await this.estimateTokensFromFile('.specify/memory/constitution.md')),
      conversation: 0, // Cannot calculate without runtime state
    };

    const tokensUsed = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const utilizationPercent = (tokensUsed / effectiveLimit) * 100;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (utilizationPercent >= 70) {
      status = 'critical';
    } else if (utilizationPercent >= 50) {
      status = 'warning';
    }

    const recommendations: string[] = [];
    if (status === 'warning') {
      recommendations.push('Consider masking older observations to free up context');
    }
    if (status === 'critical') {
      recommendations.push('Run /7_gofer_save immediately, then start new session');
    }

    return {
      success: true,
      health: {
        status,
        utilizationPercent: Math.round(utilizationPercent * 10) / 10,
        tokensUsed,
        tokensLimit: effectiveLimit,
        breakdown: includeBreakdown ? breakdown : undefined,
        recommendations,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Estimate tokens from a single file.
   * Uses 4 chars = 1 token approximation.
   */
  private async estimateTokensFromFile(relativePath: string): Promise<number> {
    try {
      const fullPath = path.join(this.workspacePath, relativePath);
      const stats = await fs.stat(fullPath);
      return Math.ceil(stats.size / 4);
    } catch {
      return 0;
    }
  }

  /**
   * Estimate tokens from files matching a glob pattern.
   * Uses 4 chars = 1 token approximation.
   */
  private async estimateTokensFromGlob(pattern: string): Promise<number> {
    try {
      const glob = await import('glob');
      const files = await glob.glob(pattern, { cwd: this.workspacePath });
      let totalTokens = 0;

      for (const file of files) {
        totalTokens += await this.estimateTokensFromFile(file);
      }

      return totalTokens;
    } catch {
      return 0;
    }
  }

  /**
   * MCP Tool: gofer_get_research_index
   * Returns the index of available research chunks for a spec
   */
  async getResearchIndex(specId: string): Promise<ResearchIndexResponse> {
    try {
      // Validate spec ID
      const validation = this.validateSpecId(specId);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          errorCode: 'INVALID_SPEC_ID',
        };
      }

      // Check if spec exists
      const specDir = path.join(this.workspacePath, '.specify', 'specs', specId);
      const researchPath = path.join(specDir, 'research.md');

      try {
        await fs.access(specDir);
      } catch {
        return {
          success: false,
          error: 'Spec not found',
          errorCode: 'SPEC_NOT_FOUND',
        };
      }

      try {
        await fs.access(researchPath);
      } catch {
        return {
          success: false,
          error: 'research.md not found',
          errorCode: 'NO_RESEARCH_FILE',
        };
      }

      // Use ResearchChunker to get/generate the index
      const index = await this.researchChunker.getIndex(specId);

      return {
        success: true,
        index: {
          sourceFile: index.sourceFile,
          totalTokens: index.totalTokens,
          chunkCount: index.chunkCount,
          created: index.created,
          chunks: index.chunks,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'INDEX_ERROR',
      };
    }
  }

  /**
   * MCP Tool: gofer_load_research_chunk
   * Loads a specific chunk of a research document by ID
   */
  async loadResearchChunk(specId: string, chunkId: string): Promise<LoadResearchChunkResponse> {
    try {
      // Validate spec ID
      const specValidation = this.validateSpecId(specId);
      if (!specValidation.valid) {
        return {
          success: false,
          error: specValidation.error,
          errorCode: 'INVALID_SPEC_ID',
        };
      }

      // Use ResearchChunker to get the chunk
      const chunk = await this.researchChunker.getChunk(specId, chunkId);

      if (!chunk) {
        return {
          success: false,
          error: 'Chunk not found',
          errorCode: 'CHUNK_NOT_FOUND',
        };
      }

      return {
        success: true,
        chunk: {
          id: chunk.id,
          sectionTitle: chunk.sectionTitle,
          content: chunk.content,
          tokenEstimate: chunk.tokenEstimate,
          relevanceKeywords: chunk.relevanceKeywords,
          order: chunk.order,
        },
      };
    } catch (error) {
      // Handle specific errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Research file not found')) {
        return {
          success: false,
          error: 'research.md not found',
          errorCode: 'NO_RESEARCH_FILE',
        };
      }

      if (errorMessage.includes('Invalid spec ID')) {
        return {
          success: false,
          error: errorMessage,
          errorCode: 'INVALID_SPEC_ID',
        };
      }

      return {
        success: false,
        error: errorMessage,
        errorCode: 'CHUNK_NOT_FOUND',
      };
    }
  }

  /**
   * MCP Tool: gofer_trigger_handoff
   * Manually triggers a session handoff with context preservation
   */
  async triggerHandoff(
    reason: 'context_critical' | 'manual_request' | 'stage_complete' | 'error_recovery',
    currentTask?: string,
    notes?: string
  ): Promise<TriggerHandoffResponse> {
    try {
      // Get current spec context
      const specs = await this.goferLoader.loadAllSpecs();
      const activeSpec = specs.find((s) => s.status === 'in_progress' || s.status === 'ready');

      if (!activeSpec) {
        return {
          success: false,
          error: 'No active feature context to hand off',
          errorCode: 'NO_ACTIVE_FEATURE',
        };
      }

      // Create handoff document
      const handoffPath = path.join(
        this.workspacePath,
        '.specify',
        'specs',
        activeSpec.id,
        'session-handoff.md'
      );

      const completedTasks = activeSpec.tasks
        .filter((t) => t.status === 'completed')
        .map((t) => t.id);

      const handoffContent = `---
feature: ${activeSpec.id}
created: ${new Date().toISOString()}
reason: ${reason}
current_task: ${currentTask || 'none'}
---

# Session Handoff: ${activeSpec.title}

## Context Snapshot

- **Timestamp**: ${new Date().toISOString()}
- **Reason**: ${reason}
- **Current Task**: ${currentTask || 'None specified'}

## Progress

### Completed Tasks (${completedTasks.length}/${activeSpec.tasks.length})

${completedTasks.map((t) => `- [x] ${t}`).join('\n')}

### Remaining Tasks

${activeSpec.tasks
  .filter((t) => t.status !== 'completed')
  .map((t) => `- [ ] ${t.id}: ${t.description}`)
  .join('\n')}

## Notes

${notes || 'No additional notes.'}

## Resume Command

\`\`\`
/8_gofer_resume --feature ${activeSpec.id}
\`\`\`
`;

      await fs.writeFile(handoffPath, handoffContent, 'utf-8');

      return {
        success: true,
        handoff: {
          file: handoffPath,
          created: Date.now(),
          contextSnapshot: {
            tokensUsed: 0, // Will be filled by ContextHealthMonitor
            utilizationPercent: 0,
            completedTasks,
            currentTask,
            stage: 'implement', // Simplified - would detect actual stage
          },
          resumeCommand: `/8_gofer_resume --feature ${activeSpec.id}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'HANDOFF_ERROR',
      };
    }
  }
}
