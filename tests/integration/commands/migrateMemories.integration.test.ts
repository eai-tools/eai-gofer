/**
 * Integration tests for migrateMemories command - T025, T026
 * Feature 029: Memory System v2
 *
 * Tests:
 * - T025: Migration command migrates pre-layered memories
 * - T026: Backward compatibility - pre-layered memories load via detail tier
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { MemoryManager } from '../../../extension/src/autonomous/MemoryManager';
import { MemoryStorage } from '../../../extension/src/autonomous/MemoryStorage';

// Minimal mock vscode context
const mockContext = {
  globalState: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: () => undefined as any,
    update: async () => undefined,
  },
  subscriptions: [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('Migration Integration: migrateToLayered()', () => {
  let workspaceRoot: string;
  let manager: MemoryManager;

  beforeEach(async () => {
    workspaceRoot = path.join(os.tmpdir(), `gofer-migrate-test-${Date.now()}`);
    await fs.mkdir(path.join(workspaceRoot, '.specify', 'memory'), { recursive: true });
    manager = new MemoryManager(mockContext, workspaceRoot);
  });

  afterEach(async () => {
    try {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('T025: migrates pre-layered memories and adds abstract/overview', async () => {
    // Write pre-layered memories directly to JSONL
    const jsonlPath = path.join(workspaceRoot, '.specify', 'memory', 'memories.jsonl');
    const preLegacyMemories = [
      {
        id: 'pre-001',
        category: 'api_patterns',
        tags: ['#auth'],
        scope: 'local',
        content: 'Use JWT for authentication.',
        created: 1000,
        lastUsed: 1000,
        usedCount: 2,
        learnedFrom: 'feature-001',
      },
      {
        id: 'pre-002',
        category: 'security',
        tags: ['#security'],
        scope: 'local',
        content: 'Always validate input before processing.',
        created: 2000,
        lastUsed: 2000,
        usedCount: 0,
        learnedFrom: 'feature-002',
      },
    ];
    await fs.writeFile(
      jsonlPath,
      preLegacyMemories.map((m) => JSON.stringify(m)).join('\n') + '\n',
      'utf-8'
    );

    await manager.initializeStorage();

    // After initializeStorage, migration should have run
    const storage = manager.getStorage();
    const memories = storage.getAll('local');

    expect(memories).toHaveLength(2);
    for (const m of memories) {
      expect(m.layers).toBeDefined();
      expect(m.layers?.abstract).toBeDefined();
      expect(m.layers?.overview).toBeDefined();
      expect(typeof m.layers?.detail).toBe('function');
    }
  });

  it('T025: migrateToLayered() returns count of migrated memories', async () => {
    // Initialize with storage but no pre-existing memories
    await manager.initializeStorage();

    // Save memory without layers
    await manager.save({
      category: 'test',
      tags: ['#test'],
      scope: 'local',
      content: 'Test memory for migration.',
      lastUsed: Date.now(),
      usedCount: 0,
      learnedFrom: 'test',
    });

    // Clear layers by accessing raw storage
    const storage = manager.getStorage();
    const all = storage.getAll('local');
    // Remove layers so it needs migration
    await storage.update(all[0].id, { layers: undefined });

    const count = await manager.migrateToLayered();
    expect(count).toBe(1);
  });

  it('T025: migrateToLayered() skips already-layered memories', async () => {
    await manager.initializeStorage();

    // Save memory with layers already
    const extractor = await import(
      '../../../extension/src/autonomous/memory/LLMExtractor'
    ).then((m) => new m.LLMExtractor());
    const layers = await extractor.generateLayers('Already layered content.');
    await manager.save({
      category: 'test',
      tags: ['#test'],
      scope: 'local',
      content: 'Already layered content.',
      lastUsed: Date.now(),
      usedCount: 0,
      learnedFrom: 'test',
      layers,
    });

    const count = await manager.migrateToLayered();
    expect(count).toBe(0);
  });

  it('T026: pre-layered memories load via detail tier (backward compatibility)', async () => {
    const jsonlPath = path.join(workspaceRoot, '.specify', 'memory', 'memories.jsonl');
    const legacyMemory = {
      id: 'legacy-bw-001',
      category: 'legacy',
      tags: ['#old'],
      scope: 'local',
      content: 'Legacy memory content without any layer fields.',
      created: 1000,
      lastUsed: 1000,
      usedCount: 0,
      learnedFrom: 'old-feature',
    };
    await fs.writeFile(jsonlPath, JSON.stringify(legacyMemory) + '\n', 'utf-8');

    // Use MemoryStorage directly without migration to test raw backward compat
    const storage = new MemoryStorage(workspaceRoot);
    await storage.initialize();

    const memories = storage.getAll('local');
    expect(memories).toHaveLength(1);
    // Content is always accessible as detail tier
    expect(memories[0].content).toBe('Legacy memory content without any layer fields.');
  });
});
