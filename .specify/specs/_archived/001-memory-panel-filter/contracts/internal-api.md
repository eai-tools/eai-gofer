# Internal API Contract: Memory Panel Usability Fix

## Overview

This document defines the internal TypeScript API modifications required to
filter system memories from the Memory Panel UI. This is a UI-focused feature
that extends existing memory query infrastructure to support user/system memory
distinction.

**Key Changes**:

- Extend `MemoryQuery` interface to support system memory exclusion
- Modify `MemoryStorage.query()` to implement tag-based filtering
- Update `MemoryPanel` webview message protocol to include toggle state
- Add panel state persistence for toggle preference

**Serves User Stories**:

- **US-001**: View User Memories Only (FR-001, FR-004, FR-005, FR-006, FR-007,
  FR-008, FR-009)
- **US-002**: Access System Telemetry (FR-003)
- **US-003**: Persistent Filter Preference (FR-010)

---

## MemoryQuery Interface Extension

### Interface: MemoryQuery

**Location**: `extension/src/autonomous/memory.ts:176-212`

**Modification**: Add optional flag to exclude system-generated memories.

```typescript
export interface MemoryQuery {
  /**
   * Filter by category (exact match)
   * @example 'pattern', 'decision', 'gotcha'
   */
  category?: string;

  /**
   * Filter by tags (OR logic - any tag matches)
   * @example ['#bugfix', '#performance']
   */
  tags?: string[];

  /**
   * Keyword search across content
   * @example 'async await'
   */
  keywords?: string;

  /**
   * Filter by memory scope
   * @default 'both'
   */
  scope?: 'local' | 'global' | 'both';

  /**
   * Exclude system-generated memories (tagged with #auto)
   * When true, filters out all memories containing the '#auto' tag.
   * Used by Memory Panel to show only user-created memories by default.
   * @default false
   */
  excludeSystemMemories?: boolean;
}
```

### Request Example

```typescript
// User memories only (default panel view)
const userQuery: MemoryQuery = {
  scope: 'both',
  excludeSystemMemories: true,
};

// All memories (toggle enabled)
const allQuery: MemoryQuery = {
  scope: 'both',
  excludeSystemMemories: false,
};

// User memories matching keyword
const searchQuery: MemoryQuery = {
  keywords: 'async patterns',
  excludeSystemMemories: true,
  scope: 'both',
};
```

### Response Schema

```typescript
// Returns Memory[] from MemoryStorage.query()
interface Memory {
  category: string;
  tags: string[];
  learnedFrom?: string;
  timestamp: number;
  content: string;
  scope: 'local' | 'global';
  // ... other fields
}

// Example response for user memories only
[
  {
    category: 'pattern',
    tags: ['#async', '#typescript'],
    learnedFrom: 'user_interaction',
    timestamp: 1710950400000,
    content: 'Use Promise.allSettled for parallel operations',
    scope: 'local',
  },
  {
    category: 'decision',
    tags: ['#architecture'],
    learnedFrom: 'user_interaction',
    timestamp: 1710864000000,
    content: 'Store memories in single JSONL file for simplicity',
    scope: 'global',
  },
];

// Note: System memories (with '#auto' tag) are filtered out when excludeSystemMemories: true
```

### Error Codes

| Code | Description                                                                       |
| ---- | --------------------------------------------------------------------------------- |
| N/A  | This interface extension has no error states - invalid queries return empty array |

**Serves**: FR-009 (tag-based exclusion), FR-006 (search respects filter)

---

## MemoryStorage.query() Enhancement

### Method: MemoryStorage.query()

**Location**: `extension/src/autonomous/MemoryStorage.ts:384-441`

**Modification**: Implement `excludeSystemMemories` filter logic.

