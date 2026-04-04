/**
 * MultiSessionBridgeWatcher
 *
 * Watches .specify/hooks/ for per-session bridge files (context-bridge-{sessionId}.json)
 * and maintains a registry of up to 3 concurrent Claude Code sessions.
 *
 * Also watches the legacy context-bridge.json for backward compatibility.
 *
 * Events (multi-session):
 * - 'session-update': Fired when any session's bridge file changes
 * - 'session-added': Fired when a new session is detected
 * - 'session-removed': Fired when a session is removed (stale/inactive/evicted)
 * - 'session-limit-reached': Fired when a 4th session triggers eviction
 * - 'focused-session-change': Fired when the most active session changes
 *
 * Legacy events (for backward compatibility with existing consumers):
 * - 'bridge-update': Emitted with focused session data
 * - 'session-start': Emitted when focused session starts
 * - 'session-end': Emitted when focused session ends
 * - 'session-stale': Emitted when focused session becomes stale
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import type { BridgeData } from './HookBridgeWatcher';

/** Maximum number of tracked sessions */
const MAX_SESSIONS = 3;

/** Staleness threshold: 5 minutes with no bridge updates */
const STALENESS_MS = 5 * 60 * 1000;

/** How often to check for staleness (60 seconds) */
const STALENESS_CHECK_MS = 60 * 1000;

/** Grace period after staleness before removing session (5 minutes) */
const REMOVAL_GRACE_MS = 5 * 60 * 1000;

/** Per-session bridge file prefix */
const PER_SESSION_PREFIX = 'context-bridge-';

/** Legacy bridge file name */
const LEGACY_BRIDGE_NAME = 'context-bridge.json';

export class MultiSessionBridgeWatcher extends EventEmitter implements vscode.Disposable {
  private readonly hooksDir: string;
  private sessions: Map<string, BridgeData> = new Map();
  private sessionStaleTimestamps: Map<string, number> = new Map();
  private focusedSessionId: string | null = null;
  private perSessionWatcher: vscode.FileSystemWatcher | null = null;
  private legacyWatcher: vscode.FileSystemWatcher | null = null;
  private stalenessTimer: ReturnType<typeof setInterval> | null = null;
  private disposables: vscode.Disposable[] = [];

  /** Legacy compat: track whether the focused session was active */
  private wasFocusedActive = false;
  /** Legacy compat: track whether focused session is stale */
  private isFocusedStale = false;

  constructor(private readonly workspacePath: string) {
    super();
    this.hooksDir = path.join(workspacePath, '.specify', 'hooks');
  }

  /**
   * Start watching for per-session and legacy bridge files.
   */
  start(): void {
    // Watch per-session bridge files: context-bridge-*.json
    const perSessionPattern = new vscode.RelativePattern(
      this.workspacePath,
      '.specify/hooks/context-bridge-*.json'
    );
    this.perSessionWatcher = vscode.workspace.createFileSystemWatcher(perSessionPattern);
    this.perSessionWatcher.onDidChange((uri) => this.onPerSessionChange(uri));
    this.perSessionWatcher.onDidCreate((uri) => this.onPerSessionChange(uri));
    this.perSessionWatcher.onDidDelete((uri) => this.onPerSessionDelete(uri));
    this.disposables.push(this.perSessionWatcher);

    // Watch legacy bridge file for backward compat
    const legacyPattern = new vscode.RelativePattern(
      this.workspacePath,
      '.specify/hooks/context-bridge.json'
    );
    this.legacyWatcher = vscode.workspace.createFileSystemWatcher(legacyPattern);
    this.legacyWatcher.onDidChange(() => this.onLegacyChange());
    this.legacyWatcher.onDidCreate(() => this.onLegacyChange());
    this.legacyWatcher.onDidDelete(() => this.onLegacyDelete());
    this.disposables.push(this.legacyWatcher);

    // Start staleness checker
    this.stalenessTimer = setInterval(() => this.checkStaleness(), STALENESS_CHECK_MS);

    // Initial scan for existing bridge files
    this.initialScan();
  }

  // ── Public API (multi-session) ──────────────────────────────────────

  /** Get all tracked sessions */
  getSessions(): Map<string, BridgeData> {
    return new Map(this.sessions);
  }

  /** Get the most recently active session */
  getFocusedSession(): BridgeData | null {
    if (!this.focusedSessionId) {return null;}
    return this.sessions.get(this.focusedSessionId) ?? null;
  }

  /** Get number of tracked sessions */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /** Check if any session has real data */
  hasRealData(): boolean {
    for (const data of this.sessions.values()) {
      if (data.context !== null) {return true;}
    }
    return false;
  }

