---
name: gofer_constitution
description:
  Create or update project constitution with coding principles and guidelines
agent: agent
tools: ['search/codebase', 'terminal', 'editFile']
argument-hint: What principles or guidelines to add/update
---

# Gofer Constitution

You are creating or updating the project constitution - a set of principles,
coding standards, and architectural decisions that guide all development work.
This is critical for **agentic consistency** - ensuring AI agents behave
consistently across sessions.

---

## Why Constitution Matters for Agentic Coding

1. **Consistency Across Sessions**: Agents follow the same rules every time
2. **Memory Persistence**: Decisions survive context window limits
3. **Team Alignment**: All agents (and humans) follow same guidelines
4. **Quality Gates**: Automatic validation against principles
5. **Knowledge Capture**: Learnings from past work inform future work

---

## When to Use This Command

- **Project Setup**: Initialize constitution for new project
- **Post-Implementation Learning**: Capture decisions from completed features
- **Standards Update**: Add new conventions or patterns
- **Onboarding**: Document expectations for new team members/agents

---

## Step 1: Check Existing Constitution

```bash
# Check if constitution exists
if [ -f ".specify/memory/constitution.md" ]; then
  echo "Constitution exists - will update"
else
  echo "No constitution - will create"
fi
```

---

## Step 2: Gather Project Context

If creating new constitution:

1. **Analyze codebase** for existing patterns
2. **Check package.json** for tech stack
3. **Review existing docs** for conventions
4. **Ask user** about any specific requirements

---

## Step 3: Create/Update Constitution

Write to `.specify/memory/constitution.md`:

````markdown
---
version: 1.0.0
updated: [ISO date]
author: Copilot
---

# Project Constitution

## Overview

This document defines the principles, standards, and architectural decisions
that guide all development on this project. All AI agents and human developers
must follow these guidelines.

## Code Quality Principles

### TypeScript Standards

- [ ] Use strict TypeScript (`"strict": true`)
- [ ] Never use `any` type without justification
- [ ] Files must be under 300 lines
- [ ] Functions must be under 50 lines
- [ ] Use explicit return types

### Testing Standards

- [ ] Minimum 80% code coverage
- [ ] Write tests before implementation (TDD)
- [ ] Follow existing test patterns in codebase
- [ ] Use descriptive test names

### Security Standards

- [ ] Never commit secrets or credentials
- [ ] Use environment variables for configuration
- [ ] Validate all user input
- [ ] Follow OWASP guidelines

### Performance Standards

- [ ] API responses under 500ms (p95)
- [ ] UI interactions under 100ms
- [ ] Optimize database queries
- [ ] Use pagination for large datasets

## Architectural Decisions

### [Decision 1]

**Context**: [Why this decision was needed] **Decision**: [What was decided]
**Consequences**: [Impact of this decision]

### [Decision 2]

...

## Naming Conventions

### Files

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Tests: `*.test.ts`
- Types: `*.types.ts`

### Code

- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `IPascalCase` or `PascalCase`

## Directory Structure

```text
src/
├── components/   # UI components
├── services/     # Business logic
├── utils/        # Shared utilities
├── types/        # TypeScript types
└── tests/        # Test files
```
````

## Dependencies Policy

- [ ] Document why each dependency is needed
- [ ] Prefer well-maintained packages
- [ ] Review security advisories
- [ ] Keep dependencies up to date

## Change Log

| Date   | Version | Change               | Author  |
| ------ | ------- | -------------------- | ------- |
| [Date] | 1.0.0   | Initial constitution | Copilot |

```

---

## Step 4: Validation

After creating/updating:

1. **Verify format** is correct
2. **Check completeness** of all sections
3. **Confirm** with user any unclear points

```

✅ Constitution saved to .specify/memory/constitution.md

This document will guide all future development. The engineer agent will
validate code against these principles before marking tasks complete.

```

```
