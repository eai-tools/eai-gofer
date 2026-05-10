# EnterpriseAI Student Vertical Builder — Quickstart Guide

> **Feature ID**: 029-enterpriseai-student-vertical-builder  
> **Status**: Ready for Testing and Deployment  
> **Audience**: University and business students, Gofer operators, QA testers

---

## 1. Prerequisites

### 1.1 System Requirements

| Prerequisite            | Details                                                         | Verify                                           |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| **Node.js 18+**         | Runtime for Gofer extension and language server                 | `node --version` (expect v18+)                   |
| **VS Code 1.85+**       | Host environment for Gofer extension                            | Help > About                                     |
| **Gofer Extension**     | Latest version with EAI profile support installed               | Extensions marketplace or local `.vsix`          |
| **eai-cli binary**      | Installed and accessible in `$PATH` for EAI CLI version pinning | `eai-cli --version`                              |
| **EnterpriseAI tenant** | Active student or developer access to EAI platform              | EAI management console                           |
| **Git 2.30+**           | For version control and artifact commit operations              | `git --version`                                  |
| **npm 8+** (optional)   | For running test suite and building artifacts                   | `npm --version`                                  |
| **Marp CLI** (optional) | For rendering slide deck outputs to presentations               | `marp --version` (for students generating decks) |

### 1.2 Configuration Prerequisites

| Config                     | Value                                      | Purpose                                                     | Set in                     |
| -------------------------- | ------------------------------------------ | ----------------------------------------------------------- | -------------------------- |
| `gofer.workflowProfile`    | `enterpriseai`                             | Activates EAI-specific guidance, artifacts, and outputs     | VS Code settings.json      |
| `gofer.defaultCLI`         | `claude` \| `copilot` \| `codex` \| `auto` | Selects which AI assistant to route commands to             | VS Code settings.json      |
| `.specify/references/eai/` | Directory with vendored EAI reference docs | Fallback guidance when external EAI docs unavailable        | Project root (must exist)  |
| `eai-cli` major.minor      | Auto-detected from installed binary        | Pinned in generated plan/task artifacts for reproducibility | Auto-detected on first run |

### 1.3 Acceptance Criteria for Prerequisites

- [ ] `npm test` passes on current codebase (baseline regression check)
- [ ] `node -e "console.log(process.version)"` reports Node.js 18+
- [ ] `eai-cli --version` returns major.minor value
- [ ] `git status` returns clean or documented untracked files
- [ ] `.specify/references/eai/` directory exists with at least one guidance
      document
- [ ] Gofer extension activates without errors in VS Code Debug Console
- [ ] `gofer.workflowProfile` setting is available and set to `enterpriseai`

---

## 2. Setup Steps

### 2.1 Initial Setup (One-Time)

```bash
# 1. Clone or navigate to Gofer repo
cd /path/to/gofer

# 2. Install dependencies
npm install

# 3. Verify baseline tests pass
npm test

# 4. Install/reload Gofer extension
# Option A: From marketplace
code --install-extension enterpriseai.gofer

# Option B: From local VSIX (dev/testing)
code --install-extension ./gofer-1.27.1.vsix

# 5. Verify eai-cli is installed and accessible
which eai-cli && eai-cli --version
# Expected output: eai-cli version X.Y.Z
```

### 2.2 Configure VS Code Settings

```json
{
  "gofer.workflowProfile": "enterpriseai",
  "gofer.defaultCLI": "claude",
  "[yaml]": {
    "editor.formatOnSave": true
  }
}
```

### 2.3 Verify Local EAI Reference Docs

```bash
# Confirm reference directory structure
ls -la .specify/references/eai/

# Expected output:
# README.md                 (Fallback reference index)
# eai-cli.md                (EAI CLI command syntax and examples)
# vertical-template.md      (Vertical Template scaffolding guidance)
# deployment-repo.md        (Branch naming, environment targeting, manifest)

# If missing, create minimal stubs:
mkdir -p .specify/references/eai/
cat > .specify/references/eai/eai-cli.md << 'EOF'
# EAI CLI Reference

## Installation
\`\`\`bash
npm install -g eai-cli
\`\`\`

## Key Commands
- \`eai-cli scaffold <template>\` — Create vertical app scaffold
- \`eai-cli deploy --env <env>\` — Deploy to target environment
- \`eai-cli validate\` — Validate manifest and configuration

See official documentation for complete reference.
EOF
```

### 2.4 Acceptance Criteria for Setup

- [ ] `npm test` passes without errors after setup
- [ ] Gofer extension loads in VS Code without errors in Debug Console
- [ ] `gofer.workflowProfile` appears in settings.json with value `enterpriseai`
- [ ] `.specify/references/eai/` directory exists and contains at least one
      `.md` file
- [ ] `eai-cli --version` returns a valid major.minor value
- [ ] Command palette shows Gofer commands prefixed with `gofer.`

---

## 3. Manual Testing Scenarios

### Scenario 1: Activate EnterpriseAI Workflow Profile (Acceptance Criteria: US-001, US-002, FR-001)

