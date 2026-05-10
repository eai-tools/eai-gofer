import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const extensionPackageJson = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'extension', 'package.json'), 'utf8')
) as {
  scripts: Record<string, string>;
};

describe('extension packaging script wiring', () => {
  it('prepare-language-server uses the Node-based cross-platform script', () => {
    const script = extensionPackageJson.scripts['prepare-language-server'];
    expect(script).toBe('node scripts/prepare-language-server.mjs');
    expect(script).not.toContain('rm -rf');
    expect(script).not.toContain('cp -r');
  });

  it('prepare-language-server.mjs exists on disk', () => {
    const scriptPath = path.join(REPO_ROOT, 'extension', 'scripts', 'prepare-language-server.mjs');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });
});
