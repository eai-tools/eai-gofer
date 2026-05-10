---
feature: '032-gofer-ui-first-builder'
created: '2026-05-10T09:31:57Z'
audience: downstream-agents
workflowProfile: enterpriseai
---

# Context Bundle: 032-gofer-ui-first-builder

## Compact Summary

This feature upgrades Gofer's shipped workflow contract so app-delivery runs
gain a UI-first preview, approval, and service-fit branch while non-app runs
keep the same shared numbered stages without app-only gates.

## Selected Scenario

| Item | Detail |
| ---- | ------ |
| Business outcome | safer UI-first app delivery without losing non-app functionality |
| Primary users | Gofer maintainers, workflow designers, downstream AI agents |
| Value metric | command/template/test parity with explicit dual-mode behavior |
| EnterpriseAI vertical | Gofer workflow platform |
| App classification | non-app workflow feature with app-delivery branch enhancements |
| Pipeline mode | shared numbered stages, dual-mode behavior |

## AI-Augmented Journey Summary

Not applicable for this feature run. The feature introduces the future
app-delivery path: brief -> preview -> approval -> service fit.

## Carry-Forward Context

| Source | Why It Matters | Keep / Skip |
| ------ | -------------- | ----------- |
| `discovery.md` | platform-level problem framing | Keep |
| `research.md` | implementation surface and test evidence | Keep |
| `reuse-scan.md` | compatibility-first decisions | Keep |
| `contract-pack.md` | actor/workflow/runtime rules | Keep |

## EnterpriseAI Platform Context

| Area | Decision / Assumption | Evidence |
| ---- | --------------------- | -------- |
| Object types | feature-local workflow artifacts only | `reuse-scan.md` |
| Tenant boundaries | no tenant runtime change in this feature | `research.md` |
| APIs/events | capability-discovery commands named, not executed here | `research.md` |
| Deployment target | regenerated command surfaces and extension resources | `research.md` |
| Validation criteria | generator/build/focused tests | `validation-report.md` |

## Next Agent Instructions

- Preserve the non-app compatibility rule.
- Treat app-delivery preview/service-fit artifacts as future-run outputs, not as
  required outputs of this non-app feature run.
- Prefer command/template changes over runtime refactors unless new evidence
  says otherwise.

