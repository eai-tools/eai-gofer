# Data Model: Observation Content Capture

## Entities

### ObservationFile

Written by the hook to `.specify/hooks/observations/{id}.json`, read and
deleted by the extension.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Yes | Unique identifier, matches filename |
| toolName | string | Yes | Tool name (e.g., "Read", "Bash", "Grep") |
| toolInput | object | Yes | Raw tool_input from hook stdin |
| toolResponse | string | Yes | Stringified tool_response, truncated to 10KB |
| timestamp | string (ISO) | Yes | When the tool call occurred |
| truncated | boolean | Yes | Whether toolResponse was truncated |

**Validation Rules**:

- `id` must be a valid UUID v4
- `toolResponse` must be <= 10,240 bytes after stringification
- `truncated` is true if original content exceeded 10KB

### BridgeData.lastToolUse (Extended)

Extended fields in the existing `context-bridge.json` bridge.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| toolName | string | Yes | Existing: tool name |
| timestamp | number | Yes | Existing: epoch milliseconds |
| observationId | string (UUID) | No | NEW: pointer to observation file |
| toolInput | object | No | NEW: raw tool_input for metadata |

**Validation Rules**:

- `observationId` is present only when `tool_response` was available in stdin
- `toolInput` is present only when `tool_input` was available in stdin
- Existing fields (`toolName`, `timestamp`) are always present

## State Transitions

```
Observation File Lifecycle:

  [created by hook]
       │
       ▼
  On Disk (.specify/hooks/observations/{uuid}.json)
       │
       ├── Extension reads → trackObservation() → [deleted]
       │
       └── Not read within 30 min → [deleted by stale cleanup]
```

## File Format Examples

### New-format observation file

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "toolName": "Read",
  "toolInput": {
    "file_path": "/Users/dev/project/src/config.ts"
  },
  "toolResponse": "import { join } from 'path';\n\nexport const CONFIG = {\n  port: 3000,\n  ...",
  "timestamp": "2026-02-09T12:00:00.000Z",
  "truncated": false
}
```

### New-format bridge (with observation pointer)

```json
{
  "timestamp": 1739102400000,
  "sessionId": "abc123",
  "model": "claude-opus-4-5-20251101",
  "context": { "...existing fields..." },
  "lastToolUse": {
    "toolName": "Read",
    "timestamp": 1739102400000,
    "observationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "toolInput": {
      "file_path": "/Users/dev/project/src/config.ts"
    }
  },
  "session": { "active": true, "lastActivity": 1739102400000 }
}
```

### Old-format bridge (backward compat, no observation)

```json
{
  "timestamp": 1739102400000,
  "sessionId": "abc123",
  "model": "claude-opus-4-5-20251101",
  "context": { "...existing fields..." },
  "lastToolUse": {
    "toolName": "Read",
    "timestamp": 1739102400000
  },
  "session": { "active": true, "lastActivity": 1739102400000 }
}
```
