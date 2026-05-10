# Data Model: Memory System Integration Sweep

## Entities

This feature does not introduce new data entities. All entities are defined by
existing modules (Spec 011). This document catalogs the **file-based persistence
formats** used by the integration.

---

### Enriched Context Bridge

**Path**: `.specify/memory/enriched-context.json` **Written by**:
ContextBridgeWriter (extension) **Read by**: MCPToolHandler (language server)

| Field                 | Type           | Required | Description                    |
| --------------------- | -------------- | -------- | ------------------------------ |
| timestamp             | number         | Yes      | Unix ms when context was built |
| specId                | string         | Yes      | Spec the context was built for |
| taskId                | string         | Yes      | Task the context was built for |
| sections              | object         | Yes      | Context sections (see below)   |
| sections.constitution | string         | No       | Full constitution text         |
| sections.hints        | string         | No       | Formatted coding hints         |
| sections.memories     | string         | No       | Formatted relevant memories    |
| sections.research     | string         | No       | Relevant research chunks       |
| memoryCoverage        | MemoryCoverage | No       | Memory coverage stats          |
| budgetUsage           | BudgetUsage    | No       | Budget allocation stats        |

**Freshness**: 60 seconds. Language server ignores data older than 60s.

---

### Context Health State

**Path**: `.specify/memory/context-health-state.json` **Written by**:
ContextHealthMonitor (extension) — EXISTING from Spec 012 **Read by**:
MCPToolHandler (language server)

| Field              | Type           | Required | Description                        |
| ------------------ | -------------- | -------- | ---------------------------------- |
| timestamp          | number         | Yes      | Unix ms of last health check       |
| status             | string         | Yes      | 'healthy' / 'warning' / 'critical' |
| utilizationPercent | number         | Yes      | Current utilization percentage     |
| tokensUsed         | number         | Yes      | Estimated total tokens used        |
| tokensLimit        | number         | Yes      | Effective context limit            |
| breakdown          | TokenBreakdown | No       | Per-category token counts          |

**Freshness**: 30 seconds.

---

### Research Index

**Path**: `.specify/specs/{specId}/research.index.json` **Written by**:
ResearchChunker **Read by**: MCP tools (gofer_get_research_index,
gofer_load_research_chunk)

| Field       | Type           | Required | Description                      |
| ----------- | -------------- | -------- | -------------------------------- |
| sourceFile  | string         | Yes      | Path to research.md              |
| totalTokens | number         | Yes      | Total tokens in research.md      |
| chunkCount  | number         | Yes      | Number of chunks                 |
| created     | number         | Yes      | Unix ms when index was generated |
| chunks      | ChunkSummary[] | Yes      | Array of chunk summaries         |

Each ChunkSummary:

| Field    | Type     | Required | Description             |
| -------- | -------- | -------- | ----------------------- |
| id       | string   | Yes      | Unique chunk identifier |
| title    | string   | Yes      | Section heading         |
| tokens   | number   | Yes      | Estimated token count   |
| keywords | string[] | Yes      | Relevance keywords      |

---

### Memory Local Storage

**Path**: `.specify/memory/local.json` **Written by**: MemoryManager — EXISTING
**Read by**: MemoryManager

| Field    | Type     | Required | Description              |
| -------- | -------- | -------- | ------------------------ |
| version  | number   | Yes      | Schema version           |
| memories | Memory[] | Yes      | Array of stored memories |

---

### Observation Cache

**Path**: `.specify/memory/observation-cache/{observationId}.json` **Written
by**: ObservationMasker — EXISTING **Read by**: gofer_expand_observation MCP
tool

Each file contains one `ObservationEntry` object.

---

### Context Usage Log

**Path**: `.specify/logs/context-usage.jsonl` **Written by**: ContextUsageLogger
— EXISTING **Read by**: Analysis tools (manual)

Each line is a JSON object with:

| Field     | Type   | Required | Description                                  |
| --------- | ------ | -------- | -------------------------------------------- |
| timestamp | string | Yes      | ISO 8601 timestamp                           |
| sessionId | string | No       | Session identifier                           |
| eventType | string | Yes      | Event type (health_check, memory_save, etc.) |
| ...       | varies | No       | Event-specific fields                        |

---

## State Transitions

No new state machines. Existing task states (pending → in_progress → completed)
are unchanged.

## Persistence Directory Tree

```
.specify/
  memory/
    local.json                         # MemoryManager (created on first save)
    context-health-state.json          # ContextHealthMonitor (Spec 012)
    enriched-context.json              # NEW: ContextBridgeWriter
    observation-cache/                 # NEW dir: ObservationMasker
      {uuid}.json                      # Individual observation entries
    context-profiles.yaml              # EXISTING: StageContextProfile
    constitution.md                    # EXISTING: Project principles
  hints/
    global.md                          # EXISTING: Global hints
    README.md                          # EXISTING
    examples/                          # EXISTING: Example hint files
  specs/
    {specId}/
      research.md                      # EXISTING: Research document
      research.index.json              # NEW: Generated by ResearchChunker
      spec.md                          # EXISTING
      plan.md                          # EXISTING
      tasks.md                         # EXISTING
  logs/
    context-usage.jsonl                # ContextUsageLogger (created on first event)
```
