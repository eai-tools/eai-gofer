---
feature: '030-vscode-surface-truth-cleanup'
created: '2026-04-30T19:40:36.174+10:00'
status: draft
---

# Business Analysis: 030-vscode-surface-truth-cleanup

## Business Case Summary

| Field | Assessment |
| ----- | ---------- |
| Problem | The VS Code surface makes claims that users and maintainers cannot reliably trust |
| Root cause | No strong lifecycle keeps manifest, runtime, docs, and generated mirrors aligned |
| Cost of doing nothing | 125-450 avoidable hours per year plus support and trust drag |
| Estimated value of solving | Recover most of that wasted time and reduce repeated onboarding confusion |
| Payback period | 2-6 weeks of focused cleanup work |
| Software needed | Partial |
| Recommendation | PROCEED |

## Stakeholder Impact

| Stakeholder | Main Pain | Business Effect |
| ----------- | --------- | --------------- |
| Maintainers | Repeated support, audit, and correction work | Slower delivery and higher cognitive load |
| VS Code users | Dead-end setup or misleading commands/settings | Lost time and lower confidence |
| New adopters | Poor first impression | Lower trust and adoption risk |
| Contributors | Copying stale assumptions into new work | Recurring drift and rework |

## Cost of Doing Nothing

If the repo keeps shipping stale VS Code-facing claims:

- support and clarification work stays high
- future documentation likely copies outdated behavior
- new cleanup work becomes harder because the trust gap grows
- users may stop relying on the extension documentation entirely

## Value of Solving

If the repo restores one trustworthy public surface:

- maintainers spend less time answering the same questions
- users can follow setup and usage guidance with higher confidence
- future feature work starts from a cleaner baseline
- release communication becomes simpler and more credible

## Why Proceed Now

This problem affects every user-facing explanation of the extension, so it
pollutes future work unless cleaned up. The effort is bounded, the required
evidence already exists in the repo, and the value is immediate.
