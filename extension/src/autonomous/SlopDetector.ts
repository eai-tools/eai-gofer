/**
 * SlopDetector — pattern-based detection of common AI code quality issues
 *
 * Scans source files for patterns that indicate "slop" — low-quality AI-generated
 * code that should be reviewed: disabled tests, empty catch blocks, `as any`
 * casts, leftover console.log/debugger, TODO without issue references, etc.
 *
 * Returns structured results; does NOT modify files.
 *
 * @see .specify/specs/016-top5-context-gaps/plan.md Fix 11 (J2)
 */

import * as fs from 'fs';
import * as path from 'path';

export type SlopSeverity = 'error' | 'warning' | 'info';

export interface SlopMatch {
  file: string;
  line: number;
  pattern: string;
  severity: SlopSeverity;
  message: string;
  snippet: string;
}

export interface SlopReport {
  matches: SlopMatch[];
  filesScanned: number;
  totalIssues: number;
}

interface SlopPattern {
  regex: RegExp;
  severity: SlopSeverity;
  name: string;
  message: string;
}

const SLOP_PATTERNS: SlopPattern[] = [
  {
    regex: /\bit\.skip\b|\btest\.skip\b|\bdescribe\.skip\b|\bxit\b|\bxdescribe\b/,
    severity: 'error',
    name: 'disabled-test',
    message: 'Disabled test found — remove or re-enable',
  },
  {
    regex: /\bTODO\b(?!.*(?:#\d+|[A-Z]+-\d+))/,
    severity: 'warning',
    name: 'todo-no-issue',
    message: 'TODO without issue reference (add #123 or JIRA-456)',
  },
  {
    regex: /catch\s*\([^)]*\)\s*\{\s*\}/,
    severity: 'warning',
    name: 'empty-catch',
    message: 'Empty catch block — at least log the error',
  },
  {
    regex: /\bas\s+any\b/,
    severity: 'warning',
    name: 'as-any',
    message: '`as any` cast — use proper types or `unknown`',
  },
  {
    regex: /\bconsole\.log\b/,
    severity: 'info',
    name: 'console-log',
    message: 'console.log left in code — use logger or remove',
  },
  {
    regex: /\bdebugger\b/,
    severity: 'error',
    name: 'debugger',
    message: '`debugger` statement left in code',
  },
  {
    regex: /\/\/\s*@ts-ignore/,
    severity: 'warning',
    name: 'ts-ignore',
    message: '@ts-ignore suppression — use @ts-expect-error with explanation',
  },
];

/** File extensions to scan */
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

export class SlopDetector {
  /**
   * Scan a single file for slop patterns.
   */
  scanFile(filePath: string): SlopMatch[] {
    const matches: SlopMatch[] = [];

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return matches;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of SLOP_PATTERNS) {
        if (pattern.regex.test(line)) {
          matches.push({
            file: filePath,
            line: i + 1,
            pattern: pattern.name,
            severity: pattern.severity,
            message: pattern.message,
            snippet: line.trim().substring(0, 120),
          });
        }
      }
    }

    return matches;
  }

  /**
   * Scan a directory recursively for slop patterns.
   * Skips node_modules, dist, and hidden directories.
   */
  scanDirectory(dirPath: string, maxFiles: number = 500): SlopReport {
    const matches: SlopMatch[] = [];
    let filesScanned = 0;

    const walk = (dir: string): void => {
      if (filesScanned >= maxFiles) {return;}

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (filesScanned >= maxFiles) {return;}

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
            continue;
          }
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (SCAN_EXTENSIONS.has(ext)) {
            filesScanned++;
            matches.push(...this.scanFile(fullPath));
          }
        }
      }
    };

    walk(dirPath);

    return {
      matches,
      filesScanned,
      totalIssues: matches.length,
    };
  }
}
