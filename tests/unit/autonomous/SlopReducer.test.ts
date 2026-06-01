/**
 * Unit tests for SlopReducer
 *
 * Tests auto-fix engine: pattern matching, file reduction, workspace boundary
 * guard, re-entrant guard, JSONL logging, batched notifications, and test file exclusion.
 *
 * @see .specify/specs/001-yolo-slop-reduction/tasks.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SlopReducer } from '../../../extension/src/autonomous/SlopReducer';

// mock-justified: VSCode API — not available in unit test environment
vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn().mockResolvedValue(undefined),
  },
  workspace: {
    openTextDocument: vi.fn().mockResolvedValue({}),
  },
}));

// mock-justified: VSCode API — Logger depends on vscode.OutputChannel
vi.mock('../../../extension/src/utils/logger', () => ({
  Logger: {
    for: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));

describe('SlopReducer', () => {
  const workspacePath = '/mock/workspace';
  let reducer: SlopReducer;

  beforeEach(() => {
    vi.clearAllMocks();
    reducer = new SlopReducer(workspacePath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // isTestFile tests (T010)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('isTestFile', () => {
    it('should identify files in tests/ directory', () => {
      expect(reducer.isTestFile('/project/tests/unit/foo.ts')).toBe(true);
    });

    it('should identify files in test/ directory', () => {
      expect(reducer.isTestFile('/project/test/foo.ts')).toBe(true);
    });

    it('should identify files in __tests__/ directory', () => {
      expect(reducer.isTestFile('/project/__tests__/foo.ts')).toBe(true);
    });

    it('should identify files in test-* directories', () => {
      expect(reducer.isTestFile('/project/test-workspace/foo.ts')).toBe(true);
    });

    it('should identify .test.ts files', () => {
      expect(reducer.isTestFile('/project/src/foo.test.ts')).toBe(true);
    });

    it('should identify .spec.ts files', () => {
      expect(reducer.isTestFile('/project/src/foo.spec.ts')).toBe(true);
    });

    it('should identify .test.tsx files', () => {
      expect(reducer.isTestFile('/project/src/component.test.tsx')).toBe(true);
    });

    it('should not flag regular source files', () => {
      expect(reducer.isTestFile('/project/src/service.ts')).toBe(false);
    });

    it('should not flag files with "test" in the name but not matching patterns', () => {
      expect(reducer.isTestFile('/project/src/testUtils.ts')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // isEligibleFile tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('isEligibleFile', () => {
    it('should accept .ts files', () => {
      expect(reducer.isEligibleFile('file.ts')).toBe(true);
    });

    it('should accept .tsx files', () => {
      expect(reducer.isEligibleFile('file.tsx')).toBe(true);
    });

    it('should accept .js files', () => {
      expect(reducer.isEligibleFile('file.js')).toBe(true);
    });

    it('should accept .jsx files', () => {
      expect(reducer.isEligibleFile('file.jsx')).toBe(true);
    });

    it('should reject .md files', () => {
      expect(reducer.isEligibleFile('README.md')).toBe(false);
    });

    it('should reject .json files', () => {
      expect(reducer.isEligibleFile('package.json')).toBe(false);
    });

    it('should reject .py files', () => {
      expect(reducer.isEligibleFile('script.py')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // reduceFile — console.log removal (T009, AC1.2)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('reduceFile — console.log pattern', () => {
    it('should remove standalone console.log lines', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('const x = 1;\n  console.log(x);\nreturn x;\n');

      const filePath = path.join(workspacePath, 'src/file.ts');
      const result = reducer.reduceFile(filePath);

      expect(result.fixCount).toBe(1);
      expect(result.fixes[0].pattern).toBe('console-log');
      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalledWith(
        filePath,
        'const x = 1;\nreturn x;\n',
        'utf-8'
      );
    });

    it('should not remove console.log that is part of a larger expression', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('const result = console.log(x) || fallback;\n');

      const filePath = path.join(workspacePath, 'src/file.ts');
      const result = reducer.reduceFile(filePath);

      expect(result.fixCount).toBe(0);
      expect(vi.mocked(fs.writeFileSync)).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // reduceFile — debugger removal (T009, AC1.3)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('reduceFile — debugger pattern', () => {
    it('should remove debugger statements', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('function foo() {\n  debugger;\n  return 1;\n}\n');

      const filePath = path.join(workspacePath, 'src/file.ts');
      const result = reducer.reduceFile(filePath);

      expect(result.fixCount).toBe(1);
      expect(result.fixes[0].pattern).toBe('debugger');
      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalledWith(
        filePath,
        'function foo() {\n  return 1;\n}\n',
        'utf-8'
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // reduceFile — @ts-ignore upgrade (T009, AC1.4)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('reduceFile — ts-ignore pattern', () => {
    it('should replace @ts-ignore with @ts-expect-error', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('// @ts-ignore\nconst x: any = 1;\n');

      const filePath = path.join(workspacePath, 'src/file.ts');
      const result = reducer.reduceFile(filePath);

      expect(result.fixCount).toBe(1);
      expect(result.fixes[0].pattern).toBe('ts-ignore');
      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalledWith(
        filePath,
        '// @ts-expect-error\nconst x: any = 1;\n',
        'utf-8'
      );
    });

    it('should handle @ts-ignore with varying spacing', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('//  @ts-ignore\nconst x = 1;\n');

      const filePath = path.join(workspacePath, 'src/file.ts');
      const result = reducer.reduceFile(filePath);

      expect(result.fixCount).toBe(1);
      expect(result.fixes[0].replacement).toContain('@ts-expect-error');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // reduceFile — no changes needed (AC1.6)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('reduceFile — no changes', () => {
    it('should not write file when no patterns match', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('const x = 1;\nconst y = 2;\nreturn x + y;\n');

      const filePath = path.join(workspacePath, 'src/clean.ts');
      const result = reducer.reduceFile(filePath);

      expect(result.fixCount).toBe(0);
      expect(result.fixes).toHaveLength(0);
      expect(vi.mocked(fs.writeFileSync)).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // reduceFile — multiple patterns in one file
  // ─────────────────────────────────────────────────────────────────────────────

  describe('reduceFile — multiple patterns', () => {
    it('should handle multiple patterns in a single file', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        '// @ts-ignore\n  console.log("debug");\n  debugger;\nreturn 1;\n'
      );

      const filePath = path.join(workspacePath, 'src/multi.ts');
      const result = reducer.reduceFile(filePath);

      expect(result.fixCount).toBe(3);
      expect(result.fixes.map((f) => f.pattern)).toEqual(['ts-ignore', 'console-log', 'debugger']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Workspace boundary guard (Security)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('workspace boundary guard', () => {
    it('should reject files outside workspace', () => {
      const result = reducer.reduceFile('/etc/passwd');

      expect(result.fixCount).toBe(0);
      expect(vi.mocked(fs.readFileSync)).not.toHaveBeenCalled();
    });

    it('should reject path traversal attempts', () => {
      const result = reducer.reduceFile(path.join(workspacePath, '..', '..', 'etc', 'passwd'));

      expect(result.fixCount).toBe(0);
      expect(vi.mocked(fs.readFileSync)).not.toHaveBeenCalled();
    });

    it('should allow files within workspace', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('const x = 1;\n');

      const filePath = path.join(workspacePath, 'src/file.ts');
      const result = reducer.reduceFile(filePath);

      expect(vi.mocked(fs.readFileSync)).toHaveBeenCalledWith(filePath, 'utf-8');
      expect(result.fixCount).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Re-entrant guard (T012, AC1.7)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('re-entrant guard', () => {
    it('should skip file already being reduced', () => {
      const filePath = path.join(workspacePath, 'src/file.ts');
      // Simulate re-entrant call by making readFileSync trigger reduceFile again
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        // Try re-entrant call — should be no-op
        const reentrantResult = reducer.reduceFile(filePath);
        expect(reentrantResult.fixCount).toBe(0);
        return 'const x = 1;\n';
      });

      reducer.reduceFile(filePath);
      expect(vi.mocked(fs.readFileSync)).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // JSONL logging (T013-T014, AC2.1-AC2.4)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('JSONL logging', () => {
    it('should log each fix to JSONL file', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('  debugger;\n');

      const filePath = path.join(workspacePath, 'src/file.ts');
      reducer.reduceFile(filePath);

      expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(
        path.join(workspacePath, '.specify', 'logs'),
        { recursive: true }
      );
      expect(vi.mocked(fs.appendFileSync)).toHaveBeenCalledTimes(1);

      const logCall = vi.mocked(fs.appendFileSync).mock.calls[0];
      expect(logCall[0]).toBe(path.join(workspacePath, '.specify', 'logs', 'slop-reduction.jsonl'));
      const entry = JSON.parse((logCall[1] as string).trim());
      expect(entry.pattern).toBe('debugger');
      expect(entry.file).toBe(filePath);
      expect(entry.line).toBe(1);
      expect(entry.reason).toBe('Remove debugger statement');
      expect(entry.timestamp).toBeDefined();
    });

    it('should not crash if logging fails', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('  debugger;\n');
      vi.mocked(fs.appendFileSync).mockImplementation(() => {
        throw new Error('disk full');
      });

      const filePath = path.join(workspacePath, 'src/file.ts');
      const result = reducer.reduceFile(filePath);

      // Fix still applied despite logging failure
      expect(result.fixCount).toBe(1);
      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // File read error handling
  // ─────────────────────────────────────────────────────────────────────────────

  describe('file read error handling', () => {
    it('should return empty result when file cannot be read', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const filePath = path.join(workspacePath, 'src/missing.ts');
      const result = reducer.reduceFile(filePath);

      expect(result.fixCount).toBe(0);
      expect(result.fixes).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Notification batching (T015-T018, AC3.1-AC3.4)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('silent background operation', () => {
    it('should not show any notification after fixes (silent mode)', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(
        undefined as unknown as string
      );

      // Create content with 10 debugger statements
      const lines = Array.from({ length: 10 }, () => '  debugger;\n').join('');
      vi.mocked(fs.readFileSync).mockReturnValue(lines);

      const filePath = path.join(workspacePath, 'src/file.ts');
      reducer.reduceFile(filePath);

      // No notifications — slop reduction runs silently in background
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FixLogEntry shape (AC2.2)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('FixLogEntry shape', () => {
    it('should include all required fields in fix entries', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('// @ts-ignore\nconst x = 1;\n');

      const filePath = path.join(workspacePath, 'src/file.ts');
      const result = reducer.reduceFile(filePath);

      const entry = result.fixes[0];
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('file', filePath);
      expect(entry).toHaveProperty('line', 1);
      expect(entry).toHaveProperty('pattern', 'ts-ignore');
      expect(entry).toHaveProperty('originalSnippet');
      expect(entry).toHaveProperty('replacement');
      expect(entry).toHaveProperty('reason');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // reduceWorkspace — workspace-wide scan and fix
  // ─────────────────────────────────────────────────────────────────────────────

  describe('reduceWorkspace', () => {
    const makeDirent = (name: string, isDir: boolean): fs.Dirent =>
      ({
        name,
        isDirectory: () => isDir,
        isFile: () => !isDir,
      }) as fs.Dirent;

    it('should scan and fix eligible files in workspace', () => {
      // Root directory has src/ subdirectory
      vi.mocked(fs.readdirSync).mockImplementation((dir: fs.PathLike) => {
        const dirStr = dir.toString();
        if (dirStr === workspacePath) {
          return [makeDirent('src', true)] as unknown as fs.Dirent[];
        }
        if (dirStr === path.join(workspacePath, 'src')) {
          return [makeDirent('file.ts', false)] as unknown as fs.Dirent[];
        }
        return [] as unknown as fs.Dirent[];
      });

      vi.mocked(fs.readFileSync).mockReturnValue('  debugger;\nconst x = 1;\n');

      const result = reducer.reduceWorkspace();

      expect(result.filesScanned).toBe(1);
      expect(result.filesFixed).toBe(1);
      expect(result.totalFixes).toBe(1);
      expect(result.fixesByPattern['debugger']).toBe(1);
    });

    it('should skip node_modules and hidden directories', () => {
      vi.mocked(fs.readdirSync).mockImplementation((dir: fs.PathLike) => {
        const dirStr = dir.toString();
        if (dirStr === workspacePath) {
          return [
            makeDirent('node_modules', true),
            makeDirent('.git', true),
            makeDirent('dist', true),
            makeDirent('src', true),
          ] as unknown as fs.Dirent[];
        }
        if (dirStr === path.join(workspacePath, 'src')) {
          return [makeDirent('clean.ts', false)] as unknown as fs.Dirent[];
        }
        return [] as unknown as fs.Dirent[];
      });

      vi.mocked(fs.readFileSync).mockReturnValue('const x = 1;\n');

      const result = reducer.reduceWorkspace();

      // Only src/clean.ts should be scanned
      expect(result.filesScanned).toBe(1);
      expect(result.totalFixes).toBe(0);
    });

    it('should skip test files', () => {
      vi.mocked(fs.readdirSync).mockImplementation((dir: fs.PathLike) => {
        const dirStr = dir.toString();
        if (dirStr === workspacePath) {
          return [makeDirent('tests', true), makeDirent('src', true)] as unknown as fs.Dirent[];
        }
        if (dirStr === path.join(workspacePath, 'tests')) {
          return [makeDirent('foo.test.ts', false)] as unknown as fs.Dirent[];
        }
        if (dirStr === path.join(workspacePath, 'src')) {
          return [makeDirent('app.ts', false)] as unknown as fs.Dirent[];
        }
        return [] as unknown as fs.Dirent[];
      });

      vi.mocked(fs.readFileSync).mockReturnValue('  debugger;\n');

      const result = reducer.reduceWorkspace();

      // tests/foo.test.ts is in tests/ dir → excluded. src/app.ts is scanned.
      expect(result.filesScanned).toBe(1);
      expect(result.filesFixed).toBe(1);
    });

    it('should return zero fixes when workspace is clean', () => {
      vi.mocked(fs.readdirSync).mockImplementation((dir: fs.PathLike) => {
        const dirStr = dir.toString();
        if (dirStr === workspacePath) {
          return [makeDirent('src', true)] as unknown as fs.Dirent[];
        }
        if (dirStr === path.join(workspacePath, 'src')) {
          return [makeDirent('clean.ts', false)] as unknown as fs.Dirent[];
        }
        return [] as unknown as fs.Dirent[];
      });

      vi.mocked(fs.readFileSync).mockReturnValue('const x = 1;\n');

      const result = reducer.reduceWorkspace();

      expect(result.filesScanned).toBe(1);
      expect(result.filesFixed).toBe(0);
      expect(result.totalFixes).toBe(0);
      expect(Object.keys(result.fixesByPattern)).toHaveLength(0);
    });

    it('should aggregate fixes by pattern', () => {
      vi.mocked(fs.readdirSync).mockImplementation((dir: fs.PathLike) => {
        const dirStr = dir.toString();
        if (dirStr === workspacePath) {
          return [makeDirent('src', true)] as unknown as fs.Dirent[];
        }
        if (dirStr === path.join(workspacePath, 'src')) {
          return [makeDirent('a.ts', false), makeDirent('b.ts', false)] as unknown as fs.Dirent[];
        }
        return [] as unknown as fs.Dirent[];
      });

      vi.mocked(fs.readFileSync).mockReturnValue('  debugger;\n// @ts-ignore\nconst x = 1;\n');

      const result = reducer.reduceWorkspace();

      expect(result.filesScanned).toBe(2);
      expect(result.filesFixed).toBe(2);
      expect(result.totalFixes).toBe(4); // 2 fixes × 2 files
      expect(result.fixesByPattern['debugger']).toBe(2);
      expect(result.fixesByPattern['ts-ignore']).toBe(2);
    });

    it('should respect maxFiles limit', () => {
      vi.mocked(fs.readdirSync).mockImplementation((dir: fs.PathLike) => {
        const dirStr = dir.toString();
        if (dirStr === workspacePath) {
          return [makeDirent('src', true)] as unknown as fs.Dirent[];
        }
        if (dirStr === path.join(workspacePath, 'src')) {
          return [
            makeDirent('a.ts', false),
            makeDirent('b.ts', false),
            makeDirent('c.ts', false),
          ] as unknown as fs.Dirent[];
        }
        return [] as unknown as fs.Dirent[];
      });

      vi.mocked(fs.readFileSync).mockReturnValue('const x = 1;\n');

      const result = reducer.reduceWorkspace(2);

      expect(result.filesScanned).toBe(2);
    });
  });
});
