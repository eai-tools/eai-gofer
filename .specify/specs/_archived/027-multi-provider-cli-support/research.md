---
date: 2026-03-16T19:50:00Z
researcher: Claude
feature: '027-multi-provider-cli-support'
status: complete
---

# Research: Multi-Provider CLI Support

## Feature Summary

Enable Gofer to work with multiple AI CLI providers (Claude Code CLI and Codex
CLI) with seamless provider switching via VSCode settings. All Gofer features
(pipeline stages, validation, autonomous mode) must work identically regardless
of which CLI provider the user selects.

**Discovery Context**: From `discovery.md` - this feature delivers comprehensive
provider abstraction (flexibility + migration path + future-proof architecture)
with success metrics: zero feature parity gaps, <2 click switching, no code
duplication, and <100 LOC to add new providers.

---

## Codebase Analysis

### Where to Implement

| Component                     | Location                                               | Purpose                                                          |
| ----------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| **Provider Interface**        | `extension/src/council/providers/LLMProvider.ts`       | Abstract provider contract - **REUSE EXISTING**                  |
| **Provider Factory**          | `extension/src/council/providers/ProviderFactory.ts`   | Provider instantiation - **EXTEND FOR CLI**                      |
| **CLI Bridge**                | `extension/src/claudeCodeBridge.ts`                    | CLI invocation and communication - **REFACTOR TO USE PROVIDER**  |
| **Autonomous Driver**         | `extension/src/autonomous/AutonomousDriver.ts`         | Orchestrates autonomous mode - **MAKE PROVIDER-AGNOSTIC**        |
| **CLI Adapter (NEW)**         | `extension/src/providers/cli/CLIProviderAdapter.ts`    | Adapts LLMProvider interface for CLI usage                       |
| **Claude CLI Provider (NEW)** | `extension/src/providers/cli/ClaudeCodeCLIProvider.ts` | Claude Code CLI implementation                                   |
| **Codex CLI Provider (NEW)**  | `extension/src/providers/cli/CodexCLIProvider.ts`      | Codex CLI implementation                                         |
| **Config Manager**            | `extension/src/config.ts`                              | VSCode settings management - **ADD CLI PROVIDER SETTINGS**       |
| **Package Settings**          | `extension/package.json`                               | VSCode settings schema - **ADD DROPDOWN FOR PROVIDER SELECTION** |

### Existing Patterns to Follow

#### Pattern 1: LLM Provider Architecture (PRIMARY MODEL)

**Found in**: `extension/src/council/providers/`

This is **production-proven** code handling 3 providers (Anthropic, OpenAI,
Google) with:

- Clean interface abstraction (`LLMProvider`)
- Factory pattern with registry (`ProviderFactory.registerProvider()`)
- Base class for shared behavior (`BaseLLMProvider`)
- Custom error handling (`ProviderError`)
- Rate limiting and health checks built-in

**Why Relevant**: This pattern can be **directly extended** for CLI providers.
We create CLI-specific implementations that adapt terminal output to the
existing `LLMProvider` interface.

**Key Code** (`LLMProvider.ts:24-74`):

```typescript
export interface LLMProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly model: string;
  status: ProviderStatus;

  query(request: QueryRequest): Promise<QueryResponse>;
  healthCheck(): Promise<boolean>;
  isAvailable(): boolean;
  isRateLimited(): boolean;
}
```

**Application Strategy**: Create `CLIProviderAdapter` that implements this
interface but spawns CLI processes instead of making API calls.

---

#### Pattern 2: Configuration Management with Dropdown Selection

**Found in**: `extension/src/config.ts:121-241`

ConfigManager provides type-safe getters for VSCode settings with singleton
pattern.

**Current API Key Getters**:

```typescript
public getAnthropicApiKey(): string
public getGoogleApiKey(): string
public getOpenaiApiKey(): string
```

**New Getters Needed**:

```typescript
public getPreferredCLIProvider(): 'claude' | 'codex' | 'auto'
public getClaudeCodeCommand(): string  // Already exists!
public getCodexCommand(): string       // NEW - for custom CLI path
```

**VSCode Settings Schema** (`package.json`):

