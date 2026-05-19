---
generated: true
generated_at: "2026-05-19T18:18:46.548Z"
source_commit: "d2e265da14627f007f17ed8e89d6b201f4ce1ead"
---
# API Reference

## Overview

Gofer does not expose REST HTTP endpoints. Instead, it provides two protocol-based APIs:

1. **MCP (Model Context Protocol)** - 29 tools for AI assistants (Claude Code, GitHub Copilot, OpenAI Codex)
2. **LSP (Language Server Protocol)** - Custom methods for extension-server communication
3. **VS Code Commands** - 67 commands exposed via Command Palette and UI integration

All communication happens via JSON-RPC over stdio/IPC channels.

## MCP Tools (Model Context Protocol)

AI assistants interact with Gofer via MCP tools. These tools are implemented in `language-server/src/mcp/toolHandler.ts` and registered in `language-server/src/server.ts:164-178`.

### Workflow Tools

#### `gofer_get_specs`

**Purpose:** List all specifications and their tasks

**Parameters:** None

**Returns:**

```json
{
  "specs": [
    {
      "id": "031-skills-pipeline",
      "title": "Skills Pipeline Augmentation",
      "status": "completed",
      "created": "2026-04-30",
      "priority": "medium",
      "tasks": [
        {
          "id": "T001",
          "description": "Define skill composition API",
          "status": "completed",
          "dependencies": []
        }
      ]
    }
  ]
}
```

**Security:** No authentication required (local tool)

**File:** `language-server/src/mcp/toolHandler.ts:448-515`

---

#### `gofer_get_next_task`

**Purpose:** Get the next available task to work on (respects dependencies)

**Parameters:** None

**Returns:**

```json
{
  "specId": "031-skills-pipeline",
  "taskId": "T002",
  "task": {
    "id": "T002",
    "description": "Implement SkillDispatcher service",
    "status": "pending",
    "dependencies": ["T001"],
    "phase": "1",
    "userStory": "US-1"
  },
  "spec": {
    "id": "031-skills-pipeline",
    "title": "Skills Pipeline Augmentation",
    "path": ".specify/specs/031-skills-pipeline/spec.md"
  }
}
```

**Behavior:**
- Filters for tasks with status `pending` or `in-progress`
- Respects dependency order (returns only tasks with completed dependencies)
- Returns null if no tasks available

**File:** `language-server/src/mcp/toolHandler.ts:517-585`

---

#### `gofer_execute_task`

**Purpose:** Execute a specific task from a specification

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `specId` | string | Yes | Specification identifier (alphanumeric + `-` `_`, ≤100 chars) |
| `taskId` | string | Yes | Task identifier (`T001`, `#1`, or `1`, ≤20 chars) |

**Returns:**

```json
{
  "spec": {
    "id": "031-skills-pipeline",
    "title": "Skills Pipeline Augmentation",
    "content": "# Feature Specification..."
  },
  "task": {
    "id": "T002",
    "description": "Implement SkillDispatcher service",
    "status": "in-progress",
    "phase": "1"
  },
  "constitution": "# Project Constitution\n\n## Principles...",
  "memories": [
    {
      "type": "procedural",
      "content": "Always use dependency injection for services",
      "relevance": 0.85
    }
  ],
  "hints": [
    {
      "type": "directory",
      "priority": 10,
      "content": "This directory uses TSyringe for DI"
    }
  ],
  "researchChunks": [
    {
      "id": "chunk-001",
      "title": "Service Architecture",
      "tokenEstimate": 1500
    }
  ],
  "memoryCoverage": {
    "coveredKeywords": ["service", "dispatcher", "injection"],
    "uncoveredKeywords": ["testing", "validation"],
    "coveragePercent": 45,
    "memoriesLoaded": 8,
    "researchLoadedForGaps": true
  },
  "testHarnessPath": ".specify/specs/031-skills-pipeline/test-harness.md"
}
```

