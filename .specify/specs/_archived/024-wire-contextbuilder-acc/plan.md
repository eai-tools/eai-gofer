---
feature: Wire ContextBuilder + Adaptive Context Compaction (ACC)
spec: spec.md
research: research.md
status: ready
created: 2026-03-11T03:30:00Z
---

# Implementation Plan: Wire ContextBuilder + ACC

## Summary

Wire ~3,700 LOC of existing dead context management code (ContextBuilder, ObservationMasker, StageContextProfileLoader, MemoryLayerManager, SubAgentDispatcher) into the running extension by calling `setSharedContextBuilder()` during workspace initialization. Then implement a new ACCOrchestrator that hooks into ContextHealthMonitor events to provide 5-stage progressive context compaction at 70/80/85/90/99% utilization thresholds.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Framework**: VSCode Extension API, Webpack bundler
**Storage**: Filesystem (`.specify/memory/` for caches, YAML config)
**Testing**: Vitest
**Target Platform**: VSCode Extension Host (Node.js)
**Performance Goals**: `buildContext()` < 500ms, `maskOldObservations()` < 50ms, ACC transitions < 100ms
**Constraints**: reflect-metadata must remain first import; PTY writes are fragile; chars/4 token estimation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ extension.ts: initializeForWorkspace()                         │
│                                                                 │
│   MemoryManager ──► ContextBuilder (shared) ──► StateManager   │
│                         │    │    │    │                        │
│                         │    │    │    └── SubAgentDispatcher   │
│                         │    │    └── MemoryLayerManager        │
│                         │    └── ObservationMasker              │
│                         └── StageContextProfileLoader           │
│                                                                 │
│   ContextHealthMonitor ──► ACCOrchestrator (NEW)               │
│         │                      │                                │
│         └── AutoHandoffTrigger │ (coexists)                    │
│                                │                                │
│                    ┌───────────┼───────────┐                   │
│                    ▼           ▼           ▼                   │
│            ObservationMasker  ContextBuilder  ContextCompactor  │
│            (stages 2,4)      (stage 3)       (stage 5)         │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Points

| Component | File | Integration Type |
|-----------|------|------------------|
| ContextBuilder creation | `extension/src/extension.ts:362` | Insert after MemoryManager |
| Shared builder setter | `extension/src/autonomousCommands.ts:52` | Call existing function |
| State assignment | `extension/src/services/StateManager.ts:245` | Set existing property |
| Event handler wiring | `extension/src/services/EventHandlers.ts:215,245` | Auto-activates |
| AutoHandoffTrigger wiring | `extension/src/autonomous/AutoHandoffTrigger.ts:213` | Call existing setter |
| DisposalService cleanup | `extension/src/services/DisposalService.ts:87` | Auto-activates |
| ContextBridgeWriter | `extension/src/autonomousCommands.ts:939` | Auto-activates |
| Terminal observation tracking | `extension/src/autonomousCommands.ts:1008` | Auto-activates |
| KnowledgeGraph save | `extension/src/autonomousCommands.ts:1117` | Auto-activates |
| ContextHealthMonitor events | `extension/src/autonomous/ContextHealthMonitor.ts:100` | Extend interface |
| ACCOrchestrator (new) | `extension/src/autonomous/ACCOrchestrator.ts` | New file |

### Key Dependencies

- ContextHealthMonitor (live, event emitter)
- AutoHandoffTrigger (live, connect pattern)
- MemoryManager (live, required for ContextBuilder constructor)
- ContextCompactor (live via AutonomousDriver, reused for ACC stage 5)
- StateManager (live, stores shared builder reference)
- EventHandlers (live, config reload handlers)
- DisposalService (live, cleanup handlers)

## Constitution Check

- [x] **I. Test-Driven Development**: New tests for ACCOrchestrator, ContextBuilder wiring, ObservationMasker, and regression tests for AutoHandoffTrigger
- [x] **IV. Strict TypeScript**: All new code in strict mode, no `any` types
- [x] **VI. Performance**: buildContext < 500ms, masking < 50ms, ACC transitions < 100ms
- [x] **VII. 80% Coverage**: New tests required for all activated components
- [x] **VIII. Minimal Changes**: Only modifying wiring points; existing component code stays as-is

## Implementation Phases

### Phase 1: Wire Shared ContextBuilder (Foundation)

**Goal**: Activate ~3,700 LOC of dead code by wiring the shared ContextBuilder into the extension lifecycle.

