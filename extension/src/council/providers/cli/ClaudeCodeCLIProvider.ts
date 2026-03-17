/**
 * Claude Code CLI Provider (T021)
 *
 * Extends CLIProviderAdapter with Claude-specific implementation.
 * Handles `claude` command execution and output parsing.
 *
 * @see .specify/specs/027-multi-provider-cli-support/data-model.md Section 1.7
 * @see .specify/specs/027-multi-provider-cli-support/contracts/internal-api.md Section 2
 */

import { CLIProviderAdapter, ParsedCLIOutput } from './CLIProviderAdapter';
import { ClaudeOutputParser } from './ClaudeOutputParser';
import { ProviderId, QueryRequest } from '../../types';
import { registerProvider } from '../ProviderFactory';

/**
 * Claude Code CLI provider implementation
 * Wraps `claude` command-line tool
 */
export class ClaudeCodeCLIProvider extends CLIProviderAdapter {
  readonly id: ProviderId = 'claude-cli';
  readonly name = 'Claude Code CLI';
  readonly model: string;
  private outputParser: ClaudeOutputParser;

  /**
   * Constructor
   * @param cliCommand - Command to execute (default: 'claude')
   * @param model - Model identifier (default: 'claude-opus-4')
   */
  constructor(cliCommand: string = 'claude', model: string = 'claude-opus-4') {
    super(cliCommand, model);
    this.model = model;
    this.outputParser = new ClaudeOutputParser();
  }

  /**
   * Get CLI command to execute
   * @returns CLI command path or name
   */
  getCLICommand(): string {
    return this.cliCommand;
  }

  /**
   * Parse Claude CLI output using ClaudeOutputParser
   * @param output - Raw stdout from Claude CLI
   * @returns Parsed content and usage
   */
  parseOutput(output: string): ParsedCLIOutput {
    return this.outputParser.parse(output);
  }

  /**
   * Format prompt for Claude CLI
   * Claude CLI accepts direct text prompts
   *
   * @param request - Query request with prompt and options
   * @returns Formatted prompt string
   */
  formatPrompt(request: QueryRequest): string {
    // If system prompt provided, prepend it
    if (request.systemPrompt) {
      return `${request.systemPrompt}\n\n${request.prompt}`;
    }
    return request.prompt;
  }

  /**
   * Build CLI arguments for Claude
   * @param prompt - Formatted prompt
   * @returns Array of CLI arguments
   */
  protected buildCLIArgs(prompt: string): string[] {
    // Claude CLI format: claude --model <model> --prompt "<prompt>"
    const args = ['--model', this.model];

    // Add prompt (pass as argument, not stdin)
    args.push('--prompt', prompt);

    return args;
  }

  /**
   * Check if MCP servers are supported
   * Claude CLI supports MCP servers
   *
   * @returns true (Claude CLI supports MCP)
   */
  public supportsMCPServers(): boolean {
    return true;
  }

  /**
   * Check if web search is supported
   * Claude CLI doesn't have native web search
   *
   * @returns false (Claude CLI doesn't support web search)
   */
  public supportsWebSearch(): boolean {
    return false;
  }
}

// Register provider in factory
registerProvider('claude-cli', ClaudeCodeCLIProvider as unknown as new (apiKey: string, model: string) => CLIProviderAdapter);
