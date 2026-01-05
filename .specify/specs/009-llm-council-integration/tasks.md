# Tasks: LLM Council Integration

**Input**: Design documents from `/specs/009-llm-council-integration/`
**Prerequisites**: plan.md (required), spec.md (required), research.md,
data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

**TDD Compliance**: Per Constitution Principle I, test tasks precede their
corresponding implementation tasks within each phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **VSCode Extension**: `extension/src/` for source, `tests/unit/` for tests
- **Config files**: `.specify/memory/` for project config

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and basic structure

- [x] T001 Install new dependencies: `@google/generative-ai` and `openai` in
      extension/package.json
- [x] T002 [P] Create council module directory structure at
      extension/src/council/
- [x] T003 [P] Create types.ts with all interfaces from data-model.md at
      extension/src/council/types.ts
- [x] T004 [P] Create providers subdirectory at extension/src/council/providers/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can
be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create LLMProvider interface in
      extension/src/council/providers/LLMProvider.ts
- [x] T006 Create ProviderFactory in
      extension/src/council/providers/ProviderFactory.ts
- [x] T007 Create ProviderError class in
      extension/src/council/providers/ProviderError.ts

### Test First (TDD)

- [x] T008 [P] Create unit test for ConfigLoader in
      tests/unit/council/ConfigLoader.test.ts

### Implementation

- [x] T009 [P] Create ConfigLoader for YAML parsing in
      extension/src/council/ConfigLoader.ts
- [x] T010 [P] Create default council-config.yaml template at
      .specify/templates/council-config.yaml

**Checkpoint**: Foundation ready - user story implementation can now begin in
parallel

---

## Phase 3: User Story 1 - Configure AI Providers (Priority: P1) 🎯 MVP

**Goal**: Allow users to configure credentials for multiple AI providers in
editor settings

**Independent Test**: Add credentials in VSCode settings, verify they are
validated and stored securely, see provider availability summary in SpecGofer
panel

### Settings Configuration

- [x] T011 [US1] Add googleApiKey setting in extension/package.json
- [x] T012 [P] [US1] Add xaiApiKey setting in extension/package.json
- [x] T013 [P] [US1] Add openaiApiKey setting in extension/package.json
- [x] T014 [US1] Add API key getters to ConfigManager in extension/src/config.ts

### Test First (TDD) - Provider Implementations

- [x] T015 [P] [US1] Create unit test for AnthropicProvider in
      tests/unit/council/providers/AnthropicProvider.test.ts
- [x] T016 [P] [US1] Create unit test for GoogleProvider in
      tests/unit/council/providers/GoogleProvider.test.ts
- [x] T017 [P] [US1] Create unit test for XAIProvider in
      tests/unit/council/providers/XAIProvider.test.ts
- [x] T018 [P] [US1] Create unit test for OpenAIProvider in
      tests/unit/council/providers/OpenAIProvider.test.ts

### Implementation - Providers

- [x] T019 [P] [US1] Implement AnthropicProvider class in
      extension/src/council/providers/AnthropicProvider.ts
- [x] T020 [P] [US1] Implement GoogleProvider class in
      extension/src/council/providers/GoogleProvider.ts
- [x] T021 [P] [US1] Implement XAIProvider class in
      extension/src/council/providers/XAIProvider.ts
- [x] T022 [P] [US1] Implement OpenAIProvider class in
      extension/src/council/providers/OpenAIProvider.ts

### Provider Validation & Commands

- [x] T023 [US1] Add healthCheck() implementation to all providers for
      credential validation
- [x] T024 [US1] Create provider status display command showing available
      providers in extension/src/commands/councilStatus.ts
- [x] T025 [US1] Register councilStatus command in extension/src/extension.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - users
can configure providers and see which are available

---

## Phase 4: User Story 2 - Multi-Provider Parallel Agent Execution (Priority: P1)

**Goal**: Each parallel agent executes across all configured AI providers
simultaneously

