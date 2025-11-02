# Implementation Plan: Dagger Test Orchestration for SpecGofer

**Branch**: `006-test-feature` | **Date**: 2025-11-02 | **Spec**:
[spec.md](./spec.md) **Input**: Feature specification from
`/specs/006-test-feature/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See
`.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement comprehensive test orchestration using Dagger.io to enable full
regression testing of SpecGofer with real VSCode extension tests, no mocks, and
support for AI agent execution. The solution provides containerized test
environments for all SpecGofer features including spec generation, planning, and
implementation workflows.

## Technical Context

**Language/Version**: TypeScript 5.3+, Node.js 20.x LTS **Primary
Dependencies**: Dagger SDK for TypeScript, @vscode/test-electron, VSCode
Extension API **Storage**: File-based test data versioning in
`.specify/test-data/`, Dagger cache for artifacts **Testing**: Vitest for unit
tests, @vscode/test-electron for extension tests, Playwright for E2E **Target
Platform**: Dagger containers (Linux base), VSCode Electron environment
**Project Type**: VSCode Extension monorepo with Language Server **Performance
Goals**: Test suite execution under 20 minutes, environment setup under 3
minutes **Constraints**: Must support headless VSCode execution, no mock
dependencies, full feature coverage **Scale/Scope**: ~50 test suites, 200+ test
cases, multiple concurrent pipeline executions

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Compliance Assessment

✅ **I. Test-Driven Development**: Test infrastructure enables TDD for all
SpecGofer development ✅ **II. MCP-First Architecture**: Tests validate all MCP
tool interactions in real containers ✅ **III. Spec Kit Format Compliance**:
Tests validate spec generation and format compliance ✅ **IV. Strict TypeScript
& Code Quality**: Test pipeline enforces all quality gates ✅ **V. Security by
Default**: Isolated container environments prevent test contamination ✅ **VI.
Performance Requirements**: Dagger caching ensures sub-3-minute environment
setup ✅ **VII. 80% Test Coverage Minimum**: Pipeline enforces coverage
thresholds

**GATE STATUS**: PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
.specify/specs/006-test-feature/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Dagger best practices, VSCode testing patterns
├── data-model.md        # Phase 1 output - Test entities and relationships
├── quickstart.md        # Phase 1 output - How to run tests locally and in CI
├── contracts/           # Phase 1 output - Test result schemas, pipeline configs
│   ├── test-result.schema.json
│   ├── pipeline-config.schema.json
│   └── ai-agent-api.openapi.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Test Infrastructure (new additions)
test-infrastructure/
├── dagger/
│   ├── src/
│   │   ├── pipelines/          # Dagger pipeline definitions
│   │   │   ├── regression.ts   # Full regression test pipeline
│   │   │   ├── extension.ts    # VSCode extension test pipeline
│   │   │   └── integration.ts  # Integration test pipeline
│   │   ├── containers/         # Container definitions
│   │   │   ├── vscode.ts      # VSCode test container
│   │   │   ├── nodejs.ts      # Node.js runtime container
│   │   │   └── test-data.ts   # Test data provisioning
│   │   ├── utils/
│   │   │   ├── cache.ts       # Dagger cache management
│   │   │   ├── artifacts.ts   # Artifact collection
│   │   │   └── reporting.ts   # Test report generation
│   │   └── index.ts           # Main Dagger client
│   ├── package.json
│   └── tsconfig.json
├── test-data/                  # Versioned test data
│   ├── projects/              # Sample project templates
│   │   ├── simple-spec/
│   │   ├── complex-multi-spec/
│   │   └── edge-cases/
│   ├── fixtures/              # Test fixtures
│   └── manifest.json          # Test data registry
└── scripts/
    ├── run-dagger-tests.ts    # CLI for local execution
    └── ai-agent-runner.ts     # AI agent test interface

# Existing test updates
tests/
├── contract/                  # Contract tests for Dagger integration
│   └── dagger-api.test.ts
├── integration/              # Integration tests run in Dagger
│   ├── extension.test.ts    # VSCode extension tests
│   └── language-server.test.ts
└── unit/                     # Unit tests run in Dagger
    └── pipeline.test.ts

# Extension test configuration updates
extension/
└── .vscode-test/
    └── dagger-config.json    # VSCode test configuration for Dagger
```

**Structure Decision**: Separate test-infrastructure directory to isolate Dagger
orchestration from core SpecGofer code, maintaining clean separation of concerns
while enabling comprehensive testing across all components.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

_No violations - all constitution requirements are met._

---

## Phase 0: Research & Decision Log

### Research Tasks

1. **NEEDS CLARIFICATION: Dagger SDK patterns for TypeScript**
   - Best practices for pipeline composition
   - Container caching strategies
   - Artifact management patterns

2. **NEEDS CLARIFICATION: VSCode extension testing in containers**
   - Headless Electron configuration
   - Display server requirements (Xvfb)
   - Extension marketplace simulation

3. **NEEDS CLARIFICATION: AI agent interface design**
   - Structured output formats (JSON Schema)
   - Progress streaming protocols
   - Error handling and retry strategies

4. **Test data versioning strategies**
   - Git LFS vs embedded fixtures
   - Data generation vs static templates
   - Migration patterns for test data updates

5. **CI/CD integration patterns**
   - GitHub Actions Dagger support
   - GitLab CI container-in-container
   - Local development workflow

### Research Execution Plan

These research tasks will be executed by specialized agents to resolve all NEEDS
CLARIFICATION items before proceeding to Phase 1 design.

---

## Phase 1: Design & Contracts

**Prerequisites:** Phase 0 research complete with all clarifications resolved

### Planned Artifacts

1. **data-model.md**: Test execution entities, relationships, and state machines
2. **contracts/test-result.schema.json**: Standardized test result format
3. **contracts/pipeline-config.schema.json**: Dagger pipeline configuration
   schema
4. **contracts/ai-agent-api.openapi.yaml**: AI agent test execution API
5. **quickstart.md**: Local and CI test execution guide

### Agent Context Update

Will update `.github/copilot-instructions.md` with:

- Dagger SDK usage patterns
- Test data management conventions
- Pipeline execution commands

---

## Phase 2: Task Generation

**Note**: Phase 2 (tasks.md) will be generated by the `/speckit.tasks` command
after this plan is complete.

Expected task categories:

- Dagger SDK setup and configuration
- Pipeline implementation (regression, extension, integration)
- Test data infrastructure
- VSCode container configuration
- AI agent interface implementation
- CI/CD integration
- Documentation and examples

---

## Risk Mitigation

1. **Container resource limits**: Implement resource monitoring and auto-scaling
2. **Test flakiness**: Retry logic with exponential backoff
3. **Cache invalidation**: Version-based cache keys with TTL
4. **Network dependencies**: Local registry mirrors for container images
5. **Debugging complexity**: Container state snapshots for failed tests

## Success Metrics

- Test suite execution time: < 20 minutes
- Environment setup time: < 3 minutes
- Test coverage: > 85% for all components
- Zero mock dependencies in production tests
- AI agent success rate: > 95%
