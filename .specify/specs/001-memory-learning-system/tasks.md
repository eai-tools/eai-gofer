# Tasks: Memory and Learning System

**Feature Branch**: `001-memory-learning-system` **Input**: Design documents
from `.specify/specs/001-memory-learning-system/` **Prerequisites**: plan.md,
spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story (P1-P4) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Install dependencies: graphlib, fast-glob, ajv, @types/graphlib in
      extension/package.json
- [x] T002 [P] Create directory structure: extension/src/autonomous/,
      extension/src/commands/, extension/src/ui/
- [x] T003 [P] Create test directories: tests/unit/autonomous/,
      tests/integration/, tests/e2e/
- [x] T004 [P] Create storage directories: .specify/memory/, .specify/hints/,
      .specify/state/sessions/
- [x] T005 Copy TypeScript interface contracts from
      .specify/specs/001-memory-learning-system/contracts/ to
      extension/src/autonomous/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can
be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create base Memory interface types in
      extension/src/autonomous/memory.ts (from contracts/memory.ts)
- [x] T007 [P] Create base HintFile interface types in
      extension/src/autonomous/hints.ts (from contracts/hints.ts)
- [x] T008 [P] Create base SpecDependency interface types in
      extension/src/autonomous/dependencies.ts (from contracts/dependencies.ts)
- [x] T009 [P] Create base CompactionSummary interface types in
      extension/src/autonomous/compaction.ts (from contracts/compaction.ts)
- [x] T010 Create shared validation utilities in
      extension/src/autonomous/validation.ts (UUID validation, schema
      validation)
- [x] T011 Setup ajv JSON schema validator configuration in
      extension/src/autonomous/schemaValidator.ts
- [x] T012 Create example hint files: .specify/hints/global.md,
      .specify/hints/README.md

**Checkpoint**: Foundation ready - user story implementation can now begin in
parallel

---

## Phase 3: User Story 1 - Persistent Memory Across Sessions (Priority: P1) 🎯 MVP

**Goal**: Enable SpecGofer to remember project preferences and coding standards
across sessions, eliminating repetitive explanations

**Independent Test**: Save memory "Remember that we use Vitest for all tests",
close VSCode, reopen, verify memory applied in new autonomous execution without
reminder

### Implementation for User Story 1

#### Step 1: MemoryManager Core (Week 1)

- [x] T013 [P] [US1] Create MemoryManager class skeleton in
      extension/src/autonomous/MemoryManager.ts implementing MemoryManager
      interface
- [x] T014 [P] [US1] Write unit test for Memory validation in
      tests/unit/autonomous/MemoryManager.test.ts (UUID format, category length,
      content length, tag format)
- [x] T015 [US1] Implement validate() method in
      extension/src/autonomous/MemoryManager.ts
- [x] T016 [US1] Write unit test for save() method creating local memory in
      tests/unit/autonomous/MemoryManager.test.ts
- [x] T017 [US1] Implement save() method for local scope in
      extension/src/autonomous/MemoryManager.ts (generate UUID, timestamp, write
      to .specify/memory/local.json)
- [x] T018 [US1] Write unit test for save() method creating global memory in
      tests/unit/autonomous/MemoryManager.test.ts
- [x] T019 [US1] Implement save() method for global scope in
      extension/src/autonomous/MemoryManager.ts (use VSCode globalState API)
- [x] T020 [US1] Write unit test for load() method in
      tests/unit/autonomous/MemoryManager.test.ts (local, global, both scopes)
- [x] T021 [US1] Implement load() method in
      extension/src/autonomous/MemoryManager.ts (read from local.json and
      globalState)

#### Step 2: Memory Search & Query (Week 1-2)

- [x] T022 [US1] Write unit test for search() keyword matching in
      tests/unit/autonomous/MemoryManager.test.ts
- [x] T023 [US1] Implement search() keyword matching in
      extension/src/autonomous/MemoryManager.ts (case-insensitive content +
      category search)
- [x] T024 [US1] Write unit test for search() tag filtering in
      tests/unit/autonomous/MemoryManager.test.ts
- [x] T025 [US1] Implement search() tag filtering in
      extension/src/autonomous/MemoryManager.ts
- [x] T026 [US1] Write unit test for search() date range filtering in
      tests/unit/autonomous/MemoryManager.test.ts
- [x] T027 [US1] Implement search() date range filtering and performance
      optimization in extension/src/autonomous/MemoryManager.ts
