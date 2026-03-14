# Requirement Traceability: AI Token Usage Tracking Panel

Generated: 2026-03-13T16:00:00Z

## Spec → Plan → Tasks Mapping

### User Story Coverage

| User Story | Priority | Plan Phase | Tasks | Acceptance Criteria Status |
|------------|----------|------------|-------|---------------------------|
| US1: View Real-Time AI Costs | P1 | Phase 3 | T018-T025 (8 tasks) | 5/5 covered |
| US2: Monitor Usage Across Time Periods | P1 | Phase 3, Phase 4 | T026-T031 (6 tasks) | 5/5 covered |
| US3: Stay Within Budget Limits | P2 | Phase 3, Phase 5 | T032-T036 (5 tasks) | 4/4 covered |
| US4: Quick Access to Session Costs | P2 | Phase 4, Phase 6 | T037-T045 (9 tasks) | 5/5 covered |

**Total**: 4/4 user stories (100%), 28 implementation tasks

### Acceptance Criteria Detail

#### US1: View Real-Time AI Costs

| Criterion | Task(s) | Phase | Status |
|-----------|---------|-------|--------|
| Panel displays current session total cost (<1s latency) | T021-T024, T013-T014 (file watch + polling) | Phase 2, Phase 3 | COVERED |
| Panel shows cost breakdown by provider | T022 (getChildren - provider items) | Phase 3 | COVERED |
| Panel shows token counts (input/output) per provider | T022 (getChildren - token items) | Phase 3 | COVERED |
| Panel updates automatically on new AI calls | T013 (FileSystemWatcher), T015 (session change) | Phase 2 | COVERED |
| Cost calculations accurate within 1% | T007 (cost calculation tests), T012 (CostBudgetEnforcer rates) | Phase 2 | COVERED |

#### US2: Monitor Usage Across Time Periods

| Criterion | Task(s) | Phase | Status |
|-----------|---------|-------|--------|
| Panel displays "Current Session" usage | T012 (session filtering), T022 (Current Session item) | Phase 2, Phase 3 | COVERED |
| Panel displays "Today" aggregated usage | T029 (today date filtering), T030 (Today item) | Phase 4 | COVERED |
| Panel displays "This Week" aggregated usage | T029 (week date filtering), T031 (This Week item) | Phase 4 | COVERED |
| Each time period shows total cost and per-provider breakdown | T022 (tree hierarchy), T023 (formatting) | Phase 3 | COVERED |
| Time periods are expandable/collapsible | T023 (collapsibleState), T028 (test) | Phase 3, Phase 4 | COVERED |

#### US3: Stay Within Budget Limits

| Criterion | Task(s) | Phase | Status |
|-----------|---------|-------|--------|
| Panel displays budget progress: "$2.45 / $10.00 (24%)" | T025 (budget display), T034 (budget integration) | Phase 3, Phase 5 | COVERED |
| Budget status is color-coded (green/yellow/red) | T035 (color-coding logic), T032 (test) | Phase 5 | COVERED |
| Budget integrates with CostBudgetEnforcer thresholds | T034 (getSnapshot integration) | Phase 5 | COVERED |
| Budget warnings are visible in panel interface | T036 (warning icons and text) | Phase 5 | COVERED |

#### US4: Quick Access to Session Costs

| Criterion | Task(s) | Phase | Status |
|-----------|---------|-------|--------|
| Optional status bar shows: "$(dollar) AI: $2.45" | T043 (updateDisplay text format) | Phase 6 | COVERED |
| Status bar updates in real-time (<1s latency) | T042 (subscribe to 'usage-update'), T039 (latency test) | Phase 6 | COVERED |
| Status bar is color-coded based on budget status | T043 (ThemeColor assignment) | Phase 6 | COVERED |
| Clicking status bar opens panel or shows QuickPick breakdown | T044 (gofer.showAIUsage command) | Phase 6 | COVERED |
| Status bar can be enabled/disabled via configuration | T042 (config listener), T038 (test) | Phase 6 | COVERED |

### Plan Phase Coverage

