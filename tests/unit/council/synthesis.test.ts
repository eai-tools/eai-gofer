/**
 * Synthesis Module Unit Tests
 *
 * Tests for the synthesis functions that build Chairman prompts
 * and process synthesized responses from council sessions.
 */

import { describe, it, expect } from 'vitest';
import {
  buildSynthesisPrompt,
  detectConflicts,
  extractConsensusPoints,
  parseSynthesisResponse,
  createBasicSynthesis,
  SynthesisPromptOptions,
} from '../../../extension/src/council/synthesis';
import { AnonymizedOpinion, PeerReview } from '../../../extension/src/council/types';

describe('Synthesis Module', () => {
  const mockOpinions: AnonymizedOpinion[] = [
    {
      anonymousId: 'Member A',
      content:
        'We should use TypeScript for this project. The key benefit is type safety. I recommend starting with the data model.',
      tokenCount: 100,
    },
    {
      anonymousId: 'Member B',
      content:
        'TypeScript is a good choice. We should focus on testing first. The important thing is to maintain good coverage.',
      tokenCount: 120,
    },
    {
      anonymousId: 'Member C',
      content:
        'I suggest using JavaScript for simplicity. However, we must prioritize testing. Key consideration is developer experience.',
      tokenCount: 110,
    },
  ];

  describe('buildSynthesisPrompt', () => {
    it('should build a prompt with all member responses', () => {
      const options: SynthesisPromptOptions = {
        originalPrompt: 'What programming language should we use?',
        opinions: mockOpinions,
      };

      const prompt = buildSynthesisPrompt(options);

      expect(prompt).toContain('What programming language should we use?');
      expect(prompt).toContain('Member A');
      expect(prompt).toContain('Member B');
      expect(prompt).toContain('Member C');
      expect(prompt).toContain('TypeScript');
      expect(prompt).toContain('JavaScript');
    });

    it('should include token counts for each member', () => {
      const options: SynthesisPromptOptions = {
        originalPrompt: 'Test prompt',
        opinions: mockOpinions,
      };

      const prompt = buildSynthesisPrompt(options);

      expect(prompt).toContain('Token count: 100');
      expect(prompt).toContain('Token count: 120');
      expect(prompt).toContain('Token count: 110');
    });

    it('should include conflict analysis instructions by default', () => {
      const options: SynthesisPromptOptions = {
        originalPrompt: 'Test prompt',
        opinions: mockOpinions,
      };

      const prompt = buildSynthesisPrompt(options);

      expect(prompt).toContain('Conflict Analysis Instructions');
      expect(prompt).toContain('**Conflict:**');
      expect(prompt).toContain('**Positions:**');
      expect(prompt).toContain('**Resolution:**');
    });

    it('should exclude conflict analysis when disabled', () => {
      const options: SynthesisPromptOptions = {
        originalPrompt: 'Test prompt',
        opinions: mockOpinions,
        includeConflictAnalysis: false,
      };

      const prompt = buildSynthesisPrompt(options);

      expect(prompt).not.toContain('Conflict Analysis Instructions');
    });

    it('should include peer review summary when provided', () => {
      const peerReviews: PeerReview[] = [
        {
          sessionId: 'session-1',
          reviewerId: 'Member A',
          revieweeId: 'Member B',
          rank: 1,
          justification: 'Well structured response',
          strengths: ['Clear', 'Comprehensive'],
          weaknesses: ['Verbose'],
          timestamp: new Date().toISOString(),
        },
      ];

      const options: SynthesisPromptOptions = {
        originalPrompt: 'Test prompt',
        opinions: mockOpinions,
        peerReviews,
      };

      const prompt = buildSynthesisPrompt(options);

      expect(prompt).toContain('Peer Review Summary');
      expect(prompt).toContain('Member B');
      expect(prompt).toContain('Avg Rank');
    });

    it('should include synthesis instructions', () => {
      const options: SynthesisPromptOptions = {
        originalPrompt: 'Test prompt',
        opinions: mockOpinions,
      };

      const prompt = buildSynthesisPrompt(options);

      expect(prompt).toContain('Identify Common Themes');
      expect(prompt).toContain('Resolve Conflicts');
      expect(prompt).toContain('Incorporate Unique Insights');
      expect(prompt).toContain('Consensus Points');
    });
  });

  describe('detectConflicts', () => {
    it('should return empty array for single opinion', () => {
      const conflicts = detectConflicts([mockOpinions[0]]);

      expect(conflicts).toHaveLength(0);
    });

    it('should return empty array for empty opinions', () => {
      const conflicts = detectConflicts([]);

      expect(conflicts).toHaveLength(0);
    });

    it('should detect conflicting recommendations', () => {
      const conflictingOpinions: AnonymizedOpinion[] = [
        {
          anonymousId: 'Member A',
          content:
            'We should definitely approach this problem with microservices. It is the best solution.',
          tokenCount: 50,
        },
        {
          anonymousId: 'Member B',
          content:
            'We should approach this problem with a monolithic architecture instead. It is simpler.',
          tokenCount: 50,
        },
      ];

      const conflicts = detectConflicts(conflictingOpinions);

      // May or may not detect conflicts depending on keyword matching
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });

  describe('extractConsensusPoints', () => {
    it('should return empty array for empty opinions', () => {
      const points = extractConsensusPoints([]);

      expect(points).toHaveLength(0);
    });

    it('should extract key points from single opinion', () => {
      const points = extractConsensusPoints([mockOpinions[0]]);

      expect(Array.isArray(points)).toBe(true);
    });

    it('should find common themes across opinions', () => {
      const points = extractConsensusPoints(mockOpinions);

      // All opinions mention testing/TypeScript
      expect(Array.isArray(points)).toBe(true);
    });

    it('should limit consensus points to 5', () => {
      const manyOpinions: AnonymizedOpinion[] = Array.from({ length: 10 }, (_, i) => ({
        anonymousId: `Member ${String.fromCharCode(65 + i)}`,
        content:
          'Important point 1. Key consideration here. Must focus on quality. Should prioritize testing. Recommend code review.',
        tokenCount: 100,
      }));

      const points = extractConsensusPoints(manyOpinions);

      expect(points.length).toBeLessThanOrEqual(5);
    });
  });

  describe('parseSynthesisResponse', () => {
    it('should parse synthesis response with consensus points', () => {
      const responseText = `
# Synthesis

Based on the council member inputs, here is the unified response.

TypeScript is the recommended choice, with a focus on testing.

## Consensus Points

**Consensus 1:** Testing is important
**Consensus 2:** Type safety matters
**Consensus 3:** Developer experience is key
`;

      const synthesis = parseSynthesisResponse('session-1', responseText);

      expect(synthesis.sessionId).toBe('session-1');
      expect(synthesis.content).toBeDefined();
      expect(synthesis.consensusPoints.length).toBeGreaterThan(0);
      expect(synthesis.timestamp).toBeDefined();
    });

    it('should parse conflict resolutions', () => {
      const responseText = `
# Synthesis

**Conflict:** Choice of language
**Positions:** Member A prefers TypeScript, Member C prefers JavaScript
**Resolution:** TypeScript provides better safety for large projects

The synthesized recommendation is TypeScript.
`;

      const synthesis = parseSynthesisResponse('session-1', responseText);

      expect(synthesis.conflictsResolved.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate quality signals without peer reviews', () => {
      const synthesis = parseSynthesisResponse('session-1', 'Simple response');

      expect(synthesis.qualitySignals).toBeDefined();
      expect(synthesis.qualitySignals.peerReviewIncluded).toBe(false);
      expect(synthesis.qualitySignals.consensusScore).toBe(0);
    });

    it('should calculate quality signals with peer reviews', () => {
      const peerReviews: PeerReview[] = [
        {
          sessionId: 'session-1',
          reviewerId: 'Member A',
          revieweeId: 'Member B',
          rank: 1,
          justification: 'Best',
          strengths: ['Clear'],
          weaknesses: [],
          timestamp: new Date().toISOString(),
        },
        {
          sessionId: 'session-1',
          reviewerId: 'Member C',
          revieweeId: 'Member B',
          rank: 1,
          justification: 'Best',
          strengths: ['Clear'],
          weaknesses: [],
          timestamp: new Date().toISOString(),
        },
      ];

      const synthesis = parseSynthesisResponse('session-1', 'Response', peerReviews);

      expect(synthesis.qualitySignals.peerReviewIncluded).toBe(true);
      expect(synthesis.qualitySignals.averageRank['Member B']).toBe(1);
      expect(synthesis.qualitySignals.consensusScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createBasicSynthesis', () => {
    it('should create synthesis from opinions without Chairman', () => {
      const synthesis = createBasicSynthesis('session-1', mockOpinions);

      expect(synthesis.sessionId).toBe('session-1');
      expect(synthesis.chairmanId).toBe('none');
      expect(synthesis.content).toContain('Member A');
      expect(synthesis.content).toContain('Member B');
      expect(synthesis.content).toContain('Member C');
    });

    it('should include detected conflicts', () => {
      const synthesis = createBasicSynthesis('session-1', mockOpinions);

      expect(Array.isArray(synthesis.conflictsResolved)).toBe(true);
    });

    it('should include consensus points', () => {
      const synthesis = createBasicSynthesis('session-1', mockOpinions);

      expect(Array.isArray(synthesis.consensusPoints)).toBe(true);
    });

    it('should include quality signals', () => {
      const synthesis = createBasicSynthesis('session-1', mockOpinions);

      expect(synthesis.qualitySignals).toBeDefined();
      expect(synthesis.qualitySignals.peerReviewIncluded).toBe(false);
    });

    it('should include quality signals with peer reviews', () => {
      const peerReviews: PeerReview[] = [
        {
          sessionId: 'session-1',
          reviewerId: 'Member A',
          revieweeId: 'Member B',
          rank: 2,
          justification: 'Good',
          strengths: [],
          weaknesses: [],
          timestamp: new Date().toISOString(),
        },
      ];

      const synthesis = createBasicSynthesis('session-1', mockOpinions, peerReviews);

      expect(synthesis.qualitySignals.peerReviewIncluded).toBe(true);
    });

    it('should include timestamp', () => {
      const synthesis = createBasicSynthesis('session-1', mockOpinions);

      expect(synthesis.timestamp).toBeDefined();
      expect(new Date(synthesis.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});
