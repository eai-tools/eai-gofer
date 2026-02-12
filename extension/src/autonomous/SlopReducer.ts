/**
 * SlopReducer — automatic code quality cleanup on file save
 *
 * Composes with SlopDetector for detection, then applies safe auto-fixes
 * for patterns that can be corrected without breaking code: removing
 * console.log/debugger statements, upgrading @ts-ignore to @ts-expect-error.
 *
 * Logs every fix to .specify/logs/slop-reduction.jsonl for audit.
 * Shows batched notifications every N fixes (configurable).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ConfigManager } from '../config';

/** A fixable pattern entry in the registry */
export interface FixPattern {
  name: string;
  regex: RegExp;
  /** Returns modified line, or null to remove the line. Null entry = detection-only. */
  fix: ((line: string) => string | null) | null;
  reason: string;
}

/** JSONL log entry for each fix applied */
export interface FixLogEntry {
  timestamp: string;
  file: string;
  line: number;
  pattern: string;
  originalSnippet: string;
  replacement: string;
  reason: string;
}

/** Result from reduceFile() */
export interface FixResult {
  fixCount: number;
  fixes: FixLogEntry[];
}

/** Result from reduceWorkspace() */
export interface WorkspaceReduceResult {
  filesScanned: number;
  filesFixed: number;
  totalFixes: number;
  fixesByPattern: Record<string, number>;
  fixes: FixLogEntry[];
}

/** Declarative registry of fixable patterns */
const FIX_PATTERNS: FixPattern[] = [
  {
    name: 'console-log',
    regex: /^\s*console\.log\(.*\);\s*$/,
    fix: () => null, // remove line
    reason: 'Remove leftover console.log',
  },
  {
    name: 'debugger',
    regex: /^\s*debugger;\s*$/,
    fix: () => null, // remove line
    reason: 'Remove debugger statement',
  },
  {
    name: 'ts-ignore',
    regex: /\/\/\s*@ts-ignore/,
    fix: (line: string) => line.replace(/\/\/\s*@ts-ignore/, '// @ts-expect-error'),
    reason: 'Upgrade @ts-ignore to @ts-expect-error',
  },
];

/** File extensions eligible for auto-fix */
const FIX_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

/** Patterns that identify test files (excluded from auto-fix) */
const TEST_PATH_PATTERNS = [
  /[/\\]tests[/\\]/,
  /[/\\]test[/\\]/,
  /[/\\]__tests__[/\\]/,
  /[/\\]test-[^/\\]+[/\\]/,
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
];

export class SlopReducer {
  private readonly logger = Logger.for('SlopReducer');
  private readonly reducing = new Set<string>();
  private sessionFixCount = 0;

  constructor(private readonly workspacePath: string) {}

  /** Check if a file is a test file (excluded from auto-fix) */
  isTestFile(filePath: string): boolean {
    return TEST_PATH_PATTERNS.some((pattern) => pattern.test(filePath));
  }

  /** Check if a file extension is eligible for auto-fix */
  isEligibleFile(filePath: string): boolean {
    return FIX_EXTENSIONS.has(path.extname(filePath));
  }

  /** Apply auto-fixes to a single file */
  reduceFile(filePath: string): FixResult {
    const result: FixResult = { fixCount: 0, fixes: [] };

    // Workspace boundary guard — prevent path traversal
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(this.workspacePath)) {
      this.logger.warn(`Skipping file outside workspace: ${filePath}`);
      return result;
    }

    // Re-entrant guard
    if (this.reducing.has(filePath)) {
      return result;
    }

    this.reducing.add(filePath);
    try {
      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        return result;
      }

      const lines = content.split('\n');
      const newLines: string[] = [];
      let changed = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let currentLine: string | null = line;

        for (const pattern of FIX_PATTERNS) {
          if (currentLine === null) break;
          if (!pattern.fix) continue; // detection-only pattern
          if (!pattern.regex.test(currentLine)) continue;

          const originalSnippet = currentLine.trim().substring(0, 120);
          const fixedLine = pattern.fix(currentLine);

          const entry: FixLogEntry = {
            timestamp: new Date().toISOString(),
            file: filePath,
            line: i + 1,
            pattern: pattern.name,
            originalSnippet,
            replacement: fixedLine ?? '',
            reason: pattern.reason,
          };

          result.fixes.push(entry);
          result.fixCount++;
          changed = true;
          currentLine = fixedLine;

          this.logFix(entry);
        }

        if (currentLine !== null) {
          newLines.push(currentLine);
        }
      }

      if (changed) {
        fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
        this.sessionFixCount += result.fixCount;
        this.logger.info(`Reduced ${result.fixCount} slop issues in ${path.basename(filePath)}`);
        this.maybeNotify();
      }

      return result;
    } finally {
      this.reducing.delete(filePath);
    }
  }

  /**
   * Scan and fix all eligible source files in the workspace.
   * Skips node_modules, dist, hidden directories, and test files.
   */
  reduceWorkspace(maxFiles: number = 500): WorkspaceReduceResult {
    const result: WorkspaceReduceResult = {
      filesScanned: 0,
      filesFixed: 0,
      totalFixes: 0,
      fixesByPattern: {},
      fixes: [],
    };

    const walk = (dir: string): void => {
      if (result.filesScanned >= maxFiles) return;

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (result.filesScanned >= maxFiles) return;
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (
            entry.name.startsWith('.') ||
            entry.name === 'node_modules' ||
            entry.name === 'dist'
          ) {
            continue;
          }
          walk(fullPath);
        } else if (entry.isFile()) {
          if (!this.isEligibleFile(fullPath)) continue;
          if (this.isTestFile(fullPath)) continue;
          result.filesScanned++;

          const fileResult = this.reduceFile(fullPath);
          if (fileResult.fixCount > 0) {
            result.filesFixed++;
            result.totalFixes += fileResult.fixCount;
            result.fixes.push(...fileResult.fixes);
            for (const fix of fileResult.fixes) {
              result.fixesByPattern[fix.pattern] = (result.fixesByPattern[fix.pattern] || 0) + 1;
            }
          }
        }
      }
    };

    walk(this.workspacePath);
    this.logger.info(
      `Workspace reduction complete: ${result.totalFixes} fixes in ${result.filesFixed}/${result.filesScanned} files`
    );
    return result;
  }

  /** Append a fix entry to the JSONL audit log */
  private logFix(entry: FixLogEntry): void {
    try {
      const logDir = path.join(this.workspacePath, '.specify', 'logs');
      const logPath = path.join(logDir, 'slop-reduction.jsonl');
      fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
    } catch {
      // Non-fatal — don't block the fix
    }
  }

  /** Show notification every N fixes */
  private maybeNotify(): void {
    const notifyEvery = ConfigManager.getInstance().getSlopReductionNotifyEvery();
    if (this.sessionFixCount > 0 && this.sessionFixCount % notifyEvery === 0) {
      vscode.window
        .showInformationMessage(
          `Gofer: Reduced ${this.sessionFixCount} slop issues this session`,
          'View Log'
        )
        .then((choice) => {
          if (choice === 'View Log') {
            const logPath = path.join(
              this.workspacePath,
              '.specify',
              'logs',
              'slop-reduction.jsonl'
            );
            vscode.workspace.openTextDocument(logPath).then(
              (doc) => vscode.window.showTextDocument(doc),
              () => {
                /* log file may not exist yet */
              }
            );
          }
        });
    }
  }
}
