/**
 * Unit tests for MemoryStorage.query() excludeSystemMemories filter
 * Feature 001: Memory Panel Usability Fix
 *
 * Tests T007-T010 from tasks.md:
 * - T007: Filter out #auto tagged memories when excludeSystemMemories: true
 * - T008: Include all memories when excludeSystemMemories: false
 * - T009: Include all memories when excludeSystemMemories: undefined (backward compat)
 * - T010: Combine excludeSystemMemories with category filter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '../../../extension/src/autonomous/MemoryStorage';
import type { Memory } from '../../../extension/src/autonomous/types';
import * as path from 'path';

describe('MemoryStorage.query() - excludeSystemMemories filter', () => {
  let storage: MemoryStorage;
  const fixtureDir = path.join(__dirname, '../../fixtures');

  beforeEach(async () => {
    storage = new MemoryStorage(fixtureDir);
    await storage.initialize();
  });

  // T007: Filter out #auto tagged memories when excludeSystemMemories: true
  it('should filter out memories with #auto tag when excludeSystemMemories is true', () => {
    // Arrange: Load fixture with 10 user + 10 system memories
    // (loaded in beforeEach)

    // Act: Call query with excludeSystemMemories: true
    const result = storage.query({ excludeSystemMemories: true });

    // Assert: Result contains exactly 10 memories, none have #auto tag
    expect(result).toHaveLength(10);
    result.forEach((memory: Memory) => {
      expect(memory.tags).not.toContain('#auto');
    });
  });

  // T008: Include all memories when excludeSystemMemories: false
  it('should include all memories when excludeSystemMemories is false', () => {
    // Arrange: Same fixture as T007
    // (loaded in beforeEach)

    // Act: Call query with excludeSystemMemories: false
    const result = storage.query({ excludeSystemMemories: false });

    // Assert: Result contains 20 memories (10 user + 10 system)
    expect(result).toHaveLength(20);
  });

  // T009: Include all memories when excludeSystemMemories: undefined (backward compat)
  it('should include all memories when excludeSystemMemories is undefined (backward compat)', () => {
    // Arrange: Same fixture as T007
    // (loaded in beforeEach)

    // Act: Call query with empty object (excludeSystemMemories undefined)
    const result = storage.query({});

    // Assert: Result contains 20 memories (backward compatibility)
    expect(result).toHaveLength(20);
  });

  // T010: Combine excludeSystemMemories with category filter
  it('should combine excludeSystemMemories with category filter', () => {
    // Arrange: Fixture has user memories in "pattern"/"gotcha"/"decision" categories
    //          and system memories in "auto_decision"/"discovery" categories
    // (loaded in beforeEach)

    // Act: Call query with category: 'pattern' and excludeSystemMemories: true
    const result = storage.query({
      category: 'pattern',
      excludeSystemMemories: true,
    });

    // Assert: Result contains only user memories in "pattern" category
    result.forEach((memory: Memory) => {
      expect(memory.category).toBe('pattern');
      expect(memory.tags).not.toContain('#auto');
    });
    expect(result.length).toBeGreaterThan(0); // At least one pattern memory exists
  });
});
