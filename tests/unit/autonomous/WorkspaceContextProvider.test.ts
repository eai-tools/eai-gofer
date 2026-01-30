import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WorkspaceContextProvider } from '../../../extension/src/autonomous/WorkspaceContextProvider';
import type { EnhancedContextAnalysis } from '../../../extension/src/autonomous/WorkspaceContextProvider';
import { ContextHealthMonitor } from '../../../extension/src/autonomous/ContextHealthMonitor';
import type {
  ClaudeSessionReader,
  SessionUsage,
  SessionInfo,
} from '../../../extension/src/autonomous/ClaudeSessionReader';

/**
 * T018: Unit tests for WorkspaceContextProvider
 * T019: Integration test verifying ContextHealthMonitor returns non-null with provider
 * T020: Tests for real-data and fallback paths (Spec 014)
 */

describe('WorkspaceContextProvider (T018)', () => {
  let tmpDir: string;
  let provider: WorkspaceContextProvider;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-wcp-test-'));
    provider = new WorkspaceContextProvider(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('estimateTokenBreakdown', () => {
    it('should return zero tokens for empty workspace', () => {
      const breakdown = provider.estimateTokenBreakdown();

      expect(breakdown.specArtifacts).toBe(0);
      expect(breakdown.memories).toBe(0);
      expect(breakdown.hints).toBe(0);
      expect(breakdown.systemFiles).toBe(0);
      expect(breakdown.observations).toBe(0);
      expect(breakdown.conversation).toBe(0);
    });

    it('should count spec artifact tokens', () => {
      const specDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
      fs.mkdirSync(specDir, { recursive: true });
      // Write 400 bytes = ~100 tokens (chars/4)
      fs.writeFileSync(path.join(specDir, 'spec.md'), 'x'.repeat(400));
      fs.writeFileSync(path.join(specDir, 'plan.md'), 'y'.repeat(200));

      const breakdown = provider.estimateTokenBreakdown();

      expect(breakdown.specArtifacts).toBe(150); // 600 bytes / 4
    });

    it('should count hint tokens', () => {
      const hintsDir = path.join(tmpDir, '.specify', 'hints');
      fs.mkdirSync(hintsDir, { recursive: true });
      fs.writeFileSync(path.join(hintsDir, 'global.md'), 'h'.repeat(800));

      const breakdown = provider.estimateTokenBreakdown();

      expect(breakdown.hints).toBe(200); // 800 / 4
    });

    it('should count system file tokens', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), 'c'.repeat(1200));
      fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), 'a'.repeat(400));

      const breakdown = provider.estimateTokenBreakdown();

      expect(breakdown.systemFiles).toBe(400); // 1600 / 4
    });

    it('should count memory tokens from local.json', () => {
      const memDir = path.join(tmpDir, '.specify', 'memory');
      fs.mkdirSync(memDir, { recursive: true });
      fs.writeFileSync(path.join(memDir, 'local.json'), 'm'.repeat(2000));

      const breakdown = provider.estimateTokenBreakdown();

      expect(breakdown.memories).toBe(500); // 2000 / 4
    });

    it('should count observation cache tokens', () => {
      const cacheDir = path.join(tmpDir, '.specify', 'memory', 'observation-cache');
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(path.join(cacheDir, 'obs1.json'), 'o'.repeat(400));
      fs.writeFileSync(path.join(cacheDir, 'obs2.json'), 'p'.repeat(400));

      const breakdown = provider.estimateTokenBreakdown();

      expect(breakdown.observations).toBe(200); // 800 / 4
    });
  });

  describe('detectCurrentStage', () => {
    it('should return unknown for empty workspace', () => {
      expect(provider.detectCurrentStage()).toBe('unknown');
    });

    it('should return unknown for empty specs directory', () => {
      fs.mkdirSync(path.join(tmpDir, '.specify', 'specs'), { recursive: true });
      expect(provider.detectCurrentStage()).toBe('unknown');
    });

    it('should detect research stage', () => {
      const specDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'research.md'), '# Research');

      expect(provider.detectCurrentStage()).toBe('research');
    });

    it('should detect specify stage', () => {
      const specDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), '# Spec');

      expect(provider.detectCurrentStage()).toBe('specify');
    });

    it('should detect plan stage', () => {
      const specDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), '# Spec');
      fs.writeFileSync(path.join(specDir, 'plan.md'), '# Plan');

      expect(provider.detectCurrentStage()).toBe('plan');
    });

    it('should detect tasks stage (no completed tasks)', () => {
      const specDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), '# Spec');
      fs.writeFileSync(path.join(specDir, 'plan.md'), '# Plan');
      fs.writeFileSync(path.join(specDir, 'tasks.md'), '- [ ] T001 Do something');

      expect(provider.detectCurrentStage()).toBe('tasks');
    });

    it('should detect implement stage (has completed tasks)', () => {
      const specDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), '# Spec');
      fs.writeFileSync(path.join(specDir, 'plan.md'), '# Plan');
      fs.writeFileSync(path.join(specDir, 'tasks.md'), '- [X] T001 Done\n- [ ] T002 Pending');

      expect(provider.detectCurrentStage()).toBe('implement');
    });

    it('should detect validate stage', () => {
      const specDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), '# Spec');
      fs.writeFileSync(path.join(specDir, 'validation-report.md'), '# Report');

      expect(provider.detectCurrentStage()).toBe('validate');
    });
  });

  describe('getContextAnalysis', () => {
    it('should return ContextAnalysisInput shape', () => {
      const analysis = provider.getContextAnalysis();

      expect(analysis).toHaveProperty('breakdown');
      expect(analysis).toHaveProperty('stage');
      expect(typeof analysis.breakdown).toBe('object');
      expect(typeof analysis.stage).toBe('string');
    });

    it('should include all token breakdown categories', () => {
      const analysis = provider.getContextAnalysis();
      const breakdown = analysis.breakdown;

      expect(breakdown).toHaveProperty('specArtifacts');
      expect(breakdown).toHaveProperty('memories');
      expect(breakdown).toHaveProperty('hints');
      expect(breakdown).toHaveProperty('observations');
      expect(breakdown).toHaveProperty('systemFiles');
      expect(breakdown).toHaveProperty('conversation');
    });
  });
});

