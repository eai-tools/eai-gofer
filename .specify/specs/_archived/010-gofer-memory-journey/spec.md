---
id: 010-gofer-memory-journey
title: Gofer Memory and Journey System
status: draft
created: '2026-01-19'
updated: '2026-01-19'
author: Claude
---

# Gofer Memory and Journey System

## Overview

Enhance the Gofer pipeline with three interconnected capabilities that improve
agent intelligence and user-centered design:

1. **Agentic Memory System** - Continuous memory storage/retrieval with
   priority-based retention and citation verification
2. **Interactive Customer Journey Mapping** - Confirm user journeys
   interactively, then generate industry variants for innovation discovery
3. **Multi-Option Sequence Diagrams** - Generate 5 implementation options
   spanning the efficiency-to-innovation spectrum

**Research Reference**: See `research.md` for codebase analysis, technology
decisions, and integration points.

---

## User Scenarios & Testing

### User Story 1 - Agentic Memory Storage and Retrieval (Priority: P1)

As a developer using Gofer, I want the agent to remember patterns, decisions,
and constraints learned during sessions so that it doesn't repeat mistakes and
consistently applies project conventions.

**Why this priority**: Memory is foundational - both journey mapping and
sequence diagrams benefit from accumulated knowledge about the codebase and user
preferences.

**Independent Test**: Can be fully tested by performing a multi-step coding
task, verifying memories are stored, then starting a new session and confirming
memories influence decisions.

**Acceptance Scenarios**:

1. **Given** agent completes a task using a specific pattern, **When** a similar
   task arises later, **Then** the agent retrieves and applies the learned
   pattern with citation
2. **Given** a memory has been used in 5+ agent decisions, **When** context is
   built, **Then** that memory appears before lower-priority memories
3. **Given** a memory's cited code location has changed, **When** memory is
   retrieved, **Then** the agent verifies the citation and updates or flags the
   memory
4. **Given** agent makes a decision, **When** memory is retrieved for context
   injection, **Then** priority index does NOT increment (only increments on
   actual decision use or update)

---

### User Story 2 - Interactive Journey Confirmation (Priority: P2)

As a product owner, I want to confirm the customer journey interactively at the
start of feature development so that the implementation aligns with actual user
needs.

**Why this priority**: Journey confirmation ensures subsequent planning and
implementation target real user value. Must happen before variant generation.

**Independent Test**: Can be tested by running `/0_business_scenario`, receiving
journey confirmation prompts via `AskUserQuestion`, and verifying the confirmed
journey is stored.

**Acceptance Scenarios**:

1. **Given** user starts `/0_business_scenario`, **When** feature involves user
   interaction, **Then** system presents journey confirmation using
   `AskUserQuestion` with actors and flow
2. **Given** user confirms or modifies journey, **When** confirmation is
   complete, **Then** journey is saved to
   `.specify/specs/{feature}/journeys/base-journey.md`
3. **Given** journey identifies multiple actors (users, agents, systems),
   **When** journey is saved, **Then** each actor type is clearly documented
   with their role

---

### User Story 3 - Journey Variant Generation (Priority: P2)

As an innovation lead, I want to see how similar journeys work across different
industries so that I can discover innovative approaches for my feature.

**Why this priority**: Industry variants provide cross-pollination of ideas.
Depends on base journey being confirmed first.

**Independent Test**: Can be tested by completing journey confirmation then
verifying random(10,50) variants are generated across 10 industries.

**Acceptance Scenarios**:

1. **Given** base journey is confirmed, **When** `/1_gofer_research` runs,
   **Then** system generates a random number (10-50) of industry variants
2. **Given** variants are generated, **When** reviewing output, **Then**
   variants span 10 industries: retail, healthcare, finance, education,
   hospitality, logistics, manufacturing, legal, real_estate, entertainment
3. **Given** variant generation completes, **When** reviewing storage, **Then**
   variants are saved to
   `.specify/specs/{feature}/journeys/variants/{industry}-{number}.md`

---

### User Story 4 - Multi-Option Sequence Diagrams (Priority: P3)

As an architect, I want to see 5 implementation options with different
trade-offs so that I can choose the approach that best fits project constraints.

