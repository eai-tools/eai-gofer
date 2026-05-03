import { describe, expect, it } from 'vitest';
import {
  isGeneratedMemory,
  isGeneratedMemoryTag,
  isRepoLocalHumanMemory,
} from '../../../extension/src/autonomous/memoryFilters';

describe('memoryFilters', () => {
  it('recognizes generated-memory tags across legacy and current variants', () => {
    expect(isGeneratedMemoryTag('#auto')).toBe(true);
    expect(isGeneratedMemoryTag('#auto-learned')).toBe(true);
    expect(isGeneratedMemoryTag('#auto_extracted')).toBe(true);
    expect(isGeneratedMemoryTag('#decision')).toBe(false);
  });

  it('treats generated memories as non-human regardless of scope', () => {
    expect(
      isGeneratedMemory({
        tags: ['#auto_extracted', '#validation_pattern'],
      } as never)
    ).toBe(true);

    expect(
      isRepoLocalHumanMemory({
        scope: 'local',
        tags: ['#auto-learned', '#pattern'],
      } as never)
    ).toBe(false);
  });

  it('keeps repo-local human memories visible', () => {
    expect(
      isRepoLocalHumanMemory({
        scope: 'local',
        tags: ['#decision', '#auth'],
      } as never)
    ).toBe(true);

    expect(
      isRepoLocalHumanMemory({
        scope: 'global',
        tags: ['#decision'],
      } as never)
    ).toBe(false);
  });
});
