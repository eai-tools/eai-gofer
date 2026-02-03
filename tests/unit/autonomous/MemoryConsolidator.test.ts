import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryConsolidator } from '../../../extension/src/autonomous/MemoryConsolidator';
import { MemoryStorage } from '../../../extension/src/autonomous/MemoryStorage';
import type { Memory } from '../../../extension/src/autonomous/memory';
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
  });
});
