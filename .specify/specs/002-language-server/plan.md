# Implementation Plan: Language Server - LSP + MCP Dual Protocol

**Branch**: `002-language-server` | **Date**: 2025-10-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-language-server/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a Node.js Language Server that serves dual protocols - Language Server Protocol (LSP) for VSCode extension communication and Model Context Protocol (MCP) for AI agent tool integration. The server provides 6 MCP tools for spec management, task coordination, constitution validation, and test execution, enabling autonomous development workflows.

## Technical Context

**Language/Version**: TypeScript 5.7.2 targeting Node.js 18+ (ES2022)  
**Primary Dependencies**: vscode-languageserver 9.0.1, @anthropic-ai/sdk 0.35.0  
**Storage**: File system based (.specify/specs/*.md), no database  
**Testing**: Vitest for unit tests, Playwright for E2E integration  
**Target Platform**: Node.js server process (spawned by VSCode extension)  
**Project Type**: Language Server (dual LSP + MCP protocol implementation)  
**Performance Goals**: <1s startup, <500ms spec loading (100+ specs), <100ms tool responses  
**Constraints**: Single-process, stateless design, file-system persistence only  
**Scale/Scope**: Support 1000+ specs per workspace, 6 MCP tools, concurrent LSP/MCP requests

## Constitution Check (Post-Design Re-evaluation)

*GATE: Re-checked after Phase 1 design completion.*

✅ **Test-Driven Development**: Comprehensive test plan with unit, integration, and E2E tests defined  
✅ **MCP-First Architecture**: All 6 MCP tools fully specified with JSON schemas and business rules  
✅ **Spec Kit Format Compliance**: SpecKitLoader designed to parse GitHub Spec Kit YAML + Markdown  
✅ **Strict TypeScript**: All interfaces defined with proper typing, no `any` types in contracts  
✅ **Security by Default**: Input validation, path traversal prevention, parameter sanitization specified  
✅ **Performance Requirements**: <1s startup, <100ms tool responses, <500ms spec loading maintained  
✅ **80% Test Coverage**: Test fixtures and comprehensive test scenarios defined for all components

**Final Assessment**: All constitution principles satisfied after detailed design. Ready for implementation.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
language-server/
├── src/
│   ├── server.ts              # Main LSP + MCP server implementation
│   ├── mcp/
│   │   └── toolHandler.ts     # 6 MCP tool implementations
│   └── utils/
│       └── specKitLoader.ts   # GitHub Spec Kit parsing and management
├── dist/                      # Compiled JavaScript output
├── package.json               # Language server dependencies
└── tsconfig.json              # TypeScript configuration

tests/
├── integration/
│   └── mcpTools.test.ts       # Integration tests for all 6 MCP tools
├── unit/
│   ├── specLoader.test.ts     # Unit tests for spec parsing
│   └── engineerAgent.test.ts  # Unit tests for constitution validation
└── e2e/
    └── language-server/
        └── lsp-mcp-integration.spec.ts  # E2E tests for dual protocol
```

**Structure Decision**: Single language server project with clear separation of concerns - main server handles dual protocols, MCP tools isolated in dedicated module, spec loading abstracted to utilities. This aligns with the single project structure from the constitution.

## Phase 0: Research Complete

Since the technical context is fully defined and no clarifications are needed, research phase is complete. All technology choices are well-established:

- **TypeScript + Node.js**: Industry standard for VS Code extensions and language servers
- **vscode-languageserver**: Official Microsoft LSP library with proven stability  
- **Anthropic SDK**: Required for Claude API integration in constitution validation
- **File-based persistence**: Aligns with Git workflow and spec versioning requirements
- **Dual protocol design**: Innovative approach combining LSP and MCP in single process

## Phase 1: Design & Contracts Complete

✅ **Data Model**: Created comprehensive entity definitions with relationships and state transitions  
✅ **API Contracts**: Specified all 6 MCP tools with JSON schemas, request/response formats, and error handling  
✅ **Quickstart Guide**: Documented integration scenarios, testing workflows, and API examples  
✅ **Agent Context**: Updated GitHub Copilot instructions with new technology stack  

**Generated Artifacts**:
- `data-model.md` - Core entities, relationships, and persistence strategy
- `contracts/mcp-tools-api.md` - Complete MCP tool specifications  
- `quickstart.md` - Integration guide with examples and troubleshooting

## Implementation Readiness

**Status**: READY FOR IMPLEMENTATION  
**Next Command**: `/speckit.tasks` to generate detailed task breakdown  
**Branch**: `002-language-server`  
**Plan Path**: `/Users/douglaswross/spec-driven-dev-system/.specify/specs/002-language-server/plan.md`
