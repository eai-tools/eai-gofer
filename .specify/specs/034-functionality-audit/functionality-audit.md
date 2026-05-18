# EAI Gofer Functionality Audit

Date: 2026-05-18

Branch: `codex/functionality-audit`

## Executive Summary

Gofer has a substantial amount of real implementation, especially around repo
initialization, generated command surfaces, spec parsing, memory storage, AI
usage display, provider wrappers, and GitHub Release packaging. The main gap is
that "autonomous execution" is not yet the fully automated implementation loop
implied by some older docs and tests. It can launch Claude Code, prepare
context, track state, and monitor, but several execution, terminal-input,
checkpoint, rollback, resume, and E2E verification paths are still placeholders,
simulated, or skipped.

The strongest product-safe framing today is: Gofer is a workflow scaffold, VS
Code extension, command generator, and context/memory assistant. It is not yet a
complete unattended coding agent runner.

## Implemented

| Area                                   | What is implemented                                                                                                                                                                                                                                                     | Evidence                                                                                                                                                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VS Code command surface                | All 46 contributed commands in `extension/package.json` have a registered command path. There are also 9 internal registered commands that are not exposed in the manifest.                                                                                             | `extension/package.json`, `extension/src/extension.ts`, `extension/src/services/CommandRegistry.ts`, `extension/src/commands/*`                                                                                                 |
| Setup and migration                    | `gofer.initialize`, upgrade, template/resource sync, default instruction generation, CLI surface sync, and path migration are implemented through `GoferMigrator` and migration services.                                                                               | `extension/src/goferMigrator.ts`, `extension/src/services/migration/*`                                                                                                                                                          |
| Spec parsing and progress UI           | Specs and tasks are parsed from `.specify/specs`, rendered in the sidebar, and refreshed via the progress provider. Dependency graph helpers are wired into pending-spec execution ordering.                                                                            | `extension/src/goferParser.ts`, `extension/src/progressProvider.ts`, `extension/src/commands/specCommands.ts`                                                                                                                   |
| Cross-platform command generation      | Canonical commands are emitted to Claude, Copilot, Codex, legacy system skill, and Gemini surfaces. Current count: 24 canonical commands, 24 Claude files, 24 Copilot prompts, 24 `.agents` skills, 24 `.system` skills, and 24 Gemini command pairs (`.md` + `.toml`). | `.specify/commands/`, `.claude/commands/`, `.github/prompts/`, `.agents/skills/`, `.system/skills/`, `.gemini/commands/gofer/`                                                                                                  |
| Memory CRUD and storage                | Remember/search/forget/clear/view commands are implemented. Local memories use JSONL append-only storage with migration from legacy `local.json`, queued writes, in-memory index, note promotion, and consolidation support.                                            | `extension/src/commands/memoryCommands.ts`, `extension/src/autonomous/MemoryManager.ts`, `extension/src/autonomous/MemoryStorage.ts`                                                                                            |
| AI usage panel                         | The tree provider, status bar, monitor, local Claude log adapter, and Anthropic/OpenAI admin API client are implemented with cache/fallback behavior.                                                                                                                   | `extension/src/ui/AIUsageProvider.ts`, `extension/src/ui/AIUsageStatusBar.ts`, `extension/src/autonomous/AIUsageMonitor.ts`, `extension/src/autonomous/UsageApiClient.ts`, `extension/src/autonomous/ClaudeCodeUsageAdapter.ts` |
| LLM Council provider layer             | Anthropic, Google, OpenAI, Claude CLI, and Codex CLI provider wrappers, provider factory, health checks, council orchestration, response aggregation, and status command are implemented.                                                                               | `extension/src/council/**`                                                                                                                                                                                                      |
| Language server and MCP basics         | LSP custom requests for specs/task context/status updates exist. Most MCP context, observation, slop, research, and handoff tools have concrete file-backed implementations.                                                                                            | `language-server/src/server.ts`, `language-server/src/mcp/toolHandler.ts`                                                                                                                                                       |
| Docs site and GitHub release packaging | Docusaurus docs site builds from a small source tree. Release workflow packages the extension into a VSIX and publishes GitHub Release assets.                                                                                                                          | `docs-site/`, `.github/workflows/release.yml`                                                                                                                                                                                   |

## Partial Or Misleading

