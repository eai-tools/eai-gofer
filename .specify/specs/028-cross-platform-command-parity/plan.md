---
feature: 028-cross-platform-command-parity
spec: spec.md
research: research.md
status: ready
created: 2026-03-18
---

# Implementation Plan: Cross-Platform Command Parity

**Branch**: `028-cross-platform-command-parity` | **Date**: 2026-03-18 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from
`.specify/specs/028-cross-platform-command-parity/spec.md`

## Summary

Complete Feature 027 (multi-provider-cli-support) by delivering actual command
availability across all three AI platforms: Claude Code CLI, GitHub Copilot
Chat, and Codex CLI. While Feature 027 implemented backend API switching and
provider detection, it did not make Gofer's 18 commands accessible outside
Claude Code CLI. This feature creates platform-specific command files
(`.system/skills/` for Codex, enhanced `.github/prompts/` for Copilot) with
intelligent routing, auto-chaining through 7 pipeline stages, parallel
validation agent spawning (6 agents), conversation history preservation across
provider switches, and default provider selection via VSCode settings.

The technical approach uses cross-platform command generation from a single
source of truth (`.claude/commands/`), platform detection via execution context
analysis with fallback to user preference, and instruction-based auto-chaining
without server-side enforcement. All 18 commands achieve identical behavior
across platforms, verified by comprehensive integration tests comparing output
artifacts for structural equivalence.

## Technical Context

**Tech Stack**:

- TypeScript 5.5+ (strict mode enabled)
- VSCode Extension API 1.80+
- Node.js 18+ (extension runtime)
- Vitest for unit/integration testing
- YAML frontmatter parsing (existing infrastructure)
- Markdown parsing for command files

**Architecture**: Three-layer cross-platform command system:

```
┌─────────────────────────────────────────────────────────────┐
│                 VSCode Extension Layer                       │
│  ┌────────────────────────────────────────────────────┐     │
│  │  CrossPlatformCommandRouter                        │     │
│  │  - Platform Detection (Claude/Copilot/Codex)       │     │
│  │  - Command Routing (3 directories)                 │     │
│  │  - Default Provider Enforcement                    │     │
│  └─────────────────┬──────────────────────────────────┘     │
│                    │                                          │
│       ┌────────────┼────────────┐                            │
│       │            │            │                             │
│       ▼            ▼            ▼                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│  │ Claude  │ │ Copilot │ │  Codex  │                        │
│  │ Provider│ │ Provider│ │ Provider│                        │
│  └─────────┘ └─────────┘ └─────────┘                        │
└─────────────────────────────────────────────────────────────┘
           │            │            │
           ▼            ▼            ▼
    ┌───────────┐ ┌───────────┐ ┌───────────┐
    │ .claude/  │ │ .github/  │ │ .system/  │
    │ commands/ │ │ prompts/  │ │ skills/   │
    │  (18)     │ │  (18)     │ │  (18)     │
    └───────────┘ └───────────┘ └───────────┘
         │              │             │
         └──────────────┴─────────────┘
                        │
                ┌───────▼────────┐
                │ Command Files  │
                │ Generator      │
                │ (single source)│
                └────────────────┘
```

**Integration Points**:

| Component           | File                                                            | Integration Type                           |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| Extension Entry     | `extension/src/extension.ts:115-230`                            | Initialize router on activation            |
| ConfigManager       | `extension/src/config.ts:125-402`                               | Add `getDefaultCLI()` getter               |
| ProviderFactory     | `extension/src/council/providers/ProviderFactory.ts:287-309`    | Extend auto-detection with default setting |
| Autonomous Commands | `extension/src/autonomousCommands.ts:968-1100`                  | Wire router to command execution           |
| MCP Tool Handler    | `language-server/src/mcp/toolHandler.ts`                        | Multi-directory skill search               |
| MCP Config          | `extension/src/mcpConfig.ts:26-34`                              | Guard MCP initialization by provider       |
| CLI Health Checker  | `extension/src/council/providers/cli/CLIHealthChecker.ts:36-95` | Reuse for platform availability checks     |

**Key Dependencies**:

- Existing: ProviderFactory, ConfigManager, CLIHealthChecker, ObservationMasker
  (credential redaction)
- New: CrossPlatformCommandRouter, CommandFileGenerator, FeatureParityTestSuite
- External: VSCode Workspace API (configuration), File System API (skill
  loading)

**Performance Goals**:

- Auto-chain latency <5 seconds between pipeline stages
- Parallel agent spawning overhead <10% of validation time
- Platform detection <100ms (cached after first check)
- Skill loading <500ms for 18 commands

**Constraints**:

- Zero configuration default (auto-detect platform)
- Backward compatibility with existing Claude commands
- No breaking changes to Feature 027 provider switching
- MCP servers remain Claude-only (guard with provider check)
- Conversation history preserved across provider switches (JSONL ↔ JSON
  normalization)

**Scale/Scope**:

- 18 commands × 3 platforms = 54 command files (generated from single source)
- 6 validation agents × 3 platforms = 18 validation instructions
- 7 pipeline stages with auto-chaining per platform
- 3 platform-specific execution contexts to detect

## Constitution Check

_GATE: Must pass before implementation. Re-check after code complete._

### I. Test-Driven Development (NON-NEGOTIABLE) ✅

**Alignment**: Full compliance

- Feature parity test suite written first (Phase 2) before implementation
  (Phase 3)
- Tests verify identical behavior: command availability (18/18), auto-chaining
  (7 stages), parallel agents (6 concurrent)
- Integration tests use mocked CLI providers to avoid external API dependencies
- Contract tests compare output artifacts (research.md, spec.md,
  validation-report.md) for schema equivalence

**Evidence**: User Story 6, FR-011, FR-018 mandate test suite creation with
specific coverage criteria

