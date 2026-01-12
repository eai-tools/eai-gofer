# Changelog

All notable changes to the SpecGofer extension will be documented in this file.

## [4.2.1] - 2026-01-12

Show welcome view with Initialize button when no .specify folder

## [4.2.0] - 2026-01-12

Complete context compaction protocol with integration and E2E tests

## [4.1.2] - 2026-01-11

chore: pre-release changes

Auto-committed changes before release v4.1.1

## [4.1.1] - 2026-01-08

Fix buggy regex that corrupted copilot-instructions.md on upgrade

## [4.1.0] - 2026-01-08

Replace external spec-kit CLI with bundled resources, add hydrate command

## [4.0.1] - 2026-01-07

Add IPC status, ValidationService, TestHarnessGenerator, and hydrate command

## [4.0.0] - 2026-01-07

LLM Council integration with multi-provider parallel execution, expanded test coverage, and business scenario triage

## [3.6.1] - 2025-11-05

chore: pre-release changes

Auto-committed changes before release v3.6.0

## [3.6.0] - 2025-11-05

chore: pre-release changes

Auto-committed changes before release v3.5.0

## [3.5.0] - 2025-11-05

Add dual-mode monitoring: fast idle detection (10s) + comprehensive checks (60s) with question-focused prompts

## [3.4.0] - 2025-11-05

Add dual-mode monitoring: fast idle detection (10s) + comprehensive checks (60s)
with question-focused prompts

## [3.3.0] - 2025-11-05

Add dual-mode monitoring: fast idle detection (10s) + comprehensive checks (60s)
with question-focused prompts

## [3.2.4] - 2025-11-05

Reduce autonomous monitoring frequency and add pause/resume controls

## [3.2.3] - 2025-11-05

reduce autonomous monitoring frequency and add pause/resume controls

## [3.2.2] - 2025-11-04

Reduce autonomous monitoring frequency and add pause/resume controls

## [3.2.1] - 2025-11-04

Make default Haiku prompts visible in VSCode settings

## [3.2.0] - 2025-11-04

Add real-time monitoring with selective interruption and fully configurable
Haiku prompts

## [3.1.0] - 2025-11-04

Add proactive autonomous decision-making - Haiku now decides next actions
(continue, engineering review, performance review)

## [3.0.42] - 2025-11-04

chore: pre-release changes

Auto-committed changes before release v3.0.41

## [3.0.41] - 2025-11-04

chore: pre-release changes

Auto-committed changes before release v3.0.40

## [3.0.40] - 2025-11-04

Unified version with release automation improvements and spinner detection fixes

## [3.0.39] - 2025-11-04

chore: pre-release changes

Auto-committed changes before release v3.0.38

## [3.0.38] - 2025-11-04

chore: pre-release changes

Auto-committed changes before release v3.0.37

## [3.0.37] - 2025-11-04

chore: pre-release changes

Auto-committed changes before release v3.0.36

## [3.0.36] - 2025-11-04

chore: pre-release changes

Auto-committed changes before release v3.0.35

## [3.0.35] - 2025-11-04

chore: pre-release changes

Auto-committed changes before release v3.0.34

## [Unreleased]

### Changed

- **Simplified question detection to only check for spinner absence** - Removed
  the `>` prompt check from question detection logic since the user revealed
  that the prompt is always present (even when Claude Code is still working).
  Now the ONLY check is: if no spinner is detected in the last 30 lines, Claude
  Code is idle and we ask Haiku to analyze the context. This is much simpler and
  more reliable than checking for prompts that are always present.
  (ClaudeCodeAutonomousResponder.ts:145-180)

## [3.0.34] - 2025-11-04

### Fixed

- **Question detection when spinners appear after question text** - Changed from
  `lastLineIsQuestion` (checking only the absolute last line) to
  `recentLineHasQuestion` (checking any of the last 5 lines). This handles cases
  where Claude Code shows spinners like "✳ Flibbertigibbeting…" after the
  question text, which was preventing detection because the spinner became the
  last line. Now all three patterns (multiple-choice, yes-no, list selection)
  check if ANY recent line ends with `?`, not just the last line.
  (ClaudeCodeAutonomousResponder.ts:191-239)

