import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ContextBridgeWriter } from '../../extension/src/autonomous/ContextBridgeWriter';
import { MCPToolHandler } from '../../language-server/src/mcp/toolHandler.js';
import { GoferLoader } from '../../language-server/src/utils/goferLoader.js';
import { WorkspaceContextProvider } from '../../extension/src/autonomous/WorkspaceContextProvider';
import { ContextHealthMonitor } from '../../extension/src/autonomous/ContextHealthMonitor';

vi.mock('../../language-server/src/utils/goferLoader.js');
vi.mock('vscode-languageserver');

/**
 * T053: Full MCP enrichment flow integration test
 *
 * End-to-end test: ContextBridgeWriter writes bridge file →
 * MCPToolHandler reads bridge → executeTask returns enriched response
 */
describe('Memory System Integration Sweep (T053)', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-integration-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('Full MCP Enrichment Flow', () => {
    it('should write bridge and read enriched response', async () => {
      // Step 1: Create a mock ContextBuilder that produces enriched context
      const mockContextBuilder = {
        buildContext: vi.fn().mockResolvedValue({
          fullContext: 'enriched context',
          sections: {
            constitution: '# Project Constitution\n\nAlways write tests.',
            hints: '## Coding Hints\n\n- Use async/await',
            memories: '## Memories\n\n- Decision: Use file bridge pattern',
            research: '## Research\n\n- MCP integration analysis',
          },
          loadTime: 100,
          hintsLoadTime: 30,
          memoriesLoadTime: 50,
          turnNumber: 1,
          stage: 'implement',
          memoryCoverage: {
            coveredKeywords: ['MCP', 'bridge'],
            uncoveredKeywords: ['performance'],
            coveragePercent: 67,
            memoriesLoaded: 2,
            researchLoadedForGaps: true,
            researchTriggers: ['performance'],
          },
        }),
      } as never;

      // Step 2: Write bridge file via ContextBridgeWriter
      const bridgeWriter = new ContextBridgeWriter(mockContextBuilder, tmpDir);
      await bridgeWriter.writeEnrichedContext({
        taskId: 'T001',
        specId: 'test-feature',
        description: 'Test task',
      });

      // Verify bridge file exists
      const bridgePath = path.join(tmpDir, '.specify', 'memory', 'enriched-context.json');
      expect(fs.existsSync(bridgePath)).toBe(true);

      // Step 3: Set up MCPToolHandler pointing to same workspace
      const mockSpec = {
        id: 'test-feature',
        title: 'Test Feature',
        status: 'in_progress',
        description: 'Test',
        tasks: [
          {
            id: 'T001',
            description: 'Test task',
            status: 'pending',
            dependencies: [],
            parallel: false,
            attempts: 0,
          },
        ],
        dependencies: [],
        created: new Date(),
        updated: new Date(),
      };

      const mockGoferLoader = {
        loadAllSpecs: vi.fn().mockResolvedValue([mockSpec]),
        loadSpec: vi.fn().mockResolvedValue(mockSpec),
        updateTaskStatus: vi.fn(),
      };
      vi.mocked(GoferLoader).mockImplementation(() => mockGoferLoader);

      const mcpHandler = new MCPToolHandler(tmpDir, { sendNotification: vi.fn() });

      // Step 4: Call executeTask and verify enriched response
      const result = await mcpHandler.executeTask('test-feature', 'T001');

      expect(result.success).toBe(true);
      expect(result.spec).toBeDefined();
      expect(result.task).toBeDefined();

      // Enriched fields from bridge
      expect(result.constitution).toBe('# Project Constitution\n\nAlways write tests.');
      expect(result.memories).toBe('## Memories\n\n- Decision: Use file bridge pattern');
      expect(result.hints).toBe('## Coding Hints\n\n- Use async/await');
      expect(result.researchChunks).toBe('## Research\n\n- MCP integration analysis');

      // Memory coverage
      expect(result.memoryCoverage).toBeDefined();
      expect(result.memoryCoverage?.coveragePercent).toBe(67);
      expect(result.memoryCoverage?.memoriesLoaded).toBe(2);
      expect(result.memoryCoverage?.researchLoadedForGaps).toBe(true);
    });
  });

  describe('WorkspaceContextProvider + ContextHealthMonitor Integration', () => {
    it('should provide real health data after wiring', () => {
      // Create workspace with some artifacts
      const specDir = path.join(tmpDir, '.specify', 'specs', 'my-feature');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), 'x'.repeat(4000));
      fs.writeFileSync(path.join(specDir, 'plan.md'), 'y'.repeat(2000));
      fs.writeFileSync(path.join(specDir, 'tasks.md'), '- [X] T001\n- [ ] T002');

      // Wire provider to monitor
      const provider = new WorkspaceContextProvider(tmpDir);
      const monitor = new ContextHealthMonitor();
      monitor.setContextProvider(() => provider.getContextAnalysis());

      const status = monitor.checkHealth();

      expect(status).not.toBeNull();
      expect(status!.status).toBe('healthy'); // Small workspace = healthy
      expect(status!.tokensUsed).toBeGreaterThan(0);
      expect(status!.tokensLimit).toBeGreaterThan(0);
      expect(status!.utilizationPercent).toBeGreaterThanOrEqual(0);
    });

    it('should detect implement stage from workspace artifacts', () => {
      // T035: Files must be > 100 bytes with expected headings
      const pad = (s: string): string => s + '\n\n' + 'Content '.repeat(20) + '\n';
      const specDir = path.join(tmpDir, '.specify', 'specs', 'active-feature');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), pad('# Spec'));
      fs.writeFileSync(path.join(specDir, 'plan.md'), pad('# Plan'));
      fs.writeFileSync(path.join(specDir, 'tasks.md'), pad('# Tasks\n\n- [X] T001 Done'));

      const provider = new WorkspaceContextProvider(tmpDir);
      const analysis = provider.getContextAnalysis();

      expect(analysis.stage).toBe('implement');
    });
  });
});
