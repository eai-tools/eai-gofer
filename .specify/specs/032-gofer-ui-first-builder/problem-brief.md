---
feature: '032-gofer-ui-first-builder'
created: '2026-05-10T09:31:57Z'
validated-by: Codex + Douglas
status: approved
---

# Problem Brief: 032-gofer-ui-first-builder

## Problem Statement

**As Stated**: Gofer should build a better-looking MVP UI first, let the user
iterate on it, constrain that UI to the Vertical Template, optionally apply
branding, validate previews before showing them, and only then move into the
rest of the pipeline and service selection.

**Refined**: Gofer needs a dual-mode shared pipeline. For app-delivery work it
must add a UI-first preview-and-approval branch plus a post-approval
service-fit gate, while preserving the existing shared-stage behavior for
non-app work.

## Root Cause Analysis (5 Whys)

| Level | Question | Answer |
| ----- | -------- | ------ |
| Why 1 | Why does the first Gofer result often miss expectations? | The workflow converges on implementation scope before converging on the visible UI. |
| Why 2 | Why is UI convergence late? | The current stages emphasize research/spec/plan/tasks without an explicit preview approval gate. |
| Why 3 | Why is the preview weak when it does appear? | There is no hard requirement to stay inside the Vertical Template blocks or self-review the preview before presentation. |
| Why 4 | Why do service choices drift or arrive too early? | Platform capability selection is not sequenced after UI approval and tenant-aware evidence. |
| Why 5 | Why is this risky to fix? | Gofer already supports non-app workflows, so an app-focused rewrite could regress existing functionality. |

**Root Cause Summary**: The pipeline lacks an app-delivery-specific early gate
for UI convergence and service-fit evidence, and it lacks an explicit contract
that preserves non-app behavior inside the same shared numbered stages.

## Stakeholder Impact

| Stakeholder | Impact Level | Frequency | Cost per Occurrence | Annual Impact |
| ----------- | ------------ | --------- | ------------------- | ------------- |
| Gofer builder | High | Frequent | rework, reprompting, stage churn | High |
| Client stakeholder | High | Frequent | low confidence in first-pass outputs | High |
| Gofer maintainer | Medium | Frequent | prompt drift and regression risk | Medium |

## Business Case

| Metric | Value |
| ------ | ----- |
| Cost of doing nothing (annual) | continued rework and mistrust in early Gofer outputs |
| Estimated value of solving | faster alignment, lower rework, safer pipeline adoption |
| Payback period | short |
| Confidence level | Medium |

## Success Metrics

| Metric | Current Baseline | Target | Measurement Method |
| ------ | ---------------- | ------ | ------------------ |
| Shared-stage parity | implicit only | explicit contract | command/test coverage |
| UI-first guidance coverage | partial | present across 0/1/2/3/4/5/6 | command/test coverage |
| Vertical Template constraint coverage | partial | explicit | command/template coverage |
| Feature validation slice | not implemented | pass | generator/build/tests |

## Constraints

| Constraint Type | Description | Impact on Solution |
| --------------- | ----------- | ------------------ |
| Compatibility | Existing non-app flows must not regress | shared stages, conditional app-only gates |
| Scope | Change should land in canonical command sources | update `.specify/commands/`, templates, generated mirrors, tests |
| Release safety | Generated mirrors and goldens must stay in sync | run generator and byte-equivalence tests |

## Problem-Solution Fit

**Software needed?** Yes

**Simpler alternatives considered**:

1. **Documentation-only note**: insufficient because the shipped command
   surfaces would still miss the new workflow contract.
2. **Separate app-only pipeline**: rejected because it would fragment Gofer and
   risk losing non-app functionality.
3. **Late-stage UI tweaks only**: rejected because the user explicitly needs UI
   approval before plan/tasks completion.

## Recommendation

**Proceed**: YES
**Confidence**: High
**Rationale**: The feature is a clear fit for Gofer's canonical command and
template layer. The needed behavior is largely workflow-contract work, which can
be implemented with constrained edits plus surface regeneration and targeted
tests.

