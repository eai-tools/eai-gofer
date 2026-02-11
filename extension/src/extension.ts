import * as vscode from 'vscode';
import * as path from 'path';
import { GoferMigrator } from './goferMigrator';
import { ProgressProvider } from './progressProvider';
import { ConstitutionProvider } from './constitutionProvider';
import { MemoryProvider } from './memoryProvider';
import { ContextWindowProvider } from './contextWindowProvider';
import { BranchSpecManager } from './branchSpecManager';
import { AutoUpdater } from './autoUpdater';
import { GoferLSPClient } from './lspClient';
import { MCPConfigHelper } from './mcpConfig';
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
import { ClaudeSessionReader } from './autonomous/ClaudeSessionReader';
import { ContinuousMemoryWriter } from './autonomous/ContinuousMemoryWriter';
import { MemoryHookManager } from './autonomous/MemoryHookManager';
import { KnowledgeGraph } from './autonomous/KnowledgeGraph';
import { CitationVerifier } from './autonomous/CitationVerifier';
import { ScopeGuard } from './autonomous/ScopeGuard';
import { SlopDetector } from './autonomous/SlopDetector';
import { AutonomousLLMProvider } from './autonomous/LLMProvider';
import { ResearchSummarizer } from './autonomous/ResearchSummarizer';
import { ContextCompactor } from './autonomous/ContextCompactor';
import { SubAgentDispatcher } from './autonomous/SubAgentDispatcher';
// Hook-based monitoring
import { HookBridgeWatcher, BridgeData } from './autonomous/HookBridgeWatcher';
import { MultiSessionBridgeWatcher } from './autonomous/MultiSessionBridgeWatcher';
import { GoferActivityStatusBar } from './ui/GoferActivityStatusBar';
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

let progressProvider: ProgressProvider | undefined;
let constitutionProvider: ConstitutionProvider | undefined;
let memoryProvider: MemoryProvider | undefined;
let contextWindowProvider: ContextWindowProvider | undefined;
let branchSpecManager: BranchSpecManager | undefined;
let autoUpdater: AutoUpdater | undefined;
let lspClient: GoferLSPClient | undefined;
let memoryManager: MemoryManager | undefined;
// Context Health Monitoring (Spec 012)
let contextHealthMonitor: ContextHealthMonitor | undefined;
let contextUsageLogger: ContextUsageLogger | undefined;
let contextHealthStatusBar: ContextHealthStatusBar | undefined;
let autoHandoffTrigger: AutoHandoffTrigger | undefined;
// Real Context Monitoring (Spec 014)
let continuousMemoryWriter: ContinuousMemoryWriter | undefined;
// Memory Operation Hooks (Spec 010)
let memoryHookManager: MemoryHookManager | undefined;
// Hook-based monitoring
let hookBridgeWatcher: HookBridgeWatcher | undefined;
let multiSessionWatcher: MultiSessionBridgeWatcher | undefined;
let goferActivityStatusBar: GoferActivityStatusBar | undefined;
// 018: Module-level references for deactivate cleanup
let cacheSaveTimerRef: ReturnType<typeof setTimeout> | null = null;
let sharedContextBuilderRef: ContextBuilder | undefined;
let consolidationTimerRef: ReturnType<typeof setInterval> | null = null;
// 018 T041: Module-level reference for contextProvider (needed for config reload)
let workspaceContextProviderRef: WorkspaceContextProvider | undefined;

// Flag to prevent file watcher refreshes during upgrade
let isUpgrading = false;

// Flag to prevent duplicate command registration
let workspaceCommandsRegistered = false;

/**
 * Set the upgrade state (exported for use by goferMigrator)
 */
export function setUpgradeState(state: boolean): void {
  isUpgrading = state;
}

/**
 * Check if an upgrade is in progress
 */
export function isUpgradeInProgress(): boolean {
  return isUpgrading;
}

export async function activate(context: vscode.ExtensionContext) {
  // Reset Claude Code running context on startup (in case it was left true from a crash)
  await vscode.commands.executeCommand('setContext', 'gofer.claudeCodeRunning', false);
  console.log('[Gofer] Reset claudeCodeRunning context to false');

  // Setup auto-updater (using GitHub Pages API for private repo)
  const packageJson = require('../package.json');
  console.log(`Gofer (Enterprise AI) v${packageJson.version} extension activated`);
  autoUpdater = new AutoUpdater(
    'eai-tools/gofer', // GitHub repo
    packageJson.version, // Current version
    'gofer' // Extension name for VSIX filename
  );

  // Start checking for updates using GitHub Pages API
  autoUpdater.startPeriodicChecks(context);

  // Start Language Server (non-blocking - extension works without it)
  lspClient = new GoferLSPClient(context);
  lspClient
    .start()
    .then(() => {
      console.log('[Gofer] Language Server started successfully');
    })
    .catch((error) => {
      console.warn('[Gofer] Language Server failed to start (non-critical):', error);
      // LSP is optional - extension works without it
    });

  // Register tree views IMMEDIATELY (even if empty) so VSCode can find them
  // This must happen before any commands that reference these views
  registerTreeViews(context);

  // Register commands globally (before workspace check)
  // This ensures commands are always available even without a workspace
  registerGlobalCommands(context);

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    console.log('[Gofer] No workspace folder open, waiting...');
    // No workspace open yet, wait for one
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      await reinitializeExtension(context);
    });
    return;
  }

  console.log(`[Gofer] Workspace detected: ${workspaceFolder.uri.fsPath}`);

  // Initialize workspace in background (non-blocking) to prevent activation timeout
  initializeForWorkspace(context).catch((error) => {
    console.warn('[Gofer] Workspace initialization failed (non-critical):', error);
  });

  // Listen for workspace changes to reinitialize
  vscode.workspace.onDidChangeWorkspaceFolders(async () => {
    await reinitializeExtension(context);
  });
}

/**
 * Register tree views immediately on activation
 * Views must be registered before commands that reference them
 */
function registerTreeViews(context: vscode.ExtensionContext) {
  // Get workspace path (or use empty string if no workspace)
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  // Create providers with empty/initial state
  // They will be properly initialized later when workspace is ready
  progressProvider = new ProgressProvider(workspacePath, undefined);
  constitutionProvider = new ConstitutionProvider(workspacePath);
  memoryProvider = new MemoryProvider(workspacePath);
  contextWindowProvider = new ContextWindowProvider(workspacePath);

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
  contextHealthStatusBar = new ContextHealthStatusBar(context);
  console.log('[Gofer] Context health status bar created');

  console.log('[Gofer] Tree views registered');
}

async function reinitializeExtension(context: vscode.ExtensionContext) {
  console.log('[Gofer] Workspace changed, reinitializing...');

  // Refresh the providers with new workspace data
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    const workspacePath = workspaceFolder.uri.fsPath;

    // Reinitialize branch spec manager
    if (branchSpecManager) {
      branchSpecManager = new BranchSpecManager(workspacePath);
      await branchSpecManager.initializeBranchStructure();
    }

    // Update providers with new workspace
    if (progressProvider) {
      progressProvider.refresh();
    }
    if (constitutionProvider) {
      constitutionProvider.refresh();
    }
    if (memoryProvider) {
      memoryProvider.refresh();
    }
  }

  // Reinitialize for new workspace
  await initializeForWorkspace(context);
}

async function initializeForWorkspace(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return;
  }

  const workspacePath = workspaceFolder.uri.fsPath;
  const migrator = new GoferMigrator(workspacePath);

  // Check if .specify exists and what format it's in
  const versionInfo = await migrator.getVersionInfo();

  console.log('Gofer format detected:', versionInfo.format);

  // Handle different scenarios
  switch (versionInfo.format) {
    case 'none':
      await handleNoGofer(context, workspacePath, migrator);
      break;

    case 'legacy-json':
      await handleLegacyFormat(context, workspacePath, migrator);
      break;

    case 'gofer':
      await handleGoferFormat(context, workspacePath);
      break;

    case 'mixed':
      await handleMixedFormat(context, workspacePath, migrator);
      break;
  }

  // Register commands (always available)
  await registerCommands(context, workspacePath, migrator);
}

async function handleNoGofer(
  context: vscode.ExtensionContext,
  workspacePath: string,
  migrator: GoferMigrator
) {
  console.log('No .specify folder found');

  const config = vscode.workspace.getConfiguration('gofer');
  const autoInit = config.get<boolean>('autoInitialize', false);

  if (autoInit) {
    const choice = await vscode.window.showInformationMessage(
      'No Gofer structure found in this workspace. Initialize now?',
      'Yes',
      'No',
      "Don't ask again"
    );

    if (choice === 'Yes') {
      await vscode.commands.executeCommand('gofer.initialize');
    } else if (choice === "Don't ask again") {
      await config.update('autoInitialize', false, vscode.ConfigurationTarget.Global);
    }
  }
}

async function handleLegacyFormat(
  context: vscode.ExtensionContext,
  workspacePath: string,
  migrator: GoferMigrator
) {
  console.log('Legacy JSON format detected');

  const choice = await vscode.window.showWarningMessage(
    '📦 Old .specify format detected (JSON)\n\nUpgrade to GitHub Gofer format (Markdown)?',
    { modal: false },
    'Upgrade Now',
    'Later',
    'Learn More'
  );

  if (choice === 'Upgrade Now') {
    await migrator.upgrade();
    await handleGoferFormat(context, workspacePath);
  } else if (choice === 'Learn More') {
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/github/gofer'));
  } else {
    // Use legacy format for now
    await initializeProgressProvider(context, workspacePath);
  }
}

