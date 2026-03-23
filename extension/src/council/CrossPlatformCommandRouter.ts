/**
 * Cross-Platform Command Router
 * Routes commands across Claude CLI, Codex CLI, and GitHub Copilot Chat
 * Feature 028: Cross-platform command parity
 */

import * as fs from 'fs';
import * as path from 'path';
import { PlatformDetector } from './PlatformDetector';
import { DefaultSkillDirectoryManager } from './SkillDirectoryManager';
import { CommandMetadataExtractor } from './CommandMetadataExtractor';
import { CommandMetadata, PlatformType } from './types/CrossPlatformTypes';

/**
 * Command routing result
 */
export interface CommandRoutingResult {
  commandName: string;
  platform: PlatformType;
  filePath: string;
  metadata: CommandMetadata;
  syntax: string;
  isAvailable: boolean;
}

/**
 * Routes commands across different AI platforms with priority fallback
 *
 * Priority: .claude/commands/ > .agents/skills/ > .github/prompts/
 *
 * Security: Validates all paths to prevent directory traversal attacks
 */
export class CrossPlatformCommandRouter {
  private platformDetector: PlatformDetector;
  private skillDirectoryManager: DefaultSkillDirectoryManager;
  private metadataExtractor: CommandMetadataExtractor;
  private routingCache: Map<string, CommandRoutingResult>;
  private cacheExpiry: number;
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor(private workspacePath: string) {
    this.platformDetector = PlatformDetector.getInstance(workspacePath);
    this.skillDirectoryManager = new DefaultSkillDirectoryManager(workspacePath);
    this.metadataExtractor = new CommandMetadataExtractor();
    this.routingCache = new Map();
    this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;
  }

  /**
   * Route a command to the appropriate platform-specific file
   *
   * @param commandName Command to route (e.g., "1_gofer_research")
   * @param targetPlatform Optional platform override
   * @returns Routing result with file path and metadata
   * @throws Error if command not found or path validation fails
   */
  public routeCommand(commandName: string, targetPlatform?: PlatformType): CommandRoutingResult {
    // Validate command name to prevent path traversal
    this.validateCommandName(commandName);

    // Check cache
    const cacheKey = `${commandName}:${targetPlatform || 'auto'}`;
    if (this.isCacheValid() && this.routingCache.has(cacheKey)) {
      return this.routingCache.get(cacheKey)!;
    }

    // Detect platform
    const platform = targetPlatform || this.platformDetector.getDefaultPlatform();

    // Find command with priority fallback
    const metadata = this.skillDirectoryManager.findCommand(commandName);
    if (!metadata) {
      throw new Error(`Command "${commandName}" not found in any platform directory`);
    }

    // Build routing result
    const result: CommandRoutingResult = {
      commandName,
      platform: metadata.platform,
      filePath: metadata.filePath,
      metadata,
      syntax: this.getCommandSyntax(commandName, metadata.platform),
      isAvailable: true,
    };

    // Cache result
    this.routingCache.set(cacheKey, result);

    return result;
  }

  /**
   * Load skill content for a specific platform
   *
   * @param commandName Command to load
   * @param platform Target platform
   * @returns Full command file content
   */
  public async loadSkillForPlatform(commandName: string, platform: PlatformType): Promise<string> {
    const commandPath = this.getCommandPath(commandName, platform);
    if (!fs.existsSync(commandPath)) {
      throw new Error(`Command "${commandName}" not found for platform "${platform}"`);
    }

    return await fs.promises.readFile(commandPath, 'utf8');
  }

  /**
   * Detect the active platform
   *
   * @returns Detected platform type
   */
  public detectPlatform(): PlatformType | 'auto' {
    return this.platformDetector.detectPlatform();
  }

  /**
   * Get the file path for a command on a specific platform
   *
   * @param commandName Command name
   * @param platform Target platform
   * @returns Absolute file path
   */
  public getCommandPath(commandName: string, platform: PlatformType): string {
    this.validateCommandName(commandName);

    const platformPaths: Record<PlatformType, string> = {
      claude: path.join(this.workspacePath, '.claude', 'commands', `${commandName}.md`),
      codex: path.join(this.workspacePath, '.agents', 'skills', commandName, 'SKILL.md'),
      copilot: path.join(this.workspacePath, '.github', 'prompts', `${commandName}.prompt.md`),
    };

    return platformPaths[platform];
  }

  /**
   * List all available commands across all platforms
   *
   * @returns Array of command names
   */
  public listCommands(): string[] {
    const commands = new Set<string>();

    // Scan Claude commands
    const claudeDir = path.join(this.workspacePath, '.claude', 'commands');
    if (fs.existsSync(claudeDir)) {
      fs.readdirSync(claudeDir)
        .filter((file) => file.endsWith('.md'))
        .forEach((file) => commands.add(path.basename(file, '.md')));
    }

    // Scan Codex skills
    const codexDir = path.join(this.workspacePath, '.agents', 'skills');
    if (fs.existsSync(codexDir)) {
      fs.readdirSync(codexDir).forEach((dir) => {
        const skillPath = path.join(codexDir, dir, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          commands.add(dir);
        }
      });
    }

    // Scan Copilot prompts
    const copilotDir = path.join(this.workspacePath, '.github', 'prompts');
    if (fs.existsSync(copilotDir)) {
      fs.readdirSync(copilotDir)
        .filter((file) => file.endsWith('.prompt.md'))
        .forEach((file) => commands.add(path.basename(file, '.prompt.md')));
    }

    return Array.from(commands).sort();
  }

  /**
   * Check if a command is available on any platform
   *
   * @param commandName Command to check
   * @returns True if command exists
   */
  public isCommandAvailable(commandName: string): boolean {
    try {
      this.validateCommandName(commandName);
      const metadata = this.skillDirectoryManager.findCommand(commandName);
      return metadata !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get the invocation syntax for a command on a platform
   *
   * @param commandName Command name
   * @param platform Target platform
   * @returns Invocation syntax (e.g., "/1_gofer_research" or "$ $1_gofer_research")
   */
  public getCommandSyntax(commandName: string, platform: PlatformType): string {
    const syntaxMap: Record<PlatformType, string> = {
      claude: `/${commandName}`,
      codex: `$ $${commandName}`,
      copilot: `#${commandName}`,
    };

    return syntaxMap[platform];
  }

  /**
   * Clear routing cache (called on settings change)
   */
  public clearCache(): void {
    this.routingCache.clear();
    this.platformDetector.clearCache();
    this.skillDirectoryManager.clearCache();
    this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;
  }

  /**
   * Validate command name to prevent path traversal attacks
   *
   * @param commandName Command name to validate
   * @throws Error if command name contains invalid characters
   */
  private validateCommandName(commandName: string): void {
    // Reject empty names
    if (!commandName || commandName.trim().length === 0) {
      throw new Error('Command name cannot be empty');
    }

    // Reject path traversal attempts
    if (
      commandName.includes('..') ||
      commandName.includes('/') ||
      commandName.includes('\\') ||
      commandName.includes('\0')
    ) {
      throw new Error(`Invalid command name: "${commandName}" (path traversal not allowed)`);
    }

    // Reject absolute paths
    if (path.isAbsolute(commandName)) {
      throw new Error(`Invalid command name: "${commandName}" (absolute paths not allowed)`);
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() < this.cacheExpiry;
  }
}
