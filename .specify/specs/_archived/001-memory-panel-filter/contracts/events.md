# Event Contract: Memory Panel Usability Fix

## Overview

This document defines event-based contracts for the Memory Panel Usability Fix
feature. Events are used for communication between the webview and extension
host, as well as internal state change notifications.

**Event Types**:

1. **Webview Events**: Messages posted from webview to extension host
2. **Extension Events**: Messages sent from extension host to webview
3. **Internal Events**: State change notifications (if applicable)

---

## Webview → Extension Events

### Event: toggleSystemMemories

**Description**: User clicked the "Show system memories" checkbox in the Memory
Panel.

**Trigger**: Checkbox `onchange` event in webview HTML.

**Direction**: Webview → Extension Host

#### Event Schema

```typescript
interface ToggleSystemMemoriesEvent {
  command: 'toggleSystemMemories';
  value: boolean;
}
```

#### Event Example (JSON)

```json
{
  "command": "toggleSystemMemories",
  "value": true
}
```

#### Handler Location

`extension/src/ui/MemoryPanel.ts` - `handleMessage()` method

#### Handler Behavior

1. Update panel state: `this.showSystemMemories = message.value`
2. Trigger search refresh with updated toggle state
3. Send updated results back to webview

#### Serves

- **FR-003**: Toggle between user/all memory modes
- **User Story 2**: Access System Telemetry

---

### Event: search

**Description**: User performed a search or filter action in the Memory Panel.

**Trigger**: Search button click, filter dropdown change, or toggle change.

**Direction**: Webview → Extension Host

#### Event Schema

```typescript
interface SearchEvent {
  command: 'search';
  keywords?: string;
  category?: string;
  tags?: string[];
  scope: 'local' | 'global' | 'all';
  showSystemMemories: boolean; // MODIFIED - added this field
}
```

#### Event Example (JSON)

```json
{
  "command": "search",
  "keywords": "async patterns",
  "category": "pattern",
  "tags": ["#typescript"],
  "scope": "local",
  "showSystemMemories": false
}
```

#### Handler Location

`extension/src/ui/MemoryPanel.ts` - `handleMessage()` method (case 'search')

#### Handler Behavior

1. Parse search parameters from message
2. Build `MemoryQuery` object with `excludeSystemMemories` flag
3. Call `MemoryManager.search(query)`
4. Send results back to webview via `searchResults` event

#### Serves

- **FR-006**: Search respects system memory filter state
- **User Story 1**: View User Memories Only

---

## Extension → Webview Events

### Event: searchResults

**Description**: Extension sends filtered memory results back to webview for
display.

**Trigger**: Completion of `MemoryManager.search()` query.

**Direction**: Extension Host → Webview

#### Event Schema

```typescript
interface SearchResultsEvent {
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

#### Event Example (JSON)

```json
{
  "command": "searchResults",
  "results": [
    {
      "category": "pattern",
      "tags": ["#async", "#typescript"],
      "content": "Use Promise.allSettled for parallel operations",
      "timestamp": 1710950400000,
      "scope": "local",
      "learnedFrom": "user_interaction"
    },
    {
      "category": "decision",
      "tags": ["#architecture"],
      "content": "Single JSONL file for memory storage",
      "timestamp": 1710864000000,
      "scope": "global",
      "learnedFrom": "user_interaction"
    }
  ],
  "query": {
    "keywords": "async patterns",
    "category": "",
    "tags": [],
    "scope": "local",
    "showSystemMemories": false
  }
}
```

#### Handler Location

Webview JavaScript in `extension/src/ui/MemoryPanel.ts` HTML template

#### Handler Behavior

1. Clear existing results display
2. Render filtered memories in results list
3. Update results count: "X memories"
4. Show empty state if `results.length === 0`

#### Serves

- **FR-008**: Results count reflects filtered memories
- **FR-007**: Empty state for no user memories

---

### Event: error

**Description**: Extension encountered an error during search or filter
operation.

**Trigger**: Exception thrown in `MemoryManager.search()` or
`MemoryStorage.query()`.

**Direction**: Extension Host → Webview

#### Event Schema

```typescript
interface ErrorEvent {
  command: 'error';
  message: string;
  code?: string;
}
```

#### Event Example (JSON)

```json
{
  "command": "error",
  "message": "Failed to load memories from disk",
  "code": "STORAGE_READ_ERROR"
}
```

#### Handler Location

Webview JavaScript in `extension/src/ui/MemoryPanel.ts` HTML template

#### Handler Behavior

1. Display error message in UI
2. Preserve current search state (don't clear results)
3. Log error to console for debugging

#### Serves

- Edge case handling from spec.md
- User experience for error scenarios

---

## Internal Extension Events

### Event: Memory Panel State Change

**Description**: Internal notification when panel toggle state changes (not
exposed via EventEmitter).

**Trigger**: User toggles "Show system memories" checkbox.

**Direction**: Internal to `MemoryPanel` class

#### State Change

```typescript
class MemoryPanel {
  private showSystemMemories: boolean = false;

  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'toggleSystemMemories':
        const oldValue = this.showSystemMemories;
        this.showSystemMemories = message.value;

