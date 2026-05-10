/**
 * T143 — stakeholder-pack-deterministic-order.test.ts
 *
 * Asserts the stakeholder pack assembler produces:
 *   1. Files in the documented (locked) artifact order.
 *   2. Byte-identical output across consecutive calls with the same inputs.
 *   3. Stable order even when some artifacts are missing.
 *
 * (FR-028, NFR-011.)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const MODULE_URL = new URL(
  '../../../.specify/scripts/node/lib/assemble-stakeholder-pack.mjs',
  import.meta.url
);

const ALL_ARTIFACTS = [
  'impact-canvas.md',
  'c4-context.md',
  'c4-container.md',
  'value-stream-asis.md',
  'value-stream-tobe.md',
  'capability-heatmap.md',
  'bounded-context.md',
  'data-model-erd.md',
  'risk-heatmap.md',
  'roi-projection.md',
];

describe('stakeholder pack deterministic ordering (T143)', () => {
  let assembleStakeholderPack: (featureDir: string) => Promise<{
    written: string;
    included: string[];
    missing: string[];
  }>;
  let STAKEHOLDER_PACK_ORDER: readonly string[];
  let featureDir: string;

  beforeAll(async () => {
    const mod = await import(MODULE_URL.href);
    assembleStakeholderPack = mod.assembleStakeholderPack;
    STAKEHOLDER_PACK_ORDER = mod.STAKEHOLDER_PACK_ORDER;
  });

  beforeEach(() => {
    featureDir = mkdtempSync(path.join(tmpdir(), 'pack-order-'));
    mkdirSync(path.join(featureDir, 'visuals'), { recursive: true });
  });

  afterEach(() => {
    rmSync(featureDir, { recursive: true, force: true });
  });

  function writeAllArtifacts(): void {
    for (const name of ALL_ARTIFACTS) {
      // Embed the artifact name as the first line so the output ordering
      // is observable in the assembled pack.
      writeFileSync(
        path.join(featureDir, 'visuals', name),
        `# ${name}\n\nbody for ${name}\n`,
        'utf8'
      );
    }
  }

  it('exposed STAKEHOLDER_PACK_ORDER matches the spec-locked sequence', () => {
    expect([...STAKEHOLDER_PACK_ORDER]).toEqual(ALL_ARTIFACTS);
  });

  it('assembled pack contains artifacts in the documented order', async () => {
    writeAllArtifacts();
    const result = await assembleStakeholderPack(featureDir);
    expect(result.included).toEqual(ALL_ARTIFACTS);
    expect(result.missing).toEqual([]);

    const body = readFileSync(result.written, 'utf8');
    // Each artifact name appears as a heading; verify positional order.
    const positions = ALL_ARTIFACTS.map((n) => body.indexOf(`# ${n}`));
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it('two consecutive calls produce byte-identical output', async () => {
    writeAllArtifacts();
    const r1 = await assembleStakeholderPack(featureDir);
    const buf1 = readFileSync(r1.written);
    const r2 = await assembleStakeholderPack(featureDir);
    const buf2 = readFileSync(r2.written);
    expect(buf1.equals(buf2)).toBe(true);
  });

  it('skipping missing artifacts preserves the ordering of present artifacts', async () => {
    // Write only every other artifact (indices 0, 2, 4, 6, 8)
    const present = ALL_ARTIFACTS.filter((_, idx) => idx % 2 === 0);
    for (const name of present) {
      writeFileSync(path.join(featureDir, 'visuals', name), `# ${name}\n\nbody\n`, 'utf8');
    }

    const result = await assembleStakeholderPack(featureDir);
    expect(result.included).toEqual(present);
    expect(result.missing).toEqual(ALL_ARTIFACTS.filter((_, idx) => idx % 2 !== 0));

    const body = readFileSync(result.written, 'utf8');
    const positions = present.map((n) => body.indexOf(`# ${n}`));
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it('returns empty included/missing-all when visuals/ is empty', async () => {
    const result = await assembleStakeholderPack(featureDir);
    expect(result.included).toEqual([]);
    expect(result.missing).toEqual(ALL_ARTIFACTS);
    expect(readFileSync(result.written, 'utf8')).toBe('');
  });
});