### II. MCP-First Architecture ✅

**Alignment**: Full compliance

- MCP Tool Handler extended to search multiple directories (`.claude/commands/`,
  `.system/skills/`, `.github/prompts/`)
- Codex skills use SKILL.md format compatible with MCP tool exposure
- Copilot prompts enhanced without breaking MCP integration
- MCP initialization guarded by provider check (FR-009)

**Evidence**: FR-010 (multi-directory search), FR-009 (MCP guards), Constraint 6
(Claude-only MCP)

### III. Spec Kit Format Compliance ✅

**Alignment**: Full compliance

- Spec follows GitHub Spec Kit format with YAML frontmatter, structured sections
- 7 user stories with acceptance criteria mapped to functional requirements
- 18 functional requirements traced to plan components
- Constitution validated before implementation (this section)

**Evidence**: All spec sections follow template structure, research traceability
matrix complete

### IV. Strict TypeScript & Code Quality ✅

**Alignment**: Full compliance

- CrossPlatformCommandRouter implemented in TypeScript strict mode
- No `any` types - proper interfaces for PlatformType, CommandMetadata
- Functions ≤300 lines enforced (router methods decomposed: detectPlatform,
  routeCommand, loadSkill)
- ConfigManager getter follows existing pattern (strip `gofer.` prefix)

**Evidence**: Pattern 6 (VSCode settings), existing ConfigManager code style,
FR-006 (typed enum)

### V. Security by Default ✅

**Alignment**: Full compliance

- Conversation history preservation uses ObservationMasker to redact credentials
  before provider switch (NFR-005)
- API keys never exposed in skill metadata or command files
- Path traversal prevention in multi-directory skill loading (sanitize file
  paths)
- No user input directly executed - all commands are predefined files

**Evidence**: NFR-005 (credential redaction), FR-008 (history preservation with
masking)

### VI. Performance Requirements ✅

**Alignment**: Full compliance

- Auto-chain latency <5s target (NFR-001)
- Parallel agent overhead <10% target (NFR-002)
- Platform detection cached after first check (<100ms subsequent calls)
- Skill loading <500ms for 18 commands (lazy loading with metadata pre-fetch)

**Evidence**: NFR-001, NFR-002, SC-003 (validation <60s), Performance Goals
section

### VII. 80% Test Coverage Minimum ✅

**Alignment**: Full compliance

- Feature parity test suite covers critical paths: platform detection, command
  routing, auto-chaining, parallel agents
- Unit tests for ConfigManager getter, ProviderFactory extension,
  CrossPlatformCommandRouter
- Integration tests for end-to-end command execution in all three platforms
- Performance tests for validation timing (sequential vs parallel baseline)

**Evidence**: User Story 6 (test coverage), FR-011 (test suite), FR-018
(performance tests)

### VIII. Minimal Necessary Changes ✅

**Alignment**: Full compliance

- Existing `.claude/commands/` files unchanged (reference implementation)
- ConfigManager: add single getter method `getDefaultCLI()` (10 lines)
- ProviderFactory: extend `autoDetectCLI()` to check setting first (5 lines)
- New files isolated in dedicated modules (CrossPlatformCommandRouter,
  CommandFileGenerator)
- No refactoring of unrelated code

**Evidence**: Constraint 1 (Claude is reference), NFR-006 (single source of
truth), brownfield analysis

**VERDICT**: ✅ All constitution principles satisfied. No violations requiring
justification. Proceed to implementation.

## Implementation Phases

### Phase 1: Setup & Foundation

**Goal**: Establish directory structure, VSCode settings, base types, and
command file generation infrastructure.

**Tasks**:

- [ ] Create `.system/skills/` directory structure with README explaining Codex
      CLI integration
- [ ] Add `gofer.defaultCLI` VSCode setting to `extension/package.json` with
      enum ["claude", "copilot", "codex", "auto"], default "auto", order 60
- [ ] Add ConfigManager getter `getDefaultCLI()` in `extension/src/config.ts`
      with key `'defaultCLI'` (strip prefix per convention)
- [ ] Add CONFIG_KEYS entry `defaultCLI: 'gofer.defaultCLI'` and DEFAULTS entry
      `defaultCLI: 'auto'`
- [ ] Define TypeScript types in
      `extension/src/council/types/CrossPlatformTypes.ts`:
  - `PlatformType = 'claude' | 'copilot' | 'codex'`
  - `CommandMetadata { name: string; description: string; platform: PlatformType }`
  - `PlatformDetectionContext { isExtensionHost: boolean; hasClaudeDir: boolean; hasGitHubDir: boolean; hasSystemDir: boolean }`
- [ ] Create `scripts/generate-commands.ts` skeleton with CLI parser and file
      system helpers
- [ ] Document command file format differences in
      `.specify/specs/028-cross-platform-command-parity/command-formats.md`

**Verification**:

- Settings UI shows `gofer.defaultCLI` dropdown with four options
- ConfigManager.getInstance().getDefaultCLI() returns 'auto' by default
- TypeScript compiles without errors
- `.system/skills/README.md` explains Codex skill discovery

**Dependencies**: None (foundation phase)

---

### Phase 2: Data Layer

**Goal**: Implement platform detection, command metadata extraction, and
settings integration.

**Tasks**:

- [ ] Implement `PlatformDetector` class in
      `extension/src/council/PlatformDetector.ts`:
  - `detectPlatform(context: PlatformDetectionContext): PlatformType | null`
  - Logic: Check execution context (VSCode extension host + `.claude/` → Claude,
    `.github/prompts/` → Copilot, `.system/skills/` → Codex)
  - Fallback to `ConfigManager.getInstance().getDefaultCLI()` if ambiguous
  - Cache detection result for performance
