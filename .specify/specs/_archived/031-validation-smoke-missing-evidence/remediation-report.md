---
feature: smoke-missing-evidence
iteration: 1
score: 45
score_max: 110
generated: 2026-05-01T10:36:06Z
failed_categories:
  - functional_correctness
  - test_authenticity
  - integration_reality
  - specification_traceability
  - blast_radius_containment
---

# Remediation Report: Smoke Missing Evidence

## Iteration 1 of 3

**Score**: 45/110 **Status**: FAIL — Remediation Required

## Failed Categories

### Functional Correctness (0/20)

**Evidence**: No passing tests exercise real code for either acceptance criterion. Feature docs explicitly say there is no implementation and no feature-specific tests (`spec.md:23-26`, `plan.md:10-13`, `tasks.md:8-10`).

**Required Actions**:

1. Add real implementation code for the feature.
2. Add feature-scoped tests that execute the real code for both acceptance criteria.

**Files to modify**:

- `spec.md:23-26` — keep acceptance criteria, but add corresponding implementation/test artifacts elsewhere
- `plan.md:10-13` — replace the intentional no-implementation state if the goal changes from smoke fixture to passable feature

### Test Authenticity (0/20)

**Evidence**: No feature-specific tests or executed feature test output exist. Repo-wide `npm test` passed, but `validation-run/feature-reference-search.txt` stayed empty, so the output was insufficient for this feature.

**Required Actions**:

1. Create feature-specific tests.
2. Capture executed feature test output and retain it as validation evidence.

**Files to modify**:

- `tasks.md:8-10` — remove the intentional instruction to omit executed feature test output if the feature should pass

### Integration Reality (0/10)

**Evidence**: No runtime wiring artifact, contract pack, or integration-test execution output was found (`spec.md:23-26`, `plan.md:10-13`, `research.md:8-15`, `tasks.md:8-10`).

**Required Actions**:

1. Add real runtime wiring or a real integration boundary.
2. Add integration tests or equivalent runtime proof tied to the feature.

**Files to modify**:

- `plan.md:10-13` — replace `Runtime surface: none` if the feature becomes executable
- `tasks.md:9` — remove the intentional instruction to omit runtime integration proof if the feature should pass

### Specification Traceability (0/5)

**Evidence**: No user-story → test → code chain exists because there is no implementation and no feature-specific tests.

**Required Actions**:

1. Link every acceptance criterion to a real test.
2. Link every test to the implementation file(s) that satisfy the requirement.

**Files to modify**:

- `spec.md:16-26`
- `tasks.md:8-10`

### Blast Radius Containment (0/10)

**Evidence**: `blast-radius-report.md` verdict is `BREACHED`; generic spec consumers can ingest this evidence-free fixture while no feature-specific consumer coverage exists.

**Required Actions**:

1. Keep the smoke fixture out of release/deploy surfaces.
2. If the feature should become passable, add real implementation/test/runtime evidence so generic consumers are not ingesting an evidence-free executable feature.

**Files to modify**:

- `blast-radius-report.md`
- `plan.md:15-19`

## Remediation Scope

The following pipeline stages should re-run focused on these areas:

- **Research**: Not needed unless this smoke fixture is converted into a real feature.
- **Plan**: Update if runtime surface, implementation scope, or test strategy changes.
- **Implement**: Add real code, feature-scoped tests, and runtime proof.
- **Validate**: Re-run after evidence exists.

## Previous Iterations

| Iteration | Score | Failed Categories | Date |
| --- | --- | --- | --- |
| 1 | 45/110 | functional_correctness, test_authenticity, integration_reality, specification_traceability, blast_radius_containment | 2026-05-01 |
