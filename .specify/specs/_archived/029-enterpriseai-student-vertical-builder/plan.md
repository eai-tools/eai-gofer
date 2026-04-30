---
feature: 'EnterpriseAI Student Vertical Builder'
spec: '/Users/douglaswross/Code/gofer/.specify/specs/029-enterpriseai-student-vertical-builder/spec.md'
research: '/Users/douglaswross/Code/gofer/.specify/specs/029-enterpriseai-student-vertical-builder/research.md'
status: ready
created: 2026-04-09T03:25:45Z
---

# Implementation Plan: EnterpriseAI Student Vertical Builder

## Summary

Implement a profile-driven EnterpriseAI overlay across Gofer’s existing pipeline
so student/business users get EnterpriseAI-first discovery, planning, deployment
guidance, and presentation artifacts while preserving all existing
multi-platform/provider behavior. This plan prioritizes reliability-first
delivery, canonical-to-mirror parity, and strict no-removal governance.

## Technical Context

### Tech Stack and Testing Context

- **Language/Runtime**: TypeScript 5.x (strict), Node.js 18+, Markdown-based
  command/spec artifacts.
- **Core Frameworks**: VS Code Extension API, existing Gofer command
  orchestration, command-generation tooling.
- **Storage Model**: Repository and workspace file-based artifacts (`.md`,
  generated prompt/skill files, packaged resources).
- **Testing Context**: Existing unit/integration suites (`npm test`),
  command-generation parity tests, cross-platform parity tests, extension
  integration checks.
- **Build/Packaging Context**: Webpack-based extension build, generated resource
  sync via extension migration flow.

### Architecture Summary

The implementation keeps the current Gofer architecture intact and layers an
additive **EnterpriseAI workflow profile** on top:

1. `gofer.workflowProfile` controls `standard` vs `enterpriseai` behavior.
2. Canonical command sources in `.claude/commands/*` are updated for
   EnterpriseAI profile flows.
3. `scripts/generate-commands.ts` propagates canonical updates into all mirror
   artifacts.
4. Runtime sync (`ResourceSyncer`) distributes updated resources safely into
   workspaces.
5. Existing router/provider infrastructure remains intact; only profile-aware
   guidance selection is added.
6. Reliability gates (parity + regression tests) enforce no functionality loss
   and no mirror drift.

### Integration Points

| Component                         | File                                                                                                                          | Integration Type                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Canonical pipeline commands       | `.claude/commands/*.md`                                                                                                       | Source-of-truth authoring for stage behavior and artifact requirements                  |
| Command generation                | `scripts/generate-commands.ts`                                                                                                | Canonical-to-mirror generation pipeline                                                 |
| Copilot mirror prompts            | `.github/prompts/*.prompt.md`                                                                                                 | Generated interface artifacts                                                           |
| System skill mirrors              | `.system/skills/*/SKILL.md`                                                                                                   | Generated runtime skill artifacts                                                       |
| Agent skill mirrors               | `.agents/skills/*/SKILL.md`                                                                                                   | Generated assistant skill artifacts                                                     |
| Runtime resource migration        | `extension/src/services/migration/ResourceSyncer.ts`                                                                          | Non-destructive workspace resource synchronization                                      |
| Cross-platform routing            | `extension/src/council/CrossPlatformCommandRouter.ts`                                                                         | Runtime command/resource lookup                                                         |
| Provider selection                | `extension/src/council/providers/ProviderFactory.ts`, `extension/src/council/providers/ProviderFactoryCliResolver.ts`         | CLI/provider compatibility preservation                                                 |
| Extension user-facing positioning | `extension/package.json`, `extension/README.md`, `README.md`, `extension/src/extension.ts` (welcome/onboarding registrations) | Product framing across metadata, welcome messaging, and onboarding walkthrough surfaces |
| Stakeholder communications output | `.claude/commands/7a_stakeholder_comms.md`                                                                                    | Marp + business communications artifact generation                                      |

### Key Dependencies

- **Internal dependencies**:
  - Canonical command authoring and generation flow
  - Runtime resource sync and migration safety
  - Existing cross-platform parity and regression test suites
  - Existing one-by-one architecture decision loop logic
- **External dependencies**:
  - Installed `eai-cli` for version-aware guidance (major.minor pinning)
  - Vendored EnterpriseAI references under `.specify/references/eai/`
  - Optional Marp renderer/toolchain for deck rendering validation

## Selected Implementation Approach

`/sequence-diagrams/selected-option.md` is not present for this feature, so the
plan uses the approved and locked decisions in `proposal-review.md`:

