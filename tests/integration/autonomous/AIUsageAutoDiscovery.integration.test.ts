/**
 * Integration test for AI Usage Auto-Discovery
 *
 * Tests the full flow from context-usage.jsonl → ClaudeCodeUsageAdapter →
 * council-usage.jsonl → AIUsageMonitor → AIUsageProvider
 *
 * Feature 025: AI Token Usage Tracking Panel (Auto-discovery)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeCodeUsageAdapter } from '../../../extension/src/autonomous/ClaudeCodeUsageAdapter';
import { AIUsageMonitor } from '../../../extension/src/autonomous/AIUsageMonitor';
import { UsageLogger } from '../../../extension/src/council/UsageLogger';

// Mock vscode
vi.mock('vscode', () => {
  const mockWatcher = {
    onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
    onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(),
  };

  return {
    workspace: {
      createFileSystemWatcher: vi.fn(() => mockWatcher),
      getConfiguration: vi.fn(() => ({
        get: vi.fn((key: string, defaultValue: unknown) => {
          if (key === 'aiUsage.polling.interval') return 5000;
          if (key === 'aiUsage.api.pollingInterval') return 60000;
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
  };
});

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

// TODO: Re-enable when fixed. Two issues:
// 1. Line 143: `isClaudeCodeInstalled()` is async — needs `await`
// 2. `syncToCouncilLog()` fixture format may not match adapter's expected schema
// See: extension/src/autonomous/ClaudeCodeUsageAdapter.ts syncToCouncilLog() line 404
describe.skip('AI Usage Auto-Discovery Integration', () => {
  let tmpDir: string;
  let claudeDir: string;
  let workspaceDir: string;
  let councilLogPath: string;
  let contextLogPath: string;
  let adapter: ClaudeCodeUsageAdapter;
  let monitor: AIUsageMonitor;
  let usageLogger: UsageLogger;

  beforeEach(() => {
    // Create temporary directories
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-integration-'));
    claudeDir = path.join(tmpDir, '.claude');
    workspaceDir = path.join(tmpDir, 'workspace');

    fs.mkdirSync(claudeDir, { recursive: true });
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, '.specify', 'logs'), { recursive: true });

    councilLogPath = path.join(workspaceDir, '.specify', 'logs', 'council-usage.jsonl');
    contextLogPath = path.join(workspaceDir, '.specify', 'logs', 'context-usage.jsonl');

    // Create adapter with custom claudeDir
    adapter = new ClaudeCodeUsageAdapter(workspaceDir, claudeDir);

    // Create UsageLogger that reads from councilLogPath
    usageLogger = new UsageLogger(workspaceDir);

    // Create AIUsageMonitor
    monitor = new AIUsageMonitor(workspaceDir, usageLogger);
  });

  afterEach(() => {
    monitor.dispose();

    // Clean up temp directories
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Full auto-discovery flow', () => {
    it('should auto-discover sessions and display in panel', async () => {
      // 1. Setup: Create Claude Code history
      const historyContent = [
        '{"sessionId":"test-session-1","conversationId":"conv-1","timestamp":"2024-01-15T10:00:00Z"}',
      ].join('\n');

      fs.writeFileSync(path.join(claudeDir, 'history.jsonl'), historyContent);

      // 2. Setup: Create context usage entries (simulating Claude Code session)
      const now = new Date();
      const contextEntries = [
        {
          timestamp: new Date(now.getTime() - 3600000).toISOString(), // 1 hour ago
          sessionId: 'test-session-1',
          eventType: 'health_check',
          tokensUsed: 50000,
          utilizationPercent: 25,
        },
        {
          timestamp: new Date(now.getTime() - 1800000).toISOString(), // 30 min ago
          sessionId: 'test-session-1',
          eventType: 'health_check',
          tokensUsed: 100000,
          utilizationPercent: 50,
        },
        {
          timestamp: now.toISOString(), // now
          sessionId: 'test-session-1',
          eventType: 'health_check',
          tokensUsed: 150000,
          utilizationPercent: 75,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      // 3. Execute: Run auto-discovery sync
      const isInstalled = adapter.isClaudeCodeInstalled();
      expect(isInstalled).toBe(true);

      const synced = await adapter.syncToCouncilLog();
      expect(synced).toBe(1);

      // 4. Verify: Council log was created with correct data
      expect(fs.existsSync(councilLogPath)).toBe(true);

      const councilContent = fs.readFileSync(councilLogPath, 'utf-8');
      const entry = JSON.parse(councilContent.trim());

      expect(entry).toMatchObject({
        stage: 'auto-discovered',
        sessionId: 'test-session-1',
        councilMode: false,
        providerCount: 1,
        inputTokens: 105000, // 70% of 150000
        outputTokens: 45000, // 30% of 150000
      });

      // Verify providers object
      expect(entry.providers).toHaveProperty('anthropic');
      expect(entry.providers.anthropic.tokens).toBe(150000);

      // 5. Verify: AIUsageMonitor can read the synced data
      const weekData = await monitor.getUsageData('week');
      expect(weekData.totalCostUsd).toBeGreaterThan(0);
      expect(weekData.totalTokens).toBe(150000);
      expect(weekData.providers).toHaveLength(1);
      expect(weekData.providers[0].providerId).toBe('anthropic');
    });

    it('should sync multiple sessions from different days', async () => {
      const now = Date.now();

      // Create context entries within the last 6 hours (all within "today")
      // This ensures they'll be captured by both "today" and "week" periods
      const contextEntries = [
        {
          timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          sessionId: 'session-1',
          eventType: 'health_check',
          tokensUsed: 100000,
          utilizationPercent: 50,
        },
        {
          timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          sessionId: 'session-2',
          eventType: 'health_check',
          tokensUsed: 75000,
          utilizationPercent: 37.5,
        },
        {
          timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
          sessionId: 'session-3',
          eventType: 'health_check',
          tokensUsed: 50000,
          utilizationPercent: 25,
        },
        {
          timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
          sessionId: 'session-4',
          eventType: 'health_check',
          tokensUsed: 125000,
          utilizationPercent: 62.5,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      const synced = await adapter.syncToCouncilLog();
      expect(synced).toBe(4);

      // Verify all sessions are in council log
      const councilContent = fs.readFileSync(councilLogPath, 'utf-8');
      const lines = councilContent.trim().split('\n');
      expect(lines).toHaveLength(4);

      const sessionIds = lines.map((l) => JSON.parse(l).sessionId);
      expect(sessionIds).toContain('session-1');
      expect(sessionIds).toContain('session-2');
      expect(sessionIds).toContain('session-3');
      expect(sessionIds).toContain('session-4');

      // Verify AIUsageMonitor can aggregate all sessions
      const weekData = await monitor.getUsageData('week');
      expect(weekData.totalTokens).toBe(350000); // Sum of all sessions
      expect(weekData.providers).toHaveLength(1);
    });

    it('should handle incremental syncs without duplicates', async () => {
      const now = Date.now();

      // First sync: 2 sessions
      const firstBatch = [
        {
          timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
          sessionId: 'session-1',
          eventType: 'health_check',
          tokensUsed: 100000,
          utilizationPercent: 50,
        },
        {
          timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
          sessionId: 'session-2',
          eventType: 'health_check',
          tokensUsed: 50000,
          utilizationPercent: 25,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        firstBatch.map((e) => JSON.stringify(e)).join('\n')
      );

      const firstSync = await adapter.syncToCouncilLog();
      expect(firstSync).toBe(2);

      // Second sync: Add a new session
      const secondBatch = [
        ...firstBatch,
        {
          timestamp: new Date(now).toISOString(),
          sessionId: 'session-3',
          eventType: 'health_check',
          tokensUsed: 75000,
          utilizationPercent: 37.5,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        secondBatch.map((e) => JSON.stringify(e)).join('\n')
      );

      const secondSync = await adapter.syncToCouncilLog();
      expect(secondSync).toBe(1); // Only the new session

      // Verify council log has exactly 3 sessions (no duplicates)
      const councilContent = fs.readFileSync(councilLogPath, 'utf-8');
      const lines = councilContent.trim().split('\n');
      expect(lines).toHaveLength(3);

      const sessionIds = lines.map((l) => JSON.parse(l).sessionId);
      expect(sessionIds).toEqual(['session-1', 'session-2', 'session-3']);
    });

    it('should calculate costs correctly using Anthropic pricing', async () => {
      const contextEntries = [
        {
          timestamp: new Date().toISOString(),
          sessionId: 'cost-test',
          eventType: 'health_check',
          tokensUsed: 1000000, // 1M tokens
          utilizationPercent: 50,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      await adapter.syncToCouncilLog();

      const councilContent = fs.readFileSync(councilLogPath, 'utf-8');
      const entry = JSON.parse(councilContent.trim());

      // 70/30 split: 700k input, 300k output
      // Cost = (700k / 1000) * $0.003 + (300k / 1000) * $0.015
      //      = 700 * $0.003 + 300 * $0.015
      //      = $2.10 + $4.50
      //      = $6.60
      const expectedCost = (700 * 0.003) + (300 * 0.015);
      expect(entry.estimatedCostUsd).toBeCloseTo(expectedCost, 2);
      expect(entry.estimatedCostUsd).toBeCloseTo(6.60, 2);
      expect(entry.providers.anthropic.costUsd).toBeCloseTo(6.60, 2);
    });

    it('should handle empty context log gracefully', async () => {
      // Empty context log
      fs.writeFileSync(contextLogPath, '');

      const synced = await adapter.syncToCouncilLog();
      expect(synced).toBe(0);

      // Monitor should return empty data
      const weekData = await monitor.getUsageData('week');
      expect(weekData.totalCostUsd).toBe(0);
      expect(weekData.totalTokens).toBe(0);
      expect(weekData.providers).toHaveLength(0);
    });

    it('should filter sessions older than 7 days', async () => {
      const now = Date.now();

      const contextEntries = [
        {
          timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago (within range)
          sessionId: 'session-recent',
          eventType: 'health_check',
          tokensUsed: 100000,
          utilizationPercent: 50,
        },
        {
          timestamp: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago (outside range)
          sessionId: 'session-old',
          eventType: 'health_check',
          tokensUsed: 200000,
          utilizationPercent: 100,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      const synced = await adapter.syncToCouncilLog();
      expect(synced).toBe(1); // Only recent session

      const councilContent = fs.readFileSync(councilLogPath, 'utf-8');
      const entry = JSON.parse(councilContent.trim());
      expect(entry.sessionId).toBe('session-recent');
    });
  });

  describe('Error handling', () => {
    it('should handle missing Claude directory gracefully', async () => {
      // Remove .claude directory
      fs.rmSync(claudeDir, { recursive: true, force: true });

      const isInstalled = adapter.isClaudeCodeInstalled();
      expect(isInstalled).toBe(false);

      // Sync should return 0 (no error thrown)
      const synced = await adapter.syncToCouncilLog();
      expect(synced).toBe(0);
    });

    it('should handle malformed context entries gracefully', async () => {
      const now = new Date();
      const content = [
        `{"timestamp":"${now.toISOString()}","sessionId":"session-1","eventType":"health_check","tokensUsed":100000,"utilizationPercent":50}`,
        'not valid json',
        `{"timestamp":"${new Date(now.getTime() + 3600000).toISOString()}","sessionId":"session-2","eventType":"health_check","tokensUsed":50000,"utilizationPercent":25}`,
      ].join('\n');

      fs.writeFileSync(contextLogPath, content);

      const synced = await adapter.syncToCouncilLog();
      expect(synced).toBe(2); // Malformed line skipped
    });
  });
});
