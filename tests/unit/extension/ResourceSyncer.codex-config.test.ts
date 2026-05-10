import { describe, expect, it } from 'vitest';
import 'reflect-metadata';
import path from 'path';
import { enableManagedCodexSkillConfigEntries } from '../../../extension/src/services/migration/ResourceSyncer';

describe('ResourceSyncer Codex config repair', () => {
  it('re-enables only disabled entries owned by the current Gofer install', (): void => {
    const managedPath = path
      .resolve('/Users/example/.codex/skills/my-gofer/1_gofer_research/SKILL.md')
      .replace(/\\/g, '/');
    const unmanagedPath = path
      .resolve('/Users/example/.codex/skills/other-gofer/1_gofer_research/SKILL.md')
      .replace(/\\/g, '/');

    const input = `[[skills.config]]
path = "${managedPath}"
enabled = false

[[skills.config]]
path = "${unmanagedPath}"
enabled = false
`;

    const result = enableManagedCodexSkillConfigEntries(input, new Set([managedPath]));

    expect(result.changedEntries).toBe(1);
    expect(result.content).toContain(`path = "${managedPath}"\nenabled = true`);
    expect(result.content).toContain(`path = "${unmanagedPath}"\nenabled = false`);
  });
});