```typescript
class MemoryStorage {
  /**
   * Query memories with optional filtering
   * @param query - Filter criteria including system memory exclusion
   * @returns Array of matching memories
   */
  query(query: MemoryQuery): Memory[] {
    let results = Array.from(this.index.values());

    // FILTER: Exclude system memories (NEW)
    if (query.excludeSystemMemories) {
      results = results.filter((e) => !e.tags.includes('#auto'));
    }

    // FILTER: By category (exact match)
    if (query.category) {
      results = results.filter((e) => e.category === query.category);
    }

    // FILTER: By tags (OR logic)
    if (query.tags && query.tags.length > 0) {
      const queryTags = new Set(query.tags);
      results = results.filter((e) => e.tags.some((t) => queryTags.has(t)));
    }

    // FILTER: By scope
    if (query.scope && query.scope !== 'both') {
      results = results.filter((e) => e.scope === query.scope);
    }

    // FILTER: By keywords (case-insensitive content search)
    if (query.keywords) {
      const lowerKeywords = query.keywords.toLowerCase();
      results = results.filter((e) =>
        e.content.toLowerCase().includes(lowerKeywords)
      );
    }

    return results.map((e) => e.memory);
  }
}
```

### Request Example

```typescript
const storage = new MemoryStorage();

// Query user memories only
const userMemories = storage.query({
  excludeSystemMemories: true,
  scope: 'both',
});

// Query system memories only (double-negative)
const systemMemories = storage.query({
  excludeSystemMemories: false, // Include system
  tags: ['#auto'], // Filter to only system
});

// Query user memories in specific category
const userPatterns = storage.query({
  category: 'pattern',
  excludeSystemMemories: true,
});
```

### Response Example

```typescript
// User memories (excludeSystemMemories: true)
[
  { category: 'pattern', tags: ['#async'], content: '...', scope: 'local' },
  { category: 'decision', tags: ['#arch'], content: '...', scope: 'global' },
];

// Mixed (excludeSystemMemories: false)
[
  { category: 'pattern', tags: ['#async'], content: '...', scope: 'local' },
  {
    category: 'auto_decision',
    tags: ['#auto', '#budget'],
    content: '...',
    scope: 'local',
  },
  {
    category: 'discovery',
    tags: ['#auto', '#research'],
    content: '...',
    scope: 'local',
  },
];
```

### Error Codes

| Code | Description                                              |
| ---- | -------------------------------------------------------- |
| N/A  | Method returns empty array for no matches - never throws |

**Serves**: FR-009 (tag-based exclusion implementation)

---

## MemoryPanel Webview Message Protocol

### Message: SearchMemories

**Location**: `extension/src/ui/MemoryPanel.ts:105-119` (handleMessage)

**Modification**: Add `showSystemMemories` field to search message payload.

#### Request Schema

```typescript
// Message posted from webview to extension
interface SearchMessage {
  command: 'search';
  keywords?: string;
  category?: string;
  tags?: string[];
  scope: 'local' | 'global' | 'all';
  showSystemMemories: boolean; // NEW FIELD
}
```

#### Request Example (JSON)

```json
{
  "command": "search",
  "keywords": "",
  "category": "",
  "tags": [],
  "scope": "all",
  "showSystemMemories": false
}
```

#### Response Schema

```typescript
// Message sent from extension to webview
interface SearchResultsMessage {
  command: 'searchResults';
  results: Memory[];
  query: {
    keywords?: string;
    category?: string;
    tags?: string[];
    scope: 'local' | 'global' | 'all';
    showSystemMemories: boolean;
  };
}
```

#### Response Example (JSON)

```json
{
  "command": "searchResults",
  "results": [
    {
      "category": "pattern",
      "tags": ["#async"],
      "content": "Use Promise.allSettled for parallel ops",
      "timestamp": 1710950400000,
      "scope": "local"
    }
  ],
  "query": {
    "keywords": "",
    "category": "",
    "tags": [],
    "scope": "all",
    "showSystemMemories": false
  }
}
```

### Error Codes

| Code            | Description                                                               |
| --------------- | ------------------------------------------------------------------------- |
| `SEARCH_FAILED` | MemoryManager.search() threw exception - displayed in UI as error message |

**Serves**: FR-003 (toggle change triggers search refresh), FR-006 (search
respects toggle)

---

## MemoryPanel State Management

### Panel Instance State

**Location**: `extension/src/ui/MemoryPanel.ts` (class properties)

**Addition**: Track toggle state for session persistence.

