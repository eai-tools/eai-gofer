import * as vscode from 'vscode';
import * as path from 'path';
import { ClaudeCodeBridge } from './claudeCodeBridge';
import { FileMonitor } from './fileMonitor';
import { ProgressProvider } from './progressProvider';
import { OrchestratorProcess } from './orchestratorProcess';

let orchestratorProcess: OrchestratorProcess | undefined;
let claudeBridge: ClaudeCodeBridge | undefined;
let fileMonitor: FileMonitor | undefined;
let progressProvider: ProgressProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Spec-Driven Orchestrator extension is now active');

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found. Please open a workspace.');
    return;
  }

  const workspacePath = workspaceFolder.uri.fsPath;
  const specDir = path.join(workspacePath, '.specify');

  // Check if .specify folder exists
  const fs = require('fs');
  if (!fs.existsSync(specDir)) {
    console.log('No .specify folder found. Extension will remain inactive.');
    return;
  }

  // Set context for when clause
  vscode.commands.executeCommand('setContext', 'specOrchestratorActive', true);

  // Initialize components
  progressProvider = new ProgressProvider(workspacePath);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('specOrchestratorProgress', progressProvider)
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('specOrchestrator.start', async () => {
      await startOrchestrator(workspacePath, context);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('specOrchestrator.stop', async () => {
      await stopOrchestrator();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('specOrchestrator.showPanel', () => {
      progressProvider?.refresh();
      vscode.commands.executeCommand('specOrchestratorProgress.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('specOrchestrator.refreshSpecs', () => {
      progressProvider?.refresh();
    })
  );

  // Auto-start if configured
  const config = vscode.workspace.getConfiguration('specOrchestrator');
  if (config.get<boolean>('autoStart')) {
    startOrchestrator(workspacePath, context);
  }

  // Show welcome message
  vscode.window.showInformationMessage(
    'Spec-Driven Orchestrator ready. Run "Spec Orchestrator: Start" to begin.',
    'Start Now'
  ).then(selection => {
    if (selection === 'Start Now') {
      vscode.commands.executeCommand('specOrchestrator.start');
    }
  });
}

async function startOrchestrator(
  workspacePath: string,
  context: vscode.ExtensionContext
): Promise<void> {
  if (orchestratorProcess?.isRunning()) {
    vscode.window.showWarningMessage('Orchestrator is already running');
    return;
  }

  // Check for API key
  const config = vscode.workspace.getConfiguration('specOrchestrator');
  let apiKey = config.get<string>('anthropicApiKey');

  if (!apiKey) {
    // Try to get from environment
    apiKey = process.env.ANTHROPIC_API_KEY;
  }

  if (!apiKey) {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter your Anthropic API key',
      password: true,
      placeHolder: 'sk-ant-...'
    });

    if (!input) {
      vscode.window.showErrorMessage('API key is required to start the orchestrator');
      return;
    }

    apiKey = input;
    await config.update('anthropicApiKey', apiKey, vscode.ConfigurationTarget.Global);
  }

  // Start the orchestrator process
  orchestratorProcess = new OrchestratorProcess(workspacePath, apiKey);
  await orchestratorProcess.start();

  // Initialize Claude Code bridge
  claudeBridge = new ClaudeCodeBridge(workspacePath, apiKey, context);
  await claudeBridge.start();

  // Initialize file monitor
  fileMonitor = new FileMonitor(workspacePath, claudeBridge, progressProvider!);
  await fileMonitor.start();

  // Update status bar
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = '$(sync~spin) Orchestrator Running';
  statusBar.tooltip = 'Spec-Driven Orchestrator is active';
  statusBar.command = 'specOrchestrator.showPanel';
  statusBar.show();
  context.subscriptions.push(statusBar);

  vscode.window.showInformationMessage('Spec-Driven Orchestrator started successfully!');
}

async function stopOrchestrator(): Promise<void> {
  if (!orchestratorProcess?.isRunning()) {
    vscode.window.showWarningMessage('Orchestrator is not running');
    return;
  }

  await fileMonitor?.stop();
  await claudeBridge?.stop();
  await orchestratorProcess?.stop();

  orchestratorProcess = undefined;
  claudeBridge = undefined;
  fileMonitor = undefined;

  vscode.window.showInformationMessage('Spec-Driven Orchestrator stopped');
}

export function deactivate() {
  stopOrchestrator();
}
