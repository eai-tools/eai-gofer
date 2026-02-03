---
feature: 011-context-health-recursive-memory
spec: spec.md
plan: plan.md
status: ready
created: '2026-01-25'
total_tasks: 81
phases: 7
---

# Tasks: Context Health and Recursive Memory Enhancement

## Overview

This task breakdown implements the context health and recursive memory
enhancement feature following the phased approach in `plan.md`. Tasks are
organized by user story with explicit dependencies to enable parallel execution
where possible.

**Task Notation**:

- `[P]` = Can run in parallel with other `[P]` tasks in same phase
- `[S]` = Sequential - must complete before next task
- `[B]` = Blocked by specific task(s)
- Priority: Tasks listed in dependency order within each section

---

## User Story Coverage

| Story                               | Tasks     | Status   |
| ----------------------------------- | --------- | -------- |
| US1: Context Health Monitoring      | T015-T033 | Complete |
| US2: Observation Masking            | T001-T014 | Complete |
| US3: Research Document Optimization | T051-T062 | Complete |
| US4: Memory-First Loading           | T043-T050 | Complete |
| US5: Stage-Aware Context Profiles   | T034-T042 | Complete |
| Cross-cutting: Telemetry            | T063-T071 | Complete |
| Cross-cutting: Integration          | T072-T082 | Complete |

---

## Phase 1: Foundation - Observation Masking

**Goal**: Implement observation masking to achieve 50% context reduction **User
Stories**: US2 (Observation Masking) **Estimated Effort**: Week 1

### Setup and Core Implementation

- [x] T001 [S] [US2] Create ObservationMasker class skeleton with config
      interface
  - File: `extension/src/autonomous/ObservationMasker.ts`
  - Create `ObservationMaskerConfig` and `ObservationEntry` interfaces
  - Create class with constructor accepting partial config
  - Add default config values per data-model.md
  - No dependencies

- [x] T002 [P] [US2] Implement observation tracking (add, get, clear) [B:T001]
  - Add `trackObservation()` method returning observation ID
  - Add `getObservation(id)` method
  - Add `getAllObservations()` method
  - Add `clearCache()` method
  - Implement in-memory Map storage

- [x] T003 [P] [US2] Implement token estimation utility [B:T001]
  - Create `estimateTokens(content: string): number` function
  - Use character-based estimation (4 chars ≈ 1 token)
  - Include in ObservationMasker or as utility

- [x] T004 [S] [US2] Implement mask() method with age-based filtering
      [B:T002,T003]
  - Add `maskOldObservations(currentTurn: number): MaskResult` method
  - Filter observations by age threshold
  - Calculate tokens saved
  - Return masked observations list

- [x] T005 [S] [US2] Implement placeholder generation with metadata [B:T004]
  - Generate XML-style placeholders:
    `<observation_masked id="..." type="..." tokens="..." />`
  - Include file path, line count, timestamp in metadata
  - Preserve action/reasoning history

- [x] T006 [P] [US2] Implement observation cache storage/retrieval [B:T002]
  - Add `saveCacheToDisk(): Promise<void>` method
  - Add `loadCacheFromDisk(): Promise<void>` method
  - Store in `.specify/memory/observation-cache/`
  - Use JSON format with observation ID as filename

### Unit Tests

- [x] T007 [S] [US2] Write unit tests for ObservationMasker [B:T001-T006]
  - Test observation tracking CRUD operations
  - Test age-based masking with various thresholds
  - Test placeholder generation format
  - Test cache persistence
  - Test token estimation accuracy
  - Target: 90% coverage

### MCP Tool for Expansion

- [x] T008 [S] [US2] Add `gofer_expand_observation` MCP tool definition [B:T006]
  - File: `language-server/src/mcp/toolHandler.ts`
  - Add tool to MCP_TOOLS constant
  - Define input schema per contracts/mcp-tools.md
  - Register tool handler

- [x] T009 [S] [US2] Implement expand observation tool handler [B:T008]
  - Validate observation ID format (UUID)
  - Look up observation in cache
  - Return full content with metadata
  - Handle not-found error case

- [x] T010 [S] [US2] Write integration tests for expand tool [B:T009]
  - Test successful expansion
  - Test not-found error
  - Test invalid ID handling
  - Test cache miss scenario

