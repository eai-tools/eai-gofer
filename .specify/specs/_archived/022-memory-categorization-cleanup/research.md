---
date: '2026-02-11T23:15:00Z'
researcher: Claude
feature: '022-memory-categorization-cleanup'
status: complete
---

# Research: Memory Categorization Cleanup

## Feature Summary

The word "memory" is overloaded across the Gofer codebase. It refers to:

1. The **learning/recall system** (memories.jsonl, MemoryManager, memory
   commands)
2. The **`.specify/memory/` folder** (a pipeline artifact storage location)
3. **Context management** (context health, observation masking, budget
   allocation)

Constitution lives in `.specify/memory/` but is a conceptually separate system.
The 3 sidebar panels (Memory, Context Window, Constitution) have blurred
boundaries in code despite being independent at the UI level.

**Goal**: Establish clear naming and boundaries so each system has a distinct,
non-overlapping identity in both code and UI.

## Codebase Analysis

### Current State: Three Panel Systems

#### Panel 1: Memory (Learning & Recall)

| Component                | Location                                             | Purpose                                          |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------ |
| `MemoryProvider`         | `extension/src/memoryProvider.ts:71`                 | Tree view showing memories by category           |
| `MemoryManager`          | `extension/src/autonomous/MemoryManager.ts`          | CRUD for memories (save/load/search/consolidate) |
| `MemoryStorage`          | `extension/src/autonomous/MemoryStorage.ts`          | JSONL persistence for memories                   |
| `MemoryConsolidator`     | `extension/src/autonomous/MemoryConsolidator.ts`     | Dedup, compaction, priority decay                |
| `MemoryLayerManager`     | `extension/src/autonomous/MemoryLayerManager.ts`     | MemGPT 3-layer architecture                      |
| `MemoryHookManager`      | `extension/src/autonomous/MemoryHookManager.ts`      | Auto-capture from tool calls                     |
| `ContinuousMemoryWriter` | `extension/src/autonomous/ContinuousMemoryWriter.ts` | Auto-persist during pipeline                     |
| `CitationVerifier`       | `extension/src/autonomous/CitationVerifier.ts`       | Validates file path citations                    |
| `KnowledgeGraph`         | `extension/src/autonomous/KnowledgeGraph.ts`         | Entity relationship graph                        |
| `MemoryPanel`            | `extension/src/ui/MemoryPanel.ts`                    | Searchable webview for memories                  |
| `memoryCommands`         | `extension/src/commands/memoryCommands.ts`           | Command handlers (remember/search/forget/etc.)   |

**Memory commands**: `gofer.remember`, `gofer.searchMemory`,
`gofer.forgetMemory`, `gofer.clearMemory`, `gofer.viewMemories`,
`gofer.viewCompactionHistory`, `gofer.createHintFile`,
`gofer.showMemoryDocument`, `gofer.showMemorySection`, `gofer.refreshMemory`

**View**: `goferMemory` (name: "Memory", icon: `$(database)`, contextualTitle:
"Project Memory")

#### Panel 2: Context Window (Context Health & Budget)

| Component                | Location                                           | Purpose                             |
| ------------------------ | -------------------------------------------------- | ----------------------------------- |
| `ContextWindowProvider`  | `extension/src/contextWindowProvider.ts:62`        | Tree view showing context breakdown |
| `ContextBuilder`         | `extension/src/autonomous/ContextBuilder.ts`       | Central context assembly            |
| `ContextHealthMonitor`   | `extension/src/autonomous/ContextHealthMonitor.ts` | Token tracking, health thresholds   |
| `ObservationMasker`      | `extension/src/autonomous/ObservationMasker.ts`    | 3-tier decay of tool outputs        |
| `StageContextProfile`    | `extension/src/autonomous/StageContextProfile.ts`  | Per-stage budget allocation         |
| `AutoHandoffTrigger`     | `extension/src/autonomous/AutoHandoffTrigger.ts`   | Auto-save at critical context       |
| `ContextUsageLogger`     | `extension/src/autonomous/ContextUsageLogger.ts`   | JSONL logging of context events     |
| `ContextContentPanel`    | `extension/src/ui/ContextContentPanel.ts`          | Click-to-view category content      |
| `ContextHealthStatusBar` | `extension/src/ui/ContextHealthStatusBar.ts`       | Green/yellow/red status bar         |

