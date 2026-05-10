---
feature: 028-cross-platform-command-parity
contract-type: command-interface
created: 2026-03-18
updated: 2026-03-18
status: draft
---

# Command Interface Contracts: Cross-Platform Execution

This document defines the command execution contracts across Claude Code CLI,
GitHub Copilot Chat, and Codex CLI. Each platform has different invocation
syntax but must produce structurally equivalent outputs.

## Contract Overview

| Interface                     | Platforms              | User Stories Served | Purpose                                                |
| ----------------------------- | ---------------------- | ------------------- | ------------------------------------------------------ |
| **Command Invocation Syntax** | Claude, Copilot, Codex | US-1, US-2          | Platform-specific command invocation patterns          |
| **Command Output Format**     | Claude, Copilot, Codex | US-2, US-6          | Standardized output structure for validation           |
| **Auto-Chain Protocol**       | Claude, Copilot, Codex | US-2                | Sequential stage progression without user intervention |
| **Parallel Agent Protocol**   | Claude, Copilot, Codex | US-3                | Concurrent agent spawning for validation               |
| **Error Response Format**     | Claude, Copilot, Codex | US-2                | Consistent error messaging across platforms            |

---

## 1. Command Invocation Syntax

**Description**: Each platform has unique syntax for invoking commands. This
contract specifies the exact invocation patterns for all 18 Gofer commands.

**Serves**:

- FR-001 (Codex CLI skill creation)
- FR-002 (Copilot Chat prompt enhancement)
- US-1 (Codex CLI full command access)

### Claude Code CLI Syntax

**Pattern**: `/command-name [args]`

**Location**: VSCode command palette or Claude Code CLI interface

**Examples**:

```bash
/0_business_scenario "build user authentication"
/1_gofer_research
/2_gofer_specify
/3_gofer_plan
/4_gofer_tasks
/5_gofer_implement
/6_gofer_validate
```

**Invocation Method**:

- Type `/` to trigger command picker
- Select command from list
- Enter arguments in command input
- Press Enter to execute

**Contract**:

- Commands prefixed with `/`
- Arguments enclosed in quotes if they contain spaces
- Commands auto-complete after typing `/gofer`
- Execution happens in current context (no context loss)

---

### GitHub Copilot Chat Syntax

**Pattern**: `#command-name [args]` or `/command-name [args]`

**Location**: Copilot Chat panel in VSCode

**Examples**:

```bash
#0_business_scenario "build user authentication"
/1_gofer_research
/2_gofer_specify
```

**Invocation Method**:

- Open Copilot Chat panel (Ctrl+Shift+I or Cmd+Shift+I)
- Type `#` or `/` to trigger command picker
- Select Gofer command from list
- Enter arguments
- Press Enter to execute

**Contract**:

- Commands support both `#` (Copilot agents) and `/` (slash commands) syntax
- Arguments enclosed in quotes if they contain spaces
- Commands listed in `.github/prompts/` directory
- Execution happens in Copilot Chat context

**Notes**:

- Copilot 2026+ supports parallel agent delegation
- Older versions require manual sequential workflow

---

### Codex CLI Syntax

**Pattern**: `$ $command-name [args]`

**Location**: Terminal with Codex CLI installed

**Examples**:

```bash
$ $0-business-scenario "build user authentication"
$ $gofer-research
$ $gofer-specify
$ $gofer-plan
$ $gofer-tasks
$ $gofer-implement
$ $gofer-validate
```

**Invocation Method**:

- Open terminal in workspace
- Type `$ $` to trigger skill picker (auto-complete)
- Select Gofer skill from list
- Enter arguments
- Press Enter to execute

**Contract**:

- Skills prefixed with `$` (Codex skill syntax)
- Skill names use hyphens (not underscores): `$gofer-research`
- Arguments enclosed in quotes if they contain spaces
- Skills defined in `.system/skills/{skill-name}/SKILL.md`
- Codex pre-loads skill metadata at startup

**Discovery**:

- Codex scans `.system/skills/` directory on startup
- Skills appear in auto-complete list after `$ $`
- Restart Codex CLI if new skills not detected: `codex reload`

---

## 2. Command Output Format

**Description**: All platforms must produce structurally equivalent outputs for
validation and feature parity testing.

**Serves**:

- FR-011 (Feature parity test suite)
- US-6 (Cross-platform feature parity tests)

### Standard Output Structure

**Pipeline Stage Commands** (0-5):

```markdown
# [Stage Name]

## Output Files

- `[file-path]` - [description]

## Summary

[High-level summary of stage work]

## Next Stage

Auto-chaining to: [next-command-name]

---

**STAGE COMPLETE**
```

