// reflect-metadata MUST be imported before anything that uses tsyringe decorators
// (e.g. @injectable() in ./services). Without this, the extension crashes at load time.
import 'reflect-metadata';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GoferMigrator } from './goferMigrator';
import { ProgressProvider } from './progressProvider';
import { ConstitutionProvider } from './constitutionProvider';
import { MemoryProvider } from './memoryProvider';
import { ContextWindowProvider } from './contextWindowProvider';
import { BranchSpecManager } from './branchSpecManager';
import { AutoUpdater } from './autoUpdater';
import { GoferLSPClient } from './lspClient';
import { MemoryManager } from './autonomous/MemoryManager';
import { ContextBuilder } from './autonomous/ContextBuilder';
import { registerMemoryCommands } from './commands/memoryCommands';
import { registerSpecCommands } from './commands/specCommands';
import { registerCouncilCommands } from './commands/councilCommands';
// Context Health Monitoring (Spec 012)
import { ContextHealthMonitor } from './autonomous/ContextHealthMonitor';
import { AutoHandoffTrigger } from './autonomous/AutoHandoffTrigger';
import { ContextUsageLogger } from './autonomous/ContextUsageLogger';
import { WorkspaceContextProvider } from './autonomous/WorkspaceContextProvider';
import { ResearchChunker } from './autonomous/ResearchChunker';
import { ContextHealthStatusBar } from './ui/ContextHealthStatusBar';
// Real Context Monitoring (Spec 014)
import { ContinuousMemoryWriter } from './autonomous/ContinuousMemoryWriter';
import { ScopeGuard } from './autonomous/ScopeGuard';
import { ToolAuditLogger } from './autonomous/ToolAuditLogger';
import { RunLedger } from './autonomous/RunLedger';
import { CostBudgetEnforcer } from './autonomous/CostBudgetEnforcer';
import { PipelineStateManager } from './autonomous/PipelineStateManager';
import { ConfigManager } from './config';
// Hook-based monitoring
import { HookBridgeWatcher } from './autonomous/HookBridgeWatcher';
import { MultiSessionBridgeWatcher } from './autonomous/MultiSessionBridgeWatcher';
// Context Window Accuracy (Feature 023)
import { ClaudeCodeContextScanner } from './autonomous/ClaudeCodeContextScanner';
import { GoferActivityStatusBar } from './ui/GoferActivityStatusBar';
// Dependency Injection (Phase 3 - Engineering Remediation)
import { registerServices, getContainer } from './di';
import {
  Logger,
  DisposalService,
  EventHandlers,
  InitializationService,
  CommandRegistry,
  StateManager,
  type EventHandlerDependencies,
  type InitializationDependencies,
  type CommandDependencies,
  type ManagedResources,
} from './services';
import { Logger as LegacyLogger } from './utils/logger';
// Note: stopClaudeCode is imported dynamically in deactivate() to avoid
// blocking extension activation if node-pty fails to load

/**
 * Gofer Extension
 *
 * © 2025 Enterprise AI Pty Ltd
 *
 * Automatically detects, upgrades, and works with .specify folders
 * in any repository you open.
 *
 * Now with LSP + MCP integration for automated orchestration!
 */

// Phase 1 Engineering Remediation: Logger service (T011-T013)
// Keep logger as module-level for early initialization and convenience
let logger: Logger | undefined;

/**
 * Get StateManager singleton from DI container
 * Helper function for convenient access to state throughout the extension
 */
function getState(): StateManager {
  return getContainer().resolve(StateManager);
}

/**
 * Set the upgrade state (exported for use by goferMigrator)
 */
export function setUpgradeState(state: boolean): void {
  getState().isUpgrading = state;
}

/**
 * Check if an upgrade is in progress
 */
export function isUpgradeInProgress(): boolean {
  return getState().isUpgrading;
}

/**
 * Wire the Claude Code pty process to AutoHandoffTrigger for automated save/resume.
 * @deprecated Use wireClaudePtyToAutoHandoff from './autoHandoffBridge' directly.
 * Kept for backward compatibility.
 */
