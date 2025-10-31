# Implementation Plan: VSCode Extension - Core Infrastructure

**Branch**: `001-vscode-extension` | **Date**: 2025-10-22 | **Spec**:
[spec.md](./spec.md) **Input**: Feature specification from
`.specify/specs/001-vscode-extension/spec.md`

## Summary

The SpecGofer VSCode extension provides the user interface and integration layer
for the spec-driven development system. It auto-detects `.specify/` folders,
manages specifications via tree views, launches the Language Server with dual
LSP+MCP protocols, and auto-generates Claude Code integration. The extension
handles GitHub Spec Kit format parsing, legacy JSON migration, branch-specific
spec management, downloads latest Spec Kit templates from GitHub releases during
initialization, and provides auto-updates for both extension and templates.

## Technical Context

**Language/Version**: TypeScript 5.7.2 (VSCode Extension API)

**Primary Dependencies**:

- VSCode Extension API 1.85.0+
- Language Server Client (vscode-languageclient)
- Webpack 5 (bundler)
- Chokidar (file watching)
- Gray-matter (YAML frontmatter parsing)
- Node.js HTTPS/Fetch API (for GitHub releases)
- JSZip or similar (for template archive extraction)

**Storage**: Filesystem (`.specify/specs/` folder structure, `.vscode/mcp.json`,
downloaded templates)

**Testing**:

- Vitest (unit tests)
- VSCode Extension Test Runner (@vscode/test-electron)
- Manual E2E testing in development host

**Target Platform**: VSCode 1.85.0+ on Windows/macOS/Linux

**Project Type**: VSCode Extension (single package with bundled dependencies)

**Performance Goals**:

- Extension activation <500ms
- Tree view render <100ms for 100 specs
- Language Server spawn <1s
- File watch debounce 300ms
- Template download <10s (with progress indicator)

**Constraints**:

- Must bundle Language Server with extension
- MCP config must be auto-created for Claude Code
- Network calls allowed for GitHub API (updates and template downloads)
- Must support multi-root workspaces
- Template downloads must handle network failures gracefully
- All specs must be located at `.specify/specs/` (not root level)

**Scale/Scope**:

- Support 1000+ specs per workspace
- Handle 10+ simultaneous branches
- Tree views with 500+ items
- Extension size <10MB packaged

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-Driven Development (NON-NEGOTIABLE)

- ✅ **Status**: PASS
- **Evidence**: Spec includes task #T011 for comprehensive integration tests
- **Plan**: Unit tests for parsers, tree providers, migrator; Integration tests
  for LSP client; E2E manual tests for activation flow
- **Coverage Target**: 80% minimum (constitution requirement)

### II. MCP-First Architecture

- ✅ **Status**: PASS
- **Evidence**: Extension launches Language Server that exposes MCP tools;
  Auto-creates `.vscode/mcp.json` for Claude Code integration
- **Plan**: MCP config generator in `mcpConfig.ts`; No file-based legacy
  integration

### III. Spec Kit Format Compliance

- ✅ **Status**: PASS
- **Evidence**: Extension parses GitHub Spec Kit format with `specKitParser.ts`;
  Provides migration tool for legacy JSON
- **Plan**: YAML frontmatter parsing, task dependency extraction, spec
  validation

### IV. Strict TypeScript & Code Quality

- ✅ **Status**: PASS
- **Evidence**: TypeScript 5.7.2 with strict mode; ESLint configured
- **Requirements**: No `any` types, functions ≤300 lines, files ≤500 lines
- **Note**: All extension files already comply based on existing codebase

### V. Security by Default

- ✅ **Status**: PASS with Validations
- **Evidence**: File path validation required, no plaintext secrets
- **Plan**:
  - Validate all paths in `specKitParser.ts` and `specKitMigrator.ts`
  - Sanitize user input in command handlers
  - MCP config uses `${env:ANTHROPIC_API_KEY}` pattern
  - Don't expose sensitive data in logs

### VI. Performance Requirements

- ✅ **Status**: PASS
- **Evidence**: Performance goals match constitution requirements
- **Targets**:
  - Extension activation <500ms (constitution: <500ms) ✅
  - Tree view render <100ms (constitution: <100ms) ✅
  - Language Server start <1s (constitution: <1s) ✅
- **Monitoring**: Manual testing during development, performance profiling
  before release

### VII. 80% Test Coverage Minimum

- ⚠️ **Status**: PENDING (tests not yet implemented)
- **Action Required**: Task #T011 must achieve 80% coverage
- **Critical Paths**: Extension activation, LSP client, spec parsing, tree
  providers
- **Note**: Will be validated in Phase 2 (tasks.md generation)

**GATE RESULT**: ✅ PASS with action items

- All principles aligned
- Tests required (tracked in tasks)
- Security validations documented

## Project Structure

### Documentation (this feature)

