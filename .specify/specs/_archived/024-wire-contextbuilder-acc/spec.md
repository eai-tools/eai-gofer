---
id: "024-wire-contextbuilder-acc"
title: "Wire ContextBuilder + Adaptive Context Compaction (ACC)"
status: "complete"
created: "2026-03-11T03:00:00Z"
updated: "2026-03-27"
priority: "medium"
assignee: "engineer-agent"
---

# Wire ContextBuilder + Adaptive Context Compaction (ACC)

## Overview

The Gofer extension contains ~3,700 lines of fully-implemented context
management code that is entirely dead. ContextBuilder, ObservationMasker,
StageContextProfileLoader, MemoryLayerManager, and SubAgentDispatcher were built
for features 011 and 017 but never wired into the running extension. The root
cause is a single missing function call: `setSharedContextBuilder()` in
`autonomousCommands.ts:52` is never invoked.

This feature wires the existing dead code into the extension lifecycle, then
adds a new 5-stage Adaptive Context Compaction (ACC) orchestrator that
progressively reduces context utilization at 70/80/85/90/99% thresholds. ACC is
informed by the OpenDev paper (arXiv 2603.05344), which demonstrated ~54% peak
context reduction using graduated compaction stages.

**Research Reference**: See `research.md` for comprehensive codebase analysis,
industry validation, and integration points.

## User Stories

### US1: Context-Aware Observation Masking (P1)

**As a** developer running autonomous Gofer sessions, **I want** tool outputs
(file reads, command results, test output) to automatically decay from full
content to key-points to masked placeholders as they age, **So that** my context
window stays focused on recent, relevant information instead of filling up with
stale tool outputs.

**Why this priority**: This is the core value proposition. Without observation
masking, autonomous sessions accumulate tool outputs until the context window
fills and the session must be terminated. Masking extends effective session
length by 2-3x.

**Independent Test**: Run an autonomous session with 10+ tool invocations.
Verify older observations are masked while recent ones remain fully visible.

**Acceptance Criteria**:

- [ ] Observations older than the configured threshold (default: 10 turns) are
      masked to placeholders
- [ ] Observations in the intermediate window show key-points only (extracted
      summaries)
- [ ] Error messages and stack traces are never masked (preserved regardless of
      age)
- [ ] Masking respects per-type decay rates (test output decays slower than
      search results)
- [ ] Observation cache persists to disk on extension deactivation and restores
      on reactivation

---

### US2: Stage-Aware Context Budgets (P1)

**As a** developer using the Gofer pipeline, **I want** context budget
allocation to automatically adjust based on which pipeline stage is active
(research, specify, plan, implement, test, validate), **So that** each stage
gets the right mix of research, memory, and code context without manual tuning.

**Why this priority**: Stage-aware budgets are foundational - they determine how
ContextBuilder allocates the token budget across sections. Without this, all
stages get the same generic allocation.

**Independent Test**: Switch between pipeline stages and verify that
research-heavy stages allocate more tokens to research chunks while
implementation stages allocate more to code context.

**Acceptance Criteria**:

- [ ] ContextBuilder loads stage-specific profiles from `context-profiles.yaml`
      (or falls back to hardcoded defaults)
- [ ] Research stage allocates 40% to research, 20% to memory, 10% to code
- [ ] Implement stage allocates 10% to research, 20% to memory, 40% to code
- [ ] Profiles are validated (budgets sum to <= 1.0, all non-negative)
- [ ] Budget enforcement mode is configurable: advisory (warn), truncate (trim),
      or blocking (reject)

---

### US3: Progressive Context Compaction at Thresholds (P2)

**As a** developer in long autonomous sessions, **I want** the extension to
automatically apply progressively stronger context reduction as utilization
increases (70% -> 80% -> 85% -> 90% -> 99%), **So that** my session can continue
working productively without hitting the context limit and requiring manual
intervention.

**Why this priority**: ACC extends session viability beyond what observation
masking alone achieves. It's the graduated response that prevents hard
context-full stops.

**Independent Test**: Simulate context utilization increasing through each
threshold and verify the appropriate compaction action fires at each stage.

