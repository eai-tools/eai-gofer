---
feature: YOLO Slop Reduction Mode
spec: spec.md
research: research.md
status: ready
created: '2026-02-12'
---

# Implementation Plan: YOLO Slop Reduction Mode

## Technical Context

### Tech Stack

- **Language**: TypeScript (strict mode)
- **Framework**: VSCode Extension API
- **Testing**: Vitest
- **Build**: Webpack

### Architecture

```text
┌──────────────────────────────────────────────────────┐
│ extension.ts (activation)                             │
│   ├── onDidSaveTextDocument → SlopReducer.reduceFile()│
│   └── ConfigManager.getSlopReductionEnabled()         │
├──────────────────────────────────────────────────────┤
│ SlopReducer                                           │
│   ├── FIX_PATTERNS registry (declarative)             │
│   ├── reduceFile(filePath) → FixResult                │
│   ├── isTestFile(filePath) → boolean                  │
│   ├── logFix(entry) → void                            │
│   └── maybeNotify() → void                            │
│   Uses: SlopDetector.scanFile() for detection         │
├──────────────────────────────────────────────────────┤
│ SlopDetector (existing, unchanged)                    │
│   ├── scanFile(filePath) → SlopMatch[]                │
│   └── scanDirectory(dirPath) → SlopReport             │
├──────────────────────────────────────────────────────┤
│ ConfigManager (extended)                              │
│   ├── getSlopReductionEnabled() → boolean             │
│   └── getSlopReductionNotifyEvery() → number          │
├──────────────────────────────────────────────────────┤
│ package.json (extended)                               │
│   ├── gofer.yoloSlopReduction.enabled (boolean)       │
│   └── gofer.yoloSlopReduction.notifyEvery (number)    │
└──────────────────────────────────────────────────────┘
```

### Integration Points

| Component            | File                                       | Integration Type             |
| -------------------- | ------------------------------------------ | ---------------------------- |
| SlopDetector         | `extension/src/autonomous/SlopDetector.ts` | Compose (call `scanFile()`)  |
| ConfigManager        | `extension/src/config.ts`                  | Extend (add getters + keys)  |
| Extension activation | `extension/src/extension.ts`               | Wire (register save handler) |
| Settings UI          | `extension/package.json`                   | Declare (add properties)     |
| Logger               | `extension/src/utils/logger.ts`            | Use (for debug output)       |

### Key Dependencies

- Existing `SlopDetector` class (detection only, no modifications)
- Existing `ConfigManager` singleton pattern
- VSCode `workspace.onDidSaveTextDocument` API
- Node.js `fs` module for file read/write and JSONL logging

## Constitution Check

- [x] **I. Test-Driven Development**: Unit tests for SlopReducer, fix patterns,
      and ConfigManager getters
- [x] **III. Spec Kit Format**: Spec follows YAML frontmatter + structured
      sections
- [x] **IV. Strict TypeScript**: No `any` types, explicit return types,
      functions <300 lines
- [x] **VI. Performance**: Auto-fix <50ms per file, no directory scanning on
      save
- [x] **VII. 80% Coverage**: Unit tests for all public methods, pattern registry
      tests

Note: Principles II (MCP-First) and V (Security by Default) are N/A for this
feature — SlopReducer is an internal VSCode extension component, not an MCP tool
or API.

## Implementation Phases

### Phase 1: Settings & Config (FR-008, FR-009)

**Goal**: Declare settings in package.json and add ConfigManager getters.

**Tasks**:

- [ ] T001: Add `gofer.yoloSlopReduction.enabled` (boolean, default `false`) to
      `extension/package.json` `contributes.configuration.properties`
- [ ] T002: Add `gofer.yoloSlopReduction.notifyEvery` (number, default `10`, min
      `1`) to `extension/package.json`
- [ ] T003: Add `yoloSlopReductionEnabled` and `yoloSlopReductionNotifyEvery` to
      `CONFIG_KEYS` in `extension/src/config.ts`
