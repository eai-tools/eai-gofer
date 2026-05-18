---
id: '029-enterpriseai-student-vertical-builder'
title: 'EnterpriseAI Student Vertical Builder'
status: 'draft'
created: '2026-04-09T02:00:00.000Z'
updated: '2026-04-11'
priority: 'medium'
assignee: 'engineer-agent'
---

# Feature Specification: EnterpriseAI Student Vertical Builder

## Overview

### What

Retune Gofer's pipeline commands, templates, artifacts, and documentation to
focus on EnterpriseAI platform vertical application delivery — while fully
preserving all existing provider, routing, and multi-platform capabilities. The
result is an **EnterpriseAI workflow profile** layered onto the existing Gofer
orchestration engine, adding business analysis, market/competitive analysis,
technology architecture, deployment guidance, and Marp-compatible presentation
outputs as first-class pipeline artifacts for student and business users.

### Why

Gofer currently presents as a general-purpose, multi-platform AI workflow tool.
University students and business students need a focused, end-to-end delivery
environment for building EnterpriseAI platform vertical applications: from
business-problem discovery through architecture, scaffolding, deployment via EAI
CLI, and presentation via Marp. The current multi-platform framing dilutes
EnterpriseAI-first guidance and leaves students without repeatable, high-quality
scaffolding for real-world platform delivery outcomes.

This feature resolves that gap by introducing an EnterpriseAI-first workflow
profile that reorients pipeline guidance, command outputs, and artifact
generation toward EAI vertical app delivery — all without removing or
deprecating any existing Gofer capability. Any future removal or deprecation
requires explicit, one-by-one user approval.

---

## User Stories

### US-001 — EnterpriseAI Vertical App Discovery (Priority: P1)

**As a** university or business student  
**I want** Gofer's business discovery and research stages to guide me through
EnterpriseAI platform concepts, business-process framing, and vertical app
opportunity identification  
**So that** I can consistently articulate an EnterpriseAI-specific problem
statement, value proposition, and target user persona without needing prior
platform expertise.

**Why this priority**: Discovery is the entry point for every pipeline run.
Without EnterpriseAI- first guidance here, all downstream artifacts drift toward
generic or multi-platform outputs. This story is the foundation upon which all
other stories depend.

**Independent Test**: A student with no prior Gofer experience runs the
discovery stage on a business scenario and the resulting `discovery.md` artifact
contains EnterpriseAI-platform-specific user personas, problem statements, and
value propositions — with zero references to non-EAI platform options.

**Acceptance Criteria**:

- [ ] The business scenario and discovery stage commands produce artifact
      content that references EnterpriseAI platform patterns and terminology as
      the primary delivery context.
- [ ] Discovery output includes a structured problem statement, target user
      persona, and value proposition shaped around EAI vertical app outcomes.
- [ ] No discovery stage output recommends or describes alternative non-EAI
      platform deployments as primary options.
- [ ] A student running the full discovery flow completes it without external
      platform knowledge and arrives at an EAI-ready problem statement.
- [ ] The one-by-one architecture decision loop is presented to the student
      before any platform lock-in decisions are finalized.

---

### US-002 — EnterpriseAI Architecture and Plan Generation (Priority: P1)

**As a** university or business student  
**I want** Gofer's specification, plan, and task-generation stages to produce
EnterpriseAI-specific architecture diagrams, integration maps, and EAI CLI +
Vertical Template scaffolding steps  
**So that** I have a deployable technical plan that maps directly to
EnterpriseAI platform constructs and does not require me to manually translate
generic instructions.

**Why this priority**: Architecture and plan quality directly determine whether
a student can execute a deployment. Inaccurate or generic architecture outputs
are the primary source of failure for early-stage EnterpriseAI learners.

**Independent Test**: Running the plan stage on an approved EAI discovery
produces a `plan.md` artifact that explicitly references EAI CLI commands,
Vertical Template structure, and deployment repository conventions — verified by
checking that no generic cloud or non-EAI deployment patterns appear as primary
guidance.

**Acceptance Criteria**:

- [ ] Plan artifacts reference EAI CLI commands and Vertical Template
      scaffolding steps as primary implementation guidance.
- [ ] Architecture outputs include an explicit EnterpriseAI integration map
      showing connections between the vertical app, EAI services, and deployment
      target.
- [ ] Task breakdown (`tasks.md`) contains EAI-specific tasks ordered to produce
      a locally runnable and platform-deployable app.
