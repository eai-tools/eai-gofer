/**
 * ObservationMasker - Context Health Enhancement
 *
 * Tracks tool outputs (file reads, command outputs, etc.) and masks older observations
 * to reduce context window usage while preserving the ability to expand them on demand.
 *
 * Key Features:
 * - Age-based observation masking (configurable turn threshold)
 * - Placeholder generation with metadata
 * - Cache persistence to disk
 * - On-demand expansion via MCP tool
 *
 * @see .specify/specs/011-context-health-recursive-memory/contracts/internal-api.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Logger } from '../utils/logger';

/**
 * Types of observations that can be tracked and masked.
 */
export type ObservationType =
  | 'file_read'
  | 'command_output'
  | 'api_response'
  | 'search_result'
  | 'test_output';

/**
 * Configuration for the ObservationMasker.
 */
export interface ObservationMaskerConfig {
  /** Number of turns before an observation is masked (default: 10) */
  ageThresholdTurns: number;
  /** Whether to preserve error messages from masking (default: true) */
  preserveErrorMessages: boolean;
  /** Regex patterns that should never be masked */
  preservePatterns: RegExp[];
  /** Maximum number of observations in cache (default: 100) */
  maxCacheSize: number;
  /** Directory for cache storage (default: .specify/memory/observation-cache) */
  cacheDirectory: string;
}

/**
 * Represents a tracked observation from tool output.
 */
export interface ObservationEntry {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Unix timestamp when observation was created */
  timestamp: number;
  /** Conversation turn when observation occurred */
  turnNumber: number;
  /** Type of observation */
  type: ObservationType;
  /** SHA-256 hash of original content */
  contentHash: string;
  /** Estimated token count */
  tokenEstimate: number;
  /** Full original content */
  originalContent: string;
  /** Optional brief summary for placeholder display */
  summary?: string;
  /** Additional context (file path, command, etc.) */
  metadata?: Record<string, unknown>;
  /** Whether observation is currently masked */
  masked: boolean;
  /** Unix timestamp when masked (if applicable) */
  maskedAt?: number;
}

/**
 * Result of a masking operation.
 */
export interface MaskResult {
  /** Content with masked placeholders */
  maskedContent: string;
  /** Number of observations masked */
  maskedCount: number;
  /** Total tokens saved by masking */
  tokensSaved: number;
  /** The observations that were masked */
  maskedObservations: ObservationEntry[];
}

/**
 * Input for tracking a new observation.
 */
export type TrackObservationInput = Omit<
  ObservationEntry,
  'id' | 'masked' | 'maskedAt' | 'contentHash' | 'tokenEstimate'
> & {
  /** Original content (contentHash and tokenEstimate will be calculated) */
  originalContent: string;
};

/**
 * Serializable format for cache persistence.
 */
interface SerializedCache {
  version: number;
  observations: Array<Omit<ObservationEntry, 'metadata'> & { metadata?: Record<string, unknown> }>;
  lastSaved: number;
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: ObservationMaskerConfig = {
  ageThresholdTurns: 10,
  preserveErrorMessages: true,
  preservePatterns: [/error/i, /exception/i, /failed/i],
  maxCacheSize: 100,
  cacheDirectory: '.specify/memory/observation-cache',
};

/**
 * ObservationMasker implementation.
 *
 * Manages observation tracking, age-based masking, and cache persistence
 * to reduce context window usage while preserving recoverability.
 */
export class ObservationMasker {
  private readonly config: ObservationMaskerConfig;
  private readonly cache: Map<string, ObservationEntry>;
  private readonly logger: Logger;
  private readonly workspaceRoot: string;

