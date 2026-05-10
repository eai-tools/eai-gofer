# GitHub Issues: Consultative Business Discovery

Generated: 2026-01-25

## Issue 1: Setup Discovery Phase Infrastructure

**Title**: [013] Setup discovery template and orchestrator structure

**Labels**: `enhancement`, `priority:high`, `phase:setup`

**Description**: Create the foundational infrastructure for the consultative
business discovery feature.

### Tasks

- [ ] Create `.specify/templates/discovery-template.md` with YAML frontmatter
      and structured sections
- [ ] Add discovery phase placeholder in
      `.claude/commands/0_business_scenario.md`
- [ ] Add "Skip Discovery" option to initial routing

### Acceptance Criteria

- Discovery template follows spec.md artifact conventions
- Orchestrator structure prepared for discovery phase
- Skip option visible in initial prompt

### Related

- Spec: US7 (Skip Discovery Option)
- FR-006 (Backward compatibility)

---

## Issue 2: Implement Problem Discovery Question (P1)

**Title**: [013] Implement Problem Discovery question with AI recommendations

**Labels**: `enhancement`, `priority:critical`, `phase:mvp`, `user-story:US1`

**Description**: Implement the first consultative question asking users about
the problem they're solving. This is P1 priority and part of the MVP.

### Tasks

- [ ] Implement Problem Discovery question with AskUserQuestion options table
- [ ] Add AI recommendation with reasoning (format:
      `**Recommended:** Option [X] - <reasoning>`)
- [ ] Implement "yes"/"recommended" shortcut acceptance logic
- [ ] Create Problem Statement section writer for discovery.md

### Acceptance Criteria

- [ ] Given user selects "New Feature", AI asks "What problem are you trying to
      solve?" with options
- [ ] Given user provides problem description, discovery.md is created with
      Problem Statement section
- [ ] Given AI presents options, a recommended option is shown with reasoning
- [ ] Given user responds "yes" or "recommended", AI accepts the recommendation

### Related

- Spec: US1 (Problem Discovery Interview)
- FR-001, FR-002, FR-003, FR-004

---

## Issue 3: Implement User Segmentation Question (P1)

**Title**: [013] Implement User Segmentation question with persona options

**Labels**: `enhancement`, `priority:critical`, `phase:mvp`, `user-story:US2`

**Description**: Implement the user segmentation question asking about primary
users and their technical expertise.

### Tasks

- [ ] Implement User Segmentation question with persona options
- [ ] Add AI recommendation for user type based on problem context
- [ ] Create Target Users section writer for discovery.md
- [ ] Handle custom user description input

### Acceptance Criteria

- [ ] Given problem discovery is complete, AI asks "Who are the primary users?"
- [ ] Given user selects persona type, Target Users section is populated
- [ ] Given user describes custom users, custom persona is captured

### Related

- Spec: US2 (User Segmentation Discovery)
- FR-001, FR-002, FR-004

---

## Issue 4: Implement Value Proposition and Metrics Questions (P1)

**Title**: [013] Implement Value Proposition and Success Metrics questions

**Labels**: `enhancement`, `priority:critical`, `phase:mvp`, `user-story:US3`

**Description**: Implement questions about value delivery and success metrics
measurement.

### Tasks

- [ ] Implement Value Proposition question with value types
- [ ] Implement Success Metrics question with metric categories
- [ ] Add AI-suggested metrics based on value type selected
- [ ] Create Value Proposition and Success Metrics sections in discovery.md

### Acceptance Criteria

- [ ] Given user segmentation is complete, AI asks "What specific value should
      this deliver?"
- [ ] Given user selects value type, Value Proposition section is populated
- [ ] Given value type is selected, relevant success metrics are suggested
- [ ] Given metrics are captured, Success Metrics section contains quantified
      targets

### Related

- Spec: US3 (Value Proposition and Metrics Discovery)
- FR-001, FR-002, FR-004

---

## Issue 5: Implement Optional Competitive Research (P2)

**Title**: [013] Add optional competitive landscape analysis

**Labels**: `enhancement`, `priority:medium`, `user-story:US4`

**Description**: Add an optional step offering to research how leading companies
solve the problem.

### Tasks

- [ ] Add optional Competitive Research offer in discovery flow
- [ ] Implement skip logic that marks "Competitive Analysis: Skipped"
- [ ] Create Competitive Analysis section writer with insights table
- [ ] Document differentiation opportunities

### Acceptance Criteria

- [ ] Given problem is described, competitive research is offered as optional
      step
- [ ] Given user requests competitive research, web search is offered
- [ ] Given user skips, discovery.md marks "Competitive Analysis: Skipped"
- [ ] Given competitive insights are gathered, differentiation opportunities are
      documented

### Related

- Spec: US4 (Competitive Landscape Analysis)
- FR-001, FR-004

