/**
 * Unit tests for ResearchChunker
 *
 * Tests T051-T055: Research document chunking for on-demand loading
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ResearchChunker, ResearchIndex } from '../../../extension/src/autonomous/ResearchChunker';

// Mock the Logger
vi.mock('../../../extension/src/utils/logger', () => ({
  Logger: {
    for: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe('ResearchChunker', () => {
  const testWorkspace = '/tmp/test-workspace';
  const specsDir = path.join(testWorkspace, '.specify/specs');
  let chunker: ResearchChunker;

  beforeEach(async () => {
    // Create test directory structure
    await fs.promises.mkdir(specsDir, { recursive: true });
    chunker = new ResearchChunker(testWorkspace);
  });

  afterEach(async () => {
    // Clean up test directories
    try {
      await fs.promises.rm(testWorkspace, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T051: Class skeleton and interfaces
  // ─────────────────────────────────────────────────────────────────────────────

  describe('T051: Class skeleton and interfaces', () => {
    it('should create ResearchChunker with default options', () => {
      const defaultChunker = new ResearchChunker(testWorkspace);
      const options = defaultChunker.getOptions();

      expect(options.minChunkTokens).toBe(100);
      expect(options.maxChunkTokens).toBe(5000);
      expect(options.mergeSmallChunks).toBe(true);
      expect(options.specsDirectory).toBe('.specify/specs');
      expect(options.cacheIndices).toBe(true);
    });

    it('should create ResearchChunker with custom options', () => {
      const customChunker = new ResearchChunker(testWorkspace, {
        minChunkTokens: 50,
        maxChunkTokens: 10000,
        mergeSmallChunks: false,
      });
      const options = customChunker.getOptions();

      expect(options.minChunkTokens).toBe(50);
      expect(options.maxChunkTokens).toBe(10000);
      expect(options.mergeSmallChunks).toBe(false);
    });

    it('should update options', () => {
      chunker.updateOptions({ minChunkTokens: 200 });
      const options = chunker.getOptions();

      expect(options.minChunkTokens).toBe(200);
    });

    it('should estimate tokens correctly', () => {
      expect(chunker.estimateTokens('')).toBe(0);
      expect(chunker.estimateTokens('hello')).toBe(2); // 5 chars / 4 = 1.25, ceil = 2
      expect(chunker.estimateTokens('hello world')).toBe(3); // 11 chars / 4 = 2.75, ceil = 3
      expect(chunker.estimateTokens('a'.repeat(400))).toBe(100); // 400 chars / 4 = 100
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T052: Semantic chunking by markdown sections
  // ─────────────────────────────────────────────────────────────────────────────

  describe('T052: Semantic chunking by markdown sections', () => {
    it('should parse markdown with H1 headings into chunks', () => {
      const content = `# Section One

Content for section one.

# Section Two

Content for section two.`;

      const chunks = chunker.parseMarkdownToChunks(content, 'research.md');

      expect(chunks).toHaveLength(2);
      expect(chunks[0].sectionTitle).toBe('Section One');
      expect(chunks[0].headingLevel).toBe(1);
      expect(chunks[0].order).toBe(0);
      expect(chunks[1].sectionTitle).toBe('Section Two');
      expect(chunks[1].headingLevel).toBe(1);
      expect(chunks[1].order).toBe(1);
    });

    it('should parse markdown with mixed heading levels', () => {
      const content = `# Main Section

Intro text.

## Subsection A

Subsection A content.

### Sub-subsection

Deeper content.

## Subsection B

More content.`;

      // With merging disabled
      const noMergeChunker = new ResearchChunker(testWorkspace, {
        mergeSmallChunks: false,
      });
      const chunks = noMergeChunker.parseMarkdownToChunks(content, 'research.md');

      expect(chunks).toHaveLength(4);
      expect(chunks[0].headingLevel).toBe(1);
      expect(chunks[1].headingLevel).toBe(2);
      expect(chunks[2].headingLevel).toBe(3);
      expect(chunks[3].headingLevel).toBe(2);
    });

    it('should handle content before first heading', () => {
      const content = `This is content before any heading.

More intro content.`;

      const chunks = chunker.parseMarkdownToChunks(content, 'research.md');

      expect(chunks).toHaveLength(1);
      expect(chunks[0].sectionTitle).toBe('Introduction');
      expect(chunks[0].content).toContain('This is content before any heading');
    });

    it('should generate unique chunk IDs', () => {
      const content = `# First Section

Content.

# Second Section

More content.

# Third Section

Even more.`;

      const chunks = chunker.parseMarkdownToChunks(content, 'research.md');

      const ids = chunks.map((c) => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
      expect(chunks[0].id).toMatch(/^chunk-\d{3}-first-section$/);
    });

    it('should include heading in chunk content', () => {
      const content = `# My Section

The body content.`;

      const chunks = chunker.parseMarkdownToChunks(content, 'research.md');

      expect(chunks[0].content).toContain('# My Section');
      expect(chunks[0].content).toContain('The body content');
    });

    it('should calculate token estimates for chunks', () => {
      const content = `# Test Section

${'word '.repeat(100)}`;

      const chunks = chunker.parseMarkdownToChunks(content, 'research.md');

      expect(chunks[0].tokenEstimate).toBeGreaterThan(0);
    });

    it('should extract relevance keywords from chunks', () => {
      const content = `# API Authentication

This section covers authentication methods including OAuth2, JWT tokens, and API keys for secure access.`;

      const chunks = chunker.parseMarkdownToChunks(content, 'research.md');

      expect(chunks[0].relevanceKeywords).toContain('authentication');
      expect(chunks[0].relevanceKeywords).toContain('api');
      expect(chunks[0].relevanceKeywords).toContain('oauth2');
      expect(chunks[0].relevanceKeywords).toContain('jwt');
    });

    it('should filter stopwords from keywords', () => {
      const content = `# The Test

This is a test with the words that are very common.`;

      const chunks = chunker.parseMarkdownToChunks(content, 'research.md');

      expect(chunks[0].relevanceKeywords).not.toContain('the');
      expect(chunks[0].relevanceKeywords).not.toContain('is');
      expect(chunks[0].relevanceKeywords).not.toContain('with');
      expect(chunks[0].relevanceKeywords).toContain('test');
    });

    it('should merge small chunks when enabled', () => {
      // Create a chunker with high min threshold
      const mergeChunker = new ResearchChunker(testWorkspace, {
        minChunkTokens: 1000,
        mergeSmallChunks: true,
      });

      const content = `# Main Section

Short intro.

## Subsection

Also short.`;

      const chunks = mergeChunker.parseMarkdownToChunks(content, 'research.md');

      // Small subsection should be merged into parent
      expect(chunks.length).toBeLessThan(2);
    });

    it('should not merge chunks when disabled', () => {
      const noMergeChunker = new ResearchChunker(testWorkspace, {
        mergeSmallChunks: false,
      });

      const content = `# Main

Short.

## Sub

Also short.`;

      const chunks = noMergeChunker.parseMarkdownToChunks(content, 'research.md');

      expect(chunks).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T053: Index generation
  // ─────────────────────────────────────────────────────────────────────────────

  describe('T053: Index generation', () => {
    const testSpecId = 'test-spec';

    beforeEach(async () => {
      // Create spec directory with research.md
      const specDir = path.join(specsDir, testSpecId);
      await fs.promises.mkdir(specDir, { recursive: true });

      const researchContent = `# Overview

This is the overview section.

# Implementation Details

Details about implementation.

## Architecture

Architecture description.

# Testing

Testing guidelines.`;

      await fs.promises.writeFile(path.join(specDir, 'research.md'), researchContent, 'utf-8');
    });

    it('should index a research file', async () => {
      const result = await chunker.indexResearchFile(testSpecId);

      expect(result.index).toBeDefined();
      expect(result.chunks).toBeDefined();
      expect(result.fromCache).toBe(false);
    });

    it('should return correct index structure', async () => {
      const result = await chunker.indexResearchFile(testSpecId);
      const index = result.index;

      expect(index.sourceFile).toContain('research.md');
      expect(index.totalTokens).toBeGreaterThan(0);
      expect(index.chunkCount).toBeGreaterThan(0);
      expect(index.created).toBeGreaterThan(0);
      expect(index.chunks).toBeInstanceOf(Array);
    });

    it('should include chunk summaries in index', async () => {
      const result = await chunker.indexResearchFile(testSpecId);

      for (const summary of result.index.chunks) {
        expect(summary.id).toBeDefined();
        expect(summary.title).toBeDefined();
        expect(summary.tokens).toBeGreaterThan(0);
        expect(summary.keywords).toBeInstanceOf(Array);
      }
    });

    it('should save index to disk', async () => {
      await chunker.indexResearchFile(testSpecId);

      const indexPath = path.join(specsDir, testSpecId, 'research-index.json');
      expect(fs.existsSync(indexPath)).toBe(true);

      const content = await fs.promises.readFile(indexPath, 'utf-8');
      const savedIndex: ResearchIndex = JSON.parse(content);

      expect(savedIndex.chunkCount).toBeGreaterThan(0);
    });

    it('should load index from disk cache', async () => {
      // First call creates the index
      await chunker.indexResearchFile(testSpecId);

      // Clear in-memory cache
      chunker.clearCache();

      // Second call should load from disk
      const result = await chunker.indexResearchFile(testSpecId);

      expect(result.fromCache).toBe(true);
    });

    it('should regenerate index when research.md is newer', async () => {
      // Create initial index
      await chunker.indexResearchFile(testSpecId);

      // Wait a bit and update research.md
      await new Promise((resolve) => setTimeout(resolve, 10));

      const researchPath = path.join(specsDir, testSpecId, 'research.md');
      await fs.promises.writeFile(researchPath, '# Updated Content\n\nNew content here.', 'utf-8');

      // Clear in-memory cache
      chunker.clearCache();

      // Should regenerate index
      const result = await chunker.indexResearchFile(testSpecId);

      expect(result.fromCache).toBe(false);
      expect(result.index.chunks[0].title).toBe('Updated Content');
    });

    it('should cache index in memory when enabled', async () => {
      const result1 = await chunker.indexResearchFile(testSpecId);
      const result2 = await chunker.indexResearchFile(testSpecId);

      expect(result1.fromCache).toBe(false);
      expect(result2.fromCache).toBe(true);
    });

    it('should reject invalid spec IDs with path traversal', async () => {
      await expect(chunker.indexResearchFile('../malicious')).rejects.toThrow('Invalid spec ID');
      await expect(chunker.indexResearchFile('some/path')).rejects.toThrow('Invalid spec ID');
      await expect(chunker.indexResearchFile('some\\path')).rejects.toThrow('Invalid spec ID');
    });

    it('should throw error for non-existent research file', async () => {
      await expect(chunker.indexResearchFile('non-existent-spec')).rejects.toThrow(
        'Research file not found'
      );
    });

    it('should validate spec ID format', async () => {
      // Valid formats
      await fs.promises.mkdir(path.join(specsDir, 'valid-spec-123'), { recursive: true });
      await fs.promises.writeFile(
        path.join(specsDir, 'valid-spec-123', 'research.md'),
        '# Test',
        'utf-8'
      );

      const result = await chunker.indexResearchFile('valid-spec-123');
      expect(result).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T054: On-demand chunk loading
  // ─────────────────────────────────────────────────────────────────────────────

  describe('T054: On-demand chunk loading', () => {
    const testSpecId = 'chunk-test-spec';

    beforeEach(async () => {
      const specDir = path.join(specsDir, testSpecId);
      await fs.promises.mkdir(specDir, { recursive: true });

      const researchContent = `# Authentication

OAuth2 authentication implementation details.

# Database Schema

Database models and migrations.

# API Endpoints

REST API endpoint documentation.

# Error Handling

Error handling and logging patterns.`;

      await fs.promises.writeFile(path.join(specDir, 'research.md'), researchContent, 'utf-8');
    });

    it('should get a specific chunk by ID', async () => {
      const indexResult = await chunker.indexResearchFile(testSpecId);
      const firstChunkId = indexResult.chunks[0].id;

      const chunk = await chunker.getChunk(testSpecId, firstChunkId);

      expect(chunk).not.toBeNull();
      expect(chunk!.id).toBe(firstChunkId);
      expect(chunk!.sectionTitle).toBe('Authentication');
    });

    it('should return null for non-existent chunk', async () => {
      await chunker.indexResearchFile(testSpecId);

      const chunk = await chunker.getChunk(testSpecId, 'non-existent-chunk');

      expect(chunk).toBeNull();
    });

    it('should get research index', async () => {
      const index = await chunker.getIndex(testSpecId);

      expect(index.chunkCount).toBe(4);
      expect(index.chunks).toHaveLength(4);
    });

    it('should load chunks for task context', async () => {
      const chunks = await chunker.loadChunksForTask(
        testSpecId,
        'implement OAuth authentication',
        2
      );

      expect(chunks).toHaveLength(2);
      expect(chunks[0].relevanceScore).toBeDefined();
      expect(chunks[0].relevanceScore).toBeGreaterThanOrEqual(0);
      expect(chunks[0].relevanceScore).toBeLessThanOrEqual(100);
    });

    it('should rank chunks by relevance to task', async () => {
      const chunks = await chunker.loadChunksForTask(
        testSpecId,
        'OAuth2 authentication implementation',
        4
      );

      // Authentication chunk should be ranked first
      expect(chunks[0].sectionTitle).toBe('Authentication');
      expect(chunks[0].relevanceScore).toBeGreaterThan(chunks[3].relevanceScore);
    });

    it('should respect limit parameter', async () => {
      const chunks = await chunker.loadChunksForTask(testSpecId, 'all sections', 2);

      expect(chunks).toHaveLength(2);
    });

    it('should calculate relevance score correctly', async () => {
      const indexResult = await chunker.indexResearchFile(testSpecId);
      const authChunk = indexResult.chunks.find((c) => c.sectionTitle === 'Authentication')!;

      const scoreAuth = chunker.calculateRelevanceScore(authChunk, 'OAuth authentication');
      const scoreUnrelated = chunker.calculateRelevanceScore(authChunk, 'database migration');

      expect(scoreAuth).toBeGreaterThan(scoreUnrelated);
    });

    it('should return 0 relevance for empty task context', async () => {
      const indexResult = await chunker.indexResearchFile(testSpecId);
      const chunk = indexResult.chunks[0];

      expect(chunker.calculateRelevanceScore(chunk, '')).toBe(0);
      expect(chunker.calculateRelevanceScore(chunk, '   ')).toBe(0);
    });

    it('should include title matches in relevance score', async () => {
      const indexResult = await chunker.indexResearchFile(testSpecId);
      const dbChunk = indexResult.chunks.find((c) => c.sectionTitle === 'Database Schema')!;

      const scoreWithTitle = chunker.calculateRelevanceScore(dbChunk, 'database schema design');
      const scoreWithoutTitle = chunker.calculateRelevanceScore(
        dbChunk,
        'sql queries implementation'
      );

      expect(scoreWithTitle).toBeGreaterThan(scoreWithoutTitle);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T055: Unit tests coverage and edge cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('T055: Edge cases and coverage', () => {
    it('should handle empty markdown file', () => {
      const chunks = chunker.parseMarkdownToChunks('', 'empty.md');
      expect(chunks).toHaveLength(0);
    });

    it('should handle markdown with only whitespace', () => {
      const chunks = chunker.parseMarkdownToChunks('   \n\n   ', 'whitespace.md');
      expect(chunks).toHaveLength(0);
    });

    it('should handle headings with special characters', () => {
      const content = `# Section with "quotes" & symbols!

Content here.

# Another: Section (with parentheses)

More content.`;

      const chunks = chunker.parseMarkdownToChunks(content, 'special.md');

      expect(chunks).toHaveLength(2);
      expect(chunks[0].id).toMatch(/^chunk-\d{3}-section-with-quotes-symbols$/);
    });

    it('should handle very long section titles', () => {
      const longTitle = 'A'.repeat(100);
      const content = `# ${longTitle}

Content.`;

      const chunks = chunker.parseMarkdownToChunks(content, 'long-title.md');

      expect(chunks[0].id.length).toBeLessThanOrEqual(40);
      expect(chunks[0].sectionTitle).toBe(longTitle);
    });

    it('should handle code blocks within sections', () => {
      const content = `# Code Examples

Here is some code:

\`\`\`typescript
function example() {
  return 42;
}
\`\`\`

More text after code.`;

      const chunks = chunker.parseMarkdownToChunks(content, 'code.md');

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toContain('```typescript');
      expect(chunks[0].content).toContain('function example()');
    });

    it('should handle consecutive headings', () => {
      const noMergeChunker = new ResearchChunker(testWorkspace, {
        mergeSmallChunks: false,
      });

      const content = `# Section One
# Section Two
# Section Three`;

      const chunks = noMergeChunker.parseMarkdownToChunks(content, 'consecutive.md');

      // Last two headings have no content
      expect(chunks.filter((c) => c.content.trim())).toHaveLength(3);
    });

    it('should handle H6 headings', () => {
      const noMergeChunker = new ResearchChunker(testWorkspace, {
        mergeSmallChunks: false,
      });

      const content = `###### Deep Heading

Deep content.`;

      const chunks = noMergeChunker.parseMarkdownToChunks(content, 'h6.md');

      expect(chunks[0].headingLevel).toBe(6);
    });

    it('should track cache statistics', async () => {
      const testSpecId = 'stats-test';
      const specDir = path.join(specsDir, testSpecId);
      await fs.promises.mkdir(specDir, { recursive: true });
      await fs.promises.writeFile(path.join(specDir, 'research.md'), '# Test\n\nContent.', 'utf-8');

      const initialStats = chunker.getStats();
      expect(initialStats.cachedIndices).toBe(0);

      await chunker.indexResearchFile(testSpecId);

      const stats = chunker.getStats();
      expect(stats.cachedIndices).toBe(1);
      expect(stats.totalCachedChunks).toBeGreaterThan(0);
      expect(stats.totalCachedTokens).toBeGreaterThan(0);
    });

    it('should clear cache correctly', async () => {
      const testSpecId = 'clear-test';
      const specDir = path.join(specsDir, testSpecId);
      await fs.promises.mkdir(specDir, { recursive: true });
      await fs.promises.writeFile(path.join(specDir, 'research.md'), '# Test\n\nContent.', 'utf-8');

      await chunker.indexResearchFile(testSpecId);
      expect(chunker.getStats().cachedIndices).toBe(1);

      chunker.clearCache();
      expect(chunker.getStats().cachedIndices).toBe(0);
    });

    it('should handle unicode content', () => {
      const content = `# 日本語セクション

日本語のコンテンツです。

# Emoji Section 🎉

Content with emojis 👍 ❤️`;

      const chunks = chunker.parseMarkdownToChunks(content, 'unicode.md');

      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toContain('日本語');
      expect(chunks[1].content).toContain('🎉');
    });

    it('should handle lists within sections', () => {
      const content = `# List Section

Here are some items:

- Item 1
- Item 2
  - Nested item
- Item 3

1. Numbered item
2. Another numbered`;

      const chunks = chunker.parseMarkdownToChunks(content, 'lists.md');

      expect(chunks[0].content).toContain('- Item 1');
      expect(chunks[0].content).toContain('1. Numbered item');
    });

    it('should handle tables within sections', () => {
      const content = `# Table Section

| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |`;

      const chunks = chunker.parseMarkdownToChunks(content, 'tables.md');

      expect(chunks[0].content).toContain('| Column 1 |');
    });

    it('should handle frontmatter', () => {
      const content = `---
title: Research Document
author: Test
---

# First Section

Content after frontmatter.`;

      const chunks = chunker.parseMarkdownToChunks(content, 'frontmatter.md');

      // Frontmatter should be in introduction or first chunk
      expect(chunks[0].content).toContain('First Section');
    });
  });
});
