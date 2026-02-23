/**
 * ContextWindowProvider
 *
 * TreeDataProvider for the "Context Window" panel in the Gofer sidebar.
 * Shows up to 3 Claude Code sessions with context health breakdowns.
 *
 * Tree structure:
 *   Session {name} ({model})       — {utilization}%
 *     ├─ CLAUDE.md & Rules         — ~{tokens} tokens
 *     ├─ Auto Memory               — ~{tokens} tokens
 *     ├─ Agents & Commands         — ~{tokens} tokens
 *     ├─ Conversation History      — ~{tokens} tokens
 *     │   ├─ Your Prompts          — {count} items, ~{tokens} tokens
 *     │   ├─ Assistant Responses   — {count} items, ~{tokens} tokens
 *     │   ├─ Tool Calls & Results  — {count} items, ~{tokens} tokens
 *     │   └─ System / Commands     — {count} items, ~{tokens} tokens
 *     ├─ System Overhead           — ~14.8k tokens
 *     └─ Spec Artifacts            — ~{tokens} tokens
 *
 * Feature 023: Categories now show REAL token counts from scanning actual
 * Claude Code files, not hardcoded percentage estimates.
 */

import * as vscode from 'vscode';
import type { BridgeData } from './autonomous/HookBridgeWatcher';
import type { MultiSessionBridgeWatcher } from './autonomous/MultiSessionBridgeWatcher';
import type { ClaudeCodeContextScanner } from './autonomous/ClaudeCodeContextScanner';
import { readTranscript, classifyTranscript } from './ui/ContextContentPanel';

export type ContextWindowItemKind = 'session' | 'category' | 'subcategory' | 'info' | 'empty';

/** Sub-categories for Conversation History */
const CONVERSATION_SUBCATEGORIES = [
  { name: 'Your Prompts', icon: 'account', key: 'user_prompts' },
  { name: 'Assistant Responses', icon: 'hubot', key: 'assistant_responses' },
  { name: 'Tool Calls & Results', icon: 'tools', key: 'tool_calls' },
  { name: 'System / Commands', icon: 'settings-gear', key: 'system_commands' },
] as const;

export class ContextWindowItem extends vscode.TreeItem {
  kind: ContextWindowItemKind;
  sessionId?: string;
  categoryName?: string;
  subcategoryKey?: string;
  tokenCount?: number;

  constructor(
    label: string,
    kind: ContextWindowItemKind,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(label, collapsibleState);
    this.kind = kind;
  }
}

