---
id: '028-cross-platform-command-parity'
title: 'Cross-Platform Command Parity'
status: 'draft'
created: '2026-03-18'
updated: '2026-03-19'
priority: 'medium'
assignee: 'engineer-agent'
---

# Feature Specification: Cross-Platform Command Parity

## Overview

This feature completes Feature 027 (multi-provider-cli-support) by delivering
actual command availability across all three AI platforms: Claude Code CLI,
GitHub Copilot Chat, and Codex CLI. While Feature 027 implemented backend API
switching and provider detection, it did not make Gofer's 18 commands accessible
outside Claude Code CLI. This creates a functional gap where users who switch to
Codex or Copilot lose access to the entire Gofer workflow pipeline, resulting in
vendor lock-in despite claims of multi-provider support.

Cross-Platform Command Parity closes this gap by creating platform-specific
command files (`.system/skills/` for Codex, enhanced `.github/prompts/` for
Copilot) and implementing intelligent routing so all 18 Gofer commands work
identically regardless of which AI assistant a user chooses. This includes
critical features like auto-chaining (seamless pipeline progression through 7
stages), parallel agent spawning (6 validation agents running concurrently), and
conversation history preservation when switching providers mid-session.

The business value is threefold: (1) fulfill the actual deliverable promise of
Feature 027, (2) enable genuine provider choice based on cost and performance
without capability sacrifice, and (3) support mixed-tool teams where different
developers use different AI assistants but need consistent workflows.

## User Stories

### User Story 1 - Codex CLI Full Command Access (Priority: P1)

As a **Codex CLI user**, I want to access all 18 Gofer commands through Codex's
native skill system, so that I can run the complete Gofer pipeline without
switching to Claude Code CLI.

**Why this priority**: Codex currently has ZERO Gofer support (missing
`.system/skills/` directory entirely). This is the highest-impact gap - Codex
users cannot use Gofer at all today. Delivering this unblocks an entire user
segment.

**Independent Test**: Install Gofer extension with Codex CLI configured, restart
Codex to load skills, run `$ $gofer-research` and verify command executes with
expected output structure.

**Acceptance Criteria**:

- [ ] All 18 Gofer commands accessible via `$skill-name` syntax in Codex CLI
- [ ] Commands follow Codex skill format: `.system/skills/[skill-name]/SKILL.md`
      with YAML frontmatter
- [ ] Skill metadata (name, description) appears in Codex auto-completion
- [ ] Skills load automatically on Codex CLI startup without manual installation
- [ ] Documentation includes Codex-specific invocation examples and
      troubleshooting

**Acceptance Scenarios**:

1. **Given** Codex CLI is installed and configured, **When** user runs
   `$ $0-business-scenario "build user auth"`, **Then** orchestrator command
   executes and outputs stage plan
2. **Given** Codex CLI has loaded skills, **When** user types `$ $gofer-` and
   triggers auto-complete, **Then** all 18 Gofer skills appear in suggestion
   list with descriptions
3. **Given** user adds new Gofer version with updated skills, **When** user
   restarts Codex CLI, **Then** new/updated skills are discovered and available

---

### User Story 2 - Auto-Chaining Across All Platforms (Priority: P1)

As a **mixed-tool team member**, I want the Gofer pipeline to auto-chain through
all 7 stages without manual intervention, so that I get the same seamless
workflow regardless of whether I use Claude, Copilot, or Codex.

**Why this priority**: Auto-chaining is the core UX innovation of Gofer -
turning a 7-step manual process into a single command. Without it, users revert
to manual workflows which defeats Gofer's purpose. This is critical for feature
parity.

**Independent Test**: Run `/0_business_scenario` (Claude),
`#0_business_scenario` (Copilot), or `$ $0-business-scenario` (Codex) with
identical input and verify all 7 stages execute automatically without user
prompts, producing structurally equivalent outputs.

**Acceptance Criteria**:

- [ ] `/0_business_scenario` auto-chains through research → specify → plan →
      tasks → implement → validate in Claude Code CLI (already works)
- [ ] Copilot Chat prompts include auto-chain instructions that trigger next
      stage automatically
- [ ] Codex CLI skills include auto-chain instructions that invoke next skill
      without user confirmation
- [ ] Integration tests verify auto-chaining behavior is identical across all
      three platforms
- [ ] If auto-chain fails at any stage, user receives clear error message
      indicating which stage failed and why

**Acceptance Scenarios**:

1. **Given** user runs orchestrator command in any platform, **When** research
   stage completes, **Then** specify stage starts automatically without user
   intervention
2. **Given** specify stage completes successfully, **When** output file
   `spec.md` is written, **Then** plan stage starts automatically within 5
   seconds
3. **Given** auto-chain encounters error (e.g., missing file), **When** chain
   breaks, **Then** user sees error: "Auto-chain failed at stage N: [reason]"
   with recovery instructions

---

### User Story 3 - Parallel Validation Agents (Priority: P1)

As a **quality-focused developer**, I want `/6_gofer_validate` to spawn 6
validation agents in parallel regardless of AI platform, so that validation
completes in 30 seconds instead of 90 seconds (sequential execution).

**Why this priority**: Parallel agent spawning is a major performance and
quality differentiator. Sequential validation is prohibitively slow for large
features (5+ files). This feature was explicitly called out in Feature 027
discovery as a must-have.

**Independent Test**: Run validation command in each platform and verify: (1) 6
agents spawn concurrently, (2) validation completes in under 60 seconds, (3)
validation report aggregates all 6 perspectives with rubric scores.

