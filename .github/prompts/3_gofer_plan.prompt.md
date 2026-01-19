---
name: 3_gofer_plan
description:
  Generate technical implementation plan with architecture and contracts
agent: agent
tools: ['search/codebase', 'terminal', 'editFile']
argument-hint: The feature to plan (or continue from specification)
---

# Gofer Plan

You are creating a detailed technical implementation plan. This is the **third
stage** of the unified Gofer pipeline, combining architecture design, data
modeling, and API contracts.

## Prerequisites

This command expects in `.specify/specs/{feature}/`:

- `research.md` - Codebase analysis (from /1_gofer_research)
- `spec.md` - Feature specification (from /2_gofer_specify)

If missing, prompt user to run the prerequisite stage.

---

## Outline

1. Load research and spec context
2. Design technical architecture
3. Generate data models and API contracts
4. Create implementation plan with phases
5. Output: `plan.md`, `data-model.md`, `contracts/`, `quickstart.md`

---

## Step 1: Load Context

1. **Run setup script**:

   ```bash
   .specify/scripts/bash/setup-plan.sh --json
   ```

   Parse JSON for FEATURE_DIR, FEATURE_SPEC, BRANCH

2. **Load existing documents**:
   - `research.md` - Technology decisions, integration points, patterns
   - `spec.md` - User stories, requirements, success criteria
   - `.specify/memory/constitution.md` - Project principles (if exists)

3. **Load plan template**: `.specify/templates/plan-template.md`

---

## Step 2: Technical Context Analysis

### From Research

Extract from research.md:

- **Integration Points**: Where new code connects to existing
- **Patterns to Follow**: Architectural patterns from codebase
- **Technology Decisions**: Libraries, frameworks chosen
- **Constraints**: Limitations identified

---

## Step 3: Design Data Model

If the feature involves data entities, create `{FEATURE_DIR}/data-model.md`:

```markdown
# Data Model: [Feature Name]

## Entities

### [Entity 1]

| Field | Type        | Required | Description       |
| ----- | ----------- | -------- | ----------------- |
| id    | string/uuid | Yes      | Unique identifier |

**Validation Rules**: [List rules]

**Relationships**: [Describe relationships]

## State Transitions

[Document state machine if applicable]
```

---

## Step 4: Design API Contracts

If the feature exposes APIs, create `{FEATURE_DIR}/contracts/`:

````markdown
# API Contracts: [Feature Name]

## Endpoints

### POST /api/[resource]

**Request**:

```json
{
  "field1": "string",
  "field2": "number"
}
```
````

**Response**:

```json
{
  "id": "string",
  "status": "success"
}
```

````

---

## Step 5: Create Implementation Plan

Write to `{FEATURE_DIR}/plan.md`:

```markdown
---
feature: [Feature Name]
created: [ISO date]
author: Copilot
status: draft
---

# Implementation Plan: [Feature Name]

## Technical Context

### Tech Stack

| Layer      | Technology  | Rationale        |
| ---------- | ----------- | ---------------- |
| [Layer]    | [Tech]      | [Why chosen]     |

### Architecture

[Describe the architectural approach]

## File Structure

```text
src/
├── [component]/
│   ├── [file].ts
│   └── [file].test.ts
````

## Implementation Phases (Vertical Slices)

**CRITICAL**: Each phase MUST be a vertical slice that:

- Includes frontend + backend + database changes (as applicable)
- Can be deployed and tested independently
- Builds on the previous iteration
- Delivers visible, demonstrable value

### Phase 1: [Slice Name]

**Goal**: [What value this delivers]

**Layers**:

- Data: [Schema/model changes]
- Backend: [Service/API changes]
- Frontend: [UI changes if applicable]
- Tests: [Test coverage]

**Tasks**:

- [ ] [Task 1]
- [ ] [Task 2]

**Verification**:

- [ ] [How to verify this slice works]

### Phase 2: [Slice Name]

[Same structure - each phase is independently deployable]

### Phase 3: [Slice Name]

[Continue pattern...]

**Note**: Avoid horizontal phases like "setup all databases first, then all
APIs". Each phase should deliver end-to-end functionality for a specific feature
slice.

## Dependencies

- [Dependency 1] - [Why needed]
- [Dependency 2] - [Why needed]

## Risk Assessment

| Risk   | Likelihood   | Impact       | Mitigation       |
| ------ | ------------ | ------------ | ---------------- |
| [Risk] | Low/Med/High | Low/Med/High | [How to address] |

```

---

## Pipeline Continuation

After completing plan.md, automatically proceed to `/4_gofer_tasks`
to generate the task breakdown.
```
