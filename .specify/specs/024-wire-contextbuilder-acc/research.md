---
date: 2026-03-11T02:00:00Z
researcher: Claude
feature: 'Wire ContextBuilder + Adaptive Context Compaction'
status: complete
---

# Research: Wire ContextBuilder + Adaptive Context Compaction (ACC)

## Feature Summary

Wire the existing dead code (~3,700 LOC) -- ContextBuilder, ObservationMasker, StageContextProfileLoader, MemoryLayerManager, SubAgentDispatcher -- into the running extension. Then implement 5-stage Adaptive Context Compaction (ACC) inspired by the OpenDev paper (arXiv 2603.05344), providing progressive context reduction at 70/80/85/90/99% utilization thresholds.

## Codebase Analysis

### Where to Implement

| Component | Location | Purpose |
|-----------|----------|---------|
| ContextBuilder (shared) | `extension/src/autonomous/ContextBuilder.ts` (~1,643 LOC) | Stage-aware context merging with budget enforcement |
| ObservationMasker | `extension/src/autonomous/ObservationMasker.ts` (~1,215 LOC) | Three-tier decay: full -> key-points -> masked |
| StageContextProfileLoader | `extension/src/autonomous/StageContextProfileLoader.ts` (~373 LOC) | Per-stage budget profiles from YAML |
| MemoryLayerManager | `extension/src/autonomous/MemoryLayerManager.ts` (~335 LOC) | MemGPT 3-layer: core/recall/archival |
| SubAgentDispatcher | `extension/src/autonomous/SubAgentDispatcher.ts` (~273 LOC) | Delegation advisory at utilization thresholds |
| Wiring entry point | `extension/src/autonomousCommands.ts:52-55` | `setSharedContextBuilder()` - defined, never called |
| State holder | `extension/src/services/StateManager.ts:74` | `_sharedContextBuilder` property |
| Event guards | `extension/src/services/EventHandlers.ts:215,245` | Early-return guards on null builder |
| Health monitor | `extension/src/autonomous/ContextHealthMonitor.ts` (~785 LOC) | LIVE - emits 6 events, adaptive polling |
| Auto-handoff | `extension/src/autonomous/AutoHandoffTrigger.ts` | LIVE - save/clear/resume at 65%/70% |
| ACC orchestrator | NEW: `extension/src/autonomous/ACCOrchestrator.ts` | Progressive 5-stage compaction controller |

### The Root Cause: One Missing Call

The entire ~3,700 LOC dead code problem traces to a single missing function call:

```
setSharedContextBuilder() in autonomousCommands.ts:52 is NEVER CALLED
```

This means:
- `state.sharedContextBuilder` in StateManager is always undefined
- EventHandlers.ts guards at lines 215 and 245 always early-return
- AutonomousCommands.ts conditionals at lines 939, 1008, 1117 never execute
- DisposalService.ts cleanup at lines 87-96 never runs
- ContextBridgeWriter, ContinuousMemoryWriter, KnowledgeGraph persistence -- all dead

### Existing Patterns to Follow

#### Pattern 1: ContextHealthMonitor Event System

Found in: `extension/src/autonomous/ContextHealthMonitor.ts:448`

The monitor emits typed events that AutoHandoffTrigger consumes via `connect()`:
- `'auto-save'` at 65% (fires BEFORE critical to win the race)
- `'warning'` at 50%
- `'critical'` at 70%
- `'handoff-recommended'` at 70%+ with auto-handoff enabled
- `'status-change'` on transitions

**Why relevant**: ACC stages should hook into these same events. The monitor already has adaptive polling (2s at 50%+, 5s below). ACC orchestrator should `connect()` to the monitor like AutoHandoffTrigger does.

#### Pattern 2: AutoHandoffTrigger Connect Pattern

Found in: `extension/src/autonomous/AutoHandoffTrigger.ts:141-196`

