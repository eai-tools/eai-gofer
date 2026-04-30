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
import { Logger } from './services/Logger';
import type { ProgressProvider } from './progressProvider';
import type { Spec } from './goferParser';
import type { EnrichedContextBridge } from './autonomous/ContextBridgeWriter';
import { CrossPlatformCommandRouter } from './council/CrossPlatformCommandRouter';
import type { LLMProvider } from './council/providers/LLMProvider';
import { getWorkflowProfile } from './config/workflowProfile';
import { createReferenceFallbackEventHandlers } from './services/enterpriseai/events/ReferenceFallbackEvents';
import {
  resolveEnterpriseAiReferences,
  type EnterpriseAiReferenceType,
} from './services/enterpriseai/internalApi/ResolveEnterpriseAiReferences';
// Removed: import { wireClaudePtyToAutoHandoff } - no longer needed without PTY support

// Shared singleton instances (set from extension.ts)
let sharedMemoryManager: MemoryManager | undefined;
let sharedContextBuilder: ContextBuilder | undefined;
let sharedMemoryHookManager: MemoryHookManager | undefined;
let sharedLogger: Logger | undefined;
let sharedCrossPlatformCommandRouter: CrossPlatformCommandRouter | undefined;

// Cached enriched context from bridge file (for memory injection)
let cachedEnrichedContext: EnrichedContextBridge | undefined;

// Override command for next terminal spawn (used by auto-resume workflow)
let overrideInitialCommand: string | undefined;

interface ReadableShellExecution {
  read():
    | Iterable<string>
    | AsyncIterable<string>
    | Promise<Iterable<string> | AsyncIterable<string> | undefined>
    | undefined;
}

function isReadableShellExecution(execution: unknown): execution is ReadableShellExecution {
  return (
    typeof execution === 'object' &&
    execution !== null &&
    'read' in execution &&
    typeof (execution as { read?: unknown }).read === 'function'
  );
}

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

