# Data Model: Context Item Click-to-View

## Entities

### ContextContentPanel

Singleton webview panel — no persistent data model. State is transient
(recreated on each click).

| Field         | Type                       | Required | Description                   |
| ------------- | -------------------------- | -------- | ----------------------------- |
| currentPanel  | static ContextContentPanel | No       | Singleton reference           |
| panel         | vscode.WebviewPanel        | Yes      | The underlying VSCode webview |
| workspacePath | string                     | Yes      | Workspace root for file reads |

### Observation (existing — read-only)

JSON files at `.specify/hooks/observations/{uuid}.json`, written by
post-tool-use hook.

| Field        | Type          | Required | Description                                |
| ------------ | ------------- | -------- | ------------------------------------------ |
| id           | string (uuid) | Yes      | Unique observation ID                      |
| toolName     | string        | Yes      | Name of the tool that produced this output |
| toolInput    | object        | No       | Input parameters passed to the tool        |
| toolResponse | string        | Yes      | Tool output (max 10KB, may be truncated)   |
| timestamp    | string (ISO)  | Yes      | When the observation was captured          |
| truncated    | boolean       | Yes      | Whether the response was truncated at 10KB |

### BridgeData (existing — read-only)

JSON file at `.specify/hooks/context-bridge-{sessionId}.json`, written by
post-tool-use hook.

| Field                            | Type   | Required | Description                        |
| -------------------------------- | ------ | -------- | ---------------------------------- |
| sessionId                        | string | Yes      | Claude Code session identifier     |
| model                            | string | Yes      | Model name (e.g., claude-opus-4-6) |
| displayName                      | string | No       | Session display name               |
| context.totalContextTokens       | number | Yes      | Total tokens in context            |
| context.inputTokens              | number | Yes      | Direct input tokens                |
| context.cacheReadInputTokens     | number | Yes      | Cached tokens read                 |
| context.cacheCreationInputTokens | number | Yes      | New cache tokens                   |
| context.outputTokens             | number | Yes      | Output tokens                      |
| context.utilizationPercent       | number | Yes      | Context utilization percentage     |

## No Database / No Migrations

This feature is entirely read-only and UI-based. No new data is persisted. All
content is read from existing files on disk.
