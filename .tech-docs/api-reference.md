---
generated: true
generated_at: "2026-05-13T18:17:29.824Z"
source_commit: "cc10762094a3ecae3428cd8b60bfd1f2ec4aa00c"
---
# API Reference

## Overview

Gofer does not expose REST HTTP endpoints. Instead, it provides two
protocol-based APIs:

1. **MCP (Model Context Protocol)** - 40+ tools for AI assistants (Claude Code,
   Copilot, etc.)
2. **LSP (Language Server Protocol)** - Custom methods for extension-server
   communication

All communication happens via JSON-RPC over stdio/IPC channels.

## MCP Tools (Model Context Protocol)

AI assistants interact with Gofer via MCP tools. These tools are implemented in
`language-server/src/mcp/toolHandler.ts`.

### Spec Management Tools

#### `gofer_get_specs`

**Purpose:** List all specifications and their tasks

**Parameters:** None

**Returns:**

```json
{
  "specs": [
    {
      "id": "001-authentication",
      "title": "User Authentication System",
      "status": "in-progress",
      "tasks": [
        {
          "id": "FR-001",
          "description": "Implement login endpoint",
          "status": "completed",
          "dependencies": []
        },
        {
          "id": "FR-002",
          "description": "Add JWT middleware",
          "status": "in-progress",
          "dependencies": ["FR-001"]
        }
      ]
    }
  ]
}
```

**Use Case:** Initial discovery - AI discovers available work

---

#### `gofer_get_next_task`

**Purpose:** Get the next task to work on based on dependency order

**Parameters:**

```json
{
  "spec_id": "001-authentication" // Optional - defaults to current spec
}
```

**Returns:**

```json
{
  "task": {
    "id": "FR-002",
    "description": "Add JWT middleware",
    "status": "pending",
    "dependencies": ["FR-001"],
    "estimatedTokens": 50000,
    "context": {
      "spec": "...",
      "plan": "...",
      "research": "...",
      "relatedCode": "..."
    }
  }
}
```

**Use Case:** Task selection - AI picks next task in dependency order

---

#### `gofer_execute_task`

**Purpose:** Mark a task as in-progress and receive full context

**Parameters:**

```json
{
  "task_id": "FR-002",
  "spec_id": "001-authentication"
}
```

**Returns:**

```json
{
  "success": true,
  "task": {
    "id": "FR-002",
    "description": "Add JWT middleware",
    "status": "in-progress",
    "startedAt": "2026-04-30T22:50:00Z"
  },
  "context": {
    "spec": "# Spec content...",
    "plan": "# Plan content...",
    "research": "# Research content...",
    "constitution": "# Constitution...",
    "hints": ["Consider rate limiting", "Use bcrypt for passwords"],
    "relevantCode": {
      "src/auth.ts": "...",
      "src/middleware.ts": "..."
    }
  }
}
```

**Use Case:** Task execution - AI starts working on a task

---

#### `gofer_update_task_status`

**Purpose:** Update task status (completed/failed)

**Parameters:**

```json
{
  "task_id": "FR-002",
  "spec_id": "001-authentication",
  "status": "completed", // or "failed"
  "notes": "Implemented JWT middleware with 15min expiry"
}
```

**Returns:**

```json
{
  "success": true,
  "nextTask": {
    "id": "FR-003",
    "description": "Add refresh token endpoint"
  }
}
```

**Use Case:** Task completion - AI marks task done, gets next task

---

### Validation Tools

#### `gofer_validate_code`

**Purpose:** Validate code against constitution principles

**Parameters:**

```json
{
  "files": ["src/auth.ts", "src/middleware.ts"],
  "spec_id": "001-authentication"
}
```

**Returns:**

```json
{
  "valid": false,
  "violations": [
    {
      "file": "src/auth.ts",
      "line": 42,
      "severity": "error",
      "rule": "no-hardcoded-secrets",
      "message": "Found hardcoded API key on line 42"
    }
  ],
  "score": 85, // Out of 100
  "recommendations": [
    "Move API keys to environment variables",
    "Add input validation to login endpoint"
  ]
}
```

**Use Case:** Quality gate - AI validates work before marking complete

---

#### `gofer_run_tests`

**Purpose:** Execute test suite (auto-detects vitest/jest/pytest)

**Parameters:**

```json
{
  "spec_id": "001-authentication",
  "testPattern": "auth.test.ts" // Optional - defaults to all tests
}
```

**Returns:**

