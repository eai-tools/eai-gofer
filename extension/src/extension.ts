import * as vscode from 'vscode';
import * as path from 'path';
import { SpecKitMigrator } from './specKitMigrator';
import { ProgressProvider } from './progressProvider';
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
let autoUpdater: AutoUpdater | undefined;
let lspClient: SpecGoferLSPClient | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('SpecGofer (Enterprise AI) extension activated');

  // Setup auto-updater
  const packageJson = require('../package.json');
  autoUpdater = new AutoUpdater(
    'eai-tools/specgofer',  // GitHub repo
    packageJson.version       // Current version
  );

  // Start checking for updates
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

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    // No workspace open yet, wait for one
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      await initializeForWorkspace(context);
    });
    return;
  }

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
      await vscode.commands.executeCommand('specKit.initialize');
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
  // Initialize the progress tree view
  progressProvider = new ProgressProvider(workspacePath);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('specKitProgress', progressProvider)
  );

  // Set context for when clause
  vscode.commands.executeCommand('setContext', 'specKitActive', true);

  // Show the Spec Kit view
  vscode.commands.executeCommand('specKitProgress.focus');
}

function registerCommands(
  context: vscode.ExtensionContext,
  workspacePath: string,
  migrator: SpecKitMigrator
) {
  // Initialize/Create Spec Kit structure
  context.subscriptions.push(
    vscode.commands.registerCommand('specKit.initialize', async () => {
      const exists = await migrator.exists();

      if (exists) {
        const versionInfo = await migrator.getVersionInfo();

        if (versionInfo.needsUpgrade) {
          await migrator.upgrade();
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
    vscode.commands.registerCommand('specKit.upgrade', async () => {
      await migrator.upgrade();
      if (progressProvider) {
        progressProvider.refresh();
      }
    })
  );

  // Show version info
  context.subscriptions.push(
    vscode.commands.registerCommand('specKit.checkVersion', async () => {
      const versionInfo = await migrator.getVersionInfo();

      vscode.window.showInformationMessage(
        `SpecGofer Status:\n\nFormat: ${versionInfo.format}\n${versionInfo.details}`,
        versionInfo.needsUpgrade ? 'Upgrade' : 'OK'
      ).then(choice => {
        if (choice === 'Upgrade') {
          vscode.commands.executeCommand('specKit.upgrade');
        }
      });
    })
  );

  // Refresh specs
  context.subscriptions.push(
    vscode.commands.registerCommand('specKit.refreshSpecs', () => {
      if (progressProvider) {
        progressProvider.refresh();
      }
    })
  );

  // Show progress panel
  context.subscriptions.push(
    vscode.commands.registerCommand('specKit.showProgress', () => {
      vscode.commands.executeCommand('specKitProgress.focus');
    })
  );

  // Manual update check
  context.subscriptions.push(
    vscode.commands.registerCommand('specKit.checkForUpdates', async () => {
      if (autoUpdater) {
        await autoUpdater.manualCheck();
      }
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