- [ ] Implement `CommandMetadataExtractor` in
      `extension/src/council/CommandMetadataExtractor.ts`:
  - `extractFromClaudeCommand(filePath: string): CommandMetadata`
  - `extractFromCopilotPrompt(filePath: string): CommandMetadata`
  - `extractFromCodexSkill(filePath: string): CommandMetadata`
  - Parse YAML frontmatter and extract name/description
- [ ] Extend `ProviderFactory.autoDetectCLI()` to check `gofer.defaultCLI`
      setting before running detection
  - If setting !== 'auto', validate preferred CLI is available
    (CLIHealthChecker)
  - If preferred CLI unavailable, show error with installation instructions and
    fallback suggestion
  - Log detection decision: "Using Claude Code CLI (user preference)" or
    "Auto-detected Codex CLI"
- [ ] Write unit tests in `tests/unit/council/PlatformDetector.test.ts`:
  - Test all platform detection scenarios (Claude context, Copilot context,
    Codex context, ambiguous)
  - Test fallback to setting when context unclear
  - Test cache behavior (first detection slow, subsequent fast)
- [ ] Write unit tests in `tests/unit/council/CommandMetadataExtractor.test.ts`:
  - Test extraction from each platform's command file format
  - Test error handling (invalid YAML, missing fields)

**Verification**:

- Platform detector correctly identifies execution context
- Fallback to user preference works when detection ambiguous
- Metadata extraction parses all 18 existing Claude commands
- Tests pass with 100% coverage for detector and extractor
- ProviderFactory logs platform selection decision

**Dependencies**: Phase 1 (types, settings)

---

### Phase 3: Business Logic

**Goal**: Implement cross-platform router, command generators, and auto-chain
instructions.

**Tasks**:

- [ ] Implement `CrossPlatformCommandRouter` in
      `extension/src/council/CrossPlatformCommandRouter.ts`:
  - `constructor(platformDetector: PlatformDetector, configManager: ConfigManager)`
  - `routeCommand(commandName: string): Promise<CommandFile>`
  - `loadSkillForPlatform(commandName: string, platform: PlatformType): Promise<CommandFile>`
  - Priority: `.claude/commands/` > `.system/skills/` > `.github/prompts/`
  - Path sanitization to prevent traversal attacks
- [ ] Implement `CommandFileGenerator` in `scripts/generate-commands.ts`:
  - `generateCodexSkill(claudeCommand: CommandFile): CodexSkill`
    - Transform YAML frontmatter: `description` → `name` + `description`
    - Inject auto-chain instructions: "Run `$ $[next-skill]` or let Codex
      auto-select next skill"
    - Create directory structure: `.system/skills/[command-name]/SKILL.md`
  - `enhanceCopilotPrompt(claudeCommand: CommandFile, existingPrompt: CommandFile): CopilotPrompt`
    - Preserve existing YAML frontmatter (name, agent, tools, argument-hint)
    - Inject "AUTO-CHAIN" section: "Type `/[next-command]` in next message"
    - Inject "Parallel Agent Spawning" section for validation command (6 agents)
    - Add backward compatibility notes for pre-2026 Copilot versions
  - `generateAll()`: Loop through 18 Claude commands and generate all platform
    versions
  - Validate generated files: check YAML validity, required fields present
- [ ] Add auto-chain instructions to generated Codex skills:

  ```markdown
  ## AUTO-CHAIN (Next Stage)

  After completing this stage, automatically proceed to the next: **For Codex
  CLI**: Run `$ $[next-command]`
  ```

- [ ] Add parallel agent instructions to validation command:

  ```markdown
  ## Parallel Agent Spawning

  **For Codex CLI**: Use concurrent sub-prompts or agent sessions Spawn 6 agents
  in parallel: correctness, security, performance, test-quality, integration,
  standards Reference: `.claude/agents/validation-*.md` for each agent's
  instructions
  ```

- [ ] Implement conversation history preservation in
      `ProviderFactory.getCLIProvider()`:
  - Before switching providers:
    `oldHistory = oldProvider.getConversationHistory()`
  - Normalize format: JSONL → JSON or JSON → JSONL via adapter
  - Apply ObservationMasker to redact credentials
  - After switching: `newProvider.setConversationHistory(normalizedHistory)`
  - Show notification: "Switching to [provider] - conversation history
    preserved"
- [ ] Write unit tests in
      `tests/unit/council/CrossPlatformCommandRouter.test.ts`:
  - Test routing to correct platform directory
  - Test priority fallback (Claude > Codex > Copilot)
  - Test path sanitization (reject "../../../etc/passwd")
  - Test caching behavior
- [ ] Write integration tests in `tests/integration/command-generation.test.ts`:
  - Test generator creates valid Codex skills (YAML parses correctly)
  - Test generator preserves existing Copilot prompt metadata
  - Test auto-chain instructions present in all stage commands
  - Test parallel agent instructions present in validation command

**Verification**:

- Router selects correct command directory based on platform
- Generator creates 18 valid Codex skills with correct YAML frontmatter
- Generator enhances 18 Copilot prompts without breaking existing metadata
- Auto-chain instructions use platform-specific syntax
- History preservation redacts credentials and normalizes format
- Tests pass with 80%+ coverage

**Dependencies**: Phase 2 (detection, metadata)

---

### Phase 4: API/Interface Layer

**Goal**: Wire router to VSCode commands, register settings watchers, integrate
with CLI execution.

**Tasks**:

- [ ] Update `extension/src/extension.ts` activation:
  - Initialize `CrossPlatformCommandRouter` after ConfigManager creation
  - Register settings watcher for `gofer.defaultCLI` changes
  - On setting change: call `router.clearCache()` to re-detect platform