**Acceptance Criteria**:

- [ ] Claude Code CLI spawns 6 agents via Task tool (already works)
- [ ] Copilot Chat delegates to 6 specialized agents via native multi-agent
      system (2026+ feature)
- [ ] Codex CLI spawns 6 parallel sub-prompts or agent sessions
      (platform-specific implementation)
- [ ] All platforms produce identical `validation-report.md` structure with 6
      sections and 100-point rubric
- [ ] Performance tests verify validation completes in under 60 seconds in all
      platforms

**Acceptance Scenarios**:

1. **Given** feature with 5 TypeScript files, **When** user runs validation in
   Claude CLI, **Then** 6 agents spawn concurrently and validation completes in
   under 60 seconds
2. **Given** same feature, **When** user runs validation in Copilot Chat,
   **Then** validation completes in comparable time (<90s) using Copilot's agent
   delegation
3. **Given** validation agents running in parallel, **When** any agent
   encounters error, **Then** other agents continue and error is reported in
   final validation report

---

### User Story 4 - Conversation History Preservation (Priority: P2)

As a **cost-conscious team lead**, I want to switch AI providers mid-session
(e.g., Claude → Codex) without losing conversation context, so that I can
optimize costs by using cheaper providers for routine tasks and premium
providers for complex tasks.

**Why this priority**: Context loss when switching providers is a major pain
point in Feature 027 adoption. Users report having to re-explain requirements
when switching, which negates cost savings. This was flagged as R1 remediation
requirement in Feature 027 spec.

**Independent Test**: Start conversation in Claude CLI with 10-message context,
switch to Codex CLI, verify Codex can reference earlier messages, switch back to
Claude, verify full context preserved.

**Acceptance Criteria**:

- [ ] ProviderFactory preserves conversation history array when switching
      providers
- [ ] Switching from Claude → Codex → Claude maintains full context across all
      transitions
- [ ] History normalization converts Claude JSONL format to Codex JSON format
      transparently
- [ ] MCP context (if used in Claude session) gracefully degrades when switching
      to non-MCP provider
- [ ] Users see notification: "Switching to [provider] - conversation history
      preserved"

**Acceptance Scenarios**:

1. **Given** active Claude session with 10 messages, **When** user runs command
   to switch to Codex provider, **Then** Codex CLI receives normalized
   conversation history and can reference prior context
2. **Given** Codex session references file from Claude session, **When** user
   asks "what did I say about authentication?", **Then** Codex retrieves
   relevant message from Claude conversation history
3. **Given** user switches Claude → Codex → Claude in single session, **When**
   back in Claude, **Then** full conversation including Codex messages is
   visible

---

### User Story 5 - Default Provider Selection (Priority: P2)

As a **Copilot-preferring developer**, I want to set Copilot Chat as my default
AI platform in VSCode settings, so that all Gofer commands route to Copilot
automatically without choosing each time.

**Why this priority**: Per discovery.md, users want provider choice freedom.
Forcing users to specify provider on every command is friction. A persistent
preference improves UX and adoption.

**Independent Test**: Set `gofer.defaultCLI` to "copilot" in VSCode settings,
run any Gofer command, verify it executes in Copilot Chat without prompting for
provider selection.

**Acceptance Criteria**:

- [ ] New VSCode setting `gofer.defaultCLI` with enum: ["claude", "copilot",
      "codex", "auto"]
- [ ] Setting visible in Settings UI with dropdown, descriptions, and order
      priority
- [ ] ConfigManager getter `getDefaultCLI()` returns user preference
- [ ] CrossPlatformCommandRouter respects default setting when routing commands
- [ ] Setting takes effect immediately without VSCode reload

**Acceptance Scenarios**:

1. **Given** user opens VSCode settings, **When** user searches "gofer default",
   **Then** `gofer.defaultCLI` appears with dropdown showing four options
2. **Given** `gofer.defaultCLI` set to "codex", **When** user runs
   `/0_business_scenario`, **Then** command routes to Codex CLI automatically
3. **Given** `gofer.defaultCLI` set to "auto", **When** user runs command,
   **Then** system detects available CLI (Claude first, then Codex, then
   Copilot) and uses highest-priority available

---

### User Story 6 - Cross-Platform Feature Parity Tests (Priority: P2)

As a **Gofer maintainer**, I want integration tests that verify identical
behavior across all three platforms, so that I can confidently claim feature
parity and catch regressions before release.

**Why this priority**: Without automated tests, "feature parity" is a subjective
claim. Tests provide objective evidence and prevent regressions. Needed for
validation agent checks.

**Independent Test**: Run `npm test -- cross-platform-parity.test.ts` and verify
all tests pass, comparing outputs from Claude/Copilot/Codex for structural
equivalence.

**Acceptance Criteria**:

- [ ] Test suite `tests/integration/cross-platform-parity.test.ts` exists
- [ ] Tests verify: command availability (18/18), auto-chaining (7 stages),
      parallel agents (6 concurrent), context preservation, output structure
- [ ] Tests can run in CI/CD with mocked CLI providers (no external API calls)
- [ ] Tests compare output artifacts (research.md, spec.md,
      validation-report.md) for schema equivalence
- [ ] Test failures provide clear diff showing which platform diverged and how

**Acceptance Scenarios**:

1. **Given** test suite runs with all three providers, **When** tests execute
   command availability checks, **Then** all 18 commands callable in each
   platform