- [ ] Competitive/market analysis artifact is generated during the research
      stage and referenced in the plan.
- [ ] All generated artifacts remain consistent with the canonical command
      sources and do not drift from them across Copilot, Codex, and Gemini
      platform mirrors.
- [ ] Existing Gofer plan and architecture capabilities remain fully operational
      for non-EAI runs.

---

### US-003 — Marp Presentation Artifact Generation (Priority: P1)

**As a** university or business student  
**I want** Gofer's stakeholder communications stage to produce a Marp-compatible
slide deck as a first-class output artifact alongside release notes and demo
scripts  
**So that** I can present my EnterpriseAI vertical app outcomes to instructors,
peers, or stakeholders without reformatting content manually.

**Why this priority**: Student delivery outcomes typically culminate in a
presentation. Automated Marp output closes the last-mile gap between pipeline
execution and professional-quality readout/demo delivery.

**Independent Test**: Running the stakeholder comms stage after a completed
pipeline produces a `.md` file with valid Marp frontmatter that, when rendered,
covers problem statement, solution architecture, demo steps, and success metrics
— all populated from prior pipeline artifacts.

**Acceptance Criteria**:

- [ ] Stakeholder comms stage produces a Marp-compatible slide deck artifact
      (`.md` with Marp frontmatter) in the spec directory.
- [ ] Deck content is populated from prior pipeline artifacts (discovery, spec,
      plan, implementation summary) without requiring manual copy-paste.
- [ ] Deck structure includes: problem statement, EnterpriseAI solution
      overview, architecture diagram reference, demo script summary, and
      measurable success criteria.
- [ ] Marp output generation is opt-in per run (not forced on non-EAI or legacy
      runs) but is prominently featured as the default for EAI profile runs.
- [ ] Existing release notes and demo script outputs from the stakeholder comms
      stage are preserved and continue to function correctly.

---

### US-004 — EnterpriseAI Deployment Guidance (Priority: P2)

**As a** university or business student  
**I want** Gofer's task and implementation stages to include explicit EAI CLI
and Vertical Template deployment steps as runnable, sequenced tasks  
**So that** I can deploy my vertical app to the EnterpriseAI platform by
following pipeline output without needing to consult separate documentation.

**Why this priority**: Deployment guidance is a P2 because it builds on
architecture (US-002) and requires stable EAI CLI and Vertical Template
reference materials — which are external dependencies. Core discovery and
architecture value can be delivered before deployment guidance is fully
integrated.

**Independent Test**: A student follows the task breakdown from a completed EAI
pipeline run and successfully deploys a scaffold vertical app to their
EnterpriseAI environment using only the generated task steps and referenced
commands — without consulting external documentation.

**Acceptance Criteria**:

- [ ] Task breakdown includes at least one explicit EAI CLI deployment task with
      the correct command syntax or a clearly referenced local guidance
      document.
- [ ] Vertical Template scaffolding steps are included in the task breakdown
      before deployment tasks, in correct dependency order.
- [ ] Deployment tasks reference the EnterpriseAI deployment repository
      conventions (branch naming, environment targeting).
- [ ] If EAI CLI docs are not accessible at runtime, the pipeline gracefully
      references local vendored guidance and informs the student of the
      limitation.
- [ ] Implementation stage validates that deployment-required files (e.g.,
      manifest, config) are present before marking deployment tasks complete.

---

### US-005 — Competitive and Market Analysis for Student Positioning (Priority: P2)

**As a** university or business student  
**I want** the research stage to include a competitive and market analysis
artifact comparing my vertical app idea against alternative solutions and
student-focused AI app tools  
**So that** I can articulate the differentiation of my EnterpriseAI-based
solution and strengthen my business case.

**Why this priority**: Market analysis adds significant business-case depth but
is a supporting artifact — the pipeline delivers core value without it. It is
essential for higher-quality student business outcomes but not a blocker for
technical delivery.

**Independent Test**: Running the research stage produces a `market-analysis.md`
artifact containing a comparison table of at least three competitive
alternatives, their positioning against EnterpriseAI, and a differentiation
statement.

**Acceptance Criteria**:

- [ ] Research stage produces a structured competitive/market analysis artifact
      when the EAI profile is active.
- [ ] The analysis includes a comparison of at least three alternative
      approaches or tools.
- [ ] The analysis explicitly positions EnterpriseAI vertical app delivery as
      the chosen direction and states why.
- [ ] The artifact is referenced in both the spec and the plan as a supporting
      input when competitive analysis is enabled.
