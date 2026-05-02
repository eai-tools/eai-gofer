---
feature: '030-vscode-surface-truth-cleanup'
created: 2026-04-30T22:14:14.406+10:00
updated: 2026-04-30T22:50:11+10:00
validator: Copilot
status: complete
---

# Requirements Quality Checklist: VS Code Surface Truth Cleanup

## Summary

| Metric | Value |
| ------ | ----- |
| Total research / proposal items checked | 28 |
| COVERED | 28 |
| MISSING | 0 |
| Research coverage | **100.0% (28/28)** |
| Quality checklist overall | **PASS** |

---

## Part 1: Research Integration Validation

### Coverage Matrix

| Research Finding | Type | Spec Section | Status |
| ---------------- | ---- | ------------ | ------ |
| research.md Integration Point 1 — Manifest ↔ runtime command wiring | Integration Point | US-001; FR-001; FR-002; FR-013; Explicit Integration Map (IAP-030-01) | COVERED |
| research.md Integration Point 2 — Manifest ↔ config helper layer | Integration Point | US-002; FR-005; FR-006; FR-007; Explicit Integration Map (IAP-030-03) | COVERED |
| research.md Integration Point 3 — Canonical command docs ↔ generated mirrors | Integration Point | US-004; FR-010; FR-011; Explicit Integration Map (IAP-030-02) | COVERED |
| research.md Integration Point 4 — Docs ↔ implementation contract | Integration Point | US-003; FR-003; FR-004; FR-008; FR-009; Explicit Integration Map (IAP-030-01) | COVERED |
| research.md Target Persona constraint — Multiple truth surfaces already exist | Constraint | Overview; Glossary (`Truth drift`) | COVERED |
| research.md Target Persona constraint — Archived specs must remain historical only | Constraint | Edge Cases; FR-016; NFR-007; Out of Scope | COVERED |
| research.md Target Persona constraint — Cleanup should favor removal/correction over new capability work | Constraint | Overview; A-003; Out of Scope | COVERED |
| research.md Constraint — `extension/package.json` changes affect multiple UI surfaces | Constraint | NFR-002; Glossary (`Manifest`) | COVERED |
| research.md Constraint — Command registration is split across files and depends on activation order | Constraint | FR-002; NFR-005 | COVERED |
| research.md Constraint — Runtime-only commands may be internal and should remain undocumented | Constraint | US-001 acceptance criteria; Edge Cases; NFR-004; A-006 | COVERED |
| research.md Constraint — Workspace mirror sync must remain non-destructive | Constraint | Edge Cases; NFR-003; D-004 | COVERED |
| research.md Constraint — Shorter, clearer docs are safer than duplicated long-form claims | Constraint | NFR-006 | COVERED |
| research.md Brownfield constraint — Manifest contract must remain valid | Constraint | D-001; NFR-002 | COVERED |
| research.md Brownfield constraint — Generator duplication (TypeScript + Node paths) should not expand | Constraint | FR-011; NFR-008 | COVERED |
| research.md Extra caution — Command IDs are string-coupled to menus, keybindings, and tree views | Constraint | US-001 acceptance criteria; FR-002; NFR-005; Research Traceability | COVERED |
| research.md Extra caution — Hydrate prompt resource naming drift could break user-visible flows | Constraint | US-004 acceptance criteria; FR-012; SC-006; Explicit Integration Map (IAP-030-04) | COVERED |
| research.md Extra caution — Settings may still be read directly outside `ConfigManager` | Constraint | Edge Cases; FR-007 | COVERED |
| research.md Technology Decision 1 — Use manifest + runtime as authoritative current contract | Technology Decision | Overview; A-001; FR-001; FR-002 | COVERED |
| research.md Technology Decision 2 — Correct/remove stale claims instead of rebuilding old features | Technology Decision | Overview; FR-008; Out of Scope | COVERED |
| research.md Technology Decision 3 — Avoid new dependencies | Technology Decision | Overview; NFR-001; SC-008 | COVERED |
| proposal-review.md Recommended scenario — Truth-alignment cleanup across manifest, runtime, docs, and tests | Approved Decision | Overview; US-001 to US-005; FR-013 to FR-015; Explicit Integration Map | COVERED |
| proposal-review.md Recommended architecture — Use manifest + runtime truth, then align docs and targeted tests | Approved Decision | Overview; A-001; FR-001; FR-002; FR-013 to FR-015 | COVERED |
| proposal-review.md Key decision — Use `extension/package.json` as the public VS Code contract | Approved Decision | Overview; A-001; FR-001 | COVERED |
| proposal-review.md Key decision — Treat runtime-only internal commands as internal unless proven otherwise | Approved Decision | US-001 acceptance criteria; Edge Cases; NFR-004; A-006 | COVERED |
| proposal-review.md Key decision — Avoid new dependencies | Approved Decision | Overview; NFR-001; SC-008 | COVERED |
| proposal-review.md User override — Continue through implementation and validation without stopping after research | Approved Override | Delivery Continuation Note; A-008; Research Traceability | COVERED |
| proposal-review.md User override — Prioritize truthfulness and reliability over preserving stale long-form claims | Approved Override | Overview; A-003; NFR-006; Out of Scope | COVERED |
| proposal-review.md User override — Do not invent new functionality solely to make old documentation true again | Approved Override | Overview; A-003; NFR-004; Out of Scope | COVERED |

