/**
 * Council Orchestrator
 *
 * Coordinates multi-provider parallel execution of the LLM Council pattern.
 * Handles progress reporting, fallback to single-provider mode on quorum failure,
 * and integration with the ResponseAggregator.
 *
 * @see .specify/specs/009-llm-council-integration/data-model.md
 */

import { randomUUID } from 'crypto';
import { LLMProvider } from './providers/LLMProvider';
import { ConfigLoader } from './ConfigLoader';
import { ResponseAggregator, AggregatedResponses } from './ResponseAggregator';
import {
  buildSynthesisPrompt,
  extractConsensusPoints,
  detectConflicts,
} from './synthesis';
import { calculateQualitySignalsFromReviews, canPerformPeerReview } from './peerReview';
import {
  AgentType,
  CouncilConfig,
  CouncilResult,
  CouncilSession,
  QueryRequest,
  UsageMetrics,
  AnonymizedOpinion,
  SessionStatus,
  Synthesis,
  PeerReview,
} from './types';
import { calculateCost } from '../config/pricing';

/**
 * Options for dispatching a council request
 */
export interface DispatchOptions {
  /** Which agent type is making the request */
  agentType: AgentType;
  /** Current workflow stage */
  stage: string;
  /** The query request to send to providers */
  request: QueryRequest;
}

/**
 * Progress callback for reporting council execution status
 */
export type ProgressCallback = (message: string, increment?: number) => void;

/**
 * Configuration for the council orchestrator
 */
export interface OrchestratorConfig {
  /** Configuration loader instance */
  configLoader: ConfigLoader;
  /** Map of provider ID to provider instance */
  providers: Map<string, LLMProvider>;
  /** Response aggregator instance */
  responseAggregator: ResponseAggregator;
  /** Optional progress callback */
  onProgress?: ProgressCallback;
}

/**
 * Council Orchestrator for multi-provider parallel execution
 */
export class CouncilOrchestrator {
  private configLoader: ConfigLoader;
  private providers: Map<string, LLMProvider>;
  private responseAggregator: ResponseAggregator;
  private onProgress?: ProgressCallback;
  private cachedConfig?: CouncilConfig;

  constructor(config: OrchestratorConfig) {
    this.configLoader = config.configLoader;
    this.providers = config.providers;
    this.responseAggregator = config.responseAggregator;
    this.onProgress = config.onProgress;
  }

  /**
   * Dispatch a request using council or single-provider mode based on configuration
   */
  async dispatch(options: DispatchOptions): Promise<CouncilResult> {
    // Load config if not cached
    await this.ensureConfig();

    // Check if council mode should be used for this stage
    const useCouncil = await this.shouldUseCouncil(options.stage);

    if (!useCouncil) {
      return this.dispatchSingle(options);
    }

    return this.dispatchCouncil(options);
  }

  /**
   * Dispatch using council mode (multi-provider parallel execution)
   */
  private async dispatchCouncil(options: DispatchOptions): Promise<CouncilResult> {
    const sessionId = this.generateSessionId();
    const startTime = new Date().toISOString();

    this.reportProgress('Starting council session...', 10);

    // Get available providers
    const availableProviders = await this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error('Council dispatch failed: no providers available');
    }

    this.reportProgress(`Querying ${availableProviders.length} providers in parallel...`, 30);

    // Collect responses from all providers
    const aggregatedResult = await this.responseAggregator.collectResponses(
      availableProviders,
      options.request
    );

    this.reportProgress('Aggregating responses...', 50);

    // Check quorum
    if (!this.responseAggregator.validateQuorum(aggregatedResult)) {
      // Fallback to single mode with available responses
      return this.handleQuorumFailure(options, aggregatedResult);
    }

    // Anonymize responses
    const anonymized = this.responseAggregator.anonymize(aggregatedResult.successful);

    // Optional peer review stage
    let peerReviews: PeerReview[] = [];
    const config = this.cachedConfig!;

