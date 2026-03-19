---
id: 029-memory-system-v2
title: Memory System v2 - Agent Memory Architecture
status: draft
created: 2026-03-19T22:00:00Z
updated: 2026-03-19T22:00:00Z
author: Claude Sonnet 4.5
---

# Feature Specification: Memory System v2

## Overview

Design and implement a comprehensive memory system that serves all Gofer agents
with measurable quality improvements. The system addresses four critical pain
points: context window inefficiency (100-150k tokens by stage 5), knowledge loss
across sessions (~20% repeated mistakes), memory fragmentation across multiple
storage locations, and poor sub-agent memory handoff (agents receive file paths
only, no shared context).

**Primary Value**: Measurable Quality Improvement through persistent learning,
efficient context usage, and improved sub-agent performance. Target outcomes:
95-100/100 validation scores (up from 85-95), <50k context tokens by stage 5
(down from 100-150k), and <5% repeated mistake rate (down from ~20%).

**Motivation**: Gofer already implements sophisticated memory infrastructure
(~3,700 LOC: MemoryManager, ContextBuilder, MemoryLayerManager), but critical
gaps prevent agents from learning effectively. Sub-agents currently operate in
isolation without access to shared learnings. The auto-chain architecture
accumulates context bloat because each pipeline stage invokes the next in the
same Claude Code session. Manual memory updates (via `tasks/lessons.md`) are
lossy and frequently skipped under time pressure.

**Competitive Context**: OpenViking (ByteDance) achieves 91-96% token reduction
via L0/L1/L2 tiered loading and filesystem-paradigm URIs. MemGPT/Letta,
LangChain, and Mem0 converge on three-tier memory architectures (transient →
short-term → long-term) with graph-based entity relationships. This
specification adopts proven patterns adapted to Gofer's TypeScript ecosystem and
git-friendly JSONL storage.

## User Stories

### P1 Stories (Critical - Foundational Capabilities)

#### US-P1-01: Sub-Agent Memory Injection (Priority: P1)

As a **validation sub-agent** (correctness, security, performance, integration,
test-quality, standards) I want to **receive prioritized memories relevant to my
validation domain** (5-10 past patterns, 5k-10k tokens) So that **I can apply
learned patterns and avoid rediscovering issues found in previous features**

**Why this priority**: Directly impacts measurable quality improvement goal.
Validation agents currently start from zero knowledge and rediscover the same
issues across features. This is the highest-ROI improvement.

**Independent Test**: Dispatch a validation agent with injected memories and
measure whether it detects an issue that was previously flagged in another
feature. Compare detection rate with/without memory injection.

**Acceptance Criteria**:

- [ ] Validation agents receive context sections containing 5-10 prioritized
      memories specific to their validation category
- [ ] Memories include: past patterns found, affected file citations, severity
      ratings
- [ ] Token budget per agent: 5k-10k tokens (vs. 0 currently)
- [ ] Memory selection uses priority scoring (usage _ 0.4 + recency _ 0.35 + age
      bonus \* 0.25)
- [ ] Memory loading is observable via context-usage.jsonl events
- [ ] Agents reference specific memories in validation reports when detecting
      matching patterns

#### US-P1-02: Automatic Pattern Extraction from Validation (Priority: P1)

As the **pipeline orchestrator** (/6_gofer_validate command) I want to
**automatically extract validation patterns from agent findings** after
validation completes So that **Red/Yellow findings become persistent memories
for future features**

**Why this priority**: Closes the learning loop. Without automatic extraction,
patterns are lost or require manual capture. This enables the system to learn
from every feature.

**Independent Test**: Run validation on a feature that produces 3 Red findings.
Verify that 3 new memories are created with category `validation_pattern`,
tagged with validation type, and include file citations.

**Acceptance Criteria**:

- [ ] After /6_gofer_validate completes, extract memories from all validation
      reports
- [ ] Red findings → `validation_pattern` memories with category tag and
      severity
- [ ] Yellow findings → `lesson` memories with stage context
- [ ] Each memory includes: pattern description, affected files, line numbers,
      agent ID
- [ ] Write-back is non-blocking (pipeline continues regardless of extraction
      success)
- [ ] Extraction logged to context-usage.jsonl with memory count

#### US-P1-03: Tiered Context Loading (L0/L1/L2) (Priority: P1)

As the **ContextBuilder** component I want to **load memory and spec artifacts
in three tiers** (abstract ~100 tokens → overview ~2k tokens → detail unlimited)
So that **context stays under 50k tokens by stage 5 while preserving retrieval
flexibility**

**Why this priority**: Solves context bloat problem. Current auto-chain
architecture loads full spec artifacts (55k-115k tokens) into every stage.
Tiered loading provides 30-60% token reduction immediately.

**Independent Test**: Load a memory via L1 tier and verify token count is ~2k.
Upgrade to L2 tier and verify full content is retrieved. Compare total context
size with/without tiered loading at stage 5.

**Acceptance Criteria**:

- [ ] Memories have three layers: `abstract` (one-sentence, ~100 tokens),
      `overview` (key points, ~2k tokens), `detail` (lazy-loaded full content)
- [ ] ContextBuilder loads L0 by default, L1 on relevance signal (>30% keyword
      coverage), L2 on explicit request
- [ ] Spec artifacts (research.md, spec.md, plan.md) also support tiered loading
- [ ] Layer selection logged to context-usage.jsonl with decision rationale
- [ ] Backward compatible: existing memories without layers load via detail tier
- [ ] Token savings: 30-60% reduction in total context size at stage 5

#### US-P1-04: gofer:// URI Abstraction (Priority: P1)

As a **sub-agent** (validation, research, multi-perspective) I want to
**reference memory and spec artifacts via gofer:// URIs** instead of raw file
paths So that **I can discover and access memory uniformly without hardcoded
path knowledge**

**Why this priority**: Enables memory discoverability for sub-agents. Current
pattern requires hardcoded file paths in agent prompts. URI abstraction provides
semantic addressing and future-proofs storage backend changes.

**Independent Test**: Resolve `gofer://memory/core/task-context.md` to absolute
file path. Change underlying storage location and verify URI still resolves.
Query `gofer://specs/029-*/research.md` and verify scoped search.

