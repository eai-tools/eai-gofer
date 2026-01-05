/**
 * Peer Review Module Unit Tests
 *
 * Tests for the peer review functions that enable council members
 * to review and rank each other's responses anonymously.
 */

import { describe, it, expect } from 'vitest';
import {
  buildPeerReviewPrompt,
  parsePeerReview,
  calculateQualitySignalsFromReviews,
  getOpinionsToReview,
  canPerformPeerReview,
  summarizePeerReviews,
  PeerReviewPromptOptions,
} from '../../../extension/src/council/peerReview';
import { AnonymizedOpinion, PeerReview } from '../../../extension/src/council/types';

describe('Peer Review Module', () => {
  const mockOpinions: AnonymizedOpinion[] = [
    {
      anonymousId: 'Member A',
      content: 'We should use TypeScript for this project due to type safety benefits.',
      tokenCount: 100,
    },
    {
      anonymousId: 'Member B',
      content: 'TypeScript is good. Focus on testing first with comprehensive coverage.',
      tokenCount: 120,
    },
    {
      anonymousId: 'Member C',
      content: 'JavaScript for simplicity. Prioritize developer experience.',
      tokenCount: 110,
    },
  ];

  describe('buildPeerReviewPrompt', () => {
    it('should build a prompt with all member responses to review', () => {
      const options: PeerReviewPromptOptions = {
        originalPrompt: 'What programming language should we use?',
        reviewerId: 'Member A',
        opinionsToReview: [mockOpinions[1], mockOpinions[2]], // Exclude Member A's own
        sessionId: 'session-123',
      };

      const prompt = buildPeerReviewPrompt(options);

      expect(prompt).toContain('What programming language should we use?');
      expect(prompt).toContain('Member A');
      expect(prompt).toContain('Member B');
      expect(prompt).toContain('Member C');
      expect(prompt).toContain('session-123');
    });

    it('should include review instructions', () => {
      const options: PeerReviewPromptOptions = {
        originalPrompt: 'Test prompt',
        reviewerId: 'Member A',
        opinionsToReview: [mockOpinions[1]],
        sessionId: 'session-123',
      };

      const prompt = buildPeerReviewPrompt(options);

      expect(prompt).toContain('REVIEW:');
      expect(prompt).toContain('RANK:');
      expect(prompt).toContain('JUSTIFICATION:');
      expect(prompt).toContain('STRENGTHS:');
      expect(prompt).toContain('WEAKNESSES:');
    });

    it('should include token counts for each response', () => {
      const options: PeerReviewPromptOptions = {
        originalPrompt: 'Test prompt',
        reviewerId: 'Member D',
        opinionsToReview: mockOpinions,
        sessionId: 'session-123',
      };

      const prompt = buildPeerReviewPrompt(options);

      expect(prompt).toContain('Token count: 100');
      expect(prompt).toContain('Token count: 120');
      expect(prompt).toContain('Token count: 110');
    });

    it('should return empty string for empty opinions', () => {
      const options: PeerReviewPromptOptions = {
        originalPrompt: 'Test prompt',
        reviewerId: 'Member A',
        opinionsToReview: [],
        sessionId: 'session-123',
      };

      const prompt = buildPeerReviewPrompt(options);

      expect(prompt).toBe('');
    });

    it('should include correct ranking range', () => {
      const options: PeerReviewPromptOptions = {
        originalPrompt: 'Test prompt',
        reviewerId: 'Member A',
        opinionsToReview: [mockOpinions[1], mockOpinions[2]],
        sessionId: 'session-123',
      };

      const prompt = buildPeerReviewPrompt(options);

      expect(prompt).toContain('1-2');
    });
  });

  describe('parsePeerReview', () => {
    it('should parse standard format peer review', () => {
      const responseText = `
REVIEW: Member B
RANK: 1
JUSTIFICATION: Excellent comprehensive response with good reasoning.
STRENGTHS: Clear, thorough, well-structured
WEAKNESSES: Could be more concise

REVIEW: Member C
RANK: 2
JUSTIFICATION: Good points but less comprehensive.
STRENGTHS: Simple, practical
WEAKNESSES: Missing some details, brief
`;

      const result = parsePeerReview('session-123', 'Member A', responseText);

      expect(result.success).toBe(true);
      expect(result.reviews).toHaveLength(2);
      expect(result.reviews[0].revieweeId).toBe('Member B');
      expect(result.reviews[0].rank).toBe(1);
      expect(result.reviews[0].strengths).toContain('Clear');
      expect(result.reviews[1].revieweeId).toBe('Member C');
      expect(result.reviews[1].rank).toBe(2);
    });

    it('should set sessionId and reviewerId on all reviews', () => {
      const responseText = `
REVIEW: Member B
RANK: 1
JUSTIFICATION: Good
STRENGTHS: Clear
WEAKNESSES: None
`;

      const result = parsePeerReview('session-456', 'Member A', responseText);

      expect(result.reviews[0].sessionId).toBe('session-456');
      expect(result.reviews[0].reviewerId).toBe('Member A');
    });

    it('should include timestamp on all reviews', () => {
      const responseText = `
REVIEW: Member B
RANK: 1
JUSTIFICATION: Good
STRENGTHS: Clear
WEAKNESSES: None
`;

      const result = parsePeerReview('session-123', 'Member A', responseText);

      expect(result.reviews[0].timestamp).toBeDefined();
      expect(new Date(result.reviews[0].timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should return error for unparseable response', () => {
      const responseText = 'This is not a valid peer review format.';

      const result = parsePeerReview('session-123', 'Member A', responseText);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.reviews).toHaveLength(0);
    });

    it('should handle empty strengths and weaknesses', () => {
      const responseText = `
REVIEW: Member B
RANK: 1
JUSTIFICATION: Solid response
STRENGTHS: None
WEAKNESSES: N/A
`;

      const result = parsePeerReview('session-123', 'Member A', responseText);

      expect(result.success).toBe(true);
      expect(result.reviews[0].strengths).toHaveLength(0);
      expect(result.reviews[0].weaknesses).toHaveLength(0);
    });
  });

  describe('calculateQualitySignalsFromReviews', () => {
    it('should calculate average rank per member', () => {
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
          rank: 2,
          justification: 'Good',
          strengths: ['Thorough'],
          weaknesses: [],
          timestamp: new Date().toISOString(),
        },
      ];

      const signals = calculateQualitySignalsFromReviews(peerReviews);

      expect(signals.averageRank['Member B']).toBe(1.5);
      expect(signals.peerReviewIncluded).toBe(true);
    });

    it('should calculate consensus score', () => {
      const peerReviews: PeerReview[] = [
        {
          sessionId: 'session-1',
          reviewerId: 'Member A',
          revieweeId: 'Member B',
          rank: 1,
          justification: 'Best',
          strengths: [],
          weaknesses: [],
          timestamp: new Date().toISOString(),
        },
        {
          sessionId: 'session-1',
          reviewerId: 'Member C',
          revieweeId: 'Member B',
          rank: 1,
          justification: 'Also best',
          strengths: [],
          weaknesses: [],
          timestamp: new Date().toISOString(),
        },
      ];

      const signals = calculateQualitySignalsFromReviews(peerReviews);

      expect(signals.consensusScore).toBeGreaterThanOrEqual(0);
      expect(signals.consensusScore).toBeLessThanOrEqual(100);
    });

    it('should return default signals for empty reviews', () => {
      const signals = calculateQualitySignalsFromReviews([]);

      expect(signals.averageRank).toEqual({});
      expect(signals.consensusScore).toBe(0);
      expect(signals.peerReviewIncluded).toBe(false);
    });
  });

  describe('getOpinionsToReview', () => {
    it('should exclude the reviewer from opinions list', () => {
      const result = getOpinionsToReview('Member A', mockOpinions);

      expect(result).toHaveLength(2);
      expect(result.find((o) => o.anonymousId === 'Member A')).toBeUndefined();
      expect(result.find((o) => o.anonymousId === 'Member B')).toBeDefined();
      expect(result.find((o) => o.anonymousId === 'Member C')).toBeDefined();
    });

    it('should return all opinions if reviewer not in list', () => {
      const result = getOpinionsToReview('Member D', mockOpinions);

      expect(result).toHaveLength(3);
    });

    it('should return empty array if only reviewer in list', () => {
      const singleOpinion: AnonymizedOpinion[] = [mockOpinions[0]];
      const result = getOpinionsToReview('Member A', singleOpinion);

      expect(result).toHaveLength(0);
    });
  });

  describe('canPerformPeerReview', () => {
    it('should return true for 3 or more members', () => {
      expect(canPerformPeerReview(3)).toBe(true);
      expect(canPerformPeerReview(4)).toBe(true);
      expect(canPerformPeerReview(10)).toBe(true);
    });

    it('should return false for fewer than 3 members', () => {
      expect(canPerformPeerReview(2)).toBe(false);
      expect(canPerformPeerReview(1)).toBe(false);
      expect(canPerformPeerReview(0)).toBe(false);
    });
  });

  describe('summarizePeerReviews', () => {
    it('should summarize peer reviews by member', () => {
      const peerReviews: PeerReview[] = [
        {
          sessionId: 'session-1',
          reviewerId: 'Member A',
          revieweeId: 'Member B',
          rank: 1,
          justification: 'Best',
          strengths: ['Clear', 'Comprehensive'],
          weaknesses: ['Verbose'],
          timestamp: new Date().toISOString(),
        },
        {
          sessionId: 'session-1',
          reviewerId: 'Member C',
          revieweeId: 'Member B',
          rank: 1,
          justification: 'Also best',
          strengths: ['Well-structured'],
          weaknesses: [],
          timestamp: new Date().toISOString(),
        },
      ];

      const summary = summarizePeerReviews(peerReviews);

      expect(summary).toContain('Member B');
      expect(summary).toContain('Avg Rank: 1.0');
      expect(summary).toContain('Clear');
      expect(summary).toContain('Verbose');
    });

    it('should return message for empty reviews', () => {
      const summary = summarizePeerReviews([]);

      expect(summary).toBe('No peer reviews available.');
    });

    it('should deduplicate strengths and weaknesses', () => {
      const peerReviews: PeerReview[] = [
        {
          sessionId: 'session-1',
          reviewerId: 'Member A',
          revieweeId: 'Member B',
          rank: 1,
          justification: 'Good',
          strengths: ['Clear', 'Clear', 'Thorough'],
          weaknesses: ['Brief'],
          timestamp: new Date().toISOString(),
        },
        {
          sessionId: 'session-1',
          reviewerId: 'Member C',
          revieweeId: 'Member B',
          rank: 2,
          justification: 'OK',
          strengths: ['Clear', 'Detailed'],
          weaknesses: ['Brief'],
          timestamp: new Date().toISOString(),
        },
      ];

      const summary = summarizePeerReviews(peerReviews);

      // Should only appear once even though mentioned multiple times
      const clearCount = (summary.match(/Clear/g) || []).length;
      expect(clearCount).toBe(1);
    });
  });
});
