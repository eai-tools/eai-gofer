/**
 * MemoryProvider
 *
 * TreeDataProvider for the "Memory" panel in the Gofer sidebar.
 * Shows categorized memories from MemoryManager (JSONL) with a
 * Constitution node at the top.
 *
 * Tree structure:
 *   Constitution                — Project principles
 *   Discovery (3)               — category node
 *     ├─ "Found API pattern..." — memory entry
 *     └─ "Discovered auth..."   — memory entry
 *   Patterns (2)
 *     ├─ "Use singleton..."
 *     └─ "Error handling..."
 */

import * as vscode from 'vscode';
import type { Memory } from './autonomous/memory';

export type MemoryTreeItemKind = 'category' | 'memory' | 'constitution' | 'info';

/** Category display mapping */
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

  constructor(
    label: string,
    kind: MemoryTreeItemKind,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
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
  private _onDidChangeTreeData = new vscode.EventEmitter<MemoryTreeItem | undefined | null | void>();
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
    // Root level
    if (!element) {
      return this.getRootItems();
    }

    // Category level — return memory entries
    if (element.kind === 'category' && element.category) {
      return this.getMemoryItems(element.category);
    }

    return [];
  }

  /** T035: Constitution node + T032: category grouping */
  private async getRootItems(): Promise<MemoryTreeItem[]> {
    const items: MemoryTreeItem[] = [];

    // T035: Constitution node at top
    const constitutionItem = new MemoryTreeItem(
      'Constitution',
      'constitution',
    );
    constitutionItem.description = 'Project principles';
    constitutionItem.iconPath = new vscode.ThemeIcon('law');
    constitutionItem.command = {
      command: 'gofer.showConstitution',
      title: 'Show Constitution',
    };
    constitutionItem.contextValue = 'constitution';
    items.push(constitutionItem);

    // Load memories if we haven't yet
    if (this.memoryManager && this.cachedMemories.length === 0) {
      await this.loadMemories();
    }

    if (this.cachedMemories.length === 0) {
      const infoItem = new MemoryTreeItem('No memories stored yet', 'info');
      infoItem.iconPath = new vscode.ThemeIcon('info');
      items.push(infoItem);
      return items;
    }

    // T032: Group by category, sort alphabetically
    const grouped = this.groupByCategory(this.cachedMemories);
    const sortedCategories = Array.from(grouped.keys()).sort();

    for (const category of sortedCategories) {
      const memories = grouped.get(category)!;
      const display = CATEGORY_DISPLAY[category] || DEFAULT_CATEGORY_DISPLAY;

      // T033: Category display with count badge
      const categoryItem = new MemoryTreeItem(
        display.displayName,
        'category',
        memories.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
      );
      categoryItem.category = category;
      categoryItem.description = `${memories.length} entries`;
      categoryItem.iconPath = new vscode.ThemeIcon(display.icon);
      items.push(categoryItem);
    }

    return items;
  }

  /** T034: Memory entry items with truncated content */
  private getMemoryItems(category: string): MemoryTreeItem[] {
    const memories = this.cachedMemories.filter(m => m.category === category);

    return memories.map(memory => {
      // Truncate content to 60 chars
      const truncated = memory.content.length > 60
        ? memory.content.slice(0, 57) + '...'
        : memory.content;

      const item = new MemoryTreeItem(truncated, 'memory');
      item.memory = memory;

      // Relative time description
      const relativeTime = this.formatRelativeTime(memory.created);
      item.description = `${category} \u2022 ${relativeTime}`;

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
      ].filter(Boolean).join('\n');

      // T034: Click command to open memory detail (US4 AC4)
      item.command = {
        command: 'gofer.showMemoryDocument',
        title: 'Show Memory',
        arguments: [memory],
      };

      return item;
    });
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
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }
}