| Plan Phase | Task Count | Task IDs | Coverage |
|------------|------------|----------|----------|
| Phase 1: Setup & Foundation | 5 | T001-T005 | 100% |
| Phase 2: Data Layer (AIUsageMonitor) | 12 | T006-T017 | 100% |
| Phase 3: UI Layer (AIUsageProvider - US1) | 8 | T018-T025 | 100% |
| Phase 4: Time Periods (US2) | 6 | T026-T031 | 100% |
| Phase 5: Budget Integration (US3) | 5 | T032-T036 | 100% |
| Phase 6: Status Bar (US4) | 9 | T037-T045 | 100% |
| Phase 7: Extension Wiring & Integration | 10 | T046-T055 | 100% |
| Phase 8: Polish & Final Testing | 11 | T056-T066 | 100% |

**Total**: 8/8 plan phases (100%), 66 tasks

### Plan Task Item Coverage

Verifying every item in plan.md Phase task lists:

#### Phase 1: Setup & Foundation (Plan)

| Plan Task Item | Task ID(s) | Status |
|----------------|-----------|--------|
| Create TypeScript interfaces | T001 | COVERED |
| Update package.json view registration | T002 | COVERED |
| Add configuration schema | T003 | COVERED |
| Update StateManager fields | T004 | COVERED |
| Create test fixtures | T005 | COVERED |

#### Phase 2: Data Layer (Plan)

| Plan Task Item | Task ID(s) | Status |
|----------------|-----------|--------|
| Create AIUsageMonitor class | T011 | COVERED |
| Implement getUsageData() method | T012 | COVERED |
| Implement FileSystemWatcher | T013 | COVERED |
| Implement periodic polling | T014 | COVERED |
| Add session detection integration | T015 | COVERED |
| Implement dispose() for cleanup | T017 | COVERED |

*All verification steps covered by tests T006-T010*

#### Phase 3: UI Layer (Plan)

| Plan Task Item | Task ID(s) | Status |
|----------------|-----------|--------|
| Create AIUsageProvider class | T021 | COVERED |
| Implement getChildren() method | T022 | COVERED |
| Implement getTreeItem() method | T023 | COVERED |
| Implement refresh() method | T024 | COVERED |
| Add budget progress display | T025 | COVERED |
| Format numbers for display | T023 | COVERED |

*All verification steps covered by tests T018-T020*

#### Phase 4: Status Bar (Plan)

| Plan Task Item | Task ID(s) | Status |
|----------------|-----------|--------|
| Create AIUsageStatusBar class | T041 | COVERED |
| Implement connect(monitor) method | T042 | COVERED |
| Implement updateDisplay(data) method | T043 | COVERED |
| Register command gofer.showAIUsage | T044 | COVERED |
| Implement dispose() for cleanup | T045 | COVERED |

*All verification steps covered by tests T037-T040*

#### Phase 5: Extension Wiring (Plan)

| Plan Task Item | Task ID(s) | Status |
|----------------|-----------|--------|
| Update extension.ts activation (remove Context Window) | T050 | COVERED |
| Update extension.ts activation (add AI Usage components) | T051 | COVERED |
| Add AIUsageStatusBar registration | T052 | COVERED |
| Update InitializationService wiring | T053 | COVERED |
| Add configuration change listener | T054 | COVERED |
| Update disposal logic | T055 | COVERED |

*All verification steps covered by tests T046-T049*

#### Phase 6: Polish & Final Testing (Plan)

| Plan Task Item | Task ID(s) | Status |
|----------------|-----------|--------|
| Add panel refresh command | T056-T057 | COVERED |
| Add error handling (missing file, JSON parse, missing session) | T058-T060 | COVERED |
| Add logging for observability | T061 | COVERED |
| Performance optimization (debounce, cache) | T062-T063 | COVERED |
| Documentation (JSDoc comments) | T064-T066 | COVERED |

**Result**: All plan task items have implementing tasks ✓

### Functional Requirements Coverage

Mapping tasks to spec.md functional requirements:

| FR ID | Requirement | Task(s) | Status |
|-------|------------|---------|--------|
| FR1 | Panel Registration and Display | T002 (package.json), T051 (extension.ts) | COVERED |
| FR2 | Real-Time Cost Tracking | T012 (getUsageData), T013 (FileSystemWatcher), T014 (polling) | COVERED |
| FR3 | Provider Breakdown Display | T022 (getChildren hierarchy), T023 (formatting) | COVERED |
| FR4 | Time Period Aggregation | T012 (current), T029 (today/week), T030-T031 (UI items) | COVERED |
| FR5 | Budget Integration | T034 (CostBudgetEnforcer), T035 (color-coding), T036 (warnings) | COVERED |
| FR6 | Status Bar Item (Optional) | T041-T045 (AIUsageStatusBar complete) | COVERED |
| FR7 | Cost Calculation Accuracy | T007 (test rates), T012 (reuse CostBudgetEnforcer rates) | COVERED |
| FR8 | Panel Refresh and Updates | T024 (refresh method), T056-T057 (refresh command) | COVERED |

**Total**: 8/8 functional requirements (100%)

### Data Model Coverage

Mapping tasks to data-model.md entities:

| Entity | Implementing Task(s) | Fields Covered? | Status |
|--------|---------------------|----------------|--------|
| AIUsageData | T001 (type definition), T012 (population logic) | All fields | COVERED |
| ProviderUsage | T001 (type definition), T012 (mapping from UsageLogger) | All fields | COVERED |
| AIUsageItem | T001 (type definition), T022-T023 (tree building) | All fields | COVERED |

**Total**: 3/3 data entities (100%)

### API Contract Coverage

Mapping tasks to contracts/internal-api.md:

| API Contract | Contract File | Implementing Task(s) | Status |
|--------------|--------------|---------------------|--------|
| Event: 'usage-update' | internal-api.md | T011 (EventEmitter), T013-T015 (emit triggers) | COVERED |
| Method: startMonitoring() | internal-api.md | T014 (implementation) | COVERED |
| Method: stopMonitoring() | internal-api.md | T017 (implementation) | COVERED |
| Method: getUsageData(period) | internal-api.md | T012 (implementation) | COVERED |
| Method: forceRefresh() | internal-api.md | T016 (implementation) | COVERED |
| AIUsageProvider.getChildren() | internal-api.md | T022 (implementation) | COVERED |
| AIUsageProvider.getTreeItem() | internal-api.md | T023 (implementation) | COVERED |
| AIUsageProvider.refresh() | internal-api.md | T024 (implementation) | COVERED |
| AIUsageStatusBar.connect() | internal-api.md | T042 (implementation) | COVERED |
| AIUsageStatusBar.updateDisplay() | internal-api.md | T043 (implementation) | COVERED |

**Total**: 10/10 API methods/events (100%)

### Integration Point Coverage

Mapping tasks to plan.md integration points:

| Integration Point | File | Implementing Task(s) | Status |
|------------------|------|---------------------|--------|
| AIUsageProvider | extension/src/aiUsageProvider.ts | T021-T025 | COVERED |
| AIUsageMonitor | extension/src/autonomous/AIUsageMonitor.ts | T011-T017 | COVERED |
| AIUsageStatusBar | extension/src/ui/AIUsageStatusBar.ts | T041-T045 | COVERED |
| Package.json | extension/package.json | T002 (view registration) | COVERED |
| Extension.ts | extension/src/extension.ts | T050-T052 (wiring) | COVERED |
| InitializationService | extension/src/services/InitializationService.ts | T053 (wiring) | COVERED |
| CostBudgetEnforcer (REUSE) | extension/src/autonomous/CostBudgetEnforcer.ts | T034 (integration) | COVERED |
| UsageLogger (INTEGRATE) | extension/src/council/UsageLogger.ts | T012 (getUsageSummary calls) | COVERED |
| MultiSessionBridgeWatcher (INTEGRATE) | extension/src/autonomous/MultiSessionBridgeWatcher.ts | T015 (session detection) | COVERED |
| StateManager (EXTEND) | extension/src/services/StateManager.ts | T004 (add fields) | COVERED |

**Total**: 10/10 integration points (100%)

## Coverage Summary

### By Category

| Category | Covered | Total | Percentage |
|----------|---------|-------|------------|
| **Plan Phases** | 8 | 8 | 100% |
| **Plan Task Items** | 31 | 31 | 100% |
| **User Stories** | 4 | 4 | 100% |
| **Acceptance Criteria** | 19 | 19 | 100% |
| **Functional Requirements** | 8 | 8 | 100% |
| **Data Entities** | 3 | 3 | 100% |
| **API Contracts** | 10 | 10 | 100% |
| **Integration Points** | 10 | 10 | 100% |

