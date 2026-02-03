---
description:
  'Reverse-engineer a Gofer specification from existing code (Hydration)'
author: 'SpecGofer'
---

# RPI Phase: Spec Hydration (Reverse Engineering)

You are tasked with analyzing the existing codebase and generating a compliant
**Gofer 0.2** specification (`spec.md`) and task list (`tasks.md`) that
accurately reflects the current implementation.

## Context

Ref: `.specify/memory/constitution.md` (for project standards)

## Goal

Create a new specification folder `.specify/specs/NNN-hydrated-feature/` (where
NNN is the next available number) containing:

1. `spec.md`: High-level feature description, user stories, and acceptance
   criteria based on the _actual_ observed behavior of the code.
2. `tasks.md`: A list of completed tasks that represent the work that _was_ done
   to build this.

## Instructions

1.  **Analyze** the provided source files or the active module.
2.  **Identify** the core feature logic, data structures, and tests.
3.  **Generate** `spec.md` with:
    - `id`: "NNN-hydrated-feature"
    - `title`: Descriptive title of the feature.
    - `status`: "completed"
    - `type`: "feature" | "refactor" | "fix"
    - **User Stories**: Reverse-engineered from the capabilities.
    - **Acceptance Criteria**: Derived from existing tests or logic assertions.
4.  **Generate** `tasks.md` with:
    - A breakdown of the component parts as "completed" tasks.
    - Ensure dependencies are logically ordered (e.g., Core Logic -> API -> UI).

## Output Format

Determine the next available spec ID (NNN). Create the folder
`.specify/specs/NNN-hydrated-feature/`. Write `spec.md` and `tasks.md`.

Confirm when done.
