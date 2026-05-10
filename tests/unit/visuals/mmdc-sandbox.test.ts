/**
 * T145 — mmdc-sandbox.test.ts
 *
 * NFR-006 INVARIANT: `mermaid-export.mjs` must NEVER pass `--no-sandbox`
 * to mmdc. The default Chrome sandbox is required when rendering Mermaid
 * in CI/shared environments.
 *
 * This is a source-level guard test: it checks the script text directly so
 * a regression is caught even if the runtime path is rare to exercise.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SCRIPT_PATH = path.resolve(__dirname, '../../../.specify/scripts/node/mermaid-export.mjs');

describe('mermaid-export sandbox invariant (T145 / NFR-006)', () => {
  it('mermaid-export.mjs never passes --no-sandbox', async () => {
    const src = await readFile(SCRIPT_PATH, 'utf8');
    expect(src).not.toContain('--no-sandbox');
  });

  it('source contains no other sandbox-disabling flag synonyms', async () => {
    const src = await readFile(SCRIPT_PATH, 'utf8');
    expect(src).not.toMatch(/--disable-sandbox\b/);
    expect(src).not.toMatch(/--no-zygote\b/);
  });
});
