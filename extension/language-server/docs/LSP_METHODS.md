# LSP Custom Methods Documentation

This document describes the custom Language Server Protocol (LSP) methods
provided by the Gofer Language Server for extension communication.

## Overview

The Gofer Language Server extends the standard LSP with custom methods that
enable the VSCode extension to interact with the specification system. These
methods provide the same functionality as MCP tools but are designed for
extension-to-server communication.

## Custom LSP Methods

### 1. gofer/getSpecs

**Description**: Get all specifications from the .specify folder

**Request**:

```typescript
interface GetSpecsRequest {
  method: 'gofer/getSpecs';
  params: {};
}
```

**Response**:

```typescript
interface GetSpecsResponse {
  success: boolean;
  specs?: Spec[];
  error?: string;
}

interface Spec {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'in_progress' | 'testing' | 'completed' | 'failed';
  created: string;
  tasks: Task[];
  acceptanceCriteria: AcceptanceCriteria[];
  qaRules: QARule[];
}
```

**Usage Example**:

```typescript
// From VSCode Extension
const response = await connection.sendRequest('gofer/getSpecs', {});
if (response.success) {
  console.log(`Found ${response.specs.length} specifications`);
}
```

### 2. gofer/executeTask

**Description**: Execute a specific task and get full context

**Request**:

```typescript
interface ExecuteTaskRequest {
  method: 'gofer/executeTask';
  params: {
    specId: string;
    taskId: string;
    context?: unknown;
  };
}
```

**Response**:

```typescript
interface ExecuteTaskResponse {
  success: boolean;
  task?: Task;
  spec?: Spec;
  error?: string;
}

interface Task {
  id: string;
  description: string;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'testing' | 'completed' | 'failed';
  deliveryPrompt: string;
  attempts?: number;
  lastError?: string;
}
```

**Usage Example**:

```typescript
// From VSCode Extension
const response = await connection.sendRequest('gofer/executeTask', {
  specId: '001-login-feature',
  taskId: 'T001',
});

if (response.success) {
  console.log(`Task: ${response.task.description}`);
  console.log(`Status: ${response.task.status}`);
}
```

### 3. gofer/updateTaskStatus

**Description**: Update the status of a task in the specification file

**Request**:

```typescript
interface UpdateTaskStatusRequest {
  method: 'gofer/updateTaskStatus';
  params: {
    specId: string;
    taskId: string;
    status:
      | 'pending'
      | 'in_progress'
      | 'testing'
      | 'completed'
      | 'failed'
      | 'blocked';
  };
}
```

**Response**:

```typescript
interface UpdateTaskStatusResponse {
  success: boolean;
  error?: string;
}
```

**Usage Example**:

```typescript
// From VSCode Extension
const response = await connection.sendRequest('gofer/updateTaskStatus', {
  specId: '001-login-feature',
  taskId: 'T001',
  status: 'completed',
});

if (response.success) {
  console.log('Task status updated successfully');
}
```

## Standard LSP Capabilities

In addition to custom methods, the server provides standard LSP capabilities:

### Text Document Synchronization

- **Sync Kind**: Incremental
- **Change Notifications**: Supported
- **Will Save**: Not implemented
- **Will Save Wait Until**: Not implemented
- **Save**: Not implemented

### Completion

- **Completion Provider**: Enabled
- **Resolve Provider**: Enabled
- **Trigger Characters**: None configured

### Workspace

- **Workspace Folders**: Supported
- **File Events**: Supported
- **Configuration**: Supported

## Error Handling

All custom LSP methods return structured responses with error information:

```typescript
interface ErrorResponse {
  success: false;
  error: string;
}
```

Common error scenarios:

1. **Server Not Initialized**:

   ```json
   {
     "success": false,
     "error": "Gofer loader not initialized"
   }
   ```

2. **Validation Errors**:

   ```json
   {
     "success": false,
     "error": "specId and taskId are required"
   }
   ```

