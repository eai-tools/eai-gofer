---
date: '2026-01-29T10:00:00Z'
researcher: Claude
feature: Memory System Full Integration Sweep
status: complete
---

# Research: Memory System Full Integration Sweep

## Feature Summary

Wire together all 8 memory management modules (MemoryManager, ContextBuilder,
ContextHealthMonitor, ObservationMasker, ResearchChunker, AutoHandoffTrigger,
StageContextProfile, HintLoader) into production workflows. The modules are
well-implemented and tested individually but only ~20-30% integrated into actual
execution paths.

**Prior art**: Spec 012 (Context Health Integration) completed the
extension-level wiring of ContextHealthMonitor, AutoHandoffTrigger,
ContextUsageLogger, and ContextHealthStatusBar. That work is done and verified.
This sweep addresses the **remaining gaps** that Spec 012 did not cover.

---

## Codebase Analysis

### What Spec 012 Already Fixed (DO NOT DUPLICATE)

Spec 012 (completed 2026-01-25) wired these components in `extension.ts`:

| Component              | Wiring Done                   | Location                                  |
| ---------------------- | ----------------------------- | ----------------------------------------- |
| ContextHealthMonitor   | Created, started, disposed    | extension.ts:293                          |
| AutoHandoffTrigger     | Connected to monitor + logger | extension.ts:304                          |
| ContextUsageLogger     | Created, connected to events  | extension.ts:292                          |
| ContextHealthStatusBar | Created, connected to monitor | extension.ts:128, 299                     |
| MemoryManager          | Initialized, logger wired     | extension.ts:1168-1174                    |
| Memory logging methods | Added to ContextUsageLogger   | logMemorySave/Search/Load/LoadingDecision |
| MCP state persistence  | persistState() on monitor     | ContextHealthMonitor.ts                   |
| MCP state reading      | Reads state file              | toolHandler.ts getContextHealth()         |

### Remaining Integration Gaps (THIS SWEEP)

#### Gap 1: MCP Tools Don't Use ContextBuilder (CRITICAL)

**Current state** (`language-server/src/mcp/toolHandler.ts:411-486`):

`gofer_execute_task` loads specs via `GoferLoader.loadSpec()` and reads
constitution directly with `fs.readFile()`, truncated to 2000 chars. Returns:

- Full spec object
- Task object
- Truncated constitution (2000 chars)
- Optional test harness path

**What's missing from the response:**

- No memories (relevant past learnings)
- No hints (directory-level coding guidance)
- No research chunks (relevant portions of research.md)
- No budget enforcement
- No memory coverage tracking

**Architectural constraint**: `ContextBuilder` depends on `MemoryManager` which
requires `vscode.ExtensionContext`. The language server runs in a separate
process and cannot access the VSCode API directly.

**Integration options:**

1. **File-based bridge** (RECOMMENDED): ContextBuilder writes enriched context
   to a state file; MCP tool reads it. Follows the pattern established by Spec
   012's `context-health-state.json`.
2. **LSP custom request**: Extension builds context on demand when language
   server requests it via a custom LSP method.
3. **Refactor MemoryManager**: Decouple from `vscode.ExtensionContext`, use only
   file-based storage in a shared adapter.
4. **Duplicate in language-server**: The language server already has its own
   `ResearchChunker`. Create a lightweight `ContextEnricher` that uses
   file-based memory and hints without VSCode dependencies.

#### Gap 2: Five Orphaned MCP Tools (HIGH)

Five context health MCP tools are implemented in `toolHandler.ts` but NOT
registered in `server.ts`'s switch statement or tool definitions:

| Tool                        | Handler Method        | Line                |
| --------------------------- | --------------------- | ------------------- |
| `gofer_expand_observation`  | `expandObservation()` | toolHandler.ts:664  |
| `gofer_get_context_health`  | `getContextHealth()`  | toolHandler.ts:747  |
| `gofer_get_research_index`  | `getResearchIndex()`  | toolHandler.ts:876  |
| `gofer_load_research_chunk` | `loadResearchChunk()` | toolHandler.ts:938  |
| `gofer_trigger_handoff`     | `triggerHandoff()`    | toolHandler.ts:1004 |

**Fix**: Add these 5 tools to `server.ts` lines 177-266 (tool definitions in
`onInitialize`) and lines 460-494 (switch dispatch in `tools/call` handler).

#### Gap 3: ContextHealthMonitor Has No Context Provider (CRITICAL)

`ContextHealthMonitor.startMonitoring()` runs on a timer, but
`setContextProvider()` is never called. The `checkHealth()` method returns
`null` every interval because `this.contextProvider` is `null`.

**Location**: `extension/src/extension.ts:347` starts monitoring, but no
provider is set.

**Impact**: Status bar, JSONL logging, and auto-handoff never receive actual
data.

