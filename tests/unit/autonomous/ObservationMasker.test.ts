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
import * as crypto from 'crypto';
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
  // Manifest Persistence Tests (T021)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('saveManifest', () => {
    it('should write JSONL manifest with correct hashes', () => {
      // Create a real file so we can verify hash
      const testFilePath = path.join(tempDir, 'src', 'example.ts');
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
      const fileContent = 'export const greeting = "hello";';
      fs.writeFileSync(testFilePath, fileContent, 'utf-8');

      // Track observation with filePath metadata
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: fileContent,
        metadata: { filePath: testFilePath },
        summary: 'Greeting module',
      });

      const manifestPath = path.join(tempDir, 'manifest-test.jsonl');
      masker.saveManifest(manifestPath);

      // Verify file exists and contains JSONL
      const content = fs.readFileSync(manifestPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(1);

      const entry = JSON.parse(lines[0]);
      expect(entry.filePath).toBe(testFilePath);
      expect(entry.contentHash).toBeDefined();
      expect(entry.contentHash.length).toBe(64); // SHA-256 hex
      expect(entry.summary).toBe('Greeting module');
      expect(entry.tokenEstimate).toBeGreaterThan(0);
      expect(entry.turnNumber).toBe(1);
      expect(entry.type).toBe('file_read');
    });

    it('should only persist observations with filePath metadata', () => {
      // Track one with filePath and one without
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'file_read',
        originalContent: 'file content',
        metadata: { filePath: '/some/file.ts' },
      });
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 2,
        type: 'command_output',
        originalContent: 'npm run build output',
        // No filePath metadata
      });

      const manifestPath = path.join(tempDir, 'manifest-filter-test.jsonl');
      masker.saveManifest(manifestPath);

      const content = fs.readFileSync(manifestPath, 'utf-8');
      const lines = content
        .trim()
        .split('\n')
        .filter((l) => l.length > 0);
      expect(lines.length).toBe(1); // Only the file_read with filePath
    });

    it('should write empty file when no eligible observations', () => {
      masker.trackObservation({
        timestamp: Date.now(),
        turnNumber: 1,
        type: 'command_output',
        originalContent: 'output without file path',
      });

      const manifestPath = path.join(tempDir, 'manifest-empty-test.jsonl');
      masker.saveManifest(manifestPath);

      const content = fs.readFileSync(manifestPath, 'utf-8');
      expect(content).toBe('');
    });
  });

  describe('loadManifest', () => {
    it('should restore valid entries with matching hashes', () => {
      // Create a real file
      const testFilePath = path.join(tempDir, 'src', 'valid.ts');
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
      const fileContent = 'const valid = true;';
      fs.writeFileSync(testFilePath, fileContent, 'utf-8');

      // Compute the expected hash
      const expectedHash = crypto.createHash('sha256').update(fileContent).digest('hex');

      // Write a manifest entry directly
      const manifestPath = path.join(tempDir, 'manifest-load-test.jsonl');
      const entry = {
        filePath: testFilePath,
        contentHash: expectedHash,
        summary: 'Valid file',
        tokenEstimate: 5,
        turnNumber: 3,
        timestamp: Date.now() - 10000, // Older than file mtime to trigger hash check
        type: 'file_read',
      };
      fs.writeFileSync(manifestPath, JSON.stringify(entry) + '\n', 'utf-8');

      const result = masker.loadManifest(manifestPath);

      expect(result.restored).toBe(1);
      expect(result.stale).toBe(0);
      expect(result.missing).toBe(0);

      // Verify observation was added to cache
      const observations = masker.getAllObservations();
      expect(observations.length).toBe(1);
      expect(observations[0].masked).toBe(true);
      expect(observations[0].type).toBe('file_read');
    });

    it('should discard entries for missing files', () => {
      const manifestPath = path.join(tempDir, 'manifest-missing-test.jsonl');
      const entry = {
        filePath: path.join(tempDir, 'nonexistent', 'file.ts'),
        contentHash: 'abc123',
        tokenEstimate: 10,
        turnNumber: 1,
        timestamp: Date.now(),
        type: 'file_read',
      };
      fs.writeFileSync(manifestPath, JSON.stringify(entry) + '\n', 'utf-8');

      const result = masker.loadManifest(manifestPath);

      expect(result.restored).toBe(0);
      expect(result.missing).toBe(1);
      expect(result.stale).toBe(0);
    });

    it('should discard stale entries when file content changed', () => {
      // Create a file with original content
      const testFilePath = path.join(tempDir, 'src', 'stale.ts');
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
      const originalContent = 'const original = 1;';
      fs.writeFileSync(testFilePath, originalContent, 'utf-8');

      // Hash of OLD content (different from current)
      const oldHash = crypto.createHash('sha256').update('const old = 0;').digest('hex');

      const manifestPath = path.join(tempDir, 'manifest-stale-test.jsonl');
      const entry = {
        filePath: testFilePath,
        contentHash: oldHash,
        tokenEstimate: 5,
        turnNumber: 2,
        timestamp: Date.now() - 100000, // Older than file mtime
        type: 'file_read',
      };
      fs.writeFileSync(manifestPath, JSON.stringify(entry) + '\n', 'utf-8');

      const result = masker.loadManifest(manifestPath);

      expect(result.restored).toBe(0);
      expect(result.stale).toBe(1);
      expect(result.missing).toBe(0);
    });

    it('should handle missing manifest file gracefully', () => {
      const result = masker.loadManifest(path.join(tempDir, 'nonexistent-manifest.jsonl'));

      expect(result.restored).toBe(0);
      expect(result.stale).toBe(0);
      expect(result.missing).toBe(0);
    });

    it('should skip invalid JSONL lines', () => {
      // Create a valid file for the valid entry
      const testFilePath = path.join(tempDir, 'src', 'valid2.ts');
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
      const fileContent = 'const x = 2;';
      fs.writeFileSync(testFilePath, fileContent, 'utf-8');
      const validHash = crypto.createHash('sha256').update(fileContent).digest('hex');

      const manifestPath = path.join(tempDir, 'manifest-invalid-test.jsonl');
      const validEntry = {
        filePath: testFilePath,
        contentHash: validHash,
        tokenEstimate: 3,
        turnNumber: 1,
        timestamp: Date.now() - 10000,
        type: 'file_read',
      };
      // Write one invalid line followed by one valid line
      fs.writeFileSync(
        manifestPath,
        'not valid json\n' + JSON.stringify(validEntry) + '\n',
        'utf-8'
      );

      const result = masker.loadManifest(manifestPath);

      expect(result.restored).toBe(1); // Only the valid entry
    });

    it('should restore entry when mtime changed but content hash matches', () => {
      // Create file
      const testFilePath = path.join(tempDir, 'src', 'touchonly.ts');
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
      const fileContent = 'const touched = true;';
      fs.writeFileSync(testFilePath, fileContent, 'utf-8');
      const hash = crypto.createHash('sha256').update(fileContent).digest('hex');

      const manifestPath = path.join(tempDir, 'manifest-touch-test.jsonl');
      const entry = {
        filePath: testFilePath,
        contentHash: hash,
        tokenEstimate: 5,
        turnNumber: 4,
        timestamp: Date.now() - 100000, // Older than file mtime
        type: 'file_read',
      };
      fs.writeFileSync(manifestPath, JSON.stringify(entry) + '\n', 'utf-8');

      const result = masker.loadManifest(manifestPath);

      // mtime is newer but hash matches → still valid
      expect(result.restored).toBe(1);
      expect(result.stale).toBe(0);
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
