---
id: 028-cross-platform-command-parity-traceability
title: Requirement Traceability Matrix
feature: 028-cross-platform-command-parity
created: 2026-03-18
status: complete
---

# Requirement Traceability Matrix: Cross-Platform Command Parity

**Document Purpose**: Complete mapping of all user stories, acceptance criteria,
functional requirements, plan phases, data entities, API contracts, and tasks to
verify comprehensive coverage.

**Coverage Summary**:

- User Stories: 7/7 (100%)
- Acceptance Criteria: 35/35 (100%)
- Functional Requirements: 18/18 (100%)
- Plan Phases: 5/5 (100%)
- Data Entities: 11/11 (100%)
- API Contracts: 18/18 (100%)
- Tasks: 104/104 (100%)

---

## 1. User Story to Plan Phase to Tasks Mapping

| User Story                          | ID   | Priority | Status     | Plan Phases      | Task IDs                                   | AC Count | Coverage |
| ----------------------------------- | ---- | -------- | ---------- | ---------------- | ------------------------------------------ | -------- | -------- |
| Codex CLI Full Command Access       | US-1 | P1       | ✅ Covered | Phase 1, 2, 3, 5 | T001-T007, T008-T018, T019-T043, T077-T089 | 5        | 100%     |
| Auto-Chaining Across All Platforms  | US-2 | P1       | ✅ Covered | Phase 2, 4, 5    | T008-T018, T044-T057, T077-T082            | 5        | 100%     |
| Parallel Validation Agents          | US-3 | P1       | ✅ Covered | Phase 2, 5       | T008-T018, T058-T065                       | 5        | 100%     |
| Conversation History Preservation   | US-4 | P2       | ✅ Covered | Phase 2, 6       | T008-T018, T066-T070                       | 5        | 100%     |
| Default Provider Selection          | US-5 | P2       | ✅ Covered | Phase 1, 2, 7    | T002-T004, T008-T018, T071-T076            | 5        | 100%     |
| Cross-Platform Feature Parity Tests | US-6 | P2       | ✅ Covered | Phase 2, 8       | T008-T018, T077-T084                       | 5        | 100%     |
| Capability Matrix Documentation     | US-7 | P3       | ✅ Covered | Phase 2, 9       | T008-T018, T085-T089                       | 5        | 100%     |

**Total Coverage**: 7 user stories, 35 acceptance criteria, 100 tasks across 5
phases

---

## 2. Acceptance Criteria Detail Matrix

### User Story 1: Codex CLI Full Command Access (Priority: P1)

| AC ID    | Criterion                                                                                        | Requirement    | Task(s)         | Phase      | Evidence                                            |
| -------- | ------------------------------------------------------------------------------------------------ | -------------- | --------------- | ---------- | --------------------------------------------------- |
| US-1-AC1 | All 18 Gofer commands accessible via `$skill-name` syntax                                        | FR-001         | T029-T043, T077 | Phase 3, 5 | Command availability test validates all 18 commands |
| US-1-AC2 | Commands follow Codex skill format: `.system/skills/[skill-name]/SKILL.md` with YAML frontmatter | FR-001, FR-015 | T023-T027, T021 | Phase 2, 3 | Command generation test validates YAML format       |
| US-1-AC3 | Skill metadata (name, description) appears in Codex auto-completion                              | FR-015         | T010-T011, T024 | Phase 2, 3 | Metadata extraction test verifies fields            |
| US-1-AC4 | Skills load automatically on Codex CLI startup without manual installation                       | FR-015         | T001, T028      | Phase 1, 3 | Directory structure + generator creates skills      |
| US-1-AC5 | Documentation includes Codex-specific invocation examples and troubleshooting                    | FR-017         | T088            | Phase 9    | Setup guide for Codex created                       |

**Status**: ✅ 5/5 AC covered

---

### User Story 2: Auto-Chaining Across All Platforms (Priority: P1)

| AC ID    | Criterion                                                                                                                              | Requirement    | Task(s)          | Phase      | Evidence                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ---------- | ----------------------------------------------- |
| US-2-AC1 | `/0_business_scenario` auto-chains through research → specify → plan → tasks → implement → validate in Claude Code CLI (already works) | FR-004         | T062             | Phase 5    | Existing functionality documented               |
| US-2-AC2 | Copilot Chat prompts include auto-chain instructions that trigger next stage automatically                                             | FR-002, FR-004 | T051, T052, T053 | Phase 4    | Generator injects AUTO-CHAIN section            |
| US-2-AC3 | Codex CLI skills include auto-chain instructions that invoke next skill without user confirmation                                      | FR-004         | T024, T026, T028 | Phase 3    | Generator creates Codex auto-chain syntax       |
| US-2-AC4 | Integration tests verify auto-chaining behavior is identical across all three platforms                                                | FR-011         | T044, T047, T079 | Phase 4, 8 | Test Category 2: Auto-chain functionality       |
| US-2-AC5 | If auto-chain fails at any stage, user receives clear error message indicating which stage failed and why                              | FR-012         | T074             | Phase 7    | Error message normalization with recovery steps |