**Fix**: Create a `ContextProvider` implementation that estimates token usage
from:

- Loaded spec artifacts
- Active terminal session output
- File reads tracked via ObservationMasker
- Or use the existing bash script logic (`check-context-health.sh`) as a
  baseline

#### Gap 4: ObservationMasker Never Fed Data (HIGH)

The `ObservationMasker` is instantiated inside `ContextBuilder` (line 251-252)
but:

- No code calls `trackObservation()` with tool outputs
- No code calls `incrementTurn()` to advance the turn counter
- Turn counter stays at 0, so nothing is ever masked

**Where observations should be tracked:**

- `TerminalManager.ts` — terminal output from Claude Code sessions
- `OutputMonitor.ts` — processed output monitoring
- `ClaudeCodeAutonomousResponder.ts` — API responses with token counts
- MCP tool handler responses — tool call results

#### Gap 5: Two Disconnected Execution Paths (CRITICAL)

There are TWO completely separate execution flows:

**Path A: AutonomousDriver** (formal, has all wiring, but unreachable)

```
autonomousCommands.ts:startAutonomousExecution()
  -> new AutonomousDriver(workspacePath, progressProvider, memoryManager, options)
  -> driver.start(specId)
    -> loadSessionMemories()      // MemoryManager.load('both')
    -> buildTaskContext(task)      // ContextBuilder.buildContext() — NEVER CALLED
    -> monitorAndCompactContext()  // ContextCompactor — NEVER CALLED
```

**Path B: launchClaudeCode** (actually used, bypasses everything)

```
autonomousCommands.ts:launchClaudeCode(specId)
  -> pty.spawn('claude', args)
  -> ClaudeCodeAutonomousResponder
  -> NO ContextBuilder, NO MemoryManager, NO HintLoader, NO ObservationMasker
```

The VSCode command `gofer.startClaudeCode` (extension.ts:766) calls
`launchClaudeCode()`, which spawns Claude Code via `node-pty` with zero context
enrichment.

**Fix options:**

1. **Integrate into launchClaudeCode** (RECOMMENDED): Before spawning Claude
   Code, build context and inject it (via CLAUDE.md, environment variables, or
   initial prompt enrichment)
2. **Switch to AutonomousDriver path**: Make the Play button use
   `startAutonomousExecution()` instead of `launchClaudeCode()`
3. **Hybrid**: Use `launchClaudeCode()` for spawning but call ContextBuilder to
   enrich the initial command/prompt

#### Gap 6: AutonomousDriver Methods Never Called (HIGH)

Even within the AutonomousDriver, key methods are defined but never invoked:

| Method                       | Line                    | Purpose                | Called? |
| ---------------------------- | ----------------------- | ---------------------- | ------- |
| `buildTaskContext()`         | AutonomousDriver.ts:529 | Build enriched context | NEVER   |
| `monitorAndCompactContext()` | AutonomousDriver.ts:871 | Trigger compaction     | NEVER   |
| `recordMemoryUsage()`        | AutonomousDriver.ts:506 | Track memory usage     | NEVER   |
| `trackPattern()`             | AutonomousDriver.ts:640 | Auto-suggest memories  | NEVER   |

#### Gap 7: ResearchChunker Never Generates Indexes (MEDIUM)

No `research.index.json` files exist. The `ResearchChunker` exists in both:

- `extension/src/autonomous/ResearchChunker.ts` (extension copy)
- `language-server/src/utils/ResearchChunker.ts` (language server copy, 762
  lines)

The language server copy is only used by orphaned MCP tools. Neither copy has
been triggered to generate an index from actual research.md files.

**Fix**: Generate `research.index.json` when research.md is created or modified.
Use file system watcher or generate on first access.

#### Gap 8: Persistence Gaps (MEDIUM)

| Path                                        | Expected By          | Exists?                               |
| ------------------------------------------- | -------------------- | ------------------------------------- |
| `.specify/hints/`                           | HintLoader           | YES (global.md, README.md, examples/) |
| `.specify/memory/local.json`                | MemoryManager        | NO                                    |
| `.specify/memory/observation-cache/`        | ObservationMasker    | NO                                    |
| `.specify/logs/context-usage.jsonl`         | ContextUsageLogger   | NO                                    |
| `**/research.index.json`                    | ResearchChunker      | NO                                    |
| `.specify/memory/context-health-state.json` | ContextHealthMonitor | Created by Spec 012 logic             |

Note: `.specify/hints/` DOES exist with global.md and example files,
contradicting the engineering review. The HintLoader should work if properly
invoked.

#### Gap 9: Two MemoryManager Instances (LOW)

Two separate `MemoryManager` instances exist:

- `autonomousCommands.ts:158` — for AutonomousDriver (no logger)
- `extension.ts:1168` — for memory commands (with ContextUsageLogger)

