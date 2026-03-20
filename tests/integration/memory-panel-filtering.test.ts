/**
 * Integration tests for Memory Panel filtering end-to-end flow
 * Feature 001: Memory Panel Usability Fix
 *
 * Tests T015 from tasks.md:
 * - MemoryManager.search() respects excludeSystemMemories flag end-to-end
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryManager } from '../../extension/src/autonomous/MemoryManager';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Memory Panel Filtering - Integration', () => {
  let testDir: string;
  let memoryManager: MemoryManager;

  beforeEach(async () => {
    // Create temporary test directory with fixture data
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'memory-filter-integration-'));

    // Copy fixture to temp directory
    const fixtureSource = path.join(__dirname, '../fixtures/.specify/memory/memories.jsonl');
    const fixtureDest = path.join(testDir, '.specify', 'memory', 'memories.jsonl');
    await fs.mkdir(path.dirname(fixtureDest), { recursive: true });
    await fs.copyFile(fixtureSource, fixtureDest);

    // Mock VSCode ExtensionContext
    const mockContext: unknown = {
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        setKeysForSync: () => {},
      },
      extensionUri: { fsPath: testDir },
      extensionPath: testDir,
      storagePath: testDir,
      globalStoragePath: testDir,
      logPath: testDir,
    };

    // Initialize MemoryManager with test directory
    memoryManager = new MemoryManager(mockContext as never, testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // T015: Integration test for excludeSystemMemories flag
  it('should filter system memories end-to-end via MemoryManager.search()', async () => {
    // Arrange: MemoryManager initialized with fixture containing 10 user + 10 system memories
    // (setup in beforeEach)

    // Act: Call manager.search() with excludeSystemMemories: true
    const result = await memoryManager.search({
      excludeSystemMemories: true,
      scope: 'local',
    });

    // Assert: SearchResult contains only user memories
    expect(result.memories).toHaveLength(10);
    result.memories.forEach((memory) => {
      expect(memory.tags).not.toContain('#auto');
    });
    expect(result.count).toBe(10);
  });

  it('should include all memories when excludeSystemMemories is false', async () => {
    // Arrange: Same setup

    // Act: Call search with excludeSystemMemories: false
    const result = await memoryManager.search({
      excludeSystemMemories: false,
      scope: 'local',
    });

    // Assert: SearchResult contains all 20 memories
    expect(result.memories).toHaveLength(20);
    expect(result.count).toBe(20);
  });

  it('should default to including all memories when flag is undefined', async () => {
    // Arrange: Same setup

    // Act: Call search without the flag
    const result = await memoryManager.search({
      scope: 'local',
    });

    // Assert: SearchResult contains all 20 memories (backward compatibility)
    expect(result.memories).toHaveLength(20);
    expect(result.count).toBe(20);
  });
});