**Context Enrichment:**
- Loads enriched context from `enriched-context.json` (60s freshness)
- If stale or missing, builds new context via ContextBuilder
- Memory-first loading: research chunks loaded only if memory coverage < 30%
- Includes constitution, memories (TF-IDF ranked), hints (priority-sorted)

**Security:**
- Validates `specId` (path traversal check, alphanumeric validation)
- Validates `taskId` (format validation)
- Logs to `.specify/logs/tool-audit.jsonl`

**File:** `language-server/src/mcp/toolHandler.ts:587-690`

---

#### `gofer_update_task_status`

**Purpose:** Update the status of a task

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `specId` | string | Yes | Specification identifier |
| `taskId` | string | Yes | Task identifier |
| `status` | string | Yes | New status: `pending`, `in-progress`, `completed`, `blocked` |

**Returns:**

```json
{
  "success": true,
  "task": {
    "id": "T002",
    "status": "completed",
    "updatedAt": "2026-05-18T18:30:00Z"
  }
}
```

**Side Effects:**
- Updates `tasks.md` checkbox (`[x]` for completed)
- Sends LSP notification `gofer/taskProgress` to refresh UI
- Triggers ProgressProvider tree view update (Harvey ball icons)

**File:** `language-server/src/mcp/toolHandler.ts:692-743`

---

### Context Management Tools

#### `gofer_get_context_health`

**Purpose:** Get current context health status with token breakdown

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeBreakdown` | boolean | No | Include detailed token breakdown (default: true) |

**Returns:**

```json
{
  "status": "warning",
  "utilization": 0.72,
  "totalTokens": 144000,
  "maxTokens": 200000,
  "breakdown": {
    "specArtifacts": 25000,
    "memories": 18000,
    "hints": 3000,
    "observations": 45000,
    "systemFiles": 12000,
    "conversation": 41000
  },
  "thresholds": {
    "healthy": 0.50,
    "warning": 0.70,
    "critical": 0.90
  },
  "accStage": 2,
  "recommendations": [
    "Consider masking old observations (Stage 2 active)",
    "Memory coverage at 45%, research chunks loaded"
  ]
}
```

**Status Values:**
- `healthy`: < 50% utilization
- `warning`: 50-70% utilization (ACC Stage 1 triggered at 70%)
- `critical`: > 70% utilization (ACC Stages 2-5 active)

**File:** `language-server/src/mcp/toolHandler.ts:745-810`

---

#### `gofer_expand_observation`

**Purpose:** Retrieve full content of a masked observation by ID

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `observationId` | string | Yes | UUID v4 observation identifier |

**Returns:**

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "type": "terminal_output",
  "content": "npm install completed successfully\n\npackages installed: 245\ntotal size: 125MB",
  "timestamp": "2026-05-18T18:15:00Z",
  "metadata": {
    "command": "npm install",
    "exitCode": 0
  }
}
```

**Use Case:** Restore masked observation when context space allows

**File:** `language-server/src/mcp/toolHandler.ts:812-847`

---

#### `gofer_peek_observation`

**Purpose:** Returns key-points or summary without full expansion

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `observationId` | string | Yes | UUID v4 observation identifier |

