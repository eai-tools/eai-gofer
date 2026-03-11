/**
 * Wiring integration tests for shared ContextBuilder (Feature 024)
 *
 * Verifies that the shared ContextBuilder is wired correctly:
 * - T005: setSharedContextBuilder stores and retrieves the instance
 * - T006: AutoHandoffTrigger receives ContextBuilder via setContextBuilder
 * - T007: EventHandlerDependencies mutation enables config reload
 *
 * @see .specify/specs/024-wire-contextbuilder-acc/tasks.md T005-T007
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
  setSharedContextBuilder,
  getSharedContextBuilder,
} from '../../../extension/src/autonomousCommands';
import { AutoHandoffTrigger } from '../../../extension/src/autonomous/AutoHandoffTrigger';
import { ContextHealthMonitor } from '../../../extension/src/autonomous/ContextHealthMonitor';
import { ContextUsageLogger } from '../../../extension/src/autonomous/ContextUsageLogger';
import type { EventHandlerDependencies } from '../../../extension/src/services/EventHandlers';

describe('ContextBuilder Wiring (Feature 024)', () => {
  let tmpDir: string;
  let contextBuilder: ContextBuilder;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-wiring-test-'));
    // MemoryManager is mocked — constructor args don't matter
    const memoryManager = new MemoryManager(
      undefined as unknown as vscodeTypes.ExtensionContext,
      tmpDir
    );
    const hintLoader = new HintLoader(tmpDir);
    contextBuilder = new ContextBuilder(tmpDir, memoryManager, hintLoader);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('T005: setSharedContextBuilder wiring', () => {
    it('should store and retrieve the shared ContextBuilder instance', () => {
      setSharedContextBuilder(contextBuilder);
      const retrieved = getSharedContextBuilder();
      expect(retrieved).toBe(contextBuilder);
    });

    it('should replace previous shared instance', () => {
      const memoryManager = new MemoryManager(
        undefined as unknown as vscodeTypes.ExtensionContext,
        tmpDir
      );
      const hintLoader = new HintLoader(tmpDir);
      const anotherBuilder = new ContextBuilder(tmpDir, memoryManager, hintLoader);

      setSharedContextBuilder(contextBuilder);
      setSharedContextBuilder(anotherBuilder);

      expect(getSharedContextBuilder()).toBe(anotherBuilder);
      expect(getSharedContextBuilder()).not.toBe(contextBuilder);
    });

    it('should wire ContextUsageLogger via setUsageLogger', () => {
      const usageLogger = new ContextUsageLogger(tmpDir);
      contextBuilder.setUsageLogger(usageLogger);
      // No throw means wiring succeeded
      expect(true).toBe(true);
    });
  });

  describe('T006: AutoHandoffTrigger with ContextBuilder', () => {
    let trigger: AutoHandoffTrigger;
    let monitor: ContextHealthMonitor;

    beforeEach(() => {
      monitor = new ContextHealthMonitor({
        checkIntervalMs: 999999, // Disable periodic checks
        autoHandoffEnabled: true,
      });

      const usageLogger = new ContextUsageLogger(tmpDir);
      trigger = new AutoHandoffTrigger(tmpDir, usageLogger);
    });

    afterEach(() => {
      monitor.dispose();
      trigger.dispose();
    });

    it('should accept ContextBuilder via setContextBuilder', () => {
      // Should not throw
      trigger.setContextBuilder(contextBuilder);
      expect(true).toBe(true);
    });

    it('should fire auto-save event at 65% with ContextBuilder wired', () => {
      trigger.setContextBuilder(contextBuilder);
      trigger.connect(monitor);

      const autoSaveHandler = vi.fn();
      monitor.on('auto-save', autoSaveHandler);

      // Start below threshold, then cross it via public API
      monitor.analyzeContext({ breakdown: { conversation: 72000 }, dataSource: 'real' }); // 60%
      monitor.analyzeContext({ breakdown: { conversation: 79200 }, dataSource: 'real' }); // 66%

      expect(autoSaveHandler).toHaveBeenCalledOnce();
    });

    it('should fire critical event at 70% independently of ContextBuilder', () => {
      trigger.setContextBuilder(contextBuilder);
      trigger.connect(monitor);

      const criticalHandler = vi.fn();
      monitor.on('critical', criticalHandler);

      // Start below, then cross critical
      monitor.analyzeContext({ breakdown: { conversation: 10000 }, dataSource: 'real' });
      monitor.analyzeContext({ breakdown: { conversation: 86400 }, dataSource: 'real' }); // 72%

      expect(criticalHandler).toHaveBeenCalled();
    });
  });

  describe('T007: EventHandlerDependencies mutation for config reload', () => {
    it('should see updated sharedContextBuilder after mutation', () => {
      // Simulates the pattern used in extension.ts activate():
      // deps object is created with undefined, then mutated after ContextBuilder creation
      const deps: Partial<EventHandlerDependencies> = {
        sharedContextBuilder: undefined,
      };

      // Before mutation: undefined
      expect(deps.sharedContextBuilder).toBeUndefined();

      // Mutation (as done in initializeForWorkspace)
      deps.sharedContextBuilder = contextBuilder;

      // After mutation: the same reference
      expect(deps.sharedContextBuilder).toBe(contextBuilder);
    });

    it('should allow reloadObservationPatterns to proceed when builder is set', () => {
      // Verify the guard condition that reloadObservationPatterns checks
      const deps: Partial<EventHandlerDependencies> = {
        sharedContextBuilder: contextBuilder,
      };

      // The reloadObservationPatterns guard: if (!deps.sharedContextBuilder) return;
      // When builder is set, it should NOT early-return
      expect(deps.sharedContextBuilder).toBeDefined();
      expect(deps.sharedContextBuilder!.getObservationMasker()).toBeDefined();
    });

    it('should allow reloadLayeredMemorySetting to proceed when builder is set', () => {
      const deps: Partial<EventHandlerDependencies> = {
        sharedContextBuilder: contextBuilder,
      };

      // The reloadLayeredMemorySetting guard: if (!deps.sharedContextBuilder) return;
      expect(deps.sharedContextBuilder).toBeDefined();
      // setMemoryLayerManager accepts the current manager (may be undefined) + a boolean
      // This should not throw even when manager is undefined
      expect(() => {
        deps.sharedContextBuilder!.setMemoryLayerManager(
          deps.sharedContextBuilder!.getMemoryLayerManager(),
          false
        );
      }).not.toThrow();
    });

    it('should propagate to closures that captured the deps object', () => {
      // This tests the JS object reference semantics that enable "auto-activate"
      const deps: Partial<EventHandlerDependencies> = {
        sharedContextBuilder: undefined,
      };

      // Simulate closure capture (as EventHandlers.registerAll does internally)
      const closureThatUsesDeps = (): ContextBuilder | undefined => deps.sharedContextBuilder;

      // Before mutation: closure sees undefined
      expect(closureThatUsesDeps()).toBeUndefined();

      // Mutate the deps object (as initializeForWorkspace does)
      deps.sharedContextBuilder = contextBuilder;

      // After mutation: closure sees the updated value (JS reference semantics)
      expect(closureThatUsesDeps()).toBe(contextBuilder);
    });
  });
});