**Acceptance Criteria**:

- [ ] URI scheme: `gofer://{scope}/{path}` where scope = specs | memory | agent
      | session | user
- [ ] Scope mapping: specs → .specify/specs/, memory → .specify/memory/, agent →
      .specify/memory/agent/, session → .specify/specs/{feature}/session-\*,
      user → ~/.claude/projects/.../memory/
- [ ] URI resolver supports: exact path lookup, glob patterns, scoped search
- [ ] Lazy evaluation: URIs resolve to content only when accessed
- [ ] Integration with existing MemoryManager.load() and ContextBuilder APIs
- [ ] Documentation of URI conventions in constitution.md

### P2 Stories (Important - Enhanced Capabilities)

#### US-P2-01: Research Agent Memory Access (Priority: P2)

As a **research sub-agent** (codebase-locator, codebase-analyzer,
codebase-pattern-finder) I want to **receive memories about past codebase
patterns and integration points** from previous features So that **I can build
on prior research and avoid re-analyzing unchanged code**

**Why this priority**: Reduces redundant research. Currently all research agents
start from scratch. This improves research efficiency and consistency.

**Independent Test**: Dispatch codebase-pattern-finder with memories about
authentication patterns from feature 027. Verify agent output references prior
patterns when analyzing authentication code.

**Acceptance Criteria**:

- [ ] Research agents receive 5-10 prioritized memories tagged with
      `#codebase_pattern` or `#integration_point`
- [ ] Memory selection scoped to: relevant code modules, past architectural
      decisions, known technical debt
- [ ] Token budget: 5k-10k per research agent
- [ ] Agent results include citations to memories used
- [ ] Write-back: New patterns discovered are saved as `codebase_pattern`
      memories

#### US-P2-02: Memory Coverage Calculation (Priority: P2)

As the **ContextBuilder** component I want to **calculate keyword coverage for
task vs. available memories** So that **I can skip loading research docs when
memories adequately cover the task (>30% coverage)**

**Why this priority**: Extends existing coverage logic
(ContextBuilder.ts:816-875) to optimize context budget. When memories provide
sufficient coverage, research docs become redundant.

**Independent Test**: Create task with keywords ["authentication", "sessions",
"JWT"]. Ensure memories exist covering those keywords. Verify coverage >30% and
research docs are skipped. Verify decision logged.

**Acceptance Criteria**:

- [ ] Extract task keywords via TF-IDF (existing algorithm)
- [ ] Calculate coverage: (matched keywords / total keywords) \* 100 using
      trigram similarity (threshold 0.3)
- [ ] IF coverage >= 30%: skip research docs, load memories only
- [ ] IF coverage < 30%: load both research docs and memories
- [ ] Coverage calculation logged to context-usage.jsonl with matched/total
      keyword counts
- [ ] Configurable threshold via `gofer.memory.coverageThreshold` setting

#### US-P2-03: Memory Consolidation with Extraction (Priority: P2)

As the **MemoryManager** background consolidation timer (30-minute intervals) I
want to **extract patterns from recent pipeline runs** in addition to
deduplication/archival So that **learnings are automatically captured without
manual intervention**

**Why this priority**: Automates what's currently manual (updating
tasks/lessons.md). Reduces friction and ensures consistent memory capture.

**Independent Test**: Complete a feature pipeline with 3 validation findings and
2 engineering review issues. Wait for consolidation cycle. Verify 5 new memories
extracted.

**Acceptance Criteria**:

- [ ] Consolidation timer runs every 30 minutes (existing pattern)
- [ ] Extraction sources: .specify/logs/pipeline.jsonl, validation-report.md,
      engineering-review-report.md
- [ ] Extraction logic: Red findings → validation_pattern, Yellow findings →
      lesson, implementation decisions → decision
- [ ] Non-blocking: consolidation failure does not crash extension
- [ ] Extraction count logged to context-usage.jsonl
- [ ] LLM provider: Claude Haiku (cost-effective, ~$0.001 per run)

#### US-P2-04: Observable Memory Loading (Priority: P2)

As a **developer** or **future Claude session** I want to **see which memories
were loaded/skipped during context building** and understand why So that **I can
debug "why didn't the agent see this context?" and tune retrieval thresholds**

**Why this priority**: Transparency and debuggability. Extends existing loading
decision pattern (ContextBuilder.ts:724-788) to memory layer.

**Independent Test**: Trigger context build for a task. Review
context-usage.jsonl. Verify events for each memory with decision
(loaded/skipped) and reason (e.g., "priority score 87.3", "coverage met").

**Acceptance Criteria**:

- [ ] Emit loading-decision events for each memory evaluated
- [ ] Event fields: source (memory ID), decision (loaded/skipped/blocked),
      reason (priority score, coverage threshold, token budget), tokens
      (estimated)
- [ ] Events logged to .specify/logs/context-usage.jsonl (existing log file)
- [ ] Observable via Memory panel UI: show "Last loaded" timestamp and reason
- [ ] Inline annotations in Claude Code chat: "Used 3 memories about validation"
      with expandable list

### P3 Stories (Nice-to-Have - Advanced Capabilities)

#### US-P3-01: Hybrid Directory + Semantic Search (Priority: P3)

As a **memory retrieval component** I want to **find memories using hybrid
path + keyword search** (directory recursive retrieval) So that **hierarchical
context is preserved and scoped queries work** (e.g., "authentication patterns
in feature 027")

**Why this priority**: Improves retrieval precision. Combines deterministic
paths (fast, reliable) with semantic search (flexible). Adopts OpenViking's
proven pattern.

**Independent Test**: Query "authentication patterns in feature 027". Verify
retrieval starts at gofer://specs/027-\*/, searches within that scope, and
returns only results from that feature.

**Acceptance Criteria**:

- [ ] Retrieval algorithm: 1) Analyze intent → extract conditions, 2) Find
      high-score directory via keyword search, 3) Refined exploration within
      directory, 4) Recursive drill-down into subdirectories, 5) Aggregate and
      rank