  /**
   * Creates a new ObservationMasker instance.
   *
   * @param workspaceRoot - Workspace root directory for cache storage
   * @param config - Optional partial configuration (merged with defaults)
   */
  constructor(workspaceRoot: string, config?: Partial<ObservationMaskerConfig>) {
    this.workspaceRoot = workspaceRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.logger = Logger.for('ObservationMasker');
    this.logger.debug('ObservationMasker initialized', {
      workspaceRoot,
      config: {
        ageThresholdTurns: this.config.ageThresholdTurns,
        maxCacheSize: this.config.maxCacheSize,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Token Estimation (T003)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Estimates the token count for a given string.
   * Uses the approximation: 4 characters ≈ 1 token.
   *
   * @param content - The content to estimate tokens for
   * @returns Estimated token count
   */
  public estimateTokens(content: string): number {
    if (!content) {
      return 0;
    }
    // Approximation: 4 characters ≈ 1 token (common for English text and code)
    return Math.ceil(content.length / 4);
  }

  /**
   * Computes SHA-256 hash of content.
   *
   * @param content - The content to hash
   * @returns Hex-encoded SHA-256 hash
   */
  private computeHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Observation Tracking (T002)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Tracks a new observation.
   *
   * @param entry - Observation data (id, masked, maskedAt, contentHash, tokenEstimate generated)
   * @returns The generated observation ID
   */
  public trackObservation(entry: TrackObservationInput): string {
    const id = uuidv4();
    const observation: ObservationEntry = {
      ...entry,
      id,
      contentHash: this.computeHash(entry.originalContent),
      tokenEstimate: this.estimateTokens(entry.originalContent),
      masked: false,
    };

    this.cache.set(id, observation);
    this.logger.debug('Observation tracked', {
      id,
      type: observation.type,
      tokenEstimate: observation.tokenEstimate,
      turnNumber: observation.turnNumber,
    });

    // Prune cache if it exceeds max size
    if (this.cache.size > this.config.maxCacheSize) {
      this.pruneCache();
    }

    return id;
  }

  /**
   * Retrieves an observation by ID.
   *
   * @param id - The observation ID
   * @returns The observation entry or null if not found
   */
  public getObservation(id: string): ObservationEntry | null {
    return this.cache.get(id) ?? null;
  }

  /**
   * Retrieves all observations.
   *
   * @returns Array of all observation entries
   */
  public getAllObservations(): ObservationEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Clears all observations from the cache.
   */
  public clearCache(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.logger.debug('Cache cleared', { previousCount: count });
  }

  /**
   * Prunes the cache to stay within maxCacheSize.
   * Removes oldest observations first (by timestamp).
   *
   * @param maxSize - Optional max size (defaults to config value)
   * @returns Number of observations pruned
   */
  public pruneCache(maxSize?: number): number {
    const limit = maxSize ?? this.config.maxCacheSize;
    if (this.cache.size <= limit) {
      return 0;
    }

    // Sort by timestamp (oldest first)
    const sorted = Array.from(this.cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = this.cache.size - limit;
    let removed = 0;

    for (let i = 0; i < toRemove && i < sorted.length; i++) {
      this.cache.delete(sorted[i][0]);
      removed++;
    }

    this.logger.debug('Cache pruned', { removed, remaining: this.cache.size });
    return removed;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Masking Operations (T004, T005)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Masks observations older than the age threshold.
   *
   * @param currentTurn - The current conversation turn number
   * @returns MaskResult with masked content and statistics
   */
  public maskOldObservations(currentTurn: number): MaskResult {
    const maskedObservations: ObservationEntry[] = [];
    let tokensSaved = 0;
    const placeholders: string[] = [];

    for (const observation of this.cache.values()) {
      // Skip already masked observations
      if (observation.masked) {
        continue;
      }

      // Check age threshold
      const age = currentTurn - observation.turnNumber;
      if (age < this.config.ageThresholdTurns) {
        continue;
      }

      // Check if content should be preserved
      if (this.shouldPreserve(observation)) {
        continue;
      }

      // Mask the observation
      observation.masked = true;
      observation.maskedAt = Date.now();
      maskedObservations.push(observation);
      tokensSaved += observation.tokenEstimate;

      // Generate placeholder
      placeholders.push(this.generatePlaceholder(observation));
    }

    this.logger.info('Observations masked', {
      maskedCount: maskedObservations.length,
      tokensSaved,
      currentTurn,
    });

    return {
      maskedContent: placeholders.join('\n'),
      maskedCount: maskedObservations.length,
      tokensSaved,
      maskedObservations,
    };
  }

  /**
   * Checks if an observation should be preserved from masking.
   *
   * @param observation - The observation to check
   * @returns True if should be preserved
   */
  private shouldPreserve(observation: ObservationEntry): boolean {
    // Preserve error messages if configured
    if (this.config.preserveErrorMessages) {
      for (const pattern of this.config.preservePatterns) {
        if (pattern.test(observation.originalContent)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generates a placeholder string for a masked observation.
   *
   * @param observation - The observation to generate placeholder for
   * @returns XML-style placeholder string
   */
  public generatePlaceholder(observation: ObservationEntry): string {
    const metadata = observation.metadata ?? {};
    const filePath = metadata.filePath as string | undefined;
    const lineCount = metadata.lineCount as number | undefined;

    let attrs = `id="${observation.id}" type="${observation.type}" tokens="${observation.tokenEstimate}"`;

    if (filePath) {
      attrs += ` file="${filePath}"`;
    }
    if (lineCount !== undefined) {
      attrs += ` lines="${lineCount}"`;
    }
    if (observation.summary) {
      attrs += ` summary="${observation.summary}"`;
    }

    return `<observation_masked ${attrs} />`;
  }

  /**
   * Expands a masked observation, returning its full content.
   *
   * @param id - The observation ID to expand
   * @returns The full observation entry or null if not found
   */
  public expandObservation(id: string): ObservationEntry | null {
    const observation = this.cache.get(id);
    if (!observation) {
      this.logger.warn('Observation not found for expansion', { id });
      return null;
    }

    this.logger.debug('Observation expanded', {
      id,
      type: observation.type,
      tokenEstimate: observation.tokenEstimate,
    });

    return observation;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cache Persistence (T006)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Gets the full path to the cache directory.
   */
  private getCacheDir(): string {
    return path.join(this.workspaceRoot, this.config.cacheDirectory);
  }

  /**
   * Gets the full path to the cache index file.
   */
  private getCacheIndexPath(): string {
    return path.join(this.getCacheDir(), 'index.json');
  }

  /**
   * Saves the cache to disk.
   */
  public async saveCacheToDisk(): Promise<void> {
    const cacheDir = this.getCacheDir();

    // Ensure directory exists
    await fs.promises.mkdir(cacheDir, { recursive: true });

    // Serialize cache
    const serialized: SerializedCache = {
      version: 1,
      observations: Array.from(this.cache.values()),
      lastSaved: Date.now(),
    };

    // Write index file
    const indexPath = this.getCacheIndexPath();
    await fs.promises.writeFile(indexPath, JSON.stringify(serialized, null, 2), 'utf-8');

    this.logger.debug('Cache saved to disk', {
      path: indexPath,
      observationCount: this.cache.size,
    });
  }

  /**
   * Loads the cache from disk.
   */
  public async loadCacheFromDisk(): Promise<void> {
    const indexPath = this.getCacheIndexPath();

    try {
      const content = await fs.promises.readFile(indexPath, 'utf-8');
      const serialized: SerializedCache = JSON.parse(content);

      // Clear existing cache and load from disk
      this.cache.clear();
      for (const observation of serialized.observations) {
        this.cache.set(observation.id, observation);
      }

      this.logger.debug('Cache loaded from disk', {
        path: indexPath,
        observationCount: this.cache.size,
        version: serialized.version,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.debug('No cache file found, starting fresh');
      } else {
        this.logger.error('Failed to load cache from disk', error as Error);
        throw error;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Configuration (T001)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Updates the configuration.
   *
   * @param config - Partial configuration to merge
   */
  public updateConfig(config: Partial<ObservationMaskerConfig>): void {
    Object.assign(this.config, config);
    this.logger.debug('Configuration updated', { config });
  }

  /**
   * Gets the current configuration.
   *
   * @returns Current configuration (copy)
   */
  public getConfig(): ObservationMaskerConfig {
    return { ...this.config };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Statistics
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Gets statistics about the current cache.
   */
  public getStats(): {
    totalObservations: number;
    maskedObservations: number;
    totalTokens: number;
    maskedTokens: number;
  } {
    let maskedObservations = 0;
    let totalTokens = 0;
    let maskedTokens = 0;

    for (const observation of this.cache.values()) {
      totalTokens += observation.tokenEstimate;
      if (observation.masked) {
        maskedObservations++;
        maskedTokens += observation.tokenEstimate;
      }
    }

    return {
      totalObservations: this.cache.size,
      maskedObservations,
      totalTokens,
      maskedTokens,
    };
  }
}
