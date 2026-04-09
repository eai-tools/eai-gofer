# Gofer VSCode Extension

**EnterpriseAI-first vertical app delivery workflow inside VS Code (additive to
standard Gofer).**

Gofer turns a repository into an EnterpriseAI spec-delivery workspace so teams
can run the full pipeline end-to-end: business scenario → research →
specification → planning → tasks → implementation → validation.

It supports cross-CLI workflows with Claude, GitHub Copilot, Codex, and Gemini
while keeping all artifacts in `.specify/specs/{feature}/`. Set
`gofer.workflowProfile=enterpriseai` to prioritize EnterpriseAI guidance without
removing standard or multi-platform behavior.

## ⚡ Quick Start in VS Code

1. Open Command Palette (`Cmd/Ctrl+Shift+P`) and run **Gofer: Initialize
   Repository**.
2. Optional: run **Gofer: Install Optional Developer Tools** to install/update
   Claude/Codex/Gemini CLIs.
3. Start with `#0_business_scenario` in Copilot Chat (or `/0_business_scenario`
   in slash-command CLIs).
4. Approve `proposal-review.md`, then continue through spec → plan → tasks →
   implement → validate.

---

**© 2025 Enterprise AI Pty Ltd. All rights reserved.**

## 🚀 Features

### Core Functionality

- **Auto-Detection**: Automatically activates when `.specify/` folder is
  detected
- **Visual Progress Tracking**: Tree view panels showing specs and tasks with
  status indicators
- **Constitution Management**: Display and navigate project principles and
  guidelines
- **Language Server Integration**: Provides MCP tools for Claude Code AI
  assistance

### Smart Templates

- **GitHub Integration**: Downloads latest Gofer templates from GitHub releases
- **Repository Initialization**: One-click setup of `.specify/` structure
- **Template Updates**: Automatic checking and updating of Gofer templates

### Advanced Features

- **Legacy Migration**: Converts old JSON specs to modern GitHub Gofer format
- **Branch-Specific Specs**: Automatically reloads specs when switching Git
  branches
- **Real-time Updates**: File watching with automatic refresh of tree views
- **LLM Council Mode**: Multi-provider parallel execution for research workflows

### 🤖 Claude Code Terminal Integration (New!)

Gofer now provides autonomous Claude Code execution with intelligent question
handling:

#### Features

- **Automated Terminal Launch**: Launch Claude Code CLI directly from VSCode
  with specs as context
- **Real-time Output Monitoring**: Stream terminal output with <100ms latency
- **Intelligent Question Detection**: Automatically detect questions from Claude
  Code output
- **Auto-Response System**: Validate and auto-respond to questions using Claude
  Haiku API
- **WhatsApp Escalation**: Escalate complex questions to your phone via Twilio
  WhatsApp
- **Learning from Decisions**: Remember your responses and reuse them for
  similar questions
- **Context Window Management**: Monitor and manage Claude's 200K token context
  usage
- **Performance Monitoring**: Track output latency and ensure <100ms P99
  response times

#### Commands

- `Gofer: Start Claude Code Terminal` - Launch autonomous execution
- `Gofer: Pause Claude Code Terminal` - Send ESC signal to pause execution
- `Gofer: Stop Claude Code Terminal` - Stop current session
- `Gofer: Configure WhatsApp Integration` - Setup WhatsApp notifications
- `Gofer: Test WhatsApp Connection` - Verify Twilio configuration
- `Gofer: Clear Memory Database` - Reset learned decision patterns
- `Gofer: View Pending Escalations` - See questions waiting for response

#### Setup

1. **Install Claude Code CLI**:

   ```bash
   npm install -g @anthropic-ai/claude
   ```

