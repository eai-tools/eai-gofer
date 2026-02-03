---
id: gofer-cognitive-memory-architecture
title: 'Gofer Cognitive Memory Architecture'
status: draft
created: '2026-01-30'
updated: '2026-01-30'
author: Claude
priority: high
effort: large
type: feature
---

# Gofer Cognitive Memory Architecture

## Overview

Gofer's current memory system has well-tested modules (MemoryManager,
ContextBuilder, ObservationMasker, ResearchChunker, HintLoader,
ContinuousMemoryWriter, ClaudeSessionReader, HookBridgeWatcher) that are only
~20-30% integrated. More fundamentally, the system stores flat JSON with keyword
search -- it has no cognitive structure, no learning loop, no selective
forgetting, and no way to get accumulated knowledge INTO Claude's context window
at the right time.

This spec addresses the **real objective**: improve the quality of AI-generated
code by ensuring Claude Code has access to accumulated project knowledge --
patterns, decisions, outcomes, and relationships -- that grows more valuable with
every session.

The architecture is informed by:

- **Beads** (Steve Yegge) -- JSONL + SQLite dual storage, semantic compaction,
  git-backed persistence, hash-based IDs
- **Graphiti** (Zep) -- temporal knowledge graphs, episodic memory decomposed
  into entities and relationships
- **Manthan Gupta** -- five-layer cognitive architecture with sensory filtering,
  consolidation, and selective forgetting
- **Claude Code TeammateTool** -- multi-agent memory sharing via file-based
  mailbox, domain specialist routing
- **IBM/CoALA framework** -- working, episodic, semantic, procedural, and
  prospective memory types
- **Kirk Marple/Graphlit** -- "If your agents cannot reuse yesterday's decisions,
  they are interns forever"

**Research Reference**: See prior research conversation for full codebase
analysis, external source evaluation, and technology decisions.

---

## User Stories

### US1: Context Seeding at Session Start (P1)

**As a** developer launching Claude Code via Gofer **I want** Claude to receive
relevant memories, hints, and condensed research from the very first turn **So
that** I get high-quality code from turn 1 instead of Claude starting cold every
session

**Why this priority**: Without context seeding, every other memory feature is
useless -- memories exist but Claude never sees them. This is the single highest
impact change.

**Independent Test**: Launch Claude Code via Gofer Play button. Verify the
initial session includes injected memories relevant to the current spec/task.
Compare code quality of first response with vs without seeding.

**Acceptance Criteria**:

- [ ] `launchClaudeCode()` calls ContextBuilder before spawning Claude Code
- [ ] Built context includes top-N memories sorted by priority+relevance score
- [ ] Built context includes applicable coding hints for affected directories
- [ ] Built context includes condensed research chunks (not full research.md)
- [ ] Built context includes full constitution
- [ ] Context injection adds less than 500ms to launch time
- [ ] When no memories exist, launch proceeds normally without errors

---

### US2: Memory Extraction from Sessions (P1)

**As a** developer finishing a coding session **I want** key decisions, patterns,
and error resolutions to be automatically extracted and stored **So that** the
next session benefits from what was learned today

**Why this priority**: This is the input side -- without extraction, the memory
store stays empty. Combined with US1 (output side), this creates the learning
loop.

**Independent Test**: Complete a coding task with Claude Code. End the session.
Verify memories were extracted and stored in `.specify/memory/memories.jsonl`.
Start a new session on a related task and verify extracted memories appear in
context.

**Acceptance Criteria**:

- [ ] `agent-stop` hook extracts decisions, patterns, and error resolutions from
      the session
- [ ] Extracted memories are categorized by type (decision, pattern, error_fix,
      preference)
- [ ] Each memory includes source context (spec ID, task ID, files involved)
- [ ] Extraction rate-limited to max 10 memories per session (noise control)
- [ ] Duplicate detection prevents storing near-identical memories
- [ ] `user-prompt-submit` hook injects top-5 relevant memories into each prompt

