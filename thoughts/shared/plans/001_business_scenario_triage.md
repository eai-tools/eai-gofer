# Business Scenario Triage Command Implementation Plan

## Overview

Implement a `0_business_scenario` command that acts as an intelligent triage
router, interviewing the user about their request and automatically driving
Claude Code through the appropriate workflow (SpecKit or RPI framework).

## Current State Analysis

### What Exists Now

1. **16 commands** in `.claude/commands/`:
   - SpecKit: `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`,
     `/speckit.implement`, `/speckit.analyze`, `/speckit.clarify`,
     `/speckit.checklist`, `/speckit.constitution`
   - RPI: `/1_research_codebase` through `/8_define_test_cases`

2. **Autonomous responder** (`ClaudeCodeAutonomousResponder.ts`):
   - Monitors terminal output for questions
   - Calls Claude Haiku to make decisions
   - Supports actions: `NO_INTERRUPT`, `CONTINUE_IMPLEMENT`,
     `ENGINEERING_REVIEW`, `PERFORMANCE_REVIEW`
   - Already has infrastructure for sending commands to PTY

3. **Claude Code launcher** (`autonomousCommands.ts`):
   - Spawns Claude Code via node-pty (lines 640-653)
   - **Hardcoded** to send `/speckit.implement` after prompt detected (lines
     760-761)
   - No state detection or dynamic routing

### Key Constraints

- Must follow existing command file structure (YAML frontmatter + markdown)
- Must integrate with autonomous responder's Haiku-based decision system
- Must support resuming work from existing state (SpecKit or RPI artifacts)
- Should minimize friction (3-5 questions max during interview)

## Desired End State

When Claude Code is launched:

1. **State detection** automatically determines the starting command based on
   existing artifacts
2. **If fresh state** (no artifacts), starts with `/0_business_scenario` which
   interviews the user
3. **Triage decision** routes to either SpecKit or RPI framework
4. **Workflow chaining** automatically invokes the next command when each phase
   completes
5. **Resume support** continues from last checkpoint in either framework

### Verification Criteria

- [ ] Fresh workspace → `/0_business_scenario` is invoked
- [ ] User selects "new feature" → SpecKit workflow begins
- [ ] User selects "modify existing" → RPI workflow begins
- [ ] Existing spec.md → `/speckit.plan` or `/speckit.implement` invoked
- [ ] Existing research files → `/2_create_plan` invoked
- [ ] Existing saved session → `/6_resume_work` invoked
- [ ] Each phase completion → next phase automatically triggered

## What We're NOT Doing

- **Not modifying VSCode UI** - no new buttons or tree items
- **Not adding new settings** - using existing configuration
- **Not changing existing commands** - only adding new routing layer
- **Not implementing cross-framework switching** - once routed, stay in that
  framework

## Implementation Approach

The implementation follows a **layered approach**:

1. **Command layer**: Create `0_business_scenario.md` for interactive triage
2. **State layer**: Add `determineInitialCommand()` for artifact detection
3. **Routing layer**: Add new ACTION types to autonomous responder
4. **Documentation layer**: Update CLAUDE.md with new workflow

---

## Phase 1: Create the Triage Command

### Overview

Create the `/0_business_scenario` command that interviews the user and outputs a
routing decision.

### Changes Required

#### 1. New Command File

**File**: `.claude/commands/0_business_scenario.md`

```markdown
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

## Step 2: Determine Scenario (if no clear state exists)

If existing artifacts don't clearly indicate the next step, ask the user:

**"What would you like to accomplish today?"**

Present these options using the AskUserQuestion tool:

| Option                  | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| **A. New Feature**      | Build something new from scratch with clear requirements |
| **B. Modify Existing**  | Change or extend existing functionality in the codebase  |
| **C. Fix a Bug**        | Diagnose and fix a specific issue                        |
| **D. Explore/Research** | Understand the codebase before making changes            |
| **E. Resume Work**      | Continue from where I left off                           |

## Step 3: Route to Framework

Based on user selection and detected state:

### Route A: New Feature → SpecKit Framework

If user selects "New Feature" or has existing spec artifacts:

1. **Has tasks.md** → Invoke `/speckit.implement`
2. **Has plan.md but no tasks.md** → Invoke `/speckit.tasks`
3. **Has spec.md but no plan.md** → Invoke `/speckit.plan`
4. **No spec.md** → Invoke `/speckit.specify`

Output:
```

