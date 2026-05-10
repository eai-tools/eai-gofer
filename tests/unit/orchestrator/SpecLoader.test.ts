/**
 * Unit tests for SpecLoader
 * Tasks: T024
 *
 * Tests verify:
 * - loadAllSpecs() with GitHub Gofer parsing
 * - parseSpecHeader() for different metadata formats
 * - loadSpec() for single spec loading
 * - loadGoferTasks() task parsing
 * - Error handling
 *
 * Following "Real Tests with Real Data" philosophy:
 * - No mocking frameworks
 * - Uses real file system operations
 * - Creates actual test fixtures
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SpecLoader } from '../../../src/orchestrator/SpecLoader';
import {
  createTestWorkspace,
  cleanupTestWorkspace,
  createTestSpec,
  createTestTasks,
} from '../../helpers/workspace';

describe('SpecLoader', () => {
  let workspace: string;
  let specLoader: SpecLoader;

  beforeEach(async () => {
    workspace = await createTestWorkspace();
    specLoader = new SpecLoader(path.join(workspace, '.specify/specs'));
  });

  afterEach(async () => {
    await cleanupTestWorkspace(workspace);
  });

  describe('loadAllSpecs() - T024', () => {
    it('should discover all spec directories', async () => {
      // Create multiple specs
      await createTestSpec(
        workspace,
        '001-feature-a',
        `# Feature A
Feature Branch: \`feature-a\`
Created: 2025-01-15
Status: draft

## Overview
Feature A description
`
      );

      await createTestSpec(
        workspace,
        '002-feature-b',
        `# Feature B
Feature Branch: \`feature-b\`
Created: 2025-01-16
Status: in_progress

## Overview
Feature B description
`
      );

      const specs = await specLoader.loadAllSpecs();

      expect(specs.length).toBe(2);
      expect(specs.map((s) => s.id)).toContain('feature-a');
      expect(specs.map((s) => s.id)).toContain('feature-b');
    });

    it('should parse GitHub Gofer format without YAML frontmatter', async () => {
      await createTestSpec(
        workspace,
        '001-test-feature',
        `# Feature Specification: Test Feature
Feature Branch: \`test-feature\`
Created: 2025-01-15
Status: draft

## Overview
This is a test feature.
`
      );

      const specs = await specLoader.loadAllSpecs();

      expect(specs.length).toBe(1);
      expect(specs[0].title).toBe('Test Feature');
      expect(specs[0].status).toBe('draft');
      expect(specs[0].featureBranch).toBe('test-feature');
    });

    it('should parse legacy YAML frontmatter format', async () => {
      await createTestSpec(
        workspace,
        '001-yaml-spec',
        `---
id: "yaml-spec"
title: "YAML Format Spec"
status: "in_progress"
created: "2025-01-15"
---

# Feature Content
This is the main content.
`
      );

      const specs = await specLoader.loadAllSpecs();

      expect(specs.length).toBe(1);
      expect(specs[0].id).toBe('yaml-spec');
      expect(specs[0].title).toBe('YAML Format Spec');
      expect(specs[0].status).toBe('in_progress');
    });

    it('should load tasks from tasks.md', async () => {
      await createTestSpec(
        workspace,
        '001-with-tasks',
        `# Feature With Tasks
Feature Branch: \`with-tasks\`
Status: in_progress

## Overview
Feature with tasks
`
      );

      await createTestTasks(
        workspace,
        '001-with-tasks',
        `# Tasks

- [ ] First task
- [x] Second task (completed)
- [ ] Third task
`
      );

      const specs = await specLoader.loadAllSpecs();

      expect(specs.length).toBe(1);
      expect(specs[0].tasks.length).toBe(3);
      expect(specs[0].tasks[0].status).toBe('pending');
      expect(specs[0].tasks[1].status).toBe('completed');
      expect(specs[0].tasks[2].status).toBe('pending');
    });

    it('should ignore non-directory entries in specs folder', async () => {
      await createTestSpec(workspace, '001-real-spec', '# Real Spec\nStatus: draft');

      // Create a regular file that should be ignored
      await fs.writeFile(
        path.join(workspace, '.specify/specs', 'README.md'),
        '# README\nThis should be ignored'
      );

      const specs = await specLoader.loadAllSpecs();

      expect(specs.length).toBe(1);
      expect(specs[0].title).toBe('Real Spec');
    });

    it('should return empty array when specs directory is empty', async () => {
      const specs = await specLoader.loadAllSpecs();
      expect(specs).toEqual([]);
    });

    it('should handle missing spec.md gracefully', async () => {
      // Create directory without spec.md
      await fs.mkdir(path.join(workspace, '.specify/specs/001-no-spec'), { recursive: true });

      const specs = await specLoader.loadAllSpecs();
      expect(specs).toEqual([]);
    });
  });

  describe('loadSpec() - Single Spec Loading', () => {
    it('should load a single spec by ID', async () => {
      await createTestSpec(
        workspace,
        '001-single-spec',
        `# Single Spec
Feature Branch: \`single-spec\`
Status: testing

## Content
Some content here
`
      );

      const spec = await specLoader.loadSpec('001-single-spec');

      expect(spec).not.toBeNull();
      expect(spec?.title).toBe('Single Spec');
      expect(spec?.status).toBe('testing');
    });

    it('should return null for non-existent spec', async () => {
      const spec = await specLoader.loadSpec('non-existent');
      expect(spec).toBeNull();
    });
  });

  describe('parseSpecHeader() - Metadata Parsing', () => {
    it('should extract title from "Feature Specification:" format', async () => {
      await createTestSpec(
        workspace,
        '001-full-title',
        `# Feature Specification: Full Title Format
Feature Branch: \`full-title\`
Status: draft

## Content
`
      );

      const specs = await specLoader.loadAllSpecs();
      expect(specs[0].title).toBe('Full Title Format');
    });

    it('should extract title from simple format', async () => {
      await createTestSpec(
        workspace,
        '001-simple-title',
        `# Simple Title
Status: draft

## Content
`
      );

      const specs = await specLoader.loadAllSpecs();
      expect(specs[0].title).toBe('Simple Title');
    });

    it('should parse all status values correctly', async () => {
      const statuses = ['draft', 'in_progress', 'testing', 'completed', 'failed'];

      for (const status of statuses) {
        await createTestSpec(
          workspace,
          `status-${status}`,
          `# Status Test
Status: ${status}
`
        );
      }

      const specs = await specLoader.loadAllSpecs();
      expect(specs.length).toBe(5);

      for (const status of statuses) {
        const spec = specs.find((s) => s.featureBranch === `status-${status}`);
        expect(spec?.status).toBe(status);
      }
    });

    it('should default to draft for invalid status', async () => {
      await createTestSpec(
        workspace,
        '001-invalid-status',
        `# Invalid Status Test
Status: invalid_status

## Content
`
      );

      const specs = await specLoader.loadAllSpecs();
      expect(specs[0].status).toBe('draft');
    });

    it('should parse Created date', async () => {
      await createTestSpec(
        workspace,
        '001-dated-spec',
        `# Dated Spec
Created: 2025-01-15

## Content
`
      );

      const specs = await specLoader.loadAllSpecs();
      expect(specs[0].created).toBe('2025-01-15');
    });
  });

  describe('loadGoferTasks() - Task Parsing', () => {
    it('should parse tasks with x (lowercase) as completed', async () => {
      await createTestSpec(workspace, '001-tasks', '# Tasks Test\nStatus: draft');

      await createTestTasks(
        workspace,
        '001-tasks',
        `- [x] Completed task lowercase
- [ ] Pending task
`
      );

      const specs = await specLoader.loadAllSpecs();
      expect(specs[0].tasks[0].status).toBe('completed');
      expect(specs[0].tasks[1].status).toBe('pending');
    });

    it('should handle empty tasks file', async () => {
      await createTestSpec(workspace, '001-empty-tasks', '# Empty Tasks\nStatus: draft');

      await createTestTasks(workspace, '001-empty-tasks', '# Tasks\n\nNo tasks yet.\n');

      const specs = await specLoader.loadAllSpecs();
      expect(specs[0].tasks).toEqual([]);
    });

    it('should generate unique task IDs', async () => {
      await createTestSpec(workspace, '001-multi-tasks', '# Multi Tasks\nStatus: draft');

      await createTestTasks(
        workspace,
        '001-multi-tasks',
        `- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
`
      );

      const specs = await specLoader.loadAllSpecs();
      const taskIds = specs[0].tasks.map((t) => t.id);

      expect(new Set(taskIds).size).toBe(3); // All unique
    });

    it('should handle missing tasks.md (optional)', async () => {
      await createTestSpec(workspace, '001-no-tasks', '# No Tasks File\nStatus: draft');

      const specs = await specLoader.loadAllSpecs();
      expect(specs[0].tasks).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted spec.md content', async () => {
      await createTestSpec(workspace, '001-corrupted', 'This is not a valid spec format at all');

      const specs = await specLoader.loadAllSpecs();

      // Should still load with defaults
      expect(specs.length).toBe(1);
      expect(specs[0].title).toBe('Untitled');
      expect(specs[0].status).toBe('draft');
    });

    it('should handle binary content in spec.md', async () => {
      const specDir = path.join(workspace, '.specify/specs/001-binary');
      await fs.mkdir(specDir, { recursive: true });

      // Write some binary-ish content
      await fs.writeFile(path.join(specDir, 'spec.md'), Buffer.from([0x00, 0x01, 0x02, 0x03]));

      const specs = await specLoader.loadAllSpecs();

      // Should handle gracefully (either load with defaults or skip)
      expect(Array.isArray(specs)).toBe(true);
    });

    it('should return empty array when specs directory does not exist', async () => {
      const invalidLoader = new SpecLoader('/nonexistent/path/specs');
      const specs = await invalidLoader.loadAllSpecs();
      expect(specs).toEqual([]);
    });
  });

  describe('Legacy JSON Format - Backwards Compatibility', () => {
    it('should load JSON specs from non-specs directory', async () => {
      // Create a legacy JSON specs directory
      const legacyDir = path.join(workspace, 'legacy-specs');
      await fs.mkdir(legacyDir, { recursive: true });

      // Write a JSON spec
      await fs.writeFile(
        path.join(legacyDir, 'test-spec.json'),
        JSON.stringify({
          id: 'legacy-spec',
          title: 'Legacy JSON Spec',
          description: 'A legacy spec',
          status: 'draft',
          created: '2025-01-15',
          updated: '2025-01-15',
          priority: 'medium',
          tasks: [],
          acceptanceCriteria: [],
          qaRules: [],
        })
      );

      const legacyLoader = new SpecLoader(legacyDir);
      const specs = await legacyLoader.loadAllSpecs();

      expect(specs.length).toBe(1);
      expect(specs[0].id).toBe('legacy-spec');
      expect(specs[0].title).toBe('Legacy JSON Spec');
    });

    it('should ignore spec-schema.json in legacy directory', async () => {
      const legacyDir = path.join(workspace, 'legacy-specs');
      await fs.mkdir(legacyDir, { recursive: true });

      // Write schema file that should be ignored
      await fs.writeFile(
        path.join(legacyDir, 'spec-schema.json'),
        JSON.stringify({ type: 'object' })
      );

      // Write actual spec
      await fs.writeFile(
        path.join(legacyDir, 'real-spec.json'),
        JSON.stringify({
          id: 'real',
          title: 'Real Spec',
          description: '',
          status: 'draft',
          created: '',
          updated: '',
          priority: 'medium',
          tasks: [],
          acceptanceCriteria: [],
          qaRules: [],
        })
      );

      const legacyLoader = new SpecLoader(legacyDir);
      const specs = await legacyLoader.loadAllSpecs();

      expect(specs.length).toBe(1);
      expect(specs[0].id).toBe('real');
    });
  });

  describe('Performance', () => {
    it('should load 10 specs in under 500ms', async () => {
      // Create 10 specs
      for (let i = 1; i <= 10; i++) {
        const specId = `${String(i).padStart(3, '0')}-perf-test`;
        await createTestSpec(
          workspace,
          specId,
          `# Performance Test ${i}
Feature Branch: \`perf-${i}\`
Status: draft

## Content
Content for performance test ${i}
`
        );
      }

      const start = Date.now();
      const specs = await specLoader.loadAllSpecs();
      const duration = Date.now() - start;

      expect(specs.length).toBe(10);
      expect(duration).toBeLessThan(500);
    });
  });
});
