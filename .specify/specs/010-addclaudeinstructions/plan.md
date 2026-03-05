---
feature: '010-addclaudeinstructions'
spec: spec.md
research: research.md
status: ready
created: '2026-03-06'
---

# Implementation Plan: Default AI Instruction Files for New Repositories

**Branch**: `010-addclaudeinstructions` | **Date**: 2026-03-06 | **Spec**:
spec.md

## Summary

When Gofer initializes a repository, auto-generate three AI instruction files
(AGENTS.md, CLAUDE.md, `.github/copilot-instructions.md`) by detecting the
project's technology stack and assembling composable template fragments. Files
are never overwritten if they already exist. A "Regenerate Instructions" VS Code
command allows re-generation after project changes.

## Technical Context

**Language/Version**: TypeScript 5.7.2, Node.js 20.x LTS **Primary
Dependencies**: VSCode Extension API, existing ResourceSyncer/ UpgradeService
infrastructure **Storage**: File-based (workspace root for AGENTS.md/CLAUDE.md,
`.github/` for copilot-instructions.md) **Testing**: Vitest **Target Platform**:
VSCode extension (cross-platform: Windows, macOS, Linux) **Performance Goals**:
Project detection < 2s, template assembly < 500ms, no impact on extension
activation **Constraints**: No API key required, no network access,
deterministic output

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      UpgradeService                          │
│  upgrade() → ... → setupDefaultInstructions()                │
│                                ↓                             │
│                     ResourceSyncer                           │
│           setupDefaultInstructions()                         │
│                    ↓              ↓                           │
│         ProjectDetector    InstructionGenerator               │
│         detectProject()    generateAgentsMd()                │
│              ↓             generateClaudeMd()                │
│       ProjectInfo          generateCopilotMd()               │
│     {lang, framework,           ↓                            │
│      testRunner, build,   Template Fragments                 │
│      linter, formatter}   extension/resources/               │
│                           instruction-templates/             │
│                                                              │
│  FileUtils.exists() → skip if file present                   │
│  FileUtils.writeTextFile() → create if missing               │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

| Component                | File                                                         | Integration Type                                     |
| ------------------------ | ------------------------------------------------------------ | ---------------------------------------------------- |
| IResourceOperations      | `extension/src/services/migration/UpgradeService.ts:19-104`  | Add `setupDefaultInstructions()` method to interface |
| UpgradeService.upgrade() | `UpgradeService.ts:207-209`                                  | Add call after `setupCopilotInstructions()`          |
| ResourceSyncer           | `extension/src/services/migration/ResourceSyncer.ts:264-272` | Add `setupDefaultInstructions()` implementation      |
| GoferMigrator            | `extension/src/goferMigrator.ts:409-468`                     | Add instruction sync to `syncMissingResources()`     |
| CommandRegistry          | `extension/src/services/CommandRegistry.ts`                  | Register `gofer.regenerateInstructions` command      |
| package.json             | `extension/package.json:39-139`                              | Add command contribution point                       |

### Key Dependencies

- `FileUtils` (`extension/src/utils/fileUtils.ts`) - exists(), writeTextFile(),
  ensureDirectory()
- `ResourceSyncer.copyBundledResources()` pattern - for understanding, but we
  won't use it directly since instruction files go to workspace root, not
  `.specify/`
- Template fragments in `extension/resources/instruction-templates/`

## Constitution Check

- [x] **I. Test-Driven Development**: Unit tests for ProjectDetector and
      InstructionGenerator; integration test for full flow
- [x] **IV. Strict TypeScript**: All new code in strict TypeScript with proper
      types
- [x] **VII. 80% Coverage**: Full coverage for ProjectDetector,
      InstructionGenerator, and integration paths
- [x] **VIII. Minimal Necessary Changes**: Only adds new files and minimal
      integration points to existing code

## Implementation Phases

### Phase 1: Project Detection Engine

**Goal**: Create `ProjectDetector` class that scans workspace for project
characteristics

**New Files**:

- `extension/src/services/ProjectDetector.ts`

**Tasks**:

