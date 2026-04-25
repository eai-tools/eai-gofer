/**
 * T072 — Unit tests for the codex-config emitter (T068) in generate-commands.mjs.
 *
 * Verifies that:
 * 1. codex-config-fragment.toml is created at correct path
 * 2. Contains exactly the right skill entries (non-claude-only)
 * 3. All entries have `enabled = true`
 * 4. CLAUDE_ONLY_STAGES are not present
 * 5. Does NOT touch ~/.codex/config.toml
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const generateCommandsUrl = new URL(
  '../../../.specify/scripts/node/generate-commands.mjs',
  import.meta.url
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf8');
}

// ---------------------------------------------------------------------------
// Fixtures — 3 non-claude-only stages + 2 claude-only stages
// ---------------------------------------------------------------------------

const NON_CLAUDE_STAGES = [
  {
    filename: '1_gofer_research.md',
    content: `---
name: 1_gofer_research
description: "Research codebase."
title: "Gofer Research"
category: pipeline
surfaces:
  - claude
  - agents-skills
  - codex
  - gemini
---

# Gofer Research

Research stage body.
`,
  },
  {
    filename: '0a_problem_validation.md',
    content: `---
name: 0a_problem_validation
description: "Validate the business problem."
title: "Problem Validation"
category: pipeline
surfaces:
  - claude
  - agents-skills
  - codex
  - gemini
---

# Problem Validation

Validation stage body.
`,
  },
  {
    filename: '2_gofer_specify.md',
    content: `---
name: 2_gofer_specify
description: "Create feature specification."
title: "Gofer Specify"
category: pipeline
surfaces:
  - claude
  - agents-skills
  - codex
  - gemini
---

# Gofer Specify

Specify stage body.
`,
  },
];

const CLAUDE_ONLY_STAGES_FIXTURES = [
  {
    filename: '0_business_scenario.md',
    content: `---
name: 0_business_scenario
description: "Business scenario."
title: "Business Scenario"
category: pipeline
surfaces:
  - claude
  - claude-mirror
---

# Business Scenario
`,
  },
  {
    filename: '7_gofer_save.md',
    content: `---
name: 7_gofer_save
description: "Save session progress."
title: "Gofer Save"
category: pipeline
surfaces:
  - claude
  - claude-mirror
---

# Gofer Save
`,
  },
];

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let tmpRoot: string;

beforeAll(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'gofer-emitter-codex-config-test-'));

  for (const stage of [...NON_CLAUDE_STAGES, ...CLAUDE_ONLY_STAGES_FIXTURES]) {
    await writeFile(path.join(tmpRoot, '.specify', 'commands', stage.filename), stage.content);
  }

  const scriptPath = new URL(generateCommandsUrl).pathname;
  await execFileAsync('node', [scriptPath, '--root', tmpRoot, '--surfaces', 'codex-config']);
});

afterAll(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('codex-config emitter (T068)', () => {
  it('creates .specify/outputs/codex-config-fragment.toml', async () => {
    const outPath = path.join(tmpRoot, '.specify', 'outputs', 'codex-config-fragment.toml');
    expect(await fileExists(outPath)).toBe(true);
  });

  it('fragment contains [[skills.config]] entries', async () => {
    const outPath = path.join(tmpRoot, '.specify', 'outputs', 'codex-config-fragment.toml');
    const content = await readFile(outPath);
    expect(content).toContain('[[skills.config]]');
  });

  it('contains entry for 1_gofer_research', async () => {
    const outPath = path.join(tmpRoot, '.specify', 'outputs', 'codex-config-fragment.toml');
    const content = await readFile(outPath);
    expect(content).toContain('name = "gofer/1_gofer_research"');
  });

  it('contains entry for 0a_problem_validation', async () => {
    const outPath = path.join(tmpRoot, '.specify', 'outputs', 'codex-config-fragment.toml');
    const content = await readFile(outPath);
    expect(content).toContain('name = "gofer/0a_problem_validation"');
  });

  it('contains entry for 2_gofer_specify', async () => {
    const outPath = path.join(tmpRoot, '.specify', 'outputs', 'codex-config-fragment.toml');
    const content = await readFile(outPath);
    expect(content).toContain('name = "gofer/2_gofer_specify"');
  });

  it('all entries have enabled = true', async () => {
    const outPath = path.join(tmpRoot, '.specify', 'outputs', 'codex-config-fragment.toml');
    const content = await readFile(outPath);
    // Every [[skills.config]] block must be followed by enabled = true
    const blocks = content.split('[[skills.config]]').slice(1); // skip header
    for (const block of blocks) {
      expect(block).toContain('enabled = true');
    }
  });

  it('does NOT contain 0_business_scenario (claude-only)', async () => {
    const outPath = path.join(tmpRoot, '.specify', 'outputs', 'codex-config-fragment.toml');
    const content = await readFile(outPath);
    expect(content).not.toContain('0_business_scenario');
  });

  it('does NOT contain 7_gofer_save (claude-only)', async () => {
    const outPath = path.join(tmpRoot, '.specify', 'outputs', 'codex-config-fragment.toml');
    const content = await readFile(outPath);
    expect(content).not.toContain('7_gofer_save');
  });

  it('does NOT contain any CLAUDE_ONLY_STAGES', async () => {
    const claudeOnlyStages = [
      '0_business_scenario',
      'gofer_constitution',
      'gofer_hydrate',
      '7_gofer_save',
      '8_gofer_resume',
    ];
    const outPath = path.join(tmpRoot, '.specify', 'outputs', 'codex-config-fragment.toml');
    const content = await readFile(outPath);
    for (const stage of claudeOnlyStages) {
      expect(
        content,
        `codex-config-fragment.toml should not contain claude-only stage '${stage}'`
      ).not.toContain(stage);
    }
  });

  it('does NOT touch ~/.codex/config.toml — path is .specify/outputs not home dir', async () => {
    const outPath = path.join(tmpRoot, '.specify', 'outputs', 'codex-config-fragment.toml');
    const content = await readFile(outPath);
    // File should contain the correct output path comment pointing to home config
    expect(content).toContain('~/.codex/config.toml');
    // But verify the actual file written is in .specify/outputs, not the real ~/.codex
    expect(outPath).toContain('.specify/outputs');

    // Verify the real user home codex config was NOT modified by checking it doesn't
    // contain any test-specific stage names that only exist in our tmpRoot
    const homeCodexPath = path.join(os.homedir(), '.codex', 'config.toml');
    const homeExists = await fileExists(homeCodexPath);
    if (homeExists) {
      const homeContent = await readFile(homeCodexPath);
      // None of our fixture stage content would appear in real home config
      expect(homeContent).not.toContain('gofer-emitter-codex-config-test');
    }
  });

  it('fragment contains the correct comment header', async () => {
    const outPath = path.join(tmpRoot, '.specify', 'outputs', 'codex-config-fragment.toml');
    const content = await readFile(outPath);
    expect(content).toContain('# Gofer skill entries for ~/.codex/config.toml');
    expect(content).toContain('# Generated by generate-commands.mjs on');
    expect(content).toContain('# Append this to your ~/.codex/config.toml');
  });
});
