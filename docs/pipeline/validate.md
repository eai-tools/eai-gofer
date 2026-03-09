# Validate Stage

**Command**: `/6_gofer_validate` **Output**: `validation-report.md`

The validate stage is the final quality gate. It verifies that the
implementation matches the specification using a 10-category engineering rubric
scored out of 100 points.

## What It Does

1. **Spawns 6 specialist validation agents** in parallel
2. **Scores implementation** against a 10-category rubric
3. **Reports findings** as Red (blocking), Yellow (warning), or Gray
   (informational)
4. **Triggers remediation** if score is below 100 (brownfield restart loop)

## The 10-Category Rubric

| Category               | Points | What It Checks                        |
| ---------------------- | ------ | ------------------------------------- |
| Spec Compliance        | 15     | Do all acceptance criteria pass?      |
| Functional Correctness | 15     | Does the code do what it should?      |
| Test Authenticity      | 10     | Are tests real (not placeholders)?    |
| Mock Ratio             | 10     | Is mock usage below 30%?              |
| Mutation Testing       | 5      | Do tests catch injected bugs?         |
| Security               | 10     | Any vulnerabilities or secrets?       |
| Performance            | 10     | Sync I/O, unbounded operations?       |
| Integration Contracts  | 10     | Do component boundaries hold?         |
| Code Standards         | 10     | Does code follow project conventions? |
| AI Slop Detection      | 5      | Any generic/placeholder content?      |

**Pass threshold**: 100/100 (any deduction triggers remediation)

## Specialist Agents

Six validation agents run in parallel, each focused on a specific area:

| Agent                     | Focus                                      | Blocks If           |
| ------------------------- | ------------------------------------------ | ------------------- |
| `validation-correctness`  | Spec compliance, acceptance criteria       | Any criterion unmet |
| `validation-security`     | Secrets, auth bypass, vulnerabilities      | Any Red finding     |
| `validation-performance`  | Sync I/O, complexity, unbounded operations | Complexity > 12     |
| `validation-test-quality` | Placeholders, skips, mock ratio            | Mock ratio > 30%    |
| `validation-integration`  | Contracts, boundaries, dependencies        | Contract violation  |
| `validation-standards`    | Constitution, patterns, AI slop            | Pattern deviation   |

## Brownfield Restart Loop

If validation fails (score < 100):

1. A **remediation report** is generated listing all findings
2. The pipeline re-enters implementation focused on failed categories
3. Validation runs again after fixes
4. Maximum 3 remediation iterations before human escalation

## Finding Severity

| Level  | Meaning        | Action Required                  |
| ------ | -------------- | -------------------------------- |
| Red    | Blocking issue | Must fix - prevents release      |
| Yellow | Warning        | Should fix - noted for awareness |
| Gray   | Informational  | Nice to know - no action needed  |

## Example

```text
/6_gofer_validate Verify the auth implementation
```

This produces a `validation-report.md` with scores, findings, and either a PASS
or remediation plan.
