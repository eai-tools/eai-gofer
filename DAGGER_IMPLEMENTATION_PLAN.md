# SpecGofer Dagger Integration Implementation Plan

**Status**: Research Complete **Target**: VSCode Extension Test Orchestration
**Scope**: Full implementation guidance based on Dagger SDK patterns

---

## Overview

This document provides an actionable implementation plan for integrating Dagger
SDK patterns into SpecGofer's test orchestration system. It synthesizes research
findings into a structured roadmap with concrete code examples.

---

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Module Setup

Create Dagger module structure:

```bash
mkdir -p .specify/dagger/src
cd .specify/dagger

# Initialize Dagger TypeScript module
dagger init --name=test-orchestration --sdk=typescript

# Ensure ES modules support
npm pkg set type=module

# Update tsconfig.json with:
# "module": "NodeNext"
```

### 1.2 Basic Infrastructure Module

**File**: `.specify/dagger/src/index.ts`

```typescript
import { dag, object, func, Container, Directory } from '@dagger.io/dagger';

@object()
export class TestOrchestrator {
  /**
   * Build test environment with cached dependencies
   */
  @func()
  buildEnv(source: Directory): Container {
    return dag
      .container()
      .from('node:21-alpine')
      .withDirectory('/src', source)
      .withWorkdir('/src')
      .withMountedCache('/root/.npm', dag.cacheVolume('npm-cache-node-21'))
      .withExec(['npm', 'ci']);
  }

  /**
   * Compile TypeScript
   */
  @func()
  compile(source: Directory): Container {
    return this.buildEnv(source).withExec(['npm', 'run', 'compile']);
  }

  /**
   * Run unit tests
   */
  @func()
  async unitTests(source: Directory): Promise<string> {
    return this.compile(source)
      .withExec([
        'npm',
        'run',
        'test:unit',
        '--',
        '--reporter=json',
        '--outputFile=/tmp/unit-results.json',
      ])
      .stdout();
  }

  /**
   * Run linting
   */
  @func()
  async lint(source: Directory): Promise<string> {
    return this.compile(source)
      .withExec(['npm', 'run', 'lint', '--', '--format=json'])
      .stdout();
  }
}
```

### 1.3 Initial Testing

```bash
# Verify module loads
dagger functions

# Run unit tests
dagger call unitTests --source=.

# Run linting
dagger call lint --source=.
```

**Success Criteria**:

- Module initializes without errors
- Unit tests complete successfully
- Linting passes
- npm cache volume is mounted and reused

---

## Phase 2: Enhanced Test Coverage (Weeks 2-3)

### 2.1 VSCode Extension-Specific Tests

**File**: `.specify/dagger/src/vscode-tests.ts`

```typescript
import { dag, object, func, Container, Directory } from '@dagger.io/dagger';
import { TestOrchestrator } from './index.js';

@object()
export class VSCodeExtensionTests {
  orchestrator: TestOrchestrator = new TestOrchestrator();

  /**
   * Run VSCode extension tests (Mocha-based)
   */
  @func()
  async extensionTests(source: Directory): Promise<string> {
    return this.orchestrator
      .compile(source)
      .withExec(['npm', 'run', 'test:extension'])
      .stdout();
  }

  /**
   * Run E2E tests with Playwright
   */
  @func()
  async e2eTests(source: Directory): Promise<string> {
    return this.orchestrator
      .buildEnv(source)
      .withExec(['npm', 'install', '-D', '@playwright/test'])
      .withExec(['npm', 'run', 'test:e2e'])
      .stdout();
  }

  /**
   * Validate VSIX package can be built
   */
  @func()
  async validatePackage(source: Directory): Promise<string> {
    return this.orchestrator
      .compile(source)
      .withExec(['npm', 'install', '-D', '@vscode/vsce'])
      .withExec(['vsce', 'package', '--target', 'linux-x64'])
      .stdout();
  }

  /**
   * Run all extension tests in parallel
   */
  @func()
  async allExtensionTests(source: Directory): Promise<void> {
    const tests = [
      this.extensionTests(source).then(() => {}),
      this.e2eTests(source).then(() => {}),
      this.validatePackage(source).then(() => {}),
    ];

    await Promise.allSettled(tests);
  }
}
```

