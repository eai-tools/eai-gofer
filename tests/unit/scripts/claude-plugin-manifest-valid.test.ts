/**
 * Validates the committed Claude/Copilot plugin metadata shape.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const CLAUDE_MANIFEST_PATH = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');
const CLAUDE_MARKETPLACE_PATH = path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json');
const COPILOT_MANIFEST_PATH = path.join(REPO_ROOT, 'plugin.json');
const COPILOT_MARKETPLACE_PATH = path.join(REPO_ROOT, '.github', 'plugin', 'marketplace.json');

interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: { name: string; url?: string };
  skills: string;
  agents?: string;
  commands?: string;
}

interface Marketplace {
  name: string;
  plugins: Array<{
    name: string;
    source: string;
    version: string;
  }>;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

describe('agent plugin manifests', () => {
  it('Claude plugin manifest exists and uses current metadata schema', (): void => {
    expect(fs.existsSync(CLAUDE_MANIFEST_PATH)).toBe(true);
    const manifest = readJson<PluginManifest>(CLAUDE_MANIFEST_PATH);

    expect(manifest.name).toBe('eai-gofer');
    expect(manifest.version).toBe('3.4.0');
    expect(manifest.author.name).toBe('Enterprise AI Pty Ltd');
    expect(Array.isArray((manifest as unknown as { commands?: unknown }).commands)).toBe(false);
    expect(manifest.skills).toBe('./.agents/skills/');
    expect(manifest.agents).toBeUndefined();
    expect(manifest.commands).toBeUndefined();
  });

  it('Copilot root plugin manifest exists for direct installs', (): void => {
    expect(fs.existsSync(COPILOT_MANIFEST_PATH)).toBe(true);
    const manifest = readJson<PluginManifest>(COPILOT_MANIFEST_PATH);

    expect(manifest.name).toBe('eai-gofer');
    expect(manifest.version).toBe('3.4.0');
    expect(manifest.skills).toBe('./.agents/skills/');
    expect(manifest.agents).toBe('./.claude/agents/');
    expect(manifest.commands).toBe('./.claude/commands/');
  });

  it('Claude and Copilot marketplaces point at the repo-local plugin bundle', (): void => {
    const claudeMarketplace = readJson<Marketplace>(CLAUDE_MARKETPLACE_PATH);
    const copilotMarketplace = readJson<Marketplace>(COPILOT_MARKETPLACE_PATH);

    for (const marketplace of [claudeMarketplace, copilotMarketplace]) {
      expect(marketplace.name).toBe('eai-gofer');
      expect(marketplace.plugins).toHaveLength(1);
      expect(marketplace.plugins[0].name).toBe('eai-gofer');
      expect(marketplace.plugins[0].version).toBe('3.4.0');
      expect(marketplace.plugins[0].source).toBe('./plugins/eai-gofer');
    }
  });
});
