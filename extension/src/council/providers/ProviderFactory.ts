/**
 * Provider Factory
 *
 * Factory for creating and managing LLM provider instances.
 * Handles provider instantiation, API key retrieval, and availability checks.
 */

import * as vscode from 'vscode';
import { LLMProvider } from './LLMProvider';
import { ProviderError, notConfiguredError } from './ProviderError';
import { ProviderId, ProviderConfig, PROVIDER_NAMES, DEFAULT_MODELS } from '../types';
import { redactCredentials, type ConversationMessage } from './CredentialRedactor';

/**
 * Type for provider constructor functions
 */
type ProviderConstructor = new (apiKey: string, model: string) => LLMProvider;

/**
 * Type for CLI provider constructor functions
 */
type CLIProviderConstructor = new (cliCommand: string, model: string) => LLMProvider;

/**
 * Registry of provider constructors
 * Populated by individual provider modules when they're imported
 */
const providerRegistry = new Map<ProviderId, ProviderConstructor | CLIProviderConstructor>();

/**
 * Register a provider constructor
 * Called by each provider module during initialization
 */
export function registerProvider(
  id: ProviderId,
  constructor: ProviderConstructor | CLIProviderConstructor
): void {
  providerRegistry.set(id, constructor);
}

/**
 * Factory for creating LLM provider instances
 */
export class ProviderFactory {
  private readonly providers = new Map<ProviderId, LLMProvider>();

  /**
   * Get the API key for a provider from VSCode settings
   */
  getApiKey(providerId: ProviderId): string | undefined {
    const config = vscode.workspace.getConfiguration('gofer');

    switch (providerId) {
      case 'anthropic':
        return config.get<string>('anthropicApiKey');
      case 'google':
        return config.get<string>('googleApiKey');
      case 'openai':
        return config.get<string>('openaiApiKey');
      default:
        return undefined;
    }
  }

  /**
   * Check if a provider has a valid API key configured
   */
  hasApiKey(providerId: ProviderId): boolean {
    const key = this.getApiKey(providerId);
    return key !== undefined && key.trim().length > 0;
  }

  /**
   * Create a provider instance
   * @param providerId - The provider to create
   * @param model - Optional model override
   * @throws ProviderError if provider is not configured or not registered
   */
  createProvider(providerId: ProviderId, model?: string): LLMProvider {
    // Check if provider is registered
    const Constructor = providerRegistry.get(providerId);
    if (!Constructor) {
      throw new ProviderError(
        `Provider ${providerId} is not registered`,
        'NOT_CONFIGURED' as never,
        providerId
      );
    }

    // Check for API key
    const apiKey = this.getApiKey(providerId);
    if (!apiKey) {
      throw notConfiguredError(providerId);
    }

    // Use provided model or default
    const providerModel = model ?? DEFAULT_MODELS[providerId];

    // Create and cache the provider
    const provider = new Constructor(apiKey, providerModel);
    this.providers.set(providerId, provider);

    return provider;
  }

  /**
   * Get or create a provider instance
   */
  getProvider(providerId: ProviderId, model?: string): LLMProvider {
    const existing = this.providers.get(providerId);
    if (existing) {
      return existing;
    }
    return this.createProvider(providerId, model);
  }

  /**
   * Create all enabled providers from config
   * @param configs - Provider configurations
   * @returns Array of successfully created providers
   */
  async createEnabledProviders(configs: ProviderConfig[]): Promise<LLMProvider[]> {
    const providers: LLMProvider[] = [];
    const errors: ProviderError[] = [];

    for (const config of configs) {
      if (!config.enabled) {
        continue;
      }

      try {
        const provider = this.createProvider(config.providerId, config.model);
        providers.push(provider);
      } catch (error) {
        if (error instanceof ProviderError) {
          errors.push(error);
        }
        // Log but don't throw - we want to create as many providers as possible
        console.warn(`Failed to create provider ${config.providerId}:`, error);
      }
    }

    // If we have errors but also have providers, just warn
    if (errors.length > 0 && providers.length > 0) {
      console.warn(`Some providers failed to initialize:`, errors);
    }

    return providers;
  }

  /**
   * Get all available providers (those that pass health check)
   */
  async getAvailableProviders(configs: ProviderConfig[]): Promise<LLMProvider[]> {
    const providers = await this.createEnabledProviders(configs);
    const available: LLMProvider[] = [];

    for (const provider of providers) {
      try {
        const isHealthy = await provider.healthCheck();
        if (isHealthy) {
          available.push(provider);
        }
      } catch (error) {
        console.warn(`Health check failed for ${provider.id}:`, error);
      }
    }

    return available;
  }

