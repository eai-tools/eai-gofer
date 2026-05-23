---
generated: true
generated_at: "2026-05-23T17:54:39.953Z"
source_commit: "047baa06f9bdd86354d43413563a98f893685fb3"
---
# Gofer - Changelog

## Executive Summary

This changelog tracks significant changes to the Gofer technical documentation and architecture since the last update. Changes are categorized by type (Added, Changed, Fixed, Removed) and impact level (Breaking, Major, Minor).

## Recent Changes (2026-05-23)

### Documentation Accuracy Updates (v3.4.3)

#### Changed
- **Documentation Timestamp** - Updated to 2026-05-23 for nightly automated run
- **Source Commit** - Updated to `047baa06f9bdd86354d43413563a98f893685fb3`
- **MCP Tool Count** - Corrected from 29 tools to 23 tools across all documentation files
- **VS Code Commands** - Updated from 67+ to 75+ commands to reflect current extension manifest
- **Anthropic SDK Version** - Updated from 0.32.1 to 0.67.1 (extension package version)
- **Node.js Runtime** - Updated from "24.x" to "20.x+" to reflect actual compatibility
- **Repository URL** - Corrected deployment.md repository reference from enterpriseaigroup/tech-docs to eai-tools/eai-gofer
- **Last Material Change** - Updated executive summary to reflect today's documentation refresh

**Impact:** Minor - Documentation accuracy improvements only, no code changes

## Previous Changes (2026-05-22)

### Latest Updates (v3.4.3)

#### Changed
- **Documentation Timestamp** - Updated to 2026-05-22 for documentation generation
- **Source Commit** - Updated to `c909d5e497762e9ac614a02d35e58afd5e46dae2`
- **Version Bump** - Updated to v3.4.3 with pre-release updates

### v3.4.3 (2026-05-22)

**Summary:** Patch release with pre-release updates and documentation refresh

**Changes:**
- Pre-release commit updates from main branch
- Documentation updates for version alignment

### v3.4.2 (2026-05-22)

**Summary:** Patch release with pre-release commit updates

**Changes:**
- Pre-release commit updates from main branch

## Previous Changes (2026-05-21)

### Documentation Updates

#### Changed
- **Documentation Timestamp** - Updated to 2026-05-21 for nightly automated run
- **Source Commit** - Updated to `0344d6df21fba9738d8bd9f6c26d7602c4e0775e`

## Previous Changes (2026-05-20)

### Documentation Updates

#### Added
- **Agent Plugin Packaging System** - Comprehensive documentation of the agent plugin distribution for Claude Code, Copilot CLI, and Codex
- **EAI Gofer Release Marketplace Links** - Alignment with EAI Gofer agent plugin packaging workflow
- **Deployment Architecture Diagram** - Added Mermaid diagram showing CI/CD pipeline and distribution channels
- **MCP Tools Reference** - Documented 22+ MCP tools with detailed parameter schemas and examples
- **Configuration Layering** - Documented configuration precedence: workspace → user → spec → env → defaults
- **Data Model ERD** - Added entity relationship diagram showing Spec, Task, Memory, and Observation relationships

#### Changed
- **Repository URL Reference** - Updated references to reflect actual deployment location
- **Version Bump** - Updated to v3.4.0 with agent plugin marketplace distribution
- **Tech Stack Table** - Updated dependency versions (Anthropic SDK 0.32.1, Zod 3.25.76, Winston 3.19.0)
- **API Surface Documentation** - Expanded MCP tool documentation from overview to detailed reference
- **Context Health Thresholds** - Clarified 5-stage ACC thresholds (70%, 80%, 85%, 90%, 99%)

#### Fixed
- **MDX Link Compatibility** - Removed bare URLs wrapped in angle brackets (MDX JSX tag conflict)
- **Internal Documentation Links** - Converted absolute `.tech-docs/` paths to relative `./` paths
- **Repository File Links** - Converted repo-root file references to GitHub blob URLs where determinable
- **Frontmatter Timestamps** - Standardized to ISO 8601 format with Z suffix

## Version History

### v3.4.0 (2026-05-20)

**Summary:** Agent plugin packaging and marketplace distribution system

**Breaking Changes:** None

**New Features:**
- Agent plugin ZIP packaging for Claude Code, Copilot CLI, Codex
- `npm run gofer:package-plugin` command with version and sync-repo flags
- Agent plugin marketplace registration workflows
- Local plugin installation guide for release testing