export function wireClaudePtyToAutoHandoff(pty: any): void {
  const { wireClaudePtyToAutoHandoff: wire } = require('./autoHandoffBridge');
  wire(pty);
}

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Initialize Dependency Injection container (Phase 3 - Engineering Remediation)
  registerServices();

  // Resolve Logger service and initialize with output channel
  logger = getContainer().resolve(Logger);
  const outputChannel = vscode.window.createOutputChannel('Gofer');
  logger.initialize(outputChannel);
  context.subscriptions.push(outputChannel);

  // Bridge the legacy Logger (utils/logger.ts) to use the same output channel
  // so all 16 autonomous/ modules log to the Gofer output panel
  LegacyLogger.bridgeOutputChannel(outputChannel);

  logger.info('Extension', 'Activating Gofer extension');

  // Reset Claude Code running context on startup (in case it was left true from a crash)
  await vscode.commands.executeCommand('setContext', 'gofer.claudeCodeRunning', false);

  // Setup auto-updater (using GitHub Pages API for private repo)
  const packageJson = require('../package.json');
  const autoUpdater = new AutoUpdater(
    'eai-tools/gofer', // GitHub repo
    packageJson.version, // Current version
    'gofer' // Extension name for VSIX filename
  );

  // Start checking for updates using GitHub Pages API
  autoUpdater.startPeriodicChecks(context);

  // Store in state
  getState().autoUpdater = autoUpdater;

  // Setup Language Server (deferred to avoid blocking activation)
  const setupLSP = async (): Promise<void> => {
    try {
      const lspClient = new GoferLSPClient(context);
      await lspClient.start();
      getState().lspClient = lspClient;
      logger?.info('Extension', 'Language Server started');
    } catch (error) {
      logger?.error('Extension', error as Error, { operation: 'setupLSP' });
    }
  };

  // Start LSP in background (non-blocking)
  setupLSP();

  // Register tree views immediately
  registerTreeViews(context);

  // Register global commands (available even without workspace)
  registerGlobalCommands(context);

  // Get or create EventHandlers instance
  const eventHandlers = getContainer().resolve(EventHandlers);
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  const state = getState();

  // Register event handlers
  eventHandlers.registerAll({
    workspacePath,
    context,
    progressProvider: state.progressProvider,
    branchSpecManager: state.branchSpecManager,
    sharedContextBuilder: state.sharedContextBuilder,
    workspaceContextProvider: state.workspaceContextProvider,
    hookBridgeWatcher: state.hookBridgeWatcher,
    scopeGuard: state.scopeGuard,
    researchChunker: state.researchChunker,
    reinitializeExtension: () => reinitializeExtension(context),
    handleSpecModification: async () => {
      /* Spec modification handled by EventHandlers */
    },
    handleBranchChange: async () => {
      /* Branch change handled by EventHandlers */
    },
    isUpgrading: () => state.isUpgrading,
  });

  // Initialize for the current workspace (if one is open)
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    logger.info('Extension', 'No workspace folder open yet, waiting for workspace...');
    // No workspace open yet, listener above will handle it when one is added
    return;
  }

  // Initialize workspace in background (non-blocking) to prevent activation timeout
  initializeForWorkspace(context).catch((error) => {
    logger?.warn('Extension', 'Workspace initialization failed (non-critical)', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  logger.info('Extension', 'Gofer extension activated successfully');
}

/**
 * Register tree views immediately on activation
 * Views must be registered before commands that reference them
 */
function registerTreeViews(context: vscode.ExtensionContext): void {
  // Get workspace path (or use empty string if no workspace)
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  // Create providers with empty/initial state
  // They will be properly initialized later when workspace is ready
  const progressProvider = new ProgressProvider(workspacePath, undefined);
  const constitutionProvider = new ConstitutionProvider(workspacePath);
  const memoryProvider = new MemoryProvider(workspacePath);
  const contextWindowProvider = new ContextWindowProvider(workspacePath);

  // Store in state
  const state = getState();
  state.progressProvider = progressProvider;
  state.constitutionProvider = constitutionProvider;
  state.memoryProvider = memoryProvider;
  state.contextWindowProvider = contextWindowProvider;

  // Register tree data providers - MUST happen before commands are registered
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('goferProgress', progressProvider)
  );

  // Context Window replaces Constitution as a sidebar panel (020)
  // Constitution remains accessible via Command Palette (gofer.showConstitution)
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('goferContextWindow', contextWindowProvider)
  );

  context.subscriptions.push(vscode.window.registerTreeDataProvider('goferMemory', memoryProvider));

  // Create context health status bar (Spec 012)
  // Created early so command is available, connected to monitor later
  const contextHealthStatusBar = new ContextHealthStatusBar(context);
  state.contextHealthStatusBar = contextHealthStatusBar;
}