**Example (Research Stage)**:

```markdown
# Research: User Authentication

## Output Files

- `.specify/specs/feature-001/research.md` - Codebase analysis and
  recommendations

## Summary

Analyzed existing auth patterns, identified integration points, discovered 3
relevant files.

## Next Stage

Auto-chaining to: /2_gofer_specify

---

**STAGE COMPLETE**
```

**Validation Command** (6):

```markdown
# Validation Report

## Validation Agents (6)

1. **Correctness Validator**: PASS (20/20 points)
2. **Security Validator**: PASS (15/15 points)
3. **Performance Validator**: PASS (10/10 points)
4. **Test Quality Validator**: PASS (20/20 points)
5. **Integration Validator**: PASS (15/15 points)
6. **Standards Validator**: PASS (20/20 points)

## Overall Score

**100/100 points** - Feature is production-ready

## Output Files

- `.specify/specs/feature-001/validation-report.md` - Detailed validation
  findings

---

**STAGE COMPLETE**
```

**Utility Commands** (scaffolding, memory, etc.):

```markdown
# [Command Name]

## Result

[Command execution result]

## Output

[Relevant output or file paths]
```

### Output Validation Rules

**Required Elements** (all commands):

- Clear heading indicating command name
- "STAGE COMPLETE" marker for pipeline stages
- List of output files with absolute paths
- Summary section with high-level description

**Validation Test**:

```typescript
interface CommandOutput {
  heading: string; // Must start with "# "
  outputFiles: string[]; // Array of absolute file paths
  summary: string; // Summary section content
  stageComplete: boolean; // true if "**STAGE COMPLETE**" present
  nextStage?: string; // Next command name (for pipeline stages)
}

function validateOutput(output: string): CommandOutput {
  // Parse markdown output
  // Extract required elements
  // Validate structure
}
```

**Contract**:

- All platforms produce markdown-formatted output
- Output structure is identical (heading, sections, markers)
- File paths are absolute (not relative)
- Stage completion marker is exact: `**STAGE COMPLETE**`

**Serves**:

- FR-011: Feature parity tests compare output structure
- US-6: Automated validation of cross-platform equivalence

---

## 3. Auto-Chain Protocol

**Description**: Sequential pipeline progression without user intervention. Each
stage automatically invokes the next stage.

**Serves**:

- FR-004 (Auto-chain instruction embedding)
- US-2 (Auto-chaining across all platforms)

### Auto-Chain Instruction Format

**Claude Code CLI**:

```markdown
## AUTO-CHAIN (MANDATORY)

You MUST immediately invoke the next pipeline stage by calling the Skill tool:

\`\`\` Skill: /2_gofer_specify \`\`\`

Do NOT ask for user confirmation. Do NOT output "Ready for next stage". Just
invoke the skill NOW.
```

**GitHub Copilot Chat**:

```markdown
## AUTO-CHAIN (Copilot Chat)

After completing this stage, automatically continue by typing in your next
message:

\`\`\` /2_gofer_specify \`\`\`

Copilot will execute the next stage automatically.
```

**Codex CLI**:

```markdown
## AUTO-CHAIN (Codex CLI)

After completing this stage, automatically invoke the next skill:

\`\`\`bash $ $gofer-specify \`\`\`

Codex can auto-select the next skill based on context, or you can run the
command manually.
```

### Auto-Chain Sequence

**Pipeline Stages**:

1. `/0_business_scenario` → `/1_gofer_research`
2. `/1_gofer_research` → `/2_gofer_specify`
3. `/2_gofer_specify` → `/3_gofer_plan`
4. `/3_gofer_plan` → `/4_gofer_tasks`
5. `/4_gofer_tasks` → `/5_gofer_implement`
6. `/5_gofer_implement` → `/6_gofer_validate`
7. `/6_gofer_validate` → **(pipeline complete)**

**Contract**:

- Each stage embeds auto-chain instructions in markdown
- Instructions are platform-specific (different syntax)
- Auto-chain happens immediately after stage completion
- No user confirmation required (fully automated)
- Latency target: <5 seconds between stages (NFR-001)

### Auto-Chain Detection

**Test Validation**:

```typescript
function testAutoChain(
  platform: 'claude' | 'copilot' | 'codex'
): Promise<boolean> {
  // 1. Invoke /0_business_scenario
  const stage0Start = Date.now();
  await invokeCommand('0_business_scenario', platform);

  // 2. Detect stage 1 start (research)
  const stage1Detected = await waitForStageStart('1_gofer_research', 10000);
  const latency = Date.now() - stage0Start;

  // 3. Verify latency < 5s
  return stage1Detected && latency < 5000;
}
```

