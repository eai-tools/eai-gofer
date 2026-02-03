---
id: real-context-monitoring
title: Real Context Window Monitoring & Continuous Memory Updates
status: draft
created: '2026-01-29'
updated: '2026-01-29'
author: Claude
---

# Real Context Window Monitoring & Continuous Memory Updates

## Overview

Gofer's context health monitoring currently estimates token usage by scanning
filesystem sizes, producing inaccurate numbers disconnected from actual AI tool
usage. This feature replaces that estimation with real token data from Claude
Code's session logs, giving developers accurate visibility into how much of
their AI context window is consumed. Additionally, the feature enables
continuous memory persistence so that pipeline decisions and observations are
automatically saved as the developer works.

**Research Reference**: See `research.md` for codebase analysis, JSONL format
details, and session discovery mechanisms.

## User Stories

### US1: Real Context Window Visibility (P1)

**As a** developer using Claude Code with Gofer **I want to** see my actual
context window usage in the status bar **So that** I know when my session is
getting large and responses may degrade

**Acceptance Criteria**:

- [ ] Status bar displays real token usage percentage based on actual session
      data
- [ ] Token count reflects the most recent AI response's context consumption
- [ ] Status bar updates within 15 seconds of new activity
- [ ] When no AI session is active, status bar shows "No session" instead of
      misleading estimates
- [ ] Clicking the status bar shows a detailed breakdown including model,
      session age, and token counts

### US2: Model-Aware Context Limits (P1)

**As a** developer working with different AI models **I want to** the context
limit to automatically adjust based on which model I'm using **So that** the
health thresholds (warning at 50%, critical at 70%) are meaningful for my
current model

**Acceptance Criteria**:

- [ ] Context limit automatically adjusts when the model changes mid-session
- [ ] Known models have correct limits (200k for Opus, 200k for Sonnet)
- [ ] Unknown models default to a conservative limit (200k)
- [ ] The status bar percentage reflects the model-appropriate limit

### US3: Graceful Fallback (P2)

**As a** developer using Gofer without Claude Code **I want to** the status bar
to still provide useful information **So that** the feature doesn't break or
show errors when Claude Code isn't running

**Acceptance Criteria**:

- [ ] When no session log exists, status bar shows "No session" state
- [ ] When Claude Code closes, status bar transitions from real data to inactive
      state within 30 seconds
- [ ] No errors or warnings are logged when session logs are unavailable
- [ ] The existing filesystem estimation remains available as a diagnostic (not
      displayed by default)

### US4: Continuous Memory Persistence (P2)

**As a** developer running Gofer pipeline stages **I want to** key decisions and
observations to be automatically saved to memory **So that** when I save and
resume sessions, important context is preserved without manual effort

**Acceptance Criteria**:

- [ ] Pipeline stage transitions are automatically recorded as memories
- [ ] Key decisions made during context building are persisted
- [ ] Task completions are recorded with relevant metadata
- [ ] Memories are categorized and tagged for efficient retrieval
- [ ] No more than 10 auto-saved memories per pipeline stage (to avoid noise)

### US5: Session History Insight (P3)

**As a** developer reviewing my work patterns **I want to** see how my context
usage evolved across recent sessions **So that** I can understand when sessions
tend to get too large and plan handoffs better

**Acceptance Criteria**:

- [ ] Clicking the status bar shows context usage history for the current
      session
- [ ] Peak token usage is visible at a glance
- [ ] Number of API calls in the session is displayed
- [ ] Session duration is shown

## Functional Requirements

### FR1: Session Log Reading

The system must read token usage data from Claude Code's local session logs
without reading conversation content.

- **Data source**: JSONL files at
  `~/.claude/projects/{encoded-workspace}/{session-id}.jsonl`
- **Fields read**: `type`, `timestamp`, `sessionId`, and `message.usage`
  (input_tokens, cache_creation_input_tokens, cache_read_input_tokens,
  output_tokens) and `message.model`
