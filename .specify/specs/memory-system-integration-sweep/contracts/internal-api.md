# Internal API Contracts: Memory System Integration Sweep

## 1. ContextBridgeWriter (NEW)

### Purpose

Writes enriched context from the extension's ContextBuilder to a JSON file that
the language server can read.

### Interface

```typescript
export class ContextBridgeWriter {
  constructor(contextBuilder: ContextBuilder, workspacePath: string);

  /** Build context for a task and write to bridge file */
  async writeEnrichedContext(task: TaskContext): Promise<void>;
}
```

### Bridge File Format

Path: `.specify/memory/enriched-context.json`

```json
{
  "timestamp": 1706500000000,
  "specId": "memory-system-integration-sweep",
  "taskId": "T001",
  "sections": {
    "constitution": "Full constitution text...",
    "hints": "## Coding Hints\n\n...",
    "memories": "## Relevant Memories\n\n...",
    "research": "## Research Context\n\n..."
  },
  "memoryCoverage": {
    "coveredKeywords": ["MCP", "toolHandler"],
    "uncoveredKeywords": ["performance"],
    "coveragePercent": 65,
    "memoriesLoaded": 3,
    "researchLoadedForGaps": true,
    "researchTriggers": ["performance"]
  },
  "budgetUsage": {
    "stage": "implement",
    "usage": {
      "research": 1500,
      "memory": 800,
      "code": 0,
      "conversation": 0,
      "total": 2300
    },
    "limits": {
      "research": 18000,
      "memory": 30000,
      "code": 48000,
      "conversation": 24000
    },
    "exceededCategories": [],
    "totalExceeded": false
  }
}
```

### Freshness

Language server reads with a 60-second freshness window. If
`Date.now() - timestamp > 60000`, the bridge data is considered stale and the
tool falls back to current behavior.

---

## 2. ExecuteTaskResponse (EXTENDED)

### Current Interface (unchanged)

```typescript
interface ExecuteTaskResponse {
  success?: boolean;
  spec?: Spec;
  task?: Task;
  constitution?: string;
  testHarnessPath?: string;
  error?: string;
  errorCode?: string;
}
```

### Extended Interface (additive fields)

```typescript
interface ExecuteTaskResponse {
  // Existing (unchanged)
  success?: boolean;
  spec?: Spec;
  task?: Task;
  constitution?: string; // Now: full text from bridge, fallback to 2000 char
  testHarnessPath?: string;
  error?: string;
  errorCode?: string;

  // NEW additive fields
  memories?: string; // Formatted relevant memories
  hints?: string; // Formatted coding hints
  researchChunks?: string; // Relevant research sections
  memoryCoverage?: {
    coveragePercent: number;
    memoriesLoaded: number;
    researchLoadedForGaps: boolean;
  };
}
```

### Backward Compatibility

- All existing fields retain their type and behavior
- New fields are optional (undefined when bridge file unavailable)
- Consumers that don't read new fields are unaffected

---

## 3. WorkspaceContextProvider (NEW)

### Purpose

Supplies real token usage estimates to ContextHealthMonitor.

### Interface

```typescript
export class WorkspaceContextProvider {
  constructor(workspacePath: string, memoryManager: MemoryManager);

  /** Returns current context analysis for health monitoring */
  getContextAnalysis(): ContextAnalysisInput;
}
```

### Integration

Connected via:

```typescript
contextHealthMonitor.setContextProvider(() => provider.getContextAnalysis());
```

### Token Estimation Strategy

| Category      | Estimation Method                                        |
| ------------- | -------------------------------------------------------- |
| specArtifacts | Sum file sizes in active spec dir / 4                    |
| memories      | MemoryManager.load('both').length \* avg memory size / 4 |
| hints         | Sum .specify/hints/ file sizes / 4                       |
| observations  | ObservationMasker cache total tokens                     |
| systemFiles   | CLAUDE.md + AGENTS.md + constitution.md sizes / 4        |
| conversation  | Estimated from session duration (heuristic)              |

---

## 4. autonomousCommands Module Setters (NEW)

### Purpose

Accept shared instances from extension.ts instead of creating duplicates.

### Interface

```typescript
/** Set the shared MemoryManager instance */
export function setSharedMemoryManager(mm: MemoryManager): void;

/** Set the shared ContextBuilder instance */
export function setSharedContextBuilder(cb: ContextBuilder): void;

/** Get the shared MemoryManager (for testing) */
export function getSharedMemoryManager(): MemoryManager | undefined;

/** Get the shared ContextBuilder (for testing) */
export function getSharedContextBuilder(): ContextBuilder | undefined;
```

---

## 5. MCP Tool Definitions (5 tools to register)

### gofer_expand_observation

```json
{
  "name": "gofer_expand_observation",
  "description": "Retrieve the full content of a masked observation by its ID",
  "inputSchema": {
    "type": "object",
    "properties": {
      "observationId": {
        "type": "string",
        "description": "UUID v4 observation ID"
      }
    },
    "required": ["observationId"]
  }
}
```

### gofer_get_context_health

```json
{
  "name": "gofer_get_context_health",
  "description": "Get current context health status including token usage breakdown",
  "inputSchema": {
    "type": "object",
    "properties": {
      "includeBreakdown": {
        "type": "boolean",
        "description": "Include detailed token breakdown"
      }
    }
  }
}
```

### gofer_get_research_index

```json
{
  "name": "gofer_get_research_index",
  "description": "Get the research chunk index for a spec's research.md file",
  "inputSchema": {
    "type": "object",
    "properties": {
      "specId": { "type": "string", "description": "Spec identifier" }
    },
    "required": ["specId"]
  }
}
```

### gofer_load_research_chunk

```json
{
  "name": "gofer_load_research_chunk",
  "description": "Load a specific research chunk by ID from a spec's research index",
  "inputSchema": {
    "type": "object",
    "properties": {
      "specId": { "type": "string", "description": "Spec identifier" },
      "chunkId": {
        "type": "string",
        "description": "Chunk identifier from research index"
      }
    },
    "required": ["specId", "chunkId"]
  }
}
```

### gofer_trigger_handoff

```json
{
  "name": "gofer_trigger_handoff",
  "description": "Trigger a session handoff, saving current context state for resumption",
  "inputSchema": {
    "type": "object",
    "properties": {
      "specId": { "type": "string", "description": "Active spec identifier" },
      "reason": { "type": "string", "description": "Reason for handoff" }
    },
    "required": ["specId"]
  }
}
```