- [ ] Preserves hierarchy: folder metadata included in results
- [ ] Observable trajectory: log directory path traversed
- [ ] Fast path for exact URIs: `read(gofer://memory/core/task-context.md)`
      bypasses search
- [ ] Integration with existing TF-IDF + trigram similarity (no embeddings
      required for MVP)

#### US-P3-02: Real-Time Memory Updates During Implementation (Priority: P3)

As an **implementation agent** running a long-running task (hours) I want to
**save incremental pattern discoveries immediately** rather than waiting for
pipeline completion So that **learnings from partial work are not lost if
session crashes or user interrupts**

**Why this priority**: Reduces data loss risk for long sessions. Currently all
extraction happens at consolidation (30-min intervals) or pipeline completion.

**Independent Test**: Implement a task that discovers a reusable utility.
Trigger immediate memory save. Crash the session. Verify memory persisted.

**Acceptance Criteria**:

- [ ] API: `memoryManager.saveImmediate(memory)` for foreground writes
- [ ] Use cases: discovered utilities, error patterns encountered and fixed,
      performance optimizations
- [ ] Token budget: no limit (user controls when to save)
- [ ] Write is non-blocking (async)
- [ ] Saved memories tagged with `#real-time`, `#implement`, stage

#### US-P3-03: Transient vs. Durable Memory Separation (Priority: P3)

As an **agent** executing a task with temporary loop state I want to **store
transient context in-memory** separate from durable JSONL-backed memories So
that **loop variables and intermediate state don't bloat persistent memory**

**Why this priority**: Prevents memory pollution. Without separation, every
intermediate variable risks being saved permanently.

**Independent Test**: Set transient variable "currentFile" in agent loop.
Complete task. Verify transient cleared. Set durable memory "pattern
discovered". Verify persisted to JSONL.

**Acceptance Criteria**:

- [ ] API: `setTransient(key, value)`, `getTransient(key)`, `clearTransient()`
- [ ] Transient storage: in-memory Map, cleared at session end
- [ ] Durable storage: existing JSONL backend
- [ ] Documentation: when to use transient vs. durable
- [ ] Transient not logged to context-usage.jsonl (too noisy)

#### US-P3-04: Stage-Specific Memory Profiles (Priority: P3)

As the **ContextBuilder** component loading context for different pipeline
stages I want to **apply different memory budgets per stage** (research 40%
memories, implement 20% memories, validate 15% memories) So that **each stage
gets appropriate memory mix optimized for its work**

**Why this priority**: Optimizes context composition. Research needs domain
knowledge heavily; implement needs code patterns; validate needs both. Extends
existing StageContextProfile pattern.

**Independent Test**: Load context for "research" stage. Verify 40% of token
budget allocated to memories. Load context for "validate" stage. Verify 15%
allocated. Verify configurable.

**Acceptance Criteria**:

- [ ] Extend StageContextProfile with memoryBudget field (% of total context
      budget)
- [ ] Default profiles: research 40%, specify 30%, plan 25%, tasks 20%,
      implement 20%, validate 15%
- [ ] Configurable via .specify/memory/stage-profiles.json
- [ ] Budget enforcement: truncate low-priority memories if budget exceeded
- [ ] Logged to context-usage.jsonl: allocated budget, used budget, truncated
      memories

### Edge Cases

#### Memory System Edge Cases

- **What happens when memory JSONL is corrupted?** System logs error, skips
  corrupted lines, rebuilds index from valid lines only. User warned via
  notification. Corrupted lines moved to
  `.specify/memory/corrupted-backup.jsonl`.

- **How does system handle concurrent writes from 6 validation agents?** JSONL
  is append-only (naturally concurrent). In-memory index updates are
  mutex-protected. Last-writer-wins for index conflicts (existing pattern).

- **What if memory storage exceeds disk quota?** Consolidation archives
  low-priority memories (existing pattern). If archive also full, user warned
  and memory saves degrade gracefully (log warning, skip save, continue
  execution).

- **What happens when a gofer:// URI cannot be resolved?** Return error with
  suggestions: similar URIs via fuzzy match, list available scopes, check for
  typos. Non-blocking: agent continues without that memory.

- **How does system handle memory version migrations?** Memories without
  L0/L1/L2 layers load via detail tier (backward compatible). New saves include
  all layers. Migration tool available via `gofer.migrateMemoriesToLayered`
  command.

- **What if LLM extraction fails during consolidation?** Consolidation logs
  error (non-fatal), retries on next cycle, continues with dedup/archival. User
  notified via status bar warning.

- **How are duplicate memories prevented?** Consolidation computes content hash
  for deduplication (existing pattern). Memories with identical content hashes
  are merged, preserving highest priority and all citations.

- **What happens when sub-agent memory injection exceeds token budget?**
  Truncate low-priority memories first. Include truncation notice in context: "3
  additional memories available via gofer://memory/overflow/".

## Functional Requirements

### Memory Access and Retrieval

**FR-001**: System MUST provide tiered memory loading with three layers (L0:
abstract ~100 tokens, L1: overview ~2k tokens, L2: detail unlimited) for both
memories and spec artifacts.

**FR-002**: System MUST resolve `gofer://` URIs to absolute file paths with
scope mapping: specs → .specify/specs/, memory → .specify/memory/, agent →
.specify/memory/agent/, session → .specify/specs/{feature}/session-\*, user →
~/.claude/projects/.../memory/.

**FR-003**: System MUST inject prioritized memories into sub-agent prompts with
token budget 5k-10k per agent and category-specific filtering (validation
category, research domain, etc.).

**FR-004**: System MUST calculate memory coverage for task keywords using
TF-IDF + trigram similarity (threshold 0.3) and skip loading research docs when
coverage >= 30%.

**FR-005**: System MUST support hybrid retrieval combining directory hierarchy
traversal with keyword-based semantic search (OpenViking's directory recursive
retrieval pattern).

**Validation**: Verify MemoryManager.loadByPriority() returns correct layer
(L0/L1/L2) based on request parameters. Integration test: load context for
validation agent, assert 5-10 memories present with total tokens 5k-10k.

