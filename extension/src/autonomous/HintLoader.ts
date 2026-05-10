/**
 * Hierarchical Context Hints - HintLoader
 *
 * Discovers, loads, and merges directory-specific coding standards and patterns.
 * Provides contextual guidance to autonomous execution based on affected files.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { FileSystemWatcher } from 'vscode';
import { type HintFile, type HintQuery, type HintLoadResult } from './hint';
import { Logger } from '../utils/logger';
import { telemetry } from './telemetryIntegration';

/**
 * HintLoader discovers and loads hint files from the .specify/hints directory.
 *
 * Features:
 * - Hierarchical scoping (global, project, directory)
 * - Priority-based merging (directory > project > global)
 * - Fast discovery with caching
 * - FileSystemWatcher for cache invalidation
 * - Performance target: <500ms for discovery + loading
 */
export class HintLoader {
  private readonly workspaceRoot: string;
  private readonly hintsDir: string;
  private hintCache: Map<string, HintFile> = new Map();
  private cacheValid: boolean = false;
  private watcher: FileSystemWatcher | undefined;
  private readonly logger: Logger;

  /**
   * Creates a new HintLoader instance.
   *
   * @param workspaceRoot - Absolute path to workspace root
   */
  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.hintsDir = path.join(workspaceRoot, '.specify', 'hints');
    this.logger = Logger.for('HintLoader');
    this.logger.debug('HintLoader initialized', { workspaceRoot, hintsDir: this.hintsDir });
  }

  /**
   * Loads a single hint file from disk.
   *
   * Reads the file, parses YAML frontmatter if present, and returns a HintFile object.
   *
   * @param filePath - Absolute path to hint file
   * @returns HintFile object
   * @throws Error if file doesn't exist or cannot be read
   */
  async loadHintFile(filePath: string): Promise<HintFile> {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Hint file not found: ${filePath}`);
    }

    // Read file content
    const rawContent = fs.readFileSync(filePath, 'utf-8');

    // Parse YAML frontmatter if present
    let content = rawContent;
    let metadata: HintFile['metadata'] | undefined;

    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = rawContent.match(frontmatterRegex);

    if (match) {
      try {
        const frontmatter = yaml.load(match[1]) as Record<string, unknown>;
        metadata = {
          title: frontmatter.title as string | undefined,
          tags: frontmatter.tags as string[] | undefined,
          version: frontmatter.version as string | undefined,
        };
        content = match[2]; // Content after frontmatter
      } catch (error) {
        // If YAML parsing fails, treat entire file as content
        console.warn(`Failed to parse YAML frontmatter in ${filePath}:`, error);
      }
    }

    // Classify hint
    const [scope, priority] = this.classifyHint(filePath);

    return {
      path: filePath,
      scope,
      priority,
      content,
      metadata,
    };
  }

  /**
   * Classifies a hint file's scope and priority based on its location.
   *
   * Rules:
   * - global.md at .specify/hints/ → scope='global', priority=1
   * - Files at .specify/hints/ (not global.md) → scope='project', priority=5
   * - Files in subdirectories → scope='directory', priority=10
   *
   * @param filePath - Absolute path to hint file
   * @returns Tuple of [scope, priority]
   */
  classifyHint(filePath: string): ['global' | 'project' | 'directory', number] {
    const relativePath = path.relative(this.hintsDir, filePath);
    // Check if it's global.md at root of hints directory
    if (relativePath === 'global.md') {
      return ['global', 1];
    }

    // Check if it's directly in hints directory (no subdirectory)
    const isRootLevel = !relativePath.includes(path.sep);
    if (isRootLevel) {
      return ['project', 5];
    }

    // Otherwise it's in a subdirectory
    return ['directory', 10];
  }

  /**
   * Discovers all hint files in .specify/hints recursively.
   *
   * Uses file system scanning with caching for performance.
   * Results are cached until invalidateCache() is called.
   *
   * @returns Array of absolute paths to hint files
   */
  async discoverHints(): Promise<string[]> {
    // Return cached results if valid
    if (this.cacheValid && this.hintCache.size > 0) {
      this.logger.debug('Using cached hints', { count: this.hintCache.size });
      return Array.from(this.hintCache.keys());
    }

    this.logger.debug('Discovering hint files');
    const startTime = Date.now();

    // Check if hints directory exists
    if (!fs.existsSync(this.hintsDir)) {
      this.logger.info('Hints directory does not exist', { hintsDir: this.hintsDir });
      this.cacheValid = true;
      return [];
    }

    // Recursively discover .md files
    const hintPaths: string[] = [];
    const scanDirectory = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          hintPaths.push(fullPath);
        }
      }
    };

    scanDirectory(this.hintsDir);

    // Load hint files into cache
    this.hintCache.clear();
    for (const hintPath of hintPaths) {
      try {
        const hint = await this.loadHintFile(hintPath);
        this.hintCache.set(hintPath, hint);
        telemetry.trackHintLoaded(hintPath, true, false);
      } catch (error) {
        this.logger.warn(`Failed to load hint file ${hintPath}`, undefined, error as Error);
        telemetry.trackHintLoadError(hintPath, (error as Error).message);
      }
    }

    this.cacheValid = true;
    const duration = Date.now() - startTime;
    this.logger.info('Hint discovery completed', { count: hintPaths.length, duration });

    // Track hint discovery
    telemetry.trackHintDiscovery(hintPaths.length, duration);

    return hintPaths;
  }

  /**
   * Invalidates the hint cache.
   *
   * Called when hint files are added, modified, or deleted.
   */
  invalidateCache(): void {
    this.cacheValid = false;
    this.hintCache.clear();
    telemetry.trackHintCacheInvalidated();
  }

  /**
   * Loads hints relevant to a specific task.
   *
   * Determines which hints to load based on:
   * - Files affected by the task (directory-level hints)
   * - Explicitly declared hints (from spec frontmatter)
   * - Global and project-level hints
   *
   * @param query - Query parameters (affected files, declared hints, etc.)
   * @returns Merged hint content and metadata
   */
  async loadForTask(query: HintQuery): Promise<HintLoadResult> {
    const startTime = Date.now();
    const hints: HintFile[] = [];

    // Discover all hints first
    await this.discoverHints();

    // Get all hints from cache
    const allHints = Array.from(this.hintCache.values());

    // Filter by scope preferences
    const includeGlobal = query.includeGlobal !== false;
    const includeProject = query.includeProject !== false;

    // Add global and project hints if requested
    for (const hint of allHints) {
      if (hint.scope === 'global' && includeGlobal) {
        hints.push(hint);
      } else if (hint.scope === 'project' && includeProject) {
        hints.push(hint);
      }
    }

    // Add directory hints for affected files
    if (query.affectedFiles && query.affectedFiles.length > 0) {
      for (const affectedFile of query.affectedFiles) {
        const fileDir = path.dirname(affectedFile);

        for (const hint of allHints) {
          if (hint.scope === 'directory') {
            // Extract the directory name from the hint path
            // e.g., .specify/hints/api/rest.md -> "api"
            const hintRelativePath = path.relative(this.hintsDir, hint.path);
            const hintDirName = path.dirname(hintRelativePath);

            // Check if affected file's path contains this directory name
            // Match if the directory name appears as a full path segment
            const pathSegments = fileDir.split(path.sep);
            if (pathSegments.includes(hintDirName)) {
              if (!hints.includes(hint)) {
                hints.push(hint);
              }
            }
          }
        }
      }
    }

    // Add declared hints
    if (query.declaredHints && query.declaredHints.length > 0) {
      const declaredHintFiles = await this.loadDeclaredHints(query.declaredHints);
      for (const hint of declaredHintFiles) {
        if (!hints.includes(hint)) {
          hints.push(hint);
        }
      }
    }

    // Merge hints
    const mergedContent = this.mergeHints(hints);
    const loadTime = Date.now() - startTime;

    // Track context matching
    const context = {
      specId: query.affectedFiles?.[0],
      taskId: undefined,
      phase: undefined,
    };
    telemetry.trackHintContextMatch(context, hints.length);

    return {
      mergedContent,
      hints,
      loadTime,
    };
  }

  /**
   * Loads hints explicitly declared by name.
   *
   * Searches for hint files matching the given names.
   * Names can be:
   * - Relative paths: "api/rest-conventions"
   * - Filenames: "rest-conventions"
   *
   * @param hintNames - Array of hint names to load
   * @returns Array of loaded HintFile objects
   */
  async loadDeclaredHints(hintNames: string[]): Promise<HintFile[]> {
    await this.discoverHints();

    const hints: HintFile[] = [];

    for (const name of hintNames) {
      // Try relative path first (with and without .md extension)
      const relativePaths = [
        path.join(this.hintsDir, name),
        path.join(this.hintsDir, `${name}.md`),
      ];

      let found = false;
      for (const relativePath of relativePaths) {
        if (this.hintCache.has(relativePath)) {
          hints.push(this.hintCache.get(relativePath)!);
          found = true;
          break;
        }
      }

      // If not found by relative path, try filename match
      if (!found) {
        for (const [hintPath, hint] of this.hintCache.entries()) {
          const filename = path.basename(hintPath, '.md');
          if (filename === name) {
            hints.push(hint);
            found = true;
            break;
          }
        }
      }
    }

    return hints;
  }

  /**
   * Merges multiple hints into a single context string.
   *
   * Sorting rules:
   * - Sort by priority (highest first)
   * - Within same priority, sort by path (alphabetically)
   *
   * Formatting:
   * - Each hint separated by "---"
   * - Include hint title/path as header
   *
   * @param hints - Array of HintFile objects to merge
   * @returns Merged markdown content
   */
  mergeHints(hints: HintFile[]): string {
    if (hints.length === 0) {
      return '';
    }

    // Sort by priority (highest first), then by path
    const sortedHints = [...hints].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Descending priority
      }
      return a.path.localeCompare(b.path); // Ascending path
    });

    // Build merged content
    const parts: string[] = [];

    for (const hint of sortedHints) {
      // Header with title or path
      const header = hint.metadata?.title || path.relative(this.hintsDir, hint.path);
      parts.push(`## ${header}\n`);
      parts.push(hint.content.trim());
      parts.push('\n');
    }

    return parts.join('\n---\n\n');
  }

  /**
   * Sets up a FileSystemWatcher to monitor hint file changes.
   *
   * Invalidates cache when files are added, changed, or deleted.
   *
   * NOTE: This requires VSCode environment and won't work in unit tests.
   */
  setupFileWatcher(): void {
    if (this.watcher) {
      return; // Already setup
    }

    try {
      // Dynamically import vscode to avoid issues in test environment
      const vscode = require('vscode');

      const watchPattern = new vscode.RelativePattern(this.hintsDir, '**/*.md');

      const watcher = vscode.workspace.createFileSystemWatcher(watchPattern);
      this.watcher = watcher;

      watcher.onDidCreate(() => {
        this.invalidateCache();
      });

      watcher.onDidChange(() => {
        this.invalidateCache();
      });

      watcher.onDidDelete(() => {
        this.invalidateCache();
      });
    } catch (_error) {
      // In test environment, vscode is not available - skip watcher setup
      console.warn('[HintLoader] Could not setup file watcher (not in VSCode environment)');
    }
  }

  /**
   * Disposes of resources (watcher).
   */
  dispose(): void {
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = undefined;
    }
  }
}
