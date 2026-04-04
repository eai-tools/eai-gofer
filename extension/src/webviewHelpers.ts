import * as vscode from 'vscode';
import * as path from 'path';

interface TreeItemLike {
  id?: string;
  path?: string;
}

interface SpecLike {
  id: string;
  title: string;
  status?: string;
  description?: string;
  author?: string;
  created?: string;
  updated?: string;
  uri?: vscode.Uri;
}

interface TaskLike {
  id: string;
  status: string;
  description: string;
  dependencies?: string[];
  estimated?: string;
  error?: string;
  attempts?: number;
  parallel?: boolean;
  completedAt?: string;
  uri?: vscode.Uri;
}

interface ArticleLike {
  number: string | number;
  title: string;
}

interface SectionLike {
  number: string | number;
  title: string;
  content?: string;
  line: number;
}

interface MemoryPathDocument {
  path: string;
}

interface MemoryContentDocument {
  content: string;
  notePath?: string;
  category?: string;
  created?: string;
  tags?: string[];
  usedCount?: number;
  learnedFrom?: string;
  path?: string;
}

function isMemoryContentDocument(document: unknown): document is MemoryContentDocument {
  return (
    typeof document === 'object' &&
    document !== null &&
    'content' in document &&
    typeof (document as { content?: unknown }).content === 'string'
  );
}

function hasPathDocument(document: unknown): document is MemoryPathDocument {
  return (
    typeof document === 'object' &&
    document !== null &&
    'path' in document &&
    typeof (document as { path?: unknown }).path === 'string'
  );
}

/**
 * Open a markdown file with the user's preferred viewer
 */
async function openMarkdownFile(uri: vscode.Uri): Promise<void> {
  const config = vscode.workspace.getConfiguration('gofer');
  const viewer = config.get<string>('markdownViewer', 'preview');

  await openMarkdownFileWith(uri, viewer);
}

/**
 * Open a markdown file with a specific viewer
 */
async function openMarkdownFileWith(uri: vscode.Uri, viewer: string): Promise<void> {
  switch (viewer) {
    case 'mark-sharp':
      // Open with Mark Sharp - Fast WYSIWYG editor
      try {
        await vscode.window.showTextDocument(uri);
        await vscode.commands.executeCommand('mark-sharp.switch-editor-mode');
      } catch (_error) {
        vscode.window.showErrorMessage(
          'Mark Sharp extension not installed. Install it from the marketplace or change your viewer setting.'
        );
      }
      break;

    case 'markdown-editor':
      // Open with Markdown Editor by zaaack
      try {
        await vscode.window.showTextDocument(uri);
        await vscode.commands.executeCommand('markdown-editor.toggleEditor');
      } catch (_error) {
        vscode.window.showErrorMessage(
          'Markdown Editor extension not installed. Install it from the marketplace or change your viewer setting.'
        );
      }
      break;

    case 'markdown-wysiwyg':
      // Open with Markdown WYSIWYG
      try {
        await vscode.window.showTextDocument(uri);
        await vscode.commands.executeCommand('markdown-wysiwyg.toggle');
      } catch (_error) {
        vscode.window.showErrorMessage(
          'Markdown WYSIWYG extension not installed. Install it from the marketplace or change your viewer setting.'
        );
      }
      break;

    case 'preview':
    default:
      // VSCode built-in markdown preview
      await vscode.commands.executeCommand('markdown.showPreview', uri);
      break;
  }
}

/**
 * Get the URI for a tree view item (spec, constitution, or memory)
 */
function getUriForTreeItem(item: TreeItemLike): vscode.Uri | null {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return null;
  }

  // Handle spec items
  if (item.id && item.id.startsWith('spec-')) {
    const specFile = path.join(workspaceFolder.uri.fsPath, '.specify', 'specs', item.id, 'spec.md');
    return vscode.Uri.file(specFile);
  }

  // Handle memory items
  if (item.path) {
    return vscode.Uri.file(item.path);
  }

  // Handle constitution items
  const constitutionFile = path.join(
    workspaceFolder.uri.fsPath,
    '.specify',
    'memory',
    'constitution.md'
  );
  return vscode.Uri.file(constitutionFile);
}

/**
 * Open with Preview - context menu command
 */
export async function openWithPreview(item: TreeItemLike): Promise<void> {
  const uri = getUriForTreeItem(item);
  if (uri) {
    await openMarkdownFileWith(uri, 'preview');
  }
}

/**
 * Open with Mark Sharp - context menu command
 */
export async function openWithMarkSharp(item: TreeItemLike): Promise<void> {
  const uri = getUriForTreeItem(item);
  if (uri) {
    await openMarkdownFileWith(uri, 'mark-sharp');
  }
}