## [3.0.33] - 2025-11-04

### Fixed

- **Extended question detection fix to all patterns** - Applied the
  `lastLineIsQuestion` fix to Pattern 3 (yes-no) and Pattern 4 (list selection)
  in addition to Pattern 2 (multiple-choice). All three patterns now recognize
  questions where the question text ending with `?` is the last line, without
  requiring an explicit `>` prompt to be present.
  (ClaudeCodeAutonomousResponder.ts:211-239)

## [3.0.32] - 2025-11-04

### Fixed

- **Question detection when question text is the last line** - Enhanced Pattern
  2 (multiple-choice) detection to recognize questions where the question text
  itself (ending with `?`) is the last line in the terminal buffer, rather than
  requiring an explicit `>` prompt. This fixes detection for Claude Code
  questions where numbered options are followed by question text like "Which
  would you prefer?" without the `>` prompt being captured yet. Added
  `lastLineIsQuestion` check and updated debug logging to show this status.
  (ClaudeCodeAutonomousResponder.ts:191-209)

## [3.0.31] - 2025-11-04

### Added

- **Debug logging for question detection** - Added comprehensive diagnostic
  logging to help troubleshoot why questions aren't being detected. Logs buffer
  size, last 5 lines, promptLine/lastLine values, and pattern matching results.
  Check SpecGofer output channel for debug information when questions appear in
  Claude Code terminal. (ClaudeCodeAutonomousResponder.ts:162-261)

## [3.0.30] - 2025-11-04

### Improved

- **Question detection with decorative separators** - Enhanced autonomous
  question detection to handle Claude Code questions that include decorative
  separator lines (Unicode box-drawing characters like ─━═). Added helper
  functions to skip separators and find actual prompts. Increased context window
  from 20 to 30 lines for better question detection. Now supports 5 distinct
  question types: text input, multiple choice, yes/no, list selection, and
  general prompts. (ClaudeCodeAutonomousResponder.ts:137-226)

## [3.0.29] - 2025-11-04

### Fixed

- **Duplicate spinner output in Claude Code terminal** - Implemented missing
  `setDimensions` callback in Pseudoterminal interface to enable proper ANSI
  escape sequence handling. Spinners now correctly overwrite the same line
  instead of creating hundreds of duplicate lines.
  (autonomousCommands.ts:693-706)

## [3.0.28] - 2025-11-04

chore: pre-release changes

Auto-committed changes before release v3.0.27

## [3.0.27] - 2025-11-04

chore: pre-release changes

Auto-committed changes before release v3.0.26

## [3.0.26] - 2025-11-04

chore: pre-release changes

Auto-committed changes before release v3.0.25

## [3.0.25] - 2025-11-03

chore: pre-release changes

Auto-committed changes before release v3.0.24

## [3.0.24] - 2025-11-03

chore: pre-release changes

Auto-committed changes before release v3.0.23

## [3.0.23] - 2025-11-03

autostuff21

## [3.0.22] - 2025-11-03

chore: pre-release changes

Auto-committed changes before release v3.0.21

## [3.0.21] - 2025-11-03

chore: pre-release changes

Auto-committed changes before release v3.0.20

## [3.0.20] - 2025-11-03

chore: pre-release changes

Auto-committed changes before release v3.0.19

## [3.0.19] - 2025-11-03

chore: pre-release changes

Auto-committed changes before release v3.0.18

## [3.0.18] - 2025-11-03

autostuff

## [3.0.17] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.16

## [3.0.16] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.15

## [3.0.15] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.14

## [3.0.14] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.13

## [3.0.13] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.12

## [3.0.12] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.11

## [3.0.11] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.10

## [3.0.10] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.9

## [3.0.9] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.8

## [3.0.8] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.7

## [3.0.7] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.6

## [3.0.6] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.5

## [3.0.5] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.4

## [3.0.4] - 2025-11-02

chore: pre-release changes

Auto-committed changes before release v3.0.3

## [3.0.3] - 2025-11-02

Fixed missing command registrations for refreshSpecs and updateNow