**Returns:**

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "summary": "npm install completed successfully (245 packages, 125MB)",
  "keyPoints": [
    "No errors or warnings",
    "All dependencies resolved",
    "Post-install scripts executed"
  ]
}
```

**File:** `language-server/src/mcp/toolHandler.ts:849-890`

---

### Context REPL Tools

#### `gofer_context_peek`

**Purpose:** Peek at specific section of current context state

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `section` | string | Yes | Section name: `spec`, `memories`, `hints`, `observations`, `constitution` |

**Returns:**

```json
{
  "section": "memories",
  "tokenCount": 18000,
  "itemCount": 12,
  "preview": "1. Always use dependency injection...\n2. Service tests require...",
  "full": false
}
```

**File:** `language-server/src/mcp/toolHandler.ts:892-940`

---

#### `gofer_context_grep`

**Purpose:** Search across all context sections for pattern

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | Yes | Regex pattern (case-insensitive) |
| `maxResults` | number | No | Maximum results to return (default: 10) |

**Returns:**

```json
{
  "matches": [
    {
      "section": "memories",
      "item": 3,
      "line": "Always use dependency injection for services",
      "context": "...injection for services. This ensures..."
    },
    {
      "section": "hints",
      "item": 1,
      "line": "Directory uses TSyringe DI container",
      "context": "...TSyringe DI container. Singleton pattern..."
    }
  ],
  "totalMatches": 2
}
```

**File:** `language-server/src/mcp/toolHandler.ts:942-1005`

---

#### `gofer_context_fold`

**Purpose:** Fold (collapse) context section to reduce tokens

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `section` | string | Yes | Section to fold |

**Returns:**

```json
{
  "success": true,
  "section": "observations",
  "tokensBefore": 45000,
  "tokensAfter": 3000,
  "tokensSaved": 42000
}
```

**Effect:** Transitions observations to `masked` tier (ID only, no content)

**File:** `language-server/src/mcp/toolHandler.ts:1007-1050`

---

#### `gofer_context_expand`

**Purpose:** Expand previously collapsed context section

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `section` | string | Yes | Section to expand |

**Returns:**

```json
{
  "success": true,
  "section": "observations",
  "tokensAfter": 45000
}
```

**File:** `language-server/src/mcp/toolHandler.ts:1052-1090`

---

#### `gofer_context_undo`

**Purpose:** Revert last fold/expand operation

**Parameters:** None

**Returns:**

```json
{
  "success": true,
  "operation": "fold",
  "section": "observations",
  "timestamp": "2026-05-18T18:20:00Z"
}
```

**File:** `language-server/src/mcp/toolHandler.ts:1092-1125`

---

#### `gofer_context_history`

**Purpose:** Show last 10 context operations with timestamps

**Parameters:** None

**Returns:**

```json
{
  "operations": [
    {
      "type": "fold",
      "section": "observations",
      "timestamp": "2026-05-18T18:20:00Z",
      "tokensDelta": -42000
    },
    {
      "type": "expand",
      "section": "hints",
      "timestamp": "2026-05-18T18:15:00Z",
      "tokensDelta": +3000
    }
  ]
}
```

**File:** `language-server/src/mcp/toolHandler.ts:1127-1165`

---

#### `gofer_context_repl` (Compound Operation)

**Purpose:** Batch multiple fold/expand/peek operations to reduce round-trips

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operations` | array | Yes | List of operations to execute in sequence |

**Request Example:**

```json
{
  "operations": [
    {"action": "fold", "section": "observations"},
    {"action": "peek", "section": "memories"},
    {"action": "expand", "section": "hints"}
  ]
}
```

**Returns:**

```json
{
  "results": [
    {"success": true, "action": "fold", "tokensSaved": 42000},
    {"success": true, "action": "peek", "preview": "1. Always..."},
    {"success": true, "action": "expand", "tokensAdded": 3000}
  ],
  "netTokenDelta": -39000
}
```

**File:** `language-server/src/mcp/toolHandler.ts:1167-1225`

---

### Research & Session Management

#### `gofer_get_research_index`

**Purpose:** Get research chunk index for spec's research.md

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `specId` | string | Yes | Specification identifier |

**Returns:**

```json
{
  "specId": "031-skills-pipeline",
  "chunks": [
    {
      "id": "chunk-001",
      "title": "Service Architecture",
      "startLine": 1,
      "endLine": 150,
      "tokenEstimate": 1500,
      "tags": ["architecture", "services", "DI"]
    },
    {
      "id": "chunk-002",
      "title": "Testing Strategy",
      "startLine": 151,
      "endLine": 300,
      "tokenEstimate": 1200,
      "tags": ["testing", "unit-tests", "mocks"]
    }
  ],
  "totalTokens": 2700
}
```

**Use Case:** On-demand research loading when memory coverage < 30%

**File:** `language-server/src/mcp/toolHandler.ts:1227-1280`

---

#### `gofer_load_research_chunk`

