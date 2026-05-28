/**
 * T182 — SC coverage traceability test.
 *
 * Parses spec.md to extract every SC-### identifier and asserts each is
 * referenced (case-sensitive) by at least one task in tasks.md.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import {
  TRACEABILITY_SPEC_PATH as SPEC_PATH,
  TRACEABILITY_TASKS_PATH as TASKS_PATH,
} from '../../helpers/traceabilityFixture';

const SC_PATTERN = /\bSC-\d{3}\b/g;

function extractIdentifiers(content: string, pattern: RegExp): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(content)) !== null) {
    found.add(match[0]);
  }
  return Array.from(found).sort();
}

describe('Traceability — SC coverage (T182)', () => {
  let specSCs: string[] = [];
  let tasksContent = '';

  beforeAll(async () => {
    const spec = await fs.readFile(SPEC_PATH, 'utf8');
    tasksContent = await fs.readFile(TASKS_PATH, 'utf8');
    specSCs = extractIdentifiers(spec, SC_PATTERN);
  });

  it('spec.md defines at least one SC', () => {
    expect(specSCs.length).toBeGreaterThan(0);
  });

  it('every SC-### in spec.md is referenced by at least one task in tasks.md', () => {
    const uncovered: string[] = [];
    for (const sc of specSCs) {
      const re = new RegExp(`\\b${sc}\\b`);
      if (!re.test(tasksContent)) {
        uncovered.push(sc);
      }
    }
    expect(uncovered).toEqual([]);
  });
});
