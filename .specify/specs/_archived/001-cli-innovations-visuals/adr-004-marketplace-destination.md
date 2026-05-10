# ADR-004: Plugin Marketplace Destination

## Status

Decided — 2026-04-25

## Context

The Gofer Claude plugin is ready to ship. Two destination options exist:

1. `anthropics/claude-plugins-official` — official curated marketplace.
2. Community-first marketplace (e.g., a GitHub-based community registry).

The plugin manifest at `.claude-plugin/plugin.json` is identical regardless of
destination, so the decision is purely about distribution channel and
review-velocity tradeoffs.

## Decision

Ship to a community-first marketplace initially. Submit to the official
marketplace once we have:

- ≥3 production users.
- Documented incident/issue history.
- Stable API surface (no breaking changes for 30 days).

## Consequences

- Faster initial distribution; we can iterate without official-marketplace
  gating.
- Community marketplace requires user-side discovery effort (e.g., a `README`
  link from this repo).
- Migration to the official marketplace at maturity is a low-cost rename of
  distribution channel — no change to `plugin.json` shape.
- ADR-005 covers a related decision on the Mermaid rendering target; the two
  ADRs are independent but both feed FR-031 / FR-029 packaging.

## References

- Spec FR-031, locked decisions section.
- `.claude-plugin/plugin.json` (the manifest that ships in either channel).