  // ── Legacy API (backward compat for existing consumers) ─────────────

  /** Returns the focused session's data (legacy compat) */
  getLatestData(): BridgeData | null {
    return this.getFocusedSession();
  }

  /** Returns true if focused session has non-stale data (legacy compat) */
  isHookDataAvailable(): boolean {
    return this.focusedSessionId !== null && !this.isFocusedStale;
  }

  /** Returns whether focused session is stale (legacy compat) */
  isDataStale(): boolean {
    return this.isFocusedStale;
  }

  // ── Per-session file handlers ───────────────────────────────────────

  private extractSessionIdFromUri(uri: vscode.Uri): string | null {
    const filename = path.basename(uri.fsPath);
    if (!filename.startsWith(PER_SESSION_PREFIX) || !filename.endsWith('.json')) {
      return null;
    }
    const rawId = filename.slice(PER_SESSION_PREFIX.length, -5); // Remove prefix and .json
    // Sanitize to prevent path traversal
    return rawId.replace(/[^a-zA-Z0-9_-]/g, '') || null;
  }

  private onPerSessionChange(uri: vscode.Uri): void {
    const sessionId = this.extractSessionIdFromUri(uri);
    if (!sessionId) {return;}

    try {
      const raw = fs.readFileSync(uri.fsPath, 'utf-8');
      const data: BridgeData = JSON.parse(raw);
      this.updateSession(sessionId, data);
    } catch {
      // File mid-write or corrupted; ignore
    }
  }

  private onPerSessionDelete(uri: vscode.Uri): void {
    const sessionId = this.extractSessionIdFromUri(uri);
    if (!sessionId) {return;}
    this.removeSession(sessionId, 'inactive');
  }

  // ── Legacy file handlers ────────────────────────────────────────────

  private onLegacyChange(): void {
    try {
      const legacyPath = path.join(this.hooksDir, LEGACY_BRIDGE_NAME);
      const raw = fs.readFileSync(legacyPath, 'utf-8');
      const data: BridgeData = JSON.parse(raw);

      // Only use legacy file if the session doesn't already have a per-session file
      const sessionId = data.sessionId || '__legacy__';
      const perSessionPath = path.join(this.hooksDir, `${PER_SESSION_PREFIX}${data.sessionId}.json`);

      // Skip if we already track this session via per-session file
      if (data.sessionId && fs.existsSync(perSessionPath)) {
        return;
      }

      this.updateSession(sessionId, data);
    } catch {
      // File mid-write or corrupted; ignore
    }
  }

  private onLegacyDelete(): void {
    if (this.sessions.has('__legacy__')) {
      this.removeSession('__legacy__', 'inactive');
    }
  }

  // ── Session Registry ────────────────────────────────────────────────

  private updateSession(sessionId: string, data: BridgeData): void {
    const isNew = !this.sessions.has(sessionId);

    // Enforce cap: if new session and at limit, evict oldest inactive
    if (isNew && this.sessions.size >= MAX_SESSIONS) {
      const evictedId = this.findOldestInactive();
      if (evictedId) {
        this.removeSession(evictedId, 'evicted');
        this.emit('session-limit-reached', {
          evictedSessionId: evictedId,
          newSessionId: sessionId,
        });
      } else {
        // All sessions are active — evict the oldest by lastActivity
        const oldestId = this.findOldestByActivity();
        if (oldestId) {
          this.removeSession(oldestId, 'evicted');
          this.emit('session-limit-reached', {
            evictedSessionId: oldestId,
            newSessionId: sessionId,
          });
        }
      }
    }

    // Clear staleness tracking on update
    this.sessionStaleTimestamps.delete(sessionId);

    this.sessions.set(sessionId, data);

    if (isNew) {
      this.emit('session-added', { sessionId, data });
    }

    this.emit('session-update', { sessionId, data });

    // Update focused session (most recently active)
    const oldFocused = this.focusedSessionId;
    this.focusedSessionId = sessionId;

    if (oldFocused !== sessionId) {
      this.emit('focused-session-change', { sessionId, data });
    }

    // Legacy event forwarding for focused session
    this.emitLegacyEvents(data);
  }

