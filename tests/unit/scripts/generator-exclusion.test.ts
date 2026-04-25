import { describe, it, expect, beforeAll } from 'vitest';

const moduleUrl = new URL('../../../.specify/scripts/node/generate-commands.mjs', import.meta.url);

describe('shouldExclude', () => {
  let shouldExclude: (stageName: string, surface: string) => boolean;
  let CLAUDE_ONLY_STAGES: string[];

  beforeAll(async () => {
    const mod = await import(moduleUrl.href);
    shouldExclude = mod.shouldExclude;
    CLAUDE_ONLY_STAGES = mod.CLAUDE_ONLY_STAGES;
  });

  // Core spec tests (T019 explicit requirements)
  it('excludes 0_business_scenario from codex', () => {
    expect(shouldExclude('0_business_scenario', 'codex')).toBe(true);
  });

  it('does NOT exclude 0_business_scenario from claude', () => {
    expect(shouldExclude('0_business_scenario', 'claude')).toBe(false);
  });

  it('does NOT exclude 1_gofer_research from codex', () => {
    expect(shouldExclude('1_gofer_research', 'codex')).toBe(false);
  });

  it('excludes gofer_constitution from gemini', () => {
    expect(shouldExclude('gofer_constitution', 'gemini')).toBe(true);
  });

  // Additional coverage
  it('does NOT exclude 0_business_scenario from claude-mirror', () => {
    expect(shouldExclude('0_business_scenario', 'claude-mirror')).toBe(false);
  });

  it('excludes gofer_hydrate from codex', () => {
    expect(shouldExclude('gofer_hydrate', 'codex')).toBe(true);
  });

  it('excludes 7_gofer_save from copilot', () => {
    expect(shouldExclude('7_gofer_save', 'copilot')).toBe(true);
  });

  it('excludes 8_gofer_resume from github-prompts', () => {
    expect(shouldExclude('8_gofer_resume', 'github-prompts')).toBe(true);
  });

  it('does NOT exclude 1_gofer_research from gemini', () => {
    expect(shouldExclude('1_gofer_research', 'gemini')).toBe(false);
  });

  it('does NOT exclude 6_gofer_validate from agents-skills', () => {
    expect(shouldExclude('6_gofer_validate', 'agents-skills')).toBe(false);
  });

  describe('CLAUDE_ONLY_STAGES constant', () => {
    it('contains exactly 5 stage names', () => {
      expect(CLAUDE_ONLY_STAGES).toHaveLength(5);
    });

    it('contains all expected claude-only stage names', () => {
      expect(CLAUDE_ONLY_STAGES).toContain('0_business_scenario');
      expect(CLAUDE_ONLY_STAGES).toContain('gofer_constitution');
      expect(CLAUDE_ONLY_STAGES).toContain('gofer_hydrate');
      expect(CLAUDE_ONLY_STAGES).toContain('7_gofer_save');
      expect(CLAUDE_ONLY_STAGES).toContain('8_gofer_resume');
    });
  });
});
