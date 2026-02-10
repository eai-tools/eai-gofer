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
 * T017: Three-tier decay state for observations.
 */
export type DecayTier = 'full' | 'key-points' | 'masked';

/**
 * T059: Fold level for observations (orthogonal to decay).
 */
export type FoldLevel = 'collapsed' | 'summary' | 'expanded';

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
  /** T018: Fraction of ageThreshold at which to transition full→key-points (default: 0.6) */
  keyPointsAgeFraction: number;
  /** 019 B2: Per-type decay configuration overrides */
  perTypeDecay?: PerTypeDecayConfig;
}

/**
 * 019 B2: Per-observation-type decay rate configuration.
 * Each type can have independent ageThresholdTurns and keyPointsAgeFraction.
 */
export interface PerTypeDecayConfig {
  file_read?: { ageThresholdTurns: number; keyPointsAgeFraction: number };
  command_output?: { ageThresholdTurns: number; keyPointsAgeFraction: number };
  test_output?: { ageThresholdTurns: number; keyPointsAgeFraction: number };
  search_result?: { ageThresholdTurns: number; keyPointsAgeFraction: number };
  api_response?: { ageThresholdTurns: number; keyPointsAgeFraction: number };
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
  /** Whether observation is currently masked (legacy — use decayTier) */
  masked: boolean;
  /** Unix timestamp when masked (if applicable) */
  maskedAt?: number;
  /** T017: Three-tier decay state */
  decayTier: DecayTier;
  /** T017: Generated key-points summary (when decayTier === 'key-points') */
  keyPointsContent?: string;
  /** T017: Timestamp when transitioned to key-points */
  keyPointsAt?: number;
  /** T059: User-controlled fold level (orthogonal to decay) */
  foldLevel?: FoldLevel;
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
  /** Current cache size after masking */
  cacheSize: number;
  /** Number of entries evicted during this operation */
  evictionCount: number;
  /** T021: Number of observations transitioned to key-points this cycle */
  keyPointsCount: number;
  /** T021: Per-tier observation counts */
  tierCounts: { full: number; keyPoints: number; masked: number };
}

/**
 * Input for tracking a new observation.
 */
export type TrackObservationInput = Omit<
  ObservationEntry,
  'id' | 'masked' | 'maskedAt' | 'contentHash' | 'tokenEstimate' | 'decayTier' | 'keyPointsContent' | 'keyPointsAt' | 'foldLevel'
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
/**
 * 019 B2: Default per-type decay rates.
 * test_output preserved longest (12 turns), search_result shortest (6 turns).
 */
const DEFAULT_PER_TYPE_DECAY: Required<PerTypeDecayConfig> = {
  file_read: { ageThresholdTurns: 10, keyPointsAgeFraction: 0.6 },
  command_output: { ageThresholdTurns: 8, keyPointsAgeFraction: 0.5 },
  test_output: { ageThresholdTurns: 12, keyPointsAgeFraction: 0.7 },
  search_result: { ageThresholdTurns: 6, keyPointsAgeFraction: 0.5 },
  api_response: { ageThresholdTurns: 8, keyPointsAgeFraction: 0.5 },
};

const DEFAULT_CONFIG: ObservationMaskerConfig = {
  ageThresholdTurns: 10,
  preserveErrorMessages: true,
  preservePatterns: [/error/i, /exception/i, /failed/i, /failure/i, /critical/i, /fatal/i, /panic/i, /unhandled/i, /stack\s?trace/i],
  maxCacheSize: 100,
  cacheDirectory: '.specify/memory/observation-cache',
  keyPointsAgeFraction: 0.6,
  perTypeDecay: undefined, // Only apply per-type decay when explicitly configured
};

/**
 * ObservationMasker implementation.
 *
 * Manages observation tracking, age-based masking, and cache persistence
 * to reduce context window usage while preserving recoverability.
 */
/**
 * Duck-typed interface for LLM summarization (T039).
 * Allows ObservationMasker to optionally use LLM for key-point generation.
 */