async function handleGoferFormat(context: vscode.ExtensionContext, workspacePath: string) {
  console.log('[Gofer] Gofer format detected - starting initialization...');

  console.log('[Gofer] Calling initializeProgressProvider...');
  await initializeProgressProvider(context, workspacePath);
  console.log('[Gofer] initializeProgressProvider completed');

  // Auto-setup MCP configuration for Claude Code integration
  console.log('[Gofer] Setting up MCP configuration...');
  const mcpConfigHelper = new MCPConfigHelper(workspacePath, context);
  const created = await mcpConfigHelper.autoSetup();

  if (created) {
    console.log('[Gofer] MCP configuration auto-created for Claude Code integration');
  }

  // Check if templates need updating based on extension version
  console.log('[Gofer] Checking for template updates...');
  await checkForTemplateUpdates(workspacePath, context);
  console.log('[Gofer] Template check completed');

  // Check for and sync missing bundled resources (e.g., on Codespaces or new machines)
  // This handles the case where .specify/ exists but bundled resources weren't committed
  console.log('[Gofer] Syncing missing resources...');
  const migrator = new GoferMigrator(workspacePath);
  await migrator.syncMissingResources();
  console.log('[Gofer] Resource sync completed');

  // Initialize Context Health Monitoring (Spec 012) - non-blocking
  console.log('[Gofer] Initializing context health monitoring...');
  initializeContextHealthMonitoring(workspacePath);
  console.log('[Gofer] Context health monitoring initialized');

  vscode.window.setStatusBarMessage('$(notebook) Gofer - Enterprise AI ready', 3000);
  console.log('[Gofer] Workspace initialization completed successfully');
}

/**
 * Initialize context health monitoring components (Spec 012)
 *
 * Creates and wires together:
 * - ContextUsageLogger (JSONL logging)
 * - ContextHealthMonitor (health tracking)
 * - AutoHandoffTrigger (critical threshold handling)
 * - ContextHealthStatusBar (UI display)
 */
function initializeContextHealthMonitoring(workspacePath: string): void {
  try {
    // Create components
    contextUsageLogger = new ContextUsageLogger(workspacePath);
    contextHealthMonitor = new ContextHealthMonitor();
    contextHealthMonitor.setWorkspaceRoot(workspacePath); // For state persistence (Spec 012)
    autoHandoffTrigger = new AutoHandoffTrigger();

    // Wire status bar to monitor
    if (contextHealthStatusBar) {
      contextHealthStatusBar.connect(contextHealthMonitor);
      contextHealthStatusBar.show();
    }

    // Wire auto-handoff to monitor and logger
    autoHandoffTrigger.connect(contextHealthMonitor);
    autoHandoffTrigger.setUsageLogger(contextUsageLogger);

    // Wire real context provider for token estimation (Spec 013 Phase 2)
    const contextProvider = new WorkspaceContextProvider(workspacePath);
    workspaceContextProviderRef = contextProvider;

    // Wire ClaudeSessionReader for real JSONL session data (Spec 014 T038)
    const sessionReader = new ClaudeSessionReader(workspacePath);
    contextProvider.setSessionReader(sessionReader);

    // Wire MultiSessionBridgeWatcher for multi-session context data (020)
    multiSessionWatcher = new MultiSessionBridgeWatcher(workspacePath);
    contextProvider.setHookBridgeWatcher(multiSessionWatcher);
    multiSessionWatcher.start();

    // Also keep legacy HookBridgeWatcher reference for GoferActivityStatusBar
    hookBridgeWatcher = new HookBridgeWatcher(workspacePath);
    hookBridgeWatcher.start();

    // Create GoferActivityStatusBar driven by legacy hook bridge
    goferActivityStatusBar = new GoferActivityStatusBar(hookBridgeWatcher);
    goferActivityStatusBar.show();

    // T044: Connect ContextWindowProvider to MultiSessionBridgeWatcher
    if (contextWindowProvider) {
      contextWindowProvider.setWatcher(multiSessionWatcher);
    }

    // T046: Wire session-update event to update status bar session count
    multiSessionWatcher.on('session-update', () => {
      if (contextHealthStatusBar && multiSessionWatcher) {
        contextHealthStatusBar.setSessionCount(multiSessionWatcher.getSessionCount());
      }
    });

    multiSessionWatcher.on('session-added', () => {
      if (contextHealthStatusBar && multiSessionWatcher) {
        contextHealthStatusBar.setSessionCount(multiSessionWatcher.getSessionCount());
      }
    });

    multiSessionWatcher.on('session-removed', () => {
      if (contextHealthStatusBar && multiSessionWatcher) {
        contextHealthStatusBar.setSessionCount(multiSessionWatcher.getSessionCount());
      }
    });

    // T043: Wire session-limit-reached to info notification
    multiSessionWatcher.on(
      'session-limit-reached',
      (payload: { evictedSessionId: string; newSessionId: string }) => {
        vscode.window.showInformationMessage(
          `Gofer tracks up to 3 Claude Code sessions. Session ${payload.evictedSessionId.substring(0, 8)} was evicted to make room for ${payload.newSessionId.substring(0, 8)}.`
        );
      }
    );

    // On bridge update (legacy event from focused session), trigger immediate health check
    multiSessionWatcher.on('bridge-update', () => {
      contextHealthMonitor?.checkHealth();
    });

    // On session start from hooks, slow polling (hooks handle real-time updates)
    multiSessionWatcher.on('session-start', () => {
      contextHealthMonitor?.startMonitoring(60000);
      console.log('[Gofer] Hooks active — polling slowed to 60s');
    });

    // On stale bridge, speed up polling as fallback
    multiSessionWatcher.on('session-stale', () => {
      contextHealthMonitor?.startMonitoring(10000);
      console.log('[Gofer] Hook bridge stale — polling restored to 10s');
    });

    contextHealthMonitor.setContextProvider(() => contextProvider.getContextAnalysis());

    // Run initial health check and start periodic monitoring
    // Use 10s interval when active session detected, 30s otherwise (Spec 014 T040)
    contextHealthMonitor.checkHealth();
    const hookDataAvailable = multiSessionWatcher.isHookDataAvailable();
    const activeSession = sessionReader.findActiveSession();
    const pollingInterval = hookDataAvailable ? 60000 : activeSession ? 10000 : 30000;
    contextHealthMonitor.startMonitoring(pollingInterval);
    console.log(
      `[Gofer] Context monitoring polling at ${pollingInterval / 1000}s (hooks: ${hookDataAvailable}, session: ${activeSession ? 'active' : 'inactive'})`
    );

    // Connect logger to monitor events for JSONL logging
    contextHealthMonitor.on('healthy', (status) => {
      contextUsageLogger?.logHealthCheck({
        sessionId: status.sessionId || 'unknown',
        stage: 'unknown',
        status: status.status,
        tokensUsed: status.tokensUsed,
        tokensLimit: status.tokensLimit,
        utilizationPercent: status.utilizationPercent,
        breakdown: status.breakdown,
      });
    });

    contextHealthMonitor.on('warning', (status) => {
      contextUsageLogger?.logHealthCheck({
        sessionId: status.sessionId || 'unknown',
        stage: 'unknown',
        status: status.status,
        tokensUsed: status.tokensUsed,
        tokensLimit: status.tokensLimit,
        utilizationPercent: status.utilizationPercent,
        breakdown: status.breakdown,
        action: 'Consider saving progress',
      });
    });

    contextHealthMonitor.on('critical', (status) => {
      contextUsageLogger?.logHealthCheck({
        sessionId: status.sessionId || 'unknown',
        stage: 'unknown',
        status: status.status,
        tokensUsed: status.tokensUsed,
        tokensLimit: status.tokensLimit,
        utilizationPercent: status.utilizationPercent,
        breakdown: status.breakdown,
        action: 'Handoff recommended',
      });
    });

    // Note: startMonitoring() already called above with 30s interval

    console.log('[Gofer] Context health monitoring initialized');
  } catch (error) {
    console.error('[Gofer] Failed to initialize context health monitoring:', error);
  }
}

/**
 * Check if templates need updating when extension version is newer
 */
async function checkForTemplateUpdates(workspacePath: string, context: vscode.ExtensionContext) {
  const fs = require('fs/promises');
  const path = require('path');

  const packageJson = require('../package.json');
  const currentVersion = packageJson.version;
  const versionFilePath = path.join(workspacePath, '.specify', '.gofer-version');

  try {
    // Read stored version
    let storedVersion = '0.0.0';
    try {
      storedVersion = (await fs.readFile(versionFilePath, 'utf8')).trim();
    } catch {
      // No version file yet - first time or pre-versioning install
    }

    // Compare versions
    const isNewer = compareVersions(currentVersion, storedVersion) > 0;

    if (isNewer && storedVersion !== '0.0.0') {
      // Prompt user to upgrade templates
      const choice = await vscode.window.showInformationMessage(
        `Gofer v${currentVersion} has new templates and commands available (you have v${storedVersion} installed in .specify/).`,
        'Upgrade Now',
        'Later'
      );

      if (choice === 'Upgrade Now') {
        const migrator = new GoferMigrator(workspacePath);
        await migrator.upgrade();
        // Update stored version after successful upgrade
        await fs.writeFile(versionFilePath, currentVersion);
        vscode.window.showInformationMessage(`✅ Templates upgraded to v${currentVersion}`);

        // Refresh providers after upgrade completes
        if (progressProvider) {
          progressProvider.refresh();
        }
        if (constitutionProvider) {
          constitutionProvider.refresh();
        }
        if (memoryProvider) {
          memoryProvider.refresh();
        }
      }
    } else if (storedVersion === '0.0.0') {
      // First time tracking - just save current version
      await fs.writeFile(versionFilePath, currentVersion);
    }
  } catch (error) {
    console.error('[checkForTemplateUpdates] Error:', error);
  }
}

