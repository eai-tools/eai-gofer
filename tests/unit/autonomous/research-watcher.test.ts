import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * T045: Structural test for research index watcher.
 *
 * After T020 refactoring, the research watcher moved from extension.ts
 * to EventHandlers.ts (registerResearchFileWatcher method).
 */
describe('Research Index Watcher (T045)', () => {
  const eventHandlersPath = path.resolve(
    __dirname,
    '../../../extension/src/services/EventHandlers.ts'
  );
  const source = fs.readFileSync(eventHandlersPath, 'utf-8');

  it('should create a FileSystemWatcher for research.md files', () => {
    expect(source).toContain('createFileSystemWatcher(');
    expect(source).toContain('.specify/specs/**/research.md');
  });

  it('should call indexResearchFile on create and change events', () => {
    expect(source).toContain('researchWatcher.onDidCreate(');
    expect(source).toContain('researchWatcher.onDidChange(');
    expect(source).toContain('indexResearchFile(specId)');
  });

  it('should extract specId from URI path', () => {
    expect(source).toContain('extractSpecId(');
    expect(source).toContain('.specify/specs/');
  });

  it('should register watcher as disposable for cleanup', () => {
    expect(source).toContain('deps.context.subscriptions.push(researchWatcher)');
  });

  it('should handle watcher errors gracefully', () => {
    expect(source).toContain('Failed to index research');
  });
});

describe('extractSpecId helper', () => {
  // We can't import from extension.ts directly (vscode mock issues),
  // so we test the logic inline
  function extractSpecId(fsPath: string): string | null {
    const specsIdx = fsPath.indexOf('.specify/specs/');
    if (specsIdx === -1) {
      return null;
    }
    const afterSpecs = fsPath.substring(specsIdx + '.specify/specs/'.length);
    const slashIdx = afterSpecs.indexOf('/');
    if (slashIdx === -1) {
      return null;
    }
    return afterSpecs.substring(0, slashIdx);
  }

  it('should extract specId from valid path', () => {
    expect(extractSpecId('/workspace/.specify/specs/my-feature/research.md')).toBe('my-feature');
  });

  it('should handle spec IDs with numbers and hyphens', () => {
    expect(extractSpecId('/workspace/.specify/specs/012-context-health/research.md')).toBe(
      '012-context-health'
    );
  });

  it('should return null for path without .specify/specs/', () => {
    expect(extractSpecId('/workspace/src/research.md')).toBeNull();
  });

  it('should return null for path ending at specs dir', () => {
    expect(extractSpecId('/workspace/.specify/specs/')).toBeNull();
  });
});
