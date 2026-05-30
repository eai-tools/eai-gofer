import { describe, expect, it } from 'vitest';
import {
  GOFER_EXECUTION_PROFILES,
  classifyGoferImpact,
  formatGoferExecutionProfileFrontmatter,
  validateGoferExecutionProfileContract,
} from '../../../src/services/GoferImpactClassifier.js';

describe('GoferImpactClassifier', () => {
  it('uses fast depth for docs-only work', () => {
    const result = classifyGoferImpact('Update README documentation for installation');

    expect(result.depth).toBe('fast');
    expect(result.effectiveProfile).toBe('fast');
    expect(result.executionProfileDecision.profileFloor).toBe('fast');
    expect(result.labels).toEqual(['docs-only']);
    expect(result.recommendedArtifacts).toContain('research.md');
    expect(result.recommendedArtifacts).not.toContain('blast-radius-report.md');
  });

  it('uses full depth for API contract and security-sensitive work', () => {
    const result = classifyGoferImpact('Change API response schema and auth token validation');

    expect(result.depth).toBe('full');
    expect(result.effectiveProfile).toBe('full');
    expect(result.labels).toEqual(expect.arrayContaining(['api-contract', 'auth-security']));
    expect(result.recommendedArtifacts).toContain('blast-radius-report.md');
    expect(result.recommendedArtifacts).toContain('validation-report.md');
  });

  it('marks unknown work honestly and keeps it on standard until blast radius is known', () => {
    const result = classifyGoferImpact('Make the thing better');

    expect(result.depth).toBe('standard');
    expect(result.confidence).toBe('low');
    expect(result.labels).toEqual(['unknown']);
  });

  it('exposes exactly four MECE execution profiles', () => {
    const prompts = [
      'Update README documentation for installation',
      'Refactor a bounded local helper utility with tests',
      'Add a feature service implementation',
      'Change API response schema and auth token validation',
      'Run a workspace-wide audit with unknown blast radius across every repo',
    ];

    expect(GOFER_EXECUTION_PROFILES).toEqual(['fast', 'standard', 'full', 'dynamic']);

    for (const prompt of prompts) {
      const result = classifyGoferImpact(prompt);
      expect(GOFER_EXECUTION_PROFILES).toContain(result.effectiveProfile);
      expect(result.depth).toBe(result.effectiveProfile);
      expect(result.executionProfileDecision.effectiveProfile).toBe(result.effectiveProfile);
    }
  });

  it('uses dynamic for broad fanout and unknown blast-radius work', () => {
    const result = classifyGoferImpact(
      'Run a workspace-wide sweep with unknown blast radius across every repo'
    );

    expect(result.depth).toBe('dynamic');
    expect(result.labels).toEqual(expect.arrayContaining(['broad-fanout', 'unknown-blast-radius']));
    expect(result.executionProfileDecision.requiresConfirmation).toBe(true);
    expect(result.recommendedArtifacts).toContain('workflow-dag.md');
  });

  it('accepts deeper overrides and blocks risky downshifts without approval', () => {
    const deeper = classifyGoferImpact('Update README documentation', undefined, {
      requestedProfile: 'full',
    });
    const blockedDownshift = classifyGoferImpact('Change API auth contract', undefined, {
      requestedProfile: 'fast',
    });
    const approvedDownshift = classifyGoferImpact('Change API auth contract', undefined, {
      requestedProfile: 'fast',
      approveRiskyDownshift: true,
    });

    expect(deeper.effectiveProfile).toBe('full');
    expect(deeper.executionProfileDecision.overrideStatus).toBe('deeper-accepted');
    expect(blockedDownshift.effectiveProfile).toBe('full');
    expect(blockedDownshift.executionProfileDecision.overrideStatus).toBe(
      'shallower-requires-approval'
    );
    expect(blockedDownshift.executionProfileDecision.requiresConfirmation).toBe(true);
    expect(approvedDownshift.effectiveProfile).toBe('fast');
    expect(approvedDownshift.executionProfileDecision.overrideStatus).toBe('shallower-approved');
  });

  it('formats and validates the execution-profile.md frontmatter contract', () => {
    const result = classifyGoferImpact('Use dynamic mode for a broad fanout migration');
    const frontmatter = formatGoferExecutionProfileFrontmatter(result.executionProfileDecision);

    expect(frontmatter).toContain('classificationVersion: 1');
    expect(frontmatter).toContain('effectiveProfile: dynamic');
    expect(
      validateGoferExecutionProfileContract({
        ...result.executionProfileDecision,
      })
    ).toEqual([]);
    expect(
      validateGoferExecutionProfileContract({
        classificationVersion: 1,
        effectiveProfile: ['dynamic'],
        profileFloor: 'dynamic',
        requestedProfile: null,
        riskLabels: ['unknown-risk'],
        overrideStatus: 'none',
        requiresConfirmation: true,
        classificationReason: '',
      })
    ).toEqual(
      expect.arrayContaining([
        'effectiveProfile must be exactly one execution profile.',
        'riskLabels must be an array of known risk labels.',
        'classificationReason must be a non-empty string.',
      ])
    );
  });
});
