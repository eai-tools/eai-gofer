/**
 * Unit tests for MemoryLayerManager
 *
 * Validates the three-layer memory architecture (core, recall, archival)
 * and verifies that constitution is NOT loaded as a core memory.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MemoryLayerManager,
  type MemoryManagerLike,
  type MemoryItem,
} from '../../../extension/src/autonomous/MemoryLayerManager';

// Mock the Logger
vi.mock('../../../extension/src/utils/logger', () => ({
  Logger: {
    for: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

function makeMemoryItem(overrides: Partial<MemoryItem> = {}): MemoryItem {
  return {
    id: 'mem-' + Math.random().toString(36).slice(2, 8),
    content: 'Test memory content',
    category: 'task_context',
    tags: ['#test'],
    created: Date.now() - 3600000,
    lastUsed: Date.now(),
    usedCount: 1,
    ...overrides,
  };
}

function createMockMemoryManager(
  searchResults: MemoryItem[] = [],
  priorityResults: MemoryItem[] = []
): MemoryManagerLike {
  return {
    search: vi.fn().mockResolvedValue({ memories: searchResults }),
    loadByPriority: vi.fn().mockResolvedValue({ memories: priorityResults }),
  };
}

describe('MemoryLayerManager', () => {
  let manager: MemoryLayerManager;

  beforeEach(() => {
    manager = new MemoryLayerManager('/test/workspace');
  });

  describe('getCoreMemory', () => {
    it('should return empty core when no memory manager set', async () => {
      const result = await manager.getCoreMemory();
      expect(result.layer).toBe('core');
      expect(result.memories).toHaveLength(0);
      expect(result.tokenEstimate).toBe(0);
    });

    it('should load core memories by configured tags', async () => {
      const coreMemory = makeMemoryItem({ tags: ['#task-context'], category: 'task_context' });
      const mockMM = createMockMemoryManager([coreMemory]);
      manager.setMemoryManager(mockMM);

      const result = await manager.getCoreMemory();

      expect(mockMM.search).toHaveBeenCalled();
      expect(result.layer).toBe('core');
    });

    it('should NOT include constitution as a core memory item', async () => {
      const taskMemory = makeMemoryItem({ id: 'core:task', tags: ['#task-context'] });
      const mockMM = createMockMemoryManager([taskMemory]);
      manager.setMemoryManager(mockMM);

      const result = await manager.getCoreMemory();

      // No memory should have id 'core:constitution'
      const constitutionItem = result.memories.find((m) => m.id === 'core:constitution');
      expect(constitutionItem).toBeUndefined();

      // No memory should have category 'constitution'
      const constitutionCat = result.memories.find((m) => m.category === 'constitution');
      expect(constitutionCat).toBeUndefined();
    });

    it('should not have constitution in default coreTags or coreCategories', () => {
      // Verify the default config does not include constitution
      const mgr = new MemoryLayerManager('/test');
      // Access internal config indirectly through behavior:
      // constitution tag should not trigger a search
      const mockMM = createMockMemoryManager([]);
      mgr.setMemoryManager(mockMM);

      mgr.getCoreMemory();

      // The search calls should NOT include '#constitution' tag
      const searchCalls = (mockMM.search as ReturnType<typeof vi.fn>).mock.calls;
      const searchedTags = searchCalls.map(
        (call: unknown[]) => (call[0] as { tags: string[] }).tags[0]
      );
      expect(searchedTags).not.toContain('#constitution');
    });

    it('should deduplicate memories across tag searches', async () => {
      const sharedMemory = makeMemoryItem({ id: 'shared-1', tags: ['#task-context', '#core'] });
      const mockMM = createMockMemoryManager([sharedMemory]);
      manager.setMemoryManager(mockMM);

      const result = await manager.getCoreMemory();

      // Even though the same memory matches multiple tags, it should appear only once
      const ids = result.memories.map((m) => m.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('getRecallMemory', () => {
    it('should return empty recall when no memory manager set', async () => {
      const result = await manager.getRecallMemory();
      expect(result.layer).toBe('recall');
      expect(result.memories).toHaveLength(0);
    });

    it('should filter by recency window', async () => {
      const recentMemory = makeMemoryItem({ lastUsed: Date.now() });
      const oldMemory = makeMemoryItem({ lastUsed: Date.now() - 2 * 60 * 60 * 1000 }); // 2 hours ago
      const mockMM = createMockMemoryManager([], [recentMemory, oldMemory]);
      manager.setMemoryManager(mockMM);

      const result = await manager.getRecallMemory();

      // Only the recent memory should be included (default window is 1 hour)
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].id).toBe(recentMemory.id);
    });
  });

  describe('searchArchival', () => {
    it('should return empty archival when no memory manager set', async () => {
      const result = await manager.searchArchival('test query');
      expect(result.layer).toBe('archival');
      expect(result.memories).toHaveLength(0);
    });

    it('should search by keywords', async () => {
      const memory = makeMemoryItem({ content: 'Authentication pattern' });
      const mockMM = createMockMemoryManager([memory]);
      manager.setMemoryManager(mockMM);

      const result = await manager.searchArchival('authentication');

      expect(mockMM.search).toHaveBeenCalledWith({ keywords: 'authentication' });
      expect(result.memories).toHaveLength(1);
    });
  });
});