**Purpose:** Load specific research chunk by ID

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `specId` | string | Yes | Specification identifier |
| `chunkId` | string | Yes | Chunk identifier from index |

**Returns:**

```json
{
  "chunkId": "chunk-001",
  "title": "Service Architecture",
  "content": "# Service Architecture\n\n## Overview\n\nThe SkillDispatcher...",
  "tokens": 1500
}
```

**File:** `language-server/src/mcp/toolHandler.ts:1282-1335`

---

#### `gofer_trigger_handoff`

**Purpose:** Trigger session handoff with context preservation

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `specId` | string | Yes | Specification identifier |
| `reason` | string | No | Reason for handoff (logged) |

**Returns:**

```json
{
  "success": true,
  "checkpointPath": ".specify/specs/031-skills-pipeline/session-checkpoint.md",
  "nextCommand": "/8_gofer_resume 031-skills-pipeline"
}
```

**Side Effects:**
- Creates `session-checkpoint.md` with current context
- Logs handoff event to `.specify/logs/gofer-run-ledger.jsonl`
- Can trigger WhatsApp notification if configured (Twilio)

**File:** `language-server/src/mcp/toolHandler.ts:1337-1390`

---

### Quality Assurance Tools

#### `gofer_check_slop`

**Purpose:** Scan source files for AI code quality issues

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | No | Path to scan (default: entire workspace) |

**Returns:**

```json
{
  "issues": [
    {
      "file": "src/service.ts",
      "line": 42,
      "type": "console.log",
      "message": "Remove debug console.log statement",
      "autoFixable": true
    },
    {
      "file": "src/handler.ts",
      "line": 15,
      "type": "@ts-ignore",
      "message": "Replace @ts-ignore with @ts-expect-error",
      "autoFixable": true
    }
  ],
  "summary": {
    "totalIssues": 2,
    "autoFixable": 2,
    "filesScanned": 145
  }
}
```

**Detected Patterns:**
- `console.log` statements
- `debugger` statements
- `@ts-ignore` (should be `@ts-expect-error`)
- Overly generic error handlers
- Missing error context

**File:** `language-server/src/mcp/toolHandler.ts:1392-1460`

---

#### `gofer_validate_code`

**Purpose:** Validate code against constitutional requirements

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `files` | array | Yes | List of file paths to validate |

**Returns:**

```json
{
  "valid": false,
  "violations": [
    {
      "file": "src/service.ts",
      "rule": "dependency-injection",
      "message": "Service constructor must accept dependencies",
      "severity": "error"
    }
  ],
  "summary": {
    "filesValidated": 3,
    "violations": 1,
    "warnings": 0
  }
}
```

**Validation Rules (from constitution.md):**
- Dependency injection usage
- Error handling patterns
- Test coverage requirements
- Naming conventions
- Code complexity limits

**File:** `language-server/src/mcp/toolHandler.ts:1462-1530`

---

#### `gofer_run_tests`

**Purpose:** Detect framework and run tests with result parsing

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | No | Path to test (default: entire suite) |
| `filter` | string | No | Test filter pattern |

**Returns:**

```json
{
  "framework": "vitest",
  "passed": 142,
  "failed": 2,
  "skipped": 3,
  "duration": 5.2,
  "failures": [
    {
      "test": "SkillDispatcher should delegate to sub-agents",
      "file": "tests/unit/SkillDispatcher.test.ts",
      "message": "Expected mock to be called with...",
      "stack": "..."
    }
  ]
}
```

**Supported Frameworks:**
- Vitest
- Jest
- Mocha
- Playwright
- VSCode Test CLI

**File:** `language-server/src/mcp/toolHandler.ts:1532-1610`

---

## VS Code Commands

67 commands exposed via Command Palette and UI integration. All commands are registered in `extension/package.json:48-267` and implemented in `extension/src/extension.ts`.

### Repository Management

