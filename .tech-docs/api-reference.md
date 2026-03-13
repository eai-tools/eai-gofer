---
generated: '2026-03-11T22:14:00Z'
source_commit: '29a322a5fd292b6346a0cf0d2ae981a59ffe4a4c'
---

# API Reference

## Model Context Protocol (MCP) Tools

Gofer exposes 6 MCP tools that AI assistants (Claude Code, GitHub Copilot) can
call directly.

### Tool Discovery

Tools are auto-registered in `.vscode/mcp.json` when running
`Gofer: Initialize Repository`.

```json
{
  "mcpServers": {
    "gofer": {
      "command": "node",
      "args": ["path/to/language-server/dist/server.js"],
      "transportType": "stdio"
    }
  }
}
```

---

## Tool: `gofer_get_specs`

**Description:** List all specifications and their tasks

**Parameters:** None

**Returns:**

```json
{
  "specs": [
    {
      "feature": "auth-001",
      "title": "User Authentication",
      "status": "in-progress",
      "path": ".specify/specs/auth-001/spec.md",
      "tasks": [
        {
          "id": "FR-001",
          "description": "Create database schema",
          "status": "completed",
          "dependencies": []
        },
        {
          "id": "FR-002",
          "description": "Implement user model",
          "status": "in-progress",
          "dependencies": ["FR-001"]
        }
      ]
    }
  ]
}
```

**Use Case:** AI assistant queries available work

**Example:**

```typescript
// Claude Code calls this internally
const specs = await mcp.call_tool('gofer_get_specs', {});
```

---

## Tool: `gofer_get_next_task`

**Description:** Get the next task to work on based on dependencies

**Parameters:**

```json
{
  "feature": "auth-001" // Optional: filter by feature
}
```

**Returns:**

```json
{
  "task": {
    "id": "FR-002",
    "description": "Implement user model (depends on FR-001)",
    "status": "pending",
    "dependencies": ["FR-001"],
    "context": {
      "spec": "Full specification text...",
      "plan": "Implementation plan...",
      "constitution": "Project principles..."
    }
  }
}
```

**Behavior:**

- Returns only tasks whose dependencies are completed
- Returns `null` if no tasks are ready
- Prioritizes by order in spec.md

**Use Case:** AI assistant asks "what should I work on next?"

---

## Tool: `gofer_execute_task`

**Description:** Mark task as in-progress and get full context

**Parameters:**

```json
{
  "feature": "auth-001",
  "taskId": "FR-002"
}
```

**Returns:**

```json
{
  "task": {
    "id": "FR-002",
    "description": "Implement user model",
    "status": "in-progress"
  },
  "context": {
    "spec": "# User Authentication\n\n...",
    "plan": "# Implementation Plan\n\n...",
    "tasks": "# Tasks\n\n...",
    "constitution": "# Project Principles\n\n...",
    "hints": "# Hints\n\nUse bcrypt for passwords..."
  }
}
```

**Side Effects:**

- Updates task status to `in-progress` in `tasks.md`
- Creates `.specify/logs/task-execution.jsonl` entry
- Triggers context health monitoring

**Use Case:** AI assistant starts working on a task

---

## Tool: `gofer_update_task_status`

**Description:** Mark task as completed or failed

**Parameters:**

```json
{
  "feature": "auth-001",
  "taskId": "FR-002",
  "status": "completed", // or "failed"
  "notes": "Optional completion notes"
}
```

**Returns:**

```json
{
  "success": true,
  "task": {
    "id": "FR-002",
    "status": "completed"
  }
}
```

**Side Effects:**

- Updates task status in `tasks.md`
- Logs completion in `.specify/logs/task-execution.jsonl`
- Triggers spec refresh in UI
- Updates progress panel

**Use Case:** AI assistant completes a task

---

## Tool: `gofer_validate_code`

**Description:** Validate code against project constitution

**Parameters:**

```json
{
  "filePath": "src/models/User.ts",
  "feature": "auth-001"
}
```

**Returns:**

```json
{
  "valid": false,
  "violations": [
    {
      "rule": "All functions must have TypeScript types",
      "line": 42,
      "severity": "error",
      "message": "Function 'hashPassword' missing return type"
    }
  ],
  "score": 85
}
```

**Constitution Sources:**

1. `.specify/memory/constitution.md` - Project principles
2. Spec-specific `## Protected Boundaries` sections

**Use Case:** AI assistant validates code before completing task

---

## Tool: `gofer_run_tests`

**Description:** Execute Playwright tests for a feature

**Parameters:**

```json
{
  "feature": "auth-001",
  "testPattern": "auth.spec.ts" // Optional
}
```

**Returns:**

```json
{
  "success": true,
  "results": {
    "passed": 15,
    "failed": 0,
    "skipped": 2,
    "duration": 3421,
    "details": [
      {
        "test": "should login with valid credentials",
        "status": "passed",
        "duration": 234
      }
    ]
  }
}
```

**Behavior:**

- Runs tests via Playwright
- Captures stdout/stderr
- Returns structured results

**Use Case:** AI assistant runs tests after implementing code

---

## Language Server Protocol (LSP) - Internal

### Notifications (Extension → Language Server)

#### `workspace/didChangeConfiguration`

Notifies server of config changes.

**Payload:**

