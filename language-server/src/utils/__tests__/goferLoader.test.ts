/**
 * Unit tests for GoferLoader
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GoferLoader } from '../goferLoader';
import * as fs from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises');

describe('GoferLoader', (): void => {
  let goferLoader: GoferLoader;
  const mockWorkspacePath = '/test/workspace';

  beforeEach((): void => {
    vi.clearAllMocks();
    goferLoader = new GoferLoader(mockWorkspacePath);
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  describe('loadAllSpecs', (): void => {
    it('should load all specs from directory', async (): Promise<void> => {
      const mockDirents = [
        { name: '001-test-spec', isDirectory: (): boolean => true },
        { name: '002-another-spec', isDirectory: (): boolean => true },
        { name: 'file.txt', isDirectory: (): boolean => false }
      ];

      const mockSpecContent = `---
id: "001-test-spec"
title: "Test Specification"
status: "in_progress"
created: "2025-01-01"
updated: "2025-01-02"
---

# Test Specification

This is a test specification.

## Tasks

- [ ] #T001 First task (deps: none)
- [x] #T002 Second task (deps: T001)`;

      vi.mocked(fs.readdir).mockResolvedValue(mockDirents as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      vi.mocked(fs.readFile).mockResolvedValue(mockSpecContent);

      const specs = await goferLoader.loadAllSpecs();

      expect(specs).toHaveLength(2);
      expect(specs[0]).toMatchObject({
        id: '001-test-spec',
        title: 'Test Specification',
        status: 'in_progress'
      });
      expect(specs[0].tasks).toHaveLength(2);
      expect(specs[0].tasks[0]).toMatchObject({
        id: 'T001',
        description: 'First task',
        status: 'pending',
        dependencies: []
      });
      expect(specs[0].tasks[1]).toMatchObject({
        id: 'T002',
        description: 'Second task',
        status: 'completed',
        dependencies: ['T001']
      });
    });

    it('should handle empty specs directory', async (): Promise<void> => {
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const specs = await goferLoader.loadAllSpecs();

      expect(specs).toHaveLength(0);
    });

    it('should handle missing specs directory', async (): Promise<void> => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error('ENOENT: no such file or directory'));

      await expect(goferLoader.loadAllSpecs()).rejects.toThrow('ENOENT');
    });

    it('should skip invalid spec files', async (): Promise<void> => {
      const mockDirents = [
        { name: '001-valid-spec', isDirectory: (): boolean => true },
        { name: '002-invalid-spec', isDirectory: (): boolean => true }
      ];

      const mockValidContent = `---
id: "001-valid-spec"
title: "Valid Spec"
status: "draft"
---

# Valid Spec`;

      vi.mocked(fs.readdir).mockResolvedValue(mockDirents as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(mockValidContent)
        .mockRejectedValueOnce(new Error('File not found'));

      const specs = await goferLoader.loadAllSpecs();

      expect(specs).toHaveLength(1);
      expect(specs[0].id).toBe('001-valid-spec');
    });
  });

  describe('loadSpec', (): void => {
    it('should load individual spec by ID', async (): Promise<void> => {
      const mockSpecContent = `---
id: "001-test-spec"
title: "Test Specification"
status: "in_progress"
---

# Test Specification

## Tasks

- [ ] #T001 First task`;

      vi.mocked(fs.readFile).mockResolvedValue(mockSpecContent);

      const spec = await goferLoader.loadSpec('001-test-spec');

      expect(spec).toBeDefined();
      expect(spec!.id).toBe('001-test-spec');
      expect(spec!.title).toBe('Test Specification');
      expect(spec!.status).toBe('in_progress');
    });

    it('should return null for non-existent spec', async (): Promise<void> => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const spec = await goferLoader.loadSpec('non-existent-spec');

      expect(spec).toBeNull();
    });

    it('should handle malformed YAML frontmatter', async (): Promise<void> => {
      const mockSpecContent = `---
invalid: yaml: content: [
---

# Test Specification`;

      vi.mocked(fs.readFile).mockResolvedValue(mockSpecContent);

      const spec = await goferLoader.loadSpec('001-test-spec');

      // Should still parse with default values
      expect(spec).toBeDefined();
      expect(spec!.id).toBe('001-test-spec');
      expect(spec!.title).toBe('001-test-spec'); // Fallback to ID
    });
  });

  describe('updateTaskStatus', (): void => {
    it('should update task status in spec file', async (): Promise<void> => {
      const mockSpecContent = `---
id: "001-test-spec"
title: "Test Specification"
status: "in_progress"
---

# Test Specification

## Tasks

- [ ] #T001 First task (deps: none)
- [ ] #T002 Second task (deps: T001)`;

      const expectedUpdatedContent = `---
id: "001-test-spec"
title: "Test Specification"
status: "in_progress"
---

# Test Specification

## Tasks

- [x] #T001 First task (deps: none)
- [ ] #T002 Second task (deps: T001)`;

      vi.mocked(fs.readFile).mockResolvedValue(mockSpecContent);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await goferLoader.updateTaskStatus('001-test-spec', 'T001', 'completed');

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('001-test-spec/spec.md'),
        expectedUpdatedContent,
        'utf-8'
      );
    });

    it('should handle non-existent task', async (): Promise<void> => {
      const mockSpecContent = `---
id: "001-test-spec"
title: "Test Specification"
---

# Test Specification

## Tasks

- [ ] #T001 First task`;

      vi.mocked(fs.readFile).mockResolvedValue(mockSpecContent);

      await expect(
        goferLoader.updateTaskStatus('001-test-spec', 'T999', 'completed')
      ).rejects.toThrow('Task T999 not found');
    });

    it('should handle file write errors', async (): Promise<void> => {
      const mockSpecContent = `---
id: "001-test-spec"
title: "Test Specification"
---

# Test Specification

## Tasks

- [ ] #T001 First task`;

      vi.mocked(fs.readFile).mockResolvedValue(mockSpecContent);
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Permission denied'));

      await expect(
        goferLoader.updateTaskStatus('001-test-spec', 'T001', 'completed')
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('parseSpec', (): void => {
    it('should parse spec with YAML frontmatter', async (): Promise<void> => {
      const specContent = `---
id: "001-test-spec"
title: "Test Specification"
status: "in_progress"
created: "2025-01-01T00:00:00.000Z"
updated: "2025-01-02T00:00:00.000Z"
author: "Test Author"
---

# Test Specification

This is the description.

## Tasks

- [ ] #T001 First task (deps: none)
- [x] #T002 Second task (deps: T001, T003)
- [ ] #T003 Third task [P] (deps: none)`;

      // Use the private parseSpec method through type assertion
      const spec = (goferLoader as unknown as { parseSpec: (id: string, content: string) => unknown }).parseSpec('001-test-spec', specContent);

      expect(spec).toMatchObject({
        id: '001-test-spec',
        title: 'Test Specification',
        status: 'in_progress',
        author: 'Test Author'
      });

      expect(spec.tasks).toHaveLength(3);
      expect(spec.tasks[0]).toMatchObject({
        id: 'T001',
        description: 'First task',
        status: 'pending',
        dependencies: [],
        parallel: false
      });
      expect(spec.tasks[1]).toMatchObject({
        id: 'T002',
        description: 'Second task',
        status: 'completed',
        dependencies: ['T001', 'T003'],
        parallel: false
      });
      expect(spec.tasks[2]).toMatchObject({
        id: 'T003',
        description: 'Third task',
        status: 'pending',
        dependencies: [],
        parallel: true
      });
    });

    it('should parse spec without YAML frontmatter', async (): Promise<void> => {
      const specContent = `# Test Specification

This is a simple spec without frontmatter.

## Tasks

- [ ] #T001 Simple task`;

      const spec = (goferLoader as unknown as { parseSpec: (id: string, content: string) => unknown }).parseSpec('001-test-spec', specContent);

      expect(spec).toMatchObject({
        id: '001-test-spec',
        title: '001-test-spec',
        status: 'draft'
      });
      expect(spec.tasks).toHaveLength(1);
    });

    it('should handle various task formats', async (): Promise<void> => {
      const specContent = `# Test Specification

## Tasks

- [ ] T001: Task with colon
- [x] #T002 Task with hash
- [ ] 003 Task with number only
- [ ] #T004 Task with dependencies (deps: T001, T002)
- [ ] #T005 Parallel task [P]
- [ ] #T006 Parallel with deps [P] (deps: T004)`;

      const spec = (goferLoader as unknown as { parseSpec: (id: string, content: string) => unknown }).parseSpec('001-test-spec', specContent);

      expect(spec.tasks).toHaveLength(6);
      expect(spec.tasks.map((t): string => t.id)).toEqual(['T001', 'T002', 'T003', 'T004', 'T005', 'T006']);
      expect(spec.tasks[3].dependencies).toEqual(['T001', 'T002']);
      expect(spec.tasks[4].parallel).toBe(true);
      expect(spec.tasks[5].parallel).toBe(true);
      expect(spec.tasks[5].dependencies).toEqual(['T004']);
    });
  });

  describe('path security', (): void => {
    it('should construct safe file paths', async (): Promise<void> => {
      const specId = '001-test-spec';
      
      // Mock readFile to capture the path being used
      let capturedPath = '';
      vi.mocked(fs.readFile).mockImplementation((path: Parameters<typeof fs.readFile>[0]): Promise<string> => {
        capturedPath = path.toString();
        return Promise.resolve('---\nid: "test"\n---\n# Test');
      });

      await goferLoader.loadSpec(specId);

      expect(capturedPath).toContain('.specify/specs/001-test-spec/spec.md');
      expect(capturedPath).toContain(mockWorkspacePath);
    });
  });
});