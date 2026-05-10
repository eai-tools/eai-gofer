# Legacy Workflow: Sequential Validation for Pre-2026 Copilot

## Overview

GitHub Copilot Chat versions before 2026 do not support multi-agent delegation
or parallel task spawning. This document provides the sequential validation
workflow for those versions.

**Affected Versions**: GitHub Copilot Chat 2025 and earlier **Expected
Duration**: 90-120 seconds (vs 45-60s parallel) **Alternative**: Upgrade to
Copilot 2026+ or use Claude Code CLI for parallel execution

---

## Sequential Validation Process

When running `#6_gofer_validate` in pre-2026 Copilot Chat, perform each
validation step sequentially and collect the findings before scoring the rubric.

### Step 1: Correctness Validation

Run the correctness validator inline, review every acceptance criterion in
`spec.md`, and record Red/Yellow/Gray findings against real code and tests.

### Step 2: Security Validation

Run the security validator inline, scan the changed files from `tasks.md`, and
record any hardcoded secrets, disabled security controls, or auth bypass risks.

### Step 3: Performance Validation

Run the performance validator inline, check for unbounded loops, blocking work
in async paths, or other obvious regressions, and record the findings.

### Step 4: Test Quality Validation

Run the test-quality validator inline, inspect coverage, mock ratio, and
placeholder assertions, and record the findings.

### Step 5: Integration Validation

Run the integration validator inline, verify contract coverage and runtime
integration proof, and record the findings.

### Step 6: Standards Validation

Run the standards validator inline, check constitution/pattern compliance, and
record the findings.

---

## Rubric Scoring

After collecting all six validation outputs, score the rubric conservatively.
Any category with missing evidence or a Red finding scores `0`.

---

## Performance Comparison

| Execution Method                      | Duration | Effort            |
| ------------------------------------- | -------- | ----------------- |
| Claude Code CLI (parallel)            | 45-60s   | Automatic         |
| Copilot 2026+ (parallel)              | 45-60s   | Automatic         |
| Copilot 2025 and earlier (sequential) | 90-120s  | Manual collection |
| Codex CLI (parallel terminals)        | 45-60s   | Manual setup      |
