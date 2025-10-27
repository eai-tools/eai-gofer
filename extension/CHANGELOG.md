# Changelog

All notable changes to the SpecGofer extension will be documented in this file.

## [1.15.1] - 2025-10-28

Auto-release

## [1.15.0] - 2025-10-28

Auto-release

## [1.14.0] - 2025-10-27

Auto-release

## [1.13.0] - 2025-10-27

Just updating so that I know we are on the latest

## [1.12.10] - 2025-10-26

chore: pre-release changes

Auto-committed changes before release v1.12.9

## [1.12.9] - 2025-10-26

chore: pre-release changes

Auto-committed changes before release v1.12.8

## [1.12.8] - 2025-10-26

Fix Initialize command to always trigger update flow for spec-kit format

## [1.12.7] - 2025-10-26

chore: pre-release changes

Auto-committed changes before release v1.12.6

## [1.12.6] - 2025-10-26

chore: pre-release changes

Auto-committed changes before release v1.12.5

## [1.12.5] - 2025-10-26

chore: pre-release changes

Auto-committed changes before release v1.12.4

## [1.12.4] - 2025-10-26

Complete SpecKit setup: bash scripts, Claude commands, VSCode settings + debug logging

## [1.12.3] - 2025-10-26

Fix fallback setup when spec-kit CLI fails + improve release automation

## [1.11.0] - 2025-10-25

Fix branch-info.json location and simplify BranchSpecManager

## [1.10.0] - 2025-10-25

Fix branch-info.json location and simplify BranchSpecManager

## [1.9.0] - 2025-10-25

Fix branch-info.json location and simplify BranchSpecManager

## [1.8.0] - 2025-10-25

Fix branch-info.json location and simplify BranchSpecManager

## [1.7.0] - 2025-10-24

Auto-release

## [1.6.0] - 2025-10-24

Auto-release

## [1.4.8] - 2025-10-23

Test end-to-end workflow: GitHub Pages + auto-updater integration

## [1.4.7] - 2025-10-22

Fix auto-updater for github releases public page

## [1.4.6] - 2025-10-22

Fix auto-updater when GitHub releases not available yet

## [1.4.5] - 2025-10-22

Critical fixes: Preserve constitution during updates, fix update button error

## [1.4.4] - 2025-10-22

Patch to try to get tree views to work better

## [1.4.3] - 2025-10-22

Test GitHub Actions permissions fix

## [1.4.2] - 2025-10-22

Create v1.4.2 with all fixes applied

## [1.4.1] - 2025-10-22

Added speckit internal delivery

## [1.4.0] - 2025-10-22

Added speckit internal delivery

## [1.3.4] - 2025-10-21

Auto-release

## [1.3.3] - 2025-10-21

### Added

- **Update Now Button**: Added "Update Now" button to Specifications view for
  easy one-click updates
- **Multi-Workspace Support**: Extension now properly reinitializes when
  switching between workspaces

### Fixed

- **Workspace Detection**: Fixed specifications and constitution not being found
  when opening different repositories
- **Error Messages**: Improved error messages showing exact paths when .specify
  folder or constitution is not found
- **Provider Reinitialization**: Providers now properly dispose and reinitialize
  on workspace changes

### Changed

- **GitHub Actions**: Enhanced release workflow to include version-specific
  changelog entries in release notes
- **CHANGELOG**: Now properly maintained and extracted for GitHub releases

## [1.3.2] - 2025-10-21

### Fixed

- **Language Server Path Resolution**: Improved path resolution for packaged
  VSIX installations
- **Build Process**: Enhanced webpack configuration for production builds

### Changed

- Updated extension metadata and documentation
- Improved error handling and logging

## [1.3.0] - 2025-10-20

### Added

- **Automatic Update Installation**: Auto-updater now downloads and installs
  updates automatically
  - Downloads VSIX from GitHub releases
  - Installs via `code --install-extension` using child_process
  - Prompts user to reload VSCode after installation
  - Fallback to manual download if automatic installation fails
  - Works with both public and private GitHub repositories

### Changed

- **Improved Update UX**: "Install Update" button replaces "Download Update"
  - One-click update process (download + install)
  - Status bar shows progress during download/install
  - Automatic cleanup of temporary VSIX files
- **Better Error Handling**: Clear error messages with manual fallback option

### Technical Details

- Uses Node.js `child_process.exec()` to invoke VSCode CLI
- Downloads VSIX to system temp directory
- Follows GitHub API redirects automatically
- Cross-platform support (macOS, Linux, Windows)

## [1.2.1] - 2025-10-20

### Fixed

- **Language Server Path Resolution**: Fixed critical bug where Language Server
  could not be found in packaged VSIX
  - Added fallback logic to check both production (`language-server/`) and
    development (`../language-server/`) paths
  - Improved error messages to show attempted paths for debugging
  - Added logging to show resolved Language Server path on startup

## [1.2.0] - 2025-10-20

### Added

- **LSP + MCP Integration**: Full Language Server Protocol integration with
  Model Context Protocol support
- **6 MCP Tools** for Claude Code integration:
  - `specgofer_get_specs` - Get all specifications
  - `specgofer_get_next_task` - Get next available task
  - `specgofer_execute_task` - Execute a specific task
  - `specgofer_update_task_status` - Update task status
  - `specgofer_validate_code` - Validate against constitution
  - `specgofer_run_tests` - Run tests for a spec
- **Auto MCP Configuration**: Automatically creates `.vscode/mcp.json` for
  Claude Code
- **Input Validation**: Security hardening with path traversal protection
- **Flexible Task Parser**: Supports both `**T001**: Description` and
  `#1 Description` formats

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

3. **Verify MCP Configuration**: Check that `.vscode/mcp.json` was created
   automatically

4. **Test with Claude Code**: Install Claude Code extension and test MCP tools
   with:
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