**Independent Test**: Run a planning workflow with multiple providers
configured, observe each agent queries all providers in parallel, verify
progress indicators show requests to each provider

### Test First (TDD)

- [x] T026 [US2] Create unit test for ResponseAggregator in
      tests/unit/council/ResponseAggregator.test.ts
- [x] T027 [US2] Create unit test for CouncilOrchestrator in
      tests/unit/council/CouncilOrchestrator.test.ts

### Implementation - ResponseAggregator

- [x] T028 [US2] Create ResponseAggregator in
      extension/src/council/ResponseAggregator.ts
- [x] T029 [US2] Implement collectResponses() with Promise.allSettled for
      parallel execution
- [x] T030 [US2] Implement anonymize() to convert responses to Member A, B, C
      format
- [x] T031 [US2] Implement validateQuorum() to check minimum provider responses
- [x] T032 [US2] Add timeout handling with Promise.race wrapper

### Implementation - CouncilOrchestrator

- [x] T033 [US2] Create CouncilOrchestrator skeleton in
      extension/src/council/CouncilOrchestrator.ts
- [x] T034 [US2] Implement dispatch() for multi-provider execution flow
- [x] T035 [US2] Add VSCode progress reporting with vscode.window.withProgress
- [x] T036 [US2] Implement graceful degradation (fallback to single provider on
      quorum failure)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - providers
are configured and can execute in parallel

---

## Phase 5: User Story 3 - Chairman Synthesis (Priority: P1)

**Goal**: Requesting AI synthesizes all council responses into unified output

**Independent Test**: Run council-enabled workflow, verify Chairman produces
single synthesized document that incorporates insights from all council members

### Implementation for User Story 3

- [x] T037 [US3] Create buildSynthesisPrompt() function in
      extension/src/council/synthesis.ts
- [x] T038 [US3] Implement conflict detection in synthesized responses
- [x] T039 [US3] Implement consensus point extraction
- [x] T040 [US3] Ensure synthesis output matches single-provider format for
      backward compatibility
- [x] T041 [US3] Integrate synthesis step into CouncilOrchestrator.dispatch()
- [x] T042 [US3] Add synthesis logging for debugging

**Checkpoint**: MVP Complete - Full council workflow functional with synthesis

---

## Phase 6: User Story 4 - Optional Peer Review Stage (Priority: P2)

**Goal**: Optional stage where each AI evaluates and ranks other AIs' responses

**Independent Test**: Enable peer review in configuration, run council workflow,
verify each AI provides rankings of other responses

### Implementation for User Story 4

- [x] T043 [US4] Create buildPeerReviewPrompt() function in
      extension/src/council/peerReview.ts
- [x] T044 [US4] Implement parsePeerReview() to extract rankings from responses
- [x] T045 [US4] Add collectPeerReviews() to ResponseAggregator
- [x] T046 [US4] Create QualitySignals calculation from peer rankings
- [x] T047 [US4] Integrate peer review stage into CouncilOrchestrator
      (conditional on config)
- [x] T048 [US4] Update buildSynthesisPrompt() to include peer review rankings
      when available

**Checkpoint**: Peer review stage functional and optional

---

## Phase 7: User Story 5 - Council Configuration (Priority: P2)

**Goal**: Configure which workflow stages use council mode via configuration
file

**Independent Test**: Create council configuration file, verify specified stages
use council while others use single-provider mode

### Implementation for User Story 5

- [x] T049 [US5] Implement loadConfig() in ConfigLoader to parse
      council-config.yaml
- [x] T050 [US5] Add shouldUseCouncil(stage) method to CouncilOrchestrator
- [x] T051 [US5] Implement default config when no file exists
- [x] T052 [US5] Add config validation with fallback to defaults on malformed
      YAML
- [x] T053 [US5] Create sample council-config.yaml in
      .specify/memory/council-config.yaml
- [x] T054 [US5] Add config reload on file change with
      vscode.workspace.createFileSystemWatcher

