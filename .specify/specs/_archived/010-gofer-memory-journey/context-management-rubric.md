# Gofer Context Window Management: Rubric & Engineering Scorecard

**Date**: 2026-02-08 **Methodology**: Research documents in this repo were
analyzed to extract every claimed context management strategy. Each was then
scored against the actual codebase implementation via engineering deep dive.

**Scoring**: 0-5 scale per item

- **0** = Not implemented at all
- **1** = Stub/placeholder only
- **2** = Code exists but not connected/functional
- **3** = Implemented and connected, but significant gaps
- **4** = Fully functional with minor gaps
- **5** = Production-ready, battle-tested, complete

---

## Category A: Real-Time Context Monitoring

### A1. Context Health Monitor

**Research Claim**: Track token utilization in real-time, emit events at healthy
(<50%), warning (50-70%), and critical (>70%) thresholds.

**Engineering Finding**: `ContextHealthMonitor.ts` (645 lines) is fully
implemented with periodic health checks, configurable thresholds, event emission
(`healthy`, `warning`, `critical`, `status-change`, `handoff-recommended`), and
state persistence to `.specify/memory/context-health-state.json`. Live state
file contains real data:
`{"status":"warning","utilizationPercent":61.26,"tokensUsed":122513,"tokensLimit":200000,"dataSource":"real","model":"claude-opus-4-6"}`.

**Score: 5/5** — Production-running with real data.

---

### A2. Real Token Usage from Claude Code Sessions

**Research Claim**: Read actual API-reported token counts from Claude Code JSONL
session logs, not just filesystem estimates.

**Engineering Finding**: `ClaudeSessionReader.ts` (452 lines) reads from
`~/.claude/projects/{encoded-workspace-path}/`. Uses `tailReadFile()` to read
last 10KB and extract `input_tokens`, `cache_creation_input_tokens`,
`cache_read_input_tokens`, `output_tokens` from the last assistant message.
Privacy guard via `APPROVED_FIELDS` set — never reads message content.
Model-aware limits (200k for Claude models).

**Score: 5/5** — Real token data extraction works correctly.

---

### A3. Hook-Based Event Bridge

**Research Claim**: Real-time data flow from Claude Code via hooks, not polling.

**Engineering Finding**: `HookBridgeWatcher.ts` (167 lines) watches
`.specify/hooks/context-bridge.json`. The bridge file is written by
`post-tool-use.mjs` hook script on every Claude Code tool call. Contains:
`totalContextTokens`, `inputTokens`, `cacheCreationInputTokens`, `model`,
`sessionId`, `lastToolUse`. Live bridge file has real data. Events:
`bridge-update`, `session-start`, `session-end`, `session-stale`. Integration:
on `bridge-update`, ContextHealthMonitor does immediate `checkHealth()`. On
`session-start`, polling slows to 60s (hooks handle real-time).

**Score: 5/5** — Working in production with real Claude Code sessions.

---

### A4. Status Bar Visualization

**Research Claim**: Color-coded context health in VSCode status bar
(green/yellow/red) with click-to-show detailed breakdown.

**Engineering Finding**: Two status bar items:

- `ContextHealthStatusBar.ts` — Shows "Context: N% (Model)" with health-colored
  backgrounds
- `GoferActivityStatusBar.ts` — Shows "Gofer Memory: Active/Idle/--"

Both show "--" placeholder when no Claude Code session is active, and real data
when hooks are feeding. Click handler opens QuickPick with session details.
**Bug found in v1.1.10**: These weren't shown after `gofer.initialize` because
the command called `initializeProgressProvider()` instead of
`handleGoferFormat()`. **Fixed in v1.1.11**.

**Score: 4/5** — Functional with the v1.1.11 fix, but the initialization wiring
bug lingered for 8+ releases.

---

### A5. JSONL Usage Logging

**Research Claim**: Append-only observability logging for context usage over
time.

**Engineering Finding**: `ContextUsageLogger.ts` writes to
`.specify/logs/context-usage.jsonl`. Wired to ContextHealthMonitor events.
**FIXED (Spec 015 US3)**: Estimated data entries are now throttled to once per 5
minutes (300,000ms). Status transitions always logged regardless of throttle.
`dataSource` is passed through from ContextHealthStatus so callers can
distinguish real vs estimated entries.

**Score: 5/5** — Logging is clean, throttled, and properly distinguishes real vs
estimated data sources.

---

