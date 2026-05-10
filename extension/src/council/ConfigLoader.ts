/**
 * ConfigLoader - YAML Configuration Parser for LLM Council
 *
 * Loads and validates council configuration from .specify/memory/council-config.yaml
 * Provides defaults when file doesn't exist or is malformed.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import * as vscode from 'vscode';
import {
  CouncilConfig,
  CouncilMode,
  ProviderConfig,
  ProviderId,
  StageConfig,
  DEFAULT_COUNCIL_CONFIG,
} from './types';

/**
 * Valid provider IDs for validation
 */
const VALID_PROVIDER_IDS: ProviderId[] = ['anthropic', 'google', 'openai'];

/**
 * Valid council modes
 */
const VALID_MODES: CouncilMode[] = ['council', 'single'];

/**
 * Config validation limits
 */
const CONFIG_LIMITS = {
  minQuorum: { min: 2, max: 4 },
  timeout: { min: 5000, max: 120000 },
  minProvidersForPeerReview: 3,
};

/**
 * Raw YAML structure before normalization
 */
interface RawYamlConfig {
  council?: {
    enabled?: boolean;
    peer_review?: boolean;
    min_quorum?: number;
    timeout?: number;
    providers?: Record<string, { enabled?: boolean; model?: string }>;
    stages?: Record<string, string>;
  };
}

/**
 * Parse YAML content into a CouncilConfig object
 */
export function parseYamlConfig(yamlContent: string): CouncilConfig {
  try {
    const raw: RawYamlConfig = yaml.parse(yamlContent);

    if (!raw?.council) {
      return { ...DEFAULT_COUNCIL_CONFIG };
    }

    const council = raw.council;

    // Parse providers from object format to array
    const providers: ProviderConfig[] = [];
    if (council.providers) {
      for (const [providerId, config] of Object.entries(council.providers)) {
        providers.push({
          providerId: providerId as ProviderId,
          enabled: config.enabled ?? true,
          model: config.model,
        });
      }
    }

    // Parse stages
    const stages: StageConfig = { ...DEFAULT_COUNCIL_CONFIG.stages };
    if (council.stages) {
      for (const [stage, mode] of Object.entries(council.stages)) {
        stages[stage] = mode as CouncilMode;
      }
    }

    return {
      enabled: council.enabled ?? DEFAULT_COUNCIL_CONFIG.enabled,
      peerReview: council.peer_review ?? DEFAULT_COUNCIL_CONFIG.peerReview,
      minQuorum: council.min_quorum ?? DEFAULT_COUNCIL_CONFIG.minQuorum,
      timeout: council.timeout ?? DEFAULT_COUNCIL_CONFIG.timeout,
      providers: providers.length > 0 ? providers : DEFAULT_COUNCIL_CONFIG.providers,
      stages,
    };
  } catch {
    // Return defaults on any parse error
    return { ...DEFAULT_COUNCIL_CONFIG };
  }
}

/**
 * Validate and normalize a CouncilConfig object
 */
export function validateConfig(config: CouncilConfig): CouncilConfig {
  // Clone to avoid mutating input
  const validated = { ...config };

  // Validate minQuorum
  validated.minQuorum = Math.max(
    CONFIG_LIMITS.minQuorum.min,
    Math.min(CONFIG_LIMITS.minQuorum.max, config.minQuorum)
  );

  // Validate timeout
  validated.timeout = Math.max(
    CONFIG_LIMITS.timeout.min,
    Math.min(CONFIG_LIMITS.timeout.max, config.timeout)
  );

  // Filter out invalid provider IDs
  validated.providers = config.providers.filter((p) => VALID_PROVIDER_IDS.includes(p.providerId));

  // Validate peer review requirement (need 3+ providers)
  const enabledProviders = validated.providers.filter((p) => p.enabled);
  if (validated.peerReview && enabledProviders.length < CONFIG_LIMITS.minProvidersForPeerReview) {
    validated.peerReview = false;
  }

  // Normalize stage values
  validated.stages = { ...config.stages };
  for (const [stage, mode] of Object.entries(validated.stages)) {
    if (!VALID_MODES.includes(mode as CouncilMode)) {
      validated.stages[stage] = 'single';
    }
  }

  return validated;
}

/**
 * Callback type for config change notifications
 */
export type ConfigChangeCallback = (config: CouncilConfig) => void;

/**
 * ConfigLoader class for loading and managing council configuration
 */
