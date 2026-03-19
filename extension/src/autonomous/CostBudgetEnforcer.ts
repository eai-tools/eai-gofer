/**
 * CostBudgetEnforcer — tracks cumulative token usage and cost,
 * enforces configurable budget limits per pipeline run.
 *
 * Emits budget_warning / budget_exceeded events to RunLedger
 * on status transitions (not repeated emissions).
 */

import { Logger } from '../utils/logger';
import type { RunLedger } from './RunLedger';
import { calculateCost } from '../config/pricing';

/** Default provider used when providerId is not specified */
const DEFAULT_PROVIDER = 'anthropic';

export type BudgetEnforcementMode = 'advisory' | 'truncate' | 'blocking';

export type BudgetStatus = 'healthy' | 'warning' | 'exceeded';

export interface CostBudgetConfig {
  maxCostUsd: number;
  maxTokensPerRun: number;
  enforcementMode: BudgetEnforcementMode;
  warningThreshold: number;
}

export interface CostSnapshot {
  currentCostUsd: number;
  currentTokens: number;
  percentUsed: number;
  status: BudgetStatus;
}

export const BUDGET_DEFAULTS: CostBudgetConfig = {
  maxCostUsd: 10.0,
  maxTokensPerRun: 500_000,
  enforcementMode: 'advisory',
  warningThreshold: 0.8,
};

export class CostBudgetEnforcer {
  private readonly logger = Logger.for('CostBudgetEnforcer');
  private readonly config: CostBudgetConfig;
  private readonly runLedger?: RunLedger;

  private currentCostUsd = 0;
  private currentTokens = 0;
  private lastStatus: BudgetStatus = 'healthy';

  constructor(config: Partial<CostBudgetConfig> = {}, runLedger?: RunLedger) {
    this.config = { ...BUDGET_DEFAULTS, ...config };
    this.runLedger = runLedger;
  }

  /**
   * Record token usage and return the updated cost snapshot.
   * Emits ledger events on status transitions.
   *
   * @param modelId - Optional model identifier for model-specific pricing (Bug #2/#3 fix)
   */
  recordUsage(inputTokens: number, outputTokens: number, providerId?: string, modelId?: string): CostSnapshot {
    const provider = providerId ?? DEFAULT_PROVIDER;
    const cost = calculateCost(inputTokens, outputTokens, provider, modelId);
    this.currentCostUsd += cost;
    this.currentTokens += inputTokens + outputTokens;

    const snapshot = this.getSnapshot();

    // Emit ledger events on status transitions only
    if (snapshot.status === 'warning' && this.lastStatus === 'healthy') {
      this.emitBudgetEvent('budget_warning', 'warning', snapshot);
      this.logger.warn(
        `Budget warning: $${this.currentCostUsd.toFixed(2)} / $${this.config.maxCostUsd.toFixed(2)} (${Math.round(snapshot.percentUsed)}%)`
      );
    } else if (snapshot.status === 'exceeded' && this.lastStatus !== 'exceeded') {
      this.emitBudgetEvent('budget_exceeded', 'error', snapshot);
      this.logger.error(
        `Budget exceeded: $${this.currentCostUsd.toFixed(2)} / $${this.config.maxCostUsd.toFixed(2)}`
      );
    }

    this.lastStatus = snapshot.status;
    return snapshot;
  }

  /** Whether the pipeline can continue given current budget status */
  canProceed(): boolean {
    const snapshot = this.getSnapshot();
    if (snapshot.status !== 'exceeded') return true;
    // In blocking mode, exceeded = stop
    return this.config.enforcementMode !== 'blocking';
  }

  /** Return current budget state */
  getSnapshot(): CostSnapshot {
    const costPercent =
      this.config.maxCostUsd > 0 ? (this.currentCostUsd / this.config.maxCostUsd) * 100 : 0;
    const tokenPercent =
      this.config.maxTokensPerRun > 0
        ? (this.currentTokens / this.config.maxTokensPerRun) * 100
        : 0;
    const percentUsed = Math.max(costPercent, tokenPercent);

    let status: BudgetStatus = 'healthy';
    if (percentUsed >= 100) {
      status = 'exceeded';
    } else if (percentUsed >= this.config.warningThreshold * 100) {
      status = 'warning';
    }

    return {
      currentCostUsd: this.currentCostUsd,
      currentTokens: this.currentTokens,
      percentUsed,
      status,
    };
  }

  /** Reset counters for a new run */
  reset(): void {
    this.currentCostUsd = 0;
    this.currentTokens = 0;
    this.lastStatus = 'healthy';
  }

  /** Get the current config */
  getConfig(): Readonly<CostBudgetConfig> {
    return this.config;
  }

  private emitBudgetEvent(
    eventType: 'budget_warning' | 'budget_exceeded',
    severity: 'warning' | 'error',
    snapshot: CostSnapshot
  ): void {
    if (!this.runLedger) return;
    this.runLedger
      .log({
        runId: '',
        timestamp: new Date().toISOString(),
        eventType,
        stage: '',
        feature: '',
        source: 'CostBudgetEnforcer',
        severity,
        data: {
          currentCostUsd: snapshot.currentCostUsd,
          maxCostUsd: this.config.maxCostUsd,
          currentTokens: snapshot.currentTokens,
          maxTokensPerRun: this.config.maxTokensPerRun,
          percentUsed: snapshot.percentUsed,
        },
      })
      .catch(() => {
        /* non-fatal */
      });
  }
}