---

### US3: Structured Memory Storage (P1)

**As a** developer working across multiple sessions **I want** memories stored in
a structured, queryable format **So that** retrieval is fast, git-friendly, and
supports semantic search

**Why this priority**: The current `local.json` (full JSON rewrite on every
save) doesn't scale. JSONL + SQLite (Beads pattern) provides fast queries,
git-diff-friendly persistence, and append-only writes.

**Independent Test**: Store 100+ memories across multiple sessions. Verify JSONL
file is git-diffable. Verify SQLite cache enables sub-50ms queries. Verify
`bd doctor`-style integrity check passes.

**Acceptance Criteria**:

- [ ] Memories stored as JSONL at `.specify/memory/memories.jsonl` (source of
      truth)
- [ ] SQLite cache at `.specify/memory/memories.sqlite` for fast queries
- [ ] Append-only writes to JSONL (no full-file rewrites)
- [ ] SQLite rebuilt from JSONL on startup or corruption
- [ ] Hash-based memory IDs (prevent collision across concurrent sessions)
- [ ] Memory schema includes: id, type, category, tags, content, citations,
      source (specId, taskId, files), created, lastUsed, usedCount,
      priorityIndex, confidence
- [ ] Query by type, category, tags, keyword, recency, priority -- all under
      50ms for 1000+ memories
- [ ] JSONL file diffs cleanly in git (one memory per line)

---

### US4: Five Memory Types (P2)

**As a** developer building features iteratively **I want** the system to
distinguish between different kinds of knowledge **So that** the right knowledge
is surfaced at the right time for the right purpose

**Why this priority**: Structured types enable targeted retrieval -- procedural
memory for "how to add an API endpoint here" is different from episodic memory
for "what happened last time we refactored auth". Without types, everything is
an undifferentiated blob.

**Independent Test**: Store memories of each type. Query for procedural memories
only. Verify only patterns/templates are returned. Query for episodic memories
about a specific file. Verify session outcomes are returned.

**Acceptance Criteria**:

- [ ] **Working memory**: Current session context managed via context window +
      context-bridge.json. ContextBuilder assembles and injects. No new storage
      needed -- this IS the context window.
- [ ] **Episodic memory**: Session outcomes stored with temporal context -- what
      task, what approach, what happened, what outcome. Queryable by time range,
      spec, task, or file path.
- [ ] **Semantic memory**: Facts about the codebase -- entities (files, classes,
      functions), relationships (calls, imports, extends), patterns (singleton,
      factory, observer). Stored as a graph structure using graphlib.
- [ ] **Procedural memory**: Patterns that worked -- "how to add an endpoint",
      "how to write a test for this component". Includes file templates, command
      sequences, and step-by-step procedures.
- [ ] **Prospective memory**: Deferred TODOs, follow-up actions, technical debt
      items discovered during sessions. Surfaced when working on related files.
- [ ] Each type has a distinct schema extending the base Memory interface
- [ ] ContextBuilder retrieves appropriate types per task context (e.g.,
      procedural for implementation tasks, episodic for debugging)

---

### US5: Memory Lifecycle Management (P2)

**As a** developer using Gofer over weeks and months **I want** the memory system
to consolidate, compact, and forget old memories **So that** the memory store
stays relevant and doesn't grow unbounded

**Why this priority**: Without lifecycle management, old memories accumulate
noise, stale facts persist, and the system degrades over time. This is the
"Memory Manager" layer from Manthan Gupta's architecture.

**Independent Test**: Store 500+ memories over simulated sessions. Run
consolidation. Verify duplicate memories are merged, stale memories are demoted,
and total memory count is reduced. Verify remaining memories are higher quality.

**Acceptance Criteria**:

- [ ] **Semantic compaction**: Memories older than 7 days with low usage are
      summarized (detailed content replaced with condensed version, original
      preserved in archive)