/**
 * Reinitialize extension when workspace changes
 * Uses DisposalService to clean up old resources and InitializationService to reinitialize
 */
async function reinitializeExtension(context: vscode.ExtensionContext): Promise<void> {
  const state = getState();

  // Prevent concurrent reinitializations
  if (state.isReinitializing) {
    logger?.debug('Extension', 'Reinitialize already in progress, skipping');
    return;
  }

  state.isReinitializing = true;
  try {
    logger?.info('Extension', 'Reinitializing extension for workspace change');

    // CRITICAL: Dispose all watchers and timers BEFORE reinitializing
    // to prevent memory leaks and resource exhaustion
    const disposalService = getContainer().resolve(DisposalService);
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    await disposalService.dispose(
      {
        sharedContextBuilder: state.sharedContextBuilder,
        cacheSaveTimer: state.cacheSaveTimer,
        consolidationTimer: state.consolidationTimer,
        workspaceContextProvider: state.workspaceContextProvider,
        contextHealthMonitor: state.contextHealthMonitor,
        autoHandoffTrigger: state.autoHandoffTrigger,
        contextHealthStatusBar: state.contextHealthStatusBar,
        continuousMemoryWriter: state.continuousMemoryWriter,
        hookBridgeWatcher: state.hookBridgeWatcher,
        multiSessionWatcher: state.multiSessionWatcher,
        goferActivityStatusBar: state.goferActivityStatusBar,
        contextUsageLogger: state.contextUsageLogger,
        progressProvider: state.progressProvider,
        constitutionProvider: state.constitutionProvider,
        memoryProvider: state.memoryProvider,
        branchSpecManager: state.branchSpecManager,
        memoryManager: state.memoryManager,
      },
      workspacePath
    );

    // Clear references after disposal
    state.sharedContextBuilder = undefined;
    state.clearTimers();
    state.clearMonitoringComponents();

    // Refresh the providers with new workspace data
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      // Update providers with new workspace
      state.progressProvider?.refresh();
      state.constitutionProvider?.refresh();
      state.memoryProvider?.refresh();
    }

    // Reinitialize for new workspace
    await initializeForWorkspace(context);

    logger?.info('Extension', 'Extension reinitialized successfully');
  } finally {
    state.resetReinitializationFlag();
  }
}

/**
 * Initialize extension for current workspace
 * Uses InitializationService and CommandRegistry
 */
