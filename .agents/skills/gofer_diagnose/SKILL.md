---
name: gofer:diagnose
description: "Run a reproduce-minimize-instrument-fix loop for bugs and failing tests."
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
   - `node .specify/scripts/node/gofer-workspace-check.mjs --host codex --json`
5. If the workspace is missing or stale, ask exactly:
   - **"This repo is missing or stale for Gofer. Initialize/update it now?"**
6. If the user says yes, run the Gofer workspace bootstrap helper and then resume this command from the top.
7. If the user says no, stop and explain that Gofer stage/helper work depends on the repo-owned scaffold.


# Gofer Diagnose

Run a structured reproduce-minimize-instrument-fix investigation and write the
results to `.specify/specs/{feature}/diagnose-report.md`.

Use this when an implementation, test, or integration is failing and you need a
portable, evidence-backed debugging record that stays inside the feature
directory.

When you run this helper:

1. Start from the actual failure evidence already present in the session:
   failing output, stack traces, logs, screenshots, or a concrete bug report.
2. Reproduce the failure as directly as possible.
3. Minimize the problem to the smallest reliable failing slice.
4. Instrument the likely fault boundaries to prove or disprove hypotheses.
5. Record the recommended fix path without inventing evidence.
6. Write the artifact only to
   `.specify/specs/{feature}/diagnose-report.md`.
7. If the target file already exists, replace it and prepend a regeneration note
   such as `<!-- regenerated at [ISO timestamp] -->`.
8. Include the minimum provenance schema:
   - `GeneratedAt`
   - `SourceCommandId`
   - `SourceInputs`
   - `OverwriteNoticeWhenApplicable`

The generated diagnose report must contain these sections:

- `## Provenance`
- `## Reproduce`
- `## Minimize`
- `## Instrument`
- `## Fix`

Keep the content Gofer-owned. Do not copy upstream Matt Pocock skill text
verbatim.
