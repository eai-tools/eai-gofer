/**
 * WorkspaceContextProvider
 *
 * Supplies real token usage data to ContextHealthMonitor.
 * When a ClaudeSessionReader is available, uses actual JSONL session data.
 * Falls back to filesystem estimation when no session is active.
 *
 * Spec 013 Phase 2 (T012-T015), Spec 014 Phase 2 (T015-T019)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ContextAnalysisInput, TokenBreakdown } from './ContextHealthMonitor';
import type { MemoryManager } from './MemoryManager';
import type { ClaudeSessionReader, SessionUsage } from './ClaudeSessionReader';
import type { HookBridgeWatcher, BridgeData } from './HookBridgeWatcher';

/** Pipeline stages that can be detected from spec artifact state */
type GoferStage = 'research' | 'specify' | 'plan' | 'tasks' | 'implement' | 'validate' | 'unknown';

/** Data source for the context analysis */
export type DataSource = 'real' | 'estimated' | 'none';

/** Extended context analysis with data source and session metadata */
export interface EnhancedContextAnalysis extends ContextAnalysisInput {
  /** Source of the data: real session, filesystem estimate, or none */
  dataSource: DataSource;
  /** Model context limit when real data is available */
  modelContextLimit?: number;
  /** Model ID from the active session */
  model?: string;
  /** Session ID from the active session */
  sessionId?: string;
  /** Session age in milliseconds */
  sessionAge?: number;
  /** Number of API calls in the session (approximated from JSONL) */
  apiCallCount?: number;
}

export class WorkspaceContextProvider {
  private workspacePath: string;
  private memoryManager?: MemoryManager;
  private specifyDir: string;
  private sessionReader?: ClaudeSessionReader;
  private hookBridgeWatcher?: HookBridgeWatcher;

