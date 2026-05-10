# Cross-Platform Command Format Comparison

This document compares command file formats across Claude CLI, Codex CLI, and
GitHub Copilot Chat to inform the command generation strategy.

## Overview

| Aspect                 | Claude CLI           | Codex CLI                         | GitHub Copilot Chat                |
| ---------------------- | -------------------- | --------------------------------- | ---------------------------------- |
| **Directory**          | `.claude/commands/`  | `.system/skills/{skill-name}/`    | `.github/prompts/`                 |
| **File Extension**     | `.md`                | `SKILL.md`                        | `.prompt.md`                       |
| **Subdirectories**     | No (flat structure)  | Yes (one per skill)               | No (flat structure)                |
| **YAML Frontmatter**   | Yes                  | Yes                               | Yes                                |
| **Content Format**     | Markdown             | Markdown                          | Markdown                           |
| **Invocation Prefix**  | `/`                  | `$ $`                             | `#`                                |
| **Discovery Method**   | VSCode extension API | `codex skills list` CLI command   | GitHub Copilot extension API       |
| **Auto-chain Support** | Native (Skill tool)  | Manual (embedded instructions)    | Manual (user runs next command)    |
| **Parallel Agents**    | Native (Task tool)   | Simulated (embedded instructions) | Native in 2026 (delegation syntax) |

## YAML Frontmatter Differences

### Claude CLI Format

```yaml
---
# No required fields - convention-based
---
```

**Characteristics:**

- No required frontmatter fields
- Command name inferred from filename
- Description in markdown body
- Minimal metadata

**Example:**

```yaml
---
# Empty frontmatter is valid
---
# Command Title

Description and instructions...
```

### Codex CLI Format

```yaml
---
name: skill-name
description: Brief description of what this skill does
arguments:
  - name: arg1
    description: Description of argument
    required: true
  - name: arg2
    description: Optional argument
    required: false
result_schema:
  type: object
  properties:
    output:
      type: string
    status:
      type: string
---
```

**Characteristics:**

- `name` (required): Skill identifier
- `description` (required): One-line summary
- `arguments` (optional): List of input parameters
- `result_schema` (optional): JSON Schema for output

**Example:**

```yaml
---
name: 1_gofer_research
description: Deep codebase and technology research for feature implementation
arguments:
  - name: feature
    description: Feature name or description
    required: true
result_schema:
  type: object
  properties:
    output:
      type: string
      description: Path to generated research.md file
---
```

### GitHub Copilot Chat Format

```yaml
---
name: command-name
description: Brief description
agent: copilot-workspace
tools:
  - Read
  - Grep
  - Glob
argument-hint: 'feature-name'
---
```

**Characteristics:**

- `name` (required): Command identifier
- `description` (required): One-line summary
- `agent` (optional): Agent type to invoke
- `tools` (optional): Available tools (Read, Grep, Glob, Bash, etc.)
- `argument-hint` (optional): Placeholder for user input

**Example:**

```yaml
---
name: 1_gofer_research
description: Deep codebase and technology research
agent: copilot-workspace
tools:
  - Read
  - Grep
  - Glob
  - WebSearch
argument-hint: 'feature-name-or-description'
---
```

## Auto-Chain Syntax Variations

Auto-chaining allows commands to automatically invoke the next stage in the
pipeline.

### Claude CLI (Native)

**Syntax:**

```markdown
**AUTO-CHAIN (MANDATORY)**: You MUST immediately invoke the next pipeline stage
by calling the Skill tool with skill="/2_gofer_specify". Do NOT ask the user for
confirmation. Do NOT output "Ready for next stage". Just invoke the skill NOW.
```

**Mechanism:**

- Uses `Skill` tool invocation
- Direct function call to next command
- Context preserved automatically

**Example:**

```markdown
After research complete:

**STAGE COMPLETE**

**AUTO-CHAIN**: Immediately invoke Skill tool: skill="/2_gofer_specify"
```

### Codex CLI (Manual via Instructions)

**Syntax:**

```markdown
## Next Steps

After completing this research, the next pipeline stage is `/2_gofer_specify`.

**To continue the pipeline**:

1. Review the research findings in `research.md`
2. Run: `$ $ 2_gofer_specify <feature-name>`

The specification stage will use this research to generate `spec.md`.
```

**Mechanism:**

- Embedded instructions in markdown body
- User manually runs next command
- Context preservation via file artifacts

**Limitation:**

- Requires manual user action
- No automatic chaining
- Codex CLI (as of 2026) does not support Tool invocation for chaining

### GitHub Copilot Chat (Manual via Instructions)

**Syntax:**

```markdown
## Pipeline Continuation

This completes the research stage. To continue:

**Next Command:** `#2_gofer_specify feature-name`

The specification stage will read your research findings and generate a complete
feature specification with user stories and acceptance criteria.
```

**Mechanism:**

- User runs next command via `#` prefix
- Context preserved through conversation history
- 2026 Copilot supports multi-agent delegation for parallel work

**Note:**

- Copilot Chat in 2026 has native multi-agent support
- Can delegate parallel work: "spawn 6 validation agents"
- Task tool not available, but delegation syntax works similarly

## Parallel Agent Instructions

### Claude CLI (Native)

