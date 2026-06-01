/**
 * Unit tests for InitializationService - version upgrade resource sync
 *
 * Tests that extension version upgrades trigger full resource sync (upgrade)
 * while same-version activations only sync missing resources.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'reflect-metadata';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';

import packageJson from '../../../extension/package.json';

import { cleanupTestWorkspace } from '../../helpers/workspace';

// Mock GoferMigrator
const mockUpgrade = vi.fn().mockResolvedValue(undefined);
const mockSyncMissingResources = vi.fn().mockResolvedValue(undefined);
const mockGetVersionInfo = vi.fn();

vi.mock('../../../extension/src/goferMigrator', () => ({
  GoferMigrator: vi.fn().mockImplementation(() => ({
    getVersionInfo: mockGetVersionInfo,
    upgrade: mockUpgrade,
    syncMissingResources: mockSyncMissingResources,
  })),
}));

// Mock MCPConfigHelper
vi.mock('../../../extension/src/mcpConfig', () => ({
  MCPConfigHelper: vi.fn().mockImplementation(() => ({
    autoSetup: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock ConfigManager
vi.mock('../../../extension/src/config', () => ({
  ConfigManager: {
    getInstance: vi.fn(() => ({
      getAutoInitialize: vi.fn(() => false),
    })),
  },
}));

// Mock ConfigValidator
vi.mock('../../../extension/src/utils/ConfigValidator', () => ({
  ConfigValidator: vi.fn().mockImplementation(() => ({
    validateConfiguration: vi.fn(() => ({ valid: true, errors: [], warnings: [] })),
    logValidationResult: vi.fn(),
    showValidationErrors: vi.fn(),
  })),
}));

// Mock autonomous modules to prevent initialization errors
vi.mock('../../../extension/src/autonomous/ContextHealthMonitor', () => ({
  ContextHealthMonitor: vi.fn().mockImplementation(() => ({
    setWorkspaceRoot: vi.fn(),
    setContextProvider: vi.fn(),
    checkHealth: vi.fn(),
    startMonitoring: vi.fn(),
    on: vi.fn(),
  })),
}));

vi.mock('../../../extension/src/autonomous/AutoHandoffTrigger', () => ({
  AutoHandoffTrigger: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    setUsageLogger: vi.fn(),
  })),
}));

vi.mock('../../../extension/src/autoHandoffBridge', () => ({
  setAutoHandoffTrigger: vi.fn(),
}));

vi.mock('../../../extension/src/autonomous/ContextUsageLogger', () => ({
  ContextUsageLogger: vi.fn().mockImplementation(() => ({
    logHealthCheck: vi.fn(),
  })),
}));

vi.mock('../../../extension/src/autonomous/WorkspaceContextProvider', () => ({
  WorkspaceContextProvider: vi.fn().mockImplementation(() => ({
    setSessionReader: vi.fn(),
    setHookBridgeWatcher: vi.fn(),
    getContextAnalysis: vi.fn(),
  })),
}));

vi.mock('../../../extension/src/autonomous/ClaudeSessionReader', () => ({
  ClaudeSessionReader: vi.fn().mockImplementation(() => ({
    findActiveSession: vi.fn(() => null),
  })),
}));

vi.mock('../../../extension/src/autonomous/HookBridgeWatcher', () => ({
  HookBridgeWatcher: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock('../../../extension/src/autonomous/MultiSessionBridgeWatcher', () => ({
  MultiSessionBridgeWatcher: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    dispose: vi.fn(),
    on: vi.fn(),
    getSessionCount: vi.fn(() => 0),
    isHookDataAvailable: vi.fn(() => false),
  })),
}));

vi.mock('../../../extension/src/autonomous/ClaudeCodeContextScanner', () => ({
  ClaudeCodeContextScanner: vi.fn().mockImplementation(() => ({
    invalidate: vi.fn(),
  })),
}));

vi.mock('../../../extension/src/ui/GoferActivityStatusBar', () => ({
  GoferActivityStatusBar: vi.fn().mockImplementation(() => ({
    show: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock('../../../extension/src/branchSpecManager', () => ({
  BranchSpecManager: vi.fn().mockImplementation(() => ({
    initializeBranchStructure: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Must import AFTER mocks
import { InitializationService } from '../../../extension/src/services/InitializationService';
import { Logger } from '../../../extension/src/services/Logger';

describe('InitializationService - Version Upgrade Resource Sync', () => {
  let workspace: string;
  let service: InitializationService;
  let logger: Logger;

  const currentVersion: string = packageJson.version;

  beforeEach(async () => {
    workspace = fsSync.mkdtempSync(path.join(os.tmpdir(), 'gofer-init-test-'));

    // Create gofer structure so format detection returns 'gofer'
    await fs.mkdir(path.join(workspace, '.specify/specs'), { recursive: true });
    await fs.mkdir(path.join(workspace, '.specify/memory'), { recursive: true });
    await fs.mkdir(path.join(workspace, '.specify/templates'), { recursive: true });

    logger = new Logger();
    service = new InitializationService(logger);

    // Mock workspace folder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vscode.workspace as any).workspaceFolders = [
      { uri: { fsPath: workspace }, name: 'test', index: 0 },
    ];

    // Setup GoferMigrator mock to return gofer format
    mockGetVersionInfo.mockResolvedValue({
      format: 'gofer',
      needsUpgrade: false,
      details: 'Gofer format detected',
    });

    // Reset call tracking
    mockUpgrade.mockClear();
    mockSyncMissingResources.mockClear();

    // Mock vscode.window.setStatusBarMessage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vscode.window as any).setStatusBarMessage = vi.fn();

    // Mock vscode.window.withProgress for upgrade path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vscode.window as any).withProgress = vi.fn(
      async (
        _options: unknown,
        callback: (progress: { report: (value: unknown) => void }) => Promise<void>
      ) => {
        await callback({ report: vi.fn() });
      }
    );
  });

  afterEach(async () => {
    await cleanupTestWorkspace(workspace);
  });

  it('calls upgrade() when extension version is newer than stored version', async () => {
    await fs.writeFile(path.join(workspace, '.specify', '.gofer-version'), '0.0.1', 'utf-8');

    const deps = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: { extensionPath: '/mock/path' } as any,
    };

    await service.initialize(deps);

    expect(mockUpgrade).toHaveBeenCalledWith({ skipConfirmation: true });
    expect(mockSyncMissingResources).not.toHaveBeenCalled();
  });

  it('calls syncMissingResources() when version matches', async () => {
    await fs.writeFile(path.join(workspace, '.specify', '.gofer-version'), currentVersion, 'utf-8');

    const deps = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: { extensionPath: '/mock/path' } as any,
    };

    await service.initialize(deps);

    expect(mockSyncMissingResources).toHaveBeenCalled();
    expect(mockUpgrade).not.toHaveBeenCalled();
  });

  it('calls upgrade() on first run when no .gofer-version file exists', async () => {
    // Don't create .gofer-version file — version defaults to '0.0.0'

    const deps = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: { extensionPath: '/mock/path' } as any,
    };

    await service.initialize(deps);

    expect(mockUpgrade).toHaveBeenCalledWith({ skipConfirmation: true });
    expect(mockSyncMissingResources).not.toHaveBeenCalled();
  });

  it('updates .gofer-version file after version upgrade', async () => {
    await fs.writeFile(path.join(workspace, '.specify', '.gofer-version'), '0.0.1', 'utf-8');

    const deps = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: { extensionPath: '/mock/path' } as any,
    };

    await service.initialize(deps);

    const storedVersion = await fs.readFile(
      path.join(workspace, '.specify', '.gofer-version'),
      'utf-8'
    );
    expect(storedVersion.trim()).toBe(currentVersion);
  });

  it('does not update .gofer-version file when version matches', async () => {
    await fs.writeFile(path.join(workspace, '.specify', '.gofer-version'), currentVersion, 'utf-8');

    const deps = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: { extensionPath: '/mock/path' } as any,
    };

    await service.initialize(deps);

    const storedVersion = await fs.readFile(
      path.join(workspace, '.specify', '.gofer-version'),
      'utf-8'
    );
    expect(storedVersion.trim()).toBe(currentVersion);
  });
});
