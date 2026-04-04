/**
 * MemoryProvider
 *
 * TreeDataProvider for the "Memory" panel in the Gofer sidebar.
 * Shows learned knowledge: memories (by category) and decisions (ADRs).
 *
 * Tree structure:
 *   Memories (3)
 *     ├─ Discovery (2)
 *     │   ├─ "Found API pattern..." — memory entry
 *     │   └─ "Discovered auth..."   — memory entry
 *     └─ Patterns (1)
 *         └─ "Use singleton..."     — memory entry
 *   Decisions (1)                   — ADRs
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { Memory } from './autonomous/memory';
import { INTERVALS } from './config/intervals';

export type MemoryTreeItemKind = 'section' | 'category' | 'memory' | 'file-item' | 'info';

/** Memory category display mapping */
const CATEGORY_DISPLAY: Record<string, { displayName: string; icon: string }> = {
  discovery: { displayName: 'Discovery', icon: 'search' },
  pattern: { displayName: 'Patterns', icon: 'symbol-pattern' },
  decision: { displayName: 'Decisions', icon: 'law' },
  learning: { displayName: 'Learnings', icon: 'mortar-board' },
  journey: { displayName: 'Journeys', icon: 'map' },
  architecture: { displayName: 'Architecture', icon: 'symbol-structure' },
  debug: { displayName: 'Debug', icon: 'debug' },
};

const DEFAULT_CATEGORY_DISPLAY = { displayName: 'Other', icon: 'tag' };

/** Memory type to icon mapping */
const MEMORY_TYPE_ICONS: Record<string, string> = {
  semantic: 'symbol-key',
  episodic: 'lightbulb',
  procedural: 'book',
};

export class MemoryTreeItem extends vscode.TreeItem {
  kind: MemoryTreeItemKind;
  category?: string;
  memory?: Memory;
  /** Section identifier for top-level groupings */
  section?: string;
  /** File path for file-item nodes */
  filePath?: string;

  constructor(
    label: string,
    kind: MemoryTreeItemKind,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(label, collapsibleState);
    this.kind = kind;
  }
}

/** Interface for MemoryManager dependency (avoiding circular import) */
interface IMemoryManager {
  load(scope?: 'local' | 'global' | 'both'): Promise<Memory[]>;
}

