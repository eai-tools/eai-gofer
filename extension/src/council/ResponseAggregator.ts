/**
 * Response Aggregator
 *
 * Collects responses from multiple LLM providers in parallel, handles timeouts,
 * validates quorum requirements, and provides anonymization for peer review.
 *
 * @see .specify/specs/009-llm-council-integration/data-model.md
 */

import { LLMProvider } from './providers/LLMProvider';
import {
  ProviderId,
  QueryRequest,
  QueryResponse,
  CouncilMember,
  FirstOpinion,
  UsageMetrics,
  AnonymizedOpinion,
  MemberStatus,
  PeerReview,
} from './types';
import {
  buildPeerReviewPrompt,
  parsePeerReview,
  getOpinionsToReview,
  canPerformPeerReview,
} from './peerReview';

/**
 * Configuration for the response aggregator
 */
export interface AggregatorConfig {
  /** Per-provider timeout in milliseconds */
  timeout?: number;
  /** Minimum number of successful responses required */
  minQuorum?: number;
}

/**
 * Result from a single provider query
 */
export interface ProviderResult {
  /** Which provider responded */
  providerId: ProviderId;
  /** The response (if successful) */
  response?: QueryResponse;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Failed provider result
 */
export interface FailedResult {
  providerId: ProviderId;
  error: string;
}

/**
 * Aggregated results from all providers
 */
export interface AggregatedResponses {
  /** Successful responses */
  successful: ProviderResult[];
  /** Failed attempts */
  failed: FailedResult[];
  /** Whether minimum quorum was met */
  quorumMet: boolean;
  /** Total duration in milliseconds */
  durationMs: number;
}

/**
 * Default timeout per provider (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Default minimum quorum (2 providers)
 */
const DEFAULT_MIN_QUORUM = 2;

/**
 * Anonymous ID labels for council members
 */
const MEMBER_LABELS = ['Member A', 'Member B', 'Member C', 'Member D'];

/**
 * Estimated cost per 1000 tokens by provider (in USD)
 * These are approximations for estimation purposes
 */
const COST_PER_1K_TOKENS: Record<ProviderId, { input: number; output: number }> = {
  anthropic: { input: 0.003, output: 0.015 },
  google: { input: 0.00025, output: 0.0005 },
  openai: { input: 0.005, output: 0.015 },
  'claude-cli': { input: 0.003, output: 0.015 },
  'codex-cli': { input: 0.005, output: 0.015 },
};

/**
 * Response Aggregator for collecting and processing multi-provider responses
 */
export class ResponseAggregator {
  readonly timeout: number;
  readonly minQuorum: number;

  constructor(config: AggregatorConfig = {}) {
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.minQuorum = config.minQuorum ?? DEFAULT_MIN_QUORUM;
  }

  /**
   * Collect responses from all providers in parallel
   * Uses Promise.allSettled to handle partial failures gracefully
   */
  async collectResponses(
    providers: LLMProvider[],
    request: QueryRequest
  ): Promise<AggregatedResponses> {
    const startTime = Date.now();

    // Create timeout-wrapped promises for each provider
    const providerPromises = providers.map((provider) => this.queryWithTimeout(provider, request));

    // Execute all in parallel, collecting all results
    const results = await Promise.allSettled(providerPromises);

    const successful: ProviderResult[] = [];
    const failed: FailedResult[] = [];

    results.forEach((result, index) => {
      const providerId = providers[index].id;

      if (result.status === 'fulfilled') {
        if (result.value.error) {
          failed.push({
            providerId,
            error: result.value.error,
          });
        } else if (result.value.response) {
          successful.push({
            providerId,
            response: result.value.response,
          });
        }
      } else {
        failed.push({
          providerId,
          error: result.reason?.message ?? 'Unknown error',
        });
      }
    });

    const durationMs = Date.now() - startTime;

    return {
      successful,
      failed,
      quorumMet: successful.length >= this.minQuorum,
      durationMs,
    };
  }

  /**
   * Query a provider with timeout wrapper
   */
  private async queryWithTimeout(
    provider: LLMProvider,
    request: QueryRequest
  ): Promise<{ response?: QueryResponse; error?: string }> {
    return new Promise((resolve) => {
      let settled = false;

      // Timeout handler
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({ error: `Provider ${provider.id} timeout after ${this.timeout}ms` });
        }
      }, this.timeout);

