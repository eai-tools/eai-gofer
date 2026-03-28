/**
 * Unit tests for EngineeringReviewExtractor
 * Feature 029: Memory System v2 - T055
 */

import { describe, it, expect, vi } from 'vitest';
import { EngineeringReviewExtractor } from '../../../extension/src/autonomous/memory/EngineeringReviewExtractor';
import type { MemoryManager } from '../../../extension/src/autonomous/MemoryManager';
import type { Memory } from '../../../extension/src/autonomous/memory';

function makeMockMemoryManager(): MemoryManager {
  return {
    save: vi.fn().mockImplementation((data) =>
      Promise.resolve({
        ...data,
        id: `saved-${Math.random().toString(36).slice(2, 8)}`,
        created: Date.now(),
      } as Memory)
    ),
  } as unknown as MemoryManager;
}

describe('EngineeringReviewExtractor', () => {
  describe('T054: extractFromEngineeringReview()', () => {
    it('extracts Red findings with engineering_review tag', async () => {
      const manager = makeMockMemoryManager();
      const extractor = new EngineeringReviewExtractor(manager);
      const review = `
## Engineering Review Report

**Red**: Missing error boundaries in React component tree.
**Yellow**: Inconsistent naming convention across modules.
      `;

      const memories = await extractor.extractFromEngineeringReview(review, 'feature-029');

      expect(memories.length).toBeGreaterThanOrEqual(1);
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining(['#engineering_review', '#auto_extracted']),
        })
      );
    });

    it('sets agentId to engineer-review for unattributed findings', async () => {
      const manager = makeMockMemoryManager();
      const extractor = new EngineeringReviewExtractor(manager);
      const review = '**Red**: Missing TypeScript strict mode.';

      await extractor.extractFromEngineeringReview(review, 'feature-029');

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: expect.stringMatching(/engineer/i),
        })
      );
    });

    it('is non-blocking when save fails', async () => {
      const manager = makeMockMemoryManager();
      vi.mocked(manager.save).mockRejectedValue(new Error('Storage error'));
      const extractor = new EngineeringReviewExtractor(manager);
      const review = '**Red**: Some error.';

      await expect(
        extractor.extractFromEngineeringReview(review, 'feature-029')
      ).resolves.toHaveLength(0);
    });

    it('maps learnedFrom to featureId', async () => {
      const manager = makeMockMemoryManager();
      const extractor = new EngineeringReviewExtractor(manager);
      const review = '**Yellow**: Unused imports in service layer.';

      await extractor.extractFromEngineeringReview(review, '029-memory-system-v2');

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          learnedFrom: '029-memory-system-v2',
        })
      );
    });
  });
});
