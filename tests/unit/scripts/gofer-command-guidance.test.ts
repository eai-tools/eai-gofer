import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

describe('Gofer public execution-depth guidance', () => {
  it('documents generic risk labels across the six primary pipeline commands', () => {
    for (const file of [
      '1_gofer_research.md',
      '2_gofer_specify.md',
      '3_gofer_plan.md',
      '4_gofer_tasks.md',
      '5_gofer_implement.md',
      '6_gofer_validate.md',
    ]) {
      const content = fs.readFileSync(path.join(REPO_ROOT, '.specify/commands', file), 'utf8');
      const executionSection = content.slice(
        content.indexOf('## Execution'),
        content.indexOf('## Prerequisites') > -1
          ? content.indexOf('## Prerequisites')
          : content.indexOf('## Outline')
      );
      expect(executionSection).toContain('fast');
      expect(executionSection).toContain('standard');
      expect(executionSection).toContain('full');
      expect(executionSection).toContain('docs-only');
      expect(executionSection).toContain('artifact');
      expect(executionSection).not.toMatch(
        /\beai-stack\b|\bgas\b|\bQAgent\b|\bOPA\b|\bPayload\b|\beai-testing-dev\b/i
      );
    }
  });
});