- [ ] Competitive analysis depth can be disabled per run via a stage flag
      without breaking other pipeline stages; when disabled, the market-analysis
      artifact is still generated as a baseline traceability output.

---

### US-006 — All-Platform Artifact Parity After EAI Profile Updates (Priority: P2)

**As a** developer or power Gofer user  
**I want** any updates to canonical EAI-profile command sources to be
automatically propagated to all platform mirrors (Copilot, Codex, Gemini) with
parity validation  
**So that** students on any supported AI assistant receive identical
EnterpriseAI workflow guidance without manual synchronization or drift.

**Why this priority**: Parity is the reliability backbone of the multi-platform
capability constraint. Without it, EAI profile updates in canonical sources
silently diverge from runtime resources used by students.

**Independent Test**: After updating a canonical command source, running the
generation and sync workflow produces identical EnterpriseAI guidance across all
supported assistant mirrors — confirmed by parity tests passing with no diffs.

**Acceptance Criteria**:

- [ ] The command generation workflow propagates EAI-profile content from
      canonical sources to all platform mirrors without manual editing of mirror
      files.
- [ ] Parity integration tests pass after any canonical command update.
- [ ] Runtime resource synchronization copies updated EAI-profile resources to
      runtime destinations on extension activation.
- [ ] No manual edits to mirror files are required or expected; all authoring
      happens in canonical sources.
- [ ] Existing cross-platform routing and provider behavior is preserved and no
      provider code paths are removed.

---

### US-007 — Existing Gofer Functionality Fully Preserved (Priority: P3)

**As a** current Gofer user who does not use the EnterpriseAI profile  
**I want** all existing Gofer commands, provider routing, platform support, and
outputs to continue working exactly as before  
**So that** adopting the EnterpriseAI-focused release does not break my existing
workflows or force a platform migration.

**Why this priority**: Preservation is a hard architectural constraint, not a
new feature — it is P3 in the user story list because existing behavior is
already functioning. Its role here is to make the constraint explicit and
testable.

**Independent Test**: Running the full existing regression test suite (unit +
integration + cross-platform parity) on the EAI-profile-updated codebase returns
a passing result with no regressions.

**Acceptance Criteria**:

- [ ] All existing unit and integration tests pass without modification after
      EAI profile changes.
- [ ] Cross-platform command parity tests pass for all supported platforms.
- [ ] No existing provider, routing, or CLI detection code path is removed or
      disabled.
- [ ] Existing command outputs for non-EAI pipeline runs are identical to
      pre-update outputs.
- [ ] No version upgrade triggers a deprecation or removal of any existing
      feature without an explicit, one-by-one user approval on record.

---

## Functional Requirements

### FR-001 — EnterpriseAI Workflow Profile Activation

The system MUST activate workflow behavior through the `gofer.workflowProfile`
setting with allowed values `standard` and `enterpriseai`. When `enterpriseai`
is selected, pipeline guidance, artifact templates, and default outputs MUST
shift to EnterpriseAI vertical app delivery while preserving baseline behavior
for `standard`.

- **Validation**: Run equivalent pipeline flows with
  `gofer.workflowProfile=standard` and `gofer.workflowProfile=enterpriseai`;
  verify profile-specific outputs change as expected and standard behavior
  remains unchanged.
- **Integration**: Profile selection is consumed by workflow orchestration,
  stage guidance generation, and artifact-output selection across discovery,
  research, specification, planning, implementation, and communications stages.

---

### FR-002 — EAI CLI and Vertical Template as First-Class Task Inputs

The system MUST include explicit EAI CLI commands and Vertical Template
scaffolding steps in generated task breakdowns when
`gofer.workflowProfile=enterpriseai`. EAI CLI guidance MUST be pinned to the
installed `eai` major.minor version, and that major.minor value MUST be recorded
in generated plan/task artifacts.

- **Validation**: Run task generation with `gofer.workflowProfile=enterpriseai`
  and an installed `eai`; confirm artifacts include at least one EAI CLI task,
  one Vertical Template scaffolding task, and the installed `eai` major.minor
  value.
- **Integration**: Task guidance integrates profile-aware generation, vendored
  EAI references, and artifact metadata capture for version traceability.

---

### FR-003 — Business and Competitive Analysis Artifact Generation

The system MUST generate a structured business analysis artifact and a
market/competitive analysis artifact during the research stage when the EAI
profile is active. Competitive-analysis depth is controlled by a stage flag;
disabled mode still produces a baseline market-analysis traceability artifact.

