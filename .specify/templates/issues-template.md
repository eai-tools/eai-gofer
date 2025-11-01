---
description: 'GitHub issues template - ready to convert to actual GitHub issues'
---

# GitHub Issues: [FEATURE NAME]

**Generated from**: tasks.md **Feature ID**: [###-feature-name] **Total
Issues**: [COUNT]

This file contains GitHub-ready issue definitions for each task. Each issue
follows the Requirements Ticket template from enterpriseaigroup/Issues2025.

---

<!--
  ============================================================================
  ISSUE FORMAT

  Each issue below corresponds to a task in tasks.md and includes all fields
  from the GitHub issue template:

  - Screen described (Mike)
  - Business Rationale
  - Fields required (Mike)
  - Acceptance Criteria
  - Data needed (Mike)
  - Integrations Needed (Team)
  - Navigation (Mike)
  - Blocks needed (Team)
  - Definition of Ready checkboxes
  - Definition of Done checkboxes

  The format is markdown-based and can be converted to GitHub issues via:
  1. Manual creation through GitHub UI
  2. GitHub CLI: gh issue create
  3. GitHub API
  ============================================================================
-->

## Issue #1: [Task ID] - [Task Title]

**Labels**: `enhancement`, `phase-1-setup`, `[story-label]` **Assignees**:
@MikeNowosadko **Title**: [Feature]: [Task Description]

### Screen described (Mike)

[Description of the UI/functionality this task creates or modifies. If
backend-only, describe the API/service behavior.]

### Business Rationale

**Problem**: [What problem does this task solve?]

**Value**: [What value does completing this task provide?]

**Impact**: [How does this contribute to the overall feature goal?]

**Priority**: [P1/P2/P3] - [Reason for priority level]

### Fields required (Mike)

[If this task involves UI or data structures, list them here:]

| Field        | Type                        | Source                      | Validation         |
| ------------ | --------------------------- | --------------------------- | ------------------ |
| [field-name] | [string/number/boolean/etc] | [where the data comes from] | [validation rules] |

[If no fields: "N/A - This is a backend/infrastructure task"]

### Acceptance Criteria

- [ ] [Specific testable condition 1]
- [ ] [Specific testable condition 2]
- [ ] [Specific testable condition 3]
- [ ] [Performance/quality criteria if applicable]
- [ ] [Error handling criteria if applicable]

### Data needed (Mike)

[What data entities, sources, and APIs does this task require?]

**Entities**:

- [Entity name]: [Description, refresh cadence]

**Sources**:

- [System/API name]: [What data it provides]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[External or internal systems this task must integrate with:]

- [System name]: [Purpose of integration, API/method]

[If no integrations: "N/A - Standalone implementation"]

### Navigation (Mike)

[How users reach this functionality, or how this code is accessed:]

- **Access**: [How to reach this feature/code]
- **Flow**: [User journey or code execution path]
- **Links**: [Related screens/components this connects to]

[If backend: "N/A - Called via [endpoint/service method]"]

### Blocks needed (Team)

[UI components, services, or modules needed:]

**New Components**:

- [Component name]: [Description, technology]

**Reusable Components**:

- [Component name]: [Where it exists, how to reuse]

**Services/Utilities**:

- [Service name]: [Purpose, location in codebase]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [or N/A for backend]
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)

**Related Tasks**: [List dependent or related task IDs] **File Path**: [Exact
file path from tasks.md] **Estimated Effort**: [S/M/L or hours if known]

---

[Repeat the above issue format for each task in tasks.md]

---

## Summary by Phase

### Phase 1: Setup

- Issue #1 - #N: [Count] issues

### Phase 2: Foundational

- Issue #N - #N: [Count] issues

### Phase 3: User Story 1 (P1)

- Issue #N - #N: [Count] issues

[Continue for each phase...]

---

## Creating GitHub Issues

### Option 1: Manual Creation

Copy each issue section above into GitHub's issue creation form.

### Option 2: GitHub CLI

```bash
# For each issue, run:
gh issue create \
  --title "[Feature]: [Task Description]" \
  --label "enhancement,phase-1-setup" \
  --assignee "MikeNowosadko" \
  --body "$(cat issue-body.md)"
```

### Option 3: GitHub API

Use the GitHub REST API with the issue body formatted as the template requires.

### Option 4: Automation Script

[Link to script once created: `.specify/scripts/create-github-issues.js`]

---

## Notes

- All issues are pre-filled with the enterprise issue template structure
- Update Mike-specific sections before creating issues
- Adjust assignees based on actual team assignments
- Link related issues using GitHub's #issue-number syntax after creation
- Close issues as tasks are completed and checked off in tasks.md
