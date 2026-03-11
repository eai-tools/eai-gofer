/**
 * ACC (Adaptive Context Compaction) event tests for ContextHealthMonitor
 *
 * Tests the new ACC threshold crossing events added in Feature 024.
 *
 * @see .specify/specs/024-wire-contextbuilder-acc/tasks.md T025-T027
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

// Mock VSCode API
vi.mock('vscode', () => ({
  env: {
    isTelemetryEnabled: false,
    machineId: 'test-machine-id',
  },
  workspace: {
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue(undefined),
    }),
  },
}));

import {
  ContextHealthMonitor,
  type ContextAnalysisInput,
} from '../../../extension/src/autonomous/ContextHealthMonitor';

/** Create an analysis input that produces the desired utilization percentage */
function inputForUtilization(
  pct: number,
  dataSource: 'real' | 'estimated' = 'real'
): ContextAnalysisInput {
  // Default limit is 120000. conversation tokens = pct% of limit
  const tokens = Math.round((pct / 100) * 120000);
  return {
    breakdown: { conversation: tokens },
    dataSource,
  };
}

describe('ContextHealthMonitor ACC Events (Feature 024)', () => {
  let monitor: ContextHealthMonitor;

  beforeEach(() => {
    monitor = new ContextHealthMonitor({
      checkIntervalMs: 999999, // Disable periodic checks
      autoHandoffEnabled: true,
    });
  });

  afterEach(() => {
    monitor.dispose();
  });

  describe('T025: ACC threshold crossing events', () => {
    it('should emit acc-delegation-advisory at 70%', () => {
      const handler = vi.fn();
      monitor.on('acc-delegation-advisory', handler);

      // Start below threshold, then cross it
      monitor.analyzeContext(inputForUtilization(65));
      monitor.analyzeContext(inputForUtilization(72));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should emit acc-observation-masking at 80%', () => {
      const handler = vi.fn();
      monitor.on('acc-observation-masking', handler);

      monitor.analyzeContext(inputForUtilization(75));
      monitor.analyzeContext(inputForUtilization(82));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should emit acc-fast-pruning at 85%', () => {
      const handler = vi.fn();
      monitor.on('acc-fast-pruning', handler);

      monitor.analyzeContext(inputForUtilization(82));
      monitor.analyzeContext(inputForUtilization(87));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should emit acc-aggressive-masking at 90%', () => {
      const handler = vi.fn();
      monitor.on('acc-aggressive-masking', handler);

      monitor.analyzeContext(inputForUtilization(88));
      monitor.analyzeContext(inputForUtilization(92));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should emit acc-full-compaction at 99%', () => {
      const handler = vi.fn();
      monitor.on('acc-full-compaction', handler);

      monitor.analyzeContext(inputForUtilization(95));
      monitor.analyzeContext(inputForUtilization(100));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should fire each ACC event exactly once during ramp from 0 to 100%', () => {
      const events: Record<string, number> = {
        'acc-delegation-advisory': 0,
        'acc-observation-masking': 0,
        'acc-fast-pruning': 0,
        'acc-aggressive-masking': 0,
        'acc-full-compaction': 0,
      };

      for (const event of Object.keys(events)) {
        monitor.on(event as keyof typeof events, () => {
          events[event]++;
        });
      }

      // Ramp from 0% to 100% in 5% increments
      for (let pct = 0; pct <= 100; pct += 5) {
        monitor.analyzeContext(inputForUtilization(pct));
      }

      expect(events['acc-delegation-advisory']).toBe(1);
      expect(events['acc-observation-masking']).toBe(1);
      expect(events['acc-fast-pruning']).toBe(1);
      expect(events['acc-aggressive-masking']).toBe(1);
      expect(events['acc-full-compaction']).toBe(1);
    });

    it('should not emit ACC events for estimated data', () => {
      const handler = vi.fn();
      monitor.on('acc-delegation-advisory', handler);

      monitor.analyzeContext(inputForUtilization(65, 'estimated'));
      monitor.analyzeContext(inputForUtilization(72, 'estimated'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not re-emit when utilization stays above threshold', () => {
      const handler = vi.fn();
      monitor.on('acc-observation-masking', handler);

      // Cross 80%
      monitor.analyzeContext(inputForUtilization(75));
      monitor.analyzeContext(inputForUtilization(82));

      // Stay above 80%
      monitor.analyzeContext(inputForUtilization(85));

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('T026: Existing events unaffected by ACC additions', () => {
    it('should still emit auto-save at 65%', () => {
      const handler = vi.fn();
      monitor.on('auto-save', handler);

      monitor.analyzeContext(inputForUtilization(60));
      monitor.analyzeContext(inputForUtilization(66));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should still emit critical status event', () => {
      const handler = vi.fn();
      monitor.on('critical', handler);

      monitor.analyzeContext(inputForUtilization(65));
      monitor.analyzeContext(inputForUtilization(72));

      expect(handler).toHaveBeenCalled();
    });

    it('should emit handoff-recommended at critical with real data', () => {
      const handler = vi.fn();
      monitor.on('handoff-recommended', handler);

      monitor.analyzeContext(inputForUtilization(10));
      monitor.analyzeContext(inputForUtilization(72));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should emit acc-delegation-advisory independently from critical', () => {
      const criticalHandler = vi.fn();
      const accHandler = vi.fn();
      monitor.on('critical', criticalHandler);
      monitor.on('acc-delegation-advisory', accHandler);

      monitor.analyzeContext(inputForUtilization(10));
      monitor.analyzeContext(inputForUtilization(72));

      // Both should fire independently — no race condition
      expect(criticalHandler).toHaveBeenCalled();
      expect(accHandler).toHaveBeenCalledOnce();
    });
  });

  describe('T027: Event ordering', () => {
    it('should emit auto-save before critical before acc-delegation-advisory when jumping from 60% to 75%', () => {
      const order: string[] = [];

      monitor.on('auto-save', () => order.push('auto-save'));
      monitor.on('critical', () => order.push('critical'));
      monitor.on('acc-delegation-advisory', () => order.push('acc-delegation-advisory'));

      // Start below all thresholds
      monitor.analyzeContext(inputForUtilization(60));
      // Jump to 75% — crosses auto-save (65%), critical (70%), and acc-delegation-advisory (70%)
      monitor.analyzeContext(inputForUtilization(75));

      expect(order).toEqual(['auto-save', 'critical', 'acc-delegation-advisory']);
    });

    it('should emit ACC events in threshold order during gradual ramp', () => {
      const order: string[] = [];

      monitor.on('acc-delegation-advisory', () => order.push('acc-delegation-advisory'));
      monitor.on('acc-observation-masking', () => order.push('acc-observation-masking'));
      monitor.on('acc-fast-pruning', () => order.push('acc-fast-pruning'));
      monitor.on('acc-aggressive-masking', () => order.push('acc-aggressive-masking'));
      monitor.on('acc-full-compaction', () => order.push('acc-full-compaction'));

      // Ramp gradually
      for (let pct = 0; pct <= 100; pct += 5) {
        monitor.analyzeContext(inputForUtilization(pct));
      }

      expect(order).toEqual([
        'acc-delegation-advisory',
        'acc-observation-masking',
        'acc-fast-pruning',
        'acc-aggressive-masking',
        'acc-full-compaction',
      ]);
    });
  });
});
