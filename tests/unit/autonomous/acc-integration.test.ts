/**
 * ACC Integration Tests (Feature 024)
 *
 * End-to-end verification that all ACC components work together:
 * - T041a: Full ACC pipeline utilization ramp (0→100%)
 * - T041b: Coexistence of AutoHandoffTrigger and ACCOrchestrator
 * - T041c: Dead-code activation verification
 *
 * @see .specify/specs/024-wire-contextbuilder-acc/tasks.md T041a-T041c
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type * as vscodeTypes from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

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
  window: {
    showWarningMessage: vi.fn().mockResolvedValue(null),
    showInformationMessage: vi.fn().mockResolvedValue(undefined),
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
  },
  commands: {
    executeCommand: vi.fn().mockResolvedValue(undefined),
  },
  workspace: {
    workspaceFolders: undefined,
    onDidSaveTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue([]),
    }),
  },
  env: {
    isTelemetryEnabled: false,
    machineId: 'test-machine-id',
  },
}));

// Mock MemoryManager
vi.mock('../../../extension/src/autonomous/MemoryManager', () => ({
  MemoryManager: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({ memories: [], total: 0 }),
    save: vi.fn(),
    loadByPriority: vi.fn().mockResolvedValue({
      memories: [],
      totalConsidered: 0,
      loadTime: 0,
      filtered: false,
    }),
    calculatePriorityScore: vi.fn().mockReturnValue(50),
    calculateRelevanceScore: vi.fn().mockReturnValue(50),
    recordUsage: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock HintLoader
vi.mock('../../../extension/src/autonomous/HintLoader', () => ({
  HintLoader: vi.fn().mockImplementation(() => ({
    loadForTask: vi.fn().mockResolvedValue({ mergedContent: null, loadedHints: [] }),
    dispose: vi.fn(),
  })),
}));

// Mock ContextUsageLogger
vi.mock('../../../extension/src/autonomous/ContextUsageLogger', () => ({
  ContextUsageLogger: vi.fn().mockImplementation(() => ({
    logHandoff: vi.fn().mockResolvedValue(undefined),
    log: vi.fn().mockResolvedValue(undefined),
    logStageTransition: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { ContextBuilder } from '../../../extension/src/autonomous/ContextBuilder';
import { MemoryManager } from '../../../extension/src/autonomous/MemoryManager';
import { HintLoader } from '../../../extension/src/autonomous/HintLoader';
import {
  ContextHealthMonitor,
  type ContextAnalysisInput,
} from '../../../extension/src/autonomous/ContextHealthMonitor';
import { AutoHandoffTrigger } from '../../../extension/src/autonomous/AutoHandoffTrigger';
import { ACCOrchestrator } from '../../../extension/src/autonomous/ACCOrchestrator';
import {
  setSharedContextBuilder,
  getSharedContextBuilder,
} from '../../../extension/src/autonomousCommands';

/** Create an analysis input that produces the desired utilization percentage */
function inputForUtilization(
  pct: number,
  dataSource: 'real' | 'estimated' = 'real'
): ContextAnalysisInput {
  const tokens = Math.round((pct / 100) * 120000);
  return {
    breakdown: { conversation: tokens },
    dataSource,
  };
}

