import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const SCRIPT_PATH = path.resolve(__dirname, '../../../.specify/scripts/bash/pipeline-state.sh');

describe('pipeline-state.sh', () => {
  let tmpDir: string;
  let featureDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-script-test-'));
    featureDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('init', () => {
    it('should create valid JSON with UUID runId', async () => {
      const { stdout } = await execFileAsync('bash', [
        SCRIPT_PATH,
        'init',
        '--feature-dir',
        featureDir,
      ]);

      const state = JSON.parse(stdout);
      expect(state.runId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(state.currentStage).toBe('1_research');
      expect(state.status).toBe('initialized');
      expect(state.completedStages).toEqual([]);
    });

    it('should write pipeline-state.json to feature directory', async () => {
      await execFileAsync('bash', [SCRIPT_PATH, 'init', '--feature-dir', featureDir]);

      const statePath = path.join(featureDir, 'pipeline-state.json');
      expect(fs.existsSync(statePath)).toBe(true);
    });
  });

  describe('read', () => {
    it('should return full JSON state', async () => {
      await execFileAsync('bash', [SCRIPT_PATH, 'init', '--feature-dir', featureDir]);
      const { stdout } = await execFileAsync('bash', [
        SCRIPT_PATH,
        'read',
        '--feature-dir',
        featureDir,
      ]);

      const state = JSON.parse(stdout);
      expect(state.runId).toBeTruthy();
      expect(state.currentStage).toBe('1_research');
    });

    it('should fail if pipeline-state.json does not exist', async () => {
      const emptyDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      await expect(
        execFileAsync('bash', [SCRIPT_PATH, 'read', '--feature-dir', emptyDir])
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should transition stage correctly', async () => {
      await execFileAsync('bash', [SCRIPT_PATH, 'init', '--feature-dir', featureDir]);
      const { stdout } = await execFileAsync('bash', [
        SCRIPT_PATH,
        'update',
        '--feature-dir',
        featureDir,
        '--stage',
        '2_specify',
      ]);

      const state = JSON.parse(stdout);
      expect(state.currentStage).toBe('2_specify');
      expect(state.completedStages).toContain('1_research');
      expect(state.status).toBe('in_progress');
    });

    it('should reject invalid stage name', async () => {
      await execFileAsync('bash', [SCRIPT_PATH, 'init', '--feature-dir', featureDir]);

      await expect(
        execFileAsync('bash', [
          SCRIPT_PATH,
          'update',
          '--feature-dir',
          featureDir,
          '--stage',
          'invalid_stage',
        ])
      ).rejects.toThrow();
    });
  });

  describe('status', () => {
    it('should return current stage name', async () => {
      await execFileAsync('bash', [SCRIPT_PATH, 'init', '--feature-dir', featureDir]);
      const { stdout } = await execFileAsync('bash', [
        SCRIPT_PATH,
        'status',
        '--feature-dir',
        featureDir,
      ]);

      expect(stdout.trim()).toBe('1_research');
    });

    it('should return updated stage after update', async () => {
      await execFileAsync('bash', [SCRIPT_PATH, 'init', '--feature-dir', featureDir]);
      await execFileAsync('bash', [
        SCRIPT_PATH,
        'update',
        '--feature-dir',
        featureDir,
        '--stage',
        '3_plan',
      ]);

      const { stdout } = await execFileAsync('bash', [
        SCRIPT_PATH,
        'status',
        '--feature-dir',
        featureDir,
      ]);

      expect(stdout.trim()).toBe('3_plan');
    });
  });
});
