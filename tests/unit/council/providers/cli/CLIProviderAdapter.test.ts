/**
 * CLIProviderAdapter Unit Tests
 *
 * Tests for the abstract CLI provider base class.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CLIProviderAdapter, ParsedCLIOutput } from '../../../../../extension/src/council/providers/cli/CLIProviderAdapter';
import { ProviderError } from '../../../../../extension/src/council/providers/ProviderError';
import type { ProviderId, QueryRequest } from '../../../../../extension/src/council/types';

// Mock child_process at module level for execFile mocking
vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return {
    ...actual,
    execFile: vi.fn(),
  };
});

// Concrete test implementation of abstract CLIProviderAdapter
class TestCLIProvider extends CLIProviderAdapter {
  readonly id: ProviderId = 'claude-cli';
  readonly name = 'Test CLI Provider';
  readonly model = 'test-model';

  getCLICommand(): string {
    return 'test-cli';
  }

  formatPrompt(request: QueryRequest): string {
    return `Prompt: ${request.prompt}`;
  }

  parseOutput(output: string): ParsedCLIOutput {
    // Simple parser for testing
    return {
      content: output.trim(),
      usage: {
        inputTokens: 10,
        outputTokens: 20,
      },
    };
  }
}

describe('CLIProviderAdapter', () => {
  let provider: TestCLIProvider;

  beforeEach(() => {
    provider = new TestCLIProvider('test-cli', 'test-model');
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(provider.id).toBe('claude-cli');
      expect(provider.name).toBe('Test CLI Provider');
      expect(provider.model).toBe('test-model');
    });

    it('should initialize conversation history as empty', () => {
      expect(provider['conversationHistory']).toEqual([]);
    });
  });

  describe('query', () => {
    it('should throw error if provider is not available', async () => {
      provider.markUnavailable('Test unavailable');

      await expect(
        provider.query({
          prompt: 'Hello',
          maxTokens: 1000,
          temperature: 0,
        })
      ).rejects.toThrow(ProviderError);
    });

    it('should spawn CLI and return response', async () => {
      // Mark provider as available
      provider.markAvailable();

      // Mock spawnCLI
      const mockOutput = 'Test response';
      vi.spyOn(provider as any, 'spawnCLI').mockResolvedValue(mockOutput);

      const response = await provider.query({
        prompt: 'Hello',
        maxTokens: 1000,
        temperature: 0,
      });

      expect(response.content).toBe('Test response');
      expect(response.usage.inputTokens).toBe(10);
      expect(response.usage.outputTokens).toBe(20);
      expect(response.model).toBe('test-model');
      expect(response.providerId).toBe('claude-cli');
    });

    it('should update conversation history after query', async () => {
      provider.markAvailable();
      vi.spyOn(provider as any, 'spawnCLI').mockResolvedValue('Response');

      await provider.query({
        prompt: 'Hello',
        maxTokens: 1000,
        temperature: 0,
      });

      expect(provider['conversationHistory']).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Response' },
      ]);
    });

    it('should update rate limit after query', async () => {
      provider.markAvailable();
      vi.spyOn(provider as any, 'spawnCLI').mockResolvedValue('Response');
      const updateRateLimitSpy = vi.spyOn(provider as any, 'updateRateLimit');

      await provider.query({
        prompt: 'Hello',
        maxTokens: 1000,
        temperature: 0,
      });

      expect(updateRateLimitSpy).toHaveBeenCalled();
    });

    it('should throw ProviderError if parsed output contains error', async () => {
      provider.markAvailable();
      vi.spyOn(provider as any, 'spawnCLI').mockResolvedValue('Error output');
      vi.spyOn(provider as any, 'parseOutput').mockReturnValue({
        content: 'Error output',
        usage: { inputTokens: 0, outputTokens: 0 },
        error: 'CLI error occurred',
      });

      await expect(
        provider.query({
          prompt: 'Hello',
          maxTokens: 1000,
          temperature: 0,
        })
      ).rejects.toThrow(ProviderError);
    });

    it('should mark provider unavailable on error', async () => {
      provider.markAvailable();
      vi.spyOn(provider as any, 'spawnCLI').mockRejectedValue(new Error('CLI spawn failed'));

      await expect(
        provider.query({
          prompt: 'Hello',
          maxTokens: 1000,
          temperature: 0,
        })
      ).rejects.toThrow(ProviderError);

      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return true if CLI is available', async () => {
      vi.spyOn(provider as any, 'detectVersion').mockResolvedValue('1.0.0');

      const result = await provider.healthCheck();

      expect(result).toBe(true);
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return false and mark unavailable if version detection fails', async () => {
      vi.spyOn(provider as any, 'detectVersion').mockResolvedValue(null);

      const result = await provider.healthCheck();

      expect(result).toBe(false);
      expect(provider.isAvailable()).toBe(false);
    });

    it('should return false on error', async () => {
      vi.spyOn(provider as any, 'detectVersion').mockRejectedValue(new Error('Detection failed'));

      const result = await provider.healthCheck();

      expect(result).toBe(false);
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('spawnCLI', () => {
    it('should throw ProviderError if CLI command not found', async () => {
      // Mock execFile to simulate ENOENT error (command not found)
      const { execFile } = await import('child_process');
      const error: any = new Error('Command not found');
      error.code = 'ENOENT';

      vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
        callback(error, '', '');
        return {} as any;
      });

      await expect(
        provider['spawnCLI']('test prompt')
      ).rejects.toThrow(ProviderError);

      await expect(
        provider['spawnCLI']('test prompt')
      ).rejects.toThrow("command 'test-cli' not found");
    });

    it('should throw ProviderError on timeout', async () => {
      const error = new Error('Command timeout');

      await expect(
        provider['spawnCLI']('test prompt', { timeout: 1 })
      ).rejects.toThrow();
    });
  });

  describe('buildCLIArgs', () => {
    it('should return prompt as default argument', () => {
      const args = provider['buildCLIArgs']('test prompt');
      expect(args).toEqual(['test prompt']);
    });
  });
});