- [ ] **Duplicate detection**: New memories checked against existing by content
      similarity (keyword overlap > 80% = duplicate candidate)
- [ ] **Stale memory detection**: Memories citing files that have changed since
      the memory was created are flagged as potentially stale
- [ ] **Priority decay**: Memories not used in 30 days have priorityIndex
      reduced by 1 (minimum 0)
- [ ] **Consolidation runs**: Background process at session end or on explicit
      trigger merges duplicates, compacts old memories, checks citations
- [ ] **Memory archive**: Compacted memories preserved in
      `.specify/memory/archive.jsonl` (never deleted, just removed from active
      query set)
- [ ] **Metrics**: Consolidation logs count of merged, compacted, flagged, and
      archived memories

---

### US6: Context Window Management (P2)

**As a** developer running long coding sessions **I want** the system to actively
manage what's in the context window **So that** the context stays relevant and
doesn't fill with stale information

**Why this priority**: This is the core objective -- improving context window
quality. All other features feed into this. Without active management, the
context fills with irrelevant content and AI quality degrades.

**Independent Test**: Run a 50-turn session. Verify that context utilization
stays below 70%. Verify that old observations are masked. Verify that when
context approaches critical (>70%), the system recommends or triggers a context
refresh.

**Acceptance Criteria**:

- [ ] Real token usage tracked via ClaudeSessionReader (already implemented)
- [ ] Hook bridge updates context-bridge.json on every tool use (already
      implemented)
- [ ] Status bar shows real utilization percentage (already implemented)
- [ ] ObservationMasker tracks all tool outputs and masks observations beyond
      the stage-specific window (currently dormant -- must be activated)
- [ ] When context exceeds 70%, AutoHandoffTrigger recommends save+reseed
- [ ] **Context reseed**: On session restart or explicit trigger, ContextBuilder
      assembles fresh context from memory store -- only the most relevant
      memories for the current task, not the entire conversation history
- [ ] Context reseed includes: constitution, top-N procedural memories for
      current task type, top-N episodic memories for affected files, any
      prospective memories (TODOs) for the current spec
- [ ] Budget enforcement per stage profile (research: 40% research, implement:
      40% code, etc.)

---

### US7: MCP Tool Integration (P2)

**As an** AI assistant executing Gofer tasks via MCP tools **I want**
`gofer_execute_task` to return enriched context alongside the spec and task data
**So that** I can leverage past learnings when implementing tasks

**Why this priority**: MCP tools are the primary interface between Claude Code
and Gofer. Without enrichment, Claude operates on bare spec text only.

**Independent Test**: Call `gofer_execute_task` via MCP. Verify response includes
memories, hints, and research chunks. Verify context health tools are registered
and callable.

**Acceptance Criteria**:

- [ ] `gofer_execute_task` response includes `memories` array (top-N relevant)
- [ ] Response includes `hints` array (applicable to affected directories)
- [ ] Response includes `researchChunks` array (relevant to task description)
- [ ] Response includes full `constitution` text
- [ ] All 5 orphaned context health MCP tools registered and callable:
      `gofer_expand_observation`, `gofer_get_context_health`,
      `gofer_get_research_index`, `gofer_load_research_chunk`,
      `gofer_trigger_handoff`
- [ ] New response fields are additive (existing fields unchanged)
- [ ] If enrichment fails, falls back to bare spec+task (no errors)

---

### US8: Entity Knowledge Graph (P3)

**As a** developer working on a large codebase **I want** the system to
understand relationships between code entities **So that** when I ask "how does
auth work here?" the system returns the relevant subgraph -- files, classes,
patterns, and past decisions -- not just keyword-matched strings

**Why this priority**: Knowledge graphs enable multi-step reasoning that flat
storage cannot. But the value compounds over time, so it's lower priority than
getting basic memory flowing (US1-US3). Uses graphlib initially, with migration
path to TinyGraphDB or Kuzu if the graph exceeds JSON capacity.