## Category B: Context Reduction Strategies

### B1. Observation Masking

**Research Claim**: Replace older tool outputs with XML placeholders, achieving
50%+ context reduction. Recoverable via `gofer_expand_observation` MCP tool.

**Engineering Finding**: `ObservationMasker.ts` (527 lines) is fully coded.
Tracks observations with UUID, SHA-256 hash, turn number, token estimate. Masks
observations older than configurable age threshold. Preserves error-containing
observations. Cache persistence to
`.specify/memory/observation-cache/index.json`. `gofer_expand_observation` MCP
tool works.

**FIXED (Spec 015 US1)**: The `bridge-update` handler in `extension.ts` now
auto-feeds tool use events into `ContextBuilder.trackObservation()` via the hook
bridge. Tool names are mapped to ObservationType (Read→file_read,
search→search_result, test→test_output, default→command_output). The
`post-tool-use.mjs` hook script now includes `outputTokens` in `lastToolUse`
data. Old observations are automatically masked via `maskOldObservations()`.

**Score: 4/5** — Observation tracking is wired and functional. Tool outputs are
tracked and old observations are masked automatically. Minor gap: the actual
tool output content is a placeholder string (not the real output), since Claude
Code hooks don't expose the full tool response body.

---

### B2. Memory-First Loading

**Research Claim**: Load memories before research documents. Only load research
for uncovered topics. 40% context reduction.

**Engineering Finding**: `ContextBuilder.buildContext()` implements the full
flow: loads memories by priority → calculates keyword coverage → conditionally
loads research chunks for gaps (if coverage < 30%).
`MemoryManager.loadByPriority()` scores memories using usage frequency (40%),
recency (35%), and age bonus (25%). Relevance scoring uses keyword extraction
with stopword removal.

**GAP**: Keyword matching is simplistic (substring matching with stopword
removal). The 30% coverage threshold may trigger research loading more often
than intended because keyword overlap is a weak proxy for semantic coverage.

**Score: 4/5** — Fully implemented and connected. The strategy works but
keyword-based coverage is imprecise compared to semantic matching.

---

### B3. Research Chunking with Index

**Research Claim**: Split research.md into semantic chunks, create searchable
index, load only relevant top-N chunks instead of full document.

**Engineering Finding**: `ResearchChunker.ts` (814 lines) is fully implemented.
Parses markdown by heading level, creates chunks with summaries. Index saved to
`{specDir}/research-index.json` with invalidation on `research.md` modification.
Relevance scoring: keyword overlap (60pts), position bonus (20pts), title match
(20pts). Small chunk merging below 100 tokens. Default: loads top 5 chunks. Used
by ContextBuilder.

**Score: 5/5** — Complete, tested, and production-connected.

---

### B4. Stage-Aware Context Profiles

**Research Claim**: Different context budget allocations per Gofer stage
(Research gets more research budget, Implement gets more code budget).

**Engineering Finding**: `StageContextProfile.ts` +
`StageContextProfileLoader.ts` define 6 stage profiles with budget allocations.
YAML configuration at `.specify/memory/context-profiles.yaml` with hardcoded
defaults. Used by `ContextBuilder.setCurrentStage()`. Budget warnings emitted
when categories exceeded.

**GAP**: Stage detection (`WorkspaceContextProvider.detectCurrentStage()`) uses
filesystem heuristics (which artifact was modified most recently), not explicit
pipeline state. Could misdetect the current stage.

**Score: 4/5** — Profiles work. Stage detection is heuristic-based rather than
explicit.

---

### B5. Sub-Agent Architecture

**Research Claim**: Delegate research to specialized sub-agents with clean
context windows, returning condensed 1-2k token summaries.

**Engineering Finding**: Three sub-agents defined in `.claude/agents/`:
`codebase-locator`, `codebase-analyzer`, `codebase-pattern-finder`. These are
Claude Code Task tool agent definitions, not Gofer-specific code. They work
through Claude Code's native Task tool. Each returns condensed results.

**Score: 5/5** — This is a prompt/architecture pattern, and it works as
designed. The agents exist and are used by the Gofer pipeline commands.

---

## Category C: Session Management

### C1. Session Save (Checkpoint)

**Research Claim**: Save comprehensive session state for resumption:
conversation context, git status, task progress, decisions, blockers.

**Engineering Finding**: `/7_gofer_save.md` (347 lines) is a Claude command
prompt that instructs Claude to create `session-checkpoint.md` with YAML
frontmatter and detailed progress documentation. Targets <5,000 token handoff
documents.

