import { describe, it, expect } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_PATH = path.join(
  REPO_ROOT,
  '.specify/templates/visuals/bounded-context-template.md'
);

describe('bounded-context-template (T116)', () => {
  it('exists on disk', async () => {
    const s = await stat(TEMPLATE_PATH);
    expect(s.isFile()).toBe(true);
  });

  it('has valid YAML frontmatter', async () => {
    const content = await readFile(TEMPLATE_PATH, 'utf8');
    expect(content.startsWith('---\n')).toBe(true);

    const fmEnd = content.indexOf('\n---', 4);
    expect(fmEnd).toBeGreaterThan(0);

    const frontmatter = content.slice(4, fmEnd);
    expect(frontmatter).toMatch(/^template:\s*\S+/m);
    expect(frontmatter).toMatch(/^version:\s*\d+\.\d+$/m);
  });

  it('contains a Mermaid flowchart block', async () => {
    const content = await readFile(TEMPLATE_PATH, 'utf8');
    expect(content).toMatch(/```mermaid/);
    expect(content).toMatch(/flowchart\s+(TB|TD|LR|RL|BT)/);
  });

  it('contains subgraph declarations', async () => {
    const content = await readFile(TEMPLATE_PATH, 'utf8');
    const subgraphMatches = content.match(/subgraph\s+\w+/g);
    expect(subgraphMatches).not.toBeNull();
    expect(subgraphMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it('has plain-language preamble of ≥30 ≤200 words', async () => {
    const content = await readFile(TEMPLATE_PATH, 'utf8');

    const fmEnd = content.indexOf('\n---', 4);
    const body = content.slice(fmEnd + 4);

    const lines = body.split('\n');
    let preamble = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('<!--')) continue;
      if (trimmed.startsWith('```')) break;
      preamble += ' ' + trimmed;
    }

    const wordCount = preamble.trim().split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeGreaterThanOrEqual(30);
    expect(wordCount).toBeLessThanOrEqual(200);
  });
});
