# Requirement Traceability Matrix: 031-skills-pipeline-augmentation

## Executive Summary

This artifact maps the approved specification to the implementation plan and the
task breakdown for feature `031-skills-pipeline-augmentation`.

- **User stories covered:** 4 / 4
- **Acceptance criteria covered:** 18 / 18
- **Plan phases covered:** 6 / 6
- **Data-model entities covered:** 5 / 5
- **Internal contract surfaces covered:** 6 / 6
- **Lifecycle events covered:** 4 / 4
- **Status:** **VALIDATION PASSED**

> **Note:** `tasks.md` uses 8 execution phases. Those 8 phases implement the 6
> phases defined in `plan.md` plus two pre-plan execution sections
> (Setup and Foundational) that establish the repo baseline and budget gate.

---

## 1. Spec → Plan → Tasks Mapping

| User Story | Priority | Plan Phase(s) | Implementing Task(s) | Status |
| --- | --- | --- | --- | --- |
| US-1 Truthful Validation Gate | P1 | Phase 3, Phase 6 | T012-T016, T026, T035-T038 | Mapped |
| US-2 Cross-CLI Helper Commands | P1 | Phase 1, Phase 2, Phase 5, Phase 6 | T003-T011, T021-T025, T027-T031, T033-T034, T039 | Mapped |
| US-3 Evidence Table in Validation Report | P2 | Phase 3, Phase 5, Phase 6 | T015-T016, T026, T035-T037 | Mapped |
| US-4 Stage-Local Augmentation | P3 | Phase 4, Phase 5, Phase 6 | T017-T020, T025, T039 | Mapped |

---

## 2. Acceptance Criteria Detail

| ID | Criterion | Task(s) | Plan Phase |
| --- | --- | --- | --- |
| US1-AC1 | Category 5 scores 0 without runtime integration proof | T013, T014, T026, T036 | Phase 3, 5, 6 |
| US1-AC2 | Categories 1 and 2 score 0 without executed test output | T013, T014, T026, T036 | Phase 3, 5, 6 |
| US1-AC3 | Deploy/render-scoped features fail without deploy/render proof | T012, T013, T026, T036 | Phase 3, 5, 6 |
| US1-AC4 | Fully evidenced `/6` run writes `validation-report.md` with populated evidence table | T015, T026, T036 | Phase 3, 5, 6 |
| US1-AC5 | Absent or unverifiable evidence scores exactly 0 | T013, T014, T026 | Phase 3, 5 |
| US2-AC1 | Five helper definitions emit to all supported CLI surfaces | T004-T011, T025, T034 | Phase 1, 2, 5, 6 |
| US2-AC2 | `gofer:vocabulary` writes `.specify/specs/{feature}/glossary.md` | T004, T025, T039 | Phase 1, 5, 6 |
| US2-AC3 | `gofer:diagnose` writes a structured diagnose artifact | T005, T025 | Phase 1, 5 |
| US2-AC4 | `gofer:tdd` guides a red-green-refactor loop tied to spec ACs | T006, T025, T039 | Phase 1, 5, 6 |
| US2-AC5 | `gofer:spec-summary` writes a business-friendly feature summary | T007, T025 | Phase 1, 5 |
| US2-AC6 | `gofer:zoom-out` writes a structured system-context artifact | T008, T025 | Phase 1, 5 |
| US2-AC7 | Helper work does not alter numbered pipeline sequence or state | T001, T016, T020, T025, T038 | Setup, 3, 4, 5, 6 |
| US3-AC1 | PASS reports include a structured evidence table | T015, T026, T036 | Phase 3, 5, 6 |
| US3-AC2 | FAIL reports include 0-score categories and absence reasons | T015, T026, T036 | Phase 3, 5, 6 |
| US3-AC3 | Evidence table is additive and backward-compatible | T015, T016, T026 | Phase 3, 5 |
| US4-AC1 | Approved stage-local seams use provider-neutral activation selectors and preserve standalone artifact format | T017-T020, T025, T039 | Phase 4, 5, 6 |
| US4-AC2 | No new numbered stages are introduced | T001, T016, T020, T025, T038 | Setup, 3, 4, 5, 6 |
| US4-AC3 | Generator re-emits supported CLI surfaces after seam changes | T020, T025, T034 | Phase 4, 5, 6 |

---

## 3. Plan Phase Coverage

| Plan Phase | Scope | Task Coverage | Status |
| --- | --- | --- | --- |
| Phase 1 — Helper Command Definitions | Author five canonical `gofer_*.md` files | T004-T008 | Covered |
| Phase 2 — Generator Wiring and Cross-CLI Emission | Budget gate, dry-run, real generation, Codex doctor | T003, T009-T011 | Covered |
| Phase 3 — `/6` Validate Hardening | `DEPLOY_IN_SCOPE`, evidence gates, honest scoring, evidence table | T012-T016 | Covered |
| Phase 4 — Stage-Local Augmentation Seams | Optional helper seams in `/1`, `/2`, `/5` with activation selectors | T017-T020 | Covered |
| Phase 5 — Test Suite | New tests, count updates, fixture refreshes, manifest alignment | T021-T032 | Covered |
| Phase 6 — Integration Smoke and Final Verification | Full suite, smoke runs, audit history, protected file checks | T033-T039 | Covered |

---

## 3.1 Final PASS Smoke Support Surfaces

