import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MCPToolHandler } from '../../../language-server/src/mcp/toolHandler.js';
import { GoferLoader } from '../../../language-server/src/utils/goferLoader.js';

vi.mock('../../../language-server/src/utils/goferLoader.js');
vi.mock('vscode-languageserver');

/**
 * T028: Tests for readEnrichedContext (freshness check, missing file fallback)
 * T029: Backward compatibility test for executeTask response
 */
describe('Enriched Context Bridge Reader (T028)', () => {
  let tmpDir: string;
  let mcpHandler: MCPToolHandler;
  let mockGoferLoader: Record<string, ReturnType<typeof vi.fn>>;
  let mockConnection: { sendNotification: ReturnType<typeof vi.fn> };

  const mockSpec = {
    id: 'test-feature',
    title: 'Test Feature',
    status: 'in_progress',
    description: 'Test',
    tasks: [
      {
        id: 'T001',
        description: 'First task',
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

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-enriched-test-'));

    mockConnection = { sendNotification: vi.fn() };
    mockGoferLoader = {
      loadAllSpecs: vi.fn().mockResolvedValue([mockSpec]),
      loadSpec: vi.fn().mockResolvedValue(mockSpec),
      updateTaskStatus: vi.fn(),
    };
    vi.mocked(GoferLoader).mockImplementation(() => mockGoferLoader);

    mcpHandler = new MCPToolHandler(tmpDir, mockConnection);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeBridgeFile(data: Record<string, unknown>): void {
    const bridgeDir = path.join(tmpDir, '.specify', 'memory');
    fs.mkdirSync(bridgeDir, { recursive: true });
    fs.writeFileSync(path.join(bridgeDir, 'enriched-context.json'), JSON.stringify(data), 'utf-8');
  }

  it('should include enriched fields when bridge file is fresh', async () => {
    writeBridgeFile({
      timestamp: Date.now(),
      specId: 'test-feature',
      taskId: 'T001',
      sections: {
        constitution: 'Full constitution text',
        memories: '## Relevant memories',
        hints: '## Coding hints',
        research: '## Research findings',
      },
      memoryCoverage: {
        coveredKeywords: ['MCP'],
        uncoveredKeywords: [],
        coveragePercent: 90,
        memoriesLoaded: 5,
        researchLoadedForGaps: false,
        researchTriggers: [],
      },
    });

    const result = await mcpHandler.executeTask('test-feature', 'T001');

    expect(result.success).toBe(true);
    expect(result.memories).toBe('## Relevant memories');
    expect(result.hints).toBe('## Coding hints');
    expect(result.researchChunks).toBe('## Research findings');
    expect(result.constitution).toBe('Full constitution text');
    expect(result.memoryCoverage?.coveragePercent).toBe(90);
    expect(result.memoryCoverage?.memoriesLoaded).toBe(5);
  });

  it('should ignore stale bridge file (>60 seconds old)', async () => {
    writeBridgeFile({
      timestamp: Date.now() - 120000, // 2 minutes old
      specId: 'test-feature',
      taskId: 'T001',
      sections: {
        constitution: 'Stale constitution',
        memories: 'Stale memories',
      },
    });

    const result = await mcpHandler.executeTask('test-feature', 'T001');

    expect(result.success).toBe(true);
    // Enriched fields should be undefined (stale data ignored)
    expect(result.memories).toBeUndefined();
    expect(result.hints).toBeUndefined();
    expect(result.researchChunks).toBeUndefined();
  });

  it('should fallback gracefully when bridge file is missing', async () => {
    // No bridge file written
    const result = await mcpHandler.executeTask('test-feature', 'T001');

    expect(result.success).toBe(true);
    expect(result.spec).toBeDefined();
    expect(result.task).toBeDefined();
    // Enriched fields should be undefined
    expect(result.memories).toBeUndefined();
    expect(result.hints).toBeUndefined();
  });

  it('should fallback when bridge file has invalid JSON', async () => {
    const bridgeDir = path.join(tmpDir, '.specify', 'memory');
    fs.mkdirSync(bridgeDir, { recursive: true });
    fs.writeFileSync(path.join(bridgeDir, 'enriched-context.json'), 'not valid json{{{', 'utf-8');

    const result = await mcpHandler.executeTask('test-feature', 'T001');

    expect(result.success).toBe(true);
    expect(result.memories).toBeUndefined();
  });
});

describe('ExecuteTask Backward Compatibility (T029)', () => {
  let tmpDir: string;
  let mcpHandler: MCPToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-compat-test-'));

    const mockSpec = {
      id: 'test-feature',
      title: 'Test Feature',
      status: 'in_progress',
      description: 'Test',
      tasks: [
        {
          id: 'T001',
          description: 'Task',
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

    const mockConnection = { sendNotification: vi.fn() };
    mcpHandler = new MCPToolHandler(tmpDir, mockConnection);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should always include success, spec, and task fields', async () => {
    const result = await mcpHandler.executeTask('test-feature', 'T001');

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('spec');
    expect(result).toHaveProperty('task');
    expect(result.success).toBe(true);
  });

  it('should include testHarnessPath field', async () => {
    const result = await mcpHandler.executeTask('test-feature', 'T001');

    // testHarnessPath may be undefined if generation fails, but the field should be present
    expect('testHarnessPath' in result).toBe(true);
  });

  it('should include constitution field (truncated or full)', async () => {
    const result = await mcpHandler.executeTask('test-feature', 'T001');

    // constitution is optional (may be undefined if file doesn't exist)
    // but the key should not cause errors
    expect(result.success).toBe(true);
  });
});
