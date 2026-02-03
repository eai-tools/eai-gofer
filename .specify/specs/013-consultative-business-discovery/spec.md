---
id: 013-consultative-business-discovery
title: Consultative Business Discovery
status: draft
created: '2026-01-25'
updated: '2026-01-25'
author: Claude
priority: high
---

# Consultative Business Discovery

## Overview

Transform the `/0_business_scenario` orchestrator from a simple routing command
into a consultative discovery experience. Before routing users to the Gofer
pipeline, the AI agent will conduct a structured interview to understand the
business context: what problem they're solving, who the users are, how
competitors approach it, what value should be delivered, and how success will be
measured.

Discovery findings are persisted both as a `discovery.md` artifact and as
discrete memory entries, enabling intelligent context loading throughout the
pipeline. Findings auto-populate into spec.md sections for seamless workflow.

**Research Reference**: See `research.md` for codebase analysis, existing
patterns, and integration points.

## User Stories

### User Story 1 - Problem Discovery Interview (Priority: P1)

As a **Product Manager starting a new feature**, I want the AI to **ask
consultative questions about the problem I'm solving** so that **the resulting
feature is grounded in real business needs rather than assumptions**.

**Why this priority**: This is the foundation - without understanding the
problem, all subsequent work may be misdirected. PMs often jump to solutions;
this ensures problem validation happens first.

**Independent Test**: Can be fully tested by starting `/0_business_scenario`,
selecting "New Feature", and verifying the AI asks about the problem before
asking for a feature name.

**Acceptance Criteria**:

- [ ] Given user selects "New Feature", when orchestrator starts, then AI asks
      "What problem are you trying to solve?" with example options
- [ ] Given user provides problem description, when AI processes response, then
      discovery.md is created with Problem Statement section
- [ ] Given AI presents options, when AI analyzes the context, then a
      recommended option is shown with reasoning
- [ ] Given user responds "yes" or "recommended", then AI accepts the
      recommendation without re-asking

### User Story 2 - User Segmentation Discovery (Priority: P1)

As a **Product Manager**, I want the AI to **ask who the primary users are and
their technical expertise** so that **the feature is designed for the right
audience with appropriate complexity**.

**Why this priority**: User segmentation directly impacts UX decisions,
documentation needs, and implementation approach. Critical for avoiding
mismatched solutions.

**Independent Test**: Can be tested by verifying the AI asks about users after
problem discovery, with options for different user types (external customers,
internal team, developers, business stakeholders).

**Acceptance Criteria**:

- [ ] Given problem discovery is complete, when flow continues, then AI asks
      "Who are the primary users of this feature?" with example personas
- [ ] Given user selects persona type, when AI processes response, then
      discovery.md Target Users section is populated
- [ ] Given user describes custom users, when AI processes response, then custom
      persona is captured in discovery.md

### User Story 3 - Value Proposition and Metrics Discovery (Priority: P1)

As a **Product Manager**, I want the AI to **ask what specific value this
feature should deliver and how to measure success** so that **the implementation
has clear, measurable goals from the start**.

**Why this priority**: Without clear value metrics, features drift in scope and
success is unmeasurable. This grounds all subsequent planning in quantifiable
outcomes.

**Independent Test**: Can be tested by verifying AI asks about value delivery
and presents metric categories (time savings, cost reduction, quality
improvement, user satisfaction).

**Acceptance Criteria**:

- [ ] Given user segmentation is complete, when flow continues, then AI asks
      "What specific value should this deliver?"
- [ ] Given user selects value type, when AI processes response, then
      discovery.md Value Proposition section is populated
- [ ] Given value type is selected, when AI continues, then relevant success
      metrics are suggested based on value type
- [ ] Given metrics are captured, when discovery completes, then discovery.md
      Success Metrics section contains quantified targets

### User Story 4 - Competitive Landscape Analysis (Priority: P2)

As a **Product Manager**, I want the AI to **offer to research how leading
companies solve this problem** so that **I can learn from existing solutions and
identify differentiation opportunities**.

**Why this priority**: Competitive analysis is valuable but optional - some
features are novel or internal-only. Making this suggested-but-skippable
respects user time while offering valuable research.

**Independent Test**: Can be tested by verifying AI offers competitive research
after problem discovery, and allows user to skip or accept.

**Acceptance Criteria**:

- [ ] Given problem is described, when AI presents options, then competitive
      research is offered as optional step
- [ ] Given user requests competitive research, when AI proceeds, then web
      search is offered for relevant competitors
