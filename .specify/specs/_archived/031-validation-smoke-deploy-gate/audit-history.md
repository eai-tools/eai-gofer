---
feature: smoke-deploy-gate
updated: 2026-05-01T10:36:12Z
owner: Gofer maintainers
status: active
---

# Audit History: Smoke Deploy Gate

## Rollout Tracking Table

| Finding ID | Source | Status | Recurrence | Owner | Expiry | Review cadence | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `VAL-SMOKE-003` | `ui_e2e_verification` / `GATE-3` | Open | 1 (first recorded run: 2026-05-01) | Gofer maintainers | n/a | Every smoke rerun | `validation-report.md`, `remediation-report.md` |

## Latest Smoke Run

- Run timestamp: `2026-05-01T10:36:12Z`
- Verdict: `FAIL`
- Score: `30/110`
- `HAS_UI = true`
- `DEPLOY_IN_SCOPE = true`
- `Category 3 = 0/10`

> `HAS_UI = true` — `plan.md` declares `React web UI with Playwright browser coverage`, and repo-level Playwright artifacts exist (`playwright.config.ts`, `playwright.e2e.config.ts`, `tests/e2e/...`).  
> `DEPLOY_IN_SCOPE = true` — `spec.md` / `plan.md` explicitly require rendered browser behavior on `Azure staging`.  
> `GATE-3 = FAIL` — the feature directory contains only `spec.md`, `plan.md`, `research.md`, and `tasks.md`; no screenshot, browser assertion, curl transcript, deployment log, or smoke-check output was present by final scoring time.  
> `status: FAIL`

## Findings

### `VAL-SMOKE-003` — Missing deploy/render proof blocks Category 3

- **Source**: `ui_e2e_verification`
- **Status**: Open
- **Recurrence**: 1
- **Owner**: Gofer maintainers
- **Expiry**: n/a
- **Review cadence**: Every smoke rerun
- **Evidence**:
  - `validation-report.md#scope-determination`
  - `validation-report.md#evidence-gates`
  - `validation-report.md#evidence-table`
  - `remediation-report.md`

## Execution Notes

- This smoke run kept artifacts feature-local as requested.
- Global `.specify/logs/validation-findings.jsonl` and stage-observability logs were not updated in this smoke execution because the requested output scope was limited to `.specify/specs/smoke-deploy-gate/`.