- **Approach**: Profile-driven EnterpriseAI overlay
  (`selectedOption: profile-overlay`)
- **Priority model**: Reliability-first
- **Governance constraint**: No removals/deprecations without explicit
  one-by-one user approval

Implementation strategy is additive, preserves existing code paths, and
introduces profile-aware behavior/content through canonical command updates plus
generated artifact propagation.

## Constitution Check

| Constitution Principle          | Plan Alignment                                                                                   | Enforcement in This Plan |
| ------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------ |
| I. Test-Driven Development      | New profile behaviors and artifact flows are test-gated before rollout                           | P2.6, P5.2, P5.3, P5.8   |
| II. MCP-First Architecture      | Existing integration architecture remains intact; no alternate bypass paths introduced           | P4.3, P4.4               |
| III. Spec Kit Format Compliance | All generated planning/task artifacts retain structured traceability and frontmatter conventions | P3.2, P3.6, P5.6         |
| IV. Strict TypeScript & Quality | New profile/fallback/version code paths are strongly typed and regression-tested                 | P1.2, P2.1, P2.6         |
| V. Security by Default          | Artifact generation adds secret-safe placeholders and validation checks                          | P2.5, P2.7, P5.5         |
| VI. Performance Requirements    | Output size and context-health constraints are validated before release                          | P4.7, P5.5               |
| VII. 80% Coverage Minimum       | New profile logic and integration paths are covered by unit + integration gates                  | P2.6, P5.2, P5.3, P5.8   |
| VIII. Minimal Necessary Changes | Profile overlay is additive; no destructive refactor/removal work included                       | P1.4, P5.4               |

<a id="phase-1-setup-foundation"></a>

## Phase 1 Setup/Foundation

### Goal

Introduce profile controls, baseline governance, and deterministic EnterpriseAI
reference foundations without altering existing behavior.

### Tasks

- [ ] **P1.1** Add `gofer.workflowProfile` (`standard | enterpriseai`) setting
      contract in `extension/package.json` and wire profile access helper in
      `extension/src/config/workflowProfile.ts`.
- [ ] **P1.2** Implement phased rollout defaults (default `standard`) and
      profile activation documentation in `README.md` and `extension/README.md`.
- [ ] **P1.3** Create/seed local fallback reference set in
      `.specify/references/eai/{README.md,eai-cli.md,vertical-template.md,deployment-repo.md}`.
- [ ] **P1.4** Preserve and emphasize one-by-one architecture approval +
      no-removal governance in `.claude/commands/0_business_scenario.md`.
- [ ] **P1.5** Define plan/task metadata contract to record installed `eai-cli`
      major.minor in generated artifacts.
- [ ] **P1.6** Establish `standard` profile regression baselines in integration
      tests (no behavior drift allowed).

### Verification Criteria

- **V1.1** Profile setting is discoverable and defaults to `standard`.
- **V1.2** Governance prompts explicitly block removals without explicit
  approval.
- **V1.3** Local EAI reference files exist and are readable.
- **V1.4** Baseline tests confirm no regressions for non-EAI runs.
- **V1.5** Novice walkthrough verification confirms discovery can be completed
  using in-product/repo guidance only (no external docs required).

<a id="phase-2-data-layer"></a>

## Phase 2 Data Layer

### Goal

Implement data contracts and resolvers that power profile-aware artifacts,
fallback behavior, and version traceability.

### Tasks

- [ ] **P2.1** Add typed data contracts for workflow profile, reference sources,
      competitive-analysis flag, and artifact metadata.
- [ ] **P2.2** Implement EnterpriseAI reference resolver
      (`external -> local fallback`) with structured fallback notice payloads.
- [ ] **P2.3** Implement `eai-cli` version discovery/parser that captures
      installed major.minor for artifact pinning.
- [ ] **P2.4** Define artifact data schemas for `business-analysis.md`,
      `market-analysis.md`, and Marp deck content sourcing, including
      `market-analysis` constraints for `alternativeCount >= 3` and reference
      indicators for `spec.md` and `plan.md`.
- [ ] **P2.5** Add secret-safety validation rules for generated artifacts (no
      credential/token output).
- [ ] **P2.6** Add/extend unit tests for profile parsing, fallback resolution,
      version parsing, and metadata serialization.
- [ ] **P2.7** Standardize placeholder conventions for runtime-substituted
      values across `.specify/templates/*.md` and generated artifact examples,
      and enforce those conventions via artifact validation rules.
- [ ] **P2.8** Create explicit implementation mapping from `data-model.md` core
      entities to code/persistence components: `WorkflowProfileConfig`,
      `PipelineRun`, `EaiReferenceSource`, `ArchitectureDecision`,
      `ArtifactRecord`, `TaskItem`, `MirrorPropagationRecord`, and
      `CapabilityRemovalApprovalRecord`.
