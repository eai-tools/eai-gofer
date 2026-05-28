# Gofer Agent Commands

This file documents all Gofer pipeline commands available as agent skills.

Generated: 2026-05-28T02:34:12.715Z

## Commands

### Business Scenario
---
description: Triage business scenario and orchestrate the unified Gofer pipeline
---

# Gofer Orchestrator

You are the Gofer orchestrator. Your job is to understand the user's business
scenario a...

### Problem Validation
---
description:
  Validate business problem using 5 Whys analysis, stakeholder impact mapping,
  and market landscape research before any solution design
---

# Gofer Problem Validation

You are vali...

### Gofer Cloud
---
description:
  READ-ONLY cloud infrastructure analysis for Azure, AWS, GCP deployments
---

# Gofer Cloud

You are conducting comprehensive READ-ONLY analysis of cloud deployments and
infrastructu...

### Gofer Research
---
description: Deep codebase and technology research for feature implementation
---

# Gofer Research

You are conducting comprehensive research to understand the codebase before
specifying a new fe...

### Gofer Specify
---
description: Create feature specification informed by codebase research
---

# Gofer Specify

You are creating a feature specification informed by prior codebase research.
This is the **second sta...

### Gofer Plan
---
description:
  Generate technical implementation plan with architecture and contracts
---

# Gofer Plan

You are creating a detailed technical implementation plan. This is the **third
stage** of t...

### Gofer Tasks
---
description: Generate actionable task breakdown from implementation plan
---

# Gofer Tasks

You are generating an actionable, dependency-ordered task breakdown. This is the
**fourth stage** of th...

### Gofer Implement
---
description: Execute tasks from tasks.md to implement the feature
---

# Gofer Implement

You are executing the implementation plan by processing all tasks from tasks.md.
This is the **fifth stage...

### Gofer Validate
---
description:
  Unified validation, blast-radius analysis, and engineering review (3 phases,
  110-point rubric)
---

# Gofer Validate

You are validating that the implementation meets engineering ...

### Gofer Engineering Review
---
description:
  Backwards-compat stub — engineering review is now Phase C of /6_gofer_validate
---

# Gofer Engineering Review (Back-Compat Stub)

> **NOTE**: This command was consolidated into `/6...

### Gofer Save
---
description: Save session progress with comprehensive checkpoint for resumption
---

# Gofer Save

You are creating a comprehensive progress checkpoint when the user needs to
pause work on a featu...

### Stakeholder Communications
---
description:
  Generate stakeholder communications package including release notes, demo
  script, change management brief, and success metrics
---

# Gofer Stakeholder Communications

You are gen...

### Gofer Resume
---
description:
  Resume work from saved session checkpoint with full context restoration
---

# Gofer Resume

You are resuming previously saved work by restoring full context and continuing
implemen...

### Gofer Tests
---
description:
  Define acceptance test cases using DSL approach before or during
  implementation
---

# Gofer Tests

You are defining acceptance test cases for a feature using a Domain Specific
La...

### Gofer Constitution
---
description:
  Create or update project constitution with coding principles and guidelines
---

# Gofer Constitution

You are creating or updating the project constitution - a set of principles,
c...

### Gofer Diagnose

# Gofer Diagnose

Run a structured reproduce-minimize-instrument-fix investigation and write the
results to `.specify/specs/{feature}/diagnose-report.md`.

Use this when an implementation, test, or i...

### Gofer Hydrate
---
description: Reverse-engineer specification from existing code (Hydration)
---

# Gofer Hydrate

You are analyzing existing code and generating a compliant specification
(`spec.md`) and task list ...

### Gofer Personality

# Gofer Personality

Set the assistant personality for the current Gofer session. The chosen preset
adjusts tone and verbosity without changing the technical content, artifacts, or
pipeline behavior ...

### Gofer Plan Mode Toggle

# Gofer Plan Mode Toggle

When invoked, this command signals the host CLI to enter plan mode for the next
user prompt, requesting a structured plan instead of immediate execution. Use it
before compl...

### Gofer Side Conversation

# Gofer Side Conversation

Open a side conversation in the active CLI without disturbing the main Gofer
pipeline state. Use this when you need to ask a quick clarifying question, run
an exploratory s...

### Gofer Spec Summary

# Gofer Spec Summary

Generate a business-friendly summary of the current feature and write it to
`.specify/specs/{feature}/spec-summary.md`.

Use this when a stakeholder or implementation team needs...

### Gofer TDD

# Gofer TDD

Guide a red-green-refactor loop for the active feature and write the cycle log
to `.specify/specs/{feature}/tdd-session.md`.

Use this helper when you want to work test-first inside the ...

### Gofer Vocabulary

# Gofer Vocabulary

Extract the feature's shared domain language into a canonical glossary and
write it to `.specify/specs/{feature}/glossary.md`.

Use this when research, specification, contracts, o...

### Gofer Zoom Out

# Gofer Zoom Out

Expand the current feature into its surrounding system context and write the
result to `.specify/specs/{feature}/zoom-out-report.md`.

Use this helper when the feature needs broader...