export class ContextWindowProvider
  implements vscode.TreeDataProvider<ContextWindowItem>, vscode.Disposable
{
  private _onDidChangeTreeData: vscode.EventEmitter<ContextWindowItem | undefined | null | void> =
    new vscode.EventEmitter<ContextWindowItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ContextWindowItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private watcher: MultiSessionBridgeWatcher | null = null;
  private scanner: ClaudeCodeContextScanner | null = null;
  private disposables: vscode.Disposable[] = [];
  private refreshDebounceTimer: NodeJS.Timeout | null = null;
  private static readonly REFRESH_DEBOUNCE_MS = 5000;

  constructor(private readonly _workspacePath: string) {}

  /**
   * Connect to MultiSessionBridgeWatcher for real-time updates.
   */
  setWatcher(watcher: MultiSessionBridgeWatcher): void {
    this.watcher = watcher;
    const onUpdate = (): void => this.refresh();
    const onAdded = (): void => this.refresh();
    const onRemoved = (): void => this.refresh();
    watcher.on('session-update', onUpdate);
    watcher.on('session-added', onAdded);
    watcher.on('session-removed', onRemoved);
    this.disposables.push(
      { dispose: () => watcher.off('session-update', onUpdate) },
      { dispose: () => watcher.off('session-added', onAdded) },
      { dispose: () => watcher.off('session-removed', onRemoved) }
    );
  }

  /**
   * Connect the context scanner for real token counts.
   */
  setScanner(scanner: ClaudeCodeContextScanner): void {
    this.scanner = scanner;
  }

  refresh(): void {
    // Debounce rapid refreshes — bridge files update on every tool call,
    // so without debouncing the tree flickers every few seconds
    if (this.refreshDebounceTimer) {
      return; // Already scheduled
    }
    this.refreshDebounceTimer = setTimeout(() => {
      this.refreshDebounceTimer = null;
      this._onDidChangeTreeData.fire();
    }, ContextWindowProvider.REFRESH_DEBOUNCE_MS);
  }

  getTreeItem(element: ContextWindowItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ContextWindowItem): Promise<ContextWindowItem[]> {
    if (!this.watcher || this.watcher.getSessionCount() === 0) {
      return [];
    }

    // Root level: return session items
    if (!element) {
      return this.getSessionItems();
    }

    // Session level: return category breakdown items
    if (element.kind === 'session' && element.sessionId) {
      return this.getCategoryItems(element.sessionId);
    }

    // Conversation History: return sub-categories
    if (
      element.kind === 'category' &&
      element.categoryName === 'Conversation History' &&
      element.sessionId
    ) {
      return this.getConversationSubcategories(element.sessionId);
    }

    return [];
  }

  /**
   * Session-level tree items with health icons and utilization.
   */
  private getSessionItems(): ContextWindowItem[] {
    if (!this.watcher) return [];

    const sessions = this.watcher.getSessions();
    const items: ContextWindowItem[] = [];

    for (const [sessionId, data] of sessions) {
      const shortId = sessionId.length > 8 ? sessionId.slice(0, 8) : sessionId;
      const model = this.formatModel(data.model);
      const utilization = data.context?.utilizationPercent ?? 0;
      const sessionLabel = data.displayName
        ? `${data.displayName} (${model})`
        : `Session ${shortId} (${model})`;

      const item = new ContextWindowItem(
        sessionLabel,
        'session',
        vscode.TreeItemCollapsibleState.Collapsed
      );
      item.sessionId = sessionId;
      item.description = `${Math.round(utilization)}%`;

      const isStale = this.watcher!.isSessionStale(sessionId);
      const isActive = data.session?.active ?? false;

      if (isStale) {
        item.iconPath = new vscode.ThemeIcon('clock', new vscode.ThemeColor('disabledForeground'));
      } else if (!isActive) {
        item.iconPath = new vscode.ThemeIcon(
          'circle-slash',
          new vscode.ThemeColor('disabledForeground')
        );
      } else {
        const color = this.getHealthColor(utilization);
        item.iconPath = new vscode.ThemeIcon('pulse', new vscode.ThemeColor(color));
      }

      item.tooltip = this.buildSessionTooltip(sessionId, data, isStale);
      items.push(item);
    }

    return items;
  }

  /**
   * Category-level tree items with real token counts from scanner.
   * Falls back to the old percentage-based estimates if no scanner is set.
   */
  private getCategoryItems(sessionId: string): ContextWindowItem[] {
    if (!this.watcher) return [];
    const data = this.watcher.getSessions().get(sessionId);
    if (!data?.context) return [];

    const totalContextTokens = data.context.totalContextTokens;

    // Use real scanner if available
    if (this.scanner) {
      return this.buildRealCategories(sessionId, totalContextTokens);
    }

    // Fallback: old hardcoded estimates (should not normally be reached)
    return this.buildEstimatedCategories(sessionId, totalContextTokens);
  }

  /**
   * Build categories from real scanner results.
   * Conversation History is calculated as the residual (totalContextTokens - measured).
   */
  private buildRealCategories(sessionId: string, totalContextTokens: number): ContextWindowItem[] {
    const scanResult = this.scanner!.scan();
    const items: ContextWindowItem[] = [];

    // Add file-based categories from scanner
    for (const cat of scanResult.categories) {
      const item = new ContextWindowItem(cat.name, 'category');
      item.sessionId = sessionId;
      item.categoryName = cat.name;
      item.tokenCount = cat.totalTokens;
      item.description = `~${this.formatTokens(cat.totalTokens)} tokens`;
      item.iconPath = new vscode.ThemeIcon(cat.icon);
      item.tooltip = `${cat.name}: ~${cat.totalTokens.toLocaleString()} tokens\n${cat.files.length} file(s)${cat.note ? '\n' + cat.note : ''}\nClick to view content`;
      item.command = {
        command: 'gofer.showContextCategoryContent',
        title: `Show ${cat.name}`,
        arguments: [sessionId, cat.name],
      };
      items.push(item);
    }

    // Add Conversation History as residual
    const conversationTokens = Math.max(0, totalContextTokens - scanResult.measuredTokens);
    const convItem = new ContextWindowItem(
      'Conversation History',
      'category',
      vscode.TreeItemCollapsibleState.Collapsed
    );
    convItem.sessionId = sessionId;
    convItem.categoryName = 'Conversation History';
    convItem.tokenCount = conversationTokens;
    convItem.description = `~${this.formatTokens(conversationTokens)} tokens`;
    convItem.iconPath = new vscode.ThemeIcon('comment-discussion');
    convItem.tooltip = `Conversation History: ~${conversationTokens.toLocaleString()} tokens\nCalculated as total context minus file-based categories\nClick to view breakdown`;
    convItem.command = {
      command: 'gofer.showContextCategoryContent',
      title: 'Show Conversation History',
      arguments: [sessionId, 'Conversation History'],
    };
    items.push(convItem);

    return items;
  }

  /**
   * Fallback: old hardcoded percentage-based estimates.
   * Used only if no scanner is set.
   */
  private buildEstimatedCategories(sessionId: string, totalTokens: number): ContextWindowItem[] {
    const fallbackCategories = [
      { name: 'Spec Artifacts', icon: 'file-code', estimatePct: 0.15, expandable: false },
      { name: 'Memories & Hints', icon: 'brain', estimatePct: 0.1, expandable: false },
      { name: 'System Files', icon: 'gear', estimatePct: 0.08, expandable: false },
      {
        name: 'Conversation History',
        icon: 'comment-discussion',
        estimatePct: 0.4,
        expandable: true,
      },
      { name: 'Tool Outputs', icon: 'terminal', estimatePct: 0.22, expandable: false },
      { name: 'Masked Observations', icon: 'eye-closed', estimatePct: 0.05, expandable: false },
    ];

    return fallbackCategories.map((cat) => {
      const estimatedTokens = Math.round(totalTokens * cat.estimatePct);
      const collapsible = cat.expandable
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;

      const item = new ContextWindowItem(cat.name, 'category', collapsible);
      item.sessionId = sessionId;
      item.categoryName = cat.name;
      item.tokenCount = estimatedTokens;
      item.description = `~${this.formatTokens(estimatedTokens)} tokens (est.)`;
      item.iconPath = new vscode.ThemeIcon(cat.icon);
      item.tooltip = `${cat.name}: ~${estimatedTokens.toLocaleString()} tokens (estimated)\nClick to view content`;
      item.command = {
        command: 'gofer.showContextCategoryContent',
        title: `Show ${cat.name}`,
        arguments: [sessionId, cat.name],
      };
      return item;
    });
  }

  /**
   * Sub-categories under Conversation History with token estimates.
   */
  private getConversationSubcategories(sessionId: string): ContextWindowItem[] {
    const entries = readTranscript(sessionId);
    const classified = classifyTranscript(entries);
    const total = classified.totalBytes;

    const bytesByKey: Record<string, number> = {
      user_prompts: total.user,
      assistant_responses: total.assistant,
      tool_calls: total.tools,
      system_commands: total.system,
    };
    const countByKey: Record<string, number> = {
      user_prompts: classified.userPrompts.length,
      assistant_responses: classified.assistantResponses.length,
      tool_calls: classified.toolCalls.length,
      system_commands: classified.systemCommands.length,
    };

    return CONVERSATION_SUBCATEGORIES.map((sub) => {
      const item = new ContextWindowItem(sub.name, 'subcategory');
      item.sessionId = sessionId;
      item.categoryName = 'Conversation History';
      item.subcategoryKey = sub.key;
      item.iconPath = new vscode.ThemeIcon(sub.icon);

      const bytes = bytesByKey[sub.key] || 0;
      const count = countByKey[sub.key] || 0;
      const estTokens = Math.ceil(bytes / 4);

      if (count > 0) {
        item.description = `${count} items, ~${this.formatTokens(estTokens)} tokens`;
        item.tooltip = `${sub.name}: ${count} items, ~${estTokens.toLocaleString()} tokens\nClick to view content`;
      } else {
        item.description = 'no data';
        item.tooltip = `${sub.name}\nNo transcript data found`;
      }

      item.command = {
        command: 'gofer.showContextCategoryContent',
        title: `Show ${sub.name}`,
        arguments: [sessionId, `Conversation History:${sub.key}`],
      };
      return item;
    });
  }

  private formatModel(model: string): string {
    if (!model) return 'unknown';
    if (model.includes('opus')) return 'Opus';
    if (model.includes('sonnet')) return 'Sonnet';
    if (model.includes('haiku')) return 'Haiku';
    return model.split('-').slice(0, 2).join(' ');
  }

  private formatTokens(tokens: number): string {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  }

  private getHealthColor(utilization: number): string {
    if (utilization > 70) return 'charts.red';
    if (utilization > 50) return 'charts.yellow';
    return 'charts.green';
  }

  private buildSessionTooltip(sessionId: string, data: BridgeData, isStale: boolean): string {
    const parts = [
      data.displayName ? `Name: ${data.displayName}` : null,
      `Session: ${sessionId}`,
      `Model: ${data.model || 'unknown'}`,
    ].filter(Boolean) as string[];

    if (data.context) {
      parts.push(
        `Context: ${Math.round(data.context.utilizationPercent)}% (${data.context.totalContextTokens.toLocaleString()} / ${data.context.contextLimit.toLocaleString()})`,
        `Input: ${data.context.inputTokens.toLocaleString()} tokens`,
        `Cache Read: ${data.context.cacheReadInputTokens.toLocaleString()} tokens`,
        `Cache Create: ${data.context.cacheCreationInputTokens.toLocaleString()} tokens`,
        `Output: ${data.context.outputTokens.toLocaleString()} tokens`
      );
    }

    if (isStale) {
      parts.push('Status: Stale (no updates for >5 min)');
    } else if (data.session?.active) {
      parts.push('Status: Active');
    } else {
      parts.push('Status: Inactive');
    }

    if (data.lastToolUse) {
      parts.push(`Last tool: ${data.lastToolUse.toolName}`);
    }

    return parts.join('\n');
  }

  dispose(): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.refreshDebounceTimer = null;
    }
    this._onDidChangeTreeData.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}
