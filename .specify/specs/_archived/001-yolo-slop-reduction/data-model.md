# Data Model: YOLO Slop Reduction Mode

## Entities

### FixPattern

Registry entry defining a fixable slop pattern.

| Field  | Type                                         | Required | Description                                                                        |
| ------ | -------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| name   | string                                       | Yes      | Pattern identifier (e.g., 'console-log')                                           |
| regex  | RegExp                                       | Yes      | Line-level detection regex                                                         |
| fix    | `(line: string) => string \| null` or `null` | No       | Fix function — returns modified line or null to remove. Null means detection-only. |
| reason | string                                       | Yes      | Human-readable reason for the fix                                                  |

### FixLogEntry

JSONL record appended for each auto-fix applied.

| Field           | Type              | Required | Description                                      |
| --------------- | ----------------- | -------- | ------------------------------------------------ |
| timestamp       | string (ISO-8601) | Yes      | When the fix was applied                         |
| file            | string            | Yes      | Absolute path to the fixed file                  |
| line            | number            | Yes      | Line number (1-based)                            |
| pattern         | string            | Yes      | Pattern name that matched                        |
| originalSnippet | string            | Yes      | Original line content (trimmed, max 120 chars)   |
| replacement     | string            | Yes      | What it was replaced with ("" for removed lines) |
| reason          | string            | Yes      | Why this fix was applied                         |

### FixResult

Return value from `SlopReducer.reduceFile()`.

| Field    | Type          | Required | Description                          |
| -------- | ------------- | -------- | ------------------------------------ |
| fixCount | number        | Yes      | Number of fixes applied in this file |
| fixes    | FixLogEntry[] | Yes      | Details of each fix                  |

## State Transitions

No complex state machine — the feature is stateless per invocation. The only
persistent state is:

- `sessionFixCount` (in-memory counter, resets on extension restart)
- `slop-reduction.jsonl` (append-only log on disk)