The final archived PASS smoke used to close `/6` relies on the following real
support surfaces in addition to the core helper-command files. These surfaces
carry the release/resource-sync and managed-write evidence chain referenced by
T034, T036, and T039.

| Support Surface | Role in Final PASS Evidence | Task(s) |
| --- | --- | --- |
| `.specify/scripts/node/sync-extension-resources.mjs` | Canonical resource-sync path used by release packaging and smoke integration proof | T034, T036 |
| `tests/unit/scripts/sync-extension-resources.test.ts` | Direct error-path proof that non-`ENOENT` sync failures are surfaced honestly | T036, T039 |
| `release-auto.sh` | Release ordering and canonical sync-path proof for packaged resources | T034, T036 |
| `extension/src/services/migration/ResourceSyncer.ts` | Managed workspace sync safety for extension-installed resources | T036 |
| `tests/unit/scripts/extension-package-wiring.test.ts` | Confirms packaged resource wiring follows the Node sync path | T034, T036 |
| `tests/unit/scripts/hook-wiring.test.ts` | Confirms generated hook/resource wiring stays aligned with canonical sync | T034, T036 |
| `tests/unit/release/release-verification.test.ts` | Guards release ordering and forbids regression to the old shell sync path | T034, T036 |
| `tests/unit/extension/ResourceSyncer.workspace-sync.test.ts` | Proves workspace sync rejects symlinked managed writes | T036 |
| `tests/unit/scripts/vsix-packaging.test.ts` | Confirms VSIX payload includes the updated command/resource surfaces | T034, T036 |

---

## 4. Data Entity Coverage

| Data-Model Entity | Implementing Task(s) | Notes |
| --- | --- | --- |
| CommandDefinition | T003-T011 | Covers helper definitions, budget registration, and generator emission |
| GeneratedSurfaceArtifact | T009-T011, T020, T025, T034 | Covers emitted Claude/Copilot/Codex/Gemini surfaces and singleton generator outputs |
| StageAugmentationBinding | T017-T020, T025, T039 | Covers `/1 → gofer:vocabulary` (selector: `vocabulary`), `/1 → gofer:zoom-out` (selector: `zoom-out`), `/2 → gofer:vocabulary` (selector: `vocabulary`), `/2 → gofer:spec-summary` (selector: `spec-summary`), `/5 → gofer:tdd` (selector: `tdd-assist`), `/5 → gofer:diagnose` (selector: `diagnose`) |
| FeatureArtifact | T004-T008, T015, T025, T036-T039 | Covers `glossary.md`, `diagnose-report.md`, `tdd-session.md`, `spec-summary.md`, `zoom-out-report.md`, `validation-report.md`, `blast-radius-report.md`, the blast-radius required sections (`changed surfaces`, `risk vectors`, `containment summary`), and the required provenance schema (`GeneratedAt`, `SourceCommandId`, `SourceInputs`, `OverwriteNoticeWhenApplicable`) |
| ValidationEvidenceRecord | T012-T016, T026, T036-T037 | Covers the evidence gate contract and the required 11-category evidence table |

---

## 5. API / Contract Coverage

### External API Coverage

| Contract | Coverage | Status |
| --- | --- | --- |
| API-031-00 | No external API surface is required for this feature | Covered |

### Internal Contract Coverage

| Contract | Scope | Implementing Task(s) | Status |
| --- | --- | --- | --- |
| IAP-031-01 | Helper command definitions and approved stage-local seams | T004-T011, T017-T020 | Covered |
| IAP-031-02 | Helper artifact output paths under `.specify/specs/{feature}/` | T004-T008, T025, T039 | Covered |
| IAP-031-03 | Validation evidence gates for Categories 1, 2, 3, and 5 | T012-T014, T026, T036 | Covered |
| IAP-031-04 | Cross-CLI surface generation from `.specify/commands/` | T009-T011, T020, T025, T034 | Covered |
| IAP-031-05 | Evidence table schema in `validation-report.md` | T015-T016, T026, T036-T037 | Covered |
| IAP-031-06 | Hardened `/6` scoring rules without new `/6A.x` stages | T013-T016, T026, T036 | Covered |

### Lifecycle Event Coverage

| Event | Trigger | Implementing Task(s) | Status |
| --- | --- | --- | --- |
| EVT-031-01 | Helper invocation produces a feature artifact | T004-T008, T017-T020, T039 | Covered |
| EVT-031-02 | `generate-commands.mjs` emits surfaces and singleton outputs | T009-T011, T020, T034 | Covered |
| EVT-031-03 | `/6` evidence gate evaluation blocks unverifiable scoring | T012-T014, T026, T036 | Covered |
| EVT-031-04 | Validation report emission writes additive evidence data | T015-T016, T026, T036-T037 | Covered |

---

## 6. Coverage Summary

| Dimension | Total | Covered | Status |
| --- | --- | --- | --- |
| User Stories | 4 | 4 | 100% |
| Acceptance Criteria | 18 | 18 | 100% |
| Functional Requirements | 17 | 17 | 100% |
| Non-Functional Requirements | 6 | 6 | 100% |
| Plan Phases | 6 | 6 | 100% |
| Data-Model Entities | 5 | 5 | 100% |
| Internal Contract Surfaces | 6 | 6 | 100% |
| Lifecycle Events | 4 | 4 | 100% |

**Validation verdict:** **VALIDATION PASSED**

Feature `031-skills-pipeline-augmentation` is fully traced from specification to
plan, task breakdown, implementation, and validation evidence.
