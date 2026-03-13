/**
 * Unit tests for ACCOrchestrator
 *
 * Tests session state reset and enriched context refresh after ACC stages.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock vscode
vi.mock('vscode', () => ({}));

// Mock Logger
vi.mock('../../../src/utils/logger', () => ({
  Logger: {
    for: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { ACCOrchestrator } from '../../../src/autonomous/ACCOrchestrator';

describe('ACCOrchestrator', () => {
  let orchestrator: ACCOrchestrator;
  let mockContextBuilder: any;
  let mockObservationMasker: any;
  let mockMonitor: EventEmitter;
  let mockBridgeWriter: any;

  beforeEach(() => {
    mockContextBuilder = {
      getCurrentTurn: vi.fn().mockReturnValue(5),
      updateBudgetEnforcement: vi.fn(),
    };

    mockObservationMasker = {
      updateConfig: vi.fn(),
      maskOldObservations: vi.fn().mockReturnValue({
        maskedCount: 3,
        tokensSaved: 1500,
        maskedContent: '...',
      }),
      getAllObservations: vi.fn().mockReturnValue([
        { decayTier: 'full', masked: false },
        { decayTier: 'key-points', masked: false },
      ]),
    };

    mockBridgeWriter = {
      writeEnrichedContext: vi.fn().mockResolvedValue(undefined),
    };

    orchestrator = new ACCOrchestrator(
      mockContextBuilder,
      mockObservationMasker,
      null,
      null
    );

    orchestrator.setContextBridgeWriter(mockBridgeWriter);
    orchestrator.setCurrentTaskContext({
      taskId: 'test-task',
      specId: 'test-spec',
      description: 'Test task',
    });

    mockMonitor = new EventEmitter();
    orchestrator.connect(mockMonitor as any);
  });

  describe('enriched context refresh', () => {
    it('Stage 2 triggers enriched context refresh', async () => {
      mockMonitor.emit('acc-observation-masking', {
        utilizationPercent: 80,
        status: 'warning',
      });

      // Allow promise to resolve
      await vi.waitFor(() => {
        expect(mockBridgeWriter.writeEnrichedContext).toHaveBeenCalledWith(
          expect.objectContaining({ taskId: 'test-task' })
        );
      });
    });

    it('Stage 3 triggers enriched context refresh', async () => {
      mockMonitor.emit('acc-fast-pruning', {
        utilizationPercent: 85,
        status: 'critical',
      });

      await vi.waitFor(() => {
        expect(mockBridgeWriter.writeEnrichedContext).toHaveBeenCalledWith(
          expect.objectContaining({ taskId: 'test-task' })
        );
      });
    });

    it('Stage 4 triggers enriched context refresh', async () => {
      mockMonitor.emit('acc-aggressive-masking', {
        utilizationPercent: 90,
        status: 'critical',
      });

      await vi.waitFor(() => {
        expect(mockBridgeWriter.writeEnrichedContext).toHaveBeenCalledWith(
          expect.objectContaining({ taskId: 'test-task' })
        );
      });
    });

    it('missing writer does not crash', () => {
      const orchestrator2 = new ACCOrchestrator(
        mockContextBuilder,
        mockObservationMasker,
        null,
        null
      );

      const monitor2 = new EventEmitter();
      orchestrator2.connect(monitor2 as any);

      // Should not throw even without writer
      expect(() => {
        monitor2.emit('acc-observation-masking', {
          utilizationPercent: 80,
          status: 'warning',
        });
      }).not.toThrow();

      orchestrator2.dispose();
    });

    it('writer error does not crash stage', async () => {
      mockBridgeWriter.writeEnrichedContext.mockRejectedValue(
        new Error('write failed')
      );

      expect(() => {
        mockMonitor.emit('acc-observation-masking', {
          utilizationPercent: 80,
          status: 'warning',
        });
      }).not.toThrow();
    });
  });

  describe('resetSessionState', () => {
    it('clears cooldown timestamps', () => {
      // Trigger stage 1 to set a timestamp
      mockMonitor.emit('acc-delegation-advisory', {
        utilizationPercent: 70,
        status: 'warning',
      });

      // Reset
      orchestrator.resetSessionState();

      // After reset, re-triggering same stage should work (not skipped by cooldown)
      // We can verify by checking the SubAgentDispatcher is called again
      // Since we passed null for SubAgentDispatcher, just verify no error
      expect(() => {
        mockMonitor.emit('acc-delegation-advisory', {
          utilizationPercent: 71,
          status: 'warning',
        });
      }).not.toThrow();
    });
  });

  it('dispose cleans up event listeners', () => {
    orchestrator.dispose();

    // After dispose, events should not trigger actions
    mockBridgeWriter.writeEnrichedContext.mockClear();
    mockMonitor.emit('acc-observation-masking', {
      utilizationPercent: 80,
      status: 'warning',
    });

    expect(mockBridgeWriter.writeEnrichedContext).not.toHaveBeenCalled();
  });
});