```json
{
  "gofer.cliProvider": {
    "type": "string",
    "enum": ["claude", "codex", "auto"],
    "enumDescriptions": [
      "Use Claude Code CLI",
      "Use Codex CLI",
      "Auto-detect based on installed CLI tools"
    ],
    "default": "auto",
    "description": "AI CLI provider for Gofer autonomous mode"
  }
}
```

---

#### Pattern 3: ClaudeCodeBridge Refactoring Strategy

**Found in**: `extension/src/claudeCodeBridge.ts:18-87`

**Current Implementation**: Hardcoded to Anthropic SDK

```typescript
// Line 18-24: Hardcoded Anthropic client
constructor(apiKey: string) {
  this.anthropic = new Anthropic({ apiKey });
  this.conversationHistory = [];
}

// Line 54-77: Direct SDK usage
const response = await this.anthropic.messages.create({
  model: 'claude-opus-4-5-20251101', // Hardcoded model
  max_tokens: 8096,
  messages: this.conversationHistory,
});
```

**Refactored Implementation**: Use `LLMProvider` interface

```typescript
// NEW: Provider-agnostic bridge
constructor(private provider: LLMProvider) {
  this.conversationHistory = [];
}

// NEW: Use provider.query() instead of SDK
const response = await this.provider.query({
  prompt: this.buildPromptFromHistory(prompt),
  maxTokens: 8096,
  temperature: 0.7,
  systemPrompt: this.getSystemPrompt(),
});
```

**Migration Path**:

1. Add `LLMProvider` constructor parameter
2. Replace `this.anthropic.messages.create()` with `this.provider.query()`
3. Adapt conversation history to query format
4. Test with existing `AnthropicProvider` to ensure backward compatibility
5. Add CLI providers

---

#### Pattern 4: Terminal Management for CLI Providers

**Found in**: `extension/src/autonomous/TerminalManager.ts`

TerminalManager already handles spawning and managing CLI processes via
`node-pty`.

**Key Methods**:

```typescript
createTerminal(cwd: string, env?: Record<string, string>): IPty
sendCommand(pty: IPty, command: string): void
captureOutput(pty: IPty, onData: (data: string) => void): void
```

**Application**: CLI providers will use TerminalManager to:

1. Spawn `claude` or `codex` commands
2. Send prompts via stdin
3. Capture responses from stdout
4. Parse structured output (JSON or markdown)

---

#### Pattern 5: Provider Factory with Registry

**Found in**: `extension/src/council/providers/ProviderFactory.ts:22-95`

**Current Pattern**:

```typescript
const providerRegistry = new Map<ProviderId, ProviderConstructor>();

export function registerProvider(
  id: ProviderId,
  constructor: ProviderConstructor
): void {
  providerRegistry.set(id, constructor);
}

// At bottom of each provider file:
registerProvider('anthropic', AnthropicProvider);
```

**Extension for CLI Providers**:

```typescript
// NEW: CLI provider registration
registerProvider('claude-cli', ClaudeCodeCLIProvider);
registerProvider('codex-cli', CodexCLIProvider);

// NEW: Factory method for CLI providers
createCLIProvider(cliType: 'claude' | 'codex'): LLMProvider {
  const providerId = `${cliType}-cli` as ProviderId;
  const Constructor = providerRegistry.get(providerId);

  if (!Constructor) {
    throw notConfiguredError(providerId);
  }

  // CLI providers don't need API keys (authenticated via CLI)
  return new Constructor(this.getCLICommand(cliType), this.getModel(cliType));
}
```

---

### Integration Points

1. **Autonomous Mode Entry** (`extension/src/autonomousCommands.ts:871-928`)
   - Currently launches Claude Code CLI directly
   - **Change**: Use ProviderFactory to get selected CLI provider
   - **Integration**:
     `const provider = factory.createCLIProvider(config.getPreferredCLIProvider())`

2. **ClaudeCodeBridge Initialization**
   (`extension/src/claudeCodeBridge.ts:18-24`)
   - Currently creates Anthropic SDK client
   - **Change**: Accept `LLMProvider` via dependency injection
   - **Integration**: `new ClaudeCodeBridge(provider)` instead of
     `new ClaudeCodeBridge(apiKey)`

3. **Autonomous Driver** (`extension/src/autonomous/AutonomousDriver.ts`)
   - Orchestrates stage execution
   - **Change**: Use provider from factory, not hardcoded
   - **Integration**: Driver should receive provider as dependency

