import { test, expect } from '@playwright/test';
import { join } from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * E2E Tests for Extension-Server-Orchestrator Integration
 * 
 * Tests the full integration between:
 * - VSCode Extension
 * - Language Server 
 * - Orchestrator Process
 * - MCP coordination
 */

const TEST_WORKSPACE = join(__dirname, '../../fixtures/test-workspace');

test.describe('Integration E2E', () => {
  test.beforeEach(async () => {
    await setupTestWorkspace();
  });

  test.afterEach(async () => {
    await cleanupTestWorkspace();
  });

  test('extension can load and parse spec kit format', async () => {
    // Create test spec in GitHub Spec Kit format
    const specContent = `---
id: "integration-test"
title: "Integration Test Spec"
status: "draft"
created: "2025-10-23"
author: "test"
---

# Integration Test Specification

This tests the integration between components.

## Tasks

- [ ] #T001 Extension activation (deps: none)
- [ ] #T002 Language server connection (deps: T001)
- [ ] #T003 MCP tool execution (deps: T002)
`;

    await fs.mkdir(join(TEST_WORKSPACE, '.specify/specs/integration-test'), { recursive: true });
    await fs.writeFile(
      join(TEST_WORKSPACE, '.specify/specs/integration-test/spec.md'),
      specContent
    );

    // Test SpecKitParser from extension
    const { SpecKitParser } = await import('../../../extension/src/specKitParser.js');
    const parser = new SpecKitParser(join(TEST_WORKSPACE, '.specify'));
    
    const specs = await parser.loadAllSpecs();
    expect(specs).toHaveLength(1);
    
    const spec = specs[0];
    expect(spec.id).toBe('integration-test');
    expect(spec.title).toBe('Integration Test Spec');
    expect(spec.status).toBe('draft');
    expect(spec.tasks).toHaveLength(3);
    
    // Verify task dependencies
    const t001 = spec.tasks.find(t => t.id === 'T001');
    const t002 = spec.tasks.find(t => t.id === 'T002');
    const t003 = spec.tasks.find(t => t.id === 'T003');
    
    expect(t001?.dependencies).toEqual([]);
    expect(t002?.dependencies).toEqual(['T001']);
    expect(t003?.dependencies).toEqual(['T002']);
  });

  test('language server can load same specs via SpecKitLoader', async () => {
    // Create test spec
    await createIntegrationTestSpec();

    // Test SpecKitLoader from language server
    const { SpecKitLoader } = await import('../../../language-server/src/utils/specKitLoader.js');
    const loader = new SpecKitLoader(join(TEST_WORKSPACE, '.specify'));
    
    const specs = await loader.loadAllSpecs();
    expect(specs).toHaveLength(1);
    
    const spec = specs[0];
    expect(spec.id).toBe('integration-test');
    expect(spec.title).toBe('Integration Test Spec');
    expect(spec.tasks).toHaveLength(3);
  });

  test('extension and language server parse specs consistently', async () => {
    await createIntegrationTestSpec();

    // Load from extension
    const { SpecKitParser } = await import('../../../extension/src/specKitParser.js');
    const parser = new SpecKitParser(join(TEST_WORKSPACE, '.specify'));
    const extensionSpecs = await parser.loadAllSpecs();

    // Load from language server
    const { SpecKitLoader } = await import('../../../language-server/src/utils/specKitLoader.js');
    const loader = new SpecKitLoader(join(TEST_WORKSPACE, '.specify'));
    const serverSpecs = await loader.loadAllSpecs();

    // Compare results
    expect(extensionSpecs).toHaveLength(serverSpecs.length);
    
    for (let i = 0; i < extensionSpecs.length; i++) {
      const extSpec = extensionSpecs[i];
      const srvSpec = serverSpecs[i];
      
      expect(extSpec.id).toBe(srvSpec.id);
      expect(extSpec.title).toBe(srvSpec.title);
      expect(extSpec.status).toBe(srvSpec.status);
      expect(extSpec.tasks.length).toBe(srvSpec.tasks.length);
      
      // Compare tasks
      for (let j = 0; j < extSpec.tasks.length; j++) {
        expect(extSpec.tasks[j].id).toBe(srvSpec.tasks[j].id);
        expect(extSpec.tasks[j].description).toBe(srvSpec.tasks[j].description);
        expect(extSpec.tasks[j].status).toBe(srvSpec.tasks[j].status);
        expect(extSpec.tasks[j].dependencies).toEqual(srvSpec.tasks[j].dependencies);
      }
    }
  });

  test('MCP tool handler can access specs loaded by SpecKitLoader', async () => {
    await createIntegrationTestSpec();

    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    const mockConnection = {} as any;
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);

    // Test getting specs
    const result = await handler.getSpecs();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    
    const spec = result.data[0];
    expect(spec.id).toBe('integration-test');
    expect(spec.title).toBe('Integration Test Spec');
  });

  test('MCP tool can get next available task', async () => {
    await createIntegrationTestSpec();

    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    const mockConnection = {} as any;
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);

    // Test getting next task
    const result = await handler.getNextTask();
    
    expect(result.success).toBe(true);
    
    if (result.data) {
      // Should return T001 since it has no dependencies
      expect(result.data.id).toBe('T001');
      expect(result.data.title).toBe('Extension activation');
      expect(result.data.status).toBe('pending');
      expect(result.data.dependencies).toEqual([]);
    }
  });

  test('MCP tool can update task status and affect next task selection', async () => {
    await createIntegrationTestSpec();

    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    const mockConnection = {} as any;
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);

    // First, get next task (should be T001)
    let result = await handler.getNextTask();
    expect(result.data?.id).toBe('T001');

    // Mark T001 as completed
    const updateResult = await handler.updateTaskStatus('integration-test', 'T001', 'completed');
    expect(updateResult.success).toBe(true);

    // Now get next task (should be T002 since T001 is completed)
    result = await handler.getNextTask();
    expect(result.data?.id).toBe('T002');
  });

  test('task dependency resolution works across components', async () => {
    await createComplexDependencySpec();

    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    const mockConnection = {} as any;
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);

    // Get next task - should be one with no dependencies
    let result = await handler.getNextTask();
    expect(['T001', 'T004']).toContain(result.data?.id); // T001 and T004 have no deps

    // Complete T001 and T004
    await handler.updateTaskStatus('complex-deps', 'T001', 'completed');
    await handler.updateTaskStatus('complex-deps', 'T004', 'completed');

    // Now T002 and T005 should be available
    result = await handler.getNextTask();
    expect(['T002', 'T005']).toContain(result.data?.id);

    // Complete T002
    await handler.updateTaskStatus('complex-deps', 'T002', 'completed');

    // Now T003 should be available (depends on T001 and T002)
    result = await handler.getNextTask();
    expect(result.data?.id).toBe('T003');
  });

  test('constitution provider loads and validates against rules', async () => {
    // Create constitution
    const constitutionContent = `# Project Constitution

## Article 1: Code Quality

### 1.1 TypeScript Requirements
- Use TypeScript strict mode
- No \`any\` types allowed
- Minimum 80% test coverage

### 1.2 Performance Standards  
- API responses under 500ms p95
- UI interactions under 100ms

## Article 2: Security

### 2.1 Authentication
- JWT tokens expire within 1 hour
- No plaintext passwords
`;

    await fs.writeFile(
      join(TEST_WORKSPACE, '.specify/memory/constitution.md'),
      constitutionContent
    );

    // Test constitution loading from extension
    const { ConstitutionProvider } = await import('../../../extension/src/constitutionProvider.js');
    const provider = new ConstitutionProvider(TEST_WORKSPACE);
    
    const children = await provider.getChildren();
    expect(children.length).toBeGreaterThan(0);
    
    // Should have version info and articles
    const hasVersionInfo = children.some(item => item.label.includes('Version'));
    const hasArticles = children.some(item => item.label.includes('Article'));
    
    expect(hasVersionInfo || hasArticles).toBe(true);
  });

  test('file monitor integration with Claude Code bridge', async () => {
    // Test file monitor can be created with dependencies
    const { FileMonitor } = await import('../../../extension/src/fileMonitor.js');
    const { ClaudeCodeBridge } = await import('../../../extension/src/claudeCodeBridge.js');
    const { ProgressProvider } = await import('../../../extension/src/progressProvider.js');
    
    // Create mock objects with proper constructor parameters
    const mockContext = { workspaceState: { get: () => undefined, update: () => Promise.resolve() } } as any;
    const bridge = new ClaudeCodeBridge(TEST_WORKSPACE, 'test-api-key', mockContext);
    const progress = new ProgressProvider(join(TEST_WORKSPACE, '.specify'));
    
    const monitor = new FileMonitor(TEST_WORKSPACE, bridge, progress);
    
    expect(monitor).toBeDefined();
    expect(typeof monitor.start).toBe('function');
    expect(typeof monitor.stop).toBe('function');
  });

  test('end-to-end workflow simulation', async () => {
    // Create a complete test environment
    await createIntegrationTestSpec();
    
    // 1. Extension loads specs
    const { SpecKitParser } = await import('../../../extension/src/specKitParser.js');
    const parser = new SpecKitParser(join(TEST_WORKSPACE, '.specify'));
    const specs = await parser.loadAllSpecs();
    expect(specs.length).toBeGreaterThan(0);
    
    // 2. Language server provides MCP tools
    const { MCPToolHandler } = await import('../../../language-server/src/mcp/toolHandler.js');
    const mockConnection = {} as any;
    const handler = new MCPToolHandler(TEST_WORKSPACE, mockConnection);
    
    // 3. Get next task via MCP
    const nextTask = await handler.getNextTask();
    expect(nextTask.success).toBe(true);
    expect(nextTask.data?.id).toBe('T001');
    
    // 4. Execute task (simulate)
    const executeResult = await handler.executeTask('integration-test', 'T001');
    expect(executeResult.success).toBe(true);
    
    // 5. Update task status
    const updateResult = await handler.updateTaskStatus('integration-test', 'T001', 'completed');
    expect(updateResult.success).toBe(true);
    
    // 6. Verify next task is now available
    const nextTask2 = await handler.getNextTask();
    expect(nextTask2.data?.id).toBe('T002');
  });
});

