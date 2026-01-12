# SpecGofer - Spec-Driven Development for AI

**Enterprise AI Pty Ltd**

Let AI assistants (Claude Code, GitHub Copilot) autonomously implement features
from specifications using VSCode's native MCP (Model Context Protocol) support.

## Quick Start

### 1. Install Extension

```bash
# From GitHub Releases
gh release download --repo eai-tools/specgofer --pattern "*.vsix"
code --install-extension specgofer-*.vsix
```

### 2. Initialize Your Project

1. Open Command Palette (`Cmd/Ctrl+Shift+P`)
2. Run: **"SpecGofer: Initialize Repository"**

This creates `.specify/` folder with GitHub Spec Kit format.

### 3. Create a Specification

Create `.specify/specs/my-feature/spec.md`:

```markdown
---
feature: my-feature
status: draft
created: 2025-10-21
---

# My Feature

Description of what to build

## Functional Requirements

1. **FR-001**: First requirement
2. **FR-002**: Second requirement

## Success Criteria

- Acceptance criteria 1
- Acceptance criteria 2
```

### 4. Let AI Implement It

**Recommended: Use the Unified Gofer Pipeline**

In Claude Code, run a single command that auto-chains through all stages:

```text
/0_business_scenario Add user authentication with OAuth2 and JWT
```

This automatically:

1. **Research** → Explores codebase and technology patterns
2. **Specify** → Creates spec.md from requirements
3. **Plan** → Generates architecture and design
4. **Tasks** → Breaks down into executable tasks
5. **Implement** → Executes tasks phase by phase
6. **Validate** → Verifies against spec and constitution

**Or use individual pipeline stages:**

| Stage     | Command              | Output                 |
| --------- | -------------------- | ---------------------- |
| Research  | `/1_gofer_research`  | research.md            |
| Specify   | `/2_gofer_specify`   | spec.md                |
| Plan      | `/3_gofer_plan`      | plan.md, data-model.md |
| Tasks     | `/4_gofer_tasks`     | tasks.md               |
| Implement | `/5_gofer_implement` | Source code            |
| Validate  | `/6_gofer_validate`  | validation-report.md   |

**Alternative: MCP Tools for AI Assistants**

AI can also call MCP tools directly:

1. Get next task via `specgofer_get_next_task`
2. Implement the code
3. Run tests via `specgofer_run_tests`
4. Mark complete via `specgofer_update_task_status`
5. Move to next task

## How It Works

SpecGofer provides **6 MCP tools** that AI assistants call directly:

| Tool                           | Purpose                                 |
| ------------------------------ | --------------------------------------- |
| `specgofer_get_specs`          | List all specs and tasks                |
| `specgofer_get_next_task`      | Get next task based on dependencies     |
| `specgofer_execute_task`       | Mark task in-progress, get full context |
| `specgofer_update_task_status` | Mark task completed/failed              |
| `specgofer_validate_code`      | Check against project constitution      |
| `specgofer_run_tests`          | Run Playwright tests                    |

## Spec Structure

```text
.specify/
├── specs/
│   ├── 001-feature-name/
│   │   ├── spec.md           # Feature specification
│   │   ├── research.md       # Codebase research
│   │   ├── plan.md           # Implementation plan
│   │   ├── tasks.md          # Task breakdown
│   │   └── contracts/        # API contracts
│   └── 002-another-feature/
│       └── spec.md
├── memory/
│   ├── constitution.md       # Project principles
│   └── council-config.yaml   # LLM council configuration
├── templates/                # Spec templates
├── scripts/                  # Automation scripts
└── logs/                     # Execution logs
```

## Constitution (Optional)

Define principles AI should follow in `.specify/memory/constitution.md`:

```markdown
# Project Principles

## Code Quality

- All functions must have TypeScript types
- Test coverage must exceed 80%

## Security

- Always validate user input
- Use parameterized queries
```

AI can validate code against these using `specgofer_validate_code`.

## Features

### Branch-Aware Specs

SpecGofer detects your Git branch and shows branch-specific specs automatically.

### Auto-Updates

Extension checks for updates and prompts to install automatically.

### Progress Tracking

View all specs and tasks in the SpecGofer sidebar panel with real-time status
updates.

### Task Dependencies

Tasks execute in order based on dependencies:

```markdown
## Functional Requirements

1. **FR-001**: Create database schema
2. **FR-002**: Implement user model (depends on FR-001)
3. **FR-003**: Create API endpoint (depends on FR-002)
```

## Commands

- `SpecGofer: Initialize Repository` - Create .specify structure
- `SpecGofer: Upgrade to Spec Kit Format` - Migrate from legacy JSON
- `SpecGofer: Refresh Specifications` - Reload specs from disk
- `SpecGofer: Update Now` - Check for and install updates

## Configuration

VSCode Settings (`Cmd/Ctrl+,`):

```json
{
  "specKit.autoInitialize": true,
  "specKit.preferredAI": "claude",
  "specKit.autoValidate": true
}
```

## Troubleshooting

### MCP Tools Not Available

**Check:** `.vscode/mcp.json` was created automatically