- [ ] T004: Add `DEFAULTS.yoloSlopReductionEnabled = false` and
      `DEFAULTS.yoloSlopReductionNotifyEvery = 10` to `extension/src/config.ts`
- [ ] T005: Add `getSlopReductionEnabled(): boolean` method to `ConfigManager`
- [ ] T006: Add `getSlopReductionNotifyEvery(): number` method to
      `ConfigManager`

**Verification**:

- [ ] Settings appear in VSCode Settings UI under Gofer section
- [ ] ConfigManager getters return correct defaults

### Phase 2: SlopReducer Core (FR-001, FR-002, FR-004, FR-005)

**Goal**: Implement the auto-fix engine with pattern registry and safety guards.

**Tasks**:

- [ ] T007: Create `extension/src/autonomous/SlopReducer.ts` with class skeleton
- [ ] T008: Define `FixPattern` interface:
      `{ name: string; regex: RegExp; fix: ((line: string) => string | null) | null; reason: string }`
- [ ] T009: Define `FIX_PATTERNS` registry with 3 entries:
  - `console-log`: regex `/^\s*console\.log\(.*\);\s*$/`, fix returns `null`
    (remove line), reason "Remove leftover console.log"
  - `debugger`: regex `/^\s*debugger;\s*$/`, fix returns `null` (remove line),
    reason "Remove debugger statement"
  - `ts-ignore`: regex `/\/\/\s*@ts-ignore/`, fix replaces with
    `// @ts-expect-error`, reason "Upgrade @ts-ignore to @ts-expect-error"
- [ ] T010: Implement `isTestFile(filePath: string): boolean` — returns true for
      `**/tests/**`, `**/*.test.ts`, `**/*.spec.ts`, `**/test-*/**`
- [ ] T011: Implement `reduceFile(filePath: string): FixResult` — reads file,
      applies fix patterns line-by-line, writes only if changed, returns
      `{ fixCount: number; fixes: FixLogEntry[] }`
- [ ] T012: Add re-entrant guard (`private reducing = new Set<string>()`) — skip
      if file is already being reduced

**Verification**:

- [ ] Unit test: `reduceFile()` on file with `console.log` removes the line
- [ ] Unit test: `reduceFile()` on file with `debugger` removes the line
- [ ] Unit test: `reduceFile()` on file with `@ts-ignore` replaces with
      `@ts-expect-error`
- [ ] Unit test: `isTestFile()` correctly identifies test files
- [ ] Unit test: Non-slop lines remain untouched
- [ ] Unit test: Re-entrant guard prevents double processing

### Phase 3: JSONL Logging (FR-006)

**Goal**: Log every fix to audit trail.

**Tasks**:

- [ ] T013: Define `FixLogEntry` interface:
      `{ timestamp: string; file: string; line: number; pattern: string; originalSnippet: string; replacement: string; reason: string }`
- [ ] T014: Implement `private logFix(entry: FixLogEntry): void` — lazy mkdir,
      append JSONL, catch errors silently

**Verification**:

- [ ] Unit test: After fix, JSONL file contains valid entry with all fields
- [ ] Unit test: Logging failure does not throw

### Phase 4: Notifications (FR-007)

**Goal**: Batched notification every N fixes.

**Tasks**:

- [ ] T015: Add `private sessionFixCount = 0` counter to SlopReducer
- [ ] T016: Implement `private maybeNotify(): void` — increment counter, show
      notification when `sessionFixCount % notifyEvery === 0`
- [ ] T017: Notification text:
      `"Gofer: Reduced ${sessionFixCount} slop issues this session"` with "View
      Log" action button
- [ ] T018: "View Log" action opens the JSONL file in editor via
      `vscode.workspace.openTextDocument()` + `vscode.window.showTextDocument()`

**Verification**:

- [ ] Unit test: Notification fires at exactly N, 2N, 3N fixes
- [ ] Unit test: No notification between milestones

