---
feature: 'Skills Pipeline Augmentation'
created: 2026-04-30T23:15:23Z
status: complete
applicationClassification: non-application
---

# Context Bundle: Skills Pipeline Augmentation

## Feature Summary

Map `mattpocock/skills` onto Gofer's existing workflow and identify which
capabilities should be adopted as optional augmentations without changing the
numbered pipeline.

## Application Classification

| Field | Decision |
| --- | --- |
| Classification | Non-application work |
| Reason | This is workflow and command-surface design research, not end-user application delivery |
| Four-step AI journey required | No |

## Relevant Existing Specs

- `.specify/specs/030-vscode-surface-truth-cleanup/`
- `.specify/specs/031-skills-pipeline-augmentation/`

## Relevant Code Paths

| Path | Why it matters |
| --- | --- |
| `.specify/commands/` | Canonical Gofer command definitions |
| `.specify/scripts/node/generate-commands.mjs` | Emits all generated command surfaces |
| `extension/src/council/CommandGenerator.ts` | Encodes numbered-stage progression |
| `extension/src/autonomous/PipelineStateManager.ts` | Encodes persisted stage state |
| `extension/resources/bash-scripts/pipeline-state.sh` | Shell-side stage-state contract |
| `extension/src/council/CrossPlatformCommandRouter.ts` | Runtime command routing across surfaces |

## External Source Set

- `mattpocock/skills/README.md`
- `mattpocock/skills/skills/engineering/**/SKILL.md`
- `mattpocock/skills/skills/productivity/**/SKILL.md`
- `mattpocock/skills/skills/misc/**/SKILL.md`
- `mattpocock/skills/skills/personal/**/SKILL.md`
- `mattpocock/skills/skills/deprecated/**/SKILL.md`

## Reuse / Extend / Create Summary

- **Reuse**: discovery, research, planning, tasking, implementation, validation,
  stakeholder comms, save/resume, constitution, hydration
- **Extend**: vocabulary extraction, diagnose loop, tighter TDD, PRD/spec-summary
  output, zoom-out helper, deeper grilling mode, optional issue export
- **Create New Only If Needed**: helper commands for standalone workflows; avoid
  new numbered stages

## Protected Boundaries

- Do not renumber Gofer stages
- Do not hand-edit generated mirror surfaces
- Do not duplicate stage responsibilities that already exist
- Keep `.specify/commands/` as the command source of truth
- Keep standalone helper commands portable across Claude, Copilot, Codex, and
  Gemini

## Candidate First-Wave Augmentations

1. Vocabulary / ubiquitous-language helper
2. Diagnose helper
3. TDD helper
4. PRD / spec-summary helper
5. Zoom-out helper

## Validation Truthfulness Requirement

The recent `/6_gofer_validate` failure changes the priority order:

- helper-skill adoption is still useful
- but the immediate platform requirement is to harden the **existing**
  `/6_gofer_validate` stage so it cannot report a false pass

Required in `/6`:

1. runtime import/wiring verification
2. real executed test-suite evidence
3. deployment/render proof when acceptance depends on a live target
4. strict evidence provenance in the validation report
5. honest zero-scoring when proof is missing

## What the Next Agent Needs

If this work proceeds to specification:

- Treat this as a **hybrid helper + stage-local augmentation** feature
- Keep pipeline numbering unchanged
- Prioritize vocabulary, diagnose, and TDD before lower-value helpers
- Use existing augmentation patterns rather than inventing a new stage model
- For standalone helpers, design for cross-CLI emission from the canonical
  command source instead of provider-specific one-offs
- Treat `/6` hardening as a prerequisite for trustworthy end-to-end workflow
  claims