2. **Given** test runs auto-chain verification, **When** orchestrator command
   executes in each platform, **Then** all 7 stages execute in correct order
   without manual intervention
3. **Given** test runs output structure check, **When** research.md generated in
   each platform, **Then** YAML frontmatter and section headings are
   structurally identical

---

### User Story 7 - Capability Matrix Documentation (Priority: P3)

As a **new Gofer user**, I want to see a table showing which features work in
which AI platforms, so that I can make an informed decision about which CLI to
install based on my needs.

**Why this priority**: Reduces support burden by setting correct expectations
upfront. Users won't expect MCP servers in Codex or autonomous mode in Copilot
if documentation clearly states limitations.

**Independent Test**: Read README capability matrix, verify it accurately
reflects current feature support (e.g., MCP servers only in Claude, autonomous
mode only in Claude/Codex).

**Acceptance Criteria**:

- [ ] README includes "Platform Capabilities" section with comparison table
- [ ] Table columns: Feature, Claude Code CLI, Copilot Chat, Codex CLI
- [ ] Table rows: 18 Gofer commands (all ✓), MCP servers, Autonomous mode,
      Context preservation, Auto-chaining, Parallel agents
- [ ] Each cell includes status (✓ Full / ⚠ Partial / ✗ Not Available) with
      footnotes explaining limitations
- [ ] Links to platform-specific setup guides from table

**Acceptance Scenarios**:

1. **Given** user reads README, **When** user views capability matrix, **Then**
   table shows MCP servers are "✓" for Claude, "✗" for Copilot/Codex with
   footnote explaining MCP is Claude-only
2. **Given** user wants parallel agents, **When** user checks matrix, **Then**
   all three platforms show "✓ Full" for parallel agents with notes about
   implementation differences
3. **Given** user clicks platform link in matrix, **When** link navigates,
   **Then** user lands on installation guide for that specific CLI

---

### Edge Cases

- **What happens when Codex CLI is too old to support skills?** System detects
  version via `codex --version`, warns user if version < 1.0 (hypothetical
  minimum), provides upgrade instructions
- **How does system handle platform detection ambiguity?** If execution context
  unclear (e.g., running from VSCode terminal vs external terminal), falls back
  to `gofer.defaultCLI` setting
- **What if user has multiple providers installed but prefers one?**
  CrossPlatformCommandRouter respects explicit user preference over
  auto-detection when `gofer.defaultCLI` is not "auto"
- **How does history preservation work when provider doesn't support history
  API?** Adapter pattern degrades gracefully - stores history in memory only,
  warns user that history won't persist across sessions
- **What if Copilot Chat doesn't support parallel agents in older versions?**
  Command files include backward-compatible section: "For older Copilot
  versions: run agents sequentially via manual workflow"
- **How are platform-specific errors handled?** Each platform adapter includes
  error mapping: translate platform-specific errors to consistent user-facing
  messages with recovery steps

## Functional Requirements

### FR-001: Codex CLI Skill File Creation

System MUST create 18 skill files in `.system/skills/[skill-name]/SKILL.md`
format following Codex CLI conventions: YAML frontmatter with `name` and
`description`, markdown body with instructions, auto-discovery on Codex startup.

**Validation**: Run `ls .system/skills/*/SKILL.md | wc -l` and verify output
is 18. Parse each SKILL.md and verify valid YAML frontmatter with required
fields.

**Integration**: MCP Tool Handler (language-server/src/mcp/toolHandler.ts) must
search `.system/skills/` directory when detecting Codex platform.

### FR-002: Copilot Chat Prompt Enhancement

System MUST enhance existing 18 `.github/prompts/*.prompt.md` files with: (1)
auto-chain instructions for sequential stage progression, (2) parallel agent
spawning instructions using Copilot 2026 multi-agent delegation, (3)
backward-compatible notes for older Copilot versions.

**Validation**: Grep all prompt files for "AUTO-CHAIN" section and verify 7
pipeline stage files include it. Grep validation prompt for "Parallel Agent"
section.

**Integration**: GitHub Copilot Chat reads `.github/prompts/` automatically. No
code changes required, only markdown file enhancements.

### FR-003: Cross-Platform Command Router

System MUST implement `CrossPlatformCommandRouter` class that: (1) detects
current platform (Claude Code CLI vs Copilot Chat vs Codex CLI) via execution
context analysis, (2) routes skill invocations to appropriate command directory,
(3) falls back to `gofer.defaultCLI` setting if detection ambiguous.

**Validation**: Unit test router with mocked execution contexts for each
platform. Verify correct directory selected: Claude → `.claude/commands/`,
Copilot → `.github/prompts/`, Codex → `.system/skills/`.

**Integration**: Wire to AutonomousCommands
(extension/src/autonomousCommands.ts:968-1100) and MCP Tool Handler to intercept
skill invocations.

### FR-004: Auto-Chain Instruction Embedding

System MUST embed platform-specific auto-chain instructions in each pipeline
stage command file (stages 0-5): Claude Code syntax
(`Skill tool with skill="/next"`), Copilot syntax
(`type /next in next message`), Codex syntax (`run $ $next-skill`).

**Validation**: Parse all stage command files (18 total across 3 platforms) and
verify presence of "AUTO-CHAIN" section with platform-specific examples.

**Integration**: AI assistants read instructions at runtime. No code enforcement
required, but integration tests verify AI follows instructions.

### FR-005: Parallel Agent Spawn Instructions

