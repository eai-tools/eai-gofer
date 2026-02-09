# Data Model: Context Management Rubric 100%

## Modified Entities

### ObservationEntry (Modified)

| Field | Type | Required | Change | Description |
|-------|------|----------|--------|-------------|
| id | string (UUID) | Yes | Existing | Unique observation identifier |
| timestamp | number | Yes | Existing | Unix timestamp of creation |
| turnNumber | number | Yes | Existing | Turn when observation was tracked |
| type | ObservationType | Yes | Existing | file_read, command_output, search_result, test_output, api_response |
| contentHash | string | Yes | Existing | SHA-256 of originalContent |
| tokenEstimate | number | Yes | Existing | Estimated tokens (chars/4) |
| originalContent | string | Yes | Existing | Full tool output |
| summary | string | No | Existing | Optional human-readable summary |
| metadata | Record<string, unknown> | No | Existing | Tool-specific metadata |
| ~~masked~~ | ~~boolean~~ | — | **REMOVED** | Replaced by decayTier |
| decayTier | DecayTier | Yes | **NEW** | `'full'` \| `'key-points'` \| `'masked'` |
| keyPointsContent | string | No | **NEW** | Generated summary for key-points tier |
| keyPointsAt | number | No | **NEW** | Timestamp of key-points transition |
| maskedAt | number | No | Existing | Timestamp of masked transition |
| foldLevel | FoldLevel | No | **NEW** | `'collapsed'` \| `'summary'` \| `'expanded'` |

**Migration**: Legacy entries with `masked: true` → `decayTier: 'masked'`. Entries with `masked: false` → `decayTier: 'full'`.

### Memory (Modified)

| Field | Type | Required | Change | Description |
|-------|------|----------|--------|-------------|
| id | string (UUID) | Yes | Existing | Unique memory identifier |
| content | string | Yes | Existing | Memory content |
| category | MemoryCategory | Yes | Existing | discovery, decision, pattern, etc. |
| tags | string[] | Yes | Existing | Searchable tags |
| priority | number | Yes | Existing | Computed priority score |
| usedCount | number | Yes | Existing | Times used in context |
| lastUsedAt | number | No | Existing | Last usage timestamp |
| notePath | string | No | **NEW** | Path to companion markdown file for content >500 chars |
| relatedMemories | RelatedMemory[] | No | **NEW** | Top 3 related memory IDs with similarity scores |

### RelatedMemory (New)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| memoryId | string | Yes | Related memory UUID |
| similarity | number | Yes | Jaccard + category similarity score (0-1) |

## New Entities

### DelegationRecommendation

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timestamp | number | Yes | When recommendation was generated |
| utilization | number | Yes | Context utilization percentage at time |
| threshold | number | Yes | Stage delegation threshold |
| recommendedAgent | string | Yes | Agent type (locator, analyzer, pattern-finder) |
| taskCategory | string | Yes | Type of work to delegate |
| reason | string | Yes | Human-readable explanation |

### ResearchSummary (Cached)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| specId | string | Yes | Spec ID this summary belongs to |
| chunkId | string | Yes | Research chunk ID |
| summary | string | Yes | 1-2 sentence LLM or deterministic summary |
| memoryId | string | No | ID of discovery memory created from this summary |
| generatedAt | number | Yes | Timestamp of generation |
| source | string | Yes | `'llm'` or `'deterministic'` |

## State Transitions

### Observation Decay

```
   Turn 0          Turn N*0.6        Turn N
     │                 │                │
     ▼                 ▼                ▼
   FULL ──────────► KEY-POINTS ────► MASKED
  (complete)        (summary)       (placeholder)
     │                                  │
     └─── [error detected] ──► PRESERVED (never transitions)
```

Where N = stage-specific `observationWindow` (Research=15, Implement=10, etc.)

### Observation Fold (Orthogonal to Decay)

```
  EXPANDED ◄──────► SUMMARY ◄──────► COLLAPSED
  (show full)       (show summary)    (show ID only)
```

Fold level is user-controlled via MCP tools, independent of decay tier.
