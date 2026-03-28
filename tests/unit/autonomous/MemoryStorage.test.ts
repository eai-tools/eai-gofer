import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryStorage } from '../../../extension/src/autonomous/MemoryStorage';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('MemoryStorage', () => {
  let storage: MemoryStorage;
  const mockWorkspace = '/test/workspace';

  beforeEach(() => {
    storage = new MemoryStorage(mockWorkspace);
    vi.clearAllMocks();

    // Default: JSONL file doesn't exist yet, no legacy file
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.appendFile).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);
  });

  describe('initialize', () => {
    it('should create memory directory on initialize', async () => {
      await storage.initialize();
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.specify/memory'),
        { recursive: true }
      );
    });

    it('should handle empty state gracefully', async () => {
      await storage.initialize();
      expect(storage.count()).toBe(0);
    });

    it('should migrate from legacy local.json if JSONL missing', async () => {
      const legacyData = {
        version: 1,
        memories: [
          {
            id: 'legacy-1',
            category: 'test',
            tags: ['#test'],
            scope: 'local' as const,
            content: 'Legacy memory',
            created: 1000,
            lastUsed: 1000,
            usedCount: 0,
            learnedFrom: 'test',
          },
        ],
      };

      // JSONL doesn't exist, legacy does
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const fp = String(filePath);
        if (fp.includes('local.json')) {
          return JSON.stringify(legacyData);
        }
        // After migration, JSONL should contain the migrated memory
        if (fp.includes('memories.jsonl')) {
          return JSON.stringify(legacyData.memories[0]) + '\n';
        }
        throw new Error('ENOENT');
      });

      await storage.initialize();

      // Should have written the JSONL file
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('memories.jsonl'),
        expect.stringContaining('legacy-1'),
        'utf-8'
      );
    });

    it('should rebuild index from existing JSONL', async () => {
      const memory1 = {
        id: 'mem-1',
        category: 'test',
        tags: ['#test'],
        scope: 'local',
        content: 'First memory',
        created: 1000,
        lastUsed: 1000,
        usedCount: 1,
        learnedFrom: 'test',
      };
      const memory2 = {
        id: 'mem-2',
        category: 'pattern',
        tags: ['#auto'],
        scope: 'local',
        content: 'Second memory',
        created: 2000,
        lastUsed: 2000,
        usedCount: 0,
        learnedFrom: 'test',
      };

      // JSONL exists
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify(memory1) + '\n' + JSON.stringify(memory2) + '\n'
      );

      await storage.initialize();
      expect(storage.count()).toBe(2);
      expect(storage.get('mem-1')).toBeTruthy();
      expect(storage.get('mem-2')).toBeTruthy();
    });

    it('should skip invalid JSONL lines without crashing', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(
        '{"id":"good","category":"test","tags":[],"scope":"local","content":"ok","created":1,"lastUsed":1,"usedCount":0,"learnedFrom":"t"}\n' +
        'INVALID JSON LINE\n' +
        '{"id":"good2","category":"test","tags":[],"scope":"local","content":"ok2","created":2,"lastUsed":2,"usedCount":0,"learnedFrom":"t"}\n'
      );

      await storage.initialize();
      expect(storage.count()).toBe(2);
    });
  });

  describe('append', () => {
    it('should generate hash-based ID and append to JSONL', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('');

      await storage.initialize();

      const memory = await storage.append({
        category: 'test',
        tags: ['#test'],
        scope: 'local' as const,
        content: 'Test memory content',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'test',
      });

      expect(memory.id).toHaveLength(8);
      expect(memory.created).toBeGreaterThan(0);
      expect(fs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('memories.jsonl'),
        expect.stringContaining(memory.id),
        'utf-8'
      );
    });

    it('should update in-memory index after append', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('');
      await storage.initialize();

      const memory = await storage.append({
        category: 'test',
        tags: ['#test'],
        scope: 'local' as const,
        content: 'Indexed memory',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'test',
      });

      expect(storage.get(memory.id)).toEqual(memory);
      expect(storage.count()).toBe(1);
    });
  });

  describe('update', () => {
    it('should append updated version with same ID', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(
        '{"id":"upd-1","category":"test","tags":[],"scope":"local","content":"original","created":1000,"lastUsed":1000,"usedCount":0,"learnedFrom":"t"}\n'
      );
      await storage.initialize();

      const updated = await storage.update('upd-1', { content: 'modified', usedCount: 5 });

      expect(updated?.content).toBe('modified');
      expect(updated?.usedCount).toBe(5);
      expect(updated?.id).toBe('upd-1');
    });

    it('should return null for non-existent ID', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('');
      await storage.initialize();

      const result = await storage.update('nonexistent', { content: 'nope' });
      expect(result).toBeNull();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      const memories = [
        '{"id":"q1","type":"procedural","category":"api_pattern","tags":["#auto","#typescript"],"scope":"local","content":"Use async/await for API calls","created":1000,"lastUsed":3000,"usedCount":5,"learnedFrom":"spec-1","priorityIndex":3}',
        '{"id":"q2","type":"episodic","category":"error_fix","tags":["#auto","#react"],"scope":"local","content":"Fixed memory leak in useEffect","created":2000,"lastUsed":2000,"usedCount":1,"learnedFrom":"spec-2","priorityIndex":1}',
        '{"id":"q3","type":"procedural","category":"api_pattern","tags":["#manual"],"scope":"global","content":"REST API endpoint structure","created":500,"lastUsed":4000,"usedCount":10,"learnedFrom":"user","priorityIndex":5}',
      ];

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(memories.join('\n') + '\n');
      await storage.initialize();
    });

    it('should filter by memory type', () => {
      const results = storage.query({ type: 'procedural' });
      expect(results).toHaveLength(2);
      expect(results.every((m) => m.type === 'procedural')).toBe(true);
    });

    it('should filter by category', () => {
      const results = storage.query({ category: 'error_fix' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('q2');
    });

    it('should filter by tags (OR logic)', () => {
      const results = storage.query({ tags: ['#typescript', '#react'] });
      expect(results).toHaveLength(2);
    });

    it('should filter by keywords', () => {
      const results = storage.query({ keywords: 'memory leak' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('q2');
    });

    it('should filter by scope', () => {
      const results = storage.query({ scope: 'global' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('q3');
    });

    it('should sort by priority index', () => {
      const results = storage.query({ sortByPriority: true });
      expect(results[0].id).toBe('q3'); // priorityIndex: 5
      expect(results[1].id).toBe('q1'); // priorityIndex: 3
      expect(results[2].id).toBe('q2'); // priorityIndex: 1
    });

    it('should combine multiple filters', () => {
      const results = storage.query({
        type: 'procedural',
        scope: 'local',
        sortByPriority: true,
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('q1');
    });
  });

  describe('archive', () => {
    it('should move memories from active to archive JSONL', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(
        '{"id":"arc-1","category":"test","tags":[],"scope":"local","content":"to archive","created":1000,"lastUsed":1000,"usedCount":0,"learnedFrom":"t"}\n' +
        '{"id":"arc-2","category":"test","tags":[],"scope":"local","content":"keep this","created":2000,"lastUsed":2000,"usedCount":0,"learnedFrom":"t"}\n'
      );
      await storage.initialize();

      const archived = await storage.archive(['arc-1']);

      expect(archived).toBe(1);
      expect(storage.count()).toBe(1);
      expect(storage.get('arc-1')).toBeNull();
      expect(storage.get('arc-2')).toBeTruthy();

      // Should have written to archive JSONL
      expect(fs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('archive.jsonl'),
        expect.stringContaining('arc-1'),
        'utf-8'
      );
    });
  });

  describe('compact', () => {
    it('should rewrite JSONL with only active memories, excluding tombstoned entries', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(
        '{"id":"c1","category":"test","tags":[],"scope":"local","content":"keep","created":1000,"lastUsed":1000,"usedCount":0,"learnedFrom":"t"}\n' +
        '{"id":"c1","_deleted":true}\n' +
        '{"id":"c2","category":"test","tags":[],"scope":"local","content":"active","created":2000,"lastUsed":2000,"usedCount":0,"learnedFrom":"t"}\n'
      );
      await storage.initialize();

      // After rebuildIndex: c1 is tombstoned (deleted from index), c2 is active
      // compact() should write only c2's data — tombstone removes c1 from the index
      let writtenContent = '';
      vi.mocked(fs.writeFile).mockImplementation(async (_path, data) => {
        writtenContent = data as string;
      });

      await storage.compact();

      // Verify atomic write pattern
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.any(String),
        'utf-8'
      );
      expect(fs.rename).toHaveBeenCalled();

      // Verify c1 is excluded (tombstoned) and c2 is included
      const writtenLines = writtenContent.split('\n').filter((l) => l.trim().length > 0);
      const writtenIds = writtenLines.map((l) => (JSON.parse(l) as { id: string }).id);
      expect(writtenIds).not.toContain('c1');
      expect(writtenIds).toContain('c2');
    });
  });
});
