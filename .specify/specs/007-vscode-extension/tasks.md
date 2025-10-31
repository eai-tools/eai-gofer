---
description:
  'Task list for VSCode Extension - Core Infrastructure implementation'
generated: '2025-10-22'
feature: '001-vscode-extension'
---

# Tasks: VSCode Extension - Core Infrastructure

**Input**: Design documents from `.specify/specs/001-vscode-extension/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included as this is a VSCode extension requiring
comprehensive testing for activation, providers, and integrations.

**Organization**: Tasks are grouped by acceptance criteria (user stories) to
enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which acceptance criteria this task belongs to (e.g., AC1, AC2,
  AC3...)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md, this is a VSCode Extension with:

- `extension/src/` - Extension source code
- `extension/language-server/src/` - Bundled Language Server
- `extension/__tests__/` - Extension tests

---

## Phase 1: Setup (Project Infrastructure)

**Purpose**: Extension project initialization and build system

- [x] T001 Create extension project structure in extension/ per plan.md
- [x] T002 [P] Initialize package.json with VSCode extension manifest and
      dependencies
- [x] T003 [P] Configure TypeScript build system with tsconfig.json
- [x] T004 [P] Configure Webpack bundling in webpack.config.js
- [x] T005 [P] Setup Vitest testing framework in extension/**tests**/
- [x] T006 [P] Setup VSCode Extension Test Runner (@vscode/test-electron)
- [x] T007 [P] Configure ESLint and formatting tools

---

## Phase 2: Foundational (Core Extension Framework)

**Purpose**: Core infrastructure that MUST be complete before ANY acceptance
criteria can be implemented

**⚠️ CRITICAL**: No AC work can begin until this phase is complete

- [x] T008 Create main extension entry point in extension/src/extension.ts
- [x] T009 [P] Implement base types and interfaces from data-model.md in
      extension/src/specKitParser.ts
- [x] T010 [P] Create extension configuration and constants in
      extension/src/config.ts
- [x] T011 [P] Setup error handling and logging utilities in
      extension/src/utils/logger.ts
- [x] T012 [P] Create file system utilities for .specify/ operations in
      extension/src/utils/fileUtils.ts
- [x] T013 [P] Bundle Language Server code in extension/language-server/

**Checkpoint**: Extension foundation ready - acceptance criteria implementation
can now begin

---

## Phase 3: Features (T014-T024)

- [x] #T014 **Command Registration**: Register all required commands in
      package.json and extension.ts (deps: T013)
- [x] #T015 **Workspace Detection**: Implement detection of .specify folders on
      activation (deps: T014)
- [x] #T016 **Configuration Export**: Create and export proper VS Code
      configuration settings (deps: T015)
- [x] #T017 **LSP Client Setup**: Initialize and manage Language Server Protocol
      client (deps: T013, T016)
- [x] #T018 **Progress Provider**: Implement tree data provider for
      specification progress (deps: T017)
- [x] #T019 **Constitution Provider**: Implement tree data provider for
      constitution/principles (deps: T018)
- [x] #T020 **Auto-Update System**: Implement automatic extension update
      checking and installation (deps: T019)
- [x] #T021 **Branch Management**: Implement git branch switching and
      spec-per-branch workflow (deps: T020)
- [x] #T022 **Status Bar Integration**: Add status bar items for quick access
      and status display (deps: T018)
- [x] #T023 **File Monitoring**: Implement file system watching for .specify
      changes (deps: T022)
- [x] #T024 **MCP Configuration**: Auto-create .vscode/mcp.json for Claude Code
      integration (deps: T017)

---

## Phase 4: AC2 - Progress Panel Display (Priority: Critical)

**Goal**: Tree view displays specifications and tasks with status indicators

**Independent Test**: Opening workspace with specs shows tree view with correct
icons and nesting

### Tests for AC2

- [x] T021 [P] [AC2] Unit test for progress provider in
      extension/src/test/suite/progressProvider.test.ts
- [x] T022 [P] [AC2] Test tree view data transformation in
      extension/src/test/suite/progressProvider.test.ts

### Implementation for AC2

- [x] T023 [P] [AC2] Create ProgressProvider class in
      extension/src/progressProvider.ts
- [x] T024 [P] [AC2] Implement tree view item creation with icons and tooltips
- [x] T025 [P] [AC2] Create Spec Kit parser in extension/src/specKitParser.ts
      from data-model.md
- [x] T026 [AC2] Implement spec and task status mapping to VSCode tree item
      states
- [x] T027 [AC2] Add tree view refresh mechanism with file watching
- [x] T028 [AC2] Integrate progress provider with extension activation

**Checkpoint**: Progress panel shows specs and tasks with correct status

---

## Phase 5: AC3 - Constitution Panel (Priority: High)

**Goal**: Tree view displays constitution articles and allows navigation

**Independent Test**: Constitution panel shows articles and opens
constitution.md on click

### Tests for AC3

- [x] T029 [P] [AC3] Unit test for constitution provider in
      extension/src/test/suite/constitutionProvider.test.ts
- [x] T030 [P] [AC3] Test constitution file parsing in
      extension/src/test/suite/constitutionProvider.test.ts

### Implementation for AC3

- [x] T031 [P] [AC3] Create ConstitutionProvider class in
      extension/src/constitutionProvider.ts
- [x] T032 [P] [AC3] Implement constitution markdown parsing for article
      extraction
- [x] T033 [AC3] Add click handler to open constitution file in editor
- [x] T034 [AC3] Integrate constitution provider with extension activation
- [x] T035 [AC3] Add constitution file watching for auto-refresh

**Checkpoint**: Constitution panel functional with article navigation

---

## Phase 6: AC5 - Language Server Launch (Priority: Critical)

**Goal**: Language Server process starts and LSP client connects successfully

**Independent Test**: Language Server process running and MCP tools available to
Claude Code

### Tests for AC5

- [x] T036 [P] [AC5] Unit test for LSP client in
      extension/src/test/suite/lspClient.test.ts
- [x] T037 [P] [AC5] Integration test for Language Server communication in
      extension/src/test/suite/lspClient.test.ts

### Implementation for AC5

- [x] T038 [P] [AC5] Create LSPClient class in extension/src/lspClient.ts
- [x] T039 [P] [AC5] Implement Language Server process spawning with stdio
      communication
- [x] T040 [AC5] Add LSP client connection handling and error recovery
- [x] T041 [P] [AC5] Create MCP configuration generator in
      extension/src/mcpConfig.ts
- [x] T042 [AC5] Auto-generate .vscode/mcp.json for Claude Code integration
- [x] T043 [AC5] Integrate LSP client with extension activation

**Checkpoint**: Language Server running and accessible to Claude Code

---

## Phase 7: AC4 - Repository Initialization with Spec Kit Templates (Priority: High)

**Goal**: Initialize repository command creates .specify/ structure and
downloads templates

**Independent Test**: Command creates folder structure and downloads latest
templates from GitHub

### Tests for AC4

- [ ] T044 [P] [AC4] Unit test for repository initialization in
      extension/**tests**/repoInit.test.ts
- [ ] T045 [P] [AC4] Unit test for template downloader in
      extension/**tests**/templateDownloader.test.ts
- [ ] T046 [P] [AC4] Mock test for GitHub API integration in
      extension/**tests**/githubApi.test.ts

### Implementation for AC4

- [x] T047 [P] [AC4] Create repository initialization command in
      extension/src/commands/initRepository.ts
- [x] T048 [P] [AC4] Implement template downloader in
      extension/src/templateDownloader.ts
- [x] T049 [P] [AC4] Create GitHub API client for release fetching in
      extension/src/utils/githubApi.ts
- [x] T050 [AC4] Implement ZIP file extraction using JSZip in
      extension/src/utils/zipExtractor.ts
- [x] T051 [AC4] Add progress notification for template download
- [x] T052 [AC4] Implement fallback to bundled templates on network failure
- [x] T053 [AC4] Register initialization command with extension

**Checkpoint**: Repository initialization works with template downloading

---

## Phase 8: AC6 - Spec Kit Migration (Priority: Medium)

**Goal**: Convert legacy JSON specs to GitHub Spec Kit format

**Independent Test**: Migration command converts JSON to Markdown with preserved
data

### Tests for AC6

- [x] T054 [P] [AC6] Unit test for migration logic in
      extension/src/test/suite/specKitMigrator.test.ts
- [x] T055 [P] [AC6] Test legacy JSON parsing in
      extension/src/test/suite/specKitMigrator.test.ts

### Implementation for AC6

- [x] T056 [P] [AC6] Create Spec Kit migrator in
      extension/src/specKitMigrator.ts
- [x] T057 [P] [AC6] Implement legacy JSON format detection and parsing
- [x] T058 [AC6] Create JSON to Markdown conversion with YAML frontmatter
- [x] T059 [AC6] Implement backup creation to .specify/\_backup/
- [x] T060 [AC6] Add migration command and register with extension
- [x] T061 [AC6] Add migration progress reporting and error handling

**Checkpoint**: Legacy specs can be migrated to Spec Kit format

---

## Phase 9: AC7 - Extension and Template Auto-Updates (Priority: Medium)

**Goal**: Check for updates and notify users of newer versions

**Independent Test**: Extension checks GitHub releases and shows update
notifications

### Tests for AC7

- [ ] T062 [P] [AC7] Unit test for auto-updater in
      extension/**tests**/autoUpdater.test.ts
- [ ] T063 [P] [AC7] Test update checking logic in
      extension/**tests**/updateChecker.test.ts

### Implementation for AC7

- [x] T064 [P] [AC7] Create auto-updater in extension/src/autoUpdater.ts
- [x] T065 [P] [AC7] Implement GitHub release version checking
- [x] T066 [AC7] Add update notification system with user actions
- [x] T067 [AC7] Implement template update command in
      extension/src/commands/updateTemplates.ts
- [x] T068 [AC7] Set up automated update checks in extension/src/autoUpdater.ts
- [x] T069 [AC7] Register update commands with extension

**Checkpoint**: Auto-update system functional for extension and templates

---

## Phase 10: AC8 - Branch-Specific Specs (Priority: Low)

**Goal**: Extension reloads specs when git branch changes

**Independent Test**: Switching branches updates progress panel to show current
branch specs

### Tests for AC8

- [ ] T070 [P] [AC8] Unit test for branch manager in
      extension/**tests**/branchManager.test.ts
- [ ] T071 [P] [AC8] Test git branch detection in
      extension/**tests**/gitIntegration.test.ts

### Implementation for AC8

- [x] T072 [P] [AC8] Create branch spec manager in
      extension/src/branchSpecManager.ts
- [x] T073 [P] [AC8] Implement git branch change detection using file watching
- [x] T074 [AC8] Add branch-specific spec loading logic
- [x] T075 [AC8] Integrate branch manager with progress provider refresh
- [x] T076 [AC8] Add error handling for git operations

**Checkpoint**: Extension responds to branch changes correctly

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, error handling, and documentation

- [x] T077 [P] Add comprehensive error handling across all components
- [x] T078 [P] Implement telemetry and usage analytics (privacy-compliant)
- [x] T079 [P] Create extension documentation in extension/README.md
- [x] T080 [P] Add keyboard shortcuts and command palette integration
- [x] T081 [P] Performance optimization for large spec repositories
- [x] T082 [P] Create extension packaging and distribution workflow
- [x] T083 Final integration testing across all acceptance criteria
- [x] T084 User acceptance testing with real specifications
- [x] T085 Performance testing with 100+ specs and tasks

---

## Dependencies (User Story Completion Order)

**Critical Path (MVP)**:

1. **Setup** (T001-T007) → **Foundation** (T008-T013) → **AC1** (T014-T020)
2. **AC1** → **AC2** (Progress Panel) → **AC5** (Language Server)
3. **AC5** → **AC4** (Repository Init) - Core functionality complete

**Parallel Opportunities**:

- **AC3** (Constitution Panel) can run parallel to AC2
- **AC6** (Migration) can run parallel to AC4
- **AC7** (Auto-Updates) can run parallel to AC6
- **AC8** (Branch Support) can run parallel to AC7

**Suggested MVP Scope**: Phases 1-6 (Setup + Foundation + AC1 + AC2 + AC3 + AC5)

- Users can activate extension, see specs in tree view, and have Language Server
  integration
- This provides core value and enables MCP tool usage

**Phase Dependencies**:

- Foundation (Phase 2) blocks ALL acceptance criteria
- AC1 (Activation) blocks AC2, AC3, AC5
- AC5 (Language Server) recommended before AC4 (for MCP integration)
- AC4-AC8 can be implemented in any order after AC5

## Implementation Strategy

**MVP First**: Focus on AC1 (Activation) + AC2 (Progress Panel) + AC5 (Language
Server) **Incremental Delivery**: Each AC phase delivers a complete, testable
feature **Parallel Development**: Different files enable parallel task execution
within phases **Test-Driven**: Tests written first for each component (TDD
workflow)

## Summary

**Total Tasks**: 85 tasks across 11 phases **Parallel Tasks**: 41 tasks marked
[P] for parallel execution **Test Tasks**: 20 dedicated test tasks ensuring
quality **MVP Tasks**: 35 tasks (Phases 1-6) for minimum viable extension **Core
Dependencies**: Foundation → AC1 → AC2/AC5 → Everything else

Each acceptance criteria (AC1-AC8) can be independently tested and delivered,
enabling incremental feature rollout and early user feedback.

**Description**: Implement parser for GitHub Spec Kit format (YAML frontmatter +
Markdown content).

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

**Description**: Implement command to initialize `.specify/` structure in new
repositories.

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

**Description**: Build tree view provider that displays specs and tasks with
status indicators.

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

**Description**: Build tree view for displaying constitution articles and
sections.

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

**Description**: Automatically check for and install extension updates from
GitHub releases.

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

**Status**: ✅ Completed  
**Priority**: Critical  
**Dependencies**: T001, T002, T003, T004  
**Estimated Effort**: 16 hours

**Description**: Create comprehensive test suite for all extension
functionality.

**Acceptance Criteria**:

- Unit tests for all parsers and utilities
- Integration tests for LSP communication
- Integration tests for tree view providers
- Integration tests for file operations
- Mock all external dependencies
- 80%+ code coverage

**Test Files Implemented**:

- `extension/src/test/suite/specKitParser.test.ts` ✅
- `extension/src/test/suite/lspClient.test.ts` ✅
- `extension/src/test/suite/progressProvider.test.ts` ✅
- `extension/src/test/suite/specKitMigrator.test.ts` ✅
- `extension/src/test/suite/constitutionProvider.test.ts` ✅
- `extension/src/test/suite/extension.test.ts` ✅

---

---

### T012 (Error) - Error Handling & Logging

**Status**: 🔴 Not Started  
**Priority**: High  
**Dependencies**: T011  
**Estimated Effort**: 8 hours

**Description**: Add comprehensive error handling and logging throughout
extension.

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

**Description**: Create comprehensive documentation for extension users and
contributors.

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