/**
 * Compare semantic versions. Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (aParts[i] > bParts[i]) {
      return 1;
    }
    if (aParts[i] < bParts[i]) {
      return -1;
    }
  }
  return 0;
}

async function handleMixedFormat(
  context: vscode.ExtensionContext,
  workspacePath: string,
  migrator: GoferMigrator
) {
  console.log('Mixed format detected');

  const choice = await vscode.window.showWarningMessage(
    'Mixed .specify formats detected. Complete migration to Gofer?',
    'Migrate',
    'Later'
  );

  if (choice === 'Migrate') {
    await migrator.upgrade();
    await handleGoferFormat(context, workspacePath);
  } else {
    await initializeProgressProvider(context, workspacePath);
  }
}

async function initializeProgressProvider(context: vscode.ExtensionContext, workspacePath: string) {
  // Initialize branch-aware spec manager with timeout protection
  try {
    console.log('[Gofer] Initializing BranchSpecManager...');
    branchSpecManager = new BranchSpecManager(workspacePath);

    // BranchSpecManager.initialize() is async (uses execFile, not execSync)
    // so it won't block the event loop during git detection
    const initPromise = branchSpecManager.initializeBranchStructure();
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('BranchSpecManager init timed out')), 10000);
    });

    await Promise.race([initPromise, timeoutPromise]);
    console.log('[Gofer] BranchSpecManager initialized successfully');
  } catch (error) {
    console.warn('[Gofer] BranchSpecManager initialization failed (continuing without it):', error);
    branchSpecManager = undefined;
  }

  // Update the ProgressProvider with the new workspace path and branch manager.
  // This recreates the internal GoferParser so it uses the correct branchSpecManager.
  // Previously we set branchSpecManager via (as any) cast which never reached the parser.
  if (progressProvider) {
    progressProvider.updateWorkspace(workspacePath, branchSpecManager);
    console.log('[Gofer] Updated progressProvider workspace and branchSpecManager');
    progressProvider.refresh();
  }
  if (constitutionProvider) {
    constitutionProvider.refresh();
  }
  if (memoryProvider) {
    memoryProvider.refresh();
  }

  // Watch for git branch changes
  const gitExtension = vscode.extensions.getExtension('vscode.git');
  if (gitExtension) {
    const git = gitExtension.exports.getAPI(1);
    if (git.repositories.length > 0) {
      const repo = git.repositories[0];
      repo.state.onDidChange(() => {
        // Branch might have changed
        handleBranchChange();
      });
    }
  }

  // T112: Watch for spec file modifications to show impact notifications
  const specWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspacePath, '.specify/specs/**/spec.md')
  );

  specWatcher.onDidChange(async (uri) => {
    await handleSpecModification(uri, workspacePath);
  });

  context.subscriptions.push(specWatcher);

  // Set context for when clause
  vscode.commands.executeCommand('setContext', 'goferInitialized', true);

  // Show the Gofer view
  vscode.commands.executeCommand('goferProgress.focus');
}

/**
 * T113-T115: Handle spec file modifications and show impact notifications
 */
async function handleSpecModification(uri: vscode.Uri, workspacePath: string) {
  // Skip refresh during upgrade to prevent file watcher loops
  if (isUpgrading) {
    console.log('[EAI-GOFER] Skipping spec modification handling during upgrade');
    return;
  }

  if (!progressProvider) {
    return;
  }

  try {
    // Extract spec ID from file path
    // Path format: .specify/specs/001-spec-name/spec.md
    const pathParts = uri.fsPath.split(path.sep);
    const specsIndex = pathParts.findIndex((p) => p === 'specs');
    if (specsIndex === -1 || specsIndex >= pathParts.length - 2) {
      return;
    }

    const specId = pathParts[specsIndex + 1];

    // Get impact report for this spec
    const graph = progressProvider.getDependencyGraph();
    if (!graph.getSpec(specId)) {
      // Spec not in graph yet, refresh to load it
      progressProvider.refresh();
      return;
    }

    const impactReport = graph.getImpactReport(specId);

    // T113: Show notification if spec has dependents
    if (impactReport.directDependents.length > 0 || impactReport.transitiveDependents.length > 0) {
      const allDependents = [
        ...impactReport.directDependents,
        ...impactReport.transitiveDependents,
      ];
      const uniqueDependents = [...new Set(allDependents)];

      // T114: Format notification message
      const message = `This change may impact: ${uniqueDependents.slice(0, 3).join(', ')}${
        uniqueDependents.length > 3 ? ` and ${uniqueDependents.length - 3} more` : ''
      }`;

      // T115: Add "Show Impact Report" button
      const choice = await vscode.window.showInformationMessage(
        message,
        'Show Impact Report',
        'Dismiss'
      );

      if (choice === 'Show Impact Report') {
        await showImpactReport(specId, impactReport);
      }
    }
  } catch (error) {
    console.error('[Gofer] Error handling spec modification:', error);
  }
}

/**
 * Show detailed impact report in a webview or output channel
 */
async function showImpactReport(
  specId: string,
  report: {
    specId: string;
    directDependencies: string[];
    directDependents: string[];
    transitiveDependencies: string[];
    transitiveDependents: string[];
    impactScore: number;
  }
) {
  const message = [
    `Impact Analysis for ${specId}`,
    '',
    `Impact Score: ${report.impactScore}/100`,
    '',
    'Direct Dependencies:',
    ...report.directDependencies.map((dep) => `  → ${dep}`),
    '',
    'Direct Dependents:',
    ...report.directDependents.map((dep) => `  ← ${dep}`),
    '',
    'Transitive Dependencies:',
    ...report.transitiveDependencies.map((dep) => `  → ${dep}`),
    '',
    'Transitive Dependents:',
    ...report.transitiveDependents.map((dep) => `  ← ${dep}`),
  ].join('\n');

  const document = await vscode.workspace.openTextDocument({
    content: message,
    language: 'markdown',
  });

  await vscode.window.showTextDocument(document, {
    preview: true,
    viewColumn: vscode.ViewColumn.Beside,
  });
}

async function handleBranchChange() {
  if (branchSpecManager) {
    await branchSpecManager.refreshBranch();
    if (progressProvider) {
      progressProvider.refresh();
    }
    const currentBranch = branchSpecManager.getBranch();
    vscode.window.setStatusBarMessage(`$(git-branch) Gofer: Switched to ${currentBranch}`, 3000);
  }
}

/**
 * Register commands that work globally without requiring a workspace
 */
function registerGlobalCommands(context: vscode.ExtensionContext) {
  // Initialize/Create Gofer structure
  // CRITICAL: This must be registered here (not in registerCommands) so it's
  // available immediately when the welcome view "Initialize Gofer" button appears.
  // Previously it was registered in registerCommands() which runs at the end of
  // initializeForWorkspace() — if anything in that chain failed, the command was
  // never registered and the button silently did nothing.
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.initialize', async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open. Open a folder first.');
        return;
      }

      const workspacePath = workspaceFolder.uri.fsPath;
      const migrator = new GoferMigrator(workspacePath);

      try {
        const exists = await migrator.exists();

        if (exists) {
          const versionInfo = await migrator.getVersionInfo();

          if (versionInfo.needsUpgrade) {
            await migrator.upgrade();
          } else if (versionInfo.format === 'gofer') {
            await migrator.upgrade();
          } else {
            vscode.window.showInformationMessage('Gofer already initialized!');
          }
        } else {
          // Create from scratch — skip confirmation since user explicitly
          // clicked "Initialize Gofer"
          await migrator.upgrade({ skipConfirmation: true });
        }

        // Use handleGoferFormat() instead of just initializeProgressProvider()
        // so that MCP config, context health monitoring, status bars, and
        // resource sync are all set up — not just the tree view.
        await handleGoferFormat(context, workspacePath);

        // Register workspace-specific commands if not already done
        await registerCommands(context, workspacePath, migrator);
      } catch (error) {
        console.error('[Gofer] Initialize failed:', error);
        vscode.window.showErrorMessage(
          `Failed to initialize Gofer: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  // Show progress panel
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.showProgress', () => {
      vscode.commands.executeCommand('goferProgress.focus');
    })
  );

  // Show constitution (opens file directly since panel was replaced by Context Window in 020)
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.showConstitution', async () => {
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (workspacePath) {
        const constitutionPath = path.join(workspacePath, '.specify', 'memory', 'constitution.md');
        try {
          const uri = vscode.Uri.file(constitutionPath);
          await vscode.commands.executeCommand('markdown.showPreview', uri);
        } catch {
          vscode.window.showWarningMessage('Constitution file not found');
        }
      }
    })
  );

  // Manual update check
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.checkForUpdates', async () => {
      if (autoUpdater) {
        await autoUpdater.manualCheck();
      } else {
        vscode.window.showErrorMessage('Auto-updater not initialized');
      }
    })
  );

  // Update now command
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.updateNow', async () => {
      if (autoUpdater) {
        await autoUpdater.manualCheck();
      } else {
        vscode.window.showErrorMessage('Auto-updater not initialized');
      }
    })
  );

  // Refresh specs
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.refreshSpecs', () => {
      if (progressProvider) {
        progressProvider.refresh();
      } else {
        vscode.window.showWarningMessage('No workspace with Gofer initialized');
      }
    })
  );

  // Refresh constitution
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.refreshConstitution', () => {
      if (constitutionProvider) {
        constitutionProvider.refresh();
      } else {
        vscode.window.showWarningMessage('No workspace with Gofer initialized');
      }
    })
  );

  // Refresh context window (020)
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.refreshContextWindow', () => {
      if (contextWindowProvider) {
        contextWindowProvider.refresh();
      }
    })
  );

  // Show context category content (021) — click handler for Context Window tree items
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'gofer.showContextCategoryContent',
      async (sessionId: string, categoryName: string) => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) return;

        const { ContextContentPanel } = await import('./ui/ContextContentPanel');
        const panel = ContextContentPanel.createOrShow(context.extensionUri, workspacePath);

        const bridgeData = multiSessionWatcher?.getSessions().get(sessionId);
        await panel.showCategory(sessionId, categoryName, bridgeData);
      }
    )
  );

  // Refresh memory
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.refreshMemory', () => {
      if (memoryProvider) {
        memoryProvider.refresh();
      } else {
        vscode.window.showWarningMessage('No workspace with Gofer initialized');
      }
    })
  );

  // Tree view detail commands - must be global since tree views are global
  // Show spec details command (from tree view clicks)
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.showSpecDetails', async (spec: any) => {
      const { showSpecDetailsWebview } = await import('./webviewHelpers');
      showSpecDetailsWebview(context, spec);
    })
  );

  // Show task details command (from tree view task clicks)
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.showTaskDetails', async (task: any, spec: any) => {
      const { showTaskDetailsWebview } = await import('./webviewHelpers');
      showTaskDetailsWebview(context, task, spec);
    })
  );

  // Show section details command (from constitution tree view clicks)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'gofer.showSectionDetails',
      async (section: any, article: any) => {
        const { showSectionDetailsWebview } = await import('./webviewHelpers');
        showSectionDetailsWebview(context, section, article);
      }
    )
  );

  // Show article details command (from constitution article clicks)
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.showArticleDetails', async (article: any) => {
      const { showArticleDetailsWebview } = await import('./webviewHelpers');
      showArticleDetailsWebview(context, article);
    })
  );

  // Show memory document command (from memory tree view clicks)
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.showMemoryDocument', async (document: any) => {
      const { showMemoryDocumentWebview } = await import('./webviewHelpers');
      await showMemoryDocumentWebview(context, document);
    })
  );

  // Show memory section command (from memory section clicks)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'gofer.showMemorySection',
      async (section: any, document: any) => {
        const { showMemorySectionWebview } = await import('./webviewHelpers');
        await showMemorySectionWebview(context, section, document);
      }
    )
  );

  // Open With... context menu commands
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.openWithPreview', async (item: any) => {
      const { openWithPreview } = await import('./webviewHelpers');
      await openWithPreview(item);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.openWithMarkSharp', async (item: any) => {
      const { openWithMarkSharp } = await import('./webviewHelpers');
      await openWithMarkSharp(item);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.openWithMarkdownEditor', async (item: any) => {
      const { openWithMarkdownEditor } = await import('./webviewHelpers');
      await openWithMarkdownEditor(item);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.openWithMarkdownWYSIWYG', async (item: any) => {
      const { openWithMarkdownWYSIWYG } = await import('./webviewHelpers');
      await openWithMarkdownWYSIWYG(item);
    })
  );

  // LLM Council commands
  registerCouncilCommands(context);

  // Claude Code Terminal commands
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.startClaudeCode', async (item: any) => {
      try {
        console.log('[Gofer] startClaudeCode command triggered');
        console.log('[Gofer] Item received:', item);

        const { launchClaudeCode } = await import('./autonomousCommands');
        console.log('[Gofer] autonomousCommands imported');

        // Handle both direct spec objects and TreeItem objects
        let spec = item;

        // If this is a TreeItem with a spec property, extract the spec
        if (item && item.spec && item.label) {
          console.log('[Gofer] Extracting spec from TreeItem');
          spec = item.spec;
        }

        console.log('[Gofer] Final spec:', spec);

        if (!spec || !spec.id) {
          console.error('[Gofer] Invalid spec - missing ID:', spec);
          vscode.window.showErrorMessage('Invalid spec: missing ID');
          return;
        }

        console.log('[Gofer] Calling launchClaudeCode with spec.id:', spec.id);
        await launchClaudeCode(spec.id);
        console.log('[Gofer] launchClaudeCode completed');
      } catch (error) {
        console.error('[Gofer] Error in startClaudeCode command:', error);
        vscode.window.showErrorMessage(
          `Failed to start Claude Code: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.stopClaudeCode', async () => {
      const { stopClaudeCode } = await import('./autonomousCommands');
      await stopClaudeCode();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.pauseClaudeCode', async () => {
      const { pauseClaudeCode } = await import('./autonomousCommands');
      await pauseClaudeCode();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.resumeClaudeCode', async () => {
      const { resumeClaudeCode } = await import('./autonomousCommands');
      await resumeClaudeCode();
    })
  );
}

