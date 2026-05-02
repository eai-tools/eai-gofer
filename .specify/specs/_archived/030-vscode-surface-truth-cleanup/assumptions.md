---
feature: '030-vscode-surface-truth-cleanup'
created: '2026-04-30T19:40:36.174+10:00'
last-reviewed: '2026-04-30T19:40:36.174+10:00'
status: active
---

# Assumptions Register: 030-vscode-surface-truth-cleanup

## Overview

This document tracks the assumptions identified during problem validation for
the VS Code surface truth cleanup effort. All assumptions remain
**UNVALIDATED** at this stage.

## Status Legend

| Status | Meaning | Action Required |
| ------ | ------- | --------------- |
| VALIDATED | Confirmed true through evidence | None |
| UNVALIDATED | Assumed true, not yet checked | Verify before launch |
| DISPROVEN | Found to be false | Spec revision needed |
| PARTIALLY_VALID | True under some conditions only | Scope adjustment |

## Critical Assumptions (High Risk)

These assumptions, if wrong, would significantly impact the solution:

| ID | Assumption | Type | Status | Evidence | Impact if Wrong |
| -- | ---------- | ---- | ------ | -------- | --------------- |
| A1 | `extension/package.json` plus runtime wiring are the best baseline for supported VS Code behavior | Technical | UNVALIDATED | Validator repo scan | Cleanup may target the wrong truth source |
| A2 | Most user harm comes from stale claims rather than missing capability itself | Business | UNVALIDATED | Stakeholder brief + validator assessment | The work may need implementation fixes beyond documentation cleanup |
| A3 | A single active cleanup spec is enough to prevent legacy scope confusion during the audit | Process | UNVALIDATED | Current archiving action | Old assumptions may still leak into active decisions |

## Business Assumptions

| ID | Assumption | Status | Evidence | Added During |
| -- | ---------- | ------ | -------- | ------------ |
| BA1 | Users and maintainers lose time when docs, commands, and settings disagree | UNVALIDATED | Problem statement | Problem Validation |
| BA2 | Trust in the extension surface matters more than preserving every historical claim | UNVALIDATED | User brief | Problem Validation |
| BA3 | Solving this problem is worth doing even without exact revenue analytics | UNVALIDATED | Business case estimate | Problem Validation |

## Technical Assumptions

| ID | Assumption | Status | Evidence | Added During |
| -- | ---------- | ------ | -------- | ------------ |
| TA1 | Generated command mirrors can preserve stale claims after the canonical source changes | UNVALIDATED | Repo architecture context | Problem Validation |
| TA2 | Some documented commands/settings/workflows no longer map cleanly to current runtime behavior | UNVALIDATED | User brief + validator assessment | Problem Validation |
| TA3 | Lightweight repo-local checks could reduce future drift if added later | UNVALIDATED | Market analysis | Problem Validation |

## User Behavior Assumptions

| ID | Assumption | Status | Evidence | Added During |
| -- | ---------- | ------ | -------- | ------------ |
| UA1 | New users rely on README/docs before verifying runtime behavior themselves | UNVALIDATED | Stakeholder impact analysis | Problem Validation |
| UA2 | Contributors may copy existing docs/spec language unless drift is explicitly removed | UNVALIDATED | Legacy spec inventory | Problem Validation |

## Data Assumptions

| ID | Assumption | Status | Evidence | Added During |
| -- | ---------- | ------ | -------- | ------------ |
| DA1 | Current repo artifacts contain enough evidence to complete the audit without external telemetry | UNVALIDATED | Repo-local scope | Problem Validation |

## Regulatory Assumptions

| ID | Assumption | Status | Evidence | Added During |
| -- | ---------- | ------ | -------- | ------------ |
| RA1 | No industry regulation is the primary driver; this is mainly a trust and release-governance issue | UNVALIDATED | Market analysis | Problem Validation |

## Disproven Assumptions (Action Log)

| ID | Assumption | Disproven When | Evidence Against | Affected Specs | Corrective Action | Status |
| -- | ---------- | -------------- | ---------------- | -------------- | ----------------- | ------ |
| — | — | — | — | — | — | — |

## Validation Schedule

| Assumption ID | Verify By | Method | Owner |
| ------------- | --------- | ------ | ----- |
| A1 | During research | Compare manifest, runtime wiring, and docs directly | Research stage |
| A2 | During research | Audit documented claims against actual implementation | Research stage |
| A3 | During specification | Confirm no additional active specs are reintroduced | Specification stage |

## Review History

| Date | Reviewer | Changes Made |
| ---- | -------- | ------------ |
| 2026-04-30 | Copilot | Initial assumption capture |
