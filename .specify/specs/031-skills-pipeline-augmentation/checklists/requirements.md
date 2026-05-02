---
feature: '031-skills-pipeline-augmentation'
created: 2026-04-30
validator: Copilot
status: complete
---

# Requirements Quality Checklist: Skills Pipeline Augmentation

## Executive Summary

| Metric | Value |
| --- | --- |
| Total research / proposal / context items checked | 28 |
| COVERED | 28 |
| PARTIAL / MISSING | 0 |
| Research coverage | **100% (28/28)** |
| Scope alignment | **PASS** |
| Planning readiness | **PASS** |

**Planning note:** This checklist originally flagged FR-011 as unresolved. The
current `spec.md` and `plan.md` now define a deterministic `DEPLOY_IN_SCOPE`
rule, so planning is ready. The checklist is retained as traceability for the
earlier validation pass.

---

## 1. Research Integration Coverage

### Coverage Matrix

| Research / Proposal Item | Type | Spec Evidence | Status | Notes |
| --- | --- | --- | --- | --- |
| research.md Recommended scenario — focused additive pack | Research decision | Overview; FR-001 to FR-005; Out of Scope | COVERED | Spec adopts the approved five-helper first wave rather than a broad mirror |
| research.md Decision 1 — preserve numbered pipeline stages | Research decision | Overview; FR-007 to FR-008; NFR-003; Out of Scope | COVERED | Numbered stage sequence remains unchanged |
| research.md Decision 2 — `.specify/commands/` is the sole source of truth | Research decision | FR-006; FR-016; Dependencies; Integration Map | COVERED | Canonical command authorship remains centralized |
| research.md Decision 5 — require cross-CLI parity for standalone helpers | Research decision | US-2; FR-006; NFR-001; Integration Map | COVERED | Claude, Copilot, Codex, and Gemini are all named explicitly |
| research.md Recommended architecture — hybrid helper + stage-local augmentation | Research decision | US-2; US-4; Integration Map | COVERED | Standalone helpers plus optional stage-local seams are both present |
| research.md Likely augmentation gap — vocabulary / ubiquitous language | Research gap | US-2 AC-2; FR-001 | COVERED | `gofer:vocabulary` is explicitly in scope |
| research.md Likely augmentation gap — standalone diagnose loop | Research gap | US-2 AC-3; FR-002 | COVERED | `gofer:diagnose` is explicitly in scope |
| research.md Likely augmentation gap — tighter TDD helper | Research gap | US-2 AC-4; US-4; FR-003 | COVERED | `gofer:tdd` is explicitly in scope and tied to `/5` and `/9` |
| research.md Likely augmentation gap — business-friendly summary writer | Research gap | US-2 AC-5; FR-004 | COVERED | `gofer:spec-summary` covers the approved `to-prd` adaptation |
| research.md Likely augmentation gap — zoom-out system helper | Research gap | US-2 AC-6; FR-005 | COVERED | `gofer:zoom-out` is explicitly in scope |
| research.md Required `/6` fix — mandatory integration proof gate | Required `/6` fix | US-1 AC-1; FR-009; SC-003 | COVERED | Category 5 cannot score without runtime integration proof |
| research.md Required `/6` fix — mandatory real test execution gate | Required `/6` fix | US-1 AC-2; FR-010; SC-004 | COVERED | Categories 1 and 2 require executed test-suite output |
| research.md Required `/6` fix — mandatory deployment / render verification when in scope | Required `/6` fix | US-1 AC-3; FR-011; NFR-005 | COVERED | The spec now distinguishes no-UI redistribution, render-only proof, and deploy-scoped proof explicitly |
| research.md Required `/6` fix — no fabricated or implied evidence | Required `/6` fix | Overview; US-1 AC-5; FR-012; NFR-005 | COVERED | The spec explicitly forbids scoring from absent or unverifiable proof |
| research.md Required `/6` fix — honest zero scoring when proof is missing | Required `/6` fix | US-1 AC-1; US-1 AC-2; US-1 AC-5; FR-012 | COVERED | Zero-score behavior is explicit |
| research.md Required `/6` fix — evidence table in `validation-report.md` | Required `/6` fix | US-3; FR-013 to FR-014; SC-005 | COVERED | PASS and FAIL runs both require the evidence table |
| proposal-review.md Approved scenario — focused additive pack | Approved decision | Overview; FR-001 to FR-005; Out of Scope | COVERED | The spec reflects the chosen scenario rather than a broad workflow pack |
| proposal-review.md Approved architecture — hybrid helper + stage-local model | Approved decision | US-2; US-4; Integration Map | COVERED | The spec preserves both standalone and stage-local paths |
| proposal-review.md User override — no new `/6A.x` stages | Approved override | Overview; FR-015; Out of Scope | COVERED | This is explicit in multiple sections |
| proposal-review.md User override — add helpers cross-CLI across Claude, Copilot, Codex, and Gemini | Approved override | US-2; FR-006; NFR-001; Integration Map | COVERED | Four-CLI parity is explicit and testable |
| proposal-review.md Approved first-wave skill set | Approved decision | Overview; FR-001 to FR-005 | COVERED | Vocabulary, diagnose, tdd, spec-summary, and zoom-out are all present |
| proposal-review.md Approved `/6` truthfulness hardening inside existing stage | Approved decision | US-1; FR-009 to FR-015; SC-003 to SC-005 | COVERED | `/6` hardening is inside the existing stage, not delegated elsewhere |
| context-bundle.md Protected boundary — do not renumber stages or duplicate stage responsibilities | Context boundary | FR-007 to FR-008; NFR-003; Out of Scope | COVERED | Pipeline numbering is protected and no new numbered stages are added |
| context-bundle.md Protected boundary — do not hand-edit generated mirror surfaces | Context boundary | FR-016; Integration Map | COVERED | The spec forbids provider-specific hand-maintained command surfaces |
| context-bundle.md Relevant code paths — generator, parser, state, routing boundaries matter | Context boundary | Dependencies; NFR-003; Integration Map | COVERED | Generator/parser/runtime constraints are represented in dependencies and NFRs |
| context-bundle.md Non-application classification — no 4-step journey required | Context decision | Section 11; Section 12 | COVERED | The spec truthfully marks this as non-application workflow work |
| reuse-scan.md Cross-CLI rule — adopted helpers should be Gofer commands, provider specifics wrapped | Reuse decision | FR-006; FR-016; NFR-001 | COVERED | The spec preserves Gofer-owned, cross-surface command contracts |
| reuse-scan.md Defer conditional or low-value skills outside the first wave | Reuse decision | Out of Scope | COVERED | `to-issues`, `grill-me`, `triage`, `grill-with-docs`, and other non-first-wave items are deferred |
| reuse-scan.md Do not mirror upstream skills verbatim; adapt concepts into Gofer-owned behavior | Reuse decision | Overview; FR-017; Out of Scope | COVERED | The spec explicitly adopts concepts, not upstream files |

