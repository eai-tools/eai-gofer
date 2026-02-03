---
feature: Gofer Memory and Journey System
spec: spec.md
research: research.md
status: ready
created: '2026-01-19'
---

# Implementation Plan: Gofer Memory and Journey System

**Branch**: `010-gofer-memory-journey` | **Date**: 2026-01-19 | **Spec**:
[spec.md](./spec.md)

## Summary

Enhance the Gofer pipeline with three interconnected capabilities:

1. **Agentic Memory System** - Priority-based memory storage with citations and
   just-in-time verification
2. **Interactive Journey Mapping** - User journey confirmation with
   `AskUserQuestion` integration
3. **Multi-Option Sequence Diagrams** - 5 implementation options spanning
   efficiency→innovation spectrum

Technical approach: Extend existing `MemoryManager.ts` and `memory.ts`, modify
`ContextBuilder.ts` for priority-sorted injection, and update Gofer prompt files
for journey/diagram workflows.

---

## Technical Context

**Language/Version**: TypeScript 5.7.2, Node.js 20.x LTS **Primary
Dependencies**: VSCode Extension API, existing MemoryManager, existing council
modules **Storage**: File-based (`.specify/memory/agentic-memories.json`,
`.specify/memory/memory-log.jsonl`) **Testing**: Vitest for unit tests **Target
Platform**: VSCode Extension + Claude Code CLI **Project Type**: VSCode
extension (single project) **Performance Goals**: Memory retrieval <100ms for
1000 memories **Constraints**: Context window limits require selective memory
injection **Scale/Scope**: Project-wide memory sharing, 10-50 journey variants,
5 sequence diagram options

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GOFER MEMORY + JOURNEY SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  AGENTIC MEMORY LAYER                                               │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │     │
│  │  │AgenticMemory │  │MemoryManager │  │ContextBuilder│              │     │
│  │  │  Interface   │→ │  Extension   │→ │  Injection   │              │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │     │
│  │         ↓                  ↓                  ↓                     │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │     │
│  │  │  Citation    │  │   JSONL      │  │   Priority   │              │     │
│  │  │ Verification │  │   Logger     │  │   Sorting    │              │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  JOURNEY MAPPING LAYER                                              │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │     │
│  │  │  Journey     │  │  Variant     │  │  Sequence    │              │     │
│  │  │ Confirmation │→ │ Generation   │→ │  Diagrams    │              │     │
│  │  │(AskUserQ)    │  │(10 industries)│  │(5 options)   │              │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  STORAGE:                                                                    │
│  .specify/memory/                    .specify/specs/{feature}/              │
│  ├── agentic-memories.json           ├── journeys/                          │
│  ├── memory-notes/{uuid}.md          │   ├── base-journey.md               │
│  └── memory-log.jsonl                │   └── variants/{industry}-{n}.md    │
│                                      └── sequence-diagrams/                 │
│                                          ├── option-{n}-{name}.md           │
│                                          └── selected-option.md             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

| Component         | File                                            | Integration Type             |
| ----------------- | ----------------------------------------------- | ---------------------------- |
| Memory Interface  | `extension/src/autonomous/memory.ts`            | Extend with AgenticMemory    |
| Memory Manager    | `extension/src/autonomous/MemoryManager.ts`     | Add agentic methods          |
| Context Builder   | `extension/src/autonomous/ContextBuilder.ts`    | Priority-sorted injection    |
| Business Scenario | `.github/prompts/0_business_scenario.prompt.md` | Add journey confirmation     |
| Research Command  | `.github/prompts/1_gofer_research.prompt.md`    | Add variant generation       |
| Specify Command   | `.github/prompts/2_gofer_specify.prompt.md`     | Add sequence diagram options |
| Plan Command      | `.github/prompts/3_gofer_plan.prompt.md`        | Add vertical slice guidance  |

---

## Implementation Phases (Vertical Slices)

Each phase delivers a complete, deployable, testable vertical slice with visible
value.

### Phase 1: Agentic Memory Foundation (Vertical Slice)

**Goal**: Store and retrieve memories with priority index - complete end-to-end
flow

**Layers Included**:

- **Data**: AgenticMemory interface, JSON storage schema
- **Backend**: MemoryManager extension with save/retrieve/prioritize
- **Logging**: JSONL operation logging
- **Testing**: Unit tests for all operations

**Tasks**:

- [ ] T001 [Data] Create `AgenticMemory` interface extending `Memory` in
      `memory.ts`
- [ ] T002 [Data] Create `Citation` interface with file, line, snippet, hash
- [ ] T003 [Backend] Add `saveAgenticMemory()` method to MemoryManager
- [ ] T004 [Backend] Add `getMemoriesByPriority()` method (sorted by
      priorityIndex)
