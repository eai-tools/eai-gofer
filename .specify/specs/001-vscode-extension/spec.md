---
id: "001-vscode-extension"
title: "VSCode Extension - Core Infrastructure"
status: "in_progress"
created: "2025-10-21"
updated: "2025-10-21"
priority: "critical"
assignee: "engineer-agent"
---

# VSCode Extension - Core Infrastructure

## Overview

The SpecGofer VSCode extension provides the user interface and integration layer for the spec-driven development system. It automatically detects `.specify/` folders, manages specifications, launches the Language Server, and provides visual feedback on progress.

## Problem Statement

Developers need a seamless way to:
- Initialize spec-driven development in any repository
- View and manage specifications visually
- Track task progress in real-time
- Integrate with Claude Code and GitHub Copilot
- Receive notifications when intervention is needed

## Solution

A VSCode extension that:
1. Auto-activates when `.specify/` folder is detected
2. Provides tree view UI for specs and constitution
3. Launches and manages Language Server process
4. Auto-generates MCP configuration for Claude integration
5. Handles Spec Kit migration from legacy formats
6. Downloads latest Spec Kit templates from GitHub releases during initialization
7. Provides auto-update capabilities for both extension and templates

## Acceptance Criteria

### AC1: Extension Activation
- **Given** a workspace is opened in VSCode
- **When** a `.specify/` folder exists in the workspace root
- **Then** the extension activates and shows "SpecGofer" in the activity bar
- **And** the Language Server starts automatically

### AC2: Progress Panel Display
- **Given** the extension is activated
- **When** specifications exist in `.specify/specs/`
- **Then** a tree view displays all specs with their status
- **And** tasks are shown nested under their specs
- **And** completed tasks show a checkmark icon
- **And** in-progress tasks show a sync icon

### AC3: Constitution Panel
- **Given** the extension is activated
- **When** `.specify/memory/constitution.md` exists
- **Then** a constitution tree view displays all articles
- **And** clicking an article opens the constitution file

### AC4: Repository Initialization with Spec Kit Templates

- **Given** a workspace with no `.specify/` folder
- **When** user runs "SpecGofer: Initialize Repository" command
- **Then** `.specify/` structure is created with:
  - `memory/constitution.md`
  - `specs/` directory  
  - `templates/` directory
  - `scripts/` directory
  - `README.md`
- **And** extension fetches latest Spec Kit templates from GitHub:
  - Downloads `spec-kit-template-claude-sh-vxxx.zip` from `https://github.com/github/spec-kit/releases`
  - Downloads `spec-kit-template-copilot-sh-vxxx.zip` from `https://github.com/github/spec-kit/releases`
  - Extracts template files to `.specify/templates/`
  - Extracts script files to `.specify/scripts/`
  - Overwrites any existing template files
- **And** shows progress indicator during download
- **And** handles network errors gracefully (fallback to bundled templates)

### AC5: Language Server Launch

- **Given** the extension activates
- **When** workspace path is available
- **Then** Language Server process starts
- **And** LSP client connects successfully
- **And** MCP tools are registered
- **And** `.vscode/mcp.json` is created for Claude Code

### AC6: Spec Kit Migration

- **Given** a workspace with legacy JSON specs
- **When** user runs "SpecGofer: Upgrade to Spec Kit Format"
- **Then** all JSON specs are converted to Markdown with YAML frontmatter
- **And** task dependencies are preserved
- **And** original files are backed up to `.specify/_backup/`

### AC7: Extension and Template Auto-Updates

- **Given** the extension is installed
- **When** VSCode starts or every 24 hours
- **Then** extension checks GitHub releases for:
  - Extension updates (`eai-tools/specgofer`)
  - Spec Kit template updates (`github/spec-kit`)
- **And** if newer versions exist, shows notification
- **And** user can click to download and install
- **And** template updates automatically refresh `.specify/templates/` and `.specify/scripts/`

### AC8: Branch-Specific Specs

- **Given** multiple git branches with different specs
- **When** user switches branches
- **Then** extension reloads specs from current branch (`.specify/specs/`)
- **And** progress panel updates to show current branch specs

## Technical Design

