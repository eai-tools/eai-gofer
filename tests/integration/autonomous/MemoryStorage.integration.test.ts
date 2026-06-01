/**
 * Integration tests for MemoryStorage - T018
 *
 * Tests lazy L2 loading performance and layered JSONL round-trips.
 * NFR-002: 10 L1 memories load in <500ms
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryStorage } from '../../../extension/src/autonomous/MemoryStorage';
import { LLMExtractor } from '../../../extension/src/autonomous/memory/LLMExtractor';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

describe('MemoryStorage Integration: Layered JSONL', () => {
  let storage: MemoryStorage;
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'gofer-test-'));
    await fs.mkdir(path.join(workspaceRoot, '.specify', 'memory'), { recursive: true });
    storage = new MemoryStorage(workspaceRoot);
    await storage.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('should persist and reload layers (abstract/overview) via JSONL', async () => {
    const extractor = new LLMExtractor();
    const content = 'Authentication pattern using JWT tokens with refresh rotation.';
    const layers = await extractor.generateLayers(content);

    await storage.append({
      category: 'api_patterns',
      tags: ['#auth', '#jwt'],
      scope: 'local',
      content,
      lastUsed: Date.now(),
      usedCount: 0,
      learnedFrom: 'feature-001',
      layers,
    });

    // Reinitialize storage from disk to verify round-trip
    const storage2 = new MemoryStorage(workspaceRoot);
    await storage2.initialize();

    const memories = storage2.getAll('local');
    expect(memories).toHaveLength(1);
    const m = memories[0];
    expect(m.layers?.abstract).toBeDefined();
    expect(m.layers?.overview).toBeDefined();
    expect(typeof m.layers?.detail).toBe('function');
    expect(await m.layers?.detail()).toBe(content);
  });

  it('should load 10 memories with L1 layers in <500ms (NFR-002)', async () => {
    const extractor = new LLMExtractor();
    const promises = Array.from({ length: 10 }, (_, i) =>
      extractor.generateLayers(`Memory content number ${i + 1} about important patterns.`)
    );
    const layersList = await Promise.all(promises);

    for (let i = 0; i < 10; i++) {
      await storage.append({
        category: 'test',
        tags: [`#item${i}`],
        scope: 'local',
        content: `Memory content number ${i + 1} about important patterns.`,
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'test',
        layers: layersList[i],
      });
    }

    // Measure reload time
    const storage2 = new MemoryStorage(workspaceRoot);
    const start = Date.now();
    await storage2.initialize();
    const elapsed = Date.now() - start;

    const memories = storage2.getAll('local');
    expect(memories).toHaveLength(10);
    expect(elapsed).toBeLessThan(500); // NFR-002: <500ms for 10 memories
    for (const m of memories) {
      expect(m.layers?.abstract).toBeDefined();
      expect(m.layers?.overview).toBeDefined();
    }
  });

  it('should fall back gracefully for pre-layered memories (backward compat)', async () => {
    // Write a legacy memory without layers to the JSONL file
    const legacyLine = JSON.stringify({
      id: 'legacy-001',
      category: 'legacy',
      tags: ['#old'],
      scope: 'local',
      content: 'Pre-layered memory content.',
      created: 1000,
      lastUsed: 1000,
      usedCount: 0,
      learnedFrom: 'legacy',
    });
    const jsonlPath = path.join(workspaceRoot, '.specify', 'memory', 'memories.jsonl');
    await fs.writeFile(jsonlPath, legacyLine + '\n', 'utf-8');

    const storage2 = new MemoryStorage(workspaceRoot);
    await storage2.initialize();

    const memories = storage2.getAll('local');
    expect(memories).toHaveLength(1);
    expect(memories[0].id).toBe('legacy-001');
    expect(memories[0].content).toBe('Pre-layered memory content.');
    // No layers - that's OK, backward compat
    expect(memories[0].layers).toBeUndefined();
  });
});