**Independent Test**: Work on 3+ features. Query the knowledge graph for
"authentication". Verify it returns related files, classes, patterns, and past
decisions as a connected subgraph, not isolated strings.

**Acceptance Criteria**:

- [ ] Entities extracted from coding sessions: files, classes/modules,
      functions, patterns, and decisions
- [ ] Relationships tracked: calls, imports, extends, implements, uses-pattern,
      decided-by, modified-in-session
- [ ] Graph stored using graphlib, serialized to
      `.specify/memory/knowledge-graph.json`
- [ ] Graph query returns connected subgraphs (depth-limited BFS from query
      entity)
- [ ] ContextBuilder can include graph context for relevant entities alongside
      memories
- [ ] Graph updated incrementally from session outcomes (not full rebuild)
- [ ] Graph size bounded at 5000 nodes / 20000 edges (with LRU eviction for
      oldest unused nodes)

---

### US9: Multi-Agent Memory Sharing (P3)

**As a** developer using multi-agent workflows (TeammateTool or sub-agents)
**I want** specialist agents to maintain focused memory stores and share
learnings **So that** domain knowledge is preserved across agent boundaries

**Why this priority**: Multi-agent is the future of coding but TeammateTool is
still experimental. Design the memory architecture to support it, but don't
block on it.

**Independent Test**: Spawn two sub-agents (via Task tool) working on different
parts of a feature. Verify each agent can read memories stored by the other.
Verify a leader agent can query memories from all specialists.

**Acceptance Criteria**:

- [ ] Memory store is shared via file system (`.specify/memory/memories.jsonl`
      is readable by all agents in the workspace)
- [ ] Memories include `agentId` field identifying which agent created them
- [ ] Query can filter by agent or return all agents' memories
- [ ] File-based locking prevents concurrent write corruption (JSONL append is
      atomic on most filesystems for small writes)
- [ ] When TeammateTool becomes available, memory sharing extends to team
      mailbox pattern (`~/.claude/teams/{team}/`)
- [ ] Sub-agents spawned via Task tool inherit the workspace memory store

---

### Edge Cases

- **Corrupt JSONL file**: If `memories.jsonl` has invalid lines, skip them
  during SQLite rebuild and log warnings. Never fail entirely.
- **SQLite cache missing**: Rebuild from JSONL on startup. Log the rebuild.
- **Concurrent writes from hooks**: JSONL append-only writes are safe for small
  payloads (<4KB per line). For larger payloads, use file locking.
- **Memory citing deleted files**: Flag as stale during consolidation. Don't
  auto-delete -- the pattern may still be valid even if the file moved.
- **Context window smaller than memories**: Budget enforcement truncates at the
  stage-specific limit. Log which memories were excluded.
- **No memories exist**: ContextBuilder proceeds without memory section. No
  errors.
- **Session ends abruptly**: agent-stop hook may not fire. Next session's
  startup should detect incomplete extraction and offer recovery.
- **Conflicting memories**: When two memories contradict (e.g., "use pattern A"
  vs "use pattern B"), higher priorityIndex wins. Log the conflict.

---

## Functional Requirements

### Context Seeding

- **FR-001**: ContextBuilder MUST be called before Claude Code launch with the
  current spec/task context
- **FR-002**: Built context MUST be injected via a context file readable by
  Claude Code at startup (`.specify/memory/session-context.md`)
- **FR-003**: Context seeding MUST include: constitution, top-10 memories by
  priority+relevance, applicable hints, condensed research chunks
- **FR-004**: Context seeding MUST complete within 500ms

### Memory Extraction

- **FR-005**: `agent-stop` hook MUST extract decisions, patterns, and error
  resolutions from the session conversation metadata (not content -- using tool
  usage patterns and task outcomes)
- **FR-006**: `user-prompt-submit` hook MUST inject top-5 relevant memories into
  each prompt as system context
