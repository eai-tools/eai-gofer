import { describe, it, expect, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SCRIPT_PATH = path.resolve(__dirname, '../../../.specify/scripts/bash/mark-task-complete.sh');

const tempDirs: string[] = [];

function writeTasks(taskLine: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'gofer-mark-task-'));
  tempDirs.push(dir);
  writeFileSync(
    path.join(dir, 'tasks.md'),
    ['---', 'tasksCompleted: 0/1 (0%)', '---', '', taskLine, ''].join('\n')
  );
  return dir;
}

describe('mark-task-complete.sh', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each([
    ['plain', '- [ ] T001 Smoke task', '- [X] T001 Smoke task'],
    ['hash', '- [ ] #T001 Smoke task', '- [X] #T001 Smoke task'],
    ['bold', '- [ ] **T001**: Smoke task', '- [X] **T001**: Smoke task'],
  ])(
    'marks %s task format complete and updates the frontmatter count',
    async (_name, input, output) => {
      const dir = writeTasks(input);

      const result = await execFileAsync('bash', [SCRIPT_PATH, dir, 'T001']);
      const content = readFileSync(path.join(dir, 'tasks.md'), 'utf8');

      expect(result.stdout).toContain('Marked T001 as complete (1/1 tasks done)');
      expect(content).toContain('tasksCompleted: 1/1 (100%)');
      expect(content).toContain(output);
    }
  );
});
