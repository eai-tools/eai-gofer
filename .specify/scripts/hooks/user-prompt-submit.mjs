#!/usr/bin/env node
/**
 * user-prompt-submit.mjs — Claude Code UserPromptSubmit hook
 *
 * Fires before every prompt is processed. Reads .specify/memory/local.json,
 * scores memories by keyword relevance to the prompt, and outputs
 * additionalContext via stdout for injection as a <system-reminder>.
 *
 * Also updates the bridge file with activity data.
 *
 * stdin:  JSON with { prompt, session_id, transcript_path }
 * stdout: JSON with { hookSpecificOutput: { hookEventName, additionalContext } }
 * Bridge: .specify/hooks/context-bridge.json
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MEMORY_PATH = join(PROJECT_DIR, '.specify', 'memory', 'local.json');
const JSONL_PATH = join(PROJECT_DIR, '.specify', 'memory', 'memories.jsonl');
const BRIDGE_PATH = join(PROJECT_DIR, '.specify', 'hooks', 'context-bridge.json');
const DEBUG_LOG = join(PROJECT_DIR, '.specify', 'hooks', 'hook-debug.log');
const MAX_MEMORIES = 7; // Increased from 5 to include typed variety
const MAX_CONTEXT_CHARS = 4000; // ~1000 tokens (increased for typed context)

function debug(msg) {
  try {
    const ts = new Date().toISOString();
    appendFileSync(DEBUG_LOG, `[${ts}] [user-prompt-submit] ${msg}\n`);
  } catch { /* ignore */ }
}

function readStdin() {
  try {
    const raw = readFileSync(0, 'utf-8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Load memories from JSONL (primary) with fallback to local.json (legacy).
 * JSONL format: one JSON object per line, last-writer-wins for duplicate IDs.
 */
function loadMemories() {
  // Try JSONL first (new backend)
  try {
    const raw = readFileSync(JSONL_PATH, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim().length > 0);
    const index = new Map();
    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        if (!record.id) continue;
        if (record._deleted) {
          index.delete(record.id);
        } else {
          index.set(record.id, record);
        }
      } catch { /* skip invalid lines */ }
    }
    const memories = Array.from(index.values());
    if (memories.length > 0) {
      debug(`Loaded ${memories.length} memories from JSONL`);
      return memories;
    }
  } catch { /* JSONL doesn't exist, try legacy */ }

  // Fallback to local.json
  try {
    const raw = readFileSync(MEMORY_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    if (data.memories && Array.isArray(data.memories)) return data.memories;
    return [];
  } catch {
    return [];
  }
}

function scoreMemory(memory, promptWords, promptText) {
  const text = (memory.content || memory.text || memory.summary || '').toLowerCase();
  const tags = (memory.tags || []).map(t => t.toLowerCase());
  let score = 0;

  for (const word of promptWords) {
    if (text.includes(word)) score += 1;
    if (tags.some(t => t.includes(word))) score += 2;
  }

  // Boost by priority index if available
  const priority = memory.priorityIndex || memory.priority || 0;
  score += priority * 0.5;

  // Type-aware scoring: boost procedural memories for implementation prompts
  const memType = memory.type || '';
  const lowerPrompt = (promptText || '').toLowerCase();
  const isImplementTask = /implement|build|create|add|fix|update|write|code/.test(lowerPrompt);
  const isResearchTask = /research|analyze|explain|understand|what|how|why/.test(lowerPrompt);

  if (isImplementTask && memType === 'procedural') score += 3;
  if (isImplementTask && memType === 'decision') score += 2;
  if (isResearchTask && memType === 'semantic') score += 3;
  if (isResearchTask && memType === 'episodic') score += 2;

  // Boost by confidence
  if (memory.confidence) {
    score += (memory.confidence / 100) * 1.5;
  }

  // Penalize stale memories
  if (memory.stale) score -= 2;

  return score;
}

function selectRelevantMemories(memories, prompt) {
  if (!memories.length || !prompt) return memories.slice(0, MAX_MEMORIES);

  // Tokenize prompt into meaningful words (3+ chars)
  const promptWords = prompt
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length >= 3);

  if (!promptWords.length) return memories.slice(0, MAX_MEMORIES);

  const scored = memories
    .map(m => ({ memory: m, score: scoreMemory(m, promptWords, prompt) }))
    .filter(s => s.score > 0) // Only include memories with positive relevance
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, MAX_MEMORIES).map(s => s.memory);
}

const TYPE_LABELS = {
  procedural: 'How-To',
  semantic: 'Knowledge',
  episodic: 'Experience',
  decision: 'Decision',
  prospective: 'TODO',
};

function formatMemoriesForContext(memories) {
  if (!memories.length) return '';

  const lines = ['Gofer Memory Context:'];
  let totalChars = lines[0].length;

  for (const m of memories) {
    const text = m.content || m.text || m.summary || '';
    if (!text) continue;

    const typeLabel = TYPE_LABELS[m.type] || 'Memory';
    const staleFlag = m.stale ? ' [stale]' : '';
    const line = `- [${typeLabel}]${staleFlag} ${text}`;
    if (totalChars + line.length > MAX_CONTEXT_CHARS) break;
    lines.push(line);
    totalChars += line.length;
  }

  return lines.length > 1 ? lines.join('\n') : '';
}

function updateBridge(sessionId, prompt) {
  try {
    let existing = {};
    try {
      existing = JSON.parse(readFileSync(BRIDGE_PATH, 'utf-8'));
    } catch {
      // No existing bridge
    }

    const now = Date.now();
    const bridge = {
      ...existing,
      timestamp: now,
      sessionId: sessionId || existing.sessionId || '',
      session: {
        active: true,
        lastActivity: now,
      },
      // Capture prompt topic so agent-stop.mjs can use it for learning context
      lastPrompt: {
        topic: (prompt || '').substring(0, 200),
        timestamp: now,
      },
    };

    mkdirSync(dirname(BRIDGE_PATH), { recursive: true });
    const tmpPath = BRIDGE_PATH + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(bridge, null, 2));
    renameSync(tmpPath, BRIDGE_PATH);
    debug(`Bridge updated: session=${bridge.sessionId}`);
  } catch (err) {
    debug(`Bridge write error: ${err.message}`);
  }
}

// Main
debug(`Hook fired. PROJECT_DIR=${PROJECT_DIR}`);

const input = readStdin();
debug(`stdin: session_id=${input.session_id}, prompt_length=${(input.prompt || '').length}`);

const prompt = input.prompt || '';
const sessionId = input.session_id || '';

// Update bridge with activity and prompt topic
updateBridge(sessionId, prompt);

// Load and score memories
const memories = loadMemories();
const relevant = selectRelevantMemories(memories, prompt);
const additionalContext = formatMemoriesForContext(relevant);
debug(`memories: loaded=${memories.length}, relevant=${relevant.length}, hasContext=${!!additionalContext}`);

// Output for Claude Code to inject
if (additionalContext) {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext,
    },
  };
  process.stdout.write(JSON.stringify(output));
}
