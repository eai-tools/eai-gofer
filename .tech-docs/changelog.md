---
generated: "2026-03-11T22:14:00Z"
source_commit: "29a322a5fd292b6346a0cf0d2ae981a59ffe4a4c"
---

# Changelog

## Recent Changes Summary

This changelog documents significant changes to the Gofer architecture, features, and APIs since v1.17.0.

**Focus Areas:**
- Architectural changes
- New MCP tools or endpoints
- Breaking changes
- Security updates
- Performance improvements

---

## v1.17.1 (2026-03-11)

**Release Commit:** `29a322a5fd292b6346a0cf0d2ae981a59ffe4a4c`

### Documentation

**Added:**
- **What's New Page** - Per-release summary documentation
  - Location: `docs/whats-new/`
  - Purpose: User-facing release notes
  - Impact: Better visibility of new features

### Bug Fixes

**Fixed:**
- **ACCOrchestrator Memory Leak** - Reinitialize memory leak fixed
  - File: `extension/src/autonomous/ACCOrchestrator.ts`
  - Issue: Memory not released on reinitialize
  - Impact: Extension performance degradation over time
  - Solution: Proper disposal of event listeners and timers
  - Test: Strengthened test assertions to catch memory leaks

### Testing

**Improved:**
- **Test Assertions** - Strengthened ACCOrchestrator test suite
  - Added memory leak detection tests
  - Improved async cleanup validation
  - Better coverage of edge cases

---

## v1.17.0 (2026-03-10)

**Major Release**

### Features

**Added:**
- **Context Window Accuracy** (Feature 023)
  - `ClaudeCodeContextScanner` - Real-time context parsing
  - `GoferActivityStatusBar` - Live activity indicator
  - Hook-based monitoring for accurate token counting
  - Auto-save at 65% context utilization

**Added:**
- **Auto-Context-Continuity (ACC)**
  - Automatic `/7_gofer_save` execution at threshold
  - Automatic `/8_gofer_resume` after save
  - Zero-interruption context refresh
  - Configurable thresholds

### Architecture

**Changed:**
- **Dependency Injection Phase 3** - Engineering remediation
  - Extracted services: Logger, StateManager, DisposalService
  - Container-based service resolution
  - Cleaner separation of concerns
  - File: `extension/src/di.ts`

**Changed:**
- **Hook-Based Monitoring** - Replaced polling with event hooks
  - `HookBridgeWatcher` - Single-session monitoring
  - `MultiSessionBridgeWatcher` - Multi-session support
  - Reduced CPU usage by 80%
  - More accurate context tracking

### Breaking Changes

None - All changes backward compatible.

---

## v1.16.x Series

### Context Health Management (Spec 012)

**Added (v1.16.5):**
- **Context Health Monitor** - Real-time tracking
  - `ContextHealthMonitor` class
  - Status bar visualization
  - Color-coded health indicators (🟢🟡🔴)
  - Files: `extension/src/autonomous/ContextHealthMonitor.ts`

**Added (v1.16.4):**
- **Auto-Handoff Trigger** - Automatic session saves
  - Triggers at configurable thresholds
  - Notification before handoff
  - Manual override available

**Added (v1.16.3):**
- **Context Usage Logger** - Telemetry
  - JSONL log format
  - Per-stage context breakdown
  - Historical trend analysis
  - File: `.specify/logs/context-usage.jsonl`

### Memory Management (Spec 013)

**Added (v1.16.2):**
- **Layered Memory System** - MemGPT-inspired
  - Core layer (always loaded)
  - Recall layer (recent context)
  - Archival layer (searchable long-term)
  - `MemoryLayerManager` implementation

**Added (v1.16.1):**
- **Continuous Memory Writer** - Auto-compaction
  - Background compaction at 80% threshold
  - Preserves last 10 tasks in full
  - 40-60% context reduction
  - File: `extension/src/autonomous/ContinuousMemoryWriter.ts`

---

## v1.15.x Series

### Security & Governance (Spec 015)

**Added (v1.15.5):**
- **Scope Guard** - Protected file boundaries
  - `ScopeGuard` class
  - Enforcement modes: advisory, warning, blocking
  - Spec-defined `## Protected Boundaries` sections
  - File: `extension/src/autonomous/ScopeGuard.ts`

