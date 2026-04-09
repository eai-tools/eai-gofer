# Changelog

All notable changes to the Gofer extension will be documented in this file.

## [2.0.2] - 2026-04-09

Fix Copilot/Gemini CLI provider compatibility

## [2.0.1] - 2026-04-09

EnterpriseAI 2.0.1 patch release

## [2.0.0] - 2026-04-09

EnterpriseAI 2.0.0 release

## [1.27.1] - 2026-04-05

Fix Gofer panel task completion progress updates

## [1.27.0] - 2026-04-05

EnterpriseAI messaging + cross-platform flow parity

## [1.26.2] - 2026-04-05

Gate specification behind proposal review and keep task progress in sync

## [1.26.1] - 2026-04-04

Stabilize engineering baseline, fix task-state progression, and remove legacy spec regeneration

## [1.26.0] - 2026-03-28

Add multi-provider CLI support, cross-platform command parity, AI usage tracking, and memory system v2

## [1.25.0] - 2026-03-22

feat: automatic Codex global CLI symlink creation

Enables Codex CLI to access Gofer skills from any directory without manual symlink creation.

Key features:
- Automatic symlink creation during install/upgrade
- Platform-aware (Windows junctions, Unix symlinks)
- Non-blocking error handling
- Updated documentation with troubleshooting guide

This achieves true CLI feature parity - Codex now works globally like Claude Code.

## [1.24.0] - 2026-03-22

feat: multi-CLI support for Codex, Gemini, and Copilot

## [1.23.0] - 2026-03-21

Add Memory Panel system memory filtering (feature 001)

## [1.22.1] - 2026-03-19

Fix AI usage tracking bugs #2/#3 + security/performance fixes

- Bug fix #2: Model-specific pricing (getPricingForModel with 4-tier fallback)
- Bug fix #3: Model detection in adapters (modelId propagation to CostBudgetEnforcer)
- Security fix: XSS prevention in MemoryPanel (HTML escaping)
- Performance fix: Async I/O in UsageLogger (fs.promises)
- Integration tests: AIUsageAccuracy (11), ModelPropagation (11)
- All 40 bug fix tests passing
- Validation score: 100/100 after fixes

## [1.22.0] - 2026-03-18

Remove PTY terminal dependency, use native VSCode terminal API

## [1.21.0] - 2026-03-18

feat: automatic context management via sub-agent dispatch + @lydell/node-pty migration

## [1.20.7] - 2026-03-18

fix: Remove electron-rebuild to preserve cross-platform node-pty binaries for Codespaces

## [1.20.6] - 2026-03-18

fix: Add cross-platform support for Codespaces/Linux - replaced node-pty with node-pty-prebuilt-multiarch

## [1.20.5] - 2026-03-18

fix: Add cross-platform support for Codespaces/Linux - replaced node-pty with node-pty-prebuilt-multiarch

## [1.20.4] - 2026-03-18

fix: Add cross-platform support for Codespaces/Linux - replaced node-pty with node-pty-prebuilt-multiarch to include linux-x64 native binaries

## [1.20.2] - 2026-03-15

fix: engineering review - aggregate cache tokens (FR-025) and propagate error states to UI

## [1.20.1] - 2026-03-15

fix: validation remediation for Feature 026 - remove AI slop, add visibility tests

## [1.20.0] - 2026-03-15

feat: provider API usage tracking (Feature 026)

## [Unreleased]

feat: Provider API Usage Tracking (Feature 026)

- AI Usage panel now shows real billing data from Anthropic and OpenAI APIs
- Configure admin API keys in settings: `gofer.anthropicAdminApiKey`,
  `gofer.openaiAdminApiKey`
- Configurable API polling interval (default 60s):
  `gofer.aiUsage.api.pollingInterval`
- Graceful degradation when admin keys not configured
- Rollback flag: set `gofer.aiUsage.useApiClient: false` to revert to local
  JSONL data

## [1.19.2] - 2026-03-15

enforce mandatory auto-chain and add engineering review gates to pipeline stages

## [1.19.1] - 2026-03-15

fix: register onView activation events for sidebar panels

## [1.19.0] - 2026-03-15

feat: AI token usage tracking panel and pipeline sub-agent dispatch

## [1.18.1] - 2026-03-15

fix: bundle missing pipeline commands (0a_problem_validation,
7a_stakeholder_comms), prompts, and scripts (pipeline-state.sh,
validate-artifact.sh) so they deploy to all workspaces on version upgrade

## [1.18.0] - 2026-03-14

fix: sync bundled resources (commands, agents, prompts, scripts) to workspaces
on extension version upgrade - previously new/updated resources were not copied
when upgrading from e.g. 1.17.2 to 1.17.3

## [1.17.3] - 2026-03-14

feat: add post-implementation engineering review stage (6a) to pipeline

## [1.17.2] - 2026-03-13

