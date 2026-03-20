---
date: 2026-03-20T17:12:00Z
researcher: Claude
feature: 'Memory Panel Usability Fix'
status: complete
---

# Research: Memory Panel Usability Fix

## Feature Summary

Fix the Memory panel to show **user-created memories** only (by default),
filtering out 533+ system telemetry entries (`auto_decision`, `discovery` logs)
that currently clutter the UI and make it unusable for its intended purpose of
knowledge management.

## Problem Analysis

**Current State**: Memory panel displays ALL memories from
`.specify/memory/memories.jsonl` without distinction:

- 368 `auto_decision` entries (budget warnings, loading decisions, scope
  violations)
- 151 `discovery` entries (research completion events)
- Unknown number of user-created memories (buried in the noise)

**Root Cause**: This is a **UI filtering problem**, not a storage architecture
problem. The infrastructure to distinguish user vs system memories already
exists via tags and metadata, but the UI doesn't leverage it.

**Impact**: Users cannot find their actual learnings (coding patterns,
decisions, gotchas) because the panel is flooded with system telemetry logs.

## Codebase Analysis

### Where to Implement

| Component           | Location                                            | Purpose                                            |
| ------------------- | --------------------------------------------------- | -------------------------------------------------- |
| **Memory Panel UI** | `extension/src/ui/MemoryPanel.ts`                   | Add filter toggle for system/user memories         |
| **Memory Query**    | `extension/src/autonomous/memory.ts:176-212`        | Already supports tag filtering (no changes needed) |
| **Memory Storage**  | `extension/src/autonomous/MemoryStorage.ts:384-441` | Query implementation (no changes needed)           |
| **Memory Manager**  | `extension/src/autonomous/MemoryManager.ts:404-453` | Search method (no changes needed)                  |

### Current Data Flow

```
User opens MemoryPanel → "Gofer: View Memories"
    ↓
MemoryPanel.ts:175 → getHtmlContent()
    ↓
memoryManager.load('both') → Loads ALL memories (no filter)
    ↓
Builds category dropdown from unique categories (includes system categories)
    ↓
User searches → webview postMessage('search')
    ↓
MemoryManager.search(query) with category, tags, keywords
    ↓
Returns mixed user + system memories
```

### Existing Patterns to Follow

#### Pattern 1: MemoryProvider Tree Grouping

Found in: `extension/src/memoryProvider.ts:26-36, 176-202`

```typescript
// Category display mapping with fallback
const CATEGORY_DISPLAY: Record<string, { displayName: string; icon: string }> = {
  discovery: { displayName: 'Discovery', icon: 'search' },
  pattern: { displayName: 'Patterns', icon: 'symbol-pattern' },
  decision: { displayName: 'Decisions', icon: 'law' },
  // ...
};

const DEFAULT_CATEGORY_DISPLAY = { displayName: 'Other', icon: 'tag' };

// Group memories by category
private groupByCategory(memories: Memory[]): Map<string, Memory[]> {
  const groups = new Map<string, Memory[]>();
  for (const memory of memories) {
    const cat = memory.category || 'other';
    if (!groups.has(cat)) {
      groups.set(cat, []);
    }
    groups.get(cat)!.push(memory);
  }
  return groups;
}
```

**Why relevant**: This pattern shows how to organize and display categories with
proper metadata (icons, labels). We can adapt this for separating system vs user
categories.

#### Pattern 2: Sequential Filter Chaining

Found in: `extension/src/autonomous/MemoryStorage.ts:384-441`

```typescript
query(query: MemoryQuery): Memory[] {
  let results = Array.from(this.index.values());

  // Filter by category (exact match)
  if (query.category) {
    results = results.filter((e) => e.category === query.category);
  }

  // Filter by tags (OR logic)
  if (query.tags && query.tags.length > 0) {
    const queryTags = new Set(query.tags);
    results = results.filter((e) => e.tags.some((t) => queryTags.has(t)));
  }

  // Filter by scope
  if (query.scope && query.scope !== 'both') {
    results = results.filter((e) => e.scope === query.scope);
  }

  return results.map((e) => e.memory);
}
```

