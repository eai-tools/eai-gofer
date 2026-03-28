---
feature: 027-multi-provider-cli-support
contract-type: internal-api
created: 2026-03-16
updated: 2026-03-16
status: draft
---

# Internal API Contracts: Multi-Provider CLI Support

This document specifies internal TypeScript API contracts for Multi-Provider CLI
Support, extending Gofer's LLM provider abstraction to support CLI-based
providers (Claude Code CLI and Codex CLI) alongside existing API providers.

## Contract Overview

| Contract                                | Type      | User Stories Served | Purpose                                                   |
| --------------------------------------- | --------- | ------------------- | --------------------------------------------------------- |
| **CLIProviderAdapter**                  | Interface | US-1, US-2, US-3    | Base adapter translating CLI I/O to LLMProvider interface |
| **ClaudeCodeCLIProvider**               | Class     | US-1, US-2, US-3    | Claude CLI-specific implementation                        |
| **CodexCLIProvider**                    | Class     | US-1, US-2, US-3    | Codex CLI-specific implementation                         |
| **ProviderFactory.createCLIProvider()** | Method    | US-1, US-2          | Factory method for CLI provider instantiation             |
| **ConfigManager CLI Getters**           | Methods   | US-1, US-4          | Settings access for provider selection and configuration  |
| **CLIHealthChecker**                    | Interface | US-3                | Provider availability and version detection               |
| **CLIOutputParser**                     | Interface | US-2, US-5          | Provider-specific output parsing                          |
| **CLIUsageAdapter**                     | Interface | US-5                | Token usage tracking from CLI logs                        |

---

## 1. CLIProviderAdapter Interface

**Description**: Abstract base adapter implementing LLMProvider interface for
CLI-based providers. Manages terminal I/O, process spawning, and output parsing.

**Location**: `extension/src/providers/cli/CLIProviderAdapter.ts`

**Extends**: `BaseLLMProvider` (from LLMProvider.ts)

**Serves**:

- FR-001 (Provider abstraction for CLI)
- FR-013 (CLI process failure handling)
- NFR-007 (LLMProvider interface compatibility)

### Interface Definition

```typescript
/**
 * Base adapter for CLI-based LLM providers
 * Extends BaseLLMProvider to bridge terminal I/O workflow to API-like interface
 */
export abstract class CLIProviderAdapter extends BaseLLMProvider {
  // Abstract properties to be implemented by subclasses
  abstract readonly id: ProviderId;
  abstract readonly name: string;
  abstract readonly model: string;
  abstract readonly cliCommand: string;

  // Protected dependencies
  protected terminalManager: TerminalManager;
  protected outputParser: CLIOutputParser;
  protected usageAdapter: CLIUsageAdapter;

  // Session state
  protected conversationHistory: ConversationMessage[];
  protected activeProcess: IPty | null;

  /**
   * Constructor
   * @param cliCommand - CLI command to spawn (e.g., "claude", "codex")
   * @param model - Model identifier
   * @param terminalManager - Terminal process manager
   */
  constructor(
    cliCommand: string,
    model: string,
    terminalManager: TerminalManager
  );

  /**
   * Query provider via CLI process
   * Implements LLMProvider.query() by spawning CLI, sending prompt, capturing output
   *
   * @param request - Query parameters (prompt, maxTokens, temperature, systemPrompt)
   * @returns Promise<QueryResponse> with content, usage, model, providerId
   * @throws ProviderError on CLI spawn failure, timeout, or parsing error
   */
  abstract query(request: QueryRequest): Promise<QueryResponse>;

  /**
   * Check CLI availability and authentication
   * Implements LLMProvider.healthCheck() by verifying CLI installation and auth
   *
   * @returns Promise<boolean> - true if CLI is installed, authenticated, and working
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Spawn CLI process and send prompt
   * Protected helper for query() implementation
   *
   * @param prompt - The prompt text
   * @param options - CLI-specific options (model, temperature, etc.)
   * @returns Promise<string> - Raw CLI output
   * @throws ProviderError on spawn failure or timeout
   */
  protected spawnCLI(prompt: string, options: CLIQueryOptions): Promise<string>;

  /**
   * Parse CLI output to extract content and usage
   * Delegates to provider-specific outputParser
   *
   * @param rawOutput - Raw stdout from CLI
   * @returns Parsed content and token usage
   * @throws ProviderError on parse failure
   */
  protected parseOutput(rawOutput: string): {
    content: string;
    usage: QueryUsage;
  };

  /**
   * Detect CLI version
   * Used during health check to verify compatibility
   *
   * @returns Promise<string | null> - Version string or null if detection fails
   */
  protected detectVersion(): Promise<string | null>;

  /**
   * Map CLI exit codes to ProviderError types
   *
   * @param exitCode - CLI process exit code
   * @param stderr - Error output from CLI
   * @returns ProviderError with appropriate error type and message
   */
  protected mapExitCodeToError(exitCode: number, stderr: string): ProviderError;

  /**
   * Clean up active CLI process
   * Called on error, timeout, or session end
   */
  protected cleanup(): void;
}
```

