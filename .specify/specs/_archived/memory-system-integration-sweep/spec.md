---
id: memory-system-integration-sweep
title: 'Memory System Full Integration Sweep'
status: draft
created: '2026-01-29'
updated: '2026-01-29'
author: Claude
priority: high
effort: large
type: integration
---

# Memory System Full Integration Sweep

## Overview

Gofer's memory management system consists of 8 well-implemented, well-tested
modules that are only ~20-30% integrated into production workflows. The modules
pass unit tests individually but the system does not function end-to-end: the
MCP tools that Claude Code calls return bare spec/task data with no memory,
hints, or research context; the context health monitor runs but receives no
data; the observation masker tracks nothing; and the actual Claude Code launch
path bypasses all memory infrastructure entirely.

Spec 012 (completed 2026-01-25) wired the extension-level components
(ContextHealthMonitor, AutoHandoffTrigger, StatusBar, JSONL logging). This spec
addresses the **9 remaining integration gaps** to make the memory system
operational end-to-end.

**Research Reference**: See `research.md` for full codebase analysis.

---

## User Stories

### US1: MCP Tool Context Enrichment (P1)

**As an** AI assistant executing Gofer tasks via MCP tools **I want**
`gofer_execute_task` to return enriched context (memories, hints, research
chunks) alongside the spec and task **So that** I can leverage past learnings
and project-specific guidance when implementing tasks

**Acceptance Criteria**:

- [ ] `gofer_execute_task` response includes relevant memories from
      MemoryManager
- [ ] Response includes applicable coding hints from HintLoader
- [ ] Response includes relevant research chunks from ResearchChunker
- [ ] Response includes full constitution (not truncated to 2000 chars)
- [ ] New response fields are additive (existing fields unchanged)
- [ ] Context is assembled using budget-aware allocation

### US2: Orphaned MCP Tool Registration (P1)

**As an** AI assistant using Gofer tools **I want** the 5 context health MCP
tools to be available for invocation **So that** I can manage context health,
expand masked observations, load research chunks, and trigger handoffs during
long sessions

**Acceptance Criteria**:

- [ ] `gofer_expand_observation` is registered and callable
- [ ] `gofer_get_context_health` is registered and callable
- [ ] `gofer_get_research_index` is registered and callable
- [ ] `gofer_load_research_chunk` is registered and callable
- [ ] `gofer_trigger_handoff` is registered and callable
- [ ] Tool definitions appear in the MCP capabilities response
- [ ] Each tool returns valid responses (not errors)

### US3: Real Context Health Data (P1)

**As a** developer using Gofer **I want** the context health status bar to show
real token usage data **So that** I know when context is degrading and can take
action

**Acceptance Criteria**:

- [ ] ContextHealthMonitor receives a context provider that supplies real data
- [ ] Status bar updates with actual token estimates (not null/empty)
- [ ] Warning threshold (50%) triggers yellow indicator
- [ ] Critical threshold (70%) triggers red indicator and auto-handoff check
- [ ] JSONL logging records real health check data

### US4: Claude Code Launch Context Injection (P1)

**As a** developer launching Claude Code via the Play button **I want** the
Claude Code session to receive enriched context (memories, hints, research) at
startup **So that** Claude Code benefits from past learnings and project
conventions from the first interaction

**Acceptance Criteria**:

- [ ] `launchClaudeCode()` calls ContextBuilder before spawning
- [ ] Enriched context is injected into the initial command or a context file
- [ ] Claude Code receives memories relevant to the current spec/task
- [ ] Claude Code receives coding hints applicable to affected directories
- [ ] Launch performance is not degraded by more than 500ms

### US5: Observation Tracking (P2)

**As a** developer running long autonomous sessions **I want** tool outputs
(terminal output, file reads, MCP responses) to be tracked by the
ObservationMasker **So that** old observations can be masked to reduce context
bloat

**Acceptance Criteria**:

- [ ] Terminal output from Claude Code sessions is tracked as observations
- [ ] Turn counter increments as Claude Code executes tasks
- [ ] Old observations beyond the stage window are eligible for masking
- [ ] Observations can be expanded via `gofer_expand_observation` MCP tool
- [ ] Observation cache persists to `.specify/memory/observation-cache/`

### US6: Research Index Generation (P2)

**As an** AI assistant working on a feature with research.md **I want** a
research index to be generated automatically **So that** relevant research
chunks can be loaded efficiently via ResearchChunker

**Acceptance Criteria**:

- [ ] `research.index.json` is generated when research.md is created or modified
- [ ] Index is available to the MCP tool `gofer_get_research_index`
- [ ] `gofer_load_research_chunk` can load individual chunks by ID
- [ ] Index generation does not block the main extension thread

### US7: Persistence Infrastructure (P2)

**As a** developer using Gofer across sessions **I want** memory, observation,
and usage data to persist to disk **So that** the memory system retains
learnings across restarts

**Acceptance Criteria**:

- [ ] `.specify/memory/local.json` is created on first memory save
- [ ] `.specify/memory/observation-cache/` directory is created when needed
- [ ] `.specify/logs/context-usage.jsonl` is created on first log event
- [ ] `research.index.json` is created per-spec when research exists
- [ ] All persistence uses lazy directory creation (mkdir recursive)

### US8: MemoryManager Consolidation (P3)

**As a** developer maintaining the codebase **I want** a single MemoryManager
instance shared across the extension **So that** memory operations are
coordinated and all usage is logged

**Acceptance Criteria**:

- [ ] Single MemoryManager created in extension.ts
- [ ] Same instance passed to AutonomousDriver and memory commands
- [ ] ContextUsageLogger wired to the shared instance
- [ ] No duplicate MemoryManager instantiation in autonomousCommands.ts

---

## Functional Requirements

### FR1: MCP Tool Response Enrichment

The `gofer_execute_task` MCP tool must return enriched context alongside the
existing spec and task data.

The extension writes enriched context to a file-based bridge (JSON file in
`.specify/memory/`). The language server reads this file when handling
`gofer_execute_task` and includes the context in the response.

- **Validation**: Call `gofer_execute_task` and verify response includes
  `memories`, `hints`, `researchChunks`, and full `constitution` fields
- **Integration**: `language-server/src/mcp/toolHandler.ts:411-486` (executeTask
  handler)

### FR2: Orphaned MCP Tool Registration

The 5 implemented but unregistered MCP tools must be added to the server's tool
definitions and dispatch switch.

- **Validation**: Call each of the 5 tools via MCP and verify non-error
  responses
- **Integration**: `language-server/src/server.ts:177-266` (onInitialize) and
  `language-server/src/server.ts:460-494` (tools/call switch)

### FR3: Context Provider Implementation

A `ContextProvider` must be created and connected to `ContextHealthMonitor` via
`setContextProvider()`. It must estimate token usage from loaded spec artifacts,
active session state, and file system analysis.

- **Validation**: After extension activation, verify
  `ContextHealthMonitor.checkHealth()` returns non-null data
- **Integration**: `extension/src/extension.ts` (after
  `initializeContextHealthMonitoring`)

### FR4: Claude Code Context Injection

The `launchClaudeCode()` function must call ContextBuilder to assemble relevant
context before spawning the Claude Code process. The enriched context must be
injected via the initial command or a dedicated context file.

- **Validation**: Launch Claude Code and verify the initial prompt includes
  memory/hint context
- **Integration**: `extension/src/autonomousCommands.ts:645` (launchClaudeCode)

### FR5: Observation Tracking Hooks

Terminal output from Claude Code sessions must be fed to
`ObservationMasker.trackObservation()`. The turn counter must increment as
interactions progress.

- **Validation**: After a Claude Code session, verify observations exist in the
  masker's cache
- **Integration**: `extension/src/autonomous/TerminalManager.ts`,
  `extension/src/autonomous/OutputMonitor.ts`

### FR6: Research Index Auto-Generation

When a `research.md` file is created or modified in any spec directory, a
corresponding `research.index.json` must be generated using ResearchChunker.

- **Validation**: Create/modify a research.md and verify `research.index.json`
  is generated in the same directory
- **Integration**: `extension/src/autonomous/ResearchChunker.ts` (extension
  copy) or file system watcher

### FR7: Persistence Directory Setup

All persistence paths must be lazily created on first write using
`mkdir(path, { recursive: true })`.

- **Validation**: Remove all persistence files, trigger each module, verify
  directories and files are created
- **Integration**: MemoryManager, ObservationMasker, ContextUsageLogger,
  ResearchChunker

### FR8: MemoryManager Singleton

A single MemoryManager instance must be created in `extension.ts` and passed to
all consumers (memory commands, AutonomousDriver, ContextBuilder).

- **Validation**: Verify only one MemoryManager instance exists at runtime
- **Integration**: `extension/src/extension.ts`,
  `extension/src/autonomousCommands.ts`

---

## Non-Functional Requirements

### Performance

- Context enrichment for `gofer_execute_task` must complete within 1 second
- Claude Code launch must not be delayed by more than 500ms for context building
- Research index generation must be async and non-blocking
- File-based bridge reads must include a freshness window (30-60 seconds) to
  avoid stale data

### Backward Compatibility

- All existing 6 MCP tools must continue to work identically
- `gofer_execute_task` response must keep all existing fields; new fields are
  additive only
- All 1333+ existing tests must continue to pass

### Reliability

- If context enrichment fails, MCP tools must fall back to current behavior
  (return spec+task without enrichment) rather than error
- If the context provider fails, ContextHealthMonitor must continue with null
  status rather than crashing
- File-based bridge must handle missing/corrupt state files gracefully

---

## Success Criteria

