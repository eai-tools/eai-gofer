# Data Model - Language Server

## Core Entities

### Spec
Represents a single specification in the GitHub Spec Kit format.

```typescript
interface Spec {
  id: string;                    // From YAML frontmatter (e.g., "002-language-server")
  title: string;                 // From YAML frontmatter
  status: SpecStatus;            // "draft" | "in_progress" | "completed" | "blocked"
  created: string;               // ISO date from YAML frontmatter
  updated?: string;              // ISO date from YAML frontmatter
  priority?: "low" | "medium" | "high" | "critical";
  assignee?: string;             // From YAML frontmatter
  filePath: string;              // Absolute path to spec.md file
  content: string;               // Full markdown content
  tasks: Task[];                 // Parsed from markdown task lists
}
```

**Validation Rules**:
- ID must match directory name format: `###-kebab-case`
- Status must be valid enum value
- FilePath must exist and be readable
- Tasks must have valid dependency references

### Task
Represents a single task within a specification.

```typescript
interface Task {
  id: string;                    // Task ID (e.g., "T001", "T012") 
  specId: string;                // Parent spec ID
  description: string;           // Task description text
  status: TaskStatus;            // "pending" | "in_progress" | "completed" | "failed"
  dependencies: string[];        // Array of dependency task IDs
  filePath?: string;             // File to be modified (if specified)
  estimatedHours?: number;       // Time estimate (if specified)
  actualHours?: number;          // Actual time spent
  assignee?: string;             // Who is working on this task
  createdAt: Date;               // When task was created
  updatedAt: Date;               // Last status change
}
```

**Validation Rules**:
- ID must be unique within spec
- Dependencies must reference valid task IDs
- Circular dependencies are not allowed
- Status transitions must follow: pending → in_progress → (completed|failed)

### MCPToolRequest
Represents an incoming MCP tool call request.

```typescript
interface MCPToolRequest {
  tool: string;                  // Tool name (e.g., "specgofer_get_specs")
  parameters: Record<string, any>; // Tool-specific parameters
  requestId: string;             // Unique request identifier
  timestamp: Date;               // When request was received
}
```

### MCPToolResponse
Represents an MCP tool call response.

```typescript
interface MCPToolResponse {
  requestId: string;             // Matching request ID
  success: boolean;              // Whether tool executed successfully
  data?: any;                    // Tool-specific response data
  error?: {
    code: string;                // Error code (e.g., "INVALID_SPEC_ID")
    message: string;             // Human-readable error message
    details?: any;               // Additional error context
  };
  timestamp: Date;               // When response was generated
  executionTimeMs: number;       // How long tool took to execute
}
```

## Relationships

### Spec → Tasks (One-to-Many)
- Each Spec contains multiple Tasks
- Tasks reference their parent Spec via `specId`
- Task dependencies can only reference tasks within the same spec

### Task → Task Dependencies (Many-to-Many)
- Tasks can depend on multiple other tasks
- Tasks can be dependencies for multiple other tasks
- Dependencies must be acyclic (no circular references)

### LSP Client → Language Server (One-to-One)
- VSCode extension spawns single Language Server process
- Communication via stdio using LSP protocol

### MCP Client → Language Server (Many-to-One)
- Multiple AI agents can connect to same Language Server
- Each tool call is independent and stateless
- No session state maintained between calls

## State Transitions

### Spec Status Flow
```
draft → in_progress → completed
   ↓         ↓
blocked ← blocked
```

### Task Status Flow
```
pending → in_progress → completed
             ↓
           failed (max 3 attempts)
```

**Transition Rules**:
- Spec becomes `in_progress` when first task starts
- Spec becomes `completed` when all tasks are completed
- Spec becomes `blocked` if critical dependencies fail
- Task can only start if all dependencies are `completed`

## Persistence Strategy

### File-Based Storage
All data is persisted in the file system following GitHub Spec Kit format:

- **Specs**: Stored as `.specify/specs/###-name/spec.md` with YAML frontmatter
- **Tasks**: Embedded in spec.md as markdown task lists with checkboxes
- **Status Updates**: Modify YAML frontmatter and task checkboxes in-place
- **Dependencies**: Encoded in task description: `(deps: T001, T002)`

### Atomic Updates
- File writes are atomic using temp files and rename operations
- YAML frontmatter preserved during status updates
- Markdown formatting maintained during task status changes

### Concurrency Control
- No file locking - last write wins
- Tool calls update single tasks atomically
- Status reads always reflect current file state
- No caching across tool calls (stateless design)

## Performance Considerations

### Caching Strategy
- Specs loaded on demand and cached in memory
- Cache invalidated on file system changes
- Parsed YAML frontmatter cached separately from content
- Task dependency graph computed once per spec load

### Batch Operations
- Multiple task status updates batched into single file write
- Spec loading can process multiple specs in parallel
- Tool responses include minimal required data to reduce payload size

### Memory Management
- Large spec content not kept in memory after parsing
- Only metadata and task lists cached
- Garbage collection after each tool call completes