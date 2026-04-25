/**
 * T053 — Byte-equivalence gate test.
 *
 * For each .specify/commands/<stage>.md file, parse it with parseStageCommand,
 * extract the body, and compare it byte-for-byte to the corresponding golden
 * file at tests/fixtures/golden/claude-commands/<stage>.md.
 *
 * HARD GATE: Phase 1.6, 1.7, and Phase 2 cannot proceed until this passes.
 *
 * Control commands (`gofer_plan`, `gofer_side`, `gofer_personality`) are
 * post-migration additions; they have no golden fixture and are excluded
 * from this byte-equivalence gate. See `numbered-vs-namespaced-parity.test.ts`
 * for the parity / structural assertion that covers them.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Module resolution
// ---------------------------------------------------------------------------

const parseStageCommandUrl = new URL(
  '../../../.specify/scripts/node/parse-stage-command.mjs',
  import.meta.url
);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(new URL('../../../', import.meta.url).pathname);
const SPECIFY_COMMANDS_DIR = path.join(PROJECT_ROOT, '.specify', 'commands');
const GOLDEN_DIR = path.join(PROJECT_ROOT, 'tests', 'fixtures', 'golden', 'claude-commands');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalises the raw body returned by parseStageCommand.
 * The parser includes the newline immediately after the closing --- fence as
 * the first character of the body. The golden files were captured without that
 * leading newline, so we strip exactly one leading \n if present.
 */
function normaliseBody(body: string): string {
  return body.startsWith('\n') ? body.slice(1) : body;
}

/**
 * Produces a minimal diff-friendly error snippet showing the first divergence.
 */
function diffSnippet(body: string, golden: string, stageName: string): string {
  if (body === golden) return '(no diff)';

  const bodyLines = body.split('\n');
  const goldenLines = golden.split('\n');
  const maxLines = Math.max(bodyLines.length, goldenLines.length);

  for (let i = 0; i < maxLines; i++) {
    if (bodyLines[i] !== goldenLines[i]) {
      const lineNum = i + 1;
      const bodyLine = bodyLines[i] ?? '<missing>';
      const goldenLine = goldenLines[i] ?? '<missing>';
      return (
        `Stage '${stageName}': first divergence at line ${lineNum}\n` +
        `  body  : ${JSON.stringify(bodyLine)}\n` +
        `  golden: ${JSON.stringify(goldenLine)}\n` +
        `  body total lines: ${bodyLines.length}, golden total lines: ${goldenLines.length}`
      );
    }
  }

  // Lines match but byte counts differ (e.g. different line endings)
  return (
    `Stage '${stageName}': content differs (byte-level mismatch after line comparison)\n` +
    `  body bytes: ${Buffer.byteLength(body, 'utf8')}\n` +
    `  golden bytes: ${Buffer.byteLength(golden, 'utf8')}`
  );
}

// ---------------------------------------------------------------------------
// Test data loading
// ---------------------------------------------------------------------------

interface StageFixture {
  stageName: string;
  specifyFile: string;
  goldenFile: string;
  body: string;
  goldenContent: string;
}

const fixtures: StageFixture[] = [];

beforeAll(async () => {
  const { parseStageCommand } = (await import(parseStageCommandUrl.href)) as {
    parseStageCommand: (
      filePath: string
    ) => Promise<{ frontmatter: Record<string, unknown>; body: string }>;
  };

  // Post-migration control commands have no golden fixtures (their structure
  // is asserted by numbered-vs-namespaced-parity.test.ts). Skip them here.
  const CONTROL_COMMAND_FILES = new Set(['gofer_plan.md', 'gofer_side.md', 'gofer_personality.md']);

  const entries = await fs.readdir(SPECIFY_COMMANDS_DIR);
  const mdFiles = entries
    .filter((e) => e.endsWith('.md') && e !== '.gitkeep' && !CONTROL_COMMAND_FILES.has(e))
    .sort();

  for (const entry of mdFiles) {
    const stageName = entry.replace(/\.md$/, '');
    const specifyFile = path.join(SPECIFY_COMMANDS_DIR, entry);
    const goldenFile = path.join(GOLDEN_DIR, entry);

    const parsed = await parseStageCommand(specifyFile);
    const body = normaliseBody(parsed.body);
    const goldenContent = await fs.readFile(goldenFile, 'utf8');

    fixtures.push({ stageName, specifyFile, goldenFile, body, goldenContent });
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('byte-equivalence gate (T053)', () => {
  it('loads exactly 16 stage fixtures', () => {
    expect(fixtures).toHaveLength(16);
  });

  it('each .specify/commands/<stage>.md has a matching golden file', () => {
    for (const { stageName, goldenFile } of fixtures) {
      expect(goldenFile, `No golden file path for stage '${stageName}'`).toBeTruthy();
    }
  });

  // Dynamic per-stage byte-equivalence checks
  describe('per-stage body === golden content', () => {
    // We generate the assertions after beforeAll by using a deferred describe
    // populated with the fixture data. Since vitest collects tests synchronously
    // we enumerate the known 16 stage names here and look them up in fixtures.
    const EXPECTED_STAGES = [
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

    for (const stageName of EXPECTED_STAGES) {
      it(`${stageName}: body matches golden byte-for-byte`, () => {
        const fixture = fixtures.find((f) => f.stageName === stageName);
        expect(fixture, `No fixture loaded for stage '${stageName}'`).toBeDefined();
        if (!fixture) return;

        const { body, goldenContent } = fixture;
        expect(body, diffSnippet(body, goldenContent, stageName)).toBe(goldenContent);
      });
    }
  });

  it('UTF-8 byte counts match for all stages', () => {
    for (const { stageName, body, goldenContent } of fixtures) {
      const bodyBytes = Buffer.byteLength(body, 'utf8');
      const goldenBytes = Buffer.byteLength(goldenContent, 'utf8');
      expect(
        bodyBytes,
        `Stage '${stageName}': body is ${bodyBytes} bytes but golden is ${goldenBytes} bytes`
      ).toBe(goldenBytes);
    }
  });
});
