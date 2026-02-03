---
feature: Consultative Business Discovery
spec: spec.md
research: research.md
status: ready
created: '2026-01-25'
---

# Implementation Plan: Consultative Business Discovery

**Branch**: `013-consultative-business-discovery` | **Date**: 2026-01-25 |
**Spec**: [spec.md](./spec.md)

## Summary

Transform `/0_business_scenario` from a simple routing command into a
consultative discovery experience. The AI agent will conduct a structured
interview to understand business context before routing users to the Gofer
pipeline. Discovery findings are persisted both as a `discovery.md` artifact and
as discrete Memory entries for intelligent context loading throughout the
pipeline.

## Technical Context

**Language/Version**: TypeScript 5.7.2 / Markdown (Claude commands) **Primary
Dependencies**: AskUserQuestion tool (Claude Code), MemoryManager **Storage**:
File-based (discovery.md) + Memory system (MemoryManager.ts) **Testing**: Vitest
for unit tests **Target Platform**: Claude Code CLI / VSCode Extension **Project
Type**: Single project (Claude command enhancement) **Performance Goals**:
Discovery flow completes in 3-5 questions for typical scenarios **Constraints**:
Command file size limits, context window efficiency, backward compatibility

## Constitution Check

_GATE: Validated against `.specify/memory/constitution.md`_

| Principle                       | Alignment      | Notes                                            |
| ------------------------------- | -------------- | ------------------------------------------------ |
| I. Test-Driven Development      | COMPLIANT      | Unit tests for discovery flow logic              |
| II. MCP-First Architecture      | NOT APPLICABLE | Claude command, not MCP tool                     |
| III. Spec Kit Format Compliance | COMPLIANT      | discovery.md uses YAML frontmatter               |
| IV. Strict TypeScript           | COMPLIANT      | Memory integration uses TypeScript               |
| V. Security by Default          | COMPLIANT      | No secrets, input validation via AskUserQuestion |
| VI. Performance Requirements    | COMPLIANT      | Discovery <5 questions, Memory ops non-blocking  |
| VII. 80% Test Coverage          | COMPLIANT      | Test coverage for memory integration             |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/013-consultative-business-discovery/
├── spec.md              # Feature specification
├── research.md          # Codebase research
├── plan.md              # This file
├── tasks.md             # Task breakdown (next stage)
├── issues.md            # GitHub issues (next stage)
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (implementation targets)

```text
.claude/commands/
├── 0_business_scenario.md    # PRIMARY: Add discovery phase before routing

.specify/templates/
└── discovery-template.md     # NEW: Template for discovery.md artifact

extension/src/autonomous/
├── MemoryManager.ts          # EXISTING: Add discovery memory helpers
└── ContextBuilder.ts         # EXISTING: Load discovery context

extension/resources/claude-commands/
└── 0_business_scenario.md    # SYNC: Keep bundled copy in sync
```

## Architecture

### Discovery Flow

```text
User starts /0_business_scenario
           │
           ▼
    ┌──────────────────┐
    │ Step 0: Workspace│
    │ Scan (existing)  │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ NEW: Step 1.5    │
    │ Discovery Phase  │
    │                  │
    │ - Problem?       │
    │ - Users?         │
    │ - Value?         │
    │ - Metrics?       │
    │ - (Competitive?) │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Save discovery.md│
    │ + Memory entries │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Step 2: Route to │
    │ Pipeline Stage   │
    └──────────────────┘
```

### Question Flow Pattern

Each discovery question follows the established speckit.clarify.md pattern:

```markdown
**What we need to know**: [Question]

**Recommended:** Option [X] - [Brief reasoning]

| Option | Answer           | Implications      |
| ------ | ---------------- | ----------------- |
| A      | [Answer A]       | [What this means] |
| B      | [Answer B]       | [What this means] |
| Custom | Provide your own | [How to provide]  |

You can reply with the option letter, accept the recommendation by saying "yes",
or provide your own answer.
```

### Memory Integration

