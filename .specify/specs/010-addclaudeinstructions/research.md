---
date: '2026-03-06T12:00:00Z'
researcher: Claude
feature: '010-addclaudeinstructions'
status: complete
---

# Research: Default AI Instruction Files for New Repositories

## Feature Summary

When Gofer initializes in a new repository, it should create default AGENTS.md,
CLAUDE.md, and `.github/copilot-instructions.md` files tailored to the project.
These files must work across Claude Code CLI, GitHub Copilot CLI, and Copilot
Chat in VSCode. A key design question is what content belongs in these
instruction files vs. the Gofer pipeline commands, and how to incorporate the
user's workflow orchestration principles.

## Market Research: AI Instruction File Standards (2025-2026)

### The Landscape

The AI coding assistant ecosystem has rapidly consolidated around three main
instruction file formats, with a fourth (AGENTS.md) emerging as a cross-tool
standard:

| File                                   | Tool                   | Adoption       | Standard Body                            |
| -------------------------------------- | ---------------------- | -------------- | ---------------------------------------- |
| `CLAUDE.md`                            | Claude Code            | Claude users   | Anthropic                                |
| `AGENTS.md`                            | Cross-tool (20+ tools) | 60,000+ repos  | Linux Foundation (Agentic AI Foundation) |
| `.github/copilot-instructions.md`      | GitHub Copilot         | GitHub users   | GitHub/Microsoft                         |
| `.cursorrules` / `.cursor/rules/*.mdc` | Cursor                 | Cursor users   | None                                     |
| `.windsurfrules`                       | Windsurf               | Windsurf users | None                                     |

### CLAUDE.md Best Practices

**Official Anthropic Guidance:**

- **< 60 lines recommended** for best results; Claude starts ignoring content
  above ~80 lines
- Keep it **short, human-readable**, and universally applicable
- If content isn't relevant to the current task, Claude will skip it
- Use the `@` import syntax to reference other files: `@.claude/rules/arch.md`
- Imports resolved recursively up to 5 levels deep, enabling progressive
  disclosure
- Run `/init` to auto-generate a tailored CLAUDE.md from codebase analysis

**Recommended Content:**

1. Project overview (one-liner orientation)
2. Common bash commands (build, test, deploy)
3. Code style guidelines (brief, imperative)
4. Key files and architecture
5. Testing instructions
6. Domain terminology
7. Patterns to follow AND avoid

**Critical Insight:** "Claude will ignore the contents of your CLAUDE.md if it
decides that it is not relevant to its current task. The more information you
have in the file that's not universally applicable, the more likely it is that
Claude will ignore your instructions."

### AGENTS.md Best Practices

**Industry Standard (August 2025+):**

AGENTS.md is now stewarded by the Agentic AI Foundation under the Linux
Foundation, supported by OpenAI Codex, Amp, Jules (Google), Cursor, Factory, and
GitHub Copilot.

**Tool Support Matrix:**

| Tool           | AGENTS.md      | Also reads CLAUDE.md |
| -------------- | -------------- | -------------------- |
| GitHub Copilot | Yes (Aug 2025) | Yes                  |
| Claude Code    | Yes            | Yes (preferred)      |
| Cursor         | Yes            | No                   |
| Windsurf       | Yes            | No                   |
| Aider          | Yes            | No                   |
| Gemini CLI     | Yes            | No                   |