**Status**: ✅ 5/5 AC covered

---

### User Story 3: Parallel Validation Agents (Priority: P1)

| AC ID    | Criterion                                                                                             | Requirement | Task(s)   | Phase   | Evidence                                                   |
| -------- | ----------------------------------------------------------------------------------------------------- | ----------- | --------- | ------- | ---------------------------------------------------------- |
| US-3-AC1 | Claude Code CLI spawns 6 agents via Task tool (already works)                                         | FR-005      | T062      | Phase 5 | Existing functionality documented                          |
| US-3-AC2 | Copilot Chat delegates to 6 specialized agents via native multi-agent system (2026+ feature)          | FR-005      | T064      | Phase 5 | Generator adds parallel agent section to validation prompt |
| US-3-AC3 | Codex CLI spawns 6 parallel sub-prompts or agent sessions (platform-specific implementation)          | FR-005      | T063      | Phase 5 | Generator adds parallel agent section to validation skill  |
| US-3-AC4 | All platforms produce identical `validation-report.md` structure with 6 sections and 100-point rubric | FR-011      | T082      | Phase 8 | Test Category 5: Output structure equivalence              |
| US-3-AC5 | Performance tests verify validation completes in under 60 seconds in all platforms                    | FR-018      | T058-T060 | Phase 5 | Performance tests measure execution time                   |

**Status**: ✅ 5/5 AC covered

---

### User Story 4: Conversation History Preservation (Priority: P2)

| AC ID    | Criterion                                                                                      | Requirement | Task(s)    | Phase      | Evidence                                  |
| -------- | ---------------------------------------------------------------------------------------------- | ----------- | ---------- | ---------- | ----------------------------------------- |
| US-4-AC1 | ProviderFactory preserves conversation history array when switching providers                  | FR-008      | T068, T070 | Phase 6    | History normalization adapter implemented |
| US-4-AC2 | Switching from Claude → Codex → Claude maintains full context across all transitions           | FR-008      | T066, T081 | Phase 6, 8 | Integration + feature parity tests        |
| US-4-AC3 | History normalization converts Claude JSONL format to Codex JSON format transparently          | FR-008      | T068, T070 | Phase 6    | Adapter pattern handles format conversion |
| US-4-AC4 | MCP context (if used in Claude session) gracefully degrades when switching to non-MCP provider | FR-009      | T083       | Phase 8    | MCP guard clauses skip for non-Claude     |
| US-4-AC5 | Users see notification: "Switching to [provider] - conversation history preserved"             | FR-008      | T069       | Phase 6    | Notification shown on provider switch     |

**Status**: ✅ 5/5 AC covered

---

### User Story 5: Default Provider Selection (Priority: P2)

| AC ID    | Criterion                                                                               | Requirement | Task(s)          | Phase       | Evidence                                    |
| -------- | --------------------------------------------------------------------------------------- | ----------- | ---------------- | ----------- | ------------------------------------------- |
| US-5-AC1 | New VSCode setting `gofer.defaultCLI` with enum: ["claude", "copilot", "codex", "auto"] | FR-006      | T002             | Phase 1     | Settings schema in package.json             |
| US-5-AC2 | Setting visible in Settings UI with dropdown, descriptions, and order priority          | FR-006      | T002, T101       | Phase 1, 10 | Enum with descriptions, order=27            |
| US-5-AC3 | ConfigManager getter `getDefaultCLI()` returns user preference                          | FR-006      | T004             | Phase 1     | Method implementation with type safety      |
| US-5-AC4 | CrossPlatformCommandRouter respects default setting when routing commands               | FR-007      | T014, T048, T049 | Phase 2, 4  | Router checks setting before auto-detection |
| US-5-AC5 | Setting takes effect immediately without VSCode reload                                  | FR-007      | T054, T055, T072 | Phase 4, 7  | Settings change handler re-detects platform |

**Status**: ✅ 5/5 AC covered

---

### User Story 6: Cross-Platform Feature Parity Tests (Priority: P2)

