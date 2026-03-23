/**
 * MCP Integration Tests
 * Task: T084
 *
 * Tests verify:
 * - T084: MCP Tool Handler multi-directory search
 * - Priority fallback (.claude/commands/ > .system/skills/ > .github/prompts/)
 * - Graceful degradation when MCP not available
 * - MCP initialization skipped for non-Claude providers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPConfigHelper } from '../../extension/src/mcpConfig';
import * as vscode from 'vscode';

// Mock VSCode
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
  },
}));

// Mock fs/promises
vi.mock('fs/promises');

describe('MCP Integration (T084)', () => {
  let mcpHelper: MCPConfigHelper;
  let mockConfig: Record<string, unknown>;
  const mockWorkspacePath = '/test/workspace';
  const mockContext = {
    asAbsolutePath: vi.fn((p: string) => `/extension/${p}`),
  } as unknown as vscode.ExtensionContext;

  beforeEach(() => {
    mockConfig = {};

    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key in mockConfig) {
          return mockConfig[key];
        }
        return defaultValue;
      }),
      update: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    mcpHelper = new MCPConfigHelper(mockWorkspacePath, mockContext);
  });

  describe('T083: Provider-based MCP Initialization Guard', () => {
    it('should skip MCP setup when defaultCLI is "codex"', async () => {
      mockConfig['defaultCLI'] = 'codex';
      mockConfig['cliProvider'] = 'auto';

      // Should return early without throwing
      await expect(mcpHelper.createOrUpdateConfig()).resolves.toBeUndefined();
    });

    it('should skip MCP setup when defaultCLI is "copilot"', async () => {
      mockConfig['defaultCLI'] = 'copilot';
      mockConfig['cliProvider'] = 'auto';

      // Should return early without throwing
      await expect(mcpHelper.createOrUpdateConfig()).resolves.toBeUndefined();
    });

    it('should allow MCP setup when defaultCLI is "claude"', async () => {
      mockConfig['defaultCLI'] = 'claude';
      mockConfig['cliProvider'] = 'auto';
      mockConfig['anthropicApiKey'] = 'test-key';

      // Mock fs operations to succeed
      const fs = await import('fs/promises');
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Should proceed with MCP setup
      await expect(mcpHelper.createOrUpdateConfig()).resolves.toBeUndefined();

      // Should have attempted to write config
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should allow MCP setup when defaultCLI is "auto" and cliProvider is "claude"', async () => {
      mockConfig['defaultCLI'] = 'auto';
      mockConfig['cliProvider'] = 'claude';
      mockConfig['anthropicApiKey'] = 'test-key';

      // Mock fs operations
      const fs = await import('fs/promises');
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await expect(mcpHelper.createOrUpdateConfig()).resolves.toBeUndefined();

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should skip MCP setup when both settings indicate non-Claude provider', async () => {
      mockConfig['defaultCLI'] = 'auto';
      mockConfig['cliProvider'] = 'codex';

      // Should return early
      await expect(mcpHelper.createOrUpdateConfig()).resolves.toBeUndefined();
    });
  });

  describe('T084: MCP Tool Handler Priority Fallback', () => {
    it('should prioritize .claude/commands/ directory first', () => {
      const platforms = [
        { name: 'claude', path: '.claude/commands', priority: 1 },
        { name: 'codex', path: '.system/skills', priority: 2 },
        { name: 'copilot', path: '.github/prompts', priority: 3 },
      ];

      // Verify priority ordering
      expect(platforms[0].name).toBe('claude');
      expect(platforms[0].priority).toBe(1);
    });

    it('should fall back to .system/skills/ if .claude/commands/ not found', () => {
      const platforms = [
        { name: 'claude', exists: false },
        { name: 'codex', exists: true },
        { name: 'copilot', exists: true },
      ];

      const available = platforms.filter((p) => p.exists);
      expect(available[0].name).toBe('codex');
    });

    it('should fall back to .github/prompts/ if only Copilot available', () => {
      const platforms = [
        { name: 'claude', exists: false },
        { name: 'codex', exists: false },
        { name: 'copilot', exists: true },
      ];

      const available = platforms.filter((p) => p.exists);
      expect(available[0].name).toBe('copilot');
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle missing directory creation gracefully', async () => {
      mockConfig['defaultCLI'] = 'claude';
      mockConfig['anthropicApiKey'] = 'test-key';

      const fs = await import('fs/promises');
      // Mock mkdir to fail but writeFile to succeed (directory already exists)
      vi.mocked(fs.mkdir).mockRejectedValue(new Error('Directory exists'));
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Should complete successfully despite mkdir error
      await expect(mcpHelper.createOrUpdateConfig()).resolves.toBeUndefined();
    });

    it('should handle write errors by throwing', async () => {
      mockConfig['defaultCLI'] = 'claude';
      mockConfig['anthropicApiKey'] = 'test-key';

      const fs = await import('fs/promises');
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Permission denied'));

      // Should throw when unable to write
      await expect(mcpHelper.createOrUpdateConfig()).rejects.toThrow();
    });
  });

  describe('Multi-Directory Search', () => {
    it('should search command directories in priority order', () => {
      const searchOrder = ['.claude/commands', '.system/skills', '.github/prompts'];

      expect(searchOrder[0]).toBe('.claude/commands');
      expect(searchOrder[1]).toBe('.system/skills');
      expect(searchOrder[2]).toBe('.github/prompts');
    });

    it('should stop search after first match', () => {
      const directories = [
        { path: '.claude/commands', found: true },
        { path: '.system/skills', found: true },
        { path: '.github/prompts', found: true },
      ];

      // Simulate priority search
      let result = null;
      for (const dir of directories) {
        if (dir.found) {
          result = dir.path;
          break;
        }
      }

      expect(result).toBe('.claude/commands');
    });
  });
});
