import * as vscode from 'vscode';

/**
 * Extension configuration constants and settings management
 * Centralizes all configuration values and provides typed access to VSCode settings
 */

// Extension constants
export const EXTENSION_NAME = 'gofer';
export const EXTENSION_DISPLAY_NAME = 'Gofer (Enterprise AI)';
// Read version from package.json to keep it in sync
export const EXTENSION_VERSION = require('../../package.json').version;

// File and folder constants
export const SPECIFY_FOLDER = '.specify';
export const SPECS_FOLDER = 'specs';
export const MEMORY_FOLDER = 'memory';
export const TEMPLATES_FOLDER = 'templates';
export const CONSTITUTION_FILE = 'constitution.md';
export const MCP_CONFIG_FILE = '.vscode/mcp.json';

// GitHub constants
export const GITHUB_OWNER = 'eai-tools';
export const GITHUB_REPO = 'gofer-templates';
export const GITHUB_API_BASE = 'https://api.github.com';

// Language Server constants
export const LSP_SERVER_NAME = 'Gofer Language Server';
export const LSP_SERVER_ID = 'gofer-lsp';
export const LSP_SERVER_EXECUTABLE = 'node';

// MCP Tool names
export const MCP_TOOLS = {
  getSpecs: 'gofer_get_specs',
  getNextTask: 'gofer_get_next_task',
  executeTask: 'gofer_execute_task',
  updateTaskStatus: 'gofer_update_task_status',
  validateCode: 'gofer_validate_code',
  runTests: 'gofer_run_tests',
} as const;

// Commands
export const COMMANDS = {
  initialize: 'gofer.initialize',
  upgrade: 'gofer.upgrade',
  checkVersion: 'gofer.checkVersion',
  refreshSpecs: 'gofer.refreshSpecs',
  refreshConstitution: 'gofer.refreshConstitution',
  showProgress: 'gofer.showProgress',
  showConstitution: 'gofer.showConstitution',
  checkForUpdates: 'gofer.checkForUpdates',
  updateNow: 'gofer.updateNow',
} as const;

// View IDs
export const VIEWS = {
  progress: 'goferProgress',
  aiUsage: 'goferAIUsage',
  memory: 'goferMemory',
  container: 'gofer',
} as const;

// Configuration keys
export const CONFIG_KEYS = {
  anthropicApiKey: 'gofer.anthropicApiKey',
  googleApiKey: 'gofer.googleApiKey',
  openaiApiKey: 'gofer.openaiApiKey',
  claudeCodeMode: 'gofer.claudeCodeMode',
  claudeCodeCommand: 'gofer.claudeCodeCommand',
  autoInitialize: 'gofer.autoInitialize',
  preferredAi: 'gofer.preferredAI',
  autoUpdateCheck: 'gofer.autoUpdateCheck',
  telemetryEnabled: 'gofer.telemetryEnabled',
  updateCheckInterval: 'gofer.updateCheckInterval',
  performanceMode: 'gofer.performanceMode',
  yoloSlopReductionEnabled: 'gofer.yoloSlopReduction.enabled',
  yoloSlopReductionNotifyEvery: 'gofer.yoloSlopReduction.notifyEvery',
  contextWindowAutoExecuteSave: 'gofer.contextWindow.autoExecuteSave',
  contextWindowAutoSaveThreshold: 'gofer.contextWindow.autoSaveThreshold',
  contextWindowAutoResumeAfterSave: 'gofer.contextWindow.autoResumeAfterSave',
  scopeGuardMode: 'gofer.scopeGuard.mode',
  budgetMaxCostUsd: 'gofer.budgets.maxCostUsd',
  budgetMaxTokensPerRun: 'gofer.budgets.maxTokensPerRun',
  budgetEnforcementMode: 'gofer.budgets.enforcementMode',
} as const;

