import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryConsolidator } from '../../../extension/src/autonomous/MemoryConsolidator';
import { MemoryStorage } from '../../../extension/src/autonomous/MemoryStorage';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('MemoryConsolidator', () => {
  let storage: MemoryStorage;
  let consolidator: MemoryConsolidator;
  const mockWorkspace = '/test/workspace';

  beforeEach(() => {
    storage = new MemoryStorage(mockWorkspace);
    consolidator = new MemoryConsolidator(storage, mockWorkspace);
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('');
    vi.mocked(fs.appendFile).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);
  });

  describe('consolidate', () => {
    it('should return zero counts for empty storage', async () => {
      await storage.initialize();
      const result = await consolidator.consolidate();

      expect(result.merged).toBe(0);
      expect(result.compacted).toBe(0);
      expect(result.flaggedStale).toBe(0);
      expect(result.decayed).toBe(0);
      expect(result.archived).toBe(0);
      expect(result.totalBefore).toBe(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should merge duplicate memories (>80% keyword overlap)', async () => {
      const now = Date.now();
      const memories = [
        `{"id":"d1","category":"api","tags":["#test"],"scope":"local","content":"Use async await for all API calls in the service layer","created":${now},"lastUsed":${now},"usedCount":3,"learnedFrom":"t","priorityIndex":5}`,
        `{"id":"d2","category":"api","tags":["#test"],"scope":"local","content":"Use async await for all API calls in the service layer module","created":${now},"lastUsed":${now},"usedCount":1,"learnedFrom":"t","priorityIndex":2}`,
        `{"id":"d3","category":"pattern","tags":["#other"],"scope":"local","content":"Completely different content about error handling","created":${now},"lastUsed":${now},"usedCount":0,"learnedFrom":"t","priorityIndex":1}`,
      ];

      vi.mocked(fs.readFile).mockResolvedValue(memories.join('\n') + '\n');
      await storage.initialize();

      const result = await consolidator.consolidate();

      // d1 and d2 are duplicates (same content basically), d3 is unique
      expect(result.merged).toBeGreaterThanOrEqual(1);
      expect(result.totalBefore).toBe(3);
    });

    it('should compact old low-use memories', async () => {
      const oldDate = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
      const longContent = 'A'.repeat(300); // Over 200 chars
      const memories = [
        `{"id":"old1","category":"test","tags":[],"scope":"local","content":"${longContent}","created":${oldDate},"lastUsed":${oldDate},"usedCount":0,"learnedFrom":"t"}`,
      ];

      vi.mocked(fs.readFile).mockResolvedValue(memories.join('\n') + '\n');
      await storage.initialize();

      const result = await consolidator.consolidate();

      expect(result.compacted).toBe(1);
    });

    it('should apply priority decay to inactive memories', async () => {
      const oldLastUsed = Date.now() - 45 * 24 * 60 * 60 * 1000; // 45 days ago
      const memories = [
        `{"id":"decay1","category":"test","tags":[],"scope":"local","content":"Test content","created":${oldLastUsed},"lastUsed":${oldLastUsed},"usedCount":5,"learnedFrom":"t","priorityIndex":3}`,
      ];

      vi.mocked(fs.readFile).mockResolvedValue(memories.join('\n') + '\n');
      await storage.initialize();

      const result = await consolidator.consolidate();

      expect(result.decayed).toBe(1);
    });

    it('should flag stale memories when cited files are missing', async () => {
      const now = Date.now();
      const memories = [
        `{"id":"stale1","category":"test","tags":[],"scope":"local","content":"About auth","created":${now - 1000},"lastUsed":${now},"usedCount":1,"learnedFrom":"t","citations":[{"file":"src/auth.ts"}]}`,
      ];

      vi.mocked(fs.readFile).mockResolvedValue(memories.join('\n') + '\n');
      // Make fs.stat throw (file doesn't exist)
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

      await storage.initialize();

      const result = await consolidator.consolidate();

      expect(result.flaggedStale).toBe(1);
    });

    it('should not decay memories with zero priority', async () => {
      const oldLastUsed = Date.now() - 45 * 24 * 60 * 60 * 1000;
      const memories = [
        `{"id":"nodecay","category":"test","tags":[],"scope":"local","content":"Test","created":${oldLastUsed},"lastUsed":${oldLastUsed},"usedCount":1,"learnedFrom":"t","priorityIndex":0}`,
      ];

      vi.mocked(fs.readFile).mockResolvedValue(memories.join('\n') + '\n');
      await storage.initialize();

      const result = await consolidator.consolidate();

      expect(result.decayed).toBe(0);
    });

    it('should include conflictsResolved in result', async () => {
      await storage.initialize();
      const result = await consolidator.consolidate();

      expect(result.conflictsResolved).toBe(0);
    });
  });

  describe('conflict detection', () => {
    it('should detect conflicts with medium overlap (0.5-0.8) and shared tags', async () => {
      const now = Date.now();
      // Two memories about similar topic but different enough (50-80% overlap)
      // They share the #auth tag, making them conflicts
      const memories = [
        `{"id":"c1","category":"api","tags":["#auth","#security"],"scope":"local","content":"Use JWT tokens for authentication in the API service layer with refresh tokens","created":${now - 10000},"lastUsed":${now},"usedCount":2,"learnedFrom":"t","priorityIndex":3}`,
        `{"id":"c2","category":"api","tags":["#auth"],"scope":"local","content":"Use session cookies for authentication in the API service layer instead of tokens","created":${now},"lastUsed":${now},"usedCount":1,"learnedFrom":"t","priorityIndex":2}`,
      ];

      vi.mocked(fs.readFile).mockResolvedValue(memories.join('\n') + '\n');
      await storage.initialize();

      const result = await consolidator.consolidate();

      expect(result.conflictsResolved).toBe(1);
    });

    it('should archive older memory with supersededBy field on conflict', async () => {
      const now = Date.now();
      const memories = [
        `{"id":"old-mem","category":"pattern","tags":["#config"],"scope":"local","content":"Use YAML configuration files for all service settings and environment config","created":${now - 20000},"lastUsed":${now},"usedCount":2,"learnedFrom":"t","priorityIndex":3}`,
        `{"id":"new-mem","category":"pattern","tags":["#config"],"scope":"local","content":"Use JSON configuration files for all service settings and environment variables","created":${now},"lastUsed":${now},"usedCount":1,"learnedFrom":"t","priorityIndex":2}`,
      ];

      vi.mocked(fs.readFile).mockResolvedValue(memories.join('\n') + '\n');
      await storage.initialize();

      const updateSpy = vi.spyOn(storage, 'update');
      await consolidator.consolidate();

      // Verify that old-mem was updated with supersededBy pointing to new-mem
      const supersededCall = updateSpy.mock.calls.find(
        (call) =>
          call[0] === 'old-mem' && (call[1] as Record<string, unknown>).supersededBy === 'new-mem'
      );
      expect(supersededCall).toBeDefined();
    });

    it('should not detect conflict when tags do not overlap', async () => {
      const now = Date.now();
      // Medium keyword overlap but NO shared tags → not a conflict
      const memories = [
        `{"id":"no-tag1","category":"api","tags":["#frontend"],"scope":"local","content":"Use async await for all API calls in the service modules","created":${now - 10000},"lastUsed":${now},"usedCount":1,"learnedFrom":"t"}`,
        `{"id":"no-tag2","category":"api","tags":["#backend"],"scope":"local","content":"Use async await for all API calls in the controller layer","created":${now},"lastUsed":${now},"usedCount":1,"learnedFrom":"t"}`,
      ];

      vi.mocked(fs.readFile).mockResolvedValue(memories.join('\n') + '\n');
      await storage.initialize();

      const result = await consolidator.consolidate();

      expect(result.conflictsResolved).toBe(0);
    });

    it('should not detect conflict when overlap is above dedup threshold (>=0.8)', async () => {
      const now = Date.now();
      // These are near-duplicates (>80% overlap) — handled by dedup, not conflict
      const memories = [
        `{"id":"dup1","category":"api","tags":["#test"],"scope":"local","content":"Use async await for all API calls in the service layer","created":${now - 10000},"lastUsed":${now},"usedCount":3,"learnedFrom":"t","priorityIndex":5}`,
        `{"id":"dup2","category":"api","tags":["#test"],"scope":"local","content":"Use async await for all API calls in the service layer module","created":${now},"lastUsed":${now},"usedCount":1,"learnedFrom":"t","priorityIndex":2}`,
      ];

      vi.mocked(fs.readFile).mockResolvedValue(memories.join('\n') + '\n');
      await storage.initialize();

      const result = await consolidator.consolidate();

      // Should be handled by dedup (merged), not conflict
      expect(result.conflictsResolved).toBe(0);
      expect(result.merged).toBeGreaterThanOrEqual(1);
    });
  });
});
