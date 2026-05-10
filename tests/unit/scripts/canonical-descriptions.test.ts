import { describe, it, expect } from 'vitest';
import {
  CANONICAL_DESCRIPTION_COUNT,
  CANONICAL_DESCRIPTION_NAMES,
} from '../../helpers/goferCommandSet';

// ESM interop: use dynamic import in async context
const moduleUrl = new URL(
  '../../../.specify/scripts/node/canonical-descriptions.mjs',
  import.meta.url
);

describe('canonical-descriptions', () => {
  let CANONICAL_DESCRIPTIONS: Record<string, string>;
  let validateDescriptions: () => { count: number; totalBytes: number };

  // Load the ESM module before tests
  beforeAll(async () => {
    const mod = await import(moduleUrl.href);
    CANONICAL_DESCRIPTIONS = mod.CANONICAL_DESCRIPTIONS;
    validateDescriptions = mod.validateDescriptions;
  });

  it(`has exactly ${CANONICAL_DESCRIPTION_COUNT} canonical command descriptions`, () => {
    const keys = Object.keys(CANONICAL_DESCRIPTIONS);
    expect(keys).toHaveLength(CANONICAL_DESCRIPTION_COUNT);
  });

  it('contains all expected stage names', () => {
    for (const stage of CANONICAL_DESCRIPTION_NAMES) {
      expect(CANONICAL_DESCRIPTIONS).toHaveProperty(stage);
    }
  });

  it('has no description exceeding 140 chars', () => {
    for (const [name, description] of Object.entries(CANONICAL_DESCRIPTIONS)) {
      expect(
        description.length,
        `Description for '${name}' is ${description.length} chars (max 140)`
      ).toBeLessThanOrEqual(140);
    }
  });

  it('has no empty descriptions', () => {
    for (const [name, description] of Object.entries(CANONICAL_DESCRIPTIONS)) {
      expect(description, `Description for '${name}' is empty`).toBeTruthy();
      expect(description.trim().length, `Description for '${name}' is blank`).toBeGreaterThan(0);
    }
  });

  it('cumulative UTF-8 byte total does not exceed 2048 bytes', () => {
    let totalBytes = 0;
    for (const description of Object.values(CANONICAL_DESCRIPTIONS)) {
      totalBytes += Buffer.byteLength(description, 'utf8');
    }
    expect(totalBytes).toBeLessThanOrEqual(2048);
  });

  it('validateDescriptions() passes without throwing', () => {
    expect(() => validateDescriptions()).not.toThrow();
  });

  it('validateDescriptions() returns correct count and byte total', () => {
    const result = validateDescriptions();
    expect(result.count).toBe(CANONICAL_DESCRIPTION_COUNT);
    expect(result.totalBytes).toBeGreaterThan(0);
    expect(result.totalBytes).toBeLessThanOrEqual(2048);
  });
});