- [ ] Wire router to `AutonomousCommands` in
      `extension/src/autonomousCommands.ts`:
  - Inject `CrossPlatformCommandRouter` into constructor
  - Before executing command:
    `commandFile = await router.routeCommand(commandName)`
  - Use routed file path for command execution
  - Preserve existing context injection logic
- [ ] Update MCP Tool Handler in `language-server/src/mcp/toolHandler.ts`:
  - Implement multi-directory skill search with priority
  - `searchSkillDirectories(skillName: string): string[]` - returns paths in
    priority order
  - Use first found skill file
  - Log search path: "Searching for skill in: [.claude/commands, .system/skills,
    .github/prompts]"
- [ ] Guard MCP initialization in `extension/src/mcpConfig.ts`:
  - Check `cliProvider !== 'copilot' && cliProvider !== 'codex'` before MCP
    setup
  - If non-Claude provider: log "MCP servers available in Claude Code CLI only"
  - Skip MCP server configuration gracefully
- [ ] Add error message normalization to CLI provider adapters:
  - `ClaudeCodeCLIProvider.translateError()`: Map platform errors to
    user-friendly messages
  - `CodexCLIProvider.translateError()`: Same pattern
  - Standard format: "Command '[name]' not available - ensure [platform] CLI is
    installed and up-to-date. [recovery instructions]"
- [ ] Write integration tests in
      `tests/integration/autonomous-commands.test.ts`:
  - Mock CrossPlatformCommandRouter
  - Verify AutonomousCommands calls router before execution
  - Test command execution with routed file path
  - Test error handling when command not found
- [ ] Write integration tests in `tests/integration/mcp-integration.test.ts`:
  - Test MCP Tool Handler searches multiple directories
  - Test priority fallback (finds Claude first, then Codex)
  - Test MCP initialization skipped for Copilot/Codex
  - Verify graceful degradation message logged

**Verification**:

- Settings change triggers platform re-detection
- Commands execute using routed file path
- MCP Tool Handler finds skills in all three directories
- MCP initialization skipped for non-Claude providers
- Error messages follow standard format with recovery instructions
- Tests pass with 80%+ coverage

**Dependencies**: Phase 3 (router, generator)

---

### Phase 5: Polish & Integration

**Goal**: Documentation, feature parity tests, performance validation, final
verification.

**Tasks**:

- [ ] Implement feature parity test suite in
      `tests/integration/cross-platform-parity.test.ts`:
  - **Test Category 1: Command Availability** (18/18 commands callable in each
    platform)
    - Mock platform detection for Claude, Copilot, Codex
    - Call router.routeCommand() for each of 18 commands
    - Assert file exists and has valid YAML frontmatter
  - **Test Category 2: Auto-Chain Functionality** (7 stages execute
    automatically)
    - Mock skill execution for orchestrator command
    - Verify each stage outputs instruction to invoke next stage
    - Assert stage N completion triggers stage N+1 start
  - **Test Category 3: Parallel Agent Spawning** (6 concurrent agents)
    - Parse validation command for each platform
    - Assert "Parallel Agent" section exists with 6 agent definitions
    - Verify agents reference `.claude/agents/validation-*.md`
  - **Test Category 4: Context Preservation** (history persists across switches)
    - Mock ProviderFactory with Claude session (5 messages)
    - Switch to Codex provider
    - Assert Codex receives normalized 5-message history
    - Switch back to Claude
    - Assert full history intact
  - **Test Category 5: Output Structure Equivalence** (research.md, spec.md,
    validation-report.md schemas identical)
    - Generate research.md in each platform (mocked execution)
    - Compare YAML frontmatter fields (id, title, status, date)
    - Compare section headings (Feature Summary, Codebase Analysis, etc.)
    - Assert structural equivalence (same sections, same order)
- [ ] Implement performance tests in
      `tests/performance/validation-parallel.test.ts`:
  - Measure validation time with parallel agents (6 concurrent)
  - Measure validation time with sequential agents (6 sequential)
  - Assert parallel time <60s and <67% of sequential time (1.5x speedup)
  - Measure spawning overhead: (spawn time / total time) <10%
- [ ] Run command generator and commit generated files:
  - `npm run generate-commands` (executes `scripts/generate-commands.ts`)
  - Verify 18 Codex skills created in `.system/skills/[command-name]/SKILL.md`
  - Verify 18 Copilot prompts enhanced in `.github/prompts/[command].prompt.md`
  - Commit generated files with message: "Generate cross-platform command files
    from .claude/commands/ source"
- [ ] Update README.md with Platform Capabilities section:
  - Create comparison table (Feature × Platform matrix)
  - Rows: 18 Gofer commands, MCP servers, Autonomous mode, Context preservation,
    Auto-chaining, Parallel agents
  - Columns: Claude Code CLI, Copilot Chat, Codex CLI
  - Cells: ✓ Full / ⚠ Partial / ✗ Not Available with footnotes
  - Add links to platform-specific setup guides
- [ ] Create platform setup guides:
  - `docs/setup-claude-code.md` - Claude Code CLI installation and configuration
  - `docs/setup-copilot-chat.md` - Copilot Chat installation and prompt usage
  - `docs/setup-codex-cli.md` - Codex CLI installation and skill discovery
  - Link from README capability matrix
- [ ] Create legacy workflow documentation:
  - `docs/legacy-workflow.md` - Sequential validation for pre-2026 Copilot
    versions
  - Explain manual step-by-step agent execution
  - Link from Copilot prompt backward compatibility section
- [ ] Update CHANGELOG.md with feature summary:
  - Major version bump (new feature: cross-platform commands)
  - List all 18 commands now available in Codex/Copilot
  - Document new `gofer.defaultCLI` setting
  - Link to setup guides
