/**
 * StageContextProfileLoader - YAML Configuration Loader for Stage Profiles
 *
 * Loads and validates stage context profiles from YAML configuration files.
 * Provides caching and default fallback behavior.
 *
 * @see .specify/specs/011-context-health-recursive-memory/tasks.md T036
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { Logger } from '../utils/logger';
import {
  type GoferStage,
  type StageContextProfile,
  type StageContextProfileConfig,
  type StageContextProfileYaml,
  type ProfileValidationResult,
  GOFER_STAGES,
  isValidGoferStage,
  validateProfile,
  DEFAULT_PROFILES,
} from './StageContextProfile';

/**
 * Configuration for the profile loader.
 */
export interface StageContextProfileLoaderConfig {
  /** Path to the config file relative to workspace root */
  configPath: string;
  /** Whether to use defaults when config is missing */
  useDefaultsOnMissing: boolean;
  /** Whether to cache loaded profiles */
  enableCaching: boolean;
}

/**
 * Default loader configuration.
 */
const DEFAULT_LOADER_CONFIG: StageContextProfileLoaderConfig = {
  configPath: '.specify/memory/context-profiles.yaml',
  useDefaultsOnMissing: true,
  enableCaching: true,
};

/**
 * Load result with metadata.
 */
export interface ProfileLoadResult {
  /** Loaded profiles map */
  profiles: Map<GoferStage, StageContextProfile>;
  /** Default stage from config */
  defaultStage: GoferStage;
  /** Config file version */
  version: string;
  /** Whether defaults were used */
  usedDefaults: boolean;
  /** Validation warnings (non-fatal) */
  warnings: string[];
}

/**
 * StageContextProfileLoader loads and caches stage context profiles.
 */
export class StageContextProfileLoader {
  private readonly config: StageContextProfileLoaderConfig;
  private readonly logger: Logger;
  private readonly workspaceRoot: string;
  private profileCache: Map<GoferStage, StageContextProfile> | null = null;
  private defaultStage: GoferStage = 'implement';
  private configVersion: string = '1.0';
  private lastLoadTime: number = 0;

  /**
   * Creates a new StageContextProfileLoader.
   *
   * @param workspaceRoot - Workspace root directory
   * @param config - Optional partial configuration
   */
  constructor(workspaceRoot: string, config?: Partial<StageContextProfileLoaderConfig>) {
    this.workspaceRoot = workspaceRoot;
    this.config = { ...DEFAULT_LOADER_CONFIG, ...config };
    this.logger = Logger.for('StageContextProfileLoader');
    this.logger.debug('StageContextProfileLoader initialized', {
      workspaceRoot,
      configPath: this.config.configPath,
    });
  }

  /**
   * Gets the full path to the config file.
   *
   * @returns Absolute path to config file
   */
  getConfigPath(): string {
    return path.join(this.workspaceRoot, this.config.configPath);
  }

  /**
   * Loads profiles from the YAML configuration file.
   *
   * @param forceReload - Force reload even if cached
   * @returns Promise<ProfileLoadResult>
   */
  async loadProfiles(forceReload: boolean = false): Promise<ProfileLoadResult> {
    // Return cached if available and not forcing reload
    if (!forceReload && this.config.enableCaching && this.profileCache) {
      return {
        profiles: this.profileCache,
        defaultStage: this.defaultStage,
        version: this.configVersion,
        usedDefaults: false,
        warnings: [],
      };
    }

    const configPath = this.getConfigPath();
    const warnings: string[] = [];
    let usedDefaults = false;

    try {
      // Check if config file exists
      await fs.promises.access(configPath);

      // Read and parse YAML
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const parsed = yaml.parse(content) as StageContextProfileConfig;

      // Validate and convert profiles
      const profiles = this.parseAndValidateConfig(parsed, warnings);

      // Update instance state
      this.profileCache = profiles;
      this.defaultStage = isValidGoferStage(parsed.default) ? parsed.default : 'implement';
      this.configVersion = parsed.version || '1.0';
      this.lastLoadTime = Date.now();

      this.logger.info('Loaded stage profiles from config', {
        profileCount: profiles.size,
        defaultStage: this.defaultStage,
        version: this.configVersion,
      });

      return {
        profiles,
        defaultStage: this.defaultStage,
        version: this.configVersion,
        usedDefaults: false,
        warnings,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.warn('Config file not found, using defaults', { configPath });
      } else {
        this.logger.error('Failed to load config file', error as Error);
      }

      // Use defaults if configured
      if (this.config.useDefaultsOnMissing) {
        const profiles = this.getDefaultProfiles();
        this.profileCache = profiles;
        this.defaultStage = 'implement';
        this.configVersion = '1.0';
        this.lastLoadTime = Date.now();
        usedDefaults = true;

        return {
          profiles,
          defaultStage: this.defaultStage,
          version: this.configVersion,
          usedDefaults: true,
          warnings: ['Using default profiles - config file not found or invalid'],
        };
      }

      throw error;
    }
  }

