---
id: 001-observation-content-capture
title: Observation Content Capture
status: draft
created: '2026-02-09'
updated: '2026-02-09'
author: Claude
---

# Observation Content Capture

## Overview

Gofer's observation compression pipeline (ObservationMasker) is designed to
track every tool call Claude Code makes, then progressively compress old
observations from full content to key-point summaries to tiny placeholders. This
saves context window space and improves LLM accuracy as sessions grow.

**The problem**: The pipeline currently records *that* a tool was used but not
*what it returned*. Every observation is stored as a placeholder string like
`"[Tool output from Read]"`, making the entire compression system ineffective.
Key-point extraction runs on a 26-character placeholder instead of the actual
5,000-token file content, saving ~7 tokens per observation instead of ~4,800.

**The solution**: Claude Code's PostToolUse hook now passes `tool_input` and
`tool_response` directly in the stdin payload. By extracting this data in the
hook script and passing it through the bridge to the extension, the
ObservationMasker receives real content and the full compression pipeline becomes
functional.

**Research Reference**: See `research.md` for codebase analysis, data flow
diagrams, and technology decisions.

## User Stories

### US1: Real Observation Content Flows Through the Pipeline (P1)

**As a** Gofer extension user running Claude Code sessions,
**I want** the observation system to capture actual tool output (file contents,
command results, search matches),
**So that** context compression produces meaningful summaries instead of
compressing placeholder strings.

**Why this priority**: This is the core value of the feature. Without real
content flowing through, every downstream capability (key-point extraction,
progressive masking, context savings) is dead code.

**Independent Test**: Run a Claude Code session with the Gofer extension active.
After Claude reads a file, verify that the ObservationMasker's cache contains the
actual file content (not `"[Tool output from Read]"`), and that
`generateKeyPoints()` produces meaningful output (imports, exports, function
signatures).

**Acceptance Criteria**:

- [ ] When Claude Code's PostToolUse hook fires with `tool_input` and
  `tool_response` in stdin, the hook extracts both fields
- [ ] The hook writes observation content to a per-observation file at
  `.specify/hooks/observations/{uuid}.json`
- [ ] The bridge file (`context-bridge.json`) includes an `observationId`
  pointer to the observation file
- [ ] The extension reads the observation file and passes real content to
  `ObservationMasker.trackObservation()`
- [ ] `generateKeyPoints()` produces meaningful summaries for file reads,
  command outputs, and search results
- [ ] Observation masking saves proportionally to actual content size (not a
  fixed ~7 tokens)

---

### US2: Content Size Limits Prevent Disk Thrashing (P1)

**As a** Gofer extension user with large codebases,
**I want** observation content to be capped at a reasonable size,
**So that** large file reads or verbose command outputs don't cause disk I/O
bottlenecks or excessive memory usage.

**Why this priority**: Without size limits, a single `cat` of a 500KB file would
write 500KB to disk on every tool call, creating performance problems. This is a
safety rail that must ship with US1.

**Independent Test**: Trigger a Read of a file larger than 10KB. Verify that the
stored observation content is truncated to 10KB with a `[truncated at 10KB]`
marker, and that key-point extraction still works on the truncated content.

**Acceptance Criteria**:

- [ ] Observation content is capped at 10KB per observation
- [ ] Content exceeding the cap is truncated with a `[truncated at 10KB]`
  marker appended
- [ ] Truncation preserves the beginning of the content (most useful for
  key-point extraction of file headers, imports, function signatures)
- [ ] The cap is configurable (default 10KB)

---

### US3: Backward Compatibility with Older Claude Code Versions (P1)

**As a** Gofer user who may have an older version of Claude Code,
**I want** the hook to gracefully handle the old limited payload format,
**So that** the extension doesn't break when `tool_input` and `tool_response`
are not present in stdin.

**Why this priority**: Users upgrade Claude Code and the Gofer extension
independently. The hook must work with both old and new payloads.

