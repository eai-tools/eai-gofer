/**
 * Verifies the EAI Gofer Claude/Codex/Copilot plugin package.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FULL_COMMAND_COUNT, FULL_COMMAND_FILES } from '../../helpers/goferCommandSet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCRIPT_PATH = path.join(REPO_ROOT, '.specify', 'scripts', 'node', 'package-agent-plugin.mjs');
const VERSION = '3.4.0';

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function walkFiles(root: string): string[] {
  const results: string[] = [];

  function visit(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }

  visit(root);
  return results;
}

describe('EAI Gofer agent plugin package', () => {
  it('packages a zip with Claude, Codex, and Copilot manifests', (): void => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eai-gofer-plugin-'));
    try {
      execFileSync('node', [SCRIPT_PATH, '--version', VERSION, '--out-dir', outDir], {
        cwd: REPO_ROOT,
        stdio: 'pipe',
      });

      const zipPath = path.join(outDir, `eai-gofer-agent-plugin-${VERSION}.zip`);
      const pluginRoot = path.join(outDir, `eai-gofer-agent-plugin-${VERSION}`, 'eai-gofer');
      expect(fs.existsSync(zipPath)).toBe(true);
      expect(fs.existsSync(pluginRoot)).toBe(true);

      const zipListing = execFileSync('unzip', ['-l', zipPath], { encoding: 'utf8' });
      for (const required of [
        'eai-gofer/plugin.json',
        'eai-gofer/.codex-plugin/plugin.json',
        'eai-gofer/.claude-plugin/plugin.json',
        'eai-gofer/.github/plugin/marketplace.json',
        'eai-gofer/README.md',
        'eai-gofer/assets/eai-gofer-icon.png',
      ]) {
        expect(zipListing).toContain(required);
      }

      const copilotManifest = readJson<{ name: string; version: string; skills: string }>(
        path.join(pluginRoot, 'plugin.json')
      );
      const claudeManifest = readJson<{
        name: string;
        version: string;
        skills: string;
        agents?: string;
        commands?: string;
      }>(path.join(pluginRoot, '.claude-plugin', 'plugin.json'));
      const codexManifest = readJson<{ name: string; version: string; skills: string }>(
        path.join(pluginRoot, '.codex-plugin', 'plugin.json')
      );

      for (const manifest of [copilotManifest, claudeManifest, codexManifest]) {
        expect(manifest.name).toBe('eai-gofer');
        expect(manifest.version).toBe(VERSION);
      }
      expect(copilotManifest.skills).toBe('./skills/');
      expect(claudeManifest.skills).toBe('./skills/');
      expect(claudeManifest.agents).toBeUndefined();
      expect(claudeManifest.commands).toBeUndefined();
      expect(codexManifest.skills).toBe('./skills/');

      for (const command of FULL_COMMAND_FILES) {
        expect(fs.existsSync(path.join(pluginRoot, 'commands', `${command}.md`))).toBe(true);
        expect(fs.existsSync(path.join(pluginRoot, 'skills', command, 'SKILL.md'))).toBe(true);
      }
      expect(
        fs
          .readdirSync(path.join(pluginRoot, 'skills'), { withFileTypes: true })
          .filter((entry) => entry.isDirectory()).length
      ).toBe(FULL_COMMAND_COUNT + 1);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('committed repo-local plugin bundle has no personal or private internal paths', (): void => {
    const pluginRoot = path.join(REPO_ROOT, 'plugins', 'eai-gofer');
    const offenders: string[] = [];
    const forbidden = [
      /\/Users\/[^/\s"']+/,
      /[A-Za-z]:\\Users\\/,
      /\bgofer-pro\b/i,
      /\beai-stack\b/i,
      /\beai-internal\b/i,
    ];

    for (const file of walkFiles(pluginRoot)) {
      let content = '';
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }

      if (forbidden.some((pattern) => pattern.test(content))) {
        offenders.push(path.relative(pluginRoot, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('release workflow publishes VSIX and agent plugin assets', (): void => {
    const workflow = fs.readFileSync(
      path.join(REPO_ROOT, '.github', 'workflows', 'release.yml'),
      'utf8'
    );

    expect(workflow).toContain('npm run gofer:package-plugin');
    expect(workflow).toContain('eai-gofer-agent-plugin-${{ steps.version.outputs.version }}.zip');
    expect(workflow).toContain('VSCE_PAT');
    expect(workflow).toContain('vsce publish --packagePath');
    expect(workflow).toContain('softprops/action-gh-release@v2');
  });
});
