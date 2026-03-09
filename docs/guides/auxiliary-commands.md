# Auxiliary Commands

Beyond the core 6-stage pipeline, Gofer provides specialized commands for
specific workflows.

## Command Overview

| Command                 | Purpose                             | Output                     |
| ----------------------- | ----------------------------------- | -------------------------- |
| `/7_gofer_save`         | Save session checkpoint             | `session-handoff.md`       |
| `/7a_stakeholder_comms` | Generate stakeholder communications | `stakeholder-comms.md`     |
| `/8_gofer_resume`       | Resume from checkpoint              | Restores context           |
| `/9_gofer_tests`        | Generate test cases                 | `test-plan.md`, test files |
| `/10_gofer_cloud`       | Cloud infrastructure analysis       | `cloud-analysis.md`        |
| `/gofer_hydrate`        | Reverse-engineer spec from code     | `spec.md` (hydrated)       |
| `/gofer_constitution`   | Create/update coding standards      | `constitution.md`          |

## `/9_gofer_tests` - Test Generation

Generates comprehensive test cases from specification artifacts.

```text
/9_gofer_tests Generate tests for the auth feature
```

**What it does:**

- Reads `spec.md` acceptance criteria
- Creates `test-plan.md` with coverage matrix
- Generates test file skeletons
- Maps tests to user stories

**When to use:**

- Before implementation (test-first approach)
- After implementation to verify coverage
- When expanding test coverage for existing features

## `/10_gofer_cloud` - Cloud Infrastructure Analysis

**READ-ONLY** cloud infrastructure inspection. Supports Azure, AWS, and GCP.

```text
/10_gofer_cloud Analyze our Azure deployment
```

**What it does:**

- Resource inventory and architecture mapping
- Security analysis and compliance checks
- Cost optimization recommendations
- Configuration review

**Safety**: Only executes read operations (`list`, `show`, `describe`, `get`).
Never creates, modifies, or deletes cloud resources.

**Requires**: Cloud CLI tools installed and authenticated (`az`, `aws`, or
`gcloud`).

## `/gofer_hydrate` - Code Hydration

Reverse-engineers specifications from existing code. Useful for documenting
legacy systems.

```text
/gofer_hydrate Reverse-engineer the payment module
```

**What it does:**

- Analyzes implementation to create `spec.md`
- Maps test cases to acceptance criteria
- Documents APIs and data models
- Identifies gaps and technical debt

**When to use:**

- Documenting legacy code before refactoring
- Onboarding new team members to a codebase
- Creating specs for features that were built without them
- Pre-refactoring analysis to understand existing behavior

## `/gofer_constitution` - Constitution Management

Creates or updates project coding standards that guide all pipeline stages.

```text
/gofer_constitution Create coding standards for this project
```

**What it does:**

- Defines core principles (e.g., test-driven development)
- Establishes coding patterns and conventions
- Creates Architecture Decision Records (ADRs)
- Sets quality gates for validation

**The constitution is stored at:** `.specify/memory/constitution.md`

**How it's used:**

- `/3_gofer_plan` verifies plan alignment with principles
- `/5_gofer_implement` enforces coding standards during implementation
- `/6_gofer_validate` checks compliance as part of the rubric

## `/7a_stakeholder_comms` - Stakeholder Communications

Generates a business-ready communications package after validation passes.

```text
/7a_stakeholder_comms Feature: my-feature
```

**What it does:**

- Generates executive summary, release notes, and demo script
- Creates change management brief with phased rollout plan
- Produces business metrics dashboard (velocity, cost, quality)
- Reviews and updates assumption status
- Measures scope creep against original problem brief

**When to use:**

- After `/6_gofer_validate` passes with 100/100
- Runs automatically as the final pipeline stage

See [Stakeholder Comms](pipeline/stakeholder-comms) for full details.

## Session Management Commands

See [Session Management](guides/session-management) for detailed coverage of
`/7_gofer_save` and `/8_gofer_resume`.
