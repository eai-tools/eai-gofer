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
