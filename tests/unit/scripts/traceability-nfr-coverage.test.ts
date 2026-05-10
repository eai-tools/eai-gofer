/**
 * T181 — NFR coverage traceability test.
 *
 * Parses spec.md to extract every NFR-### identifier and asserts each is
 * referenced (case-sensitive) by at least one task in tasks.md.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(new URL('../../../', import.meta.url).pathname);
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

const NFR_PATTERN = /\bNFR-\d{3}\b/g;

function extractIdentifiers(content: string, pattern: RegExp): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(content)) !== null) {
    found.add(match[0]);
  }
  return Array.from(found).sort();
}

describe('Traceability — NFR coverage (T181)', () => {
  let specNFRs: string[] = [];
  let tasksContent = '';

  beforeAll(async () => {
    const spec = await fs.readFile(SPEC_PATH, 'utf8');
    tasksContent = await fs.readFile(TASKS_PATH, 'utf8');
    specNFRs = extractIdentifiers(spec, NFR_PATTERN);
  });

  it('spec.md defines at least one NFR', () => {
    expect(specNFRs.length).toBeGreaterThan(0);
  });

  it('every NFR-### in spec.md is referenced by at least one task in tasks.md', () => {
    const uncovered: string[] = [];
    for (const nfr of specNFRs) {
      const re = new RegExp(`\\b${nfr}\\b`);
      if (!re.test(tasksContent)) {
        uncovered.push(nfr);
      }
    }
    expect(uncovered).toEqual([]);
  });
});
