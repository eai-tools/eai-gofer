/**
 * Telemetry Integration for Memory & Learning System (Feature 001)
 *
 * T172: Add telemetry events for feature usage tracking
 *
 * This module provides telemetry wrapper functions for all Memory & Learning System
 * components, tracking usage patterns to improve the system.
 *
 * Privacy-compliant: All telemetry respects user settings and VSCode telemetry preferences.
 */

import { TelemetryCollector } from '../utils/telemetry';
import type { Memory } from './memory';
import type { CompactionSummary } from './compaction';

/**
 * Memory & Learning System telemetry events
 */
export class MemoryLearningTelemetry {
  private static telemetry = TelemetryCollector.getInstance();

  // ============================================================================
  // MemoryManager Telemetry
  // ============================================================================

  /**
   * Track memory creation
   */
  static trackMemorySaved(memory: Memory): void {
    this.telemetry.trackFeature('memory.saved', {
      category: memory.category,
      scope: memory.scope,
      hasTags: memory.tags.length > 0,
      tagCount: memory.tags.length,
    });
  }

  /**
   * Track memory search operations
   */
  static trackMemorySearch(
    query: {
      keywords?: string;
      category?: string;
      scope?: 'local' | 'global' | 'both';
      tags?: string[];
      dateRange?: { start: number; end: number };
    },
    resultCount: number,
    searchTime: number
  ): void {
    this.telemetry.trackFeature('memory.searched', {
      hasCategory: query.category !== undefined,
      hasScope: query.scope !== undefined,
      hasTagFilter: (query.tags?.length || 0) > 0,
      hasKeywordSearch: query.keywords !== undefined,
      hasDateRange: query.dateRange !== undefined,
      resultCount,
    });

    this.telemetry.trackPerformance('memory.searchTime', searchTime, {
      resultCount,
    });
  }

  /**
   * Track memory deletion
   */
  static trackMemoryForgotten(memoryId: string, scope: 'local' | 'global'): void {
    this.telemetry.trackFeature('memory.forgotten', {
      scope,
    });
  }

  /**
   * Track memory load operations
   */
  static trackMemoryLoaded(memoryId: string, found: boolean): void {
    this.telemetry.trackFeature('memory.loaded', {
      found,
    });
  }

  /**
   * Track memory validation errors
   */
  static trackMemoryValidationError(errors: string[]): void {
    this.telemetry.trackError('memory.validation_failed', errors.join(', '), {
      errorCount: errors.length,
    });
  }

  // ============================================================================
  // HintLoader Telemetry
  // ============================================================================

  /**
   * Track hint discovery operations
   */
  static trackHintDiscovery(hintCount: number, discoveryTime: number): void {
    this.telemetry.trackFeature('hint.discovered', {
      hintCount,
    });

    this.telemetry.trackPerformance('hint.discoveryTime', discoveryTime, {
      hintCount,
    });
  }

  /**
   * Track hint loading
   */
  static trackHintLoaded(hintPath: string, success: boolean, cacheHit: boolean): void {
    this.telemetry.trackFeature('hint.loaded', {
      success,
      cacheHit,
    });
  }

  /**
   * Track hint context matching
   */
  static trackHintContextMatch(
    context: {
      specId?: string;
      taskId?: string;
      phase?: string;
    },
    matchCount: number
  ): void {
    this.telemetry.trackFeature('hint.context_matched', {
      hasSpecId: context.specId !== undefined,
      hasTaskId: context.taskId !== undefined,
      hasPhase: context.phase !== undefined,
      matchCount,
    });
  }

  /**
   * Track hint cache operations
   */
  static trackHintCacheInvalidated(): void {
    this.telemetry.trackFeature('hint.cache_invalidated', {});
  }

  /**
   * Track hint loading errors
   */
  static trackHintLoadError(hintPath: string, error: string): void {
    this.telemetry.trackError('hint.load_failed', error, {
      reason: error.includes('ENOENT') ? 'file_not_found' : 'parse_error',
    });
  }

  // ============================================================================
  // DependencyGraph Telemetry
  // ============================================================================

  /**
   * Track dependency additions
   */
  static trackDependencyAdded(
    fromSpec: string,
    toSpec: string,
    type: 'required_by' | 'uses_api_from' | 'blocks'
  ): void {
    this.telemetry.trackFeature('dependency.added', {
      type,
    });
  }

  /**
   * Track cycle detection
   */
  static trackCycleDetected(fromSpec: string, toSpec: string): void {
    this.telemetry.trackError('dependency.cycle_detected', 'Dependency would create cycle', {
      fromSpec,
      toSpec,
    });
  }

