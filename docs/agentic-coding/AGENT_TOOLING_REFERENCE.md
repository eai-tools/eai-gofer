# Agent Tooling Reference

**Enterprise AI Pty Ltd - MCP Tools, APIs, and Integration Patterns**

*Last Updated: January 2026*

---

## Executive Summary

This document provides a comprehensive reference for AI agent tooling,
including MCP (Model Context Protocol) tools, progress APIs, and integration
patterns. Use this as a technical reference when implementing or using
agent-facing interfaces.

---

## 1. MCP Tools Overview

MCP (Model Context Protocol) provides a standard way to expose tools to AI
agents. Gofer exposes 6 core tools.

### Tool: gofer_get_specs

**Purpose**: Get all specifications and their current status.

```typescript
{
  name: 'gofer_get_specs',
  description: 'Get all specifications and tasks',

  inputSchema: {
    type: 'object',
    properties: {
      includeCompleted: {
        type: 'boolean',
        description: 'Include completed specs',
        default: false
      },
      specId: {
        type: 'string',
        description: 'Filter to specific spec ID'
      }
    }
  },

  outputSchema: {
    type: 'object',
    properties: {
      specs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'in_progress', 'completed'] },
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
                  dependencies: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### Tool: gofer_get_next_task

**Purpose**: Get the next available task based on dependency resolution.

```typescript
{
  name: 'gofer_get_next_task',
  description: 'Get next task based on dependencies',

  inputSchema: {
    type: 'object',
    properties: {
      specId: {
        type: 'string',
        description: 'Spec ID to get next task from',
        required: true
      }
    }
  },

  outputSchema: {
    type: 'object',
    properties: {
      task: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          description: { type: 'string' },
          phase: { type: 'string' },
          dependencies: { type: 'array', items: { type: 'string' } },
          userStory: { type: 'string' },
          parallel: { type: 'boolean' }
        }
      },
      context: {
        type: 'object',
        properties: {
          constitution: { type: 'string' },
          relevantFiles: { type: 'array', items: { type: 'string' } },
          patterns: { type: 'array', items: { type: 'string' } }
        }
      },
      allTasksComplete: { type: 'boolean' }
    }
  }
}
```

### Tool: gofer_execute_task

**Purpose**: Mark task in-progress and get full execution context.

```typescript
{
  name: 'gofer_execute_task',
  description: 'Mark task in-progress, get full context',

  inputSchema: {
    type: 'object',
    required: ['specId', 'taskId'],
    properties: {
      specId: { type: 'string' },
      taskId: { type: 'string' }
    }
  },

  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      task: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          description: { type: 'string' },
          acceptanceCriteria: { type: 'array', items: { type: 'string' } }
        }
      },
      context: {
        type: 'object',
        properties: {
          constitution: { type: 'string' },
          plan: { type: 'string' },
          relatedCode: { type: 'array', items: { type: 'string' } },
          patterns: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
}
```

### Tool: gofer_update_task_status

**Purpose**: Update task completion status.

```typescript
{
  name: 'gofer_update_task_status',
  description: 'Update task completion status',

  inputSchema: {
    type: 'object',
    required: ['specId', 'taskId', 'status'],
    properties: {
      specId: { type: 'string' },
      taskId: { type: 'string' },
      status: {
        type: 'string',
        enum: ['pending', 'in_progress', 'completed', 'blocked']
      },
      notes: { type: 'string' }
    }
  },

  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      nextTask: {
        type: 'object',
        description: 'Next available task if any'
      }
    }
  }
}
```

### Tool: gofer_validate_code

**Purpose**: Validate code against project constitution.

```typescript
{
  name: 'gofer_validate_code',
  description: 'Validate code against constitution',

  inputSchema: {
    type: 'object',
    required: ['files'],
    properties: {
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'File paths to validate'
      },
      rules: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific rules to check'
      }
    }
  },

  outputSchema: {
    type: 'object',
    properties: {
      valid: { type: 'boolean' },
      violations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            file: { type: 'string' },
            line: { type: 'integer' },
            rule: { type: 'string' },
            message: { type: 'string' },
            severity: { type: 'string', enum: ['error', 'warning'] }
          }
        }
      },
      suggestions: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
}
```

### Tool: gofer_run_tests

**Purpose**: Execute tests for acceptance criteria.

```typescript
{
  name: 'gofer_run_tests',
  description: 'Run tests for acceptance criteria',

  inputSchema: {
    type: 'object',
    required: ['taskId', 'testCommand'],
    properties: {
      taskId: {
        type: 'string',
        pattern: '^T\\d{3}$'
      },
      testCommand: {
        type: 'string',
        description: 'Test command to run'
      },
      testType: {
        type: 'string',
        enum: ['unit', 'integration', 'e2e']
      },
      timeout: {
        type: 'integer',
        minimum: 5000,
        maximum: 600000,
        default: 300000
      }
    }
  },

  outputSchema: {
    type: 'object',
    properties: {
      passed: { type: 'boolean' },
      summary: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          passed: { type: 'integer' },
          failed: { type: 'integer' },
          skipped: { type: 'integer' }
        }
      },
      failures: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            testName: { type: 'string' },
            errorMessage: { type: 'string' },
            stackTrace: { type: 'string' },
            suggestion: { type: 'string' }
          }
        }
      },
      coverage: {
        type: 'object',
        properties: {
          lines: { type: 'number' },
          functions: { type: 'number' },
          branches: { type: 'number' }
        }
      }
    }
  }
}
```

---

## 2. LSP Methods

The language server exposes these custom methods:

### eaiGofer/getSpecifications

```typescript
// Request
interface GetSpecificationsRequest {
  workspaceUri: string;
  includeArchived?: boolean;
}

