import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const GENERATOR_PATH = path.join(REPO_ROOT, '.specify', 'scripts', 'node', 'generate-commands.mjs');

describe('generate-commands fail-fast behavior', () => {
  let tmpRoot: string;

  beforeEach(async (): Promise<void> => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'gofer-generator-fail-fast-'));
    await fs.mkdir(path.join(tmpRoot, '.specify', 'commands'), { recursive: true });
    await fs.writeFile(
      path.join(tmpRoot, '.specify', 'commands', 'bad.md'),
      '---\nname: bad\n---\n\n# Bad Command\n',
      'utf8'
    );
  });

  afterEach(async (): Promise<void> => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('exits non-zero when any command file fails to parse', (): void => {
    const result = spawnSync('node', [GENERATOR_PATH, '--dry-run', '--root', tmpRoot], {
      encoding: 'utf8',
    });
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).toBe(1);
    expect(output).toContain('Stage loading failed: Failed to parse 1 command file(s):');
    expect(output).toContain('bad.md:');
    expect(output).toContain("Missing required frontmatter field 'description'");
  });
});
