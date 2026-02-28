import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PipelineStateManager } from '../../../extension/src/autonomous/PipelineStateManager';

describe('PipelineStateManager', () => {
  let tmpDir: string;
  let featureDir: string;
  let manager: PipelineStateManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-state-test-'));
    featureDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    manager = new PipelineStateManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('init', () => {
    it('should create valid JSON with UUID runId', async () => {
      const state = await manager.init(featureDir);

      expect(state.runId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
      expect(state.featureId).toBe('test-feature');
      expect(state.currentStage).toBe('1_research');
      expect(state.completedStages).toEqual([]);
      expect(state.status).toBe('initialized');
      expect(state.startedAt).toBeTruthy();
      expect(state.updatedAt).toBeTruthy();
    });

    it('should write pipeline-state.json to disk', async () => {
      await manager.init(featureDir);

      const statePath = path.join(featureDir, 'pipeline-state.json');
      expect(fs.existsSync(statePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(content.runId).toBeTruthy();
    });

    it('should accept relative path', async () => {
      const relPath = path.relative(tmpDir, featureDir);
      const state = await manager.init(relPath);

      expect(state.featureDir).toBe(relPath);
    });

    it('should accept custom featureId', async () => {
      const state = await manager.init(featureDir, 'custom-id');
      expect(state.featureId).toBe('custom-id');
    });
  });

  describe('readState', () => {
    it('should return typed PipelineState', async () => {
      await manager.init(featureDir);
      const state = await manager.readState();

      expect(state).not.toBeNull();
      expect(state!.runId).toBeTruthy();
      expect(state!.currentStage).toBe('1_research');
    });

    it('should return null for non-existent file', async () => {
      const state = await manager.readState(featureDir);
      expect(state).toBeNull();
    });

    it('should return null for corrupt JSON', async () => {
      const statePath = path.join(featureDir, 'pipeline-state.json');
      fs.writeFileSync(statePath, '{invalid json!!!', 'utf-8');

      const state = await manager.readState(featureDir);
      expect(state).toBeNull();
    });
  });

  describe('updateStage', () => {
    it('should transition currentStage and append to completedStages', async () => {
      await manager.init(featureDir);
      const state = await manager.updateStage('2_specify');

      expect(state.currentStage).toBe('2_specify');
      expect(state.completedStages).toContain('1_research');
      expect(state.status).toBe('in_progress');
    });

    it('should handle multiple stage transitions', async () => {
      await manager.init(featureDir);
      await manager.updateStage('2_specify');
      const state = await manager.updateStage('3_plan');

      expect(state.currentStage).toBe('3_plan');
      expect(state.completedStages).toContain('1_research');
      expect(state.completedStages).toContain('2_specify');
    });

    it('should reject invalid stage names', async () => {
      await manager.init(featureDir);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(manager.updateStage('invalid_stage' as any)).rejects.toThrow('Invalid stage');
    });

    it('should throw if no state exists', async () => {
      await expect(manager.updateStage('2_specify')).rejects.toThrow('No pipeline state found');
    });

    it('should not duplicate stages in completedStages', async () => {
      await manager.init(featureDir);
      await manager.updateStage('2_specify');
      // Update to same stage again
      await manager.updateStage('2_specify');
      const state = await manager.readState();

      const count = state!.completedStages.filter((s) => s === '1_research').length;
      expect(count).toBe(1);
    });
  });

  describe('getRunId', () => {
    it('should return runId after init', async () => {
      const state = await manager.init(featureDir);
      const runId = manager.getRunId();
      expect(runId).toBe(state.runId);
    });

    it('should return null when no state exists', () => {
      const runId = manager.getRunId();
      expect(runId).toBeNull();
    });
  });

  describe('concurrent writes', () => {
    it('should not corrupt state on sequential rapid writes', async () => {
      await manager.init(featureDir);

      await manager.updateStage('2_specify');
      await manager.updateStage('3_plan');
      await manager.updateStage('4_tasks');

      const state = await manager.readState();
      expect(state!.currentStage).toBe('4_tasks');
      expect(state!.completedStages).toHaveLength(3);
    });
  });
});
