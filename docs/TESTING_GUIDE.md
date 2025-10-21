# SpecGofer LSP + MCP Testing Guide

## Setup Complete! ✅

The SpecGofer extension has been successfully compiled with LSP + MCP integration.

## Package Information

- **Extension Package**: `specgofer-lsp-mcp-1.0.0.vsix` (7.52 MB)
- **Includes**: Extension code + Language Server + MCP tools
- **Location**: `/Users/douglaswross/spec-driven-dev-system/extension/`

## Testing Steps

### 1. Install the Extension

```bash
code --install-extension /Users/douglaswross/spec-driven-dev-system/extension/specgofer-lsp-mcp-1.0.0.vsix
```

Or manually:
1. Open VSCode
2. Press `Cmd+Shift+P`
3. Type "Extensions: Install from VSIX..."
4. Select `specgofer-lsp-mcp-1.0.0.vsix`

### 2. Verify Extension Activation

1. Open this workspace: `/Users/douglaswross/spec-driven-dev-system`
2. Check the VSCode Output panel (`View > Output`)
3. Select "SpecGofer Language Server" from the dropdown
4. Look for: `Language Server started successfully`

Expected console logs:
```
SpecGofer (Enterprise AI) extension activated
Language Server started successfully
Spec Kit format detected - ready to use
MCP configuration auto-created for Claude Code integration
```

### 3. Verify MCP Configuration Created

Check if `.vscode/mcp.json` was auto-created:

```bash
cat /Users/douglaswross/spec-driven-dev-system/.vscode/mcp.json
```

Expected content:
```json
{
  "mcp": {
    "servers": {
      "specgofer": {
        "command": "node",
        "args": [
          "/path/to/language-server/dist/server.js"
        ],
        "env": {
          "ANTHROPIC_API_KEY": "${env:ANTHROPIC_API_KEY}"
        }
      }
    }
  }
}
```

### 4. Test LSP Communication

The extension should automatically:
- Start the Language Server on activation
- Load specs from `.specify/specs/`
- Display them in the "SpecGofer - Enterprise AI" sidebar

Check the sidebar:
1. Click the SpecGofer icon in the Activity Bar (left side)
2. You should see "Test Calculator Function" spec listed
3. Expand to see 7 tasks

### 5. Test MCP Tools (Requires Claude Code Extension)

**Prerequisites:**
- Install Claude Code extension from VSCode Marketplace
- Set `ANTHROPIC_API_KEY` environment variable

**Testing MCP Tools:**

1. Open a new Claude Code chat
2. Try invoking SpecGofer tools:

```
@specgofer specgofer_get_specs
```

Expected response:
```json
{
  "success": true,
  "count": 1,
  "specs": [
    {
      "id": "test-001",
      "title": "Test Calculator Function",
      "status": "ready",
      "taskCount": 7
    }
  ]
}
```

3. Test getting next task:

```
@specgofer specgofer_get_next_task
```

4. Test executing a task:

```
@specgofer specgofer_execute_task --specId test-001 --taskId 1
```

### 6. Verify Spec Kit Parser

Test spec parsing:

1. Open `.specify/specs/test-001/spec.md`
2. Modify the YAML frontmatter or task list
3. Run `SpecGofer: Refresh Specifications` command
4. Check the sidebar updates

### 7. Test Commands

All commands available via Command Palette (`Cmd+Shift+P`):

- `SpecGofer: Initialize Repository` - Create new .specify structure
- `SpecGofer: Upgrade to Spec Kit Format` - Migrate legacy JSON
- `SpecGofer: Show Progress Panel` - Focus the sidebar view
- `SpecGofer: Refresh Specifications` - Reload from disk
- `SpecGofer: Check for Updates` - Check for extension updates

## Expected MCP Tools Available

When Claude Code loads the MCP configuration, these tools should be available:

1. **`specgofer_get_specs`** - Get all specifications
2. **`specgofer_get_next_task`** - Get next available task
3. **`specgofer_execute_task`** - Execute a specific task
4. **`specgofer_update_task_status`** - Update task status
5. **`specgofer_validate_code`** - Validate against constitution
6. **`specgofer_run_tests`** - Run tests for a spec

## Debugging

### Enable Verbose Logging

1. Open VSCode Settings (`Cmd+,`)
2. Search for "specKit"
3. Enable all debug options

### Check Language Server Logs

View logs:
```bash
# Extension logs
code --log-level trace

# Or check Developer Console
Help > Toggle Developer Tools > Console tab
```

### Common Issues

**Issue**: Extension doesn't activate
- **Fix**: Check that `.specify/` folder exists in workspace root

**Issue**: Language Server fails to start
- **Fix**: Check that node_modules are installed in language-server/
- **Fix**: Verify TypeScript compiled correctly

**Issue**: MCP tools not available in Claude
- **Fix**: Ensure `ANTHROPIC_API_KEY` is set
- **Fix**: Check `.vscode/mcp.json` exists
- **Fix**: Restart VSCode to reload MCP configuration

**Issue**: Specs not showing in sidebar
- **Fix**: Run "SpecGofer: Refresh Specifications"
- **Fix**: Check `.specify/specs/` contains valid spec.md files

## Test Spec Details

A test spec has been created at:
```
.specify/specs/test-001/
├── spec.md (Spec Kit format with YAML frontmatter)
└── tasks.md (7 tasks for calculator implementation)
```

This spec is designed to test:
- YAML frontmatter parsing
- Markdown task list parsing
- Task dependencies
- LSP communication
- MCP tool invocation

## Next Steps

After verifying basic functionality:

1. **Create Engineer Review** - Launch review agent to validate implementation
2. **Test with Real Specs** - Create actual project specifications
3. **Test Constitutional Validation** - Verify RLHF scoring works
4. **Test Task Execution** - Have Claude implement a task via MCP
5. **Performance Testing** - Load 50+ specs, verify performance

## Architecture Verification

✅ **Language Server**: Running as LSP server
✅ **MCP Tools**: Exposed via experimental.mcp.tools capability
✅ **LSP Client**: Extension communicates with server
✅ **MCP Config Helper**: Auto-creates .vscode/mcp.json
✅ **Spec Kit Parser**: Parses GitHub Spec Kit Markdown format
✅ **Progress Provider**: Tree view displays specs and tasks

## Success Criteria

- [ ] Extension activates without errors
- [ ] Language Server starts successfully
- [ ] .vscode/mcp.json is auto-created
- [ ] Test spec appears in sidebar
- [ ] All 7 tasks are visible
- [ ] MCP tools are discoverable by Claude Code
- [ ] Can invoke `specgofer_get_specs` successfully
- [ ] Can execute a task via `specgofer_execute_task`

## Report Issues

If you encounter issues:

1. Check the Output panel logs
2. Check Developer Console for errors
3. Verify all files compiled correctly
4. Review this guide's "Common Issues" section

---

**Status**: Ready for testing! 🚀
**Next**: Install extension and verify all checkboxes above
