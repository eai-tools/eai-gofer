import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';

const getAllProjectsUsage = vi.fn();
const getCurrentUser = vi.fn();

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

vi.mock('../../../extension/src/autonomous/ClaudeCodeUsageAdapter', () => ({
  getClaudeCodeAdapter: () => ({
    getAllProjectsUsage,
    getCurrentUser,
  }),
}));

vi.mock('vscode', () => ({
  TreeItem: class TreeItem {
    label: string;
    collapsibleState: number;
    description?: string;
    tooltip?: string;
    iconPath?: unknown;
    contextValue?: string;
    command?: unknown;

    constructor(label: string, collapsibleState: number = 0) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  ThemeIcon: class ThemeIcon {
    constructor(
      public readonly id: string,
      public readonly color?: unknown
    ) {}
  },
  ThemeColor: class ThemeColor {
    constructor(public readonly id: string) {}
  },
  EventEmitter: class EventEmitter<T> {
    private handlers: Array<(value?: T) => void> = [];
    public readonly event = (handler: (value?: T) => void) => {
      this.handlers.push(handler);
      return { dispose: () => {} };
    };

    public fire(value?: T): void {
      for (const handler of this.handlers) {
        handler(value);
      }
    }

    public dispose(): void {}
  },
}));

import { AIUsageProvider } from '../../../extension/src/ui/AIUsageProvider';
import type { UsageUpdateEvent } from '../../../extension/src/types/aiUsage';

function createMonitor(workspacePath: string = '/workspace'): EventEmitter & {
  forceRefresh: ReturnType<typeof vi.fn>;
  getWorkspacePath: () => string;
  setPanelVisible: (visible: boolean) => void;
} {
  return Object.assign(new EventEmitter(), {
    forceRefresh: vi.fn().mockResolvedValue(undefined),
    getWorkspacePath: () => workspacePath,
    setPanelVisible: () => undefined,
  });
}

function createUsageEvent(): UsageUpdateEvent {
  return {
    periods: [
      {
        period: 'current',
        totalCostUsd: 1,
        totalTokens: 100,
        providers: [],
      },
      {
        period: 'today',
        totalCostUsd: 1,
        totalTokens: 100,
        providers: [],
      },
      {
        period: 'week',
        totalCostUsd: 1,
        totalTokens: 100,
        providers: [],
      },
    ],
    trigger: 'manual',
    timestamp: Date.now(),
  };
}

describe('AIUsageProvider cache refresh', () => {
  beforeEach(() => {
    getAllProjectsUsage.mockReset();
    getCurrentUser.mockReset();
    getCurrentUser.mockResolvedValue('user@example.com');
  });

  it('refreshes all-project data after a usage update event', async () => {
    const provider = new AIUsageProvider();
    const monitor = createMonitor();
    provider.setMonitor(
      monitor as unknown as import('../../../extension/src/autonomous/AIUsageMonitor').AIUsageMonitor
    );

    getAllProjectsUsage
      .mockResolvedValueOnce([
        { projectName: 'alpha', provider: 'claude-code', totalTokens: 10, costUsd: 1.25 },
      ])
      .mockResolvedValueOnce([
        { projectName: 'alpha', provider: 'claude-code', totalTokens: 20, costUsd: 2.5 },
      ]);

    monitor.emit('usage-update', createUsageEvent());
    const firstRootItems = await provider.getChildren();
    const firstAllProjects = firstRootItems.find((item) => item.contextType === 'all-projects');
    expect(firstAllProjects?.description).toBe('$1.25 (10 tokens)');

    monitor.emit('usage-update', createUsageEvent());
    const secondRootItems = await provider.getChildren();
    const secondAllProjects = secondRootItems.find((item) => item.contextType === 'all-projects');
    expect(secondAllProjects?.description).toBe('$2.50 (20 tokens)');
    expect(getAllProjectsUsage).toHaveBeenCalledTimes(2);
  });
});