Discovery findings are stored using dual persistence:

1. **discovery.md** - Full structured document for human reading
2. **Memory entries** - Discrete facts for intelligent retrieval

```typescript
// Memory entry structure for discovery
{
  category: 'discovery',
  tags: ['#problem', '#feature-{id}'],
  content: 'Problem: [pain point]. Impact: [who affected].',
  learnedFrom: 'consultative_discovery'
}
```

## Integration Points

| Component            | File                                         | Integration Type             |
| -------------------- | -------------------------------------------- | ---------------------------- |
| Orchestrator Command | `.claude/commands/0_business_scenario.md`    | Direct edit                  |
| Memory System        | `extension/src/autonomous/MemoryManager.ts`  | API calls                    |
| Context Builder      | `extension/src/autonomous/ContextBuilder.ts` | Memory loading               |
| Research Command     | `.claude/commands/1_gofer_research.md`       | Pass discovery context       |
| Specify Command      | `.claude/commands/2_gofer_specify.md`        | Auto-populate from discovery |
| Bundled Commands     | `extension/resources/claude-commands/`       | Sync after changes           |

## Key Dependencies

- `AskUserQuestion` tool - Used in Claude commands for structured questions
- `MemoryManager.save()` - Store discrete discovery facts
- `MemoryManager.loadByPriority()` - Retrieve relevant memories
- `ContextBuilder.loadRelevantMemories()` - Load discovery context

## Implementation Phases

### Phase 1: Setup & Templates

**Goal**: Create discovery artifact template and update orchestrator structure

**Tasks**:

- [ ] Create `.specify/templates/discovery-template.md` with YAML frontmatter
      and sections
- [ ] Add discovery phase placeholder in `0_business_scenario.md`
- [ ] Add "Skip Discovery" option to initial routing

**Verification**:

- [ ] Template follows spec.md artifact conventions
- [ ] Orchestrator structure prepared for discovery phase

### Phase 2: Core Discovery Questions

**Goal**: Implement the consultative question flow

**Tasks**:

- [ ] Implement Problem Discovery question (FR-001, FR-002, FR-003)
- [ ] Implement User Segmentation question
- [ ] Implement Value Proposition question
- [ ] Implement Success Metrics question
- [ ] Add optional Competitive Research offer (FR-007)

**Verification**:

- [ ] Each question uses AskUserQuestion with options table
- [ ] AI recommendations provided for each question
- [ ] "yes"/"recommended" shortcuts work

### Phase 3: Adaptive Depth & Flow Control

**Goal**: Implement adaptive depth detection and flow control

**Tasks**:

- [ ] Detect uncertainty signals ("I'm not sure", "what would you suggest?")
- [ ] Offer deeper exploration when uncertainty detected
- [ ] Implement smooth flow from question to question
- [ ] Handle mid-flow abandonment (save partial discovery.md)

**Verification**:

- [ ] Adaptive depth triggers correctly
- [ ] Partial discovery saved on abandonment

### Phase 4: Discovery Artifact Creation

**Goal**: Generate discovery.md from responses

**Tasks**:

- [ ] Generate discovery.md with all sections from template
- [ ] Populate Problem Statement from responses
- [ ] Populate Target Users section
- [ ] Populate Value Proposition and Success Metrics
- [ ] Handle Competitive Analysis (researched/skipped)

**Verification**:

- [ ] discovery.md follows template structure
- [ ] All sections populated correctly

### Phase 5: Memory Persistence

**Goal**: Store discovery findings as Memory entries

**Tasks**:

