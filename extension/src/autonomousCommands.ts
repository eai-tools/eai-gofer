/**
 * Autonomous Execution Command Handlers
 *
 * Implements VSCode commands for autonomous execution:
 * - gofer.startAutonomous
 * - gofer.stopAutonomous
 * - gofer.pauseAutonomous
 * - gofer.resumeAutonomous
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as pty from 'node-pty';
import {
  AutonomousDriver,
  DriverOptions,
  ProgressUpdate,
  DriverError,
  CompletionReport,
} from './autonomous';
import { MemoryManager } from './autonomous/MemoryManager';
import { ContextBuilder } from './autonomous/ContextBuilder';
import { MemoryHookManager } from './autonomous/MemoryHookManager';
import {
  ClaudeCodeAutonomousResponder,
  QuestionContext,
} from './autonomous/ClaudeCodeAutonomousResponder';
import type { ProgressProvider } from './progressProvider';
import type { EnrichedContextBridge } from './autonomous/ContextBridgeWriter';
import { wireClaudePtyToAutoHandoff } from './autoHandoffBridge';

// Shared singleton instances (set from extension.ts)
let sharedMemoryManager: MemoryManager | undefined;
let sharedContextBuilder: ContextBuilder | undefined;
let sharedMemoryHookManager: MemoryHookManager | undefined;

// Cached enriched context from bridge file (for memory injection)
let cachedEnrichedContext: EnrichedContextBridge | undefined;

// Override command for next terminal spawn (used by auto-resume workflow)
let overrideInitialCommand: string | undefined;

/** Set the shared MemoryManager instance */
export function setSharedMemoryManager(mm: MemoryManager): void {
  sharedMemoryManager = mm;
}

/** Set the shared ContextBuilder instance */
export function setSharedContextBuilder(cb: ContextBuilder): void {
  sharedContextBuilder = cb;
}

/** Set the shared MemoryHookManager instance (Spec 010) */
export function setSharedMemoryHookManager(mhm: MemoryHookManager): void {
  sharedMemoryHookManager = mhm;
}

/** Get the shared MemoryManager (for testing) */
export function getSharedMemoryManager(): MemoryManager | undefined {
  return sharedMemoryManager;
}

/** Get the shared ContextBuilder (for testing) */
export function getSharedContextBuilder(): ContextBuilder | undefined {
  return sharedContextBuilder;
}

/** Get the shared MemoryHookManager (for testing/integration) */
export function getSharedMemoryHookManager(): MemoryHookManager | undefined {
  return sharedMemoryHookManager;
}

/**
 * Format a compact memory injection string for Claude Code.
 * Extracts key memories and formats them as a brief context preamble.
 * Max ~2000 chars to avoid overwhelming the prompt.
 */
function formatMemoryInjection(bridge: EnrichedContextBridge): string {
  const parts: string[] = [];

  // Add key memories (most important)
  if (bridge.sections.memories && bridge.sections.memories.trim()) {
    // Extract first ~1500 chars of memories
    const memoriesSection = bridge.sections.memories.substring(0, 1500);
    parts.push(`<memory_context>\n${memoriesSection}\n</memory_context>`);
  }

  // Add hints if space allows
  if (bridge.sections.hints && bridge.sections.hints.trim() && parts.join('').length < 1500) {
    const hintsSection = bridge.sections.hints.substring(0, 500);
    parts.push(`<hints>\n${hintsSection}\n</hints>`);
  }

  if (parts.length === 0) {
    return '';
  }

  return parts.join('\n\n');
}

/**
 * Read the enriched context bridge file.
 * Returns undefined if file doesn't exist or is stale (>60s).
 */
async function readEnrichedContextBridge(
  workspacePath: string
): Promise<EnrichedContextBridge | undefined> {
  const bridgePath = path.join(workspacePath, '.specify', 'memory', 'enriched-context.json');

  try {
    const content = await fs.readFile(bridgePath, 'utf-8');
    const bridge = JSON.parse(content) as EnrichedContextBridge;

    // Check freshness (60 second threshold)
    const age = Date.now() - bridge.timestamp;
    if (age > 60000) {
      return undefined; // Stale
    }

    return bridge;
  } catch {
    return undefined; // File doesn't exist or parse error
  }
}

// Global driver instance (singleton)
let activeDriver: AutonomousDriver | null = null;
let outputChannel: vscode.OutputChannel | null = null;
let logFilePath: string | null = null;

// Claude Code terminal tracking
let claudeTerminal: vscode.Terminal | null = null;
let terminalCloseListener: vscode.Disposable | null = null;

// Autonomous responder
let autonomousResponder: ClaudeCodeAutonomousResponder | null = null;
let idleDetectionInterval: NodeJS.Timeout | null = null; // Fast idle detection (5-10 seconds)
let comprehensiveCheckInterval: NodeJS.Timeout | null = null; // Slow comprehensive check (60 seconds)
let ptyProcess: pty.IPty | null = null;
let isAutonomousMonitoringPaused = false; // Track pause state
let lastIdleCheckTime = 0; // Track last idle check to avoid duplicate responses

/**
 * Start autonomous execution for a spec
 */
