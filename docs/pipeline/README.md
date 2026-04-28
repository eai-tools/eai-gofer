# Pipeline

Gofer turns a feature idea into validated implementation artifacts. Each stage
writes Markdown files under `.specify/specs/{feature}/` so another assistant or
session can continue from the same state.

## Stages

```text
0a_problem_validation -> 1_gofer_research -> 2_gofer_specify
-> 3_gofer_plan -> 4_gofer_tasks -> 5_gofer_implement
-> 6_gofer_validate -> 7a_stakeholder_comms
```

| Stage                   | Purpose                                   | Output                 |
| ----------------------- | ----------------------------------------- | ---------------------- |
| `0a_problem_validation` | Validate the business problem             | `problem-brief.md`     |
| `1_gofer_research`      | Understand codebase and options           | `research.md`          |
| `2_gofer_specify`       | Lock requirements and stories             | `spec.md`              |
| `3_gofer_plan`          | Design architecture and contracts         | `plan.md`              |
| `4_gofer_tasks`         | Build dependency-ordered tasks            | `tasks.md`             |
| `5_gofer_implement`     | Implement approved tasks                  | Source changes         |
| `6_gofer_validate`      | Check correctness, tests, risk, standards | `validation-report.md` |
| `7a_stakeholder_comms`  | Prepare release notes and demo material   | `stakeholder-comms.md` |

Claude Code can start from `/0_business_scenario` and auto-chain the whole
workflow. Codex and Gemini use the portable stage commands above.

## Artifacts

```text
.specify/specs/my-feature/
├── problem-brief.md
├── research.md
├── proposal-review.md
├── spec.md
├── plan.md
├── tasks.md
├── validation-report.md
└── stakeholder-comms.md
```

## Resuming

Resume from the most advanced artifact already present:

| Existing artifact          | Next stage          |
| -------------------------- | ------------------- |
| `tasks.md` with open tasks | `5_gofer_implement` |
| `plan.md` only             | `4_gofer_tasks`     |
| `spec.md` only             | `3_gofer_plan`      |
| `research.md` only         | `2_gofer_specify`   |
| Nothing                    | `1_gofer_research`  |

See [CLI Support](../cli-support.md) for command syntax by assistant.