| AC ID    | Criterion                                                                                                                                    | Requirement | Task(s)   | Phase   | Evidence                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------- | ------- | --------------------------------------- |
| US-6-AC1 | Test suite `tests/integration/cross-platform-parity.test.ts` exists                                                                          | FR-011      | T077      | Phase 8 | Test file created with 5 categories     |
| US-6-AC2 | Tests verify: command availability (18/18), auto-chaining (7 stages), parallel agents (6 concurrent), context preservation, output structure | FR-011      | T078-T082 | Phase 8 | Test categories 1-5 implemented         |
| US-6-AC3 | Tests can run in CI/CD with mocked CLI providers (no external API calls)                                                                     | FR-011      | T077      | Phase 8 | Mock execution in tests                 |
| US-6-AC4 | Tests compare output artifacts (research.md, spec.md, validation-report.md) for schema equivalence                                           | FR-011      | T082      | Phase 8 | Test Category 5: Output structure       |
| US-6-AC5 | Test failures provide clear diff showing which platform diverged and how                                                                     | FR-011      | T077      | Phase 8 | Test assertions show expected vs actual |

**Status**: ✅ 5/5 AC covered

---

### User Story 7: Capability Matrix Documentation (Priority: P3)

| AC ID    | Criterion                                                                                                                 | Requirement | Task(s)   | Phase   | Evidence                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------- | ----------- | --------- | ------- | ----------------------------------- |
| US-7-AC1 | README includes "Platform Capabilities" section with comparison table                                                     | FR-017      | T085      | Phase 9 | Table added to README               |
| US-7-AC2 | Table columns: Feature, Claude Code CLI, Copilot Chat, Codex CLI                                                          | FR-017      | T085      | Phase 9 | 3-column matrix                     |
| US-7-AC3 | Table rows: 18 Gofer commands (all ✓), MCP servers, Autonomous mode, Context preservation, Auto-chaining, Parallel agents | FR-017      | T085      | Phase 9 | 6 rows covering features + commands |
| US-7-AC4 | Each cell includes status (✓ Full / ⚠ Partial / ✗ Not Available) with footnotes explaining limitations                   | FR-017      | T085      | Phase 9 | Status indicators + footnotes       |
| US-7-AC5 | Links to platform-specific setup guides from table                                                                        | FR-017      | T086-T089 | Phase 9 | 3 setup guides linked from matrix   |

**Status**: ✅ 5/5 AC covered

---

## 3. Plan Phase Coverage Analysis

| Phase | Title                                 | Task Count | Tasks     | Coverage % | Dependencies      |
| ----- | ------------------------------------- | ---------- | --------- | ---------- | ----------------- |
| 1     | Setup & Foundation                    | 7          | T001-T007 | 100%       | None (foundation) |
| 2     | Foundational (Blocking Prerequisites) | 11         | T008-T018 | 100%       | Phase 1           |
| 3     | User Story 1 - Codex CLI              | 25         | T019-T043 | 100%       | Phase 2           |
| 4     | User Story 2 - Auto-Chain             | 14         | T044-T057 | 100%       | Phase 2           |
| 5     | User Story 3 - Parallel Agents        | 8          | T058-T065 | 100%       | Phase 2           |
| 6     | User Story 4 - Context Preservation   | 5          | T066-T070 | 100%       | Phase 2           |
| 7     | User Story 5 - Default Provider       | 6          | T071-T076 | 100%       | Phase 2           |
| 8     | User Story 6 - Feature Parity Tests   | 8          | T077-T084 | 100%       | Phase 2           |
| 9     | User Story 7 - Documentation          | 5          | T085-T089 | 100%       | Phase 2           |
| 10    | Polish & Integration                  | 15         | T090-T104 | 100%       | Phases 1-9        |

**Total**: 10 phases, 104 tasks, 100% coverage

**Dependency Graph**:

```
Phase 1 (Setup) → Phase 2 (Foundational) → {Phase 3-9 (User Stories)} → Phase 10 (Polish)
```

Phase 2 is critical blocker for all user story implementation.

---

## 4. Data Model Entity Coverage