### Extension Structure
```
extension/
├── src/
│   ├── extension.ts          # Main entry point
│   ├── lspClient.ts          # Language Server client
│   ├── mcpConfig.ts          # MCP configuration helper
│   ├── progressProvider.ts   # Tree view for specs
│   ├── constitutionProvider.ts # Tree view for constitution
│   ├── specKitMigrator.ts    # Handles format migration
│   ├── specKitParser.ts      # Parses Spec Kit format
│   ├── branchSpecManager.ts  # Manages branch-specific specs
│   └── autoUpdater.ts        # Auto-update functionality
├── dist/                      # Webpack output
├── package.json              # Extension manifest
└── webpack.config.js         # Build configuration
```

### Key Components

**1. Extension Activation**
- Activation events: `onStartupFinished`
- Checks for `.specify/` folder
- Initializes providers and Language Server

**2. LSP Client**
- Spawns Language Server as child process
- Communicates via stdio
- Handles custom LSP methods

**3. MCP Configuration**
- Creates `.vscode/mcp.json`
- Points to Language Server for MCP tools
- Enables Claude Code integration

**4. Tree View Providers**
- `ProgressProvider`: Displays specs and tasks
- `ConstitutionProvider`: Displays constitution articles
- Auto-refresh on file changes

**5. Migration System**
- Detects legacy JSON format
- Converts to GitHub Spec Kit format
- Preserves all data and relationships

**6. Spec Kit Template Manager**
- Downloads latest templates from `https://github.com/github/spec-kit/releases`
- Fetches `spec-kit-template-claude-sh-vxxx.zip` and `spec-kit-template-copilot-sh-vxxx.zip`
- Extracts files to `.specify/templates/` and `.specify/scripts/`
- Handles version checking and automatic updates
- Provides fallback to bundled templates on network failure

## Tasks

- [x] #T001 Create extension entry point with activation logic (deps: none)
- [x] #T002 Implement LSP client to launch Language Server (deps: T001)
- [x] #T003 Build progress tree view provider for specs (deps: T001)
- [x] #T004 Build constitution tree view provider (deps: T001)
- [x] #T005 Implement Spec Kit parser for YAML frontmatter (deps: T001)
- [x] #T006 Create Spec Kit migrator for legacy JSON (deps: T005)
- [x] #T007 Implement MCP config generator (deps: T002)
- [x] #T008 Add repository initialization command (deps: T001)
- [x] #T009 Implement branch-specific spec manager (deps: T005)
- [x] #T010 Add auto-updater with GitHub release checking (deps: T001)
- [ ] #T011 Implement Spec Kit template downloader (deps: T001)
- [ ] #T012 Add template version checking and auto-update (deps: T011)
- [ ] #T013 Create comprehensive integration tests (deps: T001,T002,T003,T004,T011,T012)
- [ ] #T014 Add error handling and logging (deps: T013)
- [ ] #T015 Document extension API and commands (deps: T014)

## Dependencies

### Internal
- Language Server must be running
- `.specify/specs/` folder structure must exist (note: specs at `.specify/specs/`, not root)

### External
- VSCode 1.85.0+
- Node.js 18+
- Git (for branch management)

## Test Strategy

### Unit Tests
- Spec Kit parser with various formats
- Migrator with legacy JSON
- Tree view provider data transformations
- MCP config generation

### Integration Tests
- Extension activation flow
- Language Server communication
- File system operations
- Command execution

### E2E Tests (Manual)
1. Install extension in clean VSCode
2. Open repo without `.specify/`
3. Run initialize command
4. Verify structure created
5. Add spec and verify tree view
6. Switch branches and verify reload

## Performance Considerations

- Extension should activate in <500ms
- Tree view should render in <100ms for 100 specs
- File watching should debounce with 300ms delay
- Language Server should start in <1s

## Security Considerations

- Validate all file paths to prevent traversal
- Sanitize user input in commands
- Don't expose sensitive data in logs
- Secure MCP configuration file permissions

## Documentation Needs

- Installation guide
- Command reference
- Configuration options
- Troubleshooting guide
- Migration guide from legacy format

## Success Metrics

- Extension activates successfully on 95%+ of workspaces
- <5 support requests per month about activation issues
- <100ms UI response time
- Zero security vulnerabilities

## Future Enhancements

- Multi-root workspace support
- Remote workspace support (SSH, Containers)
- Custom theme support for tree views
- Keyboard shortcuts for common commands
- Inline spec editing UI
