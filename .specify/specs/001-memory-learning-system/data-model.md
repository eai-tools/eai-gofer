# Data Model: Memory and Learning System

**Feature**: Memory and Learning System **Phase**: Phase 1 - Design **Date**:
2025-10-31

## Overview

This document defines the data structures, relationships, and state management
for the Memory and Learning System. All entities are designed for
retrieval-based learning (not ML training) with persistence across VSCode
sessions.

## Entity Schemas

### Memory

Represents a single learned piece of information that persists across sessions.

```typescript
interface Memory {
  // Identity
  id: string; // UUID v4 (e.g., "550e8400-e29b-41d4-a716-446655440000")

  // Classification
  category: string; // e.g., "development_standards", "api_patterns", "preferences"
  tags: string[]; // e.g., ["#typescript", "#testing", "#vitest"]
  scope: 'local' | 'global'; // local = project-specific, global = user-wide

  // Content
  content: string; // User-provided text (no length limit, but UI truncates at 500 chars)

  // Metadata
  created: number; // Unix timestamp (milliseconds)
  lastUsed: number; // Unix timestamp (milliseconds)
  usedCount: number; // Incremented each time memory is loaded
  learnedFrom: string; // spec-id (e.g., "005-auth") or "user_interaction"
}
```

**Validation Rules**:

- `id`: Must be valid UUID v4
- `category`: 1-50 characters, alphanumeric + underscores
- `tags`: Each tag 1-30 characters, starts with `#`
- `content`: 1-10,000 characters
- `scope`: Must be exactly 'local' or 'global'
- `usedCount`: >= 0

**Example**:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "category": "api_patterns",
  "tags": ["#rest", "#error-handling"],
  "scope": "local",
  "content": "API errors use format: { error: { code: string, message: string } }",
  "created": 1730419200000,
  "lastUsed": 1730505600000,
  "usedCount": 12,
  "learnedFrom": "spec-005-authentication"
}
```

---

### HintFile

Represents a markdown file containing coding standards, patterns, or project
context.

```typescript
interface HintFile {
  // Identity
  path: string; // Absolute file path (e.g., "/project/.specify/hints/api/conventions.md")

  // Classification
  scope: 'global' | 'project' | 'directory';
  priority: number; // 1-10, higher = more specific (directory=10, project=5, global=1)

  // Content
  content: string; // Full markdown content

  // Metadata (optional YAML frontmatter)
  metadata?: {
    title?: string; // Human-readable name
    tags?: string[]; // Categorization tags
    version?: string; // Hint file version (for tracking changes)
  };
}
```

**Scope Priority** (for conflict resolution):

```
directory (10) > project (5) > global (1)
```

**Validation Rules**:

- `path`: Must exist and be `.md` file
- `scope`: Must be 'global', 'project', or 'directory'
- `priority`: 1-10 integer
- `content`: Valid markdown (warnings only, non-blocking)

**Example**:

```json
{
  "path": "/Users/dev/project/.specify/hints/api/rest-conventions.md",
  "scope": "directory",
  "priority": 10,
  "content": "# REST API Conventions\n\n## HTTP Methods\n...",
  "metadata": {
    "title": "REST API Design Standards",
    "tags": ["#api", "#rest"],
    "version": "1.0.0"
  }
}
```

---

### SpecDependency

Represents a directed edge in the dependency graph between two specs.

```typescript
interface SpecDependency {
  // Edge
  fromSpecId: string; // e.g., "002-user-profile" (dependent)
  toSpecId: string; // e.g., "001-authentication" (dependency)

  // Classification
  dependencyType: 'required_by' | 'uses_api_from' | 'blocks';
  declared: boolean; // true = in frontmatter, false = inferred

  // Metadata
  metadata?: {
    reason?: string; // Why this dependency exists
    addedAt?: number; // Unix timestamp when added
  };
}
```

**Dependency Types**:

- `required_by`: Hard dependency (must complete before dependent)
- `uses_api_from`: API dependency (uses endpoints/functions from dependency)
- `blocks`: Blocking dependency (dependent cannot proceed until this completes)

**Validation Rules**:

- `fromSpecId`, `toSpecId`: Must match pattern `\d{3}-[a-z0-9-]+`
- `fromSpecId !== toSpecId`: No self-dependencies
- `dependencyType`: Must be one of three allowed values

**Example**:

```json
{
  "fromSpecId": "002-user-profile",
  "toSpecId": "001-authentication",
  "dependencyType": "uses_api_from",
  "declared": true,
  "metadata": {
    "reason": "User profile requires JWT tokens from authentication API",
    "addedAt": 1730419200000
  }
}
```

---

### DependencyGraph

Graph structure containing all spec relationships.

```typescript
interface DependencyGraph {
  // Graph data
  nodes: Map<string, SpecNode>; // specId → node
  edges: SpecDependency[]; // Array of all dependencies

  // Metadata
  version: number; // Schema version for migrations
  lastModified: number; // Unix timestamp
}