System MUST include parallel agent spawning instructions in validation command
files for all platforms: Claude uses Task tool invocation syntax, Copilot uses
agent delegation syntax, Codex uses concurrent sub-prompt syntax.

**Validation**: Parse `/6_gofer_validate` equivalents in all three platforms and
verify "Parallel Agent" section exists with 6 agent definitions.

**Integration**: Validation agents defined in `.claude/agents/validation-*.md`
must be referenced from all three platform command files.

### FR-006: Default Provider Setting

System MUST add `gofer.defaultCLI` VSCode setting with enum values ["claude",
"copilot", "codex", "auto"], default "auto", with dropdown UI in Settings panel.

**Validation**: Open VSCode settings, search "gofer.defaultCLI", verify dropdown
appears with four options and descriptions. Change setting and verify no reload
required.

**Integration**: ConfigManager (extension/src/config.ts:125-402) must add
`getDefaultCLI()` getter that strips `gofer.` prefix per convention.

### FR-007: Provider Factory Integration

System MUST extend ProviderFactory.getCLIProvider() to check `gofer.defaultCLI`
setting before auto-detection, respecting user preference over heuristic
detection.

**Validation**: Mock ConfigManager to return "codex", call
ProviderFactory.getCLIProvider(), verify returns CodexCLIProvider without
running auto-detection.

**Integration**: ProviderFactory
(extension/src/council/providers/ProviderFactory.ts:287-309) modifies
autoDetectCLI() to check setting first.

### FR-008: Conversation History Preservation

System MUST preserve conversation history array when switching providers: call
`getConversationHistory()` from old provider, normalize format, call
`setConversationHistory()` on new provider.

**Validation**: Integration test starts Claude session with 5 messages, switches
to Codex, verifies Codex adapter receives 5-message array, switches back to
Claude, verifies full history intact.

**Integration**: Implements Feature 027 R1 remediation requirement. Adapter
pattern already exists; ensure wired correctly during provider switch.

### FR-009: MCP Server Guard Clauses

System MUST guard MCP server initialization with provider check: skip MCP setup
if `cliProvider` is "codex" or "copilot", show graceful message: "MCP servers
available in Claude Code CLI only".

**Validation**: Mock ProviderFactory to return "codex", attempt to initialize
MCP config, verify initialization skipped and warning logged.

**Integration**: Update `extension/src/mcpConfig.ts:26-34` to check provider
before MCP setup.

### FR-010: Skill Discovery Multi-Directory Search

System MUST update MCP Tool Handler to search multiple directories for skills
with priority: `.claude/commands/` > `.system/skills/` > `.github/prompts/`.
Return format based on detected platform.

**Validation**: Place skill file in `.system/skills/`, mock platform as "codex",
call skill loader, verify file found and returned in Codex format.

**Integration**: Modify language-server/src/mcp/toolHandler.ts to implement
multi-directory search with fallback logic.

### FR-011: Feature Parity Test Suite

System MUST implement `tests/integration/cross-platform-parity.test.ts` with
test categories: command availability (18/18), auto-chaining (7 stages),
parallel agents (6 concurrent), context preservation, output structure
equivalence.

**Validation**: Run `npm test -- cross-platform-parity.test.ts`, verify all
tests pass with 0 failures. Coverage report shows 100% of critical paths tested.

**Integration**: Tests mock CLI providers to avoid external API calls. Use
fixtures for expected output structures (research.md, spec.md,
validation-report.md schemas).

### FR-012: Error Message Normalization

System MUST translate platform-specific errors to consistent user-facing
messages: "Skill not found" maps to "Command '[name]' not available - ensure
[platform] CLI is installed and up-to-date", includes recovery instructions per
platform.

**Validation**: Trigger "skill not found" error in each platform adapter, verify
error message follows standard format with platform name and recovery steps.

**Integration**: Each CLI provider adapter (ClaudeCodeCLIProvider,
CodexCLIProvider) implements translateError() method with platform-specific
mapping.

### FR-013: Platform Detection Logic

System MUST detect current platform via execution context: VSCode extension
host + `.claude/` folder → Claude Code CLI, VSCode + `.github/prompts/` →
Copilot Chat, terminal + `.system/skills/` → Codex CLI. Falls back to
`gofer.defaultCLI` if ambiguous.

**Validation**: Mock each execution context and verify router selects correct
platform. Test ambiguous cases (e.g., all directories present) and verify
fallback to setting.

**Integration**: CrossPlatformCommandRouter implements detectPlatform() method
called before routing skill invocations.

### FR-014: Command File Generator Script

System SHOULD implement generator script that transforms `.claude/commands/*.md`
→ `.system/skills/*/SKILL.md` and `.github/prompts/*.prompt.md`, injecting
platform-specific sections automatically to reduce maintenance burden.

**Validation**: Run generator script, verify 18 Codex skills created with
correct YAML frontmatter, verify 18 Copilot prompts updated with auto-chain
sections.

**Integration**: Script reads source files from `.claude/commands/`, applies
templates with platform-specific substitutions, writes to target directories.

### FR-015: Codex Skill Auto-Discovery

System MUST structure Codex skills for auto-discovery: each skill in separate
directory (`.system/skills/0-business-scenario/SKILL.md`), YAML frontmatter with
`name` and `description` for metadata pre-loading, instructions in markdown
body.

**Validation**: Restart Codex CLI (or run hypothetical `codex reload` command),
type `$ $gofer-` and trigger auto-completion, verify all 18 skills appear in
suggestion list.

