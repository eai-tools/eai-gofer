import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * T033-T035: Structural tests for Claude Code context injection.
 *
 * UPDATED: PTY-based launch was replaced with normal terminal in feature
 * 001-remove-pty-dependency. Context injection now happens via hooks, not
 * pre-spawn. Tests updated to reflect new architecture.
 */
describe('launchClaudeCode terminal launch (T033-T035)', () => {
  const filePath = path.resolve(__dirname, '../../../extension/src/autonomousCommands.ts');
  const source = fs.readFileSync(filePath, 'utf-8');

  it('T033: uses normal terminal instead of PTY', () => {
    // Verify we're using vscode.window.createTerminal instead of pty.spawn
    expect(source).toContain('vscode.window.createTerminal(');
    expect(source).not.toContain("pty.spawn('claude'");
  });

  it('T033: sends command via terminal.sendText', () => {
    expect(source).toContain('.sendText(');
    expect(source).toContain('claudeCommand');
  });

  it('T034: preserves environment variables in terminal', () => {
    // Environment variables like CLAUDE_AUTOCOMPACT_PCT_OVERRIDE should still be set
    expect(source).toContain('CLAUDE_AUTOCOMPACT_PCT_OVERRIDE');
    expect(source).toContain('GOFER_DISPLAY_NAME');
  });

  it('T035: uses HookBridgeWatcher for context monitoring', () => {
    // Context health is now monitored via HookBridgeWatcher, not PTY output capture
    expect(source).toContain('HookBridgeWatcher');
  });

  it('should only build context when sharedContextBuilder is available', () => {
    expect(source).toContain('if (sharedContextBuilder)');
  });
});
