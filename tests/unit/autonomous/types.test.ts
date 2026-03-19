/**
 * Unit tests for type definitions
 * Feature 029: Memory System v2 - ContextLayer validation
 */

import { describe, it, expect } from 'vitest';
import type { ContextLayer } from '../../../src/autonomous/types';

describe('ContextLayer', () => {
  it('should validate L0 tier (abstract) structure', () => {
    const layer: ContextLayer = {
      abstract: 'Brief summary in one sentence',
      overview: 'Detailed overview with key points',
      detail: async () => 'Full detailed content with unlimited length',
    };

    expect(layer.abstract).toBeDefined();
    expect(layer.abstract.length).toBeLessThan(500); // ~100 tokens = ~400 chars max
    expect(typeof layer.abstract).toBe('string');
  });

  it('should validate L1 tier (overview) structure', () => {
    const layer: ContextLayer = {
      abstract: 'Summary',
      overview: 'This is a more detailed overview with key points and navigation information',
      detail: async () => 'Full content',
    };

    expect(layer.overview).toBeDefined();
    expect(layer.overview.length).toBeLessThan(10000); // ~2k tokens = ~8000 chars max
    expect(typeof layer.overview).toBe('string');
  });

  it('should validate L2 tier (detail) is async function', async () => {
    const fullContent = 'This is the complete detailed content that can be unlimited length';
    const layer: ContextLayer = {
      abstract: 'Summary',
      overview: 'Overview',
      detail: async () => fullContent,
    };

    expect(layer.detail).toBeDefined();
    expect(typeof layer.detail).toBe('function');

    // Verify async nature
    const result = layer.detail();
    expect(result).toBeInstanceOf(Promise);

    // Verify content retrieval
    const content = await result;
    expect(content).toBe(fullContent);
  });

  it('should support realistic memory content structure', async () => {
    const layer: ContextLayer = {
      abstract: 'Authentication pattern using JWT tokens with 15-minute expiry',
      overview: \`
## Authentication Pattern

**Approach**: JWT tokens with refresh token rotation
**Expiry**: 15 minutes for access tokens, 7 days for refresh tokens
**Storage**: HttpOnly cookies for security

See details for implementation code.
      \`.trim(),
      detail: async () => \`
// Full implementation details with code examples
class AuthService {
  async login(credentials) {
    // ... detailed implementation
  }
  async refresh(refreshToken) {
    // ... detailed implementation
  }
}
      \`.trim(),
    };

    expect(layer.abstract.length).toBeLessThan(500);
    expect(layer.overview.length).toBeGreaterThan(100);
    expect(layer.overview.length).toBeLessThan(10000);

    const detailContent = await layer.detail();
    expect(detailContent).toContain('class AuthService');
  });

  it('should validate all three tiers are present', () => {
    const layer: ContextLayer = {
      abstract: 'Summary',
      overview: 'Overview',
      detail: async () => 'Detail',
    };

    // TypeScript compile-time validation ensures all fields exist
    expect(layer).toHaveProperty('abstract');
    expect(layer).toHaveProperty('overview');
    expect(layer).toHaveProperty('detail');
  });
});
