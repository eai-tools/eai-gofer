---
id: 011-validation-fixes
title: Validation Fixes from 010-addclaudeinstructions
status: draft
created: 2026-03-06
updated: 2026-03-06
author: Claude
---

# Validation Fixes from 010-addclaudeinstructions

## Overview

This feature resolves 6 validation findings discovered during the
010-addclaudeinstructions validation stage. Two findings are RED (blocking) --
silent file generation without user consent and a missing integration test
marked as complete. Three are YELLOW (minor) -- a line count threshold mismatch
between spec and tests, a gap in Python project detection, and a
spec/implementation mismatch on file conflict options. One is an architecture
documentation decision requiring clarification.

These fixes ensure the AI instruction file generation system behaves as
specified, has adequate test coverage, and accurately detects project
characteristics across all supported languages.

**Research Reference**: See `research.md` for codebase analysis, integration
points, and brownfield constraints.

## User Stories

### US1: User Consent Before AI Instruction File Generation (P1)

When the extension detects missing AI instruction files (AGENTS.md, CLAUDE.md,
copilot-instructions.md) during workspace activation, the user must be prompted
before any files are generated. If the user declines, no files are created and
no further prompts appear for the remainder of that session.

**Why this priority**: This is a RED finding. Generating files without user
consent violates user trust and the original specification. Users should always
have control over what files are created in their workspace.

**Independent Test**: Can be fully tested by opening a workspace that lacks AI
instruction files and verifying that a prompt appears before any generation
occurs. Declining the prompt should prevent file creation and suppress future
prompts until the extension reloads.

**Acceptance Scenarios**:

1. **Given** a workspace with Gofer initialized but missing AI instruction
   files, **When** the extension activates and runs syncMissingResources,
   **Then** the user is prompted with "Missing AI instruction files (AGENTS.md,
   CLAUDE.md). Generate them?" with "Yes" and "No" options.

2. **Given** the user is prompted about missing AI instruction files, **When**
   the user selects "Yes", **Then** the AI instruction files are generated as
   before.

3. **Given** the user is prompted about missing AI instruction files, **When**
   the user selects "No", **Then** no AI instruction files are created and no
   further prompts for AI instruction generation appear for the remainder of the
   session.

4. **Given** the user previously declined AI instruction file generation in this
   session, **When** syncMissingResources runs again (e.g., workspace reload
   without extension restart), **Then** no prompt is shown and no files are
   generated.

5. **Given** the user declined in a previous session, **When** the extension is
   restarted (new session), **Then** the user is prompted again (decline does
   not persist across sessions).

---

### US2: Integration Test for Regeneration Re-Detection (P1)

An integration test must exist that verifies the regenerate command correctly
re-detects project characteristics after manifest file changes. This test was
specified as T035b and marked as completed, but the test file does not exist.

**Why this priority**: This is a RED finding. A marked-as-complete task with no
corresponding test file means the acceptance criterion (US4-AC3 from the
original spec) has no test coverage. The regeneration re-detection flow is a key
user journey.

**Independent Test**: The integration test itself IS the deliverable. It can be
verified by running the test suite and confirming the test passes.

**Acceptance Scenarios**:

1. **Given** a workspace configured as a JavaScript project (package.json only),
   **When** the regenerate AI instructions command is executed, **Then** the
   generated files reference "JavaScript" as the detected language.

2. **Given** a workspace initially detected as JavaScript, **When** a
   tsconfig.json file is added to the workspace and the regenerate command is
   executed again, **Then** the generated files now reference "TypeScript" as
   the detected language.

3. **Given** the integration test file exists at the specified path, **When**
   the test suite is run, **Then** the test passes without manual intervention.

---

### US3: Python Project Detection for setup.py and requirements.txt (P2)

The project language detection must recognize Python projects that use
`setup.py` (setuptools) or `requirements.txt` (pip) as their primary manifest
files, not only `pyproject.toml`.