**Architecture Changes:**
- Added agent plugin distribution channel to deployment pipeline
- Expanded release assets to include agent plugin ZIP
- Documentation of stable folder flow (`~/plugins/eai-gofer`)

**Dependencies:**
- No new production dependencies
- Updated `@anthropic-ai/sdk` to 0.32.1

### v3.3.1 (2026-05-10)

**Summary:** EAI block catalog requirement enforcement

**New Features:**
- UI generation enforced via EAI block catalog
- Public builder runtime boundary clarification
- Environment variable security improvements (`.env` in `.gitignore`)

**Architecture Changes:**
- Added `ArchitectureDecisionGate` service for governance checks
- Enhanced schema validation in `extension/src/autonomous/schemaValidator.ts`

### v3.2.2 (2026-05-05)

**Summary:** UI-first app delivery workflow

**New Features:**
- Preview-approval-service-fit workflow for vertical apps
- Visual artifacts persona-pack templates (Impact Canvas, C4, ERD, Risk Heatmap)
- 7 specialized visual writer agents

**Architecture Changes:**
- Added `visual-bounded-context-writer`, `visual-c4-writer`, `visual-erd-writer` subagents
- Extended `.specify/templates/visual/` directory with 10 templates

### v3.2.0 (2026-04-28)

**Summary:** Skills pipeline augmentation and enhanced agent coordination

**New Features:**
- Enhanced agent coordination via skills pipeline
- Cross-platform command parity (all 24+ Gofer commands on Claude, Copilot, Codex, Gemini)
- Plugin manifests for `.claude-plugin/`, `.gemini/`, `codex-config.toml`

**Architecture Changes:**
- `CrossPlatformCommandRouter` service for multi-CLI command generation
- Canonical command source at `.specify/commands/*.md`
- 4 CLI surfaces generated from single source

### v3.1.0 (2026-04-15)

**Summary:** Adaptive Context Compaction (ACC) v3

**New Features:**
- 5-stage progressive context management (70%, 80%, 85%, 90%, 99% thresholds)
- Observation masking with 5-turn threshold
- Context health monitoring with 30s TTL cache
- `ACCOrchestrator` service for autonomous context management

**Architecture Changes:**
- Added `ContextHealthStatusBar` UI component
- `ObservationBridge` for observation lifecycle management
- `.specify/memory/context-health-state.json` state file

### v3.0.0 (2026-04-01)

**Summary:** Multi-platform AI assistant support

**Breaking Changes:**
- Renamed `gofer.claudeApiKey` → `gofer.anthropicApiKey`
- Removed `node-pty-prebuilt-multiarch` dependency (replaced with WebSocket)

**New Features:**
- Full support for Claude Code, GitHub Copilot, OpenAI Codex, Gemini CLI
- MCP tool expansion from 15 to 29+ tools
- LLM Council for multi-model validation
- Research chunking with memory-first strategy (30% coverage threshold)

**Architecture Changes:**
- Dual-protocol server (LSP + MCP) in `language-server/src/server.ts`
- `MCPToolHandler` for MCP tool invocations
- Dependency injection (tsyringe) for service lifecycle management

## Breaking Changes Summary

### v3.x Series

- **v3.0.0:** Renamed `gofer.claudeApiKey` setting (migration automatic)
- **v3.0.0:** Removed `node-pty` dependency (affects custom terminal integrations)

### v2.x → v3.x Migration

**Configuration Changes:**
- `gofer.claudeApiKey` → `gofer.anthropicApiKey`
- `gofer.enableCouncil` → `gofer.council.enabled`
- `gofer.contextThreshold` → `gofer.contextHealth.thresholds.compaction`

**File Structure Changes:**
- `specs/` → `.specify/specs/` (auto-migration via `gofer.upgrade` command)
- `memories.json` → `memories.jsonl` (JSONL format)
- Layered memory system opt-in (`.specify/memory/{core,recall,archival}/`)

**API Changes:**
- MCP tool names unchanged (backwards compatible)
- New tools added: `gofer_context_*`, `gofer_check_slop`, `gofer_get_research_index`

## Deprecation Notices

### Currently Deprecated

- **Flat Memory System** (`.specify/memory/memories.jsonl`) - Use layered system (migrate via `gofer.migrateMemoriesToLayered`)
- **CLI-Based Orchestrator** (`src/orchestrator/AutonomousOrchestrator_new.ts`) - Use extension-based `ACCOrchestrator`
- **Legacy Spec Format** (`specs/` directory) - Use `.specify/specs/` (migrate via `gofer.upgrade`)

