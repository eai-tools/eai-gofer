/**
 * Memory and Learning System - Memory Panel Webview
 *
 * Provides a searchable UI for viewing, filtering, and managing memories.
 * Displays memories with categories, tags, and usage statistics.
 */

import * as vscode from 'vscode';
import { type MemoryManager } from '../autonomous/MemoryManager';
import { type Memory, type MemoryQuery } from '../autonomous/memory';

/**
 * MemoryPanel manages the webview for displaying and searching memories.
 */
export class MemoryPanel {
  public static currentPanel: MemoryPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly memoryManager: MemoryManager;
  private disposables: vscode.Disposable[] = [];

  /**
   * Creates or shows the MemoryPanel.
   *
   * @param extensionUri - Extension URI for loading resources
   * @param memoryManager - MemoryManager instance
   * @returns MemoryPanel instance
   */
  public static createOrShow(extensionUri: vscode.Uri, memoryManager: MemoryManager): MemoryPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel already exists, show it
    if (MemoryPanel.currentPanel) {
      MemoryPanel.currentPanel.panel.reveal(column);
      return MemoryPanel.currentPanel;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'goferMemories',
      'Gofer Memories',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    MemoryPanel.currentPanel = new MemoryPanel(panel, memoryManager);
    return MemoryPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, memoryManager: MemoryManager) {
    this.panel = panel;
    this.memoryManager = memoryManager;

    // Set initial content
    this.update();

    // Listen for panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleMessage(message);
      },
      null,
      this.disposables
    );
  }

  /**
   * Dispose of the panel and clean up resources.
   */
  public dispose(): void {
    MemoryPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Update the webview content.
   */
  private async update(): Promise<void> {
    this.panel.webview.html = await this.getHtmlContent();
  }

  /**
   * Handle messages from the webview.
   *
   * @param message - Message from webview
   */
  private async handleMessage(message: { command: string; [key: string]: any }): Promise<void> {
    switch (message.command) {
      case 'search': {
        const query: MemoryQuery = {
          keywords: message.keywords || undefined,
          category: message.category || undefined,
          tags: message.tags || undefined,
          scope: message.scope === 'all' ? 'both' : (message.scope as 'local' | 'global'),
        };
        const result = await this.memoryManager.search(query);
        this.panel.webview.postMessage({
          command: 'searchResults',
          memories: result.memories,
          count: result.count,
          searchTime: result.searchTime,
        });
        break;
      }

      case 'delete': {
        try {
          await this.memoryManager.forget(message.id);
          vscode.window.showInformationMessage('Memory deleted');
          // Refresh the list
          this.panel.webview.postMessage({ command: 'refresh' });
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to delete memory: ${(error as Error).message}`);
        }
        break;
      }

      case 'recordUsage': {
        try {
          await this.memoryManager.recordUsage(message.id);
        } catch (error) {
          console.error('Failed to record usage:', error);
        }
        break;
      }

      case 'clearScope': {
        const scopeLabel = message.scope === 'all' ? 'all memories' : `${message.scope} memories`;
        const confirmed = await vscode.window.showWarningMessage(
          `Are you sure you want to clear ${scopeLabel}? This cannot be undone.`,
          { modal: true },
          'Clear'
        );

        if (confirmed === 'Clear') {
          try {
            const count = await this.memoryManager.clear(message.scope);
            vscode.window.showInformationMessage(`Cleared ${count} ${scopeLabel}`);
            this.panel.webview.postMessage({ command: 'refresh' });
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to clear memories: ${(error as Error).message}`);
          }
        }
        break;
      }

      case 'refresh': {
        await this.update();
        break;
      }
    }
  }

  /**
   * Generate HTML content for the webview.
   *
   * @returns HTML string
   */
  private async getHtmlContent(): Promise<string> {
    // Load all memories initially
    const allMemories = await this.memoryManager.load('both');

    // Get unique categories for filter dropdown
    const categories = Array.from(new Set(allMemories.map((m) => m.category))).sort();

    // Get unique tags for filter dropdown
    const allTags = allMemories.flatMap((m) => m.tags);
    const uniqueTags = Array.from(new Set(allTags)).sort();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gofer Memories</title>
    <style>
        body {
            padding: 20px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }

        h1 {
            margin-top: 0;
            font-size: 24px;
            font-weight: 600;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }

        .search-container {
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .search-row {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        input[type="text"],
        select {
            flex: 1;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-family: var(--vscode-font-family);
        }

        input[type="text"]:focus,
        select:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }

        button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        button.danger {
            background-color: #d32f2f;
            color: white;
        }

        button.danger:hover {
            background-color: #b71c1c;
        }

        .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding: 10px;
            background-color: var(--vscode-sideBar-background);
            border-radius: 3px;
        }

        .results-info {
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
        }

        .memory-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .memory-card {
            padding: 15px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
        }

        .memory-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 10px;
        }

        .memory-meta {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .memory-category {
            display: inline-block;
            padding: 3px 8px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 3px;
            font-size: 12px;
            font-weight: 600;
        }

        .memory-scope {
            display: inline-block;
            padding: 3px 8px;
            background-color: var(--vscode-charts-blue);
            color: white;
            border-radius: 3px;
            font-size: 11px;
            margin-left: 8px;
        }

        .memory-scope.global {
            background-color: var(--vscode-charts-purple);
        }

        .memory-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 5px;
        }

        .memory-tag {
            padding: 2px 6px;
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .memory-content {
            margin: 10px 0;
            padding: 10px;
            background-color: var(--vscode-textCodeBlock-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            border-radius: 3px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .memory-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid var(--vscode-panel-border);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .memory-stats {
            display: flex;
            gap: 15px;
        }

        .memory-actions {
            display: flex;
            gap: 8px;
        }

        .memory-actions button {
            padding: 4px 10px;
            font-size: 12px;
        }

        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 10px;
            opacity: 0.5;
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <h1>Gofer Memories</h1>

    <div class="search-container">
        <div class="search-row">
            <input
                type="text"
                id="searchInput"
                placeholder="Search memories by keyword..."
                value=""
            />
            <button onclick="search()">Search</button>
            <button class="secondary" onclick="clearFilters()">Clear</button>
        </div>
        <div class="search-row">
            <select id="scopeFilter">
                <option value="all">All Scopes</option>
                <option value="local">Local Only</option>
                <option value="global">Global Only</option>
            </select>
            <select id="categoryFilter">
                <option value="">All Categories</option>
                ${categories.map((cat) => `<option value="${cat}">${cat}</option>`).join('')}
            </select>
            <select id="tagFilter">
                <option value="">All Tags</option>
                ${uniqueTags.map((tag) => `<option value="${tag}">${tag}</option>`).join('')}
            </select>
        </div>
    </div>

    <div class="toolbar">
        <div class="results-info" id="resultsInfo">
            ${allMemories.length} ${allMemories.length === 1 ? 'memory' : 'memories'}
        </div>
        <div>
            <button class="secondary" onclick="refresh()">Refresh</button>
            <button class="danger" onclick="clearScope()">Clear All...</button>
        </div>
    </div>

    <div id="memoryList" class="memory-list">
        ${this.renderMemories(allMemories)}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const DAYS_PER_YEAR = 365;

        // Search on Enter key
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                search();
            }
        });

        // Search on filter change
        document.getElementById('scopeFilter').addEventListener('change', search);
        document.getElementById('categoryFilter').addEventListener('change', search);
        document.getElementById('tagFilter').addEventListener('change', search);

        function search() {
            const keywords = document.getElementById('searchInput').value.trim();
            const scope = document.getElementById('scopeFilter').value;
            const category = document.getElementById('categoryFilter').value;
            const tag = document.getElementById('tagFilter').value;

            vscode.postMessage({
                command: 'search',
                keywords: keywords || undefined,
                scope: scope,
                category: category || undefined,
                tags: tag ? [tag] : undefined
            });
        }

        function clearFilters() {
            document.getElementById('searchInput').value = '';
            document.getElementById('scopeFilter').value = 'all';
            document.getElementById('categoryFilter').value = '';
            document.getElementById('tagFilter').value = '';
            search();
        }

        function deleteMemory(id) {
            if (confirm('Are you sure you want to delete this memory?')) {
                vscode.postMessage({
                    command: 'delete',
                    id: id
                });
            }
        }

        function recordUsage(id) {
            vscode.postMessage({
                command: 'recordUsage',
                id: id
            });
        }

        function clearScope() {
            const scope = document.getElementById('scopeFilter').value;
            vscode.postMessage({
                command: 'clearScope',
                scope: scope === 'all' ? 'all' : scope
            });
        }

        function refresh() {
            vscode.postMessage({
                command: 'refresh'
            });
        }

        function formatDate(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                return 'Today';
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < 7) {
                return diffDays + ' days ago';
            } else if (diffDays < 30) {
                return Math.floor(diffDays / 7) + ' weeks ago';
            } else if (diffDays < DAYS_PER_YEAR) {
                return Math.floor(diffDays / 30) + ' months ago';
            } else {
                return Math.floor(diffDays / DAYS_PER_YEAR) + ' years ago';
            }
        }

        // HTML escape function for XSS protection
        function escapeHtml(str: string): string {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'searchResults': {
                    const memoryList = document.getElementById('memoryList');
                    const resultsInfo = document.getElementById('resultsInfo');

                    resultsInfo.textContent = \`\${message.count} \${message.count === 1 ? 'memory' : 'memories'} (\${message.searchTime}ms)\`;

                    if (message.memories.length === 0) {
                        memoryList.innerHTML = \`
                            <div class="empty-state">
                                <div class="empty-state-icon">🔍</div>
                                <div>No memories found</div>
                            </div>
                        \`;
                    } else {
                        memoryList.innerHTML = message.memories.map(memory => \`
                            <div class="memory-card">
                                <div class="memory-header">
                                    <div class="memory-meta">
                                        <div>
                                            <span class="memory-category">\${escapeHtml(memory.category)}</span>
                                            <span class="memory-scope \${memory.scope}">\${escapeHtml(memory.scope)}</span>
                                        </div>
                                        <div class="memory-tags">
                                            \${memory.tags.map(tag => \`<span class="memory-tag">\${escapeHtml(tag)}</span>\`).join('')}
                                        </div>
                                    </div>
                                </div>
                                <div class="memory-content">\${escapeHtml(memory.content)}</div>
                                <div class="memory-footer">
                                    <div class="memory-stats">
                                        <span>Created: \${formatDate(memory.created)}</span>
                                        <span>Used: \${memory.usedCount} times</span>
                                        <span>From: \${escapeHtml(memory.learnedFrom)}</span>
                                    </div>
                                    <div class="memory-actions">
                                        <button class="secondary" onclick="recordUsage('\${memory.id}')">Use</button>
                                        <button class="danger" onclick="deleteMemory('\${memory.id}')">Delete</button>
                                    </div>
                                </div>
                            </div>
                        \`).join('');
                    }
                    break;
                }

                case 'refresh': {
                    location.reload();
                    break;
                }
            }
        });
    </script>
</body>
</html>`;
  }

  /**
   * Render memories as HTML cards.
   *
   * @param memories - Array of memories to render
   * @returns HTML string
   */
  private renderMemories(memories: Memory[]): string {
    if (memories.length === 0) {
      return `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <div>No memories yet</div>
                    <div style="margin-top: 10px; font-size: 12px;">
                        Use the "Gofer: Remember" command to create your first memory
                    </div>
                </div>
            `;
    }

    return memories
      .map(
        (memory) => `
            <div class="memory-card">
                <div class="memory-header">
                    <div class="memory-meta">
                        <div>
                            <span class="memory-category">${memory.category}</span>
                            <span class="memory-scope ${memory.scope}">${memory.scope}</span>
                        </div>
                        <div class="memory-tags">
                            ${memory.tags.map((tag) => `<span class="memory-tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="memory-content">${this.escapeHtml(memory.content)}</div>
                <div class="memory-footer">
                    <div class="memory-stats">
                        <span>Created: <span class="date-relative" data-timestamp="${memory.created}"></span></span>
                        <span>Used: ${memory.usedCount} times</span>
                        <span>From: ${memory.learnedFrom}</span>
                    </div>
                    <div class="memory-actions">
                        <button class="secondary" onclick="recordUsage('${memory.id}')">Use</button>
                        <button class="danger" onclick="deleteMemory('${memory.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `
      )
      .join('');
  }

  /**
   * Escape HTML special characters.
   *
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
