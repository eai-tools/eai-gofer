import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Show spec details using VSCode's native markdown preview
 */
export async function showSpecDetailsWebview(context: vscode.ExtensionContext, spec: any) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  // Try to open the spec.md file
  const specFile = path.join(workspaceFolder.uri.fsPath, '.specify', 'specs', spec.id, 'spec.md');
  try {
    const uri = vscode.Uri.file(specFile);
    const doc = await vscode.workspace.openTextDocument(uri);

    // Open in markdown preview
    await vscode.commands.executeCommand('markdown.showPreview', uri);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open specification: ${error}`);
  }
}

/**
 * Show task details in a webview panel
 */
export function showTaskDetailsWebview(context: vscode.ExtensionContext, task: any, spec: any) {
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
export async function showArticleDetailsWebview(context: vscode.ExtensionContext, article: any) {
  await openConstitutionPreview();
}

/**
 * Show section details using VSCode's native markdown preview
 */
export async function showSectionDetailsWebview(context: vscode.ExtensionContext, section: any, article: any) {
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

  const constitutionFile = path.join(workspaceFolder.uri.fsPath, '.specify', 'memory', 'constitution.md');
  try {
    const uri = vscode.Uri.file(constitutionFile);
    const doc = await vscode.workspace.openTextDocument(uri);

    // Open in markdown preview
    await vscode.commands.executeCommand('markdown.showPreview', uri);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open constitution: ${error}`);
  }
}

/**
 * Show memory document using VSCode's native markdown preview
 */
export async function showMemoryDocumentWebview(context: vscode.ExtensionContext, document: any) {
  try {
    const uri = vscode.Uri.file(document.path);
    const doc = await vscode.workspace.openTextDocument(uri);

    // Open in markdown preview
    await vscode.commands.executeCommand('markdown.showPreview', uri);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open memory document: ${error}`);
  }
}

/**
 * Show memory section using VSCode's native markdown preview
 * Opens the document and scrolls to the section
 */
export async function showMemorySectionWebview(context: vscode.ExtensionContext, section: any, document: any) {
  try {
    const uri = vscode.Uri.file(document.path);
    const doc = await vscode.workspace.openTextDocument(uri);

    // Open in editor first (to allow scrolling to line)
    const editor = await vscode.window.showTextDocument(doc, {
      preview: true,
      viewColumn: vscode.ViewColumn.One
    });

    // Scroll to the section line
    const position = new vscode.Position(section.line - 1, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);

    // Then show preview
    await vscode.commands.executeCommand('markdown.showPreview', uri);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open memory section: ${error}`);
  }
}

