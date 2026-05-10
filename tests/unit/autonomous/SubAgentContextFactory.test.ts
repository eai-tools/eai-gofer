/**
 * Unit tests for SubAgentContextFactory
 * Feature 029: Memory System v2 - T034, T035, T036
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubAgentContextFactory } from '../../../extension/src/autonomous/memory/SubAgentContextFactory';
import type { MemoryManager } from '../../../extension/src/autonomous/MemoryManager';
import type { ScoredMemory } from '../../../extension/src/autonomous/memory';

function makeScoredMemory(overrides: Partial<ScoredMemory> = {}): ScoredMemory {
  return {
    id: `mem-${Math.random().toString(36).slice(2, 8)}`,
    category: 'api_patterns',
    tags: ['#test'],
    scope: 'local',
    content: 'Test memory content about the implementation pattern.',
    created: Date.now(),
    lastUsed: Date.now(),
    usedCount: 3,
    learnedFrom: 'feature-001',
    priorityScore: 60,
    relevanceScore: 70,
    combinedScore: 66,
    ...overrides,
  };
}

function makeMockMemoryManager(memories: ScoredMemory[] = []): MemoryManager {
  return {
    loadByPriority: vi.fn().mockResolvedValue({
      memories,
      totalConsidered: memories.length,
      loadTime: 10,
    }),
  } as unknown as MemoryManager;
}

describe('SubAgentContextFactory', () => {
  describe('buildValidationContext()', () => {
    it('T034: builds context for security validation agent', async () => {
      const securityMemory = makeScoredMemory({
        id: 'sec-001',
        category: 'security',
        tags: ['#security', '#auth', '#jwt'],
        content: 'Always validate JWT tokens with proper signing key verification.',
        combinedScore: 80,
      });
      const otherMemory = makeScoredMemory({
        id: 'other-001',
        category: 'performance',
        tags: ['#performance', '#cache'],
        content: 'Cache expensive database queries.',
        combinedScore: 70,
      });

      const manager = makeMockMemoryManager([securityMemory, otherMemory]);
      const factory = new SubAgentContextFactory(manager);

      const ctx = await factory.buildValidationContext('security', 'Review auth middleware');

      // T035: Security memories should be filtered in
      expect(ctx.memories.some((m) => m.id === 'sec-001')).toBe(true);
      expect(ctx.categories).toContain('security');
    });

    it('T035: filters memories by category-specific tags', async () => {
      const securityMem = makeScoredMemory({ tags: ['#security', '#vulnerability'] });
      const perfMem = makeScoredMemory({ tags: ['#performance', '#bottleneck'] });
      const integMem = makeScoredMemory({ tags: ['#integration', '#api'] });

      const manager = makeMockMemoryManager([securityMem, perfMem, integMem]);
      const factory = new SubAgentContextFactory(manager);

      const ctx = await factory.buildValidationContext('security', 'Security review task');

      // Only security-tagged memories should be in results
      const ids = ctx.memories.map((m) => m.id);
      expect(ids).toContain(securityMem.id);
      // Performance-only tagged memory should not be included
      expect(ids).not.toContain(perfMem.id);
    });

    it('T036: enforces token budget (stops at 10k tokens)', async () => {
      // Create many memories with large content to trigger budget enforcement
      const largeMems = Array.from({ length: 20 }, (_, i) =>
        makeScoredMemory({
          id: `large-${i}`,
          category: 'correctness',
          tags: ['#correctness', '#logic'],
          content: 'C'.repeat(3000), // 3000 chars each ≈ 750 tokens
          combinedScore: 80 - i,
        })
      );

      const manager = makeMockMemoryManager(largeMems);
      const factory = new SubAgentContextFactory(manager);

      const ctx = await factory.buildValidationContext('correctness', 'Correctness review');

      // Token budget is 10k tokens = 40k chars; 20 * 3000 = 60k chars, so some should be cut
      expect(ctx.tokenCount).toBeLessThanOrEqual(11_000); // Allow some overhead
      expect(ctx.memories.length).toBeLessThan(20);
    });

    it('T036: includes at least 5 memories when available', async () => {
      const mems = Array.from({ length: 10 }, (_, i) =>
        makeScoredMemory({
          id: `mem-${i}`,
          category: 'standards',
          tags: ['#standards', '#convention'],
          content: 'Standards pattern content that is reasonably sized.',
          combinedScore: 70 - i,
        })
      );

      const manager = makeMockMemoryManager(mems);
      const factory = new SubAgentContextFactory(manager);

      const ctx = await factory.buildValidationContext('standards', 'Standards review');

      expect(ctx.memories.length).toBeGreaterThanOrEqual(5);
    });

    it('T034: returns empty context gracefully when no memories', async () => {
      const manager = makeMockMemoryManager([]);
      const factory = new SubAgentContextFactory(manager);

      const ctx = await factory.buildValidationContext('security', 'Security review');

      expect(ctx.memories).toHaveLength(0);
      expect(ctx.tokenCount).toBe(0);
      expect(ctx.formattedContext).toBe('');
    });
  });

  describe('buildResearchContext()', () => {
    it('filters to research-relevant tags', async () => {
      const patternMem = makeScoredMemory({
        tags: ['#codebase_pattern', '#auth'],
        content: 'Auth pattern using JWT with refresh rotation.',
      });
      const secMem = makeScoredMemory({
        tags: ['#security'],
        content: 'Security concern.',
      });

      const manager = makeMockMemoryManager([patternMem, secMem]);
      const factory = new SubAgentContextFactory(manager);

      const ctx = await factory.buildResearchContext('Research auth patterns');

      expect(ctx.memories.some((m) => m.id === patternMem.id)).toBe(true);
      expect(ctx.memories.some((m) => m.id === secMem.id)).toBe(false);
    });
  });

  describe('formatMemories()', () => {
    it('T031: uses overview layer when available', () => {
      const memory = makeScoredMemory({
        layers: {
          abstract: 'Abstract sentence.',
          overview: 'Overview with key points about auth pattern.',
          detail: async () => 'Full content',
        },
      });

      const factory = new SubAgentContextFactory(makeMockMemoryManager());
      const formatted = factory.formatMemories([memory], 'overview');

      expect(formatted).toContain('Overview with key points about auth pattern.');
      expect(formatted).not.toContain('Abstract sentence.');
    });

    it('T031: falls back to abstract when overview unavailable', () => {
      const memory = makeScoredMemory({
        layers: {
          abstract: 'This is the abstract.',
          overview: '', // empty
          detail: async () => 'Full content',
        },
      });
      // Override overview to undefined by spreading
      (memory.layers as { overview: string | undefined }).overview = undefined as unknown as string;

      const factory = new SubAgentContextFactory(makeMockMemoryManager());
      const formatted = factory.formatMemories([memory], 'overview');

      expect(formatted).toContain('This is the abstract.');
    });

    it('T031: falls back to truncated content when no layers', () => {
      const memory = makeScoredMemory({
        content: 'A'.repeat(3000),
        layers: undefined,
      });

      const factory = new SubAgentContextFactory(makeMockMemoryManager());
      const formatted = factory.formatMemories([memory], 'overview');

      expect(formatted).toContain('...');
      expect(formatted.length).toBeLessThan(3000 + 500); // truncated + formatting
    });

    it('returns empty string for empty memories array', () => {
      const factory = new SubAgentContextFactory(makeMockMemoryManager());
      const formatted = factory.formatMemories([], 'overview');
      expect(formatted).toBe('');
    });
  });
});
