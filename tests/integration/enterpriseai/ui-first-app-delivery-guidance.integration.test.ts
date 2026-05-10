import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('enterpriseai ui-first app-delivery guidance (root integration)', () => {
  it('keeps shared numbered stages while adding app-delivery-only preview and service-fit gates', () => {
    const scenarioCommand = readRepoFile('.claude/commands/0_business_scenario.md');
    const researchCommand = readRepoFile('.claude/commands/1_gofer_research.md');
    const planCommand = readRepoFile('.claude/commands/3_gofer_plan.md');
    const tasksCommand = readRepoFile('.claude/commands/4_gofer_tasks.md');
    const implementCommand = readRepoFile('.claude/commands/5_gofer_implement.md');
    const validateCommand = readRepoFile('.claude/commands/6_gofer_validate.md');

    expect(scenarioCommand).toContain('Shared Numbered Stage Contract');
    expect(scenarioCommand).toContain('UI-First App-Delivery Default');
    expect(scenarioCommand).toContain('Vertical Template');
    expect(scenarioCommand).toContain('service-fit gate');
    expect(scenarioCommand).toContain('Non-app work');

    expect(researchCommand).toContain('ui-preview-brief.md');
    expect(researchCommand).toContain('Vertical Template constraint map');
    expect(researchCommand).toContain('Preview validation plan');

    expect(planCommand).toContain('ui-review-log.md');
    expect(planCommand).toContain('ui-approval.md');
    expect(planCommand).toContain('service-fit-matrix.md');
    expect(planCommand).toContain('eai --describe');
    expect(planCommand).toContain('eai verify calls --format');

    expect(tasksCommand).toContain('App-Delivery Preconditions Inside Shared Stages');
    expect(tasksCommand).toContain('ui-approval.md');
    expect(tasksCommand).toContain('service-fit-matrix.md');
    expect(tasksCommand).toContain('Vertical Template');

    expect(implementCommand).toContain('ui-approval.md');
    expect(implementCommand).toContain('ui-review-log.md');
    expect(implementCommand).toContain('service-fit-matrix.md');
    expect(implementCommand).toContain('For non-app work, skip the preview');

    expect(validateCommand).toContain('ui-review-log.md');
    expect(validateCommand).toContain('ui-approval.md');
    expect(validateCommand).toContain('service-fit-matrix.md');
    expect(validateCommand).toContain('For explicit non-app work');
  });

  it('ships app-delivery templates for preview, approval, and service-fit artifacts', () => {
    const canonicalTemplates = [
      '.specify/templates/ui-preview-brief-template.md',
      '.specify/templates/ui-review-log-template.md',
      '.specify/templates/ui-approval-template.md',
      '.specify/templates/service-fit-matrix-template.md',
    ];
    const mirroredTemplates = canonicalTemplates.map((templatePath) =>
      templatePath.replace('.specify/templates', 'extension/resources/templates')
    );

    for (const templatePath of canonicalTemplates) {
      expect(fs.existsSync(path.join(process.cwd(), templatePath))).toBe(true);
    }

    for (const templatePath of mirroredTemplates) {
      expect(fs.existsSync(path.join(process.cwd(), templatePath))).toBe(true);
    }
  });
});