/** Set the shared CrossPlatformCommandRouter instance */
export function setSharedCrossPlatformCommandRouter(router: CrossPlatformCommandRouter): void {
  sharedCrossPlatformCommandRouter = router;
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
let isAutonomousMonitoringPaused = false; // Track pause state
let lastIdleCheckTime = 0; // Track last idle check to avoid duplicate responses

const ENTERPRISE_AI_REFERENCE_COMMANDS = new Set<string>([
  '0_business_scenario',
  '1_gofer_research',
  '2_gofer_specify',
  '3_gofer_plan',
  '4_gofer_tasks',
  '5_gofer_implement',
  '6_gofer_validate',
  '6a_gofer_engineering_review',
  '7a_stakeholder_comms',
]);

const ENTERPRISE_AI_REFERENCE_TYPES: readonly string[] = [
  'eai-cli',
  'vertical-template',
  'deployment-repo',
];

const ENTERPRISE_AI_EXTERNAL_REFERENCE_URLS: Readonly<Record<EnterpriseAiReferenceType, string>> = {
  'eai-cli': 'https://github.com/eai-tools/eai-cli',
  'vertical-template': 'https://github.com/eai-tools/Vertical-Template',
  'deployment-repo': 'https://github.com/EAI-Website/com.enterpriseaigroup',
};

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

  // Get configuration
  const config = vscode.workspace.getConfiguration('gofer.autonomous');
  const options: DriverOptions = {
    enableParallelTester: false, // User Story 2 feature
    showTerminals: config.get('showTerminals', true),
    notificationChannel: 'vscode',
    whatsappPhoneNumber: null,
    emailAddress: null,
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
    } catch (error) {
      // Non-fatal: proceed with implementation anyway
      console.warn(
        '[Gofer] Tasks validation check failed:',
        error instanceof Error ? error.message : error
      );
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

async function resolveInitialCommand(specId: string, workspacePath: string): Promise<string> {
  const rawCommand = overrideInitialCommand ?? determineInitialCommand(specId, workspacePath);
  const workflowProfile = getWorkflowProfile();
  const commandName = rawCommand
    .replace(/^[/#]\s*/, '')
    .replace(/^\$\s+\$\s+/, '')
    .trim();
  if (!commandName) {
    return rawCommand;
  }

  if (workflowProfile === 'enterpriseai' && ENTERPRISE_AI_REFERENCE_COMMANDS.has(commandName)) {
    const fallbackEvents = createReferenceFallbackEventHandlers((notice) => {
      const message = `[EnterpriseAI] ${notice.message}`;
      outputChannel?.appendLine(`   ⚠ ${message}`);
      sharedLogger?.info('autonomousCommands', 'EnterpriseAI fallback reference notice emitted', {
        runId: notice.runId,
        fallbackPath: notice.fallbackPath,
        unavailableExternalReferences: notice.unavailableExternalReferences,
      });
    });
    fallbackEvents.consume((payload) => {
      sharedLogger?.info(
        'autonomousCommands',
        'EnterpriseAI references resolved for command launch',
        {
          commandName,
          runId: payload.runId,
          unavailableExternalReferences: payload.unavailableExternalReferences,
          fallbackPath: payload.fallbackPath,
        }
      );
    });

    const goferConfig = vscode.workspace.getConfiguration('gofer');
    const useExternalReferences = goferConfig.get<boolean>(
      'enterpriseAiUseExternalReferences',
      false
    );
    await resolveEnterpriseAiReferences(
      {
        runId: `launch-${specId}-${commandName}`,
        referenceTypes: ENTERPRISE_AI_REFERENCE_TYPES,
        externalReferencesEnabled: useExternalReferences,
        fallbackPath: '.specify/references/eai/',
      },
      {
        workspaceRoot: workspacePath,
        externalReferenceResolver: useExternalReferences
          ? (referenceType) => ENTERPRISE_AI_EXTERNAL_REFERENCE_URLS[referenceType]
          : undefined,
        eventPublisher: (payload) => {
          fallbackEvents.publish(payload);
        },
      }
    );
  }

  const router = sharedCrossPlatformCommandRouter;
  if (!router) {
    return rawCommand;
  }

  try {
    // launchClaudeCode always runs in Claude terminal, so we validate via router
    // but keep Claude invocation syntax for execution.
    await router.routeCommand(commandName, 'claude', workflowProfile);
    await router.loadSkillForPlatform(commandName, 'claude', workflowProfile);
    return router.getCommandSyntax(commandName, 'claude');
  } catch (error) {
    sharedLogger?.warn(
      'autonomousCommands',
      'Falling back to raw command after routing compatibility check failure',
      {
        commandName,
        workflowProfile,
        error: error instanceof Error ? error.message : String(error),
      }
    );
    return rawCommand;
  }
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

    const initialCommand = await resolveInitialCommand(specId, workspacePath);
    overrideInitialCommand = undefined;

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

    // Create a normal terminal (no PTY capture needed - HookBridgeWatcher monitors context via file system)
    claudeTerminal = vscode.window.createTerminal({
      name: `Claude Code: ${specId}`,
      cwd: workspacePath,
      env: {
        ...process.env,
        // Trigger Claude Code auto-compaction at 70% instead of default ~95%
        CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '70',
        // Pass terminal display name so hooks can include it in bridge data
        GOFER_DISPLAY_NAME: `Claude Code: ${specId}`,
      },
    });

    outputChannel.appendLine(
      '   ✓ Terminal created (normal mode - HookBridgeWatcher monitors context)'
    );

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

    outputChannel.appendLine('[5/6] Launching Claude Code...');

    // Build the claude command
    const claudeCommand = claudeArgs.length > 0 ? `claude ${claudeArgs.join(' ')}` : 'claude';
    outputChannel.appendLine(`   → Launching: ${claudeCommand}`);

    // Send the command to the terminal
    claudeTerminal.sendText(claudeCommand);
    outputChannel.appendLine('   ✓ Command sent to terminal');
    outputChannel.appendLine(`   → Initial command: ${initialCommand}`);
    claudeTerminal.sendText(initialCommand);
    outputChannel.appendLine('   ✓ Initial command sent to terminal');

    outputChannel.appendLine('[6/6] Claude Code launched');
    outputChannel.appendLine(
      '      HookBridgeWatcher will monitor context health via .specify/hooks/context-bridge.json'
    );
    outputChannel.appendLine(
      '      Context warnings will appear as notifications at 65% and 70% thresholds\n'
    );

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

  // Use shell integration to monitor command execution
  vscode.window.onDidChangeTerminalShellIntegration((e) => {
    if (e.terminal !== claudeTerminal) {
      return;
    }

    const shellIntegration = e.shellIntegration;
    if (!shellIntegration) {
      return;
    }

    outputChannel?.appendLine('   ✓ Shell integration activated');

    // Listen for command execution
    vscode.window.onDidEndTerminalShellExecution(async (event) => {
      if (event.terminal !== claudeTerminal) {
        return;
      }

      // Get the execution output if available
      if (isReadableShellExecution(event.execution)) {
        try {
          const stream = await event.execution.read();
          if (stream) {
            const outputStream = stream as AsyncIterable<string> | Iterable<string>;
            for await (const data of outputStream) {
              autonomousResponder?.addTerminalOutput(data);
            }
          }
        } catch (error) {
          outputChannel?.appendLine(
            `   Failed to read terminal execution output: ${error instanceof Error ? error.message : String(error)}`
          );
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

    if (response) {
      // Phase 3 follow-up: implement notification-based workflow for autonomous responses.
      // Normal terminals don't support programmatic input like PTY
      // Will show notification with response and let user copy/paste or click to send
      outputChannel?.appendLine(`   Autonomous response ready: ${response.substring(0, 100)}...`);
      outputChannel?.appendLine('   Note: Notification workflow not yet implemented (Phase 3)');
      return false; // Changed from true since we can't auto-send yet
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
 * Pause Claude Code terminal by pausing autonomous monitoring
 * Note: Cannot send ESC to normal terminal (no PTY support)
 */
export async function pauseClaudeCode(): Promise<void> {
  if (!claudeTerminal) {
    vscode.window.showWarningMessage('No Claude Code terminal is currently running');
    return;
  }

  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Gofer-ClaudeCode');
  }

  try {
    // Pause autonomous monitoring
    isAutonomousMonitoringPaused = true;
    await vscode.commands.executeCommand('setContext', 'gofer.autonomousMonitoringPaused', true);
    outputChannel.appendLine('[PAUSE] Autonomous monitoring paused');

    vscode.window
      .showInformationMessage(
        'Autonomous monitoring paused. Press ESC manually in the terminal to pause Claude Code.',
        'Show Terminal'
      )
      .then((selection) => {
        if (selection === 'Show Terminal' && claudeTerminal) {
          claudeTerminal.show();
        }
      });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to pause monitoring: ${errorMsg}`);
    vscode.window.showErrorMessage(`Failed to pause monitoring: ${errorMsg}`);
  }
}

/**
 * Resume Claude Code autonomous monitoring
 */
export async function resumeClaudeCode(): Promise<void> {
  if (!claudeTerminal) {
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

  // Dispose terminal to release resources
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

// Removed: getClaudePtyProcess() - no longer needed without PTY support
// AutoHandoffTrigger will use notification-based workflow instead (Phase 3)

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
