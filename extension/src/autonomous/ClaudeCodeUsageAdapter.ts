/**
 * Claude Code Usage Adapter
 *
 * Automatically discovers and tracks Claude Code/Codex/Copilot usage from conversation logs.
 * Reads from ~/.claude/projects/<project>/*.jsonl files to extract token usage and costs.
 *
 * Multi-project, multi-user, multi-provider support.
 *
 * Feature: Auto-discovery (ccusage/tokscale-style)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { calculateCost } from '../config/pricing';
import { Logger } from '../utils/logger';

export interface ConversationUsage {
  conversationId: string;
  projectName: string;
  sessionId: string;
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  costUsd: number;
  provider: 'claude-code' | 'codex' | 'copilot' | 'unknown';
  model: string;
  userEmail?: string;
}

export interface ProjectStats {
  projectName: string;
  totalCost: number;
  totalTokens: number;
  conversationCount: number;
}

export interface UserStats {
  userEmail: string;
  totalCost: number;
  totalTokens: number;
  projects: Set<string>;
}

export interface ProviderStats {
  provider: string;
  totalCost: number;
  totalTokens: number;
  conversationCount: number;
}

interface ConversationMetadata {
  message?: {
    model?: string;
  };
  source?: string;
  type?: string;
  version?: string;
}

/**
 * Claude Code Usage Adapter
 *
 * Discovers Claude Code/Codex/Copilot conversation logs and extracts usage data.
 */
export class ClaudeCodeUsageAdapter {
  private readonly logger = Logger.for('ClaudeCodeAdapter');
  private readonly claudeDir: string;
  private readonly workspacePath: string;

  constructor(workspacePath: string, claudeDir?: string) {
    this.workspacePath = workspacePath;
    this.claudeDir = claudeDir ?? path.join(os.homedir(), '.claude');
  }

  /**
   * Check if Claude Code is installed and configured.
   */
  async isClaudeCodeInstalled(): Promise<boolean> {
    try {
      await fs.promises.access(this.claudeDir);
      const projectsDir = path.join(this.claudeDir, 'projects');
      await fs.promises.access(projectsDir);

      this.logger.info('Checking Claude Code installation', {
        claudeDir: this.claudeDir,
        claudeDirExists: true,
        projectsDirExists: true,
      });

      return true;
    } catch {
      this.logger.info('Checking Claude Code installation', {
        claudeDir: this.claudeDir,
        claudeDirExists: false,
        projectsDirExists: false,
      });
      return false;
    }
  }

  /**
   * Get current logged-in user from Claude settings.
   */
  async getCurrentUser(): Promise<string | null> {
    try {
      const settingsPath = path.join(this.claudeDir, 'settings.json');

      try {
        await fs.promises.access(settingsPath);
      } catch {
        return null;
      }

      const settings = JSON.parse(await fs.promises.readFile(settingsPath, 'utf-8'));
      return settings.email || settings.user || null;
    } catch (_error) {
      this.logger.warn('Failed to read user from settings');
      return null;
    }
  }

  /**
   * Detect provider from conversation metadata.
   */
  private detectProvider(entry: ConversationMetadata): 'claude-code' | 'codex' | 'copilot' | 'unknown' {
    // Check version field for Claude Code
    if (entry.version && entry.version.includes('claude')) {
      return 'claude-code';
    }

    // Check for Codex CLI markers
    if (entry.version && entry.version.includes('codex')) {
      return 'codex';
    }

    // Check for Copilot markers
    if (entry.source === 'copilot' || entry.version?.includes('copilot')) {
      return 'copilot';
    }

    // Default to claude-code if we have usage data
    if (entry.message?.model || entry.type === 'assistant') {
      return 'claude-code';
    }

    return 'unknown';
  }

