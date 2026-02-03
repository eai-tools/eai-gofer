/**
 * Memory Consolidation and Lifecycle Management
 *
 * Handles deduplication, semantic compaction, stale detection, priority decay,
 * and archival. Inspired by Manthan Gupta's "Memory Manager" layer — the
 * background maintenance process that keeps memory stores healthy.
 *
 * "Real intelligence depends on what we choose to forget."
 *
 * @see spec.md US5: Memory Lifecycle Management
 */

import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import type { Memory, MemoryType } from './memory';
import type { MemoryStorage } from './MemoryStorage';

// ============================================================================
// Constants
// ============================================================================

/** Memories older than this with low usage are candidates for compaction */
const COMPACTION_AGE_DAYS = 7;

/** Minimum usedCount to avoid compaction */
const COMPACTION_MIN_USES = 2;

/** Keyword overlap threshold for duplicate detection (0-1) */
const DEDUP_OVERLAP_THRESHOLD = 0.8;

/** Days without use before priority decay kicks in */
const DECAY_INACTIVE_DAYS = 30;

/** Priority decay amount per consolidation cycle */
const DECAY_AMOUNT = 1;

// ============================================================================
// Types
// ============================================================================

export interface ConsolidationResult {
  /** Number of duplicate memories merged */
  merged: number;
  /** Number of old memories compacted */
  compacted: number;
  /** Number of memories flagged as stale */
  flaggedStale: number;
  /** Number of memories with decayed priority */
  decayed: number;
  /** Number of memories archived */
  archived: number;
  /** Total memories before consolidation */
  totalBefore: number;
  /** Total memories after consolidation */
  totalAfter: number;
  /** Duration in milliseconds */
  durationMs: number;
}

// ============================================================================
// MemoryConsolidator Class
// ============================================================================

export class MemoryConsolidator {
  constructor(
    private storage: MemoryStorage,
    private workspaceRoot: string
  ) {}

  /**
   * Run the full consolidation pipeline:
   * 1. Detect and merge duplicates
   * 2. Flag stale memories (cited files changed)
   * 3. Compact old low-use memories
   * 4. Apply priority decay to inactive memories
   * 5. Archive compacted/merged memories
   */
  async consolidate(): Promise<ConsolidationResult> {
    const start = Date.now();
    const allMemories = this.storage.getAll();
    const totalBefore = allMemories.length;

    let merged = 0;
    let compacted = 0;
    let flaggedStale = 0;
    let decayed = 0;
    const toArchive: string[] = [];

    // Step 1: Detect duplicates
    const duplicateGroups = this.findDuplicates(allMemories);
    for (const group of duplicateGroups) {
      if (group.length <= 1) continue;

      // Keep the highest-priority memory, archive the rest
      const sorted = [...group].sort(
        (a, b) => (b.priorityIndex ?? 0) - (a.priorityIndex ?? 0)
      );
      const keeper = sorted[0];
      const removals = sorted.slice(1);

      // Merge usage counts into the keeper
      const totalUsed = group.reduce((sum, m) => sum + (m.usedCount ?? 0), 0);
      await this.storage.update(keeper.id, {
        usedCount: totalUsed,
        lastUsed: Math.max(...group.map((m) => m.lastUsed)),
      });

      for (const dup of removals) {
        toArchive.push(dup.id);
      }
      merged += removals.length;
    }

    // Step 2: Flag stale memories (cited files changed)
    for (const memory of allMemories) {
      if (memory.citations && memory.citations.length > 0 && !memory.stale) {
        const isStale = await this.checkCitationStaleness(memory);
        if (isStale) {
          await this.storage.update(memory.id, { stale: true });
          flaggedStale++;
        }
      }
    }

    // Step 3: Compact old low-use memories
    const now = Date.now();
    const compactionAge = COMPACTION_AGE_DAYS * 24 * 60 * 60 * 1000;
    for (const memory of allMemories) {
      if (toArchive.includes(memory.id)) continue; // Already being archived

      const age = now - memory.created;
      const usage = memory.usedCount ?? 0;

      if (age > compactionAge && usage < COMPACTION_MIN_USES) {
        // Compact: truncate content to first 200 chars + "[compacted]" marker
        if (memory.content.length > 200) {
          const compactedContent =
            memory.content.substring(0, 200) + '... [compacted]';
          await this.storage.update(memory.id, {
            content: compactedContent,
            compactedFrom: memory.id,
          });
          compacted++;
        }
      }
    }

    // Step 4: Apply priority decay to inactive memories
    const decayAge = DECAY_INACTIVE_DAYS * 24 * 60 * 60 * 1000;
    for (const memory of allMemories) {
      if (toArchive.includes(memory.id)) continue;

      const timeSinceUse = now - memory.lastUsed;
      const currentPriority = memory.priorityIndex ?? 0;

      if (timeSinceUse > decayAge && currentPriority > 0) {
        const newPriority = Math.max(0, currentPriority - DECAY_AMOUNT);
        await this.storage.update(memory.id, { priorityIndex: newPriority });
        decayed++;
      }
    }

    // Step 5: Archive
    let archived = 0;
    if (toArchive.length > 0) {
      archived = await this.storage.archive(toArchive);
    }

    const totalAfter = this.storage.count();
    const durationMs = Date.now() - start;

    const result: ConsolidationResult = {
      merged,
      compacted,
      flaggedStale,
      decayed,
      archived,
      totalBefore,
      totalAfter,
      durationMs,
    };

    console.log(
      `[MemoryConsolidator] Consolidation complete:`,
      `merged=${merged}, compacted=${compacted}, stale=${flaggedStale},`,
      `decayed=${decayed}, archived=${archived},`,
      `${totalBefore} → ${totalAfter} memories in ${durationMs}ms`
    );

    return result;
  }