- **Privacy**: Must never read `message.content` or `message.role` text
- **Validation**: Unit test confirms only approved fields are accessed
- **Integration**: Replaces filesystem estimation in WorkspaceContextProvider

### FR2: Session Discovery

The system must identify the active or most recent session for the current
workspace.

- **Primary source**:
  `~/.claude/projects/{encoded-workspace}/sessions-index.json`
- **Encoding**: Workspace path with `/` replaced by `-`
- **Selection**: Most recently modified non-sidechain session
- **Fallback**: If sessions-index is unavailable, scan JSONL files by
  modification time
- **Validation**: Returns null when no session exists for the workspace
- **Integration**: Used by FR1 to locate the correct JSONL file

### FR3: Efficient File Reading

The system must read token data without loading entire session logs into memory.

- **Requirement**: Only read the tail of the JSONL file (last ~10KB)
- **Rationale**: Session logs grow to 6+ MB; full reads on every poll are
  wasteful
- **Validation**: Memory usage stays constant regardless of session log size
- **Integration**: Uses Node.js file streams with byte offset

### FR4: Model-Aware Context Limits

The system must determine the correct context window size based on the active
model.

- **Source**: Model ID from the last assistant message in the JSONL
- **Known models**: Map of model IDs to context window sizes
- **Default**: 200,000 tokens for unrecognized models
- **Validation**: Context limit updates when model changes
- **Integration**: Replaces hardcoded `effectiveContextLimit: 120000` in
  ContextHealthMonitor

### FR5: Polling Strategy

The system must periodically check for new session data.

- **Active session**: Poll every 10 seconds
- **No session**: Poll every 30 seconds (checking for new session start)
- **Configurable**: Intervals should be adjustable
- **Validation**: Polling stops when extension deactivates
- **Integration**: Replaces existing 30-second filesystem scanning interval

### FR6: Status Bar Enhancement

The status bar must clearly indicate whether it's showing real or estimated
data.