- [ ] Run full test suite and verify 100% pass rate:
  - `npm test -- cross-platform-parity.test.ts`
  - `npm test -- validation-parallel.test.ts`
  - All unit and integration tests
- [ ] Manual verification checklist:
  - [ ] Set `gofer.defaultCLI` to "codex", run command, verify routes to Codex
        skill
  - [ ] Set `gofer.defaultCLI` to "copilot", run command, verify routes to
        Copilot prompt
  - [ ] Set `gofer.defaultCLI` to "auto", verify auto-detects available CLI
  - [ ] Run orchestrator command, verify auto-chains through 7 stages (mocked
        execution)
  - [ ] Run validation command, verify 6 agents spawn in parallel (check logs)
  - [ ] Switch Claude → Codex → Claude, verify conversation history preserved
  - [ ] Check MCP initialization skipped for Codex (log message present)
  - [ ] Verify Settings UI shows dropdown with descriptions
  - [ ] Verify capability matrix in README renders correctly
  - [ ] Follow each setup guide from scratch, verify steps complete successfully

**Verification**:

- Feature parity tests pass with 100% success rate (5 categories, all assertions
  pass)
- Performance tests confirm parallel agents <60s validation time
- Generated command files validate (YAML parses, frontmatter complete)
- README capability matrix accurate and links work
- Platform setup guides executable from fresh environment
- Manual verification checklist 100% complete
- CHANGELOG documents all new capabilities

**Dependencies**: Phases 1-4 (all prior work)

---

## File Structure

Complete tree of all new and modified files:

```
gofer/
├── .system/                          [NEW]
│   └── skills/                       [NEW - Codex CLI skills]
│       ├── README.md                 [NEW - Codex integration guide]
│       ├── 0-business-scenario/      [NEW]
│       │   └── SKILL.md              [NEW - Generated from Claude command]
│       ├── 1-gofer-research/         [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── 2-gofer-specify/          [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── 3-gofer-plan/             [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── 4-gofer-tasks/            [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── 5-gofer-implement/        [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── 6-gofer-validate/         [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── 7-gofer-save/             [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── 8-gofer-resume/           [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── 9-gofer-tests/            [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── 10-gofer-cloud/           [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── 0a-problem-validation/    [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── 6a-gofer-engineering-review/ [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── 7a-stakeholder-comms/     [NEW]
│       │   └── SKILL.md              [NEW]
│       ├── gofer-constitution/       [NEW]
│       │   └── SKILL.md              [NEW]
│       └── gofer-hydrate/            [NEW]
│           └── SKILL.md              [NEW]
│
├── .github/prompts/                  [MODIFIED - Enhanced for auto-chain]
│   ├── 0_business_scenario.prompt.md [MODIFIED - Add AUTO-CHAIN section]
│   ├── 1_gofer_research.prompt.md    [MODIFIED - Add AUTO-CHAIN section]
│   ├── 2_gofer_specify.prompt.md     [MODIFIED - Add AUTO-CHAIN section]
│   ├── 3_gofer_plan.prompt.md        [MODIFIED - Add AUTO-CHAIN section]
│   ├── 4_gofer_tasks.prompt.md       [MODIFIED - Add AUTO-CHAIN section]
│   ├── 5_gofer_implement.prompt.md   [MODIFIED - Add AUTO-CHAIN section]
│   ├── 6_gofer_validate.prompt.md    [MODIFIED - Add Parallel Agent section]
│   ├── 7_gofer_save.prompt.md        [MODIFIED]
│   ├── 8_gofer_resume.prompt.md      [MODIFIED]
│   ├── 9_gofer_tests.prompt.md       [MODIFIED]
│   ├── 10_gofer_cloud.prompt.md      [MODIFIED]
│   ├── 0a_problem_validation.prompt.md [MODIFIED]
│   ├── 6a_gofer_engineering_review.prompt.md [MODIFIED]
│   ├── 7a_stakeholder_comms.prompt.md [MODIFIED]
│   ├── gofer_constitution.prompt.md  [MODIFIED]
│   └── gofer_hydrate.prompt.md       [MODIFIED]
│
├── extension/
│   ├── package.json                  [MODIFIED - Add gofer.defaultCLI setting]
│   ├── src/
│   │   ├── extension.ts              [MODIFIED - Initialize router]
│   │   ├── config.ts                 [MODIFIED - Add getDefaultCLI() getter]
│   │   ├── autonomousCommands.ts     [MODIFIED - Wire router]
│   │   ├── mcpConfig.ts              [MODIFIED - Guard MCP by provider]
│   │   └── council/
│   │       ├── PlatformDetector.ts   [NEW - Platform detection logic]
│   │       ├── CommandMetadataExtractor.ts [NEW - Parse command metadata]
│   │       ├── CrossPlatformCommandRouter.ts [NEW - Command routing]
│   │       ├── types/
│   │       │   └── CrossPlatformTypes.ts [NEW - Shared types]
│   │       └── providers/
│   │           ├── ProviderFactory.ts [MODIFIED - Check defaultCLI setting]
│   │           └── cli/
│   │               ├── ClaudeCodeCLIProvider.ts [MODIFIED - Add translateError()]
│   │               └── CodexCLIProvider.ts [MODIFIED - Add translateError()]
│
├── language-server/
│   └── src/
│       └── mcp/
│           └── toolHandler.ts        [MODIFIED - Multi-directory skill search]
│
├── scripts/
│   └── generate-commands.ts          [NEW - Command file generator]
│
├── tests/
│   ├── unit/
│   │   └── council/
│   │       ├── PlatformDetector.test.ts [NEW]
│   │       ├── CommandMetadataExtractor.test.ts [NEW]
│   │       └── CrossPlatformCommandRouter.test.ts [NEW]
│   ├── integration/
│   │   ├── cross-platform-parity.test.ts [NEW - Feature parity suite]
│   │   ├── command-generation.test.ts [NEW - Generator tests]
│   │   ├── autonomous-commands.test.ts [NEW - Router integration]
│   │   └── mcp-integration.test.ts   [NEW - MCP multi-directory]
│   └── performance/
│       └── validation-parallel.test.ts [NEW - Parallel agent timing]
│
├── docs/
│   ├── setup-claude-code.md          [NEW - Claude CLI setup guide]
│   ├── setup-copilot-chat.md         [NEW - Copilot Chat setup guide]
│   ├── setup-codex-cli.md            [NEW - Codex CLI setup guide]
│   └── legacy-workflow.md            [NEW - Pre-2026 Copilot sequential workflow]
│
├── .specify/specs/028-cross-platform-command-parity/
│   ├── spec.md                       [EXISTS]
│   ├── research.md                   [EXISTS]
│   ├── plan.md                       [THIS FILE]
│   └── command-formats.md            [NEW - Format comparison reference]
│
├── README.md                         [MODIFIED - Add Platform Capabilities section]
└── CHANGELOG.md                      [MODIFIED - Document new feature]
```

