/**
 * MCP Configuration Helper
 *
 * Creates .vscode/mcp.json for VSCode's native MCP support (1.102+)
 * This allows Claude Code and GitHub Copilot to discover SpecGofer's MCP tools
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export class MCPConfigHelper {
  constructor(
    private workspacePath: string,
    private context: vscode.ExtensionContext
  ) {}

  /**
   * Create or update .vscode/mcp.json with SpecGofer MCP server configuration
   */
  async createOrUpdateConfig(): Promise<void> {
    const vscodeDir = path.join(this.workspacePath, '.vscode');
    const mcpConfigPath = path.join(vscodeDir, 'mcp.json');

    // Ensure .vscode directory exists
    try {
      await fs.mkdir(vscodeDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create .vscode directory:', error);
    }

    // Get the path to the language server (works in both dev and production)
    const serverPath = this.context.asAbsolutePath(
      path.join('language-server', 'dist', 'server.js')
    );

    // MCP configuration
    const mcpConfig = {
      mcp: {
        servers: {
          specgofer: {
            command: 'node',
            args: [serverPath],
            env: {
              ANTHROPIC_API_KEY: '${env:ANTHROPIC_API_KEY}',
            },
            description: 'SpecGofer - Spec-driven development orchestrator',
          },
        },
      },
    };

    // Check if file already exists
    let existingConfig: any = {};
    try {
      const content = await fs.readFile(mcpConfigPath, 'utf-8');
      existingConfig = JSON.parse(content);
    } catch {
      // File doesn't exist or is invalid, will create new
    }

    // Merge configurations
    const mergedConfig = {
      ...existingConfig,
      mcp: {
        ...existingConfig.mcp,
        servers: {
          ...existingConfig.mcp?.servers,
          specgofer: mcpConfig.mcp.servers.specgofer,
        },
      },
    };

    // Write configuration
    try {
      await fs.writeFile(mcpConfigPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
      console.log('MCP configuration created/updated:', mcpConfigPath);
    } catch (error) {
      console.error('Failed to write MCP configuration:', error);
      throw error;
    }
  }

  /**
   * Check if MCP configuration exists
   */
  async configExists(): Promise<boolean> {
    const mcpConfigPath = path.join(this.workspacePath, '.vscode', 'mcp.json');
    try {
      await fs.access(mcpConfigPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get MCP configuration status
   */
  async getStatus(): Promise<{
    exists: boolean;
    configured: boolean;
    hasApiKey: boolean;
  }> {
    const exists = await this.configExists();

    if (!exists) {
      return { exists: false, configured: false, hasApiKey: false };
    }

    const mcpConfigPath = path.join(this.workspacePath, '.vscode', 'mcp.json');
    try {
      const content = await fs.readFile(mcpConfigPath, 'utf-8');
      const config = JSON.parse(content);

      const configured = !!config.mcp?.servers?.specgofer;
      const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

      return { exists: true, configured, hasApiKey };
    } catch {
      return { exists: true, configured: false, hasApiKey: false };
    }
  }

  /**
   * Show setup instructions to user
   */
  async showSetupInstructions(): Promise<void> {
    const status = await this.getStatus();

    if (!status.configured) {
      const choice = await vscode.window.showInformationMessage(
        '🤖 SpecGofer MCP Tools Available!\n\n' +
          'Configure MCP to enable Claude Code and GitHub Copilot integration?',
        { modal: false },
        'Configure Now',
        'Learn More',
        'Later'
      );

      if (choice === 'Configure Now') {
        await this.createOrUpdateConfig();

        if (!status.hasApiKey) {
          vscode.window.showWarningMessage(
            'MCP configured! Set ANTHROPIC_API_KEY environment variable to enable Claude integration.',
            'OK'
          );
        } else {
          vscode.window.showInformationMessage(
            '✅ MCP configured! Reload VSCode to activate SpecGofer MCP tools.',
            'Reload Now'
          ).then((choice) => {
            if (choice === 'Reload Now') {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
          });
        }
      } else if (choice === 'Learn More') {
        vscode.env.openExternal(
          vscode.Uri.parse('https://code.visualstudio.com/blogs/2025/06/12/full-mcp-spec-support')
        );
      }
    }
  }

  /**
   * Create configuration silently (for auto-setup)
   */
  async autoSetup(): Promise<boolean> {
    try {
      const exists = await this.configExists();
      if (!exists) {
        await this.createOrUpdateConfig();
        console.log('MCP configuration auto-created');
        return true;
      }
      return false;
    } catch (error) {
      console.error('MCP auto-setup failed:', error);
      return false;
    }
  }
}