**Tasks**:

- [ ] Create shared ContextBuilder instance in `initializeForWorkspace()` after MemoryManager creation (extension.ts:362)
- [ ] Call `setSharedContextBuilder()` from autonomousCommands.ts with the new instance
- [ ] Assign `state.sharedContextBuilder` in StateManager
- [ ] Wire optional dependencies: ScopeGuard (`setScopeGuard`), CostBudgetEnforcer (`setCostBudgetEnforcer`), ContextUsageLogger (`setUsageLogger`)
- [ ] Wire AutoHandoffTrigger via `setContextBuilder()` (existing setter at line 213)
- [ ] Verify `reinitializeExtension()` disposes old builder and creates new one (cleanup at line 295 already exists)
- [ ] Write wiring integration test: verify `state.sharedContextBuilder` is non-null after `initializeForWorkspace()`
- [ ] Write regression test: AutoHandoffTrigger auto-save at 65% and critical at 70% still fires correctly

**Verification**:
- [ ] Build passes with new wiring code
- [ ] All existing tests still pass
- [ ] Integration test proves builder is wired
- [ ] EventHandlers config reload guards (lines 215, 245) no longer early-return

**Files to modify**:
- `extension/src/extension.ts` - Add ContextBuilder creation and wiring (~25 lines)

**Files that auto-activate** (no changes needed):
- `extension/src/services/EventHandlers.ts:215,245` - Config reload handlers
- `extension/src/services/DisposalService.ts:87-96` - Cache flush on deactivation
- `extension/src/autonomousCommands.ts:939` - ContextBridgeWriter
- `extension/src/autonomousCommands.ts:1008` - Terminal observation tracking
- `extension/src/autonomousCommands.ts:1117` - KnowledgeGraph save

---

### Phase 2: ContextBuilder Unit Tests

**Goal**: Add test coverage for the now-live ContextBuilder and ObservationMasker.

**Tasks**:

- [ ] Create `extension/src/autonomous/__tests__/ContextBuilder.test.ts`
  - Test `buildContext()` with mock MemoryManager and HintLoader
  - Test `setCurrentStage()` loads correct profile
  - Test `trackObservation()` records and returns ID
  - Test budget enforcement in truncate mode
  - Test that empty memories produce valid (zero-token) context
- [ ] Create `extension/src/autonomous/__tests__/ObservationMasker.test.ts`
  - Test three-tier decay: full -> key-points -> masked based on turn count
  - Test error preservation (stack traces never masked)
  - Test per-type decay rates (test_output decays slower than search_result)
  - Test `saveCacheToDisk()` and `loadCacheFromDisk()` round-trip
  - Test LRU eviction at maxCacheSize (100)
  - Test cache corruption handling (clear and restart)
- [ ] Create `extension/src/autonomous/__tests__/StageContextProfileLoader.test.ts`
  - Test YAML loading with valid config
  - Test fallback to defaults when YAML missing
  - Test validation (budgets sum <= 1.0)
  - Test per-stage profile retrieval

**Verification**:
- [ ] All new tests pass
- [ ] Coverage for ContextBuilder, ObservationMasker, StageContextProfileLoader

**Files to create**:
- `extension/src/autonomous/__tests__/ContextBuilder.test.ts`
- `extension/src/autonomous/__tests__/ObservationMasker.test.ts`
- `extension/src/autonomous/__tests__/StageContextProfileLoader.test.ts`

---

### Phase 3: ACC Events + SubAgentDispatcher + MemoryLayerManager

**Goal**: Add new ACC threshold events to ContextHealthMonitor AND wire SubAgentDispatcher and MemoryLayerManager. These are done together in Phase 3 so ACCOrchestrator (Phase 4) has all its constructor dependencies available.

**IMPORTANT**: ACC stage 1 gets its own `'acc-delegation-advisory'` event at 70% — it does NOT reuse `'critical'`. This avoids a race condition where AutoHandoffTrigger's critical handler (save/clear/resume) and ACCOrchestrator's stage 1 handler (delegation advisory) would compete on the same event.

**Tasks**:

- [ ] Add new event types to `ContextHealthEvents` interface (lines 103-110):
  - `'acc-delegation-advisory'` at 70% (separate from `'critical'`)
  - `'acc-observation-masking'` at 80%
  - `'acc-fast-pruning'` at 85%
  - `'acc-aggressive-masking'` at 90%
  - `'acc-full-compaction'` at 99%
