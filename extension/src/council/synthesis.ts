/**
 * Synthesis Module
 *
 * Provides functions for building synthesis prompts and processing
 * synthesized responses from council sessions. The Chairman (requesting LLM)
 * uses these functions to combine council member responses into unified output.
 *
 * @see .specify/specs/009-llm-council-integration/data-model.md
 */

import {
  AnonymizedOpinion,
  Synthesis,
  ConflictResolution,
  QualitySignals,
  PeerReview,
} from './types';

/**
 * Options for building a synthesis prompt
 */
export interface SynthesisPromptOptions {
  /** The original prompt that was sent to council members */
  originalPrompt: string;
  /** Anonymized responses from council members */
  opinions: AnonymizedOpinion[];
  /** Optional peer review data for quality signals */
  peerReviews?: PeerReview[];
  /** Whether to include detailed conflict analysis */
  includeConflictAnalysis?: boolean;
}

/**
 * Result from parsing a synthesis response
 */
export interface ParsedSynthesis {
  /** The main synthesized content */
  content: string;
  /** Detected conflicts between members */
  conflicts: ConflictResolution[];
  /** Points of consensus */
  consensusPoints: string[];
  /** Calculated quality signals */
  qualitySignals: QualitySignals;
}

/**
 * Build a prompt for the Chairman to synthesize council member responses
 *
 * The prompt instructs the Chairman to:
 * 1. Analyze all member responses for common themes
 * 2. Identify conflicts and resolve them with justification
 * 3. Extract consensus points
 * 4. Produce a unified output that incorporates insights from all members
 */
export function buildSynthesisPrompt(options: SynthesisPromptOptions): string {
  const { originalPrompt, opinions, peerReviews, includeConflictAnalysis = true } = options;

  const memberSections = opinions
    .map(
      (opinion) =>
        `### ${opinion.anonymousId}\n\n${opinion.content}\n\n(Token count: ${opinion.tokenCount})`
    )
    .join('\n\n---\n\n');

  let peerReviewSection = '';
  if (peerReviews && peerReviews.length > 0) {
    const reviewSummary = summarizePeerReviews(peerReviews);
    peerReviewSection = `
## Peer Review Summary

${reviewSummary}
`;
  }

  const conflictSection = includeConflictAnalysis
    ? `
## Conflict Analysis Instructions

When you identify conflicts between members:
1. Clearly state the topic of disagreement
2. List the different positions (use anonymous IDs: Member A, B, C, etc.)
3. Provide your resolution with justification
4. Format conflicts as:
   **Conflict:** [topic]
   **Positions:** [list positions]
   **Resolution:** [your decision and rationale]
`
    : '';

  return `# Council Synthesis Task

You are acting as the Chairman of an LLM Council. Multiple AI council members have provided their responses to the same prompt. Your task is to synthesize their responses into a unified, high-quality output.

## Original Prompt

${originalPrompt}

## Council Member Responses

${memberSections}
${peerReviewSection}
## Synthesis Instructions

1. **Identify Common Themes**: Find areas where members agree and emphasize these points
2. **Resolve Conflicts**: When members disagree, evaluate their arguments and provide a reasoned resolution
3. **Incorporate Unique Insights**: Include valuable unique contributions from individual members
4. **Maintain Quality**: The synthesized output should be better than any single member's response
5. **Preserve Format**: Match the expected output format of the original prompt
${conflictSection}
## Consensus Points

After your synthesis, list 3-5 key points where council members agreed:
- **Consensus 1:** [point]
- **Consensus 2:** [point]
- **Consensus 3:** [point]

## Your Synthesized Response

Provide your unified response below, incorporating the best insights from all council members:
`;
}

/**
 * Detect conflicts between council member responses
 *
 * Analyzes responses to find areas of disagreement based on:
 * 1. Contradictory statements
 * 2. Different recommendations
 * 3. Opposing conclusions
 */
export function detectConflicts(opinions: AnonymizedOpinion[]): ConflictResolution[] {
  const conflicts: ConflictResolution[] = [];

  if (opinions.length < 2) {
    return conflicts;
  }

  // Simple conflict detection based on keyword analysis
  // A more sophisticated implementation would use semantic similarity
  const keywordGroups = extractKeywordPositions(opinions);

  for (const [topic, positions] of Object.entries(keywordGroups)) {
    if (positions.length >= 2) {
      // Check if positions are actually different
      const uniquePositions = [...new Set(positions.map((p) => p.position))];
      if (uniquePositions.length > 1) {
        conflicts.push({
          topic,
          positions: positions.map((p) => `${p.memberId}: ${p.position}`),
          resolution: '', // Will be filled by Chairman
        });
      }
    }
  }

  return conflicts;
}