export async function startAutonomousExecution(
  context: vscode.ExtensionContext,
  spec: any,
  progressProvider: ProgressProvider | undefined
): Promise<void> {
  // Validate spec parameter early
  if (!spec) {
    vscode.window.showErrorMessage('No spec provided to start autonomous execution');
    return;
  }

  // Enhanced validation with better error reporting
  if (!spec.id || !spec.title) {
    console.error('Invalid spec object:', JSON.stringify(spec, null, 2));

    // Try to provide more helpful error message
    const missingFields = [];
    if (!spec.id) {
      missingFields.push('id');
    }
    if (!spec.title) {
      missingFields.push('title');
    }

    vscode.window.showErrorMessage(
      `Invalid spec: missing required properties (${missingFields.join(', ')}). ` +
        `Received spec with keys: ${Object.keys(spec).join(', ')}`
    );
    return;
  }

  if (!spec.tasks || !Array.isArray(spec.tasks)) {
    vscode.window.showErrorMessage(
      `Invalid spec "${spec.id}": tasks property is missing or not an array`
    );
    return;
  }

  // Check if already running
  if (activeDriver) {
    const response = await vscode.window.showWarningMessage(
      'Autonomous execution is already running. Stop current execution first?',
      'Stop Current',
      'Cancel'
    );

    if (response === 'Stop Current') {
      await stopAutonomousExecution();
    } else {
      return;
    }
  }

  // Get workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  if (!progressProvider) {
    vscode.window.showErrorMessage('Progress provider not initialized');
    return;
  }

  const workspacePath = workspaceFolder.uri.fsPath;

  // T117-T119: Pre-execution dependency check
  const dependencyCheckResult = await checkDependenciesBeforeExecution(spec, progressProvider);

  if (!dependencyCheckResult.canExecute) {
    // User cancelled or chose to execute dependencies first
    return;
  }

  // Get configuration
  const config = vscode.workspace.getConfiguration('gofer.autonomous');
  const options: DriverOptions = {
    enableParallelTester: false, // User Story 2 feature
    showTerminals: config.get('showTerminals', true),
    notificationChannel: config.get('notificationChannel', 'vscode') as
      | 'vscode'
      | 'whatsapp'
      | 'email',
    whatsappPhoneNumber: config.get('whatsappPhoneNumber', null),
    emailAddress: config.get('emailAddress', null),
    maxRetries: config.get('maxRetries', 3),
    tokenWarningThreshold: config.get('tokenWarningThreshold', 150000),
    tokenActionThreshold: config.get('tokenActionThreshold', 180000),
    questionTimeout: config.get('questionTimeout', 300000),
    runFinalValidation: config.get('runFinalValidation', true),
    validateConstitution: config.get('validateConstitution', true),
  };

  // Create output channel
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Gofer Autonomous');
  }
  outputChannel.show();

  // Setup log file
  const logsDir = path.join(workspacePath, '.specify', 'logs');
  await fs.mkdir(logsDir, { recursive: true });
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  logFilePath = path.join(logsDir, `autonomous-${dateStr}.log`);

  // Use shared MemoryManager instance (set from extension.ts) or create fallback
  const memoryManager = sharedMemoryManager ?? new MemoryManager(context, workspacePath);

  // Create driver instance
  activeDriver = new AutonomousDriver(workspacePath, progressProvider, memoryManager, options);

  // Register event handlers
  activeDriver.onProgress((update: ProgressUpdate) => {
    handleProgressUpdate(update);
  });

  activeDriver.onError((error: DriverError) => {
    handleError(error);
  });

  activeDriver.onComplete((report: CompletionReport) => {
    handleCompletion(report);
  });

  // Show starting message
  outputChannel.appendLine(
    `[${new Date().toISOString()}] Starting autonomous execution for spec: ${spec.id}`
  );
  outputChannel.appendLine(`[${new Date().toISOString()}] Total tasks: ${spec.tasks.length}`);
  outputChannel.appendLine(`[${new Date().toISOString()}] Log file: ${logFilePath}`);

  // Start execution
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Gofer: Starting ${spec.title}...`,
        cancellable: false,
      },
      async () => {
        await activeDriver!.start(spec.id);
      }
    );

    vscode.window.showInformationMessage(`✅ Autonomous execution started for "${spec.title}"`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to start autonomous execution: ${errorMessage}`);
    outputChannel.appendLine(`[${new Date().toISOString()}] ERROR: ${errorMessage}`);
    activeDriver = null;
  }
}

/**
 * Stop autonomous execution
 */
export async function stopAutonomousExecution(): Promise<void> {
  if (!activeDriver) {
    vscode.window.showWarningMessage('No autonomous execution is currently running');
    return;
  }

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Stopping autonomous execution...',
        cancellable: false,
      },
      async () => {
        await activeDriver!.stop();
      }
    );

    vscode.window.showInformationMessage('⏹️ Autonomous execution stopped');
    outputChannel?.appendLine(`[${new Date().toISOString()}] Execution stopped by user`);
    activeDriver = null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to stop execution: ${errorMessage}`);
    outputChannel?.appendLine(`[${new Date().toISOString()}] ERROR stopping: ${errorMessage}`);
  }
}

/**
 * Pause autonomous execution
 */
export async function pauseAutonomousExecution(): Promise<void> {
  if (!activeDriver) {
    vscode.window.showWarningMessage('No autonomous execution is currently running');
    return;
  }

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Pausing autonomous execution...',
        cancellable: false,
      },
      async () => {
        await activeDriver!.pause();
      }
    );

    vscode.window.showInformationMessage('⏸️ Autonomous execution paused');
    outputChannel?.appendLine(`[${new Date().toISOString()}] Execution paused`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to pause execution: ${errorMessage}`);
    outputChannel?.appendLine(`[${new Date().toISOString()}] ERROR pausing: ${errorMessage}`);
  }
}

/**
 * Resume paused execution
 */