### ContextBuilder Integration

- [x] T011 [S] [US2] Add ObservationMasker to ContextBuilder constructor
      [B:T006]
  - File: `extension/src/autonomous/ContextBuilder.ts`
  - Add masker as optional parameter with default instance
  - Add enable/disable config option

- [x] T012 [S] [US2] Call maskObservations() after mergeContextSections()
      [B:T011]
  - Modify buildContext() method
  - Track current turn number
  - Apply masking to observations section
  - Include masking stats in build result

- [x] T013 [S] [US2] Track observation history during context building [B:T012]
  - Intercept tool outputs (file reads, commands)
  - Create ObservationEntry for each
  - Store in masker cache
  - Track turn numbers

- [x] T014 [S] [US2] Update ContextBuilder tests for masking integration
      [B:T013]
  - Test context reduction percentage
  - Test observation recovery
  - Test turn tracking
  - Verify no regression in existing functionality

**Phase 1 Verification Checklist**:

- [x] All unit tests pass (T007, T010, T014)
- [x] Integration tests demonstrate 50% context reduction
- [x] Observation expansion works via MCP tool
- [x] No regression in existing functionality

---

## Phase 2: Context Health Monitoring

**Goal**: Implement automatic context health monitoring with threshold alerts
**User Stories**: US1 (Context Health Monitoring) **Estimated Effort**: Week 1-2

### ContextHealthMonitor Module

- [x] T015 [S] [US1] Create ContextHealthMonitor class with config [B:T014]
  - File: `extension/src/autonomous/ContextHealthMonitor.ts`
  - Create `ContextHealthConfig` interface per data-model.md
  - Create `ContextHealthStatus` interface
  - Extend EventEmitter for event support
  - Add default config values

- [x] T016 [P] [US1] Implement analyzeContext() method [B:T015]
  - TypeScript port of check-context-health.sh logic
  - Return ContextHealthStatus with all fields
  - Calculate utilization percentage
  - Generate status (healthy/warning/critical)

- [x] T017 [P] [US1] Implement token counting for breakdown categories [B:T015]
  - Count tokens for: specArtifacts, memories, hints, observations, systemFiles,
    conversation
  - Use same token estimation as ObservationMasker
  - Return TokenBreakdown object

- [x] T018 [S] [US1] Implement threshold checking with recommendations
      [B:T016,T017]
  - Check against warning/critical thresholds
  - Generate contextual recommendations
  - Consider stage-specific advice

- [x] T019 [S] [US1] Implement periodic monitoring with event emitter [B:T018]
  - Add `startMonitoring()` method with interval
  - Add `stopMonitoring()` method
  - Emit events: 'healthy', 'warning', 'critical', 'handoff-recommended'
  - Store status history

- [x] T020 [S] [US1] Write unit tests for ContextHealthMonitor [B:T019]
  - Test analyzeContext accuracy
  - Test threshold detection
  - Test event emission
  - Test start/stop monitoring
  - Target: 90% coverage

### Context Usage Logger

- [x] T021 [S] [US1] Create ContextUsageLogger class [B:T015]
  - File: `extension/src/autonomous/ContextUsageLogger.ts`
  - Follow UsageLogger pattern from council/
  - Accept log path in constructor

- [x] T022 [P] [US1] Implement JSONL append to context-usage.jsonl [B:T021]
  - Path: `.specify/logs/context-usage.jsonl`
  - Ensure directory exists
  - Append single line per log entry

- [x] T023 [P] [US1] Add log entry structure with breakdown fields [B:T021]
  - Implement `ContextUsageLogEntry` interface
  - Include all fields from data-model.md
  - Add `log()`, `logHealthCheck()`, `logMaskingEvent()` methods

- [x] T024 [S] [US1] Write unit tests for logger [B:T022,T023]
  - Test JSONL format correctness
  - Test file creation
  - Test append behavior
  - Test all log methods

### VSCode Status Bar Integration

- [x] T025 [S] [US1] Create status bar item for context health [B:T019]
  - File: `extension/src/ui/ContextHealthStatusBar.ts`
  - Create StatusBarItem with alignment left
  - Register with ExtensionContext

