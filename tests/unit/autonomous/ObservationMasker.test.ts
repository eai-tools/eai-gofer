/**
 * Unit tests for ObservationMasker
 *
 * Tests observation tracking, age-based masking, placeholder generation,
 * and cache persistence.
 *
 * @see .specify/specs/011-context-health-recursive-memory/tasks.md T007
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ObservationMasker,
  type TrackObservationInput,
} from '../../../extension/src/autonomous/ObservationMasker';

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

describe('ObservationMasker', () => {
  let masker: ObservationMasker;
  let tempDir: string;

  beforeEach(async () => {
    // Create a temp directory for each test
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'observation-masker-test-'));
    masker = new ObservationMasker(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Token Estimation Tests (T003)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('estimateTokens', () => {
    it('should estimate tokens based on character count (4 chars ≈ 1 token)', () => {
      expect(masker.estimateTokens('hello')).toBe(2); // 5 chars / 4 = 1.25 → 2
      expect(masker.estimateTokens('hello world')).toBe(3); // 11 chars / 4 = 2.75 → 3
      expect(masker.estimateTokens('a'.repeat(100))).toBe(25); // 100 / 4 = 25
    });

    it('should return 0 for empty content', () => {
      expect(masker.estimateTokens('')).toBe(0);
    });

    it('should handle undefined/null-like content', () => {
      expect(masker.estimateTokens(null as unknown as string)).toBe(0);
      expect(masker.estimateTokens(undefined as unknown as string)).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Observation Tracking Tests (T002)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('trackObservation', () => {
    it('should track an observation and return its ID', () => {
      const input: TrackObservationInput = {
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: 'const x = 1;',
        metadata: { filePath: 'test.ts' },
      };

      const id = masker.trackObservation(input);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(36); // UUID v4 length
    });

    it('should store observation with calculated hash and token estimate', () => {
      const content = 'function hello() { return "world"; }';
      const input: TrackObservationInput = {
        timestamp: Date.now(),
        turnNumber: 5,
        type: 'file_read',
        originalContent: content,
      };

      const id = masker.trackObservation(input);
      const observation = masker.getObservation(id);

      expect(observation).not.toBeNull();
      expect(observation!.contentHash).toBeDefined();
      expect(observation!.contentHash.length).toBe(64); // SHA-256 hex
      expect(observation!.tokenEstimate).toBe(Math.ceil(content.length / 4));
      expect(observation!.masked).toBe(false);
    });
  });

  describe('getObservation', () => {
    it('should return observation by ID', () => {
      const id = masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'command_output',
        originalContent: 'npm run build',
      });

      const observation = masker.getObservation(id);
      expect(observation).not.toBeNull();
      expect(observation!.id).toBe(id);
    });

    it('should return null for non-existent ID', () => {
      const observation = masker.getObservation('non-existent-id');
      expect(observation).toBeNull();
    });
  });

  describe('getAllObservations', () => {
    it('should return all tracked observations', () => {
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: 'content 1',
      });
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 2,
        type: 'command_output',
        originalContent: 'content 2',
      });

      const observations = masker.getAllObservations();
      expect(observations.length).toBe(2);
    });

    it('should return empty array when no observations', () => {
      const observations = masker.getAllObservations();
      expect(observations).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('should remove all observations from cache', () => {
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: 'content',
      });
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 2,
        type: 'file_read',
        originalContent: 'content 2',
      });

      expect(masker.getAllObservations().length).toBe(2);

      masker.clearCache();

      expect(masker.getAllObservations().length).toBe(0);
    });
  });

  describe('pruneCache', () => {
    it('should remove oldest observations when exceeding limit', () => {
      // Add observations with increasing timestamps
      for (let i = 0; i < 5; i++) {
        masker.trackObservation({
          timestamp: Date.now() + i * 1000,
          turnNumber: i,
          type: 'file_read',
          originalContent: `content ${i}`,
        });
      }

      expect(masker.getAllObservations().length).toBe(5);

      const pruned = masker.pruneCache(3);

      expect(pruned).toBe(2);
      expect(masker.getAllObservations().length).toBe(3);
    });

    it('should not prune when under limit', () => {
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: 'content',
      });

      const pruned = masker.pruneCache(10);

      expect(pruned).toBe(0);
      expect(masker.getAllObservations().length).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Masking Tests (T004, T005)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('maskOldObservations', () => {
    it('should mask observations older than threshold', () => {
      const id = masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: 'old content that should be masked',
        metadata: { filePath: 'old.ts' },
      });

      // Current turn is 12, threshold is 10, so turn 1 should be masked
      const result = masker.maskOldObservations(12);

      expect(result.maskedCount).toBe(1);
      expect(result.tokensSaved).toBeGreaterThan(0);
      expect(result.maskedObservations[0].id).toBe(id);

      const observation = masker.getObservation(id);
      expect(observation!.masked).toBe(true);
      expect(observation!.maskedAt).toBeDefined();
    });

    it('should not mask recent observations', () => {
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 5,
        type: 'file_read',
        originalContent: 'recent content',
      });

      // Current turn is 10, threshold is 10, so turn 5 should NOT be masked
      const result = masker.maskOldObservations(10);

      expect(result.maskedCount).toBe(0);
      expect(result.tokensSaved).toBe(0);
    });

    it('should preserve error messages by default', () => {
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'command_output',
        originalContent: 'Error: Something went wrong',
      });

      const result = masker.maskOldObservations(20);

      expect(result.maskedCount).toBe(0); // Should be preserved due to "Error"
    });

    it('should not mask already masked observations', () => {
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: 'content',
      });

      // First masking
      masker.maskOldObservations(15);

      // Second masking should not count already masked
      const result = masker.maskOldObservations(20);

      expect(result.maskedCount).toBe(0);
    });
  });

  describe('generatePlaceholder', () => {
    it('should generate XML-style placeholder with metadata', () => {
      const id = masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: 'const x = 1;',
        metadata: { filePath: 'src/index.ts', lineCount: 10 },
        summary: 'TypeScript index file',
      });

      const observation = masker.getObservation(id)!;
      const placeholder = masker.generatePlaceholder(observation);

      expect(placeholder).toContain(`id="${id}"`);
      expect(placeholder).toContain('type="file_read"');
      expect(placeholder).toContain('file="src/index.ts"');
      expect(placeholder).toContain('lines="10"');
      expect(placeholder).toContain('summary="TypeScript index file"');
      expect(placeholder).toMatch(/^<observation_masked .+ \/>$/);
    });

    it('should handle missing metadata gracefully', () => {
      const id = masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'command_output',
        originalContent: 'output',
      });

      const observation = masker.getObservation(id)!;
      const placeholder = masker.generatePlaceholder(observation);

      expect(placeholder).toContain(`id="${id}"`);
      expect(placeholder).toContain('type="command_output"');
      expect(placeholder).not.toContain('file=');
    });
  });

  describe('expandObservation', () => {
    it('should return full observation content', () => {
      const content = 'Full content to be expanded';
      const id = masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: content,
      });

      const expanded = masker.expandObservation(id);

      expect(expanded).not.toBeNull();
      expect(expanded!.originalContent).toBe(content);
    });

    it('should return null for non-existent observation', () => {
      const expanded = masker.expandObservation('non-existent-id');
      expect(expanded).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Cache Persistence Tests (T006)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('saveCacheToDisk', () => {
    it('should save cache to disk as JSON', async () => {
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: 'content to persist',
        metadata: { filePath: 'test.ts' },
      });

      await masker.saveCacheToDisk();

      const indexPath = path.join(tempDir, '.specify/memory/observation-cache/index.json');
      const exists = await fs.promises
        .access(indexPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);

      const content = await fs.promises.readFile(indexPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe(1);
      expect(parsed.observations.length).toBe(1);
      expect(parsed.observations[0].originalContent).toBe('content to persist');
    });
  });

  describe('loadCacheFromDisk', () => {
    it('should load cache from disk', async () => {
      // First, save some observations
      const originalContent = 'original content from disk';
      const id = masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 5,
        type: 'search_result',
        originalContent,
      });

      await masker.saveCacheToDisk();

      // Create a new masker and load from disk
      const newMasker = new ObservationMasker(tempDir);
      await newMasker.loadCacheFromDisk();

      const observation = newMasker.getObservation(id);

      expect(observation).not.toBeNull();
      expect(observation!.originalContent).toBe(originalContent);
      expect(observation!.turnNumber).toBe(5);
      expect(observation!.type).toBe('search_result');
    });

    it('should handle missing cache file gracefully', async () => {
      const newMasker = new ObservationMasker(tempDir);

      // Should not throw
      await expect(newMasker.loadCacheFromDisk()).resolves.not.toThrow();
      expect(newMasker.getAllObservations().length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Configuration Tests (T001)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('configuration', () => {
    it('should use default config values', () => {
      const config = masker.getConfig();

      expect(config.ageThresholdTurns).toBe(10);
      expect(config.preserveErrorMessages).toBe(true);
      expect(config.maxCacheSize).toBe(100);
    });

    it('should accept partial config in constructor', () => {
      const customMasker = new ObservationMasker(tempDir, {
        ageThresholdTurns: 5,
        maxCacheSize: 50,
      });

      const config = customMasker.getConfig();

      expect(config.ageThresholdTurns).toBe(5);
      expect(config.maxCacheSize).toBe(50);
      expect(config.preserveErrorMessages).toBe(true); // Default
    });

    it('should update config dynamically', () => {
      masker.updateConfig({ ageThresholdTurns: 20 });

      const config = masker.getConfig();
      expect(config.ageThresholdTurns).toBe(20);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Statistics Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: 'content 1', // ~3 tokens
      });
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 12, // Recent turn - should NOT be masked
        type: 'file_read',
        originalContent: 'content 2', // ~3 tokens
      });

      // Mask only observations older than 10 turns from turn 15
      // Turn 1 is 14 turns old -> masked
      // Turn 12 is 3 turns old -> not masked
      masker.maskOldObservations(15);

      const stats = masker.getStats();

      expect(stats.totalObservations).toBe(2);
      expect(stats.maskedObservations).toBe(1);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.maskedTokens).toBeGreaterThan(0);
      expect(stats.maskedTokens).toBeLessThan(stats.totalTokens);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Auto-Pruning Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('auto-pruning', () => {
    it('should auto-prune when cache exceeds maxCacheSize', () => {
      const smallMasker = new ObservationMasker(tempDir, { maxCacheSize: 3 });

      // Add 5 observations (exceeds limit of 3)
      for (let i = 0; i < 5; i++) {
        smallMasker.trackObservation({
          timestamp: Date.now() + i * 1000,
          turnNumber: i,
          type: 'file_read',
          originalContent: `content ${i}`,
        });
      }

      // Should have auto-pruned to stay under maxCacheSize
      const observations = smallMasker.getAllObservations();
      expect(observations.length).toBeLessThanOrEqual(3);
    });
  });
});
