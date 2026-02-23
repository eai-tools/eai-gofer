---
feature: Gofer Engineering Remediation
spec: spec.md
research: research.md
status: ready
created: 2026-02-24T11:00:00Z
---

# Implementation Plan: Gofer Engineering Remediation

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2 (strict mode enabled)
- **Runtime**: Node.js 20.x LTS
- **Framework**: VSCode Extension API
- **DI Framework**: TSyringe (Microsoft's decorator-based DI container)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Build**: Webpack for bundling
- **Packaging**: @vscode/vsce for VSIX creation

### Architecture

This remediation refactors existing Gofer architecture to follow SOLID
principles while preserving all functionality:

```
┌────────────────────────────────────────────────────────────┐
│ BEFORE: Monolithic Architecture (Current State)            │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  extension.ts (2469 LOC) ─┐                                │
│  ├─ activate()            │  God Object                    │
│  ├─ registerCommands()    │  10+ responsibilities          │
│  ├─ event handlers        │  15+ global variables          │
│  ├─ initialization        │  Tight coupling                │
│  └─ cleanup logic         ┘                                │
│                                                             │
│  goferMigrator.ts (2499 LOC) ─┐                            │
│  ├─ version detection         │  God Object                │
│  ├─ upgrade logic             │  10+ responsibilities      │
│  ├─ resource sync             │  No testability            │
│  └─ path migration            ┘                            │
│                                                             │
│  40+ Magic Numbers scattered throughout                    │
│  47 Silent Error Handlers (.catch(() => {}))               │
│  Unbounded Caches (memory leaks)                           │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ AFTER: Modular Architecture (Target State)                 │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  DI Container (TSyringe)                                    │
│  └─ Injectable Services                                     │
│      ├─ CommandRegistry (<600 LOC)                         │
│      ├─ EventHandlers (<600 LOC)                           │
│      ├─ InitializationService (<600 LOC)                   │
│      ├─ DisposalService (<400 LOC)                         │
│      ├─ Logger (error context)                             │
│      └─ Migration Services                                 │
│          ├─ VersionDetector (<500 LOC)                     │
│          ├─ UpgradeService (<600 LOC)                      │
│          ├─ ResourceSyncer (<500 LOC)                      │
│          └─ PathMigrator (<400 LOC)                        │
│                                                             │
│  extension.ts (<600 LOC) ─ Orchestrator only               │
│  goferMigrator.ts (<600 LOC) ─ Orchestrator only           │
│                                                             │
│  Named Constants (config/*)                                │
│  Explicit Error Logging (Logger service)                   │
│  Bounded Caches (LRU + TTL + Token Budget)                 │
└────────────────────────────────────────────────────────────┘
```

### Integration Points

| Component            | File                                            | Integration Type           | Notes                                 |
| -------------------- | ----------------------------------------------- | -------------------------- | ------------------------------------- |
| Extension Activation | `extension/src/extension.ts:activate()`         | DI container registration  | All services registered synchronously |
| Command System       | `extension/src/extension.ts:registerCommands()` | CommandRegistry facade     | Preserve existing command IDs         |
| Event System         | `extension/src/extension.ts:155-160`            | EventHandlers service      | Single workspace listener pattern     |
| Configuration        | `extension/src/services/ConfigManager.ts`       | Constants injection        | Load from config/\* files             |
| Disposal             | `extension/src/extension.ts:deactivate()`       | DisposalService            | Dispose all registered resources      |
| Testing              | `tests/**/*.test.ts`                            | DI mock injection          | Inject mock services for unit tests   |
| Cache Pattern        | `language-server/src/utils/specCache.ts`        | Template for all caches    | LRU + TTL + disposal                  |
| Token Budget         | `extension/src/autonomous/ContextBuilder.ts`    | Budget enforcement pattern | Apply to MemoryStorage                |

### Key Dependencies

**Internal (Existing)**:

- SpecCache pattern (LRU + TTL + disposal) -
  `language-server/src/utils/specCache.ts:50-238`
- Token budget enforcement -
  `extension/src/autonomous/ContextBuilder.ts:400-450`
- Resource disposal pattern - `extension/src/extension.ts:207-277`
- ConfigManager - `extension/src/services/ConfigManager.ts`

**External (New)**:

- `tsyringe` (^4.8.0) - Dependency injection container
- `reflect-metadata` (^0.1.13) - Required by TSyringe for decorator metadata

**External (Existing)**:

- `@types/vscode` - VSCode Extension API types
- `vscode-languageclient` - Language Server Protocol client
- `vitest` - Unit testing framework
- `@playwright/test` - E2E testing framework

## Constitution Check

Verifying alignment with Gofer Constitution (v2.0.0):

- [x] **Principle I - Test-Driven Development**: All refactored code will have
      unit tests before modification. Existing E2E tests validate no
      functionality lost.
- [x] **Principle II - MCP-First Architecture**: No changes to MCP tools -
      refactoring is internal to extension only.
- [x] **Principle III - Spec Kit Compliance**: This spec follows GitHub Spec Kit
      format with YAML frontmatter and structured sections.
- [x] **Principle IV - Strict TypeScript**: All new code uses TypeScript strict
      mode. Target: all files <500 LOC, functions <300 LOC, complexity <10.
- [x] **Principle V - Security by Default**: Input validation added (US8). No
      security regressions introduced.
- [x] **Principle VI - Performance Requirements**: Extension activation must
      remain <500ms (currently <2s, target maintained).
- [x] **Principle VII - 80% Test Coverage**: All refactored modules must achieve
      80%+ coverage. Existing tests maintained.

**Constitution Alignment**: PASS - All principles respected. No waivers
required.

## Implementation Phases

### Phase 0: Foundation & Test Stabilization (P0 - Critical)

**Goal**: Fix blocking issues and establish constants foundation

**Priority**: P0 - Must complete before any refactoring

**Duration**: 1-2 days

**Tasks**:

- [ ] T001: Investigate and fix 5 pre-existing test failures in
      `tests/integration/agent-stop-extraction.test.ts`
  - Research missing JSONL file dependency
  - Add test fixtures to `tests/fixtures/agent-stop/` or skip obsolete tests
  - Verify `npm test` exits with code 0
  - **Acceptance**: US6 criteria met (all tests pass)

- [ ] T002: Create constants directory structure
  - Create `extension/src/config/timeouts.ts`
  - Create `extension/src/config/thresholds.ts`
  - Create `extension/src/config/limits.ts`
  - Create `extension/src/config/intervals.ts`
  - Add index.ts barrel export
  - **Acceptance**: Directory structure exists, compiles

- [ ] T003: Extract timeout constants (10+ instances)
  - Identify all timeout magic numbers: 10000ms, 500ms, 5000ms, 200ms, 100ms
  - Define in `config/timeouts.ts` with JSDoc explaining purpose
  - Example:
    `export const WATCHER_START_DELAY = 500; // ms - Delay before starting file watcher`
  - **Acceptance**: US3 partial (timeouts extracted)

- [ ] T004: Extract threshold constants (10+ instances)
  - Identify threshold magic numbers: 0.5, 0.7, 0.65, 0.3
  - Define in `config/thresholds.ts` with JSDoc
  - Example:
    `export const CONTEXT_CRITICAL_THRESHOLD = 0.7; // 70% context usage`
  - **Acceptance**: US3 partial (thresholds extracted)

- [ ] T005: Extract limit constants (10+ instances)
  - Identify limit magic numbers: 200, 100, 5, 10
  - Define in `config/limits.ts` with JSDoc
  - Example: `export const MAX_MEMORY_COUNT = 200; // Maximum memories to store`
  - **Acceptance**: US3 partial (limits extracted)

- [ ] T006: Extract interval constants (10+ instances)
  - Identify interval magic numbers: 60000ms, 180000ms, 300000ms
  - Define in `config/intervals.ts` with JSDoc
  - Example: `export const CACHE_CHECK_INTERVAL = 60000; // ms - 1 minute`
  - **Acceptance**: US3 partial (intervals extracted)

- [ ] T007: Replace all magic numbers with constants
  - Search codebase for numeric literals (exclude 0, 1, -1)
  - Replace with imported constants
  - Verify no behavior changes (values identical)
  - **Acceptance**: US3 complete (0 magic numbers remain)

**Verification**:

- [ ] `npm test` passes without failures
- [ ] Extension compiles without errors
- [ ] Regex search `\b\d{2,}\b` returns only constants definitions
- [ ] All timeout/threshold/limit/interval values documented with JSDoc

**Risk Mitigation**:

- Test failures may require skipping obsolete tests if JSONL dependency is from
  removed feature
- Constants extraction is low-risk (no logic changes, only refactoring)

---

### Phase 1: Dependency Injection Infrastructure (P1 - High)

**Goal**: Establish DI container and begin extracting global state

**Priority**: P1 - Enables all subsequent refactoring

**Duration**: 2-3 days

**Tasks**:

- [ ] T008: Install and configure TSyringe
  - Run `npm install --save tsyringe reflect-metadata`
  - Update `tsconfig.json`: Add
    `"experimentalDecorators": true, "emitDecoratorMetadata": true`
  - Import `reflect-metadata` in `extension/src/extension.ts` (top of file)
  - **Acceptance**: TSyringe compiles, decorators enabled

- [ ] T009: Create DI container
  - Create `extension/src/di/container.ts`
  - Import `container` from tsyringe
  - Create `registerServices()` function for service registration
  - Create `resetContainer()` for testing
  - **Acceptance**: Container module compiles and exports functions

- [ ] T010: Create Logger service (injectable)
  - Create `extension/src/services/Logger.ts`
  - Interface:
    `error(context: string, error: Error, metadata?: Record<string, unknown>): void`
  - Mark with `@injectable()` decorator
  - Log format:
    `[ERROR][${context}] ${error.message} ${JSON.stringify(metadata)}`
  - **Acceptance**: Logger service created, injectable

- [ ] T011: Register Logger in DI container
  - Update `di/container.ts` to register Logger as singleton
  - `container.registerSingleton(Logger)`
  - Test injection in `extension.ts:activate()`
  - **Acceptance**: Logger can be injected and used

- [ ] T012: Replace first 10 silent error handlers
  - Identify 10 `.catch(() => {})` instances in `extension.ts`
  - Replace with `.catch(err => logger.error('Context', err))`
  - Inject Logger via constructor or function parameter
  - **Acceptance**: US4 partial (10 handlers replaced)

- [ ] T013: Replace remaining 37 silent error handlers
  - Replace all `.catch(() => {})` in remaining files
  - Include context in error logs (module name, operation)
  - Preserve existing error recovery behavior
  - **Acceptance**: US4 complete (grep returns 0 matches)

**Verification**:

- [ ] TSyringe container operational
- [ ] Logger service injectable
- [ ] Grep for `.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)` returns 0 matches
- [ ] Error logs include context and metadata
- [ ] Existing error recovery behavior unchanged

**Risk Mitigation**:

- TSyringe is lightweight and proven in VSCode ecosystem
- Logger is side-effect only (doesn't change control flow)
- Error handler replacement preserves existing recovery logic

---

### Phase 2: Cache Remediation (P1 - High)

**Goal**: Fix unbounded cache growth and timer leaks

**Priority**: P1 - Prevents memory exhaustion crashes

**Duration**: 2-3 days

**Tasks**:

- [ ] T014: Fix ObservationMasker unbounded array growth
  - Modify `extension/src/autonomous/ObservationMasker.ts:854-859`
  - Replace `expansionMetrics` array with LRU cache (100-entry limit)
  - Apply SpecCache pattern: `new Map()` + `evictOldest()` method
  - Add stats tracking (hits, misses, evictions)
  - **Acceptance**: US5 partial (ObservationMasker bounded)

- [ ] T015: Add token budget to MemoryStorage
  - Modify `extension/src/autonomous/MemoryStorage.ts`
  - Add `maxTokenBudget: 50000` configuration
  - Implement token estimation (use ContextBuilder pattern)
  - Evict oldest memories when budget exceeded
  - **Acceptance**: US5 partial (MemoryStorage bounded)

- [ ] T016: Remove content duplication in MemoryStorage.indexMemory()
  - Modify `extension/src/autonomous/MemoryStorage.ts:158-174`
  - Store EITHER full content OR full memory object, not both
  - Use references or keys to link content to memory
  - **Acceptance**: US5 partial (duplication eliminated)

- [ ] T017: Fix HookBridgeWatcher timer leak
  - Modify `extension/src/autonomous/HookBridgeWatcher.ts:58-94`
  - Add guard in `start()`: check and clear `stalenessTimer` before
    `setInterval`
  - Pattern: `if (this.stalenessTimer) { clearInterval(this.stalenessTimer); }`
  - **Acceptance**: US5 partial (timer leak fixed)

- [ ] T018: Standardize all caches on LRU + TTL pattern
  - Audit remaining cache implementations
  - Apply SpecCache pattern to all caches
  - Default config: 100 entries, 5-minute TTL
  - Add cache metrics tracking
  - **Acceptance**: US5 complete (all caches bounded)

**Verification**:

- [ ] Memory profiling shows stable usage over 8-hour session (<200MB)
- [ ] No unbounded array growth
- [ ] Cache stats show evictions occurring
- [ ] Timer leak verified fixed (no accumulating intervals)

**Risk Mitigation**:

- SpecCache pattern proven in language-server
- Token budget enforcement pattern proven in ContextBuilder
- Changes preserve cache functionality, only add eviction

---

### Phase 3: Extension.ts Refactoring (P1 - High)

**Goal**: Extract extension.ts into focused modules

**Priority**: P1 - Highest maintainability impact

**Duration**: 4-5 days

**Tasks**:

- [ ] T019: Create CommandRegistry service
  - Create `extension/src/services/CommandRegistry.ts`
  - Extract all command registration logic from `registerCommands()`
  - Interface: `registerAll(context: vscode.ExtensionContext): void`
  - Mark `@injectable()`, inject Logger
  - Target: <600 LOC
  - **Acceptance**: US1 partial (CommandRegistry created)

- [ ] T020: Create EventHandlers service
  - Create `extension/src/services/EventHandlers.ts`
  - Extract workspace change listener and other event handlers
  - Interface: `registerAll(context: vscode.ExtensionContext): void`
  - Mark `@injectable()`, inject Logger
  - Target: <600 LOC
  - **Acceptance**: US1 partial (EventHandlers created)

- [ ] T021: Create InitializationService
  - Create `extension/src/services/InitializationService.ts`
  - Extract initialization logic from `activate()`
  - Interface: `initialize(context: vscode.ExtensionContext): Promise<void>`
  - Mark `@injectable()`, inject ConfigManager
  - Target: <600 LOC
  - **Acceptance**: US1 partial (InitializationService created)

- [ ] T022: Create DisposalService
  - Create `extension/src/services/DisposalService.ts`
  - Extract cleanup logic from `reinitializeExtension()` and `deactivate()`
  - Interface: `dispose(): void`,
    `registerDisposable(d: vscode.Disposable): void`
  - Mark `@injectable()`
  - Target: <400 LOC
  - **Acceptance**: US1 partial (DisposalService created)

- [ ] T023: Refactor extension.ts to use new services
  - Update `activate()` to:
    1. Register all services in DI container
    2. Resolve InitializationService and call initialize()
    3. Resolve CommandRegistry and call registerAll()
    4. Resolve EventHandlers and call registerAll()
  - Update `deactivate()` to resolve DisposalService and call dispose()
  - Keep activate() as orchestrator only
  - Target: extension.ts <600 LOC
  - **Acceptance**: US1 partial (extension.ts refactored)

- [ ] T024: Convert 15+ global variables to services
  - Identify all module-level globals in extension.ts
  - Move to appropriate service (multiSessionWatcher → InitializationService)
  - Access via DI container, not global state
  - **Acceptance**: US2 complete (only DI container remains global)

**Verification**:

- [ ] `wc -l extension/src/extension.ts` returns <600
- [ ] `wc -l extension/src/services/CommandRegistry.ts` returns <600
- [ ] `wc -l extension/src/services/EventHandlers.ts` returns <600
- [ ] `wc -l extension/src/services/InitializationService.ts` returns <600
- [ ] `wc -l extension/src/services/DisposalService.ts` returns <400
- [ ] All existing commands still registered and functional
- [ ] Extension activation time <2 seconds
- [ ] All E2E tests pass

**Risk Mitigation**:

- Facade pattern preserves public APIs during refactoring
- Incremental extraction allows validation after each service
- Existing tests validate no functionality lost

---

### Phase 4: GoferMigrator.ts Refactoring (P1 - High)

**Goal**: Extract goferMigrator.ts into focused modules

**Priority**: P1 - Second-highest maintainability impact

**Duration**: 4-5 days

**Tasks**:

- [ ] T025: Create VersionDetector service
  - Create `extension/src/services/migration/VersionDetector.ts`
  - Extract version detection logic
  - Interface: `detectCurrentVersion(): string`,
    `compareVersions(a: string, b: string): number`
  - Mark `@injectable()`, inject Logger
  - Target: <500 LOC
  - **Acceptance**: US1 partial (VersionDetector created)

- [ ] T026: Create UpgradeService
  - Create `extension/src/services/migration/UpgradeService.ts`
  - Extract upgrade execution logic
  - Interface: `upgrade(from: string, to: string): Promise<void>`
  - Mark `@injectable()`, inject Logger and VersionDetector
  - Target: <600 LOC
  - **Acceptance**: US1 partial (UpgradeService created)

- [ ] T027: Create ResourceSyncer service
  - Create `extension/src/services/migration/ResourceSyncer.ts`
  - Extract resource synchronization logic
  - Interface: `syncResources(): Promise<void>`
  - Mark `@injectable()`, inject Logger
  - Target: <500 LOC
  - **Acceptance**: US1 partial (ResourceSyncer created)

- [ ] T028: Create PathMigrator service
  - Create `extension/src/services/migration/PathMigrator.ts`
  - Extract path migration logic (specs/ → .specify/specs/)
  - Interface: `migratePaths(): Promise<void>`
  - Mark `@injectable()`, inject Logger
  - Target: <400 LOC
  - **Acceptance**: US1 partial (PathMigrator created)

- [ ] T029: Refactor goferMigrator.ts to use new services
  - Update to inject and orchestrate migration services
  - Keep as facade/orchestrator only
  - Target: goferMigrator.ts <600 LOC
  - **Acceptance**: US1 complete (goferMigrator.ts refactored)

**Verification**:

- [ ] `wc -l extension/src/goferMigrator.ts` returns <600
- [ ] All migration services <600 LOC each
- [ ] All existing migrations still functional
- [ ] Extension upgrades work correctly
- [ ] All E2E tests pass

**Risk Mitigation**:

- Facade pattern preserves migration API
- Test each migration service independently
- Rollback plan: keep original goferMigrator.ts until validated

---

### Phase 5: Documentation & Security (P2 - Medium)

**Goal**: Document architectural decisions and add input validation

**Priority**: P2 - Important but not blocking

**Duration**: 2-3 days

**Tasks**:

- [ ] T030: Create ADR-001: Dependency Injection Framework Choice
  - Document in `.specify/memory/decisions/001-di-framework.md`
  - Sections: Context, Decision (TSyringe), Rationale, Alternatives,
    Consequences
  - **Acceptance**: US7 partial (ADR-001 created)

- [ ] T031: Create ADR-002: Module Extraction Strategy
  - Document in `.specify/memory/decisions/002-module-extraction.md`
  - Sections: Context, Decision (phased with facades), Rationale, Alternatives,
    Consequences
  - **Acceptance**: US7 partial (ADR-002 created)

- [ ] T032: Create ADR-003: Error Handling Approach
  - Document in `.specify/memory/decisions/003-error-handling.md`
  - Sections: Context, Decision (Result<T,E> pattern), Rationale, Alternatives,
    Consequences
  - **Acceptance**: US7 partial (ADR-003 created)

- [ ] T033: Create ADR-004: Cache Eviction Strategy
  - Document in `.specify/memory/decisions/004-cache-eviction.md`
  - Sections: Context, Decision (LRU + TTL + token budget), Rationale,
    Alternatives, Consequences
  - **Acceptance**: US7 partial (ADR-004 created)

- [ ] T034: Create ADR-005: Constants Management
  - Document in `.specify/memory/decisions/005-constants-management.md`
  - Sections: Context, Decision (hierarchical by domain), Rationale,
    Alternatives, Consequences
  - **Acceptance**: US7 partial (ADR-005 created)

- [ ] T035: Create architecture diagram: Extension activation flow
  - Create diagram in `.specify/memory/diagrams/extension-activation.mmd`
    (Mermaid)
  - Show DI container → service registration → initialization → command
    registration
  - **Acceptance**: US7 partial (activation diagram created)

- [ ] T036: Create architecture diagram: DI container structure
  - Create diagram in `.specify/memory/diagrams/di-container.mmd` (Mermaid)
  - Show all injectable services and their dependencies
  - **Acceptance**: US7 partial (DI diagram created)

- [ ] T037: Create architecture diagram: Module dependencies
  - Create diagram in `.specify/memory/diagrams/module-dependencies.mmd`
    (Mermaid)
  - Show dependencies between refactored modules
  - **Acceptance**: US7 complete (dependencies diagram created)

- [ ] T038: Add JSON schema validation for configuration
  - Install `ajv` library for JSON schema validation
  - Create schemas in `extension/src/schemas/config.schema.json`
  - Validate configuration on extension activation
  - **Acceptance**: US8 partial (config validation added)

- [ ] T039: Add file path sanitization
  - Create utility in `extension/src/utils/pathSanitizer.ts`
  - Check for path traversal attempts (`../`, absolute paths)
  - Apply to all file operations
  - **Acceptance**: US8 partial (path sanitization added)

- [ ] T040: Add command input validation
  - Validate special characters in command inputs
  - Sanitize before execution
  - Return clear error messages for invalid inputs
  - **Acceptance**: US8 partial (input validation added)

- [ ] T041: Add rate limiting for expensive operations
  - Create `extension/src/utils/rateLimiter.ts`
  - Limit context building to 10 requests/minute
  - Limit code generation to 5 requests/minute
  - **Acceptance**: US8 complete (rate limiting added)

**Verification**:

- [ ] 5 ADRs documented in `.specify/memory/decisions/`
- [ ] 3 architecture diagrams created
- [ ] Invalid configuration returns clear error message
- [ ] Path traversal attempts blocked
- [ ] Rate limits enforced on expensive operations

**Risk Mitigation**:

- Documentation changes have no runtime risk
- Input validation added with graceful fallbacks
- Rate limiting only affects abuse scenarios

---

## File Structure

**New Directories**:

```
extension/src/
├── config/
│   ├── timeouts.ts          # Timeout constants
│   ├── thresholds.ts        # Threshold constants
│   ├── limits.ts            # Limit constants
│   ├── intervals.ts         # Interval constants
│   └── index.ts             # Barrel export
├── di/
│   ├── container.ts         # DI container setup
│   └── index.ts             # Barrel export
├── services/
│   ├── Logger.ts            # Error logging service
│   ├── CommandRegistry.ts  # Command registration
│   ├── EventHandlers.ts    # Event handler registration
│   ├── InitializationService.ts  # Extension initialization
│   ├── DisposalService.ts  # Resource disposal
│   └── migration/
│       ├── VersionDetector.ts    # Version detection
│       ├── UpgradeService.ts     # Upgrade orchestration
│       ├── ResourceSyncer.ts     # Resource synchronization
│       └── PathMigrator.ts       # Path migration
├── schemas/
│   └── config.schema.json   # Configuration validation schema
└── utils/
    ├── pathSanitizer.ts     # Path validation
    └── rateLimiter.ts       # Rate limiting

.specify/memory/
├── decisions/
│   ├── 001-di-framework.md
│   ├── 002-module-extraction.md
│   ├── 003-error-handling.md
│   ├── 004-cache-eviction.md
│   └── 005-constants-management.md
└── diagrams/
    ├── extension-activation.mmd
    ├── di-container.mmd
    └── module-dependencies.mmd
```

**Modified Files**:

```
extension/src/
├── extension.ts             # 2469 → <600 LOC (orchestrator only)
├── goferMigrator.ts         # 2499 → <600 LOC (orchestrator only)
├── autonomous/
│   ├── ObservationMasker.ts    # Add LRU cache for expansionMetrics
│   ├── MemoryStorage.ts        # Add token budget, remove duplication
│   └── HookBridgeWatcher.ts    # Fix timer leak in start()
└── tsconfig.json            # Add experimentalDecorators, emitDecoratorMetadata

package.json
├── Add tsyringe dependency
├── Add reflect-metadata dependency
└── Add ajv dependency (JSON schema validation)
```

## Risk Assessment

| Risk                                              | Impact | Likelihood | Mitigation                                                                                                                   |
| ------------------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Breaking existing functionality**               | High   | Medium     | Facade pattern preserves APIs. Comprehensive E2E tests validate no regressions. Incremental phased delivery allows rollback. |
| **Extension activation timeout**                  | Medium | Low        | DI container registration is synchronous (<10ms). Services lazily initialized. Monitor activation time throughout.           |
| **Test failures block release**                   | High   | Low        | Phase 0 fixes test failures first. All phases require passing tests before proceeding.                                       |
| **DI container complexity**                       | Medium | Low        | TSyringe is lightweight and proven. Follow Microsoft patterns from VSCode ecosystem.                                         |
| **Cache eviction too aggressive**                 | Low    | Low        | SpecCache pattern proven. Conservative defaults (100 entries, 5min TTL). Monitor cache stats.                                |
| **Module extraction introduces bugs**             | Medium | Medium     | Extract one module at a time. Test after each extraction. Keep original code as reference.                                   |
| **Silent error replacement changes behavior**     | Medium | Low        | Preserve existing error recovery logic. Only add logging, don't change control flow.                                         |
| **Magic number replacement changes values**       | Low    | Very Low   | Constants use identical values. Compile-time verification. Unit tests validate behavior unchanged.                           |
| **Migration service refactoring breaks upgrades** | High   | Low        | Test all historical migrations. Keep original goferMigrator.ts until validated. Rollback plan available.                     |
| **Input validation too strict**                   | Low    | Low        | Graceful fallbacks for validation failures. Clear error messages guide users.                                                |

## Spec Traceability

### User Story Coverage

| Story                                                  | Priority | Status  | Plan References                          |
| ------------------------------------------------------ | -------- | ------- | ---------------------------------------- |
| US1: Code Maintainability - Eliminate God Objects      | P1       | COVERED | Phase 3 (T019-T024), Phase 4 (T025-T029) |
| US2: Dependency Management - Eliminate Global State    | P1       | COVERED | Phase 1 (T008-T013), Phase 3 (T024)      |
| US3: Code Quality - Replace Magic Numbers              | P0       | COVERED | Phase 0 (T002-T007)                      |
| US4: Observability - Replace Silent Error Handlers     | P1       | COVERED | Phase 1 (T010-T013)                      |
| US5: Performance - Implement Proper Cache Eviction     | P1       | COVERED | Phase 2 (T014-T018)                      |
| US6: Testing - Fix Pre-Existing Test Failures          | P0       | COVERED | Phase 0 (T001)                           |
| US7: Documentation - Add Architecture Decision Records | P2       | COVERED | Phase 5 (T030-T037)                      |
| US8: Security - Add Input Validation                   | P2       | COVERED | Phase 5 (T038-T041)                      |

### Requirement Coverage

| Requirement                                 | Status  | Plan Reference                                    |
| ------------------------------------------- | ------- | ------------------------------------------------- |
| FR-001: Preserve all existing functionality | COVERED | All phases use facade pattern, E2E tests validate |
| FR-002: Reduce extension.ts to <600 LOC     | COVERED | Phase 3 (T019-T024)                               |
| FR-003: Reduce goferMigrator.ts to <600 LOC | COVERED | Phase 4 (T025-T029)                               |
| FR-004: Replace 40+ magic numbers           | COVERED | Phase 0 (T002-T007)                               |
| FR-005: Replace 47 silent error handlers    | COVERED | Phase 1 (T010-T013)                               |
| FR-006: Implement DI container              | COVERED | Phase 1 (T008-T011), Phase 3 (T024)               |
| FR-007: Implement bounded caches            | COVERED | Phase 2 (T014-T018)                               |
| FR-008: Fix 5 pre-existing test failures    | COVERED | Phase 0 (T001)                                    |
| FR-009: Create 5+ ADRs                      | COVERED | Phase 5 (T030-T034)                               |
| FR-010: Validate configuration and inputs   | COVERED | Phase 5 (T038-T041)                               |
| FR-011: Maintain activation time <2s        | COVERED | Monitored throughout all phases                   |
| FR-012: Maintain memory footprint <200MB    | COVERED | Phase 2 cache fixes, memory profiling             |

### Acceptance Criteria Mapping

| User Story | Acceptance Criterion               | Plan Task  | Implementation Approach                                                        |
| ---------- | ---------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| US1        | extension.ts <600 LOC              | T023       | Extract CommandRegistry, EventHandlers, InitializationService, DisposalService |
| US1        | goferMigrator.ts <600 LOC          | T029       | Extract VersionDetector, UpgradeService, ResourceSyncer, PathMigrator          |
| US1        | All modules <600 LOC               | T019-T029  | Measure LOC after each extraction, refactor further if needed                  |
| US1        | All existing tests pass            | All phases | E2E tests validate no regressions after each phase                             |
| US2        | 15+ globals → injectable services  | T024       | Move globals to services, inject via DI                                        |
| US2        | No direct state access             | T024       | All modules receive dependencies via constructor                               |
| US2        | Unit tests inject mocks            | All phases | DI allows mock injection in tests                                              |
| US3        | 40+ magic numbers → 0              | T002-T007  | Extract to config/\* files, replace all usages                                 |
| US3        | Constants have JSDoc               | T003-T006  | Add JSDoc explaining purpose of each constant                                  |
| US4        | 47 silent handlers → 0             | T012-T013  | Replace with Logger.error() calls                                              |
| US4        | Error logs include context         | T012-T013  | Pass module name and operation context                                         |
| US5        | ObservationMasker bounded          | T014       | Apply LRU cache pattern (100-entry limit)                                      |
| US5        | MemoryStorage token budget         | T015       | Add 50k token budget with eviction                                             |
| US5        | HookBridgeWatcher timer leak fixed | T017       | Clear old interval before creating new                                         |
| US5        | Memory <200MB (8hr session)        | T018       | Memory profiling validates all cache fixes                                     |
| US6        | 5 test failures → 0                | T001       | Fix or skip agent-stop-extraction tests                                        |
| US7        | 5+ ADRs documented                 | T030-T034  | Document DI, extraction, error, cache, constants decisions                     |
| US7        | 3+ architecture diagrams           | T035-T037  | Create activation, DI, dependency diagrams                                     |
| US8        | JSON schema validation             | T038       | Use ajv library, validate on activation                                        |
| US8        | Path sanitization                  | T039       | Check for traversal, absolute paths                                            |
| US8        | Input validation                   | T040       | Validate special characters in commands                                        |
| US8        | Rate limiting                      | T041       | 10 context builds/min, 5 generations/min                                       |

### Data Model Coverage

N/A - This is internal refactoring, no new data entities introduced. Existing
entities (Memory, Observation, Task) remain unchanged.

### API Contract Coverage

N/A - This is internal refactoring, no new APIs introduced. Existing VSCode
commands and MCP tools remain unchanged. Internal service interfaces documented
in code comments.

**Coverage Summary**: 100% of user stories, 100% of functional requirements,
100% of acceptance criteria traced to plan tasks.

## Notes

1. **Incremental Delivery**: Each phase is independently deliverable and
   testable. If time constraints arise, can pause after any phase and resume
   later.

2. **Backward Compatibility**: All changes preserve existing APIs via facade
   pattern. Users see no behavioral differences.

3. **Test-First Approach**: All refactored modules have unit tests written
   before modification (per Constitution Principle I).

4. **Performance Monitoring**: Extension activation time monitored throughout.
   Target: <500ms (Constitution), current: <2s (spec).

5. **Memory Monitoring**: Memory usage tracked during Phase 2 cache fixes.
   Target: <200MB over 8-hour session.

6. **Rollback Strategy**: Each phase can be rolled back independently. Original
   code preserved as reference until validation complete.

7. **Constitution Compliance**: All changes respect Gofer Constitution v2.0.0.
   No waivers required.

8. **DI Container Scope**: Container is singleton, services are singletons
   unless explicitly scoped. Stateless services preferred.

9. **Logger Service**: Simple console-based logging initially. Can be upgraded
   to file logging or structured logging in future without API changes.

10. **Constants Organization**: Hierarchical by domain (timeouts, thresholds,
    limits, intervals) makes it easy to find and update related values.

11. **Cache Metrics**: All caches track hits/misses/evictions. Expose via VSCode
    command for debugging (future enhancement).

12. **ADR Versioning**: ADRs are versioned documents. Amendments create new
    versions, original preserved for history.

13. **Input Validation**: Graceful fallbacks ensure invalid inputs don't crash
    extension, just log warnings and use defaults.

14. **Rate Limiting**: Only affects abuse scenarios (rapid repeated operations).
    Normal usage unaffected.

15. **Module Dependencies**: New services have minimal dependencies. Most depend
    only on Logger and ConfigManager.
