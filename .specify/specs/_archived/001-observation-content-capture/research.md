---
date: '2026-02-09T12:00:00Z'
researcher: Claude
feature: 'Observation Content Capture'
status: complete
---

# Research: Observation Content Capture

## Feature Summary

Gofer's ObservationMasker tracks every tool call Claude Code makes and
progressively compresses old observations to save context window space. The
problem: it records _that_ a tool was used, but not _what it returned_. The
`originalContent` field stores placeholder strings like
`"[Tool output from Read]"` instead of actual file contents, command output, or
search results. This makes the entire observation compression pipeline
ineffective --- you can't summarize a book when all you have is the title.

**The critical discovery from this research: Claude Code's PostToolUse hook now
passes `tool_input` and `tool_response` directly in the stdin payload.** This
eliminates the need for transcript tail-reading entirely for observation content
capture.

## Codebase Analysis

### Where to Implement

| Component                  | Location                                             | Purpose                                            |
| -------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| PostToolUse hook (active)  | `.specify/scripts/hooks/post-tool-use.mjs`           | Receives tool data from Claude Code, writes bridge |
| PostToolUse hook (bundled) | `extension/resources/hook-scripts/post-tool-use.mjs` | Packaged copy installed by migrator                |
| Bridge file                | `.specify/hooks/context-bridge.json`                 | Hook-to-extension communication channel            |
| HookBridgeWatcher          | `extension/src/autonomous/HookBridgeWatcher.ts`      | Watches bridge file, emits events                  |
| Extension bridge handler   | `extension/src/extension.ts:390-439`                 | Handles bridge-update, calls trackObservation      |
| ObservationMasker          | `extension/src/autonomous/ObservationMasker.ts`      | Stores/compresses/masks observations               |
| ContextBuilder             | `extension/src/autonomous/ContextBuilder.ts`         | Thin wrapper, delegates to ObservationMasker       |
| Observation cache          | `.specify/memory/observation-cache/index.json`       | Persisted observation store                        |
| MCP expand tool            | `language-server/src/mcp/toolHandler.ts:817`         | Retrieves masked observations                      |
| Hook installer             | `extension/src/goferMigrator.ts:1974-2056`           | Copies hooks + writes .claude/settings.json        |

### The Current Data Flow (Broken)

```
Claude Code runs a tool (e.g., Read /foo/bar.ts)
  |
  v
PostToolUse hook fires (stdin includes tool_input + tool_response -- BUT IGNORED)
  |
  v
Hook reads transcript tail (20KB), extracts ONLY token usage metadata
  |
  v
writeBridge() -> context-bridge.json: { lastToolUse: { toolName: "Read" } }
  |                                     ^ No content, no file path, no result
  v
HookBridgeWatcher detects file change -> emits 'bridge-update'
  |
  v
extension.ts handler calls:
  sharedContextBuilder.trackObservation('file_read', '[Tool output from Read]', ...)
  |                                                    ^ PLACEHOLDER STRING
  v
ObservationMasker stores placeholder, computes hash of "[Tool output from Read]"
  |
  v
generateKeyPoints() tries to extract file signatures from "[Tool output from Read]"
  -> Returns nothing useful
  |
  v
maskOldObservations() replaces placeholder with <observation_masked />
  -> Saves ~7 tokens instead of ~1000+
```

### The Fixed Data Flow (Proposed)

```
Claude Code runs a tool (e.g., Read /foo/bar.ts)
  |
  v
PostToolUse hook fires (stdin: { tool_name, tool_input, tool_response, ... })
  |
  v
Hook extracts tool_input + tool_response from stdin (NO transcript reading needed)
  |
  v
Hook writes observation content to per-observation file:
  .specify/hooks/observations/{uuid}.json
  |
  Also updates bridge with metadata pointer:
  context-bridge.json: { lastToolUse: { toolName, observationId, inputSummary } }
  |
  v
HookBridgeWatcher detects bridge change -> emits 'bridge-update'
  |
  v
extension.ts handler reads observation file, calls:
  sharedContextBuilder.trackObservation('file_read', actualFileContent, ...)
  |                                                   ^ REAL CONTENT
  v
ObservationMasker stores real content, computes meaningful hash
  |
  v
generateKeyPoints() extracts imports, function signatures, error lines
  -> Returns useful summary (e.g., "imports: fs, path; exports: readConfig, writeConfig")
  |
  v
maskOldObservations() replaces 5000-token file with 200-token key-points
  -> Saves ~4800 tokens per observation
```

### Existing Patterns to Follow

#### Pattern 1: Atomic Bridge Write

Found in: `.specify/scripts/hooks/post-tool-use.mjs:96-107`