/**
 * Extract spec ID from a file URI within .specify/specs/{specId}/
 * (Spec 013 T042)
 */
function extractSpecId(uri: vscode.Uri): string | null {
  const fsPath = uri.fsPath;
  const specsIdx = fsPath.indexOf('.specify/specs/');
  if (specsIdx === -1) {
    return null;
  }

  const afterSpecs = fsPath.substring(specsIdx + '.specify/specs/'.length);
  const slashIdx = afterSpecs.indexOf('/');
  if (slashIdx === -1) {
    return null;
  }

  return afterSpecs.substring(0, slashIdx);
}

/**
 * Register commands that require a workspace
 */
async function registerCommands(
  context: vscode.ExtensionContext,
  workspacePath: string,
  migrator: GoferMigrator
): Promise<void> {
  // Guard against duplicate registration (can happen if gofer.initialize
  // triggers this, and then initializeForWorkspace also calls it)
  if (workspaceCommandsRegistered) {
    console.log('[Gofer] Workspace commands already registered, skipping');
    return;
  }
  workspaceCommandsRegistered = true;

  // Note: gofer.initialize is registered in registerGlobalCommands() so it's
  // available immediately when the welcome view button appears.

  // Upgrade existing .specify
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.upgrade', async () => {
      await migrator.upgrade();
      if (progressProvider) {
        progressProvider.refresh();
      }
    })
  );

  // Show version info
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.checkVersion', async () => {
      const versionInfo = await migrator.getVersionInfo();

      vscode.window
        .showInformationMessage(
          `Gofer Status:\n\nFormat: ${versionInfo.format}\n${versionInfo.details}`,
          versionInfo.needsUpgrade ? 'Upgrade' : 'OK'
        )
        .then((choice) => {
          if (choice === 'Upgrade') {
            vscode.commands.executeCommand('gofer.upgrade');
          }
        });
    })
  );

  // Fix spec path references command (specs/ → .specify/specs/)
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.fixSpecPaths', async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Fixing spec path references...',
          cancellable: false,
        },
        async () => {
          // Access the private method via reflection (TypeScript workaround)
          await (migrator as any).fixSpecPathReferences();
          vscode.window.showInformationMessage(
            'Spec paths fixed! All scripts now use .specify/specs/ instead of specs/',
            'OK'
          );
        }
      );
    })
  );

  // Update templates command
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.updateTemplates', async () => {
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Updating Gofer Templates',
          cancellable: false,
        },
        async (progress) => {
          try {
            const { TemplateDownloader } = await import('./templateDownloader');
            const cacheDir = path.join(context.globalStorageUri.fsPath, 'templates');
            const downloader = TemplateDownloader.getInstance(cacheDir);

            const manifest = await downloader.downloadLatestTemplates(workspacePath, {
              force: true, // Force download to get latest
              progress: (update) => {
                progress.report({
                  message: update.message,
                  increment: update.progress ? update.progress / 5 : undefined,
                });
              },
            });

            vscode.window.showInformationMessage(
              `✅ Templates updated to version ${manifest.version}`
            );

            // Refresh the progress view
            progressProvider?.refresh();
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to update templates: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      );
    })
  );

  // Create new specification command
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.createSpec', async (uri?: vscode.Uri) => {
      const specName = await vscode.window.showInputBox({
        prompt: 'Enter specification name (e.g., "user-authentication")',
        placeHolder: 'my-feature',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Specification name is required';
          }
          if (!/^[a-z0-9-]+$/.test(value.trim())) {
            return 'Name must be lowercase with dashes only (a-z, 0-9, -)';
          }
          return null;
        },
      });

      if (specName) {
        const specsPath = path.join(workspacePath, '.specify', 'specs', specName.trim());
        const specFile = path.join(specsPath, 'spec.md');

        try {
          // Create directory if it doesn't exist
          await vscode.workspace.fs.createDirectory(vscode.Uri.file(specsPath));

          // Create spec template following Gofer pipeline format
          const specTitle = specName
            .trim()
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase());
          const specTemplate = `---
id: "${specName.trim()}"
title: "${specTitle}"
status: "draft"
created: "${new Date().toISOString().split('T')[0]}"
priority: "P1"
---

# Feature Specification: ${specTitle}

<!--
  To generate a complete implementation, use the Gofer pipeline in Claude Code:
  /0_business_scenario ${specTitle}

  Or run individual stages:
  /1_gofer_research  → Creates research.md
  /2_gofer_specify   → Updates this spec.md
  /3_gofer_plan      → Creates plan.md, data-model.md, contracts/
  /4_gofer_tasks     → Creates tasks.md
  /5_gofer_implement → Implements the code
  /6_gofer_validate  → Validates implementation
-->

## User Scenarios & Testing

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST [specific capability]
- **FR-003**: Users MUST be able to [key interaction]

### Non-Functional Requirements

- **NFR-001**: Performance requirement
- **NFR-002**: Security requirement

## Success Criteria

- **SC-001**: [Measurable metric]
- **SC-002**: [Measurable metric]

## Protected Boundaries

Files/modules that should NOT be modified:
- [List any protected files or areas]
`;

          await vscode.workspace.fs.writeFile(vscode.Uri.file(specFile), Buffer.from(specTemplate));

          // Create initial tasks.md file
          const tasksFile = path.join(specsPath, 'tasks.md');
          const tasksTemplate = `---
feature: "${specName.trim()}"
status: "draft"
created: "${new Date().toISOString().split('T')[0]}"
---

# Tasks: ${specTitle}

<!--
  Generate tasks automatically using Claude Code:
  /4_gofer_tasks

  Or run the full pipeline:
  /0_business_scenario ${specTitle}
-->

## Phase 1: Setup

- [ ] T001 [Setup] Create initial project structure

## Phase 2: User Story 1 - [Title] (P1)

- [ ] T002 [US1] Implement core functionality
- [ ] T003 [US1] Add tests for user story 1

## Phase 3: User Story 2 - [Title] (P2)

- [ ] T004 [US2] Implement secondary functionality
- [ ] T005 [US2] Add tests for user story 2

## Phase 4: Polish

- [ ] T006 [Polish] Documentation updates
- [ ] T007 [Polish] Final review and cleanup
`;
          await vscode.workspace.fs.writeFile(
            vscode.Uri.file(tasksFile),
            Buffer.from(tasksTemplate)
          );

          // Open the new spec file
          const doc = await vscode.workspace.openTextDocument(specFile);
          await vscode.window.showTextDocument(doc);

          // Refresh tree view
          if (progressProvider) {
            progressProvider.refresh();
          }

          vscode.window.showInformationMessage(
            `Created new specification: ${specName} (with tasks.md)`
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to create specification: ${error}`);
        }
      }
    })
  );

  // Open specification command
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.openSpec', async (specId?: string) => {
      if (specId) {
        const specFile = path.join(workspacePath, '.specify', 'specs', specId, 'spec.md');
        try {
          const doc = await vscode.workspace.openTextDocument(specFile);
          await vscode.window.showTextDocument(doc);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to open specification: ${error}`);
        }
      } else {
        // Show quick pick for all specs
        const specsDir = path.join(workspacePath, '.specify', 'specs');
        try {
          const specs = await vscode.workspace.fs.readDirectory(vscode.Uri.file(specsDir));
          const specItems = specs
            .filter(([name, type]) => type === vscode.FileType.Directory)
            .map(([name]) => ({
              label: name,
              description: `Open ${name} specification`,
              specId: name,
            }));

          if (specItems.length === 0) {
            vscode.window.showInformationMessage('No specifications found. Create one first!');
            return;
          }

          const selected = await vscode.window.showQuickPick(specItems, {
            placeHolder: 'Select a specification to open',
          });

          if (selected) {
            vscode.commands.executeCommand('gofer.openSpec', selected.specId);
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to list specifications: ${error}`);
        }
      }
    })
  );

  // Initialize MemoryManager and register memory commands
  memoryManager = new MemoryManager(context, workspacePath);
  // Initialize JSONL storage backend (migrates from legacy local.json if needed)
  await memoryManager.initializeStorage();
  // Wire usage logger to MemoryManager for context health tracking (Spec 012 T024)
  if (contextUsageLogger) {
    memoryManager.setUsageLogger(contextUsageLogger);
  }
  registerMemoryCommands(context, memoryManager);
  // T045: Connect MemoryProvider to MemoryManager via setMemoryManager()
  if (memoryProvider) {
    memoryProvider.setMemoryManager(memoryManager);
  }
  console.log('[Gofer] Memory commands registered (JSONL backend)');

  // T022: Read user-configured preserve patterns from VSCode settings
  const userPreservePatterns = vscode.workspace
    .getConfiguration('gofer')
    .get<string[]>('observationPreservePatterns', []);
  const maskerConfig: Record<string, unknown> = {};
  if (userPreservePatterns.length > 0) {
    maskerConfig.preservePatterns = [
      /error/i,
      /exception/i,
      /failed/i,
      /failure/i,
      /critical/i,
      /fatal/i,
      /panic/i,
      /unhandled/i,
      /stack\s?trace/i,
      ...userPreservePatterns.map((p: string) => new RegExp(p, 'i')),
    ];
  }

  // Create shared ContextBuilder and wire to autonomousCommands (Spec 013 Phase 6)
  const sharedContextBuilder = new ContextBuilder(
    workspacePath,
    memoryManager,
    undefined,
    undefined,
    {
      maskerConfig,
    }
  );

  // 018 T025/T026: Start periodic consolidation timer and trigger on session-start
  if (memoryManager) {
    consolidationTimerRef = memoryManager.startConsolidationTimer();
    if (hookBridgeWatcher) {
      const mm = memoryManager;
      hookBridgeWatcher.on('session-start', () => {
        mm.consolidate().catch(() => {});
      });
    }
  }

  // 018 T041: Read configurable staleness threshold and pass to WorkspaceContextProvider
  const stalenessMinutes = vscode.workspace
    .getConfiguration('gofer')
    .get<number>('stageDetectionStalenessMinutes', 30);
  if (workspaceContextProviderRef) {
    workspaceContextProviderRef.setStalenessThresholdMinutes(stalenessMinutes);
  }

  // 018 T043/T044/T060: Listen for stage changes and save validated checkpoint
  const { CheckpointValidator } = await import('./autonomous/CheckpointValidator');
  const checkpointValidator = new CheckpointValidator(workspacePath);
  if (hookBridgeWatcher && workspaceContextProviderRef) {
    let lastDetectedStage = '';
    const wcp = workspaceContextProviderRef;
    hookBridgeWatcher.on('bridge-update', () => {
      const currentStage = wcp.detectCurrentStage();
      if (currentStage !== 'unknown' && currentStage !== lastDetectedStage) {
        const previousStage = lastDetectedStage;
        lastDetectedStage = currentStage;
        if (previousStage) {
          // Save lightweight checkpoint on stage transition with validation
          const checkpointDir = path.join(workspacePath, '.specify', 'memory', 'checkpoints');
          const checkpoint = {
            session_id: `stage-${Date.now()}`,
            timestamp: new Date().toISOString(),
            stage: currentStage,
            status: 'stage-transition',
            previousStage,
            newStage: currentStage,
            type: 'stage-transition',
          };
          // T060: Validate before saving
          const validation = checkpointValidator.validateRequiredFields(checkpoint);
          if (!validation.valid) {
            console.warn('[Gofer] Checkpoint validation failed:', validation.errors);
          }
          // T061: Capture git state asynchronously
          checkpointValidator
            .captureGitState()
            .then((gitState) => {
              const fullCheckpoint = { ...checkpoint, gitState };
              try {
                require('fs').mkdirSync(checkpointDir, { recursive: true });
                const fileName = `stage-${previousStage}-to-${currentStage}-${Date.now()}.json`;
                require('fs').writeFileSync(
                  path.join(checkpointDir, fileName),
                  JSON.stringify(fullCheckpoint, null, 2)
                );
              } catch {
                // Non-fatal: checkpoint save failure
              }
            })
            .catch(() => {
              // Non-fatal: git state capture failure
            });
          console.log(
            `[Gofer] Stage transition: ${previousStage} → ${currentStage} (checkpoint saved)`
          );
        }
      }
    });
  }

  // 018 T062: Programmatic session resume command
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.resumeSession', async () => {
      const checkpointDir = path.join(workspacePath, '.specify', 'memory', 'checkpoints');
      try {
        const files = require('fs')
          .readdirSync(checkpointDir)
          .filter((f: string) => f.endsWith('.json'))
          .sort()
          .reverse();
        if (files.length === 0) {
          vscode.window.showInformationMessage('No checkpoints found to resume from.');
          return;
        }
        const latest = JSON.parse(
          require('fs').readFileSync(path.join(checkpointDir, files[0]), 'utf-8')
        );
        const validation = checkpointValidator.validate(
          `---\nsession_id: ${latest.session_id}\ntimestamp: ${latest.timestamp}\nstage: ${latest.stage}\nstatus: ${latest.status}\n---\n# Session Handoff\nResume with stage ${latest.stage}`
        );
        if (!validation.valid) {
          vscode.window.showWarningMessage(
            `Checkpoint has issues: ${validation.errors.join(', ')}`
          );
        }
        vscode.window.showInformationMessage(
          `Latest checkpoint: stage=${latest.stage}, git=${latest.gitState?.branch || 'unknown'}@${latest.gitState?.headCommit || '?'}`
        );
      } catch {
        vscode.window.showErrorMessage('Failed to read checkpoint files.');
      }
    })
  );

  // 018 T023: Runtime reload of observation preserve patterns on config change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('gofer.observationPreservePatterns')) {
        const newPatterns = vscode.workspace
          .getConfiguration('gofer')
          .get<string[]>('observationPreservePatterns', []);
        const allPatterns = [
          /error/i,
          /exception/i,
          /failed/i,
          /failure/i,
          /critical/i,
          /fatal/i,
          /panic/i,
          /unhandled/i,
          /stack\s?trace/i,
          ...newPatterns.map((p: string) => new RegExp(p, 'i')),
        ];
        sharedContextBuilder.getObservationMasker().updatePreservePatterns(allPatterns);
        console.log(
          `[Gofer] Observation preserve patterns reloaded: ${newPatterns.length} user patterns`
        );
      }
      if (e.affectsConfiguration('gofer.useLayeredMemory')) {
        const useLayered = vscode.workspace
          .getConfiguration('gofer')
          .get<boolean>('useLayeredMemory', false);
        sharedContextBuilder.setMemoryLayerManager(
          sharedContextBuilder.getMemoryLayerManager(),
          useLayered
        );
        console.log(`[Gofer] Layered memory ${useLayered ? 'enabled' : 'disabled'}`);
      }
      // 018 T041: Reload staleness threshold on config change
      if (e.affectsConfiguration('gofer.stageDetectionStalenessMinutes')) {
        const newMinutes = vscode.workspace
          .getConfiguration('gofer')
          .get<number>('stageDetectionStalenessMinutes', 30);
        if (workspaceContextProviderRef) {
          workspaceContextProviderRef.setStalenessThresholdMinutes(newMinutes);
        }
        console.log(`[Gofer] Stage detection staleness threshold: ${newMinutes} minutes`);
      }
    })
  );

  // Initialize KnowledgeGraph and wire to ContextBuilder
  const knowledgeGraph = new KnowledgeGraph(workspacePath);
  knowledgeGraph
    .initialize()
    .then(() => {
      sharedContextBuilder.setKnowledgeGraph(knowledgeGraph);
      console.log('[Gofer] KnowledgeGraph initialized and wired to ContextBuilder');
    })
    .catch((error) => {
      console.warn('[Gofer] KnowledgeGraph init failed (non-fatal):', error);
    });

  import('./autonomousCommands')
    .then(({ setSharedMemoryManager, setSharedContextBuilder }) => {
      setSharedMemoryManager(memoryManager!);
      setSharedContextBuilder(sharedContextBuilder);
      console.log('[Gofer] Shared MemoryManager and ContextBuilder wired to autonomousCommands');
    })
    .catch((error) => {
      console.warn('[Gofer] Failed to wire shared instances to autonomousCommands:', error);
    });

  // Wire ContinuousMemoryWriter to auto-persist pipeline decisions (Spec 014 T039)
  continuousMemoryWriter = new ContinuousMemoryWriter(memoryManager);
  continuousMemoryWriter.connectToContextBuilder(sharedContextBuilder);
  // T027/T028: Wire KnowledgeGraph for pattern/decision recording
  continuousMemoryWriter.setKnowledgeGraph(knowledgeGraph);
  console.log('[Gofer] ContinuousMemoryWriter wired to shared ContextBuilder');

  // T009: Wire CitationVerifier for memory staleness detection
  const citationVerifier = new CitationVerifier(workspacePath);
  sharedContextBuilder.setCitationVerifier(citationVerifier);
  console.log('[Gofer] CitationVerifier initialized');

  // T012: Wire ScopeGuard for protected boundary checking
  const scopeGuard = new ScopeGuard(workspacePath);
  // Try to load protected patterns from the active spec
  const activeSpecDir = path.join(workspacePath, '.specify', 'specs');
  try {
    const specDirs = require('fs')
      .readdirSync(activeSpecDir)
      .filter((d: string) => {
        const specPath = path.join(activeSpecDir, d, 'spec.md');
        return require('fs').existsSync(specPath);
      });
    if (specDirs.length > 0) {
      const latestSpec = path.join(activeSpecDir, specDirs[specDirs.length - 1], 'spec.md');
      scopeGuard.loadFromSpec(latestSpec);
    }
  } catch {
    // No spec available yet — ScopeGuard will work without protected patterns
  }
  sharedContextBuilder.setScopeGuard(scopeGuard);
  console.log('[Gofer] ScopeGuard initialized');

  // T014: Wire SlopDetector and register command
  const slopDetector = new SlopDetector();
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.checkForSlop', () => {
      const outputChannel = vscode.window.createOutputChannel('Gofer: Slop Report');
      outputChannel.show();
      const srcDir = path.join(workspacePath, 'extension', 'src');
      const report = slopDetector.scanDirectory(srcDir);
      outputChannel.appendLine(
        `Scanned ${report.filesScanned} files, found ${report.totalIssues} issues:\n`
      );
      for (const match of report.matches) {
        outputChannel.appendLine(
          `  ${match.severity.toUpperCase()} [${match.pattern}] ${match.file}:${match.line}`
        );
        outputChannel.appendLine(`    ${match.message}`);
        outputChannel.appendLine(`    > ${match.snippet}\n`);
      }
      if (report.totalIssues === 0) {
        outputChannel.appendLine('No slop detected. Code looks clean!');
      }
    })
  );
  console.log('[Gofer] SlopDetector initialized with gofer.checkForSlop command');

  // 018 T065: Wire ScopeGuard violations to VSCode diagnostics collection
  const scopeDiagnostics = vscode.languages.createDiagnosticCollection('gofer-scope');
  context.subscriptions.push(scopeDiagnostics);
  // Update diagnostics on bridge-update events
  if (hookBridgeWatcher) {
    hookBridgeWatcher.on('bridge-update', () => {
      const violations = scopeGuard.getViolations();
      if (violations.length === 0) return;
      const diagMap = new Map<string, vscode.Diagnostic[]>();
      for (const v of violations.slice(-20)) {
        const uri = v.file;
        const diags = diagMap.get(uri) || [];
        const severity =
          v.enforcement === 'blocking'
            ? vscode.DiagnosticSeverity.Error
            : v.enforcement === 'warning'
              ? vscode.DiagnosticSeverity.Warning
              : vscode.DiagnosticSeverity.Information;
        const diag = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          `ScopeGuard: ${v.file} matches protected pattern "${v.protectedPattern}"`,
          severity
        );
        diag.source = 'Gofer ScopeGuard';
        diags.push(diag);
        diagMap.set(uri, diags);
      }
      for (const [file, diags] of diagMap) {
        try {
          scopeDiagnostics.set(vscode.Uri.file(file), diags);
        } catch {
          // Non-fatal: URI creation can fail for non-file paths
        }
      }
    });
  }

  // 019 T057: Slop diagnostics collection
  const slopDiagnostics = vscode.languages.createDiagnosticCollection('gofer-slop');
  context.subscriptions.push(slopDiagnostics);

  /**
   * 019 T056-T058: Surface slop results via notification, diagnostics, and JSONL log.
   */
  const surfaceSlopResults = (report: ReturnType<SlopDetector['scanDirectory']>): void => {
    if (report.totalIssues === 0) return;

    // T056: Show VSCode information notification
    const errorCount = report.matches.filter((m) => m.severity === 'error').length;
    const warnCount = report.matches.filter((m) => m.severity === 'warning').length;
    const severity = errorCount > 0 ? 'error' : 'warning';
    const msg = `Slop detected: ${report.totalIssues} issues (${errorCount} errors, ${warnCount} warnings)`;
    if (severity === 'error') {
      vscode.window.showWarningMessage(msg, 'View Details').then((choice) => {
        if (choice === 'View Details') {
          vscode.commands.executeCommand('gofer.checkForSlop');
        }
      });
    } else {
      vscode.window.showInformationMessage(msg);
    }

    // T057: Add slop findings to VSCode diagnostics collection
    const diagMap = new Map<string, vscode.Diagnostic[]>();
    for (const match of report.matches.slice(0, 100)) {
      const uri = match.file;
      const diags = diagMap.get(uri) || [];
      const diagSeverity =
        match.severity === 'error'
          ? vscode.DiagnosticSeverity.Error
          : match.severity === 'warning'
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information;
      const diag = new vscode.Diagnostic(
        new vscode.Range(Math.max(0, match.line - 1), 0, Math.max(0, match.line - 1), 200),
        `[${match.pattern}] ${match.message}`,
        diagSeverity
      );
      diag.source = 'Gofer Slop';
      diags.push(diag);
      diagMap.set(uri, diags);
    }
    slopDiagnostics.clear();
    for (const [file, diags] of diagMap) {
      try {
        slopDiagnostics.set(vscode.Uri.file(file), diags);
      } catch {
        // Non-fatal
      }
    }

    // T058: Log scan history to JSONL
    try {
      const logDir = path.join(workspacePath, '.specify', 'logs');
      const logPath = path.join(logDir, 'slop-scan.jsonl');
      require('fs').mkdirSync(logDir, { recursive: true });
      const entry = {
        timestamp: new Date().toISOString(),
        filesScanned: report.filesScanned,
        totalIssues: report.totalIssues,
        errorCount,
        warnCount,
        patterns: [...new Set(report.matches.map((m) => m.pattern))],
      };
      require('fs').appendFileSync(logPath, JSON.stringify(entry) + '\n');
    } catch {
      // Best-effort logging
    }
  };

  // 018 T068: Auto-trigger slop detection on task completion (checkbox change in tasks.md)
  if (hookBridgeWatcher) {
    let lastTaskCheckCount = 0;
    hookBridgeWatcher.on('bridge-update', (data: BridgeData) => {
      // Check if a file write to tasks.md happened
      const toolUse = data?.lastToolUse;
      if (!toolUse) return;
      const toolName = (toolUse.toolName || '').toLowerCase();
      const filePath = toolUse.toolInput?.file_path as string | undefined;
      if (
        (toolName.includes('write') || toolName.includes('edit')) &&
        filePath?.endsWith('tasks.md')
      ) {
        try {
          const content = require('fs').readFileSync(filePath, 'utf-8');
          const checkCount = (content.match(/- \[X\]/gi) || []).length;
          if (checkCount > lastTaskCheckCount) {
            lastTaskCheckCount = checkCount;
            // Task was completed — auto-trigger slop check on workspace
            const srcDir = path.join(workspacePath, 'extension', 'src');
            const report = slopDetector.scanDirectory(srcDir, 100);
            if (report.totalIssues > 0) {
              console.log(
                `[Gofer] Auto-slop check: ${report.totalIssues} issues found after task completion`
              );
              surfaceSlopResults(report);
            }
          }
        } catch {
          // Non-fatal
        }
      }
    });
  }

  // 018 T070/T071: PreOperationCheckpoint with git stash and rollback command
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.createPreOpCheckpoint', async () => {
      try {
        const { execFile: ef } = require('child_process');
        const { promisify: p } = require('util');
        const execAsync = p(ef);
        const opts = { cwd: workspacePath };
        // Create a git stash as pre-operation checkpoint
        const { stdout } = await execAsync(
          'git',
          ['stash', 'push', '-m', `gofer-pre-op-${Date.now()}`],
          opts
        );
        if (stdout.includes('No local changes')) {
          vscode.window.showInformationMessage('No changes to checkpoint (working tree clean).');
        } else {
          // Immediately pop to keep changes but record the stash reference
          await execAsync('git', ['stash', 'pop'], opts);
          vscode.window.showInformationMessage(
            'Pre-operation checkpoint created (git stash reference saved).'
          );
        }
      } catch {
        vscode.window.showWarningMessage('Could not create pre-operation checkpoint.');
      }
    }),
    vscode.commands.registerCommand('gofer.rollbackToCheckpoint', async () => {
      try {
        const { execFile: ef } = require('child_process');
        const { promisify: p } = require('util');
        const execAsync = p(ef);
        const opts = { cwd: workspacePath };
        const { stdout } = await execAsync('git', ['stash', 'list'], opts);
        const goferStashes = stdout.split('\n').filter((l: string) => l.includes('gofer-pre-op'));
        if (goferStashes.length === 0) {
          vscode.window.showInformationMessage('No Gofer pre-operation checkpoints found.');
          return;
        }
        const choice = await vscode.window.showQuickPick(goferStashes, {
          placeHolder: 'Select checkpoint to rollback to',
        });
        if (choice) {
          const stashRef = choice.split(':')[0];
          await execAsync('git', ['stash', 'apply', stashRef], opts);
          vscode.window.showInformationMessage(`Rolled back to checkpoint: ${stashRef}`);
        }
      } catch {
        vscode.window.showWarningMessage('Rollback failed.');
      }
    })
  );

  // T038/T039/T042/T043: Wire AutonomousLLMProvider for context management LLM operations
  const anthropicApiKey = vscode.workspace.getConfiguration('gofer').get<string>('anthropicApiKey');
  const autonomousLLMProvider = new AutonomousLLMProvider({
    apiKey: anthropicApiKey,
    workspaceRoot: workspacePath,
  });

  // 018 T080: Promote contextCompactor to module-level for deactivate cleanup
  const contextCompactor = new ContextCompactor(workspacePath);

  if (autonomousLLMProvider.isAvailable()) {
    // T039: Wire LLM to ObservationMasker for enhanced key-point generation
    sharedContextBuilder.getObservationMasker().setLLMProvider(autonomousLLMProvider);

    // T076: Set LLM provider on ContextCompactor when API key is available
    contextCompactor.setLLMProvider(autonomousLLMProvider);

    // T041: Wire ResearchSummarizer to research-complete event
    const researchChunkerForSumm = new ResearchChunker(workspacePath);
    const researchSummarizer = new ResearchSummarizer(
      autonomousLLMProvider,
      researchChunkerForSumm,
      memoryManager,
      workspacePath
    );
    sharedContextBuilder.on('research-complete', (event: { specId: string }) => {
      researchSummarizer.summarizeSpec(event.specId).catch((error) => {
        console.warn('[Gofer] Research summarization failed (non-fatal):', error);
      });
    });

    // T070/018: Wire auto-compaction to ContextHealthMonitor warning + critical events
    if (contextHealthMonitor) {
      contextHealthMonitor.on('warning', () => {
        // 018: Trigger LLM compression on warning level too (not just critical)
        sharedContextBuilder
          .getObservationMasker()
          .enhanceKeyPointsWithLLM()
          .catch(() => {});
      });
      contextHealthMonitor.on('critical', () => {
        sharedContextBuilder
          .getObservationMasker()
          .enhanceKeyPointsWithLLM()
          .catch(() => {});
      });
    }

    console.log(
      '[Gofer] AutonomousLLMProvider wired to ObservationMasker, ContextCompactor, and ResearchSummarizer'
    );
  } else {
    console.log(
      '[Gofer] AutonomousLLMProvider: no API key configured, LLM features disabled (deterministic fallbacks active)'
    );
  }

  // T065: Wire ResearchGraphBuilder to research-complete event
  const { ResearchGraphBuilder } = await import('./autonomous/ResearchGraphBuilder');
  const researchGraphBuilder = new ResearchGraphBuilder(workspacePath);
  sharedContextBuilder.on('research-complete', (event: { specId: string }) => {
    try {
      researchGraphBuilder.buildFromSpec(event.specId, knowledgeGraph);
      knowledgeGraph.save().catch(() => {});
    } catch (error) {
      console.warn('[Gofer] Research graph building failed (non-fatal):', error);
    }
  });

  // T063: Wire MemoryLayerManager to ContextBuilder
  const { MemoryLayerManager } = await import('./autonomous/MemoryLayerManager');
  const memoryLayerManager = new MemoryLayerManager(workspacePath);
  memoryLayerManager.setMemoryManager(memoryManager);
  if (autonomousLLMProvider?.isAvailable()) {
    memoryLayerManager.setLLMProvider(autonomousLLMProvider);
  }
  const useLayeredMemory = vscode.workspace
    .getConfiguration('gofer')
    .get<boolean>('useLayeredMemory', false);
  sharedContextBuilder.setMemoryLayerManager(memoryLayerManager, useLayeredMemory);

  // T050: Restore observation cache from disk on startup
  sharedContextBuilder
    .getObservationMasker()
    .loadCacheFromDisk()
    .then(() => {
      const obsCount = sharedContextBuilder.getObservationMasker().getAllObservations().length;
      if (obsCount > 0) {
        console.log(`[Gofer] Observation cache restored: ${obsCount} entries`);
      }
    })
    .catch(() => {
      // Non-fatal: start with empty cache
    });

  // 018: Wire ParallelAnalysisFramework for sub-agent partition recommendations
  const { ParallelAnalysisFramework } = await import('./autonomous/ParallelAnalysisFramework');
  const parallelAnalysisFramework = new ParallelAnalysisFramework(workspacePath);
  sharedContextBuilder.setParallelAnalysisFramework(parallelAnalysisFramework);
  console.log('[Gofer] ParallelAnalysisFramework wired to ContextBuilder');

  // 018 T053: Wire ContextFolder for section-level folding
  const { ContextFolder } = await import('./autonomous/ContextFolder');
  const contextFolder = new ContextFolder(workspacePath);
  sharedContextBuilder.setContextFolder(contextFolder);
  console.log('[Gofer] ContextFolder wired to ContextBuilder');

  // T047/T048: Wire SubAgentDispatcher for progressive delegation
  const subAgentDispatcher = new SubAgentDispatcher(workspacePath);
  sharedContextBuilder.setSubAgentDispatcher(subAgentDispatcher);
  if (contextHealthMonitor) {
    contextHealthMonitor.on('healthy', (status: { utilizationPercent: number }) => {
      subAgentDispatcher.updateUtilization(status.utilizationPercent);
    });
    contextHealthMonitor.on('warning', (status: { utilizationPercent: number }) => {
      subAgentDispatcher.updateUtilization(status.utilizationPercent);
    });
    contextHealthMonitor.on('critical', (status: { utilizationPercent: number }) => {
      subAgentDispatcher.updateUtilization(status.utilizationPercent);
    });
  }
  console.log('[Gofer] SubAgentDispatcher initialized');

  // Wire hook bridge to track real tool output as observations (Spec 001)
  if (hookBridgeWatcher) {
    const observationsDir = path.join(workspacePath, '.specify', 'hooks', 'observations');
    const fsPromises = require('fs').promises as typeof import('fs').promises;
    const fsSync = require('fs') as typeof import('fs');
    let lastTrackedToolTimestamp = 0;

    // T003/018: Trailing-edge debounced cache persistence (max once per 5s)
    const debouncedCacheSave = (): void => {
      if (cacheSaveTimerRef) clearTimeout(cacheSaveTimerRef);
      cacheSaveTimerRef = setTimeout(() => {
        cacheSaveTimerRef = null;
        sharedContextBuilder
          .getObservationMasker()
          .saveCacheToDisk()
          .catch(() => {});
      }, 5000);
    };
    sharedContextBuilderRef = sharedContextBuilder;

    hookBridgeWatcher.on('bridge-update', (data: BridgeData) => {
      const toolUse = data?.lastToolUse;
      if (!toolUse || !toolUse.toolName || toolUse.timestamp <= lastTrackedToolTimestamp) {
        return;
      }
      lastTrackedToolTimestamp = toolUse.timestamp;

      // Map tool names to observation types
      const toolNameLower = toolUse.toolName.toLowerCase();
      let obsType: 'file_read' | 'command_output' | 'search_result' | 'api_response' =
        'command_output';
      if (toolNameLower.includes('read') || toolNameLower.includes('cat')) {
        obsType = 'file_read';
      } else if (
        toolNameLower.includes('grep') ||
        toolNameLower.includes('glob') ||
        toolNameLower.includes('search')
      ) {
        obsType = 'search_result';
      } else if (toolNameLower.includes('bash') || toolNameLower.includes('exec')) {
        obsType = 'command_output';
      }

      // Read real tool content from per-observation file (T008)
      let toolContent = `[Tool output from ${toolUse.toolName}]`;
      const observationId = toolUse.observationId;

      if (observationId) {
        const obsFilePath = path.join(observationsDir, `${observationId}.json`);
        try {
          const raw = fsSync.readFileSync(obsFilePath, 'utf-8');
          const obsData = JSON.parse(raw);
          if (obsData.toolResponse && obsData.toolResponse.length > 0) {
            toolContent = obsData.toolResponse;
          }
        } catch {
          // Observation file missing or unreadable — use placeholder
        }

        // Clean up observation file after reading (T012)
        fsPromises.unlink(path.join(observationsDir, `${observationId}.json`)).catch(() => {});
      }
      // If no observationId, toolContent stays as placeholder (T010 backward compat)

      // Enrich metadata with toolInput data (T009)
      const metadata: Record<string, unknown> = {
        toolName: toolUse.toolName,
        timestamp: toolUse.timestamp,
      };
      if (toolUse.toolInput) {
        if (toolUse.toolInput.file_path) {
          metadata.filePath = toolUse.toolInput.file_path;
        }
        if (toolUse.toolInput.command) {
          metadata.command = toolUse.toolInput.command;
        }
        if (toolUse.toolInput.pattern) {
          metadata.pattern = toolUse.toolInput.pattern;
        }
      }

      // T012: Check scope guard for protected boundaries
      if (metadata.filePath) {
        const violation = scopeGuard.check(String(metadata.filePath));
        if (violation) {
          console.warn(`[Gofer] ScopeGuard violation: ${violation}`);
        }
      }

      // T015: Record file accesses in KnowledgeGraph
      if (obsType === 'file_read' && metadata.filePath) {
        knowledgeGraph.recordFileAccess(String(metadata.filePath));

        // T026: Parse import/from statements and record import edges
        if (toolContent && toolContent.length > 10) {
          const importRegex =
            /(?:import\s+.*?from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
          let importMatch: RegExpExecArray | null;
          while ((importMatch = importRegex.exec(toolContent)) !== null) {
            const importPath = importMatch[1] || importMatch[2];
            if ((importPath && !importPath.startsWith('.') === false) || importPath) {
              knowledgeGraph.recordImport(String(metadata.filePath), importPath);
            }
          }
        }
      }

      sharedContextBuilder.trackObservation(
        obsType,
        toolContent,
        metadata,
        `${toolUse.toolName} tool output`
      );

      // T001: Advance turn counter after each observation so masking thresholds work
      sharedContextBuilder.incrementTurn();

      // T003: Debounced cache persistence after each observation
      debouncedCacheSave();
    });

    // Clean stale observation files on session start (T013)
    hookBridgeWatcher.on('session-start', () => {
      const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
      try {
        if (!fsSync.existsSync(observationsDir)) {
          return;
        }
        const files = fsSync.readdirSync(observationsDir);
        const now = Date.now();
        for (const file of files) {
          if (!file.endsWith('.json')) {
            continue;
          }
          try {
            const filePath = path.join(observationsDir, file);
            const stat = fsSync.statSync(filePath);
            if (now - stat.mtimeMs > STALE_THRESHOLD_MS) {
              fsSync.unlinkSync(filePath);
            }
          } catch {
            // Ignore individual file errors
          }
        }
      } catch {
        // Ignore cleanup errors
      }
    });

    console.log('[Gofer] Tool output observation tracking wired to bridge watcher');
  }

  // Wire ContextBuilder to AutoHandoffTrigger for context reseed functionality
  if (autoHandoffTrigger) {
    autoHandoffTrigger.setContextBuilder(sharedContextBuilder);
    console.log('[Gofer] ContextBuilder wired to AutoHandoffTrigger for reseed');
  }

  // Initialize MemoryHookManager for automatic memory operations (Spec 010 T025)
  memoryHookManager = new MemoryHookManager(memoryManager);
  console.log('[Gofer] MemoryHookManager initialized');

  // Export MemoryHookManager for use by autonomous commands
  import('./autonomousCommands')
    .then(({ setSharedMemoryHookManager }) => {
      if (setSharedMemoryHookManager) {
        setSharedMemoryHookManager(memoryHookManager!);
        console.log('[Gofer] MemoryHookManager wired to autonomousCommands');
      }
    })
    .catch(() => {
      // autonomousCommands may not have the setter yet
    });

  // T116: Register spec execution commands
  if (progressProvider) {
    registerSpecCommands(context, progressProvider);
    console.log('[Gofer] Spec execution commands registered');
  }

  // T153: Register "Gofer: View Compaction History" command
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.viewCompactionHistory', async () => {
      const { getActiveDriver } = await import('./autonomousCommands');
      const driver = getActiveDriver();

      if (driver) {
        await driver.showCompactionHistory();
      } else {
        vscode.window.showInformationMessage('No active autonomous session');
      }
    })
  );
  console.log('[Gofer] Compaction history command registered');

  // Research index watcher: auto-generate research.index.json on change (Spec 013 T039-T043)
  try {
    const researchChunker = new ResearchChunker(workspacePath);
    const researchPattern = new vscode.RelativePattern(
      workspacePath,
      '.specify/specs/*/research.md'
    );
    const researchWatcher = vscode.workspace.createFileSystemWatcher(researchPattern);

    const handleResearchChange = (uri: vscode.Uri): void => {
      const specId = extractSpecId(uri);
      if (specId) {
        researchChunker.indexResearchFile(specId).catch((error) => {
          console.warn(`[Gofer] Failed to index research for ${specId}:`, error);
        });
      }
    };

    researchWatcher.onDidCreate(handleResearchChange);
    researchWatcher.onDidChange(handleResearchChange);
    context.subscriptions.push(researchWatcher);
    console.log('[Gofer] Research index watcher registered');
  } catch (error) {
    console.warn('[Gofer] Failed to set up research watcher:', error);
  }

  // 019 T068-T070: Auto-resume on activation — detect recent checkpoint (<24h)
  try {
    const handoffDir = path.join(workspacePath, '.specify', 'state', 'sessions');
    const fsSync = require('fs') as typeof import('fs');
    if (fsSync.existsSync(handoffDir)) {
      const files = fsSync
        .readdirSync(handoffDir)
        .filter((f: string) => f.endsWith('.md') || f.endsWith('.json'));
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      for (const file of files.sort().reverse()) {
        const filePath = path.join(handoffDir, file);
        try {
          const stat = fsSync.statSync(filePath);
          if (now - stat.mtimeMs < TWENTY_FOUR_HOURS) {
            // Found a recent checkpoint
            const content = fsSync.readFileSync(filePath, 'utf-8');
            // Extract feature name and stage from frontmatter
            const featureMatch = content.match(/feature:\s*['"]?([^'"\n]+)/);
            const stageMatch = content.match(/stage:\s*['"]?([^'"\n]+)/);
            const featureName = featureMatch?.[1] || 'Unknown feature';
            const stage = stageMatch?.[1] || 'unknown';

            vscode.window
              .showInformationMessage(
                `Resume "${featureName}" (${stage} stage)?`,
                'Resume',
                'Dismiss'
              )
              .then((choice) => {
                if (choice === 'Resume') {
                  // Invoke appropriate pipeline command
                  const stageCommands: Record<string, string> = {
                    research: '1_gofer_research',
                    specify: '2_gofer_specify',
                    plan: '3_gofer_plan',
                    tasks: '4_gofer_tasks',
                    implement: '5_gofer_implement',
                    validate: '6_gofer_validate',
                  };
                  const command = stageCommands[stage] || '8_gofer_resume';
                  vscode.commands.executeCommand('gofer.launchClaudeCode', `/${command}`);
                }
              });

            break; // Only show for the most recent checkpoint
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Non-fatal: auto-resume is best-effort
  }

  // Note: Tree view detail commands (showSpecDetails, showMemoryDocument, etc.)
  // are now registered globally in registerGlobalCommands() since tree views
  // are registered globally and can be clicked before workspace initialization
}

export async function deactivate() {
  console.log('Gofer extension deactivating...');

  // 018: Flush observation cache to disk on deactivate (T019)
  if (sharedContextBuilderRef) {
    try {
      await sharedContextBuilderRef.getObservationMasker().saveCacheToDisk();
      console.log('Observation cache flushed to disk on deactivate');
    } catch {
      // Best-effort flush
    }
    sharedContextBuilderRef = undefined;
  }

  // 018: Clear debounce timer (T020)
  if (cacheSaveTimerRef) {
    clearTimeout(cacheSaveTimerRef);
    cacheSaveTimerRef = null;
  }

  // 018: Clear consolidation timer
  if (consolidationTimerRef) {
    clearInterval(consolidationTimerRef);
    consolidationTimerRef = null;
  }

  // 018 T081: WorkspaceContextProvider cleanup
  workspaceContextProviderRef = undefined;

  // Stop Claude Code terminals and autonomous monitoring
  // Dynamic import to avoid blocking activation if node-pty fails
  try {
    const { stopClaudeCode } = await import('./autonomousCommands');
    await stopClaudeCode();
    console.log('Claude Code stopped');
  } catch (error) {
    console.error('Error stopping Claude Code:', error);
  }

  // Stop Context Health Monitoring (Spec 012)
  if (contextHealthMonitor) {
    contextHealthMonitor.dispose();
    contextHealthMonitor = undefined;
    console.log('Context health monitor stopped');
  }
  if (autoHandoffTrigger) {
    autoHandoffTrigger.dispose();
    autoHandoffTrigger = undefined;
    console.log('Auto-handoff trigger stopped');
  }
  if (contextHealthStatusBar) {
    contextHealthStatusBar.dispose();
    contextHealthStatusBar = undefined;
    console.log('Context health status bar disposed');
  }
  if (continuousMemoryWriter) {
    continuousMemoryWriter.dispose();
    continuousMemoryWriter = undefined;
    console.log('ContinuousMemoryWriter disposed');
  }
  // Clean up observation files on deactivation (Spec 001 T014)
  try {
    const wsPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (wsPath) {
      const obsDir = path.join(wsPath, '.specify', 'hooks', 'observations');
      const fsDeactivate = require('fs') as typeof import('fs');
      if (fsDeactivate.existsSync(obsDir)) {
        const files = fsDeactivate.readdirSync(obsDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              fsDeactivate.unlinkSync(path.join(obsDir, file));
            } catch {
              /* ignore */
            }
          }
        }
      }
    }
  } catch {
    // Ignore cleanup errors during deactivation
  }

  if (multiSessionWatcher) {
    multiSessionWatcher.dispose();
    multiSessionWatcher = undefined;
    console.log('MultiSessionBridgeWatcher disposed');
  }
  if (hookBridgeWatcher) {
    hookBridgeWatcher.dispose();
    hookBridgeWatcher = undefined;
    console.log('HookBridgeWatcher disposed');
  }
  if (goferActivityStatusBar) {
    goferActivityStatusBar.dispose();
    goferActivityStatusBar = undefined;
    console.log('GoferActivityStatusBar disposed');
  }
  if (contextUsageLogger) {
    contextUsageLogger = undefined;
    console.log('Context usage logger cleared');
  }

  // Clear tree view providers (allows garbage collection)
  if (progressProvider) {
    progressProvider = undefined;
    console.log('Progress provider cleared');
  }
  if (constitutionProvider) {
    constitutionProvider = undefined;
    console.log('Constitution provider cleared');
  }
  if (memoryProvider) {
    memoryProvider = undefined;
    console.log('Memory provider cleared');
  }

  // Clear branch spec manager
  if (branchSpecManager) {
    branchSpecManager = undefined;
    console.log('Branch spec manager cleared');
  }

  // Clear memory manager
  if (memoryManager) {
    memoryManager = undefined;
    console.log('Memory manager cleared');
  }

  // Clear auto updater
  if (autoUpdater) {
    autoUpdater = undefined;
    console.log('Auto updater cleared');
  }

  // Stop Language Server
  if (lspClient) {
    await lspClient.stop();
    lspClient = undefined;
    console.log('Language Server stopped');
  }

  console.log('Gofer extension deactivated');
}
