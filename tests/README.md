# SpecGofer Testing Guide

This document describes the testing philosophy, infrastructure, and best
practices for SpecGofer.

## Testing Philosophy: Real Tests with Real Data

SpecGofer follows a strict **"Real Tests with Real Data"** philosophy. This
means:

### What We Do

1. **Use Real File System Operations**
   - Create actual files and directories for tests
   - Use `fs/promises` to read/write real content
   - Clean up test artifacts after each test

2. **Use Real Component Interactions**
   - Test actual parsing logic, not mocked returns
   - Verify real error handling paths
   - Validate actual output formats

3. **Use Temporary Workspaces**
   - Create isolated test workspaces in the system temp directory
   - Each test gets a fresh workspace
   - Automatic cleanup with retry logic for Windows file locking

4. **Use Real Fixtures**
   - Maintain realistic test data in `tests/fixtures/`
   - Spec files with actual YAML frontmatter and markdown
   - Workspace structures that mirror production use

### What We Don't Do

1. **No Mocking Frameworks**
   - No `vi.mock()` for module mocking
   - No `vi.fn()` for function stubs (except for callbacks/spies)
   - No `sinon`, `jest.mock()`, or similar tools

2. **No Fake Data**
   - No hardcoded return values that bypass logic
   - No artificial success/failure scenarios
   - Tests must exercise real code paths

3. **No VSCode API Mocking for Unit Tests**
   - VSCode-dependent code is tested in integration/E2E suites
   - Use `@vscode/test-electron` for real VSCode environment
   - Pure business logic is extracted and tested separately

## Test Categories

### Unit Tests (`tests/unit/`)

Fast, isolated tests for pure business logic:

- Parser logic (YAML frontmatter, markdown, tasks)
- Utility functions (file operations, string manipulation)
- Data structures (dependency graphs, queues)
- Validation rules (spec format, task format)

**Run:** `npm run test:unit`

### Integration Tests (`tests/integration/`)

Component interaction tests with real dependencies:

- File monitoring + spec loading
- LSP/MCP communication
- Multi-component flows

**Run:** `npm run test:integration`

### E2E Tests (`tests/e2e/`)

Full user workflow tests with real VSCode:

- Extension activation
- Claude Code terminal integration
- Webview interactions
- Command execution

**Run:** `npm run test:e2e`

### Performance Tests (`tests/performance/`)

Benchmark tests with real data loads:

- Spec loading performance (100+ specs)
- File detection latency
- Task parsing speed
- Extension activation time

**Run:** `npm run test:performance`

## Test Helpers

### Workspace Helpers (`tests/helpers/workspace.ts`)

```typescript
import {
  createTestWorkspace,
  cleanupTestWorkspace,
  createTestSpec,
  createTestTasks,
} from '../helpers/workspace';

describe('MyTest', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await createTestWorkspace();
  });

  afterEach(async () => {
    await cleanupTestWorkspace(workspace);
  });

  it('should work with real files', async () => {
    await createTestSpec(workspace, '001-feature', '# Feature\nStatus: draft');
    // Test your logic with real file system
  });
});
```

### Async Helpers (`tests/helpers/async-helpers.ts`)

```typescript
import { waitForCondition, waitForFileChange } from '../helpers/async-helpers';

// Wait for a condition with timeout
await waitForCondition(() => fileExists(path), 5000);

// Wait for file system change
await waitForFileChange(filePath, 3000);
```

### VSCode Test Helpers (`tests/helpers/vscode-test.ts`)

For integration/E2E tests that require VSCode:

```typescript
import { setupVSCodeTest } from '../helpers/vscode-test';

// Sets up real VSCode test environment
const { extensionContext, workspaceFolder } = await setupVSCodeTest();
```

## Test Fixtures

### Spec Fixtures (`tests/fixtures/specs/`)

- `001-basic/spec.md` - Minimal valid spec
- `002-with-tasks/` - Spec with tasks.md
- `003-complex/` - Full spec with all artifacts

### Workspace Fixtures (`tests/fixtures/workspaces/`)

- `multi-spec/` - Workspace with multiple specs
- `large-workspace/` - Performance testing workspace

## Writing Good Tests

### Do: Test Real Behavior

```typescript
// Good: Tests actual parsing
it('should parse YAML frontmatter', async () => {
  await createTestSpec(
    workspace,
    '001-test',
    `---
title: "Test"
status: "draft"
---
Content
`
  );

  const spec = await loader.loadSpec('001-test');
  expect(spec?.title).toBe('Test');
  expect(spec?.status).toBe('draft');
});
```

### Don't: Mock the Logic

```typescript
// Bad: Bypasses actual parsing
it('should parse YAML frontmatter', async () => {
  vi.mock('gray-matter', () => ({
    default: () => ({ data: { title: 'Test' } }),
  }));
  // This doesn't test actual parsing!
});
```

### Do: Test Error Paths with Real Errors

```typescript
// Good: Creates actual invalid file
it('should handle corrupted files', async () => {
  await fs.writeFile(
    path.join(workspace, '.specify/specs/001-bad/spec.md'),
    Buffer.from([0x00, 0x01]) // Binary content
  );

  const specs = await loader.loadAllSpecs();
  expect(specs).toEqual([]); // Graceful handling
});
```

### Don't: Mock Error Responses

```typescript
// Bad: Doesn't test real error handling
it('should handle corrupted files', async () => {
  vi.mocked(fs.readFile).mockRejectedValue(new Error('Mock error'));
  // Error path is artificial
});
```

## Coverage Requirements

- **Overall:** 85% minimum
- **Critical paths:** 90% minimum (autonomous driver, task execution)
- **Per-file thresholds:** Configured in `vitest.config.ts`

Run coverage report:

```bash
npm run test:coverage
```

## CI Integration

Tests run in GitHub Actions with:

- Parallel execution for unit/integration/E2E
- VSCode version matrix (stable + insiders)
- Coverage reporting with threshold enforcement
- Performance benchmark tracking

## Troubleshooting

### Windows File Locking

The `cleanupTestWorkspace` helper includes retry logic with exponential backoff
for Windows file locking issues.

### Slow Tests

- Check for missing `afterEach` cleanup
- Ensure async operations are properly awaited
- Use `timeout` option for slow operations

### Flaky Tests

- Avoid timing-dependent assertions
- Use `waitForCondition` instead of `setTimeout`
- Ensure test isolation (no shared state)

## Related Documentation

- [AGENTS.md](../AGENTS.md) - Code quality guidelines
- [Constitution](../.specify/memory/constitution.md) - Project principles
- [vitest.config.ts](../vitest.config.ts) - Test configuration
