/**
 * Codex CLI Provider (T022)
 *
 * Extends CLIProviderAdapter with Codex-specific implementation.
 * Handles `codex` command execution and output parsing.
 *
 * @see .specify/specs/027-multi-provider-cli-support/data-model.md Section 1.8
 * @see .specify/specs/027-multi-provider-cli-support/contracts/internal-api.md Section 3
 */

import { CLIProviderAdapter, ParsedCLIOutput } from './CLIProviderAdapter';
import { CodexOutputParser } from './CodexOutputParser';
import { ProviderId, QueryRequest } from '../../types';
import { registerProvider } from '../ProviderFactory';

/**
 * Codex CLI provider implementation
 * Wraps `codex` command-line tool
 */
export class CodexCLIProvider extends CLIProviderAdapter {
  readonly id: ProviderId = 'codex-cli';
  readonly name = 'Codex CLI';
  readonly model: string;
  private outputParser: CodexOutputParser;

  /**
   * Constructor
   * @param cliCommand - Command to execute (default: 'codex')
   * @param model - Model identifier (default: 'gpt-5')
   */
  constructor(cliCommand: string = 'codex', model: string = 'gpt-5') {
    super(cliCommand, model);
    this.model = model;
    this.outputParser = new CodexOutputParser();
  }

  /**
   * Get CLI command to execute
   * @returns CLI command path or name
   */
  getCLICommand(): string {
    return this.cliCommand;
  }

  /**
   * Parse Codex CLI output using CodexOutputParser
   * @param output - Raw stdout from Codex CLI
   * @returns Parsed content and usage
   */
  parseOutput(output: string): ParsedCLIOutput {
    return this.outputParser.parse(output);
  }

  /**
   * Format prompt for Codex CLI
   * Codex CLI may need JSON or structured format
   *
   * @param request - Query request with prompt and options
   * @returns Formatted prompt string
   */
  formatPrompt(request: QueryRequest): string {
    // Codex CLI accepts direct text prompts in exec mode
    // System prompt can be prepended if provided
    if (request.systemPrompt) {
      return `${request.systemPrompt}\n\n${request.prompt}`;
    }
    return request.prompt;
  }

  /**
   * Build CLI arguments for Codex
   * @param prompt - Formatted prompt
   * @returns Array of CLI arguments
   */
  protected buildCLIArgs(prompt: string): string[] {
    // Codex CLI format: codex exec --model <model> --prompt "<prompt>"
    const args = ['exec', '--model', this.model];

    // Add prompt
    args.push('--prompt', prompt);

    return args;
  }

  /**
   * Check if MCP servers are supported
   * Codex CLI doesn't support MCP
   *
   * @returns false (Codex CLI doesn't support MCP)
   */
  public supportsMCPServers(): boolean {
    return false;
  }

  /**
   * Check if web search is supported
   * Codex CLI has web search capability
   *
   * @returns true (Codex CLI supports web search)
   */
  public supportsWebSearch(): boolean {
    return true;
  }
}

// Register provider in factory
registerProvider('codex-cli', CodexCLIProvider as unknown as new (apiKey: string, model: string) => CLIProviderAdapter);
