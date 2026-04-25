import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_PATH = path.join(REPO_ROOT, '.specify/templates/visuals/impact-canvas.md');

const moduleUrl = new URL('../../../.specify/scripts/node/lib/render-visual.mjs', import.meta.url);

describe('renderVisual (T102)', () => {
  let renderVisual: (templatePath: string, data: Record<string, unknown>) => Promise<string>;
  let renderString: (input: string, data: Record<string, unknown>) => string;

  beforeAll(async () => {
    const mod = await import(moduleUrl.href);
    renderVisual = mod.renderVisual;
    renderString = mod.renderString;
  });

  it('replaces placeholders correctly', async () => {
    const out = await renderVisual(TEMPLATE_PATH, {
      PASS: 1,
      FEATURE_NAME: 'Test Feature',
      DATE: '2026-04-25',
      PROBLEM_STATEMENT: 'Slow manual report generation.',
      PERSONA_LIST: '- Analyst\n- Manager',
      REPLACE_COUNT: 2,
      AUGMENT_COUNT: 5,
      AUTOMATE_COUNT: 3,
      OBSERVE_COUNT: 1,
      RISK_1: 'Adoption resistance',
      RISK_2: 'Data quality',
      RISK_3: 'Compliance review',
      OUTCOMES: 'Cycle time reduced 60%',
    });

    expect(out).toContain('# Impact Canvas: Test Feature');
    expect(out).toContain('**Date**: 2026-04-25');
    expect(out).toContain('Slow manual report generation.');
    expect(out).toContain('"Replace" : 2');
    expect(out).toContain('"Augment" : 5');
    expect(out).toContain('"Automate" : 3');
    expect(out).toContain('"Observe" : 1');
    expect(out).toContain('1. Adoption resistance');
    expect(out).toContain('Cycle time reduced 60%');
  });

  it('preserves unmatched placeholders', () => {
    const tpl = '# {{TITLE}}\n\nBody: {{BODY}} (missing: {{MISSING}})';
    const out = renderString(tpl, { TITLE: 'Hello', BODY: 'world' });
    expect(out).toBe('# Hello\n\nBody: world (missing: {{MISSING}})');
  });

  it('keeps Mermaid code fence intact after rendering', async () => {
    const out = await renderVisual(TEMPLATE_PATH, {
      REPLACE_COUNT: 1,
      AUGMENT_COUNT: 1,
      AUTOMATE_COUNT: 1,
      OBSERVE_COUNT: 1,
    });
    expect(out).toMatch(/```mermaid\npie title AI-Leverage Verbs/);
    expect(out).toMatch(/```/);
  });

  it('preserves YAML frontmatter', async () => {
    const out = await renderVisual(TEMPLATE_PATH, { PASS: 1 });
    expect(out.startsWith('---\n')).toBe(true);
    expect(out).toMatch(/^template:\s*impact-canvas$/m);
    expect(out).toMatch(/^pass:\s*1$/m);
  });

  it('treats null and undefined as no-substitution', () => {
    const tpl = 'A={{A}} B={{B}} C={{C}}';
    const out = renderString(tpl, { A: 'one', B: null, C: undefined });
    expect(out).toBe('A=one B={{B}} C={{C}}');
  });
});
