---
generated: true
generated_at: "2026-05-17T17:52:23.514Z"
source_commit: "347c971273d89c79adb9e37e41b93a7a8388f035"
---
# Gofer - Technical Overview

## Executive Summary

| Attribute                | Value                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Service Name**         | Gofer for EnterpriseAI Vertical App Delivery                                                                         |
| **Primary Capability**   | Spec-driven development workflow system with UI-first app delivery and multi-platform AI assistant support           |
| **Primary Users**        | Software development teams using Claude Code, GitHub Copilot, OpenAI Codex, or Gemini CLI for feature implementation |
| **Data Sensitivity**     | Low - stores specifications, plans, and code artifacts locally in repository workspace                               |
| **Current Status**       | Active Development (v3.3.1) - Production-ready with enterprise AI workflow enhancements                              |
| **Last Material Change** | 2026-05-17 - Automated nightly documentation refresh maintaining synchronization with codebase                        |

## Service Identity

**Name:** Gofer **Version:** 3.3.1 **Documentation Updated:** 2026-05-17
**Publisher:** Enterprise AI Pty Ltd **Description:** Spec-driven development
system for AI assistants. Provides 40+ MCP tools that enable Claude Code, GitHub
Copilot, OpenAI Codex, and Gemini CLI to autonomously implement features from
specifications with UI-first app delivery workflow support and EnterpriseAI platform integration.