### 2.2 Artifact Collection Module

**File**: `.specify/dagger/src/artifacts.ts`

```typescript
import { dag, object, func, Directory, File } from '@dagger.io/dagger';
import { TestOrchestrator } from './index.js';

@object()
export class ArtifactCollector {
  orchestrator: TestOrchestrator = new TestOrchestrator();

  /**
   * Collect all test results and logs
   */
  @func()
  async collectAllArtifacts(source: Directory): Promise<Directory> {
    let container = this.orchestrator
      .buildEnv(source)
      .withExec(['mkdir', '-p', '/tmp/results']);

    // Create subdirectories for organization
    container = container.withExec([
      'mkdir',
      '-p',
      '/tmp/results/{unit,integration,lint,extension,e2e}',
    ]);

    // Run each test type and capture results
    const testCommands = [
      {
        name: 'unit',
        cmd: [
          'npm',
          'run',
          'test:unit',
          '--',
          '--reporter=json',
          '--outputFile=/tmp/results/unit/results.json',
        ],
      },
      {
        name: 'lint',
        cmd: [
          'npm',
          'run',
          'lint',
          '--',
          '--format=json',
          '--outputFile=/tmp/results/lint/results.json',
        ],
      },
      {
        name: 'extension',
        cmd: ['npm', 'run', 'test:extension'],
      },
    ];

    for (const test of testCommands) {
      try {
        container = container.withExec(test.cmd);
        // Capture stdout/stderr for each test
        container = container.withExec([
          'sh',
          '-c',
          `npm run ${test.name} > /tmp/results/${test.name}/stdout.log 2>/tmp/results/${test.name}/stderr.log || true`,
        ]);
      } catch {
        // Continue collecting other results
      }
    }

    return container.directory('/tmp/results');
  }

  /**
   * Generate HTML test report
   */
  @func()
  async generateReport(source: Directory): Promise<File> {
    const resultsDir = await this.collectAllArtifacts(source);

    const container = dag
      .container()
      .from('node:21-alpine')
      .withDirectory('/results', resultsDir)
      .withWorkdir('/results')
      .withExec(['npm', 'install', '-g', 'html-reporter'])
      .withExec([
        'sh',
        '-c',
        'html-reporter --input=. --output=/tmp/report.html || true',
      ]);

    return container.file('/tmp/report.html');
  }

  /**
   * Export coverage reports
   */
  @func()
  async collectCoverage(source: Directory): Promise<Directory> {
    return this.orchestrator
      .compile(source)
      .withExec([
        'npm',
        'run',
        'test:unit',
        '--',
        '--coverage',
        '--coverage-reporters=html,lcov,json',
      ])
      .directory('./coverage');
  }
}
```

### 2.3 Integration with CI/CD

**File**: `.github/workflows/test-dagger.yml`

```yaml
name: Tests with Dagger

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      checks: write

    steps:
      - uses: actions/checkout@v4

      - uses: dagger/dagger-for-github@v5
        with:
          version: latest

      - name: Run all tests
        run: |
          dagger call allTests --source=.

      - name: Collect artifacts
        if: always()
        run: |
          dagger call collectAllArtifacts --source=. export --path=./test-artifacts

      - name: Generate report
        if: always()
        run: |
          dagger call generateReport --source=. export --path=./test-report.html

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-artifacts/

      - name: Upload coverage
        if: always()
        uses: codecov/codecov-action@v3
        with:
          files: ./test-artifacts/coverage/lcov.info
```

**Success Criteria**:

- All tests execute through Dagger
- Results collected in structured format
- GitHub Actions integration works
- Artifacts upload successfully

---

## Phase 3: Performance Optimization (Weeks 3-4)

### 3.1 Parallel Execution Implementation

**File**: `.specify/dagger/src/orchestration.ts`