- [ ] Add corresponding threshold config values to `ContextHealthConfig` interface (lines 82-98) with defaults
- [ ] Add threshold crossing detection in `emitStatusEvents()` following the existing pattern: `utilizationRatio >= threshold && previousRatio < threshold && dataSource === 'real'`. Emit ALL ACC events AFTER existing auto-save/critical events (preserve event ordering).
- [ ] Create SubAgentDispatcher in `initializeForWorkspace()` and wire to ContextBuilder via `setSubAgentDispatcher()`
- [ ] Wire SubAgentDispatcher to receive utilization updates from ContextHealthMonitor events
- [ ] Create MemoryLayerManager in `initializeForWorkspace()` and wire to ContextBuilder via `setMemoryLayerManager(manager, false)` (disabled by default)
- [ ] Wire MemoryLayerManager's MemoryManager dependency via `setMemoryManager()`
- [ ] Write unit tests for new threshold crossing events
- [ ] Write test verifying existing auto-save/critical events are unaffected
- [ ] Write SubAgentDispatcher tests: threshold-specific agent types (codebase-locator at 50%, codebase-analyzer at 60%, blocking at 70%), formatAsContextSection() markdown, result truncation per agent type
- [ ] Write MemoryLayerManager tests: core/recall/archival separation, archival is search-only (NOT loaded in default context), recall 20-entry limit, priority-based demotion

**Verification**:
- [ ] New ACC events fire at correct thresholds in tests
- [ ] Existing events unchanged (regression)
- [ ] Event ordering preserved (auto-save before critical before ACC events)
- [ ] SubAgentDispatcher produces correct agent recommendations at each threshold
- [ ] MemoryLayerManager correctly separates layers; archival excluded from default builds

**Files to modify**:
- `extension/src/autonomous/ContextHealthMonitor.ts` - Add events to interface, config, and emission logic (~40 lines)
- `extension/src/extension.ts` - Wire SubAgentDispatcher and MemoryLayerManager (~15 lines)

**Files to create**:
- `extension/src/autonomous/__tests__/ContextHealthMonitor.acc-events.test.ts`
- `extension/src/autonomous/__tests__/SubAgentDispatcher.test.ts`
- `extension/src/autonomous/__tests__/MemoryLayerManager.test.ts`

---

### Phase 4: Implement ACCOrchestrator

**Goal**: Create the new ACCOrchestrator class. All dependencies are now available from Phases 1+3: shared ContextBuilder, ObservationMasker, SubAgentDispatcher, and ContextHealthMonitor with ACC events.

**Tasks**:

- [ ] Create `extension/src/autonomous/ACCOrchestrator.ts` with:
  - `connect(monitor: ContextHealthMonitor)` method following AutoHandoffTrigger pattern
  - Constructor takes: ContextBuilder (required), ObservationMasker (required), SubAgentDispatcher (optional, null-safe), ContextCompactor (optional, null-safe for no-LLM case)
  - Stage 1 handler (70%, listens to `acc-delegation-advisory`): Log warning, call `subAgentDispatcher?.updateUtilization(70)` (null-safe)
  - Stage 2 handler (80%): Call `ObservationMasker.maskOldObservations()` with reduced age thresholds
  - Stage 3 handler (85%): Update ContextBuilder config to `enforceBudgetCaps: true, budgetEnforcementMode: 'truncate'`
  - Stage 4 handler (90%): Force all observations to masked tier via `ObservationMasker`
  - Stage 5 handler (99%): If `contextCompactor` is non-null, call `compact()` with aggressive strategy; if null, log warning and skip
  - Cooldown logic: minimum 30s between same-stage actions, higher stages supersede lower
  - All handlers wrapped in try/catch: errors logged as warnings, never thrown
  - `dispose()` method cleaning up event listeners
- [ ] Wire ACCOrchestrator in `initializeForWorkspace()`:
  - Create AFTER Phase 3 dependencies exist (ContextBuilder, SubAgentDispatcher, ContextHealthMonitor)
  - Pass: shared ContextBuilder, `builder.getObservationMasker()`, SubAgentDispatcher, null for ContextCompactor (wired later when autonomous session starts)
  - Call `connect(monitor)`
  - Store in `state.accOrchestrator` for disposal
