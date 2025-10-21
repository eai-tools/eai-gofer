# Tasks - Language Server

## Phase 1: Core Server Implementation (✅ Completed)

### T001 (Server) - LSP/MCP Server Setup
**Status**: ✅ Completed  
**Priority**: Critical  
**Dependencies**: none  
**Estimated Effort**: 8 hours  

**Description**: Implement dual-protocol server that handles both LSP (for Extension) and MCP (for Claude Code) in a single process.

**Acceptance Criteria**:
- Server starts and listens for LSP connections
- Implements LSP textDocument synchronization
- Implements LSP initialization handshake
- Registers MCP experimental capabilities
- Handles both LSP and MCP requests
- Proper error handling and logging

**Implementation**: `language-server/src/server.ts`

---

### T002 (SpecKit) - Spec Kit Loader
**Status**: ✅ Completed  
**Priority**: Critical  
**Dependencies**: T001  
**Estimated Effort**: 6 hours  

**Description**: Load and parse GitHub Spec Kit format specifications from filesystem.

**Acceptance Criteria**:
- Loads all specs from `.specify/specs/`
- Parses YAML frontmatter
- Extracts Markdown content
- Parses task lists with dependencies
- Returns structured Spec objects
- Handles file system errors

**Implementation**: `language-server/src/utils/specKitLoader.ts`

---

## Phase 2: MCP Tool Implementation (✅ Completed)

### T003 (GetSpecs) - MCP Tool: Get All Specs
**Status**: ✅ Completed  
**Priority**: Critical  
**Dependencies**: T001, T002  
**Estimated Effort**: 2 hours  

**Description**: Implement MCP tool that returns all specifications to Claude Code.

**Acceptance Criteria**:
- Returns all specs with metadata
- Includes task counts and status
- Returns structured JSON
- Handles empty spec directory
- Error handling for file system issues

**Implementation**: `language-server/src/mcp/toolHandler.ts` (getSpecs)

---

### T004 (NextTask) - MCP Tool: Get Next Task
**Status**: ✅ Completed  
**Priority**: Critical  
**Dependencies**: T001, T002  
**Estimated Effort**: 4 hours  

**Description**: Implement MCP tool that returns the next available task based on dependencies.

**Acceptance Criteria**:
- Finds next task with dependencies met
- Prioritizes in-progress tasks
- Returns null if no tasks available
- Includes spec context
- Checks all specs in order

**Implementation**: `language-server/src/mcp/toolHandler.ts` (getNextTask)

---

### T005 (Execute) - MCP Tool: Execute Task
**Status**: ✅ Completed  
**Priority**: Critical  
**Dependencies**: T001, T002  
**Estimated Effort**: 4 hours  

**Description**: Implement MCP tool that returns full context for a specific task to execute.

**Acceptance Criteria**:
- Validates specId and taskId
- Returns full task context
- Returns spec context
- Returns constitution if available
- Handles invalid IDs gracefully

**Implementation**: `language-server/src/mcp/toolHandler.ts` (executeTask)

---

### T006 (UpdateStatus) - MCP Tool: Update Task Status
**Status**: ✅ Completed  
**Priority**: Critical  
**Dependencies**: T001, T002  
**Estimated Effort**: 3 hours  

**Description**: Implement MCP tool that updates task status in spec file.

**Acceptance Criteria**:
- Updates task status in YAML/Markdown
- Validates new status
- Preserves file format
- Handles file write errors
- Returns success/failure

**Implementation**: `language-server/src/mcp/toolHandler.ts` (updateTaskStatus)

---

### T007 (ValidateCode) - MCP Tool: Validate Code
**Status**: ✅ Completed  
**Priority**: High  
**Dependencies**: T001  
**Estimated Effort**: 6 hours  

**Description**: Implement MCP tool that validates code against constitution using Claude API.

**Acceptance Criteria**:
- Loads constitution from memory
- Sends code + constitution to Claude
- Returns validation result
- Identifies specific violations
- Suggests fixes

**Implementation**: `language-server/src/mcp/toolHandler.ts` (validateCode)

---

### T008 (RunTests) - MCP Tool: Run Tests
**Status**: ✅ Completed  
**Priority**: High  
**Dependencies**: T001  
**Estimated Effort**: 6 hours  

**Description**: Implement MCP tool that runs Playwright tests for a spec.

**Acceptance Criteria**:
- Executes Playwright tests
- Parses test results
- Returns pass/fail status
- Returns failed test names
- Handles test errors

**Implementation**: `language-server/src/mcp/toolHandler.ts` (runTests)

---

## Phase 3: LSP Custom Methods (✅ Completed)

### T009 (LSP-GetSpecs) - LSP Custom Method: Get Specs
**Status**: ✅ Completed  
**Priority**: High  
**Dependencies**: T001, T002  
**Estimated Effort**: 2 hours  

**Description**: Implement custom LSP method for Extension to get all specs.

**Acceptance Criteria**:
- Responds to `specKit/getSpecs` request
- Returns same data as MCP tool
- Handles errors gracefully

