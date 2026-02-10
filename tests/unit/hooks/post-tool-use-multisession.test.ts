/**
 * Unit tests for multi-session bridge file writing in post-tool-use.mjs.
 *
 * Tests: T001 — per-session bridge file naming (context-bridge-{sessionId}.json)
 * and T003 — dual-write backward compatibility (legacy context-bridge.json).
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

describe('post-tool-use.mjs multi-session bridge files', () => {
  let tmpDir: string;
  let hooksDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-multisession-test-'));
    hooksDir = path.join(tmpDir, '.specify', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
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

  it('writes per-session bridge file with session ID in filename', () => {
    runHook({
      tool_name: 'Read',
      session_id: 'abc123-session',
      transcript_path: '',
    });

    const perSessionPath = path.join(hooksDir, 'context-bridge-abc123-session.json');
    expect(fs.existsSync(perSessionPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(perSessionPath, 'utf-8'));
    expect(data.sessionId).toBe('abc123-session');
    expect(data.session.active).toBe(true);
    expect(data.lastToolUse.toolName).toBe('Read');
  });

  it('also writes legacy context-bridge.json for backward compat', () => {
    runHook({
      tool_name: 'Bash',
      session_id: 'def456-session',
      transcript_path: '',
    });

    const legacyPath = path.join(hooksDir, 'context-bridge.json');
    expect(fs.existsSync(legacyPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
    expect(data.sessionId).toBe('def456-session');
  });

  it('two different sessions produce two separate per-session files', () => {
    runHook({
      tool_name: 'Read',
      session_id: 'session-A',
      transcript_path: '',
    });

    runHook({
      tool_name: 'Write',
      session_id: 'session-B',
      transcript_path: '',
    });

    const fileA = path.join(hooksDir, 'context-bridge-session-A.json');
    const fileB = path.join(hooksDir, 'context-bridge-session-B.json');

    expect(fs.existsSync(fileA)).toBe(true);
    expect(fs.existsSync(fileB)).toBe(true);

    const dataA = JSON.parse(fs.readFileSync(fileA, 'utf-8'));
    const dataB = JSON.parse(fs.readFileSync(fileB, 'utf-8'));

    expect(dataA.sessionId).toBe('session-A');
    expect(dataA.lastToolUse.toolName).toBe('Read');
    expect(dataB.sessionId).toBe('session-B');
    expect(dataB.lastToolUse.toolName).toBe('Write');
  });

  it('per-session file has correct BridgeData schema', () => {
    runHook({
      tool_name: 'Grep',
      session_id: 'schema-test',
      transcript_path: '',
    });

    const filePath = path.join(hooksDir, 'context-bridge-schema-test.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Required top-level fields
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('sessionId');
    expect(data).toHaveProperty('model');
    expect(data).toHaveProperty('context');
    expect(data).toHaveProperty('lastToolUse');
    expect(data).toHaveProperty('session');

    // Session structure
    expect(data.session).toHaveProperty('active');
    expect(data.session).toHaveProperty('lastActivity');
    expect(typeof data.timestamp).toBe('number');
    expect(typeof data.session.lastActivity).toBe('number');
  });

  it('handles empty session_id gracefully (falls back to legacy only)', () => {
    runHook({
      tool_name: 'Read',
      session_id: '',
      transcript_path: '',
    });

    // Legacy file should exist
    const legacyPath = path.join(hooksDir, 'context-bridge.json');
    expect(fs.existsSync(legacyPath)).toBe(true);

    // Per-session file with empty ID should NOT be written
    const emptyPath = path.join(hooksDir, 'context-bridge-.json');
    expect(fs.existsSync(emptyPath)).toBe(false);
  });

  it('updates per-session file on subsequent calls with same session', () => {
    runHook({
      tool_name: 'Read',
      session_id: 'update-test',
      transcript_path: '',
    });

    const filePath = path.join(hooksDir, 'context-bridge-update-test.json');
    const data1 = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Small delay to ensure different timestamp
    runHook({
      tool_name: 'Write',
      session_id: 'update-test',
      transcript_path: '',
    });

    const data2 = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    expect(data2.lastToolUse.toolName).toBe('Write');
    expect(data2.timestamp).toBeGreaterThanOrEqual(data1.timestamp);
  });
});
