import * as vscode from 'vscode';
import * as path from 'path';
import { GoferMigrator } from './goferMigrator';
import { ProgressProvider } from './progressProvider';
import { ConstitutionProvider } from './constitutionProvider';
import { MemoryProvider } from './memoryProvider';
import { BranchSpecManager } from './branchSpecManager';
import { AutoUpdater } from './autoUpdater';
import { GoferLSPClient } from './lspClient';
import { MCPConfigHelper } from './mcpConfig';
import { MemoryManager } from './autonomous/MemoryManager';
import { registerMemoryCommands } from './commands/memoryCommands';
import { registerSpecCommands } from './commands/specCommands';
import { registerCouncilCommands } from './commands/councilCommands';
// Context Health Monitoring (Spec 012)
import { ContextHealthMonitor } from './autonomous/ContextHealthMonitor';
import { AutoHandoffTrigger } from './autonomous/AutoHandoffTrigger';
import { ContextUsageLogger } from './autonomous/ContextUsageLogger';
import { ContextHealthStatusBar } from './ui/ContextHealthStatusBar';
import { stopClaudeCode } from './autonomousCommands';

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
let branchSpecManager: BranchSpecManager | undefined;
let autoUpdater: AutoUpdater | undefined;
let lspClient: GoferLSPClient | undefined;
let memoryManager: MemoryManager | undefined;
// Context Health Monitoring (Spec 012)
let contextHealthMonitor: ContextHealthMonitor | undefined;
let contextUsageLogger: ContextUsageLogger | undefined;
let contextHealthStatusBar: ContextHealthStatusBar | undefined;
let autoHandoffTrigger: AutoHandoffTrigger | undefined;

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

  // Start Language Server
  lspClient = new GoferLSPClient(context);
  try {
    await lspClient.start();
    console.log('Language Server started successfully');
  } catch (error) {
    console.error('Failed to start Language Server:', error);
    vscode.window.showErrorMessage(`Gofer Language Server failed to start: ${error}`);
  }

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
  await initializeForWorkspace(context);

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

  // Register tree data providers - MUST happen before commands are registered
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('goferProgress', progressProvider)
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('goferConstitution', constitutionProvider)
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

    case 'spec-kit':
      await handleGoferFormat(context, workspacePath);
      break;

    case 'mixed':
      await handleMixedFormat(context, workspacePath, migrator);
      break;
  }

  // Register commands (always available)
  registerCommands(context, workspacePath, migrator);
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
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/github/spec-kit'));
  } else {
    // Use legacy format for now
    await initializeProgressProvider(context, workspacePath);
  }
}

async function handleGoferFormat(context: vscode.ExtensionContext, workspacePath: string) {
  console.log('Gofer format detected - ready to use');

  await initializeProgressProvider(context, workspacePath);

  // Auto-setup MCP configuration for Claude Code integration
  const mcpConfigHelper = new MCPConfigHelper(workspacePath, context);
  const created = await mcpConfigHelper.autoSetup();

  if (created) {
    console.log('MCP configuration auto-created for Claude Code integration');
  }

  // Check if templates need updating based on extension version
  await checkForTemplateUpdates(workspacePath, context);

  // Initialize Context Health Monitoring (Spec 012)
  initializeContextHealthMonitoring(workspacePath);

  vscode.window.setStatusBarMessage('$(notebook) Gofer - Enterprise AI ready', 3000);
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

    // Start monitoring (uses context provider when set)
    contextHealthMonitor.startMonitoring();

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
  // Initialize branch-aware spec manager
  branchSpecManager = new BranchSpecManager(workspacePath);
  await branchSpecManager.initializeBranchStructure();

  // The providers are already registered - just refresh them with new data
  // They will pick up the new branchSpecManager and workspacePath
  if (progressProvider) {
    // ProgressProvider needs to be updated with the branch manager
    // We need to set its branch manager reference
    (progressProvider as any).branchManager = branchSpecManager;
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
  // Show progress panel
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.showProgress', () => {
      vscode.commands.executeCommand('goferProgress.focus');
    })
  );

  // Show constitution panel
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.showConstitution', () => {
      vscode.commands.executeCommand('goferConstitution.focus');
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
 * Register commands that require a workspace
 */
function registerCommands(
  context: vscode.ExtensionContext,
  workspacePath: string,
  migrator: GoferMigrator
) {
  // Initialize/Create Gofer structure
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.initialize', async () => {
      const exists = await migrator.exists();

      if (exists) {
        const versionInfo = await migrator.getVersionInfo();

        if (versionInfo.needsUpgrade) {
          // Legacy or mixed format - needs upgrade
          await migrator.upgrade();
        } else if (versionInfo.format === 'spec-kit') {
          // Already spec-kit format - offer to update templates/scripts
          await migrator.upgrade(); // This will call updateGoferTemplates()
        } else {
          vscode.window.showInformationMessage('Gofer already initialized!');
        }
      } else {
        // Create from scratch
        await migrator.upgrade(); // This also creates new structure
      }

      await initializeProgressProvider(context, workspacePath);
    })
  );

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
  // Wire usage logger to MemoryManager for context health tracking (Spec 012 T024)
  if (contextUsageLogger) {
    memoryManager.setUsageLogger(contextUsageLogger);
  }
  registerMemoryCommands(context, memoryManager);
  console.log('[Gofer] Memory commands registered');

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

  // Note: Tree view detail commands (showSpecDetails, showMemoryDocument, etc.)
  // are now registered globally in registerGlobalCommands() since tree views
  // are registered globally and can be clicked before workspace initialization
}

export async function deactivate() {
  console.log('Gofer extension deactivating...');

  // Stop Claude Code terminals and autonomous monitoring
  try {
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
