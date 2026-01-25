# Memory & Learning System

**Feature 001** - Autonomous Execution Framework for Gofer

The Memory & Learning System provides Gofer with persistent knowledge storage,
contextual guidance, dependency tracking, and intelligent context management.
This enables autonomous task execution with long-term memory and adaptive
behavior.

## Table of Contents

- [Overview](#overview)
- [Components](#components)
  - [MemoryManager](#memorymanager)
  - [HintLoader](#hintloader)
  - [DependencyGraph](#dependencygraph)
  - [ContextCompactor](#contextcompactor)
- [Getting Started](#getting-started)
- [Usage Examples](#usage-examples)
- [VSCode Commands](#vscode-commands)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

The Memory & Learning System consists of four major components that work
together to enable autonomous execution:

1. **MemoryManager** - Persistent knowledge storage across sessions
2. **HintLoader** - Contextual guidance system for tasks
3. **DependencyGraph** - Spec relationship tracking
4. **ContextCompactor** - Intelligent context window management

### Key Features

- **Persistent Memory**: Store and retrieve knowledge across global, spec, and
  session scopes
- **Contextual Hints**: Load task-specific guidance from YAML files
- **Dependency Tracking**: Manage relationships between specs with cycle
  detection
- **Context Management**: Automatic summarization when approaching token limits
- **97% Test Coverage**: Production-ready with 270 passing tests
- **Type-Safe**: Full TypeScript contracts for all interfaces

## Components

### MemoryManager

The MemoryManager provides persistent storage for knowledge across three scopes:

- **Global**: Knowledge shared across all specs (stored in VSCode global state)
- **Spec**: Knowledge specific to a feature spec (stored in local JSON)
- **Session**: Temporary knowledge for current execution (in-memory only)

#### Core Features

- **Save/Load/Search/Forget**: Full CRUD operations for memories
- **Category-based Organization**: Group memories by category (decision,
  pattern, error, solution, insight)
- **Tag-based Search**: Find memories using tags and full-text search
- **Validation**: Schema validation for all memory operations
- **Performance**: Incremental search with pagination support

#### Example Usage

```typescript
import { MemoryManager } from './autonomous/MemoryManager';

// Initialize
const memoryManager = new MemoryManager(context, workspaceRoot);

// Save a memory
const memory = await memoryManager.save({
  category: 'decision',
  scope: 'spec',
  specId: '001-memory-learning-system',
  content: 'Decided to use graphlib for dependency graph',
  tags: ['architecture', 'dependencies'],
});

// Search memories
const results = await memoryManager.search({
  category: 'decision',
  specId: '001-memory-learning-system',
  tags: ['architecture'],
});

// Forget a memory
await memoryManager.forget(memory.id);
```

### HintLoader

The HintLoader discovers and loads contextual guidance from YAML hint files in
`.specify/hints/`.

#### Core Features

- **File Discovery**: Recursively scans hint directories
- **YAML Parsing**: Loads structured hint files
- **Caching**: In-memory cache with invalidation
- **Context Matching**: Finds hints based on spec, task, or phase
- **Performance**: Lazy loading and incremental discovery

#### Hint File Format

```yaml
# .specify/hints/general/testing.yaml
context:
  applies_to: ['*'] # All specs
  priority: 5

guidance: |
  Always write tests before implementation (TDD).
  Use Vitest for unit tests.
  Aim for >90% coverage.

examples:
  - |
    describe('MyComponent', () => {
      it('should initialize correctly', () => {
        const component = new MyComponent();
        expect(component).toBeDefined();
      });
    });
```

#### Example Usage

```typescript
import { HintLoader } from './autonomous/HintLoader';

// Initialize
const hintLoader = new HintLoader(workspaceRoot);

// Discover all hints
const hintPaths = await hintLoader.discoverHints();

// Load a specific hint
const hint = await hintLoader.loadHint('.specify/hints/general/testing.yaml');

// Get hints for context
const hints = await hintLoader.getHintsForContext({
  specId: '001-memory-learning-system',
  taskId: 'T001',
  phase: 'implementation',
});
```

### DependencyGraph

The DependencyGraph tracks relationships between specs using a directed graph
with cycle detection.

#### Core Features

- **Dependency Types**: `required_by`, `uses_api_from`, `blocks`
- **Cycle Detection**: Prevents circular dependencies
- **Topological Sorting**: Determines execution order
- **Impact Analysis**: Find all downstream specs affected by changes
- **Path Finding**: Calculate dependency paths between specs
- **Validation**: Ensures graph integrity

#### Example Usage

```typescript
import { DependencyGraph } from './autonomous/DependencyGraph';

// Initialize
const graph = new DependencyGraph(workspaceRoot);

// Add dependencies
graph.addDependency(
  '002-user-auth',
  '001-memory-learning-system',
  'required_by',
  {
    reason: 'User auth requires memory storage',
    addedAt: Date.now(),
  }
);

// Check for cycles
const hasCycle = graph.hasCycles(); // false

// Get execution order
const order = graph.getExecutionOrder();
// ['001-memory-learning-system', '002-user-auth', ...]

// Find impacted specs
const impacted = graph.getImpactedSpecs('001-memory-learning-system');
// ['002-user-auth', '003-admin-panel', ...]

// Save to disk
await graph.save();
```

### ContextCompactor

The ContextCompactor manages context window limits by automatically summarizing
completed work when approaching token limits.

#### Core Features

- **Token Estimation**: chars/4 approximation for Claude 200k context
- **Automatic Compaction**: Triggers at 80% threshold (configurable)
- **Intelligent Summarization**: Preserves recent work, summarizes older tasks
- **Context Analysis**: Detailed breakdown of context usage
- **Session Backup**: Rollback support for compaction operations
- **Configurable Strategy**: Customize preservation and summarization behavior

#### Example Usage

```typescript
import { ContextCompactor } from './autonomous/ContextCompactor';

// Initialize with custom threshold
const compactor = new ContextCompactor(workspaceRoot, {
  threshold: 0.85, // 85% instead of default 80%
  contextWindowSize: 200000,
  enableBackup: true,
});

// Check if compaction needed
const shouldCompact = await compactor.shouldCompact(session);

// Analyze context usage
const analysis = await compactor.analyzeContext(session);
console.log(`Usage: ${analysis.usagePercentage.toFixed(1)}%`);

// Preview compaction (dry run)
const preview = await compactor.previewCompaction(session);
console.log(`Would save ${preview.tokensSaved} tokens`);

// Perform compaction
const summary = await compactor.compact(session);
console.log(`Compacted ${summary.tasksCompacted.length} tasks`);

// Rollback if needed
const success = await compactor.rollbackCompaction(session);
```

## Getting Started

### Installation

The Memory & Learning System is included in Gofer v2.1.0+. No additional
installation required.

### Directory Structure

After initialization, your workspace will have:

```
.specify/
├── hints/                  # Contextual guidance files
│   ├── general/           # General hints for all specs
│   ├── spec-specific/     # Hints for specific specs
│   └── examples/          # Example hint templates
├── memory/
│   └── local.json         # Spec-scoped memories
└── state/
    ├── dependencies.json  # Dependency graph
    └── sessions/          # Session state and backups
        ├── active/
        └── backups/
```

### Quick Start

1. **Initialize Gofer** (if not already done):

   ```
   Cmd+Shift+P → Gofer: Initialize
   ```

2. **Create your first hint file**:

   ```yaml
   # .specify/hints/general/my-first-hint.yaml
   context:
     applies_to: ['*']
     priority: 5

   guidance: |
     This is my first hint!
     It will be loaded for all specs.
   ```

3. **Store a memory** (via autonomous execution):

   The system will automatically store memories during task execution.

4. **Track dependencies** (in spec frontmatter):

   ```yaml
   ---
   id: 002-user-auth
   dependencies:
     - id: 001-memory-learning-system
       type: required_by
       reason: Requires memory storage
   ---
   ```

## Usage Examples

### Example 1: Store and Retrieve Architectural Decisions

```typescript
// Store a decision
const decision = await memoryManager.save({
  category: 'decision',
  scope: 'spec',
  specId: '001-memory-learning-system',
  content: 'Use graphlib for dependency graph to get cycle detection',
  tags: ['architecture', 'dependencies', 'libraries'],
  metadata: {
    alternatives: ['custom graph', 'nx'],
    reason: 'Built-in topological sort and cycle detection',
  },
});

// Later, retrieve all architectural decisions
const decisions = await memoryManager.search({
  category: 'decision',
  tags: ['architecture'],
});
```

### Example 2: Create Task-Specific Hints

```yaml
# .specify/hints/spec-specific/001-memory-learning-system/testing.yaml
context:
  applies_to: ['001-memory-learning-system']
  task_pattern: 'T1[0-9]{2}' # Tasks T100-T199
  priority: 10

guidance: |
  For Memory & Learning System tests:
  - Mock VSCode API in tests/helpers/setup.ts
  - Mock Logger to avoid vscode import errors
  - Use vi.fn() for all logger methods
  - Check test coverage with npm test -- --coverage

examples:
  - |
    vi.mock('../../extension/src/utils/logger', () => ({
      Logger: {
        for: vi.fn(() => ({
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        })),
      },
    }));
```

### Example 3: Track Complex Dependencies

```typescript
// Build a dependency graph for multiple specs
const graph = new DependencyGraph(workspaceRoot);

// Spec 002 requires 001
graph.addDependency(
  '002-user-auth',
  '001-memory-learning-system',
  'required_by',
  {
    reason: 'User auth needs memory storage',
    addedAt: Date.now(),
  }
);

// Spec 003 uses API from 002
graph.addDependency('003-admin-panel', '002-user-auth', 'uses_api_from', {
  reason: 'Admin panel uses auth API',
  addedAt: Date.now(),
});

// Spec 004 blocks 005
graph.addDependency('005-dashboard', '004-api-integration', 'blocks', {
  reason: 'Dashboard needs API endpoints',
  addedAt: Date.now(),
});

// Get execution order
const order = graph.getExecutionOrder();
// Result: ['001-memory-learning-system', '002-user-auth', '004-api-integration',
//          '003-admin-panel', '005-dashboard']

// Find what breaks if 001 changes
const impacted = graph.getImpactedSpecs('001-memory-learning-system');
// Result: ['002-user-auth', '003-admin-panel']
```

### Example 4: Manage Context Window with Auto-Compaction

```typescript
// Initialize with custom strategy
const compactor = new ContextCompactor(workspaceRoot, {
  threshold: 0.8,
  defaultStrategy: {
    preserveLastN: 15, // Keep last 15 tasks
    summarizeBatchSize: 5,
    targetReduction: 60, // Target 60% reduction
  },
});

// During long-running session
let session = loadSession();

while (hasMoreTasks()) {
  // Execute task
  await executeTask(task);
  session.completedTasks.push(task.id);

  // Check if compaction needed
  if (await compactor.shouldCompact(session)) {
    console.log('Context approaching limit, compacting...');

    // Preview what will happen
    const preview = await compactor.previewCompaction(session);
    console.log(
      `Will compact ${preview.tasksToCompact.length} tasks, ` +
        `save ${preview.tokensSaved} tokens (${preview.reductionPercent.toFixed(1)}%)`
    );

    // Perform compaction
    const summary = await compactor.compact(session);
    console.log(
      `Compacted ${summary.tasksCompacted.length} tasks, ` +
        `saved ${summary.tokensSaved} tokens`
    );
  }
}
```

## VSCode Commands

The Memory & Learning System integrates with VSCode through commands:

| Command                          | Description                            |
| -------------------------------- | -------------------------------------- |
| `Gofer: Initialize`              | Initialize .specify directory          |
| `Gofer: View Memory`             | Browse stored memories                 |
| `Gofer: Clear Session Memory`    | Clear session-scoped memories          |
| `Gofer: View Dependencies`       | Visualize dependency graph             |
| `Gofer: Validate Dependencies`   | Check for cycles and integrity issues  |
| `Gofer: Show Context Analysis`   | View current context usage breakdown   |
| `Gofer: Compact Context Now`     | Manually trigger context compaction    |
| `Gofer: Restore Last Compaction` | Rollback last compaction operation     |
| `Gofer: Reload Hints`            | Invalidate cache and reload hint files |
| `Gofer: Create Hint Template`    | Generate new hint file from template   |
| `Gofer: Check for Updates`       | Check for extension updates            |
| `Gofer: View Documentation`      | Open this documentation                |

## Configuration

### Memory Configuration

No configuration required - MemoryManager uses sensible defaults:

- Global memories: Stored in VSCode global state
- Spec memories: `.specify/memory/local.json`
- Session memories: In-memory only

### Hint Configuration

Create hints in `.specify/hints/`:

```
.specify/hints/
├── general/              # General hints (priority 1-5)
├── spec-specific/        # Spec-specific hints (priority 6-10)
│   └── [spec-id]/
└── examples/             # Example templates
```

### Dependency Configuration

Configure in spec frontmatter:

```yaml
---
id: 002-user-auth
dependencies:
  - id: 001-memory-learning-system
    type: required_by # or uses_api_from, blocks
    reason: Human-readable explanation
---
```

### Compaction Configuration

Configure via CompactorConfig:

```typescript
{
  contextWindowSize: 200000,     // Claude's 200k token limit
  threshold: 0.8,                // Trigger at 80% usage
  defaultStrategy: {
    preserveLastN: 10,           // Keep last 10 tasks in full detail
    summarizeBatchSize: 5,       // Summarize in batches of 5
    targetReduction: 50,         // Aim for 50% reduction
    useFallbackModel: false,     // Use LLM for summarization
  },
  autoCompact: true,             // Enable automatic compaction
  enableBackup: true,            // Enable session backups
  maxBackups: 5,                 // Keep 5 most recent backups
}
```

## Troubleshooting

### Issue: "Cannot find package 'vscode'" in tests

**Cause**: Logger imports vscode module, which doesn't exist in Node.js test
environment.

**Solution**: Ensure `tests/helpers/setup.ts` includes the logger mock:

```typescript
vi.mock('../../extension/src/utils/logger', () => ({
  Logger: {
    getInstance: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      exception: vi.fn(),
    })),
    for: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      exception: vi.fn(),
    })),
  },
  LogLevel: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
}));
```

### Issue: Hint files not loading

**Cause**: Invalid YAML syntax or incorrect file location.

**Solution**:

1. Validate YAML syntax: `npx js-yaml .specify/hints/your-file.yaml`
2. Ensure files are in `.specify/hints/` directory
3. Check file permissions (must be readable)
4. Reload hints: `Cmd+Shift+P → Gofer: Reload Hints`

### Issue: Dependency cycle detected

**Cause**: Circular dependency between specs.

**Solution**:

1. View dependency graph: `Cmd+Shift+P → Gofer: View Dependencies`
2. Identify the cycle in the visualization
3. Remove or reorder dependencies to break the cycle
4. Validate: `Cmd+Shift+P → Gofer: Validate Dependencies`

### Issue: Context compaction not triggering

**Cause**: Context usage below threshold or auto-compaction disabled.

**Solution**:

1. Check usage: `Cmd+Shift+P → Gofer: Show Context Analysis`
2. Lower threshold if needed (default 80%)
3. Manually trigger: `Cmd+Shift+P → Gofer: Compact Context Now`
4. Check config: Ensure `autoCompact: true`

### Issue: Memories not persisting

**Cause**: Write permissions or invalid scope.

**Solution**:

1. Check `.specify/memory/` directory exists and is writable
2. Verify scope is valid: `global`, `spec`, or `session`
3. For global scope: Check VSCode has storage permissions
4. For spec scope: Check `local.json` is not corrupted

### Issue: Performance degradation with many hints

**Cause**: Hint discovery scans all files on every request.

**Solution**:

1. Reduce hint file count (consolidate similar hints)
2. Use cache (enabled by default)
3. Reload cache: `Cmd+Shift+P → Gofer: Reload Hints`
4. Profile: Set log level to DEBUG and check discovery times

## Best Practices

### Memory Management

1. **Use appropriate scopes**:
   - `global`: Cross-project patterns, reusable solutions
   - `spec`: Feature-specific decisions, spec context
   - `session`: Temporary state, debugging info

2. **Tag consistently**:
   - Use lowercase tags: `architecture`, `testing`, `performance`
   - Use hierarchical tags: `error/validation`, `pattern/singleton`

3. **Keep content concise**:
   - Store decisions, not implementation details
   - Use metadata for structured data
   - Link to files instead of copying content

4. **Prune regularly**:
   - Remove outdated memories
   - Archive old sessions
   - Keep global memory < 100 entries

### Hint Management

1. **Organize by specificity**:
   - General hints: `.specify/hints/general/`
   - Spec hints: `.specify/hints/spec-specific/[spec-id]/`
   - Use priority: general=1-5, specific=6-10

2. **Write actionable guidance**:
   - Focus on "what to do" not "what not to do"
   - Include code examples
   - Reference documentation links

3. **Keep hints focused**:
   - One concept per hint file
   - Use context filters to target specific tasks
   - Update hints based on learnings

4. **Version control hints**:
   - Commit hint files to git
   - Review changes in PRs
   - Document hint changes in commit messages

### Dependency Management

1. **Model real dependencies**:
   - Only add dependencies that truly exist
   - Use correct type: `required_by` vs `uses_api_from` vs `blocks`
   - Document the reason clearly

2. **Avoid cycles**:
   - Design specs with clear layering
   - Break cycles by introducing abstractions
   - Validate before committing

3. **Minimize coupling**:
   - Prefer `uses_api_from` over `required_by`
   - Use dependency injection
   - Extract shared code to separate specs

4. **Keep graph updated**:
   - Update dependencies when specs change
   - Remove obsolete dependencies
   - Validate periodically

### Context Management

1. **Monitor usage proactively**:
   - Check context analysis regularly
   - Lower threshold for long sessions
   - Preview compaction before executing

2. **Tune compaction strategy**:
   - Adjust `preserveLastN` based on task complexity
   - Increase `targetReduction` for aggressive compaction
   - Use fallback model if LLM unavailable

3. **Backup important sessions**:
   - Enable backups for production runs
   - Keep more backups for critical features
   - Test rollback before relying on it

4. **Optimize context**:
   - Remove verbose logging from context
   - Summarize test output
   - Consolidate repeated information

---

## MCP Tools API Reference

The Memory & Learning System exposes five MCP tools for AI assistants to manage
context health during implementation sessions.

### gofer_expand_observation

Retrieves the full content of a previously masked observation.

**Purpose**: When observation masking reduces context, AI assistants may need to
re-read specific observations. This tool expands masked placeholders back to
full content.

**Parameters**: | Parameter | Type | Required | Description |
|-----------|------|----------|-------------| | `observationId` | string | Yes |
The ID of the masked observation (format: `obs-xxx`) |

**Response**:

```typescript
{
  success: boolean;
  observation?: {
    id: string;
    type: 'file_read' | 'command_output' | 'api_response' | 'search_result' | 'test_output';
    timestamp: number;
    turnNumber: number;
    tokenEstimate: number;
    content: string;  // Full original content
    metadata?: Record<string, unknown>;
  };
  error?: string;
  errorCode?: 'INVALID_OBSERVATION_ID' | 'OBSERVATION_NOT_FOUND' | 'CACHE_ERROR';
}
```

**Example**:

```json
// Request
{ "observationId": "obs-123abc" }

// Response
{
  "success": true,
  "observation": {
    "id": "obs-123abc",
    "type": "file_read",
    "timestamp": 1706200800000,
    "turnNumber": 5,
    "tokenEstimate": 1500,
    "content": "// Full file content here..."
  }
}
```

**Error Codes**:

- `INVALID_OBSERVATION_ID`: ID format invalid (must match `obs-[a-zA-Z0-9]+`)
- `OBSERVATION_NOT_FOUND`: Observation not in cache
- `CACHE_ERROR`: Cache file missing or corrupted

---

### gofer_get_context_health

Returns the current context health status with detailed breakdown.

**Purpose**: Monitor context window utilization to prevent accuracy degradation.
AI assistants should check health periodically and trigger handoffs when
critical.

**Parameters**: | Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------| | `includeBreakdown` |
boolean | No | `true` | Include token breakdown by category |

**Response**:

```typescript
{
  success: boolean;
  health?: {
    status: 'healthy' | 'warning' | 'critical';
    utilizationPercent: number;  // 0-100
    tokensUsed: number;
    tokensLimit: number;
    breakdown?: {
      specArtifacts: number;   // spec.md, plan.md, tasks.md
      memories: number;         // Loaded memories
      hints: number;            // Contextual hints
      observations: number;     // Tool outputs
      systemFiles: number;      // Constitution, CLAUDE.md
      conversation: number;     // Chat history
    };
    recommendations: string[];
    timestamp: number;
  };
  error?: string;
}
```

**Status Thresholds**: | Status | Utilization | Recommendation |
|--------|-------------|----------------| | `healthy` | < 50% | Continue
normally | | `warning` | 50-70% | Consider saving progress | | `critical` | >
70% | Run `/7_gofer_save` immediately |

**Example**:

```json
// Request
{ "includeBreakdown": true }

// Response
{
  "success": true,
  "health": {
    "status": "warning",
    "utilizationPercent": 58.3,
    "tokensUsed": 70000,
    "tokensLimit": 120000,
    "breakdown": {
      "specArtifacts": 15000,
      "memories": 5000,
      "hints": 2000,
      "observations": 40000,
      "systemFiles": 3000,
      "conversation": 5000
    },
    "recommendations": [
      "Consider masking older observations to free up context"
    ],
    "timestamp": 1706200800000
  }
}
```

---

### gofer_get_research_index

Returns the index of available research chunks for a spec.

**Purpose**: Before loading research content, AI assistants can inspect the
index to select only relevant chunks, reducing context usage.

**Parameters**: | Parameter | Type | Required | Description |
|-----------|------|----------|-------------| | `specId` | string | Yes | The
spec ID (e.g., `011-context-health`) |

**Response**:

```typescript
{
  success: boolean;
  index?: {
    sourceFile: string;     // Path to research.md
    totalTokens: number;    // Total tokens if fully loaded
    chunkCount: number;     // Number of chunks available
    created: number;        // Index creation timestamp
    chunks: Array<{
      id: string;           // Chunk ID for loading
      title: string;        // Section heading
      tokens: number;       // Chunk token estimate
      keywords: string[];   // Relevance keywords
    }>;
  };
  error?: string;
  errorCode?: 'INVALID_SPEC_ID' | 'SPEC_NOT_FOUND' | 'NO_RESEARCH_FILE' | 'INDEX_ERROR';
}
```

**Example**:

```json
// Request
{ "specId": "011-context-health" }

// Response
{
  "success": true,
  "index": {
    "sourceFile": ".specify/specs/011-context-health/research.md",
    "totalTokens": 12500,
    "chunkCount": 8,
    "created": 1706200800000,
    "chunks": [
      { "id": "chunk-001", "title": "Overview", "tokens": 800, "keywords": ["context", "health"] },
      { "id": "chunk-002", "title": "Architecture", "tokens": 2000, "keywords": ["design", "components"] },
      { "id": "chunk-003", "title": "Implementation", "tokens": 3500, "keywords": ["code", "typescript"] }
    ]
  }
}
```

---

### gofer_load_research_chunk

Loads a specific chunk of a research document by ID.

**Purpose**: Load only the research sections needed for the current task instead
of the full document, reducing context usage by up to 80%.

**Parameters**: | Parameter | Type | Required | Description |
|-----------|------|----------|-------------| | `specId` | string | Yes | The
spec ID | | `chunkId` | string | Yes | The chunk ID from the index |

**Response**:

```typescript
{
  success: boolean;
  chunk?: {
    id: string;
    sectionTitle: string;
    content: string;           // Full markdown content of the chunk
    tokenEstimate: number;
    relevanceKeywords: string[];
    order: number;             // Position in document (0-indexed)
  };
  error?: string;
  errorCode?: 'INVALID_SPEC_ID' | 'CHUNK_NOT_FOUND' | 'NO_RESEARCH_FILE';
}
```

**Example**:

```json
// Request
{ "specId": "011-context-health", "chunkId": "chunk-002" }

// Response
{
  "success": true,
  "chunk": {
    "id": "chunk-002",
    "sectionTitle": "Architecture",
    "content": "## Architecture\n\nThe context health system consists of...",
    "tokenEstimate": 2000,
    "relevanceKeywords": ["design", "components", "monitor"],
    "order": 1
  }
}
```

**Best Practices**:

1. Call `gofer_get_research_index` first to see available chunks
2. Load only chunks with relevant keywords for current task
3. Prefer smaller chunks over larger ones when possible

---

### gofer_trigger_handoff

Manually triggers a session handoff with context preservation.

**Purpose**: When context reaches critical levels or work needs to continue in a
new session, this tool creates a handoff document capturing current state.

**Parameters**: | Parameter | Type | Required | Description |
|-----------|------|----------|-------------| | `reason` | string | Yes | One
of: `context_critical`, `manual_request`, `stage_complete`, `error_recovery` | |
`currentTask` | string | No | ID of task in progress (e.g., `T042`) | | `notes`
| string | No | Additional context for the next session |

**Response**:

```typescript
{
  success: boolean;
  handoff?: {
    file: string;              // Path to session-handoff.md
    created: number;           // Timestamp
    contextSnapshot: {
      tokensUsed: number;
      utilizationPercent: number;
      completedTasks: string[];
      currentTask?: string;
      stage: string;           // Current Gofer stage
    };
    resumeCommand: string;     // Command to resume work
  };
  error?: string;
  errorCode?: 'NO_ACTIVE_FEATURE';
}
```

**Example**:

```json
// Request
{
  "reason": "context_critical",
  "currentTask": "T045",
  "notes": "Completed memory loading, need to implement fallback logic next"
}

// Response
{
  "success": true,
  "handoff": {
    "file": ".specify/specs/011-context-health/session-handoff.md",
    "created": 1706200800000,
    "contextSnapshot": {
      "tokensUsed": 90000,
      "utilizationPercent": 75,
      "completedTasks": ["T043", "T044"],
      "currentTask": "T045",
      "stage": "implement"
    },
    "resumeCommand": "/8_gofer_resume --feature 011-context-health"
  }
}
```

**Handoff Reasons**: | Reason | When to Use | |--------|-------------| |
`context_critical` | Utilization > 70%, accuracy at risk | | `manual_request` |
User explicitly requests save | | `stage_complete` | Completed a major pipeline
stage | | `error_recovery` | Recovering from errors/blockers |

**What Gets Preserved**:

- Completed task list with IDs
- Current task in progress
- Pipeline stage and context snapshot
- Custom notes for continuation
- Resume command for next session

---

## Additional Resources

- [Implementation Summary](./.specify/specs/001-memory-learning-system/FINAL-IMPLEMENTATION-SUMMARY.md) -
  Complete technical details
- [Tasks and Acceptance Criteria](./.specify/specs/001-memory-learning-system/tasks.md) -
  Full task breakdown
- [CHANGELOG](../extension/CHANGELOG.md) - Release notes and version history
- [GitHub Repository](https://github.com/eai-tools/specgofer) - Source code and
  issues

## Support

- Report issues: [GitHub Issues](https://github.com/eai-tools/gofer/issues)
- Ask questions:
  [GitHub Discussions](https://github.com/eai-tools/gofer/discussions)
- Email: support@gofer.com

---

**Last Updated**: 2025-11-01 **Version**: 2.1.0 **Feature**:
001-memory-learning-system