- [ ] Create `ProjectInfo` interface with detected properties
- [ ] Implement `ProjectDetector.detect(workspacePath)` method
- [ ] Detect language from manifest files (package.json → Node.js/TS,
      pyproject.toml → Python, go.mod → Go, Cargo.toml → Rust, pom.xml/
      build.gradle → Java)
- [ ] Detect TypeScript from tsconfig.json presence
- [ ] Detect test runner from config files (vitest.config._, jest.config._,
      pytest markers in pyproject.toml)
- [ ] Detect linter/formatter from config files (.eslintrc*, eslint.config.*,
      .prettierrc\*)
- [ ] Detect build commands from package.json scripts (build, test, lint,
      format)
- [ ] Detect framework from dependencies (react, next, express, django, flask,
      gin, actix)
- [ ] Detect package manager (npm/yarn/pnpm from lock files, pip/poetry from
      Python markers)
- [ ] Return `ProjectInfo` with fallback defaults for undetected fields
- [ ] Write unit tests with mock filesystem structures for TypeScript, Python,
      Go, Rust, Java projects

**ProjectInfo Interface**:

```typescript
export interface ProjectInfo {
  name: string; // From package.json name or directory name
  language: string; // 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'java' | 'unknown'
  framework: string | null; // 'react' | 'next' | 'express' | 'django' | etc.
  testRunner: string | null; // 'vitest' | 'jest' | 'pytest' | 'go test' | etc.
  testCommand: string | null; // 'npm test' | 'pytest' | 'go test ./...' | etc.
  buildCommand: string | null; // 'npm run build' | 'cargo build' | etc.
  lintCommand: string | null; // 'npm run lint' | 'ruff check .' | etc.
  formatCommand: string | null; // 'npm run format' | 'ruff format .' | etc.
  packageManager: string | null; // 'npm' | 'yarn' | 'pnpm' | 'pip' | etc.
  hasTypeScript: boolean;
  hasEslint: boolean;
  hasPrettier: boolean;
}
```

**Verification**:

- [ ] Unit tests pass for all 6 language detection scenarios
- [ ] Unknown project returns sensible defaults
- [ ] Detection completes in < 2s (file stat operations only, no directory tree
      walk)

---

### Phase 2: Template Fragment System

**Goal**: Create composable template fragments for instruction file generation

**New Files**:

- `extension/resources/instruction-templates/base/agents-base.md`
- `extension/resources/instruction-templates/base/claude-base.md`
- `extension/resources/instruction-templates/base/copilot-base.md`
- `extension/resources/instruction-templates/languages/typescript.md`
- `extension/resources/instruction-templates/languages/python.md`
- `extension/resources/instruction-templates/languages/go.md`
- `extension/resources/instruction-templates/languages/rust.md`
- `extension/resources/instruction-templates/languages/java.md`
- `extension/resources/instruction-templates/languages/generic.md`
- `extension/resources/instruction-templates/gofer/gofer-claude.md`
- `extension/resources/instruction-templates/gofer/gofer-copilot.md`
- `extension/resources/instruction-templates/workflow/principles.md`

**Tasks**:

- [ ] Create base AGENTS.md template with placeholder sections: `{{commands}}`,
      `{{structure}}`, `{{codeStyle}}`, `{{testing}}`, `{{gitWorkflow}}`,
      `{{boundaries}}`, `{{principles}}`
- [ ] Create base CLAUDE.md template with `@AGENTS.md` import, Gofer pipeline
      section, workflow section (from example.md), context management section.
      Target: < 60 lines
- [ ] Create base copilot-instructions.md template with project overview,
      available commands, code quality condensed section
- [ ] Create language fragment for TypeScript (strict mode, ESM imports, type
      annotations, common patterns)
- [ ] Create language fragment for Python (type hints, docstrings, virtual envs,
      common patterns)
- [ ] Create language fragment for Go (error handling, naming, package
      structure)
- [ ] Create language fragment for Rust (ownership, error handling, cargo
      conventions)
- [ ] Create language fragment for Java (Maven/Gradle conventions, naming)
- [ ] Create generic language fragment (minimal, safe defaults)
- [ ] Create Gofer-specific fragment for CLAUDE.md (pipeline commands, available
      slash commands)
- [ ] Create Gofer-specific fragment for copilot-instructions.md (available
      prompts)
