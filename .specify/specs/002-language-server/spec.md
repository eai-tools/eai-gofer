---
id: "002-language-server"
title: "Language Server - LSP + MCP Dual Protocol"
status: "in_progress"
created: "2025-10-21"
updated: "2025-10-21"
priority: "critical"
assignee: "engineer-agent"
---

# Language Server - LSP + MCP Dual Protocol

## Overview

The SpecGofer Language Server is a Node.js process that implements both Language Server Protocol (LSP) for extension communication and Model Context Protocol (MCP) for AI agent tool integration. It serves as the bridge between the VSCode extension and Claude Code/GitHub Copilot.

## Problem Statement

AI coding agents need:
- Structured access to specifications
- Ability to query next available tasks
- Task execution coordination
- Status updates
- Constitution validation
- Test execution triggers

The VSCode extension needs:
- Real-time spec data
- Task status updates
- Completion notifications

## Solution

A single server process that:
1. Implements LSP for extension ↔ server communication
2. Exposes MCP tools for AI agents
3. Loads and parses GitHub Spec Kit specifications
4. Manages task state and dependencies
5. Provides constitution-based validation
6. Coordinates test execution

## Acceptance Criteria

### AC1: LSP Server Initialization

- **Given** the extension starts the Language Server
- **When** the initialization request is received
- **Then** server responds with LSP capabilities
- **And** experimental MCP capabilities are advertised
- **And** server loads specifications from workspace

### AC2: MCP Tool Registration

- **Given** the Language Server starts
- **When** capabilities are sent to client
- **Then** 6 MCP tools are registered:
  - `specgofer_get_specs`
  - `specgofer_get_next_task`
  - `specgofer_execute_task`
  - `specgofer_update_task_status`
  - `specgofer_validate_code`
  - `specgofer_run_tests`

### AC3: Spec Loading

- **Given** workspace contains `.specify/specs/`
- **When** server initializes
- **Then** all spec directories are discovered
- **And** `spec.md` files are parsed
- **And** YAML frontmatter is extracted
- **And** Markdown tasks are parsed with dependencies

### AC4: Get Specs Tool

- **Given** AI agent calls `specgofer_get_specs`
- **When** tool handler processes the request
- **Then** return all specs with:
  - ID, title, status
  - Task count and completion count
  - Each task with ID, description, status, dependencies
- **And** response is valid JSON

### AC5: Get Next Task Tool

- **Given** AI agent calls `specgofer_get_next_task`
- **When** tool handler processes the request
- **Then** find first `in_progress` task OR
- **Then** find first `pending` task with all dependencies `completed`
- **And** return spec context and task details
- **Or** return null if no tasks available

### AC6: Execute Task Tool

- **Given** AI agent calls `specgofer_execute_task` with specId and taskId
- **When** task exists and dependencies are met
- **Then** return task context including:
  - Spec description and acceptance criteria
  - Task description and requirements
  - Constitution principles to validate against
  - Related file paths
- **And** mark task as `in_progress`

### AC7: Update Task Status Tool

- **Given** AI agent calls `specgofer_update_task_status`
- **When** specId, taskId, and new status are provided
- **Then** update task status in spec file
- **And** preserve YAML frontmatter formatting
- **And** update task checkbox in Markdown
- **And** return success confirmation

### AC8: Validate Code Tool

- **Given** AI agent calls `specgofer_validate_code` with code
- **When** constitution exists
- **Then** check code against constitution principles:
  - TypeScript strict mode compliance
  - No `any` types
  - File size < 300 lines
  - Proper documentation
  - Test coverage requirements
- **And** return validation result with issues and suggestions

### AC9: Run Tests Tool

- **Given** AI agent calls `specgofer_run_tests` with specId
- **When** spec has acceptance criteria
- **Then** trigger Playwright test execution
- **And** return test results with pass/fail status
- **And** include failed test names if any

### AC10: Input Validation

- **Given** any MCP tool receives parameters
- **When** parameters are validated
- **Then** reject path traversal attempts (../, etc)
- **And** validate ID formats (alphanumeric, hyphens, underscores)
- **And** enforce length limits
- **And** return clear error messages for invalid input