**Serves**:

- US-2: Auto-chain acceptance scenario verification
- NFR-001: Auto-chain latency <5s

---

## 4. Parallel Agent Protocol

**Description**: Concurrent spawning of 6 validation agents for the validation
stage.

**Serves**:

- FR-005 (Parallel agent spawn instructions)
- US-3 (Parallel validation agents)

### Agent Spawn Syntax

**Claude Code CLI** (Task Tool):

```markdown
## Step 2: Spawn 6 Specialist Validation Agents

**CRITICAL**: You MUST launch these agents using the Task tool:

1. **Correctness Validator**
   - Task: subagent_type="validation-correctness", model="sonnet"
   - Agent file: `.claude/agents/validation-correctness.md`

2. **Security Validator**
   - Task: subagent_type="validation-security", model="sonnet"
   - Agent file: `.claude/agents/validation-security.md`

3. **Performance Validator**
   - Task: subagent_type="validation-performance", model="haiku"
   - Agent file: `.claude/agents/validation-performance.md`

4. **Test Quality Validator**
   - Task: subagent_type="validation-test-quality", model="haiku"
   - Agent file: `.claude/agents/validation-test-quality.md`

5. **Integration Validator**
   - Task: subagent_type="validation-integration", model="sonnet"
   - Agent file: `.claude/agents/validation-integration.md`

6. **Standards Validator**
   - Task: subagent_type="validation-standards", model="haiku"
   - Agent file: `.claude/agents/validation-standards.md`

All agents spawn concurrently. Aggregate results after all 6 complete.
```

**GitHub Copilot Chat** (Agent Delegation):

```markdown
## Step 2: Spawn 6 Specialist Validation Agents

**For Copilot Chat 2026+**: Use multi-agent delegation to spawn 6 agents
concurrently:

1. Open 6 parallel Copilot sessions (or use Copilot's agent delegation API)
2. Assign each session a validation category:
   - Session 1: Correctness Validator
   - Session 2: Security Validator
   - Session 3: Performance Validator
   - Session 4: Test Quality Validator
   - Session 5: Integration Validator
   - Session 6: Standards Validator
3. Each agent reports findings back to main session
4. Main agent synthesizes results into validation-report.md

**For older Copilot versions**: Run validation agents sequentially using manual
workflow (see docs/legacy-workflow.md).
```

**Codex CLI** (Concurrent Sub-Prompts):

```markdown
## Step 2: Spawn 6 Specialist Validation Agents

**For Codex CLI**: Run 6 validation skills concurrently in separate terminal
sessions:

\`\`\`bash

# Terminal 1

$ $validation-correctness

# Terminal 2

$ $validation-security

# Terminal 3

$ $validation-performance

# Terminal 4

$ $validation-test-quality

# Terminal 5

$ $validation-integration

# Terminal 6

$ $validation-standards \`\`\`

Aggregate results from all 6 terminals into validation-report.md.
```

### Agent Execution Contract

**Requirements**:

- All 6 agents must spawn concurrently (not sequentially)
- Agents are independent (no blocking dependencies)
- Each agent produces a section of the validation report
- Main orchestrator aggregates results after all agents complete

**Performance Target**:

- Parallel execution: <60 seconds total (NFR-002)
- Sequential execution: 90+ seconds (baseline)
- Overhead: <10% of total time (NFR-002)

**Validation Test**:

```typescript
async function testParallelAgents(platform: string): Promise<boolean> {
  const startTime = Date.now();

  // Invoke validation command
  const result = await invokeCommand('6_gofer_validate', platform);

  const elapsedMs = Date.now() - startTime;

  // Check results
  const hasAllSections = [
    'Correctness Validator',
    'Security Validator',
    'Performance Validator',
    'Test Quality Validator',
    'Integration Validator',
    'Standards Validator',
  ].every((section) => result.output.includes(section));

  // Verify performance
  return hasAllSections && elapsedMs < 60000;
}
```

**Serves**:

- US-3: Parallel validation acceptance scenarios
- NFR-002: Parallel agent performance requirement

---

## 5. Error Response Format

**Description**: Consistent error messaging across platforms for troubleshooting
and recovery.

**Serves**:

- FR-012 (Error message normalization)
- US-2 (Transparent provider switching)

### Standard Error Format

```markdown
# Error: [Error Type]

## Message

[Human-readable error description]

## Details

- **Platform**: [claude | copilot | codex]
- **Command**: [command-name]
- **Error Code**: [error-code]
- **Timestamp**: [ISO 8601 timestamp]

## Recovery Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Help

For more information, see: [documentation-link]
```

