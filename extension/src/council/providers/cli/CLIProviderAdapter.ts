/**
 * CLI Provider Adapter - Base Class (T012)
 *
 * Abstract base adapter implementing LLMProvider interface for CLI-based providers.
 * Manages CLI process spawning, output parsing, and error handling.
 *
 * @see .specify/specs/027-multi-provider-cli-support/contracts/internal-api.md Section 1
 * @see .specify/specs/027-multi-provider-cli-support/data-model.md Section 1.6
 */

import { BaseLLMProvider } from '../LLMProvider';
import {
  ProviderId,
  QueryRequest,
  QueryResponse,
} from '../../types';
import { ProviderError, ProviderErrorCode } from '../ProviderError';
import { promisify } from 'util';
import { execFile as execFileCallback } from 'child_process';

const execFile = promisify(execFileCallback);

// CLI operation timeouts and limits
const CLI_QUERY_TIMEOUT_MS = 120000; // 2 minutes
const CLI_HEALTH_CHECK_TIMEOUT_MS = 5000; // 5 seconds
const CLI_MAX_BUFFER_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Parsed CLI output structure
 */
export interface ParsedCLIOutput {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}

/**
 * CLI output parser interface
 */
export interface CLIOutputParser {
  parse(output: string): ParsedCLIOutput;
  extractTokenUsage(output: string): { inputTokens: number; outputTokens: number };
  detectErrors(output: string): string | null;
}

/**
 * Abstract base adapter for CLI-based LLM providers
 * Extends BaseLLMProvider to bridge terminal I/O workflow to API-like interface
 */
export abstract class CLIProviderAdapter extends BaseLLMProvider {
  // Abstract properties to be implemented by subclasses
  abstract readonly id: ProviderId;
  abstract readonly name: string;
  abstract readonly model: string;

  protected readonly cliCommand: string;
  protected conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Mutex to prevent concurrent query execution (R16: Race condition protection)
  private queryLock: Promise<void> = Promise.resolve();

  /**
   * Constructor
   * @param cliCommand - CLI command to spawn (e.g., "claude", "codex")
   * @param model - Model identifier
   */
  constructor(cliCommand: string, model: string) {
    super();
    this.cliCommand = cliCommand;
  }

  /**
   * Get CLI command to execute
   * Abstract method to be implemented by subclasses
   */
  abstract getCLICommand(): string;

  /**
   * Parse CLI output to extract content and usage
   * Abstract method to be implemented by subclasses
   */
  abstract parseOutput(output: string): ParsedCLIOutput;

  /**
   * Format prompt for CLI input
   * Abstract method to be implemented by subclasses
   */
  abstract formatPrompt(request: QueryRequest): string;

