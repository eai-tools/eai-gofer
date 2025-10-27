import * as vscode from 'vscode';
import * as path from 'path';
import { SpecKitMigrator } from './specKitMigrator';
import { ProgressProvider } from './progressProvider';
import { ConstitutionProvider } from './constitutionProvider';
import { MemoryProvider } from './memoryProvider';
import { BranchSpecManager } from './branchSpecManager';
import { AutoUpdater } from './autoUpdater';
import { SpecGoferLSPClient } from './lspClient';
import { MCPConfigHelper } from './mcpConfig';

/**
 * SpecGofer Extension
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
let lspClient: SpecGoferLSPClient | undefined;

export async function activate(context: vscode.ExtensionContext) {
  // Setup auto-updater (using GitHub Pages API for private repo)
  const packageJson = require('../package.json');
  console.log(`SpecGofer (Enterprise AI) v${packageJson.version} extension activated`);
  autoUpdater = new AutoUpdater(
    'eai-tools/specgofer',  // GitHub repo
    packageJson.version,    // Current version
    'specgofer'             // Extension name for VSIX filename
  );

  // Start checking for updates using GitHub Pages API
  autoUpdater.startPeriodicChecks(context);

  // Start Language Server
  lspClient = new SpecGoferLSPClient(context);
  try {
    await lspClient.start();
    console.log('Language Server started successfully');
  } catch (error) {
    console.error('Failed to start Language Server:', error);
    vscode.window.showErrorMessage(`SpecGofer Language Server failed to start: ${error}`);
  }

  // Register commands globally (before workspace check)
  // This ensures commands are always available even without a workspace
  registerGlobalCommands(context);

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    console.log('[SpecGofer] No workspace folder open, waiting...');
    // No workspace open yet, wait for one
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      await reinitializeExtension(context);
    });
    return;
  }

  console.log(`[SpecGofer] Workspace detected: ${workspaceFolder.uri.fsPath}`);
  await initializeForWorkspace(context);

  // Listen for workspace changes to reinitialize
  vscode.workspace.onDidChangeWorkspaceFolders(async () => {
    await reinitializeExtension(context);
  });
}

async function reinitializeExtension(context: vscode.ExtensionContext) {
  console.log('[SpecGofer] Workspace changed, reinitializing...');

  // Dispose existing providers
  if (progressProvider) {
    progressProvider = undefined;
  }
  if (constitutionProvider) {
    constitutionProvider = undefined;
  }
  if (branchSpecManager) {
    branchSpecManager = undefined;
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
  const migrator = new SpecKitMigrator(workspacePath);

  // Check if .specify exists and what format it's in
  const versionInfo = await migrator.getVersionInfo();

  console.log('Spec Kit format detected:', versionInfo.format);

  // Handle different scenarios
  switch (versionInfo.format) {
    case 'none':
      await handleNoSpecKit(context, workspacePath, migrator);
      break;

    case 'legacy-json':
      await handleLegacyFormat(context, workspacePath, migrator);
      break;

    case 'spec-kit':
      await handleSpecKitFormat(context, workspacePath);
      break;

    case 'mixed':
      await handleMixedFormat(context, workspacePath, migrator);
      break;
  }

  // Register commands (always available)
  registerCommands(context, workspacePath, migrator);
}

async function handleNoSpecKit(
  context: vscode.ExtensionContext,
  workspacePath: string,
  migrator: SpecKitMigrator
) {
  console.log('No .specify folder found');

  const config = vscode.workspace.getConfiguration('specKit');
  const autoInit = config.get<boolean>('autoInitialize', false);

  if (autoInit) {
    const choice = await vscode.window.showInformationMessage(
      'No SpecGofer structure found in this workspace. Initialize now?',
      'Yes', 'No', 'Don\'t ask again'
    );

    if (choice === 'Yes') {
      await vscode.commands.executeCommand('specGofer.initialize');
    } else if (choice === 'Don\'t ask again') {
      await config.update('autoInitialize', false, vscode.ConfigurationTarget.Global);
    }
  }
}

async function handleLegacyFormat(
  context: vscode.ExtensionContext,
  workspacePath: string,
  migrator: SpecKitMigrator
) {
  console.log('Legacy JSON format detected');

  const choice = await vscode.window.showWarningMessage(
    '📦 Old .specify format detected (JSON)\n\nUpgrade to GitHub Spec Kit format (Markdown)?',
    { modal: false },
    'Upgrade Now', 'Later', 'Learn More'
  );

  if (choice === 'Upgrade Now') {
    await migrator.upgrade();
    await handleSpecKitFormat(context, workspacePath);
  } else if (choice === 'Learn More') {
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/github/spec-kit'));
  } else {
    // Use legacy format for now
    await initializeProgressProvider(context, workspacePath);
  }
}

async function handleSpecKitFormat(
  context: vscode.ExtensionContext,
  workspacePath: string
) {
  console.log('Spec Kit format detected - ready to use');

  await initializeProgressProvider(context, workspacePath);

  // Auto-setup MCP configuration for Claude Code integration
  const mcpConfigHelper = new MCPConfigHelper(workspacePath, context);
  const created = await mcpConfigHelper.autoSetup();

  if (created) {
    console.log('MCP configuration auto-created for Claude Code integration');
  }

  vscode.window.setStatusBarMessage('$(notebook) SpecGofer - Enterprise AI ready', 3000);
}

async function handleMixedFormat(
  context: vscode.ExtensionContext,
  workspacePath: string,
  migrator: SpecKitMigrator
) {
  console.log('Mixed format detected');

  const choice = await vscode.window.showWarningMessage(
    'Mixed .specify formats detected. Complete migration to Spec Kit?',
    'Migrate', 'Later'
  );

  if (choice === 'Migrate') {
    await migrator.upgrade();
    await handleSpecKitFormat(context, workspacePath);
  } else {
    await initializeProgressProvider(context, workspacePath);
  }
}

async function initializeProgressProvider(
  context: vscode.ExtensionContext,
  workspacePath: string
) {
  // Initialize branch-aware spec manager
  branchSpecManager = new BranchSpecManager(workspacePath);
  await branchSpecManager.initializeBranchStructure();

  // Initialize the progress tree view with branch support
  progressProvider = new ProgressProvider(workspacePath, branchSpecManager);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('specGoferProgress', progressProvider)
  );

  // Initialize constitution tree view
  constitutionProvider = new ConstitutionProvider(workspacePath);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('specGoferConstitution', constitutionProvider)
  );

  // Initialize memory tree view
  memoryProvider = new MemoryProvider(workspacePath);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('specGoferMemory', memoryProvider)
  );

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

  // Set context for when clause
  vscode.commands.executeCommand('setContext', 'specKitActive', true);

  // Show the Spec Kit view
  vscode.commands.executeCommand('specGoferProgress.focus');
}

async function handleBranchChange() {
  if (branchSpecManager) {
    await branchSpecManager.refreshBranch();
    if (progressProvider) {
      progressProvider.refresh();
    }
    const currentBranch = branchSpecManager.getBranch();
    vscode.window.setStatusBarMessage(`$(git-branch) SpecGofer: Switched to ${currentBranch}`, 3000);
  }
}

/**
 * Register commands that work globally without requiring a workspace
 */