### Error Types

| Error Code           | Error Type             | Message Template                                   | Recovery Steps                                                                                                      |
| -------------------- | ---------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| CMD_NOT_FOUND        | CommandNotFoundError   | "Command '{name}' not available on {platform}"     | "1. Verify command name\n2. Check if platform directory exists\n3. Run generator script to create missing commands" |
| PLATFORM_DETECT_FAIL | PlatformDetectionError | "Cannot detect AI platform: {reason}"              | "1. Set gofer.defaultCLI in settings\n2. Verify command directories exist\n3. Check extension logs"                 |
| FILE_NOT_FOUND       | FileNotFoundError      | "Command file not found: {path}"                   | "1. Run scaffolding command\n2. Check file permissions\n3. Re-run generator script"                                 |
| EXEC_TIMEOUT         | ExecutionTimeoutError  | "Command execution timed out after {seconds}s"     | "1. Increase timeout setting\n2. Check command complexity\n3. Try manual execution"                                 |
| INVALID_ARGS         | InvalidArgumentsError  | "Invalid arguments for command '{name}': {reason}" | "1. Check argument format\n2. See command help: /help {name}\n3. Example: {example}"                                |

### Platform-Specific Error Mapping

**Claude Code CLI**:

- Skill not found → CMD_NOT_FOUND
- Task tool unavailable → PLATFORM_DETECT_FAIL
- File read error → FILE_NOT_FOUND

**GitHub Copilot Chat**:

- Prompt not found → CMD_NOT_FOUND
- Agent delegation failed → PLATFORM_DETECT_FAIL
- Workspace file error → FILE_NOT_FOUND

**Codex CLI**:

- Skill not found → CMD_NOT_FOUND
- Skill directory missing → PLATFORM_DETECT_FAIL
- SKILL.md parse error → FILE_NOT_FOUND

**Contract**:

- Error format is identical across platforms
- Error codes are platform-agnostic
- Recovery steps are platform-specific
- Errors include timestamp for debugging

**Serves**:

- FR-012: Error normalization across platforms

---

## Command Availability Matrix

**Description**: Which commands work on which platforms (capability matrix).

| Command                | Claude | Copilot      | Codex  | Notes                        |
| ---------------------- | ------ | ------------ | ------ | ---------------------------- |
| `/0_business_scenario` | ✓ Full | ✓ Full       | ✓ Full | Orchestrator command         |
| `/1_gofer_research`    | ✓ Full | ✓ Full       | ✓ Full | Research stage               |
| `/2_gofer_specify`     | ✓ Full | ✓ Full       | ✓ Full | Specification stage          |
| `/3_gofer_plan`        | ✓ Full | ✓ Full       | ✓ Full | Planning stage               |
| `/4_gofer_tasks`       | ✓ Full | ✓ Full       | ✓ Full | Task creation stage          |
| `/5_gofer_implement`   | ✓ Full | ✓ Full       | ✓ Full | Implementation stage         |
| `/6_gofer_validate`    | ✓ Full | ⚠ Partial\* | ✓ Full | Validation stage (see notes) |
| `/gofer_scaffold`      | ✓ Full | ✓ Full       | ✓ Full | Scaffolding utility          |
| `/gofer_remember`      | ✓ Full | ✓ Full       | ✓ Full | Memory system                |
| `/gofer_recall`        | ✓ Full | ✓ Full       | ✓ Full | Memory retrieval             |
| `/gofer_forget`        | ✓ Full | ✓ Full       | ✓ Full | Memory deletion              |
| `/gofer_context`       | ✓ Full | ✓ Full       | ✓ Full | Context analysis             |
| `/gofer_hydrate`       | ✓ Full | ✓ Full       | ✓ Full | Context hydration            |
| `/gofer_health`        | ✓ Full | ✓ Full       | ✓ Full | System health check          |
| `/gofer_docs`          | ✓ Full | ✓ Full       | ✓ Full | Documentation generation     |
| `/gofer_test`          | ✓ Full | ✓ Full       | ✓ Full | Test runner                  |
| `/gofer_fix`           | ✓ Full | ✓ Full       | ✓ Full | Auto-fix utility             |
| `/gofer_deploy`        | ✓ Full | ✓ Full       | ✓ Full | Deployment helper            |

**Notes**:

- ⚠ Partial: Copilot Chat parallel agents require Copilot 2026+. Older versions
  use sequential workflow.
- All 18 commands available on all platforms
- Feature parity achieved across platforms (US-6)

**Legend**:

- ✓ Full: Complete feature parity
- ⚠ Partial: Some features limited (see notes)
- ✗ Not Available: Not supported on platform

