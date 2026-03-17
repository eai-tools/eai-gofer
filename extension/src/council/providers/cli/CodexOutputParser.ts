/**
 * Codex CLI Output Parser (T015)
 *
 * Parses Codex CLI JSON/TUI formatted output.
 * Handles both JSON responses and fallback TUI-formatted text.
 *
 * @see .specify/specs/027-multi-provider-cli-support/data-model.md Section 1.5
 * @see .specify/specs/027-multi-provider-cli-support/contracts/internal-api.md Section 7
 */

import { CLIOutputParser, ParsedCLIOutput } from './CLIOutputParser';

/**
 * Codex CLI output parser
 * Handles JSON responses and TUI-formatted text
 */
export class CodexOutputParser implements CLIOutputParser {
  /**
   * Parse Codex CLI output
   * Format (JSON):
   * ```json
   * {
   *   "type": "response",
   *   "content": "<response text>",
   *   "usage": { "input_tokens": 8500, "output_tokens": 2100 }
   * }
   * ```
   *
   * @param output - Raw CLI stdout
   * @returns Parsed content and usage
   */
  parse(output: string): ParsedCLIOutput {
    // Check for errors first
    const error = this.detectErrors(output);
    if (error) {
      return {
        content: '',
        usage: { inputTokens: 0, outputTokens: 0 },
        error,
      };
    }

    // Try JSON parsing first
    try {
      const json = JSON.parse(output);

      // Extract content
      const content = json.content || json.text || json.response || '';

      // Extract usage
      const usage = this.extractTokenUsageFromJSON(json);

      return {
        content,
        usage,
      };
    } catch {
      // JSON parse failed, treat entire output as content
      // This handles TUI-formatted text responses
      return {
        content: output.trim(),
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    }
  }

  /**
   * Extract token usage from Codex output
   * Handles both JSON and TUI formats
   *
   * @param output - Raw output with usage information
   * @returns Token usage breakdown
   */
  extractTokenUsage(output: string): { inputTokens: number; outputTokens: number } {
    // Try JSON parsing
    try {
      const json = JSON.parse(output);
      return this.extractTokenUsageFromJSON(json);
    } catch {
      // Not JSON, return zeros
      return { inputTokens: 0, outputTokens: 0 };
    }
  }

  /**
   * Extract token usage from parsed JSON object
   *
   * @param json - Parsed JSON response
   * @returns Token usage breakdown
   */
  private extractTokenUsageFromJSON(json: unknown): { inputTokens: number; outputTokens: number } {
    if (typeof json !== 'object' || json === null) {
      return { inputTokens: 0, outputTokens: 0 };
    }

    const obj = json as Record<string, unknown>;
    const usage = obj.usage as Record<string, unknown> | undefined;

    if (!usage || typeof usage !== 'object') {
      return { inputTokens: 0, outputTokens: 0 };
    }

    const inputTokens = typeof usage.input_tokens === 'number' ? usage.input_tokens : 0;
    const outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens : 0;

    return { inputTokens, outputTokens };
  }

  /**
   * Detect errors in Codex CLI output
   * Checks for common error patterns in JSON and text
   *
   * @param output - Raw output to check
   * @returns Error message or null
   */
  detectErrors(output: string): string | null {
    // Check for authentication errors in plain text
    if (
      output.includes('authentication') ||
      output.includes('login') ||
      output.includes('not logged in')
    ) {
      return 'Not authenticated. Run: codex login';
    }

    // Check for rate limiting
    if (output.includes('rate limit') || output.includes('too many requests')) {
      return 'Rate limited. Please try again later.';
    }

    // Try to parse as JSON to check for error field
    try {
      const json = JSON.parse(output);
      if (typeof json === 'object' && json !== null) {
        const obj = json as Record<string, unknown>;

        // Check for error field
        if (obj.error) {
          if (typeof obj.error === 'string') {
            return obj.error;
          }
          if (typeof obj.error === 'object' && obj.error !== null) {
            const errorObj = obj.error as Record<string, unknown>;
            return (errorObj.message as string) || 'Unknown error';
          }
        }

        // Check for type: "error"
        if (obj.type === 'error' && typeof obj.message === 'string') {
          return obj.message;
        }
      }
    } catch {
      // Not JSON, check for error prefix in text
      if (output.includes('Error:') || output.startsWith('error:')) {
        const errorMatch = output.match(/[Ee]rror:\s*(.+?)(?:\n|$)/);
        return errorMatch ? errorMatch[1].trim() : 'Unknown error occurred';
      }
    }

    return null;
  }
}