  private removeSession(sessionId: string, reason: 'stale' | 'inactive' | 'evicted'): void {
    const data = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    this.sessionStaleTimestamps.delete(sessionId);

    this.emit('session-removed', { sessionId, reason });

    // Clean up bridge file for stale/evicted sessions
    if (reason === 'stale' || reason === 'evicted') {
      this.cleanupBridgeFile(sessionId);
    }

    // Update focused session if the removed session was focused
    if (this.focusedSessionId === sessionId) {
      this.focusedSessionId = this.findMostRecentSession();
      if (this.focusedSessionId) {
        const newFocused = this.sessions.get(this.focusedSessionId)!;
        this.emit('focused-session-change', { sessionId: this.focusedSessionId, data: newFocused });
        this.emitLegacyEvents(newFocused);
      } else {
        // No sessions left
        this.wasFocusedActive = false;
        this.isFocusedStale = false;
        this.emit('session-end', data ?? null);
      }
    }
  }

  private cleanupBridgeFile(sessionId: string): void {
    if (sessionId === '__legacy__') {return;}
    try {
      const filePath = path.join(this.hooksDir, `${PER_SESSION_PREFIX}${sessionId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  // ── Staleness Detection ─────────────────────────────────────────────

  private checkStaleness(): void {
    const now = Date.now();

    for (const [sessionId, data] of this.sessions) {
      const age = now - data.timestamp;

      if (age > STALENESS_MS) {
        if (!this.sessionStaleTimestamps.has(sessionId)) {
          // Mark as stale for the first time
          this.sessionStaleTimestamps.set(sessionId, now);
          this.emit('session-update', { sessionId, data }); // Trigger UI refresh

          // Emit legacy stale event if this is the focused session
          if (sessionId === this.focusedSessionId) {
            this.isFocusedStale = true;
            this.emit('session-stale', data);
          }
        } else {
          // Check if grace period has elapsed
          const staleAt = this.sessionStaleTimestamps.get(sessionId)!;
          if (now - staleAt > REMOVAL_GRACE_MS) {
            this.removeSession(sessionId, 'stale');
          }
        }
      }
    }
  }

  /** Check if a session is considered stale */
  isSessionStale(sessionId: string): boolean {
    return this.sessionStaleTimestamps.has(sessionId);
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private findOldestInactive(): string | null {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [sessionId, data] of this.sessions) {
      if (!data.session?.active && data.timestamp < oldestTime) {
        oldestTime = data.timestamp;
        oldestId = sessionId;
      }
    }
    return oldestId;
  }

  private findOldestByActivity(): string | null {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [sessionId, data] of this.sessions) {
      if (data.timestamp < oldestTime) {
        oldestTime = data.timestamp;
        oldestId = sessionId;
      }
    }
    return oldestId;
  }

  private findMostRecentSession(): string | null {
    let newestId: string | null = null;
    let newestTime = 0;

    for (const [sessionId, data] of this.sessions) {
      if (data.timestamp > newestTime) {
        newestTime = data.timestamp;
        newestId = sessionId;
      }
    }
    return newestId;
  }

  private emitLegacyEvents(data: BridgeData): void {
    const isNowActive = data.session?.active ?? false;

    if (isNowActive && !this.wasFocusedActive) {
      this.emit('session-start', data);
    } else if (!isNowActive && this.wasFocusedActive) {
      this.emit('session-end', data);
    }
    this.wasFocusedActive = isNowActive;
    this.isFocusedStale = false;

    this.emit('bridge-update', data);
  }

  private initialScan(): void {
    try {
      if (!fs.existsSync(this.hooksDir)) {return;}

      const files = fs.readdirSync(this.hooksDir);

      // Scan per-session files first
      for (const file of files) {
        if (file.startsWith(PER_SESSION_PREFIX) && file.endsWith('.json')) {
          const sessionId = file.slice(PER_SESSION_PREFIX.length, -5);
          if (!sessionId) {continue;}
          try {
            const filePath = path.join(this.hooksDir, file);
            const raw = fs.readFileSync(filePath, 'utf-8');
            const data: BridgeData = JSON.parse(raw);
            this.updateSession(sessionId, data);
          } catch {
            // Skip corrupted files
          }
        }
      }

      // Then check legacy file (if no per-session file covers it)
      const legacyPath = path.join(this.hooksDir, LEGACY_BRIDGE_NAME);
      if (fs.existsSync(legacyPath)) {
        this.onLegacyChange();
      }
    } catch {
      // Ignore scan errors
    }
  }

  // ── Dispose ─────────────────────────────────────────────────────────

  dispose(): void {
    if (this.stalenessTimer) {
      clearInterval(this.stalenessTimer);
      this.stalenessTimer = null;
    }
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    this.sessions.clear();
    this.sessionStaleTimestamps.clear();
    this.removeAllListeners();
  }
}
