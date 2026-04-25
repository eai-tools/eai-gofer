/**
 * T150 — Two-pass canvas pipeline (complement to two-pass-canvas.test.ts).
 *
 * The existing `two-pass-canvas.test.ts` covers the basic semantics of
 * runPass1 / runPass2: pass-1 fills the canvas with heuristic risks,
 * pass-2 swaps only the Top Three Risks section and bumps the
 * frontmatter `pass:` marker from 1 to 2.
 *
 * This file adds two missing assertions that the existing test does not
 * cover and that are required for FR-016 / SC-001:
 *
 *   1. Diff-level invariant: every line of the pass-1 output is preserved
 *      verbatim in pass-2 EXCEPT for lines inside the "## Top Three Risks"
 *      section and the frontmatter `pass:` marker. This is verified by
 *      structured diffing rather than the regex-strip approach used in the
 *      existing test, giving a stronger byte-equivalence guarantee.
 *
 *   2. SC-001 measurability: a reader can identify the four AI-leverage
 *      verb counts (Replace / Augment / Automate / Observe) in the pass-1
 *      output in <60s. We simulate this with a parser that counts how
 *      many of the four verbs appear adjacent to numeric values inside
 *      the AI-leverage pie chart block. The assertion is "all four are
 *      identifiable" — a simpler, deterministic stand-in for a human
 *      timing study but adequate for an automated regression test.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const moduleUrl = new URL(
  '../../../.specify/scripts/node/lib/visual-pass-pipeline.mjs',
  import.meta.url
);

interface Pipeline {
  runPass1: (featureDir: string, data: Record<string, unknown>) => Promise<string>;
  runPass2: (featureDir: string, data: Record<string, unknown>) => Promise<string>;
}

const AI_LEVERAGE_VERBS = ['Replace', 'Augment', 'Automate', 'Observe'] as const;

/**
 * Simulate a reader counting AI-leverage verbs in a canvas. Returns
 * how many of the four canonical verbs appear adjacent to a numeric
 * value (i.e. `"Verb" : N` syntax inside the Mermaid pie block).
 */
function countAiLeverageVerbs(content: string): number {
  let found = 0;
  for (const verb of AI_LEVERAGE_VERBS) {
    const re = new RegExp(`"${verb}"\\s*:\\s*\\d+`);
    if (re.test(content)) found += 1;
  }
  return found;
}

describe('two-pass canvas pipeline (T150)', () => {
  let pipeline: Pipeline;
  let tmpRoot: string;

  beforeAll(async () => {
    pipeline = (await import(moduleUrl.href)) as Pipeline;
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'gofer-canvas-pipeline-'));
  });

  afterAll(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it('pass-1 then pass-2 differ ONLY inside the Top Three Risks section and the pass: marker', async () => {
    const featureDir = path.join(tmpRoot, 'feat-diff');
    await pipeline.runPass1(featureDir, {
      FEATURE_NAME: 'Diff Feature',
      DATE: '2026-04-25',
      PROBLEM_STATEMENT: 'Static problem.',
      PERSONA_LIST: '- Persona A',
      REPLACE_COUNT: 1,
      AUGMENT_COUNT: 2,
      AUTOMATE_COUNT: 3,
      OBSERVE_COUNT: 4,
      HEURISTIC_RISKS: ['Risk H1', 'Risk H2', 'Risk H3'],
      OUTCOMES: 'Original outcome line.',
    });

    const canvasPath = path.join(featureDir, 'visuals', 'impact-canvas.md');
    const before = await readFile(canvasPath, 'utf8');

    await pipeline.runPass2(featureDir, {
      VALIDATED_RISKS: ['Validated V1', 'Validated V2', 'Validated V3'],
    });
    const after = await readFile(canvasPath, 'utf8');

    // Pass marker bump.
    expect(before).toMatch(/^pass:\s*1$/m);
    expect(after).toMatch(/^pass:\s*2$/m);

    // Verify that everything OUTSIDE the Top Three Risks section is preserved.
    // Strategy: extract pre-risks and post-risks segments from both files
    // (excluding the `pass:` marker line) and compare them content-equally.
    // The risks section length may differ between passes, so positional diff
    // is unreliable.
    function splitAroundRisks(content: string): { pre: string; risks: string; post: string } {
      const lines = content.split(/\r?\n/);
      let start = -1;
      let end = lines.length;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('## Top Three Risks')) {
          start = i;
        } else if (start !== -1 && i > start && lines[i].startsWith('## ')) {
          end = i;
          break;
        }
      }
      const pre = lines
        .slice(0, start)
        .filter((l) => !/^pass:\s*\d+$/.test(l))
        .join('\n');
      const risks = lines.slice(start, end).join('\n');
      const post = lines.slice(end).join('\n');
      return { pre, risks, post };
    }

    const beforeParts = splitAroundRisks(before);
    const afterParts = splitAroundRisks(after);

    // Pre-risks and post-risks segments must be byte-identical (modulo pass: line).
    expect(afterParts.pre).toBe(beforeParts.pre);
    expect(afterParts.post).toBe(beforeParts.post);
    // Risks section MUST differ (heuristic -> validated).
    expect(afterParts.risks).not.toBe(beforeParts.risks);

    // Sanity: validated risks present, heuristic risks gone.
    expect(after).toContain('Validated V1');
    expect(after).toContain('Validated V2');
    expect(after).toContain('Validated V3');
    expect(after).not.toContain('Risk H1');
    expect(after).not.toContain('Risk H2');
    expect(after).not.toContain('Risk H3');
  });

  it('SC-001: pass-1 output exposes all four AI-leverage verb counts (parser-detectable)', async () => {
    const featureDir = path.join(tmpRoot, 'feat-sc001');
    const canvasPath = await pipeline.runPass1(featureDir, {
      FEATURE_NAME: 'SC-001 Feature',
      DATE: '2026-04-25',
      PROBLEM_STATEMENT: 'SC-001 measurability.',
      PERSONA_LIST: '- Persona Z',
      REPLACE_COUNT: 7,
      AUGMENT_COUNT: 8,
      AUTOMATE_COUNT: 9,
      OBSERVE_COUNT: 10,
      HEURISTIC_RISKS: ['r1', 'r2', 'r3'],
      OUTCOMES: 'Outcome.',
    });

    const content = await readFile(canvasPath, 'utf8');

    // All four AI-leverage verbs are identifiable adjacent to their counts.
    // This stands in for the human-timing component of SC-001 (a reader
    // can identify the four counts in <60s) — the pie-chart syntax makes
    // the four counts deterministically parseable, which is a stricter
    // condition than human readability.
    expect(countAiLeverageVerbs(content)).toBe(AI_LEVERAGE_VERBS.length);

    // Cross-check the actual numeric values made it through.
    expect(content).toMatch(/"Replace"\s*:\s*7/);
    expect(content).toMatch(/"Augment"\s*:\s*8/);
    expect(content).toMatch(/"Automate"\s*:\s*9/);
    expect(content).toMatch(/"Observe"\s*:\s*10/);
  });
});
