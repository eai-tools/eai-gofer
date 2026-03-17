/**
 * CLI Output Parser Interface (T013)
 *
 * Interface definition for parsing CLI provider outputs.
 * Each CLI provider implements this to extract content, usage, and errors.
 *
 * @see .specify/specs/027-multi-provider-cli-support/contracts/internal-api.md Section 7
 * @see .specify/specs/027-multi-provider-cli-support/data-model.md Section 1.5
 */

/**
 * Parsed CLI output structure
 */
export interface ParsedCLIOutput {
  content: string;
  usage: { inputTokens: number; outputTokens: number };
  error?: string;
}

/**
 * Output parser interface for CLI responses
 * Provider-specific parsers implement this to handle different output formats
 */
export interface CLIOutputParser {
  /**
   * Parse raw CLI output to extract response content and usage
   *
   * @param output - Raw stdout from CLI process
   * @returns Parsed output with content and usage
   */
  parse(output: string): ParsedCLIOutput;

  /**
   * Extract token usage from output
   *
   * @param output - Raw output containing usage information
   * @returns Token usage breakdown
   */
  extractTokenUsage(output: string): { inputTokens: number; outputTokens: number };

  /**
   * Detect and extract error messages from output
   *
   * @param output - Raw output to check for errors
   * @returns Error message or null if no error detected
   */
  detectErrors(output: string): string | null;
}