// Response
interface GetSpecificationsResponse {
  specifications: Specification[];
  totalCount: number;
}
```

### eaiGofer/getConstitution

```typescript
// Request
interface GetConstitutionRequest {
  workspaceUri: string;
}

// Response
interface GetConstitutionResponse {
  constitution: string;  // Markdown content
  lastModified: string;  // ISO 8601
}
```

### eaiGofer/validateDocument

```typescript
// Request
interface ValidateDocumentRequest {
  documentUri: string;
  validationType: 'spec' | 'task' | 'constitution';
}

// Response
interface ValidateDocumentResponse {
  valid: boolean;
  diagnostics: Diagnostic[];
}
```

---

## 3. Progress Streaming API

### SSE Endpoint

```text
GET /api/progress/stream/:sessionId
```

**Headers**:

```text
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Format**:

```text
event: progress
id: 1705484400000
data: {"type":"task:progress","taskId":"T001","percent":45}

event: error
id: 1705484401000
data: {"type":"task:error","taskId":"T001","error":"Test failed"}

event: complete
id: 1705484402000
data: {"type":"task:complete","taskId":"T001","result":"success"}
```

### Progress Event Types

```typescript
type ProgressEventType =
  | 'session:start'
  | 'task:start'
  | 'task:progress'
  | 'task:complete'
  | 'task:error'
  | 'session:complete';

interface ProgressEvent {
  type: ProgressEventType;
  timestamp: string;
  sessionId: string;
  taskId?: string;
  payload: {
    percent?: number;
    message?: string;
    error?: string;
    result?: any;
  };
}
```

---

## 4. Error Response Format

### Standard Error Structure

```typescript
interface ToolError {
  code: string;
  message: string;
  details: {
    retryable: boolean;
    retryAfter?: number;      // Milliseconds
    contextProvided?: string[];
    suggestion?: string;
  };
}
```

### Error Codes

| Code                   | Retryable | Description                     |
| ---------------------- | --------- | ------------------------------- |
| `INVALID_INPUT`        | No        | Input validation failed         |
| `TASK_NOT_FOUND`       | No        | Task ID doesn't exist           |
| `SPEC_NOT_FOUND`       | No        | Spec ID doesn't exist           |
| `DEPENDENCY_UNMET`     | Yes       | Task dependencies not complete  |
| `TIMEOUT`              | Yes       | Operation timed out             |
| `RATE_LIMIT`           | Yes       | Too many requests               |
| `INTERNAL_ERROR`       | Yes       | Unexpected server error         |
| `CONSTITUTION_MISSING` | No        | No constitution file found      |

---

## 5. Configuration Files

### .vscode/mcp.json

Auto-generated configuration for Claude Code:

```json
{
  "servers": {
    "eai-gofer": {
      "command": "node",
      "args": ["${workspaceFolder}/language-server/out/server.js", "--mcp"],
      "rootPath": "${workspaceFolder}"
    }
  }
}
```

### .specify/memory/council-config.yaml

Council mode configuration:

```yaml
enabled: true
quorum: 2
timeout: 30000
peerReview: false
stages:
  gofer_research: true
  gofer_plan: true
  gofer_validate: true
providers:
  - providerId: anthropic
    enabled: true
  - providerId: google
    enabled: true
  - providerId: openai
    enabled: true
```

---

## 6. VSCode Commands

### Core Commands

