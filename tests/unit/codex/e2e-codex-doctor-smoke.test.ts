/**
 * T161 — End-to-end smoke test for `gofer codex doctor` (codex-doctor.mjs).
 *
 * Builds a polluted skill-tree fixture (one canonical bundle + one duplicate)
 * inline, runs codex-doctor against it, and asserts:
 *   1. It detects duplicates and lists them
 *   2. Exit code reflects state (0 healthy, 1 over-budget, 2 undisabled duplicates)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { CANONICAL_DESCRIPTION_NAMES } from '../../helpers/goferCommandSet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DOCTOR_PATH = path.join(REPO_ROOT, '.specify', 'scripts', 'node', 'codex-doctor.mjs');

const CANONICAL_GOFER_STAGES = [...CANONICAL_DESCRIPTION_NAMES];

function buildSkillMd(name: string): string {
  return `---\nname: ${name}\ndescription: smoke fixture for ${name}\n---\n\nbody.\n`;
}

let fixtureRoot: string;

beforeAll((): void => {
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-doctor-smoke-'));
  // Two duplicate Gofer bundles — both undisabled.
  for (const tenant of ['tenant-a', 'tenant-b']) {
    const goferDir = path.join(fixtureRoot, tenant, 'gofer');
    for (const stage of CANONICAL_GOFER_STAGES) {
      const stageDir = path.join(goferDir, stage);
      fs.mkdirSync(stageDir, { recursive: true });
      fs.writeFileSync(path.join(stageDir, 'SKILL.md'), buildSkillMd(stage));
    }
  }
});

afterAll((): void => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});

describe('codex doctor e2e smoke (T161)', () => {
  it('exits with non-zero code when undisabled duplicates exist', (): void => {
    let exitCode = 0;
    let stdout = '';
    try {
      stdout = execFileSync('node', [DOCTOR_PATH, '--root', fixtureRoot, '--format', 'json'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8',
      });
    } catch (err) {
      const e = err as { status: number; stdout: Buffer | string };
      exitCode = e.status;
      stdout = typeof e.stdout === 'string' ? e.stdout : (e.stdout?.toString() ?? '');
    }
    // Per cli-commands.md §2.1: exit code 2 = undisabled duplicates present.
    expect(exitCode).toBe(2);
    const report = JSON.parse(stdout);
    expect(report.goferBundles.length).toBe(2);
    const duplicates = report.goferBundles.filter((b: { isDuplicate: boolean }) => b.isDuplicate);
    expect(duplicates.length).toBe(1);
  });

  it('reports duplicate bundle paths in suggestedConfig', (): void => {
    let stdout = '';
    try {
      stdout = execFileSync('node', [DOCTOR_PATH, '--root', fixtureRoot, '--format', 'json'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8',
      });
    } catch (err) {
      const e = err as { stdout: Buffer | string };
      stdout = typeof e.stdout === 'string' ? e.stdout : (e.stdout?.toString() ?? '');
    }
    const report = JSON.parse(stdout);
    expect(report.suggestedConfig).toContain('[[skills.config]]');
    expect(report.suggestedConfig).toContain('enabled = false');
  });

  it('exits 0 when scan root has no duplicates (single canonical bundle)', (): void => {
    const cleanRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-doctor-clean-'));
    try {
      const goferDir = path.join(cleanRoot, 'tenant-only', 'gofer');
      for (const stage of CANONICAL_GOFER_STAGES) {
        const stageDir = path.join(goferDir, stage);
        fs.mkdirSync(stageDir, { recursive: true });
        fs.writeFileSync(path.join(stageDir, 'SKILL.md'), buildSkillMd(stage));
      }
      const stdout = execFileSync('node', [DOCTOR_PATH, '--root', cleanRoot, '--format', 'json'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8',
      });
      const report = JSON.parse(stdout);
      expect(report.goferBundles.length).toBe(1);
      expect(report.warnings.length).toBe(0);
    } finally {
      fs.rmSync(cleanRoot, { recursive: true, force: true });
    }
  });

  it('exits 4 when scan root is missing', (): void => {
    let exitCode = 0;
    const missingRoot = path.join(os.tmpdir(), `nonexistent-${Date.now()}`);
    try {
      execFileSync('node', [DOCTOR_PATH, '--root', missingRoot, '--format', 'json'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8',
      });
    } catch (err) {
      exitCode = (err as { status: number }).status;
    }
    expect(exitCode).toBe(4);
  });
});