```javascript
function writeBridge(data) {
  try {
    mkdirSync(dirname(BRIDGE_PATH), { recursive: true });
    const tmpPath = BRIDGE_PATH + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    renameSync(tmpPath, BRIDGE_PATH);
  } catch (err) {
    debug(`Bridge write error: ${err.message}`);
  }
}
```

Why relevant: All bridge writes use atomic temp+rename to prevent the VS Code
file watcher from reading partial data. New observation file writes should
follow this same pattern.

#### Pattern 2: Bridge Data Merge

Found in: `.specify/scripts/hooks/post-tool-use.mjs:109-115, 133-165`

```javascript
function readExistingBridge() {
  try {
    return JSON.parse(readFileSync(BRIDGE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}
// ... later:
const existing = readExistingBridge();
const bridge = {
  timestamp: now,
  sessionId,
  model: usage?.model || existing.model || '',
  context: usage
    ? {
        /* new data */
      }
    : existing.context || null,
  // ...
};
```

Why relevant: The hook merges new data with existing bridge state, preserving
fields that didn't change. New observation fields should follow this merge
pattern.

#### Pattern 3: Observation Cache Serialization

Found in: `extension/src/autonomous/ObservationMasker.ts:797-818`

```typescript
const serialized: SerializedCache = {
  version: 2,
  observations: Array.from(this.cache.values()),
  lastSaved: Date.now(),
};
await fs.promises.writeFile(indexPath, JSON.stringify(serialized, null, 2));
```

Why relevant: The ObservationMasker uses a single index.json for all
observations. For the hook-side observation files, we should use per-file
storage (since hooks write one observation at a time) and let the extension
consolidate into the index.

#### Pattern 4: Efficient Tail Read

Found in: `extension/src/autonomous/ClaudeSessionReader.ts:279-305`

```typescript
const start = fileSize - bytes;
const buffer = Buffer.alloc(bytes);
const fd = fs.openSync(filePath, 'r');
try {
  fs.readSync(fd, buffer, 0, bytes, start);
  return buffer.toString('utf-8');
} finally {
  fs.closeSync(fd);
}
```

Why relevant: If we still need transcript reading for token usage (which isn't
in the hook payload), this is the efficient pattern. The hook scripts currently
use the naive `readFileSync` + subarray approach.

#### Pattern 5: Tool Name to ObservationType Mapping

Found in: `extension/src/extension.ts:400-410`

```typescript
const obsType =
  toolUse.toolName.includes('Read') || toolUse.toolName.includes('read')
    ? ('file_read' as const)
    : toolUse.toolName.includes('search') || toolUse.toolName.includes('Search')
      ? ('search_result' as const)
      : toolUse.toolName.includes('test') || toolUse.toolName.includes('Test')
        ? ('test_output' as const)
        : ('command_output' as const);
```

Why relevant: This mapping determines which key-point extractor runs. With real
content, these extractors become functional. We may want to add `tool_input`
metadata (e.g., file path for Read) to the observation.

### Integration Points

1. **Hook stdin parsing** (`post-tool-use.mjs:readStdin()`): Must extract
   `tool_input` and `tool_response` from the now-richer payload. Currently only
   reads `tool_name`, `session_id`, `transcript_path`.

2. **Bridge data schema** (`HookBridgeWatcher.ts:BridgeData`): The TypeScript
   interface needs new fields for observation content or a pointer to
   per-observation files.

3. **Extension bridge handler** (`extension.ts:390-439`): Must read real content
   (from bridge or per-observation file) and pass it to `trackObservation`.

4. **ObservationMasker.trackObservation()**: No changes needed --- it already
   handles rich `originalContent`. The extractors (`extractFileKeyPoints`,
   `extractCommandKeyPoints`, etc.) are fully implemented and waiting for real
   data.

5. **Hook installer** (`goferMigrator.ts:1974-2056`): Must update the bundled
   hook scripts and potentially the `.claude/settings.json` hook configuration.

6. **MCP expand tool** (`language-server/src/mcp/toolHandler.ts:817`): Already
   reads from observation-cache. Should work with richer cached content
   automatically.

### Related Code

- `extension/src/extension.ts:390-439` - Bridge update handler (main change
  site)
- `extension/src/autonomous/ObservationMasker.ts:311-335` - trackObservation
  (receives content)
- `extension/src/autonomous/ObservationMasker.ts:484-499` - generateKeyPoints
  (routes by type)
- `extension/src/autonomous/ObservationMasker.ts:504-630` - Type-specific
  extractors (already implemented)
- `extension/src/autonomous/HookBridgeWatcher.ts:23-46` - BridgeData interface
  (needs extension)