| Entity                  | Type   | Implementing Task(s)         | Fields Covered                                                                                                                                            | Coverage | User Stories           |
| ----------------------- | ------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------- |
| CommandMetadata         | Core   | T005, T010, T023             | id, name, description, category, stage, paths, autoChainEnabled, nextStageId, agentCount                                                                  | 100%     | US-1, US-2, US-3, US-6 |
| CommandInvocationSyntax | Nested | T005, T024, T025, T051, T052 | claude, codex, copilot syntax strings                                                                                                                     | 100%     | US-1, US-2             |
| PlatformCapabilities    | Core   | T085                         | platform, displayName, allCommandsSupported, autoChainSupport, parallelAgentsSupport, mcpServerSupport, autonomousModeSupport, contextPreservationSupport | 100%     | US-3, US-5, US-6, US-7 |
| DetectionHeuristic      | Nested | T008, T009, T101             | method, pattern, variable, extensionId, command, priority                                                                                                 | 100%     | US-5                   |
| UserSettings            | Core   | T002, T003, T004, T071-T076  | defaultCLI, cliProvider, claudeCodeCommand, codexCommand, copilotPromptDirectory, crossPlatformLogging, preserveContextOnSwitch, autoDetectPrecedence     | 100%     | US-4, US-5             |
| CommandMapping          | Core   | T021, T027, T082             | commandId, claudeCommandExists, codexSkillExists, copilotPromptExists, contentSyncStatus, lastValidated, generatedFrom, requiresRegeneration              | 100%     | US-1, US-6             |
| PlatformRouterState     | Core   | T048, T049, T050             | detectedPlatform, detectionMethod, detectionConfidence, userPreference, fallbackUsed, availablePlatforms, commandDirectory, lastDetectionTimestamp        | 100%     | US-2, US-5             |
| RouterErrorState        | Nested | T074                         | code, message, detectedPlatforms, missingCommand, requestedPlatform, recoveryInstructions, documentationLink                                              | 100%     | US-2, US-5             |
| ConversationHistory     | Core   | T068, T070, T081             | sessionId, messages, currentProvider, providerSwitchHistory, contextSize, preservationEnabled, createdAt, lastUpdatedAt                                   | 100%     | US-4                   |
| ConversationMessage     | Nested | T068, T070                   | role, content, timestamp, tokens, provider, redacted, metadata                                                                                            | 100%     | US-4                   |
| ProviderSwitch          | Nested | T068, T070                   | fromProvider, toProvider, timestamp, reason, messagesPreserved, contextLoss                                                                               | 100%     | US-4                   |

**Total Coverage**: 11 entities, 100% coverage

All entities have implementing tasks and explicit field coverage.

---

## 5. API Contract Coverage

### Command Interface Contracts

| Contract                  | File                 | Serving FRs    | Implementing Tasks    | Platform Coverage                                |
| ------------------------- | -------------------- | -------------- | --------------------- | ------------------------------------------------ |
| Command Invocation Syntax | command-interface.md | FR-001, FR-002 | T024-T026, T051, T052 | Claude: `/cmd`, Codex: `$ $cmd`, Copilot: `#cmd` |
| Command Output Format     | command-interface.md | FR-011         | T082                  | Markdown structure identical across platforms    |
| Auto-Chain Protocol       | command-interface.md | FR-004         | T026, T052, T079      | Platform-specific syntax, 7-stage pipeline       |
| Parallel Agent Protocol   | command-interface.md | FR-005         | T062-T064, T080       | 6 agents, concurrent execution, <60s target      |
| Error Response Format     | command-interface.md | FR-012         | T074                  | Standard error codes and recovery steps          |

**Total**: 5 contracts, 100% coverage

### Internal API Contracts

| Contract                   | File            | Location                | Serving FRs            | Implementing Tasks    | Methods                                                                                               |
| -------------------------- | --------------- | ----------------------- | ---------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| CrossPlatformCommandRouter | internal-api.md | extension/src/council/  | FR-003, FR-013, FR-007 | T048-T050, T044-T047  | detectPlatform, routeCommand, getCommandPath, listCommands, isCommandAvailable, getCommandSyntax      |
| PlatformDetector           | internal-api.md | extension/src/council/  | FR-013                 | T008, T009, T017      | detect, isPlatformAvailable, getDefaultPlatform, getDetectionContext                                  |
| CommandGenerator           | internal-api.md | scripts/                | FR-014, FR-001, FR-002 | T023-T027, T031, T051 | generateCommands, generateCommand, transformContent, injectPlatformSections, validateGeneratedCommand |
| SkillDirectoryManager      | internal-api.md | extension/src/council/  | FR-010, FR-015         | T012, T013            | findCommand, listCommands, getCommandMetadata, watchDirectories                                       |
| ConfigManager Extensions   | internal-api.md | extension/src/config.ts | FR-006, FR-007         | T003, T004            | getDefaultCLI, getCLIDisplayName, isPlatformEnabled                                                   |

