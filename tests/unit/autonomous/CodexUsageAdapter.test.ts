/**
 * CodexUsageAdapter Unit Tests
 *
 * Tests for Codex CLI usage tracking adapter.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodexUsageAdapter } from '../../../../extension/src/autonomous/CodexUsageAdapter';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

vi.mock('fs');

describe.skip('CodexUsageAdapter', () => {
  let adapter: CodexUsageAdapter;
  const mockWorkspacePath = '/test/workspace';

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CodexUsageAdapter(mockWorkspacePath);
  });

  describe('constructor', () => {
    it('should initialize with correct provider ID', () => {
      expect(adapter.providerId).toBe('codex-cli');
    });

    it('should initialize with correct provider name', () => {
      expect(adapter.providerName).toBe('Codex CLI');
    });

    it('should use custom codex directory if provided', () => {
      const customDir = '/custom/codex';
      const customAdapter = new CodexUsageAdapter(mockWorkspacePath, customDir);

      expect(customAdapter['codexDir']).toBe(customDir);
    });

    it('should use default codex directory if not provided', () => {
      const homeDir = os.homedir();
      const expectedDir = path.join(homeDir, '.codex');

      expect(adapter['codexDir']).toBe(expectedDir);
    });
  });

  describe('isInstalled', () => {
    it('should return true when codex directory and history file exist', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const result = adapter.isInstalled();

      expect(result).toBe(true);
    });

    it('should return false when codex directory does not exist', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValueOnce(false);

      const result = adapter.isInstalled();

      expect(result).toBe(false);
    });

    it('should return false when history file does not exist', () => {
      vi.spyOn(fs, 'existsSync')
        .mockReturnValueOnce(true) // codex dir exists
        .mockReturnValueOnce(false); // history file doesn't exist

      const result = adapter.isInstalled();

      expect(result).toBe(false);
    });
  });

  describe('getDefaultLogPath', () => {
    it('should return path to history.json', () => {
      const result = adapter.getDefaultLogPath();

      expect(result).toContain('.codex');
      expect(result).toContain('history.json');
    });
  });

  describe('parseLogFile', () => {
    it('should parse valid history file and return usage entries', async () => {
      const mockHistoryData = {
        sessions: [
          {
            timestamp: '2024-01-01T10:00:00Z',
            sessionId: 'session-1',
            model: 'gpt-4o',
            tokens: {
              prompt: 100,
              completion: 200,
              total: 300,
            },
          },
          {
            timestamp: '2024-01-02T10:00:00Z',
            sessionId: 'session-2',
            model: 'gpt-4o',
            usage: {
              prompt_tokens: 150,
              completion_tokens: 250,
              total_tokens: 400,
            },
          },
        ],
      };

      vi.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      vi.spyOn(fs.promises, 'readFile').mockResolvedValue(JSON.stringify(mockHistoryData));

      const result = await adapter.parseLogFile('/path/to/history.json');

      expect(result).toHaveLength(2);
      expect(result[0].inputTokens).toBe(100);
      expect(result[0].outputTokens).toBe(200);
      expect(result[0].model).toBe('gpt-4o');
      expect(result[0].provider).toBe('codex-cli');
    });

    it('should return empty array if file does not exist', async () => {
      vi.spyOn(fs.promises, 'access').mockRejectedValue(new Error('File not found'));

      const result = await adapter.parseLogFile('/nonexistent/history.json');

      expect(result).toEqual([]);
    });

    it('should filter by date range', async () => {
      const mockHistoryData = {
        sessions: [
          {
            timestamp: '2024-01-01T10:00:00Z',
            sessionId: 'session-1',
            model: 'gpt-4o',
            tokens: { prompt: 100, completion: 200 },
          },
          {
            timestamp: '2024-01-15T10:00:00Z',
            sessionId: 'session-2',
            model: 'gpt-4o',
            tokens: { prompt: 150, completion: 250 },
          },
        ],
      };

      vi.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      vi.spyOn(fs.promises, 'readFile').mockResolvedValue(JSON.stringify(mockHistoryData));

      const fromDate = new Date('2024-01-10T00:00:00Z');
      const result = await adapter.parseLogFile('/path/to/history.json', fromDate);

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe('session-2');
    });

    it('should handle invalid JSON gracefully', async () => {
      vi.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      vi.spyOn(fs.promises, 'readFile').mockResolvedValue('invalid JSON');

      const result = await adapter.parseLogFile('/path/to/history.json');

      expect(result).toEqual([]);
    });

    it('should handle missing sessions array', async () => {
      const mockHistoryData = { notSessions: [] };

      vi.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      vi.spyOn(fs.promises, 'readFile').mockResolvedValue(JSON.stringify(mockHistoryData));

      const result = await adapter.parseLogFile('/path/to/history.json');

      expect(result).toEqual([]);
    });
  });

  describe('extractUsage', () => {
    it('should extract usage from log entry with tokens field', () => {
      const entry = {
        timestamp: '2024-01-01T10:00:00Z',
        sessionId: 'session-1',
        model: 'gpt-4o',
        tokens: {
          prompt: 100,
          completion: 200,
          total: 300,
        },
      };

      const result = adapter.extractUsage(entry);

      expect(result).not.toBeNull();
      expect(result?.inputTokens).toBe(100);
      expect(result?.outputTokens).toBe(200);
      expect(result?.totalTokens).toBe(300);
      expect(result?.provider).toBe('codex-cli');
    });

    it('should extract usage from log entry with usage field', () => {
      const entry = {
        timestamp: '2024-01-01T10:00:00Z',
        sessionId: 'session-1',
        model: 'gpt-4o',
        usage: {
          prompt_tokens: 150,
          completion_tokens: 250,
          total_tokens: 400,
        },
      };

      const result = adapter.extractUsage(entry);

      expect(result).not.toBeNull();
      expect(result?.inputTokens).toBe(150);
      expect(result?.outputTokens).toBe(250);
      expect(result?.totalTokens).toBe(400);
    });

    it('should return null for entries without usage data', () => {
      const entry = {
        timestamp: '2024-01-01T10:00:00Z',
        sessionId: 'session-1',
        model: 'gpt-4o',
      };

      const result = adapter.extractUsage(entry);

      expect(result).toBeNull();
    });

    it('should calculate total tokens if not provided', () => {
      const entry = {
        timestamp: '2024-01-01T10:00:00Z',
        sessionId: 'session-1',
        model: 'gpt-4o',
        tokens: {
          prompt: 100,
          completion: 200,
        },
      };

      const result = adapter.extractUsage(entry);

      expect(result?.totalTokens).toBe(300);
    });

    it('should parse JSON string entry', () => {
      const entry = JSON.stringify({
        timestamp: '2024-01-01T10:00:00Z',
        sessionId: 'session-1',
        model: 'gpt-4o',
        tokens: {
          prompt: 100,
          completion: 200,
        },
      });

      const result = adapter.extractUsage(entry);

      expect(result).not.toBeNull();
      expect(result?.inputTokens).toBe(100);
    });

    it('should calculate cost using pricing config', () => {
      const entry = {
        timestamp: '2024-01-01T10:00:00Z',
        sessionId: 'session-1',
        model: 'gpt-4o',
        tokens: {
          prompt: 100,
          completion: 200,
        },
      };

      const result = adapter.extractUsage(entry);

      expect(result?.costUsd).toBeGreaterThan(0);
    });

    it('should handle malformed JSON string gracefully', () => {
      const result = adapter.extractUsage('not valid JSON');

      expect(result).toBeNull();
    });
  });
});