  /**
   * Get provider status summary for display
   */
  getProviderStatus(): Map<ProviderId, { configured: boolean; status: string }> {
    const status = new Map<ProviderId, { configured: boolean; status: string }>();

    const allProviders: ProviderId[] = ['anthropic', 'google', 'openai'];

    for (const id of allProviders) {
      const configured = this.hasApiKey(id);
      const provider = this.providers.get(id);

      status.set(id, {
        configured,
        status: provider?.status ?? (configured ? 'unknown' : 'not configured'),
      });
    }

    return status;
  }

  /**
   * Clear all cached providers (for testing or reset)
   */
  clearProviders(): void {
    this.providers.clear();
  }

  /**
   * Get provider display name
   */
  static getDisplayName(providerId: ProviderId): string {
    return PROVIDER_NAMES[providerId] ?? providerId;
  }

  /**
   * Create a CLI provider instance (T026, enhanced in T038)
   * @param cliType - 'claude' or 'codex'
   * @param command - Optional custom CLI command path
   * @returns LLMProvider instance
   * @throws ProviderError if provider not registered or CLI not available
   */
  public async createCLIProvider(
    cliType: 'claude' | 'codex',
    command?: string
  ): Promise<LLMProvider> {
    const providerId = `${cliType}-cli` as ProviderId;

    // Check if provider is registered
    const Constructor = providerRegistry.get(providerId);
    if (!Constructor) {
      throw notConfiguredError(providerId);
    }

    // Get command from config or use provided
    const config = vscode.workspace.getConfiguration('gofer');
    const cliCommand =
      command ||
      (cliType === 'claude'
        ? config.get<string>('claudeCodeCommand', 'claude')
        : config.get<string>('codexCommand', 'codex'));

    // T038: Health check with actionable error messages
    const { CLIHealthChecker } = await import('./cli/CLIHealthChecker');
    const healthResult = await CLIHealthChecker.check(cliType, cliCommand);

    if (!healthResult.available) {
      throw new Error(`${cliType} CLI not found.\n${healthResult.installInstructions || ''}`);
    }

    if (!healthResult.compatible) {
      throw new Error(
        `${cliType} version ${healthResult.version} is incompatible.\n${healthResult.installInstructions || ''}`
      );
    }

    if (!healthResult.authenticated) {
      throw new Error(`${cliType} CLI not authenticated.\n${healthResult.authInstructions || ''}`);
    }

    // Get model from defaults
    const model = DEFAULT_MODELS[providerId];

    // T068: Preserve conversation history across provider switches with credential redaction
    // Check if there's an existing CLI provider with conversation history
    let conversationHistory: ConversationMessage[] = [];
    let hasPreviousProvider = false;

    for (const [existingId, existingProvider] of this.providers.entries()) {
      // Only extract history from CLI providers (claude-cli or codex-cli)
      if (
        (existingId === 'claude-cli' || existingId === 'codex-cli') &&
        typeof (existingProvider as any).getConversationHistory === 'function'
      ) {
        conversationHistory = (existingProvider as any).getConversationHistory();
        hasPreviousProvider = true;
        break; // Only need one history (all CLI providers share the same conversation)
      }
    }

    // T068: Redact credentials before transferring history
    if (conversationHistory.length > 0) {
      conversationHistory = redactCredentials(conversationHistory);
    }

    // T070: Format normalization (both providers use same format already)
    // This is a placeholder for future format conversion if needed
    // Current format: { role: 'user' | 'assistant', content: string }
    // Works for both Claude and Codex

    // Create provider (CLI providers use command as first param, not API key)
    const provider = new Constructor(cliCommand, model);

    // Restore conversation history if switching providers
    if (
      conversationHistory.length > 0 &&
      typeof (provider as any).setConversationHistory === 'function'
    ) {
      (provider as any).setConversationHistory(conversationHistory);
    }

    // T069: Show notification when switching providers with history preservation
    if (hasPreviousProvider && conversationHistory.length > 0) {
      const providerName = cliType === 'claude' ? 'Claude Code' : 'Codex';
      vscode.window.showInformationMessage(
        `Switching to ${providerName} - conversation history preserved (${conversationHistory.length} messages)`
      );
    }

    // Cache and return
    this.providers.set(providerId, provider);
    return provider;
  }

