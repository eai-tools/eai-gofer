import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { spawn } from 'child_process';

const HOOK_PATH = path.resolve(__dirname, '../../../.specify/scripts/hooks/queued-input.mjs');

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

describe('queued-input.mjs hook', () => {
  let tmp: string;
  let queuePath: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), 'queued-input-test-'));
    queuePath = path.join(tmp, 'input-queue.jsonl');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('hook script exists', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('parses without syntax errors when invoked with --check', async () => {
    // Negative-path: spawn `node --check` to validate the file is parseable.
    const child = spawn(process.execPath, ['--check', HOOK_PATH]);
    const code: number | null = await new Promise((resolve) => child.on('close', resolve));
    expect(code).toBe(0);
  });

  it('appends a JSONL record to the queue file when invoked', async () => {
    const payload = JSON.stringify({ stage: '3_gofer_plan', prompt: 'hello' });
    const result = await runHook(payload, { GOFER_QUEUE_FILE: queuePath });

    expect(result.code).toBe(0);
    expect(existsSync(queuePath)).toBe(true);

    const raw = readFileSync(queuePath, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(1);

    const record = JSON.parse(lines[0]);
    expect(record.stage).toBe('3_gofer_plan');
    expect(record.prompt).toBe('hello');
    expect(typeof record.timestamp).toBe('string');
  });

  it('appends additional records on subsequent calls (queue grows)', async () => {
    await runHook(JSON.stringify({ stage: 's1', prompt: 'a' }), { GOFER_QUEUE_FILE: queuePath });
    await runHook(JSON.stringify({ stage: 's2', prompt: 'b' }), { GOFER_QUEUE_FILE: queuePath });
    await runHook(JSON.stringify({ stage: 's3', prompt: 'c' }), { GOFER_QUEUE_FILE: queuePath });

    const raw = readFileSync(queuePath, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(3);

    // Each line is valid JSON
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }

    // Stages preserved in order
    const stages = lines.map((l) => JSON.parse(l).stage);
    expect(stages).toEqual(['s1', 's2', 's3']);
  });

  it('logs queued acknowledgement to stderr with current pending count', async () => {
    const result = await runHook(JSON.stringify({ prompt: 'first' }), {
      GOFER_QUEUE_FILE: queuePath,
    });
    expect(result.stderr).toMatch(/queued: 1 items pending/);

    const result2 = await runHook(JSON.stringify({ prompt: 'second' }), {
      GOFER_QUEUE_FILE: queuePath,
    });
    expect(result2.stderr).toMatch(/queued: 2 items pending/);
  });

  it('handles empty/garbage stdin without crashing', async () => {
    const result = await runHook('', { GOFER_QUEUE_FILE: queuePath });
    expect(result.code).toBe(0);

    const result2 = await runHook('not-json{', { GOFER_QUEUE_FILE: queuePath });
    expect(result2.code).toBe(0);

    // Both still produced records
    const raw = readFileSync(queuePath, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(2);
  });
});
