---
feature: 'Skills Pipeline Augmentation'
created: 2026-04-30T23:15:23Z
status: approved
recommendedScenario: 'focused-additive-pack'
recommendedArchitecture: 'hybrid-helper-and-stage-local-augmentation'
selectedOption: 'focused-additive-pack'
approvedBy: 'user'
approvedAt: '2026-04-30T23:34:23Z'
---

# Proposal Review: Skills Pipeline Augmentation

## What We Found

Gofer already covers most of the generic engineering workflow surface that
`mattpocock/skills` addresses. The best path is **not** to mirror all 22 skills.
Instead, Gofer should adopt a **small additive subset** that fills real gaps and
fits existing augmentation seams. Separately, the recent `/6_gofer_validate`
failure shows that truthful validation must be hardened **inside the existing
`/6` stage**, not by adding extra `/6A.x` stages.

## Business Scenarios Considered

| Scenario | User Value | Delivery Trade-off | Recommendation |
| --- | --- | --- | --- |
| Focused additive pack | Adds the most useful missing capabilities quickly | Lowest maintenance overhead | Adopt |
| Broad workflow pack | Gives maintainers more optional helpers | More overlap review and more generated-surface work | Selectively adopt |
| Full mirror of Matt's skills | Complete external parity | Highest duplication, weakest Gofer coherence | Defer |

## Recommended Business Scenario

Adopt a **focused additive pack** first. The strongest candidates are:

- vocabulary / ubiquitous-language
- diagnose
- tdd
- to-prd or equivalent summary generation
- zoom-out

These add value without changing pipeline numbering and without duplicating what
Gofer already does well.

## Why `/6` Must Be Fixed Before Over-Expanding Skills

The recent failure was caused by `/6` passing without enough **runtime proof**:

- integration was incomplete but validation still passed
- test results were not trustworthy enough to justify full points
- deployment/render proof was missing for a user-visible change

The required fix is to strengthen `/6_gofer_validate` internally so it:

1. verifies files/routes/services are actually wired and reachable
2. runs and reports the real test suite honestly
3. requires deployment/render proof when UI or deployed environments are in scope
4. refuses to score categories from implied or fabricated evidence

This should happen **inside the current `/6` stage**, not through extra numbered
or lettered `/6` stages.

## Technology Architecture Recommendation

### Recommended Architecture

Use a **hybrid model**:

1. Add non-numbered `gofer:*` helper commands where standalone invocation makes
   sense
2. Add optional specialist sub-agent blocks inside existing numbered stages
3. Keep `.specify/commands/` as the only source of truth
4. Do not modify hardcoded numbered-stage sequence/state unless absolutely
   necessary
5. Ensure standalone helpers emit across Claude, Copilot, Codex, and Gemini
6. Harden `/6_gofer_validate` with mandatory evidence gates instead of adding
   new `/6A.x` stages

### Architecture Options

| Option | Why choose it | Why not choose it now |
| --- | --- | --- |
| Full external-skill mirror | Simple parity story | Too much overlap with current Gofer stages |
| Stage-local augmentation only | Lowest blast radius | Misses value from reusable standalone helpers |
| Hybrid helper + stage-local model | Best balance of reuse and stability | Slightly more design work up front |

## Key Decisions and Why

- **Keep pipeline numbers unchanged**: state and routing logic assume the
  existing stage sequence.
- **Port only additive skills**: Gofer already covers most generic engineering
  flows.
- **Treat vocabulary as first-wave**: it fills a clear gap despite upstream
  deprecation.
- **Use helper/control skills where possible**: this matches existing Gofer
  augmentation patterns.
- **Require cross-CLI parity**: adopted standalone helpers should not become
  Claude-only or provider-specific one-offs.
- **Fix `/6` truthfulness in place**: runtime proof, test execution, and
  deployment evidence should be mandatory inside the existing validation stage.

## What Can Change Before Specification

- Which first-wave skills are prioritized
- Whether helper commands should be standalone, stage-local, or both
- Whether GitHub issue export is in scope
- Whether deprecated upstream ideas are acceptable if Gofer owns them going
  forward
- Which runtime/deployment environments `/6` must be able to verify directly

## Open Questions

- [ ] Should Gofer start with a vocabulary-focused pack or an implementation pack
      (`diagnose` + `tdd`)?
- [ ] Is GitHub-native issue export worth adding beyond `tasks.md` and
      `issues.md`?
- [ ] Should Gofer create a dedicated `spec-summary.md` / PRD artifact?
- [ ] What minimum evidence is required for `/6` to call a deployed UI/API
      feature genuinely validated?

## User Feedback and Overrides

- User approved continuing the pipeline from research into specification,
  planning, implementation, and validation.
- Keep `/6_gofer_validate` as a single stage; do **not** add extra `/6A.x`
  stages.
- Add the approved skill set in a cross-CLI way across Claude, Copilot, Codex,
  and Gemini.
- Strengthen `/6_gofer_validate` so it only passes with truthful runtime,
  test-execution, integration, and deployment evidence.

## Approval

- Status: approved
- Next action: continue with `/2_gofer_specify`
