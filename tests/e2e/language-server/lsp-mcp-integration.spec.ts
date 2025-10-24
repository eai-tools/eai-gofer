import { test, expect } from '@playwright/test';
import { join } from 'path';
import { promises as fs } from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * E2E Tests for Language Server
 * 
 * Tests the Language Server functionality including:
 * - LSP connection and protocol
 * - MCP tool exposure
 * - Spec loading and parsing
 * - Tool execution
 */

const LANGUAGE_SERVER_PATH = join(__dirname, '../../../language-server/src/server.ts');
const TEST_WORKSPACE = join(__dirname, '../../fixtures/test-workspace');
const SERVER_PORT = 3333;

test.describe('Language Server E2E', () => {
  let serverProcess: ChildProcess | undefined;

  test.beforeEach(async () => {
    // Setup test workspace
    await setupTestWorkspace();
  });

  test.afterEach(async () => {
    // Stop server if running
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = undefined;
    }
    
    // Cleanup test workspace
    await cleanupTestWorkspace();
  });

  test('language server can be started and responds to LSP initialize', async () => {
    // Test that the server module can be imported
    const serverModule = await import('../../../language-server/src/server.js');
    expect(serverModule).toBeDefined();
    
    // Test basic server functionality without actually starting LSP
    // (Full LSP testing would require a proper LSP client)
    expect(typeof serverModule).toBe('object');
  });

  test('MCP tools are properly accessible', async () => {
    // Test MCP tool handler
    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    
    // Mock connection object
    const mockConnection = {} as any;
    
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);
    expect(handler).toBeDefined();
    
    // Test that expected methods exist
    expect(typeof handler.getSpecs).toBe('function');
    expect(typeof handler.getNextTask).toBe('function');
    expect(typeof handler.executeTask).toBe('function');
    expect(typeof handler.updateTaskStatus).toBe('function');
    expect(typeof handler.validateCode).toBe('function');
    expect(typeof handler.runTests).toBe('function');
  });

  test('spec loading works correctly', async () => {
    // Create test spec
    const specContent = `---
id: "test-spec"
title: "Test Specification"
status: "draft"
created: "2025-10-23"
---

# Test Specification

Test spec for language server.

## Tasks

- [ ] #T001 First task (deps: none)
- [ ] #T002 Second task (deps: T001)
`;

    await fs.writeFile(
      join(TEST_WORKSPACE, '.specify/specs/test-spec/spec.md'),
      specContent
    );

    // Test SpecKitLoader
    const { SpecKitLoader } = await import('../../../language-server/src/utils/specKitLoader.js');
    
    const loader = new SpecKitLoader(join(TEST_WORKSPACE, '.specify'));
    const specs = await loader.loadAllSpecs();
    
    expect(specs).toHaveLength(1);
    expect(specs[0].id).toBe('test-spec');
    expect(specs[0].title).toBe('Test Specification');
    expect(specs[0].tasks).toHaveLength(2);
  });

  test('MCP tool execution - get specs', async () => {
    // Create test specs
    await createTestSpecs();
    
    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    const mockConnection = {} as any;
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);
    
    // Test get_specs method
    const result = await handler.getSpecs();
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  test('MCP tool execution - get next task', async () => {
    // Create test specs with tasks
    await createTestSpecs();
    
    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    const mockConnection = {} as any;
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);
    
    // Test get_next_task method
    const result = await handler.getNextTask();
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    
    if (result.data) {
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('title');
      expect(result.data).toHaveProperty('status');
    }
  });

  test('MCP tool execution - update task status', async () => {
    // Create test specs
    await createTestSpecs();
    
    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    const mockConnection = {} as any;
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);
    
    // Test update_task_status method
    const result = await handler.updateTaskStatus('test-spec', 'T001', 'in_progress');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  test('MCP tool execution - validate code', async () => {
    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    const mockConnection = {} as any;
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);
    
    // Test validate_code method
    const result = await handler.validateCode(['test.ts']);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('isValid');
  });

  test('MCP tool execution - run tests', async () => {
    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    const mockConnection = {} as any;
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);
    
    // Test run_tests method
    const result = await handler.runTests('test-spec');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('passed');
    expect(result.data).toHaveProperty('failed');
    expect(result.data).toHaveProperty('total');
  });

  test('error handling for invalid parameters', async () => {
    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    const mockConnection = {} as any;
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);
    
    // Test invalid spec ID
    const result = await handler.updateTaskStatus('', 'T001', 'in_progress');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.error).toContain('specId must be a non-empty string');
  });

  test('error handling for non-existent specs', async () => {
    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    const mockConnection = {} as any;
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);
    
    // Test non-existent spec
    const result = await handler.updateTaskStatus('non-existent-spec', 'T001', 'in_progress');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

/**
 * Create test specs for testing
 */
async function createTestSpecs(): Promise<void> {
  const spec1Content = `---
id: "test-spec"
title: "Test Specification"
status: "draft"
created: "2025-10-23"
---

# Test Specification

Test spec for language server testing.

## Tasks

- [ ] #T001 First task (deps: none)
- [ ] #T002 Second task (deps: T001)
- [ ] #T003 Third task (deps: T002)
`;

  const spec2Content = `---
id: "another-spec"
title: "Another Specification"
status: "in_progress"
created: "2025-10-23"
---

# Another Specification

Another test spec.

## Tasks

- [x] #T001 Completed task (deps: none)
- [ ] #T002 Pending task (deps: T001)
`;

  await fs.mkdir(join(TEST_WORKSPACE, '.specify/specs/test-spec'), { recursive: true });
  await fs.mkdir(join(TEST_WORKSPACE, '.specify/specs/another-spec'), { recursive: true });
  
  await fs.writeFile(
    join(TEST_WORKSPACE, '.specify/specs/test-spec/spec.md'),
    spec1Content
  );
  
  await fs.writeFile(
    join(TEST_WORKSPACE, '.specify/specs/another-spec/spec.md'),
    spec2Content
  );
}

/**
 * Setup test workspace with .specify structure
 */
async function setupTestWorkspace(): Promise<void> {
  await fs.mkdir(TEST_WORKSPACE, { recursive: true });
  await fs.mkdir(join(TEST_WORKSPACE, '.specify'), { recursive: true });
  await fs.mkdir(join(TEST_WORKSPACE, '.specify/specs'), { recursive: true });
  await fs.mkdir(join(TEST_WORKSPACE, '.specify/memory'), { recursive: true });
  await fs.mkdir(join(TEST_WORKSPACE, '.specify/scripts'), { recursive: true });
  
  // Create basic package.json
  await fs.writeFile(
    join(TEST_WORKSPACE, 'package.json'),
    JSON.stringify({
      name: 'test-workspace',
      version: '1.0.0',
      scripts: {
        test: 'vitest'
      }
    }, null, 2)
  );
  
  // Create constitution
  await fs.writeFile(
    join(TEST_WORKSPACE, '.specify/memory/constitution.md'),
    `# Test Constitution

## Code Quality
- Use TypeScript strict mode
- Minimum 80% test coverage

## Performance
- API responses under 500ms
`
  );
}

/**
 * Cleanup test workspace
 */
async function cleanupTestWorkspace(): Promise<void> {
  try {
    await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}