```json
{
  "success": true,
  "results": {
    "passed": 42,
    "failed": 2,
    "skipped": 0,
    "duration": 1234,
    "failures": [
      {
        "test": "should reject invalid JWT",
        "file": "tests/auth.test.ts",
        "error": "Expected 401, got 500"
      }
    ]
  },
  "coverage": {
    "lines": 85.2,
    "branches": 78.9,
    "functions": 90.1
  }
}
```

**Use Case:** Test verification - AI runs tests to confirm implementation

---

### Context Management Tools

#### `gofer_get_context_health`

**Purpose:** Get current context window utilization

**Parameters:** None

**Returns:**

```json
{
  "utilization": 0.67, // 67% of context window used
  "tokens": {
    "used": 134000,
    "total": 200000,
    "breakdown": {
      "spec": 15000,
      "plan": 8000,
      "research": 30000,
      "memory": 25000,
      "code": 40000,
      "conversation": 16000
    }
  },
  "recommendation": "Consider compaction - approaching 65% threshold"
}
```

**Use Case:** Context awareness - AI monitors context health

---

#### `gofer_trigger_handoff`

**Purpose:** Trigger auto-context-continuity (save/resume)

**Parameters:**

```json
{
  "reason": "approaching_limit", // or "manual_request"
  "saveCheckpoint": true
}
```

**Returns:**

```json
{
  "success": true,
  "checkpointFile": ".specify/checkpoints/2026-04-30T22-50-00.md",
  "resumeCommand": "/8_gofer_resume",
  "estimatedContextReduction": 0.6 // Expect 60% reduction
}
```

**Use Case:** Context continuity - AI triggers save/resume cycle

---

### Research Chunking Tools

#### `gofer_get_research_index`

**Purpose:** Get index of research.md chunks for progressive loading

**Parameters:**

```json
{
  "spec_id": "001-authentication"
}
```

**Returns:**

```json
{
  "chunks": [
    {
      "id": "chunk-0",
      "title": "Authentication Patterns",
      "sizeBytes": 48000,
      "tokens": 12000,
      "sections": ["JWT Overview", "OAuth 2.0 Comparison"]
    },
    {
      "id": "chunk-1",
      "title": "Security Best Practices",
      "sizeBytes": 52000,
      "tokens": 13000,
      "sections": ["Password Hashing", "Rate Limiting"]
    }
  ],
  "totalChunks": 2,
  "totalBytes": 100000
}
```

**Use Case:** Progressive loading - AI loads research on-demand

---

#### `gofer_load_research_chunk`

**Purpose:** Load a specific research chunk

**Parameters:**

```json
{
  "spec_id": "001-authentication",
  "chunk_id": "chunk-0"
}
```

**Returns:**

```json
{
  "content": "# Authentication Patterns\n\n## JWT Overview\n...",
  "tokens": 12000,
  "metadata": {
    "chunkId": "chunk-0",
    "totalChunks": 2
  }
}
```

**Use Case:** Lazy loading - AI loads only relevant research sections

---

### Observation Management Tools

#### `gofer_peek_observation`

**Purpose:** Preview an observation without loading it into context

**Parameters:**

```json
{
  "observation_id": "obs-1234"
}
```

**Returns:**

```json
{
  "preview": "First 500 characters of observation...",
  "metadata": {
    "timestamp": "2026-04-30T22:45:00Z",
    "tokens": 5000,
    "masked": false
  }
}
```

---

#### `gofer_fold_observation`

**Purpose:** Mask/collapse an observation to save context

**Parameters:**

```json
{
  "observation_id": "obs-1234",
  "reason": "no_longer_relevant"
}
```

**Returns:**

```json
{
  "success": true,
  "tokensSaved": 5000
}
```

---

#### `gofer_grep_observations`

**Purpose:** Search across observations by pattern

**Parameters:**

```json
{
  "pattern": "error|exception",
  "caseSensitive": false,
  "maxResults": 10
}
```

**Returns:**

```json
{
  "matches": [
    {
      "observation_id": "obs-5678",
      "line": 42,
      "snippet": "... ERROR: Connection timeout ...",
      "context": "Full error stack trace"
    }
  ]
}
```

---

### Context REPL Tools (Progressive Context Management)

#### `gofer_context_peek`

**Purpose:** Preview a context section without loading

**Parameters:**

```json
{
  "section": "research" | "memory" | "code" | "spec" | "plan",
  "maxTokens": 1000
}
```

**Returns:**

```json
{
  "preview": "First 1000 tokens...",
  "totalTokens": 15000,
  "summary": "Research covers JWT patterns, OAuth comparison, security best practices"
}
```

---

#### `gofer_context_grep`

**Purpose:** Search context by pattern

**Parameters:**

```json
{
  "pattern": "authentication",
  "sections": ["research", "spec"],
  "caseSensitive": false
}
```

