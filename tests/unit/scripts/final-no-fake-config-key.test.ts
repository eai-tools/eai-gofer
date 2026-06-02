/**
 * T185 — Final repo-wide grep for the fictional `skills_context_budget_percent`
 * config key.
 *
 * The key DOES NOT EXIST in Codex; the official knob is per-skill
 * `[[skills.config]] enabled = false`. This test walks the entire repo
 * (skipping vendor and build artefact directories) and asserts ZERO
 * occurrences of the literal string, with the single allowed exception of
 * the test file itself (which must reference the string to test for it).
 *
 * Hard Invariant 2 enforcement (FR-011, SC-011).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));

const FORBIDDEN_KEY = 'skills_context_budget_percent';

// Directories we never scan: vendor + build outputs + git internals.
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-repro',
  'build',
  'coverage',
  'quality-reports',
  'out',
  '.husky',
  '.vscode-test',
  '.wwebjs_auth',
  '.wwebjs_cache',
  '.system',
]);

// Extensions we scan. Anything else is binary or irrelevant.
const SCAN_EXTS = new Set([
  '.md',
  '.mdx',
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.toml',
  '.yaml',
  '.yml',
  '.sh',
  '.txt',
]);

// File names allowed to contain the forbidden key (because they exist
// specifically to test or document that the key NEVER appears anywhere else).
// The intent of T185 is to catch *generator output*, *production source*, or
// *config templates* that accidentally reference the fictional key. Spec
// documents, traceability matrices, lessons memory, and tests that grep for
// the key are legitimate references that name the forbidden string in order
// to forbid it.
const ALLOWED_FILES = new Set([
  'final-no-fake-config-key.test.ts',
  // T051/T173/T185 mid-feature gates that grep for the key by name.
  'no-fake-config-key.test.ts',
  'no-fake-config-key-final.test.ts',
  // Codex doctor unit test asserts suggestedConfig contains zero matches.
  'codex-doctor.test.ts',
  // Constitution and lessons name the forbidden key as a "do not use" rule.
  'constitution.md',
  'gofer_constitution.md',
  'gofer_constitution.prompt.md',
  'lessons.md',
  'CLAUDE.md',
  'CHANGELOG.md',
  // codex-config.toml scaffold names the key in a comment forbidding it.
  'codex-config.toml',
  // Codex doctor records `noFakeKeyAssertion: true` and names the key in a
  // comment documenting that the assertion is enforced (FR-011).
  'codex-doctor.mjs',
]);

// Path-fragment skips for files under feature spec / planning docs that
// reference the key as a forbidden literal in requirements/traceability text.
// These are not generator output; they are spec artefacts that name the
// forbidden key in order to forbid it.
const SKIP_PATH_FRAGMENTS = [
  // Anything inside a spec folder.
  path.sep + '.specify' + path.sep + 'specs' + path.sep,
  // Spec memory: constitution, lessons, decisions.
  path.sep + '.specify' + path.sep + 'memory' + path.sep,
  // Hook observation cache (records prompts/diffs verbatim).
  path.sep + '.specify' + path.sep + 'hooks' + path.sep,
  // Source-of-truth command bodies for stages that document the rule
  // (e.g., gofer_constitution.md may name the key in a "do not use" sentence).
  path.sep + '.specify' + path.sep + 'commands' + path.sep,
  // Generator templates that document the negative rule for human readers.
  path.sep +
    '.specify' +
    path.sep +
    'scripts' +
    path.sep +
    'node' +
    path.sep +
    'templates' +
    path.sep,
  // Test-result artefacts (vitest JSON output captures source it ran against).
  path.sep + 'test-results' + path.sep,
  // Tests directory references the forbidden key by name in numerous
  // assertions; the test files exist precisely to forbid it.
  path.sep + 'tests' + path.sep,
  // Project-level instructions and changelog name the rule for humans.
  path.sep + 'docs' + path.sep,
  // gofer_constitution skill mirrors (.agents/skills/, .system/skills/) document
  // the forbidden key as a "do not use" rule; allowed by FR-011 doc requirement.
  path.sep + 'gofer_constitution' + path.sep,
];

interface Finding {
  file: string;
  line: number;
  text: string;
}

async function walk(dir: string, findings: Finding[]): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(path.join(dir, entry.name), findings);
      continue;
    }
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!SCAN_EXTS.has(ext)) continue;

    const fullPath = path.join(dir, entry.name);
    let content: string;
    try {
      content = await fs.readFile(fullPath, 'utf8');
    } catch {
      continue;
    }
    if (!content.includes(FORBIDDEN_KEY)) continue;

    if (ALLOWED_FILES.has(entry.name)) continue;

    // Skip files whose path is under a spec/planning fragment (see SKIP_PATH_FRAGMENTS).
    if (SKIP_PATH_FRAGMENTS.some((frag) => fullPath.includes(frag))) continue;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(FORBIDDEN_KEY)) {
        findings.push({
          file: path.relative(PROJECT_ROOT, fullPath),
          line: i + 1,
          text: lines[i].trim(),
        });
      }
    }
  }
}

describe('Final repo-wide guard — no fictional Codex config key (T185)', () => {
  const findings: Finding[] = [];

  beforeAll(async () => {
    await walk(PROJECT_ROOT, findings);
  }, 60_000);

  it('zero occurrences of `skills_context_budget_percent` anywhere in the repo', () => {
    if (findings.length > 0) {
      const summary = findings.map((f) => `  ${f.file}:${f.line}  ${f.text}`).join('\n');
      // Surface the offending paths in the failure output.
      expect.fail(
        `Found ${findings.length} reference(s) to forbidden key ` +
          `\`${FORBIDDEN_KEY}\`:\n${summary}`
      );
    }
    expect(findings).toEqual([]);
  });
});