## [3.0.2] - 2025-11-01

chore: pre-release changes

Auto-committed changes before release v3.0.1

## [3.0.1] - 2025-11-01

Fixed missing command registration - recompiled extension with telemetry
integration

## [3.0.0] - 2025-11-01

Full release - see if it works

## [Unreleased]

## [2.1.0] - 2025-11-01

### Added

- **Memory & Learning System (Feature 001)**: Complete autonomous execution
  framework with 4 major components
  - **MemoryManager**: Persistent knowledge storage with global/spec/session
    scopes, search, and validation
  - **HintLoader**: Contextual guidance system with file discovery, caching, and
    YAML parsing
  - **DependencyGraph**: Spec relationship tracking with cycle detection,
    topological sorting, and impact analysis
  - **ContextCompactor**: Intelligent context window management with automatic
    summarization at 80% threshold
- **Comprehensive Logging**: Structured logging across all major operations with
  debug, info, warn, and error levels
- **270 Passing Tests**: 97% test coverage across all Memory & Learning System
  components
- **Complete TypeScript Contracts**: Full type definitions for all interfaces,
  data models, and APIs
- **Session Management**: Autonomous session lifecycle with pause, resume, and
  failure recovery
- **Performance Optimizations**: File caching, incremental search, and batch
  operations

### Technical Highlights

- 6 major phases completed (159 of 180 tasks, 88% complete)
- Integration with VSCode Extension API and Logger utility
- JSON-based persistence with schema validation
- Graph-based dependency management using graphlib
- Token estimation and context analysis (chars/4 approximation)
- Session backup/restore for compaction rollback
- Vitest test suite with comprehensive mocking strategy

### Documentation

- Complete implementation summary with architecture guide
- Detailed phase-by-phase completion tracking
- Integration patterns for autonomous execution
- Known limitations and future enhancements documented

## [2.0.6] - 2025-10-31

chore: pre-release changes

Auto-committed changes before release v2.0.5

## [2.0.5] - 2025-10-30

chore: pre-release changes

Auto-committed changes before release v2.0.4

## [2.0.4] - 2025-10-29

### Bug Fixes

- Fixed path reference updating during upgrade (content-based, no file moving)
- Fixed missing `showTaskDetails` command registration that caused 'command not
  found' error when clicking tasks
- Kept Claude commands in `.claude/commands/` per SpecGofer convention
- Auto-fixes `specs/` references to `.specify/specs/` in upgrade process
- Fixed version detection to read from package.json instead of hardcoded value

## [2.0.3] - 2025-10-29

Auto-release

## [2.0.2] - 2025-10-29

Auto-release

## [2.0.1] - 2025-10-29

Auto-release

## [2.0.0] - 2025-10-28

chore: pre-release changes

Auto-committed changes before release v1.19.7

## [1.19.7] - 2025-10-28

chore: pre-release changes

Auto-committed changes before release v1.19.6

## [1.19.6] - 2025-10-28

fix: comprehensive rebranding and bug fixes - tree views, commands, task
parsing, and settings

## [1.19.5] - 2025-10-28

chore: pre-release changes

Auto-committed changes before release v1.19.4

## [1.19.4] - 2025-10-28

chore: pre-release changes

Auto-committed changes before release v1.19.3

## [1.19.3] - 2025-10-28

chore: pre-release changes

Auto-committed changes before release v1.19.2

## [1.19.2] - 2025-10-28

chore: pre-release changes

Auto-committed changes before release v1.19.1

## [1.19.1] - 2025-10-28

chore: pre-release changes

Auto-committed changes before release v1.19.0

## [1.19.0] - 2025-10-28

chore: pre-release changes

Auto-committed changes before release v1.18.1

## [1.18.1] - 2025-10-28

Auto-release

## [1.18.0] - 2025-10-28

chore: pre-release changes

Auto-committed changes before release v1.17.0

## [1.17.0] - 2025-10-28

Auto-release

## [1.16.0] - 2025-10-28

Auto-release

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

Complete SpecKit setup: bash scripts, Claude commands, VSCode settings + debug
logging

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
