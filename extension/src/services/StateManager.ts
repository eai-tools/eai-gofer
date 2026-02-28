/**
 * State Manager Service
 *
 * Centralized component reference management for the extension.
 * Eliminates module-level globals by providing a singleton service
 * that holds all component references.
 *
 * Engineering Remediation Phase 3 - T025
 */

import { injectable } from 'tsyringe';
import { ProgressProvider } from '../progressProvider';
import { ConstitutionProvider } from '../constitutionProvider';
import { MemoryProvider } from '../memoryProvider';
import { ContextWindowProvider } from '../contextWindowProvider';
import { BranchSpecManager } from '../branchSpecManager';
import { AutoUpdater } from '../autoUpdater';
import { GoferLSPClient } from '../lspClient';
import { MemoryManager } from '../autonomous/MemoryManager';
import { ContextHealthMonitor } from '../autonomous/ContextHealthMonitor';
import { ContextUsageLogger } from '../autonomous/ContextUsageLogger';
import { ContextHealthStatusBar } from '../ui/ContextHealthStatusBar';
import { AutoHandoffTrigger } from '../autonomous/AutoHandoffTrigger';
import { ContinuousMemoryWriter } from '../autonomous/ContinuousMemoryWriter';
import { HookBridgeWatcher } from '../autonomous/HookBridgeWatcher';
import { MultiSessionBridgeWatcher } from '../autonomous/MultiSessionBridgeWatcher';
import { GoferActivityStatusBar } from '../ui/GoferActivityStatusBar';
import { ClaudeCodeContextScanner } from '../autonomous/ClaudeCodeContextScanner';
import { ContextBuilder } from '../autonomous/ContextBuilder';
import { WorkspaceContextProvider } from '../autonomous/WorkspaceContextProvider';
import { ScopeGuard } from '../autonomous/ScopeGuard';
import { ResearchChunker } from '../autonomous/ResearchChunker';
import { CostBudgetEnforcer } from '../autonomous/CostBudgetEnforcer';

/**
 * State Manager Service
 *
 * Holds all component references for the extension lifecycle.
 * Replaces module-level globals with a singleton DI service.
 */
@injectable()
export class StateManager {
  // Tree view providers
  private _progressProvider?: ProgressProvider;
  private _constitutionProvider?: ConstitutionProvider;
  private _memoryProvider?: MemoryProvider;
  private _contextWindowProvider?: ContextWindowProvider;

  // Core services
  private _branchSpecManager?: BranchSpecManager;
  private _autoUpdater?: AutoUpdater;
  private _lspClient?: GoferLSPClient;
  private _memoryManager?: MemoryManager;

  // Context Health Monitoring (Spec 012)
  private _contextHealthMonitor?: ContextHealthMonitor;
  private _contextUsageLogger?: ContextUsageLogger;
  private _contextHealthStatusBar?: ContextHealthStatusBar;
  private _autoHandoffTrigger?: AutoHandoffTrigger;

  // Real Context Monitoring (Spec 014)
  private _continuousMemoryWriter?: ContinuousMemoryWriter;

  // Hook-based monitoring
  private _hookBridgeWatcher?: HookBridgeWatcher;
  private _multiSessionWatcher?: MultiSessionBridgeWatcher;
  private _goferActivityStatusBar?: GoferActivityStatusBar;

  // Context Window Accuracy (Feature 023)
  private _contextScanner?: ClaudeCodeContextScanner;

  // Module-level references for deactivate cleanup
  private _cacheSaveTimer?: ReturnType<typeof setTimeout> | null;
  private _sharedContextBuilder?: ContextBuilder;
  private _consolidationTimer?: ReturnType<typeof setInterval> | null;
  private _workspaceContextProvider?: WorkspaceContextProvider;

  // ScopeGuard, ResearchChunker, and CostBudgetEnforcer
  private _scopeGuard?: ScopeGuard;
  private _researchChunker?: ResearchChunker;
  private _costBudgetEnforcer?: CostBudgetEnforcer;

  // Flags
  private _isUpgrading = false;
  private _isReinitializing = false;

  // --- Tree View Providers ---

  public get progressProvider(): ProgressProvider | undefined {
    return this._progressProvider;
  }

  public set progressProvider(value: ProgressProvider | undefined) {
    this._progressProvider = value;
  }

  public get constitutionProvider(): ConstitutionProvider | undefined {
    return this._constitutionProvider;
  }

  public set constitutionProvider(value: ConstitutionProvider | undefined) {
    this._constitutionProvider = value;
  }

  public get memoryProvider(): MemoryProvider | undefined {
    return this._memoryProvider;
  }

  public set memoryProvider(value: MemoryProvider | undefined) {
    this._memoryProvider = value;
  }

  public get contextWindowProvider(): ContextWindowProvider | undefined {
    return this._contextWindowProvider;
  }

  public set contextWindowProvider(value: ContextWindowProvider | undefined) {
    this._contextWindowProvider = value;
  }

  // --- Core Services ---

  public get branchSpecManager(): BranchSpecManager | undefined {
    return this._branchSpecManager;
  }

  public set branchSpecManager(value: BranchSpecManager | undefined) {
    this._branchSpecManager = value;
  }

  public get autoUpdater(): AutoUpdater | undefined {
    return this._autoUpdater;
  }

  public set autoUpdater(value: AutoUpdater | undefined) {
    this._autoUpdater = value;
  }

  public get lspClient(): GoferLSPClient | undefined {
    return this._lspClient;
  }

  public set lspClient(value: GoferLSPClient | undefined) {
    this._lspClient = value;
  }