**Independent Test**: Send the hook the old-format stdin
`{ "tool_name": "Read", "session_id": "abc", "transcript_path": "/path" }`
(without `tool_input`/`tool_response`). Verify the hook writes the bridge as
before (with no observation file) and the extension falls back to the current
placeholder behavior.

**Acceptance Criteria**:

- [ ] When stdin lacks `tool_input` and `tool_response`, the hook falls back
  to the current behavior (bridge-only, no observation file)
- [ ] The extension handles bridge updates with or without an `observationId`
  field
- [ ] No errors are thrown or logged for the old payload format

---

### US4: Observation File Cleanup (P2)

**As a** Gofer user running long Claude Code sessions,
**I want** per-observation files to be cleaned up after the extension reads them,
**So that** the `.specify/hooks/observations/` directory doesn't grow unbounded.

**Why this priority**: Secondary to core functionality but needed before the
feature is production-ready. Without cleanup, a 200-tool-call session creates
200 JSON files.

**Independent Test**: Run a session with 20+ tool calls. Verify that observation
files are deleted after the extension reads them, and that the observations
directory contains at most a small number of unprocessed files.

**Acceptance Criteria**:

- [ ] The extension deletes each observation file after successfully reading
  and tracking its content
- [ ] Stale observation files (older than 30 minutes) are cleaned up on
  session start
- [ ] Cleanup failures are logged but do not block observation tracking
- [ ] The observations directory is created on first use and cleaned on
  session end

---

### US5: Bridge Schema Extension (P1)

**As a** Gofer extension developer,
**I want** the bridge data schema to include observation metadata,
**So that** the extension can locate and read per-observation files and include
tool input context in the observation.

**Why this priority**: Required for US1 to work. The bridge is the only
communication channel between the hook (Node.js process) and the extension (VS
Code process).

**Independent Test**: After a tool call, read `context-bridge.json` and verify
it contains `lastToolUse.observationId`, `lastToolUse.toolInput` (summarized),
and that these fields are correctly typed in the TypeScript `BridgeData`
interface.

**Acceptance Criteria**:

- [ ] `BridgeData.lastToolUse` includes `observationId: string | undefined`
- [ ] `BridgeData.lastToolUse` includes `toolInput: Record<string, unknown> | undefined`
  (the raw tool input for metadata, e.g., file path for Read)
- [ ] Existing bridge consumers (GoferActivityStatusBar,
  WorkspaceContextProvider) continue to work without changes
- [ ] The `HookBridgeWatcher` TypeScript interface is updated to match

---

### US6: Dual-Copy Hook Script Sync (P2)

**As a** Gofer extension developer,
**I want** both copies of the hook script (bundled and active) to be updated,
**So that** new installations and existing installations both get the new
observation capture capability.

**Why this priority**: The migrator copies bundled scripts to the active
location. If only one copy is updated, new installations or re-installations
will regress.

**Independent Test**: Run the Gofer migrator on a workspace. Verify that
`.specify/scripts/hooks/post-tool-use.mjs` matches
`extension/resources/hook-scripts/post-tool-use.mjs` and that both contain the
observation extraction logic.

**Acceptance Criteria**:

- [ ] `extension/resources/hook-scripts/post-tool-use.mjs` is updated with
  observation extraction
- [ ] `.specify/scripts/hooks/post-tool-use.mjs` is updated to match
- [ ] The hook installer in `goferMigrator.ts` copies the updated script
- [ ] Existing `.claude/settings.json` hook configuration remains compatible

### Edge Cases

- What happens when `tool_response` is null or undefined (e.g., tool returned no
  output)? The hook should write no observation file and the bridge should omit
  `observationId`.
- What happens when the observation file is deleted between bridge write and
  extension read? The extension should fall back to placeholder behavior and log
  a warning.
- What happens when two tool calls fire in rapid succession and the extension
  hasn't read the first observation yet? Per-observation files with unique UUIDs
  prevent overwrites. The bridge always points to the latest; the extension
  should process each bridge update independently.
