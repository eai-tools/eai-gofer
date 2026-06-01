/**
 * MCP Configuration Helper
 *
 * Creates .vscode/mcp.json for VSCode's native MCP support (1.102+)
 * This allows Claude Code and GitHub Copilot to discover Gofer's MCP tools
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Logger } from './utils/logger';

interface MCPWorkspaceConfig {
  mcp?: {
    servers?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export class MCPConfigHelper {
  private readonly logger = Logger.for('McpConfig');

  constructor(
    private workspacePath: string,
    private context: vscode.ExtensionContext
  ) {}

  /**
   * Create or update .vscode/mcp.json with Gofer MCP server configuration
   * T042, T083: Only create if provider supports MCP (Claude only)
   */
  async createOrUpdateConfig(): Promise<void> {
    // T083: Check if current provider supports MCP (Claude only)
    const goferConfig = vscode.workspace.getConfiguration('gofer');
    const defaultCLI = goferConfig.get<'claude' | 'copilot' | 'codex' | 'gemini' | 'auto'>(
      'defaultCLI',
      'auto'
    );
    const cliProvider = goferConfig.get<'claude' | 'codex' | 'copilot' | 'gemini' | 'auto'>(
      'cliProvider',
      'auto'
    );

    // MCP is only supported by Claude Code CLI
    const effectiveProvider = defaultCLI !== 'auto' ? defaultCLI : cliProvider;

    if (effectiveProvider === 'codex') {
      this.logger.info('Skipping MCP setup - Codex CLI does not support MCP servers');
      return;
    }

    if (effectiveProvider === 'copilot') {
      this.logger.info('Skipping MCP setup - GitHub Copilot Chat does not support MCP servers');
      return;
    }

    if (effectiveProvider === 'gemini') {
      this.logger.info('Skipping MCP setup - Gemini CLI does not support MCP servers');
      return;
    }

    const vscodeDir = path.join(this.workspacePath, '.vscode');
    const mcpConfigPath = path.join(vscodeDir, 'mcp.json');

    // Ensure .vscode directory exists
    try {
      await fs.mkdir(vscodeDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create .vscode directory:', error as Error);
    }

    // Get the path to the language server (works in both dev and production)
    const serverPath = this.context.asAbsolutePath(
      path.join('language-server', 'dist', 'server.js')
    );

    // MCP configuration
    const mcpConfig = {
      mcp: {
        servers: {
          gofer: {
            command: 'node',
            args: [serverPath],
            description: 'Gofer - Spec-driven development orchestrator',
          },
        },
      },
    };

    // Check if file already exists
    let existingConfig: MCPWorkspaceConfig = {};
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
          gofer: mcpConfig.mcp.servers.gofer,
        },
      },
    };

    // Write configuration
    try {
      await fs.writeFile(mcpConfigPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
      this.logger.info(`MCP configuration created/updated: ${mcpConfigPath}`);
    } catch (error) {
      this.logger.error('Failed to write MCP configuration:', error as Error);
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
    authDelegatedToCli: boolean;
  }> {
    const exists = await this.configExists();

    if (!exists) {
      return { exists: false, configured: false, authDelegatedToCli: true };
    }

    const mcpConfigPath = path.join(this.workspacePath, '.vscode', 'mcp.json');
    try {
      const content = await fs.readFile(mcpConfigPath, 'utf-8');
      const config = JSON.parse(content);

      const configured = !!config.mcp?.servers?.gofer;

      return { exists: true, configured, authDelegatedToCli: true };
    } catch {
      return { exists: true, configured: false, authDelegatedToCli: true };
    }
  }

  /**
   * Show setup instructions to user
   */
  async showSetupInstructions(): Promise<void> {
    const status = await this.getStatus();

    if (!status.configured) {
      const choice = await vscode.window.showInformationMessage(
        '🤖 Gofer MCP Tools Available!\n\n' +
          'Configure MCP to enable Claude Code and GitHub Copilot integration?',
        { modal: false },
        'Configure Now',
        'Learn More',
        'Later'
      );

      if (choice === 'Configure Now') {
        await this.createOrUpdateConfig();

        vscode.window
          .showInformationMessage(
            '✅ MCP configured! Reload VSCode to activate Gofer MCP tools.',
            'Reload Now'
          )
          .then((choice) => {
            if (choice === 'Reload Now') {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
          });
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
        this.logger.info('MCP configuration auto-created');
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('MCP auto-setup failed:', error as Error);
      return false;
    }
  }
}
