# Gofer - AI Coding Agent Instructions

**Enterprise AI Pty Ltd** - Automated Spec-Driven Development System

## Project Overview

Gofer is a **self-orchestrating development system** that uses AI agents to
implement features from specifications. You're working with a sophisticated
multi-layered architecture that eliminates manual workflows by coordinating AI
assistants (Claude Code or GitHub Copilot), Playwright testing, and autonomous
validation.

## Dual AI Support (Claude Code & GitHub Copilot)

Gofer works with **both Claude Code and GitHub Copilot** with **identical
command names**:

| Feature       | Claude Code             | GitHub Copilot                           |
| ------------- | ----------------------- | ---------------------------------------- |
| Commands      | `.claude/commands/*.md` | `.github/prompts/*.prompt.md`            |
| Agents        | `.claude/agents/*.md`   | `.github/agents/*.agent.md`              |
| Instructions  | `CLAUDE.md`             | `.github/copilot-instructions.md`        |
| Path-specific | N/A                     | `.github/instructions/*.instructions.md` |
| MCP Tools     | Via `.vscode/mcp.json`  | Via VS Code native support               |

**Available Commands** (type `/` in Claude or Copilot Chat):

### Main Pipeline

- `/0_business_scenario` - Main orchestrator (research → specify → plan →
  implement → validate)
- `/1_gofer_research` - Deep codebase and technology research
- `/2_gofer_specify` - Create feature specification from research
- `/3_gofer_plan` - Generate technical implementation plan
- `/4_gofer_tasks` - Create dependency-ordered task breakdown
- `/5_gofer_implement` - Execute tasks autonomously
- `/6_gofer_validate` - Validate implementation against spec

### Auxiliary Commands

- `/7_gofer_save` - Save session checkpoint for resumption
- `/8_gofer_resume` - Resume work from saved checkpoint
- `/9_gofer_tests` - Define acceptance tests using DSL approach
- `/10_gofer_cloud` - READ-ONLY cloud infrastructure analysis
- `/gofer_constitution` - Create/update project constitution
- `/gofer_hydrate` - Reverse-engineer spec from existing code

## Quick Start - Suggested Actions

When users ask "what can I do?" or need guidance, suggest these common
workflows:

### For New Features

```
/0_business_scenario Add user authentication with OAuth2
```

This runs the complete pipeline: research → specify → plan → implement →
validate

### For Existing Code

```
/1_gofer_research Analyze the authentication system
/2_gofer_specify Create spec for password reset feature
/3_gofer_plan Generate implementation plan
```

### For Implementation

```
/5_gofer_implement
```

Autonomously implements all tasks in dependency order with testing and
validation

### For Research & Analysis

```
/1_gofer_research How does the payment processing work?
/10_gofer_cloud Analyze our AWS infrastructure
```

### For Project Setup

```
/gofer_constitution Create project principles and standards
Gofer: Initialize Repository (Command Palette)
```

**Tip**: Most users want `/0_business_scenario` for end-to-end feature
development or `/1_gofer_research` + `/2_gofer_specify` + `/5_gofer_implement`
for step-by-step control.

## Architecture (Critical Understanding)

Gofer consists of **three main components** that work together:

### 1. **VSCode Extension** (`/extension/`)

- **Auto-detects** `.specify/` folders in any repo
- **Manages** Gofer format specifications
- **Launches** Language Server with LSP + MCP protocols
- **Auto-creates** `.vscode/mcp.json` for Claude Code integration
- **Entry point**: `extension/src/extension.ts` → activates on workspace open

### 2. **Language Server** (`/language-server/`)

- **Dual protocol**: Combines LSP (VSCode ↔ Extension) + MCP (Claude ↔ Tools)
- **Exposes 6 MCP tools** for Claude Code to orchestrate tasks
- **Loads specs** from `.specify/specs/` using Gofer format
- **Entry point**: `language-server/src/server.ts`
- **Key files**: `mcp/toolHandler.ts`, `utils/goferLoader.ts`