**Summary**:

- **18 new files**: Codex skills in `.system/skills/*/SKILL.md`
- **18 modified files**: Copilot prompts with auto-chain/parallel agent sections
- **7 new TypeScript files**: PlatformDetector, CommandMetadataExtractor,
  CrossPlatformCommandRouter, CrossPlatformTypes, command generator
- **5 modified TypeScript files**: extension.ts, config.ts,
  autonomousCommands.ts, mcpConfig.ts, ProviderFactory.ts, CLI providers,
  toolHandler.ts
- **9 new test files**: Unit tests (3), integration tests (4), performance tests
  (1), generator test (1)
- **4 new documentation files**: Setup guides (3), legacy workflow (1)
- **3 modified documentation files**: README.md, CHANGELOG.md,
  command-formats.md

**Total**: 66 files (36 new, 30 modified)

## Risk Assessment

| Risk                                                             | Impact                                                                                                                               | Mitigation                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Copilot 2026 parallel agents delayed or not as documented**    | HIGH - User Story 3 (parallel validation) fails if Copilot doesn't support concurrent agents                                         | Include backward-compatible notes in all Copilot prompts: "For older Copilot: run validation agents sequentially via manual workflow (see docs/legacy-workflow.md)". Feature degrades gracefully. Test with actual Copilot CLI 2026+ before release. |
| **Codex skill format undocumented or differs from web research** | HIGH - FR-001 (Codex skills) blocked if SKILL.md format incorrect                                                                    | Validate format with actual Codex CLI during Phase 2. Adjust generator in Phase 3 based on findings. Web research from multiple sources (5+ articles) provides confidence, but must confirm with real tool.                                          |
| **Platform detection ambiguity in complex environments**         | MEDIUM - Router may misdetect platform if multiple CLIs coexist (e.g., Copilot extension + Codex CLI + Claude CLI in same workspace) | Explicit user setting overrides auto-detection (gofer.defaultCLI). Log detection decisions for troubleshooting. Provide clear error messages: "Multiple CLIs detected - set gofer.defaultCLI to specify preference".                                 |
| **Conversation history format changes in Feature 027**           | MEDIUM - FR-008 (history preservation) breaks if JSONL/JSON formats incompatible                                                     | Adapter pattern already abstracts formats. ObservationMasker handles credential redaction. Integration tests verify normalization. If formats change, update adapter without changing interface.                                                     |
| **Command file generator drift from Claude source**              | LOW - Generated Codex/Copilot files diverge from Claude commands over time if manual changes made                                    | CI/CD check: "Generated files out of sync with .claude/commands/ - run npm run generate-commands". Block merge if generated files modified manually. Single source of truth enforced.                                                                |
| **MCP initialization breaks non-Claude providers**               | LOW - MCP code may assume Claude CLI and crash when Codex/Copilot active                                                             | Guard all MCP code paths with provider check (FR-009). Integration tests verify graceful degradation. Error handling for missing MCP features.                                                                                                       |
| **Auto-chain instructions ignored by AI**                        | LOW - AI may not follow auto-chain instructions, breaking seamless pipeline flow                                                     | Make instructions explicit and mandatory: "**CRITICAL**: You MUST invoke next stage NOW. Do NOT ask for confirmation." Test with multiple AI models. Monitor auto-chain success rate in telemetry.                                                   |
| **Test suite too slow for CI/CD**                                | LOW - Feature parity tests spawn CLIs, may exceed CI timeout                                                                         | Mock CLI execution in tests (no real API calls). Use fixtures for expected outputs. Parallel test execution. Target: all tests complete in <5 minutes.                                                                                               |

**Highest Risk**: Copilot 2026 parallel agents delay → Mitigated with backward
compatibility notes and manual workflow fallback

**Risk Score**: 2/5 (LOW-MEDIUM) - Most risks have clear mitigations, and core
functionality (command availability) works even if advanced features (parallel
agents) degrade.

## Spec Traceability

### User Story Coverage

