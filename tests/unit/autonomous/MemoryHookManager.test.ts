/**
 * Unit Tests for MemoryHookManager
 *
 * Tests all memory hooks:
 * - beforeToolCall: Memory retrieval before tool execution
 * - afterTaskCompletion: Learning storage on task completion
 * - onErrorRecovery: Error pattern capture
 * - onUserClarification: User preference storage
 * - Rate limiting
 * - Memory formatting
 *
 * @see 010-gofer-memory-journey/tasks.md T027
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MemoryHookManager,
  type MemoryManagerLike,
  type ToolCallContext,
  type TaskCompletionContext,
  type ErrorRecoveryContext,
  type UserClarificationContext,
} from '../../../extension/src/autonomous/MemoryHookManager';
import type { Memory } from '../../../extension/src/autonomous/memory';

// ============================================================================
// Mock Setup
// ============================================================================

function createMockMemoryManager(): MemoryManagerLike & {
  savedMemories: Array<Omit<Memory, 'id' | 'created'>>;
  mockSearchResults: Memory[];
  setMockSearchResults: (results: Memory[]) => void;
} {
  const savedMemories: Array<Omit<Memory, 'id' | 'created'>> = [];
  let mockSearchResults: Memory[] = [];

  return {
    savedMemories,
    get mockSearchResults() {
      return mockSearchResults;
    },
    set mockSearchResults(value: Memory[]) {
      mockSearchResults = value;
    },
    setMockSearchResults(results: Memory[]) {
      mockSearchResults = results;
    },

    async save(memory: Omit<Memory, 'id' | 'created'>): Promise<Memory> {
      savedMemories.push(memory);
      return {
        ...memory,
        id: `mem-${savedMemories.length}`,
        created: Date.now(),
      } as Memory;
    },

    async search(): Promise<{ memories: Memory[]; count: number }> {
      return {
        memories: mockSearchResults,
        count: mockSearchResults.length,
      };
    },

    async recordUsage(): Promise<void> {
      // No-op for testing
    },
  };
}

function createMockMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'test-memory-1',
    category: 'test',
    tags: ['#test'],
    scope: 'local',
    content: 'Test memory content',
    created: Date.now() - 86400000,
    lastUsed: Date.now() - 3600000,
    usedCount: 5,
    learnedFrom: 'test-spec',
    type: 'semantic',
    confidence: 80,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('MemoryHookManager', () => {
  let hookManager: MemoryHookManager;
  let mockMemoryManager: ReturnType<typeof createMockMemoryManager>;

  beforeEach(() => {
    mockMemoryManager = createMockMemoryManager();
    hookManager = new MemoryHookManager(mockMemoryManager);
    hookManager.setCurrentStage('implement');
    hookManager.setCurrentSpecId('test-spec');
  });

  // --------------------------------------------------------------------------
  // beforeToolCall Tests
  // --------------------------------------------------------------------------

  describe('beforeToolCall', () => {
    it('should return empty result when no memories found', async () => {
      const context: ToolCallContext = {
        toolName: 'Read',
        toolArgs: { file: 'test.ts' },
        filePaths: ['src/test.ts'],
      };

      const result = await hookManager.beforeToolCall(context);

      expect(result.hasRelevant).toBe(false);
      expect(result.memories).toHaveLength(0);
      expect(result.formattedContext).toBe('');
    });

    it('should return formatted memories when found', async () => {
      const memory = createMockMemory({
        content: 'When editing TypeScript files, always use explicit return types',
      });
      mockMemoryManager.setMockSearchResults([memory]);

      const context: ToolCallContext = {
        toolName: 'Edit',
        toolArgs: { file: 'component.ts' },
        filePaths: ['src/component.ts'],
        taskContext: 'Implement user service',
      };

      const result = await hookManager.beforeToolCall(context);

      expect(result.hasRelevant).toBe(true);
      expect(result.memories).toHaveLength(1);
      expect(result.formattedContext).toContain('<relevant-memories>');
      expect(result.formattedContext).toContain('explicit return types');
      expect(result.tokenEstimate).toBeGreaterThan(0);
    });

    it('should limit memories to 5', async () => {
      mockMemoryManager.setMockSearchResults(
        Array(10)
          .fill(null)
          .map((_, i) => createMockMemory({ id: `mem-${i}`, content: `Memory ${i}` }))
      );

      const context: ToolCallContext = {
        toolName: 'Read',
        toolArgs: {},
      };

      const result = await hookManager.beforeToolCall(context);

      expect(result.memories).toHaveLength(5);
    });

    it('should respect token budget', async () => {
      const longMemory = createMockMemory({
        content: 'A'.repeat(5000), // Very long content
      });
      mockMemoryManager.setMockSearchResults([longMemory]);

      const context: ToolCallContext = {
        toolName: 'Read',
        toolArgs: {},
      };

      // Very small budget
      const result = await hookManager.beforeToolCall(context, 100);

      expect(result.tokenEstimate).toBeLessThanOrEqual(100);
    });
  });

  // --------------------------------------------------------------------------
  // afterTaskCompletion Tests
  // --------------------------------------------------------------------------

  describe('afterTaskCompletion', () => {
    it('should save task completion as procedural memory', async () => {
      const context: TaskCompletionContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement user authentication',
        filesModified: ['src/auth.ts', 'src/middleware.ts'],
        patternsUsed: ['singleton', 'middleware'],
        outcome: 'success',
      };

      const result = await hookManager.afterTaskCompletion(context);

      expect(result.success).toBe(true);
      expect(result.memorySaved).toBeDefined();

      // Check saved memory
      expect(mockMemoryManager.savedMemories).toHaveLength(1);
      const saved = mockMemoryManager.savedMemories[0];
      expect(saved.category).toBe('task_completion');
      expect(saved.type).toBe('procedural');
      expect(saved.tags).toContain('#task-completion');
      expect(saved.tags).toContain('#task-T001');
      expect(saved.tags).toContain('#outcome-success');
      expect(saved.content).toContain('T001');
      expect(saved.content).toContain('user authentication');
      expect(saved.content).toContain('auth.ts');
      expect(saved.confidence).toBe(90); // success = 90%
    });

    it('should set lower confidence for failed tasks', async () => {
      const context: TaskCompletionContext = {
        taskId: 'T002',
        specId: 'test-spec',
        description: 'Broken task',
        filesModified: [],
        outcome: 'failed',
      };

      await hookManager.afterTaskCompletion(context);

      const saved = mockMemoryManager.savedMemories[0];
      expect(saved.confidence).toBe(30); // failed = 30%
    });

    it('should include citations from modified files', async () => {
      const context: TaskCompletionContext = {
        taskId: 'T003',
        specId: 'test-spec',
        description: 'Test task',
        filesModified: ['src/a.ts', 'src/b.ts'],
        outcome: 'success',
      };

      await hookManager.afterTaskCompletion(context);

      const saved = mockMemoryManager.savedMemories[0];
      expect(saved.citations).toHaveLength(2);
      expect(saved.citations![0].file).toBe('src/a.ts');
    });
  });

  // --------------------------------------------------------------------------
  // onErrorRecovery Tests
  // --------------------------------------------------------------------------

  describe('onErrorRecovery', () => {
    it('should save error recovery as episodic memory', async () => {
      const context: ErrorRecoveryContext = {
        errorType: 'TypeScript Error',
        errorMessage: "Property 'foo' does not exist on type 'Bar'",
        recoverySteps: ['Added missing property to interface', 'Recompiled successfully'],
        whatWorked: 'Adding the property definition',
        affectedFiles: ['src/types.ts'],
      };

      const result = await hookManager.onErrorRecovery(context);

      expect(result.success).toBe(true);
      expect(mockMemoryManager.savedMemories).toHaveLength(1);

      const saved = mockMemoryManager.savedMemories[0];
      expect(saved.category).toBe('error_recovery');
      expect(saved.type).toBe('episodic');
      expect(saved.tags).toContain('#error-recovery');
      expect(saved.tags).toContain('#error-typescript-error');
      expect(saved.content).toContain('TypeScript Error');
      expect(saved.content).toContain('Recovery Steps');
      expect(saved.content).toContain('What Worked');
      expect(saved.confidence).toBe(80);
    });

    it('should truncate stack trace in content', async () => {
      const context: ErrorRecoveryContext = {
        errorType: 'Runtime Error',
        errorMessage: 'Cannot read property',
        recoverySteps: ['Fixed null check'],
        stackTrace: 'at Function.x\n'.repeat(100), // Very long stack
      };

      await hookManager.onErrorRecovery(context);

      const saved = mockMemoryManager.savedMemories[0];
      expect(saved.content).toContain('Stack Trace (truncated)');
      expect(saved.content.length).toBeLessThan(2000);
    });
  });

  // --------------------------------------------------------------------------
  // onUserClarification Tests
  // --------------------------------------------------------------------------

  describe('onUserClarification', () => {
    it('should save user preference as semantic memory', async () => {
      const context: UserClarificationContext = {
        question: 'Which authentication method should we use?',
        answer: 'JWT tokens with refresh mechanism',
        questionType: 'preference',
        specId: 'auth-feature',
      };

      const result = await hookManager.onUserClarification(context);

      expect(result.success).toBe(true);
      expect(mockMemoryManager.savedMemories).toHaveLength(1);

      const saved = mockMemoryManager.savedMemories[0];
      expect(saved.category).toBe('user_preference');
      expect(saved.type).toBe('semantic');
      expect(saved.tags).toContain('#preference');
      expect(saved.tags).toContain('#spec-auth-feature');
      expect(saved.content).toContain('JWT tokens');
      expect(saved.confidence).toBe(100); // User-provided = 100%
    });

    it('should include custom tags', async () => {
      const context: UserClarificationContext = {
        question: 'Color scheme?',
        answer: 'Dark mode',
        tags: ['#ui', '#design'],
      };

      await hookManager.onUserClarification(context);

      const saved = mockMemoryManager.savedMemories[0];
      expect(saved.tags).toContain('#ui');
      expect(saved.tags).toContain('#design');
    });
  });

  // --------------------------------------------------------------------------
  // Rate Limiting Tests
  // --------------------------------------------------------------------------

  describe('rate limiting', () => {
    it('should limit saves to 10 per stage', async () => {
      // Save 12 times
      for (let i = 0; i < 12; i++) {
        await hookManager.afterTaskCompletion({
          taskId: `T${i}`,
          specId: 'test',
          description: `Task ${i}`,
          filesModified: [],
          outcome: 'success',
        });
      }

      // Only 10 should be saved
      expect(mockMemoryManager.savedMemories).toHaveLength(10);

      // Last 2 should be rate limited
      const result = await hookManager.afterTaskCompletion({
        taskId: 'T12',
        specId: 'test',
        description: 'Task 12',
        filesModified: [],
        outcome: 'success',
      });

      expect(result.rateLimited).toBe(true);
    });

    it('should track count per stage', async () => {
      hookManager.setCurrentStage('research');
      expect(hookManager.getSaveCount('research')).toBe(0);

      await hookManager.afterTaskCompletion({
        taskId: 'T1',
        specId: 'test',
        description: 'Test',
        filesModified: [],
        outcome: 'success',
      });

      expect(hookManager.getSaveCount('research')).toBe(1);
      expect(hookManager.getSaveCount('implement')).toBe(0);
    });

    it('should reset rate limits', async () => {
      // Fill up the limit
      for (let i = 0; i < 10; i++) {
        await hookManager.afterTaskCompletion({
          taskId: `T${i}`,
          specId: 'test',
          description: `Task ${i}`,
          filesModified: [],
          outcome: 'success',
        });
      }

      expect(hookManager.getSaveCount()).toBe(10);

      hookManager.resetRateLimits();

      expect(hookManager.getSaveCount()).toBe(0);
    });

    it('should not rate limit beforeToolCall (read-only)', async () => {
      // beforeToolCall should never be rate limited (it's read-only)
      for (let i = 0; i < 20; i++) {
        const result = await hookManager.beforeToolCall({
          toolName: 'Read',
          toolArgs: {},
        });
        expect(result.hasRelevant).toBe(false); // No memories, but not rate limited
      }
    });
  });

  // --------------------------------------------------------------------------
  // Memory Formatting Tests
  // --------------------------------------------------------------------------

  describe('formatMemoriesForContext', () => {
    it('should format memories with XML tags', () => {
      const memories = [createMockMemory()];

      const result = hookManager.formatMemoriesForContext(memories);

      expect(result.text).toContain('<relevant-memories>');
      expect(result.text).toContain('</relevant-memories>');
      expect(result.text).toContain('<memory id="test-memory-1"');
      expect(result.text).toContain('</memory>');
    });

    it('should include confidence level', () => {
      const memories = [createMockMemory({ confidence: 95 })];

      const result = hookManager.formatMemoriesForContext(memories);

      expect(result.text).toContain('confidence="95"');
    });

    it('should include citations', () => {
      const memories = [
        createMockMemory({
          citations: [{ file: 'src/auth.ts', line: 42 }, { file: 'src/utils.ts' }],
        }),
      ];

      const result = hookManager.formatMemoriesForContext(memories);

      expect(result.text).toContain('Citations:');
      expect(result.text).toContain('src/auth.ts:42');
      expect(result.text).toContain('src/utils.ts');
    });

    it('should warn about stale memories', () => {
      const memories = [createMockMemory({ stale: true })];

      const result = hookManager.formatMemoriesForContext(memories);

      expect(result.text).toContain('may be stale');
    });

    it('should truncate long content', () => {
      const memories = [createMockMemory({ content: 'A'.repeat(1000) })];

      const result = hookManager.formatMemoriesForContext(memories);

      expect(result.text).toContain('...');
      expect(result.text.length).toBeLessThan(1500);
    });

    it('should filter out auto/stage tags', () => {
      const memories = [
        createMockMemory({
          tags: ['#auto', '#stage-implement', '#useful-tag', '#pattern'],
        }),
      ];

      const result = hookManager.formatMemoriesForContext(memories);

      expect(result.text).toContain('#useful-tag');
      expect(result.text).toContain('#pattern');
      expect(result.text).not.toContain('#auto');
      expect(result.text).not.toContain('#stage-implement');
    });

    it('should return empty for no memories', () => {
      const result = hookManager.formatMemoriesForContext([]);

      expect(result.text).toBe('');
      expect(result.tokenEstimate).toBe(0);
    });
  });
});