- [x] T028 [US1] Write unit test for recordUsage() updating lastUsed and
      usedCount in tests/unit/autonomous/MemoryManager.test.ts
- [x] T029 [US1] Implement recordUsage() method in
      extension/src/autonomous/MemoryManager.ts

#### Step 3: Memory Deletion & Management (Week 2)

- [x] T030 [US1] Write unit test for forget() method in
      tests/unit/autonomous/MemoryManager.test.ts
- [x] T031 [US1] Implement forget() method in
      extension/src/autonomous/MemoryManager.ts (delete by ID from local or
      global)
- [x] T032 [US1] Write unit test for clear() method in
      tests/unit/autonomous/MemoryManager.test.ts (test local, global, all
      scopes)
- [x] T033 [US1] Implement clear() method in
      extension/src/autonomous/MemoryManager.ts (return count deleted)

#### Step 4: VSCode Commands (Week 2)

- [x] T034 [P] [US1] Create memoryCommands.ts in extension/src/commands/ and
      implement registerMemoryCommands function
- [x] T035 [US1] Implement "SpecGofer: Remember" command in
      extension/src/commands/memoryCommands.ts (prompt for content, scope,
      category, tags)
- [x] T036 [P] [US1] Implement "SpecGofer: Search Memory" command in
      extension/src/commands/memoryCommands.ts (prompt for query, display
      results)
- [x] T037 [P] [US1] Implement "SpecGofer: Forget Memory" command in
      extension/src/commands/memoryCommands.ts (show memory list, delete
      selected)
- [x] T038 [P] [US1] Implement "SpecGofer: Clear Memory" command in
      extension/src/commands/memoryCommands.ts (prompt for scope, confirm
      deletion)

#### Step 5: Extension Integration (Week 2-3)

- [x] T039 [US1] Register memory commands in extension/src/extension.ts
      activate() function
- [x] T040 [US1] Add memory commands to extension/package.json
      contributes.commands section
- [x] T041 [US1] Create MemoryPanel webview UI in
      extension/src/ui/MemoryPanel.ts (searchable list with categories and tags)
- [x] T042 [US1] Register "SpecGofer: View Memories" command to show MemoryPanel
      in extension/src/commands/memoryCommands.ts
- [x] T043 [US1] Update extension/package.json to include webview
      viewsContainers and views

#### Step 6: AutonomousDriver Integration (Week 3)

- [x] T044 [US1] Modify AutonomousDriver in
      extension/src/autonomous/AutonomousDriver.ts to load memories at session
      start
- [x] T045 [US1] Inject loaded memories into LLM context before each task
      execution in extension/src/autonomous/AutonomousDriver.ts
- [x] T046 [US1] Call recordUsage() for each memory used during execution in
      extension/src/autonomous/AutonomousDriver.ts

#### Step 7: Pattern Detection & Auto-Suggest (Week 3)

- [x] T047 [US1] Implement suggestMemory() method in
      extension/src/autonomous/MemoryManager.ts (generates Memory object without
      saving)
- [x] T048 [US1] Add pattern detection logic in
      extension/src/autonomous/AutonomousDriver.ts (track repeated explanations,
      suggest after 3 occurrences)
- [x] T049 [US1] Show VSCode notification with "Would you like me to remember
      this?" when pattern detected in
      extension/src/autonomous/AutonomousDriver.ts

#### Step 8: Testing & Validation (Week 3)

- [x] T050 [US1] Write integration test for memory persistence across VSCode
      restart in tests/integration/memoryIntegration.test.ts
- [x] T051 [US1] Write E2E test for complete Remember→Save→Restart→Verify
      workflow in tests/e2e/memoryPersistence.spec.ts (Playwright)
- [x] T052 [US1] Verify search performance <1s for 1000 memories benchmark test
      in tests/unit/autonomous/MemoryManager.test.ts

**Checkpoint**: User Story 1 complete and independently functional ✅

---

## Phase 4: User Story 2 - Hierarchical Context Hints (Priority: P2)

**Goal**: Provide directory-specific coding standards and patterns so SpecGofer
applies appropriate context based on codebase location

**Independent Test**: Create .specify/hints/api/rest-conventions.md with API
guidelines, run autonomous execution on API spec, verify conventions followed
without explicit mention

### Implementation for User Story 2

#### Step 1: HintLoader Core (Week 4)