- [ ] Create `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts`:
  - Test each stage fires AND ACTS at correct threshold (verify real behavior, not just handler called)
  - Test cooldown prevents rapid re-triggering (30s)
  - Test higher stages supersede lower
  - Test all stages non-fatal (errors logged, not thrown)
  - Test stage 5 with null compactor (warning logged, no crash)
  - Test stage 5 happy path with stub compactor (verify compact called with aggressive params)
  - Test dispose() cleans up listeners

**Verification**:
- [ ] All ACCOrchestrator tests pass
- [ ] Simulated utilization ramp triggers all 5 stages in order
- [ ] AutoHandoffTrigger behavior unchanged with ACC active (separate events, no race)

**Files to create**:
- `extension/src/autonomous/ACCOrchestrator.ts` (~200-300 lines)
- `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts`

**Files to modify**:
- `extension/src/extension.ts` - Wire ACCOrchestrator (~10 lines)

---

### Phase 5: Integration Testing

**Goal**: End-to-end verification that all components work together. Split into 3 focused integration tests (not one god test).

**Tasks**:

- [ ] Create `extension/src/autonomous/__tests__/acc-integration.test.ts` with 3 test suites:
  - **ACC Pipeline**: Full utilization ramp (0→100%) with real components, verify each stage acts correctly
  - **Coexistence**: Both AutoHandoffTrigger and ACCOrchestrator connected to same monitor, verify independent event handling at 70% (critical vs acc-delegation-advisory)
  - **Dead Code Activation**: Verify 5 auto-activating paths work: EventHandlers reload (lines 215, 245), DisposalService cache flush (line 87), observation tracking (line 1008), KnowledgeGraph save (line 1117)
- [ ] Verify build passes (`npm run compile`)
- [ ] Verify all tests pass (`npm test`)
- [ ] Verify lint passes (`npm run lint`)

**Verification**:
- [ ] Integration tests pass
- [ ] Full test suite passes
- [ ] Build succeeds
- [ ] Lint clean

**Files to create**:
- `extension/src/autonomous/__tests__/acc-integration.test.ts`

## File Structure