- **Validation**: Run research stage with EAI profile in both enabled and
  disabled competitive-analysis modes; verify presence and structure of both
  artifacts, with disabled mode producing baseline market-analysis traceability
  output.
- **Integration**: Research outputs feed downstream specification and planning
  stages as governed business artifacts.

---

### FR-004 — Marp Presentation Artifact Output

The system MUST produce a Marp-compatible slide deck artifact during the
stakeholder communications stage when the EAI profile is active and Marp output
is enabled.

- **Validation**: Run stakeholder comms stage with EAI profile and Marp output
  enabled; open the output `.md` file in a Marp renderer and confirm all
  required sections render without errors.
- **Integration**: Deck content is assembled from approved discovery,
  specification, planning, and implementation artifacts through the stakeholder
  communications workflow.

---

### FR-005 — Architecture Decision One-By-One Approval Loop

The system MUST present architecture decisions one at a time and require
explicit user approval before proceeding to specification for each decision when
the EAI profile is active.

- **Validation**: Trigger the architecture decision stage with EAI profile
  active; confirm the system presents one decision, waits for approval, and does
  not advance without it.
- **Integration**: Decision governance remains embedded in the business scenario
  workflow and MUST be preserved for all EAI profile runs.

---

### FR-006 — Canonical-to-Mirror Artifact Propagation

The system MUST propagate all EnterpriseAI profile content changes from
canonical command sources to all platform mirrors (Copilot, Codex, Gemini) via
the command generation and resource sync tooling, without requiring manual
editing of mirror files.

- **Validation**: Edit a canonical command source; run the generate and sync
  scripts; verify mirror files are updated and parity tests pass.
- **Integration**: Depends on command authoring, artifact generation, runtime
  resource synchronization, and parity validation capabilities as coordinated
  release gates.

---

### FR-007 — Deployment Repository Convention Guidance

The system MUST include guidance on EnterpriseAI deployment repository
conventions (branch naming, environment targeting, manifest requirements) in the
plan and task stages when the EAI profile is active.

- **Validation**: Run the plan stage with EAI profile active; confirm `plan.md`
  and `tasks.md` reference deployment repository conventions explicitly.
- **Integration**: Deployment guidance is sourced from vendored references under
  `.specify/references/eai/` and, when available, approved external EnterpriseAI
  references.

---

### FR-008 — No Capability Removal Without Explicit Approval

The system MUST NOT remove, disable, or deprecate any existing provider,
routing, command, or platform capability without a logged, explicit, one-by-one
user approval.

- **Validation**: After applying EAI profile updates, run the full regression
  test suite; confirm all pre-existing command paths, provider detection, and
  routing behaviors pass unchanged.
- **Integration**: Applies to cross-platform routing, provider selection, and
  command-behavior governance across all supported assistants.

---

### FR-009 — EnterpriseAI-Focused Extension Positioning

The system MUST update extension product framing (display name, description,
onboarding messaging, and README) to communicate EnterpriseAI vertical app
delivery as the primary use case, while retaining documentation of
multi-platform support.

- **Validation**: Install or reload the updated extension; confirm that welcome
  messaging, marketplace description, and README lead with EnterpriseAI vertical
  app delivery language.
- **Integration**: Applies to product metadata, onboarding messaging, and
  user-facing documentation surfaces while preserving existing configuration
  behaviors.

---

### FR-010 — Graceful Fallback for Inaccessible External EAI References

The system MUST gracefully handle runtime unavailability of external EAI CLI,
Vertical Template, or deployment repository documentation by falling back to
locally vendored reference docs and informing the user of the limitation.

- **Validation**: Simulate inaccessible external EAI docs; run the research and
  task stages; confirm the pipeline completes using local references and
  surfaces a user-visible notice.
- **Integration**: Fallback behavior applies across research, planning, and task
  generation stages; local reference docs are stored at
  `.specify/references/eai/`.

---

## Non-Functional Requirements

### NFR-001 — Reliability: No Regression on Existing Capabilities

All existing Gofer pipeline runs, command outputs, provider routes, and platform
integrations MUST continue to function correctly after EAI profile changes are
applied. Regression rate for existing test suite: **0% allowed**.

### NFR-002 — Reliability: Artifact Parity Across Platforms

Generated EAI-profile content MUST be identical across all platform mirrors
(Claude, Copilot, Codex, Gemini) at all times. Mirror drift is not acceptable in
any release. Parity test suite MUST pass before any release containing EAI
profile changes.