### Types

```typescript
/**
 * Options for CLI query execution
 */
export interface CLIQueryOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeout?: number;
}

/**
 * Conversation message for multi-turn sessions
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}
```

### Error Conditions

| Condition              | Error Type       | Message Template                                              | Recovery                        |
| ---------------------- | ---------------- | ------------------------------------------------------------- | ------------------------------- |
| CLI not found          | NOT_CONFIGURED   | "{CLI} not found. Install with: {installCommand}"             | Install CLI                     |
| CLI spawn failure      | UNAVAILABLE      | "Failed to spawn {CLI}: {error}"                              | Check PATH, permissions         |
| Authentication failure | NOT_CONFIGURED   | "{CLI} not authenticated. Set {envVar} or run {loginCommand}" | Configure auth                  |
| Process timeout        | TIMEOUT          | "CLI query timed out after {timeoutMs}ms"                     | Retry with longer timeout       |
| Output parse failure   | INVALID_RESPONSE | "Failed to parse {CLI} output: {parseError}"                  | Check CLI version compatibility |
| Exit code non-zero     | API_ERROR        | "{CLI} exited with code {exitCode}: {stderr}"                 | Check CLI logs, retry           |

---

## 2. ClaudeCodeCLIProvider Class

**Description**: Claude Code CLI-specific implementation of CLIProviderAdapter.

**Location**: `extension/src/providers/cli/ClaudeCodeCLIProvider.ts`

**Extends**: `CLIProviderAdapter`

**Serves**:

- FR-001 (Claude CLI support)
- FR-007 (Pipeline stage execution)
- FR-018 (Claude log parsing)
- US-1 (Provider selection - Claude option)
- US-2 (Transparent switching)

### Implementation

```typescript
/**
 * Claude Code CLI provider implementation
 * Wraps `claude` command-line tool
 */
export class ClaudeCodeCLIProvider extends CLIProviderAdapter {
  readonly id: ProviderId = 'claude-cli' as ProviderId;
  readonly name: string = 'Claude Code CLI';
  readonly model: string;
  readonly cliCommand: string;

  /**
   * Constructor
   * @param cliCommand - Command to execute (from ConfigManager.getClaudeCodeCommand())
   * @param model - Model identifier (default: 'claude-opus-4-5-20251101')
   * @param terminalManager - Terminal manager instance
   */
  constructor(
    cliCommand: string = 'claude',
    model: string = 'claude-opus-4-5-20251101',
    terminalManager: TerminalManager
  );

  /**
   * Query Claude CLI
   * Spawns `claude` with prompt, parses markdown output
   *
   * @param request - Query request with prompt, maxTokens, temperature
   * @returns Promise<QueryResponse> with parsed content and usage
   * @throws ProviderError if CLI fails or output unparseable
   */
  async query(request: QueryRequest): Promise<QueryResponse>;

  /**
   * Health check for Claude CLI
   * Verifies: CLI installed, version >=1.0.0, authentication valid
   *
   * @returns Promise<boolean> - true if available
   */
  async healthCheck(): Promise<boolean>;

  /**
   * Check if MCP servers are available
   * Provider-specific capability detection
   *
   * @returns Promise<boolean> - true if MCP server support detected
   */
  async supportsMCPServers(): Promise<boolean>;
}

// Register provider in factory
registerProvider('claude-cli' as ProviderId, ClaudeCodeCLIProvider);
```

### CLI-Specific Behavior

