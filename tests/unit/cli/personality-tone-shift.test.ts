/**
 * T134 — personality-tone-shift.test.ts
 *
 * Verifies the `gofer_personality.md` control-command source-of-truth
 * (FR-014, US5 AC-5).
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const FILE_PATH = path.resolve(__dirname, '../../../.specify/commands/gofer_personality.md');

describe('gofer_personality control command (T134 / FR-014)', () => {
  it('source-of-truth file exists', () => {
    expect(existsSync(FILE_PATH)).toBe(true);
  });

  it('frontmatter declares an args.mode enum with [friendly, pragmatic, none]', () => {
    const raw = readFileSync(FILE_PATH, 'utf8');
    // The minimal frontmatter parser doesn't dive into nested blocks; we
    // assert directly against the YAML text. This keeps the test schema-aware
    // without coupling to a particular parser implementation.
    expect(raw).toMatch(/args:\s*\n\s*mode:/);
    expect(raw).toMatch(/enum:\s*\[friendly,\s*pragmatic,\s*none\]/);
  });

  it('default value for mode is "none"', () => {
    const raw = readFileSync(FILE_PATH, 'utf8');
    expect(raw).toMatch(/default:\s*none/);
  });

  it('body mentions all three tone presets', () => {
    const raw = readFileSync(FILE_PATH, 'utf8');
    // Skip the frontmatter when checking the body
    const fenceClose = raw.indexOf('\n---', 3);
    expect(fenceClose).toBeGreaterThan(0);
    const body = raw.slice(fenceClose + 4).toLowerCase();

    expect(body).toContain('friendly');
    expect(body).toContain('pragmatic');
    expect(body).toContain('none');
  });

  it('frontmatter category is "control"', () => {
    const raw = readFileSync(FILE_PATH, 'utf8');
    expect(raw).toMatch(/category:\s*control/);
  });
});
