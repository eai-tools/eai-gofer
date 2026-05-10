/**
 * Unit tests for MemoryCitationTracker
 * Feature 029: Memory System v2 - T045, T046
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { MemoryCitationTracker } from '../../../extension/src/autonomous/memory/MemoryCitationTracker';
import type { ScoredMemory } from '../../../extension/src/autonomous/memory';

function makeScoredMemory(id: string, tags: string[] = ['#test']): ScoredMemory {
  return {
    id,
    category: 'security',
    tags,
    scope: 'local',
    content: 'Memory content.',
    created: Date.now(),
    lastUsed: Date.now(),
    usedCount: 1,
    learnedFrom: 'test',
    priorityScore: 70,
    combinedScore: 70,
  };
}

describe('MemoryCitationTracker', () => {
  let workspaceRoot: string;
  let tracker: MemoryCitationTracker;

  beforeEach(async () => {
    workspaceRoot = path.join(os.tmpdir(), `gofer-citation-test-${Date.now()}`);
    await fs.mkdir(path.join(workspaceRoot, '.specify', 'logs'), { recursive: true });
    tracker = new MemoryCitationTracker(workspaceRoot);
  });

  afterEach(async () => {
    try {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('T041: trackInjectedMemories()', () => {
    it('returns a unique runId for each call', () => {
      const mems = [makeScoredMemory('abc12345'), makeScoredMemory('def67890')];
      const id1 = tracker.trackInjectedMemories(mems, 'security');
      const id2 = tracker.trackInjectedMemories(mems, 'security');
      expect(id1).not.toBe(id2);
    });

    it('stores the injected memory IDs', () => {
      const mems = [makeScoredMemory('abc12345'), makeScoredMemory('def67890')];
      const runId = tracker.trackInjectedMemories(mems, 'security');
      const session = tracker.getSession(runId);
      expect(session?.injectedMemoryIds).toContain('abc12345');
      expect(session?.injectedMemoryIds).toContain('def67890');
    });

    it('records the agentCategory', () => {
      const runId = tracker.trackInjectedMemories([], 'performance');
      expect(tracker.getSession(runId)?.agentCategory).toBe('performance');
    });
  });

  describe('T042: verifyMemoryCitations()', () => {
    it('detects full memory ID citations', () => {
      const memId = 'abcdef1234567890';
      const mems = [makeScoredMemory(memId)];
      const runId = tracker.trackInjectedMemories(mems, 'security');
      const report = `The validation found that memory ${memId} covers the auth pattern correctly.`;
      const rate = tracker.verifyMemoryCitations(runId, report);
      expect(rate).toBe(100);
    });

    it('detects truncated 8-char prefix citations', () => {
      const memId = 'abcdef1234567890';
      const mems = [makeScoredMemory(memId)];
      const runId = tracker.trackInjectedMemories(mems, 'security');
      // Use only first 8 chars (as formatted in agent prompts)
      const report = `Memory: ${memId.slice(0, 8)} - covers auth pattern.`;
      const rate = tracker.verifyMemoryCitations(runId, report);
      expect(rate).toBe(100);
    });

    it('returns 0 when no memories cited', () => {
      const mems = [makeScoredMemory('abc12345'), makeScoredMemory('def67890')];
      const runId = tracker.trackInjectedMemories(mems, 'security');
      const report = 'Validation report with no memory references.';
      const rate = tracker.verifyMemoryCitations(runId, report);
      expect(rate).toBe(0);
    });

    it('calculates partial citation rate correctly', () => {
      const mems = [
        makeScoredMemory('mem-1111'),
        makeScoredMemory('mem-2222'),
        makeScoredMemory('mem-3333'),
        makeScoredMemory('mem-4444'),
      ];
      const runId = tracker.trackInjectedMemories(mems, 'correctness');
      // Cite 2 out of 4
      const report = 'Found issues related to mem-1111 and mem-2222 patterns.';
      const rate = tracker.verifyMemoryCitations(runId, report);
      expect(rate).toBe(50);
    });

    it('returns 0 for unknown runId', () => {
      const rate = tracker.verifyMemoryCitations('nonexistent-run-id', 'report');
      expect(rate).toBe(0);
    });
  });

  describe('T043: logCitationMetrics()', () => {
    it('T046: logs to memory-usage.jsonl with required fields', async () => {
      const mems = [makeScoredMemory('abc12345')];
      const runId = tracker.trackInjectedMemories(mems, 'security');
      tracker.verifyMemoryCitations(runId, 'abc12345 was cited.');
      await tracker.logCitationMetrics(runId, 100);

      const logPath = path.join(workspaceRoot, '.specify', 'logs', 'memory-usage.jsonl');
      const content = await fs.readFile(logPath, 'utf-8');
      const record = JSON.parse(content.trim()) as Record<string, unknown>;

      expect(record.event).toBe('memory_citation');
      expect(record.agentCategory).toBe('security');
      expect(record.injectedCount).toBe(1);
      expect(record.citedCount).toBe(1);
      expect(record.citationRate).toBe(100);
      expect(record.runId).toBe(runId);
    });

    it('is non-blocking on unknown runId', async () => {
      await expect(
        tracker.logCitationMetrics('nonexistent', 0)
      ).resolves.toBeUndefined();
    });
  });
});