**Integration**: Extends existing MemoryManager.ts (lines 223-938),
ContextBuilder.ts (lines 816-875, 1151-1206), MemoryLayerManager.ts (lines
68-88).

### Memory Storage and Write-Back

**FR-006**: System MUST automatically extract validation patterns from
/6_gofer_validate reports with mapping: Red findings → `validation_pattern`,
Yellow findings → `lesson`, including file citations and severity.

**FR-007**: System MUST automatically extract engineering review findings from
/6a_gofer_engineering_review with category `lesson` and stage context tags.

**FR-008**: System MUST extract codebase patterns from research agent results
and save as `codebase_pattern` memories with integration point citations.

**FR-009**: System MUST provide immediate write API (`saveImmediate()`) for
real-time pattern discoveries during long-running tasks.

**FR-010**: System MUST separate transient (in-memory Map, cleared at session
end) from durable (JSONL-backed, persistent) memory storage.

**Validation**: Verify write-back after validation completion creates N memories
where N = count of Red/Yellow findings. Integration test: complete validation
with 3 Red findings, assert 3 new memories in memories.jsonl with correct
category and tags.

**Integration**: Extends MemoryManager.save() (lines 274-316), adds extraction
logic to ValidationOrchestrator, EngineeringReviewOrchestrator.

### Memory Consolidation and Maintenance

**FR-011**: System MUST run consolidation timer at 30-minute intervals (existing
pattern) with added extraction from pipeline.jsonl, validation-report.md,
engineering-review-report.md.

**FR-012**: System MUST deduplicate memories via content hash comparison and
merge duplicates by preserving highest priority and all citations (existing
pattern).

**FR-013**: System MUST archive low-priority memories (priority score <
threshold, >200 total) to archive.jsonl to free in-memory index space (existing
pattern).

**FR-014**: System MUST update importance scores based on usage patterns (usage
count, last used timestamp, age bonus) using formula: Priority = (usageScore _
0.4) + (recencyScore _ 0.35) + (ageBonus \* 0.25).

**FR-015**: System MUST migrate memories without L0/L1/L2 layers to layered
format via background migration or on-demand command.

**Validation**: Verify consolidation cycle extracts memories from logs,
deduplicates, archives, and completes within 5 seconds for 1000 memories.
Integration test: trigger consolidation, assert memory count reduced via
deduplication, assert low-priority memories moved to archive.jsonl.

**Integration**: Extends MemoryConsolidator.ts (line 76), MemoryManager
consolidation timer (lines 96-114).

### Sub-Agent Context Injection

**FR-016**: System MUST generate targeted context sections for validation agents
filtered by category (correctness, security, performance, integration,
test-quality, standards) with 5-10 prioritized memories each.

**FR-017**: System MUST generate targeted context sections for research agents
filtered by research domain (codebase location, analysis, patterns) with 5-10
prioritized memories each.

**FR-018**: System MUST include memory metadata in injected context: memory ID,
category, tags, citations, creation date, usage count.

**FR-019**: System MUST format injected context as markdown sections with clear
delineation: "## Past Validation Patterns", "## Relevant Memories", "## Your
Task".

**FR-020**: System MUST log memory injection events to context-usage.jsonl with
agent ID, memory IDs, token count, selection rationale.

**Validation**: Verify validation agent receives context with 5-10 memories
filtered by category. Integration test: dispatch security validation agent,
assert context includes memories tagged `#security` and not `#performance`.

**Integration**: New component SubAgentContextFactory, integrates with
ContextBuilder.buildValidationContext(), SubAgentDispatcher.

### Observability and Debugging

**FR-021**: System MUST emit loading-decision events for each memory with
fields: source (memory ID), decision (loaded/skipped/blocked), reason (priority
score, coverage threshold, token budget), tokens (estimated).

**FR-022**: System MUST log all events to .specify/logs/context-usage.jsonl
(existing log file) with structured JSON format.

**FR-023**: System MUST extend Memory panel UI to show "Last loaded" timestamp,
reason, and token count for each memory.

**FR-024**: System MUST display inline annotations in Claude Code chat when
memories are loaded (e.g., "Used 3 memories about validation") with expandable
list.

**FR-025**: System MUST provide CLI command `gofer.queryMemoryUsage` to analyze
memory loading patterns across pipeline stages.

**Validation**: Verify context-usage.jsonl contains loading-decision events with
all required fields. Integration test: trigger context build, read log, assert
events present.

**Integration**: Extends ContextUsageLogger.ts (lines 214-700), adds UI
components to Memory panel.

### Backward Compatibility and Migration

**FR-026**: System MUST load existing memories without L0/L1/L2 layers via
detail tier (full content) to ensure backward compatibility.

**FR-027**: System MUST support existing memory file formats (memories.jsonl,
memory-notes/{id}.md, archive.jsonl, constitution.md) without breaking changes.

**FR-028**: System MUST provide migration command
`gofer.migrateMemoriesToLayered` to add L0/L1/L2 layers to existing memories via
LLM summarization.

**FR-029**: System MUST maintain existing gofer:// URI paths after migration (no
breaking URI changes).

**FR-030**: System MUST preserve existing MemoryManager API surface (save, load,
search, prioritize) while adding new layered methods.

**Validation**: Verify pre-layered memories load correctly and produce same
retrieval results. Integration test: run migration, assert memories have new
layers, assert old queries still work.

**Integration**: Extends MemoryStorage.load() with fallback logic, adds
migration script to .specify/scripts/.

## Non-Functional Requirements

### Performance Requirements

**NFR-001**: Context token usage MUST stay below 50k tokens by pipeline stage 5
(target: 30-60% reduction from current 100-150k baseline).

**NFR-002**: Memory loading latency MUST stay below 500ms for 10 memories (L1
tier) to avoid blocking context build.

**NFR-003**: In-memory index MUST support up to 1000 memories with sub-100ms
search/filter operations.

**NFR-004**: Memory consolidation MUST complete within 5 seconds for 1000
memories to avoid blocking user workflow.

**NFR-005**: Sub-agent context injection MUST complete within 1 second per agent
to enable parallel dispatch of 6 validation agents.

### Quality Requirements