| Command ID | Title | Keybinding | Description |
|------------|-------|-----------|-------------|
| `gofer.initialize` | Gofer: Initialize Repository | Ctrl+Shift+Alt+I | Creates `.specify/` structure |
| `gofer.upgrade` | Gofer: Upgrade to Gofer Format | - | Migrates legacy format |
| `gofer.checkForUpdates` | Gofer: Check for Updates | Ctrl+Shift+Alt+U | Checks for extension updates |
| `gofer.updateNow` | Gofer: Update Now | - | Updates extension |
| `gofer.installOptionalTools` | Gofer: Install Optional Developer Tools | - | Installs CLI tools |

### Specification Management

| Command ID | Title | Keybinding | Description |
|------------|-------|-----------|-------------|
| `gofer.createSpec` | Gofer: Create New Specification | Ctrl+Shift+Alt+N | Creates spec from template |
| `gofer.openSpec` | Gofer: Open Specification | - | Opens spec in viewer |
| `gofer.refreshSpecs` | Gofer: Refresh Specifications | Ctrl+Shift+Alt+R | Reloads spec tree view |
| `gofer.executeAllPendingSpecs` | Gofer: Execute All Pending Specs | - | Executes specs in dependency order |
| `gofer.fixSpecPaths` | Gofer: Fix Spec Path References | - | Updates `specs/` → `.specify/specs/` |

### Panel Views

| Command ID | Title | Keybinding | Description |
|------------|-------|-----------|-------------|
| `gofer.showProgress` | Gofer: Show Progress Panel | Ctrl+Shift+Alt+P | Shows spec/task tree view |
| `gofer.showAIUsage` | Gofer: Show AI Usage Details | - | Shows token usage panel |
| `gofer.showConstitution` | Gofer: Show Constitution Panel | Ctrl+Shift+Alt+C | Shows constitution viewer |

### Claude Code Integration

| Command ID | Title | Description |
|------------|-------|-------------|
| `gofer.startClaudeCode` | Gofer: Start Claude Code Terminal | Launches Claude Code in terminal |
| `gofer.stopClaudeCode` | Gofer: Stop Claude Code Terminal | Stops running terminal |
| `gofer.pauseClaudeCode` | Gofer: Pause Claude Code Terminal | Sends ESC to pause |
| `gofer.resumeClaudeCode` | Gofer: Resume Claude Code Monitoring | Resumes autonomous monitoring |

### Memory Management

| Command ID | Title | Description |
|------------|-------|-------------|
| `gofer.remember` | Gofer: Remember | Stores user input as memory |
| `gofer.searchMemory` | Gofer: Search Memory | TF-IDF keyword search |
| `gofer.forgetMemory` | Gofer: Forget Memory | Removes memory entry |
| `gofer.clearMemory` | Gofer: Clear Memory | Clears all memories |
| `gofer.viewMemories` | Gofer: View Memories | Opens memory viewer |
| `gofer.migrateMemoriesToLayered` | Gofer: Migrate Memories to Layered Format | Converts to 3-layer format |

For complete command reference, see `extension/package.json:48-267`.

---

## LSP Custom Methods

Custom LSP methods for extension-server communication (not exposed to AI assistants).

### `gofer/getSpecs`

**Purpose:** Get all specs (extension-internal)

**Request:**

```json
{
  "method": "gofer/getSpecs",
  "params": {}
}
```

**Response:**

```json
{
  "specs": [...]
}
```

---

### `gofer/loadSpec`

**Purpose:** Load specific spec (extension-internal)

**Request:**

```json
{
  "method": "gofer/loadSpec",
  "params": {
    "specId": "031-skills-pipeline"
  }
}
```

**Response:**

```json
{
  "spec": {...}
}
```

---

### `gofer/taskProgress` (Notification)

**Purpose:** Notify extension of task status changes

**Direction:** Server → Client (notification only)

**Payload:**

```json
{
  "method": "gofer/taskProgress",
  "params": {
    "specId": "031-skills-pipeline",
    "taskId": "T002",
    "status": "completed"
  }
}
```

**Handler:** `extension/src/extension.ts` subscribes to this notification and triggers `ProgressProvider.refresh()`

---

## CLI Command Surfaces

