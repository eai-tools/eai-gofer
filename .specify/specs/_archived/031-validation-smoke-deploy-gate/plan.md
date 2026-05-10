---
feature: smoke-deploy-gate
status: draft
---

# Plan: Smoke Deploy Gate

## Architecture

- Tech stack: React web UI with Playwright browser coverage
- Rendered experience: staging browser route
- Deployment target: Azure staging
- Intentional condition: no screenshot, browser assertion, curl transcript, or
  deployment log is attached
- Tests: no feature implementation or render proof is provided despite the UI
  and Playwright expectations

## Validation Intent

This smoke feature is intended to set `HAS_UI = true` and `DEPLOY_IN_SCOPE =
true`. `/6_gofer_validate` should fail Category 3 because no render/deployment
evidence is present.
