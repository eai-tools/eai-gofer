/**
 * Unit tests for MemoryStorage layered JSONL schema
 * Feature 029: Memory System v2 - T011
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryStorage } from '../../../src/autonomous/MemoryStorage';
import type { Memory } from '../../../src/autonomous/memory';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MemoryStorage - Layered JSONL Schema', () => {
  let storage: MemoryStorage;
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gofer-test-'));
    storage = new MemoryStorage(testDir);
    await storage.initialize();
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Layered Memory Serialization', () => {
    it('should save memory with layers to JSONL with flat fields', async () => {
      const memory: Omit<Memory, 'id' | 'created'> = {
        content: 'Full authentication implementation details',
        category: 'auth',
        tags: ['#jwt', '#security'],
        scope: 'local',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'user_interaction',
        layers: {
          abstract: 'JWT auth with 15min expiry',
          overview: 'Uses refresh token rotation with HttpOnly cookies',
          detail: async () => 'Full implementation details...',
        },
      };

      const saved = await storage.append(memory);

      // Read JSONL file directly to verify flat fields
      const jsonlPath = path.join(testDir, '.specify/memory/memories.jsonl');
      const content = await fs.readFile(jsonlPath, 'utf-8');
      const parsed = JSON.parse(content.trim());

      expect(parsed._layerAbstract).toBe('JWT auth with 15min expiry');
      expect(parsed._layerOverview).toBe('Uses refresh token rotation with HttpOnly cookies');
      expect(parsed.layers).toBeUndefined(); // layers object not serialized
      expect(saved.id).toBeDefined();
    });

    it('should load memory with layers from JSONL flat fields', async () => {
      // Write JSONL with flat layer fields directly
      const jsonlPath = path.join(testDir, '.specify/memory/memories.jsonl');
      await fs.mkdir(path.dirname(jsonlPath), { recursive: true });
      
      const jsonlEntry = {
        id: 'test-123',
        content: 'Full content',
        category: 'pattern',
        tags: ['#test'],
        scope: 'local',
        created: Date.now(),
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'test',
        _layerAbstract: 'Test abstract',
        _layerOverview: 'Test overview with details',
      };
      
      await fs.writeFile(jsonlPath, JSON.stringify(jsonlEntry) + '\n', 'utf-8');

      // Reinitialize to load from JSONL
      storage = new MemoryStorage(testDir);
      await storage.initialize();

      const memories = storage.query({});
      expect(memories).toHaveLength(1);
      
      const loaded = memories[0];
      expect(loaded.layers).toBeDefined();
      expect(loaded.layers?.abstract).toBe('Test abstract');
      expect(loaded.layers?.overview).toBe('Test overview with details');
      expect(loaded.layers?.detail).toBeDefined();
      
      // Verify detail function works
      const detail = await loaded.layers!.detail();
      expect(detail).toBe('Full content'); // Falls back to content
    });

    it('should handle backward compatibility with old memories without layers', async () => {
      // Write old-format JSONL without layer fields
      const jsonlPath = path.join(testDir, '.specify/memory/memories.jsonl');
      await fs.mkdir(path.dirname(jsonlPath), { recursive: true });
      
      const oldEntry = {
        id: 'old-123',
        content: 'Old memory content',
        category: 'legacy',
        tags: [],
        scope: 'local',
        created: Date.now(),
        lastUsed: Date.now(),
        usedCount: 5,
        learnedFrom: 'legacy',
      };
      
      await fs.writeFile(jsonlPath, JSON.stringify(oldEntry) + '\n', 'utf-8');

      // Reinitialize to load from JSONL
      storage = new MemoryStorage(testDir);
      await storage.initialize();

      const memories = storage.query({});
      expect(memories).toHaveLength(1);
      
      const loaded = memories[0];
      expect(loaded.layers).toBeUndefined(); // No layers for old memories
      expect(loaded.content).toBe('Old memory content');
      expect(loaded.usedCount).toBe(5);
    });

    it('should handle mixed workspace with old and new memories', async () => {
      const jsonlPath = path.join(testDir, '.specify/memory/memories.jsonl');
      await fs.mkdir(path.dirname(jsonlPath), { recursive: true });
      
      const oldMemory = {
        id: 'old-1',
        content: 'Old memory',
        category: 'old',
        tags: [],
        scope: 'local',
        created: Date.now(),
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'legacy',
      };
      
      const newMemory = {
        id: 'new-1',
        content: 'New memory',
        category: 'new',
        tags: ['#test'],
        scope: 'local',
        created: Date.now(),
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'test',
        _layerAbstract: 'New abstract',
        _layerOverview: 'New overview',
      };
      
      const jsonl = JSON.stringify(oldMemory) + '\n' + JSON.stringify(newMemory) + '\n';
      await fs.writeFile(jsonlPath, jsonl, 'utf-8');

      storage = new MemoryStorage(testDir);
      await storage.initialize();

      const memories = storage.query({});
      expect(memories).toHaveLength(2);
      
      const old = memories.find(m => m.id === 'old-1');
      const newer = memories.find(m => m.id === 'new-1');
      
      expect(old?.layers).toBeUndefined();
      expect(newer?.layers).toBeDefined();
      expect(newer?.layers?.abstract).toBe('New abstract');
    });

    it('should preserve layers through update operations', async () => {
      const memory: Omit<Memory, 'id' | 'created'> = {
        content: 'Original content',
        category: 'test',
        tags: [],
        scope: 'local',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'test',
        layers: {
          abstract: 'Original abstract',
          overview: 'Original overview',
          detail: async () => 'Original detail',
        },
      };

      const saved = await storage.append(memory);
      
      // Update the memory
      const updated = await storage.update(saved.id, {
        content: 'Updated content',
        layers: {
          abstract: 'Updated abstract',
          overview: 'Updated overview',
          detail: async () => 'Updated detail',
        },
      });

      expect(updated).not.toBeNull();
      expect(updated?.layers?.abstract).toBe('Updated abstract');
      expect(updated?.layers?.overview).toBe('Updated overview');
      
      // Reload from disk to verify persistence
      storage = new MemoryStorage(testDir);
      await storage.initialize();
      
      const memories = storage.query({});
      const reloaded = memories.find(m => m.id === saved.id);
      
      expect(reloaded?.layers?.abstract).toBe('Updated abstract');
      expect(reloaded?.layers?.overview).toBe('Updated overview');
    });
  });

  describe('Detail Function Fallback', () => {
    it('should fallback detail function to content field', async () => {
      const memory: Omit<Memory, 'id' | 'created'> = {
        content: 'Content to fall back to',
        category: 'test',
        tags: [],
        scope: 'local',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'test',
        layers: {
          abstract: 'Abstract',
          overview: 'Overview',
          detail: async () => 'This will be lost on serialization',
        },
      };

      await storage.append(memory);
      
      // Reload to get deserialized version
      storage = new MemoryStorage(testDir);
      await storage.initialize();
      
      const memories = storage.query({});
      const loaded = memories[0];
      
      const detail = await loaded.layers!.detail();
      expect(detail).toBe('Content to fall back to');
    });
  });
});