**Acceptance Criteria**:

- [ ] Stage 1 (70%): Log warning and inject delegation advisory recommending
      sub-agent delegation
- [ ] Stage 2 (80%): Activate observation masking - force all observations
      through 3-tier decay with reduced thresholds
- [ ] Stage 3 (85%): Fast-prune low-priority context sections via ContextBuilder
      budget enforcement (truncate mode)
- [ ] Stage 4 (90%): Aggressive masking - force all observations to masked tier,
      fold low-priority sections
- [ ] Stage 5 (99%): Trigger full LLM compaction via ContextCompactor to
      summarize the entire session
- [ ] Each stage has a cooldown period to prevent rapid re-triggering (minimum
      30 seconds between same-stage actions)
- [ ] ACC actions do not interfere with existing AutoHandoffTrigger behavior
      (auto-save at 65%, critical at 70%)

---

### US4: Sub-Agent Delegation Advisory (P2)

**As a** developer in a high-utilization session, **I want** the system to
recommend delegating specific task types to sub-agents when context utilization
is high, **So that** I can proactively offload work to fresh context windows
before hitting compaction stages.

**Why this priority**: Delegation is the least lossy way to manage context - it
moves work to fresh windows rather than compressing existing context.

**Independent Test**: Set context utilization above 50% and verify a delegation
advisory appears in the context recommending specific agent types for
appropriate tasks.

**Acceptance Criteria**:

- [ ] At 50% utilization: advisory recommending codebase-locator for file search
- [ ] At 60% utilization: warning recommending codebase-analyzer for code
      analysis
- [ ] At 70% utilization: blocking recommendation requiring delegation before
      deep exploration
- [ ] Advisory appears as a markdown section injected into the built context
- [ ] Sub-agent result truncation applies token budgets per agent type
      (2000/1500/1000 tokens)

---

### US5: Layered Memory with Demotion (P3)

**As a** developer working on long-running features across sessions, **I want**
memories organized into core (always loaded), recall (recent), and archival
(searchable) layers following the MemGPT pattern, **So that** my context always
contains the most relevant memories without wasting budget on stale ones.

**Why this priority**: Layered memory is an enhancement over flat memory
loading. It provides better relevance but requires the base wiring (US1/US2) to
be in place first.

**Independent Test**: Create tagged memories, verify core memories always load,
recall memories are recent-only, and archival memories require explicit search.

**Acceptance Criteria**:

- [ ] Core layer: memories tagged `#task-context`, `#key-decision`, or `#core`
      always load
- [ ] Recall layer: memories from the last hour, limited to 20 entries
- [ ] Archival layer: accessible via keyword search only
- [ ] Demotion runs when recall exceeds limit (priority-based by default,
      LLM-scored if provider available)
- [ ] Layered mode is togglable via `gofer.useLayeredMemory` setting (default:
      false)
- [ ] Config changes take effect at runtime without window reload

---

### US6: Runtime Configuration Reloads (P3)

**As a** developer customizing Gofer behavior, **I want** configuration changes
to observation patterns and layered memory to take effect immediately, **So
that** I don't have to reload the VSCode window after changing settings.

**Why this priority**: Quality-of-life improvement. Currently,
`gofer.observationPreservePatterns` and `gofer.useLayeredMemory` config changes
are silently ignored because the config reload handlers early-return on null
builder.

**Independent Test**: Change `gofer.observationPreservePatterns` in settings
while an autonomous session is running. Verify the new patterns take effect
immediately.

**Acceptance Criteria**:

- [ ] Changing `gofer.observationPreservePatterns` updates ObservationMasker's
      preserve patterns at runtime
- [ ] Changing `gofer.useLayeredMemory` toggles between flat and layered memory
      loading at runtime
- [ ] No window reload required for either setting
- [ ] Invalid patterns are logged as warnings but don't crash the extension

---

### Edge Cases

- What happens when ContextBuilder is created but MemoryManager has no memories?
  (Empty context should build successfully with zero-token memory section)
- What happens when ACC stage 5 fires but no LLM provider is configured? (Should
  skip LLM compaction and log a warning, not crash)