**NFR-006**: Validation rubric scores MUST improve to 95-100/100 range (up from
85-95/100 baseline) within 3 features using the memory system.

**NFR-007**: Engineering review issues MUST decrease to 0-5 per feature (down
from 5-15 baseline) within 3 features.

**NFR-008**: Repeated mistake rate MUST drop below 5% (down from ~20% baseline)
measured as percentage of issues flagged in previous features.

**NFR-009**: Sub-agent context accuracy MUST exceed 90% measured as percentage
of relevant context included in dispatch vs. total available relevant context.

**NFR-010**: Memory extraction accuracy MUST exceed 85% measured as percentage
of extracted patterns validated as useful by human review.

### Usability Requirements

**NFR-011**: Memory loading decisions MUST be observable via context-usage.jsonl
with clear rationale for each loaded/skipped memory.

**NFR-012**: Memory panel UI MUST update within 1 second after memory save/load
operations to provide responsive feedback.

**NFR-013**: gofer:// URIs MUST provide clear error messages with suggestions
when resolution fails (fuzzy match, list scopes).

**NFR-014**: Memory migration MUST be opt-in and non-destructive (original
memories preserved).

**NFR-015**: LLM extraction failures MUST not crash extension or block pipeline
execution (graceful degradation).

### Reliability Requirements

**NFR-016**: JSONL memory storage MUST handle corruption gracefully by skipping
corrupted lines and rebuilding index from valid lines.

**NFR-017**: Concurrent writes from 6 validation agents MUST complete without
data loss or index corruption (append-only JSONL + mutex-protected index).

**NFR-018**: Consolidation timer failures MUST log error and retry on next cycle
without crashing extension.

**NFR-019**: Memory saves MUST degrade gracefully when disk quota exceeded (log
warning, skip save, continue execution).

**NFR-020**: System MUST preserve at least 95% of memories during migration from
non-layered to layered format.

## Success Criteria

### Primary Success Metrics (Measurable Quality Improvement)

**SC-001**: Validation rubric scores average 95-100/100 across 6 categories
(correctness, standards, security, performance, integration, test-quality) for
features developed using Memory System v2, compared to 85-95/100 baseline.

**SC-002**: Engineering review issues decrease to 0-5 per feature (Red + Yellow
findings combined) compared to 5-15 per feature baseline.

**SC-003**: Context token usage at pipeline stage 5 stays below 50k tokens
(measured via ClaudeSessionReader) compared to 100-150k baseline, representing
50%+ reduction.

**SC-004**: Repeated mistake rate drops below 5% measured as: (count of issues
previously flagged / count of total issues) \* 100, compared to ~20% baseline.

**SC-005**: Sub-agent context accuracy exceeds 90% measured as: (relevant
context included / total relevant context available) \* 100 via manual audit of
10 sub-agent dispatches.

### Secondary Success Metrics (System Health)

**SC-006**: Memory consolidation completes successfully in >95% of scheduled
runs (30-minute intervals) without errors logged to output channel.

**SC-007**: Memory extraction from validation reports captures >85% of
Red/Yellow findings as validated by human review of 10 pipeline runs.

**SC-008**: Memory loading latency stays below 500ms for 10 memories (L1 tier)
in >99% of measurements via performance logging.

**SC-009**: Zero data loss during concurrent writes from 6 validation agents
validated by checking memories.jsonl integrity after 10 parallel validation
runs.

**SC-010**: gofer:// URI resolution success rate >98% for valid URIs measured
via URI resolver logs over 100 resolution attempts.

### User Adoption Metrics

**SC-011**: Developers query memory usage via `gofer.queryMemoryUsage` at least
once per feature to understand context loading patterns.

**SC-012**: Memory panel UI shows "Last loaded" information with >90% of
memories having non-null timestamps after 3 features.

**SC-013**: Inline memory annotations appear in Claude Code chat for >80% of
context builds that load memories.

**SC-014**: Migration command `gofer.migrateMemoriesToLayered` completes
successfully for >95% of existing memory collections.

**SC-015**: Zero user-reported incidents of memory corruption or data loss after
30 days of production use.

## Assumptions

### Technical Assumptions

**A-001**: TypeScript ecosystem is the target runtime (Node.js in VSCode
extension). No Python bridges or external processes required.

**A-002**: Git-friendly storage formats (JSONL, Markdown) are preferred over
binary formats for version control and human readability.

**A-003**: VSCode extension architecture with cross-process IPC via files
(extension host ↔ language server) remains unchanged.

**A-004**: Claude API (Anthropic) is available for LLM-based memory extraction
with acceptable latency (<2s) and cost (<$0.01 per extraction).

**A-005**: No external dependencies for embeddings or vector databases required
for MVP. TF-IDF + trigram similarity is sufficient for initial implementation.

### Performance Assumptions

**A-006**: In-memory index scales to ~1000 memories before requiring database or
pagination. This covers typical project scope (10-50 features \* 10-50 memories
per feature).

**A-007**: JSONL rebuild at startup is O(n) proportional to memory count and
completes in <2 seconds for 1000 memories.

**A-008**: Context bridge staleness window of 60 seconds is acceptable for
cross-process communication.

**A-009**: LLM consolidation cost of ~$0.001-0.01 per extraction is acceptable
for 30-minute consolidation cycles.

**A-010**: Sub-agent context injection adds 1-2 seconds to dispatch latency,
which is acceptable given improved quality.

### User Experience Assumptions

**A-011**: Developers understand YAML frontmatter and Markdown formats for
manual memory editing if needed.

**A-012**: Observable loading decisions via JSONL logs are sufficient for
debugging. UI visualization is nice-to-have for MVP.

**A-013**: Users prefer automatic extraction over manual updates to
tasks/lessons.md.

**A-014**: Validation warnings (non-blocking) are preferred over errors
(blocking) for memory quality issues.

**A-015**: gofer:// URI scheme is intuitive for developers familiar with file://
and http:// schemes.

### Backward Compatibility Assumptions

**A-016**: Existing memory files (memories.jsonl, memory-notes/{id}.md,
archive.jsonl) remain in current locations and formats.