**Why this priority**: This is a YELLOW finding. Python projects using older
tooling (setuptools) or minimal configurations (requirements.txt only) are
currently detected as "unknown" language, resulting in incorrect or missing
language-specific content in generated AI instruction files.

**Independent Test**: Can be tested by creating a workspace with only a
`setup.py` or `requirements.txt` file and verifying that the detected language
is "python".

**Acceptance Scenarios**:

1. **Given** a workspace containing only a `setup.py` file, **When** the project
   language is detected, **Then** the detected language is "python".

2. **Given** a workspace containing only a `requirements.txt` file, **When** the
   project language is detected, **Then** the detected language is "python".

3. **Given** a workspace containing both `pyproject.toml` and `setup.py`,
   **When** the project language is detected, **Then** the detected language is
   "python" (pyproject.toml takes priority as the modern standard).

4. **Given** a workspace containing both `package.json` and `requirements.txt`,
   **When** the project language is detected, **Then** the detected language
   reflects the higher-priority manifest file (the language detection priority
   order determines the result).

---

### US4: Consistent Line Count Threshold (P2)

The specification, test descriptions, and test assertions for generated
CLAUDE.md file length must all use the same threshold. The spec originally
stated `< 60 lines`, while tests assert `< 80 lines`. Research indicates Claude
handles instruction files up to approximately 80 lines effectively, so the
threshold should be aligned to `< 80 lines`.

**Why this priority**: This is a YELLOW finding. The mismatch between spec and
tests creates confusion about the true acceptance criterion. Aligning to `< 80`
is the pragmatic choice since the generated content naturally falls in the 60-80
range and research supports this threshold.

**Independent Test**: Can be verified by checking that the spec, test
descriptions, and test assertions all reference the same threshold value.

**Acceptance Scenarios**:

1. **Given** the 010-addclaudeinstructions spec exists, **When** the line count
   success criterion is reviewed, **Then** it states `< 80 lines` (updated from
   `< 60`).

2. **Given** test files for InstructionGenerator and setupDefaultInstructions,
   **When** test descriptions reference a line count target, **Then** the
   descriptions and assertions both use `< 80`.

---

### US5: Accurate File Conflict Options in Spec (P2)

The specification for regeneration file conflict handling must accurately
reflect the implemented behavior. The original spec said "overwrite, merge, or
skip" but the implementation offers "Overwrite, Skip, or Backup & Replace".
"Backup & Replace" is a safer alternative to merge because it preserves the
original file and avoids the complexity of markdown section merging.