- What happens when the context-profiles.yaml is malformed? (Fall back to
  hardcoded defaults, log validation warnings)
- What happens when multiple ACC stages fire in rapid succession? (Cooldown
  prevents re-triggering; higher stages supersede lower ones)
- What happens during extension reinitialization? (Dispose old ContextBuilder,
  flush observation cache, create new instance)
- What happens when ObservationMasker's cache file is corrupted? (Clear cache
  and start fresh, log warning)

## Requirements

### Functional Requirements

- **FR-001**: System MUST call `setSharedContextBuilder()` during workspace
  initialization, after MemoryManager is created
- **FR-002**: System MUST assign `StateManager.sharedContextBuilder` to the
  created ContextBuilder instance
- **FR-003**: System MUST pass `sharedContextBuilder` in
  `EventHandlerDependencies` before calling `registerAll()`
- **FR-004**: System MUST call `AutoHandoffTrigger.setContextBuilder()` with the
  shared instance
- **FR-005**: System MUST dispose the shared ContextBuilder during extension
  reinitialization (flush cache, clear reference)
- **FR-006**: System MUST re-create the shared ContextBuilder during extension
  reinitialization (new instance after disposal)
- **FR-007**: System MUST create an ACCOrchestrator that connects to
  ContextHealthMonitor using the `connect()` pattern
- **FR-008**: ACCOrchestrator MUST fire graduated actions at 70%, 80%, 85%, 90%,
  and 99% utilization thresholds
- **FR-009**: ACCOrchestrator MUST coexist with AutoHandoffTrigger without
  interfering with existing auto-save (65%) and critical (70%) behavior
- **FR-010**: ContextHealthMonitor MUST emit events for the new ACC thresholds
  (80%, 85%, 90%, 99%)
- **FR-011**: System MUST wire SubAgentDispatcher to receive utilization updates
  from ContextHealthMonitor
- **FR-012**: ObservationMasker cache MUST be flushed to disk on extension
  deactivation (already implemented in DisposalService, will auto-activate)
- **FR-013**: Terminal observation tracking MUST activate when
  sharedContextBuilder is set (dead path at `autonomousCommands.ts:1008` will
  auto-activate)
- **FR-014**: KnowledgeGraph save MUST activate on session close when
  sharedContextBuilder is set (dead path at `autonomousCommands.ts:1117` will
  auto-activate)
- **FR-015**: ContextBridgeWriter integration MUST activate when
  sharedContextBuilder is set (dead path at `autonomousCommands.ts:939` will
  auto-activate)

### Key Entities

- **ContextBuilder**: Stage-aware context assembler that merges memories,
  research, hints, observations, and code into a token-budgeted context
  document. Extension-lifetime shared instance + session-lifetime private
  instance in AutonomousDriver.
- **ACCOrchestrator** (new): Thin orchestration layer that connects to
  ContextHealthMonitor events and delegates compaction actions to existing
  components (ObservationMasker, ContextBuilder, ContextCompactor,
  SubAgentDispatcher).
- **ObservationMasker**: Three-tier decay engine (full -> key-points -> masked)
  for tool outputs. Persists cache to disk for cross-session continuity.
- **StageContextProfile**: Per-stage budget allocation (research%, memory%,
  code%, observation window) loaded from YAML or hardcoded defaults.
- **MemoryLayerManager**: MemGPT 3-layer memory organizer (core/recall/archival)
  with demotion logic.
- **SubAgentDispatcher**: Utilization-aware delegation advisor that injects
  markdown recommendations into built context.

## Non-Functional Requirements

### Performance

- ContextBuilder's `buildContext()` must complete within 500ms for typical
  context sizes (< 100 memories, < 50 observations)
- ObservationMasker's `maskOldObservations()` must complete within 50ms for up
  to 100 observations
- ACC stage transitions must complete within 100ms (excluding LLM compaction at
  stage 5)
- ContextHealthMonitor's adaptive polling (2s at 50%+, 5s below) must not be
  affected by ACC orchestration

### Reliability

- All ACC stages must be non-fatal: failures are logged as warnings and the
  session continues