  /**
   * Parse a single conversation JSONL file and extract usage data.
   */
  private async parseConversationFile(
    filePath: string,
    projectName: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<ConversationUsage[]> {
    const usageEntries: ConversationUsage[] = [];

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const conversationId = path.basename(filePath, '.jsonl');
      let sessionId = 'unknown';
      let provider: 'claude-code' | 'codex' | 'copilot' | 'unknown' = 'unknown';

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);

          // Extract session ID from first entry
          if (entry.sessionId && sessionId === 'unknown') {
            sessionId = entry.sessionId;
          }

          // Detect provider from first relevant entry
          if (provider === 'unknown') {
            provider = this.detectProvider(entry);
          }

          // Skip non-assistant entries (no usage data)
          if (entry.type !== 'assistant') {continue;}

          // Skip entries without usage data (usage is at entry.message.usage in Claude Code format)
          if (!entry.message?.usage) {continue;}

          // Parse timestamp
          const timestamp = new Date(entry.timestamp);
          if (fromDate && timestamp < fromDate) {continue;}
          if (toDate && timestamp > toDate) {continue;}

          // Extract token usage from entry.message.usage (Claude Code format)
          const usage = entry.message.usage;
          const inputTokens = usage.input_tokens || 0;
          const outputTokens = usage.output_tokens || 0;
          const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
          const cacheReadTokens = usage.cache_read_input_tokens || 0;

          const totalTokens = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;

          const model = entry.message?.model || 'unknown';

          // Calculate cost using detected provider and model (Bug #2 fix)
          const cost = calculateCost(
            inputTokens + cacheCreationTokens,
            outputTokens,
            provider,
            model
          );

          usageEntries.push({
            conversationId,
            projectName,
            sessionId,
            timestamp: timestamp.toISOString(),
            inputTokens,
            outputTokens,
            cacheCreationTokens,
            cacheReadTokens,
            totalTokens,
            costUsd: cost,
            provider,
            model,
          });
          } catch (_err) {
          // Skip malformed lines
          continue;
        }
      }
    } catch (_error) {
      this.logger.warn('Failed to parse conversation file', { filePath });
    }

    return usageEntries;
  }

  /**
   * Get all conversation files from a project directory.
   */
  private async getConversationFiles(projectDir: string): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(projectDir);
      return files
        .filter((file) => file.endsWith('.jsonl'))
        .map((file) => path.join(projectDir, file));
    } catch (_error) {
      this.logger.warn('Failed to read project directory', { projectDir });
      return [];
    }
  }

  /**
   * Get all project directories from ~/.claude/projects/
   */
  private async getAllProjects(): Promise<{ name: string; path: string }[]> {
    const projectsDir = path.join(this.claudeDir, 'projects');

    try {
      await fs.promises.access(projectsDir);
    } catch {
      return [];
    }

    try {
      const projectNames = await fs.promises.readdir(projectsDir);
      return projectNames.map((name) => ({
        name,
        path: path.join(projectsDir, name),
      }));
    } catch (error) {
      this.logger.error(
        'Failed to read projects directory',
        error instanceof Error ? error : new Error(String(error)),
        { projectsDir }
      );
      return [];
    }
  }

  /**
   * Get usage data for current workspace project only.
   */
  async getWorkspaceUsage(fromDate?: Date, toDate?: Date): Promise<ConversationUsage[]> {
    const projectName = this.normalizeProjectName(this.workspacePath);
    const projectDir = path.join(this.claudeDir, 'projects', projectName);

    try {
      await fs.promises.access(projectDir);
    } catch {
      this.logger.info('Project directory not found', { projectName, projectDir });
      return [];
    }

    const conversationFiles = await this.getConversationFiles(projectDir);
    this.logger.info('Found conversation files for workspace', {
      projectName,
      fileCount: conversationFiles.length,
    });

    const allUsage: ConversationUsage[] = [];

    for (const filePath of conversationFiles) {
      const usage = await this.parseConversationFile(filePath, projectName, fromDate, toDate);
      allUsage.push(...usage);
    }

    this.logger.info('Parsed workspace usage', {
      projectName,
      entryCount: allUsage.length,
      totalCost: allUsage.reduce((sum, u) => sum + u.costUsd, 0),
    });

    return allUsage;
  }

  /**
   * Get usage data for ALL projects (multi-project support).
   */
  async getAllProjectsUsage(fromDate?: Date, toDate?: Date): Promise<ConversationUsage[]> {
    const projects = await this.getAllProjects();
    const allUsage: ConversationUsage[] = [];

    this.logger.info('Scanning all projects', { projectCount: projects.length });

    for (const project of projects) {
      const conversationFiles = await this.getConversationFiles(project.path);

      for (const filePath of conversationFiles) {
        const usage = await this.parseConversationFile(filePath, project.name, fromDate, toDate);
        allUsage.push(...usage);
      }
    }

    this.logger.info('Parsed all projects usage', {
      projectCount: projects.length,
      entryCount: allUsage.length,
      totalCost: allUsage.reduce((sum, u) => sum + u.costUsd, 0),
    });

    return allUsage;
  }

  /**
   * Aggregate usage by project.
   */
  aggregateByProject(usage: ConversationUsage[]): Map<string, ProjectStats> {
    const projectStats = new Map<string, ProjectStats>();

    for (const entry of usage) {
      const existing = projectStats.get(entry.projectName);

      if (existing) {
        existing.totalCost += entry.costUsd;
        existing.totalTokens += entry.totalTokens;
        existing.conversationCount++;
      } else {
        projectStats.set(entry.projectName, {
          projectName: entry.projectName,
          totalCost: entry.costUsd,
          totalTokens: entry.totalTokens,
          conversationCount: 1,
        });
      }
    }

    return projectStats;
  }

  /**
   * Aggregate usage by provider.
   */
  aggregateByProvider(usage: ConversationUsage[]): Map<string, ProviderStats> {
    const providerStats = new Map<string, ProviderStats>();

    for (const entry of usage) {
      const existing = providerStats.get(entry.provider);

      if (existing) {
        existing.totalCost += entry.costUsd;
        existing.totalTokens += entry.totalTokens;
        existing.conversationCount++;
      } else {
        providerStats.set(entry.provider, {
          provider: entry.provider,
          totalCost: entry.costUsd,
          totalTokens: entry.totalTokens,
          conversationCount: 1,
        });
      }
    }

    return providerStats;
  }

  /**
   * Normalize workspace path to project name (matches Claude Code format).
   */
  private normalizeProjectName(workspacePath: string): string {
    // Claude Code uses format: -Users-username-path-to-project
    return workspacePath.replace(/\//g, '-');
  }

  /**
   * Convert usage to council-usage.jsonl format and write.
   *
   * This syncs discovered usage to the council log for display in the AI Usage panel.
   */
  async syncToCouncilLog(): Promise<number> {
    try {
      const councilLogPath = path.join(
        this.workspacePath,
        '.specify',
        'logs',
        'council-usage.jsonl'
      );

      // Get workspace usage from last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const usage = await this.getWorkspaceUsage(weekAgo);

      if (usage.length === 0) {
        this.logger.info('No usage data found to sync');
        return 0;
      }

      // Create directory if needed
      const councilDir = path.dirname(councilLogPath);
      try {
        await fs.promises.access(councilDir);
      } catch {
        await fs.promises.mkdir(councilDir, { recursive: true });
      }

      // Read existing entries to avoid duplicates
      const existingConversationIds = new Set<string>();
      try {
        await fs.promises.access(councilLogPath);
        const existing = await fs.promises.readFile(councilLogPath, 'utf-8');
        for (const line of existing.trim().split('\n').filter(Boolean)) {
          try {
            const entry = JSON.parse(line);
            // Use conversationId + timestamp as unique key
            if (entry.conversationId && entry.timestamp) {
              existingConversationIds.add(`${entry.conversationId}:${entry.timestamp}`);
            }
          } catch {
            // Skip malformed lines
          }
        }
      } catch {
        // File doesn't exist yet, that's OK
      }

      let entriesAdded = 0;
      const entriesToAppend: string[] = [];

      // Collect new entries
      for (const entry of usage) {
        const key = `${entry.conversationId}:${entry.timestamp}`;
        if (existingConversationIds.has(key)) {continue;}

        // Format as UsageLogEntry for compatibility with UsageLogger
        const councilEntry = {
          timestamp: entry.timestamp,
          sessionId: entry.sessionId,
          conversationId: entry.conversationId,
          stage: `auto-discovered-${entry.provider}`,
          councilMode: false,
          inputTokens: entry.inputTokens,
          outputTokens: entry.outputTokens,
          estimatedCostUsd: entry.costUsd,
          durationMs: 0,
          providerCount: 1,
          providers: {
            anthropic: {
              tokens: entry.totalTokens,
              costUsd: entry.costUsd,
            },
          },
        };

        entriesToAppend.push(JSON.stringify(councilEntry) + '\n');
        entriesAdded++;
      }

      // Write all new entries in one operation
      if (entriesToAppend.length > 0) {
        await fs.promises.appendFile(councilLogPath, entriesToAppend.join(''), 'utf-8');
      }

      this.logger.info('Synced usage to council log', { entriesAdded });
      return entriesAdded;
    } catch (error) {
      this.logger.error(
        'Failed to sync to council log',
        error instanceof Error ? error : new Error(String(error))
      );
      return 0;
    }
  }
}

/**
 * Get singleton instance of ClaudeCodeUsageAdapter.
 */
let adapterInstance: ClaudeCodeUsageAdapter | null = null;

export function getClaudeCodeAdapter(workspacePath: string): ClaudeCodeUsageAdapter {
  if (!adapterInstance) {
    adapterInstance = new ClaudeCodeUsageAdapter(workspacePath);
  }
  return adapterInstance;
}
