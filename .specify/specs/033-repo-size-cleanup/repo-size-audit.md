---
feature: repo-size-cleanup
stage: history-rewrite-complete
status: HISTORY_REWRITE_COMPLETED
generatedAt: 2026-05-18T13:05:00+10:00
---

# Repository Size Audit

## Findings

- Local checkout before cleanup was about `1.1G`.
- Current tracked files before cleanup were about `170M`.
- Git object storage is about `610M`, mostly from historical binaries and
  runtime logs.
- Largest current tracked files were duplicated VSIX packages in
  `docs-site/static/releases/` plus root-level `gofer-*.vsix` release outputs.
- Largest historical blobs include old `docs/releases/*.vsix`,
  `.specify/logs/context-usage.jsonl`, `docs/CodingAgents.pdf`, and bundled
  build maps.

## Safe Cleanup Implemented

- Removed committed VSIX binaries from `docs-site/static/releases/`.
- Removed root-level generated `gofer-*.vsix` files.
- Updated `docs-site/static/releases.json` to point downloads at GitHub Release
  assets that already exist.
- Updated `release-auto.sh` and `scripts/update-releases.js` so future releases
  keep VSIX binaries in GitHub Releases instead of committing them to GitHub
  Pages source.
- Added ignore rules for `*.vsix` and `docs-site/static/releases/*.vsix`.
- Pruned release metadata to the latest five versions: `v3.3.1`, `v3.3.0`,
  `v3.2.2`, `v3.2.1`, and `v3.2.0`.
- Deleted older GitHub Release records/assets for `v3.1.0`, `v3.0.1`, `v3.0.0`,
  `v2.0.11`, and `v2.0.10` while preserving their git tags.

## History Rewrite Completed

- Merged the safe cleanup branch into `main` before rewriting history.
- Created local mirror backups before rewriting:
  `history-backups/eai-gofer-pre-history-rewrite-20260518-1209.git` and
  `history-backups/eai-gofer-post-merge-pre-history-rewrite-20260518-1253.git`.
- Rewrote branch and tag history with `git-filter-repo`.
- Removed all historical `.vsix` files.
- Removed all historical `.specify/logs/context-usage.jsonl` blobs.
- Removed historical `docs/CodingAgents.pdf`.
- Force-pushed the rewritten heads and tags to GitHub.
- Expired local reflogs and garbage-collected the submodule checkout.

## Verification

- Fresh normal clone from GitHub: `0` matching historical `.vsix`,
  `context-usage.jsonl`, or `CodingAgents.pdf` objects.
- Fresh normal clone Git object store: about `14M`.
- Local submodule Git object store after garbage collection: about `13M`.
- Latest GitHub Release records retained: `v3.3.1`, `v3.3.0`, `v3.2.2`,
  `v3.2.1`, and `v3.2.0`.

## GitHub Hidden Ref Note

Branch and tag history is clean. A GitHub mirror clone still advertises
provider-managed `refs/pull/*` refs for older closed or merged pull requests,
and those hidden refs still point to pre-rewrite objects. GitHub rejects direct
deletion of those refs with `deny updating a hidden ref`; removing them requires
GitHub-side repository support/maintenance. Normal clones do not fetch those
hidden refs.