**Added (v1.15.4):**
- **Tool Audit Logger** - MCP tool call tracking
  - JSONL log format
  - Scope violation tracking
  - Tool success/failure metrics
  - File: `.specify/logs/tool-audit.jsonl`

**Added (v1.15.3):**
- **Cost Budget Enforcer** - Token cost tracking
  - Per-run cost limits
  - Multi-provider cost calculation
  - Enforcement modes: advisory, truncate, blocking
  - File: `extension/src/autonomous/CostBudgetEnforcer.ts`

**Added (v1.15.2):**
- **Run Ledger** - Pipeline execution tracking
  - Token usage per run
  - Cost breakdown by provider/model
  - Historical trend analysis
  - File: `.specify/logs/gofer-run-ledger.jsonl`

### Code Quality (Spec 016)

**Added (v1.15.1):**
- **Yolo Slop Reduction** - Auto-fix on save
  - Removes `console.log` statements
  - Removes `debugger` statements
  - Upgrades `@ts-ignore` to `@ts-expect-error`
  - Configurable: `gofer.yoloSlopReduction.enabled`
  - File: `.specify/logs/slop-reduction.jsonl`

---

## v1.14.x Series

### LLM Council (Spec 011)

**Added (v1.14.3):**
- **Multi-Provider Validation** - Council voting
  - Anthropic + Google + OpenAI support
  - Configurable voting strategies
  - Weighted or unanimous modes
  - File: `.specify/memory/council-config.yaml`

**Added (v1.14.2):**
- **LLM Provider Abstraction**
  - Unified interface for all providers
  - Automatic failover
  - Rate limit handling
  - File: `extension/src/autonomous/LLMProvider.ts`

### Stage Profiles (Spec 010)

**Added (v1.14.1):**
- **Stage-Specific Context Budgets**
  - Research, specify, plan, tasks, implement, validate
  - Configurable budget allocation per stage
  - Automatic stage detection
  - File: `.specify/memory/context-profiles.yaml`

---

## v1.13.x Series

### Autonomous Execution (Spec 009)

**Added (v1.13.5):**
- **Autonomous Orchestrator** - Full pipeline automation
  - Research → Specify → Plan → Tasks → Implement → Validate
  - Error handling and retry logic
  - WhatsApp/Email notifications
  - File: `src/orchestrator/AutonomousOrchestrator_new.ts`

**Added (v1.13.4):**
- **Engineering Reviews** - Proactive quality checks
  - Triggered at 40-80% completion
  - Spec vs implementation validation
  - Constitution compliance check
  - Configurable prompts

**Added (v1.13.3):**
- **Performance Reviews** - Architecture analysis
  - Triggered at 70%+ completion
  - Best practices validation
  - Performance bottleneck detection
  - Optimization recommendations

### Terminal Integration (Spec 008)

**Added (v1.13.2):**
- **Claude Code Terminal Monitoring**
  - `node-pty` integration
  - Real-time output parsing
  - Question detection and auto-response
  - Pause/Resume controls

**Added (v1.13.1):**
- **Haiku Decision Engine** - Autonomous decision-making
  - Uses Claude 3.5 Haiku
  - Decides when to interrupt Claude Code
  - Prompts for reviews at strategic milestones
  - Configurable system prompt

---

## v1.12.x Series

### Branch Management (Spec 007)

**Added (v1.12.2):**
- **Branch-Aware Specs** - Git integration
  - Automatic branch detection
  - Filter specs by branch
  - Cross-branch spec visibility
  - File: `extension/src/branchSpecManager.ts`

### UI Enhancements (Spec 006)

**Added (v1.12.1):**
- **Memory Panel** - Tree view for memories
  - Core/Recall/Archival layers
  - Search and filter
  - Inline editing
  - File: `extension/src/memoryProvider.ts`

**Added (v1.12.0):**
- **Context Window Panel** - Visual health indicator
  - Real-time utilization chart
  - Component breakdown
  - Historical trends
  - File: `extension/src/contextWindowProvider.ts`

---

## v1.11.x Series

### MCP Tools (Spec 005)

