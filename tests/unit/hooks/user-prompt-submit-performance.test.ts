import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOOK_SCRIPT = path.resolve(
  __dirname,
  '../../../extension/resources/hook-scripts/user-prompt-submit.mjs'
);

describe('user-prompt-submit hook performance safeguards', () => {
  it('does not rewrite the bridge for equivalent prompt activity and emits opt-in perf logs', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-prompt-hook-'));
    try {
      const payload = JSON.stringify({ session_id: 'abc', prompt: 'same prompt' });
      const env = { ...process.env, CLAUDE_PROJECT_DIR: root, GOFER_PERF_LOG: '1' };
      execFileSync('node', [HOOK_SCRIPT], { input: payload, env, timeout: 10000 });

      const bridgePath = path.join(root, '.specify/hooks/context-bridge.json');
      const firstMtime = fs.statSync(bridgePath).mtimeMs;
      execFileSync('node', [HOOK_SCRIPT], { input: payload, env, timeout: 10000 });
      const secondMtime = fs.statSync(bridgePath).mtimeMs;

      expect(secondMtime).toBe(firstMtime);
      const perfLog = fs.readFileSync(path.join(root, '.specify/hooks/hook-perf.jsonl'), 'utf8');
      expect(perfLog).toContain('"hook":"user-prompt-submit"');
      expect(perfLog).toContain('"operation":"bridge-write"');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