**Context commands**: `gofer.refreshContextWindow`,
`gofer.showContextCategoryContent`

**View**: `goferContextWindow` (name: "Context Window", icon: `$(pulse)`,
contextualTitle: "Context Health")

#### Panel 3: Constitution (Project Standards - No Sidebar Panel)

| Component              | Location                                   | Purpose                                       |
| ---------------------- | ------------------------------------------ | --------------------------------------------- |
| `ConstitutionProvider` | `extension/src/constitutionProvider.ts:60` | Parses constitution.md into articles/sections |
| `goferMigrator`        | `extension/src/goferMigrator.ts:1035`      | Creates constitution from template            |

**Constitution commands**: `gofer.showConstitution`,
`gofer.refreshConstitution`, `gofer.showSectionDetails`,
`gofer.showArticleDetails`

**View**: `goferConstitution` defined in `config.ts:58` but **NOT registered as
a sidebar panel** since spec 020. Accessible only via Command Palette and a
toolbar button on the Memory panel.

### Where the Boundaries Are Blurred

#### Problem 1: MemoryProvider Shows Observations (Context Window Concern)

`memoryProvider.ts:142-153` — The Memory panel has an "Observations" root
section that shows tool output counts from `observations.jsonl` and the
observation cache. This is a Context Window concept (tool outputs, masking)
displayed in the Memory panel.

```
Memory Panel Tree:
  Memories (3)           ← True memory concern
  Observations (849)     ← CONTEXT WINDOW concern
  Checkpoints (3)        ← Session management concern
  Decisions (1 ADRs)     ← Could be memory OR constitution
```

#### Problem 2: Constitution Button Lives on Memory Panel

`package.json:320-322` — The "Show Constitution" button is a navigation toolbar
button on the Memory panel (`when: "view == goferMemory"`). This creates a UX
association between Constitution and Memory.

#### Problem 3: ContextBuilder Treats Constitution as Memory Budget

`ContextBuilder.ts:464-467`:

```typescript
const usage = {
  memory:
    this.estimateTokens(sections.memories || '') +
    this.estimateTokens(sections.constitution || ''),
```

Constitution tokens are counted in the `memory` budget bucket, competing with
actual memories for the same allocation.

#### Problem 4: MemoryLayerManager Wraps Constitution as a Memory

`MemoryLayerManager.ts:127-142` — Constitution is loaded as a `MemoryItem` with
`id: 'core:constitution'`, `type: 'procedural'`, `priorityIndex: 100`,
`usedCount: 999`. This means constitution appears as a "memory" in the layered
system.

#### Problem 5: Constitution Can Be Loaded Twice

When `useLayeredMemory: true`:

1. `ContextBuilder.ts:640-644` loads constitution as `sections.constitution`
2. `MemoryLayerManager.getCoreMemory()` loads it again as a memory item

Both appear in the final context without deduplication.

#### Problem 6: config.ts VIEWS Constant is Stale

`config.ts:56-61`:

```typescript
export const VIEWS = {
  progress: 'goferProgress',
  constitution: 'goferConstitution', // Still listed but NOT in package.json
  memory: 'goferMemory',
  container: 'gofer',
  // MISSING: contextWindow: 'goferContextWindow'
} as const;
```

#### Problem 7: "Decisions" Appears Three Times

1. `CATEGORY_DISPLAY.decision` — memory category in tree view
2. Root-level "Decisions" section — ADR files from
   `.specify/memory/decisions/*.md`
3. `MemoryLayerManager.coreCategories` — includes `'decisions'` as core memory

### Existing Patterns to Follow

#### Pattern 1: Tree View Provider Structure

