---
feature: 011-context-health-recursive-memory
tasks: tasks.md
status: ready
created: '2026-01-25'
---

# GitHub Issues: Context Health and Recursive Memory Enhancement

## Overview

This document defines GitHub-ready issues for the context health enhancement
feature. Issues are organized by milestone (phase) with appropriate labels and
acceptance criteria.

---

## Milestone: Phase 1 - Observation Masking

### Issue #1: Create ObservationMasker Core Module

**Labels**: `feature`, `phase-1`, `US2`

**Description**: Implement the core ObservationMasker class that tracks tool
outputs and masks older observations to reduce context usage.

**Tasks**:

- [ ] T001: Create class skeleton with config interface
- [ ] T002: Implement observation tracking (add, get, clear)
- [ ] T003: Implement token estimation utility
- [ ] T004: Implement mask() method with age-based filtering
- [ ] T005: Implement placeholder generation with metadata
- [ ] T006: Implement cache storage/retrieval
- [ ] T007: Write unit tests (90% coverage target)

**Acceptance Criteria**:

- Observations tracked with ID, timestamp, turn number, type
- Observations older than N turns automatically masked
- Placeholders include file path, size, and timestamp
- Cache persists to `.specify/memory/observation-cache/`
- All unit tests pass with 90%+ coverage

**Files**:

- `extension/src/autonomous/ObservationMasker.ts` (new)
- `extension/src/autonomous/__tests__/ObservationMasker.test.ts` (new)

---

### Issue #2: Add gofer_expand_observation MCP Tool

**Labels**: `feature`, `phase-1`, `US2`, `mcp`

**Description**: Add MCP tool that allows the agent to retrieve the full content
of a masked observation when needed for detailed analysis.

**Tasks**:

- [ ] T008: Add MCP tool definition
- [ ] T009: Implement tool handler
- [ ] T010: Write integration tests

**Acceptance Criteria**:

- Tool registered as `gofer_expand_observation`
- Accepts observationId parameter
- Returns full observation content with metadata
- Handles not-found errors gracefully
- Integration tests verify expansion works

**Files**:

- `language-server/src/mcp/toolHandler.ts` (modify)
- `language-server/src/mcp/__tests__/toolHandler.test.ts` (modify)

---

### Issue #3: Integrate ObservationMasker with ContextBuilder

**Labels**: `feature`, `phase-1`, `US2`, `integration`

**Description**: Integrate the ObservationMasker into the existing
ContextBuilder to automatically mask observations during context building.

**Tasks**:

- [ ] T011: Add ObservationMasker to ContextBuilder constructor
- [ ] T012: Call maskObservations() after mergeContextSections()
- [ ] T013: Track observation history during context building
- [ ] T014: Update ContextBuilder tests

**Acceptance Criteria**:

- ObservationMasker optional with default instance
- Masking applied after context merge
- Tool outputs automatically tracked as observations
- No regression in existing ContextBuilder functionality
- 50% context reduction demonstrated in tests

**Files**:

- `extension/src/autonomous/ContextBuilder.ts` (modify)
- `extension/src/autonomous/__tests__/ContextBuilder.test.ts` (modify)

---

## Milestone: Phase 2 - Context Health Monitoring

### Issue #4: Create ContextHealthMonitor Module

**Labels**: `feature`, `phase-2`, `US1`

**Description**: Implement the ContextHealthMonitor class that tracks context
usage and emits threshold-based alerts.

**Tasks**:

- [ ] T015: Create class with config
- [ ] T016: Implement analyzeContext() method
- [ ] T017: Implement token counting for breakdown
- [ ] T018: Implement threshold checking
- [ ] T019: Implement periodic monitoring with events
- [ ] T020: Write unit tests

**Acceptance Criteria**:

- Monitors context usage in real-time
- Emits 'healthy', 'warning', 'critical' events
- Token breakdown by category (spec, memories, observations, etc.)
- Recommendations generated based on status
- 90%+ test coverage