- [ ] T005 [Backend] Implement priority increment on decision use (+1)
- [ ] T006 [Backend] Implement priority increment on update (+1)
- [ ] T007 [Backend] Ensure retrieval does NOT increment priority
- [ ] T008 [Logging] Create JSONL logger for memory operations
- [ ] T009 [Tests] Unit tests for AgenticMemory CRUD
- [ ] T010 [Tests] Unit tests for priority index behavior

**Verification**:

- [ ] Can store a memory with citations and retrieve it
- [ ] Priority index increments correctly on use/update
- [ ] Priority index does NOT increment on retrieval
- [ ] Operations logged to JSONL
- [ ] All unit tests pass

**Deliverable**: Working memory storage with priority-based retrieval

---

### Phase 2: Citation Verification & Context Injection (Vertical Slice)

**Goal**: Verify memory citations and inject into agent context by priority

**Layers Included**:

- **Data**: Citation hash calculation, verification cache
- **Backend**: Citation verification, ContextBuilder integration
- **UI/Output**: Verified/unverified status in memory notes
- **Testing**: Integration tests for context injection

**Tasks**:

- [ ] T011 [Data] Add hash calculation for code snippets (SHA256 truncated)
- [ ] T012 [Backend] Implement `verifyCitation()` - check if file/line/hash
      match
- [ ] T013 [Backend] Implement `verifyMemory()` - verify all citations
- [ ] T014 [Backend] Add verification cache (avoid repeated file reads)
- [ ] T015 [Backend] Modify ContextBuilder to inject memories by priority
- [ ] T016 [Backend] Add context budget enforcement (top-N memories within
      limit)
- [ ] T017 [Output] Generate human-readable memory notes in `.md` format
- [ ] T018 [Tests] Integration tests for citation verification
- [ ] T019 [Tests] Integration tests for context injection order

**Verification**:

- [ ] Citations are verified before memory is applied
- [ ] Invalid citations flag memory as unverified
- [ ] Context injection respects priority order
- [ ] Context budget is enforced
- [ ] Memory notes are human-readable

**Deliverable**: Verified memories injected into agent context by priority

---

### Phase 3: Memory Operation Hooks (Vertical Slice)

**Goal**: Automatically store/retrieve memories at key agent decision points

**Layers Included**:

- **Backend**: Hook implementations for tool calls, task completion, errors,
  clarifications
- **Integration**: Wire hooks into existing agent flow
- **Testing**: End-to-end tests for memory lifecycle

**Tasks**:

- [ ] T020 [Backend] Implement `beforeToolCall` hook - check relevant memories
- [ ] T021 [Backend] Implement `afterTaskCompletion` hook - store learnings
- [ ] T022 [Backend] Implement `onErrorRecovery` hook - store error patterns
- [ ] T023 [Backend] Implement `onUserClarification` hook - store preferences
- [ ] T024 [Integration] Wire hooks into agent decision flow
- [ ] T025 [Tests] E2E tests for memory lifecycle across session

**Verification**:

- [ ] Relevant memories retrieved before tool calls
- [ ] Learnings stored after task completion
- [ ] Error patterns stored on recovery
- [ ] User preferences stored on clarification
- [ ] Memories persist across sessions

**Deliverable**: Automatic memory operations at agent decision points

---

### Phase 4: Interactive Journey Confirmation (Vertical Slice)

**Goal**: Confirm customer journey interactively at feature start

**Layers Included**:

- **Data**: Journey entity schema, base-journey.md template
- **Backend**: Journey confirmation logic
- **UI**: AskUserQuestion integration for journey confirmation
- **Prompts**: Update 0_business_scenario.prompt.md
- **Testing**: Manual and automated tests

**Tasks**:

- [ ] T026 [Data] Define Journey entity schema (name, actors[], steps[],
      touchpoints[])
- [ ] T027 [Data] Create base-journey.md template
- [ ] T028 [Backend] Implement journey extraction from feature description
- [ ] T029 [Backend] Implement journey confirmation flow
- [ ] T030 [UI] Add AskUserQuestion prompts for journey confirmation
- [ ] T031 [Prompts] Update `0_business_scenario.prompt.md` with journey step
- [ ] T032 [Backend] Save confirmed journey to `journeys/base-journey.md`
- [ ] T033 [Tests] Test journey confirmation flow

**Verification**:

- [ ] User is prompted to confirm journey during /0_business_scenario
- [ ] Journey actors are identified and documented
- [ ] Confirmed journey saved to correct location
- [ ] Journey can be modified before confirmation

**Deliverable**: Interactive journey confirmation in Gofer pipeline

---

### Phase 5: Journey Variant Generation (Vertical Slice)

**Goal**: Generate 10-50 industry variants from confirmed journey

**Layers Included**:

