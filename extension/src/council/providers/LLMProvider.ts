/**
 * LLM Provider Interface
 *
 * Abstract interface for CLI-backed AI provider implementations.
 */

import {
  ProviderId,
  ProviderStatus,
  QueryRequest,
  QueryResponse,
  RateLimitConfig,
  DEFAULT_RATE_LIMIT,
} from '../types';

/**
 * Abstract interface for LLM providers.
 * Implementations must handle authentication, querying, and health checks.
 */
export interface LLMProvider {
  /** Provider identifier */
  readonly id: ProviderId;

  /** Human-readable provider name */
  readonly name: string;

  /** Current model being used */
  readonly model: string;

  /** Current availability status */
  status: ProviderStatus;

  /** Rate limiting state */
  rateLimit: RateLimitConfig;

  /** ISO-8601 timestamp of last health check */
  lastChecked?: string;

  /** Most recent error message if unavailable */
  errorMessage?: string;

  /**
   * Query the provider with a prompt
   * @param request - Query parameters including prompt, maxTokens, temperature
   * @returns Response with content and usage metrics
   * @throws ProviderError on API failures
   */
  query(request: QueryRequest): Promise<QueryResponse>;

  /**
   * Check provider availability
   * @returns true if provider is available
   */
  healthCheck(): Promise<boolean>;

  /**
   * Check if provider is currently available for queries
   */
  isAvailable(): boolean;

  /**
   * Check if provider is rate limited
   */
  isRateLimited(): boolean;

  /**
   * Update rate limit state after a request
   */
  updateRateLimit(): void;
}

/**
 * Base class providing common functionality for LLM providers
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly id: ProviderId;
  abstract readonly name: string;
  abstract readonly model: string;

  status: ProviderStatus = 'unknown';
  rateLimit: RateLimitConfig = { ...DEFAULT_RATE_LIMIT };
  lastChecked?: string;
  errorMessage?: string;

  /**
   * Query the provider - must be implemented by each provider
   */
  abstract query(request: QueryRequest): Promise<QueryResponse>;

  /**
   * Check provider availability - must be implemented by each provider
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Check if provider is available for queries
   */
  isAvailable(): boolean {
    return this.status === 'available';
  }

  /**
   * Check if provider is currently rate limited
   */
  isRateLimited(): boolean {
    if (this.status === 'rate_limited') {
      return true;
    }

    // Check if we've exceeded requests per minute
    if (this.rateLimit.currentCount >= this.rateLimit.requestsPerMinute) {
      // Check if window has reset
      if (this.rateLimit.windowResetAt) {
        const resetTime = new Date(this.rateLimit.windowResetAt).getTime();
        if (Date.now() >= resetTime) {
          // Window has reset, clear the count
          this.rateLimit.currentCount = 0;
          this.rateLimit.windowResetAt = undefined;
          return false;
        }
      }
      return true;
    }

    return false;
  }

  /**
   * Update rate limit state after making a request
   */
  updateRateLimit(): void {
    this.rateLimit.currentCount++;

    // Set window reset time if not already set
    if (!this.rateLimit.windowResetAt) {
      const resetTime = new Date(Date.now() + 60000); // 1 minute from now
      this.rateLimit.windowResetAt = resetTime.toISOString();
    }
  }

  /**
   * Mark provider as available after successful health check
   */
  protected markAvailable(): void {
    this.status = 'available';
    this.lastChecked = new Date().toISOString();
    this.errorMessage = undefined;
  }

  /**
   * Mark provider as unavailable with error message
   */
  protected markUnavailable(error: string): void {
    this.status = 'unavailable';
    this.lastChecked = new Date().toISOString();
    this.errorMessage = error;
  }

  /**
   * Mark provider as rate limited
   */
  protected markRateLimited(): void {
    this.status = 'rate_limited';
    this.lastChecked = new Date().toISOString();
  }
}
