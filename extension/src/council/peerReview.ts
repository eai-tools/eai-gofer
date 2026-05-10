/**
 * Peer Review Module
 *
 * Provides functions for building peer review prompts and parsing
 * peer review responses from council members. Each member reviews
 * and ranks other members' responses anonymously.
 *
 * @see .specify/specs/009-llm-council-integration/data-model.md
 */

import { AnonymizedOpinion, PeerReview, QualitySignals } from './types';

/**
 * Options for building a peer review prompt
 */
export interface PeerReviewPromptOptions {
  /** The original prompt that was sent to council members */
  originalPrompt: string;
  /** The reviewer's anonymous ID (e.g., "Member A") */
  reviewerId: string;
  /** Anonymized responses from other council members to review */
  opinionsToReview: AnonymizedOpinion[];
  /** Session ID for tracking */
  sessionId: string;
}

/**
 * Parsed peer review from a single reviewer
 */
export interface ParsedPeerReviewResponse {
  /** The reviewer's anonymous ID */
  reviewerId: string;
  /** Individual reviews for each member */
  reviews: PeerReview[];
  /** Whether parsing was successful */
  success: boolean;
  /** Error message if parsing failed */
  error?: string;
}

/**
 * Build a prompt for a council member to review other members' responses
 *
 * The prompt instructs the reviewer to:
 * 1. Read all other members' responses
 * 2. Rank them from best to worst
 * 3. Provide justification, strengths, and weaknesses for each
 */
export function buildPeerReviewPrompt(options: PeerReviewPromptOptions): string {
  const { originalPrompt, reviewerId, opinionsToReview, sessionId } = options;

  if (opinionsToReview.length === 0) {
    return '';
  }

  const memberSections = opinionsToReview
    .map(
      (opinion) =>
        `### ${opinion.anonymousId}\n\n${opinion.content}\n\n(Token count: ${opinion.tokenCount})`
    )
    .join('\n\n---\n\n');

  const memberIds = opinionsToReview.map((o) => o.anonymousId).join(', ');

  return `# Peer Review Task

You are ${reviewerId} in an LLM Council session (${sessionId}). Your task is to review and rank the responses from other council members.

## Original Prompt

${originalPrompt}

## Responses to Review

${memberSections}

## Your Review Instructions

1. **Read each response carefully** - Consider accuracy, completeness, clarity, and helpfulness
2. **Rank all responses** - From best (1) to worst (${opinionsToReview.length})
3. **Provide justification** - Explain why you ranked each response as you did
4. **Note strengths and weaknesses** - Be specific and constructive

## Required Output Format

For each member you review, provide your assessment in this exact format:

\`\`\`
REVIEW: [Member ID]
RANK: [number 1-${opinionsToReview.length}]
JUSTIFICATION: [1-2 sentences explaining your ranking]
STRENGTHS: [comma-separated list of positive aspects]
WEAKNESSES: [comma-separated list of areas for improvement]
\`\`\`

Review the following members: ${memberIds}

Provide your reviews below:
`;
}

/**
 * Parse peer review responses from a council member
 *
 * Extracts structured PeerReview objects from the reviewer's response text
 */
export function parsePeerReview(
  sessionId: string,
  reviewerId: string,
  responseText: string
): ParsedPeerReviewResponse {
  const reviews: PeerReview[] = [];
  const timestamp = new Date().toISOString();

  // Pattern to match review blocks
  const reviewPattern =
    /REVIEW:\s*(.+?)\s*\n\s*RANK:\s*(\d+)\s*\n\s*JUSTIFICATION:\s*(.+?)\s*\n\s*STRENGTHS:\s*(.+?)\s*\n\s*WEAKNESSES:\s*(.+?)(?=\n\s*REVIEW:|$)/gis;

  let match;
  while ((match = reviewPattern.exec(responseText)) !== null) {
    const revieweeId = match[1].trim();
    const rank = parseInt(match[2], 10);
    const justification = match[3].trim();
    const strengths = parseList(match[4]);
    const weaknesses = parseList(match[5]);

    if (revieweeId && !isNaN(rank)) {
      reviews.push({
        sessionId,
        reviewerId,
        revieweeId,
        rank,
        justification,
        strengths,
        weaknesses,
        timestamp,
      });
    }
  }

  // If standard format didn't work, try alternative parsing
  if (reviews.length === 0) {
    const altReviews = parseAlternativeFormat(sessionId, reviewerId, responseText, timestamp);
    reviews.push(...altReviews);
  }

  return {
    reviewerId,
    reviews,
    success: reviews.length > 0,
    error: reviews.length === 0 ? 'Could not parse peer review response' : undefined,
  };
}

/**
 * Calculate quality signals from peer reviews
 *
 * Computes average rankings and consensus scores based on peer reviews
 */
export function calculateQualitySignalsFromReviews(peerReviews: PeerReview[]): QualitySignals {
  if (peerReviews.length === 0) {
    return {
      averageRank: {},
      consensusScore: 0,
      peerReviewIncluded: false,
    };
  }

  // Group reviews by reviewee
  const byReviewee: Record<string, PeerReview[]> = {};
  for (const review of peerReviews) {
    if (!byReviewee[review.revieweeId]) {
      byReviewee[review.revieweeId] = [];
    }
    byReviewee[review.revieweeId].push(review);
  }

  // Calculate average rank for each member
  const averageRank: Record<string, number> = {};
  for (const [revieweeId, reviews] of Object.entries(byReviewee)) {
    const sum = reviews.reduce((acc, r) => acc + r.rank, 0);
    averageRank[revieweeId] = sum / reviews.length;
  }

  // Calculate consensus score based on ranking agreement
  const consensusScore = calculateConsensusScore(byReviewee);

  return {
    averageRank,
    consensusScore,
    peerReviewIncluded: true,
  };
}

