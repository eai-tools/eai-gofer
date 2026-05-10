/**
 * Timeout Constants for Gofer Extension
 *
 * All timeout values in milliseconds
 */

export const TIMEOUTS = {
  /** ms - BranchSpecManager initialization timeout */
  BRANCH_SPEC_INIT_TIMEOUT: 10000,

  /** ms - Per-spec file loading timeout (reads spec.md, tasks.md, plan.md) */
  SPEC_LOAD_TIMEOUT: 3000,

  /** ms - Spec directory discovery timeout (branchSpecManager path) */
  SPEC_DIR_DISCOVERY_TIMEOUT: 5000,

  /** ms - Spec directory read timeout (direct fs.readdir fallback) */
  SPEC_DIR_READ_TIMEOUT: 2000,

  /** ms - Delay before checking status updates */
  STATUS_CHECK_DELAY: 5000,

  /** ms - Status bar message display duration */
  STATUS_BAR_MESSAGE_DURATION: 3000,

  /** ms - Error recovery level 1 delay (10 seconds) */
  ERROR_RECOVERY_LEVEL_1: 10000,

  /** ms - Error recovery level 2 delay (30 seconds) */
  ERROR_RECOVERY_LEVEL_2: 30000,

  /** ms - Error recovery level 3 delay (60 seconds) */
  ERROR_RECOVERY_LEVEL_3: 60000,

  /** ms - Mask threshold for observation masking (5 minutes) */
  MASK_THRESHOLD: 5 * 60 * 1000,

  /** ms - Context health monitoring base interval (slow polling) */
  CONTEXT_HEALTH_BASE_INTERVAL: 60000,

  /** ms - Context health monitoring active interval (fast polling) */
  CONTEXT_HEALTH_ACTIVE_INTERVAL: 10000,

  /** ms - Context health monitoring inactive interval (medium polling) */
  CONTEXT_HEALTH_INACTIVE_INTERVAL: 30000,

  /** ms - Context health check interval (default for ContextHealthMonitor) */
  CONTEXT_HEALTH_CHECK_INTERVAL: 5000,

  /** ms - Active threshold for activity detection (30 seconds) */
  ACTIVE_THRESHOLD: 30 * 1000,
} as const;

/**
 * Timeout type derived from TIMEOUTS object
 */
export type Timeout = (typeof TIMEOUTS)[keyof typeof TIMEOUTS];
