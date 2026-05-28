/**
 * T167 — Validates .gemini/extension.json shape.
 *
 *   1. Is valid JSON
 *   2. Has name, version, commands path
 *   3. The commands path resolves to .gemini/commands/gofer/
 *   4. That directory has the full Gofer command set as .toml files
 *   5. Formerly Claude-only stages are present
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMERLY_CLAUDE_ONLY_STAGES, FULL_COMMAND_COUNT } from '../../helpers/goferCommandSet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const MANIFEST_PATH = path.join(REPO_ROOT, '.gemini', 'extension.json');
const COMMANDS_DIR = path.join(REPO_ROOT, '.gemini', 'commands', 'gofer');
const ROOT_PACKAGE_PATH = path.join(REPO_ROOT, 'package.json');

interface Manifest {
  name: string;
  version: string;
  description?: string;
  commands: string;
  gofer?: {
    bundle_url?: string;
    manifest_url?: string;
    commands_manifest_url?: string;
    download_url?: string;
    latest_download_url?: string;
    vsix_url?: string;
    latest_vsix_url?: string;
  };
}

interface RootPackageJson {
  version: string;
}

function expectedVersion(): string {
  return (JSON.parse(fs.readFileSync(ROOT_PACKAGE_PATH, 'utf8')) as RootPackageJson).version;
}

describe('gemini extension manifest (T167)', () => {
  it('extension.json exists', (): void => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
  });

  it('extension.json is valid JSON', (): void => {
    expect(() => JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))).not.toThrow();
  });

  it('has name, version, commands fields', (): void => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
    expect(manifest.name).toBe('eai-gofer');
    expect(manifest.version).toBe(expectedVersion());
    expect(typeof manifest.commands).toBe('string');
  });

  it('advertises the public Gemini bundle and manifest URLs', (): void => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
    expect(manifest.gofer?.bundle_url).toBe(
      'https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer'
    );
    expect(manifest.gofer?.manifest_url).toBe(
      'https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer/gemini-extension.json'
    );
    expect(manifest.gofer?.commands_manifest_url).toBe(
      'https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer/gemini-commands-manifest.json'
    );
    expect(manifest.gofer?.latest_download_url).toBe(
      'https://eai-tools.github.io/eai-gofer/releases/eai-gofer-agent-plugin-latest.zip'
    );
  });

  it('commands path resolves to .gemini/commands/gofer/', (): void => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
    // Path may be ".gemini/commands/gofer/" or absolute — normalise.
    const resolved = path.resolve(REPO_ROOT, manifest.commands);
    expect(resolved.replace(/\/$/, '')).toBe(COMMANDS_DIR);
  });

  it(`.gemini/commands/gofer/ has exactly ${FULL_COMMAND_COUNT} TOML files`, (): void => {
    expect(fs.existsSync(COMMANDS_DIR)).toBe(true);
    const tomlFiles = fs.readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.toml'));
    expect(tomlFiles.length).toBe(FULL_COMMAND_COUNT);
  });

  it('formerly Claude-only stages are present as TOML files', (): void => {
    for (const stage of FORMERLY_CLAUDE_ONLY_STAGES) {
      const tomlPath = path.join(COMMANDS_DIR, `${stage}.toml`);
      expect(fs.existsSync(tomlPath), `stage '${stage}' must exist`).toBe(true);
    }
  });
});
