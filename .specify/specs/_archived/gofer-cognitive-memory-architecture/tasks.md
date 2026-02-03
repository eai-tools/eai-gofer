---
feature: Gofer Cognitive Memory Architecture
spec: spec.md
plan: plan.md
status: approved
approvedBy: user
approvedAt: '2026-01-30'
created: '2026-01-30'
---

# Tasks

## Phase 1: JSONL Storage Backend [US3]

- [X] T001 [Setup] Extend Memory interface with type field and typed memory schemas in memory.ts
- [X] T002 [Setup] Create MemoryStorage class with JSONL append-only write and read methods
- [ ] T003 [Setup] Add SQLite cache with schema (memories table + FTS5 index) using sql.js [DEFERRED - using in-memory index]
- [ ] T004 [Setup] Add SQLite rebuild-from-JSONL method for startup and corruption recovery [DEFERRED]
- [X] T005 [Setup] Add hash-based ID generation (SHA-256 first 8 chars of content+timestamp)
- [X] T006 [Setup] Add migration path from local.json to memories.jsonl (run on first load)
- [X] T007 [Setup] Wire MemoryStorage into MemoryManager as the storage backend (replace JSON read/write)
- [X] T008 [Setup] Update MemoryManager query methods to use in-memory index for fast lookups
- [X] T009 [P] [US3] Write unit tests for MemoryStorage JSONL operations
- [ ] T010 [P] [US3] Write unit tests for SQLite cache operations and rebuild [DEFERRED]

## Phase 2: Five Memory Types [US4]

- [X] T011 [US4] Add EpisodicMemory interface (sessionOutcome, approach, duration, turnsUsed)
- [X] T012 [US4] Add ProceduralMemory interface (steps, applicableWhen, filePatterns)
- [X] T013 [US4] Add ProspectiveMemory interface (triggerCondition, deadline, resolved)
- [X] T014 [US4] Add type-aware query to MemoryManager (queryByType via MemoryStorage.query)
- [X] T015 [US4] Update ContextBuilder.formatMemories to group by type and include typed metadata
- [X] T016 [P] [US4] Write unit tests for typed memory storage and retrieval (in MemoryStorage.test.ts)

## Phase 3: Hook Script Enhancement [US1, US2]

- [X] T017 [US2] Update agent-stop.mjs to write memories as JSONL append (not local.json rewrite)
- [X] T018 [US2] Update agent-stop.mjs to categorize extracted learnings by memory type
- [X] T019 [US2] Add entity extraction to agent-stop.mjs (source provenance, confidence, priorityIndex)
- [X] T020 [US1] Update user-prompt-submit.mjs to read from memories.jsonl (with local.json fallback)
- [X] T021 [US1] Update user-prompt-submit.mjs to use type-aware scoring (procedural for implement tasks)
- [X] T022 [US6] Update post-tool-use.mjs to track observations for ObservationMasker
- [X] T023 [P] [US2] Write integration test for agent-stop memory extraction pipeline (6 tests)
- [X] T024 [P] [US1] Write integration test for user-prompt-submit memory injection (7 tests)

## Phase 4: Memory Lifecycle [US5]

- [X] T025 [US5] Create MemoryConsolidator class with consolidation pipeline
- [X] T026 [US5] Add duplicate detection (keyword overlap > 80% = candidate)
- [X] T027 [US5] Add semantic compaction (summarize old low-use memories)
- [X] T028 [US5] Add stale detection (check if cited files changed since memory creation)
- [X] T029 [US5] Add priority decay (reduce priorityIndex by 1 for unused-in-30-days)
- [X] T030 [US5] Add archive mechanism (move compacted memories to archive.jsonl)
- [X] T031 [US5] Wire consolidation to terminal close (trigger at session end in autonomousCommands.ts)
- [X] T032 [P] [US5] Write unit tests for MemoryConsolidator operations

## Phase 5: Context Window Management [US6]

- [X] T033 [US6] ObservationMasker already activated via terminal output tracking in autonomousCommands.ts
- [X] T034 [US6] Add context reseed method to ContextBuilder (fresh context from memory store)
- [X] T035 [US6] Wire reseed to auto-handoff trigger (when context >70%, recommend reseed)
- [X] T036 [US6] Stage-specific budget limits already enforced in ContextBuilder
- [X] T037 [P] [US6] Write unit tests for observation tracking and context reseed (12 tests)

## Phase 6: MCP Tool Enrichment [US7]

- [X] T038 [US7] All 11 MCP tools registered and dispatched (verified in existing tests)
- [X] T039 [US7] Enhance gofer_execute_task to include graph context in enriched response
- [X] T040 [US7] Add code section (graph context) to enriched-context.json bridge format
- [X] T041 [P] [US7] Write integration test for MCP tool enrichment end-to-end (7 tests)

## Phase 7: Knowledge Graph [US8]

- [X] T042 [US8] Create KnowledgeGraph class using graphlib with node/edge types
- [X] T043 [US8] Add entity extraction helpers (recordFileAccess, recordPattern, recordDecision, recordImport)
- [X] T044 [US8] Add depth-limited BFS query for connected subgraphs
- [X] T045 [US8] Add graph persistence to knowledge-graph.json via graphlib json.write/read
- [X] T046 [US8] Wire graph context into ContextBuilder alongside memories
- [X] T047 [US8] Add LRU eviction at 5000 node limit
- [X] T048 [P] [US8] Write unit tests for KnowledgeGraph operations

## Phase 8: Validation

- [X] T049 [Validate] Run full test suite: 1599 tests pass, 0 failures
- [X] T050 [Validate] Run ESLint and verify zero errors
- [ ] T051 [Validate] Manual test: launch Claude Code, verify memory injection on first turn
- [ ] T052 [Validate] Manual test: complete session, verify memories extracted to JSONL
- [ ] T053 [Validate] Manual test: start new session, verify previous memories influence context