        // No event emitted - state change is internal only
        // Trigger search refresh as side effect
        await this.refreshSearch();
        break;
    }
  }
}
```

**Note**: This feature does **not** use VSCode's `EventEmitter` or custom event
bus. State changes are handled synchronously within the `MemoryPanel` class
instance.

#### Serves

- **FR-010**: Session persistence of toggle state
- **User Story 3**: Persistent Filter Preference (within session)

---

## Event Sequence Diagrams

### Sequence: Toggle System Memories

```
User                  Webview               Extension Host          MemoryStorage
 |                       |                        |                      |
 |-- Click toggle ------>|                        |                      |
 |                       |                        |                      |
 |                       |-- toggleSystemMemories->|                      |
 |                       |   { value: true }      |                      |
 |                       |                        |                      |
 |                       |                    Update state               |
 |                       |                    showSystemMemories = true  |
 |                       |                        |                      |
 |                       |                        |-- query() ---------->|
 |                       |                        |  { excludeSystemMemories: false }
 |                       |                        |                      |
 |                       |                        |<-- Memory[] ---------|
 |                       |                        |                      |
 |                       |<-- searchResults ------|                      |
 |                       |   { results: [...] }   |                      |
 |                       |                        |                      |
 |<-- Render results ----|                        |                      |
 |    (shows system logs)|                        |                      |
```

### Sequence: Search with Filter

```
User                  Webview               Extension Host          MemoryStorage
 |                       |                        |                      |
 |-- Type keyword ------>|                        |                      |
 |-- Click search ------>|                        |                      |
 |                       |                        |                      |
 |                       |-- search ------------->|                      |
 |                       |   {                    |                      |
 |                       |     keywords: "async", |                      |
 |                       |     showSystemMemories: false                |
 |                       |   }                    |                      |
 |                       |                        |                      |
 |                       |                        |-- query() ---------->|
 |                       |                        |  {                   |
 |                       |                        |    keywords: "async",|
 |                       |                        |    excludeSystemMemories: true
 |                       |                        |  }                   |
 |                       |                        |                      |
 |                       |                        |<-- Memory[] ---------|
 |                       |                        | (filtered results)   |
 |                       |                        |                      |
 |                       |<-- searchResults ------|                      |
 |                       |   { results: [...] }   |                      |
 |                       |                        |                      |
 |<-- Render results ----|                        |                      |
 |    (user memories only)|                       |                      |
```

---

## Event Error Handling

### Error Scenario: Search Failure

```typescript
// Extension host catches error and sends error event
try {
  const results = await this.memoryManager.search(query);
  this.panel.webview.postMessage({
    command: 'searchResults',
    results,
    query,
  });
} catch (error) {
  this.panel.webview.postMessage({
    command: 'error',
    message: error.message || 'Failed to search memories',
    code: 'SEARCH_FAILED',
  });
}
```

### Error Scenario: Invalid Message

```typescript
// Extension host validates message structure
function isToggleMessage(message: any): message is ToggleSystemMemoriesEvent {
  return (
    message.command === 'toggleSystemMemories' &&
    typeof message.value === 'boolean'
  );
}

