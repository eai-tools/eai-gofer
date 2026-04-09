/**
 * Cross-Platform Command Router
 * Routes commands across Claude CLI, Codex CLI, and GitHub Copilot Chat
 * Feature 028: Cross-platform command parity
 */

import * as fs from 'fs';
import * as path from 'path';
import { pathExistsSafe, readDirectorySafe } from './CommandFileAccess';
import { validateCommandName } from './CommandNameValidation';
import { PlatformDetector } from './PlatformDetector';
import { DefaultSkillDirectoryManager } from './SkillDirectoryManager';
import { CommandMetadataExtractor } from './CommandMetadataExtractor';
import { CommandMetadata, PlatformType } from './types/CrossPlatformTypes';
import {
  isWorkflowProfileCompatible,
  selectGuidanceForWorkflowProfile,
} from './WorkflowProfileGuidance';
import { type WorkflowProfile, getWorkflowProfile } from '../config/workflowProfile';
import { Logger } from '../utils/logger';

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
  workflowProfile: WorkflowProfile;
  profileMatched: boolean;
}

interface CommandSelectionResult {
  metadata: CommandMetadata;
  platform: PlatformType;
  profileMatched: boolean;
}

/**
 * Routes commands across different AI platforms with priority fallback
 *
 * Priority: .claude/commands/ > .system/skills/ > .github/prompts/
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
  private readonly logger = Logger.for('CrossPlatformCommandRouter');
  private readonly logWarning = (message: string, metadata: Record<string, unknown>): void =>
    this.logger.warn(message, metadata);

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
  public async routeCommand(
    commandName: string,
    targetPlatform?: PlatformType,
    workflowProfile?: WorkflowProfile
  ): Promise<CommandRoutingResult> {
    validateCommandName(commandName);
    const resolvedWorkflowProfile = this.resolveWorkflowProfile(workflowProfile);
    const cacheKey = `${commandName}:${targetPlatform || 'auto'}:${resolvedWorkflowProfile}`;
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const searchOrder = targetPlatform
      ? [targetPlatform]
      : this.getPlatformSearchOrder(this.platformDetector.getDefaultPlatform());

    this.logger.debug('Routing command', {
      commandName,
      searchOrder,
      targetPlatform,
      workflowProfile: resolvedWorkflowProfile,
    });

    const selection = await this.selectCommandMetadata(
      commandName,
      searchOrder,
      resolvedWorkflowProfile,
      targetPlatform
    );
    const result = this.buildRoutingResult(commandName, selection, resolvedWorkflowProfile);
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
  public async loadSkillForPlatform(
    commandName: string,
    platform: PlatformType,
    workflowProfile?: WorkflowProfile
  ): Promise<string> {
    const commandPath = this.getCommandPath(commandName, platform);
    const exists = await pathExistsSafe(commandPath, 'loadSkillForPlatform', this.logWarning);
    if (!exists) {
      throw new Error(`Command "${commandName}" not found for platform "${platform}"`);
    }

    const resolvedWorkflowProfile = this.resolveWorkflowProfile(workflowProfile);
    const content = await fs.promises.readFile(commandPath, 'utf8');
    return selectGuidanceForWorkflowProfile(content, resolvedWorkflowProfile);
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
    validateCommandName(commandName);

    const platformPaths: Record<PlatformType, string> = {
      claude: path.join(this.workspacePath, '.claude', 'commands', `${commandName}.md`),
      codex: path.join(this.workspacePath, '.system', 'skills', commandName, 'SKILL.md'),
      copilot: path.join(this.workspacePath, '.github', 'prompts', `${commandName}.prompt.md`),
    };

    return platformPaths[platform];
  }

  /**
   * List all available commands across all platforms
   *
   * @returns Array of command names
   */
  public async listCommands(): Promise<string[]> {
    const commands = new Set<string>();

    // Scan Claude commands
    const claudeDir = path.join(this.workspacePath, '.claude', 'commands');
    const claudeFiles = await readDirectorySafe(claudeDir, 'listCommands.claude', this.logWarning);
    claudeFiles
      .filter((file) => file.endsWith('.md'))
      .forEach((file) => commands.add(path.basename(file, '.md')));

    // Scan Codex skills
    const codexDir = path.join(this.workspacePath, '.system', 'skills');
    const codexDirs = await readDirectorySafe(codexDir, 'listCommands.codex', this.logWarning);
    const codexChecks = await Promise.all(
      codexDirs.map(async (dir) => {
        const skillPath = path.join(codexDir, dir, 'SKILL.md');
        const exists = await pathExistsSafe(skillPath, 'listCommands.codexSkill', this.logWarning);
        return exists ? dir : null;
      })
    );
    codexChecks.filter(Boolean).forEach((dir) => commands.add(dir as string));

    // Scan Copilot prompts
    const copilotDir = path.join(this.workspacePath, '.github', 'prompts');
    const copilotFiles = await readDirectorySafe(
      copilotDir,
      'listCommands.copilot',
      this.logWarning
    );
    copilotFiles
      .filter((file) => file.endsWith('.prompt.md'))
      .forEach((file) => commands.add(path.basename(file, '.prompt.md')));

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
      validateCommandName(commandName);
      const metadata = this.skillDirectoryManager.findCommand(commandName);
      return metadata !== null;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Invalid command name')) {
        this.logger.debug('Command rejected during availability check', {
          commandName,
          reason: error.message,
        });
        return false;
      }

      this.logger.warn('Failed to determine command availability', {
        commandName,
        error: error instanceof Error ? error.message : String(error),
      });
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
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() < this.cacheExpiry;
  }

  private getPlatformSearchOrder(preferred: PlatformType | 'auto'): PlatformType[] {
    const defaultPriority: PlatformType[] = ['claude', 'codex', 'copilot'];
    if (preferred === 'auto') {
      return defaultPriority;
    }
    return [preferred, ...defaultPriority.filter((platform) => platform !== preferred)];
  }

  private getCachedResult(cacheKey: string): CommandRoutingResult | null {
    if (!this.isCacheValid()) {
      return null;
    }
    return this.routingCache.get(cacheKey) ?? null;
  }

  private async selectCommandMetadata(
    commandName: string,
    searchOrder: readonly PlatformType[],
    workflowProfile: WorkflowProfile,
    targetPlatform?: PlatformType
  ): Promise<CommandSelectionResult> {
    let fallbackSelection: CommandSelectionResult | null = null;

    for (const platform of searchOrder) {
      const candidateMetadata = await this.getMetadataForPlatform(commandName, platform);
      if (!candidateMetadata) {
        continue;
      }

      if (isWorkflowProfileCompatible(candidateMetadata.frontmatter, workflowProfile)) {
        this.logger.debug('Platform selected', {
          commandName,
          selectedPlatform: platform,
          workflowProfile,
          reason: targetPlatform ? 'explicit' : 'priority-fallback',
        });
        return {
          metadata: candidateMetadata,
          platform,
          profileMatched: true,
        };
      }

      if (!fallbackSelection) {
        fallbackSelection = {
          metadata: candidateMetadata,
          platform,
          profileMatched: false,
        };
      }
    }

    if (fallbackSelection) {
      this.logger.warn('Profile-scoped guidance unavailable, using compatibility fallback', {
        commandName,
        workflowProfile,
        selectedPlatform: fallbackSelection.platform,
      });
      return fallbackSelection;
    }

    this.logger.debug('Command not found', {
      commandName,
      targetPlatform,
      workflowProfile,
    });
    if (targetPlatform) {
      throw new Error(`Command "${commandName}" not found for platform "${targetPlatform}"`);
    }
    throw new Error(`Command "${commandName}" not found in any platform directory`);
  }

  private buildRoutingResult(
    commandName: string,
    selection: CommandSelectionResult,
    workflowProfile: WorkflowProfile
  ): CommandRoutingResult {
    return {
      commandName,
      platform: selection.platform,
      filePath: selection.metadata.filePath,
      metadata: selection.metadata,
      syntax: this.getCommandSyntax(commandName, selection.platform),
      isAvailable: true,
      workflowProfile,
      profileMatched: selection.profileMatched,
    };
  }

  private async getMetadataForPlatform(
    commandName: string,
    platform: PlatformType
  ): Promise<CommandMetadata | null> {
    const commandPath = this.getCommandPath(commandName, platform);
    const exists = await pathExistsSafe(commandPath, 'getMetadataForPlatform', this.logWarning);
    if (!exists) {
      return null;
    }

    try {
      if (platform === 'claude') {
        return await this.metadataExtractor.extractFromClaudeCommand(commandPath);
      }
      if (platform === 'codex') {
        return await this.metadataExtractor.extractFromCodexSkill(commandPath);
      }
      return await this.metadataExtractor.extractFromCopilotPrompt(commandPath);
    } catch (error) {
      this.logger.warn('Failed to extract command metadata', {
        commandName,
        platform,
        commandPath,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private resolveWorkflowProfile(workflowProfile?: WorkflowProfile): WorkflowProfile {
    if (workflowProfile) {
      return workflowProfile;
    }

    try {
      return getWorkflowProfile();
    } catch (error) {
      this.logger.warn(
        'Falling back to standard workflow profile after configuration read failure',
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      return 'standard';
    }
  }
}