| User Story                                    | Status     | Plan References                                                                                                                                                                    |
| --------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **US-1: Codex CLI Full Command Access**       | ✅ Covered | Phase 1 (skills directory), Phase 3 (generator), Phase 5 (verification). FR-001, FR-015. Test Category 1 (command availability). Setup guide: docs/setup-codex-cli.md.             |
| **US-2: Auto-Chaining Across All Platforms**  | ✅ Covered | Phase 3 (auto-chain instructions), Phase 4 (router integration). FR-004, NFR-001. Test Category 2 (auto-chain functionality). All 7 stage commands enhanced.                       |
| **US-3: Parallel Validation Agents**          | ✅ Covered | Phase 3 (parallel spawn instructions), Phase 5 (performance tests). FR-005, FR-018, NFR-002. Test Category 3 (6 concurrent agents). Validation command enhanced for all platforms. |
| **US-4: Conversation History Preservation**   | ✅ Covered | Phase 3 (history preservation in ProviderFactory). FR-008, NFR-005. Test Category 4 (context preservation). ObservationMasker integration for credential redaction.                |
| **US-5: Default Provider Selection**          | ✅ Covered | Phase 1 (VSCode setting), Phase 2 (detection integration). FR-006, FR-007, NFR-007. ConfigManager getter, ProviderFactory extension. Settings UI dropdown.                         |
| **US-6: Cross-Platform Feature Parity Tests** | ✅ Covered | Phase 5 (test suite implementation). FR-011, SC-004. Test Categories 1-5 (availability, auto-chain, parallel agents, context, structure). 100% pass target.                        |
| **US-7: Capability Matrix Documentation**     | ✅ Covered | Phase 5 (README update, setup guides). FR-017, NFR-010. Platform comparison table, setup guides (3), capability footnotes. Links from README to guides.                            |

**Coverage**: 7/7 user stories fully addressed in plan

### Requirement Coverage

| Functional Requirement                         | Status     | Plan Reference                                                                                                                       |
| ---------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| FR-001: Codex CLI Skill File Creation          | ✅ Covered | Phase 3 (CommandFileGenerator.generateCodexSkill()), Phase 5 (generate-commands execution). 18 skills in .system/skills/\*/SKILL.md. |
| FR-002: Copilot Chat Prompt Enhancement        | ✅ Covered | Phase 3 (CommandFileGenerator.enhanceCopilotPrompt()), auto-chain + parallel agent sections. Backward compatibility notes.           |
| FR-003: Cross-Platform Command Router          | ✅ Covered | Phase 3 (CrossPlatformCommandRouter implementation), Phase 4 (router wiring). Priority fallback logic.                               |
| FR-004: Auto-Chain Instruction Embedding       | ✅ Covered | Phase 3 (generator injects platform-specific auto-chain syntax). Test Category 2 validates presence.                                 |
| FR-005: Parallel Agent Spawn Instructions      | ✅ Covered | Phase 3 (generator adds 6-agent section to validation command). Test Category 3 validates.                                           |
| FR-006: Default Provider Setting               | ✅ Covered | Phase 1 (package.json setting + ConfigManager getter). Enum dropdown in Settings UI.                                                 |
| FR-007: Provider Factory Integration           | ✅ Covered | Phase 2 (extend autoDetectCLI() to check setting first). CLIHealthChecker validation, fallback logic.                                |
| FR-008: Conversation History Preservation      | ✅ Covered | Phase 3 (ProviderFactory.getCLIProvider() with history normalization + ObservationMasker). Test Category 4.                          |
| FR-009: MCP Server Guard Clauses               | ✅ Covered | Phase 4 (mcpConfig.ts provider check). Skip MCP for Copilot/Codex, log graceful message.                                             |
| FR-010: Skill Discovery Multi-Directory Search | ✅ Covered | Phase 4 (MCP Tool Handler multi-directory logic). Priority: Claude > Codex > Copilot.                                                |
| FR-011: Feature Parity Test Suite              | ✅ Covered | Phase 5 (cross-platform-parity.test.ts). 5 test categories, 100% pass target. SC-004 measurement.                                    |
| FR-012: Error Message Normalization            | ✅ Covered | Phase 4 (CLI provider translateError() methods). Standard format with recovery instructions.                                         |
| FR-013: Platform Detection Logic               | ✅ Covered | Phase 2 (PlatformDetector implementation). Execution context analysis, fallback to setting. NFR-009 logging.                         |
| FR-014: Command File Generator Script          | ✅ Covered | Phase 3 (generate-commands.ts implementation). Generates Codex skills + enhances Copilot prompts. NFR-006 single source.             |
| FR-015: Codex Skill Auto-Discovery             | ✅ Covered | Phase 1 (directory structure), Phase 3 (YAML frontmatter format). SKILL.md naming convention.                                        |
| FR-016: Backward Compatibility for Copilot     | ✅ Covered | Phase 3 (generator adds compat notes), Phase 5 (docs/legacy-workflow.md). Pre-2026 version support.                                  |
| FR-017: Documentation Capability Matrix        | ✅ Covered | Phase 5 (README.md Platform Capabilities section). Feature × Platform table with ✓/⚠/✗ status.                                      |
| FR-018: Performance Tests for Parallel Agents  | ✅ Covered | Phase 5 (validation-parallel.test.ts). <60s target, parallel vs sequential baseline. NFR-002.                                        |

**Coverage**: 18/18 functional requirements fully addressed in plan

### Acceptance Criteria Mapping

All acceptance criteria from 7 user stories mapped to plan components:

**US-1 (Codex CLI)**:

- "All 18 commands accessible via $skill-name" → FR-001, Test Category 1
- "SKILL.md format with YAML frontmatter" → Phase 3 generator, FR-015
- "Auto-completion in Codex" → YAML metadata extraction, FR-015
- "Auto-load on startup" → Directory structure, Phase 1
- "Documentation with examples" → docs/setup-codex-cli.md, Phase 5

**US-2 (Auto-Chaining)**:

- "Claude auto-chains through 7 stages" → Existing functionality, FR-004
  preserves
- "Copilot includes auto-chain instructions" → Phase 3 enhanceCopilotPrompt(),
  FR-004
- "Codex includes auto-chain instructions" → Phase 3 generateCodexSkill(),
  FR-004
- "Integration tests verify identical behavior" → Test Category 2, FR-011
- "Clear error on chain failure" → FR-012 error normalization, Phase 4