- `extension/src/autonomous/ClaudeSessionReader.ts:9` - APPROVED_FIELDS privacy
  guard
- `.claude/settings.json:2-29` - Hook command configuration
- `extension/src/goferMigrator.ts:1974-2056` - Hook installer

## Technology Decisions

### Decision 1: Use PostToolUse Hook Payload (Not Transcript Reading)

- **Choice**: Extract `tool_input` and `tool_response` directly from the hook's
  stdin JSON payload
- **Rationale**: Claude Code's PostToolUse hook now includes full `tool_input`
  (arguments sent to the tool) and `tool_response` (the result returned). This
  is structured JSON, available immediately, and requires zero file I/O beyond
  stdin. The transcript tail-reading approach was a workaround for the old
  limited payload.
- **Alternatives considered**:
  - **Transcript JSONL reading** (Option A from problem statement): Was the best
    option when the hook only received
    `{tool_name, session_id, transcript_path}`. Now unnecessary since the data
    arrives directly.
  - **PTY terminal output parsing** (Option B): Fragile, ANSI-polluted, only
    works with Play button launch.
  - **MCP interception** (Option C): Can't see native tools (Read, Bash, etc.).

### Decision 2: Per-Observation File Storage (Not Bridge Embedding)

- **Choice**: Write observation content to individual files at
  `.specify/hooks/observations/{uuid}.json`, with the bridge carrying only a
  pointer (`observationId`).
- **Rationale**: Tool results can be large (50KB+ for full file reads). Cramming
  this into `context-bridge.json` on every tool call would: (a) make bridge
  writes slow, (b) make bridge reads slow for all consumers (status bar, health
  monitor), (c) risk data loss if the bridge is overwritten before the extension
  reads it. Per-observation files are write-once, read-once, then cleaned up.
- **Alternatives considered**:
  - **Embed in bridge**: Simpler but creates performance and data loss issues.
  - **Single observations.jsonl**: Append-only log, but harder to clean up and
    cross-reference by ID.

### Decision 3: Content Size Limits

- **Choice**: Cap stored observation content at 10KB per observation. Truncate
  larger results with a `[truncated]` marker.
- **Rationale**: The purpose is to enable meaningful key-point extraction, not
  full content replay. A 10KB cap captures the important parts of any file read
  or command output. The ObservationMasker will further compress to key-points
  (~200-500 tokens) during the decay cycle.
- **Alternatives considered**:
  - **No limit**: Risk of disk thrashing on large file reads.
  - **Smaller limit (2KB)**: Might miss important content in longer files.

### Decision 4: Keep Transcript Reading for Token Usage

- **Choice**: Continue using `extractLatestUsage()` from the transcript for
  token count data, since the hook payload doesn't include usage metrics.
- **Rationale**: The `tool_response` field contains the tool's result, not the
  API usage metadata (input_tokens, cache_read_tokens, etc.). Token usage lives
  in the `assistant` message entries in the transcript. The existing transcript
  reading code works well for this purpose.
- **Alternatives considered**:
  - **Drop usage tracking**: Would break context health monitoring.
  - **Use a separate SessionStart/Stop hook for usage**: More complex, less
    granular.

### Decision 5: Backward Compatibility

- **Choice**: Gracefully handle both old and new hook payloads. If `tool_input`
  and `tool_response` are present in stdin, use them. If not, fall back to the
  current placeholder behavior.
- **Rationale**: Users may have older versions of Claude Code that don't send
  the extended payload. The hook should not break on the old format.

## New Hook Capabilities Discovered

The research revealed that Claude Code's hook system has expanded dramatically
from 4 events to 14 events. Key new capabilities relevant to Gofer:

### PostToolUse Enhanced Payload

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/session.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "PostToolUse",
  "tool_name": "Read",
  "tool_input": {
    "file_path": "/path/to/file.ts"
  },
  "tool_response": {
    "content": "... actual file contents ..."
  },
  "tool_use_id": "toolu_01ABC123..."
}
```

### New Hook Events Worth Adopting

| Event                            | Gofer Use Case                                    |
| -------------------------------- | ------------------------------------------------- |
| `SessionStart`                   | Re-inject context after compaction; set env vars  |
| `PreCompact`                     | Auto-save session state before context compaction |
| `SubagentStart` / `SubagentStop` | Track sub-agent context usage                     |
| `PostToolUseFailure`             | Track error observations                          |
| `PermissionRequest`              | Auto-allow known-safe operations                  |

### New Hook Handler Types

| Type      | Description                      | Gofer Use Case     |
| --------- | -------------------------------- | ------------------ |
| `command` | Shell command (existing)         | Current hooks      |
| `prompt`  | Single-turn LLM evaluation       | Quality gates      |
| `agent`   | Multi-turn subagent verification | Complex validation |

### New Hook Features

- **`additionalContext`**: Inject text into Claude's context from hooks (cleaner
  than stdout)
- **`async: true`**: Run hooks in background without blocking tool execution
- **`updatedInput`** (PreToolUse): Modify tool arguments before execution
- **MCP tool matching**: Match MCP tools via `mcp__<server>__<tool>` patterns

### Claude Agent SDK

A programmatic TypeScript/Python SDK now exists
(`@anthropic-ai/claude-agent-sdk`) that provides:

- Full programmatic access to Claude Code engine as a library
- Programmatic hooks as callback functions (not just shell commands)
- MCP server integration
- Session management (resume, fork)

This could eventually replace the PTY-spawn approach in `autonomousCommands.ts`,
but that's a separate feature.

## Constraints & Considerations

- **Content size**: Tool results can be very large (entire files, long command
  outputs). Must cap at a reasonable size to avoid disk I/O bottlenecks.
- **Write frequency**: PostToolUse fires on every tool call. In an active
  session, that's multiple times per second. File writes must be fast.
- **Cleanup**: Per-observation files accumulate. Need a cleanup strategy (delete
  after extension reads, or age-based expiry).
- **Privacy**: The ClaudeSessionReader has an explicit privacy guard
  (`APPROVED_FIELDS`) that blocks access to `message.content`. The hook approach
  bypasses this since the hook is a separate process that writes to its own
  files. This is acceptable since the user opted in by installing Gofer.
- **Dual-copy sync**: Hook scripts exist in both
  `extension/resources/hook-scripts/` (bundled) and `.specify/scripts/hooks/`
  (active). Both must be updated. The migrator copies from bundled to active.
- **Backward compatibility**: Must handle older Claude Code versions that don't
  send `tool_input`/`tool_response` in the hook payload.

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type   | Description                                                     | Impact                                          |
| ----------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| Hook Protocol     | Must work within Claude Code's hook stdin/stdout contract       | Cannot modify how Claude Code invokes hooks     |
| Bridge Schema     | Existing consumers (status bar, health monitor) read BridgeData | Must extend, not replace, the interface         |
| Observation Cache | Single index.json format (version 2)                            | New content flows into existing cache structure |
| File Watcher      | HookBridgeWatcher uses VS Code FileSystemWatcher                | Limited to file-change events, no custom IPC    |

### Areas Requiring Extra Caution

- **`extension.ts:390-439`**: The bridge-update handler is the critical
  integration point. Changes here affect observation tracking, turn counting,
  cache persistence, stage detection, and health monitoring.
- **`ObservationMasker.generateKeyPoints()`**: Currently tested with placeholder
  strings. With real content, the extractors will produce different output.
  Existing tests may need updating.
- **`post-tool-use.mjs`**: This runs in a separate Node.js process spawned by
  Claude Code. It has no access to VS Code APIs or the extension's state. It can
  only communicate via the file system.

### Downstream Dependencies

- `GoferActivityStatusBar` reads `BridgeData.lastToolUse` for display
- `WorkspaceContextProvider` calls `estimateObservationTokens()` scanning the
  observation-cache directory
- `ContextHealthMonitor` uses observation counts for health calculations
- `AutoHandoffTrigger` uses health status to trigger save notifications
- `ContextHealthStatusBar` displays observation masking statistics
- MCP `gofer_expand_observation` tool reads from observation-cache

## Open Questions

- [ ] Should the `additionalContext` hook feature be used to inject observation
      summaries back into Claude's context (instead of relying on the MCP expand
      tool)?
- [ ] Should we adopt the Claude Agent SDK for the Play button integration
      instead of PTY spawning? (Separate feature, but discovered during
      research)
- [ ] What cleanup strategy for per-observation files? Age-based (delete after N
      minutes), count-based (keep last N), or read-once (delete after extension
      reads)?

## Recommendations

1. **Start with PostToolUse payload extraction** --- this is the highest-impact,
   lowest-risk change. Modify `post-tool-use.mjs` to read `tool_input` and
   `tool_response` from stdin and write per-observation files.

2. **Extend the bridge schema** with an `observationId` pointer so the extension
   knows which observation file to read.

3. **Update the extension bridge handler** to read real content from observation
   files and pass it to `trackObservation`.

4. **Add content size limits** (10KB cap) and a cleanup mechanism for
   observation files.

5. **Adopt new hook events incrementally** --- `PreCompact` and `SessionStart`
   are the most valuable for context management.

6. **Update both hook copies** (bundled + active) and ensure the migrator
   handles the upgrade.

7. **Keep transcript reading for token usage** since that data isn't in the hook
   payload.