export interface LLMSummarizerLike {
  isAvailable(): boolean;
  isRateLimited(): boolean;
  summarize(prompt: string, maxTokens?: number): Promise<{ text: string } | null>;
}

export class ObservationMasker {
  private config: ObservationMaskerConfig;
  private readonly cache: Map<string, ObservationEntry>;
  private readonly logger: Logger;
  private readonly workspaceRoot: string;
  private llmProvider?: LLMSummarizerLike;

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

  /**
   * T039: Set optional LLM provider for enhanced key-point generation.
   * When set and available, key-points are generated via LLM summarization
   * instead of deterministic extractors. Falls back on error or missing key.
   */
  setLLMProvider(provider: LLMSummarizerLike): void {
    this.llmProvider = provider;
  }

  /**
   * 018: Update preserve patterns at runtime (for config reload).
   */
  updatePreservePatterns(patterns: RegExp[]): void {
    this.config = { ...this.config, preservePatterns: patterns };
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
      decayTier: 'full',
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

    // 018 T022: Auto-trigger LLM compression when observation count exceeds threshold
    if (this.cache.size > 50 && this.llmProvider) {
      const fullCount = Array.from(this.cache.values()).filter(o => o.decayTier === 'key-points').length;
      if (fullCount > 20) {
        this.enhanceKeyPointsWithLLM().catch(() => {});
      }
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

    // Calculate tokens reclaimed from evicted entries
    const tokensReclaimed = sorted.slice(0, removed).reduce((sum, [, obs]) => sum + (obs.tokenEstimate || 0), 0);
    this.logger.info('LRU eviction completed', { evictionCount: removed, tokensReclaimed, cacheSize: this.cache.size });
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
    let keyPointsCount = 0;
    const placeholders: string[] = [];

    for (const observation of this.cache.values()) {
      // Skip already fully masked observations
      if (observation.decayTier === 'masked') {
        continue;
      }

      // 019 B5: Content-aware error preservation
      if (this.shouldPreserve(observation)) {
        continue;
      }

      const age = currentTurn - observation.turnNumber;

      // 019 B2: Use per-type decay thresholds when available
      const typeDecay = this.getTypeDecayConfig(observation.type);
      const ageThreshold = typeDecay.ageThresholdTurns;
      const keyPointsThreshold = Math.floor(ageThreshold * typeDecay.keyPointsAgeFraction);

      // T019: Two-step decay — full→key-points at fraction, key-points→masked at threshold
      if (observation.decayTier === 'full' && age >= keyPointsThreshold) {
        // Transition full → key-points
        observation.decayTier = 'key-points';
        observation.keyPointsContent = this.generateKeyPoints(observation);
        observation.keyPointsAt = Date.now();
        keyPointsCount++;

        // If also past full threshold, go straight to masked
        if (age >= ageThreshold) {
          observation.decayTier = 'masked';
          observation.masked = true;
          observation.maskedAt = Date.now();
          maskedObservations.push(observation);
          tokensSaved += observation.tokenEstimate;
          placeholders.push(this.generatePlaceholder(observation));
        }
      } else if (observation.decayTier === 'key-points' && age >= ageThreshold) {
        // Transition key-points → masked
        observation.decayTier = 'masked';
        observation.masked = true;
        observation.maskedAt = Date.now();
        maskedObservations.push(observation);
        // Token savings = original minus key-points estimate
        const keyPointsTokens = observation.keyPointsContent
          ? this.estimateTokens(observation.keyPointsContent)
          : 0;
        tokensSaved += observation.tokenEstimate - keyPointsTokens;
        placeholders.push(this.generatePlaceholder(observation));
      }
    }

    // T005: Prune after masking and track eviction stats
    const pruned = this.cache.size > this.config.maxCacheSize ? this.pruneCache() : 0;

    // T021: Count per-tier stats
    const tierCounts = { full: 0, keyPoints: 0, masked: 0 };
    for (const obs of this.cache.values()) {
      if (obs.decayTier === 'full') tierCounts.full++;
      else if (obs.decayTier === 'key-points') tierCounts.keyPoints++;
      else tierCounts.masked++;
    }

    this.logger.info('Observations masked', {
      maskedCount: maskedObservations.length,
      keyPointsCount,
      tokensSaved,
      currentTurn,
      cacheSize: this.cache.size,
      evictionCount: pruned,
      tierCounts,
    });

    return {
      maskedContent: placeholders.join('\n'),
      maskedCount: maskedObservations.length,
      tokensSaved,
      maskedObservations,
      cacheSize: this.cache.size,
      evictionCount: pruned,
      keyPointsCount,
      tierCounts,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // T020: Type-Specific Key-Point Extractors
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generates key-points summary for an observation based on its type.
   */
  private generateKeyPoints(observation: ObservationEntry): string {
    switch (observation.type) {
      case 'file_read':
        return this.extractFileKeyPoints(observation.originalContent);
      case 'command_output':
        return this.extractCommandKeyPoints(observation.originalContent);
      case 'search_result':
        return this.extractSearchKeyPoints(observation.originalContent);
      case 'test_output':
        return this.extractTestKeyPoints(observation.originalContent);
      default:
        return this.extractCommandKeyPoints(observation.originalContent);
    }
  }

  /**
   * T039: Enhance existing key-points with LLM summarization.
   *
   * Iterates observations in key-points tier and replaces deterministic
   * key-points with LLM-generated summaries. Falls back gracefully on
   * error or when LLM is unavailable/rate-limited.
   *
   * @returns Number of observations enhanced
   */
  async enhanceKeyPointsWithLLM(): Promise<number> {
    if (!this.llmProvider || !this.llmProvider.isAvailable()) {
      return 0;
    }

    let enhanced = 0;
    for (const observation of this.cache.values()) {
      if (observation.decayTier !== 'key-points') continue;
      if (this.llmProvider.isRateLimited()) break;

      try {
        const prompt = `Summarize this ${observation.type} observation concisely. Preserve key facts, file paths, decisions, and error details. Keep under 200 words.\n\n${observation.originalContent.slice(0, 3000)}`;
        const result = await this.llmProvider.summarize(prompt, 250);
        if (result && result.text) {
          observation.keyPointsContent = result.text;
          enhanced++;
        }
      } catch {
        // Fall back to existing deterministic key-points
      }
    }

    return enhanced;
  }

  /** Extract first 3 + last 2 lines from file content. */
  private extractFileKeyPoints(content: string): string {
    const lines = content.split('\n');
    if (lines.length <= 5) return content;
    const first = lines.slice(0, 3);
    const last = lines.slice(-2);
    return [...first, `  ... (${lines.length - 5} lines omitted) ...`, ...last].join('\n');
  }

  /** Extract first 5 + last 5 lines from command output. */
  private extractCommandKeyPoints(content: string): string {
    const lines = content.split('\n');
    if (lines.length <= 10) return content;
    const first = lines.slice(0, 5);
    const last = lines.slice(-5);
    return [...first, `  ... (${lines.length - 10} lines omitted) ...`, ...last].join('\n');
  }

  /** Extract file paths and match count from search results. */
  private extractSearchKeyPoints(content: string): string {
    const lines = content.split('\n');
    const filePaths = lines.filter(l => l.match(/^[\/\w].*\.(ts|js|md|json|yaml)/));
    const count = lines.length;
    if (filePaths.length === 0) return this.extractCommandKeyPoints(content);
    return `Found ${count} results in ${filePaths.length} files:\n${filePaths.slice(0, 10).join('\n')}`;
  }

  /** Extract pass/fail summary from test output. */
  private extractTestKeyPoints(content: string): string {
    const lines = content.split('\n');
    const summaryLines = lines.filter(
      l => l.match(/\d+\s*(pass|fail|skip|error|test)/i) || l.match(/^(PASS|FAIL|✓|✗|×)/)
    );
    if (summaryLines.length > 0) {
      return `Test summary:\n${summaryLines.join('\n')}`;
    }
    return this.extractCommandKeyPoints(content);
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
      // 019 B5: Use content-aware error classification instead of simple regex
      if (this.isActualError(observation.originalContent)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 019 B2: Get per-type decay config, falling back to global defaults.
   */
  private getTypeDecayConfig(type: ObservationType): { ageThresholdTurns: number; keyPointsAgeFraction: number } {
    const perType = this.config.perTypeDecay;
    if (perType) {
      const typeConfig = perType[type];
      if (typeConfig) {
        return typeConfig;
      }
    }
    return {
      ageThresholdTurns: this.config.ageThresholdTurns,
      keyPointsAgeFraction: this.config.keyPointsAgeFraction,
    };
  }

  /**
   * 019 B5: Content-aware error detection.
   * Distinguishes actual error traces from documentation mentioning errors.
   * Returns true only for content that IS an error (stack traces, exit codes, test failures).
   */
  private isActualError(content: string): boolean {
    const lines = content.split('\n');
    let errorIndicators = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      // Stack trace lines: "at FunctionName (file:line:col)" or "at file:line:col"
      if (/^\s*at\s+/.test(line)) { errorIndicators++; continue; }
      // Error prefix: "Error: message" or "TypeError: message" or "SomeError: message"
      if (/^([A-Z][a-zA-Z]*)?Error:/.test(trimmed)) { errorIndicators++; continue; }
      // Exit code patterns
      if (/exit\s+code\s+[1-9]/i.test(trimmed)) { errorIndicators++; continue; }
      // Test FAIL markers
      if (/^(FAIL|FAILED|✗|✖|×)\s/i.test(trimmed)) { errorIndicators++; continue; }
      // npm ERR! prefix
      if (/^npm\s+ERR!/i.test(trimmed)) { errorIndicators++; continue; }
      // Process exited with non-zero
      if (/process\s+exited?\s+with\s+(code\s+)?[1-9]/i.test(trimmed)) { errorIndicators++; continue; }
    }

    // A single strong indicator (Error: prefix, stack trace, FAIL marker) is enough.
    // The patterns are already specific enough to avoid false positives from prose.
    return errorIndicators >= 1;
  }

  /**
   * 019 B2: Load per-type decay config from YAML file if present.
   * Falls back to DEFAULT_PER_TYPE_DECAY if file doesn't exist.
   */
  public loadPerTypeDecayFromYaml(workspaceRoot: string): void {
    const configPath = path.join(workspaceRoot, '.specify', 'memory', 'observation-config.yaml');
    try {
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        // Simple YAML parsing for key: value pairs (no full YAML library needed)
        const perType: PerTypeDecayConfig = {};
        let currentType: string | null = null;
        for (const line of raw.split('\n')) {
          const typeMatch = line.match(/^(\w+):\s*$/);
          if (typeMatch && typeMatch[1] in DEFAULT_PER_TYPE_DECAY) {
            currentType = typeMatch[1];
            (perType as Record<string, { ageThresholdTurns: number; keyPointsAgeFraction: number }>)[currentType] =
              { ...DEFAULT_PER_TYPE_DECAY[currentType as keyof typeof DEFAULT_PER_TYPE_DECAY] };
          }
          if (currentType) {
            const ageMatch = line.match(/^\s+ageThresholdTurns:\s*(\d+)/);
            if (ageMatch) {
              (perType as Record<string, { ageThresholdTurns: number; keyPointsAgeFraction: number }>)[currentType].ageThresholdTurns = parseInt(ageMatch[1], 10);
            }
            const fracMatch = line.match(/^\s+keyPointsAgeFraction:\s*([\d.]+)/);
            if (fracMatch) {
              (perType as Record<string, { ageThresholdTurns: number; keyPointsAgeFraction: number }>)[currentType].keyPointsAgeFraction = parseFloat(fracMatch[1]);
            }
          }
        }
        this.config = { ...this.config, perTypeDecay: { ...DEFAULT_PER_TYPE_DECAY, ...perType } };
        this.logger.info('Loaded per-type decay config from YAML', { configPath });
      }
    } catch {
      this.logger.warn('Failed to load per-type decay YAML config, using defaults');
    }
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

  // ─────────────────────────────────────────────────────────────────────────────
  // T059: Fold Level Control (orthogonal to decay)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Set the fold level for an observation (user-controlled, orthogonal to decay).
   *
   * @param id - The observation ID
   * @param level - The fold level to set
   * @returns True if observation was found and updated, false otherwise
   */
  public setFoldLevel(id: string, level: FoldLevel): boolean {
    const observation = this.cache.get(id);
    if (!observation) {
      this.logger.warn('Observation not found for fold level change', { id, level });
      return false;
    }
    observation.foldLevel = level;
    this.logger.debug('Fold level set', { id, level, type: observation.type });
    return true;
  }

  /**
   * Get the fold level for an observation.
   *
   * @param id - The observation ID
   * @returns The fold level or undefined if not found
   */
  public getFoldLevel(id: string): FoldLevel | undefined {
    const observation = this.cache.get(id);
    return observation?.foldLevel;
  }

  /**
   * Get observations filtered by fold level.
   */
  public getObservationsByFoldLevel(level: FoldLevel): ObservationEntry[] {
    return Array.from(this.cache.values()).filter(o => o.foldLevel === level);
  }

  /**
   * Expands a masked observation, returning its full content.
   *
   * @param id - The observation ID to expand
   * @returns The full observation entry or null if not found
   */
  public expandObservation(id: string, currentTurn?: number): ObservationEntry | null {
    const observation = this.cache.get(id);
    if (!observation) {
      this.logger.warn('Observation not found for expansion', { id });
      return null;
    }

    // 019 B8: Log observation age at expansion for window tuning validation
    const ageAtExpansion = currentTurn !== undefined ? currentTurn - observation.turnNumber : undefined;
    this.logger.debug('Observation expanded', {
      id,
      type: observation.type,
      tokenEstimate: observation.tokenEstimate,
      ageAtExpansion,
      decayTier: observation.decayTier,
    });

    // 019 B8: Track expansion metrics for window validation
    if (ageAtExpansion !== undefined) {
      this.expansionMetrics.push({
        type: observation.type,
        ageAtExpansion,
        timestamp: Date.now(),
      });
      // Keep last 100 metrics
      if (this.expansionMetrics.length > 100) {
        this.expansionMetrics.shift();
      }
    }

    return observation;
  }

  /** 019 B8: Expansion metrics for observation window validation */
  private expansionMetrics: Array<{ type: ObservationType; ageAtExpansion: number; timestamp: number }> = [];

  /**
   * 019 B8: Validate observation windows by comparing configured thresholds
   * against actual expansion patterns. Returns per-type metrics.
   */
  public validateObservationWindows(): Record<string, { avgAgeAtExpansion: number; configuredThreshold: number; expanding_after_mask: boolean }> {
    const result: Record<string, { avgAgeAtExpansion: number; configuredThreshold: number; expanding_after_mask: boolean }> = {};
    const byType = new Map<string, number[]>();

    for (const m of this.expansionMetrics) {
      const arr = byType.get(m.type) || [];
      arr.push(m.ageAtExpansion);
      byType.set(m.type, arr);
    }

    for (const [type, ages] of byType) {
      const avg = ages.reduce((s, a) => s + a, 0) / ages.length;
      const typeDecay = this.getTypeDecayConfig(type as ObservationType);
      result[type] = {
        avgAgeAtExpansion: Math.round(avg * 10) / 10,
        configuredThreshold: typeDecay.ageThresholdTurns,
        expanding_after_mask: avg >= typeDecay.ageThresholdTurns,
      };
    }

    this.logger.info('Observation window validation', { metrics: result });
    return result;
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
        // T023: Migrate legacy entries without decayTier
        if (!observation.decayTier) {
          observation.decayTier = observation.masked ? 'masked' : 'full';
        }
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