- **Real data mode**: Show actual percentage with model name (e.g., "Context:
  54% (Opus)")
- **No session mode**: Show "Context: No session" in neutral color
- **Transition**: Smooth transition between modes as sessions start/stop
- **Validation**: Visual distinction between real and no-session states
- **Integration**: Enhances existing ContextHealthStatusBar

### FR7: Continuous Memory Writer

The system must automatically persist key events to the memory system during
pipeline execution.

- **Stage transitions**: Record when pipeline moves between stages (research →
  specify → plan → etc.)
- **Task completions**: Record when tasks are marked complete with context
- **Decisions**: Record key decisions from ContextBuilder (memory coverage,
  research gap triggers)
- **Rate limit**: Maximum 10 auto-saved memories per pipeline stage to prevent
  noise
- **Categories**: Use structured categories (`pipeline_stage`,
  `task_completion`, `auto_decision`)
- **Validation**: Memories are retrievable via existing MemoryManager.search()
- **Integration**: Listens to ContextBuilder events and pipeline state changes

### FR8: Persisted State Format

The persisted context health state must include real session data for MCP tool
consumption.

- **File**: `.specify/memory/context-health-state.json`
- **New fields**: `dataSource` ("real" | "estimated" | "none"), `model`,
  `sessionId`, `sessionAge`
- **Backward compatible**: Existing fields preserved, new fields are additive
- **Validation**: MCP tool `gofer_get_context_health` returns accurate data
- **Integration**: Consumed by language server MCP toolHandler

## Non-Functional Requirements

### Performance

- JSONL tail-read must complete in under 50ms (reading ~10KB from end of file)
- Polling must not block the extension host event loop
- Memory usage for session reading must remain constant regardless of log file
  size

### Security

- Never read message content from JSONL logs — only metadata and usage fields
- Never expose auth tokens from lock files to any output or log
- Session data stays local — never transmitted outside the extension

### Compatibility

- Must work on macOS, Linux, and Windows (path encoding uses `os.homedir()`)
- Must handle Claude Code not being installed (no `~/.claude/` directory)
- Must maintain backward compatibility with all existing ContextHealthMonitor
  consumers
- Must not break the existing event interface (`healthy`, `warning`, `critical`)

## Success Criteria

| Metric                | Target              | Measurement                                               |
| --------------------- | ------------------- | --------------------------------------------------------- |
| Token accuracy        | Within 1% of actual | Compare status bar value to Claude Code `/context` output |
| Update latency        | < 15 seconds        | Time from API response to status bar update               |
| File read performance | < 50ms per read     | Benchmark tail-read on 6MB+ JSONL file                    |
| Memory overhead       | < 1MB               | Measure reader memory footprint                           |
| Fallback reliability  | Zero errors         | No errors logged when Claude Code is not running          |
| Auto-memory saves     | 3-10 per stage      | Count memories created per pipeline stage                 |

## Assumptions

- Claude Code stores session logs in `~/.claude/projects/` with the path
  encoding scheme `path.replace('/', '-')` (confirmed via research)
- JSONL files are not locked during active sessions (confirmed: successfully
  read 1530 entries from active session)
- The `usage` field format in assistant messages is stable across Claude Code
  versions
- Claude Code is the primary AI tool (Copilot integration is out of scope for
  this spec)
- The extension host process can read files from the user's home directory
  without permission issues

## Dependencies

- **ContextHealthMonitor** — Existing component, must maintain event interface
- **ContextHealthStatusBar** — Existing component, enhancement only
- **WorkspaceContextProvider** — Existing component, will be modified
- **MemoryManager** — Existing component, used by ContinuousMemoryWriter
- **ContextBuilder** — Existing component, events listened to by
  ContinuousMemoryWriter
- **Claude Code** — External dependency; session logs must exist at expected
  path

## Out of Scope

- Reading actual conversation content from JSONL logs
- Supporting GitHub Copilot or other AI tool context windows
- Modifying Claude Code's behavior or sending commands to it
- Real-time token-by-token streaming updates (10-second polling is sufficient)
- Automatic context compaction or session management (that's `/7_gofer_save`)
- Displaying context data for non-Claude-Code AI tools

## Glossary

| Term                    | Definition                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| JSONL                   | JSON Lines format — one JSON object per line, used by Claude Code for session logs             |
| Context window          | The total token capacity of an AI model for a single conversation                              |
| Tail-read               | Reading only the last N bytes of a file instead of the entire contents                         |
| Session log             | A JSONL file at `~/.claude/projects/` containing all messages for one Claude Code conversation |
| Effective context limit | The practical token limit at which AI accuracy degrades (less than the advertised maximum)     |
| Continuous memory       | Automatic persistence of decisions and observations without manual save commands               |

## Research Traceability

| Research Finding                          | Spec Section      | Reference                                    |
| ----------------------------------------- | ----------------- | -------------------------------------------- |
| JSONL format and fields                   | FR1               | Data source, fields read, privacy constraint |
| Session discovery via sessions-index.json | FR2               | Primary source, encoding                     |
| Path encoding (/ → -)                     | FR2, Assumptions  | Workspace path mapping                       |
| File size concern (6+ MB)                 | FR3               | Tail-read requirement                        |
| Model IDs in assistant messages           | FR4               | Model-aware limits                           |
| Polling vs watching decision              | FR5               | Polling strategy rationale                   |
| No file locking confirmed                 | Assumptions       | Safe concurrent read                         |
| Privacy constraint (no content reading)   | FR1, NFR Security | Hard constraint                              |
| Cross-platform path resolution            | NFR Compatibility | os.homedir() requirement                     |
| No active session fallback                | US3, FR6          | Graceful degradation                         |
| effectiveContextLimit hardcoded           | FR4               | Must make dynamic                            |
| WorkspaceContextProvider interface        | FR1, Dependencies | Must maintain or update                      |
| ContextBuilder events                     | FR7               | ContinuousMemoryWriter listens to these      |
| MemoryManager.save() API                  | FR7               | Already implemented, used by writer          |
| Node-pty mismatch                         | Assumptions       | Structural tests only for some components    |
| Protected boundaries                      | Dependencies      | Event interface, status format, state file   |