| Metric                            | Target                                                  | Measurement         |
| --------------------------------- | ------------------------------------------------------- | ------------------- |
| MCP tools return enriched context | 100% of gofer_execute_task calls include memories/hints | Integration test    |
| Orphaned MCP tools callable       | 5/5 tools registered and responding                     | MCP tool test       |
| Status bar shows real data        | Non-null health status within 10s of activation         | Manual verification |
| Claude Code receives context      | Memories/hints present in initial session               | Manual verification |
| Observation tracking active       | Terminal output tracked after session start             | Integration test    |
| Research indexes generated        | Index exists for each spec with research.md             | File system check   |
| Persistence working               | All 5 persistence paths created on first use            | Integration test    |
| No regressions                    | 1333+ existing tests pass                               | CI                  |
| Context enrichment latency        | < 1 second for gofer_execute_task                       | Performance test    |

---

## Assumptions

- Spec 012 integration work is complete and stable (extension-level wiring for
  ContextHealthMonitor, AutoHandoffTrigger, StatusBar, JSONL logging)
- The file-based state bridge pattern (JSON in `.specify/memory/`) is the
  correct cross-process communication approach for extension-to-language-server
  data sharing
- Custom token estimation (character-count heuristic) is acceptable; no external
  tokenizer library is needed
- The `launchClaudeCode()` path is the primary execution path; AutonomousDriver
  is secondary
- `.specify/hints/` directory already exists with global.md and examples
- The existing MCP tool response contract is consumed by Claude Code and must
  not break

---

## Dependencies

- **Spec 012** (Context Health Integration) — COMPLETE, provides extension-level
  wiring
- **Spec 011** (Context Health and Recursive Memory) — COMPLETE, provides module
  implementations
- **ContextBuilder** (`extension/src/autonomous/ContextBuilder.ts`) — existing
  implementation
- **MemoryManager** (`extension/src/autonomous/MemoryManager.ts`) — existing
  implementation
- **HintLoader** (`extension/src/autonomous/HintLoader.ts`) — existing
  implementation
- **ObservationMasker** (`extension/src/autonomous/ObservationMasker.ts`) —
  existing implementation
- **ResearchChunker** (both extension and language-server copies) — existing
  implementations
- **GoferLoader** (`language-server/src/utils/goferLoader.ts`) — existing spec
  loading

---

## Out of Scope

- New module development (all 8 modules already exist and are tested)
- Changing algorithms or thresholds for context health monitoring
- UI redesign of the status bar or memory panel
- Extracting a shared package for ResearchChunker (defer to future cleanup)
- Switching from `launchClaudeCode()` to `AutonomousDriver` as the primary
  execution path
- tiktoken or external tokenizer integration
- LLM Council integration with the memory system

---

## Glossary

| Term                 | Definition                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------- |
| MCP Tool             | Model Context Protocol tool exposed by the language server for AI agent consumption       |
| File-based bridge    | Pattern for cross-process data sharing via JSON files in `.specify/memory/`               |
| Context provider     | An implementation that supplies real token usage data to ContextHealthMonitor             |
| Observation          | A tracked tool output (terminal, file read, API response) that can be masked when old     |
| Research chunk       | A semantically meaningful section of research.md, indexed for selective loading           |
| Memory-first loading | Strategy that loads memories before research, skipping research if coverage is sufficient |
| Orphaned MCP tool    | A tool with handler implementation but no registration in server.ts dispatch              |

---

## Research Traceability

| Research Finding                               | Spec Section               | Reference           |
| ---------------------------------------------- | -------------------------- | ------------------- |
| Gap 1: MCP tools don't use ContextBuilder      | US1, FR1                   | research.md:44-76   |
| Gap 2: Five orphaned MCP tools                 | US2, FR2                   | research.md:78-92   |
| Gap 3: ContextHealthMonitor has no provider    | US3, FR3                   | research.md:94-110  |
| Gap 4: ObservationMasker never fed data        | US5, FR5                   | research.md:111-123 |
| Gap 5: Two disconnected execution paths        | US4, FR4                   | research.md:124-158 |
| Gap 6: AutonomousDriver methods never called   | US4 (indirect), FR4        | research.md:159-169 |
| Gap 7: ResearchChunker never generates indexes | US6, FR6                   | research.md:170-180 |
| Gap 8: Persistence gaps                        | US7, FR7                   | research.md:182-194 |
| Gap 9: Two MemoryManager instances             | US8, FR8                   | research.md:196-203 |
| Pattern 1: File-based state bridge             | Assumptions, FR1           | research.md:223-232 |
| Pattern 2: Module wiring in extension.ts       | FR3, FR8                   | research.md:234-247 |
| Pattern 3: DI for command registration         | FR8                        | research.md:249-260 |
| Pattern 4: JSONL append logging                | US7                        | research.md:262-275 |
| Decision 1: Cross-process sharing              | Assumptions                | research.md:319-326 |
| Decision 2: Token counting approach            | Assumptions                | research.md:328-336 |
| Decision 3: Context injection method           | FR4                        | research.md:338-347 |
| Constraint: Cross-process boundary             | Assumptions                | research.md:353-354 |
| Constraint: Existing test suite                | NFR Backward Compatibility | research.md:355-356 |
| Constraint: Backward compatibility             | NFR Backward Compatibility | research.md:357-359 |
| Constraint: ResearchChunker duplication        | Out of Scope               | research.md:360-362 |
| Constraint: Spec 012 already done              | Assumptions                | research.md:363-364 |
