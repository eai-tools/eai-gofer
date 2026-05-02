---
feature: '030-vscode-surface-truth-cleanup'
created: '2026-04-30T19:40:36.174+10:00'
status: complete
---

# Reuse Scan: VS Code Surface Truth Cleanup

## Archived Spec Inventory

| Previous Active Spec | Observed Relevance | Reuse / Extend / Create Decision | Notes |
| -------------------- | ------------------ | -------------------------------- | ----- |
| `001-cli-innovations-visuals` | High | Extend findings, archive spec | Owns command-generation and mirrored-surface work that may have introduced or preserved stale claims |
| `029-enterpriseai-student-vertical-builder` | Medium | Extend findings, archive spec | Owns EnterpriseAI-first wording and workflow behavior that may now overstate VS Code support |
| `enterpriseai-student-vertical-builder` | Medium | Archive only | Draft duplicate; preserve history but do not keep as an active planning source |

## Existing Repo Surfaces To Reuse

| Surface | Intended Role | Reuse / Extend / Create Decision | Evidence |
| ------- | ------------- | -------------------------------- | -------- |
| `extension/package.json` | Public VS Code command/settings contract | Reuse | VS Code consumes this manifest directly |
| `extension/src/extension.ts` + `extension/src/services/CommandRegistry.ts` | Runtime command wiring | Reuse / Extend | Current command registration baseline and likely place to reconcile internal-only commands |
| `extension/src/config.ts` | Settings helper layer | Extend carefully | Partial mirror with key/default drift against the manifest |
| `.specify/commands/` | Canonical command descriptions | Reuse | Best authoring source for generated command surfaces |
| Generated skills/prompts/mirrors | Downstream mirrors of canonical commands | Reuse, then regenerate or prune | Mirrors should not be hand-maintained as separate truths |
| `extension/src/services/migration/ResourceSyncer.ts` | Workspace resource sync | Reuse | Existing non-destructive sync pattern should remain intact |
| Existing README/docs content | User-facing explanation of the extension | Reuse only where verified | Highest-risk stale surface; trim aggressively |

## Net Decision

Create a **new cleanup spec** because no remaining active spec narrowly owns the
truth-alignment problem across VS Code commands, configuration, and
documentation.

This new spec should **reuse existing implementation surfaces as evidence**,
**prefer the manifest/runtime contract over narrative docs**, and **remove stale
claims instead of creating compensating features** unless a later decision
explicitly chooses implementation over removal.