| Aspect               | Implementation                                         |
| -------------------- | ------------------------------------------------------ |
| **Command Template** | `{cliCommand} --model {model} --prompt "{prompt}"`     |
| **Output Format**    | Markdown with `---` separators, code blocks            |
| **Authentication**   | `ANTHROPIC_API_KEY` env var or `~/.claude/config.json` |
| **Version Check**    | `claude --version` → parse "Claude Code version X.Y.Z" |
| **Log Format**       | JSONL at `~/.claude/history.jsonl`                     |
| **Min Version**      | 1.0.0                                                  |

---

## 3. CodexCLIProvider Class

**Description**: Codex CLI-specific implementation of CLIProviderAdapter.

**Location**: `extension/src/providers/cli/CodexCLIProvider.ts`

**Extends**: `CLIProviderAdapter`

**Serves**:

- FR-001 (Codex CLI support)
- FR-007 (Pipeline stage execution)
- FR-019 (Codex log parsing)
- US-1 (Provider selection - Codex option)
- US-2 (Transparent switching)

### Implementation

```typescript
/**
 * Codex CLI provider implementation
 * Wraps `codex` command-line tool
 */
export class CodexCLIProvider extends CLIProviderAdapter {
  readonly id: ProviderId = 'codex-cli' as ProviderId;
  readonly name: string = 'Codex CLI';
  readonly model: string;
  readonly cliCommand: string;

  /**
   * Constructor
   * @param cliCommand - Command to execute (from ConfigManager.getCodexCommand())
   * @param model - Model identifier (default: 'gpt-5.4')
   * @param terminalManager - Terminal manager instance
   */
  constructor(
    cliCommand: string = 'codex',
    model: string = 'gpt-5.4',
    terminalManager: TerminalManager
  );

  /**
   * Query Codex CLI
   * Spawns `codex exec` with prompt, parses JSON/TUI output
   *
   * @param request - Query request with prompt, maxTokens, temperature
   * @returns Promise<QueryResponse> with parsed content and usage
   * @throws ProviderError if CLI fails or output unparseable
   */
  async query(request: QueryRequest): Promise<QueryResponse>;

  /**
   * Health check for Codex CLI
   * Verifies: CLI installed, version >=2.0.0, authentication valid
   *
   * @returns Promise<boolean> - true if available
   */
  async healthCheck(): Promise<boolean>;

  /**
   * Check if web search is available
   * Provider-specific capability detection
   *
   * @returns Promise<boolean> - true if web search support detected
   */
  async supportsWebSearch(): Promise<boolean>;
}

// Register provider in factory
registerProvider('codex-cli' as ProviderId, CodexCLIProvider);
```

### CLI-Specific Behavior

| Aspect               | Implementation                                          |
| -------------------- | ------------------------------------------------------- |
| **Command Template** | `{cliCommand} exec --model {model} --prompt "{prompt}"` |
| **Output Format**    | JSON responses or TUI-formatted text                    |
| **Authentication**   | ChatGPT session or `OPENAI_API_KEY` env var             |
| **Version Check**    | `codex --version` → parse "Codex version X.Y.Z"         |
| **Log Format**       | JSON at `~/.codex/history.json`                         |
| **Min Version**      | 2.0.0                                                   |

---

## 4. ProviderFactory Extensions

**Description**: Factory methods for creating and auto-detecting CLI providers.

**Location**: `extension/src/council/providers/ProviderFactory.ts` (extend
existing)

**Serves**:

- FR-002 (Provider selection from settings)
- FR-003 (Auto-detection)
- FR-004 (Provider switching)
- US-1 (Provider selection)
- US-3 (Auto-detection)

### New Methods

```typescript
export class ProviderFactory {
  // ... existing methods ...

  /**
   * Create CLI provider instance
   *
   * @param cliType - 'claude' | 'codex' | 'auto'
   * @returns LLMProvider instance for selected CLI
   * @throws ProviderError if CLI not installed or not authenticated
   */
  createCLIProvider(cliType: 'claude' | 'codex' | 'auto'): Promise<LLMProvider>;

  /**
   * Auto-detect available CLI provider
   * Checks Claude first, then Codex, returns first available
   *
   * @returns Promise<'claude' | 'codex' | null> - Detected CLI or null
   */
  async autoDetectCLI(): Promise<'claude' | 'codex' | null>;

  /**
   * Check if specific CLI is available
   *
   * @param cliType - 'claude' | 'codex'
   * @returns Promise<boolean> - true if CLI is installed and working
   */
  async isCLIAvailable(cliType: 'claude' | 'codex'): Promise<boolean>;

  /**
   * Get CLI provider status for display
   *
   * @returns Map<CLIType, CLIStatus> - Status of each CLI
   */
  getCLIProviderStatus(): Promise<Map<'claude' | 'codex', CLIStatus>>;
}
```