- [ ] Create workflow principles fragment based on example.md content (plan
      mode, subagent strategy, self-improvement, verification, elegance,
      autonomous bug fixing, task management, core principles)

**Content Mapping from example.md**:

The user's `example.md` defines these sections that map to generated files:

| example.md Section                                        | Target File | Implementation                                            |
| --------------------------------------------------------- | ----------- | --------------------------------------------------------- |
| Workflow Orchestration §1 (Plan Node Default)             | CLAUDE.md   | Brief: "Enter plan mode for non-trivial tasks (3+ steps)" |
| Workflow Orchestration §2 (Subagent Strategy)             | CLAUDE.md   | Brief: "Use subagents to keep main context clean"         |
| Workflow Orchestration §3 (Self-Improvement Loop)         | CLAUDE.md   | Brief: "After corrections, update tasks/lessons.md"       |
| Workflow Orchestration §4 (Verification Before Done)      | AGENTS.md   | "Never mark complete without proving it works"            |
| Workflow Orchestration §5 (Demand Elegance)               | CLAUDE.md   | Brief: "For non-trivial changes, pause for elegance"      |
| Workflow Orchestration §6 (Autonomous Bug Fixing)         | CLAUDE.md   | Brief: "When given a bug: fix it autonomously"            |
| Task Management                                           | CLAUDE.md   | Brief reference to task tracking approach                 |
| Core Principles (Simplicity, No Laziness, Minimal Impact) | AGENTS.md   | Full principles in Core Principles section                |

**Verification**:

- [ ] All template files are valid Markdown
- [ ] CLAUDE.md base + fragments assembles to < 60 lines
- [ ] AGENTS.md base + fragments assembles to 80-150 lines
- [ ] copilot-instructions.md assembles to 60-120 lines

---

### Phase 3: Instruction Generator

**Goal**: Create `InstructionGenerator` class that assembles templates with
project-specific data

**New Files**:

- `extension/src/services/InstructionGenerator.ts`

**Tasks**:

- [ ] Create `InstructionGenerator` class
- [ ] Implement `generateAgentsMd(projectInfo: ProjectInfo): string` method
- [ ] Implement `generateClaudeMd(projectInfo: ProjectInfo): string` method
- [ ] Implement `generateCopilotMd(projectInfo: ProjectInfo): string` method
- [ ] Load base templates from `extension/resources/instruction-templates/`
- [ ] Select language fragment based on `projectInfo.language`
- [ ] Substitute `{{placeholders}}` with detected values (project name,
      commands, etc.)
- [ ] Append Gofer-specific fragment to CLAUDE.md and copilot-instructions.md
- [ ] Append workflow principles to CLAUDE.md (from example.md style)
- [ ] Append core principles to AGENTS.md (simplicity, root cause, minimal
      impact, verification)
- [ ] Write unit tests verifying correct assembly for TypeScript, Python, and Go
      projects
- [ ] Write unit tests verifying line count constraints (CLAUDE.md < 60,
      AGENTS.md 80-150, copilot-instructions.md 60-120)
- [ ] Write unit test verifying content partitioning (no procedural workflows in
      instruction files)

**Template Loading Strategy**:

Templates are loaded at runtime from the extension's bundled resources using the
same `vscode.extensions.getExtension()` path resolution as
`ResourceSyncer.copyBundledResources()`. No webpack changes needed since
resources are accessed via the filesystem, not imported.

**Verification**:

- [ ] Generated files are valid Markdown
- [ ] Variable substitution works correctly
- [ ] Line count constraints met for all language types
- [ ] No tool-specific syntax in AGENTS.md (cross-tool compatible)

---

### Phase 4: Integration with UpgradeService Pipeline

**Goal**: Wire instruction generation into the existing upgrade flow

**Modified Files**:

- `extension/src/services/migration/UpgradeService.ts` (interface + upgrade()
  call)
- `extension/src/services/migration/ResourceSyncer.ts` (implementation)
- `extension/src/goferMigrator.ts` (facade + syncMissingResources)

**Tasks**:

- [ ] Add `setupDefaultInstructions(): Promise<void>` to `IResourceOperations`
      interface (UpgradeService.ts line ~53, after `setupCopilotInstructions`)