- [x] T053 [P] [US2] Create HintLoader class skeleton in
      extension/src/autonomous/HintLoader.ts implementing HintLoader interface
- [x] T054 [P] [US2] Write unit test for loadHintFile() reading markdown file in
      tests/unit/autonomous/HintLoader.test.ts
- [x] T055 [US2] Implement loadHintFile() in
      extension/src/autonomous/HintLoader.ts (read file, parse YAML frontmatter,
      return HintFile)
- [x] T056 [US2] Write unit test for classifyHint() determining scope and
      priority in tests/unit/autonomous/HintLoader.test.ts
- [x] T057 [US2] Implement classifyHint() in
      extension/src/autonomous/HintLoader.ts (global.md=global priority 1,
      directory-level=priority 10)

#### Step 2: Hint Discovery (Week 4)

- [x] T058 [US2] Write unit test for discoverHints() finding all .md files
      recursively in tests/unit/autonomous/HintLoader.test.ts
- [x] T059 [US2] Implement discoverHints() in
      extension/src/autonomous/HintLoader.ts using fast-glob with caching
- [x] T060 [US2] Write unit test for cache invalidation in
      tests/unit/autonomous/HintLoader.test.ts
- [x] T061 [US2] Implement invalidateCache() and setup VSCode FileSystemWatcher
      in extension/src/autonomous/HintLoader.ts

#### Step 3: Hint Loading & Merging (Week 4-5)

- [x] T062 [US2] Write unit test for loadForTask() loading hints based on
      affected files in tests/unit/autonomous/HintLoader.test.ts
- [x] T063 [US2] Implement loadForTask() in
      extension/src/autonomous/HintLoader.ts (discover hints for task
      directories)
- [x] T064 [US2] Write unit test for loadDeclaredHints() loading hints by name
      in tests/unit/autonomous/HintLoader.test.ts
- [x] T065 [US2] Implement loadDeclaredHints() in
      extension/src/autonomous/HintLoader.ts (read spec frontmatter hints field)
- [x] T066 [US2] Write unit test for mergeHints() respecting priority precedence
      in tests/unit/autonomous/HintLoader.test.ts
- [x] T067 [US2] Implement mergeHints() in
      extension/src/autonomous/HintLoader.ts (sort by priority, concatenate with
      separators)

#### Step 4: AutonomousDriver Integration (Week 5)

- [x] T068 [US2] Create ContextBuilder class in
      extension/src/autonomous/ContextBuilder.ts to merge memories + hints +
      task context
- [x] T069 [US2] Modify AutonomousDriver in
      extension/src/autonomous/AutonomousDriver.ts to use HintLoader before task
      execution
- [x] T070 [US2] Inject merged hints into LLM context via ContextBuilder in
      extension/src/autonomous/AutonomousDriver.ts
- [x] T071 [US2] Add hint loading performance monitoring (<500ms requirement) in
      extension/src/autonomous/AutonomousDriver.ts

#### Step 5: Hint Management Command (Week 5)

- [x] T072 [US2] Implement "SpecGofer: Create Hint File" command in
      extension/src/commands/memoryCommands.ts (prompt for location, create
      template)
- [x] T073 [US2] Create hint template with example YAML frontmatter in
      extension/src/templates/hint-template.md
- [x] T074 [US2] Add "SpecGofer: Create Hint File" to extension/package.json
      contributes.commands

#### Step 6: Testing & Validation (Week 5)

- [x] T075 [US2] Write integration test for hint precedence (directory >
      project > global) in tests/integration/hintIntegration.test.ts
- [x] T076 [US2] Write E2E test for hint loading in autonomous execution in
      tests/e2e/hintLoading.spec.ts (Playwright)
- [x] T077 [US2] Verify hint discovery performance <500ms benchmark test in
      tests/unit/autonomous/HintLoader.test.ts

**Checkpoint**: User Story 2 complete and independently functional ✅

---

## Phase 5: User Story 3 - Spec Dependency Tracking (Priority: P3)

**Goal**: Enable SpecGofer to understand dependencies between specs for impact
analysis and intelligent execution ordering

**Independent Test**: Create spec-002 depending on spec-001, modify spec-001,
verify SpecGofer warns "This change may impact spec-002"

### Implementation for User Story 3

#### Step 1: DependencyGraph Core (Week 6)

- [x] T078 [P] [US3] Create DependencyGraph class skeleton in
      extension/src/autonomous/DependencyGraph.ts implementing DependencyGraph
      interface