### Types

```typescript
/**
 * CLI provider status
 */
export interface CLIStatus {
  installed: boolean;
  version: string | null;
  authenticated: boolean;
  status: ProviderStatus;
  errorMessage?: string;
}
```

### Implementation Details

```typescript
async createCLIProvider(cliType: 'claude' | 'codex' | 'auto'): Promise<LLMProvider> {
  // If auto, detect available CLI
  let resolvedType = cliType;
  if (cliType === 'auto') {
    const detected = await this.autoDetectCLI();
    if (!detected) {
      throw new ProviderError(
        'No CLI provider found. Install Claude Code (`npm install -g @anthropic/claude-code`) or Codex (`npm install -g @openai/codex-cli`)',
        'NOT_CONFIGURED' as never,
        'cli-auto' as ProviderId
      );
    }
    resolvedType = detected;
  }

  // Get provider constructor from registry
  const providerId = `${resolvedType}-cli` as ProviderId;
  const Constructor = providerRegistry.get(providerId);

  if (!Constructor) {
    throw new ProviderError(
      `CLI provider ${resolvedType} is not registered`,
      'NOT_CONFIGURED' as never,
      providerId
    );
  }

  // Create provider instance
  const config = ConfigManager.getInstance();
  const cliCommand = resolvedType === 'claude'
    ? config.getClaudeCodeCommand()
    : config.getCodexCommand();
  const model = DEFAULT_MODELS[providerId] || '';

  const provider = new Constructor(cliCommand, model, new TerminalManager());

  // Run health check before returning
  const isHealthy = await provider.healthCheck();
  if (!isHealthy) {
    throw new ProviderError(
      `${provider.name} health check failed: ${provider.errorMessage}`,
      'UNAVAILABLE' as never,
      providerId
    );
  }

  // Cache and return
  this.providers.set(providerId, provider);
  return provider;
}

async autoDetectCLI(): Promise<'claude' | 'codex' | null> {
  // Check Claude first (preferred for backward compatibility)
  if (await this.isCLIAvailable('claude')) {
    return 'claude';
  }

  // Check Codex
  if (await this.isCLIAvailable('codex')) {
    return 'codex';
  }

  return null;
}

async isCLIAvailable(cliType: 'claude' | 'codex'): Promise<boolean> {
  const command = cliType === 'claude' ? 'claude' : 'codex';
  try {
    const { stdout } = await execFile(command, ['--version']);
    // Check for version string in output
    return stdout.includes('version') || stdout.includes('Version');
  } catch {
    return false;
  }
}
```

**Serves**:

- FR-003: Auto-detection via `autoDetectCLI()`
- NFR-003: Auto-detection completes in <2s via parallel checks
- US-3: Helpful errors with installation commands

---

## 5. ConfigManager CLI Getters

**Description**: Type-safe getters for CLI provider settings.

**Location**: `extension/src/config.ts` (extend existing ConfigManager)

**Serves**:

- FR-002 (Provider selection setting)
- FR-004 (Provider switching)
- US-1 (Settings dropdown)

### New Configuration Keys

```typescript
export const CONFIG_KEYS = {
  // ... existing keys ...
  cliProvider: 'gofer.cliProvider',
  codexCommand: 'gofer.codexCommand',
} as const;

export const DEFAULTS = {
  // ... existing defaults ...
  cliProvider: 'auto' as const,
  codexCommand: 'codex',
} as const;
```

### New Getter Methods

```typescript
export class ConfigManager {
  // ... existing methods ...

  /**
   * Get preferred CLI provider
   *
   * @returns 'claude' | 'codex' | 'auto' - User-selected CLI provider
   */
  public getPreferredCLIProvider(): 'claude' | 'codex' | 'auto';

  /**
   * Get Codex CLI command
   * Similar to getClaudeCodeCommand(), allows custom CLI path
   *
   * @returns string - Codex CLI command (default: 'codex')
   */
  public getCodexCommand(): string;

  /**
   * Get CLI provider display name
   *
   * @param cliType - 'claude' | 'codex'
   * @returns string - Human-readable name
   */
  public getCLIProviderName(cliType: 'claude' | 'codex'): string;
}
```

### Implementation

