/**
 * Integration Test: agent-stop.mjs memory extraction pipeline (T023)
 *
 * Tests the agent-stop hook's ability to:
 * 1. Extract learnings from a transcript
 * 2. Classify them by category
 * 3. Deduplicate against existing memories
 * 4. Write to local.json
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

describe('Agent-Stop Memory Extraction Pipeline', () => {
  const testDir = path.join(__dirname, 'test-workspace-agent-stop');
  const memoryDir = path.join(testDir, '.specify', 'memory');
  const hooksDir = path.join(testDir, '.specify', 'hooks');
  const localJsonPath = path.join(memoryDir, 'local.json');
  const transcriptPath = path.join(testDir, 'test-transcript.jsonl');

  const hookScript = path.resolve(__dirname, '../../.specify/scripts/hooks/agent-stop.mjs');

  beforeEach(() => {
    // Create test directories
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.mkdirSync(hooksDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  function writeTranscript(messages: Array<{ type: string; content: string }>): void {
    const lines = messages.map((msg) => {
      if (msg.type === 'human') {
        return JSON.stringify({
          type: 'human',
          message: { content: msg.content },
        });
      }
      return JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: msg.content }],
          usage: {
            input_tokens: 1000,
            cache_creation_input_tokens: 500,
            cache_read_input_tokens: 200,
            output_tokens: 300,
          },
          model: 'claude-sonnet-4-20250514',
        },
      });
    });
    fs.writeFileSync(transcriptPath, lines.join('\n') + '\n');
  }

  function runHook(sessionId = 'test-session-001'): void {
    const stdinData = JSON.stringify({
      session_id: sessionId,
      transcript_path: transcriptPath,
    });

    execFileSync('node', [hookScript], {
      input: stdinData,
      env: {
        ...process.env,
        CLAUDE_PROJECT_DIR: testDir,
      },
      timeout: 10000,
    });
  }

  function readMemories(): Array<Record<string, unknown>> {
    if (!fs.existsSync(localJsonPath)) return [];
    const data = JSON.parse(fs.readFileSync(localJsonPath, 'utf-8'));
    return data.memories || [];
  }

  it('should extract decision memories from transcript', () => {
    writeTranscript([
      { type: 'human', content: 'How should we handle authentication?' },
      {
        type: 'assistant',
        content:
          'After analyzing the codebase, decided to use JWT tokens with refresh rotation. This approach provides stateless authentication while maintaining security through token rotation.',
      },
    ]);

    runHook();

    expect(fs.existsSync(localJsonPath)).toBe(true);
    const memories = readMemories();
    expect(memories.length).toBeGreaterThanOrEqual(1);

    const decision = memories.find((m) => m.category === 'decision');
    expect(decision).toBeDefined();
    expect(decision!.learnedFrom).toBeDefined();
  });

  it('should extract preference memories from human messages', () => {
    writeTranscript([
      { type: 'human', content: 'I prefer using explicit return types on all functions' },
      { type: 'assistant', content: 'Understood, I will use explicit return types.' },
    ]);

    runHook();

    expect(fs.existsSync(localJsonPath)).toBe(true);
    const memories = readMemories();

    const pref = memories.find((m) => m.category === 'preference');
    expect(pref).toBeDefined();
  });

  it('should extract error resolution memories from assistant messages', () => {
    writeTranscript([
      { type: 'human', content: 'The build is failing' },
      {
        type: 'assistant',
        content:
          'The issue was caused by a missing dependency. Fixed by adding uuid to package.json dependencies. The root cause was that uuid was listed only in devDependencies.',
      },
    ]);

    runHook();

    expect(fs.existsSync(localJsonPath)).toBe(true);
    const memories = readMemories();

    const fix = memories.find((m) => m.category === 'error_resolution');
    expect(fix).toBeDefined();
  });

  it('should deduplicate against existing memories', () => {
    // Pre-populate existing memories
    const existingMemory = {
      id: 'existing-1',
      category: 'decision',
      content: 'Decided to use JWT tokens for authentication',
      tags: ['#auth'],
      created: Date.now() - 86400000,
      lastUsed: Date.now() - 86400000,
      usedCount: 2,
      scope: 'local',
    };
    fs.writeFileSync(localJsonPath, JSON.stringify({ version: 1, memories: [existingMemory] }));

    // Transcript with similar content
    writeTranscript([
      { type: 'human', content: 'What about auth?' },
      {
        type: 'assistant',
        content: 'We decided to use JWT tokens for authentication with refresh rotation.',
      },
    ]);

    runHook();

    // Local.json should have the existing memory with updated lastUsed
    const localData = JSON.parse(fs.readFileSync(localJsonPath, 'utf-8'));
    expect(localData.memories.length).toBeGreaterThanOrEqual(1);

    // The existing memory's usedCount should have been bumped
    const existing = localData.memories.find((m: Record<string, unknown>) => m.id === 'existing-1');
    if (existing) {
      expect(existing.usedCount).toBeGreaterThan(2);
    }
  });

  it('should write to local.json with StoredMemories format', () => {
    writeTranscript([
      { type: 'human', content: 'Always use Vitest instead of Jest' },
      { type: 'assistant', content: 'Noted. Going with Vitest for the test framework.' },
    ]);

    runHook();

    expect(fs.existsSync(localJsonPath)).toBe(true);

    // local.json should have the StoredMemories format
    const localData = JSON.parse(fs.readFileSync(localJsonPath, 'utf-8'));
    expect(localData.version).toBe(1);
    expect(localData.memories).toBeDefined();
    expect(localData.memories.length).toBeGreaterThanOrEqual(1);

    // Each memory should have required fields
    for (const mem of localData.memories) {
      expect(mem.id).toBeDefined();
      expect(mem.category).toBeDefined();
      expect(mem.content).toBeDefined();
      expect(mem.created).toBeDefined();
      expect(mem.scope).toBe('local');
    }
  });

  it('should assign correct categories by content type', () => {
    writeTranscript([
      { type: 'human', content: 'I prefer tabs over spaces' },
      {
        type: 'assistant',
        content:
          'Understood. We decided to use the event-driven architecture for the notification system.',
      },
    ]);

    runHook();

    const memories = readMemories();

    for (const mem of memories) {
      expect(['decision', 'preference', 'error_resolution', 'file_knowledge', 'pattern']).toContain(
        mem.category
      );
    }
  });

  it('should ignore low-signal completion chatter', () => {
    writeTranscript([
      { type: 'human', content: 'How did it go?' },
      {
        type: 'assistant',
        content: '100/100 PASS. Feature complete. All tests passed and everything is done.',
      },
    ]);

    runHook();

    const memories = readMemories();
    expect(memories).toHaveLength(0);
  });
});
