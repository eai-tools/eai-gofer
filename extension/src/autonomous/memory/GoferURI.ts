/**
 * GoferURI - Semantic URI scheme for memory and spec discovery
 * Feature 029: Memory System v2
 *
 * Provides gofer:// URI abstraction for uniform resource access across:
 * - specs: Feature specifications (.specify/specs/)
 * - memory: Persistent memories (.specify/memory/)
 * - agent: Agent definitions (.claude/agents/)
 * - session: Session-scoped resources (per feature)
 * - user: User-wide resources (~/.claude/projects/memory/)
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed GoferURI structure
 */
export interface GoferURI {
  /** URI scheme (always 'gofer') */
  scheme: 'gofer';

  /** Resource scope */
  scope: 'specs' | 'memory' | 'agent' | 'session' | 'user';

  /** Path within scope */
  path: string;

  /** Optional fragment for section anchors (e.g., #requirements) */
  fragment?: string;
}

// ============================================================================
// GoferURI Parser
// ============================================================================

/**
 * Parse a gofer:// URI string into structured components
 *
 * @param uri - URI string (e.g., "gofer://memory/core/task-context.md")
 * @returns Parsed GoferURI structure
 * @throws Error if URI is malformed or uses invalid scope
 */
export function parseGoferURI(uri: string): GoferURI {
  // Validate scheme
  if (!uri.startsWith('gofer://')) {
    throw new Error(`Invalid URI scheme: expected 'gofer://', got '${uri.split(':')[0]}'`);
  }

  // Remove scheme
  const withoutScheme = uri.substring(8); // Remove 'gofer://'

  // Extract fragment if present
  let fragment: string | undefined;
  let pathPart = withoutScheme;
  const fragmentIndex = withoutScheme.indexOf('#');
  if (fragmentIndex !== -1) {
    fragment = withoutScheme.substring(fragmentIndex + 1);
    pathPart = withoutScheme.substring(0, fragmentIndex);
  }

  // Split scope and path
  const firstSlash = pathPart.indexOf('/');
  if (firstSlash === -1) {
    throw new Error(`Invalid URI format: missing path after scope in '${uri}'`);
  }

  const scope = pathPart.substring(0, firstSlash);
  const resourcePath = pathPart.substring(firstSlash + 1);

  // Validate scope
  const validScopes = ['specs', 'memory', 'agent', 'session', 'user'];
  if (!validScopes.includes(scope)) {
    throw new Error(`Invalid scope '${scope}': must be one of ${validScopes.join(', ')}`);
  }

  return {
    scheme: 'gofer',
    scope: scope as GoferURI['scope'],
    path: resourcePath,
    fragment,
  };
}

/**
 * Format a GoferURI structure back to URI string
 *
 * @param uri - Parsed GoferURI structure
 * @returns URI string (e.g., "gofer://memory/core/task-context.md#summary")
 */
export function formatGoferURI(uri: GoferURI): string {
  let result = `gofer://${uri.scope}/${uri.path}`;
  if (uri.fragment) {
    result += `#${uri.fragment}`;
  }
  return result;
}

// ============================================================================
// GoferURIResolver
// ============================================================================

/**
 * Resolves gofer:// URIs to filesystem paths with scope mapping
 */
export class GoferURIResolver {
  private scopeMap: Map<string, string>;

  /**
   * @param workspaceRoot - Workspace root path (e.g., /Users/user/Code/project)
   * @param userHome - User home directory (defaults to os.homedir())
   */
  constructor(
    private workspaceRoot: string,
    private userHome: string = os.homedir()
  ) {
    this.scopeMap = new Map([
      ['specs', path.join(workspaceRoot, '.specify/specs')],
      ['memory', path.join(workspaceRoot, '.specify/memory')],
      ['agent', path.join(workspaceRoot, '.claude/agents')],
      ['session', path.join(workspaceRoot, '.specify/specs')], // Resolved per feature
      ['user', path.join(userHome, '.claude/projects/memory')],
    ]);
  }