**Repository:**
[https://github.com/eai-tools/gofer](https://github.com/eai-tools/gofer)

## Purpose

Gofer is a VSCode extension that bridges human specifications with AI
implementation. It provides:

1. **Model Context Protocol (MCP) Tools** - 40+ tools that AI assistants call
   directly to read specs, execute tasks, validate code, and manage context
2. **Specification Framework** - Structured `.specify/` directory format for
   feature specs, plans, and tasks
3. **Multi-Platform CLI Support** - Commands for Claude Code, GitHub Copilot
   Chat, OpenAI Codex, and Gemini CLI
4. **Autonomous Execution** - Optional orchestrator that drives Claude Code
   through full implementation cycles
5. **Context Health Management** - Monitors and manages AI context window usage
   to maintain accuracy (auto-save at 65% threshold)
6. **Constitution-Based Validation** - Enforces project principles and coding
   standards
7. **Visual Artifacts** - 10 persona-pack templates (Impact Canvas, C4, ERD,
   Risk Heatmap, etc.)
8. **Cost Budget Enforcement** - Tracks token usage and enforces cost limits per
   pipeline run
9. **Scope Guard** - Prevents AI from accessing protected files defined in specs
10. **Memory Management** - MemGPT-inspired three-layer memory system with
    automatic compaction

## Tech Stack

| Component            | Technology            | Version                           |
| -------------------- | --------------------- | --------------------------------- |
| Language             | TypeScript            | 5.7.2                             |
| Runtime              | Node.js               | 20.x                              |
| Framework            | VSCode Extension API  | 1.85.0+                           |
| Build Tool           | Webpack               | 5.89.0                            |
| Testing              | Vitest + Playwright   | 3.2.4 / 1.49.1                    |
| AI SDK               | Anthropic SDK         | 0.32.1 (root), 0.67.0 (extension) |
| Language Server      | vscode-languageserver | 9.0.1                             |
| Dependency Injection | tsyringe              | 4.10.0                            |
| Terminal Emulation   | node-pty-prebuilt     | 0.10.1-pre.5                      |
| Schema Validation    | Zod                   | 3.24.1                            |
| File Watching        | chokidar              | 3.5.3/4.0.3                       |

## Key Entry Points

### Extension Entry Point

**File:** `extension/src/extension.ts`

- Activates on startup (`onStartupFinished`)
- Registers commands (30+), views (3), status bars (2)
- Initializes dependency injection container (TSyringe)
- Starts Language Server and MCP tools
- Sets up file watchers for real-time spec updates
- **Extension file count:** 247 TypeScript files (across all modules)

### Language Server Entry Point

**File:** `language-server/src/server.ts`

- Dual-protocol server (LSP + MCP)
- Listens on stdio for extension communication
- Handles 40+ MCP tool requests from AI assistants
- Implements custom LSP methods for spec/task management
- **Server file count:** 10+ TypeScript files

### Orchestrator Entry Point

**File:** `src/orchestrator/AutonomousOrchestrator_new.ts`

- Optional autonomous execution mode (CLI-based)
- Coordinates Claude Code terminal sessions
- Manages task queue and dependencies
- IPC status signaling via `.specify/ipc/status.json`
- WhatsApp notifications via Twilio (optional)

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
npm run test:coverage       # Coverage report
```

### 5. Build VSIX Package

```bash
cd extension
npm run package
npx vsce package
```

## Team/Ownership

**Owner:** Enterprise AI Pty Ltd **Contact:**
[https://enterpriseai.com.au](https://enterpriseai.com.au)

**Key Maintainer Information:**

- Based on CLAUDE.md, the project follows a structured workflow with autonomous
  bug fixing and self-improvement loops
- Uses Gofer's own pipeline for development (`/0_business_scenario` → research →
  specify → plan → tasks → implement → validate)
- Specifications stored in `.specify/specs/` directory
- Constitution principles defined in `.specify/memory/constitution.md`

**Active Specifications (2026-05-15):**

- **032-gofer-ui-first-builder** - UI-first app delivery workflow with preview,
  approval, and service-fit gates (Status: Completed, Released in v3.2.2)
- **031-skills-pipeline-augmentation** - Enhanced agent coordination and skill
  composition (Status: Completed, Released in v3.2.0)
- **027-public-builder-runtime** - Public platform builder boundary clarification
  and EnterpriseAI workflow profile support (Status: Completed, Released in v3.3.1)

## Project Structure

```
gofer/
├── extension/           # VSCode extension (UI, commands, views)
│   ├── src/             # TypeScript source
│   ├── language-server/ # Bundled LSP server (copied during build)
│   └── package.json     # Extension manifest
├── language-server/     # LSP + MCP server (source)
│   └── src/             # Server implementation
├── src/                 # Orchestrator (autonomous execution)
│   ├── orchestrator/    # Main orchestration loop
│   └── types/           # Shared type definitions
├── .specify/            # Specifications and memory
│   ├── specs/           # Feature specifications
│   ├── memory/          # Constitution, hints
│   ├── logs/            # JSONL logs (usage, audit, slop)
│   └── commands/        # Source-of-truth for CLI surfaces
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

3. **Configure API Keys**
   - Set `gofer.anthropicApiKey` in VSCode settings
   - Optional: `gofer.googleApiKey`, `gofer.openaiApiKey` for LLM Council

4. **Create Specification**
   - Create `.specify/specs/my-feature/spec.md`
   - Add requirements and success criteria

5. **Let AI Implement**
   - In Claude Code: `/0_business_scenario Add user authentication`
   - In GitHub Copilot: `#0_business_scenario Add user authentication`
   - In OpenAI Codex: Invoke the `0_business_scenario` skill
   - In Gemini CLI: `/gofer:0_business_scenario Add user authentication`
   - Pipeline auto-chains through all stages

## Key Features

### Multi-Platform Support (v3.0+)

- **Claude Code** - Full feature support with 40+ MCP tools
- **GitHub Copilot Chat** - Core features + 2026+ enhancements
- **OpenAI Codex CLI** - Full feature support via skill system
- **Gemini CLI** - Command files with namespace support
- **Auto-detection** - `gofer.defaultCLI` setting (`auto`, `claude`, `copilot`,
  `codex`, `gemini`)

### CLI Innovations (v3.0+)

- **Source-of-Truth Generator** - Single canonical
  `.specify/commands/<stage>.md` file emits to 8 CLI surfaces
- **Visual Artifacts** - 10 persona-pack templates (Impact Canvas, C4, ERD,
  Heatmaps, etc.)
- **7 Visual Writer Agents** - Specialized agents for each diagram type
- **Namespace Aliases** - `/gofer:*` prefix for all commands
- **Mermaid Export** - `npm run gofer:mermaid-export` (optional)

### Core Features

- **Branch-Aware Specs** - Detects Git branch and shows relevant specs
- **Auto-Updates** - Checks for extension updates automatically
- **Progress Tracking** - Real-time status in Gofer sidebar
- **Task Dependencies** - Executes tasks in dependency order
- **Context Health** - Monitors AI context window usage (status bar)
- **Memory Management** - Continuous memory compaction and layered storage
  (JSONL-based)
- **Scope Guard** - Prevents AI from accessing protected files
  (advisory/warning/blocking modes)
- **Cost Budget** - Tracks and enforces per-run cost limits ($10 default,
  configurable)
- **GitHub Codespaces** - Automatic installation in Codespaces
- **Auto-Context-Continuity (ACC)** - Automatic session save/resume at 65%
  context
- **Slop Reduction** - Auto-removes console.log, debugger, @ts-ignore on save
  (opt-in)
- **Tool Audit Logging** - All file access logged to
  `.specify/logs/tool-audit.jsonl`

### Recent Additions (v3.0-3.2)

- **Memory Panel Filter** - Toggle to hide system-generated memories (533 → 0 by
  default)
- **Cross-Platform Command Parity** - All 16 Gofer commands on Claude, Copilot,
  Codex, Gemini
- **Parallel Validation** - 6 validation agents run concurrently (<60s vs
  90-120s)
- **Codex Budget Doctor** - `npm run gofer:codex-doctor` diagnostic tool
- **Plugin Manifests** - `.claude-plugin/`, `.gemini/`, `codex-config.toml`
  support
- **AI Usage Panel** - Real-time token usage and cost tracking via provider
  billing APIs
- **Resource Diagnostics** - Lightweight performance snapshots (5min intervals,
  opt-in)
- **Context REPL** - MCP tools for progressive context management
  (peek/grep/fold/expand/undo)
- **Research Chunking** - On-demand loading of large research.md files to reduce
  context bloat
- **Skills Pipeline Augmentation** - Enhanced agent coordination and skill
  composition (v3.2)
- **UI-First App Delivery** - Preview-approval-service-fit workflow for vertical
  apps (v3.2.2)

## Data Storage

All data is stored in the `.specify/` directory:

- **Specs:** `.specify/specs/{spec-id}/spec.md` (Markdown with YAML frontmatter)
- **Tasks:** `.specify/specs/{spec-id}/tasks.md` (Markdown checklist format)
- **Memory:** `.specify/memory/memories.jsonl` (Append-only JSONL)
- **Logs:** `.specify/logs/` (council-usage.jsonl, tool-audit.jsonl,
  slop-reduction.jsonl, gofer-run-ledger.jsonl)
- **State:** `.specify/current-stage.json`, `.specify/ipc/status.json`

No database required - all data is file-based for Git-friendly version control.

## Critical Integrations

### Primary Integrations

| System                    | Type       | Purpose                                                   | Criticality                 |
| ------------------------- | ---------- | --------------------------------------------------------- | --------------------------- |
| **VS Code Extension API** | Platform   | Extension host, commands, views, language server protocol | Required                    |
| **Anthropic API**         | Upstream   | Claude 3.5 Sonnet/Haiku for autonomous implementation     | Optional (Claude Code only) |
| **Google AI API**         | Upstream   | Gemini 1.5 Pro/Flash for LLM Council validation           | Optional                    |
| **OpenAI API**            | Upstream   | GPT-4 for LLM Council validation                          | Optional                    |
| **Claude Code CLI**       | Downstream | Primary consumer of MCP tools (40+ tools)                 | Primary                     |
| **GitHub Copilot**        | Downstream | Consumer of prompt files (`.github/prompts/`)             | Core                        |
| **OpenAI Codex CLI**      | Downstream | Consumer of skill files (`.agents/skills/`)               | Core                        |
| **Gemini CLI**            | Downstream | Consumer of command files (`.gemini/commands/gofer/`)     | Core                        |

### Secondary Integrations

- **Twilio API** - Optional WhatsApp notifications for orchestrator runs
- **GitHub API** - Optional auto-update checking
- **GitHub Pages** - Documentation hosting for Docusaurus site

See `./dependencies.md` for the full upstream and downstream dependency map.

## Documentation Surfaces

This repository maintains multiple documentation surfaces:

| Path          | Purpose                                           | Publishing Workflow                                                  | Nightly Pipeline       |
| ------------- | ------------------------------------------------- | -------------------------------------------------------------------- | ---------------------- |
| `.tech-docs/` | Canonical technical snapshot (this documentation) | Auto-generated, triggers Pages deployment                            | Yes                    |
| `docs-site/`  | Docusaurus-based public documentation site        | Built and deployed to GitHub Pages via `.github/workflows/pages.yml` | Consumes `.tech-docs/` |
| `README.md`   | Quick start and repository overview               | Manually maintained                                                  | No                     |
| `AGENTS.md`   | Agent conventions and guidelines                  | Manually maintained                                                  | No                     |
| `CLAUDE.md`   | Project-specific instructions for Claude          | Manually maintained                                                  | No                     |

**Key Notes:**

- `.tech-docs/` is the source of truth for technical documentation
- `docs-site/` publishes `.tech-docs/` content to GitHub Pages (configuration in
  progress)
- Changes to `.tech-docs/` automatically trigger a documentation site rebuild
- Documentation site requires Node 24+ and uses Docusaurus 3.6.3

## Current Status

- Nightly-managed `.tech-docs/` content is present for this repository.
- Source commit: `347c971273d89c79adb9e37e41b93a7a8388f035`
- Version: 3.3.1 (Released 2026-05-10)
- Additional repo-local docs surfaces detected: 1 (docs-site/)
- Legacy documentation archived in `.tech-docs/legacy-src/docs/`
- Recent focus: Automated nightly documentation maintenance, public platform builder boundary clarification, environment variable security (`.env` in `.gitignore`)