  /**
   * Parses and validates the config file content.
   *
   * @param config - Parsed YAML content
   * @param warnings - Array to collect warnings
   * @returns Map of validated profiles
   */
  private parseAndValidateConfig(
    config: StageContextProfileConfig,
    warnings: string[]
  ): Map<GoferStage, StageContextProfile> {
    const profiles = new Map<GoferStage, StageContextProfile>();

    if (!config.profiles || typeof config.profiles !== 'object') {
      warnings.push('No profiles section in config, using defaults');
      return this.getDefaultProfiles();
    }

    // Parse each profile
    for (const [key, yamlProfile] of Object.entries(config.profiles)) {
      const stage = yamlProfile.stage || key;

      if (!isValidGoferStage(stage)) {
        warnings.push(`Skipping invalid stage: ${stage}`);
        continue;
      }

      const profile = this.convertYamlProfile(yamlProfile, stage as GoferStage);
      const validation = validateProfile(profile);

      if (!validation.valid) {
        warnings.push(`Invalid profile for ${stage}: ${validation.errors.join(', ')}`);
        // Use default for invalid profiles
        profiles.set(stage as GoferStage, DEFAULT_PROFILES[stage as GoferStage]);
      } else {
        warnings.push(...validation.warnings);
        profiles.set(stage as GoferStage, profile);
      }
    }

    // Fill in missing stages with defaults
    for (const stage of GOFER_STAGES) {
      if (!profiles.has(stage)) {
        profiles.set(stage, DEFAULT_PROFILES[stage]);
        warnings.push(`Missing profile for ${stage}, using default`);
      }
    }

    return profiles;
  }

  /**
   * Converts a YAML profile to a StageContextProfile.
   *
   * @param yaml - YAML profile data
   * @param stage - Gofer stage
   * @returns StageContextProfile
   */
  private convertYamlProfile(
    yaml: StageContextProfileYaml,
    stage: GoferStage
  ): StageContextProfile {
    return {
      stage,
      description: yaml.description,
      researchBudget: Number(yaml.researchBudget) || 0,
      memoryBudget: Number(yaml.memoryBudget) || 0,
      codeBudget: Number(yaml.codeBudget) || 0,
      observationWindow: Number(yaml.observationWindow) || 10,
    };
  }

  /**
   * Gets the default profiles map.
   *
   * @returns Map of default profiles
   */
  private getDefaultProfiles(): Map<GoferStage, StageContextProfile> {
    const profiles = new Map<GoferStage, StageContextProfile>();
    for (const stage of GOFER_STAGES) {
      profiles.set(stage, DEFAULT_PROFILES[stage]);
    }
    return profiles;
  }

  /**
   * Gets the profile for a specific stage.
   *
   * @param stage - Gofer stage
   * @returns Promise<StageContextProfile>
   */
  async getProfile(stage: GoferStage): Promise<StageContextProfile> {
    const result = await this.loadProfiles();
    return result.profiles.get(stage) || DEFAULT_PROFILES[stage];
  }

  /**
   * Gets the profile for a specific stage synchronously (uses cache).
   *
   * @param stage - Gofer stage
   * @returns StageContextProfile or default if not loaded
   */
  getProfileSync(stage: GoferStage): StageContextProfile {
    if (this.profileCache) {
      return this.profileCache.get(stage) || DEFAULT_PROFILES[stage];
    }
    return DEFAULT_PROFILES[stage];
  }

  /**
   * Gets the default stage from config.
   *
   * @returns Default GoferStage
   */
  getDefaultStage(): GoferStage {
    return this.defaultStage;
  }

  /**
   * Gets the profile for the default stage.
   *
   * @returns Promise<StageContextProfile>
   */
  async getDefaultProfile(): Promise<StageContextProfile> {
    const result = await this.loadProfiles();
    return result.profiles.get(result.defaultStage) || DEFAULT_PROFILES[result.defaultStage];
  }

  /**
   * Gets all loaded profiles.
   *
   * @returns Promise<Map<GoferStage, StageContextProfile>>
   */
  async getAllProfiles(): Promise<Map<GoferStage, StageContextProfile>> {
    const result = await this.loadProfiles();
    return result.profiles;
  }

  /**
   * Validates a profile configuration.
   *
   * @param profile - Profile to validate
   * @returns ProfileValidationResult
   */
  validateProfile(profile: StageContextProfile): ProfileValidationResult {
    return validateProfile(profile);
  }

  /**
   * Checks if profiles have been loaded.
   *
   * @returns True if profiles are loaded
   */
  isLoaded(): boolean {
    return this.profileCache !== null;
  }

  /**
   * Gets the last load time.
   *
   * @returns Timestamp of last load or 0 if never loaded
   */
  getLastLoadTime(): number {
    return this.lastLoadTime;
  }

  /**
   * Clears the profile cache.
   */
  clearCache(): void {
    this.profileCache = null;
    this.lastLoadTime = 0;
    this.logger.debug('Profile cache cleared');
  }

  /**
   * Gets the loader configuration.
   *
   * @returns Current configuration
   */
  getConfig(): StageContextProfileLoaderConfig {
    return { ...this.config };
  }

  /**
   * Reloads profiles from disk.
   *
   * @returns Promise<ProfileLoadResult>
   */
  async reload(): Promise<ProfileLoadResult> {
    return this.loadProfiles(true);
  }
}