- [ ] **P2.9** Implement approval-record persistence for
      `CapabilityRemovalApprovalRecord` with required fields `approver`,
      `decisionAt`, `changeSetId`, `capabilityAffected`, and `decision` (plus
      existing audit metadata/constraints).
- [ ] **P2.10** Implement payload schema contracts and validation handlers for
      EVT event payloads `EVT-001` through `EVT-012` to enforce
      producer/consumer payload compatibility.

### Verification Criteria

- **V2.1** Resolver chooses local vendored references when external docs are
  unavailable.
- **V2.2** Generated metadata includes installed `eai-cli` major.minor.
- **V2.3** Artifact schema validations pass for business/market/Marp payloads.
- **V2.4** `market-analysis` schema validation enforces at least 3 alternatives
  and records reference indicators for both `spec.md` and `plan.md`.
- **V2.5** Unit tests pass for new data-layer components.
- **V2.6** Placeholder convention checks pass across templates and generated
  artifacts with no non-standard placeholder patterns.
- **V2.7** Data-model implementation mapping is complete and names all 8 core
  entities from `data-model.md`.
- **V2.8** Persisted `CapabilityRemovalApprovalRecord` entries round-trip
  required fields (`approver`, `decisionAt`, `changeSetId`,
  `capabilityAffected`, `decision`) without loss.
- **V2.9** EVT payload validators for `EVT-001` through `EVT-012` pass against
  producer and consumer fixtures.

<a id="phase-3-business-logic"></a>

## Phase 3 Business Logic

### Goal

Retune stage behaviors for EnterpriseAI-first outcomes while preserving legacy
behavior and enforcing locked governance decisions.

### Tasks

- [ ] **P3.1** Update discovery/research canonical commands
      (`.claude/commands/0_business_scenario.md`,
      `.claude/commands/1_gofer_research.md`) for EnterpriseAI business framing,
      stage-flag-controlled competitive-analysis depth with baseline
      market-analysis artifact continuity, and explicit non-EAI primary-option
      exclusion assertions.
- [ ] **P3.2** Update spec/plan commands (`.claude/commands/2_gofer_specify.md`,
      `.claude/commands/3_gofer_plan.md`) to require EAI integration maps,
      deployment convention references, and explicit `market-analysis.md`
      references in both `spec.md` and `plan.md` outputs when competitive
      analysis is enabled, while preserving baseline market-analysis artifact
      continuity when disabled.
- [ ] **P3.3** Update task/implement commands
      (`.claude/commands/4_gofer_tasks.md`,
      `.claude/commands/5_gofer_implement.md`) to include Vertical Template
      scaffolding, EAI deployment task ordering, and deployment-file preflight
      checks that gate deployment task completion.
- [ ] **P3.4** Update stakeholder comms command
      (`.claude/commands/7a_stakeholder_comms.md`) to generate opt-in Marp deck
      output at
      `.specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.md`
      while preserving release notes/demo script outputs.
- [ ] **P3.5** Apply reliability-first and explicit no-removal guard language
      across all updated stage prompts/artifact instructions.
- [ ] **P3.6** Add artifact templates/examples for `business-analysis.md`,
      `market-analysis.md`, and `presentation.marp.md` outputs.
- [ ] **P3.7** Implement event contract publish/consume wiring for `EVT-001`
      through `EVT-012` across profile activation, governance, artifact
      generation, propagation, validation, and deployment-readiness boundaries.

### Verification Criteria

- **V3.1** EnterpriseAI profile runs generate EAI-first
  discovery/spec/plan/tasks/comms artifacts.
- **V3.2** Architecture outputs include explicit EnterpriseAI integration maps
  and deployment convention references.
- **V3.3** One-by-one architecture approval loop remains active before spec
  lock-in.
- **V3.4** `market-analysis.md` is referenced in both `spec.md` and `plan.md`
  outputs when competitive analysis is enabled, and disabled mode retains
  baseline market-analysis traceability output.
- **V3.5** Discovery/research non-EAI exclusion assertions pass (non-EAI
  platforms are not presented as primary options).
- **V3.6** Non-EAI runs continue producing prior behavior/output patterns.
- **V3.7** Marp generation remains opt-in but default-recommended for
  EnterpriseAI profile runs, and writes to
  `.specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.md`.
- **V3.8** Publish/consume hooks for `EVT-001` through `EVT-012` are implemented
  at required stage boundaries with no missing producer or consumer path.