function registerGlobalCommands(context: vscode.ExtensionContext) {
  // Show progress panel
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.showProgress', () => {
      vscode.commands.executeCommand('specGoferProgress.focus');
    })
  );

  // Show constitution panel
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.showConstitution', () => {
      vscode.commands.executeCommand('specGoferConstitution.focus');
    })
  );

  // Manual update check
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.checkForUpdates', async () => {
      if (autoUpdater) {
        await autoUpdater.manualCheck();
      } else {
        vscode.window.showErrorMessage('Auto-updater not initialized');
      }
    })
  );

  // Update now command
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.updateNow', async () => {
      if (autoUpdater) {
        await autoUpdater.manualCheck();
      } else {
        vscode.window.showErrorMessage('Auto-updater not initialized');
      }
    })
  );

  // Refresh specs
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.refreshSpecs', () => {
      if (progressProvider) {
        progressProvider.refresh();
      } else {
        vscode.window.showWarningMessage('No workspace with SpecGofer initialized');
      }
    })
  );

  // Refresh constitution
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.refreshConstitution', () => {
      if (constitutionProvider) {
        constitutionProvider.refresh();
      } else {
        vscode.window.showWarningMessage('No workspace with SpecGofer initialized');
      }
    })
  );

  // Refresh memory
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.refreshMemory', () => {
      if (memoryProvider) {
        memoryProvider.refresh();
      } else {
        vscode.window.showWarningMessage('No workspace with SpecGofer initialized');
      }
    })
  );
}

/**
 * Register commands that require a workspace
 */
