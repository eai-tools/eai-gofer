#!/usr/bin/env node
/**
 * post-tool-use.mjs — Claude Code PostToolUse hook
 *
 * Fires on every tool call. Reads transcript JSONL to extract the latest
 * token usage from the most recent assistant message, then writes a
 * context-bridge.json file that the VS Code extension watches.
 *
 * stdin: JSON with { tool_name, session_id, transcript_path }
 * stdout: (none — PostToolUse hooks don't produce output)
 * Bridge: .specify/hooks/context-bridge.json
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const BRIDGE_PATH = join(PROJECT_DIR, '.specify', 'hooks', 'context-bridge.json');
const DEBUG_LOG = join(PROJECT_DIR, '.specify', 'hooks', 'hook-debug.log');
const TAIL_BYTES = 20 * 1024; // Read last 20KB of transcript

function debug(msg) {
  try {
    const ts = new Date().toISOString();
    appendFileSync(DEBUG_LOG, `[${ts}] [post-tool-use] ${msg}\n`);
  } catch { /* ignore */ }
}

// Model context limits (tokens)
const MODEL_LIMITS = {
  'claude-opus-4-5-20251101': 200000,
  'claude-sonnet-4-5-20250514': 200000,
  'claude-sonnet-4-20250514': 200000,
  'claude-haiku-3-5-20241022': 200000,
};

function getContextLimit(model) {
  if (!model) return 200000;
  for (const [key, limit] of Object.entries(MODEL_LIMITS)) {
    if (model.includes(key) || key.includes(model)) return limit;
  }
  return 200000;
}

function readStdin() {
  try {
    const raw = readFileSync(0, 'utf-8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function tailRead(filePath, bytes) {
  try {
    const fd = readFileSync(filePath);
    const start = Math.max(0, fd.length - bytes);
    return fd.subarray(start).toString('utf-8');
  } catch {
    return '';
  }
}

function extractLatestUsage(transcriptPath) {
  if (!transcriptPath) return null;

  const tail = tailRead(transcriptPath, TAIL_BYTES);
  if (!tail) return null;

  const lines = tail.split('\n').filter(Boolean);

  // Walk backward to find last assistant message with usage
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type === 'assistant' && entry.message?.usage) {
        const usage = entry.message.usage;
        const model = entry.message?.model || '';
        return {
          inputTokens: usage.input_tokens || 0,
          cacheCreationInputTokens: usage.cache_creation_input_tokens || 0,
          cacheReadInputTokens: usage.cache_read_input_tokens || 0,
          outputTokens: usage.output_tokens || 0,
          model,
          timestamp: entry.timestamp || new Date().toISOString(),
        };
      }
    } catch {
      // Skip malformed lines
    }
  }

  return null;
}

function writeBridge(data) {
  try {
    mkdirSync(dirname(BRIDGE_PATH), { recursive: true });
    const tmpPath = BRIDGE_PATH + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    renameSync(tmpPath, BRIDGE_PATH);
    debug(`Bridge written: session=${data.sessionId}, tool=${data.lastToolUse?.toolName}`);
  } catch (err) {
    debug(`Bridge write error: ${err.message}`);
    process.stderr.write(`[post-tool-use] bridge write error: ${err.message}\n`);
  }
}

function readExistingBridge() {
  try {
    return JSON.parse(readFileSync(BRIDGE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

// Main
debug(`Hook fired. PROJECT_DIR=${PROJECT_DIR}`);

const input = readStdin();
debug(`stdin: ${JSON.stringify({ session_id: input.session_id, tool_name: input.tool_name, has_transcript: !!input.transcript_path })}`);

const sessionId = input.session_id || '';
const toolName = input.tool_name || '';
const transcriptPath = input.transcript_path || '';

const usage = extractLatestUsage(transcriptPath);
debug(`usage: ${usage ? `inputTokens=${usage.inputTokens}, cache=${usage.cacheReadInputTokens}` : 'null'}`);

const existing = readExistingBridge();
const now = Date.now();

const bridge = {
  timestamp: now,
  sessionId,
  model: usage?.model || existing.model || '',
  context: usage
    ? {
        totalContextTokens:
          usage.inputTokens +
          usage.cacheCreationInputTokens +
          usage.cacheReadInputTokens,
        inputTokens: usage.inputTokens,
        cacheCreationInputTokens: usage.cacheCreationInputTokens,
        cacheReadInputTokens: usage.cacheReadInputTokens,
        outputTokens: usage.outputTokens,
        contextLimit: getContextLimit(usage.model),
        utilizationPercent:
          ((usage.inputTokens +
            usage.cacheCreationInputTokens +
            usage.cacheReadInputTokens) /
            getContextLimit(usage.model)) *
          100,
      }
    : existing.context || null,
  lastToolUse: {
    toolName,
    timestamp: now,
  },
  session: {
    active: true,
    lastActivity: now,
  },
};

writeBridge(bridge);
