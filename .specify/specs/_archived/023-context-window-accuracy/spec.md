---
id: 023-context-window-accuracy
title: Context Window Accuracy
status: draft
created: 2026-02-13
updated: 2026-02-13
author: Claude
---

# Context Window Accuracy

## Overview

The Context Window sidebar panel currently displays fabricated token breakdowns
based on hardcoded percentages (15%/10%/8%/40%/22%/5%) that bear no relation to
what is actually in Claude Code's context window. This feature replaces those
fake estimates with real token counts computed by reading the actual files
Claude Code loads — CLAUDE.md hierarchy, auto memory, agent files, rules files —
and using the Anthropic API's reported total as the ground truth denominator.

**Research Reference**: See `research.md` for codebase analysis and integration
points.

## User Stories

### US1: See Accurate Context Breakdown (P1)

**As a** developer using Gofer with Claude Code **I want to** see real token
counts for each category in the Context Window panel **So that** I know exactly
what is consuming my context budget and can make informed decisions about what
to trim

**Acceptance Criteria**:

- [ ] Each category in the Context Window tree shows a token count derived from
      actual file sizes on disk (not hardcoded percentages)
- [ ] The sum of all file-based categories plus the conversation residual equals
      the total reported by the Anthropic API (within 5% tolerance)
- [ ] Categories reflect what Claude Code actually loads: CLAUDE.md & Rules,
      Auto Memory, Agents & Commands, Conversation History, System Overhead,
      Spec Artifacts
- [ ] Token counts update when the bridge data refreshes (on each tool call)

### US2: Understand What Files Are In Context (P1)

**As a** developer using Gofer with Claude Code **I want to** click on a context
category and see the specific files contributing to that token count **So that**
I can identify which files are largest and decide what to optimize

**Acceptance Criteria**:

- [ ] Clicking "CLAUDE.md & Rules" shows a list of all CLAUDE.md files and rules
      files with per-file token counts
- [ ] Clicking "Auto Memory" shows MEMORY.md (first 200 lines) and topic files
      with per-file token counts
- [ ] Clicking "Agents & Commands" shows all agent files with per-file token
      counts
- [ ] Clicking "System Overhead" shows the fixed estimate with an explanation of
      what it includes
- [ ] Each file in the detail view shows its path relative to the workspace or
      home directory

### US3: See Conversation History Breakdown (P2)

**As a** developer using Gofer with Claude Code **I want to** expand
Conversation History and see subcategory breakdowns (prompts, responses, tool
calls, system) **So that** I know whether my prompts or tool results are
consuming more context

**Acceptance Criteria**:

- [ ] Conversation History remains expandable with subcategories: Your Prompts,
      Assistant Responses, Tool Calls & Results, System / Commands
- [ ] Subcategory token counts are derived from reading the actual session
      transcript
- [ ] The total Conversation History token count equals `totalContextTokens`
      (from API) minus all file-based categories

## Functional Requirements

### FR1: Claude Code Context Scanner

A new component that reads all files Claude Code loads into context and returns
per-category token breakdowns.

**What it scans**:

1. **CLAUDE.md & Rules**: `{workspace}/CLAUDE.md`, `~/.claude/CLAUDE.md`,
   `{workspace}/.claude/CLAUDE.md`, `{workspace}/.claude/rules/*.md`,
   `~/.claude/rules/*.md`
2. **Auto Memory**: `~/.claude/projects/{encoded}/memory/MEMORY.md` (first 200
   lines only), `~/.claude/projects/{encoded}/memory/*.md` (topic files,
   excluding MEMORY.md)
3. **Agents & Commands**: `{workspace}/.claude/agents/*.md` (always loaded when
   Task tool is used)
4. **System Overhead**: Fixed estimate of ~14,800 tokens (system prompt ~3,200 +
   tool schemas ~11,600)
5. **Spec Artifacts**: `{workspace}/.specify/memory/constitution.md` and any
   Gofer-loaded spec files

- **Validation**: Unit test that the scanner returns correct token counts for
  known file sizes
- **Integration**: Uses `ClaudeSessionReader.encodeWorkspacePath()` and
  `getProjectDir()` for path resolution

### FR2: Replace Hardcoded Categories

Remove the `CONTEXT_CATEGORIES` array with `estimatePct` fields. Replace with
dynamic categories populated from scanner results.

- **Validation**: The tree view shows categories with token counts matching
  actual file sizes
- **Integration**: `ContextWindowProvider.getCategoryItems()` receives scanner
  output instead of applying fake percentages

### FR3: Residual Conversation Calculation

Conversation History tokens are calculated as: `totalContextTokens` (from
`BridgeData`) minus the sum of all file-based category tokens. This ensures the
breakdown always sums to the API-reported total.

- **Validation**: Sum of all displayed categories equals `totalContextTokens`
  within 5% tolerance
- **Integration**: `BridgeData.context.totalContextTokens` provides the ground
  truth denominator

### FR4: Scanner Result Caching

Scanner results are cached for 30 seconds and invalidated when bridge data
updates. This prevents rescanning ~20 files on every tree refresh.

- **Validation**: Multiple `getChildren()` calls within 30 seconds return cached
  results without filesystem I/O
- **Integration**: Cache invalidation tied to `MultiSessionBridgeWatcher` events

### FR5: Updated Detail Views