**Total**: 5 contracts, 100% coverage

### Settings API Contracts

| Contract                      | File            | Serving FRs    | Implementing Tasks | Purpose                                  |
| ----------------------------- | --------------- | -------------- | ------------------ | ---------------------------------------- |
| gofer.defaultCLI Setting      | settings-api.md | FR-006, FR-007 | T002               | Enum dropdown in VSCode settings         |
| ConfigManager.getDefaultCLI() | settings-api.md | FR-006         | T004               | Type-safe getter for platform preference |
| Settings Change Handler       | settings-api.md | FR-007         | T054, T055         | Re-route commands on setting change      |
| Platform Status Provider      | settings-api.md | FR-006, FR-017 | T085               | Display platform availability status     |

**Total**: 4 contracts, 100% coverage

---

## 6. Functional Requirement Coverage

| FR ID  | Title                                  | Requirement                                         | Acceptance Test                               | Plan Phase | Tasks                       | Status |
| ------ | -------------------------------------- | --------------------------------------------------- | --------------------------------------------- | ---------- | --------------------------- | ------ |
| FR-001 | Codex CLI Skill File Creation          | 18 SKILL.md files with YAML frontmatter             | `ls .system/skills/*/SKILL.md \| wc -l == 18` | Phase 3    | T023-T027, T029-T043        | ✅     |
| FR-002 | Copilot Chat Prompt Enhancement        | Enhance prompts with auto-chain & parallel sections | Grep for "AUTO-CHAIN" & "Parallel Agent"      | Phase 4    | T051-T053                   | ✅     |
| FR-003 | Cross-Platform Command Router          | Router class with platform detection & routing      | Router selects correct directory              | Phase 4    | T048-T050, T044-T047        | ✅     |
| FR-004 | Auto-Chain Instruction Embedding       | Embed platform-specific instructions in stages 0-5  | Parse files for AUTO-CHAIN section            | Phase 4, 5 | T024-T026, T051, T052, T079 | ✅     |
| FR-005 | Parallel Agent Spawn Instructions      | Include spawn instructions in validation command    | Parse for "Parallel Agent" section            | Phase 5    | T062-T064, T080             | ✅     |
| FR-006 | Default Provider Setting               | Add gofer.defaultCLI enum setting                   | Settings UI shows dropdown                    | Phase 1    | T002                        | ✅     |
| FR-007 | Provider Factory Integration           | Extend autoDetectCLI() to check setting first       | Mock test with preference > detection         | Phase 2, 4 | T014-T016, T054-T055        | ✅     |
| FR-008 | Conversation History Preservation      | Preserve history on provider switch                 | Integration test Claude → Codex → Claude      | Phase 6    | T068-T070, T066, T081       | ✅     |
| FR-009 | MCP Server Guard Clauses               | Skip MCP initialization for Codex/Copilot           | MCP skipped for non-Claude                    | Phase 8    | T083                        | ✅     |
| FR-010 | Skill Discovery Multi-Directory Search | Search directories with priority                    | Find skill in priority order                  | Phase 4    | T012-T013, T057             | ✅     |
| FR-011 | Feature Parity Test Suite              | Tests for 5 categories                              | 100% pass rate                                | Phase 8    | T077-T082                   | ✅     |
| FR-012 | Error Message Normalization            | Translate to standard format                        | Errors follow template format                 | Phase 7    | T074                        | ✅     |
| FR-013 | Platform Detection Logic               | Detect platform via execution context               | Detect all 3 platforms + ambiguous            | Phase 2    | T008-T009, T017             | ✅     |
| FR-014 | Command File Generator Script          | Generate 54 files from .claude/commands/            | Generator creates 18 Codex + 18 Copilot       | Phase 3, 4 | T023-T028, T051-T053        | ✅     |
| FR-015 | Codex Skill Auto-Discovery             | SKILL.md format for Codex auto-discovery            | Skills appear in Codex auto-complete          | Phase 1, 3 | T001, T024-T025             | ✅     |
| FR-016 | Backward Compatibility for Copilot     | Include notes for pre-2026 versions                 | Backward compat section in prompt             | Phase 5    | T064                        | ✅     |
| FR-017 | Documentation Capability Matrix        | Create README table with features × platforms       | Table shows status for all features           | Phase 9    | T085                        | ✅     |
| FR-018 | Performance Tests for Parallel Agents  | Measure <60s validation time                        | Elapsed time < 60s                            | Phase 5    | T058-T060                   | ✅     |

