/**
 * ResearchChunker - Context Health Enhancement
 *
 * Splits research documents into semantic chunks for on-demand loading.
 * Reduces context usage by loading only relevant sections instead of full documents.
 *
 * Key Features:
 * - Semantic chunking by markdown sections (H1-H6)
 * - Research index generation with chunk summaries
 * - On-demand chunk loading by ID
 * - Relevance scoring for task context
 *
 * @see .specify/specs/011-context-health-recursive-memory/contracts/mcp-tools.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types and Interfaces (T051)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A semantic chunk of a research document.
 */
export interface ResearchChunk {
  /** Unique chunk identifier */
  id: string;
  /** Path to source research.md */
  sourceFile: string;
  /** Markdown heading for this chunk */
  sectionTitle: string;
  /** Chunk content */
  content: string;
  /** Estimated token count */
  tokenEstimate: number;
  /** Keywords for relevance matching */
  relevanceKeywords: string[];
  /** Order in original document */
  order: number;
  /** Markdown heading level (1-6) */
  headingLevel: number;
}

/**
 * Summary of a chunk for the index.
 */
export interface ChunkSummary {
  /** Chunk identifier */
  id: string;
  /** Section title */
  title: string;
  /** Token count */
  tokens: number;
  /** Relevance keywords */
  keywords: string[];
}

/**
 * Index of all chunks for a research document.
 */
export interface ResearchIndex {
  /** Path to source research.md */
  sourceFile: string;
  /** Total tokens across all chunks */
  totalTokens: number;
  /** Number of chunks */
  chunkCount: number;
  /** Unix milliseconds when index was created */
  created: number;
  /** Summary of each chunk */
  chunks: ChunkSummary[];
}

/**
 * Configuration options for the ResearchChunker.
 */
export interface ResearchChunkerOptions {
  /** Minimum tokens for a chunk to be kept separate (default: 100) */
  minChunkTokens: number;
  /** Maximum tokens for a single chunk before splitting (default: 5000) */
  maxChunkTokens: number;
  /** Whether to merge small sibling chunks (default: true) */
  mergeSmallChunks: boolean;
  /** Directory for storing research indices (default: .specify/specs) */
  specsDirectory: string;
  /** Whether to cache indices in memory (default: true) */
  cacheIndices: boolean;
}

/**
 * Result of a chunk relevance scoring operation.
 */
export interface ScoredChunk extends ResearchChunk {
  /** Relevance score (0-100) */
  relevanceScore: number;
}

/**
 * Result of indexing a research file.
 */
export interface IndexResult {
  /** The generated index */
  index: ResearchIndex;
  /** Full chunks (for caching) */
  chunks: ResearchChunk[];
  /** Whether index was loaded from cache */
  fromCache: boolean;
}

/**
 * Default configuration values.
 */
const DEFAULT_OPTIONS: ResearchChunkerOptions = {
  minChunkTokens: 100,
  maxChunkTokens: 5000,
  mergeSmallChunks: true,
  specsDirectory: '.specify/specs',
  cacheIndices: true,
};

/**
 * Common stopwords to filter from keywords.
 */
const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'been',
  'be',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'need',
  'dare',
  'ought',
  'used',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'they',
  'them',
  'their',
  'we',
  'us',
  'our',
  'you',
  'your',
  'he',
  'she',
  'him',
  'her',
  'his',
  'i',
  'me',
  'my',
  'not',
  'no',
  'nor',
  'so',
  'if',
  'then',
  'else',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'only',
  'own',
  'same',
  'than',
  'too',
  'very',
  'just',
  'also',
  'now',
  'here',
  'there',
  'which',
  'who',
  'what',
  'any',
  'about',
  'into',
  'over',
  'after',
  'before',
  'between',
]);

// ─────────────────────────────────────────────────────────────────────────────
// ResearchChunker Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ResearchChunker implementation.
 *
 * Parses research.md files into semantic chunks based on markdown headings,
 * generates indices for efficient lookup, and provides on-demand loading.
 */
