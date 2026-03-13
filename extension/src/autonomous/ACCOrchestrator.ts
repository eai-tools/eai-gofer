/**
 * ACCOrchestrator - Adaptive Context Compaction Orchestrator
 *
 * Connects to ContextHealthMonitor ACC events and delegates progressive
 * compaction to existing components (ObservationMasker, ContextBuilder,
 * SubAgentDispatcher, ContextCompactor).
 *
 * 5 stages of compaction at increasing utilization thresholds:
 *   Stage 1 (70%): Delegation advisory — log + update SubAgentDispatcher
 *   Stage 2 (80%): Observation masking — mask old observations aggressively
 *   Stage 3 (85%): Fast pruning — enable budget cap enforcement (truncate mode)
 *   Stage 4 (90%): Aggressive masking — force all observations to masked tier
 *   Stage 5 (99%): Full compaction — invoke ContextCompactor if available
 *
 * @see .specify/specs/024-wire-contextbuilder-acc/tasks.md T028-T036
 */

import type * as vscode from 'vscode';
import type { ContextHealthMonitor, ContextHealthStatus } from './ContextHealthMonitor';
import type { ContextBuilder } from './ContextBuilder';
import type { ObservationMasker } from './ObservationMasker';
import type { ContextCompactor } from './ContextCompactor';
import type { ContextBridgeWriter } from './ContextBridgeWriter';
import type { TaskContext } from './ContextBuilder';
import { Logger } from '../utils/logger';

/** Duck-typed interface for SubAgentDispatcher (null-safe). */
export interface ACCSubAgentDispatcher {
  updateUtilization(utilizationPercent: number): void;
}

/**
 * ACCOrchestrator manages progressive context compaction across 5 stages.
 */
export class ACCOrchestrator implements vscode.Disposable {
  private readonly logger: Logger;
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly lastStageTimestamps: Map<number, number> = new Map();
  private static readonly cooldownMs = 30000; // 30 seconds
  private contextBridgeWriter: ContextBridgeWriter | null = null;
  private currentTaskContext: TaskContext | null = null;

  constructor(
    private readonly contextBuilder: ContextBuilder,
    private readonly observationMasker: ObservationMasker,
    private readonly subAgentDispatcher: ACCSubAgentDispatcher | null = null,
    private readonly contextCompactor: ContextCompactor | null = null
  ) {
    this.logger = Logger.for('ACCOrchestrator');
    this.logger.debug('ACCOrchestrator initialized');
  }

  /**
   * Connect to a ContextHealthMonitor to receive ACC threshold events.
   * Follows the AutoHandoffTrigger.connect() pattern.
   */
  connect(monitor: ContextHealthMonitor): void {
    const stage1Handler = (status: ContextHealthStatus): void => {
      this.executeStage(1, () => this.handleDelegationAdvisory(status));
    };

    const stage2Handler = (status: ContextHealthStatus): void => {
      this.executeStage(2, () => this.handleObservationMasking(status));
    };

    const stage3Handler = (_status: ContextHealthStatus): void => {
      this.executeStage(3, () => this.handleFastPruning());
    };

    const stage4Handler = (_status: ContextHealthStatus): void => {
      this.executeStage(4, () => this.handleAggressiveMasking());
    };

    const stage5Handler = (_status: ContextHealthStatus): void => {
      this.executeStage(5, () => this.handleFullCompaction());
    };

    monitor.on('acc-delegation-advisory', stage1Handler);
    monitor.on('acc-observation-masking', stage2Handler);
    monitor.on('acc-fast-pruning', stage3Handler);
    monitor.on('acc-aggressive-masking', stage4Handler);
    monitor.on('acc-full-compaction', stage5Handler);

    this.disposables.push({
      dispose: () => {
        monitor.off('acc-delegation-advisory', stage1Handler);
        monitor.off('acc-observation-masking', stage2Handler);
        monitor.off('acc-fast-pruning', stage3Handler);
        monitor.off('acc-aggressive-masking', stage4Handler);
        monitor.off('acc-full-compaction', stage5Handler);
      },
    });

    this.logger.debug('Connected to ContextHealthMonitor ACC events');
  }

  /**
   * Execute a stage handler with cooldown and error protection.
   * Higher stages always supersede lower ones (no cooldown check for higher stages).
   */
  private executeStage(stageNumber: number, action: () => void): void {
    const now = Date.now();
    const lastTime = this.lastStageTimestamps.get(stageNumber) || 0;

    if (now - lastTime < ACCOrchestrator.cooldownMs) {
      this.logger.debug(`ACC stage ${stageNumber} skipped (cooldown)`);
      return;
    }

    this.lastStageTimestamps.set(stageNumber, now);

    try {
      action();
    } catch (error) {
      this.logger.warn(`ACC stage ${stageNumber} error (non-fatal)`, error as Error);
    }
  }

