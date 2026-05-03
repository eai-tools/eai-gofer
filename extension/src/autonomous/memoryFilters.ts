import type { Memory } from './memory';

export const GENERATED_MEMORY_TAGS = new Set(['#auto', '#auto-learned', '#auto_extracted']);

export function isGeneratedMemoryTag(tag: string): boolean {
  return GENERATED_MEMORY_TAGS.has(tag);
}

export function isGeneratedMemory(memory: Pick<Memory, 'tags'>): boolean {
  return Array.isArray(memory.tags) && memory.tags.some(isGeneratedMemoryTag);
}

export function isRepoLocalHumanMemory(memory: Pick<Memory, 'scope' | 'tags'>): boolean {
  return memory.scope === 'local' && !isGeneratedMemory(memory);
}
