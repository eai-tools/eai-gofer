/**
 * T162 — End-to-end test for Gemini extension shape.
 *
 * Verifies:
 *   1. .gemini/extension.json exists and is valid JSON
 *   2. .gemini/commands/gofer/ contains TOML files
 *   3. Each TOML file has `description = "..."` and a prompt field
 *   4. Number of TOML files = the full Gofer command/helper set
 *   5. Formerly Claude-only stages are present in .gemini/commands/gofer/
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FORMERLY_CLAUDE_ONLY_STAGES,
  FULL_COMMAND_COUNT,
} from '../../helpers/goferCommandSet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const GEMINI_EXTENSION_JSON = path.join(REPO_ROOT, '.gemini', 'extension.json');
const GEMINI_COMMANDS_DIR = path.join(REPO_ROOT, '.gemini', 'commands', 'gofer');

describe('e2e gemini extension shape (T162)', () => {
  it('.gemini/extension.json exists', (): void => {
    expect(fs.existsSync(GEMINI_EXTENSION_JSON)).toBe(true);
  });

  it('.gemini/extension.json is valid JSON', (): void => {
    const content = fs.readFileSync(GEMINI_EXTENSION_JSON, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('.gemini/extension.json has required top-level fields', (): void => {
    const manifest = JSON.parse(fs.readFileSync(GEMINI_EXTENSION_JSON, 'utf8'));
    expect(manifest.name).toBe('gofer');
    expect(typeof manifest.version).toBe('string');
    expect(typeof manifest.description).toBe('string');
    expect(typeof manifest.commands).toBe('string');
  });

  it('.gemini/commands/gofer/ exists and contains TOML files', (): void => {
    expect(fs.existsSync(GEMINI_COMMANDS_DIR)).toBe(true);
    const tomlFiles = fs.readdirSync(GEMINI_COMMANDS_DIR).filter((f) => f.endsWith('.toml'));
    expect(tomlFiles.length).toBeGreaterThan(0);
  });

  it('every TOML file declares description and prompt', (): void => {
    const tomlFiles = fs.readdirSync(GEMINI_COMMANDS_DIR).filter((f) => f.endsWith('.toml'));
    for (const file of tomlFiles) {
      const content = fs.readFileSync(path.join(GEMINI_COMMANDS_DIR, file), 'utf8');
      expect(content, `${file} missing description`).toMatch(/^description\s*=\s*"/m);
      expect(content, `${file} missing prompt`).toMatch(/^prompt\s*=/m);
    }
  });

  it(`emits exactly ${FULL_COMMAND_COUNT} TOML files for the full command set`, (): void => {
    const tomlFiles = fs.readdirSync(GEMINI_COMMANDS_DIR).filter((f) => f.endsWith('.toml'));
    expect(tomlFiles.length).toBe(FULL_COMMAND_COUNT);
  });

  it('formerly Claude-only stages are present as TOML files', (): void => {
    for (const stage of FORMERLY_CLAUDE_ONLY_STAGES) {
      const tomlPath = path.join(GEMINI_COMMANDS_DIR, `${stage}.toml`);
      expect(fs.existsSync(tomlPath), `stage '${stage}' must exist in Gemini commands`).toBe(true);
    }
  });
});
