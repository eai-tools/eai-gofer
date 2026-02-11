/**
 * ContextContentPanel
 *
 * Singleton webview panel that displays the content of a context window category
 * (Spec Artifacts, Memories/Hints, System Files, Conversation History,
 * Tool Outputs, Masked Observations) when the user clicks on it in the sidebar.
 *
 * Feature 021-context-item-click-to-view
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { BridgeData } from '../autonomous/HookBridgeWatcher';

/** Max bytes to read from any single file */
const MAX_FILE_BYTES = 50 * 1024;
/** Max chars for a content preview */
const PREVIEW_CHARS = 500;
/** Max recent observations to show */
const MAX_OBSERVATIONS = 20;
/** Masking threshold in milliseconds (5 minutes) */
const MASK_THRESHOLD_MS = 5 * 60 * 1000;

export class ContextContentPanel {
  public static currentPanel: ContextContentPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly workspacePath: string;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, workspacePath: string): ContextContentPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ContextContentPanel.currentPanel) {
      ContextContentPanel.currentPanel.panel.reveal(column);
      return ContextContentPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'goferContextContent',
      'Context Content',
      column || vscode.ViewColumn.One,
      {
        enableScripts: false,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    ContextContentPanel.currentPanel = new ContextContentPanel(panel, workspacePath);
    return ContextContentPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, workspacePath: string) {
    this.panel = panel;
    this.workspacePath = workspacePath;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public dispose(): void {
    ContextContentPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }

  /**
   * Update the panel to show content for a specific category.
   */
  public async showCategory(
    sessionId: string,
    categoryName: string,
    bridgeData: BridgeData | undefined
  ): Promise<void> {
    const shortId = sessionId.length > 8 ? sessionId.slice(0, 8) : sessionId;
    const sessionLabel = bridgeData?.displayName || `Session ${shortId}`;
    this.panel.title = `${categoryName} — ${sessionLabel}`;

    let contentHtml: string;
    try {
      contentHtml = await this.renderCategory(categoryName, bridgeData);
    } catch (err) {
      contentHtml = `<div class="empty-state">
        <p>Error loading content for ${escapeHtml(categoryName)}</p>
        <p class="muted">${escapeHtml(String(err))}</p>
      </div>`;
    }

    this.panel.webview.html = buildHtml(categoryName, sessionLabel, contentHtml);
  }

  private async renderCategory(
    categoryName: string,
    bridgeData: BridgeData | undefined
  ): Promise<string> {
    switch (categoryName) {
      case 'Spec Artifacts':
        return this.renderSpecArtifacts();
      case 'Memories/Hints':
        return this.renderMemoriesHints();
      case 'System Files':
        return this.renderSystemFiles();
      case 'Conversation History':
        return renderConversationHistory(bridgeData);
      case 'Tool Outputs':
        return this.renderToolOutputs();
      case 'Masked Observations':
        return this.renderMaskedObservations();
      default:
        return `<div class="empty-state"><p>Unknown category: ${escapeHtml(categoryName)}</p></div>`;
    }
  }

  // ── Spec Artifacts (US2) ──────────────────────────────────────

  private async renderSpecArtifacts(): Promise<string> {
    const specsDir = path.join(this.workspacePath, '.specify', 'specs');
    let dirs: string[];
    try {
      dirs = await fs.promises.readdir(specsDir);
    } catch {
      return '<div class="empty-state"><p>No spec artifacts found.</p><p class="muted">.specify/specs/ directory does not exist.</p></div>';
    }

    // Filter to actual directories, skip hidden
    const specDirs: string[] = [];
    for (const d of dirs) {
      if (d.startsWith('.')) {
        continue;
      }
      try {
        const stat = await fs.promises.stat(path.join(specsDir, d));
        if (stat.isDirectory()) {
          specDirs.push(d);
        }
      } catch {
        /* skip */
      }
    }

    if (specDirs.length === 0) {
      return '<div class="empty-state"><p>No spec artifacts found.</p></div>';
    }

    const cards: string[] = [];
    for (const dir of specDirs.sort()) {
      const dirPath = path.join(specsDir, dir);
      let files: string[];
      try {
        files = (await fs.promises.readdir(dirPath)).filter((f) => !f.startsWith('.'));
      } catch {
        continue;
      }

      const fileItems: string[] = [];
      for (const file of files.sort()) {
        const filePath = path.join(dirPath, file);
        try {
          const stat = await fs.promises.stat(filePath);
          if (!stat.isFile()) {
            continue;
          }
          const sizeStr = formatFileSize(stat.size);
          let preview = '';
          if (file.endsWith('.md') || file.endsWith('.json') || file.endsWith('.yaml')) {
            const content = await readBounded(filePath);
            preview = content.slice(0, PREVIEW_CHARS);
            if (content.length > PREVIEW_CHARS) {
              preview += '...';
            }
          }
          fileItems.push(`
            <div class="file-item">
              <div class="file-header">
                <span class="file-name">${escapeHtml(file)}</span>
                <span class="file-size">${escapeHtml(sizeStr)}</span>
              </div>
              ${preview ? `<pre class="file-preview">${escapeHtml(preview)}</pre>` : ''}
            </div>
          `);
        } catch {
          /* skip unreadable files */
        }
      }

      cards.push(`
        <div class="card">
          <div class="card-title">${escapeHtml(dir)}</div>
          <div class="card-body">
            ${fileItems.length > 0 ? fileItems.join('') : '<p class="muted">No files</p>'}
          </div>
        </div>
      `);
    }

    return cards.join('');
  }

  // ── Memories/Hints (US3) ──────────────────────────────────────

  private async renderMemoriesHints(): Promise<string> {
    const memoryDir = path.join(this.workspacePath, '.specify', 'memory');
    const files = ['memories.jsonl', 'hints.jsonl'];
    interface MemEntry {
      content?: string;
      category?: string;
      tags?: string[];
      priority?: number;
    }
    const grouped = new Map<string, MemEntry[]>();

    for (const file of files) {
      const filePath = path.join(memoryDir, file);
      try {
        const raw = await fs.promises.readFile(filePath, 'utf-8');
        for (const line of raw.split('\n')) {
          if (!line.trim()) {
            continue;
          }
          try {
            const entry = JSON.parse(line) as MemEntry;
            const cat = entry.category || 'uncategorized';
            if (!grouped.has(cat)) {
              grouped.set(cat, []);
            }
            grouped.get(cat)!.push(entry);
          } catch {
            /* skip malformed lines */
          }
        }
      } catch {
        /* file doesn't exist */
      }
    }

    if (grouped.size === 0) {
      return '<div class="empty-state"><p>No memories or hints found.</p><p class="muted">Memory files (.specify/memory/memories.jsonl, hints.jsonl) do not exist or are empty.</p></div>';
    }

    const sections: string[] = [];
    for (const [category, entries] of [...grouped.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    )) {
      const items = entries.map((e) => {
        const tags = (e.tags || [])
          .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
          .join(' ');
        const priority =
          e.priority !== undefined ? `<span class="badge">P${e.priority}</span>` : '';
        return `
          <div class="memory-item">
            <div class="memory-meta">${priority} ${tags}</div>
            <div class="memory-content">${escapeHtml(e.content || '(empty)')}</div>
          </div>
        `;
      });

      sections.push(`
        <div class="card">
          <div class="card-title">${escapeHtml(category)} <span class="count">(${entries.length})</span></div>
          <div class="card-body">${items.join('')}</div>
        </div>
      `);
    }

    return sections.join('');
  }

  // ── System Files (US4) ────────────────────────────────────────

  private async renderSystemFiles(): Promise<string> {
    const candidates = [
      { name: 'CLAUDE.md', filePath: path.join(this.workspacePath, 'CLAUDE.md') },
      { name: 'AGENTS.md', filePath: path.join(this.workspacePath, 'AGENTS.md') },
      {
        name: 'constitution.md',
        filePath: path.join(this.workspacePath, '.specify', 'memory', 'constitution.md'),
      },
    ];

    const cards: string[] = [];
    for (const { name, filePath } of candidates) {
      try {
        await fs.promises.access(filePath);
        const stat = await fs.promises.stat(filePath);
        const content = await readBounded(filePath);
        const preview = content.slice(0, PREVIEW_CHARS);
        const truncated = content.length > PREVIEW_CHARS;

        cards.push(`
          <div class="card">
            <div class="card-title">
              <span class="file-name">${escapeHtml(name)}</span>
              <span class="file-size">${escapeHtml(formatFileSize(stat.size))}</span>
            </div>
            <div class="card-body">
              <pre class="file-preview">${escapeHtml(preview)}${truncated ? '...' : ''}</pre>
            </div>
          </div>
        `);
      } catch {
        /* file doesn't exist — skip silently */
      }
    }

    if (cards.length === 0) {
      return '<div class="empty-state"><p>No system files found.</p><p class="muted">CLAUDE.md, AGENTS.md, and constitution.md were not found in the workspace.</p></div>';
    }

    return cards.join('');
  }

  // ── Tool Outputs (US5) ────────────────────────────────────────

  private async renderToolOutputs(): Promise<string> {
    const obsDir = path.join(this.workspacePath, '.specify', 'hooks', 'observations');
    const observations = await loadObservations(obsDir);

    // Recent observations (not masked)
    const recent = observations
      .filter((o) => Date.now() - new Date(o.timestamp).getTime() < MASK_THRESHOLD_MS)
      .slice(0, MAX_OBSERVATIONS);

    if (recent.length === 0) {
      return '<div class="empty-state"><p>No recent tool outputs.</p><p class="muted">Tool outputs appear here when Claude Code uses tools during a session.</p></div>';
    }

    return recent
      .map((obs) => {
        const inputStr = obs.toolInput ? JSON.stringify(obs.toolInput).slice(0, 200) : '';
        const responsePreview = (obs.toolResponse || '').slice(0, PREVIEW_CHARS);
        const truncatedLabel = obs.truncated ? ' <span class="badge warning">truncated</span>' : '';
        const age = formatAge(new Date(obs.timestamp));

        return `
        <div class="card">
          <div class="card-title">
            <span class="tool-name">${escapeHtml(obs.toolName)}</span>
            <span class="timestamp">${escapeHtml(age)}</span>
            ${truncatedLabel}
          </div>
          <div class="card-body">
            ${inputStr ? `<div class="tool-input"><strong>Input:</strong> <code>${escapeHtml(inputStr)}</code></div>` : ''}
            <pre class="file-preview">${escapeHtml(responsePreview)}${(obs.toolResponse || '').length > PREVIEW_CHARS ? '...' : ''}</pre>
          </div>
        </div>
      `;
      })
      .join('');
  }

  // ── Masked Observations (US7) ─────────────────────────────────

  private async renderMaskedObservations(): Promise<string> {
    const obsDir = path.join(this.workspacePath, '.specify', 'hooks', 'observations');
    const observations = await loadObservations(obsDir);

    const masked = observations.filter(
      (o) => Date.now() - new Date(o.timestamp).getTime() >= MASK_THRESHOLD_MS
    );

    if (masked.length === 0) {
      return '<div class="empty-state"><p>No masked observations.</p><p class="muted">All observations are recent (less than 5 minutes old). Older observations appear here as masked entries.</p></div>';
    }

    return masked
      .map((obs) => {
        const age = formatAge(new Date(obs.timestamp));
        return `
        <div class="card masked">
          <div class="card-title">
            <span class="tool-name">${escapeHtml(obs.toolName)}</span>
            <span class="timestamp">${escapeHtml(age)}</span>
          </div>
          <div class="card-body">
            <p class="muted">Observation masked (older than 5 minutes)</p>
          </div>
        </div>
      `;
      })
      .join('');
  }
}

// ── Conversation History (US6) — standalone since it only uses BridgeData ──

function renderConversationHistory(bridgeData: BridgeData | undefined): string {
  if (!bridgeData?.context) {
    return '<div class="empty-state"><p>No conversation data available.</p><p class="muted">Session bridge data has no context information.</p></div>';
  }

  const ctx = bridgeData.context;
  const model = bridgeData.model || 'unknown';
  const sessionId = bridgeData.sessionId || 'unknown';
  const displayName = bridgeData.displayName || '';
  const utilization = Math.round(ctx.utilizationPercent);
  const barColor = utilization > 70 ? '#dc3545' : utilization > 50 ? '#fd7e14' : '#28a745';

  const rows = [
    ['Input Tokens', ctx.inputTokens],
    ['Cache Read', ctx.cacheReadInputTokens],
    ['Cache Creation', ctx.cacheCreationInputTokens],
    ['Output Tokens', ctx.outputTokens],
    ['Total Context', ctx.totalContextTokens],
    ['Context Limit', ctx.contextLimit],
  ] as const;

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td>${escapeHtml(label)}</td><td class="number">${value.toLocaleString()}</td></tr>`
    )
    .join('');

  return `
    <div class="card">
      <div class="card-title">Session Metadata</div>
      <div class="card-body">
        <table class="meta-table">
          <tr><td>Model</td><td>${escapeHtml(model)}</td></tr>
          <tr><td>Session ID</td><td><code>${escapeHtml(sessionId)}</code></td></tr>
          ${displayName ? `<tr><td>Name</td><td>${escapeHtml(displayName)}</td></tr>` : ''}
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Context Utilization</div>
      <div class="card-body">
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${Math.min(utilization, 100)}%; background-color: ${barColor};"></div>
        </div>
        <p class="utilization-label">${utilization}% used (${ctx.totalContextTokens.toLocaleString()} / ${ctx.contextLimit.toLocaleString()} tokens)</p>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Token Breakdown</div>
      <div class="card-body">
        <table class="token-table">
          <thead><tr><th>Category</th><th>Tokens</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>

    <div class="card info-card">
      <div class="card-body">
        <p class="muted">Full conversation content is not available for inspection. The conversation history includes all messages exchanged with Claude during this session. Token counts above reflect the total context consumed.</p>
      </div>
    </div>
  `;
}

// ── Shared utilities ────────────────────────────────────────────

interface ObservationFile {
  id: string;
  toolName: string;
  toolInput?: Record<string, unknown>;
  toolResponse?: string;
  timestamp: string;
  truncated?: boolean;
}

async function loadObservations(obsDir: string): Promise<ObservationFile[]> {
  let files: string[];
  try {
    files = await fs.promises.readdir(obsDir);
  } catch {
    return [];
  }

  const observations: ObservationFile[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }
    try {
      const raw = await fs.promises.readFile(path.join(obsDir, file), 'utf-8');
      const obs = JSON.parse(raw) as ObservationFile;
      if (obs.toolName && obs.timestamp) {
        observations.push(obs);
      }
    } catch {
      /* skip malformed */
    }
  }

  // Sort by timestamp descending (most recent first)
  observations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return observations;
}

async function readBounded(filePath: string): Promise<string> {
  const buf = Buffer.alloc(MAX_FILE_BYTES);
  let fd: fs.promises.FileHandle | undefined;
  try {
    fd = await fs.promises.open(filePath, 'r');
    const { bytesRead } = await fd.read(buf, 0, MAX_FILE_BYTES, 0);
    return buf.subarray(0, bytesRead).toString('utf-8');
  } finally {
    await fd?.close();
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAge(date: Date): string {
  const ms = Date.now() - date.getTime();
  if (ms < 60_000) {
    return 'just now';
  }
  if (ms < 3_600_000) {
    return `${Math.round(ms / 60_000)}m ago`;
  }
  if (ms < 86_400_000) {
    return `${Math.round(ms / 3_600_000)}h ago`;
  }
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function getStyles(): string {
  return `
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 16px;
      margin: 0;
    }
    .breadcrumb {
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    h1 {
      font-size: 1.3em;
      margin: 0 0 16px 0;
      font-weight: 600;
    }
    .card {
      background-color: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    .card.masked {
      opacity: 0.5;
    }
    .card.info-card {
      border-left: 3px solid var(--vscode-textLink-foreground);
    }
    .card-title {
      font-weight: 600;
      padding: 10px 14px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-body {
      padding: 10px 14px;
    }
    .file-item {
      padding: 6px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .file-item:last-child { border-bottom: none; }
    .file-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .file-name { font-weight: 600; }
    .file-size, .timestamp { color: var(--vscode-descriptionForeground); font-size: 0.85em; }
    .file-preview {
      background-color: var(--vscode-textCodeBlock-background);
      padding: 8px;
      margin: 6px 0 0 0;
      border-radius: 3px;
      font-size: 0.85em;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
    }
    .tool-name { font-weight: 600; color: var(--vscode-textLink-foreground); }
    .tool-input { margin-bottom: 6px; font-size: 0.85em; }
    .tool-input code {
      background-color: var(--vscode-textCodeBlock-background);
      padding: 2px 4px;
      border-radius: 2px;
      word-break: break-all;
    }
    .memory-item {
      padding: 8px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .memory-item:last-child { border-bottom: none; }
    .memory-meta { margin-bottom: 4px; }
    .memory-content {
      background-color: var(--vscode-textCodeBlock-background);
      padding: 8px;
      border-radius: 3px;
      border-left: 3px solid var(--vscode-textLink-foreground);
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 0.9em;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.75em;
      font-weight: 600;
      background-color: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .badge.warning { background-color: #fd7e14; color: #fff; }
    .tag {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 0.75em;
      background-color: var(--vscode-textCodeBlock-background);
      color: var(--vscode-descriptionForeground);
      margin-right: 4px;
    }
    .count { color: var(--vscode-descriptionForeground); font-weight: normal; }
    .muted { color: var(--vscode-descriptionForeground); }
    .empty-state {
      text-align: center;
      padding: 32px 16px;
    }
    .meta-table, .token-table { width: 100%; border-collapse: collapse; }
    .meta-table td, .token-table td, .token-table th {
      padding: 4px 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .token-table th { text-align: left; font-weight: 600; }
    .number { text-align: right; font-variant-numeric: tabular-nums; }
    .progress-bar-container {
      width: 100%;
      height: 8px;
      background-color: var(--vscode-textCodeBlock-background);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .progress-bar { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .utilization-label { font-size: 0.9em; margin: 4px 0 0 0; }
  `;
}

function buildHtml(categoryName: string, sessionLabel: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${getStyles()}</style>
</head>
<body>
  <div class="breadcrumb">${escapeHtml(sessionLabel)} / ${escapeHtml(categoryName)}</div>
  <h1>${escapeHtml(categoryName)}</h1>
  ${contentHtml}
</body>
</html>`;
}