// Default values
export const DEFAULTS = {
  claudeCodeMode: 'standard' as const,
  claudeCodeCommand: 'claude',
  autoInitialize: false,
  preferredAi: 'claude',
  autoUpdateCheck: true,
  telemetryEnabled: true,
  updateCheckInterval: 24 * 60 * 60 * 1000, // 24 hours in ms
  performanceMode: 'balanced',
  yoloSlopReductionEnabled: true,
  yoloSlopReductionNotifyEvery: 10,
  contextWindowAutoExecuteSave: true,
  contextWindowAutoSaveThreshold: 0.65,
  contextWindowAutoResumeAfterSave: true,
  scopeGuardMode: 'warning',
  budgetMaxCostUsd: 10.0,
  budgetMaxTokensPerRun: 500_000,
  budgetEnforcementMode: 'advisory',
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
    this.config = vscode.workspace.getConfiguration('gofer');
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
    this.config = vscode.workspace.getConfiguration('gofer');
  }

  /**
   * Get Anthropic API key
   */
  public getAnthropicApiKey(): string {
    return this.config.get<string>(CONFIG_KEYS.anthropicApiKey.replace('gofer.', ''), '') || '';
  }

  /**
   * Get Google AI API key (for Gemini)
   */
  public getGoogleApiKey(): string {
    return this.config.get<string>(CONFIG_KEYS.googleApiKey.replace('gofer.', ''), '') || '';
  }

  /**
   * Get OpenAI API key (for GPT)
   */
  public getOpenaiApiKey(): string {
    return this.config.get<string>(CONFIG_KEYS.openaiApiKey.replace('gofer.', ''), '') || '';
  }

  /**
   * Get Claude Code launch mode
   */
  public getClaudeCodeMode(): 'standard' | 'yolo' | 'custom' {
    return this.config.get<'standard' | 'yolo' | 'custom'>(
      CONFIG_KEYS.claudeCodeMode.replace('gofer.', ''),
      DEFAULTS.claudeCodeMode
    );
  }

  /**
   * Get the resolved Claude Code command based on mode setting
   */
  public getClaudeCodeCommand(): string {
    const mode = this.getClaudeCodeMode();
    switch (mode) {
      case 'yolo':
        return 'claude --dangerously-skip-permissions';
      case 'custom':
        return this.config.get<string>(
          CONFIG_KEYS.claudeCodeCommand.replace('gofer.', ''),
          DEFAULTS.claudeCodeCommand
        );
      case 'standard':
      default:
        return 'claude';
    }
  }

  /**
   * Get auto-initialize setting
   */
  public getAutoInitialize(): boolean {
    return this.config.get<boolean>(
      CONFIG_KEYS.autoInitialize.replace('gofer.', ''),
      DEFAULTS.autoInitialize
    );
  }

  /**
   * Set auto-initialize setting
   */
  public async setAutoInitialize(
    value: boolean,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    await this.config.update(CONFIG_KEYS.autoInitialize.replace('gofer.', ''), value, target);
  }

  /**
   * Get preferred AI setting
   */
  public getPreferredAI(): string {
    return this.config.get<string>(
      CONFIG_KEYS.preferredAi.replace('gofer.', ''),
      DEFAULTS.preferredAi
    );
  }

  /**
   * Get auto-update check setting
   */
  public getAutoUpdateCheck(): boolean {
    return this.config.get<boolean>(
      CONFIG_KEYS.autoUpdateCheck.replace('gofer.', ''),
      DEFAULTS.autoUpdateCheck
    );
  }

  /**
   * Get telemetry enabled setting
   */
  public getTelemetryEnabled(): boolean {
    return this.config.get<boolean>(
      CONFIG_KEYS.telemetryEnabled.replace('gofer.', ''),
      DEFAULTS.telemetryEnabled
    );
  }

  /**
   * Get update check interval
   */
  public getUpdateCheckInterval(): number {
    return this.config.get<number>(
      CONFIG_KEYS.updateCheckInterval.replace('gofer.', ''),
      DEFAULTS.updateCheckInterval
    );
  }

  /**
   * Get performance mode
   */
  public getPerformanceMode(): 'fast' | 'balanced' | 'thorough' {
    return this.config.get<'fast' | 'balanced' | 'thorough'>(
      CONFIG_KEYS.performanceMode.replace('gofer.', ''),
      DEFAULTS.performanceMode as 'balanced'
    );
  }

  /**
   * Get YOLO slop reduction enabled setting
   */
  public getSlopReductionEnabled(): boolean {
    return this.config.get<boolean>(
      CONFIG_KEYS.yoloSlopReductionEnabled.replace('gofer.', ''),
      DEFAULTS.yoloSlopReductionEnabled
    );
  }

  /**
   * Get YOLO slop reduction notification frequency
   */
  public getSlopReductionNotifyEvery(): number {
    return this.config.get<number>(
      CONFIG_KEYS.yoloSlopReductionNotifyEvery.replace('gofer.', ''),
      DEFAULTS.yoloSlopReductionNotifyEvery
    );
  }

  /**
   * Get context window auto-execute save setting
   */
  public getContextWindowAutoExecuteSave(): boolean {
    return this.config.get<boolean>(
      CONFIG_KEYS.contextWindowAutoExecuteSave.replace('gofer.', ''),
      DEFAULTS.contextWindowAutoExecuteSave
    );
  }

  /**
   * Get context window auto-save threshold
   */
  public getContextWindowAutoSaveThreshold(): number {
    return this.config.get<number>(
      CONFIG_KEYS.contextWindowAutoSaveThreshold.replace('gofer.', ''),
      DEFAULTS.contextWindowAutoSaveThreshold
    );
  }

  /**
   * Get context window auto-resume after save setting
   */
  public getContextWindowAutoResumeAfterSave(): boolean {
    return this.config.get<boolean>(
      CONFIG_KEYS.contextWindowAutoResumeAfterSave.replace('gofer.', ''),
      DEFAULTS.contextWindowAutoResumeAfterSave
    );
  }

  /**
   * Get ScopeGuard enforcement mode
   */
  public getScopeGuardMode(): 'advisory' | 'warning' | 'blocking' {
    return this.config.get<'advisory' | 'warning' | 'blocking'>(
      CONFIG_KEYS.scopeGuardMode.replace('gofer.', ''),
      DEFAULTS.scopeGuardMode as 'warning'
    );
  }

  /**
   * Get budget max cost in USD
   */
  public getBudgetMaxCostUsd(): number {
    return this.config.get<number>(
      CONFIG_KEYS.budgetMaxCostUsd.replace('gofer.', ''),
      DEFAULTS.budgetMaxCostUsd
    );
  }

  /**
   * Get budget max tokens per run
   */
  public getBudgetMaxTokensPerRun(): number {
    return this.config.get<number>(
      CONFIG_KEYS.budgetMaxTokensPerRun.replace('gofer.', ''),
      DEFAULTS.budgetMaxTokensPerRun
    );
  }

  /**
   * Get budget enforcement mode
   */
  public getBudgetEnforcementMode(): 'advisory' | 'truncate' | 'blocking' {
    return this.config.get<'advisory' | 'truncate' | 'blocking'>(
      CONFIG_KEYS.budgetEnforcementMode.replace('gofer.', ''),
      DEFAULTS.budgetEnforcementMode as 'advisory'
    );
  }

  /**
   * Get all configuration as object
   */
  public getAll(): Record<string, unknown> {
    return {
      anthropicApiKey: this.getAnthropicApiKey(),
      googleApiKey: this.getGoogleApiKey(),
      openaiApiKey: this.getOpenaiApiKey(),
      autoInitialize: this.getAutoInitialize(),
      preferredAI: this.getPreferredAI(),
      autoUpdateCheck: this.getAutoUpdateCheck(),
      telemetryEnabled: this.getTelemetryEnabled(),
      updateCheckInterval: this.getUpdateCheckInterval(),
      performanceMode: this.getPerformanceMode(),
      yoloSlopReductionEnabled: this.getSlopReductionEnabled(),
      yoloSlopReductionNotifyEvery: this.getSlopReductionNotifyEvery(),
      contextWindowAutoExecuteSave: this.getContextWindowAutoExecuteSave(),
      contextWindowAutoSaveThreshold: this.getContextWindowAutoSaveThreshold(),
      contextWindowAutoResumeAfterSave: this.getContextWindowAutoResumeAfterSave(),
      scopeGuardMode: this.getScopeGuardMode(),
      budgetMaxCostUsd: this.getBudgetMaxCostUsd(),
      budgetMaxTokensPerRun: this.getBudgetMaxTokensPerRun(),
      budgetEnforcementMode: this.getBudgetEnforcementMode(),
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
