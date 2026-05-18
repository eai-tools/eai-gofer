---
feature: 'EnterpriseAI Student Vertical Builder'
created: 2026-04-08T01:46:30.000Z
status: approved
recommendedScenario: 'EnterpriseAI profile overlay'
recommendedArchitecture: 'Non-destructive EnterpriseAI workflow profile'
selectedOption: 'profile-overlay'
approvedBy: 'user'
approvedAt: '2026-04-09T01:22:59Z'
---

# Proposal Review: EnterpriseAI Student Vertical Builder

## What We Found

Gofer already has strong orchestration, generation, and stakeholder
communication patterns that can be retuned to an EnterpriseAI-only product
direction without removing existing capabilities. The safest path is to add
EnterpriseAI-focused workflow profiles, artifacts, and guidance across command
sources/templates, then regenerate all mirrored artifacts and keep parity tests
green.

## Business Scenarios Considered

| Scenario                                                    | User Value                                                            | Delivery Trade-off                                      | Recommendation |
| ----------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- | -------------- |
| EnterpriseAI profile overlay with full capability retention | High: aligns to student/business outcomes and preserves current power | Requires coordinated command/template/test updates      | **Adopt**      |
| Hard EnterpriseAI-only fork with feature removal            | Medium: strongest strictness narrative                                | High regression risk and violates no-removal constraint | **Defer**      |
| Minimal wording-only refresh                                | Low: weak behavioral enforcement                                      | Quick but misses core platform/workflow objective       | **Defer**      |

## Recommended Business Scenario

Move forward with **EnterpriseAI profile overlay**:

- EnterpriseAI-first pipeline guidance
- vertical app and deployment orientation
- business/competitive/architecture outputs
- Marp presentation support
- no capability removals without explicit user approval

## Technology Architecture Recommendation

### Recommended Architecture

Adopt a **profile-driven architecture**:

1. keep existing command/provider/routing infrastructure intact
2. add EnterpriseAI-focused profile behavior in command content/templates
3. add artifact outputs for business analysis + market analysis + architecture +
   Marp
4. preserve fallback compatibility routes unless explicitly approved otherwise

### Architecture Options

| Option                               | Why choose it                                                | Why not choose it now                              |
| ------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------- |
| Profile-driven overlay (recommended) | Meets direction, minimizes breakage, preserves functionality | Requires broader coordinated updates               |
| Hard replacement architecture        | Simplifies long-term narrative                               | Breaks compatibility + violates current constraint |

## Key Decisions and Why

- **Keep all current functionality**: explicit user constraint; prevents
  accidental regressions.
- **Retune canonical command sources first**: generated artifacts and extension
  resources derive from those sources.
- **Treat EnterpriseAI integrations as first-class artifacts**: needed for
  local-to-platform execution confidence.
- **Use one-by-one architecture decision loop**: ensures clarity before
  specification changes.

## Architecture Decisions (Locked)

- **Decision 1**: Profile-driven EnterpriseAI overlay
- **Decision 2**: Reliability-first trade-off priority
- **Decision 3**: Preserve all functionality; no removals/deprecations without
  one-by-one explicit approval

## What Can Change Before Specification

- Whether EnterpriseAI profile is default now vs phased default.
- Whether Marp output is mandatory vs optional.
- Whether competitive analysis is always-on vs optional.
- Exact shape of EAI CLI / Vertical Template / deployment reference integration
  based on access to source docs.

## Open Questions

- [x] Should EnterpriseAI profile be default immediately? **Resolved:** use
      phased rollout (opt-in first, then revisit default).
- [x] Should Marp presentation output be mandatory for this profile?
      **Resolved:** optional per run, recommended default for student/business
      delivery.
- [x] Should competitive analysis be mandatory in research stage for this
      profile? **Resolved:** optional per run via stage flag.
- [x] Do you want local vendored guidance docs for EAI CLI, Vertical Template,
      and deployment workflow? **Resolved:** yes, vendor under
      `.specify/references/eai/`.

## User Feedback and Overrides

- Architecture Decision 1 (locked): **Profile-driven EnterpriseAI overlay**
- Architecture Decision 2 (locked): **Reliability-first**
- Architecture Decision 3 (locked): **No removals/deprecations without explicit
  one-by-one approval**
- Clarification (locked): **EnterpriseAI profile activation via
  `gofer.workflowProfile` (`standard` | `enterpriseai`)**
- Clarification (locked): **Pin generated EAI CLI guidance to installed `eai`
  major.minor and record in artifacts**
- Clarification (locked): **Use `.specify/references/eai/` for vendored EAI
  references**

## Approval

- Status: approved
- Next action: proceed to `$ $2_gofer_specify`
