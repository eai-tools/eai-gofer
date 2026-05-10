/**
 * Disposal Service
 *
 * Centralized cleanup service for extension resources, watchers, timers, and disposables.
 * Eliminates duplicate disposal logic across reinitializeExtension() and deactivate().
 *
 * Engineering Remediation Phase 3 - T023
 */

import { injectable } from 'tsyringe';
import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from './Logger';
import type { ProgressProvider } from '../progressProvider';
import type { ConstitutionProvider } from '../constitutionProvider';
import type { MemoryProvider } from '../memoryProvider';
import type { BranchSpecManager } from '../branchSpecManager';
import type { AutoUpdater } from '../autoUpdater';
import type { GoferLSPClient } from '../lspClient';
import type { MemoryManager } from '../autonomous/MemoryManager';
import type { ContextHealthMonitor } from '../autonomous/ContextHealthMonitor';
import type { ContextUsageLogger } from '../autonomous/ContextUsageLogger';
import type { ContextHealthStatusBar } from '../ui/ContextHealthStatusBar';
import type { AutoHandoffTrigger } from '../autonomous/AutoHandoffTrigger';
import type { ContinuousMemoryWriter } from '../autonomous/ContinuousMemoryWriter';
import type { HookBridgeWatcher } from '../autonomous/HookBridgeWatcher';
import type { MultiSessionBridgeWatcher } from '../autonomous/MultiSessionBridgeWatcher';
import type { GoferActivityStatusBar } from '../ui/GoferActivityStatusBar';
import type { ContextBuilder } from '../autonomous/ContextBuilder';
import type { WorkspaceContextProvider } from '../autonomous/WorkspaceContextProvider';
import type { ACCOrchestrator } from '../autonomous/ACCOrchestrator';
import type { ObservationBridge } from '../autonomous/ObservationBridge';
import type { AIUsageMonitor } from '../autonomous/AIUsageMonitor';
import type { AIUsageProvider } from '../ui/AIUsageProvider';
import type { AIUsageStatusBar } from '../ui/AIUsageStatusBar';
import type { ResourceDiagnostics } from '../autonomous/ResourceDiagnostics';

/**
 * Disposable resource types that can be managed
 */
export interface ManagedResources {
  sharedContextBuilder?: ContextBuilder;
  cacheSaveTimer?: ReturnType<typeof setTimeout> | null;
  consolidationTimer?: ReturnType<typeof setInterval> | null;
  workspaceContextProvider?: WorkspaceContextProvider;
  contextHealthMonitor?: ContextHealthMonitor;
  autoHandoffTrigger?: AutoHandoffTrigger;
  contextHealthStatusBar?: ContextHealthStatusBar;
  continuousMemoryWriter?: ContinuousMemoryWriter;
  multiSessionWatcher?: MultiSessionBridgeWatcher;
  hookBridgeWatcher?: HookBridgeWatcher;
  goferActivityStatusBar?: GoferActivityStatusBar;
  contextUsageLogger?: ContextUsageLogger;
  progressProvider?: ProgressProvider;
  constitutionProvider?: ConstitutionProvider;
  memoryProvider?: MemoryProvider;
  branchSpecManager?: BranchSpecManager;
  memoryManager?: MemoryManager;
  autoUpdater?: AutoUpdater;
  lspClient?: GoferLSPClient;
  accOrchestrator?: ACCOrchestrator;
  observationBridge?: ObservationBridge;
  aiUsageMonitor?: AIUsageMonitor;
  aiUsageProvider?: AIUsageProvider;
  aiUsageStatusBar?: AIUsageStatusBar;
  resourceDiagnostics?: ResourceDiagnostics;
}

/**
 * Disposal Service
 *
 * Manages cleanup of extension resources during deactivation and reinitialization.
 */
@injectable()
export class DisposalService {
  private disposables: vscode.Disposable[] = [];

  constructor(private readonly logger: Logger) {}

  /**
   * Register a disposable for automatic cleanup
   *
   * @param disposable - VSCode disposable to register
   */
  public registerDisposable(disposable: vscode.Disposable): void {
    this.disposables.push(disposable);
  }

