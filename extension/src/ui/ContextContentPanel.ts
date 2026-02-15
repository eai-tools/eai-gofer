/**
 * ContextContentPanel
 *
 * Singleton webview panel that displays the content of a context window category
 * when the user clicks on it in the sidebar.
 *
 * Feature 021-context-item-click-to-view
 * Feature 023-context-window-accuracy: Added renderers for scanner-based categories
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { BridgeData } from '../autonomous/HookBridgeWatcher';
import type {
  ClaudeCodeContextScanner,
  CategoryBreakdown,
} from '../autonomous/ClaudeCodeContextScanner';

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
  private scanner: ClaudeCodeContextScanner | null = null;
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
   * Set scanner for rendering real file-based categories (Feature 023).
   */
  public setScanner(scanner: ClaudeCodeContextScanner): void {
    this.scanner = scanner;
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
    // Handle Conversation History sub-categories (e.g., "Conversation History:user_prompts")
    if (categoryName.startsWith('Conversation History:')) {
      const subKey = categoryName.split(':')[1];
      return renderConversationSubcategory(bridgeData, subKey);
    }

    switch (categoryName) {
      // Feature 023: Scanner-based categories (new)
      case 'CLAUDE.md & Rules':
        return this.renderScannerCategory('CLAUDE.md & Rules');
      case 'Auto Memory':
        return this.renderScannerCategory('Auto Memory');
      case 'Agents & Commands':
        return this.renderScannerCategory('Agents & Commands');
      case 'System Overhead':
        return this.renderSystemOverhead();
      // Shared between old and new
      case 'Spec Artifacts':
        return this.scanner
          ? this.renderScannerCategory('Spec Artifacts')
          : this.renderSpecArtifacts();
      case 'Conversation History':
        return renderConversationHistory(bridgeData);
      // Legacy fallback categories (Feature 021)
      case 'Memories & Hints':
        return this.renderMemoriesHints();
      case 'System Files':
        return this.renderSystemFiles();
      case 'Tool Outputs':
        return this.renderToolOutputs();
      case 'Masked Observations':
        return this.renderMaskedObservations();
      default:
        return `<div class="empty-state"><p>Unknown category: ${escapeHtml(categoryName)}</p></div>`;
    }
  }

  // ── Scanner-based category renderer (Feature 023) ──────────────

  /**
   * Generic renderer for scanner-based categories.
   * Shows each file with path, size, token count, and content preview.
   */
  private renderScannerCategory(categoryName: string): string {
    if (!this.scanner) {
      return `<div class="empty-state"><p>Scanner not available.</p></div>`;
    }

    const scanResult = this.scanner.scan();
    const category = scanResult.categories.find((c) => c.name === categoryName);
    if (!category) {
      return `<div class="empty-state"><p>Category not found: ${escapeHtml(categoryName)}</p></div>`;
    }

    if (category.files.length === 0) {
      return `<div class="empty-state">
        <p>No files found for ${escapeHtml(categoryName)}.</p>
        ${category.note ? `<p class="muted">${escapeHtml(category.note)}</p>` : ''}
      </div>`;
    }

    const fileCards = category.files.map((f) => {
      let preview = '';
      // Read file content for preview (skip built-in entries)
      if (f.filePath !== '(built-in)') {
        try {
          const raw = fs.readFileSync(f.filePath, 'utf-8');
          preview = raw.slice(0, PREVIEW_CHARS);
          if (raw.length > PREVIEW_CHARS) {
            preview += '...';
          }
        } catch {
          /* file not readable */
        }
      }

      return `
        <div class="card">
          <div class="card-title">
            <span class="file-name">${escapeHtml(f.displayPath)}</span>
            <span class="file-size">${escapeHtml(formatFileSize(f.bytes))} · ~${f.tokens.toLocaleString()} tokens</span>
          </div>
          <div class="card-body">
            ${preview ? `<pre class="file-preview">${escapeHtml(preview)}</pre>` : '<p class="muted">Content not available</p>'}
          </div>
        </div>
      `;
    });

    const totalHtml = `
      <div class="card info-card">
        <div class="card-body">
          <strong>${category.files.length}</strong> file(s) · <strong>~${category.totalTokens.toLocaleString()}</strong> tokens total
          ${category.note ? `<br><span class="muted">${escapeHtml(category.note)}</span>` : ''}
        </div>
      </div>
    `;

    return totalHtml + fileCards.join('');
  }

  // ── System Overhead renderer (Feature 023) ────────────────────

  private renderSystemOverhead(): string {
    if (!this.scanner) {
      return `<div class="empty-state"><p>Scanner not available.</p></div>`;
    }

    const scanResult = this.scanner.scan();
    const category = scanResult.categories.find((c) => c.name === 'System Overhead');
    if (!category) {
      return `<div class="empty-state"><p>System overhead data not found.</p></div>`;
    }

    const rows = category.files
      .map(
        (f) =>
          `<tr><td>${escapeHtml(f.displayPath)}</td><td class="number">~${f.tokens.toLocaleString()}</td></tr>`
      )
      .join('');

    return `
      <div class="card info-card">
        <div class="card-body">
          <p>These are invisible components baked into every Claude Code API call.
          Token counts are estimates based on research.</p>
          <p><strong>Total: ~${category.totalTokens.toLocaleString()} tokens</strong></p>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Breakdown</div>
        <div class="card-body">
          <table class="token-table">
            <thead><tr><th>Component</th><th>~Tokens</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── Spec Artifacts (US2 — legacy fallback) ────────────────────

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

  // ── Memories & Hints (US3) ─────────────────────────────────────

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

// ── Conversation History (US6) — parses real transcript JSONL ──

export interface TranscriptEntry {
  type: string;
  message?: {
    content?: string | Array<{ type: string; text?: string; name?: string; input?: unknown }>;
    usage?: Record<string, number>;
    model?: string;
  };
  timestamp?: string;
  sessionId?: string;
}

/** Read and parse transcript JSONL for a session */
export function readTranscript(sessionId: string): TranscriptEntry[] {
  if (!sessionId) return [];
  const homedir = require('os').homedir();
  // Claude Code stores transcripts by project path hash
  const projectDir = process.env.CLAUDE_PROJECT_DIR || '';
  const projectHash = projectDir.replace(/\//g, '-');

  // Try to find the transcript file
  const candidates = [path.join(homedir, '.claude', 'projects', projectHash, `${sessionId}.jsonl`)];

  // Also try to glob for it if the hash doesn't match
  try {
    const projectsDir = path.join(homedir, '.claude', 'projects');
    const dirs = fs.readdirSync(projectsDir);
    for (const dir of dirs) {
      const candidate = path.join(projectsDir, dir, `${sessionId}.jsonl`);
      if (!candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    }
  } catch {
    /* ignore */
  }

  for (const filePath of candidates) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const entries: TranscriptEntry[] = [];
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        try {
          entries.push(JSON.parse(line));
        } catch {
          /* skip malformed */
        }
      }
      if (entries.length > 0) return entries;
    } catch {
      /* try next */
    }
  }

  return [];
}

/** Extract text from message content (string or content blocks) */
function extractText(content: string | Array<{ type: string; text?: string }> | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text!)
      .join('\n');
  }
  return '';
}

/** Classify transcript entries into sub-categories */
export function classifyTranscript(entries: TranscriptEntry[]): {
  userPrompts: Array<{ text: string; timestamp?: string }>;
  assistantResponses: Array<{ text: string; timestamp?: string }>;
  toolCalls: Array<{ name: string; input: string; result?: string; timestamp?: string }>;
  systemCommands: Array<{ text: string; timestamp?: string }>;
  totalBytes: { user: number; assistant: number; tools: number; system: number };
} {
  const result = {
    userPrompts: [] as Array<{ text: string; timestamp?: string }>,
    assistantResponses: [] as Array<{ text: string; timestamp?: string }>,
    toolCalls: [] as Array<{ name: string; input: string; result?: string; timestamp?: string }>,
    systemCommands: [] as Array<{ text: string; timestamp?: string }>,
    totalBytes: { user: 0, assistant: 0, tools: 0, system: 0 },
  };

  // Track pending tool calls by ID so we can attach results
  const pendingTools = new Map<string, number>(); // tool_use_id -> index in toolCalls

  for (const entry of entries) {
    const ts = entry.timestamp;

    if (entry.type === 'user') {
      const content = entry.message?.content;
      const text = extractText(content as string | Array<{ type: string; text?: string }>);
      const isCommand = text.includes('<command-message>') || text.includes('<command-name>');

      if (isCommand) {
        result.systemCommands.push({ text, timestamp: ts });
        result.totalBytes.system += text.length;
      } else if (text && text !== 'No prompt') {
        result.userPrompts.push({ text, timestamp: ts });
        result.totalBytes.user += text.length;
      }

      // Also check for tool_result blocks in user messages
      if (Array.isArray(content)) {
        for (const block of content as Array<{
          type: string;
          content?: unknown;
          tool_use_id?: string;
        }>) {
          if (block.type === 'tool_result') {
            const toolResultStr = JSON.stringify(block.content || '').slice(0, 500);
            result.totalBytes.tools += toolResultStr.length;
            // Attach result to the matching tool call
            if (block.tool_use_id && pendingTools.has(block.tool_use_id)) {
              const idx = pendingTools.get(block.tool_use_id)!;
              result.toolCalls[idx].result = toolResultStr;
              pendingTools.delete(block.tool_use_id);
            }
          }
        }
      }
    } else if (entry.type === 'assistant') {
      const content = entry.message?.content;
      if (Array.isArray(content)) {
        for (const block of content as Array<{
          type: string;
          text?: string;
          name?: string;
          input?: unknown;
        }>) {
          if (block.type === 'text' && block.text) {
            result.assistantResponses.push({ text: block.text, timestamp: ts });
            result.totalBytes.assistant += block.text.length;
          } else if (block.type === 'tool_use') {
            const inputStr = JSON.stringify(block.input || {});
            const idx = result.toolCalls.length;
            result.toolCalls.push({
              name: block.name || 'unknown',
              input: inputStr.slice(0, 300),
              timestamp: ts,
            });
            result.totalBytes.tools += inputStr.length;
            if ((block as Record<string, unknown>).id) {
              pendingTools.set((block as Record<string, unknown>).id as string, idx);
            }
          }
        }
      } else {
        const text = extractText(content as string | Array<{ type: string; text?: string }>);
        if (text) {
          result.assistantResponses.push({ text, timestamp: ts });
          result.totalBytes.assistant += text.length;
        }
      }
    } else if (entry.type === 'system') {
      const text = extractText(
        entry.message?.content as string | Array<{ type: string; text?: string }>
      );
      if (text) {
        result.systemCommands.push({ text, timestamp: ts });
        result.totalBytes.system += text.length;
      }
    }
  }

  return result;
}

/** Overview: shows breakdown sizes + utilization */
function renderConversationHistory(bridgeData: BridgeData | undefined): string {
  if (!bridgeData?.context) {
    return '<div class="empty-state"><p>No conversation data available.</p></div>';
  }

  const ctx = bridgeData.context;
  const sessionId = bridgeData.sessionId || '';
  const utilization = Math.round(ctx.utilizationPercent);
  const barColor = utilization > 70 ? '#dc3545' : utilization > 50 ? '#fd7e14' : '#28a745';

  // Parse real transcript
  const entries = readTranscript(sessionId);
  const classified = classifyTranscript(entries);
  const total = classified.totalBytes;
  const grandTotal = total.user + total.assistant + total.tools + total.system || 1;

  const breakdownRows = [
    {
      label: 'Your Prompts',
      count: classified.userPrompts.length,
      bytes: total.user,
      icon: 'account',
    },
    {
      label: 'Assistant Responses',
      count: classified.assistantResponses.length,
      bytes: total.assistant,
      icon: 'hubot',
    },
    {
      label: 'Tool Calls & Results',
      count: classified.toolCalls.length,
      bytes: total.tools,
      icon: 'tools',
    },
    {
      label: 'System / Commands',
      count: classified.systemCommands.length,
      bytes: total.system,
      icon: 'settings-gear',
    },
  ];

  const tableHtml = breakdownRows
    .map((row) => {
      const pct = Math.round((row.bytes / grandTotal) * 100);
      const sizeStr = row.bytes > 1024 ? `${(row.bytes / 1024).toFixed(1)} KB` : `${row.bytes} B`;
      const estTokens = Math.ceil(row.bytes / 4);
      const tokenStr = estTokens > 1000 ? `~${(estTokens / 1000).toFixed(1)}k` : `~${estTokens}`;
      return `<tr>
      <td>${escapeHtml(row.label)}</td>
      <td class="number">${row.count}</td>
      <td class="number">${escapeHtml(sizeStr)}</td>
      <td class="number">${escapeHtml(tokenStr)}</td>
      <td class="number">${pct}%</td>
    </tr>`;
    })
    .join('');

  const tokenRows = [
    ['Input Tokens', ctx.inputTokens],
    ['Cache Read', ctx.cacheReadInputTokens],
    ['Cache Creation', ctx.cacheCreationInputTokens],
    ['Output Tokens', ctx.outputTokens],
    ['Total Context', ctx.totalContextTokens],
    ['Context Limit', ctx.contextLimit],
  ] as const;

  const tokenTableHtml = tokenRows
    .map(
      ([label, value]) =>
        `<tr><td>${escapeHtml(label)}</td><td class="number">${value.toLocaleString()}</td></tr>`
    )
    .join('');

  return `
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
      <div class="card-title">Conversation Breakdown${entries.length > 0 ? ` <span class="count">(${entries.length} transcript entries)</span>` : ''}</div>
      <div class="card-body">
        ${
          entries.length > 0
            ? `
          <table class="token-table">
            <thead><tr><th>Category</th><th>Count</th><th>Size</th><th>~Tokens</th><th>Share</th></tr></thead>
            <tbody>${tableHtml}</tbody>
          </table>
          <p class="muted" style="margin-top:8px">Click sub-categories in the tree to view actual content.</p>
        `
            : `
          <p class="muted">No transcript found for this session. The transcript JSONL file may not be accessible.</p>
        `
        }
      </div>
    </div>

    <div class="card">
      <div class="card-title">Token Breakdown</div>
      <div class="card-body">
        <table class="token-table">
          <thead><tr><th>Category</th><th>Tokens</th></tr></thead>
          <tbody>${tokenTableHtml}</tbody>
        </table>
      </div>
    </div>
  `;
}

/** Render a specific sub-category of conversation history */
function renderConversationSubcategory(bridgeData: BridgeData | undefined, subKey: string): string {
  const sessionId = bridgeData?.sessionId || '';
  const entries = readTranscript(sessionId);

  if (entries.length === 0) {
    return '<div class="empty-state"><p>No transcript data found.</p><p class="muted">The transcript JSONL for this session could not be read.</p></div>';
  }

  const classified = classifyTranscript(entries);

  switch (subKey) {
    case 'user_prompts':
      return renderUserPrompts(classified.userPrompts);
    case 'assistant_responses':
      return renderAssistantResponses(classified.assistantResponses);
    case 'tool_calls':
      return renderToolCalls(classified.toolCalls);
    case 'system_commands':
      return renderSystemCommands(classified.systemCommands);
    default:
      return `<div class="empty-state"><p>Unknown sub-category: ${escapeHtml(subKey)}</p></div>`;
  }
}

function renderUserPrompts(prompts: Array<{ text: string; timestamp?: string }>): string {
  if (prompts.length === 0) {
    return '<div class="empty-state"><p>No user prompts in this session.</p></div>';
  }

  return prompts
    .map((p, i) => {
      const age = p.timestamp ? formatAge(new Date(p.timestamp)) : '';
      const preview = p.text.slice(0, 800);
      const truncated = p.text.length > 800;
      return `
      <div class="card">
        <div class="card-title">
          <span>Prompt ${i + 1}</span>
          ${age ? `<span class="timestamp">${escapeHtml(age)}</span>` : ''}
          <span class="file-size">${escapeHtml(formatByteSize(p.text.length))}</span>
        </div>
        <div class="card-body">
          <pre class="file-preview">${escapeHtml(preview)}${truncated ? '\n...' : ''}</pre>
        </div>
      </div>
    `;
    })
    .join('');
}

function renderAssistantResponses(responses: Array<{ text: string; timestamp?: string }>): string {
  if (responses.length === 0) {
    return '<div class="empty-state"><p>No assistant text responses in this session.</p></div>';
  }

  return responses
    .map((r, i) => {
      const age = r.timestamp ? formatAge(new Date(r.timestamp)) : '';
      const preview = r.text.slice(0, 800);
      const truncated = r.text.length > 800;
      return `
      <div class="card">
        <div class="card-title">
          <span>Response ${i + 1}</span>
          ${age ? `<span class="timestamp">${escapeHtml(age)}</span>` : ''}
          <span class="file-size">${escapeHtml(formatByteSize(r.text.length))}</span>
        </div>
        <div class="card-body">
          <pre class="file-preview">${escapeHtml(preview)}${truncated ? '\n...' : ''}</pre>
        </div>
      </div>
    `;
    })
    .join('');
}

function renderToolCalls(
  calls: Array<{ name: string; input: string; result?: string; timestamp?: string }>
): string {
  if (calls.length === 0) {
    return '<div class="empty-state"><p>No tool calls in this session.</p></div>';
  }

  // Group by tool name for summary
  const byTool = new Map<string, number>();
  for (const c of calls) {
    byTool.set(c.name, (byTool.get(c.name) || 0) + 1);
  }

  const summaryRows = [...byTool.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `<tr><td>${escapeHtml(name)}</td><td class="number">${count}</td></tr>`)
    .join('');

  const summaryHtml = `
    <div class="card">
      <div class="card-title">Tool Usage Summary <span class="count">(${calls.length} total)</span></div>
      <div class="card-body">
        <table class="token-table">
          <thead><tr><th>Tool</th><th>Calls</th></tr></thead>
          <tbody>${summaryRows}</tbody>
        </table>
      </div>
    </div>
  `;

  // Show last 20 calls (most recent)
  const recentCalls = calls.slice(-20).reverse();
  const callCards = recentCalls
    .map((c) => {
      const age = c.timestamp ? formatAge(new Date(c.timestamp)) : '';
      const resultHtml = c.result
        ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--vscode-panel-border)">
            <span class="muted" style="font-size:11px">Result:</span>
            <pre class="file-preview" style="margin-top:4px">${escapeHtml(c.result.slice(0, 300))}${c.result.length > 300 ? '\n...' : ''}</pre>
           </div>`
        : '';
      return `
      <div class="card">
        <div class="card-title">
          <span class="tool-name">${escapeHtml(c.name)}</span>
          ${age ? `<span class="timestamp">${escapeHtml(age)}</span>` : ''}
        </div>
        <div class="card-body">
          <pre class="file-preview">${escapeHtml(c.input)}</pre>
          ${resultHtml}
        </div>
      </div>
    `;
    })
    .join('');

  return summaryHtml + callCards;
}

function renderSystemCommands(commands: Array<{ text: string; timestamp?: string }>): string {
  if (commands.length === 0) {
    return '<div class="empty-state"><p>No system messages or commands in this session.</p></div>';
  }

  return commands
    .map((c, i) => {
      const age = c.timestamp ? formatAge(new Date(c.timestamp)) : '';
      const preview = c.text.slice(0, 600);
      const truncated = c.text.length > 600;
      return `
      <div class="card">
        <div class="card-title">
          <span>System ${i + 1}</span>
          ${age ? `<span class="timestamp">${escapeHtml(age)}</span>` : ''}
          <span class="file-size">${escapeHtml(formatByteSize(c.text.length))}</span>
        </div>
        <div class="card-body">
          <pre class="file-preview">${escapeHtml(preview)}${truncated ? '\n...' : ''}</pre>
        </div>
      </div>
    `;
    })
    .join('');
}

function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
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