All providers follow the same skeleton (from `memoryProvider.ts`,
`contextWindowProvider.ts`, `progressProvider.ts`):

```typescript
export type FooItemKind = 'section' | 'category' | 'item' | 'info';

export class FooTreeItem extends vscode.TreeItem {
  kind: FooItemKind;
}

export class FooProvider implements vscode.TreeDataProvider<FooTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<...>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(workspacePath: string) { ... }
  refresh(): void { this._onDidChangeTreeData.fire(); }
  getTreeItem(element: FooTreeItem): vscode.TreeItem { return element; }
  async getChildren(element?: FooTreeItem): Promise<FooTreeItem[]> { ... }
}
```

#### Pattern 2: Command Naming

All commands follow `gofer.verbNoun` pattern:

- CRUD: `gofer.remember`, `gofer.searchMemory`, `gofer.forgetMemory`
- Display: `gofer.showConstitution`, `gofer.showMemoryDocument`
- Refresh: `gofer.refreshMemory`, `gofer.refreshContextWindow`

#### Pattern 3: View Registration

Views are registered in `package.json` under `contributes.views.gofer[]` with:

- `id`: `gofer` + `PascalCaseName`
- `name`: Short user-facing label
- `icon`: Codicon `$(name)`
- `contextualTitle`: Longer description

### Integration Points

1. **`extension.ts:166-196`** — `registerTreeViews()` instantiates all providers
   and registers them with VSCode
2. **`extension.ts:1450-1460`** — Wires `MemoryManager` singleton into
   `MemoryProvider` via `setMemoryManager()`
3. **`extension.ts:1631-1632`** — Wires `MemoryLayerManager` into
   `ContextBuilder`
4. **`ContextBuilder.ts`** — The convergence point where constitution, memories,
   hints, and observations are merged into LLM context
5. **`webviewHelpers.ts:58-278`** — Handles both memory and constitution webview
   rendering

### Related Code (All Files That Need Changes)

**Core files to modify:**

- `extension/src/memoryProvider.ts` — Remove Observations section, update
  categories
- `extension/src/config.ts:56-61` — Fix stale VIEWS constant
- `extension/src/autonomous/ContextBuilder.ts:464-467` — Separate constitution
  from memory budget
- `extension/src/autonomous/MemoryLayerManager.ts:127-142` — Stop treating
  constitution as a memory
- `extension/package.json:285-291,302-328` — Update view name/icon, move
  Constitution button
- `extension/src/contextWindowProvider.ts:28-35` — Rename "Memories/Hints"
  category

**Test files to update:**

- `tests/unit/memoryProvider.test.ts` — Update assertions for new
  categories/sections
- `tests/unit/autonomous/ContextBuilder.test.ts` — Update budget categorization
  tests
- `tests/unit/autonomous/MemoryLayerManager.test.ts` — Remove
  constitution-as-memory tests

**Files that reference memory categories:**

- `extension/src/autonomous/memory.ts:84` — `MemoryType` union type
- `extension/src/autonomous/ContinuousMemoryWriter.ts` — Auto-categorizes
  memories
- `extension/src/commands/memoryCommands.ts` — Category selection in remember
  command

## Technology Decisions

### Decision 1: Keep "Memory" as the Panel Name

- **Choice**: Keep the panel named "Memory" but clarify what it contains
- **Rationale**: "Memory" is the right metaphor for a learning/recall system.
  The problem isn't the name itself — it's that non-memory concerns
  (observations, constitution) were shoved into it.
- **Alternatives**: "Knowledge Base", "Learnings", "Recall" — all less intuitive

### Decision 2: Move Observations to Context Window Panel

- **Choice**: Remove the "Observations" section from the Memory panel
- **Rationale**: Observations are tool outputs managed by `ObservationMasker` —
  they're a context management concern, not a learning concern. The Context
  Window panel already has "Tool Outputs" and "Masked Observations" categories
  that serve this purpose.

### Decision 3: Separate Constitution Budget from Memory Budget

