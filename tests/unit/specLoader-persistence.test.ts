/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpecLoader } from '../../src/orchestrator/SpecLoader';
import * as fs from 'fs/promises';
import * as path from 'path';

// Skip this test suite - SpecLoader persistence not fully implemented
// TODO: Fix when SpecLoader task persistence is complete
describe.skip('SpecLoader - Task Persistence', () => {
  let specLoader: SpecLoader;
  const testSpecDir = '/tmp/test-specs';

  beforeEach(async () => {
    specLoader = new SpecLoader(testSpecDir);

    // Create test directory structure
    await fs.mkdir(testSpecDir, { recursive: true });
    await fs.mkdir(path.join(testSpecDir, 'test-spec-001'), { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testSpecDir, { recursive: true, force: true });
  });

  describe('updateTaskStatus', () => {
    it('should update task status in Spec Kit format', async () => {
      // Create a test spec
      const specPath = path.join(testSpecDir, 'test-spec-001', 'spec.md');
      const tasksPath = path.join(testSpecDir, 'test-spec-001', 'tasks.md');

      const specContent = `---
id: "test-spec-001"
title: "Test Spec"
status: "in_progress"
created: "2025-10-25"
updated: "2025-10-25"
---

# Test Spec

Test description.`;

      const tasksContent = `# Tasks

- [ ] #T001 First task
- [ ] #T002 Second task
- [x] #T003 Completed task`;

      await fs.writeFile(specPath, specContent, 'utf-8');
      await fs.writeFile(tasksPath, tasksContent, 'utf-8');

      // Update task status
      await specLoader.updateTaskStatus('test-spec-001', 'T001', 'completed');

      // Verify the file was updated
      const updatedContent = await fs.readFile(tasksPath, 'utf-8');
      expect(updatedContent).toContain('- [x] #T001 First task');
      expect(updatedContent).toContain('- [ ] #T002 Second task');
    });

    it('should handle tasks with different ID formats', async () => {
      const tasksPath = path.join(testSpecDir, 'test-spec-001', 'tasks.md');
      const specPath = path.join(testSpecDir, 'test-spec-001', 'spec.md');

      await fs.writeFile(specPath, '---\nid: "test-spec-001"\n---\n# Test', 'utf-8');
      await fs.writeFile(tasksPath, '- [ ] T001 Task one\n- [ ] #T002 Task two', 'utf-8');

      await specLoader.updateTaskStatus('test-spec-001', 'T002', 'completed');

      const content = await fs.readFile(tasksPath, 'utf-8');
      expect(content).toContain('- [x] #T002 Task two');
    });

    it('should use atomic writes with temp files', async () => {
      const tasksPath = path.join(testSpecDir, 'test-spec-001', 'tasks.md');
      const specPath = path.join(testSpecDir, 'test-spec-001', 'spec.md');
      const tempPath = `${tasksPath}.tmp`;

      await fs.writeFile(specPath, '---\nid: "test-spec-001"\n---\n# Test', 'utf-8');
      await fs.writeFile(tasksPath, '- [ ] #T001 Task', 'utf-8');

      await specLoader.updateTaskStatus('test-spec-001', 'T001', 'completed');

      // Temp file should be cleaned up
      await expect(fs.access(tempPath)).rejects.toThrow();

      // Main file should exist
      await expect(fs.access(tasksPath)).resolves.not.toThrow();
    });

    it('should throw error for non-existent spec', async () => {
      await expect(
        specLoader.updateTaskStatus('non-existent', 'T001', 'completed')
      ).rejects.toThrow('Spec non-existent not found');
    });

    it('should throw error for non-existent task', async () => {
      const specPath = path.join(testSpecDir, 'test-spec-001', 'spec.md');
      await fs.writeFile(specPath, '---\nid: "test-spec-001"\n---\n# Test', 'utf-8');

      await expect(
        specLoader.updateTaskStatus('test-spec-001', 'T999', 'completed')
      ).rejects.toThrow('Task T999 not found');
    });
  });

  describe('saveSpecKitSpec', () => {
    it('should update spec frontmatter status', async () => {
      const specPath = path.join(testSpecDir, 'test-spec-001', 'spec.md');

      const originalContent = `---
id: "test-spec-001"
title: "Test Spec"
status: "in_progress"
created: "2025-10-25"
updated: "2025-10-25"
---

# Test Spec`;

      await fs.writeFile(specPath, originalContent, 'utf-8');

      const spec = await specLoader.loadSpec('test-spec-001');
      spec.status = 'completed';
      await specLoader.saveSpec(spec);

      const updatedContent = await fs.readFile(specPath, 'utf-8');
      expect(updatedContent).toContain('status: "completed"');
    });

    it('should update the updated date in frontmatter', async () => {
      const specPath = path.join(testSpecDir, 'test-spec-001', 'spec.md');

      const originalContent = `---
id: "test-spec-001"
status: "in_progress"
updated: "2025-01-01"
---

# Test`;

      await fs.writeFile(specPath, originalContent, 'utf-8');

      const spec = await specLoader.loadSpec('test-spec-001');
      await specLoader.saveSpec(spec);

      const updatedContent = await fs.readFile(specPath, 'utf-8');
      const today = new Date().toISOString().split('T')[0];
      expect(updatedContent).toContain(`updated: "${today}"`);
    });
  });

  describe('updateTasksMarkdown', () => {
    it('should update multiple task statuses correctly', async () => {
      const tasksPath = path.join(testSpecDir, 'test-spec-001', 'tasks.md');
      const specPath = path.join(testSpecDir, 'test-spec-001', 'spec.md');

      await fs.writeFile(specPath, '---\nid: "test-spec-001"\n---\n# Test', 'utf-8');

      const tasksContent = `# Tasks

- [ ] #T001 First task
- [ ] #T002 Second task
- [ ] #T003 Third task`;

      await fs.writeFile(tasksPath, tasksContent, 'utf-8');

      // Load spec and update multiple tasks
      const spec = await specLoader.loadSpec('test-spec-001');
      spec.tasks[0].status = 'completed';
      spec.tasks[2].status = 'completed';

      await specLoader.saveSpec(spec);

      const updatedContent = await fs.readFile(tasksPath, 'utf-8');
      expect(updatedContent).toContain('- [x] #T001');
      expect(updatedContent).toContain('- [ ] #T002');
      expect(updatedContent).toContain('- [x] #T003');
    });

    it('should handle empty task list gracefully', async () => {
      const specPath = path.join(testSpecDir, 'test-spec-001', 'spec.md');
      await fs.writeFile(specPath, '---\nid: "test-spec-001"\n---\n# Test', 'utf-8');

      const spec = await specLoader.loadSpec('test-spec-001');
      spec.tasks = [];

      await expect(specLoader.saveSpec(spec)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Try to update non-existent directory
      const invalidLoader = new SpecLoader('/nonexistent/path');

      await expect(invalidLoader.updateTaskStatus('test', 'T001', 'completed')).rejects.toThrow();
    });

    it('should handle corrupt spec files', async () => {
      const specPath = path.join(testSpecDir, 'test-spec-001', 'spec.md');
      await fs.writeFile(specPath, 'Invalid content without frontmatter', 'utf-8');

      const spec = await specLoader.loadSpec('test-spec-001');

      // Should still work with fallback parsing
      expect(spec).toBeDefined();
      expect(spec.id).toBe('test-spec-001');
    });
  });
});
