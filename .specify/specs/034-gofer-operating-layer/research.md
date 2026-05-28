---
feature: 034-gofer-operating-layer
status: complete
created: 2026-05-28
goferCommit: c909d5e
eccCommit: 928076c
---

# Research: Gofer Operating Layer

## Summary

ECC and Gofer solve adjacent but different problems.

ECC is strongest as a cross-harness operating system for agentic coding workflows.
Gofer is strongest as an EAI-specific delivery pipeline for applications, business
processes, and business documentation.

The right move is to keep Gofer's EAI workflow intact and add ECC-style operating
reliability around it.

## Current Gofer Strengths

- EAI-first workflow profile.
- Business discovery, app/non-app classification, and EAI journey handling.
- Service-fit, reuse-scan, context-bundle, contract-pack, and audit-history artifacts.
- Generated command surfaces for Claude, Copilot, Codex, Gemini, and VS Code resources.
- Public plugin packaging and VSIX release support.
- Codex-specific doctor for skill budget and duplicate bundle issues.
- Rich validation stage and existing spec `031` for helper skills and truthfulness.

## Current Gofer Gaps Compared With ECC

| Gap | Evidence | Risk |
| --- | --- | --- |
| No full multi-surface install lifecycle | Gofer has `gofer:codex-doctor`, but not general `list-installed`, `doctor`, `repair`, `uninstall` flows | Users cannot easily inspect or repair multi-assistant installs. |
| No public surface compliance matrix | Gofer README lists surfaces, but there is no generated/validated matrix like ECC's adapter matrix | Capability claims can drift from what each assistant can enforce. |
| Release gate is less explicit | Gofer packages releases, but lacks ECC-style preview smoke and approval gate scripts | Public release assets can drift or omit required evidence. |
| Diagnostics are surface-specific | Codex doctor is useful but narrow | Support requires manual environment reconstruction. |
| EAI capability health is not a first-class gate | EAI commands are referenced in workflow guidance, but not exposed as a reusable health report | Plans may be based on stale or unavailable platform capability. |
| Catalog/drift detection is incomplete | README references `docs/cli-support.md`, but that file is absent in this checkout | Docs, generated surfaces, and package manifests can diverge. |

## Recommended Direction

Build a Gofer operating layer in four phases:

1. Surface truth and release gates.
2. Install lifecycle and support diagnostics.
3. EAI capability health and event observability.
4. Delivery profiles, catalog, and delivery learning.

This sequence preserves current behavior first, then adds operational control,
then improves platform grounding, then improves repeatability and adoption.

