/**
 * End-to-end verification that AI Usage panel displays data correctly
 * Run with: npm test -- tests/manual/verify-panel-display.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ClaudeCodeUsageAdapter } from '../../extension/src/autonomous/ClaudeCodeUsageAdapter';
import { UsageLogger } from '../../extension/src/council/UsageLogger';
import { AIUsageMonitor } from '../../extension/src/autonomous/AIUsageMonitor';
import { AIUsageProvider } from '../../extension/src/ui/AIUsageProvider';

// Mock vscode
vi.mock('vscode', () => ({
  workspace: {
    createFileSystemWatcher: vi.fn(() => ({
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    })),
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, defaultValue: unknown) => {
        if (key === 'aiUsage.polling.interval') return 5000;
        if (key === 'aiUsage.api.pollingInterval') return 60000;
        if (key === 'aiUsage.useApiClient') return false; // Use UsageLogger
        return defaultValue;
      }),
    })),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  },
  RelativePattern: class {
    constructor(
      public base: string,
      public pattern: string
    ) {}
  },
  TreeItem: class TreeItem {
    label: string;
    collapsibleState: number;
    description?: string;

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
  EventEmitter: class EventEmitter {
    private handlers: Array<(...args: unknown[]) => void> = [];
    event = (handler: (...args: unknown[]) => void) => {
      this.handlers.push(handler);
      return { dispose: () => {} };
    };
    fire(data?: unknown) {
      for (const h of this.handlers) h(data);
    }
    dispose() {}
  },
  ThemeIcon: class ThemeIcon {
    constructor(
      public id: string,
      public color?: unknown
    ) {}
  },
  ThemeColor: class ThemeColor {
    constructor(public id: string) {}
  },
}));

// Mock Logger
vi.mock('../../extension/src/utils/logger', () => ({
  Logger: {
    for: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe('AI Usage Panel Display Verification', () => {
  const workspacePath = '/Users/douglaswross/Code/gofer';
  const councilLogPath = path.join(workspacePath, '.specify/logs/council-usage.jsonl');

  it('should display real data in the panel TreeView', async () => {
    console.log('\n🔍 Testing AI Usage Panel Data Display\n');

    // Verify council-usage.jsonl exists and has data
    expect(fs.existsSync(councilLogPath)).toBe(true);
    const content = fs.readFileSync(councilLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    console.log(`📄 Council log: ${lines.length} entries`);
    expect(lines.length).toBeGreaterThan(0);

    // Step 1: Create UsageLogger and verify it reads the data
    const usageLogger = new UsageLogger(workspacePath);
    const summary = await usageLogger.getUsageSummary();

    console.log(`\n💰 UsageLogger Summary:`);
    console.log(`   Total cost: $${summary.totalCostUsd.toFixed(2)}`);
    console.log(`   Total tokens: ${(summary.totalInputTokens + summary.totalOutputTokens).toLocaleString()}`);
    console.log(`   Providers: ${Object.keys(summary.byProvider).join(', ')}`);

    expect(summary.totalCostUsd).toBeGreaterThan(0);
    expect(summary.byProvider).toHaveProperty('anthropic');

    // Step 2: Create AIUsageMonitor with UsageLogger
    const monitor = new AIUsageMonitor(workspacePath, usageLogger);
    monitor.startMonitoring();

    // Force initial data load
    await monitor.forceRefresh();

    // Get data for all periods
    const currentData = await monitor.getUsageData('current');
    const todayData = await monitor.getUsageData('today');
    const weekData = await monitor.getUsageData('week');

    console.log(`\n📊 AIUsageMonitor Data:`);
    console.log(`   Current Session: $${currentData.totalCostUsd.toFixed(2)} (${currentData.providers.length} providers)`);
    console.log(`   Today: $${todayData.totalCostUsd.toFixed(2)}`);
    console.log(`   This Week: $${weekData.totalCostUsd.toFixed(2)}`);

    // Verify at least one period has data
    const hasData = currentData.totalCostUsd > 0 || todayData.totalCostUsd > 0 || weekData.totalCostUsd > 0;
    expect(hasData).toBe(true);

    // Step 3: Create AIUsageProvider and wire to monitor
    const provider = new AIUsageProvider();
    provider.setMonitor(monitor);

    // Trigger data refresh
    await monitor.forceRefresh();

    // Give the event loop time to process
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 4: Get TreeView items (what the panel displays)
    const rootItems = await provider.getChildren();

    console.log(`\n🌲 TreeView Items:`);
    for (const item of rootItems) {
      console.log(`   ${item.label}: ${item.description || 'no description'}`);
    }

    expect(rootItems).toHaveLength(3); // Current Session, Today, This Week

    // Verify descriptions contain cost data
    const descriptions = rootItems.map(item => item.description || '').join(' ');
    console.log(`\n✅ Panel Descriptions: ${descriptions}`);

    // At least one period should show non-zero cost
    const hasNonZeroCost = rootItems.some(item => {
      const desc = item.description || '';
      return desc.includes('$') && !desc.includes('$0.00');
    });

    if (!hasNonZeroCost) {
      console.error('\n❌ PANEL SHOWING ALL ZEROS!');
      console.error('Debug info:');
      console.error('  Summary total:', summary.totalCostUsd);
      console.error('  Monitor current:', currentData.totalCostUsd);
      console.error('  Monitor week:', weekData.totalCostUsd);
      console.error('  Panel items:', rootItems.map(i => ({ label: i.label, desc: i.description })));
    }

    expect(hasNonZeroCost).toBe(true);

    // Clean up
    monitor.dispose();
    provider.dispose();

    console.log('\n✅ Panel display verification PASSED!\n');
  }, 30000);
});
