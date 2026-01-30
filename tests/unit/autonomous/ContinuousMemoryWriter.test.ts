/**
 * Unit tests for ContinuousMemoryWriter
 *
 * Spec 014 Phase 5 (T037)
 * - Event listening (budget-warning, loading-decision)
 * - Memory creation for stage transitions and task completions
 * - Rate limiting (max 10 per stage)
 * - Tagging (#auto, #stage-{name}, #spec-{id})
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { ContinuousMemoryWriter } from '../../../extension/src/autonomous/ContinuousMemoryWriter';

describe('ContinuousMemoryWriter', () => {
  let writer: ContinuousMemoryWriter;
  let mockMemoryManager: {
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockMemoryManager = {
      save: vi.fn().mockResolvedValue({ id: 'test-id', category: 'test' }),
    };
    writer = new ContinuousMemoryWriter(mockMemoryManager);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Stage Transitions (T032)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('recordStageTransition', () => {
    it('should create a memory with pipeline_stage category', async () => {
      await writer.recordStageTransition('research', 'specify', 'feature-001');

      expect(mockMemoryManager.save).toHaveBeenCalledOnce();
      const saved = mockMemoryManager.save.mock.calls[0][0];
      expect(saved.category).toBe('pipeline_stage');
      expect(saved.content).toContain('research');
      expect(saved.content).toContain('specify');
      expect(saved.content).toContain('feature-001');
    });

    it('should tag with #auto, #stage-{name}, #spec-{id}', async () => {
      await writer.recordStageTransition('plan', 'tasks', 'my-spec');

      const saved = mockMemoryManager.save.mock.calls[0][0];
      expect(saved.tags).toContain('#auto');
      expect(saved.tags).toContain('#stage-tasks');
      expect(saved.tags).toContain('#spec-my-spec');
    });

    it('should set scope to local', async () => {
      await writer.recordStageTransition('research', 'specify', 'feature-001');

      const saved = mockMemoryManager.save.mock.calls[0][0];
      expect(saved.scope).toBe('local');
    });

    it('should set learnedFrom to specId', async () => {
      await writer.recordStageTransition('research', 'specify', 'feature-001');

      const saved = mockMemoryManager.save.mock.calls[0][0];
      expect(saved.learnedFrom).toBe('feature-001');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Task Completions (T033)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('recordTaskCompletion', () => {
    it('should create a memory with task_completion category', async () => {
      await writer.recordTaskCompletion('T001', 'feature-001', 'Created project structure');

      expect(mockMemoryManager.save).toHaveBeenCalledOnce();
      const saved = mockMemoryManager.save.mock.calls[0][0];
      expect(saved.category).toBe('task_completion');
      expect(saved.content).toContain('T001');
      expect(saved.content).toContain('Created project structure');
    });

    it('should tag with #task-{id}', async () => {
      await writer.recordTaskCompletion('T015', 'my-spec', 'Added session reader');

      const saved = mockMemoryManager.save.mock.calls[0][0];
      expect(saved.tags).toContain('#auto');
      expect(saved.tags).toContain('#task-T015');
      expect(saved.tags).toContain('#spec-my-spec');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Rate Limiting (T034)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('rate limiting', () => {
    it('should allow up to 10 saves per stage', async () => {
      for (let i = 0; i < 10; i++) {
        await writer.recordTaskCompletion(`T00${i}`, 'spec', `Task ${i}`);
      }

      expect(mockMemoryManager.save).toHaveBeenCalledTimes(10);
    });

    it('should stop saving after 10 per stage', async () => {
      for (let i = 0; i < 15; i++) {
        await writer.recordTaskCompletion(
          `T0${i.toString().padStart(2, '0')}`,
          'spec',
          `Task ${i}`
        );
      }

      expect(mockMemoryManager.save).toHaveBeenCalledTimes(10);
    });

    it('should track counts per stage independently', async () => {
      // First stage: fill to 10
      await writer.recordStageTransition('start', 'research', 'spec');
      for (let i = 0; i < 10; i++) {
        await writer.recordTaskCompletion(`T${i}`, 'spec', `Task ${i}`);
      }

      // Transition to new stage — should reset tracking for new stage
      await writer.recordStageTransition('research', 'specify', 'spec');

      // New stage should have fresh counter (the transition itself counts as 1)
      mockMemoryManager.save.mockClear();
      for (let i = 0; i < 10; i++) {
        await writer.recordTaskCompletion(`T${i + 20}`, 'spec', `Task ${i + 20}`);
      }

      // Should have saved some (less than 10 since stage transition used 1)
      expect(mockMemoryManager.save.mock.calls.length).toBeGreaterThan(0);
    });

    it('should return correct save count', async () => {
      await writer.recordStageTransition('start', 'implement', 'spec');
      expect(writer.getSaveCount('implement')).toBe(1);
    });

    it('should reset rate limits when resetRateLimits is called', async () => {
      // Fill up the default stage
      for (let i = 0; i < 10; i++) {
        await writer.recordTaskCompletion(`T${i}`, 'spec', `Task ${i}`);
      }
      expect(mockMemoryManager.save).toHaveBeenCalledTimes(10);

      // Reset and try again
      writer.resetRateLimits();
      mockMemoryManager.save.mockClear();
      await writer.recordTaskCompletion('T99', 'spec', 'After reset');
      expect(mockMemoryManager.save).toHaveBeenCalledOnce();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ContextBuilder Event Listening (T031)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('connectToContextBuilder', () => {
    let mockBuilder: EventEmitter;

    beforeEach(() => {
      mockBuilder = new EventEmitter();
      writer.connectToContextBuilder(mockBuilder);
    });

    it('should record budget-warning events as auto_decision memories', async () => {
      mockBuilder.emit('budget-warning', {
        category: 'research',
        tokensUsed: 15000,
        budgetLimit: 10000,
        percentOver: 50,
        stage: 'implement',
      });

      // Wait for async save
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockMemoryManager.save).toHaveBeenCalledOnce();
      const saved = mockMemoryManager.save.mock.calls[0][0];
      expect(saved.category).toBe('auto_decision');
      expect(saved.content).toContain('budget_warning');
      expect(saved.content).toContain('research');
      expect(saved.content).toContain('15000');
    });

    it('should record loading-decision events as auto_decision memories', async () => {
      mockBuilder.emit('loading-decision', {
        source: 'memory',
        decision: 'loaded',
        reason: 'High coverage for current task',
        tokens: 5000,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockMemoryManager.save).toHaveBeenCalledOnce();
      const saved = mockMemoryManager.save.mock.calls[0][0];
      expect(saved.category).toBe('auto_decision');
      expect(saved.content).toContain('loading_decision');
      expect(saved.content).toContain('memory');
      expect(saved.content).toContain('loaded');
      expect(saved.content).toContain('5000 tokens');
    });

    it('should handle loading-decision without tokens', async () => {
      mockBuilder.emit('loading-decision', {
        source: 'research',
        decision: 'skipped',
        reason: 'Memory coverage sufficient',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockMemoryManager.save).toHaveBeenCalledOnce();
      const saved = mockMemoryManager.save.mock.calls[0][0];
      expect(saved.content).not.toContain('tokens)');
    });

    it('should respect rate limiting for events too', async () => {
      // Fill rate limit
      for (let i = 0; i < 12; i++) {
        mockBuilder.emit('budget-warning', {
          category: 'research',
          tokensUsed: 15000,
          budgetLimit: 10000,
          percentOver: 50,
          stage: 'unknown',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockMemoryManager.save).toHaveBeenCalledTimes(10);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Disconnect & Dispose
  // ─────────────────────────────────────────────────────────────────────────────

  describe('disconnectFromContextBuilder', () => {
    it('should stop listening after disconnect', async () => {
      const mockBuilder = new EventEmitter();
      writer.connectToContextBuilder(mockBuilder);
      writer.disconnectFromContextBuilder();

      mockBuilder.emit('budget-warning', {
        category: 'test',
        tokensUsed: 1000,
        budgetLimit: 500,
        percentOver: 100,
        stage: 'test',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockMemoryManager.save).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should disconnect and clear state', () => {
      const mockBuilder = new EventEmitter();
      writer.connectToContextBuilder(mockBuilder);
      writer.dispose();

      expect(writer.getSaveCount('any-stage')).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('should silently handle save failures', async () => {
      mockMemoryManager.save.mockRejectedValueOnce(new Error('Save failed'));

      // Should not throw
      await expect(
        writer.recordStageTransition('research', 'specify', 'spec')
      ).resolves.not.toThrow();
    });
  });
});