ROUTING: SPECKIT COMMAND: /speckit.[specify|plan|tasks|implement] REASON:
[explanation]

```

### Route B/C: Modify Existing or Fix Bug → RPI Framework

If user selects "Modify Existing" or "Fix a Bug":

1. **Has saved session** → Invoke `/6_resume_work`
2. **Has RPI plan** → Invoke `/4_implement_plan`
3. **Has research but no plan** → Invoke `/2_create_plan`
4. **No research** → Invoke `/1_research_codebase`

Output:
```

ROUTING: RPI COMMAND: /1_research_codebase REASON: [explanation]

```

### Route D: Explore/Research → RPI Research

Always start with `/1_research_codebase`.

Output:
```

ROUTING: RPI COMMAND: /1_research_codebase REASON: User wants to explore the
codebase first

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

- Keep the interview SHORT - max 1-2 questions
- Trust the artifact detection - if state is clear, skip the interview
- Document the routing decision for debugging
- If user seems confused, default to research first (RPI)
```

### Success Criteria

#### Automated Verification

- [x] Command file exists at `.claude/commands/0_business_scenario.md`
- [x] YAML frontmatter is valid
- [x] Command follows existing command structure pattern

#### Manual Verification

- [ ] `/0_business_scenario` can be invoked in Claude Code
- [ ] User is asked about their scenario
- [ ] Routing decision is clearly outputted
- [ ] Target command is invoked after routing

---

## Phase 2: Add State Detection to Launcher

### Overview

Replace the hardcoded `/speckit.implement` in `autonomousCommands.ts` with
dynamic command selection based on artifact state.

### Changes Required

#### 1. Add State Detection Function

**File**: `extension/src/autonomousCommands.ts`

**Add new function** (before `launchClaudeCode` function, around line 580):

```typescript
import * as fs from 'fs';
import * as path from 'path';

/**
 * Determine the initial command to send based on workspace state
 */
async function determineInitialCommand(
  specId: string,
  workspacePath: string
): Promise<string> {
  // Check SpecKit artifacts
  const specDir = path.join(workspacePath, '.specify', 'specs', specId);
  const hasSpec = fs.existsSync(path.join(specDir, 'spec.md'));
  const hasPlan = fs.existsSync(path.join(specDir, 'plan.md'));
  const hasTasks = fs.existsSync(path.join(specDir, 'tasks.md'));

  // Check RPI artifacts
  const researchDir = path.join(
    workspacePath,
    'thoughts',
    'shared',
    'research'
  );
  const sessionsDir = path.join(
    workspacePath,
    'thoughts',
    'shared',
    'sessions'
  );
  const plansDir = path.join(workspacePath, 'thoughts', 'shared', 'plans');

  const hasResearch =
    fs.existsSync(researchDir) &&
    fs.readdirSync(researchDir).filter((f) => f.endsWith('.md')).length > 0;
  const hasSavedSession =
    fs.existsSync(sessionsDir) &&
    fs.readdirSync(sessionsDir).filter((f) => f.endsWith('.md')).length > 0;
  const hasRpiPlan =
    fs.existsSync(plansDir) &&
    fs.readdirSync(plansDir).filter((f) => f.endsWith('.md')).length > 0;

  // Decision tree

  // 1. SpecKit artifacts exist - continue SpecKit flow
  if (hasTasks) {
    return '/speckit.implement';
  }
  if (hasPlan) {
    return '/speckit.tasks';
  }
  if (hasSpec) {
    return '/speckit.plan';
  }

  // 2. RPI artifacts exist - continue RPI flow
  if (hasSavedSession) {
    return '/6_resume_work';
  }
  if (hasRpiPlan) {
    return '/4_implement_plan';
  }
  if (hasResearch) {
    return '/2_create_plan';
  }

  // 3. Fresh state - start with triage
  return '/0_business_scenario';
}
```

#### 2. Replace Hardcoded Command

**File**: `extension/src/autonomousCommands.ts`

**Modify lines 754-767** - Replace the hardcoded command:

```typescript
// BEFORE (lines 754-767):
if (!promptDetected && ptyRef && data.includes('>')) {
  promptDetected = true;
  outputChannel?.appendLine(
    '✓ Claude Code prompt detected, sending command...'
  );

  ptyRef.write('/speckit.implement');
  outputChannel?.appendLine('  → Typed command: /speckit.implement');
  // ...
}

