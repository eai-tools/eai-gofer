# Specify Stage

**Command**: `/2_gofer_specify` **Input**: `research.md` **Output**: `spec.md`

The specify stage creates a feature specification informed by the codebase
research. It defines what to build in business terms - user stories,
requirements, and success criteria.

## What It Does

1. **Loads research findings** to understand integration points and constraints
2. **Generates user stories** prioritized by business value (P1, P2, P3)
3. **Defines acceptance criteria** for each story using Given/When/Then format
4. **Sets success criteria** with measurable targets
5. **Validates research integration** to ensure no findings are missed

## What You Get

The `spec.md` file includes:

| Section                     | Content                                             |
| --------------------------- | --------------------------------------------------- |
| User Stories                | Prioritized user journeys with acceptance criteria  |
| Functional Requirements     | Testable, numbered requirements (FR-001, FR-002...) |
| Non-Functional Requirements | Performance, security, compatibility targets        |
| Success Criteria            | Measurable outcomes with specific targets           |
| Assumptions                 | What we're assuming to be true                      |
| Dependencies                | Existing code and external dependencies             |
| Out of Scope                | What this feature does NOT include                  |

## Key Concepts

### User Story Format

Each story follows a standard format:

```markdown
### US1: User Logs In (P1)

**As a** registered user **I want to** log in with my email and password **So
that** I can access my account

**Acceptance Criteria**:

- [ ] Given valid credentials, When user submits, Then user is redirected to
      dashboard
- [ ] Given invalid credentials, When user submits, Then error message is
      displayed
```

### Priority Levels

| Priority | Meaning      | Impact                     |
| -------- | ------------ | -------------------------- |
| P1       | Must have    | Required for MVP           |
| P2       | Should have  | Important but not blocking |
| P3       | Nice to have | Can be deferred            |

### Research Integration

The spec validates that ALL research findings are addressed. Each integration
point, constraint, and technology decision from `research.md` is traced to a
spec section.

## Example

```text
/2_gofer_specify Create a spec for user profile management
```

This produces a `spec.md` with user stories for viewing, editing, and deleting
profiles, informed by existing codebase patterns found during research.
