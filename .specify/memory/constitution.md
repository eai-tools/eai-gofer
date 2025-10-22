<!--
Sync Impact Report - Constitution Update
═══════════════════════════════════════════════════════════════════════════════
VERSION: 1.0.0 → 2.0.0 (MAJOR - Initial complete template instantiation)

CHANGES:
- Filled all template placeholders with SpecGofer-specific content
- Established 7 core principles from existing codebase patterns
- Added comprehensive security, performance, and architecture sections
- Defined governance and amendment procedures

TEMPLATES UPDATED:
✅ /Users/douglaswross/spec-driven-dev-system/.specify/templates/plan-template.md
   - Constitution Check section already references constitution compliance
   - No changes needed - template correctly references generic principles

✅ /Users/douglaswross/spec-driven-dev-system/.specify/templates/spec-template.md
   - Requirements sections align with FR-### numbering convention
   - User stories and acceptance criteria format compatible
   - No changes needed

✅ /Users/douglaswross/spec-driven-dev-system/.specify/templates/tasks-template.md
   - Task organization supports principle-driven categorization
   - Test-first approach reflected in task ordering
   - No changes needed

GUIDANCE DOCUMENTS:
✅ .github/copilot-instructions.md - References constitution at line 117
   - "All code must validate against `.specify/memory/constitution.md`"
   - Lists key principles matching this constitution
   - No updates required

✅ src/agents/EngineerAgent.ts - Validates against constitution
   - Already implements constitution validation
   - No code changes needed

FOLLOW-UP TODOS:
- None - All placeholders filled with appropriate content

═══════════════════════════════════════════════════════════════════════════════
-->

# SpecGofer Constitution

## Core Principles

### I. Test-Driven Development (NON-NEGOTIABLE)

Tests MUST be written before implementation in all cases:

- Write acceptance tests first based on spec requirements
- Ensure tests FAIL before implementation begins
- Implement minimum code to make tests pass (Red-Green-Refactor)
- Integration tests required for all MCP tools, LSP methods, and agent coordination
- Contract tests mandatory for VSCode extension API, Language Server Protocol, and Model Context Protocol boundaries

**Rationale**: TDD ensures correctness, prevents regressions, and validates that specifications are implementable. The autonomous agent system depends on reliable tests to validate its own work.

### II. MCP-First Architecture

All AI assistant integration MUST use Model Context Protocol (MCP):

- Expose functionality through well-defined MCP tools (naming: `specgofer_<action>`)
- Tools must be stateless, idempotent where possible, and return structured results
- File-based integration (`.claude-input.txt`/`.claude-output.txt`) is legacy only
- Tools respond in <100ms for sync operations, <1s for async operations
- Each tool must validate inputs against schema before execution

**Rationale**: MCP provides a standardized, maintainable interface for AI assistants. Native VSCode MCP support eliminates custom integration code.

### III. Spec Kit Format Compliance

All specifications MUST follow GitHub Spec Kit format:

- YAML frontmatter with id, title, status, dates
- Markdown body with structured sections (User Scenarios, Requirements, Entities)
- Task lists with dependency tracking: `- [ ] #T001 Description (deps: T002, T003)`
- Constitution validation before implementation
- Migration tools provided for legacy JSON format

**Rationale**: Standardized format enables automated parsing, validation, and coordination across multiple AI coding agents.

### IV. Strict TypeScript & Code Quality

All code must meet quality standards without exception:

- TypeScript strict mode enabled (`noImplicitAny: true`, `strictNullChecks: true`)
- No `any` types - use proper types or `unknown` with type guards
- Functions ≤300 lines, files ≤500 lines - decompose if exceeded
- Cyclomatic complexity ≤10 per function
- ES modules with `.js` extensions in imports (Node.js ESM compatibility)

**Rationale**: Strict typing catches errors at compile time. Size limits enforce Single Responsibility Principle. Quality gates prevent technical debt.

### V. Security by Default

Security principles are non-negotiable at every layer:

- **Authentication**: bcrypt/argon2 for passwords, JWT expiry <1 hour with refresh rotation
- **Input Validation**: Validate and sanitize all user input, path traversal prevention
- **Secrets**: Environment variables only, never committed to Git
- **HTTPS**: All production traffic encrypted, HSTS enabled
- **API Security**: Rate limiting (100 req/min), CSRF tokens on mutations

**Rationale**: Autonomous systems must be secure by design. Security vulnerabilities in orchestration could enable arbitrary code execution.

### VI. Performance Requirements

All components must meet performance benchmarks:

