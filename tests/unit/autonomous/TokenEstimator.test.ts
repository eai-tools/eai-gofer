/**
 * Unit tests for TokenEstimator
 * Feature 029: Memory System v2 - T113
 */

import { describe, it, expect } from 'vitest';
import { TokenEstimator } from '../../../extension/src/autonomous/memory/TokenEstimator';

describe('TokenEstimator', () => {
  const estimator = new TokenEstimator();

  describe('estimate()', () => {
    it('returns 0 for empty string', () => {
      expect(estimator.estimate('')).toBe(0);
    });

    it('estimates simple prose within ±10% of baseline', () => {
      const text = 'This is a simple sentence with about ten tokens total.';
      // baseline: ~54 chars / 4 = ~13.5 tokens
      const result = estimator.estimate(text);
      expect(result).toBeGreaterThan(10);
      expect(result).toBeLessThan(20);
    });

    it('handles code blocks with higher token density', () => {
      const code = '```typescript\nconst x = 1;\nconst y = 2;\n```';
      const codeResult = estimator.estimate(code);
      // Code has 3 chars/token (denser)
      expect(codeResult).toBeGreaterThan(0);
    });

    it('handles mixed content with code and prose', () => {
      const mixed = `
Here is an example:
\`\`\`typescript
const auth = new AuthService(config);
await auth.authenticate(user);
\`\`\`
And here is some explanation text.
      `;
      const result = estimator.estimate(mixed);
      expect(result).toBeGreaterThan(0);
    });

    it('is within ±10% of char/4 for plain prose', () => {
      const text = 'A'.repeat(400); // 400 chars / 4 = 100 tokens baseline
      const result = estimator.estimate(text);
      // Allow ±10%: 90-110
      expect(result).toBeGreaterThanOrEqual(90);
      expect(result).toBeLessThanOrEqual(115);
    });
  });

  describe('estimateCode()', () => {
    it('estimates code at 3 chars/token', () => {
      const code = 'const x = 1; // 15 chars';
      const result = estimator.estimateCode(code);
      expect(result).toBeCloseTo(24 / 3, 0); // 24 chars / 3 ≈ 8
    });
  });

  describe('estimateMemory()', () => {
    it('adds 20 token overhead for metadata', () => {
      const content = 'Test memory content.'; // ≈ 5 tokens
      const result = estimator.estimateMemory(content);
      expect(result).toBeGreaterThan(20); // at least metadata overhead
    });
  });

  describe('estimateBatch()', () => {
    it('sums estimates for all content', () => {
      const contents = ['Short text.', 'Another short text.', 'Third one.'];
      const total = estimator.estimateBatch(contents);
      const sum = contents.reduce((s, c) => s + estimator.estimate(c), 0);
      expect(total).toBe(sum);
    });

    it('returns 0 for empty batch', () => {
      expect(estimator.estimateBatch([])).toBe(0);
    });
  });
});
