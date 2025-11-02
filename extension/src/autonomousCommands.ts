/**
 * Autonomous Execution Command Handlers
 *
 * Implements VSCode commands for autonomous execution:
 * - specGofer.startAutonomous
 * - specGofer.stopAutonomous
 * - specGofer.pauseAutonomous
 * - specGofer.resumeAutonomous
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
import type { ProgressProvider } from './progressProvider';

// Global driver instance (singleton)
let activeDriver: AutonomousDriver | null = null;
let outputChannel: vscode.OutputChannel | null = null;
let logFilePath: string | null = null;

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

  if (!spec.id || !spec.title) {
    vscode.window.showErrorMessage('Invalid spec: missing required properties (id or title)');
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
  const config = vscode.workspace.getConfiguration('specGofer.autonomous');
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
    outputChannel = vscode.window.createOutputChannel('SpecGofer Autonomous');
  }
  outputChannel.show();

  // Setup log file
  const logsDir = path.join(workspacePath, '.specify', 'logs');
  await fs.mkdir(logsDir, { recursive: true });
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  logFilePath = path.join(logsDir, `autonomous-${dateStr}.log`);

  // Create memory manager instance
  const memoryManager = new MemoryManager(context, workspacePath);

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
        title: `SpecGofer: Starting ${spec.title}...`,
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
    .showErrorMessage(`SpecGofer Autonomous: ${error.message}`, 'View Logs')
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

  // Clean up
  activeDriver = null;
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
                await vscode.commands.executeCommand('specGofer.startAutonomous', depSpec);
                successCount++;

                // Update status to completed in graph
                dependencyGraph.updateStatus(depId, 'completed');
              }
            } catch (error) {
              failedCount++;
              console.error(`[SpecGofer] Failed to execute dependency ${depId}:`, error);
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