### NFR-003 — Performance: Pipeline Stage Output Conciseness

Pipeline stage outputs for EAI profile runs MUST remain concise and
deterministic to preserve context health. Individual stage artifact files MUST
NOT exceed the size thresholds established by existing commands; AI context
budget usage MUST be monitored and surfaced as a warning if critical threshold
is reached (per research finding: current context usage is at critical level).

### NFR-004 — Security: No Secrets in Artifact Output

EAI profile artifact outputs (discovery, spec, plan, tasks, Marp deck) MUST NOT
contain API keys, credentials, environment secrets, or internal platform access
tokens. Artifact templates MUST include explicit placeholder conventions for any
values that require runtime substitution.

### NFR-005 — Compatibility: EAI Profile is Additive, Not Replacing

The EAI workflow profile MUST be implemented as an additive overlay. Activating
the EAI profile MUST NOT alter the behavior of non-EAI pipeline runs.
Compatibility with all currently supported AI assistants (Claude Code, GitHub
Copilot CLI, Codex CLI, Gemini CLI) MUST be maintained.

### NFR-006 — Reliability: Graceful External Dependency Degradation

When external EAI references (EAI CLI docs, Vertical Template repo, deployment
repo) are inaccessible at runtime, the pipeline MUST NOT fail hard. It MUST
complete using locally available reference material and produce a user-visible
notice identifying which references were unavailable.

### NFR-007 — Compatibility: Runtime Resource Sync Migration Safety

EAI profile resource changes packaged into the extension MUST be handled safely
by the existing runtime resource synchronization upgrade path. No existing user
workspace resources MAY be deleted or overwritten without a confirmed upgrade
migration step.

---

## Success Criteria

| ID     | Metric                                                 | Target                                                                                                                                                                  | Measurement Method                                                                           |
| ------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| SC-001 | EnterpriseAI artifact accuracy                         | 100% of generated pipeline artifacts for EAI profile runs reference EAI-only platform patterns                                                                          | Spot-check all stage outputs; grep for non-EAI primary deployment recommendations            |
| SC-002 | Platform mirror parity                                 | 0 diffs between canonical command content and all platform mirrors after EAI profile update                                                                             | Automated parity test suite passes with 0 failures                                           |
| SC-003 | Regression rate                                        | 0% regression on existing test suite                                                                                                                                    | Full unit + integration + cross-platform parity test suite passes unchanged                  |
| SC-004 | Marp deck completeness                                 | 100% of required sections (problem, solution, architecture, demo, metrics) present in generated deck                                                                    | Render deck in Marp and verify section presence programmatically                             |
| SC-005 | Time to first EAI task breakdown                       | Student completes discovery → spec → plan → tasks in a single pipeline run without external doc lookup                                                                  | Elapsed time measured from feature kickoff to `tasks.md` completion                          |
| SC-006 | EAI deployment task inclusion and version traceability | 100% of EAI profile plan/task artifacts include at least one EAI CLI deployment task, one Vertical Template scaffolding task, and the installed `eai` major.minor value | Automated assertions on generated plan/task artifact structure and recorded version metadata |
| SC-007 | Competitive analysis artifact generation               | Generated competitive analysis artifact present and structured for 100% of EAI research stage runs with competitive analysis enabled                                    | File presence + required comparison table assertion                                          |
| SC-008 | Graceful fallback on inaccessible EAI docs             | Pipeline completes with user notice for 100% of runs where external EAI references are unavailable                                                                      | Integration test simulating 404 responses for external EAI docs                              |
| SC-009 | No capability removal                                  | 0 existing provider, routing, or platform capabilities removed or disabled without logged user approval                                                                 | Code review gate + regression test suite                                                     |
| SC-010 | Extension positioning update                           | EnterpriseAI vertical app delivery language leads in all user-facing product surfaces                                                                                   | Manual review of marketplace listing, extension README, and welcome message                  |

---

## Assumptions

