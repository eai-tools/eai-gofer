---
feature: gofer-cognitive-memory-architecture
spec: spec.md
status: approved
created: '2026-01-30'
---

# Implementation Plan: Gofer Cognitive Memory Architecture

## Architecture Overview

This plan builds on existing modules rather than creating new ones. The key
insight from codebase analysis is that **most infrastructure already exists and
is wired** — the main work is enhancing storage, adding memory types, activating
dormant modules, and connecting the learning loop.

### What Already Works

| Component | Status | What It Does |
|-----------|--------|-------------|
| MemoryManager | Wired as singleton in extension.ts:1247 | CRUD for local.json |
| ContextBuilder | Wired as singleton in extension.ts:1256 | Assembles context with memories, hints, research |
| Context seeding | Wired in autonomousCommands.ts:720-743 | Writes enriched context to bridge file before launch |
| Hook: agent-stop | Working | Extracts learnings, writes to local.json |
| Hook: user-prompt-submit | Working | Injects top-5 memories into each prompt |
| Hook: post-tool-use | Working | Writes token usage to context-bridge.json |
| ClaudeSessionReader | Working | Reads real token data from JSONL logs |
| HookBridgeWatcher | Working | Watches context-bridge.json, emits events |
| ContextHealthMonitor | Wired in extension.ts:307 | Health assessment with real data |
| AutoHandoffTrigger | Wired in extension.ts:309 | Fires at 70% context |
| Status bar | Wired | Shows real utilization |
| 11 MCP tools | Registered in server.ts:175-342 | All dispatched in tools/call handler |
| executeTask enrichment | Wired in toolHandler.ts:473-569 | Reads enriched-context.json bridge |

### What Needs Enhancement

| Component | Current | Enhancement |
|-----------|---------|------------|
| Storage (local.json) | Full JSON rewrite per save | JSONL append + SQLite cache |
| Memory schema | Single Memory type, keyword search | Five typed memory schemas |
| Hook: agent-stop | Extracts flat text learnings | Categorize by memory type, add entity extraction |
| Hook: user-prompt-submit | Keyword scoring only | Type-aware retrieval, task context matching |
| Consolidation | None | Compaction, dedup, stale detection, priority decay |
| Knowledge graph | None (DependencyGraph is spec-only DAG) | Code entity graph with graphlib |
| ObservationMasker | Dormant (no data fed) | Activate with tool output tracking |

## Phase Structure

### Phase 1: JSONL Storage Backend (FR-010 through FR-014)

Migrate from `local.json` (full rewrite) to `memories.jsonl` (append-only) with
SQLite cache for fast queries. This is the foundation everything else builds on.

**Files to modify:**
- `extension/src/autonomous/MemoryManager.ts` — Add JSONL+SQLite backend
- `extension/src/autonomous/memory.ts` — Extend Memory interface with type field
- `.specify/scripts/hooks/agent-stop.mjs` — Write to JSONL instead of local.json
- `.specify/scripts/hooks/user-prompt-submit.mjs` — Read from JSONL/SQLite

**Migration strategy:**
- On first load, if `local.json` exists and `memories.jsonl` does not, migrate
  all memories to JSONL format
- Keep `local.json` as read-only fallback for one version cycle
- SQLite rebuilt from JSONL on startup or when missing

### Phase 2: Five Memory Types (FR-015 through FR-017)

Add typed memory schemas and type-aware retrieval to ContextBuilder.

**Files to modify:**
- `extension/src/autonomous/memory.ts` — Add EpisodicMemory, ProceduralMemory, ProspectiveMemory, SemanticMemory, DecisionMemory interfaces
- `extension/src/autonomous/MemoryManager.ts` — Add type-aware query methods
- `extension/src/autonomous/ContextBuilder.ts` — Select memory types per task context
- `.specify/scripts/hooks/agent-stop.mjs` — Categorize extracted learnings by type

### Phase 3: Memory Lifecycle (FR-018 through FR-022)

Add consolidation, compaction, decay, and stale detection.

**Files to modify:**
- `extension/src/autonomous/MemoryManager.ts` — Add consolidation methods
- `.specify/scripts/hooks/agent-stop.mjs` — Trigger consolidation at session end
- New: `extension/src/autonomous/MemoryConsolidator.ts` — Consolidation logic

### Phase 4: Context Window Management (FR-023 through FR-026)

Activate ObservationMasker, enforce budgets, add context reseed capability.

**Files to modify:**
- `extension/src/autonomous/ObservationMasker.ts` — Already implemented, needs data sources
- `extension/src/autonomousCommands.ts` — Feed terminal output to ObservationMasker
- `extension/src/autonomous/ContextBuilder.ts` — Add reseed method
- `.specify/scripts/hooks/post-tool-use.mjs` — Track observations

### Phase 5: Knowledge Graph (FR-030 through FR-034)

Build code entity graph using graphlib.

**Files to modify:**
- New: `extension/src/autonomous/KnowledgeGraph.ts` — Entity graph with graphlib
- `extension/src/autonomous/ContextBuilder.ts` — Include graph context
- `.specify/scripts/hooks/agent-stop.mjs` — Extract entities and relationships

