/**
 * Unit tests for ContextHealthStatusBar
 *
 * Tests status bar creation, color updates, click handler,
 * and integration with ContextHealthMonitor.
 *
 * @see .specify/specs/011-context-health-recursive-memory/tasks.md T029, T071
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ContextHealthMonitor,
  type ContextHealthStatus,
} from '../../../extension/src/autonomous/ContextHealthMonitor';

// Mock Logger first (before any imports that use it)
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

// Create mock objects at module level using factory pattern
const createMockStatusBarItem = () => ({
  text: '',
  tooltip: '',
  command: '',
  color: undefined as unknown,
  backgroundColor: undefined as unknown,
  show: vi.fn(),
  hide: vi.fn(),
  dispose: vi.fn(),
});

// Mock VSCode API
vi.mock('vscode', () => {
  const mockDisposable = { dispose: vi.fn() };
  const mockStatusBarItem = {
    text: '',
    tooltip: '',
    command: '',
    color: undefined as unknown,
    backgroundColor: undefined as unknown,
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  };

  return {
    window: {
      createStatusBarItem: vi.fn(() => mockStatusBarItem),
      showQuickPick: vi.fn().mockResolvedValue(null),
      showInformationMessage: vi.fn().mockResolvedValue(undefined),
    },
    commands: {
      registerCommand: vi.fn(() => mockDisposable),
      executeCommand: vi.fn().mockResolvedValue(undefined),
    },
    StatusBarAlignment: {
      Left: 1,
      Right: 2,
    },
    ThemeColor: class ThemeColor {
      constructor(public id: string) {}
    },
    QuickPickItemKind: {
      Separator: -1,
      Default: 0,
    },
  };
});

// Import after mocks are set up
import {
  ContextHealthStatusBar,
  SHOW_CONTEXT_HEALTH_COMMAND,
  type MaskingStatistics,
  type StageProfileUsage,
} from '../../../extension/src/ui/ContextHealthStatusBar';
import type {
  GoferStage,
  StageContextProfile,
} from '../../../extension/src/autonomous/StageContextProfile';
import * as vscode from 'vscode';

describe('ContextHealthStatusBar', () => {
  let statusBar: ContextHealthStatusBar;
  let mockContext: { subscriptions: { push: ReturnType<typeof vi.fn> } };
  let mockStatusBarItem: ReturnType<typeof createMockStatusBarItem>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Get fresh references to mocked objects
    mockStatusBarItem = createMockStatusBarItem();
    vi.mocked(vscode.window.createStatusBarItem).mockReturnValue(
      mockStatusBarItem as unknown as vscode.StatusBarItem
    );

    // Create mock extension context
    mockContext = {
      subscriptions: {
        push: vi.fn(),
      },
    };

    statusBar = new ContextHealthStatusBar(mockContext as unknown as vscode.ExtensionContext);
  });

  afterEach(() => {
    statusBar.dispose();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Creation Tests (T025)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('creation', () => {
    it('should create status bar item with left alignment', () => {
      expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
        vscode.StatusBarAlignment.Left,
        100
      );
    });

    it('should register command for click handler', () => {
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        SHOW_CONTEXT_HEALTH_COMMAND,
        expect.any(Function)
      );
    });

    it('should set command on status bar item', () => {
      expect(mockStatusBarItem.command).toBe(SHOW_CONTEXT_HEALTH_COMMAND);
    });

    it('should add disposables to extension context', () => {
      expect(mockContext.subscriptions.push).toHaveBeenCalled();
    });

    it('should set initial state with no data', () => {
      expect(mockStatusBarItem.text).toContain('Context: --');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Color-coded Display Tests (T026)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('color-coded display', () => {
    it('should display healthy status with check icon', () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 35,
        tokensUsed: 42000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 10000,
          memories: 5000,
          hints: 2000,
          observations: 5000,
          systemFiles: 5000,
          conversation: 15000,
        },
        recommendations: ['Context usage is healthy.'],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);

      expect(mockStatusBarItem.text).toContain('$(check)');
      expect(mockStatusBarItem.text).toContain('35%');
    });

    it('should display warning status with warning icon', () => {
      const status: ContextHealthStatus = {
        status: 'warning',
        utilizationPercent: 58,
        tokensUsed: 69600,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 15000,
          memories: 10000,
          hints: 4600,
          observations: 10000,
          systemFiles: 5000,
          conversation: 25000,
        },
        recommendations: ['Consider reducing context.'],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);

      expect(mockStatusBarItem.text).toContain('$(warning)');
      expect(mockStatusBarItem.text).toContain('58%');
    });

    it('should display critical status with error icon', () => {
      const status: ContextHealthStatus = {
        status: 'critical',
        utilizationPercent: 85,
        tokensUsed: 102000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 20000,
          memories: 15000,
          hints: 7000,
          observations: 20000,
          systemFiles: 10000,
          conversation: 30000,
        },
        recommendations: ['Immediate action recommended.'],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);

      expect(mockStatusBarItem.text).toContain('$(error)');
      expect(mockStatusBarItem.text).toContain('85%');
    });

    it('should set appropriate color for each status', () => {
      const healthyStatus: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 25,
        tokensUsed: 30000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 5000,
          memories: 5000,
          hints: 5000,
          observations: 5000,
          systemFiles: 5000,
          conversation: 5000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(healthyStatus);
      const healthyColor = mockStatusBarItem.color;

      const warningStatus = {
        ...healthyStatus,
        status: 'warning' as const,
        utilizationPercent: 60,
      };
      statusBar.updateDisplay(warningStatus);
      const warningColor = mockStatusBarItem.color;

      const criticalStatus = {
        ...healthyStatus,
        status: 'critical' as const,
        utilizationPercent: 80,
      };
      statusBar.updateDisplay(criticalStatus);
      const criticalColor = mockStatusBarItem.color;

      // Colors should be different ThemeColor instances
      expect(healthyColor).toBeDefined();
      expect(warningColor).toBeDefined();
      expect(criticalColor).toBeDefined();
    });

    it('should set background color for warning and critical', () => {
      const warningStatus: ContextHealthStatus = {
        status: 'warning',
        utilizationPercent: 60,
        tokensUsed: 72000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 12000,
          memories: 12000,
          hints: 12000,
          observations: 12000,
          systemFiles: 12000,
          conversation: 12000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(warningStatus);
      expect(mockStatusBarItem.backgroundColor).toBeDefined();

      const criticalStatus = {
        ...warningStatus,
        status: 'critical' as const,
        utilizationPercent: 80,
      };
      statusBar.updateDisplay(criticalStatus);
      expect(mockStatusBarItem.backgroundColor).toBeDefined();
    });

    it('should round percentage in display', () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 33.333,
        tokensUsed: 40000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 10000,
          memories: 10000,
          hints: 5000,
          observations: 5000,
          systemFiles: 5000,
          conversation: 5000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);

      expect(mockStatusBarItem.text).toContain('33%');
      expect(mockStatusBarItem.text).not.toContain('33.333');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Tooltip Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('tooltip', () => {
    it('should include status and usage in tooltip', () => {
      const status: ContextHealthStatus = {
        status: 'warning',
        utilizationPercent: 55,
        tokensUsed: 66000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 11000,
          memories: 11000,
          hints: 11000,
          observations: 11000,
          systemFiles: 11000,
          conversation: 11000,
        },
        recommendations: ['Consider reducing context.'],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);

      // Real data tooltip shows "Last API call: X / Y tokens"
      expect(mockStatusBarItem.tooltip).toContain('66,000');
      expect(mockStatusBarItem.tooltip).toContain('120,000');
    });

    it('should include recommendation in tooltip for non-healthy status', () => {
      const status: ContextHealthStatus = {
        status: 'warning',
        utilizationPercent: 55,
        tokensUsed: 66000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 11000,
          memories: 11000,
          hints: 11000,
          observations: 11000,
          systemFiles: 11000,
          conversation: 11000,
        },
        recommendations: ['Consider saving progress.'],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);

      expect(mockStatusBarItem.tooltip).toContain('Consider saving progress.');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Click Handler Tests (T027)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('click handler', () => {
    it('should show information message when no status available', async () => {
      // Get the registered command handler
      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;

      await commandHandler();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'No context health data available.'
      );
    });

    it('should show QuickPick when status available', async () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 40,
        tokensUsed: 48000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 8000,
          memories: 8000,
          hints: 8000,
          observations: 8000,
          systemFiles: 8000,
          conversation: 8000,
        },
        recommendations: ['Context is healthy.'],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);

      // Get the registered command handler
      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      expect(vscode.window.showQuickPick).toHaveBeenCalled();
    });

    it('should show session info (not breakdown) for real data in QuickPick', async () => {
      const status: ContextHealthStatus = {
        status: 'warning',
        utilizationPercent: 60,
        tokensUsed: 72000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 15000,
          memories: 12000,
          hints: 5000,
          observations: 20000,
          systemFiles: 5000,
          conversation: 15000,
        },
        recommendations: ['Consider reducing context.'],
        timestamp: Date.now(),
        dataSource: 'real' as const,
        model: 'claude-opus-4-5-20251101',
        sessionId: 'test-session-123',
      };

      statusBar.updateDisplay(status);

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string }>;

      const labels = items.map((item) => item.label);
      // Real data shows session info, not token breakdown
      expect(labels.some((l) => l.includes('Session Info'))).toBe(true);
      expect(labels.some((l) => l.includes('Token Breakdown'))).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Monitor Connection Tests (T028)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('monitor connection', () => {
    let monitor: ContextHealthMonitor;

    beforeEach(() => {
      monitor = new ContextHealthMonitor();
    });

    afterEach(() => {
      monitor.dispose();
    });

    it('should update display when monitor emits healthy event', () => {
      statusBar.connect(monitor);

      monitor.analyzeContext({
        breakdown: { conversation: 30000 },
      });

      // Without dataSource 'real', shows as no-session
      expect(mockStatusBarItem.text).toContain('Context: --');
    });

    it('should update display with real data when monitor emits healthy event', () => {
      statusBar.connect(monitor);

      monitor.analyzeContext({
        breakdown: { conversation: 30000 },
        dataSource: 'real',
      });

      expect(mockStatusBarItem.text).toContain('$(check)');
      expect(mockStatusBarItem.text).toContain('25%');
    });

    it('should update display when monitor emits warning event', () => {
      statusBar.connect(monitor);

      monitor.analyzeContext({
        breakdown: { conversation: 70000 },
        dataSource: 'real',
      });

      expect(mockStatusBarItem.text).toContain('$(warning)');
    });

    it('should update display when monitor emits critical event', () => {
      statusBar.connect(monitor);

      monitor.analyzeContext({
        breakdown: { conversation: 100000 },
        dataSource: 'real',
      });

      expect(mockStatusBarItem.text).toContain('$(error)');
    });

    it('should initialize with last status from monitor', () => {
      // Analyze before connecting
      monitor.analyzeContext({
        breakdown: { conversation: 60000 },
        dataSource: 'real',
      });

      statusBar.connect(monitor);

      expect(mockStatusBarItem.text).toContain('50%');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Show/Hide Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('show/hide', () => {
    it('should call show on status bar item', () => {
      statusBar.show();
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should call hide on status bar item', () => {
      statusBar.hide();
      expect(mockStatusBarItem.hide).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Disposal Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('disposal', () => {
    it('should dispose status bar item', () => {
      statusBar.dispose();
      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });

    it('should return current status', () => {
      expect(statusBar.getCurrentStatus()).toBeNull();

      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 30,
        tokensUsed: 36000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 6000,
          memories: 6000,
          hints: 6000,
          observations: 6000,
          systemFiles: 6000,
          conversation: 6000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      expect(statusBar.getCurrentStatus()).toBe(status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Masking Statistics Tests (T069, T071)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('masking statistics', () => {
    const createMaskingStats = (overrides?: Partial<MaskingStatistics>): MaskingStatistics => ({
      maskedCount: 10,
      tokensSaved: 5000,
      totalObservations: 25,
      expansionRequests: 2,
      ...overrides,
    });

    it('should update masking stats', () => {
      const stats = createMaskingStats();
      statusBar.updateMaskingStats(stats);
      expect(statusBar.getMaskingStats()).toBe(stats);
    });

    it('should return null when no masking stats set', () => {
      expect(statusBar.getMaskingStats()).toBeNull();
    });

    it('should display masking stats in QuickPick when available', async () => {
      const status: ContextHealthStatus = {
        status: 'warning',
        utilizationPercent: 60,
        tokensUsed: 72000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 12000,
          memories: 12000,
          hints: 12000,
          observations: 12000,
          systemFiles: 12000,
          conversation: 12000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      statusBar.updateMaskingStats(createMaskingStats());

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string }>;
      const labels = items.map((item) => item.label);

      expect(labels.some((l) => l.includes('Observation Masking'))).toBe(true);
      expect(labels.some((l) => l.includes('Masked Observations'))).toBe(true);
      expect(labels.some((l) => l.includes('Tokens Saved'))).toBe(true);
    });

    it('should show expansion requests when non-zero', async () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 40,
        tokensUsed: 48000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 8000,
          memories: 8000,
          hints: 8000,
          observations: 8000,
          systemFiles: 8000,
          conversation: 8000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      statusBar.updateMaskingStats(createMaskingStats({ expansionRequests: 5 }));

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string }>;
      const labels = items.map((item) => item.label);

      expect(labels.some((l) => l.includes('Expansion Requests'))).toBe(true);
    });

    it('should not show expansion requests when zero', async () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 40,
        tokensUsed: 48000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 8000,
          memories: 8000,
          hints: 8000,
          observations: 8000,
          systemFiles: 8000,
          conversation: 8000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      statusBar.updateMaskingStats(createMaskingStats({ expansionRequests: 0 }));

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string }>;
      const labels = items.map((item) => item.label);

      expect(labels.some((l) => l.includes('Expansion Requests'))).toBe(false);
    });

    it('should calculate masking percentage correctly', async () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 40,
        tokensUsed: 48000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 8000,
          memories: 8000,
          hints: 8000,
          observations: 8000,
          systemFiles: 8000,
          conversation: 8000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      statusBar.updateMaskingStats(
        createMaskingStats({
          maskedCount: 5,
          totalObservations: 20, // 25%
        })
      );

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string; description?: string }>;

      const maskedItem = items.find((item) => item.label.includes('Masked Observations'));
      expect(maskedItem?.description).toContain('5 of 20');
      expect(maskedItem?.description).toContain('25%');
    });

    it('should handle zero total observations without division by zero', async () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 40,
        tokensUsed: 48000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 8000,
          memories: 8000,
          hints: 8000,
          observations: 8000,
          systemFiles: 8000,
          conversation: 8000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      statusBar.updateMaskingStats(
        createMaskingStats({
          maskedCount: 0,
          totalObservations: 0, // Edge case: no observations yet
        })
      );

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string; description?: string }>;

      const maskedItem = items.find((item) => item.label.includes('Masked Observations'));
      expect(maskedItem?.description).toContain('0 of 0');
      expect(maskedItem?.description).toContain('0%'); // Should be 0%, not NaN or Infinity
    });

    it('should format tokens saved with locale formatting', async () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 40,
        tokensUsed: 48000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 8000,
          memories: 8000,
          hints: 8000,
          observations: 8000,
          systemFiles: 8000,
          conversation: 8000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      statusBar.updateMaskingStats(
        createMaskingStats({
          tokensSaved: 12500, // Should be formatted as "12,500"
        })
      );

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string; description?: string }>;

      const tokensSavedItem = items.find((item) => item.label.includes('Tokens Saved'));
      // Check that large numbers are formatted (contains comma for thousands)
      expect(tokensSavedItem?.description).toMatch(/12,500|12\.500|12 500/); // Different locale formats
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Stage Profile Usage Tests (T070, T071)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('stage profile usage', () => {
    const createStageProfile = (stage: GoferStage): StageContextProfile => ({
      stage,
      researchBudget: 0.15,
      memoryBudget: 0.15,
      codeBudget: 0.4,
      observationWindow: 10,
    });

    const createStageProfileUsage = (
      overrides?: Partial<StageProfileUsage>
    ): StageProfileUsage => ({
      currentStage: 'implement',
      profile: createStageProfile('implement'),
      budgetUtilization: {
        research: 0.5,
        memory: 0.3,
        code: 0.8,
        conversation: 0.6,
      },
      stageHistory: [
        { stage: 'implement', timestamp: Date.now() },
        { stage: 'tasks', timestamp: Date.now() - 60000 },
        { stage: 'plan', timestamp: Date.now() - 120000 },
      ],
      ...overrides,
    });

    it('should update stage profile usage', () => {
      const usage = createStageProfileUsage();
      statusBar.updateStageProfileUsage(usage);
      expect(statusBar.getStageProfileUsage()).toBe(usage);
    });

    it('should return null when no stage profile usage set', () => {
      expect(statusBar.getStageProfileUsage()).toBeNull();
    });

    it('should display stage profile in QuickPick when available', async () => {
      const status: ContextHealthStatus = {
        status: 'warning',
        utilizationPercent: 60,
        tokensUsed: 72000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 12000,
          memories: 12000,
          hints: 12000,
          observations: 12000,
          systemFiles: 12000,
          conversation: 12000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      statusBar.updateStageProfileUsage(createStageProfileUsage());

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string }>;
      const labels = items.map((item) => item.label);

      expect(labels.some((l) => l.includes('Stage Profile'))).toBe(true);
      expect(labels.some((l) => l.includes('Current Stage'))).toBe(true);
    });

    it('should display all budget categories', async () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 40,
        tokensUsed: 48000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 8000,
          memories: 8000,
          hints: 8000,
          observations: 8000,
          systemFiles: 8000,
          conversation: 8000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      statusBar.updateStageProfileUsage(createStageProfileUsage());

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string }>;
      const labels = items.map((item) => item.label);

      expect(labels.some((l) => l.includes('Research Budget'))).toBe(true);
      expect(labels.some((l) => l.includes('Memory Budget'))).toBe(true);
      expect(labels.some((l) => l.includes('Code Budget'))).toBe(true);
      expect(labels.some((l) => l.includes('Conversation Budget'))).toBe(true);
    });

    it('should calculate budget utilization percentages correctly', async () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 40,
        tokensUsed: 48000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 8000,
          memories: 8000,
          hints: 8000,
          observations: 8000,
          systemFiles: 8000,
          conversation: 8000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      statusBar.updateStageProfileUsage(
        createStageProfileUsage({
          budgetUtilization: {
            research: 0.75, // Should display as 75%
            memory: 0.25, // Should display as 25%
            code: 0.9, // Should display as 90%
            conversation: 0.1, // Should display as 10%
          },
        })
      );

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string; description?: string }>;

      const researchItem = items.find((item) => item.label.includes('Research Budget'));
      const memoryItem = items.find((item) => item.label.includes('Memory Budget'));
      const codeItem = items.find((item) => item.label.includes('Code Budget'));
      const conversationItem = items.find((item) => item.label.includes('Conversation Budget'));

      expect(researchItem?.description).toContain('75%');
      expect(memoryItem?.description).toContain('25%');
      expect(codeItem?.description).toContain('90%');
      expect(conversationItem?.description).toContain('10%');
    });

    it('should display stage history when multiple stages', async () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 40,
        tokensUsed: 48000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 8000,
          memories: 8000,
          hints: 8000,
          observations: 8000,
          systemFiles: 8000,
          conversation: 8000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      statusBar.updateStageProfileUsage(
        createStageProfileUsage({
          stageHistory: [
            { stage: 'implement', timestamp: Date.now() },
            { stage: 'tasks', timestamp: Date.now() - 60000 },
          ],
        })
      );

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string }>;
      const labels = items.map((item) => item.label);

      expect(labels.some((l) => l.includes('Recent Stages'))).toBe(true);
    });

    it('should not display stage history for single stage', async () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 40,
        tokensUsed: 48000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 8000,
          memories: 8000,
          hints: 8000,
          observations: 8000,
          systemFiles: 8000,
          conversation: 8000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      statusBar.updateStageProfileUsage(
        createStageProfileUsage({
          stageHistory: [{ stage: 'implement', timestamp: Date.now() }],
        })
      );

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string }>;
      const labels = items.map((item) => item.label);

      expect(labels.some((l) => l.includes('Recent Stages'))).toBe(false);
    });

    it('should display all Gofer stages correctly', async () => {
      const stages: GoferStage[] = [
        'research',
        'specify',
        'plan',
        'tasks',
        'implement',
        'validate',
      ];

      for (const stage of stages) {
        const status: ContextHealthStatus = {
          status: 'healthy',
          utilizationPercent: 40,
          tokensUsed: 48000,
          tokensLimit: 120000,
          breakdown: {
            specArtifacts: 8000,
            memories: 8000,
            hints: 8000,
            observations: 8000,
            systemFiles: 8000,
            conversation: 8000,
          },
          recommendations: [],
          timestamp: Date.now(),
          dataSource: 'real' as const,
        };

        statusBar.updateDisplay(status);
        statusBar.updateStageProfileUsage(
          createStageProfileUsage({
            currentStage: stage,
            profile: createStageProfile(stage),
            stageHistory: [{ stage, timestamp: Date.now() }],
          })
        );

        const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
        const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
        await commandHandler();

        const quickPickMock = vi.mocked(vscode.window.showQuickPick);
        const lastCall = quickPickMock.mock.calls[quickPickMock.mock.calls.length - 1];
        const items = lastCall[0] as Array<{ label: string; description?: string }>;

        const currentStageItem = items.find((item) => item.label.includes('Current Stage'));
        expect(currentStageItem).toBeDefined();
        expect(currentStageItem?.description?.toLowerCase()).toContain(stage);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Combined Dashboard Display Tests (T068, T071)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('combined dashboard display', () => {
    it('should display all sections when all data available', async () => {
      const status: ContextHealthStatus = {
        status: 'warning',
        utilizationPercent: 60,
        tokensUsed: 72000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 12000,
          memories: 12000,
          hints: 12000,
          observations: 12000,
          systemFiles: 12000,
          conversation: 12000,
        },
        recommendations: ['Consider saving progress.'],
        timestamp: Date.now(),
        dataSource: 'real' as const,
        model: 'claude-opus-4-5-20251101',
        sessionId: 'test-session-123',
      };

      const maskingStats: MaskingStatistics = {
        maskedCount: 10,
        tokensSaved: 5000,
        totalObservations: 25,
        expansionRequests: 2,
      };

      const stageProfileUsage: StageProfileUsage = {
        currentStage: 'implement',
        profile: {
          stage: 'implement',
          researchBudget: 0.15,
          memoryBudget: 0.15,
          codeBudget: 0.4,
          observationWindow: 10,
        },
        budgetUtilization: {
          research: 0.5,
          memory: 0.3,
          code: 0.8,
          conversation: 0.6,
        },
        stageHistory: [
          { stage: 'implement', timestamp: Date.now() },
          { stage: 'tasks', timestamp: Date.now() - 60000 },
        ],
      };

      statusBar.updateDisplay(status);
      statusBar.updateMaskingStats(maskingStats);
      statusBar.updateStageProfileUsage(stageProfileUsage);

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string }>;
      const labels = items.map((item) => item.label);

      // All sections should be present (Token Breakdown is hidden for real data)
      expect(labels.some((l) => l.includes('Summary'))).toBe(true);
      expect(labels.some((l) => l.includes('Session Info'))).toBe(true);
      expect(labels.some((l) => l.includes('Token Breakdown'))).toBe(false);
      expect(labels.some((l) => l.includes('Observation Masking'))).toBe(true);
      expect(labels.some((l) => l.includes('Stage Profile'))).toBe(true);
      expect(labels.some((l) => l.includes('Recommendations'))).toBe(true);
      expect(labels.some((l) => l.includes('Actions'))).toBe(true);
    });

    it('should not show masking section when stats not set', async () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 40,
        tokensUsed: 48000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 8000,
          memories: 8000,
          hints: 8000,
          observations: 8000,
          systemFiles: 8000,
          conversation: 8000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      // Don't set masking stats

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string }>;
      const labels = items.map((item) => item.label);

      expect(labels.some((l) => l.includes('Observation Masking'))).toBe(false);
    });

    it('should not show stage profile section when usage not set', async () => {
      const status: ContextHealthStatus = {
        status: 'healthy',
        utilizationPercent: 40,
        tokensUsed: 48000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 8000,
          memories: 8000,
          hints: 8000,
          observations: 8000,
          systemFiles: 8000,
          conversation: 8000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real' as const,
      };

      statusBar.updateDisplay(status);
      // Don't set stage profile usage

      const registerCommandMock = vi.mocked(vscode.commands.registerCommand);
      const commandHandler = registerCommandMock.mock.calls[0][1] as () => Promise<void>;
      await commandHandler();

      const quickPickMock = vi.mocked(vscode.window.showQuickPick);
      const quickPickCall = quickPickMock.mock.calls[0];
      const items = quickPickCall[0] as Array<{ label: string }>;
      const labels = items.map((item) => item.label);

      expect(labels.some((l) => l.includes('Stage Profile'))).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T029: Real/No-Session Display Mode Tests (Spec 014 Phase 4)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('real data display mode (T026)', () => {
    it('should show model name for real data', () => {
      const status = {
        status: 'healthy' as const,
        utilizationPercent: 54,
        tokensUsed: 108000,
        tokensLimit: 200000,
        breakdown: {
          specArtifacts: 0,
          memories: 0,
          hints: 0,
          observations: 0,
          systemFiles: 0,
          conversation: 108000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real',
        model: 'claude-opus-4-5-20251101',
        sessionId: 'test-session',
      } as ContextHealthStatus & Record<string, unknown>;

      statusBar.updateDisplay(status);

      expect(mockStatusBarItem.text).toContain('54%');
      expect(mockStatusBarItem.text).toContain('Opus 4.5');
    });

    it('should show Sonnet for sonnet models', () => {
      const status = {
        status: 'healthy' as const,
        utilizationPercent: 30,
        tokensUsed: 60000,
        tokensLimit: 200000,
        breakdown: {
          specArtifacts: 0,
          memories: 0,
          hints: 0,
          observations: 0,
          systemFiles: 0,
          conversation: 60000,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'real',
        model: 'claude-sonnet-4-20250514',
        sessionId: 'test-session',
      } as ContextHealthStatus & Record<string, unknown>;

      statusBar.updateDisplay(status);

      expect(mockStatusBarItem.text).toContain('Sonnet 4');
    });
  });

  describe('no-session display mode (T027)', () => {
    it('should show "No session" when dataSource is none', () => {
      const status = {
        status: 'healthy' as const,
        utilizationPercent: 0,
        tokensUsed: 0,
        tokensLimit: 200000,
        breakdown: {
          specArtifacts: 0,
          memories: 0,
          hints: 0,
          observations: 0,
          systemFiles: 0,
          conversation: 0,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'none',
      } as ContextHealthStatus & Record<string, unknown>;

      statusBar.updateDisplay(status);

      expect(mockStatusBarItem.text).toContain('Context: --');
    });

    it('should use dim color for no-session mode', () => {
      const status = {
        status: 'healthy' as const,
        utilizationPercent: 0,
        tokensUsed: 0,
        tokensLimit: 200000,
        breakdown: {
          specArtifacts: 0,
          memories: 0,
          hints: 0,
          observations: 0,
          systemFiles: 0,
          conversation: 0,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'none',
      } as ContextHealthStatus & Record<string, unknown>;

      statusBar.updateDisplay(status);

      expect(mockStatusBarItem.color).toBeDefined();
      expect(mockStatusBarItem.backgroundColor).toBeUndefined();
    });

    it('should show helpful tooltip for no-session mode', () => {
      const status = {
        status: 'healthy' as const,
        utilizationPercent: 0,
        tokensUsed: 0,
        tokensLimit: 200000,
        breakdown: {
          specArtifacts: 0,
          memories: 0,
          hints: 0,
          observations: 0,
          systemFiles: 0,
          conversation: 0,
        },
        recommendations: [],
        timestamp: Date.now(),
        dataSource: 'none',
      } as ContextHealthStatus & Record<string, unknown>;

      statusBar.updateDisplay(status);

      expect(mockStatusBarItem.tooltip).toContain('No active Claude Code session');
    });
  });

  describe('estimated fallback display (T026)', () => {
    it('should show "Context: --" for estimated data (no real session)', () => {
      const status = {
        status: 'warning' as const,
        utilizationPercent: 65,
        tokensUsed: 78000,
        tokensLimit: 120000,
        breakdown: {
          specArtifacts: 50000,
          memories: 20000,
          hints: 5000,
          observations: 3000,
          systemFiles: 0,
          conversation: 0,
        },
        recommendations: ['Context at 65%. Consider reducing context soon.'],
        timestamp: Date.now(),
        dataSource: 'estimated',
      } as ContextHealthStatus & Record<string, unknown>;

      statusBar.updateDisplay(status);

      // Estimated data shows as no session (filesystem estimates aren't real context usage)
      expect(mockStatusBarItem.text).toContain('Context: --');
      expect(mockStatusBarItem.tooltip).toContain('No active Claude Code session');
    });
  });
});