---

## Issue 6: Implement Adaptive Depth Detection (P2)

**Title**: [013] Detect uncertainty and offer deeper exploration

**Labels**: `enhancement`, `priority:medium`, `user-story:US5`

**Description**: Implement adaptive depth detection that offers deeper questions
when users seem uncertain.

### Tasks

- [ ] Implement uncertainty detection (phrases: "I'm not sure", "what would you
      suggest?")
- [ ] Add deeper question offering when uncertainty detected
- [ ] Implement scope complexity detection (multiple user types, integrations)
- [ ] Handle smooth flow when no uncertainty

### Acceptance Criteria

- [ ] Given user responds with uncertainty, deeper questions are offered
- [ ] Given scope involves multiple user types, additional segmentation
      questions offered
- [ ] Given discovery is proceeding smoothly, AI proceeds without unnecessary
      depth
- [ ] Given adaptive depth triggers, additional context-appropriate questions
      asked

### Related

- Spec: US5 (Adaptive Depth Detection)
- FR-007

---

## Issue 7: Implement Memory Persistence for Discovery (P2)

**Title**: [013] Store discovery findings as Memory entries for pipeline context

**Labels**: `enhancement`, `priority:medium`, `user-story:US6`

**Description**: Store discovery findings as retrievable Memory entries so
subsequent pipeline stages have intelligent access to business context.

### Tasks

- [ ] Create Memory entry for problem statement using MemoryManager.save()
- [ ] Create Memory entry for target users with tags
- [ ] Create Memory entry for value proposition and metrics
- [ ] Update /1_gofer_research to load discovery context
- [ ] Update /2_gofer_specify to auto-populate from discovery Memory

### Acceptance Criteria

- [ ] Given discovery is complete, Memory entries are created (category:
      'discovery')
- [ ] Given Memory entries are created, /1_gofer_research loads discovery
      context
- [ ] Given Memory entries exist, /2_gofer_specify auto-populates spec sections
- [ ] Given Memory entries have tags, ContextBuilder uses for relevance scoring

### Related

- Spec: US6 (Memory Persistence for Pipeline Context)
- FR-005, FR-009, FR-010

---

## Issue 8: Implement Skip Discovery Option (P3)

**Title**: [013] Allow users to skip discovery and go straight to routing

**Labels**: `enhancement`, `priority:low`, `user-story:US7`

**Description**: Ensure experienced users with clear requirements can skip the
discovery phase entirely.

### Tasks

- [ ] Ensure "Skip Discovery" option visible in initial prompt
- [ ] Implement skip logic that bypasses all discovery questions
- [ ] Verify no discovery.md artifact created when skipped

### Acceptance Criteria

- [ ] Given user starts orchestrator, "Skip Discovery" option is available
- [ ] Given user selects "Skip Discovery", standard routing proceeds
- [ ] Given user skips, no discovery.md artifact exists

### Related

- Spec: US7 (Skip Discovery Option)
- FR-006

---

## Issue 9: Polish and Sync Commands

**Title**: [013] Polish discovery flow and sync bundled commands

**Labels**: `enhancement`, `priority:medium`, `phase:polish`

**Description**: Finalize the discovery flow, handle edge cases, and sync all
modified commands to bundled copies.

### Tasks

- [ ] Sync 0_business_scenario.md to extension/resources/claude-commands/
- [ ] Sync modified /1_gofer_research.md to bundled commands
- [ ] Sync modified /2_gofer_specify.md to bundled commands
- [ ] Handle mid-flow abandonment (save partial discovery.md)
- [ ] Handle re-run discovery on existing feature (merge vs replace)

### Acceptance Criteria

- All bundled commands in sync with source commands
- Partial discovery saved when user abandons mid-flow
- Re-running discovery prompts for merge or replace
- Full discovery flow works end-to-end

### Related

- FR-008 (Sync requirement)
- Edge cases from spec

---

## Summary

| Issue                | Priority      | User Story | Tasks     |
| -------------------- | ------------- | ---------- | --------- |
| Setup Infrastructure | High          | US7        | T001-T003 |
| Problem Discovery    | Critical (P1) | US1        | T004-T007 |
| User Segmentation    | Critical (P1) | US2        | T008-T011 |
| Value & Metrics      | Critical (P1) | US3        | T012-T015 |
| Competitive Research | Medium (P2)   | US4        | T016-T019 |
| Adaptive Depth       | Medium (P2)   | US5        | T020-T023 |
| Memory Persistence   | Medium (P2)   | US6        | T024-T028 |
| Skip Discovery       | Low (P3)      | US7        | T029-T031 |
| Polish & Sync        | Medium        | -          | T032-T036 |

**Total Issues**: 9 **Critical (MVP)**: 3 issues (Problem Discovery, User
Segmentation, Value & Metrics)
