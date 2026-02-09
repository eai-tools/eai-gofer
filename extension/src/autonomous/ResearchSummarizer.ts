/**
 * Research Summarizer
 *
 * Uses LLM to summarize research chunks into discovery memories.
 * Caches summaries to avoid re-summarization of unchanged content.
 *
 * T040: Phase 5 - LLM Integration
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AutonomousLLMProvider } from './LLMProvider';
import type { ResearchChunker, ResearchChunk } from './ResearchChunker';

/**
 * Duck-typed interface for MemoryManager save operations.
 */
interface MemoryManagerLike {
  save(memory: {
    category: string;
    content: string;
    tags: string[];
    specId?: string;
  }): Promise<{ id: string }>;
}

/**
 * Cached summary entry.
 */
interface SummaryCache {
  chunkId: string;
  contentHash: string;
  summary: string;
  createdAt: string;
}

const SUMMARIZE_PROMPT = `Summarize the following research section concisely. Focus on:
- Key findings and decisions
- Integration points and patterns
- Constraints or limitations
- Actionable recommendations

Keep the summary under 200 words.

Research section "{title}":
{content}

Summary:`;

/**
 * Summarizes research chunks via LLM and saves as discovery memories.
 */
export class ResearchSummarizer {
  private readonly llmProvider: AutonomousLLMProvider;
  private readonly researchChunker: ResearchChunker;
  private readonly memoryManager: MemoryManagerLike;
  private readonly workspaceRoot: string;
  private cache: Map<string, SummaryCache> = new Map();

  constructor(
    llmProvider: AutonomousLLMProvider,
    researchChunker: ResearchChunker,
    memoryManager: MemoryManagerLike,
    workspaceRoot: string
  ) {
    this.llmProvider = llmProvider;
    this.researchChunker = researchChunker;
    this.memoryManager = memoryManager;
    this.workspaceRoot = workspaceRoot;
    this.loadCache();
  }

  /**
   * Summarize all research chunks for a spec and save as discovery memories.
   *
   * @param specId - The spec ID to summarize research for
   * @returns Number of memories created
   */
  async summarizeSpec(specId: string): Promise<number> {
    if (!this.llmProvider.isAvailable()) {
      return 0;
    }

    const researchPath = path.join(
      this.workspaceRoot, '.specify', 'specs', specId, 'research.md'
    );

    if (!fs.existsSync(researchPath)) {
      return 0;
    }

    const chunks = this.researchChunker.chunkFile(researchPath);
    let memoriesCreated = 0;

    for (const chunk of chunks) {
      try {
        const summary = await this.summarizeChunk(chunk);
        if (!summary) continue;

        await this.memoryManager.save({
          category: 'discovery',
          content: `[Research Summary: ${chunk.sectionTitle}] ${summary}`,
          tags: ['#auto', '#research-summary', `#spec-${specId}`, ...chunk.relevanceKeywords.slice(0, 3).map(k => `#${k}`)],
          specId,
        });

        memoriesCreated++;
      } catch {
        // Skip failed chunks, continue with others
      }
    }

    this.saveCache();
    return memoriesCreated;
  }

  /**
   * Summarize a single research chunk, using cache if available.
   */
  private async summarizeChunk(chunk: ResearchChunk): Promise<string | null> {
    const contentHash = this.hashContent(chunk.content);
    const cached = this.cache.get(chunk.id);

    if (cached && cached.contentHash === contentHash) {
      return cached.summary;
    }

    const prompt = SUMMARIZE_PROMPT
      .replace('{title}', chunk.sectionTitle)
      .replace('{content}', chunk.content.slice(0, 4000)); // Limit input size

    const result = await this.llmProvider.summarize(prompt, 300);
    if (!result) {
      return null;
    }

    // Cache the result
    this.cache.set(chunk.id, {
      chunkId: chunk.id,
      contentHash,
      summary: result.text,
      createdAt: new Date().toISOString(),
    });

    return result.text;
  }

  private hashContent(content: string): string {
    // Simple hash — not cryptographic, just for cache invalidation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private loadCache(): void {
    const cachePath = this.getCachePath();
    try {
      if (fs.existsSync(cachePath)) {
        const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as SummaryCache[];
        for (const entry of data) {
          this.cache.set(entry.chunkId, entry);
        }
      }
    } catch {
      // Start fresh on cache corruption
    }
  }

  private saveCache(): void {
    const cachePath = this.getCachePath();
    try {
      const dir = path.dirname(cachePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(Array.from(this.cache.values()), null, 2));
    } catch {
      // Cache save is best-effort
    }
  }

  private getCachePath(): string {
    return path.join(this.workspaceRoot, '.specify', 'memory', 'research-summary-cache.json');
  }
}
