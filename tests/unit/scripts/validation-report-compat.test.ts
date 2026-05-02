import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const VALIDATE_COMMAND_PATH = path.join(REPO_ROOT, '.specify', 'commands', '6_gofer_validate.md');

describe('validation report compatibility', () => {
  let command: string;

  beforeAll(() => {
    command = fs.readFileSync(VALIDATE_COMMAND_PATH, 'utf8');
  });

  it('persists the 110-point validation report frontmatter contract', () => {
    expect(command).toContain('score_max: 110');
    expect(command).toContain('deploy_in_scope: [true/false]');
    expect(command).toContain('blast_radius_report: blast-radius-report.md');
    expect(command).toContain('GeneratedAt: [ISO timestamp]');
    expect(command).toContain('SourceCommandId: /6_gofer_validate');
    expect(command).toContain(
      'SourceInputs: [spec.md, plan.md, tasks.md, research.md, automated checks, agent findings]'
    );
    expect(command).toContain('OverwriteNoticeWhenApplicable: [new file or overwrite note]');
  });

  it('requires the evidence table on pass and fail runs', () => {
    expect(command).toContain('## Evidence Table');
    expect(command).toContain(
      '| Category | Score | Evidence Artifact / Command Output | Absent / Reason for 0 |'
    );
    expect(command).toContain('This evidence table is required on **EVERY run (PASS and FAIL)**.');
  });

  it('keeps the evidence-table rows needed for compatibility and blast-radius proof', () => {
    expect(command).toContain('| 1 — Functional Correctness |');
    expect(command).toContain('| 3 — UI/E2E Verification |');
    expect(command).toContain('| 11 — Blast Radius Containment | [0/10] | [blast-radius-report.md reference] |');
    expect(command).toContain("Category 11's evidence cell MUST cite `blast-radius-report.md`.");
  });

  it('updates remediation and escalation scoring to the 110-point scale', () => {
    expect(command).toContain('When validation fails (score < score_max)');
    expect(command).toContain('score_max: 110');
    expect(command).toContain('**Score**: [N]/110 **Status**: FAIL — Remediation Required');
    expect(command).toContain('final_score: [N]/110');
  });
});
