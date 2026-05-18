---
feature: repo-size-cleanup
stage: history-rewrite-complete
tasksCompleted: 8/8 (100%)
GeneratedAt: 2026-05-18T13:05:00+10:00
---

# Tasks: Repository Size Cleanup

## Phase 1: Audit

- [x] T001 Measure local checkout size, tracked source size, and Git object
      store size.
- [x] T002 Identify current tracked large files and historical large blobs.

## Phase 2: Safe Cleanup

- [x] T003 Confirm Pages-hosted VSIX files have equivalent GitHub Release assets
      before removing committed binaries.
- [x] T004 Remove duplicated committed VSIX binaries and prevent future VSIX
      commits with ignore rules.
- [x] T005 Update release metadata and automation to use GitHub Releases for
      binary downloads while keeping GitHub Pages as the release feed.
- [x] T006 Prune release metadata and GitHub Releases to keep only the latest
      five versions while preserving historical git tags.

## Phase 3: History Rewrite

- [x] T007 Rewrite branch and tag history to remove historical `.vsix`,
      `.specify/logs/context-usage.jsonl`, and `docs/CodingAgents.pdf` objects.
- [x] T008 Force-push rewritten heads/tags and verify a fresh normal GitHub
      clone has zero targeted historical objects.
