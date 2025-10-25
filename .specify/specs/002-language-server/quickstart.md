# Language Server Quick Start Guide

## Overview

The SpecGofer Language Server implements dual protocols (LSP + MCP) to bridge VSCode extensions with AI coding agents. This guide covers setup, testing, and integration scenarios.

## Prerequisites

- Node.js 18+ installed
- TypeScript 5.7.2+ 
- VSCode 1.102+ (for MCP support)
- Anthropic API key (for constitution validation)

## Installation & Setup

### 1. Install Dependencies

```bash
cd language-server
npm install
```

### 2. Build the Server

```bash
npm run build
# Creates dist/ folder with compiled JavaScript
```

### 3. Environment Configuration

Create `.env` file in repository root:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
WORKSPACE_DIR=/path/to/your/workspace
SPEC_DIR=.specify
```

## Development Workflow

### 1. Start Language Server (Standalone)

For testing and development:

```bash
cd language-server
node dist/server.js --stdio
```

The server will:
- Initialize LSP capabilities  
- Load MCP tools
- Parse specs from `.specify/specs/`
- Wait for LSP/MCP client connections

### 2. VSCode Extension Integration

The extension automatically spawns the Language Server:

```typescript
// In extension.ts - automatic startup
const serverModule = path.join(__dirname, 'language-server', 'dist', 'server.js');
const client = new LanguageClient('specgofer', 'SpecGofer Language Server', {
  run: { module: serverModule, transport: TransportKind.stdio },
  debug: { module: serverModule, transport: TransportKind.stdio }
});
```

### 3. MCP Tool Testing

Test tools via Claude Code or direct MCP calls:

```bash
# Example: Get all specs
echo '{"method":"tools/call","params":{"name":"specgofer_get_specs","arguments":{}}}' | node dist/server.js --stdio

# Example: Get next task  
echo '{"method":"tools/call","params":{"name":"specgofer_get_next_task","arguments":{}}}' | node dist/server.js --stdio
```

## Integration Scenarios

### Scenario 1: AI Agent Task Execution

**Workflow**: Claude Code executes a complete task

1. **Discovery**: Agent calls `specgofer_get_specs` to see available work
2. **Task Selection**: Agent calls `specgofer_get_next_task` to get next actionable task  
3. **Task Start**: Agent calls `specgofer_execute_task` to get full context
4. **Implementation**: Agent writes code and tests following TDD
5. **Validation**: Agent calls `specgofer_validate_code` to check constitution compliance
6. **Testing**: Agent calls `specgofer_run_tests` to verify implementation
7. **Completion**: Agent calls `specgofer_update_task_status` to mark completed

### Scenario 2: VSCode Extension Updates

**Workflow**: Extension displays real-time spec progress

1. Extension starts Language Server via LSP client
2. Extension calls custom LSP methods to get spec data:
   ```typescript
   const specs = await client.sendRequest('specgofer/getSpecs');
   ```
3. Extension renders tree view with tasks and progress
4. User selects task → Extension highlights related files
5. File changes trigger spec re-parsing and UI updates

### Scenario 3: Multi-Agent Coordination

**Workflow**: Multiple AI agents work on different specs

1. **Engineer Agent**: Implements core functionality
   - Gets tasks via `specgofer_get_next_task`
   - Validates code via `specgofer_validate_code`
   - Updates status via `specgofer_update_task_status`

2. **Test Agent**: Runs comprehensive tests
   - Monitors for "testing" status tasks
   - Executes tests via `specgofer_run_tests`
   - Reports results and updates task status

3. **Language Server**: Coordinates between agents
   - Ensures task dependencies are respected
   - Prevents concurrent modification of same task
   - Maintains consistent file system state

## Testing Guide

### Unit Tests

```bash
# Test spec loading and parsing
npm test tests/unit/specLoader.test.ts

# Test MCP tool implementations  
npm test tests/unit/mcpTools.test.ts

# Test constitution validation
npm test tests/unit/validation.test.ts
```

### Integration Tests

```bash
# Test full MCP tool workflow
npm test tests/integration/mcp-workflow.test.ts