**Files**:

- `extension/src/autonomous/ContextHealthMonitor.ts` (new)
- `extension/src/autonomous/__tests__/ContextHealthMonitor.test.ts` (new)

---

### Issue #5: Create ContextUsageLogger for JSONL Logging

**Labels**: `feature`, `phase-2`, `US1`, `logging`

**Description**: Implement JSONL logging for context health events following the
existing UsageLogger pattern from council module.

**Tasks**:

- [ ] T021: Create ContextUsageLogger class
- [ ] T022: Implement JSONL append
- [ ] T023: Add log entry structure
- [ ] T024: Write unit tests

**Acceptance Criteria**:

- Logs to `.specify/logs/context-usage.jsonl`
- Follows JSONL format (one JSON object per line)
- Includes all ContextUsageLogEntry fields
- Directory created if missing
- Tests verify log format and append behavior

**Files**:

- `extension/src/autonomous/ContextUsageLogger.ts` (new)
- `extension/src/autonomous/__tests__/ContextUsageLogger.test.ts` (new)

---

### Issue #6: Add Context Health Status Bar Widget

**Labels**: `feature`, `phase-2`, `US1`, `ui`

**Description**: Add a VSCode status bar item that displays current context
health with color-coded status and click-to-view detailed breakdown.

**Tasks**:

- [ ] T025: Create status bar item
- [ ] T026: Implement color-coded display
- [ ] T027: Add click handler for detailed view
- [ ] T028: Register in extension activation
- [ ] T029: Write UI tests

**Acceptance Criteria**:

- Status bar shows "Context: XX%" with icon
- Green for healthy (<50%), yellow for warning (50-70%), red for critical (>70%)
- Click opens detailed breakdown panel
- Updates automatically as context changes
- Tests verify status bar behavior

**Files**:

- `extension/src/ui/contextHealthStatusBar.ts` (new)
- `extension/src/ui/__tests__/contextHealthStatusBar.test.ts` (new)
- `extension/src/extension.ts` (modify)

---

### Issue #7: Implement Auto-Handoff at Critical Threshold

**Labels**: `feature`, `phase-2`, `US1`, `automation`

**Description**: Automatically trigger session handoff when context reaches
critical threshold to prevent quality degradation.

**Tasks**:

- [ ] T030: Implement auto-handoff trigger
- [ ] T031: Show notification with options
- [ ] T032: Integrate with /7_gofer_save
- [ ] T033: Write E2E test

**Acceptance Criteria**:

- Handoff triggered at configurable threshold (default 70%)
- User notified with "Save & Continue" / "Dismiss" options
- Session-handoff.md created with context snapshot
- Can be disabled via config
- E2E test verifies full flow

**Files**:

- `extension/src/autonomous/ContextHealthMonitor.ts` (modify)
- `tests/e2e/contextHealth.spec.ts` (new)

---

## Milestone: Phase 3 - Stage-Aware Context Profiles

### Issue #8: Create Stage Context Profile System

**Labels**: `feature`, `phase-3`, `US5`, `config`

**Description**: Implement stage-specific context budget profiles that
automatically adjust resource allocation at stage transitions.

**Tasks**:

- [ ] T034: Create context-profiles.yaml template
- [ ] T035: Create TypeScript interfaces
- [ ] T036: Implement YAML config loader
- [ ] T037: Write unit tests
- [ ] T038-T041: ContextBuilder integration
- [ ] T042: Write integration tests

**Acceptance Criteria**:

- Profiles defined in `.specify/memory/context-profiles.yaml`
- Each stage has research/memory/code budgets
- Profiles switch automatically at stage transitions
- Warnings emitted when budget exceeded
- Tests verify profile loading and switching

**Files**:

- `.specify/memory/context-profiles.yaml` (new)
- `extension/src/autonomous/StageContextProfile.ts` (new)
- `extension/src/autonomous/__tests__/StageContextProfile.test.ts` (new)
- `extension/src/autonomous/ContextBuilder.ts` (modify)

