import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpecKitParser, Task, TaskStatus } from '../../../extension/src/specKitParser';
import { createTestWorkspace, cleanupTestWorkspace, createTestSpec } from '../../helpers/workspace';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('SpecKitParser - Task Checkbox Parsing', () => {
  let workspace: string;
  let parser: SpecKitParser;

  beforeEach(async () => {
    workspace = await createTestWorkspace();
    parser = new SpecKitParser(workspace);
  });

  afterEach(async () => {
    await cleanupTestWorkspace(workspace);
  });

  describe('Task Format Variations', () => {
    it('should parse tasks with **T001** bold format', async () => {
      const specContent = `---
title: Task Format Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] **T001**: Create login form component
- [x] **T002**: Add form validation
- [ ] **T003**: Style the form`;

      await createTestSpec(workspace, '001-bold-format', specContent);
      const specDir = path.join(workspace, '.specify/specs/001-bold-format');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(3);
      expect(tasks[0].id).toBe('T001');
      expect(tasks[0].description).toBe('Create login form component');
      expect(tasks[0].status).toBe('pending');
      expect(tasks[1].id).toBe('T002');
      expect(tasks[1].status).toBe('completed');
      expect(tasks[2].id).toBe('T003');
    });

    it('should parse tasks with #T001 hash format', async () => {
      const specContent = `---
title: Hash Format Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] #T001 Create login form
- [x] #T002 Add validation
- [ ] #T003 Style form`;

      await createTestSpec(workspace, '002-hash-format', specContent);
      const specDir = path.join(workspace, '.specify/specs/002-hash-format');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(3);
      expect(tasks[0].id).toBe('T001');
      expect(tasks[0].description).toBe('Create login form');
      expect(tasks[1].id).toBe('T002');
      expect(tasks[1].status).toBe('completed');
    });

    it('should parse tasks with T001 simple format', async () => {
      const specContent = `---
title: Simple Format Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] T001 Create login form
- [x] T002 Add validation
- [ ] T003 Style form`;

      await createTestSpec(workspace, '003-simple-format', specContent);
      const specDir = path.join(workspace, '.specify/specs/003-simple-format');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(3);
      expect(tasks[0].id).toBe('T001');
      expect(tasks[0].description).toBe('Create login form');
      expect(tasks[1].status).toBe('completed');
    });

    it('should parse tasks with #1 numeric format', async () => {
      const specContent = `---
title: Numeric Format Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] #1 Create login form
- [x] #2 Add validation
- [ ] #15 Style form`;

      await createTestSpec(workspace, '004-numeric-format', specContent);
      const specDir = path.join(workspace, '.specify/specs/004-numeric-format');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(3);
      expect(tasks[0].id).toBe('T001');
      expect(tasks[0].description).toBe('Create login form');
      expect(tasks[1].id).toBe('T002');
      expect(tasks[1].status).toBe('completed');
      expect(tasks[2].id).toBe('T015');
    });
  });

  describe('Checkbox Status Detection', () => {
    it('should detect pending tasks with [ ]', async () => {
      const specContent = `---
title: Pending Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] T001 Pending task one
- [ ] T002 Pending task two`;

      await createTestSpec(workspace, '005-pending', specContent);
      const specDir = path.join(workspace, '.specify/specs/005-pending');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(2);
      expect(tasks[0].status).toBe('pending');
      expect(tasks[1].status).toBe('pending');
    });

    it('should detect completed tasks with [x]', async () => {
      const specContent = `---
title: Completed Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [x] T001 Completed task one
- [x] T002 Completed task two`;

      await createTestSpec(workspace, '006-completed-lowercase', specContent);
      const specDir = path.join(workspace, '.specify/specs/006-completed-lowercase');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(2);
      expect(tasks[0].status).toBe('completed');
      expect(tasks[1].status).toBe('completed');
    });

    it('should detect completed tasks with [X] uppercase', async () => {
      const specContent = `---
title: Uppercase X Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [X] T001 Completed task one
- [X] T002 Completed task two`;

      await createTestSpec(workspace, '007-completed-uppercase', specContent);
      const specDir = path.join(workspace, '.specify/specs/007-completed-uppercase');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(2);
      expect(tasks[0].status).toBe('completed');
      expect(tasks[1].status).toBe('completed');
    });

    it('should handle mixed status tasks', async () => {
      const specContent = `---
title: Mixed Status Test
status: in_progress
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [x] T001 Completed task
- [ ] T002 Pending task
- [X] T003 Completed with uppercase
- [ ] T004 Another pending task`;

      await createTestSpec(workspace, '008-mixed-status', specContent);
      const specDir = path.join(workspace, '.specify/specs/008-mixed-status');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(4);
      expect(tasks[0].status).toBe('completed');
      expect(tasks[1].status).toBe('pending');
      expect(tasks[2].status).toBe('completed');
      expect(tasks[3].status).toBe('pending');
    });
  });

  describe('Parallel Task Detection', () => {
    it('should detect [P] inline marker for parallel tasks', async () => {
      const specContent = `---
title: Parallel Inline Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] T001 [P] This task can run in parallel
- [ ] T002 This task is sequential
- [ ] T003 [P] [US1] Parallel task with user story tag`;

      await createTestSpec(workspace, '009-parallel-inline', specContent);
      const specDir = path.join(workspace, '.specify/specs/009-parallel-inline');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(3);
      expect(tasks[0].parallel).toBe(true);
      expect(tasks[0].description).not.toContain('[P]'); // Should be stripped
      expect(tasks[1].parallel).toBe(false);
      expect(tasks[2].parallel).toBe(true);
      expect(tasks[2].description).not.toContain('[P]');
      expect(tasks[2].description).not.toContain('[US1]'); // User story tags also stripped
    });

    it('should detect [P] in task metadata', async () => {
      const specContent = `---
title: Parallel Metadata Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] **T001**: Create login component
  - Dependencies: None
  - [P] Can run in parallel

- [ ] **T002**: Add validation
  - Dependencies: T001
  - Estimated: 2 hours`;

      await createTestSpec(workspace, '010-parallel-metadata', specContent);
      const specDir = path.join(workspace, '.specify/specs/010-parallel-metadata');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(2);
      expect(tasks[0].parallel).toBe(true);
      expect(tasks[1].parallel).toBe(false);
    });
  });

  describe('Task Dependencies Parsing', () => {
    it('should parse dependencies from task metadata', async () => {
      const specContent = `---
title: Dependencies Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] **T001**: Foundation task
  - Dependencies: None

- [ ] **T002**: Dependent task
  - Dependencies: T001

- [ ] **T003**: Multiple dependencies
  - Dependencies: T001, T002

- [ ] **T004**: Complex dependencies
  - Dependencies: T001, T002, T003`;

      await createTestSpec(workspace, '011-dependencies', specContent);
      const specDir = path.join(workspace, '.specify/specs/011-dependencies');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(4);
      expect(tasks[0].dependencies).toEqual([]);
      expect(tasks[1].dependencies).toEqual(['T001']);
      expect(tasks[2].dependencies).toEqual(['T001', 'T002']);
      expect(tasks[3].dependencies).toEqual(['T001', 'T002', 'T003']);
    });

    it('should handle "none" and "None" dependencies', async () => {
      const specContent = `---
title: None Dependencies Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] **T001**: Task with None
  - Dependencies: None

- [ ] **T002**: Task with none
  - Dependencies: none

- [ ] **T003**: Task without dependency field`;

      await createTestSpec(workspace, '012-none-deps', specContent);
      const specDir = path.join(workspace, '.specify/specs/012-none-deps');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(3);
      expect(tasks[0].dependencies).toEqual([]);
      expect(tasks[1].dependencies).toEqual([]);
      expect(tasks[2].dependencies).toEqual([]);
    });

    it('should trim whitespace from dependencies', async () => {
      const specContent = `---
title: Whitespace Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] **T001**: Task one
- [ ] **T002**: Task with spaces
  - Dependencies:  T001  ,  T003  ,  T005  `;

      await createTestSpec(workspace, '013-whitespace-deps', specContent);
      const specDir = path.join(workspace, '.specify/specs/013-whitespace-deps');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(2);
      expect(tasks[1].dependencies).toEqual(['T001', 'T003', 'T005']);
    });
  });

  describe('Estimated Time Parsing', () => {
    it('should parse estimated time from task metadata', async () => {
      const specContent = `---
title: Estimated Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] **T001**: Quick task
  - Estimated: 30 minutes

- [ ] **T002**: Medium task
  - Estimated: 2 hours

- [ ] **T003**: Long task
  - Estimated: 1 day

- [ ] **T004**: Task without estimate`;

      await createTestSpec(workspace, '014-estimated', specContent);
      const specDir = path.join(workspace, '.specify/specs/014-estimated');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(4);
      expect(tasks[0].estimated).toBe('30 minutes');
      expect(tasks[1].estimated).toBe('2 hours');
      expect(tasks[2].estimated).toBe('1 day');
      expect(tasks[3].estimated).toBeUndefined();
    });
  });

  describe('User Story Tags', () => {
    it('should strip [US1] [US2] tags from descriptions', async () => {
      const specContent = `---
title: User Story Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] T001 [US1] Implement user login
- [ ] T002 [US2] Add password reset
- [ ] T003 [US1] [P] Create login form with parallel execution
- [ ] T004 [US3] [US4] Task with multiple user stories`;

      await createTestSpec(workspace, '015-user-stories', specContent);
      const specDir = path.join(workspace, '.specify/specs/015-user-stories');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(4);
      expect(tasks[0].description).toBe('Implement user login');
      expect(tasks[0].description).not.toContain('[US1]');
      expect(tasks[1].description).toBe('Add password reset');
      expect(tasks[2].description).toBe('Create login form with parallel execution');
      expect(tasks[2].description).not.toContain('[P]');
      expect(tasks[2].description).not.toContain('[US1]');
      expect(tasks[3].description).not.toContain('[US3]');
      expect(tasks[3].description).not.toContain('[US4]');
    });
  });

  describe('Empty and Missing Tasks', () => {
    it('should return empty array when tasks.md does not exist', async () => {
      const specContent = `---
title: No Tasks Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      await createTestSpec(workspace, '016-no-tasks', specContent);
      const specs = await parser.loadAllSpecs();

      expect(specs[0].tasks).toEqual([]);
    });

    it('should return empty array when tasks.md is empty', async () => {
      const specContent = `---
title: Empty Tasks Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      await createTestSpec(workspace, '017-empty-tasks', specContent);
      const specDir = path.join(workspace, '.specify/specs/017-empty-tasks');
      await fs.writeFile(path.join(specDir, 'tasks.md'), '', 'utf-8');

      const specs = await parser.loadAllSpecs();

      expect(specs[0].tasks).toEqual([]);
    });

    it('should return empty array when tasks.md has no task lines', async () => {
      const specContent = `---
title: No Task Lines Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

This file has content but no actual task checkboxes.

## Notes
Just some documentation here.`;

      await createTestSpec(workspace, '018-no-task-lines', specContent);
      const specDir = path.join(workspace, '.specify/specs/018-no-task-lines');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();

      expect(specs[0].tasks).toEqual([]);
    });
  });

  describe('Complex Real-World Tasks', () => {
    it('should parse complete task with all metadata', async () => {
      const specContent = `---
title: Full Metadata Test
status: in_progress
created: 2025-01-15
updated: 2025-01-16
---

# Test`;

      const tasksContent = `# Tasks

## Phase 1: Setup

- [x] **T001**: Create project structure
  - Dependencies: None
  - Estimated: 1 hour

- [ ] **T002**: Install dependencies
  - Dependencies: T001
  - Estimated: 30 minutes
  - [P] Can run in parallel

- [ ] **T003**: Configure build system
  - Dependencies: T001, T002
  - Estimated: 2 hours`;

      await createTestSpec(workspace, '019-full-metadata', specContent);
      const specDir = path.join(workspace, '.specify/specs/019-full-metadata');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(3);

      // Task 1
      expect(tasks[0].id).toBe('T001');
      expect(tasks[0].description).toBe('Create project structure');
      expect(tasks[0].status).toBe('completed');
      expect(tasks[0].dependencies).toEqual([]);
      expect(tasks[0].estimated).toBe('1 hour');
      expect(tasks[0].parallel).toBe(false);

      // Task 2
      expect(tasks[1].id).toBe('T002');
      expect(tasks[1].description).toBe('Install dependencies');
      expect(tasks[1].status).toBe('pending');
      expect(tasks[1].dependencies).toEqual(['T001']);
      expect(tasks[1].estimated).toBe('30 minutes');
      expect(tasks[1].parallel).toBe(true);

      // Task 3
      expect(tasks[2].id).toBe('T003');
      expect(tasks[2].description).toBe('Configure build system');
      expect(tasks[2].dependencies).toEqual(['T001', 'T002']);
      expect(tasks[2].estimated).toBe('2 hours');
    });

    it('should parse mixed format tasks in single file', async () => {
      const specContent = `---
title: Mixed Format Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] **T001**: Bold format task
- [ ] #T002 Hash format task
- [ ] T003 Simple format task
- [ ] #4 Numeric format task`;

      await createTestSpec(workspace, '020-mixed-formats', specContent);
      const specDir = path.join(workspace, '.specify/specs/020-mixed-formats');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(4);
      expect(tasks[0].id).toBe('T001');
      expect(tasks[1].id).toBe('T002');
      expect(tasks[2].id).toBe('T003');
      expect(tasks[3].id).toBe('T004');
    });

    it('should preserve task order from file', async () => {
      const specContent = `---
title: Order Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] T005 Fifth task (listed first)
- [ ] T001 First task (listed second)
- [ ] T003 Third task (listed third)
- [ ] T002 Second task (listed fourth)`;

      await createTestSpec(workspace, '021-order', specContent);
      const specDir = path.join(workspace, '.specify/specs/021-order');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(4);
      expect(tasks[0].id).toBe('T005');
      expect(tasks[1].id).toBe('T001');
      expect(tasks[2].id).toBe('T003');
      expect(tasks[3].id).toBe('T002');
    });
  });

  describe('Edge Cases', () => {
    it('should handle tasks with special characters in description', async () => {
      const specContent = `---
title: Special Chars Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] T001 Task with "quotes" and 'apostrophes'
- [ ] T002 Task with (parentheses) and [brackets]
- [ ] T003 Task with @symbols and #hashtags
- [ ] T004 Task with UTF-8: 日本語 and émojis 🚀`;

      await createTestSpec(workspace, '022-special-chars', specContent);
      const specDir = path.join(workspace, '.specify/specs/022-special-chars');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(4);
      expect(tasks[0].description).toContain('"quotes"');
      expect(tasks[1].description).toContain('(parentheses)');
      expect(tasks[2].description).toContain('@symbols');
      expect(tasks[3].description).toContain('日本語');
      expect(tasks[3].description).toContain('🚀');
    });

    it('should handle tasks with very long descriptions', async () => {
      const specContent = `---
title: Long Description Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const longDescription = 'A'.repeat(500);
      const tasksContent = `# Tasks

- [ ] T001 ${longDescription}`;

      await createTestSpec(workspace, '023-long-desc', specContent);
      const specDir = path.join(workspace, '.specify/specs/023-long-desc');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(1);
      expect(tasks[0].description).toHaveLength(500);
    });

    it('should handle tasks with newlines in metadata', async () => {
      const specContent = `---
title: Multiline Metadata Test
status: draft
created: 2025-01-15
updated: 2025-01-15
---

# Test`;

      const tasksContent = `# Tasks

- [ ] **T001**: Task one
  - Dependencies: None
  - Estimated: 1 hour

- [ ] **T002**: Task two
  - Dependencies: T001

  - Estimated: 2 hours

- [ ] **T003**: Task three`;

      await createTestSpec(workspace, '024-multiline-metadata', specContent);
      const specDir = path.join(workspace, '.specify/specs/024-multiline-metadata');
      await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');

      const specs = await parser.loadAllSpecs();
      const tasks = specs[0].tasks;

      expect(tasks).toHaveLength(3);
      expect(tasks[0].estimated).toBe('1 hour');
      expect(tasks[1].dependencies).toEqual(['T001']);
      expect(tasks[1].estimated).toBe('2 hours');
    });
  });
});
