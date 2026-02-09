---
feature: Observation Content Capture
spec: spec.md
research: research.md
status: ready
created: '2026-02-09'
---

# Implementation Plan: Observation Content Capture

## Technical Context

### Tech Stack

- **Language**: JavaScript (ESM) for hook scripts, TypeScript for extension
- **Framework**: VS Code Extension API, Node.js fs for file I/O
- **Testing**: Vitest for unit tests
- **Build**: Webpack (extension), raw .mjs (hooks)

### Architecture

```
Claude Code
  │
  ├─ PostToolUse hook fires ──────────────────────────────────┐
  │  stdin: { tool_name, tool_input, tool_response, ... }     │
  │                                                            ▼
  │                                              ┌─────────────────────────┐
  │                                              │   post-tool-use.mjs     │
  │                                              │                         │
  │                                              │ 1. Read stdin (existing)│
  │                                              │ 2. Extract tool_input   │
  │                                              │    + tool_response      │
  │                                              │ 3. Truncate to 10KB    │
  │                                              │ 4. Generate UUID       │
  │                                              │ 5. Write observation   │
  │                                              │    file (atomic)       │
  │                                              │ 6. Write bridge with   │
  │                                              │    observationId       │
  │                                              └──────┬──────┬──────────┘
  │                                                     │      │
  │                          .specify/hooks/            │      │
  │                    observations/{uuid}.json ◄───────┘      │
  │                                                            │
  │                    context-bridge.json ◄────────────────────┘
  │                          │
  │                          ▼
  │              ┌─────────────────────────┐
  │              │   HookBridgeWatcher     │
  │              │   (FileSystemWatcher)   │
  │              └──────────┬──────────────┘
  │                         │ 'bridge-update' event
  │                         ▼
  │              ┌─────────────────────────┐
  │              │   extension.ts handler  │
  │              │                         │
  │              │ 1. Check observationId  │
  │              │ 2. Read observation file│
  │              │ 3. Extract content      │
  │              │ 4. trackObservation()   │
  │              │    with REAL content    │
  │              │ 5. Delete obs file      │
  │              └──────────┬──────────────┘
  │                         │
  │                         ▼
  │              ┌─────────────────────────┐
  │              │   ObservationMasker     │
  │              │   (no changes needed)   │
  │              │                         │
  │              │ - Stores real content   │
  │              │ - generateKeyPoints()   │
  │              │   extracts meaningful   │
  │              │   summaries             │
  │              │ - maskOldObservations() │
  │              │   saves real tokens     │
  │              └─────────────────────────┘
```

### Integration Points

| Component | File | Change Type |
|-----------|------|-------------|
| PostToolUse hook (bundled) | `extension/resources/hook-scripts/post-tool-use.mjs` | Major: add observation extraction + file write |
| PostToolUse hook (active) | `.specify/scripts/hooks/post-tool-use.mjs` | Major: mirror bundled changes |
| BridgeData interface | `extension/src/autonomous/HookBridgeWatcher.ts:23-46` | Minor: add optional fields to lastToolUse |
| Bridge-update handler | `extension/src/extension.ts:1396-1439` | Moderate: read observation file instead of tool-output.txt |
| Hook installer | `extension/src/goferMigrator.ts` | Minor: ensure updated scripts are copied |

### Key Dependencies

- `extension/src/autonomous/ObservationMasker.ts` — receives content, no changes
- `extension/src/autonomous/ContextBuilder.ts` — thin wrapper, no changes
- `language-server/src/mcp/toolHandler.ts` — gofer_expand_observation, no changes

---

## Implementation Phases

### Phase 1: Hook Script — Extract and Write Observation Content

**Goal**: Modify `post-tool-use.mjs` to extract `tool_input` and
`tool_response` from stdin, truncate to 10KB, write per-observation files.

**Covers**: US1 (AC1, AC2), US2 (all), US3 (all), FR-001, FR-002, FR-003, FR-007

**Files to modify**:
- `extension/resources/hook-scripts/post-tool-use.mjs`

**Tasks**:

- [ ] T001 [Hook] Add `crypto` import for `randomUUID()` and define
  `OBSERVATIONS_DIR` constant as
  `join(PROJECT_DIR, '.specify', 'hooks', 'observations')`
- [ ] T002 [Hook] Add `serializeToolResponse(toolResponse, maxBytes)` function
  that: (a) JSON.stringifies the tool_response, (b) truncates to maxBytes
  (default 10240), (c) returns `{ content: string, truncated: boolean }`
- [ ] T003 [Hook] Add `writeObservation(id, toolName, toolInput, toolResponse)`
  function that: (a) creates observations dir with
  `mkdirSync({ recursive: true })`, (b) calls `serializeToolResponse()`,
  (c) writes JSON to `{OBSERVATIONS_DIR}/{id}.json` using atomic temp+rename
  pattern, (d) returns the observation ID