2. **Configure Anthropic API Key** (required):
   - **Option 1 - VSCode Settings** (Recommended):
     1. Open Settings (Cmd+, or Ctrl+,)
     2. Search for "Gofer: Anthropic Api Key"
     3. Enter your API key from
        [Anthropic Console](https://console.anthropic.com/settings/keys)

   - **Option 2 - Environment Variable**:
     ```bash
     export ANTHROPIC_API_KEY=sk-ant-your-api-key
     ```

3. **Configure WhatsApp Integration** (optional):
   - Run `Gofer: Configure WhatsApp Integration` from Command Palette
   - Or set environment variables:
     ```bash
     export TWILIO_ACCOUNT_SID=your-account-sid
     export TWILIO_AUTH_TOKEN=your-auth-token
     export TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
     export WHATSAPP_PHONE_NUMBER=whatsapp:+1234567890
     ```

4. **Launch**: Run `Gofer: Start Claude Code Terminal` from Command Palette

#### How It Works

1. **Terminal Launch**: Gofer launches Claude Code with your spec as context
2. **Output Monitoring**: Captures all terminal output in real-time using
   node-pty
3. **Question Detection**: Pattern matching detects questions needing user input
4. **Validation**: Claude Haiku validates questions against project constitution
5. **Auto-Response**: High-confidence questions (≥80%) are answered
   automatically
6. **Escalation**: Low-confidence questions escalate to WhatsApp or VSCode
   dialog
7. **Learning**: Human responses are saved and reused for similar future
   questions

### 🔀 AI Provider Selection

Gofer works with **Claude Code CLI** and **OpenAI Codex CLI** through a unified
provider abstraction. All pipeline stages, autonomous mode, and validation
agents work identically on both providers.

#### Selecting a Provider

Open VSCode Settings (`Cmd/Ctrl+,`) and search for **`gofer.cliProvider`**:

| Value    | Description                                       |
| -------- | ------------------------------------------------- |
| `auto`   | Auto-detect: uses Claude if installed, else Codex |
| `claude` | Always use Claude Code CLI                        |
| `codex`  | Always use OpenAI Codex CLI                       |

Provider changes apply **immediately** without reloading VSCode.

#### Install Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
claude --version
export ANTHROPIC_API_KEY="sk-ant-..."
```

#### Install OpenAI Codex CLI

```bash
npm install -g @openai/codex-cli
codex --version
export OPENAI_API_KEY="sk-proj-..."
```

#### Auto-Detection

When set to `auto`, Gofer checks for `claude` first, then `codex`. The first
available CLI is used. If neither is found, a notification shows installation
instructions for both.

For full details, see the
[Multi-Provider CLI Support guide](https://github.com/your-org/gofer/blob/main/docs/multi-provider-cli-support.md).

---

### 🏛️ LLM Council Mode (New!)

Gofer supports an optional multi-LLM council pattern that enables parallel
execution across multiple AI providers for research and analysis workflows.

#### Features

- **Multi-Provider Execution**: Query Anthropic, Google, and OpenAI
  simultaneously
- **Anonymous Synthesis**: Responses labeled as Member A, B, C, D for unbiased
  evaluation
- **Chairman Synthesis**: Requesting LLM synthesizes diverse perspectives
- **Optional Peer Review**: Each LLM can review and rank other providers'
  responses
- **Per-Stage Configuration**: Enable council mode for specific workflow stages
- **Cost Visibility**: Track token usage and estimated costs per session

#### Setup

1. **Configure API Keys** in VSCode Settings (Settings > Gofer):
   - `gofer.anthropicApiKey` - Anthropic (Claude) API key (required)
   - `gofer.googleApiKey` - Google (Gemini) API key (optional)
   - `gofer.openaiApiKey` - OpenAI API key (optional)

2. **Create Council Config** at `.specify/memory/council-config.yaml`:

   ```yaml
   enabled: true
   quorum: 2
   timeout: 30000
   peerReview: false
   stages:
     gofer_plan: true
     gofer_analyze: true
     research_codebase: true
     validate_plan: true
   providers:
     - providerId: anthropic
       enabled: true
     - providerId: google
       enabled: true
     - providerId: openai
       enabled: true
   ```

3. **View Status**: Run `Gofer: Show Council Status` from Command Palette

#### How It Works

1. Query dispatched to all enabled providers in parallel
2. Responses collected with timeout handling (quorum required)
3. Responses anonymized as Member A, B, C, D
4. Optional peer review stage (if enabled)
5. Chairman LLM synthesizes unified output
6. Usage logged to `.specify/logs/council-usage.jsonl`

### 🧠 Context Continuity Management (v1.9.0+)

Gofer includes advanced context window management to prevent AI context
degradation during long implementation sessions. The system monitors context
usage in real-time and automatically preserves progress when limits are
approached.

#### Features

- **Real-Time Context Monitoring**: Track token usage across conversation, code,
  memories, and research documents
- **Auto-Save Triggering**: Automatically triggers session save at 70% context
  threshold
- **Observation Masking**: Reduces context usage by 50%+ by masking older tool
  outputs
- **Stage-Aware Memory Loading**: Loads relevant memories based on current
  workflow stage
- **Failed Approaches Registry**: Tracks and warns about previously failed
  approaches
- **Session Handoff Documents**: Preserves full context across sessions
- **VSCode Status Bar Integration**: Real-time context health indicator

#### How It Works

```text
┌─────────────────────────────────────────────────────────────┐
│ Context Window (200K tokens)                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  0-50%: ● GREEN - Healthy                                   │
│  ↓ Implementation proceeding normally                      │
│  ↓ All observations active                                 │
│                                                             │
│  50-65%: ⚠ YELLOW - Warning                                │
│  ↓ System begins masking older observations                │
│  ↓ Loading only high-priority memories                     │
│  ↓ Checkpoint recommended                                  │
│                                                             │
│  65%: 💾 AUTO-SAVE THRESHOLD (configurable)                │
│  ↓ Automatically triggers /7_gofer_save if enabled         │
│  ↓ Or shows "Save Now" notification if disabled            │
│                                                             │
│  70%+: ⛔ RED - Critical                                    │
│  ↓ Context accuracy degradation risk high                  │
│  ↓ Creates handoff document with full state                │
│  ↓ New session strongly recommended                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Context Budget Allocation

Each workflow stage has optimized context profiles:

| Stage     | Research | Memory | Code | Conversation | Obs. Window |
| --------- | -------- | ------ | ---- | ------------ | ----------- |
| Research  | 40%      | 20%    | 20%  | 20%          | 10 turns    |
| Specify   | 30%      | 30%    | 20%  | 20%          | 8 turns     |
| Plan      | 25%      | 30%    | 25%  | 20%          | 7 turns     |
| Tasks     | 20%      | 35%    | 25%  | 20%          | 6 turns     |
| Implement | 15%      | 25%    | 40%  | 20%          | 5 turns     |
| Validate  | 20%      | 20%    | 30%  | 30%          | 3 turns     |

#### Observation Masking

Older tool outputs are automatically masked to reduce context usage:

```text
Before Masking (5000 tokens):
[Full file content with 200 lines of code...]

After Masking (50 tokens):
<observation_masked id="abc123" type="file_read" tokens="1250" />
```

Masked observations can be expanded on-demand via MCP tools when needed.

#### Session Handoffs

When context reaches critical levels:

1. **Save**: `/7_gofer_save` creates comprehensive checkpoint
   - Current task progress and blockers
   - Key decisions and rationale
   - File modifications made
   - Session memories and failed approaches

2. **Resume**: `/8_gofer_resume` restores full context
   - Loads handoff document
   - Restores relevant memories
   - Re-establishes stage context
   - Continues seamlessly

#### Status Bar Indicator

The VSCode status bar shows real-time context health:

- **$(check) Healthy** - Context < 50%
- **$(warning) Warning** - Context 50-70%
- **$(error) Critical** - Context > 70%

Click the indicator to view detailed breakdown by category.

#### Commands

- `Gofer: Check Context Health` - View detailed context usage report
- `Gofer: Show Context Breakdown` - Category-by-category analysis
- `Gofer: Clear Observation Cache` - Reset masked observations

#### Configuration

Configure context management in VSCode Settings (Settings > Gofer):

- `gofer.contextWindow.autoExecuteSave` - Auto-execute /7_gofer_save at
  threshold (default: true)
  - When `true`: Automatically sends `/7_gofer_save` to Claude Code terminal
    when threshold is reached
  - When `false`: Shows notification with "Save Now" button

- `gofer.contextWindow.autoResumeAfterSave` - Auto-execute /8_gofer_resume after
  /7_gofer_save completes (default: true)
  - When `true`: Automatically sends `/8_gofer_resume` immediately after save
    completes, maintaining seamless context continuity
  - When `false`: Manual resume required after save

- `gofer.contextWindow.autoSaveThreshold` - Context utilization threshold for
  auto-save (default: 0.65)
  - Research-based optimal: 65% gives safety margin before accuracy degradation
  - Range: 0.0 to 1.0 (e.g., 0.65 = 65%)

- `gofer.contextWindow.enableObservationMasking` - Enable masking older
  observations (default: true)
  - Reduces context usage by 50%+ by replacing old tool outputs with
    placeholders

- `gofer.contextWindow.observationWindow` - Number of recent turns to keep
  unmasked (default: varies by stage)
  - Research: 10 turns, Implement: 5 turns, Validate: 3 turns

- `gofer.contextWindow.enableMemoryFirstLoading` - Load memories before research
  docs (default: true)
  - Memory-first strategy reduces redundant context loading by ~40%

### MCP Tools for AI Assistants

Gofer provides 6 Model Context Protocol (MCP) tools that AI assistants can
invoke:

- **`gofer_get_specs`** - Get all specifications and tasks
- **`gofer_get_next_task`** - Get next task based on dependencies
- **`gofer_execute_task`** - Mark task in-progress, get full context
- **`gofer_update_task_status`** - Update task completion status
- **`gofer_validate_code`** - Validate code against project constitution
- **`gofer_run_tests`** - Run Playwright tests for acceptance criteria

## 📦 Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Gofer"
4. Click "Install"

### Manual Installation

1. Download the latest `.vsix` file from
   [releases](https://github.com/eai-tools/gofer/releases)
2. Open VS Code
3. Run command: `Extensions: Install from VSIX...`
4. Select the downloaded `.vsix` file

### Development Installation

```bash
git clone https://github.com/eai-tools/gofer.git
cd gofer/extension
npm install
npm run compile
# Open VS Code and press F5 to launch Extension Development Host
```

## 🎯 Quick Start

### Initialize a New Repository

1. Open any workspace in VS Code
2. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
3. Run: `Gofer: Initialize Repository`
4. The extension will create `.specify/` structure and download latest templates

### Using with Existing Specs

1. Open a workspace containing a `.specify/` folder
2. The extension automatically activates
3. View specs in the "Gofer Progress" panel
4. View constitution in the "Constitution" panel

### Claude Code Integration

The extension automatically configures Claude Code integration:

1. Ensure you have VS Code 1.102+ with MCP support
2. The extension creates `.vscode/mcp.json` automatically
3. Claude Code can now access MCP tools for spec management

## 🤖 Autonomous Development with Gofer

**Gofer autonomously drives Claude Code terminals to implement features
end-to-end without manual intervention.**

### How It Works

Once you have a fully-specified feature (spec + plan + tasks), Gofer:

1. **Spawns Claude Code Terminal**: Creates a terminal and sends
   `/5_gofer_implement` command
2. **Monitors Continuously**: Watches Claude's output in real-time for progress,
   errors, and questions
3. **Manages Errors**: Detects failures and retries up to 3 times with
   additional context
4. **Handles Context Limits**: When Claude's conversation gets too long, spawns
   a fresh terminal with a summary
5. **Routes Questions**: If Claude needs architectural decisions, notifies you
   via WhatsApp/VSCode
6. **Runs Parallel Validation**: Optional tester agent validates code as
   engineer implements it
7. **Reports Completion**: Notifies you when feature is 100% done with tests
   passing

**You only get involved when:**

- Architecture question needs a decision (Claude presents 2-3 options)
- Unrecoverable error after 3 retry attempts
- Feature is complete and ready for review

### The Autonomous Workflow

```text
┌─────────────────────────────────────────────────────────────────────┐
│ YOU                                                                  │
│  1. Create feature spec with plan and tasks                         │
│  2. Click "▶️ Start Autonomous Implementation" in Gofer sidebar │
│  3. Go do something else                                            │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GOFER (AUTONOMOUS)                                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Autonomous Driver                                            │  │
│  │  - Spawns Claude Code terminal                              │  │
│  │  - Sends: /5_gofer_implement                                │  │
│  │  - Monitors output continuously                             │  │
│  └──────────────┬───────────────────────────────────────────────┘  │
│                 │                                                   │
│                 ↓                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Claude Code Terminal                                        │  │
│  │  ✅ Task #T001: Setup module structure (2m 15s)            │  │
│  │  ✅ Task #T002: Write JWT tests (3m 45s)                   │  │
│  │  ✅ Task #T003: Implement JWT service (8m 30s)             │  │
│  │  🤔 Architecture question detected...                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                 │                                                   │
│                 ↓                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Error Detection & Recovery                                  │  │
│  │  - Test failed? Retry with error context                    │  │
│  │  - Context full? Spawn new terminal with summary            │  │
│  │  - Question? Route to you via WhatsApp                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                 │                                                   │
│                 ↓                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Progress Tracking                                           │  │
│  │  - Updates tasks.md in real-time                            │  │
│  │  - Shows status in sidebar: 12/45 tasks (26%)              │  │
│  │  - Logs activity to Output panel                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ NOTIFICATIONS (ONLY WHEN NEEDED)                                    │
│                                                                      │
│  📱 WhatsApp Message:                                               │
│     "Claude needs your input on session storage approach:           │
│      A) Redis (distributed) B) JWT-only (stateless)                │
│      Recommend: A for enterprise apps"                              │
│                                                                      │
│  ✅ Feature Complete:                                               │
│     "001-user-authentication is done!                               │
│      23/23 tasks completed, 94% test coverage                       │
│      Ready for review."                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Decision-Making Hierarchy

Gofer instructs Claude Code to follow this decision tree:

```text
Question: "How should I implement X?"
    │
    ↓
1. Check Constitution (.specify/memory/constitution.md)
   - Explicit rule exists? → Follow it
   - No rule? → Next step
    │
    ↓
2. Check Existing Codebase
   - Similar pattern exists? → Follow it
   - No pattern? → Next step
    │
    ↓
3. Research Latest Best Practices (from web)
   - Clear answer for your tech stack? → Implement it
   - Multiple valid approaches? → Next step
    │
    ↓
4. Escalate to You
   - Gofer detects question in Claude's output
   - Extracts options and trade-offs
   - Sends WhatsApp/VSCode notification
   - Waits for your response
   - Sends answer back to Claude
   - Claude continues implementation
```

### Prerequisites

Before starting autonomous development:

- ✅ **Gofer Extension**: Installed and activated (`.specify/` folder detected)
- ✅ **Claude Code**: Integrated via MCP (`.vscode/mcp.json` auto-created)
- ✅ **Constitution**: `.specify/memory/constitution.md` exists with your
  principles
- ✅ **Feature Spec**: Complete spec in
  `.specify/specs/###-feature-name/spec.md`
- ✅ **Implementation Plan**: `plan.md` generated (use slash commands if needed)
- ✅ **Task Breakdown**: `tasks.md` with dependency-ordered tasks

### Step-by-Step: Autonomous Feature Development

#### 1. Create Your Feature Branch

```bash
git checkout -b feature/user-authentication
```

Gofer automatically detects branch-specific specs in:

```text
.specify/branches/feature/user-authentication/specs/
```

#### 2. Define Your Specification

Create or edit your spec using Gofer commands:

**Option A: From Template**

```bash
# In Claude Code or terminal
cp .specify/templates/spec-template.md .specify/specs/001-user-authentication/spec.md
```

**Option B: Use Slash Commands** (if configured)

```bash
/2_gofer_specify "Add user authentication with OAuth2 and JWT tokens"
```

Your spec should include:

- **User Scenarios**: Who needs this and why
- **Requirements**: Functional (FR-###) and Non-Functional (NFR-###)
- **Acceptance Criteria**: Testable conditions for completion
- **Dependencies**: External systems or other specs

#### 3. Generate Implementation Plan

**Option A: Manual Planning**

Create `plan.md` in your spec folder with:

- Architecture decisions
- Technology choices
- Integration points
- Test strategy

**Option B: AI-Generated Plan**

```bash
# In Claude Code
/3_gofer_plan
```

The AI will:

- Analyze your spec
- Research latest best practices for your stack
- Check your constitution for architectural patterns
- Generate a detailed technical plan
- Ask clarifying questions if needed

#### 4. Generate Task Breakdown

Create executable tasks with dependencies:

```bash
# In Claude Code
/4_gofer_tasks
```

This produces `tasks.md` with dependency-ordered tasks:

```markdown
## Tasks

- [ ] #T001 Setup authentication module structure
- [ ] #T002 Write tests for JWT token generation (deps: T001)
- [ ] #T003 Implement JWT token service (deps: T002)
- [ ] #T004 Write tests for OAuth2 integration (deps: T001)
- [ ] #T005 Implement OAuth2 provider integration (deps: T004) ...
```

#### 5. Start Autonomous Implementation

In Claude Code terminal, instruct the AI agent:

```
I have a fully specified feature branch ready. Please implement all tasks in
.specify/specs/001-user-authentication/tasks.md following these rules:

1. Use MCP tools to get tasks: gofer_get_next_task
2. Follow Test-Driven Development (tests BEFORE implementation)
3. Validate against .specify/memory/constitution.md
4. For architecture decisions:
   - First check the constitution
   - Then research latest [your-stack] best practices from the web
   - If multiple valid approaches exist, ask me to choose
5. Run real tests (unit + integration + E2E) before marking tasks complete
6. Update task status via MCP tools after each task
7. If blocked for >15 minutes, escalate to me with:
   - What you're trying to do
   - What you've tried
   - 2-3 options to proceed

Start with task #T001.
```

#### 6. Monitor Progress in Real-Time

Gofer shows live progress in the sidebar:

```text
📋 Specifications
  └── 001-user-authentication
      ├── ✅ #T001 Setup authentication module
      ├── 🔄 #T002 Write JWT tests (IN PROGRESS)
      ├── ⏸️ #T003 Implement JWT service
      └── ⏸️ #T004 Write OAuth2 tests
```

Click any task to see:

- Task description and acceptance criteria
- Dependencies and blocking tasks
- Test results and validation status
- Code changes made by the AI

#### 7. AI Decision-Making Process

The AI follows this decision tree for architecture questions:

```text
┌─────────────────────────────────────────────────────────────┐
│ Question: "How should I implement X?"                       │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
    ┌───────────────────────────────────────┐
    │ 1. Check Constitution                 │
    │    - Is there a principle covering X? │
    │    - Any explicit patterns/rules?     │
    └───────────┬───────────────────────────┘
                ↓
         YES ────→ Follow Constitution

         NO ─────→ ┌───────────────────────────────────┐
                   │ 2. Check Existing Codebase        │
                   │    - Similar implementations?     │
                   │    - Established patterns?        │
                   └────────┬──────────────────────────┘
                            ↓
                     YES ────→ Follow Existing Pattern

                     NO ─────→ ┌─────────────────────────────────────┐
                                │ 3. Research Latest Best Practices  │
                                │    - Fetch docs for [tech-stack]   │
                                │    - Check official guidelines     │
                                └────────┬────────────────────────────┘
                                         ↓
                                  CLEAR ANSWER? ───→ Implement Best Practice

                                  UNCLEAR? ─────→ ┌──────────────────────────────┐
                                                   │ 4. Ask User for Decision    │
                                                   │    - Present 2-3 options    │
                                                   │    - Explain trade-offs     │
                                                   │    - Recommend one approach │
                                                   └─────────────────────────────┘
```

#### 8. AI Escalation Protocol

The AI will pause and ask you when:

**Architecture Ambiguity**

```
I need to decide between two approaches for user session storage:

Option A: Redis for distributed sessions
  ✅ Handles horizontal scaling
  ✅ Fast in-memory performance
  ❌ Requires additional infrastructure
  ❌ More operational complexity

Option B: JWT-only (stateless)
  ✅ No server-side storage needed
  ✅ Simpler architecture
  ❌ Can't revoke tokens before expiry
  ❌ Larger token payload

Your constitution doesn't specify session strategy. Which approach
should I use? (I recommend Option A for enterprise apps)
```

**Dependency Blocker**

```
I'm blocked on task #T008 "Integrate with payment API" because:
- The payment service endpoint isn't specified in the spec
- I found `/docs/payment-api.md` but it references a staging URL
- Production URL isn't in the codebase

Can you provide:
1. Production payment API endpoint
2. API credentials (as environment variables)
3. Rate limits I should expect
```

**Test Failure Investigation**

```
Test failure on #T012 "OAuth2 callback handling":

Expected: User redirected to /dashboard after OAuth login
Actual: 404 error on /auth/callback

I've tried:
1. Verified route is registered in router.ts:89
2. Checked middleware chain - all passing
3. OAuth provider returning correct callback URL

The constitution requires 100% test coverage for auth flows.
Should I:
A) Add debugging logs and re-run
B) Check if there's a reverse proxy config issue
C) Review the OAuth provider dashboard settings with you
```

#### 9. Continuous Validation

Throughout implementation, the AI automatically:

**Constitution Compliance**

```typescript
// AI calls: gofer_validate_code
✅ Test-driven development: Tests written first
✅ TypeScript strict mode: No 'any' types used
✅ Security: Input validation present
✅ Performance: API response <500ms
⚠️  Test coverage: 78% (need 80% per constitution)
   → Writing additional edge case tests...
```

**Acceptance Criteria**

```markdown
Spec: 001-user-authentication

Acceptance Criteria: ✅ AC1: Users can log in with email/password ✅ AC2: JWT
tokens expire after 1 hour ✅ AC3: Refresh tokens last 30 days 🔄 AC4: Invalid
tokens return 401 status (testing...) ⏸️ AC5: OAuth2 login with Google (next
task)
```

**Test Execution**

```bash
# AI automatically runs after each implementation
npm run test                          # Unit tests
npm run test:integration              # Integration tests
npx playwright test auth.spec.ts      # E2E tests

# Results logged to task status
```

#### 10. Review Completed Work

When all tasks are complete, review the AI's work:

**Check Task Status Panel**

```text
📋 001-user-authentication
   ✅ All 23 tasks completed
   ✅ Test coverage: 94% (target: 80%)
   ✅ Constitution compliance: PASS
   ✅ All acceptance criteria met
```

**Run Final Validation**

```bash
# In Claude Code or terminal
npm run lint          # Code quality
npm run test          # All tests
npm run build         # Production build
```

**Review AI's Implementation Notes**

Each completed task includes:

- Code changes made (file:line references)
- Tests written and results
- Architecture decisions and rationale
- Any deviations from plan (with justification)

#### 11. Merge Feature Branch

If validation passes:

```bash
git add .
git commit -m "feat: implement user authentication (AI-generated)

Completed all tasks in spec 001-user-authentication:
- OAuth2 integration (Google, GitHub)
- JWT token service with refresh
- Session management middleware
- Rate limiting on auth endpoints
- 94% test coverage (23/23 tasks)

AI Agent: Claude Code via Gofer MCP
Constitution compliance: VERIFIED
Manual review: PASSED"

git push origin feature/user-authentication
```

Then create a PR for human review of architecture and edge cases.

### Advanced Configuration

#### Custom Constitution Rules

Add project-specific rules to `.specify/memory/constitution.md`:

```markdown
### VIII. Authentication Standards (Project-Specific)

All authentication MUST use:

- Argon2id for password hashing (not bcrypt)
- JWT with RS256 (not HS256)
- Refresh token rotation on every use
- MFA required for admin accounts
- Session duration: 1 hour (not configurable)
```

The AI will follow these rules for all auth-related tasks.

#### WhatsApp Escalation (Optional)

To enable WhatsApp notifications when AI needs decisions:

1. Set up a webhook service (e.g., Twilio, WhatsApp Business API)
2. Configure in your AI agent prompt:

```
When you need to escalate a question:
1. First, try to resolve using constitution + research (15 min limit)
2. If unresolved, POST to: https://your-webhook.com/notify
   Body: { "question": "...", "options": [...], "urgency": "medium" }
3. Wait for response before proceeding
```

#### Technology Stack Specification

Help the AI make better decisions by documenting your stack in the constitution:

```markdown
### Technology Stack

**Backend**: Node.js 20 + Express + TypeScript **Database**: PostgreSQL 15 +
Drizzle ORM **Frontend**: React 18 + Next.js 14 + TailwindCSS **Testing**:
Vitest + Playwright + Testing Library **Deployment**: Docker + AWS ECS +
CloudFront CDN

When researching best practices, always use documentation for these specific
versions.
```

#### Quality Gates

Customize test requirements in constitution:

```markdown
### Test Coverage Requirements

- Critical paths (auth, payment, data loss): 100%
- Business logic: 90%
- UI components: 80%
- Utility functions: 70%

Integration tests required for:

- All API endpoints
- All database operations
- All external service calls
```

### Troubleshooting Autonomous Development

#### AI Not Following Constitution

**Symptom**: AI implements code that violates principles

**Solution**:

```
Stop. You violated the constitution at .specify/memory/constitution.md:

Rule: "All passwords must use Argon2id hashing"
Your code: Used bcrypt in src/auth/password.ts:45

Please:
1. Re-read the constitution section on Authentication Standards
2. Fix the implementation to use Argon2id
3. Update tests to verify correct hashing algorithm
4. Re-validate with gofer_validate_code
```

#### AI Makes Wrong Architecture Choices

**Symptom**: AI picks suboptimal approach without asking

**Solution**: Make your constitution more specific:

```markdown
### IX. Data Access Patterns

When implementing database queries:

1. Use Drizzle ORM query builder (REQUIRED)
2. Never use raw SQL unless approved
3. Always use transactions for multi-table writes
4. Add database indexes for all foreign keys
5. If query complexity >3 joins, ask for review
```

#### AI Stuck in Loop

**Symptom**: AI repeatedly fails same task

**Solution**:

```
You've attempted task #T015 three times with same failure.

Per our escalation protocol, stop and explain:
1. What's failing (with exact error message)
2. What you've tried so far
3. What you think the root cause is
4. Three specific approaches you could try next

I'll choose the best path forward.
```

#### Tests Keep Failing

**Symptom**: AI writes code but tests never pass

**Solution**:

```
I notice tests failing on the last 5 tasks. Let's debug:

1. Run ONE test in isolation: npm run test:debug T015
2. Show me the full error output
3. Show me the test code
4. Show me the implementation code
5. Explain what you THINK is happening

We'll fix the root issue before proceeding with more tasks.
```

### Best Practices for Autonomous Development

1. **Start Small**: Test with 3-5 task specs before full features
2. **Constitution First**: Spend time on a detailed constitution
3. **Clear Acceptance Criteria**: Make requirements testable
4. **Monitor First Run**: Watch the first autonomous session closely
5. **Iterate on Prompts**: Refine your AI instructions based on results
6. **Trust but Verify**: Review completed work before merging
7. **Capture Patterns**: Add successful patterns to constitution
8. **Update Templates**: Improve spec templates based on AI feedback

### Example: Complete Autonomous Session

**Input** (in Claude Code terminal):

```
Feature: .specify/specs/001-user-authentication
Status: Fully specified with plan and tasks
Target: Autonomous implementation

Please implement all 23 tasks following:
- Constitution at .specify/memory/constitution.md
- TDD: tests before code
- Research latest OAuth2 best practices if needed
- Escalate architecture questions after 15min
- Target: 90%+ test coverage

Start now.
```

**AI Output** (autonomous execution):

```
Starting autonomous implementation of 001-user-authentication...

✅ Task #T001: Setup authentication module structure (2m 15s)
   - Created src/auth/ directory structure
   - Added TypeScript types for User, Token, Session
   - Tests: 12/12 passed | Coverage: 100%

✅ Task #T002: Write JWT token service tests (3m 45s)
   - TDD: Wrote 18 test cases first (all failing)
   - Covered: generation, validation, expiry, refresh
   - Tests: 0/18 passed (expected - implementation next)

✅ Task #T003: Implement JWT token service (8m 30s)
   - Used RS256 per constitution requirement
   - Added refresh token rotation
   - Tests: 18/18 passed | Coverage: 94%

🤔 Task #T004: OAuth2 provider selection (ESCALATION)

   The spec says "OAuth2 login" but doesn't specify providers.

   Your constitution doesn't mandate specific OAuth2 providers.

   Research shows most common for user auth:
   A) Google + GitHub (simplest, 90% coverage)
   B) Google + GitHub + Microsoft (enterprise-friendly)
   C) Auth0 universal (supports 30+ providers)

   Which should I implement? I recommend (A) for MVP.

   [Waiting for user response...]
```

**User Response**:

```
Option A. Add Microsoft later if needed.
```

**AI Continues**:

```
✅ Task #T004: OAuth2 provider integration (12m 20s)
   - Implemented Google OAuth2 client
   - Implemented GitHub OAuth2 client
   - Added provider factory pattern for extensibility
   - Tests: 24/24 passed | Coverage: 89%

✅ Task #T005: Write callback handler tests (4m 10s)
   - TDD: 15 test cases for OAuth callbacks
   - Covered: success, failure, state validation, CSRF
   - Tests: 0/15 passed (implementation next)

... [continues through all 23 tasks]

✅ Task #T023: End-to-end authentication flow test (15m 45s)
   - Playwright tests for complete user journeys
   - Tested: signup, login, logout, token refresh, OAuth
   - Tests: 8/8 passed | Coverage: 92%

════════════════════════════════════════════════════════════
 AUTONOMOUS IMPLEMENTATION COMPLETE
════════════════════════════════════════════════════════════

Summary:
✅ All 23 tasks completed
✅ Test coverage: 92% (target: 80%)
✅ Constitution compliance: PASS
✅ All acceptance criteria met
✅ No blockers encountered
⏱️  Total time: 2h 15m

Final validation:
✅ npm run lint - PASS
✅ npm run test - 247/247 PASS
✅ npm run build - SUCCESS
✅ git status - 43 files changed (all in src/auth/)

Ready for human review and PR creation.
```

This is the power of Gofer-driven autonomous development: fully-specified
features become production-ready code with minimal human intervention.

## 📝 Markdown Viewing Options

Gofer supports multiple ways to view and edit your specifications, constitution,
and memory documents. By default, it uses VSCode's built-in markdown preview
(read-only), but you can install WYSIWYG editors for a better editing
experience.

### Available Viewers

#### VSCode Preview (Default - Built-in)

- No installation needed
- Read-only viewing
- Fast and lightweight

#### Mark Sharp (Recommended for WYSIWYG)

- **Install**: Search "Mark Sharp" in VSCode Extensions or install via Command
  Palette: `ext install JonathanYeung.mark-sharp`
- Fast WYSIWYG editor with live preview
- Best for quick edits while seeing rendered output
- **Note**: If the extension is not available, you may need to search for
  alternative markdown WYSIWYG editors in the marketplace

#### Markdown Editor by zaaack

- **Install**:
  [Markdown Editor Extension](https://marketplace.visualstudio.com/items?itemName=zaaack.markdown-editor)
- Feature-rich WYSIWYG with formatting toolbar
- Best for complex documents with tables and formatting

#### Markdown WYSIWYG

- **Install**:
  [Markdown WYSIWYG Extension](https://marketplace.visualstudio.com/items?itemName=adamerose.markdown-wysiwyg)
- Simple WYSIWYG toggle
- Best for basic editing with visual feedback

### How to Use

**Set Default Viewer:**

1. Open VSCode Settings (`Cmd+,` or `Ctrl+,`)
2. Search for `gofer.markdownViewer` or just `markdown viewer`
3. In the "Gofer: Markdown Viewer" dropdown, choose your preferred viewer:
   - `preview` - VSCode's built-in preview (default)
   - `mark-sharp` - Mark Sharp WYSIWYG editor
   - `markdown-editor` - Markdown Editor by zaaack
   - `markdown-wysiwyg` - Markdown WYSIWYG by adamerose

**Use Context Menu:**

Right-click any item in the Gofer sidebar (Specifications, Constitution, or
Memory) and choose:

- **Open with Preview** - VSCode's built-in preview
- **Open with Mark Sharp** - Mark Sharp WYSIWYG
- **Open with Markdown Editor** - Markdown Editor
- **Open with Markdown WYSIWYG** - Markdown WYSIWYG

This allows you to choose different viewers for different documents without
changing your default setting.

## 📋 Commands

| Command                          | Keyboard Shortcut  | Description                                 |
| -------------------------------- | ------------------ | ------------------------------------------- |
| `Gofer: Initialize Repository`   | `Ctrl+Shift+Alt+I` | Create `.specify/` structure with templates |
| `Gofer: Refresh Progress`        | `Ctrl+Shift+Alt+R` | Manually refresh spec and task views        |
| `Gofer: Upgrade to Gofer Format` | -                  | Convert legacy JSON specs to Gofer format   |
| `Gofer: Update Templates`        | -                  | Download latest Gofer templates             |
| `Gofer: Show Progress Panel`     | `Ctrl+Shift+Alt+P` | Open the progress tracking panel            |
| `Gofer: Check for Updates`       | -                  | Check for extension and template updates    |

## How It Works

## 📊 Progress Panel

The progress panel shows:

- **Specifications**: All specs in `.specify/specs/`
- **Tasks**: Nested under each spec with dependency tracking
- **Status Icons**:
  - ✅ Completed tasks
  - 🔄 In-progress tasks
  - ⏸️ Pending tasks
  - ❌ Failed tasks

Click any spec or task to open the corresponding file.

## 📜 Constitution Panel

Displays project principles from `.specify/memory/constitution.md`:

- **Articles**: Main principle categories
- **Sections**: Detailed guidelines under each article
- **Navigation**: Click to jump to specific constitution sections

## ⚙️ Configuration

Configure the extension through VS Code settings:

```json
{
  "gofer.workflowProfile": "standard",
  "gofer.markdownViewer": "preview",
  "gofer.autoRefresh": true,
  "gofer.showNotifications": true,
  "gofer.telemetryEnabled": false,
  "gofer.templateSource": "github",
  "gofer.updateCheckInterval": 86400000,
  "gofer.branchSpecificSpecs": true
}
```

### Settings Reference

| Setting                     | Default      | Description                                                                              |
| --------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `gofer.workflowProfile`     | `"standard"` | Workflow mode: `"standard"` (baseline) or `"enterpriseai"` (EnterpriseAI-first guidance) |
| `gofer.markdownViewer`      | `"preview"`  | Markdown viewer: "preview", "mark-sharp", "markdown-editor", or "markdown-wysiwyg"       |
| `gofer.autoRefresh`         | `true`       | Auto-refresh panels on file changes                                                      |
| `gofer.showNotifications`   | `true`       | Show update and status notifications                                                     |
| `gofer.telemetryEnabled`    | `false`      | Enable anonymous usage analytics                                                         |
| `gofer.templateSource`      | `"github"`   | Template source: "github" or "bundled"                                                   |
| `gofer.updateCheckInterval` | `86400000`   | Update check interval in milliseconds                                                    |
| `gofer.branchSpecificSpecs` | `true`       | Reload specs when switching branches                                                     |

## 🔧 Troubleshooting

### Common Issues

#### Extension not activating

- Ensure `.specify/` folder exists in workspace root
- Check VS Code version (requires 1.85.0+)
- Restart VS Code after installation

#### Progress panel empty

- Verify specs exist in `.specify/specs/`
- Check spec files use valid GitHub Gofer format
- Run "Gofer: Refresh Progress" command

#### Language Server not starting

- Check Output panel → "Gofer Language Server"
- Ensure Node.js 18+ is installed
- Try restarting VS Code

#### MCP tools not available in Claude Code

- Verify VS Code 1.102+ for native MCP support
- Check `.vscode/mcp.json` was created
- Restart Claude Code after installation

#### Template download fails

- Check internet connection
- Verify GitHub API rate limits
- Extension falls back to bundled templates

### Getting Help

1. **Check Logs**: View Output panel → "Gofer" channel
2. **Report Issues**: [GitHub Issues](https://github.com/eai-tools/gofer/issues)
3. **Documentation**:
   [Full Documentation](https://github.com/eai-tools/gofer/tree/main/docs)

## 🏗️ Architecture

The extension works through a dual-protocol approach:

```text
┌─────────────────────────────────────────────────────────┐
│               VSCode with MCP Support                    │
│                    (VSCode 1.102+)                       │
│                                                          │
│  ┌──────────────┐         ┌────────────────────────┐   │
│  │ Claude Code  │───MCP──→│ Gofer Extension     │   │
│  │ or Copilot   │         │ (Language Server)       │   │
│  └──────────────┘         └────────────────────────┘   │
│                                     │                   │
│                                     ↓                   │
│                           Reads/writes:                 │
│                           - .specify/specs/             │
│                           - .specify/constitution/      │
│                           - Playwright tests            │
└─────────────────────────────────────────────────────────┘

AI calls MCP tools → Implements code → Runs tests → Updates status
```

### Development

#### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

#### Architecture

- **Extension**: TypeScript VSCode extension
- **Language Server**: Dual LSP+MCP server for Claude integration
- **MCP Tools**: 6 tools for spec management automation

#### Building

```bash
cd extension
npm install
npm run compile
npm run test
npx @vscode/vsce package
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on Gofer specification format
- Inspired by spec-driven development principles
- Powered by Claude AI through MCP integration

---

**Enterprise AI Pty Ltd** - Transforming development with AI-powered
specifications.

## System Architecture

### Language Server Protocol (LSP)

Gofer runs a Language Server that:

- Parses GitHub Gofer Markdown files
- Manages spec and task state
- Exposes MCP tools via experimental capabilities
- Provides real-time updates to VSCode UI

### Model Context Protocol (MCP)

MCP tools allow AI assistants to:

- **Read** specifications and tasks
- **Execute** tasks with full context
- **Update** task status
- **Validate** code against constitution
- **Run** acceptance tests

### Branch Awareness

Gofer detects Git branch and shows branch-specific specs:

```text
.specify/
├── specs/              # Main branch specs
└── branches/
    └── feature/auth/   # Branch-specific
        └── specs/
```

## Security

- API keys managed by VSCode/AI extensions
- No credentials stored by Gofer
- MCP tools validate input for path traversal
- Constitution validation is optional

## Support

- **Documentation:** <https://github.com/eai-tools/gofer>
- **Issues:** <https://github.com/eai-tools/gofer/issues>
- **Discussions:** <https://github.com/eai-tools/gofer/discussions>

## License

MIT © 2025 Enterprise AI Pty Ltd
