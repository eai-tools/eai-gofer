"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchChunker = void 0;
const fs = __importStar(require("fs/promises"));
const fsSync = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Default configuration values.
 */
const DEFAULT_OPTIONS = {
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
class ResearchChunker {
    /**
     * Creates a new ResearchChunker instance.
     *
     * @param workspaceRoot - Workspace root directory
     * @param options - Optional partial configuration (merged with defaults)
     */
    constructor(workspaceRoot, options) {
        this.workspaceRoot = workspaceRoot;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.indexCache = new Map();
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
    estimateTokens(content) {
        if (!content) {
            return 0;
        }
        return Math.ceil(content.length / 4);
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // Semantic Chunking
    // ─────────────────────────────────────────────────────────────────────────────
    /**
     * Parses markdown content into semantic chunks based on headings.
     *
     * @param content - The markdown content to parse
     * @param sourceFile - Path to the source file
     * @returns Array of research chunks
     */
    parseMarkdownToChunks(content, sourceFile) {
        const lines = content.split('\n');
        const chunks = [];
        let currentChunk = null;
        let currentContent = [];
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
            }
            else {
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
        return processedChunks;
    }
    /**
     * Finalizes a chunk by calculating tokens and extracting keywords.
     */
    finalizeChunk(partial, content, sourceFile) {
        return {
            id: partial.id,
            sourceFile,
            sectionTitle: partial.sectionTitle,
            content,
            tokenEstimate: this.estimateTokens(content),
            relevanceKeywords: this.extractKeywords(content),
            order: partial.order,
            headingLevel: partial.headingLevel,
        };
    }
    /**
     * Generates a unique chunk ID from the section title.
     */
    generateChunkId(title, order) {
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
    extractKeywords(content) {
        // Tokenize content
        const words = content
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter((word) => word.length > 2 && !STOPWORDS.has(word));
        // Count word frequencies
        const frequency = new Map();
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
    mergeSmallChunks(chunks) {
        if (chunks.length <= 1) {
            return chunks;
        }
        const result = [];
        let pendingChunk = null;
        for (const chunk of chunks) {
            if (pendingChunk) {
                // Check if we should merge with pending
                const combinedTokens = pendingChunk.tokenEstimate + chunk.tokenEstimate;
                if (pendingChunk.tokenEstimate < this.options.minChunkTokens &&
                    combinedTokens <= this.options.maxChunkTokens &&
                    chunk.headingLevel > pendingChunk.headingLevel) {
                    // Merge: pending is the parent, chunk is a child
                    const mergedChunk = {
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
    // Index Generation
    // ─────────────────────────────────────────────────────────────────────────────
    /**
     * Indexes a research file, creating or loading the research index.
     *
     * @param specId - The spec ID (e.g., "011-context-health-recursive-memory")
     * @returns Index result with index and chunks
     */
    async indexResearchFile(specId) {
        // Validate spec ID
        if (!this.isValidSpecId(specId)) {
            throw new Error(`Invalid spec ID: ${specId}`);
        }
        // Check cache first
        if (this.options.cacheIndices && this.indexCache.has(specId)) {
            const cached = this.indexCache.get(specId);
            return { ...cached, fromCache: true };
        }
        // Build paths
        const specDir = path.join(this.workspaceRoot, this.options.specsDirectory, specId);
        const researchPath = path.join(specDir, 'research.md');
        const indexPath = path.join(specDir, 'research-index.json');
        // Check if research.md exists
        if (!fsSync.existsSync(researchPath)) {
            throw new Error(`Research file not found: ${researchPath}`);
        }
        // Check if we have a cached index on disk
        const existingIndex = await this.loadIndexFromDisk(indexPath, researchPath);
        if (existingIndex) {
            // Load the chunks from the research file
            const content = await fs.readFile(researchPath, 'utf-8');
            const chunks = this.parseMarkdownToChunks(content, researchPath);
            const result = {
                index: existingIndex,
                chunks,
                fromCache: true,
            };
            if (this.options.cacheIndices) {
                this.indexCache.set(specId, result);
            }
            return result;
        }
        // Read and parse the research file
        const content = await fs.readFile(researchPath, 'utf-8');
        const chunks = this.parseMarkdownToChunks(content, researchPath);
        // Generate the index
        const index = {
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
        const result = {
            index,
            chunks,
            fromCache: false,
        };
        if (this.options.cacheIndices) {
            this.indexCache.set(specId, result);
        }
        return result;
    }
    /**
     * Validates a spec ID for security.
     */
    isValidSpecId(specId) {
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
    async loadIndexFromDisk(indexPath, researchPath) {
        try {
            if (!fsSync.existsSync(indexPath)) {
                return null;
            }
            // Check if research.md is newer than index
            const indexStat = await fs.stat(indexPath);
            const researchStat = await fs.stat(researchPath);
            if (researchStat.mtimeMs > indexStat.mtimeMs) {
                return null;
            }
            // Load and parse index
            const content = await fs.readFile(indexPath, 'utf-8');
            const index = JSON.parse(content);
            return index;
        }
        catch {
            return null;
        }
    }
    /**
     * Saves an index to disk.
     */
    async saveIndexToDisk(indexPath, index) {
        await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // On-Demand Chunk Loading
    // ─────────────────────────────────────────────────────────────────────────────
    /**
     * Gets a specific chunk by ID.
     *
     * @param specId - The spec ID
     * @param chunkId - The chunk ID to retrieve
     * @returns The chunk or null if not found
     */
    async getChunk(specId, chunkId) {
        const indexResult = await this.indexResearchFile(specId);
        const chunk = indexResult.chunks.find((c) => c.id === chunkId);
        if (!chunk) {
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
    async getIndex(specId) {
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
    async loadChunksForTask(specId, taskContext, limit = 5) {
        const indexResult = await this.indexResearchFile(specId);
        // Score each chunk for relevance
        const scoredChunks = indexResult.chunks.map((chunk) => ({
            ...chunk,
            relevanceScore: this.calculateRelevanceScore(chunk, taskContext),
        }));
        // Sort by relevance score and take top N
        scoredChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
        const topChunks = scoredChunks.slice(0, limit);
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
    calculateRelevanceScore(chunk, taskContext) {
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
    clearCache() {
        this.indexCache.clear();
    }
    /**
     * Gets statistics about the chunker.
     */
    getStats() {
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
    getOptions() {
        return { ...this.options };
    }
    /**
     * Updates the configuration.
     */
    updateOptions(options) {
        Object.assign(this.options, options);
    }
}
exports.ResearchChunker = ResearchChunker;
//# sourceMappingURL=ResearchChunker.js.map