/**
 * Unit tests for ContextContentPanel
 *
 * T016: Singleton behavior, showCategory, dispose, escapeHtml
 * T017: Category renderers — 6 render methods with mock data
 *
 * Feature 021-context-item-click-to-view
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { BridgeData } from '../../extension/src/autonomous/HookBridgeWatcher';

// Track created panels for assertions
let lastCreatedPanel: {
  viewType: string;
  title: string;
  column: number;
  options: Record<string, unknown>;
  webview: { html: string };
  reveal: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  onDidDispose: ReturnType<typeof vi.fn>;
};

function createMockPanel() {
  const panel = {
    viewType: 'goferContextContent',
    title: '',
    column: 1,
    options: {},
    webview: { html: '' },
    reveal: vi.fn(),
    dispose: vi.fn(),
    onDidDispose: vi.fn(),
  };
  lastCreatedPanel = panel;
  return panel;
}

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    activeTextEditor: { viewColumn: 1 },
    createWebviewPanel: vi.fn(() => createMockPanel()),
  },
  ViewColumn: { One: 1, Two: 2 },
  Uri: { file: (p: string) => ({ fsPath: p, scheme: 'file' }) },
}));

// Mock fs module for renderer tests
const mockFs: Record<string, string | Error> = {};
const mockDirs: Record<string, string[]> = {};
const mockStats: Record<
  string,
  { isFile: () => boolean; isDirectory: () => boolean; size: number }
> = {};

vi.mock('fs', () => ({
  promises: {
    readdir: vi.fn(async (dir: string) => {
      if (mockDirs[dir]) return mockDirs[dir];
      throw new Error('ENOENT');
    }),
    stat: vi.fn(async (filePath: string) => {
      if (mockStats[filePath]) return mockStats[filePath];
      throw new Error('ENOENT');
    }),
    readFile: vi.fn(async (filePath: string) => {
      if (typeof mockFs[filePath] === 'string') return mockFs[filePath];
      throw new Error('ENOENT');
    }),
    access: vi.fn(async (filePath: string) => {
      if (mockFs[filePath] !== undefined || mockStats[filePath]) return;
      throw new Error('ENOENT');
    }),
    open: vi.fn(async (filePath: string) => {
      const content = mockFs[filePath];
      if (typeof content !== 'string') throw new Error('ENOENT');
      const buf = Buffer.from(content, 'utf-8');
      return {
        read: vi.fn(async (target: Buffer, offset: number, length: number) => {
          const bytesRead = Math.min(length, buf.length);
          buf.copy(target, 0, 0, bytesRead);
          return { bytesRead };
        }),
        close: vi.fn(),
      };
    }),
  },
}));

import { ContextContentPanel } from '../../extension/src/ui/ContextContentPanel';

function makeBridgeData(overrides: Partial<BridgeData> = {}): BridgeData {
  return {
    timestamp: Date.now(),
    sessionId: 'test-session-abc12345',
    model: 'claude-opus-4-5-20251101',
    context: {
      totalContextTokens: 100000,
      inputTokens: 500,
      cacheCreationInputTokens: 1000,
      cacheReadInputTokens: 98500,
      outputTokens: 1500,
      contextLimit: 200000,
      utilizationPercent: 50,
    },
    lastToolUse: {
      toolName: 'Edit',
      timestamp: Date.now(),
    },
    session: {
      active: true,
      lastActivity: Date.now(),
    },
    ...overrides,
  };
}

/** Reset mock filesystem */
function resetMockFs(): void {
  for (const key of Object.keys(mockFs)) delete mockFs[key];
  for (const key of Object.keys(mockDirs)) delete mockDirs[key];
  for (const key of Object.keys(mockStats)) delete mockStats[key];
}