**Why relevant**: This is the exact pattern we'll use to filter out system
memories. We can add a filter for "exclude memories with `#auto` tag".

#### Pattern 3: Dynamic Dropdown Population

Found in: `extension/src/ui/MemoryPanel.ts:175-184`

```typescript
private async getHtmlContent(): Promise<string> {
  const allMemories = await this.memoryManager.load('both');

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(allMemories.map((m) => m.category))).sort();

  // Get unique tags for filter dropdown
  const allTags = allMemories.flatMap((m) => m.tags);
  const uniqueTags = Array.from(new Set(allTags)).sort();

  return `
    <select id="categoryFilter">
      <option value="">All Categories</option>
      ${categories.map((cat) => `<option value="${cat}">${cat}</option>`).join('')}
    </select>
  `;
}
```

**Why relevant**: This is already implemented! We just need to filter the
`allMemories` array before extracting unique categories to exclude system
categories from the dropdown.

#### Pattern 4: System vs User Distinction

Found in: `extension/src/ui/ContextContentPanel.ts:121-149`

```typescript
switch (categoryName) {
  case 'CLAUDE.md & Rules':
    return this.renderScannerCategory('CLAUDE.md & Rules');
  case 'Auto Memory':
    return this.renderScannerCategory('Auto Memory');
  case 'System Overhead':
    return this.renderSystemOverhead(); // Special handler with explanation
  case 'Spec Artifacts':
    return this.renderSpecArtifacts();
}
```

**Why relevant**: Shows the convention of explicitly handling system categories
differently from user categories with special rendering logic.

### Integration Points

1. **MemoryPanel.getHtmlContent()** (`MemoryPanel.ts:175`):
   - Add toggle button: "Show System Memories" (default: unchecked)
   - Filter `allMemories` to exclude `#auto` tag before building category
     dropdown
   - Filter `allMemories` to exclude system categories before building tag
     dropdown

2. **MemoryPanel.handleMessage()** (`MemoryPanel.ts:105`):
   - Add new message handler for toggle change
   - Update search query to include/exclude `#auto` tag based on toggle state

3. **MemoryPanel webview HTML** (`MemoryPanel.ts:466-608`):
   - Add checkbox input for "Show system memories"
   - Wire `onchange` event to post message to extension
   - Update search() function to include toggle state

### Related Code

- `extension/src/autonomous/memory.ts:20-83` - Memory interface with tags,
  category, learnedFrom fields
- `extension/src/autonomous/ContinuousMemoryWriter.ts:258-275` - System memory
  creation (always adds `#auto` tag)
- `extension/src/commands/memoryCommands.ts:76-190` - User memory creation (NO
  `#auto` tag)
- `extension/src/autonomous/MemoryStorage.ts:403-406` - Tag filtering with OR
  logic using Set
- `extension/src/memoryProvider.ts:26-36` - Category display mapping with
  fallback

## Technology Decisions

### Decision 1: UI Filtering vs Storage Separation

- **Choice**: Implement UI-level filtering (filter memories before display)
- **Rationale**:
  - Infrastructure already exists: `#auto` tag marks all system memories
  - `learnedFrom` field distinguishes sources ('user_interaction' vs 'system')
  - MemoryQuery interface supports tag filtering
  - Storage layer already implements tag exclusion logic
  - No migration needed, no breaking changes
  - Simpler implementation (just UI changes)
- **Alternatives considered**:
  - **Storage separation**: Move system memories to separate file (e.g.,
    `telemetry.jsonl`)
    - **Rejected**: Would require migration, break existing code, add complexity
  - **Category-based filtering**: Filter on `category` field alone
    - **Rejected**: Categories overlap (user can create 'discovery' memories
      too)

