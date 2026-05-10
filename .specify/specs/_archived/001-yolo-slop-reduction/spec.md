---
id: 001-yolo-slop-reduction
title: YOLO Slop Reduction Mode
status: draft
created: '2026-02-12'
updated: '2026-02-12'
author: Claude
---

# YOLO Slop Reduction Mode

## Overview

Automatic code quality cleanup that runs silently during development. When
enabled via a VSCode setting, the system auto-detects and auto-fixes common
"slop" patterns on file save — removing leftover `console.log` statements,
`debugger` keywords, and upgrading `@ts-ignore` to `@ts-expect-error`. Every fix
is logged to a JSONL audit trail, and the developer receives a batched
notification every N fixes (configurable).

**Research Reference**: See `research.md` for codebase analysis, integration
points, and existing SlopDetector discovery.

## User Stories

### US1: Auto-Fix Slop on Save (P1)

**As a** developer using Gofer **I want** slop patterns to be automatically
fixed when I save a file **So that** I don't ship debug artifacts or low-quality
code patterns to production

**Why this priority**: Core value proposition — the whole feature is meaningless
without auto-fix on save.

**Independent Test**: Enable the setting, create a file with
`console.log('test')`, save it, verify the line is removed and a JSONL entry is
created.

**Acceptance Criteria**:

- [ ] AC1.1: When `gofer.yoloSlopReduction.enabled` is `true` and a
      `.ts/.tsx/.js/.jsx` file is saved, fixable slop patterns are automatically
      removed/replaced
- [ ] AC1.2: `console.log(...)` lines are removed entirely (the whole line)
- [ ] AC1.3: `debugger` lines are removed entirely
- [ ] AC1.4: `// @ts-ignore` is replaced with `// @ts-expect-error`
- [ ] AC1.5: Files in test directories (`**/tests/**`, `**/*.test.ts`,
      `**/*.spec.ts`) are NOT auto-fixed
- [ ] AC1.6: The file is not corrupted — non-slop lines remain untouched
- [ ] AC1.7: Auto-fix does NOT trigger an infinite save loop (re-entrant guard)

---

### US2: JSONL Audit Trail (P1)

**As a** developer or team lead **I want** every auto-fix to be logged with
timestamp, file, pattern, and before/after snippets **So that** I can review
what was changed and why, and have a record for accountability

**Why this priority**: Tied with US1 — silent fixes without an audit trail would
be unacceptable.

**Independent Test**: Enable slop reduction, save a file with slop, check
`.specify/logs/slop-reduction.jsonl` for the new entry.

**Acceptance Criteria**:

- [ ] AC2.1: Each fix is logged as a single JSON line to
      `.specify/logs/slop-reduction.jsonl`
- [ ] AC2.2: Each entry contains: `timestamp`, `file`, `line`, `pattern`,
      `originalSnippet`, `replacement`, `reason`
- [ ] AC2.3: Log directory is created lazily if it doesn't exist
- [ ] AC2.4: Logging failures are non-fatal (do not block the fix)

---

### US3: Batched Notification (P2)

**As a** developer **I want** to see a notification every N fixes (not on every
fix) **So that** I'm aware slop reduction is working without being overwhelmed
by notifications

**Why this priority**: Important for user confidence but not required for core
functionality.

**Independent Test**: Set `notifyEvery` to 3, trigger 3 fixes across multiple
saves, verify a notification appears saying "Gofer: Reduced 3 slop issues".

**Acceptance Criteria**:

- [ ] AC3.1: A VSCode information message appears every
      `gofer.yoloSlopReduction.notifyEvery` fixes (default 10)
- [ ] AC3.2: The notification shows cumulative count: "Gofer: Reduced N slop
      issues this session"
- [ ] AC3.3: The notification includes a "View Log" action that opens the JSONL
      file
- [ ] AC3.4: No notification appears between batches (not on every individual
      fix)

---

### US4: VSCode Settings Integration (P2)

**As a** developer **I want** to enable/disable slop reduction and configure
notification frequency via VSCode Settings **So that** I can control the
behavior without editing config files

**Why this priority**: Necessary for usability but the feature works with
defaults even without manual configuration.

**Independent Test**: Open VSCode Settings, search "gofer slop", toggle the
enabled setting, verify behavior changes.

**Acceptance Criteria**:

- [ ] AC4.1: `gofer.yoloSlopReduction.enabled` (boolean, default `false`)
      appears in VSCode Settings under Gofer section