**A-017**: Migration to layered memories is opt-in and non-destructive. Users
can continue using non-layered memories indefinitely.

**A-018**: Existing MemoryManager API consumers (ContextBuilder, MemoryCommands,
etc.) continue to work without code changes.

**A-019**: Sub-agent dispatch patterns (Task tool invocation) remain unchanged.
Memory injection is additive to existing parameters.

**A-020**: Constitution.md and hints.md remain separate files and are not
migrated to memory system.

## Dependencies

### Internal Component Dependencies

**D-001**: `extension/src/autonomous/MemoryManager.ts` (lines 223-938) - Core
CRUD, search, priority scoring. Extended with layered loading APIs.

**D-002**: `extension/src/autonomous/MemoryStorage.ts` (lines 61-62, 166-272) -
JSONL backend, dual storage. Extended with layer field support.

**D-003**: `extension/src/autonomous/MemoryLayerManager.ts` (lines 68-88) -
Three-tier access (core/recall/archival). Extended with L0/L1/L2 layer mapping.

**D-004**: `extension/src/autonomous/ContextBuilder.ts` (lines 721-1663) -
Stage-aware context assembly. Extended with sub-agent context factory.

**D-005**: `extension/src/autonomous/ContextUsageLogger.ts` (lines 214-700) -
JSONL event logging. Extended with memory loading decision events.

**D-006**: `extension/src/autonomous/SubAgentDispatcher.ts` (lines 54-273) -
Delegation recommendations. Integrated with SubAgentContextFactory.

**D-007**: `extension/src/autonomous/MemoryConsolidator.ts` (line 76) - Dedup,
compact, archive. Extended with LLM-based extraction.

**D-008**: `extension/src/autonomous/StageContextProfileLoader.ts` (line 66) -
Budget profiles. Extended with memory budget percentages.

**D-009**: `extension/src/autonomous/ObservationMasker.ts` (lines 25-150) -
Three-tier decay. Referenced for pattern consistency.

**D-010**: `extension/src/autonomous/CheckpointValidator.ts` (lines 19-110) -
Validation pattern (warnings-only). Applied to memory validation.

### Storage Location Dependencies

**D-011**: `.specify/memory/memories.jsonl` - Primary memory storage. Extended
with L0/L1/L2 fields in JSONL schema.

**D-012**: `.specify/memory/memory-notes/{id}.md` - Long memory content (>500
chars). Extended with YAML frontmatter for layers.

**D-013**: `.specify/memory/archive.jsonl` - Low-priority memories (>200 total).
No schema changes.

**D-014**: `.specify/memory/constitution.md` - Project principles. Referenced
but not modified.

**D-015**: `.specify/memory/checkpoints/` - Stage transitions (100+). Read for
consolidation extraction.

**D-016**: `.specify/logs/context-usage.jsonl` - Event log. Extended with memory
loading decision events.

**D-017**: `.specify/logs/pipeline.jsonl` - Stage completion log. Read for
consolidation extraction.

**D-018**: `.specify/specs/{feature}/validation-report.md` - Validation
findings. Read for pattern extraction.

**D-019**: `.specify/specs/{feature}/engineering-review-report.md` - Review
findings. Read for lesson extraction.

**D-020**: `~/.claude/projects/.../memory/` - User-scoped global memories.
Supported via gofer://user/ URIs.

### Command Dependencies

**D-021**: `.claude/commands/6_gofer_validate.md` (lines 136-150) - Validation
agent spawn. Extended with memory injection.

**D-022**: `.claude/commands/1_gofer_research.md` (lines 96-199) - Research
agent spawn. Extended with memory injection.

**D-023**: `.claude/commands/0_business_scenario.md` - Pipeline orchestrator.
Extended with memory consolidation trigger.

**D-024**: `.claude/agents/validation-*.md` - 6 validation agents. Extended with
memory context sections in prompts.

**D-025**: `.claude/agents/codebase-*.md` - 3 research agents. Extended with
memory context sections in prompts.

### External API Dependencies

**D-026**: Claude API (Anthropic) - LLM calls for memory extraction. Required
for automatic consolidation. Haiku model for cost-effectiveness.

**D-027**: VSCode Extension API - `globalState` for cross-workspace memories,
`workspace.getConfiguration` for settings, `window.showInformationMessage` for
notifications.

**D-028**: Node.js File System API - `fs.promises` for async JSONL read/write,
atomic file operations (temp + rename pattern).

**D-029**: TF-IDF library (existing) - Keyword extraction for coverage
calculation. No new dependency.

**D-030**: Trigram similarity (existing) - Fuzzy keyword matching. No new
dependency.

## Out of Scope

### Explicitly Excluded

**OOS-001**: Python bridges or external processes. Memory System v2 is
TypeScript-only to maintain simplicity and avoid cross-language complexity.

**OOS-002**: External vector databases (Pinecone, Weaviate, Chroma). TF-IDF +
trigram similarity is sufficient for MVP. Embeddings deferred to future
enhancement.

**OOS-003**: Full OpenViking integration as external dependency. Patterns are
adopted but implemented natively in TypeScript.

**OOS-004**: Real-time sync of memories to cloud storage. System remains
local-first for privacy and simplicity.

**OOS-005**: Multi-user collaboration on shared memory. Each workspace has
isolated memory scope.

### Deferred to Future Enhancements

**OOS-006**: Knowledge graph for entity relationships (Neo4j or lightweight
alternative). Deferred to v3 - Advanced.

**OOS-007**: Temporal queries ("memories about authentication in last 30 days").
Deferred to v3 - Advanced.

**OOS-008**: Multi-provider memory extraction (OpenAI, local models). Claude API
only for MVP. Multi-provider via LLM Council deferred to v2 - Enhanced.

**OOS-009**: Adaptive importance weighting via reinforcement learning. Current
formula (usage _ 0.4 + recency _ 0.35 + age \* 0.25) is static. Learning-based
weighting deferred to v3.

**OOS-010**: Sub-agent dispatch architecture migration (fresh 200k context per
stage). Mentioned in research as future improvement. Not part of Memory System
v2 scope.

### Clarified Non-Goals

