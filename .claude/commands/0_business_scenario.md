---
description:
  Triage business scenario and orchestrate full implementation workflow
---

# Business Scenario Orchestrator

You are the SpecGofer master orchestrator. Your job is to:

1. Understand what the user wants to accomplish
2. Route them to the correct workflow (SpecKit or RPI)
3. **Automatically chain through ALL commands until the feature is fully
   implemented**

## CRITICAL: Orchestration Behavior

**This is NOT a one-shot triage command.** After invoking any sub-command, you
MUST:

1. Wait for that command to complete
2. Automatically invoke the NEXT command in the workflow
3. Continue until the feature is FULLY IMPLEMENTED in code

The user should only need to run `/0_business_scenario` once - you handle
everything else.

---

## Step 1: Quick Context Scan

Before asking questions, scan the workspace for existing state:

```bash
# Check for existing work
find .specify/specs -name "*.md" -type f 2>/dev/null | head -10
find thoughts/shared -name "*.md" -type f 2>/dev/null | head -10
```

Report what you found:

- List each spec in `.specify/specs/*/` with its name and what artifacts exist
  (spec.md, plan.md, tasks.md)
- List any RPI research or plans in `thoughts/shared/`

---

## Step 2: Determine What User Wants

**ALWAYS ask the user what they want to do** using AskUserQuestion:

| Option                  | Description                                 | Workflow        |
| ----------------------- | ------------------------------------------- | --------------- |
| **A. New Feature**      | Build something new with clear requirements | SpecKit         |
| **B. Modify Existing**  | Change or extend existing functionality     | RPI             |
| **C. Fix a Bug**        | Diagnose and fix a specific issue           | RPI             |
| **D. Explore/Research** | Understand the codebase first               | RPI             |
| **E. Resume Work**      | Continue from where I left off              | Detect & Resume |

If existing artifacts were found, also ask:

> "I found existing work. Do you want to continue one of these, or start
> something new?"

---

## Step 3: Route to Workflow

Based on user selection, enter one of these orchestration loops:

### WORKFLOW A: New Feature → SpecKit Pipeline

**Full pipeline that runs automatically:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPECKIT PIPELINE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. /speckit.specify                                            │
│     ├── Get feature description from user                       │
│     ├── Create spec.md with user stories                        │
│     ├── Validate with checklist                                 │
│     └── [AUTO-CONTINUE to step 2]                               │
│                                                                  │
│  2. /speckit.plan                                               │
│     ├── Generate research.md (resolve unknowns)                 │
│     ├── Generate data-model.md, contracts/                      │
│     ├── Generate plan.md with architecture                      │
│     └── [AUTO-CONTINUE to step 3]                               │
│                                                                  │
│  3. /speckit.tasks                                              │
│     ├── Generate tasks.md organized by user story               │
│     ├── Generate issues.md for GitHub                           │
│     └── [AUTO-CONTINUE to step 4]                               │
│                                                                  │
│  4. /speckit.implement                                          │
│     ├── Execute all tasks phase by phase                        │
│     ├── Mark tasks complete as they're done                     │
│     ├── Run tests, handle errors                                │
│     └── [COMPLETE - Feature is implemented!]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Execution Instructions:**

1. Ask user: "What feature would you like to build?"
2. Invoke `/speckit.specify` with the feature description
3. When specify completes, **immediately** invoke `/speckit.plan`
4. When plan completes, **immediately** invoke `/speckit.tasks`
5. When tasks completes, **immediately** invoke `/speckit.implement`
6. When implement completes, report: "Feature fully implemented!"

**Resume Logic (if artifacts exist):**

- Has tasks.md with unchecked items → Start at step 4 (implement)
- Has plan.md but no tasks.md → Start at step 3 (tasks)
- Has spec.md but no plan.md → Start at step 2 (plan)
- Has nothing → Start at step 1 (specify)

---

### WORKFLOW B/C: Modify or Fix → RPI Pipeline

