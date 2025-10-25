/**
 * Mock VSCode API for extension testing
 */

import { vi } from 'vitest';

export interface MockWorkspaceFolder {
  uri: {
    fsPath: string;
    path: string;
    scheme: string;
  };
  name: string;
  index: number;
}

export interface MockTextDocument {
  uri: {
    fsPath: string;
    path: string;
  };
  fileName: string;
  isUntitled: boolean;
  languageId: string;
  version: number;
  isDirty: boolean;
  isClosed: boolean;
  getText: () => string;
  save: () => Promise<boolean>;
}

export interface MockTreeItem {
  label: string;
  id?: string;
  tooltip?: string;
  description?: string;
  resourceUri?: { fsPath: string };
  iconPath?: string;
  collapsibleState?: number;
  contextValue?: string;
  command?: {
    command: string;
    title: string;
    arguments?: unknown[];
  };
}

export class MockVSCodeAPI {
  private workspaceFolders: MockWorkspaceFolder[] = [];
  private documents: MockTextDocument[] = [];
  private commands: Map<string, (...args: unknown[]) => unknown> = new Map();
  private treeItems: MockTreeItem[] = [];
  private outputChannels: Map<string, string[]> = new Map();

  constructor() {
    this.setupDefaultWorkspace();
  }

  private setupDefaultWorkspace(): void {
    this.workspaceFolders = [{
      uri: {
        fsPath: '/test/workspace',
        path: '/test/workspace',
        scheme: 'file'
      },
      name: 'test-workspace',
      index: 0
    }];
  }

  /**
   * Mock workspace API
   */
  public getWorkspaceMock(): Record<string, unknown> {
    return {
      workspaceFolders: this.workspaceFolders,
      getWorkspaceFolder: vi.fn().mockImplementation((uri) => {
        return this.workspaceFolders.find(folder => 
          uri.fsPath.startsWith(folder.uri.fsPath)
        );
      }),
      findFiles: vi.fn().mockResolvedValue([]),
      openTextDocument: vi.fn().mockImplementation(async (uri) => {
        const existing = this.documents.find(doc => doc.uri.fsPath === uri.fsPath);
        if (existing) {
          return existing;
        }
        
        const doc: MockTextDocument = {
          uri,
          fileName: uri.fsPath.split('/').pop() || '',
          isUntitled: false,
          languageId: 'typescript',
          version: 1,
          isDirty: false,
          isClosed: false,
          getText: () => '// Mock document content',
          save: vi.fn().mockResolvedValue(true),
        };
        this.documents.push(doc);
        return doc;
      }),
      onDidChangeWorkspaceFolders: vi.fn(),
      onDidChangeTextDocument: vi.fn(),
      createFileSystemWatcher: vi.fn().mockReturnValue({
        onDidCreate: vi.fn(),
        onDidChange: vi.fn(),
        onDidDelete: vi.fn(),
        dispose: vi.fn(),
      }),
    };
  }

  /**
   * Mock window API
   */
  public getWindowMock(): Record<string, unknown> {
    return {
      showInformationMessage: vi.fn().mockResolvedValue('OK'),
      showWarningMessage: vi.fn().mockResolvedValue('OK'),
      showErrorMessage: vi.fn().mockResolvedValue('OK'),
      showQuickPick: vi.fn().mockResolvedValue('Selected Item'),
      showInputBox: vi.fn().mockResolvedValue('User Input'),
      showTextDocument: vi.fn().mockResolvedValue({}),
      createOutputChannel: vi.fn().mockImplementation((name: string) => {
        if (!this.outputChannels.has(name)) {
          this.outputChannels.set(name, []);
        }
        return {
          appendLine: vi.fn().mockImplementation((text: string) => {
            const lines = this.outputChannels.get(name) || [];
            lines.push(text);
            this.outputChannels.set(name, lines);
          }),
          show: vi.fn(),
          hide: vi.fn(),
          dispose: vi.fn(),
        };
      }),
      registerTreeDataProvider: vi.fn(),
      createTreeView: vi.fn().mockReturnValue({
        reveal: vi.fn(),
        dispose: vi.fn(),
      }),
    };
  }

  /**
   * Mock commands API
   */
  public getCommandsMock(): Record<string, unknown> {
    return {
      registerCommand: vi.fn().mockImplementation((command: string, callback: (...args: unknown[]) => unknown) => {
        this.commands.set(command, callback);
        return { dispose: vi.fn() };
      }),
      executeCommand: vi.fn().mockImplementation(async (command: string, ...args: unknown[]) => {
        const handler = this.commands.get(command);
        if (handler) {
          return handler(...args);
        }
        throw new Error(`Command '${command}' not found`);
      }),
      getCommands: vi.fn().mockResolvedValue(Array.from(this.commands.keys())),
    };
  }

  /**
   * Mock extension context
   */
  public getExtensionContextMock(): Record<string, unknown> {
    return {
      subscriptions: [],
      workspaceState: {
        get: vi.fn().mockReturnValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      },
      globalState: {
        get: vi.fn().mockReturnValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      },
      extensionPath: '/test/extension',
      extensionUri: {
        fsPath: '/test/extension',
        path: '/test/extension',
        scheme: 'file',
      },
      storageUri: {
        fsPath: '/test/storage',
        path: '/test/storage',
        scheme: 'file',
      },
      globalStorageUri: {
        fsPath: '/test/global-storage',
        path: '/test/global-storage',
        scheme: 'file',
      },
      logUri: {
        fsPath: '/test/logs',
        path: '/test/logs',
        scheme: 'file',
      },
      asAbsolutePath: vi.fn().mockImplementation((path: string) => `/test/extension/${path}`),
    };
  }

  /**
   * Mock progress API
   */
  public getProgressMock(): Record<string, unknown> {
    return {
      withProgress: vi.fn().mockImplementation(async (options, task) => {
        const progress = {
          report: vi.fn(),
        };
        const token = {
          isCancellationRequested: false,
          onCancellationRequested: vi.fn(),
        };
        return task(progress, token);
      }),
    };
  }

  /**
   * Add tree items for testing
   */
  public addTreeItem(item: MockTreeItem): void {
    this.treeItems.push(item);
  }

  /**
   * Get tree items
   */
  public getTreeItems(): MockTreeItem[] {
    return [...this.treeItems];
  }

  /**
   * Get output channel content
   */
  public getOutputChannelContent(name: string): string[] {
    return this.outputChannels.get(name) || [];
  }

  /**
   * Simulate workspace folder change
   */
  public addWorkspaceFolder(folder: MockWorkspaceFolder): void {
    this.workspaceFolders.push(folder);
  }

  /**
   * Clear all mocks
   */
  public reset(): void {
    this.workspaceFolders = [];
    this.documents = [];
    this.commands.clear();
    this.treeItems = [];
    this.outputChannels.clear();
    this.setupDefaultWorkspace();
  }

  /**
   * Get complete VSCode mock
   */
  public getVSCodeMock(): Record<string, unknown> {
    return {
      workspace: this.getWorkspaceMock(),
      window: this.getWindowMock(),
      commands: this.getCommandsMock(),
      ProgressLocation: { Notification: 15 },
      TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
      ExtensionContext: this.getExtensionContextMock(),
      Uri: {
        file: vi.fn().mockImplementation((path: string) => ({
          fsPath: path,
          path,
          scheme: 'file',
        })),
        parse: vi.fn().mockImplementation((uri: string) => ({
          fsPath: uri,
          path: uri,
          scheme: 'file',
        })),
      },
    };
  }
}

export default MockVSCodeAPI;