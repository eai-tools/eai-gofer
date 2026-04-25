# ADR-005: Mermaid Render Target — Local mmdc vs GitHub Action

## Status

Decided — 2026-04-25

## Context

Persona-pack visuals (impact canvas, value-stream, C4, capability heatmap,
bounded-context, ERD, risk heatmap, ROI projection) are emitted as Markdown
files containing Mermaid blocks. To render those blocks to PNG/SVG for
stakeholder packs, we have two options:

1. Local opt-in `@mermaid-js/mermaid-cli` (mmdc) dev dependency, invoked by
   `mermaid-export.mjs` when present.
2. GitHub Action (e.g., `mermaid-cli` action) running in CI on PR merge.

NFR-006 requires that the headless Chrome sandbox stay enabled — we never pass
`--no-sandbox`.

## Decision

Local opt-in mmdc dev dependency. CI is a fallback if mmdc is absent.

## Consequences

- Developers control when/whether visuals render — fewer CI surprises and no
  Chrome-sandbox flakes blocking PR merges.
- `mermaid-export.mjs` falls back gracefully when mmdc is missing (already
  implemented per FR-029, NFR-010): emits Markdown-only output and a single
  warning.
- Default Chrome sandbox is required (NFR-006); `mermaid-export.mjs` NEVER
  passes `--no-sandbox`. Sandbox prerequisites are documented in `quickstart.md`
  § Common Issues.
- A GitHub Action remains an option for teams that want automated rendering on
  PR; it is opt-in and out of scope for this ADR.

## References

- Spec FR-029, NFR-006, NFR-010.
- `.specify/scripts/node/mermaid-export.mjs` — the local renderer with graceful
  fallback.
- `quickstart.md` § Common Issues — `mmdc fails`.