4. **Usage Tracking** (`extension/src/autonomous/ClaudeCodeUsageAdapter.ts`)
   - Currently reads Claude Code logs (`~/.claude/history.jsonl`)
   - **Change**: Adapt for Codex logs (`~/.codex/history.jsonl`)
   - **Integration**: Usage adapter factory based on provider type

5. **Config Watching** (`extension/src/config.ts`)
   - ConfigManager already has refresh mechanism
   - **Integration**: Add `vscode.workspace.onDidChangeConfiguration()` listener
     for `gofer.cliProvider`
   - **Effect**: Reinitialize provider when setting changes

---

### Related Code

- `extension/src/council/providers/LLMProvider.ts:24-74` - Interface definition
- `extension/src/council/providers/BaseLLMProvider.ts:76-163` - Base
  implementation
- `extension/src/council/providers/ProviderFactory.ts:56-85` - Factory creation
- `extension/src/council/providers/ProviderError.ts:13-208` - Error handling
- `extension/src/autonomous/TerminalManager.ts` - Terminal spawning
- `extension/src/config.ts:121-241` - Configuration getters
- `extension/package.json` - Settings schema (needs CLI provider dropdown)

---

## Technology Decisions

### Decision 1: Claude Code CLI vs Anthropic API

**Choice**: Support **both** Claude Code CLI (for autonomous mode) and Anthropic
API (for council/direct API calls)

**Rationale**:

- Claude Code CLI is designed for agentic, multi-turn conversations in terminal
- Anthropic API is better for single-turn queries and parallel provider
  orchestration
- Different use cases require different interfaces

**Alternatives Considered**:

- Unify everything through CLI: ❌ Too slow for parallel council queries
- Unify everything through API: ❌ Loses terminal integration and tool use
  capabilities

**Implementation**: `ClaudeCodeCLIProvider` wraps CLI, `AnthropicProvider` uses
API, both implement same interface.

---

### Decision 2: CLI Provider Interface

**Choice**: Extend existing `LLMProvider` interface for CLI providers

**Rationale**:

- Avoids code duplication (existing interface works for 3 API providers)
- Provider abstraction already proven at scale
- Minimal changes to existing code

**Alternatives Considered**:

- Create separate `CLIProvider` interface: ❌ Would duplicate factory, error
  handling, config management
- Modify existing providers to support CLI: ❌ Violates Single Responsibility
  Principle

**Implementation**: `CLIProviderAdapter` implements `LLMProvider`, spawns CLI
processes internally.

**Interface Mapping**:

```typescript
// LLMProvider.query() → CLI workflow
async query(request: QueryRequest): Promise<QueryResponse> {
  1. Spawn CLI process (via TerminalManager)
  2. Send prompt via stdin
  3. Capture stdout (streaming or buffered)
  4. Parse response (extract text, token usage)
  5. Return QueryResponse
}
```

---

### Decision 3: Codex CLI Integration Strategy

**Choice**: Research and implement Codex CLI integration in parallel with Claude
Code refactoring

**Rationale**:

- Codex CLI has similar architecture to Claude Code (terminal-based, agentic)
- Both support slash commands, file operations, and autonomous workflows
- API surface area is comparable (query, context management, tool use)

**Research Findings**:

#### Claude Code CLI

- **Command**: `claude` (official Anthropic CLI)
- **Installation**: npm, Homebrew, or binary download
- **Authentication**: API key via `ANTHROPIC_API_KEY` env var or
  `~/.claude/config.json`
- **Models**: Sonnet 4.5, Haiku 4.5, Opus 4.5, Opus 4.6
- **Features**: Subagents, MCP servers, hooks, plan mode, checkpoints
- **Output Format**: Markdown with code blocks, tool use annotations
- **Configuration**: `~/.claude/config.json`
- **Session Logs**: `~/.claude/history.jsonl`

#### Codex CLI

- **Command**: `codex` (official OpenAI CLI)
- **Installation**: npm install -g @openai/codex-cli
- **Authentication**: ChatGPT account or `OPENAI_API_KEY` env var
- **Models**: GPT-5.4, GPT-5.3-Codex (switching via `/model` command)
- **Features**: Screenshot attachment, web search, automation scripts, reasoning
  levels
