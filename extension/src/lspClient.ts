/**
 * LSP Client for SpecGofer Language Server
 *
 * Manages connection to the Language Server and provides methods
 * for communication
 */

import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

export class SpecGoferLSPClient {
  private client: LanguageClient | undefined;
  private outputChannel: vscode.OutputChannel;

  constructor(private context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel('SpecGofer Language Server');
  }

  async start(): Promise<void> {
    // Get the path to the language server
    // In production VSIX: language-server is copied into extension directory
    // In development: language-server is in parent directory
    const fs = require('fs');

    // Log extension path for debugging
    const extensionPath = this.context.extensionPath;
    this.outputChannel.appendLine(`Extension path: ${extensionPath}`);
    this.outputChannel.appendLine(`Checking for Language Server...`);

    let serverModule = this.context.asAbsolutePath(
      path.join('language-server', 'dist', 'server.js')
    );
    this.outputChannel.appendLine(`Trying production path: ${serverModule}`);
    this.outputChannel.appendLine(`  Exists: ${fs.existsSync(serverModule)}`);

    // Fallback to development path if not found in production location
    if (!fs.existsSync(serverModule)) {
      serverModule = this.context.asAbsolutePath(
        path.join('..', 'language-server', 'dist', 'server.js')
      );
      this.outputChannel.appendLine(`Trying development path: ${serverModule}`);
      this.outputChannel.appendLine(`  Exists: ${fs.existsSync(serverModule)}`);
    }

    // Check if server exists
    if (!fs.existsSync(serverModule)) {
      // List what's actually in the extension directory
      try {
        const contents = fs.readdirSync(extensionPath);
        this.outputChannel.appendLine(`Extension directory contents: ${contents.join(', ')}`);
      } catch (err) {
        this.outputChannel.appendLine(`Failed to list directory: ${err}`);
      }

      vscode.window.showErrorMessage(
        'SpecGofer Language Server not found. Check Output panel (SpecGofer Language Server) for details.'
      );
      this.outputChannel.show();
      return;
    }

    this.outputChannel.appendLine(`✓ Language Server found at: ${serverModule}`);

    // Server options
    const serverOptions: ServerOptions = {
      run: {
        module: serverModule,
        transport: TransportKind.ipc,
      },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: {
          execArgv: ['--nolazy', '--inspect=6009'],
        },
      },
    };

    // Client options
    const clientOptions: LanguageClientOptions = {
      // Register the server for Markdown documents in .specify/
      documentSelector: [
        {
          scheme: 'file',
          language: 'markdown',
          pattern: '**/.specify/**/*.md',
        },
      ],
      synchronize: {
        // Synchronize configuration changes
        configurationSection: 'specGofer',
        fileEvents: vscode.workspace.createFileSystemWatcher('**/.specify/**/*'),
      },
      outputChannel: this.outputChannel,
    };

    // Create the language client
    this.client = new LanguageClient(
      'specGoferLanguageServer',
      'SpecGofer Language Server',
      serverOptions,
      clientOptions
    );

    // Start the client (also starts the server)
    try {
      await this.client.start();
      this.outputChannel.appendLine('SpecGofer Language Server started successfully');

      // Register notification handlers
      this.registerNotificationHandlers();
    } catch (error) {
      this.outputChannel.appendLine(`Failed to start Language Server: ${error}`);
      vscode.window.showErrorMessage(`SpecGofer Language Server failed to start: ${error}`);
    }
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.stop();
      this.outputChannel.appendLine('SpecGofer Language Server stopped');
    }
  }

  /**
   * Send a custom request to the Language Server
   */
  async sendRequest<T>(method: string, params?: any): Promise<T> {
    if (!this.client) {
      throw new Error('Language Server not started');
    }

    try {
      return await this.client.sendRequest(method, params);
    } catch (error) {
      this.outputChannel.appendLine(`Request ${method} failed: ${error}`);
      throw error;
    }
  }

  /**
   * Send a notification to the Language Server (no response expected)
   */
  sendNotification(method: string, params?: any): void {
    if (!this.client) {
      throw new Error('Language Server not started');
    }

    this.client.sendNotification(method, params);
  }

  /**
   * Register handlers for notifications from the Language Server
   */
  private registerNotificationHandlers(): void {
    if (!this.client) {
      return;
    }

    // Handle task progress notifications
    this.client.onNotification('specKit/taskProgress', (params: any) => {
      this.outputChannel.appendLine(
        `Task progress: ${params.specId}/${params.taskId} → ${params.status}`
      );

      // Trigger UI refresh
      vscode.commands.executeCommand('specKit.refreshSpecs');
    });
  }

  /**
   * LSP Custom Methods
   */

  async getSpecs(): Promise<any> {
    return this.sendRequest('specKit/getSpecs', {
      workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    });
  }

  async executeTask(specId: string, taskId: string, context?: any): Promise<any> {
    return this.sendRequest('specKit/executeTask', {
      specId,
      taskId,
      context,
    });
  }

  async updateTaskStatus(specId: string, taskId: string, status: string): Promise<any> {
    return this.sendRequest('specKit/updateTaskStatus', {
      specId,
      taskId,
      status,
    });
  }

  isRunning(): boolean {
    return this.client !== undefined;
  }
}
