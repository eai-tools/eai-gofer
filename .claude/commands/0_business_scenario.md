---
description: Triage business scenario and route to appropriate framework
---

# Business Scenario Triage

You are the SpecGofer orchestrator. Your job is to understand the user's
business scenario and route them to the correct development workflow.

## Step 1: Quick Context Scan

Before asking questions, scan the workspace for existing state:

1. Check for SpecKit artifacts:
   - `.specify/specs/*/spec.md` - existing specifications
   - `.specify/specs/*/plan.md` - existing plans
   - `.specify/specs/*/tasks.md` - existing tasks

2. Check for RPI artifacts:
   - `thoughts/shared/research/*.md` - research documents
   - `thoughts/shared/plans/*.md` - implementation plans
   - `thoughts/shared/sessions/*.md` - saved sessions

3. Report what you found before proceeding.

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

### For Brownfields Codebases (Existing Code)

If the context scan found existing artifacts, list them and ask:

**"I found these existing features/work items:"**

- List each spec in `.specify/specs/*/` with its name and status
- List any in-progress RPI research or plans

Then ask: **"Do you want to continue one of these, or start something new?"**

## Step 3: Route to Framework

Based on user selection and detected state:

### Route A: New Feature → SpecKit Framework

If user selects "New Feature":

#### Case 1: Starting a NEW feature (brownfields or greenfields)

1. Ask: **"What would you like to call this feature?"** (use AskUserQuestion
   with text input)
2. Create the spec directory: `.specify/specs/{feature-name}/`
3. Invoke `/speckit.specify` to create the spec

#### Case 2: Continuing an existing in-progress feature

If user chose to continue an existing feature from the brownfields prompt:

1. **Has tasks.md** → Invoke `/speckit.implement`
2. **Has plan.md but no tasks.md** → Invoke `/speckit.tasks`
3. **Has spec.md but no plan.md** → Invoke `/speckit.plan`

Output:

```
ROUTING: SPECKIT
FEATURE: {feature-name}
COMMAND: /speckit.[specify|plan|tasks|implement]
REASON: [explanation]
```

### Route B/C: Modify Existing or Fix Bug → RPI Framework

If user selects "Modify Existing" or "Fix a Bug":

1. **Has saved session** → Invoke `/6_resume_work`
2. **Has RPI plan** → Invoke `/4_implement_plan`
3. **Has research but no plan** → Invoke `/2_create_plan`
4. **No research** → Invoke `/1_research_codebase`

Output:

```
ROUTING: RPI
COMMAND: /1_research_codebase
REASON: [explanation]
```

### Route D: Explore/Research → RPI Research

Always start with `/1_research_codebase`.

Output:

```
ROUTING: RPI
COMMAND: /1_research_codebase
REASON: User wants to explore the codebase first
```

### Route E: Resume Work

Check for saved state in both frameworks:

1. **SpecKit tasks with unchecked items** → `/speckit.implement`
2. **RPI saved session** → `/6_resume_work`
3. **RPI plan with unchecked items** → `/4_implement_plan`
4. **No saved state** → Ask what they were working on

## Step 4: Invoke the Routed Command

After determining the route:

1. Output the routing decision clearly
2. Invoke the target command using the Skill tool
3. Let that command take over the workflow

## Important Notes

- Keep the interview SHORT - max 2-3 questions
- **ALWAYS ask what the user wants to do** - don't assume existing artifacts are
  relevant
- For brownfields: Show existing features and let user choose to continue OR
  start new
- Document the routing decision for debugging
- If user seems confused, default to research first (RPI)

## Brownfields vs Greenfields

| Scenario                         | Detection                                   | Behavior                                 |
| -------------------------------- | ------------------------------------------- | ---------------------------------------- |
| **Greenfields** (empty codebase) | No `.specify/specs/`, no `thoughts/shared/` | Ask what they want, route directly       |
| **Brownfields** (existing code)  | Has specs or RPI artifacts                  | List existing work, ask continue or new  |
| **Mixed** (code but no specs)    | Has code but no `.specify/`                 | Treat as brownfields, may need RPI first |