### 3. **Orchestrator Process** (`/src/`)

- **Coordinates** Engineer and Test agents
- **Manages** task dependencies and workflows
- **Integrates** Claude API directly via Anthropic SDK
- **Monitors** file changes (`.claude-input.txt`, `.claude-output.txt`)
- **Entry point**: `src/index.ts`

**Critical Flow**: Extension → Language Server (MCP tools) → Claude Code →
Orchestrator → Engineer/Test Agents

## Specification Format (Gofer)

All specs in `.specify/specs/###-feature-name/`:

```markdown
---
id: "001-feature"
title: "Feature Name"
status: "draft" | "in_progress" | "completed"
created: "2025-10-20"
---

# Feature Description

...

## Tasks

- [ ] #T001 Task description (deps: none)
- [ ] #T002 Another task (deps: T001)
```

**Key Pattern**: The extension uses `goferParser.ts` to extract YAML frontmatter
and parse Markdown task lists with dependencies.

## Gofer Autonomous Workflow (For Users)

When users ask "how do I use this?" or "how does this work?", guide them through
this workflow:

### Using with GitHub Copilot

Gofer works with **both Claude Code and GitHub Copilot**. The prompts are
available in `.github/prompts/` and work identically in both tools.

**In VS Code with Copilot**, type `/` followed by the prompt name:

```
/0_business_scenario Add user authentication with OAuth2
/1_gofer_research Create a REST API for blog posts
/5_gofer_implement
```

### The Complete Autonomous Workflow

```bash
# Step 1: Start with the unified pipeline (recommended)
/0_business_scenario Add user authentication with OAuth2
# OR use individual commands:

# Step 1: Create specification
/2_gofer_specify
# User provides: "Build a feature that does X"
# Output: .specify/specs/NNN-feature/spec.md

# Step 2: Generate implementation plan
/3_gofer_plan
# Output: plan.md, tasks.md with all tasks and dependencies

# Step 3: (Optional) Clarify ambiguities
# (Use conversation to clarify)

# Step 4: (Optional) Validate consistency
# (Use /6_gofer_validate)

# Step 5: AUTONOMOUS IMPLEMENTATION
/5_gofer_implement
# Gofer will autonomously:
# - Read all tasks from tasks.md
# - Implement each task in dependency order
# - Run tests after each implementation
# - Fix failures (up to 3 retries)
# - Update task status automatically
# - KEEP GOING until all tasks complete!
```

**Key Point**: Users do NOT need to prompt for each task. `/5_gofer_implement`
runs autonomously until done! Refer users to QUICKSTART.md for detailed
walkthrough.

## Developer Workflows

### Build & Run

```bash
# Build everything
npm run build                  # Root orchestrator
cd extension && npm run compile     # Extension
cd language-server && npm install   # LSP server

# Package extension
cd extension && npx @vscode/vsce package  # Creates .vsix

# Run in dev mode
code --extensionDevelopmentPath=/path/to/extension
```

### Testing

```bash
# Playwright E2E tests
npm run test                   # Uses @playwright/test

# Test specific agent
node dist/agents/TestAgent.js  # After npm run build
```

### Releasing (ALWAYS USE THIS METHOD)

```bash
# IMPORTANT: Always use release-auto.sh for all releases
./release-auto.sh patch   # For bug fixes (1.14.0 -> 1.14.1)
./release-auto.sh minor   # For new features (1.14.0 -> 1.15.0)
./release-auto.sh major   # For breaking changes (1.14.0 -> 2.0.0)

# The script automatically:
# ✅ Bumps version in all package.json files
# ✅ Updates CHANGELOG.md
# ✅ Builds VSIX package
# ✅ Runs linting and tests
# ✅ Commits and creates git tag
# ✅ Pushes to GitHub
# ✅ Deploys to GitHub Pages
# ✅ Updates releases.json for auto-updater

# NEVER manually run:
# ❌ npm version
# ❌ npx @vscode/vsce package (without release-auto.sh)
# ❌ git tag
# The release-auto.sh script handles everything!
```

