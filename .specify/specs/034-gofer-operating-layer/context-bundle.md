---
feature: 034-gofer-operating-layer
status: ready
created: 2026-05-28
---

# Context Bundle: Gofer Operating Layer

## Selected Scenario

Modify existing Gofer functionality by adding an ECC-inspired operating layer.

## Classification

Non-application platform tooling. No UI preview, branding, journey, or app
service-fit approval is required.

## Core Constraint

No current EAI Gofer functionality may be lost.

## Current Gofer Baseline

- Root package: `eai-gofer 3.4.3`.
- Current commit inspected: `c909d5e`.
- Existing active specs include `031-skills-pipeline-augmentation`,
  `032-gofer-ui-first-builder`, and others.
- Existing Codex doctor is present and tested.
- Existing package plugin script supports Claude, Codex, Copilot, Gemini, and VS Code release assets.

## Reference Baseline

- ECC repo inspected at commit `928076c`.
- ECC patterns adapted: compliance matrix, install lifecycle, release gate,
  observability readiness, selective install/catalog, diagnostics.

## Implementation Spine

1. Phase 1 protects truth and releases.
2. Phase 2 improves install and support.
3. Phase 3 grounds EAI capability and observability.
4. Phase 4 improves adoption and learning.

