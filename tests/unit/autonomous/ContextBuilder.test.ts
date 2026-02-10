/**
 * Unit tests for ContextBuilder masking integration
 *
 * Tests observation tracking, turn management, and masking stats
 * in the context building process.
 *
 * @see .specify/specs/011-context-health-recursive-memory/tasks.md T014
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ContextBuilder,
  type TaskContext,
  type LoadingDecision,
} from '../../../extension/src/autonomous/ContextBuilder';
import type { MemoryManager } from '../../../extension/src/autonomous/MemoryManager';
import type { HintLoader } from '../../../extension/src/autonomous/HintLoader';
import { ObservationMasker } from '../../../extension/src/autonomous/ObservationMasker';

// Mock the Logger
vi.mock('../../../extension/src/utils/logger', () => ({
  Logger: {
    for: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Mock MemoryManager
vi.mock('../../../extension/src/autonomous/MemoryManager', () => ({
  MemoryManager: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({ memories: [], total: 0 }),
    save: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    consolidate: vi.fn(),
    loadByPriority: vi.fn().mockResolvedValue({
      memories: [],
      totalConsidered: 0,
      loadTime: 0,
      filtered: false,
    }),
    calculatePriorityScore: vi.fn().mockReturnValue(50),
    calculateRelevanceScore: vi.fn().mockReturnValue(50),
    recordUsage: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock HintLoader to avoid file system dependencies
vi.mock('../../../extension/src/autonomous/HintLoader', () => ({
  HintLoader: vi.fn().mockImplementation(() => ({
    loadForTask: vi.fn().mockResolvedValue({ mergedContent: null, loadedHints: [] }),
    dispose: vi.fn(),
  })),
}));

describe('ContextBuilder', () => {
  let tempDir: string;
  let memoryManager: MemoryManager;
  let hintLoader: HintLoader;

  beforeEach(async () => {
    // Create a temp directory for each test
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'context-builder-test-'));
    // Create required directories
    await fs.promises.mkdir(path.join(tempDir, '.specify', 'memory'), { recursive: true });

    // Create mocked instances
    const { MemoryManager: MockedMemoryManager } = await import(
      '../../../extension/src/autonomous/MemoryManager'
    );
    const { HintLoader: MockedHintLoader } = await import(
      '../../../extension/src/autonomous/HintLoader'
    );
    memoryManager = new MockedMemoryManager() as unknown as MemoryManager;
    hintLoader = new MockedHintLoader() as unknown as HintLoader;
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Turn Management Tests (T012, T013)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('turn management', () => {
    it('should start at turn 0', () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader);
      expect(builder.getCurrentTurn()).toBe(0);
    });

    it('should increment turn number', () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader);
      expect(builder.incrementTurn()).toBe(1);
      expect(builder.incrementTurn()).toBe(2);
      expect(builder.getCurrentTurn()).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Observation Tracking Tests (T013)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('observation tracking', () => {
    it('should track observations with current turn number', () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader);
      builder.incrementTurn(); // Turn 1

      const id = builder.trackObservation(
        'file_read',
        'const x = 1;',
        { filePath: 'test.ts' },
        'Test file'
      );

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(36); // UUID v4
    });

    it('should associate observations with correct turn', () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader);
      const masker = builder.getObservationMasker();

      builder.incrementTurn(); // Turn 1
      const id1 = builder.trackObservation('file_read', 'content 1');

      builder.incrementTurn(); // Turn 2
      const id2 = builder.trackObservation('command_output', 'content 2');

      const obs1 = masker.getObservation(id1);
      const obs2 = masker.getObservation(id2);

      expect(obs1?.turnNumber).toBe(1);
      expect(obs2?.turnNumber).toBe(2);
    });

    it('should expose ObservationMasker via getter', () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader);
      const masker = builder.getObservationMasker();

      expect(masker).toBeInstanceOf(ObservationMasker);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Masking Integration Tests (T011, T012)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('masking integration', () => {
    it('should include turnNumber in build result', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader);
      builder.incrementTurn();
      builder.incrementTurn(); // Turn 2

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.turnNumber).toBe(2);
    });

    it('should include maskingStats when masking enabled', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMasking: true,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.maskingStats).toBeDefined();
      expect(result.maskingStats?.maskedCount).toBe(0);
      expect(result.maskingStats?.tokensSaved).toBe(0);
      expect(result.maskingStats?.totalObservations).toBe(0);
    });

    it('should mask old observations in build result', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMasking: true,
        maskerConfig: { ageThresholdTurns: 5 },
      });

      // Track an observation at turn 1
      builder.incrementTurn(); // Turn 1
      builder.trackObservation('file_read', 'old content that should be masked', {
        filePath: 'old.ts',
      });

      // Advance to turn 10
      for (let i = 0; i < 9; i++) {
        builder.incrementTurn();
      }

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.maskingStats?.maskedCount).toBe(1);
      expect(result.maskingStats?.tokensSaved).toBeGreaterThan(0);
      expect(result.sections.observations).toBeDefined();
      expect(result.sections.observations).toContain('observation_masked');
    });

    it('should not mask recent observations', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMasking: true,
        maskerConfig: { ageThresholdTurns: 5 },
      });

      // Track an observation at turn 5
      for (let i = 0; i < 5; i++) {
        builder.incrementTurn();
      }
      builder.trackObservation('file_read', 'recent content');

      // Build at turn 6 (only 1 turn old, threshold is 5)
      builder.incrementTurn();

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.maskingStats?.maskedCount).toBe(0);
      expect(result.sections.observations).toBeUndefined();
    });

    it('should not include maskingStats when masking disabled', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMasking: false,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.maskingStats).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom ObservationMasker Tests (T011)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('custom ObservationMasker', () => {
    it('should accept custom ObservationMasker in constructor', () => {
      const customMasker = new ObservationMasker(tempDir, { ageThresholdTurns: 3 });
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, customMasker);

      expect(builder.getObservationMasker()).toBe(customMasker);
    });

    it('should use custom masker config', async () => {
      const customMasker = new ObservationMasker(tempDir, { ageThresholdTurns: 2 });
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, customMasker, {
        enableMasking: true,
      });

      // Track at turn 1
      builder.incrementTurn();
      builder.trackObservation('file_read', 'should be masked with threshold 2');

      // Build at turn 4 (3 turns old, exceeds threshold of 2)
      builder.incrementTurn();
      builder.incrementTurn();
      builder.incrementTurn();

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.maskingStats?.maskedCount).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Context Merging Tests (T012)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('context merging with observations', () => {
    it('should include masked observations section in full context', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMasking: true,
        maskerConfig: { ageThresholdTurns: 5 },
      });

      // Track old observation
      builder.incrementTurn();
      builder.trackObservation('file_read', 'file content', { filePath: 'test.ts', lineCount: 50 });

      // Advance past threshold
      for (let i = 0; i < 10; i++) {
        builder.incrementTurn();
      }

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.fullContext).toContain('# Masked Observations');
      expect(result.fullContext).toContain('gofer_expand_observation');
      expect(result.fullContext).toContain('observation_masked');
    });

    it('should not include observations section when no masking occurred', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMasking: true,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.fullContext).not.toContain('# Masked Observations');
      expect(result.sections.observations).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Context Reduction Verification (T014)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('context reduction', () => {
    it('should reduce context by masking large observations', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMasking: true,
        maskerConfig: { ageThresholdTurns: 3 },
      });

      // Track a large observation at turn 1
      const largeContent = 'x'.repeat(4000); // 1000 tokens
      builder.incrementTurn();
      builder.trackObservation('file_read', largeContent, { filePath: 'large.ts' });

      // Advance past threshold
      for (let i = 0; i < 5; i++) {
        builder.incrementTurn();
      }

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      // Original: 1000 tokens, placeholder: ~20 tokens
      expect(result.maskingStats?.tokensSaved).toBeGreaterThanOrEqual(900);
      expect(result.sections.observations?.length).toBeLessThan(largeContent.length / 10);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Stage Profile Integration Tests (T038-T042)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('stage profile integration', () => {
    it('should default to implement stage', () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader);
      expect(builder.getStage()).toBe('implement');
    });

    it('should return default implement profile', () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader);
      const profile = builder.getProfile();

      expect(profile.stage).toBe('implement');
      expect(profile.researchBudget).toBe(0.1);
      expect(profile.memoryBudget).toBe(0.15);
      expect(profile.codeBudget).toBe(0.45);
      expect(profile.observationWindow).toBe(10);
    });

    it('should set stage and load corresponding profile', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader);

      await builder.setCurrentStage('research');

      expect(builder.getStage()).toBe('research');
      const profile = builder.getProfile();
      expect(profile.stage).toBe('research');
      expect(profile.researchBudget).toBe(0.15);
      expect(profile.codeBudget).toBe(0.4);
    });

    it('should emit stage-change event on stage transition', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader);
      const events: unknown[] = [];

      builder.on('stage-change', (event) => events.push(event));

      await builder.setCurrentStage('plan');

      expect(events.length).toBe(1);
      expect(events[0]).toMatchObject({
        previousStage: 'implement',
        newStage: 'plan',
      });
    });

    it('should include stage in build result', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader);

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.stage).toBe('implement');
    });

    it('should include budgetUsage when budget enforcement enabled', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableBudgetEnforcement: true,
        contextTokenLimit: 120000,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.budgetUsage).toBeDefined();
      expect(result.budgetUsage?.stage).toBe('implement');
      expect(result.budgetUsage?.profile.stage).toBe('implement');
    });

    it('should calculate budget limits from profile fractions', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableBudgetEnforcement: true,
        contextTokenLimit: 100000,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      // Default implement profile: research=0.10, memory=0.15, code=0.45
      // conversation = 1 - 0.10 - 0.15 - 0.45 = 0.30
      expect(result.budgetUsage?.limits.research).toBe(10000);
      expect(result.budgetUsage?.limits.memory).toBe(15000);
      expect(result.budgetUsage?.limits.code).toBe(45000);
      expect(result.budgetUsage?.limits.conversation).toBe(30000);
    });

    it('should track token usage per category', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableBudgetEnforcement: true,
        contextTokenLimit: 120000,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
        customContext: 'This is custom task context for testing',
      };

      const result = await builder.buildContext(task);

      expect(result.budgetUsage?.usage).toBeDefined();
      expect(result.budgetUsage?.usage.conversation).toBeGreaterThan(0);
      expect(result.budgetUsage?.usage.total).toBeGreaterThan(0);
    });

    it('should detect exceeded categories', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableBudgetEnforcement: true,
        contextTokenLimit: 100, // Very small to force exceeding
        emitBudgetWarnings: false,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
        customContext: 'x'.repeat(400), // Will exceed conversation budget
      };

      const result = await builder.buildContext(task);

      expect(result.budgetUsage?.exceededCategories).toContain('conversation');
    });

    it('should emit budget-warning events for exceeded categories', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableBudgetEnforcement: true,
        contextTokenLimit: 100,
        emitBudgetWarnings: true,
      });

      const warnings: unknown[] = [];
      builder.on('budget-warning', (event) => warnings.push(event));

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
        customContext: 'x'.repeat(400),
      };

      await builder.buildContext(task);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toMatchObject({
        category: 'conversation',
        stage: 'implement',
      });
    });

    it('should not emit warnings when disabled', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableBudgetEnforcement: true,
        contextTokenLimit: 100,
        emitBudgetWarnings: false,
      });

      const warnings: unknown[] = [];
      builder.on('budget-warning', (event) => warnings.push(event));

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
        customContext: 'x'.repeat(400),
      };

      await builder.buildContext(task);

      expect(warnings.length).toBe(0);
    });

    it('should detect totalExceeded when usage exceeds context limit', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableBudgetEnforcement: true,
        contextTokenLimit: 50, // Very small
        emitBudgetWarnings: false,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
        customContext: 'x'.repeat(400),
      };

      const result = await builder.buildContext(task);

      expect(result.budgetUsage?.totalExceeded).toBe(true);
    });

    it('should not include budgetUsage when enforcement disabled', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableBudgetEnforcement: false,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.budgetUsage).toBeUndefined();
    });

    it('should update observation window when stage changes', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader);
      const masker = builder.getObservationMasker();

      // Default implement has observationWindow = 10
      expect(masker.getConfig().ageThresholdTurns).toBe(10);

      // Switch to research which has observationWindow = 15
      await builder.setCurrentStage('research');
      expect(masker.getConfig().ageThresholdTurns).toBe(15);

      // Switch to tasks which has observationWindow = 8
      await builder.setCurrentStage('tasks');
      expect(masker.getConfig().ageThresholdTurns).toBe(8);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Memory-First Loading Tests (T047-T050)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('memory-first loading', () => {
    it('should use loadByPriority when memory-first loading enabled', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMemoryFirstLoading: true,
        memoryPriorityLimit: 10,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement authentication feature',
      };

      await builder.buildContext(task);

      expect(memoryManager.loadByPriority).toHaveBeenCalledWith({
        limit: 10,
        taskContext: 'Implement authentication feature',
        scope: 'both',
      });
    });

    it('should include memoryCoverage in build result', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMemoryFirstLoading: true,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement authentication feature',
      };

      const result = await builder.buildContext(task);

      expect(result.memoryCoverage).toBeDefined();
      expect(result.memoryCoverage?.memoriesLoaded).toBe(0);
      expect(result.memoryCoverage?.coveragePercent).toBeDefined();
    });

    it('should track covered and uncovered keywords', async () => {
      // Mock loadByPriority to return a memory with relevant tags
      const mockMemory = {
        id: '123',
        category: 'authentication',
        tags: ['#auth', '#security'],
        scope: 'local' as const,
        content: 'Use JWT tokens for authentication',
        created: Date.now(),
        lastUsed: Date.now(),
        usedCount: 5,
        learnedFrom: 'user_interaction',
        priorityScore: 80,
        relevanceScore: 70,
        combinedScore: 74,
      };

      (memoryManager.loadByPriority as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        memories: [mockMemory],
        totalConsidered: 1,
        loadTime: 5,
        filtered: false,
      });

      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMemoryFirstLoading: true,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement authentication and database features',
      };

      const result = await builder.buildContext(task);

      // 'authentication' (stemmed to 'authentic') should be covered by memory category
      // 'database' should not be covered
      expect(result.memoryCoverage?.memoriesLoaded).toBe(1);
      // Memory has category 'authentication' which matches stemmed task keyword 'authentic' via trigram similarity
      const covered = result.memoryCoverage?.coveredKeywords || [];
      expect(covered.some(k => k === 'authentication' || k === 'authentic')).toBe(true);
      const uncovered = result.memoryCoverage?.uncoveredKeywords || [];
      expect(uncovered.some(k => k === 'database' || k === 'databas')).toBe(true);
    });

    it('should skip research loading when coverage is sufficient', async () => {
      // Mock high coverage (memory covers all keywords)
      const mockMemory = {
        id: '123',
        category: 'testing',
        tags: ['#implement', '#feature'],
        scope: 'local' as const,
        content: 'Implementation guidelines for features',
        created: Date.now(),
        lastUsed: Date.now(),
        usedCount: 5,
        learnedFrom: 'user_interaction',
        priorityScore: 80,
        relevanceScore: 70,
        combinedScore: 74,
      };

      (memoryManager.loadByPriority as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        memories: [mockMemory],
        totalConsidered: 1,
        loadTime: 5,
        filtered: false,
      });

      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMemoryFirstLoading: true,
        minMemoryCoverage: 0.3, // 30% threshold
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement feature',
      };

      const result = await builder.buildContext(task);

      // Should skip hints loading since coverage is high
      const researchDecision = result.loadingDecisions?.find((d) => d.source === 'research');
      expect(researchDecision?.decision).toBe('skipped');
      expect(result.memoryCoverage?.researchLoadedForGaps).toBe(false);
    });

    it('should load research when coverage is below threshold', async () => {
      // Mock low coverage (no memories cover the keywords)
      (memoryManager.loadByPriority as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        memories: [],
        totalConsidered: 0,
        loadTime: 5,
        filtered: false,
      });

      // Mock HintLoader to return content
      const { HintLoader: MockedHintLoader } = await import(
        '../../../extension/src/autonomous/HintLoader'
      );
      const mockHintLoader = new MockedHintLoader() as unknown as HintLoader;
      (mockHintLoader.loadForTask as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        mergedContent: 'Research content for gaps',
        loadedHints: ['hint1'],
      });

      const builder = new ContextBuilder(tempDir, memoryManager, mockHintLoader, undefined, {
        enableMemoryFirstLoading: true,
        minMemoryCoverage: 0.3, // 30% threshold
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement authentication feature',
      };

      const result = await builder.buildContext(task);

      // Should load hints since coverage is 0%
      const researchDecision = result.loadingDecisions?.find((d) => d.source === 'research');
      expect(researchDecision?.decision).toBe('loaded');
      expect(result.memoryCoverage?.researchLoadedForGaps).toBe(true);
      expect(result.sections.hints).toBe('Research content for gaps');
    });

    it('should include loading decisions in result', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMemoryFirstLoading: true,
        logLoadingDecisions: true,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement feature',
      };

      const result = await builder.buildContext(task);

      expect(result.loadingDecisions).toBeDefined();
      expect(result.loadingDecisions?.length).toBeGreaterThan(0);

      // Should have memory loading decision
      const memoryDecision = result.loadingDecisions?.find((d) => d.source === 'memory');
      expect(memoryDecision).toBeDefined();
      expect(memoryDecision?.decision).toBe('loaded');
    });

    it('should emit loading-decision events', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMemoryFirstLoading: true,
        logLoadingDecisions: true,
      });

      const decisions: LoadingDecision[] = [];
      builder.on('loading-decision', (decision: LoadingDecision) => decisions.push(decision));

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement feature',
      };

      await builder.buildContext(task);

      expect(decisions.length).toBeGreaterThan(0);
    });

    it('should not include loadingDecisions when logging disabled', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMemoryFirstLoading: true,
        logLoadingDecisions: false,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement feature',
      };

      const result = await builder.buildContext(task);

      expect(result.loadingDecisions).toBeUndefined();
    });

    it('should use legacy loading when memory-first disabled', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMemoryFirstLoading: false,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement feature',
      };

      const result = await builder.buildContext(task);

      // Should use search instead of loadByPriority
      expect(memoryManager.search).toHaveBeenCalled();
      expect(result.memoryCoverage).toBeUndefined();
    });

    it('should calculate 100% coverage when no task keywords', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMemoryFirstLoading: true,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'do it', // Only short words that get filtered out
      };

      const result = await builder.buildContext(task);

      // No keywords = 100% coverage (nothing to cover)
      expect(result.memoryCoverage?.coveragePercent).toBe(100);
    });

    it('should track research triggers for gaps', async () => {
      (memoryManager.loadByPriority as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        memories: [],
        totalConsidered: 0,
        loadTime: 5,
        filtered: false,
      });

      const { HintLoader: MockedHintLoader } = await import(
        '../../../extension/src/autonomous/HintLoader'
      );
      const mockHintLoader = new MockedHintLoader() as unknown as HintLoader;
      (mockHintLoader.loadForTask as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        mergedContent: 'Research content',
        loadedHints: ['hint1'],
      });

      const builder = new ContextBuilder(tempDir, memoryManager, mockHintLoader, undefined, {
        enableMemoryFirstLoading: true,
        minMemoryCoverage: 0.3,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement database authentication security',
      };

      const result = await builder.buildContext(task);

      expect(result.memoryCoverage?.researchLoadedForGaps).toBe(true);
      expect(result.memoryCoverage?.researchTriggers.length).toBeGreaterThan(0);
    });

    it('should not regress existing functionality', async () => {
      // Test that all existing context sections still work
      const constitutionPath = path.join(tempDir, '.specify', 'memory', 'constitution.md');
      await fs.promises.writeFile(constitutionPath, '# Constitution\nBe consistent');

      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableMemoryFirstLoading: true,
        enableMasking: true,
        enableBudgetEnforcement: true,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement authentication feature',
        customContext: 'Use JWT tokens',
      };

      const result = await builder.buildContext(task);

      // All existing features should still work
      expect(result.sections.constitution).toContain('Constitution');
      expect(result.sections.taskContext).toBe('Use JWT tokens');
      expect(result.maskingStats).toBeDefined();
      expect(result.budgetUsage).toBeDefined();
      expect(result.turnNumber).toBe(0);
      expect(result.stage).toBe('implement');
      expect(result.loadTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Chunked Research Loading Tests (T059-T062)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('chunked research loading', () => {
    it('should load research chunks when enabled and spec has research.md', async () => {
      // Create spec directory with research.md
      const specDir = path.join(tempDir, '.specify', 'specs', 'test-spec');
      await fs.promises.mkdir(specDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(specDir, 'research.md'),
        `# Authentication\n\nOAuth2 implementation with JWT tokens.\n\n# Database\n\nPostgreSQL schema design.\n`
      );

      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableChunkedResearch: true,
        researchChunkLimit: 5,
        minChunkRelevance: 0, // Accept all chunks
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement OAuth2 authentication',
      };

      const result = await builder.buildContext(task);

      expect(result.sections.research).toBeDefined();
      expect(result.sections.research).toContain('Research Context');
      expect(result.sections.research).toContain('Authentication');
    });

    it('should include research in loading decisions', async () => {
      const specDir = path.join(tempDir, '.specify', 'specs', 'test-spec');
      await fs.promises.mkdir(specDir, { recursive: true });
      await fs.promises.writeFile(path.join(specDir, 'research.md'), `# Section 1\n\nContent.\n`);

      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableChunkedResearch: true,
        logLoadingDecisions: true,
        minChunkRelevance: 0,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      const researchDecision = result.loadingDecisions?.find(
        (d) => d.source === 'research' && d.reason.includes('research chunks')
      );
      expect(researchDecision).toBeDefined();
      expect(researchDecision?.decision).toBe('loaded');
      expect(researchDecision?.tokens).toBeGreaterThan(0);
    });

    it('should not load research when disabled', async () => {
      const specDir = path.join(tempDir, '.specify', 'specs', 'test-spec');
      await fs.promises.mkdir(specDir, { recursive: true });
      await fs.promises.writeFile(path.join(specDir, 'research.md'), `# Section\n\nContent.\n`);

      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableChunkedResearch: false,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.sections.research).toBeUndefined();
    });

    it('should not load research when specId is not provided', async () => {
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableChunkedResearch: true,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: '', // Empty spec ID
        description: 'Test task',
      };

      const result = await builder.buildContext(task);

      expect(result.sections.research).toBeUndefined();
    });

    it('should gracefully handle missing research file', async () => {
      // No research.md file exists
      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableChunkedResearch: true,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'non-existent-spec',
        description: 'Test task',
      };

      // Should not throw
      const result = await builder.buildContext(task);

      expect(result.sections.research).toBeUndefined();
    });

    it('should filter chunks by minimum relevance', async () => {
      const specDir = path.join(tempDir, '.specify', 'specs', 'test-spec');
      await fs.promises.mkdir(specDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(specDir, 'research.md'),
        `# Unrelated Topic\n\nThis is about cooking recipes.\n\n# Another Unrelated\n\nThis is about gardening.\n`
      );

      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableChunkedResearch: true,
        minChunkRelevance: 50, // High threshold
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement database migrations',
      };

      const result = await builder.buildContext(task);

      // Should not include chunks with low relevance
      expect(result.sections.research).toBeUndefined();
    });

    it('should respect research chunk limit', async () => {
      const specDir = path.join(tempDir, '.specify', 'specs', 'test-spec');
      await fs.promises.mkdir(specDir, { recursive: true });

      // Create research with many sections
      let content = '';
      for (let i = 0; i < 10; i++) {
        content += `# Section ${i}\n\nContent for section ${i} about authentication.\n\n`;
      }
      await fs.promises.writeFile(path.join(specDir, 'research.md'), content);

      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableChunkedResearch: true,
        researchChunkLimit: 2, // Only load 2 chunks
        minChunkRelevance: 0,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement authentication',
      };

      const result = await builder.buildContext(task);

      // Should indicate only 2 chunks loaded
      expect(result.sections.research).toContain('Loaded 2 relevant chunks');
    });

    it('should include research section in merged context', async () => {
      const specDir = path.join(tempDir, '.specify', 'specs', 'test-spec');
      await fs.promises.mkdir(specDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(specDir, 'research.md'),
        `# Authentication\n\nOAuth2 implementation.\n`
      );

      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableChunkedResearch: true,
        minChunkRelevance: 0,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Test OAuth2',
      };

      const result = await builder.buildContext(task);

      // Research should be in the full context
      expect(result.fullContext).toContain('# Research Context');
      expect(result.fullContext).toContain('Authentication');
    });

    it('should load chunks ranked by relevance to task', async () => {
      const specDir = path.join(tempDir, '.specify', 'specs', 'test-spec');
      await fs.promises.mkdir(specDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(specDir, 'research.md'),
        `# Database Schema\n\nPostgreSQL tables and relationships.\n\n# Authentication Flow\n\nOAuth2 with JWT tokens authentication flow.\n`
      );

      const builder = new ContextBuilder(tempDir, memoryManager, hintLoader, undefined, {
        enableChunkedResearch: true,
        researchChunkLimit: 1, // Only get top chunk
        minChunkRelevance: 0,
      });

      const task: TaskContext = {
        taskId: 'T001',
        specId: 'test-spec',
        description: 'Implement OAuth2 authentication with JWT',
      };

      const result = await builder.buildContext(task);

      // Most relevant chunk (Authentication) should be loaded
      expect(result.sections.research).toContain('Authentication');
    });

    it('should accept custom ResearchChunker in constructor', async () => {
      const { ResearchChunker } = await import('../../../extension/src/autonomous/ResearchChunker');

      const customChunker = new ResearchChunker(tempDir, {
        minChunkTokens: 50,
        maxChunkTokens: 1000,
      });

      const builder = new ContextBuilder(
        tempDir,
        memoryManager,
        hintLoader,
        undefined,
        {},
        undefined,
        customChunker
      );

      // Builder should use the custom chunker
      expect(builder).toBeDefined();
    });
  });
});