// AFTER:
if (!promptDetected && ptyRef && data.includes('>')) {
  promptDetected = true;
  outputChannel?.appendLine(
    '✓ Claude Code prompt detected, determining command...'
  );

  // Dynamically determine command based on state
  const initialCommand = await determineInitialCommand(specId, workspacePath);

  ptyRef.write(initialCommand);
  outputChannel?.appendLine(`  → Typed command: ${initialCommand}`);

  setTimeout(() => {
    ptyRef.write('\r');
    outputChannel?.appendLine('  → Sent Enter key (\\r) after 500ms delay');
    outputChannel?.appendLine('\n✓ Command execution complete\n');
  }, 500);

  setTimeout(() => promptListener.dispose(), 1000);
}
```

**Note**: The callback needs to be made async. Wrap in an async IIFE if needed:

```typescript
const promptListener = ptyProcess.onData((data: string) => {
  if (!promptDetected && ptyRef && data.includes('>')) {
    promptDetected = true;

    // Wrap in async IIFE to use await
    (async () => {
      outputChannel?.appendLine(
        '✓ Claude Code prompt detected, determining command...'
      );

      const initialCommand = await determineInitialCommand(
        specId,
        workspacePath
      );

      ptyRef.write(initialCommand);
      outputChannel?.appendLine(`  → Typed command: ${initialCommand}`);

      setTimeout(() => {
        ptyRef.write('\r');
        outputChannel?.appendLine('  → Sent Enter key (\\r) after 500ms delay');
        outputChannel?.appendLine('\n✓ Command execution complete\n');
      }, 500);

      setTimeout(() => promptListener.dispose(), 1000);
    })();
  }
});
```

### Success Criteria

#### Automated Verification

- [x] TypeScript compiles without errors: `npm run compile`
- [x] Linting passes: `npm run lint`
- [ ] Unit tests pass (if added): `npm test`

#### Manual Verification

- [ ] Fresh workspace → sends `/0_business_scenario`
- [ ] Workspace with spec.md only → sends `/speckit.plan`
- [ ] Workspace with tasks.md → sends `/speckit.implement`
- [ ] Workspace with research → sends `/2_create_plan`
- [ ] Workspace with saved session → sends `/6_resume_work`

---

## Phase 3: Add Workflow Chaining Actions

### Overview

Extend the autonomous responder to recognize new ACTION types that chain to the
next workflow phase.

### Changes Required

#### 1. Add New Action Types

**File**: `extension/src/autonomous/ClaudeCodeAutonomousResponder.ts`

**Add after line 696** (after PERFORMANCE_REVIEW handling):

```typescript
// Workflow routing actions - SpecKit flow
if (trimmedAnswer.includes('ACTION: ROUTE_SPECKIT_SPECIFY')) {
  this.outputChannel.appendLine('   📝 Routing to SpecKit: specify phase\n');
  await this.writeLog('ROUTING: /speckit.specify');
  return '/speckit.specify\n';
}

if (trimmedAnswer.includes('ACTION: ROUTE_SPECKIT_PLAN')) {
  this.outputChannel.appendLine('   📋 Routing to SpecKit: plan phase\n');
  await this.writeLog('ROUTING: /speckit.plan');
  return '/speckit.plan\n';
}