  /**
   * Parse a URI string
   */
  parse(uri: string): GoferURI {
    return parseGoferURI(uri);
  }

  /**
   * Resolve a GoferURI to absolute filesystem path
   *
   * @param uri - Parsed GoferURI or URI string
   * @returns Absolute filesystem path
   * @throws Error if path traversal detected or scope is invalid
   */
  resolve(uri: GoferURI | string): string {
    const parsed = typeof uri === 'string' ? this.parse(uri) : uri;

    // Get base path for scope
    const basePath = this.scopeMap.get(parsed.scope);
    if (!basePath) {
      throw new Error(`Unknown scope: ${parsed.scope}`);
    }

    // Security: Decode URL encoding before traversal check to prevent %2e%2e attacks
    const decodedPath = decodeURIComponent(parsed.path);

    // Security: Reject absolute paths (double-slash in URI creates /path after parsing)
    if (path.isAbsolute(decodedPath)) {
      throw new Error(`Path traversal detected: '${parsed.path}' escapes scope '${parsed.scope}'`);
    }

    // Resolve path
    const fullPath = path.join(basePath, decodedPath);

    // Security: Prevent path traversal (catches ../ sequences)
    const normalized = path.normalize(fullPath);
    const normalizedBase = path.normalize(basePath);
    if (!normalized.startsWith(normalizedBase + path.sep) && normalized !== normalizedBase) {
      throw new Error(`Path traversal detected: '${parsed.path}' escapes scope '${parsed.scope}'`);
    }

    return normalized;
  }

  /**
   * Resolve a glob pattern to matching filesystem paths
   *
   * @param pattern - Glob pattern with gofer:// URI (e.g., "gofer://specs/029-star/research.md")
   * @returns Array of absolute filesystem paths matching the pattern
   */
  async resolveGlob(pattern: string): Promise<string[]> {
    const parsed = this.parse(pattern);

    // Get base path for scope
    const basePath = this.scopeMap.get(parsed.scope);
    if (!basePath) {
      throw new Error(`Unknown scope: ${parsed.scope}`);
    }

    // Check if pattern contains wildcards
    if (!parsed.path.includes('*') && !parsed.path.includes('?')) {
      // No wildcards - just resolve as regular path
      const resolved = this.resolve(parsed);
      try {
        await fs.access(resolved);
        return [resolved];
      } catch {
        return []; // File doesn't exist
      }
    }

    // For glob patterns, use simple directory traversal
    // Decode percent-encoded characters before path traversal check (mirrors resolve())
    const decodedGlobPath = decodeURIComponent(parsed.path);
    const resolvedGlobPath = path.normalize(path.join(basePath, decodedGlobPath));
    // Always verify containment, not just when encoding was present
    if (!resolvedGlobPath.startsWith(basePath + path.sep) && resolvedGlobPath !== basePath) {
      return [];
    }
    const globPath = resolvedGlobPath;
    const dirPath = path.dirname(globPath);
    const filePattern = path.basename(globPath);

    // Hoist RegExp compilation outside the loop
    const regexPattern = filePattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
    const fileRegex = new RegExp(`^${regexPattern}$`);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const matches: string[] = [];

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);

        if (fileRegex.test(entry.name)) {
          // Security: Verify path doesn't escape scope
          const normalized = path.normalize(entryPath);
          const normalizedBase = path.normalize(basePath);
          if (normalized.startsWith(normalizedBase + path.sep) || normalized === normalizedBase) {
            matches.push(entryPath);
          }
        }
      }

      return matches;
    } catch {
      return []; // Directory doesn't exist
    }
  }

  /**
   * Get the base path for a scope
   */
  getScopePath(scope: GoferURI['scope']): string {
    const basePath = this.scopeMap.get(scope);
    if (!basePath) {
      throw new Error(`Unknown scope: ${scope}`);
    }
    return basePath;
  }
}