  /**
   * Track dependency graph operations
   */
  static trackDependencyOperation(
    operation: 'getExecutionOrder' | 'getImpactedSpecs' | 'validate',
    specCount: number
  ): void {
    this.telemetry.trackFeature(`dependency.${operation}`, {
      specCount,
    });
  }

  /**
   * Track dependency graph load/save
   */
  static trackDependencyGraphPersistence(
    operation: 'load' | 'save',
    nodeCount: number,
    edgeCount: number
  ): void {
    this.telemetry.trackFeature(`dependency.${operation}`, {
      nodeCount,
      edgeCount,
    });
  }

  // ============================================================================
  // ContextCompactor Telemetry
  // ============================================================================

  /**
   * Track context analysis
   */
  static trackContextAnalysis(
    estimatedTokens: number,
    usagePercentage: number,
    shouldCompact: boolean
  ): void {
    this.telemetry.trackFeature('context.analyzed', {
      shouldCompact,
    });

    this.telemetry.trackPerformance('context.usage', usagePercentage, {
      estimatedTokens,
    });
  }

  /**
   * Track context compaction
   */
  static trackCompaction(summary: CompactionSummary): void {
    const reductionPercent =
      summary.tokensSaved && summary.strategy.targetReduction
        ? (summary.tokensSaved / (summary.tokensSaved + summary.preservedTasks.length)) * 100
        : 0;

    this.telemetry.trackFeature('context.compacted', {
      tasksCompacted: summary.tasksCompacted.length,
      tasksPreserved: summary.preservedTasks.length,
      preserveLastN: summary.strategy.preserveLastN,
      summarizeBatchSize: summary.strategy.summarizeBatchSize,
    });

    this.telemetry.trackPerformance('context.tokensSaved', summary.tokensSaved || 0, {
      reductionPercent,
    });
  }

  /**
   * Track compaction threshold checks
   */
  static trackCompactionThreshold(
    usagePercentage: number,
    threshold: number,
    triggered: boolean
  ): void {
    this.telemetry.trackFeature('context.threshold_check', {
      triggered,
    });

    this.telemetry.trackPerformance(
      'context.thresholdMargin',
      Math.abs(usagePercentage - threshold),
      {
        triggered,
      }
    );
  }

  /**
   * Track compaction rollback
   */
  static trackCompactionRollback(sessionId: string, success: boolean): void {
    this.telemetry.trackFeature('context.rollback', {
      success,
    });

    if (!success) {
      this.telemetry.trackError('context.rollback_failed', 'Failed to restore from backup');
    }
  }

  /**
   * Track session backup operations
   */
  static trackSessionBackup(sessionId: string, contextSize: number): void {
    this.telemetry.trackFeature('context.backup_created', {});

    this.telemetry.trackPerformance('context.backupSize', contextSize);
  }

  // ============================================================================
  // Feature Usage Aggregation
  // ============================================================================

  /**
   * Track overall Memory & Learning System usage
   */
  static trackFeatureUsage(stats: {
    memoriesStored: number;
    hintsLoaded: number;
    dependenciesTracked: number;
    compactionsPerformed: number;
  }): void {
    this.telemetry.trackFeature('memory_learning_system.usage', {
      memoriesStored: stats.memoriesStored,
      hintsLoaded: stats.hintsLoaded,
      dependenciesTracked: stats.dependenciesTracked,
      compactionsPerformed: stats.compactionsPerformed,
    });
  }

  /**
   * Track autonomous execution session
   */
  static trackAutonomousSession(stats: {
    sessionId: string;
    specId: string;
    tasksCompleted: number;
    memoriesCreated: number;
    hintsApplied: number;
    compactionsTriggered: number;
    duration: number;
  }): void {
    this.telemetry.trackFeature('autonomous.session_completed', {
      tasksCompleted: stats.tasksCompleted,
      memoriesCreated: stats.memoriesCreated,
      hintsApplied: stats.hintsApplied,
      compactionsTriggered: stats.compactionsTriggered,
    });

    this.telemetry.trackPerformance('autonomous.sessionDuration', stats.duration, {
      tasksCompleted: stats.tasksCompleted,
    });
  }
}

/**
 * Convenience wrapper for tracking operations with automatic error handling
 */
export async function trackOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  onSuccess?: (result: T) => void,
  onError?: (error: Error) => void
): Promise<T> {
  const startTime = Date.now();
  const telemetry = TelemetryCollector.getInstance();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    telemetry.trackPerformance(`${operationName}.duration`, duration);

    if (onSuccess) {
      onSuccess(result);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    telemetry.trackPerformance(`${operationName}.duration`, duration);
    telemetry.trackError(
      `${operationName}.failed`,
      error instanceof Error ? error.message : String(error)
    );

    if (onError) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }

    throw error;
  }
}

/**
 * Export telemetry instance for direct access
 */
export const telemetry = MemoryLearningTelemetry;