### Phase 5: Extension Wiring (FR-003)

**Goal**: Wire SlopReducer into extension activation.

**Tasks**:

- [ ] T019: In `extension.ts`, import `SlopReducer` and create instance during
      activation
- [ ] T020: Register `vscode.workspace.onDidSaveTextDocument` handler that:
  1. Checks `ConfigManager.getSlopReductionEnabled()`
  2. Checks file extension is `.ts/.tsx/.js/.jsx`
  3. Checks `!slopReducer.isTestFile(doc.uri.fsPath)`
  4. Calls `slopReducer.reduceFile(doc.uri.fsPath)`
- [ ] T021: Add disposable to `context.subscriptions` for cleanup

**Verification**:

- [ ] Integration test: Save file with slop while setting enabled → slop removed
- [ ] Integration test: Save file with setting disabled → no change
- [ ] Integration test: Save test file → no change

## File Structure

```text
extension/src/autonomous/
├── SlopDetector.ts       (existing, unchanged)
└── SlopReducer.ts        (NEW - ~120 lines)

extension/src/
├── config.ts             (modified - add keys, defaults, getters)
├── extension.ts          (modified - wire save handler)

extension/
└── package.json          (modified - add 2 settings)

tests/unit/
└── slopReducer.test.ts   (NEW - unit tests)
```

## Risk Assessment

| Risk                                                | Impact | Mitigation                                                                    |
| --------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| File corruption from bad regex                      | High   | Only remove full lines matching strict patterns; unit tests for each pattern  |
| Infinite save loop                                  | High   | Re-entrant guard with Set<string>; clear after write                          |
| Performance degradation on large files              | Medium | Single-file only, line-by-line O(n), no directory scanning                    |
| console.log in non-statement context (e.g., string) | Low    | Regex anchored to line start with optional whitespace; only full-line matches |

## Notes

- `console.log` fix only removes lines where `console.log(...)` is the entire
  statement (anchored regex). Inline usage like `const fn = console.log` is NOT
  matched.
- `debugger` fix only removes lines where `debugger;` is the entire statement.
- `@ts-ignore` fix is a simple string replacement within the line — doesn't
  remove the line.
- The SlopReducer is intentionally NOT an MCP tool — it's a background VSCode
  extension feature.

## Spec Traceability

### User Story Coverage

| Story                                 | Status  | Plan References                          |
| ------------------------------------- | ------- | ---------------------------------------- |
| US1: Auto-Fix Slop on Save (P1)       | COVERED | Phase 2 (T007-T012), Phase 5 (T019-T021) |
| US2: JSONL Audit Trail (P1)           | COVERED | Phase 3 (T013-T014)                      |
| US3: Batched Notification (P2)        | COVERED | Phase 4 (T015-T018)                      |
| US4: VSCode Settings Integration (P2) | COVERED | Phase 1 (T001-T006)                      |
| US5: Extensible Pattern Registry (P3) | COVERED | Phase 2 (T008-T009)                      |

### Requirement Coverage

| Requirement                       | Status  | Plan Reference     |
| --------------------------------- | ------- | ------------------ |
| FR-001: SlopReducer Class         | COVERED | Phase 2, T007      |
| FR-002: Fix Pattern Registry      | COVERED | Phase 2, T008-T009 |
| FR-003: File Save Trigger         | COVERED | Phase 5, T019-T020 |
| FR-004: Re-entrant Guard          | COVERED | Phase 2, T012      |
| FR-005: Test File Exclusion       | COVERED | Phase 2, T010      |
| FR-006: JSONL Audit Logging       | COVERED | Phase 3, T013-T014 |
| FR-007: Batched Notifications     | COVERED | Phase 4, T015-T018 |
| FR-008: Settings Declaration      | COVERED | Phase 1, T001-T002 |
| FR-009: ConfigManager Integration | COVERED | Phase 1, T003-T006 |

Coverage: 100% of user stories (5/5), 100% of functional requirements (9/9)
