---
id: smoke-deploy-gate
title: Smoke Deploy Gate
status: draft
created: 2026-05-01
updated: 2026-05-01
---

# Feature Specification: Smoke Deploy Gate

## Overview

This temporary feature exists only to verify that `/6_gofer_validate` forces
Category 3 to 0 when a rendered browser experience on a deployed target lacks
render/deployment proof.

## User Story

As a Gofer maintainer, I need deploy-scoped UI work to fail validation when no
rendered or deployed proof is attached.

## Acceptance Criteria

- [ ] Given the feature is rendered in a browser and deployed to Azure staging,
      when `/6` runs without screenshot, browser assertion, curl transcript, or
      deployment log evidence, then Category 3 scores 0 and the run fails.
- [ ] Given no implementation is present, when `/6` runs, then the report still
      records the missing Category 3 proof explicitly instead of implying PASS.