- ContextBridgeWriter, observation tracking, and KnowledgeGraph save failures
  must be non-fatal (preserving existing patterns at
  `autonomousCommands.ts:964-971`)
- ObservationMasker cache corruption must result in cache clear + fresh start,
  not a crash
- Missing `context-profiles.yaml` must fall back to hardcoded defaults without
  error

### Compatibility

- Existing AutoHandoffTrigger behavior (auto-save at 65%, critical at 70%) must
  remain unchanged
- The AutonomousDriver's private ContextBuilder instance must continue to
  function independently
- All existing VSCode settings must continue to work as documented
- Extension activation sequence must not be affected (reflect-metadata first
  import constraint preserved)

## Success Criteria

| Metric                      | Target                                                         | Measurement                                                                     |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Dead code activation        | 100% of ~3,700 LOC activated                                   | All conditional guards (`if (sharedContextBuilder)`) execute the non-null path  |
| Observation masking         | Observations older than threshold show key-points or masked    | Unit test: track 15 observations, advance 12 turns, verify tier distribution    |
| Stage budget compliance     | Context sections stay within stage-specific budget allocations | Unit test: build context with known inputs, verify section token estimates      |
| ACC stage progression       | All 5 stages fire at correct thresholds                        | Unit test: simulate utilization ramp from 0% to 100%, verify stage actions      |
| Existing behavior preserved | AutoHandoffTrigger unchanged                                   | Regression test: verify auto-save at 65%, critical at 70% still fires           |
| Runtime config reload       | Settings changes apply without window reload                   | Integration test: change config, verify ObservationMasker updates               |
| Test coverage               | New tests for all wired components                             | Minimum: ACCOrchestrator, ContextBuilder, ObservationMasker, wiring integration |

## Assumptions

- MemoryManager is always created before the shared ContextBuilder in
  `initializeForWorkspace()` (current initialization order supports this)
- ContextHealthMonitor is the single source of truth for context utilization (no
  parallel polling needed)
- Token estimation using chars/4 is sufficient for threshold triggering (exact
  tiktoken counts are not in scope)
- The AutonomousDriver's private ContextBuilder and the shared ContextBuilder
  have different lifecycles and should remain separate instances
- `context-profiles.yaml` is optional - hardcoded defaults are sufficient for
  initial deployment
- LLM provider for ObservationMasker summarization and MemoryLayerManager
  demotion scoring is optional (both have non-LLM fallbacks)
- PTY interactions remain fragile and ACC should never write directly to the PTY
  (delegate to AutoHandoffTrigger)
- Auto-save event must fire before critical event in ContextHealthMonitor
  (existing ordering constraint preserved)
- Extension reinitialization must dispose old ContextBuilder before creating new
  one (prevents memory leak per v1.12.3 fix pattern)

## Dependencies

- **ContextHealthMonitor** (live): ACC orchestrator connects to its event
  system. Must be extended with new events for 80/85/90/99% thresholds.
- **AutoHandoffTrigger** (live): Must receive the shared ContextBuilder via
  `setContextBuilder()`. Must coexist with ACC orchestrator.
- **StateManager** (live): Must store the shared ContextBuilder reference.
  Already has property and getter/setter.
- **EventHandlers** (live): Must receive `sharedContextBuilder` in dependencies.
  Already has config reload handlers that will auto-activate.
- **DisposalService** (live): Already handles ObservationMasker cache flush.
  Will auto-activate when builder is non-null.
- **MemoryManager** (live): Required constructor parameter for ContextBuilder.
- **AutonomousDriver** (live): Private ContextBuilder instance is unchanged. No
  modifications needed.
- **ContextCompactor** (live via AutonomousDriver): ACC stage 5 reuses the
  existing ContextCompactor for LLM summarization.

## Out of Scope

- Replacing the AutonomousDriver's private ContextBuilder with the shared
  instance (different lifecycles)
- Implementing exact tiktoken-based token counting (chars/4 approximation is
  sufficient)
- Auto-creating `context-profiles.yaml` on first run (hardcoded defaults are the
  fallback)
- Implementing a new LLM compaction engine (ACC stage 5 reuses existing
  ContextCompactor)
