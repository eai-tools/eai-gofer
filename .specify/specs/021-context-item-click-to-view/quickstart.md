# Quickstart: Context Item Click-to-View

## Prerequisites

- VSCode with Gofer extension installed
- An active Claude Code session (so the Context Window panel has data)
- Workspace with `.specify/` directory initialized

## Testing the Feature

### Manual Testing

1. Open a workspace with Gofer initialized
2. Start a Claude Code session in the terminal
3. Run a few tool calls so observation data accumulates
4. Look at the **Context Window** panel in the Gofer sidebar
5. Expand a session node to see the 6 categories
6. **Click any category** (e.g., "Spec Artifacts")
7. A webview panel should open with formatted content for that category
8. Click a **different category** — the same panel should update (no new tab)

### Category-Specific Testing

| Category             | What to Verify                                            |
| -------------------- | --------------------------------------------------------- |
| Spec Artifacts       | Lists `.specify/specs/` directories with file previews    |
| Memories/Hints       | Shows memory entries grouped by category with tags        |
| System Files         | Lists CLAUDE.md, AGENTS.md, constitution.md with previews |
| Conversation History | Shows token breakdown and session metadata                |
| Tool Outputs         | Lists recent observation files sorted by timestamp        |
| Masked Observations  | Shows older observations or explains none exist           |

### Empty State Testing

- Delete all spec directories → Click "Spec Artifacts" → Should show "No spec
  artifacts found"
- Delete all observation files → Click "Tool Outputs" → Should show "No recent
  tool outputs"

### Automated Tests

```bash
npm test -- tests/unit/contextContentPanel.test.ts
npm test -- tests/unit/contextWindowProvider.test.ts
```

## Key Files

| File                                      | Purpose                                      |
| ----------------------------------------- | -------------------------------------------- |
| `extension/src/ui/ContextContentPanel.ts` | Singleton webview panel (NEW)                |
| `extension/src/contextWindowProvider.ts`  | Tree provider with click commands (MODIFIED) |
| `extension/src/extension.ts`              | Command registration (MODIFIED)              |
| `extension/package.json`                  | Command declaration (MODIFIED)               |

## Common Issues

### Panel doesn't open when clicking

**Problem**: Command not registered yet. **Solution**: Ensure
`gofer.showContextCategoryContent` is in `registerGlobalCommands()`, not
`registerCommands()`. Check package.json has the command declared.

### Panel shows empty for all categories

**Problem**: `workspacePath` not passed to panel. **Solution**: Verify the
command handler passes the workspace path from
`vscode.workspace.workspaceFolders`.

### Content appears as raw HTML

**Problem**: Missing HTML escaping. **Solution**: Ensure `escapeHtml()` is
called on all file content before inserting into template.