```text
extension/src/
├── extension.ts                              # MODIFY: Wire ContextBuilder, ACCOrchestrator, SubAgentDispatcher, MemoryLayerManager
├── autonomous/
│   ├── ACCOrchestrator.ts                    # NEW: 5-stage compaction orchestrator
│   ├── ContextBuilder.ts                     # UNCHANGED (already implemented)
│   ├── ObservationMasker.ts                  # UNCHANGED (already implemented)
│   ├── StageContextProfileLoader.ts          # UNCHANGED (already implemented)
│   ├── MemoryLayerManager.ts                 # UNCHANGED (already implemented)
│   ├── SubAgentDispatcher.ts                 # UNCHANGED (already implemented)
│   ├── ContextHealthMonitor.ts               # MODIFY: Add ACC threshold events
│   ├── ContextCompactor.ts                   # UNCHANGED (reused by ACC stage 5)
│   ├── AutoHandoffTrigger.ts                 # UNCHANGED (coexists with ACC)
│   └── __tests__/
│       ├── ContextBuilder.test.ts            # NEW
│       ├── ObservationMasker.test.ts         # NEW
│       ├── StageContextProfileLoader.test.ts # NEW
│       ├── ACCOrchestrator.test.ts           # NEW
│       ├── SubAgentDispatcher.test.ts        # NEW
│       ├── MemoryLayerManager.test.ts        # NEW
│       ├── ContextHealthMonitor.acc-events.test.ts  # NEW
│       └── acc-integration.test.ts           # NEW
├── autonomousCommands.ts                     # UNCHANGED (auto-activates)
├── services/
│   ├── EventHandlers.ts                      # UNCHANGED (auto-activates)
│   ├── StateManager.ts                       # UNCHANGED (property already exists)
│   └── DisposalService.ts                    # UNCHANGED (auto-activates)
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wiring activates dead code paths with latent bugs | High | Phase 2 tests cover ContextBuilder and ObservationMasker before ACC is layered on |
| ACC interferes with AutoHandoffTrigger | High | Regression tests in Phase 1; ACCOrchestrator only listens to new events, doesn't modify existing ones |
| ObservationMasker cache corruption on first real use | Medium | Edge case test in Phase 2; existing try/catch in DisposalService |
| ContextBridgeWriter (line 939) fails on activation | Medium | Existing non-fatal pattern (try/catch at line 964-971) |
| Terminal observation tracking (line 1008) causes unexpected behavior | Medium | Monitor during integration testing; patterns are well-defined |
| reflect-metadata import order broken by new imports | Low | No new DI-decorated classes; only wiring existing instances |
| Extension reinitialization leaks ContextBuilder | Low | Cleanup already exists at StateManager.clearMonitoringComponents() line 317 |

## Notes

- **Phase ordering is critical**: Phase 1 (wiring) must complete before Phase 3 (ACC events + dispatcher/memory), because ACCOrchestrator (Phase 4) needs SubAgentDispatcher and ContextBuilder from earlier phases as constructor dependencies.
- **Existing component code is unchanged**: All ~3,700 LOC stays as-is. We're only adding wiring in extension.ts and a new ACCOrchestrator class.
- **ACC stage 1 has its own event**: `acc-delegation-advisory` at 70% is a separate event from `critical`. AutoHandoffTrigger listens to `critical` for save/clear/resume, ACCOrchestrator listens to `acc-delegation-advisory` for delegation injection. No race condition between the two handlers.
- **ContextFolder is deferred**: Research mentioned ContextFolder for ACC stage 4 (section folding), but it's out of scope. Stage 4 uses aggressive ObservationMasker behavior instead.
- **Optional dependencies are null-safe**: ACCOrchestrator constructor accepts SubAgentDispatcher and ContextCompactor as optional (nullable) params. Stage handlers use `?.` or null checks to avoid runtime errors when these aren't wired.
- **Setter wiring is position-dependent**: Each `setX()` call on ContextBuilder must be placed AFTER its dependency is created in `initializeForWorkspace()`: `setUsageLogger()` after line 299, `setScopeGuard()` after line 378, `setCostBudgetEnforcer()` after line 399.

## Spec Traceability

### User Story Coverage

| Story | Priority | Plan Phase(s) | Components |
|-------|----------|---------------|------------|
| US1: Observation Masking | P1 | Phase 1 (wiring), Phase 2 (tests) | ContextBuilder, ObservationMasker |
| US2: Stage-Aware Budgets | P1 | Phase 1 (wiring), Phase 2 (tests) | ContextBuilder, StageContextProfileLoader |
| US3: Progressive ACC | P2 | Phase 3 (events), Phase 4 (orchestrator) | ACCOrchestrator, ContextHealthMonitor |
| US4: Delegation Advisory | P2 | Phase 3 (wiring + tests) | SubAgentDispatcher |
| US5: Layered Memory | P3 | Phase 3 (wiring + tests) | MemoryLayerManager |
| US6: Runtime Config Reload | P3 | Phase 1 (auto-activates) | EventHandlers |

### Requirement Coverage

| Requirement | Plan Phase | Implementation |
|-------------|-----------|----------------|
| FR-001: Call setSharedContextBuilder() | Phase 1 | extension.ts wiring |
| FR-002: Assign StateManager.sharedContextBuilder | Phase 1 | extension.ts wiring |
| FR-003: Pass builder in EventHandlerDependencies | Phase 1 | Already wired, auto-activates |
| FR-004: Call AutoHandoffTrigger.setContextBuilder() | Phase 1 | extension.ts wiring |
| FR-005: Dispose on reinitialize | Phase 1 | Already exists at line 295 |
| FR-006: Re-create on reinitialize | Phase 1 | initializeForWorkspace re-runs |
| FR-007: ACCOrchestrator with connect() | Phase 4 | New ACCOrchestrator.ts |
| FR-008: 5-stage graduated actions | Phase 4 | ACCOrchestrator stage handlers |
| FR-009: Coexist with AutoHandoffTrigger | Phase 4 | Separate events (acc-delegation-advisory vs critical), regression tests |
| FR-010: New ContextHealthMonitor events | Phase 3 | ContextHealthMonitor.ts extension |
| FR-011: Wire SubAgentDispatcher | Phase 3 | extension.ts wiring |
| FR-012: ObservationMasker cache flush | Phase 1 | Auto-activates (DisposalService) |
| FR-013: Terminal observation tracking | Phase 1 | Auto-activates (autonomousCommands.ts:1008) |
| FR-014: KnowledgeGraph save | Phase 1 | Auto-activates (autonomousCommands.ts:1117) |
| FR-015: ContextBridgeWriter | Phase 1 | Auto-activates (autonomousCommands.ts:939) |

Coverage: 6/6 user stories, 15/15 functional requirements