- [ ] Add `setupDefaultInstructions()` call in `UpgradeService.upgrade()` after
      `setupCopilotInstructions()` step (line ~209):
  ```typescript
  progress.report({ message: 'Setting up default AI instructions...' });
  this.logger.info('UpgradeService', 'Setting up default instructions');
  await resourceOps.setupDefaultInstructions();
  ```
- [ ] Add `setupDefaultInstructions()` call in
      `UpgradeService.updateGoferTemplates()` (line ~320, same pattern)
- [ ] Implement `setupDefaultInstructions()` in `ResourceSyncer`:
  1. Instantiate `ProjectDetector`, run `detect(this.workspacePath)`
  2. Instantiate `InstructionGenerator`
  3. For each file (AGENTS.md, CLAUDE.md, `.github/copilot-instructions.md`): a.
     Check `FileUtils.exists(targetPath)` — skip if exists b. Generate content
     via `InstructionGenerator.generateX(projectInfo)` c. Write via
     `FileUtils.writeTextFile(targetPath, content)`
  4. Log which files were created vs skipped
- [ ] Add public facade method in `GoferMigrator` (after line ~193):
  ```typescript
  public async setupDefaultInstructions(): Promise<void> {
    await this.resourceSyncer.setupDefaultInstructions();
  }
  ```
- [ ] Add instruction file check to `GoferMigrator.checkMissingResources()`
      critical paths (line ~371): check for AGENTS.md, CLAUDE.md at workspace
      root
- [ ] Add instruction sync to `GoferMigrator.syncMissingResources()` (line
      ~458): sync missing instruction files using same pattern as other
      resources
- [ ] Write integration test: fresh workspace → upgrade → verify all 3 files
      created
- [ ] Write integration test: workspace with existing CLAUDE.md → upgrade →
      verify CLAUDE.md untouched

**Verification**:

- [ ] Upgrade flow runs successfully with new step
- [ ] Existing file preservation works (no overwrites)
- [ ] syncMissingResources() detects and creates missing instruction files
- [ ] No regressions in existing upgrade steps

---

### Phase 5: Regenerate Instructions Command

**Goal**: Add VS Code command for re-generating instruction files

**Modified Files**:

- `extension/package.json` (command contribution)
- `extension/src/services/CommandRegistry.ts` (command registration)

**Tasks**:

- [ ] Add `gofer.regenerateInstructions` command to `extension/package.json`
      contributes.commands array:
  ```json
  {
    "command": "gofer.regenerateInstructions",
    "title": "Gofer: Regenerate AI Instructions",
    "icon": "$(file-code)"
  }
  ```
- [ ] Register command in `CommandRegistry.registerAll()` (not
      registerGlobalCommands, since this requires workspace context):
  1. Run `ProjectDetector.detect()` on current workspace
  2. For each instruction file, check if it exists
  3. If exists: prompt user with options (Overwrite / Skip / Backup & Replace)
  4. If "Backup & Replace": rename existing to `{filename}.backup`, generate new
  5. If "Overwrite": generate new, replacing existing
  6. If "Skip": leave untouched
  7. Show summary notification: "Created X files, skipped Y files"
- [ ] Write unit test for command registration
- [ ] Write integration test for regenerate flow with existing files

**Verification**:

- [ ] Command appears in Command Palette
- [ ] Prompt correctly shown for existing files
- [ ] Backup creates .backup file
- [ ] Summary notification displays correctly

---

### Phase 6: Testing and Validation

**Goal**: Comprehensive test coverage for all components

**New Files**:

- `tests/unit/services/ProjectDetector.test.ts`
- `tests/unit/services/InstructionGenerator.test.ts`
- `tests/unit/services/setupDefaultInstructions.test.ts`
- `tests/integration/instruction-generation.test.ts`

**Tasks**:

- [ ] Unit tests for ProjectDetector: 6 language detection scenarios + unknown
      project + edge cases (multiple languages, missing files)
- [ ] Unit tests for InstructionGenerator: verify template assembly for
      TypeScript, Python, Go projects
- [ ] Unit tests for InstructionGenerator: verify line count constraints
- [ ] Unit tests for InstructionGenerator: verify content partitioning (no
      procedural workflows in AGENTS.md/CLAUDE.md)