export async function resumeAutonomousExecution(): Promise<void> {
  if (!activeDriver) {
    vscode.window.showWarningMessage('No autonomous execution is currently paused');
    return;
  }

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Resuming autonomous execution...',
        cancellable: false,
      },
      async () => {
        await activeDriver!.resume();
      }
    );

    vscode.window.showInformationMessage('▶️ Autonomous execution resumed');
    outputChannel?.appendLine(`[${new Date().toISOString()}] Execution resumed`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to resume execution: ${errorMessage}`);
    outputChannel?.appendLine(`[${new Date().toISOString()}] ERROR resuming: ${errorMessage}`);
  }
}

/**
 * Handle progress updates
 */
function handleProgressUpdate(update: ProgressUpdate): void {
  const logEntry = {
    timestamp: update.timestamp,
    type: 'progress',
    data: {
      sessionId: update.sessionId,
      progress: `${update.tasksCompleted}/${update.tasksTotal}`,
      percentComplete: `${update.percentComplete}%`,
      currentTask: update.currentTask,
      currentAction: update.currentAction,
      tokensUsed: update.tokensUsed,
      contextSwitches: update.contextSwitches,
    },
  };

  // Write to log file
  if (logFilePath) {
    fs.appendFile(logFilePath, JSON.stringify(logEntry) + '\n').catch((error) => {
      console.error('Failed to write to log file:', error);
    });
  }

  // Write to output channel (human-readable)
  if (outputChannel) {
    outputChannel.appendLine(
      `[${update.timestamp}] Progress: ${update.tasksCompleted}/${update.tasksTotal} (${update.percentComplete}%) - ${update.currentAction}`
    );
  }
}

/**
 * Handle errors
 */
function handleError(error: DriverError): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'error',
    data: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };

  // Write to log file
  if (logFilePath) {
    fs.appendFile(logFilePath, JSON.stringify(logEntry) + '\n').catch((err) => {
      console.error('Failed to write error to log file:', err);
    });
  }

  // Write to output channel
  if (outputChannel) {
    outputChannel.appendLine(`[${logEntry.timestamp}] ERROR [${error.code}]: ${error.message}`);
    if (Object.keys(error.details).length > 0) {
      outputChannel.appendLine(`  Details: ${JSON.stringify(error.details, null, 2)}`);
    }
  }

  // Show notification
  vscode.window
    .showErrorMessage(`Gofer Autonomous: ${error.message}`, 'View Logs')
    .then((selection) => {
      if (selection === 'View Logs' && outputChannel) {
        outputChannel.show();
      }
    });
}

/**
 * Handle completion
 */
function handleCompletion(report: CompletionReport): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'completion',
    data: {
      sessionId: report.sessionId,
      specId: report.specId,
      status: report.status,
      duration: `${Math.round(report.duration / 1000)}s`,
      tasksCompleted: `${report.tasksCompleted}/${report.tasksTotal}`,
      errors: report.errors,
      retries: report.retries,
      contextSwitches: report.contextSwitches,
      summary: report.summary,
    },
  };

  // Write to log file
  if (logFilePath) {
    fs.appendFile(logFilePath, JSON.stringify(logEntry) + '\n').catch((error) => {
      console.error('Failed to write completion to log file:', error);
    });
  }

  // Write to output channel
  if (outputChannel) {
    outputChannel.appendLine(`\n${'='.repeat(80)}`);
    outputChannel.appendLine(`[${logEntry.timestamp}] EXECUTION COMPLETE`);
    outputChannel.appendLine(`Status: ${report.status.toUpperCase()}`);
    outputChannel.appendLine(`Duration: ${logEntry.data.duration}`);
    outputChannel.appendLine(`Tasks: ${logEntry.data.tasksCompleted}`);
    outputChannel.appendLine(`Errors: ${report.errors}`);
    outputChannel.appendLine(`Retries: ${report.retries}`);
    outputChannel.appendLine(`Context Switches: ${report.contextSwitches}`);
    outputChannel.appendLine(`\nSummary: ${report.summary}`);
    outputChannel.appendLine(`${'='.repeat(80)}\n`);
  }

  // Show completion notification
  const icon = report.status === 'success' ? '✅' : report.status === 'failed' ? '❌' : '⚠️';
  const message = `${icon} Autonomous execution ${report.status}: ${report.tasksCompleted}/${report.tasksTotal} tasks completed`;

  if (report.status === 'success') {
    vscode.window.showInformationMessage(message, 'View Logs').then((selection) => {
      if (selection === 'View Logs' && outputChannel) {
        outputChannel.show();
      }
    });
  } else {
    vscode.window.showWarningMessage(message, 'View Logs').then((selection) => {
      if (selection === 'View Logs' && outputChannel) {
        outputChannel.show();
      }
    });
  }

  // T055/T071: Post-completion feedback loop — run build and tests if available
  const wsPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (report.status === 'success' && wsPath) {
    runPostCompletionChecks(report, wsPath).catch((error) => {
      console.warn('[Gofer] Post-completion checks failed (non-fatal):', error);
    });
  }

  // Clean up
  activeDriver = null;
}

/**
 * T055/T071: Run build verification and tests after task completion.
 * Records failures as memories for future reference.
 */
async function runPostCompletionChecks(report: CompletionReport, wsPath: string): Promise<void> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  // T071: Build verification first
  try {
    await execFileAsync('npm', ['run', 'compile'], {
      cwd: wsPath,
      timeout: 60000,
    });
  } catch (buildError) {
    const errorMsg = buildError instanceof Error ? buildError.message : String(buildError);
    console.warn('[Gofer] Post-completion build failed:', errorMsg.slice(0, 200));
    // Record build error as memory
    if (sharedMemoryManager) {
      await sharedMemoryManager
        .save({
          category: 'auto_decision',
          content: `Build failed after completing spec ${report.specId}: ${errorMsg.slice(0, 500)}`,
          tags: ['#auto', '#build-failure', `#spec-${report.specId}`],
          scope: 'local',
          lastUsed: Date.now(),
          usedCount: 0,
          learnedFrom: report.specId,
        })
        .catch(() => {});
    }
    return; // Don't run tests if build fails
  }

  // T055: Run tests
  try {
    await execFileAsync('npm', ['test'], {
      cwd: wsPath,
      timeout: 120000,
    });
  } catch (testError) {
    const errorMsg = testError instanceof Error ? testError.message : String(testError);
    console.warn('[Gofer] Post-completion tests failed:', errorMsg.slice(0, 200));
    if (sharedMemoryManager) {
      await sharedMemoryManager
        .save({
          category: 'auto_decision',
          content: `Tests failed after completing spec ${report.specId}: ${errorMsg.slice(0, 500)}`,
          tags: ['#auto', '#test-failure', `#spec-${report.specId}`],
          scope: 'local',
          lastUsed: Date.now(),
          usedCount: 0,
          learnedFrom: report.specId,
        })
        .catch(() => {});
    }
  }
}

// ============================================================================
// T117-T119: Pre-execution Dependency Checks
// ============================================================================

/**
 * Result of dependency check before execution.
 */
interface DependencyCheckResult {
  /** Whether execution can proceed */
  canExecute: boolean;

  /** Incomplete dependencies (if any) */
  incompleteDeps?: string[];
}

/**
 * T117-T119: Check dependencies before starting autonomous execution.
 *
 * Validates that all dependencies of a spec are completed before execution.
 * If incomplete dependencies exist:
 * - Shows a warning notification
 * - Offers to execute dependencies first
 * - Allows user to proceed anyway or cancel
 *
 * @param spec - Spec to check
 * @param progressProvider - ProgressProvider instance
 * @returns Check result indicating if execution can proceed
 */
