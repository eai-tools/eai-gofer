/**
 * T183 — Acceptance-criteria coverage traceability test.
 *
 * Parses spec.md User Story sections, extracts the count of numbered
 * acceptance scenarios (e.g., "1. **Given**…", "2. **Given**…"), and asserts
 * that every acceptance criterion (US{N} AC-{M}) is referenced by at least
 * one task in tasks.md.
 *
 * Spec format expectation:
 *   ### User Story <N> — <Title>
 *   ...
 *   **Acceptance Scenarios**:
 *
 *   1. **Given** ...
 *   2. **Given** ...
 *
 * Tasks reference them as "US1 AC-1", "US5 AC-3", etc.
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

interface AcceptanceCriterion {
  us: number;
  ac: number;
}

/**
 * Walks spec.md User Story sections. For each "### User Story <N>" block,
 * count the number of numbered scenarios under "**Acceptance Scenarios**:".
 */
function extractAcceptanceCriteria(spec: string): AcceptanceCriterion[] {
  const out: AcceptanceCriterion[] = [];
  // Capture each user-story section: from "### User Story N" to either the
  // next "### " heading or end of doc.
  const usHeadingRe = /^### User Story (\d+)\b/gm;
  const headings: { us: number; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = usHeadingRe.exec(spec)) !== null) {
    headings.push({ us: Number(m[1]), index: m.index });
  }

  for (let i = 0; i < headings.length; i++) {
    const startIdx = headings[i].index;
    const endIdx = i + 1 < headings.length ? headings[i + 1].index : spec.length;
    const section = spec.slice(startIdx, endIdx);

    // Locate the "**Acceptance Scenarios**" sub-heading; everything between it
    // and the next "###" or "---" is the scenario block.
    const accIdx = section.search(/\*\*Acceptance Scenarios\*\*/);
    if (accIdx === -1) continue;
    const acBlock = section.slice(accIdx);

    // Numbered scenario entries: lines starting with "<number>. **Given**" etc.
    const scenarioRe = /^(\d+)\.\s+\*\*Given\*\*/gm;
    let s: RegExpExecArray | null;
    const acNums = new Set<number>();
    while ((s = scenarioRe.exec(acBlock)) !== null) {
      acNums.add(Number(s[1]));
    }

    for (const n of Array.from(acNums).sort((a, b) => a - b)) {
      out.push({ us: headings[i].us, ac: n });
    }
  }

  return out;
}

describe('Traceability — Acceptance criteria coverage (T183)', () => {
  let acceptanceCriteria: AcceptanceCriterion[] = [];
  let tasksContent = '';

  beforeAll(async () => {
    const spec = await fs.readFile(SPEC_PATH, 'utf8');
    tasksContent = await fs.readFile(TASKS_PATH, 'utf8');
    acceptanceCriteria = extractAcceptanceCriteria(spec);
  });

  it('spec.md defines acceptance criteria for at least one user story', () => {
    expect(acceptanceCriteria.length).toBeGreaterThan(0);
  });

  it('every US<N> AC-<M> is referenced by at least one task in tasks.md', () => {
    const uncovered: string[] = [];
    for (const { us, ac } of acceptanceCriteria) {
      // Tasks reference them as "US1 AC-1", "US5 AC-3" etc.
      const ref = `US${us} AC-${ac}`;
      const re = new RegExp(`\\bUS${us}\\s+AC-${ac}\\b`);
      if (!re.test(tasksContent)) {
        uncovered.push(ref);
      }
    }
    expect(uncovered).toEqual([]);
  });
});