  /**
   * Auto-detect available CLI provider (T027, enhanced in T038, T014)
   * Uses CLIHealthChecker for comprehensive detection
   * Enhanced for T014: Checks gofer.defaultCLI setting before auto-detection
   * @returns 'claude' if Claude CLI available, 'codex' if only Codex available, null if neither
   */
  public async autoDetectCLI(): Promise<'claude' | 'codex' | null> {
    const { CLIHealthChecker } = await import('./cli/CLIHealthChecker');
    const config = vscode.workspace.getConfiguration('gofer');

    // T014: Check gofer.defaultCLI setting first
    const defaultCLI = config.get<'claude' | 'copilot' | 'codex' | 'auto'>('defaultCLI', 'auto');

    // If user explicitly set defaultCLI (not 'auto'), honor that preference
    if (defaultCLI !== 'auto') {
      // Copilot is not a CLI tool for autonomous mode, fall back to Claude/Codex
      if (defaultCLI === 'copilot') {
        // Copilot Chat doesn't have a CLI we can exec, try Claude then Codex
        const claudeCommand = config.get<string>('claudeCodeCommand', 'claude');
        const claudeResult = await CLIHealthChecker.check('claude', claudeCommand);
        if (claudeResult.available && claudeResult.authenticated && claudeResult.compatible) {
          return 'claude';
        }

        const codexCommand = config.get<string>('codexCommand', 'codex');
        const codexResult = await CLIHealthChecker.check('codex', codexCommand);
        if (codexResult.available && codexResult.authenticated && codexResult.compatible) {
          return 'codex';
        }

        return null;
      }

      // For Claude or Codex explicit preference, check if available
      if (defaultCLI === 'claude') {
        const claudeCommand = config.get<string>('claudeCodeCommand', 'claude');
        const claudeResult = await CLIHealthChecker.check('claude', claudeCommand);
        if (claudeResult.available && claudeResult.authenticated && claudeResult.compatible) {
          return 'claude';
        }
        // Fallback to auto-detection if explicit preference not available
      } else if (defaultCLI === 'codex') {
        const codexCommand = config.get<string>('codexCommand', 'codex');
        const codexResult = await CLIHealthChecker.check('codex', codexCommand);
        if (codexResult.available && codexResult.authenticated && codexResult.compatible) {
          return 'codex';
        }
        // Fallback to auto-detection if explicit preference not available
      }
    }

    // Auto-detection fallback: Check Claude first (preferred for backward compatibility)
    const claudeCommand = config.get<string>('claudeCodeCommand', 'claude');
    const claudeResult = await CLIHealthChecker.check('claude', claudeCommand);

    if (claudeResult.available && claudeResult.authenticated && claudeResult.compatible) {
      return 'claude';
    }

    // Check Codex second
    const codexCommand = config.get<string>('codexCommand', 'codex');
    const codexResult = await CLIHealthChecker.check('codex', codexCommand);

    if (codexResult.available && codexResult.authenticated && codexResult.compatible) {
      return 'codex';
    }

    // Neither available
    return null;
  }

  /**
   * Get CLI provider based on user preference with auto-detection (T028, enhanced in T038)
   * Uses 'auto' setting to detect available CLI
   * Provides comprehensive error messages with installation and auth instructions
   *
   * @returns LLMProvider instance
   * @throws Error if no CLI provider found with actionable instructions
   */
  public async getCLIProvider(): Promise<LLMProvider> {
    const { CLIHealthChecker } = await import('./cli/CLIHealthChecker');
    const config = vscode.workspace.getConfiguration('gofer');
    const preference = config.get<'claude' | 'codex' | 'auto'>('cliProvider', 'auto');

    let cliType: 'claude' | 'codex';

    if (preference === 'auto') {
      // Auto-detect with detailed error messages
      const detected = await this.autoDetectCLI();
      if (!detected) {
        // Check both CLIs to provide specific guidance
        const claudeCommand = config.get<string>('claudeCodeCommand', 'claude');
        const codexCommand = config.get<string>('codexCommand', 'codex');

        const claudeResult = await CLIHealthChecker.check('claude', claudeCommand);
        const codexResult = await CLIHealthChecker.check('codex', codexCommand);

        // Build comprehensive error message
        let errorMsg = 'No CLI provider available for autonomous mode.\n\n';

        if (!claudeResult.available) {
          errorMsg += `Claude CLI: ${claudeResult.installInstructions}\n`;
        } else if (!claudeResult.authenticated) {
          errorMsg += `Claude CLI: ${claudeResult.authInstructions}\n`;
        } else if (!claudeResult.compatible) {
          errorMsg += `Claude CLI: ${claudeResult.errorMessage}\n`;
        }

        if (!codexResult.available) {
          errorMsg += `Codex CLI: ${codexResult.installInstructions}\n`;
        } else if (!codexResult.authenticated) {
          errorMsg += `Codex CLI: ${codexResult.authInstructions}\n`;
        } else if (!codexResult.compatible) {
          errorMsg += `Codex CLI: ${codexResult.errorMessage}\n`;
        }

        throw new Error(errorMsg);
      }
      cliType = detected;
    } else {
      // Specific provider selected - health check will happen in createCLIProvider
      cliType = preference;
    }

    return this.createCLIProvider(cliType);
  }
}

/**
 * Singleton factory instance
 */
let factoryInstance: ProviderFactory | undefined;

/**
 * Get the singleton ProviderFactory instance
 */
export function getProviderFactory(): ProviderFactory {
  if (!factoryInstance) {
    factoryInstance = new ProviderFactory();
  }
  return factoryInstance;
}

/**
 * Reset the factory (for testing)
 */
export function resetProviderFactory(): void {
  factoryInstance?.clearProviders();
  factoryInstance = undefined;
}
