---
id: smoke-missing-evidence
title: Smoke Missing Evidence
status: draft
created: 2026-05-01
updated: 2026-05-01
---

# Feature Specification: Smoke Missing Evidence

## Overview

This temporary feature exists only to verify that `/6_gofer_validate` fails when
no executed test output and no runtime integration proof are available.

## User Story

As a Gofer maintainer, I need `/6` to fail honestly when proof is absent so a
missing-evidence implementation cannot receive a false PASS.

## Acceptance Criteria

- [ ] Given this feature has no runtime integration proof, when `/6` runs, then
      Category 5 scores 0 and the run fails.
- [ ] Given this feature has no executed test output, when `/6` runs, then
      Categories 1 and 2 score 0 and the run fails.