/**
 * Extract consensus points from council member responses
 *
 * Finds common themes and agreements across all members
 */
export function extractConsensusPoints(opinions: AnonymizedOpinion[]): string[] {
  if (opinions.length === 0) {
    return [];
  }

  if (opinions.length === 1) {
    // Single member - extract key points from their response
    return extractKeyPoints(opinions[0].content);
  }

  // Find common phrases and themes
  const allContent = opinions.map((o) => o.content.toLowerCase());
  const consensusPoints: string[] = [];

  // Simple keyword frequency analysis
  const wordFrequency = new Map<string, number>();
  const importantPhrases = new Set<string>();

  for (const content of allContent) {
    // Extract sentences that might be key points
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);

    for (const sentence of sentences) {
      // Look for indicator words
      if (
        sentence.includes('should') ||
        sentence.includes('must') ||
        sentence.includes('recommend') ||
        sentence.includes('important') ||
        sentence.includes('key')
      ) {
        importantPhrases.add(sentence.trim());
      }

      // Count significant words
      const words = sentence.split(/\s+/).filter((w) => w.length > 4);
      for (const word of words) {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
      }
    }
  }

  // Find words that appear in majority of responses
  const threshold = Math.ceil(opinions.length / 2);
  const commonWords = [...wordFrequency.entries()]
    .filter(([_, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  // Build consensus points from common themes
  if (commonWords.length > 0) {
    consensusPoints.push(`Common focus on: ${commonWords.slice(0, 5).join(', ')}`);
  }

  // Add important phrases that appear in multiple responses
  for (const phrase of importantPhrases) {
    if (consensusPoints.length >= 5) {
      break;
    }
    const appearances = allContent.filter((c) => c.includes(phrase.toLowerCase())).length;
    if (appearances >= threshold) {
      consensusPoints.push(capitalize(phrase.substring(0, 100)));
    }
  }

  return consensusPoints.slice(0, 5);
}

/**
 * Parse a synthesis response from the Chairman
 *
 * Extracts structured data from the synthesis text:
 * - Main content
 * - Conflict resolutions
 * - Consensus points
 */
export function parseSynthesisResponse(
  sessionId: string,
  responseText: string,
  peerReviews?: PeerReview[]
): Synthesis {
  // Extract consensus points
  const consensusPoints = extractConsensusFromResponse(responseText);

  // Extract conflict resolutions
  const conflicts = extractConflictsFromResponse(responseText);

  // Calculate quality signals
  const qualitySignals = calculateQualitySignals(peerReviews);

  // Extract main content (everything after synthesis header)
  const content = extractMainContent(responseText);

  return {
    sessionId,
    chairmanId: 'requesting-llm',
    content,
    conflictsResolved: conflicts,
    consensusPoints,
    qualitySignals,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a Synthesis object from anonymized opinions
 * Used when no Chairman synthesis is performed (basic combination)
 */
export function createBasicSynthesis(
  sessionId: string,
  opinions: AnonymizedOpinion[],
  peerReviews?: PeerReview[]
): Synthesis {
  // Combine all opinions into a single content block
  const content = opinions.map((o) => `## ${o.anonymousId}\n\n${o.content}`).join('\n\n---\n\n');

  // Extract consensus points from the opinions
  const consensusPoints = extractConsensusPoints(opinions);

  // Detect any obvious conflicts
  const conflicts = detectConflicts(opinions);

  // Calculate quality signals
  const qualitySignals = calculateQualitySignals(peerReviews);

  return {
    sessionId,
    chairmanId: 'none',
    content,
    conflictsResolved: conflicts,
    consensusPoints,
    qualitySignals,
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

interface KeywordPosition {
  memberId: string;
  position: string;
}

function extractKeywordPositions(opinions: AnonymizedOpinion[]): Record<string, KeywordPosition[]> {
  const groups: Record<string, KeywordPosition[]> = {};

  // Keywords that might indicate positions on topics
  const topicIndicators = [
    'approach',
    'method',
    'solution',
    'recommend',
    'suggest',
    'prefer',
    'best',
    'should',
    'must',
    'avoid',
    'instead',
  ];

  for (const opinion of opinions) {
    const sentences = opinion.content.split(/[.!?]+/);

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();

      for (const indicator of topicIndicators) {
        if (lowerSentence.includes(indicator)) {
          // Extract the topic from the sentence
          const topic = extractTopicFromSentence(sentence, indicator);
          if (topic) {
            if (!groups[topic]) {
              groups[topic] = [];
            }
            groups[topic].push({
              memberId: opinion.anonymousId,
              position: sentence.trim(),
            });
          }
        }
      }
    }
  }

  return groups;
}

function extractTopicFromSentence(sentence: string, indicator: string): string | null {
  // Simple extraction - get the subject before the indicator word
  const index = sentence.toLowerCase().indexOf(indicator);
  if (index > 10) {
    const before = sentence.substring(Math.max(0, index - 50), index).trim();
    // Get the last noun phrase
    const words = before.split(/\s+/).slice(-3).join(' ');
    if (words.length > 5) {
      return words.toLowerCase();
    }
  }
  return null;
}

function extractKeyPoints(content: string): string[] {
  const points: string[] = [];
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);

  for (const sentence of sentences.slice(0, 5)) {
    if (
      sentence.toLowerCase().includes('key') ||
      sentence.toLowerCase().includes('important') ||
      sentence.toLowerCase().includes('main') ||
      sentence.toLowerCase().includes('recommend')
    ) {
      points.push(capitalize(sentence.trim().substring(0, 100)));
    }
  }

  return points.length > 0 ? points : sentences.slice(0, 3).map((s) => capitalize(s.trim()));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function summarizePeerReviews(peerReviews: PeerReview[]): string {
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

  // Calculate average ranks
  const summaries: string[] = [];
  for (const [revieweeId, reviews] of Object.entries(byReviewee)) {
    const avgRank = reviews.reduce((sum, r) => sum + r.rank, 0) / reviews.length;
    const strengths = reviews.flatMap((r) => r.strengths).slice(0, 3);
    const weaknesses = reviews.flatMap((r) => r.weaknesses).slice(0, 2);

    summaries.push(
      `**${revieweeId}** (Avg Rank: ${avgRank.toFixed(1)})\n` +
        `- Strengths: ${strengths.join(', ') || 'None noted'}\n` +
        `- Areas for improvement: ${weaknesses.join(', ') || 'None noted'}`
    );
  }

  return summaries.join('\n\n');
}

function extractConsensusFromResponse(text: string): string[] {
  const consensusPoints: string[] = [];

  // Look for consensus section markers
  const patterns = [
    /\*\*Consensus \d+:\*\*\s*(.+)/gi,
    /- Consensus \d+:\s*(.+)/gi,
    /Consensus:\s*(.+)/gi,
    /All members agree[d]? (?:that |on )?(.+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].length > 10) {
        consensusPoints.push(match[1].trim());
      }
    }
  }

  return [...new Set(consensusPoints)].slice(0, 5);
}

function extractConflictsFromResponse(text: string): ConflictResolution[] {
  const conflicts: ConflictResolution[] = [];

  // Look for conflict sections
  const conflictPattern =
    /\*\*Conflict:\*\*\s*(.+?)(?:\n|$)\s*\*\*Positions:\*\*\s*(.+?)(?:\n|$)\s*\*\*Resolution:\*\*\s*(.+?)(?:\n{2}|$)/gis;

  let match;
  while ((match = conflictPattern.exec(text)) !== null) {
    conflicts.push({
      topic: match[1].trim(),
      positions: match[2].split(/[,;]/).map((p) => p.trim()),
      resolution: match[3].trim(),
    });
  }

  return conflicts;
}

function extractMainContent(text: string): string {
  // Remove synthesis instruction sections
  const cleanText = text
    .replace(/# Council Synthesis Task[\s\S]*?## Your Synthesized Response\n*/i, '')
    .replace(/## Consensus Points[\s\S]*$/i, '')
    .trim();

  return cleanText || text;
}

function calculateQualitySignals(peerReviews?: PeerReview[]): QualitySignals {
  if (!peerReviews || peerReviews.length === 0) {
    return {
      averageRank: {},
      consensusScore: 0,
      peerReviewIncluded: false,
    };
  }

  // Calculate average rank per member
  const rankSums: Record<string, { total: number; count: number }> = {};

  for (const review of peerReviews) {
    if (!rankSums[review.revieweeId]) {
      rankSums[review.revieweeId] = { total: 0, count: 0 };
    }
    rankSums[review.revieweeId].total += review.rank;
    rankSums[review.revieweeId].count++;
  }

  const averageRank: Record<string, number> = {};
  for (const [memberId, { total, count }] of Object.entries(rankSums)) {
    averageRank[memberId] = total / count;
  }

  // Calculate consensus score based on rank agreement
  const ranks = Object.values(averageRank);
  const variance =
    ranks.length > 1
      ? ranks.reduce(
          (sum, r) => sum + Math.pow(r - ranks.reduce((a, b) => a + b, 0) / ranks.length, 2),
          0
        ) / ranks.length
      : 0;

  // Lower variance = higher consensus (normalize to 0-100)
  const maxVariance = Math.pow(ranks.length - 1, 2);
  const consensusScore = maxVariance > 0 ? Math.round(100 * (1 - variance / maxVariance)) : 100;

  return {
    averageRank,
    consensusScore,
    peerReviewIncluded: true,
  };
}
