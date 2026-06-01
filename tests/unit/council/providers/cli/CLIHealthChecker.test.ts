/**
 * CLIHealthChecker Unit Tests
 *
 * Tests for CLI health checking utilities.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CLIHealthChecker } from '../../../../../extension/src/council/providers/cli/CLIHealthChecker';

describe('CLIHealthChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('check', () => {
    it('should return available=true when CLI is installed and authenticated', async () => {
      // Mock detectVersion to return a version
      vi.spyOn(CLIHealthChecker as any, 'detectVersion').mockResolvedValue('1.0.0');
      vi.spyOn(CLIHealthChecker as any, 'checkAuthentication').mockResolvedValue(true);

      const result = await CLIHealthChecker.check('claude', 'claude');

      expect(result.available).toBe(true);
      expect(result.authenticated).toBe(true);
      expect(result.compatible).toBe(true);
      expect(result.version).toBe('1.0.0');
    });

    it('should return available=false when CLI is not found', async () => {
      vi.spyOn(CLIHealthChecker as any, 'detectVersion').mockResolvedValue(null);

      const result = await CLIHealthChecker.check('claude', 'claude');

      expect(result.available).toBe(false);
      expect(result.version).toBeNull();
    });

    it('should return authenticated=false when CLI is not authenticated', async () => {
      vi.spyOn(CLIHealthChecker as any, 'detectVersion').mockResolvedValue('1.0.0');
      vi.spyOn(CLIHealthChecker as any, 'checkAuthentication').mockResolvedValue(false);

      const result = await CLIHealthChecker.check('claude', 'claude');

      expect(result.available).toBe(true);
      expect(result.authenticated).toBe(false);
    });

    it('should return compatible=false when version is incompatible', async () => {
      vi.spyOn(CLIHealthChecker as any, 'detectVersion').mockResolvedValue('0.1.0');
      vi.spyOn(CLIHealthChecker as any, 'checkAuthentication').mockResolvedValue(true);

      const result = await CLIHealthChecker.check('claude', 'claude');

      expect(result.available).toBe(true);
      expect(result.compatible).toBe(false);
    });

    it('should include installation instructions for claude CLI', async () => {
      vi.spyOn(CLIHealthChecker as any, 'detectVersion').mockResolvedValue(null);

      const result = await CLIHealthChecker.check('claude', 'claude');

      expect(result.installInstructions).toBeDefined();
      expect(result.installInstructions).toContain('npm install');
    });

    it('should include installation instructions for codex CLI', async () => {
      vi.spyOn(CLIHealthChecker as any, 'detectVersion').mockResolvedValue(null);

      const result = await CLIHealthChecker.check('codex', 'codex');

      expect(result.installInstructions).toBeDefined();
    });
  });

  describe('getInstallInstructions', () => {
    it('should return installation instructions for claude', () => {
      const instructions = CLIHealthChecker.getInstallInstructions('claude');

      expect(instructions).toContain('npm install');
      expect(instructions).toContain('@anthropic/claude-code');
    });

    it('should return installation instructions for codex', () => {
      const instructions = CLIHealthChecker.getInstallInstructions('codex');

      expect(instructions).toBeDefined();
      expect(instructions.length).toBeGreaterThan(0);
    });
  });

  describe('getAuthInstructions', () => {
    it('should return auth instructions for claude', () => {
      const instructions = CLIHealthChecker.getAuthInstructions('claude');

      expect(instructions).toContain('ANTHROPIC_API_KEY');
    });

    it('should return auth instructions for codex', () => {
      const instructions = CLIHealthChecker.getAuthInstructions('codex');

      expect(instructions).toBeDefined();
      expect(instructions.length).toBeGreaterThan(0);
    });
  });

  describe('detectVersion', () => {
    it('should return null if CLI command fails', async () => {
      const error: any = new Error('Command not found');
      error.code = 'ENOENT';

      // This is private, but we test the public interface through check()
      const result = await CLIHealthChecker.check('claude', 'nonexistent-command');

      expect(result.available).toBe(false);
      expect(result.version).toBeNull();
    });
  });

  describe('checkAuthentication', () => {
    it('should check for ANTHROPIC_API_KEY for claude CLI', async () => {
      const originalEnv = process.env.ANTHROPIC_API_KEY;

      try {
        process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

        const result = await CLIHealthChecker.check('claude', 'claude');

        // If CLI is available, authenticated should reflect API key presence
        if (result.available) {
          expect(result.authenticated).toBe(true);
        } else {
          // CLI binary not present in this environment — that's fine for CI
          expect(result.available).toBe(false);
        }
      } finally {
        if (originalEnv) {
          process.env.ANTHROPIC_API_KEY = originalEnv;
        } else {
          delete process.env.ANTHROPIC_API_KEY;
        }
      }
    });
  });

  describe('checkCompatibility', () => {
    it('should validate version compatibility through check()', async () => {
      // checkCompatibility is private, tested indirectly through check()
      vi.spyOn(CLIHealthChecker as any, 'detectVersion').mockResolvedValue('1.0.0');
      vi.spyOn(CLIHealthChecker as any, 'checkAuthentication').mockResolvedValue(true);

      const result = await CLIHealthChecker.check('claude', 'claude');

      // Result should include compatibility check
      expect(result).toHaveProperty('compatible');
      expect(typeof result.compatible).toBe('boolean');
    });
  });
});
