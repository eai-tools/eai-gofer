/**
 * ConfigLoader Unit Tests
 *
 * Tests for the council configuration loader which parses YAML config files
 * and returns CouncilConfig objects with sensible defaults.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ConfigLoader,
  parseYamlConfig,
  validateConfig,
} from '../../../extension/src/council/ConfigLoader';
import { CouncilConfig, DEFAULT_COUNCIL_CONFIG } from '../../../extension/src/council/types';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('ConfigLoader', () => {
  const mockWorkspacePath = '/mock/workspace';
  const configPath = path.join(mockWorkspacePath, '.specify', 'memory', 'council-config.yaml');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadConfig', () => {
    it('should return default config when file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const loader = new ConfigLoader(mockWorkspacePath);
      const config = await loader.loadConfig();

      expect(config).toEqual(DEFAULT_COUNCIL_CONFIG);
      expect(fs.existsSync).toHaveBeenCalledWith(configPath);
    });

    it('should parse valid YAML config file', async () => {
      const yamlContent = `
council:
  enabled: true
  peer_review: true
  min_quorum: 3
  timeout: 45000
  providers:
    anthropic:
      enabled: true
      model: claude-opus-4-5-20251101
    google:
      enabled: true
      model: gemini-3-flash-preview
    openai:
      enabled: true
      model: gpt-5.2
  stages:
    gofer_plan: council
    gofer_analyze: council
    research_codebase: single
    validate_plan: council
    implement: single
`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

      const loader = new ConfigLoader(mockWorkspacePath);
      const config = await loader.loadConfig();

      expect(config.enabled).toBe(true);
      expect(config.peerReview).toBe(true);
      expect(config.minQuorum).toBe(3);
      expect(config.timeout).toBe(45000);
      expect(config.providers).toHaveLength(3);
      expect(config.stages.gofer_plan).toBe('council');
      expect(config.stages.research_codebase).toBe('single');
    });

    it('should merge with defaults for missing fields', async () => {
      const partialYaml = `
council:
  enabled: true
`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(partialYaml);

      const loader = new ConfigLoader(mockWorkspacePath);
      const config = await loader.loadConfig();

      expect(config.enabled).toBe(true);
      expect(config.peerReview).toBe(DEFAULT_COUNCIL_CONFIG.peerReview);
      expect(config.minQuorum).toBe(DEFAULT_COUNCIL_CONFIG.minQuorum);
      expect(config.timeout).toBe(DEFAULT_COUNCIL_CONFIG.timeout);
    });

    it('should return default config on YAML parse error', async () => {
      const invalidYaml = `
council:
  enabled: true
  invalid: [unclosed
`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(invalidYaml);

      const loader = new ConfigLoader(mockWorkspacePath);
      const config = await loader.loadConfig();

      // Should fall back to defaults on parse error
      expect(config).toEqual(DEFAULT_COUNCIL_CONFIG);
    });

    it('should cache config after first load', async () => {
      const yamlContent = `
council:
  enabled: true
`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

      const loader = new ConfigLoader(mockWorkspacePath);

      // First load
      await loader.loadConfig();
      // Second load (should use cache)
      await loader.loadConfig();

      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should reload config when invalidateCache is called', async () => {
      const yamlContent = `
council:
  enabled: true
`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

      const loader = new ConfigLoader(mockWorkspacePath);

      await loader.loadConfig();
      loader.invalidateCache();
      await loader.loadConfig();

      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('parseYamlConfig', () => {
    it('should parse providers from object format', () => {
      const yaml = `
council:
  providers:
    anthropic:
      enabled: true
      model: claude-opus-4-5-20251101
    google:
      enabled: false
`;

      const config = parseYamlConfig(yaml);

      expect(config.providers).toHaveLength(2);
      expect(config.providers[0].providerId).toBe('anthropic');
      expect(config.providers[0].enabled).toBe(true);
      expect(config.providers[1].providerId).toBe('google');
      expect(config.providers[1].enabled).toBe(false);
    });

    it('should parse stages correctly', () => {
      const yaml = `
council:
  stages:
    gofer_plan: council
    gofer_analyze: single
    custom_stage: council
`;

      const config = parseYamlConfig(yaml);

      expect(config.stages.gofer_plan).toBe('council');
      expect(config.stages.gofer_analyze).toBe('single');
      expect(config.stages.custom_stage).toBe('council');
    });

    it('should handle snake_case to camelCase conversion', () => {
      const yaml = `
council:
  peer_review: true
  min_quorum: 3
`;

      const config = parseYamlConfig(yaml);

      expect(config.peerReview).toBe(true);
      expect(config.minQuorum).toBe(3);
    });
  });

  describe('validateConfig', () => {
    it('should validate minQuorum is within valid range', () => {
      const config: CouncilConfig = {
        ...DEFAULT_COUNCIL_CONFIG,
        minQuorum: 1, // Invalid: too low
      };

      const validated = validateConfig(config);

      expect(validated.minQuorum).toBe(2); // Should be clamped to minimum
    });

    it('should validate minQuorum max limit', () => {
      const config: CouncilConfig = {
        ...DEFAULT_COUNCIL_CONFIG,
        minQuorum: 10, // Invalid: too high
      };

      const validated = validateConfig(config);

      expect(validated.minQuorum).toBe(4); // Should be clamped to maximum
    });

    it('should validate timeout minimum', () => {
      const config: CouncilConfig = {
        ...DEFAULT_COUNCIL_CONFIG,
        timeout: 1000, // Invalid: too low
      };

      const validated = validateConfig(config);

      expect(validated.timeout).toBe(5000); // Should be clamped to minimum
    });

    it('should validate timeout maximum', () => {
      const config: CouncilConfig = {
        ...DEFAULT_COUNCIL_CONFIG,
        timeout: 200000, // Invalid: too high
      };

      const validated = validateConfig(config);

      expect(validated.timeout).toBe(120000); // Should be clamped to maximum
    });

    it('should require 3+ providers for peer review', () => {
      const config: CouncilConfig = {
        ...DEFAULT_COUNCIL_CONFIG,
        peerReview: true,
        providers: [
          { providerId: 'anthropic', enabled: true },
          { providerId: 'google', enabled: true },
        ],
      };

      const validated = validateConfig(config);

      // Should disable peer review if less than 3 providers
      expect(validated.peerReview).toBe(false);
    });

    it('should allow peer review with 3+ providers', () => {
      const config: CouncilConfig = {
        ...DEFAULT_COUNCIL_CONFIG,
        peerReview: true,
        providers: [
          { providerId: 'anthropic', enabled: true },
          { providerId: 'google', enabled: true },
          { providerId: 'openai', enabled: true },
        ],
      };

      const validated = validateConfig(config);

      expect(validated.peerReview).toBe(true);
    });

    it('should filter out invalid provider IDs', () => {
      const config: CouncilConfig = {
        ...DEFAULT_COUNCIL_CONFIG,
        providers: [
          { providerId: 'anthropic' as never, enabled: true },
          { providerId: 'invalid-provider' as never, enabled: true },
          { providerId: 'google' as never, enabled: true },
        ],
      };

      const validated = validateConfig(config);

      expect(validated.providers).toHaveLength(2);
      expect(validated.providers.map((p) => p.providerId)).toEqual(['anthropic', 'google']);
    });

    it('should normalize stage values to valid modes', () => {
      const config: CouncilConfig = {
        ...DEFAULT_COUNCIL_CONFIG,
        stages: {
          gofer_plan: 'council',
          gofer_analyze: 'invalid' as never,
          research_codebase: 'single',
          validate_plan: 'council',
          implement: 'single',
        },
      };

      const validated = validateConfig(config);

      expect(validated.stages.gofer_analyze).toBe('single'); // Invalid should default to 'single'
    });
  });

  describe('getConfigPath', () => {
    it('should return correct config path', () => {
      const loader = new ConfigLoader(mockWorkspacePath);
      const configPathResult = loader.getConfigPath();

      expect(configPathResult).toBe(configPath);
    });
  });

  describe('shouldUseCouncil', () => {
    it('should return true when stage is configured for council', async () => {
      const yamlContent = `
council:
  enabled: true
  stages:
    gofer_plan: council
`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

      const loader = new ConfigLoader(mockWorkspacePath);
      await loader.loadConfig();

      expect(loader.shouldUseCouncil('gofer_plan')).toBe(true);
    });

    it('should return false when stage is configured for single', async () => {
      const yamlContent = `
council:
  enabled: true
  stages:
    implement: single
`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

      const loader = new ConfigLoader(mockWorkspacePath);
      await loader.loadConfig();

      expect(loader.shouldUseCouncil('implement')).toBe(false);
    });

    it('should return false when council is globally disabled', async () => {
      const yamlContent = `
council:
  enabled: false
  stages:
    gofer_plan: council
`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

      const loader = new ConfigLoader(mockWorkspacePath);
      await loader.loadConfig();

      expect(loader.shouldUseCouncil('gofer_plan')).toBe(false);
    });

    it('should return false for unknown stages', async () => {
      const yamlContent = `
council:
  enabled: true
`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

      const loader = new ConfigLoader(mockWorkspacePath);
      await loader.loadConfig();

      expect(loader.shouldUseCouncil('unknown_stage')).toBe(false);
    });
  });
});
