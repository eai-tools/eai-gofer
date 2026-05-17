---
date: '2026-01-29T11:00:00Z'
researcher: Claude
feature: 'Real Context Window Monitoring & Continuous Memory Updates'
status: complete
---

# Research: Real Context Window Monitoring & Continuous Memory Updates

## Feature Summary

Replace the filesystem-based token estimation in Gofer's context health
monitoring with real token usage data from Claude Code's JSONL session logs. The
current system scans `.specify/` directory sizes and divides by 4, producing
meaningless numbers (e.g., "225%" for workspaces with large spec files). The
real data — actual input/output/cache tokens per API call — is available in
`~/.claude/projects/{encoded-workspace}/{session-id}.jsonl` and is safely
readable during active sessions.

Additionally, enable continuous memory updates so that as Gofer pipeline stages
execute, decisions, observations, and progress are automatically persisted to
the memory system.

## Codebase Analysis

### Where to Implement

| Component                | Location                                                        | Purpose                                              |
| ------------------------ | --------------------------------------------------------------- | ---------------------------------------------------- |
| ClaudeSessionReader      | `extension/src/autonomous/ClaudeSessionReader.ts` (NEW)         | Read JSONL logs from `~/.claude/projects/`           |
| WorkspaceContextProvider | `extension/src/autonomous/WorkspaceContextProvider.ts` (MODIFY) | Replace filesystem estimation with real session data |
| ContextHealthMonitor     | `extension/src/autonomous/ContextHealthMonitor.ts` (MODIFY)     | Update effective context limit per model             |
| ContextHealthStatusBar   | `extension/src/ui/ContextHealthStatusBar.ts` (MINOR)            | Display real vs estimated indicator                  |
| Extension wiring         | `extension/src/extension.ts` (MODIFY)                           | Wire session reader, update initialization           |
| ContinuousMemoryWriter   | `extension/src/autonomous/ContinuousMemoryWriter.ts` (NEW)      | Auto-persist pipeline decisions to memory            |

### Data Source: Claude Code JSONL Session Logs

#### Location

```
~/.claude/projects/{encoded-workspace-path}/{session-id}.jsonl
```

**Path encoding**: Workspace path with `/` replaced by `-`

- `/Users/douglaswross/Code/eai-gofer` → `-Users-douglaswross-Code-gofer`
- Extension has `workspacePath` → can compute encoded path

#### Session Discovery

```
~/.claude/projects/{encoded-workspace-path}/sessions-index.json
```

Contains:

```json
{
  "version": 1,
  "entries": [
    {
      "sessionId": "f36d63ea-d50c-4c34-81e6-cdb049708228",
      "fullPath": "/Users/douglaswross/.claude/projects/.../session.jsonl",
      "fileMtime": 1769639208593,
      "firstPrompt": "...",
      "summary": "...",
      "messageCount": 30,
      "created": "2026-01-28T21:25:35.261Z",
      "modified": "2026-01-28T21:55:00.300Z",
      "gitBranch": "main",
      "projectPath": "/Users/douglaswross/Code/eai-gofer",
      "isSidechain": false
    }
  ],
  "originalPath": "/Users/douglaswross/Code/eai-gofer"
}
```

#### Active Session Detection

Lock files at `~/.claude/ide/{port}.lock` contain workspace info:

```json
{
  "pid": 75472,
  "workspaceFolders": ["/Users/douglaswross/Code/eai-gofer"],
  "ideName": "Visual Studio Code",
  "transport": "ws",
  "authToken": "..."
}
```

Can cross-reference lock files with sessions-index to find the active session.

#### JSONL Message Format

Six message types found: `file-history-snapshot`, `user`, `assistant`,
`progress`, `system`, `queue-operation`

**Only `assistant` messages have `usage` data:**

```json
{
  "type": "assistant",
  "sessionId": "f36d63ea-...",
  "timestamp": "2026-01-28T22:26:51.755Z",
  "message": {
    "model": "claude-opus-4-5-20251101",
    "usage": {
      "input_tokens": 3,
      "cache_creation_input_tokens": 40779,
      "cache_read_input_tokens": 0,
      "cache_creation": {
        "ephemeral_5m_input_tokens": 0,
        "ephemeral_1h_input_tokens": 40779
      },
      "output_tokens": 2,
      "service_tier": "standard"
    }
  }
}
```

**Context size calculation**:
`input_tokens + cache_creation_input_tokens + cache_read_input_tokens` = total
context tokens for that turn.

**Confirmed**: JSONL files are safely readable during active sessions (no file
locking). Successfully read 1530 entries from the current active session
mid-conversation.

