---
feature: repo-size-cleanup
stage: audit-and-safe-cleanup
tasksCompleted: 5/5 (100%)
GeneratedAt: 2026-05-18T10:41:29+10:00
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
