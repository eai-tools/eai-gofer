/**
 * Memory and Learning System - Hints Contracts
 *
 * Defines interfaces for HintFile entity and HintLoader service.
 * These contracts specify the API for hierarchical context injection.
 *
 * @see data-model.md for detailed entity schemas
 */

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Represents a markdown file containing coding standards or context.
 *
 * Hint files are discovered hierarchically and merged based on priority.
 * More specific hints (directory-level) take precedence over general (global).
 */
export interface HintFile {
  /** Absolute file path (e.g., "/project/.specify/hints/api/conventions.md") */
  path: string;

  /** Scope determines precedence: directory > project > global */
  scope: 'global' | 'project' | 'directory';

  /** Priority for conflict resolution (1-10, higher = more specific) */
  priority: number;

  /** Full markdown content */
  content: string;

  /** Optional metadata from YAML frontmatter */
  metadata?: HintMetadata;
}

/**
 * Optional YAML frontmatter metadata in hint files.
 */
export interface HintMetadata {
  /** Human-readable name */
  title?: string;

  /** Categorization tags */
  tags?: string[];

  /** Hint file version (for tracking changes) */
  version?: string;

  /** Author information */
  author?: string;

  /** Last modified date (ISO 8601) */
  lastModified?: string;
}

// ============================================================================
// Task & Spec Interfaces
// ============================================================================

/**
 * Minimal Task interface for hint loading.
 * (Full Task interface defined elsewhere in SpecGofer)
 */
export interface Task {
  /** Task identifier (e.g., "T001") */
  id: string;

  /** Array of file paths affected by this task */
  affectedFiles: string[];

  /** Spec this task belongs to */
  specId: string;
}

/**
 * Minimal Spec interface for hint loading.
 * (Full Spec interface defined elsewhere in SpecGofer)
 */
export interface Spec {
  /** Spec identifier (e.g., "005-authentication") */
  id: string;

  /** Optional declared hints from frontmatter */
  hints?: string[];
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * HintLoader service interface.
 *
 * Provides discovery, loading, and merging of hierarchical hint files.
 * Caches discovered hints for performance.
 */
export interface HintLoader {
  /**
   * Load hints relevant to a specific task.
   *
   * Discovers hints based on task's affected files, then merges
   * with any spec-declared hints. Returns in priority order.
   *
   * @param task - Task being executed
   * @param spec - Spec containing the task
   * @returns Array of relevant HintFile objects
   */
  loadForTask(task: Task, spec: Spec): Promise<HintFile[]>;

  /**
   * Load hints declared in spec frontmatter.
   *
   * @param hintNames - Array of hint identifiers (e.g., ["api-design", "testing"])
   * @returns Array of HintFile objects matching the names
   * @throws Error if any declared hint not found
   */
  loadDeclaredHints(hintNames: string[]): Promise<HintFile[]>;

  /**
   * Discover all hint files in a directory tree.
   *
   * Recursively searches for *.md files and classifies by scope.
   * Results are cached for performance.
   *
   * @param directory - Root directory to search (e.g., ".specify/hints")
   * @returns Array of discovered HintFile objects
   */
  discoverHints(directory: string): Promise<HintFile[]>;

  /**
   * Merge multiple hint files respecting precedence rules.
   *
   * Higher priority hints (directory-level) override lower priority (global).
   * Concatenates content with clear section separators.
   *
   * @param hints - Array of HintFile objects to merge
   * @returns Merged markdown content
   */
  mergeHints(hints: HintFile[]): string;

  /**
   * Invalidate cached hint discoveries.
   *
   * Should be called when hint files are added, modified, or deleted.
   * Typically triggered by file system watcher.
   */
  invalidateCache(): void;

  /**
   * Load a single hint file from disk.
   *
   * Parses YAML frontmatter if present and extracts metadata.
   *
   * @param filePath - Absolute path to hint file
   * @returns HintFile object
   * @throws Error if file not found or not valid markdown
   */
  loadHintFile(filePath: string): Promise<HintFile>;

  /**
   * Determine scope and priority based on file path.
   *
   * @param filePath - Absolute path to hint file
   * @param baseDir - Base directory (.specify/hints)
   * @returns Scope and priority classification
   */
  classifyHint(
    filePath: string,
    baseDir: string
  ): {
    scope: 'global' | 'project' | 'directory';
    priority: number;
  };
}

// ============================================================================
// Hint Discovery
// ============================================================================

/**
 * Options for hint discovery.
 */
export interface HintDiscoveryOptions {
  /** Base directory to search (defaults to ".specify/hints") */
  baseDir?: string;

  /** File pattern to match (defaults to "**\/*.md") */
  pattern?: string;

  /** Whether to use cached results (defaults to true) */
  useCache?: boolean;

  /** Maximum depth to recurse (defaults to 10) */
  maxDepth?: number;
}

/**
 * Result of hint discovery operation.
 */
export interface HintDiscoveryResult {
  /** Discovered hint files */
  hints: HintFile[];

  /** Total count of files discovered */
  count: number;

  /** Discovery time in milliseconds */
  discoveryTime: number;

  /** Whether result was from cache */
  fromCache: boolean;
}

// ============================================================================
// Hint Merging
// ============================================================================

/**
 * Options for merging hint files.
 */
export interface HintMergeOptions {
  /** Whether to include section separators (defaults to true) */
  includeSeparators?: boolean;

  /** Custom separator text */
  separatorText?: string;

  /** Whether to include source file paths in output (defaults to false) */
  includeSourcePaths?: boolean;
}

/**
 * Result of merging hint files.
 */
export interface HintMergeResult {
  /** Merged content */
  content: string;

  /** Source files included (in merge order) */
  sources: string[];

  /** Total character count */
  length: number;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validation result for hint file.
 */
export interface HintValidationResult {
  /** Whether hint file is valid */
  valid: boolean;

  /** Array of warnings (non-blocking) */
  warnings: string[];

  /** Array of errors (blocking) */
  errors: string[];
}

// ============================================================================
// Events
// ============================================================================

/**
 * Events emitted by HintLoader.
 */
export interface HintLoaderEvents {
  /** Emitted when hints are discovered */
  onHintsDiscovered: (result: HintDiscoveryResult) => void;

  /** Emitted when cache is invalidated */
  onCacheInvalidated: () => void;

  /** Emitted when hint file has warnings */
  onHintWarning: (filePath: string, warnings: string[]) => void;
}
