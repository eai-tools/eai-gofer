# Gofer Language Server

A dual-protocol server implementing both Language Server Protocol (LSP) and
Model Context Protocol (MCP) for spec-driven development with AI coding agents.

## Overview

The Gofer Language Server serves as the bridge between the VSCode extension and
AI coding agents (Claude Code, GitHub Copilot). It provides:

- **LSP Communication**: Custom methods for extension-to-server communication
- **MCP Tools**: 6 tools that AI agents can invoke to interact with
  specifications
- **Gofer Integration**: Loads and parses GitHub Gofer format specifications
- **Real-time Updates**: Notifies extension when task status changes

## Architecture

```
language-server/
├── src/
│   ├── server.ts                 # Main LSP + MCP server
│   ├── mcp/
│   │   └── toolHandler.ts        # MCP tool implementations
│   └── utils/
│       └── goferLoader.ts      # Spec loading and parsing
├── dist/                          # Compiled JavaScript
├── package.json
└── tsconfig.json
```

## MCP Tools

The server exposes 6 MCP tools for AI agents:

### 1. `gofer_get_specs`

Get all specifications from `.specify/specs/`

**Parameters**: None

**Returns**:

```typescript
{
  specs: Array<{
    id: string;
    title: string;
    status: string;
    tasks: Array<{
      id: string;
      description: string;
      status: 'pending' | 'in_progress' | 'testing' | 'completed' | 'failed';
      dependencies: string[];
    }>;
  }>;
}
```

### 2. `gofer_get_next_task`

Get the next available task to work on (respects dependencies)

**Parameters**: None

**Returns**:

```typescript
{
  specId: string;
  taskId: string;
  description: string;
  context: string;  // Full spec context
} | null
```

### 3. `gofer_execute_task`

Get full context for executing a specific task

**Parameters**:

- `specId` (string): Specification ID (e.g., "001-login-feature")
- `taskId` (string): Task ID (e.g., "T001")

**Returns**:

```typescript
{
  spec: {
    title: string;
    description: string;
    acceptanceCriteria: string[];
  };
  task: {
    description: string;
    requirements: string;
  };
  constitution: {
    principles: string[];
  };
  relatedFiles: string[];
}
```

### 4. `gofer_update_task_status`

Update task status in spec file

**Parameters**:

- `specId` (string): Specification ID
- `taskId` (string): Task ID
- `status` (string): One of: `pending`, `in_progress`, `testing`, `completed`,
  `failed`, `blocked`

**Returns**:

```typescript
{
  success: boolean;
}
```

### 5. `gofer_validate_code`

Validate code against constitutional requirements

**Parameters**:

- `files` (string[]): Array of file paths to validate

**Returns**:

```typescript
{
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}
```

### 6. `gofer_run_tests`

Run Playwright tests for a specification

**Parameters**:

- `specId` (string): Specification ID

**Returns**:

```typescript
{
  passed: boolean;
  failedTests: string[];
  summary: string;
}
```

## LSP Custom Methods

The server also provides custom LSP methods for the VSCode extension:

### `gofer/getSpecs`

Returns all specifications (similar to MCP tool but via LSP)

### `gofer/executeTask`

Execute a task (called by extension UI)

### `gofer/updateTaskStatus`

Update task status and notify extension

## Setup

### Installation

```bash
cd language-server
npm install
npm run build
```

### Usage

The server is automatically launched by the VSCode extension. It can also be
started manually:

```bash
node dist/server.js --stdio
```

### Configuration

The server requires:

- Workspace root path (provided during LSP initialization)
- `.specify/specs/` directory in workspace

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Testing

Integration tests are located in `../tests/integration/mcpTools.test.ts`

```bash
cd ..
npm run test:integration
```

## Security

The server implements security measures:

- **Input Validation**: All spec IDs and task IDs are validated for format
- **Path Traversal Prevention**: File paths are validated to prevent `../`
  attacks
- **Length Limits**: Response sizes are limited to prevent DoS
- **Error Sanitization**: System paths are not exposed in error messages

## Performance

Performance targets:

- Server startup: <1s
- Spec loading: <500ms for 100+ specs
- Tool response time: <100ms
- Cached specs in memory for fast access

## Debugging

Enable console logging in the VSCode extension output panel:

1. Open VSCode
2. View → Output
3. Select "Gofer Language Server" from dropdown
4. Watch real-time logs

## Contributing

When modifying the server:

1. Update tool schemas in `server.ts` if changing parameters
2. Update `toolHandler.ts` for implementation changes
3. Add integration tests for new tools
4. Update this README with any new capabilities

## License

See LICENSE in root directory
