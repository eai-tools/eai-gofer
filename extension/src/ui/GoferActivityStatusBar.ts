/**
 * GoferActivityStatusBar — "Gofer Memory: Active/Idle" status bar item
 *
 * Shows whether Claude Code is actively working based on hook bridge data.
 *
 * Display states:
 * - $(pulse) Gofer Memory: Active  (green)  — tool call within last 30 seconds
 * - $(clock) Gofer Memory: Idle    (dim)    — session active, no recent tool call
 * - Gofer Memory: --               (gray)   — no active session
 *
 * Click handler shows session details in a QuickPick.
 */

import * as vscode from 'vscode';
import type { HookBridgeWatcher, BridgeData } from '../autonomous/HookBridgeWatcher';

/** How recent a tool call must be to show "Active" (30 seconds) */
const ACTIVE_THRESHOLD_MS = 30 * 1000;

const SHOW_ACTIVITY_COMMAND = 'gofer.showActivityDetails';

export class GoferActivityStatusBar implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];
  private latestData: BridgeData | null = null;

  constructor(private readonly watcher: HookBridgeWatcher) {
    // Priority 101: left of Context bar (which is 100)
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 101);
    this.statusBarItem.command = SHOW_ACTIVITY_COMMAND;

    const cmdDisposable = vscode.commands.registerCommand(SHOW_ACTIVITY_COMMAND, () =>
      this.showDetails()
    );
    this.disposables.push(cmdDisposable);

    // Wire to bridge watcher
    const onUpdate = (data: BridgeData): void => {
      this.latestData = data;
      this.updateDisplay();
    };
    const onEnd = (): void => {
      this.latestData = null;
      this.updateDisplay();
    };
    const onStale = (): void => {
      this.updateDisplay();
    };

    watcher.on('bridge-update', onUpdate);
    watcher.on('session-end', onEnd);
    watcher.on('session-stale', onStale);

    this.disposables.push({
      dispose: () => {
        watcher.off('bridge-update', onUpdate);
        watcher.off('session-end', onEnd);
        watcher.off('session-stale', onStale);
      },
    });

    // Initial state
    this.updateDisplay();
  }

  show(): void {
    this.statusBarItem.show();
  }

  hide(): void {
    this.statusBarItem.hide();
  }

  private updateDisplay(): void {
    const data = this.latestData;

    if (!data || !data.session?.active || this.watcher.isDataStale()) {
      this.statusBarItem.text = 'Gofer Memory: --';
      this.statusBarItem.color = new vscode.ThemeColor('disabledForeground');
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = 'No active Claude Code session';
      return;
    }

    const now = Date.now();
    const lastToolTime = data.lastToolUse?.timestamp || 0;
    const timeSinceLastTool = now - lastToolTime;

    if (timeSinceLastTool < ACTIVE_THRESHOLD_MS) {
      // Active
      this.statusBarItem.text = '$(pulse) Gofer Memory: Active';
      this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.foreground');
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = `Claude Code is working\nLast tool: ${data.lastToolUse?.toolName || 'unknown'}`;
    } else {
      // Idle
      this.statusBarItem.text = '$(clock) Gofer Memory: Idle';
      this.statusBarItem.color = new vscode.ThemeColor('disabledForeground');
      this.statusBarItem.backgroundColor = undefined;
      const idleSecs = Math.round(timeSinceLastTool / 1000);
      const idleDisplay = idleSecs < 60 ? `${idleSecs}s` : `${Math.round(idleSecs / 60)}m`;
      this.statusBarItem.tooltip = `Claude Code idle for ${idleDisplay}\nSession: ${data.sessionId?.substring(0, 8) || 'unknown'}`;
    }
  }

  private async showDetails(): Promise<void> {
    const data = this.latestData;

    if (!data) {
      await this.showNoSessionPicker();
      return;
    }

    const items: Array<vscode.QuickPickItem & { action?: string }> = [];

    items.push({
      label: '$(server) Session Info',
      kind: vscode.QuickPickItemKind.Separator,
    });

    if (data.sessionId) {
      items.push({
        label: `$(key) Session: ${data.sessionId.substring(0, 8)}...`,
        description: data.sessionId,
      });
    }

    if (data.model) {
      items.push({
        label: `$(rocket) Model: ${data.model}`,
      });
    }

    if (data.session?.startedAt) {
      const durationMs = Date.now() - data.session.startedAt;
      const minutes = Math.round(durationMs / 60000);
      const display =
        minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
      items.push({
        label: `$(clock) Session duration: ${display}`,
      });
    }

    items.push({
      label: '$(tools) Activity',
      kind: vscode.QuickPickItemKind.Separator,
    });

    if (data.lastToolUse) {
      const ago = Math.round((Date.now() - data.lastToolUse.timestamp) / 1000);
      const agoDisplay = ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`;
      items.push({
        label: `$(wrench) Last tool: ${data.lastToolUse.toolName}`,
        description: agoDisplay,
      });
    } else {
      items.push({
        label: '$(wrench) No tool calls recorded',
      });
    }

    const isActive = data.session?.active && !this.watcher.isDataStale();
    items.push({
      label: `$(${isActive ? 'circle-filled' : 'circle-outline'}) Status: ${isActive ? 'Active' : 'Inactive'}`,
    });

    await vscode.window.showQuickPick(items, {
      title: 'Gofer Memory Session Details',
      placeHolder: 'Session information from Claude Code hooks',
    });
  }

  /**
   * Show QuickPick with option to start Claude Code when no session is active.
   */
  private async showNoSessionPicker(): Promise<void> {
    const config = vscode.workspace.getConfiguration('gofer');
    const mode = config.get<string>('claudeCodeMode', 'standard');
    const modeLabel = mode === 'yolo' ? 'Yolo' : mode === 'custom' ? 'Custom' : 'Standard';

    const items: Array<vscode.QuickPickItem & { action?: string }> = [
      {
        label: '$(info) No active Claude Code session',
        detail: 'Start Claude Code to enable real-time context and activity monitoring.',
      },
      {
        label: `$(play) Start Claude Code (${modeLabel})`,
        description: mode === 'yolo' ? 'Skips permission prompts' : 'Open a terminal and launch',
        action: 'startClaude',
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      title: 'Gofer Memory',
      placeHolder: 'No session detected',
    });

    if (selected?.action === 'startClaude') {
      await this.launchClaudeCodeTerminal();
    }
  }

  /**
   * Launch Claude Code in a new terminal using the configured command/mode.
   * Ensures hooks are installed before launching.
   */
  private async launchClaudeCodeTerminal(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showWarningMessage('No workspace folder open.');
      return;
    }

    // Ensure hooks are installed before launching
    try {
      const { GoferMigrator } = await import('../goferMigrator');
      const migrator = new GoferMigrator(workspaceFolder.uri.fsPath);
      await migrator.installHooksConfig();
    } catch (error) {
      console.warn('[GoferActivityStatusBar] Failed to install hooks before launch:', error);
    }

    const config = vscode.workspace.getConfiguration('gofer');
    const mode = config.get<string>('claudeCodeMode', 'standard');
    let claudeCmd: string;
    switch (mode) {
      case 'yolo':
        claudeCmd = 'claude --dangerously-skip-permissions';
        break;
      case 'custom':
        claudeCmd = config.get<string>('claudeCodeCommand', 'claude');
        break;
      default:
        claudeCmd = 'claude';
    }

    const terminal = vscode.window.createTerminal({
      name: 'Claude Code',
      cwd: workspaceFolder.uri,
    });
    terminal.show();
    terminal.sendText(claudeCmd);
  }

  dispose(): void {
    this.statusBarItem.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
