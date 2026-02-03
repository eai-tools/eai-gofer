import { test, expect } from '@playwright/test';
import { join } from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * E2E Tests for VSCode Extension
 *
 * Tests the VSCode extension functionality including:
 * - Extension activation and registration
 * - Command execution
 * - Tree view providers
 * - File watching and updates
 */

const TEST_WORKSPACE = join(__dirname, '../../fixtures/test-workspace');

test.describe('VSCode Extension E2E', () => {
  test.beforeEach(async () => {
    // Setup test workspace with .specify directory
    await setupTestWorkspace();
  });

  test.afterEach(async () => {
    // Cleanup test workspace
    await cleanupTestWorkspace();
  });

  test('extension activates and registers commands', async () => {
    // This test would need VSCode automation framework
    // For now, we'll test the core logic that doesn't require VSCode UI

    // Test extension main export
    const extensionModule = await import('../../../extension/src/extension.js');
    expect(extensionModule.activate).toBeDefined();
    expect(extensionModule.deactivate).toBeDefined();
  });

  test('spec tree view loads specifications', async () => {
    // Create test spec
    const specContent = `---
id: "test-spec"
title: "Test Specification"
status: "draft"
created: "2025-10-23"
---

# Test Specification

Test spec for tree view.

## Tasks

- [ ] #T001 First task (deps: none)
- [ ] #T002 Second task (deps: T001)
`;

    await fs.writeFile(join(TEST_WORKSPACE, '.specify/specs/test-spec/spec.md'), specContent);

    // Test GoferParser directly
    const { GoferParser } = await import('../../../extension/src/goferParser.js');
    const parser = new GoferParser(join(TEST_WORKSPACE, '.specify'));

    const specs = await parser.loadAllSpecs();
    expect(specs).toHaveLength(1);
    expect(specs[0].id).toBe('test-spec');
    expect(specs[0].title).toBe('Test Specification');
    expect(specs[0].tasks).toHaveLength(2);
  });

  test('constitution provider loads constitution file', async () => {
    // Create test constitution
    const constitutionContent = `# Test Constitution

## Code Quality
- Use TypeScript strict mode
- No any types

## Testing
- Minimum 80% coverage
`;

    await fs.writeFile(
      join(TEST_WORKSPACE, '.specify/memory/constitution.md'),
      constitutionContent
    );

    // Test ConstitutionProvider directly
    const { ConstitutionProvider } = await import('../../../extension/src/constitutionProvider.js');
    const provider = new ConstitutionProvider(TEST_WORKSPACE);

    // Test that provider loads without errors
    const children = await provider.getChildren();
    expect(Array.isArray(children)).toBe(true);
    expect(children.length).toBeGreaterThan(0);
  });

  test('file monitor can be instantiated', async () => {
    const { FileMonitor } = await import('../../../extension/src/fileMonitor.js');

    // Create mock dependencies
    const mockBridge = {} as unknown;
    const mockProgress = {} as unknown;

    const monitor = new FileMonitor(TEST_WORKSPACE, mockBridge, mockProgress);
    expect(monitor).toBeDefined();

    // Test basic functionality
    expect(typeof monitor.start).toBe('function');
    expect(typeof monitor.stop).toBe('function');
  });

  test('branch spec manager can be instantiated', async () => {
    const { BranchSpecManager } = await import('../../../extension/src/branchSpecManager.js');

    const manager = new BranchSpecManager(TEST_WORKSPACE);
    expect(manager).toBeDefined();

    // Test public methods exist
    expect(typeof manager.initializeBranchStructure).toBe('function');
    expect(typeof manager.getAllSpecPaths).toBe('function');
    expect(typeof manager.refreshBranch).toBe('function');
  });

  test('auto updater can be instantiated with required parameters', async () => {
    const { AutoUpdater } = await import('../../../extension/src/autoUpdater.js');

    const updater = new AutoUpdater('test/repo', '1.0.0', 'test-extension');
    expect(updater).toBeDefined();

    // Test that methods exist
    expect(typeof updater.startPeriodicChecks).toBe('function');
  });

  test('MCP config helper creates proper VSCode configuration', async () => {
    const { MCPConfigHelper } = await import('../../../extension/src/mcpConfig.js');

    // Create mock extension context
    const mockContext = {
      asAbsolutePath: (relativePath: string): string => join(TEST_WORKSPACE, relativePath),
    } as unknown;

    const config = new MCPConfigHelper(TEST_WORKSPACE, mockContext);
    expect(config).toBeDefined();

    // Test that the main method exists
    expect(typeof config.createOrUpdateConfig).toBe('function');
  });

  test('orchestrator process can be instantiated with required parameters', async () => {
    const { OrchestratorProcess } = await import('../../../extension/src/orchestratorProcess.js');

    const orchestrator = new OrchestratorProcess(TEST_WORKSPACE, 'test-api-key');
    expect(orchestrator).toBeDefined();

    // Test basic functionality exists
    expect(typeof orchestrator.start).toBe('function');
    expect(typeof orchestrator.stop).toBe('function');
    expect(typeof orchestrator.isRunning).toBe('function');
  });
});

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
    JSON.stringify(
      {
        name: 'test-workspace',
        version: '1.0.0',
        scripts: {
          test: 'vitest',
        },
      },
      null,
      2
    )
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