- [x] T079 [P] [US3] Write unit test for addDependency() adding edge in
      tests/unit/autonomous/DependencyGraph.test.ts
- [x] T080 [US3] Implement addDependency() in
      extension/src/autonomous/DependencyGraph.ts using graphlib
- [x] T081 [US3] Write unit test for addSpec() and removeSpec() in
      tests/unit/autonomous/DependencyGraph.test.ts
- [x] T082 [US3] Implement addSpec() and removeSpec() in
      extension/src/autonomous/DependencyGraph.ts
- [x] T083 [US3] Write unit test for getDependencies() and getDependents() in
      tests/unit/autonomous/DependencyGraph.test.ts
- [x] T084 [US3] Implement getDependencies() and getDependents() in
      extension/src/autonomous/DependencyGraph.ts

#### Step 2: Cycle Detection (Week 6-7)

- [x] T085 [US3] Write unit test for detectCycles() finding circular
      dependencies in tests/unit/autonomous/DependencyGraph.test.ts
- [x] T086 [US3] Implement detectCycles() in
      extension/src/autonomous/DependencyGraph.ts using graphlib
      alg.findCycles()
- [x] T087 [US3] Write unit test for wouldCreateCycle() checking before adding
      edge in tests/unit/autonomous/DependencyGraph.test.ts
- [x] T088 [US3] Implement wouldCreateCycle() in
      extension/src/autonomous/DependencyGraph.ts (temporary add, check cycles,
      rollback)
- [x] T089 [US3] Update addDependency() to throw error if wouldCreateCycle()
      returns true in extension/src/autonomous/DependencyGraph.ts

#### Step 3: Topological Sort & Execution Order (Week 7)

- [x] T090 [US3] Write unit test for getExecutionOrder() returning topologically
      sorted specs in tests/unit/autonomous/DependencyGraph.test.ts
- [x] T091 [US3] Implement getExecutionOrder() in
      extension/src/autonomous/DependencyGraph.ts using graphlib alg.topsort()
- [x] T092 [US3] Write unit test for execution order with complex dependency
      chains (A→B→C, D→B) in tests/unit/autonomous/DependencyGraph.test.ts
- [x] T093 [US3] Add support for partial ordering (execute subset of specs) in
      extension/src/autonomous/DependencyGraph.ts

#### Step 4: Impact Analysis (Week 7-8)

- [x] T094 [US3] Write unit test for getImpactReport() returning direct and
      transitive dependents in tests/unit/autonomous/DependencyGraph.test.ts
- [x] T095 [US3] Implement getImpactReport() in
      extension/src/autonomous/DependencyGraph.ts (traverse graph for
      dependents)
- [x] T096 [US3] Calculate impact score (0-100) based on dependent count in
      extension/src/autonomous/DependencyGraph.ts
- [x] T097 [US3] Add affected files and APIs detection to ImpactReport in
      extension/src/autonomous/DependencyGraph.ts

#### Step 5: Persistence (Week 8)

- [x] T098 [US3] Write unit test for save() serializing graph to JSON in
      tests/unit/autonomous/DependencyGraph.test.ts
- [x] T099 [US3] Implement save() in extension/src/autonomous/DependencyGraph.ts
      (export to .specify/memory/dependency-graph.json)
- [x] T100 [US3] Write unit test for static load() deserializing graph from JSON
      in tests/unit/autonomous/DependencyGraph.test.ts
- [x] T101 [US3] Implement static load() in
      extension/src/autonomous/DependencyGraph.ts (import from JSON, rebuild
      graphlib Graph)
- [x] T102 [US3] Write unit test for validate() checking orphaned edges and
      cycles in tests/unit/autonomous/DependencyGraph.test.ts
- [x] T103 [US3] Implement validate() in
      extension/src/autonomous/DependencyGraph.ts

#### Step 6: Spec Frontmatter Integration (Week 8)

- [x] T104 [US3] Add depends_on field parser to spec loader in
      extension/src/autonomous/SpecLoader.ts
- [x] T105 [US3] Parse depends_on from YAML frontmatter on spec load in
      extension/src/autonomous/SpecLoader.ts
- [x] T106 [US3] Auto-populate DependencyGraph from spec frontmatter on project
      load in extension/src/autonomous/AutonomousDriver.ts
