# Research: Testing Coverage Expansion Technology Decisions

**Feature**: 006-testing-coverage-expansion
**Date**: 2025-11-06
**Status**: Complete

## Summary

This document consolidates research findings for all technology decisions required to implement comprehensive testing coverage expansion with real data, full telemetry, and VSCode extension best practices.

---

## 1. VSCode Extension Testing Tools ✅ DECIDED

**Decision**: `@vscode/test-cli` + `@vscode/test-electron`

**Rationale**:
- Official Microsoft tooling with long-term support
- Real VSCode instances (not simulated environments)
- Mocha integration built-in
- Excellent GitHub Actions compatibility
- Full VSCode API access during test execution

**Alternatives Considered**:
- Custom test harness - Rejected: reinvents wheel, no official support

**Status**: COMPLETED (decided during clarification phase)

---

## 2. Webview Testing Tools ✅ DECIDED

**Decision**: WebdriverIO with wdio-vscode-service

**Rationale**:
1. **GitHub Actions**: Works out-of-the-box, no xvfb configuration required
2. **Headless Webview Support**: Full support (vscode-extension-tester cannot test webviews headlessly)
3. **Simple Setup**: Wizard-based configuration, minimal boilerplate
4. **Modern Architecture**: Built on WebdriverIO v8+, actively maintained
5. **Developer Experience**: Cleaner API, less verbose than alternatives

**Comparison**:

| Feature | WebdriverIO | vscode-extension-tester |
|---------|------------|------------------------|
| GitHub Actions Setup | ✅ Simple | ⚠️ Requires xvfb |
| Headless Webviews | ✅ Full support | ❌ GUI required |
| Setup Complexity | ✅ Low | ⚠️ Medium |
| Code Boilerplate | ✅ Minimal | ⚠️ Verbose |
| Community | ⚠️ Smaller (37 stars) | ✅ Larger (307 stars) |
| Maintenance | ✅ Active | ✅ Excellent |

**Example Test**:
```typescript
describe('Memory Panel', () => {
    it('should create a new decision', async () => {
        const workbench = await browser.getWorkbench()
        await browser.executeWorkbench((vscode) => {
            vscode.commands.executeCommand('specgofer.openMemoryPanel')
        })

        await browser.switchFrame(await $('iframe'))
        await browser.switchFrame(await $('iframe'))

        await $('#decision-title').setValue('Use TypeScript')
        await $('#save-button').click()

        await expect($('.success-message')).toBeDisplayed()
    })
})
```

**Implementation Estimate**: 10-17 hours (setup + Memory Panel + Constitution Provider tests)

**Alternatives Considered**:
- vscode-extension-tester - Rejected: cannot test webviews headlessly (major limitation for CI)

---

## 3. Test Telemetry Storage ✅ DECIDED

**Decision**: JSON Artifacts + CTRF Format (with optional BuildPulse for advanced analytics)

**Rationale**:
1. **Zero Infrastructure**: No databases, no external dependencies
2. **Version Control Friendly**: Artifacts tied to commits and workflow runs
3. **CI Integration**: Native GitHub Actions support
4. **Standardized Format**: CTRF (Common Test Report Format) provides universal schema
5. **Comprehensive Telemetry**: Supports timing, flaky tests, execution traces, memory profiling
6. **Free**: No costs beyond GitHub storage quota (2GB)
7. **Extensible**: CTRF `extra` field allows custom properties

**CTRF Structure Example**:
```json
{
  "reportFormat": "CTRF",
  "specVersion": "1.0.0",
  "reportId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-11-06T10:30:00.000Z",
  "results": {
    "summary": {
      "tests": 150,
      "passed": 145,
      "failed": 3,
      "flaky": 2,
      "duration": 300000
    },
    "tests": [
      {
        "name": "should authenticate user",
        "status": "passed",
        "duration": 1250,
        "flaky": false,
        "extra": {
          "memoryUsageMB": 45.2,
          "heapUsedMB": 38.5
        }
      }
    ]
  },
  "insights": {
    "passRate": {
      "current": 96.7,
      "baseline": 95.2,
      "change": 1.5
    }
  }
}
```