async function checkDependenciesBeforeExecution(
  spec: any,
  progressProvider: ProgressProvider
): Promise<DependencyCheckResult> {
  const dependencyGraph = progressProvider.getDependencyGraph();

  // Get direct dependencies
  const dependencies = dependencyGraph.getDependencies(spec.id);

  if (dependencies.length === 0) {
    // No dependencies, can execute immediately
    return { canExecute: true };
  }

  // Check status of each dependency
  const incompleteDeps: string[] = [];

  for (const depId of dependencies) {
    const depNode = dependencyGraph.getSpec(depId);

    if (!depNode) {
      // Dependency spec not found in graph
      incompleteDeps.push(depId);
      continue;
    }

    // Check if dependency is completed
    if (depNode.status !== 'completed') {
      incompleteDeps.push(depId);
    }
  }

  // If all dependencies are completed, proceed
  if (incompleteDeps.length === 0) {
    return { canExecute: true };
  }

  // T118: Show warning if executing spec with incomplete dependencies
  const depList = incompleteDeps.map((id) => `  • ${id}`).join('\n');
  const message = `Spec "${spec.id}" has ${incompleteDeps.length} incomplete dependencies:\n\n${depList}\n\nExecuting this spec without completing its dependencies may cause issues.`;

  // T119: Offer to execute dependencies first
  const choice = await vscode.window.showWarningMessage(
    message,
    { modal: true },
    'Execute Dependencies First',
    'Proceed Anyway',
    'Cancel'
  );

  if (choice === 'Execute Dependencies First') {
    // Get execution order for dependencies
    try {
      const executionOrder = dependencyGraph.getExecutionOrder(incompleteDeps);

      // Execute dependencies in order
      let successCount = 0;
      let failedCount = 0;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Executing ${incompleteDeps.length} dependencies first`,
          cancellable: false,
        },
        async (progress) => {
          for (let i = 0; i < executionOrder.length; i++) {
            const depId = executionOrder[i];
            const depNode = dependencyGraph.getSpec(depId);

            if (!depNode) {
              continue;
            }

            progress.report({
              message: `${i + 1}/${executionOrder.length}: ${depId}`,
              increment: 100 / executionOrder.length,
            });

            try {
              // Find the spec object for this dependency
              const rootItems = await progressProvider.getChildren();
              const depSpec = rootItems.find((item) => item.spec?.id === depId)?.spec;

              if (depSpec) {
                // Execute the dependency spec (recursive call)
                await vscode.commands.executeCommand('gofer.startAutonomous', depSpec);
                successCount++;

                // Update status to completed in graph
                dependencyGraph.updateStatus(depId, 'completed');
              }
            } catch (error) {
              failedCount++;
              console.error(`[Gofer] Failed to execute dependency ${depId}:`, error);
            }
          }
        }
      );

      // Show result
      if (failedCount === 0) {
        vscode.window.showInformationMessage(
          `✓ Completed ${successCount} dependencies. Now executing ${spec.id}...`
        );
        return { canExecute: true };
      } else {
        const proceedChoice = await vscode.window.showWarningMessage(
          `${successCount} dependencies succeeded, ${failedCount} failed. Proceed with ${spec.id}?`,
          'Yes',
          'No'
        );
        return { canExecute: proceedChoice === 'Yes', incompleteDeps };
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to execute dependencies: ${error instanceof Error ? error.message : String(error)}`
      );
      return { canExecute: false, incompleteDeps };
    }
  } else if (choice === 'Proceed Anyway') {
    // User chose to proceed despite incomplete dependencies
    return { canExecute: true, incompleteDeps };
  } else {
    // User cancelled
    return { canExecute: false, incompleteDeps };
  }
}

/**
 * Determine the initial command to send based on workspace state
 * Checks for existing Gofer and RPI artifacts to route to the appropriate workflow
 */
