# Plan Stage

**Command**: `/3_gofer_plan` **Input**: `research.md`, `spec.md` **Output**:
`plan.md`, `data-model.md`, `contracts/`

The plan stage designs the technical architecture for the feature. It transforms
business requirements into a concrete implementation strategy.

## What It Does

1. **Analyzes the tech stack** from research and codebase patterns
2. **Designs architecture** showing how components fit together
3. **Defines data models** with entities, fields, and relationships
4. **Specifies API contracts** with request/response schemas
5. **Creates implementation phases** ordered by dependency
6. **Validates spec coverage** ensuring every requirement has a plan component

## What You Get

| Artifact           | Content                                               |
| ------------------ | ----------------------------------------------------- |
| `plan.md`          | Architecture, phases, file structure, risk assessment |
| `data-model.md`    | Entity definitions, relationships, validation rules   |
| `contracts/api.md` | REST/GraphQL endpoint specifications                  |
| `quickstart.md`    | Testing guide for the feature                         |

## Key Concepts

### Implementation Phases

The plan breaks work into sequential phases:

| Phase        | Purpose                                | Example                          |
| ------------ | -------------------------------------- | -------------------------------- |
| Setup        | Project structure, configuration       | Create directories, install deps |
| Foundational | Shared components all stories need     | Database schema, base classes    |
| User Stories | One phase per story, in priority order | Implement login, then profile    |
| Polish       | Cross-cutting concerns                 | Documentation, performance       |

### Spec Coverage Validation

Before completing, the plan validates 100% coverage:

- Every user story has implementing components
- Every acceptance criterion maps to a plan element
- Every functional requirement has a phase assignment

### Constitution Alignment

If a project constitution exists (`.specify/memory/constitution.md`), the plan
verifies alignment with project principles like test-driven development, coding
standards, and architectural patterns.

## Example

```text
/3_gofer_plan Design the architecture for user authentication
```

This produces `plan.md` with phases for database schema, auth middleware, JWT
handling, and API endpoints, plus `data-model.md` for User and Session entities.
