---
feature: '030-vscode-surface-truth-cleanup'
created: '2026-04-30T19:40:36.174+10:00'
discoveredBy: 'Copilot + douglaswross'
status: complete
---

# Business Discovery: VS Code Surface Truth Cleanup

## Problem Statement

**Pain Point**: The VS Code-facing Gofer documentation is too long and likely
contains commands, configuration, and workflow claims that are no longer true
or no longer function.

**Current State**: The repo had multiple active specs in parallel, while the VS
Code extension surface appears to describe broader functionality than the
current implementation reliably supports.

**Impact**: Maintainers and users cannot trust the command list, configuration
reference, or workflow guidance, which makes onboarding harder and increases the
risk of dead-end setup and runtime flows.

## Target Users

### Primary Users

- **Persona**: Gofer maintainers and VS Code extension users
- **Technical Level**: Internal maintainers plus mixed-skill extension users
- **Key Needs**:
  - A truthful command list
  - Accurate configuration documentation
  - Removal of stale or unsupported workflow claims
  - One active cleanup spec that owns this remediation effort

## Value Proposition

**Primary Value**: Restore trust in the VS Code surface by aligning commands,
configuration, and documentation with what actually exists and works.

**Quantified Goal**: Reduce documentation drift to zero for the audited VS Code
surface so every documented command and setting maps to implemented behavior or
is removed.

## Success Metrics

| Metric | Target | Measurement |
| ------ | ------ | ----------- |
| Active legacy specs | 0 remaining active legacy specs | Top-level `.specify/specs/` contains only `_archived` plus this cleanup spec |
| Command truthfulness | 100% documented commands are implemented and intentionally supported | Compare docs against registered VS Code commands and live wiring |
| Configuration truthfulness | 100% documented settings map to current configuration contributions and behavior | Compare docs against extension configuration schema and runtime usage |
| Workflow truthfulness | 0 unsupported workflow/setup claims remain in VS Code-facing docs | Audit README/docs/extension marketplace text against implemented functionality |

## Competitive Analysis

**Status**: Skipped

This is internal cleanup work, not a market-positioning exercise.

## Discovery Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Scenario | Modify Existing | The work corrects current repo behavior and messaging rather than inventing a new product surface |
| Scope Focus | VS Code command, configuration, and documentation truth-alignment | Matches the user's stated pain point exactly |
| Legacy Spec Handling | Archive all active specs before starting cleanup | Prevents stale work items from competing with the new source of truth |
| Capability Strategy | Remove or correct stale claims before adding anything new | Accuracy matters more than breadth for this effort |
| Competitive Analysis | Skipped | Not needed for repo-internal cleanup |

## Application Classification

| Field | Decision |
| ----- | -------- |
| Classification | Non-application work |
| Reason | This is a repository cleanup and documentation/command/configuration alignment effort, not a new user-facing application or workflow build |
| Four-step AI journey required | No |