```typescript
class MemoryPanel {
  private panel: vscode.WebviewPanel;
  private memoryManager: MemoryManager;
  private disposables: vscode.Disposable[] = [];

  /**
   * Toggle state for system memory visibility
   * Persists within VSCode session (panel close/reopen)
   * @default false (system memories hidden)
   */
  private showSystemMemories: boolean = false;

  /**
   * Restore panel with previous toggle state
   */
  private async getHtmlContent(): Promise<string> {
    const allMemories = await this.memoryManager.load('both');

    // Filter memories based on toggle state
    const visibleMemories = this.showSystemMemories
      ? allMemories
      : allMemories.filter((m) => !m.tags.includes('#auto'));

    // Build category dropdown from visible memories only
    const categories = Array.from(
      new Set(visibleMemories.map((m) => m.category))
    ).sort();

    // Build tag dropdown from visible memories only
    const allTags = visibleMemories.flatMap((m) => m.tags);
    const uniqueTags = Array.from(new Set(allTags)).sort();

    // Inject toggle state into HTML
    return this.renderHtml(categories, uniqueTags, this.showSystemMemories);
  }

  /**
   * Handle toggle state change from webview
   */
  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'toggleSystemMemories':
        this.showSystemMemories = message.value;
        // Trigger search refresh with new toggle state
        await this.refreshSearch();
        break;
      // ... other cases
    }
  }
}
```

### Request Example

```typescript
// Webview posts toggle change
webview.postMessage({
  command: 'toggleSystemMemories',
  value: true, // User enabled "Show system memories"
});
```

### Response Example

```typescript
// Extension updates state and triggers search refresh
// New search query sent to MemoryManager:
{
  excludeSystemMemories: false, // Inverted from toggle value
  scope: 'both',
}
```

### Error Codes

| Code | Description                                   |
| ---- | --------------------------------------------- |
| N/A  | State changes are synchronous and cannot fail |

**Serves**: FR-010 (session persistence), FR-003 (toggle handling)

---

## MemoryPanel HTML Toggle Control

### UI Component: System Memory Toggle

**Location**: `extension/src/ui/MemoryPanel.ts:466-608` (HTML template)

**Addition**: Checkbox control for system memory visibility.

#### HTML Structure

```html
<div class="toolbar">
  <div class="results-info" id="resultsInfo">
    <!-- Results count: updated by search -->
  </div>
  <label class="system-toggle">
    <input
      type="checkbox"
      id="showSystemMemories"
      ${showSystemMemories ? 'checked' : ''}
      onchange="handleToggleChange(this.checked)"
    />
    Show system memories
  </label>
</div>
```

#### JavaScript Handler

```javascript
function handleToggleChange(checked) {
  // Post message to extension
  vscode.postMessage({
    command: 'toggleSystemMemories',
    value: checked,
  });

  // Trigger search refresh with new toggle state
  performSearch();
}

function performSearch() {
  const showSystemMemories =
    document.getElementById('showSystemMemories').checked;

  vscode.postMessage({
    command: 'search',
    keywords: document.getElementById('searchInput').value,
    category: document.getElementById('categoryFilter').value,
    tags: getSelectedTags(),
    scope: document.getElementById('scopeFilter').value,
    showSystemMemories: showSystemMemories,
  });
}
```

### Error Codes

| Code | Description                                              |
| ---- | -------------------------------------------------------- |
| N/A  | UI interactions post messages - extension handles errors |

**Serves**: FR-002 (toggle control visible), FR-003 (toggle triggers refresh)

---

## MemoryPanel Empty State

### UI Component: No User Memories State

**Location**: `extension/src/ui/MemoryPanel.ts:387-394` (results rendering)

**Addition**: Informative empty state when no user memories exist.

#### HTML Structure

```html
<div class="results-container">
  <!-- Show when filteredMemories.length === 0 && !showSystemMemories -->
  <div class="empty-state" id="emptyState">
    <div class="empty-state-icon">📝</div>
    <h3>No user memories yet</h3>
    <p>Create your first memory with the "Gofer: Remember" command.</p>
    <p class="help-text">
      System memories are hidden by default. Toggle "Show system memories" to
      see auto-generated logs.
    </p>
  </div>

  <!-- Show when filteredMemories.length === 0 && showSystemMemories -->
  <div class="empty-state" id="emptyStateAll">
    <div class="empty-state-icon">🔍</div>
    <h3>No memories found</h3>
    <p>Your search returned no results. Try adjusting your filters.</p>
  </div>

  <!-- Show when filteredMemories.length > 0 -->
  <div class="memory-list" id="memoryList">
    <!-- Memory items rendered here -->
  </div>
</div>
```

