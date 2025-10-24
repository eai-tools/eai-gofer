# MCP Tools API Contract

## Overview

The Language Server exposes 6 MCP tools for AI agent coordination. All tools follow the MCP specification with JSON-RPC 2.0 message format.

## Tool: specgofer_get_specs

**Purpose**: Retrieve all specifications with their tasks and status information.

### Request Schema

```json
{
  "method": "tools/call",
  "params": {
    "name": "specgofer_get_specs",
    "arguments": {}
  }
}
```

### Response Schema

```json
{
  "content": [
    {
      "type": "text",
      "text": "JSON response with specs array"
    }
  ],
  "isError": false
}
```

### Response Data Format

```typescript
interface GetSpecsResponse {
  specs: Array<{
    id: string;                    // e.g., "002-language-server"
    title: string;                 // e.g., "Language Server - LSP + MCP"
    status: "draft" | "in_progress" | "completed" | "blocked";
    taskCount: number;             // Total number of tasks
    completedCount: number;        // Number of completed tasks
    tasks: Array<{
      id: string;                  // e.g., "T001"
      description: string;         // Task description
      status: "pending" | "in_progress" | "completed" | "failed";
      dependencies: string[];      // Array of task IDs
    }>;
  }>;
}
```

### Error Responses

```json
{
  "content": [
    {
      "type": "text", 
      "text": "Error: Failed to load specs: {reason}"
    }
  ],
  "isError": true
}
```

## Tool: specgofer_get_next_task

**Purpose**: Get the next available task that can be executed.

### Request Schema

```json
{
  "method": "tools/call",
  "params": {
    "name": "specgofer_get_next_task",
    "arguments": {
      "specId": "string (optional - if omitted, searches all specs)"
    }
  }
}
```

### Response Data Format

```typescript
interface GetNextTaskResponse {
  task: {
    specId: string;
    taskId: string;
    description: string;
    dependencies: string[];
    specTitle: string;
    specDescription: string;
  } | null;  // null if no tasks available
}
```

### Business Rules

- Returns first task with status "in_progress" OR
- Returns first task with status "pending" where all dependencies are "completed"
- Searches specs in alphabetical order by ID
- Returns null if no eligible tasks found

## Tool: specgofer_execute_task

**Purpose**: Start execution of a specific task.

### Request Schema

```json
{
  "method": "tools/call",
  "params": {
    "name": "specgofer_execute_task",
    "arguments": {
      "specId": "string (required)",
      "taskId": "string (required)"
    }
  }
}
```

### Response Data Format

```typescript
interface ExecuteTaskResponse {
  task: {
    specId: string;
    taskId: string;
    description: string;
    specTitle: string;
    specDescription: string;
    acceptanceCriteria: string[];
    constitutionPrinciples: string[];
    relatedFiles: string[];
  };
  context: {
    workspacePath: string;
    specPath: string;
    currentStatus: string;
  };
}
```

### Error Conditions

- **INVALID_SPEC_ID**: Spec does not exist
- **INVALID_TASK_ID**: Task does not exist in spec
- **DEPENDENCIES_NOT_MET**: Required dependencies not completed
- **TASK_ALREADY_COMPLETED**: Task is already completed

## Tool: specgofer_update_task_status

**Purpose**: Update the status of a task and persist to spec file.

### Request Schema

```json
{
  "method": "tools/call",
  "params": {
    "name": "specgofer_update_task_status",
    "arguments": {
      "specId": "string (required)",
      "taskId": "string (required)", 
      "status": "pending | in_progress | completed | failed (required)",
      "notes": "string (optional)"
    }
  }
}
```

### Response Data Format

```typescript
interface UpdateTaskStatusResponse {
  success: boolean;
  previousStatus: string;
  newStatus: string;
  updatedAt: string;  // ISO timestamp
}
```

### Business Rules

- Status transitions must be valid: pending → in_progress → (completed|failed)
- File system updates are atomic
- YAML frontmatter and markdown checkboxes updated simultaneously
- Notes added to commit message if provided

## Tool: specgofer_validate_code

**Purpose**: Validate code against constitution principles.

### Request Schema

```json
{
  "method": "tools/call",
  "params": {
    "name": "specgofer_validate_code",
    "arguments": {
      "code": "string (required - code to validate)",
      "filePath": "string (optional - file context)",
      "language": "string (optional - programming language)"
    }
  }
}
```

### Response Data Format

```typescript
interface ValidateCodeResponse {
  isValid: boolean;
  score: number;        // 0-100 quality score
  issues: Array<{
    type: "error" | "warning" | "info";
    principle: string;  // Which constitution principle violated
    message: string;    // Human-readable description
    line?: number;      // Line number if applicable
    suggestion?: string; // How to fix the issue
  }>;
  metrics: {
    linesOfCode: number;
    complexity: number;
    testCoverage?: number;
  };
}
```

### Validation Rules

Based on constitution principles:
- No `any` types in TypeScript
- Functions ≤300 lines
- Cyclomatic complexity ≤10
- Proper JSDoc documentation
- Security best practices

## Tool: specgofer_run_tests

**Purpose**: Execute tests related to a specification.

### Request Schema

```json
{
  "method": "tools/call",
  "params": {
    "name": "specgofer_run_tests",
    "arguments": {
      "specId": "string (required)",
      "testType": "unit | integration | e2e | all (optional, default: all)"
    }
  }
}
```

### Response Data Format

```typescript
interface RunTestsResponse {
  success: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;  // milliseconds
  };
  failures: Array<{
    testName: string;
    error: string;
    filePath: string;
    line?: number;
  }>;
  coverage?: {
    lines: number;     // percentage
    branches: number;  // percentage
    functions: number; // percentage
  };
}
```

### Test Execution

- Playwright tests for E2E scenarios
- Vitest for unit and integration tests
- Test selection based on spec acceptance criteria
- Coverage reporting for all test types

## Error Handling

### Standard Error Format

All tools return errors in consistent format:

```typescript
interface ToolError {
  code: string;        // Machine-readable error code
  message: string;     // Human-readable error message
  details?: any;       // Additional context (file paths, validation errors, etc.)
}
```

### Common Error Codes

- **INVALID_PARAMETERS**: Required parameters missing or invalid format
- **FILE_NOT_FOUND**: Spec file or related file does not exist
- **PERMISSION_DENIED**: Cannot read or write required files
- **PARSE_ERROR**: Cannot parse YAML frontmatter or Markdown
- **DEPENDENCY_ERROR**: Task dependencies cannot be resolved
- **VALIDATION_ERROR**: Code fails constitution validation
- **TEST_EXECUTION_ERROR**: Test runner failed to execute

### Performance Requirements

- Tool response time: <100ms for query operations
- Tool response time: <1000ms for execution operations
- File I/O operations: <50ms per file
- Memory usage: <100MB for Language Server process
- Concurrent tool calls: Support up to 10 simultaneous requests