import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '../utils/logger';

export type PipelineStage =
  | '1_research'
  | '2_specify'
  | '3_plan'
  | '4_tasks'
  | '5_implement'
  | '6_validate';

export type PipelineStatus = 'initialized' | 'in_progress' | 'completed' | 'error';

export interface RunMetrics {
  totalTokens: number;
  estimatedCostUsd: number;
  compactionCount: number;
  stageTimings: Record<string, string>;
}

export interface PipelineState {
  runId: string;
  featureId: string;
  featureDir: string;
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  startedAt: string;
  updatedAt: string;
  status: PipelineStatus;
  runMetrics?: RunMetrics;
}

const VALID_STAGES: PipelineStage[] = [
  '1_research',
  '2_specify',
  '3_plan',
  '4_tasks',
  '5_implement',
  '6_validate',
];

export class PipelineStateManager {
  private readonly logger = Logger.for('PipelineStateManager');
  private statePath: string = '';

  constructor(private readonly workspaceRoot: string) {}

  async init(featureDir: string, featureId?: string): Promise<PipelineState> {
    const resolvedDir = path.isAbsolute(featureDir)
      ? featureDir
      : path.join(this.workspaceRoot, featureDir);

    this.statePath = path.join(resolvedDir, 'pipeline-state.json');

    await fs.promises.mkdir(resolvedDir, { recursive: true });

    const id = featureId || path.basename(resolvedDir);
    const relativeDir = path.relative(this.workspaceRoot, resolvedDir);
    const timestamp = new Date().toISOString();

    const state: PipelineState = {
      runId: crypto.randomUUID(),
      featureId: id,
      featureDir: relativeDir,
      currentStage: '1_research',
      completedStages: [],
      startedAt: timestamp,
      updatedAt: timestamp,
      status: 'initialized',
    };

    await this.writeState(state);
    return state;
  }

  async readState(featureDir?: string): Promise<PipelineState | null> {
    const statePath = featureDir
      ? path.join(
          path.isAbsolute(featureDir) ? featureDir : path.join(this.workspaceRoot, featureDir),
          'pipeline-state.json'
        )
      : this.statePath;

    if (!statePath) {
      return null;
    }

    try {
      const content = await fs.promises.readFile(statePath, 'utf-8');
      const state = JSON.parse(content) as PipelineState;
      this.statePath = statePath;
      return state;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      this.logger.warn(`Corrupt pipeline-state.json, re-initializing: ${error}`);
      return null;
    }
  }

  async updateStage(stage: PipelineStage): Promise<PipelineState> {
    if (!VALID_STAGES.includes(stage)) {
      throw new Error(`Invalid stage '${stage}'. Valid stages: ${VALID_STAGES.join(', ')}`);
    }

    const state = await this.readState();
    if (!state) {
      throw new Error('No pipeline state found. Call init() first.');
    }

    if (state.currentStage !== stage && !state.completedStages.includes(state.currentStage)) {
      state.completedStages.push(state.currentStage);
    }

    state.currentStage = stage;
    state.updatedAt = new Date().toISOString();
    state.status = 'in_progress';

    await this.writeState(state);
    return state;
  }

  getRunId(): string | null {
    try {
      if (!this.statePath) {
        return null;
      }
      const content = fs.readFileSync(this.statePath, 'utf-8');
      const state = JSON.parse(content) as PipelineState;
      return state.runId;
    } catch {
      return null;
    }
  }

  getStatePath(): string {
    return this.statePath;
  }

  private async writeState(state: PipelineState): Promise<void> {
    await fs.promises.writeFile(this.statePath, JSON.stringify(state, null, 2), 'utf-8');
  }
}