- [ ] Unit tests for setupDefaultInstructions: verify file creation and skip
      logic
- [ ] Integration test: full upgrade flow creates instruction files
- [ ] Integration test: existing files are preserved during upgrade
- [ ] Integration test: syncMissingResources detects and creates missing files
- [ ] Integration test: regenerate command with overwrite/skip/backup options
- [ ] Verify AGENTS.md contains no Claude-specific or Copilot-specific syntax
- [ ] Verify CLAUDE.md uses @AGENTS.md import correctly
- [ ] Verify all generated files use LF line endings

**Verification**:

- [ ] All tests pass
- [ ] Coverage > 80% for new code
- [ ] No regressions in existing tests

## File Structure

```text
extension/
├── src/
│   └── services/
│       ├── ProjectDetector.ts          # NEW: Project detection engine
│       ├── InstructionGenerator.ts     # NEW: Template assembly
│       ├── migration/
│       │   ├── UpgradeService.ts       # MODIFIED: Add interface method + call
│       │   └── ResourceSyncer.ts       # MODIFIED: Add setupDefaultInstructions()
│       └── CommandRegistry.ts          # MODIFIED: Register regenerate command
├── resources/
│   └── instruction-templates/          # NEW: Template fragments
│       ├── base/
│       │   ├── agents-base.md
│       │   ├── claude-base.md
│       │   └── copilot-base.md
│       ├── languages/
│       │   ├── typescript.md
│       │   ├── python.md
│       │   ├── go.md
│       │   ├── rust.md
│       │   ├── java.md
│       │   └── generic.md
│       ├── gofer/
│       │   ├── gofer-claude.md
│       │   └── gofer-copilot.md
│       └── workflow/
│           └── principles.md
├── package.json                        # MODIFIED: Add command contribution

extension/src/goferMigrator.ts          # MODIFIED: Facade + syncMissing

tests/
├── unit/services/
│   ├── ProjectDetector.test.ts         # NEW
│   ├── InstructionGenerator.test.ts    # NEW
│   └── setupDefaultInstructions.test.ts # NEW
└── integration/
    └── instruction-generation.test.ts  # NEW
```

## Risk Assessment

| Risk                                            | Impact                                   | Mitigation                                                   |
| ----------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| Generated CLAUDE.md exceeds 60 lines            | Medium - Claude may ignore content       | Line count validation in tests; strict template sizing       |
| Template fragments become stale as tools evolve | Low - affects quality not correctness    | Templates are separate files, easy to update independently   |
| Windows line ending issues                      | Medium - affects file readability        | Write all files with explicit LF endings                     |
| Existing AGENTS.md/CLAUDE.md overwritten        | High - user loses customizations         | FileUtils.exists() check before every write; never overwrite |
| ProjectDetector gives wrong language            | Low - generates wrong but valid template | Fallback to generic template; user can regenerate            |
| New UpgradeService step slows activation        | Medium - affects user experience         | Detection uses fs.stat only (fast), no directory traversal   |

## Spec Traceability

### User Story Coverage

| Story                           | Priority | Plan Phase(s) | Components                                                                          |
| ------------------------------- | -------- | ------------- | ----------------------------------------------------------------------------------- |
| US1: Initialize AI Instructions | P1       | Phase 2, 3, 4 | InstructionGenerator, ResourceSyncer.setupDefaultInstructions(), template fragments |
| US2: Project-Aware Templates    | P1       | Phase 1, 2, 3 | ProjectDetector, language fragments, InstructionGenerator                           |
| US3: Workflow Principles        | P1       | Phase 2, 3    | workflow/principles.md fragment, InstructionGenerator CLAUDE.md/AGENTS.md assembly  |
| US4: Regenerate Instructions    | P2       | Phase 5       | CommandRegistry, gofer.regenerateInstructions command                               |
| US5: Existing Installation Sync | P2       | Phase 4       | GoferMigrator.syncMissingResources()                                                |

### Acceptance Criteria Mapping

