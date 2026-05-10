# MCP Tools Contract: Context Health Enhancement

## Overview

This document defines the MCP (Model Context Protocol) tools added for context
health and observation management. These tools follow the existing Gofer MCP
naming convention (`gofer_*`).

---

## gofer_expand_observation

Retrieves the full content of a masked observation.

### Tool Definition

```json
{
  "name": "gofer_expand_observation",
  "description": "Retrieve the full content of a previously masked observation. Use this when you need to see details that were summarized in a placeholder.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "observationId": {
        "type": "string",
        "description": "The unique ID of the observation to expand (from the placeholder)"
      }
    },
    "required": ["observationId"]
  }
}
```

### Request

```json
{
  "observationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Response (Success)

```json
{
  "success": true,
  "observation": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "file_read",
    "timestamp": 1706198400000,
    "turnNumber": 5,
    "tokenEstimate": 1500,
    "content": "// Full file content here...\nexport class UserService {\n  ...\n}",
    "metadata": {
      "filePath": "src/services/UserService.ts",
      "lineCount": 150
    }
  }
}
```

### Response (Not Found)

```json
{
  "success": false,
  "error": "Observation not found",
  "errorCode": "OBSERVATION_NOT_FOUND"
}
```

### Errors

| Code                   | Description                            |
| ---------------------- | -------------------------------------- |
| OBSERVATION_NOT_FOUND  | Observation ID does not exist in cache |
| INVALID_OBSERVATION_ID | Observation ID is not a valid UUID     |
| CACHE_ERROR            | Error reading from observation cache   |

---

## gofer_get_context_health

Returns the current context health status with breakdown.

### Tool Definition

```json
{
  "name": "gofer_get_context_health",
  "description": "Check the current context window health status, including token usage breakdown and recommendations.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "includeBreakdown": {
        "type": "boolean",
        "description": "Include detailed token breakdown by category",
        "default": true
      }
    },
    "required": []
  }
}
```

### Request

```json
{
  "includeBreakdown": true
}
```

### Response

```json
{
  "success": true,
  "health": {
    "status": "warning",
    "utilizationPercent": 58.5,
    "tokensUsed": 70200,
    "tokensLimit": 120000,
    "breakdown": {
      "specArtifacts": 15000,
      "memories": 8000,
      "hints": 2000,
      "observations": 25000,
      "systemFiles": 5000,
      "conversation": 15200
    },
    "recommendations": [
      "Consider masking older observations to free up context",
      "Research document consuming 15k tokens - consider chunking"
    ],
    "timestamp": 1706198400000
  }
}
```

### Errors

| Code               | Description                      |
| ------------------ | -------------------------------- |
| HEALTH_CHECK_ERROR | Error calculating context health |

---

## gofer_load_research_chunk

Loads a specific chunk of a research document by ID.

### Tool Definition

```json
{
  "name": "gofer_load_research_chunk",
  "description": "Load a specific section of a research document. Use this to access detailed research without loading the entire document.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "specId": {
        "type": "string",
        "description": "The spec ID containing the research document"
      },
      "chunkId": {
        "type": "string",
        "description": "The chunk ID to load (from research index)"
      }
    },
    "required": ["specId", "chunkId"]
  }
}
```

### Request

```json
{
  "specId": "011-context-health-recursive-memory",
  "chunkId": "chunk-mit-rlm"
}
```

### Response (Success)

```json
{
  "success": true,
  "chunk": {
    "id": "chunk-mit-rlm",
    "sectionTitle": "MIT Recursive Language Models (RLMs)",
    "content": "### Key Research\n\n**\"Recursive Language Models\"** by Alex Zhang...",
    "tokenEstimate": 2100,
    "relevanceKeywords": ["MIT", "RLM", "recursive", "context folding"],
    "order": 1
  }
}
```

### Response (Not Found)

```json
{
  "success": false,
  "error": "Chunk not found",
  "errorCode": "CHUNK_NOT_FOUND"
}
```

### Errors

| Code              | Description                                       |
| ----------------- | ------------------------------------------------- |
| INVALID_SPEC_ID   | Spec ID format invalid or contains path traversal |
| SPEC_NOT_FOUND    | Spec directory does not exist                     |
| NO_RESEARCH_INDEX | Research index not found for spec                 |
| CHUNK_NOT_FOUND   | Chunk ID does not exist in index                  |

---

## gofer_get_research_index

Returns the index of available research chunks for a spec.

### Tool Definition

```json
{
  "name": "gofer_get_research_index",
  "description": "Get the index of available research document chunks. Use this to see what research sections are available before loading specific chunks.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "specId": {
        "type": "string",
        "description": "The spec ID to get research index for"
      }
    },
    "required": ["specId"]
  }
}
```

### Request

```json
{
  "specId": "011-context-health-recursive-memory"
}
```

### Response

```json
{
  "success": true,
  "index": {
    "sourceFile": ".specify/specs/011-context-health-recursive-memory/research.md",
    "totalTokens": 12500,
    "chunkCount": 8,
    "created": 1706198400000,
    "chunks": [
      {
        "id": "chunk-mit-rlm",
        "title": "MIT Recursive Language Models (RLMs)",
        "tokens": 2100,
        "keywords": ["MIT", "RLM", "recursive"]
      },
      {
        "id": "chunk-observation-masking",
        "title": "Industry Context Management Approaches",
        "tokens": 1800,
        "keywords": ["observation", "masking", "JetBrains"]
      }
    ]
  }
}
```

### Errors

| Code             | Description                   |
| ---------------- | ----------------------------- |
| INVALID_SPEC_ID  | Spec ID format invalid        |
| SPEC_NOT_FOUND   | Spec directory does not exist |
| NO_RESEARCH_FILE | research.md not found         |
| INDEX_ERROR      | Error generating index        |

---

## gofer_trigger_handoff

Manually triggers a session handoff with context preservation.

### Tool Definition

```json
{
  "name": "gofer_trigger_handoff",
  "description": "Trigger a session handoff to preserve progress before context overflow. Creates a handoff document with current state.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "reason": {
        "type": "string",
        "description": "Reason for the handoff",
        "enum": [
          "context_critical",
          "manual_request",
          "stage_complete",
          "error_recovery"
        ]
      },
      "currentTask": {
        "type": "string",
        "description": "Current task ID if in implementation"
      },
      "notes": {
        "type": "string",
        "description": "Additional notes to include in handoff"
      }
    },
    "required": ["reason"]
  }
}
```

### Request

```json
{
  "reason": "context_critical",
  "currentTask": "T015",
  "notes": "Completed observation masking implementation, starting health monitor"
}
```

### Response

```json
{
  "success": true,
  "handoff": {
    "file": ".specify/specs/011-context-health-recursive-memory/session-handoff.md",
    "created": 1706198400000,
    "contextSnapshot": {
      "tokensUsed": 84000,
      "utilizationPercent": 70,
      "completedTasks": ["T001", "T002", "T003"],
      "currentTask": "T015",
      "stage": "implement"
    },
    "resumeCommand": "/8_gofer_resume --feature 011-context-health-recursive-memory"
  }
}
```

### Errors

| Code              | Description                     |
| ----------------- | ------------------------------- |
| HANDOFF_ERROR     | Error creating handoff document |
| NO_ACTIVE_FEATURE | No feature context to hand off  |

---

## Security Considerations

All MCP tools implement the same security measures as existing Gofer tools:

1. **Input Validation**: All inputs validated against schema before processing
2. **Path Traversal Prevention**: Spec IDs checked for `..`, `/`, `\` characters
3. **Rate Limiting**: Tools subject to existing MCP rate limits
4. **Error Sanitization**: Internal errors not exposed in responses

---

## Integration Notes

### Existing Tool Updates

The following existing tools may need minor updates to support context health:

| Tool                       | Update                                        |
| -------------------------- | --------------------------------------------- |
| `gofer_get_specs`          | Add optional `includeContextHealth` parameter |
| `gofer_execute_task`       | Track observation creation for masking        |
| `gofer_update_task_status` | Log context health at status changes          |

### Tool Discovery

New tools are registered in the MCP tool manifest alongside existing tools:

```typescript
// language-server/src/mcp/toolHandler.ts
const MCP_TOOLS = {
  // Existing tools
  getSpecs: 'gofer_get_specs',
  getNextTask: 'gofer_get_next_task',
  executeTask: 'gofer_execute_task',
  updateTaskStatus: 'gofer_update_task_status',
  validateCode: 'gofer_validate_code',
  runTests: 'gofer_run_tests',

  // New context health tools
  expandObservation: 'gofer_expand_observation',
  getContextHealth: 'gofer_get_context_health',
  loadResearchChunk: 'gofer_load_research_chunk',
  getResearchIndex: 'gofer_get_research_index',
  triggerHandoff: 'gofer_trigger_handoff',
};
```