**Checkpoint**: Per-stage council configuration working

---

## Phase 8: User Story 6 - Cost and Usage Visibility (Priority: P3)

**Goal**: Show estimated and actual costs for council operations

**Independent Test**: Run council workflows, verify cost estimates shown before
execution, actual usage logged after completion

### Implementation for User Story 6

- [x] T055 [US6] Create UsageLogger in extension/src/council/UsageLogger.ts
- [x] T056 [US6] Implement appendUsageLog() for writing to
      .specify/logs/council-usage.jsonl
- [x] T057 [US6] Add estimateUsage() to calculate expected cost before execution
- [x] T058 [US6] Display usage estimate in progress notification before council
      runs
- [x] T059 [US6] Create getUsageSummary() for historical usage breakdown
- [x] T060 [US6] Add usage summary to council status command output

**Checkpoint**: All user stories functional with cost visibility

---

## Phase 9: Integration & Workflow Hooks

**Purpose**: Connect council to existing SpecKit and RPI workflows

- [x] T061 Integrate CouncilOrchestrator into /speckit.plan Phase 0.5 in
      .claude/commands/speckit.plan.md
- [x] T062 Integrate CouncilOrchestrator into /speckit.analyze in
      .claude/commands/speckit.analyze.md
- [x] T063 Integrate CouncilOrchestrator into /1_research_codebase in
      .claude/commands/1_research_codebase.md
- [x] T064 Integrate CouncilOrchestrator into /3_validate_plan in
      .claude/commands/3_validate_plan.md
- [x] T065 Update parallel agent definitions to support council dispatch

---

## Phase 10: Polish & Documentation

**Purpose**: Documentation and final validation

- [x] T066 Update CLAUDE.md with council commands and configuration
      documentation
- [x] T067 Add council feature to extension README
- [x] T068 Run all tests and verify 80%+ coverage for new code

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user
  stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (P1): Can start after Foundational
  - US2 (P1): Can start after US1 (needs providers)
  - US3 (P1): Can start after US2 (needs aggregation)
  - US4 (P2): Can start after US3 (extends synthesis)
  - US5 (P2): Can start after Foundational (parallel to US1-4)
  - US6 (P3): Can start after US3 (needs complete flow)
- **Integration (Phase 9)**: Depends on US1-US3 (core council flow)
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

```
Foundational (Phase 2)
        │
        ├─────────────────────────┐
        │                         │
        ▼                         ▼
   US1: Configure Providers   US5: Council Config (parallel)
        │
        ▼
   US2: Multi-Provider Execution
        │
        ▼
   US3: Chairman Synthesis ──────► Integration (Phase 9)
        │
        ├──────────┐
        ▼          ▼
   US4: Peer     US6: Cost
   Review        Visibility
```

### TDD Within Each Phase

Per Constitution Principle I (Test-Driven Development):

1. Write test skeleton first (Red)
2. Implement minimum code to pass (Green)
3. Refactor if needed

Test tasks are marked and grouped before their corresponding implementations.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Provider test tasks (T015-T018) can all run in parallel
- Provider implementations (T019-T022) can all run in parallel (after tests)

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Configure Providers)
4. Complete Phase 4: User Story 2 (Multi-Provider Execution)
5. Complete Phase 5: User Story 3 (Chairman Synthesis)
6. **STOP and VALIDATE**: Test full council workflow
7. Complete Phase 9: Integration (hook into workflows)
8. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Providers configurable (MVP-1)
3. Add User Story 2 → Test independently → Parallel execution works (MVP-2)
4. Add User Story 3 → Test independently → Full council workflow (MVP!)
5. Add User Story 4 → Optional peer review stage
6. Add User Story 5 → Per-stage configuration
7. Add User Story 6 → Cost visibility

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US1-US3 are all P1 priority and form the MVP
- US4-US6 are enhancements that can be added incrementally
- **TDD**: Test tasks precede implementations per Constitution Principle I
