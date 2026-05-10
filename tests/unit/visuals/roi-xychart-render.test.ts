/**
 * T151 — ROI xychart render test.
 *
 * Verifies the ROI/payback Mermaid xychart-beta block in:
 *   - .specify/templates/visuals/roi-projection.md (the dedicated visual)
 *   - .specify/templates/business-metrics-template.md (the dashboard ROI band)
 *
 * Both templates must:
 *   1. Begin with valid YAML frontmatter (--- delimited).
 *   2. Contain a Mermaid `xychart-beta` block with the syntax markers
 *      `x-axis`, `y-axis`, and at least one of `bar` / `line`.
 *   3. Fit the chart inside a fenced ```mermaid``` block (no orphan code).
 *
 * The xychart-beta block is the FR-025 / NFR-002 anchor for ROI/payback
 * visualisation; if a downstream Mermaid renderer breaks parsing, this
 * test catches the regression.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

const ROI_TEMPLATE = path.join(REPO_ROOT, '.specify/templates/visuals/roi-projection.md');

const BUSINESS_METRICS_TEMPLATE = path.join(
  REPO_ROOT,
  '.specify/templates/business-metrics-template.md'
);

interface FenceCheck {
  fence: string;
  body: string;
}

function extractMermaidBlocks(content: string): FenceCheck[] {
  const re = /```mermaid\s*\n([\s\S]*?)```/g;
  const blocks: FenceCheck[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    blocks.push({ fence: m[0], body: m[1] });
  }
  return blocks;
}

function hasFrontmatter(content: string): boolean {
  if (!content.startsWith('---\n')) return false;
  return content.indexOf('\n---', 4) > 0;
}

describe('ROI xychart render (T151)', () => {
  describe('roi-projection.md (dedicated visual)', () => {
    let content: string;

    beforeAll(async () => {
      const s = await stat(ROI_TEMPLATE);
      expect(s.isFile()).toBe(true);
      content = await readFile(ROI_TEMPLATE, 'utf8');
    });

    it('has valid YAML frontmatter', () => {
      expect(hasFrontmatter(content)).toBe(true);
      const fmEnd = content.indexOf('\n---', 4);
      const fm = content.slice(4, fmEnd);
      expect(fm).toMatch(/^template:\s*roi-projection\s*$/m);
      expect(fm).toMatch(/^version:\s*\d+\.\d+\s*$/m);
    });

    it('contains exactly one Mermaid xychart-beta block', () => {
      const blocks = extractMermaidBlocks(content);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].body).toMatch(/^\s*xychart-beta/m);
    });

    it('xychart-beta block has x-axis, y-axis, and bar or line series', () => {
      const blocks = extractMermaidBlocks(content);
      const body = blocks[0].body;
      expect(body).toMatch(/x-axis/);
      expect(body).toMatch(/y-axis/);
      expect(body).toMatch(/(^|\n)\s*(bar|line)\s+\[/);
    });
  });

  describe('business-metrics-template.md (dashboard ROI band)', () => {
    let content: string;

    beforeAll(async () => {
      const s = await stat(BUSINESS_METRICS_TEMPLATE);
      expect(s.isFile()).toBe(true);
      content = await readFile(BUSINESS_METRICS_TEMPLATE, 'utf8');
    });

    it('has valid YAML frontmatter', () => {
      expect(hasFrontmatter(content)).toBe(true);
    });

    it('contains a Mermaid xychart-beta block (replacing the legacy ASCII bars)', () => {
      const blocks = extractMermaidBlocks(content);
      const xy = blocks.find((b) => /^\s*xychart-beta/m.test(b.body));
      expect(
        xy,
        'business-metrics-template.md is missing a Mermaid xychart-beta block'
      ).toBeDefined();
      if (!xy) return;
      expect(xy.body).toMatch(/x-axis/);
      expect(xy.body).toMatch(/y-axis/);
      expect(xy.body).toMatch(/(^|\n)\s*(bar|line)\s+\[/);
    });

    it('no longer contains the legacy ASCII bar pattern', () => {
      // Legacy pattern was a fenced code block of literal ▓/░ glyphs.
      // We assert the bar glyphs are not used as content (mention in
      // a code block would still be flagged — this is intentional).
      expect(content).not.toMatch(/\[▓+░+\]/);
    });
  });
});
