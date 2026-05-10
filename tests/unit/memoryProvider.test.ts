/**
 * Unit tests for MemoryProvider (rewritten)
 *
 * Tests: T030 — empty state, sections, categories, entries,
 * setMemoryManager injection, click to open.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
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
  Uri: {
    file: (p: string) => ({ fsPath: p, scheme: 'file' }),
  },
}));

// Mock fs module for file-system dependent sections
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue(''),
  readdirSync: vi.fn().mockReturnValue([]),
  statSync: vi.fn().mockReturnValue({ size: 0 }),
  existsSync: vi.fn().mockReturnValue(false),
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
    learnedFrom: 'user_interaction',
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

  describe('root sections', () => {
    it('shows 3 top-level items: Constitution, Decisions, and Memories', async () => {
      const children = await provider.getChildren();
      expect(children).toHaveLength(3);
      expect(children[0].label).toBe('Constitution');
      expect(children[1].label).toBe('Decisions');
      expect(children[2].label).toBe('Memories');
    });

    it('root items include one file item and two section items', async () => {
      const children = await provider.getChildren();
      expect(children[0].kind).toBe('file-item');
      expect(children[1].kind).toBe('section');
      expect(children[2].kind).toBe('section');
    });

    it('opens constitution through the editable memory document command', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const children = await provider.getChildren();
      expect(children[0].command).toEqual({
        command: 'gofer.showMemoryDocument',
        title: 'Open Constitution',
        arguments: [{ path: '/test/workspace/.specify/memory/constitution.md' }],
      });
    });

    it('Memories section shows entry count', async () => {
      const memories = [makeMemory(), makeMemory()];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const children = await provider.getChildren();
      const memoriesItem = children.find((c) => c.label === 'Memories');
      expect(memoriesItem?.description).toBe('2 entries');
    });

    it('Memories section is expanded when entries exist', async () => {
      const memories = [makeMemory()];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const children = await provider.getChildren();
      const memoriesItem = children.find((c) => c.label === 'Memories');
      expect(memoriesItem?.collapsibleState).toBe(2); // Expanded
    });

    it('Memories section is non-collapsible when empty', async () => {
      const children = await provider.getChildren();
      const memoriesItem = children.find((c) => c.label === 'Memories');
      expect(memoriesItem?.collapsibleState).toBe(0); // None
    });
  });

  describe('memory category grouping', () => {
    it('groups memories by category under Memories section', async () => {
      const memories = [
        makeMemory({ category: 'discovery', content: 'Discovery 1' }),
        makeMemory({ category: 'discovery', content: 'Discovery 2' }),
        makeMemory({ category: 'pattern', content: 'Pattern 1' }),
      ];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      // Get root items
      const root = await provider.getChildren();
      const memoriesSection = root.find((c) => c.section === 'memories');

      // Get children of Memories section
      const categories = await provider.getChildren(memoriesSection as never);
      expect(categories).toHaveLength(2);
      expect(categories[0].kind).toBe('category');
      expect(categories[1].kind).toBe('category');
    });

    it('sorts categories alphabetically', async () => {
      const memories = [
        makeMemory({ category: 'pattern' }),
        makeMemory({ category: 'debug' }),
        makeMemory({ category: 'architecture' }),
      ];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const root = await provider.getChildren();
      const memoriesSection = root.find((c) => c.section === 'memories');
      const categories = await provider.getChildren(memoriesSection as never);
      const catNames = categories.map((c) => c.category);
      expect(catNames).toEqual(['architecture', 'debug', 'pattern']);
    });

    it('shows count in category description', async () => {
      const memories = [
        makeMemory({ category: 'discovery' }),
        makeMemory({ category: 'discovery' }),
        makeMemory({ category: 'discovery' }),
      ];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const root = await provider.getChildren();
      const memoriesSection = root.find((c) => c.section === 'memories');
      const categories = await provider.getChildren(memoriesSection as never);
      const discoveryItem = categories.find((c) => c.category === 'discovery');
      expect(discoveryItem?.description).toBe('3');
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

      const root = await provider.getChildren();
      const memoriesSection = root.find((c) => c.section === 'memories');
      const categories = await provider.getChildren(memoriesSection as never);
      const labels = categories.map((c) => c.label);
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

      const root = await provider.getChildren();
      const memoriesSection = root.find((c) => c.section === 'memories');
      const categories = await provider.getChildren(memoriesSection as never);
      const categoryItem = categories.find((c) => c.kind === 'category');
      expect(categoryItem?.label).toBe('Other');
    });

    it('shows info when no memories exist', async () => {
      const mockManager = createMockMemoryManager([]);
      provider.setMemoryManager(mockManager);

      const root = await provider.getChildren();
      const memoriesSection = root.find((c) => c.section === 'memories');
      const children = await provider.getChildren(memoriesSection as never);
      expect(children).toHaveLength(1);
      expect(children[0].kind).toBe('info');
      expect(children[0].label).toBe('No user memories stored yet');
    });

    it('filters out system memories tagged with #auto', async () => {
      const memories = [
        makeMemory({ category: 'pattern', content: 'User memory', tags: ['#user'] }),
        makeMemory({
          category: 'auto_decision',
          content: 'System memory',
          tags: ['#auto', '#loading_decision'],
        }),
      ];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const root = await provider.getChildren();
      const memoriesItem = root.find((c) => c.label === 'Memories');
      expect(memoriesItem?.description).toBe('1 entries');

      const memoriesSection = root.find((c) => c.section === 'memories');
      const categories = await provider.getChildren(memoriesSection as never);
      expect(categories).toHaveLength(1);
      expect(categories[0].category).toBe('pattern');
    });

    it('shows empty state when only system memories exist', async () => {
      const memories = [
        makeMemory({
          category: 'auto_decision',
          content: 'System memory',
          tags: ['#auto', '#loading_decision'],
        }),
      ];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const root = await provider.getChildren();
      const memoriesItem = root.find((c) => c.label === 'Memories');
      expect(memoriesItem?.description).toBe('0 entries');

      const memoriesSection = root.find((c) => c.section === 'memories');
      const children = await provider.getChildren(memoriesSection as never);
      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('No user memories stored yet');
    });

    it('shows only repo-local human memories in the sidebar tree', async () => {
      const memories = [
        makeMemory({ category: 'pattern', content: 'Repo memory', scope: 'local', tags: ['#user'] }),
        makeMemory({ category: 'pattern', content: 'Cross-repo memory', scope: 'global', tags: ['#user'] }),
        makeMemory({
          category: 'error_resolution',
          content: 'Auto-learned repo memory',
          scope: 'local',
          tags: ['#auto-learned', '#error-fix'],
        }),
      ];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      const root = await provider.getChildren();
      const memoriesItem = root.find((c) => c.label === 'Memories');
      expect(memoriesItem?.description).toBe('1 entries');

      const memoriesSection = root.find((c) => c.section === 'memories');
      const categories = await provider.getChildren(memoriesSection as never);
      expect(categories).toHaveLength(1);
      expect(categories[0].category).toBe('pattern');
    });
  });

  describe('memory entries', () => {
    it('returns memory items when expanding a category', async () => {
      const memories = [
        makeMemory({
          category: 'discovery',
          content: 'Found interesting API pattern for authentication',
        }),
        makeMemory({
          category: 'discovery',
          content: 'Discovered caching strategy in the middleware layer',
        }),
      ];
      const mockManager = createMockMemoryManager(memories);
      provider.setMemoryManager(mockManager);

      // Force load
      await provider.getChildren();

      const categoryElement = {
        kind: 'category' as const,
        category: 'discovery',
        label: 'Discovery',
      };
      const entries = await provider.getChildren(categoryElement as never);

      expect(entries).toHaveLength(2);
      entries.forEach((entry) => expect(entry.kind).toBe('memory'));
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

      const categoryElement = {
        kind: 'category' as const,
        category: 'discovery',
        label: 'Discovery',
      };
      const entries = await provider.getChildren(categoryElement as never);

      expect(entries[0].description).toContain('1h ago');
    });
  });

  describe('memory entry click command', () => {
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

  describe('decision entries', () => {
    it('shows only ADR markdown files in Decisions', async () => {
      vi.mocked(fs.readdirSync).mockReturnValue([
        '# Memory: auto_decision.md',
        '001-real-decision.md',
        'README.md',
      ] as never);
      vi.mocked(fs.readFileSync).mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        if (String(filePath).endsWith('001-real-decision.md')) {
          return '# ADR-001: Real decision' as never;
        }
        return '# Memory: auto_decision' as never;
      });

      const root = await provider.getChildren();
      const decisionsSection = root.find((c) => c.section === 'decisions');
      const decisions = await provider.getChildren(decisionsSection as never);

      expect(decisions).toHaveLength(1);
      expect(decisions[0].label).toBe('001-real-decision');
    });

    it('opens decisions through the editable memory document command', async () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['001-real-decision.md'] as never);
      vi.mocked(fs.readFileSync).mockReturnValue('# ADR-001: Real decision' as never);

      const root = await provider.getChildren();
      const decisionsSection = root.find((c) => c.section === 'decisions');
      const decisions = await provider.getChildren(decisionsSection as never);

      expect(decisions).toHaveLength(1);
      expect(decisions[0].command).toEqual({
        command: 'gofer.showMemoryDocument',
        title: 'Open Decision',
        arguments: [
          {
            path: '/test/workspace/.specify/memory/decisions/001-real-decision.md',
          },
        ],
      });
    });
  });

  describe('setMemoryManager', () => {
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
