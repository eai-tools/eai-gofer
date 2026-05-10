/**
 * Interval Constants for Gofer Extension
 *
 * All interval values in milliseconds
 */

export const INTERVALS = {
  /** ms - Cache staleness check interval (1 minute) */
  CACHE_CHECK_INTERVAL: 60000,

  /** ms - Staleness check interval (3 minutes) */
  STALENESS_CHECK_INTERVAL: 180000,

  /** ms - Default time-to-live for cache entries (5 minutes) */
  TTL_DEFAULT: 300000,

  /** ms - Progress reporting elapsed time display interval (1 minute) */
  PROGRESS_REPORT_INTERVAL: 60000,

  /** ms - Context usage logger poll interval (1 minute) */
  CONTEXT_USAGE_LOG_INTERVAL: 60000,

  /** ms - Milliseconds per minute (time unit conversion) */
  MS_PER_MINUTE: 60000,

  /** ms - Milliseconds per hour (time unit conversion) */
  MS_PER_HOUR: 3600000,

  /** ms - Milliseconds per day (time unit conversion) */
  MS_PER_DAY: 86400000,
} as const;

/**
 * Interval type derived from INTERVALS object
 */
export type Interval = (typeof INTERVALS)[keyof typeof INTERVALS];
