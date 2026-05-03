/**
 * Unit tests for MemoryPanel filtering functionality
 * Feature 001: Memory Panel Usability Fix
 *
 * Tests T024-T027 from tasks.md:
 * - T024: Toggle OFF filters out system memories
 * - T025: Toggle ON includes all memories
 * - T026: Categories filtered by toggle state
 * - T027: Tags filtered by toggle state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { MemoryPanel } from '../../../extension/src/ui/MemoryPanel';
import type { MemoryManager } from '../../../extension/src/autonomous/MemoryManager';
import type { Memory } from '../../../extension/src/autonomous/memory';

// Mock VSCode API
vi.mock('vscode', () => ({
  window: {
    createWebviewPanel: vi.fn(() => ({
      webview: {
        html: '',
        postMessage: vi.fn(),
        onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
      },
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
      reveal: vi.fn(),
      dispose: vi.fn(),
    })),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
  },
  ViewColumn: {
    One: 1,
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
  },
}));

describe('MemoryPanel - System Memory Filtering', () => {
  let mockMemoryManager: MemoryManager;
  let mockExtensionUri: vscode.Uri;
  let userMemories: Memory[];
  let systemMemories: Memory[];
  let agentMemories: Memory[];
  let allMemories: Memory[];

  beforeEach(() => {
    // Create test data: user memories, generated telemetry, and auto-learned agent memories.
    userMemories = [
      {
        id: 'u1',
        content: 'User memory 1',
        category: 'pattern',
        tags: ['#user', '#code'],
        scope: 'local' as const,
        created: Date.now(),
        lastAccessed: Date.now(),
        usageCount: 1,
        importance: 1,
      },
      {
        id: 'u2',
        content: 'User memory 2',
        category: 'gotcha',
        tags: ['#user'],
        scope: 'local' as const,
        created: Date.now(),
        lastAccessed: Date.now(),
        usageCount: 1,
        importance: 1,
      },
      {
        id: 'u3',
        content: 'User memory 3',
        category: 'decision',
        tags: ['#user'],
        scope: 'global' as const,
        created: Date.now(),
        lastAccessed: Date.now(),
        usageCount: 1,
        importance: 1,
      },
      {
        id: 'u4',
        content: 'User memory 4',
        category: 'pattern',
        tags: ['#user', '#test'],
        scope: 'local' as const,
        created: Date.now(),
        lastAccessed: Date.now(),
        usageCount: 1,
        importance: 1,
      },
      {
        id: 'u5',
        content: 'User memory 5',
        category: 'gotcha',
        tags: ['#user'],
        scope: 'local' as const,
        created: Date.now(),
        lastAccessed: Date.now(),
        usageCount: 1,
        importance: 1,
      },
    ];

    systemMemories = [
      {
        id: 's1',
        content: 'System memory 1',
        category: 'auto_decision',
        tags: ['#auto', '#budget'],
        scope: 'local' as const,
        created: Date.now(),
        lastAccessed: Date.now(),
        usageCount: 1,
        importance: 1,
      },
      {
        id: 's2',
        content: 'System memory 2',
        category: 'discovery',
        tags: ['#auto'],
        scope: 'local' as const,
        created: Date.now(),
        lastAccessed: Date.now(),
        usageCount: 1,
        importance: 1,
      },
      {
        id: 's3',
        content: 'System memory 3',
        category: 'auto_decision',
        tags: ['#auto', '#scope'],
        scope: 'global' as const,
        created: Date.now(),
        lastAccessed: Date.now(),
        usageCount: 1,
        importance: 1,
      },
      {
        id: 's4',
        content: 'System memory 4',
        category: 'discovery',
        tags: ['#auto'],
        scope: 'local' as const,
        created: Date.now(),
        lastAccessed: Date.now(),
        usageCount: 1,
        importance: 1,
      },
      {
        id: 's5',
        content: 'System memory 5',
        category: 'auto_decision',
        tags: ['#auto'],
        scope: 'local' as const,
        created: Date.now(),
        lastAccessed: Date.now(),
        usageCount: 1,
        importance: 1,
      },
    ];

    agentMemories = [
      {
        id: 'a1',
        content: 'Agent learned file knowledge',
        category: 'file_knowledge',
        tags: ['#auto-learned', '#files'],
        scope: 'local' as const,
        created: Date.now(),
        lastAccessed: Date.now(),
        usageCount: 1,
        importance: 1,
      },
    ];

    allMemories = [...userMemories, ...systemMemories, ...agentMemories];

    // Mock MemoryManager
    mockMemoryManager = {
      load: vi.fn().mockResolvedValue(allMemories),
      search: vi.fn().mockResolvedValue({
        memories: allMemories,
        count: allMemories.length,
        searchTime: 10,
      }),
      forget: vi.fn().mockResolvedValue(undefined),
      recordUsage: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(10),
    } as unknown as MemoryManager;

    mockExtensionUri = vscode.Uri.file('/mock/path');
  });

  afterEach(() => {
    // Clear the singleton panel between tests to avoid state pollution
    (MemoryPanel as unknown as { currentPanel: MemoryPanel | undefined }).currentPanel = undefined;
  });

  // T024: Toggle OFF filters out system memories
  it('should show repo-local human memories only when toggle is OFF (default)', async () => {
    // Arrange: Create panel with default state (toggle OFF)
    const panel = MemoryPanel.createOrShow(mockExtensionUri, mockMemoryManager);

    // Act: Get the HTML content (internally calls getHtmlContent)
    // Panel is created with showSystemMemories = false by default
    const panelInternal = panel as unknown as {
      getHtmlContent: () => Promise<string>;
      showSystemMemories: boolean;
    };
    const html = await panelInternal.getHtmlContent();

    // Assert: HTML should NOT contain generated or cross-repo memories
    expect(panelInternal.showSystemMemories).toBe(false);
    expect(html).not.toContain('System memory 1');
    expect(html).not.toContain('System memory 2');
    expect(html).not.toContain('Agent learned file knowledge');
    expect(html).not.toContain('auto_decision');
    expect(html).not.toContain('discovery');
    expect(html).not.toContain('User memory 3');

    // Assert: HTML should contain repo-local user memory content
    expect(html).toContain('User memory 1');
    expect(html).toContain('User memory 2');
    expect(html).toContain('pattern');
    expect(html).toContain('gotcha');

    // Assert: Results count shows only local human memories
    expect(html).toContain('4 memories');
    expect(html).toContain('<option value="local" selected>');
  });

  // T025: Toggle ON includes all local generated memories
  it('should include local generated memories when toggle is ON', async () => {
    // Arrange: Create panel and set toggle ON
    const panel = MemoryPanel.createOrShow(mockExtensionUri, mockMemoryManager);
    const panelInternal = panel as unknown as {
      handleMessage: (message: { command: string; [key: string]: unknown }) => Promise<void>;
      getHtmlContent: () => Promise<string>;
      showSystemMemories: boolean;
    };

    // Act: Toggle ON by sending message
    await panelInternal.handleMessage({
      command: 'toggleSystemMemories',
      showSystemMemories: true,
    });

    const html = await panelInternal.getHtmlContent();

    // Assert: Toggle state is ON
    expect(panelInternal.showSystemMemories).toBe(true);

    // Assert: HTML contains local user, system, and auto-learned memories
    expect(html).toContain('User memory 1');
    expect(html).toContain('System memory 1');
    expect(html).toContain('Agent learned file knowledge');
    expect(html).toContain('pattern');
    expect(html).toContain('auto_decision');
    expect(html).toContain('discovery');
    expect(html).toContain('file_knowledge');
    expect(html).not.toContain('User memory 3');

    // Assert: Results count shows all local memories (4 user + 4 system + 1 auto-learned)
    expect(html).toContain('9 memories');

    // Assert: Checkbox is checked
    expect(html).toContain('checked');
  });

  // T026: Categories filtered by toggle state
  it('should filter categories based on toggle state', async () => {
    // Arrange: Create panel with default state (toggle OFF)
    const panel = MemoryPanel.createOrShow(mockExtensionUri, mockMemoryManager);
    const panelInternal = panel as unknown as {
      handleMessage: (message: { command: string; [key: string]: unknown }) => Promise<void>;
      getHtmlContent: () => Promise<string>;
    };

    // Act: Get HTML with toggle OFF
    const htmlOff = await panelInternal.getHtmlContent();

    // Assert: Category dropdown should NOT include system categories (check for <option> tags)
    expect(htmlOff).not.toContain('<option value="auto_decision">');
    expect(htmlOff).not.toContain('<option value="discovery">');

    // Assert: Category dropdown should include user categories
    expect(htmlOff).toContain('<option value="pattern">');
    expect(htmlOff).toContain('<option value="gotcha">');
    expect(htmlOff).not.toContain('<option value="decision">');

    // Act: Toggle ON
    await panelInternal.handleMessage({
      command: 'toggleSystemMemories',
      showSystemMemories: true,
    });
    const htmlOn = await panelInternal.getHtmlContent();

    // Assert: Category dropdown NOW includes system categories
    expect(htmlOn).toContain('<option value="auto_decision">');
    expect(htmlOn).toContain('<option value="discovery">');
    expect(htmlOn).toContain('<option value="file_knowledge">');
  });

  // T027: Tags filtered by toggle state
  it('should filter tags based on toggle state', async () => {
    // Arrange: Create panel with default state (toggle OFF)
    const panel = MemoryPanel.createOrShow(mockExtensionUri, mockMemoryManager);
    const panelInternal = panel as unknown as {
      handleMessage: (message: { command: string; [key: string]: unknown }) => Promise<void>;
      getHtmlContent: () => Promise<string>;
    };

    // Act: Get HTML with toggle OFF
    const htmlOff = await panelInternal.getHtmlContent();

    // Assert: Tag dropdown should NOT include generated-memory tags
    expect(htmlOff).not.toContain('<option value="#auto">');
    expect(htmlOff).not.toContain('<option value="#budget">');
    expect(htmlOff).not.toContain('<option value="#auto-learned">');
    expect(htmlOff).not.toContain('<option value="#files">');

    // Assert: Tag dropdown should include user tags
    expect(htmlOff).toContain('<option value="#user">');
    expect(htmlOff).toContain('<option value="#code">');
    expect(htmlOff).toContain('<option value="#test">');

    // Act: Toggle ON
    await panelInternal.handleMessage({
      command: 'toggleSystemMemories',
      showSystemMemories: true,
    });
    const htmlOn = await panelInternal.getHtmlContent();

    // Assert: Tag dropdown NOW includes generated-memory tags from local scope
    expect(htmlOn).toContain('<option value="#auto">');
    expect(htmlOn).toContain('<option value="#budget">');
    expect(htmlOn).toContain('<option value="#auto-learned">');
    expect(htmlOn).toContain('<option value="#files">');
  });

  it('should render the memory panel as a read-only view', async () => {
    const panel = MemoryPanel.createOrShow(mockExtensionUri, mockMemoryManager);
    const panelInternal = panel as unknown as {
      getHtmlContent: () => Promise<string>;
    };

    const html = await panelInternal.getHtmlContent();

    expect(html).toContain('Read-only view');
    expect(html).not.toContain('Clear All...');
    expect(html).not.toContain('Delete</button>');
    expect(html).not.toContain('Use</button>');
  });

  it('should reject mutation messages from the memory panel', async () => {
    const panel = MemoryPanel.createOrShow(mockExtensionUri, mockMemoryManager);
    const panelInternal = panel as unknown as {
      handleMessage: (message: { command: string; [key: string]: unknown }) => Promise<void>;
    };

    await panelInternal.handleMessage({ command: 'delete', id: 'u1' });
    await panelInternal.handleMessage({ command: 'recordUsage', id: 'u1' });
    await panelInternal.handleMessage({ command: 'clearScope', scope: 'all' });

    expect(mockMemoryManager.forget).not.toHaveBeenCalled();
    expect(mockMemoryManager.recordUsage).not.toHaveBeenCalled();
    expect(mockMemoryManager.clear).not.toHaveBeenCalled();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(3);
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'Gofer Memories is read-only. Use dedicated memory commands to add, forget, or clear memories.'
    );
  });
});
