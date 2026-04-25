/**
 * T155 — Offline operation invariant (NFR-009).
 *
 * Phase 1 + Phase 2 of the Gofer pipeline must work fully offline.
 * The generator, stage-command parser, codex-doctor, and every visual
 * library module must NOT make network calls of any kind.
 *
 * This test enforces that constraint at the source level by scanning
 * each file for forbidden APIs and imports:
 *
 *   - `fetch(`            (browser/node global)
 *   - `http.request(`     (node http module)
 *   - `https.request(`    (node https module)
 *   - `node-fetch`        (npm)
 *   - `axios`             (npm)
 *   - `got`               (npm)
 *   - `undici`            (npm; modern node http)
 *   - `request(`          (legacy npm `request` module)
 *
 * We strip line comments (`// ...`) and block comments (slash-star)
 * before scanning so documentation references are allowed. String
 * literals embedded inside comments are stripped together with the
 * comment text. Plain string literals OUTSIDE comments that contain
 * the keyword are flagged conservatively, because there's no safe
 * pattern that distinguishes a benign string from a runtime endpoint.
 */

import { describe, it, expect } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

const TARGET_FILES = [
  '.specify/scripts/node/generate-commands.mjs',
  '.specify/scripts/node/parse-stage-command.mjs',
  '.specify/scripts/node/codex-doctor.mjs',
  '.specify/scripts/node/lib/ai-leverage-tagger.mjs',
  '.specify/scripts/node/lib/assemble-stakeholder-pack.mjs',
  '.specify/scripts/node/lib/marp-deck.mjs',
  '.specify/scripts/node/lib/mermaid-tabular-fallback.mjs',
  '.specify/scripts/node/lib/render-visual.mjs',
  '.specify/scripts/node/lib/validate-aliases.mjs',
  '.specify/scripts/node/lib/visual-counts.mjs',
  '.specify/scripts/node/lib/visual-pass-pipeline.mjs',
].map((p) => path.join(REPO_ROOT, p));

interface ForbiddenPattern {
  name: string;
  re: RegExp;
}

const FORBIDDEN: ForbiddenPattern[] = [
  { name: 'fetch-call', re: /\bfetch\s*\(/ },
  { name: 'http.request', re: /\bhttp\.request\s*\(/ },
  { name: 'https.request', re: /\bhttps\.request\s*\(/ },
  { name: 'http.get', re: /\bhttp\.get\s*\(/ },
  { name: 'https.get', re: /\bhttps\.get\s*\(/ },
  { name: 'node-fetch import', re: /(from|require\s*\()\s*['"]node-fetch['"]/ },
  { name: 'axios import', re: /(from|require\s*\()\s*['"]axios['"]/ },
  { name: 'got import', re: /(from|require\s*\()\s*['"]got['"]/ },
  { name: 'undici import', re: /(from|require\s*\()\s*['"]undici['"]/ },
  { name: 'request import', re: /(from|require\s*\()\s*['"]request['"]/ },
];

/**
 * Strip line- and block-comments from a source string. Preserves line
 * positions so reported line numbers match the original file.
 */
function stripComments(src: string): string {
  // Remove /* ... */ block comments (replace with spaces, preserving newlines).
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  // Remove `//` line comments (preserve newlines).
  out = out.replace(
    /(^|[^:\\])\/\/[^\n]*/g,
    (m, lead) => lead + ' '.repeat(m.length - lead.length)
  );
  return out;
}

interface Hit {
  file: string;
  line: number;
  pattern: string;
  match: string;
}

function scanFile(filePath: string, content: string): Hit[] {
  const stripped = stripComments(content);
  const hits: Hit[] = [];
  const lines = stripped.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const pat of FORBIDDEN) {
      const m = lines[i].match(pat.re);
      if (m) {
        hits.push({ file: filePath, line: i + 1, pattern: pat.name, match: m[0] });
      }
    }
  }
  return hits;
}

describe('offline-operation invariant (T155, NFR-009)', () => {
  it('all target files exist on disk', async () => {
    for (const f of TARGET_FILES) {
      const s = await stat(f);
      expect(s.isFile(), `Target file missing: ${f}`).toBe(true);
    }
  });

  it('no target file imports or invokes a network API', async () => {
    const allHits: Hit[] = [];
    for (const file of TARGET_FILES) {
      const content = await readFile(file, 'utf8');
      allHits.push(...scanFile(file, content));
    }

    if (allHits.length > 0) {
      const summary = allHits
        .map((h) => `  ${path.relative(REPO_ROOT, h.file)}:${h.line} [${h.pattern}] ${h.match}`)
        .join('\n');
      throw new Error(
        `Found ${allHits.length} forbidden network API reference(s):\n${summary}\n` +
          `Phase 1/2 must operate fully offline (NFR-009).`
      );
    }
    expect(allHits).toEqual([]);
  });

  describe('per-file scan', () => {
    for (const file of TARGET_FILES) {
      const rel = path.relative(REPO_ROOT, file);
      it(`${rel} contains no network API references`, async () => {
        const content = await readFile(file, 'utf8');
        const hits = scanFile(file, content);
        expect(
          hits,
          `Network API found in ${rel}: ${hits.map((h) => `${h.pattern}@${h.line}`).join(', ')}`
        ).toEqual([]);
      });
    }
  });

  it('comments are allowed to mention network API names', () => {
    // Sanity: the stripper actually removes comment text.
    const sample = "// fetch('https://x') is forbidden\nconst y = 1;";
    const stripped = stripComments(sample);
    expect(/\bfetch\s*\(/.test(stripped)).toBe(false);
  });
});