interface SpecNode {
  specId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  metadata?: {
    title?: string;
    createdAt?: number;
  };
}
```

**File Storage Format** (`.specify/memory/dependency-graph.json`):

```json
{
  "version": 1,
  "lastModified": 1730505600000,
  "nodes": {
    "001-authentication": {
      "specId": "001-authentication",
      "status": "completed",
      "metadata": {
        "title": "Authentication System",
        "createdAt": 1730419200000
      }
    },
    "002-user-profile": {
      "specId": "002-user-profile",
      "status": "in_progress"
    }
  },
  "edges": [
    {
      "fromSpecId": "002-user-profile",
      "toSpecId": "001-authentication",
      "dependencyType": "uses_api_from",
      "declared": true
    }
  ]
}
```

---

### CompactionSummary

Represents the result of a context compaction operation.

```typescript
interface CompactionSummary {
  // Identity
  sessionId: string; // UUID of autonomous execution session

  // Compaction details
  tasksCompacted: string[]; // Task IDs that were summarized (e.g., ["T001", "T015"])
  summaryText: string; // Human-readable summary (max 2000 chars)
  tokensSaved: number; // Estimated tokens removed from context
  compactedAt: number; // Unix timestamp

  // Preservation
  preservedTasks: string[]; // Last N tasks kept in full detail
}
```

**Example**:

```json
{
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "tasksCompacted": ["T001", "T002", "T003", "T015", "T020"],
  "summaryText": "Completed 15 tasks: Set up project structure, configured dependencies, implemented authentication API with JWT tokens, added unit tests (95% coverage), fixed 3 TypeScript errors.",
  "tokensSaved": 45000,
  "compactedAt": 1730505600000,
  "preservedTasks": ["T031", "T032", "T033", "T034", "T035"]
}
```

---

### Session (Autonomous Execution)

Represents an active or historical autonomous execution session.

```typescript
interface Session {
  // Identity
  id: string; // UUID
  specId: string; // Which spec is being executed

  // State
  status: 'active' | 'paused' | 'completed' | 'failed';
  currentTask: string | null; // Current task ID (e.g., "T015")
  completedTasks: string[]; // Array of completed task IDs
  failedTasks: string[]; // Array of failed task IDs

  // Context management
  context: string; // Current LLM context (full text)
  compactionHistory: CompactionSummary[];

  // Metadata
  startedAt: number;
  lastUpdatedAt: number;
  completedAt?: number;
}
```

**Storage**: `.specify/state/sessions/{sessionId}.json`

---

## Relationships

### Memory Relationships

```
User ──creates──> Memory
Memory ──used_by──> AutonomousDriver
Memory ──learned_from──> Spec
Memory ──has──> Scope (local | global)
```

**Cardinality**:

- User : Memory = 1 : N (one user, many memories)
- Memory : Spec = N : 1 (memory can relate to one spec)
- Memory : Session = N : M (memory used in many sessions, session uses many
  memories)

---

### Hint File Relationships

```
HintFile ──located_in──> Directory
HintFile ──loaded_by──> ContextBuilder
Spec ──declares──> HintFile (via frontmatter)
Task ──triggers──> HintFile (via affected files)
```

**Cardinality**:

- Directory : HintFile = 1 : N (one directory, multiple hint files)
- Spec : HintFile = N : M (spec can declare multiple hints, hint used by
  multiple specs)

---

### Spec Dependency Relationships

```
Spec ──depends_on──> Spec (via SpecDependency)
SpecDependency ──stored_in──> DependencyGraph
DependencyGraph ──enforces──> ExecutionOrder
```

**Cardinality**:

- Spec : Spec = N : M (many-to-many via dependency edges)
- DependencyGraph : SpecDependency = 1 : N (one graph, many edges)

**Constraints**:

- No self-dependencies (spec cannot depend on itself)
- No circular dependencies (enforced by cycle detection)
- Transitive dependencies allowed (A→B, B→C means A indirectly depends on C)

---

## State Transitions

### Memory Lifecycle

```
[Created] ──save()──> [Stored]
[Stored] ──search()──> [Retrieved]
[Retrieved] ──load()──> [Active] ──inject()──> [In Context]
[Stored] ──forget()──> [Deleted]
[In Context] ──use()──> [Updated usedCount, lastUsed]
```

**State Rules**:

- `usedCount` increments each time memory is loaded
- `lastUsed` updates to current timestamp on load
- Deleted memories cannot be recovered (no trash/archive)

---

### Session Lifecycle

```
[New] ──start()──> [Active]
[Active] ──pause()──> [Paused]
[Paused] ──resume()──> [Active]
[Active] ──complete()──> [Completed]
[Active] ──fail()──> [Failed]
[Active] ──compact()──> [Active] (with updated context)
```

**State Rules**:

- Only one `[Active]` session per spec at a time
- `[Paused]` sessions can be resumed across VSCode restarts
- `[Completed]` and `[Failed]` sessions are archived
- Compaction does not change session state

---

### Dependency Graph Updates

```
[Empty] ──addSpec()──> [Has Nodes]
[Has Nodes] ──addDependency()──> [Has Edges]
[Has Edges] ──detectCycles()──> [Validated] or [Invalid]
[Validated] ──topologicalSort()──> [Execution Order]
[Has Edges] ──removeSpec()──> [Updated] (orphaned edges cleaned)
```

---

## Storage Locations & Formats

### Local Storage (Project-Specific, Git-Committable)

```text
.specify/
├── memory/
│   ├── local.json              # Array of Memory objects (local scope only)
│   └── dependency-graph.json   # DependencyGraph object
├── hints/
│   ├── global.md               # Global project hints (HintFile)
│   ├── api/
│   │   └── conventions.md      # Directory-specific hints
│   └── frontend/
│       └── components.md       # Directory-specific hints
└── state/
    └── sessions/
        └── {sessionId}.json    # Session objects (excluded from git)