  constructor(workspacePath: string, memoryManager?: MemoryManager) {
    this.workspacePath = workspacePath;
    this.memoryManager = memoryManager;
    this.specifyDir = path.join(workspacePath, '.specify');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Session Reader (T015)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Sets the session reader for real context data (Priority 2 fallback).
   *
   * @param reader - ClaudeSessionReader instance
   */
  setSessionReader(reader: ClaudeSessionReader): void {
    this.sessionReader = reader;
  }

  /**
   * Sets the hook bridge watcher for event-driven context data (Priority 1).
   *
   * @param watcher - HookBridgeWatcher instance
   */
  setHookBridgeWatcher(watcher: HookBridgeWatcher): void {
    this.hookBridgeWatcher = watcher;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Context Analysis (T016-T018)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Returns current context analysis for health monitoring.
   *
   * Priority chain:
   * 1. HookBridgeWatcher data (event-driven, most current)
   * 2. ClaudeSessionReader (polling fallback — kept for no-hooks case)
   * 3. Filesystem estimation (no session at all)
   *
   * @returns Enhanced context analysis with data source info
   */
  getContextAnalysis(): EnhancedContextAnalysis {
    const stage = this.detectCurrentStage();

    // Priority 1: Hook bridge data (real-time, event-driven)
    if (this.hookBridgeWatcher?.isHookDataAvailable()) {
      const bridgeData = this.hookBridgeWatcher.getLatestData();
      if (bridgeData?.context) {
        return this.buildBridgeAnalysis(bridgeData, stage);
      }
      // Bridge exists but no context data yet — session just started
      if (bridgeData?.session?.active) {
        const breakdown = this.estimateTokenBreakdown();
        return {
          breakdown,
          stage,
          dataSource: 'none',
          sessionId: bridgeData.sessionId,
          model: bridgeData.model,
        };
      }
    }

    // Priority 2: Real session data via ClaudeSessionReader (T017)
    if (this.sessionReader) {
      try {
        const usage = this.sessionReader.getLatestUsage();
        if (usage) {
          return this.buildRealAnalysis(usage, stage);
        }
      } catch {
        // Fall through to estimation (T018)
      }
    }

    // Priority 3: Filesystem estimation (T018)
    const breakdown = this.estimateTokenBreakdown();

    // If we have a session reader but no data, it means no active session
    if (this.sessionReader) {
      return {
        breakdown,
        stage,
        dataSource: 'none',
      };
    }

    return {
      breakdown,
      stage,
      dataSource: 'estimated',
    };
  }

  /**
   * Builds analysis from real session usage data (ClaudeSessionReader).
   */
  private buildRealAnalysis(usage: SessionUsage, stage: GoferStage): EnhancedContextAnalysis {
    const modelContextLimit = this.sessionReader!.getModelContextLimit(usage.model);

    // For real data, the conversation tokens IS the total context tokens
    const breakdown: Partial<TokenBreakdown> = {
      conversation: usage.totalContextTokens,
      specArtifacts: 0,
      memories: 0,
      hints: 0,
      observations: 0,
      systemFiles: 0,
    };

    // Try to get session info for metadata
    const sessionInfo = this.sessionReader!.findActiveSession();

    return {
      breakdown,
      stage,
      dataSource: 'real',
      modelContextLimit,
      model: usage.model,
      sessionId: sessionInfo?.sessionId,
    };
  }

  /**
   * Builds analysis from hook bridge data (event-driven, Priority 1).
   */
  private buildBridgeAnalysis(data: BridgeData, stage: GoferStage): EnhancedContextAnalysis {
    const ctx = data.context!;

    const breakdown: Partial<TokenBreakdown> = {
      conversation: ctx.totalContextTokens,
      specArtifacts: 0,
      memories: 0,
      hints: 0,
      observations: 0,
      systemFiles: 0,
    };

    return {
      breakdown,
      stage,
      dataSource: 'real',
      modelContextLimit: ctx.contextLimit,
      model: data.model,
      sessionId: data.sessionId,
    };
  }

  /**
   * Estimate token counts per category by scanning workspace files.
   * Uses chars/4 approximation consistent with the rest of the codebase.
   */
  estimateTokenBreakdown(): Partial<TokenBreakdown> {
    const specArtifacts = this.estimateSpecArtifactTokens();
    const memories = this.estimateMemoryTokens();
    const hints = this.estimateHintTokens();
    const systemFiles = this.estimateSystemFileTokens();
    const observations = this.estimateObservationTokens();

    return {
      specArtifacts,
      memories,
      hints,
      observations,
      systemFiles,
      conversation: 0, // Cannot estimate conversation from filesystem
    };
  }

  /**
   * Detect the active Gofer pipeline stage from spec artifact state.
   * Checks the most recently modified spec directory.
   */
  detectCurrentStage(): GoferStage {
    // T069: Check current-stage.json first — if fresh (<30 min), use it
    try {
      const stageFile = path.join(this.specifyDir, 'memory', 'current-stage.json');
      if (fs.existsSync(stageFile)) {
        const raw = fs.readFileSync(stageFile, 'utf-8');
        const data = JSON.parse(raw);
        const STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes
        if (data.timestamp && Date.now() - data.timestamp < STALE_THRESHOLD) {
          const validStages = ['research', 'specify', 'plan', 'tasks', 'implement', 'validate'];
          if (validStages.includes(data.stage)) {
            return data.stage as GoferStage;
          }
        }
      }
    } catch {
      // Fall through to heuristic detection
    }

    try {
      const specsDir = path.join(this.specifyDir, 'specs');
      if (!fs.existsSync(specsDir)) {
        return 'unknown';
      }

      const specDirs = fs
        .readdirSync(specsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => ({
          name: d.name,
          mtime: this.getLatestMtime(path.join(specsDir, d.name)),
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (specDirs.length === 0) {
        return 'unknown';
      }

      const activeSpecDir = path.join(specsDir, specDirs[0].name);
      return this.detectStageFromArtifacts(activeSpecDir);
    } catch {
      return 'unknown';
    }
  }

  /** Estimate tokens from spec artifacts in the active spec directory */
  private estimateSpecArtifactTokens(): number {
    try {
      const specsDir = path.join(this.specifyDir, 'specs');
      if (!fs.existsSync(specsDir)) {
        return 0;
      }

      let totalBytes = 0;
      const specDirs = fs
        .readdirSync(specsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory());

      for (const dir of specDirs) {
        const dirPath = path.join(specsDir, dir.name);
        totalBytes += this.sumFileSizes(dirPath, ['.md', '.json', '.yaml', '.yml']);
      }

      return Math.ceil(totalBytes / 4);
    } catch {
      return 0;
    }
  }

  /** Estimate tokens from loaded memories */
  private estimateMemoryTokens(): number {
    try {
      const localPath = path.join(this.specifyDir, 'memory', 'local.json');
      if (!fs.existsSync(localPath)) {
        return 0;
      }
      const stat = fs.statSync(localPath);
      return Math.ceil(stat.size / 4);
    } catch {
      return 0;
    }
  }

  /** Estimate tokens from hint files */
  private estimateHintTokens(): number {
    try {
      const hintsDir = path.join(this.specifyDir, 'hints');
      if (!fs.existsSync(hintsDir)) {
        return 0;
      }
      return Math.ceil(this.sumFileSizes(hintsDir, ['.md', '.txt']) / 4);
    } catch {
      return 0;
    }
  }

  /** Estimate tokens from system files (CLAUDE.md, AGENTS.md, constitution.md) */
  private estimateSystemFileTokens(): number {
    const systemFiles = [
      path.join(this.workspacePath, 'CLAUDE.md'),
      path.join(this.workspacePath, 'AGENTS.md'),
      path.join(this.specifyDir, 'memory', 'constitution.md'),
    ];

    let totalBytes = 0;
    for (const filePath of systemFiles) {
      try {
        if (fs.existsSync(filePath)) {
          totalBytes += fs.statSync(filePath).size;
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return Math.ceil(totalBytes / 4);
  }

  /** Estimate tokens from observation cache */
  private estimateObservationTokens(): number {
    try {
      const cacheDir = path.join(this.specifyDir, 'memory', 'observation-cache');
      if (!fs.existsSync(cacheDir)) {
        return 0;
      }
      return Math.ceil(this.sumFileSizes(cacheDir, ['.json']) / 4);
    } catch {
      return 0;
    }
  }

  /** Sum file sizes in a directory for given extensions */
  private sumFileSizes(dirPath: string, extensions: string[]): number {
    let total = 0;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
          try {
            total += fs.statSync(fullPath).size;
          } catch {
            // Skip unreadable files
          }
        } else if (entry.isDirectory()) {
          total += this.sumFileSizes(fullPath, extensions);
        }
      }
    } catch {
      // Skip unreadable directories
    }
    return total;
  }

  /** Get the latest modification time of any file in a directory */
  private getLatestMtime(dirPath: string): number {
    let latest = 0;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs > latest) {
            latest = stat.mtimeMs;
          }
        } catch {
          // Skip unreadable entries
        }
      }
    } catch {
      // Return 0 for unreadable directories
    }
    return latest;
  }

  /** Detect pipeline stage from which artifacts exist in a spec directory */
  private detectStageFromArtifacts(specDir: string): GoferStage {
    // T035: Validate file content (size > 100 bytes, contains expected heading), not just existence
    const hasValidFile = (name: string, heading?: string): boolean => {
      const filePath = path.join(specDir, name);
      try {
        const stat = fs.statSync(filePath);
        if (stat.size < 100) { return false; }
        if (heading) {
          const content = fs.readFileSync(filePath, 'utf-8').slice(0, 500);
          return content.includes(heading);
        }
        return true;
      } catch {
        return false;
      }
    };

    // Check from most advanced stage backward
    if (hasValidFile('validation-report.md')) {
      return 'validate';
    }
    if (hasValidFile('tasks.md', '# Tasks')) {
      // Check if tasks are being executed (any [X] marks)
      try {
        const content = fs.readFileSync(path.join(specDir, 'tasks.md'), 'utf-8');
        if (content.includes('- [X]') || content.includes('- [x]')) {
          return 'implement';
        }
      } catch {
        // Fall through
      }
      return 'tasks';
    }
    if (hasValidFile('plan.md', '# ')) {
      return 'plan';
    }
    if (hasValidFile('spec.md', '# ')) {
      return 'specify';
    }
    if (hasValidFile('research.md', '# ')) {
      return 'research';
    }

    return 'unknown';
  }
}
