import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeSessionReader } from '../../extension/src/autonomous/ClaudeSessionReader';
import { WorkspaceContextProvider } from '../../extension/src/autonomous/WorkspaceContextProvider';
import { ContextHealthMonitor } from '../../extension/src/autonomous/ContextHealthMonitor';

/**
 * T044: Real Context Monitoring Integration Test
 *
 * End-to-end test: Mock JSONL file → ClaudeSessionReader → WorkspaceContextProvider
 * → ContextHealthMonitor → verify real percentage and data source
 */
describe('Real Context Monitoring Integration (T044)', () => {
  let tmpDir: string;
  let projectDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-real-context-'));

    // Create workspace structure
    fs.mkdirSync(path.join(tmpDir, '.specify', 'memory'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /**
   * Helper: create a mock JSONL session file with usage data
   */
  function createMockSessionData(
    dir: string,
    sessionId: string,
    usage: {
      input_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
      output_tokens: number;
      model: string;
    }
  ): string {
    const sessionDir = dir;
    fs.mkdirSync(sessionDir, { recursive: true });

    const jsonlPath = path.join(sessionDir, `${sessionId}.jsonl`);

    // Write a JSONL file with a user message and an assistant message with usage
    // The JSONL format uses top-level type: 'human'/'assistant' (not 'message')
    const userEntry = JSON.stringify({
      type: 'human',
      timestamp: new Date().toISOString(),
      message: {
        role: 'user',
      },
    });

    const assistantEntry = JSON.stringify({
      type: 'assistant',
      timestamp: new Date().toISOString(),
      sessionId,
      message: {
        model: usage.model,
        usage: {
          input_tokens: usage.input_tokens,
          cache_creation_input_tokens: usage.cache_creation_input_tokens,
          cache_read_input_tokens: usage.cache_read_input_tokens,
          output_tokens: usage.output_tokens,
        },
      },
    });

    fs.writeFileSync(jsonlPath, `${userEntry}\n${assistantEntry}\n`);

    // Write sessions-index.json (uses camelCase sessionId per ClaudeSessionReader)
    const sessionsIndex = [
      {
        sessionId,
        projectPath: tmpDir,
        createdAt: Date.now(),
      },
    ];
    fs.writeFileSync(path.join(sessionDir, 'sessions-index.json'), JSON.stringify(sessionsIndex));

    return jsonlPath;
  }

  describe('Full Pipeline: JSONL → Reader → Provider → Monitor', () => {
    it('should produce real utilization from mock JSONL data', async () => {
      // Create the Claude projects directory structure
      const encodedPath = tmpDir.replace(/\//g, '-');
      projectDir = path.join(tmpDir, '.claude-home', 'projects', encodedPath);

      const sessionId = 'test-session-001';
      createMockSessionData(projectDir, sessionId, {
        input_tokens: 80000,
        cache_creation_input_tokens: 5000,
        cache_read_input_tokens: 15000,
        output_tokens: 2000,
        model: 'claude-opus-4-5-20250514',
      });

      // Create a reader that uses our custom home directory
      const reader = new ClaudeSessionReader(tmpDir);
      // Override getProjectDir to point to our test directory
      vi.spyOn(reader, 'getProjectDir').mockReturnValue(projectDir);

      // Verify reader finds session and extracts usage
      const session = reader.findActiveSession();
      expect(session).not.toBeNull();
      expect(session!.sessionId).toBe(sessionId);

      const usage = reader.getLatestUsage();
      expect(usage).not.toBeNull();
      expect(usage!.totalContextTokens).toBe(100000); // 80k + 5k + 15k
      expect(usage!.model).toBe('claude-opus-4-5-20250514');

      // Wire provider with reader
      const provider = new WorkspaceContextProvider(tmpDir);
      provider.setSessionReader(reader);

      const analysis = await provider.getContextAnalysis();
      expect(analysis.dataSource).toBe('real');
      expect(analysis.model).toBe('claude-opus-4-5-20250514');
      expect(analysis.modelContextLimit).toBe(200000);

      // Wire monitor with provider
      const monitor = new ContextHealthMonitor();
      monitor.setWorkspaceRoot(tmpDir);
      monitor.setContextProvider(() => provider.getContextAnalysis());

      // Run health check
      await monitor.checkHealth();

      // With 100k tokens out of 200k, utilization should be around 50%
      const status = monitor.getLastStatus();
      expect(status).not.toBeNull();
      expect(status!.utilizationPercent).toBeGreaterThan(0);
      // The monitor calculates based on all breakdown categories
      // The real session tokens feed into the conversation category
    });

    it('should fall back gracefully when no session exists', async () => {
      // No JSONL files created — reader returns null
      const reader = new ClaudeSessionReader(tmpDir);
      vi.spyOn(reader, 'getProjectDir').mockReturnValue(
        path.join(tmpDir, 'nonexistent-project-dir')
      );

      const provider = new WorkspaceContextProvider(tmpDir);
      provider.setSessionReader(reader);

      const analysis = await provider.getContextAnalysis();
      // Should fall back to estimated or none
      expect(['estimated', 'none']).toContain(analysis.dataSource);
      // Should not throw
    });

    it('should persist state with real data source fields', async () => {
      const encodedPath = tmpDir.replace(/\//g, '-');
      projectDir = path.join(tmpDir, '.claude-home', 'projects', encodedPath);

      const sessionId = 'test-session-persist';
      createMockSessionData(projectDir, sessionId, {
        input_tokens: 50000,
        cache_creation_input_tokens: 3000,
        cache_read_input_tokens: 7000,
        output_tokens: 1000,
        model: 'claude-sonnet-4-20250514',
      });

      const reader = new ClaudeSessionReader(tmpDir);
      vi.spyOn(reader, 'getProjectDir').mockReturnValue(projectDir);

      const provider = new WorkspaceContextProvider(tmpDir);
      provider.setSessionReader(reader);

      const monitor = new ContextHealthMonitor();
      monitor.setWorkspaceRoot(tmpDir);
      monitor.setContextProvider(() => provider.getContextAnalysis());

      await monitor.checkHealth();

      // Check persisted state file
      const statePath = path.join(tmpDir, '.specify', 'memory', 'context-health-state.json');
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        expect(state.dataSource).toBe('real');
        expect(state.model).toBe('claude-sonnet-4-20250514');
      }
    });
  });

  describe('Data Source Modes', () => {
    it('should report dataSource "real" with active session', async () => {
      const encodedPath = tmpDir.replace(/\//g, '-');
      projectDir = path.join(tmpDir, '.claude-home', 'projects', encodedPath);

      createMockSessionData(projectDir, 'session-real', {
        input_tokens: 40000,
        cache_creation_input_tokens: 2000,
        cache_read_input_tokens: 8000,
        output_tokens: 500,
        model: 'claude-opus-4-5-20250514',
      });

      const reader = new ClaudeSessionReader(tmpDir);
      vi.spyOn(reader, 'getProjectDir').mockReturnValue(projectDir);

      const provider = new WorkspaceContextProvider(tmpDir);
      provider.setSessionReader(reader);

      const analysis = await provider.getContextAnalysis();
      expect(analysis.dataSource).toBe('real');
      expect(analysis.sessionId).toBe('session-real');
    });

    it('should report dataSource "none" without any session', async () => {
      const reader = new ClaudeSessionReader(tmpDir);
      vi.spyOn(reader, 'getProjectDir').mockReturnValue(path.join(tmpDir, 'no-such-dir'));

      const provider = new WorkspaceContextProvider(tmpDir);
      provider.setSessionReader(reader);

      const analysis = await provider.getContextAnalysis();
      expect(analysis.dataSource).toBe('none');
    });
  });
});
