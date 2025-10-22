import * as vscode from 'vscode';

/**
 * Extension configuration constants and settings management
 * Centralizes all configuration values and provides typed access to VSCode settings
 */

// Extension constants
export const EXTENSION_NAME = 'specgofer';
export const EXTENSION_DISPLAY_NAME = 'SpecGofer (Enterprise AI)';
export const EXTENSION_VERSION = '1.3.4';

// File and folder constants
export const SPECIFY_FOLDER = '.specify';
export const SPECS_FOLDER = 'specs';
export const MEMORY_FOLDER = 'memory';
export const TEMPLATES_FOLDER = 'templates';
export const CONSTITUTION_FILE = 'constitution.md';
export const MCP_CONFIG_FILE = '.vscode/mcp.json';

// GitHub constants
export const GITHUB_OWNER = 'eai-tools';
export const GITHUB_REPO = 'spec-kit-templates';
export const GITHUB_API_BASE = 'https://api.github.com';

// Language Server constants
export const LSP_SERVER_NAME = 'SpecGofer Language Server';
export const LSP_SERVER_ID = 'specgofer-lsp';
export const LSP_SERVER_EXECUTABLE = 'node';

// MCP Tool names
export const MCP_TOOLS = {
  getSpecs: 'specgofer_get_specs',
  getNextTask: 'specgofer_get_next_task',
  executeTask: 'specgofer_execute_task',
  updateTaskStatus: 'specgofer_update_task_status',
  validateCode: 'specgofer_validate_code',
  runTests: 'specgofer_run_tests',
} as const;

// Commands
export const COMMANDS = {
  initialize: 'specKit.initialize',
  upgrade: 'specKit.upgrade',
  checkVersion: 'specKit.checkVersion',
  refreshSpecs: 'specKit.refreshSpecs',
  refreshConstitution: 'specKit.refreshConstitution',
  showProgress: 'specKit.showProgress',
  showConstitution: 'specKit.showConstitution',
  checkForUpdates: 'specKit.checkForUpdates',
  updateNow: 'specKit.updateNow',
} as const;

// View IDs
export const VIEWS = {
  progress: 'specKitProgress',
  constitution: 'specKitConstitution',
  container: 'spec-kit',
} as const;

// Configuration keys
export const CONFIG_KEYS = {
  anthropicApiKey: 'specKit.anthropicApiKey',
  autoInitialize: 'specKit.autoInitialize',
  preferredAi: 'specKit.preferredAI',
  autoUpdateCheck: 'specKit.autoUpdateCheck',
  telemetryEnabled: 'specKit.telemetryEnabled',
  updateCheckInterval: 'specKit.updateCheckInterval',
  performanceMode: 'specKit.performanceMode',
} as const;

// Default values
export const DEFAULTS = {
  autoInitialize: false,
  preferredAi: 'claude',
  autoUpdateCheck: true,
  telemetryEnabled: true,
  updateCheckInterval: 24 * 60 * 60 * 1000, // 24 hours in ms
  performanceMode: 'balanced',
} as const;

// File patterns
export const FILE_PATTERNS = {
  SPEC_MARKDOWN: '**/specs/**/spec.md',
  TASK_MARKDOWN: '**/specs/**/tasks.md',
  CONSTITUTION: '**/memory/constitution.md',
  CLAUDE_INPUT: '.claude-input.txt',
  CLAUDE_OUTPUT: '.claude-output.txt',
  GITIGNORE: '.gitignore',
} as const;