/**
 * Get opinions for a reviewer to review (excludes their own)
 */
export function getOpinionsToReview(
  reviewerId: string,
  allOpinions: AnonymizedOpinion[]
): AnonymizedOpinion[] {
  return allOpinions.filter((o) => o.anonymousId !== reviewerId);
}

/**
 * Validate that peer review is possible (need 3+ members)
 */
export function canPerformPeerReview(memberCount: number): boolean {
  return memberCount >= 3;
}

/**
 * Summarize peer reviews for display
 */
export function summarizePeerReviews(peerReviews: PeerReview[]): string {
  if (peerReviews.length === 0) {
    return 'No peer reviews available.';
  }

  // Group reviews by reviewee
  const byReviewee: Record<string, PeerReview[]> = {};
  for (const review of peerReviews) {
    if (!byReviewee[review.revieweeId]) {
      byReviewee[review.revieweeId] = [];
    }
    byReviewee[review.revieweeId].push(review);
  }

  // Build summary for each member
  const summaries: string[] = [];
  for (const [revieweeId, reviews] of Object.entries(byReviewee)) {
    const avgRank = reviews.reduce((sum, r) => sum + r.rank, 0) / reviews.length;
    const allStrengths = [...new Set(reviews.flatMap((r) => r.strengths))].slice(0, 3);
    const allWeaknesses = [...new Set(reviews.flatMap((r) => r.weaknesses))].slice(0, 2);

    summaries.push(
      `**${revieweeId}** (Avg Rank: ${avgRank.toFixed(1)})\n` +
        `- Strengths: ${allStrengths.join(', ') || 'None noted'}\n` +
        `- Areas for improvement: ${allWeaknesses.join(', ') || 'None noted'}`
    );
  }

  return summaries.join('\n\n');
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a comma-separated list into an array
 */
function parseList(text: string): string[] {
  if (!text || text.toLowerCase() === 'none' || text.toLowerCase() === 'n/a') {
    return [];
  }
  return text
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(
      (item) => item.length > 0 && item.toLowerCase() !== 'none' && item.toLowerCase() !== 'n/a'
    );
}

/**
 * Try alternative parsing formats for peer reviews
 */
function parseAlternativeFormat(
  sessionId: string,
  reviewerId: string,
  responseText: string,
  timestamp: string
): PeerReview[] {
  const reviews: PeerReview[] = [];

  // Try parsing markdown-style reviews
  // Format: ## Member X\n**Rank:** N\n**Justification:** ...
  const mdPattern =
    /##\s*(Member\s*[A-Z])\s*\n\s*\*\*Rank:\*\*\s*(\d+)\s*\n\s*\*\*Justification:\*\*\s*(.+?)\s*\n\s*\*\*Strengths:\*\*\s*(.+?)\s*\n\s*\*\*Weaknesses:\*\*\s*(.+?)(?=\n##|$)/gis;

  let match;
  while ((match = mdPattern.exec(responseText)) !== null) {
    reviews.push({
      sessionId,
      reviewerId,
      revieweeId: match[1].trim(),
      rank: parseInt(match[2], 10),
      justification: match[3].trim(),
      strengths: parseList(match[4]),
      weaknesses: parseList(match[5]),
      timestamp,
    });
  }

  // Try numbered list format
  // Format: 1. Member A - [justification] (strengths: ..., weaknesses: ...)
  if (reviews.length === 0) {
    const listPattern =
      /(\d+)\.\s*(Member\s*[A-Z])\s*[-:]\s*(.+?)(?:\(strengths?:\s*([^)]+)\))?(?:\(weaknesses?:\s*([^)]+)\))?(?=\n\d+\.|$)/gis;

    while ((match = listPattern.exec(responseText)) !== null) {
      reviews.push({
        sessionId,
        reviewerId,
        revieweeId: match[2].trim(),
        rank: parseInt(match[1], 10),
        justification: match[3].trim(),
        strengths: match[4] ? parseList(match[4]) : [],
        weaknesses: match[5] ? parseList(match[5]) : [],
        timestamp,
      });
    }
  }

  return reviews;
}

/**
 * Calculate consensus score based on ranking agreement
 *
 * Uses Kendall's coefficient of concordance (simplified)
 * Higher scores indicate more agreement among reviewers
 */
function calculateConsensusScore(byReviewee: Record<string, PeerReview[]>): number {
  const members = Object.keys(byReviewee);
  if (members.length < 2) {
    return 100; // Perfect consensus with only one member
  }

  // Get all reviewers
  const reviewers = new Set<string>();
  for (const reviews of Object.values(byReviewee)) {
    for (const review of reviews) {
      reviewers.add(review.reviewerId);
    }
  }

  if (reviewers.size < 2) {
    return 100; // Single reviewer, perfect "consensus"
  }

  // Calculate variance in rankings for each member
  let totalVariance = 0;
  let memberCount = 0;

  for (const [_, reviews] of Object.entries(byReviewee)) {
    if (reviews.length >= 2) {
      const ranks = reviews.map((r) => r.rank);
      const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
      const variance = ranks.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ranks.length;
      totalVariance += variance;
      memberCount++;
    }
  }

  if (memberCount === 0) {
    return 100;
  }

  const avgVariance = totalVariance / memberCount;

  // Normalize to 0-100 scale (lower variance = higher consensus)
  // Assume max variance is (n-1)^2 where n is number of members
  const maxVariance = Math.pow(members.length - 1, 2);
  const normalizedScore = maxVariance > 0 ? Math.round(100 * (1 - avgVariance / maxVariance)) : 100;

  return Math.max(0, Math.min(100, normalizedScore));
}