- [ ] T004 [Hook] Update main logic after `readStdin()`: extract `tool_input`
  and `tool_response` from `input`. If `tool_response` is truthy, generate UUID
  via `crypto.randomUUID()`, call `writeObservation()`, and include
  `observationId` and `toolInput` in the bridge `lastToolUse` object. If not
  present, omit these fields (backward compat).
- [ ] T005 [Hook] Update the bridge object construction: extend `lastToolUse`
  from `{ toolName, timestamp }` to
  `{ toolName, timestamp, observationId?, toolInput? }`
- [ ] T006 [Hook] Add debug logging for observation extraction:
  `debug('Observation written: id={id}, tool={name}, size={bytes}, truncated={bool}')`

**Verification**:

- [ ] Run hook with new-format stdin containing `tool_input` + `tool_response`
  — verify observation file created with correct content
- [ ] Run hook with old-format stdin (no `tool_input`/`tool_response`) — verify
  no observation file, bridge written as before
- [ ] Run hook with `tool_response` content >10KB — verify truncation at 10KB
  with `truncated: true`
- [ ] Verify bridge JSON contains `observationId` field when observation written

---

### Phase 2: Bridge Schema Extension

**Goal**: Update the TypeScript `BridgeData` interface to include the new
optional fields.

**Covers**: US5 (all), FR-004

**Files to modify**:
- `extension/src/autonomous/HookBridgeWatcher.ts`

**Tasks**:

- [ ] T007 [Bridge] Extend `BridgeData.lastToolUse` type from
  `{ toolName: string; timestamp: number } | null` to
  `{ toolName: string; timestamp: number; observationId?: string; toolInput?: Record<string, unknown> } | null`

**Verification**:

- [ ] TypeScript compilation succeeds with no errors
- [ ] Existing consumers of `BridgeData.lastToolUse` (GoferActivityStatusBar,
  WorkspaceContextProvider) compile without changes — they only access
  `toolName` and `timestamp`, which are unchanged
- [ ] Test that `HookBridgeWatcher.onBridgeChange()` correctly parses bridge
  JSON with and without the new optional fields

---

### Phase 3: Extension Content Ingestion

**Goal**: Update the bridge-update handler in `extension.ts` to read real
observation content from per-observation files and pass it to
`trackObservation()`.

**Covers**: US1 (AC3, AC4, AC5, AC6), FR-005

**Files to modify**:
- `extension/src/extension.ts` (lines ~1396-1439)

**Tasks**:

- [ ] T008 [Extension] Replace the `tool-output.txt` reading approach
  (lines 1398, 1420-1429) with observation file reading: when
  `data.lastToolUse.observationId` is present, construct the path as
  `join(workspacePath, '.specify', 'hooks', 'observations', observationId + '.json')`,
  read and parse the JSON, and extract the `toolResponse.content` or
  stringified `toolResponse` as the observation content
- [ ] T009 [Extension] When the observation file is successfully read, use
  its `toolInput` to enrich the observation metadata passed to
  `trackObservation()` (e.g., include `filePath` for Read, `command` for Bash)
- [ ] T010 [Extension] When no `observationId` is present (backward compat
  or old Claude Code), fall back to the placeholder string
  `[Tool output from ${toolUse.toolName}]` as currently done
- [ ] T011 [Extension] Add `fs.promises` import (or use existing `fs` require)
  for reading observation files

**Verification**:

- [ ] After a tool call with new hook, verify `ObservationMasker.cache` contains
  real content (not placeholder)
- [ ] After a tool call without observation, verify placeholder is used
- [ ] Verify `generateKeyPoints()` produces meaningful output for a file_read
  observation with real TypeScript content

---

### Phase 4: Observation File Cleanup

**Goal**: Delete observation files after the extension reads them, and clean up
stale files on session start.

**Covers**: US4 (all), FR-006

**Files to modify**:
- `extension/src/extension.ts` (bridge-update handler)

**Tasks**:

- [ ] T012 [Cleanup] After successfully reading and tracking an observation
  file, delete it asynchronously:
  `fs.promises.unlink(obsPath).catch(() => {})` (fire-and-forget)
- [ ] T013 [Cleanup] On `session-start` event, scan
  `.specify/hooks/observations/` for stale files (mtime > 30 minutes) and
  delete them. Use `fs.promises.readdir()` + `fs.promises.stat()` +
  `fs.promises.unlink()`. Log count of cleaned files.
- [ ] T014 [Cleanup] On extension deactivation, scan and clean the
  observations directory (same stale-file logic)

**Verification**:

- [ ] After processing 10 tool calls, observations directory contains 0 files
- [ ] Stale files from a previous session are cleaned on next session start
- [ ] Cleanup failures are caught and logged, not thrown

---

### Phase 5: Dual-Copy Sync & Hook Installer

**Goal**: Ensure both copies of the hook script are identical and that the
migrator handles the update.

**Covers**: US6 (all)

**Files to modify**:
- `.specify/scripts/hooks/post-tool-use.mjs` (copy from bundled)
- `extension/src/goferMigrator.ts` (verify copy logic)