---

## Milestone: Phase 4 - Memory-First Loading

### Issue #9: Implement Memory-First Context Loading

**Labels**: `feature`, `phase-4`, `US4`, `memory`

**Description**: Modify context loading to prioritize memories over research
documents, loading research only for gaps in memory coverage.

**Tasks**:

- [ ] T043: Add priority-based sorting to MemoryManager
- [ ] T044: Implement loadByPriority() method
- [ ] T045: Add relevance scoring
- [ ] T046: Write unit tests
- [ ] T047-T049: ContextBuilder integration
- [ ] T050: Write integration tests

**Acceptance Criteria**:

- Memories loaded before research documents
- Priority and relevance scoring determines order
- Research loaded only for uncovered topics
- 40% reduction in average context usage
- Tests verify loading order and reduction

**Files**:

- `extension/src/autonomous/MemoryManager.ts` (modify)
- `extension/src/autonomous/__tests__/MemoryManager.test.ts` (modify)
- `extension/src/autonomous/ContextBuilder.ts` (modify)

---

## Milestone: Phase 5 - Research Document Chunking

### Issue #10: Create ResearchChunker Module

**Labels**: `feature`, `phase-5`, `US3`

**Description**: Implement semantic chunking for research documents to enable
on-demand loading of specific sections.

**Tasks**:

- [ ] T051: Create class skeleton
- [ ] T052: Implement markdown section parsing
- [ ] T053: Implement index generation
- [ ] T054: Implement chunk loading
- [ ] T055: Write unit tests

**Acceptance Criteria**:

- Research documents split by markdown headings
- Index includes chunk summaries with keywords
- Chunks loadable by ID
- Relevance scoring for task-based selection
- 90%+ test coverage

**Files**:

- `extension/src/autonomous/ResearchChunker.ts` (new)
- `extension/src/autonomous/__tests__/ResearchChunker.test.ts` (new)

---

### Issue #11: Add Research Chunk MCP Tools

**Labels**: `feature`, `phase-5`, `US3`, `mcp`

**Description**: Add MCP tools for retrieving research index and loading
specific chunks.

**Tasks**:

- [ ] T056: Add gofer_get_research_index tool
- [ ] T057: Add gofer_load_research_chunk tool
- [ ] T058: Write integration tests

**Acceptance Criteria**:

- Index tool returns chunk summaries
- Chunk tool returns full content
- Path traversal prevented in specId
- Proper error handling for missing resources
- Integration tests verify both tools

**Files**:

- `language-server/src/mcp/toolHandler.ts` (modify)

---

### Issue #12: Integrate Chunked Research Loading

**Labels**: `feature`, `phase-5`, `US3`, `integration`

**Description**: Integrate research chunking with ContextBuilder to load index
by default and chunks on-demand.

**Tasks**:

- [ ] T059: Load index instead of full document
- [ ] T060: Implement chunk relevance scoring
- [ ] T061: Load top-N chunks based on context
- [ ] T062: Write integration tests

**Acceptance Criteria**:

- Research index loaded by default (small token footprint)
- Chunks selected based on task relevance
- Number of chunks determined by stage budget
- 60% reduction in research context usage
- Tests verify chunked loading

**Files**:

- `extension/src/autonomous/ContextBuilder.ts` (modify)

---

## Milestone: Phase 6 - Telemetry and Observability

### Issue #13: Extend Telemetry for Context Management

**Labels**: `feature`, `phase-6`, `telemetry`

**Description**: Add telemetry tracking for context health, observation masking,
and stage profile events.

**Tasks**:

- [ ] T063: Add trackContextHealthCheck()
- [ ] T064: Add trackObservationMasked()
- [ ] T065: Add trackStageProfileSwitch()
- [ ] T066: Add trackMemoryFirstHit()
- [ ] T067: Write unit tests

**Acceptance Criteria**:

- All context operations tracked
- Event format consistent with existing telemetry
- Privacy-compliant (no content logged)
- Tests verify event emission