#### Display Logic

```typescript
function renderResults(
  memories: Memory[],
  showSystemMemories: boolean
): string {
  if (memories.length === 0) {
    if (!showSystemMemories) {
      // No user memories exist
      return `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h3>No user memories yet</h3>
          <p>Create your first memory with "Gofer: Remember" command.</p>
          <p class="help-text">System memories are hidden. Toggle "Show system memories" to see them.</p>
        </div>
      `;
    } else {
      // No memories at all (or search returned nothing)
      return `
        <div class="empty-state">
          <h3>No memories found</h3>
          <p>Your search returned no results.</p>
        </div>
      `;
    }
  }

  // Render memory list
  return memories.map((m) => renderMemoryItem(m)).join('');
}
```

**Serves**: FR-007 (empty state message), User Story 1 Scenario 4

---

## MemoryManager Passthrough

### Method: MemoryManager.search()

**Location**: `extension/src/autonomous/MemoryManager.ts:404-453`

**Modification**: No implementation changes needed - already passes query object
through to `MemoryStorage.query()`.

```typescript
class MemoryManager {
  /**
   * Search memories with filters
   * Passes query directly to storage layer
   */
  async search(query: MemoryQuery): Promise<Memory[]> {
    await this.ensureLoaded();
    return this.storage.query(query); // Passthrough - no changes needed
  }
}
```

### Request Example

```typescript
const manager = new MemoryManager(storage);

// Query user memories only
const results = await manager.search({
  excludeSystemMemories: true,
  scope: 'both',
});
```

### Response Example

```typescript
// Returns Memory[] from storage.query()
[{ category: 'pattern', tags: ['#async'], content: '...', scope: 'local' }];
```

### Error Codes

| Code                 | Description                                     |
| -------------------- | ----------------------------------------------- |
| `STORAGE_NOT_LOADED` | Called search() before ensureLoaded() completed |

**Serves**: FR-001 (filter before rendering), FR-009 (query passthrough)

---

## Type Safety Enhancements

### TypeScript Compiler Checks

All API modifications maintain full type safety:

1. **MemoryQuery interface extension**: Optional field with JSDoc documentation
2. **MemoryStorage.query()**: Type-checked filter logic using `Array.filter()`
3. **Webview messages**: TypeScript interfaces for message payloads
   (compile-time safety)
4. **Panel state**: Private boolean property with default value

### Backward Compatibility

All changes are backward compatible:

- `excludeSystemMemories?: boolean` is optional (defaults to `false` = current
  behavior)
- Existing code that doesn't set the flag continues to work unchanged
- No breaking changes to public APIs or data formats

---

## Integration Testing Contracts

### Test: System Memory Exclusion

```typescript
describe('MemoryStorage.query() with excludeSystemMemories', () => {
  it('should filter out #auto tagged memories when excludeSystemMemories is true', () => {
    const storage = new MemoryStorage();

    // Add user memory
    storage.add({
      category: 'pattern',
      tags: ['#async'],
      content: 'User pattern',
      scope: 'local',
    });

    // Add system memory
    storage.add({
      category: 'auto_decision',
      tags: ['#auto', '#budget'],
      content: 'System log',
      scope: 'local',
    });

    const results = storage.query({ excludeSystemMemories: true });

    expect(results).toHaveLength(1);
    expect(results[0].category).toBe('pattern');
    expect(results[0].tags).not.toContain('#auto');
  });

  it('should include all memories when excludeSystemMemories is false', () => {
    const storage = new MemoryStorage();
    storage.add({
      category: 'pattern',
      tags: ['#async'],
      content: 'User',
      scope: 'local',
    });
    storage.add({
      category: 'auto_decision',
      tags: ['#auto'],
      content: 'System',
      scope: 'local',
    });

    const results = storage.query({ excludeSystemMemories: false });

    expect(results).toHaveLength(2);
  });

  it('should default to including all memories when excludeSystemMemories is undefined', () => {
    const storage = new MemoryStorage();
    storage.add({
      category: 'pattern',
      tags: ['#async'],
      content: 'User',
      scope: 'local',
    });
    storage.add({
      category: 'auto_decision',
      tags: ['#auto'],
      content: 'System',
      scope: 'local',
    });

    const results = storage.query({});

    expect(results).toHaveLength(2); // Backward compatible
  });
});
```

