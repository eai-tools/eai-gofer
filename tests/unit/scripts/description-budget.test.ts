/**
 * T055 — Description budget test.
 *
 * Focused on Codex skill-budget constraints:
 * 1. Each canonical description is ≤ 140 bytes (UTF-8)
 * 2. Total cumulative bytes of all descriptions ≤ 2048
 * 3. No empty descriptions
 * 4. All 16 stage names are present in CANONICAL_DESCRIPTIONS
 *
 * Note: Unlike canonical-descriptions.test.ts (which tests the validateDescriptions()
 * helper), this test directly validates the budget constraints in isolation.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  CANONICAL_DESCRIPTION_COUNT,
  CANONICAL_DESCRIPTION_NAMES,
} from '../../helpers/goferCommandSet';

const canonicalDescriptionsUrl = new URL(
  '../../../.specify/scripts/node/canonical-descriptions.mjs',
  import.meta.url
);

// The Codex skill-budget hard limits
const MAX_DESCRIPTION_BYTES = 140;
const MAX_TOTAL_BYTES = 2048;

describe('description-budget (T055)', () => {
  let CANONICAL_DESCRIPTIONS: Record<string, string>;

  beforeAll(async () => {
    const mod = await import(canonicalDescriptionsUrl.href);
    CANONICAL_DESCRIPTIONS = mod.CANONICAL_DESCRIPTIONS;
  });

  // -------------------------------------------------------------------------
  // Stage completeness
  // -------------------------------------------------------------------------

  it(`contains exactly ${CANONICAL_DESCRIPTION_COUNT} canonical command descriptions`, () => {
    expect(Object.keys(CANONICAL_DESCRIPTIONS)).toHaveLength(CANONICAL_DESCRIPTION_COUNT);
  });

  it('contains all expected canonical command names', () => {
    for (const stage of CANONICAL_DESCRIPTION_NAMES) {
      expect(
        CANONICAL_DESCRIPTIONS,
        `CANONICAL_DESCRIPTIONS is missing stage '${stage}'`
      ).toHaveProperty(stage);
    }
  });

  // -------------------------------------------------------------------------
  // Non-empty check
  // -------------------------------------------------------------------------

  it('no stage has an empty description', () => {
    for (const [name, description] of Object.entries(CANONICAL_DESCRIPTIONS)) {
      expect(description, `Description for '${name}' is null/undefined/empty`).toBeTruthy();
      expect(
        description.trim().length,
        `Description for '${name}' is blank (whitespace only)`
      ).toBeGreaterThan(0);
    }
  });

  // -------------------------------------------------------------------------
  // Per-description byte budget (≤ 140 bytes UTF-8)
  // -------------------------------------------------------------------------

  describe('per-description byte budget (≤ 140 bytes UTF-8)', () => {
    for (const stageName of CANONICAL_DESCRIPTION_NAMES) {
      it(`${stageName}: description ≤ ${MAX_DESCRIPTION_BYTES} bytes`, () => {
        const description = CANONICAL_DESCRIPTIONS[stageName];
        expect(description, `No description for stage '${stageName}'`).toBeDefined();
        const bytes = Buffer.byteLength(description, 'utf8');
        expect(
          bytes,
          `Stage '${stageName}' description is ${bytes} bytes (max ${MAX_DESCRIPTION_BYTES}): "${description}"`
        ).toBeLessThanOrEqual(MAX_DESCRIPTION_BYTES);
      });
    }
  });

  // -------------------------------------------------------------------------
  // Cumulative byte budget (≤ 2048 bytes total UTF-8)
  // -------------------------------------------------------------------------

  it(`cumulative UTF-8 byte total ≤ ${MAX_TOTAL_BYTES} bytes`, () => {
    let totalBytes = 0;
    const breakdown: string[] = [];

    for (const [name, description] of Object.entries(CANONICAL_DESCRIPTIONS)) {
      const bytes = Buffer.byteLength(description, 'utf8');
      totalBytes += bytes;
      breakdown.push(`  ${name}: ${bytes}B`);
    }

    expect(
      totalBytes,
      `Cumulative description bytes ${totalBytes} exceeds ${MAX_TOTAL_BYTES} budget.\nBreakdown:\n${breakdown.join('\n')}`
    ).toBeLessThanOrEqual(MAX_TOTAL_BYTES);
  });

  it('cumulative byte total is positive (sanity check)', () => {
    let totalBytes = 0;
    for (const description of Object.values(CANONICAL_DESCRIPTIONS)) {
      totalBytes += Buffer.byteLength(description, 'utf8');
    }
    expect(totalBytes).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Char-count check (≤ 140 chars — Codex also constrains by char count)
  // -------------------------------------------------------------------------

  it('no stage description exceeds 140 characters', () => {
    for (const [name, description] of Object.entries(CANONICAL_DESCRIPTIONS)) {
      expect(
        description.length,
        `Stage '${name}' description is ${description.length} chars (max 140): "${description}"`
      ).toBeLessThanOrEqual(140);
    }
  });
});