**OOS-011**: Replacing existing constitution.md or hints.md with memory system.
These remain separate, complementary resources.

**OOS-012**: Automatic detection of all possible patterns. Extraction focuses on
validation findings, engineering review issues, and explicit pattern markers.
Exhaustive pattern mining is non-goal.

**OOS-013**: 100% backward compatibility for experimental features. Existing
MemoryManager API is preserved, but experimental features (e.g., observation
masking) may have breaking changes.

**OOS-014**: Zero-config operation. Users may need to configure coverage
thresholds, memory budgets, and consolidation intervals for optimal results.

**OOS-015**: Guaranteed deterministic retrieval. Keyword-based search is
inherently fuzzy. Exact reproducibility of retrieval results is not guaranteed
across LLM versions or keyword extraction changes.

## Glossary

### Memory System Concepts

**L0 Layer (Abstract)**: One-sentence summary of memory (~100 tokens). Always
loaded for quick scanning. Example: "Authentication uses JWT tokens with 24-hour
expiration."

**L1 Layer (Overview)**: Key points and navigation information (~2k tokens).
Loaded when relevance signal present (>30% keyword coverage). Example:
"Authentication implementation:\n- JWT tokens stored in HTTP-only cookies\n-
Token refresh via /auth/refresh endpoint\n- Session persistence in Redis\n-
Logout clears both cookie and Redis entry"

**L2 Layer (Detail)**: Full memory content (unlimited tokens). Lazy-loaded only
on explicit request or when memory is primary context. Includes all citations,
code examples, related memories.

**gofer:// URI**: Uniform Resource Identifier scheme for addressing memory and
spec artifacts. Format: `gofer://{scope}/{path}`. Provides semantic addressing
independent of filesystem layout.

**Scope**: Top-level namespace in gofer:// URIs. Valid scopes: `specs` (feature
specifications), `memory` (project memories), `agent` (learned patterns),
`session` (active session state), `user` (cross-workspace preferences).

**Priority Score**: Weighted score for memory importance. Formula: (usageScore _
0.4) + (recencyScore _ 0.35) + (ageBonus \* 0.25). Range: 0-100. Used for
retrieval ranking.

**Coverage**: Percentage of task keywords matched by memories. Calculation:
(matched keywords / total keywords) \* 100 using trigram similarity (threshold
0.3). Used to decide whether to load research docs.

**Memory Category**: Classification of memory type. Values:
`validation_pattern`, `lesson`, `codebase_pattern`, `decision`,
`user_preference`, `task_context`, `observation`.

**Memory Type**: Cognitive classification. Values: `procedural` (how-to
patterns), `episodic` (past events), `semantic` (facts and concepts),
`prospective` (future intentions).

**Consolidation**: Background process running at 30-minute intervals. Actions:
deduplication, archival of low-priority memories, LLM-based extraction from
logs, importance score updates.

### Agent System Concepts

**Sub-Agent**: Isolated Claude Code Task with fresh 200k context. Types:
validation agents (6), research agents (3), multi-perspective agents (variable).
Receive pre-built context from parent agent.

**Validation Agent**: Specialized sub-agent for evaluating feature quality.
Categories: correctness, standards, security, performance, integration,
test-quality. Produce structured markdown reports (<2000 tokens).

**Research Agent**: Sub-agent for codebase exploration. Types: codebase-locator
(Haiku), codebase-analyzer (Sonnet), codebase-pattern-finder (Haiku). Produce
research findings with integration points.

**Multi-Perspective Agent**: Sub-agent for divergent analysis. Examples:
architecture-diverger, refactor-rewrite-advisor, bug-triangulator. Used for
complex problem-solving.

**Main Pipeline Agent**: Primary agent executing 7-stage pipeline: research →
specify → plan → tasks → implement → validate → engineering-review. Operates in
single Claude Code session (auto-chain architecture).

**Context Injection**: Process of passing pre-built context sections to
sub-agents during Task dispatch. Includes: memories, spec abstracts, past
patterns, validation criteria.

**Write-Back**: Process of extracting memories from sub-agent results and saving
to MemoryManager after sub-agent completion.

### Technical Components

**MemoryManager**: Core component (1100+ LOC) providing CRUD operations, search,
priority scoring, related memory linking. Located:
`extension/src/autonomous/MemoryManager.ts`.

**ContextBuilder**: Context assembly component (1663 LOC) with stage-aware
loading, memory-first pattern, coverage calculation. Located:
`extension/src/autonomous/ContextBuilder.ts`.

**MemoryLayerManager**: Three-tier access manager (94 LOC) implementing
core/recall/archival separation (MemGPT-inspired). Located:
`extension/src/autonomous/MemoryLayerManager.ts`.

**SubAgentDispatcher**: Delegation coordinator (273 LOC) with
utilization-triggered recommendations, token budget enforcement, result
truncation. Located: `extension/src/autonomous/SubAgentDispatcher.ts`.

**SubAgentContextFactory**: New component for generating targeted context
sections for sub-agents. Filters memories by category, applies token budgets,
formats as markdown.

**MemoryStorage**: JSONL backend (400+ LOC) with hash-based IDs, atomic writes
(temp + rename), dual storage (JSONL + markdown). Located:
`extension/src/autonomous/MemoryStorage.ts`.

## Research Traceability

### Problem Statement → Overview

| Discovery Pain Point                            | Spec Section                               | Research Reference                                                         |
| ----------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| Context Window Inefficiency (100-150k tokens)   | Overview motivation, FR-001 tiered loading | research.md lines 742-792 (token growth quantification)                    |
| Knowledge Loss Across Sessions (~20% repeated)  | Overview motivation, US-P1-02 extraction   | research.md lines 487-542 (automatic extraction pattern)                   |
| Memory Fragmentation (multiple locations)       | Overview motivation, FR-002 gofer:// URIs  | research.md lines 64-75 (storage locations), 446-480 (URI abstraction)     |
| Poor Sub-Agent Memory Handoff (file paths only) | Overview motivation, US-P1-01 injection    | research.md lines 79-108 (sub-agent patterns), 799-850 (priority analysis) |

### Target Users → User Stories

