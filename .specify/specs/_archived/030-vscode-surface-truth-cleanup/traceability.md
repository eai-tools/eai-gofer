---
feature: '030-vscode-surface-truth-cleanup'
title: VS Code Surface Truth Cleanup — Traceability Matrix
created: '2026-05-01'
updated: '2026-05-01'
status: complete
kind: traceability
inputs:
  - spec.md
  - plan.md
  - tasks.md
  - data-model.md
  - contracts/internal-api.md
  - contracts/events.md
  - contracts/api.md
  - contract-pack.md
---

# Traceability Matrix: VS Code Surface Truth Cleanup (030)

## Scope Note

This feature is **non-application repo maintenance cleanup** (see `discovery.md`,
`context-bundle.md`, `contract-pack.md`). It aligns documentation, config helpers,
generated mirrors, and bundled resources to the authoritative
`extension/package.json` + runtime-registration contract. No new UI panels,
findings dashboards, rollback UX, or application data flows exist. Every table
below reflects only the actual work defined in the spec, plan, and tasks.
**This artifact validates planning traceability coverage only; it does not claim
that implementation changes have already been applied to live code.**

---

## 1 — User Story → Plan → Primary/Supporting Tasks Mapping

| US | Title | Priority | Plan Placeholder IDs | Task IDs |
|----|-------|----------|----------------------|----------|
| US-001 | Maintainer: Trustworthy Command Surface | P1 | T030-103, T030-204, T030-301, T030-303, T030-402, T030-403, T030-404, T030-503, T030-506, T030-502 | T003, T009\*, T011, T012, T013, T014\*, T018, T020\*, T022, T023, T026\* |
| US-002 | Maintainer: Trustworthy Configuration Surface | P1 | T030-202, T030-203, T030-302 | T007, T008, T011, T012, T015 |
| US-003 | VS Code Extension User: No Dead-End Setup Paths | P2 | T030-301, T030-303, T030-304, T030-305 | T011, T012, T015, T016, T017 |
| US-004 | Contributor: Clean Baseline for Future Work | P2 | T030-101, T030-201, T030-205, T030-402, T030-403, T030-404, T030-503, T030-506 | T001, T006, T010\*, T013, T014\*, T018, T020\*, T023, T026\* |
| US-005 | Release and Support Owner: Machine-Verifiable Surface Truth | P3 | T030-501, T030-502, T030-503, T030-505, T030-506 | T018, T021\*, T022, T023, T025, T026\* |

> `*` = conditional task; executed only when its trigger condition is met (see tasks.md Conditional Task Summary). Story rows list the union of direct and supporting tasks from the acceptance-criteria matrix below; task story tags in `tasks.md` indicate primary phase ownership, not exclusive story coverage.

---

## 2 — Acceptance Criteria Detail

| US | AC ID | Acceptance Criterion (abbreviated) | Tasks | AT Ref |
|----|-------|-------------------------------------|-------|--------|
| US-001 | AC-01 | Every command in VS Code-facing docs maps to a supported manifest command | T011, T012, T013, T014\*, T018, T020\*, T021\* | AT-001 |
| US-001 | AC-02 | Every manifest command has live runtime registration | T003, T009\*, T022 | AT-002 |
| US-001 | AC-03 | Removed/renamed command updates all coupled menu/keybinding/view/tree references in the same change | T009\*, T022 | — |
| US-001 | AC-04 | Internal-only commands absent from user-facing docs | T003, T011, T012, T017 | AT-001 |
| US-001 | AC-05 | Manifest-removed commands removed/corrected in all doc surfaces | T011, T012, T013, T014\*, T018, T020\*, T023, T026\* | AT-001 |
| US-001 | AC-06 | `command-registration.test.ts` passes after cleanup | T022 | AT-002 |
| US-002 | AC-01 | Every active VS Code settings guide setting maps to a manifest key | T015, T021\* | AT-003 |
| US-002 | AC-02 | Every documented default matches the manifest or is removed | T007, T011, T012, T015, T021\* | AT-003 |
| US-002 | AC-03 | `config.ts` does not expose/default keys absent from the manifest | T007, T008 | AT-004 |
| US-002 | AC-04 | Stale setting names removed from docs (e.g. orphaned `gofer.*` keys) | T011, T012, T015, T017 | AT-003 |
| US-002 | AC-05 | User-facing config helper aligns with the public settings contract; internal keys undocumented | T007, T008, T011, T012, T015 | AT-004 |
| US-003 | AC-01 | `extension/README.md` describes no workflow steps requiring absent commands/settings | T011, T017 | AT-008 |
| US-003 | AC-02 | WhatsApp/memory/similar feature claims verified or removed | T011, T016, T017 | AT-008 |
| US-003 | AC-03 | Onboarding sections describe only behavior in the cleaned manifest/runtime | T011, T015, T017 | AT-008 |
| US-003 | AC-04 | Removed/unsupported guidance absent from active docs; removals captured in release notes | T011, T012, T015, T016, T017 | AT-008 |
| US-004 | AC-01 | `.specify/specs/` contains no active legacy specs beyond 030 | T001 | AT-007 |
| US-004 | AC-02 | `specCommands.ts` references the correct underscore-named bundled resource | T006, T010\* | AT-006 |
| US-004 | AC-03 | Generated mirrors and packaged extension surfaces do not advertise behavior outside the current contract | T013, T014\*, T018, T020\*, T026\* | AT-005 |
| US-004 | AC-04 | Generation/sync steps do not ship descriptions for removed commands | T014\*, T018, T023, T026\* | AT-005 |
| US-005 | AC-01 | `command-registration.test.ts` passes without changing the declared command list | T021\*, T022 | AT-002 |
| US-005 | AC-02 | `command-generation.test.ts` passes after any mirror regeneration | T018, T022, T026\* | AT-005 |
| US-005 | AC-03 | If a documentation/settings parity gap is confirmed, a small targeted check is added covering only that gap | T021\* | AT-001, AT-003, AT-004 |
| US-005 | AC-04 | No new test framework or external dependency introduced; any new checks follow existing manifest-read patterns | T021\*, T025, T026\* | AT-010 |

