/**
 * Integration test for cross-platform command generation and parallel agent instructions
 * Task: T061
 *
 * Tests verify:
 * - T061: Validation commands have parallel agent spawning instructions across all 3 platforms
 * - Claude CLI uses Task tool for parallel execution
 * - Codex CLI uses 6 terminal workflow for parallel execution
 * - Copilot Chat has multi-agent delegation section with backward compatibility
 */

import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { CommandGenerator } from '../../extension/src/council/CommandGenerator';

function normalizeRelativePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

interface RemovedSurfacePattern {
  label: string;
  pattern: RegExp;
}

const MIRROR_SURFACE_ROOTS = [
  '.claude/commands',
  '.claude/agents',
  '.github/prompts',
  '.gemini',
  '.system/skills',
  '.agents/skills',
  'extension/resources/claude-commands',
  'extension/resources/claude-agents',
  'extension/resources/copilot-prompts',
  'extension/resources/gemini',
];

const REMOVED_SURFACE_PATTERNS: RemovedSurfacePattern[] = [
  {
    label: 'legacy eaigofer prefix',
    pattern: /\b(?:eaigofer_|eaiGofer\.)[A-Za-z0-9_.]*/,
  },
  {
    label: 'removed autonomous notificationChannel setting',
    pattern: /gofer\.autonomous\.notificationChannel/,
  },
  {
    label: 'removed autonomous whatsappPhoneNumber setting',
    pattern: /gofer\.autonomous\.whatsappPhoneNumber/,
  },
  {
    label: 'removed autonomous emailAddress setting',
    pattern: /gofer\.autonomous\.emailAddress/,
  },
  {
    label: 'removed claudeTerminalName setting',
    pattern: /gofer\.claudeTerminalName/,
  },
  {
    label: 'removed autoValidate setting',
    pattern: /gofer\.autoValidate/,
  },
  {
    label: 'removed showWelcome setting',
    pattern: /gofer\.showWelcome/,
  },
  {
    label: 'deleted WhatsApp setup guide reference',
    pattern: /docs\/WHATSAPP_SETUP\.md/,
  },
  {
    label: 'deleted two-way WhatsApp guide reference',
    pattern: /docs\/TWO_WAY_WHATSAPP\.md/,
  },
  {
    label: 'deleted migration guide reference',
    pattern: /docs\/migration-guide\.md/,
  },
  {
    label: 'stale canonicalSource path',
    pattern: /canonicalSource:\s*\.claude\/commands\//,
  },
];

async function collectRelativeFiles(rootDir: string, currentDir: string = rootDir): Promise<string[]> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        return collectRelativeFiles(rootDir, entryPath);
      }

      return [normalizeRelativePath(path.relative(rootDir, entryPath))];
    })
  );

  return files.flat().sort();
}