- [x] T026 [P] [US1] Implement color-coded status display [B:T025]
  - Green (ThemeColor) for healthy
  - Yellow (ThemeColor) for warning
  - Red (ThemeColor) for critical
  - Format: "$(check) Context: 45%" or "$(warning) Context: 72%"

- [x] T027 [P] [US1] Add click handler to show detailed breakdown [B:T025]
  - Show QuickPick with breakdown categories
  - Display all breakdown categories with progress bars
  - Show recommendations and actions

- [x] T028 [S] [US1] Register status bar in extension activation [B:T026,T027]
  - Connects to ContextHealthMonitor via connect() method
  - Updates display on health events (healthy, warning, critical)
  - Includes show(), hide(), dispose() methods

- [x] T029 [S] [US1] Write UI integration tests [B:T028]
  - Test status bar creation (24 tests)
  - Test color updates
  - Test click handler
  - Test monitor connection

### Auto-Handoff Trigger

- [x] T030 [S] [US1] Implement auto-handoff trigger at critical threshold
      [B:T019,T021]
  - File: `extension/src/autonomous/AutoHandoffTrigger.ts`
  - Listens for 'critical' and 'handoff-recommended' events
  - Configurable enabled/disabled and cooldown settings
  - Generates session-handoff.md content with full breakdown

- [x] T031 [S] [US1] Show notification with handoff recommendation [B:T030]
  - Uses vscode.window.showWarningMessage
  - Includes "Save & Continue Later", "Dismiss", "Remind in 10 min" actions
  - Respects notification cooldown period

- [x] T032 [S] [US1] Integrate with /7_gofer_save command [B:T031]
  - Calls gofer.saveProgress command programmatically
  - Passes handoff document content, health status, and reason
  - Shows success/error messages to user

- [x] T033 [S] [US1] Write unit tests for auto-handoff flow [B:T032]
  - File: `tests/unit/autonomous/AutoHandoffTrigger.test.ts`
  - 34 tests covering configuration, notifications, save integration
  - Tests handoff document generation, session context, cooldowns

**Phase 2 Verification Checklist**:

- [x] Status bar displays accurate context health
- [x] Warning notification at 50% threshold
- [x] Auto-handoff trigger at 70% threshold
- [x] JSONL logging captures all health checks
- [x] All tests pass with 90%+ coverage

---

## Phase 3: Stage-Aware Context Profiles

**Goal**: Implement stage-specific context budget allocation **User Stories**:
US5 (Stage-Aware Context Profiles) **Estimated Effort**: Week 2

### Stage Profile Configuration

- [x] T034 [S] [US5] Create context-profiles.yaml template [B:T014]
  - File: `.specify/memory/context-profiles.yaml`
  - Include all 6 stage profiles per plan.md
  - Add version field for migrations
  - Add descriptions for each profile

- [x] T035 [S] [US5] Create StageContextProfile TypeScript interface [B:T034]
  - File: `extension/src/autonomous/StageContextProfile.ts`
  - Create `StageContextProfile` interface
  - Create `StageContextProfileConfig` interface
  - Export GoferStage type union
  - Added DEFAULT_PROFILES, validateProfile(), calculateBudgetSummary()

- [x] T036 [S] [US5] Implement YAML config loader with validation [B:T035]
  - File: `extension/src/autonomous/StageContextProfileLoader.ts`
  - Add `loadProfiles(): Promise<ProfileLoadResult>`
  - Add `getProfile(stage: GoferStage)` method
  - Add `getDefaultProfile()` method
  - Validate budget fractions sum to ≤1.0

- [x] T037 [S] [US5] Write unit tests for config loading [B:T036]
  - File: `tests/unit/autonomous/StageContextProfile.test.ts`
  - 37 tests covering YAML parsing, validation, defaults, caching
  - Test YAML parsing
  - Test validation errors
  - Test default values
  - Test profile retrieval

### ContextBuilder Integration

- [x] T038 [S] [US5] Add currentStage property to ContextBuilder [B:T036]
  - Add `setCurrentStage(stage: GoferStage)` method
  - Store current stage in instance
  - Default to 'implement'