- What happens when the observations directory doesn't exist? The hook should
  create it with `mkdirSync({ recursive: true })`.
- What happens with Edit tool responses? The `tool_response` for Edit may
  contain success/failure rather than content. The hook should store whatever
  `tool_response` provides; the ObservationMasker's type-specific extractors
  handle different content formats.

## Functional Requirements

### FR-001: Hook Payload Extraction

The PostToolUse hook script MUST extract `tool_input` and `tool_response` from
the stdin JSON payload when present.

- **Validation**: Unit test the hook with mock stdin containing both old and new
  payload formats
- **Integration**: Modifies `post-tool-use.mjs:readStdin()` and main logic

### FR-002: Per-Observation File Write

The hook MUST write observation content to
`.specify/hooks/observations/{uuid}.json` using atomic write (temp + rename).

- **Validation**: Verify file exists after hook execution with correct content
- **Integration**: New file path alongside existing bridge at
  `.specify/hooks/context-bridge.json`

### FR-003: Content Serialization Format

Each observation file MUST contain a JSON object with:
- `id`: UUID matching the filename
- `toolName`: Name of the tool (e.g., "Read", "Bash", "Grep")
- `toolInput`: The raw `tool_input` object from stdin
- `toolResponse`: The `tool_response` content, truncated to 10KB if needed
- `timestamp`: ISO timestamp of the tool call
- `truncated`: Boolean indicating if content was truncated

- **Validation**: Parse observation file and verify all fields present
- **Integration**: Extension reads this format in bridge-update handler

### FR-004: Bridge Schema Extension

The bridge `lastToolUse` object MUST include `observationId` and `toolInput`
fields when observation content is available.

- **Validation**: Read bridge file after tool call, verify new fields present
- **Integration**: `HookBridgeWatcher.ts:BridgeData` interface must be extended

### FR-005: Extension Content Ingestion

The extension bridge-update handler MUST read the observation file referenced
by `observationId` and pass the content to
`ContextBuilder.trackObservation()`.

- **Validation**: After bridge update, verify ObservationMasker cache contains
  real content (not placeholder)
- **Integration**: Modifies `extension.ts:390-439` bridge-update handler

### FR-006: Observation File Cleanup

The extension MUST delete observation files after successfully reading them.
Stale files (>30 min) MUST be cleaned up on session start.

- **Validation**: Verify observation directory is empty after processing
- **Integration**: Cleanup runs in bridge-update handler and session-start event

### FR-007: Backward Compatibility

The hook MUST detect whether `tool_input`/`tool_response` are present and fall
back to current behavior when absent. The extension MUST handle bridge updates
with or without `observationId`.

- **Validation**: Test with both old and new payload formats
- **Integration**: Conditional logic in both hook and extension

## Non-Functional Requirements

### Performance

- Observation file write MUST complete in <50ms (atomic write of up to 10KB)
- Extension observation file read MUST complete in <10ms
- Bridge update processing MUST not add perceptible latency to the existing flow
- Observation file cleanup MUST be async and non-blocking

### Reliability

- Hook failures MUST NOT crash Claude Code or block tool execution
- Extension read failures MUST fall back to placeholder behavior silently
- File system errors (permissions, disk full) MUST be caught and logged

### Compatibility

- MUST work with Claude Code versions that include `tool_input`/`tool_response`
  in PostToolUse
- MUST degrade gracefully with older Claude Code versions
- MUST not break existing bridge consumers (status bar, health monitor, context
  provider)

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Observations with real content | >95% of tool calls produce real observation content | Count observations with content length >100 chars vs total |
| Context savings per observation | >500 tokens average savings when masking | Compare token estimate of full content vs key-points |
| Key-point extraction quality | >80% of file_read observations produce non-empty key-points | Count non-empty extractFileKeyPoints results |
| Hook execution time | <100ms per tool call | Measure hook stdin-to-bridge-write time |
| Backward compatibility | Zero errors with old payload format | Test with old-format stdin, verify no errors |

## Assumptions