  /**
   * Dispose all managed resources and clear references
   *
   * @param resources - Managed resources to dispose
   * @param workspacePath - Optional workspace path for observation file cleanup
   */
  public async dispose(resources: ManagedResources, workspacePath?: string): Promise<void> {
    this.logger.info('DisposalService', 'Starting resource disposal');

    // Flush observation cache to disk (best-effort)
    if (resources.sharedContextBuilder) {
      try {
        await resources.sharedContextBuilder.getObservationMasker().saveCacheToDisk();
        this.logger.debug('DisposalService', 'Observation cache flushed to disk');
      } catch (error) {
        this.logger.warn('DisposalService', 'Failed to flush observation cache', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      resources.sharedContextBuilder = undefined;
    }

    // Clear timers
    if (resources.cacheSaveTimer) {
      clearTimeout(resources.cacheSaveTimer);
      resources.cacheSaveTimer = null;
      this.logger.debug('DisposalService', 'Cache save timer cleared');
    }

    if (resources.consolidationTimer) {
      clearInterval(resources.consolidationTimer);
      resources.consolidationTimer = null;
      this.logger.debug('DisposalService', 'Consolidation timer cleared');
    }

    // Clear workspace context provider
    if (resources.workspaceContextProvider) {
      resources.workspaceContextProvider = undefined;
    }

    // Stop Claude Code terminals (dynamic import to avoid blocking)
    try {
      const { stopClaudeCode } = await import('../autonomousCommands');
      await stopClaudeCode();
      this.logger.debug('DisposalService', 'Claude Code terminals stopped');
    } catch (error) {
      this.logger.error(
        'DisposalService',
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'stopClaudeCode',
        }
      );
    }

    // Dispose context health monitoring
    this.disposeContextHealthMonitoring(resources);

    // Dispose watchers
    this.disposeWatchers(resources);

    // Clean up observation files
    if (workspacePath) {
      this.cleanupObservationFiles(workspacePath);
    }

    // Clear providers and managers
    this.clearProvidersAndManagers(resources);

    // Stop LSP client
    if (resources.lspClient) {
      try {
        await resources.lspClient.stop();
        this.logger.debug('DisposalService', 'LSP client stopped');
      } catch (error) {
        this.logger.error(
          'DisposalService',
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'lspClient.stop',
          }
        );
      }
      resources.lspClient = undefined;
    }

    // Dispose registered disposables
    for (const disposable of this.disposables) {
      try {
        disposable.dispose();
      } catch (error) {
        this.logger.warn('DisposalService', 'Failed to dispose registered resource', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    this.disposables = [];

    this.logger.info('DisposalService', 'Resource disposal complete');
  }

  /**
   * Dispose context health monitoring resources
   *
   * @param resources - Managed resources
   */
  private disposeContextHealthMonitoring(resources: ManagedResources): void {
    if (resources.contextHealthMonitor) {
      resources.contextHealthMonitor.dispose();
      resources.contextHealthMonitor = undefined;
    }
    if (resources.autoHandoffTrigger) {
      resources.autoHandoffTrigger.dispose();
      resources.autoHandoffTrigger = undefined;
    }
    if (resources.accOrchestrator) {
      resources.accOrchestrator.dispose();
      resources.accOrchestrator = undefined;
    }
    if (resources.observationBridge) {
      resources.observationBridge.dispose();
      resources.observationBridge = undefined;
    }
    if (resources.contextHealthStatusBar) {
      resources.contextHealthStatusBar.dispose();
      resources.contextHealthStatusBar = undefined;
    }
    if (resources.continuousMemoryWriter) {
      resources.continuousMemoryWriter.dispose();
      resources.continuousMemoryWriter = undefined;
    }
    if (resources.contextUsageLogger) {
      resources.contextUsageLogger = undefined;
    }
  }

  /**
   * Dispose file watchers and activity status bars
   *
   * @param resources - Managed resources
   */
  private disposeWatchers(resources: ManagedResources): void {
    if (resources.multiSessionWatcher) {
      resources.multiSessionWatcher.dispose();
      resources.multiSessionWatcher = undefined;
    }
    if (resources.hookBridgeWatcher) {
      resources.hookBridgeWatcher.dispose();
      resources.hookBridgeWatcher = undefined;
    }
    if (resources.goferActivityStatusBar) {
      resources.goferActivityStatusBar.dispose();
      resources.goferActivityStatusBar = undefined;
    }
    // AI Usage Tracking (Feature 025)
    if (resources.aiUsageMonitor) {
      resources.aiUsageMonitor.dispose();
      resources.aiUsageMonitor = undefined;
    }
    if (resources.aiUsageProvider) {
      resources.aiUsageProvider.dispose();
      resources.aiUsageProvider = undefined;
    }
    if (resources.aiUsageStatusBar) {
      resources.aiUsageStatusBar.dispose();
      resources.aiUsageStatusBar = undefined;
    }
    if (resources.resourceDiagnostics) {
      resources.resourceDiagnostics.dispose();
      resources.resourceDiagnostics = undefined;
    }
  }

  /**
   * Clean up observation JSON files on deactivation
   *
   * @param workspacePath - Workspace root path
   */
  private cleanupObservationFiles(workspacePath: string): void {
    try {
      const obsDir = path.join(workspacePath, '.specify', 'hooks', 'observations');
      const fs = require('fs') as typeof import('fs');
      if (fs.existsSync(obsDir)) {
        const files = fs.readdirSync(obsDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              fs.unlinkSync(path.join(obsDir, file));
            } catch {
              // Ignore individual file cleanup errors
            }
          }
        }
        this.logger.debug('DisposalService', 'Observation files cleaned up', {
          directory: obsDir,
          fileCount: files.length,
        });
      }
    } catch (error) {
      this.logger.warn('DisposalService', 'Failed to cleanup observation files', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Clear tree view providers and manager references (allows garbage collection)
   *
   * @param resources - Managed resources
   */
  private clearProvidersAndManagers(resources: ManagedResources): void {
    resources.progressProvider = undefined;
    resources.constitutionProvider = undefined;
    resources.memoryProvider = undefined;
    resources.branchSpecManager = undefined;
    resources.memoryManager = undefined;
    resources.autoUpdater = undefined;
  }
}
