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
import {
  ClaudeCodeAutonomousResponder,
  QuestionContext,
} from './autonomous/ClaudeCodeAutonomousResponder';
import type { ProgressProvider } from './progressProvider';

// Global driver instance (singleton)
let activeDriver: AutonomousDriver | null = null;
let outputChannel: vscode.OutputChannel | null = null;
let logFilePath: string | null = null;

// Claude Code terminal tracking
let claudeTerminal: vscode.Terminal | null = null;
let terminalCloseListener: vscode.Disposable | null = null;

// Autonomous responder
let autonomousResponder: ClaudeCodeAutonomousResponder | null = null;
let autonomousMonitoringInterval: NodeJS.Timeout | null = null; // Deprecated - kept for compatibility
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
    return '/speckit.implement';
  }
  if (hasPlan) {
    return '/speckit.tasks';
  }
  if (hasSpec) {
    return '/speckit.plan';
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
  console.log('[Gofer] launchClaudeCode called for:', specId);

  // Create output channel FIRST - before any try/catch
  // Use a simpler name without spaces to ensure it appears in dropdown
  if (!outputChannel) {
    console.log('[Gofer] Creating new output channel');
    outputChannel = vscode.window.createOutputChannel('Gofer-ClaudeCode');
    console.log('[Gofer] Output channel created:', outputChannel);
  }

  // Clear previous content and show (don't preserve focus so it's visible)
  console.log('[Gofer] Clearing and showing output channel');
  outputChannel.clear();
  outputChannel.show(false); // Don't preserve focus - make it visible
  outputChannel.appendLine('='.repeat(80));
  outputChannel.appendLine(`Gofer Claude Code Launcher`);
  outputChannel.appendLine(`Spec ID: ${specId}`);
  outputChannel.appendLine(`Time: ${new Date().toISOString()}`);
  outputChannel.appendLine('='.repeat(80));
  console.log('[Gofer] Output channel content written');

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
      env: process.env as any,
    });

    // Capture output and feed to autonomous responder
    if (autonomousMode && apiKey && autonomousResponder) {
      const responder = autonomousResponder; // Capture for closure
      ptyProcess.onData((data) => {
        responder.addTerminalOutput(data);
      });
      outputChannel.appendLine('   ✓ Output capture enabled');
    }

    ptyProcess.onExit(() => {
      ptyProcess = null;
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
      }
    });
    terminalCloseListener = closeListener;

    outputChannel.appendLine('[4/6] Showing terminal...');
    claudeTerminal.show();

    outputChannel.appendLine('[5/6] Claude Code process already started via pty');
    outputChannel.appendLine('      Terminal is capturing output for autonomous answering');

    outputChannel.appendLine('[6/6] Waiting for Claude Code to fully initialize...');
    outputChannel.appendLine('      Claude Code needs 8-10 seconds to start its interactive mode');
    outputChannel.appendLine('      Will send /speckit.implement after 8 seconds...\n');

    // Wait for the actual ">" prompt before sending commands
    let promptDetected = false;
    const ptyRef = ptyProcess; // Capture reference for closure
    const promptListener = ptyProcess.onData((data: string) => {
      // Look for the ">" prompt character indicating Claude Code is ready
      if (!promptDetected && ptyRef && data.includes('>')) {
        promptDetected = true;
        outputChannel?.appendLine('✓ Claude Code prompt detected, determining command...');

        // Dynamically determine command based on workspace state
        const initialCommand = determineInitialCommand(specId, workspacePath);
        outputChannel?.appendLine(`   → State detection chose: ${initialCommand}`);

        // METHOD 5 (WORKING): Write command first, then send \r separately with 500ms delay
        // This is the only method that works reliably with Claude Code
        ptyRef.write(initialCommand);
        outputChannel?.appendLine(`  → Typed command: ${initialCommand}`);

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
  // Clear old interval (deprecated, for compatibility)
  if (autonomousMonitoringInterval) {
    clearInterval(autonomousMonitoringInterval);
    autonomousMonitoringInterval = null;
  }

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
    await vscode.commands.executeCommand(
      'setContext',
      'gofer.autonomousMonitoringPaused',
      true
    );
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
    await vscode.commands.executeCommand(
      'setContext',
      'gofer.autonomousMonitoringPaused',
      false
    );
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
