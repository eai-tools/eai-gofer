---
date: '2026-02-11T14:50:00Z'
researcher: Claude
feature: 'Context Item Click-to-View'
status: complete
---

# Research: Context Item Click-to-View

## Feature Summary

Make category items in the Context Window tree view (Spec Artifacts,
Memories/Hints, System Files, Conversation History, Tool Outputs, Masked
Observations) clickable. Clicking opens a rich webview panel showing the actual
content of that category in formatted HTML — not raw token counts.

## Codebase Analysis

### Where to Implement

| Component             | Location                                        | Purpose                                                 |
| --------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| ContextWindowProvider | `extension/src/contextWindowProvider.ts`        | Add `.command` property to category items               |
| ContextContentPanel   | `extension/src/ui/ContextContentPanel.ts` (NEW) | Singleton webview panel for displaying category content |
| Extension entry point | `extension/src/extension.ts`                    | Register `gofer.showContextCategoryContent` command     |
| Package manifest      | `extension/package.json`                        | Declare new command                                     |
| Hook script           | `.specify/scripts/hooks/post-tool-use.mjs`      | Already captures observation files — no changes needed  |

### Data Architecture: What Content Is Available?

This is the critical finding. The bridge data
(`context-bridge-{sessionId}.json`) contains **only metadata** — token counts,
model info, session state. It does NOT contain actual file contents,
conversation text, or memory strings.

**Per-category content sources:**

| Category             | Content Source                                                           | Available?                                                    | Format                                             |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------- |
| Spec Artifacts       | `.specify/specs/{feature}/` files (spec.md, plan.md, tasks.md)           | Yes — read from disk                                          | Markdown files                                     |
| Memories/Hints       | `MemoryManager.load('both')` via MemoryStorage JSONL                     | Yes — via MemoryManager                                       | JSON objects with `.content`, `.category`, `.tags` |
| System Files         | CLAUDE.md, AGENTS.md, constitution.md                                    | Yes — read from disk                                          | Markdown/text files                                |
| Conversation History | Claude Code transcript JSONL (`~/.claude/projects/.../transcript.jsonl`) | Partial — via `transcript_path` in bridge data; can tail-read | JSONL with `{type, message, usage}` entries        |
| Tool Outputs         | `.specify/hooks/observations/{uuid}.json`                                | Yes — observation files captured by hook                      | JSON with `{toolName, toolInput, toolResponse}`    |
| Masked Observations  | Same observation files, but older/masked ones                            | Yes — same directory, filter by age                           | JSON                                               |

**Key insight**: The `EnrichedContextBridge`
(`extension/src/autonomous/ContextBridgeWriter.ts`) has a `sections` object with
`constitution`, `hints`, `memories`, `research`, and `code` strings — but this
file is NOT always present (it requires a ContextBuilder run for an active
task). We should NOT depend on it.

**Recommended approach**: For each category, read directly from the known file
locations:

1. **Spec Artifacts** → Glob `.specify/specs/*/` and list spec files with
   previews
2. **Memories/Hints** → Read `.specify/memory/*.jsonl` and render memory entries
3. **System Files** → Read CLAUDE.md, AGENTS.md, constitution.md
4. **Conversation History** → Show token breakdown from bridge data (actual
   transcript too large/private)
5. **Tool Outputs** → Read recent observation files from
   `.specify/hooks/observations/`
6. **Masked Observations** → Same observations directory, show masked/older
   entries

### Existing Patterns to Follow

#### Pattern 1: Singleton Webview Panel (MemoryPanel)

Found in: `extension/src/ui/MemoryPanel.ts`

```typescript
public static createOrShow(extensionUri: vscode.Uri, memoryManager: MemoryManager): MemoryPanel {
  if (MemoryPanel.currentPanel) {
    MemoryPanel.currentPanel.panel.reveal(column);
    return MemoryPanel.currentPanel;
  }
  const panel = vscode.window.createWebviewPanel(
    'goferMemories', 'Gofer Memories',
    column || vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri] }
  );
  MemoryPanel.currentPanel = new MemoryPanel(panel, memoryManager);
  return MemoryPanel.currentPanel;
}
```

Why relevant: The new `ContextContentPanel` should follow the same singleton
pattern — one panel instance that updates content when different categories are
clicked.

#### Pattern 2: Tree Item Click Command

Found in: `extension/src/memoryProvider.ts:192-196`,
`extension/src/progressProvider.ts:36`

```typescript
item.command = {
  command: 'gofer.showMemoryDocument',
  title: 'Show Memory',
  arguments: [memory],
};
```

Why relevant: Category items in `contextWindowProvider.ts` need the same
pattern, passing `sessionId` and `categoryName` as arguments.

#### Pattern 3: Command Registration with Lazy Import