describe('Command Generation Integration (US-3)', () => {
  describe('T061: Parallel Agent Instructions in Validation Commands', () => {
    it('should have parallel agent spawning in Claude validation command', async () => {
      // Read Claude validation command
      const claudeCommandPath = path.join(process.cwd(), '.claude/commands/6_gofer_validate.md');

      const content = await fs.readFile(claudeCommandPath, 'utf-8');

      // Verify parallel agent spawning instructions exist
      expect(content).toContain('Task');
      expect(content).toContain('parallel');
      expect(content).toContain('subagent_type');

      // Verify all 6 validation agents are referenced
      const agents = [
        'validation-correctness',
        'validation-security',
        'validation-performance',
        'validation-test-quality',
        'validation-integration',
        'validation-standards',
      ];

      for (const agent of agents) {
        expect(content).toContain(agent);
      }

      // Verify Task tool invocation pattern
      expect(content).toMatch(/Task:\s+subagent_type=/);
    });

    it('should have 6-terminal workflow in Codex validation skill', async () => {
      // Read Codex validation skill
      const codexSkillPath = path.join(process.cwd(), '.system/skills/6_gofer_validate/SKILL.md');

      const content = await fs.readFile(codexSkillPath, 'utf-8');

      // Verify codex guidance for parallel work exists
      expect(content).toContain('Codex CLI does not support the Task tool');
      expect(content).toContain('parallel agent work');
      expect(content).toContain('multiple Codex CLI sessions');

      // Verify all 6 validation skills are referenced
      const skills = [
        'validation-correctness',
        'validation-security',
        'validation-performance',
        'validation-test-quality',
        'validation-integration',
        'validation-standards',
      ];

      for (const skill of skills) {
        expect(content).toContain(skill);
      }
    });

    it('should have multi-agent delegation section in Copilot validation prompt', async () => {
      // Read Copilot validation prompt
      const copilotPromptPath = path.join(
        process.cwd(),
        '.github/prompts/6_gofer_validate.prompt.md'
      );

      const content = await fs.readFile(copilotPromptPath, 'utf-8');

      // Verify multi-agent delegation section exists
      expect(content).toContain('Execution Strategy by Platform');
      expect(content).toContain('Claude Code CLI');
      expect(content).toContain('GitHub Copilot Chat (2026+)');
      expect(content).toContain('GitHub Copilot Chat (2025 and earlier)');

      // Verify parallel execution is documented
      expect(content).toContain('parallel');
      expect(content).toContain('Task tool');

      // Verify backward compatibility with sequential execution
      expect(content).toContain('sequentially');
      expect(content).toContain('Legacy Workflow');

      // Verify all 6 agents are referenced
      const agents = [
        'correctness',
        'security',
        'performance',
        'test-quality',
        'integration',
        'standards',
      ];

      for (const agent of agents) {
        expect(content).toContain(agent);
      }
    });

    it('should reference legacy workflow documentation for pre-2026 Copilot', async () => {
      // Read Copilot validation prompt
      const copilotPromptPath = path.join(
        process.cwd(),
        '.github/prompts/6_gofer_validate.prompt.md'
      );

      const content = await fs.readFile(copilotPromptPath, 'utf-8');

      // Verify legacy workflow is mentioned
      expect(content).toContain('2025 and earlier');
      expect(content).toContain('sequential');

      // Check if legacy workflow doc exists
      const legacyDocPath = path.join(process.cwd(), 'docs/legacy-workflow.md');
      const legacyDocExists = await fs
        .access(legacyDocPath)
        .then(() => true)
        .catch(() => false);

      expect(legacyDocExists).toBe(true);

      // Verify legacy workflow doc has sequential instructions
      const legacyContent = await fs.readFile(legacyDocPath, 'utf-8');
      expect(legacyContent).toContain('Sequential Validation Process');
      expect(legacyContent).toContain('90-120 seconds');
    });

    it('should have consistent agent naming across all platforms', async () => {
      // Read all three platform validation files
      const claudePath = path.join(process.cwd(), '.claude/commands/6_gofer_validate.md');
      const codexPath = path.join(process.cwd(), '.system/skills/6_gofer_validate/SKILL.md');
      const copilotPath = path.join(process.cwd(), '.github/prompts/6_gofer_validate.prompt.md');

      const [claudeContent, codexContent, copilotContent] = await Promise.all([
        fs.readFile(claudePath, 'utf-8'),
        fs.readFile(codexPath, 'utf-8'),
        fs.readFile(copilotPath, 'utf-8'),
      ]);

      // Define expected agent names
      const agentNames = [
        'correctness',
        'security',
        'performance',
        'test-quality',
        'integration',
        'standards',
      ];

      // Verify all agent names appear in all three files
      for (const agent of agentNames) {
        expect(claudeContent).toContain(agent);
        expect(codexContent).toContain(agent);
        expect(copilotContent).toContain(agent);
      }
    });

    it('should document performance expectations consistently', async () => {
      // Read validation files for performance timing checks
      const codexPath = path.join(process.cwd(), '.system/skills/6_gofer_validate/SKILL.md');
      const legacyPath = path.join(process.cwd(), 'docs/legacy-workflow.md');

      const [codexContent, legacyContent] = await Promise.all([
        fs.readFile(codexPath, 'utf-8'),
        fs.readFile(legacyPath, 'utf-8'),
      ]);

      // Verify codex guidance still recommends concurrent execution
      expect(codexContent).toMatch(/parallel|concurrent/i);

      // Verify sequential execution timing (90-120s)
      const sequentialTiming = /90-120\s*s(econds)?/i;
      expect(legacyContent).toMatch(sequentialTiming);

      // Verify performance comparison is documented
      expect(legacyContent).toContain('Performance Comparison');
    });
  });

  describe('Cross-Platform Command Parity', () => {
    it('should have equivalent validation coverage across all platforms', async () => {
      // This test ensures all platforms can validate the same 10 rubric categories
      const rubricCategories = [
        'Correctness',
        'Security',
        'Performance',
        'Test Authenticity',
        'Mock Ratio',
        'Integration',
        'Mutation Testing',
        'Standards',
        'Code Hygiene',
        'Semantic Slop',
      ];

      // Read all platform validation files
      const claudePath = path.join(process.cwd(), '.claude/commands/6_gofer_validate.md');
      const codexPath = path.join(process.cwd(), '.system/skills/6_gofer_validate/SKILL.md');
      const copilotPath = path.join(process.cwd(), '.github/prompts/6_gofer_validate.prompt.md');

      const [claudeContent, codexContent, copilotContent] = await Promise.all([
        fs.readFile(claudePath, 'utf-8'),
        fs.readFile(codexPath, 'utf-8'),
        fs.readFile(copilotPath, 'utf-8'),
      ]);

      // Verify all rubric categories are documented in all platforms
      for (const category of rubricCategories) {
        // Note: Some categories might use different casing or phrasing
        // This is a basic check - actual implementation may need fuzzy matching
        const categoryPattern = new RegExp(category, 'i');
        expect(claudeContent).toMatch(categoryPattern);
        expect(codexContent).toMatch(categoryPattern);
        expect(copilotContent).toMatch(categoryPattern);
      }
    });

    it('regenerates mirrors from canonical sources with no manual mirror edits required', async () => {
      const fixtureRoot = path.join(
        process.cwd(),
        'tests',
        'integration',
        '.command-generation-fixture'
      );
      const canonicalCommand = '1_gofer_research.md';
      const canonicalPath = path.join(process.cwd(), '.claude', 'commands', canonicalCommand);
      const canonicalContent = await fs.readFile(canonicalPath, 'utf-8');

      await fs.rm(fixtureRoot, { recursive: true, force: true });
      await fs.mkdir(path.join(fixtureRoot, '.claude', 'commands'), { recursive: true });
      await fs.writeFile(
        path.join(fixtureRoot, '.claude', 'commands', canonicalCommand),
        canonicalContent,
        'utf-8'
      );

      try {
        const generator = new CommandGenerator(fixtureRoot);
        await generator.generateCommands('codex', false, {
          workflowProfileOverride: 'enterpriseai',
          metadataSource: 'scripts/generate-commands.ts',
        });
        await generator.generateCommands('copilot', false, {
          workflowProfileOverride: 'enterpriseai',
          metadataSource: 'scripts/generate-commands.ts',
        });

        const generatedCodex = await fs.readFile(
          path.join(fixtureRoot, '.system', 'skills', '1_gofer_research', 'SKILL.md'),
          'utf-8'
        );
        const generatedCopilot = await fs.readFile(
          path.join(fixtureRoot, '.github', 'prompts', '1_gofer_research.prompt.md'),
          'utf-8'
        );
        const repoCodex = await fs.readFile(
          path.join(process.cwd(), '.system', 'skills', '1_gofer_research', 'SKILL.md'),
          'utf-8'
        );
        const repoCopilot = await fs.readFile(
          path.join(process.cwd(), '.github', 'prompts', '1_gofer_research.prompt.md'),
          'utf-8'
        );

        expect(generatedCodex).toBe(repoCodex);
        expect(generatedCopilot).toBe(repoCopilot);
      } finally {
        await fs.rm(fixtureRoot, { recursive: true, force: true });
      }
    });

    it('keeps packaged extension mirror resources byte-identical to checked-in mirrors', async () => {
      const mirrorPairs: Array<[string, string]> = [
        ['.claude/agents', 'extension/resources/claude-agents'],
        ['.claude/commands', 'extension/resources/claude-commands'],
        ['.github/prompts', 'extension/resources/copilot-prompts'],
        ['.gemini', 'extension/resources/gemini'],
      ];

      for (const [repoRelativeDir, extensionRelativeDir] of mirrorPairs) {
        const repoDir = path.join(process.cwd(), repoRelativeDir);
        const extensionDir = path.join(process.cwd(), extensionRelativeDir);
        const repoFiles = await collectRelativeFiles(repoDir);
        const extensionFiles = await collectRelativeFiles(extensionDir);

        expect(extensionFiles).toEqual(repoFiles);

        for (const relativeFile of repoFiles) {
          const repoContent = await fs.readFile(path.join(repoDir, relativeFile));
          const extensionContent = await fs.readFile(path.join(extensionDir, relativeFile));
          expect(extensionContent.equals(repoContent)).toBe(true);
        }
      }
    });

    it('does not ship removed VS Code surfaces in mirrors or packaged resources', async () => {
      const findings: string[] = [];

      for (const relativeDir of MIRROR_SURFACE_ROOTS) {
        const rootDir = path.join(process.cwd(), relativeDir);
        const relativeFiles = await collectRelativeFiles(rootDir);

        for (const relativeFile of relativeFiles) {
          const absoluteFile = path.join(rootDir, relativeFile);
          const content = await fs.readFile(absoluteFile, 'utf-8');

          for (const { label, pattern } of REMOVED_SURFACE_PATTERNS) {
            if (pattern.test(content)) {
              findings.push(
                `${normalizeRelativePath(path.join(relativeDir, relativeFile))}: ${label}`
              );
            }
          }
        }
      }

      expect(findings).toEqual([]);
    });

    it('keeps only the cleanup spec active at the top level under .specify/specs', async () => {
      const specsRoot = path.join(process.cwd(), '.specify', 'specs');
      const entries = await fs.readdir(specsRoot, { withFileTypes: true });
      const activeSpecDirs = entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '_archived')
        .map((entry) => entry.name)
        .sort();

      expect(activeSpecDirs).toEqual(['030-vscode-surface-truth-cleanup']);
    });
  });
});
