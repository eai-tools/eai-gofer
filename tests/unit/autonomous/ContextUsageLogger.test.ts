/**
 * Unit tests for ContextUsageLogger
 *
 * Tests JSONL format correctness, file creation, append behavior,
 * and all log methods.
 *
 * @see .specify/specs/011-context-health-recursive-memory/tasks.md T024
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ContextUsageLogger,
  type ContextUsageLogEntry,
} from '../../../extension/src/autonomous/ContextUsageLogger';

// Mock the Logger
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

describe('ContextUsageLogger', () => {
  let tempDir: string;
  let logger: ContextUsageLogger;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'context-usage-logger-test-'));
    logger = new ContextUsageLogger(tempDir);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Basic Logging Tests (T022)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('basic logging', () => {
    it('should create log directory if it does not exist', async () => {
      const entry: ContextUsageLogEntry = {
        timestamp: new Date().toISOString(),
        sessionId: 'test-session',
        stage: 'implement',
        status: 'healthy',
        tokensUsed: 50000,
        tokensLimit: 120000,
        utilizationPercent: 41.67,
        eventType: 'health_check',
      };

      await logger.log(entry);

      const logDir = path.dirname(logger.getLogPath());
      const exists = await fs.promises
        .access(logDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create log file on first write', async () => {
      const entry: ContextUsageLogEntry = {
        timestamp: new Date().toISOString(),
        sessionId: 'test-session',
        stage: 'research',
        status: 'healthy',
        tokensUsed: 30000,
        tokensLimit: 120000,
        utilizationPercent: 25,
        eventType: 'session_start',
      };

      await logger.log(entry);

      const exists = await fs.promises
        .access(logger.getLogPath())
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should append entries in JSONL format', async () => {
      const entry1: ContextUsageLogEntry = {
        timestamp: '2026-01-25T10:00:00.000Z',
        sessionId: 'session-1',
        stage: 'research',
        status: 'healthy',
        tokensUsed: 30000,
        tokensLimit: 120000,
        utilizationPercent: 25,
        eventType: 'health_check',
      };

      const entry2: ContextUsageLogEntry = {
        timestamp: '2026-01-25T10:05:00.000Z',
        sessionId: 'session-1',
        stage: 'research',
        status: 'warning',
        tokensUsed: 65000,
        tokensLimit: 120000,
        utilizationPercent: 54.17,
        eventType: 'health_check',
      };

      await logger.log(entry1);
      await logger.log(entry2);

      const content = await fs.promises.readFile(logger.getLogPath(), 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);

      const parsed1 = JSON.parse(lines[0]);
      const parsed2 = JSON.parse(lines[1]);

      expect(parsed1.sessionId).toBe('session-1');
      expect(parsed1.status).toBe('healthy');
      expect(parsed2.status).toBe('warning');
    });

    it('should not log when disabled', async () => {
      const disabledLogger = new ContextUsageLogger(tempDir, { enabled: false });

      await disabledLogger.logHealthCheck({
        sessionId: 'test',
        stage: 'research',
        status: 'healthy',
        tokensUsed: 10000,
        tokensLimit: 120000,
        utilizationPercent: 8.33,
      });

      const exists = await fs.promises
        .access(disabledLogger.getLogPath())
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Log Entry Structure Tests (T023)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('log entry structure', () => {
    it('should include all required fields', async () => {
      await logger.logHealthCheck({
        sessionId: 'test-session',
        stage: 'implement',
        status: 'warning',
        tokensUsed: 70000,
        tokensLimit: 120000,
        utilizationPercent: 58.33,
        breakdown: {
          specArtifacts: 10000,
          memories: 15000,
          hints: 5000,
          observations: 20000,
          systemFiles: 5000,
          conversation: 15000,
        },
        action: 'Consider masking old observations',
      });

      const entries = await logger.readLog();
      expect(entries.length).toBe(1);

      const entry = entries[0];
      expect(entry.timestamp).toBeDefined();
      expect(entry.sessionId).toBe('test-session');
      expect(entry.stage).toBe('implement');
      expect(entry.status).toBe('warning');
      expect(entry.tokensUsed).toBe(70000);
      expect(entry.tokensLimit).toBe(120000);
      expect(entry.utilizationPercent).toBe(58.33);
      expect(entry.eventType).toBe('health_check');
      expect(entry.breakdown).toBeDefined();
      expect(entry.action).toBe('Consider masking old observations');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Convenience Method Tests (T023)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('logHealthCheck', () => {
    it('should log health check with correct eventType', async () => {
      await logger.logHealthCheck({
        sessionId: 'session-123',
        stage: 'plan',
        status: 'healthy',
        tokensUsed: 40000,
        tokensLimit: 120000,
        utilizationPercent: 33.33,
      });

      const entries = await logger.readLog();
      expect(entries[0].eventType).toBe('health_check');
    });
  });

  describe('logMaskingEvent', () => {
    it('should log masking event with masked observation count', async () => {
      await logger.logMaskingEvent({
        sessionId: 'session-456',
        stage: 'implement',
        status: 'warning',
        tokensUsed: 65000,
        tokensLimit: 120000,
        utilizationPercent: 54.17,
        maskedObservations: 5,
        tokensSaved: 8000,
      });

      const entries = await logger.readLog();
      expect(entries[0].eventType).toBe('masking');
      expect(entries[0].maskedObservations).toBe(5);
      expect(entries[0].tokensSaved).toBe(8000);
    });
  });

  describe('logStageTransition', () => {
    it('should log stage transition with action description', async () => {
      await logger.logStageTransition({
        sessionId: 'session-789',
        fromStage: 'research',
        toStage: 'specify',
        status: 'healthy',
        tokensUsed: 45000,
        tokensLimit: 120000,
        utilizationPercent: 37.5,
      });

      const entries = await logger.readLog();
      expect(entries[0].eventType).toBe('stage_transition');
      expect(entries[0].stage).toBe('specify');
      expect(entries[0].action).toContain('research');
      expect(entries[0].action).toContain('specify');
    });
  });

  describe('logHandoff', () => {
    it('should log handoff event', async () => {
      await logger.logHandoff(
        'session-abc',
        'implement',
        'critical',
        100000,
        120000,
        83.33,
        'Context critical, saving progress'
      );

      const entries = await logger.readLog();
      expect(entries[0].eventType).toBe('handoff');
      expect(entries[0].action).toBe('Context critical, saving progress');
    });

    it('should use default reason when not provided', async () => {
      await logger.logHandoff('session-def', 'validate', 'critical', 95000, 120000, 79.17);

      const entries = await logger.readLog();
      expect(entries[0].action).toBe('Handoff triggered');
    });
  });

  describe('logSessionStart', () => {
    it('should log session start with initial values', async () => {
      await logger.logSessionStart('new-session', 'research');

      const entries = await logger.readLog();
      expect(entries[0].eventType).toBe('session_start');
      expect(entries[0].sessionId).toBe('new-session');
      expect(entries[0].stage).toBe('research');
      expect(entries[0].tokensUsed).toBe(0);
      expect(entries[0].status).toBe('healthy');
    });
  });

  describe('logSessionEnd', () => {
    it('should log session end with final values', async () => {
      await logger.logSessionEnd('ending-session', 'validate', 'warning', 75000, 120000, 62.5);

      const entries = await logger.readLog();
      expect(entries[0].eventType).toBe('session_end');
      expect(entries[0].action).toBe('Session ended');
      expect(entries[0].tokensUsed).toBe(75000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Log Reading Tests (T024)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('readLog', () => {
    it('should return empty array for non-existent log', async () => {
      const entries = await logger.readLog();
      expect(entries).toEqual([]);
    });

    it('should parse all entries', async () => {
      await logger.logSessionStart('s1', 'research');
      await logger.logHealthCheck({
        sessionId: 's1',
        stage: 'research',
        status: 'healthy',
        tokensUsed: 30000,
        tokensLimit: 120000,
        utilizationPercent: 25,
      });
      await logger.logSessionEnd('s1', 'research', 'healthy', 35000, 120000, 29.17);

      const entries = await logger.readLog();
      expect(entries.length).toBe(3);
    });

    it('should limit entries when specified', async () => {
      for (let i = 0; i < 10; i++) {
        await logger.logHealthCheck({
          sessionId: 's1',
          stage: 'research',
          status: 'healthy',
          tokensUsed: i * 1000,
          tokensLimit: 120000,
          utilizationPercent: ((i * 1000) / 120000) * 100,
        });
      }

      const entries = await logger.readLog(3);
      expect(entries.length).toBe(3);
      // Should be last 3 entries
      expect(entries[2].tokensUsed).toBe(9000);
    });
  });

  describe('filterByEventType', () => {
    it('should filter entries by event type', async () => {
      await logger.logSessionStart('s1', 'research');
      await logger.logHealthCheck({
        sessionId: 's1',
        stage: 'research',
        status: 'healthy',
        tokensUsed: 30000,
        tokensLimit: 120000,
        utilizationPercent: 25,
      });
      await logger.logMaskingEvent({
        sessionId: 's1',
        stage: 'implement',
        status: 'warning',
        tokensUsed: 70000,
        tokensLimit: 120000,
        utilizationPercent: 58.33,
        maskedObservations: 3,
        tokensSaved: 5000,
      });
      await logger.logHealthCheck({
        sessionId: 's1',
        stage: 'implement',
        status: 'warning',
        tokensUsed: 65000,
        tokensLimit: 120000,
        utilizationPercent: 54.17,
      });

      const healthChecks = await logger.filterByEventType('health_check');
      expect(healthChecks.length).toBe(2);

      const maskingEvents = await logger.filterByEventType('masking');
      expect(maskingEvents.length).toBe(1);
    });
  });

  describe('filterBySession', () => {
    it('should filter entries by session ID', async () => {
      await logger.logSessionStart('session-a', 'research');
      await logger.logHealthCheck({
        sessionId: 'session-a',
        stage: 'research',
        status: 'healthy',
        tokensUsed: 30000,
        tokensLimit: 120000,
        utilizationPercent: 25,
      });
      await logger.logSessionStart('session-b', 'implement');
      await logger.logHealthCheck({
        sessionId: 'session-b',
        stage: 'implement',
        status: 'warning',
        tokensUsed: 70000,
        tokensLimit: 120000,
        utilizationPercent: 58.33,
      });

      const sessionA = await logger.filterBySession('session-a');
      expect(sessionA.length).toBe(2);
      expect(sessionA.every((e) => e.sessionId === 'session-a')).toBe(true);

      const sessionB = await logger.filterBySession('session-b');
      expect(sessionB.length).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Configuration Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('configuration', () => {
    it('should use default log path', () => {
      const defaultPath = path.join(tempDir, '.specify/logs/context-usage.jsonl');
      expect(logger.getLogPath()).toBe(defaultPath);
    });

    it('should accept custom log path', () => {
      const customLogger = new ContextUsageLogger(tempDir, {
        logPath: 'custom/path/usage.jsonl',
      });
      expect(customLogger.getLogPath()).toBe(path.join(tempDir, 'custom/path/usage.jsonl'));
    });

    it('should return config copy', () => {
      const config = logger.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.logPath).toBe('.specify/logs/context-usage.jsonl');
    });

    it('should update config', () => {
      logger.updateConfig({ enabled: false });
      expect(logger.getConfig().enabled).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // JSONL Format Validation Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('JSONL format', () => {
    it('should produce valid JSON on each line', async () => {
      await logger.logSessionStart('s1', 'research');
      await logger.logHealthCheck({
        sessionId: 's1',
        stage: 'research',
        status: 'healthy',
        tokensUsed: 30000,
        tokensLimit: 120000,
        utilizationPercent: 25,
      });

      const content = await fs.promises.readFile(logger.getLogPath(), 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    it('should have one entry per line', async () => {
      await logger.logSessionStart('s1', 'research');
      await logger.logSessionEnd('s1', 'research', 'healthy', 10000, 120000, 8.33);

      const content = await fs.promises.readFile(logger.getLogPath(), 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);
      expect(lines[0]).not.toContain('\n');
      expect(lines[1]).not.toContain('\n');
    });
  });
});
