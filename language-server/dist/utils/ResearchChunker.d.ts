/**
 * ResearchChunker - Standalone version for Language Server
 *
 * Splits research documents into semantic chunks for on-demand loading.
 * This is a standalone version without extension Logger dependency.
 *
 * Key Features:
 * - Semantic chunking by markdown sections (H1-H6)
 * - Research index generation with chunk summaries
 * - On-demand chunk loading by ID
 * - Relevance scoring for task context
 */
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
 * ResearchChunker implementation.
 *
 * Parses research.md files into semantic chunks based on markdown headings,
 * generates indices for efficient lookup, and provides on-demand loading.
 */
export declare class ResearchChunker {
    private readonly options;
    private readonly workspaceRoot;
    private readonly indexCache;
    /**
     * Creates a new ResearchChunker instance.
     *
     * @param workspaceRoot - Workspace root directory
     * @param options - Optional partial configuration (merged with defaults)
     */
    constructor(workspaceRoot: string, options?: Partial<ResearchChunkerOptions>);
    /**
     * Estimates the token count for a given string.
     * Uses the approximation: 4 characters ≈ 1 token.
     *
     * @param content - The content to estimate tokens for
     * @returns Estimated token count
     */
    estimateTokens(content: string): number;
    /**
     * Parses markdown content into semantic chunks based on headings.
     *
     * @param content - The markdown content to parse
     * @param sourceFile - Path to the source file
     * @returns Array of research chunks
     */
    parseMarkdownToChunks(content: string, sourceFile: string): ResearchChunk[];
    /**
     * Finalizes a chunk by calculating tokens and extracting keywords.
     */
    private finalizeChunk;
    /**
     * Generates a unique chunk ID from the section title.
     */
    private generateChunkId;
    /**
     * Extracts relevance keywords from content.
     */
    private extractKeywords;
    /**
     * Merges small adjacent chunks to meet minimum token threshold.
     */
    private mergeSmallChunks;
    /**
     * Indexes a research file, creating or loading the research index.
     *
     * @param specId - The spec ID (e.g., "011-context-health-recursive-memory")
     * @returns Index result with index and chunks
     */
    indexResearchFile(specId: string): Promise<IndexResult>;
    /**
     * Validates a spec ID for security.
     */
    private isValidSpecId;
    /**
     * Loads an index from disk if it exists and is fresh.
     */
    private loadIndexFromDisk;
    /**
     * Saves an index to disk.
     */
    private saveIndexToDisk;
    /**
     * Gets a specific chunk by ID.
     *
     * @param specId - The spec ID
     * @param chunkId - The chunk ID to retrieve
     * @returns The chunk or null if not found
     */
    getChunk(specId: string, chunkId: string): Promise<ResearchChunk | null>;
    /**
     * Gets the research index for a spec.
     *
     * @param specId - The spec ID
     * @returns The research index
     */
    getIndex(specId: string): Promise<ResearchIndex>;
    /**
     * Loads chunks relevant to a task context.
     *
     * @param specId - The spec ID
     * @param taskContext - Description of the current task
     * @param limit - Maximum number of chunks to return (default: 5)
     * @returns Scored and ranked chunks
     */
    loadChunksForTask(specId: string, taskContext: string, limit?: number): Promise<ScoredChunk[]>;
    /**
     * Calculates relevance score of a chunk against task context.
     *
     * Uses keyword matching with position and frequency weighting.
     *
     * @param chunk - The chunk to score
     * @param taskContext - Task description to match against
     * @returns Relevance score 0-100
     */
    calculateRelevanceScore(chunk: ResearchChunk, taskContext: string): number;
    /**
     * Clears the in-memory index cache.
     */
    clearCache(): void;
    /**
     * Gets statistics about the chunker.
     */
    getStats(): {
        cachedIndices: number;
        totalCachedChunks: number;
        totalCachedTokens: number;
    };
    /**
     * Gets the current configuration.
     */
    getOptions(): ResearchChunkerOptions;
    /**
     * Updates the configuration.
     */
    updateOptions(options: Partial<ResearchChunkerOptions>): void;
}
//# sourceMappingURL=ResearchChunker.d.ts.map