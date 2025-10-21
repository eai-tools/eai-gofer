# Tasks - Testing & CI/CD Infrastructure

## Phase 1: Test Framework Setup (✅ Completed)

### T001 (Framework) - Playwright Test Framework Setup
**Status**: ✅ Completed  
**Priority**: Critical  
**Dependencies**: none  
**Estimated Effort**: 4 hours  

**Description**: Configure Playwright test framework with proper configuration and helpers.

**Acceptance Criteria**:
- Playwright installed and configured
- Test configuration file (playwright.config.ts)
- Test helpers and utilities
- Browser setup for testing
- Test reporter configured

**Implementation**: `tests/playwright.config.ts` (if exists), package.json

---

## Phase 2: E2E Test Suites (📝 In-Progress)

### T002 (ExtensionTests) - VSCode Extension E2E Tests
**Status**: 🔴 Not Started  
**Priority**: Critical  
**Dependencies**: T001  
**Estimated Effort**: 16 hours  

**Description**: Create end-to-end tests for VSCode extension functionality.

**Acceptance Criteria**:
- Test extension activation
- Test spec tree view rendering
- Test constitution tree view
- Test initialization command
- Test migration command
- Test file watching and reloading
- Mock VSCode API where needed

**Test Files to Create**:
- `tests/e2e/extension-activation.spec.ts`
- `tests/e2e/tree-views.spec.ts`
- `tests/e2e/commands.spec.ts`
- `tests/e2e/file-watching.spec.ts`

---

### T003 (ServerTests) - Language Server E2E Tests
**Status**: 🔴 Not-Started  
**Priority**: Critical  
**Dependencies**: T001  
**Estimated Effort**: 16 hours  

**Description**: Create end-to-end tests for Language Server LSP + MCP functionality.

**Acceptance Criteria**:
- Test LSP connection and initialization
- Test all 6 MCP tools
- Test LSP custom methods
- Test error handling
- Test spec loading and parsing
- Mock file system operations

**Test Files to Create**:
- `tests/e2e/language-server/lsp-connection.spec.ts`
- `tests/e2e/language-server/mcp-tools.spec.ts`
- `tests/e2e/language-server/spec-loading.spec.ts`

---

### T004 (OrchestrationTests) - Orchestration E2E Tests
**Status**: 🔴 Not Started  
**Priority**: Critical  
**Dependencies**: T001  
**Estimated Effort**: 20 hours  

**Description**: Create end-to-end tests for complete orchestration workflow.

**Acceptance Criteria**:
- Test full spec-to-completion flow
- Test task dependency resolution
- Test Engineer agent validation
- Test Test agent execution
- Test retry logic (max 3 attempts)
- Test human escalation
- Mock Claude API responses
- Mock Twilio SMS

**Test Files to Create**:
- `tests/e2e/orchestration/full-workflow.spec.ts`
- `tests/e2e/orchestration/task-dependencies.spec.ts`
- `tests/e2e/orchestration/agent-coordination.spec.ts`
- `tests/e2e/orchestration/error-handling.spec.ts`

---

### T005 (IntegrationTests) - System Integration Tests
**Status**: 🔴 Not Started  
**Priority**: High  
**Dependencies**: T001  
**Estimated Effort**: 16 hours  

**Description**: Test integration between all major components (Extension, Server, Orchestrator).

**Acceptance Criteria**:
- Test Extension → Server communication
- Test Server → Orchestrator coordination
- Test MCP tools → Orchestrator integration
- Test file-based communication flow
- Test end-to-end with real file system

**Test Files to Create**:
- `tests/e2e/integration/extension-server.spec.ts`
- `tests/e2e/integration/server-orchestrator.spec.ts`
- `tests/e2e/integration/mcp-coordination.spec.ts`

---

## Phase 3: Test Infrastructure (📝 In-Progress)

### T006 (Fixtures) - Test Fixtures & Mocks
**Status**: 🔴 Not Started  
**Priority**: High  
**Dependencies**: T001  
**Estimated Effort**: 8 hours  

**Description**: Create reusable test fixtures, mocks, and test data.

**Acceptance Criteria**:
- Sample spec files for testing
- Mock Claude API responses
- Mock Twilio API responses
- Mock VSCode API
- Test workspace fixtures
- Utility functions for tests

**Files to Create**:
- `tests/fixtures/specs/` - Sample spec files
- `tests/fixtures/mocks/claude.ts` - Claude API mocks
- `tests/fixtures/mocks/twilio.ts` - Twilio API mocks
- `tests/fixtures/mocks/vscode.ts` - VSCode API mocks
- `tests/helpers/` - Test utilities

---

### T007 (TestData) - Test Data Generation
**Status**: 🔴 Not Started  
**Priority**: Medium  
**Dependencies**: T006  
**Estimated Effort**: 6 hours  

**Description**: Create test data generators for various scenarios.

**Acceptance Criteria**:
- Generate valid specs
- Generate invalid specs (for error testing)
- Generate task dependencies
- Generate test results
- Generate validation responses

**Implementation**: `tests/helpers/dataGenerators.ts`

---

## Phase 4: CI/CD Pipeline (🔴 Not Started)

### T008 (GithubActions) - GitHub Actions Workflow
**Status**: 🔴 Not Started  
**Priority**: Critical  
**Dependencies**: T002, T003, T004, T005  
**Estimated Effort**: 8 hours  

**Description**: Set up GitHub Actions for CI/CD pipeline.

**Acceptance Criteria**:
- Runs on push and PR
- Builds all three components (Extension, Server, Orchestrator)
- Runs all tests
- Lints TypeScript code
- Checks formatting
- Reports coverage
- Creates release artifacts