/** Maximum number of spec indices to keep in memory */
const MAX_INDEX_CACHE_SIZE = 50;

export class ResearchChunker {
  private readonly options: ResearchChunkerOptions;
  private readonly logger: Logger;
  private readonly workspaceRoot: string;
  private readonly indexCache: Map<string, IndexResult>;

  /**
   * Creates a new ResearchChunker instance.
   *
   * @param workspaceRoot - Workspace root directory
   * @param options - Optional partial configuration (merged with defaults)
   */
  constructor(workspaceRoot: string, options?: Partial<ResearchChunkerOptions>) {
    this.workspaceRoot = workspaceRoot;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.logger = Logger.for('ResearchChunker');
    this.indexCache = new Map();

    this.logger.debug('ResearchChunker initialized', {
      workspaceRoot,
      options: {
        minChunkTokens: this.options.minChunkTokens,
        maxChunkTokens: this.options.maxChunkTokens,
        mergeSmallChunks: this.options.mergeSmallChunks,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Token Estimation
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
    return Math.ceil(content.length / 4);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Semantic Chunking (T052)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Parses markdown content into semantic chunks based on headings.
   *
   * @param content - The markdown content to parse
   * @param sourceFile - Path to the source file
   * @returns Array of research chunks
   */
  public parseMarkdownToChunks(content: string, sourceFile: string): ResearchChunk[] {
    const lines = content.split('\n');
    const chunks: ResearchChunk[] = [];
    let currentChunk: Partial<ResearchChunk> | null = null;
    let currentContent: string[] = [];
    let order = 0;

    // Regex to match markdown headings (# to ######)
    const headingRegex = /^(#{1,6})\s+(.+)$/;

    for (const line of lines) {
      const match = headingRegex.exec(line);

      if (match) {
        // Save the previous chunk if it exists
        if (currentChunk && currentContent.length > 0) {
          const chunkContent = currentContent.join('\n').trim();
          if (chunkContent) {
            chunks.push(this.finalizeChunk(currentChunk, chunkContent, sourceFile));
          }
        }

        // Start a new chunk
        const headingLevel = match[1].length;
        const sectionTitle = match[2].trim();

        currentChunk = {
          id: this.generateChunkId(sectionTitle, order),
          sectionTitle,
          headingLevel,
          order: order++,
        };
        currentContent = [line]; // Include the heading in the content
      } else {
        // Add line to current chunk content
        currentContent.push(line);
      }
    }

    // Don't forget the last chunk
    if (currentChunk && currentContent.length > 0) {
      const chunkContent = currentContent.join('\n').trim();
      if (chunkContent) {
        chunks.push(this.finalizeChunk(currentChunk, chunkContent, sourceFile));
      }
    }

    // Handle content before first heading (if any)
    if (chunks.length === 0 && content.trim()) {
      chunks.push({
        id: this.generateChunkId('Introduction', 0),
        sourceFile,
        sectionTitle: 'Introduction',
        content: content.trim(),
        tokenEstimate: this.estimateTokens(content),
        relevanceKeywords: this.extractKeywords(content),
        order: 0,
        headingLevel: 1,
      });
    }

    // Apply chunk merging and splitting if configured
    const processedChunks = this.options.mergeSmallChunks ? this.mergeSmallChunks(chunks) : chunks;

    this.logger.debug('Markdown parsed to chunks', {
      sourceFile,
      chunkCount: processedChunks.length,
      totalTokens: processedChunks.reduce((sum, c) => sum + c.tokenEstimate, 0),
    });

    return processedChunks;
  }

  /**
   * Finalizes a chunk by calculating tokens and extracting keywords.
   */
  private finalizeChunk(
    partial: Partial<ResearchChunk>,
    content: string,
    sourceFile: string
  ): ResearchChunk {
    return {
      id: partial.id!,
      sourceFile,
      sectionTitle: partial.sectionTitle!,
      content,
      tokenEstimate: this.estimateTokens(content),
      relevanceKeywords: this.extractKeywords(content),
      order: partial.order!,
      headingLevel: partial.headingLevel!,
    };
  }

  /**
   * Generates a unique chunk ID from the section title.
   */
  private generateChunkId(title: string, order: number): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 30);

    return `chunk-${order.toString().padStart(3, '0')}-${slug}`;
  }

  /**
   * Extracts relevance keywords from content.
   */
  private extractKeywords(content: string): string[] {
    // Tokenize content
    const words = content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word));

    // Count word frequencies
    const frequency = new Map<string, number>();
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    // Sort by frequency and take top keywords
    const sorted = Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);

    return sorted;
  }