      // Query handler
      provider
        .query(request)
        .then((response) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            resolve({ response });
          }
        })
        .catch((error: Error) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            resolve({ error: error.message });
          }
        });
    });
  }

  /**
   * Convert provider responses to anonymous Member A, B, C format
   * for use in peer review and synthesis
   */
  anonymize(responses: ProviderResult[]): AnonymizedOpinion[] {
    return responses.map((result, index) => ({
      anonymousId: MEMBER_LABELS[index] ?? `Member ${String.fromCharCode(65 + index)}`,
      content: result.response?.content ?? '',
      tokenCount: result.response?.usage.outputTokens ?? 0,
    }));
  }

  /**
   * Validate that minimum quorum requirements are met
   */
  validateQuorum(result: AggregatedResponses): boolean {
    return result.successful.length >= this.minQuorum;
  }

  /**
   * Create CouncilMember records from aggregated responses
   */
  createCouncilMembers(sessionId: string, result: AggregatedResponses): CouncilMember[] {
    const members: CouncilMember[] = [];
    const now = new Date().toISOString();
    let labelIndex = 0;

    // Add successful members with sequential anonymous IDs
    for (const successResult of result.successful) {
      const firstOpinion: FirstOpinion = {
        memberId: `${sessionId}-${successResult.providerId}`,
        content: successResult.response?.content ?? '',
        tokenCount: successResult.response?.usage.outputTokens ?? 0,
        timestamp: now,
      };

      members.push({
        sessionId,
        providerId: successResult.providerId,
        anonymousId: MEMBER_LABELS[labelIndex] ?? `Member ${String.fromCharCode(65 + labelIndex)}`,
        status: 'responded' as MemberStatus,
        firstOpinion,
        requestedAt: now,
        respondedAt: now,
      });

      labelIndex++;
    }

    // Add failed members
    for (const failedResult of result.failed) {
      members.push({
        sessionId,
        providerId: failedResult.providerId,
        anonymousId: '', // Failed members don't get anonymous IDs
        status: 'error' as MemberStatus,
        requestedAt: now,
        errorMessage: failedResult.error,
      });
    }

    return members;
  }

  /**
   * Collect peer reviews from all providers
   *
   * Each provider reviews other providers' responses anonymously.
   * Requires at least 3 providers for meaningful peer review.
   */
  async collectPeerReviews(
    providers: LLMProvider[],
    originalPrompt: string,
    anonymizedOpinions: AnonymizedOpinion[],
    sessionId: string
  ): Promise<PeerReview[]> {
    // Validate we have enough members for peer review
    if (!canPerformPeerReview(anonymizedOpinions.length)) {
      return [];
    }

    const allPeerReviews: PeerReview[] = [];

    // Map providers to their anonymous IDs
    const providerToAnonymousId = new Map<LLMProvider, string>();
    providers.forEach((provider, index) => {
      const anonymousId =
        index < anonymizedOpinions.length
          ? anonymizedOpinions[index].anonymousId
          : `Member ${String.fromCharCode(65 + index)}`;
      providerToAnonymousId.set(provider, anonymousId);
    });

    // Create peer review requests for each provider
    const peerReviewPromises = providers.map(async (provider) => {
      const reviewerId = providerToAnonymousId.get(provider) || 'Unknown';
      const opinionsToReview = getOpinionsToReview(reviewerId, anonymizedOpinions);

      if (opinionsToReview.length === 0) {
        return [];
      }

      const reviewPrompt = buildPeerReviewPrompt({
        originalPrompt,
        reviewerId,
        opinionsToReview,
        sessionId,
      });

      try {
        const response = await this.queryWithTimeout(provider, {
          prompt: reviewPrompt,
          systemPrompt:
            'You are a peer reviewer in an LLM Council session. Evaluate and rank the responses from other council members.',
          maxTokens: 2048,
          temperature: 0.3,
        });

        if (response.response) {
          const parsed = parsePeerReview(sessionId, reviewerId, response.response.content);
          return parsed.reviews;
        }
      } catch (error) {
        console.warn(
          `[Gofer] Peer review from ${reviewerId} failed:`,
          error instanceof Error ? error.message : error
        );
      }

      return [];
    });

    // Collect all peer reviews in parallel
    const results = await Promise.allSettled(peerReviewPromises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allPeerReviews.push(...result.value);
      }
    }

    return allPeerReviews;
  }

  /**
   * Calculate usage metrics from aggregated responses
   */
  calculateUsageMetrics(result: AggregatedResponses): UsageMetrics {
    let totalTokensInput = 0;
    let totalTokensOutput = 0;
    let estimatedCostUsd = 0;
    const providerBreakdown: UsageMetrics['providerBreakdown'] =
      {} as UsageMetrics['providerBreakdown'];

    for (const successResult of result.successful) {
      const response = successResult.response;
      if (!response) {
        continue;
      }

      const inputTokens = response.usage.inputTokens;
      const outputTokens = response.usage.outputTokens;

      totalTokensInput += inputTokens;
      totalTokensOutput += outputTokens;

      // Calculate cost for this provider
      const costRates = COST_PER_1K_TOKENS[successResult.providerId];
      const providerCost =
        (inputTokens / 1000) * costRates.input + (outputTokens / 1000) * costRates.output;

      estimatedCostUsd += providerCost;

      providerBreakdown[successResult.providerId] = {
        tokens: inputTokens + outputTokens,
        costUsd: providerCost,
      };
    }

    return {
      totalTokensInput,
      totalTokensOutput,
      estimatedCostUsd,
      durationMs: result.durationMs,
      providerBreakdown,
    };
  }
}
