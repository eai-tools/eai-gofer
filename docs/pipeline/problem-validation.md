# Problem Validation (`/0a_problem_validation`)

Problem validation is a **pre-pipeline stage** that ensures you're solving the
right problem before any solution design begins. It sits between the
orchestrator (`/0_business_scenario`) and the research stage
(`/1_gofer_research`).

## What It Does

1. **Deconstructs** the problem statement into core elements
2. **Runs 5 Whys** root cause analysis to find the real problem
3. **Maps stakeholder impact** to understand who's affected and how
4. **Assesses business case** (cost of doing nothing vs value of solving)
5. **Researches the market** for existing solutions (build vs buy)
6. **Tracks assumptions** that need validation later in the pipeline

## When It Runs

Problem validation runs automatically when `/0_business_scenario` determines the
request is a new feature. You can also run it directly:

```text
/0a_problem_validation Our sales team spends 3 hours per day manually entering leads
```

## User Interaction

This stage asks you to confirm:

- **Problem understanding** - "Is this correct? Would you like to adjust?"
- **Root cause** - Confirm the 5 Whys analysis found the real root cause
- **Build vs buy** - After market research, decide whether to build custom

## Output

| Artifact           | Description                                         |
| ------------------ | --------------------------------------------------- |
| `problem-brief.md` | Validated problem with root cause and business case |
| `assumptions.md`   | Initial assumptions register (all `UNVALIDATED`)    |

## Business Case Summary

The stage produces a business case assessment:

```text
Problem: [Root cause in plain English]

Cost of Doing Nothing: [$/hours per year]
Estimated Value of Solving: [$/hours per year]
Payback Period: [weeks/months]

Software Needed? [Yes/No/Partial]
Recommendation: [PROCEED/INVESTIGATE/RECONSIDER]
```

## Recommendation Outcomes

| Recommendation | What Happens                                        |
| -------------- | --------------------------------------------------- |
| PROCEED        | Auto-chains to `/1_gofer_research`                  |
| INVESTIGATE    | Suggests more research before committing            |
| RECONSIDER     | Presents alternatives; user decides whether to stop |

## Specialist Agents

| Agent                        | Purpose                                 |
| ---------------------------- | --------------------------------------- |
| `business-problem-validator` | 5 Whys analysis and stakeholder mapping |
| `research-market-scanner`    | Market landscape and build vs buy       |

Both agents run in parallel for efficiency.

## Next Stage

After problem validation completes with a PROCEED recommendation, the pipeline
automatically continues to [`/1_gofer_research`](pipeline/research.md).