### File Monitoring Pattern (Critical)

The orchestrator uses **Chokidar** to watch for file changes:

- Write to `.claude-input.txt` → Claude Code sees prompt
- Claude responds → Write to `.claude-output.txt`
- Orchestrator picks up response → Runs tests → Validates See
  `src/orchestrator/Orchestrator.ts` lines 45-57

## Project-Specific Conventions

### 1. **Agent Pattern** (Engineer + Test)

All agents extend base pattern:

```typescript
export class XAgent {
  private anthropic: Anthropic;

  async validate(task, implementation, testResult): Promise<ValidationResult> {
    // Calls Claude API with structured prompt
    // Returns: { isValid, issues[], suggestions[] }
  }
}
```

See `src/agents/EngineerAgent.ts` and `src/agents/TestAgent.ts`

### 2. **Constitution-Based Validation**

All code must validate against `.specify/memory/constitution.md`:

- **Code Quality**: TypeScript strict, no `any`, <300 lines/file
- **Testing**: 80% coverage minimum, TDD workflow
- **Security**: Never plaintext passwords, JWT expiry <1hr
- **Performance**: API <500ms p95, UI <100ms response

The engineer agent **automatically checks** against these principles.

### 3. **MCP Tool Naming Convention**

All MCP tools follow `gofer_<action>` pattern:

- `gofer_get_specs` - List all specs
- `gofer_get_next_task` - Get next available task
- `gofer_execute_task` - Start task execution
- `gofer_update_task_status` - Update status
- `gofer_validate_code` - Check against constitution
- `gofer_run_tests` - Execute Playwright tests

See `language-server/src/mcp/toolHandler.ts` for implementations.

### 4. **Task Status Flow**

```
pending → in_progress → testing → completed
                    ↓
                  failed (max 3 attempts)
```

**Critical**: Tasks only start when ALL dependencies are `completed`. See
`Orchestrator.ts` line 90-96 for dependency resolution.

### 5. **TypeScript Module System**

Uses **ES modules** (`.js` imports in TypeScript):

```typescript
import { Spec } from './types.js'; // Note: .js extension required
```

**Why**: `"type": "module"` in root package.json for Node.js ESM compatibility.

### 6. **Multi-Package Coordination**

Three separate `package.json` files:

- `/package.json` - Orchestrator dependencies
- `/extension/package.json` - VSCode extension
- `/language-server/package.json` - LSP server

**Important**: Extension bundles Language Server during packaging (see
`extension/webpack.config.js`).

## Integration Points

### Claude Code Integration

- **Method 1**: VSCode native MCP support (1.102+) → Reads tools from Language
  Server
- **Method 2**: File-based (legacy) → `.claude-input.txt` ↔
  `.claude-output.txt`
- **Config**: Auto-created `.vscode/mcp.json` by extension (`mcpConfig.ts`)

### Gofer Format Migration

Extension detects legacy JSON format and offers upgrade:

```typescript
// goferMigrator.ts pattern
const versionInfo = await migrator.getVersionInfo();
if (versionInfo.format === 'legacy-json') {
  await migrator.migrateToGofer();
}
```

### Twilio SMS Escalation

When tasks fail 3x or need human input:

```typescript
// src/utils/NotificationService.ts
await notificationService.sendSMS('Task failed, needs review');
```

## Critical Files Map

| File                                     | Purpose                                   |
| ---------------------------------------- | ----------------------------------------- |
| `extension/src/extension.ts`             | Extension activation, detects `.specify/` |
| `extension/src/lspClient.ts`             | Starts Language Server process            |
| `extension/src/mcpConfig.ts`             | Creates `.vscode/mcp.json` for Claude     |
| `language-server/src/server.ts`          | Dual LSP+MCP server                       |
| `language-server/src/mcp/toolHandler.ts` | 6 MCP tools for Claude                    |
| `src/orchestrator/Orchestrator.ts`       | Main workflow coordinator                 |
| `src/agents/EngineerAgent.ts`            | Code validation via Claude API            |
| `src/agents/TestAgent.ts`                | Playwright test runner                    |
| `.specify/memory/constitution.md`        | Non-negotiable project principles         |