function getSpecDetailsHTML(spec: any, stats: any): string {
  const { total, completed, inProgress, testing, failed, blocked, pending, percentage } = stats;

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
        }
        h2 {
          color: var(--vscode-editor-foreground);
          margin-top: 30px;
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 5px;
        }
        .progress-bar {
          width: 100%;
          height: 30px;
          background-color: var(--vscode-input-background);
          border-radius: 15px;
          overflow: hidden;
          margin: 15px 0;
          border: 1px solid var(--vscode-panel-border);
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #28a745, #20c997);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          transition: width 0.3s ease;
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
          font-size: 20px;
          font-weight: bold;
        }
        .description {
          background-color: var(--vscode-textBlockQuote-background);
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid var(--vscode-textBlockQuote-border);
          margin: 15px 0;
          white-space: pre-wrap;
        }
        .task-list {
          margin-top: 20px;
        }
        .task-item {
          padding: 12px;
          margin: 8px 0;
          background-color: var(--vscode-input-background);
          border-radius: 6px;
          border-left: 4px solid;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .task-item.completed { border-left-color: #28a745; }
        .task-item.in_progress { border-left-color: #007acc; }
        .task-item.testing { border-left-color: #6f42c1; }
        .task-item.failed { border-left-color: #dc3545; }
        .task-item.blocked { border-left-color: #fd7e14; }
        .task-item.pending { border-left-color: #6c757d; }
        .task-icon {
          font-size: 18px;
        }
        .task-content {
          flex: 1;
        }
        .task-id {
          font-weight: bold;
          color: var(--vscode-textLink-foreground);
        }
      </style>
    </head>
    <body>
      <h1>${spec.title}</h1>

      <div class="description">
        ${spec.description || 'No description provided'}
      </div>

      <h2>Progress Overview</h2>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%">
          ${percentage}%
        </div>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">Total Tasks</div>
          <div class="info-value">${total}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Completed</div>
          <div class="info-value" style="color: #28a745">${completed}</div>
        </div>
        <div class="info-card">
          <div class="info-label">In Progress</div>
          <div class="info-value" style="color: #007acc">${inProgress}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Testing</div>
          <div class="info-value" style="color: #6f42c1">${testing}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Failed</div>
          <div class="info-value" style="color: #dc3545">${failed}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Blocked</div>
          <div class="info-value" style="color: #fd7e14">${blocked}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Pending</div>
          <div class="info-value" style="color: #6c757d">${pending}</div>
        </div>
      </div>

      <h2>Task Breakdown</h2>
      <div class="task-list">
        ${spec.tasks.map((task: any) => {
          const icons: Record<string, string> = {
            completed: '✓',
            in_progress: '⟳',
            testing: '⚗',
            failed: '✗',
            blocked: '🔒',
            pending: '○'
          };
          return `
            <div class="task-item ${task.status}">
              <span class="task-icon">${icons[task.status] || '○'}</span>
              <div class="task-content">
                <span class="task-id">${task.id}</span> - ${task.description}
                ${task.dependencies.length > 0 ? `<br><small>Dependencies: ${task.dependencies.join(', ')}</small>` : ''}
                ${task.estimated ? `<br><small>Estimated: ${task.estimated}</small>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <h2>Metadata</h2>
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">ID</div>
          <div class="info-value" style="font-size: 14px">${spec.id}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Status</div>
          <div class="info-value" style="font-size: 14px">${spec.status}</div>
        </div>
        ${spec.author ? `
          <div class="info-card">
            <div class="info-label">Author</div>
            <div class="info-value" style="font-size: 14px">${spec.author}</div>
          </div>
        ` : ''}
        <div class="info-card">
          <div class="info-label">Created</div>
          <div class="info-value" style="font-size: 14px">${new Date(spec.created).toLocaleDateString()}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Updated</div>
          <div class="info-value" style="font-size: 14px">${new Date(spec.updated).toLocaleDateString()}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getTaskDetailsHTML(task: any, spec: any): string {
  const statusColors: Record<string, string> = {
    completed: '#28a745',
    in_progress: '#007acc',
    testing: '#6f42c1',
    failed: '#dc3545',
    blocked: '#fd7e14',
    pending: '#6c757d'
  };

  const statusIcons: Record<string, string> = {
    completed: '✓',
    in_progress: '⟳',
    testing: '⚗',
    failed: '✗',
    blocked: '🔒',
    pending: '○'
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

      ${task.error ? `
        <h2>Error Message</h2>
        <div class="error-message">
          ${task.error}
        </div>
      ` : ''}

      <h2>Task Details</h2>
      <div class="info-grid">
        ${task.estimated ? `
          <div class="info-card">
            <div class="info-label">Estimated Time</div>
            <div class="info-value">${task.estimated}</div>
          </div>
        ` : ''}
        <div class="info-card">
          <div class="info-label">Attempts</div>
          <div class="info-value">${task.attempts || 0}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Parallel Execution</div>
          <div class="info-value">${task.parallel ? 'Yes' : 'No'}</div>
        </div>
        ${task.completedAt ? `
          <div class="info-card">
            <div class="info-label">Completed At</div>
            <div class="info-value" style="font-size: 14px">${new Date(task.completedAt).toLocaleString()}</div>
          </div>
        ` : ''}
      </div>

      ${task.dependencies && task.dependencies.length > 0 ? `
        <h2>Dependencies</h2>
        <ul class="dependency-list">
          ${task.dependencies.map((dep: string) => `
            <li class="dependency-item">${dep}</li>
          `).join('')}
        </ul>
      ` : ''}

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

function getArticleDetailsHTML(article: any): string {
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
          line-height: 1.6;
        }
        h1 {
          color: var(--vscode-editor-foreground);
          border-bottom: 3px solid var(--vscode-textLink-foreground);
          padding-bottom: 15px;
          margin-bottom: 30px;
        }
        .article-number {
          color: var(--vscode-textLink-foreground);
          font-size: 24px;
          font-weight: bold;
        }
        .section {
          background-color: var(--vscode-input-background);
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
          border-left: 4px solid var(--vscode-textLink-foreground);
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: var(--vscode-textLink-foreground);
          margin-bottom: 12px;
        }
        .section-content {
          white-space: pre-wrap;
          font-size: 14px;
          line-height: 1.8;
        }
        .section-number {
          display: inline-block;
          background-color: var(--vscode-textLink-foreground);
          color: var(--vscode-editor-background);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <h1>
        <span class="article-number">Article ${article.number}</span>
        <br>
        ${article.title}
      </h1>

      ${article.sections.map((section: any) => `
        <div class="section">
          <div class="section-title">
            <span class="section-number">${section.number}</span>
            ${section.title}
          </div>
          <div class="section-content">${section.content}</div>
        </div>
      `).join('')}
    </body>
    </html>
  `;
}

function getSectionDetailsHTML(section: any, article: any): string {
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
          line-height: 1.8;
        }
        h1 {
          color: var(--vscode-editor-foreground);
          border-bottom: 3px solid var(--vscode-textLink-foreground);
          padding-bottom: 15px;
          margin-bottom: 30px;
        }
        .breadcrumb {
          font-size: 13px;
          color: var(--vscode-descriptionForeground);
          margin-bottom: 20px;
        }
        .section-number {
          display: inline-block;
          background-color: var(--vscode-textLink-foreground);
          color: var(--vscode-editor-background);
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 15px;
        }
        .content {
          background-color: var(--vscode-textBlockQuote-background);
          padding: 25px;
          border-radius: 8px;
          border-left: 4px solid var(--vscode-textLink-foreground);
          white-space: pre-wrap;
          font-size: 15px;
          line-height: 1.8;
        }
      </style>
    </head>
    <body>
      <div class="breadcrumb">
        Article ${article.number}: ${article.title}
      </div>

      <span class="section-number">Section ${section.number}</span>

      <h1>${section.title}</h1>

      <div class="content">${section.content}</div>
    </body>
    </html>
  `;
}