| ID    | Assumption                                                                                                                                                                                                                                        | Impact if Wrong                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-001 | The EnterpriseAI workflow profile will be introduced as opt-in for the initial release, then promoted to default in a subsequent release after validation.                                                                                        | If made default immediately, regression risk increases and existing non-EAI users may see unexpected guidance changes.                                          |
| A-002 | EAI CLI, Vertical Template, and EnterpriseAI deployment repository documentation are maintained under `.specify/references/eai/` as the official local fallback library for EAI profile runs.                                                     | If this library is missing or stale, fallback behavior becomes inconsistent and deployment guidance quality degrades.                                           |
| A-003 | Marp output is opt-in per run (not mandatory for all EAI runs) but is the advertised default recommendation for student delivery runs.                                                                                                            | If made mandatory, students in environments without Marp tooling will see broken artifact instructions.                                                         |
| A-004 | Competitive analysis in the research stage is optional per run (enabled via stage flag), not always-on for all EAI profile runs.                                                                                                                  | If always-on, it increases context cost and pipeline duration for every run, including simple prototyping runs where market analysis is not needed.             |
| A-005 | All existing Gofer command, provider, routing, and platform capabilities will remain intact and functional for the foreseeable release window. Any change to this requires explicit one-by-one user approval.                                     | If removals occur without approval, the reliability-first and no-removal locked decisions are violated, creating risk of user regression and spec invalidation. |
| A-006 | The student target audience has access to an EnterpriseAI platform environment (tenant, credentials) and an installed `eai` binary whose version can be read for major.minor pinning. Gofer is not responsible for provisioning this environment. | If students lack platform or CLI access, deployment-stage tasks will fail regardless of pipeline quality.                                                       |
| A-007 | Cross-platform command parity tests exist and will be updated to cover EAI-profile content sections before any EAI profile changes are released.                                                                                                  | If parity tests are not updated, mirror drift can ship undetected.                                                                                              |

---

## Dependencies

| ID    | Dependency                                               | Type                                   | Notes                                                                                                                                                                                                   |
| ----- | -------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-001 | EAI CLI reference documentation                          | External (reference, locally vendored) | Required for accurate EAI CLI task content. Local fallback source is `.specify/references/eai/`. Guidance must be pinned to installed `eai` major.minor and that value recorded in generated artifacts. |
| D-002 | Vertical Template reference documentation                | External (reference, locally vendored) | Required for scaffolding guidance. Local fallback source is `.specify/references/eai/` to ensure deterministic profile behavior.                                                                        |
| D-003 | EnterpriseAI deployment workflow reference documentation | External (reference, locally vendored) | Required for deployment conventions (branching, environment targeting, manifest expectations). Local fallback source is `.specify/references/eai/`.                                                     |
| D-004 | Marp rendering toolchain                                 | External (toolchain)                   | Required to validate and render Marp slide deck artifacts. Must be available in student environments for presentation use; not required for artifact generation.                                        |
| D-005 | Canonical command authoring and generation capability    | Internal (content operations)          | Single-source command updates must regenerate all assistant mirrors after EAI profile changes.                                                                                                          |
| D-006 | Runtime resource synchronization capability              | Internal (runtime operations)          | Updated profile resources must be safely distributed to workspaces during activation and upgrade.                                                                                                       |
| D-007 | Cross-platform routing capability                        | Internal (runtime operations)          | Existing assistant routing behavior must remain intact while adding profile-aware guidance priorities.                                                                                                  |
| D-008 | Provider and CLI selection capability                    | Internal (runtime operations)          | Existing provider auto-detection and defaults must remain stable; EAI profile behavior is additive only.                                                                                                |
| D-009 | Architecture decision governance workflow                | Internal (workflow governance)         | One-by-one architecture approvals remain required before advancing to downstream stages.                                                                                                                |
| D-010 | Stakeholder communications artifact workflow             | Internal (artifact generation)         | Marp deck support extends existing business outputs without removing release notes or demo script outputs.                                                                                              |
| D-011 | Cross-platform parity and regression validation suite    | Internal (quality assurance)           | Validation gates must confirm mirror parity and no regressions before shipping EAI profile updates.                                                                                                     |

---

## Out of Scope

| Item                                                                                                 | Rationale                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Hard EnterpriseAI-only fork removing non-EAI provider/platform paths                                 | Violates locked Decision 3 (no removals without explicit one-by-one approval). Deferred to a future release pending explicit approval. |
| Automatic provisioning of EnterpriseAI tenant or student credentials                                 | Out of scope for pipeline tooling; students must have their own EAI environment access.                                                |
| Full end-to-end EnterpriseAI platform testing in CI                                                  | External platform dependency makes automated CI integration with live EAI environments infeasible in this release.                     |
| Competitive analysis research against commercial AI platforms outside the student/EAI vertical       | Research scope is focused on the student vertical app builder context, not broad enterprise AI market analysis.                        |
| Replacement of the existing Gofer spec-driven pipeline with a new EAI-specific pipeline architecture | EAI profile is additive; the existing pipeline stages, IDs, and orchestration structure are preserved.                                 |
| Real-time EAI platform status monitoring or health checks within the pipeline                        | Deployment tooling responsibility; outside the scope of pipeline orchestration.                                                        |
| Mandatory Marp rendering verification in CI                                                          | Marp rendering depends on external toolchain not guaranteed in all CI environments in this release.                                    |

