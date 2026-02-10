---
date: "2026-02-10T14:15:00Z"
researcher: Claude
feature: "020-multi-session-context-panel"
status: complete
---

# Research: Multi-Session Context Panel

## Feature Summary

Track up to 3 concurrent Claude Code CLI sessions with independent context health monitoring. Redesign the Gofer sidebar panel from `Specifications | Constitution | Memory` to `Specifications | Context Window | Memory`, where Context Window shows a per-session tree with categorized token breakdowns and Memory shows a categorized tree of actual memory entries (not just markdown files).

## Codebase Analysis

### Where to Implement

| Component | Location | Purpose |
|-----------|----------|---------|
| Hook script (multi-session bridge) | `.specify/scripts/hooks/post-tool-use.mjs` | Change from single `context-bridge.json` to per-session `context-bridge-{sessionId}.json` |
| Hook script (bundled copy) | `extension/resources/hook-scripts/post-tool-use.mjs` | Keep in sync with above |
| MultiSessionBridgeWatcher | `extension/src/autonomous/MultiSessionBridgeWatcher.ts` | NEW: Watch multiple bridge files, track up to 3 sessions |
| SessionTreeProvider | `extension/src/contextWindowProvider.ts` | NEW: TreeDataProvider for Context Window view |
| MemoryTreeProvider | `extension/src/memoryProvider.ts` | REWRITE: Categorized tree from MemoryManager JSONL, not markdown files |
| HookBridgeWatcher | `extension/src/autonomous/HookBridgeWatcher.ts` | MODIFY: Adapt to watch per-session files or replace with MultiSessionBridgeWatcher |
| WorkspaceContextProvider | `extension/src/autonomous/WorkspaceContextProvider.ts` | MODIFY: Support multiple concurrent sessions |
| ContextHealthMonitor | `extension/src/autonomous/ContextHealthMonitor.ts` | MODIFY: Track health per session |
| ContextHealthStatusBar | `extension/src/ui/ContextHealthStatusBar.ts` | MODIFY: Show active/focused session, or summary |
| package.json | `extension/package.json` | MODIFY: Replace `goferConstitution` view with `goferContextWindow`, update menus |
| extension.ts | `extension/src/extension.ts` | MODIFY: Register new providers, wire multi-session components |

### Existing Patterns to Follow

#### Pattern 1: TreeDataProvider Registration

Found in: `extension/src/extension.ts:162-189`

```typescript
function registerTreeViews(context: vscode.ExtensionContext) {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  progressProvider = new ProgressProvider(workspacePath, undefined);
  constitutionProvider = new ConstitutionProvider(workspacePath);
  memoryProvider = new MemoryProvider(workspacePath);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('goferProgress', progressProvider)
  );
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('goferConstitution', constitutionProvider)
  );
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('goferMemory', memoryProvider)
  );
}
```

Why relevant: New `ContextWindowProvider` must follow this exact pattern — create in `registerTreeViews()`, register with `registerTreeDataProvider`, push to `context.subscriptions`.

#### Pattern 2: HookBridgeWatcher Event-Driven Updates

Found in: `extension/src/autonomous/HookBridgeWatcher.ts:56-60`

```typescript
export class HookBridgeWatcher extends EventEmitter implements vscode.Disposable {
  private readonly bridgePath: string;
  private watcher: vscode.FileSystemWatcher | null = null;
  private stalenessTimer: ReturnType<typeof setInterval> | null = null;
  private latestData: BridgeData | null = null;
```

Why relevant: The multi-session watcher needs to extend this pattern — one FileSystemWatcher watching the `hooks/` directory for `context-bridge-*.json` glob pattern, maintaining a `Map<sessionId, BridgeData>` instead of a single `latestData`.

#### Pattern 3: GoferActivityStatusBar Subscription Pattern

Found in: `extension/src/ui/GoferActivityStatusBar.ts:38-60`

