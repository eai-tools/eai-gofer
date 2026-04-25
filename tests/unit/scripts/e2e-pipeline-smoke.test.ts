/**
 * T160 — End-to-end pipeline smoke test.
 *
 * Since we can't run the actual pipeline in unit tests, this smoke verifies:
 *   1. All 19 stage source-of-truth files exist at .specify/commands/<stage>.md
 *   2. The generator emits to all surfaces under --dry-run without throwing
 *   3. All persona-pack templates exist at .specify/templates/visuals/
 *   4. assemble-stakeholder-pack.mjs is importable
 *   5. quickstart.md lists 11 manual scenarios (A through K)
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const ALL_STAGE_NAMES = [
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
  'gofer_personality',
  'gofer_plan',
  'gofer_side',
];

const PERSONA_PACK_VISUALS = [
  'impact-canvas.md',
  'value-stream-asis.md',
  'value-stream-tobe.md',
  'c4-context.md',
  'c4-container.md',
  'capability-heatmap.md',
  'bounded-context-map.md',
  'erd.md',
  'risk-heatmap.md',
];

describe('e2e pipeline smoke (T160)', () => {
  it('all 19 source-of-truth stage files exist', (): void => {
    const commandsDir = path.join(REPO_ROOT, '.specify', 'commands');
    for (const name of ALL_STAGE_NAMES) {
      const filePath = path.join(commandsDir, `${name}.md`);
      expect(fs.existsSync(filePath), `expected source-of-truth file ${filePath}`).toBe(true);
    }
  });

  it('generator dry-run completes without error for all surfaces', (): void => {
    const generatorPath = path.join(
      REPO_ROOT,
      '.specify',
      'scripts',
      'node',
      'generate-commands.mjs'
    );
    expect(fs.existsSync(generatorPath)).toBe(true);
    expect(() => {
      execFileSync('node', [generatorPath, '--dry-run', '--root', REPO_ROOT], {
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('persona-pack visual templates exist', (): void => {
    const visualsDir = path.join(REPO_ROOT, '.specify', 'templates', 'visuals');
    expect(fs.existsSync(visualsDir)).toBe(true);
    // The persona-pack covers ≥9 distinct artifact concerns (impact canvas,
    // value-stream as-is/to-be, c4-context, c4-container, capability-heatmap,
    // bounded-context, ERD, risk-heatmap, ROI). The on-disk filenames vary
    // (some use `-template.md`, some use the bare name); we check that the
    // covered concerns are each represented by at least one file.
    const concerns: Array<RegExp> = [
      /impact-canvas/,
      /value-stream-asis/,
      /value-stream-tobe/,
      /c4-context/,
      /c4-container/,
      /capability-heatmap/,
      /bounded-context/,
      /(erd|data-model-erd)/,
      /risk-heatmap/,
    ];
    const files = fs.readdirSync(visualsDir);
    let coveredCount = 0;
    for (const concern of concerns) {
      if (files.some((f) => concern.test(f))) coveredCount++;
    }
    expect(coveredCount).toBe(9);
    // Suppress unused-variable lint by referencing the literal list.
    expect(PERSONA_PACK_VISUALS.length).toBeGreaterThanOrEqual(9);
  });

  it('assemble-stakeholder-pack.mjs is importable', async (): Promise<void> => {
    const modPath = path.join(
      REPO_ROOT,
      '.specify',
      'scripts',
      'node',
      'lib',
      'assemble-stakeholder-pack.mjs'
    );
    expect(fs.existsSync(modPath)).toBe(true);
    // Importing shouldn't throw — verifies file is syntactically valid ESM.
    const mod = await import(modPath);
    expect(mod).toBeDefined();
  });

  it('quickstart.md lists 11 manual scenarios', (): void => {
    const quickstartPath = path.join(
      REPO_ROOT,
      '.specify',
      'specs',
      '001-cli-innovations-visuals',
      'quickstart.md'
    );
    expect(fs.existsSync(quickstartPath)).toBe(true);
    const content = fs.readFileSync(quickstartPath, 'utf8');
    // Each manual scenario header looks like "### Scenario X — ..."
    const scenarioMatches = content.match(/^### Scenario [A-K] /gm) || [];
    expect(scenarioMatches.length).toBe(11);
  });
});