function registerCommands(
  context: vscode.ExtensionContext,
  workspacePath: string,
  migrator: SpecKitMigrator
) {
  // Initialize/Create Spec Kit structure
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.initialize', async () => {
      const exists = await migrator.exists();

      if (exists) {
        const versionInfo = await migrator.getVersionInfo();

        if (versionInfo.needsUpgrade) {
          // Legacy or mixed format - needs upgrade
          await migrator.upgrade();
        } else if (versionInfo.format === 'spec-kit') {
          // Already spec-kit format - offer to update templates/scripts
          await migrator.upgrade(); // This will call updateSpecKitTemplates()
        } else {
          vscode.window.showInformationMessage('SpecGofer already initialized!');
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
    vscode.commands.registerCommand('specGofer.upgrade', async () => {
      await migrator.upgrade();
      if (progressProvider) {
        progressProvider.refresh();
      }
    })
  );

  // Show version info
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.checkVersion', async () => {
      const versionInfo = await migrator.getVersionInfo();

      vscode.window.showInformationMessage(
        `SpecGofer Status:\n\nFormat: ${versionInfo.format}\n${versionInfo.details}`,
        versionInfo.needsUpgrade ? 'Upgrade' : 'OK'
      ).then(choice => {
        if (choice === 'Upgrade') {
          vscode.commands.executeCommand('specGofer.upgrade');
        }
      });
    })
  );

  // Update templates command
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.updateTemplates', async () => {
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Updating Spec Kit Templates',
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
    vscode.commands.registerCommand('specGofer.createSpec', async (uri?: vscode.Uri) => {
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
        }
      });

      if (specName) {
        const specsPath = path.join(workspacePath, '.specify', 'specs', specName.trim());
        const specFile = path.join(specsPath, 'spec.md');

        try {
          // Create directory if it doesn't exist
          await vscode.workspace.fs.createDirectory(vscode.Uri.file(specsPath));

          // Create spec template
          const specTemplate = `---
id: "${specName.trim()}"
title: "${specName.trim().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}"
status: "draft"
created: "${new Date().toISOString().split('T')[0]}"
---

# ${specName.trim().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

## Overview

Brief description of the feature or requirement.

## Problem Statement

What problem does this solve?

## Solution

How will this be implemented?

## Acceptance Criteria

### AC1: First Criterion
- **Given** initial condition
- **When** user performs action
- **Then** expected outcome occurs

## Tasks

- [ ] #T001 First task (deps: none)
- [ ] #T002 Second task (deps: T001)

## Dependencies

### Internal
- List internal dependencies

### External
- List external dependencies

## Test Strategy

How will this be tested?

## Success Metrics

How will success be measured?
`;

          await vscode.workspace.fs.writeFile(vscode.Uri.file(specFile), Buffer.from(specTemplate));

          // Open the new spec file
          const doc = await vscode.workspace.openTextDocument(specFile);
          await vscode.window.showTextDocument(doc);

          // Refresh tree view
          if (progressProvider) {
            progressProvider.refresh();
          }

          vscode.window.showInformationMessage(`Created new specification: ${specName}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to create specification: ${error}`);
        }
      }
    })
  );

  // Open specification command
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.openSpec', async (specId?: string) => {
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
              specId: name
            }));

          if (specItems.length === 0) {
            vscode.window.showInformationMessage('No specifications found. Create one first!');
            return;
          }

          const selected = await vscode.window.showQuickPick(specItems, {
            placeHolder: 'Select a specification to open'
          });

          if (selected) {
            vscode.commands.executeCommand('specGofer.openSpec', selected.specId);
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to list specifications: ${error}`);
        }
      }
    })
  );

  // Show spec details command (from tree view clicks)
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.showSpecDetails', async (spec: any) => {
      const { showSpecDetailsWebview } = await import('./webviewHelpers');
      showSpecDetailsWebview(context, spec);
    })
  );

  // Show section details command (from constitution tree view clicks)
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.showSectionDetails', async (section: any, article: any) => {
      const { showSectionDetailsWebview } = await import('./webviewHelpers');
      showSectionDetailsWebview(context, section, article);
    })
  );

  // Show article details command (from constitution article clicks)
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.showArticleDetails', async (article: any) => {
      const { showArticleDetailsWebview } = await import('./webviewHelpers');
      showArticleDetailsWebview(context, article);
    })
  );

  // Show memory document command (from memory tree view clicks)
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.showMemoryDocument', async (document: any) => {
      const { showMemoryDocumentWebview } = await import('./webviewHelpers');
      await showMemoryDocumentWebview(context, document);
    })
  );

  // Show memory section command (from memory section clicks)
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.showMemorySection', async (section: any, document: any) => {
      const { showMemorySectionWebview } = await import('./webviewHelpers');
      await showMemorySectionWebview(context, section, document);
    })
  );

  // Open With... context menu commands
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.openWithPreview', async (item: any) => {
      const { openWithPreview } = await import('./webviewHelpers');
      await openWithPreview(item);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.openWithMarkSharp', async (item: any) => {
      const { openWithMarkSharp } = await import('./webviewHelpers');
      await openWithMarkSharp(item);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.openWithMarkdownEditor', async (item: any) => {
      const { openWithMarkdownEditor } = await import('./webviewHelpers');
      await openWithMarkdownEditor(item);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.openWithMarkdownWYSIWYG', async (item: any) => {
      const { openWithMarkdownWYSIWYG } = await import('./webviewHelpers');
      await openWithMarkdownWYSIWYG(item);
    })
  );
}

export async function deactivate() {
  console.log('SpecGofer extension deactivating...');

  // Stop Language Server
  if (lspClient) {
    await lspClient.stop();
    console.log('Language Server stopped');
  }

  console.log('SpecGofer extension deactivated');
}
