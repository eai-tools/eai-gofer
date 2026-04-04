/**
 * Rate Limiter
 *
 * Prevents abuse of expensive operations by limiting request frequency.
 * Uses token bucket algorithm for smooth rate limiting.
 *
 * Engineering Remediation Phase 5 - T042 (US8 - Security)
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  identifier: string; // Unique identifier for this limit
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Timestamp when limit resets
  error?: string;
}

type RateLimitDecoratorTarget = object;

/**
 * Request record for tracking
 */
interface RequestRecord {
  timestamps: number[];
  resetAt: number;
}

/**
 * Rate Limiter
 *
 * Implements sliding window rate limiting with per-operation limits.
 *
 * Example:
 * - Context building: 10 requests/minute
 * - Code generation: 5 requests/minute
 * - File sync: 20 requests/minute
 */
export class RateLimiter {
  private records: Map<string, RequestRecord> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  /**
   * Register a rate limit configuration
   *
   * @param config - Rate limit configuration
   */
  public registerLimit(config: RateLimitConfig): void {
    this.configs.set(config.identifier, config);
  }

  /**
   * Check if operation is allowed under rate limit
   *
   * @param operation - Operation identifier
   * @param key - Optional key for per-user/per-resource limits
   * @returns Rate limit check result
   */
  public checkLimit(operation: string, key: string = 'default'): RateLimitResult {
    const config = this.configs.get(operation);

    if (!config) {
      // No limit configured - allow
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: Date.now(),
      };
    }

    const recordKey = `${operation}:${key}`;
    const now = Date.now();

    // Get or create record
    let record = this.records.get(recordKey);
    if (!record) {
      record = {
        timestamps: [],
        resetAt: now + config.windowMs,
      };
      this.records.set(recordKey, record);
    }

    // Remove expired timestamps (outside sliding window)
    const windowStart = now - config.windowMs;
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    // Update reset time
    if (record.timestamps.length === 0) {
      record.resetAt = now + config.windowMs;
    }

    // Check if limit exceeded
    if (record.timestamps.length >= config.maxRequests) {
      const oldestTimestamp = record.timestamps[0];
      const resetAt = oldestTimestamp + config.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        error: `Rate limit exceeded for ${operation}. Try again at ${new Date(resetAt).toISOString()}`,
      };
    }

    // Record this request
    record.timestamps.push(now);

    return {
      allowed: true,
      remaining: config.maxRequests - record.timestamps.length,
      resetAt: record.resetAt,
    };
  }

  /**
   * Execute operation with rate limiting
   *
   * @param operation - Operation identifier
   * @param fn - Function to execute
   * @param key - Optional key for per-user/per-resource limits
   * @returns Promise resolving to function result
   * @throws Error if rate limit exceeded
   */
  public async execute<T>(
    operation: string,
    fn: () => Promise<T>,
    key: string = 'default'
  ): Promise<T> {
    const result = this.checkLimit(operation, key);

    if (!result.allowed) {
      throw new Error(result.error || 'Rate limit exceeded');
    }

    return await fn();
  }

  /**
   * Get current status for operation
   *
   * @param operation - Operation identifier
   * @param key - Optional key
   * @returns Current rate limit status
   */
  public getStatus(operation: string, key: string = 'default'): RateLimitResult {
    const config = this.configs.get(operation);

    if (!config) {
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: Date.now(),
      };
    }

    const recordKey = `${operation}:${key}`;
    const record = this.records.get(recordKey);

    if (!record) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: Date.now() + config.windowMs,
      };
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);

    return {
      allowed: validTimestamps.length < config.maxRequests,
      remaining: config.maxRequests - validTimestamps.length,
      resetAt: record.resetAt,
    };
  }

  /**
   * Reset rate limit for operation
   *
   * @param operation - Operation identifier
   * @param key - Optional key
   */
  public reset(operation: string, key: string = 'default'): void {
    const recordKey = `${operation}:${key}`;
    this.records.delete(recordKey);
  }

  /**
   * Reset all rate limits
   */
  public resetAll(): void {
    this.records.clear();
  }

  /**
   * Cleanup expired records (garbage collection)
   *
   * Call periodically to prevent memory leaks
   */
  public cleanup(): void {
    const now = Date.now();

    for (const [key, record] of this.records.entries()) {
      // Remove records with no recent activity
      if (record.resetAt < now && record.timestamps.length === 0) {
        this.records.delete(key);
      }
    }
  }

  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Start automatic cleanup of expired records
   *
   * @param intervalMs - Cleanup interval in milliseconds (default: 5 minutes)
   */
  public startAutoCleanup(intervalMs: number = 5 * 60 * 1000): void {
    this.stopAutoCleanup();
    this.cleanupIntervalId = setInterval(() => this.cleanup(), intervalMs);
  }

  /**
   * Stop automatic cleanup and dispose the interval
   */
  public stopAutoCleanup(): void {
    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Dispose all resources (call during extension deactivation)
   */
  public dispose(): void {
    this.stopAutoCleanup();
    this.records.clear();
  }
}

/**
 * Global rate limiter instance
 */
const globalRateLimiter = new RateLimiter();

// Register default limits
globalRateLimiter.registerLimit({
  identifier: 'context-building',
  maxRequests: 10,
  windowMs: 60 * 1000, // 10 requests per minute
});

globalRateLimiter.registerLimit({
  identifier: 'code-generation',
  maxRequests: 5,
  windowMs: 60 * 1000, // 5 requests per minute
});

globalRateLimiter.registerLimit({
  identifier: 'file-sync',
  maxRequests: 20,
  windowMs: 60 * 1000, // 20 requests per minute
});

globalRateLimiter.registerLimit({
  identifier: 'llm-request',
  maxRequests: 30,
  windowMs: 60 * 1000, // 30 requests per minute
});

globalRateLimiter.registerLimit({
  identifier: 'migration',
  maxRequests: 3,
  windowMs: 60 * 1000, // 3 migrations per minute
});

// Start auto-cleanup with proper lifecycle management
globalRateLimiter.startAutoCleanup();

export { globalRateLimiter };

/**
 * Decorator for rate-limited methods
 *
 * @param operation - Operation identifier
 * @param keyExtractor - Function to extract rate limit key from arguments
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * class ContextBuilder {
 *   @rateLimit('context-building')
 *   async buildContext(): Promise<string> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export function rateLimit(operation: string, keyExtractor?: (...args: unknown[]) => string) {
  return function (
    target: RateLimitDecoratorTarget,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const key = keyExtractor ? keyExtractor(...args) : 'default';
      return await globalRateLimiter.execute(
        operation,
        () => originalMethod.apply(this, args),
        key
      );
    };

    return descriptor;
  };
}