/**
 * Open with Markdown Editor - context menu command
 */
export async function openWithMarkdownEditor(item: TreeItemLike): Promise<void> {
  const uri = getUriForTreeItem(item);
  if (uri) {
    await openMarkdownFileWith(uri, 'markdown-editor');
  }
}

/**
 * Open with Markdown WYSIWYG - context menu command
 */
export async function openWithMarkdownWYSIWYG(item: TreeItemLike): Promise<void> {
  const uri = getUriForTreeItem(item);
  if (uri) {
    await openMarkdownFileWith(uri, 'markdown-wysiwyg');
  }
}

/**
 * Show spec details using VSCode's native markdown preview
 */
export async function showSpecDetailsWebview(
  _context: vscode.ExtensionContext,
  spec: SpecLike
): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  // Try to open the spec.md file
  const specFile = path.join(workspaceFolder.uri.fsPath, '.specify', 'specs', spec.id, 'spec.md');
  try {
    const uri = vscode.Uri.file(specFile);
    await vscode.workspace.openTextDocument(uri);

    // Open with user's preferred viewer
    await openMarkdownFile(uri);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open specification: ${error}`);
  }
}

/**
 * Show task details in a webview panel
 */
export function showTaskDetailsWebview(
  _context: vscode.ExtensionContext,
  task: TaskLike,
  spec: SpecLike
): void {
  const panel = vscode.window.createWebviewPanel(
    'taskDetails',
    `Task: ${task.id}`,
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = getTaskDetailsHTML(task, spec);
}

/**
 * Show article details using VSCode's native markdown preview
 */
export async function showArticleDetailsWebview(
  _context: vscode.ExtensionContext,
  _article: ArticleLike
): Promise<void> {
  await openConstitutionPreview();
}

/**
 * Show section details using VSCode's native markdown preview
 */
export async function showSectionDetailsWebview(
  _context: vscode.ExtensionContext,
  _section: SectionLike,
  _article: ArticleLike
): Promise<void> {
  await openConstitutionPreview();
}

/**
 * Helper to open constitution.md in markdown preview
 */
async function openConstitutionPreview(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const constitutionFile = path.join(
    workspaceFolder.uri.fsPath,
    '.specify',
    'memory',
    'constitution.md'
  );
  try {
    const uri = vscode.Uri.file(constitutionFile);
    await vscode.workspace.openTextDocument(uri);

    // Open with user's preferred viewer
    await openMarkdownFile(uri);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open constitution: ${error}`);
  }
}

/**
 * Show memory document using VSCode's native markdown preview.
 * Accepts either a Memory object (from tree view click) or a document with a path property.
 */
export async function showMemoryDocumentWebview(
  _context: vscode.ExtensionContext,
  document: MemoryContentDocument | MemoryPathDocument
): Promise<void> {
  try {
    // If this is a Memory object (from memoryProvider tree view click),
    // it has 'content' and optionally 'notePath', but no 'path' property.
    if (isMemoryContentDocument(document) && !document.path) {
      // If a companion markdown file exists, open it directly
      if (document.notePath) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          const notePath = path.join(workspaceFolders[0].uri.fsPath, document.notePath);
          const uri = vscode.Uri.file(notePath);
          try {
            await vscode.workspace.fs.stat(uri);
            await openMarkdownFile(uri);
            return;
          } catch {
            // Note file doesn't exist, fall through to content display
          }
        }
      }

      // Render the memory content in a virtual document
      const category = document.category || 'memory';
      const created = document.created ? new Date(document.created).toLocaleString() : 'Unknown';
      const tags = (document.tags || []).join(', ');
      const markdownContent = [
        `# Memory: ${category}`,
        '',
        `**Category:** ${category}`,
        tags ? `**Tags:** ${tags}` : '',
        `**Created:** ${created}`,
        `**Used:** ${document.usedCount || 0} times`,
        document.learnedFrom ? `**Source:** ${document.learnedFrom}` : '',
        '',
        '---',
        '',
        document.content,
      ]
        .filter(Boolean)
        .join('\n');

      const doc = await vscode.workspace.openTextDocument({
        content: markdownContent,
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc, { preview: true });
      return;
    }

    // Original behavior: document has a 'path' property (e.g., constitution sections)
    if (!hasPathDocument(document)) {
      throw new Error('Document path is missing');
    }

    const uri = vscode.Uri.file(document.path);
    await vscode.workspace.openTextDocument(uri);
    await openMarkdownFile(uri);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open memory document: ${error}`);
  }
}

/**
 * Show memory section using VSCode's native markdown preview
 * Opens the document and scrolls to the section
 */
export async function showMemorySectionWebview(
  _context: vscode.ExtensionContext,
  section: SectionLike,
  document: MemoryPathDocument
): Promise<void> {
  try {
    const uri = vscode.Uri.file(document.path);
    const doc = await vscode.workspace.openTextDocument(uri);

    // Open in editor first (to allow scrolling to line)
    const editor = await vscode.window.showTextDocument(doc, {
      preview: true,
      viewColumn: vscode.ViewColumn.One,
    });

    // Scroll to the section line
    const position = new vscode.Position(section.line - 1, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);

    // Then show with user's preferred viewer
    await openMarkdownFile(uri);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open memory section: ${error}`);
  }
}

