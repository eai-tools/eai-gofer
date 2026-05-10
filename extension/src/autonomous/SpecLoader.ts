/**
 * SpecLoader - Loads and parses spec files
 *
 * Responsibilities:
 * - Parse spec frontmatter (YAML)
 * - Extract depends_on and hints fields
 * - Validate spec references
 * - Provide spec metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Spec frontmatter data
 */
export interface SpecFrontmatter {
  /** Spec title */
  title?: string;

  /** Spec status */
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked';

  /** Priority */
  priority?: 'P1' | 'P2' | 'P3' | 'P4';

  /** Dependencies on other specs */
  depends_on?: string[];

  /** Hint files to load */
  hints?: string[];

  /** Tags */
  tags?: string[];

  /** Created timestamp */
  created?: string;

  /** Last modified timestamp */
  modified?: string;

  /** Assignee */
  assignee?: string;
}

/**
 * Parsed spec file
 */
export interface ParsedSpec {
  /** Spec identifier (e.g., "001-memory-learning-system") */
  specId: string;

  /** Absolute path to spec file */
  filePath: string;

  /** Frontmatter data */
  frontmatter: SpecFrontmatter;

  /** Spec content (markdown after frontmatter) */
  content: string;
}

/**
 * Validation result for spec dependencies
 */
export interface SpecValidationResult {
  /** Whether all dependencies are valid */
  valid: boolean;

  /** Missing spec IDs */
  missingSpecs: string[];

  /** Invalid spec ID formats */
  invalidFormats: string[];
}

/**
 * SpecLoader class for parsing and validating spec files.
 */
