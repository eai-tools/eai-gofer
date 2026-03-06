---
feature: 011-validation-fixes
spec: spec.md
research: research.md
status: ready
created: 2026-03-06
---

# Implementation Plan: Validation Fixes from 010-addclaudeinstructions

**Branch**: `011-validation-fixes` | **Date**: 2026-03-06 | **Spec**: spec.md
**Input**: 6 validation findings (2 RED, 3 YELLOW, 1 architecture decision) from
010-addclaudeinstructions validation.

## Summary

This plan addresses 6 validation findings by making targeted fixes across the
GoferMigrator (user consent prompt), ProjectDetector (Python detection gap),
test files (line count threshold alignment), spec files (documentation
corrections), and MEMORY.md (pipeline orchestration accuracy). The scope is
deliberately narrow -- each fix is surgical and independently testable with no
new architectural patterns introduced.

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2
- **Framework**: VSCode Extension API
- **Testing**: Vitest (unit + integration)
- **Build**: Webpack for bundling
- **Packaging**: @vscode/vsce for VSIX creation

### Architecture

All changes are within the existing extension architecture. No new modules,
services, or dependencies are required. The changes fall into three categories:

1. **Code changes** (US1, US3): Modify existing TypeScript source files
2. **Test additions** (US2): Create one new integration test file
3. **Documentation fixes** (US4, US5, US6): Update spec text and MEMORY.md

### Integration Points

| Component            | File                                                 | Integration Type                                                         |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| GoferMigrator        | `extension/src/goferMigrator.ts`                     | Add user prompt before AI instruction generation (US1)                   |
| ProjectDetector      | `extension/src/services/ProjectDetector.ts`          | Add `setup.py` and `requirements.txt` to language detection (US3)        |
| CommandRegistry      | `extension/src/services/CommandRegistry.ts`          | Source of regenerate command logic; tested by new integration test (US2) |
| InstructionGenerator | `extension/src/services/InstructionGenerator.ts`     | Consumed by regenerate command; no changes needed                        |
| ResourceSyncer       | `extension/src/services/migration/ResourceSyncer.ts` | Called by GoferMigrator; no changes needed                               |

### Key Dependencies

- `vscode.window.showInformationMessage` -- existing API used by GoferMigrator
  for other prompts; reused for US1 consent prompt
- `FileUtils.exists` -- existing utility used by ProjectDetector; no new
  utilities needed
- Vitest test runner -- used for both unit and integration tests

## Constitution Check

- [x] **I. Test-Driven Development**: New unit tests for US1 (consent prompt)
      and US3 (Python detection). New integration test for US2 (regeneration
      re-detection). Tests written before implementation per TDD.
- [x] **II. MCP-First Architecture**: No MCP changes; all fixes are in extension
      layer.
- [x] **III. Spec Kit Format Compliance**: Spec and plan follow standard format
      with YAML frontmatter.
- [x] **IV. Strict TypeScript & Code Quality**: All changes use proper types; no
      `any` introduced. Functions remain well under 300-line limit.
- [x] **V. Security by Default**: US1 adds a consent gate, improving security
      posture.
- [x] **VI. Performance Requirements**: US1 prompt is non-blocking; no
      measurable performance impact.
- [x] **VII. 80% Test Coverage**: New code (prompt logic, Python detection) has
      corresponding tests.
- [x] **VIII. Minimal Necessary Changes**: Each fix is surgical; no refactoring
      of surrounding code.

## Implementation Phases

### Phase 1: Code Changes -- User Consent Prompt (US1)

**Goal**: Add user consent prompt in `syncMissingResources()` before generating
AI instruction files, with session-scoped decline tracking.

**Tasks**:

- [ ] Add `private instructionPromptDeclined = false` instance variable to
      `GoferMigrator` class (line 34 area, alongside other private fields)
- [ ] Modify `syncMissingResources()` at line 472-475 to:
  1. Check `this.instructionPromptDeclined` first -- if true, skip silently
  2. Show `vscode.window.showInformationMessage()` prompt with "Yes" and "No"
  3. If "Yes": proceed with `this.resourceSyncer.setupDefaultInstructions()`
  4. If "No": set `this.instructionPromptDeclined = true`, skip generation
  5. If dismissed (Escape/undefined): skip this invocation but do NOT set the
     decline flag (user may have dismissed accidentally)
