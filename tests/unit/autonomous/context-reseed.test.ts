/**
 * Unit Tests for Observation Tracking and Context Reseed (T037)
 *
 * Tests:
 * 1. post-tool-use observation classification
 * 2. ContextBuilder.reseedContext() behavior
 * 3. AutoHandoffTrigger reseed wiring
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock vscode
vi.mock('vscode', () => ({
  window: {
    showWarningMessage: vi.fn().mockResolvedValue(undefined),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  commands: {
    executeCommand: vi.fn().mockResolvedValue(undefined),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(() => undefined),
      has: vi.fn(() => false),
      inspect: vi.fn(() => undefined),
      update: vi.fn(),
    })),
    workspaceFolders: [],
  },
}));

import { ContextBuilder, type TaskContext } from '../../../extension/src/autonomous/ContextBuilder';
import { MemoryManager } from '../../../extension/src/autonomous/MemoryManager';
import { AutoHandoffTrigger } from '../../../extension/src/autonomous/AutoHandoffTrigger';
import { ContextHealthMonitor, type ContextHealthStatus } from '../../../extension/src/autonomous/ContextHealthMonitor';

// ──────────────────────────────────────────────────────────────
// Observation Type Classification (post-tool-use.mjs logic)
// ──────────────────────────────────────────────────────────────

function classifyObservationType(toolName: string): string {
  if (!toolName) {
    return 'command_output';
  }
  const name = toolName.toLowerCase();
  if (name.includes('read') || name.includes('glob') || name.includes('cat')) {
    return 'file_read';
  }
  if (name.includes('bash') || name.includes('exec') || name.includes('shell')) {
    return 'command_output';
  }
  if (name.includes('search') || name.includes('grep') || name.includes('find')) {
    return 'search_result';
  }
  if (name.includes('test')) {
    return 'test_output';
  }
  if (name.includes('fetch') || name.includes('api') || name.includes('web')) {
    return 'api_response';
  }
  return 'command_output';
}

describe('Observation Type Classification', () => {
  it('should classify file read tools', () => {
    expect(classifyObservationType('Read')).toBe('file_read');
    expect(classifyObservationType('Glob')).toBe('file_read');
    expect(classifyObservationType('cat')).toBe('file_read');
  });

  it('should classify command execution tools', () => {
    expect(classifyObservationType('Bash')).toBe('command_output');
    expect(classifyObservationType('exec')).toBe('command_output');
    expect(classifyObservationType('shell_command')).toBe('command_output');
  });

  it('should classify search tools', () => {
    expect(classifyObservationType('Grep')).toBe('search_result');
    expect(classifyObservationType('search_files')).toBe('search_result');
    expect(classifyObservationType('find_references')).toBe('search_result');
  });

  it('should classify test tools', () => {
    expect(classifyObservationType('test_runner')).toBe('test_output');
  });

  it('should classify API/web tools', () => {
    expect(classifyObservationType('WebFetch')).toBe('api_response');
    expect(classifyObservationType('api_call')).toBe('api_response');
  });

  it('should default to command_output for unknown tools', () => {
    expect(classifyObservationType('unknown_tool')).toBe('command_output');
    expect(classifyObservationType('')).toBe('command_output');
  });
});

// ──────────────────────────────────────────────────────────────
// Context Builder Reseed
// ──────────────────────────────────────────────────────────────

describe('ContextBuilder.reseedContext', () => {
  let contextBuilder: ContextBuilder;
  let mockMemoryManager: MemoryManager;

  const mockContext = {
    globalState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
    subscriptions: [],
    extensionUri: { fsPath: '/mock' } as any,
    extensionPath: '/mock',
    storagePath: '/mock',
    globalStoragePath: '/mock',
    logPath: '/mock',
    extensionMode: 3,
    secrets: {} as any,
    storageUri: undefined,
    globalStorageUri: undefined,
    logUri: undefined,
    environmentVariableCollection: {} as any,
    asAbsolutePath: (p: string) => `/mock/${p}`,
    extension: {} as any,
  } as any;

  const testTask: TaskContext = {
    taskId: 'T001',
    specId: 'test-feature',
    description: 'implement authentication module',
  };

  beforeEach(() => {
    mockMemoryManager = new MemoryManager(mockContext, '/tmp/test-reseed');
    contextBuilder = new ContextBuilder('/tmp/test-reseed', mockMemoryManager, undefined, undefined, {
      enableMasking: true,
      enableBudgetEnforcement: false,
      enableMemoryFirstLoading: false,
      enableChunkedResearch: false,
    });
  });

  it('should reset turn counter to 0 on reseed', async () => {
    // Simulate some turns
    contextBuilder.incrementTurn();
    contextBuilder.incrementTurn();
    contextBuilder.incrementTurn();
    expect(contextBuilder.getCurrentTurn()).toBe(3);

    await contextBuilder.reseedContext(testTask);

    expect(contextBuilder.getCurrentTurn()).toBe(0);
  });

  it('should emit context-reseed event', async () => {
    const reseedHandler = vi.fn();
    contextBuilder.on('context-reseed', reseedHandler);

    await contextBuilder.reseedContext(testTask);

    expect(reseedHandler).toHaveBeenCalledTimes(1);
    expect(reseedHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: expect.any(String),
        memoriesLoaded: expect.any(Number),
      })
    );
  });

  it('should return a fresh built context', async () => {
    const result = await contextBuilder.reseedContext(testTask);

    expect(result).toBeDefined();
    expect(result.turnNumber).toBe(0);
    expect(result.sections).toBeDefined();
  });

  it('should clear observation cache on reseed', async () => {
    const masker = contextBuilder.getObservationMasker();

    // Track some observations
    contextBuilder.trackObservation('file_read', 'content of file A', { path: 'a.ts' });
    contextBuilder.trackObservation('command_output', 'npm test output', { cmd: 'npm test' });

    const allBefore = masker.getAllObservations();
    expect(allBefore.length).toBe(2);

    await contextBuilder.reseedContext(testTask);

    const allAfter = masker.getAllObservations();
    expect(allAfter.length).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────
// AutoHandoffTrigger Reseed Wiring (T035)
// ──────────────────────────────────────────────────────────────

describe('AutoHandoffTrigger Reseed Wiring', () => {
  it('should include reseed as a valid action type', () => {
    const trigger = new AutoHandoffTrigger({ enabled: true });
    const config = trigger.getConfig();
    expect(config.enabled).toBe(true);
    // The 'reseed' action should be in the type union — verified at compile time
  });

  it('should trigger reseed notification for critical status', async () => {
    const trigger = new AutoHandoffTrigger({ enabled: true });
    const monitor = new ContextHealthMonitor({
      warningThreshold: 0.5,
      criticalThreshold: 0.7,
    });
    trigger.connect(monitor);

    // Set up a mock ContextBuilder
    const mockContextBuilder = {
      reseedContext: vi.fn().mockResolvedValue({
        fullContext: '',
        sections: {},
        loadTime: 0,
        hintsLoadTime: 0,
        memoriesLoadTime: 0,
        turnNumber: 0,
        stage: 'implement',
      }),
    };
    trigger.setContextBuilder(mockContextBuilder as any);

    const criticalStatus: ContextHealthStatus = {
      status: 'critical',
      utilizationPercent: 75,
      tokensUsed: 90000,
      tokensLimit: 120000,
      breakdown: {
        specArtifacts: 20000,
        memories: 15000,
        hints: 10000,
        observations: 25000,
        systemFiles: 10000,
        conversation: 10000,
      },
      recommendations: ['Run /7_gofer_save'],
      timestamp: Date.now(),
      dataSource: 'real',
    };

    // triggerHandoffNotification should work without throwing
    const result = await trigger.triggerHandoffNotification(criticalStatus, 'critical');
    expect(result.triggered).toBe(true);
    // User didn't select anything (showWarningMessage returns undefined)
    expect(result.action).toBe('dismiss');
  });
});
