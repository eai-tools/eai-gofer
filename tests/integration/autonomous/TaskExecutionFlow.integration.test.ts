import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { AutonomousOrchestrator } from '../../../src/orchestrator/AutonomousOrchestrator_new';
import { SpecLoader } from '../../../src/orchestrator/SpecLoader';

describe('Integration: Task Execution Flow', () => {
  let workspaceDir: string;
  let specifyDir: string;
  let specsDir: string;
  const specId = '001-task-flow';

  beforeEach(async () => {
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gofer-task-flow-'));
    specifyDir = path.join(workspaceDir, '.specify');
    specsDir = path.join(specifyDir, 'specs');
    await fs.mkdir(path.join(specsDir, specId), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  });

  async function writeSpec(tasksContent: string): Promise<void> {
    const specDir = path.join(specsDir, specId);
    const specContent = `---
id: ${specId}
title: Task Flow Spec
status: draft
created: 2026-04-04
updated: 2026-04-04
---

# Task Flow Spec

Verify task execution updates tasks.md as work completes.
`;

    await fs.writeFile(path.join(specDir, 'spec.md'), specContent, 'utf-8');
    await fs.writeFile(path.join(specDir, 'tasks.md'), tasksContent, 'utf-8');
  }

  it('loads real task IDs from tasks.md instead of synthetic sequential IDs', async () => {
    await writeSpec(`# Tasks

- [ ] T001 First task
- [ ] #T002 Second task
- [x] **T003**: Third task`);

    const loader = new SpecLoader(specsDir);
    const spec = await loader.loadSpec(specId);

    expect(spec.tasks.map((task) => task.id)).toEqual(['T001', 'T002', 'T003']);
    expect(spec.tasks.map((task) => task.status)).toEqual(['pending', 'pending', 'completed']);
  });

  it('marks pending tasks complete when the orchestrator runs from a .specify path', async () => {
    await writeSpec(`# Tasks

- [ ] T001 First task
- [ ] #T002 Second task`);

    const orchestrator = new AutonomousOrchestrator(specifyDir);
    await orchestrator.start();

    const updatedTasks = await fs.readFile(path.join(specsDir, specId, 'tasks.md'), 'utf-8');
    expect(updatedTasks).toContain('- [x] #T001 First task');
    expect(updatedTasks).toContain('- [x] #T002 Second task');

    const ipcStatus = JSON.parse(
      await fs.readFile(path.join(specifyDir, 'ipc', 'status.json'), 'utf-8')
    ) as { state?: string; last_output?: string };
    expect(ipcStatus.state).toBe('awaiting_input');
    expect(ipcStatus.last_output).toContain('Task T002');
  });

  it('preserves completed tasks and updates remaining pending tasks when given a specs path', async () => {
    await writeSpec(`# Tasks

- [x] #T001 Already done
- [ ] T002 Remaining work`);

    const orchestrator = new AutonomousOrchestrator(specsDir);
    await orchestrator.start();

    const updatedTasks = await fs.readFile(path.join(specsDir, specId, 'tasks.md'), 'utf-8');
    expect(updatedTasks).toContain('- [x] #T001 Already done');
    expect(updatedTasks).toContain('- [x] #T002 Remaining work');
  });
});