Found in: `extension/src/extension.ts:937-976`

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand(
    'gofer.showSpecDetails',
    async (spec: any) => {
      const { showSpecDetailsWebview } = await import('./webviewHelpers');
      showSpecDetailsWebview(context, spec);
    }
  )
);
```

Why relevant: The new command should use the same lazy import pattern and
register in `registerGlobalCommands()` (not `registerCommands()`) since tree
items need it immediately.

#### Pattern 4: HTML Generation with VSCode CSS Variables

Found in: `extension/src/ui/MemoryPanel.ts:192-403`,
`extension/src/webviewHelpers.ts:237-633`

```css
body {
  font-family: var(--vscode-font-family);
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
}
.card {
  background-color: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-panel-border);
}
```

Why relevant: All webview HTML must use VSCode theme variables for dark/light
theme compatibility.

### Integration Points

1. **contextWindowProvider.ts:162-171** — `getCategoryItems()` method where
   `.command` must be added to each category item. Also need to store
   `sessionId` on category items.
2. **extension.ts:794-1000** — `registerGlobalCommands()` where the new command
   handler must be registered.
3. **extension/package.json:40-222** — `contributes.commands` where the new
   command must be declared.
4. **MultiSessionBridgeWatcher** — `getSessions()` method provides the session
   data; need `getSessionData(sessionId)` to pass to the panel.

### Related Code

- `extension/src/contextWindowProvider.ts:155-172` — getCategoryItems() method
  to modify
- `extension/src/ui/MemoryPanel.ts` — Pattern to follow for new panel
- `extension/src/extension.ts:916` — Existing refreshContextWindow command
  nearby
- `extension/src/webviewHelpers.ts:237-633` — HTML generator patterns
- `extension/src/autonomous/HookBridgeWatcher.ts:23-50` — BridgeData interface
- `extension/src/autonomous/MultiSessionBridgeWatcher.ts` — Session data access
- `.specify/scripts/hooks/post-tool-use.mjs:157-182` — Observation file writing

## Technology Decisions

### Decision 1: Singleton Webview Panel vs Disposable Panels

- **Choice**: Singleton panel that updates content when different categories are
  clicked
- **Rationale**: Avoids tab proliferation; user clicks different categories and
  content updates in the same panel (like clicking different links in a
  sidebar). Follows the MemoryPanel pattern.
- **Alternatives considered**: Disposable panels (one per click) — rejected
  because 6 categories × N sessions = too many tabs

### Decision 2: Content Resolution Strategy

- **Choice**: Read content directly from known file locations per category, not
  from bridge data
- **Rationale**: Bridge data contains only token metadata, not actual content.
  The EnrichedContextBridge (`enriched-context.json`) is not always present.
  Reading from disk is reliable and gives us the actual formatted content.
- **Alternatives considered**: Depending on EnrichedContextBridge — rejected
  because it requires ContextBuilder to have run for a specific task

### Decision 3: Conversation History Display

- **Choice**: Show token breakdown summary with recent tool activity (from
  bridge data), not full transcript
- **Rationale**: The Claude Code transcript JSONL file is in the user's home
  directory (not workspace), can be very large, and contains raw API payloads.
  Displaying it as formatted text would require extensive parsing. The bridge
  data already has the useful summary.
- **Alternatives considered**: Parsing full transcript — rejected due to size,
  privacy, and complexity

## Constraints & Considerations

- **Session-scoped content**: When clicking a category under a specific session,
  the panel should show content relevant to THAT session. However, Spec
  Artifacts, Memories, and System Files are workspace-global (same for all
  sessions). Only Tool Outputs and Conversation History are session-specific.
- **No enriched context dependency**: The `enriched-context.json` file may not
  exist — must handle gracefully
- **Observation file cleanup**: Old observation files accumulate in
  `.specify/hooks/observations/`. The panel should show only recent ones (last N
  or since session start).
- **HTML escaping**: All file content displayed in webview must be HTML-escaped
  to prevent XSS. Use the `escapeHtml()` pattern from MemoryPanel.
- **File encoding**: All files are UTF-8 text (markdown, JSON, JSONL). No binary
  format handling needed.

## Brownfield Analysis

### Downstream Dependencies

Code that depends on `contextWindowProvider.ts`:

- `extension/src/extension.ts:185` — Registers `goferContextWindow` tree data
  provider
- `extension/src/extension.ts:404` — Calls
  `contextWindowProvider.setWatcher(multiSessionWatcher)`
- `tests/unit/contextWindowProvider.test.ts` — Unit tests

### Areas Requiring Extra Caution

- **ContextWindowItem class**: Adding `sessionId` to category-level items is a
  change. Currently `sessionId` is only set on session-level items. Need to
  propagate it through `getCategoryItems()`.
- **Command registration in registerGlobalCommands()**: Per MEMORY.md learning,
  commands linked to tree items MUST be registered globally. The click handler
  must go in `registerGlobalCommands()`, NOT in the async `registerCommands()`.

## Open Questions

- [ ] Should clicking a session-level item (not just category items) also open
      the panel with a session overview?
- [ ] Should the panel auto-refresh when bridge data updates, or only refresh on
      click?

## Recommendations

1. Create `extension/src/ui/ContextContentPanel.ts` as a singleton webview
   following MemoryPanel pattern
2. Add `.command` to category items in
   `contextWindowProvider.ts:getCategoryItems()` — pass both `sessionId` and
   `categoryName`
3. Register `gofer.showContextCategoryContent` in `registerGlobalCommands()`
   with lazy import
4. For each category, implement a dedicated HTML section renderer that reads
   from the appropriate source
5. Also add `.command` to session-level items to show a session overview panel
6. Add the command to `extension/package.json` contributes.commands