```typescript
public getPreferredCLIProvider(): 'claude' | 'codex' | 'auto' {
  return this.config.get<'claude' | 'codex' | 'auto'>(
    CONFIG_KEYS.cliProvider.replace('gofer.', ''),
    DEFAULTS.cliProvider
  );
}

public getCodexCommand(): string {
  return this.config.get<string>(
    CONFIG_KEYS.codexCommand.replace('gofer.', ''),
    DEFAULTS.codexCommand
  );
}

public getCLIProviderName(cliType: 'claude' | 'codex'): string {
  return cliType === 'claude' ? 'Claude Code CLI' : 'Codex CLI';
}
```

### VSCode Settings Schema

**Location**: `extension/package.json` (extends contributes.configuration)

```json
{
  "gofer.cliProvider": {
    "type": "string",
    "enum": ["claude", "codex", "auto"],
    "enumDescriptions": [
      "Always use Claude Code CLI",
      "Always use Codex CLI",
      "Auto-detect based on installed CLI tools (checks Claude first, then Codex)"
    ],
    "default": "auto",
    "markdownDescription": "AI CLI provider for Gofer autonomous mode and pipeline stages. Change takes effect immediately.",
    "order": 25
  },
  "gofer.codexCommand": {
    "type": "string",
    "default": "codex",
    "markdownDescription": "Custom path or command for Codex CLI (similar to `gofer.claudeCodeCommand`).",
    "order": 26
  }
}
```

**Serves**:

- FR-002: Dropdown setting for provider selection
- FR-004: Immediate effect on setting change
- US-1: Acceptance criteria - settings dropdown with 3 options

---

## 6. CLIHealthChecker Interface

**Description**: Shared health check logic for CLI providers.

**Location**: `extension/src/providers/cli/CLIHealthChecker.ts`

**Serves**:

- FR-011 (Installation error messages)
- FR-012 (Authentication error messages)
- US-3 (Auto-detection and helpful errors)

### Interface

```typescript
/**
 * Health checker for CLI providers
 * Encapsulates version detection, auth checks, installation verification
 */
export class CLIHealthChecker {
  /**
   * Check CLI availability and health
   *
   * @param cliType - 'claude' | 'codex'
   * @param cliCommand - Command to execute
   * @returns Promise<CLIHealthResult>
   */
  static async check(
    cliType: 'claude' | 'codex',
    cliCommand: string
  ): Promise<CLIHealthResult>;

  /**
   * Detect CLI version
   *
   * @param cliCommand - Command to execute
   * @returns Promise<string | null> - Version string or null
   */
  static async detectVersion(cliCommand: string): Promise<string | null>;

  /**
   * Check CLI authentication
   *
   * @param cliType - 'claude' | 'codex'
   * @param cliCommand - Command to execute
   * @returns Promise<boolean> - true if authenticated
   */
  static async checkAuthentication(
    cliType: 'claude' | 'codex',
    cliCommand: string
  ): Promise<boolean>;

  /**
   * Get installation instructions
   *
   * @param cliType - 'claude' | 'codex'
   * @returns string - Installation command and instructions
   */
  static getInstallInstructions(cliType: 'claude' | 'codex'): string;

  /**
   * Get authentication instructions
   *
   * @param cliType - 'claude' | 'codex'
   * @returns string - Authentication setup instructions
   */
  static getAuthInstructions(cliType: 'claude' | 'codex'): string;

  /**
   * Compare version against minimum requirement
   *
   * @param version - Detected version string
   * @param minVersion - Minimum required version
   * @returns boolean - true if version meets requirement
   */
  static compareVersion(version: string, minVersion: string): boolean;
}
```

### Types

```typescript
/**
 * Result of CLI health check
 */
export interface CLIHealthResult {
  available: boolean;
  version: string | null;
  authenticated: boolean;
  compatible: boolean; // Version meets minimum requirement
  errorMessage?: string;
  installInstructions?: string;
  authInstructions?: string;
}
```

### Implementation Details

