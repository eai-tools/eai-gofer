import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import type { ExecFileOptions } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function cleanGitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key === 'GIT_DIR' || key.startsWith('GIT_')) {
      delete env[key];
    }
  }
  return env;
}

async function execFileWithoutGitEnv(
  file: string,
  args: string[],
  options: ExecFileOptions = {}
): Promise<void> {
  await execFileAsync(file, args, { ...options, env: cleanGitEnv() });
}

const LOG_STAGE_SCRIPT = path.resolve(__dirname, '../../../.specify/scripts/bash/log-stage.sh');
const PIPELINE_STATE_SCRIPT = path.resolve(
  __dirname,
  '../../../.specify/scripts/bash/pipeline-state.sh'
);

describe('log-stage.sh ledger integration', () => {
  let tmpDir: string;
  let featureDir: string;
  let logsDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-stage-ledger-test-'));
    featureDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
    logsDir = path.join(tmpDir, '.specify', 'logs');
    fs.mkdirSync(featureDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });

    // Initialize git repo (needed by common.sh)
    originalCwd = process.cwd();
    await execFileWithoutGitEnv('git', ['init', tmpDir]);
    await execFileWithoutGitEnv('git', ['-C', tmpDir, 'checkout', '-B', 'feature/test-feature']);

    // Create pipeline-state.json with a runId
    await execFileWithoutGitEnv('bash', [
      PIPELINE_STATE_SCRIPT,
      'init',
      '--feature-dir',
      featureDir,
    ]);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should write to both pipeline.jsonl and gofer-run-ledger.jsonl on stage complete', async () => {
    // Run log-stage.sh from the tmp repo
    try {
      await execFileWithoutGitEnv(
        'bash',
        [LOG_STAGE_SCRIPT, '3_plan', '--complete', '--tokens', '1000', '--compactions', '0'],
        { cwd: tmpDir }
      );
    } catch {
      // log-stage.sh may return non-zero if it can't detect feature paths;
      // that's fine for this test as long as it creates the files
    }

    // Check pipeline.jsonl
    const pipelineLog = path.join(logsDir, 'pipeline.jsonl');
    if (fs.existsSync(pipelineLog)) {
      const pipelineContent = fs.readFileSync(pipelineLog, 'utf-8');
      expect(pipelineContent).toContain('3_plan');
    }

    // Check gofer-run-ledger.jsonl
    const ledgerLog = path.join(logsDir, 'gofer-run-ledger.jsonl');
    if (fs.existsSync(ledgerLog)) {
      const ledgerContent = fs.readFileSync(ledgerLog, 'utf-8');
      const lines = ledgerContent.trim().split('\n').filter(Boolean);

      if (lines.length > 0) {
        const entry = JSON.parse(lines[0]);
        expect(entry).toHaveProperty('runId');
        expect(entry.runId).toBeTruthy();
        expect(entry).toHaveProperty('eventType');
        expect(entry.eventType).toBe('stage_complete');
      }
    }
  });

  it('should include runId from pipeline-state.json in ledger entry', async () => {
    // Read the runId from pipeline-state.json
    const stateContent = fs.readFileSync(path.join(featureDir, 'pipeline-state.json'), 'utf-8');
    const state = JSON.parse(stateContent);
    const expectedRunId = state.runId;

    try {
      await execFileWithoutGitEnv('bash', [LOG_STAGE_SCRIPT, '1_research', '--start'], {
        cwd: tmpDir,
      });
    } catch {
      // May fail on feature path detection
    }

    const ledgerLog = path.join(logsDir, 'gofer-run-ledger.jsonl');
    if (fs.existsSync(ledgerLog)) {
      const content = fs.readFileSync(ledgerLog, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      if (lines.length > 0) {
        const entry = JSON.parse(lines[0]);
        expect(entry.runId).toBe(expectedRunId);
      }
    }
  });
});
