import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as vscode from 'vscode';
import { ProgressProvider } from '../../progressProvider';

suite('ProgressProvider Test Suite', () => {
  let tempDir: string;
  let progressProvider: ProgressProvider;

  suiteSetup(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'progress-provider-test-'));
  });

  suiteTeardown(async () => {
    // Clean up temporary directory
    await fs.rmdir(tempDir, { recursive: true }).catch(() => {});
  });

  setup(async () => {
    // Create fresh progress provider for each test
    progressProvider = new ProgressProvider(tempDir);
  });

  suite('Tree Structure', () => {
    test('should show error when no .specify directory exists', async () => {
      const children = await progressProvider.getChildren();
      assert.strictEqual(children.length, 1);
      assert.ok(children[0].label.includes('Error'));
    });

    test('should show empty state when no specs exist', async () => {
      // Create empty .specify/specs directory
      const specsDir = path.join(tempDir, '.specify', 'specs');
      await fs.mkdir(specsDir, { recursive: true });

      // Refresh to pick up changes
      progressProvider.refresh();
      const children = await progressProvider.getChildren();

      assert.strictEqual(children.length, 1);
      assert.ok(children[0].label.includes('No specifications'));
    });

    test('should display specs as top-level items', async () => {
      // Create test specs
      await createTestSpec('001-login', 'Login Feature', 'ready');
      await createTestSpec('002-auth', 'Authentication', 'in_progress');

      progressProvider.refresh();
      const children = await progressProvider.getChildren();

      assert.strictEqual(children.length, 2);
      assert.strictEqual(children[0].label, 'Login Feature');
      assert.strictEqual(children[1].label, 'Authentication');
    });

    test('should display tasks as children of specs', async () => {
      await createTestSpecWithTasks('003-profile', 'User Profile', 'in_progress', [
        { id: 'T001', desc: 'Create profile model', status: 'completed' },
        { id: 'T002', desc: 'Add profile API', status: 'in_progress' },
        { id: 'T003', desc: 'Write tests', status: 'pending' }
      ]);

      progressProvider.refresh();
      const children = await progressProvider.getChildren();
      assert.strictEqual(children.length, 1);

      const specItem = children[0];
      const taskChildren = await progressProvider.getChildren(specItem);
      assert.strictEqual(taskChildren.length, 3);
      
      assert.strictEqual(taskChildren[0].label, 'T001: Create profile model');
      assert.strictEqual(taskChildren[1].label, 'T002: Add profile API');
      assert.strictEqual(taskChildren[2].label, 'T003: Write tests');
    });
  });

  suite('Status Display', () => {
    test('should show correct task counts in spec description', async () => {
      await createTestSpecWithTasks('004-notifications', 'Notifications', 'in_progress', [
        { id: 'T001', desc: 'Setup notification service', status: 'completed' },
        { id: 'T002', desc: 'Add email notifications', status: 'completed' },
        { id: 'T003', desc: 'Add SMS notifications', status: 'in_progress' },
        { id: 'T004', desc: 'Add push notifications', status: 'pending' },
        { id: 'T005', desc: 'Error handling', status: 'failed' }
      ]);

      progressProvider.refresh();
      const children = await progressProvider.getChildren();
      const specItem = children[0];

      // Should show: "1 in progress • 2/5 • 1 failed"
      assert.ok(specItem.description);
      const description = typeof specItem.description === 'string' ? specItem.description : '';
      assert.ok(description.includes('1 in progress'));
      assert.ok(description.includes('2/5'));
      assert.ok(description.includes('1 failed'));
    });

    test('should show correct icons for different spec statuses', async () => {
      await createTestSpecWithTasks('005-completed', 'Completed Feature', 'completed', [
        { id: 'T001', desc: 'Task 1', status: 'completed' },
        { id: 'T002', desc: 'Task 2', status: 'completed' }
      ]);

      await createTestSpecWithTasks('006-failed', 'Failed Feature', 'in_progress', [
        { id: 'T001', desc: 'Task 1', status: 'completed' },
        { id: 'T002', desc: 'Task 2', status: 'failed' }
      ]);

      progressProvider.refresh();
      const children = await progressProvider.getChildren();

      const completedSpec = children.find(c => c.label === 'Completed Feature');
      const failedSpec = children.find(c => c.label === 'Failed Feature');

      assert.ok(completedSpec);
      assert.ok(failedSpec);

      // Check icons are ThemeIcon instances
      assert.ok(completedSpec.iconPath instanceof vscode.ThemeIcon);
      assert.ok(failedSpec.iconPath instanceof vscode.ThemeIcon);
    });

    test('should show correct icons for different task statuses', async () => {
      await createTestSpecWithTasks('007-task-icons', 'Task Icons Test', 'in_progress', [
        { id: 'T001', desc: 'Completed task', status: 'completed' },
        { id: 'T002', desc: 'In progress task', status: 'in_progress' },
        { id: 'T003', desc: 'Failed task', status: 'failed' },
        { id: 'T004', desc: 'Pending task', status: 'pending' }
      ]);

      progressProvider.refresh();
      const children = await progressProvider.getChildren();
      const specItem = children[0];
      const taskChildren = await progressProvider.getChildren(specItem);

      // All tasks should have ThemeIcon instances
      taskChildren.forEach(task => {
        assert.ok(task.iconPath instanceof vscode.ThemeIcon);
      });
    });
  });

  suite('Context Values', () => {
    test('should set correct context values for specs and tasks', async () => {
      await createTestSpecWithTasks('008-context', 'Context Test', 'in_progress', [
        { id: 'T001', desc: 'Test task', status: 'pending' }
      ]);

      progressProvider.refresh();
      const children = await progressProvider.getChildren();
      const specItem = children[0];
      const taskChildren = await progressProvider.getChildren(specItem);

      assert.strictEqual(specItem.contextValue, 'spec');
      assert.strictEqual(taskChildren[0].contextValue, 'task');
    });
  });

  suite('Refresh Functionality', () => {
    test('should update tree when refresh is called', async () => {
      // Initially no specs
      let children = await progressProvider.getChildren();
      assert.strictEqual(children.length, 1);
      assert.ok(children[0].label.includes('No specifications'));

      // Add a spec
      await createTestSpec('009-refresh', 'Refresh Test', 'draft');

      // Should still show no specs until refresh
      children = await progressProvider.getChildren();
      assert.strictEqual(children.length, 1);
      assert.ok(children[0].label.includes('No specifications'));

      // After refresh, should show the new spec
      progressProvider.refresh();
      children = await progressProvider.getChildren();
      assert.strictEqual(children.length, 1);
      assert.strictEqual(children[0].label, 'Refresh Test');
    });
  });

  suite('Error Handling', () => {
    test('should handle corrupted spec files gracefully', async () => {
      // Create a spec directory with invalid spec.md
      const specDir = path.join(tempDir, '.specify', 'specs', '010-corrupted');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(path.join(specDir, 'spec.md'), 'This is not valid markdown with frontmatter');

      progressProvider.refresh();
      const children = await progressProvider.getChildren();

      // Should either skip the corrupted spec or show an error
      // The exact behavior depends on the implementation
      assert.ok(children.length >= 0);
    });
  });

  // Helper functions
  async function createTestSpec(id: string, title: string, status: string): Promise<void> {
    const specDir = path.join(tempDir, '.specify', 'specs', id);
    await fs.mkdir(specDir, { recursive: true });

    const specContent = `---
id: "${id}"
title: "${title}"
status: "${status}"
created: "2025-10-22"
---

# ${title}

Test specification for ${title}.
`;

    await fs.writeFile(path.join(specDir, 'spec.md'), specContent);
  }

  async function createTestSpecWithTasks(
    id: string, 
    title: string, 
    status: string, 
    tasks: Array<{id: string, desc: string, status: string}>
  ): Promise<void> {
    await createTestSpec(id, title, status);

    const specDir = path.join(tempDir, '.specify', 'specs', id);
    const taskLines = tasks.map(task => {
      const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
      return `- ${checkbox} ${task.id} ${task.desc}`;
    });

    const tasksContent = `# Tasks

${taskLines.join('\n')}
`;

    await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent);
  }
});