export class MemoryProvider implements vscode.TreeDataProvider<MemoryTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    MemoryTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private memoryManager: IMemoryManager | null = null;
  private cachedMemories: Memory[] = [];
  private readonly workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  /** T037: Deferred MemoryManager injection */
  setMemoryManager(manager: IMemoryManager): void {
    this.memoryManager = manager;
    this.refresh();
  }

  refresh(): void {
    this.loadMemories();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: MemoryTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MemoryTreeItem): Promise<MemoryTreeItem[]> {
    // Root level — return top-level sections
    if (!element) {
      return this.getRootItems();
    }

    // Section level — expand section contents
    if (element.kind === 'section' && element.section) {
      return this.getSectionChildren(element.section);
    }

    // Category level — return memory entries within a category
    if (element.kind === 'category' && element.category) {
      return this.getMemoryItems(element.category);
    }

    return [];
  }

  /**
   * Root items: Memories, Decisions
   */
  private async getRootItems(): Promise<MemoryTreeItem[]> {
    const items: MemoryTreeItem[] = [];

    // Load memories if we haven't yet
    if (this.memoryManager && this.cachedMemories.length === 0) {
      await this.loadMemories();
    }

    // 1. Memories section
    const memoryCount = this.cachedMemories.length;
    const memoriesItem = new MemoryTreeItem(
      'Memories',
      'section',
      memoryCount > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );
    memoriesItem.section = 'memories';
    memoriesItem.description = `${memoryCount} entries`;
    memoriesItem.iconPath = new vscode.ThemeIcon('brain');
    items.push(memoriesItem);

    // 2. Decisions section
    const decisions = this.listDecisions();
    const decItem = new MemoryTreeItem(
      'Decisions',
      'section',
      decisions.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    decItem.section = 'decisions';
    decItem.description = `${decisions.length} ADRs`;
    decItem.iconPath = new vscode.ThemeIcon('law');
    items.push(decItem);

    return items;
  }

  /**
   * Children of each top-level section.
   */
  private getSectionChildren(section: string): MemoryTreeItem[] {
    switch (section) {
      case 'memories':
        return this.getMemoryCategoryItems();
      case 'decisions':
        return this.getDecisionItems();
      default:
        return [];
    }
  }

  /**
   * Memory sub-categories grouped by category (Discovery, Patterns, etc.)
   */
  private getMemoryCategoryItems(): MemoryTreeItem[] {
    if (this.cachedMemories.length === 0) {
      const infoItem = new MemoryTreeItem('No memories stored yet', 'info');
      infoItem.iconPath = new vscode.ThemeIcon('info');
      return [infoItem];
    }

    const grouped = this.groupByCategory(this.cachedMemories);
    const sortedCategories = Array.from(grouped.keys()).sort();

    return sortedCategories.map((category) => {
      const memories = grouped.get(category)!;
      const display = CATEGORY_DISPLAY[category] || DEFAULT_CATEGORY_DISPLAY;

      const categoryItem = new MemoryTreeItem(
        display.displayName,
        'category',
        memories.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );
      categoryItem.category = category;
      categoryItem.description = `${memories.length}`;
      categoryItem.iconPath = new vscode.ThemeIcon(display.icon);
      return categoryItem;
    });
  }

  /** Memory entry items with truncated content */
  private getMemoryItems(category: string): MemoryTreeItem[] {
    const memories = this.cachedMemories.filter((m) => m.category === category);

    return memories.map((memory) => {
      // Truncate content to 60 chars
      const truncated =
        memory.content.length > 60 ? memory.content.slice(0, 57) + '...' : memory.content;

      const item = new MemoryTreeItem(truncated, 'memory');
      item.memory = memory;

      // Relative time description
      const relativeTime = this.formatRelativeTime(memory.created);
      item.description = relativeTime;

      // Icon based on memory type
      const memoryType = (memory as { type?: string }).type || 'semantic';
      const iconId = MEMORY_TYPE_ICONS[memoryType] || 'symbol-key';
      item.iconPath = new vscode.ThemeIcon(iconId);

      // Full tooltip
      item.tooltip = [
        memory.content,
        '',
        `Category: ${category}`,
        `Created: ${new Date(memory.created).toLocaleString()}`,
        `Used: ${memory.usedCount} times`,
        memory.tags.length > 0 ? `Tags: ${memory.tags.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      // Click command to open memory detail
      item.command = {
        command: 'gofer.showMemoryDocument',
        title: 'Show Memory',
        arguments: [memory],
      };

      return item;
    });
  }

  /**
   * Decision (ADR) items.
   */
  private getDecisionItems(): MemoryTreeItem[] {
    const decisions = this.listDecisions();
    if (decisions.length === 0) {
      const empty = new MemoryTreeItem('No decisions recorded', 'info');
      empty.iconPath = new vscode.ThemeIcon('info');
      return [empty];
    }

    return decisions.map((fp) => {
      const baseName = path.basename(fp, '.md');
      const item = new MemoryTreeItem(baseName, 'file-item');
      item.iconPath = new vscode.ThemeIcon('file-text');
      item.filePath = fp;
      item.tooltip = `Decision: ${baseName}\nClick to view`;
      item.command = {
        command: 'vscode.open',
        title: 'Open Decision',
        arguments: [vscode.Uri.file(fp)],
      };
      return item;
    });
  }

  // ── Data helpers ──────────────────────────────────────────────────────

  private listDecisions(): string[] {
    try {
      const dir = path.join(this.workspacePath, '.specify', 'memory', 'decisions');
      return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.md') && f !== 'README.md')
        .map((f) => path.join(dir, f))
        .sort();
    } catch {
      return [];
    }
  }

  private groupByCategory(memories: Memory[]): Map<string, Memory[]> {
    const groups = new Map<string, Memory[]>();
    for (const memory of memories) {
      const cat = memory.category || 'other';
      if (!groups.has(cat)) {
        groups.set(cat, []);
      }
      groups.get(cat)!.push(memory);
    }
    return groups;
  }

  private async loadMemories(): Promise<void> {
    if (!this.memoryManager) {
      this.cachedMemories = [];
      return;
    }
    try {
      this.cachedMemories = await this.memoryManager.load('both');
    } catch {
      this.cachedMemories = [];
    }
  }

  private formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / INTERVALS.MS_PER_MINUTE);
    const hours = Math.floor(diff / INTERVALS.MS_PER_HOUR);
    const days = Math.floor(diff / INTERVALS.MS_PER_DAY);

    if (minutes < 1) {return 'just now';}
    if (minutes < 60) {return `${minutes}m ago`;}
    if (hours < 24) {return `${hours}h ago`;}
    if (days < 30) {return `${days}d ago`;}
    return `${Math.floor(days / 30)}mo ago`;
  }
}
