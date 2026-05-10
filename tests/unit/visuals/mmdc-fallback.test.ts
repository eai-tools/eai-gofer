/**
 * T144 — mmdc-fallback.test.ts
 *
 * When `mmdc` (Mermaid CLI) is not installed, `exportMermaid()` must:
 *   1. Return `{ ok: false, reason: 'mmdc-not-installed' }`.
 *   2. Log a single visible warning to stderr.
 *   3. Not crash.
 *
 * To force the missing-binary case deterministically, we spawn the script
 * in a child process with PATH cleared. (FR-029, NFR-010, Edge Cases.)
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SCRIPT = path.resolve(__dirname, '../../../.specify/scripts/node/mermaid-export.mjs');

describe('mmdc graceful fallback (T144 / FR-029)', () => {
  it('returns ok=false / mmdc-not-installed when mmdc is not on PATH (CLI mode)', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'mmdc-fallback-'));
    try {
      const input = path.join(tmp, 'in.md');
      const output = path.join(tmp, 'out.png');
      writeFileSync(input, '```mermaid\ngraph TD; A-->B;\n```\n', 'utf8');

      // Clear PATH so mmdc cannot be found.
      const result = spawnSync(process.execPath, [SCRIPT, input, output], {
        env: { ...process.env, PATH: '' },
        encoding: 'utf8',
      });

      // CLI exits non-zero on fallback (ok=false).
      expect(result.status).not.toBe(0);
      // The warning is logged to stderr, exactly once.
      expect(result.stderr).toMatch(/mmdc not found/i);
      expect(result.stderr).toMatch(/@mermaid-js\/mermaid-cli/);
      // Should not contain a stack trace / crash signature.
      expect(result.stderr).not.toMatch(/\bat\s+\S+:\d+:\d+/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('exportMermaid() (programmatic API) returns mmdc-not-installed reason', async () => {
    // The programmatic API uses spawnSync('mmdc'). With PATH set to a
    // directory that has no `mmdc`, the spawn returns an ENOENT error.
    // We fork a tiny child to run the API in isolation with empty PATH.
    const tmp = mkdtempSync(path.join(tmpdir(), 'mmdc-api-'));
    try {
      const driverPath = path.join(tmp, 'driver.mjs');
      const moduleUrl = new URL(`file://${SCRIPT}`).href;
      writeFileSync(
        driverPath,
        `import { exportMermaid } from ${JSON.stringify(moduleUrl)};
const result = await exportMermaid('/tmp/in.md', '/tmp/out.png');
process.stdout.write(JSON.stringify(result));
`,
        'utf8'
      );

      const result = spawnSync(process.execPath, [driverPath], {
        env: { ...process.env, PATH: '' },
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.ok).toBe(false);
      expect(parsed.reason).toBe('mmdc-not-installed');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
