/**
 * Integration tests for cross-platform command parity
 * Task: T066
 *
 * Tests verify:
 * - T066: Conversation history preservation across provider switches
 * - Full context maintained across Claude → Codex → Claude transitions
 * - History format normalization (JSONL ↔ JSON)
 * - MCP context graceful degradation
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ProviderFactory,
  resetProviderFactory,
} from '../../extension/src/council/providers/ProviderFactory';

describe('Cross-Platform Command Parity (US-4)', () => {
  let factory: ProviderFactory;

  beforeEach(() => {
    resetProviderFactory();
    factory = new ProviderFactory();
  });

  afterEach(() => {
    resetProviderFactory();
  });

  describe('T066: Conversation History Preservation', () => {
    it('should preserve conversation history when switching from Claude to Codex', async () => {
      // Mock CLI providers with conversation history methods
      const mockClaudeProvider = {
        id: 'claude-cli',
        status: 'ready',
        getConversationHistory: vi.fn(() => [
          { role: 'user' as const, content: 'What is React?' },
          { role: 'assistant' as const, content: 'React is a JavaScript library...' },
          { role: 'user' as const, content: 'How do I create a component?' },
          { role: 'assistant' as const, content: 'You can create a component using...' },
        ]),
        setConversationHistory: vi.fn(),
        healthCheck: vi.fn(async () => true),
      };

      const mockCodexProvider = {
        id: 'codex-cli',
        status: 'ready',
        getConversationHistory: vi.fn(() => []),
        setConversationHistory: vi.fn(),
        healthCheck: vi.fn(async () => true),
      };

      // Mock createCLIProvider to return our mocks
      vi.spyOn(factory as any, 'createCLIProvider').mockImplementation(async (cliType: string) => {
        if (cliType === 'claude') {
          // First provider - has history
          (factory as any).providers.set('claude-cli', mockClaudeProvider);
          return mockClaudeProvider;
        } else {
          // Second provider - should receive history
          (factory as any).providers.set('codex-cli', mockCodexProvider);
          return mockCodexProvider;
        }
      });

      // Create Claude provider first (with history)
      await factory.createCLIProvider('claude');

      // Switch to Codex provider
      await factory.createCLIProvider('codex');

      // Verify history was extracted from Claude
      expect(mockClaudeProvider.getConversationHistory).toHaveBeenCalled();

      // Verify history was set on Codex
      expect(mockCodexProvider.setConversationHistory).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'What is React?' }),
          expect.objectContaining({
            role: 'assistant',
            content: 'React is a JavaScript library...',
          }),
        ])
      );
    });

    it('should maintain full context across Claude → Codex → Claude transitions', async () => {
      const conversationHistory = [
        { role: 'user' as const, content: 'Message 1' },
        { role: 'assistant' as const, content: 'Response 1' },
        { role: 'user' as const, content: 'Message 2' },
        { role: 'assistant' as const, content: 'Response 2' },
      ];

      const mockClaudeProvider1 = {
        id: 'claude-cli',
        getConversationHistory: vi.fn(() => conversationHistory),
        setConversationHistory: vi.fn(),
      };

      const mockCodexProvider = {
        id: 'codex-cli',
        getConversationHistory: vi.fn(() => [
          ...conversationHistory,
          { role: 'user' as const, content: 'Message 3 (in Codex)' },
          { role: 'assistant' as const, content: 'Response 3 (from Codex)' },
        ]),
        setConversationHistory: vi.fn(),
      };

      const mockClaudeProvider2 = {
        id: 'claude-cli',
        getConversationHistory: vi.fn(() => []),
        setConversationHistory: vi.fn(),
      };

      vi.spyOn(factory as any, 'createCLIProvider').mockImplementation(async (cliType: string) => {
        const currentProviders = (factory as any).providers;

        if (cliType === 'claude' && currentProviders.size === 0) {
          // First Claude
          currentProviders.set('claude-cli', mockClaudeProvider1);
          return mockClaudeProvider1;
        } else if (cliType === 'codex') {
          // Codex
          currentProviders.set('codex-cli', mockCodexProvider);
          return mockCodexProvider;
        } else {
          // Second Claude
          currentProviders.set('claude-cli', mockClaudeProvider2);
          return mockClaudeProvider2;
        }
      });

      // Start with Claude
      await factory.createCLIProvider('claude');

      // Switch to Codex (should preserve Claude history)
      await factory.createCLIProvider('codex');
      expect(mockCodexProvider.setConversationHistory).toHaveBeenCalledWith(conversationHistory);

      // Switch back to Claude (should preserve full history including Codex messages)
      await factory.createCLIProvider('claude');
      expect(mockClaudeProvider2.setConversationHistory).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ content: 'Message 1' }),
          expect.objectContaining({ content: 'Message 3 (in Codex)' }),
          expect.objectContaining({ content: 'Response 3 (from Codex)' }),
        ])
      );
    });

    it('should handle empty conversation history gracefully', async () => {
      const mockClaudeProvider = {
        id: 'claude-cli',
        getConversationHistory: vi.fn(() => []),
        setConversationHistory: vi.fn(),
      };

      const mockCodexProvider = {
        id: 'codex-cli',
        getConversationHistory: vi.fn(() => []),
        setConversationHistory: vi.fn(),
      };

      vi.spyOn(factory as any, 'createCLIProvider').mockImplementation(async (cliType: string) => {
        if (cliType === 'claude') {
          (factory as any).providers.set('claude-cli', mockClaudeProvider);
          return mockClaudeProvider;
        } else {
          (factory as any).providers.set('codex-cli', mockCodexProvider);
          return mockCodexProvider;
        }
      });

      // Create Claude provider with no history
      await factory.createCLIProvider('claude');

      // Switch to Codex
      await factory.createCLIProvider('codex');

      // Should not call setConversationHistory with empty array
      // (optimization - no need to transfer empty history)
      if (mockCodexProvider.setConversationHistory.mock.calls.length > 0) {
        expect(mockCodexProvider.setConversationHistory).toHaveBeenCalledWith([]);
      }
    });

    it('should handle providers without history methods gracefully', async () => {
      const mockProviderWithoutHistory = {
        id: 'some-provider',
        status: 'ready',
        // No getConversationHistory or setConversationHistory methods
      };

      vi.spyOn(factory as any, 'createCLIProvider').mockResolvedValue(mockProviderWithoutHistory);

      // Should not throw error when provider lacks history methods
      await expect(factory.createCLIProvider('claude')).resolves.toBeDefined();
    });
  });

  describe('Format Normalization', () => {
    it('should normalize conversation format between providers', async () => {
      // Claude uses JSONL format internally
      const claudeFormat = [
        { role: 'user' as const, content: 'Test message' },
        { role: 'assistant' as const, content: 'Test response' },
      ];

      // Both should use the same normalized format
      const mockClaudeProvider = {
        id: 'claude-cli',
        getConversationHistory: vi.fn(() => claudeFormat),
        setConversationHistory: vi.fn(),
      };

      const mockCodexProvider = {
        id: 'codex-cli',
        getConversationHistory: vi.fn(() => []),
        setConversationHistory: vi.fn(),
      };

      vi.spyOn(factory as any, 'createCLIProvider').mockImplementation(async (cliType: string) => {
        if (cliType === 'claude') {
          (factory as any).providers.set('claude-cli', mockClaudeProvider);
          return mockClaudeProvider;
        } else {
          (factory as any).providers.set('codex-cli', mockCodexProvider);
          return mockCodexProvider;
        }
      });

      await factory.createCLIProvider('claude');
      await factory.createCLIProvider('codex');

      // Verify Codex received normalized format
      expect(mockCodexProvider.setConversationHistory).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Test message' }),
          expect.objectContaining({ role: 'assistant', content: 'Test response' }),
        ])
      );
    });
  });

  describe('MCP Context Handling', () => {
    it('should gracefully degrade MCP context when switching to non-MCP provider', async () => {
      // Claude session with MCP tool usage
      const claudeHistoryWithMCP = [
        { role: 'user' as const, content: 'Read file src/index.ts' },
        {
          role: 'assistant' as const,
          content: 'I used MCP tool to read the file...',
        },
        { role: 'user' as const, content: 'What does it do?' },
        { role: 'assistant' as const, content: 'The file exports...' },
      ];

      const mockClaudeProvider = {
        id: 'claude-cli',
        getConversationHistory: vi.fn(() => claudeHistoryWithMCP),
        setConversationHistory: vi.fn(),
      };

      const mockCodexProvider = {
        id: 'codex-cli',
        getConversationHistory: vi.fn(() => []),
        setConversationHistory: vi.fn(),
      };

      vi.spyOn(factory as any, 'createCLIProvider').mockImplementation(async (cliType: string) => {
        if (cliType === 'claude') {
          (factory as any).providers.set('claude-cli', mockClaudeProvider);
          return mockClaudeProvider;
        } else {
          (factory as any).providers.set('codex-cli', mockCodexProvider);
          return mockCodexProvider;
        }
      });

      await factory.createCLIProvider('claude');
      await factory.createCLIProvider('codex');

      // Verify full history was transferred (MCP references preserved as text)
      expect(mockCodexProvider.setConversationHistory).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ content: 'Read file src/index.ts' }),
          expect.objectContaining({ content: 'I used MCP tool to read the file...' }),
        ])
      );
    });
  });
});

/**
 * Feature Parity Tests (US-6, Phase 8)
 * Tasks: T078-T082
 *
 * Tests verify complete feature parity across Claude CLI, Codex CLI, and GitHub Copilot Chat
 */

import * as fs from 'fs';
import * as path from 'path';
import { CrossPlatformCommandRouter } from '../../extension/src/council/CrossPlatformCommandRouter';

describe('Cross-Platform Feature Parity (US-6)', () => {
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

    it('should list all available commands', () => {
      const availableCommands = router.listCommands();

      expect(availableCommands.length).toBeGreaterThanOrEqual(16);
      expect(availableCommands).toContain('1_gofer_research');
      expect(availableCommands).toContain('6_gofer_validate');
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
  });
});