```typescript
static async check(
  cliType: 'claude' | 'codex',
  cliCommand: string
): Promise<CLIHealthResult> {
  const result: CLIHealthResult = {
    available: false,
    version: null,
    authenticated: false,
    compatible: false,
  };

  // 1. Check if CLI is installed
  try {
    const version = await this.detectVersion(cliCommand);
    if (!version) {
      result.errorMessage = `${cliType} CLI not found`;
      result.installInstructions = this.getInstallInstructions(cliType);
      return result;
    }
    result.version = version;
    result.available = true;

    // 2. Check version compatibility
    const minVersion = cliType === 'claude' ? '1.0.0' : '2.0.0';
    result.compatible = this.compareVersion(version, minVersion);
    if (!result.compatible) {
      result.errorMessage = `${cliType} version ${version} is below minimum ${minVersion}`;
      result.installInstructions = `Upgrade ${cliType}: npm update -g ${cliType === 'claude' ? '@anthropic/claude-code' : '@openai/codex-cli'}`;
      return result;
    }

    // 3. Check authentication
    result.authenticated = await this.checkAuthentication(cliType, cliCommand);
    if (!result.authenticated) {
      result.errorMessage = `${cliType} not authenticated`;
      result.authInstructions = this.getAuthInstructions(cliType);
      return result;
    }

    return result;
  } catch (error) {
    result.errorMessage = `Health check failed: ${error}`;
    return result;
  }
}

static getInstallInstructions(cliType: 'claude' | 'codex'): string {
  if (cliType === 'claude') {
    return 'Install Claude Code CLI: npm install -g @anthropic/claude-code';
  }
  return 'Install Codex CLI: npm install -g @openai/codex-cli';
}

static getAuthInstructions(cliType: 'claude' | 'codex'): string {
  if (cliType === 'claude') {
    return 'Set ANTHROPIC_API_KEY environment variable or run: claude login';
  }
  return 'Set OPENAI_API_KEY environment variable or run: codex login';
}
```

**Serves**:

- FR-011: Clear installation error messages
- FR-012: Clear authentication error messages
- NFR-006: Version compatibility checks
- US-3: Auto-detection with helpful errors

---

## 7. CLIOutputParser Interface

**Description**: Provider-specific output parsing strategies.

**Location**: `extension/src/providers/cli/CLIOutputParser.ts`

**Serves**:

- FR-013 (Graceful handling of CLI output)
- NFR-005 (Output validation)
- US-2 (Transparent provider switching - output normalization)

### Interface

```typescript
/**
 * Strategy interface for parsing CLI output
 */
export interface CLIOutputParser {
  /**
   * Parse raw CLI output to extract response content and usage
   *
   * @param rawOutput - Raw stdout from CLI process
   * @returns Parsed output with content and usage
   * @throws ParseError if output format is invalid
   */
  parse(rawOutput: string): ParsedCLIOutput;

  /**
   * Detect if output indicates an error
   *
   * @param rawOutput - Raw stdout/stderr
   * @returns boolean - true if error detected
   */
  isError(rawOutput: string): boolean;

  /**
   * Extract error message from output
   *
   * @param rawOutput - Raw output containing error
   * @returns string - Human-readable error message
   */
  extractErrorMessage(rawOutput: string): string;
}

/**
 * Parsed output structure
 */
export interface ParsedCLIOutput {
  content: string;
  usage: QueryUsage;
  metadata?: Record<string, unknown>;
}

/**
 * Claude CLI output parser
 */
export class ClaudeOutputParser implements CLIOutputParser {
  parse(rawOutput: string): ParsedCLIOutput;
  isError(rawOutput: string): boolean;
  extractErrorMessage(rawOutput: string): string;
}

/**
 * Codex CLI output parser
 */
export class CodexOutputParser implements CLIOutputParser {
  parse(rawOutput: string): ParsedCLIOutput;
  isError(rawOutput: string): boolean;
  extractErrorMessage(rawOutput: string): string;
}
```

### Implementation Notes

**Claude Output Parser**:

- Format: Markdown with `---` separators
- Usage: Extract from log file after query (not in stdout)
- Error Detection: Check for "Error:" prefix or stderr
- Fallback: Regex-based extraction if structured parsing fails

**Codex Output Parser**:

- Format: JSON responses or TUI-formatted text
- Usage: Parse from JSON response or log file
- Error Detection: Check for `error` field in JSON or exit code
- Fallback: Treat entire output as content if JSON parsing fails

---

## 8. CLIUsageAdapter Interface

**Description**: Provider-specific log file parsing for token usage tracking.

**Location**: `extension/src/autonomous/cli/CLIUsageAdapter.ts`

**Serves**:

- FR-017 (Token usage tracking per provider)
- FR-018 (Claude log parsing)
- FR-019 (Codex log parsing)
- FR-020 (Provider name in usage panel)
- US-5 (Usage tracking across providers)

