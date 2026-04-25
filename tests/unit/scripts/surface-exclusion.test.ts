/**
 * T057–T060 — Comprehensive surface exclusion tests.
 *
 * Covers all combinations:
 * 1. For each CLAUDE_ONLY_STAGE, verify shouldExclude returns true for:
 *    codex, gemini, github-prompts, agents-skills, system-skills, copilot
 * 2. For each CLAUDE_ONLY_STAGE, verify shouldExclude returns false for:
 *    claude, claude-mirror
 * 3. For each non-claude-only stage, verify shouldExclude returns false for ALL surfaces
 * 4. Verify CLAUDE_ONLY_STAGES array has exactly 5 entries:
 *    0_business_scenario, gofer_constitution, gofer_hydrate, 7_gofer_save, 8_gofer_resume
 */
import { describe, it, expect, beforeAll } from 'vitest';

const generateCommandsUrl = new URL(
  '../../../.specify/scripts/node/generate-commands.mjs',
  import.meta.url
);

// ---------------------------------------------------------------------------
// Constants (mirrors the spec — used for test definition, not just runtime)
// ---------------------------------------------------------------------------

const EXPECTED_CLAUDE_ONLY_STAGES = [
  '0_business_scenario',
  'gofer_constitution',
  'gofer_hydrate',
  '7_gofer_save',
  '8_gofer_resume',
] as const;

const NON_CLAUDE_ONLY_STAGES = [
  '0a_problem_validation',
  '1_gofer_research',
  '2_gofer_specify',
  '3_gofer_plan',
  '4_gofer_tasks',
  '5_gofer_implement',
  '6_gofer_validate',
  '6a_gofer_engineering_review',
  '7a_stakeholder_comms',
  '9_gofer_tests',
  '10_gofer_cloud',
] as const;

const EXCLUDED_SURFACES = [
  'codex',
  'gemini',
  'github-prompts',
  'agents-skills',
  'system-skills',
  'copilot',
] as const;

const ALLOWED_SURFACES = ['claude', 'claude-mirror'] as const;

const ALL_SURFACES = [...EXCLUDED_SURFACES, ...ALLOWED_SURFACES] as const;

// ---------------------------------------------------------------------------
// Module loading
// ---------------------------------------------------------------------------

describe('surface-exclusion (T057–T060)', () => {
  let shouldExclude: (stageName: string, surface: string) => boolean;
  let CLAUDE_ONLY_STAGES: string[];

  beforeAll(async () => {
    const mod = await import(generateCommandsUrl.href);
    shouldExclude = mod.shouldExclude;
    CLAUDE_ONLY_STAGES = mod.CLAUDE_ONLY_STAGES;
  });

  // -------------------------------------------------------------------------
  // T060 — CLAUDE_ONLY_STAGES array validation
  // -------------------------------------------------------------------------

  describe('CLAUDE_ONLY_STAGES array (T060)', () => {
    it('has exactly 5 entries', () => {
      expect(CLAUDE_ONLY_STAGES).toHaveLength(5);
    });

    it('contains 0_business_scenario', () => {
      expect(CLAUDE_ONLY_STAGES).toContain('0_business_scenario');
    });

    it('contains gofer_constitution', () => {
      expect(CLAUDE_ONLY_STAGES).toContain('gofer_constitution');
    });

    it('contains gofer_hydrate', () => {
      expect(CLAUDE_ONLY_STAGES).toContain('gofer_hydrate');
    });

    it('contains 7_gofer_save', () => {
      expect(CLAUDE_ONLY_STAGES).toContain('7_gofer_save');
    });

    it('contains 8_gofer_resume', () => {
      expect(CLAUDE_ONLY_STAGES).toContain('8_gofer_resume');
    });

    it('contains no unexpected stages', () => {
      for (const stage of CLAUDE_ONLY_STAGES) {
        expect(
          EXPECTED_CLAUDE_ONLY_STAGES as readonly string[],
          `Unexpected claude-only stage: '${stage}'`
        ).toContain(stage);
      }
    });
  });

  // -------------------------------------------------------------------------
  // T057 — Claude-only stages excluded from non-claude surfaces
  // -------------------------------------------------------------------------

  describe('T057: claude-only stages → excluded from non-claude surfaces', () => {
    for (const stage of EXPECTED_CLAUDE_ONLY_STAGES) {
      describe(`stage: ${stage}`, () => {
        for (const surface of EXCLUDED_SURFACES) {
          it(`shouldExclude('${stage}', '${surface}') === true`, () => {
            expect(shouldExclude(stage, surface)).toBe(true);
          });
        }
      });
    }
  });

  // -------------------------------------------------------------------------
  // T058 — Claude-only stages allowed on claude and claude-mirror
  // -------------------------------------------------------------------------

  describe('T058: claude-only stages → allowed on claude and claude-mirror', () => {
    for (const stage of EXPECTED_CLAUDE_ONLY_STAGES) {
      describe(`stage: ${stage}`, () => {
        for (const surface of ALLOWED_SURFACES) {
          it(`shouldExclude('${stage}', '${surface}') === false`, () => {
            expect(shouldExclude(stage, surface)).toBe(false);
          });
        }
      });
    }
  });

  // -------------------------------------------------------------------------
  // T059 — Non-claude-only stages: shouldExclude returns false for ALL surfaces
  // -------------------------------------------------------------------------

  describe('T059: non-claude-only stages → not excluded from any surface', () => {
    for (const stage of NON_CLAUDE_ONLY_STAGES) {
      describe(`stage: ${stage}`, () => {
        for (const surface of ALL_SURFACES) {
          it(`shouldExclude('${stage}', '${surface}') === false`, () => {
            expect(shouldExclude(stage, surface)).toBe(false);
          });
        }
      });
    }
  });

  // -------------------------------------------------------------------------
  // Edge cases and unknown stage names
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('unknown stage is never excluded from any surface', () => {
      for (const surface of ALL_SURFACES) {
        expect(shouldExclude('unknown_stage', surface)).toBe(false);
      }
    });

    it('empty string stage name is never excluded', () => {
      for (const surface of ALL_SURFACES) {
        expect(shouldExclude('', surface)).toBe(false);
      }
    });

    it('unknown surface does not affect exclusion for claude-only stages', () => {
      // An unknown surface is not 'claude' or 'claude-mirror', so claude-only stages
      // should be excluded from it
      expect(shouldExclude('0_business_scenario', 'unknown-surface')).toBe(true);
    });
  });
});