- [x] T107 [US3] Validate that declared dependencies reference existing specs in
      extension/src/autonomous/SpecLoader.ts

#### Step 7: UI Integration - Tree View (Week 9)

- [x] T108 [US3] Create DependencyTreeDecorator in
      extension/src/ui/DependencyTreeDecorator.ts
- [x] T109 [US3] Modify ProgressProvider in extension/src/progressProvider.ts to
      show dependency indicators in tree view
- [x] T110 [US3] Add description field with "→ depends on: spec-001" format to
      TreeItem in extension/src/progressProvider.ts
- [x] T111 [US3] Add tooltip showing full dependency chain to TreeItem in
      extension/src/progressProvider.ts

#### Step 8: UI Integration - Notifications (Week 9)

- [x] T112 [US3] Add file watcher for spec modifications in
      extension/src/extension.ts
- [x] T113 [US3] Show impact notification when modified spec has dependents in
      extension/src/autonomous/AutonomousDriver.ts
- [x] T114 [US3] Format notification with "This change may impact: spec-002,
      spec-003" message in extension/src/autonomous/AutonomousDriver.ts
- [x] T115 [US3] Add "Show Impact Report" button to notification in
      extension/src/autonomous/AutonomousDriver.ts

#### Step 9: Execution Ordering (Week 9)

- [x] T116 [US3] Implement "Execute All Pending Specs" command in
      extension/src/commands/specCommands.ts using getExecutionOrder()
- [x] T117 [US3] Add pre-execution dependency check before autonomous execution
      in extension/src/autonomous/AutonomousDriver.ts
- [x] T118 [US3] Show warning if executing spec with incomplete dependencies in
      extension/src/autonomous/AutonomousDriver.ts
- [x] T119 [US3] Offer to execute dependencies first via notification action in
      extension/src/autonomous/AutonomousDriver.ts

#### Step 10: Testing & Validation (Week 9)

- [x] T120 [US3] Write integration test for complete dependency workflow
      (declare, detect, order) in
      tests/integration/dependencyIntegration.test.ts
- [x] T121 [US3] Write E2E test for impact notification on spec modification in
      tests/e2e/dependencyImpact.spec.ts (Playwright)
- [x] T122 [US3] Verify cycle detection performance <1ms for 100 nodes benchmark
      test in tests/unit/autonomous/DependencyGraph.test.ts
- [x] T123 [US3] Verify impact analysis performance <2s for 100 specs benchmark
      test in tests/unit/autonomous/DependencyGraph.test.ts

**Checkpoint**: User Story 3 complete and independently functional ✅

---

## Phase 6: User Story 4 - Automatic Context Compaction (Priority: P4)

**Goal**: Automatically manage context window limits by summarizing completed
work so large specs (100+ tasks) execute without manual intervention

**Independent Test**: Create spec with 100+ tasks, monitor context usage during
execution, verify auto-compaction at 80% threshold reduces usage to ~40%

### Implementation for User Story 4

#### Step 1: ContextCompactor Core (Week 10)

- [x] T124 [P] [US4] Create ContextCompactor class skeleton in
      extension/src/autonomous/ContextCompactor.ts implementing ContextCompactor
      interface
- [x] T125 [P] [US4] Write unit test for estimateTokenUsage() using chars/4
      approximation in tests/unit/autonomous/ContextCompactor.test.ts
- [x] T126 [US4] Implement estimateTokenUsage() in
      extension/src/autonomous/ContextCompactor.ts (Math.ceil(context.length /
      4))
- [x] T127 [US4] Write unit test for shouldCompact() checking threshold in
      tests/unit/autonomous/ContextCompactor.test.ts
- [x] T128 [US4] Implement shouldCompact() in
      extension/src/autonomous/ContextCompactor.ts (compare usage to threshold)

#### Step 2: Context Analysis (Week 10)

- [x] T129 [US4] Write unit test for analyzeContext() returning breakdown by
      section in tests/unit/autonomous/ContextCompactor.test.ts
- [x] T130 [US4] Implement analyzeContext() in
      extension/src/autonomous/ContextCompactor.ts (estimate tokens for each
      section: system, tasks, memories, hints)
- [x] T131 [US4] Calculate usage percentage and recommendation in
      analyzeContext() in extension/src/autonomous/ContextCompactor.ts
- [x] T132 [US4] Write unit test for previewCompaction() showing what would be
      compacted in tests/unit/autonomous/ContextCompactor.test.ts
