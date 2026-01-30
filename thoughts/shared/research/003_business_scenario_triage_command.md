---
date: 2025-12-22T12:00:00Z
researcher: Claude
topic: 'Business Scenario Triage Command - 0_business_scenario Design'
tags: [research, specgofer, triage, framework-selection, autonomous-agent]
status: complete
---

# Research: Business Scenario Triage Command Design

## Research Question

How should Gofer implement a `0_business_scenario` command that:

1. Asks the user about their business scenario in Claude Code
2. Decides between RPI (Research-Plan-Implement) vs Gofer framework
3. Automatically drives Claude Code through the chosen framework sequence
4. Detects Claude Code state and progress to continue from where it left off

## Summary

The codebase has strong foundations for this feature:

- **16 existing commands** split between RPI (`/1_*` - `/8_*`) and Gofer
  (`/speckit.*`)
- **Autonomous responder** (`ClaudeCodeAutonomousResponder.ts`) already monitors
  Claude Code and makes intelligent decisions using Claude Haiku
- **Terminal integration** (`autonomousCommands.ts`) spawns Claude Code via
  node-pty and sends commands
- **Currently hardcoded** to always send `/speckit.implement` - needs dynamic
  routing

The proposed `0_business_scenario` command would act as an **intelligent triage
router** that interviews the user and orchestrates the appropriate framework.

## Detailed Findings

### Current Architecture

#### Command Structure

- **Location**: `.claude/commands/`
- **RPI Commands**: `/1_research_codebase` through `/8_define_test_cases`
  (numbered sequence)
- **Gofer Commands**: `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`,
  `/speckit.implement`, etc.

#### Claude Code Terminal Integration

- **File**: `extension/src/autonomousCommands.ts`
- **Mechanism**: Uses `node-pty` to spawn Claude Code process
- **Current behavior**: Lines 752-772 - Always sends `/speckit.implement` after
  detecting `>` prompt
- **Limitation**: No conditional logic to choose the right command

```typescript
// Current hardcoded approach (lines 760-761)
ptyRef.write('/speckit.implement');
outputChannel?.appendLine('  → Typed command: /speckit.implement');
```

#### Autonomous Responder

- **File**: `extension/src/autonomous/ClaudeCodeAutonomousResponder.ts`
- **Capability**: Monitors terminal output, detects questions/idle states, calls
  Claude Haiku for decisions
- **Actions supported**: `ACTION: NO_INTERRUPT`, `ACTION: CONTINUE_IMPLEMENT`,
  `ACTION: ENGINEERING_REVIEW`, etc.
- **Could be extended** to support framework routing decisions

### Decision Logic - When to Use Which Framework

From `CLAUDE.md` (lines 69-88):

| Scenario                            | Use                        | Why                                  |
| ----------------------------------- | -------------------------- | ------------------------------------ |
| New feature with clear requirements | Gofer                      | Structured spec → plan → tasks flow  |
| Exploring unfamiliar codebase       | RPI `/1_research_codebase` | Parallel agents for fast exploration |
| Need to understand existing code    | RPI `/1_research_codebase` | Deep analysis with codebase-analyzer |
| Resume work after break             | RPI `/6_resume_work`       | Session management                   |
| Test-first development              | RPI `/8_define_test_cases` | DSL-based test design                |
| Feature implementation              | Gofer `/speckit.implement` | Task tracking with checkboxes        |

**Key insight**:

- **RPI** = Working with existing code, research needed, resumable sessions
- **Gofer** = New functionality, clear requirements, full spec-to-implementation
  flow

### Proposed Design: `0_business_scenario` Command

#### Purpose

A triage command that runs BEFORE any other command to:

1. Interview the user about their request
2. Analyze the codebase state (existing specs, plans, tasks, research)
3. Decide which framework and starting command to use
4. Orchestrate the full workflow automatically

#### Command File Structure

