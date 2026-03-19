/**
 * Unit tests for CredentialRedactor
 * Task: T068
 *
 * Tests verify:
 * - API keys, tokens, and secrets are redacted
 * - Non-sensitive content is preserved
 * - Various credential patterns are detected
 */

import { describe, it, expect } from 'vitest';
import {
  redactCredentials,
  containsCredentials,
  type ConversationMessage,
} from '../../../../extension/src/council/providers/CredentialRedactor';

describe('CredentialRedactor (T068)', () => {
  describe('redactCredentials', () => {
    it('should redact Anthropic API keys', () => {
      const history: ConversationMessage[] = [
        {
          role: 'user',
          content: 'My API key is OPENAI_API_KEY_REDACTED',
        },
      ];

      const redacted = redactCredentials(history);

      expect(redacted[0].content).not.toContain('OPENAI_API_KEY_REDACTED');
      expect(redacted[0].content).toContain('[REDACTED:Anthropic API key]');
    });

    it('should redact OpenAI API keys', () => {
      const history: ConversationMessage[] = [
        {
          role: 'user',
          content: 'Use sk-proj-REDACTED',
        },
      ];

      const redacted = redactCredentials(history);

      expect(redacted[0].content).not.toContain('sk-proj-REDACTED');
      expect(redacted[0].content).toContain('[REDACTED:OpenAI API key]');
    });

    it('should redact GitHub tokens', () => {
      const history: ConversationMessage[] = [
        {
          role: 'user',
          content: 'Token: gh_REDACTED',
        },
      ];

      const redacted = redactCredentials(history);

      expect(redacted[0].content).not.toContain('gh_REDACTED');
      expect(redacted[0].content).toContain('[REDACTED:GitHub token]');
    });

    it('should redact JWT tokens', () => {
      const history: ConversationMessage[] = [
        {
          role: 'user',
          content:
            'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature',
        },
      ];

      const redacted = redactCredentials(history);

      expect(redacted[0].content).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(redacted[0].content).toContain('[REDACTED:JWT token]');
    });

    it('should redact AWS credentials', () => {
      const history: ConversationMessage[] = [
        {
          role: 'user',
          content: 'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        },
      ];

      const redacted = redactCredentials(history);

      expect(redacted[0].content).not.toContain('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
      expect(redacted[0].content).toContain('[REDACTED');
    });

    it('should preserve environment variable names while redacting values', () => {
      const history: ConversationMessage[] = [
        {
          role: 'user',
          content: 'Set API_KEY=secretvalue123456',
        },
      ];

      const redacted = redactCredentials(history);

      expect(redacted[0].content).toContain('API_KEY=');
      expect(redacted[0].content).not.toContain('secretvalue123456');
      expect(redacted[0].content).toContain('[REDACTED');
    });

    it('should preserve non-sensitive content', () => {
      const history: ConversationMessage[] = [
        {
          role: 'user',
          content: 'How do I authenticate with the API?',
        },
        {
          role: 'assistant',
          content: 'To authenticate, you need to provide your API key in the Authorization header.',
        },
      ];

      const redacted = redactCredentials(history);

      expect(redacted[0].content).toBe('How do I authenticate with the API?');
      expect(redacted[1].content).toBe(
        'To authenticate, you need to provide your API key in the Authorization header.'
      );
    });

    it('should redact multiple credentials in the same message', () => {
      const history: ConversationMessage[] = [
        {
          role: 'user',
          content: 'Use sk-test1234567890123 and gh_REDACTED',
        },
      ];

      const redacted = redactCredentials(history);

      expect(redacted[0].content).not.toContain('sk-test1234567890123');
      expect(redacted[0].content).not.toContain('gh_REDACTED');
      expect(redacted[0].content).toContain('[REDACTED');
    });

    it('should preserve message structure', () => {
      const history: ConversationMessage[] = [
        {
          role: 'user',
          content: 'Test message',
        },
        {
          role: 'assistant',
          content: 'Test response',
        },
      ];

      const redacted = redactCredentials(history);

      expect(redacted).toHaveLength(2);
      expect(redacted[0].role).toBe('user');
      expect(redacted[1].role).toBe('assistant');
    });

    it('should handle empty conversation history', () => {
      const history: ConversationMessage[] = [];

      const redacted = redactCredentials(history);

      expect(redacted).toHaveLength(0);
    });

    it('should redact passwords', () => {
      const history: ConversationMessage[] = [
        {
          role: 'user',
          content: 'PASSWORD=MySecretPass123!',
        },
      ];

      const redacted = redactCredentials(history);

      expect(redacted[0].content).not.toContain('MySecretPass123!');
      expect(redacted[0].content).toContain('[REDACTED:password]');
    });

    it('should redact Bearer tokens', () => {
      const history: ConversationMessage[] = [
        {
          role: 'user',
          content: 'Authorization: Bearer abc123xyz789token',
        },
      ];

      const redacted = redactCredentials(history);

      expect(redacted[0].content).not.toContain('Bearer abc123xyz789token');
      expect(redacted[0].content).toContain('[REDACTED:Bearer token]');
    });
  });

  describe('containsCredentials', () => {
    it('should detect API keys', () => {
      expect(containsCredentials('OPENAI_API_KEY_REDACTED')).toBe(true);
      expect(containsCredentials('No credentials here')).toBe(false);
    });

    it('should detect GitHub tokens', () => {
      expect(containsCredentials('gh_REDACTED')).toBe(true);
    });

    it('should detect JWT tokens', () => {
      expect(
        containsCredentials(
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
        )
      ).toBe(true);
    });

    it('should detect environment variables with secrets', () => {
      expect(containsCredentials('API_KEY=secretvalue12345')).toBe(true);
      expect(containsCredentials('API_KEY=short')).toBe(false); // Too short to be a real key
    });

    it('should return false for clean content', () => {
      expect(containsCredentials('What is TypeScript?')).toBe(false);
      expect(containsCredentials('How do I use the API?')).toBe(false);
    });
  });
});