- [x] T133 [US4] Implement previewCompaction() in
      extension/src/autonomous/ContextCompactor.ts (simulate compaction without
      executing)

#### Step 3: Task Summarization (Week 10-11)

- [x] T134 [US4] Create CompactionStrategy default configuration in
      extension/src/autonomous/ContextCompactor.ts (preserveLastN: 10,
      summarizeBatchSize: 5)
- [x] T135 [US4] Write unit test for summarizeTasks() generating concise summary
      in tests/unit/autonomous/ContextCompactor.test.ts
- [x] T136 [US4] Implement summarizeTasks() in
      extension/src/autonomous/ContextCompactor.ts (batch tasks, call LLM with
      summary prompt)
- [x] T137 [US4] Add fallback model support for summarization if multi-LLM
      available in extension/src/autonomous/ContextCompactor.ts
- [x] T138 [US4] Optimize summary prompt to focus on decisions, files changed,
      outcomes (not debugging steps) in
      extension/src/autonomous/ContextCompactor.ts

#### Step 4: Compaction Execution (Week 11)

- [x] T139 [US4] Write unit test for compact() preserving last N tasks in
      tests/unit/autonomous/ContextCompactor.test.ts
- [x] T140 [US4] Implement compact() in
      extension/src/autonomous/ContextCompactor.ts (identify tasks to compact,
      preserve recent)
- [x] T141 [US4] Write unit test for compact() reducing context by 40-60% in
      tests/unit/autonomous/ContextCompactor.test.ts
- [x] T142 [US4] Build new context with summary + preserved tasks in
      extension/src/autonomous/ContextCompactor.ts
- [x] T143 [US4] Calculate tokensSaved and return CompactionSummary in
      extension/src/autonomous/ContextCompactor.ts
- [x] T144 [US4] Save session state backup before compaction in
      extension/src/autonomous/ContextCompactor.ts

#### Step 5: AutonomousDriver Integration (Week 11)

- [x] T145 [US4] Add context monitoring in AutonomousDriver main execution loop
      in extension/src/autonomous/AutonomousDriver.ts
- [x] T146 [US4] Check shouldCompact() after each task completion in
      extension/src/autonomous/AutonomousDriver.ts
- [x] T147 [US4] Trigger compact() when threshold reached in
      extension/src/autonomous/AutonomousDriver.ts
- [x] T148 [US4] Update session context with compacted result in
      extension/src/autonomous/AutonomousDriver.ts
- [x] T149 [US4] Store CompactionSummary in session.compactionHistory in
      extension/src/autonomous/AutonomousDriver.ts

#### Step 6: User Notifications (Week 11)

- [x] T150 [US4] Show notification when compaction occurs: "Context compacted: X
      tasks summarized" in extension/src/autonomous/AutonomousDriver.ts
- [x] T151 [US4] Add "View Summary" button to notification in
      extension/src/autonomous/AutonomousDriver.ts
- [x] T152 [US4] Create CompactionSummaryPanel webview in
      extension/src/ui/CompactionSummaryPanel.ts (show summary text, preserved
      tasks, tokens saved)
- [x] T153 [US4] Add command "SpecGofer: View Compaction History" to show all
      summaries for session in extension/src/commands/compactionCommands.ts

#### Step 7: Configuration (Week 11)

- [x] T154 [US4] Add specGofer.autonomous.compactionThreshold setting to
      extension/package.json contributes.configuration (default 80, range 50-95)
- [x] T155 [US4] Implement setThreshold() and getThreshold() in
      extension/src/autonomous/ContextCompactor.ts
- [x] T156 [US4] Read threshold from VSCode settings in AutonomousDriver
      initialization in extension/src/autonomous/AutonomousDriver.ts

#### Step 8: Fallback Strategies (Week 11)

- [x] T157 [US4] Write unit test for fallback truncation strategy in
      tests/unit/autonomous/ContextCompactor.test.ts
- [x] T158 [US4] Implement fallback truncation (remove oldest, preserve last 20)
      in extension/src/autonomous/ContextCompactor.ts
- [x] T159 [US4] Detect summarization failures (LLM error) and trigger fallback
      in extension/src/autonomous/ContextCompactor.ts
- [x] T160 [US4] Show warning notification when fallback is used in
      extension/src/autonomous/AutonomousDriver.ts

#### Step 9: Error Recovery (Week 11)