if (!isToggleMessage(message)) {
  console.error('Invalid toggle message:', message);
  return; // Ignore invalid message
}
```

---

## Event Traceability

| Event                  | Direction           | User Story     | Functional Requirements |
| ---------------------- | ------------------- | -------------- | ----------------------- |
| `toggleSystemMemories` | Webview → Extension | US-002         | FR-003                  |
| `search` (modified)    | Webview → Extension | US-001, US-002 | FR-006                  |
| `searchResults`        | Extension → Webview | US-001, US-002 | FR-008                  |
| `error`                | Extension → Webview | Edge cases     | Error handling          |
| Panel state change     | Internal            | US-003         | FR-010                  |

---

## Event Testing Contracts

### Test: Toggle Event Handling

```typescript
describe('MemoryPanel toggle events', () => {
  it('should update state and refresh search when toggle event received', async () => {
    const panel = new MemoryPanel(memoryManager);

    // Simulate toggle message from webview
    await panel.handleMessage({
      command: 'toggleSystemMemories',
      value: true,
    });

    expect(panel['showSystemMemories']).toBe(true);
    expect(memoryManager.search).toHaveBeenCalledWith({
      excludeSystemMemories: false,
      scope: 'both',
    });
  });
});
```

### Test: Search Event with Toggle State

```typescript
describe('MemoryPanel search events', () => {
  it('should include toggle state in search query', async () => {
    const panel = new MemoryPanel(memoryManager);
    panel['showSystemMemories'] = false;

    // Simulate search message from webview
    await panel.handleMessage({
      command: 'search',
      keywords: 'async',
      scope: 'local',
      showSystemMemories: false,
    });

    expect(memoryManager.search).toHaveBeenCalledWith({
      keywords: 'async',
      scope: 'local',
      excludeSystemMemories: true, // Inverted from showSystemMemories
    });
  });
});
```

---

## Performance Characteristics

| Event                  | Frequency                      | Latency Target | Notes                  |
| ---------------------- | ------------------------------ | -------------- | ---------------------- |
| `toggleSystemMemories` | Low (user-initiated)           | <50ms          | State update only      |
| `search`               | Medium (per keystroke if live) | <100ms         | Includes disk I/O      |
| `searchResults`        | Medium (response to search)    | <20ms          | Webview rendering      |
| `error`                | Low (exceptional cases)        | <10ms          | Simple message display |

---

## Security Considerations

### Event Message Validation

All webview messages are validated before processing:

```typescript
function validateMessage(message: any): boolean {
  // Type checking
  if (typeof message.command !== 'string') return false;

  // Command-specific validation
  switch (message.command) {
    case 'toggleSystemMemories':
      return typeof message.value === 'boolean';
    case 'search':
      return (
        typeof message.showSystemMemories === 'boolean' &&
        ['local', 'global', 'all'].includes(message.scope)
      );
    default:
      return false;
  }
}
```

### XSS Prevention in Events

All event data rendered in webview uses `escapeHtml()`:

```typescript
function renderSearchResults(event: SearchResultsEvent): void {
  const html = event.results
    .map(
      (m) => `
    <div class="memory-item">
      <div class="content">${escapeHtml(m.content)}</div>
      <div class="category">${escapeHtml(m.category)}</div>
    </div>
  `
    )
    .join('');

  document.getElementById('results').innerHTML = html;
}
```

**Serves**: NFR-003 (XSS prevention)

---

## Event Summary

| Event Type                | Count | Description                                 |
| ------------------------- | ----- | ------------------------------------------- |
| Webview → Extension       | 2     | `toggleSystemMemories`, `search` (modified) |
| Extension → Webview       | 2     | `searchResults`, `error`                    |
| Internal State Changes    | 1     | Toggle state persistence                    |
| **Total Event Contracts** | **5** | All documented with schemas and examples    |

**Functional Requirements Served**: FR-003, FR-006, FR-007, FR-008, FR-010

---

**Contract Status**: Complete - Ready for implementation **Last Updated**:
2026-03-20
