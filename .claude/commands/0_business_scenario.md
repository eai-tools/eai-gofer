---
description: Triage business scenario and orchestrate the unified Gofer pipeline
---

# Gofer Orchestrator

You are the Gofer orchestrator. Your job is to understand the user's
business scenario and route them through the **unified Gofer pipeline**.

## The Unified Gofer Pipeline

```text
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED GOFER PIPELINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. /1_gofer_research    → research.md                          │
│     Deep codebase exploration + technology research              │
│                         ↓ AUTO                                   │
│  2. /2_gofer_specify     → spec.md                              │
│     Feature specification informed by research                   │
│                         ↓ AUTO                                   │
│  3. /3_gofer_plan        → plan.md, data-model.md, contracts/   │
│     Technical architecture and design                            │
│                         ↓ AUTO                                   │
│  4. /4_gofer_tasks       → tasks.md, issues.md                  │
│     Dependency-ordered task breakdown                            │
│                         ↓ AUTO                                   │
│  5. /5_gofer_implement   → [source code]                        │
│     Execute tasks phase by phase                                 │
│                         ↓ AUTO                                   │
│  6. /6_gofer_validate    → validation-report.md                 │
│     Verify implementation matches plan and spec                  │
│                                                                  │
│  All artifacts go to: .specify/specs/{feature}/                 │
└─────────────────────────────────────────────────────────────────┘
```

## Auxiliary Gofer Commands

| Command                | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `/7_gofer_save`        | Save session checkpoint mid-implementation     |
| `/8_gofer_resume`      | Resume work from saved checkpoint              |
| `/9_gofer_tests`       | Define acceptance test cases using DSL         |
| `/10_gofer_cloud`      | READ-ONLY cloud infrastructure analysis        |
| `/gofer_hydrate`       | Reverse-engineer spec from existing code       |
| `/gofer_constitution`  | Create/update project constitution             |

---

## Step 1: Quick Context Scan

Before asking questions, scan the workspace for existing state:

```bash
# Check for Gofer artifacts
ls -la .specify/specs/ 2>/dev/null

# Check for session checkpoints
find .specify/specs -name "session-checkpoint.md" -type f 2>/dev/null

# Check for constitution
ls -la .specify/memory/constitution.md 2>/dev/null
```

### What to Look For

| Artifact                     | Location                            | Indicates              |
| ---------------------------- | ----------------------------------- | ---------------------- |
| `spec.md`                    | `.specify/specs/{feature}/`         | Feature specified      |
| `research.md`                | `.specify/specs/{feature}/`         | Research complete      |
| `plan.md`                    | `.specify/specs/{feature}/`         | Planning complete      |
| `tasks.md`                   | `.specify/specs/{feature}/`         | Ready for implement    |
| `session-checkpoint.md`      | `.specify/specs/{feature}/`         | Work paused (resumable)|
| `validation-report.md`       | `.specify/specs/{feature}/`         | Feature validated      |
| `constitution.md`            | `.specify/memory/`                  | Project principles set |

Report what you found before proceeding.

---

## Step 2: Determine Scenario

**ALWAYS ask the user what they want to do** - even if artifacts exist. Existing
artifacts might be for OTHER features, not what the user wants to work on now.

**"What would you like to accomplish today?"**

Present these options using the AskUserQuestion tool:

| Option                  | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| **A. New Feature**      | Build something new from scratch with clear requirements |
| **B. Modify Existing**  | Change or extend existing functionality in the codebase  |
| **C. Fix a Bug**        | Diagnose and fix a specific issue                        |
| **D. Explore/Research** | Understand the codebase before making changes            |
| **E. Resume Work**      | Continue from where I left off                           |
| **F. Setup Project**    | Initialize constitution and project guidelines           |

### For Existing Codebases

If the context scan found existing artifacts, list them and ask:

**"I found these existing features/work items:"**

- List each spec in `.specify/specs/*/` with its name and status
- Note any session checkpoints (paused work)

Then ask: **"Do you want to continue one of these, or start something new?"**

---

## Step 3: Route to Gofer Command

Based on user selection and detected state:

### Route A/B/C: New Feature, Modify Existing, or Fix Bug

All three scenarios use the same pipeline - the difference is in the research
focus:

| Scenario        | Research Focus                                           |
| --------------- | -------------------------------------------------------- |
| New Feature     | Technology research + codebase patterns                  |
| Modify Existing | Understanding existing implementation + integration points|
| Fix Bug         | Root cause analysis + affected code paths                |

#### Determine Starting Point

Check existing artifacts for the feature:

| Has This                | Missing This        | Start At              |
| ----------------------- | ------------------- | --------------------- |
| tasks.md (unchecked)    | -                   | `/5_gofer_implement`  |
| plan.md                 | tasks.md            | `/4_gofer_tasks`      |
| spec.md                 | plan.md             | `/3_gofer_plan`       |
| research.md             | spec.md             | `/2_gofer_specify`    |
| Nothing                 | Everything          | `/1_gofer_research`   |