- **Choice**: Give constitution its own budget category in `ContextBuilder`
- **Rationale**: Constitution is a static reference document, not learned
  knowledge. It should have its own token budget instead of competing with
  memories.

### Decision 4: Stop Wrapping Constitution as a MemoryItem

- **Choice**: Remove the `core:constitution` memory item from
  `MemoryLayerManager`
- **Rationale**: Constitution should be loaded once by `ContextBuilder` as its
  own section, not disguised as a memory. This also fixes the double-loading
  bug.

### Decision 5: Remove Constitution Button from Memory Panel

- **Choice**: Move the "Show Constitution" button to the Specifications panel or
  make it Command Palette only
- **Rationale**: Constitution is project standards, not memories. Having it on
  the Memory panel creates false association.

## Constraints & Considerations

- **Backward compatibility**: Memory entries already stored in `memories.jsonl`
  use existing category strings. Changing category names requires a migration or
  accepting both old and new values.
- **ContextBuilder is the coupling point**: All three systems converge here.
  Changes to budget categorization affect context assembly for all pipeline
  stages.
- **ConstitutionProvider is partially dead code**: It's instantiated and
  refreshed but not registered as a sidebar panel. Decide whether to fully
  remove or properly repurpose it.
- **Test coverage exists**: All three providers have unit tests that assert on
  current labels, categories, and section counts. These must be updated.

## Brownfield Analysis

### Areas Requiring Extra Caution

- **`ContextBuilder.calculateBudgetUsage()`** — Changing budget categories could
  affect context health thresholds and auto-handoff triggers
- **`MemoryLayerManager.getCoreMemory()`** — Removing constitution changes
  what's in the Core layer; must verify it's still loaded via the direct path
- **Memory panel root sections** — Removing "Observations" changes the tree
  structure; tests assert `getChildren()` returns exactly 4 sections

### Downstream Dependencies

- `AutoHandoffTrigger` reads `ContextHealthMonitor` state → budget changes
  affect handoff triggers
- `ContextBridgeWriter` writes context breakdown to bridge JSON → category names
  appear in bridge files
- `ContextContentPanel` renders content for clicked categories → must match new
  category names
- `StageContextProfile` defines budget allocations per stage → may need a new
  `constitution` budget key

### Protected Boundaries (Must NOT Change)

- Memory JSONL format (`memories.jsonl`) — existing entries must still load
- `MemoryType` union
  (`'episodic' | 'semantic' | 'procedural' | 'prospective' | 'decision'`) —
  these are cognitive types, not UI categories; keep as-is
- Constitution file format (`.specify/memory/constitution.md`) — many systems
  read this directly

## Open Questions

- [ ] Should the Memory panel's "Checkpoints" section also move? Checkpoints are
      session management, not learned knowledge.
- [ ] Should we add a `contextWindow` key to the `VIEWS` constant in config.ts,
      or rename the whole constant?
- [ ] Should `ConstitutionProvider` be fully removed since it has no sidebar
      panel, or kept for potential future use?

## Recommendations

1. **Remove Observations from Memory panel** — This is the clearest boundary
   violation. Observations belong in Context Window.
2. **Give constitution its own budget category** in `ContextBuilder` — Stop
   counting it as "memory" tokens.
3. **Remove `core:constitution` from `MemoryLayerManager`** — Load constitution
   only once via `ContextBuilder.ts:640-644`, not as a fake memory item.
4. **Move the Constitution toolbar button** from the Memory panel to the
   Specifications panel (or keep Command Palette only).
5. **Fix `config.ts` VIEWS constant** — Add `contextWindow`, remove stale
   `constitution`.
6. **Keep Memory categories as-is for now** — The 7 categories (Discovery,
   Patterns, Decisions, Learnings, Journeys, Architecture, Debug) are reasonable
   groupings for learned knowledge. The main issue was non-memory items in the
   panel, not bad categories.
7. **Consider moving Checkpoints** to a separate location or the Specifications
   panel — they're session management, not memories.
