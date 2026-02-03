import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ContextBridgeWriter } from '../../../extension/src/autonomous/ContextBridgeWriter';

/**
 * T027: Unit tests for ContextBridgeWriter
 */
describe('ContextBridgeWriter (T027)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-bridge-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createMockContextBuilder(builtContext: Record<string, unknown>) {
    return {
      buildContext: vi.fn().mockResolvedValue(builtContext),
    } as never;
  }

  const mockTask = {
    taskId: 'T001',
    specId: 'test-feature',
    description: 'Test task',
  };

  const mockBuiltContext = {
    fullContext: 'full context string',
    sections: {
      constitution: '# Constitution',
      hints: '## Hints\n- Use TypeScript',
      memories: '## Memories\n- Previous decision',
      research: '## Research\n- Analysis findings',
    },
    loadTime: 150,
    hintsLoadTime: 50,
    memoriesLoadTime: 80,
    turnNumber: 3,
    stage: 'implement',
    memoryCoverage: {
      coveredKeywords: ['MCP', 'toolHandler'],
      uncoveredKeywords: ['performance'],
      coveragePercent: 65,
      memoriesLoaded: 3,
      researchLoadedForGaps: true,
      researchTriggers: ['performance'],
    },
    budgetUsage: {
      stage: 'implement',
      profile: {},
      usage: { research: 1500, memory: 800, code: 0, conversation: 0, total: 2300 },
      limits: { research: 18000, memory: 30000, code: 48000, conversation: 24000 },
      exceededCategories: [],
      totalExceeded: false,
    },
  };

  it('should write enriched context to bridge file', async () => {
    const mockBuilder = createMockContextBuilder(mockBuiltContext);
    const writer = new ContextBridgeWriter(mockBuilder, tmpDir);

    await writer.writeEnrichedContext(mockTask);

    const bridgePath = path.join(tmpDir, '.specify', 'memory', 'enriched-context.json');
    expect(fs.existsSync(bridgePath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(bridgePath, 'utf-8'));
    expect(content.specId).toBe('test-feature');
    expect(content.taskId).toBe('T001');
    expect(content.sections.constitution).toBe('# Constitution');
    expect(content.sections.memories).toBe('## Memories\n- Previous decision');
    expect(content.sections.hints).toBe('## Hints\n- Use TypeScript');
    expect(content.sections.research).toBe('## Research\n- Analysis findings');
  });

  it('should include timestamp in bridge file', async () => {
    const mockBuilder = createMockContextBuilder(mockBuiltContext);
    const writer = new ContextBridgeWriter(mockBuilder, tmpDir);

    const before = Date.now();
    await writer.writeEnrichedContext(mockTask);
    const after = Date.now();

    const bridgePath = path.join(tmpDir, '.specify', 'memory', 'enriched-context.json');
    const content = JSON.parse(fs.readFileSync(bridgePath, 'utf-8'));

    expect(content.timestamp).toBeGreaterThanOrEqual(before);
    expect(content.timestamp).toBeLessThanOrEqual(after);
  });

  it('should include memoryCoverage when available', async () => {
    const mockBuilder = createMockContextBuilder(mockBuiltContext);
    const writer = new ContextBridgeWriter(mockBuilder, tmpDir);

    await writer.writeEnrichedContext(mockTask);

    const bridgePath = path.join(tmpDir, '.specify', 'memory', 'enriched-context.json');
    const content = JSON.parse(fs.readFileSync(bridgePath, 'utf-8'));

    expect(content.memoryCoverage).toBeDefined();
    expect(content.memoryCoverage.coveragePercent).toBe(65);
    expect(content.memoryCoverage.memoriesLoaded).toBe(3);
  });

  it('should create directory if it does not exist', async () => {
    const mockBuilder = createMockContextBuilder(mockBuiltContext);
    const writer = new ContextBridgeWriter(mockBuilder, tmpDir);

    // Directory doesn't exist yet
    const bridgeDir = path.join(tmpDir, '.specify', 'memory');
    expect(fs.existsSync(bridgeDir)).toBe(false);

    await writer.writeEnrichedContext(mockTask);

    expect(fs.existsSync(bridgeDir)).toBe(true);
  });

  it('should handle missing optional sections', async () => {
    const minimalContext = {
      fullContext: 'minimal',
      sections: {},
      loadTime: 50,
      hintsLoadTime: 0,
      memoriesLoadTime: 0,
      turnNumber: 0,
      stage: 'research',
    };
    const mockBuilder = createMockContextBuilder(minimalContext);
    const writer = new ContextBridgeWriter(mockBuilder, tmpDir);

    await writer.writeEnrichedContext(mockTask);

    const bridgePath = path.join(tmpDir, '.specify', 'memory', 'enriched-context.json');
    const content = JSON.parse(fs.readFileSync(bridgePath, 'utf-8'));

    expect(content.sections).toBeDefined();
    expect(content.memoryCoverage).toBeUndefined();
    expect(content.budgetUsage).toBeUndefined();
  });
});