---

## Glossary

| Term                                               | Definition                                                                                                                                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EnterpriseAI (EAI)                                 | The target enterprise AI platform for which Gofer is being retuned to support vertical application delivery.                                                                                              |
| EAI CLI                                            | The command-line interface tool for EnterpriseAI platform operations, including scaffolding, deployment, and service management.                                                                          |
| Vertical Template                                  | The EnterpriseAI platform-provided project scaffold template for creating vertical (business-process-specific) applications.                                                                              |
| Vertical App                                       | A business-process-driven application built on the EnterpriseAI platform targeting a specific industry or functional domain.                                                                              |
| EnterpriseAI Workflow Profile                      | The additive configuration layer in Gofer that reorients pipeline command guidance, artifact templates, and default outputs toward EnterpriseAI platform delivery without removing existing capabilities. |
| Workflow Profile Setting (`gofer.workflowProfile`) | The profile control setting used to activate workflow behavior; allowed values are `standard` and `enterpriseai`.                                                                                         |
| EAI CLI Version Contract                           | The rule that EAI guidance is pinned to the installed `eai` major.minor and that value is recorded in generated plan/task artifacts.                                                                      |
| Canonical Command Source                           | The authoritative command authoring content from which assistant-facing mirror artifacts are generated.                                                                                                   |
| Platform Mirror                                    | Generated assistant-specific copies of canonical command guidance distributed across supported assistant channels.                                                                                        |
| Marp                                               | A Markdown-based presentation framework (`marp-team/marp`) that renders `.md` files with YAML frontmatter into slide decks.                                                                               |
| Artifact Parity                                    | The condition in which all platform mirrors contain identical content to their canonical command source.                                                                                                  |
| One-By-One Approval Loop                           | The mandatory interaction pattern requiring explicit user approval for each architecture decision before pipeline advancement.                                                                            |
| Runtime Resource Sync Service                      | The extension capability responsible for copying packaged pipeline resources into user workspaces during activation and upgrade.                                                                          |
| Deployment Repository                              | The EnterpriseAI platform repository that defines deployment conventions, branch naming, environment targeting, and manifest requirements for vertical app releases.                                      |
| Student Delivery Outcome                           | A measurable artifact or capability produced by a student at the end of a pipeline run, typically including a working app, architecture documentation, and a presentation deck.                           |

---

## Research Traceability Matrix

