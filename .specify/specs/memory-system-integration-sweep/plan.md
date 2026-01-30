---
feature: Memory System Full Integration Sweep
spec: spec.md
research: research.md
status: ready
created: '2026-01-29'
---

# Implementation Plan: Memory System Full Integration Sweep

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2
- **Framework**: VSCode Extension API, vscode-languageserver
- **Build**: Webpack
- **Testing**: Vitest (unit), Playwright (E2E)
- **Runtime**: Node.js 20.x LTS

### Architecture

The memory system spans two separate processes:

```
┌─────────────────────────────────────┐     ┌────────────────────────────────────┐
│     EXTENSION HOST PROCESS          │     │    LANGUAGE SERVER PROCESS          │
│                                     │     │                                    │
│  extension.ts                       │     │  server.ts                         │
│    ├─ ContextHealthMonitor ✓(012)   │     │    └─ tools/call dispatcher         │
│    ├─ AutoHandoffTrigger   ✓(012)   │     │         ├─ gofer_get_specs         │
│    ├─ ContextUsageLogger   ✓(012)   │     │         ├─ gofer_get_next_task     │
│    ├─ StatusBar            ✓(012)   │     │         ├─ gofer_execute_task ←────┤
│    ├─ MemoryManager        ✓(012)   │     │         ├─ gofer_update_status     │
│    │                                │     │         ├─ gofer_validate_code     │
│    │  NEW: Context Provider  ←──────┤     │         ├─ gofer_run_tests        │
│    │  NEW: MemoryManager singleton  │     │         │                          │
│    │  NEW: launchClaudeCode enrich  │     │         │ NEW: 5 orphaned tools    │
│    │  NEW: Observation hooks        │     │         │ NEW: Read enriched ctx   │
│    │  NEW: Research index watcher   │     │         │                          │
│    │                                │     │  toolHandler.ts                    │
│    │  ContextBuilder                │     │    ├─ MCPToolHandler               │
│    │    ├─ MemoryManager            │     │    ├─ GoferLoader                  │
│    │    ├─ HintLoader               │     │    └─ ResearchChunker (LS copy)    │
│    │    ├─ ObservationMasker        │     │                                    │
│    │    ├─ ResearchChunker          │     └────────────────────────────────────┘
│    │    └─ StageContextProfile      │
│    │                                │          FILE-BASED BRIDGE
│    └─ autonomousCommands.ts         │     ┌────────────────────────────────┐
│         └─ launchClaudeCode()       │     │  .specify/memory/              │
│                                     │     │    ├─ context-health-state.json│
└─────────────────────────────────────┘     │    ├─ enriched-context.json NEW│
                                            │    ├─ local.json               │
                                            │    └─ observation-cache/       │
                                            └────────────────────────────────┘
```

### Integration Points

| Component               | File                                                                | Integration Type                          |
| ----------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| MCP tool dispatch       | `language-server/src/server.ts:177-266, 460-494`                    | Add 5 tool definitions + switch cases     |
| executeTask enrichment  | `language-server/src/mcp/toolHandler.ts:411-486`                    | Read enriched context file                |
| Context provider        | `extension/src/extension.ts:289-353`                                | Wire callback to ContextHealthMonitor     |
| Context bridge writer   | `extension/src/autonomous/ContextBuilder.ts`                        | Persist BuiltContext to JSON              |
| launchClaudeCode        | `extension/src/autonomousCommands.ts:645`                           | Pre-spawn context build + injection       |
| Observation hooks       | `extension/src/autonomousCommands.ts` (pty onData)                  | Feed terminal output to ContextBuilder    |
| Research watcher        | `extension/src/extension.ts`                                        | FileSystemWatcher for research.md changes |
| MemoryManager singleton | `extension/src/extension.ts`, `extension/src/autonomousCommands.ts` | Pass shared instance                      |

### Key Dependencies

- All 8 memory modules exist and are tested (Spec 011)
- Extension-level wiring complete (Spec 012)
- File-based bridge pattern established (context-health-state.json)

---

## Implementation Phases

### Phase 1: Foundation — MCP Tool Registration & Persistence (FR2, FR7)

**Goal**: Register orphaned tools and ensure all persistence directories exist.
Lowest risk, highest immediate value.

**Files to modify**:

- `language-server/src/server.ts` — Add 5 tool definitions + dispatch cases
- Persistence check added to relevant modules

**Tasks**:

- [ ] Add `gofer_expand_observation` tool definition to onInitialize in
      server.ts
