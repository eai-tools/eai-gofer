import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_PATH = path.join(REPO_ROOT, '.specify/templates/visuals/c4-context-template.md');

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractPreamble(content: string): string {
  // Remove frontmatter
  const fmEnd = content.indexOf('\n---', 4);
  let body = fmEnd > 0 ? content.slice(fmEnd + 4) : content;
  // Strip HTML comments (single- and multi-line) before line-walk.
  body = body.replace(/<!--[\s\S]*?-->/g, '');
  const lines = body.split(/\r?\n/);
  const buffer: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (line.trim().startsWith('#')) continue;
    buffer.push(line);
  }
  const text = buffer.join('\n').trim();
  // First non-empty paragraph block.
  const firstParaMatch = text.split(/\n\s*\n/).find((p) => p.trim().length > 0) ?? '';
  return firstParaMatch.trim();
}

describe('c4-context template (T118 / T127)', () => {
  let content: string;

  beforeAll(async () => {
    content = await readFile(TEMPLATE_PATH, 'utf8');
  });

  it('exists at the expected path', async () => {
    const s = await stat(TEMPLATE_PATH);
    expect(s.isFile()).toBe(true);
  });

  it('starts with valid YAML frontmatter declaring the template', () => {
    expect(content.startsWith('---\n')).toBe(true);
    const fmEnd = content.indexOf('\n---', 4);
    expect(fmEnd).toBeGreaterThan(0);
    const fm = content.slice(4, fmEnd);
    expect(fm).toMatch(/^template:\s*c4-context\s*$/m);
    expect(fm).toMatch(/^version:\s*\d+\.\d+\s*$/m);
    expect(fm).toMatch(/^preamble_min_words:\s*30\s*$/m);
    expect(fm).toMatch(/^preamble_max_words:\s*200\s*$/m);
  });

  it('contains a Mermaid C4Context block', () => {
    expect(content).toMatch(/```mermaid\n[\s\S]*?C4Context[\s\S]*?```/);
  });

  it('declares at least one Person and one System', () => {
    expect(content).toMatch(/Person\(/);
    expect(content).toMatch(/System\(/);
  });

  it('has a plain-language preamble between 30 and 200 words', () => {
    const preamble = extractPreamble(content);
    const words = countWords(preamble);
    expect(preamble.length).toBeGreaterThan(0);
    expect(words).toBeGreaterThanOrEqual(30);
    expect(words).toBeLessThanOrEqual(200);
  });
});
