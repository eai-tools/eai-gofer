import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('enterpriseai eai app delivery preflight (root integration)', () => {
  it('gates EAI app delivery before journey mapping and implementation planning', () => {
    const scenarioCommand = readRepoFile('.claude/commands/0_business_scenario.md');
    const researchCommand = readRepoFile('.claude/commands/1_gofer_research.md');
    const specifyCommand = readRepoFile('.claude/commands/2_gofer_specify.md');
    const planCommand = readRepoFile('.claude/commands/3_gofer_plan.md');
    const tasksCommand = readRepoFile('.claude/commands/4_gofer_tasks.md');

    expect(scenarioCommand).toContain('EAI App Delivery Preflight');
    expect(scenarioCommand).toContain('EAI Platform And Azure App Stack Policy');
    expect(scenarioCommand).toContain('EAI Platform first, including the EAI app template');
    expect(scenarioCommand).toContain('/gofer:eai-first-run');
    expect(scenarioCommand).toContain('GitHub Codespaces');
    expect(scenarioCommand).toContain('node --version');
    expect(scenarioCommand).toContain('npm config get');
    expect(scenarioCommand).toMatch(
      /App delivery in EAI Gofer means EAI Platform\s+delivery by default/
    );
    expect(scenarioCommand).toContain('npm install -g @eai-tools/cli');
    expect(scenarioCommand).toContain('eai update --check');
    expect(scenarioCommand).toContain('eai login');
    expect(scenarioCommand).toContain('eai tenant list --format json');
    expect(scenarioCommand).toContain('eai init <app-name>');
    expect(scenarioCommand).toContain('eai vertical create <name>');
    expect(scenarioCommand).toContain('eai template check --format json');
    expect(scenarioCommand).toContain('eai gofer refresh --check');
    expect(scenarioCommand).toContain('eai resources schema --format json');
    expect(scenarioCommand).toContain('.specify/specs/{feature}/eai-preflight.md');

    expect(researchCommand).toContain('eai-preflight.md');
    expect(researchCommand).toContain('EAI preflight summary');
    expect(researchCommand).toContain('src/eai.config/object-types.ts');
    expect(researchCommand).toContain('eai blocks readiness');
    expect(researchCommand).toContain('eai resources schema --format json');
    expect(researchCommand).toContain('eai gofer refresh');
    expect(researchCommand).toContain('EAI Platform/Azure stack fit');

    expect(specifyCommand).toContain('EAI App Delivery Preflight');
    expect(specifyCommand).toContain('EAI Platform/Azure App Stack Policy');
    expect(planCommand).toContain('EAI app-readiness handoff');
    expect(planCommand).toContain('EAI Platform/Azure app stack decision');
    expect(tasksCommand).toContain('EAI readiness unblock -> `eai-preflight.md`');
    expect(tasksCommand).toContain('Do not emit tasks that establish a non-EAI primary runtime');
  });

  it('ships the EAI preflight template to canonical and mirrored resources', () => {
    const canonicalTemplate = readRepoFile('.specify/templates/eai-preflight-template.md');
    const mirroredTemplate = readRepoFile(
      'extension/resources/templates/eai-preflight-template.md'
    );

    expect(canonicalTemplate).toContain('App Stack Policy');
    expect(canonicalTemplate).toContain('eai update --check');
    expect(canonicalTemplate).toContain('eai template check --format json');
    expect(canonicalTemplate).toContain('eai gofer refresh --check --format json');
    expect(canonicalTemplate).toContain('eai resources schema --format json');
    expect(canonicalTemplate).toContain('Project drift status');
    expect(mirroredTemplate).toContain('App Stack Policy');
    expect(mirroredTemplate).toContain('Project drift status');
  });
});