```bash
ls .vscode/mcp.json
```

If missing, run: `SpecGofer: Initialize Repository`

Then reload VSCode: `Developer: Reload Window`

### Specs Not Showing

**Check:** Spec files are in correct format

```bash
tree -L 3 .specify
```

Must have YAML frontmatter and be named `spec.md`.

### Tests Not Running

**Check:** Playwright is installed

```bash
npm list @playwright/test
```

## Example Workflow

1. **Create spec** - Write `auth-001/spec.md` with 3 requirements
2. **Ask AI** - `@specgofer implement all tasks from auth-001`
3. **AI implements autonomously:**
   - Gets FR-001 (no dependencies)
   - Implements code
   - Runs tests
   - Marks complete
   - Moves to FR-002, then FR-003
4. **Review** - All tasks green ✅, merge the PR!

## Architecture

SpecGofer consists of three main components:

### 1. VSCode Extension ([extension/](extension/))

- **Purpose**: UI and integration layer
- **Features**: Progress panel, constitution viewer, commands
- **Technologies**: TypeScript, VSCode Extension API
- **Key Files**:
  - `extension.ts` - Main entry point
  - `progressProvider.ts` - Spec tree view
  - `constitutionProvider.ts` - Constitution tree view
  - `specKitParser.ts` - Spec file parser

### 2. Language Server ([language-server/](language-server/))

- **Purpose**: LSP + MCP dual-protocol server
- **Features**: 6 MCP tools for AI integration
- **Technologies**: TypeScript, vscode-languageserver
- **Key Files**:
  - `server.ts` - LSP + MCP server implementation
  - `mcp/toolHandler.ts` - MCP tool implementations
  - `utils/specKitLoader.ts` - Spec loading and parsing

### 3. Orchestrator ([src/](src/))

- **Purpose**: Autonomous execution engine
- **Features**: Task coordination, agent management
- **Technologies**: TypeScript, Anthropic SDK, Playwright
- **Key Files**:
  - `orchestrator/Orchestrator.ts` - Main workflow coordinator
  - `agents/EngineerAgent.ts` - Code validation agent
  - `agents/TestAgent.ts` - Test execution agent
  - `utils/NotificationService.ts` - WhatsApp notifications

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VSCode                                   │
│  ┌────────────────┐                    ┌────────────────────┐   │
│  │  SpecGofer     │◄──────LSP─────────►│  Language Server   │   │
│  │  Extension     │                    │  (LSP + MCP)       │   │
│  └────────────────┘                    └────────────────────┘   │
│         │                                        ▲               │
│         │                                        │               │
│         ▼                                        │               │
│  ┌────────────────┐                             │               │
│  │  Progress UI   │                             │               │
│  │  Constitution  │                      MCP Tools:             │
│  │  Commands      │                      - get_specs            │
│  └────────────────┘                      - get_next_task        │
│                                           - execute_task         │
│                                           - update_status        │
│                                           - validate_code        │
│                                           - run_tests            │
└─────────────────────────────────────────────────────────────────┘
                                                   ▲
                                                   │
                                                   │ MCP Protocol
                                                   │
                                      ┌────────────┴─────────────┐
                                      │   Claude Code /          │
                                      │   GitHub Copilot         │
                                      └──────────────────────────┘

                          Autonomous Mode (Optional)

                    ┌──────────────────────────────┐
                    │    Orchestrator Process      │
                    │  ┌────────────────────────┐  │
                    │  │  AutonomousOrchestrator │  │
                    │  └────────────────────────┘  │
                    │           │                  │
                    │    ┌──────┴───────┐          │
                    │    │              │          │
                    │  ┌─▼────────┐  ┌──▼──────┐  │
                    │  │ Engineer │  │  Test   │  │
                    │  │  Agent   │  │  Agent  │  │
                    │  └──────────┘  └─────────┘  │
                    │           │                  │
                    │           ▼                  │
                    │  ┌─────────────────────┐    │
                    │  │ WhatsApp            │    │
                    │  │ Notifications       │    │
                    │  └─────────────────────┘    │
                    └──────────────────────────────┘
```

### Component Communication

1. **Extension ↔ Language Server**: LSP protocol over stdio
2. **AI ↔ Language Server**: MCP tools via native VSCode MCP support
3. **Language Server ↔ Filesystem**: Reads/writes `.specify/` specs
4. **Orchestrator ↔ Agents**: Direct TypeScript function calls
5. **Orchestrator ↔ External**: Anthropic API, Playwright, WhatsApp

### Testing

Run tests:

```bash
npm test                    # All tests
npm run test:coverage       # With coverage report
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:e2e            # End-to-end tests
```

## More Information

- **Full Documentation:** [docs/](docs/)
- **AI Agent Guidelines:** [AGENTS.md](AGENTS.md) - Quality standards for
  AI-generated code
- **Testing Guide:** [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)
- **Release Guide:** [docs/RELEASE_GUIDE.md](docs/RELEASE_GUIDE.md)
- **GitHub:** <https://github.com/eai-tools/specgofer>

## License

MIT © 2025 Enterprise AI Pty Ltd
