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
import { extractKeywords, computeDocumentSimilarity } from './TfIdfUtil';

/**
 * Duck-typed interface for MemoryManager save operations.
 */
interface MemoryManagerLike {
  save(memory: {
    category: string;
    content: string;
    tags: string[];
    scope: string;
    lastUsed: number;
    usedCount: number;
    learnedFrom: string;
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
    // 018 T055: Use deterministic fallback when LLM is unavailable
    const useLLM = this.llmProvider.isAvailable();

    const researchPath = path.join(
      this.workspaceRoot, '.specify', 'specs', specId, 'research.md'
    );

    if (!fs.existsSync(researchPath)) {
      return 0;
    }

    const indexResult = await this.researchChunker.indexResearchFile(specId);
    const chunks = indexResult.chunks;
    let memoriesCreated = 0;

    for (const chunk of chunks) {
      try {
        const summary = useLLM
          ? await this.summarizeChunk(chunk)
          : this.deterministicSummarize(chunk);
        if (!summary) continue;

        await this.memoryManager.save({
          category: 'discovery',
          content: `[Research Summary: ${chunk.sectionTitle}] ${summary}`,
          tags: ['#auto', '#research-summary', `#spec-${specId}`, ...chunk.relevanceKeywords.slice(0, 3).map((k: string) => `#${k}`)],
          scope: 'local',
          lastUsed: Date.now(),
          usedCount: 0,
          learnedFrom: specId,
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

  /**
   * 018 T055: Deterministic fallback summarization when no LLM is available.
   * Extracts first sentence of each paragraph + headings.
   */
  private deterministicSummarize(chunk: ResearchChunk): string {
    const lines = chunk.content.split('\n');
    const summaryParts: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Keep headings
      if (trimmed.startsWith('#')) {
        summaryParts.push(trimmed);
        continue;
      }
      // Keep bullet points (truncated)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        summaryParts.push(trimmed.slice(0, 120) + (trimmed.length > 120 ? '...' : ''));
        continue;
      }
      // Keep first sentence of paragraphs
      if (summaryParts.length < 10) {
        const firstSentence = trimmed.match(/^[^.!?]+[.!?]/);
        if (firstSentence) {
          summaryParts.push(firstSentence[0]);
        }
      }
    }
    return summaryParts.join('\n').slice(0, 800);
  }

  /**
   * 018 T056: Hierarchical summarization — summarize at chapter, section, paragraph levels.
   * Returns a structured summary with decreasing detail.
   */
  async summarizeHierarchical(specId: string): Promise<{ chapter: string; sections: string[]; paragraphs: string[] }> {
    const researchPath = path.join(this.workspaceRoot, '.specify', 'specs', specId, 'research.md');
    if (!fs.existsSync(researchPath)) {
      return { chapter: '', sections: [], paragraphs: [] };
    }

    const content = fs.readFileSync(researchPath, 'utf-8');
    const h2Sections = content.split(/^## /m).filter(Boolean);

    // Chapter level: title + first paragraph
    const titleMatch = content.match(/^# (.+)/m);
    const chapter = titleMatch ? titleMatch[1] : specId;

    // Section level: each H2 heading + first line
    const sections = h2Sections.slice(0, 10).map(s => {
      const firstLine = s.split('\n').find(l => l.trim() && !l.startsWith('#'));
      const heading = s.split('\n')[0]?.trim() || '';
      return `## ${heading}: ${(firstLine || '').slice(0, 100)}`;
    });

    // Paragraph level: first sentences from each section
    const paragraphs = h2Sections.slice(0, 5).map(s => {
      const lines = s.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      return lines.slice(0, 3).map(l => {
        const sentence = l.match(/^[^.!?]+[.!?]/);
        return sentence ? sentence[0] : l.slice(0, 80);
      }).join(' ');
    });

    return { chapter, sections, paragraphs };
  }

  /**
   * 019 T046-T047: Consolidate findings across all research chunks for a spec.
   * Merges overlapping findings, deduplicates entities, and produces a
   * "Research Synthesis" memory with cross-chunk consolidated insights.
   */
  async consolidateFindings(specId: string): Promise<string> {
    const researchPath = path.join(
      this.workspaceRoot, '.specify', 'specs', specId, 'research.md'
    );

    if (!fs.existsSync(researchPath)) {
      return '';
    }

    const indexResult = await this.researchChunker.indexResearchFile(specId);
    const chunks = indexResult.chunks;

    if (chunks.length === 0) return '';

    // Extract keywords from each chunk
    const chunkKeywords: Array<{ chunk: ResearchChunk; keywords: string[] }> = chunks.map(chunk => ({
      chunk,
      keywords: extractKeywords(chunk.content, 10),
    }));

    // Find overlapping chunks by TF-IDF similarity
    const consolidatedGroups: Array<{ representative: ResearchChunk; merged: ResearchChunk[] }> = [];
    const used = new Set<string>();

    for (let i = 0; i < chunkKeywords.length; i++) {
      if (used.has(chunkKeywords[i].chunk.id)) continue;
      used.add(chunkKeywords[i].chunk.id);

      const group = { representative: chunkKeywords[i].chunk, merged: [] as ResearchChunk[] };

      for (let j = i + 1; j < chunkKeywords.length; j++) {
        if (used.has(chunkKeywords[j].chunk.id)) continue;

        const similarity = computeDocumentSimilarity(
          chunkKeywords[i].chunk.content,
          chunkKeywords[j].chunk.content
        );

        if (similarity > 0.3) {
          group.merged.push(chunkKeywords[j].chunk);
          used.add(chunkKeywords[j].chunk.id);
        }
      }

      consolidatedGroups.push(group);
    }

    // Build synthesis
    const synthesisLines: string[] = [
      `# Research Synthesis: ${specId}`,
      '',
      `Consolidated ${chunks.length} chunks into ${consolidatedGroups.length} groups.`,
      '',
    ];

    for (const group of consolidatedGroups) {
      const allContent = [group.representative.content, ...group.merged.map(m => m.content)].join('\n');
      const topKeywords = extractKeywords(allContent, 5);
      const mergedTitles = [group.representative.sectionTitle, ...group.merged.map(m => m.sectionTitle)];

      synthesisLines.push(`## ${mergedTitles[0]}${group.merged.length > 0 ? ` (+${group.merged.length} related)` : ''}`);
      synthesisLines.push(`**Keywords**: ${topKeywords.join(', ')}`);
      if (group.merged.length > 0) {
        synthesisLines.push(`**Merged from**: ${mergedTitles.join(', ')}`);
      }
      synthesisLines.push('');
    }

    const synthesis = synthesisLines.join('\n');

    // Save as a discovery memory
    try {
      await this.memoryManager.save({
        category: 'discovery',
        content: `[Research Synthesis] ${synthesis.slice(0, 800)}`,
        tags: ['#auto', '#research-synthesis', `#spec-${specId}`],
        scope: 'local',
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: specId,
      });
    } catch {
      // Best-effort
    }

    return synthesis;
  }

  private getCachePath(): string {
    return path.join(this.workspaceRoot, '.specify', 'memory', 'research-summary-cache.json');
  }
}