- [x] T039 [S] [US5] Load stage profile at context build time [B:T038]
  - Get profile for current stage
  - Apply budget limits during context merge
  - Pass profile to sub-operations
  - Include stage and budgetUsage in BuiltContext result

- [x] T040 [S] [US5] Implement budget enforcement with warnings [B:T039]
  - Track token usage per category (research, memory, code, conversation)
  - Compare against profile budgets
  - Emit 'budget-warning' events when exceeded
  - calculateBudgetUsage() method with BudgetUsage result

- [x] T041 [S] [US5] Add profile switching on stage transition [B:T040]
  - Listen for stage change events
  - Load new profile automatically via profileLoader
  - Reconfigure ObservationMasker window on stage change
  - Emit 'stage-change' event with previous/new stage

- [x] T042 [S] [US5] Write integration tests for stage profiles [B:T041]
  - 14 new tests in tests/unit/autonomous/ContextBuilder.test.ts
  - Test profile loading per stage
  - Test budget warnings
  - Test stage transitions
  - Test observation window changes

**Phase 3 Verification Checklist**:

- [x] Stage profiles load correctly from YAML
- [x] Budget warnings appear when exceeded
- [x] Profile switching works at stage transitions
- [x] All tests pass (29 ContextBuilder tests, 37 StageContextProfile tests)

---

## Phase 4: Memory-First Loading

**Goal**: Load memories before research documents for better relevance **User
Stories**: US4 (Memory-First Loading) **Estimated Effort**: Week 2

### MemoryManager Enhancements

- [x] T043 [S] [US4] Add priority-based sorting to search() results [B:T014]
  - File: `extension/src/autonomous/MemoryManager.ts`
  - Sort by priority descending
  - Secondary sort by relevance score
  - Preserve existing search functionality

- [x] T044 [S] [US4] Implement loadByPriority() method [B:T043]
  - Add `loadByPriority(limit?: number): Promise<AgenticMemory[]>`
  - Return top N memories by priority
  - Cache results for session

- [x] T045 [S] [US4] Add relevance scoring for task context [B:T044]
  - Score memories against current task description
  - Use keyword matching and semantic similarity
  - Boost recently accessed memories

- [x] T046 [S] [US4] Write unit tests for priority loading [B:T045]
  - Test priority ordering
  - Test limit parameter
  - Test relevance scoring
  - Test caching behavior

### ContextBuilder Loading Order

- [x] T047 [S] [US4] Load memories before research in buildContext()
      [B:T046,T036]
  - Modify build order: memories → research → code
  - Track memory coverage
  - Log memory-first vs research-fallback

- [x] T048 [S] [US4] Track memory coverage vs research gaps [B:T047]
  - Calculate what memories cover
  - Identify topic gaps
  - Flag areas needing research

- [x] T049 [S] [US4] Implement lazy research loading for gaps [B:T048]
  - Only load research if gaps identified
  - Load relevant chunks (Phase 5 integration)
  - Log research loading decisions

- [x] T050 [S] [US4] Write integration tests for loading order [B:T049]
  - Test memories loaded first
  - Test research loaded for gaps
  - Verify 40% reduction in average context usage
  - Test no regression

**Phase 4 Verification Checklist**:

- [x] Memories loaded first in context
- [x] Research loaded only for gaps
- [x] 40% reduction in average context usage (via lazy loading when coverage >=
      30%)
- [x] All tests pass (41 ContextBuilder tests, 61 MemoryManager tests)

---

## Phase 5: Research Document Chunking

**Goal**: Split research documents for on-demand loading **User Stories**: US3
(Research Document Optimization) **Estimated Effort**: Week 3

### ResearchChunker Module

- [x] T051 [S] [US3] Create ResearchChunker class skeleton [B:T014]
  - File: `extension/src/autonomous/ResearchChunker.ts`
  - Create `ResearchChunk` interface per data-model.md
  - Create `ResearchIndex` interface
  - Create `ResearchChunkerOptions` interface

- [x] T052 [S] [US3] Implement semantic chunking by markdown sections [B:T051]
  - Parse markdown headings (H1-H6)
  - Create chunk per section
  - Calculate token estimates
  - Handle nested headings

