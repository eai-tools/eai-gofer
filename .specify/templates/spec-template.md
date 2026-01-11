# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g.,
"Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create
  accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email
  addresses"]
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their
  password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

_Example of marking unclear requirements:_

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth
  method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention
  period not specified]

### Key Entities _(include if feature involves data)_

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in
  under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users
  without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully
  complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by
  50%"]

---

## Out of Scope _(mandatory)_

<!--
  ACTION REQUIRED: Explicitly define what is NOT part of this feature.
  This prevents scope creep and AI agents from modifying unrelated code.
-->

### Excluded Functionality

- [Feature/capability explicitly NOT included in this work]
- [Related feature that will be addressed separately]

### Protected Boundaries (Must NOT Modify)

<!--
  CRITICAL: These boundaries are ENFORCED during implementation.
  If the agent needs to cross any boundary, it MUST:
  1. STOP execution
  2. Document the need and rationale
  3. Get explicit user approval before proceeding
-->

#### Protected Files/Directories

| Path                 | Reason                     |
| -------------------- | -------------------------- |
| [path/to/file.ts]    | [Why this must not change] |
| [path/to/directory/] | [Why this must not change] |

#### Protected Patterns/Behaviors

| Pattern/Behavior                | Reason                               |
| ------------------------------- | ------------------------------------ |
| [Existing behavior to preserve] | [Why this must not change]           |
| [API contract or interface]     | [Backward compatibility requirement] |

#### Protected Infrastructure

| Component                  | Reason                            |
| -------------------------- | --------------------------------- |
| [Database schema element]  | [Migration/compatibility concern] |
| [Authentication mechanism] | [Security requirement]            |

---

## Brownfield Analysis _(include for existing codebases)_

<!--
  For modifications to existing code, document constraints and risks.
  Skip this section for greenfield projects.
-->

### Legacy Constraints

- **Framework limitations**: [Describe any framework constraints]
- **Database constraints**: [Schema limitations, migration concerns]
- **API compatibility**: [Existing API contracts that must be maintained]
- **Performance requirements**: [Existing SLAs or benchmarks]

### Technical Debt Awareness

- **Issues to NOT aggravate**: [Known issues to work around]
- **Deprecated patterns**: [Patterns in codebase that should NOT be followed]
- **Areas needing caution**: [Fragile or complex areas]

### Integration Points

- **Existing services**: [Services this feature must integrate with]
- **Auth/authz patterns**: [How authentication/authorization works]
- **Error handling conventions**: [Existing error patterns to follow]