```typescript
connect(monitor: ContextHealthMonitor) {
  monitor.on('auto-save', (status) => this.handleAutoSaveThreshold(status));
  monitor.on('critical', (status) => this.handleCriticalStatus(status));
  monitor.on('handoff-recommended', (status) => this.handleHandoffRecommended(status));
}
```

**Why relevant**: The ACC orchestrator should follow this exact pattern - a `connect()` method that wires event listeners.

#### Pattern 3: AutonomousDriver Private ContextBuilder

Found in: `extension/src/autonomous/AutonomousDriver.ts:89`

```typescript
this.contextBuilder = new ContextBuilder(workspacePath, memoryManager, this.hintLoader);
```

**Why relevant**: Shows the constructor signature. The shared instance needs the same params. The driver also creates ContextCompactor at lines 94-98 with configurable threshold from `gofer.autonomous.compactionThreshold`.

#### Pattern 4: InitializeForWorkspace Pattern

Found in: `extension/src/extension.ts`

MemoryManager is created in `initializeForWorkspace()` after workspace folder is confirmed. The shared ContextBuilder should be created at the same point, since it depends on MemoryManager.

### Integration Points

1. **Creation**: In `initializeForWorkspace()` (extension.ts), after MemoryManager is created, construct the shared ContextBuilder and call `setSharedContextBuilder()`
2. **State assignment**: `state.sharedContextBuilder = new ContextBuilder(workspacePath, memoryManager, hintLoader)`
3. **ACC orchestrator**: Create new `ACCOrchestrator` that connects to ContextHealthMonitor
4. **Event integration**: ACC orchestrator hooks into monitor events at new thresholds (70/80/85/90/99%)
5. **Disposal**: DisposalService already handles cleanup (lines 87-96) - just needs a non-null builder
6. **Config reloads**: EventHandlers.ts guards (lines 215, 245) will automatically work once builder is set

### Related Code

- `extension/src/autonomousCommands.ts:37` - Module-level `sharedContextBuilder` variable
- `extension/src/autonomousCommands.ts:52-55` - `setSharedContextBuilder()` function (never called)
- `extension/src/autonomousCommands.ts:73-75` - `getSharedContextBuilder()` getter
- `extension/src/autonomousCommands.ts:939-943` - ContextBridgeWriter integration (dead)
- `extension/src/autonomousCommands.ts:1008-1025` - Terminal observation tracking (dead)
- `extension/src/autonomousCommands.ts:1117-1124` - KnowledgeGraph save on close (dead)
- `extension/src/services/EventHandlers.ts:215` - Observation pattern reload guard (early-returns)
- `extension/src/services/EventHandlers.ts:245` - Layered memory config reload guard (early-returns)
- `extension/src/services/DisposalService.ts:87-96` - ObservationMasker cache save (dead)
- `extension/src/autonomous/ContextCompactor.ts:664` - Single-threshold compaction (live via driver)
- `extension/src/autonomous/ContextHealthMonitor.ts` - Event emitter with adaptive polling (live)
- `extension/src/autonomous/AutoHandoffTrigger.ts:141-196` - Monitor connect pattern (live)

## Technology Decisions

### Decision 1: 5-Stage ACC Thresholds

- **Choice**: Progressive stages at 70%, 80%, 85%, 90%, 99% utilization
- **Rationale**: Matches OpenDev paper's proven architecture. Current system has only 2 thresholds (65% auto-save, 70% critical). ACC adds graduated response before compaction.
- **Alternatives considered**:
  - Single-threshold (current ContextCompactor at 80%) - too binary
  - 3-stage (warning/masking/compaction) - misses the fast-pruning and aggressive-masking nuances

### Decision 2: ACC Stage Actions

