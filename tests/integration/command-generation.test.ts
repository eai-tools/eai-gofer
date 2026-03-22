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
      const codexSkillPath = path.join(process.cwd(), '.agents/skills/6_gofer_validate/SKILL.md');

      const content = await fs.readFile(codexSkillPath, 'utf-8');

      // Verify parallel workflow section exists
      expect(content).toContain('Codex CLI: Parallel Validation Workflow');
      expect(content).toContain('6 Terminal Windows');
      expect(content).toContain('concurrently');

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
        expect(content).toContain(`$ $${skill}`);
      }

      // Verify timing expectation
      expect(content).toContain('45-60 seconds');
    });

    it('should have multi-agent delegation section in Copilot validation prompt', async () => {
      // Read Copilot validation prompt
      const copilotPromptPath = path.join(
        process.cwd(),
        'extension/resources/copilot-prompts/6_gofer_validate.prompt.md'
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
        'extension/resources/copilot-prompts/6_gofer_validate.prompt.md'
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
      const codexPath = path.join(process.cwd(), '.agents/skills/6_gofer_validate/SKILL.md');
      const copilotPath = path.join(
        process.cwd(),
        'extension/resources/copilot-prompts/6_gofer_validate.prompt.md'
      );

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
      const codexPath = path.join(process.cwd(), '.agents/skills/6_gofer_validate/SKILL.md');
      const legacyPath = path.join(process.cwd(), 'docs/legacy-workflow.md');

      const [codexContent, legacyContent] = await Promise.all([
        fs.readFile(codexPath, 'utf-8'),
        fs.readFile(legacyPath, 'utf-8'),
      ]);

      // Verify parallel execution timing (45-60s)
      const parallelTiming = /45-60\s*s(econds)?/i;
      expect(codexContent).toMatch(parallelTiming);

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
      const codexPath = path.join(process.cwd(), '.agents/skills/6_gofer_validate/SKILL.md');
      const copilotPath = path.join(
        process.cwd(),
        'extension/resources/copilot-prompts/6_gofer_validate.prompt.md'
      );

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
  });
});