| Discovery User Type          | User Stories                               | Research Integration Point                                           |
| ---------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| Main Pipeline Agents         | US-P2-02 coverage, US-P3-04 stage profiles | research.md lines 341-370 (stage profiles)                           |
| Validation Sub-Agents        | US-P1-01 injection, US-P1-02 extraction    | research.md lines 79-95 (validation agents), 813-850 (memory access) |
| Multi-Perspective Sub-Agents | US-P2-01 research memory access            | research.md lines 96-108 (research agents), 851-895 (write-back)     |
| Future Sessions / Developers | US-P2-04 observable loading, FR-021-025    | research.md lines 283-308 (observable pattern)                       |

### Success Metrics → Success Criteria

| Discovery Metric                 | Success Criteria            | Research Evidence                                                              |
| -------------------------------- | --------------------------- | ------------------------------------------------------------------------------ |
| Validation Rubric 85-95 → 95-100 | SC-001 average 95-100/100   | research.md lines 1126-1133 (v1 expected 5-10% improvement)                    |
| Engineering Review 5-15 → 0-5    | SC-002 decrease to 0-5      | research.md lines 1146-1149 (v2 measurable reduction)                          |
| Context Tokens 100-150k → <50k   | SC-003 below 50k at stage 5 | research.md lines 742-792 (growth rate analysis), 1126-1133 (30-40% reduction) |
| Repeated Mistakes ~20% → <5%     | SC-004 below 5%             | research.md lines 1162-1167 (v3 near-zero target)                              |
| Sub-Agent Context Unknown → >90% | SC-005 exceed 90% accuracy  | research.md lines 851-895 (write-back priority high)                           |

### Competitive Analysis → Technical Decisions

| Discovery Research Target  | Spec Implementation                          | Research Findings                                                                          |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| OpenViking                 | FR-001 L0/L1/L2 layers, FR-002 gofer:// URIs | research.md lines 32-46 (91-96% reduction), 419-438 (tiered loading), 446-480 (URI design) |
| MemGPT/Letta               | FR-003 three-tier architecture               | research.md lines 199-230 (MemGPT pattern), 1173-1176 (applicability)                      |
| LangChain Memory           | NFR-010 transient/durable separation         | research.md lines 1180-1185 (buffer + summary pattern)                                     |
| Anthropic Extended Context | FR-004 coverage calculation, memory-first    | research.md lines 1203-1210 (best practices), 116-139 (memory-first pattern)               |

### Research Integration Points → Dependencies

| Research Component            | Dependency                        | Research Reference                                               |
| ----------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| MemoryManager CRUD            | D-001 extended layered APIs       | research.md lines 54-62, 223-938                                 |
| ContextBuilder assembly       | D-004 sub-agent context factory   | research.md lines 59, 721-1663                                   |
| MemoryLayerManager 3-tier     | D-003 L0/L1/L2 mapping            | research.md lines 58, 68-88, 199-230                             |
| SubAgentDispatcher delegation | D-006 context factory integration | research.md lines 61, 54-273, 231-276                            |
| MemoryConsolidator background | D-007 LLM extraction              | research.md lines 666-708 (timer pattern), 487-542 (extraction)  |
| Validation agent spawn        | D-021 memory injection            | research.md lines 79-95 (current pattern), 813-850 (enhanced)    |
| Research agent spawn          | D-022 memory injection            | research.md lines 96-108 (current pattern), 851-895 (write-back) |

### Research Constraints → Assumptions

| Research Constraint           | Assumption                         | Research Reference                                           |
| ----------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| TypeScript ecosystem          | A-001 no Python bridges            | research.md lines 712-720, 1029-1043 (full integration cons) |
| Git-friendly storage          | A-002 JSONL/Markdown preferred     | research.md lines 64-75 (storage locations), 712             |
| VSCode extension architecture | A-003 cross-process IPC via files  | research.md lines 171-194 (context bridge), 714              |
| No external dependencies      | A-005 TF-IDF sufficient for MVP    | research.md lines 717, 1091-1100 (embedding question)        |
| Backward compatibility        | A-016-020 existing files unchanged | research.md lines 719 (constraint)                           |

### Research Technology Analysis → Out of Scope

| Research Finding             | Out of Scope Item           | Research Reference                                                                |
| ---------------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| OpenViking Python SDK        | OOS-001 no Python bridges   | research.md lines 1036-1039 (cons: complexity)                                    |
| Voyage AI embeddings         | OOS-002 no vector databases | research.md lines 1037 (embedding model setup), 1091-1100                         |
| Full OpenViking integration  | OOS-003 patterns only       | research.md lines 1029-1043 (recommendation: adopt patterns not full integration) |
| Knowledge graph (Neo4j)      | OOS-006 deferred to v3      | research.md lines 1154-1167 (long-term roadmap)                                   |
| Sub-agent dispatch migration | OOS-010 not this scope      | research.md lines 28-29 (planned improvement), 773-792 (root cause)               |

### Research Open Questions → Functional Requirements

| Research Question                  | Specification Answer                                 | Research Reference                                              |
| ---------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| Q1: LLM Provider for extraction    | FR-011 Claude Haiku, D-026 Anthropic API             | research.md lines 1051-1059 (recommendation: Claude API)        |
| Q2: Memory visibility in UI        | FR-023-024 Memory panel + inline annotations         | research.md lines 1061-1073 (recommendation: A + D)             |
| Q3: Memory sharing across features | FR-004 hybrid (core global, feature-scoped archival) | research.md lines 1075-1086 (recommendation: Option C)          |
| Q4: Embedding model                | FR-004-005 TF-IDF only for MVP                       | research.md lines 1091-1100 (recommendation: start with TF-IDF) |
| Q5: Memory expiration policy       | NFR-016-019 never delete (archive only)              | research.md lines 1103-1113 (recommendation: Option A)          |

---

**Total Coverage**: 30 research findings → 30 spec sections (100% traceability)

**Integration Points Addressed**: 10/10 from research.md section 2 **Constraints
Addressed**: 5/5 from research.md section 5 **Open Questions Resolved**: 5/5
from research.md section 9