- **FR-007**: Extraction MUST categorize memories by type: decision, pattern,
  error_fix, preference, observation
- **FR-008**: Extraction MUST be rate-limited to max 10 memories per session
- **FR-009**: Duplicate detection MUST prevent storing memories with >80%
  keyword overlap to existing memories

### Structured Storage

- **FR-010**: Primary storage MUST be JSONL at
  `.specify/memory/memories.jsonl` (append-only, git-tracked)
- **FR-011**: SQLite cache MUST exist at `.specify/memory/memories.sqlite` for
  fast queries
- **FR-012**: SQLite MUST be rebuilt from JSONL on startup if missing or corrupt
- **FR-013**: Memory IDs MUST be hash-based (first 8 chars of SHA-256 of
  content+timestamp) to prevent collision
- **FR-014**: All writes MUST append to JSONL first, then update SQLite

### Memory Types

- **FR-015**: System MUST support five memory types: episodic, semantic,
  procedural, prospective, and decision
- **FR-016**: Each type MUST have a schema extending the base Memory interface
  with type-specific fields
- **FR-017**: ContextBuilder MUST select memory types appropriate to the current
  task (procedural for implementation, episodic for debugging, semantic for
  exploration)

### Memory Lifecycle

- **FR-018**: Consolidation MUST run at session end (via agent-stop hook) or on
  explicit trigger
- **FR-019**: Memories older than 7 days with usedCount < 2 MUST be candidates
  for semantic compaction
- **FR-020**: Compacted memories MUST be archived to
  `.specify/memory/archive.jsonl`
- **FR-021**: Memories citing changed files MUST be flagged as stale during
  consolidation
- **FR-022**: Priority decay MUST reduce priorityIndex by 1 for memories unused
  in 30 days

### Context Window Management

- **FR-023**: ObservationMasker MUST be activated with real tool output tracking
- **FR-024**: Stage-specific observation windows MUST be enforced (research: 10
  turns, plan: 7, implement: 5, validate: 3)
- **FR-025**: Context reseed MUST assemble fresh context from memory store when
  triggered (session restart, explicit command, or auto-handoff)
- **FR-026**: Budget enforcement MUST warn when any category exceeds its stage
  profile allocation

### MCP Tool Integration

- **FR-027**: `gofer_execute_task` MUST include enriched context (memories,
  hints, research chunks, constitution) in response
- **FR-028**: Five orphaned MCP tools MUST be registered in server.ts tool
  definitions and dispatch switch
- **FR-029**: If enrichment fails, tools MUST fall back to current behavior
  (bare spec+task response)

### Knowledge Graph

- **FR-030**: Entity extraction MUST create nodes for files, classes, functions,
  and patterns encountered during sessions
- **FR-031**: Relationship extraction MUST create edges for calls, imports,
  extends, uses-pattern, and decided-by
- **FR-032**: Graph MUST be serialized to
  `.specify/memory/knowledge-graph.json` using graphlib
- **FR-033**: Graph query MUST support depth-limited BFS from any entity node
- **FR-034**: Graph MUST be bounded at 5000 nodes with LRU eviction

### Multi-Agent Support

- **FR-035**: All memory operations MUST include `agentId` for provenance
  tracking
- **FR-036**: Memory queries MUST support filtering by agentId or returning all
  agents' memories
- **FR-037**: JSONL append writes MUST be atomic for payloads under 4KB

---

## Non-Functional Requirements

### Performance

- Context seeding (ContextBuilder.buildContext) MUST complete within 500ms
- Memory queries MUST return within 50ms for up to 1000 memories (via SQLite)
- JSONL append MUST complete within 10ms per write
- SQLite rebuild from 1000-line JSONL MUST complete within 2 seconds
- Consolidation MUST complete within 5 seconds for up to 1000 memories
- Knowledge graph queries MUST complete within 100ms for up to 5000 nodes

### Storage