## Data Model

### Memory JSONL Record (one per line in memories.jsonl)

```json
{
  "id": "a1b2c3d4",
  "type": "procedural",
  "category": "api_pattern",
  "tags": ["#auto", "#spec-001", "#typescript"],
  "content": "When adding a new MCP tool, define it in server.ts onInitialize tools array AND add a case in the tools/call switch",
  "source": {
    "specId": "memory-system-integration-sweep",
    "taskId": "T045",
    "files": ["language-server/src/server.ts"],
    "sessionId": "abc-123",
    "agentId": "main"
  },
  "citations": [
    {"file": "language-server/src/server.ts", "line": 175, "snippet": "experimental.mcp.tools", "hash": "f4e5d6"}
  ],
  "confidence": 85,
  "priorityIndex": 3,
  "usedCount": 2,
  "created": 1706600000000,
  "lastUsed": 1706650000000,
  "stale": false,
  "steps": ["Add tool definition to onInitialize tools array", "Add case to tools/call switch", "Implement handler in MCPToolHandler"],
  "applicableWhen": "Adding a new MCP tool to the language server",
  "filePatterns": ["language-server/src/server.ts", "language-server/src/mcp/toolHandler.ts"]
}
```

### SQLite Schema

```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  source_json TEXT,
  confidence INTEGER DEFAULT 50,
  priority_index INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  created INTEGER NOT NULL,
  last_used INTEGER NOT NULL,
  stale INTEGER DEFAULT 0,
  jsonl_offset INTEGER  -- byte offset in JSONL for fast lookup
);

CREATE INDEX idx_type ON memories(type);
CREATE INDEX idx_category ON memories(category);
CREATE INDEX idx_priority ON memories(priority_index DESC);
CREATE INDEX idx_last_used ON memories(last_used DESC);
CREATE INDEX idx_stale ON memories(stale);

CREATE VIRTUAL TABLE memory_fts USING fts5(content, category, tags);
```

### Knowledge Graph (graphlib JSON)

```json
{
  "options": {"directed": true, "multigraph": false},
  "nodes": [
    {"v": "file:server.ts", "value": {"type": "file", "path": "language-server/src/server.ts", "lastSeen": 1706600000000}},
    {"v": "class:MCPToolHandler", "value": {"type": "class", "path": "language-server/src/mcp/toolHandler.ts", "lastSeen": 1706600000000}},
    {"v": "pattern:mcp-tool-registration", "value": {"type": "pattern", "name": "MCP Tool Registration", "lastSeen": 1706600000000}}
  ],
  "edges": [
    {"v": "file:server.ts", "w": "class:MCPToolHandler", "value": {"type": "imports", "weight": 5, "lastSeen": 1706600000000}},
    {"v": "class:MCPToolHandler", "w": "pattern:mcp-tool-registration", "value": {"type": "uses_pattern", "weight": 3, "lastSeen": 1706600000000}}
  ]
}
```

## Contracts

### Memory JSONL Format Contract

Each line in `memories.jsonl` is a self-contained JSON object conforming to
the `TypedMemory` union type. Lines are never modified — updates append a new
line with the same `id` (last-writer-wins during SQLite rebuild).

### SQLite Cache Contract

SQLite is a **read-only cache** rebuilt from JSONL. It is never the source of
truth. If SQLite is deleted, the system rebuilds it from JSONL on next startup.
The extension MUST NOT store any state exclusively in SQLite.

### Hook Script Contract

Hook scripts communicate via stdin/stdout JSON:
- **Input**: `{ session_id, transcript_path, prompt?, stop_hook_active? }`
- **Output (user-prompt-submit)**: `{ hookSpecificOutput: { hookEventName, additionalContext } }`
- **Output (agent-stop)**: None (writes files directly)

Hook scripts MUST:
- Complete within 5 seconds
- Never crash (catch all errors)
- Write to JSONL with append (not full file rewrite)
- Use atomic file writes (write to tmp, rename to target)

### ContextBuilder Reseed Contract

`ContextBuilder.buildContext(task)` assembles fresh context from the memory
store. When called as a "reseed", it:
1. Loads constitution (always)
2. Loads top-N memories by priority+relevance for the task
3. Loads applicable hints for affected files
4. Loads condensed research chunks (not full research.md)
5. Returns `BuiltContext` with all sections and budget usage

The caller decides when to reseed (session start, auto-handoff, explicit
command). ContextBuilder does not manage session lifecycle.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| SQLite dependency adds complexity | Medium | Medium | Use sql.js (pure JS, no native bindings) for maximum portability |
| JSONL grows unbounded | Low | High | Compaction + archival at 8MB threshold (FR-019, FR-020) |
| Hook scripts slow down prompts | Low | High | 5-second timeout, async operations, fail-open |
| Knowledge graph too large | Low | Medium | 5000 node limit with LRU eviction (FR-034) |
| Concurrent write corruption | Medium | Medium | JSONL append is POSIX-atomic for <4KB; SQLite is read-only cache |
| Migration from local.json fails | Low | Medium | Keep local.json as fallback; manual migration path |
