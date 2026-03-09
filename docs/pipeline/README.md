# The Gofer Pipeline

Gofer uses a **6-stage pipeline** that takes a feature idea from a natural
language description all the way to validated, implemented code. Each stage
produces artifacts that feed the next, ensuring full traceability from
requirements to implementation.

## Pipeline Overview

```text
/0_business_scenario                              (entry point)
        |
        v
/1_gofer_research    --> research.md               (codebase exploration)
        |
        v
/2_gofer_specify     --> spec.md                   (feature specification)
        |
        v
/3_gofer_plan        --> plan.md, data-model.md    (technical architecture)
        |
        v
/4_gofer_tasks       --> tasks.md                  (task breakdown)
        |
        v
/5_gofer_implement   --> source code               (implementation)
        |
        v
/6_gofer_validate    --> validation-report.md      (quality verification)
```

## How It Works

### One Command, Full Pipeline

The recommended way to use Gofer is to run a single command:

```text
/0_business_scenario Add user authentication with OAuth2 and JWT
```

The orchestrator (`/0_business_scenario`) will:

1. **Triage** your request to understand what you want to build
2. **Ask a few questions** to clarify requirements (optional discovery phase)
3. **Auto-chain** through all 6 stages sequentially
4. **Produce working code** validated against the specification

You only need to intervene at two points:

- **Specification review** - confirm user stories and requirements
- **Task approval** - approve the implementation task breakdown

### Auto-Chaining

Each stage automatically invokes the next when complete:

| Stage                | Completes             | Auto-Invokes         |
| -------------------- | --------------------- | -------------------- |
| `/1_gofer_research`  | `research.md` written | `/2_gofer_specify`   |
| `/2_gofer_specify`   | `spec.md` written     | `/3_gofer_plan`      |
| `/3_gofer_plan`      | `plan.md` written     | `/4_gofer_tasks`     |
| `/4_gofer_tasks`     | `tasks.md` approved   | `/5_gofer_implement` |
| `/5_gofer_implement` | All tasks complete    | `/6_gofer_validate`  |

### Artifacts

All artifacts are stored in `.specify/specs/{feature-name}/`:

```text
.specify/specs/my-feature/
├── research.md           # Codebase analysis
├── spec.md               # Feature specification
├── plan.md               # Implementation plan
├── data-model.md         # Data entities (if applicable)
├── tasks.md              # Task breakdown
├── contracts/            # API contracts (if applicable)
├── validation-report.md  # Quality report
└── checklists/           # Quality checklists
```

## Pipeline Stages

| Stage     | Command                                       | Purpose                                              | Key Output             |
| --------- | --------------------------------------------- | ---------------------------------------------------- | ---------------------- |
| Research  | [`/1_gofer_research`](pipeline/research.md)   | Explore codebase, find patterns, research technology | `research.md`          |
| Specify   | [`/2_gofer_specify`](pipeline/specify.md)     | Define user stories, requirements, success criteria  | `spec.md`              |
| Plan      | [`/3_gofer_plan`](pipeline/plan.md)           | Design architecture, data models, API contracts      | `plan.md`              |
| Tasks     | [`/4_gofer_tasks`](pipeline/tasks.md)         | Break down into ordered, executable tasks            | `tasks.md`             |
| Implement | [`/5_gofer_implement`](pipeline/implement.md) | Execute tasks phase by phase                         | Source code            |
| Validate  | [`/6_gofer_validate`](pipeline/validate.md)   | Verify implementation against spec                   | `validation-report.md` |

## Resuming Work

If you need to stop and resume later:

1. Run `/7_gofer_save` to create a checkpoint
2. Start a new session
3. Run `/8_gofer_resume` to restore context and continue

The pipeline detects existing artifacts and resumes from the most advanced
stage:

| Existing Artifacts                         | Resumes At           |
| ------------------------------------------ | -------------------- |
| `tasks.md` (unchecked tasks)               | `/5_gofer_implement` |
| `plan.md` but no `tasks.md`                | `/4_gofer_tasks`     |
| `spec.md` + `research.md` but no `plan.md` | `/3_gofer_plan`      |
| `research.md` but no `spec.md`             | `/2_gofer_specify`   |
| Nothing                                    | `/1_gofer_research`  |

See [Session Management](guides/session-management.md) for more details.

## Works with Both AI Assistants

Gofer commands are identical in Claude Code and GitHub Copilot:

| AI Assistant       | How to Run                                               |
| ------------------ | -------------------------------------------------------- |
| **Claude Code**    | Type `/0_business_scenario` followed by your description |
| **GitHub Copilot** | Type `/0_business_scenario` followed by your description |

The same slash commands work in both tools. Gofer's MCP tools handle the
integration transparently.
