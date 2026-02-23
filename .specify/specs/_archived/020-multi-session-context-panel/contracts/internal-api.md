# Internal API Contracts: Multi-Session Context Panel

## MultiSessionBridgeWatcher

### Interface

```typescript
interface IMultiSessionBridgeWatcher extends EventEmitter, vscode.Disposable {
  /** Start watching for per-session bridge files */
  start(): void;

  /** Get all tracked sessions */
  getSessions(): Map<string, BridgeData>;

  /** Get the most recently active session */
  getFocusedSession(): BridgeData | null;

  /** Get the number of tracked sessions */
  getSessionCount(): number;

  /** Check if any session has real (non-estimated) data */
  hasRealData(): boolean;

  /** Dispose of all watchers and timers */
  dispose(): void;
}
```

### Events

| Event                    | Payload                                                             | When Emitted                  |
| ------------------------ | ------------------------------------------------------------------- | ----------------------------- |
| `session-update`         | `{ sessionId: string, data: BridgeData }`                           | Any bridge file changes       |
| `session-added`          | `{ sessionId: string, data: BridgeData }`                           | New session detected          |
| `session-removed`        | `{ sessionId: string, reason: 'stale' \| 'inactive' \| 'evicted' }` | Session removed from registry |
| `session-limit-reached`  | `{ evictedSessionId: string, newSessionId: string }`                | 4th session triggers eviction |
| `focused-session-change` | `{ sessionId: string, data: BridgeData }`                           | Most active session changes   |

### Backward Compatibility

The `MultiSessionBridgeWatcher` also exposes the legacy single-session API for
existing consumers:

```typescript
/** Legacy API for existing consumers (returns focused session) */
getLatestData(): BridgeData | null;
isHookDataAvailable(): boolean;
isDataStale(): boolean;
```

Legacy events still emitted for the focused session:

- `bridge-update` (BridgeData) — emitted with focused session data
- `session-start` (BridgeData) — emitted when focused session starts
- `session-end` (BridgeData | null) — emitted when focused session ends
- `session-stale` (BridgeData) — emitted when focused session becomes stale

---

## ContextWindowProvider

### Interface

```typescript
interface IContextWindowProvider
  extends vscode.TreeDataProvider<ContextWindowItem> {
  /** Standard TreeDataProvider methods */
  getTreeItem(element: ContextWindowItem): vscode.TreeItem;
  getChildren(element?: ContextWindowItem): Promise<ContextWindowItem[]>;
  onDidChangeTreeData: vscode.Event<
    ContextWindowItem | undefined | null | void
  >;

  /** Refresh tree data */
  refresh(): void;

  /** Connect to multi-session watcher for updates */
  setWatcher(watcher: IMultiSessionBridgeWatcher): void;

  /** Dispose resources */
  dispose(): void;
}
```

### Tree Item Types

```typescript
type ContextWindowItemKind = 'session' | 'category' | 'info' | 'empty';

class ContextWindowItem extends vscode.TreeItem {
  kind: ContextWindowItemKind;
  sessionId?: string;
  categoryName?: string;
  tokenCount?: number;
}
```

### Tree Structure Contract

```
Root (no element):
  → Returns: SessionItem[] (up to 3) or EmptyStateItem[]

SessionItem (kind: 'session'):
  → Label: "Session {shortId} ({model})"
  → Description: "{utilization}%"
  → Icon: pulse (active), clock (stale), circle-slash (inactive)
  → Color: green (<50%), yellow (50-70%), red (>70%)
  → Collapsible: Yes
  → Children: CategoryItem[]

CategoryItem (kind: 'category'):
  → Label: "{categoryName}"
  → Description: "{tokenCount} tokens" or "~{tokenCount} tokens (est.)"
  → Icon: category-specific (file-code, brain, gear, comment, terminal, eye-closed)
  → Collapsible: No
```

---

## MemoryProvider (Rewritten)

### Interface

```typescript
interface IMemoryProvider extends vscode.TreeDataProvider<MemoryTreeItem> {
  getTreeItem(element: MemoryTreeItem): vscode.TreeItem;
  getChildren(element?: MemoryTreeItem): Promise<MemoryTreeItem[]>;
  onDidChangeTreeData: vscode.Event<MemoryTreeItem | undefined | null | void>;

  /** Refresh from MemoryManager */
  refresh(): void;

  /** Set the MemoryManager instance for data access */
  setMemoryManager(manager: MemoryManager): void;

  dispose(): void;
}
```

### Tree Item Types

```typescript
type MemoryTreeItemKind = 'category' | 'memory' | 'constitution' | 'info';

class MemoryTreeItem extends vscode.TreeItem {
  kind: MemoryTreeItemKind;
  category?: string;
  memory?: Memory;
}
```

### Tree Structure Contract

```
Root (no element):
  → Returns: [ConstitutionItem, ...CategoryItem[]] or EmptyStateItem[]

ConstitutionItem (kind: 'constitution'):
  → Label: "Constitution"
  → Description: "Project principles"
  → Icon: law
  → Command: open constitution.md
  → Collapsible: No

CategoryItem (kind: 'category'):
  → Label: "{displayName}"
  → Description: "{count} entries"
  → Icon: category-specific
  → Collapsible: Yes (if count > 0), No (if count == 0)
  → Children: MemoryItem[]

MemoryItem (kind: 'memory'):
  → Label: truncated content (first 60 chars)
  → Description: "{category} • {relativeTime}"
  → Icon: symbol-key (semantic), lightbulb (episodic), book (procedural)
  → Tooltip: full content + metadata
  → Command: open memory note or show detail
  → Collapsible: No
```

### Category Mapping

| Memory.category | Display Name | Icon             |
| --------------- | ------------ | ---------------- |
| discovery       | Discovery    | search           |
| pattern         | Patterns     | symbol-pattern   |
| decision        | Decisions    | law              |
| learning        | Learnings    | mortar-board     |
| journey         | Journeys     | map              |
| architecture    | Architecture | symbol-structure |
| debug           | Debug        | debug            |
| (other)         | Other        | tag              |

---

## Hook Script Contract

### Input (stdin JSON)

```json
{
  "session_id": "string",
  "tool_name": "string",
  "transcript_path": "string",
  "tool_input": {},
  "tool_response": "string | object",
  "tool_use_id": "string"
}
```

### Output Bridge File

**Old path**: `.specify/hooks/context-bridge.json` **New path**:
`.specify/hooks/context-bridge-{session_id}.json`

Schema unchanged (BridgeData interface).

### Migration Contract

The hook script writes to BOTH paths during transition:

1. Per-session file: `context-bridge-{session_id}.json` (primary)
2. Legacy file: `context-bridge.json` (for backward compat with older extension
   versions)

This dual-write can be removed in a future release.

---

## Status Bar Contract

### Display Format

| Sessions   | Display                                  |
| ---------- | ---------------------------------------- |
| 0 sessions | `$(pulse) Context: --`                   |
| 1 session  | `$(check) Context: 54% (Opus) [1/3]`     |
| 2 sessions | `$(check) Context: 54% (Opus) [2/3]`     |
| 3 sessions | `$(warning) Context: 71% (Sonnet) [3/3]` |

The percentage and color reflect the **focused session** (most recently active).
The `[N/3]` suffix shows the tracked session count.
