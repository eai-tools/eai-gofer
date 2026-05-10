/**
 * Integration Tests for Memory Hooks Lifecycle
 *
 * Tests the end-to-end memory lifecycle:
 * - Memories saved during task completion
 * - Memories retrieved on similar tasks
 * - Memories persist across "sessions" (manager instances)
 *
 * @see 010-gofer-memory-journey/tasks.md T028
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { MemoryHookManager } from '../../extension/src/autonomous/MemoryHookManager';
import { MemoryStorage } from '../../extension/src/autonomous/MemoryStorage';
import type { Memory, MemoryQuery, MemorySearchResult } from '../../extension/src/autonomous/memory';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a minimal MemoryManager-like wrapper around MemoryStorage for testing.
 * This avoids needing VSCode extension context.
 */
function createTestMemoryManager(storage: MemoryStorage) {
  return {
    async save(memory: Omit<Memory, 'id' | 'created'>): Promise<Memory> {
      return storage.append(memory);
    },

    async search(query: MemoryQuery): Promise<MemorySearchResult> {
      const memories = storage.query(query);
      return {
        memories,
        count: memories.length,
        searchTime: 0,
      };
    },

    async recordUsage(id: string): Promise<void> {
      const memory = storage.get(id);
      if (memory) {
        await storage.update(id, {
          usedCount: (memory.usedCount ?? 0) + 1,
          lastUsed: Date.now(),
        });
      }
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Memory Hooks Lifecycle Integration', () => {
  let tempDir: string;
  let storage: MemoryStorage;
  let memoryManager: ReturnType<typeof createTestMemoryManager>;
  let hookManager: MemoryHookManager;

  beforeEach(async () => {
    // Create temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gofer-memory-test-'));

    // Initialize storage
    storage = new MemoryStorage(tempDir);
    await storage.initialize();

    // Create memory manager wrapper
    memoryManager = createTestMemoryManager(storage);

    // Create hook manager
    hookManager = new MemoryHookManager(memoryManager);
    hookManager.setCurrentStage('implement');
    hookManager.setCurrentSpecId('test-feature');
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('task completion memory lifecycle', () => {
    it('should save memory on task completion and retrieve on similar task', async () => {
      // Step 1: Complete a task that establishes a pattern
      await hookManager.afterTaskCompletion({
        taskId: 'T001',
        specId: 'auth-feature',
        description: 'Implement JWT authentication middleware',
        filesModified: ['src/middleware/auth.ts', 'src/utils/jwt.ts'],
        patternsUsed: ['middleware pattern', 'singleton'],
        outcome: 'success',
      });

      // Step 2: Verify memory was saved
      const searchResult = await memoryManager.search({
        keywords: 'authentication middleware',
        scope: 'local',
      });

      expect(searchResult.count).toBeGreaterThan(0);
      expect(searchResult.memories[0].content).toContain('JWT');
      expect(searchResult.memories[0].content).toContain('middleware');
      expect(searchResult.memories[0].type).toBe('procedural');

      // Step 3: Query for relevant memories before a similar tool call
      const toolCallResult = await hookManager.beforeToolCall({
        toolName: 'Edit',
        toolArgs: { file: 'src/routes/protected.ts' },
        filePaths: ['src/routes/protected.ts'],
        taskContext: 'Add authentication to protected routes',
      });

      expect(toolCallResult.hasRelevant).toBe(true);
      expect(toolCallResult.formattedContext).toContain('authentication');
    });

    it('should persist memories across storage instances (simulating session restart)', async () => {
      // Step 1: Save a memory in first "session"
      await hookManager.afterTaskCompletion({
        taskId: 'T002',
        specId: 'api-feature',
        description: 'Add rate limiting to API endpoints',
        filesModified: ['src/middleware/rateLimit.ts'],
        patternsUsed: ['rate limiting'],
        outcome: 'success',
      });

      // Step 2: Create new storage instance (simulating session restart)
      const newStorage = new MemoryStorage(tempDir);
      await newStorage.initialize();
      const newMemoryManager = createTestMemoryManager(newStorage);
      const newHookManager = new MemoryHookManager(newMemoryManager);
      newHookManager.setCurrentStage('implement');

      // Step 3: Query for the memory from new instance
      const toolCallResult = await newHookManager.beforeToolCall({
        toolName: 'Edit',
        toolArgs: {},
        taskContext: 'Add rate limiting to new endpoint',
      });

      expect(toolCallResult.hasRelevant).toBe(true);
      expect(toolCallResult.formattedContext).toContain('rate limiting');
    });
  });

  describe('error recovery memory lifecycle', () => {
    it('should save error recovery pattern and retrieve for similar errors', async () => {
      // Step 1: Record an error recovery
      await hookManager.onErrorRecovery({
        errorType: 'TypeScript Error',
        errorMessage: "Property 'x' does not exist on type 'Y'",
        recoverySteps: [
          'Added missing property to interface',
          'Ran type check to verify fix',
        ],
        whatWorked: 'Adding the property definition to the interface',
        affectedFiles: ['src/types/models.ts'],
      });

      // Step 2: Verify memory was saved
      const searchResult = await memoryManager.search({
        tags: ['#error-recovery'],
        scope: 'local',
      });

      expect(searchResult.count).toBe(1);
      expect(searchResult.memories[0].content).toContain('TypeScript Error');
      expect(searchResult.memories[0].content).toContain('What Worked');
      expect(searchResult.memories[0].type).toBe('episodic');

      // Step 3: Query for error recovery memories
      const toolCallResult = await hookManager.beforeToolCall({
        toolName: 'Edit',
        toolArgs: {},
        taskContext: 'Fix TypeScript error in types file',
        filePaths: ['src/types/models.ts'],
      });

      expect(toolCallResult.hasRelevant).toBe(true);
    });
  });

  describe('user clarification memory lifecycle', () => {
    it('should save user preferences and surface them in relevant contexts', async () => {
      // Step 1: Record a user clarification
      await hookManager.onUserClarification({
        question: 'Which testing framework should we use?',
        answer: 'Vitest for unit tests, Playwright for E2E',
        questionType: 'preference',
        specId: 'testing-setup',
        tags: ['#testing', '#tooling'],
      });

      // Step 2: Verify memory was saved
      const searchResult = await memoryManager.search({
        tags: ['#preference'],
        scope: 'local',
      });

      expect(searchResult.count).toBe(1);
      expect(searchResult.memories[0].content).toContain('Vitest');
      expect(searchResult.memories[0].confidence).toBe(100);
      expect(searchResult.memories[0].type).toBe('semantic');

      // Step 3: Query for testing-related memories
      const toolCallResult = await hookManager.beforeToolCall({
        toolName: 'Write',
        toolArgs: { file: 'tests/unit/example.test.ts' },
        taskContext: 'Write unit tests for the auth module',
      });

      expect(toolCallResult.hasRelevant).toBe(true);
      expect(toolCallResult.formattedContext).toContain('Vitest');
    });
  });

  describe('rate limiting', () => {
    it('should stop saving after 10 memories per stage', async () => {
      hookManager.setCurrentStage('test-stage');

      // Save 12 memories
      for (let i = 0; i < 12; i++) {
        await hookManager.afterTaskCompletion({
          taskId: `T${i}`,
          specId: 'test',
          description: `Task ${i}`,
          filesModified: [],
          outcome: 'success',
        });
      }

      // Query all saved memories
      const searchResult = await memoryManager.search({
        tags: ['#stage-test-stage'],
        scope: 'local',
      });

      // Only 10 should be saved due to rate limiting
      expect(searchResult.count).toBe(10);
    });

    it('should track rate limits separately per stage', async () => {
      // Fill up rate limit for stage A
      hookManager.setCurrentStage('stage-a');
      for (let i = 0; i < 10; i++) {
        await hookManager.afterTaskCompletion({
          taskId: `A${i}`,
          specId: 'test',
          description: `Task A${i}`,
          filesModified: [],
          outcome: 'success',
        });
      }

      // Switch to stage B - should have fresh limit
      hookManager.setCurrentStage('stage-b');
      for (let i = 0; i < 5; i++) {
        await hookManager.afterTaskCompletion({
          taskId: `B${i}`,
          specId: 'test',
          description: `Task B${i}`,
          filesModified: [],
          outcome: 'success',
        });
      }

      // Count memories per stage
      const stageAResult = await memoryManager.search({
        tags: ['#stage-stage-a'],
        scope: 'local',
      });
      const stageBResult = await memoryManager.search({
        tags: ['#stage-stage-b'],
        scope: 'local',
      });

      expect(stageAResult.count).toBe(10);
      expect(stageBResult.count).toBe(5);
    });
  });
});