**Tasks**:

- [ ] T015 [Sync] Copy the updated
  `extension/resources/hook-scripts/post-tool-use.mjs` to
  `.specify/scripts/hooks/post-tool-use.mjs` so both are identical
- [ ] T016 [Sync] Verify that `goferMigrator.ts:copyHookScripts()` already
  handles overwriting the active copy from the bundled source. If it doesn't
  overwrite existing files, add a version check or force-overwrite logic.
- [ ] T017 [Sync] Test that after running the migrator, the active hook script
  matches the bundled one

**Verification**:

- [ ] `diff` between both hook copies shows no differences
- [ ] Running the migrator on a workspace with old hooks produces updated hooks
- [ ] `.claude/settings.json` hook configuration remains valid

---

### Phase 6: Testing

**Goal**: Add unit tests for the new functionality.

**Covers**: All success criteria

**Files to create/modify**:
- `tests/unit/hooks/post-tool-use-observation.test.ts` (new)
- `tests/unit/autonomous/observation-tracking.test.ts` (update)
- `tests/unit/autonomous/HookBridgeWatcher.test.ts` (update)

**Tasks**:

- [ ] T018 [Test] Write unit tests for the hook's observation extraction:
  - Test with new-format stdin (has `tool_input` + `tool_response`)
  - Test with old-format stdin (no `tool_input`/`tool_response`)
  - Test content truncation at 10KB boundary
  - Test that observation file contains correct JSON structure
  - Test that bridge includes `observationId` when observation is written
- [ ] T019 [Test] Update `observation-tracking.test.ts` to test with real
  content instead of placeholder strings. Verify that `generateKeyPoints()`
  produces meaningful output for:
  - A TypeScript file read (should extract imports, exports)
  - A command output (should extract first/last lines, errors)
  - A search result (should extract file paths, match counts)
- [ ] T020 [Test] Update `HookBridgeWatcher.test.ts` to test parsing of
  bridge data with and without the new `observationId` and `toolInput` fields
- [ ] T021 [Test] Write integration test: simulate full flow from hook stdin
  through bridge update through observation tracking, verifying real content
  arrives at ObservationMasker

**Verification**:

- [ ] All new tests pass
- [ ] All existing tests still pass (no regressions)
- [ ] `npm test` completes successfully

---

## File Structure

```
Modified files:
  extension/resources/hook-scripts/post-tool-use.mjs   (Phase 1)
  .specify/scripts/hooks/post-tool-use.mjs             (Phase 5)
  extension/src/autonomous/HookBridgeWatcher.ts         (Phase 2)
  extension/src/extension.ts                            (Phase 3, 4)

New runtime artifacts:
  .specify/hooks/observations/{uuid}.json               (written by hook, read+deleted by extension)

New test files:
  tests/unit/hooks/post-tool-use-observation.test.ts    (Phase 6)

Updated test files:
  tests/unit/autonomous/observation-tracking.test.ts    (Phase 6)
  tests/unit/autonomous/HookBridgeWatcher.test.ts       (Phase 6)
```

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Claude Code changes `tool_response` format | Medium | Low | Stringify whatever we get; extractors handle varied content |
| Observation files not cleaned up (disk growth) | Low | Medium | Stale-file cleanup on session start + deactivation |
| Hook execution time exceeds 100ms | Medium | Low | Atomic write of small files (<10KB) is fast; truncation prevents large writes |
| Existing bridge consumers break | High | Very Low | Only adding optional fields; existing code accesses `toolName` and `timestamp` which are unchanged |
| Race condition: bridge overwritten before extension reads observation | Low | Medium | Per-observation files with UUIDs are write-once; bridge always points to latest |

## Spec Traceability

### User Story Coverage

| Story | Priority | Plan Phase(s) | Key Tasks |
|-------|----------|---------------|-----------|
| US1: Real content flows | P1 | Phase 1, 3 | T001-T006, T008-T011 |
| US2: Content size limits | P1 | Phase 1 | T002, T003 |
| US3: Backward compat | P1 | Phase 1, 3 | T004, T010 |
| US4: File cleanup | P2 | Phase 4 | T012-T014 |
| US5: Bridge schema | P1 | Phase 2 | T007 |
| US6: Dual-copy sync | P2 | Phase 5 | T015-T017 |

### Requirement Coverage

| Requirement | Plan Phase | Key Tasks |
|-------------|-----------|-----------|
| FR-001: Hook payload extraction | Phase 1 | T004 |
| FR-002: Per-observation file write | Phase 1 | T003 |
| FR-003: Content serialization format | Phase 1 | T002, T003 |
| FR-004: Bridge schema extension | Phase 2 | T007 |
| FR-005: Extension content ingestion | Phase 3 | T008, T009, T010 |
| FR-006: Observation file cleanup | Phase 4 | T012, T013, T014 |
| FR-007: Backward compatibility | Phase 1, 3 | T004, T010 |

Coverage: 100% of user stories (6/6), 100% of functional requirements (7/7)