| Story | Criterion                                       | Plan Component                                                       | Approach                                                                             |
| ----- | ----------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| US1   | Three files at correct locations                | Phase 4: ResourceSyncer.setupDefaultInstructions()                   | Write AGENTS.md and CLAUDE.md to workspace root, copilot-instructions.md to .github/ |
| US1   | AGENTS.md has detected commands/structure/style | Phase 1+3: ProjectDetector → InstructionGenerator.generateAgentsMd() | Detect from package.json scripts, substitute into template                           |
| US1   | CLAUDE.md < 60 lines with @AGENTS.md            | Phase 2+3: claude-base.md template, line count test                  | Template designed for < 60 lines, validated by unit test                             |
| US1   | copilot-instructions.md has overview + commands | Phase 2+3: copilot-base.md + gofer-copilot.md                        | Template includes project overview and Gofer commands                                |
| US1   | No overwrite of existing files                  | Phase 4: FileUtils.exists() guard                                    | Check before each write, skip if exists                                              |
| US1   | No API key required                             | Phase 1+3: deterministic detection + template assembly               | All logic is file-based, no network calls                                            |
| US2   | Detect language from manifest files             | Phase 1: ProjectDetector.detect()                                    | Scan for package.json, pyproject.toml, go.mod, Cargo.toml, pom.xml                   |
| US2   | Test runner in commands section                 | Phase 1+3: ProjectDetector → InstructionGenerator                    | Detect vitest/jest/pytest config, substitute into AGENTS.md                          |
| US2   | Build commands in commands section              | Phase 1+3: ProjectDetector → InstructionGenerator                    | Read package.json scripts, substitute into AGENTS.md                                 |
| US2   | Lint/format tools referenced                    | Phase 1+3: ProjectDetector → InstructionGenerator                    | Detect .eslintrc/.prettierrc, include in code style section                          |
| US2   | Generic template for unknown projects           | Phase 1+2: generic.md fragment                                       | Fallback language fragment with safe defaults                                        |
| US3   | CLAUDE.md includes workflow guidance            | Phase 2: workflow/principles.md fragment                             | Map example.md sections to CLAUDE.md brief lines                                     |
| US3   | AGENTS.md includes core principles              | Phase 2: agents-base.md template                                     | Include simplicity, root cause, minimal impact, verification                         |
| US3   | Gofer commands in CLAUDE.md                     | Phase 2: gofer/gofer-claude.md fragment                              | List available pipeline commands                                                     |
| US3   | Copilot references Gofer prompts                | Phase 2: gofer/gofer-copilot.md fragment                             | List available prompts in copilot-instructions.md                                    |
| US4   | Regenerate command available                    | Phase 5: package.json + CommandRegistry                              | Register gofer.regenerateInstructions command                                        |
| US4   | Prompt for existing files                       | Phase 5: CommandRegistry regenerate handler                          | vscode.window.showQuickPick for overwrite/skip/backup                                |
| US4   | Re-detect project characteristics               | Phase 5: regenerate runs ProjectDetector.detect()                    | Fresh detection on current workspace state                                           |
| US5   | Missing files detected during sync              | Phase 4: GoferMigrator.checkMissingResources()                       | Add AGENTS.md/CLAUDE.md to critical paths check                                      |
| US5   | User prompted to generate                       | Phase 4: GoferMigrator.syncMissingResources()                        | Prompt before generating, respect decline                                            |
| US5   | Existing files never modified                   | Phase 4: FileUtils.exists() guard                                    | Same guard used everywhere                                                           |

### Requirement Coverage

| Requirement                          | Plan Component                                              | Phase      |
| ------------------------------------ | ----------------------------------------------------------- | ---------- |
| FR1: Three-tier content architecture | Template fragments (base/agents, base/claude, base/copilot) | Phase 2    |
| FR2: Project detection engine        | ProjectDetector class                                       | Phase 1    |
| FR3: Template assembly system        | InstructionGenerator class + template fragments             | Phase 2, 3 |
| FR4: Safe file creation              | FileUtils.exists() guard in setupDefaultInstructions()      | Phase 4    |
| FR5: Upgrade service integration     | IResourceOperations interface + UpgradeService.upgrade()    | Phase 4    |
| FR6: Regenerate instructions command | gofer.regenerateInstructions in CommandRegistry             | Phase 5    |
| FR7: Content partitioning            | Template design separating behavioral vs procedural content | Phase 2    |

Coverage: 5/5 user stories, 7/7 functional requirements
