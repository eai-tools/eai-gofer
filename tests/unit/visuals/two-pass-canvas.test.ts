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

describe('two-pass canvas pipeline (T104)', () => {
  let pipeline: Pipeline;
  let tmpRoot: string;

  beforeAll(async () => {
    pipeline = (await import(moduleUrl.href)) as Pipeline;
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'gofer-canvas-'));
  });

  afterAll(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it('pass 1 produces a complete canvas with heuristic risks', async () => {
    const featureDir = path.join(tmpRoot, 'feat-1');
    const outPath = await pipeline.runPass1(featureDir, {
      FEATURE_NAME: 'Demo Feature',
      DATE: '2026-04-25',
      PROBLEM_STATEMENT: 'Manual triage is slow.',
      PERSONA_LIST: '- Analyst',
      REPLACE_COUNT: 1,
      AUGMENT_COUNT: 2,
      AUTOMATE_COUNT: 0,
      OBSERVE_COUNT: 1,
      HEURISTIC_RISKS: ['NFR latency', 'Out-of-scope auth', 'Adoption'],
      OUTCOMES: 'Faster triage.',
    });

    const content = await readFile(outPath, 'utf8');
    expect(content).toMatch(/^pass:\s*1$/m);
    expect(content).toContain('# Impact Canvas: Demo Feature');
    expect(content).toContain('Manual triage is slow.');
    expect(content).toContain('"Augment" : 2');
    expect(content).toContain('1. NFR latency');
    expect(content).toContain('2. Out-of-scope auth');
    expect(content).toContain('3. Adoption');
    expect(content).toContain('Faster triage.');
  });

  it('pass 2 only modifies the Top Three Risks section and bumps the pass field', async () => {
    const featureDir = path.join(tmpRoot, 'feat-2');
    await pipeline.runPass1(featureDir, {
      FEATURE_NAME: 'Stable Feature',
      DATE: '2026-04-25',
      PROBLEM_STATEMENT: 'Original problem.',
      PERSONA_LIST: '- Persona A\n- Persona B',
      REPLACE_COUNT: 3,
      AUGMENT_COUNT: 4,
      AUTOMATE_COUNT: 5,
      OBSERVE_COUNT: 6,
      HEURISTIC_RISKS: ['Heur 1', 'Heur 2', 'Heur 3'],
      OUTCOMES: 'Outcome line.',
    });

    const canvasPath = path.join(featureDir, 'visuals', 'impact-canvas.md');
    const before = await readFile(canvasPath, 'utf8');

    await pipeline.runPass2(featureDir, {
      VALIDATED_RISKS: ['Council A', 'Council B', 'Council C'],
    });

    const after = await readFile(canvasPath, 'utf8');

    // Pass field bumped 1 -> 2.
    expect(after).toMatch(/^pass:\s*2$/m);
    expect(before).toMatch(/^pass:\s*1$/m);

    // Risks block fully replaced.
    expect(after).toContain('1. Council A');
    expect(after).toContain('2. Council B');
    expect(after).toContain('3. Council C');
    expect(after).not.toContain('Heur 1');
    expect(after).toContain('<!-- pass-2: validation council output -->');

    // Every other section preserved byte-identical.
    const stripRisks = (s: string) =>
      s.replace(/## Top Three Risks[\s\S]*?(?=\n## |$)/, '<<RISKS>>');
    const stripPass = (s: string) => s.replace(/^pass:\s*\d+/m, 'pass: X');
    expect(stripPass(stripRisks(after))).toBe(stripPass(stripRisks(before)));
  });

  it('throws when pass 2 is called without an existing canvas', async () => {
    const featureDir = path.join(tmpRoot, 'no-canvas');
    await expect(
      pipeline.runPass2(featureDir, { VALIDATED_RISKS: ['a', 'b', 'c'] })
    ).rejects.toThrow();
  });
});