- Claude Code's PostToolUse hook payload includes `tool_input` and
  `tool_response` fields (confirmed in research)
- The `tool_response` field contains the tool's result as a JSON object (format
  varies by tool)
- The hook runs as a separate Node.js process and can only communicate with the
  extension via the file system
- Users have opted into observation tracking by installing the Gofer extension
- The existing ObservationMasker key-point extractors are functional and just
  need real content to operate on
- Token usage data is NOT available in the hook payload and must continue to be
  read from the transcript

## Dependencies

- `extension/src/autonomous/ObservationMasker.ts` - Receives and compresses
  observations (no changes needed to core logic)
- `extension/src/autonomous/HookBridgeWatcher.ts` - Watches bridge file, emits
  events (interface extension needed)
- `extension/src/extension.ts` - Bridge-update handler (main integration point)
- `.specify/scripts/hooks/post-tool-use.mjs` - Hook script (major changes)
- `extension/resources/hook-scripts/post-tool-use.mjs` - Bundled hook copy
- `extension/src/goferMigrator.ts` - Hook installer (update bundled scripts)
- Claude Code hook system (external dependency, provides stdin payload)

## Out of Scope

- Adopting the Claude Agent SDK to replace PTY spawning (separate feature)
- Adopting new hook events (SessionStart, PreCompact, etc.) beyond PostToolUse
- Modifying the ObservationMasker's compression algorithms or key-point
  extractors
- Changing how token usage is tracked (continues via transcript reading)
- Adding `additionalContext` injection back into Claude's context
- Modifying the ClaudeSessionReader's privacy guards (APPROVED_FIELDS)
- Changing the observation cache format (version 2 index.json)

## Glossary

| Term | Definition |
|------|------------|
| Observation | A record of a tool call's output, tracked by the ObservationMasker |
| Bridge file | `.specify/hooks/context-bridge.json` - the file-based communication channel between hook scripts and the VS Code extension |
| Hook | A script that Claude Code invokes at specific lifecycle events (PostToolUse, Stop, etc.) |
| Key-points | A compressed summary of an observation's content (imports, function signatures, error lines) |
| Masking | Replacing an observation with a placeholder tag after it ages past the observation window |
| Observation window | The number of recent turns whose observations are kept at full fidelity (configured per stage) |
| Per-observation file | A JSON file at `.specify/hooks/observations/{uuid}.json` containing one tool call's output |
| Decay tier | The compression level of an observation: full > key-points > placeholder |

## Research Traceability

| Research Finding | Spec Section | Reference |
|-----------------|--------------|-----------|
| Hook stdin parsing integration point | FR-001, FR-007 | research.md Integration Point 1 |
| Bridge data schema extension | FR-004, US5 | research.md Integration Point 2 |
| Extension bridge handler changes | FR-005, US1 | research.md Integration Point 3 |
| ObservationMasker needs no changes | Assumptions | research.md Integration Point 4 |
| Hook installer must update both copies | US6 | research.md Integration Point 5 |
| MCP expand tool works automatically | Out of Scope | research.md Integration Point 6 |
| Content size constraint | FR-002, US2, NFR Performance | research.md Constraint: Content size |
| Write frequency constraint | NFR Performance | research.md Constraint: Write frequency |
| Cleanup constraint | FR-006, US4 | research.md Constraint: Cleanup |
| Privacy consideration | Assumptions | research.md Constraint: Privacy |
| Dual-copy sync constraint | US6 | research.md Constraint: Dual-copy sync |
| Backward compatibility constraint | FR-007, US3 | research.md Constraint: Backward compatibility |
| Atomic bridge write pattern | FR-002 | research.md Pattern 1 |
| Bridge data merge pattern | FR-004 | research.md Pattern 2 |
| Per-observation file storage decision | FR-002, FR-003 | research.md Decision 2 |
| Content size limit decision | US2 | research.md Decision 3 |
| Transcript reading for token usage | Assumptions, Out of Scope | research.md Decision 4 |