- [x] T161 [US4] Implement rollbackCompaction() to restore from backup in
      extension/src/autonomous/ContextCompactor.ts
- [x] T162 [US4] Save session state to .specify/state/sessions/{sessionId}.json
      before compaction in extension/src/autonomous/ContextCompactor.ts
- [x] T163 [US4] Load session state for error recovery in
      extension/src/autonomous/AutonomousDriver.ts

#### Step 10: Testing & Validation (Week 11)

- [ ] T164 [US4] Write integration test for compaction workflow (trigger,
      summarize, preserve) in tests/integration/compactionIntegration.test.ts
- [ ] T165 [US4] Write E2E test for 100+ task spec with auto-compaction in
      tests/e2e/autoCompaction.spec.ts (Playwright)
- [x] T166 [US4] Verify compaction performance <10s benchmark test in
      tests/unit/autonomous/ContextCompactor.test.ts
- [x] T167 [US4] Verify 40-60% context reduction target in
      tests/unit/autonomous/ContextCompactor.test.ts
- [x] T168 [US4] Test emergency compaction at 90% threshold in
      tests/unit/autonomous/ContextCompactor.test.ts

**Checkpoint**: User Story 4 complete and independently functional ✅

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T169 [P] Create user documentation in docs/memory-learning-system.md
      (usage guide, examples, troubleshooting)
- [x] T170 [P] Create example hint files for common patterns in
      .specify/hints/examples/
- [x] T171 [P] Add logging for all major operations (memory save, hint load,
      dependency add, compaction trigger)
- [x] T172 [P] Add telemetry events for feature usage tracking (if telemetry
      enabled)
- [x] T173 Code cleanup: Remove unused imports, fix linting warnings across all
      new files
- [x] T174 Security review: Validate all file path inputs to prevent traversal
      attacks
- [x] T175 Performance optimization: Profile memory search with 1000 entries,
      optimize if needed
- [x] T176 Performance optimization: Profile hint discovery with 1000 files,
      optimize if needed
- [x] T177 Run full test suite with coverage report, ensure >85% coverage
- [x] T178 Run quickstart.md validation: Verify all code examples compile and
      run
- [x] T179 Create migration guide from Feature 005 to Feature 001 in
      docs/migration.md
- [x] T180 Update CHANGELOG.md with feature summary and user-facing changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user
  stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (Memory): Can start immediately after Foundational
  - US2 (Hints): Can start immediately after Foundational (independent of US1)
  - US3 (Dependencies): Can start immediately after Foundational (independent of
    US1, US2)
  - US4 (Compaction): Can start immediately after Foundational (independent of
    US1-3)
  - **Note**: User stories CAN run in parallel if team capacity allows
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundational → US1 (2-3 weeks)
- **User Story 2 (P2)**: Foundational → US2 (1-2 weeks) - **Independent of US1**
- **User Story 3 (P3)**: Foundational → US3 (3-4 weeks) - **Independent of US1,
  US2**
- **User Story 4 (P4)**: Foundational → US4 (1-2 weeks) - **Independent of
  US1-3**

**Key Insight**: After Foundational phase completes, all 4 user stories can be
developed in parallel by different team members since they modify different
files and have no inter-dependencies.

### Within Each User Story

- Tests (unit) should be written BEFORE implementation (TDD approach)
- Interface contracts before implementations
- Core classes before integration with AutonomousDriver
- VSCode commands after core functionality complete
- E2E tests after full integration complete

### Parallel Opportunities

**Setup Phase**:

- T002, T003, T004 can run in parallel (different directories)

**Foundational Phase**:

- T006, T007, T008, T009 can run in parallel (different interface files)

**User Story 1**:

- T014, T016, T018, T020, T022, T024, T026, T028, T030, T032 (all tests) can be
  written in parallel
- T035, T036, T037, T038 (VSCode commands) can be implemented in parallel

**User Story 2**:

- T054, T056, T058, T060, T062, T064, T066 (all tests) can be written in
  parallel

**User Story 3**:

- T079, T081, T083, T085, T087, T090, T092, T094, T098, T100, T102 (all tests)
  can be written in parallel

**User Story 4**:

- T125, T127, T129, T132, T135, T139, T141, T157 (all tests) can be written in
  parallel

**Polish Phase**:

- T169, T170, T171, T172, T174, T175, T176 can all run in parallel (different
  files/concerns)

---

## Parallel Example: User Story 1 (Memory Extension)