  /**
   * Merges small adjacent chunks to meet minimum token threshold.
   */
  private mergeSmallChunks(chunks: ResearchChunk[]): ResearchChunk[] {
    if (chunks.length <= 1) {
      return chunks;
    }

    const result: ResearchChunk[] = [];
    let pendingChunk: ResearchChunk | null = null;

    for (const chunk of chunks) {
      if (pendingChunk) {
        // Check if we should merge with pending
        const combinedTokens: number = pendingChunk.tokenEstimate + chunk.tokenEstimate;

        if (
          pendingChunk.tokenEstimate < this.options.minChunkTokens &&
          combinedTokens <= this.options.maxChunkTokens &&
          chunk.headingLevel > pendingChunk.headingLevel
        ) {
          // Merge: pending is the parent, chunk is a child
          const mergedChunk: ResearchChunk = {
            ...pendingChunk,
            content: pendingChunk.content + '\n\n' + chunk.content,
            tokenEstimate: combinedTokens,
            relevanceKeywords: [
              ...new Set([...pendingChunk.relevanceKeywords, ...chunk.relevanceKeywords]),
            ].slice(0, 15),
          };
          pendingChunk = mergedChunk;
          continue;
        }

        // Push pending and start fresh
        result.push(pendingChunk);
      }

      pendingChunk = chunk;
    }

    // Don't forget the last pending chunk
    if (pendingChunk) {
      result.push(pendingChunk);
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Index Generation (T053)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Indexes a research file, creating or loading the research index.
   *
   * @param specId - The spec ID (e.g., "011-context-health-recursive-memory")
   * @returns Index result with index and chunks
   */
  public async indexResearchFile(specId: string): Promise<IndexResult> {
    // Validate spec ID
    if (!this.isValidSpecId(specId)) {
      throw new Error(`Invalid spec ID: ${specId}`);
    }

    // Check cache first
    if (this.options.cacheIndices && this.indexCache.has(specId)) {
      const cached = this.indexCache.get(specId)!;
      this.logger.debug('Research index loaded from cache', { specId });
      return { ...cached, fromCache: true };
    }

    // Build paths
    const specDir = path.join(this.workspaceRoot, this.options.specsDirectory, specId);
    const researchPath = path.join(specDir, 'research.md');
    const indexPath = path.join(specDir, 'research-index.json');

    // Check if research.md exists
    if (!fs.existsSync(researchPath)) {
      throw new Error(`Research file not found: ${researchPath}`);
    }

    // Check if we have a cached index on disk
    const existingIndex = await this.loadIndexFromDisk(indexPath, researchPath);
    if (existingIndex) {
      // Load the chunks from the research file
      const content = await fs.promises.readFile(researchPath, 'utf-8');
      const chunks = this.parseMarkdownToChunks(content, researchPath);

      const result: IndexResult = {
        index: existingIndex,
        chunks,
        fromCache: true,
      };

      if (this.options.cacheIndices) {
        this.setCacheEntry(specId, result);
      }

      return result;
    }

    // Read and parse the research file
    const content = await fs.promises.readFile(researchPath, 'utf-8');
    const chunks = this.parseMarkdownToChunks(content, researchPath);

    // Generate the index
    const index: ResearchIndex = {
      sourceFile: researchPath,
      totalTokens: chunks.reduce((sum, c) => sum + c.tokenEstimate, 0),
      chunkCount: chunks.length,
      created: Date.now(),
      chunks: chunks.map((c) => ({
        id: c.id,
        title: c.sectionTitle,
        tokens: c.tokenEstimate,
        keywords: c.relevanceKeywords,
      })),
    };

    // Save index to disk
    await this.saveIndexToDisk(indexPath, index);

    const result: IndexResult = {
      index,
      chunks,
      fromCache: false,
    };

    if (this.options.cacheIndices) {
      this.setCacheEntry(specId, result);
    }

    this.logger.info('Research file indexed', {
      specId,
      chunkCount: chunks.length,
      totalTokens: index.totalTokens,
    });

    return result;
  }

  /**
   * Validates a spec ID for security.
   */
  private isValidSpecId(specId: string): boolean {
    // Prevent path traversal
    if (specId.includes('..') || specId.includes('/') || specId.includes('\\')) {
      return false;
    }
    // Allow alphanumeric, hyphens, and underscores
    return /^[a-zA-Z0-9_-]+$/.test(specId);
  }

  /**
   * Loads an index from disk if it exists and is fresh.
   */
  private async loadIndexFromDisk(
    indexPath: string,
    researchPath: string
  ): Promise<ResearchIndex | null> {
    let indexHandle: Awaited<ReturnType<typeof fs.promises.open>> | undefined;
    try {
      // Check if research.md is newer than index
      indexHandle = await fs.promises.open(indexPath, 'r');
      const indexStat = await indexHandle.stat();
      const researchStat = await fs.promises.stat(researchPath);

      if (researchStat.mtimeMs > indexStat.mtimeMs) {
        this.logger.debug('Research file newer than index, regenerating', {
          indexPath,
        });
        return null;
      }

      // Load and parse index
      const content = await indexHandle.readFile('utf-8');
      const index: ResearchIndex = JSON.parse(content);

      this.logger.debug('Research index loaded from disk', { indexPath });
      return index;
    } catch (error) {
      this.logger.warn('Failed to load research index from disk', {
        indexPath,
        error: (error as Error).message,
      });
      return null;
    } finally {
      await indexHandle?.close();
    }
  }

  /**
   * Saves an index to disk.
   */
  private async saveIndexToDisk(indexPath: string, index: ResearchIndex): Promise<void> {
    const dir = path.dirname(indexPath);
    const tempPath = path.join(dir, `.${path.basename(indexPath)}.${randomUUID()}.tmp`);
    try {
      await fs.promises.writeFile(tempPath, JSON.stringify(index, null, 2), {
        encoding: 'utf-8',
        flag: 'wx',
      });
      await fs.promises.rename(tempPath, indexPath);
      this.logger.debug('Research index saved to disk', { indexPath });
    } catch (error) {
      await fs.promises.rm(tempPath, { force: true }).catch(() => undefined);
      this.logger.error('Failed to save research index', error as Error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // On-Demand Chunk Loading (T054)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Gets a specific chunk by ID.
   *
   * @param specId - The spec ID
   * @param chunkId - The chunk ID to retrieve
   * @returns The chunk or null if not found
   */
  public async getChunk(specId: string, chunkId: string): Promise<ResearchChunk | null> {
    const indexResult = await this.indexResearchFile(specId);

    const chunk = indexResult.chunks.find((c) => c.id === chunkId);
    if (!chunk) {
      this.logger.debug('Chunk not found', { specId, chunkId });
      return null;
    }

    return chunk;
  }

  /**
   * Gets the research index for a spec.
   *
   * @param specId - The spec ID
   * @returns The research index
   */
  public async getIndex(specId: string): Promise<ResearchIndex> {
    const indexResult = await this.indexResearchFile(specId);
    return indexResult.index;
  }

  /**
   * Loads chunks relevant to a task context.
   *
   * @param specId - The spec ID
   * @param taskContext - Description of the current task
   * @param limit - Maximum number of chunks to return (default: 5)
   * @returns Scored and ranked chunks
   */
  public async loadChunksForTask(
    specId: string,
    taskContext: string,
    limit: number = 5
  ): Promise<ScoredChunk[]> {
    const indexResult = await this.indexResearchFile(specId);

    // Score each chunk for relevance
    const scoredChunks: ScoredChunk[] = indexResult.chunks.map((chunk) => ({
      ...chunk,
      relevanceScore: this.calculateRelevanceScore(chunk, taskContext),
    }));

    // Sort by relevance score and take top N
    scoredChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const topChunks = scoredChunks.slice(0, limit);

    this.logger.debug('Chunks loaded for task', {
      specId,
      taskContext: taskContext.substring(0, 50),
      totalChunks: indexResult.chunks.length,
      returnedChunks: topChunks.length,
      topScore: topChunks[0]?.relevanceScore ?? 0,
    });

    return topChunks;
  }

  /**
   * Calculates relevance score of a chunk against task context.
   *
   * Uses keyword matching with position and frequency weighting.
   *
   * @param chunk - The chunk to score
   * @param taskContext - Task description to match against
   * @returns Relevance score 0-100
   */
  public calculateRelevanceScore(chunk: ResearchChunk, taskContext: string): number {
    if (!taskContext || !taskContext.trim()) {
      return 0;
    }

    // Extract keywords from task context
    const taskKeywords = this.extractKeywords(taskContext);

    if (taskKeywords.length === 0) {
      return 0;
    }

    // Calculate overlap with chunk keywords
    const chunkKeywordSet = new Set(chunk.relevanceKeywords);
    let matchCount = 0;
    let positionBonus = 0;

    for (let i = 0; i < taskKeywords.length; i++) {
      if (chunkKeywordSet.has(taskKeywords[i])) {
        matchCount++;
        // Earlier keywords in task context are more important
        positionBonus += (taskKeywords.length - i) / taskKeywords.length;
      }
    }

    // Calculate base score from keyword matches
    const matchRatio = matchCount / taskKeywords.length;
    const keywordScore = matchRatio * 60; // Up to 60 points for keyword matches

    // Position bonus (up to 20 points)
    const positionScore = (positionBonus / taskKeywords.length) * 20;

    // Title match bonus (up to 20 points)
    let titleScore = 0;
    const titleWords = chunk.sectionTitle.toLowerCase().split(/\s+/);
    for (const taskWord of taskKeywords) {
      if (titleWords.some((tw) => tw.includes(taskWord) || taskWord.includes(tw))) {
        titleScore += 5;
      }
    }
    titleScore = Math.min(titleScore, 20);

    const totalScore = Math.round(keywordScore + positionScore + titleScore);
    return Math.min(totalScore, 100);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cache Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Clears the in-memory index cache.
   */
  public clearCache(): void {
    const count = this.indexCache.size;
    this.indexCache.clear();
    this.logger.debug('Index cache cleared', { previousCount: count });
  }

  /**
   * Add an entry to the index cache with max-size enforcement.
   * Evicts the oldest entry (first inserted) when the limit is reached.
   */
  private setCacheEntry(key: string, value: IndexResult): void {
    if (this.indexCache.size >= MAX_INDEX_CACHE_SIZE && !this.indexCache.has(key)) {
      const oldest = this.indexCache.keys().next().value;
      if (oldest !== undefined) {
        this.indexCache.delete(oldest);
      }
    }
    this.indexCache.set(key, value);
  }

  /**
   * Gets statistics about the chunker.
   */
  public getStats(): {
    cachedIndices: number;
    totalCachedChunks: number;
    totalCachedTokens: number;
  } {
    let totalChunks = 0;
    let totalTokens = 0;

    for (const result of this.indexCache.values()) {
      totalChunks += result.chunks.length;
      totalTokens += result.index.totalTokens;
    }

    return {
      cachedIndices: this.indexCache.size,
      totalCachedChunks: totalChunks,
      totalCachedTokens: totalTokens,
    };
  }

  /**
   * Gets the current configuration.
   */
  public getOptions(): ResearchChunkerOptions {
    return { ...this.options };
  }

  /**
   * Updates the configuration.
   */
  public updateOptions(options: Partial<ResearchChunkerOptions>): void {
    Object.assign(this.options, options);
    this.logger.debug('Options updated', { options });
  }
}