  /**
   * Query provider via CLI process
   * Implements LLMProvider.query() by spawning CLI, sending prompt, capturing output
   *
   * Protected by mutex lock to prevent concurrent query race conditions (R16, R17)
   *
   * @param request - Query parameters (prompt, maxTokens, temperature, systemPrompt)
   * @returns Promise<QueryResponse> with content, usage, model, providerId
   * @throws ProviderError on CLI spawn failure, timeout, or parsing error
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    // Acquire lock to ensure sequential execution (R16: Prevent conversation history corruption)
    const previousLock = this.queryLock;
    let releaseLock: () => void;

    // Create new lock promise
    this.queryLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    try {
      // Wait for previous query to complete (R17: In-flight query protection)
      await previousLock;

      if (!this.isAvailable()) {
        throw new ProviderError(
          `${this.name} is not available`,
          ProviderErrorCode.UNKNOWN,
          this.id
        );
      }

      // Format prompt for CLI
      const formattedPrompt = this.formatPrompt(request);

      // Spawn CLI and capture output
      const rawOutput = await this.spawnCLI(formattedPrompt, {
        timeout: CLI_QUERY_TIMEOUT_MS,
      });

      // Parse output
      const parsed = this.parseOutput(rawOutput);

      if (parsed.error) {
        throw new ProviderError(
          `${this.name} error: ${parsed.error}`,
          ProviderErrorCode.API_ERROR,
          this.id
        );
      }

      // Update conversation history (now protected by mutex)
      this.conversationHistory.push(
        { role: 'user', content: request.prompt },
        { role: 'assistant', content: parsed.content }
      );

      // Update rate limit
      this.updateRateLimit();

      // Return response
      return {
        content: parsed.content,
        usage: {
          inputTokens: parsed.usage.inputTokens,
          outputTokens: parsed.usage.outputTokens,
        },
        model: this.model,
        providerId: this.id,
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.markUnavailable(errorMessage);

      throw new ProviderError(
        `${this.name} query failed: ${errorMessage}`,
        ProviderErrorCode.API_ERROR,
        this.id
      );
    } finally {
      // Release lock for next query
      releaseLock!();
    }
  }

  /**
   * Check CLI availability and authentication
   * Implements LLMProvider.healthCheck() by verifying CLI installation and auth
   *
   * @returns Promise<boolean> - true if CLI is installed, authenticated, and working
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Detect version to verify CLI is installed
      const version = await this.detectVersion();

      if (!version) {
        this.markUnavailable(`${this.name} not found. Install it to use this provider.`);
        return false;
      }

      // If we got a version, mark as available
      this.markAvailable();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.markUnavailable(`Health check failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Spawn CLI process and send prompt
   * Protected helper for query() implementation
   *
   * @param prompt - The formatted prompt text
   * @param options - CLI-specific options (timeout, etc.)
   * @returns Promise<string> - Raw CLI output
   * @throws ProviderError on spawn failure or timeout
   */
  protected async spawnCLI(
    prompt: string,
    options: { timeout?: number } = {}
  ): Promise<string> {
    const command = this.getCLICommand();
    const args = this.buildCLIArgs(prompt);

    try {
      const { stdout, stderr } = await execFile(command, args, {
        timeout: options.timeout || CLI_QUERY_TIMEOUT_MS,
        maxBuffer: CLI_MAX_BUFFER_BYTES,
      });

      // Check for errors in stderr
      if (stderr) {
        const error = this.parseOutput(stderr).error;
        if (error) {
          throw new ProviderError(
            `${this.name} stderr: ${error}`,
            ProviderErrorCode.API_ERROR,
            this.id
          );
        }
      }

      return stdout;
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Check if it's a command not found error
        if ('code' in error && error.code === 'ENOENT') {
          throw new ProviderError(
            `${this.name} command '${command}' not found. Please install it.`,
            ProviderErrorCode.NOT_CONFIGURED,
            this.id
          );
        }

        // Check for timeout
        if (error.message.includes('timeout')) {
          throw new ProviderError(
            `${this.name} query timed out`,
            ProviderErrorCode.TIMEOUT,
            this.id
          );
        }
      }

      throw error;
    }
  }

  /**
   * Build CLI arguments from prompt
   * Default implementation passes prompt as stdin
   * Subclasses can override for provider-specific argument formatting
   *
   * @param prompt - The formatted prompt
   * @returns Array of CLI arguments
   */
  protected buildCLIArgs(prompt: string): string[] {
    // Default: pass prompt directly as argument
    // Subclasses should override this for provider-specific formatting
    return [prompt];
  }

  /**
   * Detect CLI version
   * Used during health check to verify compatibility
   *
   * @returns Promise<string | null> - Version string or null if detection fails
   */
  protected async detectVersion(): Promise<string | null> {
    try {
      const command = this.getCLICommand();
      const { stdout } = await execFile(command, ['--version'], {
        timeout: CLI_HEALTH_CHECK_TIMEOUT_MS,
      });

      // Extract version from output (e.g., "claude 1.2.0" or "version 1.2.0")
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
      return versionMatch ? versionMatch[1] : stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Map CLI exit codes to ProviderError types
   *
   * @param exitCode - CLI process exit code
   * @param stderr - Error output from CLI
   * @returns ProviderError with appropriate error type and message
   */
  protected mapExitCodeToError(exitCode: number, stderr: string): ProviderError {
    // Common exit codes
    if (exitCode === 127) {
      return new ProviderError(
        `${this.name} not found`,
        ProviderErrorCode.NOT_CONFIGURED,
        this.id
      );
    }

    if (exitCode === 1) {
      return new ProviderError(
        `${this.name} error: ${stderr}`,
        ProviderErrorCode.API_ERROR,
        this.id
      );
    }

    return new ProviderError(
      `${this.name} exited with code ${exitCode}: ${stderr}`,
      ProviderErrorCode.API_ERROR,
      this.id
    );
  }

  /**
   * Clean up active CLI process
   * Called on error, timeout, or session end
   */
  protected cleanup(): void {
    // Clear conversation history
    this.conversationHistory = [];
  }

  /**
   * Get current conversation history (R1: For preservation across provider switches)
   * @returns Copy of conversation history array
   */
  getConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return [...this.conversationHistory];
  }

  /**
   * Restore conversation history (R1: After provider switch)
   * @param history - Conversation history to restore
   */
  setConversationHistory(history: Array<{ role: 'user' | 'assistant'; content: string }>): void {
    this.conversationHistory = [...history];
  }

  /**
   * Check if CLI provider supports MCP servers
   * Default implementation returns false
   * Providers can override to enable capability
   *
   * @returns boolean - true if MCP servers are supported
   */
  public supportsMCPServers(): boolean {
    return false;
  }

  /**
   * Check if CLI provider supports web search
   * Default implementation returns false
   * Providers can override to enable capability
   *
   * @returns boolean - true if web search is supported
   */
  public supportsWebSearch(): boolean {
    return false;
  }
}
