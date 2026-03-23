---
feature: 028-cross-platform-command-parity
iteration: 2
score: 65/100
generated: 2026-03-23T12:30:15-07:00
failed_categories:
  [Functional Correctness, Integration Reality, Performance Baseline]
---

# Remediation Report: Cross-Platform Command Parity

## Iteration 2 of 3

**Score**: 65/100 **Status**: FAIL — Remediation Required

## Failed Categories

### Functional Correctness (0/20 points)

**Evidence**: 4 Red findings from validation-correctness agent:

1. Spec claims 18 commands but only 16 exist in `.agents/skills/`
2. Documentation files missing (setup-codex-cli.md, setup-copilot-chat.md,
   setup-claude-code.md, legacy-workflow.md)
3. Performance test file missing (validation-parallel.test.ts)
4. Conversation history preservation tests removed (T066), US-4 acceptance
   criteria untested

**Required Actions**:

1. **Resolve command count mismatch**:
   - Audit actual commands: `ls .agents/skills/ | wc -l` shows 16
   - Determine if 2 commands missing or if spec incorrectly claims 18
   - If missing: identify which 2 commands and create SKILL.md files
   - If spec wrong: update spec.md lines 40, references to reflect 16 commands
   - Update README.md line 108 to match authoritative count
   - Update tests to validate correct count

2. **Create missing documentation files**:
   - Create `docs/setup-codex-cli.md` with installation, config, first command
   - Create `docs/setup-copilot-chat.md` with GitHub Copilot setup steps
   - Create `docs/setup-claude-code.md` with Claude Code CLI setup
   - Create `docs/legacy-workflow.md` documenting manual workflow
   - Add hyperlinks from README capability matrix (line 105-111) to these guides

3. **Create performance test**:
   - Create `tests/performance/validation-parallel.test.ts`
   - Test that validation with 6 parallel agents completes in <60 seconds
   - Measure actual time and assert against threshold
   - Use real validation agent spawning (not mocked)

4. **Add conversation history integration tests**:
   - Rewrite 5 integration tests for US-4 (T066)
   - Use real CLI provider adapters, not full mocks
   - Test message format normalization (JSONL ↔ JSON)
   - Test credential redaction during provider switches
   - Verify ProviderFactory.ts:264-290 history transfer logic
   - Test MCP context graceful degradation

**Files to modify**:

- `.specify/specs/028-cross-platform-command-parity/spec.md` — Fix command count
  or identify missing commands
- `docs/setup-codex-cli.md` — Create (NEW FILE)
- `docs/setup-copilot-chat.md` — Create (NEW FILE)
- `docs/setup-claude-code.md` — Create (NEW FILE)
- `docs/legacy-workflow.md` — Create (NEW FILE)
- `tests/performance/validation-parallel.test.ts` — Create (NEW FILE)
- `tests/integration/cross-platform-parity.test.ts` — Add US-4 conversation
  history tests
- `README.md:105-111` — Add hyperlinks to setup guides

### Integration Reality (0/10 points)

**Evidence**: validation-integration agent found 3 Yellow boundary issues:

1. Type-unsafe history method calls using
   `(provider as any).getConversationHistory()` instead of formal interface
2. Conversation history integration tests removed due to over-mocking, relies on
   manual testing
3. 4 pre-existing test failures in Phase 6 conversation history (not blocking
   for this feature but noted)

**Required Actions**:

1. **Create IHistoryProvider interface**:
   - Define interface with `getConversationHistory()` and
     `setConversationHistory()` methods
   - Update CLIProviderAdapter.ts to implement interface explicitly
   - Replace type casting in ProviderFactory.ts:264,266,288,290 with typed
     interface calls
   - Add compile-time type safety for history methods