async function initializeForWorkspace(context: vscode.ExtensionContext): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    logger?.debug('Extension', 'No workspace folder found for initialization');
    return;
  }

  const workspacePath = workspaceFolder.uri.fsPath;
  logger?.info('Extension', 'Initializing workspace', { workspacePath });

  const state = getState();

  // Resolve InitializationService and initialize workspace
  const initService = getContainer().resolve(InitializationService);
  const components = await initService.initialize({
    context,
    progressProvider: state.progressProvider,
    contextHealthStatusBar: state.contextHealthStatusBar,
    contextWindowProvider: state.contextWindowProvider,
  });

  // Update state with initialized components
  state.contextHealthMonitor = components.contextHealthMonitor;
  state.autoHandoffTrigger = components.autoHandoffTrigger;
  state.contextUsageLogger = components.contextUsageLogger;
  state.workspaceContextProvider = components.workspaceContextProvider;
  state.multiSessionWatcher = components.multiSessionWatcher;
  state.hookBridgeWatcher = components.hookBridgeWatcher;
  state.goferActivityStatusBar = components.goferActivityStatusBar;
  state.contextScanner = components.contextScanner;
  state.branchSpecManager = components.branchSpecManager;
  const migrator = components.migrator;

  // Initialize MemoryManager for memory commands (if not already initialized)
  if (!state.memoryManager && state.branchSpecManager) {
    state.memoryManager = new MemoryManager(context, workspacePath);
    // Wire MemoryManager to MemoryProvider so the MEMORY panel can display stored memories
    state.memoryProvider?.setMemoryManager(state.memoryManager);
  }

  // Initialize ScopeGuard, RunLedger, and ToolAuditLogger
  const runLedger = new RunLedger(workspacePath);

  // 002 AC-3.3: Wire pipeline runId to RunLedger for correlation
  const pipelineStateManager = new PipelineStateManager(workspacePath);
  await tryWireRunId(pipelineStateManager, runLedger, workspacePath);

  const scopeGuard = new ScopeGuard(workspacePath);
  const configManager = ConfigManager.getInstance();
  scopeGuard.setEnforcementMode(configManager.getScopeGuardMode());

  const toolAuditLogger = new ToolAuditLogger(workspacePath, runLedger);
  scopeGuard.setToolAuditLogger(toolAuditLogger);
  state.scopeGuard = scopeGuard;

  // Initialize CostBudgetEnforcer with config from settings
  const costBudgetEnforcer = new CostBudgetEnforcer(
    {
      maxCostUsd: configManager.getBudgetMaxCostUsd(),
      maxTokensPerRun: configManager.getBudgetMaxTokensPerRun(),
      enforcementMode: configManager.getBudgetEnforcementMode(),
    },
    runLedger
  );
  state.costBudgetEnforcer = costBudgetEnforcer;

  // Wire RunLedger into existing loggers
  if (state.contextUsageLogger) {
    state.contextUsageLogger.setRunLedger(runLedger);
    // 002 AC-6.4: Wire CostBudgetEnforcer so logLLMCall() forwards to recordUsage()
    state.contextUsageLogger.setCostBudgetEnforcer(costBudgetEnforcer);
    // 002 AC-6.7: Wire ContextHealthStatusBar for budget snapshot display
    if (state.contextHealthStatusBar) {
      state.contextUsageLogger.setContextHealthStatusBar(state.contextHealthStatusBar);
    }
  }

  // Protected boundaries are loaded by ScopeGuard.loadFromSpec() when a spec is opened.
  // The EventHandlers' ScopeGuard diagnostics integration handles this via hookBridgeWatcher.

  // Register workspace commands using CommandRegistry
  if (migrator) {
    const commandRegistry = getContainer().resolve(CommandRegistry);
    const commandDeps: CommandDependencies = {
      workspacePath,
      migrator,
      progressProvider: state.progressProvider,
      constitutionProvider: state.constitutionProvider,
      memoryProvider: state.memoryProvider,
      contextWindowProvider: state.contextWindowProvider,
      branchSpecManager: state.branchSpecManager,
      sharedContextBuilder: state.sharedContextBuilder,
      memoryManager: state.memoryManager,
      scopeGuard: state.scopeGuard,
      researchChunker: state.researchChunker,
      autoUpdater: state.autoUpdater,
      isUpgrading: () => state.isUpgrading,
      setUpgradeState,
    };
    commandRegistry.registerAll(context, commandDeps);
  }

  logger?.info('Extension', 'Workspace initialization complete');
}

/**
 * Register global commands (available even without workspace)
 * These commands are registered early before workspace detection
 */
function registerGlobalCommands(context: vscode.ExtensionContext): void {
  logger?.debug('Extension', 'Registering global commands');

  // gofer.initialize - Initialize .specify structure
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.initialize', async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const workspacePath = workspaceFolder.uri.fsPath;
      const migrator = new GoferMigrator(workspacePath);

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Initializing Gofer...',
          cancellable: false,
        },
        async () => {
          // Use upgrade with skipConfirmation to initialize fresh structure
          await migrator.upgrade({ skipConfirmation: true });
          await migrator.syncMissingResources();
          // Trigger workspace reinitialization to activate all features
          await reinitializeExtension(context);
          vscode.window.showInformationMessage('✅ Gofer initialized successfully!');
        }
      );
    })
  );

  // gofer.showConstitution - Show project constitution
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.showConstitution', async () => {
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const constitutionPath = path.join(workspacePath, '.specify', 'memory', 'constitution.md');
      try {
        const doc = await vscode.workspace.openTextDocument(constitutionPath);
        await vscode.window.showTextDocument(doc);
      } catch {
        vscode.window.showWarningMessage(
          'No constitution.md found. Run /gofer_constitution to create one.'
        );
      }
    })
  );

  const state = getState();

  // gofer.checkForUpdates - Manual update check (must be global for Command Palette)
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.checkForUpdates', async () => {
      if (state.autoUpdater) {
        await state.autoUpdater.manualCheck();
      } else {
        vscode.window.showErrorMessage('Auto-updater not initialized');
      }
    })
  );

  // gofer.updateNow - Update now (must be global - referenced in view/title menu)
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.updateNow', async () => {
      if (state.autoUpdater) {
        await state.autoUpdater.manualCheck();
      } else {
        vscode.window.showErrorMessage('Auto-updater not initialized');
      }
    })
  );

  // Register memory commands (deferred until memoryManager is initialized)
  // Commands will be registered in initializeForWorkspace() when memoryManager is ready
  if (state.memoryManager) {
    registerMemoryCommands(context, state.memoryManager);
  }

  // Register spec commands (deferred until progressProvider is initialized)
  if (state.progressProvider) {
    registerSpecCommands(context, state.progressProvider);
  }

  // Register council commands (always available)
  registerCouncilCommands(context);

  logger?.debug('Extension', 'Global commands registered');
}

