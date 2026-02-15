# Changelog

All notable changes to the Gofer extension will be documented in this file.

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