- **Output Format**: TUI (terminal UI) with structured responses
- **Configuration**: `~/.codex/config.json`
- **Session Logs**: `~/.codex/history.json` (different format than Claude)

**Compatibility Matrix**:

| Feature             | Claude Code CLI         | Codex CLI          | Abstraction Strategy       |
| ------------------- | ----------------------- | ------------------ | -------------------------- |
| **Prompt/Response** | ✅ stdin/stdout         | ✅ TUI interface   | Parse output, extract text |
| **Multi-turn**      | ✅ conversation history | ✅ session context | Track history in adapter   |
| **Tool Use**        | ✅ MCP servers          | ✅ built-in tools  | Abstract as "capabilities" |
| **File Operations** | ✅ read/write/edit      | ✅ read/write/run  | Common file I/O interface  |
| **Error Handling**  | ✅ structured errors    | ✅ exit codes      | Map to `ProviderError`     |
| **Token Usage**     | ✅ in logs              | ✅ via API         | Parse from logs or API     |
| **Streaming**       | ✅ stdout chunks        | ✅ TUI updates     | Buffer or stream handler   |

**Differences Requiring Adapter Logic**:

1. **Output Parsing**:
   - Claude: Markdown text with `---` separators
   - Codex: JSON responses or TUI-formatted text
   - **Solution**: Provider-specific parsers in adapter

2. **Authentication**:
   - Claude: API key in config or env var
   - Codex: ChatGPT session or API key
   - **Solution**: Provider-specific auth checks in `healthCheck()`

3. **Session Management**:
   - Claude: JSONL append-only log
   - Codex: JSON object with session array
   - **Solution**: Provider-specific log readers

4. **Command Invocation**:
   - Claude: `claude --prompt "..."` (blocking)
   - Codex: `codex` (TUI mode) or `codex exec "..."` (script mode)
   - **Solution**: Config setting for command template

**Alternatives Considered**:

- Only support Claude Code: ❌ Doesn't meet feature requirements
  (multi-provider)
- Create unified CLI protocol: ❌ Can't control external CLI implementations
- Shell wrapper scripts: ❌ Too fragile, OS-specific

**Implementation**: Separate adapter classes for each CLI with shared base
logic.

---

### Decision 4: Provider Selection Mechanism

**Choice**: VSCode dropdown setting with auto-detection fallback

**Rationale**:

- <2 click requirement from discovery (dropdown = 1 click)
- Auto-detection prevents "not configured" errors for users who already have a
  CLI installed
- Setting is persistent across sessions

**Options**:

- `claude`: Always use Claude Code CLI
- `codex`: Always use Codex CLI
- `auto`: Detect which CLI is installed and working (default)

**Auto-Detection Logic**:

```typescript
async detectAvailableCLI(): Promise<'claude' | 'codex' | null> {
  // Check Claude Code
  if (await this.isCLIAvailable('claude', '--version')) {
    return 'claude';
  }

  // Check Codex
  if (await this.isCLIAvailable('codex', '--version')) {
    return 'codex';
  }

  // Neither found
  return null;
}

private async isCLIAvailable(command: string, testArg: string): Promise<boolean> {
  try {
    const result = await execFile(command, [testArg]);
    return result.stdout.includes('version') || result.stdout.includes('Version');
  } catch {
    return false;
  }
}
```

**Alternatives Considered**:

- Command palette selection: ❌ Requires more clicks (>2)
- Config file: ❌ Not discoverable in VSCode UI
- Per-workspace setting: ⚠️ Could add later for team consistency

---

### Decision 5: Backward Compatibility

**Choice**: Maintain 100% backward compatibility with existing Gofer features

**Rationale**:

- Existing users rely on Claude Code integration
- No breaking changes to API or behavior
- New providers are additive, not replacements

**Compatibility Strategy**:

1. **Default to Claude**: If no setting configured, use `auto` → prefers Claude
   if installed
2. **Existing Commands Work**: `gofer.startClaudeCode` still works (uses
   selected provider)
3. **API Unchanged**: `ClaudeCodeBridge` refactored internally but public
   interface unchanged
4. **Config Migration**: No migration needed (new settings have sensible
   defaults)