  public get memoryManager(): MemoryManager | undefined {
    return this._memoryManager;
  }

  public set memoryManager(value: MemoryManager | undefined) {
    this._memoryManager = value;
  }

  // --- Context Health Monitoring ---

  public get contextHealthMonitor(): ContextHealthMonitor | undefined {
    return this._contextHealthMonitor;
  }

  public set contextHealthMonitor(value: ContextHealthMonitor | undefined) {
    this._contextHealthMonitor = value;
  }

  public get contextUsageLogger(): ContextUsageLogger | undefined {
    return this._contextUsageLogger;
  }

  public set contextUsageLogger(value: ContextUsageLogger | undefined) {
    this._contextUsageLogger = value;
  }

  public get contextHealthStatusBar(): ContextHealthStatusBar | undefined {
    return this._contextHealthStatusBar;
  }

  public set contextHealthStatusBar(value: ContextHealthStatusBar | undefined) {
    this._contextHealthStatusBar = value;
  }

  public get autoHandoffTrigger(): AutoHandoffTrigger | undefined {
    return this._autoHandoffTrigger;
  }

  public set autoHandoffTrigger(value: AutoHandoffTrigger | undefined) {
    this._autoHandoffTrigger = value;
  }

  // --- Real Context Monitoring ---

  public get continuousMemoryWriter(): ContinuousMemoryWriter | undefined {
    return this._continuousMemoryWriter;
  }

  public set continuousMemoryWriter(value: ContinuousMemoryWriter | undefined) {
    this._continuousMemoryWriter = value;
  }

  // --- Hook-based Monitoring ---

  public get hookBridgeWatcher(): HookBridgeWatcher | undefined {
    return this._hookBridgeWatcher;
  }

  public set hookBridgeWatcher(value: HookBridgeWatcher | undefined) {
    this._hookBridgeWatcher = value;
  }

  public get multiSessionWatcher(): MultiSessionBridgeWatcher | undefined {
    return this._multiSessionWatcher;
  }

  public set multiSessionWatcher(value: MultiSessionBridgeWatcher | undefined) {
    this._multiSessionWatcher = value;
  }

  public get goferActivityStatusBar(): GoferActivityStatusBar | undefined {
    return this._goferActivityStatusBar;
  }

  public set goferActivityStatusBar(value: GoferActivityStatusBar | undefined) {
    this._goferActivityStatusBar = value;
  }

  // --- Context Window Accuracy ---

  public get contextScanner(): ClaudeCodeContextScanner | undefined {
    return this._contextScanner;
  }

  public set contextScanner(value: ClaudeCodeContextScanner | undefined) {
    this._contextScanner = value;
  }

  // --- Cleanup References ---

  public get cacheSaveTimer(): ReturnType<typeof setTimeout> | null | undefined {
    return this._cacheSaveTimer;
  }

  public set cacheSaveTimer(value: ReturnType<typeof setTimeout> | null | undefined) {
    this._cacheSaveTimer = value;
  }

  public get sharedContextBuilder(): ContextBuilder | undefined {
    return this._sharedContextBuilder;
  }

  public set sharedContextBuilder(value: ContextBuilder | undefined) {
    this._sharedContextBuilder = value;
  }

  public get consolidationTimer(): ReturnType<typeof setInterval> | null | undefined {
    return this._consolidationTimer;
  }

  public set consolidationTimer(value: ReturnType<typeof setInterval> | null | undefined) {
    this._consolidationTimer = value;
  }

  public get workspaceContextProvider(): WorkspaceContextProvider | undefined {
    return this._workspaceContextProvider;
  }

  public set workspaceContextProvider(value: WorkspaceContextProvider | undefined) {
    this._workspaceContextProvider = value;
  }

  // --- Additional Services ---

  public get scopeGuard(): ScopeGuard | undefined {
    return this._scopeGuard;
  }

  public set scopeGuard(value: ScopeGuard | undefined) {
    this._scopeGuard = value;
  }

  public get researchChunker(): ResearchChunker | undefined {
    return this._researchChunker;
  }

  public set researchChunker(value: ResearchChunker | undefined) {
    this._researchChunker = value;
  }

  public get costBudgetEnforcer(): CostBudgetEnforcer | undefined {
    return this._costBudgetEnforcer;
  }

  public set costBudgetEnforcer(value: CostBudgetEnforcer | undefined) {
    this._costBudgetEnforcer = value;
  }

  // --- Flags ---

  public get isUpgrading(): boolean {
    return this._isUpgrading;
  }

  public set isUpgrading(value: boolean) {
    this._isUpgrading = value;
  }

  public get isReinitializing(): boolean {
    return this._isReinitializing;
  }

  public set isReinitializing(value: boolean) {
    this._isReinitializing = value;
  }

  /**
   * Clear all component references
   * Used during reinitialization
   */
  public clearMonitoringComponents(): void {
    this._contextHealthMonitor = undefined;
    this._autoHandoffTrigger = undefined;
    this._continuousMemoryWriter = undefined;
    this._hookBridgeWatcher = undefined;
    this._multiSessionWatcher = undefined;
    this._goferActivityStatusBar = undefined;
    this._contextScanner = undefined;
    this._contextUsageLogger = undefined;
    this._workspaceContextProvider = undefined;
  }

  /**
   * Clear all timer references
   * Used during cleanup
   */
  public clearTimers(): void {
    this._cacheSaveTimer = null;
    this._consolidationTimer = null;
  }

  /**
   * Reset reinitialization flag
   * Used in finally block of reinitialize
   */
  public resetReinitializationFlag(): void {
    this._isReinitializing = false;
  }
}
