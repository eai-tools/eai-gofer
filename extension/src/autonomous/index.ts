/**
 * Autonomous Claude Code Driver
 *
 * This module enables EAI-GOFER to autonomously drive Claude Code terminals,
 * monitor execution, handle errors, manage context windows, and escalate
 * questions to users.
 *
 * @module autonomous
 */

// Implemented modules
export { TerminalManager } from './TerminalManager';
export { OutputMonitor } from './OutputMonitor';
export { ErrorRecovery } from './ErrorRecovery';
export { ProgressReporter } from './ProgressReporter';
export { AutonomousDriver } from './AutonomousDriver';

// Not yet implemented - will be added in later phases
// export { ContextManager } from './ContextManager';
// export { QuestionRouter } from './QuestionRouter';
// export { ParallelCoordinator } from './ParallelCoordinator';

export * from './types';