### Missing Coverage

No blocking coverage gaps remain.

---

## 2. Requirements Quality Checklist

### Content Quality — PASS

- [x] The overview clearly explains the two linked goals: helper-skill
      augmentation and truthful `/6` hardening.
- [x] User stories are role-based and outcome-focused.
- [x] The spec is truthful about being non-application workflow/platform work.
- [x] Out-of-scope boundaries clearly exclude full-skill mirroring and new
      `/6A.x` stages.

### Requirement Completeness — PASS

- [x] The first-wave helper set is explicit and complete.
- [x] Cross-CLI parity across Claude, Copilot, Codex, and Gemini is explicit.
- [x] The spec explicitly forbids new `/6A.x` stages.
- [x] Runtime integration, real test execution, zero-scoring, and evidence-table
      gates are all explicitly required inside `/6`.
- [x] FR-011 now makes the deployment/render gate fully testable with explicit
      `HAS_UI` and `DEPLOY_IN_SCOPE` branches.

### Research / Proposal Alignment — PASS

- [x] The approved proposal-review scenario is reflected accurately.
- [x] The approved proposal-review architecture is reflected accurately.
- [x] The research-backed first-wave helpers are all in scope.
- [x] The source-of-truth, generator, and pipeline-stability constraints are
      preserved.
- [x] The spec correctly treats `/6` hardening as an internal stage fix, not a
      new stage family.

### Acceptance Criteria Quality — PASS

- [x] Every user story has independently testable acceptance criteria.
- [x] US-1 clearly covers missing runtime proof, missing test proof, and zero
      scoring on absent evidence.
- [x] US-2 clearly covers the five approved helper commands and four-CLI
      emission.
- [x] US-3 clearly requires an evidence table on both PASS and FAIL validation
      runs.
- [x] The deployment/render evidence path is fully testable through the explicit
      Category 3 gate branches.

---

## 3. Concrete Gaps Resolved Before Planning

### Previously Blocking, Now Resolved

1. **FR-011 deployment/render scope detection**
   - `/6_gofer_validate` now distinguishes:
     - `HAS_UI = false` → Category 3 is not in scope and redistributes
     - `HAS_UI = true` and `DEPLOY_IN_SCOPE = false` → local render proof required
     - `HAS_UI = true` and `DEPLOY_IN_SCOPE = true` → deploy/live proof required
   - The spec, plan, tasks, and contract pack now describe the same rule.

### Non-Blocking Polish

1. Consider naming the artifact contracts for `gofer:diagnose`, `gofer:tdd`, and
   `gofer:zoom-out` with the same specificity already used for `glossary.md`.
2. Consider making the US-4 stage-local trigger mechanism more explicit so
   “consistent with standalone invocation” is easier to test.

---

## Overall Assessment

**Scope alignment: PASS. Planning readiness: PASS.**

The spec clearly includes:

- **no new `/6A.x` stages**
- **truthful `/6` runtime / test / deployment evidence gates**
- **cross-CLI parity across Claude, Copilot, Codex, and Gemini**
- **the approved first-wave helper skills in scope**

Research and proposal coverage is **100% (28/28)**. The earlier FR-011 blocker
is now closed, so the requirements pack is internally consistent and ready for
planning and downstream validation.