These operate on the same files without coordination. The AutonomousDriver's
instance doesn't log to JSONL.

---

### Where to Implement

| Component                   | Location                                                          | Purpose                                         |
| --------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| MCP tool enrichment         | `language-server/src/mcp/toolHandler.ts:411-486`                  | Add context to executeTask response             |
| MCP tool registration       | `language-server/src/server.ts:177-266, 460-494`                  | Register 5 orphaned tools                       |
| Context provider            | `extension/src/extension.ts`                                      | Feed real data to ContextHealthMonitor          |
| Observation hooks           | `extension/src/autonomous/TerminalManager.ts`, `OutputMonitor.ts` | Track tool outputs                              |
| launchClaudeCode enrichment | `extension/src/autonomousCommands.ts:645`                         | Inject context before spawning                  |
| Research index generation   | `extension/src/autonomous/ResearchChunker.ts`                     | Auto-generate on research.md change             |
| AutonomousDriver call sites | `extension/src/autonomousCommands.ts`                             | Call buildTaskContext, monitorAndCompactContext |

---

### Existing Patterns to Follow

#### Pattern 1: File-Based State Bridge (Extension <-> Language Server)

Found in: `extension/src/autonomous/ContextHealthMonitor.ts` (persistState) and
`language-server/src/mcp/toolHandler.ts` (getContextHealth)

The extension writes JSON state to `.specify/memory/context-health-state.json`.
The language server reads it with a 30-second freshness check. This is the
established pattern for cross-process communication outside of LSP.

**Why relevant**: Use this pattern for sharing ContextBuilder output with MCP
tools.

#### Pattern 2: Module Wiring in extension.ts

Found in: `extension/src/extension.ts:289-353`

```
initializeContextHealthMonitoring(workspacePath):
  1. Create components
  2. Wire events (.on() with named handlers)
  3. Wire cross-cutting loggers (.setUsageLogger())
  4. Start monitoring
  5. Register disposals in deactivate()
```

**Why relevant**: Follow this pattern for any new subsystem wiring.

#### Pattern 3: VSCode Command Registration with Dependency Injection

Found in: `extension/src/commands/memoryCommands.ts`

```typescript
export function registerMemoryCommands(
  context: vscode.ExtensionContext,
  memoryManager: MemoryManager
): void { ... }
```

**Why relevant**: New commands should follow this pattern, not use global
singletons.

#### Pattern 4: JSONL Append Logging

Found in: `extension/src/council/UsageLogger.ts` and
`extension/src/autonomous/ContextUsageLogger.ts`

```typescript
async log(entry): Promise<void> {
  await this.ensureDirectory();
  const line = JSON.stringify(entry) + '\n';
  await fs.promises.appendFile(this.getLogPath(), line, 'utf-8');
}
```

**Why relevant**: All new logging should use this pattern.

---

### Integration Points

1. **`gofer_execute_task` response enrichment**: The primary integration point.
   After loading the spec and task, build enriched context with memories, hints,
   and research chunks. Return alongside the existing response fields.

2. **`launchClaudeCode()` pre-spawn hook**: Before spawning the Claude Code
   process, call ContextBuilder to assemble relevant context. Inject via the
   initial command or a context file.

3. **`ContextHealthMonitor.setContextProvider()`**: Create an implementation
   that estimates real token usage from active sessions, loaded files, and spec
   state.

4. **Terminal output -> ObservationMasker**: Hook `TerminalManager.onOutput` or
   `OutputMonitor` to feed observations into the masker for tracking.

5. **`server.ts` tool registration**: Add the 5 orphaned tools to both the
   `onInitialize` tool definitions and the `tools/call` switch dispatch.

---

### Related Code

- `language-server/src/mcp/toolHandler.ts:411-486` — executeTask handler
  (primary target)
- `language-server/src/server.ts:177-266` — tool definitions in onInitialize
- `language-server/src/server.ts:460-494` — tool dispatch switch
- `extension/src/autonomousCommands.ts:645` — launchClaudeCode (actual execution
  path)
- `extension/src/autonomous/AutonomousDriver.ts:529` — buildTaskContext (never
  called)
- `extension/src/autonomous/AutonomousDriver.ts:871` — monitorAndCompactContext
  (never called)
- `extension/src/autonomous/ContextBuilder.ts:237-256` — constructor with
  optional params
- `extension/src/autonomous/ContextHealthMonitor.ts:454` — checkHealth returns
  null without provider
- `extension/src/extension.ts:289-353` — existing wiring pattern to follow
- `extension/src/extension.ts:766-801` — gofer.startClaudeCode command

---

## Technology Decisions

### Decision 1: Cross-Process Context Sharing

- **Choice**: File-based state bridge (JSON files in `.specify/memory/`)
- **Rationale**: Already established pattern in the codebase (Spec 012). The
  language server runs in a separate process from the extension host. File-based
  sharing avoids tight coupling and works with the existing architecture.