**Total AC count**: 23 (US-001: 6 · US-002: 5 · US-003: 4 · US-004: 4 · US-005: 4)

---

## 3 — Functional Requirement Coverage

| FR | Area | US Coverage | Tasks |
|----|------|-------------|-------|
| FR-001 | Command authority: manifest is sole source for user-facing commands | US-001 AC-01, AC-04, AC-05 | T011, T012 |
| FR-002 | Runtime registration parity: every manifest command has live registration; coupled references updated together | US-001 AC-02, AC-03, AC-06 | T003, T009\*, T022 |
| FR-003 | Docs must not describe commands absent from the manifest | US-001 AC-01, AC-05 | T011, T012 |
| FR-004 | Command wording drift resolved in favour of manifest wording | US-001 AC-01 | T011, T012, T013 |
| FR-005 | Documented setting keys/defaults map to manifest | US-002 AC-01, AC-02 | T015 |
| FR-006 | Config helper keys/defaults align with manifest | US-002 AC-02, AC-03 | T007 |
| FR-007 | Internal-only config behavior absent from user-facing material | US-002 AC-03, AC-05 | T008 |
| FR-008 | Docs describe only currently implemented/supported behavior | US-003 AC-01, AC-02, AC-03 | T011, T012, T017 |
| FR-009 | Removals from active guidance captured in changelog | US-003 AC-04 | T016, T017 |
| FR-010 | Generated mirrors must not advertise behavior outside the authoritative contract | US-004 AC-03, AC-04 | T013, T014\*, T018, T020\*, T026\* |
| FR-011 | Mirror outputs regenerated when canonical sources change | US-004 AC-03, AC-04 | T014\*, T018, T020\*, T023 |
| FR-012 | Resource references match the correctly named bundled file | US-004 AC-02 | T006, T010\* |
| FR-013 | `command-registration.test.ts` passes without lowering expectations | US-001 AC-06, US-005 AC-01 | T022 |
| FR-014 | `command-generation.test.ts` passes after any mirror regeneration | US-005 AC-02 | T018, T022, T026\* |
| FR-015 | Targeted documentation/settings parity check added only when a real gap is confirmed | US-005 AC-03 | T021\* |
| FR-016 | Active non-cleanup legacy specs moved to `_archived/` without content modification | US-004 AC-01 | T001 |

**Coverage**: 16/16 FRs covered. No FR is without a mapped task.

---

## 4 — Plan Phase Coverage

| Plan Phase | Plan IDs | Purpose | Tasks.md Phases | Task IDs |
|------------|----------|---------|-----------------|----------|
| Phase 1 — Baseline Truth Audit | T030-101 to T030-105 | Freeze contract; classify public/internal; populate finding registry | Phase 1 (Setup) | T001, T002, T003, T004, T005 |
| Phase 2 — Runtime, Config & Resource Alignment | T030-201 to T030-205 | Correct proven code drift; preserve activation safety and non-destructive sync | Phase 2 (Foundational) | T006, T007, T008, T009\*, T010\* |
| Phase 3 — Documentation Truth Cleanup | T030-301 to T030-305 | Align all VS Code-facing docs to cleaned manifest/runtime contract; record removals | Phases 3 (US-001), 4 (US-002), 5 (US-003) | T011, T012, T015, T016, T017 |
| Phase 4 — Canonical & Mirror Surface Alignment | T030-401 to T030-405 | Audit canonical sources; regenerate mirrors; verify secondary pipeline; no generator rewrites | Phase 6 (US-004) | T013, T014\*, T018, T019, T020\* |
| Phase 5 — Parity Guards & Closure | T030-501 to T030-506 | Extend parity tests only for confirmed gaps; final verification suite; closure & handoff | Phases 7 (US-005), 8 (Polish) | T021\*, T022, T023, T024, T025, T026\* |