**Objective**: Verify that `gofer.workflowProfile=enterpriseai` activates
profile-specific guidance.

**Steps**:

1. Open VS Code command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type `gofer.workflowProfile` and verify setting appears with dropdown:
   `standard` / `enterpriseai`
3. Select `enterpriseai`
4. Open a new folder or initialize `.specify/` with
   `Gofer: Initialize Repository`
5. Run `/0_business_scenario` in your AI assistant chat/CLI input
6. Observe command input prompts and guidance text

**Expected Result**:

- Prompts and guidance explicitly reference EnterpriseAI platform, vertical
  apps, and business-process delivery
- No mention of generic multi-platform or non-EAI deployment options as primary
  guidance
- Artifact templates include EAI-specific sections (EAI integration map,
  Vertical Template scaffolding, etc.)
- **Pass if**: All guidance and artifacts refer to EnterpriseAI as the
  primary/exclusive platform

---

### Scenario 2: Generate Discovery with EAI Profile (Acceptance Criteria: US-001, AC-1 through AC-5)

**Objective**: Verify discovery output is EAI-focused and includes required
sections.

**Steps**:

1. With `gofer.workflowProfile=enterpriseai` active, run `/0_business_scenario`
   in your AI assistant chat/CLI input
2. Complete the business scenario triage (select "EnterpriseAI student vertical
   app")
3. At the research stage, select "discovery" and provide a business scenario
   - Example: "Build a student assignment submission and grading system on
     EnterpriseAI"
4. Allow the assistant to generate `discovery.md`
5. Review the generated file at
   `.specify/specs/029-enterpriseai-student-vertical-builder/discovery.md`

**Expected Result**:

- `discovery.md` contains:
  - Problem statement explicitly framed around EAI vertical app delivery
  - Target user persona(s) described as student/business user building for EAI
  - Value proposition tied to EAI platform capabilities (e.g., integration,
    scalability, business process modeling)
  - No alternative non-EAI platform options listed as primary recommendations
- One-by-one architecture decision loop is presented before advancing to
  specification
- **Pass if**: 3/3 of (problem, persona, value prop) are explicitly EAI-focused
  with no non-EAI alternatives as primary options

---

### Scenario 3: Generate Plan with EAI CLI and Vertical Template References (Acceptance Criteria: US-002, AC-1 through AC-6)

**Objective**: Verify plan and task breakdown include EAI CLI commands and
Vertical Template scaffolding steps.

**Steps**:

1. From completed `discovery.md`, run `/3_gofer_plan` command
2. Allow the assistant to generate `plan.md` and `tasks.md`
3. Review both artifacts for EAI-specific content

**Expected Result**:

In `plan.md`:

- Explicit section: "EnterpriseAI Architecture & Integration Map" with diagram
  reference or ASCII diagram
- References to "`eai-cli scaffold`" or "`eai-cli deploy`" command syntax
- Mentions of "Vertical Template" structure and customization steps
- Deployment repository conventions (branch naming, environment targeting)
  sourced from `.specify/references/eai/deployment-repo.md`

In `tasks.md`:

- At least one task explicitly labeled "Scaffold vertical app with EAI CLI" with
  command syntax
- At least one task labeled "Configure Vertical Template" with specific steps
- All tasks reference the installed `eai-cli` major.minor version (e.g., "using
  eai-cli 2.1")
- Deployment-stage tasks reference `.specify/references/eai/deployment-repo.md`

- **Pass if**: Both artifacts contain EAI CLI tasks AND Vertical Template tasks
  AND version pinning is recorded

---

### Scenario 4: Verify No Regression on Standard Profile (Acceptance Criteria: US-007, AC-1 through AC-5)

**Objective**: Confirm that setting `gofer.workflowProfile=standard` preserves
existing behavior.

**Steps**:

1. Change `gofer.workflowProfile` to `standard` in VS Code settings
2. Create a fresh `.specify/` directory (or use existing non-EAI scenario)
3. Run `/0_business_scenario` on a non-EAI business scenario (e.g., generic web
   app)
4. Generate discovery and plan artifacts
5. Compare output structure and guidance to baseline from previous Gofer
   releases (or to Scenario 3 artifacts)

**Expected Result**:

- Guidance does NOT lead with EnterpriseAI
- Artifacts are generic and platform-agnostic (no EAI-specific sections
  enforced)
- All command outputs and routing behavior remain unchanged from pre-profile
  Gofer
- No errors or warnings about profile configuration
- **Pass if**: Artifact structure and guidance differ clearly from EAI profile
  (Scenario 3) with no quality regression

---

### Scenario 5: Marp Presentation Artifact Generation (Acceptance Criteria: US-003, AC-1 through AC-5)

**Objective**: Verify stakeholder comms stage generates a valid Marp slide deck.

**Steps**:

1. With `gofer.workflowProfile=enterpriseai` active, complete the full pipeline
   (discovery → spec → plan → implementation summary)
2. Run `/7a_stakeholder_comms` in your AI assistant chat/CLI input
3. Review generated `.md` file with Marp frontmatter (expected path:
   `.specify/specs/{feature}/presentation.marp.md`)
4. If Marp CLI is installed, render to HTML/PDF:
   ```bash
   marp .specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.md --output .specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.html
   ```
5. Open HTML in browser and verify slide deck renders correctly

**Expected Result**:

- Generated `.md` file contains Marp frontmatter:
  ```yaml
  ---
  marp: true
  theme: gaia
  _class: lead
  paginate: true
  ---
  ```
- Slide content includes:
  - Problem Statement (from discovery.md)
  - EnterpriseAI Solution Overview (from spec.md)
  - Architecture Diagram/Integration Map reference
  - Demo Script Summary (from comms artifact)
  - Measurable Success Criteria (from spec.md)
- Each section renders without Markdown syntax errors
- Slide deck is navigable and professional-looking when rendered in Marp
- **Pass if**: 5/5 required sections are present and deck renders without errors

---

### Scenario 6: Competitive Analysis Artifact (Acceptance Criteria: US-005, AC-1 through AC-4)

**Objective**: Verify research stage generates a competitive/market analysis
artifact.

**Steps**:

1. With `gofer.workflowProfile=enterpriseai` active, run `/1_gofer_research`
   command
2. When prompted about competitive analysis, **enable** it (may be opt-in flag
   or default)
3. Review generated
   `.specify/specs/029-enterpriseai-student-vertical-builder/market-analysis.md`
   artifact
4. Re-run `/1_gofer_research` with competitive-analysis depth **disabled** and
   confirm the same `market-analysis.md` path is still generated with baseline
   traceability content

**Expected Result**:

- Artifact contains:
  - **Comparison Table** with at least 3 alternatives (competitors, open-source
    tools, other student app builders)
  - Columns: Tool/Platform | Key Features | EnterpriseAI Advantage | Student Fit
  - **Market Position Statement**: "Why EnterpriseAI is the chosen direction for
    this vertical app"
  - **Differentiation Summary**: How the student's vertical app is unique on EAI
- Artifact is referenced in both spec.md and plan.md
- **Pass if**: enabled mode shows comparison table + market positioning + 3+
  alternatives, and disabled mode still emits baseline `market-analysis.md`
  traceability output

---

### Scenario 7: Graceful Fallback When External EAI Docs Unavailable (Acceptance Criteria: FR-010, NFR-006)

**Objective**: Verify pipeline completes using local references when external
docs are unavailable.

**Steps**:

1. Simulate inaccessible external EAI references:
   ```bash
   # Temporarily disable network access or mock 404 responses
   # (For testing: edit extension or mock HTTP layer)
   ```
2. Run `/1_gofer_research` and `/3_gofer_plan` with
   `gofer.workflowProfile=enterpriseai`
3. Observe command output and generated artifacts
4. Check VS Code output panel for fallback notices

**Expected Result**:

- Pipeline completes without failure
- Generated artifacts contain guidance sourced from `.specify/references/eai/`
  (local references)
- User-visible notice displayed: "EAI CLI reference unavailable; using local
  docs. For updates, see .specify/references/eai/"
- Artifacts remain functional and actionable despite external doc unavailability
- **Pass if**: Pipeline completes AND local references are used AND user notice
  is displayed

---

### Scenario 8: No Regression on Provider Routing (Acceptance Criteria: US-007, FR-008, NFR-005)

**Objective**: Confirm all provider/routing code paths remain intact and
functional.

**Steps**:

1. Open VS Code settings and set `gofer.defaultCLI` to each value: `claude`,
   `copilot`, `codex`, then `auto`
2. For autonomous mode, also set `gofer.cliProvider` to `claude`, `codex`, and
   `auto`
3. Run provider regression tests:
   ```bash
   npm test -- tests/unit/council/providers/ProviderFactory.test.ts
   npm test -- tests/integration/enterpriseai/non-eai-output-regression.integration.test.ts
   ```
4. Restore defaults: `gofer.defaultCLI=auto`, `gofer.cliProvider=auto`

**Expected Result**:

- All configured providers remain selectable and valid
- Routing behavior does not change based on EAI profile setting
- No providers are disabled, removed, or hidden
- Provider selection remains autonomous per `gofer.cliProvider` and
  `gofer.defaultCLI` settings
- **Pass if**: All 4+ providers remain available and routable without change
  from pre-profile behavior

---

### Scenario 9: Version Pinning in Plan/Task Artifacts (Acceptance Criteria: FR-002, SC-006)

**Objective**: Verify eai-cli major.minor version is recorded in generated
artifacts.

**Steps**:

1. Check installed eai-cli version:
   ```bash
   eai-cli --version
   # Output: eai-cli 2.1.5
   # Expected major.minor: 2.1
   ```
2. Complete the full pipeline with `gofer.workflowProfile=enterpriseai`
3. Review `plan.md` and `tasks.md` artifacts
4. Search for version string (e.g., "eai-cli 2.1" or "using version X.Y")

**Expected Result**:

- Both `plan.md` and `tasks.md` contain the installed eai-cli version
  (major.minor only)
- Version appears in context (e.g., "using eai-cli 2.1, run:
  `eai-cli scaffold --template vertical`")
- Version is recorded consistently across both artifacts
- Version matches the system-installed version (no mismatch or stale values)
- **Pass if**: Version pinning is recorded in both artifacts and matches
  installed binary

---

### Scenario 10: Artifact Parity Across Platform Mirrors (Acceptance Criteria: US-006, FR-006, NFR-002)

**Objective**: Verify EAI profile content is identical across all platform
mirrors (Claude, Copilot, Codex, Gemini).

**Steps**:

1. After updating canonical command sources (`.claude/commands/*.md`) with EAI
   content:
   ```bash
   npm run generate-commands  # Regenerates all mirrors
   # Runtime resource sync is handled by extension activation (ResourceSyncer)
   ```
2. Compare generated artifacts across platform mirrors:
   ```bash
   diff .github/prompts/0_business_scenario.prompt.md \
        .agents/skills/0_business_scenario/SKILL.md
   # Should show no diffs for EAI-profile sections
   ```
3. Run parity validation tests:
   ```bash
   npm run test -- tests/integration/cross-platform-parity.test.ts
   ```

**Expected Result**:

- No diffs between canonical sources and platform mirrors for EAI-profile
  content
- Parity test suite passes with 0 failures
- All mirrors (Claude, Copilot, Codex, Gemini) contain identical EAI guidance
- **Pass if**: Diffs show no content differences AND parity tests pass 100%

---

## 4. Automated Test Commands

### 4.1 Run Full Test Suite

```bash
# All tests (unit + integration + e2e)
npm test

# Expected output:
# PASS  tests/unit/...
# PASS  tests/integration/...
# PASS  tests/e2e/...
# Test Files  4 passed (4)
```

### 4.2 Run EAI Profile-Specific Tests

```bash
# Integration tests for profile activation and artifact generation
npm test -- tests/integration/workflow-profile-enterpriseai.test.ts
npm test -- tests/integration/enterpriseai/discovery-enterpriseai-focus.integration.test.ts
npm test -- tests/integration/enterpriseai/plan-task-generation.integration.test.ts

# Integration tests for pipeline execution with EAI profile
npm test -- tests/integration/enterpriseai/non-eai-output-regression.integration.test.ts
npm test -- tests/integration/enterpriseai/canonical-mirror-parity.integration.test.ts
```

### 4.3 Run Regression Tests (Ensure No Capability Loss)

```bash
# Confirm all existing command paths still work
npm test -- tests/integration/command-generation.test.ts

# Confirm all providers and routing still functional
npm test -- tests/integration/cross-platform-parity.test.ts

# Expected result: all tests pass with 0 regressions
```

### 4.4 Run Artifact Parity Validation

```bash
# Regenerate all command mirrors from canonical sources
npm run generate-commands

# Validate no drift between canonical and mirrors
npm test -- tests/integration/command-generation.test.ts

# Expected result:
# ✓ Canonical command source matches all platform mirrors
# ✓ EAI profile content is identical across mirrors
```

### 4.5 Validate Generated Artifacts (Manual)

```bash
# After completing a full pipeline run, validate artifacts
npm run test -- tests/integration/enterpriseai/internal-api-contract-coverage.integration.test.ts
npm run test -- tests/integration/enterpriseai/marp-content-completeness.integration.test.ts

# Expected output:
# ✓ Internal API contract coverage passes (IAP/EVT checks)
# ✓ Marp content completeness checks pass
```

### 4.6 Test Coverage

```bash
# Run tests with coverage report
npm test -- --coverage

# Expected target:
# - Overall coverage: ≥80%
# - Critical paths (profile, artifact generation): ≥100%
# - Provider routing: ≥95% (no regressions)
```

### 4.7 Build and Package

```bash
# Build extension
cd extension && npm run compile

# Build language server
cd ../language-server && npm run build

# Package VSIX for testing
npm run package

# Verify no build errors and output .vsix file present
ls -la gofer-*.vsix
```

---

## 5. Key Files Table

| File                                                                           | Purpose                                                                                              | Access                                               | Notes                                                                      |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `.claude/commands/0_business_scenario.md`                                      | Canonical source for business triage and scenario selection; includes EAI profile branch logic       | Read-only during testing; canonical source for edits | Regenerates all platform mirrors                                           |
| `.claude/commands/1_gofer_research.md`                                         | Canonical research stage; includes competitive analysis and market analysis guidance for EAI profile | Read-only during testing                             | Must include EAI-first research direction                                  |
| `.claude/commands/2_gofer_specify.md`                                          | Canonical specification stage; includes EAI architecture and integration map prompts                 | Read-only during testing                             | EAI-specific sections must be present                                      |
| `.claude/commands/3_gofer_plan.md`                                             | Canonical planning stage; includes EAI CLI and Vertical Template scaffolding guidance                | Read-only during testing                             | EAI CLI version contract integrated here                                   |
| `.claude/commands/4_gofer_tasks.md`                                            | Canonical task generation; includes EAI CLI deployment tasks and Vertical Template sequencing        | Read-only during testing                             | Must reference `.specify/references/eai/`                                  |
| `.claude/commands/7a_stakeholder_comms.md`                                     | Canonical comms stage; includes Marp presentation artifact generation logic                          | Read-only during testing                             | Marp output is additive (release notes preserved)                          |
| `.specify/specs/029-enterpriseai-student-vertical-builder/spec.md`             | Full feature specification; source of truth for acceptance criteria and requirements                 | Reference                                            | Defines locked decisions and success criteria                              |
| `.specify/specs/029-enterpriseai-student-vertical-builder/research.md`         | Research findings; documents analysis, patterns, integration points, and constraints                 | Reference                                            | Informs all implementation decisions                                       |
| `.specify/references/eai/README.md`                                            | Local fallback reference index for EnterpriseAI docs                                                 | Reference                                            | Must enumerate the fallback file set used by the pipeline                  |
| `.specify/references/eai/eai-cli.md`                                           | Local vendored reference for EAI CLI commands; fallback when external docs unavailable               | Reference                                            | Must be kept in sync with EAI CLI documentation                            |
| `.specify/references/eai/vertical-template.md`                                 | Local vendored reference for Vertical Template scaffolding; fallback guidance                        | Reference                                            | Provides deterministic template guidance                                   |
| `.specify/references/eai/deployment-repo.md`                                   | Local vendored reference for deployment conventions (branch naming, environment targeting)           | Reference                                            | Must document EAI deployment patterns                                      |
| `extension/src/lspClient.ts`                                                   | LSP client configuration; must route profile settings to language server                             | Review only                                          | No changes expected for this feature                                       |
| `extension/src/council/CrossPlatformCommandRouter.ts`                          | Command routing logic; must respect profile setting but not remove any provider paths                | Review only                                          | Verify all routing paths remain intact                                     |
| `extension/src/council/providers/ProviderFactory.ts`                           | Provider detection, creation, and compatibility path preservation                                    | Review only                                          | Verify provider auto-detection and compatibility behavior remain unchanged |
| `extension/src/council/providers/ProviderFactoryCliResolver.ts`                | CLI preference and auto-detection resolver extracted from ProviderFactory                            | Review only                                          | Verify split logic preserves existing provider selection behavior          |
| `extension/resources/claude-commands/`                                         | Runtime resources directory; mirrors `.claude/commands/` on extension activation                     | Generated                                            | Synced by `ResourceSyncer` during runtime migration/activation             |
| `.github/prompts/`                                                             | Copilot platform mirrors of canonical commands                                                       | Generated                                            | Auto-generated by `npm run generate-commands`                              |
| `.system/skills/`                                                              | Codex platform mirrors                                                                               | Generated                                            | Auto-generated by generator                                                |
| `.agents/skills/`                                                              | Gemini platform mirrors                                                                              | Generated                                            | Auto-generated by generator                                                |
| `tests/integration/cross-platform-parity.test.ts`                              | Parity validation test suite                                                                         | Review                                               | Must pass 100% after any EAI profile update                                |
| `tests/integration/enterpriseai/non-eai-output-regression.integration.test.ts` | Non-EAI output baseline regression suite                                                             | Review                                               | Confirms unchanged standard-profile behavior                               |
| `tests/integration/enterpriseai/canonical-mirror-parity.integration.test.ts`   | EnterpriseAI canonical mirror parity checks                                                          | Review                                               | Confirms generated mirror parity with canonical sources                    |

---

## 6. Common Issues and Resolutions

### Issue 1: `gofer.workflowProfile` Setting Not Visible in VS Code

**Symptom**: Setting does not appear in VS Code settings UI or JSON config.

**Cause**: Extension not activated or settings not properly registered in
`package.json`.

**Resolution**:

```bash
# 1. Reload VS Code window
Cmd+Shift+P (or Ctrl+Shift+P) > "Developer: Reload Window"

# 2. Verify package.json includes setting contribution
grep -A5 '"gofer.workflowProfile"' extension/package.json

# 3. If not present, add to package.json:
{
  "contributes": {
    "configuration": {
      "properties": {
        "gofer.workflowProfile": {
          "type": "string",
          "enum": ["standard", "enterpriseai"],
          "default": "standard",
          "description": "Gofer workflow profile: standard or enterpriseai"
        }
      }
    }
  }
}

# 4. Rebuild and reload
cd extension && npm run compile && code --reload-extensions
```

---

### Issue 2: `eai-cli --version` Returns Error or Not Found

**Symptom**: Command returns "command not found" or error when trying to pin
version.

**Cause**: EAI CLI not installed or not in `$PATH`.

**Resolution**:

```bash
# 1. Check if eai-cli is installed
which eai-cli

# 2. If not found, install (example using npm)
npm install -g eai-cli

# 3. Verify installation
eai-cli --version
# Expected: eai-cli X.Y.Z

# 4. If installed but not in PATH, add to shell profile
export PATH="/path/to/eai-cli/bin:$PATH"

# 5. If EAI CLI is not available, pipeline should still complete using local references:
#    Check for fallback notice in VS Code output panel
```

---

### Issue 3: Generated Artifacts Missing EAI-Specific Sections

**Symptom**: Artifacts (discovery.md, plan.md) lack EAI references despite
`gofer.workflowProfile=enterpriseai`.

**Cause**: Profile setting not propagated to AI assistant or canonical command
sources not updated.

**Resolution**:

```bash
# 1. Verify profile setting is active
cat ~/.vscode/settings.json | grep gofer.workflowProfile
# Expected: "gofer.workflowProfile": "enterpriseai"

# 2. Reload extension
Cmd+Shift+P > "Developer: Reload Window"

# 3. Verify canonical command sources contain EAI content
grep -i "enterpriseai" .claude/commands/0_business_scenario.md
grep -i "vertical" .claude/commands/3_gofer_plan.md

# 4. If not found, command sources may not be updated; contact development team

# 5. Regenerate platform mirrors from canonical sources
npm run generate-commands
# Runtime resources synchronize on extension activation/reload

# 6. Restart extension and retry pipeline
```

---

### Issue 4: Parity Tests Failing (Artifact Drift Between Mirrors)

**Symptom**: Test output shows diffs between canonical command source and
platform mirrors.

**Cause**: Canonical sources updated but mirrors not regenerated, or manual
edits made to mirror files.

**Resolution**:

```bash
# 1. Regenerate all platform mirrors from canonical sources
npm run generate-commands

# 2. Run parity tests
npm test -- tests/integration/cross-platform-parity.test.ts

# 4. If tests still fail, check for manual edits to mirror files
git diff .github/prompts/ .agents/skills/ .system/skills/
# These files should be auto-generated; do not edit manually

# 5. If diffs found, restore from generator
git checkout .github/prompts/ .agents/skills/ .system/skills/
npm run generate-commands
npm test -- tests/integration/cross-platform-parity.test.ts

# 6. Verify tests pass before proceeding
```

---

### Issue 5: Marp Slide Deck Renders with Syntax Errors

**Symptom**: Marp renderer shows "Parse error" or sections missing when opening
deck HTML.

**Cause**: Artifact generated with invalid Markdown syntax or malformed YAML
frontmatter.

**Resolution**:

```bash
# 1. Check Marp frontmatter validity
head -20 .specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.md | cat -A
# Expected:
# ---
# marp: true
# theme: gaia
# paginate: true
# ---

# 2. Validate Markdown syntax
npx markdownlint .specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.md
# Fix any reported issues (e.g., missing blank lines, invalid heading hierarchy)

# 3. Re-render with Marp CLI
marp .specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.md --output .specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.html

# 4. Open HTML in browser and verify no syntax errors
open .specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.html  # macOS
# or
xdg-open .specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.html  # Linux
# or use Windows default browser

# 5. If errors persist, regenerate artifacts
/7a_stakeholder_comms  # Re-run comms stage
```

---

### Issue 6: Pipeline Completes but No EAI CLI Tasks in tasks.md

**Symptom**: `tasks.md` generated successfully but does not include EAI CLI or
Vertical Template scaffolding steps.

**Cause**: EAI CLI not detected at runtime, or task generation logic not
profile-aware.

**Resolution**:

```bash
# 1. Verify eai-cli is accessible
which eai-cli && eai-cli --version

# 2. Check profile setting is active
grep gofer.workflowProfile ~/.vscode/settings.json

# 3. Review `.specify/references/eai/` for fallback guidance
ls -la .specify/references/eai/

# 4. If references missing, create stubs
mkdir -p .specify/references/eai/
cat > .specify/references/eai/eai-cli.md << 'EOF'
# EAI CLI Commands

## Scaffold
\`\`\`bash
eai-cli scaffold --template vertical --name my-app
\`\`\`

## Deploy
\`\`\`bash
eai-cli deploy --env production
\`\`\`
EOF

# 5. Re-run task generation
/4_gofer_tasks

# 6. Verify tasks.md now includes EAI CLI steps
grep -i "eai-cli" .specify/specs/029-enterpriseai-student-vertical-builder/tasks.md
```

---

### Issue 7: Version Pinning Not Recorded in Artifacts

**Symptom**: Generated `plan.md` and `tasks.md` do not contain eai-cli version
(major.minor).

**Cause**: Version detection logic not integrated or not executed during
artifact generation.

**Resolution**:

```bash
# 1. Verify eai-cli version
eai-cli --version
# Expected output: eai-cli 2.1.5 (record major.minor: 2.1)

# 2. Check if artifact generation includes version capture
grep -n "eai-cli" .claude/commands/3_gofer_plan.md | grep -i version

# 3. If not found, version capture may not be integrated
#    Check implementation details with dev team

# 4. Manually verify version appears in final artifacts
grep "2\.1\|eai-cli" .specify/specs/029-enterpriseai-student-vertical-builder/plan.md .specify/specs/029-enterpriseai-student-vertical-builder/tasks.md

# 5. If missing after regeneration, it's a known limitation
#    Version can be manually added to artifacts as a workaround:
echo "## Version Pinning" >> .specify/specs/029-enterpriseai-student-vertical-builder/plan.md
echo "This plan uses \`eai-cli $(eai-cli --version | awk '{print $3}')\`" >> .specify/specs/029-enterpriseai-student-vertical-builder/plan.md
```

---

### Issue 8: Local References Fallback Not Triggered on Network Unavailability

**Symptom**: Pipeline fails when external EAI docs are unavailable instead of
falling back to local references.

**Cause**: Fallback logic not implemented or network detection not working.

**Resolution**:

```bash
# 1. Verify local references exist
ls -la .specify/references/eai/

# 2. Check extension logs for network/fallback logic
Cmd+Shift+P > "Developer: Toggle Developer Tools" > Console
# Look for messages like "External EAI reference unavailable; using local fallback"

# 3. If fallback logic missing, test graceful degradation manually
#    Move external references out of reach or mock 404 responses

# 4. Temporarily disable internet or mock external service
#    (requires dev environment setup; ask development team)

# 5. Re-run pipeline and confirm local references are used
grep -i "\.specify/references/eai" .specify/specs/029-enterpriseai-student-vertical-builder/plan.md .specify/specs/029-enterpriseai-student-vertical-builder/tasks.md
# Should reference local paths, not external URLs
```

---

### Issue 9: No Regression Detected but Tests Show Warnings

**Symptom**: Tests pass but console output shows deprecation warnings or
warnings about provider changes.

**Cause**: Provider code paths may have conditional logic or profile-aware
overrides.

**Resolution**:

```bash
# 1. Review test output carefully
npm test 2>&1 | grep -i "warn\|deprecat\|profile"

# 2. Confirm test status is PASS (not just warning)
npm test 2>&1 | tail -5
# Expected: "Test Files  X passed"

# 3. If warnings relate to profile selection or provider changes, verify:
#    - No provider code paths are removed/disabled
#    - Profile logic is additive only (no behavior changes for standard profile)

# 4. Check provider factory for any conditional logic
grep -n "workflowProfile" extension/src/council/providers/ProviderFactory.ts
# Any profile references here must be additive (preference adjustments, not path removal)

# 5. If violations found, escalate to development team
```

---

### Issue 10: Market Analysis Artifact Not Generated

**Symptom**: `/1_gofer_research` completes but `market-analysis.md` is not
created in the feature directory.

**Cause**: Research stage did not complete with the expected feature context, or
output path handling failed.

**Resolution**:

```bash
# 1. Run research stage for the active feature
/1_gofer_research

# 2. When prompted about competitive analysis depth, choose either mode:
#    - Enabled: full comparative analysis (3+ alternatives)
#    - Disabled: baseline market-analysis traceability output

# 3. Verify artifact generation in feature-scoped location
ls -la .specify/specs/029-enterpriseai-student-vertical-builder/ | grep -i "market-analysis.md"

# 4. Run targeted regression check
npm test -- tests/integration/enterpriseai/market-analysis.integration.test.ts

# 5. If still missing, rerun from /0_business_scenario and inspect stage output logs
```

---

## 7. Success Verification Checklist

After completing all testing scenarios, confirm:

### Functional Completeness

- [ ] Scenario 1 passes: Profile activation works and guidance is EAI-focused
- [ ] Scenario 2 passes: Discovery artifact includes all EAI elements
- [ ] Scenario 3 passes: Plan and tasks reference EAI CLI and Vertical Template
      with version pinning
- [ ] Scenario 4 passes: Standard profile produces non-EAI artifacts without
      regression
- [ ] Scenario 5 passes: Marp deck generates with valid frontmatter and all
      sections present
- [ ] Scenario 6 passes: Competitive analysis artifact includes comparison table
      and positioning
- [ ] Scenario 7 passes: Fallback behavior activates and uses local references
      when external docs unavailable
- [ ] Scenario 8 passes: All provider routing remains intact and no providers
      are disabled
- [ ] Scenario 9 passes: eai-cli version is recorded in both plan and task
      artifacts
- [ ] Scenario 10 passes: Artifact parity tests show 0 diffs across all platform
      mirrors

### Quality Gates

- [ ] All automated tests pass: `npm test` returns 100% pass rate with no
      regressions
- [ ] Build succeeds: `cd extension && npm run compile` completes with no errors
- [ ] Parity validation passes:
      `npm run generate-commands && npm test -- tests/integration/cross-platform-parity.test.ts`
      returns 0 failures
- [ ] No manual edits to generated artifacts (`.github/prompts/`,
      `.agents/skills/`, `.system/skills/`)
- [ ] Release-readiness assertion: deployment conventions are explicitly
      referenced in generated plan/task outputs via
      `.specify/references/eai/deployment-repo.md`
- [ ] Release-readiness assertion: `eai-cli` major.minor pin is present in
      plan/task outputs and matches installed binary version
- [ ] Release-readiness assertion: Marp artifact path is `presentation.marp.md`
      and is validated in stakeholder comms output
- [ ] All locked decisions from spec are reflected in implementation:
  - [ ] Profile-driven overlay (FR-001, A-001)
  - [ ] Reliability-first (NFR-001, NFR-002)
  - [ ] No removals without explicit approval (FR-008, A-005)
- [ ] No secrets or credentials in generated artifacts (NFR-004)
- [ ] Context health maintained: no individual artifacts exceed pre-profile size
      thresholds (NFR-003)

### Validation Matrix Pass Criteria (T111)

- [x] `npm run generate-commands -- --workflow-profile enterpriseai` completed
      successfully (generation + mirror sync path).
- [x] `bash scripts/enterpriseai-validation-matrix.sh` completed successfully
      for both `standard` and `enterpriseai` profiles.
- [x] Root enterpriseai regression/governance suite passed:
  - `tests/integration/enterpriseai/non-eai-output-regression.integration.test.ts`
  - `tests/integration/enterpriseai/capability-removal-approval.integration.test.ts`
  - `tests/integration/enterpriseai/architecture-approval-loop.integration.test.ts`
  - `tests/integration/enterpriseai/context-budget-warning.integration.test.ts`
  - `tests/integration/event-contract-coverage.test.ts`
  - `tests/integration/enterpriseai/internal-api-contract-coverage.integration.test.ts`
  - `tests/integration/enterpriseai/placeholder-conventions.integration.test.ts`
  - `tests/integration/enterpriseai/novice-e2e-walkthrough.integration.test.ts`
- [x] Extension enterpriseai/onboarding integration suite passed:
      `cd extension && npm run test -- --grep "enterpriseai|onboarding"`.
- [x] Extension test compilation passed:
      `cd extension && npm run compile-tests`.
- [x] Repository typecheck passed: `npm run typecheck`.

### Documentation Completeness

- [ ] Quickstart guide is clear and scenarios are reproducible (this file)
- [ ] All prerequisites verified and documented
- [ ] All common issues have documented resolutions
- [ ] Success metrics (SC-001 through SC-010) are measurable and achievable
- [ ] Feature is ready for release or rollback decision

---

## 8. Prerequisite and Scenario Counts

**Total Prerequisites**: **9**

- System Requirements: 6
- Configuration Prerequisites: 3 (settings, directory, version detection)
- Acceptance Criteria for Setup: 6 checkboxes (setup validation)

**Total Manual Testing Scenarios**: **10**

1. Activate EnterpriseAI Workflow Profile
2. Generate Discovery with EAI Profile
3. Generate Plan with EAI CLI and Vertical Template References
4. Verify No Regression on Standard Profile
5. Marp Presentation Artifact Generation
6. Competitive Analysis Artifact
7. Graceful Fallback When External EAI Docs Unavailable
8. No Regression on Provider Routing
9. Version Pinning in Plan/Task Artifacts
10. Artifact Parity Across Platform Mirrors

**Total Automated Test Commands**: **7 command categories**

- Full test suite
- EAI-specific tests
- Regression tests
- Artifact parity validation
- Manual artifact validation
- Coverage report
- Build and package

**Total Common Issues Documented**: **10**

1. Profile setting not visible
2. eai-cli not found
3. Artifacts missing EAI sections
4. Parity test failures
5. Marp syntax errors
6. No EAI CLI tasks generated
7. Version pinning not recorded
8. Fallback not triggered
9. Warnings in test output
10. Competitive analysis not generated

---

## Appendix A: Quick Command Reference

### Activate EAI Profile

```json
// .vscode/settings.json
{
  "gofer.workflowProfile": "enterpriseai"
}
```

### Run Full Pipeline with EAI Profile

```bash
# In your AI assistant chat/CLI input:
/0_business_scenario
# Select: "EnterpriseAI student vertical app"
# Complete all stages: discovery → spec → plan → implement → comms
```

### Generate and Sync Artifacts

```bash
npm run generate-commands  # Regenerate all platform mirrors from canonical sources
# Runtime resources synchronize on extension activation/reload
npm test                    # Validate no regressions
```

### Verify Version Pinning

```bash
eai-cli --version                           # Check installed version
grep -i "eai-cli\|version" .specify/specs/029-enterpriseai-student-vertical-builder/plan.md  # Verify in artifacts
grep -i "eai-cli\|version" .specify/specs/029-enterpriseai-student-vertical-builder/tasks.md
```

### Render Marp Deck

```bash
marp .specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.md --output .specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.html
open .specify/specs/029-enterpriseai-student-vertical-builder/presentation.marp.html
```

---

**Last Updated**: 2026-04-09  
**Feature Status**: Ready for Quickstart Testing  
**Owner**: Gofer Development Team  
**Questions or Issues**: Escalate to feature spec owner or development team.
