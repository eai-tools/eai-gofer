/**
 * CodexOutputParser Unit Tests (T015)
 *
 * Tests for Codex CLI output parsing with JSON format.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CodexOutputParser } from '../../../../../extension/src/council/providers/cli/CodexOutputParser';

describe('CodexOutputParser', () => {
  let parser: CodexOutputParser;

  beforeEach(() => {
    parser = new CodexOutputParser();
  });

  describe('parse', () => {
    it('should parse valid JSON output with usage', () => {
      const output = JSON.stringify({
        type: 'response',
        content: 'Hello! How can I help?',
        usage: {
          input_tokens: 8500,
          output_tokens: 2100,
        },
      });

      const result = parser.parse(output);

      expect(result.content).toBe('Hello! How can I help?');
      expect(result.usage.inputTokens).toBe(8500);
      expect(result.usage.outputTokens).toBe(2100);
      expect(result.error).toBeUndefined();
    });

    it('should handle JSON with "text" field instead of "content"', () => {
      const output = JSON.stringify({
        text: 'Response from text field',
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = parser.parse(output);

      expect(result.content).toBe('Response from text field');
    });

    it('should handle JSON with "response" field', () => {
      const output = JSON.stringify({
        response: 'Response from response field',
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = parser.parse(output);

      expect(result.content).toBe('Response from response field');
    });

    it('should handle JSON without usage field', () => {
      const output = JSON.stringify({
        content: 'Response without usage',
      });

      const result = parser.parse(output);

      expect(result.content).toBe('Response without usage');
      expect(result.usage.inputTokens).toBe(0);
      expect(result.usage.outputTokens).toBe(0);
    });

    it('should fallback to plain text for non-JSON output', () => {
      const output = `Plain text response from Codex CLI`;

      const result = parser.parse(output);

      expect(result.content).toBe('Plain text response from Codex CLI');
      expect(result.usage.inputTokens).toBe(0);
      expect(result.usage.outputTokens).toBe(0);
    });

    it('should detect authentication errors in JSON', () => {
      const output = JSON.stringify({
        error: 'Not authenticated. Please login.',
      });

      const result = parser.parse(output);

      expect(result.content).toBe('');
      // Parser detects "login" in the error string and returns the standard auth message
      expect(result.error).toContain('Not authenticated');
      expect(result.error).toContain('codex login');
    });

    it('should detect authentication errors in plain text', () => {
      const output = `Error: not logged in. Run: codex login`;

      const result = parser.parse(output);

      expect(result.error).toContain('Not authenticated');
    });

    it('should detect rate limit errors', () => {
      const output = `rate limit exceeded`;

      const result = parser.parse(output);

      expect(result.error).toContain('Rate limited');
    });

    it('should handle JSON error with nested message', () => {
      const output = JSON.stringify({
        error: {
          message: 'Detailed error message',
          code: 500,
        },
      });

      const result = parser.parse(output);

      expect(result.error).toBe('Detailed error message');
    });

    it('should handle JSON type: "error"', () => {
      const output = JSON.stringify({
        type: 'error',
        message: 'Request failed',
      });

      const result = parser.parse(output);

      expect(result.error).toBe('Request failed');
    });

    it('should handle empty output', () => {
      const result = parser.parse('');

      expect(result.content).toBe('');
      expect(result.usage.inputTokens).toBe(0);
      expect(result.usage.outputTokens).toBe(0);
    });

    it('should trim whitespace from non-JSON content', () => {
      const output = `

      Plain text with whitespace

      `;

      const result = parser.parse(output);

      expect(result.content).toBe('Plain text with whitespace');
    });
  });

  describe('extractTokenUsage', () => {
    it('should extract usage from JSON', () => {
      const output = JSON.stringify({
        usage: {
          input_tokens: 5000,
          output_tokens: 1500,
        },
      });

      const usage = parser.extractTokenUsage(output);

      expect(usage.inputTokens).toBe(5000);
      expect(usage.outputTokens).toBe(1500);
    });

    it('should return zeros for non-JSON output', () => {
      const output = `Plain text without usage`;

      const usage = parser.extractTokenUsage(output);

      expect(usage.inputTokens).toBe(0);
      expect(usage.outputTokens).toBe(0);
    });

    it('should return zeros when usage field is missing', () => {
      const output = JSON.stringify({
        content: 'Response without usage',
      });

      const usage = parser.extractTokenUsage(output);

      expect(usage.inputTokens).toBe(0);
      expect(usage.outputTokens).toBe(0);
    });

    it('should return zeros when usage field is not an object', () => {
      const output = JSON.stringify({
        usage: 'invalid',
      });

      const usage = parser.extractTokenUsage(output);

      expect(usage.inputTokens).toBe(0);
      expect(usage.outputTokens).toBe(0);
    });

    it('should handle partial usage data', () => {
      const output = JSON.stringify({
        usage: {
          input_tokens: 100,
        },
      });

      const usage = parser.extractTokenUsage(output);

      expect(usage.inputTokens).toBe(100);
      expect(usage.outputTokens).toBe(0);
    });
  });

  describe('detectErrors', () => {
    it('should detect authentication errors with "authentication"', () => {
      const error = parser.detectErrors('authentication failed');

      expect(error).toContain('Not authenticated');
      expect(error).toContain('codex login');
    });

    it('should detect authentication errors with "login"', () => {
      const error = parser.detectErrors('Please login to continue');

      expect(error).toContain('Not authenticated');
    });

    it('should detect authentication errors with "not logged in"', () => {
      const error = parser.detectErrors('not logged in');

      expect(error).toContain('Not authenticated');
    });

    it('should detect rate limit errors', () => {
      const error = parser.detectErrors('rate limit exceeded');

      expect(error).toContain('Rate limited');
    });

    it('should detect rate limit errors with "too many requests"', () => {
      const error = parser.detectErrors('too many requests');

      expect(error).toContain('Rate limited');
    });

    it('should extract error from JSON error field (string)', () => {
      const output = JSON.stringify({
        error: 'Custom error message',
      });

      const error = parser.detectErrors(output);

      expect(error).toBe('Custom error message');
    });

    it('should extract error from JSON error.message field', () => {
      const output = JSON.stringify({
        error: {
          message: 'Nested error message',
          code: 'ERR_CODE',
        },
      });

      const error = parser.detectErrors(output);

      expect(error).toBe('Nested error message');
    });

    it('should handle JSON error object without message', () => {
      const output = JSON.stringify({
        error: {
          code: 500,
        },
      });

      const error = parser.detectErrors(output);

      expect(error).toBe('Unknown error');
    });

    it('should extract error from JSON type: "error"', () => {
      const output = JSON.stringify({
        type: 'error',
        message: 'Type-based error',
      });

      const error = parser.detectErrors(output);

      expect(error).toBe('Type-based error');
    });

    it('should detect generic errors with "Error:" prefix in plain text', () => {
      const error = parser.detectErrors('Error: Connection failed');

      expect(error).toBe('Connection failed');
    });

    it('should detect lowercase "error:" prefix', () => {
      const error = parser.detectErrors('error: invalid request');

      expect(error).toBe('invalid request');
    });

    it('should return null for successful JSON output', () => {
      const output = JSON.stringify({
        content: 'Valid response',
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const error = parser.detectErrors(output);

      expect(error).toBeNull();
    });

    it('should return null for successful plain text output', () => {
      const error = parser.detectErrors('This is a normal response without errors');

      expect(error).toBeNull();
    });

    it('should return generic message if no specific error found after Error:', () => {
      const error = parser.detectErrors('Error:');

      expect(error).toBe('Unknown error occurred');
    });
  });
});