fix: wire ContinuousMemoryWriter, SlopReducer, and normal-terminal session
lifecycle

## [1.17.1] - 2026-03-11

Fix ACCOrchestrator memory leak on reinitialize and strengthen test assertions

## [1.17.0] - 2026-03-11

Wire ContextBuilder + Adaptive Context Compaction (ACC): activate 3,700 LOC of
dead context management code, implement 5-stage progressive compaction at
70/80/85/90/99% thresholds

## [1.16.6] - 2026-03-10

Rightsized CLAUDE.md, AGENTS.md, and copilot-instructions.md to under 60 lines
each; updated instruction templates for compact generated output

## [1.16.5] - 2026-03-09

Add missing Copilot Chat prompts for 0a_problem_validation and
7a_stakeholder_comms

## [1.16.4] - 2026-03-09

Documentation site and mandatory pipeline steps

## [1.16.3] - 2026-03-09

Bundle all 37 pipeline agents for distribution to user projects

## [1.16.2] - 2026-03-06

fix: add post-release auto-update verification

## [1.16.1] - 2026-03-06

Fix validation findings: add consent prompt for AI instruction generation,
expand Python detection, add restart re-prompt test

## [1.16.0] - 2026-03-06

feat: auto-generate AI instruction files on repository init

## [1.15.0] - 2026-03-02

Pipeline auto-chain: stages 1-8 chain autonomously without stopping for approval

## [1.14.5] - 2026-03-02

fix: remove minLength:1 from API key schema to fix upgrade validation

## [1.14.4] - 2026-03-01

Simplify pipeline auto-chaining, clean up hooks and spec metadata

## [1.14.3] - 2026-03-01

fix: auto-handoff save/clear/resume, memory panel wiring, and session display
name

## [1.14.2] - 2026-03-01

fix: auto-handoff save/clear/resume, memory panel wiring, and session display
name

## [1.14.1] - 2026-03-01

fix: prevent duplicate command registration and fix pipeline routing

## [1.14.0] - 2026-02-28

Multi-perspective sub-agent strategies with diverge-converge pattern

## [1.13.6] - 2026-02-28

Fix validation findings: async I/O, reduced complexity, integration tests

## [1.13.5] - 2026-02-28

Fix validation findings: async I/O, reduced complexity, integration tests

## [1.13.4] - 2026-02-27

Fix memory leaks from leaked event listeners and untracked timers

## [1.13.3] - 2026-02-27

Fix PTY command submission: send carriage return separately with 500ms delay to
match working pattern

## [1.13.2] - 2026-02-26

Fix extension activation crash: reflect-metadata import order, command
registration timing, config schema mismatch, spec loader filtering

## [1.13.1] - 2026-02-24

Fix release script: add npm install for production deps, add gh release create

## [1.13.0] - 2026-02-24

Engineering remediation: DI framework, service extraction, cache bounds, Logger
bridge

## [1.12.2] - 2026-02-23

Remove dead code: spawnNewTerminalFn, sendSaveToTerminal, sendResumeToTerminal,
autonomousMonitoringInterval, stability tracking, maybeNotify

## [1.12.1] - 2026-02-23

fix: save/clear/resume context reset, silent slop reduction, PTY cleanup on exit

## [1.12.0] - 2026-02-23

Add engineer review gate to /4_gofer_tasks pipeline

## [1.11.0] - 2026-02-16

Remove approval gates - fully autonomous execution after planning

## [1.10.0] - 2026-02-16

Auto-save and auto-resume at 69% context threshold

## [1.9.0] - 2026-02-15

Context Continuity Overhaul - 11 improvements to context management

## [1.8.0] - 2026-02-15

Context Continuity Overhaul - 11 improvements to context management

## [1.7.5] - 2026-02-13

### Proactive Code Quality

- Gofer now automatically scans your workspace for common AI-generated code
  issues when sessions reach high utilization
- Provides a clear summary of what was cleaned up and how many files were
  improved
- Runs silently in the background with smart cooldown to avoid interrupting your
  workflow

## [1.7.4] - 2026-02-13

### Richer Conversation Insights

- Tool interactions in the Conversation History panel now show both the request
  and the response, giving you complete visibility into what happened during
  each tool call
- Previously only tool names were shown; now you can see the full picture

## [1.7.3] - 2026-02-12

### Code Quality Engine

- Introduced the automated code quality engine with workspace-wide scanning and
  safe auto-fixes
- Configurable opt-in behavior — enable it when you want proactive cleanup

## [1.7.2] - 2026-02-12

### Better Context Visibility

- Token usage estimates are now visible directly in the sidebar for each
  conversation category (Your Prompts, Assistant Responses, Tool Calls, System
  Commands)
- See at a glance where your context budget is being spent without clicking into
  details

## [1.7.1] - 2026-02-12

### Token Breakdown Tables

- Added approximate token counts to conversation breakdown tables
- Quickly identify which parts of your conversation are consuming the most
  context