- [ ] Add `gofer_get_context_health` tool definition to onInitialize in
      server.ts
- [ ] Add `gofer_get_research_index` tool definition to onInitialize in
      server.ts
- [ ] Add `gofer_load_research_chunk` tool definition to onInitialize in
      server.ts
- [ ] Add `gofer_trigger_handoff` tool definition to onInitialize in server.ts
- [ ] Add 5 switch cases to tools/call dispatcher in server.ts
- [ ] Verify ObservationMasker creates `observation-cache/` on first write (lazy
      mkdir)
- [ ] Verify ContextUsageLogger creates `context-usage.jsonl` on first log
- [ ] Verify MemoryManager creates `local.json` on first save
- [ ] Write tests for MCP tool registration (tools appear in capabilities)
- [ ] Write tests for each orphaned tool returning valid responses

**Verification**:

- [ ] All 11 MCP tools appear in capabilities response
- [ ] Each of the 5 new tools returns a valid response (not error)
- [ ] All 1333+ existing tests pass
- [ ] Persistence directories created on first use

---

### Phase 2: Context Provider — Real Health Data (FR3)

**Goal**: Make ContextHealthMonitor produce real data by implementing a context
provider callback.

**Files to modify**:

- `extension/src/autonomous/WorkspaceContextProvider.ts` — NEW file
- `extension/src/extension.ts` — Wire provider to monitor

**Design**:

Create a `WorkspaceContextProvider` class that implements the
`() => ContextAnalysisInput` callback:

```typescript
class WorkspaceContextProvider {
  constructor(
    private workspacePath: string,
    private memoryManager: MemoryManager
  ) {}

  getContextAnalysis(): ContextAnalysisInput {
    return {
      breakdown: this.estimateTokenBreakdown(),
      stage: this.detectCurrentStage(),
    };
  }

  private estimateTokenBreakdown(): Partial<TokenBreakdown> {
    // Estimate tokens from:
    // - Spec artifacts in .specify/specs/ (count chars / 4)
    // - Loaded memories from MemoryManager
    // - Hint files in .specify/hints/
    // - System files (CLAUDE.md, AGENTS.md, constitution.md)
  }
}
```

**Tasks**:

- [ ] Create `WorkspaceContextProvider` class
- [ ] Implement `estimateTokenBreakdown()` using file system scanning
- [ ] Implement `detectCurrentStage()` from spec artifact state
- [ ] Wire provider to ContextHealthMonitor in
      `initializeContextHealthMonitoring()`
- [ ] Write unit tests for WorkspaceContextProvider
- [ ] Verify status bar shows non-null data after activation

**Verification**:

- [ ] `checkHealth()` returns non-null `ContextHealthStatus`
- [ ] Status bar shows green/yellow/red based on real data
- [ ] JSONL logs contain real token counts
- [ ] Auto-handoff triggers at 70% threshold (tested)

---

### Phase 3: MCP Enrichment — File-Based Bridge (FR1)

**Goal**: Enrich `gofer_execute_task` responses with memories, hints, research
chunks via the file-based bridge pattern.

**Files to modify**:

- `extension/src/autonomous/ContextBridgeWriter.ts` — NEW file
- `language-server/src/mcp/toolHandler.ts` — Read bridge + expand response
- `extension/src/extension.ts` — Wire bridge writer

**Design**:

**Extension side** — `ContextBridgeWriter`:

```typescript
class ContextBridgeWriter {
  private bridgePath: string; // .specify/memory/enriched-context.json

  constructor(
    private contextBuilder: ContextBuilder,
    workspacePath: string
  ) {
    this.bridgePath = path.join(
      workspacePath,
      '.specify/memory/enriched-context.json'
    );
  }

  async writeEnrichedContext(task: TaskContext): Promise<void> {
    const built = await this.contextBuilder.buildContext(task);
    const bridge = {
      timestamp: Date.now(),
      specId: task.specId,
      taskId: task.taskId,
      sections: built.sections,
      memoryCoverage: built.memoryCoverage,
      budgetUsage: built.budgetUsage,
      loadingDecisions: built.loadingDecisions,
    };
    // Atomic write: temp + rename
    await atomicWriteJson(this.bridgePath, bridge);
  }
}
```

**Language server side** — `toolHandler.ts` changes:

```typescript
async executeTask(specId: string, taskId: string): Promise<ExecuteTaskResponse> {
  // ... existing spec/task loading ...

  // NEW: Read enriched context from bridge file
  const enrichedContext = await this.readEnrichedContext(specId, taskId);

  return {
    success: true,
    spec,
    task,
    constitution: enrichedContext?.sections?.constitution || constitution,
    testHarnessPath,
    // NEW additive fields:
    memories: enrichedContext?.sections?.memories,
    hints: enrichedContext?.sections?.hints,
    researchChunks: enrichedContext?.sections?.research,
    memoryCoverage: enrichedContext?.memoryCoverage,
    budgetUsage: enrichedContext?.budgetUsage,
  };
}
```

**Tasks**:

- [ ] Create `ContextBridgeWriter` class with atomic JSON writes
- [ ] Add `readEnrichedContext()` method to MCPToolHandler
- [ ] Implement 60-second freshness check for bridge reads
- [ ] Expand `ExecuteTaskResponse` interface with additive fields
- [ ] Wire ContextBridgeWriter into extension.ts initialization
- [ ] Add graceful fallback: if bridge read fails, return existing response
      shape
- [ ] Write unit tests for ContextBridgeWriter
- [ ] Write integration test: write bridge → read in toolHandler → verify
      response
- [ ] Verify backward compatibility: existing response fields unchanged

**Verification**:

- [ ] `gofer_execute_task` response includes `memories`, `hints`,
      `researchChunks`
- [ ] Response includes full constitution (not 2000 char truncated)
- [ ] Enrichment completes within 1 second
- [ ] Missing/stale bridge file falls back to existing behavior
- [ ] All existing tests pass

---

### Phase 4: Claude Code Context Injection (FR4)

**Goal**: Inject enriched context into Claude Code sessions before spawning.

**Files to modify**:

- `extension/src/autonomousCommands.ts` — Add context building to
  launchClaudeCode
- `extension/src/autonomous/ContextBridgeWriter.ts` — Reuse from Phase 3

**Design**:

Before spawning `claude` via `node-pty`, call ContextBuilder to assemble
context. Write it to the bridge file (reuse Phase 3's ContextBridgeWriter), then
enrich the initial command to reference it.

```typescript
export async function launchClaudeCode(specId: string): Promise<void> {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspacePath) return;

  // NEW: Build and persist enriched context before spawning
  if (sharedMemoryManager && sharedContextBuilder) {
    try {
      const bridgeWriter = new ContextBridgeWriter(
        sharedContextBuilder,
        workspacePath
      );
      await bridgeWriter.writeEnrichedContext({
        taskId: 'launch',
        specId,
        description: `Launch Claude Code for spec ${specId}`,
      });
    } catch (err) {
      // Non-fatal: proceed without enrichment
      console.warn(
        '[Gofer] Context enrichment failed, launching without:',
        err
      );
    }
  }

  // ... existing pty.spawn logic ...
}
```

The enriched context is available to Claude Code through the MCP tools (Phase 3)
when it calls `gofer_execute_task`.

**Tasks**:

- [ ] Add context building call to `launchClaudeCode()` before pty.spawn
- [ ] Pass shared MemoryManager + ContextBuilder to autonomousCommands module
- [ ] Use ContextBridgeWriter to persist enriched context
- [ ] Add 500ms timeout for context building (non-blocking launch if slow)
- [ ] Handle failure gracefully (log warning, proceed without enrichment)
- [ ] Write test verifying context build runs before spawn
- [ ] Write test verifying launch proceeds if context build fails

**Verification**:

- [ ] Claude Code launch triggers context build
- [ ] Bridge file updated before spawn
- [ ] Launch not delayed more than 500ms
- [ ] Failed context build does not prevent launch

---

### Phase 5: Observation Tracking & Research Indexing (FR5, FR6)

**Goal**: Wire ObservationMasker to terminal output and auto-generate research
indexes.

**Files to modify**:

- `extension/src/autonomousCommands.ts` — Hook pty onData to ObservationMasker
- `extension/src/extension.ts` — Add FileSystemWatcher for research.md

**Design — Observation Tracking**:

In `launchClaudeCode()`, after the pty process is created, hook the `onData`
event to feed output to the ContextBuilder's `trackObservation()` method:

```typescript
// In launchClaudeCode(), after pty.spawn:
let turnCounter = 0;
const outputBuffer: string[] = [];

ptyProcess.onData((data: string) => {
  outputBuffer.push(data);

  // Track as observation every N chars of accumulated output
  if (getBufferSize(outputBuffer) > 2000) {
    const content = outputBuffer.join('');
    outputBuffer.length = 0;
    if (sharedContextBuilder) {
      sharedContextBuilder.trackObservation('command_output', content, {
        specId,
        source: 'claude-code-terminal',
      });
      sharedContextBuilder.incrementTurn();
    }
  }
});
```

**Design — Research Index Watcher**:

Add a FileSystemWatcher in `initializeForWorkspace()` that monitors
`.specify/specs/**/research.md` and triggers
`ResearchChunker.indexResearchFile()` on create/change:

```typescript
const researchWatcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(workspacePath, '.specify/specs/**/research.md')
);
researchWatcher.onDidCreate(async (uri) => {
  const specId = extractSpecId(uri);
  await researchChunker.indexResearchFile(specId);
});
researchWatcher.onDidChange(async (uri) => {
  const specId = extractSpecId(uri);
  await researchChunker.indexResearchFile(specId);
});
```

**Tasks**:

- [ ] Hook pty.onData in launchClaudeCode to buffer and track observations
- [ ] Implement output buffering (track per 2000+ chars)
- [ ] Call ContextBuilder.incrementTurn() on each tracked observation
- [ ] Add FileSystemWatcher for `.specify/specs/**/research.md`
- [ ] On create/change, call ResearchChunker.indexResearchFile(specId)
- [ ] Extract specId from file URI (parse directory name)
- [ ] Add disposables for watcher cleanup on deactivation
- [ ] Write test for observation tracking from terminal output
- [ ] Write test for research index generation on file change
- [ ] Verify observation-cache/ directory created on first track

**Verification**:

- [ ] Terminal output appears in ObservationMasker cache
- [ ] Turn counter advances during Claude Code sessions
- [ ] `research.index.json` generated when research.md changes
- [ ] `gofer_get_research_index` returns valid index data
- [ ] `gofer_load_research_chunk` loads chunks by ID

---

### Phase 6: MemoryManager Consolidation & Cleanup (FR8)

**Goal**: Single MemoryManager instance shared across the extension.

**Files to modify**:

- `extension/src/extension.ts` — Export shared instance
- `extension/src/autonomousCommands.ts` — Accept shared instance instead of
  creating

**Design**:

The shared MemoryManager is already created in `extension.ts:1168`. The change
is to pass it to `autonomousCommands` instead of creating a second instance:

```typescript
// extension.ts - registerCommands():
memoryManager = new MemoryManager(context, workspacePath);
if (contextUsageLogger) {
  memoryManager.setUsageLogger(contextUsageLogger);
}

// Pass to autonomous commands module
setSharedMemoryManager(memoryManager);
registerMemoryCommands(context, memoryManager);
```

```typescript
// autonomousCommands.ts:
let sharedMemoryManager: MemoryManager | undefined;

export function setSharedMemoryManager(mm: MemoryManager): void {
  sharedMemoryManager = mm;
}

export async function startAutonomousExecution(...) {
  // Use sharedMemoryManager instead of creating new one
  const driver = new AutonomousDriver(
    workspacePath,
    progressProvider,
    sharedMemoryManager!, // was: new MemoryManager(context, workspacePath)
    options
  );
}
```

Similarly, expose the shared ContextBuilder:

```typescript
let sharedContextBuilder: ContextBuilder | undefined;

export function setSharedContextBuilder(cb: ContextBuilder): void {
  sharedContextBuilder = cb;
}
```

**Tasks**:

- [ ] Add `setSharedMemoryManager()` function to autonomousCommands.ts
- [ ] Add `setSharedContextBuilder()` function to autonomousCommands.ts
- [ ] Remove duplicate `new MemoryManager()` from startAutonomousExecution()
- [ ] Call `setSharedMemoryManager()` from extension.ts registerCommands()
- [ ] Create shared ContextBuilder in extension.ts and pass via setter
- [ ] Wire ContextUsageLogger to shared MemoryManager
- [ ] Write test verifying single instance (mock + verify no duplicate
      construction)
- [ ] Verify all memory commands use the shared instance

**Verification**:

- [ ] Only one MemoryManager instantiation at runtime
- [ ] All memory operations logged to JSONL via shared logger
- [ ] AutonomousDriver uses shared instance
- [ ] launchClaudeCode uses shared ContextBuilder

---

### Phase 7: Integration Testing & Validation (All FRs)

**Goal**: End-to-end validation of the complete integration.

**Files to create/modify**:

- `tests/integration/memory-integration-sweep.test.ts` — NEW
- `tests/unit/autonomous/WorkspaceContextProvider.test.ts` — NEW
- `tests/unit/autonomous/ContextBridgeWriter.test.ts` — NEW

**Tasks**:

- [ ] Integration test: Full MCP enrichment flow (write bridge → read → verify
      response)
- [ ] Integration test: Context provider produces real data → status bar updates
- [ ] Integration test: Observation tracking from simulated terminal output
- [ ] Integration test: Research index auto-generation
- [ ] Integration test: MemoryManager singleton across components
- [ ] Run full test suite: `npm test`
- [ ] Run linting: `npm run lint`
- [ ] Manual test: Launch extension, verify status bar, launch Claude Code,
      verify MCP tool responses

**Verification**:

- [ ] All new integration tests pass
- [ ] All 1333+ existing tests pass
- [ ] Lint clean
- [ ] Manual smoke test passes

---

## File Structure

```
extension/src/
  autonomous/
    WorkspaceContextProvider.ts    # NEW: Token estimation for ContextHealthMonitor
    ContextBridgeWriter.ts         # NEW: Writes enriched context to bridge file
    ContextBuilder.ts              # EXISTING: no changes
    ContextHealthMonitor.ts        # EXISTING: no changes
    MemoryManager.ts               # EXISTING: no changes
    ObservationMasker.ts           # EXISTING: no changes
    HintLoader.ts                  # EXISTING: no changes
    ResearchChunker.ts             # EXISTING: no changes
  extension.ts                     # MODIFY: Wire provider, singleton, watcher
  autonomousCommands.ts            # MODIFY: Accept shared instances, add hooks

language-server/src/
  server.ts                        # MODIFY: Register 5 tools
  mcp/
    toolHandler.ts                 # MODIFY: Read bridge file, expand response

tests/
  unit/autonomous/
    WorkspaceContextProvider.test.ts    # NEW
    ContextBridgeWriter.test.ts         # NEW
  integration/
    memory-integration-sweep.test.ts    # NEW
```

---

## Risk Assessment

| Risk                                         | Impact | Mitigation                                              |
| -------------------------------------------- | ------ | ------------------------------------------------------- |
| Bridge file stale/missing                    | Med    | 60s freshness check + fallback to current behavior      |
| Context build slows Claude Code launch       | Med    | 500ms timeout, async non-blocking, graceful failure     |
| Breaking existing MCP tool responses         | High   | Additive-only fields, backward compat test              |
| Extension activation slowdown                | Med    | Async init for provider and watcher                     |
| MemoryManager race conditions with singleton | Low    | Single-threaded Node.js event loop; no real concurrency |
| Terminal output volume overwhelming masker   | Med    | Buffer threshold (2000 chars) + maxCacheSize (100)      |

---

## Spec Traceability

### User Story Coverage

| Story                              | Priority | Plan Phase(s) | Components                                  |
| ---------------------------------- | -------- | ------------- | ------------------------------------------- |
| US1: MCP Context Enrichment        | P1       | Phase 3       | ContextBridgeWriter, toolHandler enrichment |
| US2: Orphaned MCP Registration     | P1       | Phase 1       | server.ts tool registration                 |
| US3: Real Health Data              | P1       | Phase 2       | WorkspaceContextProvider                    |
| US4: Claude Code Context Injection | P1       | Phase 4       | launchClaudeCode enrichment                 |
| US5: Observation Tracking          | P2       | Phase 5       | pty.onData hooks                            |
| US6: Research Index Generation     | P2       | Phase 5       | FileSystemWatcher + ResearchChunker         |
| US7: Persistence Infrastructure    | P2       | Phase 1       | Lazy mkdir in modules                       |
| US8: MemoryManager Consolidation   | P3       | Phase 6       | Shared instance + setters                   |

### Requirement Coverage

| Requirement                          | Plan Phase | Task Group                       |
| ------------------------------------ | ---------- | -------------------------------- |
| FR1: MCP Tool Response Enrichment    | Phase 3    | Bridge writer + toolHandler read |
| FR2: Orphaned MCP Tool Registration  | Phase 1    | server.ts registration           |
| FR3: Context Provider Implementation | Phase 2    | WorkspaceContextProvider         |
| FR4: Claude Code Context Injection   | Phase 4    | launchClaudeCode enrichment      |
| FR5: Observation Tracking Hooks      | Phase 5    | pty.onData observation tracking  |
| FR6: Research Index Auto-Generation  | Phase 5    | FileSystemWatcher                |
| FR7: Persistence Directory Setup     | Phase 1    | Lazy mkdir verification          |
| FR8: MemoryManager Singleton         | Phase 6    | Shared instance refactor         |

**Coverage**: 8/8 user stories (100%), 8/8 functional requirements (100%)
