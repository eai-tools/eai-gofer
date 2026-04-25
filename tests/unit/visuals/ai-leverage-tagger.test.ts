import { describe, it, expect, beforeAll } from 'vitest';

const moduleUrl = new URL(
  '../../../.specify/scripts/node/lib/ai-leverage-tagger.mjs',
  import.meta.url
);

const VALID = ['Replace', 'Augment', 'Automate', 'Observe'] as const;
type Verb = (typeof VALID)[number];

describe('AI-leverage tagger (T106)', () => {
  let tagVerb: (s: string) => Verb;
  let validateVerb: (v: string) => true;

  beforeAll(async () => {
    const mod = await import(moduleUrl.href);
    tagVerb = mod.tagVerb;
    validateVerb = mod.validateVerb;
  });

  it('tagVerb always returns one of the 4 valid verbs', () => {
    const samples = [
      'Replace the analyst report with model output',
      'AI assists the developer with code suggestions',
      'Pipeline runs unattended on a nightly cron',
      'Monitor latency and alert on regressions',
      'Something completely unrelated',
      '',
    ];
    for (const s of samples) {
      expect(VALID).toContain(tagVerb(s));
    }
  });

  it('validateVerb accepts all four canonical verbs', () => {
    for (const v of VALID) {
      expect(validateVerb(v)).toBe(true);
    }
  });

  it('validateVerb throws on invalid verbs', () => {
    expect(() => validateVerb('Improve')).toThrow();
    expect(() => validateVerb('replace')).toThrow();
    expect(() => validateVerb('')).toThrow();
    expect(() => validateVerb('REPLACE')).toThrow();
  });

  it('keyword heuristic tags "Replace" steps', () => {
    expect(tagVerb('Replaces the manual triage step')).toBe('Replace');
    expect(tagVerb('Eliminates the spreadsheet step')).toBe('Replace');
  });

  it('keyword heuristic tags "Automate" steps', () => {
    expect(tagVerb('Pipeline runs unattended on schedule')).toBe('Automate');
    expect(tagVerb('Triggered automatically by webhook')).toBe('Automate');
  });

  it('keyword heuristic tags "Observe" steps', () => {
    expect(tagVerb('Monitor anomalies in production logs')).toBe('Observe');
    expect(tagVerb('Detect drift and alert the team')).toBe('Observe');
  });

  it('keyword heuristic tags "Augment" steps', () => {
    expect(tagVerb('Suggest fixes for the developer to accept')).toBe('Augment');
    expect(tagVerb('Co-pilot helps the analyst draft the brief')).toBe('Augment');
  });

  it('defaults to "Augment" when nothing matches', () => {
    expect(tagVerb('Something completely unrelated')).toBe('Augment');
    expect(tagVerb('')).toBe('Augment');
  });
});
