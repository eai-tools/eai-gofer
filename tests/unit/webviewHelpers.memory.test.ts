import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVscode = vi.hoisted(() => ({
  executeCommand: vi.fn(),
  showErrorMessage: vi.fn(),
  showTextDocument: vi.fn(),
  openTextDocument: vi.fn(),
  stat: vi.fn(),
  markdownViewer: 'preview',
}));

const mockSharedMemoryManager = vi.hoisted(() => ({
  ensureMarkdownNote: vi.fn(),
}));

vi.mock('vscode', () => ({
  commands: {
    executeCommand: mockVscode.executeCommand,
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    getConfiguration: vi.fn(() => ({
      get: vi.fn(() => mockVscode.markdownViewer),
    })),
    fs: {
      stat: mockVscode.stat,
    },
    openTextDocument: mockVscode.openTextDocument,
  },
  window: {
    activeTextEditor: undefined,
    showErrorMessage: mockVscode.showErrorMessage,
    showTextDocument: mockVscode.showTextDocument,
  },
  Uri: {
    file: (fsPath: string) => ({ fsPath, scheme: 'file' }),
  },
  ViewColumn: {
    One: 1,
  },
}));

vi.mock('../../extension/src/autonomousCommands', () => ({
  getSharedMemoryManager: () => mockSharedMemoryManager,
}));

import {
  showArticleDetailsWebview,
  showMemoryDocumentWebview,
  showMemorySectionWebview,
} from '../../extension/src/webviewHelpers';

describe('webviewHelpers memory rendering', () => {
  beforeEach(() => {
    mockVscode.executeCommand.mockReset();
    mockVscode.showErrorMessage.mockReset();
    mockVscode.showTextDocument.mockReset();
    mockVscode.openTextDocument.mockReset();
    mockVscode.stat.mockReset();
    mockVscode.markdownViewer = 'preview';
    mockSharedMemoryManager.ensureMarkdownNote.mockReset();
  });

  it('opens constitution in the configured markdown editor when one is set', async () => {
    mockVscode.markdownViewer = 'mark-sharp';
    mockVscode.openTextDocument.mockResolvedValue({
      uri: { fsPath: '/test/workspace/.specify/memory/constitution.md' },
    });

    await showArticleDetailsWebview({} as never, {
      number: 1,
      title: 'Test Constitution',
    });

    expect(mockVscode.showTextDocument).toHaveBeenCalledTimes(1);
    expect(mockVscode.executeCommand).toHaveBeenCalledWith('mark-sharp.switch-editor-mode');
  });

  it('opens inline memory content through a markdown note in an editor', async () => {
    mockSharedMemoryManager.ensureMarkdownNote.mockResolvedValue(
      '/test/workspace/.specify/memory/memory-notes/mem-1.md'
    );
    mockVscode.openTextDocument.mockResolvedValue({
      uri: { fsPath: '/test/workspace/.specify/memory/memory-notes/mem-1.md' },
    });

    await showMemoryDocumentWebview({} as never, {
      id: 'mem-1',
      category: 'pattern',
      content: 'Read-only memory content',
      created: 1700000000000,
      tags: ['#test'],
      usedCount: 2,
      learnedFrom: 'user_interaction',
    });

    expect(mockSharedMemoryManager.ensureMarkdownNote).toHaveBeenCalledWith('mem-1');
    expect(mockVscode.openTextDocument).toHaveBeenCalledWith({
      fsPath: '/test/workspace/.specify/memory/memory-notes/mem-1.md',
      scheme: 'file',
    });
    expect(mockVscode.showTextDocument).toHaveBeenCalledTimes(1);
    expect(mockVscode.executeCommand).not.toHaveBeenCalledWith(
      'markdown.showPreview',
      expect.anything()
    );
  });

  it('opens file-backed decisions in an editor instead of markdown preview', async () => {
    mockVscode.openTextDocument.mockResolvedValue({
      uri: { fsPath: '/test/workspace/.specify/memory/decisions/001-real-decision.md' },
    });

    await showMemoryDocumentWebview({} as never, {
      path: '/test/workspace/.specify/memory/decisions/001-real-decision.md',
    });

    expect(mockVscode.executeCommand).not.toHaveBeenCalledWith('markdown.showPreview', {
      fsPath: '/test/workspace/.specify/memory/decisions/001-real-decision.md',
      scheme: 'file',
    });
    expect(mockVscode.showTextDocument).toHaveBeenCalledTimes(1);
  });

  it('opens memory sections in an editor', async () => {
    mockVscode.openTextDocument.mockResolvedValue({
      uri: { fsPath: '/test/workspace/.specify/memory/decisions/001-real-decision.md' },
    });

    await showMemorySectionWebview(
      {} as never,
      {
        title: 'Decision Notes',
        line: 14,
        content: 'Section content stays read-only.',
      },
      {
        path: '/test/workspace/.specify/memory/decisions/001-real-decision.md',
      }
    );

    expect(mockVscode.showTextDocument).toHaveBeenCalledTimes(1);
  });
});