```markdown
Task: subagent_type="validation-correctness", model="sonnet" Prompt: "Verify
implementation matches spec..."
```

### Codex CLI (Simulated)

```markdown
**Multi-Perspective Analysis**

This validation requires 6 parallel perspectives. Since the Task tool is not
available in Codex CLI, please coordinate these analyses:

1. Open 6 separate Codex CLI sessions
2. In each session, run one of:
   - `$ $ validate-correctness <feature>`
   - `$ $ validate-standards <feature>`
   - `$ $ validate-security <feature>`
   - `$ $ validate-performance <feature>`
   - `$ $ validate-test-quality <feature>`
   - `$ $ validate-integration <feature>`
3. Synthesize results after all complete
```

### GitHub Copilot Chat (Native in 2026)

```markdown
**Multi-Agent Delegation**

This validation requires 6 parallel agents. Use Copilot's 2026 delegation
syntax:

@agent spawn 6 agents for validation:

- Agent 1: Correctness validation
- Agent 2: Standards validation
- Agent 3: Security validation
- Agent 4: Performance validation
- Agent 5: Test quality validation
- Agent 6: Integration validation

Each agent will work independently and report findings.
```

## File Structure Per Platform

### Claude CLI

```
.claude/
└── commands/
    ├── 0_business_scenario.md
    ├── 1_gofer_research.md
    ├── 2_gofer_specify.md
    └── ... (16 total commands)
```

**Characteristics:**

- Flat directory structure
- Direct `.md` files
- Command name = filename (without extension)

### Codex CLI

```
.system/
└── skills/
    ├── 0_business_scenario/
    │   └── SKILL.md
    ├── 1_gofer_research/
    │   └── SKILL.md
    ├── 2_gofer_specify/
    │   └── SKILL.md
    └── ... (16 total skills)
```

**Characteristics:**

- Nested directory structure
- Each skill in its own subdirectory
- File MUST be named `SKILL.md`
- Subdirectory name = skill identifier

### GitHub Copilot Chat

```
.github/
└── prompts/
    ├── 0_business_scenario.prompt.md
    ├── 1_gofer_research.prompt.md
    ├── 2_gofer_specify.prompt.md
    └── ... (16 total prompts)
```

**Characteristics:**

- Flat directory structure
- `.prompt.md` extension
- Prompt name = filename (without `.prompt.md`)

## Command Generation Strategy

Based on these format differences, the `scripts/generate-commands.ts` tool will:

1. **Read Reference**: Scan `.claude/commands/*.md` as source of truth
2. **Extract Metadata**: Parse YAML frontmatter and markdown body
3. **Transform for Codex**:
   - Create subdirectory: `.system/skills/{command-name}/`
   - Generate YAML with name, description, arguments, result_schema
   - Convert auto-chain instructions to manual next-steps
   - Add parallel agent simulation instructions
4. **Transform for Copilot**:
   - Create file: `.github/prompts/{command-name}.prompt.md`
   - Generate YAML with name, description, agent, tools
   - Convert auto-chain instructions to manual next-steps
   - Enhance with 2026 delegation syntax for parallel agents
5. **Write Files**: Generate all 16 commands for each platform

## MCP (Model Context Protocol) Handling

### Claude CLI

**MCP Support:** Full native support

```markdown
Use the MCP tool `gofer_get_specs` to list available specifications.
```

### Codex CLI

**MCP Support:** Not available

```markdown
Since MCP is not supported in Codex CLI, directly read specification files:

1. List specs: `ls -la .specify/specs/`
2. Read spec: `cat .specify/specs/{feature}/spec.md`
```

### GitHub Copilot Chat

**MCP Support:** Not available

````markdown
MCP tools are not available in Copilot Chat. Use file operations instead:

```bash
# List specifications
ls .specify/specs/

# Read specification
cat .specify/specs/{feature}/spec.md
```
````

````

## Conversation History Preservation

### Challenge

When users switch platforms mid-session, conversation context must be preserved.

### Solution

1. **Export Format**: JSONL with normalized schema
2. **Credential Redaction**: Strip API keys before export
3. **Platform Markers**: Tag messages with origin platform
4. **Import/Resume**: Load history when switching platforms

**Example Entry:**
```jsonl
{"id":"msg-001","platform":"claude","role":"user","content":"Run /1_gofer_research","timestamp":"2026-03-18T19:00:00Z"}
{"id":"msg-002","platform":"claude","role":"assistant","content":"Research complete","timestamp":"2026-03-18T19:05:00Z"}
{"id":"msg-003","platform":"codex","role":"user","content":"Switch to Codex, continue pipeline","timestamp":"2026-03-18T19:10:00Z"}
````

## Validation Testing

Feature parity tests must verify:

1. **Command availability**: All 16 commands callable on all platforms
2. **Auto-chain behavior**: Manual instructions work correctly
3. **Parallel agents**: Instructions appropriate for each platform
4. **History preservation**: Context survives platform switches
5. **Output format**: Consistent results regardless of platform

## References

- Claude CLI documentation: `.claude/commands/` (reference implementation)
- Codex CLI skill format: OpenAI Codex documentation
- Copilot Chat prompts: GitHub Copilot 2026 updates
- Feature specification:
  `.specify/specs/028-cross-platform-command-parity/spec.md`
