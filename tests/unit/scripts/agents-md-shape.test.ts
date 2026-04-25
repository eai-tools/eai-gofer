/**
 * T168 — Validates AGENTS.md (at repo root) shape.
 *
 *   1. Exists
 *   2. Contains a `## Available stages` section
 *   3. Lists 11 non-claude-only stage descriptions (one ### per stage)
 *   4. Each description ≤140 chars
 *   5. CLAUDE_ONLY_STAGES are NOT mentioned in the stages section
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const AGENTS_MD_PATH = path.join(REPO_ROOT, 'AGENTS.md');

const CLAUDE_ONLY_STAGES = [
  '0_business_scenario',
  'gofer_constitution',
  'gofer_hydrate',
  '7_gofer_save',
  '8_gofer_resume',
];

const NON_CLAUDE_ONLY_STAGES = [
  '0a_problem_validation',
  '1_gofer_research',
  '2_gofer_specify',
  '3_gofer_plan',
  '4_gofer_tasks',
  '5_gofer_implement',
  '6_gofer_validate',
  '6a_gofer_engineering_review',
  '7a_stakeholder_comms',
  '9_gofer_tests',
  '10_gofer_cloud',
];

function extractStagesSection(content: string): string {
  const start = content.indexOf('## Available stages');
  if (start === -1) return '';
  // Section ends at the next `## ` heading at the same level
  const after = content.slice(start);
  const endRel = after.slice(3).search(/\n## /);
  return endRel === -1 ? after : after.slice(0, endRel + 3);
}

describe('AGENTS.md shape (T168)', () => {
  it('AGENTS.md exists at repo root', (): void => {
    expect(fs.existsSync(AGENTS_MD_PATH)).toBe(true);
  });

  it('contains a `## Available stages` section', (): void => {
    const content = fs.readFileSync(AGENTS_MD_PATH, 'utf8');
    expect(content).toContain('## Available stages');
  });

  it('lists exactly 11 non-claude-only stage subsections (### <name>)', (): void => {
    const content = fs.readFileSync(AGENTS_MD_PATH, 'utf8');
    const section = extractStagesSection(content);
    let foundCount = 0;
    for (const stage of NON_CLAUDE_ONLY_STAGES) {
      const re = new RegExp(`^### ${stage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'm');
      if (re.test(section)) foundCount++;
    }
    expect(foundCount).toBe(11);
  });

  it('each stage description in stages section is ≤140 chars', (): void => {
    const content = fs.readFileSync(AGENTS_MD_PATH, 'utf8');
    const section = extractStagesSection(content);
    // Find paragraphs immediately after each `### <name>` heading.
    const blocks = section.split(/^### /m).slice(1);
    for (const block of blocks) {
      const lines = block.split('\n');
      // First line is the stage name, second blank, third is the description.
      const descLine = lines[2] ?? '';
      if (descLine.trim() === '') continue; // tolerate blank-line variations
      expect(
        descLine.length,
        `description "${descLine.slice(0, 60)}..." exceeds 140 chars`
      ).toBeLessThanOrEqual(140);
    }
  });

  it('CLAUDE_ONLY_STAGES are NOT listed in the stages section', (): void => {
    const content = fs.readFileSync(AGENTS_MD_PATH, 'utf8');
    const section = extractStagesSection(content);
    for (const stage of CLAUDE_ONLY_STAGES) {
      const re = new RegExp(`^### ${stage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'm');
      expect(
        re.test(section),
        `claude-only stage '${stage}' must NOT appear as a ### heading in stages section`
      ).toBe(false);
    }
  });
});
