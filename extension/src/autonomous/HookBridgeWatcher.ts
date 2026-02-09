/**
 * HookBridgeWatcher
 *
 * Watches .specify/hooks/context-bridge.json for changes written by
 * Claude Code hooks (PostToolUse, UserPromptSubmit, Stop).
 *
 * Emits events that drive the Context and Activity status bars in real-time
 * without polling.
 *
 * Events:
 * - 'bridge-update': Fired on every bridge file change with parsed data
 * - 'session-start': Fired when session.active transitions to true
 * - 'session-end': Fired when session.active transitions to false
 * - 'session-stale': Fired when bridge timestamp is older than staleness threshold
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

/** Shape of the context-bridge.json file written by hooks */
export interface BridgeData {
  timestamp: number;
  sessionId: string;
  model: string;
  context: {
    totalContextTokens: number;
    inputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    outputTokens: number;
    contextLimit: number;
    utilizationPercent: number;
  } | null;
  lastToolUse: {
    toolName: string;
    timestamp: number;
    observationId?: string;
    toolInput?: Record<string, unknown>;
  } | null;
  session: {
    active: boolean;
    lastActivity: number;
    startedAt?: number;
    endedAt?: number;
  };
}

/** Staleness threshold: 5 minutes with no bridge updates */
const STALENESS_MS = 5 * 60 * 1000;

/** How often to check for staleness (60 seconds) */
const STALENESS_CHECK_MS = 60 * 1000;

export class HookBridgeWatcher extends EventEmitter implements vscode.Disposable {
  private readonly bridgePath: string;
  private watcher: vscode.FileSystemWatcher | null = null;
  private stalenessTimer: ReturnType<typeof setInterval> | null = null;
  private latestData: BridgeData | null = null;
  private wasActive = false;
  private isStale = false;
  private disposables: vscode.Disposable[] = [];

  constructor(private readonly workspacePath: string) {
    super();
    this.bridgePath = path.join(workspacePath, '.specify', 'hooks', 'context-bridge.json');
  }

  /**
   * Starts watching the bridge file.
   */
  start(): void {
    // Watch for bridge file changes
    const pattern = new vscode.RelativePattern(
      this.workspacePath,
      '.specify/hooks/context-bridge.json'
    );
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.watcher.onDidChange(() => this.onBridgeChange());
    this.watcher.onDidCreate(() => this.onBridgeChange());
    this.watcher.onDidDelete(() => this.onBridgeDelete());

    this.disposables.push(this.watcher);

    // Start staleness checker
    this.stalenessTimer = setInterval(() => this.checkStaleness(), STALENESS_CHECK_MS);

    // Do an initial read in case the file already exists
    this.onBridgeChange();
  }

  /**
   * Returns the latest bridge data, or null if unavailable.
   */
  getLatestData(): BridgeData | null {
    return this.latestData;
  }

  /**
   * Returns true if hook data is available and not stale.
   */
  isHookDataAvailable(): boolean {
    return this.latestData !== null && !this.isStale;
  }

  /**
   * Returns whether the bridge data is stale (>5 min old).
   */
  isDataStale(): boolean {
    return this.isStale;
  }

  private onBridgeChange(): void {
    try {
      const raw = fs.readFileSync(this.bridgePath, 'utf-8');
      const data: BridgeData = JSON.parse(raw);
      this.latestData = data;
      this.isStale = false;

      // Detect session transitions
      const isNowActive = data.session?.active ?? false;

      if (isNowActive && !this.wasActive) {
        this.emit('session-start', data);
      } else if (!isNowActive && this.wasActive) {
        this.emit('session-end', data);
      }
      this.wasActive = isNowActive;

      this.emit('bridge-update', data);
    } catch {
      // File might be mid-write or invalid; ignore
    }
  }

  private onBridgeDelete(): void {
    this.latestData = null;
    if (this.wasActive) {
      this.wasActive = false;
      this.emit('session-end', null);
    }
  }

  private checkStaleness(): void {
    if (!this.latestData) {
      return;
    }

    const age = Date.now() - this.latestData.timestamp;
    if (age > STALENESS_MS && !this.isStale) {
      this.isStale = true;
      this.emit('session-stale', this.latestData);
    }
  }

  dispose(): void {
    if (this.stalenessTimer) {
      clearInterval(this.stalenessTimer);
      this.stalenessTimer = null;
    }
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    this.removeAllListeners();
  }
}
