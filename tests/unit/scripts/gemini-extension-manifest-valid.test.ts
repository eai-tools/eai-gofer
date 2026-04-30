/**
 * T167 — Validates .gemini/extension.json shape.
 *
 *   1. Is valid JSON
 *   2. Has name, version, commands path
 *   3. The commands path resolves to .gemini/commands/gofer/
 *   4. That directory has 19 .toml files (full Gofer command set)
 *   5. Formerly Claude-only stages are present
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const MANIFEST_PATH = path.join(REPO_ROOT, '.gemini', 'extension.json');
const COMMANDS_DIR = path.join(REPO_ROOT, '.gemini', 'commands', 'gofer');

const FORMERLY_CLAUDE_ONLY_STAGES = [
  '0_business_scenario',
  'gofer_constitution',
  'gofer_hydrate',
  '7_gofer_save',
  '8_gofer_resume',
];

interface Manifest {
  name: string;
  version: string;
  description?: string;
  commands: string;
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
    expect(manifest.name).toBe('gofer');
    expect(typeof manifest.version).toBe('string');
    expect(typeof manifest.commands).toBe('string');
  });

  it('commands path resolves to .gemini/commands/gofer/', (): void => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
    // Path may be ".gemini/commands/gofer/" or absolute — normalise.
    const resolved = path.resolve(REPO_ROOT, manifest.commands);
    expect(resolved.replace(/\/$/, '')).toBe(COMMANDS_DIR);
  });

  it('.gemini/commands/gofer/ has exactly 19 TOML files', (): void => {
    expect(fs.existsSync(COMMANDS_DIR)).toBe(true);
    const tomlFiles = fs.readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.toml'));
    expect(tomlFiles.length).toBe(19);
  });

  it('formerly Claude-only stages are present as TOML files', (): void => {
    for (const stage of FORMERLY_CLAUDE_ONLY_STAGES) {
      const tomlPath = path.join(COMMANDS_DIR, `${stage}.toml`);
      expect(fs.existsSync(tomlPath), `stage '${stage}' must exist`).toBe(true);
    }
  });
});