3. **Not Found Errors**:

   ```json
   {
     "success": false,
     "error": "Specification not found: 001-invalid-spec"
   }
   ```

4. **File System Errors**:

   ```json
   {
     "success": false,
     "error": "Failed to update specification file: ENOENT"
   }
   ```

## Client Capabilities Detection

The server detects and adapts to client capabilities:

```typescript
interface ClientCapabilities {
  workspace?: {
    configuration?: boolean;
    workspaceFolders?: boolean;
  };
  textDocument?: {
    publishDiagnostics?: {
      relatedInformation?: boolean;
    };
  };
}
```

## Initialization Sequence

1. **Client sends `initialize` request**
2. **Server responds with capabilities**
3. **Client sends `initialized` notification**
4. **Server registers for configuration changes (if supported)**
5. **Server loads specifications from workspace**

Example initialization:

```typescript
// Client -> Server
{
  "id": 1,
  "method": "initialize",
  "params": {
    "processId": 12345,
    "rootUri": "file:///path/to/workspace",
    "capabilities": {...},
    "workspaceFolders": [
      {
        "uri": "file:///path/to/workspace",
        "name": "my-project"
      }
    ]
  }
}

// Server -> Client
{
  "id": 1,
  "result": {
    "capabilities": {
      "textDocumentSync": 2,
      "completionProvider": {
        "resolveProvider": true
      },
      "experimental": {
        "mcp": {
          "tools": [...]
        }
      }
    }
  }
}
```

## Configuration

The server accepts configuration changes via LSP:

```json
{
  "specgofer": {
    "debug": false,
    "logLevel": "info",
    "specDirectory": ".specify",
    "cacheEnabled": true,
    "maxCacheSize": 100
  }
}
```

## Performance Considerations

- **Async Operations**: All file I/O is asynchronous
- **Caching**: Specifications are cached in memory
- **Incremental Updates**: Only changed documents are reprocessed
- **Background Tasks**: Heavy operations run in background

## Integration with VSCode Extension

The extension communicates with the language server using these methods:

```typescript
// Extension code example
export class GoferExtension {
  private client: LanguageClient;

  async getSpecs(): Promise<Spec[]> {
    const response = await this.client.sendRequest('gofer/getSpecs', {});
    if (response.success) {
      return response.specs;
    }
    throw new Error(response.error);
  }

  async executeTask(specId: string, taskId: string): Promise<Task> {
    const response = await this.client.sendRequest('gofer/executeTask', {
      specId,
      taskId,
    });
    if (response.success) {
      return response.task;
    }
    throw new Error(response.error);
  }

  async updateTaskStatus(
    specId: string,
    taskId: string,
    status: string
  ): Promise<void> {
    const response = await this.client.sendRequest('gofer/updateTaskStatus', {
      specId,
      taskId,
      status,
    });
    if (!response.success) {
      throw new Error(response.error);
    }
  }
}
```

## Debugging

To debug LSP communication:

1. **Enable LSP logging in VSCode**:

   ```json
   {
     "typescript.preferences.includePackageJsonAutoImports": "off",
     "gofer.trace.server": "verbose"
   }
   ```

2. **Check Output panel**: "Gofer Language Server"

3. **Server logs include**:
   - Request/response pairs
   - Performance metrics
   - Error details
   - Configuration changes

## Migration from Legacy API

The current custom methods replace legacy implementations:

| Legacy                | Current                  | Notes                   |
| --------------------- | ------------------------ | ----------------------- |
| `getSpecifications()` | `gofer/getSpecs`         | Improved error handling |
| `executeTask()`       | `gofer/executeTask`      | Added context parameter |
| `updateStatus()`      | `gofer/updateTaskStatus` | Validates status values |

## Future Enhancements

Planned additions:

- **gofer/searchTasks**: Search tasks by criteria
- **gofer/validateSpec**: Validate specification format
- **gofer/generateReport**: Generate progress reports
- **gofer/importSpec**: Import external specifications
