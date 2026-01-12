# SpecGofer Development Guidelines for Claude

This file contains specific guidelines for Claude when working on the SpecGofer
project.

**IMPORTANT**: For complete linting, formatting, and code quality guidelines,
see [AGENTS.md](./AGENTS.md).

## Critical Rules

### 🚨 NEVER Manually Release - ALWAYS Use release-auto.sh

**When the user asks you to create a release, cut a release, or bump the
version:**

```bash
# For bug fixes (2.0.4 -> 2.0.5)
./release-auto.sh patch "Fixed bug with X"

# For new features (2.0.5 -> 2.1.0)
./release-auto.sh minor "Added feature Y"

# For breaking changes (2.0.5 -> 3.0.0)
./release-auto.sh major "Breaking: Changed API Z"
```

**NEVER run these commands manually:**

- ❌ `npm version major|minor|patch`
- ❌ `npx @vscode/vsce package`
- ❌ `git tag v2.x.x`
- ❌ `gh release create v2.x.x`
- ❌ Manual edits to version in package.json
- ❌ Manual edits to docs/releases.json

**Why?** The release script (`release-auto.sh`) ensures:

1. ✅ All package.json files stay in sync (root, extension, language-server)
2. ✅ CHANGELOG.md is properly updated with the release notes
3. ✅ VSIX package is built with the current code
4. ✅ VSIX is copied to docs/releases/ for GitHub Pages hosting
5. ✅ docs/releases.json is updated for extension auto-updater
6. ✅ Tests and linting pass before release
7. ✅ Git tag is created and pushed
8. ✅ GitHub release is created with the VSIX file
9. ✅ GitHub Pages deployment happens automatically

**What happens if you ignore this?**

- Users won't see the new version in the extension auto-updater
- The VSIX file won't be available for download
- The changelog won't be updated
- Version numbers will be out of sync across files
- You'll have to manually fix everything later

### Version Detection

The extension version is read from `extension/package.json` at runtime via
`config.ts`:

```typescript
// extension/src/config.ts
export const EXTENSION_VERSION = require('../../package.json').version;
```

**NEVER hardcode the version** in config.ts or anywhere else. It must always
read from package.json.

## Command Framework Overview

SpecGofer uses a **unified Gofer pipeline** that combines the best of structured
feature development with research-driven approaches. All artifacts are stored in
a single location: `.specify/specs/{feature}/`.

### The Unified Gofer Pipeline