**Returns:**

```json
{
  "matches": [
    {
      "section": "research",
      "line": 15,
      "snippet": "...JWT authentication provides..."
    }
  ]
}
```

---

#### `gofer_context_fold`

**Purpose:** Collapse a context section to save tokens

**Parameters:**

```json
{
  "section": "research",
  "keepSummary": true
}
```

**Returns:**

```json
{
  "success": true,
  "tokensBefore": 30000,
  "tokensAfter": 500,
  "summary": "Research on JWT authentication, OAuth 2.0, security patterns"
}
```

---

#### `gofer_context_expand`

**Purpose:** Expand a previously folded section

**Parameters:**

```json
{
  "section": "research"
}
```

**Returns:**

```json
{
  "success": true,
  "tokensAdded": 29500,
  "content": "# Research\n\n..."
}
```

---

#### `gofer_context_undo`

**Purpose:** Undo last context operation

**Parameters:** None

**Returns:**

```json
{
  "success": true,
  "undoneOperation": "fold:research",
  "tokensRestored": 29500
}
```

---

#### `gofer_context_history`

**Purpose:** Show context operation history

**Parameters:** None

**Returns:**

```json
{
  "operations": [
    {
      "timestamp": "2026-04-30T22:48:00Z",
      "operation": "fold",
      "section": "research",
      "tokenDelta": -29500
    },
    {
      "timestamp": "2026-04-30T22:50:00Z",
      "operation": "expand",
      "section": "memory",
      "tokenDelta": +12000
    }
  ]
}
```

---

#### `gofer_context_repl`

**Purpose:** Batch execute multiple context operations

**Parameters:**

```json
{
  "operations": [
    { "action": "fold", "section": "research" },
    { "action": "expand", "section": "memory" },
    { "action": "peek", "section": "code", "maxTokens": 1000 }
  ]
}
```

**Returns:**

```json
{
  "results": [
    { "success": true, "tokensSaved": 29500 },
    { "success": true, "tokensAdded": 12000 },
    { "preview": "First 1000 tokens of code..." }
  ],
  "netTokenChange": -17500
}
```

---

### Code Quality Tools

#### `gofer_check_slop`

**Purpose:** Detect code quality issues (console.log, debugger, @ts-ignore)

**Parameters:**

```json
{
  "files": ["src/**/*.ts"],
  "autoFix": false
}
```

**Returns:**

```json
{
  "issues": [
    {
      "file": "src/auth.ts",
      "line": 42,
      "type": "console.log",
      "severity": "warning"
    },
    {
      "file": "src/middleware.ts",
      "line": 15,
      "type": "debugger",
      "severity": "error"
    }
  ],
  "summary": {
    "totalIssues": 2,
    "byType": {
      "console.log": 1,
      "debugger": 1,
      "@ts-ignore": 0
    }
  }
}
```

---

## LSP Custom Methods

These methods are used for extension-server communication, not directly by AI
assistants.

### `gofer/getSpecs`

**Purpose:** Get spec list for UI tree view

**Parameters:** None

**Returns:** Array of spec objects with tree structure

**Used By:** ProgressProvider.ts

---

### `gofer/executeTask`

**Purpose:** Extension request to execute a task

**Parameters:**

```json
{
  "taskId": "FR-002",
  "specId": "001-authentication"
}
```

**Used By:** Extension command handlers

---

### `gofer/updateTaskStatus`

**Purpose:** Extension request to update task status

**Parameters:**

```json
{
  "taskId": "FR-002",
  "specId": "001-authentication",
  "status": "completed"
}
```

**Used By:** Extension command handlers

---

### `gofer/taskProgress` (Notification)

**Purpose:** Server notifies extension of task progress

**Direction:** Server → Extension (notification, not request)

**Payload:**

```json
{
  "taskId": "FR-002",
  "specId": "001-authentication",
  "progress": 0.75,
  "message": "Implementation 75% complete"
}
```

**Used By:** Extension UI updates (progress bars, status bar)

---

## External APIs

Gofer integrates with external APIs for billing/usage data and notifications.

### Anthropic Admin API