### Interface

```typescript
/**
 * Base interface for CLI usage log adapters
 */
export interface CLIUsageAdapter {
  /**
   * Provider identifier
   */
  readonly providerId: ProviderId;

  /**
   * Provider display name
   */
  readonly providerName: string;

  /**
   * Parse usage log file
   *
   * @param logFilePath - Path to CLI log file
   * @returns Promise<UsageEntry[]> - Parsed usage entries
   */
  parseLogFile(logFilePath: string): Promise<UsageEntry[]>;

  /**
   * Get default log file path for this CLI
   *
   * @returns string - Path to log file (e.g., ~/.claude/history.jsonl)
   */
  getDefaultLogPath(): string;

  /**
   * Extract usage from single log entry
   *
   * @param logEntry - Raw log entry (line or object)
   * @returns UsageEntry | null - Parsed usage or null if invalid
   */
  extractUsage(logEntry: string | object): UsageEntry | null;
}

/**
 * Usage entry from CLI log
 */
export interface UsageEntry {
  timestamp: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  providerId: ProviderId;
  providerName: string;
  sessionId?: string;
  command?: string;
}

/**
 * Claude Code CLI usage adapter
 * Parses ~/.claude/history.jsonl
 */
export class ClaudeCodeUsageAdapter implements CLIUsageAdapter {
  readonly providerId: ProviderId = 'claude-cli' as ProviderId;
  readonly providerName: string = 'Claude Code CLI';

  async parseLogFile(logFilePath: string): Promise<UsageEntry[]>;
  getDefaultLogPath(): string; // Returns ~/.claude/history.jsonl
  extractUsage(logEntry: string | object): UsageEntry | null;
}

/**
 * Codex CLI usage adapter
 * Parses ~/.codex/history.json
 */
export class CodexUsageAdapter implements CLIUsageAdapter {
  readonly providerId: ProviderId = 'codex-cli' as ProviderId;
  readonly providerName: string = 'Codex CLI';

  async parseLogFile(logFilePath: string): Promise<UsageEntry[]>;
  getDefaultLogPath(): string; // Returns ~/.codex/history.json
  extractUsage(logEntry: string | object): UsageEntry | null;
}
```

### Implementation Details

**ClaudeCodeUsageAdapter**:

- Log format: JSONL (one JSON object per line)
- Log location: `~/.claude/history.jsonl`
- Entry structure:
  `{ timestamp, model, usage: { input_tokens, output_tokens }, ... }`
- Extend existing `ClaudeCodeUsageAdapter` pattern from Feature 026

**CodexUsageAdapter**:

- Log format: JSON (single array of objects)
- Log location: `~/.codex/history.json`
- Entry structure: `{ timestamp, model, tokens: { prompt, completion }, ... }`
- Parse JSON array, map to `UsageEntry` format

**Serves**:

- FR-017: Separate tracking per provider via `providerId` field
- FR-018: Claude JSONL parsing
- FR-019: Codex JSON parsing
- US-5: Provider name included in usage data for display

---

## Type Extensions

### Extend ProviderId Union

**Location**: `extension/src/council/types.ts`

```typescript
/**
 * Supported provider identifiers
 */
export type ProviderId =
  | 'anthropic'
  | 'google'
  | 'openai'
  | 'claude-cli' // NEW
  | 'codex-cli'; // NEW
```

### Extend PROVIDER_NAMES Map

```typescript
export const PROVIDER_NAMES: Record<ProviderId, string> = {
  anthropic: 'Anthropic Claude',
  google: 'Google Gemini',
  openai: 'OpenAI GPT',
  'claude-cli': 'Claude Code CLI', // NEW
  'codex-cli': 'Codex CLI', // NEW
};
```

### Extend DEFAULT_MODELS Map

```typescript
export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: 'claude-opus-4-5-20251101',
  google: 'gemini-3-flash-preview',
  openai: 'gpt-5.2',
  'claude-cli': 'claude-opus-4-5-20251101', // NEW
  'codex-cli': 'gpt-5.4', // NEW
};
```

---

## Contract Summary

### Total Contracts: 8