### Overall Coverage

**Total Requirements Traced**: 93/93 (100%)

**Status**: ✅ VALIDATION PASSED

All spec requirements, plan phases, and design artifacts have implementing tasks. No gaps detected.

## Test Coverage Mapping

### Test Distribution

| Phase | Test Tasks | Implementation Tasks | Test/Impl Ratio |
|-------|-----------|---------------------|-----------------|
| Phase 2: AIUsageMonitor | 5 (T006-T010) | 7 (T011-T017) | 0.71 |
| Phase 3: US1 | 3 (T018-T020) | 5 (T021-T025) | 0.60 |
| Phase 4: US2 | 3 (T026-T028) | 3 (T029-T031) | 1.00 |
| Phase 5: US3 | 2 (T032-T033) | 3 (T034-T036) | 0.67 |
| Phase 6: US4 | 4 (T037-T040) | 5 (T041-T045) | 0.80 |
| Phase 7: Integration | 4 (T046-T049) | 6 (T050-T055) | 0.67 |

**Total Test Tasks**: 21/66 (32% of tasks are tests)

**Test Strategy**: TDD - All tests written before implementation (test tasks have lower IDs than impl tasks in same phase)

### Coverage Target

- **Constitution Requirement**: 80% minimum
- **Project Target**: 85%+
- **Critical Paths**: 100% coverage (AIUsageMonitor cost calculations, event flow)

Test coverage validated in Phase 8 (Polish) by running test suite.

## Dependency Validation

### Critical Path Analysis

**Longest Sequential Chain**:
1. T001 (types) → T011 (monitor class) → T012-T017 (monitor impl) [Phase 1-2]
2. T021 (provider class) → T022-T025 (provider impl) [Phase 3]
3. T050-T055 (integration) [Phase 7]
4. T056-T066 (polish) [Phase 8]

**Estimated Duration**:
- Sequential: 25-30 hours
- With 3 developers (maximal parallelization): 12-15 hours

### Blocker Analysis

**Hard Blockers** (must complete before any other work):
- T001: Type definitions (blocks all implementation)
- T011: AIUsageMonitor class skeleton (blocks all monitor methods)

**Phase Blockers** (must complete before next phase):
- Phase 1 → Phase 2: T001 (types needed)
- Phase 2 → Phase 3/4/5/6: T011-T017 (monitor service needed)
- Phases 3/4/5/6 → Phase 7: All US implementations must complete
- Phase 7 → Phase 8: Integration must work

**No Circular Dependencies Detected** ✓

## Gap Analysis

### Plan Gaps

**Result**: No gaps found. All plan phases have implementing tasks.

### Spec Gaps

**Result**: No gaps found. All acceptance criteria have implementing tasks.

### Design Gaps

**Result**: No gaps found. All data entities and API contracts have implementing tasks.

## Risk Analysis

### Implementation Risks

| Risk | Affected Tasks | Mitigation in Tasks |
|------|---------------|-------------------|
| FileSystemWatcher fails on some platforms | T013 | T014 (polling fallback) |
| Token counts missing from CLI | T012 | T060 (graceful degradation) |
| Memory leaks from duplicate watchers | T017 | T010 (memory leak test), T055 (disposal) |
| Panel replacement breaks workflows | T050 | T047 (integration test validates removal) |

All risks have mitigation tasks in place ✓

## Approval Checklist

Before approving tasks.md for implementation:

- [x] All plan phases have implementing tasks
- [x] All user stories have implementing tasks
- [x] All acceptance criteria mapped to tasks
- [x] All functional requirements covered
- [x] All data entities covered
- [x] All API contracts covered
- [x] Test tasks exist for all implementation tasks (TDD)
- [x] No circular dependencies
- [x] Critical path identified
- [x] Parallel opportunities identified (38 tasks marked [P])
- [x] Protected files documented
- [x] Risk mitigations in place

**Status**: ✅ READY FOR APPROVAL

---

Generated by: /4_gofer_tasks
Feature: AI Token Usage Tracking Panel (025)
Date: 2026-03-13