Gofer generates cross-platform command surfaces from canonical definitions in `.specify/commands/`. Each command is emitted to 4 platforms.

### Command Invocation Syntax

| Platform | Syntax | Example |
|----------|--------|---------|
| Claude Code | `/command` | `/0_business_scenario` |
| GitHub Copilot | `#command` | `#0_business_scenario` |
| OpenAI Codex | `$ $command` | `$ $0_business_scenario` |
| Gemini CLI | `/command` | `/0_business_scenario` |

### Pipeline Commands (24 total)

Numbered stages (0-10):

| Command | Description |
|---------|-------------|
| `/0_business_scenario` | Orchestrate business discovery |
| `/0a_problem_validation` | Root-cause analysis with 5 Whys |
| `/1_gofer_research` | Research codebase & technology |
| `/2_gofer_specify` | Generate feature specification |
| `/3_gofer_plan` | Create technical implementation plan |
| `/4_gofer_tasks` | Break down into dependency-ordered tasks |
| `/5_gofer_implement` | Execute tasks phase by phase |
| `/6_gofer_validate` | Validate against spec & constitution |
| `/6a_gofer_engineering_review` | Post-implementation engineering review |
| `/7_gofer_save` | Save session checkpoint |
| `/7a_stakeholder_comms` | Generate stakeholder communications |
| `/8_gofer_resume` | Resume from checkpoint |
| `/9_gofer_tests` | Generate acceptance tests |
| `/10_gofer_cloud` | Cloud infrastructure analysis |

Helper commands:

| Command | Description |
|---------|-------------|
| `/gofer_constitution` | Create/update constitution |
| `/gofer_hydrate` | Reverse-engineer spec from code |
| `/gofer_vocabulary` | Extract domain terminology glossary |
| `/gofer_diagnose` | Reproduce-minimize-instrument-fix loop |
| `/gofer_tdd` | Red-green-refactor TDD guidance |
| `/gofer_spec_summary` | Business-friendly feature summary |
| `/gofer_zoom_out` | System-context expansion |

Control commands:

| Command | Description |
|---------|-------------|
| `/gofer_plan` | Toggle plan mode |
| `/gofer_side` | Side conversation |
| `/gofer_personality` | Set assistant personality |

**Generated Surfaces:**
- `.claude/commands/*.md` (Claude Code)
- `.github/prompts/*.prompt.md` (GitHub Copilot)
- `.agents/skills/*/SKILL.md` (OpenAI Codex)
- `.gemini/commands/gofer/*.md` (Gemini CLI)

**Generator:** `extension/src/council/CommandGenerator.ts`

---

## Security & Authentication

### Authentication

Gofer does not implement traditional authentication. Security is based on:

1. **Local-only operation** - All tools read/write local `.specify/` directory
2. **VSCode trust model** - Extension runs within VSCode's security sandbox
3. **Input validation** - Path traversal prevention, length limits, format validation
4. **ScopeGuard** - Enforces protected boundaries defined in specs

### API Keys (External Services)

Required for external service integration:

| Service | Setting | Purpose |
|---------|---------|---------|
| Anthropic | `gofer.anthropicApiKey` | Claude 3.5 autonomous mode |
| Anthropic Admin | `gofer.anthropicAdminApiKey` | Billing data for AI Usage panel |
| Google AI | `gofer.googleApiKey` | Gemini LLM Council validation |
| OpenAI | `gofer.openaiApiKey` | GPT-4 LLM Council validation |
| OpenAI Admin | `gofer.openaiAdminApiKey` | Billing data for AI Usage panel |
| Twilio (optional) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | WhatsApp notifications |

**Storage:** VS Code settings (user or workspace scope), never committed to Git

### Audit Logging

All MCP tool invocations are logged to:

- `.specify/logs/tool-audit.jsonl` - Tool calls, outcomes (allowed/warned/blocked), timestamps
- `.specify/logs/gofer-run-ledger.jsonl` - Pipeline runs, cost tracking, scope violations

### Rate Limiting

