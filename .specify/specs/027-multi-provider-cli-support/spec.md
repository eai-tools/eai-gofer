---
id: '027-multi-provider-cli-support'
title: 'Multi-Provider CLI Support'
status: 'draft'
created: '2026-03-16'
updated: '2026-03-19'
priority: 'medium'
assignee: 'engineer-agent'
---

# Feature Specification: Multi-Provider CLI Support

**Feature Branch**: `027-multi-provider-cli-support` **Created**: 2026-03-16
**Status**: Draft

## Overview

Multi-Provider CLI Support enables Gofer to work seamlessly with multiple AI CLI
providers (Claude Code CLI and Codex CLI) with zero feature parity gaps. Users
can switch providers via a single VSCode settings dropdown, and all Gofer
features—pipeline stages, validation, autonomous mode, and LLM Council—work
identically regardless of provider choice.

**Why This Matters**: Current hardcoded dependency on Claude CLI creates vendor
lock-in, preventing users from leveraging alternative providers based on cost,
performance, or organizational policies. This feature delivers comprehensive
provider abstraction with flexibility (choose any provider), seamless migration
(switch without reconfiguring workflows), and future-proof architecture (add new
providers with minimal code).

**Value Proposition**: Teams gain freedom to select AI providers based on their
specific needs while maintaining full Gofer functionality. The abstraction layer
ensures consistency across providers and makes adding new providers (OpenAI,
Gemini, etc.) straightforward, protecting investment in Gofer workflows.

## User Stories

### User Story 1 - Provider Selection (Priority: P1)

As a **Gofer user**, I want to **select my preferred AI CLI provider from a
VSCode settings dropdown** so that **I can use Gofer with the provider that best
fits my cost, performance, or policy requirements**.

**Why this priority**: Core functionality that unlocks all other
provider-related features. Without provider selection, users cannot access
alternative providers.

**Independent Test**: Can be fully tested by opening VSCode settings, selecting
a provider from the dropdown (Claude, Codex, or Auto), and verifying the
selection persists across VSCode restarts.

**Acceptance Criteria**:

- [ ] Settings dropdown appears in VSCode settings under "Gofer > CLI Provider"
- [ ] Dropdown offers three options: "Claude Code CLI", "Codex CLI",
      "Auto-detect"
- [ ] Default setting is "Auto-detect" (preserves backward compatibility)
- [ ] Setting persists across VSCode sessions
- [ ] Changing setting displays confirmation notification
- [ ] Setting change takes effect immediately (no VSCode reload required)

**Acceptance Scenarios**:

1. **Given** VSCode is open with Gofer installed, **When** I navigate to
   Settings → Extensions → Gofer → CLI Provider, **Then** I see a dropdown with
   three provider options
2. **Given** I select "Codex CLI" from the dropdown, **When** I close and reopen
   VSCode, **Then** Codex CLI remains selected
3. **Given** no provider is explicitly selected, **When** I first use a Gofer
   command, **Then** auto-detection identifies an available CLI and shows a
   notification

---

### User Story 2 - Transparent Provider Switching (Priority: P1)

As a **Gofer user**, I want to **switch between providers without any workflow
disruption** so that **I can migrate providers without reconfiguring pipelines,
autonomous mode, or validation**.

**Why this priority**: Critical UX requirement (< 2 click switching) and ensures
feature parity. Users must trust that switching providers won't break existing
workflows.

**Independent Test**: Run a full pipeline stage with Claude CLI, switch to Codex
CLI via settings, run the same pipeline stage, and verify identical behavior and
output structure.

**Acceptance Criteria**:

