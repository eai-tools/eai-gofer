/**
 * Event Handlers Service
 *
 * Centralized event handler registration for workspace changes, git events,
 * file watchers, and configuration updates.
 *
 * Engineering Remediation Phase 3 - T021
 */

import { injectable } from 'tsyringe';
import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from './Logger';
import { ConfigManager } from '../config';

/**
 * Dependencies required by event handlers
 */
export interface EventHandlerDependencies {
  workspacePath: string;
  context: vscode.ExtensionContext;
  progressProvider?: any;
  branchSpecManager?: any;
  sharedContextBuilder?: any;
  workspaceContextProvider?: any;
  hookBridgeWatcher?: any;
  scopeGuard?: any;
  researchChunker?: any;
  reinitializeExtension: (context: vscode.ExtensionContext) => Promise<void>;
  handleSpecModification: (uri: vscode.Uri, workspacePath: string) => Promise<void>;
  handleBranchChange: () => Promise<void>;
  isUpgrading: () => boolean;
}

/**
 * Event Handlers Service
 *
 * Manages all event listeners for the extension.
 */
@injectable()
export class EventHandlers {
  constructor(private readonly logger: Logger) {}

  /**
   * Register all event handlers
   *
   * @param deps - Dependencies required by event handlers
   */
  public registerAll(deps: EventHandlerDependencies): void {
    this.logger.info('EventHandlers', 'Registering event handlers');

    // Workspace folder changes → reinitialize extension
    this.registerWorkspaceChangeListener(deps);

    // Git branch changes → handle branch change (with 5s debounce)
    this.registerGitBranchListener(deps);

    // Spec file changes → show impact notifications
    this.registerSpecFileWatcher(deps);

    // Configuration changes → runtime config reloads
    this.registerConfigurationChangeListener(deps);

    // Document save → SlopReducer auto-fix
    this.registerDocumentSaveListener(deps);

    // Hook bridge updates → ScopeGuard diagnostics
    this.registerScopeGuardDiagnostics(deps);

    // Research file changes → index research files
    this.registerResearchFileWatcher(deps);

    this.logger.info('EventHandlers', 'Event handlers registered successfully');
  }

