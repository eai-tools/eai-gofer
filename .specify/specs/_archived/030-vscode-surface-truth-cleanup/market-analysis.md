---
feature: '030-vscode-surface-truth-cleanup'
created: '2026-04-30T19:40:36.174+10:00'
status: draft
---

# Market Analysis: 030-vscode-surface-truth-cleanup

## Summary

The market does not offer a turnkey product that can prove whether this
repository's VS Code commands, settings, and generated workflow claims still
match shipped behavior. External tools can help with documentation hygiene, but
the core problem remains repo-specific.

**Build / Buy Decision**: **Build custom**

## Commercial Landscape

| Option | What It Helps With | Why It Is Not Enough Here |
| ------ | ------------------ | ------------------------- |
| ReadMe / GitBook | Versioned docs, review workflows, deprecation notices | They publish documentation well, but do not verify VS Code runtime truth in this repo |
| LaunchDarkly / release tooling | Controlled rollouts and staged removals | Useful for shipping behavior changes, not for proving docs/config/command accuracy |
| Release-notes platforms | Better communication of changes | They communicate decisions after the fact, but do not discover drift |

## Open-Source / Workflow Alternatives

| Option | Value | Fit |
| ------ | ----- | --- |
| Vale | Improves wording discipline for deprecations and supported behavior | Good adjunct, not the primary fix |
| Link checkers | Catch dead doc links | Useful hygiene only |
| Changesets / changelog discipline | Forces explicit breaking-change communication | Good complement to cleanup |
| Existing repo tests and scripts | Can compare docs, manifest, and runtime directly | Best fit for the core problem |

## Industry Best Practices

1. Treat the shipped manifest/runtime as the contract for supported behavior.
2. Use explicit deprecation and removal language rather than soft historical
   references.
3. Require changelog or migration guidance for removed commands/settings.
4. Keep documentation close to the implementation that proves it.

## Repo-Specific Build vs Buy View

| Factor | Build Custom | Buy Commercial |
| ------ | ------------ | -------------- |
| Time to value | Fast, because the repo already has the relevant truth surfaces | Slower, because integration still would not answer the runtime-truth problem |
| Cost | Internal time only | Extra spend without solving the hardest part |
| Accuracy | Highest, because checks can use the actual manifest/runtime | Lower, because generic docs tools cannot inspect repo semantics deeply |
| Lock-in | None | Moderate to high |

## Recommendation

Proceed with a **repo-owned cleanup**. If future stages decide to prevent drift
with tooling, prefer lightweight additions that support the repo-local truth
model instead of buying a documentation platform to compensate for it.
