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
  let allMemories: Memory[];

  beforeEach(() => {
    // Create test data: 5 user memories + 5 system memories
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

    allMemories = [...userMemories, ...systemMemories];

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
  it('should filter out system memories when toggle is OFF (default)', async () => {
    // Arrange: Create panel with default state (toggle OFF)
    const panel = MemoryPanel.createOrShow(mockExtensionUri, mockMemoryManager);

    // Act: Get the HTML content (internally calls getHtmlContent)
    // Panel is created with showSystemMemories = false by default
    const panelInternal = panel as unknown as {
      getHtmlContent: () => Promise<string>;
      showSystemMemories: boolean;
    };
    const html = await panelInternal.getHtmlContent();

    // Assert: HTML should NOT contain system memory IDs (s1-s5)
    expect(panelInternal.showSystemMemories).toBe(false);
    expect(html).not.toContain('System memory 1');
    expect(html).not.toContain('System memory 2');
    expect(html).not.toContain('auto_decision');
    expect(html).not.toContain('discovery');

    // Assert: HTML should contain user memory content
    expect(html).toContain('User memory 1');
    expect(html).toContain('User memory 2');
    expect(html).toContain('pattern');
    expect(html).toContain('gotcha');

    // Assert: Results count shows only user memories (5 of 10)
    expect(html).toContain('5 memories');
  });

  // T025: Toggle ON includes all memories
  it('should include all memories when toggle is ON', async () => {
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

    // Assert: HTML contains BOTH user and system memories
    expect(html).toContain('User memory 1');
    expect(html).toContain('System memory 1');
    expect(html).toContain('pattern');
    expect(html).toContain('auto_decision');
    expect(html).toContain('discovery');

    // Assert: Results count shows all memories (10 total)
    expect(html).toContain('10 memories');

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
    expect(htmlOff).toContain('<option value="decision">');

    // Act: Toggle ON
    await panelInternal.handleMessage({
      command: 'toggleSystemMemories',
      showSystemMemories: true,
    });
    const htmlOn = await panelInternal.getHtmlContent();

    // Assert: Category dropdown NOW includes system categories
    expect(htmlOn).toContain('<option value="auto_decision">');
    expect(htmlOn).toContain('<option value="discovery">');
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

    // Assert: Tag dropdown should NOT include #auto tag (check for <option> tags)
    expect(htmlOff).not.toContain('<option value="#auto">');
    expect(htmlOff).not.toContain('<option value="#budget">');
    expect(htmlOff).not.toContain('<option value="#scope">');

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

    // Assert: Tag dropdown NOW includes #auto tag
    expect(htmlOn).toContain('<option value="#auto">');
    expect(htmlOn).toContain('<option value="#budget">');
    expect(htmlOn).toContain('<option value="#scope">');
  });
});