- **Extension**: Activation <500ms, tree view render <100ms
- **Language Server**: Start <1s, spec loading <500ms for 100+ specs
- **MCP Tools**: Response <100ms for queries, <1s for operations
- **API**: Backend p95 <500ms, p99 <1000ms
- **UI**: First Contentful Paint <1.5s, Time to Interactive <3.5s

**Rationale**: Slow tools disrupt developer flow. Performance is a feature, especially for autonomous agents making rapid tool calls.

### VII. 80% Test Coverage Minimum

All new code must achieve 80% coverage across all metrics:

- Line coverage ≥80%
- Branch coverage ≥80%
- Function coverage ≥80%
- Critical paths (auth, orchestration, task execution) require 100% coverage
- Coverage gates enforced in CI/CD pipeline

**Rationale**: High coverage provides confidence in autonomous operation. Test-driven development naturally achieves these thresholds.

## Architecture Standards

### Multi-Layered System

SpecGofer consists of three coordinated components:

**VSCode Extension** (`/extension/`):

- Entry point: `extension/src/extension.ts` (auto-activates on `.specify/` detection)
- Manages UI (tree views, commands, progress panels)
- Launches Language Server as child process
- Auto-creates `.vscode/mcp.json` for Claude Code integration

**Language Server** (`/language-server/`):

- Dual protocol: LSP (extension ↔ server) + MCP (Claude ↔ tools)
- Exposes 6 MCP tools: `get_specs`, `get_next_task`, `execute_task`, `update_task_status`, `validate_code`, `run_tests`
- Loads specs from `.specify/specs/` using GitHub Spec Kit parser
- Stateless design, all state in filesystem

**Orchestrator Process** (`/src/`):

- Coordinates Engineer and Test agents via Claude API
- Manages task dependencies and execution workflows
- Monitors file changes with Chokidar
- Integrates Playwright for E2E testing

### Dependency Management

- Three separate `package.json` files (root, extension, language-server)
- Extension bundles Language Server via Webpack
- Anthropic SDK for direct Claude API access
- Playwright for autonomous testing

### File Structure Conventions

```text
.specify/
├── specs/
│   └── ###-feature-name/
│       ├── spec.md          # GitHub Spec Kit format
│       ├── plan.md          # Technical implementation plan
│       ├── tasks.md         # Task breakdown with dependencies
│       └── contracts/       # API/interface definitions
├── memory/
│   └── constitution.md      # This file - project principles
└── templates/
    ├── spec-template.md
    ├── plan-template.md
    └── tasks-template.md
```

## Development Workflow

### Task Execution Flow

1. AI reads specs via `specgofer_get_specs` MCP tool
2. Gets next available task via `specgofer_get_next_task` (checks dependencies)
3. Marks task in-progress via `specgofer_execute_task`
4. Implements code following TDD (tests first, then implementation)
5. Validates against constitution via `specgofer_validate_code`
6. Runs tests via `specgofer_run_tests` (Playwright + unit tests)
7. Updates status via `specgofer_update_task_status` (completed/failed)
8. Repeats - autonomous agents implement entire specs

### Status Progression

```text
pending → in_progress → testing → completed
                    ↓
                  failed (max 3 attempts before human escalation)
```

### Quality Gates

Before merging any code:

- ✅ All tests pass (Vitest + Playwright)
- ✅ 80%+ coverage threshold met
- ✅ ESLint passes with zero warnings
- ✅ TypeScript compiles with strict mode
- ✅ Constitution validation passes
- ✅ Spec acceptance criteria met

## Governance

### Amendment Process

Constitution changes require:

1. **Proposal**: Document change rationale in GitHub issue
2. **Impact Analysis**: Identify affected templates, tests, and documentation
3. **Version Bump**: MAJOR (breaking), MINOR (additive), PATCH (clarification)
4. **Update Propagation**: Update templates, code validators, and test patterns
5. **Migration Guide**: Provide upgrade path for existing specs
6. **Approval**: Merge only after CI passes and review complete

### Compliance Enforcement

- EngineerAgent validates all code against these principles before completion
- MCP tool `specgofer_validate_code` programmatically checks compliance
- CI/CD pipeline enforces coverage thresholds and linting rules
- Extension warnings appear when specs don't follow GitHub Spec Kit format

### Constitution Supersedes All

In conflicts between this document and other practices:

- Constitution wins - always
- If constitution blocks legitimate work, amend the constitution first
- Complexity violations require architectural approval with documented justification

### Guidance Documents

- **Runtime Development**: See `.github/copilot-instructions.md` for AI assistant patterns
- **Testing**: See `docs/TESTING_GUIDE.md` for E2E and integration test setup
- **Spec Kit**: See `.specify/templates/` for specification and task templates

**Version**: 2.0.0 | **Ratified**: 2025-10-22 | **Last Amended**: 2025-10-22
