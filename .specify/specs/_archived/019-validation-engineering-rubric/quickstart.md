# Quickstart: Validation Engineering Rubric

## Prerequisites

- Claude Code CLI installed
- Gofer project with `.claude/` directory
- A feature that has been through stages 1-5 of the pipeline

## What Changed

The `/6_gofer_validate` command was rewritten to use:

- A 10-category rubric scored out of 100 points
- 6 specialist validation agents (instead of 3 generic ones)
- A brownfield restart loop when validation fails
- Mutation testing, mock ratio, and semantic slop detection

## Testing the Feature

### Run Validation Against Current Codebase

```bash
# In Claude Code, run:
/6_gofer_validate
```

**Expected result**: FAIL with score ~25/100. This confirms the rubric correctly
detects the 81 placeholder tests, heavy mocking, and missing coverage.

### Verify Agent Files Exist

```bash
ls .claude/agents/validation-*.md
```

Should show 6 files:

- `validation-correctness.md`
- `validation-security.md`
- `validation-performance.md`
- `validation-test-quality.md`
- `validation-integration.md`
- `validation-standards.md`

### Verify Mirror Copies Are In Sync

```bash
diff .claude/commands/6_gofer_validate.md extension/resources/claude-commands/6_gofer_validate.md
```

Should show no differences (or only frontmatter format differences for
Copilot/GitHub versions).

### Check Validation Findings Log

After running validation, check:

```bash
cat .specify/logs/validation-findings.jsonl | head -5
```

Should contain JSONL entries with finding_id, category, severity, description.

## Key Files

| File                                        | Purpose                                        |
| ------------------------------------------- | ---------------------------------------------- |
| `.claude/commands/6_gofer_validate.md`      | Main validation command (rubric orchestration) |
| `.claude/agents/validation-correctness.md`  | Spec compliance agent                          |
| `.claude/agents/validation-security.md`     | Security analysis agent                        |
| `.claude/agents/validation-performance.md`  | Performance analysis agent                     |
| `.claude/agents/validation-test-quality.md` | Test authenticity agent                        |
| `.claude/agents/validation-integration.md`  | Contract compliance agent                      |
| `.claude/agents/validation-standards.md`    | Standards compliance agent                     |

## Rubric Categories

| #   | Category                   | Points |
| --- | -------------------------- | ------ |
| 1   | Functional Correctness     | 15     |
| 2   | Test Authenticity          | 15     |
| 3   | UI/E2E Verification        | 10     |
| 4   | Security Posture           | 10     |
| 5   | Integration Reality        | 10     |
| 6   | Error Path Coverage        | 10     |
| 7   | Architecture Compliance    | 10     |
| 8   | Performance Baseline       | 5      |
| 9   | Code Hygiene               | 10     |
| 10  | Specification Traceability | 5      |

## Common Issues

### Stryker Not Installed

**Problem**: Mutation testing reports "unavailable" **Solution**: Install
Stryker: `npm install --save-dev @stryker-mutator/core` The rubric gracefully
skips mutation scoring if Stryker is not installed.

### Mock Ratio Too High

**Problem**: Mock ratio exceeds 30% threshold **Solution**: VSCode API mocks are
unavoidable. The test-quality agent accounts for justified mocks. Add
`// mock-justified: VSCode API` comments to legitimate mock usages.

### Validation Loops Endlessly

**Problem**: Remediation fails after 3 iterations **Solution**: After 3
iterations, an escalation-report.md is generated. Review it manually to identify
systemic issues that automated remediation can't fix.
