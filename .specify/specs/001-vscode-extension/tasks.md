# Tasks - VSCode Extension

## Phase 1: Core Infrastructure (✅ Completed)

### T001 (Base) - Extension Entry Point & Activation
**Status**: ✅ Completed  
**Priority**: Critical  
**Dependencies**: none  
**Assigned**: engineer-agent  
**Estimated Effort**: 4 hours  

**Description**: Implement the main extension entry point with proper activation logic that detects `.specify/` folders and initializes all components.

**Acceptance Criteria**:
- Extension activates when workspace opened
- Detects `.specify/` folder presence
- Registers all commands
- Initializes providers (Progress, Constitution)
- Handles workspace changes

**Implementation**: `extension/src/extension.ts`

---

### T002 (LServer) - LSP Client Implementation
**Status**: ✅ Completed  
**Priority**: Critical  
**Dependencies**: T001  
**Assigned**: engineer-agent  
**Estimated Effort**: 6 hours  

**Description**: Build the LSP client that launches and manages the Language Server process.

**Acceptance Criteria**:
- Spawns Language Server as child process
- Communicates via stdio
- Handles server errors and restarts
- Implements custom LSP methods
- Shuts down cleanly on deactivation

**Implementation**: `extension/src/lspClient.ts`

---

### T005 (Parser) - Spec Kit YAML Parser
**Status**: ✅ Completed  
**Priority**: Critical  
**Dependencies**: T001  
**Estimated Effort**: 4 hours  

**Description**: Implement parser for GitHub Spec Kit format (YAML frontmatter + Markdown content).

**Acceptance Criteria**:
- Parses YAML frontmatter correctly
- Extracts Markdown content
- Parses task lists with dependencies
- Handles malformed files gracefully
- Returns structured data

**Implementation**: `extension/src/specKitParser.ts`

---

### T008 (Init) - Repository Initialization
**Status**: ✅ Completed  
**Priority**: High  
**Dependencies**: T001  
**Estimated Effort**: 3 hours  

**Description**: Implement command to initialize `.specify/` structure in new repositories.

**Acceptance Criteria**:
- Creates all required directories
- Generates constitution template
- Creates spec templates
- Adds README files
- Handles existing structure gracefully

**Implementation**: `extension/src/extension.ts` (command handler)

---

## Phase 2: UI Components (✅ Completed)

### T003 (TreeView) - Progress Tree View
**Status**: ✅ Completed  
**Priority**: High  
**Dependencies**: T001, T005  
**Estimated Effort**: 6 hours  

**Description**: Build tree view provider that displays specs and tasks with status indicators.

**Acceptance Criteria**:
- Displays all specs in tree structure
- Shows tasks nested under specs
- Status icons (✅ complete, 🔄 in-progress, ⏸️ pending)
- Refresh on file changes
- Click to open spec file

**Implementation**: `extension/src/progressProvider.ts`

---

### T004 (Constitution) - Constitution Tree View
**Status**: ✅ Completed  
**Priority**: Medium  
**Dependencies**: T001, T005  
**Estimated Effort**: 4 hours  

**Description**: Build tree view for displaying constitution articles and sections.

**Acceptance Criteria**:
- Displays all articles
- Shows sections under articles
- Click to open constitution
- Auto-refresh on file changes
- Shows article summaries

**Implementation**: `extension/src/constitutionProvider.ts`

---

### T007 (MCP) - MCP Configuration Generator
**Status**: ✅ Completed  
**Priority**: Critical  
**Dependencies**: T002  
**Estimated Effort**: 3 hours  

**Description**: Auto-generate `.vscode/mcp.json` for Claude Code integration.

**Acceptance Criteria**:
- Creates MCP config file
- Points to Language Server
- Configures all MCP tools
- Updates on Language Server changes
- Validates configuration

**Implementation**: `extension/src/mcpConfig.ts`

---

## Phase 3: Advanced Features (✅ Completed)