```typescript
import { dag, object, func, Directory } from '@dagger.io/dagger';
import { TestOrchestrator } from './index.js';
import { VSCodeExtensionTests } from './vscode-tests.js';
import { ArtifactCollector } from './artifacts.js';

@object()
export class ParallelOrchestration {
  testOrch = new TestOrchestrator();
  vscodeTests = new VSCodeExtensionTests();
  artifacts = new ArtifactCollector();

  /**
   * Run independent tests in parallel for maximum speed
   */
  @func()
  async parallelTests(
    source: Directory,
    parallel: boolean = true
  ): Promise<void> {
    const tests = [
      { name: 'Unit Tests', task: this.testOrch.unitTests(source) },
      { name: 'Linting', task: this.testOrch.lint(source) },
      {
        name: 'VSCode Extension',
        task: this.vscodeTests.extensionTests(source),
      },
      { name: 'E2E Tests', task: this.vscodeTests.e2eTests(source) },
    ];

    if (parallel) {
      console.log('Running tests in parallel...');
      const results = await Promise.allSettled(
        tests.map((t) => t.task.then(() => t))
      );

      results.forEach((result, idx) => {
        const testName = tests[idx].name;
        if (result.status === 'fulfilled') {
          console.log(`✓ ${testName} passed`);
        } else {
          console.log(`✗ ${testName} failed`);
        }
      });
    } else {
      console.log('Running tests sequentially...');
      for (const test of tests) {
        try {
          await test.task;
          console.log(`✓ ${test.name} passed`);
        } catch (e) {
          console.log(`✗ ${test.name} failed`);
        }
      }
    }
  }

  /**
   * Run only fast tests (fail-fast approach)
   */
  @func()
  async fastTests(source: Directory): Promise<void> {
    // Quick checks first
    const quick = [
      this.testOrch.compile(source).then(() => {}),
      this.testOrch.lint(source).then(() => {}),
    ];

    await Promise.all(quick);
    console.log('Fast checks passed, safe to proceed with full suite');
  }

  /**
   * Run full test suite with comprehensive reporting
   */
  @func()
  async fullTestSuite(source: Directory): Promise<void> {
    console.log('Starting full test suite...');

    // Run all tests in parallel
    await this.parallelTests(source, true);

    // Collect results
    console.log('Collecting artifacts...');
    const results = await this.artifacts.collectAllArtifacts(source);

    console.log('Test suite complete - results available in artifacts');
  }
}
```

### 3.2 Performance Benchmarking

**File**: `.specify/dagger/src/benchmarks.ts`

```typescript
import { dag, object, func, Directory } from '@dagger.io/dagger';

@object()
export class PerformanceBenchmarks {
  /**
   * Measure sequential execution time
   */
  @func()
  async benchmarkSequential(source: Directory): Promise<string> {
    const start = Date.now();

    const container = dag
      .container()
      .from('node:21-alpine')
      .withDirectory('/src', source)
      .withWorkdir('/src')
      .withMountedCache('/root/.npm', dag.cacheVolume('npm-cache'))
      .withExec(['npm', 'ci']);

    await container.withExec(['npm', 'run', 'test:unit']).stdout();
    await container.withExec(['npm', 'run', 'test:integration']).stdout();
    await container.withExec(['npm', 'run', 'lint']).stdout();

    const elapsed = Date.now() - start;
    return `Sequential execution: ${elapsed}ms`;
  }

  /**
   * Measure parallel execution time
   */
  @func()
  async benchmarkParallel(source: Directory): Promise<string> {
    const start = Date.now();

    const container = dag
      .container()
      .from('node:21-alpine')
      .withDirectory('/src', source)
      .withWorkdir('/src')
      .withMountedCache('/root/.npm', dag.cacheVolume('npm-cache'))
      .withExec(['npm', 'ci']);

    await Promise.all([
      container
        .withExec(['npm', 'run', 'test:unit'])
        .stdout()
        .then(() => {}),
      container
        .withExec(['npm', 'run', 'test:integration'])
        .stdout()
        .then(() => {}),
      container
        .withExec(['npm', 'run', 'lint'])
        .stdout()
        .then(() => {}),
    ]);

    const elapsed = Date.now() - start;
    return `Parallel execution: ${elapsed}ms`;
  }

  /**
   * Measure cache effectiveness
   */
  @func()
  async benchmarkCacheImpact(source: Directory): Promise<string> {
    // First run (no cache)
    const start1 = Date.now();
    await dag
      .container()
      .from('node:21-alpine')
      .withDirectory('/src', source)
      .withWorkdir('/src')
      .withMountedCache('/root/.npm', dag.cacheVolume('npm-cache-bench-1'))
      .withExec(['npm', 'ci'])
      .stdout();
    const time1 = Date.now() - start1;

    // Second run (with cache)
    const start2 = Date.now();
    await dag
      .container()
      .from('node:21-alpine')
      .withDirectory('/src', source)
      .withWorkdir('/src')
      .withMountedCache('/root/.npm', dag.cacheVolume('npm-cache-bench-1'))
      .withExec(['npm', 'ci'])
      .stdout();
    const time2 = Date.now() - start2;

    const improvement = Math.round(((time1 - time2) / time1) * 100);
    return `Cache impact: First run ${time1}ms, Cached ${time2}ms (${improvement}% improvement)`;
  }
}
```