  /**
   * Stage 1 (70%): Log delegation advisory and update SubAgentDispatcher.
   */
  private handleDelegationAdvisory(status: ContextHealthStatus): void {
    this.logger.info('ACC Stage 1: Delegation advisory', {
      utilization: status.utilizationPercent,
    });

    if (this.subAgentDispatcher) {
      this.subAgentDispatcher.updateUtilization(status.utilizationPercent);
    }
  }

  /**
   * Stage 2 (80%): Mask old observations with reduced age thresholds.
   */
  private handleObservationMasking(status: ContextHealthStatus): void {
    this.logger.info('ACC Stage 2: Observation masking', {
      utilization: status.utilizationPercent,
    });

    // Reduce age threshold to accelerate masking
    this.observationMasker.updateConfig({
      ageThresholdTurns: 5, // Reduced from default 10
    });

    const currentTurn = this.contextBuilder.getCurrentTurn();
    const result = this.observationMasker.maskOldObservations(currentTurn);

    this.logger.info('ACC Stage 2: Masking complete', {
      maskedCount: result.maskedCount,
      tokensSaved: result.tokensSaved,
    });

    this.refreshEnrichedContext();
  }

  /**
   * Stage 3 (85%): Enable budget cap enforcement in truncate mode.
   */
  private handleFastPruning(): void {
    this.logger.info('ACC Stage 3: Fast pruning — enabling budget enforcement');

    this.contextBuilder.updateBudgetEnforcement(true, 'truncate');

    this.refreshEnrichedContext();
  }

  /**
   * Stage 4 (90%): Force all observations to masked tier.
   */
  private handleAggressiveMasking(): void {
    this.logger.info('ACC Stage 4: Aggressive masking — forcing all observations to masked');

    const observations = this.observationMasker.getAllObservations();
    let forcedCount = 0;

    for (const obs of observations) {
      if (obs.decayTier !== 'masked') {
        obs.decayTier = 'masked';
        obs.masked = true;
        obs.maskedAt = Date.now();
        forcedCount++;
      }
    }

    this.logger.info('ACC Stage 4: Aggressive masking complete', { forcedCount });

    this.refreshEnrichedContext();
  }

  /**
   * Stage 5 (99%): Full compaction via ContextCompactor if available.
   */
  private handleFullCompaction(): void {
    if (!this.contextCompactor) {
      this.logger.warn('No ContextCompactor available, skipping LLM compaction');
      return;
    }

    this.logger.info('ACC Stage 5: Full compaction — invoking ContextCompactor');

    // Fire and forget — compaction is async but we don't block the event handler
    const now = Date.now();
    this.contextCompactor
      .compact(
        {
          id: 'acc-compaction',
          specId: '',
          status: 'running',
          currentTask: null,
          completedTasks: [],
          failedTasks: [],
          context: '',
          compactionHistory: [],
          startedAt: now,
          lastUpdatedAt: now,
        },
        {
          preserveLastN: 5,
          targetReduction: 60,
        }
      )
      .then((summary) => {
        this.logger.info('ACC Stage 5: Compaction complete', {
          tasksCompacted: summary.tasksCompacted.length,
          tokensSaved: summary.tokensSaved,
        });
      })
      .catch((error) => {
        this.logger.warn('ACC Stage 5: Compaction failed (non-fatal)', error as Error);
      });
  }

  /**
   * Set the context bridge writer for refreshing enriched context after compaction.
   */
  setContextBridgeWriter(writer: ContextBridgeWriter): void {
    this.contextBridgeWriter = writer;
  }

  /**
   * Set the current task context for enriched context refresh.
   */
  setCurrentTaskContext(task: TaskContext): void {
    this.currentTaskContext = task;
  }

  /**
   * Refresh the enriched-context bridge file so MCP tools serve compacted data.
   * Fire-and-forget — errors are logged but do not block ACC stages.
   */
  private refreshEnrichedContext(): void {
    if (!this.contextBridgeWriter || !this.currentTaskContext) {
      this.logger.debug('Skipping enriched context refresh (no writer or task context)');
      return;
    }

    this.contextBridgeWriter
      .writeEnrichedContext(this.currentTaskContext)
      .then(() => {
        this.logger.debug('Enriched context refreshed after ACC stage');
      })
      .catch((error) => {
        this.logger.warn('Failed to refresh enriched context (non-fatal)', error as Error);
      });
  }

  /**
   * Reset session state (cooldown timestamps) so ACC stages can re-trigger
   * after a /clear or new session start.
   */
  resetSessionState(): void {
    this.lastStageTimestamps.clear();
    this.logger.debug('ACC session state reset');
  }

  /**
   * Dispose all event listeners.
   */
  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
    this.lastStageTimestamps.clear();
    this.logger.debug('ACCOrchestrator disposed');
  }
}