| Area                                  | Current reality                                                                                                                                                                                                                                                            | Risk                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Autonomous execution in the extension | `AutonomousDriver.start()` creates a session, loads memory, spawns terminal state, saves the session, and emits progress. It does not run the tasks itself. Progress fields for ETA and tests are fixed placeholders.                                                      | Users may expect actual task execution when the driver mostly initializes orchestration state.           |
| Claude Code terminal automation       | `launchClaudeCode()` opens a normal VS Code terminal, sends `claude`, sends the stage command, writes enriched context, and monitors shell integration. Since normal terminals cannot receive programmatic input like PTY, autonomous responses are prepared but not sent. | "Autonomous mode" can still require manual copy/paste/intervention.                                      |
| Root Node orchestrator                | `src/orchestrator/AutonomousOrchestrator_new.ts` auto-marks tasks complete after writing an IPC "need help" signal. It explicitly says real stdin/Claude-agent processing is not implemented.                                                                              | The root CLI can make task files look complete without doing implementation work.                        |
| MCP test runner                       | `gofer_run_tests` is advertised twice with two different schemas. The first switch case routes to `runTests(specId)`, which returns "Test runner not yet implemented"; the later structured test detector is unreachable because it uses the same case name.               | MCP clients calling `gofer_run_tests` do not get the implemented detector path.                          |
| Context REPL/fold tools               | Tools can read/write fold state and operation history, but some bulk fold behavior only updates fold-state markers rather than actually compacting live context.                                                                                                           | Useful as plumbing, but not a complete context runtime.                                                  |
| Release workflow                      | GitHub Release packaging is implemented. VS Code Marketplace publishing is not present in the workflow.                                                                                                                                                                    | If Marketplace distribution is desired, it is a separate missing release step.                           |
| E2E coverage                          | CI runs only `tests/e2e/basic-framework.spec.ts`, which validates the framework and Node/file-system access, not end-user extension behavior. Several richer E2E files are placeholder or skipped specs.                                                                   | Green CI does not prove the full VS Code UX, memory workflow, autonomous execution, or compaction flows. |

## Not Implemented Or Stale

| Item                                      | Evidence                                                                                                                                                                                                                              | Suggested disposition                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Checkpoint creation and rollback commands | `gofer.createPreOpCheckpoint` and `gofer.rollbackToCheckpoint` display "coming soon".                                                                                                                                                 | Either implement or remove/hide until ready.                                                                |
| Resume session command                    | `gofer.resumeSession` displays "coming soon".                                                                                                                                                                                         | Either implement from saved session artifacts or reframe as planned.                                        |
| Real terminal output streaming            | `TerminalManager.captureOutput()` is documented as a placeholder pending VS Code terminal data support.                                                                                                                               | Replace old PTY language with current shell-integration behavior or implement streaming path.               |
| Old orchestrator-agent components         | `src/orchestrator/README.md` claims EngineerAgent, TestAgent, RetryHandler, QAEngine, NotificationService, and DependencyResolver are part of a complete implementation, but those components are not present in `src/orchestrator/`. | Update or delete this README to avoid false implementation claims.                                          |
| WhatsApp/Twilio path                      | Product text and command-generation tests removed WhatsApp setup from user-facing flow, but `twilio`, WhatsApp mocks, and error formatting remain.                                                                                    | Decide whether this is legacy test fixture only. If so, remove runtime dependency and stale docs.           |
| Native PTY dependencies                   | Runtime code comments say PTY support was removed, while extension dependencies still include `@lydell/node-pty`, `node-pty-prebuilt-multiarch`, and optional PTY packages.                                                           | Remove from runtime dependencies if no shipped path imports them. Keep only test mocks if genuinely needed. |
| Placeholder E2E suites                    | `tests/e2e/memoryPersistence.spec.ts`, `tests/e2e/autoCompaction.spec.ts`, and `tests/e2e/dependencyImpact.spec.ts` contain many `expect(true).toBe(true)` placeholders.                                                              | Convert to real VS Code extension tests or move to docs/spec examples outside executable tests.             |

## Test Confidence

The unit and integration test suite is broad and covers many internal modules.
However, functional confidence is uneven:

- Stronger confidence: command generation, parsing, migration/resource sync,
  memory storage, usage adapters, provider wrappers, and several EnterpriseAI
  contract validators.
- Weaker confidence: actual VS Code UI workflows, autonomous end-to-end
  execution, terminal monitoring/input, checkpoint/rollback/resume, and
  production MCP test execution.
- Known authenticity gaps: skipped suites exist for autonomous execution,
  provider real APIs, LSP/MCP integration requiring VS Code, terminal lifecycle,
  and context-builder wiring. Placeholder assertions exist in multiple
  E2E/integration files.

## Cleanup Priorities

1. Fix the `gofer_run_tests` MCP duplication so the structured detector is
   reachable, or split the legacy `specId` runner and framework detector into
   distinct tool names.
2. Decide whether `gofer.createPreOpCheckpoint`, `gofer.rollbackToCheckpoint`,
   and `gofer.resumeSession` should be implemented now or hidden until ready.
3. Update stale root orchestrator docs and either remove the simulated
   auto-complete behavior or make the README explicitly call it a test harness.
4. Remove or demote unused runtime dependencies: PTY packages, `twilio`,
   `express`, `body-parser`, and `ws` look like legacy/runtime-dead candidates
   based on import scans.
5. Replace placeholder E2E suites with real VS Code extension tests or move them
   out of executable test paths.
6. If Marketplace distribution is required, add a release workflow step using
   `vsce publish` and the relevant secret.

## Current Status

This is an audit-only documentation change. No implementation code has been
modified on this branch.
