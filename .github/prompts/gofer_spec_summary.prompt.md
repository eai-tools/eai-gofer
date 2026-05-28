---
name: gofer:spec-summary
description: Generate a business-friendly summary of feature value and scope.
agent: copilot-workspace
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
argument-hint: feature-name-or-description
gofer:
  workflowProfile: enterpriseai
  canonicalSource: .specify/commands/gofer_spec_summary.md
  canonicalChecksum: 1942a70d10606601477bfdd271fe507a95d0af80812831df07c918452f2de08d
  metadataSource: scripts/generate-commands.ts
---

## Workspace Preflight

Before doing stage/helper work:

1. Resolve the repository root.
2. Check the core Gofer sentinels:
   - `.specify/.gofer-version`
   - `.specify/commands/0_business_scenario.md`
   - `.specify/templates/spec-template.md`
   - `.specify/scripts/bash/create-new-feature.sh`
   - `.specify/scripts/node/parse-stage-command.mjs`
   - `.specify/scripts/hooks/post-tool-use.mjs`
   - `.specify/scripts/powershell/install-optional-tools.ps1`
   - `.specify/specs/`
   - `.specify/memory/`
3. Check host-specific repo-owned files when relevant:
   - Claude: `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`
   - Codex: `AGENTS.md`
   - Copilot: `.github/copilot-instructions.md`
   - VS Code extension mirrors Claude/Copilot/Gemini resources itself and should still keep the core scaffold healthy
4. If the repo already has the workspace checker script, prefer running:
   - `node .specify/scripts/node/gofer-workspace-check.mjs --host copilot --json`
5. If the workspace is missing or stale, ask exactly:
   - **"This repo is missing or stale for Gofer. Initialize/update it now?"**
6. If the user says yes, run the Gofer workspace bootstrap helper and then resume this command from the top.
7. If the user says no, stop and explain that Gofer stage/helper work depends on the repo-owned scaffold.


# Gofer Spec Summary

Generate a business-friendly summary of the current feature and write it to
`.specify/specs/{feature}/spec-summary.md`.

Use this when a stakeholder or implementation team needs the plain-language
purpose, expected outcomes, and scope boundaries without diving into the full
spec.

When you run this helper:

1. Read the approved feature-local artifacts (`spec.md`, `plan.md`,
   `contract-pack.md`, `quickstart.md`) and summarize only what is already in
   scope.
2. Keep the summary business-facing and humble. Do not turn it into a PRD or an
   issue-tracker export.
3. Write the artifact only to `.specify/specs/{feature}/spec-summary.md`.
4. If the target file already exists, replace it and prepend a regeneration note
   such as `<!-- regenerated at [ISO timestamp] -->`.
5. Include the minimum provenance schema:
   - `GeneratedAt`
   - `SourceCommandId`
   - `SourceInputs`
   - `OverwriteNoticeWhenApplicable`

The generated summary must contain these sections:

- `## Provenance`
- `## What`
- `## Why`
- `## Acceptance Criteria`
- `## Out of Scope`

Keep the content Gofer-owned. Do not copy upstream Matt Pocock skill text
verbatim.
