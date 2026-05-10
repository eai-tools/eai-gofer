# Legacy Workflow: Sequential Validation for Pre-2026 Copilot

## Overview

GitHub Copilot Chat versions before 2026 do not support multi-agent delegation
or parallel task spawning. This document provides the sequential validation
workflow for these versions.

**Affected Versions**: GitHub Copilot Chat 2025 and earlier **Expected
Duration**: 90-120 seconds (vs 45-60s parallel) **Alternative**: Upgrade to
Copilot 2026+ or use Claude Code CLI for parallel execution

---

## Sequential Validation Process

When running `#6_gofer_validate` in pre-2026 Copilot Chat, you must perform each
validation step sequentially:

### Step 1: Correctness Validation

Run the correctness validator inline:

```
Validate functional correctness for feature [FEATURE_NAME].

Feature directory: .specify/specs/[feature]/
Check every acceptance criterion in spec.md.
For each criterion, find the test that exercises it and verify it tests real code.

Return findings:
- Red findings (0 points): Missing tests for acceptance criteria
- Yellow findings: Tests that don't actually test the code
- Gray findings: Informational notes
```

**Collect output** → Save findings for rubric scoring

### Step 2: Security Validation

Run the security validator inline:

```
Validate security posture for feature [FEATURE_NAME].

Scan all new/modified files from tasks.md.
Check for: hardcoded secrets, disabled security, auth bypass, client-side keys.

Return findings:
- Red findings (0 points): Security vulnerabilities
- Yellow findings: Security warnings
- Gray findings: Best practice notes
```

**Collect output** → Save findings for rubric scoring

### Step 3: Performance Validation

Run the performance validator inline:

```
Validate performance characteristics for feature [FEATURE_NAME].

Check for: O(n²) algorithms, unbounded loops, memory leaks, missing pagination.

Return findings:
- Red findings (0 points): Critical performance issues
- Yellow findings: Performance concerns
- Gray findings: Optimization suggestions
```

**Collect output** → Save findings for rubric scoring

### Step 4: Test Quality Validation

Run the test quality validator inline:

```
Validate test authenticity for feature [FEATURE_NAME].

Check test coverage, mock ratio, placeholder tests.
Calculate mock ratio: (mocked dependencies / total dependencies) × 100.

Return findings:
- Red findings (0 points): >30% mock ratio, placeholder tests
- Yellow findings: 20-30% mock ratio
- Gray findings: Test coverage notes
```

**Collect output** → Save findings for rubric scoring

### Step 5: Integration Validation

Run the integration validator inline:

```
Validate integration contracts for feature [FEATURE_NAME].

Check API contracts, database schema, message formats.
Verify contract tests exist for all integration points.

Return findings:
- Red findings (0 points): Missing contract validation
- Yellow findings: Incomplete contract coverage
- Gray findings: Integration notes
```

**Collect output** → Save findings for rubric scoring

### Step 6: Standards Validation

Run the standards validator inline:

```
Validate code standards for feature [FEATURE_NAME].

Check against .specify/memory/constitution.md principles.
Verify naming conventions, error handling, documentation.

Return findings:
- Red findings (0 points): Constitution violations
- Yellow findings: Pattern inconsistencies
- Gray findings: Style suggestions
```

**Collect output** → Save findings for rubric scoring

---

## Rubric Scoring

After collecting all 6 validation reports, score the 10-category rubric:

| Category             | Weight    | Score Criteria                                |
| -------------------- | --------- | --------------------------------------------- |
| 1. Correctness       | 20 points | All acceptance criteria tested with real code |
| 2. Security          | 15 points | No vulnerabilities, secure by default         |
| 3. Performance       | 10 points | No O(n²), bounded operations                  |
| 4. Test Authenticity | 15 points | <20% mock ratio, real tests                   |
| 5. Mock Ratio        | 10 points | Documented in validation report               |
| 6. Integration       | 10 points | Contract tests for all integration points     |
| 7. Mutation Testing  | 5 points  | >80% mutation score                           |
| 8. Standards         | 10 points | Constitution compliance                       |
| 9. Code Hygiene      | 3 points  | Lint passing, no warnings                     |
| 10. Semantic Slop    | 2 points  | No placeholder comments                       |

**Pass Threshold**: 100/100 required **Failure Trigger**: Any category scoring 0
triggers brownfield restart

---

## Performance Comparison

| Execution Method               | Duration    | Effort                |
| ------------------------------ | ----------- | --------------------- |
| Claude Code CLI (parallel)     | 45-60s      | Automatic             |
| Copilot 2026+ (parallel)       | 45-60s      | Automatic             |
| **Copilot 2025- (sequential)** | **90-120s** | **Manual collection** |
| Codex CLI (6 terminals)        | 45-60s      | Manual setup          |

---

## Migration Path

To upgrade from sequential to parallel validation:

### Option 1: Upgrade Copilot

1. Check GitHub Copilot release notes for multi-agent delegation support
2. Upgrade Copilot extension to 2026+ version
3. Validation automatically uses parallel execution

### Option 2: Switch to Claude Code CLI

1. Install Claude Code CLI: `npm install -g @anthropic/claude-code`
2. Authenticate: `claude auth login`
3. Commands accessible via `/6_gofer_validate` syntax
4. Automatic parallel execution via Task tool

### Option 3: Use Codex CLI with 6 Terminals

1. Install Codex CLI: `npm install -g @openai/codex-cli`
2. Open 6 terminal sessions
3. Run `$ $validation-<type> <feature>` in each terminal
4. Manual but parallel execution

---

## Troubleshooting

**Q: Can I skip validations to save time?** A: No. All 6 validators are required
for 100/100 score. Skipping any validator results in incomplete rubric scoring.

**Q: Can I run multiple Copilot Chat windows simultaneously?** A: Yes, but each
window maintains separate context. You'll need to manually aggregate results
across windows.

**Q: Will future Copilot versions support parallel agents?** A: GitHub Copilot
roadmap includes multi-agent delegation. Check release notes for updates.

---

## Related Documentation

- [Cross-Platform Command Parity](../extension/README.md#cross-platform-support)
- [Validation Rubric](./validation-rubric.md)
- [Gofer Pipeline Overview](./pipeline.md)