describe('ContextHealthMonitor with provider (T019)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-chm-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return non-null status when provider is set', () => {
    const monitor = new ContextHealthMonitor();
    const provider = new WorkspaceContextProvider(tmpDir);

    monitor.setContextProvider(() => provider.getContextAnalysis());
    const status = monitor.checkHealth();

    // With a provider set, checkHealth should return a real status
    expect(status).not.toBeNull();
    if (status) {
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('tokensUsed');
      expect(status).toHaveProperty('tokensLimit');
      expect(status).toHaveProperty('utilizationPercent');
      expect(['healthy', 'warning', 'critical']).toContain(status.status);
    }
  });

  it('should return null status without provider', () => {
    const monitor = new ContextHealthMonitor();
    const status = monitor.checkHealth();

    expect(status).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T020: Real-data and fallback path tests (Spec 014 Phase 2)
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkspaceContextProvider with SessionReader (T020)', () => {
  let tmpDir: string;
  let provider: WorkspaceContextProvider;
  let mockReader: ClaudeSessionReader;

  const mockUsage: SessionUsage = {
    inputTokens: 50000,
    cacheCreationInputTokens: 10000,
    cacheReadInputTokens: 30000,
    outputTokens: 2000,
    totalContextTokens: 90000,
    model: 'claude-opus-4-5-20251101',
    timestamp: '2026-01-29T10:00:00Z',
  };

  const mockSessionInfo: SessionInfo = {
    sessionId: 'test-session-id',
    jsonlPath: '/tmp/test.jsonl',
    lastModified: Date.now(),
    isSidechain: false,
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-wcp-real-test-'));
    provider = new WorkspaceContextProvider(tmpDir);

    mockReader = {
      getLatestUsage: vi.fn().mockReturnValue(mockUsage),
      getModelContextLimit: vi.fn().mockReturnValue(200000),
      findActiveSession: vi.fn().mockReturnValue(mockSessionInfo),
      encodeWorkspacePath: vi.fn(),
      getProjectDir: vi.fn(),
      tailReadFile: vi.fn(),
      extractUsageFromFile: vi.fn(),
    } as unknown as ClaudeSessionReader;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('with active session (real data)', () => {
    it('should return dataSource: real when session has usage data', () => {
      provider.setSessionReader(mockReader);
      const analysis = provider.getContextAnalysis() as EnhancedContextAnalysis;

      expect(analysis.dataSource).toBe('real');
    });

    it('should return real token count in conversation breakdown', () => {
      provider.setSessionReader(mockReader);
      const analysis = provider.getContextAnalysis() as EnhancedContextAnalysis;

      expect(analysis.breakdown.conversation).toBe(90000);
    });

    it('should include model context limit', () => {
      provider.setSessionReader(mockReader);
      const analysis = provider.getContextAnalysis() as EnhancedContextAnalysis;

      expect(analysis.modelContextLimit).toBe(200000);
    });

    it('should include model name', () => {
      provider.setSessionReader(mockReader);
      const analysis = provider.getContextAnalysis() as EnhancedContextAnalysis;

      expect(analysis.model).toBe('claude-opus-4-5-20251101');
    });

    it('should include session ID', () => {
      provider.setSessionReader(mockReader);
      const analysis = provider.getContextAnalysis() as EnhancedContextAnalysis;

      expect(analysis.sessionId).toBe('test-session-id');
    });
  });

  describe('without active session (no data)', () => {
    it('should return dataSource: none when reader returns null', () => {
      (mockReader.getLatestUsage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      provider.setSessionReader(mockReader);
      const analysis = provider.getContextAnalysis() as EnhancedContextAnalysis;

      expect(analysis.dataSource).toBe('none');
    });

    it('should fall back to filesystem estimation when no session', () => {
      (mockReader.getLatestUsage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      provider.setSessionReader(mockReader);

      // Create some spec artifacts so we get non-zero filesystem estimate
      const specDir = path.join(tmpDir, '.specify', 'specs', 'test');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), 'x'.repeat(400));

      const analysis = provider.getContextAnalysis() as EnhancedContextAnalysis;

      expect(analysis.dataSource).toBe('none');
      expect(analysis.breakdown.specArtifacts).toBeGreaterThan(0);
    });
  });

  describe('with reader error (fallback)', () => {
    it('should return dataSource: none when reader throws', () => {
      (mockReader.getLatestUsage as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('File not found');
      });
      provider.setSessionReader(mockReader);
      const analysis = provider.getContextAnalysis() as EnhancedContextAnalysis;

      expect(analysis.dataSource).toBe('none');
    });

    it('should not throw when reader errors', () => {
      (mockReader.getLatestUsage as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Permission denied');
      });
      provider.setSessionReader(mockReader);

      expect(() => provider.getContextAnalysis()).not.toThrow();
    });
  });

  describe('without session reader (estimated)', () => {
    it('should return dataSource: estimated when no reader set', () => {
      const analysis = provider.getContextAnalysis() as EnhancedContextAnalysis;

      expect(analysis.dataSource).toBe('estimated');
    });

    it('should not include model or session metadata', () => {
      const analysis = provider.getContextAnalysis() as EnhancedContextAnalysis;

      expect(analysis.model).toBeUndefined();
      expect(analysis.sessionId).toBeUndefined();
      expect(analysis.modelContextLimit).toBeUndefined();
    });
  });
});
