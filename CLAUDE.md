# Gofer Development Guidelines for Claude

This file contains specific guidelines for Claude when working on the Gofer
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

Gofer uses a **unified Gofer pipeline** that combines the best of structured
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
│  0. /0_business_scenario → journeys/base-journey.md (optional)  │
│     Triage + Interactive journey confirmation                    │
│                         ↓ AUTO                                   │
│  1. /1_gofer_research    → research.md, journeys/variants/      │
│     Deep codebase exploration + industry variant generation      │
│                         ↓ AUTO                                   │
│  2. /2_gofer_specify     → spec.md, sequence-diagrams/          │
│     Feature spec + 5 implementation options (efficiency→innov)   │
│                         ↓ AUTO                                   │
│  3. /3_gofer_plan        → plan.md, data-model.md, contracts/   │
│     Technical architecture (uses selected option)                │
│                         ↓ AUTO                                   │
│  4. /4_gofer_tasks       → tasks.md, issues.md                  │
│     Dependency-ordered task breakdown + engineer review gate     │
│                         ↓ AUTO                                   │
│  5. /5_gofer_implement   → [source code]                        │
│     Execute tasks phase by phase                                 │
│                         ↓ AUTO                                   │
│  6. /6_gofer_validate    → validation-report.md                 │
│     10-category rubric (100pts), 6 specialist agents, brownfield│
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

### Validation Engineering Rubric

The `/6_gofer_validate` command uses a **10-category engineering quality
rubric** scored out of 100 points. Six specialist validation agents run in
parallel:

| Agent                     | Focus                                 | Blocks If           |
| ------------------------- | ------------------------------------- | ------------------- |
| `validation-correctness`  | Spec compliance, acceptance criteria  | Any criterion unmet |
| `validation-security`     | Secrets, auth bypass, vulnerabilities | Any Red finding     |
| `validation-performance`  | Sync I/O, complexity, unbounded ops   | Complexity > 12     |
| `validation-test-quality` | Placeholders, skips, mock ratio       | Mock ratio > 30%    |
| `validation-integration`  | Contracts, boundaries, dependencies   | Contract violation  |
| `validation-standards`    | Constitution, patterns, AI slop       | Pattern deviation   |

Score < 100 triggers a **brownfield restart loop** (max 3 iterations) that
generates a remediation report and re-enters the pipeline focused on failed
categories. All findings are logged to
`.specify/logs/validation-findings.jsonl`.

### Engineer Review Gate

The `/4_gofer_tasks` command includes an **engineer review gate** (Step 4.6)
that runs after traceability generation and before the approval gate. It uses
the `engineer-review` agent to cross-reference spec.md, plan.md, and tasks.md
for alignment gaps.

| Agent             | Focus                    | Blocks If                          |
| ----------------- | ------------------------ | ---------------------------------- |
| `engineer-review` | Spec/plan/task alignment | Any Red finding (missing coverage) |

If Red findings are detected, a **correction loop** (max 3 iterations) applies
fixes to tasks.md and re-validates. If issues persist after 3 iterations, an
escalation report is generated and the pipeline halts for human review.

### Journey Mapping and Sequence Diagrams

The pipeline includes optional customer journey mapping and implementation
option generation to ensure feature alignment with business value.

#### Journey Confirmation (`/0_business_scenario`)

During initial triage, the orchestrator can extract and confirm the customer
journey:

1. **Extract journey** from feature description (actors, steps, touchpoints)
2. **Confirm via AskUserQuestion** - User validates or modifies
3. **Save to** `journeys/base-journey.md` with Mermaid diagram

**Artifacts:**

- `journeys/base-journey.md` - Confirmed customer journey with actors and flow

#### Industry Variants (`/1_gofer_research`)

If a base journey exists, generates 10-50 industry variants to discover
innovations from other domains:

**Industries covered:**

- Retail, Healthcare, Finance, Education, Hospitality
- Logistics, Manufacturing, Legal, Real Estate, Entertainment

**Artifacts:**

- `journeys/variants/{industry}-{N}.md` - Industry-specific adaptations
- Innovation insights section in `research.md`

#### Sequence Diagram Options (`/2_gofer_specify`)

Generates 5 implementation options spanning the efficiency→innovation spectrum:

| Option | Name       | Efficiency | Innovation | Complexity  | Gen AI                         |
| ------ | ---------- | ---------- | ---------- | ----------- | ------------------------------ |
| 1      | Minimal    | 95%        | 10%        | Low         | None                           |
| 2      | Efficient  | 80%        | 30%        | Low-Medium  | Optional validation            |
| 3      | Standard   | 60%        | 50%        | Medium      | Suggestions, smart defaults    |
| 4      | Enhanced   | 40%        | 70%        | Medium-High | Recommendations, NLP           |
| 5      | Innovative | 20%        | 95%        | High        | Autonomous agents, multi-modal |