describe('ContextContentPanel', () => {
  const extensionUri = { fsPath: '/test/ext', scheme: 'file' } as never;
  const workspacePath = '/test/workspace';

  beforeEach(() => {
    ContextContentPanel.currentPanel = undefined;
    resetMockFs();
  });

  afterEach(() => {
    ContextContentPanel.currentPanel = undefined;
  });

  // ── T016: Singleton behavior ──────────────────────────────

  describe('singleton behavior (T016)', () => {
    it('createOrShow creates a new panel when none exists', () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      expect(panel).toBeInstanceOf(ContextContentPanel);
      expect(ContextContentPanel.currentPanel).toBe(panel);
    });

    it('createOrShow returns existing panel on second call', () => {
      const panel1 = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      const panel2 = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      expect(panel1).toBe(panel2);
      expect(lastCreatedPanel.reveal).toHaveBeenCalled();
    });

    it('dispose resets currentPanel to undefined', () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      expect(ContextContentPanel.currentPanel).toBe(panel);
      panel.dispose();
      expect(ContextContentPanel.currentPanel).toBeUndefined();
    });

    it('after dispose, createOrShow creates a new panel', () => {
      const panel1 = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      panel1.dispose();
      const panel2 = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      expect(panel2).not.toBe(panel1);
      expect(ContextContentPanel.currentPanel).toBe(panel2);
    });
  });

  // ── T016: showCategory updates panel ──────────────────────

  describe('showCategory (T016)', () => {
    it('updates panel title with category and session label', async () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      const data = makeBridgeData({ displayName: 'My Session' });
      await panel.showCategory('sess-123', 'Spec Artifacts', data);
      expect(lastCreatedPanel.title).toBe('Spec Artifacts — My Session');
    });

    it('uses short session ID when no displayName', async () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      const data = makeBridgeData({ displayName: undefined });
      await panel.showCategory('abcdef1234567890', 'System Files', data);
      expect(lastCreatedPanel.title).toBe('System Files — Session abcdef12');
    });

    it('sets webview.html with valid HTML document', async () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-123', 'System Files', makeBridgeData());
      expect(lastCreatedPanel.webview.html).toContain('<!DOCTYPE html>');
      expect(lastCreatedPanel.webview.html).toContain('System Files');
    });

    it('handles unknown category gracefully', async () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-123', 'Nonexistent', makeBridgeData());
      expect(lastCreatedPanel.webview.html).toContain('Unknown category');
    });
  });

  // ── T016: escapeHtml ──────────────────────────────────────

  describe('escapeHtml via rendered content (T016)', () => {
    it('escapes HTML special characters in category names', async () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-123', '<script>alert("xss")</script>', makeBridgeData());
      const html = lastCreatedPanel.webview.html;
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  // ── T017: Category renderers ──────────────────────────────

  describe('renderSpecArtifacts (T017)', () => {
    it('renders spec directories and files', async () => {
      const specsDir = '/test/workspace/.specify/specs';
      mockDirs[specsDir] = ['feature-001'];
      mockStats[`${specsDir}/feature-001`] = {
        isFile: () => false,
        isDirectory: () => true,
        size: 0,
      };
      mockDirs[`${specsDir}/feature-001`] = ['spec.md', 'plan.md'];
      mockStats[`${specsDir}/feature-001/spec.md`] = {
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
      };
      mockStats[`${specsDir}/feature-001/plan.md`] = {
        isFile: () => true,
        isDirectory: () => false,
        size: 2048,
      };
      mockFs[`${specsDir}/feature-001/spec.md`] = '# Feature Spec\n\nThis is a test spec.';
      mockFs[`${specsDir}/feature-001/plan.md`] = '# Plan\n\nImplementation plan.';

      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Spec Artifacts', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('feature-001');
      expect(html).toContain('spec.md');
      expect(html).toContain('plan.md');
      expect(html).toContain('1.0 KB');
    });

    it('shows empty state when no specs directory', async () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Spec Artifacts', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('No spec artifacts found');
    });

    it('shows empty state when specs directory is empty', async () => {
      mockDirs['/test/workspace/.specify/specs'] = [];

      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Spec Artifacts', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('No spec artifacts found');
    });
  });

  describe('renderMemoriesHints (T017)', () => {
    it('renders grouped memories from JSONL', async () => {
      const memPath = '/test/workspace/.specify/memory/memories.jsonl';
      mockFs[memPath] = [
        JSON.stringify({
          content: 'Remember this',
          category: 'architecture',
          tags: ['#important'],
          priority: 1,
        }),
        JSON.stringify({ content: 'Another memory', category: 'architecture' }),
        JSON.stringify({ content: 'Bug note', category: 'debugging' }),
      ].join('\n');

      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Memories/Hints', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('architecture');
      expect(html).toContain('debugging');
      expect(html).toContain('Remember this');
      expect(html).toContain('P1');
      expect(html).toContain('#important');
    });

    it('shows empty state when no memory files exist', async () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Memories/Hints', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('No memories or hints found');
    });

    it('skips malformed JSONL lines', async () => {
      mockFs['/test/workspace/.specify/memory/memories.jsonl'] =
        '{"content":"valid","category":"test"}\nnot-json\n{"content":"also valid","category":"test"}';

      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Memories/Hints', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('valid');
      expect(html).toContain('also valid');
    });
  });

  describe('renderSystemFiles (T017)', () => {
    it('renders existing system files', async () => {
      const claudeMd = '/test/workspace/CLAUDE.md';
      const agentsMd = '/test/workspace/AGENTS.md';
      mockFs[claudeMd] = '# Claude Instructions\n\nFollow these rules.';
      mockFs[agentsMd] = '# Agent Guidelines\n\nCode quality rules.';
      mockStats[claudeMd] = { isFile: () => true, isDirectory: () => false, size: 5000 };
      mockStats[agentsMd] = { isFile: () => true, isDirectory: () => false, size: 3000 };

      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'System Files', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('CLAUDE.md');
      expect(html).toContain('AGENTS.md');
      expect(html).toContain('Claude Instructions');
    });

    it('shows empty state when no system files exist', async () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'System Files', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('No system files found');
    });
  });

  describe('renderConversationHistory (T017)', () => {
    it('renders token breakdown from bridge data', async () => {
      const data = makeBridgeData({
        model: 'claude-opus-4-5-20251101',
        sessionId: 'session-xyz',
        context: {
          totalContextTokens: 100000,
          inputTokens: 500,
          cacheCreationInputTokens: 1000,
          cacheReadInputTokens: 98500,
          outputTokens: 1500,
          contextLimit: 200000,
          utilizationPercent: 50,
        },
      });

      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('session-xyz', 'Conversation History', data);

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('Session Metadata');
      expect(html).toContain('claude-opus-4-5-20251101');
      expect(html).toContain('Context Utilization');
      expect(html).toContain('50%');
      expect(html).toContain('Token Breakdown');
      expect(html).toContain('Input Tokens');
      expect(html).toContain('Cache Read');
    });

    it('shows empty state when no bridge data context', async () => {
      const data = makeBridgeData({ context: null });

      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Conversation History', data);

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('No conversation data available');
    });

    it('shows empty state when bridge data is undefined', async () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Conversation History', undefined);

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('No conversation data available');
    });

    it('renders color-coded progress bar based on utilization', async () => {
      const data = makeBridgeData({
        context: {
          totalContextTokens: 160000,
          inputTokens: 500,
          cacheCreationInputTokens: 1000,
          cacheReadInputTokens: 158500,
          outputTokens: 1500,
          contextLimit: 200000,
          utilizationPercent: 80,
        },
      });

      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Conversation History', data);

      const html = lastCreatedPanel.webview.html;
      // High utilization should use red color
      expect(html).toContain('#dc3545');
      expect(html).toContain('80%');
    });
  });

  describe('renderToolOutputs (T017)', () => {
    it('renders recent observations', async () => {
      const obsDir = '/test/workspace/.specify/hooks/observations';
      const recentTs = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
      mockDirs[obsDir] = ['obs1.json', 'obs2.json'];
      mockFs[`${obsDir}/obs1.json`] = JSON.stringify({
        id: 'obs1',
        toolName: 'Read',
        toolInput: { file_path: '/some/file.ts' },
        toolResponse: 'File contents here...',
        timestamp: recentTs,
        truncated: false,
      });
      mockFs[`${obsDir}/obs2.json`] = JSON.stringify({
        id: 'obs2',
        toolName: 'Edit',
        toolInput: { file_path: '/another/file.ts' },
        toolResponse: 'Edit applied',
        timestamp: recentTs,
        truncated: true,
      });

      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Tool Outputs', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('Read');
      expect(html).toContain('Edit');
      expect(html).toContain('truncated');
    });

    it('shows empty state when no observations directory', async () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Tool Outputs', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('No recent tool outputs');
    });

    it('filters out old observations', async () => {
      const obsDir = '/test/workspace/.specify/hooks/observations';
      const oldTs = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
      mockDirs[obsDir] = ['obs1.json'];
      mockFs[`${obsDir}/obs1.json`] = JSON.stringify({
        id: 'obs1',
        toolName: 'Read',
        timestamp: oldTs,
      });

      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Tool Outputs', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('No recent tool outputs');
    });
  });

  describe('renderMaskedObservations (T017)', () => {
    it('renders masked (old) observations as faded cards', async () => {
      const obsDir = '/test/workspace/.specify/hooks/observations';
      const oldTs = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
      mockDirs[obsDir] = ['obs1.json'];
      mockFs[`${obsDir}/obs1.json`] = JSON.stringify({
        id: 'obs1',
        toolName: 'Bash',
        timestamp: oldTs,
      });

      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Masked Observations', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('Bash');
      expect(html).toContain('masked');
    });

    it('shows empty state when all observations are recent', async () => {
      const obsDir = '/test/workspace/.specify/hooks/observations';
      const recentTs = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
      mockDirs[obsDir] = ['obs1.json'];
      mockFs[`${obsDir}/obs1.json`] = JSON.stringify({
        id: 'obs1',
        toolName: 'Read',
        timestamp: recentTs,
      });

      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Masked Observations', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('No masked observations');
    });

    it('shows empty state when no observations exist', async () => {
      const panel = ContextContentPanel.createOrShow(extensionUri, workspacePath);
      await panel.showCategory('sess-1', 'Masked Observations', makeBridgeData());

      const html = lastCreatedPanel.webview.html;
      expect(html).toContain('No masked observations');
    });
  });
});