function determineInitialCommand(specId: string, workspacePath: string): string {
  // Check Gofer artifacts
  const specDir = path.join(workspacePath, '.specify', 'specs', specId);
  const hasSpec = fsSync.existsSync(path.join(specDir, 'spec.md'));
  const hasPlan = fsSync.existsSync(path.join(specDir, 'plan.md'));
  const hasTasks = fsSync.existsSync(path.join(specDir, 'tasks.md'));

  // Check RPI artifacts
  const researchDir = path.join(workspacePath, 'thoughts', 'shared', 'research');
  const sessionsDir = path.join(workspacePath, 'thoughts', 'shared', 'sessions');
  const plansDir = path.join(workspacePath, 'thoughts', 'shared', 'plans');

  const hasResearch =
    fsSync.existsSync(researchDir) &&
    fsSync.readdirSync(researchDir).filter((f) => f.endsWith('.md')).length > 0;
  const hasSavedSession =
    fsSync.existsSync(sessionsDir) &&
    fsSync.readdirSync(sessionsDir).filter((f) => f.endsWith('.md') && f !== '.gitkeep').length > 0;
  const hasRpiPlan =
    fsSync.existsSync(plansDir) &&
    fsSync.readdirSync(plansDir).filter((f) => f.endsWith('.md')).length > 0;

  // Decision tree

  // 1. Gofer artifacts exist - continue Gofer flow
  if (hasTasks) {
    // T036: Validate tasks.md frontmatter status before implementation
    try {
      const tasksDirs = fsSync
        .readdirSync(path.join(workspacePath, '.specify', 'specs'), { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .sort((a, b) => {
          const aTime = fsSync.statSync(
            path.join(workspacePath, '.specify', 'specs', a.name)
          ).mtimeMs;
          const bTime = fsSync.statSync(
            path.join(workspacePath, '.specify', 'specs', b.name)
          ).mtimeMs;
          return bTime - aTime;
        });
      if (tasksDirs.length > 0) {
        const tasksPath = path.join(
          workspacePath,
          '.specify',
          'specs',
          tasksDirs[0].name,
          'tasks.md'
        );
        if (fsSync.existsSync(tasksPath)) {
          const tasksContent = fsSync.readFileSync(tasksPath, 'utf-8');
          if (
            !tasksContent.includes('status: approved') &&
            !tasksContent.includes('status: ready')
          ) {
            return '/4_gofer_tasks'; // Not yet approved, route to tasks stage
          }
        }
      }
    } catch {
      // Non-fatal: proceed with implementation anyway
    }
    return '/5_gofer_implement';
  }
  if (hasPlan) {
    return '/4_gofer_tasks';
  }
  if (hasSpec) {
    return '/3_gofer_plan';
  }

  // 2. RPI artifacts exist - continue RPI flow
  if (hasSavedSession) {
    return '/6_resume_work';
  }
  if (hasRpiPlan) {
    return '/4_implement_plan';
  }
  if (hasResearch) {
    return '/2_create_plan';
  }

  // 3. Fresh state - start with triage
  return '/0_business_scenario';
}

/**
 * Launch Claude Code in integrated VSCode terminal
 */
export async function launchClaudeCode(specId: string): Promise<void> {
  // Create output channel FIRST - before any try/catch
  // Use a simpler name without spaces to ensure it appears in dropdown
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Gofer-ClaudeCode');
  }

  // Clear previous content and show (don't preserve focus so it's visible)
  outputChannel.clear();
  outputChannel.show(false); // Don't preserve focus - make it visible
  outputChannel.appendLine('='.repeat(80));
  outputChannel.appendLine(`Gofer Claude Code Launcher`);
  outputChannel.appendLine(`Spec ID: ${specId}`);
  outputChannel.appendLine(`Time: ${new Date().toISOString()}`);
  outputChannel.appendLine('='.repeat(80));

  // Reset paused state when starting new Claude Code session
  isAutonomousMonitoringPaused = false;
  await vscode.commands.executeCommand('setContext', 'gofer.autonomousMonitoringPaused', false);

  try {
    outputChannel.appendLine('[1/6] Setting context for Claude Code running...');
    await vscode.commands.executeCommand('setContext', 'gofer.claudeCodeRunning', true);

    // Get workspace path
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    if (!workspacePath) {
      throw new Error('No workspace folder found');
    }

    // T056: Create git stash safety checkpoint before risky operations
    try {
      const { execFile: execFileSync } = require('child_process');
      const { promisify: prom } = require('util');
      const execFileP = prom(execFileSync);
      const { stdout: statusOut } = await execFileP('git', ['status', '--porcelain'], {
        cwd: workspacePath,
        timeout: 10000,
      });
      if (statusOut && statusOut.trim().length > 0) {
        await execFileP('git', ['stash', 'push', '-m', `gofer-safety-${specId}-${Date.now()}`], {
          cwd: workspacePath,
          timeout: 10000,
        });
        outputChannel.appendLine('   ✓ Git stash safety checkpoint created');
      }
    } catch {
      // Git stash is best-effort, don't block execution
      outputChannel.appendLine('   ⚠ Git stash checkpoint skipped (non-fatal)');
    }

    outputChannel.appendLine('[2/6] Creating terminal...');

    // Initialize autonomous responder first if enabled
    const config = vscode.workspace.getConfiguration('gofer');
    const autonomousMode = config.get<boolean>('autonomousMode', true);
    const apiKey = config.get<string>('anthropicApiKey', '');

    if (autonomousMode && apiKey) {
      autonomousResponder = new ClaudeCodeAutonomousResponder(apiKey, outputChannel);
      await autonomousResponder.initializeLogFile(workspacePath);
      outputChannel.appendLine('   ✓ Autonomous responder initialized');
      outputChannel.appendLine('   ✓ Debug logging enabled (check .specify/logs/)');
    }

    // Build enriched context before spawning (Spec 013 Phase 4 — T030-T032)
    // Also cache the bridge data for memory injection into the terminal prompt
    cachedEnrichedContext = undefined;
    if (sharedContextBuilder) {
      try {
        const { ContextBridgeWriter } = await import('./autonomous/ContextBridgeWriter');
        const bridgeWriter = new ContextBridgeWriter(sharedContextBuilder, workspacePath);
        const taskContext = { taskId: 'T001', specId, description: `Execute spec ${specId}` };

        // 500ms timeout to avoid delaying launch (T031)
        await Promise.race([
          bridgeWriter.writeEnrichedContext(taskContext),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Context build timeout')), 500)
          ),
        ]);
        outputChannel.appendLine('   ✓ Enriched context written to bridge file');

        // Read back the bridge file for memory injection (memory-system-integration-sweep)
        cachedEnrichedContext = await readEnrichedContextBridge(workspacePath);
        if (cachedEnrichedContext) {
          const memoryInjection = formatMemoryInjection(cachedEnrichedContext);
          if (memoryInjection) {
            outputChannel.appendLine(
              `   ✓ Memory context loaded (${memoryInjection.length} chars for injection)`
            );
          }
        }
      } catch (error) {
        // Non-fatal: launch proceeds without enrichment (T032)
        console.warn(
          '[Gofer] Context enrichment skipped:',
          error instanceof Error ? error.message : error
        );
        outputChannel.appendLine('   ⚠ Context enrichment skipped (non-fatal)');
      }
    }

    // Spawn Claude Code process with node-pty
    outputChannel.appendLine('   Starting Claude Code process with output capture...');

    // For autonomous mode, skip permissions to avoid waiting on prompts
    const claudeArgs = autonomousMode ? ['--dangerously-skip-permissions'] : [];
    outputChannel.appendLine(`   Claude args: ${claudeArgs.join(' ') || '(none)'}`);

    ptyProcess = pty.spawn('claude', claudeArgs, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: workspacePath,
      env: {
        ...process.env,
        // Trigger Claude Code auto-compaction at 70% instead of default ~95%
        CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '70',
      } as any,
    });

    // Wire pty to AutoHandoffTrigger for automated save/resume
    wireClaudePtyToAutoHandoff(ptyProcess);

    // Capture output and feed to autonomous responder
    if (autonomousMode && apiKey && autonomousResponder) {
      const responder = autonomousResponder; // Capture for closure
      ptyProcess.onData((data) => {
        responder.addTerminalOutput(data);
      });
      outputChannel.appendLine('   ✓ Output capture enabled');
    }

    // Observation tracking: buffer terminal output and track as observations (Spec 013 T036-T037)
    if (sharedContextBuilder) {
      let observationBuffer = '';
      const contextBuilder = sharedContextBuilder; // Capture for closure
      ptyProcess.onData((data) => {
        observationBuffer += data;
        if (observationBuffer.length >= 2000) {
          contextBuilder.trackObservation(
            'command_output',
            observationBuffer,
            { source: 'claude-code-terminal', specId },
            `Terminal output chunk (${observationBuffer.length} chars)`
          );
          contextBuilder.incrementTurn();
          observationBuffer = '';
        }
      });
      outputChannel.appendLine('   ✓ Observation tracking enabled');
    }

    ptyProcess.onExit(() => {
      ptyProcess = null;
      // Clear the PTY reference in AutoHandoffTrigger to prevent writes to dead process
      wireClaudePtyToAutoHandoff(null);
    });

    // Create event emitters for pty interface
    const writeEmitter = new vscode.EventEmitter<string>();
    const closeEmitter = new vscode.EventEmitter<number | void>();

    // Forward pty output to terminal display - NO FILTERING
    // Let xterm.js (VSCode's terminal engine) handle ANSI sequences naturally
    // including ESC[2K (clear line) and \r (carriage return) for spinners
    ptyProcess.onData((data) => {
      writeEmitter.fire(data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      closeEmitter.fire(exitCode);
    });

    // Create terminal backed by the pty process using ExtensionTerminalOptions
    // This gives us both good formatting AND output capture
    const terminalOptions: vscode.ExtensionTerminalOptions = {
      name: `Claude Code: ${specId}`,
      pty: {
        onDidWrite: writeEmitter.event,
        onDidClose: closeEmitter.event,
        open: () => {
          // Pty already started, nothing to do
        },
        close: () => {
          if (ptyProcess) {
            ptyProcess.kill();
          }
        },
        handleInput: (data: string) => {
          if (ptyProcess) {
            ptyProcess.write(data);
          }
        },
        setDimensions: (dimensions: vscode.TerminalDimensions) => {
          // CRITICAL: Without this callback, ANSI escape sequences don't work properly!
          // The terminal needs dimensions (cols/rows) to calculate cursor positions
          // for sequences like \r (carriage return) and \x1b[2K (clear line).
          // This enables spinners to overwrite the same line instead of creating new lines.
          if (ptyProcess) {
            ptyProcess.resize(dimensions.columns, dimensions.rows);
            if (outputChannel) {
              outputChannel.appendLine(
                `   ℹ Terminal resized to ${dimensions.columns}x${dimensions.rows}`
              );
            }
          }
        },
      },
    };

    // Create the terminal
    claudeTerminal = vscode.window.createTerminal(terminalOptions);

    outputChannel.appendLine('   ✓ Terminal created with pty backend');

    outputChannel.appendLine('[3/6] Setting up terminal close listener...');
    const closeListener = vscode.window.onDidCloseTerminal(async (closedTerminal) => {
      if (closedTerminal === claudeTerminal) {
        outputChannel?.appendLine(`\n[TERMINAL CLOSED] ${new Date().toISOString()}`);
        claudeTerminal = null;
        await vscode.commands.executeCommand('setContext', 'gofer.claudeCodeRunning', false);
        if (terminalCloseListener) {
          terminalCloseListener.dispose();
          terminalCloseListener = null;
        }

        // Run memory consolidation at session end (non-blocking)
        if (sharedMemoryManager) {
          sharedMemoryManager
            .consolidate()
            .then((result) => {
              outputChannel?.appendLine(
                `[Memory] Consolidation: merged=${result.merged}, compacted=${result.compacted}, ` +
                  `stale=${result.flaggedStale}, decayed=${result.decayed}, archived=${result.archived}`
              );
            })
            .catch((err) => {
              console.warn('[Gofer] Post-session consolidation failed:', err);
            });
        }

        // Save knowledge graph at session end (non-blocking)
        if (sharedContextBuilder) {
          const graph = sharedContextBuilder.getKnowledgeGraph();
          if (graph) {
            graph.save().catch((err) => {
              console.warn('[Gofer] KnowledgeGraph save failed:', err);
            });
          }
        }
      }
    });
    terminalCloseListener = closeListener;

    outputChannel.appendLine('[4/6] Showing terminal...');
    claudeTerminal.show();

    outputChannel.appendLine('[5/6] Claude Code process already started via pty');
    outputChannel.appendLine('      Terminal is capturing output for autonomous answering');

    outputChannel.appendLine('[6/6] Waiting for Claude Code to fully initialize...');
    outputChannel.appendLine('      Claude Code needs 8-10 seconds to start its interactive mode');
    outputChannel.appendLine('      Will send /5_gofer_implement after 8 seconds...\n');

    // Wait for the actual ">" prompt before sending commands
    let promptDetected = false;
    const ptyRef = ptyProcess; // Capture reference for closure
    const promptListener = ptyProcess.onData((data: string) => {
      // Look for the ">" prompt character indicating Claude Code is ready
      if (!promptDetected && ptyRef && data.includes('>')) {
        promptDetected = true;
        outputChannel?.appendLine('✓ Claude Code prompt detected, determining command...');

        // Check for override command first (used by auto-resume workflow)
        let initialCommand: string;
        if (overrideInitialCommand) {
          initialCommand = overrideInitialCommand;
          outputChannel?.appendLine(`   → Using override command: ${initialCommand}`);
          overrideInitialCommand = undefined; // Clear after use
        } else {
          // Dynamically determine command based on workspace state
          initialCommand = determineInitialCommand(specId, workspacePath);
          outputChannel?.appendLine(`   → State detection chose: ${initialCommand}`);
        }

        // Build the full command with memory injection (memory-system-integration-sweep)
        // If we have cached enriched context, prepend memory context to the command
        let fullCommand = initialCommand;
        if (cachedEnrichedContext) {
          const memoryInjection = formatMemoryInjection(cachedEnrichedContext);
          if (memoryInjection) {
            // Inject memories as context before the command
            // Format: "Context from previous sessions:\n<memories>\n...\n</memories>\n\nNow execute: /5_gofer_implement"
            fullCommand = `Context from previous sessions:\n${memoryInjection}\n\nNow execute: ${initialCommand}`;
            outputChannel?.appendLine(
              `   → Memory context injected (${memoryInjection.length} chars)`
            );
          }
        }

        // METHOD 5 (WORKING): Write command first, then send \r separately with 500ms delay
        // This is the only method that works reliably with Claude Code
        ptyRef.write(fullCommand);
        outputChannel?.appendLine(
          `  → Typed command: ${fullCommand.substring(0, 100)}${fullCommand.length > 100 ? '...' : ''}`
        );

        setTimeout(() => {
          ptyRef.write('\r');
          outputChannel?.appendLine('  → Sent Enter key (\\r) after 500ms delay');
          outputChannel?.appendLine('\n✓ Command execution complete\n');
        }, 500);

        // Dispose the listener after sending command
        setTimeout(() => promptListener.dispose(), 1000);
      }
    });

    outputChannel.appendLine('\n' + '='.repeat(80));
    outputChannel.appendLine('Terminal launched. Monitoring for command execution...');
    outputChannel.appendLine('='.repeat(80) + '\n');

    // Start autonomous question monitoring if enabled
    if (autonomousMode && apiKey && autonomousResponder) {
      outputChannel.appendLine('🤖 Autonomous mode ENABLED');
      outputChannel.appendLine('   Claude Code questions will be answered automatically');
      outputChannel.appendLine('   Using Claude 3.5 Haiku with full context');
      outputChannel.appendLine('   Terminal output is being captured and monitored\n');

      // Start monitoring after Claude Code initializes (after 10 seconds)
      setTimeout(() => {
        startAutonomousMonitoring(specId, workspacePath);
      }, 10000);
    } else if (autonomousMode && !apiKey) {
      outputChannel.appendLine('⚠️  Autonomous mode enabled but no API key configured');
      outputChannel.appendLine('   Set gofer.anthropicApiKey in VS Code settings to enable\n');
    } else {
      outputChannel.appendLine('ℹ️  Autonomous mode disabled');
      outputChannel.appendLine('   Questions will require manual input\n');
    }

    // Show success notification
    vscode.window
      .showInformationMessage(
        `Claude Code started for "${specId}". Check OUTPUT → "Gofer-ClaudeCode" for progress.`,
        'Show Terminal',
        'Show Output'
      )
      .then((selection) => {
        if (selection === 'Show Terminal' && claudeTerminal) {
          claudeTerminal.show();
        } else if (selection === 'Show Output' && outputChannel) {
          outputChannel.show();
        }
      });
  } catch (error) {
    await vscode.commands.executeCommand('setContext', 'gofer.claudeCodeRunning', false);
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel?.appendLine('\n' + '='.repeat(80));
    outputChannel?.appendLine(`ERROR: ${errorMessage}`);
    outputChannel?.appendLine('='.repeat(80) + '\n');
    if (error instanceof Error && error.stack) {
      outputChannel?.appendLine('Stack trace:');
      outputChannel?.appendLine(error.stack);
    }
    vscode.window.showErrorMessage(`Failed to start Claude Code: ${errorMessage}`);
  }
}