**Serves**: Success Criteria SC-002, SC-005, SC-007

---

## Performance Characteristics

### Complexity Analysis

| Operation                                | Complexity | Notes                                     |
| ---------------------------------------- | ---------- | ----------------------------------------- |
| `query({ excludeSystemMemories: true })` | O(n)       | Single-pass filter over all memories      |
| Tag check `tags.includes('#auto')`       | O(t)       | Where t = tags per memory (typically 2-5) |
| Category dropdown rebuild                | O(m)       | Where m = visible memories after filter   |
| Toggle state change                      | O(1)       | State update + search trigger             |

### Memory Overhead

- **showSystemMemories state**: 1 boolean per panel instance (~1 byte)
- **Filtered arrays**: Temporary allocations during query (GC'd after render)
- **No persistent storage overhead**: Toggle state not persisted to disk
  (session-only)

### Expected Performance

Based on NFR-001 and SC-005:

- **1000 memories**: Toggle change completes in <100ms
- **500 user + 500 system**: Filter removes 500 entries in ~50ms
- **Dropdown rebuild**: <10ms for typical category/tag counts (5-20 items)

**Serves**: NFR-001 (in-memory filtering), SC-005 (performance target)

---

## Security Considerations

### XSS Prevention

All HTML rendering uses existing `escapeHtml()` security function:

```typescript
function renderMemoryItem(memory: Memory): string {
  return `
    <div class="memory-item">
      <div class="category">${escapeHtml(memory.category)}</div>
      <div class="content">${escapeHtml(memory.content)}</div>
      <div class="tags">
        ${memory.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
    </div>
  `;
}
```

### Input Validation

Webview messages validated by TypeScript type guards:

```typescript
function isSearchMessage(message: any): message is SearchMessage {
  return (
    message.command === 'search' &&
    typeof message.showSystemMemories === 'boolean' &&
    (message.scope === 'local' ||
      message.scope === 'global' ||
      message.scope === 'all')
  );
}
```

**Serves**: NFR-003 (XSS prevention)

---

## API Summary

| Component                      | Type           | Changes                               | User Stories   |
| ------------------------------ | -------------- | ------------------------------------- | -------------- |
| `MemoryQuery`                  | Interface      | Add `excludeSystemMemories?: boolean` | US-001, US-002 |
| `MemoryStorage.query()`        | Method         | Implement tag-based exclusion filter  | US-001         |
| `MemoryPanel` webview messages | Protocol       | Add `showSystemMemories` field        | US-001, US-002 |
| `MemoryPanel` state            | Class property | Add `showSystemMemories: boolean`     | US-003         |
| `MemoryPanel` HTML             | UI Template    | Add checkbox toggle control           | US-001, US-002 |
| `MemoryPanel` HTML             | UI Template    | Add empty state message               | US-001         |

**Total Endpoints/Contracts**: 6 internal API modifications

**Functional Requirements Served**:

- FR-001: Display user memories only by default
- FR-002: Provide toggle control
- FR-003: Toggle between user/all modes
- FR-004: Category dropdown respects filter
- FR-005: Tag dropdown respects filter
- FR-006: Search respects filter
- FR-007: Empty state for no user memories
- FR-008: Results count reflects filtered memories
- FR-009: Tag-based exclusion mechanism
- FR-010: Session persistence of toggle state

---

## Implementation Checklist

- [ ] Extend `MemoryQuery` interface with `excludeSystemMemories` field
- [ ] Implement filter logic in `MemoryStorage.query()`
- [ ] Add `showSystemMemories` state to `MemoryPanel` class
- [ ] Update webview message protocol to include `showSystemMemories`
- [ ] Add toggle checkbox to HTML template
- [ ] Filter memories before building category/tag dropdowns
- [ ] Add empty state HTML/logic
- [ ] Update results count to use filtered array length
- [ ] Add unit tests for `MemoryStorage.query()` exclusion logic
- [ ] Add integration tests for toggle state handling
- [ ] Verify XSS prevention with `escapeHtml()` usage

---

**Contract Status**: Complete - Ready for implementation **Last Updated**:
2026-03-20
