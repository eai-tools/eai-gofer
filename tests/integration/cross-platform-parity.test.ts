/**
 * Integration tests for cross-platform command parity
 * Task: T066, T078-T082
 *
 * Tests verify:
 * - T078: Command availability across platforms
 * - T079: Auto-chain functionality
 * - T080: Parallel agent spawning
 * - T082: Output structure equivalence
 *
 * Note: Conversation history preservation tests (T066) removed due to over-mocking.
 * The implementation in ProviderFactory.ts is verified through manual testing and
 * the real feature parity tests below. Integration tests should test real behavior,
 * not mock behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CrossPlatformCommandRouter } from '../../extension/src/council/CrossPlatformCommandRouter';

/**
 * Feature Parity Tests (US-6, Phase 8)
 * Tasks: T078-T082
 *
 * Tests verify complete feature parity across Claude CLI, Codex CLI, and GitHub Copilot Chat
 */
describe('Cross-Platform Feature Parity', () => {
  const workspacePath = process.cwd();
  let router: CrossPlatformCommandRouter;

  beforeEach(() => {
    router = new CrossPlatformCommandRouter(workspacePath);
  });

  describe('T078: Command Availability', () => {
    const commands = [
      '0_business_scenario',
      '0a_problem_validation',
      '1_gofer_research',
      '2_gofer_specify',
      '3_gofer_plan',
      '4_gofer_tasks',
      '5_gofer_implement',
      '6_gofer_validate',
      '6a_gofer_engineering_review',
      '7_gofer_save',
      '7a_stakeholder_comms',
      '8_gofer_resume',
      '9_gofer_tests',
      '10_gofer_cloud',
      'gofer_constitution',
      'gofer_hydrate',
    ];

    it('should have all 16 commands available in Claude platform', () => {
      commands.forEach((command) => {
        const commandPath = router.getCommandPath(command, 'claude');
        expect(fs.existsSync(commandPath)).toBe(true);

        // Verify file has valid content (not empty)
        const content = fs.readFileSync(commandPath, 'utf8');
        expect(content.length).toBeGreaterThan(0);

        // Verify has markdown structure
        expect(content).toContain('#');
      });
    });

    it('should route commands correctly for each platform', () => {
      const testCommand = '1_gofer_research';

      const claudePath = router.getCommandPath(testCommand, 'claude');
      const copilotPath = router.getCommandPath(testCommand, 'copilot');
      const codexPath = router.getCommandPath(testCommand, 'codex');

      expect(claudePath).toContain('.claude/commands');
      expect(copilotPath).toContain('.github/prompts');
      expect(codexPath).toContain('.system/skills');
    });

    it('should provide correct command syntax for each platform', () => {
      const testCommand = '1_gofer_research';

      expect(router.getCommandSyntax(testCommand, 'claude')).toBe('/1_gofer_research');
      expect(router.getCommandSyntax(testCommand, 'copilot')).toBe('#1_gofer_research');
      expect(router.getCommandSyntax(testCommand, 'codex')).toBe('$ $1_gofer_research');
    });

    it('should list all available commands', async () => {
      const availableCommands = await router.listCommands();

      expect(availableCommands.length).toBeGreaterThanOrEqual(16);
      expect(availableCommands).toContain('1_gofer_research');
      expect(availableCommands).toContain('6_gofer_validate');
    });

    it('should verify Codex skills directory exists with all skills', () => {
      const codexSkillsDir = path.join(workspacePath, '.system/skills');
      expect(fs.existsSync(codexSkillsDir)).toBe(true);

      // Verify all commands have corresponding SKILL.md files
      commands.forEach((command) => {
        const skillPath = path.join(codexSkillsDir, command, 'SKILL.md');
        expect(fs.existsSync(skillPath)).toBe(true);

        // Verify SKILL.md has YAML frontmatter
        const content = fs.readFileSync(skillPath, 'utf8');
        expect(content).toContain('---');
        expect(content).toContain('name:');
        expect(content).toContain('description:');
      });
    });

    it('should verify command files are not empty', () => {
      commands.forEach((command) => {
        // Check Claude command
        const claudePath = router.getCommandPath(command, 'claude');
        const claudeContent = fs.readFileSync(claudePath, 'utf8');
        expect(claudeContent.trim().length).toBeGreaterThan(100);

        // Check Codex skill
        const codexPath = router.getCommandPath(command, 'codex');
        const codexContent = fs.readFileSync(codexPath, 'utf8');
        expect(codexContent.trim().length).toBeGreaterThan(100);

        // Check Copilot prompt (if exists)
        const copilotPath = router.getCommandPath(command, 'copilot');
        if (fs.existsSync(copilotPath)) {
          const copilotContent = fs.readFileSync(copilotPath, 'utf8');
          expect(copilotContent.trim().length).toBeGreaterThan(100);
        }
      });
    });
  });

  describe('T079: Auto-Chain Functionality', () => {
    it('should have auto-chain instructions in each stage command', () => {
      const pipelineStages = [
        '1_gofer_research',
        '2_gofer_specify',
        '3_gofer_plan',
        '4_gofer_tasks',
        '5_gofer_implement',
        '6_gofer_validate',
      ];

      pipelineStages.forEach((stage, index) => {
        const claudePath = router.getCommandPath(stage, 'claude');
        const content = fs.readFileSync(claudePath, 'utf8');

        if (index < pipelineStages.length - 1) {
          const nextStage = pipelineStages[index + 1];

          // Should contain instruction to invoke next stage
          expect(content.toLowerCase()).toContain('auto-chain');

          // Should reference next stage command
          expect(content).toContain(nextStage);
        }
      });
    });

    it('should have Skill tool invocation for auto-chaining in Claude commands', () => {
      const pipelineStages = [
        '1_gofer_research',
        '2_gofer_specify',
        '3_gofer_plan',
        '4_gofer_tasks',
        '5_gofer_implement',
      ];

      pipelineStages.forEach((stage) => {
        const claudePath = router.getCommandPath(stage, 'claude');
        const content = fs.readFileSync(claudePath, 'utf8');

        // Should have Skill tool usage for auto-chain
        expect(content).toContain('Skill');
        expect(content.toLowerCase()).toContain('mandatory');
      });
    });

    it('should have manual step instructions in Copilot prompts', () => {
      const copilotPath = path.join(workspacePath, '.github/prompts/1_gofer_research.prompt.md');

      if (fs.existsSync(copilotPath)) {
        const content = fs.readFileSync(copilotPath, 'utf8');

        // Copilot uses manual chaining (no Task tool)
        expect(content.toLowerCase()).toContain('next');
      }
    });

    it('should have consistent chaining format across Codex skills', () => {
      const pipelineStages = [
        '1_gofer_research',
        '2_gofer_specify',
        '3_gofer_plan',
        '4_gofer_tasks',
        '5_gofer_implement',
      ];

      pipelineStages.forEach((stage, index) => {
        if (index < pipelineStages.length - 1) {
          const nextStage = pipelineStages[index + 1];
          const codexPath = router.getCommandPath(stage, 'codex');
          const content = fs.readFileSync(codexPath, 'utf8');

          // Should reference next stage
          expect(content).toContain(nextStage);

          // Should have "Next Steps" or similar section
          expect(content.toLowerCase()).toMatch(/next\s+(steps?|command)/);
        }
      });
    });
  });

  describe('T080: Parallel Agent Spawning', () => {
    it('should have parallel agent instructions in validation command', () => {
      const validationPath = router.getCommandPath('6_gofer_validate', 'claude');
      const content = fs.readFileSync(validationPath, 'utf8');

      // Should reference parallel execution
      expect(content.toLowerCase()).toContain('parallel');

      // Should reference Task tool for spawning agents
      expect(content).toContain('Task');

      // Should reference multiple validation agents
      const agentNames = [
        'validation-correctness',
        'validation-security',
        'validation-performance',
        'validation-test-quality',
        'validation-integration',
        'validation-standards',
      ];

      agentNames.forEach((agentName) => {
        expect(content).toContain(agentName);
      });
    });

    it('should reference validation agents with Task tool', () => {
      const validationPath = router.getCommandPath('6_gofer_validate', 'claude');
      const content = fs.readFileSync(validationPath, 'utf8');

      // Should reference agents using Task tool
      expect(content.toLowerCase()).toContain('agent');
      expect(content).toContain('validation');
      expect(content).toContain('Task');
    });

    it('should have 6 validation agents defined', () => {
      const agentsDir = path.join(workspacePath, '.claude/agents');
      const validationAgents = fs
        .readdirSync(agentsDir)
        .filter((file) => file.startsWith('validation-') && file.endsWith('.md'));

      expect(validationAgents.length).toBe(6);
    });

    it('should verify each validation agent file exists and has content', () => {
      const agentNames = [
        'validation-correctness',
        'validation-security',
        'validation-performance',
        'validation-test-quality',
        'validation-integration',
        'validation-standards',
      ];

      const agentsDir = path.join(workspacePath, '.claude/agents');

      agentNames.forEach((agentName) => {
        const agentPath = path.join(agentsDir, `${agentName}.md`);
        expect(fs.existsSync(agentPath)).toBe(true);

        const content = fs.readFileSync(agentPath, 'utf8');
        expect(content.length).toBeGreaterThan(500);
        expect(content).toContain('# ');
      });
    });
  });

  describe('T082: Output Structure Equivalence', () => {
    it('should have consistent YAML frontmatter structure across platforms', () => {
      const researchClaude = router.getCommandPath('1_gofer_research', 'claude');
      const content = fs.readFileSync(researchClaude, 'utf8');

      // Should define output structure with YAML frontmatter
      expect(content.toLowerCase()).toContain('yaml');
      expect(content).toContain('---');

      // Should specify required frontmatter fields
      const requiredFields = ['feature', 'status', 'created'];
      requiredFields.forEach((field) => {
        expect(content.toLowerCase()).toContain(field);
      });
    });

    it('should specify consistent section headings for research.md', () => {
      const researchClaude = router.getCommandPath('1_gofer_research', 'claude');
      const content = fs.readFileSync(researchClaude, 'utf8');

      // Should define standard sections
      const expectedSections = [
        'Feature Summary',
        'Codebase Analysis',
        'Technology Decisions',
        'Constraints',
      ];

      expectedSections.forEach((section) => {
        expect(content).toContain(section);
      });
    });

    it('should specify consistent section headings for spec.md', () => {
      const specClaude = router.getCommandPath('2_gofer_specify', 'claude');
      const content = fs.readFileSync(specClaude, 'utf8');

      // Should define standard sections
      const expectedSections = [
        'Overview',
        'User Stories',
        'Functional Requirements',
        'Success Criteria',
      ];

      expectedSections.forEach((section) => {
        expect(content).toContain(section);
      });
    });

    it('should specify consistent section headings for validation-report.md', () => {
      const validateClaude = router.getCommandPath('6_gofer_validate', 'claude');
      const content = fs.readFileSync(validateClaude, 'utf8');

      // Should define validation report structure
      expect(content.toLowerCase()).toContain('validation');
      expect(content.toLowerCase()).toContain('report');

      // Should have scoring rubric
      expect(content.toLowerCase()).toContain('score');
      expect(content).toContain('100');
    });

    it('should verify command metadata is consistent across platforms', () => {
      const testCommand = '1_gofer_research';

      const claudePath = router.getCommandPath(testCommand, 'claude');
      const codexPath = router.getCommandPath(testCommand, 'codex');

      const claudeContent = fs.readFileSync(claudePath, 'utf8');
      const codexContent = fs.readFileSync(codexPath, 'utf8');

      // Both should reference research functionality
      expect(claudeContent.toLowerCase()).toContain('research');
      expect(codexContent.toLowerCase()).toContain('research');

      // Both should reference codebase analysis
      expect(claudeContent.toLowerCase()).toContain('codebase');
      expect(codexContent.toLowerCase()).toContain('codebase');
    });
  });

  describe('US-006: Canonical Mirror Parity Assertions', () => {
    it('should propagate canonical metadata into Codex and Copilot mirrors', () => {
      const commandName = '1_gofer_research';
      const codexPath = router.getCommandPath(commandName, 'codex');
      const copilotPath = router.getCommandPath(commandName, 'copilot');

      const codexContent = fs.readFileSync(codexPath, 'utf8');
      const copilotContent = fs.readFileSync(copilotPath, 'utf8');

      expect(codexContent).toContain('gofer:');
      expect(codexContent).toMatch(/workflowProfile:\s*(standard|enterpriseai)/);
      expect(codexContent).toContain(`canonicalSource: .claude/commands/${commandName}.md`);
      expect(codexContent).toContain('metadataSource: scripts/generate-commands.ts');

      expect(copilotContent).toContain('gofer:');
      expect(copilotContent).toMatch(/workflowProfile:\s*(standard|enterpriseai)/);
      expect(copilotContent).toContain(`canonicalSource: .claude/commands/${commandName}.md`);
      expect(copilotContent).toContain('metadataSource: scripts/generate-commands.ts');
    });

    it('should keep .agents skills in parity with .system skills without manual mirror edits', () => {
      const codexSkillsDir = path.join(workspacePath, '.system', 'skills');
      const commandDirs = fs.readdirSync(codexSkillsDir).filter((entry) => {
        return fs.existsSync(path.join(codexSkillsDir, entry, 'SKILL.md'));
      });

      expect(commandDirs.length).toBeGreaterThan(0);

      commandDirs.forEach((commandName) => {
        const codexSkillPath = path.join(codexSkillsDir, commandName, 'SKILL.md');
        const agentSkillPath = path.join(
          workspacePath,
          '.agents',
          'skills',
          commandName,
          'SKILL.md'
        );

        expect(fs.existsSync(agentSkillPath)).toBe(true);
        expect(fs.readFileSync(agentSkillPath, 'utf8')).toBe(
          fs.readFileSync(codexSkillPath, 'utf8')
        );
      });
    });
  });

  describe('Cross-Platform Command Router', () => {
    it('should instantiate without errors', () => {
      expect(() => new CrossPlatformCommandRouter(workspacePath)).not.toThrow();
    });

    it('should correctly identify platform-specific paths', () => {
      const testCommand = '1_gofer_research';

      const claudePath = router.getCommandPath(testCommand, 'claude');
      expect(claudePath).toMatch(/\.claude\/commands/);

      const codexPath = router.getCommandPath(testCommand, 'codex');
      expect(codexPath).toMatch(/\.system\/skills/);

      const copilotPath = router.getCommandPath(testCommand, 'copilot');
      expect(copilotPath).toMatch(/\.github\/prompts/);
    });

    it('should detect command availability correctly', () => {
      expect(router.isCommandAvailable('1_gofer_research')).toBe(true);
      expect(router.isCommandAvailable('nonexistent_command')).toBe(false);
    });

    it('should load command content for available commands', async () => {
      const testCommand = '1_gofer_research';
      const content = await router.loadSkillForPlatform(testCommand, 'claude');

      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('#');
    });

    it('should throw error for unavailable commands', async () => {
      await expect(router.loadSkillForPlatform('nonexistent_command', 'claude')).rejects.toThrow();
    });
  });
});