**DESIGN CHOICE**: This is prompt-driven, not programmatic. The quality of the
checkpoint depends on how well Claude follows the instructions. There is no
binary serialization or deterministic state capture.

**Score: 3/5** — Practical approach that works, but inherently
non-deterministic. A well-written checkpoint by Claude is useful; a
poorly-written one is not. No validation that all required fields are present.

---

### C2. Session Resume

**Research Claim**: Restore full context from checkpoint, reload feature
artifacts, validate git state, resume implementation.

**Engineering Finding**: `/8_gofer_resume.md` (404 lines) instructs Claude to
discover checkpoints, load artifacts in order (checkpoint → tasks → plan → spec
→ research), validate git state, and rebuild mental model. Supports quick
resume, full context restore, and recovery mode (no checkpoint).

**Score: 3/5** — Same prompt-driven approach as save. Works well when followed
correctly. No programmatic guarantee of state restoration.

---

### C3. Auto-Handoff Triggering

**Research Claim**: Automatically detect critical context levels and trigger
save + notification with action buttons.

**Engineering Finding**: `AutoHandoffTrigger.ts` (693 lines) listens for
`critical` and `handoff-recommended` events from ContextHealthMonitor. Only
triggers on `dataSource === 'real'` (filesystem estimates never trigger — good
safety guard). Shows VSCode notification with 4 buttons: "Save & Continue
Later", "Reseed Context", "Dismiss", "Remind in 10 min". 5-minute cooldown
between notifications.

**FIXED (Spec 015 US2)**: `gofer.saveProgress` is now registered in
`registerGlobalCommands()`, ensuring it's available before any UI components
reference it. The command accepts `{ handoffContent, healthStatus, reason }`
payload from AutoHandoffTrigger, writes handoff content to the most recently
modified spec's `session-handoff.md`, and shows a confirmation message. If no
payload is provided, it generates handoff content automatically.

**Score: 5/5** — Auto-handoff trigger detection, notification, and save action
all work end-to-end.

---

### C4. Context Reseed

**Research Claim**: Clear stale observations and rebuild context fresh to
recover from context bloat.

**Engineering Finding**: `ContextBuilder.reseedContext()` clears the observation
cache, resets turn counter to 0, and rebuilds context. Wired to
AutoHandoffTrigger as the "Reseed Context" action button.

**Score: 4/5** — Works but limited impact because the ObservationMasker isn't
being fed real data (see B1).

---

## Category D: Memory System

### D1. Memory Storage & Retrieval

**Research Claim**: JSONL-based append-only storage with in-memory index,
supporting create/read/update/delete with priority-based retrieval.

**Engineering Finding**: `MemoryManager.ts` (1003 lines) + `MemoryStorage.ts`
(449 lines). JSONL storage at `.specify/memory/memories.jsonl`. Automatic
migration from legacy `local.json`. In-memory index rebuilt on startup. Updates
append new versions. Deletes append tombstones. Compaction removes old versions.

**Score: 5/5** — Solid storage architecture, well-tested.

---

### D2. Memory Priority System

**Research Claim**: Score memories by usage frequency, recency, and age.
Increment priority on decision use (+1) and update (+1), but NOT on retrieval.

**Engineering Finding**: `loadByPriority()` scoring: usage frequency (40%
weight, logarithmic scale of `usedCount`), recency (35%, linear decay over 30
days from `lastUsed`), age bonus (25%, older actively-used memories get bonus).
Priority index increments are handled by explicit `incrementUsedCount()` and
`updateMemory()` calls.

**Score: 4/5** — Priority system works. The "increment on use, not retrieval"
rule depends on callers using the right methods. No enforcement at the API
level.

---

### D3. Continuous Memory Writing

**Research Claim**: Auto-save decisions, stage transitions, and task completions
as memories.

**Engineering Finding**: `ContinuousMemoryWriter.ts` (255 lines) listens to
ContextBuilder events (`budget-warning`, `loading-decision`). Auto-saves stage
transitions and task completions. Rate-limited to 10 auto-saves per stage. Wired
to shared ContextBuilder in `extension.ts:1393`.

**Score: 4/5** — Working and connected. Rate limiting prevents spam. Could be
more comprehensive (doesn't capture architectural decisions from Claude's
reasoning).

---

### D4. Citation Verification

