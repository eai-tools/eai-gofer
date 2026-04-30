import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import { existsSync } from 'fs';

const COMMANDS_DIR = path.resolve(__dirname, '../../../.specify/commands');

const parseModuleUrl = new URL(
  '../../../.specify/scripts/node/parse-stage-command.mjs',
  import.meta.url
);

interface ParseResult {
  frontmatter: Record<string, unknown>;
  body: string;
}

const CONTROL_COMMANDS = ['gofer_plan.md', 'gofer_side.md', 'gofer_personality.md'];

const EXPECTED_SURFACES = [
  'claude',
  'claude-mirror',
  'copilot',
  'vscode',
  'codex',
  'gemini',
  'github-prompts',
  'agents-skills',
  'system-skills',
];

describe('control commands — surfaces and category', () => {
  let parseStageCommand: (filePath: string) => Promise<ParseResult>;

  beforeAll(async () => {
    const mod = await import(parseModuleUrl.href);
    parseStageCommand = mod.parseStageCommand;
  });

  it('all three control-command files exist on disk', () => {
    for (const file of CONTROL_COMMANDS) {
      const filePath = path.join(COMMANDS_DIR, file);
      expect(existsSync(filePath), `${file} should exist`).toBe(true);
    }
  });

  for (const file of CONTROL_COMMANDS) {
    describe(file, () => {
      it('has all cross-CLI surfaces', async () => {
        const filePath = path.join(COMMANDS_DIR, file);
        const { frontmatter } = await parseStageCommand(filePath);

        const surfaces = frontmatter.surfaces as string[];
        expect(Array.isArray(surfaces)).toBe(true);

        // Same set, no extras, no missing
        const sortedActual = [...surfaces].sort();
        const sortedExpected = [...EXPECTED_SURFACES].sort();
        expect(sortedActual).toEqual(sortedExpected);

        expect(surfaces.length).toBe(EXPECTED_SURFACES.length);
      });

      it('has category=control', async () => {
        const filePath = path.join(COMMANDS_DIR, file);
        const { frontmatter } = await parseStageCommand(filePath);
        expect(frontmatter.category).toBe('control');
      });
    });
  }
});
