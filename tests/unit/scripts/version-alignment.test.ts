import { describe, expect, it } from 'vitest';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const SCRIPT_URL = pathToFileURL(
  path.join(REPO_ROOT, '.specify/scripts/node/check-version-alignment.mjs')
).href;

describe('check-version-alignment', () => {
  it('reports the committed public Gofer release version consistently', async () => {
    const { checkVersionAlignment } = await import(SCRIPT_URL);

    const result = checkVersionAlignment(REPO_ROOT);

    expect(result.aligned).toBe(true);
    expect(result.expectedVersion).toBe('3.4.5');
    expect(result.versions.map((entry: { path: string }) => entry.path)).toContain(
      '.codex-plugin/plugin.json#gofer.releaseAsset'
    );
  });
});
