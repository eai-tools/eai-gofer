---
name: 2_gofer_specify
description: Create feature specification informed by codebase research
agent: agent
tools: ['search/codebase', 'terminal', 'editFile']
argument-hint: The feature to specify (or continue from research)
---

# Gofer Specify

You are creating a feature specification informed by prior codebase research.
This is the **second stage** of the unified Gofer pipeline.

## Prerequisites

This command expects:

- Feature directory already created at `.specify/specs/{feature}/`
- `research.md` completed from `/1_gofer_research`

If these don't exist, prompt user to run `/1_gofer_research` first.

---

## Outline

1. Load existing research findings
2. Create specification using research context
3. Validate spec quality
4. Output: `.specify/specs/{feature}/spec.md`

---

## Step 1: Load Context

1. **Run setup script**:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json
   ```

   Parse JSON for FEATURE_DIR

2. **Load research.md** from FEATURE_DIR:
   - Integration points identified
   - Patterns to follow
   - Technology decisions made
   - Constraints documented

3. **Load spec template**: `.specify/templates/spec-template.md`

---

## Step 2: Create Specification

Using research findings, create the specification:

### 2.1 Extract Key Information from Research

From research.md, identify:

- **Where code will live** (from "Where to Implement")
- **Patterns to follow** (from "Existing Patterns")
- **Constraints** (from "Constraints & Considerations")

### 2.2 Generate Spec Content

1. **Parse feature context** from research
2. **Extract key concepts**:
   - Actors (who uses this)
   - Actions (what they do)
   - Data (what's involved)
   - Constraints (from research)

3. **Fill User Scenarios & Testing section**
4. **Generate Functional Requirements** - each must be testable
5. **Define Success Criteria** - measurable outcomes
6. **Identify Key Entities** (if data involved)

---

## Step 3: Write Specification

Write to `{FEATURE_DIR}/spec.md`:

```markdown
---
id: [feature-id]
title: [Feature Title]
status: draft
created: [ISO date]
updated: [ISO date]
author: Copilot
---

# [Feature Title]

## Overview

[High-level description of what this feature does and why it matters]

**Research Reference**: See `research.md` for codebase analysis.

## User Stories

### US1: [Primary User Story]

**As a** [actor] **I want to** [action] **So that** [benefit]

**Acceptance Criteria**:

- [ ] AC1: [Criterion 1]
- [ ] AC2: [Criterion 2]

## Functional Requirements

| ID     | Requirement   | Priority | Testable |
| ------ | ------------- | -------- | -------- |
| FR-001 | [Description] | P1       | Yes      |

## Success Criteria

- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

## Technical Constraints

From research.md:

- [Constraint 1]
- [Constraint 2]

## Out of Scope

- [What this feature does NOT include]
```

---

## Pipeline Continuation

After completing spec.md, automatically proceed to `/3_gofer_plan` to create the
technical implementation plan.