**User selects preferred option** via AskUserQuestion. The selected option
guides the technical architecture in `/3_gofer_plan`.

**Artifacts:**

- `sequence-diagrams/option-{N}-{name}.md` - All 5 options with Mermaid diagrams
- `sequence-diagrams/selected-option.md` - User's chosen approach

**Templates:**

- `.specify/templates/journey/base-journey.md` - Journey document template
- `.specify/templates/journey/industry-variants.yaml` - Industry definitions
- `.specify/templates/sequence-diagrams/option-spectrum.yaml` - Option
  definitions

### Auxiliary Gofer Commands

Beyond the core 6-stage pipeline, Gofer provides auxiliary commands for
specialized workflows:

| Command               | Purpose                                  | Output                   |
| --------------------- | ---------------------------------------- | ------------------------ |
| `/7_gofer_save`       | Save session state for continuity        | session-handoff.md       |
| `/8_gofer_resume`     | Resume from saved checkpoint             | Restores context         |
| `/9_gofer_tests`      | Generate comprehensive test cases        | test-plan.md, test files |
| `/10_gofer_cloud`     | READ-ONLY cloud infrastructure analysis  | cloud-analysis.md        |
| `/gofer_hydrate`      | Reverse-engineer spec from existing code | spec.md (hydrated)       |
| `/gofer_constitution` | Create/update project coding standards   | constitution.md          |

#### Session Management (`/7_gofer_save`, `/8_gofer_resume`)

These commands enable **context continuity** across sessions:

```text
Session 1: Working on feature...
  → /7_gofer_save → Captures progress, decisions, blockers
  → session-handoff.md created

Session 2: New context window
  → /8_gofer_resume → Loads handoff, restores state
  → Continues seamlessly
```

**When to use:**

- Context window approaching limits (>100k tokens)
- Ending work session and returning later
- Handing off to another agent or team member

#### Test Generation (`/9_gofer_tests`)

Generates test cases from specification artifacts:

- Reads spec.md acceptance criteria
- Creates test-plan.md with coverage matrix
- Generates test file skeletons
- Maps tests to user stories

#### Cloud Analysis (`/10_gofer_cloud`)

**READ-ONLY** cloud infrastructure inspection:

- Azure, AWS, GCP support via CLI tools
- Resource inventory and architecture mapping
- Security analysis and compliance checks
- Cost optimization recommendations

**Safety**: Only executes `list`, `show`, `describe`, `get` operations. Never
creates, modifies, or deletes cloud resources.

#### Code Hydration (`/gofer_hydrate`)

Reverse-engineers specifications from existing code:

- Analyzes implementation to create spec.md
- Maps test cases to acceptance criteria
- Documents APIs and data models
- Identifies gaps and technical debt

**Use case**: Documenting legacy code, onboarding, pre-refactoring analysis.

#### Constitution Management (`/gofer_constitution`)

Manages project coding standards:

- Defines principles, patterns, and conventions
- Creates Architecture Decision Records (ADRs)
- Ensures agent consistency across sessions
- Validates implementation compliance

---

## Context Window Management

Effective context management is critical for agentic coding. As context windows
fill with tool outputs, conversation history, and code, LLM accuracy degrades.

### Context Health Monitoring

Run `.specify/scripts/bash/check-context-health.sh` to assess context status:

```bash
# Check current context health
.specify/scripts/bash/check-context-health.sh

# Get JSON output for automation
.specify/scripts/bash/check-context-health.sh --json
```

**Thresholds**: | Status | Token Usage | Action Required | | -------- |
----------- | ----------------------------------------- | | Healthy | < 50% |
Continue normally | | Warning | 50-70% | Consider saving progress or compacting
| | Critical | > 70% | Save session and start fresh context |

### Effective Context Lengths (2025-2026 Research)

While models advertise large context windows, accuracy degrades significantly:

| Model           | Advertised | Effective (High Accuracy) |
| --------------- | ---------- | ------------------------- |
| Claude Sonnet 4 | 200k       | 60k-120k tokens           |
| Claude Opus 4   | 200k       | 100k-150k tokens          |
| Gemini 2.5 Pro  | 1M         | ~200k tokens              |
| GPT-5           | 256k       | ~200k tokens              |