**Testing Strategy**:

- Unit tests for each provider
- Integration tests for provider switching
- E2E tests for existing workflows with both CLIs
- Backward compatibility test suite (existing tests must pass)

---

## Constraints & Considerations

### Technical Constraints

1. **CLI Installation Required**: Users must have `claude` or `codex` CLI
   installed
   - **Mitigation**: Auto-detection with helpful error messages
   - **UX**: Show VSCode notification on first use: "Install Claude Code CLI:
     `npm install -g @anthropic/claude-code`"

2. **Terminal Dependency**: CLI providers require spawning terminal processes
   - **Impact**: Slower than direct API calls (~500ms overhead per query)
   - **Mitigation**: Cache provider instances, reuse terminal sessions

3. **Output Parsing Fragility**: CLI output formats could change
   - **Impact**: Breaking changes in CLI updates
   - **Mitigation**: Version pinning, fallback to API if CLI fails

4. **Authentication Complexity**: Different auth mechanisms per CLI
   - Claude: API key in config or `ANTHROPIC_API_KEY` env var
   - Codex: ChatGPT session or `OPENAI_API_KEY` env var
   - **Mitigation**: Provider-specific auth checks, clear error messages

5. **Token Usage Tracking**: CLI logs have different formats
   - **Impact**: Usage stats may be inconsistent
   - **Mitigation**: Normalize to common format in adapters

### Architectural Constraints

1. **Provider Interface Compatibility**: CLI providers must implement
   `LLMProvider` interface
   - **Challenge**: Interface designed for API calls, not terminal I/O
   - **Solution**: Adapter pattern bridges the gap

2. **Error Handling**: CLI exit codes → `ProviderError` mapping
   - **Challenge**: Exit codes vary between CLIs
   - **Solution**: Provider-specific error parsers

3. **Conversation History**: CLI sessions are stateful, API calls are stateless
   - **Challenge**: Maintain consistency across provider types
   - **Solution**: Adapter manages conversation state for CLI providers

4. **Performance**: API calls are 10-50x faster than CLI spawns
   - **Impact**: Council mode (parallel queries) benefits from API, autonomous
     mode needs CLI
   - **Solution**: Use API for council, CLI for autonomous (configurable)

### User Experience Constraints

1. **<2 Click Switching**: Must meet UX requirement from discovery
   - **Solution**: Single dropdown in VSCode settings

2. **Zero Feature Parity Gaps**: All features work on both CLIs
   - **Challenge**: CLI capabilities differ (e.g., Claude has MCP, Codex has web
     search)
   - **Solution**: Abstract common capabilities, graceful degradation for
     provider-specific features

3. **Clear Error Messages**: Users must understand provider-specific issues
   - Example: "Claude Code CLI not found. Install with:
     `npm install -g @anthropic/claude-code`"
   - Example: "Codex CLI requires authentication. Run: `codex login`"

4. **Seamless Migration**: Switching providers should not break workflows
   - **Solution**: Provider setting is workspace-scoped, user can switch anytime

---

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type            | Description                                           | Impact on Implementation                                                           |
| -------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Existing Architecture**  | LLMProvider interface designed for API calls, not CLI | Must adapt CLI workflow to fit interface (adapter pattern)                         |
| **Hardcoded Dependencies** | ClaudeCodeBridge hardcodes Anthropic SDK              | Must refactor to dependency injection                                              |
| **Terminal Management**    | TerminalManager already exists                        | Reuse for CLI spawning (no new terminal code needed)                               |
| **Configuration Schema**   | VSCode settings already defined                       | Must extend `package.json` without breaking existing settings                      |
| **Autonomous Mode**        | Autonomous commands reference "ClaudeCode" by name    | Must make naming provider-agnostic (e.g., "AI Assistant" instead of "Claude Code") |

### Technical Debt to Avoid

The following patterns are problematic - do NOT use:

| Pattern                         | Found In                    | Why Avoid                         | Use Instead                          |
| ------------------------------- | --------------------------- | --------------------------------- | ------------------------------------ |
| **Direct SDK Usage**            | `claudeCodeBridge.ts:60-65` | Couples code to specific provider | Use `LLMProvider` interface          |
| **Hardcoded Model Names**       | `claudeCodeBridge.ts:61`    | Prevents model switching          | Read from config or provider default |
| **Inline Terminal Spawning**    | `autonomousCommands.ts:981` | Duplicates terminal logic         | Use `TerminalManager`                |
| **Magic Strings for Providers** | Multiple files              | Brittle, typo-prone               | Use `ProviderId` enum from types     |