```markdown
---
description: Triage business scenario and route to appropriate framework
---

# Business Scenario Triage

You are the Gofer orchestrator. Your job is to understand the user's business
scenario and automatically drive them through the correct workflow.

## Step 1: Gather Context

Ask the user a focused set of questions:

1. **What are you trying to accomplish?**
   - [ ] Build a NEW feature from scratch
   - [ ] Modify/extend EXISTING functionality
   - [ ] Fix a bug in the codebase
   - [ ] Explore/understand the codebase
   - [ ] Resume previous work
   - [ ] Define tests for existing code

2. **How familiar are you with this codebase?**
   - [ ] New to this codebase
   - [ ] Somewhat familiar
   - [ ] Very familiar with relevant areas

3. **Do you have clear requirements?**
   - [ ] Yes, I know exactly what I want
   - [ ] Partially - need to clarify some things
   - [ ] No - still exploring options

## Step 2: Analyze Existing State

Check for existing artifacts:

- `.specify/specs/*/spec.md` - Gofer specs
- `.specify/specs/*/plan.md` - Gofer plans
- `.specify/specs/*/tasks.md` - Gofer tasks
- `thoughts/shared/research/*.md` - RPI research
- `thoughts/shared/plans/*.md` - RPI plans
- `thoughts/shared/sessions/*.md` - RPI saved sessions

## Step 3: Route to Framework

Based on responses and state, call the appropriate command sequence:

### Route to Gofer (NEW functionality)

If: New feature + clear requirements + no existing RPI context Then:
`/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`

### Route to RPI (EXISTING code / research needed)

If: Modifying existing code OR unfamiliar with codebase OR resuming work Then:
`/1_research_codebase` → `/2_create_plan` → `/4_implement_plan`

### Resume Routes

If: Saved session exists Then: `/6_resume_work`

If: Gofer tasks exist but incomplete Then: `/speckit.implement`

## Step 4: Drive Completion

After starting the workflow:

- Monitor progress through autonomous responder
- Detect when current phase completes
- Automatically invoke next command in sequence
- Handle errors and request clarification when needed
```

### Integration with Autonomous Responder

The autonomous responder (`ClaudeCodeAutonomousResponder.ts`) needs enhancement:

#### New Action Types

```typescript
// Add to existing action types
'ACTION: ROUTE_SPECKIT_SPECIFY';
'ACTION: ROUTE_SPECKIT_PLAN';
'ACTION: ROUTE_SPECKIT_TASKS';
'ACTION: ROUTE_SPECKIT_IMPLEMENT';
'ACTION: ROUTE_RPI_RESEARCH';
'ACTION: ROUTE_RPI_PLAN';
'ACTION: ROUTE_RPI_IMPLEMENT';
'ACTION: ROUTE_RPI_RESUME';
```

#### State Detection

```typescript
interface WorkflowState {
  framework: 'speckit' | 'rpi' | 'unknown';
  currentPhase: string;
  nextPhase: string | null;
  artifacts: {
    specMdExists: boolean;
    planMdExists: boolean;
    tasksMdExists: boolean;
    researchExists: boolean;
    savedSessionExists: boolean;
  };
}
```

### Implementation in autonomousCommands.ts

Replace hardcoded `/speckit.implement` with dynamic routing:

```typescript
// Instead of:
// ptyRef.write('/speckit.implement');

// Do:
const initialCommand = await determineInitialCommand(specId, workspacePath);
ptyRef.write(initialCommand);

async function determineInitialCommand(
  specId: string,
  workspacePath: string
): Promise<string> {
  // Check if this is first run (no spec state)
  const specDir = path.join(workspacePath, '.specify', 'specs', specId);
  const hasSpec = fs.existsSync(path.join(specDir, 'spec.md'));
  const hasPlan = fs.existsSync(path.join(specDir, 'plan.md'));
  const hasTasks = fs.existsSync(path.join(specDir, 'tasks.md'));

  // Check for RPI state
  const hasResearch =
    fs.readdirSync(path.join(workspacePath, 'thoughts', 'shared', 'research'))
      .length > 0;
  const hasSavedSession =
    fs.readdirSync(path.join(workspacePath, 'thoughts', 'shared', 'sessions'))
      .length > 0;

  // If completely fresh - start with triage
  if (!hasSpec && !hasResearch) {
    return '/0_business_scenario';
  }

  // Existing Gofer artifacts - continue flow
  if (hasTasks) return '/speckit.implement';
  if (hasPlan) return '/speckit.tasks';
  if (hasSpec) return '/speckit.plan';

  // Has saved session - resume
  if (hasSavedSession) return '/6_resume_work';

  // Has research - continue RPI flow
  if (hasResearch) return '/2_create_plan';

  // Fallback to triage
  return '/0_business_scenario';
}
```

### Workflow Orchestration State Machine

```
                    ┌─────────────────────────┐
                    │   0_business_scenario   │
                    │   (triage interview)    │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │  Gofer Flow │   │   RPI Flow    │   │  Resume Flow  │
    │               │   │               │   │               │
    │ specify       │   │ 1_research    │   │ 6_resume_work │
    │    ↓          │   │      ↓        │   │      ↓        │
    │ plan          │   │ 2_create_plan │   │ (continues)   │
    │    ↓          │   │      ↓        │   │               │
    │ tasks         │   │ 4_implement   │   └───────────────┘
    │    ↓          │   │      ↓        │
    │ implement     │   │ 3_validate    │
    └───────────────┘   └───────────────┘
```

## Code References

- `extension/src/autonomousCommands.ts:752-772` - Current hardcoded command
  sending
- `extension/src/autonomousCommands.ts:640-653` - PTY spawn logic
- `extension/src/autonomous/ClaudeCodeAutonomousResponder.ts:1-150` - Autonomous
  responder architecture
- `CLAUDE.md:69-88` - Framework selection decision table
- `.claude/commands/` - All 16 existing commands

## Architecture Insights

### Key Design Decisions

1. **Triage should be a Claude command**
   (`.claude/commands/0_business_scenario.md`)
   - Follows existing pattern of numbered commands
   - Executes in Claude Code context with access to conversation
   - Can ask clarifying questions interactively

2. **Gofer should handle routing**
   - `autonomousCommands.ts` determines initial command
   - `ClaudeCodeAutonomousResponder.ts` monitors and chains commands
   - Haiku provides intelligent decision-making

3. **State is persistent across sessions**
   - Gofer: `.specify/specs/[feature]/`
   - RPI: `thoughts/shared/`
   - Both support resume workflows

4. **The autonomous responder is the brain**
   - Already monitors terminal output
   - Already calls Claude Haiku for decisions
   - Just needs new action types for routing

### Files to Modify

| File                                                        | Change                                   |
| ----------------------------------------------------------- | ---------------------------------------- |
| `.claude/commands/0_business_scenario.md`                   | NEW - Create triage command              |
| `extension/src/autonomousCommands.ts`                       | Add `determineInitialCommand()` function |
| `extension/src/autonomous/ClaudeCodeAutonomousResponder.ts` | Add routing action types                 |
| `CLAUDE.md`                                                 | Document the new triage workflow         |

## Open Questions

1. **Should triage be required or optional?**
   - Option A: Always start with triage for fresh projects
   - Option B: Only triage when state is ambiguous
   - Recommendation: Option B - skip triage if clear path exists

2. **How granular should the interview be?**
   - Too many questions = friction
   - Too few = wrong routing
   - Recommendation: 3-5 focused questions max

3. **What if user changes direction mid-workflow?**
   - Allow explicit `/0_business_scenario` re-run
   - Or detect "pivot" patterns in conversation

4. **Integration with existing Gofer UI?**
   - Could add a "New Business Scenario" button
   - Or auto-detect fresh workspace and prompt

---

## Implementation Plan

### Phase 1: Create the Command

1. Create `.claude/commands/0_business_scenario.md` with interview flow
2. Test manually by invoking `/0_business_scenario` in Claude Code

### Phase 2: Add State Detection

1. Add `determineInitialCommand()` to `autonomousCommands.ts`
2. Check for existing artifacts before sending initial command
3. Route to triage or appropriate framework command

### Phase 3: Add Workflow Chaining

1. Add new action types to `ClaudeCodeAutonomousResponder.ts`
2. Detect phase completion and invoke next command
3. Handle errors and clarification requests

### Phase 4: Document and Test

1. Update `CLAUDE.md` with triage workflow
2. Add integration tests for routing logic
3. Test end-to-end with fresh and existing projects