**Rule of thumb**: Target 50-60% of advertised context for reliable operation.

### Context Management Techniques

#### 1. Sub-Agent Architecture (Recommended)

Use specialized sub-agents with clean context windows:

```text
Main Agent (large context)
  ├── Locator Agent (small, focused) → Returns file paths
  ├── Analyzer Agent (small, focused) → Returns summaries
  └── Pattern Agent (small, focused) → Returns examples
```

Each sub-agent returns condensed results (1,000-2,000 tokens) instead of raw
tool outputs. This is how Gofer's parallel agents work.

#### 2. Observation Masking

Gofer automatically masks older tool outputs with placeholders to reduce context
usage. The `ObservationMasker` tracks all observations (file reads, command
outputs) and replaces old ones based on the current stage's observation window.

```text
Before: [Full 5000-token file content]
After: <observation_masked id="abc123" type="file_read" tokens="1250" />
```

**How it works:**

- Tool outputs are tracked with turn numbers
- Observations older than the stage's window are automatically masked
- Masked observations can be retrieved via `gofer_expand_observation` MCP tool
- Average 50%+ context reduction from masking alone

**Stage-specific observation windows:** | Stage | Observation Window | Rationale
| | -------- | ------------------ | -------------------------------------- | |
Research | 10 turns | Larger window for exploration | | Plan | 7 turns | Medium
window for architecture work | | Implement| 5 turns | Smaller window for focused
coding | | Validate | 3 turns | Minimal window for test verification |

**Benefits**: 50%+ cost reduction, 2.6% better solve rates (per 2025 research).

#### 3. Session Handoffs

When context exceeds thresholds:

1. Run `/7_gofer_save` to capture current state
2. Start new session
3. Run `/8_gofer_resume` to restore context
4. Continue with fresh context window

**What gets preserved**:

- Current task progress and blockers
- Key decisions and rationale
- File modifications made
- Remaining work items

#### 4. Artifact-Based Memory

Store important information outside context:

| File                 | Purpose                          |
| -------------------- | -------------------------------- |
| `constitution.md`    | Coding standards (always loaded) |
| `research.md`        | Codebase findings                |
| `session-handoff.md` | Session state for continuity     |
| `decisions/*.md`     | Architecture Decision Records    |

#### 5. Stage-Aware Context Profiles

Each Gofer stage has a dedicated context profile that allocates budget across
different content types. This ensures optimal context usage for each workflow
phase.

**Profile configuration** (`.specify/memory/context-profiles.yaml`):

```yaml
implement:
  name: 'Implementation Stage'
  researchBudget: 0.15 # 15% for research/hints
  memoryBudget: 0.25 # 25% for memories
  codeBudget: 0.40 # 40% for code context
  observationWindow: 5 # Keep last 5 turns of observations
```

**Default budget allocations:** | Stage | Research | Memory | Code |
Conversation | Obs. Window | | -------- | -------- | ------ | ---- |
------------ | ----------- | | Research | 40% | 20% | 20% | 20% | 10 turns | |
Specify | 30% | 30% | 20% | 20% | 8 turns | | Plan | 25% | 30% | 25% | 20% | 7
turns | | Tasks | 20% | 35% | 25% | 20% | 6 turns | | Implement| 15% | 25% | 40%
| 20% | 5 turns | | Validate | 20% | 20% | 30% | 30% | 3 turns |

Budget warnings are emitted when a category exceeds its allocation, helping
identify context optimization opportunities.

#### 6. Memory-First Loading

The `ContextBuilder` uses a memory-first loading strategy to reduce redundant
research document loading:

1. **Load memories by priority** - Highest priority, most relevant memories
   first
2. **Calculate coverage** - Determine what task keywords are covered
3. **Lazy load research** - Only load research chunks for uncovered topics
4. **Log decisions** - Track what was loaded and why

**Configuration options:**

```typescript
{
  enableMemoryFirstLoading: true,   // Enable memory-first strategy
  memoryPriorityLimit: 10,          // Max memories to load
  minMemoryCoverage: 0.3,           // 30% coverage threshold
  enableChunkedResearch: true,      // Load research as chunks
  researchChunkLimit: 5,            // Max chunks per task
}
```

This achieves ~40% reduction in average context usage compared to loading full
research documents every time.

### Anti-Patterns to Avoid

1. **Reading entire files repeatedly** - Use targeted line ranges
2. **Keeping old tool results** - They consume context without adding value
3. **Verbose prompts** - Be concise; the agent understands context
4. **Not using sub-agents** - Monolithic context degrades faster
5. **Ignoring warning thresholds** - Context rot is gradual then sudden