- [ ] Switching providers requires exactly 1 click (dropdown change)
- [ ] Pipeline stages work identically on both providers
- [ ] Autonomous mode works identically on both providers
- [ ] Validation agents work identically on both providers
- [ ] LLM Council queries work identically on both providers
- [ ] No manual configuration required after switching
- [ ] Context and conversation history maintained across provider switches
- [ ] Error messages are provider-agnostic ("AI provider failed" not "Claude
      failed")

**Acceptance Scenarios**:

1. **Given** I have run `/1_gofer_research` with Claude CLI, **When** I switch
   to Codex CLI and run `/1_gofer_research` on a different feature, **Then**
   both produce identical spec.md structure and quality
2. **Given** autonomous mode is running with Claude CLI, **When** I switch to
   Codex CLI mid-session, **Then** the next autonomous action uses Codex without
   errors
3. **Given** validation is in progress with Codex CLI, **When** I review the
   results, **Then** they follow the same 100-point rubric format as Claude CLI
   validations

---

### User Story 3 - Auto-Detection and Helpful Errors (Priority: P2)

As a **Gofer user**, I want to **receive clear guidance when my selected
provider is unavailable** so that **I can quickly resolve configuration issues
without debugging**.

**Why this priority**: Essential for onboarding and troubleshooting, but
secondary to core provider functionality. Users blocked by missing CLI need
immediate, actionable guidance.

**Independent Test**: Uninstall both CLIs, trigger a Gofer command, and verify
the error message includes installation instructions for both providers.

**Acceptance Criteria**:

- [ ] Auto-detect checks for Claude CLI first, then Codex CLI
- [ ] If neither CLI is found, error message lists both with installation
      commands
- [ ] If selected CLI is not installed, error message shows installation command
- [ ] Error messages include version check output for debugging
- [ ] Notification includes clickable link to CLI installation docs
- [ ] Health check runs on extension activation to proactively detect issues
- [ ] Settings UI shows provider status indicator (✓ Available, ✗ Not Found)

**Acceptance Scenarios**:

1. **Given** no CLI is installed and setting is "Auto-detect", **When** I run
   `/0_business_scenario`, **Then** I see error: "No AI CLI found. Install
   Claude Code (`npm install -g @anthropic/claude-code`) or Codex
   (`npm install -g @openai/codex-cli`)"
2. **Given** Claude CLI is installed but Codex is selected, **When** extension
   activates, **Then** I see warning: "Codex CLI not found. Install with:
   `npm install -g @openai/codex-cli` or switch to Claude in settings"
3. **Given** Claude CLI is installed but authentication fails, **When** I
   trigger a command, **Then** error includes: "Claude CLI found but not
   authenticated. Set ANTHROPIC_API_KEY or run `claude login`"

---

### User Story 4 - Provider-Specific Feature Graceful Degradation (Priority: P3)

As a **Gofer user**, I want to **understand which provider-specific features are
available** so that **I can make informed provider choices based on capabilities
I need**.

**Why this priority**: Nice-to-have for advanced users leveraging
provider-specific features (MCP servers for Claude, web search for Codex). Core
abstraction works without this.

**Independent Test**: Check documentation or settings UI for provider capability
matrix, verify MCP servers work only with Claude CLI and web search only with
Codex CLI.

**Acceptance Criteria**:

- [ ] Documentation lists provider-specific features in comparison table
- [ ] When using provider-specific feature, notification explains provider
      limitation
- [ ] MCP server integration only activates when Claude CLI is selected
- [ ] Web search features only appear when Codex CLI is selected
- [ ] Common capabilities (query, file operations, conversation history) work on
      both
- [ ] Settings UI shows capability matrix for selected provider

**Acceptance Scenarios**:

1. **Given** I select Codex CLI, **When** I check available capabilities,
   **Then** documentation shows web search available but MCP servers unavailable
2. **Given** autonomous mode invokes an MCP server with Codex CLI, **When** the
   call fails, **Then** error suggests: "MCP servers require Claude CLI. Switch
   provider or use alternative approach"
3. **Given** I select Claude CLI, **When** I review documentation, **Then** I
   see MCP servers listed as available capability

---

### User Story 5 - Usage Tracking Across Providers (Priority: P3)

As a **Gofer user**, I want to **view token usage and cost metrics across all
providers** so that **I can compare provider efficiency and manage costs**.

**Why this priority**: Useful for cost-conscious teams and provider evaluation,
but not blocking for core functionality. Can be added after provider abstraction
is stable.

**Independent Test**: Run pipeline with Claude CLI, switch to Codex CLI, run
another pipeline, and verify AI Usage panel shows separate token counts for each
provider with correct totals.

**Acceptance Criteria**:

- [ ] AI Usage panel shows provider name alongside token counts
- [ ] Token usage tracked separately for each provider
- [ ] Usage logs parsed correctly from Claude JSONL format
      (~/.claude/history.jsonl)
- [ ] Usage logs parsed correctly from Codex JSON format (~/.codex/history.json)
- [ ] Usage aggregation works across provider switches
- [ ] Export functionality includes provider breakdown

**Acceptance Scenarios**:

1. **Given** I run 5 commands with Claude CLI and 3 with Codex CLI, **When** I
   open AI Usage panel, **Then** I see separate rows: "Claude CLI: 50K tokens"
   and "Codex CLI: 30K tokens"
2. **Given** usage data exists for both providers, **When** I export usage
   report, **Then** CSV includes provider column
3. **Given** Codex usage log format changes, **When** extension tries to parse
   logs, **Then** fallback to regex-based extraction or graceful degradation
   with warning

---

### Edge Cases

- **What happens when selected CLI becomes unavailable mid-session?** Provider
  health check should detect failure and either retry or switch to fallback
  provider (if configured). User receives notification with recovery options.
- **How does system handle CLI version incompatibility?** Version check during
  health check compares installed CLI version against minimum required version.
  If incompatible, error message instructs user to upgrade CLI.
- **What if CLI output format changes in future version?** Provider adapters
  include version-specific parsers with fallback to regex extraction. Tests
  verify parsing against multiple CLI versions.
- **How are rate limits handled across providers?** Each provider adapter
  implements `isRateLimited()` from LLMProvider interface. Rate limit detection
  is provider-specific (Claude checks API headers, Codex checks exit codes).
- **What happens when user has both CLIs installed and selects "Auto"?**
  Auto-detection prefers Claude CLI (tested first), ensuring consistent
  behavior. Detection order: Claude → Codex → null.
- **How does conversation history persist across provider switches?** History
  stored in provider-agnostic format (abstracted conversation model), translated
  to provider-specific format on each query.

## Requirements

### Functional Requirements

#### Core Abstraction

- **FR-001**: System MUST implement provider abstraction that supports both
  Claude Code CLI and Codex CLI through a unified interface
  - **Validation**: Unit tests verify both providers implement LLMProvider
    interface
  - **Integration**: ProviderFactory creates instances of both
    ClaudeCodeCLIProvider and CodexCLIProvider from research.md Pattern 5

- **FR-002**: System MUST allow users to select provider via VSCode settings
  dropdown with options: "Claude Code CLI", "Codex CLI", "Auto-detect"
  - **Validation**: Settings schema test verifies enum values and default
  - **Integration**: ConfigManager (research.md Pattern 2) adds
    `getPreferredCLIProvider()` getter

- **FR-003**: System MUST support "Auto-detect" mode that checks for Claude CLI
  first, then Codex CLI, and selects the first available
  - **Validation**: Integration test with mock CLI availability checks
  - **Integration**: Auto-detection logic in ProviderFactory using execFile for
    version checks (research.md Decision 4)

#### Provider Switching

- **FR-004**: System MUST apply provider changes immediately without requiring
  VSCode reload
  - **Validation**: Integration test switches provider and immediately triggers
    command
  - **Integration**: Config watcher (research.md Integration Point 5)
    reinitializes provider on setting change

- **FR-005**: System MUST maintain conversation history and context when
  switching providers mid-session
  - **Validation**: Integration test switches provider during autonomous mode
    and verifies history continuity
  - **Integration**: ClaudeCodeBridge refactoring (research.md Pattern 3)
    abstracts history management

- **FR-006**: System MUST preserve backward compatibility with existing Gofer
  workflows when using default "Auto-detect" setting
  - **Validation**: Backward compatibility test suite runs all existing
    integration tests with default settings
  - **Integration**: Default setting "auto" → Claude CLI if installed
    (research.md Decision 5)

#### Feature Parity

- **FR-007**: System MUST execute pipeline stages (/0_business_scenario through
  /6_gofer_validate) identically across both providers
  - **Validation**: E2E tests run full pipeline with both providers and compare
    outputs
  - **Integration**: Pipeline commands use provider interface (research.md
    Integration Point 1)

- **FR-008**: System MUST execute autonomous mode identically across both
  providers
  - **Validation**: Autonomous mode integration tests with both providers
  - **Integration**: AutonomousDriver dependency injection (research.md
    Integration Point 3)

- **FR-009**: System MUST execute validation agents identically across both
  providers
  - **Validation**: Validation integration tests with both providers score same
    code identically
  - **Integration**: Validation agents use provider interface for LLM queries

- **FR-010**: System MUST execute LLM Council queries identically across both
  providers
  - **Validation**: Council integration tests verify parallel queries work with
    both providers
  - **Integration**: Council uses ProviderFactory to create provider instances

#### Error Handling

- **FR-011**: System MUST display clear, actionable error messages when selected
  provider is not installed, including installation commands
  - **Validation**: Error message tests verify format and content
  - **Integration**: Provider health check (research.md Pattern 1) throws
    ProviderError with installation instructions

- **FR-012**: System MUST display clear error messages when provider
  authentication fails, including authentication steps
  - **Validation**: Auth failure test mocks invalid credentials
  - **Integration**: Provider-specific auth checks in `healthCheck()`
    (research.md Decision 3)

- **FR-013**: System MUST handle CLI process failures gracefully with retry
  logic and fallback to error state
  - **Validation**: Integration test simulates CLI crashes mid-query
  - **Integration**: TerminalManager (research.md Pattern 4) handles process
    exit codes

#### Provider-Specific Features

- **FR-014**: System MUST support MCP server integration only when Claude CLI is
  selected
  - **Validation**: MCP integration test verifies functionality with Claude CLI
    and graceful degradation with Codex
  - **Integration**: MCP server logic checks provider type before activation

- **FR-015**: System MUST support web search features only when Codex CLI is
  selected
  - **Validation**: Web search test verifies functionality with Codex CLI and
    graceful degradation with Claude
  - **Integration**: Web search logic checks provider type before activation

- **FR-016**: System MUST provide clear notifications when user attempts to use
  provider-specific features with incompatible provider
  - **Validation**: Feature detection test verifies notifications appear
  - **Integration**: Capability checks before invoking provider-specific
    features

#### Usage Tracking

- **FR-017**: System MUST track token usage separately for each provider with
  correct log parsing
  - **Validation**: Usage tracking integration tests verify token counts for
    both providers
  - **Integration**: UsageLogger extension (research.md Integration Point 4)
    adds CLI log adapters

- **FR-018**: System MUST parse Claude CLI usage from ~/.claude/history.jsonl
  (JSONL format)
  - **Validation**: Log parser unit tests with sample Claude logs
  - **Integration**: ClaudeCodeUsageAdapter (research.md Integration Point 4)

- **FR-019**: System MUST parse Codex CLI usage from ~/.codex/history.json (JSON
  format)
  - **Validation**: Log parser unit tests with sample Codex logs
  - **Integration**: New CodexUsageAdapter following ClaudeCodeUsageAdapter
    pattern

- **FR-020**: System MUST display provider name in AI Usage panel alongside
  token counts
  - **Validation**: UI test verifies provider name appears in usage panel
  - **Integration**: AI Usage panel queries UsageLogger for provider metadata

### Non-Functional Requirements

#### Performance

- **NFR-001**: Provider switching MUST complete in <500ms (settings change to
  active provider)
  - **Constraint**: Terminal spawning overhead ~500ms per CLI process
    (research.md Constraints)
  - **Mitigation**: Cache provider instances, only reinitialize on setting
    change

- **NFR-002**: CLI provider queries MUST complete within 2x API provider latency
  for equivalent queries
  - **Constraint**: CLI spawning adds overhead vs direct API calls (research.md
    Decision 3)
  - **Mitigation**: Reuse terminal sessions where possible

- **NFR-003**: Auto-detection MUST complete in <2 seconds during extension
  activation
  - **Constraint**: Multiple execFile calls for version checks
  - **Mitigation**: Parallel version checks for both CLIs

#### Security

- **NFR-004**: System MUST NOT log CLI authentication tokens or API keys in
  plain text
  - **Constraint**: CLI logs may contain sensitive data
  - **Mitigation**: Sanitize logs before display in usage panel

- **NFR-005**: System MUST validate CLI output before parsing to prevent
  injection attacks
  - **Constraint**: CLI output parsing from external processes (research.md
    Constraints)
  - **Mitigation**: Strict output parsing with JSON schema validation

#### Compatibility

- **NFR-006**: System MUST support Claude CLI version 1.0.0+ and Codex CLI
  version 2.0.0+
  - **Constraint**: CLI APIs may change across versions (research.md
    Constraints)
  - **Mitigation**: Version checks during health check, version-specific parsers

- **NFR-007**: System MUST maintain compatibility with existing LLMProvider
  interface used by 3 API providers
  - **Constraint**: LLMProvider designed for API calls, not terminal I/O
    (research.md Pattern 1)
  - **Mitigation**: Adapter pattern bridges CLI workflow to API-like interface

- **NFR-008**: System MUST work on macOS, Windows, and Linux platforms
  - **Constraint**: CLI command invocation differs across platforms
  - **Mitigation**: Use cross-platform execFile instead of shell-specific
    spawning

#### Maintainability

- **NFR-009**: Adding a new CLI provider MUST require <100 lines of code in a
  single adapter file
  - **Success Metric**: From discovery.md success criteria
  - **Mitigation**: Base adapter class (CLIProviderAdapter) handles common logic

- **NFR-010**: Provider-specific logic MUST be isolated in adapter classes, not
  scattered across codebase
  - **Success Metric**: 0% code duplication (discovery.md)
  - **Mitigation**: Strict adherence to LLMProvider interface, factory pattern

- **NFR-011**: System MUST include comprehensive test coverage (unit,
  integration, E2E) for both providers
  - **Constraint**: Testing requires both CLIs installed or mocked
  - **Mitigation**: Mock CLI processes for unit tests, optional real CLI for E2E
    tests

## Success Criteria

### Measurable Outcomes

| ID         | Criterion                           | Target          | Measurement Method                                                                                                                         |
| ---------- | ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **SC-001** | Feature Parity                      | 100%            | All Gofer commands (pipeline, autonomous, validation, council) produce identical results on Claude CLI and Codex CLI (E2E test comparison) |
| **SC-002** | Provider Switching Friction         | <2 clicks       | User can change provider with 1 click in settings dropdown (UX test)                                                                       |
| **SC-003** | Code Duplication                    | 0%              | Provider-specific logic isolated in adapter files, no scattered conditionals (static analysis)                                             |
| **SC-004** | Extensibility                       | <100 LOC        | Adding new CLI provider requires <100 lines in single adapter class (code review metric)                                                   |
| **SC-005** | Backward Compatibility              | 100%            | All existing integration tests pass with default "Auto-detect" setting (regression test suite)                                             |
| **SC-006** | Auto-Detection Success Rate         | >95%            | Auto-detection correctly identifies installed CLI on first attempt (integration test across platforms)                                     |
| **SC-007** | Error Message Clarity               | 100% actionable | Every provider-related error includes installation/auth command (error message audit)                                                      |
| **SC-008** | Performance Overhead                | <2x             | CLI provider queries complete within 2x API provider latency (benchmark tests)                                                             |
| **SC-009** | Usage Tracking Accuracy             | 100%            | Token counts match CLI log records for both providers (log reconciliation test)                                                            |
| **SC-010** | Provider-Specific Feature Detection | 100%            | MCP servers only activate with Claude, web search only with Codex (capability detection tests)                                             |

## Assumptions

### From Research Findings

1. **CLI Availability**: Users have or can install Claude CLI
   (`npm install -g @anthropic/claude-code`) or Codex CLI
   (`npm install -g @openai/codex-cli`)
   - Source: research.md Technology Decisions

2. **Terminal Access**: VSCode extension has permission to spawn terminal
   processes via node-pty
   - Source: research.md Pattern 4 (TerminalManager)

3. **CLI Stability**: Claude CLI and Codex CLI maintain stable command-line
   interfaces across minor versions
   - Source: research.md Constraints (NFR-006 addresses version compatibility)

4. **Output Format Consistency**: CLI output formats (markdown for Claude,
   JSON/TUI for Codex) remain parseable across versions
   - Source: research.md Decision 3 (Codex CLI Integration Strategy)

5. **Authentication Already Configured**: Users have set up CLI authentication
   before using Gofer (API keys or login sessions)
   - Source: research.md Decision 3 (Authentication: Claude via
     ANTHROPIC_API_KEY, Codex via ChatGPT session)

6. **Existing LLMProvider Interface**: LLMProvider interface successfully
   abstracts API providers (Anthropic, OpenAI, Google) and can be extended for
   CLI providers
   - Source: research.md Pattern 1 (LLM Provider Architecture)

7. **ConfigManager Extensibility**: ConfigManager can be extended with new
   getters without breaking existing functionality
   - Source: research.md Pattern 2 (Configuration Management)

8. **TerminalManager Reusability**: TerminalManager handles CLI process spawning
   without modification
   - Source: research.md Pattern 4 (Terminal Management for CLI Providers)

### Business Assumptions

9. **User Demand**: Gofer users want provider choice and are willing to install
   alternative CLIs
   - Source: discovery.md Problem Statement

10. **Provider Feature Parity**: Claude CLI and Codex CLI offer sufficient
    feature overlap for abstraction layer to be valuable
    - Source: research.md Compatibility Matrix (90%+ feature overlap)

11. **Migration Tolerance**: Users accept minimal migration friction (<2 clicks)
    when switching providers
    - Source: discovery.md Success Metrics

12. **Cost Sensitivity**: Users choose providers based on cost/performance
    trade-offs, making abstraction valuable
    - Source: discovery.md Value Proposition

## Dependencies

### From Research Integration Points

1. **ProviderFactory Extension** (research.md Integration Point 1, Pattern 5)
   - Location: `extension/src/council/providers/ProviderFactory.ts`
   - Change: Add `createCLIProvider()` method and register
     ClaudeCodeCLIProvider, CodexCLIProvider
   - Impact: Core abstraction mechanism, blocks all provider creation

2. **ClaudeCodeBridge Refactoring** (research.md Integration Point 2, Pattern 3)
   - Location: `extension/src/claudeCodeBridge.ts`
   - Change: Accept `LLMProvider` via dependency injection instead of creating
     Anthropic SDK client
   - Impact: Makes autonomous mode provider-agnostic, blocks autonomous
     integration

3. **ConfigManager Extension** (research.md Integration Point 5, Pattern 2)
   - Location: `extension/src/config.ts`
   - Change: Add `getPreferredCLIProvider()`, `getCodexCommand()` getters
   - Impact: Enables provider selection, blocks settings integration

4. **Package.json Settings Schema** (research.md Integration Point 5)
   - Location: `extension/package.json`
   - Change: Add `gofer.cliProvider` enum setting and `gofer.codexCommand`
     string setting
   - Impact: Exposes provider selection in VSCode UI, blocks user configuration

5. **AutonomousDriver Dependency Injection** (research.md Integration Point 3)
   - Location: `extension/src/autonomous/AutonomousDriver.ts`
   - Change: Accept `LLMProvider` as constructor parameter instead of creating
     bridge internally
   - Impact: Enables autonomous mode provider switching, blocks autonomous
     testing

6. **TerminalManager** (research.md Pattern 4)
   - Location: `extension/src/autonomous/TerminalManager.ts`
   - Change: None (existing API sufficient)
   - Impact: CLI process spawning, no blocking changes needed

7. **UsageLogger Extension** (research.md Integration Point 4)
   - Location: `extension/src/autonomous/ClaudeCodeUsageAdapter.ts`
   - Change: Add CodexUsageAdapter for Codex log parsing
   - Impact: Enables usage tracking for Codex, blocks usage panel updates

8. **LLMProvider Interface** (research.md Pattern 1)
   - Location: `extension/src/council/providers/LLMProvider.ts`
   - Change: None (existing interface sufficient for CLI adapters)
   - Impact: Core abstraction contract, no blocking changes needed

### External Dependencies

9. **Claude Code CLI** (version 1.0.0+)
   - Installation: `npm install -g @anthropic/claude-code`
   - Purpose: Provide Claude-powered CLI interface
   - Constraint: User must install manually

10. **Codex CLI** (version 2.0.0+)
    - Installation: `npm install -g @openai/codex-cli`
    - Purpose: Provide OpenAI-powered CLI interface
    - Constraint: User must install manually

11. **node-pty** (already in dependencies)
    - Purpose: Terminal process spawning
    - Version: Existing dependency, no change needed

## Out of Scope

### Explicitly Excluded from This Feature

1. **API Provider Migration**: Moving existing Anthropic/OpenAI/Google API
   providers to CLI-only
   - Rationale: API providers are faster for parallel queries (Council mode).
     CLI and API serve different use cases.
   - Future: Could add "unified provider mode" to prefer CLI or API per context

2. **Custom Provider Plugins**: Plugin API for community-contributed CLI
   providers
   - Rationale: Need stable abstraction layer first before opening to extensions
   - Future: Feature 028 could add provider plugin architecture

3. **Provider Fallback Chains**: Auto-switch to different provider if primary
   fails
   - Rationale: Adds complexity and ambiguity around which provider is active
   - Future: Could add as advanced resilience feature

4. **Provider Cost Comparison**: Built-in cost calculator comparing provider
   pricing
   - Rationale: Pricing changes frequently and varies by model/tier
   - Future: Could integrate with external pricing APIs

5. **Streaming Support**: Real-time token streaming from CLI output
   - Rationale: CLI output arrives in chunks, parsing incomplete responses is
     complex
   - Future: Phase 3 enhancement after stable adapter layer (research.md
     Recommendations)

6. **Provider-Specific UI**: Different VSCode UI elements per provider
   - Rationale: Goal is unified experience, not provider-specific workflows
   - Future: Advanced users may want provider-specific dashboards

7. **Multi-Provider Parallel Execution**: Running same query on multiple
   providers simultaneously
   - Rationale: Use case unclear (cost vs quality comparison?), adds latency
   - Future: Could add for A/B testing or quality benchmarking

8. **CLI Version Management**: Auto-upgrade CLIs to latest version
   - Rationale: Version management is user responsibility, auto-upgrades risky
   - Future: Could add version compatibility warnings

9. **Per-Workspace Provider Settings**: Different provider per VSCode workspace
   - Rationale: Current scope is user-level settings, team settings add
     complexity
   - Future: Could add `workspace.gofer.cliProvider` override

10. **Provider Usage Budgets**: Alert when token usage exceeds threshold per
    provider
    - Rationale: Budgeting logic is orthogonal to provider abstraction
    - Future: Could extend usage tracking with budget enforcement

## Glossary

| Term                          | Definition                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| **AI CLI Provider**           | Command-line interface tool that provides AI capabilities (e.g., Claude Code CLI, Codex CLI) |
| **Adapter Pattern**           | Design pattern that translates CLI terminal I/O workflow to API-like interface (LLMProvider) |
| **Auto-Detection**            | Mechanism that automatically identifies which CLI provider is installed and available        |
| **Autonomous Mode**           | Gofer feature that runs AI-powered workflows with minimal user intervention                  |
| **Backward Compatibility**    | Ensuring existing Gofer workflows work unchanged when upgrading to multi-provider support    |
| **CLI Provider Adapter**      | Class that implements LLMProvider interface by spawning CLI processes instead of API calls   |
| **Claude Code CLI**           | Official Anthropic command-line tool for Claude AI (`claude` command)                        |
| **Codex CLI**                 | Official OpenAI command-line tool for GPT models (`codex` command)                           |
| **Config Watcher**            | Listener that detects VSCode setting changes and reinitializes components                    |
| **Feature Parity**            | Identical functionality and behavior across different providers                              |
| **Health Check**              | Automated verification that CLI provider is installed, authenticated, and working            |
| **LLM Council**               | Gofer feature that queries multiple LLM providers in parallel for consensus                  |
| **LLMProvider Interface**     | Abstract contract defining standard methods for querying AI providers                        |
| **MCP Server**                | Model Context Protocol server for Claude CLI tool integration                                |
| **Pipeline Stages**           | Gofer's 7-stage workflow (/0_business_scenario through /6_gofer_validate)                    |
| **Provider Factory**          | Centralized component that creates and registers provider instances                          |
| **Provider Registry**         | Map of provider IDs to constructor functions for instantiation                               |
| **Provider-Agnostic**         | Code that works with any provider without conditional logic for specific providers           |
| **Provider-Specific Feature** | Capability unique to one provider (e.g., MCP servers for Claude, web search for Codex)       |
| **Terminal Manager**          | Component that spawns and manages CLI processes via node-pty                                 |
| **Token Usage**               | Count of input/output tokens consumed by AI provider queries                                 |
| **Usage Adapter**             | Component that parses provider-specific log files to extract token usage                     |
| **Vendor Lock-In**            | Dependency on single provider that prevents switching to alternatives                        |

## Research Traceability

### Research Findings → Specification Mapping

| Research Finding                                                   | Research Section                    | Spec Section                | Spec Requirement ID |
| ------------------------------------------------------------------ | ----------------------------------- | --------------------------- | ------------------- |
| LLMProvider interface abstracts 3 API providers successfully       | Pattern 1                           | Dependencies #8             | FR-001              |
| ProviderFactory uses registry pattern for provider instantiation   | Pattern 5                           | Dependencies #1             | FR-001              |
| ConfigManager supports type-safe getters with singleton pattern    | Pattern 2                           | Dependencies #3             | FR-002              |
| VSCode settings dropdown for provider selection                    | Pattern 2                           | User Story 1                | FR-002              |
| ClaudeCodeBridge hardcoded to Anthropic SDK (needs refactoring)    | Pattern 3                           | Dependencies #2             | FR-005              |
| TerminalManager handles CLI process spawning via node-pty          | Pattern 4                           | Dependencies #6             | FR-013              |
| Auto-detection logic: Claude first, then Codex, then null          | Decision 4                          | User Story 3                | FR-003              |
| CLI providers implement same LLMProvider interface                 | Decision 2                          | Functional Requirements     | FR-001              |
| Backward compatibility: default "auto" prefers Claude              | Decision 5                          | Success Criteria            | SC-005, FR-006      |
| Claude CLI: JSONL logs at ~/.claude/history.jsonl                  | Decision 3                          | Functional Requirements     | FR-018              |
| Codex CLI: JSON logs at ~/.codex/history.json                      | Decision 3                          | Functional Requirements     | FR-019              |
| MCP servers specific to Claude CLI                                 | Decision 3                          | Functional Requirements     | FR-014              |
| Web search specific to Codex CLI                                   | Decision 3                          | Functional Requirements     | FR-015              |
| CLI spawning adds ~500ms overhead                                  | Constraint: Terminal Dependency     | Non-Functional Requirements | NFR-001, NFR-002    |
| CLI output parsing fragility risk                                  | Constraint: Output Parsing          | Non-Functional Requirements | NFR-005, NFR-006    |
| Autonomous commands launch CLI directly (needs provider injection) | Integration Point 1                 | Dependencies #5             | FR-008              |
| ClaudeCodeUsageAdapter reads Claude logs                           | Integration Point 4                 | Dependencies #7             | FR-017              |
| Config watching for provider setting changes                       | Integration Point 5                 | Functional Requirements     | FR-004              |
| <2 click switching requirement                                     | Discovery: Success Metrics          | Success Criteria            | SC-002              |
| Zero feature parity gaps requirement                               | Discovery: Success Metrics          | Success Criteria            | SC-001              |
| 0% code duplication requirement                                    | Discovery: Success Metrics          | Success Criteria            | SC-003              |
| <100 LOC to add new provider requirement                           | Discovery: Success Metrics          | Success Criteria            | SC-004              |
| Vendor lock-in pain point                                          | Discovery: Problem Statement        | Overview                    | -                   |
| Flexibility + migration + extensibility value                      | Discovery: Value Proposition        | Overview                    | -                   |
| Terminal spawning in autonomousCommands.ts:981                     | Brownfield: Technical Debt          | Assumptions #2              | FR-013              |
| AutonomousDriver depends on ClaudeCodeBridge signature             | Brownfield: Downstream Dependencies | Dependencies #5             | FR-005              |
| API vs CLI use cases (council vs autonomous)                       | Decision 1                          | Out of Scope #1             | -                   |

### Integration Point Coverage

| Integration Point (from research.md)                           | Addressed In Spec Section | Requirement ID         |
| -------------------------------------------------------------- | ------------------------- | ---------------------- |
| 1. Autonomous Mode Entry (autonomousCommands.ts:871-928)       | Dependencies #1, #5       | FR-008                 |
| 2. ClaudeCodeBridge Initialization (claudeCodeBridge.ts:18-24) | Dependencies #2           | FR-005                 |
| 3. Autonomous Driver (AutonomousDriver.ts)                     | Dependencies #5           | FR-008                 |
| 4. Usage Tracking (ClaudeCodeUsageAdapter.ts)                  | Dependencies #7           | FR-017, FR-018, FR-019 |
| 5. Config Watching (config.ts)                                 | Dependencies #3           | FR-004                 |

### Constraint Coverage

| Constraint (from research.md)                | Addressed In Spec Section | Mitigation                                                                                |
| -------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| CLI Installation Required                    | Assumptions #1            | User Story 3: Auto-detection with helpful errors (FR-011)                                 |
| Terminal Dependency (~500ms overhead)        | NFR-001, NFR-002          | Cache provider instances, reuse terminal sessions                                         |
| Output Parsing Fragility                     | NFR-005, NFR-006          | Version-specific parsers with regex fallback                                              |
| Authentication Complexity                    | Assumptions #5            | Provider-specific auth checks with clear error messages (FR-012)                          |
| Token Usage Tracking (different log formats) | FR-018, FR-019            | Provider-specific adapters normalize to common format                                     |
| Provider Interface Compatibility             | NFR-007                   | Adapter pattern bridges CLI workflow to LLMProvider interface                             |
| Error Handling (exit codes vary)             | FR-013                    | Provider-specific error parsers map to ProviderError                                      |
| Conversation History (stateful vs stateless) | FR-005                    | Adapter manages conversation state for CLI providers                                      |
| Performance (API 10-50x faster)              | NFR-001, NFR-002          | Use API for council, CLI for autonomous (configurable)                                    |
| <2 Click Switching                           | SC-002                    | Single dropdown in VSCode settings (FR-002)                                               |
| Zero Feature Parity Gaps                     | SC-001                    | Abstract common capabilities, graceful degradation for provider-specific (FR-014, FR-015) |

### Coverage Summary

- **Integration Points Addressed**: 5 of 5 (100%)
- **Constraints Addressed**: 11 of 11 (100%)
- **Research Patterns Referenced**: 5 of 5 (100%)
- **Technology Decisions Incorporated**: 5 of 5 (100%)
- **Discovery Success Metrics Mapped**: 4 of 4 (100%)
