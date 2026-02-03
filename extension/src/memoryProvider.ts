import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

interface MemoryDocument {
  name: string;
  path: string;
  sections: MemorySection[];
}

interface MemorySection {
  title: string;
  level: number;
  line: number;
}

class MemoryItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly document?: MemoryDocument,
    public readonly section?: MemorySection,
    public readonly isInfo?: boolean
  ) {
    super(label, collapsibleState);

    if (isInfo) {
      this.iconPath = new vscode.ThemeIcon('info');
      this.contextValue = 'info';
    } else if (document && !section) {
      // This is a document item
      this.iconPath = new vscode.ThemeIcon('file-text');
      this.contextValue = 'document';
      this.tooltip = `Memory document: ${document.name}`;
      // Add click command to open document in preview
      this.command = {
        command: 'eaiGofer.showMemoryDocument',
        title: 'Show Memory Document',
        arguments: [document]
      };
    } else if (section) {
      // This is a section item
      this.iconPath = new vscode.ThemeIcon('symbol-field');
      this.contextValue = 'section';
      this.tooltip = `${section.title} (line ${section.line})`;
      // Add click command to show section in document
      this.command = {
        command: 'eaiGofer.showMemorySection',
        title: 'Show Memory Section',
        arguments: [section, document]
      };
    }
  }
}

/**
 * Provides a tree view of memory documents in .specify/memory/
 */
export class MemoryProvider implements vscode.TreeDataProvider<MemoryItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<MemoryItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private documents: MemoryDocument[] = [];
  private memoryPath: string;
  private loadError: string | null = null;

  constructor(workspacePath: string) {
    console.log(`[EAI-GOFER] MemoryProvider initialized for workspace: ${workspacePath}`);
    this.memoryPath = path.join(workspacePath, '.specify', 'memory');
    this.loadMemoryDocuments();
  }

  refresh(): void {
    this.loadMemoryDocuments();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: MemoryItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MemoryItem): Promise<MemoryItem[]> {
    // Check for load errors
    if (this.loadError && !element) {
      const errorItem = new MemoryItem(
        `Error: ${this.loadError}`,
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        true
      );
      errorItem.iconPath = new vscode.ThemeIcon('error');
      errorItem.tooltip = `Memory path: ${this.memoryPath}\n\nError: ${this.loadError}`;
      return [errorItem];
    }

    if (!element) {
      // Root level - show all documents
      if (this.documents.length === 0) {
        const emptyItem = new MemoryItem(
          'No memory documents found',
          vscode.TreeItemCollapsibleState.None,
          undefined,
          undefined,
          true
        );
        emptyItem.iconPath = new vscode.ThemeIcon('info');
        return [emptyItem];
      }

      return this.documents.map(doc =>
        new MemoryItem(
          doc.name,
          doc.sections.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          doc
        )
      );
    }

    // Show sections for a document
    if (element.document && !element.section) {
      return element.document.sections.map(section =>
        new MemoryItem(
          section.title,
          vscode.TreeItemCollapsibleState.None,
          element.document,
          section
        )
      );
    }

    return [];
  }

  private async loadMemoryDocuments(): Promise<void> {
    try {
      console.log(`[EAI-GOFER] Loading memory documents from: ${this.memoryPath}`);

      // Check if memory directory exists
      try {
        await fs.access(this.memoryPath);
      } catch {
        this.loadError = 'Memory directory not found';
        console.log('[EAI-GOFER] Memory directory does not exist');
        return;
      }

      // Read all files in memory directory
      const files = await fs.readdir(this.memoryPath);
      const markdownFiles = files.filter(f => f.endsWith('.md'));

      console.log(`[EAI-GOFER] Found ${markdownFiles.length} markdown files in memory`);

      this.documents = await Promise.all(
        markdownFiles.map(async (file) => {
          const filePath = path.join(this.memoryPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const sections = this.parseMarkdownSections(content);

          return {
            name: file.replace('.md', ''),
            path: filePath,
            sections
          };
        })
      );

      this.loadError = null;
      console.log(`[EAI-GOFER] Loaded ${this.documents.length} memory documents`);
    } catch (error) {
      this.loadError = `Failed to load memory documents: ${error}`;
      console.error('[EAI-GOFER] Error loading memory documents:', error);
    }
  }

  private parseMarkdownSections(content: string): MemorySection[] {
    const sections: MemorySection[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();

        sections.push({
          title,
          level,
          line: i + 1
        });
      }
    }

    return sections;
  }
}
