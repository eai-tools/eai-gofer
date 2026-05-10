import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_PATH = path.join(REPO_ROOT, '.specify/templates/visuals/risk-heatmap-template.md');

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractPreamble(content: string): string {
  const fmEnd = content.indexOf('\n---', 4);
  let body = fmEnd > 0 ? content.slice(fmEnd + 4) : content;
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
  const firstParaMatch = text.split(/\n\s*\n/).find((p) => p.trim().length > 0) ?? '';
  return firstParaMatch.trim();
}

describe('risk-heatmap template (T120 / T129)', () => {
  let content: string;

  beforeAll(async () => {
    content = await readFile(TEMPLATE_PATH, 'utf8');
  });

  it('exists at the expected path', async () => {
    const s = await stat(TEMPLATE_PATH);
    expect(s.isFile()).toBe(true);
  });

  it('starts with valid YAML frontmatter for risk-heatmap', () => {
    expect(content.startsWith('---\n')).toBe(true);
    const fmEnd = content.indexOf('\n---', 4);
    expect(fmEnd).toBeGreaterThan(0);
    const fm = content.slice(4, fmEnd);
    expect(fm).toMatch(/^template:\s*risk-heatmap\s*$/m);
    expect(fm).toMatch(/^version:\s*\d+\.\d+\s*$/m);
    expect(fm).toMatch(/^preamble_min_words:\s*30\s*$/m);
    expect(fm).toMatch(/^preamble_max_words:\s*200\s*$/m);
  });

  it('contains a Mermaid quadrantChart block (likelihood x impact)', () => {
    expect(content).toMatch(/```mermaid\n[\s\S]*?quadrantChart[\s\S]*?```/);
    expect(content).toMatch(/x-axis[^\n]*Likelihood/i);
    expect(content).toMatch(/y-axis[^\n]*Impact/i);
  });

  it('declares all four quadrant labels including a critical-risk quadrant', () => {
    expect(content).toMatch(/quadrant-1\s+Critical Risk/i);
    expect(content).toMatch(/quadrant-2\s+/);
    expect(content).toMatch(/quadrant-3\s+/);
    expect(content).toMatch(/quadrant-4\s+/);
  });

  it('has a Top-Quadrant Summary section', () => {
    expect(content).toMatch(/##\s+Top-Quadrant Summary/);
  });

  it('has a Mitigations table', () => {
    expect(content).toMatch(/##\s+Mitigations/);
    expect(content).toMatch(/\|\s*Risk\s*\|\s*Likelihood\s*\|\s*Impact\s*\|\s*Mitigation\s*\|/i);
  });

  it('has a plain-language preamble between 30 and 200 words', () => {
    const preamble = extractPreamble(content);
    const words = countWords(preamble);
    expect(preamble.length).toBeGreaterThan(0);
    expect(words).toBeGreaterThanOrEqual(30);
    expect(words).toBeLessThanOrEqual(200);
  });
});
