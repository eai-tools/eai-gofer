/**
 * T169 — Validates codex-config.toml (at repo root) shape.
 *
 *   1. Is valid TOML (basic syntax: balanced brackets, key=value format)
 *   2. Contains [[skills.config]] blocks
 *   3. Has 11 entries (one per non-claude-only stage)
 *   4. Each entry has `name = "gofer/<stage>"` and `enabled = true`
 *   5. NEVER mentions `skills_context_budget_percent` (Hard Invariant 2)
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'codex-config.toml');

const NON_CLAUDE_ONLY_STAGES = [
  '0a_problem_validation',
  '1_gofer_research',
  '2_gofer_specify',
  '3_gofer_plan',
  '4_gofer_tasks',
  '5_gofer_implement',
  '6_gofer_validate',
  '6a_gofer_engineering_review',
  '7a_stakeholder_comms',
  '9_gofer_tests',
  '10_gofer_cloud',
];

const CLAUDE_ONLY_STAGES = [
  '0_business_scenario',
  'gofer_constitution',
  'gofer_hydrate',
  '7_gofer_save',
  '8_gofer_resume',
];

describe('codex-config.toml shape (T169)', () => {
  it('codex-config.toml exists at repo root', (): void => {
    expect(fs.existsSync(CONFIG_PATH)).toBe(true);
  });

  it('basic TOML syntax — non-comment lines are key=value or [[table]]', (): void => {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    for (const raw of content.split('\n')) {
      const line = raw.trim();
      if (line === '' || line.startsWith('#')) continue;
      // Either an array-of-tables header `[[...]]` OR a key=value pair.
      const isHeader = /^\[\[[a-zA-Z0-9_.-]+\]\]$/.test(line);
      const isKeyValue = /^[a-zA-Z0-9_.-]+\s*=\s*.+$/.test(line);
      expect(isHeader || isKeyValue, `line is not valid TOML: "${line}"`).toBe(true);
    }
  });

  it('contains [[skills.config]] blocks', (): void => {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    expect(content).toContain('[[skills.config]]');
  });

  it('has exactly 11 [[skills.config]] entries', (): void => {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    const matches = content.match(/^\[\[skills\.config\]\]/gm) || [];
    expect(matches.length).toBe(11);
  });

  it('every non-claude-only stage has an enabled = true entry', (): void => {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    for (const stage of NON_CLAUDE_ONLY_STAGES) {
      const re = new RegExp(
        `\\[\\[skills\\.config\\]\\][\\s\\S]*?name\\s*=\\s*"gofer/${stage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[\\s\\S]*?enabled\\s*=\\s*true`,
        'm'
      );
      expect(re.test(content), `expected enabled=true entry for gofer/${stage}`).toBe(true);
    }
  });

  it('CLAUDE_ONLY_STAGES are NOT referenced as gofer/<stage>', (): void => {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    for (const stage of CLAUDE_ONLY_STAGES) {
      const re = new RegExp(`name\\s*=\\s*"gofer/${stage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
      expect(
        re.test(content),
        `claude-only stage '${stage}' must NOT appear in codex-config.toml`
      ).toBe(false);
    }
  });

  it('NEVER references skills_context_budget_percent (Hard Invariant 2)', (): void => {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    expect(content).not.toContain('skills_context_budget_percent');
  });
});
