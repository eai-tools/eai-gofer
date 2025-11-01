/**
 * Hierarchical Context Hints - Type Definitions
 *
 * Defines types for directory-specific coding standards and patterns.
 */

/**
 * HintFile represents a markdown file containing coding standards, patterns, or project context.
 *
 * Hints provide directory-specific guidance that gets injected into LLM context
 * based on which files are being modified.
 */
export interface HintFile {
  /** Absolute file path (e.g., "/project/.specify/hints/api/conventions.md") */
  path: string;

  /** Classification: global (project-wide), project (root), or directory (specific folder) */
  scope: 'global' | 'project' | 'directory';

  /** Priority: 1-10, higher = more specific (directory=10, project=5, global=1) */
  priority: number;

  /** Full markdown content */
  content: string;

  /** Metadata from YAML frontmatter (optional) */
  metadata?: {
    /** Human-readable name */
    title?: string;
    /** Categorization tags */
    tags?: string[];
    /** Hint file version (for tracking changes) */
    version?: string;
  };
}

/**
 * Query parameters for loading hints.
 */
export interface HintQuery {
  /** Load hints for specific file paths (determines directory-level hints) */
  affectedFiles?: string[];

  /** Load hints explicitly declared by name */
  declaredHints?: string[];

  /** Include global hints (default: true) */
  includeGlobal?: boolean;

  /** Include project-level hints (default: true) */
  includeProject?: boolean;
}

/**
 * Result of loading and merging hints.
 */
export interface HintLoadResult {
  /** Merged hint content, formatted for LLM context */
  mergedContent: string;

  /** Individual hint files that were loaded */
  hints: HintFile[];

  /** Time taken to load hints (milliseconds) */
  loadTime: number;
}
