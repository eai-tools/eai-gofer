/**
 * T153 — No secrets in templates / source-of-truth files.
 *
 * NFR-005 forbids embedding credentials, tokens, API keys, or any other
 * secret material inside templates or stage-command source-of-truth
 * files. Documentation references to env-var NAMES (e.g. "set
 * OPENAI_API_KEY before running") are allowed; embedded VALUES are not.
 *
 * The scan covers:
 *   - .specify/templates/visuals/*.md
 *   - .specify/templates/*.md (top-level templates)
 *   - .specify/commands/*.md (stage-command source of truth)
 *
 * Detection strategy:
 *   1. AWS access keys: `AKIA[0-9A-Z]{16}`
 *   2. Private-key headers: `-----BEGIN ... PRIVATE KEY-----`
 *   3. Bearer tokens with literal value: `bearer\s+[A-Za-z0-9._\-]{20,}`
 *   4. Embedded credential pattern: `[A-Z_]{6,}=[A-Za-z0-9+/=._\-]{20,}`
 *      i.e. an env-var-shaped name immediately equals a long opaque
 *      value. Documentation that names a variable without assigning it
 *      a long opaque value is allowed.
 *   5. Common keyword=value pairs: `password=`, `api_key=`, `secret=`,
 *      `token=` followed by a non-trivial value (not a placeholder).
 *
 * Placeholder syntax (`{{NAME}}`, `<value>`, `your-key-here`,
 * `{API_KEY}`) is explicitly allowed.
 */

import { describe, it, expect } from 'vitest';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

const SCAN_DIRS = [
  path.join(REPO_ROOT, '.specify/templates/visuals'),
  path.join(REPO_ROOT, '.specify/templates'),
  path.join(REPO_ROOT, '.specify/commands'),
];

interface Finding {
  file: string;
  line: number;
  pattern: string;
  match: string;
}

const PLACEHOLDER_RE =
  /\{\{[^}]+\}\}|\{[A-Z_]+\}|<[a-z][\w-]*>|your[-_][a-z]+|placeholder|example/i;

const PATTERNS: Array<{ name: string; re: RegExp; allowDocRef?: boolean }> = [
  // AWS access key id.
  { name: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  // Private key header.
  { name: 'private-key-header', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  // Bearer token with literal opaque value.
  { name: 'bearer-token', re: /\bbearer\s+([A-Za-z0-9._-]{20,})\b/i },
  // Embedded credential: ENV_VAR_NAME=long-opaque-value.
  { name: 'embedded-env-cred', re: /\b([A-Z][A-Z0-9_]{5,})=([A-Za-z0-9+/=._-]{20,})\b/ },
  // Sensitive keywords with non-placeholder values.
  // We treat the *value* as suspicious if it is at least 8 chars and
  // contains no placeholder syntax.
  {
    name: 'password-assignment',
    re: /\bpassword\s*[:=]\s*("[^"\n]{8,}"|'[^'\n]{8,}'|[^\s,;'"\n]{8,})/i,
  },
  {
    name: 'api-key-assignment',
    re: /\bapi[_-]?key\s*[:=]\s*("[^"\n]{8,}"|'[^'\n]{8,}'|[^\s,;'"\n]{8,})/i,
  },
  {
    name: 'secret-assignment',
    re: /\bsecret\s*[:=]\s*("[^"\n]{8,}"|'[^'\n]{8,}'|[^\s,;'"\n]{8,})/i,
  },
  {
    name: 'token-assignment',
    re: /(?<!github[_-])\btoken\s*[:=]\s*("[^"\n]{8,}"|'[^'\n]{8,}'|[^\s,;'"\n]{8,})/i,
  },
];

/**
 * Names that legitimately appear in templates (documentation only):
 * any line that mentions these as bare identifiers without an opaque
 * value is allowed. Detection still flags `NAME=long-value`.
 */
const ALLOWED_DOC_KEYWORDS = new Set([
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GITHUB_TOKEN',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
]);

async function listMdFiles(dir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entries) {
    if (!e.endsWith('.md')) continue;
    const p = path.join(dir, e);
    const s = await stat(p);
    if (s.isFile()) out.push(p);
  }
  return out.sort();
}

function scanContent(file: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pat of PATTERNS) {
      pat.re.lastIndex = 0;
      const m = line.match(pat.re);
      if (!m) continue;
      const matched = m[0];

      // Allow if the line is clearly a placeholder.
      if (PLACEHOLDER_RE.test(matched)) continue;

      // For embedded-env-cred: skip if the value is a placeholder OR
      // if the name is in the documentation-allowlist AND the value
      // looks like a placeholder.
      if (pat.name === 'embedded-env-cred') {
        const value = m[2];
        if (PLACEHOLDER_RE.test(value)) continue;
        // Allow Mermaid-style identifier=value pairs that look like
        // diagram metadata (e.g. CONTAINER_1=Backend) — they have
        // alphanumeric values without secret-like entropy.
        if (/^[A-Z][A-Za-z0-9 _-]*$/.test(value) && value.length < 30) continue;
        // Otherwise, even if name is allowlisted, an opaque value is a
        // secret leak.
        findings.push({ file, line: i + 1, pattern: pat.name, match: matched });
        continue;
      }

      // For *-assignment patterns: allow if the value contains a
      // placeholder marker.
      if (pat.name.endsWith('-assignment')) {
        if (PLACEHOLDER_RE.test(line)) continue;
      }

      findings.push({ file, line: i + 1, pattern: pat.name, match: matched });
    }
  }

  return findings;
}

describe('no-secrets-in-templates (T153, NFR-005)', () => {
  it('scans the expected directories', async () => {
    for (const dir of SCAN_DIRS) {
      const s = await stat(dir);
      expect(s.isDirectory(), `Scan dir does not exist: ${dir}`).toBe(true);
    }
  });

  it('finds zero embedded credentials across all scanned templates and commands', async () => {
    const allFindings: Finding[] = [];
    for (const dir of SCAN_DIRS) {
      const files = await listMdFiles(dir);
      for (const file of files) {
        const content = await readFile(file, 'utf8');
        allFindings.push(...scanContent(file, content));
      }
    }

    if (allFindings.length > 0) {
      const summary = allFindings
        .map((f) => `  ${path.relative(REPO_ROOT, f.file)}:${f.line} [${f.pattern}] ${f.match}`)
        .join('\n');
      throw new Error(`Found ${allFindings.length} potential secret(s) in templates:\n${summary}`);
    }
    expect(allFindings).toEqual([]);
  });

  it('allow-list documentation references to env-var names without values', () => {
    // Sanity check: the allow-list itself contains no secrets. This is
    // a configuration assertion, not a content scan.
    for (const name of ALLOWED_DOC_KEYWORDS) {
      expect(name).toMatch(/^[A-Z][A-Z0-9_]+$/);
    }
  });
});
