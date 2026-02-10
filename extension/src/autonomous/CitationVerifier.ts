/**
 * CitationVerifier - Validates Memory Citations (Spec 015 US6)
 *
 * Before injecting a memory into context, verifies that file paths and
 * function/class references it mentions still exist on disk.
 *
 * If >50% of citations are stale, adds a warning prefix to the memory content.
 * Does NOT block injection — warning only.
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';

/** Result of citation verification for a single memory */
export interface CitationVerificationResult {
  /** Total citations found in content */
  total: number;
  /** Number of citations that are stale (file not found) */
  stale: number;
  /** List of stale file references */
  staleRefs: string[];
  /** Whether >50% of citations are stale */
  needsReview: boolean;
}

/** File extensions to look for in memory content */
const FILE_EXTENSIONS = /\.(?:ts|tsx|js|jsx|py|md|json|yaml|yml|sh|css|html|go|rs|java|rb|toml|xml|sql|graphql)(?:\b|$)/;

/** Pattern to match file paths in text */
const FILE_PATH_PATTERN = /(?:^|\s|['"`(])([.\/\w-]+(?:\/[\w.-]+)+\.(?:ts|tsx|js|jsx|py|md|json|yaml|yml|sh|css|html|go|rs|java|rb|toml|xml|sql|graphql))\b/g;

/** Pattern to match bare filenames like "extension.ts" or "config.json" */
const BARE_FILE_PATTERN = /(?:^|\s|['"`(])([\w-]+\.(?:ts|tsx|js|jsx|py|md|json|yaml|yml))\b/g;

/** Pattern to match code symbol references (Fix 12: C6) */
const CODE_SYMBOL_PATTERN = /\b(?:function|class|interface|type|enum)\s+(\w+)/g;

/** Pattern to match backtick-quoted identifiers like `FooBar` */
const BACKTICK_SYMBOL_PATTERN = /`(\w{3,})`/g;

export class CitationVerifier {
  constructor(private readonly workspaceRoot: string) {}

  /**
   * Extract file path citations from memory content.
   */
  extractCitations(content: string): string[] {
    const citations = new Set<string>();

    // Match full file paths (e.g., "extension/src/extension.ts")
    let match: RegExpExecArray | null;
    const pathRegex = new RegExp(FILE_PATH_PATTERN.source, 'g');
    while ((match = pathRegex.exec(content)) !== null) {
      const filePath = match[1];
      if (filePath && !filePath.startsWith('http') && !filePath.startsWith('//')) {
        citations.add(filePath);
      }
    }

    return Array.from(citations);
  }

  /**
   * Verify whether cited file paths still exist on disk.
   */
  verifyCitations(content: string): CitationVerificationResult {
    const citations = this.extractCitations(content);

    if (citations.length === 0) {
      return { total: 0, stale: 0, staleRefs: [], needsReview: false };
    }

    const staleRefs: string[] = [];

    for (const citation of citations) {
      const fullPath = path.join(this.workspaceRoot, citation);
      if (!fs.existsSync(fullPath)) {
        staleRefs.push(citation);
      }
    }

    const total = citations.length;
    const stale = staleRefs.length;
    const needsReview = total > 0 && (stale / total) > 0.5;

    return { total, stale, staleRefs, needsReview };
  }

  /**
   * Add a staleness warning prefix to memory content if citations are stale.
   * Returns the original content if no issues found.
   */
  addStalenessWarning(content: string, result: CitationVerificationResult): string {
    if (!result.needsReview) {
      return content;
    }

    const warning = `[STALE CITATIONS: ${result.stale}/${result.total} file references may be outdated: ${result.staleRefs.slice(0, 3).join(', ')}${result.staleRefs.length > 3 ? '...' : ''}] `;
    return warning + content;
  }

  // ── Code Symbol Verification (Fix 12: C6) ────────────────────

  /**
   * Extract code symbol names (function, class, interface, type, enum)
   * from memory content. Also detects backtick-quoted identifiers.
   */
  extractCodeSymbols(content: string): string[] {
    const symbols = new Set<string>();

    let match: RegExpExecArray | null;

    // Match explicit declarations: `function Foo`, `class Bar`, etc.
    const declRegex = new RegExp(CODE_SYMBOL_PATTERN.source, 'g');
    while ((match = declRegex.exec(content)) !== null) {
      if (match[1] && match[1].length >= 3) {
        symbols.add(match[1]);
      }
    }

    // Match backtick-quoted identifiers: `FooBar`
    const btRegex = new RegExp(BACKTICK_SYMBOL_PATTERN.source, 'g');
    while ((match = btRegex.exec(content)) !== null) {
      if (match[1] && /^[A-Z]/.test(match[1])) {
        symbols.add(match[1]);
      }
    }

    return Array.from(symbols);
  }

  /**
   * Verify that code symbols referenced in memory content exist in the codebase.
   * Uses synchronous recursive directory search (fast for typical project sizes).
   *
   * @returns Symbols that could NOT be found
   */
  verifyCodeSymbols(content: string): string[] {
    const symbols = this.extractCodeSymbols(content);
    if (symbols.length === 0) return [];

    const missingSymbols: string[] = [];

    for (const symbol of symbols) {
      if (!this.findSymbolInDirectory(symbol, this.workspaceRoot)) {
        missingSymbols.push(symbol);
      }
    }

    return missingSymbols;
  }

  /**
   * 018 T035: Async version of verifyCodeSymbols for non-blocking operation.
   */
  async verifyCodeSymbolsAsync(content: string): Promise<string[]> {
    const symbols = this.extractCodeSymbols(content);
    if (symbols.length === 0) return [];

    const missingSymbols: string[] = [];
    for (const symbol of symbols) {
      const found = await this.findSymbolInDirectoryAsync(symbol, this.workspaceRoot);
      if (!found) {
        missingSymbols.push(symbol);
      }
    }
    return missingSymbols;
  }

  /**
   * 018 T037: Add [STALE] prefix to content with stale code symbol citations.
   */
  addSymbolStalenessWarnings(content: string, missingSymbols: string[]): string {
    if (missingSymbols.length === 0) return content;
    let result = content;
    for (const symbol of missingSymbols) {
      // Add [STALE] prefix before backtick-quoted symbols
      result = result.replace(new RegExp('`' + symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`', 'g'), `[STALE] \`${symbol}\``);
    }
    return result;
  }

  /**
   * 018 T036: Resolve relative file paths in citations.
   */
  resolveRelativePath(filePath: string): string {
    if (path.isAbsolute(filePath)) return filePath;
    return path.resolve(this.workspaceRoot, filePath);
  }

  /**
   * Recursively search directory for a symbol name in source files.
   * Returns true on first match (short-circuits).
   */
  private findSymbolInDirectory(symbol: string, dirPath: string, depth: number = 0): boolean {
    if (depth > 5) return false; // Limit recursion depth

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return false;
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }
        if (this.findSymbolInDirectory(symbol, fullPath, depth + 1)) {
          return true;
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes(symbol)) {
              return true;
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    }

    return false;
  }

  /**
   * 018 T035: Async version of findSymbolInDirectory.
   */
  private async findSymbolInDirectoryAsync(symbol: string, dirPath: string, depth: number = 0): Promise<boolean> {
    if (depth > 5) return false;

    let entries: fs.Dirent[];
    try {
      entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    } catch {
      return false;
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }
        if (await this.findSymbolInDirectoryAsync(symbol, fullPath, depth + 1)) {
          return true;
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
          try {
            const content = await fsPromises.readFile(fullPath, 'utf-8');
            if (content.includes(symbol)) {
              return true;
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    }

    return false;
  }
}
