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
   - `node .specify/scripts/node/gofer-workspace-check.mjs --host claude --json`
5. If the workspace is missing or stale, ask exactly:
   - **"This repo is missing or stale for Gofer. Initialize/update it now?"**
6. If the user says yes, run the Gofer workspace bootstrap helper and then resume this command from the top.
7. If the user says no, stop and explain that Gofer stage/helper work depends on the repo-owned scaffold.


# Gofer Vocabulary

Extract the feature's shared domain language into a canonical glossary and
write it to `.specify/specs/{feature}/glossary.md`.

Use this when research, specification, contracts, or implementation rely on
terms that need stable definitions across Claude, Copilot, Codex, and Gemini
surfaces.

When you run this helper:

1. Read the feature-local context that already exists (`research.md`, `spec.md`,
   `plan.md`, `contracts/`, `quickstart.md`) and ignore unrelated repository
   content.
2. Identify project-specific terms, acronyms, role names, workflow names, and
   overloaded words that need precise definitions.
3. Write the artifact only to `.specify/specs/{feature}/glossary.md`. Never
   write to repo root or any provider-specific surface directory.
4. If the target file already exists, replace it and prepend a regeneration note
   such as `<!-- regenerated at [ISO timestamp] -->`.
5. Include the minimum provenance schema:
   - `GeneratedAt`
   - `SourceCommandId`
   - `SourceInputs`
   - `OverwriteNoticeWhenApplicable`

The generated glossary must contain these sections:

- `## Provenance`
- `## Term Entries`
- `## Definitions`
- `## Source Artifacts`

Keep the content Gofer-owned and concise. Do not copy upstream Matt Pocock
skill text verbatim.