  // --------------------------------------------------------------------------
  // Duplicate Detection
  // --------------------------------------------------------------------------

  /**
   * Find groups of duplicate memories using keyword overlap.
   * Two memories are duplicates if their content has >80% keyword overlap.
   */
  private findDuplicates(memories: Memory[]): Memory[][] {
    const groups: Memory[][] = [];
    const assigned = new Set<string>();

    for (let i = 0; i < memories.length; i++) {
      if (assigned.has(memories[i].id)) continue;

      const group: Memory[] = [memories[i]];
      assigned.add(memories[i].id);

      for (let j = i + 1; j < memories.length; j++) {
        if (assigned.has(memories[j].id)) continue;

        const overlap = this.calculateKeywordOverlap(
          memories[i].content,
          memories[j].content
        );
        if (overlap >= DEDUP_OVERLAP_THRESHOLD) {
          group.push(memories[j]);
          assigned.add(memories[j].id);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Calculate keyword overlap between two text strings.
   * Returns 0-1 (Jaccard similarity of word sets).
   */
  private calculateKeywordOverlap(text1: string, text2: string): number {
    const words1 = new Set(
      text1
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length >= 3)
    );
    const words2 = new Set(
      text2
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length >= 3)
    );

    if (words1.size === 0 && words2.size === 0) return 1;
    if (words1.size === 0 || words2.size === 0) return 0;

    let intersection = 0;
    for (const word of words1) {
      if (words2.has(word)) intersection++;
    }

    const union = new Set([...words1, ...words2]).size;
    return intersection / union;
  }

  // --------------------------------------------------------------------------
  // Stale Detection
  // --------------------------------------------------------------------------

  /**
   * Check if a memory's code citations are stale (files changed since creation).
   */
  private async checkCitationStaleness(memory: Memory): Promise<boolean> {
    if (!memory.citations || memory.citations.length === 0) return false;

    for (const citation of memory.citations) {
      try {
        const filePath = require('path').join(this.workspaceRoot, citation.file);
        const stat = await fs.stat(filePath);
        const fileModified = stat.mtimeMs;

        // If file was modified after the memory was created, it's stale
        if (fileModified > memory.created) {
          return true;
        }

        // If a hash was stored, check if content changed
        if (citation.hash) {
          const content = await fs.readFile(filePath, 'utf-8');
          const currentHash = crypto
            .createHash('sha256')
            .update(content)
            .digest('hex')
            .substring(0, 6);
          if (currentHash !== citation.hash) {
            return true;
          }
        }
      } catch {
        // File doesn't exist anymore — definitely stale
        return true;
      }
    }

    return false;
  }
}