if (trimmedAnswer.includes('ACTION: ROUTE_SPECKIT_TASKS')) {
  this.outputChannel.appendLine('   📊 Routing to SpecKit: tasks phase\n');
  await this.writeLog('ROUTING: /speckit.tasks');
  return '/speckit.tasks\n';
}

if (trimmedAnswer.includes('ACTION: ROUTE_SPECKIT_IMPLEMENT')) {
  this.outputChannel.appendLine('   🔨 Routing to SpecKit: implement phase\n');
  await this.writeLog('ROUTING: /speckit.implement');
  return '/speckit.implement\n';
}

// Workflow routing actions - RPI flow
if (trimmedAnswer.includes('ACTION: ROUTE_RPI_RESEARCH')) {
  this.outputChannel.appendLine('   🔍 Routing to RPI: research phase\n');
  await this.writeLog('ROUTING: /1_research_codebase');
  return '/1_research_codebase\n';
}

if (trimmedAnswer.includes('ACTION: ROUTE_RPI_PLAN')) {
  this.outputChannel.appendLine('   📋 Routing to RPI: create plan phase\n');
  await this.writeLog('ROUTING: /2_create_plan');
  return '/2_create_plan\n';
}

if (trimmedAnswer.includes('ACTION: ROUTE_RPI_IMPLEMENT')) {
  this.outputChannel.appendLine('   🔨 Routing to RPI: implement plan phase\n');
  await this.writeLog('ROUTING: /4_implement_plan');
  return '/4_implement_plan\n';
}

if (trimmedAnswer.includes('ACTION: ROUTE_RPI_RESUME')) {
  this.outputChannel.appendLine('   ▶️  Routing to RPI: resume work\n');
  await this.writeLog('ROUTING: /6_resume_work');
  return '/6_resume_work\n';
}
```

#### 2. Update System Prompt with New Response Types

**File**: `extension/src/autonomous/ClaudeCodeAutonomousResponder.ts`

**Find the `responseTypes` constant** (around line 370) and add:

```typescript
const responseTypes = `
1. **Direct answer** - If Claude is asking a question, answer it directly
   - For numbered choices: just the number (e.g., "1")
   - For yes/no: "Yes" or "No" with brief context
   - For text input: the actual answer

2. **ACTION: NO_INTERRUPT** - Claude is working correctly, don't interrupt

3. **ACTION: CONTINUE_IMPLEMENT** - Send /speckit.implement to continue work

4. **ACTION: ENGINEERING_REVIEW** - Request a code review against the spec

5. **ACTION: PERFORMANCE_REVIEW** - Request performance/architecture analysis

6. **Workflow routing actions** (for transitioning between phases):
   - ACTION: ROUTE_SPECKIT_SPECIFY - Start new SpecKit specification
   - ACTION: ROUTE_SPECKIT_PLAN - Move to SpecKit planning phase
   - ACTION: ROUTE_SPECKIT_TASKS - Move to SpecKit task generation
   - ACTION: ROUTE_SPECKIT_IMPLEMENT - Move to SpecKit implementation
   - ACTION: ROUTE_RPI_RESEARCH - Start RPI research phase
   - ACTION: ROUTE_RPI_PLAN - Move to RPI planning phase
   - ACTION: ROUTE_RPI_IMPLEMENT - Move to RPI implementation
   - ACTION: ROUTE_RPI_RESUME - Resume from saved RPI session
`;
```

### Success Criteria

#### Automated Verification

- [x] TypeScript compiles: `npm run compile`
- [x] Linting passes: `npm run lint`

#### Manual Verification

- [ ] When `/0_business_scenario` outputs `ROUTING: SPECKIT`, the next command
      is invoked
- [ ] When triage outputs `ROUTING: RPI`, the research command is invoked
- [ ] Workflow correctly chains from one phase to the next

---

## Phase 4: Update Documentation

### Overview

Update CLAUDE.md to document the new triage workflow and framework selection
logic.

### Changes Required

#### 1. Add Triage Section to CLAUDE.md

**File**: `CLAUDE.md`

**Add after line 88** (after the "When to Use Which" table):

````markdown
### Automatic Framework Routing

SpecGofer includes an intelligent triage system that automatically determines
the correct starting point based on:

1. **Existing Artifacts**: Detects spec.md, plan.md, tasks.md, research files,
   and saved sessions
2. **User Intent**: If no clear state exists, asks the user what they want to
   accomplish

#### Triage Command

The `/0_business_scenario` command runs automatically when:

- Claude Code is launched on a fresh workspace (no SpecKit or RPI artifacts)
- The user explicitly invokes it to re-route their workflow

#### Routing Logic

```text
                    ┌─────────────────────────┐
                    │   0_business_scenario   │
                    │   (triage interview)    │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │  SpecKit Flow │   │   RPI Flow    │   │  Resume Flow  │
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
````