**Why this priority**: This is a YELLOW finding. The spec/implementation
mismatch creates confusion during validation. The implemented behavior ("Backup
& Replace") is arguably better than the specified behavior ("merge").

**Independent Test**: Can be verified by reviewing the updated spec text and
confirming it matches the actual prompt options in the codebase.

**Acceptance Scenarios**:

1. **Given** the 010-addclaudeinstructions spec US4-AC2 text, **When** it is
   reviewed, **Then** it references "overwrite, skip, or backup & replace"
   instead of "overwrite, merge, or skip".

---

### US6: Sub-Agent Architecture Documentation Alignment (P3)

The project documentation (MEMORY.md) must accurately reflect the current
pipeline orchestration approach. MEMORY.md states that Skill-based chaining was
"replaced by sub-agent architecture" but all stage command files still use
Skill-based AUTO-CHAIN. The documentation should clarify the current state and
defer the full sub-agent migration to a dedicated feature.

**Why this priority**: This is an architecture documentation issue, not a code
bug. It is lower priority because it does not affect end-user behavior, but it
causes confusion during pipeline development and validation.

**Independent Test**: Can be verified by reading MEMORY.md and confirming it
accurately describes the current orchestration pattern used by stage commands.

**Acceptance Scenarios**:

1. **Given** MEMORY.md contains notes about pipeline orchestration, **When** the
   notes are reviewed, **Then** they accurately state that Skill-based chaining
   is the current implementation and sub-agent dispatch is planned for a future
   feature.

2. **Given** a sub-agent migration is planned, **When** the documentation is
   reviewed, **Then** a reference to a future feature (e.g.,
   012-subagent-migration) exists for tracking.

---

### Edge Cases

- What happens if the user closes the AI instruction prompt without selecting
  "Yes" or "No" (e.g., presses Escape)? The prompt should be treated as a
  decline for that invocation but not suppress future prompts in the same
  session (since the user may have dismissed accidentally).
- What happens if `syncMissingResources()` is called from the explicit
  `initialize()` path (user-initiated)? The prompt should still appear since the
  user has explicitly initiated the action.
- What happens if a workspace has both `requirements.txt` AND a higher-priority
  manifest like `tsconfig.json`? The higher-priority file wins (TypeScript is
  detected, not Python). This is correct behavior.
- What happens if the regeneration integration test runs on a system without the
  full VSCode extension host? The test should use appropriate mocking for VSCode
  APIs while testing the actual detection and generation logic.

## Functional Requirements

### FR-001: User Consent Prompt for AI Instruction Generation

The system MUST prompt the user before generating AI instruction files during
the `syncMissingResources()` operation. The prompt must offer "Yes" and "No"
options. Only if the user selects "Yes" should files be generated.

- **Validation**: Unit test verifying `vscode.window.showInformationMessage` is
  called before `setupDefaultInstructions()`.
- **Integration**: GoferMigrator.syncMissingResources() at line 472 in
  `extension/src/goferMigrator.ts`.

### FR-002: Session-Scoped Decline Persistence

The system MUST track the user's decline decision for the duration of the
current session. If the user declines AI instruction generation, no further
prompts for AI instruction generation should appear until the extension is
restarted.

- **Validation**: Unit test verifying that a second call to
  `syncMissingResources()` after decline does not show a prompt and does not
  generate files.
- **Integration**: Instance variable on GoferMigrator, naturally reset on
  extension restart.

### FR-003: Integration Test for Regeneration Re-Detection

The system MUST have an integration test that verifies the regenerate command
correctly re-detects project characteristics when manifest files change.

- **Validation**: Test file exists at the expected path and passes in the test
  suite.
- **Integration**: `tests/integration/instruction-generation.test.ts`.

### FR-004: Extended Python Language Detection

The project language detection MUST recognize `setup.py` and `requirements.txt`
as Python project indicators. These should be checked after `pyproject.toml`
(which remains the highest-priority Python indicator) and before non-Python
manifest files.

- **Validation**: Unit test for ProjectDetector verifying Python detection with
  `setup.py` and `requirements.txt`.
- **Integration**: `extension/src/services/ProjectDetector.ts` detectLanguage()
  method.

### FR-005: Aligned Line Count Threshold

The specification, test descriptions, and test assertions for generated
CLAUDE.md file length MUST all use the `< 80 lines` threshold consistently.

- **Validation**: Review of spec text and test assertions for consistent values.
- **Integration**: `tests/unit/services/InstructionGenerator.test.ts` and
  `tests/unit/services/setupDefaultInstructions.test.ts`.

### FR-006: Accurate File Conflict Options

The 010-addclaudeinstructions specification MUST document the actual file
conflict options offered to users: "Overwrite", "Skip", or "Backup & Replace".

- **Validation**: Text review of spec US4-AC2.
- **Integration**: `.specify/specs/010-addclaudeinstructions/spec.md`.

### FR-007: Documentation Alignment for Pipeline Orchestration

MEMORY.md MUST accurately reflect that Skill-based chaining is the current
pipeline orchestration pattern, and that sub-agent dispatch is planned for a
future dedicated feature.

- **Validation**: Text review of MEMORY.md pipeline orchestration section.
- **Integration**: `MEMORY.md` in the user's Claude projects directory.

## Non-Functional Requirements

### Performance

- The user consent prompt (FR-001) must not add perceptible delay to workspace
  activation. The prompt is non-blocking -- workspace activation continues for
  other resource types while the prompt is displayed.

### Security

- No new security concerns. The change adds a user consent gate, which improves
  security posture by preventing unauthorized file creation.

### Compatibility

- The user consent prompt must follow the existing GoferMigrator interaction
  pattern (using `vscode.window.showInformationMessage`), consistent with other
  prompts in the same file.
- The Python detection additions must maintain the existing priority-based
  detection order -- `pyproject.toml` remains the highest-priority Python
  indicator.
- Changes to the 010 spec are documentation-only and do not affect runtime
  behavior.

### Testing

- All new functionality must have corresponding unit tests.
- The integration test (FR-003) must run successfully in the CI pipeline.
- Existing tests must continue to pass after threshold alignment (FR-005).

## Success Criteria

| Metric                                 | Target                                                 | Measurement                                    |
| -------------------------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| User consent prompt shown              | 100% of syncMissingResources calls for AI instructions | Unit test assertion                            |
| Session decline suppression            | No re-prompt after decline until restart               | Unit test with multiple invocations            |
| Integration test exists and passes     | T035b test at expected path                            | `npm test` includes the test                   |
| Python detection with setup.py         | Language detected as "python"                          | Unit test with setup.py-only workspace         |
| Python detection with requirements.txt | Language detected as "python"                          | Unit test with requirements.txt-only workspace |
| Line count threshold consistency       | All references use `< 80`                              | Spec text and test assertion review            |
| Spec conflict options accuracy         | Spec says "Overwrite, Skip, Backup & Replace"          | Text review                                    |
| MEMORY.md accuracy                     | Documents current Skill-based chaining                 | Text review                                    |

## Assumptions

- GoferMigrator is instantiated once per workspace initialization, so an
  instance variable naturally provides session-scoped decline tracking without
  persistent state.
- The `syncMissingResources()` method may be called from both automatic
  activation paths and explicit user-initiated initialization. The prompt should
  appear in both cases (unless previously declined in this session).
- The 010-addclaudeinstructions spec and tasks files are available for text
  updates in `.specify/specs/010-addclaudeinstructions/`.
- Changing the line count threshold from `< 60` to `< 80` does not require
  template modifications since the generated content already falls within the
  60-80 range.
- "Backup & Replace" is an acceptable substitute for "merge" in the file
  conflict options (research confirms this is a safer approach).

## Dependencies

- **GoferMigrator** (`extension/src/goferMigrator.ts`): Must be modified for
  user consent prompt and session decline tracking.
- **ProjectDetector** (`extension/src/services/ProjectDetector.ts`): Must be
  modified for extended Python detection.
- **ResourceSyncer** (`extension/src/services/migration/ResourceSyncer.ts`): No
  changes needed -- the prompt is added in GoferMigrator before calling
  ResourceSyncer.
- **InitializationService** (`extension/src/services/InitializationService.ts`):
  No changes needed -- calls syncMissingResources() which will now include the
  prompt.
- **Test files**: `InstructionGenerator.test.ts`,
  `setupDefaultInstructions.test.ts`, and new `instruction-generation.test.ts`.
- **Spec files**: `010-addclaudeinstructions/spec.md` and `tasks.md` for
  documentation corrections.
- **MEMORY.md**: For pipeline orchestration documentation alignment.

## Out of Scope

- **Sub-agent architecture migration**: The full migration of stage commands
  from Skill-based AUTO-CHAIN to sub-agent dispatch is deferred to a dedicated
  feature (012-subagent-migration). This feature only updates MEMORY.md to
  accurately document the current state.
- **Markdown merge functionality**: Implementing a "merge" option for file
  conflicts is out of scope. "Backup & Replace" is the adopted approach.
- **Template modifications**: If the line count threshold is relaxed to `< 80`,
  no template shrinking is needed. Templates remain as-is.
- **New AI instruction file types**: Only the existing three file types
  (AGENTS.md, CLAUDE.md, copilot-instructions.md) are in scope.
- **Changes to ResourceSyncer**: The prompt is added in GoferMigrator, not in
  ResourceSyncer. ResourceSyncer's file creation logic remains unchanged.

## Decisions

### ADR-011-001: Line Count Threshold Relaxed to < 80

**Context**: The 010 spec stated `< 60 lines` for generated CLAUDE.md. Research
found Claude handles up to ~80 lines effectively. Tests already assert `< 80`.

**Decision**: Relax the spec threshold to `< 80 lines` and align all references.

**Rationale**: The generated content naturally falls in the 60-80 range.
Tightening templates to stay under 60 would require removing useful content.
Research supports the `< 80` threshold.

### ADR-011-002: Backup & Replace Instead of Merge

**Context**: The 010 spec US4-AC2 specified "overwrite, merge, or skip" but the
implementation offers "Overwrite, Skip, Backup & Replace".

**Decision**: Update the spec to match the implementation.

**Rationale**: Markdown section merging is fragile and error-prone for
user-modified content. "Backup & Replace" preserves the original file (.bak) and
generates a fresh file, which is safer and simpler.

### ADR-011-003: Sub-Agent Migration Deferred

**Context**: MEMORY.md documents a sub-agent architecture (v1.16+) that replaces
Skill-based chaining, but all stage command files still use Skill-based
AUTO-CHAIN.

**Decision**: Defer the sub-agent migration to a dedicated feature
(012-subagent-migration). Update MEMORY.md to accurately reflect the current
state.

**Rationale**: The sub-agent migration is a fundamental pipeline change
affecting 8+ command files. Mixing it with targeted bug fixes increases risk and
scope.

## Glossary

| Term                   | Definition                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| syncMissingResources   | GoferMigrator method that detects and syncs missing Gofer resources during workspace activation              |
| AI instruction files   | AGENTS.md, CLAUDE.md, and copilot-instructions.md -- files that provide coding guidelines to AI assistants   |
| Session                | The lifecycle of a GoferMigrator instance, from extension activation to extension deactivation or restart    |
| ProjectDetector        | Service that analyzes workspace files to determine language, framework, test runner, and package manager     |
| T035b                  | A task from 010-addclaudeinstructions specifying an integration test for regeneration re-detection           |
| Skill-based AUTO-CHAIN | Current pipeline pattern where each stage command invokes the next stage via the Skill tool                  |
| Sub-agent dispatch     | Planned pipeline pattern where the orchestrator dispatches each stage as a Task sub-agent with fresh context |

## Research Traceability

| Research Finding                                           | Spec Section                | Reference             |
| ---------------------------------------------------------- | --------------------------- | --------------------- |
| RED: US5 user prompting gap in syncMissingResources        | US1, FR-001, FR-002         | Finding 1             |
| RED: Missing T035b integration test                        | US2, FR-003                 | Finding 2             |
| Architecture: Sub-agent vs Skill chaining mismatch         | US6, FR-007, ADR-011-003    | Finding 3             |
| YELLOW: Line count threshold mismatch (<60 vs <80)         | US4, FR-005, ADR-011-001    | Finding 4             |
| YELLOW: Python detection gap (setup.py, requirements.txt)  | US3, FR-004                 | Finding 5             |
| YELLOW: Merge option vs Backup & Replace mismatch          | US5, FR-006, ADR-011-002    | Finding 6             |
| GoferMigrator instance variable for session-scoped decline | FR-002, Assumptions         | Decision 1            |
| Priority order for Python detection (after pyproject.toml) | FR-004, Compatibility NFR   | Finding 5, Brownfield |
| Backward compatibility for syncMissingResources prompt     | NFR Performance, Edge Cases | Brownfield Analysis   |