```

**local.json Format**:

```json
{
  "version": 1,
  "memories": [
    {
      /* Memory object */
    },
    {
      /* Memory object */
    }
  ]
}
```

---

### Global Storage (User-Specific, VSCode GlobalState)

**Key**: `specgofer.memories.global`

**Format**:

```json
{
  "version": 1,
  "memories": [
    {
      /* Memory object with scope='global' */
    }
  ]
}
```

**Access**:

```typescript
const memories = context.globalState.get<StoredMemories>(
  'specgofer.memories.global',
  {
    version: 1,
    memories: [],
  }
);

await context.globalState.update('specgofer.memories.global', {
  version: 1,
  memories: updatedMemories,
});
```

---

## Validation & Integrity

### Memory Validation

```typescript
function validateMemory(memory: Memory): ValidationResult {
  const errors: string[] = [];

  // UUID validation
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      memory.id
    )
  ) {
    errors.push('Invalid UUID format');
  }

  // Category validation
  if (memory.category.length < 1 || memory.category.length > 50) {
    errors.push('Category must be 1-50 characters');
  }

  // Content validation
  if (memory.content.length < 1 || memory.content.length > 10000) {
    errors.push('Content must be 1-10,000 characters');
  }

  // Tag validation
  for (const tag of memory.tags) {
    if (!tag.startsWith('#')) {
      errors.push(`Tag must start with #: ${tag}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

### Dependency Graph Validation

```typescript
function validateDependencyGraph(graph: DependencyGraph): ValidationResult {
  const errors: string[] = [];

  // Check for cycles
  const cycles = detectCycles(graph);
  if (cycles) {
    errors.push(`Circular dependencies detected: ${cycles.join(' -> ')}`);
  }

  // Check for orphaned edges (edge references non-existent node)
  for (const edge of graph.edges) {
    if (!graph.nodes.has(edge.fromSpecId)) {
      errors.push(`Edge references missing node: ${edge.fromSpecId}`);
    }
    if (!graph.nodes.has(edge.toSpecId)) {
      errors.push(`Edge references missing node: ${edge.toSpecId}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

## Performance Considerations

### Memory Storage Limits

| Metric              | Limit        | Rationale                                 |
| ------------------- | ------------ | ----------------------------------------- |
| Global memories     | 1,000        | VSCode globalState recommendation (<10MB) |
| Local memories      | 10,000       | JSON file performance (<1MB typical)      |
| Memory content size | 10,000 chars | Prevent excessively large memories        |
| Search time         | <1s          | User expectation for interactive search   |

### Dependency Graph Limits

| Metric                | Limit  | Rationale                                 |
| --------------------- | ------ | ----------------------------------------- |
| Specs in graph        | 100    | A-003 assumption, tested performance      |
| Dependencies per spec | 20     | Practical limit for manageable complexity |
| Cycle detection time  | <100ms | Near-instant feedback for validation      |
| Topological sort time | <100ms | Execution order calculation               |

### Hint File Limits

| Metric                 | Limit          | Rationale                           |
| ---------------------- | -------------- | ----------------------------------- |
| Hint files per project | 50             | Tested discovery time <500ms        |
| Hint file size         | 100KB          | Large enough for comprehensive docs |
| Discovery time         | <500ms         | SC-007 requirement                  |
| Cache invalidation     | On file change | VSCode file watcher                 |

---

## Migration & Versioning

### Version 1 → Version 2 (Example)

If schema changes are needed (e.g., adding `priority` field to Memory):

```typescript
interface StoredMemories {
  version: number;
  memories: Memory[];
}

function migrateMemoriesV1ToV2(stored: StoredMemories): StoredMemories {
  if (stored.version === 1) {
    return {
      version: 2,
      memories: stored.memories.map((m) => ({
        ...m,
        priority: 5, // Default priority for migrated memories
      })),
    };
  }
  return stored;
}
```

**Migration Strategy**:

1. Detect version on load
2. Apply migrations sequentially (v1→v2, v2→v3, etc.)
3. Save with new version number
4. Log migration success

---

## References

- Feature Specification: [spec.md](./spec.md)
- Implementation Plan: [plan.md](./plan.md)
- Research Findings: [research.md](./research.md)
- TypeScript Contracts: [contracts/](./contracts/)
