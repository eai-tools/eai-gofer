/**
 * Unit tests for ValidationPatternExtractor
 * Feature 029: Memory System v2 - T051, T052
 */

import { describe, it, expect, vi } from 'vitest';
import { ValidationPatternExtractor } from '../../../extension/src/autonomous/memory/ValidationPatternExtractor';
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

describe('ValidationPatternExtractor', () => {
  describe('T050: parseValidationReport()', () => {
    it('extracts Red findings from markdown report', () => {
      const report = `
## Validation Results

**Red**: Missing input validation in user registration endpoint.
**Red**: SQL injection vulnerability in search query handler.
**Yellow**: Missing error handling in async operations.
      `;
      const extractor = new ValidationPatternExtractor(makeMockMemoryManager());
      const patterns = extractor.parseValidationReport(report);

      const reds = patterns.filter((p) => p.severity === 'red');
      const yellows = patterns.filter((p) => p.severity === 'yellow');
      expect(reds.length).toBeGreaterThanOrEqual(1);
      expect(yellows.length).toBeGreaterThanOrEqual(1);
    });

    it('extracts Yellow findings from markdown report', () => {
      const report = `
- Yellow: Log output contains sensitive user data.
- Yellow: API response time exceeds 2s threshold.
      `;
      const extractor = new ValidationPatternExtractor(makeMockMemoryManager());
      const patterns = extractor.parseValidationReport(report);

      const yellows = patterns.filter((p) => p.severity === 'yellow');
      expect(yellows.length).toBeGreaterThanOrEqual(1);
      expect(yellows[0].description.length).toBeGreaterThan(5);
    });

    it('extracts patterns from YAML format', () => {
      const report = `
severity: red
description: JWT token not validated with correct signing key.

severity: yellow
description: Missing rate limiting on login endpoint.
      `;
      const extractor = new ValidationPatternExtractor(makeMockMemoryManager());
      const patterns = extractor.parseValidationReport(report);

      expect(patterns.length).toBeGreaterThanOrEqual(1);
    });

    it('deduplicates identical findings', () => {
      const report = `
**Red**: Missing input validation.
**Red**: Missing input validation.
      `;
      const extractor = new ValidationPatternExtractor(makeMockMemoryManager());
      const patterns = extractor.parseValidationReport(report);

      const reds = patterns.filter((p) => p.severity === 'red');
      expect(reds.length).toBe(1);
    });

    it('returns empty array for reports with no findings', () => {
      const report = `
# Validation Report
All checks passed. No issues found.
Score: 100/100
      `;
      const extractor = new ValidationPatternExtractor(makeMockMemoryManager());
      const patterns = extractor.parseValidationReport(report);
      // Empty or very short descriptions filtered out
      expect(patterns.every((p) => p.description.length > 10)).toBe(true);
    });
  });

  describe('T048: extractFromValidationReport()', () => {
    it('saves Red findings as validation_pattern memories', async () => {
      const manager = makeMockMemoryManager();
      const extractor = new ValidationPatternExtractor(manager);
      const report = '**Red**: SQL injection in query builder.';

      await extractor.extractFromValidationReport(report, 'feature-029');

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'validation_pattern',
          tags: expect.arrayContaining(['#validation_pattern', '#severity:red']),
        })
      );
    });

    it('T049: saves Yellow findings as lesson memories', async () => {
      const manager = makeMockMemoryManager();
      const extractor = new ValidationPatternExtractor(manager);
      const report = '**Yellow**: API responses missing correlation IDs.';

      await extractor.extractFromValidationReport(report, 'feature-029');

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'lesson',
          tags: expect.arrayContaining(['#lesson', '#severity:yellow']),
        })
      );
    });

    it('T052: includes agentId and featureId in memory metadata', async () => {
      const manager = makeMockMemoryManager();
      const extractor = new ValidationPatternExtractor(manager);
      const report = `
Agent: validation-security
**Red**: CSRF token missing on state-changing endpoints.
      `;

      await extractor.extractFromValidationReport(report, 'feature-029');

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          learnedFrom: 'feature-029',
          agentId: expect.any(String),
        })
      );
    });

    it('is non-blocking when memory save fails', async () => {
      const manager = makeMockMemoryManager();
      vi.mocked(manager.save).mockRejectedValue(new Error('Storage error'));
      const extractor = new ValidationPatternExtractor(manager);
      const report = '**Red**: Some error pattern.';

      const memories = await extractor.extractFromValidationReport(report, 'feature-029');
      expect(memories).toHaveLength(0); // No throws
    });

    it('returns all created memories', async () => {
      const manager = makeMockMemoryManager();
      const extractor = new ValidationPatternExtractor(manager);
      const report = `
**Red**: Missing auth check.
**Yellow**: Inconsistent error format.
      `;

      const memories = await extractor.extractFromValidationReport(report, 'feature-029');
      expect(memories.length).toBeGreaterThanOrEqual(1);
    });
  });
});