**Six Core Content Areas** (from GitHub's analysis of 2,500+ repos):

1. **Commands** - Executable commands with flags/options (not just tool names)
2. **Testing** - How to run tests, patterns, coverage requirements
3. **Project structure** - Key directories, file organization
4. **Code style** - "One real code snippet showing your style beats three
   paragraphs describing it"
5. **Git workflow** - Branch naming, commit message format, PR guidelines
6. **Boundaries** - What the agent should NOT touch

**Best Practice:** Nested AGENTS.md files in subdirectories for context-specific
rules. Agents read the nearest file in the directory tree.

### GitHub Copilot Instructions

**Format:** Natural language instructions in Markdown with optional YAML
frontmatter for agent targeting.

**Key Features (2025-2026):**

- `excludeAgent` property for agent-specific instructions
- `#tool:<tool-name>` syntax for tool references
- Path-specific instructions via `.github/instructions/*.instructions.md`
- ~1,000 lines maximum recommended
- Also reads AGENTS.md and CLAUDE.md alongside its own instructions

**Best Practice:** "Start with 10-20 specific instructions. An 'imperfect'
instructions file will deliver far more impact than nothing at all."

### Cross-Tool Compatibility Strategy

**The Hybrid Approach (2026 Best Practice):**

```text
project/
  AGENTS.md                         # Cross-tool base (80% of content)
  CLAUDE.md                         # Claude-specific (imports + extensions)
  .github/
    copilot-instructions.md         # Copilot-specific extensions
    instructions/
      *.instructions.md             # Path-specific Copilot rules
```

**Content Strategy:**

- **AGENTS.md**: Universal instructions (commands, structure, style, testing)
- **CLAUDE.md**: Claude-specific features (import system, context optimization)
- **copilot-instructions.md**: Copilot-specific features (agent targeting, tool
  refs)

**Key Finding:** CLAUDE.md and copilot-instructions.md can import/reference
AGENTS.md, avoiding duplication while allowing tool-specific extensions.

## Codebase Analysis

### Where to Implement

| Component             | Location                                             | Purpose                               |
| --------------------- | ---------------------------------------------------- | ------------------------------------- |
| ResourceSyncer        | `extension/src/services/migration/ResourceSyncer.ts` | File copying from bundle to workspace |
| UpgradeService        | `extension/src/services/migration/UpgradeService.ts` | Orchestrates upgrade steps            |
| IResourceOperations   | `extension/src/services/UpgradeService.ts`           | Interface for resource operations     |
| Bundled templates     | `extension/resources/`                               | Source files copied to workspace      |
| InitializationService | `extension/src/services/InitializationService.ts`    | Workspace format detection/setup      |
| GoferMigrator         | `extension/src/goferMigrator.ts`                     | Facade for migration operations       |
| FileUtils             | `extension/src/utils/fileUtils.ts`                   | Safe file operations                  |

### Existing Patterns to Follow

#### Pattern 1: Resource Bundle → Workspace Copy

Found in: `ResourceSyncer.ts:61-120`

```typescript
private async copyBundledResources(
  resourceType: string,
  sourceSubdir: string,
  targetSubdir: string,
  filePatterns: string[],
  makeExecutable: boolean = false
): Promise<void> {
  const sourcePath = path.join(extensionPath, 'resources', sourceSubdir);
  const targetPath = path.join(this.specifyPath, targetSubdir);
  await fs.mkdir(targetPath, { recursive: true });
  // ... copy matching files
}
```

Why relevant: Same pattern needed for instruction files. Bundle templates in
`extension/resources/default-instructions/`, copy to workspace root during
initialization.

#### Pattern 2: Conditional File Creation

Found in: `fileUtils.ts:407-499`

```typescript
if (!(await FileUtils.exists(filePath))) {
  await FileUtils.writeTextFile(filePath, content);
}
```

Why relevant: Instruction files must NOT overwrite user customizations. Always
check existence first.

#### Pattern 3: Upgrade Service Step Registration

Found in: `UpgradeService.ts:175-248`

Each step in the upgrade follows the pattern:

```typescript
progress.report({ message: 'Setting up...' });
this.logger.info('UpgradeService', 'Setting up X');
await resourceOps.setupX();
```

Why relevant: New `setupDefaultInstructions()` method should be wired into this
sequence (after setupCopilotInstructions, before createBashScripts).

#### Pattern 4: Template String Generation

Found in: `CommandRegistry.ts:570-638`

```typescript
private generateSpecTemplate(specName: string, specTitle: string): string {
  return `---
id: "${specName}"
title: "${specTitle}"
created: "${new Date().toISOString().split('T')[0]}"
---`;
}
```

Why relevant: Instruction files need project-specific variables substituted
(project name, tech stack, test commands). Can use same template literal
pattern.

### Integration Points

1. **UpgradeService.upgrade()** (line 209): Add new step after
   `setupCopilotInstructions()` to create default instruction files
2. **IResourceOperations interface**: Add `setupDefaultInstructions()` method
3. **ResourceSyncer**: Implement `setupDefaultInstructions()` using
   `copyBundledResources()` pattern
4. **GoferMigrator.syncMissingResources()** (line 409): Add check for missing
   instruction files
5. **Extension resources**: New `extension/resources/default-instructions/`
   directory for templates

### Existing Instruction Files (This Repo)

**Current CLAUDE.md** (652 lines): Contains critical rules, command framework,
context management, project structure, technology docs, common tasks. Very long

- exemplifies the "too much content" anti-pattern for a generated default.

**Current AGENTS.md** (652 lines): Focused on linting/formatting rules,
TypeScript conventions, testing, commit messages. Good structure but very
Gofer-specific.

**Current `.github/copilot-instructions.md`** (493 lines): Full project
overview, architecture, workflows, conventions. Copilot-specific with prompts
and agent descriptions.

**Current `.github/instructions/*.instructions.md`** (3 files): Path-specific
TypeScript, VSCode extension, and language server guidelines.

### Related Code

- `ResourceSyncer.ts:229-247` - `setupClaudeCommands()` copies
  `.claude/commands/`
- `ResourceSyncer.ts:249-262` - `setupCopilotPrompts()` copies
  `.github/prompts/`
- `ResourceSyncer.ts:264-272` - `setupCopilotInstructions()` copies
  `.github/instructions/`
- `UpgradeService.ts:129-257` - Full upgrade sequence
- `InitializationService.ts:232` - `handleGoferFormat()` for existing installs
- `VersionDetector.ts:61` - Format detection logic

## Technology Decisions

### Decision 1: File Generation Strategy

- **Choice**: Template-based generation with variable substitution
- **Rationale**: AGENTS.md/CLAUDE.md content should adapt to the detected
  project (language, framework, test runner, build system). Static files won't
  work because every project is different.
- **Alternatives considered**:
  - Static bundled files (too generic, gets ignored)
  - AI-generated on-the-fly (slow, unpredictable, requires API key)
  - Symlink strategy (AGENTS.md → CLAUDE.md via symlink — fragile on Windows)

### Decision 2: Content Architecture

- **Choice**: Three-tier content strategy
  1. **AGENTS.md** = Cross-tool universal base (commands, structure, style,
     testing, boundaries)
  2. **CLAUDE.md** = Slim file with `@AGENTS.md` import + Claude-specific
     additions (Gofer pipeline commands, context management hints)
  3. **copilot-instructions.md** = Slim file referencing AGENTS.md content +
     Copilot-specific additions (prompt references, agent targeting)
- **Rationale**: Avoids content duplication. AGENTS.md is the single source of
  truth. Tool-specific files add extensions only. Matches 2026 industry best
  practice.
- **Alternatives considered**:
  - Three fully independent files (content drift, maintenance burden)
  - Single file only (misses tool-specific features)

### Decision 3: Content Partitioning (Instruction Files vs Pipeline Commands)

- **Choice**: Instruction files contain **persistent behavioral guidelines**;
  pipeline commands contain **procedural workflows**

| Content Type           | Goes In                      | Example                               |
| ---------------------- | ---------------------------- | ------------------------------------- |
| Code style rules       | AGENTS.md                    | "Use TypeScript strict mode"          |
| Build/test commands    | AGENTS.md                    | "npm test -- --coverage"              |
| Project structure      | AGENTS.md                    | "Extension code in extension/src/"    |
| Git conventions        | AGENTS.md                    | "Use conventional commits"            |
| Workflow orchestration | Pipeline commands            | Plan-first strategy                   |
| Subagent coordination  | Pipeline commands            | Parallel research agents              |
| Self-improvement loop  | CLAUDE.md (brief) + Pipeline | "Update lessons.md after corrections" |
| Verification protocol  | Pipeline commands            | Multi-step validation                 |
| Elegance demands       | CLAUDE.md (brief)            | "Pause for non-trivial changes"       |
| Task management        | Pipeline commands            | todo.md/lessons.md workflow           |
| Core principles        | AGENTS.md                    | "Simplicity first, minimal impact"    |

- **Rationale**: Instruction files are loaded into every conversation. They
  should be universally applicable behavioral rules. Procedural workflows
  (multi-step pipelines, subagent strategies) belong in commands because they're
  invoked on demand, not always active. Keeping instruction files short (<60
  lines for CLAUDE.md, <200 lines for AGENTS.md) prevents context window
  pollution.
- **Alternatives considered**:
  - Everything in instruction files (too long, gets ignored)
  - Everything in commands (loses persistent behavioral context)

### Decision 4: Template Detection and Customization

- **Choice**: Detect project characteristics during initialization and select
  appropriate template sections
- **Rationale**: A TypeScript project needs different instructions than a Python
  project. Detection of `package.json`, `tsconfig.json`, `pyproject.toml`, etc.
  allows smart template selection.
- **Detection targets**:
  - Language (TypeScript, Python, Go, Java, etc.)
  - Framework (React, Next.js, Express, Django, etc.)
  - Test runner (Vitest, Jest, pytest, etc.)
  - Build system (npm, yarn, pnpm, cargo, etc.)
  - Package manager
  - Existing linting/formatting config

### Decision 5: User Workflow Principles Mapping

The user provided specific workflow orchestration principles. Here's how they
map to instruction files vs pipeline commands:

| Principle                    | Where                                         | Implementation                                                                         |
| ---------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Plan-first**               | CLAUDE.md (brief mention) + Pipeline commands | CLAUDE.md: "Enter plan mode for non-trivial tasks." Pipeline: Full plan-first workflow |
| **Subagent strategy**        | Pipeline commands only                        | Too procedural for instruction files                                                   |
| **Self-improvement loop**    | CLAUDE.md (brief) + Pipeline                  | CLAUDE.md: "After corrections, update lessons.md." Pipeline: Full loop                 |
| **Verification before done** | AGENTS.md                                     | "Never mark complete without proving it works"                                         |
| **Demand elegance**          | CLAUDE.md (brief)                             | "For non-trivial changes, consider elegant solutions"                                  |
| **Autonomous bug fixing**    | CLAUDE.md (brief)                             | "When given a bug: fix it, don't ask for hand-holding"                                 |
| **Simplicity first**         | AGENTS.md                                     | "Make changes as simple as possible"                                                   |
| **No laziness**              | AGENTS.md                                     | "Find root causes, no temporary fixes"                                                 |
| **Minimal impact**           | AGENTS.md                                     | "Changes should only touch what's necessary"                                           |

## Constraints and Considerations

- **CLAUDE.md must stay under 60 lines** for optimal performance (Anthropic's
  recommendation). Use `@` imports to reference AGENTS.md for shared content.
- **AGENTS.md should be under 200 lines** to balance completeness with
  readability. Use nested files in subdirectories for language-specific rules.
- **copilot-instructions.md should stay under 1,000 lines** (GitHub
  recommendation), but shorter is better.
- **Windows compatibility**: Cannot use symlinks reliably. Each file must be
  independently readable.
- **No API key required**: Template generation must work without an AI API key,
  using deterministic template selection based on project detection.
- **Existing file preservation**: Never overwrite user-modified instruction
  files. Check existence first.
- **Gofer-specific vs generic**: The generated files should work for ANY
  project, not just Gofer itself. They need project-agnostic templates with
  Gofer-specific additions.

## Content Architecture Recommendation

### AGENTS.md (Universal Base - Target: 100-150 lines)

```text
# {Project Name}

## Commands
{Detected: build, test, lint, format commands}

## Project Structure
{Detected: key directories and their purposes}

## Code Style
{Detected: language-specific conventions}
{One code snippet showing preferred style}

## Testing
{Detected: test runner, coverage requirements}

## Git Workflow
- Use conventional commits: type(scope): subject
- Branch naming: feature/xxx, fix/xxx, chore/xxx

## Boundaries
- Do NOT modify: {detected config files, lock files}
- Do NOT commit: {detected secret file patterns}

## Core Principles
- Simplicity first: minimal code changes
- Find root causes, no temporary fixes
- Changes should only touch what's necessary
- Never mark a task complete without proving it works
```

### CLAUDE.md (Claude Extensions - Target: 40-50 lines)

```text
# {Project Name}

@AGENTS.md

## Gofer Pipeline
Available commands: /0_business_scenario through /6_gofer_validate
Run /0_business_scenario for end-to-end feature development.

## Workflow
- Enter plan mode for any non-trivial task (3+ steps)
- If something goes sideways, STOP and re-plan immediately
- After corrections from the user, update tasks/lessons.md
- For non-trivial changes, pause and ask "is there a more elegant way?"
- When given a bug report: just fix it autonomously

## Context Management
- Use subagents to keep main context window clean
- Save progress with /7_gofer_save when context fills up
```

### copilot-instructions.md (Copilot Extensions - Target: 80-100 lines)

```text
# {Project Name} - Copilot Instructions

## Project Overview
{Brief description from README or package.json}

## Available Gofer Commands
Type / in Copilot Chat for pipeline commands:
/0_business_scenario, /1_gofer_research, etc.

## Code Quality
{Same core principles as AGENTS.md, condensed}

## Architecture
{Key integration points and patterns}
```

## Open Questions

- [ ] Should the generated AGENTS.md include Gofer-specific pipeline commands,
      or keep it purely project-focused? (Recommendation: Keep AGENTS.md
      generic, put Gofer pipeline info in CLAUDE.md and copilot-instructions.md
      only)
- [ ] Should we offer an interactive wizard for customization, or generate and
      let users edit? (Recommendation: Auto-detect + generate, with a "Gofer:
      Regenerate Instructions" command for re-running)
- [ ] Should existing repos that already have CLAUDE.md/AGENTS.md get a merge
      prompt, or should we skip entirely? (Recommendation: Skip if file exists,
      offer "Gofer: Generate Missing Instructions" command)

## Recommendations

1. **Implement three-tier content architecture**: AGENTS.md (universal base),
   CLAUDE.md (slim + imports), copilot-instructions.md (slim + extensions)
2. **Add project detection**: Scan for package.json, tsconfig.json,
   pyproject.toml, go.mod, Cargo.toml to select appropriate template sections
3. **Wire into UpgradeService**: New `setupDefaultInstructions()` step after
   existing copilot setup (line 209 of UpgradeService.ts)
4. **Bundle templates in `extension/resources/default-instructions/`**: Multiple
   template fragments per language/framework, assembled during generation
5. **Never overwrite**: Check existence before creating each file
6. **Keep CLAUDE.md ultra-short** (<60 lines) with `@AGENTS.md` import for
   shared content
7. **Include user's workflow principles**: Map plan-first, self-improvement,
   verification, and elegance principles appropriately between instruction files
   and pipeline commands
8. **Add "Gofer: Regenerate Instructions" command**: For users who want to
   re-generate after project changes

## Brownfield Analysis

### Constraints and Limitations

| Constraint Type                 | Description                                | Impact on Implementation                       |
| ------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| Existing ResourceSyncer pattern | Must follow copyBundledResources() pattern | Template files must be in extension/resources/ |
| IResourceOperations interface   | Must add new method to interface           | Requires updating interface + all implementors |
| UpgradeService sequence         | Steps run in fixed order                   | New step must fit logically in sequence        |
| File overwrite safety           | Must not overwrite user edits              | Check existence before every write             |
| No API key dependency           | Must work offline                          | Cannot use AI to generate content dynamically  |

### Technical Debt to Avoid

| Pattern                         | Why Avoid                                 | Use Instead                     |
| ------------------------------- | ----------------------------------------- | ------------------------------- |
| Hardcoded content in TypeScript | Hard to maintain, bloats bundle           | Template files in resources/    |
| Single monolithic template      | Different projects need different content | Composable template fragments   |
| AI-generated instructions       | Requires API key, unpredictable           | Deterministic template assembly |

### Downstream Dependencies

- `GoferMigrator.syncMissingResources()` calls ResourceSyncer methods — must add
  instruction sync there too
- `InitializationService.handleGoferFormat()` may need to check for missing
  instruction files
- `VersionDetector` format detection is unaffected (it checks .specify/
  structure)

### Brownfield Checklist

- [x] Understand current ResourceSyncer behavior
- [x] Document what must NOT change (existing file overwrite protection)
- [x] Identify downstream dependencies (syncMissingResources, handleGoferFormat)
- [ ] Add characterization tests for existing sync behavior
- [ ] Plan rollback strategy (delete generated files if needed)