- [x] T053 [S] [US3] Implement index generation [B:T052]
  - Create `indexResearchFile(path): Promise<ResearchIndex>`
  - Extract chunk summaries with keywords
  - Calculate total tokens
  - Cache index per spec

- [x] T054 [S] [US3] Implement on-demand chunk loading [B:T053]
  - Add `getChunk(specId, chunkId): ResearchChunk`
  - Add `loadChunksForTask(specId, taskContext): ResearchChunk[]`
  - Implement relevance scoring

- [x] T055 [S] [US3] Write unit tests for chunker [B:T054]
  - Test markdown parsing
  - Test chunk boundary detection
  - Test index generation
  - Test relevance scoring
  - Target: 90% coverage

### MCP Tools for Chunk Loading

- [x] T056 [S] [US3] Add `gofer_get_research_index` MCP tool [B:T053]
  - File: `language-server/src/mcp/toolHandler.ts`
  - Define input schema per contracts/mcp-tools.md
  - Return index with chunk summaries

- [x] T057 [S] [US3] Add `gofer_load_research_chunk` MCP tool [B:T056]
  - Accept specId and chunkId
  - Return full chunk content
  - Handle not-found errors

- [x] T058 [S] [US3] Write integration tests for chunk loading tools [B:T057]
  - Test index retrieval
  - Test chunk loading
  - Test error handling
  - Test path traversal prevention

### ContextBuilder Integration

- [x] T059 [S] [US3] Load research index instead of full document [B:T057,T049]
  - Modify research loading in ContextBuilder
  - Load index by default
  - Include index in context

- [x] T060 [S] [US3] Implement relevance scoring for chunks [B:T059]
  - Score chunks against current task
  - Use keyword matching from index
  - Consider stage-specific relevance

- [x] T061 [S] [US3] Load top-N chunks based on task context [B:T060]
  - Determine N from stage profile budget
  - Load highest-scoring chunks
  - Log chunk loading decisions

- [x] T062 [S] [US3] Write integration tests for chunked loading [B:T061]
  - Test index-only loading
  - Test chunk selection
  - Verify 60% reduction in research context
  - Test full workflow

**Phase 5 Verification Checklist**:

- [x] Research index loads instead of full document
- [x] Chunks loaded on-demand
- [x] 60% reduction in research context usage
- [x] All tests pass (46 ResearchChunker unit tests, 15 integration tests, 51
      ContextBuilder tests)

---

## Phase 6: Telemetry and Observability

**Goal**: Add comprehensive tracking for context management **User Stories**:
Cross-cutting observability **Estimated Effort**: Week 3

### TelemetryIntegration Extensions

- [x] T063 [P] [Cross] Add trackContextHealthCheck() method [B:T020]
  - File: `extension/src/autonomous/telemetryIntegration.ts`
  - Track health check events
  - Include status, utilization, recommendations, stage

- [x] T064 [P] [Cross] Add trackObservationMasked() method [B:T007]
  - Track masking events
  - Include maskedCount, tokensSaved, types, currentTurn, ageThreshold

- [x] T065 [P] [Cross] Add trackStageProfileSwitch() method [B:T042]
  - Track stage transitions
  - Include fromStage, toStage, budget changes (research, memory, code),
    observationWindowChange

- [x] T066 [P] [Cross] Add trackMemoryFirstHit() method [B:T046]
  - Track memory-first success rate
  - Include memoriesLoaded, memoriesConsidered, coveragePercent,
    researchLoadedForGaps, gapCount, loadTime

- [x] T067 [S] [Cross] Write unit tests for telemetry methods [B:T063-T066]
  - File: `tests/unit/autonomous/telemetryIntegration.test.ts`
  - 17 tests covering all four new telemetry methods
  - Tests for privacy compliance (no PII in events)
  - Tests for all Gofer stages

### Dashboard Integration

- [x] T068 [S] [Cross] Add context health section to dashboard [B:T067]
  - File: `extension/src/ui/ContextHealthStatusBar.ts`
  - Added MaskingStatistics and StageProfileUsage interfaces
  - Enhanced buildQuickPickItems() to display masking and stage profile sections
  - Added update methods for masking stats and stage profile usage

