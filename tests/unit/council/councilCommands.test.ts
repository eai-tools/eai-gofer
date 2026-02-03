/**
 * Council Commands Unit Tests
 *
 * Tests for the LLM Council VSCode commands.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as vscode from 'vscode';
import {
  showProviderStatus,
  checkAllProviderHealth,
  registerCouncilCommands,
} from '../../../extension/src/commands/councilCommands';

// Mock the provider factory
vi.mock('../../../extension/src/council/providers', () => ({
  getProviderFactory: vi.fn(),
}));

import { getProviderFactory } from '../../../extension/src/council/providers';

describe('councilCommands', () => {
  let mockFactory: {
    getApiKey: Mock;
    createProvider: Mock;
  };
  let mockOutputChannel: {
    clear: Mock;
    appendLine: Mock;
    show: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockFactory = {
      getApiKey: vi.fn(),
      createProvider: vi.fn(),
    };

    (getProviderFactory as Mock).mockReturnValue(mockFactory);

    mockOutputChannel = {
      clear: vi.fn(),
      appendLine: vi.fn(),
      show: vi.fn(),
    };

    (vscode.window.createOutputChannel as Mock).mockReturnValue(mockOutputChannel);

    // Mock showInformationMessage and showWarningMessage to return Promises
    (vscode.window.showInformationMessage as Mock).mockResolvedValue(undefined);
    (vscode.window.showWarningMessage as Mock).mockResolvedValue(undefined);
  });

  describe('showProviderStatus', () => {
    it('should show warning when no providers are configured', async () => {
      // No API keys configured
      mockFactory.getApiKey.mockReturnValue(null);

      await showProviderStatus();

      // Should create output channel
      expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('LLM Council Status');
      expect(mockOutputChannel.clear).toHaveBeenCalled();
      expect(mockOutputChannel.show).toHaveBeenCalled();

      // Should show warning message
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'LLM Council: No providers configured. Add API keys in Settings > Gofer.',
        'Open Settings'
      );
    });

    it('should show information when providers are available', async () => {
      // Configure Anthropic with API key
      mockFactory.getApiKey.mockImplementation((providerId: string) => {
        if (providerId === 'anthropic') {
          return 'test-key';
        }
        return null;
      });

      const mockProvider = {
        healthCheck: vi.fn().mockResolvedValue(true),
        model: 'claude-opus-4-5-20251101',
      };
      mockFactory.createProvider.mockReturnValue(mockProvider);

      await showProviderStatus();

      // Should show information message with available provider
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'LLM Council: Anthropic Claude ready',
        'Show Details'
      );
    });

    it('should show unavailable status when health check fails', async () => {
      mockFactory.getApiKey.mockImplementation((providerId: string) => {
        if (providerId === 'anthropic') {
          return 'test-key';
        }
        return null;
      });

      const mockProvider = {
        healthCheck: vi.fn().mockResolvedValue(false),
        model: 'claude-opus-4-5-20251101',
      };
      mockFactory.createProvider.mockReturnValue(mockProvider);

      await showProviderStatus();

      // Should show warning since provider validation failed
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'LLM Council: No providers configured. Add API keys in Settings > Gofer.',
        'Open Settings'
      );
    });

    it('should handle multiple available providers', async () => {
      // Configure multiple providers
      mockFactory.getApiKey.mockImplementation((providerId: string) => {
        if (providerId === 'anthropic' || providerId === 'google') {
          return 'test-key';
        }
        return null;
      });

      const mockProvider = {
        healthCheck: vi.fn().mockResolvedValue(true),
        model: 'test-model',
      };
      mockFactory.createProvider.mockReturnValue(mockProvider);

      await showProviderStatus();

      // Should show information message with both providers
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'LLM Council: Anthropic Claude, Google Gemini ready',
        'Show Details'
      );
    });

    it('should handle provider creation errors', async () => {
      mockFactory.getApiKey.mockImplementation((providerId: string) => {
        if (providerId === 'anthropic') {
          return 'test-key';
        }
        return null;
      });

      mockFactory.createProvider.mockImplementation(() => {
        throw new Error('SDK initialization failed');
      });

      await showProviderStatus();

      // Should handle error gracefully and show warning
      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });
  });

  describe('checkAllProviderHealth', () => {
    it('should return empty arrays when no providers configured', async () => {
      mockFactory.getApiKey.mockReturnValue(null);

      const result = await checkAllProviderHealth();

      expect(result.available).toEqual([]);
      expect(result.unavailable).toEqual([]);
    });

    it('should return available providers that pass health check', async () => {
      mockFactory.getApiKey.mockImplementation((providerId: string) => {
        if (providerId === 'anthropic') {
          return 'test-key';
        }
        return null;
      });

      const mockProvider = {
        healthCheck: vi.fn().mockResolvedValue(true),
      };
      mockFactory.createProvider.mockReturnValue(mockProvider);

      const result = await checkAllProviderHealth();

      expect(result.available).toContain('anthropic');
      expect(result.unavailable).toEqual([]);
    });

    it('should return unavailable providers that fail health check', async () => {
      mockFactory.getApiKey.mockImplementation((providerId: string) => {
        if (providerId === 'google') {
          return 'test-key';
        }
        return null;
      });

      const mockProvider = {
        healthCheck: vi.fn().mockResolvedValue(false),
      };
      mockFactory.createProvider.mockReturnValue(mockProvider);

      const result = await checkAllProviderHealth();

      expect(result.available).toEqual([]);
      expect(result.unavailable).toContain('google');
    });

    it('should handle health check exceptions', async () => {
      mockFactory.getApiKey.mockImplementation((providerId: string) => {
        if (providerId === 'openai') {
          return 'test-key';
        }
        return null;
      });

      const mockProvider = {
        healthCheck: vi.fn().mockRejectedValue(new Error('Connection failed')),
      };
      mockFactory.createProvider.mockReturnValue(mockProvider);

      const result = await checkAllProviderHealth();

      expect(result.available).toEqual([]);
      expect(result.unavailable).toContain('openai');
    });

    it('should check all configured providers', async () => {
      mockFactory.getApiKey.mockReturnValue('test-key');

      const mockProvider = {
        healthCheck: vi.fn().mockResolvedValue(true),
      };
      mockFactory.createProvider.mockReturnValue(mockProvider);

      const result = await checkAllProviderHealth();

      // All 3 providers should be available
      expect(result.available).toHaveLength(3);
      expect(result.available).toContain('anthropic');
      expect(result.available).toContain('google');
      expect(result.available).toContain('openai');
    });
  });

  describe('registerCouncilCommands', () => {
    it('should register the showCouncilStatus command', () => {
      const mockContext = {
        subscriptions: {
          push: vi.fn(),
        },
      } as unknown as vscode.ExtensionContext;

      registerCouncilCommands(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'gofer.showCouncilStatus',
        showProviderStatus
      );
      expect(mockContext.subscriptions.push).toHaveBeenCalled();
    });
  });
});