#### For New Features

1. Ask: **"What would you like to call this feature?"** (use AskUserQuestion)
2. Create the spec directory: `.specify/specs/{feature-name}/`
3. Invoke `/1_gofer_research` to start the pipeline

Output:

```
ROUTING: GOFER PIPELINE
FEATURE: {feature-name}
STARTING: /1_gofer_research
AUTO-CHAIN: research → specify → plan → tasks → implement → validate
REASON: [explanation]
```

#### For Existing Features

If user chose to continue an existing feature:

1. Detect most advanced artifact
2. Route to appropriate command
3. Pipeline auto-chains from there

Output:

```
ROUTING: GOFER PIPELINE
FEATURE: {feature-name}
STARTING: /[N]_gofer_[stage]
REMAINING: [remaining stages]
REASON: Continuing from existing artifacts
```

### Route D: Explore/Research

Start with `/1_gofer_research` without auto-chaining:

```
ROUTING: GOFER RESEARCH (STANDALONE)
COMMAND: /1_gofer_research
AUTO-CHAIN: disabled (ask to continue after research)
REASON: User wants to explore the codebase first
```

### Route E: Resume Work

Check for session checkpoints:

```bash
find .specify/specs -name "session-checkpoint.md" -type f 2>/dev/null
```

If checkpoint found → Invoke `/8_gofer_resume`

If no checkpoint but unchecked tasks exist:

1. Find features with `- [ ]` in tasks.md
2. Present options to user
3. Resume with `/5_gofer_implement`

Output:

```
ROUTING: GOFER RESUME
FEATURE: {feature-name}
COMMAND: /8_gofer_resume
CHECKPOINT: {path to checkpoint}
REASON: Resuming from saved session
```

### Route F: Setup Project

For new projects or establishing guidelines:

```
ROUTING: GOFER CONSTITUTION
COMMAND: /gofer_constitution
REASON: User wants to establish project principles
```

---

## Step 4: Invoke the Routed Command

After determining the route:

1. Output the routing decision clearly
2. Invoke the target command using the Skill tool
3. Let that command take over the workflow

### Auto-Chaining Behavior

The unified Gofer pipeline automatically chains commands:

```text
/1_gofer_research completes → auto-invokes /2_gofer_specify
/2_gofer_specify completes  → auto-invokes /3_gofer_plan
/3_gofer_plan completes     → auto-invokes /4_gofer_tasks
/4_gofer_tasks completes    → auto-invokes /5_gofer_implement
/5_gofer_implement completes→ auto-invokes /6_gofer_validate
```

**The user only needs to run `/0_business_scenario` once** - the orchestrator
handles everything else automatically.

---

## Step 5: Handle Interruptions

If the user needs to pause:

1. Invoke `/7_gofer_save` to create checkpoint
2. Document current state
3. User can resume later with `/8_gofer_resume`

If context window is filling up:

1. Save progress with `/7_gofer_save`
2. Recommend user start new conversation
3. User runs `/8_gofer_resume` in new session

---

## Important Notes

- Keep the interview SHORT - max 2-3 questions
- **ALWAYS ask what the user wants to do** - don't assume existing artifacts are
  relevant
- Show existing features and let user choose to continue OR start new
- Document the routing decision for debugging
- If user seems confused, default to research first

---

## Quick Reference: All Gofer Commands

### Core Pipeline (Auto-Chaining)

| # | Command              | Output                   | Description                    |
|---|----------------------|--------------------------|--------------------------------|
| 1 | `/1_gofer_research`  | research.md              | Codebase + tech research       |
| 2 | `/2_gofer_specify`   | spec.md                  | Feature specification          |
| 3 | `/3_gofer_plan`      | plan.md, data-model.md   | Technical architecture         |
| 4 | `/4_gofer_tasks`     | tasks.md                 | Task breakdown                 |
| 5 | `/5_gofer_implement` | [source code]            | Implementation                 |
| 6 | `/6_gofer_validate`  | validation-report.md     | Verification                   |

### Auxiliary Commands

| Command                | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `/7_gofer_save`        | Save session checkpoint                    |
| `/8_gofer_resume`      | Resume from checkpoint                     |
| `/9_gofer_tests`       | Define test cases (DSL approach)           |
| `/10_gofer_cloud`      | Cloud infrastructure analysis (READ-ONLY)  |
| `/gofer_hydrate`       | Reverse-engineer spec from code            |
| `/gofer_constitution`  | Project principles and standards           |

---

## Observability

Log orchestrator routing:

```bash
.specify/scripts/bash/log-stage.sh 0_orchestrator --route [command] --feature [name]
```