No rate limiting on MCP tools (local operation). External API calls subject to provider limits:

- **Anthropic:** 1000 requests/min (project tier-dependent)
- **Google AI:** 60 requests/min (free tier), 2000/min (paid)
- **OpenAI:** 10000 requests/min (depends on organization tier)

---

## Error Codes

### MCP Tool Errors

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| `INVALID_SPEC_ID` | Invalid specification identifier | Path traversal, invalid chars | Use alphanumeric + `-` `_` only |
| `SPEC_NOT_FOUND` | Specification not found | specId does not exist | Check `.specify/specs/` directory |
| `INVALID_TASK_ID` | Invalid task identifier | Format error | Use `T001`, `#1`, or `1` format |
| `TASK_NOT_FOUND` | Task not found in spec | taskId does not exist | Check `tasks.md` |
| `SCOPE_VIOLATION` | File access blocked by ScopeGuard | Protected boundary violation | Check spec.md `## Protected Boundaries` |
| `OBSERVATION_NOT_FOUND` | Observation ID not found | Invalid UUID or expired | Check observation cache |
| `CONTEXT_STALE` | Enriched context expired | > 60s since last build | Context rebuilt automatically |

### Extension Errors

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| `LSP_CONNECTION_FAILED` | Language server connection failed | Server crash or timeout | Restart VSCode |
| `INITIALIZATION_TIMEOUT` | Workspace initialization timeout | Slow disk I/O | Increase timeout setting |
| `INVALID_MEMORY_FORMAT` | Memory file corrupt | Malformed JSONL | Validate `.specify/memory/` files |

---

## API Versioning

Gofer uses semantic versioning (`MAJOR.MINOR.PATCH`):

- **MAJOR**: Breaking changes to MCP tool schemas or LSP protocol
- **MINOR**: New tools or commands added
- **PATCH**: Bug fixes, no API changes

**Current Version:** 3.4.0

**MCP Tool Schema Version:** 1.0 (stable since v3.0.0)

**LSP Protocol Version:** 1.0 (stable since v2.0.0)

---

## Rate Limits & Quotas

### Local Operations (No Limits)

- MCP tool calls: Unlimited
- File reads/writes: Unlimited
- Context operations: Unlimited

### External APIs (Provider-Dependent)

- **Context Health Monitoring:** 1 request per task execution (Anthropic token counting API)
- **AI Usage Panel:** 1 request per minute (Anthropic/OpenAI billing APIs)
- **LLM Council:** Variable (depends on validation depth)

### Caching & Optimization

- **Spec Cache:** 5-minute TTL, 100 spec limit
- **Enriched Context:** 60s freshness
- **Context Health State:** 30s TTL

---

## Webhooks & Notifications

Gofer does not expose webhooks. Notifications are one-way (extension → external):

- **WhatsApp (via Twilio):** Session checkpoints, pipeline completion (optional)
- **VSCode Notifications:** Status updates, warnings, errors

---

## SDKs & Client Libraries

No official SDKs. AI assistants interact directly via:

- **MCP Tools:** JSON-RPC over stdio (Claude Code, GitHub Copilot)
- **Generated Commands:** Markdown/TOML files (Codex, Gemini)

**Integration Example (Claude Code):**

```bash
claude "Use gofer_execute_task tool to implement T001 from spec 031-skills-pipeline"
```

**Integration Example (GitHub Copilot):**

```bash
gh copilot chat "#0_business_scenario Add authentication"
```

---

## Deprecations

- **Standalone Orchestrator** (`src/orchestrator/AutonomousOrchestrator_new.ts`) - Use extension-based ACC orchestration instead
- **Flat Memory Format** (`.specify/memory/memories.jsonl`) - Migrate to layered format (core/recall/archival)

---

## Related Documentation

- [./architecture.md](./architecture.md) - System architecture and data flow
- [./configuration.md](./configuration.md) - Configuration settings reference
- [./data-model.md](./data-model.md) - File formats and data structures
- [./deployment.md](./deployment.md) - Deployment and installation guide