**US-3 (Parallel Agents)**:

- "Claude spawns 6 agents via Task tool" → Existing functionality, FR-005
  preserves
- "Copilot delegates to 6 agents" → Phase 3 parallel agent section, FR-005
- "Codex spawns 6 parallel sub-prompts" → Phase 3 Codex validation skill, FR-005
- "Identical validation-report.md structure" → Test Category 5, FR-011
- "Performance <60s" → validation-parallel.test.ts, FR-018

**US-4 (Context Preservation)**:

- "ProviderFactory preserves history array" → FR-008, Phase 3 implementation
- "Claude → Codex → Claude maintains context" → Test Category 4, FR-011
- "History normalization JSONL ↔ JSON" → FR-008 adapter pattern, Phase 3
- "MCP context gracefully degrades" → FR-009 guard clauses, Phase 4
- "Notification on provider switch" → FR-008 user message, Phase 3

**US-5 (Default Provider)**:

- "New setting gofer.defaultCLI" → FR-006, Phase 1 package.json
- "Visible in Settings UI with dropdown" → FR-006 enum configuration, Phase 1
- "ConfigManager getter" → FR-006, Phase 1 config.ts
- "Router respects default setting" → FR-007, Phase 2 ProviderFactory
- "Takes effect immediately" → FR-007 auto-detection logic, Phase 2

**US-6 (Feature Parity Tests)**:

- "Test suite exists" → FR-011, Phase 5 cross-platform-parity.test.ts
- "Tests verify 18/18 commands, auto-chain, parallel agents, context, structure"
  → Test Categories 1-5, Phase 5
- "Can run in CI/CD with mocks" → FR-011 mock CLI execution, Phase 5
- "Compare output artifacts for equivalence" → Test Category 5, FR-011
- "Clear diff on failure" → FR-011 test assertions, Phase 5

**US-7 (Capability Matrix)**:

- "README includes Platform Capabilities section" → FR-017, Phase 5 README.md
- "Table columns: Feature, Claude, Copilot, Codex" → FR-017 matrix structure
- "Table rows: 18 commands, MCP, autonomous, context, auto-chain, parallel
  agents" → FR-017 feature list
- "Cells show ✓/⚠/✗ with footnotes" → FR-017 status indicators
- "Links to setup guides" → NFR-010, Phase 5 setup guides

**Result**: 100% acceptance criteria coverage across all 7 user stories

## Key Architecture Decisions

1. **Single Source of Truth**: `.claude/commands/` remains reference
   implementation (unchanged). Generator script produces Codex/Copilot versions
   to avoid 54-file maintenance burden and prevent drift. CI/CD enforces
   generated files cannot be manually edited.

2. **Instruction-Based Auto-Chaining**: No server-side chain enforcement. AI
   follows explicit instructions embedded in each stage's command file.
   Maintains consistency with existing Claude implementation. Reduces complexity
   and avoids extension code modifications.

3. **Platform Detection with Fallback**: Execution context analysis (VSCode
   extension host + directory presence) detects platform. When ambiguous, falls
   back to `gofer.defaultCLI` user preference. Balances zero-config default
   (NFR-007) with explicit control.

4. **Adapter Pattern for History Preservation**: ProviderFactory abstracts
   conversation history formats (JSONL ↔ JSON). ObservationMasker redacts
   credentials before provider switch. Normalizer handles format conversion
   transparently. Reuses Feature 027 infrastructure.

5. **Graceful MCP Degradation**: Guard MCP initialization with provider check.
   Skip MCP setup for Copilot/Codex with informational log message. Commands
   work without MCP (core functionality preserved), only advanced features
   disabled.

6. **Feature Parity Test Strategy**: Integration tests compare output artifacts
   for structural equivalence, not bit-perfect equality. Tests use mocked CLI
   execution to avoid external API dependencies. Five test categories provide
   comprehensive coverage without brittleness.

7. **Parallel Agent Instructions**: Platform-specific sections in validation
   command explain how to spawn 6 agents concurrently. Claude uses Task tool
   (existing), Copilot uses multi-agent delegation (2026+ feature), Codex uses
   concurrent sub-prompts (platform-specific). Backward compatibility notes for
   older Copilot versions.

8. **Error Message Standardization**: All CLI provider adapters implement
   `translateError()` method. Maps platform-specific errors to consistent
   user-facing format: "Command '[name]' not available - ensure [platform] CLI
   installed. [recovery instructions]". Improves troubleshooting UX.

## Next Steps

After plan approval:

1. **Phase 1 (Foundation)**: Create PR with directory structure, VSCode setting,
   ConfigManager getter, types. Review before proceeding.

2. **Phase 2 (Data Layer)**: Implement platform detection, metadata extraction,
   ProviderFactory extension. Run unit tests, verify 100% pass.

3. **Phase 3 (Business Logic)**: Build CrossPlatformCommandRouter,
   CommandFileGenerator, history preservation. Run integration tests, verify
   routing works.

4. **Phase 4 (API Layer)**: Wire router to extension.ts, autonomousCommands.ts,
   MCP Tool Handler. Test end-to-end command execution.

5. **Phase 5 (Polish)**: Run command generator, implement feature parity tests,
   write documentation, update README. Manual verification checklist 100%
   complete.

6. **Release**: Merge to main, tag release, publish extension update. Monitor
   GitHub issues for cross-platform bugs (SC-006: 0 critical bugs target).

**Estimated Timeline**: 5 phases × 2 days = 10 business days (optimistic), 15
days (conservative with testing/docs)

**Success Metrics**: SC-001 (18/18 commands), SC-002 (100% auto-chain), SC-003
(<60s validation), SC-004 (100% test pass), SC-005 (100% message retention),
SC-007 (25%+ provider switch adoption)