### Areas Requiring Extra Caution

- **ClaudeCodeBridge Refactoring**: This is core to autonomous mode. Changes
  must be backward compatible.
  - Risk: Breaking existing autonomous workflows
  - Mitigation: Comprehensive test coverage before refactoring

- **Terminal Output Parsing**: CLI output formats are fragile and may change
  - Risk: Parsing breaks on CLI updates
  - Mitigation: Version pinning, fallback to regex-based extraction

- **Provider Registry**: Adding new provider types to existing registry
  - Risk: Breaking existing API providers
  - Mitigation: Keep API and CLI providers in separate namespaces

- **Config Settings**: Adding new settings without breaking existing ones
  - Risk: Default values change behavior for existing users
  - Mitigation: New settings default to "auto", preserving existing behavior

### Integration Requirements

| Existing Service     | Integration Method     | Notes                                                       |
| -------------------- | ---------------------- | ----------------------------------------------------------- |
| **ProviderFactory**  | Extend factory methods | Add `createCLIProvider()` alongside `createProvider()`      |
| **ConfigManager**    | Add new getters        | `getPreferredCLIProvider()`, `getCodexCommand()`            |
| **TerminalManager**  | Use existing API       | No changes needed, just call existing methods               |
| **UsageLogger**      | Extend for CLI logs    | Add CLI log parsers (Claude JSONL, Codex JSON)              |
| **AutonomousDriver** | Dependency injection   | Accept `LLMProvider` instead of creating `ClaudeCodeBridge` |

### Downstream Dependencies

Code that depends on areas we're modifying:

- `extension/src/autonomousCommands.ts:871-928` - Depends on `ClaudeCodeBridge`
  constructor signature
  - **Impact**: Must update to pass `LLMProvider` instead of API key

- `extension/src/autonomous/AutonomousDriver.ts` - Depends on bridge interface
  - **Impact**: Must use provider interface, not bridge-specific methods

- `extension/src/autonomous/ClaudeCodeUsageAdapter.ts:52-93` - Reads
  Claude-specific logs
  - **Impact**: Must add Codex log adapter or generalize interface

- `tests/integration/claude-api-flow.test.ts` - Integration tests for Claude API
  - **Impact**: Must add Codex integration tests with same structure

---

## Open Questions

- [ ] **Q1**: Should we support running Claude API and Codex CLI simultaneously?
      (e.g., Claude for council, Codex for autonomous)
  - **Context**: Some users may want to use different providers for different
    purposes
  - **Impact**: Would require provider-per-context configuration

- [ ] **Q2**: How do we handle CLI-specific features (e.g., Claude MCP servers,
      Codex web search)?
  - **Option A**: Expose as optional capabilities (feature detection)
  - **Option B**: Ignore provider-specific features (lowest common denominator)
  - **Option C**: Provider-specific settings for advanced features

- [ ] **Q3**: Should we cache CLI processes or spawn fresh for each query?
  - **Trade-off**: Cached = faster but stateful, Fresh = slower but isolated
  - **Recommendation**: Start with fresh, optimize to cached if performance
    becomes issue

- [ ] **Q4**: Do we need a migration guide for users currently using Claude
      Code?
  - **Context**: No config changes required (defaults to auto-detection)
  - **Decision**: Update docs with new "Provider Selection" section

- [ ] **Q5**: Should we implement streaming for CLI responses?
  - **Challenge**: CLI output arrives in chunks via stdout
  - **Benefit**: Real-time feedback for long responses
  - **Complexity**: Requires parsing incomplete responses, handling line breaks

---

## Recommendations

### Phase 1: Foundation (Week 1)

1. **Create CLI Provider Adapters**
   - Implement `CLIProviderAdapter` base class
   - Add `ClaudeCodeCLIProvider` (wrapper for `claude` CLI)
   - Add `CodexCLIProvider` (wrapper for `codex` CLI)
   - Register both in `ProviderFactory`