- Adding a UI for ACC stage visualization (logging and status bar updates only)
- Modifying the save/clear/resume PTY workflow in AutoHandoffTrigger
- Implementing ContextFolder (referenced in research as stage 4 enhancement,
  deferred)

## Glossary

| Term                | Definition                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| ACC                 | Adaptive Context Compaction - 5-stage progressive context reduction system                                  |
| Observation         | A recorded tool output (file read, command result, test output, search result) tracked by ObservationMasker |
| Masking             | The process of replacing old observation content with abbreviated summaries or placeholders                 |
| Three-tier decay    | Full content -> key-points summary -> masked placeholder, based on observation age in turns                 |
| Stage profile       | Per-pipeline-stage budget allocation (research%, memory%, code%, observation window)                        |
| Core memory         | MemGPT layer: always-loaded memories tagged with `#task-context`, `#key-decision`, or `#core`               |
| Recall memory       | MemGPT layer: recent memories within a time window (default: 1 hour)                                        |
| Archival memory     | MemGPT layer: long-term storage accessible only via explicit keyword search                                 |
| Delegation advisory | A markdown section injected into built context recommending sub-agent delegation at high utilization        |
| Context utilization | Percentage of the model's context window currently in use (estimated as chars/4)                            |

## Research Traceability

| Research Finding                                     | Spec Section                   | Reference                                                         |
| ---------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| Root cause: `setSharedContextBuilder()` never called | FR-001, FR-002                 | research.md: "The Root Cause"                                     |
| ContextHealthMonitor event system                    | FR-007, FR-010                 | research.md: "Pattern 1: ContextHealthMonitor Event System"       |
| AutoHandoffTrigger connect() pattern                 | FR-007, FR-009                 | research.md: "Pattern 2: AutoHandoffTrigger Connect Pattern"      |
| AutonomousDriver private ContextBuilder              | Assumptions, Out of Scope      | research.md: "Pattern 3: AutonomousDriver Private ContextBuilder" |
| InitializeForWorkspace creation point                | FR-001, Assumptions            | research.md: "Pattern 4: InitializeForWorkspace Pattern"          |
| 5-stage ACC thresholds                               | US3, FR-008                    | research.md: "Decision 1: 5-Stage ACC Thresholds"                 |
| ACC stage actions                                    | US3 acceptance criteria        | research.md: "Decision 2: ACC Stage Actions"                      |
| ACCOrchestrator architecture                         | FR-007                         | research.md: "Decision 3: Orchestrator Architecture"              |
| Shared vs private ContextBuilder                     | Assumptions                    | research.md: "Decision 4: Shared vs Private ContextBuilder"       |
| Threshold adjustments                                | FR-010                         | research.md: "Decision 5: Threshold Adjustments"                  |
| Event ordering constraint                            | Assumptions, NFR/Compatibility | research.md: "Event ordering matters"                             |
| PTY fragility                                        | Assumptions, Out of Scope      | research.md: "PTY interaction is fragile"                         |
| Token estimation chars/4                             | Assumptions, Out of Scope      | research.md: "Token estimation uses chars/4"                      |
| Extension lifecycle                                  | FR-005, FR-006, Assumptions    | research.md: "Brownfield Analysis: Extension lifecycle"           |
| Zero test coverage                                   | Success Criteria               | research.md: "No tests exist"                                     |
| EventHandlers dead guards                            | FR-003, US6                    | research.md: "Wiring Gap Inventory"                               |
| DisposalService cleanup                              | FR-012                         | research.md: "Wiring Gap Inventory"                               |
| Terminal observation tracking                        | FR-013                         | research.md: "Wiring Gap Inventory"                               |
| KnowledgeGraph save                                  | FR-014                         | research.md: "Wiring Gap Inventory"                               |
| ContextBridgeWriter                                  | FR-015                         | research.md: "Wiring Gap Inventory"                               |
| OpenDev paper validation                             | Overview                       | research.md: "Industry Validation"                                |
| MemGPT 3-layer architecture                          | US5                            | research.md: "Codified Context Infrastructure"                    |