- [ ] AC4.2: `gofer.yoloSlopReduction.notifyEvery` (number, default `10`)
      appears in VSCode Settings
- [ ] AC4.3: Changes take effect immediately (no reload required)
- [ ] AC4.4: ConfigManager provides typed getters for both settings

---

### US5: Extensible Pattern Registry (P3)

**As a** Gofer maintainer **I want** the auto-fix pattern list to be extensible
**So that** new fix patterns can be added without restructuring existing code

**Why this priority**: Architectural quality — important for maintainability but
doesn't deliver immediate user value.

**Independent Test**: Add a new pattern entry to the registry and verify it
participates in auto-fix without changing other code.

**Acceptance Criteria**:

- [ ] AC5.1: Fix patterns are defined in a declarative registry (pattern name,
      detection regex, fix function, reason string)
- [ ] AC5.2: Patterns without a `fix` function are detection-only (not
      auto-fixed)
- [ ] AC5.3: Adding a new fixable pattern requires only adding one entry to the
      registry

---

### Edge Cases

- What happens when a `console.log` spans multiple lines? Only single-line
  matches are auto-fixed; multi-line calls are skipped.
- What happens if the file is read-only? Auto-fix silently skips (non-fatal).
- What happens if two patterns match the same line? Process patterns in order;
  if a line is removed by pattern 1, pattern 2 doesn't apply.
- What happens during rapid multi-file saves? Each save triggers independently;
  the re-entrant guard is per-file.
- What happens if the JSONL log file is locked/corrupted? Logging failure is
  caught and ignored; the fix still applies.

## Functional Requirements

### FR-001: SlopReducer Class

System MUST provide a `SlopReducer` class that composes with the existing
`SlopDetector` to apply auto-fixes.

- **Validation**: Unit test creates SlopReducer, calls `reduceFile()`, verifies
  file content changes
- **Integration**: Composes with `SlopDetector.scanFile()` from
  `extension/src/autonomous/SlopDetector.ts`

### FR-002: Fix Pattern Registry

System MUST define fixable patterns as a declarative registry where each entry
includes: pattern name, detection regex, optional fix function, and reason
string.

- **Validation**: Registry contains at least 3 fixable patterns (console.log,
  debugger, @ts-ignore)
- **Integration**: Extends pattern concept from `SlopDetector.ts:40-83`

### FR-003: File Save Trigger

System MUST trigger auto-fix on `onDidSaveTextDocument` when the setting is
enabled.

- **Validation**: Integration test saves file with slop, verifies auto-fix ran
- **Integration**: Registered in `extension.ts` activation, follows existing
  event handler patterns

### FR-004: Re-entrant Guard

System MUST prevent infinite save loops when auto-fix modifies a file (which
triggers another save event).

- **Validation**: Unit test verifies `reduceFile()` is not called recursively
- **Integration**: Guard flag cleared after write completes

### FR-005: Test File Exclusion

System MUST skip auto-fix for files in test directories or with test file
extensions.

- **Validation**: Save a test file with `console.log`, verify it is NOT removed
- **Integration**: Path-based filter matching `**/tests/**`, `**/*.test.ts`,
  `**/*.spec.ts`

### FR-006: JSONL Audit Logging

System MUST append a JSON entry to `.specify/logs/slop-reduction.jsonl` for each
fix applied, with lazy directory creation.

- **Validation**: After fix, read JSONL file, parse last entry, verify fields
- **Integration**: Follows JSONL logging pattern from `extension.ts:1821-1837`

### FR-007: Batched Notifications

System MUST show a VSCode notification every N fixes (configurable), with
cumulative session count.

- **Validation**: Trigger N fixes, verify notification appears with correct
  count
- **Integration**: Uses `vscode.window.showInformationMessage()`

### FR-008: Settings Declaration

System MUST declare `gofer.yoloSlopReduction.enabled` and
`gofer.yoloSlopReduction.notifyEvery` in `package.json` contributes.

- **Validation**: Settings appear in VSCode Settings UI
- **Integration**: Added to `extension/package.json`
  `contributes.configuration.properties`

### FR-009: ConfigManager Integration

System MUST add typed getters to `ConfigManager` for the two new settings.

- **Validation**: Unit test calls getter, verifies correct default value
- **Integration**: Follows existing getter pattern in `extension/src/config.ts`

### Key Entities

- **SlopReducer**: The auto-fix engine. Holds fix counter, re-entrant guard,
  workspace path. Composes with SlopDetector.
