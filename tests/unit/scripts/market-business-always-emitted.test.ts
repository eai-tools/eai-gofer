/**
 * T154 — market-analysis.md and business-analysis.md must always be
 * emitted (FR-035), even when competitiveAnalysisEnabled=false.
 *
 * This is a documentation-presence test: the canonical contract that
 * both artifacts are baseline traceability outputs of `/0a_problem_validation`
 * lives in `.specify/commands/0a_problem_validation.md`. We assert:
 *
 *   1. The stage-command body references both filenames.
 *   2. The body acknowledges the `competitiveAnalysisEnabled=false`
 *      branch and emits a disabled-state notice for market-analysis.
 *   3. Both filenames appear in the artifact list of the "Report and
 *      Continue" closing banner.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const STAGE_FILE = path.join(REPO_ROOT, '.specify/commands/0a_problem_validation.md');

describe('market-analysis & business-analysis always emitted (T154, FR-035)', () => {
  let content: string;

  beforeAll(async () => {
    const s = await stat(STAGE_FILE);
    expect(s.isFile()).toBe(true);
    content = await readFile(STAGE_FILE, 'utf8');
  });

  it('stage-command body references market-analysis.md', () => {
    expect(content).toMatch(/market-analysis\.md/);
  });

  it('stage-command body references business-analysis.md', () => {
    expect(content).toMatch(/business-analysis\.md/);
  });

  it('stage-command acknowledges competitiveAnalysisEnabled=false branch', () => {
    expect(content).toMatch(/competitiveAnalysisEnabled\s*[:=]?\s*false/i);
  });

  it('stage-command emits a disabled-state notice for market-analysis.md', () => {
    // The notice should mention both the disabled state AND the file
    // continues to exist as a baseline artifact.
    expect(content).toMatch(/disabled[\s-]state\s+notice/i);
    // Sanity: the actual notice block exists ("Competitive analysis is disabled").
    expect(content).toMatch(/competitive analysis is disabled/i);
  });

  it('Step 9 banner artifact list includes both files', () => {
    // Locate the banner block.
    const bannerMatch = content.match(/PROBLEM VALIDATED:[\s\S]*?Recommendation:/);
    expect(bannerMatch).not.toBeNull();
    if (!bannerMatch) return;
    const banner = bannerMatch[0];
    expect(banner).toMatch(/market-analysis\.md/);
    expect(banner).toMatch(/business-analysis\.md/);
  });

  it('FR-035 contract: both files are baseline traceability artifacts', () => {
    // The body should describe both as baseline traceability artifacts.
    expect(content).toMatch(/baseline traceability artifact/i);
  });
});
