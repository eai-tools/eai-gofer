---
generated: true
generated_at: "2026-05-18T18:29:37.022Z"
source_commit: "d71d0b38af3ecb01dee9c3d3001ef1abe9dc5510"
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
| **Last Material Change** | 2026-05-18 - EAI block catalog requirement for UI generation enforced                                                |

## Service Identity

**Name:** Gofer  
**Version:** 3.3.1  
**Documentation Updated:** 2026-05-18  
**Publisher:** Enterprise AI Pty Ltd  
**Repository:** [https://github.com/enterpriseaigroup/tech-docs](https://github.com/enterpriseaigroup/tech-docs)

**Description:** Spec-driven development system for AI assistants. Provides 29+ MCP tools that enable Claude Code, GitHub Copilot, OpenAI Codex, and Gemini CLI to autonomously implement features from specifications with UI-first app delivery workflow support and EnterpriseAI platform integration.

## Purpose

Gofer is a VSCode extension that bridges human specifications with AI implementation through a dual-protocol architecture (LSP + MCP). It provides:

1. **Model Context Protocol (MCP) Tools** - 29+ tools that AI assistants call directly to read specs, execute tasks, validate code, and manage context
2. **Specification Framework** - Structured `.specify/` directory format for feature specs, plans, and tasks
3. **Multi-Platform CLI Support** - Commands for Claude Code, GitHub Copilot Chat, OpenAI Codex, and Gemini CLI (24 commands)
4. **Autonomous Execution** - Optional orchestrator that drives Claude Code through full implementation cycles with Haiku-based decision making
5. **Adaptive Context Compaction (ACC)** - 5-stage progressive context management (70%, 80%, 85%, 90%, 99% thresholds)
6. **Constitution-Based Validation** - Enforces project principles and coding standards through ScopeGuard
7. **Visual Artifacts** - 10 persona-pack templates (Impact Canvas, C4, ERD, Risk Heatmap) with 7 specialized visual writer agents
8. **Cost Budget Enforcement** - Tracks token usage and enforces cost limits per pipeline run ($10 default)
9. **Scope Guard** - Prevents AI from accessing protected files defined in specs (advisory/warning/blocking modes)
10. **Memory Management** - MemGPT-inspired three-layer memory system with automatic compaction and TF-IDF retrieval

## Tech Stack

| Component            | Technology                 | Version       |
| -------------------- | -------------------------- | ------------- |
| Language             | TypeScript                 | 5.9.3         |
| Runtime              | Node.js                    | 20.x          |
| Framework            | VSCode Extension API       | 1.93.0+       |
| Build Tool           | Webpack                    | 5.105.4       |
| Testing              | Vitest + Playwright        | 3.2.4 / 1.58.2|
| AI SDK               | Anthropic SDK              | 0.67.1 (ext)  |
| Language Server      | vscode-languageserver      | 9.0.1         |
| Dependency Injection | tsyringe                   | 4.10.0        |
| Terminal Emulation   | node-pty-prebuilt-multiarch| 0.10.1-pre.5  |
| Schema Validation    | Zod                        | 3.25.76       |
| File Watching        | chokidar                   | 3.6.0/4.0.3   |

## Key Entry Points

### Extension Entry Point

**File:** `extension/src/extension.ts`

- Activates on startup (`onStartupFinished`)
- Line 171: `activate()` initializes DI container via tsyringe
- Line 204-216: `setupLSP()` starts Language Server (non-blocking)
- Line 218: `registerTreeViews()` creates Progress, AI Usage, Memory panels
- Line 272-284: `initializeForWorkspace()` deferred initialization
- Registers 67 commands, 3 views, 2 status bars
- **Extension file count:** 247 TypeScript files (across all modules)

### Language Server Entry Point

**File:** `language-server/src/server.ts`

- Dual-protocol server (LSP + MCP)
- Line 129-537: `connection.onInitialize()` registers 29 MCP tools
- Line 719-875: `connection.onRequest('tools/call')` handles MCP tool invocations
- Implements custom LSP methods for spec/task management
- Exposes tools to Claude Code, GitHub Copilot via VSCode MCP bridge
- **Server file count:** 10+ TypeScript files

### Orchestrator Entry Point

**File:** `src/orchestrator/AutonomousOrchestrator_new.ts`

- Optional autonomous execution mode (CLI-based, deprecated)
- Coordinates Claude Code terminal sessions
- Manages task queue and dependencies
- IPC status signaling via `.specify/ipc/status.json`
- WhatsApp notifications via Twilio (optional)
- **Note:** Extension-based ACC orchestration preferred (see `extension/src/autonomous/ACCOrchestrator.ts`)

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
npm run test:e2e            # End-to-end tests (VSCode Test CLI)
npm run test:e2e:playwright # Playwright browser tests
npm run test:coverage       # Coverage report
```

### 5. Build VSIX Package

```bash
cd extension
npm run package
npx vsce package
```

### 6. Generate Commands

```bash
npm run gofer:generate      # Generate CLI command surfaces
npm run gofer:mermaid-export # Export Mermaid diagrams (optional)
npm run gofer:codex-doctor  # Diagnostic tool
```

## Team/Ownership

**Owner:** Enterprise AI Pty Ltd  
**Contact:** [https://enterpriseai.com.au](https://enterpriseai.com.au)

**Key Maintainer Information:**

- Based on CLAUDE.md, the project follows a structured workflow with autonomous bug fixing and self-improvement loops
- Uses Gofer's own pipeline for development (`/0_business_scenario` → research → specify → plan → tasks → implement → validate)
- Specifications stored in `.specify/specs/` directory
- Constitution principles defined in `.specify/memory/constitution.md`

**Recent Specifications (2026-05):**

- **032-gofer-ui-first-builder** - UI-first app delivery workflow (Completed, v3.2.2)
- **031-skills-pipeline-augmentation** - Enhanced agent coordination (Completed, v3.2.0)
- **027-public-builder-runtime** - Public platform builder boundary clarification (Completed, v3.3.1)

## Project Structure

```
gofer/
├── extension/           # VSCode extension (UI, commands, views)
│   ├── src/             # TypeScript source (247 files)
│   │   ├── autonomous/  # ACC, context management, scope guard
│   │   ├── council/     # LLM Council, command generation
│   │   ├── services/    # DI services, config, state
│   │   └── ui/          # Tree view providers
│   ├── language-server/ # Bundled LSP server (copied during build)
│   └── package.json     # Extension manifest (67 commands, 91 settings)
├── language-server/     # LSP + MCP server (source)
│   ├── src/             # Server implementation
│   │   ├── mcp/         # MCP tool handler (29 tools)
│   │   └── utils/       # Gofer loader, spec cache
│   └── package.json
├── src/                 # Orchestrator (autonomous execution, deprecated)
│   ├── orchestrator/    # Main orchestration loop
│   └── types/           # Shared type definitions
├── .specify/            # Specifications and memory
│   ├── commands/        # Canonical command definitions (24 files)
│   ├── specs/           # Feature specifications
│   ├── memory/          # Constitution, enriched context, observations
│   ├── logs/            # JSONL logs (usage, audit, slop, ledger)
│   ├── templates/       # Document templates
│   └── scripts/         # Automation (bash, node, hooks)
├── docs/                # Documentation
├── docs-site/           # Docusaurus-based public site
├── tests/               # Test suites (unit, integration, e2e)
└── scripts/             # Build and automation scripts
```

## Quick Start for Users

1. **Install Extension**

   ```bash
   # From GitHub Releases
   gh release download --repo eai-tools/eai-gofer --pattern "*.vsix"
   code --install-extension gofer-*.vsix

   # Or from Marketplace (when published)
   code --install-extension EnterpriseAI.gofer
   ```

2. **Initialize Repository**
   - Open Command Palette: `Cmd/Ctrl+Shift+P`
   - Run: `Gofer: Initialize Repository` (or `Ctrl+Shift+Alt+I`)
   - Creates `.specify/` folder structure

3. **Configure API Keys**
   - Set `gofer.anthropicApiKey` in VSCode settings
   - Optional: `gofer.googleApiKey`, `gofer.openaiApiKey` for LLM Council
   - Admin keys for billing data: `gofer.anthropicAdminApiKey`, `gofer.openaiAdminApiKey`

4. **Create Specification**
   - Create `.specify/specs/my-feature/spec.md`
   - Add requirements and success criteria
   - Define protected boundaries if needed

5. **Let AI Implement**
   - In Claude Code: `/0_business_scenario Add user authentication`
   - In GitHub Copilot: `#0_business_scenario Add user authentication`
   - In OpenAI Codex: `$ $0_business_scenario Add user authentication`
   - In Gemini CLI: `/gofer:0_business_scenario Add user authentication`
   - Pipeline auto-chains through all stages

## Key Features

### Multi-Platform Support (v3.0+)

- **Claude Code** - Full feature support with 29 MCP tools
- **GitHub Copilot Chat** - Core features + 2026+ enhancements
- **OpenAI Codex CLI** - Full feature support via skill system
- **Gemini CLI** - Command files with namespace support
- **Auto-detection** - `gofer.defaultCLI` setting (`auto`, `claude`, `copilot`, `codex`, `gemini`)

### CLI Innovations (v3.0+)

- **Source-of-Truth Generator** - Single canonical `.specify/commands/<stage>.md` emits to 4 CLI surfaces
- **Visual Artifacts** - 10 persona-pack templates (Impact Canvas, C4, ERD, Heatmaps)
- **7 Visual Writer Agents** - Specialized agents for each diagram type
- **Namespace Aliases** - `/gofer:*` prefix for all commands
- **Mermaid Export** - `npm run gofer:mermaid-export` (optional)
- **24 Pipeline Commands** - Numbered stages + helper commands + control commands

### Adaptive Context Compaction (ACC) v3.2+

5-stage progressive context management:
1. **70% utilization** - Delegation advisory
2. **80%** - Observation masking (5-turn threshold)
3. **85%** - Fast pruning (budget cap in truncate mode)
4. **90%** - Aggressive masking (force all observations masked)
5. **99%** - Full compaction

### Core Features

- **Branch-Aware Specs** - Detects Git branch and shows relevant specs
- **Auto-Updates** - Checks for extension updates automatically
- **Progress Tracking** - Real-time status in Gofer sidebar with Harvey ball icons (◔ ◑ ◕ ●)
- **Task Dependencies** - Executes tasks in dependency order via graphlib
- **Context Health** - Monitors AI context window usage (status bar with color-coded indicators)
- **Memory Management** - TF-IDF keyword retrieval, continuous compaction, JSONL-based storage
- **Scope Guard** - Prevents AI from accessing protected files (advisory/warning/blocking modes)
- **Cost Budget** - Tracks and enforces per-run cost limits ($10 default, configurable)
- **GitHub Codespaces** - Automatic installation in Codespaces
- **Auto-Context-Continuity (ACC)** - Automatic session save/resume at 65% context threshold
- **Slop Reduction** - Auto-removes console.log, debugger, @ts-ignore on save (opt-in)
- **Tool Audit Logging** - All file access logged to `.specify/logs/tool-audit.jsonl`
- **Research Chunking** - On-demand loading with memory-first strategy (30% coverage threshold)

### Recent Additions (v3.0-3.3)

- **Memory Panel Filter** - Toggle to hide system-generated memories
- **Cross-Platform Command Parity** - All 24 Gofer commands on Claude, Copilot, Codex, Gemini
- **Parallel Validation** - 6 validation agents run concurrently
- **Codex Budget Doctor** - `npm run gofer:codex-doctor` diagnostic tool
- **Plugin Manifests** - `.claude-plugin/`, `.gemini/`, `codex-config.toml` support
- **AI Usage Panel** - Real-time token usage and cost tracking via provider billing APIs
- **Resource Diagnostics** - Lightweight performance snapshots (5min intervals, opt-in)
- **Context REPL** - MCP tools for progressive context management (peek/grep/fold/expand/undo)
- **Skills Pipeline Augmentation** - Enhanced agent coordination (v3.2)
- **UI-First App Delivery** - Preview-approval-service-fit workflow for vertical apps (v3.2.2)
- **EAI Block Catalog Requirement** - UI generation enforced via block catalog (v3.3.1)

## Data Storage

All data is stored in the `.specify/` directory:

- **Specs:** `.specify/specs/{spec-id}/spec.md` (Markdown with YAML frontmatter)
- **Tasks:** `.specify/specs/{spec-id}/tasks.md` (Markdown checklist format)
- **Memory:** `.specify/memory/memories.jsonl` (Append-only JSONL) - DEPRECATED
- **Memory (Layered):** `.specify/memory/{core,recall,archival}/*.jsonl` (MemGPT-inspired, opt-in)
- **Enriched Context:** `.specify/memory/enriched-context.json` (60s freshness, task context)
- **Context Health:** `.specify/memory/context-health-state.json` (30s TTL)
- **Observation Cache:** `.specify/memory/observation-cache/index.json` (UUID-indexed observations)
- **Knowledge Graph:** `.specify/memory/knowledge-graph.json` (Entity relationships)
- **Logs:** `.specify/logs/` (council-usage.jsonl, tool-audit.jsonl, slop-reduction.jsonl, gofer-run-ledger.jsonl)
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
| **Claude Code CLI**       | Downstream | Primary consumer of MCP tools (29 tools)                  | Primary                     |
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
- `docs-site/` publishes `.tech-docs/` content to GitHub Pages
- Changes to `.tech-docs/` automatically trigger a documentation site rebuild
- Documentation site requires Node 24+ and uses Docusaurus 3.6.3

## Current Status

- Nightly-managed `.tech-docs/` content is present for this repository.
- Source commit: `d71d0b38af3ecb01dee9c3d3001ef1abe9dc5510`
- Version: 3.3.1 (Released 2026-05-10)
- Additional repo-local docs surfaces detected: 1 (docs-site/)
- Legacy documentation archived in `.tech-docs/legacy-src/docs/`
- Recent focus: EAI block catalog requirement enforcement, environment variable security (`.env` in `.gitignore`)