- **FixPattern**: Registry entry — name, regex, fix function (optional), reason
  string.
- **FixLogEntry**: JSONL record — timestamp, file, line, pattern,
  originalSnippet, replacement, reason.

## Non-Functional Requirements

### Performance

- Auto-fix on a single file MUST complete in under 50ms for files up to 5,000
  lines
- No directory scanning on save — only the saved file is processed

### Security

- Auto-fix MUST NOT modify files outside the workspace
- JSONL log MUST NOT contain sensitive data (only code snippets, max 120 chars)

### Compatibility

- MUST compose with existing SlopDetector without modifying it
- MUST NOT affect existing slop diagnostics (squiggly lines in editor)
- MUST NOT affect existing slop-scan.jsonl logging
- Settings MUST follow existing `gofer.*` namespace convention

## Success Criteria

| Metric                | Target                                     | Measurement                      |
| --------------------- | ------------------------------------------ | -------------------------------- |
| Auto-fix accuracy     | 100% of fixable patterns correctly handled | Unit tests for each pattern      |
| No file corruption    | 0 non-slop lines modified                  | Before/after diff test           |
| Audit completeness    | Every fix has a JSONL entry                | Count fixes vs. log entries      |
| Notification batching | Exactly 1 notification per N fixes         | Integration test                 |
| Performance           | <50ms per file save                        | Benchmark test on 5000-line file |

## Assumptions

- The existing `SlopDetector` class will not change its public API (research
  finding: it's stable, detection-only)
- `onDidSaveTextDocument` event provides the file URI (VSCode API guarantee)
- The `.specify/logs/` directory is writable (existing pattern works)
- ConfigManager singleton is available at activation time (research finding:
  it's initialized in constructor)
- Users will enable the setting intentionally — default is `false` (opt-in)

## Dependencies

- `extension/src/autonomous/SlopDetector.ts` — Used for detection (compose, not
  modify)
- `extension/src/config.ts` — ConfigManager for settings access
- `extension/src/extension.ts` — Wire SlopReducer into activation
- `extension/package.json` — Declare settings in contributes.configuration
- `extension/src/utils/logger.ts` — Logger for SlopReducer's own debug output

## Out of Scope

- Auto-fixing `as any` casts (requires type inference context)
- Auto-fixing empty catch blocks (requires understanding error handling intent)
- Auto-fixing disabled tests (intentional skip decisions)
- Directory-wide batch fixes (only single-file on save)
- Per-pattern enable/disable settings (future enhancement)
- "Dry run" preview mode (future enhancement)
- Custom user-defined patterns (future enhancement)

## Glossary

| Term         | Definition                                                                       |
| ------------ | -------------------------------------------------------------------------------- |
| Slop         | Low-quality code patterns typically left by AI-assisted development or debugging |
| SlopDetector | Existing read-only scanner that identifies slop patterns (does NOT fix)          |
| SlopReducer  | New auto-fix engine that applies safe transformations to fix slop                |
| YOLO mode    | "You Only Live Once" — auto-fix without confirmation prompts                     |
| Fix pattern  | A declarative entry mapping a regex to an auto-fix function                      |

## Research Traceability

| Research Finding                       | Spec Section                | Reference                    |
| -------------------------------------- | --------------------------- | ---------------------------- |
| SlopDetector → SlopReducer composition | FR-001, Dependencies        | Research Integration Point 1 |
| ConfigManager singleton pattern        | FR-009, Dependencies        | Research Pattern 2           |
| JSONL logging pattern                  | FR-006                      | Research Pattern 3           |
| Settings declaration in package.json   | FR-008                      | Research Pattern 4           |
| File save watcher                      | FR-003                      | Research Pattern 5           |
| Notification throttling                | FR-007                      | Research Pattern 6           |
| File write safety constraint           | NFR Performance, Edge Cases | Research Constraint 1        |
| Performance <50ms constraint           | NFR Performance             | Research Constraint 2        |
| Test file exclusion constraint         | FR-005                      | Research Constraint 4        |
| Race condition / re-entrant guard      | FR-004                      | Research Constraint 5        |
| Separate SlopReducer class decision    | FR-001, Dependencies        | Research Decision 1          |
| Pattern registry with optional fix     | FR-002, US5                 | Research Decision 2          |
| onDidSaveTextDocument trigger          | FR-003                      | Research Decision 3          |
| Safe fix patterns (3 initial)          | FR-002                      | Research Decision 4          |