<a id="phase-4-api-interface-layer"></a>

## Phase 4 API/Interface Layer

### Goal

Propagate EnterpriseAI profile behavior through command-generation interfaces,
runtime sync boundaries, and user-facing extension surfaces.

### Tasks

- [ ] **P4.1** Extend `scripts/generate-commands.ts` and generation plumbing for
      profile-aware sections and metadata propagation.
- [ ] **P4.2** Regenerate platform mirrors (`.github/prompts`, `.system/skills`,
      `.agents/skills`) from canonical sources with no manual mirror edits.
- [ ] **P4.3** Update `extension/src/services/migration/ResourceSyncer.ts` to
      synchronize new resources with migration-safe, non-destructive behavior.
- [ ] **P4.4** Add profile-aware guidance selection in
      `CrossPlatformCommandRouter` while preserving provider/CLI code paths in
      `ProviderFactory` and `ProviderFactoryCliResolver`.
- [ ] **P4.5** Update `extension/package.json`, `extension/README.md`, root
      `README.md`, and extension onboarding/welcome messaging surfaces to lead
      with EnterpriseAI vertical-builder positioning while preserving
      multi-platform documentation.
- [ ] **P4.6** Surface user-visible fallback notices when local vendored EAI
      references are used due to external unavailability.
- [ ] **P4.7** Implement NFR-003 context-budget threshold monitoring and warning
      emission so stage output flows surface non-blocking warnings when critical
      context-budget thresholds are reached.

### Verification Criteria

- **V4.1** Generated mirrors are updated from canonical content with parity
  intact.
- **V4.2** Runtime sync upgrades resources without deleting existing user
  resources.
- **V4.3** Provider routing behavior remains backward compatible.
- **V4.4** User-facing messaging reflects EnterpriseAI-first framing and
  compatibility retention, including fallback notices when local EAI references
  are used.
- **V4.5** Context-budget threshold warning emission occurs when critical usage
  thresholds are crossed and is visible to users in run output messaging.

<a id="phase-5-polish-integration"></a>

## Phase 5 Polish/Integration

### Goal

Close reliability, parity, regression, and release-readiness gates for a safe
additive rollout.

### Tasks

- [ ] **P5.1** Run full generation + sync workflow and verify repository mirror
      artifacts are in parity.
- [ ] **P5.2** Expand integration coverage for EnterpriseAI profile, fallback
      behavior, Marp output, EAI deployment guidance, market-analysis
      minimum-alternative enforcement (`>=3`), and non-EAI exclusion assertions
      across both `tests/integration/...` and `extension/src/test/suite/...`,
      including novice walkthrough checks (US-001.AC4, no external docs) and
      explicit Marp output-path assertions for
      `.specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.md`.
- [ ] **P5.3** Execute full test matrix (unit/integration/parity/regression) for
      both `standard` and `enterpriseai` profiles.
- [ ] **P5.4** Add approval-audit gate that queries persisted
      `CapabilityRemovalApprovalRecord` entries (`approver`, `decisionAt`,
      `changeSetId`, `capabilityAffected`, `decision`) and blocks
      removal/deprecation changes without explicit per-capability approval (not
      summary-only audit checks).
- [ ] **P5.5** Validate context-size/conciseness, context-budget warning
      emission behavior, and secret-safety constraints for generated artifacts.
- [ ] **P5.6** Final release-readiness check: confirm deployment conventions and
      pinned `eai-cli` major.minor appear in generated plan/task artifacts.
- [ ] **P5.7** Add implementation-stage deployment readiness gate that validates
      required deployment files (manifest/config) before any deployment task can
      be marked complete.
- [ ] **P5.8** Add contract-coverage gate for `IAP-001` through `IAP-011` and
      `EVT-001` through `EVT-012`, with explicit checks for EVT publish/consume
      paths and EVT payload-validation coverage.

### Verification Criteria

- **V5.1** Parity tests pass with zero drift across all platform mirrors.
- **V5.2** Regression and compatibility tests show 0% functional loss for
  existing workflows across both profiles.
- **V5.3** EnterpriseAI artifacts include required deployment/version metadata.
- **V5.4** Governance and security checks pass before release, including
  persisted `CapabilityRemovalApprovalRecord` enforcement at release gate time.
- **V5.5** Implementation-stage deployment readiness validation passes
  (manifest/config checks complete) before deployment tasks are marked complete.
- **V5.6** Contract coverage gate proves `IAP-001` through `IAP-011` and
  `EVT-001` through `EVT-012` are implemented and verified, including EVT
  publish/consume and payload-validation evidence.
