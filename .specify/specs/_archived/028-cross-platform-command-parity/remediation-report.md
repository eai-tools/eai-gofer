---
feature: 028-cross-platform-command-parity
iteration: 1
score: 70/100
generated: 2026-03-23T02:22:00Z
failed_categories: [functional_correctness, performance_baseline, specification_traceability]
---

# Remediation Report: Cross-Platform Command Parity

## Iteration 1 of 3

**Score**: 70/100 **Status**: FAIL — Remediation Required

## Failed Categories

### Functional Correctness (0/20 points)

**Evidence**: 12 RED blocking issues from correctness agent:
- `.system/skills/` directory path fixed BUT directory empty (no SKILL.md files generated)
- AUTO-CHAIN instructions missing in all Copilot prompts and Codex skills
- Conversation history preservation test removed (line 11) with no replacement implementation
- Documentation gap: No capability matrix in README, no setup guides in `docs/`
- Performance tests missing (`validation-parallel.test.ts` for US-3.5)

**Required Actions**:

1. **Generate Codex CLI skills** (Priority: P1)
   - Run: `CommandGenerator.generateCommands('codex', false)` to populate `.system/skills/`
   - Expected output: 16 directories with SKILL.md files (1_gofer_research, 2_gofer_specify, etc.)
   - Verification: `ls .system/skills/` shows 16 subdirectories

2. **Add AUTO-CHAIN sections to command files** (Priority: P1)
   - Template from spec.md:431-438:
     ```markdown
     ## AUTO-CHAIN
     After completing this stage, automatically invoke the next stage:
     **Next command**: [/next_command or $ $next_command or #next_command]
     ```
   - Files to modify:
     - `.github/prompts/*.prompt.md` (16 files) - add AUTO-CHAIN section
     - `.system/skills/*/SKILL.md` (16 files) - add AUTO-CHAIN section
   - Next command mapping: 0→0a→1→2→3→4→5→6→6a

3. **Implement conversation history preservation OR remove from spec** (Priority: P1)
   - Option A (implement): Restore ProviderFactory history array preservation
     - File: `extension/src/council/providers/ProviderFactory.ts`
     - Add history normalization: JSONL ↔ JSON conversion
     - Add MCP context degradation handling
     - Add notification on provider switch
     - Add tests: `cross-platform-parity.test.ts` (restore removed test)
   - Option B (descope): Remove US-4 from spec.md if not MVP requirement

4. **Create documentation** (Priority: P2)
   - Create `docs/setup-codex-cli.md` with Codex installation and skill discovery
   - Create `docs/setup-copilot-chat.md` with Copilot prompt configuration
   - Create `docs/setup-claude-code.md` with Claude CLI reference
   - Add Platform Capabilities section to README.md:
     ```markdown
     ## Platform Capabilities
     | Feature | Claude Code | Copilot Chat | Codex CLI |
     |---------|-------------|--------------|-----------|
     | Auto-chaining | ✓ | ✓ | ⚠ Manual |
     | Parallel agents | ✓ (Task tool) | ✓ (manual) | ⚠ Multi-terminal |
     ```

5. **Add performance test** (Priority: P2)
   - Create `tests/integration/validation-parallel.test.ts`
   - Test: Spawn 6 validation agents, measure total execution time <60s
   - Assert: All agents return results, no timeouts

**Files to modify**:
- `extension/src/council/CommandGenerator.ts` — run generateCommands()
- `.github/prompts/*.prompt.md:EOF` — add AUTO-CHAIN sections (16 files)
- `.system/skills/*/SKILL.md:EOF` — add AUTO-CHAIN sections (16 files)
- `extension/src/council/providers/ProviderFactory.ts` — implement history preservation OR
- `.specify/specs/028-cross-platform-command-parity/spec.md` — remove US-4 if descoped
- `docs/setup-codex-cli.md` — create new file
- `docs/setup-copilot-chat.md` — create new file
- `docs/setup-claude-code.md` — create new file
- `README.md` — add Platform Capabilities section
- `tests/integration/validation-parallel.test.ts` — create new file

### Performance Baseline (0/5 points)

**Evidence**: 2 RED findings from performance agent:
- `fs.readdirSync()` in `getAllClaudeCommands()` (line 283) - blocks event loop during command discovery
- `fs.statSync()` in `getAllCodexSkills()` (line 312) - blocks event loop for directory type checking

**Required Actions**:

1. **Convert SkillDirectoryManager to async I/O** (Priority: P1)
   - Replace `fs.readdirSync()` with `await fs.promises.readdir()`
   - Replace `fs.statSync()` with `await fs.promises.stat()`
   - Convert `listCommands()` from sync to async: `public async listCommands(): Promise<CommandMetadata[]>`
   - Update all callers to await the async method

**Files to modify**:
- `extension/src/council/SkillDirectoryManager.ts:276-298` — convert `getAllClaudeCommands()` to async
- `extension/src/council/SkillDirectoryManager.ts:303-331` — convert `getAllCodexSkills()` to async
- `extension/src/council/SkillDirectoryManager.ts:109-128` — convert `listCommands()` to async
- `extension/src/council/CrossPlatformCommandRouter.ts:141-172` — update `listCommands()` caller to await

### Specification Traceability (0/5 points)

**Evidence**: 18/35 acceptance criteria pass, 12 fail due to missing features (auto-chain, history preservation, documentation)

**Required Actions**:

1. Complete US-1 through US-7 criteria by implementing actions from **Functional Correctness** section above
2. Verify every US criterion maps to:
   - Implementation code (file:line)
   - Test that exercises the code (test file:line)
   - Passing test assertion

**Files to modify**: Same as Functional Correctness section

## Remediation Scope

The following pipeline stages should re-run focused on these areas:

- **Research**: Not needed (infrastructure research complete)
- **Plan**: Update to reflect US-4 decision (implement vs descope)
- **Implement**:
  - Run CommandGenerator to populate `.system/skills/`
  - Add AUTO-CHAIN sections to 32 command files
  - Convert SkillDirectoryManager to async I/O
  - Create 4 documentation files
  - Implement history preservation OR update spec
  - Add performance test
- **Validate**: Re-run after fixes

## Previous Iterations

| Iteration | Score | Failed Categories | Date |
| --------- | ----- | ----------------- | ---- |
| 1         | 70/100 | functional_correctness, performance_baseline, specification_traceability | 2026-03-23 |

## Remediation Estimate

- **Functional Correctness**: 3-4 hours
  - Generate skills: 30 min
  - Add AUTO-CHAIN sections: 1 hour (32 files × 2 min each)
  - Documentation: 1.5 hours (4 files)
  - History preservation decision + implementation: 1 hour OR spec update: 15 min
- **Performance Baseline**: 1 hour
  - Async conversion: 45 min
  - Update callers: 15 min
- **Specification Traceability**: Covered by Functional Correctness work

**Total**: 4-5 hours to reach 100/100
