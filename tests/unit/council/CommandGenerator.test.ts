import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandGenerator } from '../../../extension/src/council/CommandGenerator';
import type { CommandMetadata } from '../../../extension/src/council/types/CrossPlatformTypes';
import * as fs from 'fs';

vi.mock('fs', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      access: vi.fn(),
      readdir: vi.fn(),
      mkdir: vi.fn(),
      writeFile: vi.fn(),
    },
  };
});

describe('CommandGenerator', () => {
  let generator: CommandGenerator;
  const workspacePath = '/test/workspace';

  const sampleMetadata: CommandMetadata = {
    name: '1_gofer_research',
    description: 'Research stage',
    platform: 'claude',
    filePath: '/test/workspace/.claude/commands/1_gofer_research.md',
    frontmatter: { description: 'Research stage' },
    content: `
# Gofer Research

Run /2_gofer_specify after this stage.
Skill tool invocation by calling the Skill tool with skill="2_gofer_specify"
Task: subagent_type="validation-correctness"
`,
    supportsAutoChain: true,
    supportsParallelAgents: true,
    invocationSyntax: {
      platform: 'claude',
      prefix: '/',
      example: '/1_gofer_research',
      pattern: '^/1_gofer_research(\\s+.*)?$',
      supportsArguments: true,
      argumentFormat: 'space-separated after command',
    },
    extractedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new CommandGenerator(workspacePath);
  });

  describe('transformContent', () => {
    it('transforms claude command syntax to codex syntax', () => {
      const transformed = generator.transformContent(sampleMetadata.content, 'claude', 'codex');
      expect(transformed).toContain('$ $2_gofer_specify');
      expect(transformed).not.toContain('/2_gofer_specify');
    });

    it('transforms claude command syntax to copilot syntax', () => {
      const transformed = generator.transformContent(sampleMetadata.content, 'claude', 'copilot');
      expect(transformed).toContain('#2_gofer_specify');
      expect(transformed).not.toContain('/2_gofer_specify');
    });

    it('transforms stage commands with alpha suffixes (for example 6a)', () => {
      const content = 'Run /6a_gofer_engineering_review after validation.';

      const codexTransformed = generator.transformContent(content, 'claude', 'codex');
      expect(codexTransformed).toContain('$ $6a_gofer_engineering_review');
      expect(codexTransformed).not.toContain('/6a_gofer_engineering_review');

      const copilotTransformed = generator.transformContent(content, 'claude', 'copilot');
      expect(copilotTransformed).toContain('#6a_gofer_engineering_review');
      expect(copilotTransformed).not.toContain('/6a_gofer_engineering_review');
    });

    it('converts task tool mentions for codex', () => {
      const transformed = generator.transformContent(sampleMetadata.content, 'claude', 'codex');
      expect(transformed).toContain('Codex CLI does not support the Task tool');
      expect(transformed).toContain('validation-correctness');
    });
  });

  describe('generateCodexSkill (T019)', () => {
    it('generates skill with required YAML frontmatter', async () => {
      const path = await generator.generateCodexSkill(sampleMetadata, true);
      expect(path).toBe('/test/workspace/.system/skills/1_gofer_research/SKILL.md');

      const writeSpy = vi.mocked(fs.promises.writeFile);
      expect(writeSpy).not.toHaveBeenCalled();

      const generated = await generator.generateCommand(sampleMetadata, 'codex', true);
      expect(generated).toContain('.system/skills/1_gofer_research/SKILL.md');
    });

    it('writes codex skill when not in dry run', async () => {
      await generator.generateCodexSkill(sampleMetadata, false);
      expect(vi.mocked(fs.promises.mkdir)).toHaveBeenCalledWith(
        '/test/workspace/.system/skills/1_gofer_research',
        { recursive: true }
      );
      expect(vi.mocked(fs.promises.writeFile)).toHaveBeenCalledTimes(1);
      const content = String(vi.mocked(fs.promises.writeFile).mock.calls[0][1]);
      expect(content).toContain('name: 1_gofer_research');
      expect(content).toContain('description: Research stage');
      expect(content).toContain('result_schema:');
    });
  });

  describe('injectPlatformSections (T020)', () => {
    it('injects codex pipeline continuation with next command', () => {
      const base = '## Key Rules\n\nFollow rules.';
      const enhanced = generator.injectPlatformSections(base, 'codex', '1_gofer_research');
      expect(enhanced).toContain('## Pipeline Continuation');
      expect(enhanced).toContain('**Next Command:** `$ $2_gofer_specify`');
      expect(enhanced).toContain('Codex CLI does not support automatic command chaining');
    });

    it('injects copilot pipeline continuation with next command', () => {
      const base = 'Body content';
      const enhanced = generator.injectPlatformSections(base, 'copilot', '1_gofer_research');
      expect(enhanced).toContain('## Pipeline Continuation');
      expect(enhanced).toContain('**Next Command:** `#2_gofer_specify`');
      expect(enhanced).toContain('Copilot Chat supports context preservation');
    });

    it('does not inject continuation for terminal pipeline stage', () => {
      const base = 'Final stage content';
      const enhanced = generator.injectPlatformSections(
        base,
        'codex',
        '6a_gofer_engineering_review'
      );
      expect(enhanced).toBe(base);
    });
  });

  describe('validateGeneratedCommand', () => {
    it('rejects content without frontmatter', () => {
      expect(() => generator.validateGeneratedCommand('# no frontmatter', 'codex')).toThrow(
        'Generated command missing YAML frontmatter'
      );
    });

    it('rejects codex content missing result_schema', () => {
      const invalid = `---
name: test
description: test
---

body`;
      expect(() => generator.validateGeneratedCommand(invalid, 'codex')).toThrow(
        'Codex skill missing required field: result_schema'
      );
    });
  });

  describe('generateCommands', () => {
    it('generates commands from all markdown files in claude commands directory', async () => {
      vi.mocked(fs.promises.access).mockResolvedValue(undefined as never);
      vi.mocked(fs.promises.readdir).mockResolvedValue([
        '1_gofer_research.md',
        '2_gofer_specify.md',
        'README.txt',
      ] as never);

      const extractSpy = vi
        .spyOn(
          (
            generator as unknown as {
              extractor: { extractFromClaudeCommand: (p: string) => Promise<CommandMetadata> };
            }
          ).extractor,
          'extractFromClaudeCommand'
        )
        .mockResolvedValue(sampleMetadata);
      const generateSpy = vi
        .spyOn(generator, 'generateCommand')
        .mockResolvedValue('/test/workspace/.system/skills/1_gofer_research/SKILL.md');

      const results = await generator.generateCommands('codex', true);

      expect(extractSpy).toHaveBeenCalledTimes(2);
      expect(generateSpy).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });

    it('throws when claude commands directory is missing', async () => {
      vi.mocked(fs.promises.access).mockRejectedValue(new Error('missing') as never);
      await expect(generator.generateCommands('codex', true)).rejects.toThrow(
        'Claude commands directory not found: /test/workspace/.claude/commands'
      );
    });
  });
});