### T006 (Migrate) - Spec Kit Migration Tool
**Status**: ✅ Completed  
**Priority**: Medium  
**Dependencies**: T005  
**Estimated Effort**: 8 hours  

**Description**: Convert legacy JSON specs to GitHub Spec Kit format.

**Acceptance Criteria**:
- Detects legacy JSON format
- Converts to Markdown + YAML
- Preserves all data (tasks, deps, status)
- Backs up original files
- Handles errors gracefully

**Implementation**: `extension/src/specKitMigrator.ts`

---

### T009 (Branch) - Branch-Specific Spec Manager
**Status**: ✅ Completed  
**Priority**: Medium  
**Dependencies**: T005  
**Estimated Effort**: 5 hours  

**Description**: Manage specs that differ across Git branches.

**Acceptance Criteria**:
- Detects Git branch changes
- Reloads specs on branch switch
- Updates tree views
- Handles branch-specific specs
- Maintains context per branch

**Implementation**: `extension/src/branchSpecManager.ts`

---

### T010 (Update) - Auto-Update System
**Status**: ✅ Completed  
**Priority**: Medium  
**Dependencies**: T001  
**Estimated Effort**: 6 hours  

**Description**: Automatically check for and install extension updates from GitHub releases.

**Acceptance Criteria**:
- Checks for updates on startup
- Periodic checks (24 hours)
- Downloads new VSIX files
- Notifies user of updates
- Handles update errors

**Implementation**: `extension/src/autoUpdater.ts`

---

## Phase 4: Quality & Documentation (📝 In Progress)

### T011 (Test) - Comprehensive Integration Tests
**Status**: 🔴 Not Started  
**Priority**: Critical  
**Dependencies**: T001, T002, T003, T004  
**Estimated Effort**: 16 hours  

**Description**: Create comprehensive test suite for all extension functionality.

**Acceptance Criteria**:
- Unit tests for all parsers and utilities
- Integration tests for LSP communication
- Integration tests for tree view providers
- Integration tests for file operations
- Mock all external dependencies
- 80%+ code coverage

**Test Files Needed**:
- `extension/src/__tests__/specKitParser.test.ts`
- `extension/src/__tests__/lspClient.test.ts`
- `extension/src/__tests__/progressProvider.test.ts`
- `extension/src/__tests__/specKitMigrator.test.ts`

---

### T012 (Error) - Error Handling & Logging
**Status**: 🔴 Not Started  
**Priority**: High  
**Dependencies**: T011  
**Estimated Effort**: 8 hours  

**Description**: Add comprehensive error handling and logging throughout extension.

**Acceptance Criteria**:
- Try/catch blocks for all async operations
- Meaningful error messages
- User-friendly error notifications
- Logging to Output channel
- Error telemetry (opt-in)
- Graceful degradation

**Files to Update**:
- All TypeScript files in `extension/src/`

---

### T013 (Docs) - Documentation & User Guide
**Status**: 🔴 Not-Be **Priority**: Medium  
**Dependencies**: T012  
**Estimated Effort**: 8 hours  

**Description**: Create comprehensive documentation for extension users and contributors.

**Acceptance Criteria**:
- README with installation instructions
- Command reference guide
- Configuration options documentation
- Troubleshooting guide
- Migration guide from legacy formats
- Contributing guide
- API documentation for developers

**Files to Create**:
- `extension/docs/INSTALLATION.md`
- `extension/docs/COMMANDS.md`
- `extension/docs/CONFIGURATION.md`
- `extension/docs/TROUBLESHOOTING.md`
- `extension/docs/MIGRATION.md`
- `extension/docs/CONTRIBUTING.md`

---

## Summary

**Total Tasks**: 13  
**Completed**: 10 (77%)  
**In Progress**: 0  
**Not Started**: 3 (23%)  

**Next Priority**: T011 (Test) - Critical for production readiness
