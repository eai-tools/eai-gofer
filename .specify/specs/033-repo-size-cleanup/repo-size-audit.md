---
feature: repo-size-cleanup
stage: audit-and-safe-cleanup
status: SAFE_CLEANUP_IMPLEMENTED
generatedAt: 2026-05-18T10:41:29+10:00
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

## Remaining Size Work

This branch reduces the checked-out source tree, but it does not rewrite Git
history. A full clone will still download old blobs until the repository history
is rewritten and force-pushed.

History rewrite candidates:

- `docs/releases/*.vsix`
- `docs-site/static/releases/*.vsix`
- `*.vsix`
- `.specify/logs/context-usage.jsonl`
- `docs/CodingAgents.pdf`

Recommended history cleanup command, after team coordination and a fresh mirror
backup:

```bash
git filter-repo --path-glob 'docs/releases/*.vsix' \
  --path-glob 'docs-site/static/releases/*.vsix' \
  --path-glob '*.vsix' \
  --path '.specify/logs/context-usage.jsonl' \
  --path 'docs/CodingAgents.pdf' \
  --invert-paths
```

That step is intentionally not performed in this branch because it rewrites
shared history and requires a force push plus every collaborator to re-clone or
repair local history.
