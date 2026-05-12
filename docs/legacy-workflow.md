# Legacy Workflow

This guide documents the sequential validation fallback for environments that
cannot run Gofer validation agents in parallel, especially GitHub Copilot Chat
2025 and earlier.

Use this workflow only when the normal parallel validation path is unavailable.
The parallel path remains the preferred Gofer validation mode because it gives
faster feedback while preserving the same validation categories.

## Sequential Validation Process

Run the six validation checks one at a time in this order:

1. Correctness validator
2. Security validator
3. Performance validator
4. Test quality validator
5. Integration validator
6. Standards validator

For each validator, capture the evidence, findings, and score before starting
the next validator. Treat missing evidence as a failed check rather than an
implicit pass.

## Performance Comparison

Parallel validation should complete in under 60 seconds when the environment can
run six validation agents concurrently. The legacy sequential process is
expected to take 90-120 seconds because each validation pass waits for the
previous one to finish.

The output quality target is the same for both modes: validate correctness,
security, performance, test quality, integration behavior, and standards
compliance before reporting the final Gofer validation result.

## When To Use This Fallback

Use the legacy workflow when:

1. The developer is using GitHub Copilot Chat 2025 or earlier.
2. The environment cannot spawn multiple validation agents or terminal sessions.
3. A policy or tool limitation requires single-agent execution.

Do not use the fallback to skip validation categories. It changes execution
order only; it does not reduce validation scope.