**Implementation**: `language-server/src/server.ts`

---

### T010 (LSP-Execute) - LSP Custom Method: Execute Task
**Status**: ✅ Completed  
**Priority**: High  
**Dependencies**: T001, T002  
**Estimated Effort**: 2 hours  

**Description**: Implement custom LSP method for Extension to execute tasks.

**Acceptance Criteria**:
- Responds to `specKit/executeTask` request
- Returns task context
- Handles errors gracefully

**Implementation**: `language-server/src/server.ts`

---

### T011 (LSP-Update) - LSP Custom Method: Update Status
**Status**: ✅ Completed  
**Priority**: High  
**Dependencies**: T001, T002  
**Estimated Effort**: 2 hours  

**Description**: Implement custom LSP method for Extension to update task status.

**Acceptance Criteria**:
- Responds to `specKit/updateTaskStatus` request
- Updates spec file
- Returns success/failure

**Implementation**: `language-server/src/server.ts`

---

## Phase 4: Quality & Security (📝 In Progress)

### T012 (Security) - Input Validation & Security
**Status**: 🔴 Not Started  
**Priority**: Critical  
**Dependencies**: T001, T002, T003, T004, T005, T006  
**Estimated Effort**: 6 hours  

**Description**: Add comprehensive input validation and security checks to prevent path traversal and injection attacks.

**Acceptance Criteria**:
- Validate all specId and taskId inputs
- Prevent path traversal attacks
- Sanitize file paths
- Validate status values
- Add input length limits
- Log security violations

**Files to Update**:
- `language-server/src/mcp/toolHandler.ts`
- `language-server/src/utils/specKitLoader.ts`

---

### T013 (Test) - Comprehensive Unit Tests
**Status**: 🔴 Not-Started  
**Priority**: Critical  
**Dependencies**: T001, T002, T003, T004, T005, T006, T007, T008  
**Estimated Effort**: 16 hours  

**Description**: Create comprehensive unit tests for all server functionality.

**Acceptance Criteria**:
- Test all MCP tool handlers
- Test SpecKitLoader with various inputs
- Test error handling
- Test LSP custom methods
- 80%+ code coverage
- Mock file system operations

**Test Files to Create**:
- `language-server/src/__tests__/server.test.ts`
- `language-server/src/__tests__/toolHandler.test.ts`
- `language-server/src/utils/__tests__/specKitLoader.test.ts`

---

### T014 (Error) - Error Handling & Logging
**Status**: 🔴 Not Started  
**Priority**: High  
**Dependencies**: T012, T13  
**Estimated Effort**: 6 hours  

**Description**: Add comprehensive error handling and logging throughout server.

**Acceptance Criteria**:
- Try/catch for all async operations
- Meaningful error messages
- Proper error types (LSP vs MCP)
- Log levels (debug, info, warn, error)
- Error telemetry
- Graceful degradation

**Files to Update**:
- All TypeScript files in `language-server/src/`

---

### T015 (Docs) - API Documentation
**Status**: 🔴 Not Started  
**Priority**: Medium  
**Dependencies**: T14  
**Estimated Effort**: 6 hours  

**Description**: Document all MCP tools, LSP methods, and server configuration.

**Acceptance Criteria**:
- Document all 6 MCP tools with examples
- Document LSP custom methods
- Document server configuration
- Document error codes
- Provide integration examples

**Files to Create**:
- `language-server/docs/MCP_TOOLS.md`
- `language-server/docs/LSP_METHODS.md`
- `language-server/docs/CONFIGURATION.md`
- `language-server/docs/ERROR_CODES.md`

---

## Phase 5: Performance & Optimization (📋 Planned)

### T016 (Cache) - Implement Spec Caching
**Status**: 🔴 Not Started  
**Priority**: Medium  
**Dependencies**: T001, T002  
**Estimated Effort**: 6 hours  

**Description**: Add caching layer to avoid re-parsing specs on every request.

**Acceptance Criteria**:
- Cache parsed specs in memory
- Invalidate cache on file changes
- File system watcher for specs directory
- Memory-efficient caching strategy
- Performance: <10ms for cached specs

**Implementation**: `language-server/src/utils/specCache.ts`

---

### T17 (Perf) - Performance Optimization
**Status**: 🔴 Not Started  
**Priority**: Medium  
**Dependencies**: T16  
**Estimated Effort**: 8 hours  

**Description**: Optimize server performance for large projects.

**Acceptance Criteria**:
- Server startup <1 second
- MCP tool responses <100ms
- Handle 100+ specs efficiently
- Async file operations
- Stream large responses

**Files to Optimize**:
- `language-server/src/server.ts`
- `language-server/src/mcp/toolHandler.ts`
- `language-server/src/utils/specKitLoader.ts`

---

## Summary

**Total Tasks**: 17  
**Completed**: 11 (65%)  
**In Progress**: 0  
**Not Started**: 6 (35%)  

**Critical Path**: T12 (Security) → T13 (Tests) → T14 (Error Handling)  

**Next Priority**: T12 (Security) - Critical for production readiness