**Integration**: Follows Codex CLI conventions per web research (OpenAI Codex
Skills Documentation). No code required - purely file structure compliance.

### FR-016: Backward Compatibility for Copilot

System MUST include backward-compatible notes in Copilot prompts for users on
pre-2026 versions without parallel agent support: "For older Copilot: run
validation agents sequentially using manual workflow (see
docs/legacy-workflow.md)".

**Validation**: Parse Copilot validation prompt, verify presence of "Backward
Compatibility" section with link to legacy workflow documentation.

**Integration**: Create `docs/legacy-workflow.md` documenting sequential
validation process for older Copilot versions.

### FR-017: Documentation Capability Matrix

System MUST create "Platform Capabilities" table in README with rows for each
feature (18 commands, MCP servers, autonomous mode, etc.), columns for each
platform (Claude, Copilot, Codex), cells showing status (✓/⚠/✗) with
explanatory footnotes.

**Validation**: Read README, verify table exists, verify MCP servers row shows
"✓" for Claude and "✗" for Copilot/Codex with footnote linking to explanation.

**Integration**: Update README.md in root directory. No code changes required.

### FR-018: Performance Tests for Parallel Agents

System MUST verify parallel agent execution performance: validation completes in
<60s across all platforms (vs 90s+ sequential baseline), measures wall-clock
time from validation start to report generation.

**Validation**: Run performance test suite, measure validation time in each
platform, verify all measurements <60s. Compare to sequential execution
baseline.

**Integration**: Performance tests in
`tests/performance/validation-parallel.test.ts` spawn agents and measure elapsed
time using high-resolution timers.

## Non-Functional Requirements

### NFR-001: Performance - Auto-Chain Latency

Auto-chain transition between pipeline stages MUST complete in <5 seconds: time
from stage N completion to stage N+1 start must be imperceptible to users.

**Measurement**: Instrumentation logs in CrossPlatformCommandRouter measure time
between "stage complete" event and "next stage start" event. 95th percentile
must be <5s.

### NFR-002: Performance - Parallel Agent Overhead

Parallel agent spawning overhead MUST be <10% of total validation time: spawning
6 agents concurrently should add minimal latency compared to sequential agent
work.

**Measurement**: Performance tests measure: (1) time to spawn 6 agents, (2)
total validation time. Overhead = (spawn time / total time) must be <10%.

### NFR-003: Compatibility - VSCode Version

Solution MUST support VSCode 1.80+ (current minimum version for Gofer
extension). No breaking changes to minimum supported versions.

**Verification**: Test extension in VSCode 1.80 (oldest supported) and verify
all commands work. CI/CD includes 1.80 test matrix.

### NFR-004: Compatibility - Node Version

Solution MUST support Node.js 18+ (current extension runtime). No native
dependencies beyond existing node-pty-prebuilt-multiarch.

**Verification**: `npm install` succeeds on Node 18, 20, 22. CI/CD matrix tests
all three versions.

### NFR-005: Security - No Credential Leakage

Conversation history preservation MUST NOT leak credentials across providers:
API keys, tokens, secrets in conversation history must be redacted before
provider switch.

**Verification**: Security tests inject fake API key in Claude message, switch
to Codex, verify key redacted in history array. ObservationMasker already
implements this.

### NFR-006: Maintainability - Single Source of Truth

Command content MUST have single source of truth (`.claude/commands/`) with
generator script producing Codex/Copilot versions to avoid drift and reduce
maintenance burden.

**Verification**: Modify Claude command, run generator, verify Codex/Copilot
versions updated automatically. Manual changes to generated files flagged by
CI/CD.

### NFR-007: Usability - Zero Configuration Default

Solution MUST work with zero configuration: default "auto" setting detects
available CLI and routes automatically. Users only configure if they want
explicit preference.

**Verification**: Fresh install test - install extension, run command without
configuring anything, verify system auto-detects Claude/Codex and executes
successfully.

### NFR-008: Reliability - Graceful Degradation

If preferred CLI not available (e.g., user set "codex" but Codex not installed),
system MUST degrade gracefully: show error with installation instructions, offer
fallback to available CLI.

**Verification**: Mock ConfigManager to return "codex", mock CLIHealthChecker to
report Codex unavailable, verify error message includes installation link and
fallback suggestion.

### NFR-009: Observability - Platform Detection Logging

CrossPlatformCommandRouter MUST log platform detection decisions: "Detected
platform: Claude Code CLI (reason: .claude/ directory + VSCode extension host)"
for troubleshooting.

**Verification**: Run command with logging enabled, grep logs for "Detected
platform:", verify reason included. Logs must be DEBUG level to avoid spam.

### NFR-010: Documentation - Platform-Specific Guides

Documentation MUST include separate setup guides for each platform: "Getting
Started with Claude CLI", "Getting Started with Copilot Chat", "Getting Started
with Codex CLI" linked from main README.

**Verification**: Follow each setup guide from scratch (fresh environment),
verify all steps work and result in functional Gofer commands.

## Success Criteria

