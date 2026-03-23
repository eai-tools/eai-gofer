/**
 * Skill Directory Manager for Cross-Platform Command Parity
 * Feature 028: Manages command discovery across multiple directories
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CommandMetadata, PlatformType } from './types/CrossPlatformTypes';
import { CommandMetadataExtractor } from './CommandMetadataExtractor';

/**
 * Interface for skill directory management
 */
export interface SkillDirectoryManager {
  /**
   * Find a specific command by name
   *
   * @param commandName Command to find
   * @returns Command metadata or null if not found
   */
  findCommand(commandName: string): CommandMetadata | null;

  /**
   * List all available commands
   *
   * @returns Array of command metadata
   */
  listCommands(): CommandMetadata[];

  /**
   * Get metadata for a specific command
   *
   * @param commandName Command name
   * @returns Command metadata or null if not found
   */
  getCommandMetadata(commandName: string): CommandMetadata | null;

  /**
   * Watch directories for changes
   *
   * @param callback Function to call when changes detected
   */
  watchDirectories(callback: () => void): vscode.Disposable;
}

/**
 * Default implementation of SkillDirectoryManager
 *
 * Searches multiple directories with priority:
 * 1. .claude/commands/ (Claude CLI - highest priority)
 * 2. .system/skills/  (Codex CLI)
 * 3. .github/prompts/ (Copilot Chat - lowest priority)
 */
export class DefaultSkillDirectoryManager implements SkillDirectoryManager {
  private commandCache: Map<string, CommandMetadata> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache
  private extractor: CommandMetadataExtractor;

  constructor(private workspacePath: string) {
    this.extractor = new CommandMetadataExtractor();
  }

  /**
   * Find a specific command by name (with priority order)
   *
   * @param commandName Command to find
   * @returns Command metadata or null if not found
   */
  public findCommand(commandName: string): CommandMetadata | null {
    // Check cache first
    if (this.isCacheValid() && this.commandCache.has(commandName)) {
      return this.commandCache.get(commandName)!;
    }

    // Search in priority order: Claude > Codex > Copilot
    let metadata: CommandMetadata | null = null;

    // 1. Try Claude CLI
    metadata = this.searchClaudeCommands(commandName);
    if (metadata) {
      this.commandCache.set(commandName, metadata);
      return metadata;
    }

    // 2. Try Codex CLI
    metadata = this.searchCodexSkills(commandName);
    if (metadata) {
      this.commandCache.set(commandName, metadata);
      return metadata;
    }

    // 3. Try Copilot Chat
    metadata = this.searchCopilotPrompts(commandName);
    if (metadata) {
      this.commandCache.set(commandName, metadata);
      return metadata;
    }

    return null;
  }

  /**
   * List all available commands from all directories
   *
   * @returns Array of command metadata
   */
  public listCommands(): CommandMetadata[] {
    // Check cache first
    if (this.isCacheValid() && this.commandCache.size > 0) {
      return Array.from(this.commandCache.values());
    }

    const commands: CommandMetadata[] = [];

    // Collect from all platforms
    commands.push(...this.getAllClaudeCommands());
    commands.push(...this.getAllCodexSkills());
    commands.push(...this.getAllCopilotPrompts());

    // Update cache
    this.commandCache.clear();
    commands.forEach((cmd) => this.commandCache.set(cmd.name, cmd));
    this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;

    return commands;
  }

  /**
   * Get metadata for a specific command (alias for findCommand)
   *
   * @param commandName Command name
   * @returns Command metadata or null if not found
   */
  public getCommandMetadata(commandName: string): CommandMetadata | null {
    return this.findCommand(commandName);
  }

  /**
   * Watch directories for changes and invalidate cache
   *
   * @param callback Function to call when changes detected
   * @returns Disposable to stop watching
   */
  public watchDirectories(callback: () => void): vscode.Disposable {
    const watchers: vscode.FileSystemWatcher[] = [];

    // Watch .claude/commands/
    const claudePattern = new vscode.RelativePattern(this.workspacePath, '.claude/commands/*.md');
    const claudeWatcher = vscode.workspace.createFileSystemWatcher(claudePattern);
    claudeWatcher.onDidChange(() => this.onDirectoryChange(callback));
    claudeWatcher.onDidCreate(() => this.onDirectoryChange(callback));
    claudeWatcher.onDidDelete(() => this.onDirectoryChange(callback));
    watchers.push(claudeWatcher);

    // Watch .system/skills/
    const codexPattern = new vscode.RelativePattern(
      this.workspacePath,
      '.system/skills/*/SKILL.md'
    );
    const codexWatcher = vscode.workspace.createFileSystemWatcher(codexPattern);
    codexWatcher.onDidChange(() => this.onDirectoryChange(callback));
    codexWatcher.onDidCreate(() => this.onDirectoryChange(callback));
    codexWatcher.onDidDelete(() => this.onDirectoryChange(callback));
    watchers.push(codexWatcher);

    // Watch .github/prompts/
    const copilotPattern = new vscode.RelativePattern(
      this.workspacePath,
      '.github/prompts/*.prompt.md'
    );
    const copilotWatcher = vscode.workspace.createFileSystemWatcher(copilotPattern);
    copilotWatcher.onDidChange(() => this.onDirectoryChange(callback));
    copilotWatcher.onDidCreate(() => this.onDirectoryChange(callback));
    copilotWatcher.onDidDelete(() => this.onDirectoryChange(callback));
    watchers.push(copilotWatcher);

    // Return disposable to stop all watchers
    return {
      dispose: () => {
        watchers.forEach((watcher) => watcher.dispose());
      },
    };
  }

