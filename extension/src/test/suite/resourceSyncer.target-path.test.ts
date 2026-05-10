import * as assert from 'assert';
import * as path from 'path';
import { resolveResourceTargetPath } from '../../services/migration/ResourceSyncer';

suite('ResourceSyncer target path resolution', (): void => {
  test('keeps relative targets under .specify', (): void => {
    const specifyPath = path.join('/workspace', 'repo', '.specify');
    const resolvedTarget = resolveResourceTargetPath(specifyPath, 'templates');

    assert.strictEqual(resolvedTarget, path.join(specifyPath, 'templates'));
  });

  test('preserves posix absolute target paths', (): void => {
    const specifyPath = '/workspace/repo/.specify';
    const posixAbsoluteTarget = '/workspace/repo/.claude/commands';
    const resolvedTarget = resolveResourceTargetPath(specifyPath, posixAbsoluteTarget);

    assert.strictEqual(resolvedTarget, posixAbsoluteTarget);
  });

  test('preserves windows drive-letter absolute target paths', (): void => {
    const specifyPath = '/workspace/repo/.specify';
    const windowsAbsoluteTarget = 'C:\\Users\\dougl\\repo\\.claude\\commands';
    const resolvedTarget = resolveResourceTargetPath(specifyPath, windowsAbsoluteTarget);

    assert.strictEqual(resolvedTarget, windowsAbsoluteTarget);
  });

  test('preserves windows UNC absolute target paths', (): void => {
    const specifyPath = '/workspace/repo/.specify';
    const windowsUncTarget = '\\\\server\\share\\repo\\.github\\prompts';
    const resolvedTarget = resolveResourceTargetPath(specifyPath, windowsUncTarget);

    assert.strictEqual(resolvedTarget, windowsUncTarget);
  });
});
