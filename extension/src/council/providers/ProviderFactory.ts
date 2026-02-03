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

/**
 * Type for provider constructor functions
 */
type ProviderConstructor = new (apiKey: string, model: string) => LLMProvider;

/**
 * Registry of provider constructors
 * Populated by individual provider modules when they're imported
 */
const providerRegistry = new Map<ProviderId, ProviderConstructor>();

/**
 * Register a provider constructor
 * Called by each provider module during initialization
 */
export function registerProvider(id: ProviderId, constructor: ProviderConstructor): void {
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
