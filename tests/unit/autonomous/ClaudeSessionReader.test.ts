/**
 * Unit tests for ClaudeSessionReader
 *
 * Spec 014 Phase 1 (T010-T014)
 * - T010: Path encoding (macOS, Linux, Windows paths)
 * - T011: sessions-index.json parsing (valid, empty, missing, sidechain filtering)
 * - T012: Tail-read (normal file, empty file, small file, malformed last line)
 * - T013: Usage extraction (valid assistant message, no assistant messages, missing usage field)
 * - T014: Model lookup (known models, unknown model defaults to 200k)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeSessionReader } from '../../../extension/src/autonomous/ClaudeSessionReader';
// Types available: SessionInfo, SessionUsage (from ClaudeSessionReader)

describe('ClaudeSessionReader', () => {
  let tempDir: string;
  let reader: ClaudeSessionReader;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'claude-session-test-'));
    reader = new ClaudeSessionReader(tempDir);
  });

  afterEach(async () => {
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T010: Path Encoding Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('encodeWorkspacePath (T010)', () => {
    it('should encode macOS path correctly', () => {
      const encoded = reader.encodeWorkspacePath('/Users/douglaswross/Code/eai-gofer');
      expect(encoded).toBe('-Users-douglaswross-Code-eai-gofer');
    });

    it('should encode Linux path correctly', () => {
      const encoded = reader.encodeWorkspacePath('/home/user/projects/my-app');
      expect(encoded).toBe('-home-user-projects-my-app');
    });

    it('should encode Windows path correctly', () => {
      const encoded = reader.encodeWorkspacePath('C:\\Users\\dev\\Code\\eai-gofer');
      expect(encoded).toBe('C:-Users-dev-Code-eai-gofer');
    });

    it('should encode root path', () => {
      const encoded = reader.encodeWorkspacePath('/');
      expect(encoded).toBe('-');
    });

    it('should handle paths with multiple consecutive slashes', () => {
      const encoded = reader.encodeWorkspacePath('/home//user///project');
      expect(encoded).toBe('-home--user---project');
    });

    it('should handle path with trailing slash', () => {
      const encoded = reader.encodeWorkspacePath('/Users/dev/project/');
      expect(encoded).toBe('-Users-dev-project-');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T003: getProjectDir Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getProjectDir', () => {
    it('should return correct project directory', () => {
      const r = new ClaudeSessionReader('/Users/dev/Code/eai-gofer');
      const projectDir = r.getProjectDir();
      const expected = path.join(os.homedir(), '.claude', 'projects', '-Users-dev-Code-eai-gofer');
      expect(projectDir).toBe(expected);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T011: Session Discovery Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('findActiveSession (T011)', () => {
    let projectDir: string;
    let encodedReader: ClaudeSessionReader;

    beforeEach(() => {
      // Create a reader that points to a project directory inside tempDir
      // We'll mock the project dir by creating a reader whose getProjectDir() returns a known path
      projectDir = path.join(tempDir, 'claude-projects');
      fs.mkdirSync(projectDir, { recursive: true });

      // Create a custom reader with overridden getProjectDir
      encodedReader = new ClaudeSessionReader(tempDir);
      // Override getProjectDir to return our test directory
      encodedReader.getProjectDir = () => projectDir;
    });

    it('should return null when project directory does not exist', () => {
      const r = new ClaudeSessionReader('/nonexistent/workspace');
      const result = r.findActiveSession();
      expect(result).toBeNull();
    });

    it('should parse valid sessions-index.json and return most recent session', () => {
      const session1 = 'aaaa-1111-bbbb-2222';
      const session2 = 'cccc-3333-dddd-4444';

      // Create JSONL files with different modification times
      const jsonl1 = path.join(projectDir, `${session1}.jsonl`);
      const jsonl2 = path.join(projectDir, `${session2}.jsonl`);
      fs.writeFileSync(jsonl1, '{"type":"assistant"}\n');
      fs.writeFileSync(jsonl2, '{"type":"assistant"}\n');

      // Make session2 more recent
      const now = new Date();
      const earlier = new Date(now.getTime() - 60000);
      fs.utimesSync(jsonl1, earlier, earlier);
      fs.utimesSync(jsonl2, now, now);

      // Write sessions-index.json
      const indexPath = path.join(projectDir, 'sessions-index.json');
      fs.writeFileSync(
        indexPath,
        JSON.stringify([
          { sessionId: session1, isSidechain: false },
          { sessionId: session2, isSidechain: false },
        ])
      );

      const result = encodedReader.findActiveSession();
      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe(session2);
      expect(result!.isSidechain).toBe(false);
    });

    it('should filter out sidechain sessions', () => {
      const mainSession = 'main-session-id';
      const sidechainSession = 'sidechain-session-id';

      fs.writeFileSync(path.join(projectDir, `${mainSession}.jsonl`), '{"type":"assistant"}\n');
      fs.writeFileSync(
        path.join(projectDir, `${sidechainSession}.jsonl`),
        '{"type":"assistant"}\n'
      );

      const indexPath = path.join(projectDir, 'sessions-index.json');
      fs.writeFileSync(
        indexPath,
        JSON.stringify([
          { sessionId: sidechainSession, isSidechain: true },
          { sessionId: mainSession, isSidechain: false },
        ])
      );

      const result = encodedReader.findActiveSession();
      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe(mainSession);
    });

    it('should handle empty sessions-index.json array', () => {
      const indexPath = path.join(projectDir, 'sessions-index.json');
      fs.writeFileSync(indexPath, '[]');

      const result = encodedReader.findActiveSession();
      expect(result).toBeNull();
    });

    it('should handle malformed sessions-index.json', () => {
      const indexPath = path.join(projectDir, 'sessions-index.json');
      fs.writeFileSync(indexPath, 'not valid json');

      // Should fall back to file scanning but no JSONL files exist
      const result = encodedReader.findActiveSession();
      expect(result).toBeNull();
    });

    it('should handle sessions-index.json with non-object entries', () => {
      const indexPath = path.join(projectDir, 'sessions-index.json');
      fs.writeFileSync(indexPath, JSON.stringify(['string1', null, 42]));

      const result = encodedReader.findActiveSession();
      expect(result).toBeNull();
    });

    it('should fall back to file scanning when sessions-index.json missing', () => {
      const session1 = 'session-1';
      const jsonl1 = path.join(projectDir, `${session1}.jsonl`);
      fs.writeFileSync(jsonl1, '{"type":"assistant"}\n');

      const result = encodedReader.findActiveSession();
      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe(session1);
    });

    it('should skip sessions whose JSONL file does not exist', () => {
      const existingSession = 'existing-session';
      fs.writeFileSync(path.join(projectDir, `${existingSession}.jsonl`), '{"type":"assistant"}\n');

      const indexPath = path.join(projectDir, 'sessions-index.json');
      fs.writeFileSync(
        indexPath,
        JSON.stringify([
          { sessionId: 'missing-session', isSidechain: false },
          { sessionId: existingSession, isSidechain: false },
        ])
      );

      const result = encodedReader.findActiveSession();
      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe(existingSession);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T012: Tail-Read Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('tailReadFile (T012)', () => {
    it('should read the last N bytes of a file', () => {
      const filePath = path.join(tempDir, 'large-file.jsonl');
      const content = 'A'.repeat(1000) + 'LAST_LINE\n';
      fs.writeFileSync(filePath, content);

      const tail = reader.tailReadFile(filePath, 20);
      expect(tail).toContain('LAST_LINE');
      expect(tail.length).toBeLessThanOrEqual(20);
    });

    it('should return empty string for empty file', () => {
      const filePath = path.join(tempDir, 'empty.jsonl');
      fs.writeFileSync(filePath, '');

      const tail = reader.tailReadFile(filePath);
      expect(tail).toBe('');
    });

    it('should return entire content for small file', () => {
      const filePath = path.join(tempDir, 'small.jsonl');
      const content = '{"type":"assistant"}\n';
      fs.writeFileSync(filePath, content);

      const tail = reader.tailReadFile(filePath, 10240);
      expect(tail).toBe(content);
    });

    it('should handle non-existent file gracefully', () => {
      const tail = reader.tailReadFile('/nonexistent/file.jsonl');
      expect(tail).toBe('');
    });

    it('should handle file with multiple lines and return last portion', () => {
      const filePath = path.join(tempDir, 'multi.jsonl');
      const lines: string[] = [];
      for (let i = 0; i < 100; i++) {
        lines.push(JSON.stringify({ type: 'assistant', index: i }));
      }
      fs.writeFileSync(filePath, lines.join('\n') + '\n');

      const tail = reader.tailReadFile(filePath, 200);
      // Should contain the last few lines
      expect(tail).toContain('"index":99');
    });

    it('should use default bytes when not specified', () => {
      const filePath = path.join(tempDir, 'default.jsonl');
      const content = 'X'.repeat(20000) + 'END\n';
      fs.writeFileSync(filePath, content);

      const tail = reader.tailReadFile(filePath);
      // Default is 10240 bytes
      expect(tail.length).toBeLessThanOrEqual(10240);
      expect(tail).toContain('END');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T013: Usage Extraction Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('extractUsageFromFile (T013)', () => {
    it('should extract usage from valid assistant message', () => {
      const filePath = path.join(tempDir, 'session.jsonl');
      const entry = {
        type: 'assistant',
        timestamp: '2026-01-29T10:00:00Z',
        message: {
          model: 'claude-opus-4-5-20251101',
          role: 'assistant',
          usage: {
            input_tokens: 50000,
            cache_creation_input_tokens: 10000,
            cache_read_input_tokens: 30000,
            output_tokens: 2000,
          },
        },
      };
      fs.writeFileSync(filePath, JSON.stringify(entry) + '\n');

      const usage = reader.extractUsageFromFile(filePath);
      expect(usage).not.toBeNull();
      expect(usage!.inputTokens).toBe(50000);
      expect(usage!.cacheCreationInputTokens).toBe(10000);
      expect(usage!.cacheReadInputTokens).toBe(30000);
      expect(usage!.outputTokens).toBe(2000);
      expect(usage!.totalContextTokens).toBe(90000);
      expect(usage!.model).toBe('claude-opus-4-5-20251101');
      expect(usage!.timestamp).toBe('2026-01-29T10:00:00Z');
    });

    it('should return last assistant message with usage from multiple entries', () => {
      const filePath = path.join(tempDir, 'multi-session.jsonl');
      const entries = [
        {
          type: 'human',
          timestamp: '2026-01-29T10:00:00Z',
          message: { role: 'user' },
        },
        {
          type: 'assistant',
          timestamp: '2026-01-29T10:00:01Z',
          message: {
            model: 'claude-opus-4-5-20251101',
            usage: {
              input_tokens: 10000,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              output_tokens: 500,
            },
          },
        },
        {
          type: 'human',
          timestamp: '2026-01-29T10:00:02Z',
          message: { role: 'user' },
        },
        {
          type: 'assistant',
          timestamp: '2026-01-29T10:00:03Z',
          message: {
            model: 'claude-opus-4-5-20251101',
            usage: {
              input_tokens: 80000,
              cache_creation_input_tokens: 5000,
              cache_read_input_tokens: 25000,
              output_tokens: 1500,
            },
          },
        },
      ];
      fs.writeFileSync(filePath, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');

      const usage = reader.extractUsageFromFile(filePath);
      expect(usage).not.toBeNull();
      expect(usage!.inputTokens).toBe(80000);
      expect(usage!.totalContextTokens).toBe(110000);
    });

    it('should return null when no assistant messages exist', () => {
      const filePath = path.join(tempDir, 'no-assistant.jsonl');
      const entry = {
        type: 'human',
        timestamp: '2026-01-29T10:00:00Z',
        message: { role: 'user' },
      };
      fs.writeFileSync(filePath, JSON.stringify(entry) + '\n');

      const usage = reader.extractUsageFromFile(filePath);
      expect(usage).toBeNull();
    });

    it('should return null when assistant message has no usage field', () => {
      const filePath = path.join(tempDir, 'no-usage.jsonl');
      const entry = {
        type: 'assistant',
        timestamp: '2026-01-29T10:00:00Z',
        message: {
          model: 'claude-opus-4-5-20251101',
          role: 'assistant',
          // No usage field
        },
      };
      fs.writeFileSync(filePath, JSON.stringify(entry) + '\n');

      const usage = reader.extractUsageFromFile(filePath);
      expect(usage).toBeNull();
    });

    it('should handle empty file', () => {
      const filePath = path.join(tempDir, 'empty.jsonl');
      fs.writeFileSync(filePath, '');

      const usage = reader.extractUsageFromFile(filePath);
      expect(usage).toBeNull();
    });

    it('should skip malformed JSON lines and find valid entries', () => {
      const filePath = path.join(tempDir, 'malformed.jsonl');
      const validEntry = JSON.stringify({
        type: 'assistant',
        timestamp: '2026-01-29T10:00:00Z',
        message: {
          model: 'claude-opus-4-5-20251101',
          usage: {
            input_tokens: 40000,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
            output_tokens: 1000,
          },
        },
      });
      const content = validEntry + '\n{broken json\n';
      fs.writeFileSync(filePath, content);

      const usage = reader.extractUsageFromFile(filePath);
      expect(usage).not.toBeNull();
      expect(usage!.inputTokens).toBe(40000);
    });

    it('should handle missing optional usage fields', () => {
      const filePath = path.join(tempDir, 'partial-usage.jsonl');
      const entry = {
        type: 'assistant',
        timestamp: '2026-01-29T10:00:00Z',
        message: {
          model: 'claude-opus-4-5-20251101',
          usage: {
            input_tokens: 50000,
            // Missing cache fields and output_tokens
          },
        },
      };
      fs.writeFileSync(filePath, JSON.stringify(entry) + '\n');

      const usage = reader.extractUsageFromFile(filePath);
      expect(usage).not.toBeNull();
      expect(usage!.inputTokens).toBe(50000);
      expect(usage!.cacheCreationInputTokens).toBe(0);
      expect(usage!.cacheReadInputTokens).toBe(0);
      expect(usage!.outputTokens).toBe(0);
      expect(usage!.totalContextTokens).toBe(50000);
    });

    it('should default model to unknown when missing', () => {
      const filePath = path.join(tempDir, 'no-model.jsonl');
      const entry = {
        type: 'assistant',
        message: {
          usage: {
            input_tokens: 10000,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
            output_tokens: 500,
          },
        },
      };
      fs.writeFileSync(filePath, JSON.stringify(entry) + '\n');

      const usage = reader.extractUsageFromFile(filePath);
      expect(usage).not.toBeNull();
      expect(usage!.model).toBe('unknown');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T014: Model Lookup Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getModelContextLimit (T014)', () => {
    it('should return 200k for claude-opus-4-5-20251101', () => {
      expect(reader.getModelContextLimit('claude-opus-4-5-20251101')).toBe(200000);
    });

    it('should return 200k for claude-opus-4-20250514', () => {
      expect(reader.getModelContextLimit('claude-opus-4-20250514')).toBe(200000);
    });

    it('should return 200k for claude-sonnet-4-20250514', () => {
      expect(reader.getModelContextLimit('claude-sonnet-4-20250514')).toBe(200000);
    });

    it('should return 200k for claude-3-5-sonnet-20241022', () => {
      expect(reader.getModelContextLimit('claude-3-5-sonnet-20241022')).toBe(200000);
    });

    it('should return 200k for claude-3-5-haiku-20241022', () => {
      expect(reader.getModelContextLimit('claude-3-5-haiku-20241022')).toBe(200000);
    });

    it('should return 1M for current Claude Opus and Sonnet routes', () => {
      expect(reader.getModelContextLimit('claude-opus-4-8')).toBe(1000000);
      expect(reader.getModelContextLimit('claude-sonnet-4-6')).toBe(1000000);
    });

    it('should return 200k for unknown models', () => {
      expect(reader.getModelContextLimit('unknown-model')).toBe(200000);
    });

    it('should return 200k for empty string', () => {
      expect(reader.getModelContextLimit('')).toBe(200000);
    });

    it('should handle prefix matching for model variants', () => {
      // A model ID that starts with a known prefix
      expect(reader.getModelContextLimit('claude-opus-4-5-20251101-preview')).toBe(200000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T008: Privacy Guard Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Privacy Guard (T008)', () => {
    it('should have approved fields defined', () => {
      const fields = ClaudeSessionReader.getApprovedFields();
      expect(fields.size).toBeGreaterThan(0);
    });

    it('should include type, timestamp, sessionId in approved fields', () => {
      const fields = ClaudeSessionReader.getApprovedFields();
      expect(fields.has('type')).toBe(true);
      expect(fields.has('timestamp')).toBe(true);
      expect(fields.has('sessionId')).toBe(true);
    });

    it('should include usage fields in approved fields', () => {
      const fields = ClaudeSessionReader.getApprovedFields();
      expect(fields.has('message.usage')).toBe(true);
      expect(fields.has('message.usage.input_tokens')).toBe(true);
      expect(fields.has('message.usage.cache_creation_input_tokens')).toBe(true);
      expect(fields.has('message.usage.cache_read_input_tokens')).toBe(true);
      expect(fields.has('message.usage.output_tokens')).toBe(true);
    });

    it('should include message.model in approved fields', () => {
      const fields = ClaudeSessionReader.getApprovedFields();
      expect(fields.has('message.model')).toBe(true);
    });

    it('should NOT include message.content in approved fields', () => {
      const fields = ClaudeSessionReader.getApprovedFields();
      expect(fields.has('message.content')).toBe(false);
    });

    it('should verify source code does not access message.content in executable code', () => {
      const sourcePath = path.resolve(
        __dirname,
        '../../../extension/src/autonomous/ClaudeSessionReader.ts'
      );
      const source = fs.readFileSync(sourcePath, 'utf-8');

      // Strip comments and JSDoc blocks before checking
      const codeOnly = source
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*$/gm, ''); // Remove line comments

      // Ensure executable code never accesses .content on messages
      expect(codeOnly).not.toContain('message.content');
      expect(codeOnly).not.toContain("record['content']");
      expect(codeOnly).not.toContain('record["content"]');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getLatestUsage Integration
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getLatestUsage', () => {
    it('should return null when no active session exists', () => {
      const r = new ClaudeSessionReader('/nonexistent/workspace');
      const usage = r.getLatestUsage();
      expect(usage).toBeNull();
    });
  });
});