```json
{
  "settings": {
    "gofer": {
      "autoValidate": true,
      "preferredAI": "claude"
    }
  }
}
```

#### `textDocument/didChange`

Notifies server of spec file edits.

**Payload:**

```json
{
  "textDocument": {
    "uri": "file:///path/.specify/specs/auth-001/spec.md"
  },
  "contentChanges": [...]
}
```

### Requests (Extension → Language Server)

#### `workspace/executeCommand`

Execute MCP tool on behalf of extension.

**Request:**

```json
{
  "command": "gofer.executeMCPTool",
  "arguments": ["gofer_get_specs", {}]
}
```

**Response:**

```json
{
  "specs": [...]
}
```

---

## VSCode Commands (Extension API)

User-facing commands registered by the extension.

### Repository Management

| Command              | Description                | Keyboard         |
| -------------------- | -------------------------- | ---------------- |
| `gofer.initialize`   | Initialize .specify folder | Ctrl+Shift+Alt+I |
| `gofer.upgrade`      | Upgrade legacy JSON specs  | -                |
| `gofer.refreshSpecs` | Reload specs from disk     | Ctrl+Shift+Alt+R |

### Specification Management

| Command                        | Description               | Keyboard         |
| ------------------------------ | ------------------------- | ---------------- |
| `gofer.createSpec`             | Create new specification  | Ctrl+Shift+Alt+N |
| `gofer.openSpec`               | Open specification file   | -                |
| `gofer.showSpecDetails`        | Show spec details panel   | -                |
| `gofer.executeAllPendingSpecs` | Execute all pending specs | -                |

### UI Panels

| Command                   | Description               | Keyboard         |
| ------------------------- | ------------------------- | ---------------- |
| `gofer.showProgress`      | Show progress panel       | Ctrl+Shift+Alt+P |
| `gofer.showConstitution`  | Show constitution panel   | Ctrl+Shift+Alt+C |
| `gofer.showContextWindow` | Show context window panel | -                |

### Memory Management

| Command                       | Description             |
| ----------------------------- | ----------------------- |
| `gofer.remember`              | Add memory entry        |
| `gofer.searchMemory`          | Search memories         |
| `gofer.forgetMemory`          | Delete memory           |
| `gofer.clearMemory`           | Clear all memories      |
| `gofer.viewMemories`          | View all memories       |
| `gofer.viewCompactionHistory` | View compaction history |

### Claude Code Integration

| Command                  | Description                |
| ------------------------ | -------------------------- |
| `gofer.startClaudeCode`  | Start Claude Code terminal |
| `gofer.stopClaudeCode`   | Stop Claude Code terminal  |
| `gofer.pauseClaudeCode`  | Pause (send ESC)           |
| `gofer.resumeClaudeCode` | Resume monitoring          |
| `gofer.resumeSession`    | Resume from checkpoint     |

### Quality & Validation

| Command                   | Description                      |
| ------------------------- | -------------------------------- |
| `gofer.checkForSlop`      | Check for AI code quality issues |
| `gofer.showCouncilStatus` | Show LLM council status          |
| `gofer.fixSpecPaths`      | Fix spec path references         |

### Updates

| Command                 | Description                 | Keyboard         |
| ----------------------- | --------------------------- | ---------------- |
| `gofer.checkForUpdates` | Check for extension updates | Ctrl+Shift+Alt+U |
| `gofer.updateNow`       | Install latest version      | -                |
| `gofer.updateTemplates` | Update spec templates       | -                |

---

## Authentication

### MCP Tools

**Authentication:** None required for MCP tools **Authorization:** File system
permissions only **Rate Limiting:** None

### External APIs

**Anthropic API:**

- **Key:** `gofer.anthropicApiKey` setting
- **Usage:** Orchestrator, autonomous mode, LLM council
- **Models:** Claude 3.5 Sonnet, Claude 3.5 Haiku

**Google AI API:**

- **Key:** `gofer.googleApiKey` setting
- **Usage:** LLM council (optional)
- **Models:** Gemini 1.5 Pro, Gemini 1.5 Flash

**OpenAI API:**

- **Key:** `gofer.openaiApiKey` setting
- **Usage:** LLM council (optional)
- **Models:** GPT-4, GPT-4 Turbo

---

## Error Handling

### MCP Tool Errors

```typescript
interface MCPError {
  code: string;
  message: string;
  statusCode?: number;
}
```

**Error Codes:**

| Code               | Status | Description                   |
| ------------------ | ------ | ----------------------------- |
| `VALIDATION_ERROR` | 400    | Invalid parameters            |
| `NOT_FOUND`        | 404    | Spec/task not found           |
| `FILE_READ_ERROR`  | 500    | Failed to read spec file      |
| `PARSE_ERROR`      | 500    | Failed to parse YAML/markdown |
| `DEPENDENCY_ERROR` | 409    | Task dependencies not met     |

**Example Error:**

```json
{
  "code": "NOT_FOUND",
  "message": "Resource not found: auth-001/FR-999",
  "statusCode": 404
}
```

### LSP Errors

Standard LSP error codes (JSON-RPC 2.0):

- `-32700` - Parse error
- `-32600` - Invalid request
- `-32601` - Method not found
- `-32602` - Invalid params
- `-32603` - Internal error
