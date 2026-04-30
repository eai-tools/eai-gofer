# ADR-003: /gofer:plan Namespace Split

## Status

Accepted — 2026-04-25

## Context

The Gofer pipeline has a `/3_gofer_plan` stage that generates implementation
plans. We're introducing `/gofer:*` additive aliases for all 16 stages, which
would naturally make `/3_gofer_plan` aliased as `/gofer:plan`. However, modern
CLIs (Claude Code, Copilot CLI) have a `/plan` mode toggle convention. Calling
`/gofer:plan` for our pipeline stage would collide with user expectations.

## Decision

Split the namespace:

- `/gofer:plan` = plan-mode toggle (control command, surfaces: claude,
  claude-mirror, copilot, vscode)
- `/gofer:plan-stage` = the Gofer plan stage (alias for `/3_gofer_plan`)

## Consequences

- Users invoking `/gofer:plan` get plan-mode behavior, matching CLI convention
- Users wanting the Gofer plan stage explicitly type `/gofer:plan-stage` or
  `/3_gofer_plan`
- Three new control commands ship: `/gofer:plan`, `/gofer:side`,
  `/gofer:personality`
- Control commands have surfaces [claude, claude-mirror, copilot, vscode] only