## [1.7.0] - 2026-02-12

### Streamlined Sidebar

- Cleaner, more intuitive organization of the Memory and Context panels
- Constitution moved to a more logical location alongside your specifications
- Removed redundant sections to reduce clutter and improve navigation

## [1.6.0] - 2026-02-11

### Click to Explore Context

- Every category in the Context Window panel is now clickable — view detailed
  content for any context category with a single click
- See exactly what's in your spec artifacts, memories, conversation history, and
  more

## [1.5.0] - 2026-02-10

### Multi-Session Monitoring

- Monitor up to 3 concurrent Claude Code sessions simultaneously with real-time
  context health for each
- Color-coded utilization indicators make it easy to spot which sessions need
  attention
- Stale session detection automatically flags inactive sessions

## [1.4.1] - 2026-02-10

### Quality Validation

- Refined the automated engineering quality validation with improved accuracy
- Better handling of edge cases in the 10-category scoring system

## [1.4.0] - 2026-02-10

### Engineering Quality Rubric

- Automated quality validation using a 10-category engineering rubric scored out
  of 100 points
- Six specialist validation agents run in parallel to check correctness,
  security, performance, test quality, integration contracts, and coding
  standards
- Automatic remediation loop catches and fixes issues before they ship

## [1.3.0] - 2026-02-09

### Context Health Management

- Real-time context window monitoring with health status indicators
- Smart recommendations based on your current workflow stage
- Automatic session handoff when context approaches limits
- Three-tier observation decay system preserves important information while
  reducing noise

## [1.1.13] - 2026-02-09

### Reliability Improvements

- Fixed edge cases in context health monitoring and observation tracking
- Improved stability for long-running sessions

## [1.1.10] - 2026-02-07

### Session Continuity

- Save and resume sessions seamlessly across context boundaries
- Automatic progress capture with one-click restore

## [1.1.9] - 2026-02-07

### Stability Fixes

- Resolved timer-related issues that could cause spurious error messages
- Cleaner shutdown behavior for background processes

## [1.1.0] - 2026-02-03

### LLM Council

- Multi-provider parallel execution for research and analysis workflows
- Get diverse perspectives from multiple AI providers simultaneously
- Chairman synthesis combines the best insights into a unified output

## [1.0.3] - 2026-01-27

### Resource Bundling

- Fixed missing resources on fresh installations and Codespaces environments

## [1.0.0] - 2026-01-26

### First Major Release

- Complete feature development pipeline from business scenario through
  validation
- Consultative business discovery with journey mapping
- Persistent memory system with priority-based retention
- Context-aware workflow stages with adaptive budgets

## [0.0.9] - 2026-01-25

### Context Health Monitoring

- Real-time context utilization tracking with status bar integration
- Category-level token breakdown visibility

## [4.6.0] - 2026-01-19

### Memory and Journey System

- Agentic memory with priority-based retention across sessions
- Interactive journey mapping for feature discovery
- Multi-option implementation paths with efficiency-to-innovation spectrum

## [4.2.0] - 2026-01-12

### Context Compaction

- Intelligent context window management with automatic summarization
- Session backup and rollback capabilities for safe compaction

## [4.1.0] - 2026-01-08

### Bundled Resources

- Self-contained extension with all resources included — no external CLI
  dependencies
- Code hydration command for reverse-engineering specifications from existing
  code

## [4.0.0] - 2026-01-07

### Multi-Provider AI Council

- Parallel execution across multiple AI providers for deeper analysis
- Expanded test coverage and business scenario triage

## [3.2.0] - 2025-11-04

### Autonomous Monitoring

- Real-time session monitoring with configurable prompts
- Dual-mode detection: fast idle checks and comprehensive analysis
- Pause and resume controls for autonomous execution

## [3.0.0] - 2025-11-01

### Autonomous Execution

- Complete autonomous execution framework with memory, hints, and dependency
  management
- Intelligent context compaction at configurable thresholds
- 270+ passing tests across all components

## [2.0.4] - 2025-10-29

### Bug Fixes

- Fixed path handling during upgrades
- Fixed missing command registrations
- Improved version detection reliability

## [1.3.3] - 2025-10-21

### Quality of Life

- One-click updates from the Specifications panel
- Multi-workspace support with automatic reinitialization
- Better error messages with actionable guidance

## [1.3.0] - 2025-10-20

### Automatic Updates

- One-click update installation — download and install without leaving VSCode
- Automatic cleanup and progress tracking during updates

## [1.2.0] - 2025-10-20

### LSP + MCP Integration

- Language Server Protocol integration for reliable communication
- Six MCP tools for Claude Code to interact with your specifications
- Security hardening with input validation and path traversal protection

## [1.0.0] - 2025-10-19

### Initial Release

- Specification folder detection and management
- Tree view for browsing specifications and tasks
- Initialization and upgrade commands
