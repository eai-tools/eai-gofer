/**
 * ClaudeSessionReader
 *
 * Reads Claude Code JSONL session logs to extract real token usage data.
 * Discovers active sessions for the current workspace and tail-reads
 * the latest assistant message to get accurate context window utilization.
 *
 * Privacy: Only reads approved fields (type, timestamp, sessionId,
 * message.usage, message.model). Never accesses message.content.
 *
 * Spec 014 Phase 1 (T001-T008)
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/** Information about a discovered Claude Code session */
export interface SessionInfo {
  /** Session ID (UUID) */
  sessionId: string;
  /** Full path to the JSONL file */
  jsonlPath: string;
  /** Last modification time (Unix ms) */
  lastModified: number;
  /** Whether this is a sidechain session */
  isSidechain: boolean;
}

/** Token usage data extracted from a session */
export interface SessionUsage {
  /** Total input tokens in the last assistant message */
  inputTokens: number;
  /** Cache creation input tokens */
  cacheCreationInputTokens: number;
  /** Cache read input tokens */
  cacheReadInputTokens: number;
  /** Output tokens in the last assistant message */
  outputTokens: number;
  /** Total context tokens (input + cache_creation + cache_read) */
  totalContextTokens: number;
  /** Model ID from the last assistant message */
  model: string;
  /** Timestamp of the last assistant message */
  timestamp: string;
}

/** Approved fields that may be read from JSONL entries */
const APPROVED_FIELDS = new Set([
  'type',
  'timestamp',
  'sessionId',
  'message.usage',
  'message.usage.input_tokens',
  'message.usage.cache_creation_input_tokens',
  'message.usage.cache_read_input_tokens',
  'message.usage.output_tokens',
  'message.model',
  'message.role',
]);

/** Model context window sizes (tokens) */
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // Claude Opus models
  'claude-opus-4-8': 1000000,
  'claude-opus-4-7': 1000000,
  'claude-opus-4-6': 1000000,
  'claude-opus-4-5-20251101': 200000,
  'claude-opus-4-20250514': 200000,
  // Claude Sonnet models
  'claude-sonnet-4-6': 1000000,
  'claude-sonnet-4-20250514': 200000,
  'claude-sonnet-4-5-20250514': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-sonnet-20240620': 200000,
  // Claude Haiku models
  'claude-3-5-haiku-20241022': 200000,
  'claude-3-haiku-20240307': 200000,
};

/** Default context limit for unknown models */
const DEFAULT_CONTEXT_LIMIT = 200000;

/** Default number of bytes to tail-read from JSONL files */
const DEFAULT_TAIL_BYTES = 10240; // ~10KB