### Metrics and Monitoring

Context usage is logged to `.specify/logs/context-usage.jsonl`:

```json
{
  "timestamp": "2026-01-13T10:30:00Z",
  "stage": "5_gofer_implement",
  "tokens": 85000,
  "status": "warning",
  "action": "session_save_recommended"
}
```

### Auto-Handoff Triggering

The `AutoHandoffTrigger` monitors context health and automatically initiates
session saves when context reaches critical levels:

**Trigger conditions:**

- Context utilization exceeds 70% (critical threshold)
- `ContextHealthMonitor` emits `handoff-recommended` event
- Configurable cooldown prevents repeated notifications

**Notification flow:**

1. Warning notification at 50% threshold (informational)
2. Critical notification at 70% threshold with action buttons:
   - "Save & Continue Later" - Runs `/7_gofer_save`
   - "Dismiss" - Ignores for this session
   - "Remind in 10 min" - Delays notification

**Configuration:**

```typescript
{
  enabled: true,           // Enable auto-handoff
  cooldownMs: 300000,      // 5 minute cooldown between notifications
  autoSave: false,         // Auto-save without user confirmation
}
```

### VSCode Status Bar Integration

A status bar item displays real-time context health:

- **Green $(check)** - Healthy: Context < 50%
- **Yellow $(warning)** - Warning: Context 50-70%
- **Red $(error)** - Critical: Context > 70%

Click the status bar to view detailed breakdown:

- Token usage by category (spec artifacts, memories, hints, observations)
- Current stage and profile settings
- Observation masking statistics
- Recommendations for context reduction

---

## Claude Code Terminal Integration

When Gofer launches Claude Code via the Play button:

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

Gofer supports an optional LLM Council mode that enables multi-provider parallel
execution for research and analysis workflows. When enabled, queries are
dispatched to all configured LLM providers simultaneously, and a "Chairman" LLM
synthesizes the diverse perspectives.

### Configuration

#### Provider API Keys

Configure API keys in VSCode Settings (Settings > Gofer):

- `gofer.anthropicApiKey` - Anthropic (Claude) API key
- `gofer.googleApiKey` - Google (Gemini) API key
- `gofer.xaiApiKey` - xAI (Grok) API key
- `gofer.openaiApiKey` - OpenAI API key

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

- **`gofer.showCouncilStatus`** - Display provider availability and usage
  summary
  - Shows which providers are configured and healthy
  - Displays historical usage metrics and costs

### Council Workflow Stages

Council mode can be enabled for these workflow stages:

| Stage            | Command             | Council Benefits                      |
| ---------------- | ------------------- | ------------------------------------- |
| `gofer_research` | `/1_gofer_research` | Comprehensive codebase exploration    |
| `gofer_plan`     | `/3_gofer_plan`     | Multiple perspectives on architecture |
| `gofer_validate` | `/6_gofer_validate` | Multi-reviewer validation             |

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

View usage summary via Command Palette > "Gofer: Show Council Status".

### Key Files

- `extension/src/council/` - Council module source code
- `.specify/memory/council-config.yaml` - Per-project configuration
- `.specify/logs/council-usage.jsonl` - Usage log (JSONL format)
- `.specify/templates/council-config.yaml` - Default configuration template

## Project Structure

This is a monorepo with three main packages plus AI workflow infrastructure:

```text
gofer/
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
├── .specify/              # Gofer feature development
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
2. **Manual check**: Command Palette → "Gofer: Check for Updates"
3. **Manual install**: Download VSIX from GitHub releases or GitHub Pages

The auto-updater reads from: `https://eai-tools.github.io/gofer/releases.json`

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

## Gofer-Specific Conventions

### Path Conventions

Gofer uses `.specify/specs/` instead of the default `specs/` location:

- Specs: `.specify/specs/`
- Templates: `.specify/templates/`
- Scripts: `.specify/scripts/`
- Constitution: `.specify/memory/constitution.md`

### Upgrade Process

The `goferMigrator.ts` handles upgrades:

- `fixSpecPathReferences()`: Updates path references from `specs/` to
  `.specify/specs/`
- `fixExistingSpecs()`: Adds YAML frontmatter and checkbox tasks
- `installGoferCLI()`: Installs CLI tools and templates

### Commands vs Scripts

- Claude commands: Stay in `.claude/commands/` (Gofer convention)
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
- `extension/src/goferMigrator.ts`: Handles upgrades and migrations
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

- TypeScript 5.3+ (existing Gofer codebase) (001-memory-learning-system)