## Technical Design

### Server Structure

```
language-server/
├── src/
│   ├── server.ts              # Main LSP + MCP server
│   ├── mcp/
│   │   └── toolHandler.ts     # MCP tool implementations
│   └── utils/
│       └── specKitLoader.ts   # Spec loading and parsing
├── dist/                       # Compiled JavaScript
├── package.json
└── tsconfig.json
```

### Key Components

**1. LSP Server (server.ts)**
- Handles LSP lifecycle (initialize, initialized, shutdown)
- Registers MCP tools in capabilities
- Implements custom LSP methods for extension
- Routes MCP tool calls to handler

**2. MCP Tool Handler (toolHandler.ts)**
- Implements all 6 MCP tools
- Validates inputs
- Coordinates with SpecKitLoader
- Returns structured responses

**3. Spec Kit Loader (specKitLoader.ts)**
- Discovers spec directories
- Parses YAML frontmatter
- Parses Markdown task lists
- Extracts dependencies from task text
- Updates task status in files

### Communication Flow

```
Claude Code → VSCode MCP Client → Language Server → Tool Handler → Spec Files
              ↑                                                        ↓
Extension ← LSP Methods ← Language Server ← Spec Updates ← File System
```

## Tasks

- [x] #T001 Create LSP server with initialization (deps: none)
- [x] #T002 Implement MCP capability advertisement (deps: T001)
- [x] #T003 Build SpecKitLoader for parsing specs (deps: T001)
- [x] #T004 Create MCPToolHandler class (deps: T002, T003)
- [x] #T005 Implement specgofer_get_specs tool (deps: T004)
- [x] #T006 Implement specgofer_get_next_task tool (deps: T004)
- [x] #T007 Implement specgofer_execute_task tool (deps: T004)
- [x] #T008 Implement specgofer_update_task_status tool (deps: T004)
- [x] #T009 Implement specgofer_validate_code tool (deps: T004)
- [x] #T010 Implement specgofer_run_tests tool (deps: T004)
- [x] #T011 Add input validation and security checks (deps: T005,T006,T007,T008)
- [ ] #T012 Add comprehensive error handling (deps: T011)
- [ ] #T013 Create integration tests for all tools (deps: T012)
- [ ] #T014 Add logging and debugging support (deps: T012)
- [ ] #T015 Document MCP tool schemas (deps: T014)

## Dependencies

### Internal
- Extension must spawn server process
- `.specify/` folder must exist
- Spec Kit format must be valid

### External
- Node.js 18+
- vscode-languageserver package
- Anthropic SDK (for validation)

## Test Strategy

### Unit Tests
- SpecKitLoader parsing various formats
- Tool handler input validation
- Dependency resolution logic
- Status update file operations

### Integration Tests
- Full tool invocation flow
- Multiple concurrent tool calls
- Error scenarios (missing files, invalid IDs)
- Status persistence across server restarts

### E2E Tests
1. Start Language Server manually
2. Use LSP client to call tools
3. Verify responses match schemas
4. Check file system updates
5. Test with Claude Code integration

## Performance Considerations

- Server should start in <1s
- Spec loading should handle 100+ specs in <500ms
- Tool calls should respond in <100ms
- File updates should be atomic
- Cache parsed specs in memory

## Security Considerations

- Validate all file paths to prevent traversal
- Sanitize task IDs and spec IDs
- Limit response sizes to prevent DoS
- Don't expose system paths in errors
- Validate tool parameters strictly

## Documentation Needs

- MCP tool schemas
- LSP custom method documentation
- Setup and debugging guide
- Tool invocation examples
- Error code reference

## Success Metrics

- 100% tool call success rate for valid inputs
- <100ms average tool response time
- Zero security vulnerabilities
- Support for 1000+ specs per workspace

## Future Enhancements

- Caching layer for frequently accessed specs
- WebSocket support for real-time updates
- Spec validation on file save
- Task dependency graph visualization
- Multi-workspace support