- [ ] Given user skips competitive research, when flow continues, then
      discovery.md marks "Competitive Analysis: Skipped"
- [ ] Given competitive insights are gathered, when discovery completes, then
      differentiation opportunities are documented

### User Story 5 - Adaptive Depth Detection (Priority: P2)

As a **Product Manager unfamiliar with the problem space**, I want the AI to
**detect when I'm uncertain and offer deeper exploration** so that **I don't
miss critical context that would affect the feature**.

**Why this priority**: Adaptive depth prevents both over-questioning (wasting
time for clear requirements) and under-questioning (missing complexity for
unclear requirements).

**Independent Test**: Can be tested by responding "I'm not sure" or asking "what
do you recommend?" and verifying AI offers to go deeper.

**Acceptance Criteria**:

- [ ] Given user responds with uncertainty ("I'm not sure", "what would you
      suggest?"), when AI processes response, then deeper questions are offered
- [ ] Given scope involves multiple user types, when AI assesses complexity,
      then additional segmentation questions are offered
- [ ] Given discovery is proceeding smoothly, when all core questions are
      answered, then AI proceeds to routing without unnecessary depth
- [ ] Given adaptive depth triggers, when user accepts deeper exploration, then
      additional context-appropriate questions are asked

### User Story 6 - Memory Persistence for Pipeline Context (Priority: P2)

As a **developer implementing the feature**, I want **discovery findings to be
stored as retrievable memories** so that **subsequent pipeline stages have
intelligent access to business context**.

**Why this priority**: Memory persistence enables the "memory-first loading"
pattern, reducing context window usage and improving relevance throughout
implementation.

**Independent Test**: Can be tested by completing discovery, then verifying
Memory entries exist with category 'discovery' and appropriate tags.

**Acceptance Criteria**:

- [ ] Given discovery is complete, when findings are saved, then Memory entries
      are created for problem, users, and value
- [ ] Given Memory entries are created, when `/1_gofer_research` runs, then
      discovery context is loaded via MemoryManager
- [ ] Given Memory entries exist, when `/2_gofer_specify` runs, then spec.md
      sections are auto-populated from discovery
- [ ] Given discovery Memory entries have tags, when ContextBuilder loads
      context, then relevance scoring uses discovery tags

### User Story 7 - Skip Discovery Option (Priority: P3)

As an **experienced user with clear requirements**, I want to **skip the
discovery phase and go straight to routing** so that **I'm not forced through
unnecessary questions when I already know what I need**.

**Why this priority**: Backward compatibility and power-user efficiency. Some
users have clear specs already; forcing discovery would slow them down.

**Independent Test**: Can be tested by starting `/0_business_scenario` and
selecting a "Skip Discovery" option to proceed directly to routing.

**Acceptance Criteria**:

- [ ] Given user starts orchestrator, when options are presented, then "Skip
      Discovery" option is available
- [ ] Given user selects "Skip Discovery", when flow continues, then standard
      routing proceeds without discovery questions
- [ ] Given user skips discovery, when feature directory is created, then no
      discovery.md artifact exists

### Edge Cases

- What happens when user abandons discovery mid-flow? → Save partial
  discovery.md with status: 'incomplete'
- What happens when user re-runs discovery on existing feature? → Ask whether to
  merge or replace existing discovery
- What happens when discovery.md exists but is outdated? → Offer to refresh
  discovery or proceed with existing context
- What happens when web search fails during competitive research? → Continue
  without competitive analysis, log the failure

## Requirements

### Functional Requirements

- **FR-001**: System MUST present discovery questions using AskUserQuestion tool
  with options tables
- **FR-002**: System MUST provide AI recommendations for each question with
  reasoning (format: `**Recommended:** Option [X] - <reasoning>`)
- **FR-003**: System MUST accept "yes", "recommended", or "suggested" as
  shortcuts to accept AI recommendation
- **FR-004**: System MUST create `discovery.md` artifact in feature directory
  with structured sections
- **FR-005**: System MUST create Memory entries for key discovery findings
  (category: 'discovery')
- **FR-006**: System MUST preserve backward compatibility - skip discovery
  option available
- **FR-007**: System MUST detect uncertainty signals and offer deeper
  exploration
- **FR-008**: System MUST sync updated orchestrator to
  `extension/resources/claude-commands/`
- **FR-009**: System MUST auto-populate spec.md sections from discovery findings
  when `/2_gofer_specify` runs
- **FR-010**: System MUST pass discovery context to `/1_gofer_research` for
  focused exploration

### Key Entities

- **Discovery Session**: A completed discovery interview with problem, users,
  value, and optional competitive analysis
- **Discovery Finding**: A discrete piece of information (problem statement,
  user persona, value metric) stored as Memory
- **Discovery Artifact**: The `discovery.md` file containing full structured
  context

## Non-Functional Requirements

### Performance

- Discovery flow should complete in 3-5 questions for typical scenarios
  (balanced depth)
- Memory entry creation should not block user interaction
- Discovery.md should be saved atomically to prevent partial writes

### Compatibility

- Must work within existing Claude command prompt architecture (markdown-based)
- Must integrate with existing MemoryManager API without modifications
- Must follow existing AskUserQuestion patterns from 0_business_scenario.md

### Usability

- Questions must be written for non-technical Product Managers
- Options must include clear implications to aid decision-making
- AI recommendations must include brief reasoning (1-2 sentences)

## Success Criteria

| Metric                        | Target                                             | Measurement                                        |
| ----------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| Discovery completion rate     | >80% of new features go through discovery          | Count features with discovery.md vs total features |
| Question efficiency           | 3-5 questions for standard scenarios               | Count questions per discovery session              |
| Memory retrieval relevance    | Discovery memories appear in top 10 when relevant  | Track memory loading in ContextBuilder             |
| Spec auto-population accuracy | >90% of discovery findings correctly populate spec | Compare discovery.md to spec.md sections           |
| User satisfaction             | Users find discovery valuable (don't skip it)      | Track skip rate over time                          |

## Assumptions

- Users will engage with discovery questions rather than always skipping (based
  on PM interview patterns)
- AskUserQuestion tool is available in Claude Code environment
- Memory system has capacity for additional discovery entries
- Claude commands can be modified without breaking extension packaging

## Dependencies

- `extension/src/autonomous/MemoryManager.ts` - For Memory entry creation
- `extension/src/autonomous/ContextBuilder.ts` - For loading discovery context
- `.claude/commands/0_business_scenario.md` - Primary implementation target
- `extension/resources/claude-commands/` - Sync target for bundled commands
- Existing AskUserQuestion patterns from 0_business_scenario.md

## Out of Scope

- Automated competitive research (web search) - user must confirm before
  searching
- Multi-language discovery prompts (English only for initial implementation)
- Voice/audio input for discovery responses
- Integration with external PM tools (Jira, Linear, etc.)
- Real-time collaboration on discovery (single user flow only)

## Glossary

| Term               | Definition                                                                       |
| ------------------ | -------------------------------------------------------------------------------- |
| Discovery Session  | The complete consultative interview from first question to discovery.md creation |
| Adaptive Depth     | Logic that detects uncertainty and offers deeper exploration                     |
| Memory Entry       | A discrete piece of information stored via MemoryManager for retrieval           |
| Discovery Artifact | The `discovery.md` file containing full structured discovery findings            |
| Auto-populate      | Automatic transfer of discovery findings into spec.md sections                   |

## Research Traceability

| Research Finding                        | Spec Section                | Reference           |
| --------------------------------------- | --------------------------- | ------------------- |
| Sequential question flow pattern        | FR-001, FR-002, FR-003      | research.md:36-58   |
| Options with implications table         | US1-US4 Acceptance Criteria | research.md:60-76   |
| Memory storage pattern                  | FR-005, US6                 | research.md:97-118  |
| Integration point: Before Routing       | US1-US5 flow                | research.md:122     |
| Integration point: Memory System        | FR-005, US6                 | research.md:123     |
| Integration point: Discovery Artifact   | FR-004                      | research.md:124     |
| Integration point: Research Enhancement | FR-010                      | research.md:125     |
| Integration point: Spec Generation      | FR-009                      | research.md:126     |
| Constraint: Command File Limits         | NFR Compatibility           | research.md:178     |
| Constraint: Context Window              | NFR Performance             | research.md:179     |
| Constraint: Sync Requirement            | FR-008                      | research.md:180     |
| Constraint: Backward Compatibility      | FR-006, US7                 | research.md:181     |
| Tech Decision: discovery.md format      | FR-004                      | research.md:138-144 |
| Tech Decision: Adaptive AskUserQuestion | FR-001, FR-002              | research.md:146-152 |
| Tech Decision: Dual storage             | FR-004, FR-005              | research.md:154-162 |
| Tech Decision: Adaptive depth           | FR-007, US5                 | research.md:164-174 |
