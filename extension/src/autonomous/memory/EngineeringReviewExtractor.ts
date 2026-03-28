/**
 * EngineeringReviewExtractor - Extract patterns from engineering review reports
 * Feature 029: Memory System v2 - US-P1-02
 *
 * T053: Class definition
 * T054: extractFromEngineeringReview()
 */

import type { MemoryManager } from '../MemoryManager';
import type { Memory } from '../memory';
import { ValidationPatternExtractor } from './ValidationPatternExtractor';

// ============================================================================
// EngineeringReviewExtractor
// ============================================================================

/**
 * Extracts findings from engineering review reports as persistent memories.
 *
 * Engineering review reports use a similar Red/Yellow/Gray format to validation
 * reports. This extractor reuses ValidationPatternExtractor for parsing and
 * adds engineering-review-specific metadata.
 *
 * @example
 * ```typescript
 * const extractor = new EngineeringReviewExtractor(memoryManager);
 * const memories = await extractor.extractFromEngineeringReview(report, 'feature-029');
 * ```
 */
export class EngineeringReviewExtractor {
  private readonly validationExtractor: ValidationPatternExtractor;

  constructor(private readonly memoryManager: MemoryManager) {
    this.validationExtractor = new ValidationPatternExtractor(memoryManager);
  }

  /**
   * T054: Extract patterns from an engineering review report.
   *
   * Delegates to ValidationPatternExtractor for Red/Yellow parsing, then
   * adds engineering-review provenance tags.
   *
   * @param reviewContent - Engineering review report content
   * @param featureId - Feature ID for provenance
   * @returns Array of created memories
   */
  async extractFromEngineeringReview(
    reviewContent: string,
    featureId: string
  ): Promise<Memory[]> {
    // Parse findings using the same logic as validation reports
    const patterns = this.validationExtractor.parseValidationReport(reviewContent);

    // Save with engineering-review specific tags
    const created: Memory[] = [];
    for (const pattern of patterns) {
      try {
        const isRed = pattern.severity === 'red';
        const category = isRed ? 'validation_pattern' : 'lesson';
        const severityTag = isRed ? '#severity:red' : '#severity:yellow';
        const baseTag = isRed ? '#validation_pattern' : '#lesson';

        const content = [
          pattern.description,
          pattern.affectedFiles.length > 0
            ? `Affected files: ${pattern.affectedFiles.join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n');

        const memory = await this.memoryManager.save({
          category,
          tags: [baseTag, severityTag, `#${pattern.category}`, '#engineering_review', '#auto_extracted'],
          scope: 'local',
          content,
          lastUsed: Date.now(),
          usedCount: 0,
          learnedFrom: featureId,
          agentId: pattern.agentId === 'validation-agent' ? 'engineer-review' : (pattern.agentId || 'engineer-review'),
        });
        created.push(memory);
      } catch {
        // Non-blocking
      }
    }

    return created;
  }
}
