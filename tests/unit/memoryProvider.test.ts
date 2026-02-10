/**
 * Unit tests for MemoryProvider (rewritten)
 *
 * Tests: T030 — empty state, categories, entries, constitution node,
 * setMemoryManager injection, click to open.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Memory } from '../../extension/src/autonomous/memory';

// Mock vscode module
vi.mock('vscode', () => ({
  TreeItem: class {
    label: string;
    collapsibleState: number;
    description?: string;
    iconPath?: unknown;
    tooltip?: string;
    command?: unknown;
    contextValue?: string;
    constructor(label: string, collapsibleState: number = 0) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  ThemeIcon: class {
    id: string;
    constructor(id: string) {
      this.id = id;
    }
  },
  EventEmitter: class {
    fire = vi.fn();
    event = vi.fn();
    dispose = vi.fn();
  },
}));

import { MemoryProvider, MemoryTreeItem } from '../../extension/src/memoryProvider';

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'mem-' + Math.random().toString(36).slice(2, 8),
    category: 'discovery',
    tags: ['#test'],
    scope: 'local',
    content: 'A test memory about discovering something',
    created: Date.now() - 3600000, // 1 hour ago
    lastUsed: Date.now(),
    usedCount: 2,
    source: 'user_interaction',
    ...overrides,
  };
}

function createMockMemoryManager(memories: Memory[] = []) {
  return {
    load: vi.fn().mockResolvedValue(memories),
  };
}

describe('MemoryProvider', () => {
  let provider: MemoryProvider;

  beforeEach(() => {
    provider = new MemoryProvider('/test/workspace');
  });

  describe('empty state', () => {
    it('shows constitution and info item when no MemoryManager is set', async () => {
      const children = await provider.getChildren();
      expect(children).toHaveLength(2);
      expect(children[0].kind).toBe('constitution');
      expect(children[1].kind).toBe('info');
      expect(children[1].label).toBe('No memories stored yet');
    });

    it('shows constitution and info item when MemoryManager returns empty', async () => {
      const mockManager = createMockMemoryManager([]);
      provider.setMemoryManager(mockManager);

      const children = await provider.getChildren();
      expect(children).toHaveLength(2);
      expect(children[0].kind).toBe('constitution');
      expect(children[1].kind).toBe('info');
    });
  });

  describe('constitution node (T035)', () => {
    it('always shows constitution as first item', async () => {
      const memories = [makeMemory()];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const children = await provider.getChildren();
      expect(children[0].kind).toBe('constitution');
      expect(children[0].label).toBe('Constitution');
      expect(children[0].description).toBe('Project principles');
    });

    it('constitution has law icon', async () => {
      const children = await provider.getChildren();
      const icon = children[0].iconPath as { id: string };
      expect(icon.id).toBe('law');
    });

    it('constitution has showConstitution command', async () => {
      const children = await provider.getChildren();
      const cmd = children[0].command as { command: string };
      expect(cmd.command).toBe('gofer.showConstitution');
    });
  });

  describe('category grouping (T032)', () => {
    it('groups memories by category', async () => {
      const memories = [
        makeMemory({ category: 'discovery', content: 'Discovery 1' }),
        makeMemory({ category: 'discovery', content: 'Discovery 2' }),
        makeMemory({ category: 'pattern', content: 'Pattern 1' }),
      ];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const children = await provider.getChildren();
      // Constitution + 2 categories
      expect(children).toHaveLength(3);
      expect(children[1].kind).toBe('category');
      expect(children[2].kind).toBe('category');
    });

    it('sorts categories alphabetically', async () => {
      const memories = [
        makeMemory({ category: 'pattern' }),
        makeMemory({ category: 'debug' }),
        makeMemory({ category: 'architecture' }),
      ];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const children = await provider.getChildren();
      const categories = children.filter(c => c.kind === 'category').map(c => c.category);
      expect(categories).toEqual(['architecture', 'debug', 'pattern']);
    });

    it('shows count in category description (T033)', async () => {
      const memories = [
        makeMemory({ category: 'discovery' }),
        makeMemory({ category: 'discovery' }),
        makeMemory({ category: 'discovery' }),
      ];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const children = await provider.getChildren();
      const discoveryItem = children.find(c => c.category === 'discovery');
      expect(discoveryItem?.description).toBe('3 entries');
    });

    it('uses display names for known categories', async () => {
      const memories = [
        makeMemory({ category: 'discovery' }),
        makeMemory({ category: 'pattern' }),
        makeMemory({ category: 'decision' }),
        makeMemory({ category: 'learning' }),
        makeMemory({ category: 'journey' }),
        makeMemory({ category: 'architecture' }),
        makeMemory({ category: 'debug' }),
      ];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const children = await provider.getChildren();
      const labels = children.filter(c => c.kind === 'category').map(c => c.label);
      expect(labels).toContain('Discovery');
      expect(labels).toContain('Patterns');
      expect(labels).toContain('Decisions');
      expect(labels).toContain('Learnings');
      expect(labels).toContain('Journeys');
      expect(labels).toContain('Architecture');
      expect(labels).toContain('Debug');
    });

    it('uses "Other" for unknown categories', async () => {
      const memories = [makeMemory({ category: 'custom_thing' })];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const children = await provider.getChildren();
      const categoryItem = children.find(c => c.kind === 'category');
      expect(categoryItem?.label).toBe('Other');
    });
  });

  describe('memory entries (T034)', () => {
    it('returns memory items when expanding a category', async () => {
      const memories = [
        makeMemory({ category: 'discovery', content: 'Found interesting API pattern for authentication' }),
        makeMemory({ category: 'discovery', content: 'Discovered caching strategy in the middleware layer' }),
      ];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      // Force load
      await provider.getChildren();

      const categoryElement = { kind: 'category' as const, category: 'discovery', label: 'Discovery' };
      const entries = await provider.getChildren(categoryElement as never);

      expect(entries).toHaveLength(2);
      entries.forEach(entry => expect(entry.kind).toBe('memory'));
    });

    it('truncates content to 60 chars', async () => {
      const longContent = 'A'.repeat(100);
      const memories = [makeMemory({ category: 'pattern', content: longContent })];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      await provider.getChildren();

      const categoryElement = { kind: 'category' as const, category: 'pattern', label: 'Patterns' };
      const entries = await provider.getChildren(categoryElement as never);

      expect((entries[0].label as string).length).toBeLessThanOrEqual(60);
      expect(entries[0].label).toContain('...');
    });

    it('does not truncate short content', async () => {
      const shortContent = 'Short memory';
      const memories = [makeMemory({ category: 'debug', content: shortContent })];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      await provider.getChildren();

      const categoryElement = { kind: 'category' as const, category: 'debug', label: 'Debug' };
      const entries = await provider.getChildren(categoryElement as never);

      expect(entries[0].label).toBe('Short memory');
    });

    it('shows relative time in description', async () => {
      const memories = [makeMemory({ category: 'discovery', created: Date.now() - 3600000 })];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      await provider.getChildren();

      const categoryElement = { kind: 'category' as const, category: 'discovery', label: 'Discovery' };
      const entries = await provider.getChildren(categoryElement as never);

      expect(entries[0].description).toContain('1h ago');
    });
  });

  describe('memory entry click command (US4-AC4)', () => {
    it('sets gofer.showMemoryDocument command on memory entries', async () => {
      const memories = [makeMemory({ category: 'pattern', content: 'Test pattern' })];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      await provider.getChildren();

      const categoryElement = { kind: 'category' as const, category: 'pattern', label: 'Patterns' };
      const entries = await provider.getChildren(categoryElement as never);

      expect(entries[0].command).toBeDefined();
      expect(entries[0].command!.command).toBe('gofer.showMemoryDocument');
      expect(entries[0].command!.arguments).toHaveLength(1);
      expect(entries[0].command!.arguments![0]).toEqual(memories[0]);
    });
  });

  describe('setMemoryManager (T037)', () => {
    it('loads memories after injection', async () => {
      const memories = [makeMemory()];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      expect(mockManager.load).toHaveBeenCalled();
    });
  });

  describe('getTreeItem()', () => {
    it('returns the element itself', () => {
      const item = new MemoryTreeItem('test', 'category');
      expect(provider.getTreeItem(item)).toBe(item);
    });
  });
});
