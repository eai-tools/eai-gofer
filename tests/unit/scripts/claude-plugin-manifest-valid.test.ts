/**
 * T166 — Validates .claude-plugin/plugin.json shape.
 *
 *   1. Is valid JSON
 *   2. Has top-level fields: name, version, description, commands
 *   3. Each command has name, description, file
 *   4. All command file paths resolve and exist on disk
 *   5. Each description ≤140 chars
 *   6. Cumulative description bytes ≤2048
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const MANIFEST_PATH = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');
const MANIFEST_DIR = path.dirname(MANIFEST_PATH);

interface Command {
  name: string;
  description: string;
  file: string;
}

interface Manifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  commands: Command[];
  agents?: Array<{ name: string; file: string }>;
}

describe('claude plugin manifest (T166)', () => {
  it('plugin.json exists', (): void => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
  });

  it('plugin.json is valid JSON', (): void => {
    const content = fs.readFileSync(MANIFEST_PATH, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('has top-level fields name, version, description, commands', (): void => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
    expect(manifest.name).toBe('gofer');
    expect(typeof manifest.version).toBe('string');
    expect(typeof manifest.description).toBe('string');
    expect(Array.isArray(manifest.commands)).toBe(true);
    expect(manifest.commands.length).toBe(19);
  });

  it('each command has name, description, file', (): void => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
    for (const cmd of manifest.commands) {
      expect(typeof cmd.name).toBe('string');
      expect(cmd.name.length).toBeGreaterThan(0);
      expect(typeof cmd.description).toBe('string');
      expect(cmd.description.length).toBeGreaterThan(0);
      expect(typeof cmd.file).toBe('string');
      expect(cmd.file.length).toBeGreaterThan(0);
    }
  });

  it('all command file paths resolve to existing source files', (): void => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
    for (const cmd of manifest.commands) {
      const resolved = path.resolve(MANIFEST_DIR, cmd.file);
      expect(
        fs.existsSync(resolved),
        `command '${cmd.name}' file '${cmd.file}' does not exist (resolved to ${resolved})`
      ).toBe(true);
    }
  });

  it('each command description ≤140 chars', (): void => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
    for (const cmd of manifest.commands) {
      expect(
        cmd.description.length,
        `command '${cmd.name}' description has ${cmd.description.length} chars`
      ).toBeLessThanOrEqual(140);
    }
  });

  it('cumulative description bytes ≤2048', (): void => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
    let total = 0;
    for (const cmd of manifest.commands) {
      total += Buffer.byteLength(cmd.description, 'utf8');
    }
    expect(total).toBeLessThanOrEqual(2048);
  });

  it('agent file paths resolve when present', (): void => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
    if (!manifest.agents) return;
    for (const agent of manifest.agents) {
      const resolved = path.resolve(MANIFEST_DIR, agent.file);
      expect(
        fs.existsSync(resolved),
        `agent '${agent.name}' file '${agent.file}' does not exist (resolved to ${resolved})`
      ).toBe(true);
    }
  });
});