export class SpecLoader {
  private readonly workspaceRoot: string;
  private readonly specsDir: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.specsDir = path.join(workspaceRoot, '.specify', 'specs');
  }

  /**
   * Load and parse a spec file.
   *
   * @param specId - Spec identifier or path
   * @returns Parsed spec data
   */
  loadSpec(specId: string): ParsedSpec {
    // Resolve spec path
    const specPath = this.resolveSpecPath(specId);

    if (!fs.existsSync(specPath)) {
      throw new Error(`Spec file not found: ${specPath}`);
    }

    // Read file
    const content = fs.readFileSync(specPath, 'utf-8');

    // Parse frontmatter
    const frontmatter = this.parseFrontmatter(content);

    // Extract content after frontmatter
    const markdownContent = this.extractContent(content);

    // Determine spec ID from path
    const resolvedSpecId = this.getSpecIdFromPath(specPath);

    return {
      specId: resolvedSpecId,
      filePath: specPath,
      frontmatter,
      content: markdownContent,
    };
  }

  /**
   * Parse YAML frontmatter from spec content.
   *
   * @param content - Raw spec content
   * @returns Frontmatter data
   */
  private parseFrontmatter(content: string): SpecFrontmatter {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return {};
    }

    try {
      const parsed = yaml.load(match[1]) as Record<string, unknown>;
      return this.normalizeFrontmatter(parsed);
    } catch (error) {
      console.warn('Failed to parse spec frontmatter:', error);
      return {};
    }
  }

  /**
   * Normalize frontmatter data to SpecFrontmatter interface.
   *
   * @param data - Raw YAML data
   * @returns Normalized frontmatter
   */
  private normalizeFrontmatter(data: Record<string, unknown>): SpecFrontmatter {
    return {
      title: typeof data.title === 'string' ? data.title : undefined,
      status:
        typeof data.status === 'string' &&
        ['pending', 'in_progress', 'completed', 'blocked'].includes(data.status)
          ? (data.status as SpecFrontmatter['status'])
          : undefined,
      priority:
        typeof data.priority === 'string' && ['P1', 'P2', 'P3', 'P4'].includes(data.priority)
          ? (data.priority as SpecFrontmatter['priority'])
          : undefined,
      depends_on: Array.isArray(data.depends_on)
        ? data.depends_on.filter((item): item is string => typeof item === 'string')
        : undefined,
      hints: Array.isArray(data.hints)
        ? data.hints.filter((item): item is string => typeof item === 'string')
        : undefined,
      tags: Array.isArray(data.tags)
        ? data.tags.filter((item): item is string => typeof item === 'string')
        : undefined,
      created: typeof data.created === 'string' ? data.created : undefined,
      modified: typeof data.modified === 'string' ? data.modified : undefined,
      assignee: typeof data.assignee === 'string' ? data.assignee : undefined,
    };
  }

  /**
   * Extract markdown content after frontmatter.
   *
   * @param content - Raw spec content
   * @returns Markdown content
   */
  private extractContent(content: string): string {
    const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
    return content.replace(frontmatterRegex, '').trim();
  }

  /**
   * Resolve spec path from spec ID or path.
   *
   * @param specId - Spec identifier or path
   * @returns Absolute path to spec.md
   */
  private resolveSpecPath(specId: string): string {
    // If it's already an absolute path, use it
    if (path.isAbsolute(specId) && fs.existsSync(specId)) {
      return specId;
    }

    // Try as spec ID (e.g., "001-memory-learning-system")
    const specPath = path.join(this.specsDir, specId, 'spec.md');
    if (fs.existsSync(specPath)) {
      return specPath;
    }

    // Try as relative path from workspace root
    const relativePath = path.join(this.workspaceRoot, specId);
    if (fs.existsSync(relativePath)) {
      return relativePath;
    }

    throw new Error(`Cannot resolve spec path: ${specId}`);
  }

  /**
   * Get spec ID from file path.
   *
   * @param specPath - Absolute path to spec file
   * @returns Spec identifier
   */
  private getSpecIdFromPath(specPath: string): string {
    const relative = path.relative(this.specsDir, specPath);
    const parts = relative.split(path.sep);

    // Extract directory name (e.g., "001-memory-learning-system")
    return parts[0];
  }

  /**
   * Discover all spec directories.
   *
   * @returns Array of spec IDs
   */
  discoverSpecs(): string[] {
    if (!fs.existsSync(this.specsDir)) {
      return [];
    }

    const entries = fs.readdirSync(this.specsDir, { withFileTypes: true });
    const specIds: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const specPath = path.join(this.specsDir, entry.name, 'spec.md');
        if (fs.existsSync(specPath)) {
          specIds.push(entry.name);
        }
      }
    }

    return specIds;
  }

  /**
   * Validate that declared dependencies reference existing specs.
   *
   * @param specId - Spec identifier
   * @returns Validation result
   */
  validateDependencies(specId: string): SpecValidationResult {
    const spec = this.loadSpec(specId);
    const dependsOn = spec.frontmatter.depends_on || [];

    if (dependsOn.length === 0) {
      return {
        valid: true,
        missingSpecs: [],
        invalidFormats: [],
      };
    }

    const allSpecs = this.discoverSpecs();
    const missingSpecs: string[] = [];
    const invalidFormats: string[] = [];

    // Spec ID format: NNN-name (e.g., "001-memory-learning-system")
    const specIdRegex = /^\d{3}-[a-z0-9-]+$/;

    for (const depId of dependsOn) {
      // Check format
      if (!specIdRegex.test(depId)) {
        invalidFormats.push(depId);
        continue;
      }

      // Check if exists
      if (!allSpecs.includes(depId)) {
        missingSpecs.push(depId);
      }
    }

    const valid = missingSpecs.length === 0 && invalidFormats.length === 0;

    return {
      valid,
      missingSpecs,
      invalidFormats,
    };
  }

  /**
   * Get all specs with their dependencies.
   *
   * @returns Map of spec ID to dependencies
   */
  getAllDependencies(): Map<string, string[]> {
    const allSpecs = this.discoverSpecs();
    const dependencies = new Map<string, string[]>();

    for (const specId of allSpecs) {
      try {
        const spec = this.loadSpec(specId);
        const deps = spec.frontmatter.depends_on || [];
        dependencies.set(specId, deps);
      } catch (error) {
        console.warn(`Failed to load spec ${specId}:`, error);
      }
    }

    return dependencies;
  }
}
