---
feature: 034-gofer-operating-layer
created: 2026-05-28
discoveredBy: Codex + User
status: complete
classification: non-application platform tooling
---

# Business Discovery: Gofer Operating Layer

## Problem Statement

**Pain point**: Gofer already has strong EAI-specific business, application, process,
and documentation workflows, but its operating layer is not yet as complete as ECC's
cross-harness productization layer.

**Current state**: Gofer ships generated assistant surfaces, VS Code extension
resources, a public plugin bundle, and a Codex doctor. ECC provides stronger patterns
for install-state, multi-harness compliance evidence, doctor/repair/uninstall flows,
release gates, observability readiness, and adapter scorecards.

**Impact**: Without a stronger operating layer, Gofer can deliver the right EAI
workflow but still be harder to install, diagnose, upgrade, audit, and trust across
Claude, Codex, Copilot, Gemini, and VS Code.

## User Constraint

The user explicitly requires:

- Do not lose any current EAI Gofer functionality.
- Improve anything Gofer and ECC both do where ECC's version is stronger.
- Add ECC-derived capabilities that Gofer does not currently provide.
- Keep Gofer focused on EAI platform delivery, business processes, applications,
  and business documentation rather than becoming a generic ECC clone.

## Target Users

| Persona | Need |
| --- | --- |
| Gofer maintainer | Release and validate Gofer safely across all supported surfaces. |
| EAI delivery engineer | Install, run, diagnose, and repair Gofer in customer/project environments. |
| Business/student user | Use Gofer without understanding assistant-specific install details. |
| Platform stakeholder | Trust that Gofer outputs are auditable, supportable, and grounded in available EAI capabilities. |

## Value Proposition

**Primary value**: Make Gofer operationally reliable across assistant harnesses
without reducing or changing its EAI workflow capability.

## Success Metrics

| Metric | Target | Measurement |
| --- | --- | --- |
| Capability retention | 0 removed numbered stages, helper commands, generated surfaces, extension resource flows, or EAI workflow artifacts | Regression tests and manifest diff review |
| Surface truthfulness | 100 percent of supported surfaces have state, risk notes, owner, install/onramp, and verification commands | Compliance matrix validator |
| Release readiness | Public VSIX, plugin bundle, manifests, docs, generated surfaces, and EAI boundary checks pass before publication | Release approval gate |
| Supportability | One command produces a redacted diagnostic report across Gofer, assistant surfaces, and EAI CLI state | `gofer doctor` report |
| EAI grounding | Service-fit and planning decisions cite actual public EAI command/resource evidence when available | EAI capability health gate |

## Application Classification

| Field | Decision |
| --- | --- |
| Classification | Non-application platform tooling |
| Reason | This improves Gofer itself rather than building an EAI vertical app or user workflow. |
| Four-step AI journey required | No |

## Competitive / Reference Analysis

**Status**: Researched.

Reference repo: `affaan-m/ecc` at commit `928076c`.

ECC patterns to adapt:

- Harness adapter compliance matrix.
- Install-state lifecycle commands.
- Preview-pack smoke and release approval gates.
- Observability readiness checks.
- Selective install/catalog thinking.
- Runtime support and diagnostic posture.

ECC patterns not to copy:

- Broad generic skill catalog.
- Generic harness OS positioning.
- Non-EAI platform defaults.