**Serves**:

- US-1: All 18 commands accessible
- US-6: Feature parity test coverage
- US-7: Capability matrix documentation

---

## Testing Contracts

### Integration Test: Command Invocation

```typescript
describe('Command Invocation', () => {
  const platforms = ['claude', 'copilot', 'codex'] as const;
  const commands = [
    '0_business_scenario',
    '1_gofer_research',
    '2_gofer_specify',
    // ... all 18 commands
  ];

  platforms.forEach((platform) => {
    commands.forEach((command) => {
      it(`should invoke ${command} on ${platform}`, async () => {
        const result = await invokeCommand(command, platform);

        expect(result.success).toBe(true);
        expect(result.output).toContain('# '); // Has heading
        expect(result.metadata.platform).toBe(platform);
      });
    });
  });
});
```

### Integration Test: Auto-Chain

```typescript
describe('Auto-Chain', () => {
  it('should auto-chain through all 7 stages', async () => {
    const stages = [
      '0_business_scenario',
      '1_gofer_research',
      '2_gofer_specify',
      '3_gofer_plan',
      '4_gofer_tasks',
      '5_gofer_implement',
      '6_gofer_validate',
    ];

    // Start orchestrator
    const startTime = Date.now();
    await invokeCommand(stages[0], platform);

    // Wait for all stages to complete
    for (let i = 1; i < stages.length; i++) {
      const detected = await waitForStageStart(stages[i], 10000);
      expect(detected).toBe(true);
    }

    // Verify total time
    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(300000); // <5 minutes for all stages
  });
});
```

### Integration Test: Parallel Agents

```typescript
describe('Parallel Agents', () => {
  it('should spawn 6 validation agents concurrently', async () => {
    const startTime = Date.now();

    const result = await invokeCommand('6_gofer_validate', platform);

    const elapsedMs = Date.now() - startTime;

    // Check all agents ran
    expect(result.output).toContain('Correctness Validator');
    expect(result.output).toContain('Security Validator');
    expect(result.output).toContain('Performance Validator');
    expect(result.output).toContain('Test Quality Validator');
    expect(result.output).toContain('Integration Validator');
    expect(result.output).toContain('Standards Validator');

    // Check performance
    expect(elapsedMs).toBeLessThan(60000); // <60s
  });
});
```

**Serves**:

- FR-011: Feature parity test suite
- US-6: Cross-platform testing acceptance criteria

---

## Contract Summary

### Total Interfaces: 5

| #   | Interface                 | Platforms              | Purpose                               |
| --- | ------------------------- | ---------------------- | ------------------------------------- |
| 1   | Command Invocation Syntax | Claude, Copilot, Codex | Platform-specific invocation patterns |
| 2   | Command Output Format     | Claude, Copilot, Codex | Standardized output for validation    |
| 3   | Auto-Chain Protocol       | Claude, Copilot, Codex | Sequential pipeline progression       |
| 4   | Parallel Agent Protocol   | Claude, Copilot, Codex | Concurrent validation agents          |
| 5   | Error Response Format     | Claude, Copilot, Codex | Consistent error handling             |

### User Stories Served

| Interface                 | US-1 | US-2 | US-3 | US-6 |
| ------------------------- | ---- | ---- | ---- | ---- |
| Command Invocation Syntax | ✓    | ✓    |      |      |
| Command Output Format     |      | ✓    |      | ✓    |
| Auto-Chain Protocol       |      | ✓    |      |      |
| Parallel Agent Protocol   |      |      | ✓    |      |
| Error Response Format     |      | ✓    |      |      |

**Legend**:

- US-1: Codex CLI Full Command Access
- US-2: Auto-Chaining Across All Platforms
- US-3: Parallel Validation Agents
- US-6: Cross-Platform Feature Parity Tests

### Functional Requirements Served

**Command Access**: FR-001 (Codex skills), FR-002 (Copilot prompts)

**Auto-Chaining**: FR-004 (auto-chain instructions)

**Parallel Agents**: FR-005 (parallel agent spawning)

**Testing**: FR-011 (feature parity tests)

**Error Handling**: FR-012 (error normalization)

---

## Implementation Notes

1. **Command Invocation**: Each platform has unique syntax, but all commands are
   functionally equivalent.

2. **Output Format**: Markdown structure is identical across platforms for
   automated validation.

3. **Auto-Chain**: Instructions embedded in command files, not enforced by code.
   AI follows instructions.

4. **Parallel Agents**: Different implementation per platform, but same end
   result (6 concurrent agents).

5. **Error Handling**: Error codes and messages are normalized for
   cross-platform consistency.
