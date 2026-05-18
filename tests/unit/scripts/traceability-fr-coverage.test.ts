/**
 * T180 — FR coverage traceability test.
 *
 * Parses spec.md to extract every FR-### identifier and asserts each is
 * referenced (case-sensitive) by at least one task in tasks.md.
 *
 * Source-of-truth: spec.md + tasks.md for feature 001-cli-innovations-visuals.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const SPEC_PATH = path.join(
  PROJECT_ROOT,
  '.specify',
  'specs',
  '_archived',
  '001-cli-innovations-visuals',
  'spec.md'
);
const TASKS_PATH = path.join(
  PROJECT_ROOT,
  '.specify',
  'specs',
  '_archived',
  '001-cli-innovations-visuals',
  'tasks.md'
);

const FR_PATTERN = /\bFR-\d{3}\b/g;

/**
 * Returns the unique set of FR-### identifiers that appear as a top-level
 * requirement definition (e.g., "**FR-001 (P1)**:" or "FR-001 —"), not just
 * as a cross-reference. We extract the canonical set from spec.md and require
 * every entry to appear in tasks.md.
 */
function extractIdentifiers(content: string, pattern: RegExp): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  // Reset stateful regex
  pattern.lastIndex = 0;
  while ((match = pattern.exec(content)) !== null) {
    found.add(match[0]);
  }
  return Array.from(found).sort();
}

describe('Traceability — FR coverage (T180)', () => {
  let specFRs: string[] = [];
  let tasksContent = '';

  beforeAll(async () => {
    const spec = await fs.readFile(SPEC_PATH, 'utf8');
    tasksContent = await fs.readFile(TASKS_PATH, 'utf8');
    specFRs = extractIdentifiers(spec, FR_PATTERN);
  });

  it('spec.md defines at least one FR', () => {
    expect(specFRs.length).toBeGreaterThan(0);
  });

  it('every FR-### in spec.md is referenced by at least one task in tasks.md', () => {
    const uncovered: string[] = [];
    for (const fr of specFRs) {
      // Case-sensitive substring check; also require word-boundary so FR-001
      // does not accidentally match FR-0010, etc.
      const re = new RegExp(`\\b${fr}\\b`);
      if (!re.test(tasksContent)) {
        uncovered.push(fr);
      }
    }
    expect(uncovered).toEqual([]);
  });
});
