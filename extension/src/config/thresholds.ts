/**
 * Threshold Constants for Gofer Extension
 *
 * All threshold values as decimals (0.0 to 1.0) or percentages (0-100)
 */

export const THRESHOLDS = {
  /** Context usage threshold for warning state (50%) */
  CONTEXT_WARNING: 0.5,

  /** Context usage threshold for critical state (70%) */
  CONTEXT_CRITICAL: 0.7,

  /** Minimum priority score for memory retention (65%) */
  MEMORY_PRIORITY_CUTOFF: 0.65,

  /** Minimum test coverage percentage (30%) */
  COVERAGE_MINIMUM: 0.3,

  /** Token warning threshold for progress reporting (150k tokens) */
  TOKEN_WARNING: 150000,
} as const;

/**
 * Threshold type derived from THRESHOLDS object
 */
export type Threshold = (typeof THRESHOLDS)[keyof typeof THRESHOLDS];
