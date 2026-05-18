---
feature: 034-functionality-audit
repo: eai-gofer
status: in_review
created: 2026-05-18
---

# Tasks: Functionality Audit

## Audit Tasks

- [x] T001 Map repository package surfaces: root orchestrator package, VS Code
      extension, language server, docs site, release workflow, generated
      assistant command surfaces, and tests.
- [x] T002 Compare VS Code manifest commands with actual command registrations.
- [x] T003 Compare MCP tool advertisements with actual language-server dispatch
      and handler implementations.
- [x] T004 Review core implementation areas: setup/migration, spec parsing,
      command generation, memory, AI usage, council providers, autonomous
      execution, release, and docs.
- [x] T005 Scan for placeholders, skipped tests, tautological tests, stale
      implementation claims, and unused dependency candidates.
- [x] T006 Record implemented, partial, and not-implemented functionality in
      `functionality-audit.md`.
- [x] T007 Run validation commands and update this task status with evidence.

## Status Notes

- Current audit branch: `codex/functionality-audit`.
- Repo-size cleanup remains separate on PR #11; this audit intentionally avoids
  mixing functional findings into that PR.
- Active feature task files in `.specify/specs/` are complete:
  `026-public-platform-builder-experience`, `031-skills-pipeline-augmentation`,
  and `032-gofer-ui-first-builder` all have checked task lists.

## Validation Evidence

- `git diff --check` passed.
- `npx prettier --check .specify/specs/034-functionality-audit/tasks.md .specify/specs/034-functionality-audit/functionality-audit.md`
  passed after formatting the new Markdown files.
- `npm run gofer:codex-doctor` passed; no duplicate Gofer bundles detected in
  the scanned Codex skill root.
- `npm run typecheck` passed.
- `npm test -- tests/integration/autonomous/TaskExecutionFlow.integration.test.ts tests/integration/mcpTools.test.ts tests/unit/autonomous/MemoryManager.test.ts tests/unit/council/CommandGenerator.test.ts`
  passed: 4 files, 100 tests.