export class ClaudeSessionReader {
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Path Encoding (T002)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Encodes a workspace path to the Claude Code project directory format.
   * Converts `/Users/x/Code/eai-gofer` to `-Users-x-Code-eai-gofer`.
   *
   * @param workspacePath - Absolute workspace path
   * @returns Encoded directory name
   */
  encodeWorkspacePath(workspacePath: string): string {
    // Replace all path separators with dashes
    // On Windows, normalize backslashes to forward slashes first
    const normalized = workspacePath.replace(/\\/g, '/');
    return normalized.replace(/\//g, '-');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Project Directory (T003)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Resolves the Claude Code project directory for the current workspace.
   *
   * @returns Absolute path to `~/.claude/projects/{encoded}`
   */
  getProjectDir(): string {
    const encoded = this.encodeWorkspacePath(this.workspacePath);
    return path.join(os.homedir(), '.claude', 'projects', encoded);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Session Discovery (T004)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Finds the most recent active (non-sidechain) session for this workspace.
   * First tries sessions-index.json, then falls back to scanning JSONL files
   * by modification time.
   *
   * @returns SessionInfo or null if no session found
   */
  findActiveSession(): SessionInfo | null {
    const projectDir = this.getProjectDir();

    if (!fs.existsSync(projectDir)) {
      return null;
    }

    let session: SessionInfo | null = null;

    // Try sessions-index.json first
    const indexPath = path.join(projectDir, 'sessions-index.json');
    if (fs.existsSync(indexPath)) {
      try {
        const indexContent = fs.readFileSync(indexPath, 'utf-8');
        const sessions = JSON.parse(indexContent);
        session = this.findBestSessionFromIndex(sessions, projectDir);
      } catch {
        // Fall through to JSONL scan
      }
    }

    // Fallback: scan JSONL files by modification time
    if (!session) {
      session = this.findBestSessionFromFiles(projectDir);
    }

    // Staleness check: if the JSONL file hasn't been modified in 5 minutes,
    // treat it as no active session (session is likely ended)
    if (session) {
      const staleThresholdMs = 5 * 60 * 1000; // 5 minutes
      const age = Date.now() - session.lastModified;
      if (age > staleThresholdMs) {
        return null;
      }
    }

    return session;
  }

  /**
   * Finds the best session from sessions-index.json data.
   * Selects the most recently modified non-sidechain session.
   */
  private findBestSessionFromIndex(sessions: unknown, projectDir: string): SessionInfo | null {
    if (!Array.isArray(sessions)) {
      return null;
    }

    const candidates: SessionInfo[] = [];

    for (const entry of sessions) {
      if (typeof entry !== 'object' || entry === null) {
        continue;
      }

      const record = entry as Record<string, unknown>;
      const sessionId = record.sessionId as string | undefined;
      if (!sessionId || typeof sessionId !== 'string') {
        continue;
      }

      const isSidechain = Boolean(record.isSidechain);
      if (isSidechain) {
        continue;
      }

      const jsonlPath = path.join(projectDir, `${sessionId}.jsonl`);
      if (!fs.existsSync(jsonlPath)) {
        continue;
      }

      try {
        const stat = fs.statSync(jsonlPath);
        candidates.push({
          sessionId,
          jsonlPath,
          lastModified: stat.mtimeMs,
          isSidechain: false,
        });
      } catch {
        // Skip unreadable files
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Return most recently modified
    candidates.sort((a, b) => b.lastModified - a.lastModified);
    return candidates[0];
  }

  /**
   * Finds the best session by scanning JSONL files in the project directory.
   * Used as fallback when sessions-index.json is unavailable.
   */
  private findBestSessionFromFiles(projectDir: string): SessionInfo | null {
    try {
      const entries = fs.readdirSync(projectDir, { withFileTypes: true });
      const jsonlFiles: SessionInfo[] = [];

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.jsonl')) {
          continue;
        }

        const fullPath = path.join(projectDir, entry.name);
        const sessionId = entry.name.replace('.jsonl', '');

        try {
          const stat = fs.statSync(fullPath);
          jsonlFiles.push({
            sessionId,
            jsonlPath: fullPath,
            lastModified: stat.mtimeMs,
            isSidechain: false,
          });
        } catch {
          // Skip unreadable files
        }
      }

      if (jsonlFiles.length === 0) {
        return null;
      }

      jsonlFiles.sort((a, b) => b.lastModified - a.lastModified);
      return jsonlFiles[0];
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tail Read (T005)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Reads the last N bytes of a file. Efficient for large JSONL files
   * since we only need the most recent entries.
   *
   * @param filePath - Path to the file
   * @param bytes - Number of bytes to read from end (default: 10KB)
   * @returns The tail content as a string
   */
  tailReadFile(filePath: string, bytes: number = DEFAULT_TAIL_BYTES): string {
    let fd: number | undefined;
    try {
      fd = fs.openSync(filePath, 'r');
      const stat = fs.fstatSync(fd);
      const fileSize = stat.size;

      if (fileSize === 0) {
        return '';
      }

      if (fileSize <= bytes) {
        return fs.readFileSync(fd, 'utf-8');
      }

      const start = fileSize - bytes;
      const buffer = Buffer.alloc(bytes);
      fs.readSync(fd, buffer, 0, bytes, start);
      return buffer.toString('utf-8');
    } catch {
      return '';
    } finally {
      if (fd !== undefined) {
        fs.closeSync(fd);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Usage Extraction (T006)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Gets the latest token usage from the active session.
   * Tail-reads the JSONL file and parses the last assistant message
   * with usage data.
   *
   * @returns SessionUsage or null if no usage data found
   */
  getLatestUsage(): SessionUsage | null {
    const session = this.findActiveSession();
    if (!session) {
      return null;
    }

    return this.extractUsageFromFile(session.jsonlPath);
  }

  /**
   * Extracts usage data from a JSONL file by tail-reading.
   *
   * @param jsonlPath - Path to the JSONL file
   * @returns SessionUsage or null
   */
  extractUsageFromFile(jsonlPath: string): SessionUsage | null {
    const tailContent = this.tailReadFile(jsonlPath);
    if (!tailContent) {
      return null;
    }

    const lines = tailContent.split('\n');

    // Walk backward through lines to find the last assistant message with usage
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) {
        continue;
      }

      try {
        const entry = JSON.parse(line);
        const usage = this.extractUsageFromEntry(entry);
        if (usage) {
          return usage;
        }
      } catch {
        // Skip malformed JSON lines (common when tail-reading mid-line)
        continue;
      }
    }

    return null;
  }

  /**
   * Extracts usage data from a single JSONL entry.
   * Only accesses approved fields (privacy guard).
   *
   * @param entry - Parsed JSONL entry
   * @returns SessionUsage or null if not an assistant message with usage
   */
  private extractUsageFromEntry(entry: unknown): SessionUsage | null {
    if (typeof entry !== 'object' || entry === null) {
      return null;
    }

    const record = entry as Record<string, unknown>;

    // Only process assistant messages with usage data
    if (record.type !== 'assistant') {
      return null;
    }

    const message = record.message as Record<string, unknown> | undefined;
    if (!message || typeof message !== 'object') {
      return null;
    }

    // Privacy guard: only access approved fields
    const usage = message.usage as Record<string, unknown> | undefined;
    if (!usage || typeof usage !== 'object') {
      return null;
    }

    const model = typeof message.model === 'string' ? message.model : 'unknown';
    const timestamp = typeof record.timestamp === 'string' ? record.timestamp : '';

    const inputTokens = typeof usage.input_tokens === 'number' ? usage.input_tokens : 0;
    const cacheCreationInputTokens =
      typeof usage.cache_creation_input_tokens === 'number' ? usage.cache_creation_input_tokens : 0;
    const cacheReadInputTokens =
      typeof usage.cache_read_input_tokens === 'number' ? usage.cache_read_input_tokens : 0;
    const outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens : 0;

    return {
      inputTokens,
      cacheCreationInputTokens,
      cacheReadInputTokens,
      outputTokens,
      totalContextTokens: inputTokens + cacheCreationInputTokens + cacheReadInputTokens,
      model,
      timestamp,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Context Limit Lookup (T007)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Returns the context window size for a given model ID.
   * Unknown models default to 200k tokens.
   *
   * @param modelId - Claude model identifier
   * @returns Context window size in tokens
   */
  getModelContextLimit(modelId: string): number {
    const normalizedModelId = modelId.trim();
    if (!normalizedModelId) {
      return DEFAULT_CONTEXT_LIMIT;
    }

    // Try exact match first
    if (MODEL_CONTEXT_LIMITS[normalizedModelId]) {
      return MODEL_CONTEXT_LIMITS[normalizedModelId];
    }

    // Try prefix match (e.g., "claude-opus-4-5" matches "claude-opus-4-5-20251101")
    for (const [key, limit] of Object.entries(MODEL_CONTEXT_LIMITS)) {
      if (normalizedModelId.startsWith(key) || key.startsWith(normalizedModelId)) {
        return limit;
      }
    }

    return DEFAULT_CONTEXT_LIMIT;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Privacy Guard (T008)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Returns the set of approved fields that this reader may access.
   * Used in structural tests to verify privacy compliance.
   */
  static getApprovedFields(): ReadonlySet<string> {
    return APPROVED_FIELDS;
  }
}