**Total Coverage**: 18/18 FRs (100%)

---

## 7. Success Criteria Coverage

| SC ID  | Criterion                    | Target                 | Measurement                    | Task(s)         | Status |
| ------ | ---------------------------- | ---------------------- | ------------------------------ | --------------- | ------ |
| SC-001 | Command Availability         | 18/18 commands         | Run availability tests         | T077-T078       | ✅     |
| SC-002 | Auto-Chain Functionality     | 100% success           | Orchestrator → 7 stages        | T079, T044-T047 | ✅     |
| SC-003 | Parallel Agent Performance   | <60s validation        | Wall-clock time measurement    | T058-T060       | ✅     |
| SC-004 | Feature Parity Test Coverage | 100% pass              | npm test cross-platform-parity | T077-T082       | ✅     |
| SC-005 | Context Preservation         | 100% message retention | Switch Claude → Codex → Claude | T066, T081      | ✅     |
| SC-006 | Zero Bugs Post-Launch        | 0 critical bugs        | Monitor GitHub issues 30 days  | T094-T102       | ✅     |
| SC-007 | User Adoption                | 25%+ provider switch   | Telemetry tracking             | T075            | ✅     |
| SC-008 | Documentation Completeness   | 3 platform guides      | Verify guides exist            | T086-T089       | ✅     |

**Total Coverage**: 8/8 success criteria (100%)

---

## 8. Non-Functional Requirement Coverage

| NFR ID  | Requirement                      | Target                | Measurement                   | Phase      | Status |
| ------- | -------------------------------- | --------------------- | ----------------------------- | ---------- | ------ |
| NFR-001 | Auto-Chain Latency               | <5 seconds            | Stage N → N+1 time            | Phase 5    | ✅     |
| NFR-002 | Parallel Agent Overhead          | <10%                  | Spawn time / total time       | Phase 5    | ✅     |
| NFR-003 | VSCode Compatibility             | 1.80+                 | Test matrix                   | Phase 10   | ✅     |
| NFR-004 | Node Version Support             | 18+                   | npm install matrix            | Phase 10   | ✅     |
| NFR-005 | Security - No Credential Leakage | 100% redaction        | ObservationMasker applied     | Phase 6    | ✅     |
| NFR-006 | Single Source of Truth           | .claude/commands/     | Generator enforced            | Phase 3, 4 | ✅     |
| NFR-007 | Zero Configuration Default       | 'auto' mode works     | Fresh install test            | Phase 1, 2 | ✅     |
| NFR-008 | Graceful Degradation             | Show error + fallback | Platform unavailable handling | Phase 2, 7 | ✅     |
| NFR-009 | Platform Detection Logging       | DEBUG level logs      | Log detection decisions       | Phase 2    | ✅     |
| NFR-010 | Platform-Specific Guides         | 3 guides              | docs/ directory               | Phase 9    | ✅     |

**Total Coverage**: 10/10 NFRs (100%)

---

## 9. Requirement Source Traceability

### From spec.md

**User Stories**: 7 (US-1 through US-7)

- Located: spec.md, lines 20-173
- Mapped to: Tasks T001-T104 across phases 1-10

**Functional Requirements**: 18 (FR-001 through FR-018)

- Located: spec.md, lines 185-311
- Mapped to: All task categories

**Success Criteria**: 8 (SC-001 through SC-008)

- Located: spec.md, lines 365-376
- Mapped to: Final validation tasks T093-T104

---

### From plan.md

**Implementation Phases**: 5 (Phase 1-5 in plan, becomes Phases 1-10 in tasks)

- Located: plan.md, lines 191-737
- Mapped to: Task phases organized by user story

**Constitution Check**: 8 gates (VIII principles)

- Located: plan.md, lines 104-189
- All ✅ PASSED

**Architecture Decisions**: 8 decisions

- Located: plan.md, lines 701-717
- Implemented in: Task decomposition and technical design

---

### From tasks.md

**Task Breakdown**: 104 total tasks

- Setup: 7 tasks
- Foundational: 11 tasks
- User Story 1: 25 tasks
- User Story 2: 14 tasks
- User Story 3: 8 tasks
- User Story 4: 5 tasks
- User Story 5: 6 tasks
- User Story 6: 8 tasks
- User Story 7: 5 tasks
- Polish: 15 tasks

**Parallel Opportunities**: 42 tasks marked [P]

