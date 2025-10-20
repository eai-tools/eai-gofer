# Changelog

All notable changes to the SpecGofer extension will be documented in this file.

## [1.2.0] - 2025-10-20

### Added
- **LSP + MCP Integration**: Full Language Server Protocol integration with Model Context Protocol support
- **6 MCP Tools** for Claude Code integration:
  - `specgofer_get_specs` - Get all specifications
  - `specgofer_get_next_task` - Get next available task
  - `specgofer_execute_task` - Execute a specific task
  - `specgofer_update_task_status` - Update task status
  - `specgofer_validate_code` - Validate against constitution
  - `specgofer_run_tests` - Run tests for a spec
- **Auto MCP Configuration**: Automatically creates `.vscode/mcp.json` for Claude Code
- **Input Validation**: Security hardening with path traversal protection
- **Flexible Task Parser**: Supports both `**T001**: Description` and `#1 Description` formats

### Fixed
- Task parser regex now supports multiple GitHub Spec Kit task formats
- MCP configuration path resolution works correctly in packaged VSIX
- Input validation prevents path traversal attacks
- Extension context properly passed to MCP config helper

### Changed
- Updated description to reflect LSP+MCP orchestration status
- Language Server now bundled with extension for production deployment

### Technical Details
- Language Server runs as separate Node.js process via LSP
- MCP tools exposed via LSP experimental capabilities
- VSCode 1.102+ native MCP support utilized
- Production-ready VSIX packaging (7.52 MB)

## [1.1.0] - 2025-10-19

### Added
- GitHub Spec Kit format support
- SpecKitParser for YAML frontmatter and Markdown task lists
- Progress tree view with spec and task display
- Auto-updater with periodic update checks

### Changed
- Migrated from legacy JSON format to GitHub Spec Kit Markdown format

## [1.0.0] - 2025-10-19

### Added
- Initial release
- Basic .specify folder detection
- Specification migration tools
- Tree view for specifications
- Commands for initialization and upgrade

---

## Upgrade Instructions

To upgrade from version 1.1.0 or earlier:

1. **Install the new VSIX**:
   ```bash
   code --install-extension /path/to/specgofer-1.2.0.vsix
   ```

2. **Reload VSCode**: Press `Cmd+Shift+P` and select "Developer: Reload Window"

3. **Verify MCP Configuration**: Check that `.vscode/mcp.json` was created automatically

4. **Test with Claude Code**: Install Claude Code extension and test MCP tools with:
   ```
   @specgofer specgofer_get_specs
   ```

## Breaking Changes

None. Version 1.2.0 is fully backward compatible with 1.1.0.

## Known Issues

- Webpack emits optimization warning (cosmetic only, can be ignored)
- Some console.log statements not yet migrated to LSP logging
- No automated tests yet (manual testing protocol available)

## Future Plans

- Constitutional validation with RLHF scoring
- Automated task orchestration loop
- Test runner integration
- File watching for auto-refresh
- Caching layer for performance
- Complete documentation
