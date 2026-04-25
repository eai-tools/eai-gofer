import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { spawn } from 'child_process';

const HOOK_PATH = path.resolve(
  __dirname,
  '../../../.specify/scripts/hooks/log-stage-launch-time.mjs'
);

interface RunResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

function runHook(args: string[], env: NodeJS.ProcessEnv): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [HOOK_PATH, ...args], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c.toString()));
    child.stderr.on('data', (c) => (stderr += c.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ stdout, stderr, code }));
  });
}

interface LogRecord {
  stage: string;
  mode: string;
  timestamp: string;
  latency_ms: number;
}

function readLog(logPath: string): LogRecord[] {
  const raw = readFileSync(logPath, 'utf8');
  return raw
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as LogRecord);
}

describe('log-stage-launch-time.mjs hook', () => {
  let tmp: string;
  let logPath: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), 'log-stage-launch-test-'));
    logPath = path.join(tmp, 'stage-launch-time.jsonl');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('writes one JSONL line per invocation', async () => {
    const r = await runHook(['3_gofer_plan', 'numbered'], {
      GOFER_LOG_FILE: logPath,
    });
    expect(r.code).toBe(0);
    expect(existsSync(logPath)).toBe(true);

    const records = readLog(logPath);
    expect(records.length).toBe(1);
  });

  it('each record has stage, mode, timestamp, latency_ms', async () => {
    await runHook(['1_gofer_research', 'numbered'], {
      GOFER_LOG_FILE: logPath,
    });
    const [record] = readLog(logPath);

    expect(record.stage).toBe('1_gofer_research');
    expect(record.mode).toBe('numbered');
    expect(typeof record.timestamp).toBe('string');
    expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601 prefix
    expect(typeof record.latency_ms).toBe('number');
    expect(record.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it('mode field accepts both "numbered" and "namespaced"', async () => {
    await runHook(['3_gofer_plan', 'numbered'], { GOFER_LOG_FILE: logPath });
    await runHook(['gofer:plan-stage', 'namespaced'], { GOFER_LOG_FILE: logPath });

    const records = readLog(logPath);
    expect(records).toHaveLength(2);
    expect(records[0].mode).toBe('numbered');
    expect(records[1].mode).toBe('namespaced');
  });

  it('reads stage and mode from environment variables when argv is missing', async () => {
    await runHook([], {
      GOFER_LOG_FILE: logPath,
      GOFER_STAGE: '5_gofer_implement',
      GOFER_MODE: 'namespaced',
    });

    const [record] = readLog(logPath);
    expect(record.stage).toBe('5_gofer_implement');
    expect(record.mode).toBe('namespaced');
  });

  it('appends — does not truncate — across multiple invocations', async () => {
    for (let i = 0; i < 5; i++) {
      await runHook([`stage_${i}`, i % 2 === 0 ? 'numbered' : 'namespaced'], {
        GOFER_LOG_FILE: logPath,
      });
    }
    const records = readLog(logPath);
    expect(records.length).toBe(5);
    expect(records.map((r) => r.stage)).toEqual([
      'stage_0',
      'stage_1',
      'stage_2',
      'stage_3',
      'stage_4',
    ]);
  });
});
