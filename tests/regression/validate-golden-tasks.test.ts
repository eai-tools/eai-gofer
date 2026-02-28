import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const GOLDEN_TASKS_DIR = path.resolve(__dirname, 'golden-tasks');
const VALIDATE_SCRIPT = path.resolve(__dirname, '../../.specify/scripts/bash/validate-artifact.sh');

/** Get all golden task directories */
function getGoldenTaskDirs(): string[] {
  const entries = fs.readdirSync(GOLDEN_TASKS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** Artifact types to validate — type is the first arg to validate-artifact.sh */
const ARTIFACT_TYPES: Array<{ file: string; type: string }> = [
  { file: 'spec.md', type: 'spec' },
  { file: 'plan.md', type: 'plan' },
  { file: 'tasks.md', type: 'tasks' },
];

describe('Golden Task Regression', () => {
  const goldenTasks = getGoldenTaskDirs();

  it('should have at least 3 golden task directories', () => {
    expect(goldenTasks.length).toBeGreaterThanOrEqual(3);
  });

  for (const taskDir of goldenTasks) {
    describe(`Golden task: ${taskDir}`, () => {
      const taskPath = path.join(GOLDEN_TASKS_DIR, taskDir);

      for (const artifact of ARTIFACT_TYPES) {
        const artifactPath = path.join(taskPath, artifact.file);

        if (fs.existsSync(artifactPath)) {
          it(`${artifact.file} should pass validation`, async () => {
            try {
              const { stdout } = await execFileAsync('bash', [
                VALIDATE_SCRIPT,
                artifact.type,
                artifactPath,
                '--json',
              ]);

              // If JSON output, verify status is pass
              try {
                const result = JSON.parse(stdout.trim());
                expect(result.status).toBe('pass');
              } catch {
                // Non-JSON output is fine if exit code was 0
              }
            } catch (error: unknown) {
              const err = error as { code?: number; stdout?: string; stderr?: string };
              // Provide detailed failure info
              const details = [
                `Golden task: ${taskDir}`,
                `Artifact: ${artifact.file}`,
                `Exit code: ${err.code}`,
                `stdout: ${err.stdout || ''}`,
                `stderr: ${err.stderr || ''}`,
              ].join('\n');
              expect.fail(`Validation failed:\n${details}`);
            }
          });
        }
      }
    });
  }
});
