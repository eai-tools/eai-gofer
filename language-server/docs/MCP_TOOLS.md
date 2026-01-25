# MCP Tools Documentation

This document describes the Model Context Protocol (MCP) tools provided by the Gofer Language Server for integration with Claude Code and GitHub Copilot.

## Overview

The Gofer Language Server exposes 6 MCP tools that enable Claude Code to interact with the specification system. These tools provide full CRUD operations for specifications and tasks, as well as code validation and testing capabilities.

## Tool Definitions

### 1. specgofer_get_specs

**Description**: Get all specifications from the .specify folder

**Parameters**: None

**Returns**:

```json
{
  "success": true,
  "specs": [
    {
      "id": "001-login-feature",
      "title": "User Login Feature",
      "description": "Implement user authentication system",
      "status": "in_progress",
      "created": "2025-01-01",
      "tasks": [...],
      "acceptanceCriteria": [...],
      "qaRules": [...]
    }
  ]
}
```

**Usage Example**:

```typescript
// Claude Code can call this via MCP
const specs = await tools.call('specgofer_get_specs', {});
console.log(`Found ${specs.specs.length} specifications`);
```

### 2. specgofer_get_next_task

**Description**: Get the next available task to work on based on dependencies and status

**Parameters**: None

**Returns**:

```json
{
  "success": true,
  "task": {
    "id": "T003",
    "specId": "001-login-feature",
    "description": "Implement password validation",
    "status": "pending",
    "dependencies": ["T001", "T002"],
    "deliveryPrompt": "Create password validation function..."
  },
  "spec": {...}
}
```

**Usage Example**:

```typescript
// Get next task to work on
const nextTask = await tools.call('specgofer_get_next_task', {});
if (nextTask.task) {
  console.log(`Working on: ${nextTask.task.description}`);
}
```

### 3. specgofer_execute_task

**Description**: Execute a specific task from a specification and get full context

**Parameters**:

- `specId` (string): The specification ID (e.g., "001-login-feature")
- `taskId` (string): The task ID (e.g., "T001")

**Returns**:

```json
{
  "success": true,
  "task": {
    "id": "T001",
    "description": "Create user authentication API",
    "status": "pending",
    "dependencies": [],
    "deliveryPrompt": "Implement REST API endpoints for user login..."
  },
  "spec": {...},
  "constitution": "Quality requirements and guidelines..."
}
```

**Usage Example**:

```typescript
// Execute specific task
const taskContext = await tools.call('specgofer_execute_task', {
  specId: '001-login-feature',
  taskId: 'T001'
});

console.log(`Task: ${taskContext.task.description}`);
console.log(`Delivery Prompt: ${taskContext.task.deliveryPrompt}`);
```

### 4. specgofer_update_task_status

**Description**: Update the status of a task in the specification file

**Parameters**:

- `specId` (string): The specification ID
- `taskId` (string): The task ID
- `status` (string): New status - one of: `pending`, `in_progress`, `testing`, `completed`, `failed`, `blocked`

**Returns**:

```json
{
  "success": true
}
```

**Usage Example**:

```typescript
// Mark task as completed
const result = await tools.call('specgofer_update_task_status', {
  specId: '001-login-feature',
  taskId: 'T001',
  status: 'completed'
});

if (result.success) {
  console.log('Task status updated successfully');
}
```

### 5. specgofer_validate_code

**Description**: Validate code against constitutional requirements using Claude API

**Parameters**:

- `files` (array): Array of file paths to validate

**Returns**:

```json
{
  "success": true,
  "isValid": true,
  "violations": [],
  "suggestions": [
    "Consider adding JSDoc comments to public methods",
    "Use TypeScript strict mode for better type safety"
  ],
  "score": 85
}
```

**Usage Example**:

```typescript
// Validate implementation against constitution
const validation = await tools.call('specgofer_validate_code', {
  files: ['src/auth/login.ts', 'src/auth/validation.ts']
});

if (!validation.isValid) {
  console.log('Code violations found:', validation.violations);
  console.log('Suggestions:', validation.suggestions);
}
```

### 6. specgofer_run_tests

**Description**: Run Playwright tests for a specification

**Parameters**:

- `specId` (string): The specification ID

**Returns**:

```json
{
  "success": true,
  "testsPassed": true,
  "totalTests": 12,
  "passedTests": 12,
  "failedTests": 0,
  "failedTestNames": [],
  "summary": "All tests passed successfully",
  "duration": 2500
}
```

**Usage Example**:

```typescript
// Run tests for specification
const testResults = await tools.call('specgofer_run_tests', {
  specId: '001-login-feature'
});

if (testResults.testsPassed) {
  console.log(`All ${testResults.totalTests} tests passed!`);
} else {
  console.log(`${testResults.failedTests} tests failed:`, 
              testResults.failedTestNames);
}
```

## Error Handling

All MCP tools return structured error responses when failures occur:

```json
{
  "success": false,
  "error": "Specification not found: 001-invalid-spec",
  "code": "NOT_FOUND"
}
```

Common error codes:

- `NOT_INITIALIZED`: Server components not properly initialized
- `NOT_FOUND`: Specification or task not found
- `VALIDATION_ERROR`: Invalid parameters provided
- `FILE_ERROR`: File system operation failed
- `API_ERROR`: External API call failed
- `TEST_ERROR`: Test execution failed

## Integration with Claude Code

These MCP tools are automatically available in Claude Code when the Gofer extension is installed and the workspace contains a `.specify` folder.

### Workflow Example

```typescript
// 1. Get available specs
const specs = await tools.call('specgofer_get_specs', {});

// 2. Get next task to work on
const nextTask = await tools.call('specgofer_get_next_task', {});

// 3. Execute the task
const taskContext = await tools.call('specgofer_execute_task', {
  specId: nextTask.task.specId,
  taskId: nextTask.task.id
});

// 4. Implement the feature (Claude writes code)
// ... implementation work ...

// 5. Validate the implementation
const validation = await tools.call('specgofer_validate_code', {
  files: ['src/newFeature.ts']
});

// 6. Run tests
const testResults = await tools.call('specgofer_run_tests', {
  specId: taskContext.spec.id
});

// 7. Update task status
if (testResults.testsPassed && validation.isValid) {
  await tools.call('specgofer_update_task_status', {
    specId: taskContext.spec.id,
    taskId: taskContext.task.id,
    status: 'completed'
  });
}
```

## Security Considerations

- All file paths are validated to prevent path traversal attacks
- Input parameters are sanitized and validated
- Security violations are logged for monitoring
- Rate limiting prevents abuse of external API calls

## Performance Notes

- Specifications are cached in memory for faster access
- File system operations are optimized with async I/O
- Performance metrics are logged for monitoring
- Background operations don't block the main thread

## Debugging

Enable debug logging in VSCode settings:

```json
{
  "gofer.debug": true,
  "gofer.logLevel": "debug"
}
```

Check the "Gofer Language Server" output channel for detailed logs.