- JSONL files MUST not exceed 10MB (trigger compaction/archival at 8MB)
- SQLite cache MUST not exceed 50MB
- Knowledge graph JSON MUST not exceed 5MB

### Backward Compatibility

- All existing 6 MCP tools MUST continue to work identically
- `gofer_execute_task` response MUST keep all existing fields; new fields are
  additive only
- All 1524+ existing tests MUST continue to pass
- Existing Memory interface MUST be extended, not replaced
- Existing hook scripts MUST be enhanced, not replaced
- `.specify/memory/local.json` MUST be migrated to `memories.jsonl` on first run

### Reliability

- If JSONL file is corrupt, skip invalid lines and continue (never crash)
- If SQLite cache is missing, rebuild from JSONL (never fail to start)
- If enrichment fails, fall back to bare spec+task (never block MCP tools)
- If consolidation fails, log error and skip (never lose memories)
- If knowledge graph exceeds bounds, evict LRU nodes (never refuse new entities)

### Security

- Never read message content from Claude Code JSONL logs (privacy boundary)
- Never expose API keys or auth tokens in memory content
- Memory files are workspace-local (no network transmission)

---

## Key Entities

### Memory (Extended)

Core entity representing a learned piece of knowledge. Extends existing Memory
interface.

- **id**: Hash-based string (first 8 chars of SHA-256)
- **type**: 'episodic' | 'semantic' | 'procedural' | 'prospective' | 'decision'
- **category**: String (e.g., 'api_pattern', 'error_resolution', 'preference')
- **tags**: String array (max 20, must start with #)
- **content**: String (1-10,000 chars)
- **source**: Object with specId, taskId, files[], sessionId, agentId
- **citations**: Array of {file, line, snippet, hash} for code references
- **confidence**: Number 0-100 (how confident the system is in this memory)
- **priorityIndex**: Number (higher = surfaced first, incremented on use/update)
- **usedCount**: Number (times this memory influenced a decision)
- **created**: Unix timestamp ms
- **lastUsed**: Unix timestamp ms
- **stale**: Boolean (true if cited files changed since memory creation)
- **compactedFrom**: String (ID of original memory if this is a compaction)

### EpisodicMemory (extends Memory)

Session outcomes with temporal context.

- **sessionOutcome**: 'success' | 'partial' | 'failed' | 'abandoned'
- **approach**: String (what approach was tried)
- **duration**: Number (session duration in seconds)
- **turnsUsed**: Number (how many turns the task took)

### ProceduralMemory (extends Memory)

Patterns and templates that worked.

- **steps**: String array (step-by-step procedure)
- **applicableWhen**: String (conditions when this pattern applies)
- **filePatterns**: String array (glob patterns for files this applies to)

### ProspectiveMemory (extends Memory)

Deferred actions and follow-ups.

- **triggerCondition**: String (when to surface this -- e.g., "when editing
  auth files")
- **deadline**: Number (optional Unix timestamp for time-based triggers)
- **resolved**: Boolean (true when the TODO is completed)

### KnowledgeGraphNode

Entity in the code knowledge graph.

- **id**: String (hash-based)
- **type**: 'file' | 'class' | 'function' | 'pattern' | 'decision'
- **name**: String (entity name)
- **path**: String (file path for file/class/function types)
- **lastSeen**: Unix timestamp ms (for LRU eviction)
- **metadata**: Object (type-specific properties)

### KnowledgeGraphEdge

Relationship between entities.

- **source**: String (node ID)
- **target**: String (node ID)
- **type**: 'calls' | 'imports' | 'extends' | 'implements' | 'uses_pattern' |
  'decided_by' | 'modified_in'
- **weight**: Number (relationship strength, incremented on repeated
  observation)
- **lastSeen**: Unix timestamp ms

---

## Success Criteria

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Session cold-start quality | Claude starts from scratch every session | Claude references past decisions from turn 1 | Count sessions where injected memory is applied |
| Repeated mistake rate | Same errors recur across sessions | Known error patterns caught before they happen | Track error_fix memory retrievals that prevent re-occurrence |
| Pattern consistency | Inconsistent code across features | Same patterns applied consistently | Compare procedural memory usage across features |
| Context window efficiency | Raw spec files loaded (~767KB in civica-crm) | Condensed knowledge loaded (<50KB) | Compare tokens loaded by ContextBuilder |
| Knowledge retention | 0% of session learnings preserved | 80%+ of key decisions accessible next session | Memory coverage audit per session |
| Memory query latency | N/A (no queries) | <50ms for 1000+ memories | SQLite query benchmark |
| Context utilization accuracy | Filesystem estimate (often wrong) | Within 1% of actual (real JSONL data) | Compare status bar to Claude `/context` |
| Memory store growth rate | Unbounded (no compaction) | Stable at <1000 active memories per project | Count active memories over time |
| Consolidation effectiveness | No consolidation | 30%+ reduction in active memory count after consolidation | Before/after count |

---

## Assumptions

- Existing MemoryManager API (save, search, forget, clear, load, recordUsage)
  will be extended, not replaced
- JSONL append-only writes are atomic on macOS/Linux for payloads under 4KB
  (POSIX guarantee for O_APPEND)
- SQLite can be used as a read-only cache rebuilt from JSONL (no SQLite-specific
  state needed)
- Claude Code hooks (post-tool-use, user-prompt-submit, agent-stop) are the
  primary integration points for memory extraction and injection
- The file-based bridge pattern (JSON files in .specify/) is the correct
  cross-process communication approach
- graphlib library (already a dependency via DependencyGraph) can represent the
  knowledge graph at initial scale
- Context window improvements are measurable by comparing AI output quality in
  A/B scenarios (with and without memory)
- TeammateTool multi-agent feature is experimental and may change; memory sharing
  design should not depend on its specific API

---

## Dependencies

### Existing Modules (Extend, Don't Replace)

- `extension/src/autonomous/memory.ts` -- Extend Memory interface with type
  field and new schemas
- `extension/src/autonomous/MemoryManager.ts` -- Add JSONL+SQLite storage
  backend, extend query API
- `extension/src/autonomous/ContextBuilder.ts` -- Wire to Claude Code launch,
  add type-aware retrieval
- `extension/src/autonomous/ContinuousMemoryWriter.ts` -- Extend to write all 5
  memory types
- `extension/src/autonomous/ObservationMasker.ts` -- Activate with real tool
  output tracking
- `extension/src/autonomous/ResearchChunker.ts` -- Trigger index generation on
  research.md changes
- `extension/src/autonomous/HintLoader.ts` -- Load during context seeding
- `extension/src/autonomous/ClaudeSessionReader.ts` -- Already provides real
  token data
- `extension/src/autonomous/HookBridgeWatcher.ts` -- Already provides bridge
  events
- `extension/src/autonomous/ContextBridgeWriter.ts` -- Write enriched context
  for LSP

### Existing Hook Scripts (Enhance, Don't Replace)

- `.specify/scripts/hooks/agent-stop.mjs` -- Add memory extraction and
  consolidation
- `.specify/scripts/hooks/user-prompt-submit.mjs` -- Add memory injection into
  prompts
- `.specify/scripts/hooks/post-tool-use.mjs` -- Add observation tracking
- `.specify/scripts/hooks/session-lifecycle.mjs` -- Add session outcome tracking

### Existing Infrastructure

- `language-server/src/mcp/toolHandler.ts` -- Add enriched context to
  gofer_execute_task
- `language-server/src/server.ts` -- Register 5 orphaned MCP tools
- `extension/src/extension.ts` -- Wire ContextBuilder to launch path, create
  singleton MemoryManager
- `extension/src/autonomousCommands.ts` -- Inject context at launchClaudeCode()

### External Libraries (Existing Dependencies)

- `graphlib` -- Already used by DependencyGraph for spec DAG; extend for
  knowledge graph
- `better-sqlite3` -- New dependency for SQLite cache (or `sql.js` for
  pure-JS alternative)

---

## Out of Scope

- Vector database for embedding-based semantic search (use keyword + graph
  traversal instead; add embeddings in future phase)
- Cross-repository memory sharing (memories stay within project)
- Real-time collaborative memory editing between multiple human users
- External API integration for memory (Zep, Mem0, etc.) -- this is local-first
- Full Graphiti/Neo4j knowledge graph (use graphlib initially; migrate if scale
  requires)
- TeammateTool-specific API integration (design for file-based sharing; adapt
  when API stabilizes)
- Training or fine-tuning models on memory content
- Memory visualization dashboard (text-based queries are sufficient for MVP)
- Automatic code generation from procedural memories (memories inform, not
  automate)

---

## Glossary

| Term | Definition |
|------|-----------|
| Context seeding | Injecting relevant memories, hints, and research into Claude's context window at session start |
| Context reseed | Rebuilding context from memory store when the current context is stale or near capacity |
| Semantic compaction | Summarizing old detailed memories into condensed versions to save storage and context tokens |
| JSONL | JSON Lines format -- one JSON object per line, append-only, git-diff-friendly |
| Knowledge graph | Graph of code entities (files, classes, functions) and their relationships |
| Priority index | Score determining memory surfacing order; incremented on decision use (+1) and update (+1) |
| Observation masking | Replacing old tool outputs with compact placeholders to free context window space |
| Memory consolidation | Background process that merges duplicates, compacts old memories, and flags stale citations |
| Stage profile | Per-stage budget allocation defining how much context to spend on research, memory, code, etc. |
| File-based bridge | Cross-process communication via JSON files in .specify/ (hook scripts write, extension reads) |
| Working memory | The context window itself -- short-term, session-scoped, managed by ContextBuilder |
| Episodic memory | Records of what happened -- session outcomes, approaches tried, temporal sequences |
| Semantic memory | Facts about the codebase -- entities, relationships, patterns as a knowledge graph |
| Procedural memory | How-to knowledge -- patterns, templates, step-by-step procedures that worked |
| Prospective memory | Future actions -- TODOs, deferred decisions, follow-ups to surface at the right time |

---

## Research Traceability

| Research Finding | Spec Section | Reference |
|-----------------|--------------|-----------|
| ContextBuilder exists but never called at launch | US1, FR-001 | Module analysis: ContextBuilder.ts |
| Hook scripts extract memories but keyword-only | US2, FR-005 | Hook analysis: agent-stop.mjs |
| local.json full-rewrite doesn't scale | US3, FR-010 | Beads architecture: JSONL+SQLite |
| No memory type taxonomy | US4, FR-015 | IBM CoALA framework, Manthan Gupta 5-layer model |
| No consolidation or forgetting | US5, FR-018 | Manthan Gupta: "real intelligence depends on what we choose to forget" |
| 767KB spec overload in civica-crm | US6, FR-025 | civica-crm context-usage.jsonl: 135% utilization |
| MCP tools return bare spec data | US7, FR-027 | Module analysis: toolHandler.ts |
| No code entity relationships | US8, FR-030 | Graphiti temporal knowledge graph architecture |
| Multi-agent via file mailbox | US9, FR-035 | TeammateTool gist: file-based coordination |
| Beads semantic compaction | US5, FR-019 | Steve Yegge: 12-hour agent sessions with compaction |
| Kirk Marple context layer | US6 | "Agents that cannot reuse decisions are interns forever" |
| ObservationMasker dormant | US6, FR-023 | Module analysis: never fed data |
| 5 orphaned MCP tools | US7, FR-028 | server.ts analysis: defined but not registered |
| graphlib already a dependency | US8, FR-032 | DependencyGraph.ts uses graphlib |
| POSIX atomic append guarantee | Assumptions | JSONL concurrent write safety |