- [ ] Write unit tests in `tests/unit/extension/GoferMigrator.test.ts`:
  - Test: prompt is shown when AI instructions are missing
  - Test: files are generated when user selects "Yes"
  - Test: files are NOT generated when user selects "No"
  - Test: no prompt shown on second call after decline (session persistence)
  - Test: prompt IS shown again after extension restart (new instance)
  - Test: dismissed prompt (undefined response) does not set decline flag

**Files Modified**:

| File                                         | Change                                                       |
| -------------------------------------------- | ------------------------------------------------------------ |
| `extension/src/goferMigrator.ts`             | Add instance variable + prompt logic in syncMissingResources |
| `tests/unit/extension/GoferMigrator.test.ts` | Add syncMissingResources test cases                          |

**Verification**:

- [ ] Unit tests for all acceptance scenarios pass
- [ ] Existing GoferMigrator tests still pass
- [ ] `npm run lint` passes

### Phase 2: Code Changes -- Python Detection (US3)

**Goal**: Add `setup.py` and `requirements.txt` to Python language detection in
`ProjectDetector.detectLanguage()`.

**Tasks**:

- [ ] Add two entries to the `checks` array in `detectLanguage()` at line 69
      (after `pyproject.toml`, before `go.mod`):
  - `{ file: 'setup.py', language: 'python' }`
  - `{ file: 'requirements.txt', language: 'python' }`
- [ ] Write unit tests in `tests/unit/services/ProjectDetector.test.ts`:
  - Test: workspace with only `setup.py` detects as "python"
  - Test: workspace with only `requirements.txt` detects as "python"
  - Test: workspace with `pyproject.toml` AND `setup.py` detects via
    `pyproject.toml` (priority order preserved)
  - Test: workspace with `tsconfig.json` AND `requirements.txt` detects as
    "typescript" (higher priority wins)

**Files Modified**:

| File                                          | Change                                                |
| --------------------------------------------- | ----------------------------------------------------- |
| `extension/src/services/ProjectDetector.ts`   | Add `setup.py` and `requirements.txt` to checks array |
| `tests/unit/services/ProjectDetector.test.ts` | Add Python detection test cases                       |

**Verification**:

- [ ] New Python detection tests pass
- [ ] Existing ProjectDetector tests still pass
- [ ] Priority order verified (tsconfig.json > pyproject.toml > setup.py >
      requirements.txt > go.mod > ...)

### Phase 3: Test Addition -- Integration Test for Regeneration Re-Detection (US2)

**Goal**: Create the missing integration test that verifies regenerate command
correctly re-detects project characteristics after manifest file changes.

**Tasks**:

- [ ] Create `tests/integration/instruction-generation.test.ts`
- [ ] Test structure:
  1. **Setup**: Create temp workspace with `package.json` only (JavaScript
     project)
  2. **First detection**: Run `ProjectDetector.detect()` and
     `InstructionGenerator.generateClaudeMd()` -- verify content references
     "JavaScript"
  3. **Add manifest**: Write `tsconfig.json` to workspace
  4. **Re-detection**: Run `ProjectDetector.detect()` and
     `InstructionGenerator.generateClaudeMd()` again -- verify content now
     references "TypeScript"
  5. **Cleanup**: Remove temp workspace
- [ ] Use real `FileUtils` (unmock fs) since this is an integration test
      operating on actual temp directories
- [ ] Follow existing integration test patterns (see
      `tests/integration/command-registration.test.ts` for import/setup style)

**Files Created**:

| File                                               | Purpose                                                |
| -------------------------------------------------- | ------------------------------------------------------ |
| `tests/integration/instruction-generation.test.ts` | Integration test for regeneration re-detection (T035b) |

**Verification**:

- [ ] Integration test passes with `npm test`
- [ ] Test is discovered by Vitest test runner
- [ ] Test exercises real file I/O (no mocked filesystem)

### Phase 4: Documentation Fixes (US4, US5, US6)

**Goal**: Align spec text, test descriptions, and documentation with actual
implementation behavior.

**Tasks**:

#### US4: Line Count Threshold Alignment

- [ ] Update `tests/unit/services/InstructionGenerator.test.ts` line 169: Change
      test description from "under 60 lines" to "under 80 lines" (assertion at
      line 174 already uses `toBeLessThan(80)` -- no change needed there)
- [ ] Update `.specify/specs/010-addclaudeinstructions/spec.md` line 283: Change
      `< 60 lines` to `< 80 lines` in the success criteria table
- [ ] Update `.specify/specs/010-addclaudeinstructions/spec.md` line 348: Change
      `CLAUDE.md < 60 lines optimal` to `CLAUDE.md < 80 lines optimal`

#### US5: File Conflict Options