| #   | Contract                   | Type                        | Interfaces/Methods      |
| --- | -------------------------- | --------------------------- | ----------------------- |
| 1   | CLIProviderAdapter         | Abstract Class              | 11 methods              |
| 2   | ClaudeCodeCLIProvider      | Class                       | 3 methods + constructor |
| 3   | CodexCLIProvider           | Class                       | 3 methods + constructor |
| 4   | ProviderFactory Extensions | Methods                     | 4 new methods           |
| 5   | ConfigManager CLI Getters  | Methods                     | 3 new methods           |
| 6   | CLIHealthChecker           | Static Class                | 6 methods               |
| 7   | CLIOutputParser            | Interface + Implementations | 3 methods × 2 parsers   |
| 8   | CLIUsageAdapter            | Interface + Implementations | 3 methods × 2 adapters  |

### Total Interfaces: 14

1. `CLIProviderAdapter` (abstract class)
2. `CLIQueryOptions` (interface)
3. `ConversationMessage` (interface)
4. `ClaudeCodeCLIProvider` (class)
5. `CodexCLIProvider` (class)
6. `CLIStatus` (interface)
7. `CLIHealthResult` (interface)
8. `CLIOutputParser` (interface)
9. `ParsedCLIOutput` (interface)
10. `ClaudeOutputParser` (class)
11. `CodexOutputParser` (class)
12. `CLIUsageAdapter` (interface)
13. `UsageEntry` (interface)
14. `ClaudeCodeUsageAdapter` (class) - extended
15. `CodexUsageAdapter` (class) - new

### User Stories Served

| Contract              | US-1 | US-2 | US-3 | US-4 | US-5 |
| --------------------- | ---- | ---- | ---- | ---- | ---- |
| CLIProviderAdapter    | ✓    | ✓    | ✓    |      |      |
| ClaudeCodeCLIProvider | ✓    | ✓    | ✓    |      |      |
| CodexCLIProvider      | ✓    | ✓    | ✓    |      |      |
| ProviderFactory       | ✓    | ✓    | ✓    |      |      |
| ConfigManager         | ✓    |      |      | ✓    |      |
| CLIHealthChecker      |      |      | ✓    |      |      |
| CLIOutputParser       |      | ✓    |      |      |      |
| CLIUsageAdapter       |      |      |      |      | ✓    |

**Legend**:

- US-1: Provider Selection
- US-2: Transparent Provider Switching
- US-3: Auto-Detection and Helpful Errors
- US-4: Provider-Specific Feature Graceful Degradation
- US-5: Usage Tracking Across Providers

### Functional Requirements Served

**Core Abstraction**: FR-001 (CLI support), FR-002 (settings), FR-003
(auto-detect) **Provider Switching**: FR-004 (immediate switching), FR-005
(history maintenance), FR-006 (backward compat) **Feature Parity**: FR-007
(pipelines), FR-008 (autonomous), FR-009 (validation), FR-010 (council) **Error
Handling**: FR-011 (install errors), FR-012 (auth errors), FR-013 (process
failures) **Provider-Specific**: FR-014 (MCP), FR-015 (web search), FR-016
(notifications) **Usage Tracking**: FR-017 (separate tracking), FR-018 (Claude
logs), FR-019 (Codex logs), FR-020 (display)

---

## Implementation Order

1. **Foundation** (Week 1):
   - CLIProviderAdapter base class
   - CLIHealthChecker
   - ConfigManager extensions + settings schema

2. **Providers** (Week 1-2):
   - ClaudeCodeCLIProvider
   - CodexCLIProvider
   - CLIOutputParser implementations

3. **Integration** (Week 2):
   - ProviderFactory.createCLIProvider()
   - Auto-detection logic
   - Provider switching coordination

4. **Usage Tracking** (Week 2-3):
   - CodexUsageAdapter
   - Extend ClaudeCodeUsageAdapter for CLI mode
   - Usage panel updates

5. **Testing** (Week 3):
   - Unit tests for each adapter
   - Integration tests for provider switching
   - E2E tests with both CLIs

---

## Backward Compatibility

All contracts maintain backward compatibility:

- Existing `LLMProvider` interface unchanged
- Existing API providers (Anthropic, Google, OpenAI) unchanged
- `BaseLLMProvider` extended, not modified
- `ProviderFactory` adds methods, doesn't change existing
- `ConfigManager` adds getters, doesn't change existing
- New `ProviderId` values added to union without breaking existing code

Default setting (`gofer.cliProvider: 'auto'`) preserves existing behavior by
preferring Claude CLI if installed, matching current hardcoded dependency.