#### Model Context Limits

| Model                      | Context Window | Effective (High Accuracy) |
| -------------------------- | -------------- | ------------------------- |
| claude-opus-4-5-20251101   | 200,000        | 120,000-150,000           |
| claude-sonnet-4-5-20250929 | 200,000        | 60,000-120,000            |

The model ID is available in each assistant message, so the context limit can be
determined dynamically.

### Existing Patterns to Follow

#### Pattern 1: JSONL Reading (ContextUsageLogger)

Found in: `extension/src/autonomous/ContextUsageLogger.ts:528-546`

```typescript
async readLog(limit?: number): Promise<ContextUsageLogEntry[]> {
  const content = await fs.promises.readFile(logPath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  const entries = lines.map((line) => JSON.parse(line));
  if (limit) return entries.slice(-limit);
  return entries;
}
```

Why relevant: Same JSONL read pattern needed for Claude session logs. However,
session logs can be 6+ MB — need tail-reading optimization.

#### Pattern 2: FileSystemWatcher with Cache Invalidation

Found in: `extension/src/council/ConfigLoader.ts:148-193`

```typescript
this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
this.fileWatcher.onDidChange(async () => {
  await this.handleConfigChange();
});
```

Why relevant: Watch the JSONL file for new entries and refresh token counts.

#### Pattern 3: Periodic Polling with Start/Stop

Found in: `extension/src/autonomous/ContextHealthMonitor.ts:419-446`

```typescript
startMonitoring(intervalMs?: number): void {
  this.monitoringInterval = setInterval(() => {
    this.checkHealth();
  }, interval);
}
```

Why relevant: Poll JSONL file on interval rather than watching (since
append-only files may not trigger FileSystemWatcher reliably).

#### Pattern 4: Session Detection via Context Flag

Found in: `extension/src/extension.ts:50` and
`extension/src/autonomousCommands.ts:697`

```typescript
await vscode.commands.executeCommand(
  'setContext',
  'gofer.claudeCodeRunning',
  true
);
```

Why relevant: Know when Claude Code is active to start/stop session monitoring.

### Integration Points

1. **WorkspaceContextProvider.getContextAnalysis()** — Replace filesystem
   scanning with JSONL tail-read. Currently returns `conversation: 0` hardcoded.

2. **ContextHealthMonitor config** — `effectiveContextLimit: 120000` is
   hardcoded. Should be dynamic based on model from JSONL.

3. **extension.ts:initializeContextHealthMonitoring()** — Wire the new
   ClaudeSessionReader as the data source.

4. **ContextHealthStatusBar** — Already handles the display. Just needs real
   data fed in. May want to indicate "Real" vs "Estimated" mode.

5. **MemoryManager.save()** — Already fully implemented. ContinuousMemoryWriter
   just needs to call it at appropriate pipeline events.

6. **ContextBuilder events** — Already emits events during context building.
   ContinuousMemoryWriter can listen for decisions and persist them.

### Related Code

- `extension/src/autonomous/WorkspaceContextProvider.ts` — Replace entirely
- `extension/src/autonomous/ContextHealthMonitor.ts:112` —
  `effectiveContextLimit` default
- `extension/src/autonomous/ContextHealthMonitor.ts:174` — `estimateTokens()`
  method
- `extension/src/autonomous/ContextHealthMonitor.ts:453` — `checkHealth()` entry
  point
- `extension/src/ui/ContextHealthStatusBar.ts:196` — `updateDisplay()` rendering
- `extension/src/autonomous/MemoryManager.ts:86` — `save()` method
- `extension/src/autonomous/ContextBuilder.ts:224` — emits events during
  building
- `extension/src/extension.ts:292` — `initializeContextHealthMonitoring()`

## Technology Decisions

### Decision 1: Reading Strategy for JSONL

- **Choice**: Tail-read last N lines (not full file read)
- **Rationale**: Session logs can be 6+ MB with 1500+ entries. Only need the
  last assistant message for current token count. Use `fs.promises.stat()` to
  get file size, then `fs.createReadStream()` with byte offset to read only the
  tail.
- **Alternatives considered**: Full file read (too slow for 6MB on 30s
  interval), fs.watch (unreliable for append-only files on macOS)

### Decision 2: Session Discovery

- **Choice**: Use sessions-index.json + file modification time to find the most
  recent session
- **Rationale**: Sessions-index has session metadata including `modified`
  timestamp. Pick the most recently modified non-sidechain session.
  Cross-reference with lock files for active session confirmation.