**Added (v1.11.0):**
- **6 MCP Tools** - AI integration foundation
  - `gofer_get_specs` - List all specs/tasks
  - `gofer_get_next_task` - Dependency-aware task selection
  - `gofer_execute_task` - Start task with full context
  - `gofer_update_task_status` - Mark completed/failed
  - `gofer_validate_code` - Constitution validation
  - `gofer_run_tests` - Playwright test execution
  - File: `language-server/src/mcp/toolHandler.ts`

---

## v1.10.x Series

### Language Server (Spec 004)

**Added (v1.10.0):**
- **Dual-Protocol Server** - LSP + MCP
  - Single Node.js process
  - stdio transport
  - Auto-registration in `.vscode/mcp.json`
  - File: `language-server/src/server.ts`

---

## v1.9.x Series

### Gofer Format Migration (Spec 003)

**Changed (v1.9.0):**
- **Specification Format** - JSON → Markdown
  - YAML frontmatter for metadata
  - Markdown body for content
  - Automatic migration tool
  - Command: `Gofer: Upgrade to Gofer Format`

**Added (v1.9.0):**
- **.specify/ Directory Structure**
  - `specs/` - Feature specifications
  - `memory/` - Constitution and hints
  - `templates/` - Spec templates
  - `scripts/` - Automation scripts
  - `logs/` - Execution logs

---

## Breaking Changes Summary

### v1.17.x → v1.18.x (Future)

**Planned Breaking Changes:**
- None currently planned

### v1.16.x → v1.17.x

**No Breaking Changes** - Fully backward compatible

### v1.9.x → v1.10.x

**Breaking Changes:**
- **Spec Format** - Legacy JSON specs no longer supported
  - Migration: Run `Gofer: Upgrade to Gofer Format`
  - Automatic conversion preserves all data

---

## API Changes

### MCP Tools

**v1.11.0 - Initial Release**
- Added all 6 MCP tools
- Initial API surface

**v1.12.0 - Enhanced Context**
- `gofer_execute_task` now returns constitution
- `gofer_validate_code` supports scope boundaries

**v1.13.0 - Performance**
- `gofer_get_specs` now cached (invalidated on file change)
- 10x faster repeated calls

**v1.15.0 - Security**
- All tools now logged in `tool-audit.jsonl`
- Scope violations tracked

**No Breaking Changes** - All additions backward compatible

### Extension Commands

**v1.12.0 - Added**
- `gofer.startClaudeCode`
- `gofer.stopClaudeCode`
- `gofer.pauseClaudeCode`
- `gofer.resumeClaudeCode`

**v1.13.0 - Added**
- `gofer.resumeSession`
- `gofer.regenerateInstructions`

**v1.15.0 - Added**
- `gofer.checkForSlop`

**v1.16.0 - Added**
- `gofer.viewCompactionHistory`
- `gofer.createHintFile`

---

## Performance Improvements

### v1.17.0
- **Hook-Based Monitoring** - 80% CPU reduction vs polling
- **Context Accuracy** - Real token counts (no estimation)

### v1.16.0
- **Memory Compaction** - 40-60% context reduction
- **Layered Memory** - O(1) core memory access

### v1.15.0
- **Spec Caching** - 10x faster repeated reads
- **Lazy Loading** - Language server starts 50% faster

### v1.14.0
- **Async File I/O** - Non-blocking spec loading
- **Parallel Tool Calls** - MCP tools execute concurrently

---

## Security Updates

### v1.15.5 - Scope Guard
- Prevents AI from accessing protected files
- Enforces `## Protected Boundaries` in specs
- Logs all violations

### v1.15.3 - Cost Budget Enforcer
- Prevents runaway API costs
- Configurable per-run limits
- Blocking mode available

### v1.15.2 - Tool Audit Logger
- Complete audit trail of AI actions
- Scope violation tracking
- Forensic analysis support

---

## Known Issues

### v1.17.1

**Issue:** node-pty rebuild fails on some Linux distributions
- **Workaround:** Use prebuilt binaries or Docker
- **Status:** Investigating

**Issue:** Context scanner occasionally misses tool calls in fast sequences
- **Impact:** Minor (< 1% of calls)
- **Status:** Fix planned for v1.17.2

---

## Upcoming Changes (v1.18.0)

**Planned Features:**
- VSCode Marketplace publication
- Extension analytics dashboard
- Multi-workspace support
- Spec templates library
- Integration with Azure DevOps

**Tentative Release:** Q2 2026
