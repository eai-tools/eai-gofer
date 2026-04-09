/**
 * Gofer Configuration Constants
 *
 * Centralized configuration values extracted from magic numbers.
 * All constants are organized by domain (timeouts, thresholds, limits, intervals).
 */

export { TIMEOUTS, type Timeout } from './timeouts';
export { THRESHOLDS, type Threshold } from './thresholds';
export { LIMITS, type Limit } from './limits';
export { INTERVALS, type Interval } from './intervals';
export {
  WORKFLOW_PROFILES,
  type WorkflowProfile,
  getWorkflowProfile,
  isWorkflowProfile,
  normalizeWorkflowProfile,
} from './workflowProfile';
