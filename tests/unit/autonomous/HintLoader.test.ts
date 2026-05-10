/**
 * Unit tests for HintLoader
 *
 * Tests hint file loading, discovery, classification, and merging.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import { HintLoader } from '../../../extension/src/autonomous/HintLoader';
import { type HintFile } from '../../../extension/src/autonomous/hint';

// Unmock fs module for these tests
vi.unmock('fs');
vi.unmock('fs/promises');
import * as fs from 'fs';

describe('HintLoader', () => {
  let hintLoader: HintLoader;
  const testWorkspaceRoot = path.join(__dirname, 'test-workspace-hints');
  const hintsDir = path.join(testWorkspaceRoot, '.specify', 'hints');

  beforeEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true });
    }
    fs.mkdirSync(hintsDir, { recursive: true });

    // Create HintLoader instance
    hintLoader = new HintLoader(testWorkspaceRoot);
  });

  afterEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true });
    }

    // Dispose loader
    hintLoader.dispose();
  });

  // ==========================================================================
  // T054: loadHintFile() tests
  // ==========================================================================

  describe('loadHintFile() - T055', () => {
    it('should read and parse a simple markdown file', async () => {
      const hintPath = path.join(hintsDir, 'test.md');
      fs.writeFileSync(hintPath, '# Test Hint\n\nThis is a test hint file.');

      const hint = await hintLoader.loadHintFile(hintPath);

      expect(hint.path).toBe(hintPath);
      expect(hint.content).toContain('# Test Hint');
      expect(hint.content).toContain('This is a test hint file.');
    });

    it('should parse YAML frontmatter', async () => {
      const hintPath = path.join(hintsDir, 'with-frontmatter.md');
      const content = `---
title: API Conventions
tags:
  - api
  - rest
version: "1.0.0"
---

# API Standards

Use RESTful conventions.`;

      fs.writeFileSync(hintPath, content);

      const hint = await hintLoader.loadHintFile(hintPath);

      expect(hint.metadata).toBeDefined();
      expect(hint.metadata?.title).toBe('API Conventions');
      expect(hint.metadata?.tags).toEqual(['api', 'rest']);
      expect(hint.metadata?.version).toBe('1.0.0');
      expect(hint.content).toContain('# API Standards');
    });

    it('should handle files without frontmatter', async () => {
      const hintPath = path.join(hintsDir, 'no-frontmatter.md');
      fs.writeFileSync(hintPath, '# Simple Hint\n\nNo metadata.');

      const hint = await hintLoader.loadHintFile(hintPath);

      expect(hint.metadata).toBeUndefined();
      expect(hint.content).toContain('# Simple Hint');
    });

    it('should throw error if file does not exist', async () => {
      const nonExistentPath = path.join(hintsDir, 'nonexistent.md');

      await expect(hintLoader.loadHintFile(nonExistentPath)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // T056: classifyHint() tests
  // ==========================================================================

  describe('classifyHint() - T057', () => {
    it('should classify global.md as global priority 1', () => {
      const globalPath = path.join(hintsDir, 'global.md');

      const [scope, priority] = hintLoader.classifyHint(globalPath);

      expect(scope).toBe('global');
      expect(priority).toBe(1);
    });

    it('should classify root-level files (not global.md) as project priority 5', () => {
      const projectPath = path.join(hintsDir, 'coding-standards.md');

      const [scope, priority] = hintLoader.classifyHint(projectPath);

      expect(scope).toBe('project');
      expect(priority).toBe(5);
    });

    it('should classify subdirectory files as directory priority 10', () => {
      const dirPath = path.join(hintsDir, 'api', 'rest-conventions.md');

      const [scope, priority] = hintLoader.classifyHint(dirPath);

      expect(scope).toBe('directory');
      expect(priority).toBe(10);
    });

    it('should classify nested subdirectory files as directory priority 10', () => {
      const nestedPath = path.join(hintsDir, 'api', 'v2', 'endpoints', 'conventions.md');

      const [scope, priority] = hintLoader.classifyHint(nestedPath);

      expect(scope).toBe('directory');
      expect(priority).toBe(10);
    });
  });

  // ==========================================================================
  // T058: discoverHints() tests
  // ==========================================================================

  describe('discoverHints() - T059', () => {
    it('should find all .md files recursively', async () => {
      // Create test hint files
      fs.writeFileSync(path.join(hintsDir, 'global.md'), '# Global');
      fs.writeFileSync(path.join(hintsDir, 'project.md'), '# Project');

      fs.mkdirSync(path.join(hintsDir, 'api'), { recursive: true });
      fs.writeFileSync(path.join(hintsDir, 'api', 'rest.md'), '# REST');

      fs.mkdirSync(path.join(hintsDir, 'api', 'v2'), { recursive: true });
      fs.writeFileSync(path.join(hintsDir, 'api', 'v2', 'auth.md'), '# Auth');

      const discovered = await hintLoader.discoverHints();

      expect(discovered).toHaveLength(4);
      expect(discovered.some((p) => p.endsWith('global.md'))).toBe(true);
      expect(discovered.some((p) => p.endsWith('project.md'))).toBe(true);
      expect(discovered.some((p) => p.endsWith('rest.md'))).toBe(true);
      expect(discovered.some((p) => p.endsWith('auth.md'))).toBe(true);
    });

    it('should return empty array when no hints exist', async () => {
      const discovered = await hintLoader.discoverHints();

      expect(discovered).toEqual([]);
    });

    it('should ignore non-.md files', async () => {
      fs.writeFileSync(path.join(hintsDir, 'readme.txt'), 'Not a hint');
      fs.writeFileSync(path.join(hintsDir, 'hint.md'), '# Hint');

      const discovered = await hintLoader.discoverHints();

      expect(discovered).toHaveLength(1);
      expect(discovered[0]).toContain('hint.md');
    });

    it('should cache results on second call', async () => {
      fs.writeFileSync(path.join(hintsDir, 'test.md'), '# Test');

      const first = await hintLoader.discoverHints();
      const second = await hintLoader.discoverHints();

      expect(first).toEqual(second);
    });
  });

  // ==========================================================================
  // T060: Cache invalidation tests
  // ==========================================================================

  describe('invalidateCache() - T061', () => {
    it('should clear cache when invalidateCache() is called', async () => {
      fs.writeFileSync(path.join(hintsDir, 'test.md'), '# Test');

      await hintLoader.discoverHints();

      hintLoader.invalidateCache();

      // Add new file after cache invalidation
      fs.writeFileSync(path.join(hintsDir, 'new.md'), '# New');

      const discovered = await hintLoader.discoverHints();
      expect(discovered).toHaveLength(2);
    });
  });

  // ==========================================================================
  // T062: loadForTask() tests
  // ==========================================================================

  describe('loadForTask() - T063', () => {
    it('should load global and project hints by default', async () => {
      fs.writeFileSync(path.join(hintsDir, 'global.md'), '# Global');
      fs.writeFileSync(path.join(hintsDir, 'project.md'), '# Project');

      const result = await hintLoader.loadForTask({});

      expect(result.hints).toHaveLength(2);
      expect(result.mergedContent).toContain('# Global');
      expect(result.mergedContent).toContain('# Project');
    });

    it('should load directory hints for affected files', async () => {
      fs.mkdirSync(path.join(hintsDir, 'api'), { recursive: true });
      fs.writeFileSync(path.join(hintsDir, 'api', 'rest.md'), '# REST API');

      const result = await hintLoader.loadForTask({
        affectedFiles: [path.join(testWorkspaceRoot, 'src', 'api', 'users.ts')],
      });

      expect(result.hints.some((h) => h.content.includes('# REST API'))).toBe(true);
    });

    it('should respect includeGlobal flag', async () => {
      fs.writeFileSync(path.join(hintsDir, 'global.md'), '# Global');
      fs.writeFileSync(path.join(hintsDir, 'project.md'), '# Project');

      const result = await hintLoader.loadForTask({ includeGlobal: false });

      expect(result.hints.every((h) => h.scope !== 'global')).toBe(true);
    });

    it('should track load time', async () => {
      fs.writeFileSync(path.join(hintsDir, 'test.md'), '# Test');

      const result = await hintLoader.loadForTask({});

      expect(result.loadTime).toBeGreaterThanOrEqual(0);
      expect(result.loadTime).toBeLessThan(500); // <500ms requirement
    });
  });

  // ==========================================================================
  // T064: loadDeclaredHints() tests
  // ==========================================================================

  describe('loadDeclaredHints() - T065', () => {
    it('should load hints by relative path', async () => {
      fs.mkdirSync(path.join(hintsDir, 'api'), { recursive: true });
      fs.writeFileSync(path.join(hintsDir, 'api', 'rest.md'), '# REST Conventions');

      const hints = await hintLoader.loadDeclaredHints(['api/rest']);

      expect(hints).toHaveLength(1);
      expect(hints[0].content).toContain('# REST Conventions');
    });

    it('should load hints by filename', async () => {
      fs.writeFileSync(path.join(hintsDir, 'coding-standards.md'), '# Coding Standards');

      const hints = await hintLoader.loadDeclaredHints(['coding-standards']);

      expect(hints).toHaveLength(1);
      expect(hints[0].content).toContain('# Coding Standards');
    });

    it('should return empty array for nonexistent hints', async () => {
      const hints = await hintLoader.loadDeclaredHints(['nonexistent']);

      expect(hints).toEqual([]);
    });

    it('should load multiple hints', async () => {
      fs.writeFileSync(path.join(hintsDir, 'hint1.md'), '# Hint 1');
      fs.writeFileSync(path.join(hintsDir, 'hint2.md'), '# Hint 2');

      const hints = await hintLoader.loadDeclaredHints(['hint1', 'hint2']);

      expect(hints).toHaveLength(2);
    });
  });

  // ==========================================================================
  // T066: mergeHints() tests
  // ==========================================================================

  describe('mergeHints() - T067', () => {
    it('should merge hints sorted by priority (highest first)', () => {
      const hints: HintFile[] = [
        {
          path: '/hints/global.md',
          scope: 'global',
          priority: 1,
          content: '# Global',
        },
        {
          path: '/hints/api/rest.md',
          scope: 'directory',
          priority: 10,
          content: '# Directory',
        },
        {
          path: '/hints/project.md',
          scope: 'project',
          priority: 5,
          content: '# Project',
        },
      ];

      const merged = hintLoader.mergeHints(hints);

      // Directory (10) should come first, then Project (5), then Global (1)
      const dirIndex = merged.indexOf('# Directory');
      const projIndex = merged.indexOf('# Project');
      const globalIndex = merged.indexOf('# Global');

      expect(dirIndex).toBeLessThan(projIndex);
      expect(projIndex).toBeLessThan(globalIndex);
    });

    it('should separate hints with "---"', () => {
      const hints: HintFile[] = [
        {
          path: '/hints/hint1.md',
          scope: 'project',
          priority: 5,
          content: '# Hint 1',
        },
        {
          path: '/hints/hint2.md',
          scope: 'project',
          priority: 5,
          content: '# Hint 2',
        },
      ];

      const merged = hintLoader.mergeHints(hints);

      expect(merged).toContain('---');
    });

    it('should include hint path as header', () => {
      const hints: HintFile[] = [
        {
          path: '/hints/api/rest.md',
          scope: 'directory',
          priority: 10,
          content: '# REST',
          metadata: { title: 'REST Conventions' },
        },
      ];

      const merged = hintLoader.mergeHints(hints);

      expect(merged).toContain('REST Conventions');
    });

    it('should return empty string for empty hints array', () => {
      const merged = hintLoader.mergeHints([]);

      expect(merged).toBe('');
    });
  });

  // ==========================================================================
  // T077: Performance benchmark
  // ==========================================================================

  describe('Performance Benchmarks (T077)', () => {
    it('should discover 20+ hints in less than 500ms', async () => {
      // Create 20 test hint files
      for (let i = 0; i < 20; i++) {
        const dir = path.join(hintsDir, `dir${i}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'hint.md'), `# Hint ${i}`);
      }

      const startTime = Date.now();
      const discovered = await hintLoader.discoverHints();
      const discoverTime = Date.now() - startTime;

      expect(discovered).toHaveLength(20);
      expect(discoverTime).toBeLessThan(500); // <500ms requirement
    });

    it('should load and merge 10+ hints in less than 500ms', async () => {
      // Create 10 test hint files
      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(
          path.join(hintsDir, `hint${i}.md`),
          `# Hint ${i}\n\nContent for hint ${i}.`
        );
      }

      const startTime = Date.now();
      const result = await hintLoader.loadForTask({});
      const loadTime = Date.now() - startTime;

      expect(result.hints.length).toBeGreaterThanOrEqual(10);
      expect(loadTime).toBeLessThan(500); // <500ms requirement
    });
  });
});