| User Intent              | Routes To                                | Why                                       |
| ------------------------ | ---------------------------------------- | ----------------------------------------- |
| New feature from scratch | SpecKit (`/speckit.specify`)             | Full spec → plan → tasks → implement flow |
| Modify existing code     | RPI (`/1_research_codebase`)             | Research first, then plan changes         |
| Fix a bug                | RPI (`/1_research_codebase`)             | Need to understand before fixing          |
| Explore codebase         | RPI (`/1_research_codebase`)             | Pure research workflow                    |
| Resume previous work     | `/6_resume_work` or `/speckit.implement` | Based on saved state                      |

````

### Success Criteria

#### Automated Verification

- [x] Markdown linting passes: `npm run lint`

#### Manual Verification

- [x] Documentation clearly explains the triage workflow
- [x] Routing diagram is correct and readable
- [x] Examples cover common use cases

---

## Testing Strategy

### Unit Tests

**File**: `tests/unit/autonomousCommands.test.ts` (new file)

```typescript
describe('determineInitialCommand', () => {
  it('returns /0_business_scenario for fresh workspace', async () => {
    // Mock empty directories
    const result = await determineInitialCommand('test-spec', '/tmp/fresh');
    expect(result).toBe('/0_business_scenario');
  });

  it('returns /speckit.implement when tasks.md exists', async () => {
    // Mock tasks.md exists
    const result = await determineInitialCommand('test-spec', '/tmp/with-tasks');
    expect(result).toBe('/speckit.implement');
  });

  it('returns /speckit.plan when only spec.md exists', async () => {
    // Mock spec.md exists, no plan.md
    const result = await determineInitialCommand('test-spec', '/tmp/spec-only');
    expect(result).toBe('/speckit.plan');
  });

  it('returns /6_resume_work when saved session exists', async () => {
    // Mock sessions directory with files
    const result = await determineInitialCommand('test-spec', '/tmp/with-session');
    expect(result).toBe('/6_resume_work');
  });
});
````

### Integration Tests

1. Launch Claude Code on fresh workspace → verify `/0_business_scenario` sent
2. Complete triage interview → verify routing command sent
3. Complete SpecKit phase → verify next phase command sent

### Manual Testing Steps

1. Create a fresh workspace with no artifacts
2. Launch Claude Code via SpecGofer
3. Verify triage interview appears
4. Select "New Feature" → verify SpecKit workflow starts
5. Create a new workspace with existing spec.md
6. Launch Claude Code → verify `/speckit.plan` is sent (not triage)

---

## Performance Considerations

- **State detection** uses synchronous `fs.existsSync` which is fast for the
  small number of checks needed
- **Workflow chaining** adds negligible latency (just Haiku decision time)
- **No new API calls** - reuses existing Haiku integration

## Migration Notes

- **Backwards compatible** - existing workspaces with artifacts will continue to
  work
- **No data migration needed** - reads existing artifact locations
- **Graceful degradation** - if `/0_business_scenario` command doesn't exist
  (older installation), falls back to existing behavior