### Missing Coverage

None. All 28 checked research/proposal items are now represented in the spec package.

---

## Part 2: Quality Checklist

### 1. Content Quality — PASS

- [x] Overview is user-focused and explains the business problem in plain language.
- [x] User stories are role-based and outcome-oriented.
- [x] Out of Scope clearly protects against solution creep.
- [x] Repo-specific references are appropriate for this brownfield repo-maintenance cleanup spec.
- [x] Documentation quality requirements now define a user-facing clarity standard instead of relying on a vague “shorter docs” heuristic.

### 2. Requirement Completeness — PASS

- [x] The spec includes Overview, User Stories, FRs, NFRs, Success Criteria, Assumptions, Dependencies, and Out of Scope.
- [x] Requirements are traceable to research and proposal decisions.
- [x] Command-ID coupling across menus, keybindings, view actions, and tree actions is now explicit.
- [x] The approved continuation-through-validation override is now represented in the spec package.
- [x] Internal-only commands and settings are explicitly handled.

### 3. Research Integration — PASS

- [x] All 4 integration points from research.md are covered.
- [x] All 3 technology decisions from research.md are covered.
- [x] All 28 research/proposal items in the current matrix are represented.
- [x] The prior command-ID coupling gap is closed.
- [x] The prior proposal-review process override gap is closed.

### 4. Acceptance Criteria — PASS

- [x] Every user story has checkable acceptance criteria.
- [x] Acceptance criteria are concrete enough to audit against the current manifest, runtime, docs, and generated mirrors.
- [x] The earlier OR-style ambiguity around command-ID coupling and continuation metadata has been resolved.
- [x] US-003 AC3 is now anchored to the release that implements this spec rather than an undefined “current version” concept.
- [x] US-004 cleanly separates generated-mirror scope from user-facing documentation scope.

---

## Specific Remaining Gaps (Non-Blocking)

1. **SC-009 is still only partially measurable**: it references the “initial
   research audit” as the baseline, but that baseline is not frozen as a single,
   enumerated artifact or count. If desired, replace it with a countable audit
   list or a direct stale-claim count.

These are spec-polish items, not blockers for planning or implementation.

---

## Overall Verdict

**PASS** — The updated spec now qualifies as a validated contract for this
brownfield cleanup. Research/proposal coverage is **100.0% (28/28)**, missing
item count is **0**, and the remaining issues are minor polish rather than
blocking gaps.
