import { describe, it, expect } from 'vitest';

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

  it('has exactly 16 stage descriptions', () => {
    const keys = Object.keys(CANONICAL_DESCRIPTIONS);
    expect(keys).toHaveLength(16);
  });

  it('contains all expected stage names', () => {
    const expectedStages = [
      '0_business_scenario',
      '0a_problem_validation',
      '1_gofer_research',
      '2_gofer_specify',
      '3_gofer_plan',
      '4_gofer_tasks',
      '5_gofer_implement',
      '6_gofer_validate',
      '6a_gofer_engineering_review',
      '7_gofer_save',
      '7a_stakeholder_comms',
      '8_gofer_resume',
      '9_gofer_tests',
      '10_gofer_cloud',
      'gofer_constitution',
      'gofer_hydrate',
    ];
    for (const stage of expectedStages) {
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
    expect(result.count).toBe(16);
    expect(result.totalBytes).toBeGreaterThan(0);
    expect(result.totalBytes).toBeLessThanOrEqual(2048);
  });
});
