/**
 * MemoryCitationTracker - Track and verify memory citations in agent reports
 * Feature 029: Memory System v2 - US-P1-01
 *
 * T040: Class definition
 * T041: trackInjectedMemories()
 * T042: verifyMemoryCitations()
 * T043: logCitationMetrics()
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ScoredMemory } from '../memory';

// ============================================================================
// Types
// ============================================================================

/**
 * Citation tracking entry - one per validation run
 */
export interface CitationTrackingEntry {
  runId: string;
  agentCategory: string;
  timestamp: number;
  injectedMemoryIds: string[];
  citedMemoryIds: string[];
  citationRate: number;
  category: string;
}

// ============================================================================
// MemoryCitationTracker
// ============================================================================

/**
 * Tracks which injected memories are cited in agent validation reports
 * and logs citation metrics for observability.
 *
 * @example
 * ```typescript
 * const tracker = new MemoryCitationTracker(workspaceRoot);
 * const runId = tracker.trackInjectedMemories(memories, 'security');
 * // ... agent runs and produces report ...
 * const rate = await tracker.verifyMemoryCitations(runId, reportContent);
 * await tracker.logCitationMetrics(runId, rate);
 * ```
 */
export class MemoryCitationTracker {
  private readonly logPath: string;
  private readonly sessions = new Map<string, CitationTrackingEntry>();
  private static readonly MAX_SESSIONS = 500;

  constructor(workspaceRoot: string) {
    this.logPath = path.join(workspaceRoot, '.specify', 'logs', 'memory-usage.jsonl');
  }

  /**
   * T041: Track injected memories for a validation run.
   *
   * @param memories - Memories injected into the agent prompt
   * @param agentCategory - Category of the validation agent
   * @returns runId for correlation with verifyMemoryCitations()
   */
  trackInjectedMemories(memories: ScoredMemory[], agentCategory: string): string {
    const runId = `${agentCategory}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: CitationTrackingEntry = {
      runId,
      agentCategory,
      timestamp: Date.now(),
      injectedMemoryIds: memories.map((m) => m.id),
      citedMemoryIds: [],
      citationRate: 0,
      category: agentCategory,
    };
    // Evict oldest entries if map exceeds limit
    if (this.sessions.size >= MemoryCitationTracker.MAX_SESSIONS) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey !== undefined) {
        this.sessions.delete(oldestKey);
      }
    }
    this.sessions.set(runId, entry);
    return runId;
  }

  /**
   * T042: Verify which injected memories were cited in the report.
   *
   * Uses pattern matching to detect memory ID references in the report content.
   * Memory IDs are 8+ character hex strings; matches both full IDs and truncated
   * 8-char prefixes (as used in formatMemories()).
   *
   * @param runId - Run ID from trackInjectedMemories()
   * @param reportContent - Agent report text to scan for citations
   * @returns Citation rate as a percentage (0-100)
   */
  verifyMemoryCitations(runId: string, reportContent: string): number {
    const entry = this.sessions.get(runId);
    if (!entry) {
      return 0;
    }

    const cited: string[] = [];
    for (const memId of entry.injectedMemoryIds) {
      // Match full ID or first 8 chars (as formatted in agent prompts)
      const prefix = memId.substring(0, 8);
      if (reportContent.includes(memId) || reportContent.includes(prefix)) {
        cited.push(memId);
      }
    }

    entry.citedMemoryIds = cited;
    entry.citationRate =
      entry.injectedMemoryIds.length > 0
        ? (cited.length / entry.injectedMemoryIds.length) * 100
        : 0;

    return entry.citationRate;
  }

  /**
   * T043: Log citation metrics to memory-usage.jsonl.
   *
   * Appends a JSONL record with per-category citation rates for observability.
   * Non-blocking: errors are caught and swallowed to avoid disrupting the pipeline.
   *
   * @param runId - Run ID from trackInjectedMemories()
   * @param citationRate - Rate from verifyMemoryCitations()
   */
  async logCitationMetrics(runId: string, citationRate: number): Promise<void> {
    const entry = this.sessions.get(runId);
    if (!entry) {
      return;
    }

    const record = {
      event: 'memory_citation',
      runId,
      agentCategory: entry.agentCategory,
      timestamp: entry.timestamp,
      injectedCount: entry.injectedMemoryIds.length,
      citedCount: entry.citedMemoryIds.length,
      citationRate: Math.round(citationRate * 100) / 100,
      citedMemoryIds: entry.citedMemoryIds,
    };

    try {
      await fs.mkdir(path.dirname(this.logPath), { recursive: true });
      await fs.appendFile(this.logPath, JSON.stringify(record) + '\n', 'utf-8');
    } catch {
      // Non-blocking: citation logging failure must not crash the pipeline
    }
  }

  /**
   * Get a session entry for testing/inspection.
   */
  getSession(runId: string): CitationTrackingEntry | undefined {
    return this.sessions.get(runId);
  }
}