| Research Finding                                                                 | Source Section                                       | Reflected In Spec                                           |
| -------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| Recommended scenario: EnterpriseAI profile overlay on existing pipeline          | research.md § Business Scenario Analysis             | Overview; US-001 through US-007; NFR-005                    |
| Hard fork / removal rejected                                                     | research.md § Business Scenario Analysis             | Out of Scope; FR-008; A-005                                 |
| Pattern 1: Canonical-to-generated command parity                                 | research.md § Pattern 1                              | FR-006; US-006; D-005; D-011                                |
| Pattern 2: Runtime resource synchronization                                      | research.md § Pattern 2                              | FR-006; D-006; NFR-007                                      |
| Pattern 3: Existing stakeholder communications output stage                      | research.md § Pattern 3                              | FR-004; US-003; D-010                                       |
| Pattern 4: One-by-one architecture decision loop                                 | research.md § Pattern 4                              | FR-005; US-001; D-009                                       |
| Integration point: Command content retuning                                      | research.md § Integration Points                     | FR-001; FR-002; FR-007                                      |
| Integration point: Artifact propagation                                          | research.md § Integration Points                     | FR-006; US-006; D-005; D-006                                |
| Integration point: Provider/routing safety                                       | research.md § Integration Points                     | FR-008; NFR-005; D-007; D-008                               |
| Integration point: Documentation alignment                                       | research.md § Integration Points                     | FR-009                                                      |
| Integration point: EAI external workflow guidance                                | research.md § Integration Points                     | FR-002; FR-007; FR-010; D-001; D-002; D-003                 |
| Decision 1: EAI focus without capability removal                                 | research.md § Technology Decisions                   | FR-008; NFR-005; A-005; Out of Scope                        |
| Decision 2: EAI external integration as first-class inputs                       | research.md § Technology Decisions                   | FR-002; FR-007; D-001; D-002; D-003                         |
| Decision 3: Marp presentation standardization                                    | research.md § Technology Decisions                   | FR-004; US-003; A-003; D-004                                |
| Constraint: No functionality loss without explicit approval                      | research.md § Constraints                            | FR-008; US-007; NFR-001; NFR-005; SC-003; SC-009            |
| Constraint: Generated artifact parity requirement                                | research.md § Constraints                            | NFR-002; FR-006; SC-002                                     |
| Constraint: Context health at critical usage                                     | research.md § Constraints                            | NFR-003                                                     |
| Constraint: External repository 404 in runtime                                   | research.md § Constraints                            | FR-010; A-002; D-001; D-002; D-003; NFR-006                 |
| Constraint: No default provider behavior change without approval                 | research.md § Constraints                            | FR-008; NFR-005; D-007; D-008                               |
| Brownfield: Router/provider multi-CLI compatibility                              | research.md § Brownfield Analysis                    | FR-008; NFR-005; D-007; D-008; Out of Scope                 |
| Brownfield: Runtime resource sync migration coupling                             | research.md § Brownfield Analysis                    | NFR-007; FR-006; D-006                                      |
| Brownfield: Test coupling to command generation                                  | research.md § Brownfield Analysis                    | FR-006; D-011; NFR-002                                      |
| Discovery: Target users are university/business students (beginner–intermediate) | discovery.md § Target Users                          | Overview; US-001 through US-005; Glossary                   |
| Discovery: Value metric — faster guided delivery of vertical apps                | discovery.md § Value Proposition                     | SC-005; SC-006; Overview                                    |
| Discovery: Competitive analysis requested                                        | discovery.md § Competitive Analysis                  | FR-003; US-005; SC-007; A-004                               |
| Discovery: Capability retention constraint                                       | discovery.md § Discovery Decisions                   | FR-008; NFR-005; A-005; US-007                              |
| Proposal: Approved scenario — EnterpriseAI profile overlay                       | proposal-review.md § Approval                        | All locked architecture decisions reflected throughout spec |
| Proposal: Locked Decision 1 — Profile-driven overlay                             | proposal-review.md § Architecture Decisions (Locked) | FR-001; NFR-005; A-001                                      |
| Proposal: Locked Decision 2 — Reliability-first                                  | proposal-review.md § Architecture Decisions (Locked) | NFR-001; NFR-002; NFR-006; SC-002; SC-003                   |
| Proposal: Locked Decision 3 — No removals without explicit one-by-one approval   | proposal-review.md § Architecture Decisions (Locked) | FR-008; US-007; A-005; Out of Scope                         |
| Open question: Default vs phased EAI profile rollout                             | proposal-review.md § Open Questions                  | A-001 (resolved: phased, opt-in first)                      |
| Open question: Marp mandatory vs optional                                        | proposal-review.md § Open Questions                  | A-003 (resolved: opt-in, default-recommended)               |
| Open question: Competitive analysis always-on vs optional                        | proposal-review.md § Open Questions                  | A-004 (resolved: optional per run flag)                     |
| Open question resolved: Vendored local EAI docs path                             | proposal-review.md § Open Questions                  | A-002; D-001; D-002; D-003; FR-010                          |
| Open question resolved: EAI CLI version contract                                 | proposal-review.md § Open Questions                  | FR-002; SC-006; D-001; Glossary                             |
| Open question resolved: EnterpriseAI profile activation mechanism                | proposal-review.md § Open Questions                  | FR-001; Glossary                                            |

---

## Needs Clarification

| ID                | Item                                        | Context                                                                                                                                             |
| ----------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| NC-001 (Resolved) | Vendored local EAI reference docs path      | The official local fallback path is `.specify/references/eai/`, applied to FR-010, A-002, and dependencies D-001 through D-003.                     |
| NC-002 (Resolved) | EAI CLI command syntax and version contract | EAI CLI guidance is pinned to the installed `eai` major.minor, and that value is recorded in generated plan/task artifacts (FR-002, SC-006, D-001). |
| NC-003 (Resolved) | EnterpriseAI profile activation mechanism   | EnterpriseAI profile behavior is activated through `gofer.workflowProfile` with values `standard` or `enterpriseai` (FR-001, Glossary).             |
