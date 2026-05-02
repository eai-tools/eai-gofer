import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const VALIDATE_COMMAND_PATH = path.join(REPO_ROOT, '.specify', 'commands', '6_gofer_validate.md');

describe('validation evidence gates', () => {
  let command: string;

  beforeAll(() => {
    command = fs.readFileSync(VALIDATE_COMMAND_PATH, 'utf8');
  });

  it('defines deployment scope detection before evidence gating', () => {
    expect(command).toContain('DEPLOY_SIGNAL_1');
    expect(command).toContain('DEPLOY_SIGNAL_2');
    expect(command).toContain('DEPLOY_SIGNAL_3');
    expect(command).toContain('DEPLOY_IN_SCOPE');
  });

  it('defines the evidence gate pre-check with all required gates', () => {
    expect(command).toContain('## Step 2.2: Evidence Gate Pre-Check');
    expect(command).toContain('GATE-1');
    expect(command).toContain('GATE-2');
    expect(command).toContain('GATE-3');
  });

  it('requires honest zero scoring when evidence is absent or implied', () => {
    expect(command).toContain('If an agent reports `EVIDENCE ABSENT:`');
    expect(command).toContain(
      'evidence is absent, unverifiable, fabricated, or implied scores exactly 0'
    );
    expect(command).toContain('mark GATE_FAIL = true');
  });

  it('separates no-ui redistribution from non-deploy-scoped UI verification', () => {
    expect(command).toContain('IF HAS_UI = false');
    expect(command).toContain('N/A — HAS_UI=false');
    expect(command).toContain('IF HAS_UI = true AND DEPLOY_IN_SCOPE = false');
    expect(command).toContain('local render proof');
    expect(command).toContain('Render proof only — deployment target not in scope');
    expect(command).toContain('do not redistribute Category 3 points');
  });
});
