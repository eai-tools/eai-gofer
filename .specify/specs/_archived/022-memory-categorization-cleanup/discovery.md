---
feature: '022-memory-categorization-cleanup'
created: '2026-02-11T23:00:00Z'
discoveredBy: Claude + Douglas
status: complete
---

# Business Discovery: Memory Categorization Cleanup

## Problem Statement

**Pain Point**: The word "memory" is overloaded across the codebase - it refers
to the learning/recall system, the `.specify/memory/` folder, and context
management. Constitution is stored in the memory folder but is conceptually a
separate system. The 3 sidebar panels (Memory, Context Window, Constitution)
have blurred boundaries in the code.

**Current State**: Constitution has its own provider (`constitutionProvider.ts`)
and commands but lives in `.specify/memory/` and gets loaded by `ContextBuilder`
alongside memories. The Memory panel categories (Discovery, Patterns, Decisions,
Learnings, Journeys, Architecture, Debug) need clearer organization. The term
"memory" appears in 50+ files with different meanings.

**Impact**: Developers struggle to understand which system manages what. End
users see confusing sidebar categories.

## Target Users

### Primary Users

- **Persona**: Developers maintaining the Gofer codebase + end users of the
  VSCode extension
- **Technical Level**: Mixed (developers = high, end users = medium)
- **Key Needs**: Clear mental model of what each panel/system does; intuitive UI
  categories

## Value Proposition

**Primary Value**: Clearer code architecture AND more intuitive user-facing
categories **Quantified Goal**: Eliminate the naming ambiguity so each system
has a distinct, non-overlapping name and purpose

## Success Metrics

| Metric           | Target                                                              | Measurement         |
| ---------------- | ------------------------------------------------------------------- | ------------------- |
| Naming clarity   | Zero overloaded uses of "memory" across systems                     | Code review         |
| UI intuitiveness | Categories clearly map to what they contain                         | User feedback       |
| Code boundaries  | Each panel's code is self-contained with minimal cross-dependencies | Dependency analysis |

## Scope

- **In scope**: UI + Code changes - refactor internal boundaries, rename
  types/interfaces, update sidebar panel categories and tree view labels
- **Out of scope**: .specify/memory/ folder structure (that's the Gofer
  pipeline's concern, not the extension's)

## Discovery Decisions

| Decision      | Choice                        | Rationale                                            |
| ------------- | ----------------------------- | ---------------------------------------------------- |
| Problem Focus | Naming confusion              | "Memory" is overloaded across 3 different systems    |
| User Target   | Both developers and end users | Architecture clarity + UI clarity                    |
| Scope         | UI + Code                     | Internal refactoring plus updated sidebar categories |
