/**
 * Autonomous Claude Code Driver
 *
 * This module enables Gofer to autonomously drive Claude Code terminals,
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

// Context Health Monitoring (Spec 011/012)
export { ContextHealthMonitor } from './ContextHealthMonitor';
export type {
  ContextHealthStatus,
  ContextHealthConfig,
  ContextHealthEvents,
  HealthStatus,
  TokenBreakdown,
  ContextAnalysisInput,
} from './ContextHealthMonitor';
export { AutoHandoffTrigger } from './AutoHandoffTrigger';
export { WorkspaceContextProvider } from './WorkspaceContextProvider';
export { ContextBridgeWriter } from './ContextBridgeWriter';
export { ClaudeSessionReader } from './ClaudeSessionReader';
export type { SessionInfo, SessionUsage } from './ClaudeSessionReader';
export { ContinuousMemoryWriter } from './ContinuousMemoryWriter';
export { MemoryHookManager } from './MemoryHookManager';
export type {
  ToolCallContext,
  TaskCompletionContext,
  ErrorRecoveryContext,
  UserClarificationContext,
  ToolCallMemories,
  HookResult,
} from './MemoryHookManager';
export { HookBridgeWatcher } from './HookBridgeWatcher';
export type { BridgeData } from './HookBridgeWatcher';
export { MultiSessionBridgeWatcher } from './MultiSessionBridgeWatcher';
export { ContextUsageLogger } from './ContextUsageLogger';
export type {
  ContextUsageLogEntry,
  ContextUsageLoggerConfig,
  HealthCheckLogInput,
  MaskingEventLogInput,
  StageTransitionLogInput,
  MemorySaveLogInput,
  MemorySearchLogInput,
  MemoryLoadLogInput,
  LoadingDecisionLogInput,
} from './ContextUsageLogger';

// Not yet implemented - will be added in later phases
// export { ContextManager } from './ContextManager';
// export { QuestionRouter } from './QuestionRouter';
// export { ParallelCoordinator } from './ParallelCoordinator';

export * from './types';
