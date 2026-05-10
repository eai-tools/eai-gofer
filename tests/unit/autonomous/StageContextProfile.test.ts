/**
 * Unit tests for StageContextProfile and StageContextProfileLoader
 *
 * Tests YAML parsing, validation, profile loading, and default values.
 *
 * @see .specify/specs/011-context-health-recursive-memory/tasks.md T034-T037
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock Logger
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

import {
  type GoferStage,
  type StageContextProfile,
  GOFER_STAGES,
  isValidGoferStage,
  validateProfile,
  calculateBudgetSummary,
  getDefaultProfile,
  DEFAULT_PROFILES,
} from '../../../extension/src/autonomous/StageContextProfile';

import { StageContextProfileLoader } from '../../../extension/src/autonomous/StageContextProfileLoader';

// ─────────────────────────────────────────────────────────────────────────────
// StageContextProfile Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('StageContextProfile', () => {
  describe('GoferStage validation', () => {
    it('should validate all valid stages', () => {
      const validStages = ['research', 'specify', 'plan', 'tasks', 'implement', 'validate'];
      for (const stage of validStages) {
        expect(isValidGoferStage(stage)).toBe(true);
      }
    });

    it('should reject invalid stages', () => {
      expect(isValidGoferStage('invalid')).toBe(false);
      expect(isValidGoferStage('')).toBe(false);
      expect(isValidGoferStage('RESEARCH')).toBe(false); // case sensitive
    });

    it('should have correct number of stages', () => {
      expect(GOFER_STAGES.length).toBe(6);
    });
  });

  describe('profile validation', () => {
    it('should validate a correct profile', () => {
      const profile: StageContextProfile = {
        stage: 'implement',
        researchBudget: 0.1,
        memoryBudget: 0.15,
        codeBudget: 0.45,
        observationWindow: 10,
      };

      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid stage', () => {
      const profile = {
        stage: 'invalid' as GoferStage,
        researchBudget: 0.1,
        memoryBudget: 0.15,
        codeBudget: 0.45,
        observationWindow: 10,
      };

      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid stage'))).toBe(true);
    });

    it('should reject budget fractions > 1', () => {
      const profile: StageContextProfile = {
        stage: 'implement',
        researchBudget: 1.5,
        memoryBudget: 0.15,
        codeBudget: 0.45,
        observationWindow: 10,
      };

      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('researchBudget'))).toBe(true);
    });

    it('should reject budget fractions < 0', () => {
      const profile: StageContextProfile = {
        stage: 'implement',
        researchBudget: -0.1,
        memoryBudget: 0.15,
        codeBudget: 0.45,
        observationWindow: 10,
      };

      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('researchBudget'))).toBe(true);
    });

    it('should reject budget sum > 1.0', () => {
      const profile: StageContextProfile = {
        stage: 'implement',
        researchBudget: 0.4,
        memoryBudget: 0.4,
        codeBudget: 0.4,
        observationWindow: 10,
      };

      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Budget sum exceeds'))).toBe(true);
    });

    it('should warn when budget sum is high', () => {
      const profile: StageContextProfile = {
        stage: 'implement',
        researchBudget: 0.3,
        memoryBudget: 0.3,
        codeBudget: 0.3,
        observationWindow: 10,
      };

      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('Budget sum is high'))).toBe(true);
    });

    it('should reject non-integer observation window', () => {
      const profile: StageContextProfile = {
        stage: 'implement',
        researchBudget: 0.1,
        memoryBudget: 0.15,
        codeBudget: 0.45,
        observationWindow: 10.5,
      };

      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('observationWindow'))).toBe(true);
    });

    it('should reject observation window < 1', () => {
      const profile: StageContextProfile = {
        stage: 'implement',
        researchBudget: 0.1,
        memoryBudget: 0.15,
        codeBudget: 0.45,
        observationWindow: 0,
      };

      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('observationWindow'))).toBe(true);
    });

    it('should reject observation window > 50', () => {
      const profile: StageContextProfile = {
        stage: 'implement',
        researchBudget: 0.1,
        memoryBudget: 0.15,
        codeBudget: 0.45,
        observationWindow: 100,
      };

      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('observationWindow'))).toBe(true);
    });
  });

  describe('budget summary calculation', () => {
    it('should calculate total allocated budget', () => {
      const profile: StageContextProfile = {
        stage: 'implement',
        researchBudget: 0.1,
        memoryBudget: 0.15,
        codeBudget: 0.45,
        observationWindow: 10,
      };

      const summary = calculateBudgetSummary(profile);
      expect(summary.totalAllocated).toBeCloseTo(0.7, 2);
      expect(summary.conversationBudget).toBeCloseTo(0.3, 2);
    });

    it('should handle budget exactly 1.0', () => {
      const profile: StageContextProfile = {
        stage: 'implement',
        researchBudget: 0.3,
        memoryBudget: 0.3,
        codeBudget: 0.4,
        observationWindow: 10,
      };

      const summary = calculateBudgetSummary(profile);
      expect(summary.totalAllocated).toBeCloseTo(1.0, 2);
      expect(summary.conversationBudget).toBeCloseTo(0, 2);
    });

    it('should return individual allocations', () => {
      const profile: StageContextProfile = {
        stage: 'implement',
        researchBudget: 0.1,
        memoryBudget: 0.15,
        codeBudget: 0.45,
        observationWindow: 10,
      };

      const summary = calculateBudgetSummary(profile);
      expect(summary.allocations.research).toBe(0.1);
      expect(summary.allocations.memory).toBe(0.15);
      expect(summary.allocations.code).toBe(0.45);
    });
  });

  describe('default profiles', () => {
    it('should have defaults for all stages', () => {
      for (const stage of GOFER_STAGES) {
        const profile = getDefaultProfile(stage);
        expect(profile).toBeDefined();
        expect(profile.stage).toBe(stage);
      }
    });

    it('should have valid defaults', () => {
      for (const stage of GOFER_STAGES) {
        const profile = getDefaultProfile(stage);
        const result = validateProfile(profile);
        expect(result.valid).toBe(true);
      }
    });

    it('should have different budgets per stage', () => {
      const researchProfile = DEFAULT_PROFILES.research;
      const implementProfile = DEFAULT_PROFILES.implement;

      expect(researchProfile.codeBudget).not.toBe(implementProfile.codeBudget);
      expect(researchProfile.researchBudget).not.toBe(implementProfile.researchBudget);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// StageContextProfileLoader Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('StageContextProfileLoader', () => {
  let tempDir: string;
  let loader: StageContextProfileLoader;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'profile-loader-test-'));
    loader = new StageContextProfileLoader(tempDir);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe('configuration', () => {
    it('should use default config path', () => {
      expect(loader.getConfigPath()).toBe(
        path.join(tempDir, '.specify/memory/context-profiles.yaml')
      );
    });

    it('should accept custom config path', () => {
      const customLoader = new StageContextProfileLoader(tempDir, {
        configPath: 'custom/profiles.yaml',
      });
      expect(customLoader.getConfigPath()).toBe(path.join(tempDir, 'custom/profiles.yaml'));
    });
  });

  describe('loading profiles', () => {
    it('should use defaults when config file is missing', async () => {
      const result = await loader.loadProfiles();

      expect(result.usedDefaults).toBe(true);
      expect(result.profiles.size).toBe(6);
      expect(result.defaultStage).toBe('implement');
    });

    it('should load profiles from YAML file', async () => {
      // Create config directory and file
      const configDir = path.join(tempDir, '.specify/memory');
      await fs.promises.mkdir(configDir, { recursive: true });

      const yamlContent = `
version: "2.0"
default: research

profiles:
  research:
    stage: research
    description: "Custom research profile"
    researchBudget: 0.20
    memoryBudget: 0.20
    codeBudget: 0.35
    observationWindow: 20

  implement:
    stage: implement
    researchBudget: 0.15
    memoryBudget: 0.20
    codeBudget: 0.40
    observationWindow: 8
`;
      await fs.promises.writeFile(path.join(configDir, 'context-profiles.yaml'), yamlContent);

      const result = await loader.loadProfiles();

      expect(result.usedDefaults).toBe(false);
      expect(result.version).toBe('2.0');
      expect(result.defaultStage).toBe('research');

      const researchProfile = result.profiles.get('research');
      expect(researchProfile?.description).toBe('Custom research profile');
      expect(researchProfile?.codeBudget).toBe(0.35);
      expect(researchProfile?.observationWindow).toBe(20);
    });

    it('should fill missing profiles with defaults', async () => {
      const configDir = path.join(tempDir, '.specify/memory');
      await fs.promises.mkdir(configDir, { recursive: true });

      // Only define one profile
      const yamlContent = `
version: "1.0"
default: implement

profiles:
  implement:
    stage: implement
    researchBudget: 0.15
    memoryBudget: 0.20
    codeBudget: 0.40
    observationWindow: 8
`;
      await fs.promises.writeFile(path.join(configDir, 'context-profiles.yaml'), yamlContent);

      const result = await loader.loadProfiles();

      // Should have all 6 profiles
      expect(result.profiles.size).toBe(6);
      expect(result.warnings.some((w) => w.includes('Missing profile'))).toBe(true);
    });

    it('should use defaults for invalid profiles', async () => {
      const configDir = path.join(tempDir, '.specify/memory');
      await fs.promises.mkdir(configDir, { recursive: true });

      const yamlContent = `
version: "1.0"
default: implement

profiles:
  implement:
    stage: implement
    researchBudget: 2.0  # Invalid - > 1
    memoryBudget: 0.20
    codeBudget: 0.40
    observationWindow: 8
`;
      await fs.promises.writeFile(path.join(configDir, 'context-profiles.yaml'), yamlContent);

      const result = await loader.loadProfiles();

      // Should fall back to default for invalid profile
      const implementProfile = result.profiles.get('implement');
      expect(implementProfile?.researchBudget).toBe(DEFAULT_PROFILES.implement.researchBudget);
      expect(result.warnings.some((w) => w.includes('Invalid profile'))).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache loaded profiles', async () => {
      await loader.loadProfiles();
      expect(loader.isLoaded()).toBe(true);
    });

    it('should return cached profiles on second call', async () => {
      const result1 = await loader.loadProfiles();
      const result2 = await loader.loadProfiles();

      expect(result1.profiles).toBe(result2.profiles);
    });

    it('should force reload when requested', async () => {
      await loader.loadProfiles();

      // Create config file after first load
      const configDir = path.join(tempDir, '.specify/memory');
      await fs.promises.mkdir(configDir, { recursive: true });

      const yamlContent = `
version: "1.1"
default: plan

profiles:
  plan:
    stage: plan
    researchBudget: 0.30
    memoryBudget: 0.30
    codeBudget: 0.20
    observationWindow: 15
`;
      await fs.promises.writeFile(path.join(configDir, 'context-profiles.yaml'), yamlContent);

      const result2 = await loader.loadProfiles(true);

      expect(result2.version).toBe('1.1');
      expect(result2.defaultStage).toBe('plan');
    });

    it('should clear cache', async () => {
      await loader.loadProfiles();
      expect(loader.isLoaded()).toBe(true);

      loader.clearCache();
      expect(loader.isLoaded()).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should return profile for specific stage', async () => {
      const profile = await loader.getProfile('implement');

      expect(profile.stage).toBe('implement');
      expect(profile.codeBudget).toBeDefined();
    });

    it('should return default for unknown stage in cache', () => {
      const profile = loader.getProfileSync('implement');

      expect(profile.stage).toBe('implement');
      expect(profile.codeBudget).toBe(DEFAULT_PROFILES.implement.codeBudget);
    });
  });

  describe('getDefaultProfile', () => {
    it('should return profile for default stage', async () => {
      const profile = await loader.getDefaultProfile();

      expect(profile.stage).toBe('implement'); // Default stage
    });
  });

  describe('getAllProfiles', () => {
    it('should return all profiles', async () => {
      const profiles = await loader.getAllProfiles();

      expect(profiles.size).toBe(6);
      for (const stage of GOFER_STAGES) {
        expect(profiles.has(stage)).toBe(true);
      }
    });
  });

  describe('reload', () => {
    it('should reload profiles from disk', async () => {
      await loader.loadProfiles();

      // Create new config file
      const configDir = path.join(tempDir, '.specify/memory');
      await fs.promises.mkdir(configDir, { recursive: true });

      const yamlContent = `
version: "3.0"
default: validate

profiles:
  validate:
    stage: validate
    researchBudget: 0.25
    memoryBudget: 0.25
    codeBudget: 0.25
    observationWindow: 12
`;
      await fs.promises.writeFile(path.join(configDir, 'context-profiles.yaml'), yamlContent);

      const result = await loader.reload();

      expect(result.version).toBe('3.0');
      expect(result.defaultStage).toBe('validate');
    });
  });

  describe('error handling', () => {
    it('should handle invalid YAML gracefully', async () => {
      const configDir = path.join(tempDir, '.specify/memory');
      await fs.promises.mkdir(configDir, { recursive: true });

      // Write invalid YAML
      await fs.promises.writeFile(
        path.join(configDir, 'context-profiles.yaml'),
        'invalid: yaml: content: ][{'
      );

      // Should use defaults when YAML is invalid
      const loaderNoDefaults = new StageContextProfileLoader(tempDir, {
        useDefaultsOnMissing: true,
      });

      const result = await loaderNoDefaults.loadProfiles();
      expect(result.profiles.size).toBe(6); // Falls back to defaults
    });

    it('should throw when defaults disabled and file missing', async () => {
      const strictLoader = new StageContextProfileLoader(tempDir, {
        useDefaultsOnMissing: false,
      });

      await expect(strictLoader.loadProfiles()).rejects.toThrow();
    });
  });

  describe('last load time', () => {
    it('should track last load time', async () => {
      expect(loader.getLastLoadTime()).toBe(0);

      await loader.loadProfiles();

      expect(loader.getLastLoadTime()).toBeGreaterThan(0);
    });

    it('should reset on cache clear', async () => {
      await loader.loadProfiles();
      expect(loader.getLastLoadTime()).toBeGreaterThan(0);

      loader.clearCache();
      expect(loader.getLastLoadTime()).toBe(0);
    });
  });
});