export class ConfigLoader {
  private readonly workspacePath: string;
  private cachedConfig: CouncilConfig | null = null;
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private changeCallbacks: ConfigChangeCallback[] = [];

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  /**
   * Start watching the config file for changes
   * Automatically invalidates cache and reloads config when file changes
   */
  startWatching(): vscode.Disposable {
    const configPath = this.getConfigPath();
    const pattern = new vscode.RelativePattern(path.dirname(configPath), path.basename(configPath));

    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Handle file changes (create, modify, delete)
    const onChangeDisposable = this.fileWatcher.onDidChange(async () => {
      await this.handleConfigChange();
    });

    const onCreateDisposable = this.fileWatcher.onDidCreate(async () => {
      await this.handleConfigChange();
    });

    const onDeleteDisposable = this.fileWatcher.onDidDelete(async () => {
      this.invalidateCache();
      this.cachedConfig = { ...DEFAULT_COUNCIL_CONFIG };
      this.notifyCallbacks(this.cachedConfig);
    });

    // Return a combined disposable
    return {
      dispose: () => {
        onChangeDisposable.dispose();
        onCreateDisposable.dispose();
        onDeleteDisposable.dispose();
        this.fileWatcher?.dispose();
        this.fileWatcher = null;
      },
    };
  }

  /**
   * Register a callback to be notified when config changes
   */
  onConfigChange(callback: ConfigChangeCallback): vscode.Disposable {
    this.changeCallbacks.push(callback);
    return {
      dispose: () => {
        const index = this.changeCallbacks.indexOf(callback);
        if (index >= 0) {
          this.changeCallbacks.splice(index, 1);
        }
      },
    };
  }

  /**
   * Handle config file change
   */
  private async handleConfigChange(): Promise<void> {
    this.invalidateCache();
    const newConfig = await this.loadConfig();
    this.notifyCallbacks(newConfig);
  }

  /**
   * Notify all registered callbacks of config change
   */
  private notifyCallbacks(config: CouncilConfig): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(config);
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Get the path to the council config file
   */
  getConfigPath(): string {
    return path.join(this.workspacePath, '.specify', 'memory', 'council-config.yaml');
  }

  /**
   * Load configuration from file, returning defaults if not found or invalid
   */
  async loadConfig(): Promise<CouncilConfig> {
    // Return cached config if available
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    const configPath = this.getConfigPath();

    // Return defaults if file doesn't exist
    if (!fs.existsSync(configPath)) {
      this.cachedConfig = { ...DEFAULT_COUNCIL_CONFIG };
      return this.cachedConfig;
    }

    try {
      const yamlContent = fs.readFileSync(configPath, 'utf-8');
      const parsed = parseYamlConfig(yamlContent);
      const validated = validateConfig(parsed);

      this.cachedConfig = validated;
      return validated;
    } catch {
      // Return defaults on any error
      this.cachedConfig = { ...DEFAULT_COUNCIL_CONFIG };
      return this.cachedConfig;
    }
  }

  /**
   * Invalidate the cached configuration
   */
  invalidateCache(): void {
    this.cachedConfig = null;
  }

  /**
   * Check if council mode should be used for a given stage
   */
  shouldUseCouncil(stage: string): boolean {
    if (!this.cachedConfig) {
      return false;
    }

    // Council must be globally enabled
    if (!this.cachedConfig.enabled) {
      return false;
    }

    // Check stage-specific setting
    const stageMode = this.cachedConfig.stages[stage];
    return stageMode === 'council';
  }

  /**
   * Get the current configuration (must call loadConfig first)
   */
  getConfig(): CouncilConfig | null {
    return this.cachedConfig;
  }

  /**
   * Get enabled providers from config
   */
  getEnabledProviders(): ProviderConfig[] {
    if (!this.cachedConfig) {
      return [];
    }
    return this.cachedConfig.providers.filter((p) => p.enabled);
  }
}

/**
 * Singleton instance holder
 */
let configLoaderInstance: ConfigLoader | undefined;

/**
 * Get or create the ConfigLoader singleton
 */
export function getConfigLoader(workspacePath: string): ConfigLoader {
  if (!configLoaderInstance || configLoaderInstance['workspacePath'] !== workspacePath) {
    configLoaderInstance = new ConfigLoader(workspacePath);
  }
  return configLoaderInstance;
}

/**
 * Reset the ConfigLoader singleton (for testing)
 */
export function resetConfigLoader(): void {
  configLoaderInstance = undefined;
}