```bash
# Step 1: Write all core tests in parallel
Task T014: "Write unit test for save() local memory" (Developer A)
Task T016: "Write unit test for save() global memory" (Developer B)
Task T018: "Write unit test for load() method" (Developer C)

# Step 2: Implement after tests fail
Task T015: "Implement save() local" (Developer A)
Task T017: "Implement save() global" (Developer B)
Task T019: "Implement load()" (Developer C)

# Step 3: VSCode commands in parallel
Task T035: "Implement Remember command" (Developer A)
Task T036: "Implement Search Memory command" (Developer B)
Task T037: "Implement Forget Memory command" (Developer C)
Task T038: "Implement Clear Memory command" (Developer D)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Timeline**: 2-3 weeks

1. Complete Phase 1: Setup (1 day)
2. Complete Phase 2: Foundational (1-2 days)
3. Complete Phase 3: User Story 1 - Memory Extension (2-3 weeks)
4. **STOP and VALIDATE**: Test memory persistence across sessions
5. Deploy/demo MVP if ready

**Deliverable**: Persistent memory system that eliminates repetitive
explanations - the highest value feature

---

### Incremental Delivery (All User Stories)

**Timeline**: 10-11 weeks total

1. **Weeks 1-3**: US1 (Memory Extension) → Test independently → Deploy/Demo ✅
   MVP
2. **Weeks 4-5**: US2 (Hierarchical Hints) → Test independently → Deploy/Demo
3. **Weeks 6-9**: US3 (Spec Dependency Graph) → Test independently → Deploy/Demo
4. **Weeks 10-11**: US4 (Auto-Compaction) → Test independently → Deploy/Demo
5. **Week 12**: Polish phase → Final deployment

**Benefits**: Each deployment adds value without breaking previous features

---

### Parallel Team Strategy

**With 4 developers (optimal)**:

1. **Week 1**: Team completes Setup + Foundational together
2. **Weeks 2-11**: Once Foundational is done:
   - Developer A: User Story 1 (Memory) - Weeks 2-4
   - Developer B: User Story 2 (Hints) - Weeks 2-3
   - Developer C: User Story 3 (Dependencies) - Weeks 2-8
   - Developer D: User Story 4 (Compaction) - Weeks 2-3
3. **Weeks 4-11**: Freed developers help with US3 or Polish tasks
4. **Week 12**: Team completes Polish phase together

**Key Advantage**: No merge conflicts since each user story modifies different
files

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [US#] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Stop at any checkpoint to validate story independently
- Verify all unit tests FAIL before implementing (TDD discipline)
- Commit after each task or logical group (T014+T015, T016+T017, etc.)
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break
  independence

---

## Task Summary

- **Total Tasks**: 180
- **Setup Tasks**: 5 (T001-T005)
- **Foundational Tasks**: 7 (T006-T012)
- **User Story 1 (Memory)**: 40 tasks (T013-T052) - 2-3 weeks
- **User Story 2 (Hints)**: 25 tasks (T053-T077) - 1-2 weeks
- **User Story 3 (Dependencies)**: 46 tasks (T078-T123) - 3-4 weeks
- **User Story 4 (Compaction)**: 45 tasks (T124-T168) - 1-2 weeks
- **Polish Tasks**: 12 (T169-T180)

**MVP Scope** (US1 only): 52 tasks (Setup + Foundational + US1) **Full
Feature**: 180 tasks (all user stories + polish)

**Parallel Opportunities**: 45+ tasks marked [P] can run in parallel
**Independent Stories**: All 4 user stories can be developed in parallel after
Foundational phase

---

## Validation Checklist

- ✅ All tasks follow checkbox format:
  `- [ ] [ID] [P?] [Story?] Description with file path`
- ✅ Tasks organized by user story for independent implementation
- ✅ Each user story has clear independent test criteria
- ✅ User stories can be implemented in parallel (no inter-dependencies)
- ✅ Foundational phase clearly blocks all user story work
- ✅ Tasks reference specific file paths from plan.md
- ✅ Each user story maps to entities from data-model.md
- ✅ Each user story maps to interfaces from contracts/
- ✅ MVP scope clearly identified (US1 only = 52 tasks)
- ✅ Parallel opportunities identified throughout
- ✅ Test tasks follow TDD principle (tests before implementation)
- ✅ Checkpoints at end of each user story phase
- ✅ Clear execution order and dependencies documented
