/**
 * T136 — codex-only-emit.test.ts
 *
 * Codex now receives the full Gofer command set. The legacy
 * CLAUDE_ONLY_STAGES export remains for compatibility but must be empty.
 */

import { describe, it, expect, beforeAll } from 'vitest';

const MODULE_URL = new URL('../../../.specify/scripts/node/generate-commands.mjs', import.meta.url);

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

describe('Codex emit parity (T136)', () => {
  let CLAUDE_ONLY_STAGES: string[];
  let shouldExclude: (stageName: string, surface: string) => boolean;

  beforeAll(async () => {
    const mod = await import(MODULE_URL.href);
    CLAUDE_ONLY_STAGES = mod.CLAUDE_ONLY_STAGES;
    shouldExclude = mod.shouldExclude;
  });

  it('keeps the legacy Claude-only list empty', () => {
    expect(CLAUDE_ONLY_STAGES).toEqual([]);
  });

  it.each(ALL_GOFER_STAGES)('does not exclude %s from codex', (stageName) => {
    expect(shouldExclude(stageName, 'codex')).toBe(false);
  });

  it.each(ALL_GOFER_STAGES)('does not exclude %s from agents-skills', (stageName) => {
    expect(shouldExclude(stageName, 'agents-skills')).toBe(false);
  });

  it.each(ALL_GOFER_STAGES)('does not exclude %s from gemini', (stageName) => {
    expect(shouldExclude(stageName, 'gemini')).toBe(false);
  });
});
