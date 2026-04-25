/**
 * T136 — codex-only-emit.test.ts
 *
 * Asserts that the 5 Claude-only stages (FR-007) are never emitted to
 * Codex/agents-skills surfaces. Codex discovers `.agents/skills/`, so both
 * `codex` and `agents-skills` must exclude the Claude-only set.
 *
 * (US6 AC-4 / SC-012.)
 */

import { describe, it, expect, beforeAll } from 'vitest';

const MODULE_URL = new URL('../../../.specify/scripts/node/generate-commands.mjs', import.meta.url);

describe('Codex-only emit exclusions (T136 / FR-007)', () => {
  let CLAUDE_ONLY_STAGES: string[];
  let shouldExclude: (stageName: string, surface: string) => boolean;

  beforeAll(async () => {
    const mod = await import(MODULE_URL.href);
    CLAUDE_ONLY_STAGES = mod.CLAUDE_ONLY_STAGES;
    shouldExclude = mod.shouldExclude;
  });

  it('CLAUDE_ONLY_STAGES contains the 5 stages defined by FR-007', () => {
    expect(CLAUDE_ONLY_STAGES.sort()).toEqual(
      [
        '0_business_scenario',
        'gofer_constitution',
        'gofer_hydrate',
        '7_gofer_save',
        '8_gofer_resume',
      ].sort()
    );
  });

  it.each([
    '0_business_scenario',
    'gofer_constitution',
    'gofer_hydrate',
    '7_gofer_save',
    '8_gofer_resume',
  ])('excludes %s from codex surface', (stageName) => {
    expect(shouldExclude(stageName, 'codex')).toBe(true);
  });

  it.each([
    '0_business_scenario',
    'gofer_constitution',
    'gofer_hydrate',
    '7_gofer_save',
    '8_gofer_resume',
  ])('excludes %s from agents-skills surface', (stageName) => {
    expect(shouldExclude(stageName, 'agents-skills')).toBe(true);
  });

  it.each([
    '1_gofer_research',
    '2_gofer_specify',
    '3_gofer_plan',
    '4_gofer_tasks',
    '5_gofer_implement',
    '6_gofer_validate',
    '7a_stakeholder_comms',
    '9_gofer_tests',
    '10_gofer_cloud',
  ])('does NOT exclude %s from codex surface', (stageName) => {
    expect(shouldExclude(stageName, 'codex')).toBe(false);
  });

  it.each([
    '1_gofer_research',
    '2_gofer_specify',
    '3_gofer_plan',
    '4_gofer_tasks',
    '5_gofer_implement',
    '6_gofer_validate',
    '7a_stakeholder_comms',
    '9_gofer_tests',
    '10_gofer_cloud',
  ])('does NOT exclude %s from agents-skills surface', (stageName) => {
    expect(shouldExclude(stageName, 'agents-skills')).toBe(false);
  });

  it('Claude-only stages ARE allowed on the claude surface', () => {
    for (const stage of CLAUDE_ONLY_STAGES) {
      expect(shouldExclude(stage, 'claude')).toBe(false);
      expect(shouldExclude(stage, 'claude-mirror')).toBe(false);
    }
  });
});