The recommended workflow is to run `/0_business_scenario` once and let it
automatically chain through all stages:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED GOFER PIPELINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. /1_gofer_research    → research.md                          │
│     Deep codebase exploration + technology research              │
│                         ↓ AUTO                                   │
│  2. /2_gofer_specify     → spec.md                              │
│     Feature specification informed by research                   │
│                         ↓ AUTO                                   │
│  3. /3_gofer_plan        → plan.md, data-model.md, contracts/   │
│     Technical architecture and design                            │
│                         ↓ AUTO                                   │
│  4. /4_gofer_tasks       → tasks.md, issues.md                  │
│     Dependency-ordered task breakdown                            │
│                         ↓ AUTO                                   │
│  5. /5_gofer_implement   → [source code]                        │
│     Execute tasks phase by phase                                 │
│                         ↓ AUTO                                   │
│  6. /6_gofer_validate    → validation-report.md                 │
│     Verify implementation matches plan and spec                  │
│                                                                  │
│  All artifacts go to: .specify/specs/{feature}/                 │
└─────────────────────────────────────────────────────────────────┘
```

### Master Orchestrator

The `/0_business_scenario` command is the **unified entry point**:

1. **Triages** what the user wants to accomplish
2. **Determines** where to start in the pipeline
3. **Automatically chains** through ALL commands until complete

**The user only needs to run `/0_business_scenario` once** - the orchestrator
handles everything else automatically.

| User Intent              | Starting Point    | Auto-Chain Sequence                                      |
| ------------------------ | ----------------- | -------------------------------------------------------- |
| New feature from scratch | /1_gofer_research | research → specify → plan → tasks → implement → validate |
| Modify existing code     | /1_gofer_research | research → specify → plan → tasks → implement → validate |
| Fix a bug                | /1_gofer_research | research → specify → plan → tasks → implement → validate |
| Explore codebase only    | /1_gofer_research | research → (ask to continue)                             |
| Resume previous work     | Detect & Continue | Resume from most advanced artifact                       |

### Resume Logic

When resuming, the orchestrator detects the most advanced artifact and resumes:

| Has This                | Start At           |
| ----------------------- | ------------------ |
| tasks.md (unchecked)    | /5_gofer_implement |
| plan.md, no tasks.md    | /4_gofer_tasks     |
| spec.md, no plan.md     | /3_gofer_plan      |
| research.md, no spec.md | /2_gofer_specify   |
| Nothing                 | /1_gofer_research  |

### Parallel Agents

Located in `.claude/agents/`, these specialized agents run concurrently during
research:

| Agent                     | Role                     | Tools                |
| ------------------------- | ------------------------ | -------------------- |
| `codebase-locator`        | Finds WHERE code lives   | Grep, Glob, LS       |
| `codebase-analyzer`       | Explains HOW code works  | Read, Grep, Glob, LS |
| `codebase-pattern-finder` | Shows EXAMPLES to follow | Grep, Glob, Read, LS |

---

## Archived Legacy Commands

The following legacy commands have been archived and are no longer in active
use. They are preserved for reference at `.claude/commands/archive/`.

### Archived SpecKit Commands (`.claude/commands/archive/speckit/`)

- `speckit.specify.md` - Create feature specification
- `speckit.plan.md` - Generate implementation plan
- `speckit.tasks.md` - Generate task breakdown
- `speckit.implement.md` - Execute tasks
- `speckit.analyze.md` - Cross-artifact analysis
- `speckit.checklist.md` - Generate custom checklist
- `speckit.constitution.md` - Create/update constitution
- `speckit.clarify.md` - Ask clarification questions
- `speckit.hydrate.md` - Reverse-engineer spec from code

### Archived RPI Commands (`.claude/commands/archive/rpi/`)

- `1_research_codebase.md` - Deep codebase exploration
- `2_create_plan.md` - Create implementation plan
- `3_validate_plan.md` - Verify implementation
- `4_implement_plan.md` - Execute plan
- `5_save_progress.md` - Save work session
- `6_resume_work.md` - Resume from checkpoint
- `7_research_cloud.md` - Cloud infrastructure analysis
- `8_define_test_cases.md` - Design acceptance tests

**Note:** Use the unified Gofer pipeline (`/0_business_scenario` through
`/6_gofer_validate`) for all new work. The archived commands are kept for
reference only.

---

## Claude Code Terminal Integration

When SpecGofer launches Claude Code via the Play button:

1. **Detects current spec state** - checks which artifacts exist:
   - spec.md only → needs research and planning
   - spec.md + plan.md → needs tasks
   - spec.md + plan.md + tasks.md → ready for implementation

2. **Sends appropriate Gofer command**:
   - If tasks.md exists → `/5_gofer_implement`
   - If plan.md exists but no tasks.md → `/4_gofer_tasks`
   - If only spec.md exists → `/3_gofer_plan`

### Task Format

Tasks are tracked in `tasks.md` with checkboxes:

```markdown
- [ ] T001 [Setup] Create initial project structure
- [x] T002 [Setup] Configure dependencies (completed)
- [ ] T003 [P] [US1] Implement user authentication
```

- `- [ ]` = pending, `- [X]` = completed
- Each task has a unique ID (T001, T002...)
- `[P]` marks parallel tasks that can run concurrently
- `[US1]`, `[US2]` tags link to user stories

---

## LLM Council Integration

SpecGofer supports an optional LLM Council mode that enables multi-provider
parallel execution for research and analysis workflows. When enabled, queries
are dispatched to all configured LLM providers simultaneously, and a "Chairman"
LLM synthesizes the diverse perspectives.

### Configuration

#### Provider API Keys

Configure API keys in VSCode Settings (Settings > SpecGofer):

- `specGofer.anthropicApiKey` - Anthropic (Claude) API key
- `specGofer.googleApiKey` - Google (Gemini) API key
- `specGofer.xaiApiKey` - xAI (Grok) API key
- `specGofer.openaiApiKey` - OpenAI API key

#### Council Configuration File

Create `.specify/memory/council-config.yaml` to control council behavior:

```yaml
# Enable/disable council mode globally
enabled: true

# Minimum providers required (quorum)
quorum: 2

# Timeout per request in milliseconds
timeout: 30000

# Enable optional peer review stage
peerReview: false

# Stages where council mode is active
stages:
  gofer_research: true # /1_gofer_research
  gofer_plan: true # /3_gofer_plan
  gofer_validate: true # /6_gofer_validate