```text
.specify/specs/001-vscode-extension/
├── spec.md              # Feature specification (input)
├── plan.md              # This file
├── research.md          # Phase 0 output (research findings)
├── data-model.md        # Phase 1 output (data structures)
├── quickstart.md        # Phase 1 output (developer quick start)
├── contracts/           # Phase 1 output (VSCode API contracts)
│   ├── extension-api.md      # Extension activation, commands, tree providers
│   ├── lsp-protocol.md       # LSP custom methods
│   └── file-formats.md       # Spec Kit format, MCP config schema
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
extension/
├── src/
│   ├── extension.ts               # Main entry point, activation logic
│   ├── lspClient.ts              # Language Server client (LSP)
│   ├── mcpConfig.ts              # MCP configuration generator
│   ├── progressProvider.ts       # Tree view for specs/tasks
│   ├── constitutionProvider.ts   # Tree view for constitution
│   ├── specKitParser.ts          # GitHub Spec Kit format parser
│   ├── specKitMigrator.ts        # Legacy JSON → Spec Kit migration
│   ├── branchSpecManager.ts      # Branch-specific spec handling
│   ├── autoUpdater.ts            # GitHub releases auto-update
│   ├── fileMonitor.ts            # File system watcher
│   └── __tests__/                # Unit tests
│       ├── specKitParser.test.ts
│       ├── specKitMigrator.test.ts
│       ├── progressProvider.test.ts
│       └── mcpConfig.test.ts
├── dist/                          # Webpack bundle output
├── package.json                   # Extension manifest
├── tsconfig.json                  # TypeScript config
├── webpack.config.js              # Webpack bundler
└── README.md                      # Extension documentation

language-server/                   # Bundled with extension
├── src/
│   ├── server.ts                 # LSP + MCP server
│   ├── mcp/
│   │   └── toolHandler.ts        # MCP tool implementations
│   └── utils/
│       └── specKitLoader.ts      # Spec loading utilities
└── package.json

tests/                             # Integration tests
├── integration/
│   ├── extension-activation.test.ts
│   ├── lsp-communication.test.ts
│   └── tree-views.test.ts
└── helpers/
    └── vscode-test-helper.ts
```

**Structure Decision**: VSCode Extension with bundled Language Server

- Extension code in `/extension/src/` (TypeScript)
- Language Server bundled via Webpack
- Unit tests colocated in `__tests__/` directories
- Integration tests in root `/tests/` directory
- Single package with Webpack build process

## Complexity Tracking

No constitution violations - all checks passed.

## Implementation Plan Summary

### Phase 0: Research ✅ COMPLETE

**Output**: `research.md`

- ✅ All technical unknowns resolved
- ✅ VSCode Extension API architecture validated
- ✅ MCP integration pattern documented
- ✅ GitHub Spec Kit parsing strategy defined
- ✅ Tree view provider pattern confirmed
- ✅ Legacy migration approach specified
- ✅ Branch management and auto-update strategies
- ✅ Testing strategy established

### Phase 1: Design & Contracts ✅ COMPLETE

**Output**: `data-model.md`, `contracts/`, `quickstart.md`, agent context
updated

- ✅ Core entities defined (Spec, Task, AcceptanceCriterion, etc.)
- ✅ Extension API contracts documented (`contracts/extension-api.md`)
- ✅ LSP protocol contracts defined (`contracts/lsp-protocol.md`)
- ✅ File formats specified (`contracts/file-formats.md`)
- ✅ Quick start guide created for developers
- ✅ Agent context updated with new technologies

### Phase 2: Task Breakdown - PENDING

**Next Command**: `/speckit.tasks` (NOT created by this command)

This will generate `tasks.md` with:

- Detailed implementation tasks
- Task dependencies based on data model
- Test tasks for each component
- Phased execution plan (Foundation → User Stories)

### Re-Evaluation of Constitution Check

**Status**: ✅ ALL PRINCIPLES ALIGNED

After Phase 1 design, re-checking constitution compliance:

1. **Test-Driven Development**: Tests documented in quickstart, task #T011
   tracked
2. **MCP-First Architecture**: MCP config auto-generation documented
3. **Spec Kit Format Compliance**: Parser and migrator contracts defined
4. **Strict TypeScript & Code Quality**: TypeScript 5.7.2 strict mode confirmed
5. **Security by Default**: Path validation and input sanitization specified
6. **Performance Requirements**: All targets documented and achievable
7. **80% Test Coverage**: Testing strategy defined, coverage gates in CI

**No violations introduced during design phase.**

## Artifacts Generated

```
.specify/specs/001-vscode-extension/
├── spec.md                          # Input (pre-existing)
├── plan.md                          # This file (Phase 0-1 output)
├── research.md                      # Phase 0: Research findings
├── data-model.md                    # Phase 1: Data structures
├── quickstart.md                    # Phase 1: Developer guide
└── contracts/                       # Phase 1: API contracts
    ├── extension-api.md             # VSCode Extension API
    ├── lsp-protocol.md              # Language Server Protocol
    └── file-formats.md              # Spec Kit & MCP formats
```

## Ready for Implementation

All planning complete. Next steps:

1. **Run `/speckit.tasks`** to generate detailed task breakdown
2. **Begin TDD implementation** following quickstart.md
3. **Reference contracts/** for API specifications
4. **Validate against constitution** using `specgofer_validate_code` tool

**Branch**: `001-vscode-extension` **Status**: Planning Complete, Ready for
Tasks
