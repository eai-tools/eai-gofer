/**
 * Unit and integration tests for post-tool-use.mjs observation extraction.
 *
 * Tests: T018, T021 — new-format stdin, old-format stdin, truncation,
 * JSON structure, bridge observationId, and full flow simulation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const HOOK_SCRIPT = path.resolve(
  __dirname,
  '../../../extension/resources/hook-scripts/post-tool-use.mjs'
);

describe('post-tool-use.mjs observation extraction (T018)', () => {
  let tmpDir: string;
  let bridgePath: string;
  let observationsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-hook-test-'));
    const specifyDir = path.join(tmpDir, '.specify', 'hooks');
    fs.mkdirSync(specifyDir, { recursive: true });
    bridgePath = path.join(specifyDir, 'context-bridge.json');
    observationsDir = path.join(specifyDir, 'observations');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function runHook(stdinPayload: Record<string, unknown>): void {
    const input = JSON.stringify(stdinPayload);
    execSync(`node ${HOOK_SCRIPT}`, {
      input,
      env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
      timeout: 10000,
    });
  }

  it('writes observation file when tool_response is present (new format)', () => {
    runHook({
      tool_name: 'Read',
      session_id: 'test-session',
      transcript_path: '',
      tool_input: { file_path: '/tmp/test.ts' },
      tool_response: 'const x = 42;',
    });

    // Bridge should be written
    expect(fs.existsSync(bridgePath)).toBe(true);
    const bridge = JSON.parse(fs.readFileSync(bridgePath, 'utf-8'));
    expect(bridge.lastToolUse.toolName).toBe('Read');
    expect(bridge.lastToolUse.observationId).toBeTruthy();
    expect(bridge.lastToolUse.toolInput).toEqual({ file_path: '/tmp/test.ts' });

    // Observation file should exist
    expect(fs.existsSync(observationsDir)).toBe(true);
    const files = fs.readdirSync(observationsDir).filter(f => f.endsWith('.json'));
    expect(files.length).toBe(1);

    const obs = JSON.parse(fs.readFileSync(path.join(observationsDir, files[0]), 'utf-8'));
    expect(obs.id).toBe(bridge.lastToolUse.observationId);
    expect(obs.toolName).toBe('Read');
    expect(obs.toolInput).toEqual({ file_path: '/tmp/test.ts' });
    expect(obs.toolResponse).toBe('const x = 42;');
    expect(obs.truncated).toBe(false);
    expect(obs.timestamp).toBeTruthy();
  });

  it('handles old-format stdin without tool_response (backward compat)', () => {
    runHook({
      tool_name: 'Bash',
      session_id: 'test-session',
      transcript_path: '',
    });

    const bridge = JSON.parse(fs.readFileSync(bridgePath, 'utf-8'));
    expect(bridge.lastToolUse.toolName).toBe('Bash');
    expect(bridge.lastToolUse.observationId).toBeUndefined();
    expect(bridge.lastToolUse.toolInput).toBeUndefined();

    // No observation file should be created
    if (fs.existsSync(observationsDir)) {
      const files = fs.readdirSync(observationsDir).filter(f => f.endsWith('.json'));
      expect(files.length).toBe(0);
    }
  });

  it('truncates tool_response exceeding 10KB', () => {
    const largeContent = 'x'.repeat(15000);
    runHook({
      tool_name: 'Read',
      session_id: 'test-session',
      transcript_path: '',
      tool_input: { file_path: '/tmp/big.ts' },
      tool_response: largeContent,
    });

    const files = fs.readdirSync(observationsDir).filter(f => f.endsWith('.json'));
    const obs = JSON.parse(fs.readFileSync(path.join(observationsDir, files[0]), 'utf-8'));
    expect(obs.truncated).toBe(true);
    expect(obs.toolResponse).toContain('[truncated at 10KB]');
    expect(obs.toolResponse.length).toBeLessThanOrEqual(10240 + 30); // 10KB + marker text
  });

  it('handles object tool_response by JSON.stringifying', () => {
    runHook({
      tool_name: 'Grep',
      session_id: 'test-session',
      transcript_path: '',
      tool_input: { pattern: 'foo' },
      tool_response: { matches: ['file1.ts:10', 'file2.ts:20'] },
    });

    const files = fs.readdirSync(observationsDir).filter(f => f.endsWith('.json'));
    const obs = JSON.parse(fs.readFileSync(path.join(observationsDir, files[0]), 'utf-8'));
    expect(obs.toolResponse).toContain('file1.ts:10');
    expect(obs.truncated).toBe(false);
  });

  it('writes bridge with correct structure', () => {
    runHook({
      tool_name: 'Edit',
      session_id: 'sess-456',
      transcript_path: '',
      tool_input: { file_path: '/tmp/edit.ts', old_string: 'a', new_string: 'b' },
      tool_response: 'File edited successfully',
    });

    const bridge = JSON.parse(fs.readFileSync(bridgePath, 'utf-8'));
    expect(bridge.sessionId).toBe('sess-456');
    expect(bridge.timestamp).toBeGreaterThan(0);
    expect(bridge.session.active).toBe(true);
    expect(bridge.lastToolUse.toolName).toBe('Edit');
    expect(bridge.lastToolUse.timestamp).toBeGreaterThan(0);
  });
});

describe('post-tool-use.mjs full flow integration (T021)', () => {
  let tmpDir: string;
  let bridgePath: string;
  let observationsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-hook-int-'));
    const specifyDir = path.join(tmpDir, '.specify', 'hooks');
    fs.mkdirSync(specifyDir, { recursive: true });
    bridgePath = path.join(specifyDir, 'context-bridge.json');
    observationsDir = path.join(specifyDir, 'observations');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function runHook(stdinPayload: Record<string, unknown>): void {
    const input = JSON.stringify(stdinPayload);
    execSync(`node ${HOOK_SCRIPT}`, {
      input,
      env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
      timeout: 10000,
    });
  }

  it('simulates multiple tool calls accumulating observation files', () => {
    // First call: Read
    runHook({
      tool_name: 'Read',
      session_id: 'flow-test',
      transcript_path: '',
      tool_input: { file_path: '/tmp/a.ts' },
      tool_response: 'import { foo } from "bar";',
    });

    // Second call: Bash
    runHook({
      tool_name: 'Bash',
      session_id: 'flow-test',
      transcript_path: '',
      tool_input: { command: 'ls -la' },
      tool_response: 'total 8\ndrwxr-xr-x  2 user group 64 Feb  9 12:00 .',
    });

    // Should have 2 observation files
    const files = fs.readdirSync(observationsDir).filter(f => f.endsWith('.json'));
    expect(files.length).toBe(2);

    // Bridge should reflect latest tool call
    const bridge = JSON.parse(fs.readFileSync(bridgePath, 'utf-8'));
    expect(bridge.lastToolUse.toolName).toBe('Bash');
    expect(bridge.lastToolUse.observationId).toBeTruthy();
  });

  it('extension can read observation file referenced by bridge', () => {
    runHook({
      tool_name: 'Read',
      session_id: 'ext-test',
      transcript_path: '',
      tool_input: { file_path: '/tmp/config.ts' },
      tool_response: 'export const PORT = 3000;',
    });

    // Simulate what the extension does: read bridge, then read observation
    const bridge = JSON.parse(fs.readFileSync(bridgePath, 'utf-8'));
    const obsId = bridge.lastToolUse.observationId;
    expect(obsId).toBeTruthy();

    const obsPath = path.join(observationsDir, `${obsId}.json`);
    expect(fs.existsSync(obsPath)).toBe(true);

    const obs = JSON.parse(fs.readFileSync(obsPath, 'utf-8'));
    expect(obs.toolResponse).toBe('export const PORT = 3000;');
    expect(obs.toolName).toBe('Read');

    // Simulate extension cleanup (T012)
    fs.unlinkSync(obsPath);
    expect(fs.existsSync(obsPath)).toBe(false);
  });
});