- **Alternatives considered**:
  - LSP custom requests (more complex, tighter coupling)
  - Refactoring MemoryManager to remove VSCode dependency (large scope change)
  - Shared SQLite database (over-engineered for this use case)

### Decision 2: Token Counting Approach

- **Choice**: Custom estimation (character-count heuristic), same as existing
  code
- **Rationale**: The codebase already uses custom token estimation everywhere
  (ContextBuilder, ObservationMasker, ResearchChunker, ContextCompactor). No
  tiktoken or external tokenizer is used. Adding one would be inconsistent.
- **Alternatives considered**:
  - tiktoken (adds npm dependency, inconsistent with existing approach)
  - Anthropic SDK token counting (requires API call overhead)

### Decision 3: Context Injection Method for Claude Code

- **Choice**: Enrich the initial Gofer command sent to Claude Code with context
- **Rationale**: `launchClaudeCode()` already calls `determineInitialCommand()`
  to build the command string. This is the natural injection point — append
  context sections to the command or write a context file that the command
  references.
- **Alternatives considered**:
  - Environment variables (size limited, not practical for rich context)
  - Switching to AutonomousDriver path (too large a change, AutonomousDriver's
    terminal management is different from the working pty-based approach)

---

## Constraints & Considerations

- **Cross-process boundary**: Extension host and language server are separate
  Node processes. MemoryManager cannot be directly used in the language server.
- **Existing test suite**: 1333+ tests must continue to pass. Changes to
  toolHandler.ts and server.ts must not break the existing 6 registered MCP
  tools.
- **Backward compatibility**: The `gofer_execute_task` response shape is
  consumed by Claude Code. New fields must be additive (no breaking changes to
  existing fields).
- **ResearchChunker duplication**: The class exists in both extension and
  language server packages with near-identical implementations. Consider
  extracting to a shared package eventually, but not in this sweep.
- **Spec 012 already done**: Do NOT re-implement extension.ts wiring for
  ContextHealthMonitor, AutoHandoffTrigger, ContextUsageLogger, or StatusBar.

---

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type       | Description                                          | Impact on Implementation                                      |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Process boundary      | Extension host vs language server separate processes | Cannot share MemoryManager directly; use file-based bridge    |
| VSCode API dependency | MemoryManager requires vscode.ExtensionContext       | Language server needs file-only adapter                       |
| Existing MCP contract | gofer_execute_task response consumed by Claude Code  | New fields must be additive                                   |
| Dual execution paths  | launchClaudeCode vs AutonomousDriver                 | Must integrate with the actually-used path (launchClaudeCode) |

### Technical Debt to Avoid

| Pattern                          | Found In                    | Why Avoid                  | Use Instead                                            |
| -------------------------------- | --------------------------- | -------------------------- | ------------------------------------------------------ |
| Duplicate ResearchChunker        | extension + language-server | Maintenance burden         | Use existing duplication for now; shared package later |
| Raw fs.readFile for constitution | toolHandler.ts:452-458      | Bypasses ContextBuilder    | Replace with enriched context                          |
| 2000 char truncation             | toolHandler.ts:458          | Arbitrary limit loses data | Use budget-based allocation                            |

### Downstream Dependencies

Code that depends on areas we're modifying:

- `tests/e2e/language-server/lsp-mcp-integration.spec.ts` — Tests MCP tool
  responses
- `tests/integration/orchestrator.test.ts` — Tests spec loading
- Claude Code consumers — Expect current gofer_execute_task response shape

---

## Open Questions

- [ ] Should the 5 orphaned MCP tools be registered with the existing `gofer_`
      prefix or renamed?
- [ ] Should ContextBuilder output be written per-task or per-session?
- [ ] What is the maximum acceptable size for the enriched context returned by
      gofer_execute_task?

---

## Recommendations

1. **Start with Gap 2 (orphaned MCP tools)** — lowest risk, highest immediate
   value. Simply register the 5 existing tools in server.ts.

2. **Fix Gap 3 (context provider)** next — makes the already-wired monitoring
   pipeline actually produce data.

3. **Address Gap 1 (MCP tool enrichment)** using the file-based bridge pattern.
   Write enriched context from extension; read in language server.

4. **Fix Gap 5 (execution path)** by enriching `launchClaudeCode()` with context
   injection before spawning. This is where the actual user value is delivered.

5. **Wire Gap 4 (ObservationMasker)** into terminal output tracking for ongoing
   context optimization.

6. **Generate research indexes (Gap 7)** and ensure persistence directories
   exist (Gap 8) as cleanup tasks.

7. **Consolidate MemoryManager instances (Gap 9)** — use the extension.ts
   instance everywhere, pass it to autonomousCommands.