- [x] T069 [P] [Cross] Display masking statistics [B:T068]
  - buildMaskingStatsItems() shows masked observations with percentage
  - Shows tokens saved with localized formatting
  - Shows expansion requests (when non-zero)

- [x] T070 [P] [Cross] Display stage profile usage [B:T068]
  - buildStageProfileItems() shows current stage with icon
  - Shows budget utilization for research, memory, code, conversation
  - Shows recent stage history (last 3 stages)

- [x] T071 [S] [Cross] Write UI tests for dashboard [B:T069,T070]
  - File: `tests/unit/ui/ContextHealthStatusBar.test.ts`
  - 23 new tests for masking stats and stage profile display
  - Tests for combined dashboard display
  - Tests for all 6 Gofer stages

**Phase 6 Verification Checklist**:

- [x] All context operations tracked (4 new telemetry methods)
- [x] Dashboard displays accurate metrics (masking stats, stage profiles)
- [x] All tests pass (57 tests: 17 telemetry + 40 status bar)

---

## Phase 7: Integration Testing and Polish

**Goal**: Ensure all components work together seamlessly **User Stories**: All
**Estimated Effort**: Week 4

### End-to-End Testing

- [x] T072 [S] [E2E] Test full Gofer pipeline with context management
      [B:T062,T067,T071]
  - File:
    `tests/integration/autonomous/ContextManagementPipeline.integration.test.ts`
  - 6 tests for full pipeline stage transitions
  - Tests context health, budget compliance, stage profiles
  - Verified no degradation across stages

- [x] T073 [P] [E2E] Test observation masking across multiple stages [B:T072]
  - 4 tests for observation masking behavior
  - Tests masking in research and implement stages
  - Tests preservation of recent observations
  - Tests observation expansion via MCP tool

- [x] T074 [P] [E2E] Test auto-handoff trigger flow [B:T072]
  - 4 tests for auto-handoff mechanism
  - Tests critical threshold triggering
  - Tests warning→critical status progression
  - Tests recommendation generation

- [x] T075 [P] [E2E] Test memory-first loading with research fallback [B:T072]
  - 4 tests for memory-first loading
  - Tests memory coverage calculation
  - Tests research fallback for gaps
  - Tests priority-based memory loading

### Performance Validation

- [x] T076 [P] [Perf] Validate observation masking <10ms [B:T072]
  - File: `tests/integration/autonomous/ContextPerformance.integration.test.ts`
  - 100 observations masked in <10ms
  - 500 observations masked in <20ms
  - Observation tracking <1ms each

- [x] T077 [P] [Perf] Validate health check <50ms [B:T072]
  - Health analysis completes in <50ms
  - 100 consecutive checks: <5ms average
  - Token estimation: 1000 iterations in <50ms

- [x] T078 [P] [Perf] Validate memory loading <200ms [B:T072]
  - loadByPriority() completes in <200ms
  - Memory search completes in <100ms
  - Single memory retrieval in <20ms

- [x] T079 [S] [Perf] Validate overall context reduction ≥40% [B:T076-T078]
  - Observation masking: 90% reduction (50 observations, window of 5)
  - Research chunking: 80% reduction (2 of 10 sections)
  - Combined workflow meets 40% reduction target

### Documentation

- [x] T080 [P] [Docs] Update CLAUDE.md with context management features [B:T079]
  - Enhanced observation masking section with stage-specific windows
  - Added stage-aware context profiles with budget allocations
  - Added memory-first loading documentation
  - Added auto-handoff triggering section
  - Added VSCode status bar integration documentation

- [x] T081 [P] [Docs] Add context management section to README [B:T079]
  - File: `README.md`
  - Added "Context Health Management" section under Features
  - Key features table: Health Monitoring, Observation Masking, Stage Profiles,
    Memory-First Loading, Auto-Handoff, Status Bar
  - Configuration options with context-profiles.yaml example
  - Links to CLAUDE.md for detailed documentation

- [x] T082 [S] [Docs] Document MCP tools in API reference [B:T081]
  - File: `docs/memory-learning-system.md`
  - Documented gofer_expand_observation with parameters, response, examples,
    error codes
  - Documented gofer_get_context_health with thresholds table and breakdown
    structure
  - Documented gofer_get_research_index with chunk metadata format
  - Documented gofer_load_research_chunk with best practices
  - Documented gofer_trigger_handoff with handoff reasons and preserved state