### Decision 2: Default Behavior

- **Choice**: Hide system memories by default (opt-in to show)
- **Rationale**:
  - Primary use case is knowledge management, not telemetry review
  - Users complained about unusable panel → need immediate fix
  - Power users can still access system memories via toggle
  - Aligns with principle of least surprise
- **Alternatives considered**:
  - Show all memories by default, opt-in to hide system
    - **Rejected**: Doesn't solve the immediate usability problem

### Decision 3: Filter Mechanism

- **Choice**: Tag-based exclusion (`#auto` tag)
- **Rationale**:
  - All system memories are tagged with `#auto` (ContinuousMemoryWriter
    line 272)
  - No user memories have `#auto` tag (memoryCommands doesn't add it)
  - Tag filtering already implemented in MemoryStorage.query()
  - More reliable than category matching (categories can overlap)
- **Alternatives considered**:
  - Filter on `learnedFrom` field
    - **Rejected**: Field is optional, not guaranteed to be set consistently
  - Filter on category list (hardcode system categories)
    - **Rejected**: Categories can grow, maintenance burden, overlap issues

### Decision 4: UI Implementation

- **Choice**: Add checkbox toggle "Show system memories" in toolbar
- **Rationale**:
  - Follows VSCode UI conventions (toggle buttons in toolbars)
  - Clear, discoverable, single-purpose control
  - Doesn't clutter the existing filter row
  - Persistent state can be saved in panel preferences
- **Alternatives considered**:
  - Add "System" category to dropdown
    - **Rejected**: Not intuitive, doesn't clearly communicate exclusion
  - Add toggle to VSCode settings
    - **Rejected**: Too indirect, user would have to leave panel to change
      setting

## Constraints & Considerations

### Constraints

1. **Backward compatibility**: Existing memories must remain accessible (don't
   delete, just filter)
2. **No storage changes**: Keep single JSONL file to avoid migration complexity
3. **Performance**: Filtering must be fast (in-memory index already supports
   this)
4. **XSS prevention**: Any new UI elements must use existing `escapeHtml()`
   function

### Considerations

1. **Category dropdown behavior**: When "Show system memories" is OFF:
   - Should system categories (`auto_decision`, `discovery`) appear in dropdown?
   - **Recommendation**: NO - filter categories before building dropdown
   - **Rationale**: Cleaner UX, prevents confusion ("Why can't I find
     auto_decision memories?")

2. **Tag dropdown behavior**: When "Show system memories" is OFF:
   - Should `#auto` tag appear in tag dropdown?
   - **Recommendation**: NO - filter tags before building dropdown
   - **Rationale**: Same as category dropdown

3. **Search behavior**: When user searches by keyword:
   - Should keyword search include system memories if toggle is OFF?
   - **Recommendation**: NO - respect toggle state for all searches
   - **Rationale**: Consistency, user expectation

4. **Empty state**: When all memories are system memories and toggle is OFF:
   - Should show "No user memories yet" instead of empty list?
   - **Recommendation**: YES - add specific empty state message
   - **Rationale**: Helps user understand why list is empty

5. **Telemetry**: Should we track toggle state usage?
   - **Recommendation**: YES - log when users enable "Show system memories"
   - **Rationale**: Understand if users need system memory access, inform future
     UX decisions

## Open Questions

None - all decisions have been made based on codebase analysis and existing
patterns.

## Recommendations

### Implementation Approach

1. **Add toggle control to MemoryPanel HTML** (MemoryPanel.ts:220-285):

   ```html
   <div class="toolbar">
     <div class="results-info" id="resultsInfo">
       <!-- existing results count -->
     </div>
     <label>
       <input type="checkbox" id="showSystemMemories" />
       Show system memories
     </label>
   </div>
   ```

2. **Filter memories before building dropdowns** (MemoryPanel.ts:175-184):

   ```typescript
   private async getHtmlContent(): Promise<string> {
     const allMemories = await this.memoryManager.load('both');

     // Filter out system memories by default
     const userMemories = allMemories.filter(m => !m.tags.includes('#auto'));

     // Build dropdowns from user memories only
     const categories = Array.from(new Set(userMemories.map((m) => m.category))).sort();
     const allTags = userMemories.flatMap((m) => m.tags);
     const uniqueTags = Array.from(new Set(allTags)).sort();
   }
   ```

3. **Update search handler to respect toggle** (MemoryPanel.ts:105-119):

   ```typescript
   case 'search': {
     const query: MemoryQuery = {
       keywords: message.keywords || undefined,
       category: message.category || undefined,
       tags: message.tags || undefined,
       scope: message.scope === 'all' ? 'both' : (message.scope as 'local' | 'global'),
       excludeSystemMemories: !message.showSystemMemories, // NEW
     };
     const result = await this.memoryManager.search(query);
   }
   ```

4. **Add excludeSystemMemories to MemoryQuery** (memory.ts:176-212):

   ```typescript
   export interface MemoryQuery {
     // ... existing fields

     /** Exclude system-generated memories (tagged with #auto) */
     excludeSystemMemories?: boolean;
   }
   ```

5. **Implement exclusion in MemoryStorage.query()** (MemoryStorage.ts:384-441):

   ```typescript
   query(query: MemoryQuery): Memory[] {
     let results = Array.from(this.index.values());

     // Exclude system memories if requested
     if (query.excludeSystemMemories) {
       results = results.filter((e) => !e.tags.includes('#auto'));
     }

     // ... rest of existing filters
   }
   ```

6. **Add empty state for no user memories** (MemoryPanel.ts:387-394):
   ```html
   <div class="empty-state">
     <div class="empty-state-icon">📝</div>
     <h3>No user memories yet</h3>
     <p>Create your first memory with "Gofer: Remember" command</p>
     <p>
       System memories are hidden. Toggle "Show system memories" to see them.
     </p>
   </div>
   ```

### Testing Strategy

1. **Unit tests** for MemoryStorage.query():
   - Test `excludeSystemMemories: true` filters out `#auto` tagged memories
   - Test `excludeSystemMemories: false` includes all memories
   - Test `excludeSystemMemories: undefined` includes all memories (backward
     compat)

2. **Integration tests** for MemoryPanel:
   - Test toggle change updates search results
   - Test category dropdown excludes system categories when toggle OFF
   - Test tag dropdown excludes `#auto` when toggle OFF
   - Test empty state appears when no user memories exist

3. **E2E tests**:
   - Create user memory via "Gofer: Remember"
   - Verify it appears in panel
   - Verify system memories don't appear by default
   - Toggle "Show system memories" ON
   - Verify system memories now appear

### Migration Notes

**No migration needed** - this is purely UI filtering, storage remains
unchanged.

### Performance Considerations

- **Filtering cost**: O(n) where n = total memories, but this is already done
  in-memory
- **Dropdown rebuild**: Only happens on initial load, not on toggle change
- **Search performance**: No degradation, just one additional filter condition

### Rollback Strategy

If issues arise:

1. Remove `excludeSystemMemories` check from MemoryStorage.query()
2. Remove toggle UI from MemoryPanel HTML
3. Revert to showing all memories (current behavior)

No data loss risk since storage is unchanged.

---

## Summary

**Problem**: Memory panel unusable due to 533+ system telemetry entries flooding
the UI.

**Root Cause**: UI doesn't distinguish between user memories and
system-generated logs.

**Solution**: Add "Show system memories" toggle (default: OFF) that filters out
memories tagged with `#auto`.

**Implementation**: UI-only changes, no storage migration, leverages existing
tag filtering infrastructure.

**Impact**: Immediate usability improvement, user memories surfaced by default,
system telemetry accessible via opt-in toggle.

**Risk**: Low - backward compatible, reversible, no data changes, follows
existing patterns in codebase.
