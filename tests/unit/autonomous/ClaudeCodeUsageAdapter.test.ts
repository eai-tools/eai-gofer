/**
 * Unit tests for ClaudeCodeUsageAdapter
 *
 * Tests auto-discovery of Claude Code sessions from ~/.claude/
 * and conversion to council-usage.jsonl format.
 *
 * Feature 025: AI Token Usage Tracking Panel (Auto-discovery)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeCodeUsageAdapter } from '../../../extension/src/autonomous/ClaudeCodeUsageAdapter';

// Mock pricing module
vi.mock('../../../extension/src/config/pricing', () => ({
  calculateCost: vi.fn((inputTokens: number, outputTokens: number, provider: string) => {
    // Anthropic pricing: $3/M input, $15/M output
    if (provider === 'anthropic') {
      return (inputTokens / 1000) * 0.003 + (outputTokens / 1000) * 0.015;
    }
    return 0;
  }),
}));

describe.skip('ClaudeCodeUsageAdapter', () => {
  let adapter: ClaudeCodeUsageAdapter;
  let tmpDir: string;
  let claudeDir: string;
  let workspaceDir: string;
  let councilLogPath: string;
  let contextLogPath: string;

  beforeEach(() => {
    // Create temporary directories
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-test-'));
    claudeDir = path.join(tmpDir, '.claude');
    workspaceDir = path.join(tmpDir, 'workspace');

    fs.mkdirSync(claudeDir, { recursive: true });
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, '.specify', 'logs'), { recursive: true });

    councilLogPath = path.join(workspaceDir, '.specify', 'logs', 'council-usage.jsonl');
    contextLogPath = path.join(workspaceDir, '.specify', 'logs', 'context-usage.jsonl');

    // Pass custom claudeDir to constructor for testing
    adapter = new ClaudeCodeUsageAdapter(workspaceDir, claudeDir);
  });

  afterEach(() => {
    // Clean up temp directories
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('isClaudeCodeInstalled()', () => {
    it('should return true when ~/.claude/history.jsonl exists', () => {
      fs.writeFileSync(path.join(claudeDir, 'history.jsonl'), '');
      expect(adapter.isClaudeCodeInstalled()).toBe(true);
    });

    it('should return false when ~/.claude does not exist', () => {
      fs.rmSync(claudeDir, { recursive: true, force: true });
      expect(adapter.isClaudeCodeInstalled()).toBe(false);
    });

    it('should return false when history.jsonl is missing', () => {
      // .claude exists but no history.jsonl
      expect(adapter.isClaudeCodeInstalled()).toBe(false);
    });
  });

  describe('getCurrentSession()', () => {
    it('should return null when history.jsonl does not exist', () => {
      const session = adapter.getCurrentSession();
      expect(session).toBeNull();
    });

    it('should read the last line of history.jsonl', () => {
      const historyContent = [
        '{"sessionId":"session-1","conversationId":"conv-1","timestamp":"2024-01-01T00:00:00Z"}',
        '{"sessionId":"session-2","conversationId":"conv-2","timestamp":"2024-01-02T00:00:00Z"}',
        '{"sessionId":"session-3","conversationId":"conv-3","timestamp":"2024-01-03T00:00:00Z"}',
      ].join('\n');

      fs.writeFileSync(path.join(claudeDir, 'history.jsonl'), historyContent);

      const session = adapter.getCurrentSession();
      expect(session).toMatchObject({
        sessionId: 'session-3',
        conversationId: 'conv-3',
      });
    });

    it('should handle malformed history file gracefully', () => {
      fs.writeFileSync(path.join(claudeDir, 'history.jsonl'), 'not valid json');
      const session = adapter.getCurrentSession();
      expect(session).toBeNull();
    });
  });

  describe('getUsageFromContextLog()', () => {
    it('should return empty array when context-usage.jsonl does not exist', async () => {
      const usage = await adapter.getUsageFromContextLog();
      expect(usage).toEqual([]);
    });

    it('should parse health_check entries from context-usage.jsonl', async () => {
      const contextEntries = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          sessionId: 'session-1',
          eventType: 'health_check',
          tokensUsed: 100000,
          utilizationPercent: 50,
        },
        {
          timestamp: '2024-01-15T11:00:00Z',
          sessionId: 'session-2',
          eventType: 'health_check',
          tokensUsed: 50000,
          utilizationPercent: 25,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      const usage = await adapter.getUsageFromContextLog();
      expect(usage).toHaveLength(2);
      expect(usage[0].sessionId).toBe('session-1');
      expect(usage[0].tokensUsed).toBe(100000);
      expect(usage[1].sessionId).toBe('session-2');
      expect(usage[1].tokensUsed).toBe(50000);
    });

    it('should filter by date range', async () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const yesterday = new Date('2024-01-14T12:00:00Z');
      const weekAgo = new Date('2024-01-08T12:00:00Z');

      const contextEntries = [
        {
          timestamp: weekAgo.toISOString(),
          sessionId: 'session-old',
          eventType: 'health_check',
          tokensUsed: 10000,
          utilizationPercent: 5,
        },
        {
          timestamp: yesterday.toISOString(),
          sessionId: 'session-yesterday',
          eventType: 'health_check',
          tokensUsed: 20000,
          utilizationPercent: 10,
        },
        {
          timestamp: now.toISOString(),
          sessionId: 'session-today',
          eventType: 'health_check',
          tokensUsed: 30000,
          utilizationPercent: 15,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      // Get usage from yesterday onwards
      const fromDate = new Date('2024-01-14T00:00:00Z');
      const usage = await adapter.getUsageFromContextLog(fromDate);

      expect(usage).toHaveLength(2);
      expect(usage.map((u) => u.sessionId)).toEqual(['session-yesterday', 'session-today']);
    });

    it('should skip non-health_check entries', async () => {
      const contextEntries = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          sessionId: 'session-1',
          eventType: 'health_check',
          tokensUsed: 100000,
          utilizationPercent: 50,
        },
        {
          timestamp: '2024-01-15T10:30:00Z',
          sessionId: 'session-1',
          eventType: 'warning',
          message: 'High token usage',
        },
        {
          timestamp: '2024-01-15T11:00:00Z',
          sessionId: 'session-2',
          eventType: 'health_check',
          tokensUsed: 50000,
          utilizationPercent: 25,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      const usage = await adapter.getUsageFromContextLog();
      expect(usage).toHaveLength(2); // Only the 2 health_check entries
    });

    it('should handle malformed lines gracefully', async () => {
      const content = [
        '{"timestamp":"2024-01-15T10:00:00Z","sessionId":"session-1","eventType":"health_check","tokensUsed":100000,"utilizationPercent":50}',
        'not valid json',
        '{"timestamp":"2024-01-15T11:00:00Z","sessionId":"session-2","eventType":"health_check","tokensUsed":50000,"utilizationPercent":25}',
      ].join('\n');

      fs.writeFileSync(contextLogPath, content);

      const usage = await adapter.getUsageFromContextLog();
      expect(usage).toHaveLength(2); // Malformed line skipped
    });
  });

  describe('syncToCouncilLog()', () => {
    it('should return 0 when no context entries exist', async () => {
      const count = await adapter.syncToCouncilLog();
      expect(count).toBe(0);
    });

    it('should convert context usage to council format', async () => {
      const contextEntries = [
        {
          timestamp: new Date().toISOString(),
          sessionId: 'session-1',
          eventType: 'health_check',
          tokensUsed: 100000,
          utilizationPercent: 50,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      const count = await adapter.syncToCouncilLog();
      expect(count).toBe(1);

      // Verify council log was created with correct format
      expect(fs.existsSync(councilLogPath)).toBe(true);

      const councilContent = fs.readFileSync(councilLogPath, 'utf-8');
      const entry = JSON.parse(councilContent.trim());

      expect(entry).toMatchObject({
        stage: 'auto-discovered',
        sessionId: 'session-1',
        councilMode: false,
        providerCount: 1,
      });

      // Verify 70/30 token split
      expect(entry.inputTokens).toBe(70000); // 70% of 100000
      expect(entry.outputTokens).toBe(30000); // 30% of 100000

      // Verify cost calculation
      const expectedCost = (70000 / 1000) * 0.003 + (30000 / 1000) * 0.015;
      expect(entry.estimatedCostUsd).toBeCloseTo(expectedCost, 2);

      // Verify providers object
      expect(entry.providers).toHaveProperty('anthropic');
      expect(entry.providers.anthropic.tokens).toBe(100000);
    });

    it('should group by session (use latest timestamp)', async () => {
      const now = Date.now();
      const contextEntries = [
        {
          timestamp: new Date(now - 3600000).toISOString(), // 1 hour ago
          sessionId: 'session-1',
          eventType: 'health_check',
          tokensUsed: 50000,
          utilizationPercent: 25,
        },
        {
          timestamp: new Date(now - 1800000).toISOString(), // 30 min ago
          sessionId: 'session-1',
          eventType: 'health_check',
          tokensUsed: 75000,
          utilizationPercent: 37.5,
        },
        {
          timestamp: new Date(now).toISOString(), // now
          sessionId: 'session-1',
          eventType: 'health_check',
          tokensUsed: 100000,
          utilizationPercent: 50,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      const count = await adapter.syncToCouncilLog();
      expect(count).toBe(1); // Only 1 session, should use latest entry

      const councilContent = fs.readFileSync(councilLogPath, 'utf-8');
      const entry = JSON.parse(councilContent.trim());

      // Should use the latest (100000 tokens)
      expect(entry.inputTokens).toBe(70000);
      expect(entry.outputTokens).toBe(30000);
    });

    it('should avoid duplicate sessions', async () => {
      // Pre-populate council log with existing session
      const existingEntry = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-sonnet-4.5',
        inputTokens: 70000,
        outputTokens: 30000,
        costUsd: 0.66,
        sessionId: 'session-existing',
        source: 'auto-discovered',
      };

      fs.writeFileSync(councilLogPath, JSON.stringify(existingEntry) + '\n');

      // Try to sync the same session again
      const contextEntries = [
        {
          timestamp: new Date().toISOString(),
          sessionId: 'session-existing',
          eventType: 'health_check',
          tokensUsed: 100000,
          utilizationPercent: 50,
        },
        {
          timestamp: new Date().toISOString(),
          sessionId: 'session-new',
          eventType: 'health_check',
          tokensUsed: 50000,
          utilizationPercent: 25,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      const count = await adapter.syncToCouncilLog();
      expect(count).toBe(1); // Only the new session should be added

      const councilContent = fs.readFileSync(councilLogPath, 'utf-8');
      const lines = councilContent.trim().split('\n');
      expect(lines).toHaveLength(2); // Original + 1 new

      const entries = lines.map((l) => JSON.parse(l));
      expect(entries.map((e) => e.sessionId)).toEqual(['session-existing', 'session-new']);
    });

    it('should handle multiple sessions from last 7 days', async () => {
      const now = Date.now();
      const contextEntries = [
        {
          timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          sessionId: 'session-1',
          eventType: 'health_check',
          tokensUsed: 100000,
          utilizationPercent: 50,
        },
        {
          timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          sessionId: 'session-2',
          eventType: 'health_check',
          tokensUsed: 50000,
          utilizationPercent: 25,
        },
        {
          timestamp: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
          sessionId: 'session-3',
          eventType: 'health_check',
          tokensUsed: 75000,
          utilizationPercent: 37.5,
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

      const count = await adapter.syncToCouncilLog();
      expect(count).toBe(3); // Only sessions from last 7 days

      const councilContent = fs.readFileSync(councilLogPath, 'utf-8');
      const lines = councilContent.trim().split('\n');
      expect(lines).toHaveLength(3);

      const sessionIds = lines.map((l) => JSON.parse(l).sessionId);
      expect(sessionIds).toContain('session-1');
      expect(sessionIds).toContain('session-2');
      expect(sessionIds).toContain('session-3');
      expect(sessionIds).not.toContain('session-old');
    });

    it('should create .specify/logs directory if it does not exist', async () => {
      // Remove logs directory
      const logsDir = path.join(workspaceDir, '.specify', 'logs');
      fs.rmSync(logsDir, { recursive: true, force: true });

      const contextEntries = [
        {
          timestamp: new Date().toISOString(),
          sessionId: 'session-1',
          eventType: 'health_check',
          tokensUsed: 100000,
          utilizationPercent: 50,
        },
      ];

      // Recreate context log in a new location for this test
      fs.mkdirSync(logsDir, { recursive: true });
      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      // Remove it again to test creation
      fs.rmSync(logsDir, { recursive: true, force: true });
      fs.mkdirSync(path.join(workspaceDir, '.specify'), { recursive: true });
      fs.mkdirSync(logsDir, { recursive: true });
      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      const count = await adapter.syncToCouncilLog();
      expect(count).toBe(1);
      expect(fs.existsSync(councilLogPath)).toBe(true);
    });
  });

  describe('Integration: Full auto-discovery flow', () => {
    it('should discover sessions and sync to council log', async () => {
      // Setup: Create Claude Code history and context usage
      const historyContent = [
        '{"sessionId":"session-1","conversationId":"conv-1","timestamp":"2024-01-15T10:00:00Z"}',
      ].join('\n');

      fs.writeFileSync(path.join(claudeDir, 'history.jsonl'), historyContent);

      const contextEntries = [
        {
          timestamp: new Date().toISOString(),
          sessionId: 'session-1',
          eventType: 'health_check',
          tokensUsed: 150000,
          utilizationPercent: 75,
        },
      ];

      fs.writeFileSync(
        contextLogPath,
        contextEntries.map((e) => JSON.stringify(e)).join('\n')
      );

      // Execute: Run full discovery
      const isInstalled = adapter.isClaudeCodeInstalled();
      expect(isInstalled).toBe(true);

      const currentSession = adapter.getCurrentSession();
      expect(currentSession?.sessionId).toBe('session-1');

      const count = await adapter.syncToCouncilLog();
      expect(count).toBe(1);

      // Verify: Council log has correct data
      const councilContent = fs.readFileSync(councilLogPath, 'utf-8');
      const entry = JSON.parse(councilContent.trim());

      expect(entry).toMatchObject({
        stage: 'auto-discovered',
        sessionId: 'session-1',
        councilMode: false,
        providerCount: 1,
        inputTokens: 105000, // 70% of 150000
        outputTokens: 45000, // 30% of 150000
      });

      // Verify providers object
      expect(entry.providers).toHaveProperty('anthropic');
      expect(entry.providers.anthropic.tokens).toBe(150000);
    });
  });
});