function getTaskDetailsHTML(task: TaskLike, spec: SpecLike): string {
  const statusColors: Record<string, string> = {
    completed: '#28a745',
    in_progress: '#007acc',
    testing: '#6f42c1',
    failed: '#dc3545',
    blocked: '#fd7e14',
    pending: '#6c757d',
  };

  const statusIcons: Record<string, string> = {
    completed: '✓',
    in_progress: '⟳',
    testing: '⚗',
    failed: '✗',
    blocked: '🔒',
    pending: '○',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 20px;
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
        }
        h1 {
          color: var(--vscode-editor-foreground);
          border-bottom: 2px solid var(--vscode-panel-border);
          padding-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        h2 {
          color: var(--vscode-editor-foreground);
          margin-top: 30px;
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 5px;
        }
        .status-icon {
          font-size: 32px;
          color: ${statusColors[task.status]};
        }
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 600;
          background-color: ${statusColors[task.status]};
          color: white;
          text-transform: uppercase;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .info-card {
          background-color: var(--vscode-input-background);
          padding: 15px;
          border-radius: 8px;
          border: 1px solid var(--vscode-panel-border);
        }
        .info-label {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
          margin-bottom: 5px;
        }
        .info-value {
          font-size: 18px;
          font-weight: bold;
        }
        .description {
          background-color: var(--vscode-textBlockQuote-background);
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid ${statusColors[task.status]};
          margin: 15px 0;
          font-size: 16px;
          line-height: 1.6;
        }
        .breadcrumb {
          font-size: 13px;
          color: var(--vscode-descriptionForeground);
          margin-bottom: 15px;
        }
        .error-message {
          background-color: rgba(220, 53, 69, 0.1);
          border: 1px solid #dc3545;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          color: #dc3545;
        }
        .dependency-list {
          list-style: none;
          padding: 0;
        }
        .dependency-item {
          padding: 8px 12px;
          margin: 5px 0;
          background-color: var(--vscode-input-background);
          border-radius: 4px;
          border-left: 3px solid var(--vscode-textLink-foreground);
        }
      </style>
    </head>
    <body>
      <div class="breadcrumb">
        ${spec.title} / ${task.id}
      </div>

      <h1>
        <span class="status-icon">${statusIcons[task.status]}</span>
        <div>
          <div>${task.id}</div>
          <span class="status-badge">${task.status.replace('_', ' ')}</span>
        </div>
      </h1>

      <h2>Description</h2>
      <div class="description">
        ${task.description}
      </div>

      ${
        task.error
          ? `
        <h2>Error Message</h2>
        <div class="error-message">
          ${task.error}
        </div>
      `
          : ''
      }

      <h2>Task Details</h2>
      <div class="info-grid">
        ${
          task.estimated
            ? `
          <div class="info-card">
            <div class="info-label">Estimated Time</div>
            <div class="info-value">${task.estimated}</div>
          </div>
        `
            : ''
        }
        <div class="info-card">
          <div class="info-label">Attempts</div>
          <div class="info-value">${task.attempts || 0}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Parallel Execution</div>
          <div class="info-value">${task.parallel ? 'Yes' : 'No'}</div>
        </div>
        ${
          task.completedAt
            ? `
          <div class="info-card">
            <div class="info-label">Completed At</div>
            <div class="info-value" style="font-size: 14px">${new Date(task.completedAt).toLocaleString()}</div>
          </div>
        `
            : ''
        }
      </div>

      ${
        task.dependencies && task.dependencies.length > 0
          ? `
        <h2>Dependencies</h2>
        <ul class="dependency-list">
          ${task.dependencies
            .map(
              (dep: string) => `
            <li class="dependency-item">${dep}</li>
          `
            )
            .join('')}
        </ul>
      `
          : ''
      }

      <h2>Specification Context</h2>
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">Spec ID</div>
          <div class="info-value" style="font-size: 14px">${spec.id}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Spec Title</div>
          <div class="info-value" style="font-size: 14px">${spec.title}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Spec Status</div>
          <div class="info-value" style="font-size: 14px">${spec.status}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}