- **Alternatives considered**: Parse all JSONL files (too slow), use lock files
  only (doesn't give session ID reliably)

### Decision 3: Polling vs Watching

- **Choice**: Polling on 10-second interval (configurable)
- **Rationale**: `fs.watch` on macOS with JSONL append-only files is unreliable
  (may not fire on every append). Polling at 10s is cheap for a stat+tail-read
  operation and provides responsive status bar updates.
- **Alternatives considered**: FileSystemWatcher (unreliable for appends),
  fs.watchFile (uses polling internally anyway)

### Decision 4: Context Limit per Model

- **Choice**: Lookup table mapping model IDs to context window sizes
- **Rationale**: The model ID is in every assistant message. A simple map gives
  us the correct limit. Default to 200,000 for unknown models.
- **Alternatives considered**: Hardcoded single value (current approach, wrong
  for multi-model), API call to get model info (unnecessary network request)

### Decision 5: Continuous Memory Persistence

- **Choice**: Listen to ContextBuilder and pipeline stage events, auto-save key
  decisions
- **Rationale**: The ContextBuilder already emits events during context
  building. Pipeline stages (research, specify, plan, etc.) produce discoverable
  decisions. Auto-saving these means `/7_gofer_save` captures richer state.
- **Alternatives considered**: Manual-only memory saves (current approach,
  easily forgotten), save everything (too noisy)

## Constraints & Considerations

- **Privacy**: The JSONL logs contain conversation content. The extension should
  only read `usage` fields and metadata, never message content. This is a hard
  constraint.
- **Cross-platform paths**: `~/.claude/` path resolution must use
  `os.homedir()`, not hardcoded Unix paths.
- **File size**: Session logs grow to 6+ MB. Must not read the entire file on
  every poll cycle.
- **Multiple sessions**: A workspace may have multiple sessions (past and
  current). Need to identify the active one.
- **No active session**: When no Claude Code session is running, fall back to
  filesystem estimation or show "No active session".
- **Extension host vs Claude Code**: The extension runs in the VS Code extension
  host process, which is separate from Claude Code's Node process. They share
  the filesystem but not memory.

## Brownfield Analysis

### Constraints & Limitations

| Constraint               | Description                                                          | Impact                                                             |
| ------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Node-pty mismatch        | Extension host uses different Node.js than node-pty was compiled for | Cannot test Claude Code launch in dev host — structural tests only |
| WorkspaceContextProvider | Already wired into monitoring pipeline                               | Must maintain same interface or update all consumers               |
| effectiveContextLimit    | Hardcoded at 120,000                                                 | Must make dynamic without breaking existing configs                |
| Status bar format        | Users expect "Context: N%" format                                    | Can enhance but not radically change                               |

### Downstream Dependencies

- `ContextHealthMonitor.checkHealth()` — consumes
  `WorkspaceContextProvider.getContextAnalysis()`
- `ContextHealthStatusBar` — consumes `ContextHealthMonitor` events
- `AutoHandoffTrigger` — consumes `ContextHealthMonitor` events
- `ContextUsageLogger` — receives health check events
- MCP tool `gofer_get_context_health` — reads
  `.specify/memory/context-health-state.json`
- `ContextBridgeWriter` — uses budget data from `ContextBuilder`

### Protected Boundaries

- `ContextHealthMonitor` event interface (`healthy`, `warning`, `critical`) —
  must not change
- `ContextHealthStatus` interface shape — consumers depend on it
- `.specify/memory/context-health-state.json` format — MCP tool reads it
- Memory interface (`Memory` type) — well-established, many consumers

## Open Questions

- [x] Is the JSONL readable during active sessions? **YES** — confirmed, no file
      locking
- [x] How to map workspace path to project directory?
      **`path.replace('/', '-')`**
- [ ] Should the status bar show "Real" vs "Estimated" mode indicator?
- [ ] What pipeline events should trigger automatic memory saves?

## Recommendations

1. **Create ClaudeSessionReader** as a standalone class that encapsulates all
   JSONL reading, session discovery, and tail-reading logic. This isolates the
   `~/.claude/` dependency.

2. **Modify WorkspaceContextProvider** to accept either a ClaudeSessionReader
   (real data) or fall back to filesystem estimation when no session is active.

3. **Make context limit model-aware** by reading the model ID from the last
   assistant message and looking up the correct window size.

4. **Poll every 10 seconds** during active sessions, fall back to 30 seconds
   when no session detected.

5. **Create ContinuousMemoryWriter** that listens to ContextBuilder events and
   pipeline stage completions to auto-persist decisions.

6. **Never read message content** from JSONL — only `usage`, `type`,
   `timestamp`, `model`, and `sessionId` fields. This preserves conversation
   privacy.