- [ ] Create Memory entry for problem statement (FR-005)
- [ ] Create Memory entry for target users
- [ ] Create Memory entry for value proposition
- [ ] Add appropriate tags for retrieval (#discovery, #feature-{id})

**Verification**:

- [ ] Memory entries created with correct category
- [ ] Tags enable relevance-based retrieval

### Phase 6: Pipeline Integration

**Goal**: Connect discovery to downstream stages

**Tasks**:

- [ ] Update `/1_gofer_research` to load discovery context (FR-010)
- [ ] Update `/2_gofer_specify` to auto-populate from discovery (FR-009)
- [ ] Ensure ContextBuilder loads discovery memories
- [ ] Handle re-running discovery (merge vs replace)

**Verification**:

- [ ] Research command uses discovery context
- [ ] Specify command pre-fills sections from discovery

### Phase 7: Sync & Polish

**Goal**: Finalize and sync all command files

**Tasks**:

- [ ] Sync `0_business_scenario.md` to `extension/resources/claude-commands/`
      (FR-008)
- [ ] Sync any modified research/specify commands
- [ ] Add error handling for edge cases
- [ ] Final integration testing

**Verification**:

- [ ] Bundled commands match source
- [ ] Full flow works end-to-end

## File Structure

```text
.claude/commands/
└── 0_business_scenario.md    # Modified - adds discovery phase

.specify/
├── templates/
│   └── discovery-template.md # New - discovery artifact template
└── specs/{feature}/
    └── discovery.md          # Created per feature during discovery

extension/
├── src/autonomous/
│   ├── MemoryManager.ts      # Potentially add helper methods
│   └── ContextBuilder.ts     # May need discovery-aware loading
└── resources/claude-commands/
    └── 0_business_scenario.md # Sync copy
```

## Risk Assessment

| Risk                                | Impact | Mitigation                               |
| ----------------------------------- | ------ | ---------------------------------------- |
| Command file size limits            | Medium | Keep questions concise, use templates    |
| Context window bloat from discovery | Medium | Store in Memory for selective loading    |
| Users always skip discovery         | Medium | Make discovery valuable, show benefits   |
| Question flow feels repetitive      | Low    | Provide recommendations, allow shortcuts |

## Spec Traceability

### User Story Coverage

| Story                       | Priority | Plan Phase(s) | Components                           |
| --------------------------- | -------- | ------------- | ------------------------------------ |
| US1 - Problem Discovery     | P1       | Phase 2       | 0_business_scenario.md               |
| US2 - User Segmentation     | P1       | Phase 2       | 0_business_scenario.md               |
| US3 - Value Proposition     | P1       | Phase 2, 4    | 0_business_scenario.md, discovery.md |
| US4 - Competitive Landscape | P2       | Phase 2       | 0_business_scenario.md               |
| US5 - Adaptive Depth        | P2       | Phase 3       | 0_business_scenario.md               |
| US6 - Memory Persistence    | P2       | Phase 5, 6    | MemoryManager.ts, ContextBuilder.ts  |
| US7 - Skip Discovery        | P3       | Phase 1       | 0_business_scenario.md               |

### Requirement Coverage

| Requirement | Plan Phase | Implementation Approach                        |
| ----------- | ---------- | ---------------------------------------------- |
| FR-001      | Phase 2    | AskUserQuestion with options tables            |
| FR-002      | Phase 2    | Add "Recommended:" prefix with reasoning       |
| FR-003      | Phase 2    | Accept "yes"/"recommended" shortcuts           |
| FR-004      | Phase 4    | Write discovery.md with YAML frontmatter       |
| FR-005      | Phase 5    | MemoryManager.save() with category 'discovery' |
| FR-006      | Phase 1    | Add "Skip Discovery" option                    |
| FR-007      | Phase 3    | Detect uncertainty, offer deeper questions     |
| FR-008      | Phase 7    | Copy to extension/resources/claude-commands/   |
| FR-009      | Phase 6    | Load discovery.md in specify command           |
| FR-010      | Phase 6    | Pass discovery context to research command     |

**Coverage**: 7/7 user stories, 10/10 functional requirements

## Notes

- Discovery questions should be written for Product Managers (non-technical)
- Each question must include concrete examples to choose from
- AI recommendations should explain the reasoning briefly (1-2 sentences)
- Memory entries enable "memory-first loading" pattern for efficiency
- Backward compatibility maintained via "Skip Discovery" option