  /**
   * Clear command cache (force refresh)
   */
  public clearCache(): void {
    this.commandCache.clear();
    this.cacheExpiry = 0;
  }

  /**
   * Handle directory change events
   */
  private onDirectoryChange(callback: () => void): void {
    this.clearCache();
    callback();
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() < this.cacheExpiry;
  }

  /**
   * Search for command in Claude CLI directory
   */
  private searchClaudeCommands(commandName: string): CommandMetadata | null {
    const claudeDir = path.join(this.workspacePath, '.claude/commands');
    if (!fs.existsSync(claudeDir)) {
      return null;
    }

    const filePath = path.join(claudeDir, `${commandName}.md`);
    if (fs.existsSync(filePath)) {
      try {
        return this.extractor.extractFromClaudeCommandSync(filePath);
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Search for skill in Codex CLI directory
   */
  private searchCodexSkills(commandName: string): CommandMetadata | null {
    const codexDir = path.join(this.workspacePath, '.system/skills');
    if (!fs.existsSync(codexDir)) {
      return null;
    }

    const skillPath = path.join(codexDir, commandName, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      try {
        return this.extractor.extractFromCodexSkillSync(skillPath);
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Search for prompt in Copilot Chat directory
   */
  private searchCopilotPrompts(commandName: string): CommandMetadata | null {
    const copilotDir = path.join(this.workspacePath, '.github/prompts');
    if (!fs.existsSync(copilotDir)) {
      return null;
    }

    const filePath = path.join(copilotDir, `${commandName}.prompt.md`);
    if (fs.existsSync(filePath)) {
      try {
        return this.extractor.extractFromCopilotPromptSync(filePath);
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Get all commands from Claude CLI directory
   */
  private getAllClaudeCommands(): CommandMetadata[] {
    const claudeDir = path.join(this.workspacePath, '.claude/commands');
    if (!fs.existsSync(claudeDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(claudeDir).filter((file) => file.endsWith('.md'));

      return files
        .map((file) => {
          try {
            const filePath = path.join(claudeDir, file);
            return this.extractor.extractFromClaudeCommandSync(filePath);
          } catch {
            return null;
          }
        })
        .filter((metadata): metadata is CommandMetadata => metadata !== null);
    } catch {
      return [];
    }
  }

  /**
   * Get all skills from Codex CLI directory
   */
  private getAllCodexSkills(): CommandMetadata[] {
    const codexDir = path.join(this.workspacePath, '.system/skills');
    if (!fs.existsSync(codexDir)) {
      return [];
    }

    try {
      const subdirs = fs.readdirSync(codexDir).filter((item) => {
        const itemPath = path.join(codexDir, item);
        return fs.statSync(itemPath).isDirectory();
      });

      return subdirs
        .map((subdir) => {
          try {
            const skillPath = path.join(codexDir, subdir, 'SKILL.md');
            if (fs.existsSync(skillPath)) {
              return this.extractor.extractFromCodexSkillSync(skillPath);
            }
            return null;
          } catch {
            return null;
          }
        })
        .filter((metadata): metadata is CommandMetadata => metadata !== null);
    } catch {
      return [];
    }
  }

  /**
   * Get all prompts from Copilot Chat directory
   */
  private getAllCopilotPrompts(): CommandMetadata[] {
    const copilotDir = path.join(this.workspacePath, '.github/prompts');
    if (!fs.existsSync(copilotDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(copilotDir).filter((file) => file.endsWith('.prompt.md'));

      return files
        .map((file) => {
          try {
            const filePath = path.join(copilotDir, file);
            return this.extractor.extractFromCopilotPromptSync(filePath);
          } catch {
            return null;
          }
        })
        .filter((metadata): metadata is CommandMetadata => metadata !== null);
    } catch {
      return [];
    }
  }
}