| Criterion                            | Target                 | Measurement Method                                                 | Technology-Agnostic Outcome                                                 |
| ------------------------------------ | ---------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| SC-001: Command Availability         | 18/18 commands         | Run command availability tests in all three platforms              | Every Gofer command is invocable in Claude CLI, Copilot Chat, and Codex CLI |
| SC-002: Auto-Chain Functionality     | 100% success           | Run orchestrator command, verify 7 stages execute automatically    | Pipeline completes without user intervention in all platforms               |
| SC-003: Parallel Agent Performance   | <60s validation        | Measure wall-clock time from validation start to report generation | Validation completes 1.5x faster than sequential baseline                   |
| SC-004: Feature Parity Test Coverage | 100% pass              | Run `npm test -- cross-platform-parity.test.ts`                    | All parity tests pass with 0 failures                                       |
| SC-005: Context Preservation         | 100% message retention | Switch providers mid-session, verify message count before = after  | Conversation history persists across provider switches                      |
| SC-006: Zero Bugs Post-Launch        | 0 critical bugs        | Monitor GitHub issues for 30 days post-release                     | No user-reported bugs about cross-platform functional differences           |
| SC-007: User Adoption                | 25%+ provider switch   | Track telemetry for `gofer.defaultCLI` setting distribution        | At least 25% of users choose non-default provider                           |
| SC-008: Documentation Completeness   | 3 platform guides      | Verify setup guides exist for Claude, Copilot, Codex               | Each platform has dedicated installation and usage documentation            |

## Assumptions

1. **Codex CLI skill system is stable** - Assumes Codex CLI has reached stable
   API for `.system/skills/` directory structure and SKILL.md format per web
   research
2. **Copilot 2026 parallel agents available** - Assumes GitHub Copilot CLI 2026
   update (announced Feb 2026) with multi-agent delegation is generally
   available by implementation time
3. **VSCode extension host detection reliable** - Assumes checking `vscode.env`
   and process context reliably distinguishes Copilot Chat from Codex CLI
4. **Conversation history formats documented** - Assumes Claude JSONL and Codex
   JSON history formats remain stable (Feature 027 dependency)
5. **MCP servers remain Claude-only** - Assumes Copilot and Codex will not add
   MCP server support during this feature's lifecycle (6 months)
6. **Node-pty cross-platform support stable** - Assumes
   node-pty-prebuilt-multiarch continues to work in Codespaces/Linux per v1.20.7
   fix
7. **Generator script feasible** - Assumes command file structure is regular
   enough for automated transformation (95%+ content reusable across platforms)
8. **Auto-detection precedence clear** - Assumes Claude CLI should be preferred
   when multiple CLIs installed, per Feature 027 design (user can override via
   setting)
9. **Test environment supports all CLIs** - Assumes CI/CD can mock or install
   all three CLIs for integration testing
10. **Backward compatibility window finite** - Assumes Copilot legacy version
    support needed for 12 months, after which pre-2026 versions are unsupported

## Dependencies

### Internal Dependencies

1. **Feature 027 (multi-provider-cli-support)** - Cross-platform commands build
   on provider switching and CLI detection infrastructure
2. **ProviderFactory** - Extends `getCLIProvider()` and `autoDetectCLI()`
   methods to respect new `gofer.defaultCLI` setting
3. **ConfigManager** - Adds `getDefaultCLI()` getter for new VSCode setting
4. **CLIHealthChecker** - Reuses existing health check logic for Claude/Codex
   detection (no changes needed)
5. **AutonomousCommands** - Wires CrossPlatformCommandRouter to command
   execution flow
6. **MCP Tool Handler** - Updates skill loading logic to search multiple
   directories with priority fallback
7. **ObservationMasker** - Ensures credentials redacted from conversation
   history before provider switch (security requirement)
8. **Validation Agents** (`.claude/agents/validation-*.md`) - Referenced from
   all three platform command files for parallel spawning
9. **Node-pty-prebuilt-multiarch** - Cross-platform binary support required for
   terminal operations in Codespaces/Linux

### External Dependencies

1. **Codex CLI 1.0+** - Requires Codex CLI to support `.system/skills/`
   directory and SKILL.md format (assumed stable per web research)
2. **GitHub Copilot CLI 2026+** - Requires Copilot CLI with parallel agent
   support (announced Feb 2026, GA expected)
3. **VSCode API stability** - Relies on `vscode.workspace.getConfiguration()`
   and extension host context APIs remaining stable
4. **Claude Code CLI** - Reference implementation remains functional and
   compatible with existing `.claude/commands/` format
5. **MCP Protocol** - Continues to be Claude-only per current ecosystem state
   (if this changes, feature benefits expand)

### Blockers & Risks

- **RISK: Copilot parallel agents delayed** - If Copilot 2026 release slips or
  parallel agents don't work as documented, fallback to manual workflow
  (backward compatibility notes already planned)
- **RISK: Codex skill format undocumented** - If Codex skill format differs from
  web research findings, implementation will need adjustment after testing with
  actual Codex CLI
- **RISK: Platform detection ambiguity** - If multiple CLIs coexist in complex
  ways (e.g., Copilot extension + Codex CLI + Claude CLI), router may misdetect
  platform. Mitigation: explicit user setting overrides auto-detection

## Out of Scope

### Explicitly Excluded

1. **Modifying Feature 027 provider switching backend** - Backend API switching
   works correctly; only frontend command availability is in scope
2. **Changing `.claude/commands/` files** - Claude commands are reference
   implementation and remain unchanged (source of truth)
3. **Native MCP support in Copilot/Codex** - Enabling MCP servers in non-Claude
   platforms requires upstream changes outside Gofer's control
4. **Autonomous mode in Copilot Chat** - Copilot architecture doesn't support
   autonomous background execution; only manual command invocation in scope
5. **Custom agent models per platform** - Using different LLM models for
   different platforms (e.g., GPT-4 in Copilot, Claude in Codex) is out of
   scope; commands agnostic to underlying model