/**
 * Start autonomous monitoring for questions
 * Uses node-pty to spawn Claude Code process and capture output
 */
async function startAutonomousMonitoring(specId: string, workspacePath: string): Promise<void> {
  if (!autonomousResponder || !claudeTerminal) {
    return;
  }

  outputChannel?.appendLine('🔍 Starting autonomous question monitoring...');
  outputChannel?.appendLine('   Watching for "(esc)" prompt in terminal output');
  outputChannel?.appendLine('   Will send questions to Claude 3.5 Haiku with full context\n');

  let escDetectedTime: number | null = null;
  const ESC_WAIT_TIME = 5000; // Wait 5 seconds after detecting "(esc)"
  let outputBuffer = '';

  // Use shell integration to monitor command execution
  const shellIntegrationListener = vscode.window.onDidChangeTerminalShellIntegration((e) => {
    if (e.terminal !== claudeTerminal) {
      return;
    }

    const shellIntegration = e.shellIntegration;
    if (!shellIntegration) {
      return;
    }

    outputChannel?.appendLine('   ✓ Shell integration activated');

    // Listen for command execution
    const executionListener = vscode.window.onDidEndTerminalShellExecution((event) => {
      if (event.terminal !== claudeTerminal) {
        return;
      }

      // Get the execution output if available
      if (event.execution && typeof event.execution === 'object') {
        const execution = event.execution as any;
        if (execution.read && typeof execution.read === 'function') {
          execution.read().then((stream: any) => {
            if (stream) {
              for (const data of stream) {
                outputBuffer += data;
                autonomousResponder?.addTerminalOutput(data);
              }
            }
          });
        }
      }
    });
  });

  // DUAL-MODE MONITORING:
  // 1. IDLE DETECTION - Check every 10 seconds for idle state (no spinner)
  //    If idle detected, immediately ask Haiku to answer/decide
  // 2. COMPREHENSIVE CHECK - Check every 60 seconds regardless of state
  //    Even when working, check if Claude is going in the right direction

  // Mode 1: Fast idle detection (10 seconds)
  idleDetectionInterval = setInterval(async () => {
    if (!claudeTerminal || !autonomousResponder) {
      stopAutonomousMonitoring();
      return;
    }

    // Skip if monitoring is paused
    if (isAutonomousMonitoringPaused) {
      return;
    }

    outputChannel?.appendLine(
      `[${new Date().toLocaleTimeString()}] 🔍 Idle check: Checking if Claude Code is idle...`
    );

    const detection = autonomousResponder.detectQuestion();

    // Only respond if IDLE (no spinner)
    if (detection.detected && detection.question.includes('IDLE')) {
      const now = Date.now();
      // Prevent duplicate responses within 5 seconds
      if (now - lastIdleCheckTime < 5000) {
        outputChannel?.appendLine('   ⏭️  Skipping (responded recently)');
        return;
      }

      lastIdleCheckTime = now;
      outputChannel?.appendLine(
        `[${new Date().toLocaleTimeString()}] ✅ Claude is IDLE - asking Haiku to respond immediately...`
      );

      await attemptQuestionResponse(specId, workspacePath, 'IDLE_DETECTION');
    }
  }, 10000); // Check every 10 seconds for idle

  // Mode 2: Comprehensive check (60 seconds) - runs regardless of state
  comprehensiveCheckInterval = setInterval(async () => {
    if (!claudeTerminal || !autonomousResponder) {
      stopAutonomousMonitoring();
      return;
    }

    // Skip if monitoring is paused
    if (isAutonomousMonitoringPaused) {
      outputChannel?.appendLine(
        `[${new Date().toLocaleTimeString()}] ⏸️  Autonomous monitoring is paused, skipping check...`
      );
      return;
    }

    outputChannel?.appendLine(
      `[${new Date().toLocaleTimeString()}] 🔍 60-second comprehensive check: Analyzing full context...`
    );

    // Do comprehensive analysis regardless of idle/working state
    await attemptQuestionResponse(specId, workspacePath, 'COMPREHENSIVE_CHECK');
  }, 60000); // Comprehensive check every 60 seconds
}

