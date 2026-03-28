# API Contract: Memory Panel Usability Fix

## Overview

This feature does **not require external API endpoints**. All changes are
confined to internal TypeScript APIs within the VSCode extension.

## External API Status

**REST/HTTP Endpoints**: None

**Rationale**: The Memory Panel Usability Fix is a UI-focused enhancement that
operates entirely within the VSCode extension context. It modifies how memories
are filtered and displayed in the webview panel, but does not expose any
external APIs or services.

## Related Contracts

For internal TypeScript API modifications, see:

- [internal-api.md](./internal-api.md) - Internal service contracts, interfaces,
  and message protocols

## Architecture Context

```
┌─────────────────────────────────────────────────────────────┐
│  VSCode Extension (Local Process)                           │
│                                                              │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │ MemoryPanel │────>│ MemoryManager│────>│MemoryStorage│ │
│  │  (Webview)  │     │              │     │   (JSONL)   │ │
│  └─────────────┘     └──────────────┘     └──────────────┘ │
│         │                                         │          │
│         │ Toggle state, search queries            │          │
│         └─────────────────────────────────────────┘          │
│                   (Internal messages only)                   │
└─────────────────────────────────────────────────────────────┘
           No external network calls or HTTP endpoints
```

All data flows are:

1. **Webview ↔ Extension Host**: VSCode webview message passing (internal)
2. **Extension ↔ File System**: Read/write `memories.jsonl` (local disk)
3. **No external services**: No REST APIs, no cloud services, no network calls

## User-Facing Interfaces

While this feature has no external APIs, it does modify user-facing interfaces:

1. **Command Palette**: `Gofer: View Memories` (existing command, no changes)
2. **Memory Panel UI**: Adds toggle control and empty state (internal webview)
3. **Keyboard Shortcuts**: None added
4. **Status Bar**: None added
5. **Settings**: None added (toggle state is session-only)

## Future API Considerations

If memory filtering capabilities are exposed in future features:

- **Potential Use Case**: CLI command to export filtered memories
- **Potential Use Case**: MCP server endpoint for memory queries
- **Potential Use Case**: REST API for remote memory synchronization

These are **out of scope** for the current feature (001-memory-panel-filter).

---

**Contract Status**: No external APIs required **Last Updated**: 2026-03-20