6. **Rewriting existing command files** - Enhancements are additive; no major
   rewrites of command logic or structure
7. **Supporting pre-2024 Copilot versions** - Only Copilot CLI 2026+ in scope;
   older versions get backward-compatible notes but not full feature parity
8. **Creating new commands** - All 18 existing commands get cross-platform
   support; no new commands added
9. **Command customization per platform** - Commands behave identically across
   platforms; no platform-specific feature variations
10. **Desktop CLI support** - Focus is VSCode extension integrations (Claude
    CLI, Copilot Chat, Codex CLI); standalone terminal usage without VSCode is
    out of scope

### Future Enhancements

- **Multi-language support** - Translating command prompts to non-English
  languages (blocked: needs i18n infrastructure)
- **Cloud-based command execution** - Running Gofer commands on remote servers
  instead of local CLI (blocked: needs remote execution API)
- **Cross-platform autonomous mode** - Background task execution in
  Copilot/Codex like Claude's autonomous mode (blocked: platform limitations)
- **Unified conversation UI** - Single chat interface showing messages from all
  providers (blocked: VSCode UI complexity)

## Glossary

| Term                                  | Definition                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auto-chaining**                     | Automatic progression through pipeline stages (research → specify → plan → tasks → implement → validate) without user intervention between stages |
| **Parallel Agent Spawning**           | Launching multiple AI agents concurrently to perform subtasks (e.g., 6 validation agents) instead of sequentially for performance                 |
| **Feature Parity**                    | Identical functional behavior across all three platforms (Claude CLI, Copilot Chat, Codex CLI) - same commands, same outputs, same performance    |
| **Conversation History Preservation** | Maintaining context (message array) when switching AI providers mid-session so new provider can reference earlier messages                        |
| **Platform Detection**                | Determining which AI assistant is currently active (Claude Code CLI vs Copilot Chat vs Codex CLI) via execution context analysis                  |
| **Skill**                             | Reusable AI prompt/command with metadata - Claude uses `.claude/commands/`, Codex uses `.system/skills/`, Copilot uses `.github/prompts/`         |
| **CrossPlatformCommandRouter**        | Component that detects current platform and routes skill invocations to appropriate command file directory                                        |
| **MCP Server**                        | Model Context Protocol server providing additional tools/context to AI assistants (currently Claude-only)                                         |
| **Provider Adapter**                  | Abstraction layer translating generic API calls to platform-specific CLI commands (e.g., ClaudeCodeCLIProvider, CodexCLIProvider)                 |
| **Validation Agent**                  | Specialized AI agent checking one aspect of implementation quality (correctness, security, performance, test quality, integration, standards)     |
| **Command File Generator**            | Script transforming Claude commands to Codex skills and Copilot prompts automatically to maintain consistency                                     |
| **Graceful Degradation**              | System continues working with reduced functionality when preferred features unavailable (e.g., MCP disabled in Codex)                             |

## Research Traceability

This matrix maps each research finding (from research.md) to the spec sections
that address it.