**Success Criteria**:

- Parallel tests complete faster than sequential
- Cache provides measurable improvement (40%+)
- No flaky tests due to parallelization
- All result formats validate correctly

---

## Phase 4: Advanced Features (Weeks 4-5)

### 4.1 Multi-Platform Testing

**File**: `.specify/dagger/src/multi-platform.ts`

```typescript
import { dag, object, func, Directory } from '@dagger.io/dagger';

type Platform = 'linux' | 'macos-simulator' | 'windows';

@object()
export class MultiPlatformTests {
  /**
   * Run tests on different Node.js versions
   */
  @func()
  async testMultipleNodeVersions(
    source: Directory,
    versions: string[] = ['18', '20', '21']
  ): Promise<void> {
    const results = await Promise.allSettled(
      versions.map((version) =>
        dag
          .container()
          .from(`node:${version}-alpine`)
          .withDirectory('/src', source)
          .withWorkdir('/src')
          .withMountedCache(
            `/root/.npm`,
            dag.cacheVolume(`npm-cache-node-${version}`)
          )
          .withExec(['npm', 'ci'])
          .withExec(['npm', 'run', 'test'])
          .stdout()
      )
    );

    results.forEach((result, idx) => {
      const version = versions[idx];
      if (result.status === 'fulfilled') {
        console.log(`✓ Tests passed on Node.js ${version}`);
      } else {
        console.log(`✗ Tests failed on Node.js ${version}`);
      }
    });
  }

  /**
   * Test on Linux with different package managers
   */
  @func()
  async testPackageManagers(
    source: Directory,
    managers: string[] = ['npm', 'yarn', 'pnpm']
  ): Promise<void> {
    const results = await Promise.allSettled(
      managers.map((manager) => {
        let cmd: string[];

        switch (manager) {
          case 'yarn':
            cmd = ['yarn', 'install'];
            break;
          case 'pnpm':
            cmd = ['pnpm', 'install'];
            break;
          default:
            cmd = ['npm', 'ci'];
        }

        return dag
          .container()
          .from('node:21-alpine')
          .withDirectory('/src', source)
          .withWorkdir('/src')
          .withMountedCache(
            `/root/.${manager}`,
            dag.cacheVolume(`${manager}-cache`)
          )
          .withExec(cmd)
          .withExec(['npm', 'run', 'test'])
          .stdout();
      })
    );

    results.forEach((result, idx) => {
      const manager = managers[idx];
      if (result.status === 'fulfilled') {
        console.log(`✓ Tests passed with ${manager}`);
      } else {
        console.log(`✗ Tests failed with ${manager}`);
      }
    });
  }
}
```

### 4.2 Dagger Cloud Integration

**Documentation**: Set up distributed caching

```bash
# Authenticate with Dagger Cloud
dagger cloud auth

# Set token in GitHub
gh secret set DAGGER_CLOUD_TOKEN --body <token>

# All subsequent dagger calls will use distributed cache
dagger call testAll --source=.
```

**Benefits**:

- Shared cache across all CI runs
- 2-10x faster pipelines on subsequent runs
- Automatic cache management
- Cost savings through reduced build time