**File to Create**:
- `.github/workflows/ci.yml`

---

### T009 (TestReporting) - Test Results Reporting
**Status**: 🔴 Not-Started  
**Priority**: Medium  
**Dependencies**: T008  
**Estimated Effort**: 4 hours  

**Description**: Configure test reporting and coverage reporting in CI.

**Acceptance Criteria**:
- HTML test reports
- Coverage reports (lcov)
- Failed test artifacts
- Screenshots on failure
- Test summary in PR comments

**Implementation**: Update `.github/workflows/ci.yml`

---

### T010 (ReleaseAutomation) - Automated Release Pipeline
**Status**: 🔴 Not Started  
**Priority**: Medium  
**Dependencies**: T008  
**Estimated Effort**: 8 hours  

**Description**: Automate release process for extension and npm packages.

**Acceptance Criteria**:
- Automatic version bumping
- Changelog generation
- VSIX packaging
- GitHub release creation
- Asset uploads to release
- npm package publishing (if applicable)

**File to Create**:
- `.github/workflows/release.yml`

---

## Phase 5: Quality Gates & Checks (🔴 Not Started)

### T011 (Coverage) - Code Coverage Requirements
**Status**: 🔴 Not Started  
**Priority**: High  
**Dependencies**: T002, T003, T004, T005  
**Estimated Effort**: 6 hours  

**Description**: Enforce code coverage requirements in CI.

**Acceptance Criteria**:
- 80% overall coverage minimum
- Per-file coverage tracking
- Branch coverage reporting
- Fail CI if below threshold
- Coverage badge in README

**Implementation**: Update test configs and CI

---

### T012 (Linting) - Code Quality Checks
**Status**: 🔴 Not Started  
**Priority**: High  
**Dependencies**: T001  
**Estimated Effort**: 6 hours  

**Description**: Set up ESLint, Prettier, and TypeScript strict checks.

**Acceptance Criteria**:
- ESLint configured for TypeScript
- Prettier for code formatting
- TypeScript strict mode enabled
- No `any` types allowed
- Pre-commit hooks (Husky)
- CI enforcement

**Files to Create/Update**:
- `.eslintrc.json`
- `.prettierrc`
- `tsconfig.json` (all three packages)
- `.github/workflows/ci.yml`

---

### T013 (Security) - Security Scanning
**Status**: 🔴 Not Started  
**Priority**: High  
**Dependencies**: T008  
**Estimated Effort**: 4 hours  

**Description**: Add security scanning for vulnerabilities and secrets.

**Acceptance Criteria**:
- npm audit in CI
- Dependabot for dependency updates
- Secret scanning enabled
- SAST (static analysis security testing)
- Security policy documented

**Files to Create**:
- `.github/dependabot.yml`
- `SECURITY.md`
- Update `.github/workflows/ci.yml`

---

## Phase 6: Performance & Load Testing (📋 Planned)

### T14 (PerfTests) - Performance Benchmarks
**Status**: 🔴 Not-Started  
**Priority**: Low  
**Dependencies**: T001  
**Estimated Effort**: 12 hours  

**Description**: Create performance benchmarks for critical operations.

**Acceptance Criteria**:
- Benchmark spec loading (100+ specs)
- Benchmark tree view rendering
- Benchmark Language Server startup
- Benchmark MCP tool execution
- Performance regression detection

**Test Files to Create**:
- `tests/performance/spec-loading.bench.ts`
- `tests/performance/tree-rendering.bench.ts`
- `tests/performance/server-startup.bench.ts`

---

### T15 (LoadTests) - Load Testing
**Status**: 🔴 Not Started  
**Priority**: Low  
**Dependencies**: T14  
**Estimated Effort**: 12 hours  

**Description**: Test system under load with many concurrent operations.

**Acceptance Criteria**:
- Test with 100+ specs
- Test with 1000+ tasks
- Test concurrent MCP tool calls
- Test memory usage under load
- Test file watching with many files

**Test Files to Create**:
- `tests/load/large-project.spec.ts`
- `tests/load/concurrent-operations.spec.ts`

---

## Phase 7: Documentation & Examples (📋 Planned)

### T16 (TestDocs) - Test Documentation
**Status**: 🔴 Not Started  
**Priority**: Medium  
**Dependencies**: T001, T002, T003, T004, T005  
**Estimated Effort**: 6 hours  

**Description**: Document testing practices and how to run tests.

**Acceptance Criteria**:
- Testing guide (TESTING.md)
- How to write new tests
- How to run tests locally
- How to debug failing tests
- CI/CD documentation

**Files to Create**:
- `docs/TESTING.md` (already exists, update it)
- `tests/README.md`

---

### T17 (Examples) - Example Test Projects
**Status**: 🔴 Not-Started  
**Priority**: Low  
**Dependencies**: T001  
**Estimated Effort**: 8 hours  

**Description**: Create example projects for testing SpecGofer.

**Acceptance Criteria**:
- Simple calculator example
- REST API example
- React component example
- Each with complete specs
- Each with passing tests

**Files to Create**:
- `examples/calculator/`
- `examples/api-server/`
- `examples/react-component/`

---

## Summary

**Total Tasks**: 17  
**Completed**: 1 (6%)  
**In Progress**: 0  
**Not Started**: 16 (94%)  

**Critical Path**: T001 → T002, T003, T004, T005 → T008 (CI) → T011, T12 (Quality)

**Next Priority**: T002, T003, T004, T005 (E2E Tests) - Critical for production readiness

**Estimated Effort Remaining**: 180+ hours (~23 days of work)