**Files**:

- `extension/src/autonomous/telemetryIntegration.ts` (modify)

---

### Issue #14: Add Context Health Dashboard Section

**Labels**: `feature`, `phase-6`, `ui`, `dashboard`

**Description**: Add context health section to existing dashboard showing
metrics, masking stats, and stage profile usage.

**Tasks**:

- [ ] T068: Add health section to dashboard
- [ ] T069: Display masking statistics
- [ ] T070: Display stage profile usage
- [ ] T071: Write UI tests

**Acceptance Criteria**:

- Dashboard shows current health status
- Masking stats include observations masked, tokens saved
- Stage profile shows current stage and budget usage
- Data refreshes automatically
- Tests verify widget rendering

**Files**:

- Dashboard files TBD based on existing structure

---

## Milestone: Phase 7 - Integration Testing and Polish

### Issue #15: End-to-End Integration Testing

**Labels**: `testing`, `phase-7`, `e2e`

**Description**: Comprehensive E2E tests for the complete context health system.

**Tasks**:

- [ ] T072: Test full Gofer pipeline
- [ ] T073: Test observation masking across stages
- [ ] T074: Test auto-handoff flow
- [ ] T075: Test memory-first with research fallback

**Acceptance Criteria**:

- All 6 Gofer stages tested with context management
- Observation masking verified in research and implement
- Auto-handoff triggers and resumes correctly
- Memory-first loading demonstrated
- No regression in existing functionality

**Files**:

- `tests/e2e/contextHealth.spec.ts` (new/extend)

---

### Issue #16: Performance Validation

**Labels**: `testing`, `phase-7`, `performance`

**Description**: Validate that all context management operations meet
performance requirements.

**Tasks**:

- [ ] T076: Validate masking <10ms
- [ ] T077: Validate health check <50ms
- [ ] T078: Validate memory loading <200ms
- [ ] T079: Validate 40%+ context reduction

**Acceptance Criteria**:

- Observation masking completes in <10ms
- Context health check completes in <50ms
- Memory loading completes in <200ms
- Overall context reduction ≥40%
- Performance documented in benchmark results

**Files**:

- Performance benchmark scripts TBD

---

### Issue #17: Documentation Updates

**Labels**: `documentation`, `phase-7`

**Description**: Update documentation to cover new context management features.

**Tasks**:

- [ ] T080: Update CLAUDE.md
- [ ] T081: Update README
- [ ] T082: Document MCP tools

**Acceptance Criteria**:

- CLAUDE.md includes context management section
- README has configuration and troubleshooting
- MCP tools documented with examples
- Quickstart guide validated

**Files**:

- `CLAUDE.md` (modify)
- `README.md` (modify)
- API reference docs TBD

---

## Labels Reference

| Label                       | Description                |
| --------------------------- | -------------------------- |
| `feature`                   | New feature implementation |
| `phase-1` through `phase-7` | Implementation phase       |
| `US1` through `US5`         | User story reference       |
| `mcp`                       | MCP tool related           |
| `ui`                        | User interface related     |
| `integration`               | Integration work           |
| `config`                    | Configuration related      |
| `memory`                    | Memory system related      |
| `logging`                   | Logging related            |
| `telemetry`                 | Telemetry tracking         |
| `dashboard`                 | Dashboard UI               |
| `testing`                   | Test implementation        |
| `e2e`                       | End-to-end testing         |
| `performance`               | Performance work           |
| `documentation`             | Documentation updates      |
| `automation`                | Automation features        |

---

## Issue Creation Commands

```bash
# Create Phase 1 milestone
gh api repos/:owner/:repo/milestones -f title="Phase 1: Observation Masking" -f description="Implement observation masking for 50% context reduction"

# Create issue example
gh issue create \
  --title "Create ObservationMasker Core Module" \
  --body-file issue-1-body.md \
  --label "feature,phase-1,US2" \
  --milestone "Phase 1: Observation Masking"
```
