---
feature: 027-multi-provider-cli-support
spec: .specify/specs/027-multi-provider-cli-support/spec.md
research: .specify/specs/027-multi-provider-cli-support/research.md
status: ready
created: 2026-03-16
---

# Implementation Plan: Multi-Provider CLI Support

**Branch**: `027-multi-provider-cli-support` | **Date**: 2026-03-16 | **Spec**:
[spec.md](./spec.md)

## Summary

Enable Gofer to work seamlessly with multiple AI CLI providers (Claude Code CLI
and Codex CLI) through a unified abstraction layer. Users can select their
preferred provider via a VSCode settings dropdown with <2 click switching. All
Gofer features (pipeline stages, autonomous mode, validation, LLM Council) work
identically regardless of provider choice. The implementation extends the
existing `LLMProvider` interface architecture (proven with 3 API providers) to
support CLI-based providers through an adapter pattern, maintaining 100%
backward compatibility while enabling future provider additions with <100 LOC
per provider.

**Key Innovation**: Reuse existing LLMProvider abstraction (research.md
Pattern 1) by creating CLI adapters that translate terminal I/O workflows to the
API-like `query()` interface, eliminating code duplication and preserving the
factory/registry pattern that already manages Anthropic, OpenAI, and Google
providers.

## Technical Context

**Tech Stack**:

- **Language/Version**: TypeScript 5.3+ with strict mode enabled
- **Primary Dependencies**:
  - `@anthropic-ai/sdk` (existing, for Anthropic API)
  - `node-pty` (existing, for terminal process spawning)
  - `child_process.execFile` with `util.promisify` (CLI detection)
  - VSCode Extension API 1.85+
- **Storage**: File-based (CLI usage logs: `~/.claude/history.jsonl` and
  `~/.codex/history.json`)
- **Testing**: Vitest (unit), integration tests with mock CLI processes, E2E
  with real CLIs (optional)
- **Target Platform**: VSCode Extension running on macOS, Windows, Linux
- **Project Type**: VSCode Extension (monorepo with `/extension/` and
  `/language-server/`)
- **Performance Goals**:
  - Provider switching <500ms
  - CLI query latency <2x API latency
  - Auto-detection <2s on extension activation
- **Constraints**:
  - CLI installation required (user responsibility)
  - Terminal spawning adds ~500ms overhead per query
  - CLI output parsing fragility (mitigated with version-specific parsers)
  - Must maintain 100% backward compatibility with existing workflows
- **Scale/Scope**:
  - 2 CLI providers initially (Claude Code, Codex)
  - 5 user stories, 20 functional requirements, 11 non-functional requirements
  - ~15 files modified, ~8 new files created

**Architecture**:

The system extends Gofer's existing LLMProvider architecture to support
CLI-based providers alongside API providers. The core abstraction separates
provider interface (what operations are available) from provider implementation
(how they're executed - API calls vs CLI processes).

**Architecture Diagram (Text Description)**:

```
┌─────────────────────────────────────────────────────────────────┐
│ VSCode Extension Layer                                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Autonomous   │  │   Pipeline   │  │  LLM Council │         │
│  │   Driver     │  │   Commands   │  │   Queries    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
│         └─────────────────┼─────────────────┘                  │
│                           │                                    │
│                    ┌──────▼────────┐                           │
│                    │ ProviderFactory│◄─────── ConfigManager    │
│                    │   (Extended)   │         (getPreferredCLI) │
│                    └───────┬────────┘                           │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐                │
│         │                  │                  │                │
│  ┌──────▼───────┐  ┌───────▼────────┐  ┌─────▼──────┐         │
│  │ API Providers│  │ CLI Adapters   │  │ Config     │         │
│  │ (Existing)   │  │ (NEW)          │  │ Settings   │         │
│  │              │  │                │  │ (Extended) │         │
│  │ - Anthropic  │  │ - Claude CLI   │  └────────────┘         │
│  │ - OpenAI     │  │ - Codex CLI    │                          │
│  │ - Google     │  │                │                          │
│  └──────────────┘  └────────┬───────┘                          │
│                             │                                  │
│                    ┌────────▼────────┐                          │
│                    │ TerminalManager │                          │
│                    │  (Reused)       │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
         │                      │
         │ API Calls            │ CLI Spawning (node-pty)
         │                      │
┌────────▼────────┐    ┌────────▼─────────┐
│  Claude API     │    │  `claude` CLI    │
│  OpenAI API     │    │  `codex` CLI     │
│  Google API     │    │  (user-installed)│
└─────────────────┘    └──────────────────┘
```

**Key Architectural Decisions**:

1. **Adapter Pattern for CLI Integration**: CLI providers implement the same
   `LLMProvider` interface as API providers but use `node-pty` to spawn
   processes instead of HTTP clients. This preserves the factory pattern and
   eliminates conditional logic scattered across the codebase.

2. **Two-Tier Provider System**: API providers (Anthropic, OpenAI, Google)
   remain unchanged for fast parallel council queries. CLI providers (Claude
   CLI, Codex CLI) serve autonomous mode and single-threaded workflows.
   ConfigManager determines which provider type to use.

3. **Provider-Agnostic Bridge**: Refactor `ClaudeCodeBridge` to accept
   `LLMProvider` interface via dependency injection instead of hardcoding
   Anthropic SDK. This makes autonomous mode work with any provider (API or
   CLI).

4. **Conversation State Management**: CLI sessions are stateful (persistent
   terminal process), while API calls are stateless. Adapters manage
   conversation history internally and translate to provider-specific formats on
   each query.

5. **Auto-Detection with Fallback**: Default "auto" setting checks
   `claude --version`, then `codex --version`, selecting first available. Health
   checks run during extension activation with clear error notifications if
   neither is found.

### Integration Points

| Component               | File                                                 | Integration Type                                                                                           |
| ----------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **ProviderFactory**     | `extension/src/council/providers/ProviderFactory.ts` | Extend factory with `createCLIProvider()` method, register CLI providers in registry                       |
| **ClaudeCodeBridge**    | `extension/src/claudeCodeBridge.ts`                  | Refactor constructor to accept `LLMProvider` instead of API key, replace SDK calls with `provider.query()` |
| **AutonomousDriver**    | `extension/src/autonomous/AutonomousDriver.ts`       | Accept `LLMProvider` as constructor parameter, use provider from factory                                   |
| **ConfigManager**       | `extension/src/config.ts`                            | Add `getPreferredCLIProvider()`, `getCodexCommand()` getters                                               |
| **VSCode Settings**     | `extension/package.json`                             | Add `gofer.cliProvider` enum dropdown and `gofer.codexCommand` string setting                              |
| **TerminalManager**     | `extension/src/autonomous/TerminalManager.ts`        | Reuse existing API for CLI process spawning (no changes)                                                   |
| **UsageLogger**         | `extension/src/autonomous/ClaudeCodeUsageAdapter.ts` | Add `CodexUsageAdapter` for Codex log parsing                                                              |
| **Autonomous Commands** | `extension/src/autonomousCommands.ts`                | Use ProviderFactory to create provider based on config setting                                             |

### Key Dependencies

**Existing Modules (Reused)**:

- `LLMProvider` interface (`extension/src/council/providers/LLMProvider.ts`) -
  Core abstraction contract
- `BaseLLMProvider` abstract class
  (`extension/src/council/providers/BaseLLMProvider.ts`) - Shared provider logic
- `ProviderFactory` (`extension/src/council/providers/ProviderFactory.ts`) -
  Provider instantiation
- `ProviderError` (`extension/src/council/providers/ProviderError.ts`) - Error
  handling
- `TerminalManager` (`extension/src/autonomous/TerminalManager.ts`) - CLI
  process spawning
- `ConfigManager` (`extension/src/config.ts`) - Settings management

**External Libraries**:

- `@anthropic-ai/sdk` (existing) - Anthropic API client
- `node-pty` (existing) - Terminal emulation for CLI spawning
- `child_process` (built-in) - CLI detection via `execFile`
- `util` (built-in) - Promise utilities

**User-Installed CLIs**:

- Claude Code CLI v1.0.0+ (`npm install -g @anthropic/claude-code`)
- Codex CLI v2.0.0+ (`npm install -g @openai/codex-cli`)

## Constitution Check

Validating alignment with `.specify/memory/constitution.md` principles:

### ✅ I. Test-Driven Development (NON-NEGOTIABLE)

**Compliance**: All new components (CLI adapters, provider factory extensions,
config getters) will have tests written BEFORE implementation.

**Test Strategy**:

- Unit tests for `CLIProviderAdapter`, `ClaudeCodeCLIProvider`,
  `CodexCLIProvider` with mock terminal processes
- Integration tests for provider switching (change setting → verify new provider
  used)
- Contract tests for `LLMProvider` interface compliance
- E2E tests for full pipeline with both CLI providers (optional, requires real
  CLIs)
- Backward compatibility tests ensure existing integration tests pass with
  default settings

**Verification**: CI enforces 80%+ coverage, tests must fail before
implementation begins.

### ✅ II. MCP-First Architecture

**Compliance**: This feature does not add new AI assistant integration points.
Existing MCP tools (`gofer_get_specs`, `gofer_execute_task`, etc.) continue to
work unchanged. CLI providers are internal implementation details consumed by
existing MCP tools.

**No Impact**: MCP layer remains stateless and provider-agnostic. Tools call
ProviderFactory methods, which now support CLI providers transparently.

### ✅ III. Spec Kit Format Compliance

**Compliance**: This plan follows GitHub Spec Kit format with YAML frontmatter,
structured sections, and task dependencies. Specification in `spec.md` includes
user stories, requirements, and acceptance criteria. Tasks in `tasks.md` will
use `- [ ] #T001 Description (deps: T002)` format.

**Verification**: Spec validation passes before implementation, constitution
check gate passed.

### ✅ IV. Strict TypeScript & Code Quality

**Compliance**: All new code uses TypeScript strict mode with
`noImplicitAny: true`, `strictNullChecks: true`.

**Quality Standards**:

- No `any` types (use `unknown` with type guards for CLI output parsing)
- Functions ≤300 lines (adapters decomposed into parser methods, health check
  methods, etc.)
- Files ≤500 lines (each provider adapter is separate file)
- Cyclomatic complexity ≤10 (factory methods use early returns, no deep nesting)
- ES modules with `.js` extensions in imports

**Verification**: ESLint passes with zero warnings, TypeScript compiles with
strict mode.

### ✅ V. Security by Default

**Compliance**: Security measures for CLI integration:

- **Input Validation**: CLI output parsed with JSON schema validation before use
- **Secrets**: API keys and CLI authentication tokens never logged in plain text
- **Path Traversal**: CLI commands executed with fixed paths, no user-controlled
  path injection
- **Process Security**: CLI processes spawned with minimal privileges,
  stdout/stderr sanitized before logging

**Threats Mitigated**:

- Command injection: Use `execFile` with array args, never shell interpolation
- Log leakage: Sanitize usage logs before display in AI Usage panel
- Untrusted output: Validate CLI responses against schema before parsing

### ✅ VI. Performance Requirements

**Compliance**: Performance benchmarks defined:

- **Provider Switching**: <500ms (config change → provider active)
- **CLI Queries**: <2x API latency (acceptable overhead for CLI spawning)
- **Auto-Detection**: <2s during extension activation (parallel version checks)

**Optimizations**:

- Cache provider instances (only reinitialize on setting change)
- Reuse terminal sessions where possible (persistent PTY for multi-turn)
- Parallel CLI detection (check `claude` and `codex` simultaneously)

**Monitoring**: Integration tests measure switching latency, E2E tests benchmark
query times.

### ✅ VII. 80% Test Coverage Minimum

**Compliance**: All new code achieves 80%+ coverage across line, branch, and
function metrics.

**Coverage Plan**:

- **Unit**: CLI adapters, provider factory methods, config getters (90%+ target)
- **Integration**: Provider switching, auto-detection, error handling (85%+
  target)
- **E2E**: Full pipeline with both providers (optional, improves confidence)
- **Critical Paths**: ClaudeCodeBridge refactoring (100% coverage required)

**Enforcement**: CI blocks merges below 80% threshold, coverage reports in PR
checks.

### ✅ VIII. Minimal Necessary Changes

**Compliance**: Changes limited to provider abstraction layer and config
management.

**Scope Boundaries**:

- **Modify Only**: Files listed in Integration Points table (8 files)
- **No Refactoring**: Unrelated code (e.g., TerminalManager internals) left
  unchanged
- **No Gold-Plating**: Only features from spec.md user stories, no speculative
  additions
- **Test Scope**: Only tests for new/modified components, no unrelated test
  refactoring

**Justification**: This feature adds provider abstraction infrastructure
required for user stories 1-5. All changes directly support functional
requirements FR-001 through FR-020.

---

**Constitution Compliance**: ✅ **PASS** (8/8 principles aligned)

All principles validated, no violations requiring justification. Ready to
proceed to implementation phases.

## Implementation Phases

### Phase 1: Setup & Foundation

**Goal**: Establish CLI provider abstraction layer, configuration schema, and
base types to enable CLI provider development without affecting existing
functionality.

**Tasks**:

- [ ] **T1.1** - Create `CLIProviderAdapter` base class implementing
      `LLMProvider` interface
  - Location: `extension/src/council/providers/cli/CLIProviderAdapter.ts`
  - Implements: `query()`, `healthCheck()`, `isAvailable()`, `isRateLimited()`
  - Shared logic: CLI process spawning, output parsing, error mapping to
    `ProviderError`
  - Abstract methods: `getCLICommand()`, `parseOutput()`, `formatPrompt()`
  - Verification: Unit tests verify interface compliance, abstract methods throw
    if not overridden

- [ ] **T1.2** - Add VSCode settings schema to `package.json`
  - Add `gofer.cliProvider` enum setting: `["claude", "codex", "auto"]`, default
    `"auto"`
  - Add `gofer.codexCommand` string setting: default `"codex"`, description
    "Path to Codex CLI executable"
  - Add setting descriptions with installation instructions
  - Verification: Settings appear in VSCode UI, enum dropdown shows 3 options

- [ ] **T1.3** - Extend `ConfigManager` with CLI provider getters
  - Add `getPreferredCLIProvider(): 'claude' | 'codex' | 'auto'`
  - Add `getCodexCommand(): string` (reuse pattern from
    `getClaudeCodeCommand()`)
  - Update `CONFIG_KEYS` and `DEFAULTS` constants
  - Verification: Unit tests verify getters return correct values from config

- [ ] **T1.4** - Create type definitions for CLI providers
  - Location: `extension/src/council/types.ts`
  - Add `CLIProviderId` type: `'claude-cli' | 'codex-cli'`
  - Extend `ProviderId` union to include CLI provider IDs
  - Add `CLIProviderConfig` interface: `{ command: string; model?: string }`
  - Verification: TypeScript compiles, existing API provider types unchanged

- [ ] **T1.5** - Set up test fixtures for CLI provider testing
  - Location: `tests/fixtures/cli-providers/`
  - Mock CLI responses (Claude markdown format, Codex JSON format)
  - Mock PTY implementations for unit tests (no real CLI processes)
  - Sample usage logs (Claude JSONL, Codex JSON)
  - Verification: Test fixtures load successfully, mock PTY can be instantiated

**Verification Criteria**:

- [ ] `CLIProviderAdapter` compiles and passes `LLMProvider` interface tests
- [ ] VSCode settings dropdown functional with 3 provider options
- [ ] `ConfigManager` getters return expected values
- [ ] Type definitions compile without errors
- [ ] Test fixtures available for Phase 2 development

---

### Phase 2: CLI Provider Implementations

**Goal**: Implement Claude Code CLI and Codex CLI adapters, register them in
ProviderFactory, and enable provider auto-detection.

**Tasks**:

- [ ] **T2.1** - Implement `ClaudeCodeCLIProvider` adapter
  - Location: `extension/src/council/providers/cli/ClaudeCodeCLIProvider.ts`
  - Extends: `CLIProviderAdapter`
  - Implements: `getCLICommand()` returns config `claudeCodeCommand` or
    `"claude"`
  - Implements: `parseOutput()` extracts text from Claude markdown format
    (handles `---` separators)
  - Implements: `formatPrompt()` prepares prompt for Claude CLI stdin
  - Implements: `healthCheck()` runs `claude --version`, checks for API key in
    env or config
  - Verification: Unit tests verify output parsing with fixture data, health
    check with mock execFile

- [ ] **T2.2** - Implement `CodexCLIProvider` adapter
  - Location: `extension/src/council/providers/cli/CodexCLIProvider.ts`
  - Extends: `CLIProviderAdapter`
  - Implements: `getCLICommand()` returns config `codexCommand` or `"codex"`
  - Implements: `parseOutput()` extracts text from Codex JSON or TUI format
  - Implements: `formatPrompt()` prepares prompt for Codex CLI (`codex exec`
    mode)
  - Implements: `healthCheck()` runs `codex --version`, checks for ChatGPT
    session or API key
  - Verification: Unit tests verify output parsing with fixture data, health
    check with mock execFile

- [ ] **T2.3** - Extend `ProviderFactory` with CLI provider support
  - Add `createCLIProvider(cliType: 'claude' | 'codex'): LLMProvider` method
  - Register `ClaudeCodeCLIProvider` and `CodexCLIProvider` in provider registry
  - Add `detectAvailableCLI(): Promise<'claude' | 'codex' | null>` method
    (auto-detection logic)
  - Update factory to call `detectAvailableCLI()` when config is `"auto"`
  - Verification: Integration tests verify factory creates correct provider
    type, auto-detection returns expected CLI

- [ ] **T2.4** - Implement CLI auto-detection logic
  - Location: `extension/src/council/providers/ProviderFactory.ts` (private
    method)
  - Check `claude --version` with 1s timeout (returns true if contains
    "version")
  - Check `codex --version` with 1s timeout (returns true if contains "version")
  - Run checks in parallel using `Promise.all()`
  - Return first available CLI or `null` if neither found
  - Verification: Integration tests with mock execFile verify detection order
    (Claude → Codex → null)

- [ ] **T2.5** - Add provider health check on extension activation
  - Location: `extension/src/extension.ts` (in `initializeForWorkspace()`)
  - Call `provider.healthCheck()` for selected CLI provider
  - Show VSCode notification if provider unavailable: "Claude CLI not found.
    Install with: `npm install -g @anthropic/claude-code`"
  - Show warning notification if authentication fails: "Claude CLI found but not
    authenticated. Set ANTHROPIC_API_KEY or run `claude login`"
  - Verification: Integration tests verify notifications appear for missing CLI,
    invalid auth

**Verification Criteria**:

- [ ] Both CLI providers implement `LLMProvider` interface and pass contract
      tests
- [ ] ProviderFactory creates Claude CLI and Codex CLI instances
- [ ] Auto-detection correctly identifies installed CLI (tested with mocks)
- [ ] Health check notifications appear for missing/misconfigured providers
- [ ] All Phase 2 unit tests pass with 85%+ coverage

---

### Phase 3: Integration with Existing Components

**Goal**: Refactor ClaudeCodeBridge and AutonomousDriver to use LLMProvider
abstraction, enabling provider switching for autonomous mode and pipeline
commands.

**Tasks**:

- [ ] **T3.1** - Refactor `ClaudeCodeBridge` constructor to accept `LLMProvider`
  - Location: `extension/src/claudeCodeBridge.ts`
  - Change signature:
    `constructor(workspacePath: string, provider: LLMProvider, context: vscode.ExtensionContext)`
  - Remove `private anthropic: Anthropic` field (provider abstraction replaces
    it)
  - Update `processPrompt()` to call `provider.query()` instead of
    `anthropic.messages.create()`
  - Map conversation history to `QueryRequest` format
  - Verification: Unit tests verify bridge works with mock `LLMProvider`,
    backward compatibility test with `AnthropicProvider`

- [ ] **T3.2** - Update `processPrompt()` method to use provider abstraction
  - Replace SDK-specific call with provider-agnostic `query()`
  - Convert `conversationHistory` (Anthropic format) to `QueryRequest` (abstract
    format)
  - Extract response text from `QueryResponse` instead of Anthropic-specific
    blocks
  - Maintain conversation history in abstract format
  - Verification: Integration tests verify conversation history maintained
    across multiple queries

- [ ] **T3.3** - Update `AutonomousDriver` to accept `LLMProvider` as dependency
  - Location: `extension/src/autonomous/AutonomousDriver.ts`
  - Add constructor parameter: `provider: LLMProvider`
  - Pass provider to `ClaudeCodeBridge` constructor
  - Remove any hardcoded references to "Claude Code" (use "AI Assistant"
    instead)
  - Verification: Integration tests verify driver works with both Claude CLI and
    Codex CLI providers

- [ ] **T3.4** - Update autonomous commands to use ProviderFactory
  - Location: `extension/src/autonomousCommands.ts`
  - In command handlers, call
    `ProviderFactory.createCLIProvider(config.getPreferredCLIProvider())`
  - Pass provider to `AutonomousDriver` constructor
  - Remove inline terminal spawning (delegate to provider adapter)
  - Verification: Integration tests verify autonomous mode launches with correct
    provider based on config

- [ ] **T3.5** - Add config watcher for provider setting changes
  - Location: `extension/src/extension.ts` (in `activate()`)
  - Register `vscode.workspace.onDidChangeConfiguration()` listener
  - Filter for `gofer.cliProvider` changes
  - Call `ConfigManager.refresh()` and reinitialize provider via factory
  - Show notification: "AI provider switched to [provider name]"
  - Verification: Integration test changes setting and verifies provider
    switches without VSCode reload

**Verification Criteria**:

- [ ] ClaudeCodeBridge refactored to use LLMProvider interface
- [ ] Autonomous mode works with both Claude CLI and Codex CLI
- [ ] Provider switching via settings works without VSCode reload
- [ ] Backward compatibility: existing autonomous tests pass with default
      settings
- [ ] All Phase 3 integration tests pass

---

### Phase 4: Usage Tracking and Provider-Specific Features

**Goal**: Implement usage tracking for both CLI providers, handle
provider-specific features (MCP servers for Claude, web search for Codex) with
graceful degradation.

**Tasks**:

- [ ] **T4.1** - Implement `CodexUsageAdapter` for Codex log parsing
  - Location: `extension/src/autonomous/CodexUsageAdapter.ts`
  - Parse `~/.codex/history.json` (JSON format, different from Claude JSONL)
  - Extract token usage metrics: input tokens, output tokens, total tokens
  - Normalize to common format used by `ClaudeCodeUsageAdapter`
  - Verification: Unit tests verify parsing with sample Codex logs, handles
    missing/invalid logs gracefully

- [ ] **T4.2** - Extend `UsageLogger` to support multiple CLI providers
  - Location: Create `extension/src/autonomous/UsageAdapterFactory.ts`
  - Factory method:
    `createUsageAdapter(providerId: CLIProviderId): UsageAdapter`
  - Returns `ClaudeCodeUsageAdapter` for `claude-cli`, `CodexUsageAdapter` for
    `codex-cli`
  - Verification: Unit tests verify factory creates correct adapter based on
    provider ID

- [ ] **T4.3** - Update AI Usage panel to show provider name
  - Location: `extension/src/views/AIUsageTreeDataProvider.ts`
  - Add provider column to tree items: "Claude CLI: 50K tokens" vs "Codex CLI:
    30K tokens"
  - Aggregate usage across provider switches (separate totals per provider)
  - Verification: UI test verifies provider name appears in usage panel, totals
    correct

- [ ] **T4.4** - Implement provider capability detection for MCP servers
  - Location: `extension/src/council/providers/cli/providerCapabilities.ts`
  - Function: `supportsMCPServers(providerId: ProviderId): boolean` (returns
    `true` only for `claude-cli`)
  - Check capability before activating MCP server integration
  - Show notification if user tries MCP with Codex: "MCP servers require Claude
    CLI. Switch provider or use alternative approach"
  - Verification: Integration test verifies MCP activation only with Claude CLI

- [ ] **T4.5** - Implement provider capability detection for web search
  - Location: `extension/src/council/providers/cli/providerCapabilities.ts`
  - Function: `supportsWebSearch(providerId: ProviderId): boolean` (returns
    `true` only for `codex-cli`)
  - Check capability before invoking web search features
  - Show notification if user tries web search with Claude: "Web search requires
    Codex CLI. Switch provider or use alternative approach"
  - Verification: Integration test verifies web search only with Codex CLI

**Verification Criteria**:

- [ ] Codex usage logs parsed correctly, token counts accurate
- [ ] AI Usage panel displays provider name alongside token counts
- [ ] MCP servers only activate with Claude CLI provider
- [ ] Web search features only activate with Codex CLI provider
- [ ] Capability notifications appear when using incompatible provider
- [ ] All Phase 4 tests pass with 80%+ coverage

---

### Phase 5: Polish, Documentation & Final Integration

**Goal**: Complete documentation, validate 100% spec coverage, ensure backward
compatibility, and verify all success criteria are met.

**Tasks**:

- [ ] **T5.1** - Write provider selection user documentation
  - Location: `docs/multi-provider-cli-support.md`
  - Document: How to install Claude CLI and Codex CLI
  - Document: How to select provider in VSCode settings
  - Document: Provider comparison table (features, performance, cost
    implications)
  - Document: Troubleshooting guide (provider not found, authentication
    failures)
  - Verification: Documentation review, no broken links, screenshots up-to-date

- [ ] **T5.2** - Update extension README with provider selection section
  - Location: `extension/README.md`
  - Add "AI Provider Selection" section with dropdown screenshot
  - Add CLI installation commands for both providers
  - Add auto-detection explanation
  - Verification: README renders correctly in VSCode marketplace

- [ ] **T5.3** - Run full E2E test suite with both providers
  - Run pipeline stages (/0_business_scenario through /6_gofer_validate) with
    Claude CLI
  - Run same pipeline stages with Codex CLI
  - Compare outputs: verify identical spec.md structure, task breakdown,
    validation scores
  - Verification: E2E tests pass with both providers, outputs structurally
    equivalent

- [ ] **T5.4** - Validate backward compatibility with existing tests
  - Run full test suite with default "auto" setting (should prefer Claude if
    installed)
  - Verify all existing integration tests pass without modification
  - Verify autonomous mode tests pass
  - Verify validation tests pass
  - Verification: Zero test failures, no regressions introduced

- [ ] **T5.5** - Verify 100% spec traceability
  - Audit all user stories (5 stories) against implementation
  - Audit all functional requirements (FR-001 through FR-020) against code
  - Verify all acceptance criteria have corresponding tests
  - Update spec.md with implementation notes if needed
  - Verification: Traceability matrix complete (see section below), no missing
    coverage

- [ ] **T5.6** - Performance benchmarking and optimization
  - Benchmark provider switching latency (target: <500ms)
  - Benchmark CLI query latency vs API query latency (target: <2x)
  - Benchmark auto-detection time (target: <2s)
  - Optimize if benchmarks fail: cache provider instances, reuse terminal
    sessions
  - Verification: All performance benchmarks meet NFR targets

- [ ] **T5.7** - Final code quality checks
  - Run ESLint with zero warnings
  - Run TypeScript compiler in strict mode (no errors)
  - Verify coverage ≥80% across all metrics (line, branch, function)
  - Run `npm run format` to ensure consistent formatting
  - Verification: All quality gates pass, ready for PR

**Verification Criteria**:

- [ ] Documentation complete and accurate
- [ ] E2E tests pass with both providers, outputs equivalent
- [ ] Backward compatibility verified (all existing tests pass)
- [ ] 100% spec traceability confirmed (see Spec Traceability section)
- [ ] Performance benchmarks meet targets
- [ ] Code quality gates pass (ESLint, TypeScript strict, 80%+ coverage)
- [ ] Feature ready for release

---

## File Structure

```text
extension/src/
├── council/
│   ├── providers/
│   │   ├── cli/                          # NEW DIRECTORY
│   │   │   ├── CLIProviderAdapter.ts     # NEW - Base CLI adapter
│   │   │   ├── ClaudeCodeCLIProvider.ts  # NEW - Claude CLI implementation
│   │   │   ├── CodexCLIProvider.ts       # NEW - Codex CLI implementation
│   │   │   ├── providerCapabilities.ts   # NEW - MCP/web search detection
│   │   │   └── index.ts                  # NEW - Exports
│   │   ├── LLMProvider.ts                # EXISTING - Interface (no changes)
│   │   ├── ProviderFactory.ts            # MODIFIED - Add createCLIProvider()
│   │   ├── ProviderError.ts              # EXISTING - Error types (no changes)
│   │   └── index.ts                      # MODIFIED - Export CLI providers
│   └── types.ts                          # MODIFIED - Add CLIProviderId type
│
├── autonomous/
│   ├── AutonomousDriver.ts               # MODIFIED - Accept LLMProvider param
│   ├── ClaudeCodeUsageAdapter.ts         # EXISTING - Claude log parsing
│   ├── CodexUsageAdapter.ts              # NEW - Codex log parsing
│   ├── UsageAdapterFactory.ts            # NEW - Usage adapter factory
│   └── TerminalManager.ts                # EXISTING - Terminal spawning (no changes)
│
├── views/
│   └── AIUsageTreeDataProvider.ts        # MODIFIED - Show provider name
│
├── claudeCodeBridge.ts                   # MODIFIED - Accept LLMProvider, refactor query
├── autonomousCommands.ts                 # MODIFIED - Use ProviderFactory
├── config.ts                             # MODIFIED - Add CLI provider getters
├── extension.ts                          # MODIFIED - Add config watcher, health check
└── package.json                          # MODIFIED - Add CLI provider settings

tests/
├── unit/
│   ├── providers/
│   │   ├── CLIProviderAdapter.test.ts    # NEW - Base adapter tests
│   │   ├── ClaudeCodeCLIProvider.test.ts # NEW - Claude CLI tests
│   │   ├── CodexCLIProvider.test.ts      # NEW - Codex CLI tests
│   │   └── ProviderFactory.test.ts       # MODIFIED - Add CLI provider tests
│   ├── config/
│   │   └── ConfigManager.test.ts         # MODIFIED - Add CLI getter tests
│   └── autonomous/
│       ├── CodexUsageAdapter.test.ts     # NEW - Codex log parsing tests
│       └── UsageAdapterFactory.test.ts   # NEW - Factory tests
│
├── integration/
│   ├── provider-switching.test.ts        # NEW - Provider switching integration
│   ├── autonomous-mode-cli.test.ts       # NEW - Autonomous with both CLIs
│   ├── auto-detection.test.ts            # NEW - CLI detection logic
│   └── backward-compatibility.test.ts    # NEW - Existing tests with default settings
│
├── e2e/
│   └── full-pipeline-cli.test.ts         # NEW - Full pipeline with both providers
│
└── fixtures/
    └── cli-providers/
        ├── claude-output.txt             # NEW - Sample Claude CLI output
        ├── codex-output.json             # NEW - Sample Codex CLI output
        ├── claude-history.jsonl          # NEW - Sample Claude usage log
        └── codex-history.json            # NEW - Sample Codex usage log

docs/
└── multi-provider-cli-support.md         # NEW - User documentation

.specify/specs/027-multi-provider-cli-support/
├── spec.md                               # EXISTING - Feature specification
├── research.md                           # EXISTING - Codebase research
├── plan.md                               # THIS FILE
└── tasks.md                              # NEXT STEP - Task breakdown
```

**File Change Summary**:

- **New Files**: 19 (8 implementation, 11 test)
- **Modified Files**: 11 (8 implementation, 3 test)
- **Total Files Affected**: 30

---

## Risk Assessment

| Risk                                                    | Impact                                                             | Mitigation                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **CLI output format changes in future versions**        | HIGH - Parsing breaks on CLI updates, provider unavailable         | Version-specific parsers with regex fallback, version checks during health check, comprehensive error logging |
| **ClaudeCodeBridge refactoring introduces regressions** | HIGH - Breaks existing autonomous mode workflows                   | 100% test coverage on bridge, backward compatibility test suite, gradual rollout with feature flag            |
| **Terminal spawning performance overhead**              | MEDIUM - CLI queries 2-10x slower than API calls                   | Cache provider instances, reuse terminal sessions, document performance trade-offs                            |
| **User confusion about provider selection**             | MEDIUM - Users don't understand when to use which provider         | Clear documentation with provider comparison table, auto-detection as default (zero config)                   |
| **CLI installation friction**                           | MEDIUM - Users blocked if CLI not installed                        | Proactive health checks with actionable error messages including installation commands                        |
| **Authentication complexity across providers**          | MEDIUM - Different auth mechanisms per CLI (API key vs session)    | Provider-specific health checks, clear auth failure messages with resolution steps                            |
| **Provider-specific features create UX inconsistency**  | LOW - Users expect features available on both providers            | Capability detection with graceful degradation, clear notifications when feature unavailable                  |
| **Conversation history loss on provider switch**        | LOW - Users lose context when switching mid-session                | Document behavior: switching providers resets conversation (by design for clean state)                        |
| **Config setting changes mid-session**                  | LOW - Provider switches during active operation could cause errors | Config watcher reinitializes provider immediately, document recommendation to switch between sessions         |
| **Test coverage gaps in CLI adapters**                  | LOW - Bugs in parsing or error handling slip through               | Mock PTY in unit tests, real CLI in optional E2E tests, 85%+ coverage target for adapters                     |

**High-Risk Mitigation Actions**:

1. **CLI Version Compatibility**: Implement version detection and maintain
   parser compatibility matrix
2. **ClaudeCodeBridge Refactoring**: Phased approach - refactor constructor
   first, then internal methods, with tests at each step
3. **Performance Regression**: Establish baseline benchmarks before
   implementation, compare after each phase

---

## Spec Traceability

### User Story Coverage

| Story                                                    | Status     | Plan References                                                                                                    |
| -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| **US-1: Provider Selection**                             | ✅ COVERED | Phase 1 (T1.2, T1.3), Phase 2 (T2.3, T2.4, T2.5) - VSCode settings dropdown, ConfigManager getters, auto-detection |
| **US-2: Transparent Provider Switching**                 | ✅ COVERED | Phase 3 (T3.1-T3.5) - ClaudeCodeBridge refactoring, AutonomousDriver DI, config watcher for immediate switching    |
| **US-3: Auto-Detection and Helpful Errors**              | ✅ COVERED | Phase 2 (T2.4, T2.5) - Auto-detection logic, health checks with installation instructions                          |
| **US-4: Provider-Specific Feature Graceful Degradation** | ✅ COVERED | Phase 4 (T4.4, T4.5) - Capability detection for MCP servers and web search with notifications                      |
| **US-5: Usage Tracking Across Providers**                | ✅ COVERED | Phase 4 (T4.1, T4.2, T4.3) - CodexUsageAdapter, UsageAdapterFactory, AI Usage panel updates                        |

**Coverage**: 5/5 user stories (100%)

### Requirement Coverage

#### Functional Requirements

| FR-ID      | Status     | Plan Reference                                                                      |
| ---------- | ---------- | ----------------------------------------------------------------------------------- |
| **FR-001** | ✅ COVERED | Phase 1 (T1.1), Phase 2 (T2.1, T2.2) - CLI adapter implements LLMProvider interface |
| **FR-002** | ✅ COVERED | Phase 1 (T1.2, T1.3) - VSCode settings dropdown with 3 options                      |
| **FR-003** | ✅ COVERED | Phase 2 (T2.4) - Auto-detect checks Claude → Codex → null                           |
| **FR-004** | ✅ COVERED | Phase 3 (T3.5) - Config watcher applies changes immediately                         |
| **FR-005** | ✅ COVERED | Phase 3 (T3.1, T3.2) - ClaudeCodeBridge maintains abstract history                  |
| **FR-006** | ✅ COVERED | Phase 5 (T5.4) - Backward compatibility test suite, default "auto" setting          |
| **FR-007** | ✅ COVERED | Phase 5 (T5.3) - E2E tests verify pipeline stages identical across providers        |
| **FR-008** | ✅ COVERED | Phase 3 (T3.3, T3.4) - AutonomousDriver accepts LLMProvider parameter               |
| **FR-009** | ✅ COVERED | Phase 5 (T5.3) - Validation agents use provider interface (tested in E2E)           |
| **FR-010** | ✅ COVERED | Phase 5 (T5.3) - LLM Council uses ProviderFactory (tested in E2E)                   |
| **FR-011** | ✅ COVERED | Phase 2 (T2.5) - Health check notifications with installation commands              |
| **FR-012** | ✅ COVERED | Phase 2 (T2.1, T2.2) - Health check validates authentication, shows auth steps      |
| **FR-013** | ✅ COVERED | Phase 1 (T1.1) - CLIProviderAdapter handles process failures, retry logic           |
| **FR-014** | ✅ COVERED | Phase 4 (T4.4) - MCP server capability detection for Claude CLI only                |
| **FR-015** | ✅ COVERED | Phase 4 (T4.5) - Web search capability detection for Codex CLI only                 |
| **FR-016** | ✅ COVERED | Phase 4 (T4.4, T4.5) - Capability notifications for incompatible features           |
| **FR-017** | ✅ COVERED | Phase 4 (T4.1, T4.2, T4.3) - Separate token tracking per provider                   |
| **FR-018** | ✅ COVERED | Phase 4 (T4.1) - Claude JSONL log parsing (existing ClaudeCodeUsageAdapter)         |
| **FR-019** | ✅ COVERED | Phase 4 (T4.1) - Codex JSON log parsing (new CodexUsageAdapter)                     |
| **FR-020** | ✅ COVERED | Phase 4 (T4.3) - AI Usage panel shows provider name with token counts               |

**Coverage**: 20/20 functional requirements (100%)

#### Non-Functional Requirements

| NFR-ID      | Status     | Plan Reference                                                                    |
| ----------- | ---------- | --------------------------------------------------------------------------------- |
| **NFR-001** | ✅ COVERED | Phase 5 (T5.6) - Provider switching latency benchmark <500ms                      |
| **NFR-002** | ✅ COVERED | Phase 5 (T5.6) - CLI query latency benchmark <2x API latency                      |
| **NFR-003** | ✅ COVERED | Phase 5 (T5.6) - Auto-detection latency benchmark <2s                             |
| **NFR-004** | ✅ COVERED | Phase 4 (T4.1) - Usage adapters sanitize logs before display                      |
| **NFR-005** | ✅ COVERED | Phase 1 (T1.1) - CLI output validation with schema checks                         |
| **NFR-006** | ✅ COVERED | Phase 2 (T2.1, T2.2) - Health check validates CLI version 1.0.0+/2.0.0+           |
| **NFR-007** | ✅ COVERED | Phase 1 (T1.1) - CLI adapters implement existing LLMProvider interface            |
| **NFR-008** | ✅ COVERED | Phase 2 (T2.4) - Auto-detection uses cross-platform execFile                      |
| **NFR-009** | ✅ COVERED | Phase 1 (T1.1) - Base adapter class reduces per-provider code to <100 LOC         |
| **NFR-010** | ✅ COVERED | Phase 1 (T1.1), Phase 2 (T2.1, T2.2) - Provider logic isolated in adapter classes |
| **NFR-011** | ✅ COVERED | All phases - Unit, integration, E2E tests with 80%+ coverage target               |

**Coverage**: 11/11 non-functional requirements (100%)

### Acceptance Criteria Coverage

All acceptance criteria from user stories mapped to tasks:

**US-1 Acceptance Criteria**:

- Settings dropdown: T1.2 (VSCode settings schema)
- Three options: T1.2 (enum definition)
- Default "Auto-detect": T1.2 (default value)
- Persistence: T1.3 (ConfigManager storage)
- Confirmation notification: T3.5 (config watcher)
- Immediate effect: T3.5 (no reload required)

**US-2 Acceptance Criteria**:

- 1 click switching: T1.2 (dropdown UI)
- Pipeline identical: T5.3 (E2E tests)
- Autonomous identical: T3.3, T3.4 (provider injection)
- Validation identical: T5.3 (E2E tests)
- Council identical: T5.3 (E2E tests)
- No manual config: T2.4 (auto-detection)
- Context maintained: T3.1, T3.2 (abstract history)
- Provider-agnostic errors: T3.3 (remove "Claude" references)

**US-3 Acceptance Criteria**:

- Auto-detect order: T2.4 (Claude → Codex)
- Neither found error: T2.5 (health check notifications)
- Selected CLI missing: T2.5 (health check)
- Version check output: T2.1, T2.2 (health check implementation)
- Clickable docs link: T2.5 (notification with link)
- Proactive health check: T2.5 (extension activation)
- Status indicator: T2.5 (settings UI enhancement)

**US-4 Acceptance Criteria**:

- Capability comparison table: T5.1 (documentation)
- Provider limitation notification: T4.4, T4.5 (capability checks)
- MCP only with Claude: T4.4
- Web search only with Codex: T4.5
- Common capabilities work: T5.3 (E2E tests)
- Settings UI capability matrix: T5.1 (documentation)

**US-5 Acceptance Criteria**:

- Provider name in panel: T4.3 (AI Usage panel)
- Separate tracking: T4.1, T4.2 (usage adapters)
- Claude JSONL parsing: T4.1 (reuse existing adapter)
- Codex JSON parsing: T4.1 (new adapter)
- Aggregation across switches: T4.3 (usage panel logic)
- Export with provider breakdown: T4.3 (panel export)

**Acceptance Criteria Coverage**: 100% (all 35+ criteria mapped to tasks)

---

## Key Architecture Decisions Made

1. **Extend LLMProvider Interface for CLI Providers**: Reuse proven abstraction
   layer instead of creating separate CLI interface. Adapters translate terminal
   I/O to API-like `query()` method, eliminating duplication and preserving
   factory pattern.

2. **Two-Tier Provider System (API + CLI)**: API providers remain unchanged for
   fast council queries. CLI providers serve autonomous mode. ConfigManager
   determines which tier to use, enabling optimal performance per use case.

3. **Adapter Pattern with Base Class**: `CLIProviderAdapter` base class provides
   common logic (process spawning, error handling, health checks). Derived
   classes (Claude, Codex) implement provider-specific parsing (~50-80 LOC
   each), meeting <100 LOC extensibility target.

4. **Auto-Detection as Default**: "auto" setting eliminates configuration
   friction. Detection order (Claude → Codex) ensures consistent behavior.
   Health checks on activation provide proactive error notifications.

5. **Provider-Agnostic Bridge Refactoring**: ClaudeCodeBridge accepts
   `LLMProvider` interface via dependency injection. This single refactoring
   enables provider switching across autonomous mode, pipeline commands, and
   validation agents without touching each component.

6. **Capability Detection Over Feature Parity**: MCP servers and web search are
   provider-specific. Instead of forcing parity, implement capability detection
   with graceful degradation and clear notifications, preserving user choice.

7. **Conversation History Abstraction**: Store history in provider-agnostic
   format, translate to provider-specific format on each query. This enables
   switching providers mid-session (with explicit conversation reset) and future
   support for cross-provider history.

8. **Version-Specific Parsers**: CLI output parsing has fallback strategy:
   version-specific parser → regex extraction → error. This mitigates CLI update
   risk while maintaining clean happy-path code.

---

## Risks Flagged as HIGH

1. **CLI Output Format Changes**: If Claude CLI or Codex CLI change output
   format in minor versions, parsing breaks and provider becomes unavailable.
   **Mitigation**: Version checks during health check, parser compatibility
   matrix, regex fallback, comprehensive error logging.

2. **ClaudeCodeBridge Refactoring Regressions**: ClaudeCodeBridge is core to
   autonomous mode. Refactoring risks breaking existing workflows.
   **Mitigation**: 100% test coverage on bridge before and after refactoring,
   backward compatibility test suite runs all existing autonomous tests, phased
   refactoring approach (constructor first, then methods).

---

**Plan Status**: ✅ **READY FOR IMPLEMENTATION**

All user stories covered, all requirements traced, architecture decisions
documented, risks assessed. Zero unknowns remaining. Ready for `/4_gofer_tasks`
to generate detailed task breakdown.