    if (config.peerReview && canPerformPeerReview(anonymized.length)) {
      this.reportProgress('Collecting peer reviews...', 60);
      peerReviews = await this.responseAggregator.collectPeerReviews(
        availableProviders,
        options.request.prompt,
        anonymized,
        sessionId
      );
      this.reportProgress(`Received ${peerReviews.length} peer reviews`, 75);
    }

    this.reportProgress('Building synthesis...', 85);

    // Build synthesis from responses (with peer reviews if available)
    const synthesis = this.buildSynthesisFromResponses(anonymized);

    // Create session record
    const session = this.createSession(
      sessionId,
      options,
      aggregatedResult,
      startTime,
      synthesis,
      anonymized,
      peerReviews
    );

    // Calculate usage metrics
    const usage = this.responseAggregator.calculateUsageMetrics(aggregatedResult);

    this.reportProgress('Council session complete', 100);

    return {
      mode: 'council',
      synthesis,
      session,
      usage,
      peerReviews: peerReviews.length > 0 ? peerReviews : undefined,
    };
  }

  /**
   * Dispatch using single-provider mode
   */
  private async dispatchSingle(options: DispatchOptions): Promise<CouncilResult> {
    this.reportProgress('Using single-provider mode...', 20);

    // Get primary provider (first available)
    const availableProviders = await this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error('Single dispatch failed: no providers available');
    }

    // Use first available provider
    const provider = availableProviders[0];

    this.reportProgress(`Querying ${provider.name}...`, 50);

    const response = await provider.query(options.request);
    const estimatedCostUsd = calculateCost(
      response.usage.inputTokens,
      response.usage.outputTokens,
      response.providerId,
      response.model,
      {
        cachedInputTokens: response.usage.cachedInputTokens ?? 0,
        cacheReadTokens: response.usage.cacheReadTokens ?? 0,
        cacheWriteTokens: response.usage.cacheWriteTokens ?? 0,
      }
    );

    this.reportProgress('Response received', 100);

    return {
      mode: 'single',
      synthesis: response.content,
      singleResponse: response,
      usage: {
        totalTokensInput: response.usage.inputTokens,
        totalTokensOutput: response.usage.outputTokens,
        totalCachedInputTokens:
          (response.usage.cachedInputTokens ?? 0) + (response.usage.cacheReadTokens ?? 0),
        totalCacheReadTokens: response.usage.cacheReadTokens ?? 0,
        totalCacheWriteTokens: response.usage.cacheWriteTokens ?? 0,
        estimatedCostUsd,
        durationMs: 0,
        providerBreakdown: {
          [response.providerId]: {
            tokens: response.usage.inputTokens + response.usage.outputTokens,
            costUsd: estimatedCostUsd,
            model: response.model,
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            cachedInputTokens: response.usage.cachedInputTokens ?? 0,
            cacheReadTokens: response.usage.cacheReadTokens ?? 0,
            cacheWriteTokens: response.usage.cacheWriteTokens ?? 0,
          },
        } as UsageMetrics['providerBreakdown'],
      },
    };
  }

  /**
   * Handle quorum failure by falling back to single-provider mode
   */
  private async handleQuorumFailure(
    options: DispatchOptions,
    aggregatedResult: AggregatedResponses
  ): Promise<CouncilResult> {
    this.reportProgress('Quorum not met, falling back to single provider...', 70);

    // Use the first successful response if available
    if (aggregatedResult.successful.length > 0) {
      const response = aggregatedResult.successful[0].response!;
      return {
        mode: 'single',
        synthesis: response.content,
        singleResponse: response,
        usage: this.responseAggregator.calculateUsageMetrics(aggregatedResult),
      };
    }

    // No responses at all
    const failedProviders = aggregatedResult.failed.map((f) => f.providerId).join(', ');
    throw new Error(`Council dispatch failed: no providers responded. Failed: ${failedProviders}`);
  }

  /**
   * Get list of available and enabled providers
   */
  async getAvailableProviders(): Promise<LLMProvider[]> {
    await this.ensureConfig();

    const config = this.cachedConfig!;
    const enabledProviderIds = config.providers.filter((p) => p.enabled).map((p) => p.providerId);

    const available: LLMProvider[] = [];

    for (const providerId of enabledProviderIds) {
      const provider = this.providers.get(providerId);
      if (provider && provider.isAvailable() && !provider.isRateLimited()) {
        available.push(provider);
      }
    }

    return available;
  }

  /**
   * Check if council mode should be used for a stage
   */
  async shouldUseCouncil(stage: string): Promise<boolean> {
    await this.ensureConfig();

    if (!this.cachedConfig?.enabled) {
      return false;
    }

    return this.configLoader.shouldUseCouncil(stage);
  }

  /**
   * Generate a unique session ID (UUID format)
   */
  generateSessionId(): string {
    return randomUUID();
  }

  /**
   * Build a synthesis string from anonymized responses
   * This combines all member responses with headers for display
   */
  buildSynthesisFromResponses(anonymized: AnonymizedOpinion[]): string {
    if (anonymized.length === 0) {
      return '';
    }

    if (anonymized.length === 1) {
      return `## ${anonymized[0].anonymousId}\n\n${anonymized[0].content}`;
    }

    // Combine all responses with headers
    const sections = anonymized.map((opinion) => `## ${opinion.anonymousId}\n\n${opinion.content}`);

    return sections.join('\n\n---\n\n');
  }

  /**
   * Generate a synthesis prompt for the Chairman to process
   * This can be used to request a proper synthesis from the requesting LLM
   */
  generateSynthesisPrompt(originalPrompt: string, anonymized: AnonymizedOpinion[]): string {
    return buildSynthesisPrompt({
      originalPrompt,
      opinions: anonymized,
      includeConflictAnalysis: true,
    });
  }

  /**
   * Log synthesis results for debugging
   */
  logSynthesis(session: CouncilSession): void {
    const { synthesis } = session;
    if (!synthesis) {
      return;
    }
  }

  /**
   * Create a CouncilSession record
   */
  private createSession(
    sessionId: string,
    options: DispatchOptions,
    aggregatedResult: AggregatedResponses,
    startTime: string,
    synthesisContent: string,
    anonymized: AnonymizedOpinion[],
    peerReviews: PeerReview[] = []
  ): CouncilSession {
    const members = this.responseAggregator.createCouncilMembers(sessionId, aggregatedResult);
    const usage = this.responseAggregator.calculateUsageMetrics(aggregatedResult);

    // Use synthesis module to extract consensus and detect conflicts
    const consensusPoints = extractConsensusPoints(anonymized);
    const conflictsResolved = detectConflicts(anonymized);

    // Calculate quality signals - use peer reviews if available
    const qualitySignals =
      peerReviews.length > 0
        ? calculateQualitySignalsFromReviews(peerReviews)
        : {
            averageRank: {},
            consensusScore: consensusPoints.length > 0 ? 50 : 0,
            peerReviewIncluded: false,
          };

    const synthesis: Synthesis = {
      sessionId,
      chairmanId: 'requesting-llm',
      content: synthesisContent,
      conflictsResolved,
      consensusPoints,
      qualitySignals,
      timestamp: new Date().toISOString(),
    };

    return {
      id: sessionId,
      agentType: options.agentType,
      stage: options.stage,
      status: 'completed' as SessionStatus,
      prompt: options.request.prompt,
      startedAt: startTime,
      completedAt: new Date().toISOString(),
      members,
      synthesis,
      usageMetrics: usage,
      peerReviews: peerReviews.length > 0 ? peerReviews : undefined,
    };
  }

  /**
   * Ensure configuration is loaded
   */
  private async ensureConfig(): Promise<void> {
    if (!this.cachedConfig) {
      this.cachedConfig = await this.configLoader.loadConfig();
    }
  }

  /**
   * Report progress if callback is provided
   */
  private reportProgress(message: string, increment?: number): void {
    if (this.onProgress) {
      this.onProgress(message, increment);
    }
  }
}