**GitHub Actions Integration**:
```yaml
- name: Upload Test Results
  uses: actions/upload-artifact@v4
  with:
    name: test-results-${{ github.run_id }}
    path: test-results/ctrf-report.json
    retention-days: 90
```

**Optional BuildPulse Integration**:
- Free tier: 10,000 test results/day
- Provides: Flaky test analytics, PR comments, team notifications
- Zero maintenance
- Complementary to JSON artifacts (not replacement)

**Alternatives Considered**:
- SQLite database - Rejected: merge conflicts, schema management overhead, backup complexity
- External services only (Codecov, TestRail) - Rejected: vendor lock-in, cost, limited customization
- Codecov - Considered for coverage only, but CTRF artifacts provide more comprehensive telemetry

**Limitations & Workarounds**:
- Limited querying: Build Node.js scripts to download/analyze artifacts
- 90-day retention: Sufficient for most needs; archive critical reports separately
- Manual aggregation: Acceptable trade-off for zero maintenance

---

## 4. Performance Benchmarking ✅ DECIDED

**Decision**: Vitest Bench (powered by Tinybench) + Custom p95 Calculation

**Rationale**:
1. **Statistical Rigor**: Comprehensive metrics (p50, p75, p99, mean, variance, confidence intervals)
2. **CI Integration**: Zero additional dependencies (already using Vitest)
3. **Minimal Overhead**: High-resolution timing with minimal performance impact
4. **Clear Reporting**: Built-in table output with percentiles
5. **p95 Workaround**: Access raw samples to calculate p95 programmatically

**Configuration**:
```typescript
bench('load spec file', async () => {
  await loadSpec('.specify/specs/001-example/spec.md');
}, {
  time: 2000,           // Run for 2 seconds
  iterations: 50,       // Minimum 50 runs
  warmupTime: 500,      // 500ms warmup
  warmupIterations: 15  // 15 warmup runs
});
```

**Percentile Calculation (p95)**:
```typescript
function calculateP95(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = (95 / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
```

**Threshold Checking**:
```typescript
const TARGETS = {
  specLoading: 500,      // ms (p50 < 500ms)
  fileDetection: 200,    // ms (p50 < 200ms)
  taskParsing: 100       // ms (p50 < 100ms)
};

// Check against targets
if (result.p50 > TARGETS[benchmarkName]) {
  console.error(`❌ ${benchmarkName} exceeded target`);
  process.exit(1);
}
```

**Comparison**:

| Feature | Vitest Bench | Benchmark.js | Custom Harness |
|---------|-------------|--------------|----------------|
| Percentiles | p50, p75, p99 | ❌ Not built-in | ✅ Any percentile |
| CI Integration | ✅ Excellent | Moderate | ✅ Easy |
| TypeScript | ✅ Native | Requires wrappers | ✅ Native |
| Setup | Low | Medium-High | Medium |
| Maintenance | Active | Low activity | Self-maintained |

**Alternatives Considered**:
- Benchmark.js - Rejected: no built-in percentiles, complex TypeScript setup
- Custom timing harness - Rejected: implementation risk, maintenance burden, no community validation

---

## 5. Coverage Delta Tracking ✅ DECIDED

**Decision**: CTRF `insights` object + GitHub Actions artifact comparison

**Rationale**:
1. **Built into CTRF**: Native support for baseline comparison
2. **GitHub Actions**: Use previous run artifacts as baseline
3. **Simple Implementation**: Compare current vs previous CTRF reports
4. **PR Comments**: Post coverage delta in pull request comments

**Implementation Approach**:
```yaml
# Download previous coverage report
- name: Download Baseline Coverage
  uses: dawidd6/action-download-artifact@v3
  with:
    workflow: test.yml
    name: coverage-report
    path: baseline/
    if_no_artifact_found: warn

# Compare and comment on PR
- name: Coverage Delta
  run: |
    node scripts/compare-coverage.js \
      baseline/ctrf-report.json \
      current/ctrf-report.json \
      >> $GITHUB_STEP_SUMMARY
```

