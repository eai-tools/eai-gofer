# Gofer Agent Commands

Gofer is a pipelined feature-development assistant. It orchestrates research ->
specify -> plan -> tasks -> implement -> validate as a sequence of stages, each
backed by a Markdown command file at `.specify/commands/<stage>.md`.

This document is the canonical Codex/Gemini-facing index of the non-Claude-only
stages. The five Claude-only stages (`0_business_scenario`,
`gofer_constitution`, `gofer_hydrate`, `7_gofer_save`, `8_gofer_resume`) are
intentionally omitted from this index per FR-007.

## Available stages

### 0a_problem_validation

Validate the business problem using 5 Whys root-cause analysis and stakeholder
mapping.

Use when: a stakeholder hands you a feature idea and you need to confirm the
underlying problem before any design work.

### 1_gofer_research

Research codebase, CLI integrations, and technology landscape for the target
feature.

Use when: starting a new feature and you need a structured codebase + market
scan before specifying.

### 2_gofer_specify

Generate a feature specification from research findings and approved proposal
review.

Use when: research is complete and you are ready to lock the scope into a spec
with acceptance criteria.

### 3_gofer_plan

Create a detailed technical implementation plan with architecture, data model,
and contracts.

Use when: the spec is approved and you need an architecture, data-model, and
contract plan before tasking.

### 4_gofer_tasks

Break down the implementation plan into dependency-ordered, parallelisable
tasks.

Use when: the plan is locked and you need a tasks.md with parallelisable,
dependency-ordered work items.

### 5_gofer_implement

Execute all tasks from tasks.md phase by phase with feedback loops and
engineering review.

Use when: tasks.md is ready and you want to run the full implement loop with
engineering-review feedback.

### 6_gofer_validate

Validate the implementation against spec acceptance criteria across six quality
dimensions.

Use when: implementation is complete and you need a 100-point rubric pass across
the six validation dimensions.

### 6a_gofer_engineering_review

Run a targeted engineering review on a specific component or concern.

Use when: a specific module or concern needs a focused engineering review
independent of the full pipeline.

### 7a_stakeholder_comms

Generate stakeholder-facing communications: release notes, demo scripts, and
change briefs.

Use when: validation is complete and you need release notes, a demo script, and
a change-management brief for stakeholders.

### 9_gofer_tests

Generate comprehensive test suites from four testing perspectives for a target
component.

Use when: a component needs test coverage from the four diversifier perspectives
(unit, integration, contract, property).

### 10_gofer_cloud

Deploy and configure the Gofer cloud integration for remote pipeline execution.

Use when: you need read-only cloud-infrastructure analysis for an Azure, AWS, or
GCP target environment.

## Activation

Codex discovers these stages via `.agents/skills/gofer/<stage>/SKILL.md`
(already emitted by `.specify/scripts/node/generate-commands.mjs`).

Gemini discovers them via `.gemini/commands/gofer/<stage>.toml` plus
`.gemini/extension.json`.

Each stage description is capped at 140 characters and the cumulative byte total
across the canonical Gofer set is bounded at 2048 bytes (Hard Invariant 2 -
Codex skill-budget hygiene).

## Engineering guidelines

The following code-quality guidelines apply to any agent generating or modifying
files in this repo.

### TypeScript rules

- **Explicit return types** on all functions: `function foo(): string {}`
- **No `any`** - use `unknown` or proper interfaces
- **ES6 imports only** - never `require()`
- **Remove unused** variables and imports
- **Strict mode** enabled in tsconfig

### Markdown rules

- Blank lines around headings, lists, and code blocks
- Always specify language on fenced code blocks (typescript, bash, text)
- Use proper heading hierarchy (no skipped levels, no bold-as-heading)
- No trailing spaces, no multiple consecutive blank lines

### Formatting (Prettier)

Config:
`{ semi: true, trailingComma: "es5", singleQuote: true, printWidth: 100, tabWidth: 2 }`
Run `npm run format` before committing. Don't fight Prettier.

### Git commits

Format: `type(scope): subject` where type is
feat|fix|docs|style|refactor|test|chore.

### Testing

- Unit: `tests/unit/**/*.test.ts`, Integration: `tests/integration/**/*.test.ts`
- Use Arrange/Act/Assert pattern. Add `: void` return types to test functions.
- Minimum 80% coverage, 100% on critical paths

### Commands

```bash
npm run lint          # Run all linters
npm run lint:fix      # Auto-fix lint issues
npm run format        # Format all files
npm test              # Run all tests
npm test -- --coverage  # With coverage
cd extension && npm run compile  # Build extension
```

### Pre-commit checklist

1. `npm run lint` passes
2. `npm run format` applied
3. `npm test` passes
4. No `any` types, no `require()`, no unused imports
5. All functions have explicit return types
6. Commit message follows conventional format

**Releases**: ALWAYS use `./release-auto.sh patch|minor|major "message"`. Never
manually bump versions.