**Research Claim**: Just-in-time verification of memory citations before
applying them (GitHub Copilot pattern).

**FIXED (Spec 015 US6)**: `CitationVerifier.ts` created in
`extension/src/autonomous/`. Extracts file path citations from memory content
using regex patterns for full paths (e.g., `extension/src/extension.ts`) and
supported file extensions. Verifies each citation with `fs.existsSync()`.
If >50% of citations are stale, adds a
`[STALE CITATIONS: X/Y file references may be outdated]` warning prefix. Wired
into ContextBuilder before memory injection — stale memories get marked but are
NOT blocked from injection.

**Score: 3/5** — File path verification implemented and wired. Does not yet
verify function/class name references (would require codebase grepping).
Warning-only approach is correct per spec.

---

### D5. Knowledge Graph

**Research Claim**: Entity relationships for code understanding,
Zettelkasten-inspired interconnected knowledge.

**Engineering Finding**: `KnowledgeGraph.ts` exists and is wired to
ContextBuilder in `extension.ts:1370`. Initialized asynchronously. Used by
ContextBuilder to add "affected files" context.

**Score: 3/5** — Exists and connected, but the depth of the knowledge graph
(entity types, relationship richness) was not deeply analyzed. The Zettelkasten
vision from the spec is much more ambitious than the current implementation.

---

## Category E: Advanced / Aspirational

### E1. MIT RLM-Inspired Recursive Context Folding

**Research Claim**: Treat context as external variable with peek/grep/expand
operations. 10x capacity improvement.

**Engineering Finding**: Documented in
`011-context-health-recursive-memory/research.md` as Options 18-20. **Not
implemented.** This is future/aspirational work.

**Score: 0/5** — Research only.

---

### E2. Semantic Observation Compression

**Research Claim**: Use LLM to summarize old observations instead of just
masking them. 60-70% reduction.

**Engineering Finding**: Documented in spec as Option 3. **Not implemented.**
Current masker only does binary mask/unmask, no summarization.

**Score: 0/5** — Not implemented.

---

### E3. Memory Consolidation (Research → Verified Memories)

**Research Claim**: Automatically convert research findings into verified,
reusable memories.

**Engineering Finding**: `MemoryConsolidator.ts` is referenced in the codebase.
Not deeply analyzed but it exists as a module.

**Score: 2/5** — Module exists but integration completeness unclear.

---

## Summary Scorecard

| #                              | Capability                       |  Score  | Status                                |
| ------------------------------ | -------------------------------- | :-----: | ------------------------------------- |
| **A. Real-Time Monitoring**    |                                  |         |                                       |
| A1                             | Context Health Monitor           | **5/5** | Production-running                    |
| A2                             | Real Token Usage from Sessions   | **5/5** | Working                               |
| A3                             | Hook-Based Event Bridge          | **5/5** | Working                               |
| A4                             | Status Bar Visualization         | **4/5** | Working (init bug fixed v1.1.11)      |
| A5                             | JSONL Usage Logging              | **5/5** | Throttled, clean (Spec 015 fix)       |
| **B. Context Reduction**       |                                  |         |                                       |
| B1                             | Observation Masking              | **4/5** | Wired via hook bridge (Spec 015 fix)  |
| B2                             | Memory-First Loading             | **4/5** | Working, keyword matching is weak     |
| B3                             | Research Chunking with Index     | **5/5** | Complete and tested                   |
| B4                             | Stage-Aware Context Profiles     | **4/5** | Working, heuristic stage detection    |
| B5                             | Sub-Agent Architecture           | **5/5** | Working via Claude Code agents        |
| **C. Session Management**      |                                  |         |                                       |
| C1                             | Session Save (Checkpoint)        | **3/5** | Prompt-driven, not programmatic       |
| C2                             | Session Resume                   | **3/5** | Prompt-driven, not programmatic       |
| C3                             | Auto-Handoff Triggering          | **5/5** | Fully working (Spec 015 fix)          |
| C4                             | Context Reseed                   | **4/5** | Works, but limited by B1              |
| **D. Memory System**           |                                  |         |                                       |
| D1                             | Memory Storage & Retrieval       | **5/5** | Solid JSONL architecture              |
| D2                             | Memory Priority System           | **4/5** | Working, no enforcement               |
| D3                             | Continuous Memory Writing        | **4/5** | Working, rate-limited                 |
| D4                             | Citation Verification            | **3/5** | File path verification (Spec 015 fix) |
| D5                             | Knowledge Graph                  | **3/5** | Basic implementation                  |
| **E. Advanced / Aspirational** |                                  |         |                                       |
| E1                             | Recursive Context Folding (RLM)  | **0/5** | Research only                         |
| E2                             | Semantic Observation Compression | **0/5** | Not implemented                       |
| E3                             | Memory Consolidation             | **2/5** | Module exists, integration unclear    |