## Common Patterns

### Adding a New MCP Tool

1. Add tool definition in `language-server/src/server.ts` (line 88+)
2. Implement handler in `language-server/src/mcp/toolHandler.ts`
3. Register in MCP capabilities (line 75-77)
4. Test via Claude Code or Copilot

### Creating a New Agent

1. Create `src/agents/YourAgent.ts`
2. Extend pattern: constructor with Anthropic SDK
3. Implement `validate()` or `execute()` method
4. Register in `Orchestrator.ts` constructor
5. Add to task workflow in `handleClaudeCodeResponse()`

### Adding a Specification

1. Use extension: `Gofer: Initialize Repository`
2. Create in `.specify/specs/###-name/spec.md`
3. Follow Gofer format (YAML frontmatter + Markdown)
4. Extension auto-detects and shows in progress panel

## Anti-Patterns (Avoid These)

❌ **Don't** use `any` type - Constitution mandates strict TypeScript ❌
**Don't** write code without tests - TDD is required ❌ **Don't** manually edit
`.vscode/mcp.json` - Extension auto-generates ❌ **Don't** bypass constitution
validation - Engineer agent enforces ❌ **Don't** commit `.claude-input.txt` /
`.claude-output.txt` - Temp files ❌ **Don't** hardcode paths - Use
`workspacePath` from context

## Commands Reference

```bash
# Extension commands (Cmd+Shift+P)
Gofer: Initialize Repository      # Create .specify/ structure
Gofer: Show Progress Panel        # View task status
Gofer: Upgrade to Gofer Format # Migrate legacy JSON
Gofer: Check for Updates          # Auto-update extension

# NPM scripts (root)
npm run build    # Compile TypeScript to dist/
npm run dev      # Watch mode with tsx
npm start        # Run orchestrator
npm test         # Playwright tests

# Extension scripts
cd extension
npm run compile  # Webpack bundle
npm run watch    # Development mode
npx @vscode/vsce package  # Create .vsix
```

## Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...     # Required for Claude API
TWILIO_ACCOUNT_SID=AC...         # Optional: SMS notifications
TWILIO_AUTH_TOKEN=...            # Optional
TWILIO_PHONE_NUMBER=+1...        # Optional
YOUR_PHONE_NUMBER=+1...          # Optional
SPEC_DIR=.specify                # Default
WORKSPACE_DIR=/path/to/project   # Auto-detected
```

## When You're Stuck

1. **Extension not activating?** Check for `.specify/` folder in workspace root
2. **MCP tools not showing?** Verify VSCode 1.102+, check `.vscode/mcp.json`
   exists
3. **Language Server errors?** Check Output → Gofer Language Server channel
4. **Tests failing?** Ensure Playwright installed: `npx playwright install`
5. **Build errors?** Check all three `package.json` are `npm install`'ed

## Mission Critical

This system is **self-referential** - it was built to build itself. When making
changes:

1. **Always** create a spec in `.specify/specs/`
2. **Always** write tests first (TDD)
3. **Always** validate against constitution
4. **Always** use the MCP tools to coordinate work

The goal: **You write specs, Gofer builds them autonomously.**

---

© 2025 Enterprise AI Pty Ltd. This is a drinking-our-own-champagne project.

## Active Technologies

- TypeScript 5.7.2 (VSCode Extension API) (001-vscode-extension)
- Filesystem (`.specify/` folder structure, `.vscode/mcp.json`)
  (001-vscode-extension)
- TypeScript 5.7.2 targeting Node.js 18+ (ES2022) + vscode-languageserver 9.0.1,
  @anthropic-ai/sdk 0.35.0 (002-language-server)
- File system based (.specify/specs/\*.md), no database (002-language-server)

## Recent Changes

- 001-vscode-extension: Added TypeScript 5.7.2 (VSCode Extension API)
