# LSP Protocol Contract

**Phase**: 1 (Design & Contracts) **Date**: 2025-10-22

## Overview

Language Server Protocol (LSP) communication contract between VSCode extension
(client) and Language Server (server). The Language Server also exposes MCP
tools via the same stdio channel.

## Transport

**Protocol**: JSON-RPC 2.0 over stdio **Client**: VSCode Extension
(`lspClient.ts`) **Server**: Language Server (`language-server/src/server.ts`)

## Initialization

### initialize Request

**Method**: `initialize` **Direction**: Client → Server

**Params**:

```typescript
{
  processId: number | null;
  rootUri: string; // e.g., "file:///Users/user/project"
  capabilities: ClientCapabilities;
}
```

**Response**:

```typescript
{
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Full;
    workspace: {
      workspaceFolders: {
        supported: true;
      }
    }
  }
  serverInfo: {
    name: 'SpecGofer Language Server';
    version: '1.0.0';
  }
}
```

### initialized Notification

**Method**: `initialized` **Direction**: Client → Server **Params**: `{}`

Server loads specs after receiving this notification.

## Custom LSP Methods

### specgofer/loadSpecs

Load all specifications from `.specify/specs/` directory.

**Method**: `specgofer/loadSpecs` **Direction**: Client → Server **Request
Params**: `{}`

**Response**:

```typescript
{
  specs: Spec[];
  count: number;
}
```

**Errors**:

- `-32001`: Directory not found
- `-32002`: Parse error

### specgofer/getNextTask

Get next available task based on dependencies.

**Method**: `specgofer/getNextTask` **Direction**: Client → Server **Request
Params**: `{ specId?: string }`

**Response**:

```typescript
{
  task: Task | null;
  spec: Spec;
  reason?: string;  // If no task available
}
```

## MCP Tools (via LSP)

The Language Server exposes MCP tools through LSP custom methods:

- `specgofer_get_specs` → `specgofer/loadSpecs`
- `specgofer_get_next_task` → `specgofer/getNextTask`
- `specgofer_execute_task` → Updates task status to `in_progress`
- `specgofer_update_task_status` → Updates task status
- `specgofer_validate_code` → Runs constitution validation
- `specgofer_run_tests` → Executes Playwright tests

See [MCP Tools Documentation](../../../language-server/src/mcp/README.md) for
details.

## Notifications

### specgofer/specsChanged

Sent when specs are modified on disk.

**Method**: `specgofer/specsChanged` **Direction**: Server → Client **Params**:
`{ specIds: string[] }`

Client should refresh tree views.

## Performance Contracts

- Server start: <1s
- Spec loading: <500ms for 100+ specs
- Custom method response: <100ms

## Error Codes

- `-32001`: Resource not found
- `-32002`: Parse error
- `-32003`: Validation error
- `-32004`: Circular dependency detected

## Summary

LSP protocol defined for extension-server communication. MCP tools exposed
through LSP for Claude Code integration.