```typescript
constructor(private readonly watcher: HookBridgeWatcher) {
  const onUpdate = (data: BridgeData): void => { this.latestData = data; this.updateDisplay(); };
  watcher.on('bridge-update', onUpdate);
  this.disposables.push({
    dispose: () => { watcher.off('bridge-update', onUpdate); },
  });
}
```

Why relevant: The Context Window tree provider should subscribe to the multi-session watcher using this exact pattern — listen for session updates, trigger `refresh()`.

#### Pattern 4: ProgressProvider Async Loading with Sequence Tracking

Found in: `extension/src/progressProvider.ts:259-509`

Why relevant: Context Window tree should use the same `loadSequence` pattern to prevent stale async loads from overwriting newer state. However, since bridge data is small/synchronous, this may be optional.

#### Pattern 5: Bridge Data Schema

Found in: `extension/src/autonomous/HookBridgeWatcher.ts:23-48`

```typescript
export interface BridgeData {
  timestamp: number;
  sessionId: string;
  model: string;
  context: {
    totalContextTokens: number;
    inputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    outputTokens: number;
    contextLimit: number;
    utilizationPercent: number;
  } | null;
  lastToolUse: { toolName: string; timestamp: number; observationId?: string; toolInput?: Record<string, unknown>; } | null;
  session: { active: boolean; lastActivity: number; startedAt?: number; endedAt?: number; };
}
```

Why relevant: This schema already includes `sessionId` — the hook already provides session identity. The bridge just needs to be written to per-session files instead of one shared file.

### Integration Points

1. **Hook Script → Per-Session Bridge Files**: The `post-tool-use.mjs` hook currently writes to a single `context-bridge.json`. Must change to write `context-bridge-{sessionId}.json`. The `sessionId` is already available from `input.session_id`.

2. **MultiSessionBridgeWatcher → ContextWindowProvider**: New watcher emits `session-update(sessionId, data)`, `session-added(sessionId)`, `session-removed(sessionId)` events. The tree provider subscribes and refreshes.

3. **MultiSessionBridgeWatcher → Existing Components**: The existing `ContextHealthStatusBar`, `AutoHandoffTrigger`, and `WorkspaceContextProvider` currently expect a single session. They need to either:
   - (a) Accept a "focused session" concept and continue working on that, or
   - (b) Be refactored to accept sessionId parameters.
   - **Recommendation**: Option (a) — the status bar shows the most recently active session, auto-handoff triggers on any critical session. Minimal refactoring.

4. **MemoryManager → MemoryTreeProvider**: The new Memory tree reads from `MemoryManager.load()` which returns `Memory[]` from JSONL storage. Group by `memory.category` field. Categories in the codebase: `discovery`, `journey`, `pattern`, `decision`, `learning`, `debug`, `architecture`.