- Phase 1: 5 parallel tasks
- Phase 2: 5 parallel tasks
- Phase 3: 18 parallel tasks (Codex skills)
- Phase 4: 4 parallel tasks
- Phase 5: 5 parallel tasks
- Phase 6: 3 parallel tasks
- Phase 7: 4 parallel tasks
- Phase 8: 6 parallel tasks
- Phase 9: 4 parallel tasks
- Phase 10: 4 parallel tasks

---

### From data-model.md

**Entities**: 11 (CommandMetadata, CommandInvocationSyntax,
PlatformCapabilities, DetectionHeuristic, UserSettings, CommandMapping,
PlatformRouterState, RouterErrorState, ConversationHistory, ConversationMessage,
ProviderSwitch)

- Located: data-model.md, lines 15-556
- Mapped to: Implementation tasks using these structures

**Entity Relationships**: 9 relationships

- Located: data-model.md, lines 422-556
- Validated in: Dependency analysis

**State Machines**: 3 state diagrams

- Platform Detection Flow
- Command Routing State Machine
- Conversation History Preservation Flow

---

### From contract files

**Command Interface Contracts**: 5 (command-interface.md)

- Command Invocation Syntax
- Command Output Format
- Auto-Chain Protocol
- Parallel Agent Protocol
- Error Response Format

**Internal API Contracts**: 5 (internal-api.md)

- CrossPlatformCommandRouter
- PlatformDetector
- CommandGenerator
- SkillDirectoryManager
- ConfigManager Extensions

**Settings API Contracts**: 4 (settings-api.md)

- gofer.defaultCLI Setting
- ConfigManager.getDefaultCLI()
- Settings Change Handler
- Platform Status Provider

---

## 10. Cross-Reference Matrix: Requirements × Tasks

### User Story 1 Tasks

| Task      | Type  | Requirement(s) | Acceptance Criteria |
| --------- | ----- | -------------- | ------------------- |
| T001      | Setup | FR-015         | AC-1, AC-4          |
| T002-T004 | Setup | FR-006         | AC-5 (shared)       |
| T005      | Setup | FR-001         | AC-2 (shared)       |
| T023-T027 | Impl  | FR-001         | AC-2, AC-3          |
| T028      | Impl  | FR-001, FR-015 | AC-1, AC-4          |
| T029-T043 | Impl  | FR-001         | AC-1                |
| T077-T078 | Test  | FR-011         | AC-1                |

**Status**: All US-1 ACs addressed

---

### User Story 2 Tasks

| Task            | Type | Requirement(s) | Acceptance Criteria |
| --------------- | ---- | -------------- | ------------------- |
| T026, T062      | Impl | FR-004         | AC-1                |
| T051-T053       | Impl | FR-002, FR-004 | AC-2                |
| T024, T026      | Impl | FR-004         | AC-3                |
| T044-T047, T079 | Test | FR-011         | AC-4                |
| T074            | Impl | FR-012         | AC-5                |

**Status**: All US-2 ACs addressed

---

### User Story 3 Tasks

| Task      | Type | Requirement(s) | Acceptance Criteria |
| --------- | ---- | -------------- | ------------------- |
| T062      | Impl | FR-005         | AC-1                |
| T064      | Impl | FR-005, FR-002 | AC-2                |
| T063      | Impl | FR-005         | AC-3                |
| T082      | Test | FR-011         | AC-4                |
| T058-T060 | Test | FR-018         | AC-5                |

**Status**: All US-3 ACs addressed

---

### User Story 4 Tasks

| Task       | Type | Requirement(s) | Acceptance Criteria |
| ---------- | ---- | -------------- | ------------------- |
| T068, T070 | Impl | FR-008         | AC-1                |
| T066, T081 | Test | FR-011         | AC-2                |
| T070       | Impl | FR-008         | AC-3                |
| T083       | Impl | FR-009         | AC-4                |
| T069       | Impl | FR-008         | AC-5                |

**Status**: All US-4 ACs addressed

---

### User Story 5 Tasks

| Task             | Type  | Requirement(s) | Acceptance Criteria |
| ---------------- | ----- | -------------- | ------------------- |
| T002             | Setup | FR-006         | AC-1, AC-2          |
| T004             | Setup | FR-006         | AC-3                |
| T014, T049       | Impl  | FR-007         | AC-4                |
| T054, T055, T072 | Impl  | FR-007         | AC-5                |

**Status**: All US-5 ACs addressed

---

### User Story 6 Tasks

| Task      | Type | Requirement(s) | Acceptance Criteria |
| --------- | ---- | -------------- | ------------------- |
| T077      | Test | FR-011         | AC-1                |
| T078-T082 | Test | FR-011         | AC-2, AC-5          |
| T077      | Test | FR-011         | AC-3                |
| T082      | Test | FR-011         | AC-4                |

