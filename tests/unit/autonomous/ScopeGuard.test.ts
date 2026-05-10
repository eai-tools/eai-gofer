import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ScopeGuard, ScopeViolationError } from '../../../extension/src/autonomous/ScopeGuard';
import { ToolAuditLogger } from '../../../extension/src/autonomous/ToolAuditLogger';

describe('ScopeGuard', () => {
  let tmpDir: string;
  let guard: ScopeGuard;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-guard-test-'));
    guard = new ScopeGuard(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('enforcement modes', () => {
    beforeEach(() => {
      // Create a spec with protected boundaries
      const specDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
      fs.mkdirSync(specDir, { recursive: true });
      const specContent = `---
id: test
title: Test
status: draft
---

# Test Feature

## Protected Boundaries

- extension/src/extension.ts
- extension/src/config.ts
`;
      fs.writeFileSync(path.join(specDir, 'spec.md'), specContent);
      guard.loadFromSpec(path.join(specDir, 'spec.md'));
    });

    it('should default to warning mode', () => {
      expect(guard.getEnforcementMode()).toBe('warning');
    });

    it('should return pattern in warning mode', () => {
      guard.setEnforcementMode('warning');
      const result = guard.check('extension/src/extension.ts');
      expect(result).toBe('extension/src/extension.ts');
    });

    it('should return pattern in advisory mode', () => {
      guard.setEnforcementMode('advisory');
      const result = guard.check('extension/src/config.ts');
      expect(result).toBe('extension/src/config.ts');
    });

    it('should throw ScopeViolationError in blocking mode', () => {
      guard.setEnforcementMode('blocking');
      expect(() => guard.check('extension/src/extension.ts')).toThrow(ScopeViolationError);
    });

    it('should include filePath and protectedPattern in ScopeViolationError', () => {
      guard.setEnforcementMode('blocking');
      try {
        guard.check('extension/src/extension.ts');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ScopeViolationError);
        const err = e as ScopeViolationError;
        expect(err.filePath).toBe('extension/src/extension.ts');
        expect(err.protectedPattern).toBe('extension/src/extension.ts');
        expect(err.enforcement).toBe('blocking');
      }
    });

    it('should return null for non-protected files', () => {
      const result = guard.check('src/some-other-file.ts');
      expect(result).toBeNull();
    });

    it('should allow mode change via setter', () => {
      guard.setEnforcementMode('blocking');
      expect(guard.getEnforcementMode()).toBe('blocking');
      guard.setEnforcementMode('advisory');
      expect(guard.getEnforcementMode()).toBe('advisory');
    });
  });

  describe('tool audit logging', () => {
    let auditLogger: ToolAuditLogger;

    beforeEach(() => {
      auditLogger = new ToolAuditLogger(tmpDir);
      guard.setToolAuditLogger(auditLogger);
      guard.setAgentName('test-agent');

      const specDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
      fs.mkdirSync(specDir, { recursive: true });
      const specContent = `# Test Feature

## Protected Boundaries

- src/protected.ts
`;
      fs.writeFileSync(path.join(specDir, 'spec.md'), specContent);
      guard.loadFromSpec(path.join(specDir, 'spec.md'));
    });

    it('should create audit entries for violations', async () => {
      guard.check('src/protected.ts');

      // Wait for async audit write
      await new Promise((r) => setTimeout(r, 50));

      const entries = await auditLogger.readLog();
      expect(entries.length).toBeGreaterThanOrEqual(1);
      const warned = entries.find((e) => e.outcome === 'warned');
      expect(warned).toBeDefined();
      expect(warned?.agent).toBe('test-agent');
      expect(warned?.filePath).toBe('src/protected.ts');
    });

    it('should create audit entries for allowed files', async () => {
      guard.check('src/not-protected.ts');

      await new Promise((r) => setTimeout(r, 50));

      const entries = await auditLogger.readLog();
      const allowed = entries.find((e) => e.outcome === 'allowed');
      expect(allowed).toBeDefined();
      expect(allowed?.filePath).toBe('src/not-protected.ts');
    });

    it('should create blocked audit entries in blocking mode', async () => {
      guard.setEnforcementMode('blocking');

      try {
        guard.check('src/protected.ts');
      } catch {
        // Expected
      }

      await new Promise((r) => setTimeout(r, 50));

      const entries = await auditLogger.readLog();
      const blocked = entries.find((e) => e.outcome === 'blocked');
      expect(blocked).toBeDefined();
    });
  });

  describe('violations tracking', () => {
    beforeEach(() => {
      const specDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(
        path.join(specDir, 'spec.md'),
        '# Test\n\n## Protected Boundaries\n\n- src/core.ts\n'
      );
      guard.loadFromSpec(path.join(specDir, 'spec.md'));
    });

    it('should record violations', () => {
      guard.check('src/core.ts');
      const violations = guard.getViolations();
      expect(violations).toHaveLength(1);
      expect(violations[0].file).toBe('src/core.ts');
    });

    it('should reset violations', () => {
      guard.check('src/core.ts');
      expect(guard.getViolations()).toHaveLength(1);
      guard.reset();
      expect(guard.getViolations()).toHaveLength(0);
    });
  });

  describe('loadFromSpec', () => {
    it('should load patterns from spec', () => {
      const specDir = path.join(tmpDir, '.specify', 'specs', 'test');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(
        path.join(specDir, 'spec.md'),
        '# Test\n\n## Protected Boundaries\n\n- foo/bar.ts\n- baz/\n'
      );
      guard.loadFromSpec(path.join(specDir, 'spec.md'));
      expect(guard.getProtectedPatterns()).toContain('foo/bar.ts');
      expect(guard.getProtectedPatterns()).toContain('baz/');
    });

    it('should handle missing spec gracefully', () => {
      guard.loadFromSpec('/nonexistent/spec.md');
      expect(guard.getProtectedPatterns()).toHaveLength(0);
    });
  });
});
