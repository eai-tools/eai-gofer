/**
 * Integration tests for Research Document Chunking
 *
 * T058: Integration tests for research chunk loading tools
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';

// Unmock fs module for integration tests
vi.unmock('fs');
vi.unmock('fs/promises');
import * as fs from 'fs';

import { ResearchChunker, ResearchIndex } from '../../extension/src/autonomous/ResearchChunker';
import { ContextBuilder } from '../../extension/src/autonomous/ContextBuilder';
import { MemoryManager } from '../../extension/src/autonomous/MemoryManager';
import { HintLoader } from '../../extension/src/autonomous/HintLoader';

describe('Research Chunking Integration Tests (T058)', () => {
  const testWorkspaceRoot = path.join(__dirname, 'test-workspace-research-chunking');
  const specsDir = path.join(testWorkspaceRoot, '.specify', 'specs');
  const memoryDir = path.join(testWorkspaceRoot, '.specify', 'memory');
  const hintsDir = path.join(testWorkspaceRoot, '.specify', 'hints');

  let researchChunker: ResearchChunker;

  beforeEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true });
    }

    // Create directories
    fs.mkdirSync(specsDir, { recursive: true });
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.mkdirSync(hintsDir, { recursive: true });

    // Initialize chunker
    researchChunker = new ResearchChunker(testWorkspaceRoot);
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true });
    }
  });

  // ==========================================================================
  // T058: Integration Tests for Research Index and Chunk Loading
  // ==========================================================================

  describe('Research Index Generation', () => {
    it('should generate index for research.md file', async () => {
      const specId = 'test-feature';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      // Create research.md
      const researchContent = `# Overview

This is the overview section with important context.

# Implementation Details

## Architecture

The system uses a layered architecture.

## Database Schema

PostgreSQL with normalized tables.

# Testing Strategy

Unit tests with Vitest, E2E with Playwright.
`;

      fs.writeFileSync(path.join(specDir, 'research.md'), researchContent);

      // Generate index
      const index = await researchChunker.getIndex(specId);

      expect(index.chunkCount).toBeGreaterThan(0);
      expect(index.totalTokens).toBeGreaterThan(0);
      expect(index.chunks.length).toBeGreaterThan(0);

      // Verify chunk structure
      for (const chunk of index.chunks) {
        expect(chunk.id).toBeDefined();
        expect(chunk.title).toBeDefined();
        expect(chunk.tokens).toBeGreaterThan(0);
        expect(chunk.keywords).toBeInstanceOf(Array);
      }
    });

    it('should persist index to disk', async () => {
      const specId = 'persist-test';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      fs.writeFileSync(path.join(specDir, 'research.md'), '# Section One\n\nContent.');

      // Generate index
      await researchChunker.indexResearchFile(specId);

      // Check if index file exists
      const indexPath = path.join(specDir, 'research-index.json');
      expect(fs.existsSync(indexPath)).toBe(true);

      // Verify content
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      const savedIndex: ResearchIndex = JSON.parse(indexContent);

      expect(savedIndex.chunkCount).toBe(1);
      expect(savedIndex.chunks[0].title).toBe('Section One');
    });

    it('should use cached index on subsequent calls', async () => {
      const specId = 'cache-test';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      fs.writeFileSync(path.join(specDir, 'research.md'), '# Test Section\n\nContent.');

      // First call - generates index
      const result1 = await researchChunker.indexResearchFile(specId);
      expect(result1.fromCache).toBe(false);

      // Second call - uses cache
      const result2 = await researchChunker.indexResearchFile(specId);
      expect(result2.fromCache).toBe(true);
    });
  });

  describe('Chunk Loading', () => {
    it('should load specific chunk by ID', async () => {
      const specId = 'chunk-load-test';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      fs.writeFileSync(
        path.join(specDir, 'research.md'),
        `# Authentication

OAuth2 implementation details.

# Database

Schema design patterns.
`
      );

      // Get index to find chunk IDs
      const indexResult = await researchChunker.indexResearchFile(specId);
      const firstChunkId = indexResult.chunks[0].id;

      // Load chunk
      const chunk = await researchChunker.getChunk(specId, firstChunkId);

      expect(chunk).not.toBeNull();
      expect(chunk!.sectionTitle).toBe('Authentication');
      expect(chunk!.content).toContain('OAuth2');
    });

    it('should return null for non-existent chunk', async () => {
      const specId = 'missing-chunk-test';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      fs.writeFileSync(path.join(specDir, 'research.md'), '# Test\n\nContent.');

      const chunk = await researchChunker.getChunk(specId, 'non-existent-chunk-id');

      expect(chunk).toBeNull();
    });

    it('should load chunks relevant to task context', async () => {
      const specId = 'relevance-test';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      fs.writeFileSync(
        path.join(specDir, 'research.md'),
        `# Authentication

OAuth2 tokens and JWT implementation.

# Database

PostgreSQL schema with migrations.

# API Design

RESTful endpoints with rate limiting.

# Testing

Unit testing with Vitest framework.
`
      );

      // Load chunks for authentication task
      const chunks = await researchChunker.loadChunksForTask(
        specId,
        'implement OAuth2 authentication with JWT tokens',
        2
      );

      expect(chunks).toHaveLength(2);
      expect(chunks[0].sectionTitle).toBe('Authentication');
      expect(chunks[0].relevanceScore).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent spec', async () => {
      await expect(researchChunker.getIndex('non-existent-spec')).rejects.toThrow(
        'Research file not found'
      );
    });

    it('should reject invalid spec IDs', async () => {
      await expect(researchChunker.getIndex('../malicious-path')).rejects.toThrow(
        'Invalid spec ID'
      );

      await expect(researchChunker.getIndex('path/traversal')).rejects.toThrow('Invalid spec ID');
    });

    it('should handle empty research file gracefully', async () => {
      const specId = 'empty-research';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      fs.writeFileSync(path.join(specDir, 'research.md'), '');

      const index = await researchChunker.getIndex(specId);

      expect(index.chunkCount).toBe(0);
      expect(index.chunks).toHaveLength(0);
    });
  });

  describe('Context Reduction Metrics', () => {
    it('should achieve 60% reduction vs loading full document', async () => {
      const specId = 'reduction-test';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      // Create a substantial research document
      let researchContent = '';
      for (let i = 0; i < 10; i++) {
        researchContent += `# Section ${i}\n\n`;
        researchContent += `This is the content for section ${i}. `.repeat(50);
        researchContent += '\n\n';
      }

      fs.writeFileSync(path.join(specDir, 'research.md'), researchContent);

      // Get total tokens
      const index = await researchChunker.getIndex(specId);
      const totalTokens = index.totalTokens;

      // Load only relevant chunks (top 2)
      const chunks = await researchChunker.loadChunksForTask(specId, 'section 5 content', 2);

      const loadedTokens = chunks.reduce((sum, c) => sum + c.tokenEstimate, 0);

      // Calculate reduction
      const reduction = 1 - loadedTokens / totalTokens;

      // Should achieve at least 60% reduction (loading 2 of 10 sections)
      expect(reduction).toBeGreaterThanOrEqual(0.6);
    });
  });

  describe('Performance', () => {
    it('should generate index within 200ms for large documents', async () => {
      const specId = 'perf-test';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      // Create large research document (50 sections)
      let researchContent = '';
      for (let i = 0; i < 50; i++) {
        researchContent += `# Section ${i}\n\n`;
        researchContent += `Content for section ${i}. `.repeat(20);
        researchContent += '\n\n';
      }

      fs.writeFileSync(path.join(specDir, 'research.md'), researchContent);

      const startTime = Date.now();
      await researchChunker.indexResearchFile(specId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });

    it('should load chunks within 50ms', async () => {
      const specId = 'chunk-perf-test';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      let researchContent = '';
      for (let i = 0; i < 20; i++) {
        researchContent += `# Section ${i}\n\nContent ${i}.\n\n`;
      }

      fs.writeFileSync(path.join(specDir, 'research.md'), researchContent);

      // Warm up cache
      await researchChunker.indexResearchFile(specId);

      const startTime = Date.now();
      await researchChunker.loadChunksForTask(specId, 'test query', 5);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });
  });

  // ==========================================================================
  // ContextBuilder Integration
  // ==========================================================================

  describe('ContextBuilder Integration', () => {
    it('should integrate with ContextBuilder for research loading', async () => {
      const specId = 'context-integration';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      // Create research.md
      fs.writeFileSync(
        path.join(specDir, 'research.md'),
        `# Authentication Research

OAuth2 implementation patterns and best practices.

# API Design Research

RESTful design principles for the project.
`
      );

      // Mock VSCode context
      const mockContext = {
        globalStoragePath: path.join(testWorkspaceRoot, 'global-storage'),
        globalState: {
          get: vi.fn().mockReturnValue(undefined),
          update: vi.fn().mockResolvedValue(undefined),
        },
      } as any;

      // Initialize components
      const hintLoader = new HintLoader(testWorkspaceRoot);
      const memoryManager = new MemoryManager(mockContext, testWorkspaceRoot);
      const contextBuilder = new ContextBuilder(testWorkspaceRoot, memoryManager, hintLoader);

      // Build context for authentication task - should not throw
      const result = await contextBuilder.buildContext({
        taskId: 'T001',
        specId,
        description: 'Implement OAuth2 authentication',
        affectedFiles: [],
      });

      // Verify context is built successfully (result is defined, no error thrown)
      expect(result).toBeDefined();
      expect(result.sections).toBeDefined();
      expect(result.loadTime).toBeGreaterThanOrEqual(0);

      // Clean up
      hintLoader.dispose();
    });
  });

  // ==========================================================================
  // Keyword Extraction Tests
  // ==========================================================================

  describe('Keyword Extraction', () => {
    it('should extract relevant keywords from chunk content', async () => {
      const specId = 'keyword-test';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      fs.writeFileSync(
        path.join(specDir, 'research.md'),
        `# Authentication

Implementing OAuth2 authentication with JWT tokens.
The authentication service handles user login and session management.
Passwords are hashed using bcrypt encryption.
`
      );

      const index = await researchChunker.getIndex(specId);

      const keywords = index.chunks[0].keywords;

      // Should contain key technical terms
      expect(keywords.some((k) => k.includes('oauth') || k.includes('auth'))).toBe(true);
    });

    it('should filter common stopwords from keywords', async () => {
      const specId = 'stopword-test';
      const specDir = path.join(specsDir, specId);
      fs.mkdirSync(specDir, { recursive: true });

      fs.writeFileSync(
        path.join(specDir, 'research.md'),
        `# Test Section

The quick brown fox jumps over the lazy dog.
This is a test of the stopword filtering system.
`
      );

      const index = await researchChunker.getIndex(specId);

      const keywords = index.chunks[0].keywords;

      // Should not contain common stopwords
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('of');
    });
  });
});