---

## Aggregate Scores by Category

| Category                   | Items  | Total Possible | Actual Score | Percentage |
| -------------------------- | :----: | :------------: | :----------: | :--------: |
| A. Real-Time Monitoring    |   5    |       25       |    **24**    |  **96%**   |
| B. Context Reduction       |   5    |       25       |    **22**    |  **88%**   |
| C. Session Management      |   4    |       20       |    **15**    |  **75%**   |
| D. Memory System           |   5    |       25       |    **19**    |  **76%**   |
| E. Advanced / Aspirational |   3    |       15       |    **2**     |  **13%**   |
| **OVERALL**                | **22** |    **110**     |    **82**    |  **75%**   |

---

## Gaps Closed by Spec 015

### 1. Wire Observation Masking to Real Tool Outputs (B1: 2/5 → 4/5) -- FIXED

**Fix**: Hook bridge `bridge-update` handler now auto-feeds tool use events into
`ContextBuilder.trackObservation()`. Tool names mapped to ObservationType.
`post-tool-use.mjs` updated to include `outputTokens`. Remaining gap:
placeholder content instead of actual tool output body.

### 2. Register `gofer.saveProgress` Command (C3: 3/5 → 5/5) -- FIXED

**Fix**: `gofer.saveProgress` registered in `registerGlobalCommands()`. Accepts
payload from AutoHandoffTrigger, writes session-handoff.md, shows confirmation.

### 3. Filter Noisy JSONL Logging (A5: 3/5 → 5/5) -- FIXED

**Fix**: Estimated data throttled to once per 5 minutes. Status transitions
always logged. `dataSource` passed through to logger.

### 4. Implement Citation Verification (D4: 0/5 → 3/5) -- FIXED

**Fix**: `CitationVerifier.ts` created. Extracts file path citations, verifies
with `fs.existsSync()`, adds staleness warning prefix if >50% stale. Wired into
ContextBuilder before memory injection.

## Remaining Gaps (Impact-Ordered)

### 1. Make Session Save/Resume More Deterministic (C1+C2 → 3/5 to 4/5)

**Impact**: Prompt-driven checkpoints are inherently variable in quality. A
schema validation step would catch incomplete checkpoints. **Fix**: Add YAML
schema validation to checkpoint files. Warn if required fields (stage,
active_task, code_changes) are missing.

### 2. Knowledge Graph Depth (D5 → 3/5 to 4/5)

**Impact**: Knowledge graph exists but is basic. The Zettelkasten vision from
the spec is more ambitious. **Fix**: Add richer entity types and relationship
tracking.

### 3. Observation Masking — Real Content (B1 → 4/5 to 5/5)

**Impact**: Tool outputs are tracked but with placeholder content, not actual
output. **Fix**: Claude Code hooks would need to expose tool response bodies for
full content tracking.

---

## Verdict

Gofer has a **comprehensive** context management system. The real-time
monitoring stack (Category A) is now at **96%** — real token data from Claude
Code sessions flows through hooks, gets processed by the health monitor,
displays in the status bar, and is logged cleanly with proper throttling.

Context reduction (Category B) is at **88%** — observation masking is now wired
to the hook bridge and auto-feeds tool use events. Memory-first loading and
research chunking work well. The remaining gap is that tool output content uses
placeholders rather than actual response bodies (a Claude Code hook limitation).

Session management (Category C) improved to **75%** — the `gofer.saveProgress`
command now works end-to-end with the auto-handoff trigger. Save/Resume remain
prompt-driven, which is acceptable but could be more deterministic.

Memory system (Category D) improved to **76%** — citation verification is now
implemented, detecting stale file references before memory injection. The
knowledge graph remains basic.

The advanced/aspirational features (Category E) are correctly identified as
future work.

**Overall: 75% of the rubric is delivered (82/110).** Excluding the aspirational
Category E, the "practical" score is **80/95 = 84%**. This is a +9 point
improvement from the pre-Spec 015 score of 73/110 (66%).