**Why this priority**: Sequence diagram options help make informed architectural
decisions. Can be generated once spec is taking shape.

**Independent Test**: Can be tested by completing journey confirmation and
verifying 5 distinct sequence diagram options are generated with Mermaid
diagrams and cost/complexity scores.

**Acceptance Scenarios**:

1. **Given** journey is confirmed, **When** `/2_gofer_specify` runs, **Then** 5
   sequence diagram options are generated
2. **Given** options are generated, **When** reviewing them, **Then** they span
   the spectrum: Minimal (95% efficiency), Efficient (80%), Standard (60%),
   Enhanced (40%), Innovative (20% efficiency/95% innovation)
3. **Given** each option is generated, **When** reviewing content, **Then** it
   includes: Mermaid sequence diagram, actor inventory, Gen AI touchpoints,
   efficiency/complexity/innovation scores, estimated effort
4. **Given** user selects an option, **When** selection is confirmed, **Then**
   selected approach is saved to
   `.specify/specs/{feature}/sequence-diagrams/selected-option.md`

---

### User Story 5 - Memory Priority and Surfacing (Priority: P1)

As a developer, I want frequently-used and recently-updated memories to surface
first so that the most relevant knowledge influences agent decisions.

**Why this priority**: Core to the priority-based retention system. Replaces
TTL-based expiration with value-based surfacing.

**Independent Test**: Can be tested by creating multiple memories, using some in
decisions, updating others, then verifying priority order matches expected
ranking.

**Acceptance Scenarios**:

1. **Given** memory A has priorityIndex 5 and memory B has priorityIndex 2,
   **When** context is built, **Then** memory A appears before memory B
2. **Given** memory is used in an agent decision, **When** decision completes,
   **Then** memory's priorityIndex and decisionUseCount increment by 1
3. **Given** memory content is updated, **When** update completes, **Then**
   memory's priorityIndex and updateCount increment by 1
4. **Given** memory is retrieved for context injection only, **When** injection
   completes, **Then** priorityIndex does NOT change

---

### User Story 6 - Project-Wide Memory Sharing (Priority: P2)

As a team member, I want memories to be shared across all features in the
project so that learnings from one feature benefit others.

**Why this priority**: Cross-feature learning maximizes value of accumulated
knowledge.

**Independent Test**: Can be tested by storing a memory during feature A, then
verifying it's accessible during feature B development.

**Acceptance Scenarios**:

1. **Given** memory is stored during feature-001 work, **When** working on
   feature-002, **Then** the memory is available in context
2. **Given** memories are stored, **When** checking storage location, **Then**
   they reside in `.specify/memory/agentic-memories.json` (project-wide)
3. **Given** memory notes exist, **When** checking storage, **Then**
   human-readable notes are in `.specify/memory/memory-notes/{uuid}.md`

---

### Edge Cases

- What happens when memory citations point to deleted files? → Flag memory as
  unverified, suggest review
- How does system handle conflicting memories? → Higher priority wins; agent
  notes conflict in decision log
- What if user modifies base journey after variants are generated? → Warn user,
  offer to regenerate variants
- What happens when context window is too full for all high-priority memories? →
  Truncate at context limit, log which memories were excluded
- How to handle variant generation timeout? → Generate minimum 10, log partial
  completion

---

## Requirements

### Functional Requirements

#### Agentic Memory System

- **FR-001**: System MUST extend existing Memory interface with `AgenticMemory`
  adding: citations, verified, verifiedAt, confidence, memoryType,
  priorityIndex, decisionUseCount, updateCount
- **FR-002**: System MUST store memories in hybrid format:
  `agentic-memories.json` (structured) + `memory-notes/{uuid}.md`
  (human-readable)
- **FR-003**: System MUST increment priorityIndex when memory is used in an
  agent decision (+1) or updated (+1)
- **FR-004**: System MUST NOT increment priorityIndex when memory is retrieved
  for context injection (prevents feedback loops)
- **FR-005**: System MUST verify memory citations just-in-time before applying,
  following GitHub Copilot pattern
- **FR-006**: System MUST log all memory operations to
  `.specify/memory/memory-log.jsonl` in JSONL format
