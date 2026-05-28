---
name: gofer:zoom-out
description: Show how the current feature connects to broader system boundaries.
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
  canonicalSource: .specify/commands/gofer_zoom_out.md
  canonicalChecksum: e42e56e75cff49c45d92540206747c189871f096d8573fb168d4987c8044119c
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
   - VS Code extension mirrors Claude/Copilot/Gemini resources itself and should
     still keep the core scaffold healthy
4. If the repo already has the workspace checker script, prefer running:
   - `node .specify/scripts/node/gofer-workspace-check.mjs --host copilot --json`
5. If the workspace is missing or stale, ask exactly:
   - **"This repo is missing or stale for Gofer. Initialize/update it now?"**
6. If the user says yes, run the Gofer workspace bootstrap helper and then
   resume this command from the top.
7. If the user says no, stop and explain that Gofer stage/helper work depends on
   the repo-owned scaffold.

# Gofer Zoom Out

Expand the current feature into its surrounding system context and write the
result to `.specify/specs/{feature}/zoom-out-report.md`.

Use this helper when the feature needs broader architectural framing: upstream
dependencies, downstream consumers, or cross-cutting risks that are easy to miss
inside a narrow task view.

When you run this helper:

1. Read the approved feature-local artifacts and identify the current boundary
   being changed.
2. Map the upstream inputs, downstream consumers, and cross-cutting impacts that
   materially affect the feature.
3. Keep the output feature-local and architecture-focused.
4. Write the artifact only to `.specify/specs/{feature}/zoom-out-report.md`.
5. If the target file already exists, replace it and prepend a regeneration note
   such as `<!-- regenerated at [ISO timestamp] -->`.
6. Include the minimum provenance schema:
   - `GeneratedAt`
   - `SourceCommandId`
   - `SourceInputs`
   - `OverwriteNoticeWhenApplicable`

The generated zoom-out report must contain these sections:

- `## Provenance`
- `## Current Boundary`
- `## Upstream/Downstream`
- `## Cross-Cutting Impact`

Keep the content Gofer-owned. Do not copy upstream Matt Pocock skill text
verbatim.