**CTRF Insights Structure**:
```json
{
  "insights": {
    "passRate": {
      "current": 96.7,
      "baseline": 95.2,
      "change": 1.5
    }
  },
  "baseline": {
    "reportId": "previous-run-id",
    "timestamp": "2025-11-05T10:30:00.000Z",
    "commit": "previous-sha"
  }
}
```

**Alternatives Considered**:
- Codecov - Considered but CTRF provides more comprehensive telemetry
- Coveralls - Rejected: coverage only, limited features
- Custom diff tool - Not needed, CTRF provides structure

---

## 6. Parallel Test Orchestration ✅ DECIDED

**Decision**: GitHub Actions Matrix Strategy

**Rationale**:
1. **Native GitHub Actions**: No additional tools required
2. **Suite-Level Parallelism**: unit/integration/E2E as separate jobs
3. **Resource Isolation**: Each suite runs in separate runner
4. **Artifact Aggregation**: Combine results in final report job
5. **Multi-Version Testing**: Easy matrix for VSCode stable + insiders

**Implementation**:
```yaml
name: Test Suite

jobs:
  test-unit:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit
      - uses: actions/upload-artifact@v4
        with:
          name: unit-results
          path: test-results/unit/

  test-integration:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:integration
      - uses: actions/upload-artifact@v4
        with:
          name: integration-results
          path: test-results/integration/

  test-e2e:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        vscode-version: [stable, insiders]
    steps:
      - run: npm run test:e2e
        env:
          VSCODE_VERSION: ${{ matrix.vscode-version }}
      - uses: actions/upload-artifact@v4
        with:
          name: e2e-results-${{ matrix.vscode-version }}
          path: test-results/e2e/

  test-report:
    needs: [test-unit, test-integration, test-e2e]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - run: node scripts/aggregate-results.js
```

**Alternatives Considered**:
- nx/turborepo - Rejected: overkill for suite-level parallelism
- Custom script - Not needed, GitHub Actions matrix is sufficient

---

## 7. Flaky Test Detection ✅ DECIDED

**Decision**: Vitest Retry + CTRF Tracking + Optional BuildPulse

**Rationale**:
1. **Vitest Retry**: Built-in retry mechanism (0-3 retries configurable)
2. **CTRF Tracking**: Native support for flaky test metadata
3. **BuildPulse**: Free tier provides advanced flaky test analytics
4. **GitHub Actions**: Can fail builds based on flaky test threshold

**Vitest Configuration**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    retry: 2,  // Retry failed tests up to 2 times
    globals: true
  }
});
```

**CTRF Flaky Test Structure**:
```json
{
  "id": "test-id",
  "name": "should handle concurrent requests",
  "status": "passed",
  "flaky": true,
  "retries": 2,
  "retryAttempts": [
    {
      "attempt": 1,
      "status": "failed",
      "duration": 5100
    },
    {
      "attempt": 2,
      "status": "passed",
      "duration": 4850
    }
  ]
}
```

**Flaky Test Analysis Script**:
```typescript
// Find tests that are consistently flaky
const flakyTests = reports
  .flatMap(r => r.results.tests)
  .filter(t => t.flaky)
  .reduce((acc, t) => {
    acc[t.name] = (acc[t.name] || 0) + 1;
    return acc;
  }, {});

// Report tests flaky in >10% of runs
Object.entries(flakyTests)
  .filter(([_, count]) => count / totalRuns > 0.1)
  .forEach(([name, count]) => {
    console.error(`⚠️  Flaky test: ${name} (${count}/${totalRuns} runs)`);
  });
```

**BuildPulse Integration** (optional):
```yaml
- name: Upload to BuildPulse
  if: always()
  uses: buildpulse/test-reporter@v1
  with:
    account: ${{ secrets.BUILDPULSE_ACCOUNT_ID }}
    repository: ${{ secrets.BUILDPULSE_REPOSITORY_ID }}
    path: test-results/junit.xml
    key: ${{ secrets.BUILDPULSE_ACCESS_KEY_ID }}
    secret: ${{ secrets.BUILDPULSE_SECRET_ACCESS_KEY }}