The ContextContentPanel must show actual file contents for the new categories
when users click them:

- CLAUDE.md & Rules: List each file with path, size, and content preview
- Auto Memory: Show MEMORY.md (first 200 lines) and each topic file
- Agents & Commands: List all agent files with sizes
- System Overhead: Explanation of what it includes and why it's a fixed estimate

- **Validation**: Clicking each category shows the correct files with accurate
  token counts
- **Integration**: `ContextContentPanel.showCategory()` dispatches to new render
  methods per category

## Non-Functional Requirements

### Performance

- Scanner must complete within 100ms for typical workspaces (~20 files)
- Caching ensures tree refresh takes <10ms when cache is valid
- No synchronous I/O in the tree data provider's async `getChildren()` path

### Compatibility

- Must work on macOS, Linux, and Windows (path encoding handles all separators)
- Must handle missing files gracefully (e.g., no `~/.claude/CLAUDE.md` on some
  machines)
- Must not break when Claude Code is not installed (scanner returns empty
  results)

### Privacy

- Only reads file sizes and content from paths the user owns
- Auto memory is the user's own data in their home directory
- No network requests — all local filesystem operations
- Follows existing privacy patterns from ClaudeSessionReader

## Success Criteria

| Metric               | Target                                     | Measurement                                            |
| -------------------- | ------------------------------------------ | ------------------------------------------------------ |
| Token count accuracy | Sum of categories within 5% of API total   | Compare displayed sum vs BridgeData.totalContextTokens |
| File coverage        | All Claude Code loaded files accounted for | Manual inspection: no files missed                     |
| Scan performance     | <100ms per scan                            | Performance test with timer                            |
| Cache hit rate       | >90% of tree refreshes served from cache   | Log cache hits/misses in test                          |

## Assumptions

- System prompt and tool schemas are invisible from outside Claude Code; a fixed
  ~14,800 token estimate is acceptable
- MEMORY.md truncation at 200 lines matches Claude Code's actual behavior
- `Math.ceil(bytes / 4)` token estimation is sufficient (no need for tiktoken)
- Agent files are loaded when the Task tool is used (not always in every turn)
- Command/skill files only load on invocation; the scanner reports agents
  separately from commands
- The hook bridge's `totalContextTokens` accurately represents the Anthropic
  API's reported usage
- Compaction changes conversation history but the residual calculation handles
  this naturally

## Dependencies

- `ClaudeSessionReader` — path encoding and `getProjectDir()` for
  `~/.claude/projects/`
- `BridgeData` from `HookBridgeWatcher` — ground truth `totalContextTokens`
- `MultiSessionBridgeWatcher` — triggers refresh and provides session data
- `ContextContentPanel` — detail view when clicking categories
- `readTranscript()` / `classifyTranscript()` — conversation subcategory
  breakdowns

## Out of Scope

- Exact tokenizer (tiktoken) integration — byte/4 estimation is sufficient
- Measuring conversation history per-message (only the residual is shown)
- Real-time file watching for CLAUDE.md changes mid-session
- Showing which specific command/skill is currently loaded (would require
  transcript analysis)
- Modifying the hook bridge data format
- Context reduction/compaction features (separate feature)

## Glossary

| Term                 | Definition                                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| Bridge Data          | JSON file written by Claude Code hooks containing real-time session metrics       |
| Auto Memory          | Claude Code's persistent memory at `~/.claude/projects/{encoded}/memory/`         |
| Path Encoding        | Converting `/Users/x/Code/gofer` to `-Users-x-Code-gofer` for directory lookup    |
| Residual Calculation | Deriving conversation tokens as total minus all measurable file-based tokens      |
| System Overhead      | Invisible system prompt + tool schemas baked into every API call (~14,800 tokens) |

## Research Traceability

| Research Finding                                          | Spec Section              | Reference                          |
| --------------------------------------------------------- | ------------------------- | ---------------------------------- |
| ClaudeSessionReader.getProjectDir() path encoding         | FR1, Dependencies         | Integration Point 1                |
| BridgeData.context.totalContextTokens as ground truth     | FR3, Dependencies         | Integration Point 2                |
| ContextWindowProvider.getCategoryItems() fake percentages | FR2                       | Integration Point 3                |
| ContextContentPanel.showCategory() detail views           | FR5, Dependencies         | Integration Point 4                |
| MultiSessionBridgeWatcher triggers refresh                | FR4, Dependencies         | Integration Point 5                |
| System prompt/tool schemas invisible                      | Assumptions, FR1          | Constraint: invisible overhead     |
| MEMORY.md truncated to 200 lines                          | Assumptions, FR1          | Constraint: auto memory truncation |
| Command/skill files on-demand                             | Assumptions, Out of Scope | Constraint: on-demand loading      |
| Compaction changes history                                | Assumptions               | Constraint: compaction             |
| Privacy patterns from ClaudeSessionReader                 | NFR: Privacy              | Constraint: privacy                |
| Math.ceil(bytes/4) token estimation                       | FR1, Assumptions          | Tech Decision 2                    |
| 30s cache with bridge invalidation                        | FR4                       | Tech Decision 4                    |
| New category structure                                    | FR2, US1                  | Tech Decision 1                    |
| Residual calculation for conversation                     | FR3                       | Tech Decision 3                    |
