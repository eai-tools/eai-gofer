---
name: gofer:check-workspace
description:
  'Check whether this repo is initialized for Gofer and explain any missing or
  stale scaffold.'
---

# Gofer Workspace Check

Use this command to run the fast Gofer repo preflight before stage/helper work.
Write the result to `.specify/logs/workspace-check-report.md`. The check itself
is read-only. It must never overwrite project source files.

## Step 1: Resolve The Workspace Root

Use the current working directory unless you are already inside `.specify/` or a
subdirectory. If needed, walk upward to the nearest directory containing one of:

- `.git`
- `package.json`
- `pyproject.toml`
- `go.mod`
- `Cargo.toml`
- `.specify`

## Step 2: Check The Core Gofer Sentinels

Inspect these paths relative to the workspace root:

- `.specify/.gofer-version`
- `.specify/commands/0_business_scenario.md`
- `.specify/templates/spec-template.md`
- `.specify/scripts/bash/create-new-feature.sh`
- `.specify/scripts/node/parse-stage-command.mjs`
- `.specify/scripts/hooks/post-tool-use.mjs`
- `.specify/scripts/powershell/install-optional-tools.ps1`
- `.specify/specs/`
- `.specify/memory/`

## Step 3: Check Host-Specific Files

Check the current host's required repo-owned files:

- **Claude**: `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`
- **Codex**: `AGENTS.md`
- **Copilot**: `.github/copilot-instructions.md`
- **Gemini**: no additional required repo-owned files beyond the core scaffold

## Step 4: Prefer Scripted Evidence When Available

If the repo already has the Gofer workspace scripts, run the checker for the
current host and report the JSON result. Use the host value that matches the
client you are currently in: `claude`, `codex`, `copilot`, or `gemini`.

```bash
node .specify/scripts/node/gofer-workspace-check.mjs --host "$GOFER_HOST" --json
```

If that script is missing, perform the equivalent manual path checks yourself
and summarize the result in the same categories:

- `healthy`
- `missing`
- `stale`

Treat the workspace as `stale` when `.specify/.gofer-version` is present but
does not match the installed Gofer/plugin version you are currently running.

## Step 5: Write The Workspace Check Report

Write the artifact only to `.specify/logs/workspace-check-report.md`.

If the target file already exists, replace it and prepend a regeneration note
such as `<!-- regenerated at [ISO timestamp] -->`.

Include the minimum provenance schema:

- `GeneratedAt`
- `SourceCommandId`
- `SourceInputs`
- `OverwriteNoticeWhenApplicable`

The generated workspace check report must contain these sections:

- `## Provenance`
- `## Workspace Root`
- `## Core Scaffold`
- `## Host Requirements`
- `## Status`
- `## Recommendation`

## Step 6: Report And Ask Once If Repair Is Needed

If the workspace is healthy, say so briefly and continue.

If the workspace is missing or stale, ask exactly:

**"This repo is missing or stale for Gofer. Initialize/update it now?"**

If the user says **yes**, run `/gofer:bootstrap-workspace` next.

If the user says **no**, stop. Explain that Gofer stage/helper commands depend
on the repo-owned scaffold and should not continue until the repo is initialized
or updated.
