---
feature: '028-cross-platform-command-parity'
created: '2026-03-18T18:10:00Z'
discoveredBy: Claude + douglaswross
status: complete
---

# Business Discovery: Cross-Platform Command Parity

## Problem Statement

**Pain Point**: Feature 027 (multi-provider-cli-support) only implemented
backend API switching but did NOT deliver actual command availability in Codex
CLI and GitHub Copilot Chat. Users expected v1.22.0 to enable Gofer slash
commands across all three platforms but discovered:

- Codex CLI: Zero commands (missing `.system/skills/` directory)
- Copilot Chat: Partial commands (`.github/prompts/` exist but lack critical
  features)
- Only Claude CLI has full functionality via `.claude/commands/`

**Current State**:

- 18 Gofer commands ONLY work fully in Claude Code CLI
- Copilot Chat has 18 prompt files but missing: Task tool (parallel agents),
  auto-chaining, full feature set
- Codex CLI has nothing - no skill files whatsoever

**Impact**: Teams cannot switch AI providers without losing Gofer functionality,
creating vendor lock-in despite Feature 027 claims

## Target Users

### Primary Users (All Selected)

1. **Teams using GitHub Copilot Chat**
   - **Technical Level**: Professional developers
   - **Key Needs**: Gofer pipeline commands available in Copilot Chat with full
     feature parity

2. **Teams using Codex CLI**
   - **Technical Level**: Professional developers, OpenAI customers
   - **Key Needs**: Gofer commands accessible via Codex CLI's skill system

3. **Mixed-tool teams**
   - **Technical Level**: Varied (some use Claude, some Copilot, some Codex)
   - **Key Needs**: Consistent workflow regardless of which AI assistant team
     members use

4. **Cost-conscious teams**
   - **Technical Level**: Professional developers, budget-aware
   - **Key Needs**: Ability to switch providers based on cost/performance
     without retraining or workflow changes

## Value Proposition

**Primary Value**: All of the above

1. Complete Feature 027 deliverables (deliver what was promised in v1.22.0)
2. 100% Feature Parity (identical Gofer experience across Claude/Copilot/Codex)
3. Provider Choice Freedom (choose based on cost/performance without capability
   sacrifice)

**Quantified Goal**:

- All 18 Gofer commands work identically in Claude CLI, Codex CLI, and Copilot
  Chat
- Zero functional gaps between platforms
- Zero user-reported bugs about cross-platform behavior differences

## Success Metrics

| Metric               | Target         | Measurement                                                                                    |
| -------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| Command Availability | 18/18 commands | All commands callable in all three platforms                                                   |
| Feature Parity Tests | 100% pass      | Integration tests verify auto-chaining, parallel agents, history preservation in all platforms |
| User Adoption        | 25%+ switch    | Track provider usage after feature ships (expect 25%+ to switch from Claude to Copilot/Codex)  |
| Bug Reports          | Zero critical  | No user-reported issues about cross-platform functional differences                            |

## Default Provider Selection

**User Choice**: VSCode settings dropdown

**Implementation**:

- Add `gofer.defaultCLI` setting to VSCode settings
- Options: `claude` | `copilot` | `codex` | `auto-detect`
- Default: `auto-detect` (preserves backward compatibility)
- Setting takes effect immediately (no reload required)

## Competitive Analysis

**Status**: Skipped (not applicable - this is completing our own Feature 027)

## Discovery Decisions

| Decision         | Choice                   | Rationale                                                                                                                                 |
| ---------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Problem Focus    | Incomplete Feature 027   | v1.22.0 promised multi-provider support but only delivered backend API switching, not actual command availability                         |
| User Target      | All four user types      | Cross-platform support benefits Copilot users, Codex users, mixed teams, and cost-conscious teams equally                                 |
| Value Metric     | All three values         | Must complete Feature 027 deliverables AND achieve 100% parity AND enable provider freedom                                                |
| Default Provider | VSCode settings dropdown | Most discoverable, follows VSCode conventions, integrates with existing gofer.cliProvider setting from Feature 027                        |
| Success Metrics  | All four metrics         | Command availability (must have), feature parity tests (quality gate), user adoption (business metric), zero bugs (customer satisfaction) |

## Critical Requirements Captured

From user input: "Enable complete feature parity for all Gofer commands across
Claude CLI, Codex CLI, and GitHub Copilot Chat" including:

1. **Auto-chaining pipeline**: `/0_business_scenario` must auto-chain through
   all 6 stages in all platforms
2. **Parallel agent spawning**: `/6_gofer_validate` must spawn 6 validation
   agents in parallel in all platforms
3. **Conversation history preservation**: Switching providers mid-session must
   preserve context
4. **Autonomous mode execution**: Autonomous features must work identically
   across platforms
5. **Default provider selection**: Users must be able to choose which CLI to use
   as default

## Technical Scope (Preliminary)

**What needs to be created**:

1. `.system/skills/*.skill.md` - 18 Codex CLI skill files
2. Enhanced `.github/prompts/*.prompt.md` - Upgrade to full feature parity
3. Cross-platform command router - Detects platform and routes to appropriate
   implementation
4. Feature parity test suite - Verifies identical behavior across all platforms
5. VSCode settings integration - `gofer.defaultCLI` dropdown

**Out of Scope**:

- Changing Feature 027 backend provider switching (that works correctly)
- Modifying existing `.claude/commands/` files (those are the reference
  implementation)

## Next Steps

1. ✅ Discovery complete
2. 🔄 Route to `/1_gofer_research` to start pipeline
3. Auto-chain through: research → specify → plan → tasks → implement → validate