| Command ID                       | Description                    |
| -------------------------------- | ------------------------------ |
| `gofer.initialize`              | Initialize `.specify/` structure |
| `gofer.showProgress`            | Open the progress panel          |
| `gofer.refreshSpecs`            | Reload all specifications        |
| `gofer.checkForUpdates`         | Check for extension updates      |
| `gofer.updateNow`               | Apply an available extension update |

### Claude Code Commands

| Command ID                       | Description                    |
| -------------------------------- | ------------------------------ |
| `gofer.startClaudeCode`         | Launch Claude Code terminal              |
| `gofer.pauseClaudeCode`         | Pause current execution (send ESC)       |
| `gofer.resumeClaudeCode`        | Resume Claude Code autonomous monitoring |
| `gofer.stopClaudeCode`          | Stop Claude Code session                 |

### Council Commands

| Command ID                       | Description                    |
| -------------------------------- | ------------------------------ |
| `gofer.showCouncilStatus`       | Show council provider status |

---

## 7. File Patterns

### Watched Paths

The extension watches these patterns:

```text
**/.specify/**/*           # All spec kit files
.specify/specs/**/spec.md  # Specification documents
.specify/memory/*.md       # Constitution and decisions
.specify/memory/*.yaml     # Config files
```

### Ignored Paths

```text
**/node_modules/**
**/.git/**
**/dist/**
**/out/**
```

---

## 8. Integration Patterns

### Starting Autonomous Execution

```typescript
// 1. Get next task
const task = await mcpClient.call('gofer_get_next_task', {
  specId: '001-feature'
});

// 2. Mark as in-progress
const context = await mcpClient.call('gofer_execute_task', {
  specId: '001-feature',
  taskId: task.id
});

// 3. Implement task (agent work)
// ...

// 4. Run tests
const testResult = await mcpClient.call('gofer_run_tests', {
  taskId: task.id,
  testCommand: 'npm test',
  testType: 'unit'
});

// 5. Validate against constitution
const validation = await mcpClient.call('gofer_validate_code', {
  files: ['src/newFeature.ts']
});

// 6. Update status
if (testResult.passed && validation.valid) {
  await mcpClient.call('gofer_update_task_status', {
    specId: '001-feature',
    taskId: task.id,
    status: 'completed'
  });
}
```

### Error Recovery Flow

```typescript
// On test failure
if (!testResult.passed) {
  // Attempt 1: Just the error
  await retryWithErrorOnly(testResult.failures);

  // Attempt 2: Error + file context
  await retryWithFileContext(testResult.failures, affectedFiles);

  // Attempt 3: Error + files + constitution
  await retryWithConstitution(testResult.failures, affectedFiles, constitution);

  // Escalate after 3 failures
  if (stillFailing) {
    await escalateToHuman(taskId, testResult);
  }
}
```

---

## 9. Performance Targets

| Operation              | Target Latency | Notes                    |
| ---------------------- | -------------- | ------------------------ |
| get_specs              | < 100ms        | Cached after first call  |
| get_next_task          | < 50ms         | Dependency resolution    |
| execute_task           | < 200ms        | Context assembly         |
| update_task_status     | < 100ms        | File write              |
| validate_code          | < 500ms        | Depends on file count    |
| run_tests              | Variable       | Depends on test suite    |
| Progress event         | < 50ms         | SSE streaming           |

---

## 10. Debugging

### Diagnostic Surfaces

- Command Palette: run `gofer.debugAIUsage` for AI-usage diagnostics.
- Output Channels: `Gofer`, `Gofer Language Server`, `Gofer Debug`, and
  `Gofer-ClaudeCode` are the primary extension debug streams.

### View Logs

- Output Channel: "Gofer Language Server"
- Developer Tools: Help → Toggle Developer Tools

### Common Issues

| Issue                  | Solution                              |
| ---------------------- | ------------------------------------- |
| MCP tools not loading  | Check .vscode/mcp.json exists         |
| Language server crash  | Check Node.js version (18+)           |
| Specs not refreshing   | Run `gofer.refreshSpecs` command      |
| Tests timing out       | Increase timeout in tool call         |

---

## References

- [AGENTIC_CODING_PRINCIPLES.md](AGENTIC_CODING_PRINCIPLES.md) - Core principles
- [AGENTIC_TESTING_PATTERNS.md](AGENTIC_TESTING_PATTERNS.md) - Test patterns
- Model Context Protocol: https://modelcontextprotocol.io/
- Language Server Protocol: https://microsoft.github.io/language-server-protocol/

---

**© 2026 Enterprise AI Pty Ltd. All rights reserved.**