| Research Finding                          | Evidence Location             | Addressed In Spec                                                                                  |
| ----------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Pattern 1: Claude Code Skill Format       | research.md:29-42             | FR-001 (Codex skills), FR-015 (auto-discovery), Glossary (Skill definition)                        |
| Pattern 2: Auto-Chaining Instructions     | research.md:44-57             | FR-004 (auto-chain embedding), User Story 2 (auto-chain parity), SC-002 (auto-chain success)       |
| Pattern 3: Parallel Agent Spawning        | research.md:59-86             | FR-005 (agent spawn instructions), User Story 3 (parallel validation), SC-003 (performance target) |
| Pattern 4: Copilot Prompt Metadata        | research.md:88-103            | FR-002 (prompt enhancement), FR-016 (backward compatibility)                                       |
| Pattern 5: Provider Factory Pattern       | research.md:105-135           | FR-007 (provider integration), User Story 4 (context preservation), Dependencies (ProviderFactory) |
| Pattern 6: VSCode Settings with Enum      | research.md:137-157           | FR-006 (default provider setting), User Story 5 (provider selection), NFR-007 (zero config)        |
| Integration Point 1: Extension Entry      | research.md:161-164           | Dependencies (AutonomousCommands), FR-003 (router wiring)                                          |
| Integration Point 2: ConfigManager        | research.md:166-169           | FR-006 (settings), Dependencies (ConfigManager), NFR-007 (usability)                               |
| Integration Point 3: ProviderFactory      | research.md:171-174           | FR-007 (CLI provider), FR-008 (history preservation), User Story 4 (context)                       |
| Integration Point 4: Autonomous Commands  | research.md:176-179           | FR-003 (router integration), Dependencies (AutonomousCommands)                                     |
| Integration Point 5: MCP Tool Handler     | research.md:181-184           | FR-010 (multi-directory search), Dependencies (MCP Tool Handler)                                   |
| Decision 1: Codex Skill Format            | research.md:197-224           | FR-001 (skill creation), FR-015 (auto-discovery), Assumptions 1 (stability)                        |
| Decision 2: Copilot Parallel Agents       | research.md:226-252           | FR-002 (prompt enhancement), FR-005 (agent spawn), Assumptions 2 (2026 availability)               |
| Decision 3: Auto-Chain Mechanism          | research.md:254-279           | FR-004 (instruction embedding), User Story 2 (auto-chain), NFR-007 (zero config)                   |
| Decision 4: Default Provider Selection    | research.md:281-308           | FR-006 (setting), User Story 5 (preference), NFR-007 (zero config)                                 |
| Decision 5: Feature Parity Tests          | research.md:310-331           | FR-011 (test suite), User Story 6 (testing), SC-004 (test coverage)                                |
| Constraint 1: Claude Reference            | research.md:335-338           | NFR-006 (single source of truth), FR-014 (generator script), Assumptions 7 (regularity)            |
| Constraint 2: Platform Detection          | research.md:340-351           | FR-013 (detection logic), FR-003 (router), NFR-009 (observability), Edge Cases (ambiguity)         |
| Constraint 3: Task Tool Differences       | research.md:353-360           | FR-005 (agent spawn), User Story 3 (parallel agents), FR-002 (platform-specific syntax)            |
| Constraint 4: Codex Skill Discovery       | research.md:362-368           | FR-015 (auto-discovery), Edge Cases (old Codex), Documentation (troubleshooting)                   |
| Constraint 5: History Format Diffs        | research.md:370-374           | FR-008 (history preservation), Dependencies (Feature 027), User Story 4 (context)                  |
| Constraint 6: MCP Server Support          | research.md:376-385           | FR-009 (MCP guards), Assumptions 5 (Claude-only), Out of Scope (MCP in Copilot/Codex)              |
| Recommendation 1: Source of Truth         | research.md:399-400           | NFR-006 (maintainability), FR-014 (generator script)                                               |
| Recommendation 2: Start with Codex        | research.md:402-405           | User Story 1 priority (P1), Phased delivery approach                                               |
| Recommendation 3: Copilot Incremental     | research.md:407-411           | FR-002 (additive enhancements), FR-016 (backward compat)                                           |
| Recommendation 4: Test Suite First        | research.md:413-416           | FR-011 (test suite), User Story 6 (testing), SC-004 (coverage)                                     |
| Recommendation 5: Generator Script        | research.md:418-422           | FR-014 (generator), NFR-006 (single source), Assumptions 7 (feasibility)                           |
| Recommendation 6: Capability Matrix       | research.md:424-426           | FR-017 (documentation matrix), User Story 7 (capability docs), NFR-010 (guides)                    |
| Recommendation 7: Settings UI             | research.md:428-432           | FR-006 (settings dropdown), User Story 5 (preference), NFR-007 (discoverability)                   |
| Brownfield Constraint: Platform Detection | research.md:440 (table row 1) | FR-013 (detection logic), Assumptions 3 (reliability)                                              |
| Brownfield Constraint: CLI Syntax         | research.md:441 (table row 2) | FR-003 (router), FR-013 (detection), Glossary (Skill)                                              |
| Brownfield Constraint: History Formats    | research.md:442 (table row 3) | FR-008 (normalization), Dependencies (Feature 027)                                                 |
| Brownfield Constraint: MCP Support        | research.md:443 (table row 4) | FR-009 (guards), Assumptions 5 (Claude-only)                                                       |
| Brownfield Constraint: Parallel Agents    | research.md:444 (table row 5) | FR-005 (spawn instructions), User Story 3 (parity)                                                 |
| Tech Debt: Inline Skill Spawning          | research.md:454 (table row 3) | FR-005 (delegated spawning), User Story 3 (parallel)                                               |
| Caution: Skill Discovery Timing           | research.md:459               | FR-015 (auto-discovery), Edge Cases (Codex restart), Constraint 4                                  |
| Caution: Context Preservation             | research.md:460               | FR-008 (history), User Story 4 (context), Dependencies (Feature 027 R1)                            |
| Caution: Auto-Chain Instructions          | research.md:461               | FR-004 (explicit instructions), User Story 2 (auto-chain)                                          |
| Caution: Agent Spawn Syntax               | research.md:462               | FR-005 (platform-specific), User Story 3 (parallel)                                                |
| Caution: MCP Guards                       | research.md:463               | FR-009 (provider check), Constraint 6 (support matrix)                                             |
| Integration: ProviderFactory              | research.md:468 (table row 2) | Dependencies (ProviderFactory), FR-007 (extension)                                                 |
| Integration: ConfigManager                | research.md:469 (table row 3) | Dependencies (ConfigManager), FR-006 (getter)                                                      |
| Integration: CLIHealthChecker             | research.md:470 (table row 4) | Dependencies (CLIHealthChecker), NFR-008 (graceful degradation)                                    |
| Integration: AutonomousCommands           | research.md:471 (table row 5) | Dependencies (AutonomousCommands), FR-003 (wiring)                                                 |
| Integration: MCP Tool Handler             | research.md:472 (table row 6) | Dependencies (MCP Tool Handler), FR-010 (multi-dir search)                                         |
| Downstream: autonomousCommands            | research.md:479               | Dependencies (AutonomousCommands), FR-003 (router)                                                 |
| Downstream: MCP toolHandler               | research.md:480               | Dependencies (MCP Tool Handler), FR-010 (search)                                                   |
| Downstream: mcpConfig                     | research.md:481               | Dependencies (mcpConfig), FR-009 (guards)                                                          |
| Web Research: Codex Skills                | research.md:487-491           | Decision 1 (Codex format), FR-001 (skills), Assumptions 1 (stability)                              |
| Web Research: Copilot Parallel            | research.md:494-497           | Decision 2 (parallel agents), FR-002 (prompts), Assumptions 2 (2026 GA)                            |
| Web Research: Cross-Platform Context      | research.md:500-501           | Overview (context), Glossary (definitions), Discovery integration                                  |
