# Quickstart: Writing Tests for SpecGofer

**Feature**: 006-testing-coverage-expansion
**Audience**: Developers writing tests for SpecGofer
**Philosophy**: Real tests with real data - no mocks, no stubs

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Test Types Overview](#test-types-overview)
3. [Writing Unit Tests](#writing-unit-tests)
4. [Writing Integration Tests](#writing-integration-tests)
5. [Writing E2E Tests](#writing-e2e-tests)
6. [Writing Performance Benchmarks](#writing-performance-benchmarks)
7. [Test Helpers and Utilities](#test-helpers-and-utilities)
8. [Running Tests](#running-tests)
9. [Coverage and Telemetry](#coverage-and-telemetry)
10. [CI/CD Integration](#cicd-integration)

---

## Core Principles

### 1. Real Tests with Real Data

**NO MOCKING ALLOWED**. All tests must use real data and actual system behavior.

L **Wrong** (mocking):
```typescript
const mockFileSystem = {
  readFile: vi.fn().mockResolvedValue('fake content')
};
```

 **Correct** (real data):
```typescript
const tempDir = await createTestWorkspace();
await fs.promises.writeFile(path.join(tempDir, 'spec.md'), 'real content');
const content = await fs.promises.readFile(path.join(tempDir, 'spec.md'), 'utf-8');
```

### 2. Test Isolation

Each test must be completely isolated:
- Create temporary workspaces in `beforeEach`
- Clean up in `afterEach` (with retry logic for Windows)
- No shared state between tests
- No dependency on test execution order

### 3. Deterministic Tests

Tests must pass reliably:
- Use `waitForCondition()` for async operations
- Don't rely on fixed delays (`setTimeout`)
- Handle race conditions explicitly
- Seed random generators if needed

---

## Test Types Overview

| Type | Purpose | Tools | Location |
|------|---------|-------|----------|
| **Unit** | Test individual functions/modules | Vitest | `tests/unit/` |
| **Integration** | Test component interactions | Vitest | `tests/integration/` |
| **E2E** | Test complete user workflows | @vscode/test-electron, Playwright | `tests/e2e/` |
| **Performance** | Measure operation timing | Vitest Bench | `tests/performance/` |

---

## Writing Unit Tests

### Basic Structure

```typescript
// tests/unit/utils/FileUtils.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestWorkspace, cleanupTestWorkspace } from '../../helpers/workspace.js';
import { FileUtils } from '../../../src/utils/FileUtils.js';

describe('FileUtils', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await createTestWorkspace();
  });

  afterEach(async () => {
    await cleanupTestWorkspace(workspace);
  });

  it('should read spec file with YAML frontmatter', async () => {
    // Arrange: Create real spec file
    const specPath = path.join(workspace, 'spec.md');
    const content = `---
title: Test Spec
---
# Content`;
    await fs.promises.writeFile(specPath, content);

    // Act: Read with real FileUtils
    const result = await FileUtils.readSpec(specPath);

    // Assert: Validate actual result
    expect(result.frontmatter.title).toBe('Test Spec');
    expect(result.content).toContain('# Content');
  });
});
```

### Key Points

-  Use real file system operations
-  Create temporary workspaces for each test
-  Clean up reliably with retry logic
-  Test with actual data, not mocked responses

---

## Writing Integration Tests

Integration tests verify components work together correctly.

### Example: File Watching � Spec Loading

```typescript
// tests/integration/file-watching/SpecLoadingIntegration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileMonitor } from '../../../src/utils/FileMonitor.js';
import { SpecLoader } from '../../../src/orchestrator/SpecLoader.js';
import { createTestWorkspace, cleanupTestWorkspace } from '../../helpers/workspace.js';
import { waitForCondition } from '../../helpers/async-helpers.js';

describe('File Watching � Spec Loading Integration', () => {
  let workspace: string;
  let fileMonitor: FileMonitor;
  let specLoader: SpecLoader;

  beforeEach(async () => {
    workspace = await createTestWorkspace();
    fileMonitor = new FileMonitor(workspace);
    specLoader = new SpecLoader(workspace);

    // Wire components together
    fileMonitor.on('change', (filePath) => {
      specLoader.reload(filePath);
    });

    await fileMonitor.start();
  });

  afterEach(async () => {
    await fileMonitor.stop();
    await cleanupTestWorkspace(workspace);
  });

  it('should reload spec when file changes', async () => {
    // Arrange: Create initial spec
    const specPath = path.join(workspace, '.specify/specs/001-test/spec.md');
    await fs.promises.mkdir(path.dirname(specPath), { recursive: true });
    await fs.promises.writeFile(specPath, '# Initial');

    // Wait for initial load
    await waitForCondition(() => specLoader.getSpec('001-test') !== null, 2000);

    // Act: Modify file (real file change)
    await fs.promises.writeFile(specPath, '# Updated');

    // Assert: Wait for reload to complete
    await waitForCondition(() => {
      const spec = specLoader.getSpec('001-test');
      return spec?.content.includes('# Updated') ?? false;
    }, 2000);

    const spec = specLoader.getSpec('001-test');
    expect(spec?.content).toContain('# Updated');
  });
});
```

### Integration Test Patterns

1. **Component Wiring**: Connect real components through actual interfaces
2. **Real Events**: Use actual event emitters, file watchers, HTTP requests
3. **Async Coordination**: Use `waitForCondition()` to handle timing
4. **Resource Cleanup**: Stop watchers, close connections, clean up files

---

## Writing E2E Tests

E2E tests run against real VSCode instances using `@vscode/test-electron`.

### Basic E2E Test

```typescript
// tests/e2e/extension-activation/Activation.test.ts
import * as vscode from 'vscode';
import { expect } from 'chai'; // Mocha uses Chai, not Vitest
import { activateExtension } from '../../helpers/vscode-test.js';

describe('Extension Activation', () => {
  before(async () => {
    await activateExtension('specgofer');
  });

  it('should register all commands', async () => {
    const commands = await vscode.commands.getCommands(true);

    expect(commands).to.include('specGofer.initialize');
    expect(commands).to.include('specGofer.showProgress');
    expect(commands).to.include('specgofer.startClaudeCode');
  });

  it('should show tree view with specs', async () => {
    // Execute command that opens tree view
    await vscode.commands.executeCommand('specGofer.showProgress');

    // Wait for tree view to populate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Tree view should be visible
    const treeView = vscode.window.createTreeView('specGoferProgress', {
      treeDataProvider: {} as any // Get actual provider
    });

    expect(treeView.visible).to.be.true;
  });
});
```

### Webview Testing with WebdriverIO

```typescript
// tests/e2e/webviews/MemoryPanel.test.ts
describe('Memory Panel', () => {
  it('should create a new decision', async () => {
    const workbench = await browser.getWorkbench();

    // Open Memory Panel command
    await browser.executeWorkbench((vscode) => {
      vscode.commands.executeCommand('specgofer.viewMemories');
    });

    // Switch to webview frame
    await browser.switchFrame(await $('iframe'));
    await browser.switchFrame(await $('iframe')); // Nested iframes

    // Interact with webview UI
    await $('#decision-title').setValue('Use TypeScript');
    await $('#decision-rationale').setValue('Type safety and IDE support');
    await $('#save-button').click();

    // Verify success
    await expect($('.success-message')).toBeDisplayed();
    await expect($('.decision-list')).toHaveTextContaining('Use TypeScript');
  });
});
```

---

## Writing Performance Benchmarks

Use Vitest Bench for performance testing with statistical rigor.

```typescript
// tests/performance/SpecLoading.bench.ts
import { bench, describe } from 'vitest';
import { SpecLoader } from '../../src/orchestrator/SpecLoader.js';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/workspace.js';

describe('Spec Loading Performance', () => {
  let workspace: string;
  let specLoader: SpecLoader;

  beforeAll(async () => {
    workspace = await createTestWorkspace();
    // Create 100 spec files
    for (let i = 1; i <= 100; i++) {
      const specPath = path.join(workspace, `.specify/specs/${i.toString().padStart(3, '0')}-test/spec.md`);
      await fs.promises.mkdir(path.dirname(specPath), { recursive: true });
      await fs.promises.writeFile(specPath, `# Spec ${i}`);
    }
    specLoader = new SpecLoader(workspace);
  });

  afterAll(async () => {
    await cleanupTestWorkspace(workspace);
  });

  bench('load 100 spec files', async () => {
    await specLoader.loadAll();
  }, {
    time: 2000,           // Run for 2 seconds
    iterations: 50,       // Minimum 50 runs
    warmupTime: 500,      // 500ms warmup
    warmupIterations: 15  // 15 warmup runs
  });
});
```

### Performance Threshold Checking

```typescript
// scripts/check-performance.ts
import { readFileSync } from 'fs';

const results = JSON.parse(readFileSync('bench-results.json', 'utf-8'));

const TARGETS = {
  'load 100 spec files': 500,  // p50 < 500ms
  'parse task list': 100,      // p50 < 100ms
  'file change detection': 200 // p50 < 200ms
};

for (const [name, result] of Object.entries(results)) {
  const p50 = result.metrics.median;
  const target = TARGETS[name];

  if (p50 > target) {
    console.error(`L ${name}: ${p50}ms (target: ${target}ms)`);
    process.exit(1);
  } else {
    console.log(` ${name}: ${p50}ms (target: ${target}ms)`);
  }
}
```

---

## Test Helpers and Utilities

### Workspace Helpers

```typescript
// tests/helpers/workspace.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function createTestWorkspace(): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specgofer-test-'));

  // Create .specify structure
  await fs.promises.mkdir(path.join(tmpDir, '.specify/specs'), { recursive: true });
  await fs.promises.mkdir(path.join(tmpDir, '.specify/memory'), { recursive: true });

  return tmpDir;
}

export async function cleanupTestWorkspace(dir: string): Promise<void> {
  let attempts = 0;

  while (attempts < 3) {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      attempts++;
      if (attempts >= 3) {
        console.warn(`Failed to clean up ${dir}:`, error);
        return; // Don't fail test on cleanup error
      }
      await new Promise(resolve => setTimeout(resolve, 100 * attempts));
    }
  }
}

export async function createTestSpec(workspace: string, specId: string, content: string): Promise<string> {
  const specPath = path.join(workspace, `.specify/specs/${specId}/spec.md`);
  await fs.promises.mkdir(path.dirname(specPath), { recursive: true });
  await fs.promises.writeFile(specPath, content);
  return specPath;
}
```

### Async Helpers

```typescript
// tests/helpers/async-helpers.ts
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

export async function waitForFileChange(filePath: string, timeout: number = 5000): Promise<void> {
  const initialMtime = (await fs.promises.stat(filePath)).mtimeMs;

  await waitForCondition(async () => {
    const currentMtime = (await fs.promises.stat(filePath)).mtimeMs;
    return currentMtime > initialMtime;
  }, timeout);
}
```

---

## Running Tests

### Local Development

```bash
# Run all tests
npm test

# Run specific suite
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Run specific file
npm test -- tests/unit/utils/FileUtils.test.ts
```

### VSCode Test Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:watch"],
  "console": "integratedTerminal"
}
```

---

## Coverage and Telemetry

### Coverage Thresholds

**Three-Tier Coverage Strategy**:
- **Aggregate**: 85% across all files (lines, branches, functions, statements)
- **Per-File**: 80% minimum per file (enabled by default)
- **Critical Paths**: 90% for autonomous driver, task execution, MCP tools

Configured in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      lines: 85,        // Aggregate threshold
      branches: 85,     // Aggregate threshold
      functions: 85,    // Aggregate threshold
      statements: 85,   // Aggregate threshold
      perFile: true,    // Enforce 80% per-file minimum
      exclude: ['tests/**', 'dist/**', 'node_modules/**']
    }
  }
});
```

**Critical paths requiring 90% coverage**:
- `extension/src/autonomous/` (autonomous driver components)
- `extension/src/orchestrator/TaskQueue.ts`, `ProgressReporter.ts`
- `language-server/src/mcpTools/` (MCP tool handlers)

### Viewing Coverage Reports

```bash
npm run test:coverage
open coverage/index.html  # Opens HTML report in browser
```

### Test Telemetry

CTRF reports are automatically generated in `test-results/`:

```bash
test-results/
   unit/
      ctrf-report.json
   integration/
      ctrf-report.json
   e2e/
      ctrf-report.json
   performance/
       ctrf-report.json
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: unit-results
          path: test-results/unit/
          retention-days: 90

  test-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: integration-results
          path: test-results/integration/

  test-e2e:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        vscode-version: [stable, insiders]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:e2e
        env:
          VSCODE_VERSION: ${{ matrix.vscode-version }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-results-${{ matrix.vscode-version }}
          path: test-results/e2e/

  test-report:
    needs: [test-unit, test-integration, test-e2e]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
      - run: node scripts/aggregate-results.js
      - run: node scripts/check-coverage-threshold.js
```

---

## Best Practices

### DO 

- Use real file system operations with temporary directories
- Create isolated test workspaces for each test
- Clean up resources reliably (with retry logic)
- Use `waitForCondition()` for async operations
- Test actual error paths, not just happy paths
- Write descriptive test names that explain the scenario
- Follow AAA pattern (Arrange, Act, Assert)

### DON'T L

- Mock file system, VSCode APIs, or component interactions
- Use fixed delays (`setTimeout`) for synchronization
- Share state between tests
- Commit test artifacts or temporary files
- Skip cleanup in `afterEach`
- Test implementation details instead of behavior
- Write tests that depend on external services without fallback

---

## Troubleshooting

### Test Failures in CI

**Problem**: Tests pass locally but fail in CI

**Solution**:
- Check for timing issues (use `waitForCondition()` instead of delays)
- Ensure proper cleanup (Windows file locking can delay cleanup)
- Verify environment variables are set in CI
- Check for resource leaks (file handles, watchers, connections)

### Flaky Tests

**Problem**: Tests fail intermittently

**Solution**:
- Increase timeout for `waitForCondition()`
- Add retry logic (Vitest: `test.retry(2)`)
- Check for race conditions in async code
- Ensure proper event handling (don't miss events)
- Review flaky test report in CTRF output

### Slow Tests

**Problem**: Test suite takes too long

**Solution**:
- Parallelize independent tests
- Reduce fixture size (don't create 100 files if 10 is enough)
- Use `beforeAll` for expensive setup (but maintain isolation)
- Profile slow tests with `npm run test -- --reporter=verbose`
- Optimize critical paths identified by performance benchmarks

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev)
- [@vscode/test-electron Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [WebdriverIO VSCode Service](https://www.npmjs.com/package/wdio-vscode-service)
- [CTRF Specification](https://ctrf.io)
- [SpecGofer Constitution](.specify/memory/constitution.md) - Testing principles

---

**Last Updated**: 2025-11-06
