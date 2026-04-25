import { describe, it, expect, beforeAll } from 'vitest';

const moduleUrl = new URL(
  '../../../.specify/scripts/node/lib/mermaid-tabular-fallback.mjs',
  import.meta.url
);

type Fn = (mermaidBlock: string, chartType: string) => string;

describe('tabularFallback (T125 / T126)', () => {
  let tabularFallback: Fn;

  beforeAll(async () => {
    const mod = await import(moduleUrl.href);
    tabularFallback = mod.tabularFallback;
  });

  it('renders a quadrantChart as a markdown table with one row per item', () => {
    const block = [
      '```mermaid',
      'quadrantChart',
      '    title Capability Maturity vs Strategic Value',
      '    x-axis Low Maturity --> High Maturity',
      '    y-axis Low Value --> High Value',
      '    quadrant-1 Strategic Investment',
      '    quadrant-2 Optimize',
      '    quadrant-3 Deprecate',
      '    quadrant-4 Quick Wins',
      '    Billing: [0.7, 0.8]',
      '    Provisioning: [0.3, 0.6]',
      '    Reporting: [0.8, 0.2]',
      '    Audit: [0.2, 0.2]',
      '```',
    ].join('\n');

    const out = tabularFallback(block, 'quadrantChart');

    // Has header
    expect(out).toMatch(/\| Item \| X \| Y \| Quadrant \|/);
    expect(out).toMatch(/\|------\|---\|---\|----------\|/);

    // Each item appears as a row
    expect(out).toContain('| Billing | 0.7 | 0.8 |');
    expect(out).toContain('| Provisioning | 0.3 | 0.6 |');
    expect(out).toContain('| Reporting | 0.8 | 0.2 |');
    expect(out).toContain('| Audit | 0.2 | 0.2 |');

    // Quadrant assignment uses declared names
    expect(out).toContain('Strategic Investment'); // Billing (x≥0.5, y≥0.5)
    expect(out).toContain('Optimize'); // Provisioning (x<0.5, y≥0.5)
    expect(out).toContain('Quick Wins'); // Reporting (x≥0.5, y<0.5)
    expect(out).toContain('Deprecate'); // Audit (x<0.5, y<0.5)
  });

  it('falls back to a rescue source block when input is not a quadrantChart', () => {
    const bogus = 'flowchart LR\n  A --> B';
    const out = tabularFallback(bogus, 'quadrantChart');
    expect(out).toContain('_Diagram unavailable; see source._');
    expect(out).toContain('flowchart LR');
    expect(out).toContain('A --> B');
  });

  it('handles an empty quadrantChart gracefully', () => {
    const block = [
      'quadrantChart',
      '    title Empty',
      '    x-axis Low --> High',
      '    y-axis Low --> High',
      '    quadrant-1 Q1',
      '    quadrant-2 Q2',
      '    quadrant-3 Q3',
      '    quadrant-4 Q4',
    ].join('\n');

    const out = tabularFallback(block, 'quadrantChart');
    expect(out).toMatch(/\| Item \| X \| Y \| Quadrant \|/);
    expect(out).toContain('| _none_ |');
  });

  it('returns rescue block for unsupported chart types', () => {
    const out = tabularFallback('pie title T\n"A" : 1', 'pie' as never);
    expect(out).toContain('_Diagram unavailable; see source._');
  });

  it('returns rescue block for empty input', () => {
    const out = tabularFallback('', 'quadrantChart');
    expect(out).toContain('_Diagram unavailable; see source._');
  });

  it('renders xychart-beta as a two-column table', () => {
    const block = [
      'xychart-beta',
      '    title "Sales"',
      '    x-axis [Jan, Feb, Mar]',
      '    y-axis "Revenue"',
      '    bar [10, 20, 30]',
    ].join('\n');

    const out = tabularFallback(block, 'xychart-beta');
    expect(out).toMatch(/\| X \| Y \|/);
    expect(out).toContain('| Jan | 10 |');
    expect(out).toContain('| Feb | 20 |');
    expect(out).toContain('| Mar | 30 |');
  });

  it('renders C4Context as Element/Type/Description table', () => {
    const block = [
      'C4Context',
      '    title System Context for Foo',
      '    Person(user, "End user")',
      '    System(foo, "Foo system")',
      '    System_Ext(billing, "Billing API")',
      '    Rel(user, foo, "Uses")',
    ].join('\n');

    const out = tabularFallback(block, 'C4Context');
    expect(out).toMatch(/\| Element \| Type \| Description \|/);
    expect(out).toContain('| user | Person | End user |');
    expect(out).toContain('| foo | System | Foo system |');
    expect(out).toContain('| billing | System_Ext | Billing API |');
  });
});
