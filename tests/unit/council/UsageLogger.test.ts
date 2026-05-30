/**
 * Usage Logger Unit Tests
 *
 * Tests for the usage logging and cost tracking functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  UsageLogger,
  UsageLogEntry,
  getUsageLogger,
  resetUsageLogger,
} from '../../../extension/src/council/UsageLogger';
import { UsageMetrics, DEFAULT_COUNCIL_CONFIG } from '../../../extension/src/council/types';

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      access: vi.fn(),
      mkdir: vi.fn(),
      appendFile: vi.fn(),
      readFile: vi.fn(),
    },
  };
});

describe('UsageLogger', () => {
  const mockWorkspacePath = '/test/workspace';
  let logger: UsageLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    resetUsageLogger();
    logger = new UsageLogger(mockWorkspacePath);
  });

  afterEach(() => {
    resetUsageLogger();
  });

  describe('getLogPath', () => {
    it('should return correct log path', () => {
      const logPath = logger.getLogPath();

      expect(logPath).toBe(path.join(mockWorkspacePath, '.specify', 'logs', 'council-usage.jsonl'));
    });
  });

  describe('appendUsageLog', () => {
    it('should create directory if not exists', async () => {
      vi.mocked(fs.promises.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.appendFile).mockResolvedValue(undefined);

      const entry: UsageLogEntry = {
        timestamp: '2024-01-01T00:00:00.000Z',
        sessionId: 'session-1',
        stage: 'test-stage',
        councilMode: true,
        inputTokens: 100,
        outputTokens: 50,
        estimatedCostUsd: 0.01,
        durationMs: 1000,
        providerCount: 2,
        providers: {},
      };

      await logger.appendUsageLog(entry);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.dirname(logger.getLogPath()), {
        recursive: true,
      });
    });

    it('should append entry as JSONL', async () => {
      vi.mocked(fs.promises.access).mockResolvedValue(undefined);
      vi.mocked(fs.promises.appendFile).mockResolvedValue(undefined);

      const entry: UsageLogEntry = {
        timestamp: '2024-01-01T00:00:00.000Z',
        sessionId: 'session-1',
        stage: 'test-stage',
        councilMode: true,
        inputTokens: 100,
        outputTokens: 50,
        estimatedCostUsd: 0.01,
        durationMs: 1000,
        providerCount: 2,
        providers: { anthropic: { tokens: 150, costUsd: 0.01 } },
      };

      await logger.appendUsageLog(entry);

      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        logger.getLogPath(),
        JSON.stringify(entry) + '\n',
        'utf-8'
      );
    });
  });

  describe('createLogEntry', () => {
    it('should create log entry from usage metrics', () => {
      const usage: UsageMetrics = {
        totalTokensInput: 100,
        totalTokensOutput: 50,
        totalCacheReadTokens: 20,
        totalCacheWriteTokens: 10,
        estimatedCostUsd: 0.01,
        durationMs: 1000,
        providerBreakdown: {
          anthropic: {
            tokens: 180,
            inputTokens: 100,
            outputTokens: 50,
            cacheReadTokens: 20,
            cacheWriteTokens: 10,
            costUsd: 0.01,
            model: 'claude-haiku-4-5',
          },
        },
      };

      const entry = logger.createLogEntry('session-1', 'test-stage', true, usage);

      expect(entry.sessionId).toBe('session-1');
      expect(entry.stage).toBe('test-stage');
      expect(entry.councilMode).toBe(true);
      expect(entry.inputTokens).toBe(100);
      expect(entry.outputTokens).toBe(50);
      expect(entry.cacheReadTokens).toBe(20);
      expect(entry.cacheWriteTokens).toBe(10);
      expect(entry.estimatedCostUsd).toBe(0.01);
      expect(entry.durationMs).toBe(1000);
      expect(entry.providerCount).toBe(1);
      expect(entry.providers.anthropic.model).toBe('claude-haiku-4-5');
    });
  });

  describe('estimateUsage', () => {
    it('should estimate cost for enabled providers', () => {
      const config = {
        ...DEFAULT_COUNCIL_CONFIG,
        providers: [
          { providerId: 'anthropic' as const, enabled: true, model: 'claude-haiku-4-5' },
          { providerId: 'google' as const, enabled: true, model: 'gemini-3.1-flash-lite' },
          { providerId: 'openai' as const, enabled: false },
        ],
      };

      const estimate = logger.estimateUsage(config, 1000, 500);

      expect(estimate.providerCount).toBe(2);
      expect(estimate.estimatedCostUsd).toBeGreaterThan(0);
      expect(estimate.breakdown).toHaveProperty('anthropic');
      expect(estimate.breakdown).toHaveProperty('google');
      expect(estimate.breakdown).not.toHaveProperty('openai');
      expect(estimate.models.anthropic).toBe('claude-haiku-4-5');
      expect(estimate.models.google).toBe('gemini-3.1-flash-lite');
    });

    it('should use configured model pricing instead of provider-level pricing', () => {
      const config = {
        ...DEFAULT_COUNCIL_CONFIG,
        providers: [
          { providerId: 'anthropic' as const, enabled: true, model: 'claude-opus-4-6' },
        ],
      };

      const estimate = logger.estimateUsage(config, 100000, 50000);

      expect(estimate.breakdown.anthropic).toBe(1.75);
    });

    it('should double cost when peer review is enabled', () => {
      const configWithoutPeerReview = {
        ...DEFAULT_COUNCIL_CONFIG,
        peerReview: false,
        providers: [
          { providerId: 'anthropic' as const, enabled: true, model: 'claude-haiku-4-5' },
          { providerId: 'google' as const, enabled: true, model: 'gemini-3.1-flash-lite' },
          { providerId: 'openai' as const, enabled: true, model: 'gpt-5.4-mini' },
        ],
      };

      const configWithPeerReview = {
        ...configWithoutPeerReview,
        peerReview: true,
      };

      const estimateWithout = logger.estimateUsage(configWithoutPeerReview, 1000, 500);
      const estimateWith = logger.estimateUsage(configWithPeerReview, 1000, 500);

      expect(estimateWith.estimatedCostUsd).toBeCloseTo(estimateWithout.estimatedCostUsd * 2);
    });
  });

  describe('formatEstimate', () => {
    it('should format estimate for display', () => {
      const formatted = logger.formatEstimate({
        estimatedCostUsd: 0.0123,
        providerCount: 3,
      });

      expect(formatted).toContain('$0.0123');
      expect(formatted).toContain('3 providers');
    });
  });

  describe('getUsageSummary', () => {
    it('should return empty summary when log file does not exist', async () => {
      vi.mocked(fs.promises.access).mockRejectedValue(new Error('ENOENT'));

      const summary = await logger.getUsageSummary();

      expect(summary.totalSessions).toBe(0);
      expect(summary.totalCostUsd).toBe(0);
    });

    it('should aggregate usage from log file', async () => {
      vi.mocked(fs.promises.access).mockResolvedValue(undefined);

      const logContent = [
        JSON.stringify({
          timestamp: '2024-01-01T00:00:00.000Z',
          sessionId: 'session-1',
          stage: 'test-stage',
          councilMode: true,
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 10,
          cacheWriteTokens: 5,
          estimatedCostUsd: 0.01,
          durationMs: 1000,
          providerCount: 2,
          providers: { anthropic: { tokens: 150, costUsd: 0.01 } },
        }),
        JSON.stringify({
          timestamp: '2024-01-02T00:00:00.000Z',
          sessionId: 'session-2',
          stage: 'test-stage',
          councilMode: false,
          inputTokens: 200,
          outputTokens: 100,
          estimatedCostUsd: 0.02,
          durationMs: 2000,
          providerCount: 1,
          providers: { anthropic: { tokens: 300, costUsd: 0.02 } },
        }),
      ].join('\n');

      vi.mocked(fs.promises.readFile).mockResolvedValue(logContent);

      const summary = await logger.getUsageSummary();

      expect(summary.totalSessions).toBe(2);
      expect(summary.councilSessions).toBe(1);
      expect(summary.singleSessions).toBe(1);
      expect(summary.totalInputTokens).toBe(300);
      expect(summary.totalOutputTokens).toBe(150);
      expect(summary.totalCacheReadTokens).toBe(10);
      expect(summary.totalCacheWriteTokens).toBe(5);
      expect(summary.totalCostUsd).toBeCloseTo(0.03);
    });

    it('should filter by date range', async () => {
      vi.mocked(fs.promises.access).mockResolvedValue(undefined);

      const logContent = [
        JSON.stringify({
          timestamp: '2024-01-01T00:00:00.000Z',
          sessionId: 'session-1',
          stage: 'test-stage',
          councilMode: true,
          inputTokens: 100,
          outputTokens: 50,
          estimatedCostUsd: 0.01,
          durationMs: 1000,
          providerCount: 1,
          providers: {},
        }),
        JSON.stringify({
          timestamp: '2024-01-15T00:00:00.000Z',
          sessionId: 'session-2',
          stage: 'test-stage',
          councilMode: true,
          inputTokens: 200,
          outputTokens: 100,
          estimatedCostUsd: 0.02,
          durationMs: 2000,
          providerCount: 1,
          providers: {},
        }),
      ].join('\n');

      vi.mocked(fs.promises.readFile).mockResolvedValue(logContent);

      const summary = await logger.getUsageSummary(new Date('2024-01-10'), new Date('2024-01-20'));

      expect(summary.totalSessions).toBe(1);
      expect(summary.totalInputTokens).toBe(200);
    });
  });

  describe('formatSummary', () => {
    it('should format summary for display', () => {
      const summary = {
        totalSessions: 10,
        councilSessions: 7,
        singleSessions: 3,
        totalInputTokens: 10000,
        totalOutputTokens: 5000,
        totalCostUsd: 0.15,
        avgDurationMs: 1500,
        byProvider: {
          anthropic: { tokens: 10000, costUsd: 0.1, sessions: 8 },
          google: { tokens: 5000, costUsd: 0.05, sessions: 5 },
        },
        byStage: {
          gofer_plan: { tokens: 8000, costUsd: 0.08, sessions: 4 },
          gofer_analyze: { tokens: 7000, costUsd: 0.07, sessions: 6 },
        },
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-01-31T00:00:00.000Z',
      };

      const formatted = logger.formatSummary(summary);

      expect(formatted).toContain('Sessions: 10');
      expect(formatted).toContain('Council mode: 7');
      expect(formatted).toContain('Single provider: 3');
      expect(formatted).toContain('$0.1500');
      expect(formatted).toContain('anthropic');
      expect(formatted).toContain('gofer_plan');
    });
  });

  describe('singleton', () => {
    it('should return same instance for same workspace', () => {
      const logger1 = getUsageLogger('/test/path');
      const logger2 = getUsageLogger('/test/path');

      expect(logger1).toBe(logger2);
    });

    it('should create new instance for different workspace', () => {
      const logger1 = getUsageLogger('/test/path1');
      resetUsageLogger();
      const logger2 = getUsageLogger('/test/path2');

      expect(logger1).not.toBe(logger2);
    });
  });
});