/**
 * Attempt to detect and respond to questions
 * Returns true if we attempted a response
 */
async function attemptQuestionResponse(
  specId: string,
  workspacePath: string,
  checkType: 'IDLE_DETECTION' | 'COMPREHENSIVE_CHECK'
): Promise<boolean> {
  if (!claudeTerminal || !autonomousResponder) {
    return false;
  }

  try {
    // Get the detection result with full context
    const detection = autonomousResponder.detectQuestion();

    if (!detection.detected) {
      outputChannel?.appendLine('   No question detected, skipping response');
      return false;
    }

    outputChannel?.appendLine('   Question detected, preparing context...');

    // Build context for Claude API
    const context: QuestionContext = {
      specId,
      question: detection.question,
      terminalOutput: detection.context, // Last 10k characters
      checkType, // Pass check type to the responder
    };

    // Get Claude's decision with full context
    const response = await autonomousResponder.getAutonomousResponse(workspacePath, context);

    if (response && ptyProcess) {
      // Send ESC + response + Enter directly to pty
      await autonomousResponder.sendResponseToPty(ptyProcess, response);
      return true;
    }

    return false;
  } catch (error) {
    outputChannel?.appendLine(
      `   Error in autonomous response: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

/**
 * Stop autonomous monitoring
 */
function stopAutonomousMonitoring(): void {
  // Clear dual-mode monitoring intervals
  if (idleDetectionInterval) {
    clearInterval(idleDetectionInterval);
    idleDetectionInterval = null;
  }
  if (comprehensiveCheckInterval) {
    clearInterval(comprehensiveCheckInterval);
    comprehensiveCheckInterval = null;
  }

  outputChannel?.appendLine('🛑 Autonomous monitoring stopped\n');

  if (autonomousResponder) {
    autonomousResponder.clearBuffer();
  }
}

/**
 * Pause Claude Code terminal by sending ESC and pausing autonomous monitoring
 */
export async function pauseClaudeCode(): Promise<void> {
  if (!ptyProcess) {
    vscode.window.showWarningMessage('No Claude Code terminal is currently running');
    return;
  }

  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Gofer-ClaudeCode');
  }

  try {
    // Send ESC character to the terminal (ASCII 27 / 0x1B)
    ptyProcess.write('\x1B');
    outputChannel.appendLine('[PAUSE] Sent ESC signal to Claude Code terminal');

    // Pause autonomous monitoring
    isAutonomousMonitoringPaused = true;
    await vscode.commands.executeCommand('setContext', 'gofer.autonomousMonitoringPaused', true);
    outputChannel.appendLine('[PAUSE] Autonomous monitoring paused');

    vscode.window.showInformationMessage('Claude Code paused (terminal + autonomous monitoring)');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to send pause signal: ${errorMsg}`);
    vscode.window.showErrorMessage(`Failed to pause Claude Code: ${errorMsg}`);
  }
}

