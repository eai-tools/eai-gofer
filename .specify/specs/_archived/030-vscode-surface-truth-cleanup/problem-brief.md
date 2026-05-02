---
feature: '030-vscode-surface-truth-cleanup'
created: '2026-04-30T19:40:36.174+10:00'
validated-by: Copilot + douglaswross
status: draft
---

# Problem Brief: 030-vscode-surface-truth-cleanup

## Problem Statement

**As Stated**: The VS Code-facing Gofer documentation is very long and likely
contains commands, configuration, and workflow claims that are no longer true
or no longer functioning.

**Refined**: Gofer has a VS Code surface truth problem: commands, settings,
documentation, and generated mirrors are no longer reliably aligned, so users
and maintainers cannot trust what is actually supported.

## Root Cause Analysis (5 Whys)

| Level | Question | Answer |
| ----- | -------- | ------ |
| Why 1 | Why is the VS Code surface not trustworthy? | Because users can find commands, settings, and workflow guidance that may not match what currently works. |
| Why 2 | Why do those mismatches exist? | Because the same product surface is described in the manifest, runtime wiring, docs, and generated mirrors. |
| Why 3 | Why are those places drifting apart? | Because implementation changes are not consistently followed by documentation and mirror cleanup. |
| Why 4 | Why is sync not happening consistently? | Because no strong validation gate or owner enforces public VS Code truth across all surfaces. |
| Why 5 | Why is there no enforcement? | Because the repo expanded quickly across multiple AI and CLI surfaces without a matching truth-maintenance lifecycle. |

**Root Cause Summary**: The real problem is governance and source-of-truth
drift, not just long documentation. Too many public-facing surfaces can make
claims, and nothing reliably keeps them aligned.

## Stakeholder Impact

| Stakeholder | Impact Level | Frequency | Cost per Occurrence | Annual Impact |
| ----------- | ------------ | --------- | ------------------- | ------------- |
| Repo maintainers | High | Weekly | 2-6 hours of audit/support/rework | 100-300 hours |
| VS Code extension users | High | Ongoing | 15-60 minutes of confusion or failed setup per incident | 25-150 hours collectively |
| New adopters/evaluators | Medium | Ongoing | Lost trust during first-run evaluation | Directional trust loss |
| Future contributors | Medium | Monthly | Rework caused by stale assumptions | 20-80 hours |

## Business Case

| Metric | Value |
| ------ | ----- |
| Cost of doing nothing (annual) | 125-450 avoidable hours plus trust/support drag |
| Estimated value of solving | Recover most of those hours and reduce repeated confusion |
| Payback period | 2-6 weeks of focused cleanup effort |
| Confidence level | Medium |

## Success Metrics

| Metric | Current Baseline | Target | Measurement Method |
| ------ | ---------------- | ------ | ------------------ |
| Active legacy specs | 3 active top-level legacy specs before cleanup | 0 active legacy specs beyond the new cleanup spec | Inspect top-level `.specify/specs/` |
| Command truthfulness | Unknown and likely drifted | 100% documented commands map to supported commands | Compare docs against current command contributions and runtime wiring |
| Configuration truthfulness | Unknown and likely drifted | 100% documented settings map to current supported configuration | Compare docs against extension configuration contributions and usage |
| Workflow truthfulness | Unknown and likely drifted | 0 unsupported VS Code workflow claims remain | Audit high-risk docs and generated mirrors |

## Constraints

| Constraint Type | Description | Impact on Solution |
| --------------- | ----------- | ------------------ |
| Budget | No separate tooling budget assumed | Favors repo-local cleanup using existing tooling |
| Timeline | Should happen before more VS Code-facing claims are added | Prioritizes truth-alignment over feature expansion |
| Technical | Current manifest/runtime/docs are already divergent | Requires audit-first sequencing before any new messaging |
| Regulatory | No sector regulation drives this work | The main pressure is product trust and support quality |

## Problem-Solution Fit

**Software needed?** Partial

**Simpler alternatives considered**:

1. **Process change**: Add manual release review for docs and commands — helpful,
   but too easy to miss without stronger checks.
2. **Existing tool**: Use external docs tooling or linting only — useful for
   hygiene, but it does not verify that VS Code behavior is actually supported.
3. **Manual workaround**: Rely on maintainer knowledge and ad hoc clarification —
   cheap upfront, but it keeps the trust problem alive.

## Assumptions

- [ ] `extension/package.json` and live runtime wiring are the closest available
      truth source for public VS Code behavior — UNVALIDATED
- [ ] Users rely on README and VS Code-facing documentation during setup and
      evaluation — UNVALIDATED
- [ ] Most of the value can be captured by cleanup and targeted fixes rather
      than new capability work — UNVALIDATED
- [ ] Archived legacy specs should no longer influence active product claims —
      UNVALIDATED

## Recommendation

**Proceed**: YES
**Confidence**: High
**Rationale**: The problem is real, recurring, and relatively inexpensive to
address compared with the wasted time and trust loss it creates. The right next
step is to proceed with a repo-owned cleanup effort that treats truth-alignment
as the primary outcome.

## Approval

- [x] Problem validated by stakeholder
- [x] Root cause confirmed
- [x] Business case accepted
- [x] Constraints acknowledged
- [x] Assumptions documented
