/**
 * Provider Factory
 *
 * Factory for creating and managing LLM provider instances.
 * Handles provider instantiation, API key retrieval, and availability checks.
 */

import * as vscode from 'vscode';
import { LLMProvider } from './LLMProvider';
import { ProviderError, notConfiguredError, wrapError } from './ProviderError';
import { ProviderId, ProviderConfig, PROVIDER_NAMES, DEFAULT_MODELS } from '../types';
import { redactCredentials, type ConversationMessage } from './CredentialRedactor';
import {
  getCLIProviderDisplayName,
  ProviderFactoryCliResolver,
} from './ProviderFactoryCliResolver';
import { type WorkflowProfile, getWorkflowProfile } from '../../config/workflowProfile';
import { Logger } from '../../utils/logger';

/**
 * Type for provider constructor functions
 */
type ProviderConstructor = new (apiKey: string, model: string) => LLMProvider;

/**
 * Type for CLI provider constructor functions
 */
type CLIProviderConstructor = new (cliCommand: string, model: string) => LLMProvider;
type CLIProviderWithHistory = LLMProvider & {
  getConversationHistory(): ConversationMessage[];
  setConversationHistory(history: ConversationMessage[]): void;
};

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
  private readonly logger = Logger.for('ProviderFactory');
  private readonly cliResolver: ProviderFactoryCliResolver;

  constructor() {
    this.cliResolver = new ProviderFactoryCliResolver({
      logger: this.logger,
      createCLIProvider: async (
        cliType: 'claude' | 'codex',
        command?: string,
        workflowProfile?: WorkflowProfile
      ): Promise<LLMProvider> => this.createCLIProvider(cliType, command, workflowProfile),
      resolveWorkflowProfileContext: (
        explicitProfile?: WorkflowProfile,
        configuration?: vscode.WorkspaceConfiguration
      ): WorkflowProfile => this.resolveWorkflowProfileContext(explicitProfile, configuration),
    });
  }

  private isCLIProviderWithHistory(provider: LLMProvider): provider is CLIProviderWithHistory {
    return (
      typeof (provider as Partial<CLIProviderWithHistory>).getConversationHistory === 'function' &&
      typeof (provider as Partial<CLIProviderWithHistory>).setConversationHistory === 'function'
    );
  }

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
    const config = vscode.workspace.getConfiguration('gofer');
    const workflowProfile = this.resolveWorkflowProfileContext(undefined, config);

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

    this.logger.debug('Created provider with workflow profile context', {
      providerId,
      workflowProfile,
    });

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
      } catch (error: unknown) {
        const providerError =
          error instanceof ProviderError ? error : wrapError(config.providerId, error);
        errors.push(providerError);
        // Log but don't throw - we want to create as many providers as possible
        this.logger.warn(`Failed to create provider ${config.providerId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // If we have errors but also have providers, just warn
    if (errors.length > 0 && providers.length > 0) {
      this.logger.warn('Some providers failed to initialize', { errors });
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
      } catch (error: unknown) {
        this.logger.warn(`Health check failed for ${provider.id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
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
    command?: string,
    workflowProfile?: WorkflowProfile
  ): Promise<LLMProvider> {
    const providerId = `${cliType}-cli` as ProviderId;

    // Check if provider is registered
    const Constructor = providerRegistry.get(providerId);
    if (!Constructor) {
      throw notConfiguredError(providerId);
    }

    // Get command from config or use provided
    const config = vscode.workspace.getConfiguration('gofer');
    const profileContext = this.resolveWorkflowProfileContext(workflowProfile, config);
    const cliCommand =
      command ||
      (cliType === 'claude'
        ? config.get<string>('claudeCodeCommand', 'claude')
        : config.get<string>('codexCommand', 'codex'));

    // T038: Health check with actionable error messages
    const { CLIHealthChecker } = await import('./cli/CLIHealthChecker');
    const healthResult = await CLIHealthChecker.check(cliType, cliCommand);
    const providerDisplayName = getCLIProviderDisplayName(cliType);

    if (!healthResult.available) {
      this.logger.warn(`${providerDisplayName} CLI not found`, {
        cliCommand,
        workflowProfile: profileContext,
        installInstructions: healthResult.installInstructions,
      });
      throw new Error(
        `${providerDisplayName} CLI not found.\n${healthResult.installInstructions || ''}`
      );
    }

    if (!healthResult.compatible) {
      this.logger.warn(`${providerDisplayName} CLI version is incompatible`, {
        cliCommand,
        workflowProfile: profileContext,
        version: healthResult.version,
        errorMessage: healthResult.errorMessage,
      });
      throw new Error(
        `${providerDisplayName} version ${healthResult.version} is incompatible.\n${healthResult.installInstructions || ''}`
      );
    }

    if (!healthResult.authenticated) {
      this.logger.warn(`${providerDisplayName} CLI is not authenticated`, {
        cliCommand,
        workflowProfile: profileContext,
        authInstructions: healthResult.authInstructions,
      });
      throw new Error(
        `${providerDisplayName} CLI not authenticated.\n${healthResult.authInstructions || ''}`
      );
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
        this.isCLIProviderWithHistory(existingProvider)
      ) {
        conversationHistory = existingProvider.getConversationHistory();
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
    if (conversationHistory.length > 0 && this.isCLIProviderWithHistory(provider)) {
      provider.setConversationHistory(conversationHistory);
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
    this.logger.debug('Created CLI provider with workflow profile context', {
      providerId,
      workflowProfile: profileContext,
    });
    return provider;
  }

  public async autoDetectCLI(
    workflowProfile?: WorkflowProfile
  ): Promise<'claude' | 'codex' | null> {
    return this.cliResolver.autoDetectCLI(workflowProfile);
  }

  public async getCLIProvider(workflowProfile?: WorkflowProfile): Promise<LLMProvider> {
    return this.cliResolver.getCLIProvider(workflowProfile);
  }

  private resolveWorkflowProfileContext(
    explicitProfile?: WorkflowProfile,
    configuration?: vscode.WorkspaceConfiguration
  ): WorkflowProfile {
    if (explicitProfile) {
      return explicitProfile;
    }

    try {
      return getWorkflowProfile(configuration);
    } catch (error: unknown) {
      this.logger.warn(
        'Falling back to enterpriseai workflow profile after configuration read failure',
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      return 'enterpriseai';
    }
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
