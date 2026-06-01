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
import * as path from 'path';
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
import { Logger } from './services/Logger';
import type { ProgressProvider } from './progressProvider';
import type { Spec } from './goferParser';
import type { LLMProvider } from './council/providers/LLMProvider';

// Shared singleton instances (set from extension.ts)
let sharedMemoryManager: MemoryManager | undefined;
let sharedContextBuilder: ContextBuilder | undefined;
let sharedMemoryHookManager: MemoryHookManager | undefined;
let sharedLogger: Logger | undefined;

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

/** Set the shared Logger instance */
export function setSharedLogger(logger: Logger): void {
  sharedLogger = logger;
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

/** Get the shared Logger (for testing) */
export function getSharedLogger(): Logger | undefined {
  return sharedLogger;
}

// Global driver instance (singleton)
let activeDriver: AutonomousDriver | null = null;
let outputChannel: vscode.OutputChannel | null = null;
let logFilePath: string | null = null;

/**
 * Start autonomous execution for a spec
 */
export async function startAutonomousExecution(
  context: vscode.ExtensionContext,
  spec: Spec,
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

  const options: DriverOptions = {
    enableParallelTester: false, // User Story 2 feature
    showTerminals: true,
    notificationChannel: 'vscode',
    emailAddress: null,
    maxRetries: 3,
    tokenWarningThreshold: 150000,
    tokenActionThreshold: 180000,
    questionTimeout: 300000,
    runFinalValidation: true,
    validateConstitution: true,
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

  // Get CLI provider for autonomous execution (T032)
  let provider: LLMProvider | undefined;
  try {
    const { getProviderFactory } = await import('./council/providers/ProviderFactory');
    const factory = getProviderFactory();
    provider = await factory.getCLIProvider(); // Uses auto-detection
  } catch (error) {
    // R2: Show error with clickable documentation link per spec US-3 AC
    const errorMsg = error instanceof Error ? error.message : String(error);
    vscode.window
      .showErrorMessage(
        `CLI Provider not available: ${errorMsg}`,
        'View Installation Docs',
        'Continue Without CLI'
      )
      .then((selection) => {
        if (selection === 'View Installation Docs') {
          // Open installation documentation
          vscode.env.openExternal(
            vscode.Uri.parse('https://github.com/anthropics/claude-code#installation')
          );
        }
      });
    // Provider is optional for backward compatibility - log warning but continue
    console.warn('[Autonomous] Failed to initialize CLI provider:', error);
    provider = undefined;
  }

  // Create driver instance
  activeDriver = new AutonomousDriver(
    workspacePath,
    progressProvider,
    memoryManager,
    options,
    provider
  );

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
        .catch((err) =>
          sharedLogger?.error('AutonomousCommands:SaveBuildFailureMemory', err as Error, {
            specId: report.specId,
            operation: 'save-memory',
          })
        );
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
        .catch((err) =>
          sharedLogger?.error('AutonomousCommands:SaveTestFailureMemory', err as Error, {
            specId: report.specId,
            operation: 'save-memory',
          })
        );
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
  spec: Spec,
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
 * Get the active autonomous driver instance.
 * Used for commands that need to access driver state (e.g., compaction history).
 *
 * @returns Active driver instance or null if no session is running
 */
export function getActiveDriver(): AutonomousDriver | null {
  return activeDriver;
}