**Base URL:** [https://api.anthropic.com](https://api.anthropic.com)

**Endpoints Used:**

#### GET `/v1/organization/billing/usage`

**Headers:**

```
x-api-key: {gofer.anthropicAdminApiKey}
```

**Query Parameters:**

```
start_date: 2026-04-01
end_date: 2026-04-30
```

**Response:**

```json
{
  "usage": [
    {
      "date": "2026-04-30",
      "model": "claude-3-5-sonnet-20241022",
      "input_tokens": 1500000,
      "output_tokens": 500000
    }
  ]
}
```

**Used By:** `extension/src/autonomous/UsageApiClient.ts`

**Polling Interval:** 60s minimum (Anthropic recommendation)

---

#### GET `/v1/organization/billing/costs`

**Headers:**

```
x-api-key: {gofer.anthropicAdminApiKey}
```

**Response:**

```json
{
  "costs": [
    {
      "date": "2026-04-30",
      "model": "claude-3-5-sonnet-20241022",
      "cost_usd": 15.75
    }
  ]
}
```

**Used By:** `extension/src/autonomous/UsageApiClient.ts`

---

### OpenAI Admin API

**Base URL:** [https://api.openai.com](https://api.openai.com)

**Endpoints Used:**

#### GET `/v1/usage`

**Headers:**

```
Authorization: Bearer {gofer.openaiAdminApiKey}
```

**Query Parameters:**

```
start_date: 2026-04-01
end_date: 2026-04-30
```

**Response:**

```json
{
  "data": [
    {
      "date": "2026-04-30",
      "model": "gpt-4",
      "tokens": 2000000,
      "cost_usd": 40.0
    }
  ]
}
```

**Used By:** `extension/src/autonomous/UsageApiClient.ts`

**Required Scope:** `api.usage.read`

---

### GitHub Releases API

**Base URL:** [https://api.github.com](https://api.github.com)

**Endpoint:** `GET /repos/enterpriseaigroup/tech-docs/releases/latest`

**No authentication required** (public repository)

**Response:**

```json
{
  "tag_name": "v3.1.0",
  "name": "Gofer 3.1.0",
  "assets": [
    {
      "name": "gofer-3.1.0.vsix",
      "browser_download_url": "https://github.com/enterpriseaigroup/tech-docs/releases/download/v3.1.0/gofer-3.1.0.vsix"
    }
  ]
}
```

**Used By:** `extension/src/autoUpdater.ts`

**Polling Interval:** 24 hours

---

### Twilio WhatsApp API

**Purpose:** Optional notifications from CLI orchestrator

**Configuration:** Environment variables (`TWILIO_*`)

**Used By:** `src/utils/NotificationService.ts`

**Not used by extension** - only by standalone orchestrator

---

## Error Responses

All MCP tools return consistent error format:

```json
{
  "isError": true,
  "code": "SPEC_NOT_FOUND" | "TASK_NOT_FOUND" | "INVALID_PARAMS" | "INTERNAL_ERROR",
  "message": "Human-readable error message",
  "details": {
    "specId": "001-authentication",
    "availableSpecs": ["002-dashboard", "003-api"]
  }
}
```

**Common Error Codes:**

- `SPEC_NOT_FOUND` - Spec ID not found in `.specify/specs/`
- `TASK_NOT_FOUND` - Task ID not found in tasks.md
- `INVALID_PARAMS` - Missing or invalid parameters
- `INTERNAL_ERROR` - Server error (logged to output channel)
- `VALIDATION_FAILED` - Constitution validation failed
- `TESTS_FAILED` - Test suite failed
- `CONTEXT_OVERFLOW` - Context window exceeded
- `SCOPE_VIOLATION` - ScopeGuard blocked file access
- `BUDGET_EXCEEDED` - Cost budget limit reached

---

## Authentication & Authorization

**MCP Tools:** No authentication required - runs in trusted VSCode extension
context

**LSP Methods:** No authentication required - communication over stdio/IPC

**External APIs:**

- Anthropic Admin API: Requires admin API key (`sk-ant-admin-...`)
- OpenAI Admin API: Requires admin API key with `api.usage.read` scope
- GitHub API: No authentication (public repository)
- Twilio API: Account SID + Auth Token (optional feature)

**API Keys Storage:** VSCode settings (per-user or per-workspace), not committed
to git

---

## Rate Limits

**MCP Tools:** No rate limits (local execution)

**External APIs:**

- Anthropic Admin API: 60s minimum polling interval recommended
- OpenAI Admin API: Standard rate limits apply
- GitHub API: 60 requests/hour (unauthenticated), 5000 requests/hour
  (authenticated)

**File System:**

- JSONL logs: Append-only, no read rate limits
- Spec parsing: Cached in memory, invalidated on file change

---

## Versioning

**MCP Protocol Version:** Experimental (VSCode MCP support)

**LSP Protocol Version:** 3.17

**API Stability:**

- MCP tools: Stable since v3.0
- LSP methods: Stable since v2.0
- External API integrations: Follows provider versioning

**Breaking Changes:** Documented in CHANGELOG.md
