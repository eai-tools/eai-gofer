/**
 * Integration Tests for Memory Persistence
 *
 * Tests memory persistence across VSCode restarts and sessions.
 * Uses actual file system and globalState mock.
 *
 * T050: Write integration test for memory persistence across VSCode restart
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import { MemoryManager } from '../../extension/src/autonomous/MemoryManager';
import type { Memory } from '../../extension/src/autonomous/memory';

// Unmock fs for this integration test (needs real file system)
vi.unmock('fs');
vi.unmock('fs/promises');

// Import fs after unmocking
import * as fs from 'fs';

// Mock VSCode extension context
const mockGlobalState = new Map<string, unknown>();
const mockContext = {
  globalState: {
    get: vi.fn((key: string) => mockGlobalState.get(key)),
    update: vi.fn((key: string, value: unknown) => {
      mockGlobalState.set(key, value);
      return Promise.resolve();
    }),
  },
  subscriptions: [],
  extensionUri: { fsPath: '/mock/extension' } as any,
  extensionPath: '/mock/extension',
  storagePath: '/mock/storage',
  globalStoragePath: '/mock/global-storage',
  logPath: '/mock/logs',
  extensionMode: 3,
  secrets: {} as any,
  storageUri: undefined,
  globalStorageUri: undefined,
  logUri: undefined,
  environmentVariableCollection: {} as any,
  asAbsolutePath: (relativePath: string) => `/mock/extension/${relativePath}`,
  extension: {} as any,
} as any;

describe('Memory Integration Tests', () => {
  const testWorkspaceRoot = path.join(__dirname, 'test-workspace-integration');
  let memoryManager: MemoryManager;

  beforeEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true });
    }
    fs.mkdirSync(testWorkspaceRoot, { recursive: true });

    // Clear global state mock
    mockGlobalState.clear();
    vi.clearAllMocks();

    // Create memory manager
    memoryManager = new MemoryManager(mockContext, testWorkspaceRoot);
  });

  afterEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true });
    }
  });

  describe('Local Memory Persistence', () => {
    it('should persist local memories to file system', async () => {
      // Save a local memory
      const saved = await memoryManager.save({
        category: 'testing',
        tags: ['#vitest', '#integration'],
        scope: 'local',
        content: 'Use Vitest for all integration tests',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'integration_test',
      });

      expect(saved.id).toBeDefined();

      // Verify file was created
      const localMemoryPath = path.join(testWorkspaceRoot, '.specify', 'memory', 'local.json');
      expect(fs.existsSync(localMemoryPath)).toBe(true);

      // Read file directly
      const fileContent = fs.readFileSync(localMemoryPath, 'utf-8');
      const parsed = JSON.parse(fileContent);

      expect(parsed.version).toBe(1);
      expect(parsed.memories).toHaveLength(1);
      expect(parsed.memories[0].id).toBe(saved.id);
      expect(parsed.memories[0].content).toBe(saved.content);
    });

    it('should load local memories from file system (simulating restart)', async () => {
      // First session: save memories
      const memory1 = await memoryManager.save({
        category: 'api_patterns',
        tags: ['#rest'],
        scope: 'local',
        content: 'Use RESTful conventions',
        lastUsed: Date.now(),
        usedCount: 5,
        learnedFrom: 'user_interaction',
      });

      const memory2 = await memoryManager.save({
        category: 'testing',
        tags: ['#unit'],
        scope: 'local',
        content: 'Write unit tests first',
        lastUsed: Date.now(),
        usedCount: 3,
        learnedFrom: 'pattern_detection',
      });

      // Simulate VSCode restart by creating a new MemoryManager instance
      const memoryManagerAfterRestart = new MemoryManager(mockContext, testWorkspaceRoot);

      // Load memories in new session
      const loaded = await memoryManagerAfterRestart.load('local');

      // Verify both memories were persisted and loaded
      expect(loaded).toHaveLength(2);

      const loadedMemory1 = loaded.find((m) => m.id === memory1.id);
      const loadedMemory2 = loaded.find((m) => m.id === memory2.id);

      expect(loadedMemory1).toBeDefined();
      expect(loadedMemory1?.content).toBe(memory1.content);
      expect(loadedMemory1?.usedCount).toBe(5);

      expect(loadedMemory2).toBeDefined();
      expect(loadedMemory2?.content).toBe(memory2.content);
      expect(loadedMemory2?.usedCount).toBe(3);
    });

    it('should handle file corruption gracefully', async () => {
      // Create corrupted file
      const localMemoryPath = path.join(testWorkspaceRoot, '.specify', 'memory', 'local.json');

      fs.mkdirSync(path.dirname(localMemoryPath), { recursive: true });
      fs.writeFileSync(localMemoryPath, 'invalid json {{{');

      // Should throw error with validation message
      await expect(memoryManager.load('local')).rejects.toThrow();
    });

    it('should preserve memory metadata across sessions', async () => {
      // Save memory with specific timestamps
      const createdTime = Date.now() - 86400000; // 1 day ago
      const lastUsedTime = Date.now() - 3600000; // 1 hour ago

      await memoryManager.save({
        category: 'preferences',
        tags: ['#style'],
        scope: 'local',
        content: 'Use tabs for indentation',
        lastUsed: lastUsedTime,
        usedCount: 10,
        learnedFrom: 'user_interaction',
      });

      // Simulate restart
      const memoryManagerAfterRestart = new MemoryManager(mockContext, testWorkspaceRoot);

      const loaded = await memoryManagerAfterRestart.load('local');
      expect(loaded).toHaveLength(1);

      const memory = loaded[0];
      expect(memory.usedCount).toBe(10);
      expect(memory.lastUsed).toBe(lastUsedTime);
      expect(memory.category).toBe('preferences');
      expect(memory.tags).toEqual(['#style']);
      expect(memory.learnedFrom).toBe('user_interaction');
    });
  });

  describe('Global Memory Persistence', () => {
    it('should persist global memories to VSCode globalState', async () => {
      // Save a global memory
      const saved = await memoryManager.save({
        category: 'coding_standards',
        tags: ['#typescript', '#global'],
        scope: 'global',
        content: 'Always use explicit return types',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'user_interaction',
      });

      expect(saved.id).toBeDefined();

      // Verify globalState was updated
      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'gofer.memories',
        expect.objectContaining({
          version: 1,
          memories: expect.arrayContaining([
            expect.objectContaining({
              id: saved.id,
              content: saved.content,
            }),
          ]),
        })
      );

      // Verify data is in mock
      const storedData = mockGlobalState.get('gofer.memories') as any;
      expect(storedData).toBeDefined();
      expect(storedData.memories).toHaveLength(1);
      expect(storedData.memories[0].id).toBe(saved.id);
    });

    it('should load global memories from globalState (simulating restart)', async () => {
      // First session: save memories
      await memoryManager.save({
        category: 'global_preference',
        tags: ['#formatting'],
        scope: 'global',
        content: 'Use Prettier for code formatting',
        lastUsed: Date.now(),
        usedCount: 15,
        learnedFrom: 'user_interaction',
      });

      await memoryManager.save({
        category: 'global_tool',
        tags: ['#testing'],
        scope: 'global',
        content: 'Prefer Vitest over Jest',
        lastUsed: Date.now(),
        usedCount: 8,
        learnedFrom: 'pattern_detection',
      });

      // Simulate VSCode restart with same globalState
      const memoryManagerAfterRestart = new MemoryManager(mockContext, testWorkspaceRoot);

      // Load memories in new session
      const loaded = await memoryManagerAfterRestart.load('global');

      // Verify both memories were persisted and loaded
      expect(loaded).toHaveLength(2);
      expect(loaded[0].usedCount).toBeGreaterThan(0);
      expect(loaded[1].usedCount).toBeGreaterThan(0);
    });
  });

  describe('Mixed Scope Persistence', () => {
    it('should persist both local and global memories independently', async () => {
      // Save local memory
      const localMemory = await memoryManager.save({
        category: 'local_pref',
        tags: ['#local'],
        scope: 'local',
        content: 'Local preference',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'test',
      });

      // Save global memory
      const globalMemory = await memoryManager.save({
        category: 'global_pref',
        tags: ['#global'],
        scope: 'global',
        content: 'Global preference',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'test',
      });

      // Simulate restart
      const memoryManagerAfterRestart = new MemoryManager(mockContext, testWorkspaceRoot);

      // Load both scopes
      const allMemories = await memoryManagerAfterRestart.load('both');

      expect(allMemories).toHaveLength(2);

      const loadedLocal = allMemories.find((m) => m.id === localMemory.id);
      const loadedGlobal = allMemories.find((m) => m.id === globalMemory.id);

      expect(loadedLocal).toBeDefined();
      expect(loadedLocal?.scope).toBe('local');

      expect(loadedGlobal).toBeDefined();
      expect(loadedGlobal?.scope).toBe('global');
    });

    it('should maintain separate storage for local and global', async () => {
      // Save to both scopes
      await memoryManager.save({
        category: 'test',
        tags: ['#test'],
        scope: 'local',
        content: 'Local content',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'test',
      });

      await memoryManager.save({
        category: 'test',
        tags: ['#test'],
        scope: 'global',
        content: 'Global content',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'test',
      });

      // Clear only local
      await memoryManager.clear('local');

      // Verify local is empty but global remains
      const local = await memoryManager.load('local');
      const global = await memoryManager.load('global');

      expect(local).toHaveLength(0);
      expect(global).toHaveLength(1);
      expect(global[0].content).toBe('Global content');
    });
  });

  describe('Usage Tracking Persistence', () => {
    it('should persist usage statistics across sessions', async () => {
      // Session 1: Save and use memory multiple times
      const saved = await memoryManager.save({
        category: 'test',
        tags: ['#test'],
        scope: 'local',
        content: 'Test memory',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: 'test',
      });

      await memoryManager.recordUsage(saved.id);
      await memoryManager.recordUsage(saved.id);
      await memoryManager.recordUsage(saved.id);

      // Verify usage count
      const loaded1 = await memoryManager.load('local');
      expect(loaded1[0].usedCount).toBe(3);

      // Session 2: Simulate restart and continue using
      const memoryManagerAfterRestart = new MemoryManager(mockContext, testWorkspaceRoot);

      // Add small delay to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 2));
      await memoryManagerAfterRestart.recordUsage(saved.id);
      await memoryManagerAfterRestart.recordUsage(saved.id);

      // Verify cumulative usage
      const loaded2 = await memoryManagerAfterRestart.load('local');
      expect(loaded2[0].usedCount).toBe(5);
      expect(loaded2[0].lastUsed).toBeGreaterThanOrEqual(saved.lastUsed);
    });
  });
});
