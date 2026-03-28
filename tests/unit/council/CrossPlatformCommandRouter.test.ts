import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { CrossPlatformCommandRouter } from '../../../extension/src/council/CrossPlatformCommandRouter';
import { PlatformDetector } from '../../../extension/src/council/PlatformDetector';
import { ConfigManager } from '../../../extension/src/config';

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
    createFileSystemWatcher: vi.fn(() => ({
      onDidChange: vi.fn(),
      onDidCreate: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    })),
  },
  RelativePattern: class RelativePattern {
    constructor(
      public base: string,
      public pattern: string
    ) {}
  },
}));

vi.mock('fs');

describe('CrossPlatformCommandRouter', () => {
  const workspacePath = '/test/workspace';
  let mockConfig: Record<string, unknown>;

  beforeEach(() => {
    PlatformDetector.resetInstance();
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

    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.statSync).mockReturnValue({
      isDirectory: () => true,
    } as fs.Stats);
    vi.mocked(fs.readdirSync).mockReturnValue([]);
    vi.mocked(fs.readFileSync).mockReturnValue(`---
description: Test command
---

# Test

Body`);

    ConfigManager.getInstance().refresh();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('routes to preferred platform when available', () => {
    mockConfig['defaultCLI'] = 'copilot';
    ConfigManager.getInstance().refresh();

    vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) =>
      String(p).includes('.github/prompts/1_gofer_research.prompt.md')
    );

    const router = new CrossPlatformCommandRouter(workspacePath);
    const result = router.routeCommand('1_gofer_research');

    expect(result.platform).toBe('copilot');
    expect(result.filePath).toContain('.github/prompts/1_gofer_research.prompt.md');
    expect(result.syntax).toBe('#1_gofer_research');
  });

  it('falls back by priority Claude > Codex > Copilot when auto', () => {
    mockConfig['defaultCLI'] = 'auto';
    ConfigManager.getInstance().refresh();

    vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
      const path = String(p);
      return (
        path.includes('.claude/commands/1_gofer_research.md') ||
        path.includes('.system/skills/1_gofer_research/SKILL.md') ||
        path.includes('.github/prompts/1_gofer_research.prompt.md')
      );
    });

    const router = new CrossPlatformCommandRouter(workspacePath);
    const result = router.routeCommand('1_gofer_research');

    expect(result.platform).toBe('claude');
    expect(result.syntax).toBe('/1_gofer_research');
  });

  it('falls back from unavailable preferred codex to claude', () => {
    mockConfig['defaultCLI'] = 'codex';
    ConfigManager.getInstance().refresh();

    vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
      const path = String(p);
      return path.includes('.claude/commands/1_gofer_research.md');
    });

    const router = new CrossPlatformCommandRouter(workspacePath);
    const result = router.routeCommand('1_gofer_research');

    expect(result.platform).toBe('claude');
    expect(result.filePath).toContain('.claude/commands/1_gofer_research.md');
  });

  it('respects explicit targetPlatform override without fallback', () => {
    mockConfig['defaultCLI'] = 'claude';
    ConfigManager.getInstance().refresh();
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const router = new CrossPlatformCommandRouter(workspacePath);
    expect(() => router.routeCommand('1_gofer_research', 'copilot')).toThrow(
      'Command "1_gofer_research" not found for platform "copilot"'
    );
  });

  it('rejects path traversal command names (T046)', () => {
    const router = new CrossPlatformCommandRouter(workspacePath);

    expect(() => router.routeCommand('../../../etc/passwd')).toThrow(
      'Invalid command name: "../../../etc/passwd" (path traversal not allowed)'
    );
    expect(() => router.routeCommand('..\\..\\windows\\system32')).toThrow(
      'Invalid command name: "..\\..\\windows\\system32" (path traversal not allowed)'
    );
    expect(() => router.routeCommand('/absolute/path')).toThrow(
      'Invalid command name: "/absolute/path" (path traversal not allowed)'
    );
  });
});