- **V5.7** Root and extension integration suites both pass for EnterpriseAI
  additions, including novice walkthrough and Marp output-location assertions.

## File Structure (new/modified)

```text
.claude/commands/                                  # modified
├── 0_business_scenario.md
├── 1_gofer_research.md
├── 2_gofer_specify.md
├── 3_gofer_plan.md
├── 4_gofer_tasks.md
├── 5_gofer_implement.md
└── 7a_stakeholder_comms.md

.specify/references/eai/                           # new
├── README.md
├── eai-cli.md
├── vertical-template.md
└── deployment-repo.md

.specify/templates/                                # modified (if profile metadata added)
├── spec-template.md
├── plan-template.md
└── tasks-template.md

scripts/                                           # modified
└── generate-commands.ts

extension/                                         # modified/new
├── package.json
├── README.md
├── src/
│   ├── config/
│   │   └── workflowProfile.ts                     # new
│   ├── services/
│   │   └── EAIReferenceResolver.ts                # new
│   ├── services/migration/
│   │   └── ResourceSyncer.ts
│   └── council/
│       ├── CrossPlatformCommandRouter.ts
│       └── providers/
│           ├── ProviderFactory.ts
│           └── ProviderFactoryCliResolver.ts
├── src/test/suite/                                # modified/new
│   ├── workflow-profile-enterpriseai.test.ts      # new
│   └── onboarding-messaging.test.ts
└── resources/                                     # generated/synced updates

.github/prompts/                                   # generated updates
.system/skills/                                    # generated updates
.agents/skills/                                    # generated updates

tests/integration/                                 # modified/new
├── command-generation.test.ts
├── cross-platform-parity.test.ts
├── workflow-profile-enterpriseai.test.ts          # new
├── stakeholder-marp-output.test.ts                # new
└── event-contract-coverage.test.ts                # new
```

## Risk Assessment

| Risk                                                                | Impact                                                               | Mitigation                                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Mirror drift after canonical command updates** (HIGH)             | Students on Copilot/Codex/Gemini receive inconsistent guidance       | Enforce canonical-only authoring, regenerate mirrors via script, gate release on parity tests (P4.1, P4.2, P5.1, P5.3) |
| **Regression in existing non-EAI workflows** (HIGH)                 | Breaks current users and violates reliability/no-removal constraints | Baseline regression gates, dual-profile test matrix, approval audit for removals (P1.6, P5.3, P5.4)                    |
| **Resource sync migration overwrites user workspace assets** (HIGH) | Data/config disruption in existing workspaces                        | Non-destructive sync changes + migration safety tests (P4.3, P5.2)                                                     |
| External EAI references become unavailable or stale (MEDIUM)        | Incomplete or failing deployment guidance                            | Local vendored fallback references + explicit notice path + periodic refresh cadence (P1.3, P2.2, P4.6)                |
| Incorrect `eai-cli` version detection across environments (MEDIUM)  | Wrong command guidance in plan/tasks                                 | Version parser tests across output variants + recorded metadata traceability (P2.3, P2.6, P5.6)                        |
| Artifact size/context bloat from added outputs (MEDIUM)             | Reduced context health and stage reliability                         | Enforce concise templates + output checks for size thresholds + threshold warning emission gates (P4.7, P5.5)          |

## Spec Traceability

### User Story Coverage

| User Story                                                     | Status  | Plan References                    |
| -------------------------------------------------------------- | ------- | ---------------------------------- |
| US-001 EnterpriseAI Vertical App Discovery                     | Covered | P1.4, P3.1, P3.5, P5.3             |
| US-002 EnterpriseAI Architecture and Plan Generation           | Covered | P1.5, P2.3, P3.2, P3.3, P5.6       |
| US-003 Marp Presentation Artifact Generation                   | Covered | P2.4, P3.4, P3.6, P5.2             |
| US-004 EnterpriseAI Deployment Guidance                        | Covered | P1.3, P2.2, P3.2, P3.3, P5.6, P5.7 |
| US-005 Competitive and Market Analysis for Student Positioning | Covered | P2.4, P3.1, P3.2, P3.6, P5.2       |
| US-006 All-Platform Artifact Parity After EAI Profile Updates  | Covered | P4.1, P4.2, P5.1, P5.2, P5.3       |
| US-007 Existing Gofer Functionality Fully Preserved            | Covered | P1.6, P2.9, P4.3, P4.4, P5.3, P5.4 |

### Acceptance Criteria Traceability Matrix