# Test LSP + MCP dual protocol
npm test tests/integration/dual-protocol.test.ts
```

### E2E Tests

```bash
# Test with real VSCode extension
npm run test:e2e

# Test with Claude Code integration
npm run test:e2e:mcp
```

## Troubleshooting

### Common Issues

**1. Language Server Won't Start**

```bash
# Check Node.js version
node --version  # Should be 18+

# Check TypeScript compilation
npm run build

# Check for syntax errors
npm run lint
```

**2. MCP Tools Not Found**

```bash
# Verify .vscode/mcp.json exists and contains server config
cat .vscode/mcp.json

# Check Claude Code can connect
# Open Claude Code → Settings → MCP → Verify server listed
```

**3. Spec Loading Failures**

```bash
# Check .specify directory structure
find .specify/specs -name "*.md" | head -5

# Validate YAML frontmatter
npm run validate:specs

# Check file permissions
ls -la .specify/specs/
```

### Debug Mode

Enable detailed logging:

```bash
VSCODE_LOGS_DIR=/tmp/vscode-logs code --verbose
# Language Server logs appear in SpecGofer Language Server channel
```

### Performance Monitoring

Track tool response times:

```bash
# Enable performance metrics
DEBUG=specgofer:* node dist/server.js --stdio

# Monitor memory usage
node --inspect dist/server.js --stdio
# Open chrome://inspect to connect debugger
```

## Configuration Options

### Language Server Settings

Configure via `.vscode/settings.json`:

```json
{
  "specgofer.languageServer.maxSpecs": 1000,
  "specgofer.languageServer.cacheTimeout": 300000,
  "specgofer.languageServer.enableValidation": true,
  "specgofer.languageServer.logLevel": "info"
}
```

### MCP Tool Settings

Configure via environment variables:

```env
# Performance tuning
SPECGOFER_MAX_CONCURRENT_TOOLS=10
SPECGOFER_TOOL_TIMEOUT_MS=5000
SPECGOFER_CACHE_SPECS=true

# Security settings
SPECGOFER_ALLOW_FILE_WRITES=true
SPECGOFER_RESTRICT_PATHS=true
SPECGOFER_VALIDATE_INPUTS=true
```

## API Examples

### Get All Specs with Tasks

```typescript
const response = await callMCPTool('specgofer_get_specs', {});
console.log(`Found ${response.specs.length} specifications`);

for (const spec of response.specs) {
  console.log(`${spec.id}: ${spec.completedCount}/${spec.taskCount} tasks completed`);
}
```

### Execute Next Available Task

```typescript
const nextTask = await callMCPTool('specgofer_get_next_task', {});
if (nextTask.task) {
  const context = await callMCPTool('specgofer_execute_task', {
    specId: nextTask.task.specId,
    taskId: nextTask.task.taskId
  });
  
  console.log(`Starting task: ${context.task.description}`);
  console.log(`Acceptance criteria: ${context.task.acceptanceCriteria.join(', ')}`);
}
```

### Validate and Test Code

```typescript
// Validate implementation against constitution
const validation = await callMCPTool('specgofer_validate_code', {
  code: implementationCode,
  filePath: 'src/server.ts',
  language: 'typescript'
});

if (validation.isValid) {
  // Run tests to verify functionality
  const testResults = await callMCPTool('specgofer_run_tests', {
    specId: '002-language-server',
    testType: 'unit'
  });
  
  if (testResults.success) {
    // Mark task as completed
    await callMCPTool('specgofer_update_task_status', {
      specId: '002-language-server',
      taskId: 'T001',
      status: 'completed'
    });
  }
}
```

## Next Steps

1. **Extension Development**: Integrate Language Server with VSCode extension UI
2. **Agent Development**: Build AI agents that consume MCP tools  
3. **Testing**: Add comprehensive E2E tests for all integration scenarios
4. **Performance**: Optimize spec loading and tool response times
5. **Monitoring**: Add observability for production deployments

For detailed API documentation, see [contracts/mcp-tools-api.md](./contracts/mcp-tools-api.md).