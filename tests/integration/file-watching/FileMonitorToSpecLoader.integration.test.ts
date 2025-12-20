/**
 * Integration Test: File Monitoring → Spec Loading
 *
 * Tests the integration between file system monitoring and spec loading.
 * Uses real file operations and chokidar file watcher (as used in extension).
 *
 * Test Flow:
 * 1. Create test workspace with spec files
 * 2. Initialize chokidar watcher
 * 3. Modify spec file
 * 4. Verify spec loader detects change and reloads
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs/promises';
import { SpecLoader } from '../../../extension/src/autonomous/SpecLoader';
import { createTestWorkspace, cleanupTestWorkspace } from '../../helpers/workspace';
import { waitForCondition } from '../../helpers/async-helpers';

describe('Integration: File Monitoring → Spec Loading', () => {
  let workspacePath: string;
  let specLoader: SpecLoader;
  let fileWatcher: chokidar.FSWatcher | undefined;

  beforeEach(async () => {
    // Create test workspace with .specify structure
    workspacePath = await createTestWorkspace();
    specLoader = new SpecLoader(workspacePath);

    // Create .specify/specs directory
    const specsDir = path.join(workspacePath, '.specify', 'specs');
    await fs.mkdir(specsDir, { recursive: true });
  });

  afterEach(async () => {
    if (fileWatcher) {
      await fileWatcher.close();
      fileWatcher = undefined;
    }
    await cleanupTestWorkspace(workspacePath);
  });

  it('should detect new spec file creation', async () => {
    // Setup file watcher with chokidar on the specs directory
    const changes: string[] = [];
    const specsDir = path.join(workspacePath, '.specify', 'specs');

    fileWatcher = chokidar.watch(specsDir, {
      persistent: true,
      ignoreInitial: true,
      depth: 99,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    fileWatcher.on('add', (filePath: string) => {
      if (filePath.endsWith('spec.md')) {
        changes.push(`created:${filePath}`);
      }
    });

    // Wait for watcher to be ready
    await new Promise<void>((resolve) => {
      fileWatcher!.on('ready', () => resolve());
    });

    // Small delay to ensure watcher is fully initialized
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create new spec directory and file
    const specDir = path.join(workspacePath, '.specify', 'specs', '001-test-spec');
    await fs.mkdir(specDir, { recursive: true });

    const specPath = path.join(specDir, 'spec.md');
    await fs.writeFile(
      specPath,
      `---
title: Test Spec
status: pending
priority: P1
---

# Test Spec

This is a test specification.
`,
      'utf-8'
    );

    // Wait for file watcher to detect change
    await waitForCondition(() => changes.length > 0, 5000);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toContain('001-test-spec');
    expect(changes[0]).toContain('spec.md');

    // Verify spec loader can load the new spec
    const spec = specLoader.loadSpec('001-test-spec');
    expect(spec.specId).toBe('001-test-spec');
    expect(spec.frontmatter.title).toBe('Test Spec');
    expect(spec.frontmatter.status).toBe('pending');
  });

  it('should reload spec when file is modified', async () => {
    // Create initial spec
    const specDir = path.join(workspacePath, '.specify', 'specs', '002-modify-spec');
    await fs.mkdir(specDir, { recursive: true });

    const specPath = path.join(specDir, 'spec.md');
    await fs.writeFile(
      specPath,
      `---
title: Original Title
status: pending
---

# Original Content
`,
      'utf-8'
    );

    // Load initial spec
    const originalSpec = specLoader.loadSpec('002-modify-spec');
    expect(originalSpec.frontmatter.title).toBe('Original Title');
    expect(originalSpec.frontmatter.status).toBe('pending');

    // Setup file watcher with chokidar on the specs directory
    const changes: string[] = [];
    const specsDir = path.join(workspacePath, '.specify', 'specs');

    fileWatcher = chokidar.watch(specsDir, {
      persistent: true,
      ignoreInitial: true,
      depth: 99,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    fileWatcher.on('change', (filePath: string) => {
      if (filePath.endsWith('spec.md')) {
        changes.push(`changed:${filePath}`);
      }
    });

    // Wait for watcher to be ready
    await new Promise<void>((resolve) => {
      fileWatcher!.on('ready', () => resolve());
    });

    // Small delay to ensure watcher is fully initialized
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Modify the spec file
    await fs.writeFile(
      specPath,
      `---
title: Modified Title
status: in_progress
priority: P2
---

# Modified Content
`,
      'utf-8'
    );

    // Wait for file watcher to detect change
    await waitForCondition(() => changes.length > 0, 5000);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toContain('002-modify-spec');
    expect(changes[0]).toContain('spec.md');

    // Reload and verify changes
    const modifiedSpec = specLoader.loadSpec('002-modify-spec');
    expect(modifiedSpec.frontmatter.title).toBe('Modified Title');
    expect(modifiedSpec.frontmatter.status).toBe('in_progress');
    expect(modifiedSpec.frontmatter.priority).toBe('P2');
    expect(modifiedSpec.content).toContain('Modified Content');
  });

  it('should handle spec file deletion', async () => {
    // Create spec to be deleted
    const specDir = path.join(workspacePath, '.specify', 'specs', '003-delete-spec');
    await fs.mkdir(specDir, { recursive: true });

    const specPath = path.join(specDir, 'spec.md');
    await fs.writeFile(
      specPath,
      `---
title: To Be Deleted
---

# Content
`,
      'utf-8'
    );

    // Verify spec exists
    const spec = specLoader.loadSpec('003-delete-spec');
    expect(spec.specId).toBe('003-delete-spec');

    // Setup file watcher with chokidar on the specs directory
    const deletions: string[] = [];
    const specsDir = path.join(workspacePath, '.specify', 'specs');

    fileWatcher = chokidar.watch(specsDir, {
      persistent: true,
      ignoreInitial: true,
      depth: 99,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    fileWatcher.on('unlink', (filePath: string) => {
      if (filePath.endsWith('spec.md')) {
        deletions.push(`deleted:${filePath}`);
      }
    });

    // Wait for watcher to be ready
    await new Promise<void>((resolve) => {
      fileWatcher!.on('ready', () => resolve());
    });

    // Small delay to ensure watcher is fully initialized
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Delete the spec file
    await fs.unlink(specPath);

    // Wait for file watcher to detect deletion
    await waitForCondition(() => deletions.length > 0, 5000);

    expect(deletions).toHaveLength(1);
    expect(deletions[0]).toContain('003-delete-spec');
    expect(deletions[0]).toContain('spec.md');

    // Verify spec loader throws error when trying to load deleted spec
    expect(() => specLoader.loadSpec('003-delete-spec')).toThrow('Cannot resolve spec path');
  });

  it('should handle multiple rapid file changes', async () => {
    // Create spec
    const specDir = path.join(workspacePath, '.specify', 'specs', '004-rapid-changes');
    await fs.mkdir(specDir, { recursive: true });

    const specPath = path.join(specDir, 'spec.md');
    await fs.writeFile(
      specPath,
      `---
title: Initial
---

# Content
`,
      'utf-8'
    );

    // Setup file watcher with chokidar on the specs directory
    const changes: string[] = [];
    const specsDir = path.join(workspacePath, '.specify', 'specs');

    fileWatcher = chokidar.watch(specsDir, {
      persistent: true,
      ignoreInitial: true,
      depth: 99,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    fileWatcher.on('change', (filePath: string) => {
      if (filePath.endsWith('spec.md')) {
        changes.push(`changed:${filePath}`);
      }
    });

    // Wait for watcher to be ready
    await new Promise<void>((resolve) => {
      fileWatcher!.on('ready', () => resolve());
    });

    // Small delay to ensure watcher is fully initialized
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Make multiple rapid changes
    for (let i = 1; i <= 5; i++) {
      await fs.writeFile(
        specPath,
        `---
title: Change ${i}
---

# Content ${i}
`,
        'utf-8'
      );
      // Delay to allow file system to register change
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    // Wait for all changes to be detected (chokidar may coalesce some due to awaitWriteFinish)
    await waitForCondition(() => changes.length >= 1, 6000);

    expect(changes.length).toBeGreaterThanOrEqual(1);

    // Verify final state is correct
    const finalSpec = specLoader.loadSpec('004-rapid-changes');
    expect(finalSpec.frontmatter.title).toBe('Change 5');
    expect(finalSpec.content).toContain('Content 5');
  });

  it('should discover all specs after multiple creations', async () => {
    // Create multiple specs
    for (let i = 1; i <= 3; i++) {
      const specDir = path.join(workspacePath, '.specify', 'specs', `00${i}-multi-spec-${i}`);
      await fs.mkdir(specDir, { recursive: true });

      await fs.writeFile(
        path.join(specDir, 'spec.md'),
        `---
title: Spec ${i}
---

# Spec ${i}
`,
        'utf-8'
      );
    }

    // Discover all specs
    const allSpecs = specLoader.discoverSpecs();
    expect(allSpecs).toHaveLength(3);
    expect(allSpecs).toContain('001-multi-spec-1');
    expect(allSpecs).toContain('002-multi-spec-2');
    expect(allSpecs).toContain('003-multi-spec-3');

    // Verify each can be loaded
    for (const specId of allSpecs) {
      const spec = specLoader.loadSpec(specId);
      expect(spec.specId).toBe(specId);
      expect(spec.frontmatter.title).toBeDefined();
    }
  });
});
