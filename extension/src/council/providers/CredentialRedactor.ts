/**
 * Credential Redactor
 *
 * Redacts sensitive credentials from conversation history before
 * transferring between providers (Feature 028, Task T068).
 *
 * Patterns detected:
 * - API keys (sk-, ghp-, etc.)
 * - JWT tokens
 * - AWS credentials
 * - Environment variable values
 * - Generic secrets and passwords
 */

/**
 * Conversation message format
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Credential patterns to redact
 */
const CREDENTIAL_PATTERNS = [
  // Anthropic API keys (sk- followed by at least 16 chars for testing, real keys are longer)
  { pattern: /sk-[a-zA-Z0-9]{16,}/g, name: 'Anthropic API key' },

  // OpenAI API keys
  { pattern: /sk-proj-[a-zA-Z0-9]{20,}/g, name: 'OpenAI API key' },

  // GitHub tokens
  { pattern: /ghp_[a-zA-Z0-9]{20,}/g, name: 'GitHub token' },
  { pattern: /github_pat_[a-zA-Z0-9_]{40,}/g, name: 'GitHub PAT' },

  // JWT tokens (three base64 parts separated by dots)
  { pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, name: 'JWT token' },

  // AWS credentials
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS access key' },
  {
    pattern:
      /(?:AWS_SECRET_ACCESS_KEY|aws_secret_access_key)\s*[=:]\s*["']?([a-zA-Z0-9+/]{40})["']?/gi,
    name: 'AWS secret key',
  },

  // Generic API keys in env var format
  {
    pattern: /(?:API_KEY|APIKEY|SECRET_KEY|SECRET|TOKEN)\s*[=:]\s*["']?([a-zA-Z0-9_-]{12,})["']?/gi,
    name: 'API key',
  },

  // Password patterns
  {
    pattern: /(?:PASSWORD|PASS|PWD)\s*[=:]\s*["']?([^\s"']{10,})["']?/gi,
    name: 'password',
  },

  // Bearer tokens
  { pattern: /Bearer\s+[a-zA-Z0-9_-]{16,}/gi, name: 'Bearer token' },
];

/**
 * Redact credentials from a single message
 */
function redactMessageContent(content: string): string {
  let redactedContent = content;

  for (const { pattern, name } of CREDENTIAL_PATTERNS) {
    redactedContent = redactedContent.replace(pattern, (match) => {
      // For env var patterns with capture groups, preserve variable name
      if (match.includes('=') || match.includes(':')) {
        const parts = match.split(/[=:]/);
        return `${parts[0]}=[REDACTED:${name}]`;
      }
      // For simple patterns, just replace with redaction marker
      return `[REDACTED:${name}]`;
    });
  }

  return redactedContent;
}

/**
 * Redact credentials from conversation history
 *
 * @param history - Conversation history array
 * @returns Redacted conversation history
 */
export function redactCredentials(history: ConversationMessage[]): ConversationMessage[] {
  return history.map((message) => ({
    ...message,
    content: redactMessageContent(message.content),
  }));
}

/**
 * Check if content contains potential credentials
 * (useful for validation/testing)
 */
export function containsCredentials(content: string): boolean {
  return CREDENTIAL_PATTERNS.some(({ pattern }) => {
    // Create a new RegExp to avoid state issues with global flag
    const testPattern = new RegExp(pattern.source, pattern.flags);
    return testPattern.test(content);
  });
}