| AC ID      | Acceptance Criterion                                                                       | Plan phase/task anchors                                                                                                                       | Verification references |
| ---------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| US-001.AC1 | Discovery content is EnterpriseAI-first as primary context                                 | [Phase 3](#phase-3-business-logic): P3.1, P3.5                                                                                                | V3.1, V3.5              |
| US-001.AC2 | Discovery includes structured problem statement/persona/value proposition for EAI outcomes | [Phase 3](#phase-3-business-logic): P3.1, P3.6                                                                                                | V3.1                    |
| US-001.AC3 | Non-EAI deployment options do not appear as primary recommendations                        | [Phase 3](#phase-3-business-logic): P3.1; [Phase 5](#phase-5-polish-integration): P5.2                                                        | V3.5, V5.2              |
| US-001.AC4 | Discovery flow remains usable without external platform expertise                          | [Phase 1](#phase-1-setup-foundation): P1.3; [Phase 3](#phase-3-business-logic): P3.1; [Phase 5](#phase-5-polish-integration): P5.2            | V1.3, V1.5, V5.7        |
| US-001.AC5 | One-by-one architecture decisions enforced before lock-in                                  | [Phase 1](#phase-1-setup-foundation): P1.4; [Phase 3](#phase-3-business-logic): P3.5                                                          | V1.2, V3.3              |
| US-002.AC1 | Plan artifacts prioritize EAI CLI + Vertical Template guidance                             | [Phase 1](#phase-1-setup-foundation): P1.5; [Phase 2](#phase-2-data-layer): P2.3; [Phase 3](#phase-3-business-logic): P3.2, P3.3              | V2.2, V3.2, V5.3        |
| US-002.AC2 | Architecture outputs include explicit EnterpriseAI integration map                         | [Phase 3](#phase-3-business-logic): P3.2                                                                                                      | V3.2                    |
| US-002.AC3 | `tasks.md` contains ordered EAI-specific runnable/deployable tasks                         | [Phase 3](#phase-3-business-logic): P3.3; [Phase 5](#phase-5-polish-integration): P5.2                                                        | V5.2, V5.5              |
| US-002.AC4 | `market-analysis.md` is generated and referenced in plan outputs                           | [Phase 2](#phase-2-data-layer): P2.4; [Phase 3](#phase-3-business-logic): P3.1, P3.2                                                          | V2.4, V3.4              |
| US-002.AC5 | Canonical source consistency is preserved across mirrors                                   | [Phase 4](#phase-4-api-interface-layer): P4.1, P4.2; [Phase 5](#phase-5-polish-integration): P5.1, P5.3                                       | V4.1, V5.1              |
| US-002.AC6 | Non-EAI plan/architecture behavior remains operational                                     | [Phase 1](#phase-1-setup-foundation): P1.6; [Phase 4](#phase-4-api-interface-layer): P4.4; [Phase 5](#phase-5-polish-integration): P5.3, P5.4 | V1.4, V4.3, V5.2, V5.4  |
| US-003.AC1 | Stakeholder comms generates Marp-compatible deck artifact                                  | [Phase 2](#phase-2-data-layer): P2.4; [Phase 3](#phase-3-business-logic): P3.4, P3.6; [Phase 5](#phase-5-polish-integration): P5.2            | V3.7, V5.2, V5.7        |
| US-003.AC2 | Deck content is populated from prior pipeline artifacts                                    | [Phase 3](#phase-3-business-logic): P3.4; [Phase 5](#phase-5-polish-integration): P5.2                                                        | V5.2                    |
| US-003.AC3 | Deck includes required business/architecture/demo/success sections                         | [Phase 3](#phase-3-business-logic): P3.6; [Phase 5](#phase-5-polish-integration): P5.2                                                        | V5.2                    |
| US-003.AC4 | Marp output is opt-in, with EAI-default recommendation                                     | [Phase 3](#phase-3-business-logic): P3.4, P3.5                                                                                                | V3.7                    |
| US-003.AC5 | Existing release notes and demo script outputs are preserved                               | [Phase 3](#phase-3-business-logic): P3.4; [Phase 5](#phase-5-polish-integration): P5.3                                                        | V5.2                    |
| US-004.AC1 | Task breakdown includes explicit EAI CLI deployment guidance                               | [Phase 1](#phase-1-setup-foundation): P1.3; [Phase 2](#phase-2-data-layer): P2.3; [Phase 3](#phase-3-business-logic): P3.3                    | V2.2, V5.3, V5.5        |
| US-004.AC2 | Vertical Template scaffolding precedes deployment tasks                                    | [Phase 3](#phase-3-business-logic): P3.3                                                                                                      | V5.2, V5.5              |
| US-004.AC3 | Deployment tasks include deployment-repository conventions                                 | [Phase 1](#phase-1-setup-foundation): P1.3; [Phase 3](#phase-3-business-logic): P3.2, P3.3; [Phase 5](#phase-5-polish-integration): P5.6      | V3.2, V5.3              |
| US-004.AC4 | Runtime fallback to local guidance occurs with user notice when external docs fail         | [Phase 2](#phase-2-data-layer): P2.2; [Phase 4](#phase-4-api-interface-layer): P4.6                                                           | V2.1, V4.4              |
| US-004.AC5 | Deployment-required files are validated before deployment task completion                  | [Phase 3](#phase-3-business-logic): P3.3; [Phase 5](#phase-5-polish-integration): P5.7                                                        | V5.5                    |
| US-005.AC1 | Research stage produces structured market analysis for EAI profile                         | [Phase 2](#phase-2-data-layer): P2.4; [Phase 3](#phase-3-business-logic): P3.1, P3.6                                                          | V2.3, V3.1              |
| US-005.AC2 | Market analysis compares at least three alternatives                                       | [Phase 2](#phase-2-data-layer): P2.4; [Phase 5](#phase-5-polish-integration): P5.2                                                            | V2.4, V5.2              |
| US-005.AC3 | Analysis explicitly positions EAI as selected direction and rationale                      | [Phase 3](#phase-3-business-logic): P3.1, P3.6                                                                                                | V3.1                    |
| US-005.AC4 | Market-analysis artifact is referenced in both spec and plan                               | [Phase 2](#phase-2-data-layer): P2.4; [Phase 3](#phase-3-business-logic): P3.2                                                                | V2.4, V3.4              |
| US-005.AC5 | Competitive analysis can be disabled per run without pipeline breakage                     | [Phase 2](#phase-2-data-layer): P2.1, P2.4; [Phase 5](#phase-5-polish-integration): P5.3                                                      | V2.3, V5.2              |
| US-006.AC1 | Canonical EAI updates propagate to all mirrors without manual mirror edits                 | [Phase 4](#phase-4-api-interface-layer): P4.1, P4.2                                                                                           | V4.1                    |
| US-006.AC2 | Parity integration tests pass after canonical updates                                      | [Phase 5](#phase-5-polish-integration): P5.1, P5.2, P5.3                                                                                      | V5.1, V5.2              |
| US-006.AC3 | Runtime activation sync copies updated EAI resources                                       | [Phase 4](#phase-4-api-interface-layer): P4.3                                                                                                 | V4.2                    |
| US-006.AC4 | Authoring remains canonical-only; mirror edits are not required                            | [Phase 4](#phase-4-api-interface-layer): P4.1, P4.2; [Phase 5](#phase-5-polish-integration): P5.1                                             | V4.1, V5.1              |
| US-006.AC5 | Cross-platform routing/provider paths remain preserved                                     | [Phase 4](#phase-4-api-interface-layer): P4.4; [Phase 5](#phase-5-polish-integration): P5.4                                                   | V4.3, V5.4              |
| US-007.AC1 | Existing unit/integration suites pass unchanged after EAI updates                          | [Phase 1](#phase-1-setup-foundation): P1.6; [Phase 5](#phase-5-polish-integration): P5.3                                                      | V1.4, V5.2              |
| US-007.AC2 | Cross-platform parity tests pass for all supported platforms                               | [Phase 4](#phase-4-api-interface-layer): P4.2; [Phase 5](#phase-5-polish-integration): P5.1, P5.3                                             | V5.1                    |
| US-007.AC3 | Existing provider/routing/CLI-detection code paths are not removed                         | [Phase 4](#phase-4-api-interface-layer): P4.4; [Phase 5](#phase-5-polish-integration): P5.4                                                   | V4.3, V5.4              |
| US-007.AC4 | Non-EAI command outputs remain identical to baseline behavior                              | [Phase 1](#phase-1-setup-foundation): P1.6; [Phase 5](#phase-5-polish-integration): P5.3                                                      | V1.4, V5.2              |
| US-007.AC5 | Capability removals require explicit one-by-one approval record                            | [Phase 1](#phase-1-setup-foundation): P1.4; [Phase 2](#phase-2-data-layer): P2.9; [Phase 5](#phase-5-polish-integration): P5.4                | V1.2, V2.8, V5.4        |

### Contract Coverage

#### Internal API Contract Coverage

| Contract ID | Plan task anchors      | Verification criteria  |
| ----------- | ---------------------- | ---------------------- |
| IAP-001     | P1.1, P4.4, P5.8       | V1.1, V4.3, V5.6       |
| IAP-002     | P1.4, P3.5, P5.8       | V1.2, V3.3, V5.6       |
| IAP-003     | P1.4, P2.9, P5.4, P5.8 | V1.2, V2.8, V5.4, V5.6 |
| IAP-004     | P2.2, P4.6, P5.8       | V2.1, V4.4, V5.6       |
| IAP-005     | P2.4, P3.1, P3.6, P5.8 | V2.3, V2.4, V3.1, V5.6 |
| IAP-006     | P3.2, P3.3, P5.7, P5.8 | V3.2, V5.3, V5.5, V5.6 |
| IAP-007     | P3.4, P3.6, P5.2, P5.8 | V3.7, V5.2, V5.6       |
| IAP-008     | P4.1, P4.2, P5.1, P5.8 | V4.1, V5.1, V5.6       |
| IAP-009     | P4.5, P5.2, P5.8       | V4.4, V5.2, V5.6       |
| IAP-010     | P5.1, P5.2, P5.3, P5.8 | V5.1, V5.2, V5.6, V5.7 |
| IAP-011     | P5.7, P5.8             | V5.5, V5.6             |

#### Event Contract Coverage

| Contract ID | Plan task anchors                   | Verification criteria              |
| ----------- | ----------------------------------- | ---------------------------------- |
| EVT-001     | P2.10, P3.7, P1.1, P5.8             | V2.9, V1.1, V3.8, V5.6             |
| EVT-002     | P2.10, P3.7, P1.4, P3.5, P5.8       | V2.9, V1.2, V3.3, V3.8, V5.6       |
| EVT-003     | P2.10, P3.7, P1.4, P2.9, P5.8       | V2.9, V1.2, V2.8, V3.8, V5.6       |
| EVT-004     | P2.10, P3.7, P2.2, P4.6, P5.8       | V2.1, V2.9, V4.4, V3.8, V5.6       |
| EVT-005     | P2.10, P3.7, P2.4, P3.1, P5.8       | V2.3, V2.9, V3.1, V3.8, V5.6       |
| EVT-006     | P2.10, P3.7, P3.2, P3.3, P5.8       | V2.9, V3.2, V5.3, V3.8, V5.6       |
| EVT-007     | P2.10, P3.7, P3.4, P3.6, P5.2, P5.8 | V2.9, V3.7, V5.2, V3.8, V5.6       |
| EVT-008     | P2.10, P3.7, P4.1, P4.2, P5.1, P5.8 | V2.9, V4.1, V5.1, V3.8, V5.6       |
| EVT-009     | P2.10, P3.7, P4.5, P5.2, P5.8       | V2.9, V4.4, V5.2, V3.8, V5.6       |
| EVT-010     | P2.10, P3.7, P5.1, P5.2, P5.3, P5.8 | V2.9, V5.1, V5.2, V3.8, V5.6, V5.7 |
| EVT-011     | P2.10, P3.7, P2.9, P5.4, P5.8       | V2.8, V2.9, V5.4, V3.8, V5.6       |
| EVT-012     | P2.10, P3.7, P5.7, P5.8             | V2.9, V5.5, V3.8, V5.6             |

### Functional Requirement Coverage

| FR-ID                                                             | Status  | Plan Reference               |
| ----------------------------------------------------------------- | ------- | ---------------------------- |
| FR-001 EnterpriseAI Workflow Profile Activation                   | Covered | P1.1, P1.2, P4.4, P5.3       |
| FR-002 EAI CLI and Vertical Template as First-Class Task Inputs   | Covered | P1.5, P2.3, P3.3, P5.6       |
| FR-003 Business and Competitive Analysis Artifact Generation      | Covered | P2.4, P3.1, P3.2, P3.6, P5.2 |
| FR-004 Marp Presentation Artifact Output                          | Covered | P2.4, P3.4, P5.2             |
| FR-005 Architecture Decision One-By-One Approval Loop             | Covered | P1.4, P3.5                   |
| FR-006 Canonical-to-Mirror Artifact Propagation                   | Covered | P4.1, P4.2, P5.1, P5.3       |
| FR-007 Deployment Repository Convention Guidance                  | Covered | P1.3, P3.2, P3.3, P5.6, P5.7 |
| FR-008 No Capability Removal Without Explicit Approval            | Covered | P1.4, P1.6, P2.9, P4.4, P5.4 |
| FR-009 EnterpriseAI-Focused Extension Positioning                 | Covered | P1.2, P4.5, P5.2             |
| FR-010 Graceful Fallback for Inaccessible External EAI References | Covered | P1.3, P2.2, P4.6, P5.2       |

Coverage summary: **User stories 7/7 covered; Functional requirements 10/10
covered.**
