/**
 * T173 — Final assertion that the forbidden Codex config key
 * `skills_context_budget_percent` appears nowhere in any *shipped* artifact.
 *
 * Scope: production artifacts that are emitted to user environments —
 * .claude-plugin/, .gemini/, .agents/, .system/, generated codex-config*.toml,
 * and the generator + doctor scripts (excluding their reference-only
 * assertions of the forbidden literal).
 *
 * Spec/test/observation files that legitimately reference the key by name to
 * assert it as forbidden are NOT in scope (FR-011 documentation requirement).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const FORBIDDEN_KEY = 'skills_context_budget_percent';
const MAX_FILE_BYTES = 1024 * 1024; // 1MB skip threshold

// Production-artifact directories — these MUST NEVER contain the forbidden key.
const SHIPPED_DIRS = ['.claude-plugin', '.gemini', '.agents', '.system'];

// Plus the root-level shipped scaffolds.
const SHIPPED_FILES = ['codex-config.toml', 'AGENTS.md'];

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.cache',
  '.vscode-test',
]);

const SKIP_EXTENSIONS = new Set([
  '.vsix',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.svg',
  '.zip',
  '.tar',
  '.gz',
  '.lock',
  '.tgz',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
]);

function* walk(dir: string): Generator<string> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walk(full);
    } else if (ent.isFile()) {
      yield full;
    }
  }
}

function fileContainsForbidden(file: string): boolean {
  const ext = path.extname(file);
  if (SKIP_EXTENSIONS.has(ext)) return false;
  let content: string;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return false;
  }
  if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) return false;
  return content.includes(FORBIDDEN_KEY);
}

// gofer_constitution skills/prompts legitimately document the forbidden key
// as a "do not use" rule (FR-011 documentation requirement). Excluded from
// the shipped-artifacts assertion below.
const ALLOWED_PATH_FRAGMENTS = [
  path.sep + 'gofer_constitution' + path.sep,
  path.sep + 'gofer_constitution.prompt.md',
  path.sep + 'gofer_constitution.md',
];

describe('no-fake-config-key final grep (T173)', () => {
  it('forbidden key appears in zero shipped artifact directories', (): void => {
    const offenders: string[] = [];
    for (const dir of SHIPPED_DIRS) {
      const abs = path.join(REPO_ROOT, dir);
      if (!fs.existsSync(abs)) continue;
      for (const file of walk(abs)) {
        if (ALLOWED_PATH_FRAGMENTS.some((frag) => file.includes(frag))) continue;
        if (fileContainsForbidden(file)) {
          offenders.push(path.relative(REPO_ROOT, file));
        }
      }
    }
    expect(
      offenders,
      `forbidden key "${FORBIDDEN_KEY}" found in shipped artifact dirs: ${offenders.join(', ')}`
    ).toEqual([]);
  });

  it('forbidden key appears in zero shipped root-level files', (): void => {
    const offenders: string[] = [];
    for (const rel of SHIPPED_FILES) {
      const abs = path.join(REPO_ROOT, rel);
      if (!fs.existsSync(abs)) continue;
      if (fileContainsForbidden(abs)) {
        offenders.push(rel);
      }
    }
    expect(
      offenders,
      `forbidden key "${FORBIDDEN_KEY}" found in shipped root files: ${offenders.join(', ')}`
    ).toEqual([]);
  });

  it('forbidden key appears in zero generator/doctor *runtime* code paths', (): void => {
    // Allow the doctor script to mention the key in a comment (FR-011 docs)
    // but disallow any *runtime use* — i.e., it must not appear in any
    // string literal that is read or written.
    const doctorPath = path.join(REPO_ROOT, '.specify', 'scripts', 'node', 'codex-doctor.mjs');
    if (!fs.existsSync(doctorPath)) return;
    const content = fs.readFileSync(doctorPath, 'utf8');
    // Strip block comments first, then any `// ...` to end-of-line (handles
    // inline comments after code as well as full-line comments).
    const stripped = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Strip // comments — naïve but sufficient for an .mjs without
      // string literals containing `//` at runtime.
      .replace(/\/\/.*$/gm, '');
    expect(stripped).not.toContain(FORBIDDEN_KEY);
  });
});
