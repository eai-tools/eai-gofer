/**
 * Unit tests for GoferURI parser and resolver
 * Feature 029: Memory System v2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseGoferURI,
  formatGoferURI,
  GoferURIResolver,
  type GoferURI,
} from '../../../extension/src/autonomous/memory/GoferURI';
import * as path from 'path';
import * as os from 'os';

describe.skip('GoferURI Parser', () => {
  describe('parseGoferURI', () => {
    it('should parse simple memory URI', () => {
      const result = parseGoferURI('gofer://memory/core/task-context.md');

      expect(result).toEqual({
        scheme: 'gofer',
        scope: 'memory',
        path: 'core/task-context.md',
        fragment: undefined,
      });
    });

    it('should parse specs URI with subdirectory', () => {
      const result = parseGoferURI('gofer://specs/029-memory-system-v2/spec.md');

      expect(result).toEqual({
        scheme: 'gofer',
        scope: 'specs',
        path: '029-memory-system-v2/spec.md',
        fragment: undefined,
      });
    });

    it('should parse URI with fragment anchor', () => {
      const result = parseGoferURI('gofer://specs/029-memory-system-v2/spec.md#requirements');

      expect(result).toEqual({
        scheme: 'gofer',
        scope: 'specs',
        path: '029-memory-system-v2/spec.md',
        fragment: 'requirements',
      });
    });

    it('should parse all valid scopes', () => {
      const scopes: Array<GoferURI['scope']> = ['specs', 'memory', 'agent', 'session', 'user'];

      for (const scope of scopes) {
        const result = parseGoferURI(`gofer://\${scope}/test.md`);
        expect(result.scope).toBe(scope);
      }
    });

    it('should reject invalid scheme', () => {
      expect(() => parseGoferURI('http://memory/test.md')).toThrow(
        "Invalid URI scheme: expected 'gofer://'"
      );

      expect(() => parseGoferURI('file:///memory/test.md')).toThrow(
        "Invalid URI scheme: expected 'gofer://'"
      );
    });

    it('should reject invalid scope', () => {
      expect(() => parseGoferURI('gofer://invalid/test.md')).toThrow(
        "Invalid scope 'invalid'"
      );
    });

    it('should reject URI without path', () => {
      expect(() => parseGoferURI('gofer://memory')).toThrow(
        'Invalid URI format: missing path'
      );
    });
  });

  describe('formatGoferURI', () => {
    it('should format URI without fragment', () => {
      const uri: GoferURI = {
        scheme: 'gofer',
        scope: 'memory',
        path: 'core/task-context.md',
      };

      expect(formatGoferURI(uri)).toBe('gofer://memory/core/task-context.md');
    });

    it('should format URI with fragment', () => {
      const uri: GoferURI = {
        scheme: 'gofer',
        scope: 'specs',
        path: '029-memory-system-v2/spec.md',
        fragment: 'requirements',
      };

      expect(formatGoferURI(uri)).toBe('gofer://specs/029-memory-system-v2/spec.md#requirements');
    });

    it('should round-trip parse and format', () => {
      const original = 'gofer://agent/validation-security.md#examples';
      const parsed = parseGoferURI(original);
      const formatted = formatGoferURI(parsed);

      expect(formatted).toBe(original);
    });
  });
});

describe('GoferURIResolver', () => {
  let resolver: GoferURIResolver;
  const workspaceRoot = '/Users/test/Code/gofer';
  const userHome = os.homedir();

  beforeEach(() => {
    resolver = new GoferURIResolver(workspaceRoot, userHome);
  });

  describe('resolve', () => {
    it('should resolve specs scope to .specify/specs/', () => {
      const uri = 'gofer://specs/029-memory-system-v2/spec.md';
      const resolved = resolver.resolve(uri);

      expect(resolved).toBe(
        path.join(workspaceRoot, '.specify/specs/029-memory-system-v2/spec.md')
      );
    });

    it('should resolve memory scope to .specify/memory/', () => {
      const uri = 'gofer://memory/core/task-context.md';
      const resolved = resolver.resolve(uri);

      expect(resolved).toBe(
        path.join(workspaceRoot, '.specify/memory/core/task-context.md')
      );
    });

    it('should resolve agent scope to .claude/agents/', () => {
      const uri = 'gofer://agent/validation-security.md';
      const resolved = resolver.resolve(uri);

      expect(resolved).toBe(
        path.join(workspaceRoot, '.claude/agents/validation-security.md')
      );
    });

    it('should resolve session scope to .specify/specs/', () => {
      const uri = 'gofer://session/029-memory-system-v2/tasks.md';
      const resolved = resolver.resolve(uri);

      expect(resolved).toBe(
        path.join(workspaceRoot, '.specify/specs/029-memory-system-v2/tasks.md')
      );
    });

    it('should resolve user scope to ~/.claude/projects/memory/', () => {
      const uri = 'gofer://user/global-patterns.md';
      const resolved = resolver.resolve(uri);

      expect(resolved).toBe(
        path.join(userHome, '.claude/projects/memory/global-patterns.md')
      );
    });

    it('should accept GoferURI object', () => {
      const uri: GoferURI = {
        scheme: 'gofer',
        scope: 'memory',
        path: 'test.md',
      };

      const resolved = resolver.resolve(uri);
      expect(resolved).toBe(
        path.join(workspaceRoot, '.specify/memory/test.md')
      );
    });
  });

  describe('Path Traversal Prevention (FR-002 Security)', () => {
    it('should block path traversal with ../', () => {
      const uri = 'gofer://memory/../../../etc/passwd';

      expect(() => resolver.resolve(uri)).toThrow(
        "Path traversal detected: '../../../etc/passwd' escapes scope 'memory'"
      );
    });

    it('should block path traversal with absolute paths', () => {
      const uri = 'gofer://memory//etc/passwd';

      // Normalize will remove duplicate slashes, but should still detect escape
      expect(() => resolver.resolve(uri)).toThrow('Path traversal detected');
    });

    it('should allow legitimate subdirectories', () => {
      const uri = 'gofer://memory/validation/patterns/security.md';
      const resolved = resolver.resolve(uri);

      expect(resolved).toBe(
        path.join(workspaceRoot, '.specify/memory/validation/patterns/security.md')
      );
    });

    it('should block encoded path traversal', () => {
      // URL-encoded '../' is '%2e%2e%2f'
      const uri = 'gofer://memory/%2e%2e/%2e%2e/etc/passwd';

      // After path.join and normalize, this should be detected
      expect(() => resolver.resolve(uri)).toThrow('Path traversal detected');
    });
  });

  describe('getScopePath', () => {
    it('should return base path for each scope', () => {
      expect(resolver.getScopePath('specs')).toBe(
        path.join(workspaceRoot, '.specify/specs')
      );

      expect(resolver.getScopePath('memory')).toBe(
        path.join(workspaceRoot, '.specify/memory')
      );

      expect(resolver.getScopePath('agent')).toBe(
        path.join(workspaceRoot, '.claude/agents')
      );

      expect(resolver.getScopePath('user')).toBe(
        path.join(userHome, '.claude/projects/memory')
      );
    });

    it('should throw on invalid scope', () => {
      expect(() => resolver.getScopePath('invalid' as any)).toThrow(
        'Unknown scope: invalid'
      );
    });
  });
});
