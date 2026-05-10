import { describe, it, expect } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_DIR = path.join(REPO_ROOT, '.specify/templates/visuals');

// Note: c4-context, capability-heatmap, and risk-heatmap have been
// superseded by their `-template.md` variants (which carry the ≥30-word
// preamble required by NFR-010). Their unsuffixed predecessors are
// removed; the seven templates below are still emitted from the
// pre-T118+ batch and remain valid baseline visuals.
const EXPECTED_TEMPLATES = [
  'impact-canvas',
  'c4-container',
  'value-stream-asis',
  'value-stream-tobe',
  'bounded-context-map',
  'erd',
  'roi-projection',
];

describe('visual template syntax (T091-T100)', () => {
  it('expects exactly 7 baseline visual templates after pass-2 consolidation', () => {
    expect(EXPECTED_TEMPLATES).toHaveLength(7);
  });

  describe.each(EXPECTED_TEMPLATES)('%s.md', (slug) => {
    const filePath = path.join(TEMPLATE_DIR, `${slug}.md`);

    it('exists on disk', async () => {
      const s = await stat(filePath);
      expect(s.isFile()).toBe(true);
    });

    it('starts with valid YAML frontmatter (template + version)', async () => {
      const content = await readFile(filePath, 'utf8');
      expect(content.startsWith('---\n')).toBe(true);

      const fmEnd = content.indexOf('\n---', 4);
      expect(fmEnd).toBeGreaterThan(0);
      const frontmatter = content.slice(4, fmEnd);

      const templateMatch = frontmatter.match(/^template:\s*(\S+)/m);
      expect(templateMatch).not.toBeNull();
      expect(templateMatch![1]).toBe(slug);

      const versionMatch = frontmatter.match(/^version:\s*(\S+)/m);
      expect(versionMatch).not.toBeNull();
      expect(versionMatch![1]).toMatch(/^\d+\.\d+$/);
    });

    it('contains a Mermaid code fence', async () => {
      const content = await readFile(filePath, 'utf8');
      expect(content).toMatch(/```mermaid/);
    });
  });
});