| Stage | Threshold | Action | Component |
|-------|-----------|--------|-----------|
| 1. Warning | 70% | Log warning, inject delegation advisory | SubAgentDispatcher |
| 2. Observation Masking | 80% | Mask old tool outputs via 3-tier decay | ObservationMasker |
| 3. Fast Pruning | 85% | Truncate low-priority context sections | ContextBuilder budget enforcement (truncate mode) |
| 4. Aggressive Masking | 90% | Force all observations to masked tier, fold sections | ObservationMasker + ContextFolder |
| 5. Full LLM Compaction | 99% | Summarize entire session via LLM | ContextCompactor |

- **Rationale**: Each stage uses an existing component. No new summarization logic needed - just orchestration.
- **Alternatives considered**: Building a new unified compactor - rejected because components already exist and are tested in isolation.

### Decision 3: Orchestrator Architecture

- **Choice**: New `ACCOrchestrator` class that connects to ContextHealthMonitor and delegates to existing components
- **Rationale**: Single responsibility. Monitor detects thresholds, orchestrator coordinates responses, components execute actions. Follows the established AutoHandoffTrigger.connect() pattern.
- **Alternatives considered**: Extending ContextHealthMonitor directly - rejected to avoid coupling detection with action.

### Decision 4: Shared vs Private ContextBuilder

- **Choice**: Wire the shared instance AND keep the AutonomousDriver private instance
- **Rationale**: The shared instance serves the extension's monitoring, MCP, and event system. The private instance serves the autonomous execution flow. They have different lifecycles (extension lifetime vs session lifetime). Breaking this separation would couple autonomous sessions to extension state.
- **Alternatives considered**: Replacing the private instance with the shared one - rejected because AutonomousDriver needs session-scoped state.

### Decision 5: Threshold Adjustments to Existing System

- **Choice**: Adjust existing ContextHealthMonitor thresholds to align with ACC
- **Rationale**: Current thresholds (50% warning, 65% auto-save, 70% critical) were set before ACC. ACC stage 1 starts at 70%. The monitor's warning threshold should drop to enable graduated response. New thresholds:
  - 50% warning (unchanged)
  - 65% auto-save (unchanged)
  - 70% ACC stage 1 (new event)
  - 80% ACC stage 2 (new event)
  - 85% ACC stage 3 (new event)
  - 90% ACC stage 4 (new event)
  - 99% ACC stage 5 (new event)

## Constraints & Considerations

- **ContextHealthMonitor is LIVE**: Changes must not break existing auto-save and handoff behavior. ACC orchestrator must coexist with AutoHandoffTrigger.
- **Token estimation uses chars/4**: All token counts are approximate. Real tiktoken counting is a separate concern (not in scope).
- **PTY interaction is fragile**: AutoHandoffTrigger's save/clear/resume via PTY writes is the only way to interact with Claude Code's terminal. ACC stages should NOT trigger PTY writes directly - delegate to AutoHandoffTrigger.
- **Event ordering matters**: Auto-save fires BEFORE critical in ContextHealthMonitor (line 438 vs 448). ACC stages must respect this ordering.
- **AutonomousDriver session scope**: The private ContextBuilder lives only during autonomous sessions. The shared instance lives for the extension lifetime. ACC must handle both scopes.
- **No tests exist**: Zero test coverage for ContextBuilder, ObservationMasker, StageContextProfileLoader, MemoryLayerManager, SubAgentDispatcher. New tests are required.
- **reflect-metadata must be first import**: If any new DI-decorated classes are added, they must not break the import order (MEMORY.md critical learning).

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type | Description | Impact on Implementation |
|-----------------|-------------|--------------------------|
| Event ordering | Auto-save fires before critical in monitor | ACC events must not interfere with this ordering |
| PTY fragility | Claude Code PTY interaction is unreliable | ACC should log/advise, not write to PTY directly |
| Token estimation | chars/4 approximation everywhere | ACC thresholds will fire at approximate points |
| Extension lifecycle | Shared builder must survive reinitialize | Must be re-created in reinitializeExtension() |

### Technical Debt to Avoid