```

**Alternatives Considered**:
- Custom tracking only - Decided to use but optionally augment with BuildPulse
- Third-party service (BuildPulse) - Free tier, provides immediate value, zero maintenance

---

## Technology Stack Summary

| Category | Decision | Rationale |
|----------|----------|-----------|
| **Unit/Integration Tests** | Vitest 3.2.4 | Already in use, excellent TypeScript support |
| **VSCode Extension Tests** | @vscode/test-cli + @vscode/test-electron | Official tooling, real VSCode instances |
| **Webview Testing** | WebdriverIO + wdio-vscode-service | Headless support, simple GitHub Actions setup |
| **E2E Tests** | @vscode/test-electron | Real VSCode environment, full API access |
| **Performance Benchmarks** | Vitest Bench (Tinybench) | Statistical rigor, zero dependencies |
| **Test Telemetry** | JSON Artifacts + CTRF | Zero infrastructure, version control friendly |
| **Coverage Tracking** | Vitest coverage + CTRF deltas | Built-in, comprehensive |
| **CI Orchestration** | GitHub Actions Matrix | Native, suite-level parallelism |
| **Flaky Test Detection** | Vitest Retry + CTRF + BuildPulse (optional) | Multi-layered approach, free tier |

---

## Dependencies to Add

```json
{
  "devDependencies": {
    "@vscode/test-cli": "^0.0.4",
    "@vscode/test-electron": "^2.3.8",
    "@wdio/cli": "^8.27.0",
    "wdio-vscode-service": "^6.0.2",
    "vitest-ctrf-json-reporter": "^0.0.13",
    "vitest": "^3.2.4"
  }
}
```

**Optional**:
- BuildPulse reporter (if using BuildPulse service)

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. Install dependencies (@vscode/test-cli, wdio-vscode-service, vitest-ctrf-json-reporter)
2. Configure `.vscode-test.js` for extension tests
3. Configure Vitest with CTRF reporter
4. Setup GitHub Actions workflows (unit, integration, e2e)

### Phase 2: Test Development (Weeks 2-4)
5. Write unit tests for all modules
6. Write integration tests for component interactions
7. Write E2E tests for user workflows
8. Write webview tests with WebdriverIO
9. Write performance benchmarks

### Phase 3: Telemetry & Analytics (Week 5)
10. Implement CTRF telemetry collection
11. Create trend analysis scripts
12. Setup coverage delta tracking
13. Configure flaky test detection
14. Optional: Integrate BuildPulse

### Phase 4: Documentation & Refinement (Week 6)
15. Write quickstart guide
16. Document test patterns
17. Create test templates
18. Optimize slow tests
19. Achieve 85%+ coverage target

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| E2E tests slow/flaky | Medium | High | Use --disable-extensions, implement retry logic, track flaky tests |
| Coverage targets aggressive | Low | Medium | Start with 80%, incrementally increase, focus critical paths first |
| Webview testing complex | Medium | Medium | WebdriverIO simplifies vs alternatives, allocate extra time |
| Test execution > 10 min | Low | Medium | Parallel suite execution, optimize slowest tests |
| Telemetry infrastructure complex | Low | Low | CTRF + JSON artifacts is simple, enhance incrementally |

---

## Success Criteria Validation

All research decisions support the success criteria defined in spec.md:

- ✅ **SC-001**: 85%+ coverage - Vitest coverage + comprehensive test suites
- ✅ **SC-002**: E2E workflow coverage - @vscode/test-electron + WebdriverIO
- ✅ **SC-003**: Test suite < 10 min - GitHub Actions parallel execution
- ✅ **SC-004**: 95%+ stable runs - Flaky test detection + retry logic
- ✅ **SC-005**: 90%+ business logic coverage - Unit test focus
- ✅ **SC-006**: Integration coverage - Vitest integration tests
- ✅ **SC-007**: Spec loading < 500ms - Vitest Bench validation
- ✅ **SC-008**: Test authoring < 30 min - Templates + helpers
- ✅ **SC-009**: Actionable reports - CTRF full telemetry
- ✅ **SC-010**: Zero skipped tests - Comprehensive implementation
- ✅ **SC-011**: Zero mocks - Real VSCode instances, real data
- ✅ **SC-012**: Multi-version VSCode - GitHub Actions matrix

---

**Status**: All research complete. Ready for Phase 1 (Design & Data Modeling).