describe('ACC Integration Tests (Feature 024)', () => {
  let tmpDir: string;
  let contextBuilder: ContextBuilder;
  let monitor: ContextHealthMonitor;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-acc-integ-'));
    const memoryManager = new MemoryManager(
      undefined as unknown as vscodeTypes.ExtensionContext,
      tmpDir
    );
    const hintLoader = new HintLoader(tmpDir);
    contextBuilder = new ContextBuilder(tmpDir, memoryManager, hintLoader);

    monitor = new ContextHealthMonitor({
      checkIntervalMs: 999999,
      autoHandoffEnabled: true,
    });
  });

  afterEach(() => {
    monitor.dispose();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('T041a: ACC pipeline integration (full ramp 0→100%)', () => {
    it('should execute all 5 ACC stages during utilization ramp without exceptions', () => {
      const masker = contextBuilder.getObservationMasker();
      const mockDispatcher = { updateUtilization: vi.fn() };

      // Track some observations for masking stages to operate on
      for (let i = 0; i < 5; i++) {
        masker.trackObservation({
          timestamp: Date.now(),
          turnNumber: i + 1,
          type: 'file_read',
          originalContent: `observation content ${i}`,
        });
      }

      const orchestrator = new ACCOrchestrator(
        contextBuilder,
        masker,
        mockDispatcher,
        null // No compactor
      );
      orchestrator.connect(monitor);

      // Ramp from 0% to 100% in 5% increments
      expect(() => {
        for (let pct = 0; pct <= 100; pct += 5) {
          monitor.analyzeContext(inputForUtilization(pct));
        }
      }).not.toThrow();

      // Stage 1: SubAgentDispatcher was called
      expect(mockDispatcher.updateUtilization).toHaveBeenCalled();

      // Stage 2: Masker config was updated (reduced threshold)
      expect(masker.getConfig().ageThresholdTurns).toBe(5);

      // Stage 4: All observations forced to masked
      const allObs = masker.getAllObservations();
      expect(allObs.every((o) => o.decayTier === 'masked')).toBe(true);

      orchestrator.dispose();
    });
  });

  describe('T041b: Coexistence of AutoHandoffTrigger and ACCOrchestrator', () => {
    it('should fire both AutoHandoffTrigger critical and ACCOrchestrator delegation-advisory independently', () => {
      // Set up AutoHandoffTrigger
      const trigger = new AutoHandoffTrigger(undefined, tmpDir);
      trigger.setContextBuilder(contextBuilder);
      trigger.connect(monitor);

      // Set up ACCOrchestrator
      const mockDispatcher = { updateUtilization: vi.fn() };
      const orchestrator = new ACCOrchestrator(
        contextBuilder,
        contextBuilder.getObservationMasker(),
        mockDispatcher,
        null
      );
      orchestrator.connect(monitor);

      // Track event emission
      const criticalFired = vi.fn();
      const accDelegationFired = vi.fn();
      monitor.on('critical', criticalFired);
      monitor.on('acc-delegation-advisory', accDelegationFired);

      // Simulate crossing 70% — both critical and acc-delegation-advisory should fire
      monitor.analyzeContext(inputForUtilization(10));
      monitor.analyzeContext(inputForUtilization(72));

      // Both events fire independently
      expect(criticalFired).toHaveBeenCalled();
      expect(accDelegationFired).toHaveBeenCalledOnce();

      // ACCOrchestrator acted on its event
      expect(mockDispatcher.updateUtilization).toHaveBeenCalled();

      trigger.dispose();
      orchestrator.dispose();
    });
  });

  describe('T041c: Dead-code activation verification', () => {
    it('should wire setSharedContextBuilder so getSharedContextBuilder returns the instance', () => {
      setSharedContextBuilder(contextBuilder);
      const retrieved = getSharedContextBuilder();
      expect(retrieved).toBe(contextBuilder);
    });

    it('should have a working ObservationMasker from ContextBuilder', () => {
      const masker = contextBuilder.getObservationMasker();
      expect(masker).toBeDefined();

      // Track and retrieve an observation — previously dead code path
      const id = masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: 'test content for dead-code activation',
      });
      expect(id).toBeDefined();

      const obs = masker.getObservation(id);
      expect(obs).toBeDefined();
      expect(obs!.originalContent).toBe('test content for dead-code activation');
    });

    it('should allow updateBudgetEnforcement on ContextBuilder (previously inaccessible)', () => {
      // This method was added in Feature 024 to support ACC Stage 3
      expect(() => {
        contextBuilder.updateBudgetEnforcement(true, 'truncate');
      }).not.toThrow();
    });

    it('should allow AutoHandoffTrigger.setContextBuilder without error', () => {
      const trigger = new AutoHandoffTrigger(undefined, tmpDir);

      // Previously dead code path — setContextBuilder was never called
      expect(() => {
        trigger.setContextBuilder(contextBuilder);
      }).not.toThrow();

      trigger.dispose();
    });
  });
});