- **FR-007**: System MUST store memories project-wide in `.specify/memory/`
  accessible to all features
- **FR-008**: System MUST sort memories by priorityIndex (descending) when
  injecting into agent context

#### Memory Operation Hooks

- **FR-009**: System MUST check relevant memories before tool calls
- **FR-010**: System MUST store learnings after task completion
- **FR-011**: System MUST store error recovery patterns on error recovery
- **FR-012**: System MUST store user preferences on clarification

#### Interactive Journey Mapping

- **FR-013**: System MUST present journey confirmation using `AskUserQuestion`
  tool in `/0_business_scenario`
- **FR-014**: System MUST identify and document actors (users, AI agents,
  systems) in confirmed journey
- **FR-015**: System MUST store confirmed journey to
  `.specify/specs/{feature}/journeys/base-journey.md`
- **FR-016**: System MUST support journey modification before final confirmation

#### Journey Variant Generation

- **FR-017**: System MUST generate a random count between 10-50 journey variants
  each time `/1_gofer_research` runs
- **FR-018**: System MUST distribute variants proportionally across 10
  industries: retail, healthcare, finance, education, hospitality, logistics,
  manufacturing, legal, real_estate, entertainment
- **FR-019**: System MUST store variants in
  `.specify/specs/{feature}/journeys/variants/{industry}-{number}.md`
- **FR-020**: System MUST include innovation insights from each industry variant

#### Multi-Option Sequence Diagrams

- **FR-021**: System MUST generate 5 sequence diagram options in
  `/2_gofer_specify`
- **FR-022**: Each option MUST include: Mermaid sequence diagram, actor/system
  inventory, Gen AI touchpoints, efficiency/complexity/innovation scores
- **FR-023**: Options MUST span spectrum: Minimal (95% efficiency/10%
  innovation), Efficient (80%/30%), Standard (60%/50%), Enhanced (40%/70%),
  Innovative (20%/95%)
- **FR-024**: System MUST store options in
  `.specify/specs/{feature}/sequence-diagrams/option-{N}-{name}.md`
- **FR-025**: System MUST store user's selected option as `selected-option.md`

### Key Entities

- **AgenticMemory**: Extended memory entity with citations, priority tracking,
  and verification status. Key attributes: id, category, tags, scope, content,
  citations[], verified, verifiedAt, confidence, memoryType, priorityIndex,
  decisionUseCount, updateCount
- **Citation**: Code reference with change detection. Key attributes: file,
  line, snippet, hash
- **Journey**: Customer/user journey with actors and flow. Key attributes: name,
  actors[], steps[], touchpoints[]
- **JourneyVariant**: Industry-adapted journey variant. Key attributes:
  baseJourneyId, industry, adaptations[], innovations[]
- **SequenceDiagramOption**: Implementation approach with trade-offs. Key
  attributes: optionNumber, name, mermaidDiagram, actors[], efficiencyScore,
  complexityScore, innovationScore, estimatedEffort, risks[]

---

## Non-Functional Requirements

### Vertical Slice Delivery (Agile Iterations)

All implementation phases MUST follow vertical slice principles:

- **NFR-VS1**: Each iteration MUST include frontend + backend + database changes
  as needed
- **NFR-VS2**: Each iteration MUST be deployable and independently testable
- **NFR-VS3**: Each iteration MUST build on previous iterations (incremental)
- **NFR-VS4**: Each iteration MUST deliver visible, demonstrable value to users

This ensures the Gofer pipeline produces truly agile deliverables rather than
horizontal layers.

### Performance

- Memory retrieval MUST complete within 100ms for up to 1000 memories
- Citation verification MUST be cached to avoid repeated file reads
- Variant generation MUST complete within 60 seconds for maximum 50 variants
- Context injection MUST select top-N memories within context budget

### Observability

- All memory operations MUST be logged to JSONL for analysis
- Memory usage metrics MUST be available via council status command
- Priority index distribution MUST be inspectable

### Compatibility

- MUST extend existing MemoryManager without breaking current API
- MUST follow existing YAML config pattern with file watching
- MUST integrate with existing AskUserQuestion tool flow
- MUST store artifacts alongside existing spec artifacts

