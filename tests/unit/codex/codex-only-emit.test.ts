/**
 * T136 — codex-only-emit.test.ts
 *
 * Codex now receives the full Gofer command set. The legacy
 * CLAUDE_ONLY_STAGES export remains for compatibility but must be empty.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { FULL_COMMAND_NAMES } from '../../helpers/goferCommandSet';

const MODULE_URL = new URL('../../../.specify/scripts/node/generate-commands.mjs', import.meta.url);

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

  it.each(FULL_COMMAND_NAMES)('does not exclude %s from codex', (stageName) => {
    expect(shouldExclude(stageName, 'codex')).toBe(false);
  });

  it.each(FULL_COMMAND_NAMES)('does not exclude %s from agents-skills', (stageName) => {
    expect(shouldExclude(stageName, 'agents-skills')).toBe(false);
  });

  it.each(FULL_COMMAND_NAMES)('does not exclude %s from gemini', (stageName) => {
    expect(shouldExclude(stageName, 'gemini')).toBe(false);
  });
});
