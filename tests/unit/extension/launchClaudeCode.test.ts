import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * T033-T035: Structural tests for Claude Code context injection.
 *
 * Cannot dynamically import autonomousCommands.ts due to node-pty native
 * module compilation mismatch in test environment. These tests validate
 * the code structure instead.
 */
describe('launchClaudeCode context injection (T033-T035)', () => {
  const filePath = path.resolve(__dirname, '../../../extension/src/autonomousCommands.ts');
  const source = fs.readFileSync(filePath, 'utf-8');

  it('T033: context build runs before pty.spawn', () => {
    // Verify ContextBridgeWriter import and usage appears BEFORE pty.spawn
    const bridgeIdx = source.indexOf('ContextBridgeWriter');
    const spawnIdx = source.indexOf("pty.spawn('claude'");

    expect(bridgeIdx).toBeGreaterThan(0);
    expect(spawnIdx).toBeGreaterThan(0);
    expect(bridgeIdx).toBeLessThan(spawnIdx);
  });

  it('T033: writes enriched context via ContextBridgeWriter', () => {
    expect(source).toContain('bridgeWriter.writeEnrichedContext(');
    expect(source).toContain('new ContextBridgeWriter(sharedContextBuilder, workspacePath)');
  });

  it('T034: launch proceeds if context build fails (try/catch)', () => {
    // The context build is wrapped in try/catch
    // Verify the catch block contains non-fatal messaging
    expect(source).toContain('Context enrichment skipped');
    expect(source).toContain('console.warn');
  });

  it('T035: launch has 500ms timeout for context build', () => {
    expect(source).toContain('Context build timeout');
    expect(source).toContain('500');
    expect(source).toContain('Promise.race');
  });

  it('should only build context when sharedContextBuilder is available', () => {
    expect(source).toContain('if (sharedContextBuilder)');
  });
});
