/**
 * T135 — canonical-set-cumulative-budget.test.ts
 *
 * Asserts that the cumulative UTF-8 byte total of every emitted Codex skill
 * description (name + ": " + description) stays within the 2048-byte budget
 * mandated by NFR-004 / SC-006. (US6 AC-3 / FR-006.)
 *
 * Also logs the actual byte total so a regression alarm bell rings well
 * before the limit is breached.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CANONICAL_DESCRIPTION_COUNT } from '../../helpers/goferCommandSet';

const MODULE_URL = new URL(
  '../../../.specify/scripts/node/canonical-descriptions.mjs',
  import.meta.url
);

describe('Codex canonical-set cumulative byte budget (T135 / NFR-004)', () => {
  let CANONICAL_DESCRIPTIONS: Record<string, string>;

  beforeAll(async () => {
    const mod = await import(MODULE_URL.href);
    CANONICAL_DESCRIPTIONS = mod.CANONICAL_DESCRIPTIONS;
  });

  it(`canonical set has ${CANONICAL_DESCRIPTION_COUNT} descriptions`, () => {
    expect(Object.keys(CANONICAL_DESCRIPTIONS)).toHaveLength(CANONICAL_DESCRIPTION_COUNT);
  });

  it('cumulative UTF-8 byte total (name + description) is ≤ 2048 bytes', () => {
    let totalBytes = 0;
    for (const [name, description] of Object.entries(CANONICAL_DESCRIPTIONS)) {
      // Codex preloads `<name>: <description>\n` per skill — we account for
      // that wire-format shape so the budget reflects what Codex actually sees.
      const wire = `${name}: ${description}\n`;
      totalBytes += Buffer.byteLength(wire, 'utf8');
    }

    console.log(`[T135] cumulative skill-description bytes: ${totalBytes} / 2048`);

    expect(totalBytes).toBeLessThanOrEqual(2048);
  });

  it('description-only byte total is also ≤ 2048 bytes (looser definition)', () => {
    let totalBytes = 0;
    for (const description of Object.values(CANONICAL_DESCRIPTIONS)) {
      totalBytes += Buffer.byteLength(description, 'utf8');
    }

    console.log(`[T135] description-only bytes: ${totalBytes} / 2048`);
    expect(totalBytes).toBeLessThanOrEqual(2048);
  });
});