| Pattern | Found In | Why Avoid | Use Instead |
|---------|----------|-----------|-------------|
| Direct PTY writes | AutoHandoffTrigger:506-516 | Fragile, timing-dependent | Delegate to existing trigger |
| execSync | Various | Blocks event loop | async/await with execFile |
| Orphaned setTimeout | Various | Unhandled rejections | Clear on early return |

### Downstream Dependencies

Code that depends on areas we're modifying:
- `extension/src/services/EventHandlers.ts:215,245` - Will start executing once builder is set
- `extension/src/autonomousCommands.ts:939,1008,1117` - Will activate ContextBridgeWriter, observation tracking, KnowledgeGraph
- `extension/src/services/DisposalService.ts:87-96` - Will start saving ObservationMasker cache

### Areas Requiring Extra Caution

- **EventHandlers config reload**: Once the builder is wired, config changes will trigger observation pattern reloads and layered memory toggles. Must verify these work correctly with a real builder.
- **DisposalService save**: ObservationMasker's `saveCacheToDisk()` will actually execute on extension deactivation. Must ensure it handles empty/new caches gracefully.
- **AutonomousCommands terminal monitoring**: Once `sharedContextBuilder` is set, terminal output will be tracked as observations. Must verify the observation buffer parsing is correct.

## Test Strategy

### Existing Tests: None

No test files exist for:
- ContextBuilder
- ObservationMasker
- StageContextProfileLoader
- MemoryLayerManager
- SubAgentDispatcher

### Required New Tests

1. **ACCOrchestrator unit tests**: Stage transitions, threshold responses, cooldowns
2. **ContextBuilder integration tests**: buildContext() with real memories and hints
3. **ObservationMasker unit tests**: Three-tier decay, LLM enhancement, persistence
4. **Wiring integration test**: Verify shared builder is non-null after initializeForWorkspace()
5. **Event ordering test**: ACC stages don't interfere with auto-save/critical ordering
6. **Regression test**: Existing AutoHandoffTrigger behavior unchanged

## Open Questions

- [ ] Should ACC stage 5 (99% LLM compaction) reuse the existing ContextCompactor or should it be a separate implementation?
- [ ] Should the `context-profiles.yaml` file be created with defaults on first run, or should we rely on the hardcoded fallbacks in StageContextProfileLoader?
- [ ] Should we add a VSCode setting to enable/disable ACC independently of the shared ContextBuilder wiring?

## Recommendations

1. **Wire the shared ContextBuilder first** before implementing ACC. This activates ~3,700 LOC and enables observation masking, budget enforcement, memory-first loading, and delegation advisories.
2. **Create ACCOrchestrator as a new class** following the AutoHandoffTrigger.connect() pattern. It should be a thin orchestration layer that delegates to existing components.
3. **Add new events to ContextHealthMonitor** for the 80/85/90/99% thresholds rather than polling inside the orchestrator.
4. **Write tests incrementally**: Start with ACCOrchestrator unit tests, then add integration tests for the wiring.
5. **Keep existing AutoHandoffTrigger behavior unchanged**: ACC orchestrator runs alongside it, not instead of it.

## Industry Validation

The approach is validated by multiple independent sources (March 2026):

| Source | Finding |
|--------|---------|
| OpenDev paper (arXiv 2603.05344) | 5-stage ACC achieves ~54% peak context reduction |
| Anthropic 2026 Agentic Coding Trends | Multi-agent with dedicated context is the validated pattern |
| Codified Context Infrastructure (arXiv 2602.20478) | Hot/warm/cold memory tiers validated across 283 sessions |
| Morph/JetBrains research | Verbatim compaction: 50-70% compression, 98% accuracy |
| Claude Code v2.x | Auto-compaction at 75% for Opus, confirming ACC thresholds |
| Jason Liu (jxnl.co) | Compaction as "momentum" - preserves optimization trajectory |
