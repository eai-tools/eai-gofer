---
description: Create feature specification informed by codebase research
---

# Gofer Specify

You are creating a feature specification informed by prior codebase research.
This is the **second stage** of the unified Gofer pipeline.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Prerequisites

This command expects:

- Feature directory already created at `.specify/specs/{feature}/`
- `research.md` completed from `/1_gofer_research`

If these don't exist, prompt user to run `/1_gofer_research` first.

---

## Outline

1. Context health check
2. Load existing research findings
3. Create specification using research context
4. Validate spec quality
5. Output: `.specify/specs/{feature}/spec.md`

---

## Step 0: Context Health Check

Before starting specification, assess context window health:

```bash
.specify/scripts/bash/check-context-health.sh
```

- If **< 50%**: Proceed normally
- If **50-70%**: Consider `/compact` before loading research.md
- If **> 70%**: Start new session with handoff summary

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
- **Open questions** (resolve or mark for clarification)

### 2.2 Generate Spec Content

Follow this execution flow:

1. **Parse feature context** from research
   - If research is incomplete: ERROR "Research incomplete, run
     /1_gofer_research"

2. **Extract key concepts**:
   - Actors (who uses this)
   - Actions (what they do)
   - Data (what's involved)
   - Constraints (from research)

3. **For unclear aspects**:
   - Check if research already answered it
   - Make informed guesses based on codebase patterns
   - Only mark with [NEEDS CLARIFICATION] if:
     - Significantly impacts scope or UX
     - Multiple reasonable interpretations exist
     - No reasonable default exists
   - **LIMIT: Maximum 3 [NEEDS CLARIFICATION] markers**

4. **Fill User Scenarios & Testing section**
   - Use integration points from research
   - If no clear user flow: ERROR "Cannot determine user scenarios"

5. **Generate Functional Requirements**
   - Each requirement must be testable
   - Reference codebase patterns from research

6. **Define Success Criteria**
   - Measurable, technology-agnostic outcomes
   - Include quantitative and qualitative measures

7. **Identify Key Entities** (if data involved)
   - Reference data-model patterns from research

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
author: Claude
---

# [Feature Title]

## Overview

[High-level description of what this feature does and why it matters]

**Research Reference**: See `research.md` for codebase analysis and integration
points.

## User Stories

### US1: [Primary User Story] (P1)

**As a** [user type] **I want to** [action] **So that** [benefit]

**Acceptance Criteria**:

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

### US2: [Secondary User Story] (P2)

...

## Functional Requirements

### FR1: [Requirement Name]

[Description of the requirement]

- **Validation**: [How to test this]
- **Integration**: [Reference to codebase integration point from research]

### FR2: [Requirement Name]

...

## Non-Functional Requirements

### Performance

- [Performance requirement informed by codebase patterns]

### Security

- [Security requirement]

### Compatibility

- [Compatibility with existing codebase patterns]

## Success Criteria

| Metric     | Target   | Measurement    |
| ---------- | -------- | -------------- |
| [Metric 1] | [Target] | [How measured] |
| [Metric 2] | [Target] | [How measured] |

## Assumptions

- [Assumption 1 - from research findings]
- [Assumption 2]

## Dependencies

- [Dependency on existing codebase component - from research]
- [External dependency]

## Out of Scope

- [What this feature does NOT include]

## Glossary

| Term   | Definition   |
| ------ | ------------ |
| [Term] | [Definition] |
```

---

## Step 4: Create Quality Checklist

Generate `{FEATURE_DIR}/checklists/requirements.md`:

```markdown
# Specification Quality Checklist: [FEATURE NAME]

**Purpose**: Validate specification completeness before planning **Created**:
[DATE] **Feature**: [Link to spec.md]

## Content Quality

- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed
- [ ] Research findings incorporated

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Success criteria are technology-agnostic
- [ ] All acceptance scenarios defined
- [ ] Edge cases identified
- [ ] Scope clearly bounded
- [ ] Dependencies identified (from research)

## Research Integration

- [ ] Integration points referenced
- [ ] Codebase patterns acknowledged
- [ ] Constraints from research addressed
- [ ] Technology decisions aligned

## Notes

Items marked incomplete require spec updates before `/3_gofer_plan`
```

---

## Step 5: Validate and Handle Clarifications

1. **Run validation** against checklist
2. **If items fail**: Update spec, re-validate (max 3 iterations)
3. **If [NEEDS CLARIFICATION] markers remain** (max 3):
   - Present questions with suggested answers
   - Wait for user response
   - Update spec with answers
   - Re-validate

---

## Step 6: Report and Continue

After spec.md is complete:

```
✓ Specification complete: {FEATURE_DIR}/spec.md

Summary:
- [N] User Stories defined
- [N] Functional Requirements
- [N] Success Criteria

Checklist: {FEATURE_DIR}/checklists/requirements.md

Ready for next stage: /3_gofer_plan
```

If orchestrated by `/0_business_scenario`, the orchestrator will automatically
invoke `/3_gofer_plan` next.

---

## Guidelines

### Quick Guidelines

- Focus on **WHAT** users need and **WHY**
- Avoid HOW to implement (that's for /3_gofer_plan)
- Written for business stakeholders, not developers
- **Use research findings** to inform requirements

### Success Criteria Guidelines

Success criteria must be:

1. **Measurable**: Specific metrics (time, percentage, count)
2. **Technology-agnostic**: No frameworks, languages, databases
3. **User-focused**: Outcomes from user perspective
4. **Verifiable**: Can be tested without implementation details

### Research Integration

- Reference research.md for technical context
- Use identified integration points in dependencies
- Acknowledge constraints in assumptions
- Align with codebase patterns discovered

---

## Observability Logging

At stage completion, log metrics:

```bash
.specify/scripts/bash/log-stage.sh 2_specify --complete --tokens [N] --compactions [N]
```

Logs to: `.specify/logs/pipeline.jsonl`