**Plan ID coverage**: T030-101 through T030-506 (26 plan placeholders, all mapped).

---

## 5 — Data Entity Coverage

### 5.1 DriftFinding

| Finding ID | Category | Tasks That Reference It | Expected Final Status |
|------------|----------|------------------------|-----------------------|
| VS-TRUTH-001 | DocumentationDrift | T004, T005, T011, T012, T016, T017, T024 | Target outcome: Resolved (via `align-documentation-set`) |
| VS-TRUTH-002 | ConfigurationDrift | T004, T005, T007, T008, T024 | Target outcome: Resolved (via `align-config-helper`) |
| VS-TRUTH-003 | MirrorDrift | T004, T005, T013, T014\*, T018, T020\*, T023, T026\*, T024 | Target outcome: Resolved (via `prune-canonical-commands` + `regenerate-generated-mirrors`) |
| VS-TRUTH-004 | LegacyScopeDrift | T001, T004, T005, T024 | Target outcome: Resolved (via `archive-legacy-spec-root`) |
| VS-TRUTH-005 | ResourceNamingDrift | T004, T005, T006, T010\*, T024 | Target outcome: Resolved (via `correct-resource-reference`) |
| VS-TRUTH-006 | ConfigDefaultDrift | T004, T005, T007, T011, T012, T015, T021\*, T024 | Target outcome: Resolved (via config/default alignment plus conditional docs/settings parity test) |

Seed count: **6** findings. All 6 are referenced by at least one task.

### 5.2 TruthSurface

| Surface ID | surfaceType | authoritySource | Tasks |
|------------|-------------|-----------------|-------|
| `manifest-contract` | AuthoritativeContract | self | T002, T007, T008, T015, T021\* |
| `runtime-wiring` | RuntimeWiring | self | T003, T009\* |
| `documentation-set` | Documentation | manifest+runtime | T011, T012, T015, T016, T017 |
| `config-helper` | ConfigHelper | manifest+runtime | T007, T008 |
| `canonical-commands` | CanonicalCommandSource | manifest+runtime | T013 |
| `generated-mirror-set` | GeneratedMirror | canonical+manifest | T014\*, T018, T019, T020\* |
| `resource-reference` | BundledResource | manifest+runtime | T006, T010\* |
| `parity-tests` | ParityTest | manifest+documentation+runtime+mirrors | T021\*, T022, T023, T026\* |
| `legacy-spec-root` | LegacySpec | archive-boundary | T001 |

Seed count: **9** surfaces. All 9 are referenced by at least one task.

### 5.3 CleanupAction

| Action ID | contractRef | findingId | surfaceId | actionType | Tasks | specRefs |
|-----------|-------------|-----------|-----------|------------|-------|----------|
| `align-documentation-set` | IAP-030-01 | VS-TRUTH-001 | `documentation-set` | Align | T011, T012, T016, T017 | US-001, US-003; FR-001, FR-003, FR-008, FR-009 |
| `prune-canonical-commands` | IAP-030-02 | VS-TRUTH-003 | `canonical-commands` | Align | T013 | US-004; FR-010, FR-004 |
| `regenerate-generated-mirrors` | IAP-030-02 | VS-TRUTH-003 | `generated-mirror-set` | Regenerate | T014\*, T018, T020\* | US-004; FR-010, FR-011 |
| `align-config-helper` | IAP-030-03 | VS-TRUTH-002 | `config-helper` | Align | T007, T008 | US-002; FR-006, FR-007 |
| `prune-unsupported-autonomous-settings` | IAP-030-03 | VS-TRUTH-002 | `manifest-contract` | Remove | T008, T011, T015 | US-002, US-003; FR-005, FR-007, FR-008 |
| `correct-config-helper-defaults` | IAP-030-03 | VS-TRUTH-006 | `config-helper` | Correct | T007 | US-002; FR-006 |
| `correct-documented-defaults` | — | VS-TRUTH-006 | `documentation-set` | Correct | T011, T012, T015 | US-002, US-003; FR-005, FR-008 |
| `correct-resource-reference` | IAP-030-04 | VS-TRUTH-005 | `resource-reference` | Correct | T006, T010\* | US-004; FR-012 |
| `archive-legacy-spec-root` | — | VS-TRUTH-004 | `legacy-spec-root` | Archive | T001 | US-004; FR-016 |
| `extend-doc-settings-parity-tests` | IAP-030-03 | VS-TRUTH-006 | `parity-tests` | ExtendTest | T021\* | US-005; FR-015 |
| `extend-mirror-scope-guard` | IAP-030-02 | VS-TRUTH-003 | `parity-tests` | ExtendTest | T026\* | US-004, US-005; FR-010, FR-014 |