---

## Success Criteria

| Metric                                | Target                        | Measurement                                      |
| ------------------------------------- | ----------------------------- | ------------------------------------------------ |
| Memory retrieval influences decisions | 80%+ of relevant sessions     | Count sessions where stored memories are applied |
| Journey confirmation adoption         | 100% of new features          | Count features with base-journey.md              |
| Variant generation coverage           | 10 industries per feature     | Count distinct industries in variants            |
| Sequence diagram selection            | 1 option selected per feature | Count features with selected-option.md           |
| Memory citation accuracy              | 90%+ valid citations          | Verification pass rate                           |
| Context injection efficiency          | Top memories by priority      | Verify sorting order in logs                     |

---

## Assumptions

- Existing MemoryManager API (`save`, `search`, `forget`, `clear`, `load`,
  `recordUsage`) will remain stable
- Context window limits will be managed by selective memory injection (from
  research constraints)
- LLM can generate meaningful industry variants with quality filtering (from
  research)
- Users will engage with AskUserQuestion prompts for journey confirmation
- Mermaid diagrams will render in VS Code, GitHub, and documentation tools
- File system performance is sufficient for JSON rewrite (chosen over
  append-only for queryability)

---

## Dependencies

- `extension/src/autonomous/MemoryManager.ts` - Extend for AgenticMemory
  patterns
- `extension/src/autonomous/memory.ts` - Extend Memory interface
- `extension/src/autonomous/ContextBuilder.ts` - Modify for priority-sorted
  injection
- `extension/src/council/ConfigLoader.ts` - Pattern for YAML config with file
  watching
- `extension/src/council/UsageLogger.ts` - Pattern for JSONL logging
- `.github/prompts/0_business_scenario.prompt.md` - Add journey confirmation
  step
- `.github/prompts/1_gofer_research.prompt.md` - Add variant generation
- `.github/prompts/2_gofer_specify.prompt.md` - Add sequence diagram options
- `.github/prompts/3_gofer_plan.prompt.md` - Add multi-option architecture
  support

---

## Out of Scope

- Vector database for memory storage (hybrid JSON/MD is sufficient for local
  storage)
- Cross-repository memory sharing (memories stay within project)
- TTL-based memory expiration (replaced by priority-based surfacing)
- Automatic journey generation without user confirmation
- More than 5 sequence diagram options (avoids decision paralysis)
- Real-time collaborative editing of journeys

---

## Glossary

| Term                      | Definition                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| AgenticMemory             | Extended memory with citations, verification, and priority tracking for AI agent use          |
| Citation                  | Reference to a specific code location with hash for change detection                          |
| Priority Index            | Score that determines memory surfacing order; increments on decision use (+1) and update (+1) |
| Journey Variant           | Adaptation of base customer journey to a different industry context                           |
| Sequence Diagram Option   | One of 5 implementation approaches with trade-off scores                                      |
| Just-in-time Verification | Validating memory citations immediately before applying them                                  |

---

## Research Traceability

| Research Finding                      | Spec Section        | Reference              |
| ------------------------------------- | ------------------- | ---------------------- |
| MemoryManager extension point         | Dependencies        | FR-001, FR-002         |
| Memory interface in memory.ts         | Dependencies        | FR-001                 |
| ContextBuilder integration            | Dependencies        | FR-008                 |
| YAML config pattern                   | Assumptions         | ConfigLoader.ts        |
| JSONL logging pattern                 | FR-006              | UsageLogger.ts         |
| AskUserQuestion pattern               | FR-013              | 0_business_scenario.md |
| GitHub Copilot verification           | FR-005              | External Research      |
| Context window limits constraint      | Assumptions         | Constraints section    |
| Journey generation quality constraint | Assumptions         | Constraints section    |
| Mermaid rendering support             | FR-022, Assumptions | Technology Decisions   |
| Priority index over TTL decision      | FR-003, FR-004      | User clarification     |
| Random 10-50 variant count            | FR-017              | User clarification     |
| Cost/complexity in diagrams           | FR-022              | User clarification     |
| Project-wide memory sharing           | FR-007              | User clarification     |
