import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_PATH = path.join(
  REPO_ROOT,
  '.specify/templates/visuals/capability-heatmap-template.md'
);

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function stripHtmlComments(content: string): string {
  let output = '';
  let index = 0;

  while (index < content.length) {
    const start = content.indexOf('<!--', index);
    if (start === -1) {
      output += content.slice(index);
      break;
    }

    output += content.slice(index, start);
    const end = content.indexOf('-->', start + 4);
    index = end === -1 ? content.length : end + 3;
  }

  return output;
}

function extractPreamble(content: string): string {
  const fmEnd = content.indexOf('\n---', 4);
  let body = fmEnd > 0 ? content.slice(fmEnd + 4) : content;
  body = stripHtmlComments(body);
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
  const firstParaMatch = text.split(/\n\s*\n/).find((p) => p.trim().length > 0) ?? '';
  return firstParaMatch.trim();
}

describe('capability-heatmap template (T119 / T128)', () => {
  let content: string;

  beforeAll(async () => {
    content = await readFile(TEMPLATE_PATH, 'utf8');
  });

  it('exists at the expected path', async () => {
    const s = await stat(TEMPLATE_PATH);
    expect(s.isFile()).toBe(true);
  });

  it('starts with valid YAML frontmatter for capability-heatmap', () => {
    expect(content.startsWith('---\n')).toBe(true);
    const fmEnd = content.indexOf('\n---', 4);
    expect(fmEnd).toBeGreaterThan(0);
    const fm = content.slice(4, fmEnd);
    expect(fm).toMatch(/^template:\s*capability-heatmap\s*$/m);
    expect(fm).toMatch(/^version:\s*\d+\.\d+\s*$/m);
    expect(fm).toMatch(/^preamble_min_words:\s*30\s*$/m);
    expect(fm).toMatch(/^preamble_max_words:\s*200\s*$/m);
  });

  it('contains a Mermaid quadrantChart block', () => {
    expect(content).toMatch(/```mermaid\n[\s\S]*?quadrantChart[\s\S]*?```/);
  });

  it('declares all four quadrant labels', () => {
    expect(content).toMatch(/quadrant-1\s+/);
    expect(content).toMatch(/quadrant-2\s+/);
    expect(content).toMatch(/quadrant-3\s+/);
    expect(content).toMatch(/quadrant-4\s+/);
  });

  it('has a tabular complement section listing capability + action', () => {
    expect(content).toMatch(/\|\s*Capability\s*\|\s*Action\s*\|/i);
    // Action legend describes touch/extend/replace
    expect(content).toMatch(/touch/i);
    expect(content).toMatch(/extend/i);
    expect(content).toMatch(/replace/i);
  });

  it('has a plain-language preamble between 30 and 200 words', () => {
    const preamble = extractPreamble(content);
    const words = countWords(preamble);
    expect(preamble.length).toBeGreaterThan(0);
    expect(words).toBeGreaterThanOrEqual(30);
    expect(words).toBeLessThanOrEqual(200);
  });
});