**Full pipeline that runs automatically:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      RPI PIPELINE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. /1_research_codebase                                        │
│     ├── Understand the relevant parts of codebase               │
│     ├── Save findings to thoughts/shared/research/              │
│     └── [AUTO-CONTINUE to step 2]                               │
│                                                                  │
│  2. /2_create_plan                                              │
│     ├── Create detailed implementation plan                     │
│     ├── Save to thoughts/shared/plans/                          │
│     └── [AUTO-CONTINUE to step 3]                               │
│                                                                  │
│  3. /4_implement_plan                                           │
│     ├── Execute the plan systematically                         │
│     ├── Update checkboxes as work progresses                    │
│     └── [AUTO-CONTINUE to step 4]                               │
│                                                                  │
│  4. /3_validate_plan                                            │
│     ├── Verify implementation matches plan                      │
│     ├── Run tests and checks                                    │
│     └── [COMPLETE - Modification/fix is done!]                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Execution Instructions:**

1. Ask user: "What would you like to modify or fix?"
2. Invoke `/1_research_codebase` with the context
3. When research completes, **immediately** invoke `/2_create_plan`
4. When plan completes, **immediately** invoke `/4_implement_plan`
5. When implement completes, **immediately** invoke `/3_validate_plan`
6. When validate completes, report: "Modification/fix complete!"

**Resume Logic (if artifacts exist):**

- Has saved session → `/6_resume_work` then continue pipeline
- Has plan with unchecked items → Start at step 3 (implement)
- Has research but no plan → Start at step 2 (create_plan)
- Has nothing → Start at step 1 (research)

---

### WORKFLOW D: Explore/Research Only

```
┌─────────────────────────────────────────────────────────────────┐
│                   RESEARCH PIPELINE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. /1_research_codebase                                        │
│     ├── Deep exploration with parallel agents                   │
│     ├── Save findings to thoughts/shared/research/              │
│     └── [COMPLETE - Knowledge captured!]                        │
│                                                                  │
│  After research, ask:                                           │
│  "Research complete. Would you like to:"                        │
│  - A. Create an implementation plan (/2_create_plan)            │
│  - B. Start a new feature based on findings (/speckit.specify)  │
│  - C. Stop here (research only)                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### WORKFLOW E: Resume Work

Detect the most recent incomplete work and resume:

1. Check for SpecKit tasks.md with unchecked items → Resume SpecKit pipeline
2. Check for RPI plan with unchecked items → Resume RPI pipeline
3. Check for saved sessions → `/6_resume_work`
4. No incomplete work found → Ask what they want to do

---

## Step 4: Execute the Pipeline

**CRITICAL ORCHESTRATION RULES:**

1. **Use the Skill tool** to invoke each sub-command:

   ```
   Skill: speckit.specify, args: "user's feature description"
   ```

2. **Wait for completion** before invoking the next command

3. **Handle errors gracefully:**
   - If a command fails, report the error clearly
   - Ask user if they want to retry or skip
   - Don't leave the pipeline in an unknown state

4. **Track progress** using TodoWrite:
   - Create a todo for each pipeline step
   - Mark steps complete as they finish
   - Show user the overall progress

5. **Report clearly** at each transition:
   ```
   ✓ Step 1 Complete: spec.md created
   → Starting Step 2: Planning...
   ```

---

## Progress Tracking

At the start of orchestration, create a TodoWrite progress tracker:

```
Pipeline: SpecKit New Feature
- [ ] Step 1: Create specification (speckit.specify)
- [ ] Step 2: Generate implementation plan (speckit.plan)
- [ ] Step 3: Generate task breakdown (speckit.tasks)
- [ ] Step 4: Implement all tasks (speckit.implement)
```

Update as each step completes.

---

## Error Recovery

If any step fails:

1. **Report the error clearly** with context
2. **Ask user what to do:**
   - Retry the failed step
   - Skip and continue (if possible)
   - Stop and save progress
3. **Never leave work in an inconsistent state**

---

## Final Completion

When the entire pipeline completes:

```
════════════════════════════════════════════════════════════════
  ✓ FEATURE COMPLETE: [Feature Name]
════════════════════════════════════════════════════════════════

  Pipeline: SpecKit (New Feature)

  Artifacts Created:
  - spec.md: Feature specification with user stories
  - plan.md: Technical architecture and design
  - tasks.md: Implementation task breakdown
  - [List of implemented files]

  Next Steps:
  - Run tests: npm test
  - Review changes: git diff
  - Commit: /commit

════════════════════════════════════════════════════════════════
```

---

## Important Notes

- **Keep the initial triage SHORT** - max 2-3 questions
- **Auto-continue is the default** - user shouldn't need to invoke each command
- **Progress visibility** - always show where we are in the pipeline
- **Clean handoffs** - each command should leave clear state for the next
- **User can interrupt** - if user types something during execution, pause and
  handle it