/**
 * Extension deactivation
 * Uses DisposalService for proper cleanup
 */
export async function deactivate(): Promise<void> {
  logger?.info('Extension', 'Deactivating Gofer extension');

  const state = getState();

  // Resolve DisposalService for cleanup
  const disposalService = getContainer().resolve(DisposalService);
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  // Dispose all managed resources
  await disposalService.dispose(
    {
      sharedContextBuilder: state.sharedContextBuilder,
      cacheSaveTimer: state.cacheSaveTimer,
      consolidationTimer: state.consolidationTimer,
      workspaceContextProvider: state.workspaceContextProvider,
      contextHealthMonitor: state.contextHealthMonitor,
      autoHandoffTrigger: state.autoHandoffTrigger,
      contextHealthStatusBar: state.contextHealthStatusBar,
      continuousMemoryWriter: state.continuousMemoryWriter,
      hookBridgeWatcher: state.hookBridgeWatcher,
      multiSessionWatcher: state.multiSessionWatcher,
      goferActivityStatusBar: state.goferActivityStatusBar,
      contextUsageLogger: state.contextUsageLogger,
      progressProvider: state.progressProvider,
      constitutionProvider: state.constitutionProvider,
      memoryProvider: state.memoryProvider,
      branchSpecManager: state.branchSpecManager,
      memoryManager: state.memoryManager,
      autoUpdater: state.autoUpdater,
    },
    workspacePath
  );

  // Dispose rate limiter cleanup interval
  try {
    const { globalRateLimiter } = await import('./utils/rateLimiter');
    globalRateLimiter.dispose();
  } catch {
    // Rate limiter may not have been imported
  }

  // Dispose performance monitor timer
  try {
    const { PerformanceMonitor } = await import('./utils/performance');
    PerformanceMonitor.getInstance().dispose();
  } catch {
    // Performance monitor may not have been imported
  }

  // Stop Claude Code terminals (dynamic import to avoid blocking activation)
  try {
    const { stopClaudeCode } = await import('./autonomousCommands');
    await stopClaudeCode();
  } catch (error) {
    logger?.error('Extension', error as Error, { operation: 'stopClaudeCode' });
  }

  // Stop Language Server
  if (state.lspClient) {
    await state.lspClient.stop();
    state.lspClient = undefined;
  }

  logger?.info('Extension', 'Gofer extension deactivated');
}

/**
 * 002 AC-3.3: Try to find the most recent pipeline-state.json and set its runId on RunLedger.
 * Best-effort: if no pipeline state exists, RunLedger uses '' as fallback.
 */
async function tryWireRunId(
  pipelineStateManager: PipelineStateManager,
  runLedger: RunLedger,
  workspacePath: string
): Promise<void> {
  try {
    const specsDir = path.join(workspacePath, '.specify', 'specs');
    try {
      await fs.promises.access(specsDir);
    } catch {
      return;
    }

    const entries = await fs.promises.readdir(specsDir, { withFileTypes: true });
    let latestRunId = '';
    let latestTime = 0;

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
      const statePath = path.join(specsDir, entry.name, 'pipeline-state.json');
      try {
        const stat = await fs.promises.stat(statePath);
        if (stat.mtimeMs > latestTime) {
          const content = await fs.promises.readFile(statePath, 'utf-8');
          const state = JSON.parse(content);
          if (state.runId) {
            latestRunId = state.runId;
            latestTime = stat.mtimeMs;
          }
        }
      } catch {
        // pipeline-state.json doesn't exist for this feature
      }
    }

    if (latestRunId) {
      runLedger.setRunId(latestRunId);
      logger?.debug('Extension', `Wired RunLedger with runId: ${latestRunId.substring(0, 8)}...`);
    }
  } catch {
    // Non-fatal: RunLedger will use '' as runId
  }
}