2. **Refactor ClaudeCodeBridge**
   - Change constructor to accept `LLMProvider`
   - Replace SDK calls with `provider.query()`
   - Add tests for both API and CLI providers

3. **Add VSCode Settings**
   - Add `gofer.cliProvider` dropdown to `package.json`
   - Add `gofer.codexCommand` string setting
   - Update `ConfigManager` with new getters

### Phase 2: Integration (Week 2)

4. **Update Autonomous Mode**
   - Modify `autonomousCommands.ts` to use ProviderFactory
   - Update `AutonomousDriver` for provider injection
   - Test with both Claude and Codex CLIs

5. **Implement Auto-Detection**
   - Add CLI availability checks
   - Show VSCode notifications for missing CLIs
   - Default to available CLI if `auto` selected

6. **Extend Usage Tracking**
   - Add Codex log adapter
   - Normalize token usage across providers
   - Update AI Usage panel to show provider type

### Phase 3: Validation (Week 3)

7. **Comprehensive Testing**
   - Unit tests for each adapter
   - Integration tests for provider switching
   - E2E tests for pipeline with both CLIs
   - Backward compatibility test suite

8. **Documentation**
   - Update README with provider selection instructions
   - Add troubleshooting guide for CLI installation
   - Document CLI-specific features and limitations

9. **Performance Optimization**
   - Benchmark CLI spawn overhead
   - Implement provider caching if needed
   - Optimize terminal I/O buffering

### Future Enhancements (Post-MVP)

- **Provider-Specific Features**: Expose MCP servers (Claude) and web search
  (Codex) as optional capabilities
- **Streaming Support**: Implement real-time response streaming for CLI
  providers
- **Fallback Chains**: Auto-switch to API if CLI fails (graceful degradation)
- **Provider Metrics**: Track usage by provider type for cost optimization
- **Custom Providers**: Plugin API for community-contributed CLI providers

---

## Technology Research Sources

**Claude Code CLI Research**:

- [Claude Code overview - Claude Code Docs](https://code.claude.com/docs/en/overview)
- [Shipyard | Claude Code CLI Cheatsheet](https://shipyard.build/blog/claude-code-cheat-sheet/)
- [Inside Claude Code: A Deep Dive into Anthropic's Agentic CLI Assistant | Medium](https://medium.com/@dingzhanjun/inside-claude-code-a-deep-dive-into-anthropics-agentic-cli-assistant-a4bedf3e6f08)
- [Claude Code by Anthropic | AI Coding Agent, Terminal, IDE](https://claude.com/product/claude-code)
- [GitHub - anthropics/claude-code](https://github.com/anthropics/claude-code)

**Codex CLI Research**:

- [Codex CLI - OpenAI Developers](https://developers.openai.com/codex/cli)
- [GitHub - openai/codex](https://github.com/openai/codex)
- [OpenAI Codex CLI: Official Description & Setup Guide (Updated 2026-02)](https://smartscope.blog/en/generative-ai/chatgpt/openai-codex-cli-comprehensive-guide/)
- [Codex CLI features](https://developers.openai.com/codex/cli/features/)
- [Slash commands in Codex CLI](https://developers.openai.com/codex/cli/slash-commands/)

**VSCode Integration Research**:

- [Use Claude Code in VS Code - Claude Code Docs](https://code.claude.com/docs/en/vs-code)
- [Claude Code VS Code Extension: Setup & Integration Guide](https://claudefa.st/blog/tools/extensions/claude-code-vscode)
- [Enabling Claude Code to work more autonomously](https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously)
- [Third-party agents in Visual Studio Code](https://code.visualstudio.com/docs/copilot/agents/third-party-agents)

---

## Next Steps

1. **Proceed to Specification** (`/2_gofer_specify`)
   - Define provider abstraction architecture
   - Specify VSCode settings schema
   - Document API contracts for CLI adapters

2. **Technical Planning** (`/3_gofer_plan`)
   - Design class hierarchy for CLI providers
   - Plan refactoring strategy for ClaudeCodeBridge
   - Define test strategy for provider switching

3. **Task Breakdown** (`/4_gofer_tasks`)
   - Create implementation tasks for each phase
   - Estimate effort for adapter development
   - Plan parallel work streams (foundation, integration, validation)