**Phase 7 Verification Checklist**:

- [x] All E2E tests pass (35 new integration tests: 18 pipeline + 17
      performance)
- [x] Performance requirements met (masking <10ms, health <50ms, memory <200ms)
- [x] Documentation complete (CLAUDE.md, README.md,
      docs/memory-learning-system.md)
- [x] No regression in existing functionality (1333 tests pass)

---

## Task Dependencies Graph

```
Phase 1 (Observation Masking):
T001 ─┬─> T002 ─┬─> T004 ─> T005 ─> T006 ─┬─> T007
      ├─> T003 ─┘                         ├─> T008 ─> T009 ─> T010
      └─────────────────────────────────> └─> T011 ─> T012 ─> T013 ─> T014

Phase 2 (Context Health):
T014 ─> T015 ─┬─> T016 ─┬─> T018 ─> T019 ─> T020
              ├─> T017 ─┘           │
              └─> T021 ─┬─> T022    ├─> T025 ─┬─> T026 ─┬─> T028 ─> T029
                        ├─> T023    │         └─> T027 ─┘
                        └─> T024    └─> T030 ─> T031 ─> T032 ─> T033

Phase 3 (Stage Profiles):
T014 ─> T034 ─> T035 ─> T036 ─> T037 ─> T038 ─> T039 ─> T040 ─> T041 ─> T042

Phase 4 (Memory-First):
T014 ─> T043 ─> T044 ─> T045 ─> T046 ─> T047 ─> T048 ─> T049 ─> T050
                                        └─────────────────────────────┘ (T036)

Phase 5 (Research Chunking):
T014 ─> T051 ─> T052 ─> T053 ─> T054 ─> T055 ─> T056 ─> T057 ─> T058 ─> T059 ─> T060 ─> T061 ─> T062
                                                        └─────────────────────────────────────────┘ (T049)

Phase 6 (Telemetry):
T020 ─> T063 ─┐
T007 ─> T064 ─┼─> T067 ─> T068 ─┬─> T069 ─┬─> T071
T042 ─> T065 ─┤           │     └─> T070 ─┘
T046 ─> T066 ─┘

Phase 7 (Integration):
T062,T067,T071 ─> T072 ─┬─> T073 ─┬─> T076 ─┬─> T079 ─┬─> T080 ─┬─> T082
                        ├─> T074 ─┼─> T077 ─┤         └─> T081 ─┘
                        └─> T075 ─┴─> T078 ─┘
```

---

## Parallel Execution Opportunities

The following tasks can be executed in parallel within their phases:

**Phase 1**:

- T002, T003, T006 (after T001)

**Phase 2**:

- T016, T017 (after T015)
- T022, T023 (after T021)
- T026, T027 (after T025)

**Phase 5**:

- None - mostly sequential

**Phase 6**:

- T063, T064, T065, T066 (after respective dependencies)
- T069, T070 (after T068)

**Phase 7**:

- T073, T074, T075 (after T072)
- T076, T077, T078 (after T072)
- T080, T081 (after T079)

---

## Estimated Timeline

| Phase     | Tasks        | Estimated Duration |
| --------- | ------------ | ------------------ |
| Phase 1   | T001-T014    | 5 days             |
| Phase 2   | T015-T033    | 7 days             |
| Phase 3   | T034-T042    | 4 days             |
| Phase 4   | T043-T050    | 4 days             |
| Phase 5   | T051-T062    | 6 days             |
| Phase 6   | T063-T071    | 4 days             |
| Phase 7   | T072-T082    | 5 days             |
| **Total** | **82 tasks** | **~5 weeks**       |

---

## Risk Mitigation

| Risk                   | Mitigation Tasks                                |
| ---------------------- | ----------------------------------------------- |
| Performance regression | T076-T079 (performance validation)              |
| Information loss       | T005 (preserve metadata), T009 (expansion tool) |
| Breaking changes       | T014, T042, T050, T062 (integration tests)      |
| Memory leaks           | T006 (cache management), T046 (cache limits)    |
