/**
 * Provider Error Classes
 *
 * Custom error types for LLM provider operations, enabling
 * specific error handling for different failure modes.
 */

import { ProviderId } from '../types';

/**
 * Error codes for provider failures
 */
export enum ProviderErrorCode {
  /** API key is missing or invalid */
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  /** Provider returned a rate limit error (429) */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Request timed out */
  TIMEOUT = 'TIMEOUT',
  /** Network or connection error */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Provider returned an API error */
  API_ERROR = 'API_ERROR',
  /** Invalid request parameters */
  INVALID_REQUEST = 'INVALID_REQUEST',
  /** Response parsing failed */
  PARSE_ERROR = 'PARSE_ERROR',
  /** Provider is not configured */
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  /** Unknown error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for LLM provider failures
 */
export class ProviderError extends Error {
  /** Error classification code */
  readonly code: ProviderErrorCode;

  /** Which provider threw the error */
  readonly providerId: ProviderId;

  /** HTTP status code if applicable */
  readonly statusCode?: number;

  /** Original error if wrapped */
  readonly cause?: Error;

  /** Whether this error is retryable */
  readonly retryable: boolean;

  constructor(
    message: string,
    code: ProviderErrorCode,
    providerId: ProviderId,
    options?: {
      statusCode?: number;
      cause?: Error;
      retryable?: boolean;
    }
  ) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.providerId = providerId;
    this.statusCode = options?.statusCode;
    this.cause = options?.cause;
    this.retryable = options?.retryable ?? this.isRetryableByDefault(code);

    // Maintain proper stack trace for V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProviderError);
    }
  }

  /**
   * Determine if an error code is retryable by default
   */
  private isRetryableByDefault(code: ProviderErrorCode): boolean {
    switch (code) {
      case ProviderErrorCode.RATE_LIMITED:
      case ProviderErrorCode.TIMEOUT:
      case ProviderErrorCode.NETWORK_ERROR:
        return true;
      case ProviderErrorCode.AUTHENTICATION_FAILED:
      case ProviderErrorCode.INVALID_REQUEST:
      case ProviderErrorCode.NOT_CONFIGURED:
        return false;
      default:
        return false;
    }
  }

  /**
   * Create a human-readable error message
   */
  toString(): string {
    let msg = `[${this.providerId}] ${this.code}: ${this.message}`;
    if (this.statusCode) {
      msg += ` (HTTP ${this.statusCode})`;
    }
    return msg;
  }

  /**
   * Convert to a plain object for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      providerId: this.providerId,
      statusCode: this.statusCode,
      retryable: this.retryable,
      stack: this.stack,
    };
  }
}

/**
 * Create an authentication error
 */
export function authenticationError(
  providerId: ProviderId,
  message = 'Authentication failed - check API key'
): ProviderError {
  return new ProviderError(message, ProviderErrorCode.AUTHENTICATION_FAILED, providerId, {
    statusCode: 401,
  });
}

/**
 * Create a rate limit error
 */
export function rateLimitError(
  providerId: ProviderId,
  message = 'Rate limit exceeded'
): ProviderError {
  return new ProviderError(message, ProviderErrorCode.RATE_LIMITED, providerId, {
    statusCode: 429,
    retryable: true,
  });
}

/**
 * Create a timeout error
 */
export function timeoutError(providerId: ProviderId, timeoutMs: number): ProviderError {
  return new ProviderError(
    `Request timed out after ${timeoutMs}ms`,
    ProviderErrorCode.TIMEOUT,
    providerId,
    { retryable: true }
  );
}

/**
 * Create a network error
 */
export function networkError(providerId: ProviderId, cause?: Error): ProviderError {
  return new ProviderError(
    cause?.message ?? 'Network error',
    ProviderErrorCode.NETWORK_ERROR,
    providerId,
    { cause, retryable: true }
  );
}

/**
 * Create an API error from provider response
 */
export function apiError(
  providerId: ProviderId,
  message: string,
  statusCode?: number
): ProviderError {
  return new ProviderError(message, ProviderErrorCode.API_ERROR, providerId, {
    statusCode,
    retryable: statusCode ? statusCode >= 500 : false,
  });
}

/**
 * Create a not configured error
 */
export function notConfiguredError(providerId: ProviderId): ProviderError {
  return new ProviderError(
    `Provider ${providerId} is not configured - API key missing`,
    ProviderErrorCode.NOT_CONFIGURED,
    providerId
  );
}

/**
 * Wrap an unknown error as a ProviderError
 */
export function wrapError(providerId: ProviderId, error: unknown): ProviderError {
  if (error instanceof ProviderError) {
    return error;
  }

  const cause = error instanceof Error ? error : new Error(String(error));
  return new ProviderError(cause.message, ProviderErrorCode.UNKNOWN, providerId, {
    cause,
  });
}
