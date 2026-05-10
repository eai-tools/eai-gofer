---
generated: true
generated_at: "2026-05-10T11:17:59.779Z"
source_commit: "57666de1cd235757b2f0444b82e4f82aef6b8108"
---
# Documentation Surfaces

## Standard Source Of Truth

The central nightly `tech-docs` process treats `.tech-docs/` as the canonical generated snapshot for this repository.

| Path | Role | Central nightly aggregation |
|---|---|---|
| `.tech-docs/` | Generated technical snapshot derived from code and repo metadata | Yes |

## Additional Repo-Local Documentation Surfaces

| Path | Role | Central nightly aggregation |
|---|---|---|
| `docs-site/` | Docs-site framework project | No; should be summarized into `.tech-docs/` |
| `extension/language-server/docs/` | Repo-local documentation surface | No; should be summarized into `.tech-docs/` |

## Documentation Workflows

| Workflow | Triggers | Purpose |
|---|---|---|
| `.github/workflows/pages.yml` | push, manual | Repo-local docs publishing or pages deployment |

## Consolidation Status

- Repo: `gofer`
- Canonical nightly-generated surface: `.tech-docs/`
- Additional surfaces detected: 2
- Additional docs workflows detected: 1