/**
 * Resume Claude Code autonomous monitoring
 */
export async function resumeClaudeCode(): Promise<void> {
  if (!ptyProcess) {
    vscode.window.showWarningMessage('No Claude Code terminal is currently running');
    return;
  }

  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Gofer-ClaudeCode');
  }

  try {
    // Resume autonomous monitoring
    isAutonomousMonitoringPaused = false;
    await vscode.commands.executeCommand('setContext', 'gofer.autonomousMonitoringPaused', false);
    outputChannel.appendLine('[RESUME] Autonomous monitoring resumed');

    vscode.window.showInformationMessage('Claude Code autonomous monitoring resumed');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to resume: ${errorMsg}`);
    vscode.window.showErrorMessage(`Failed to resume Claude Code: ${errorMsg}`);
  }
}

/**
 * Stop Claude Code terminal
 */
export async function stopClaudeCode(): Promise<void> {
  // Stop autonomous monitoring first
  stopAutonomousMonitoring();

  // Reset paused state
  isAutonomousMonitoringPaused = false;
  await vscode.commands.executeCommand('setContext', 'gofer.autonomousMonitoringPaused', false);

  // Kill pty process to release resources
  if (ptyProcess) {
    try {
      ptyProcess.kill();
    } catch {
      // Process may already be dead
    }
    ptyProcess = null;
  }

  if (claudeTerminal) {
    claudeTerminal.dispose();
    claudeTerminal = null;
  }
  if (terminalCloseListener) {
    terminalCloseListener.dispose();
    terminalCloseListener = null;
  }
  if (autonomousResponder) {
    autonomousResponder = null;
  }

  // Clear active driver
  if (activeDriver) {
    activeDriver = null;
  }

  // Dispose output channel to free resources
  if (outputChannel) {
    outputChannel.dispose();
    outputChannel = null;
  }

  // Clear log file path
  logFilePath = null;

  await vscode.commands.executeCommand('setContext', 'gofer.claudeCodeRunning', false);
  vscode.window.showInformationMessage('Claude Code stopped');
}

/**
 * Get the active autonomous driver instance.
 * Used for commands that need to access driver state (e.g., compaction history).
 *
 * @returns Active driver instance or null if no session is running
 */
export function getActiveDriver(): AutonomousDriver | null {
  return activeDriver;
}

/**
 * Get the active Claude Code pty process for sending commands.
 * Used by AutoHandoffTrigger to send /compact or /clear to the terminal.
 */
export function getClaudePtyProcess(): pty.IPty | null {
  return ptyProcess;
}

/**
 * Spawn a new Claude Code terminal with an optional initial command.
 * Used by AutoHandoffTrigger for auto-resume workflow.
 *
 * @param initialCommand Optional command to send after terminal is ready (e.g., "/8_gofer_resume")
 */
export async function spawnNewClaudeCodeTerminal(initialCommand?: string): Promise<void> {
  // Get the most recent spec ID from workspace
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  if (!workspacePath) {
    throw new Error('No workspace folder found');
  }

  // Find the most recent spec
  const specsDir = path.join(workspacePath, '.specify', 'specs');
  let latestSpecId = 'feature-001'; // Default fallback

  try {
    const specDirs = fsSync
      .readdirSync(specsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .sort((a, b) => {
        const aTime = fsSync.statSync(path.join(specsDir, a.name)).mtimeMs;
        const bTime = fsSync.statSync(path.join(specsDir, b.name)).mtimeMs;
        return bTime - aTime;
      });

    if (specDirs.length > 0) {
      latestSpecId = specDirs[0].name;
    }
  } catch (error) {
    // Fall back to default if error reading specs
    console.error('Error finding latest spec:', error);
  }

  // Stop the old terminal before spawning a new one to prevent
  // two Claude Code processes from running simultaneously
  await stopClaudeCode();

  // Store the override command in a module variable before launching
  overrideInitialCommand = initialCommand;

  // Launch Claude Code (it will use the override command if set)
  await launchClaudeCode(latestSpecId);
}
