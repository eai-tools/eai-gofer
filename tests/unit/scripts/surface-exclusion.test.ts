import { describe, it, expect, beforeAll } from 'vitest';

const generateCommandsUrl = new URL(
  '../../../.specify/scripts/node/generate-commands.mjs',
  import.meta.url
);

const ALL_GOFER_STAGES = [
  '0_business_scenario',
  '0a_problem_validation',
  '1_gofer_research',
  '2_gofer_specify',
  '3_gofer_plan',
  '4_gofer_tasks',
  '5_gofer_implement',
  '6_gofer_validate',
  '6a_gofer_engineering_review',
  '7_gofer_save',
  '7a_stakeholder_comms',
  '8_gofer_resume',
  '9_gofer_tests',
  '10_gofer_cloud',
  'gofer_constitution',
  'gofer_hydrate',
  'gofer:personality',
  'gofer:plan',
  'gofer:side',
] as const;

const ALL_SURFACES = [
  'claude',
  'claude-mirror',
  'copilot',
  'codex',
  'gemini',
  'github-prompts',
  'agents-skills',
  'system-skills',
  'agents-md',
  'codex-config',
  'unknown-surface',
] as const;

describe('surface-exclusion parity', () => {
  let shouldExclude: (stageName: string, surface: string) => boolean;
  let CLAUDE_ONLY_STAGES: string[];

  beforeAll(async () => {
    const mod = await import(generateCommandsUrl.href);
    shouldExclude = mod.shouldExclude;
    CLAUDE_ONLY_STAGES = mod.CLAUDE_ONLY_STAGES;
  });

  it('has no Claude-only exclusions', () => {
    expect(CLAUDE_ONLY_STAGES).toEqual([]);
  });

  it('does not exclude any Gofer stage from any surface', () => {
    for (const stage of ALL_GOFER_STAGES) {
      for (const surface of ALL_SURFACES) {
        expect(shouldExclude(stage, surface), `${stage} on ${surface}`).toBe(false);
      }
    }
  });

  it('never excludes unknown or empty stage names', () => {
    for (const surface of ALL_SURFACES) {
      expect(shouldExclude('unknown_stage', surface)).toBe(false);
      expect(shouldExclude('', surface)).toBe(false);
    }
  });
});
