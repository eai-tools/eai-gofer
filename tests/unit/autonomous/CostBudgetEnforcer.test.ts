import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CostBudgetEnforcer,
  BUDGET_DEFAULTS,
} from '../../../extension/src/autonomous/CostBudgetEnforcer';
import { COST_PER_1K_TOKENS } from '../../../extension/src/config/pricing';
import { RunLedger } from '../../../extension/src/autonomous/RunLedger';

// Mock RunLedger
vi.mock('../../../extension/src/autonomous/RunLedger', () => ({
  RunLedger: vi.fn().mockImplementation(() => ({
    log: vi.fn().mockResolvedValue(undefined),
    readLog: vi.fn().mockResolvedValue([]),
    getLogPath: vi.fn().mockReturnValue('/tmp/test-ledger.jsonl'),
  })),
}));

// Mock Logger
vi.mock('../../../extension/src/utils/logger', () => ({
  Logger: {
    for: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe('CostBudgetEnforcer', () => {
  let enforcer: CostBudgetEnforcer;
  let mockLedger: RunLedger;

  beforeEach(() => {
    mockLedger = new RunLedger('/tmp/test');
    enforcer = new CostBudgetEnforcer({}, mockLedger);
  });

  it('should initialize with healthy status', () => {
    const snapshot = enforcer.getSnapshot();
    expect(snapshot.status).toBe('healthy');
    expect(snapshot.currentCostUsd).toBe(0);
    expect(snapshot.currentTokens).toBe(0);
    expect(snapshot.percentUsed).toBe(0);
  });

  it('should use default config values', () => {
    const config = enforcer.getConfig();
    expect(config.maxCostUsd).toBe(BUDGET_DEFAULTS.maxCostUsd);
    expect(config.maxTokensPerRun).toBe(BUDGET_DEFAULTS.maxTokensPerRun);
    expect(config.enforcementMode).toBe('advisory');
    expect(config.warningThreshold).toBe(0.8);
  });

  it('should accumulate usage correctly', () => {
    enforcer.recordUsage(1000, 500);
    const snapshot = enforcer.getSnapshot();

    // 1000 input * 0.003/1000 + 500 output * 0.015/1000 = 0.003 + 0.0075 = 0.0105
    expect(snapshot.currentCostUsd).toBeCloseTo(0.0105, 4);
    expect(snapshot.currentTokens).toBe(1500);
  });

  it('should use provider-specific rates', () => {
    enforcer.recordUsage(1000, 0, 'google');
    const snapshot = enforcer.getSnapshot();

    // 1000 * 0.00025/1000 = 0.00025
    expect(snapshot.currentCostUsd).toBeCloseTo(0.00025, 5);
  });

  it('should fall back to anthropic rates for unknown provider', () => {
    enforcer.recordUsage(1000, 0, 'unknown-provider');
    const snapshot = enforcer.getSnapshot();

    // Falls back to anthropic: 1000 * 0.003/1000 = 0.003
    expect(snapshot.currentCostUsd).toBeCloseTo(0.003, 4);
  });

  it('should transition to warning at 80% threshold', () => {
    // With default $10 budget, 80% = $8.00
    // anthropic input rate: $0.003/1k tokens
    // Need $8.00 worth: 8.0 / 0.003 * 1000 = 2,666,667 input tokens
    const enforcer80 = new CostBudgetEnforcer({ maxCostUsd: 1.0 }, mockLedger);
    // $0.80 at anthropic input rate: 0.80 / 0.003 * 1000 = 266,667 tokens
    enforcer80.recordUsage(270_000, 0);

    const snapshot = enforcer80.getSnapshot();
    expect(snapshot.status).toBe('warning');
  });

  it('should transition to exceeded at 100% threshold', () => {
    const enforcerSmall = new CostBudgetEnforcer({ maxCostUsd: 0.01 }, mockLedger);
    // $0.01 budget, record enough to exceed
    enforcerSmall.recordUsage(10_000, 0); // 10000 * 0.003/1000 = $0.03

    const snapshot = enforcerSmall.getSnapshot();
    expect(snapshot.status).toBe('exceeded');
  });

  it('should also trigger exceeded based on token limit', () => {
    const enforcerTokens = new CostBudgetEnforcer(
      {
        maxTokensPerRun: 1000,
        maxCostUsd: 999, // high cost limit so tokens trigger first
      },
      mockLedger
    );

    enforcerTokens.recordUsage(800, 300); // 1100 total > 1000 limit

    const snapshot = enforcerTokens.getSnapshot();
    expect(snapshot.status).toBe('exceeded');
    expect(snapshot.percentUsed).toBeGreaterThanOrEqual(100);
  });

  it('should return canProceed=false when exceeded in blocking mode', () => {
    const blockingEnforcer = new CostBudgetEnforcer(
      {
        maxCostUsd: 0.001,
        enforcementMode: 'blocking',
      },
      mockLedger
    );

    blockingEnforcer.recordUsage(10_000, 0); // exceeds $0.001
    expect(blockingEnforcer.canProceed()).toBe(false);
  });

  it('should return canProceed=true when exceeded in advisory mode', () => {
    const advisoryEnforcer = new CostBudgetEnforcer(
      {
        maxCostUsd: 0.001,
        enforcementMode: 'advisory',
      },
      mockLedger
    );

    advisoryEnforcer.recordUsage(10_000, 0);
    expect(advisoryEnforcer.canProceed()).toBe(true);
  });

  it('should return canProceed=true when not exceeded', () => {
    expect(enforcer.canProceed()).toBe(true);
  });

  it('should reset state correctly', () => {
    enforcer.recordUsage(100_000, 50_000);
    expect(enforcer.getSnapshot().currentTokens).toBeGreaterThan(0);

    enforcer.reset();
    const snapshot = enforcer.getSnapshot();
    expect(snapshot.currentCostUsd).toBe(0);
    expect(snapshot.currentTokens).toBe(0);
    expect(snapshot.status).toBe('healthy');
    expect(snapshot.percentUsed).toBe(0);
  });

  it('should emit budget_warning to ledger on warning transition', () => {
    const warningEnforcer = new CostBudgetEnforcer({ maxCostUsd: 1.0 }, mockLedger);
    // Record enough to cross 80%
    warningEnforcer.recordUsage(270_000, 0);

    expect(mockLedger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'budget_warning',
        severity: 'warning',
        source: 'CostBudgetEnforcer',
      })
    );
  });

  it('should emit budget_exceeded to ledger on exceeded transition', () => {
    const smallEnforcer = new CostBudgetEnforcer({ maxCostUsd: 0.01 }, mockLedger);
    smallEnforcer.recordUsage(10_000, 0);

    expect(mockLedger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'budget_exceeded',
        severity: 'error',
        source: 'CostBudgetEnforcer',
      })
    );
  });

  it('should NOT emit repeated events for the same status', () => {
    const smallEnforcer = new CostBudgetEnforcer({ maxCostUsd: 1.0 }, mockLedger);

    // Cross warning threshold
    smallEnforcer.recordUsage(270_000, 0);
    const callCount1 = (mockLedger.log as ReturnType<typeof vi.fn>).mock.calls.length;

    // Record more usage still in warning range
    smallEnforcer.recordUsage(10_000, 0);
    const callCount2 = (mockLedger.log as ReturnType<typeof vi.fn>).mock.calls.length;

    // Should not emit a second warning
    expect(callCount2).toBe(callCount1);
  });

  it('should include data in ledger events', () => {
    const smallEnforcer = new CostBudgetEnforcer({ maxCostUsd: 0.01 }, mockLedger);
    smallEnforcer.recordUsage(10_000, 0);

    expect(mockLedger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentCostUsd: expect.any(Number),
          maxCostUsd: 0.01,
          percentUsed: expect.any(Number),
        }),
      })
    );
  });

  it('should have correct COST_PER_1K_TOKENS rates', () => {
    expect(COST_PER_1K_TOKENS.anthropic).toEqual({ input: 0.003, output: 0.015 });
    expect(COST_PER_1K_TOKENS.google).toEqual({ input: 0.00025, output: 0.0005 });
    expect(COST_PER_1K_TOKENS.openai).toEqual({ input: 0.005, output: 0.015 });
  });

  it('should handle custom config overrides', () => {
    const custom = new CostBudgetEnforcer({
      maxCostUsd: 50,
      maxTokensPerRun: 1_000_000,
      warningThreshold: 0.9,
    });

    const config = custom.getConfig();
    expect(config.maxCostUsd).toBe(50);
    expect(config.maxTokensPerRun).toBe(1_000_000);
    expect(config.warningThreshold).toBe(0.9);
    expect(config.enforcementMode).toBe('advisory'); // default preserved
  });
});