Seed count: **11** actions. All 11 are covered by tasks.

### 5.4 AcceptedException

| Exception ID | findingId / surfaceId | Tasks | Expected Final Status |
|--------------|------------------------|-------|-----------------------|
| `EX-030-01` | `VS-TRUTH-001` / `documentation-set` | T005, T024 | `Accepted` |
| `EX-030-02` | `VS-TRUTH-004` / — | T005, T024 | `Accepted` |

Seed count: **2** exceptions. Both are referenced by task closure steps.

---

## 6 — Contract Coverage

### 6.1 Internal Contracts (IAP-030-xx)

| Contract ID | Interface | US Coverage | FR Coverage | Tasks |
|-------------|-----------|-------------|-------------|-------|
| IAP-030-01 | Command and doc truth alignment (active VS Code-facing docs → `package.json` + runtime) | US-001, US-003 | FR-001, FR-002, FR-003, FR-004, FR-008, FR-009, FR-013 | T002, T003, T011, T012, T015, T016, T017, T021\*, T022 |
| IAP-030-02 | Canonical-to-mirror generation (`.specify/commands/` → generated surfaces) | US-004, US-005 | FR-010, FR-011, FR-014 | T013, T014\*, T018, T019, T020\*, T023, T026\* |
| IAP-030-03 | Config helper alignment (`config.ts` → `package.json` settings contract) | US-002, US-005 | FR-005, FR-006, FR-007, FR-015 | T007, T008, T015, T021\* |
| IAP-030-04 | Resource naming consistency (`specCommands.ts` → `extension/resources/`) | US-004 | FR-012 | T006, T010\* |

External API (API-030-00): **No external callable API — confirmed**. All work is internal.

### 6.2 Internal Events (EVT-030-xx)

| Event ID | Event | US / NFR Coverage | Tasks |
|----------|-------|-------------------|-------|
| EVT-030-01 | Extension activation | US-001, US-002, US-003; NFR-002, NFR-005 | T022 (AT-009 activation check) |
| EVT-030-02 | Command registration | US-001, US-005; FR-001, FR-002, FR-013 | T003, T009\*, T022 |
| EVT-030-03 | Workspace sync | US-004; FR-011, FR-012; NFR-003, NFR-008 | T006, T010\* |
| EVT-030-04 | Parity test run | US-005; FR-013, FR-014, FR-015; NFR-001, NFR-009 | T021\*, T022, T023, T026\* |

---

## 7 — Coverage Summary

| Dimension | Expected | Mapped | Gap | Status |
|-----------|----------|--------|-----|--------|
| User Stories | 5 (US-001 to US-005) | 5 | None | ✅ PASS |
| Acceptance Criteria | 23 (US-001 AC-01 to US-005 AC-04) | 23 | None | ✅ PASS |
| Functional Requirements | 16 (FR-001 to FR-016) | 16 | None | ✅ PASS |
| Plan Placeholder IDs | 26 (T030-101 to T030-506) | 26 | None | ✅ PASS |
| Task IDs | 26 (T001 to T026) | 26 | None | ✅ PASS |
| DriftFinding seeds | 6 (VS-TRUTH-001 to VS-TRUTH-006) | 6 | None | ✅ PASS |
| TruthSurface seeds | 9 | 9 | None | ✅ PASS |
| CleanupAction seeds | 11 | 11 | None | ✅ PASS |
| AcceptedException seeds | 2 (`EX-030-01`, `EX-030-02`) | 2 | None | ✅ PASS |
| Internal contracts (IAP) | 4 (IAP-030-01 to IAP-030-04) | 4 | None | ✅ PASS |
| Internal events (EVT) | 4 (EVT-030-01 to EVT-030-04) | 4 | None | ✅ PASS |
| External API | 0 (API-030-00 — no external API) | 0 | None | ✅ PASS |

**VALIDATION PASSED** — All traceability dimensions are fully covered with no gaps.
No invented scope (no UI panels, findings dashboards, or rollback UX) is present.