2. **Rewrite conversation history integration tests** (same as Functional
   Correctness action #4):
   - Remove over-mocked tests (already done in iteration 1)
   - Add 5 new tests using real CLI provider instances
   - Test actual boundary behavior: format normalization, credential redaction
   - Verify Claude → Codex → Claude transitions preserve full context

**Files to modify**:

- `extension/src/council/providers/cli/IHistoryProvider.ts` — Create interface
  (NEW FILE)
- `extension/src/council/providers/cli/CLIProviderAdapter.ts:348-358` —
  Implement interface
- `extension/src/council/providers/ProviderFactory.ts:264-290` — Use typed
  interface
- `tests/integration/cross-platform-parity.test.ts` — Add conversation history
  tests (5 new tests)

### Performance Baseline (0/5 points)

**Evidence**: validation-performance agent found 3 Red findings of synchronous
I/O in async methods:

1. `CrossPlatformCommandRouter.loadSkillForPlatform()` uses `fs.readFileSync()`
   at line 105
2. `CommandGenerator.generateCodexSkill()` uses `fs.writeFileSync()` at line 143
3. `CommandGenerator.generateCopilotPrompt()` uses `fs.writeFileSync()` at line
   195

**Required Actions**:

1. **Fix CrossPlatformCommandRouter sync I/O**:
   - Replace `fs.readFileSync(commandPath, 'utf8')` with
     `await fs.promises.readFile(commandPath, 'utf8')`
   - Convert `loadSkillForPlatform()` from sync to async method
   - Update method signature:
     `public async loadSkillForPlatform(...): Promise<string>`
   - Update all callers to await the method

2. **Fix CommandGenerator sync I/O** (2 methods):
   - Replace `fs.writeFileSync(skillPath, skillContent, 'utf8')` with
     `await fs.promises.writeFile(...)`
   - Replace `fs.writeFileSync(promptPath, promptContent, 'utf8')` with
     `await fs.promises.writeFile(...)`
   - Both methods already declared `async`, just need to use async file
     operations
   - Also replace `fs.mkdirSync()` with `await fs.promises.mkdir()`

3. **Verify async method usage**:
   - Grep for all callers of `loadSkillForPlatform()` and ensure they await
   - Grep for all callers of `generateCodexSkill()` and
     `generateCopilotPrompt()` and ensure they await
   - Already done in CommandMetadataExtractor.ts which has async methods - use
     those instead of sync

**Files to modify**:

- `extension/src/council/CrossPlatformCommandRouter.ts:105` — Replace
  readFileSync with promises.readFile
- `extension/src/council/CommandGenerator.ts:143` — Replace writeFileSync with
  promises.writeFile
- `extension/src/council/CommandGenerator.ts:195` — Replace writeFileSync with
  promises.writeFile
- `extension/src/council/CommandGenerator.ts:141,193` — Replace mkdirSync with
  promises.mkdir
- Update callers if method signatures change to async

## Remediation Scope

The following pipeline stages should re-run focused on these areas:

- **Research**: Not needed (architecture is sound)
- **Specify**: Review and fix command count (16 vs 18) in spec.md
- **Plan**: Not needed (implementation plan is correct)
- **Tasks**: Review task completion - some documentation tasks may have been
  skipped
- **Implement**:
  1. Fix 16 vs 18 command count mismatch (verify or create missing commands)
  2. Create 4 missing documentation files
  3. Replace 3 instances of sync I/O with async fs.promises
  4. Create IHistoryProvider interface and update ProviderFactory
  5. Add 5 conversation history integration tests
  6. Create performance test for parallel validation
- **Validate**: Re-run after implementation fixes

## Root Cause Analysis

**Primary Issue**: **Test-driven development process breakdown in conversation
history preservation**. Tests were written with heavy mocking (mocking entire
`createCLIProvider` method), realized the mocks were testing mock behavior not
real code, correctly removed over-mocked tests (showing good engineering
judgment), but failed to replace them with proper integration tests using real
CLI providers.

**Secondary Issue**: **Spec-implementation drift on command count**. Spec claims
18 commands (likely written before final implementation) but actual
implementation has 16 commands. This was not caught earlier because tests
validated what exists (16) rather than what spec claims (18).

**Tertiary Issue**: **Async I/O fix only partially applied**. Iteration 1
created async methods in CommandMetadataExtractor (extractFromClaudeCommand,
extractFromCopilotPrompt, extractFromCodexSkill) but didn't update all callers
to use them. CrossPlatformCommandRouter and CommandGenerator still use sync I/O.

**Process Gap**: Missing step between removing bad tests and re-running
validation. Should have immediately rewritten tests with real providers before
marking task complete.

## Success Criteria for Iteration 3

To pass validation (100/100 score), iteration 3 must achieve:

1. ✅ **Command count aligned** — Spec, README, tests, and implementation all
   agree on 16 or 18 commands
2. ✅ **All documentation files exist** — 4 setup guide files created and linked
   from README
3. ✅ **Zero sync I/O in async paths** — All 3 instances replaced with
   fs.promises
4. ✅ **Conversation history tested** — 5 new integration tests verify US-4
   acceptance criteria
5. ✅ **Performance verified** — Test confirms parallel validation completes in
   <60 seconds
6. ✅ **IHistoryProvider interface** — Type-safe history method calls replace
   (provider as any)

## Estimated Remediation Effort

- **Command count fix**: 1-2 hours (audit + fix spec OR create 2 missing
  commands)
- **Documentation files**: 2-3 hours (4 files × 30-45 min each)
- **Sync I/O fixes**: 30-60 minutes (straightforward replacements)
- **IHistoryProvider interface**: 30-45 minutes (extract existing methods to
  interface)
- **Conversation history tests**: 2-3 hours (5 tests with real providers)
- **Performance test**: 45-60 minutes (spawn agents, measure time)

**Total**: 7-10 hours of focused engineering work

## Previous Iterations

| Iteration | Score  | Failed Categories                                                                          | Date       |
| --------- | ------ | ------------------------------------------------------------------------------------------ | ---------- |
| 1         | 30/100 | Functional Correctness, Test Authenticity, Integration, Performance, Hygiene, Traceability | 2026-03-23 |
| 2         | 65/100 | Functional Correctness, Integration Reality, Performance Baseline                          | 2026-03-23 |

**Progress**: +35 points from iteration 1 → 2

- ✅ Fixed Test Authenticity: Removed over-mocked tests, 0% mock ratio
- ✅ Fixed Code Hygiene: Removed describe.skip, zero TODO/FIXME
- ✅ Fixed Error Path Coverage: No empty catch blocks
- ✅ Fixed Specification Traceability: Tests map to user stories
- ❌ Still failing: Functional Correctness (4 Red findings)
- ❌ Still failing: Integration Reality (conversation history tests missing)
- ❌ Still failing: Performance Baseline (sync I/O in async methods)

---

_Generated by Gofer Validation Pipeline | Iteration 2 | Next: /5_gofer_implement
(focused remediation)_