- **Data**: JourneyVariant entity, variant templates
- **Backend**: Variant generation logic with industry mapping
- **Prompts**: Update 1_gofer_research.prompt.md
- **Output**: Variant markdown files
- **Testing**: Variant quality tests

**Tasks**:

- [ ] T034 [Data] Define JourneyVariant entity (baseJourneyId, industry,
      adaptations[], innovations[])
- [ ] T035 [Data] Create variant template for each industry
- [ ] T036 [Backend] Implement random(10, 50) variant count selection
- [ ] T037 [Backend] Implement proportional distribution across 10 industries
- [ ] T038 [Backend] Generate variant content with industry-specific innovations
- [ ] T039 [Prompts] Update `1_gofer_research.prompt.md` with variant generation
- [ ] T040 [Output] Save variants to `journeys/variants/{industry}-{number}.md`
- [ ] T041 [Tests] Test variant generation coverage

**Verification**:

- [ ] Random 10-50 variants generated each time
- [ ] Variants distributed across all 10 industries
- [ ] Each variant includes industry-specific innovations
- [ ] Variants stored in correct location
- [ ] Variants reference base journey

**Deliverable**: Industry variant generation in research phase

---

### Phase 6: Multi-Option Sequence Diagrams (Vertical Slice)

**Goal**: Generate 5 implementation options with efficiency→innovation spectrum

**Layers Included**:

- **Data**: SequenceDiagramOption entity, Mermaid templates
- **Backend**: Option generation logic with scoring
- **Prompts**: Update 2_gofer_specify.prompt.md
- **Output**: Option markdown files with Mermaid diagrams
- **UI**: Option selection flow
- **Testing**: Option quality and completeness tests

**Tasks**:

- [ ] T042 [Data] Define SequenceDiagramOption entity (optionNumber, name,
      scores, effort, risks)
- [ ] T043 [Data] Create Mermaid sequence diagram templates
- [ ] T044 [Backend] Generate Option 1 - Minimal (95% efficiency, 10%
      innovation)
- [ ] T045 [Backend] Generate Option 2 - Efficient (80% efficiency, 30%
      innovation)
- [ ] T046 [Backend] Generate Option 3 - Standard (60% efficiency, 50%
      innovation)
- [ ] T047 [Backend] Generate Option 4 - Enhanced (40% efficiency, 70%
      innovation)
- [ ] T048 [Backend] Generate Option 5 - Innovative (20% efficiency, 95%
      innovation)
- [ ] T049 [Backend] Include Gen AI touchpoints in each option
- [ ] T050 [Backend] Calculate and include effort estimates
- [ ] T051 [Prompts] Update `2_gofer_specify.prompt.md` with diagram generation
- [ ] T052 [UI] Add option selection flow
- [ ] T053 [Output] Save options to `sequence-diagrams/option-{N}-{name}.md`
- [ ] T054 [Output] Save selected option to
      `sequence-diagrams/selected-option.md`
- [ ] T055 [Tests] Test option generation and selection

**Verification**:

- [ ] 5 distinct options generated
- [ ] Options span efficiency→innovation spectrum
- [ ] Each option has Mermaid diagram, scores, effort, risks
- [ ] Gen AI touchpoints highlighted
- [ ] User can select preferred option
- [ ] Selected option stored correctly

**Deliverable**: Multi-option sequence diagrams in specify phase

---

### Phase 7: Gofer Command Updates (Vertical Slice)

**Goal**: Update all Gofer prompt files to incorporate new features

**Layers Included**:

- **Prompts**: All Gofer command files (Claude and GitHub Copilot)
- **Documentation**: Updated command documentation
- **Testing**: Command flow tests

**Tasks**:

- [ ] T056 [Prompts] Update `.github/prompts/0_business_scenario.prompt.md` -
      journey confirmation
- [ ] T057 [Prompts] Update `.github/prompts/1_gofer_research.prompt.md` -
      variant generation
- [ ] T058 [Prompts] Update `.github/prompts/2_gofer_specify.prompt.md` -
      sequence diagrams
- [ ] T059 [Prompts] Update `.github/prompts/3_gofer_plan.prompt.md` - vertical
      slice emphasis
- [ ] T060 [Docs] Update CLAUDE.md with new command capabilities
- [ ] T061 [Tests] Test complete pipeline flow with new features

**Verification**:

- [ ] /0_business_scenario includes journey confirmation
- [ ] /1_gofer_research generates variants
- [ ] /2_gofer_specify generates sequence diagram options
- [ ] /3_gofer_plan emphasizes vertical slices
- [ ] Documentation updated
- [ ] Full pipeline works end-to-end

**Deliverable**: Updated Gofer commands with all new features

---

## Project Structure

### Documentation (this feature)

