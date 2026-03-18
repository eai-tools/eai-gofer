---
feature: '028-cross-platform-command-parity'
created: 2026-03-18T18:45:00Z
stage: 2_specify
status: paused
context_usage: 82%
last_commit: 58b97ce
branch: main
---

# Session Checkpoint: Cross-Platform Command Parity

## Current State

### Pipeline Progress

| Stage             | Status  | Artifact                          |
| ----------------- | ------- | --------------------------------- |
| 1_gofer_research  | ✅ done | research.md (24KB, comprehensive) |
| 2_gofer_specify   | 🔄 next | spec.md (not started)             |
| 3_gofer_plan      | pending | -                                 |
| 4_gofer_tasks     | pending | -                                 |
| 5_gofer_implement | pending | -                                 |
| 6_gofer_validate  | pending | -                                 |

### Active Stage

- **Current Stage**: Ready to start `/2_gofer_specify`
- **Next Action**: Generate spec.md with specification writer and validator
  agents
- **Why Paused**: Context health check returned CRITICAL status (82% = 165k/200k
  tokens)

### Discovery & Research Completed

**Discovery Findings**
(`.specify/specs/028-cross-platform-command-parity/discovery.md`):

- Problem: Feature 027 only implemented backend API switching, NOT actual
  command availability
- Target Users: All four types (Copilot teams, Codex teams, mixed teams,
  cost-conscious teams)
- Value: Complete Feature 027 deliverables + 100% parity + provider choice
  freedom
- Success Metrics: 18/18 commands, 100% feature parity tests, 25%+ user
  adoption, zero bugs
- Default Provider: VSCode settings dropdown (`gofer.defaultCLI`)

**Research Findings**
(`.specify/specs/028-cross-platform-command-parity/research.md`):

- Current state: 16 Claude commands (full support), 16 Copilot prompts
  (partial), 0 Codex skills (none)
- Technology decisions made:
  1. Codex SKILL.md format (`.system/skills/*/SKILL.md` with YAML frontmatter)
  2. Copilot parallel agent simulation (2026 Copilot CLI supports native
     multi-agent)
  3. Auto-chaining via instructions (embedded in markdown body)
  4. VSCode defaultCLI setting (enum dropdown: claude | copilot | codex |
     auto-detect)
  5. Feature parity test strategy (integration tests per platform)
- Integration points: ConfigManager, ProviderFactory, AutonomousCommands, MCP
  Tool Handler
- Constraints: Claude as reference implementation, platform detection
  limitations

## Code Changes

### Uncommitted Changes

| File                                                | Status    | Description                                         |
| --------------------------------------------------- | --------- | --------------------------------------------------- |
| `.specify/specs/028-cross-platform-command-parity/` | New (dir) | Feature directory with discovery.md and research.md |
| `CROSS-PLATFORM-COMMANDS-ANALYSIS.md`               | New       | Technical analysis document (not needed in commit)  |
| `.specify/.gofer-version`                           | Modified  | Version tracking (routine)                          |
| `.specify/memory/enriched-context.json`             | Modified  | Memory updates (routine)                            |
| `.specify/memory/memories.jsonl`                    | Modified  | Memory entries (routine)                            |
| Multiple `spec.md` files in other features          | Modified  | Routine updates (not related to 028)                |

### Changes To Commit

Before continuing, commit the feature discovery and research artifacts:

```bash
git add .specify/specs/028-cross-platform-command-parity/discovery.md
git add .specify/specs/028-cross-platform-command-parity/research.md
git commit -m "feat(028): complete discovery and research for cross-platform command parity

Discovery findings:
- Problem: Feature 027 incomplete - missing command availability
- Target: All 4 user types (Copilot, Codex, mixed, cost-conscious teams)
- Value: Complete Feature 027 + 100% parity + provider choice
- Metrics: 18/18 commands, 100% tests, 25%+ adoption, zero bugs

Research findings:
- Current: 16 Claude cmds (full), 16 Copilot prompts (partial), 0 Codex skills
- Decisions: Codex SKILL.md format, Copilot parallel agents, auto-chain via instructions
- Integration: ConfigManager, ProviderFactory, AutonomousCommands, MCP
- Constraints: Claude = reference, platform detection limits

Next: /2_gofer_specify to generate spec.md

Checkpoint created by /7_gofer_save
Stage: 2_specify
Context: 82% (CRITICAL)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Files NOT to Modify (Protected)

- `.claude/commands/*.md` (18 files) - Reference implementation, do NOT modify
- `extension/src/extension.ts` - Core extension, modify only if necessary
- `extension/src/autonomous/AutoHandoffTrigger.ts` - Recently refactored
  (v1.22.0)

## Context for Resumption

### Key Decisions Made

1. **Codex Skill Format**: Use OpenAI's official `.system/skills/*/SKILL.md`
   format with YAML frontmatter (name, description, arguments, result_schema)
2. **Copilot Enhancement Strategy**: Add parallel agent simulation
   instructions + auto-chain guidance (2026 Copilot CLI now supports multi-agent
   natively)
3. **Default Provider Setting**: Add `gofer.defaultCLI` VSCode setting (enum:
   claude|copilot|codex|auto-detect, default: auto-detect)
4. **Command Generation**: Programmatically generate Codex/Copilot files from
   Claude source of truth to minimize maintenance burden
5. **Feature Parity Tests**: Write integration tests that verify identical
   behavior (auto-chaining, parallel agents, history preservation) across all
   three platforms

### Research Insights

1. **Current State Gap**:
   - Claude CLI: 16 commands with full features (auto-chain, Task tool, history
     preservation)
   - Copilot Chat: 16 prompts but missing Task tool (no parallel agents) and
     auto-chaining
   - Codex CLI: Zero commands (`.system/skills/` directory doesn't exist)

2. **Technology Stack**:
   - Codex requires `.system/skills/{skill-name}/SKILL.md` with metadata: name,
     description, arguments[], result_schema
   - Copilot uses `.github/prompts/{name}.prompt.md` with frontmatter: name,
     description, agent, tools[], argument-hint
   - Both need instructions for auto-chaining (Skill tool invocation pattern)

3. **Web Research Findings** (2026):
   - Codex CLI skill discovery: `codex skills list` scans `.system/skills/` at
     workspace root
   - Copilot 2026 update: Native multi-agent support, can spawn parallel
     sub-agents via delegation syntax
   - MCP limitations: Only supported by Claude CLI, not Copilot or Codex (need
     platform-specific tool adapters)

### Blockers Encountered

None. Research phase completed successfully with no blockers.

### Open Questions

None. All discovery questions answered by user during consultative interview.

## Resumption Instructions

### Quick Resume

```bash
# In NEW Claude Code session (fresh context window):
cd /Users/douglaswross/Code/gofer
git checkout main
/8_gofer_resume
```

The resume command will:

1. Load this checkpoint file
2. Restore feature context (discovery.md, research.md)
3. Continue with `/2_gofer_specify` stage

### Manual Resume Steps

1. **Read context files**:
   - This checkpoint file (session-checkpoint.md)
   - `.specify/specs/028-cross-platform-command-parity/discovery.md` - Business
     context
   - `.specify/specs/028-cross-platform-command-parity/research.md` - Technical
     decisions

2. **Commit artifacts** (see "Changes To Commit" section above)

3. **Continue with specification**:
   ```bash
   /2_gofer_specify
   ```

### Context to Load First (Priority Order)

1. **This checkpoint file** - High-level summary and decisions
2. **discovery.md** (5.7KB) - Business problem, users, value, metrics
3. **research.md** (24KB) - Technical analysis, integration points, constraints
4. **Template file** - `.specify/templates/spec-template.md` for structure
   reference

### Specification Stage Next Steps

The `/2_gofer_specify` command will:

1. **Spawn Agent 1: Specification Writer** (sonnet model)
   - Read discovery.md and research.md
   - Generate complete spec.md with:
     - User stories (P1/P2/P3 with acceptance criteria)
     - Functional requirements (testable, reference codebase patterns)
     - Non-functional requirements (performance, security, compatibility)
     - Success criteria (measurable, technology-agnostic)
     - Research traceability matrix

2. **Spawn Agent 2: Quality Checklist & Research Validator** (haiku model)
   - Cross-reference spec.md against research.md
   - Build coverage matrix (integration points, constraints, patterns)
   - Generate requirements checklist
   - Validate all research findings are addressed

3. **Review and iterate**:
   - Check research coverage percentage
   - Fix any MISSING items
   - Handle [NEEDS CLARIFICATION] markers (max 3)
   - Validate quality checklist passes

4. **Auto-chain to planning**:
   - Invoke `/3_gofer_plan` when spec.md is complete

## Test Status

- [ ] Build passes: `npm run build` (not run - no code changes yet)
- [ ] Tests pass: `npm test` (not run - no code changes yet)
- [ ] Lint passes: `npm run lint` (not run - no code changes yet)

## Implementation Scope (from Research)

### What Needs to Be Created

1. **Codex Skills Directory** (NEW):
   - `.system/skills/0_business_scenario/SKILL.md`
   - `.system/skills/1_gofer_research/SKILL.md`
   - `.system/skills/2_gofer_specify/SKILL.md`
   - (... 15 more skill files, 18 total)

2. **Enhanced Copilot Prompts** (MODIFY):
   - Add parallel agent simulation instructions to all 16 prompts
   - Add auto-chain guidance (invoke next stage command)
   - Expand instructions to match Claude feature parity

3. **VSCode Settings** (NEW):
   - Add `gofer.defaultCLI` to package.json:441-700
   - Add getter to ConfigManager (config.ts:125-402)

4. **Cross-Platform Router** (NEW):
   - `extension/src/council/CrossPlatformCommandRouter.ts`
   - Detect which platform is active (Claude/Copilot/Codex)
   - Route commands to appropriate implementation
   - Preserve conversation history across switches

5. **Feature Parity Tests** (NEW):
   - `tests/integration/cross-platform-parity.test.ts`
   - Test auto-chaining works in all platforms
   - Test parallel agent spawning (6 validation agents)
   - Test history preservation on provider switch
   - Test autonomous mode execution

### What NOT to Modify

- `.claude/commands/*.md` - These are the reference implementation
- Feature 027 backend provider switching - That works correctly
- Existing ProviderFactory auto-detection logic - Reuse as-is

## Notes

**Critical Context Insight**: The reason we hit 82% context usage is that
research.md is comprehensive (24KB) and includes full code examples, web
research findings, and detailed technology decisions. This is expected and
demonstrates thorough research. The specification stage will use sub-agents to
generate spec.md WITHOUT loading full research into main context.

**Next Session Strategy**: When resuming with `/8_gofer_resume`, the resume
command will:

1. Load only this checkpoint summary (~3k tokens)
2. Reference discovery.md and research.md by path (agents read them directly)
3. Start specification with fresh 200k context window
4. Keep main context clean by delegating to sub-agents

**User Expectation**: User explicitly requested "the same functionality
(COMPLETELY) as available in Claude CLI in codex cli and copilot cli" with full
code review, engineering review, research, planning, and implementation. This is
a substantial feature requiring all 6 pipeline stages.

**Timeline Estimate**: Based on scope (18 skill files + 16 prompt enhancements +
router + tests + settings), implementation phase will be 8-12 hours. Full
pipeline: 16-20 hours total.
