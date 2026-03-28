/**
 * Unit tests for LLMExtractor
 * Feature 029: Memory System v2 - T015
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMExtractor } from '../../../extension/src/autonomous/memory/LLMExtractor';
import type { AutonomousLLMProvider } from '../../../extension/src/autonomous/LLMProvider';

function makeMockProvider(overrides?: Partial<AutonomousLLMProvider>): AutonomousLLMProvider {
  return {
    isAvailable: vi.fn().mockReturnValue(true),
    summarize: vi.fn().mockResolvedValue({
      text: 'Mock summary response',
      inputTokens: 10,
      outputTokens: 5,
      cached: false,
    }),
    ...overrides,
  } as unknown as AutonomousLLMProvider;
}

describe('LLMExtractor', () => {
  describe('isAvailable()', () => {
    it('returns true when provider is available', () => {
      const provider = makeMockProvider({ isAvailable: vi.fn().mockReturnValue(true) });
      const extractor = new LLMExtractor(provider);
      expect(extractor.isAvailable()).toBe(true);
    });

    it('returns false when provider is not available', () => {
      const provider = makeMockProvider({ isAvailable: vi.fn().mockReturnValue(false) });
      const extractor = new LLMExtractor(provider);
      expect(extractor.isAvailable()).toBe(false);
    });

    it('returns false when no provider given', () => {
      const extractor = new LLMExtractor();
      expect(extractor.isAvailable()).toBe(false);
    });
  });

  describe('generateAbstract()', () => {
    it('returns LLM response when provider is available', async () => {
      const provider = makeMockProvider({
        summarize: vi.fn().mockResolvedValue({
          text: 'Memory system uses tiered loading for efficiency.',
          inputTokens: 20,
          outputTokens: 10,
          cached: false,
        }),
      });
      const extractor = new LLMExtractor(provider);
      const result = await extractor.generateAbstract('Full content about memory system...');
      expect(result).toBe('Memory system uses tiered loading for efficiency.');
    });

    it('falls back to truncation when provider unavailable', async () => {
      const extractor = new LLMExtractor();
      const content = 'A'.repeat(200);
      const result = await extractor.generateAbstract(content);
      expect(result).toHaveLength(103); // 100 chars + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('returns full content when shorter than fallback limit', async () => {
      const extractor = new LLMExtractor();
      const content = 'Short content.';
      const result = await extractor.generateAbstract(content);
      expect(result).toBe('Short content.');
    });

    it('falls back to truncation when LLM returns null', async () => {
      const provider = makeMockProvider({
        summarize: vi.fn().mockResolvedValue(null),
      });
      const extractor = new LLMExtractor(provider);
      const content = 'A'.repeat(200);
      const result = await extractor.generateAbstract(content);
      expect(result.endsWith('...')).toBe(true);
    });
  });

  describe('generateOverview()', () => {
    it('returns LLM response when provider is available', async () => {
      const provider = makeMockProvider({
        summarize: vi.fn().mockResolvedValue({
          text: '- Point 1\n- Point 2\n- Point 3',
          inputTokens: 30,
          outputTokens: 20,
          cached: false,
        }),
      });
      const extractor = new LLMExtractor(provider);
      const result = await extractor.generateOverview('Full content...');
      expect(result).toBe('- Point 1\n- Point 2\n- Point 3');
    });

    it('falls back to truncation when provider unavailable', async () => {
      const extractor = new LLMExtractor();
      const content = 'B'.repeat(3000);
      const result = await extractor.generateOverview(content);
      expect(result).toHaveLength(2003); // 2000 chars + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('returns full content when shorter than fallback limit', async () => {
      const extractor = new LLMExtractor();
      const content = 'Short overview content.';
      const result = await extractor.generateOverview(content);
      expect(result).toBe('Short overview content.');
    });
  });

  describe('generateLayers()', () => {
    it('returns complete ContextLayer with all three tiers', async () => {
      const provider = makeMockProvider({
        summarize: vi
          .fn()
          .mockResolvedValueOnce({ text: 'Abstract sentence.', inputTokens: 5, outputTokens: 5, cached: false })
          .mockResolvedValueOnce({ text: 'Overview key points.', inputTokens: 10, outputTokens: 10, cached: false }),
      });
      const extractor = new LLMExtractor(provider);
      const content = 'Full content for layer generation.';
      const layers = await extractor.generateLayers(content);

      expect(layers.abstract).toBe('Abstract sentence.');
      expect(layers.overview).toBe('Overview key points.');
      expect(typeof layers.detail).toBe('function');
      expect(await layers.detail()).toBe(content);
    });

    it('detail() lazy-loads original content', async () => {
      const extractor = new LLMExtractor();
      const content = 'Lazy content to load on demand.';
      const layers = await extractor.generateLayers(content);
      const detail = await layers.detail();
      expect(detail).toBe(content);
    });

    it('generates both abstract and overview concurrently (via fallback)', async () => {
      const extractor = new LLMExtractor();
      const content = 'Some content that is long enough to test truncation.';
      const layers = await extractor.generateLayers(content);
      expect(layers.abstract).toBeDefined();
      expect(layers.overview).toBeDefined();
      expect(layers.abstract.length).toBeLessThanOrEqual(103);
      expect(layers.overview.length).toBeLessThanOrEqual(2003);
    });
  });
});