```text
.specify/specs/010-gofer-memory-journey/
├── spec.md              # Feature specification
├── research.md          # Codebase research
├── plan.md              # This file
├── data-model.md        # Data model design
├── quickstart.md        # Quick start guide
├── contracts/           # API contracts (internal)
├── tasks.md             # Task breakdown
├── checklists/          # Quality checklists
│   └── requirements.md
└── session-handoff.md   # Session state (if needed)
```

### Source Code (repository root)

```text
extension/src/
├── autonomous/
│   ├── memory.ts                    # MODIFY: Add AgenticMemory interface
│   ├── MemoryManager.ts             # MODIFY: Add agentic methods
│   └── ContextBuilder.ts            # MODIFY: Priority-sorted injection
├── council/
│   └── UsageLogger.ts               # REFERENCE: JSONL pattern
└── ...

.github/prompts/
├── 0_business_scenario.prompt.md    # MODIFY: Add journey confirmation
├── 1_gofer_research.prompt.md       # MODIFY: Add variant generation
├── 2_gofer_specify.prompt.md        # MODIFY: Add sequence diagrams
├── 3_gofer_plan.prompt.md           # MODIFY: Add vertical slice guidance
└── ...

.specify/memory/                     # NEW: Project-wide memory storage
├── agentic-memories.json
├── memory-notes/
│   └── {uuid}.md
└── memory-log.jsonl

.specify/specs/{feature}/journeys/   # NEW: Per-feature journeys
├── base-journey.md
└── variants/
    └── {industry}-{number}.md

.specify/specs/{feature}/sequence-diagrams/  # NEW: Per-feature diagrams
├── option-1-minimal.md
├── option-2-efficient.md
├── option-3-standard.md
├── option-4-enhanced.md
├── option-5-innovative.md
└── selected-option.md
```

---

## Risk Assessment

| Risk                                       | Impact | Mitigation                                            |
| ------------------------------------------ | ------ | ----------------------------------------------------- |
| Context window overflow with many memories | High   | Context budget enforcement, priority-based truncation |
| Citation verification latency              | Medium | Caching verification results                          |
| Variant generation quality inconsistency   | Medium | Quality filters, structured templates                 |
| Sequence diagram options too similar       | Medium | Defined spectrum with distinct characteristics        |
| Breaking existing MemoryManager API        | High   | Extend interface, don't modify existing methods       |

---

## Spec Traceability

### User Story Coverage

| Story                                  | Priority | Status  | Plan References |
| -------------------------------------- | -------- | ------- | --------------- |
| US1 - Agentic Memory Storage           | P1       | COVERED | Phase 1, 2, 3   |
| US2 - Interactive Journey Confirmation | P2       | COVERED | Phase 4         |
| US3 - Journey Variant Generation       | P2       | COVERED | Phase 5         |
| US4 - Multi-Option Sequence Diagrams   | P3       | COVERED | Phase 6         |
| US5 - Memory Priority and Surfacing    | P1       | COVERED | Phase 1, 2      |
| US6 - Project-Wide Memory Sharing      | P2       | COVERED | Phase 1         |

### Requirement Coverage

| Requirement                             | Status  | Plan Reference                |
| --------------------------------------- | ------- | ----------------------------- |
| FR-001 AgenticMemory interface          | COVERED | Phase 1, T001-T002            |
| FR-002 Hybrid storage format            | COVERED | Phase 1, T003; Phase 2, T017  |
| FR-003 Priority increment on use/update | COVERED | Phase 1, T005-T006            |
| FR-004 No increment on retrieval        | COVERED | Phase 1, T007                 |
| FR-005 Citation verification            | COVERED | Phase 2, T012-T014            |
| FR-006 JSONL logging                    | COVERED | Phase 1, T008                 |
| FR-007 Project-wide storage             | COVERED | Phase 1, T003                 |
| FR-008 Priority-sorted injection        | COVERED | Phase 2, T015-T016            |
| FR-009-012 Memory hooks                 | COVERED | Phase 3, T020-T024            |
| FR-013-016 Journey confirmation         | COVERED | Phase 4, T026-T033            |
| FR-017-020 Variant generation           | COVERED | Phase 5, T034-T041            |
| FR-021-025 Sequence diagrams            | COVERED | Phase 6, T042-T055            |
| NFR-VS1-4 Vertical slices               | COVERED | All phases include all layers |

**Coverage**: 100% of user stories, 100% of functional requirements

---

## Notes

- All phases are designed as vertical slices: each includes data, backend, and
  UI/output layers
- Each phase can be deployed and tested independently
- Each phase builds on previous phases
- Each phase delivers visible, demonstrable value
- Memory storage is project-wide in `.specify/memory/`
- Journey/diagram artifacts are per-feature in `.specify/specs/{feature}/`
