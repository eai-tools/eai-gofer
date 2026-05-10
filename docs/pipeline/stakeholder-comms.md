# Stakeholder Communications (`/7a_stakeholder_comms`)

Stakeholder communications is a **post-pipeline stage** that translates the
technical implementation into business-friendly deliverables. It runs after
validation passes (`/6_gofer_validate` scores 100/100).

## What It Does

1. **Generates executive summary** - 3-sentence business impact overview
2. **Creates release notes** - Non-technical description of what was built
3. **Writes a demo script** - 5-minute walkthrough with talking points
4. **Produces change management brief** - Phased rollout plan
5. **Defines success metrics** - KPIs tied to the original business case
6. **Reviews assumptions** - Final check on validated/unvalidated assumptions
7. **Measures scope creep** - Compares implementation against original problem

## When It Runs

This stage runs automatically after `/6_gofer_validate` passes with 100/100. You
can also run it directly:

```text
/7a_stakeholder_comms Feature: my-feature
```

## Prerequisites

Validation must pass first. If `validation-report.md` doesn't exist or shows
FAIL, the command will not generate communications and will ask you to run
`/6_gofer_validate` first.

## Output

| Artifact               | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `stakeholder-comms.md` | Release notes, demo script, change management plan |
| `business-metrics.md`  | Pipeline velocity, quality metrics, cost analysis  |
| `assumptions.md`       | Updated with final validation status               |

## Stakeholder Communications Package

The package includes everything a consultant needs to present to stakeholders:

- **Executive Summary** - What was built and why it matters
- **Release Notes** - Non-technical feature description
- **Demo Script** - Step-by-step 5-minute walkthrough
- **Change Management Brief** - Phased rollout with success criteria
- **Success Metrics** - Baselines, targets, and measurement plan
- **Communication Timeline** - When to notify which stakeholders

## Business Metrics Dashboard

Analyzes the pipeline itself to produce:

- **Feature velocity** - How long this feature took to deliver
- **Stage duration breakdown** - Time spent in each pipeline stage
- **Quality metrics** - Validation score, iterations needed
- **Cost analysis** - Token usage across the pipeline
- **Portfolio status** - All features in `.specify/specs/`

## Scope Creep Detection

If `problem-brief.md` exists, the stage compares the final implementation
against the original problem brief:

| Score  | Rating  | Action                                   |
| ------ | ------- | ---------------------------------------- |
| 0-10%  | Healthy | No scope evolution section needed        |
| 11-25% | Normal  | Brief "Scope Evolution" note in comms    |
| > 25%  | Warning | Detailed "Scope Evolution" section added |

## Specialist Agents

| Agent                       | Purpose                                          |
| --------------------------- | ------------------------------------------------ |
| `comms-writer`              | Generates non-technical communications           |
| `business-metrics-analyzer` | Analyzes pipeline metrics for business reporting |
| `assumption-tracker`        | Final assumption status review                   |
| `scope-creep-detector`      | Compares implementation vs original problem      |

## Completion Summary

When this stage completes, the full pipeline is finished:

```text
  Full Pipeline Summary:
  0a. /0a_problem_validation  (Problem validated)
  1.  /1_gofer_research        (Codebase + market research)
  2.  /2_gofer_specify         (Spec + business summary)
  3.  /3_gofer_plan            (Technical architecture)
  4.  /4_gofer_tasks           (Task breakdown)
  5.  /5_gofer_implement       (Implementation)
  6.  /6_gofer_validate        (Quality: score/100)
  7a. /7a_stakeholder_comms    (Communications package)

  The feature is ready for stakeholder review and deployment.
```
