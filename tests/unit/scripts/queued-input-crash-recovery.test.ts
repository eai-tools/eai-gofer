/**
 * T147 — queued-input-crash-recovery.test.ts
 *
 * Asserts the queued-input hook is crash-resilient (FR-015):
 *   1. The queue persists to `.specify/state/queued-input.jsonl` by default.
 *   2. After a simulated crash (record written without being marked replayed),
 *      a fresh hook invocation reports the leftover as "<N> items pending
 *      replay" on stderr.
 *   3. `replayQueue()` returns the pending records and (idempotently) marks
 *      them replayed.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HOOK_PATH = path.resolve(__dirname, '../../../.specify/scripts/hooks/queued-input.mjs');

const MODULE_URL = new URL(`file://${HOOK_PATH}`).href;

interface RunResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

function runHook(stdinPayload: string, env: NodeJS.ProcessEnv): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [HOOK_PATH], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c.toString()));
    child.stderr.on('data', (c) => (stderr += c.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ stdout, stderr, code }));
    child.stdin.write(stdinPayload);
    child.stdin.end();
  });
}

describe('queued-input crash recovery (T147 / FR-015)', () => {
  let projectRoot: string;
  let defaultQueue: string;
  let replayQueue: (queuePath?: string) => Array<Record<string, unknown>>;
  let readQueue: (queuePath: string) => Array<Record<string, unknown>>;

  beforeAll(async () => {
    const mod = await import(MODULE_URL);
    replayQueue = mod.replayQueue;
    readQueue = mod.readQueue;
  });

  beforeEach(() => {
    projectRoot = mkdtempSync(path.join(tmpdir(), 'queued-recovery-'));
    defaultQueue = path.join(projectRoot, '.specify', 'state', 'queued-input.jsonl');
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('default queue path is .specify/state/queued-input.jsonl', async () => {
    const payload = JSON.stringify({ stage: 's1', prompt: 'hello' });
    const result = await runHook(payload, { GOFER_PROJECT_DIR: projectRoot });
    expect(result.code).toBe(0);
    expect(existsSync(defaultQueue)).toBe(true);
  });

  it('records carry a status field set to "queued"', async () => {
    await runHook(JSON.stringify({ stage: 's1', prompt: 'p1' }), {
      GOFER_PROJECT_DIR: projectRoot,
    });
    const lines = readFileSync(defaultQueue, 'utf8')
      .split('\n')
      .filter((l) => l.trim());
    expect(lines).toHaveLength(1);
    const rec = JSON.parse(lines[0]);
    expect(rec.status).toBe('queued');
    expect(rec.id).toBeTruthy();
    expect(rec.timestamp).toBeTruthy();
  });

  it('on next invocation, leftover queued records are reported as "<N> items pending replay"', async () => {
    // Simulate a crash: pre-seed the queue file with a `queued` record but
    // do NOT mark it replayed.
    mkdirSync(path.dirname(defaultQueue), { recursive: true });
    const stale = {
      id: 'pre-crash-1',
      timestamp: '2026-01-01T00:00:00Z',
      stage: 'crashed-stage',
      prompt: 'crashed prompt',
      payload: {},
      status: 'queued',
    };
    writeFileSync(defaultQueue, JSON.stringify(stale) + '\n', 'utf8');

    // Now invoke the hook; it should announce the leftover pending record.
    const result = await runHook(JSON.stringify({ stage: 's2', prompt: 'p2' }), {
      GOFER_PROJECT_DIR: projectRoot,
    });
    expect(result.code).toBe(0);
    expect(result.stderr).toMatch(/1 items pending replay/);
    // And it still appends the new record (so total count = 2)
    expect(result.stderr).toMatch(/queued: 2 items pending/);
  });

  it('replayQueue() returns pending records and marks them replayed (idempotent)', () => {
    // Build a queue file with 2 queued, 1 already-replayed
    mkdirSync(path.dirname(defaultQueue), { recursive: true });
    const records = [
      { id: 'a', timestamp: 't1', stage: 's', prompt: 'p1', payload: {}, status: 'queued' },
      { id: 'b', timestamp: 't2', stage: 's', prompt: 'p2', payload: {}, status: 'replayed' },
      { id: 'c', timestamp: 't3', stage: 's', prompt: 'p3', payload: {}, status: 'queued' },
    ];
    writeFileSync(defaultQueue, records.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');

    const pending = replayQueue(defaultQueue);
    expect(pending).toHaveLength(2);
    expect(pending.map((r) => r.id).sort()).toEqual(['a', 'c']);

    // Idempotency: a second call returns nothing.
    const second = replayQueue(defaultQueue);
    expect(second).toHaveLength(0);

    // All records on disk should now be `replayed`.
    const after = readQueue(defaultQueue);
    expect(after.every((r) => r.status === 'replayed')).toBe(true);
  });

  it('replayQueue treats status=crashed records as pending too', () => {
    mkdirSync(path.dirname(defaultQueue), { recursive: true });
    const records = [
      { id: 'x', timestamp: 't', stage: 's', prompt: 'p', payload: {}, status: 'crashed' },
    ];
    writeFileSync(defaultQueue, records.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
    const pending = replayQueue(defaultQueue);
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('x');
  });

  it('does not announce pending replay when queue is empty/fresh', async () => {
    const result = await runHook(JSON.stringify({ stage: 's', prompt: 'p' }), {
      GOFER_PROJECT_DIR: projectRoot,
    });
    expect(result.stderr).not.toMatch(/items pending replay/);
    expect(result.stderr).toMatch(/queued: 1 items pending/);
  });
});
