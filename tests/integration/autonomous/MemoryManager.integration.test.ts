/**
 * Integration tests for MemoryManager.loadByURI() - T021
 *
 * Tests URI-based loading with all layer levels.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { MemoryManager } from '../../../extension/src/autonomous/MemoryManager';
import { LLMExtractor } from '../../../extension/src/autonomous/memory/LLMExtractor';
import type { Memory } from '../../../extension/src/autonomous/memory';

// Mock VSCode module
const mockContext = {
  globalState: {
    get: vi.fn().mockReturnValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  },
  subscriptions: [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('MemoryManager Integration: loadByURI()', () => {
  let manager: MemoryManager;
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = path.join(os.tmpdir(), `gofer-mm-test-${Date.now()}`);
    await fs.mkdir(path.join(workspaceRoot, '.specify', 'memory'), { recursive: true });
    manager = new MemoryManager(mockContext, workspaceRoot);
    await manager.initializeStorage();
  });

  afterEach(async () => {
    try {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  async function saveMemoryWithLayers(
    mgr: MemoryManager,
    content: string,
    category: string
  ): Promise<Memory> {
    const extractor = new LLMExtractor();
    const layers = await extractor.generateLayers(content);
    return mgr.save({
      category,
      tags: [`#${category}`],
      scope: 'local',
      content,
      lastUsed: Date.now(),
      usedCount: 0,
      learnedFrom: 'test-feature',
      layers,
    });
  }

  it('should return empty array for specs scope', async () => {
    const memories = await manager.loadByURI('gofer://specs/029-memory-system-v2/spec.md');
    expect(memories).toEqual([]);
  });

  it('should return empty array for agent scope', async () => {
    const memories = await manager.loadByURI('gofer://agent/validation-security.md');
    expect(memories).toEqual([]);
  });

  it('should load all local memories for memory scope', async () => {
    await saveMemoryWithLayers(manager, 'First memory content', 'patterns');
    await saveMemoryWithLayers(manager, 'Second memory content', 'lessons');

    const memories = await manager.loadByURI('gofer://memory/all', 'detail');
    expect(memories.length).toBe(2);
  });

  it('should filter by abstract layer - only return memories with abstract', async () => {
    // Memory with layers
    await saveMemoryWithLayers(manager, 'Layered memory content', 'patterns');
    // Memory without layers
    await manager.save({
      category: 'raw',
      tags: ['#raw'],
      scope: 'local',
      content: 'Raw memory without layers',
      lastUsed: Date.now(),
      usedCount: 0,
      learnedFrom: 'test',
    });

    const abstractMemories = await manager.loadByURI('gofer://memory/test', 'abstract');
    // Only layered memory should be returned
    expect(abstractMemories.every((m) => m.layers?.abstract !== undefined)).toBe(true);
  });

  it('should return all memories for detail layer (backward compat)', async () => {
    await saveMemoryWithLayers(manager, 'Content 1', 'patterns');
    await manager.save({
      category: 'raw',
      tags: ['#raw'],
      scope: 'local',
      content: 'Raw content without layers',
      lastUsed: Date.now(),
      usedCount: 0,
      learnedFrom: 'test',
    });

    const all = await manager.loadByURI('gofer://memory/any', 'detail');
    expect(all.length).toBe(2);
  });

  it('should filter session scope by learnedFrom path', async () => {
    await manager.save({
      category: 'patterns',
      tags: ['#auth'],
      scope: 'local',
      content: 'Feature 029 pattern',
      lastUsed: Date.now(),
      usedCount: 0,
      learnedFrom: '029-memory-system-v2',
    });
    await manager.save({
      category: 'patterns',
      tags: ['#other'],
      scope: 'local',
      content: 'Feature 028 pattern',
      lastUsed: Date.now(),
      usedCount: 0,
      learnedFrom: '028-cross-platform',
    });

    const sessionMemories = await manager.loadByURI(
      'gofer://session/029-memory-system-v2',
      'detail'
    );
    expect(sessionMemories).toHaveLength(1);
    expect(sessionMemories[0].content).toBe('Feature 029 pattern');
  });
});
