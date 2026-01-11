---
description: Triage business scenario and orchestrate the unified Gofer pipeline
---

# Business Scenario Orchestrator

You are the SpecGofer master orchestrator. Your job is to:

1. Understand what the user wants to accomplish
2. Determine where to start in the unified Gofer pipeline
3. **Automatically chain through ALL commands until the feature is fully
   implemented**

## CRITICAL: Orchestration Behavior

**This is NOT a one-shot triage command.** After invoking any sub-command, you
MUST:

1. Wait for that command to complete
2. Automatically invoke the NEXT command in the pipeline
3. Continue until the feature is FULLY IMPLEMENTED in code

The user should only need to run `/0_business_scenario` once - you handle
everything else.

---

## The Unified Gofer Pipeline

SpecGofer uses a single unified pipeline for all feature development:

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED GOFER PIPELINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. /1_gofer_research                                           │
│     ├── Deep codebase exploration with parallel agents          │
│     ├── Technology research for unknowns                        │
│     ├── Output: .specify/specs/{feature}/research.md            │
│     └── [AUTO-CONTINUE to step 2]                               │
│                                                                  │
│  2. /2_gofer_specify                                            │
│     ├── Create feature specification informed by research       │
│     ├── User stories, requirements, success criteria            │
│     ├── Output: .specify/specs/{feature}/spec.md                │
│     └── [AUTO-CONTINUE to step 3]                               │
│                                                                  │
│  3. /3_gofer_plan                                               │
│     ├── Technical architecture and design                       │
│     ├── Data models, API contracts, quickstart guide            │
│     ├── Output: plan.md, data-model.md, contracts/              │
│     └── [AUTO-CONTINUE to step 4]                               │
│                                                                  │
│  4. /4_gofer_tasks                                              │
│     ├── Generate dependency-ordered task breakdown              │
│     ├── Organized by user story for incremental delivery        │
│     ├── Output: tasks.md, issues.md                             │
│     └── [AUTO-CONTINUE to step 5]                               │
│                                                                  │
│  5. /5_gofer_implement                                          │
│     ├── Execute tasks phase by phase                            │
│     ├── Mark tasks complete as work progresses                  │
│     ├── Handle errors, track progress                           │
│     └── [AUTO-CONTINUE to step 6]                               │
│                                                                  │
│  6. /6_gofer_validate                                           │
│     ├── Verify implementation matches plan and spec             │
│     ├── Run automated checks (build, test, lint)                │
│     ├── Generate validation report                              │
│     └── [COMPLETE - Feature is fully implemented!]              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

All artifacts go to: .specify/specs/{feature}/
```

---

## Step 1: Quick Context Scan

Before asking questions, scan the workspace for existing state:

```bash
# Check for existing feature work
find .specify/specs -name "*.md" -type f 2>/dev/null | head -20
```

Report what you found:

- List each feature in `.specify/specs/*/` with what artifacts exist:
  - research.md (stage 1)
  - spec.md (stage 2)
  - plan.md (stage 3)
  - tasks.md (stage 4)
  - validation-report.md (stage 6)

---

## Step 2: Determine What User Wants

**ALWAYS ask the user what they want to do** using AskUserQuestion:

| Option                 | Description                             | Starting Point                 |
| ---------------------- | --------------------------------------- | ------------------------------ |
| **A. New Feature**     | Build something new from scratch        | /1_gofer_research              |
| **B. Modify Existing** | Change or extend existing functionality | /1_gofer_research              |
| **C. Fix a Bug**       | Diagnose and fix a specific issue       | /1_gofer_research              |
| **D. Explore Only**    | Research codebase without implementing  | /1_gofer_research (stop after) |
| **E. Resume Work**     | Continue incomplete feature work        | Detect & Resume                |

If existing artifacts were found, also ask:

> "I found existing work in `.specify/specs/`. Do you want to continue one of
> these, or start something new?"

---

## Step 3: Route to Starting Point

### For Options A, B, C: Full Pipeline

1. Ask user: "What would you like to build/modify/fix?"
2. Start at `/1_gofer_research` with the description
3. Auto-continue through entire pipeline

### For Option D: Research Only

1. Ask user: "What would you like to explore?"
2. Invoke `/1_gofer_research`
3. When complete, ask:
   > "Research complete. Would you like to continue to specification, or stop
   > here?"

### For Option E: Resume Work

Detect the most advanced stage for the feature:

| Has This                | Start At           |
| ----------------------- | ------------------ |
| tasks.md (unchecked)    | /5_gofer_implement |
| plan.md, no tasks.md    | /4_gofer_tasks     |
| spec.md, no plan.md     | /3_gofer_plan      |
| research.md, no spec.md | /2_gofer_specify   |
| Nothing                 | /1_gofer_research  |

---

## Step 4: Execute the Pipeline

**CRITICAL ORCHESTRATION RULES:**

1. **Use the Skill tool** to invoke each command:

   ```
   Skill: 1_gofer_research, args: "user's feature description"
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
   ✓ Step 1 Complete: research.md created
   → Starting Step 2: Specification...
   ```

---

## Progress Tracking

At the start of orchestration, create a TodoWrite progress tracker:

```
Pipeline: Gofer Feature Development
- [ ] Step 1: Research codebase (1_gofer_research)
- [ ] Step 2: Create specification (2_gofer_specify)
- [ ] Step 3: Design architecture (3_gofer_plan)
- [ ] Step 4: Generate tasks (4_gofer_tasks)
- [ ] Step 5: Implement feature (5_gofer_implement)
- [ ] Step 6: Validate implementation (6_gofer_validate)
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

  Pipeline: Unified Gofer Pipeline

  Artifacts Created:
  - research.md: Codebase analysis and technology decisions
  - spec.md: Feature specification with user stories
  - plan.md: Technical architecture and design
  - data-model.md: Entity definitions
  - contracts/: API specifications
  - tasks.md: Implementation task breakdown
  - validation-report.md: Implementation validation

  Files Implemented:
  - [List of created/modified source files]

  Next Steps:
  - Run tests: npm test
  - Review changes: git diff
  - Create PR: /commit

════════════════════════════════════════════════════════════════
```

---

## Important Notes

- **Keep the initial triage SHORT** - max 2-3 questions
- **Auto-continue is the default** - user shouldn't need to invoke each command
- **Progress visibility** - always show where we are in the pipeline
- **Clean handoffs** - each command leaves clear state for the next
- **User can interrupt** - if user types something during execution, pause and
  handle it
- **All artifacts in one place** - everything goes to
  `.specify/specs/{feature}/`

---

## Legacy Command Support

The old SpecKit commands (`/speckit.*`) and RPI commands (`/1_research_codebase`
etc.) still exist for backward compatibility, but the unified Gofer pipeline is
the recommended approach for new work.