  /**
   * Register workspace folder change listener
   * SINGLE listener pattern - no duplicates
   */
  private registerWorkspaceChangeListener(deps: EventHandlerDependencies): void {
    deps.context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        this.logger.info('EventHandlers', 'Workspace folders changed, reinitializing');
        await deps.reinitializeExtension(deps.context);
      })
    );
  }

  /**
   * Register git branch change listener with 5s debounce
   */
  private registerGitBranchListener(deps: EventHandlerDependencies): void {
    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (!gitExtension) {
        this.logger.debug('EventHandlers', 'Git extension not available');
        return;
      }

      const git = gitExtension.exports.getAPI(1);
      if (git.repositories.length === 0) {
        this.logger.debug('EventHandlers', 'No git repositories found');
        return;
      }

      const repo = git.repositories[0];
      let branchChangeTimer: ReturnType<typeof setTimeout> | null = null;

      repo.state.onDidChange(() => {
        if (branchChangeTimer) return; // Already scheduled

        branchChangeTimer = setTimeout(() => {
          branchChangeTimer = null;
          deps.handleBranchChange().catch((error) => {
            this.logger.error('EventHandlers', error as Error, {
              event: 'branchChange',
            });
          });
        }, 5000); // Check at most every 5 seconds
      });

      this.logger.debug('EventHandlers', 'Git branch change listener registered');
    } catch (error) {
      this.logger.warn('EventHandlers', 'Failed to register git branch listener', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Register spec file watcher for impact notifications
   */
  private registerSpecFileWatcher(deps: EventHandlerDependencies): void {
    const specWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(deps.workspacePath, '.specify/specs/**/spec.md')
    );

    specWatcher.onDidChange(async (uri) => {
      try {
        await deps.handleSpecModification(uri, deps.workspacePath);
      } catch (error) {
        this.logger.error('EventHandlers', error as Error, {
          event: 'specFileChange',
          file: uri.fsPath,
        });
      }
    });

    deps.context.subscriptions.push(specWatcher);
    this.logger.debug('EventHandlers', 'Spec file watcher registered');
  }

  /**
   * Register configuration change listener for runtime config reloads
   */
  private registerConfigurationChangeListener(deps: EventHandlerDependencies): void {
    deps.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        // Reload observation preserve patterns
        if (e.affectsConfiguration('gofer.observationPreservePatterns')) {
          this.reloadObservationPatterns(deps);
        }

        // Reload layered memory setting
        if (e.affectsConfiguration('gofer.useLayeredMemory')) {
          this.reloadLayeredMemorySetting(deps);
        }

        // Reload staleness threshold
        if (e.affectsConfiguration('gofer.stageDetectionStalenessMinutes')) {
          this.reloadStalenessThreshold(deps);
        }
      })
    );

    this.logger.debug('EventHandlers', 'Configuration change listener registered');
  }

  /**
   * Reload observation preserve patterns from config
   */
  private reloadObservationPatterns(deps: EventHandlerDependencies): void {
    if (!deps.sharedContextBuilder) return;

    const newPatterns = vscode.workspace
      .getConfiguration('gofer')
      .get<string[]>('observationPreservePatterns', []);

    const allPatterns = [
      /error/i,
      /exception/i,
      /failed/i,
      /failure/i,
      /critical/i,
      /fatal/i,
      /panic/i,
      /unhandled/i,
      /stack\s?trace/i,
      ...newPatterns.map((p: string) => new RegExp(p, 'i')),
    ];

    deps.sharedContextBuilder.getObservationMasker().updatePreservePatterns(allPatterns);

    this.logger.info('EventHandlers', 'Observation preserve patterns reloaded', {
      userPatternCount: newPatterns.length,
    });
  }

  /**
   * Reload layered memory setting from config
   */
  private reloadLayeredMemorySetting(deps: EventHandlerDependencies): void {
    if (!deps.sharedContextBuilder) return;

    const useLayered = vscode.workspace
      .getConfiguration('gofer')
      .get<boolean>('useLayeredMemory', false);

    deps.sharedContextBuilder.setMemoryLayerManager(
      deps.sharedContextBuilder.getMemoryLayerManager(),
      useLayered
    );

    this.logger.info('EventHandlers', 'Layered memory setting reloaded', {
      enabled: useLayered,
    });
  }

  /**
   * Reload staleness threshold from config
   */
  private reloadStalenessThreshold(deps: EventHandlerDependencies): void {
    if (!deps.workspaceContextProvider) return;

    const newMinutes = vscode.workspace
      .getConfiguration('gofer')
      .get<number>('stageDetectionStalenessMinutes', 30);

    deps.workspaceContextProvider.setStalenessThresholdMinutes(newMinutes);

    this.logger.info('EventHandlers', 'Staleness threshold reloaded', {
      minutes: newMinutes,
    });
  }

  /**
   * Register document save listener for SlopReducer auto-fix
   */
  private registerDocumentSaveListener(deps: EventHandlerDependencies): void {
    // Dynamic import of SlopReducer to avoid circular dependencies
    const { SlopReducer } = require('../autonomous/SlopReducer');
    const slopReducer = new SlopReducer(deps.workspacePath);

    deps.context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        const config = ConfigManager.getInstance();
        config.refresh();

        if (!config.getSlopReductionEnabled()) return;

        const filePath = doc.uri.fsPath;
        if (!slopReducer.isEligibleFile(filePath)) return;
        if (slopReducer.isTestFile(filePath)) return;

        slopReducer.reduceFile(filePath);
      })
    );

    this.logger.debug('EventHandlers', 'Document save listener registered (SlopReducer)');
  }

  /**
   * Register ScopeGuard diagnostics on bridge updates
   */
  private registerScopeGuardDiagnostics(deps: EventHandlerDependencies): void {
    if (!deps.hookBridgeWatcher || !deps.scopeGuard) {
      this.logger.debug('EventHandlers', 'ScopeGuard diagnostics skipped (missing dependencies)');
      return;
    }

    const scopeDiagnostics = vscode.languages.createDiagnosticCollection('gofer-scope');
    deps.context.subscriptions.push(scopeDiagnostics);

    deps.hookBridgeWatcher.on('bridge-update', () => {
      const violations = deps.scopeGuard.getViolations();
      if (violations.length === 0) return;

      const diagMap = new Map<string, vscode.Diagnostic[]>();

      for (const v of violations.slice(-20)) {
        const uri = v.file;
        const diags = diagMap.get(uri) || [];

        const severity =
          v.enforcement === 'blocking'
            ? vscode.DiagnosticSeverity.Error
            : v.enforcement === 'warning'
              ? vscode.DiagnosticSeverity.Warning
              : vscode.DiagnosticSeverity.Information;

        const diag = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          `ScopeGuard: ${v.file} matches protected pattern "${v.protectedPattern}"`,
          severity
        );

        diags.push(diag);
        diagMap.set(uri, diags);
      }

      for (const [uri, diags] of diagMap) {
        scopeDiagnostics.set(vscode.Uri.file(uri), diags);
      }
    });

    this.logger.debug('EventHandlers', 'ScopeGuard diagnostics registered');
  }

  /**
   * Register research file watcher for indexing
   */
  private registerResearchFileWatcher(deps: EventHandlerDependencies): void {
    if (!deps.researchChunker) {
      this.logger.debug('EventHandlers', 'Research file watcher skipped (missing researchChunker)');
      return;
    }

    try {
      const researchWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(deps.workspacePath, '.specify/specs/**/research.md')
      );

      const handleResearchChange = (uri: vscode.Uri) => {
        // Extract spec ID from URI
        const specId = this.extractSpecId(uri);
        if (specId) {
          deps.researchChunker.indexResearchFile(specId).catch((error: Error) => {
            this.logger.warn('EventHandlers', `Failed to index research for ${specId}`, {
              error: error.message,
            });
          });
        }
      };

      researchWatcher.onDidCreate(handleResearchChange);
      researchWatcher.onDidChange(handleResearchChange);
      deps.context.subscriptions.push(researchWatcher);

      this.logger.debug('EventHandlers', 'Research file watcher registered');
    } catch (error) {
      this.logger.warn('EventHandlers', 'Failed to set up research watcher', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Extract spec ID from file path
   *
   * @param uri - File URI
   * @returns Spec ID or null
   */
  private extractSpecId(uri: vscode.Uri): string | null {
    const fsPath = uri.fsPath;
    const specsIdx = fsPath.indexOf('.specify/specs/');
    if (specsIdx === -1) {
      return null;
    }

    const afterSpecs = fsPath.substring(specsIdx + '.specify/specs/'.length);
    const slashIdx = afterSpecs.indexOf('/');
    if (slashIdx === -1) {
      return null;
    }

    return afterSpecs.substring(0, slashIdx);
  }
}