# Provider configuration
providers:
  - providerId: anthropic
    enabled: true
    weight: 1.0
  - providerId: google
    enabled: true
    weight: 1.0
  - providerId: xai
    enabled: true
    weight: 1.0
  - providerId: openai
    enabled: true
    weight: 1.0
```

### Council Commands

- **`specGofer.showCouncilStatus`** - Display provider availability and usage
  summary
  - Shows which providers are configured and healthy
  - Displays historical usage metrics and costs

### Council Workflow Stages

Council mode can be enabled for these workflow stages:

| Stage               | Command              | Council Benefits                          |
| ------------------- | -------------------- | ----------------------------------------- |
| `gofer_research`    | `/1_gofer_research`  | Comprehensive codebase exploration        |
| `gofer_plan`        | `/3_gofer_plan`      | Multiple perspectives on architecture     |
| `gofer_validate`    | `/6_gofer_validate`  | Multi-reviewer validation                 |

### How Council Mode Works

1. **Dispatch**: Query sent to all enabled providers in parallel
2. **Collect**: Responses gathered with timeout handling (quorum required)
3. **Anonymize**: Responses labeled as Member A, B, C, D
4. **Peer Review** (optional): Each provider reviews others' responses
5. **Synthesize**: Chairman LLM combines insights into unified output
6. **Log**: Usage metrics written to `.specify/logs/council-usage.jsonl`

### Cost Visibility

Council mode increases token usage proportionally to the number of providers.
Usage is logged to `.specify/logs/council-usage.jsonl` with:

- Per-session token counts and estimated costs
- Provider breakdown
- Stage breakdown
- Duration metrics

View usage summary via Command Palette > "SpecGofer: Show Council Status".

### Key Files

- `extension/src/council/` - Council module source code
- `.specify/memory/council-config.yaml` - Per-project configuration
- `.specify/logs/council-usage.jsonl` - Usage log (JSONL format)
- `.specify/templates/council-config.yaml` - Default configuration template

## Project Structure

This is a monorepo with three main packages plus AI workflow infrastructure:

```text
specgofer/
├── extension/              # VSCode extension
│   ├── src/               # Extension source code
│   ├── package.json       # Extension manifest (version here!)
│   └── CHANGELOG.md       # User-facing changelog
├── language-server/       # Language Server Protocol implementation
│   ├── src/
│   └── package.json       # LSP server package
├── docs/                  # GitHub Pages content
│   ├── releases/          # VSIX files for distribution
│   └── releases.json      # Auto-updater version info
├── .claude/               # Claude Code configuration
│   ├── agents/            # Parallel AI agents (locator, analyzer, pattern-finder)
│   └── commands/          # Gofer pipeline commands (0_business_scenario - 6_gofer_validate)
│       └── archive/       # Archived legacy commands (speckit/, rpi/)
├── .specify/              # SpecKit feature development
│   ├── specs/             # Feature specifications
│   ├── templates/         # Document templates
│   ├── scripts/           # Automation scripts
│   └── memory/            # Constitution and decisions
├── thoughts/              # RPI persistent context storage
│   └── shared/
│       ├── research/      # Codebase research documents
│       ├── plans/         # Implementation plans
│       ├── sessions/      # Work session checkpoints
│       └── cloud/         # Cloud infrastructure analysis
├── tests/                 # Test suite
│   ├── unit/              # Unit tests (80%+ coverage target)
│   ├── integration/       # Integration tests
│   ├── e2e/               # End-to-end tests
│   └── README.md          # Testing philosophy guide
├── package.json           # Root package (keep in sync)
├── AGENTS.md              # Complete AI agent guidelines
├── CLAUDE.md              # This file - Claude Code instructions
└── release-auto.sh        # Release automation script
```

## Technologies

- **Language**: TypeScript
- **Framework**: VSCode Extension API
- **Language Server**: vscode-languageclient/vscode-languageserver
- **Testing**: Vitest for unit tests, Playwright for E2E
- **Build**: Webpack for bundling
- **Packaging**: @vscode/vsce for VSIX creation

## Common Tasks

### Development

```bash
# Install dependencies
npm install

# Compile extension
cd extension && npm run compile

# Run in watch mode
cd extension && npm run watch

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### Release Process (CRITICAL)

**Only use the release automation script:**

```bash
# Patch release (bug fixes)
./release-auto.sh patch "Optional commit message"

# Minor release (new features)
./release-auto.sh minor "Optional commit message"

# Major release (breaking changes)
./release-auto.sh major "Optional commit message"
```

The script will:

1. Ask for confirmation
2. Bump versions in all package.json files
3. Update CHANGELOG.md
4. Build and package the extension
5. Run tests and linting
6. Copy VSIX to docs/releases/
7. Update docs/releases.json
8. Commit, tag, and push
9. Create GitHub release
10. Trigger GitHub Pages deployment

### Upgrading the Extension

Users can upgrade via:

1. **Auto-update check**: Extension checks GitHub Pages `releases.json` every 24
   hours
2. **Manual check**: Command Palette → "SpecGofer: Check for Updates"
3. **Manual install**: Download VSIX from GitHub releases or GitHub Pages

The auto-updater reads from:
`https://eai-tools.github.io/specgofer/releases.json`

## Code Style Guidelines

**See [AGENTS.md](./AGENTS.md) for complete guidelines**. Key points:

- Use explicit return types for all functions
- Avoid `any` type (use `unknown` or proper types)
- Use ES6 imports, never `require()`
- Follow conventional commit messages
- All markdown must pass markdownlint
- All TypeScript must pass ESLint
- Format with Prettier before committing

## Testing

- Unit tests: `tests/unit/**/*.test.ts`
- Integration tests: `tests/integration/**/*.test.ts`
- E2E tests: `tests/e2e/**/*.spec.ts`

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- path/to/test.test.ts
```

## SpecGofer-Specific Conventions

### Path Conventions

SpecGofer uses `.specify/specs/` instead of SpecKit's default `specs/` location:

- Specs: `.specify/specs/`
- Templates: `.specify/templates/`
- Scripts: `.specify/scripts/`
- Constitution: `.specify/memory/constitution.md`

### Upgrade Process

The `specKitMigrator.ts` handles upgrades:

- `fixSpecPathReferences()`: Updates path references from `specs/` to
  `.specify/specs/`
- `fixExistingSpecs()`: Adds YAML frontmatter and checkbox tasks
- `installSpecKitCLI()`: Installs CLI tools and templates

### Commands vs Scripts

- Claude commands: Stay in `.claude/commands/` (SpecGofer convention)
- Bash scripts: In `.specify/scripts/bash/`
- During upgrade: Fix path references in content, don't move files

## Recent Changes

- 009-llm-council-integration: Added TypeScript 5.7.2, Node.js 20.x LTS +
  `@anthropic-ai/sdk` (existing), `@google/generative-ai`, `openai` (for xAI and
  OpenAI)

- 006-testing-coverage-expansion: Added TypeScript 5.7.2, Node.js 20.x LTS

- 001-claude-terminal-integration: Added TypeScript 5.3+, Node.js 20.x LTS

  TypeScript, @vscode/test-electron, VSCode Extension API

  codebase)

### v2.0.4 (Latest)

### v2.0.3

### v2.0.2

## Important Files to Know

- `extension/src/config.ts`: Extension configuration and version
- `extension/src/specKitMigrator.ts`: Handles upgrades and migrations
- `extension/src/autoUpdater.ts`: Auto-update checking logic
- `extension/src/progressProvider.ts`: Tree view provider for specs
- `docs/releases.json`: Version info for auto-updater
- `release-auto.sh`: Release automation script (USE THIS!)

## When in Doubt

1. Check [AGENTS.md](./AGENTS.md) for code quality guidelines
2. Use `./release-auto.sh` for all releases
3. Run `npm run lint` before committing
4. Ask the user if you're unsure about approach

---

**Remember**: The release automation script is there to prevent mistakes. Always
use it for releases, no exceptions!

## Active Technologies

- TypeScript 5.7.2, Node.js 20.x LTS + `@anthropic-ai/sdk` (existing),
  `@google/generative-ai`, `openai` (for xAI and OpenAI)
  (009-llm-council-integration)
- File-based (`.specify/memory/council-config.yaml`,
  `.specify/logs/council-usage.jsonl`) (009-llm-council-integration)

- TypeScript 5.7.2, Node.js 20.x LTS (006-testing-coverage-expansion)
- File-based (specs in `.specify/specs/`, constitution in `.specify/memory/`,
  test fixtures in temporary directories) (006-testing-coverage-expansion)

- File-based (.specify/memory/ for decisions, local buffer for terminal output)
  (001-claude-terminal-integration)

- TypeScript 5.3+, Node.js 20.x LTS + Dagger SDK for TypeScript,
  @vscode/test-electron, VSCode Extension API (006-test-feature)
- File-based test data versioning in `.specify/test-data/`, Dagger cache for
  artifacts (006-test-feature)

- TypeScript 5.3+ (existing SpecGofer codebase) (001-memory-learning-system)
