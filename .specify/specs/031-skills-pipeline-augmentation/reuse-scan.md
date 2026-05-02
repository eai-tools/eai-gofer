---
feature: 'Skills Pipeline Augmentation'
created: 2026-04-30T23:15:23Z
status: complete
source: mattpocock/skills
---

# Reuse Scan: Skills Pipeline Augmentation

## Decision Rules

- **Reuse Existing Gofer**: Gofer already covers the capability well enough
- **Extend Gofer**: The skill is additive and worth porting or adapting
- **Skip**: The skill is personal, repo-specific, deprecated with little
  remaining value, or otherwise low-leverage for Gofer
- **Cross-CLI rule**: standalone adopted helpers should be modeled as Gofer
  commands emitted across Claude, Copilot, Codex, and Gemini; provider-specific
  behavior should stay internal or be wrapped

## Engineering Skills

| Skill | What it does | Current Gofer coverage | Decision | Best Gofer fit |
| --- | --- | --- | --- | --- |
| `diagnose` | Structured reproduce-minimize-instrument-fix loop | Partial in `5_gofer_implement` only | Extend Gofer | `5_gofer_implement` and/or `gofer:diagnose` |
| `grill-with-docs` | Stress-test a plan against docs and update context/ADRs | Partial across research/spec/plan | Extend Gofer | `1_gofer_research` to `3_gofer_plan` |
| `improve-codebase-architecture` | Find deeper architectural improvements | Strongly covered by planning + validation | Reuse Existing Gofer | `3_gofer_plan` already covers much of this |
| `setup-matt-pocock-skills` | Repo bootstrap for Matt's skill pack | Not relevant to Gofer product workflow | Skip | N/A |
| `tdd` | Red-green-refactor implementation loop | Partial in `9_gofer_tests` and `5_gofer_implement` | Extend Gofer | `5_gofer_implement`, `9_gofer_tests` |
| `to-issues` | Convert plans into issue tracker tickets | Partial in `4_gofer_tasks` via `issues.md` | Extend Gofer only if tracker integration matters | `4_gofer_tasks` |
| `to-prd` | Turn discussion into a product brief | Partial in `research.md` + `proposal-review.md` | Extend Gofer | `0a_problem_validation`, `1_gofer_research`, `2_gofer_specify` |
| `triage` | Intake/state-machine issue triage | Partial in orchestrator routing only | Extend Gofer | `0_business_scenario` or bug-intake helper |
| `zoom-out` | System-level context expansion | Partial in `1_gofer_research`, but no standalone helper | Extend Gofer | `1_gofer_research` or `gofer:zoom-out` |

## Productivity Skills

| Skill | What it does | Current Gofer coverage | Decision | Best Gofer fit |
| --- | --- | --- | --- | --- |
| `caveman` | Ultra-compressed communication mode | Weakly covered by persona/tone controls | Skip or fold into existing personality control | `gofer:personality` only |
| `grill-me` | Intensive requirements interrogation | Partial in discovery and architecture question loops | Extend Gofer | `0_business_scenario`, `1_gofer_research` |
| `write-a-skill` | Create new skills with structure | Useful for maintainers, not end-user pipeline flow | Extend Gofer conditionally | Utility/helper for Gofer maintainers |

## Misc Skills

| Skill | What it does | Current Gofer coverage | Decision | Best Gofer fit |
| --- | --- | --- | --- | --- |
| `git-guardrails-claude-code` | Installs dangerous-git command guardrails | Partially covered by agent instructions, not repo automation | Extend Gofer conditionally | Utility command or constitution setup |
| `migrate-to-shoehorn` | Test migration to a specific library | Not relevant to Gofer generally | Skip | N/A |
| `scaffold-exercises` | Create teaching/exercise structures | Not core to Gofer pipeline | Skip | N/A |
| `setup-pre-commit` | Install pre-commit quality hooks | Useful setup, but not pipeline core | Extend Gofer conditionally | `gofer_constitution` / setup utility |

## Personal Skills

| Skill | What it does | Current Gofer coverage | Decision | Best Gofer fit |
| --- | --- | --- | --- | --- |
| `edit-article` | Polish article drafts | Could help comms, but too personal/specific | Skip | N/A |
| `obsidian-vault` | Manage notes in Obsidian | Not relevant to Gofer pipeline | Skip | N/A |

## Deprecated Skills

| Skill | What it does | Current Gofer coverage | Decision | Best Gofer fit |
| --- | --- | --- | --- | --- |
| `design-an-interface` | Generate alternative interface designs | Strongly covered by plan/API comparison work | Reuse Existing Gofer | `3_gofer_plan` |
| `qa` | Conversational QA and issue filing | Partially covered by validation; low incremental value | Skip | N/A |
| `request-refactor-plan` | Build incremental refactor plan | Strongly covered by plan/task flow | Reuse Existing Gofer | `3_gofer_plan`, `4_gofer_tasks` |
| `ubiquitous-language` | Extract domain glossary and canonical language | Weakly covered; no dedicated glossary artifact | Extend Gofer | `0_business_scenario`, `0a_problem_validation`, `1_gofer_research`, `2_gofer_specify` |

## Highest-Value Augmentations

| Priority | Skill | Why it is worth porting |
| --- | --- | --- |
| 1 | `ubiquitous-language` | Clear gap; user explicitly asked for vocabulary support |
| 2 | `diagnose` | Strong debugging helper with little overlap outside stage 5 |
| 3 | `tdd` | Tightens implementation workflow beyond current test generation |
| 4 | `to-prd` | Creates a better business-facing bridge into specification |
| 5 | `zoom-out` | Gives maintainers a reusable system-comprehension helper |

## Required Skill Viability Check

| Skill | Viability | Required adaptation |
| --- | --- | --- |
| `ubiquitous-language` | High | Output to Gofer-owned artifact(s), not a repo-root ad hoc file |
| `diagnose` | High | Preserve its real feedback-loop discipline and connect it to Gofer artifacts |
| `tdd` | High | Fit into Gofer's task/implementation/test stages rather than acting as a separate lifecycle |
| `to-prd` | Medium | Remove the hard dependency on upstream issue-tracker publishing |
| `zoom-out` | High | Minimal adaptation; best as a `gofer:*` helper |
| `grill-me` | High | Map to Gofer's one-question-at-a-time discovery loop |
| `to-issues` | Medium | Only worth it if Gofer wants true issue-tracker integration |

## What Skills Do *Not* Fix by Themselves

Even the best candidates do **not** solve the recent `/6_gofer_validate`
truthfulness failure on their own.

That failure requires:

- runtime integration proof
- real test execution proof
- deployment/render verification
- honest rubric scoring when evidence is missing

Those are **Gofer `/6` requirements**, not just helper-skill additions.

## Skills to Avoid Mirroring Directly

- `setup-matt-pocock-skills`
- `migrate-to-shoehorn`
- `scaffold-exercises`
- `edit-article`
- `obsidian-vault`

These are either upstream-pack-specific, personal, or not aligned with Gofer's
core delivery workflow.
