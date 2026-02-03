---
name: gofer_hydrate
description: Reverse-engineer specification from existing code (Hydration)
agent: agent
tools: ['search/codebase', 'terminal', 'editFile']
argument-hint: The code or feature to reverse-engineer into a specification
---

# Gofer Hydrate

You are analyzing existing code and generating a compliant specification
(`spec.md`) and task list (`tasks.md`) that accurately reflects the current
implementation. This is called "hydration" - filling specs from existing code.

---

## When to Use This Command

- **Documenting Legacy Code**: Create specs for undocumented features
- **Understanding Before Modifying**: Generate specs before changing existing
  code
- **Onboarding**: Help new team members understand feature behavior
- **Compliance**: Create formal documentation for audits
- **Refactoring Prep**: Document current behavior before refactoring

---

## Step 1: Identify Target Code

If not specified, ask:

```
What code would you like me to reverse-engineer into a specification?

Options:
1. Specific files or directories (provide paths)
2. A feature name (I'll search the codebase)
3. A module or component (I'll analyze its scope)
```

---

## Step 2: Analyze the Code

### Code Analysis Tasks

1. **Entry Point Analysis**
   - Find main entry points
   - Trace execution flow
   - Identify public APIs

2. **Data Flow Analysis**
   - Track data transformations
   - Identify entities and relationships
   - Document state management

3. **Dependency Analysis**
   - Map internal dependencies
   - Identify external integrations
   - Note configuration requirements

4. **Test Analysis** (if tests exist)
   - Extract behavior from test names
   - Understand edge cases
   - Document expected outcomes

---

## Step 3: Extract Specifications

From the code analysis, extract:

### User Stories

Infer user stories from:

- UI components and their interactions
- API endpoints and their purposes
- Business logic and its goals

### Functional Requirements

Document:

- What the code does
- Input/output specifications
- Validation rules
- Error handling

### Technical Details

Capture:

- Architecture patterns used
- Data models
- Integration points
- Performance characteristics

---

## Step 4: Generate Specification

Create feature directory and write artifacts:

```bash
.specify/scripts/bash/create-new-feature.sh --json "Hydrated: [Feature Name]"
```

### Write spec.md

```markdown
---
id: [feature-id]
title: [Feature Title] (Hydrated)
status: hydrated
created: [ISO date]
source: reverse-engineered
author: Copilot
---

# [Feature Title]

> ⚠️ This specification was reverse-engineered from existing code. It documents
> the current implementation, not original requirements.

## Overview

[Description of what the code does]

## Source Files

| File   | Purpose        |
| ------ | -------------- |
| [path] | [What it does] |

## User Stories (Inferred)

### US1: [Inferred Story]

**As a** [actor] **I want to** [action observed in code] **So that** [inferred
benefit]

## Functional Requirements (Observed)

| ID     | Requirement          | Source      |
| ------ | -------------------- | ----------- |
| FR-001 | [What the code does] | [file:line] |

## Data Model (Extracted)

[Entities and relationships found in code]

## API Contracts (Documented)

[Endpoints and their specifications]

## Gaps and Uncertainties

- [ ] [Areas where intent is unclear]
- [ ] [Missing documentation]
- [ ] [Undocumented edge cases]
```

### Write tasks.md

Create a tasks.md that reflects the current state (all complete):

```markdown
---
feature: [Feature Name] (Hydrated)
status: hydrated
total_tasks: [N]
completed_tasks: [N]
---

# Tasks: [Feature Title] (Hydrated)

> These tasks represent the work that was done, reconstructed from code.

## Completed Tasks

- [x] T001 [What was implemented] in [path]
- [x] T002 [Another implementation] in [path]
```

---

## Step 5: Validation

1. **Cross-reference** generated spec with actual code
2. **Run existing tests** to verify understanding
3. **Document gaps** where behavior is unclear
4. **Flag uncertainties** for human review

```
✅ Hydration complete!

Generated:
- spec.md (feature specification)
- tasks.md (implementation record)

⚠️  Please review for accuracy - this was reverse-engineered from code.
```
