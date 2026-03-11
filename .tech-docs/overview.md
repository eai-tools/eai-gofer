---
generated: "2026-03-11T22:14:00Z"
source_commit: "29a322a5fd292b6346a0cf0d2ae981a59ffe4a4c"
---

# Gofer - Technical Overview

## Service Identity

**Name:** Gofer
**Version:** 1.17.1
**Publisher:** Enterprise AI Pty Ltd
**Description:** Spec-driven development system for AI assistants. Provides 6 MCP tools that enable Claude Code and GitHub Copilot to autonomously implement features from specifications.

**Repository:** https://github.com/eai-tools/gofer

## Purpose

Gofer is a VSCode extension that bridges human specifications with AI implementation. It provides:

1. **Model Context Protocol (MCP) Tools** - 6 tools that AI assistants call directly to read specs, execute tasks, and validate code
2. **Specification Framework** - Structured `.specify/` directory format for feature specs, plans, and tasks
3. **Autonomous Execution** - Optional orchestrator that drives Claude Code through full implementation cycles
4. **Context Health Management** - Monitors and manages AI context window usage to maintain accuracy
5. **Constitution-Based Validation** - Enforces project principles and coding standards

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | TypeScript | 5.7.2 |
| Runtime | Node.js | 20.x |
| Framework | VSCode Extension API | 1.85.0+ |
| Build Tool | Webpack | 5.89.0 |
| Testing | Vitest + Playwright | 3.2.4 / 1.49.1 |
| AI SDK | Anthropic SDK | 0.32.1 (root), 0.67.0 (extension) |
| Language Server | vscode-languageserver | 9.0.1 |
| Dependency Injection | tsyringe | 4.10.0 |
| Terminal Emulation | node-pty | 1.0.0 |
| Schema Validation | Zod | 3.24.1 |

## Key Entry Points

### Extension Entry Point
**File:** `extension/src/extension.ts`
- Activates on startup (`onStartupFinished`)
- Registers commands, views, status bars
- Initializes dependency injection container
- Starts Language Server and MCP tools

### Language Server Entry Point
**File:** `language-server/src/server.ts`
- Dual-protocol server (LSP + MCP)
- Listens on stdio for extension communication
- Handles MCP tool requests from AI assistants

### Orchestrator Entry Point
**File:** `src/orchestrator/AutonomousOrchestrator_new.ts`
- Optional autonomous execution mode
- Coordinates Claude Code terminal sessions
- Manages task queue and dependencies

## How to Run Locally

### 1. Install Dependencies
```bash
npm install
cd extension && npm install
cd ../language-server && npm install
```

### 2. Build All Components
```bash
npm run build:all
```

### 3. Run Extension in Development Mode
```bash
# Open in VSCode
code .

# Press F5 to launch Extension Development Host
# Or: Run > Start Debugging
```

### 4. Run Tests
```bash
npm test                    # All tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:e2e            # End-to-end tests
```

### 5. Build VSIX Package
```bash
cd extension
npm run package
npx vsce package
```

## Team/Ownership

**Owner:** Enterprise AI Pty Ltd
**Contact:** https://enterpriseai.com.au

**Key Maintainer Information:**
- Based on CLAUDE.md, the project follows a structured workflow with autonomous bug fixing and self-improvement loops
- Uses Gofer's own pipeline for development (`/0_business_scenario` → research → specify → plan → tasks → implement → validate)
- Specifications stored in `.specify/specs/` directory
- Constitution principles defined in `.specify/memory/constitution.md`

## Project Structure

```
gofer/
├── extension/           # VSCode extension (UI, commands, views)
├── language-server/     # LSP + MCP server
├── src/                 # Orchestrator (autonomous execution)
├── .specify/            # Specifications and memory
├── docs/                # Documentation
├── tests/               # Test suites
└── scripts/             # Build and automation scripts
```

## Quick Start for Users

1. **Install Extension**
   ```bash
   gh release download --repo eai-tools/gofer --pattern "*.vsix"
   code --install-extension gofer-*.vsix
   ```

2. **Initialize Repository**
   - Open Command Palette: `Cmd/Ctrl+Shift+P`
   - Run: `Gofer: Initialize Repository`
   - Creates `.specify/` folder structure

3. **Create Specification**
   - Create `.specify/specs/my-feature/spec.md`
   - Add requirements and success criteria

4. **Let AI Implement**
   - In Claude Code: `/0_business_scenario Add user authentication`
   - Pipeline auto-chains through all stages
   - AI implements autonomously

## Key Features

- **Branch-Aware Specs** - Detects Git branch and shows relevant specs
- **Auto-Updates** - Checks for extension updates automatically
- **Progress Tracking** - Real-time status in Gofer sidebar
- **Task Dependencies** - Executes tasks in dependency order
- **Context Health** - Monitors AI context window usage
- **Memory Management** - Continuous memory compaction and layered storage
- **Scope Guard** - Prevents AI from accessing protected files
- **Cost Budget** - Tracks and enforces per-run cost limits
- **GitHub Codespaces** - Automatic installation in Codespaces
- **Auto-Context-Continuity (ACC)** - Automatic session save/resume at 65% context