### Planned Deprecation (v4.0)

- **node-pty Support** - Fully removed in favor of WebSocket terminal
- **Flat Memory System** - Layered system becomes default, flat system removed

## Security Updates

### v3.3.1 (2026-05-10)

- **Environment Variable Leak Prevention** - `.env` added to `.gitignore` by default
- **API Key Validation** - Zod schema validation for API keys
- **Secret Rotation Documentation** - Added to configuration.md

### v3.1.0 (2026-04-15)

- **Tool Audit Logging** - All MCP tool invocations logged to `.specify/logs/tool-audit.jsonl`
- **Scope Guard Enhancements** - Advisory/Warning/Blocking modes for file access protection

## Performance Improvements

### v3.2.0 (2026-04-28)

- **Spec Cache TTL** - Reduced from 120s to 60s for faster spec updates
- **Research Chunking** - On-demand loading reduces memory footprint by 70%

### v3.1.0 (2026-04-15)

- **Context Health Caching** - 30s TTL reduces polling overhead by 50%
- **TF-IDF Indexing** - Memory query performance improved from O(n) to O(n log n)

## Known Issues

### Current Issues (v3.4.0)

1. **Extension Activation Delay** (Issue #142)
   - **Symptom:** Extension activates 3-5s after VS Code startup
   - **Workaround:** None required, activation is asynchronous
   - **Status:** Tracked for optimization in v3.5

2. **MCP Tool Timeout on Large Specs** (Issue #156)
   - **Symptom:** `gofer_execute_task` times out for specs with >500 tasks
   - **Workaround:** Split large specs into multiple smaller specs
   - **Status:** Research chunking mitigation in progress

3. **Agent Plugin Hot Reload** (Issue #178)
   - **Symptom:** Claude Code requires restart after plugin update
   - **Workaround:** Restart Claude Code after `claude plugin install`
   - **Status:** Upstream limitation, no ETA for fix

### Resolved Issues (v3.3+)

- ✅ **PTY Crash on Windows ARM64** - Resolved by removing node-pty dependency (v3.0)
- ✅ **Memory Leak in Observation Cache** - Fixed with TTL-based eviction (v3.1)
- ✅ **Console.log Slop Detection False Positives** - Improved regex patterns (v3.2)

## Documentation Changes

### Added

- **API Reference** - Comprehensive MCP tool documentation with examples
- **Data Model** - ERD diagrams and schema documentation
- **Configuration** - 91+ settings reference with examples
- **Deployment** - CI/CD pipeline and distribution channel documentation
- **Dependencies** - Upstream/downstream dependency mapping

### Changed

- **Overview** - Restructured with executive summary and critical integrations
- **Architecture** - Added runtime flow sequence diagrams and trust boundaries
- **Deployment** - Expanded with agent plugin distribution workflows

### Removed

- **Legacy CLI Installation Instructions** - Replaced with agent plugin marketplace registration

## Upgrade Path

### From v2.x to v3.4.0

1. **Update Extension**
   ```bash
   code --uninstall-extension EnterpriseAI.gofer
   code --install-extension EnterpriseAI.gofer@3.4.0
   ```

2. **Migrate Configuration**
   - Rename `gofer.claudeApiKey` → `gofer.anthropicApiKey`
   - Update spec format: Run `Gofer: Upgrade to Gofer Format`

3. **Install Agent Plugin** (optional)
   ```bash
   claude plugin marketplace add eai-tools/eai-gofer --scope user
   claude plugin install eai-gofer@eai-gofer --scope user
   ```

4. **Verify Installation**
   - Check extension output: `View` → `Output` → "Gofer"
   - Verify MCP tools: In Claude Code, run `#gofer_get_specs`

### From v3.0-3.3 to v3.4.0

- **No Breaking Changes** - Direct upgrade supported
- **New Features:** Agent plugin marketplace distribution

## Future Roadmap

### Planned for v3.5 (2026-06)

- **MCP HTTP Transport** - Support for HTTP MCP servers
- **Persistent Context Sessions** - Save/resume across VS Code restarts
- **Enhanced Visual Artifacts** - Interactive Mermaid diagram editing

### Planned for v4.0 (2026-Q3)

- **Breaking:** Remove flat memory system (layered only)
- **Breaking:** Remove CLI-based orchestrator
- **New:** Real-time collaboration on specs
- **New:** Web-based Gofer dashboard
