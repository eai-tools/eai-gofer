/**
 * Unit tests for Telemetry Integration
 *
 * T067: Tests for context health telemetry methods
 * @see .specify/specs/011-context-health-recursive-memory/tasks.md T063-T067
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryLearningTelemetry } from '../../../extension/src/autonomous/telemetryIntegration';
import type {
  GoferStage,
  StageContextProfile,
} from '../../../extension/src/autonomous/StageContextProfile';

// Mock the TelemetryCollector
vi.mock('../../../extension/src/utils/telemetry', () => ({
  TelemetryCollector: {
    getInstance: vi.fn().mockReturnValue({
      trackFeature: vi.fn(),
      trackPerformance: vi.fn(),
      trackError: vi.fn(),
      trackEvent: vi.fn(),
    }),
  },
}));

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

describe('MemoryLearningTelemetry - Context Health Methods', () => {
  let mockTelemetry: {
    trackFeature: ReturnType<typeof vi.fn>;
    trackPerformance: ReturnType<typeof vi.fn>;
    trackError: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { TelemetryCollector } = await import('../../../extension/src/utils/telemetry');
    mockTelemetry = TelemetryCollector.getInstance() as typeof mockTelemetry;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T063: trackContextHealthCheck Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('trackContextHealthCheck (T063)', () => {
    it('should track health check with healthy status', () => {
      MemoryLearningTelemetry.trackContextHealthCheck({
        status: 'healthy',
        utilizationPercent: 45,
        totalTokens: 54000,
        recommendations: [],
        stage: 'implement',
      });

      expect(mockTelemetry.trackFeature).toHaveBeenCalledWith('context.health_check', {
        status: 'healthy',
        stage: 'implement',
        hasRecommendations: false,
        recommendationCount: 0,
      });

      expect(mockTelemetry.trackPerformance).toHaveBeenCalledWith('context.utilization', 45, {
        status: 'healthy',
        totalTokens: 54000,
      });
    });

    it('should track health check with warning status', () => {
      MemoryLearningTelemetry.trackContextHealthCheck({
        status: 'warning',
        utilizationPercent: 65,
        totalTokens: 78000,
        recommendations: ['Consider saving progress'],
        stage: 'research',
      });

      expect(mockTelemetry.trackFeature).toHaveBeenCalledWith('context.health_check', {
        status: 'warning',
        stage: 'research',
        hasRecommendations: true,
        recommendationCount: 1,
      });
    });

    it('should track health check with critical status', () => {
      MemoryLearningTelemetry.trackContextHealthCheck({
        status: 'critical',
        utilizationPercent: 85,
        totalTokens: 102000,
        recommendations: ['Save session now', 'Use /7_gofer_save', 'Start fresh context'],
        stage: 'implement',
      });

      expect(mockTelemetry.trackFeature).toHaveBeenCalledWith('context.health_check', {
        status: 'critical',
        stage: 'implement',
        hasRecommendations: true,
        recommendationCount: 3,
      });

      expect(mockTelemetry.trackPerformance).toHaveBeenCalledWith('context.utilization', 85, {
        status: 'critical',
        totalTokens: 102000,
      });
    });

    it('should track all Gofer stages', () => {
      const stages: GoferStage[] = [
        'research',
        'specify',
        'plan',
        'tasks',
        'implement',
        'validate',
      ];

      for (const stage of stages) {
        MemoryLearningTelemetry.trackContextHealthCheck({
          status: 'healthy',
          utilizationPercent: 50,
          totalTokens: 60000,
          recommendations: [],
          stage,
        });

        expect(mockTelemetry.trackFeature).toHaveBeenLastCalledWith(
          'context.health_check',
          expect.objectContaining({ stage })
        );
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T064: trackObservationMasked Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('trackObservationMasked (T064)', () => {
    it('should track observation masking with tokens saved', () => {
      MemoryLearningTelemetry.trackObservationMasked({
        maskedCount: 5,
        tokensSaved: 2500,
        types: ['file_read', 'command_output'],
        currentTurn: 15,
        ageThreshold: 10,
      });

      expect(mockTelemetry.trackFeature).toHaveBeenCalledWith('observation.masked', {
        maskedCount: 5,
        typeCount: 2,
        currentTurn: 15,
        ageThreshold: 10,
      });

      expect(mockTelemetry.trackPerformance).toHaveBeenCalledWith('observation.tokensSaved', 2500, {
        maskedCount: 5,
      });
    });

    it('should track zero masking events', () => {
      MemoryLearningTelemetry.trackObservationMasked({
        maskedCount: 0,
        tokensSaved: 0,
        types: [],
        currentTurn: 3,
        ageThreshold: 10,
      });

      expect(mockTelemetry.trackFeature).toHaveBeenCalledWith('observation.masked', {
        maskedCount: 0,
        typeCount: 0,
        currentTurn: 3,
        ageThreshold: 10,
      });
    });

    it('should track multiple observation types', () => {
      MemoryLearningTelemetry.trackObservationMasked({
        maskedCount: 10,
        tokensSaved: 5000,
        types: ['file_read', 'command_output', 'tool_result', 'search_result'],
        currentTurn: 25,
        ageThreshold: 5,
      });

      expect(mockTelemetry.trackFeature).toHaveBeenCalledWith('observation.masked', {
        maskedCount: 10,
        typeCount: 4,
        currentTurn: 25,
        ageThreshold: 5,
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T065: trackStageProfileSwitch Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('trackStageProfileSwitch (T065)', () => {
    const implementProfile: StageContextProfile = {
      stage: 'implement',
      researchBudget: 0.1,
      memoryBudget: 0.15,
      codeBudget: 0.45,
      observationWindow: 10,
    };

    const researchProfile: StageContextProfile = {
      stage: 'research',
      researchBudget: 0.15,
      memoryBudget: 0.15,
      codeBudget: 0.4,
      observationWindow: 15,
    };

    it('should track stage transition from implement to research', () => {
      MemoryLearningTelemetry.trackStageProfileSwitch({
        fromStage: 'implement',
        toStage: 'research',
        fromProfile: implementProfile,
        toProfile: researchProfile,
      });

      expect(mockTelemetry.trackFeature).toHaveBeenCalledWith('stage.profile_switch', {
        fromStage: 'implement',
        toStage: 'research',
        researchBudgetChange: expect.closeTo(0.05, 5),
        memoryBudgetChange: 0,
        codeBudgetChange: expect.closeTo(-0.05, 5),
        observationWindowChange: 5,
      });
    });

    it('should track stage transition from research to implement', () => {
      MemoryLearningTelemetry.trackStageProfileSwitch({
        fromStage: 'research',
        toStage: 'implement',
        fromProfile: researchProfile,
        toProfile: implementProfile,
      });

      expect(mockTelemetry.trackFeature).toHaveBeenCalledWith('stage.profile_switch', {
        fromStage: 'research',
        toStage: 'implement',
        researchBudgetChange: expect.closeTo(-0.05, 5),
        memoryBudgetChange: 0,
        codeBudgetChange: expect.closeTo(0.05, 5),
        observationWindowChange: -5,
      });
    });

    it('should track zero change when switching to same profile values', () => {
      const identicalProfile: StageContextProfile = { ...implementProfile };

      MemoryLearningTelemetry.trackStageProfileSwitch({
        fromStage: 'implement',
        toStage: 'implement',
        fromProfile: implementProfile,
        toProfile: identicalProfile,
      });

      expect(mockTelemetry.trackFeature).toHaveBeenCalledWith('stage.profile_switch', {
        fromStage: 'implement',
        toStage: 'implement',
        researchBudgetChange: 0,
        memoryBudgetChange: 0,
        codeBudgetChange: 0,
        observationWindowChange: 0,
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T066: trackMemoryFirstHit Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('trackMemoryFirstHit (T066)', () => {
    it('should track successful memory-first hit with full coverage', () => {
      MemoryLearningTelemetry.trackMemoryFirstHit({
        memoriesLoaded: 5,
        memoriesConsidered: 10,
        coveragePercent: 80,
        researchLoadedForGaps: false,
        gapCount: 0,
        loadTime: 15,
      });

      expect(mockTelemetry.trackFeature).toHaveBeenCalledWith('memory.first_hit', {
        memoriesLoaded: 5,
        memoriesConsidered: 10,
        researchLoadedForGaps: false,
        gapCount: 0,
      });

      expect(mockTelemetry.trackPerformance).toHaveBeenCalledWith('memory.coveragePercent', 80, {
        memoriesLoaded: 5,
        researchLoadedForGaps: false,
      });

      expect(mockTelemetry.trackPerformance).toHaveBeenCalledWith('memory.loadTime', 15, {
        memoriesLoaded: 5,
      });
    });

    it('should track memory-first with research fallback', () => {
      MemoryLearningTelemetry.trackMemoryFirstHit({
        memoriesLoaded: 2,
        memoriesConsidered: 5,
        coveragePercent: 25,
        researchLoadedForGaps: true,
        gapCount: 3,
        loadTime: 45,
      });

      expect(mockTelemetry.trackFeature).toHaveBeenCalledWith('memory.first_hit', {
        memoriesLoaded: 2,
        memoriesConsidered: 5,
        researchLoadedForGaps: true,
        gapCount: 3,
      });

      expect(mockTelemetry.trackPerformance).toHaveBeenCalledWith('memory.coveragePercent', 25, {
        memoriesLoaded: 2,
        researchLoadedForGaps: true,
      });
    });

    it('should track zero memories loaded', () => {
      MemoryLearningTelemetry.trackMemoryFirstHit({
        memoriesLoaded: 0,
        memoriesConsidered: 0,
        coveragePercent: 0,
        researchLoadedForGaps: true,
        gapCount: 5,
        loadTime: 5,
      });

      expect(mockTelemetry.trackFeature).toHaveBeenCalledWith('memory.first_hit', {
        memoriesLoaded: 0,
        memoriesConsidered: 0,
        researchLoadedForGaps: true,
        gapCount: 5,
      });
    });

    it('should track performance metrics separately', () => {
      MemoryLearningTelemetry.trackMemoryFirstHit({
        memoriesLoaded: 10,
        memoriesConsidered: 20,
        coveragePercent: 100,
        researchLoadedForGaps: false,
        gapCount: 0,
        loadTime: 100,
      });

      // Should track both coverage and load time
      expect(mockTelemetry.trackPerformance).toHaveBeenCalledTimes(2);
      expect(mockTelemetry.trackPerformance).toHaveBeenCalledWith(
        'memory.coveragePercent',
        100,
        expect.any(Object)
      );
      expect(mockTelemetry.trackPerformance).toHaveBeenCalledWith(
        'memory.loadTime',
        100,
        expect.any(Object)
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Transformation Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('data transformation', () => {
    it('should transform recommendations array to count and boolean', () => {
      // With recommendations
      MemoryLearningTelemetry.trackContextHealthCheck({
        status: 'warning',
        utilizationPercent: 70,
        totalTokens: 84000,
        recommendations: ['Save now', 'Use /7_gofer_save', 'Start fresh'],
        stage: 'implement',
      });

      let call = mockTelemetry.trackFeature.mock.calls[0];
      expect(call[1].hasRecommendations).toBe(true);
      expect(call[1].recommendationCount).toBe(3);
      // Verify original array is NOT included (privacy)
      expect(call[1]).not.toHaveProperty('recommendations');

      vi.clearAllMocks();

      // Without recommendations
      MemoryLearningTelemetry.trackContextHealthCheck({
        status: 'healthy',
        utilizationPercent: 30,
        totalTokens: 36000,
        recommendations: [],
        stage: 'research',
      });

      call = mockTelemetry.trackFeature.mock.calls[0];
      expect(call[1].hasRecommendations).toBe(false);
      expect(call[1].recommendationCount).toBe(0);
    });

    it('should transform types array to count only', () => {
      MemoryLearningTelemetry.trackObservationMasked({
        maskedCount: 5,
        tokensSaved: 2500,
        types: ['file_read', 'command_output', 'tool_result'],
        currentTurn: 15,
        ageThreshold: 10,
      });

      const call = mockTelemetry.trackFeature.mock.calls[0];
      expect(call[1].typeCount).toBe(3);
      // Verify original types array is NOT included
      expect(call[1]).not.toHaveProperty('types');
    });

    it('should calculate budget differences correctly', () => {
      const fromProfile: StageContextProfile = {
        stage: 'research',
        researchBudget: 0.2,
        memoryBudget: 0.1,
        codeBudget: 0.3,
        observationWindow: 15,
      };
      const toProfile: StageContextProfile = {
        stage: 'implement',
        researchBudget: 0.1,
        memoryBudget: 0.15,
        codeBudget: 0.45,
        observationWindow: 10,
      };

      MemoryLearningTelemetry.trackStageProfileSwitch({
        fromStage: 'research',
        toStage: 'implement',
        fromProfile,
        toProfile,
      });

      const call = mockTelemetry.trackFeature.mock.calls[0];
      // toProfile - fromProfile
      expect(call[1].researchBudgetChange).toBeCloseTo(-0.1, 5);
      expect(call[1].memoryBudgetChange).toBeCloseTo(0.05, 5);
      expect(call[1].codeBudgetChange).toBeCloseTo(0.15, 5);
      expect(call[1].observationWindowChange).toBe(-5);
    });

    it('should exclude raw content from telemetry events', () => {
      // Verify that input objects with potentially sensitive data
      // are transformed to only include aggregate statistics

      MemoryLearningTelemetry.trackObservationMasked({
        maskedCount: 3,
        tokensSaved: 1500,
        types: ['file_read'],
        currentTurn: 10,
        ageThreshold: 5,
      });

      const featureCall = mockTelemetry.trackFeature.mock.calls[0][1];
      const perfCall = mockTelemetry.trackPerformance.mock.calls[0];

      // Verify only expected keys are present
      expect(Object.keys(featureCall).sort()).toEqual([
        'ageThreshold',
        'currentTurn',
        'maskedCount',
        'typeCount',
      ]);

      // Performance call should have value and metadata
      expect(perfCall[0]).toBe('observation.tokensSaved');
      expect(perfCall[1]).toBe(1500);
      expect(perfCall[2]).toEqual({ maskedCount: 3 });
    });

    it('should track both coverage and load time for memory-first hits', () => {
      MemoryLearningTelemetry.trackMemoryFirstHit({
        memoriesLoaded: 5,
        memoriesConsidered: 10,
        coveragePercent: 50,
        researchLoadedForGaps: true,
        gapCount: 3,
        loadTime: 45,
      });

      // Should make exactly 2 trackPerformance calls
      expect(mockTelemetry.trackPerformance).toHaveBeenCalledTimes(2);

      // First call: coverage
      expect(mockTelemetry.trackPerformance).toHaveBeenCalledWith('memory.coveragePercent', 50, {
        memoriesLoaded: 5,
        researchLoadedForGaps: true,
      });

      // Second call: load time
      expect(mockTelemetry.trackPerformance).toHaveBeenCalledWith('memory.loadTime', 45, {
        memoriesLoaded: 5,
      });
    });
  });
});