---

## Implementation Checklist

### Phase 1: Foundation

- [ ] Create `.specify/dagger/` directory structure
- [ ] Initialize Dagger TypeScript module
- [ ] Implement basic `TestOrchestrator` class
- [ ] Set up npm cache volumes
- [ ] Test locally with `dagger call`
- [ ] Document setup process

### Phase 2: Enhanced Coverage

- [ ] Create VSCode extension test module
- [ ] Implement artifact collection
- [ ] Create GitHub Actions workflow
- [ ] Configure artifact upload
- [ ] Test CI/CD integration
- [ ] Document artifact formats

### Phase 3: Performance

- [ ] Implement parallel test execution
- [ ] Create performance benchmarking
- [ ] Run performance tests locally
- [ ] Document performance gains
- [ ] Create fail-fast quick tests
- [ ] Optimize slow tests

### Phase 4: Advanced

- [ ] Set up multi-version testing
- [ ] Configure multi-package-manager tests
- [ ] Integrate Dagger Cloud
- [ ] Create platform-specific tests
- [ ] Document advanced patterns
- [ ] Team training and documentation

---

## Key Metrics to Track

| Metric               | Baseline | Target     | Achieved |
| -------------------- | -------- | ---------- | -------- |
| **First run**        | ~90s     | < 60s      | TBD      |
| **Cached run**       | N/A      | < 15s      | TBD      |
| **Parallel speedup** | N/A      | 40% faster | TBD      |
| **Artifact export**  | N/A      | < 5s       | TBD      |
| **Test reliability** | TBD      | > 99%      | TBD      |

---

## Troubleshooting Guide

### Cache Not Working

```bash
# Verify cache volume exists
docker volume ls | grep npm-cache

# Check cache mounting in function
dagger call buildEnv --source=. --log-format plain | grep "Mount"

# Clear and restart
docker volume rm npm-cache-node-21
dagger call buildEnv --source=.
```

### Tests Failing Unexpectedly

```bash
# Run with detailed logging
dagger call unitTests --source=. --log-format plain

# Check exit code
dagger call unitTests --source=.
echo $?

# Examine container state
dagger call buildEnv --source=. --log-format plain
```

### Performance Issues

```bash
# Benchmark execution
dagger call benchmarkSequential --source=.
dagger call benchmarkParallel --source=.

# Check for unnecessary layer rebuilds
dagger call compile --source=. --log-format plain | grep -i "cache"
```

---

## Risk Mitigation

| Risk                     | Mitigation                              | Owner    |
| ------------------------ | --------------------------------------- | -------- |
| **Cache invalidation**   | Clear and rebuild on version bump       | DevOps   |
| **Test flakiness**       | Isolate parallel tests, add retries     | QA       |
| **Slow artifact export** | Filter results, use compression         | DevOps   |
| **CI/CD integration**    | Extensive local testing, staged rollout | Platform |

---

## Success Criteria (Overall)

- [x] Research complete
- [ ] Phase 1 implementation (foundation)
- [ ] Phase 2 implementation (coverage)
- [ ] Phase 3 implementation (performance)
- [ ] Phase 4 implementation (advanced)
- [ ] Full documentation complete
- [ ] Team trained on Dagger patterns
- [ ] Performance targets achieved
- [ ] Production deployment successful

---

## Next Steps

1. **Create Dagger module** (Phase 1 start)
   - Run `dagger init` in `.specify/dagger/`
   - Implement `TestOrchestrator` class
   - Test locally

2. **Document current state** (Parallel)
   - Create developer onboarding guide
   - Document cache strategy
   - Create troubleshooting guide

3. **CI/CD integration** (Phase 2)
   - Create GitHub Actions workflow
   - Configure artifact upload
   - Test with real PRs

4. **Performance optimization** (Phase 3)
   - Measure baseline performance
   - Implement parallelization
   - Benchmark improvements

5. **Advanced features** (Phase 4)
   - Set up Dagger Cloud
   - Multi-platform testing
   - Team training

---

**Document Created**: 2025-11-02 **Last Updated**: 2025-11-02 **Status**: Ready
for Implementation