5. **package.json View Registration**: Replace `goferConstitution` view ID with `goferContextWindow`. The Constitution content can be accessed via the Memory tree (it's a markdown file in `.specify/memory/`).

6. **Backward Compatibility**: Old single `context-bridge.json` should still be read if present (migration path). The hook script update deploys via `goferMigrator.ts` `installHooksConfig()`.

### Related Code

- `extension/src/autonomous/HookBridgeWatcher.ts` — Current single-session watcher, base for multi-session
- `extension/src/autonomous/WorkspaceContextProvider.ts:100` — `getContextAnalysis()` returns single session data
- `extension/src/autonomous/ContextHealthMonitor.ts` — Health per session needed
- `extension/src/ui/ContextHealthStatusBar.ts:206-252` — `updateDisplay()` for single session
- `extension/src/extension.ts:356-458` — `initializeContextHealthMonitoring()` wiring
- `extension/src/progressProvider.ts` — Best TreeDataProvider example (most complex)
- `extension/src/memoryProvider.ts` — Current simple markdown-based tree (to be rewritten)
- `extension/src/constitutionProvider.ts` — Will be removed from panel (Constitution accessible via Memory)
- `extension/src/autonomous/MemoryManager.ts` — JSONL memory storage, `.load()`, categories
- `extension/src/autonomous/memory.ts:20-77` — Memory interface with category, tags, type fields
- `.specify/scripts/hooks/post-tool-use.mjs:158-169` — `writeBridge()` function to modify
- `extension/package.json:252-300` — View registration and menus

## Technology Decisions

### Decision 1: Per-Session Bridge Files vs Single Multiplexed File

- **Choice**: Per-session bridge files (`context-bridge-{sessionId}.json`)
- **Rationale**: Each Claude Code session writes independently via hooks. Using separate files avoids race conditions where two sessions write to the same file simultaneously. The FileSystemWatcher can use a glob pattern `.specify/hooks/context-bridge-*.json` to watch all files.
- **Alternatives considered**:
  - Single file with array of sessions — race condition risk when two hooks fire simultaneously
  - Directory of session files in subdirectory — unnecessary complexity

### Decision 2: Session Cap Enforcement

- **Choice**: Enforce 3-session cap in the extension's MultiSessionBridgeWatcher, not in the hook script
- **Rationale**: The hook script runs in Claude Code's process and shouldn't be burdened with cross-session logic. The extension maintains the authoritative `Map<sessionId, BridgeData>` and evicts the oldest inactive when a 4th appears.
- **Alternatives considered**:
  - Cap in hook script — hooks don't know about other sessions
  - No cap (unlimited) — UI clutter, diminishing returns past 3

### Decision 3: Status Bar Behavior with Multiple Sessions

- **Choice**: Status bar shows the most recently active session's context health. Add session count indicator (e.g., `$(pulse) Context: 54% (Opus) [2/3]`).
- **Rationale**: Minimal change to existing status bar. The detailed per-session breakdown is in the Context Window tree view.
- **Alternatives considered**:
  - Multiple status bar items (one per session) — too much status bar real estate
  - Aggregate/average across sessions — misleading, hides individual session issues

### Decision 4: Memory Tree Data Source

- **Choice**: Read from `MemoryManager.load()` (JSONL storage) and group by `memory.category`
- **Rationale**: The current MemoryProvider reads markdown files from `.specify/memory/` which is a different data source than actual runtime memories. Users want to see their categorized memories (discovery, patterns, decisions, learnings, journeys), not raw markdown documents.
- **Alternatives considered**:
  - Keep markdown file view alongside new category view — too complex, confusing
  - Read JSONL directly without MemoryManager — bypasses dedup, priority, consolidation

### Decision 5: Constitution View Handling

- **Choice**: Remove `goferConstitution` as a separate panel section. Constitution remains accessible via:
  1. A "Constitution" category node under the Memory tree (since `constitution.md` is in `.specify/memory/`)
  2. Existing command palette entry
- **Rationale**: User explicitly requested 3 sections: Specifications | Context Window | Memory. Constitution is a markdown document that fits naturally under Memory.
- **Alternatives considered**:
  - 4 sections (keep Constitution) — user specified 3 sections
  - Move Constitution into Specifications — not semantically related

## Constraints & Considerations

- **Hook deployment**: Changing the bridge file naming requires updating the hook script in both `.specify/scripts/hooks/` AND `extension/resources/hook-scripts/`. The `goferMigrator` reinstalls hooks on upgrade, so existing users will get the new hook script.

- **Backward compatibility**: The watcher should also check for the legacy single `context-bridge.json` and treat it as a session. This handles the transition period where old hook scripts are still writing the old format.

- **Session cleanup**: Per-session bridge files need cleanup when sessions end. The `session.active: false` or staleness detection should trigger file deletion after a grace period (e.g., 5 minutes after last activity).

- **File system performance**: Watching a glob pattern with FileSystemWatcher is well-supported in VSCode. With max 3 files, there's no performance concern.

- **Memory tree refresh**: MemoryManager consolidation runs every 30 minutes. The tree should refresh when memories are added/modified. Hook into MemoryManager events or watch the JSONL file.

- **Token breakdown granularity**: The bridge data provides total token counts but NOT per-category breakdowns (spec artifacts vs memories vs conversation). The per-category breakdown is only available from `WorkspaceContextProvider`'s filesystem estimation. For the tree view, we can show:
  - **Real data** (from bridge): Total tokens, utilization %, model, session activity
  - **Estimated breakdown** (from filesystem): Spec artifacts, memories, system files, observations
  - **Label clearly** which is real vs estimated

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type | Description | Impact on Implementation |
|-----------------|-------------|--------------------------|
| Hook Architecture | Hooks run as separate Node processes, can't communicate with extension directly | Must use file-based communication (bridge files) |
| Single Bridge File | All existing consumers expect one `context-bridge.json` | Need migration path, backward compat |
| VSCode TreeView API | TreeDataProvider is refresh-based, not reactive | Must explicitly call `fire()` on data changes |
| Status Bar Space | Limited real estate, currently 2 Gofer items | Can't add per-session status bars |

### Technical Debt to Avoid

| Pattern | Found In | Why Avoid | Use Instead |
|---------|----------|-----------|-------------|
| `readFileSync` in watchers | HookBridgeWatcher.ts:118 | Blocks extension host | Keep for bridge reads (files are tiny, <1KB) — acceptable |
| Single `latestData` field | HookBridgeWatcher.ts:60 | Can't track multiple sessions | Use `Map<string, BridgeData>` |
| Module-level `claudeTerminal` | autonomousCommands.ts:995 | Only tracks one terminal | Don't rely on terminal tracking — use bridge files |

### Downstream Dependencies

Code that depends on areas we're modifying:

- `extension/src/autonomous/WorkspaceContextProvider.ts` — calls `hookBridgeWatcher.getLatestData()` (single session)
- `extension/src/ui/ContextHealthStatusBar.ts` — subscribes to single-session events
- `extension/src/ui/GoferActivityStatusBar.ts` — subscribes to single-session events
- `extension/src/autonomous/AutoHandoffTrigger.ts` — triggers on single session critical
- `extension/src/autonomous/ContextUsageLogger.ts` — logs single session metrics
- `extension/src/extension.ts:356-458` — wires all components together
- `extension/src/autonomous/ContextBridgeWriter.ts` — writes enriched bridge (may need session awareness)

### Areas Requiring Extra Caution

- **HookBridgeWatcher refactoring**: This class is consumed by 5+ other components. Changes to its API (event signatures, `getLatestData()` return type) cascade widely. **Recommendation**: Create `MultiSessionBridgeWatcher` as a new class that wraps or replaces `HookBridgeWatcher`, exposing both single-session (for backward compat) and multi-session APIs.
- **package.json view changes**: Removing `goferConstitution` view ID means any code referencing it (commands, menus, when-clauses) must be updated. Search for all references.
- **Hook script atomic writes**: The current `writeBridge()` uses atomic rename. Per-session files maintain this pattern.

## Open Questions

- [ ] Should the Context Window tree show sessions that have ended (inactive) with a dimmed/grayed appearance, or only active sessions?
- [ ] When Constitution is removed as a panel section, should there be a "Show Constitution" command in the Memory tree's title bar actions?
- [ ] Should the per-session bridge files include the categorized token breakdown (spec artifacts, memories, etc.) computed by the hook, or should the extension estimate this?

## Recommendations

1. **Start with the hook script change** — switching from single to per-session bridge files is the foundation everything else builds on. This is a small, safe change.
2. **Create MultiSessionBridgeWatcher as a new class** — don't modify HookBridgeWatcher. The new class watches the `hooks/` directory for `context-bridge-*.json`, maintains `Map<sessionId, BridgeData>`, and emits multi-session events. Wrap the existing HookBridgeWatcher for backward compatibility.
3. **Build ContextWindowProvider as a 3-level tree**: Root → Session nodes → Category nodes (with token counts). This follows the ProgressProvider pattern closely.
4. **Rewrite MemoryProvider** to read from MemoryManager JSONL, group by category. Constitution appears as a special node.
5. **Keep status bar changes minimal** — add session count indicator, continue showing most active session.
6. **Wire the 4th-terminal notification** in MultiSessionBridgeWatcher — emit a `session-limit-reached` event, show `vscode.window.showInformationMessage()` in extension.ts.