- [ ] Update `.specify/specs/010-addclaudeinstructions/spec.md` lines 106-107:
      Change "overwrite, merge (append new sections), or skip" to "overwrite,
      skip, or backup & replace"

#### US6: MEMORY.md Pipeline Orchestration

- [ ] Update MEMORY.md section "DEPRECATED: Pipeline auto-chaining via Skill
      invocation (replaced by sub-agent architecture)" to accurately reflect:
  - Skill-based AUTO-CHAIN is the **current** implementation pattern
  - Sub-agent dispatch is **planned** for a future feature
    (012-subagent-migration)
  - The section title should not say "DEPRECATED" since that pattern is still
    active
  - Reference ADR-011-003 for the deferral decision

**Files Modified**:

| File                                               | Change                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `tests/unit/services/InstructionGenerator.test.ts` | Fix test description to say "under 80 lines"                            |
| `.specify/specs/010-addclaudeinstructions/spec.md` | Update `< 60` to `< 80` in two places; update merge to backup & replace |
| MEMORY.md (user's Claude projects directory)       | Correct pipeline orchestration description                              |

**Verification**:

- [ ] All existing tests pass (no assertion changes needed -- assertions already
      use `< 80`)
- [ ] Spec text matches implementation behavior
- [ ] MEMORY.md accurately describes current pipeline pattern

## File Structure

```text
extension/src/
├── goferMigrator.ts                              # US1: Add prompt + decline flag
└── services/
    └── ProjectDetector.ts                        # US3: Add setup.py, requirements.txt

tests/
├── unit/
│   ├── extension/
│   │   └── GoferMigrator.test.ts                 # US1: New syncMissingResources tests
│   └── services/
│       ├── ProjectDetector.test.ts               # US3: New Python detection tests
│       └── InstructionGenerator.test.ts          # US4: Fix test description
└── integration/
    └── instruction-generation.test.ts            # US2: New integration test (created)

.specify/specs/010-addclaudeinstructions/
└── spec.md                                       # US4, US5: Documentation corrections

~/.claude/projects/.../memory/
└── MEMORY.md                                     # US6: Pipeline orchestration accuracy
```

## Risk Assessment

| Risk                                                                                            | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User prompt during workspace activation could be annoying if files are persistently missing     | Medium | Session-scoped decline flag prevents repeated prompts after "No". Dismiss (Escape) does not set decline flag, allowing re-prompt on next activation cycle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Adding `requirements.txt` to Python detection could cause false positives for polyglot projects | Low    | `requirements.txt` is placed after all specific-language manifests (`tsconfig.json`, `pyproject.toml`, `go.mod`, etc.) but before `package.json`. A project with both `package.json` and `requirements.txt` would need `requirements.txt` listed before `package.json` to be detected as Python. Current order: `tsconfig.json > pyproject.toml > setup.py > requirements.txt > go.mod > Cargo.toml > pom.xml > build.gradle > package.json`, which means `requirements.txt` IS before `package.json`. However, polyglot projects with both a Python helper and a main Node.js project are uncommon. The priority order matches the intent: Python-specific files should take precedence over a generic `package.json`. |
| GoferMigrator test mocking may be complex due to DI container                                   | Low    | Existing `GoferMigrator.test.ts` already has working DI mock setup. New tests follow the same pattern. Mock `vscode.window.showInformationMessage` for prompt testing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Integration test relies on real file I/O                                                        | Low    | Use `os.tmpdir()` for isolation. Clean up in `afterEach`. Follow existing integration test patterns in the codebase.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Notes

- **No new dependencies**: All changes use existing APIs and utilities.
- **No architectural changes**: The sub-agent migration (ADR-011-003) is
  explicitly deferred to 012-subagent-migration.
- **Backward compatible**: The user prompt is the only behavioral change visible
  to end users. All other changes are in tests, specs, or documentation.
- **Phase ordering**: Phases 1-3 (code/test changes) are independent and could
  be implemented in parallel. Phase 4 (documentation) has no code dependencies.
- **Test approach for US1**: GoferMigrator tests will need to mock
  `vscode.window.showInformationMessage` and
  `ResourceSyncer.setupDefaultInstructions`. The existing test file already
  mocks the DI container and creates real workspace directories.
- **Integration test approach for US2**: The test exercises `ProjectDetector`
  and `InstructionGenerator` directly (not through the VSCode command system)
  since the command system requires the full extension host. This tests the
  re-detection logic which is the core acceptance criterion.

## Spec Traceability

### User Story Coverage

| Story    | Priority | Status  | Plan References                              |
| -------- | -------- | ------- | -------------------------------------------- |
| US1 (P1) | P0       | COVERED | Phase 1: GoferMigrator prompt + decline flag |
| US2 (P1) | P1       | COVERED | Phase 3: Integration test creation           |
| US3 (P2) | P1       | COVERED | Phase 2: ProjectDetector language detection  |
| US4 (P2) | P2       | COVERED | Phase 4: Threshold alignment in spec + tests |
| US5 (P2) | P2       | COVERED | Phase 4: Spec text correction                |
| US6 (P3) | P3       | COVERED | Phase 4: MEMORY.md correction                |

### Acceptance Criteria Coverage

| User Story | Acceptance Criterion                                | Plan Component                                        | Implementation Approach                                                      |
| ---------- | --------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| US1        | Prompt shown before generation                      | Phase 1, GoferMigrator.syncMissingResources           | `vscode.window.showInformationMessage()` before `setupDefaultInstructions()` |
| US1        | "Yes" generates files                               | Phase 1, GoferMigrator.syncMissingResources           | Proceed to `setupDefaultInstructions()` on "Yes"                             |
| US1        | "No" prevents generation, suppresses future prompts | Phase 1, GoferMigrator.instructionPromptDeclined flag | Set flag on "No", check flag on entry                                        |
| US1        | Declined session does not re-prompt                 | Phase 1, GoferMigrator.instructionPromptDeclined flag | Instance variable checked before showing prompt                              |
| US1        | New session re-prompts                              | Phase 1, GoferMigrator instance variable              | New GoferMigrator instance = flag reset to false                             |
| US2        | JS project detected as JavaScript                   | Phase 3, integration test                             | `ProjectDetector.detect()` with `package.json` only                          |
| US2        | Adding tsconfig.json changes to TypeScript          | Phase 3, integration test                             | Write `tsconfig.json`, re-run `ProjectDetector.detect()`                     |
| US2        | Test exists and passes                              | Phase 3, integration test file creation               | File at `tests/integration/instruction-generation.test.ts`                   |
| US3        | `setup.py` detected as python                       | Phase 2, ProjectDetector.detectLanguage               | Add `{ file: 'setup.py', language: 'python' }` to checks array               |
| US3        | `requirements.txt` detected as python               | Phase 2, ProjectDetector.detectLanguage               | Add `{ file: 'requirements.txt', language: 'python' }` to checks array       |
| US3        | `pyproject.toml` takes priority over `setup.py`     | Phase 2, priority order                               | `pyproject.toml` is already higher in the array                              |
| US3        | Higher-priority manifest wins                       | Phase 2, priority order                               | Detection uses first-match; order is preserved                               |
| US4        | Spec says `< 80 lines`                              | Phase 4, spec text edit                               | Update 010 spec success criteria table                                       |
| US4        | Tests say `< 80 lines`                              | Phase 4, test description edit                        | Update test description string                                               |
| US5        | Spec says "backup & replace"                        | Phase 4, spec text edit                               | Update 010 spec US4-AC2 text                                                 |
| US6        | MEMORY.md reflects current Skill-based chaining     | Phase 4, MEMORY.md edit                               | Rewrite pipeline orchestration section                                       |
| US6        | Reference to 012-subagent-migration exists          | Phase 4, MEMORY.md edit                               | Add note about planned future feature                                        |

### Requirement Coverage

| Requirement | Plan Component                          | Phase   | Implementation Approach                                               |
| ----------- | --------------------------------------- | ------- | --------------------------------------------------------------------- |
| FR-001      | GoferMigrator.syncMissingResources      | Phase 1 | Add `showInformationMessage` call before `setupDefaultInstructions()` |
| FR-002      | GoferMigrator.instructionPromptDeclined | Phase 1 | Instance variable, checked at entry of AI instructions block          |
| FR-003      | instruction-generation.test.ts          | Phase 3 | Create integration test with JS-to-TS re-detection flow               |
| FR-004      | ProjectDetector.detectLanguage          | Phase 2 | Add `setup.py` and `requirements.txt` to checks array                 |
| FR-005      | InstructionGenerator.test.ts, 010 spec  | Phase 4 | Align all references to `< 80`                                        |
| FR-006      | 010 spec US4-AC2                        | Phase 4 | Change "merge" to "backup & replace"                                  |
| FR-007      | MEMORY.md                               | Phase 4 | Rewrite to reflect current Skill-based chaining pattern               |

Coverage: 100% of user stories, 100% of functional requirements