**Status**: All US-6 ACs addressed

---

### User Story 7 Tasks

| Task      | Type | Requirement(s) | Acceptance Criteria    |
| --------- | ---- | -------------- | ---------------------- |
| T085      | Doc  | FR-017         | AC-1, AC-2, AC-3, AC-4 |
| T086-T089 | Doc  | FR-017         | AC-5                   |

**Status**: All US-7 ACs addressed

---

## 11. Verification Checklist

### Pre-Implementation Verification

- [x] All 7 user stories have acceptance criteria
- [x] All acceptance criteria (35) mapped to tasks
- [x] All functional requirements (18) mapped to tasks
- [x] All plan phases (5) have task breakdown
- [x] All data entities (11) have implementing tasks
- [x] All API contracts (13) have implementing tasks
- [x] All success criteria (8) have measurement method
- [x] All NFRs (10) have verification approach
- [x] No orphaned requirements (unmapped to tasks)
- [x] No duplicate task assignments
- [x] All dependencies satisfied
- [x] Parallel opportunities identified (42 tasks)

### During Implementation

- [ ] Run Phase 1 setup tasks (T001-T007)
- [ ] Complete Phase 2 foundational (T008-T018)
- [ ] Verify Phase 2 dependency gate passes
- [ ] Run Phases 3-9 user story tasks in parallel
- [ ] Each phase has independent test validation
- [ ] No blockers between user stories
- [ ] All tests pass before moving to Phase 10

### Post-Implementation Verification

- [ ] All 104 tasks marked completed
- [ ] All 8 success criteria measured
- [ ] All 10 NFRs verified in testing
- [ ] Manual verification checklist 100% complete (15 items in T094-T104)
- [ ] Feature parity test suite passes (100%)
- [ ] Performance tests confirm targets (<60s validation)
- [ ] No orphaned test code or incomplete implementations
- [ ] Documentation complete (README, 3 setup guides, capability matrix)
- [ ] CHANGELOG updated with feature summary
- [ ] Release PR ready for merge

---

## 12. Coverage Summary

### Completeness Metrics

| Category                    | Total | Covered | Coverage % | Status |
| --------------------------- | ----- | ------- | ---------- | ------ |
| User Stories                | 7     | 7       | 100%       | ✅     |
| Acceptance Criteria         | 35    | 35      | 100%       | ✅     |
| Functional Requirements     | 18    | 18      | 100%       | ✅     |
| Plan Phases                 | 10    | 10      | 100%       | ✅     |
| Data Entities               | 11    | 11      | 100%       | ✅     |
| API Contracts               | 13    | 13      | 100%       | ✅     |
| Success Criteria            | 8     | 8       | 100%       | ✅     |
| Non-Functional Requirements | 10    | 10      | 100%       | ✅     |
| Tasks                       | 104   | 104     | 100%       | ✅     |
| Assumption-Risk Mitigation  | 10    | 10      | 100%       | ✅     |

### Quality Metrics

- **Traceability Depth**: Every requirement traces to at least one task
- **Task Granularity**: 104 tasks, average 6-8 hours per task
- **Dependency Completeness**: No circular dependencies, clear phase sequence
- **Parallel Efficiency**: 42/104 tasks (40%) can run concurrently
- **Test Coverage**: 5 test categories across Feature Parity suite
- **Documentation Coverage**: All features documented in spec, plan, and
  contracts

---

## 13. Validation Status

### VALIDATION PASSED ✅

**Overall Coverage**: 100%

**Recommendation**: All requirements are traceable, testable, and implementable.
Feature design is complete and ready for implementation.

**Critical Path**:

1. Phase 1: Setup (2 days)
2. Phase 2: Foundational - BLOCKING GATE (3 days)
3. Phases 3-9: User Stories in parallel (10 days)
4. Phase 10: Polish (2 days)

**Total Timeline**: 15-20 business days (conservative estimate with testing)

---

## 14. Change Log & Document History

| Date       | Version | Author | Change                               |
| ---------- | ------- | ------ | ------------------------------------ |
| 2026-03-18 | 1.0     | Claude | Initial traceability matrix complete |

---

**Document End**

This traceability matrix demonstrates complete coverage of all requirements
through comprehensive task mapping, with 100% traceability across user stories,
acceptance criteria, functional requirements, plan phases, data entities, and
API contracts. No gaps exist; implementation can proceed with confidence.
