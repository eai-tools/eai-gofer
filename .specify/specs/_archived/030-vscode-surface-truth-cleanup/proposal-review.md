---
feature: '030-vscode-surface-truth-cleanup'
created: 2026-04-30T22:14:14.406+10:00
status: approved
recommendedScenario: 'truth-alignment cleanup'
recommendedArchitecture: 'manifest-runtime-docs-test alignment'
selectedOption: 'manifest + runtime + docs + tests cleanup'
approvedBy: 'douglaswross'
approvedAt: 2026-04-30T22:14:14.406+10:00
---

# Proposal Review: 030-vscode-surface-truth-cleanup

## What We Found

The VS Code-facing Gofer surface has real drift between what the extension
manifest contributes, what the runtime registers and uses, what the config
helper mirrors, and what the documentation still claims. The highest-risk files
are `extension/package.json`, `extension/src/extension.ts`,
`extension/src/services/CommandRegistry.ts`, `extension/src/config.ts`,
`extension/README.md`, `README.md`, and `docs/guides/configuration.md`.

## Business Scenarios Considered

| Scenario | User Value | Delivery Trade-off | Recommendation |
| -------- | ---------- | ------------------ | -------------- |
| Docs-only cleanup | Faster, shorter docs | Leaves root-cause drift in manifest/runtime untouched | Defer |
| Truth-alignment cleanup across manifest, runtime, docs, and tests | Restores trust in the actual VS Code surface | Slightly broader change set | Adopt |
| Generator-first refactor | Could reduce future duplication | Too much change for the current remediation goal | Defer |

## Recommended Business Scenario

Adopt the **truth-alignment cleanup** path: use the current VS Code manifest and
runtime wiring as the product contract, then remove or correct stale command,
configuration, and workflow claims in docs and mirrors.

## Technology Architecture Recommendation

### Recommended Architecture

Use the existing extension manifest and runtime registration code as the truth
source for user-facing behavior, then align docs and targeted tests around that
contract.

### Architecture Options

| Option | Why choose it | Why not choose it now |
| ------ | ------------- | --------------------- |
| Docs-only cleanup | Lower short-term effort | Does not solve the underlying lifecycle drift |
| Manifest + runtime + docs + tests cleanup | Fixes the real trust problem with bounded changes | Slightly larger implementation scope |
| Full generator refactor | Stronger long-term unification | Out of scope for this cleanup |

## Key Decisions and Why

- **Use `extension/package.json` as the public VS Code contract**: it is the
  surface VS Code actually consumes.
- **Treat runtime-only internal commands as internal unless proven otherwise**:
  documentation should describe supported user-facing behavior only.
- **Avoid new dependencies**: the repo already has enough test and generator
  infrastructure to perform this cleanup.

## What Can Change Before Specification

- The exact set of stale commands/settings/workflows removed or corrected
- Whether a small new parity check is needed for settings or docs
- Whether any runtime mismatch should be fixed in code instead of only in docs

## Open Questions

- [ ] None blocking. The user requested continuation through the full pipeline,
      so the default architecture path is locked for specification.

## User Feedback and Overrides

- User requested the pipeline continue through implementation and validation
  without stopping after research.
- Trade-off priority: truthfulness and reliability over preserving long-form,
  stale capability claims.
- Non-negotiable boundary: do not invent new functionality solely to make old
  documentation true again.

## Approval

- Status: approved
- Next action: proceed to `$2_gofer_specify`
