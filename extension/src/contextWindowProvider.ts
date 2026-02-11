/**
 * ContextWindowProvider
 *
 * TreeDataProvider for the "Context Window" panel in the Gofer sidebar.
 * Shows up to 3 Claude Code sessions with context health breakdowns.
 *
 * Tree structure:
 *   Session {name} ({model})       — {utilization}%
 *     ├─ Spec Artifacts            — ~{tokens} tokens (est.)
 *     ├─ Memories & Hints           — ~{tokens} tokens (est.)
 *     ├─ System Files              — ~{tokens} tokens (est.)
 *     ├─ Conversation History      — ~{tokens} tokens (est.)
 *     │   ├─ Your Prompts          — click to view
 *     │   ├─ Assistant Responses   — click to view
 *     │   ├─ Tool Calls & Results  — click to view
 *     │   └─ System / Commands     — click to view
 *     ├─ Tool Outputs              — ~{tokens} tokens (est.)
 *     └─ Masked Observations       — ~{tokens} tokens (est.)
 */

import * as vscode from 'vscode';
import type { BridgeData } from './autonomous/HookBridgeWatcher';
import type { MultiSessionBridgeWatcher } from './autonomous/MultiSessionBridgeWatcher';

export type ContextWindowItemKind = 'session' | 'category' | 'subcategory' | 'info' | 'empty';

/** Context breakdown category definitions */
const CONTEXT_CATEGORIES = [
  { name: 'Spec Artifacts', icon: 'file-code', estimatePct: 0.15, expandable: false },
  { name: 'Memories & Hints', icon: 'brain', estimatePct: 0.1, expandable: false },
  { name: 'System Files', icon: 'gear', estimatePct: 0.08, expandable: false },
  { name: 'Conversation History', icon: 'comment-discussion', estimatePct: 0.4, expandable: true },
  { name: 'Tool Outputs', icon: 'terminal', estimatePct: 0.22, expandable: false },
  { name: 'Masked Observations', icon: 'eye-closed', estimatePct: 0.05, expandable: false },
] as const;

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
  private disposables: vscode.Disposable[] = [];

  constructor(private readonly _workspacePath: string) {}

  /**
   * Connect to MultiSessionBridgeWatcher for real-time updates (T028).
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

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ContextWindowItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ContextWindowItem): Promise<ContextWindowItem[]> {
    // T025: Empty state — return empty array to trigger viewsWelcome
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
   * T023: Session-level tree items with health icons and utilization.
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

      // T026: Session lifecycle icons with color coding
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
        // Active session — color based on utilization
        const color = this.getHealthColor(utilization);
        item.iconPath = new vscode.ThemeIcon('pulse', new vscode.ThemeColor(color));
      }

      item.tooltip = this.buildSessionTooltip(sessionId, data, isStale);

      items.push(item);
    }

    return items;
  }

  /**
   * T024/T027: Category-level tree items with estimated token breakdown.
   */
  private getCategoryItems(sessionId: string): ContextWindowItem[] {
    if (!this.watcher) return [];
    const data = this.watcher.getSessions().get(sessionId);
    if (!data?.context) return [];

    const totalTokens = data.context.totalContextTokens;

    return CONTEXT_CATEGORIES.map((cat) => {
      const estimatedTokens = Math.round(totalTokens * cat.estimatePct);

      // Conversation History is expandable with sub-categories
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

      // Non-expandable categories get a click command directly
      if (!cat.expandable) {
        item.command = {
          command: 'gofer.showContextCategoryContent',
          title: `Show ${cat.name}`,
          arguments: [sessionId, cat.name],
        };
      } else {
        // Expandable: clicking the parent also shows the overview
        item.command = {
          command: 'gofer.showContextCategoryContent',
          title: `Show ${cat.name}`,
          arguments: [sessionId, cat.name],
        };
      }

      return item;
    });
  }

  /**
   * Sub-categories under Conversation History.
   */
  private getConversationSubcategories(sessionId: string): ContextWindowItem[] {
    return CONVERSATION_SUBCATEGORIES.map((sub) => {
      const item = new ContextWindowItem(sub.name, 'subcategory');
      item.sessionId = sessionId;
      item.categoryName = 'Conversation History';
      item.subcategoryKey = sub.key;
      item.iconPath = new vscode.ThemeIcon(sub.icon);
      item.tooltip = `${sub.name}\nClick to view`;
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
    this._onDidChangeTreeData.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}