/**
 * Create integration test spec
 */
async function createIntegrationTestSpec(): Promise<void> {
  const specContent = `---
id: "integration-test"
title: "Integration Test Spec"
status: "draft"
created: "2025-10-23"
author: "test"
---

# Integration Test Specification

This tests the integration between components.

## Tasks

- [ ] #T001 Extension activation (deps: none)
- [ ] #T002 Language server connection (deps: T001)
- [ ] #T003 MCP tool execution (deps: T002)
`;

  await fs.mkdir(join(TEST_WORKSPACE, '.specify/specs/integration-test'), { recursive: true });
  await fs.writeFile(
    join(TEST_WORKSPACE, '.specify/specs/integration-test/spec.md'),
    specContent
  );
}

/**
 * Create complex dependency test spec
 */
async function createComplexDependencySpec(): Promise<void> {
  const specContent = `---
id: "complex-deps"
title: "Complex Dependencies Test"
status: "draft"
created: "2025-10-23"
---

# Complex Dependencies Test

Tests complex task dependency resolution.

## Tasks

- [ ] #T001 Base task (deps: none)
- [ ] #T002 Depends on T001 (deps: T001)
- [ ] #T003 Depends on T001 and T002 (deps: T001, T002)
- [ ] #T004 Independent task (deps: none)
- [ ] #T005 Depends on T004 (deps: T004)
`;

  await fs.mkdir(join(TEST_WORKSPACE, '.specify/specs/complex-deps'), { recursive: true });
  await fs.writeFile(
    join(TEST_WORKSPACE, '.specify/specs/complex-deps/spec.md'),
    specContent
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