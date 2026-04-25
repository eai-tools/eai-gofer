import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';

const COMMANDS_DIR = path.resolve(__dirname, '../../../.specify/commands');

const moduleUrl = new URL(
  '../../../.specify/scripts/node/lib/validate-aliases.mjs',
  import.meta.url
);

interface Stage {
  filePath: string;
  name: string;
  aliases: string[];
}

interface Conflict {
  alias: string;
  owners: string[];
}

interface ValidationResult {
  ok: boolean;
  conflicts: Conflict[];
}

describe('validateAliases', () => {
  let loadStages: (dir: string) => Promise<Stage[]>;
  let validateAliases: (stages: Stage[]) => ValidationResult;

  beforeAll(async () => {
    const mod = await import(moduleUrl.href);
    loadStages = mod.loadStages;
    validateAliases = mod.validateAliases;
  });

  it('returns ok=true for the 19 source-of-truth files (16 stages + 3 control commands)', async () => {
    const stages = await loadStages(COMMANDS_DIR);
    expect(stages.length).toBe(19);

    const result = validateAliases(stages);
    if (!result.ok) {
      // Helpful failure output
      console.error('Conflicts detected:', JSON.stringify(result.conflicts, null, 2));
    }
    expect(result.ok).toBe(true);
    expect(result.conflicts).toEqual([]);
  });

  it('detects conflicts when two stages claim the same alias', () => {
    const synthetic: Stage[] = [
      { filePath: '/fake/a.md', name: 'a', aliases: ['gofer:dup'] },
      { filePath: '/fake/b.md', name: 'b', aliases: ['gofer:dup'] },
    ];
    const result = validateAliases(synthetic);
    expect(result.ok).toBe(false);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].alias).toBe('gofer:dup');
    expect(result.conflicts[0].owners).toEqual(['/fake/a.md', '/fake/b.md']);
  });

  it('detects conflicts when one stage uses another stage name as alias', () => {
    const synthetic: Stage[] = [
      { filePath: '/fake/a.md', name: 'shared', aliases: [] },
      { filePath: '/fake/b.md', name: 'b', aliases: ['shared'] },
    ];
    const result = validateAliases(synthetic);
    expect(result.ok).toBe(false);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].alias).toBe('shared');
  });

  it('returns ok=true for stages with empty alias arrays', () => {
    const synthetic: Stage[] = [
      { filePath: '/fake/a.md', name: 'a', aliases: [] },
      { filePath: '/fake/b.md', name: 'b', aliases: [] },
    ];
    const result = validateAliases(synthetic);
    expect(result.ok).toBe(true);
    expect(result.conflicts).toEqual([]);
  });

  it('confirms gofer:plan is owned by gofer_plan.md (control), not 3_gofer_plan.md', async () => {
    const stages = await loadStages(COMMANDS_DIR);

    const planControl = stages.find((s) => s.filePath.endsWith(path.sep + 'gofer_plan.md'));
    const planStage = stages.find((s) => s.filePath.endsWith(path.sep + '3_gofer_plan.md'));

    expect(planControl).toBeDefined();
    expect(planStage).toBeDefined();

    // gofer:plan is the *name* of the control command
    expect(planControl!.name).toBe('gofer:plan');

    // 3_gofer_plan does NOT claim gofer:plan in its aliases — it owns gofer:plan-stage
    expect(planStage!.aliases).toContain('gofer:plan-stage');
    expect(planStage!.aliases).not.toContain('gofer:plan');
  });
});