/**
 * Configuration manager class for type-safe access to VSCode settings
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: vscode.WorkspaceConfiguration;

  private constructor() {
    this.config = vscode.workspace.getConfiguration('specKit');
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Refresh configuration (call when settings change)
   */
  public refresh(): void {
    this.config = vscode.workspace.getConfiguration('specKit');
  }

  /**
   * Get Anthropic API key
   */
  public getAnthropicApiKey(): string {
    return this.config.get<string>(CONFIG_KEYS.anthropicApiKey.replace('specKit.', ''), '') || '';
  }

  /**
   * Get auto-initialize setting
   */
  public getAutoInitialize(): boolean {
    return this.config.get<boolean>(CONFIG_KEYS.autoInitialize.replace('specKit.', ''), DEFAULTS.autoInitialize);
  }

  /**
   * Set auto-initialize setting
   */
  public async setAutoInitialize(value: boolean, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
    await this.config.update(CONFIG_KEYS.autoInitialize.replace('specKit.', ''), value, target);
  }

  /**
   * Get preferred AI setting
   */
  public getPreferredAI(): string {
    return this.config.get<string>(CONFIG_KEYS.preferredAi.replace('specKit.', ''), DEFAULTS.preferredAi);
  }

  /**
   * Get auto-update check setting
   */
  public getAutoUpdateCheck(): boolean {
    return this.config.get<boolean>(CONFIG_KEYS.autoUpdateCheck.replace('specKit.', ''), DEFAULTS.autoUpdateCheck);
  }

  /**
   * Get telemetry enabled setting
   */
  public getTelemetryEnabled(): boolean {
    return this.config.get<boolean>(CONFIG_KEYS.telemetryEnabled.replace('specKit.', ''), DEFAULTS.telemetryEnabled);
  }

  /**
   * Get update check interval
   */
  public getUpdateCheckInterval(): number {
    return this.config.get<number>(CONFIG_KEYS.updateCheckInterval.replace('specKit.', ''), DEFAULTS.updateCheckInterval);
  }

  /**
   * Get performance mode
   */
  public getPerformanceMode(): 'fast' | 'balanced' | 'thorough' {
    return this.config.get<'fast' | 'balanced' | 'thorough'>(CONFIG_KEYS.performanceMode.replace('specKit.', ''), DEFAULTS.performanceMode as 'balanced');
  }

  /**
   * Get all configuration as object
   */
  public getAll(): Record<string, any> {
    return {
      anthropicApiKey: this.getAnthropicApiKey(),
      autoInitialize: this.getAutoInitialize(),
      preferredAI: this.getPreferredAI(),
      autoUpdateCheck: this.getAutoUpdateCheck(),
      telemetryEnabled: this.getTelemetryEnabled(),
      updateCheckInterval: this.getUpdateCheckInterval(),
      performanceMode: this.getPerformanceMode(),
    };
  }
}

/**
 * Get workspace-specific paths
 */
export function getWorkspacePaths(workspacePath: string) {
  const path = require('path');
  
  return {
    specify: path.join(workspacePath, SPECIFY_FOLDER),
    specs: path.join(workspacePath, SPECIFY_FOLDER, SPECS_FOLDER),
    memory: path.join(workspacePath, SPECIFY_FOLDER, MEMORY_FOLDER),
    templates: path.join(workspacePath, SPECIFY_FOLDER, TEMPLATES_FOLDER),
    constitution: path.join(workspacePath, SPECIFY_FOLDER, MEMORY_FOLDER, CONSTITUTION_FILE),
    mcpConfig: path.join(workspacePath, MCP_CONFIG_FILE),
    claudeInput: path.join(workspacePath, FILE_PATTERNS.CLAUDE_INPUT),
    claudeOutput: path.join(workspacePath, FILE_PATTERNS.CLAUDE_OUTPUT),
  };
}

/**
 * Validation helpers
 */
export const VALIDATION = {
  /**
   * Check if a path is within the .specify folder
   */
  isSpecifyPath(filePath: string, workspacePath: string): boolean {
    const path = require('path');
    const specifyPath = path.join(workspacePath, SPECIFY_FOLDER);
    return filePath.startsWith(specifyPath);
  },

  /**
   * Check if a file is a spec file
   */
  isSpecFile(filePath: string): boolean {
    return filePath.includes('/specs/') && filePath.endsWith('/spec.md');
  },

  /**
   * Check if a file is a tasks file
   */
  isTasksFile(filePath: string): boolean {
    return filePath.includes('/specs/') && filePath.endsWith('/tasks.md');
  },

  /**
   * Check if a file is the constitution
   */
  isConstitutionFile(filePath: string): boolean {
    return filePath.includes('/memory/') && filePath.endsWith('/constitution.md');
  },
};