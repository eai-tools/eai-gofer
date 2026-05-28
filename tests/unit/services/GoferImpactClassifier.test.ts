import { describe, expect, it } from 'vitest';
import { classifyGoferImpact } from '../../../src/services/GoferImpactClassifier.js';

describe('GoferImpactClassifier', () => {
  it('uses fast depth for docs-only work', () => {
    const result = classifyGoferImpact('Update README documentation for installation');

    expect(result.depth).toBe('fast');
    expect(result.labels).toEqual(['docs-only']);
    expect(result.recommendedArtifacts).toContain('research.md');
    expect(result.recommendedArtifacts).not.toContain('blast-radius-report.md');
  });

  it('uses full depth for API contract and security-sensitive work', () => {
    const result = classifyGoferImpact('Change API response schema and auth token validation');

    expect(result.depth).toBe('full');
    expect(result.labels).toEqual(expect.arrayContaining(['api-contract', 'auth-security']));
    expect(result.recommendedArtifacts).toContain('blast-radius-report.md');
    expect(result.recommendedArtifacts).toContain('validation-report.md');
  });

  it('marks unknown work honestly instead of pretending certainty', () => {
    const result = classifyGoferImpact('Make the thing better');

    expect(result.depth).toBe('full');
    expect(result.confidence).toBe('low');
    expect(result.labels).toEqual(['unknown']);
  });
});
