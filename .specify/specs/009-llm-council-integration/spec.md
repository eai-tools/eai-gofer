# Feature Specification: LLM Council Integration

**Feature Branch**: `009-llm-council-integration` **Created**: 2025-12-30
**Status**: Draft **Input**: User description: "LLM Council Integration: Add
multi-LLM council pattern to SpecGofer's parallel agent workflows"

## Overview

Enable SpecGofer's parallel agent workflows to leverage multiple AI providers
simultaneously, implementing the "LLM Council" pattern. This pattern gathers
diverse AI perspectives on the same task, optionally enables peer review between
AI providers, and synthesizes results into higher-quality unified outputs. The
requesting AI (e.g., Claude Code) acts as the "Chairman" that synthesizes all
council responses.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Configure AI Providers (Priority: P1)

As a developer using SpecGofer, I want to configure credentials for multiple AI
providers in my editor settings so that the council can query diverse AI models
during planning and analysis.

**Why this priority**: Without provider configuration, no council functionality
is possible. This is the foundation that enables all other features.

**Independent Test**: Can be fully tested by adding credentials in settings and
verifying they are validated and stored securely. Delivers the ability to
connect to multiple AI providers.

**Acceptance Scenarios**:

1. **Given** I open editor settings, **When** I navigate to SpecGofer settings,
   **Then** I see configuration options for multiple AI providers (Anthropic,
   Google, xAI, OpenAI)
2. **Given** I have entered credentials for a provider, **When** I save
   settings, **Then** the system validates the credential format and stores it
   securely
3. **Given** I have configured multiple providers, **When** I view the SpecGofer
   panel, **Then** I see a summary of which providers are available for council
   use
4. **Given** I have no additional providers configured (only the default),
   **When** parallel agents run, **Then** the system operates in single-provider
   mode (current behavior) with no errors

---

### User Story 2 - Multi-Provider Parallel Agent Execution (Priority: P1)

As a developer running a planning or analysis workflow, I want each parallel
agent to execute across all configured AI providers simultaneously so that I get
diverse perspectives on my codebase.

**Why this priority**: This is the core value proposition - getting multiple AI
perspectives on the same task. Without this, there is no council.

**Independent Test**: Can be fully tested by running a planning workflow with
multiple providers configured and observing that each agent queries all
providers in parallel. Delivers diverse AI perspectives on codebase exploration.

**Acceptance Scenarios**:

1. **Given** I have 3 AI providers configured, **When** I run a planning
   workflow, **Then** each parallel agent executes across all 3 providers
   (multiplied requests)
2. **Given** parallel agent execution is in progress, **When** I observe the
   output, **Then** I see progress indicators showing requests to each provider
3. **Given** one AI provider fails or times out, **When** other providers
   respond successfully, **Then** the council continues with available responses
   and notes the failure
4. **Given** all parallel requests complete, **When** responses are collected,
   **Then** they are aggregated by agent type with provider attribution for
   internal processing

---

### User Story 3 - Chairman Synthesis (Priority: P1)

As a developer, I want the requesting AI (e.g., Claude Code) to act as
"Chairman" and synthesize all council responses into a unified, high-quality
output so that I receive consolidated insights rather than multiple separate
answers.

**Why this priority**: Raw council output is overwhelming. Synthesis transforms
diverse inputs into actionable, unified guidance. This completes the council
workflow.

**Independent Test**: Can be fully tested by running a council-enabled workflow
and verifying the Chairman produces a single synthesized document that
incorporates insights from all council members. Delivers actionable, unified
output.

**Acceptance Scenarios**:

1. **Given** the council has collected responses from multiple providers,
   **When** synthesis begins, **Then** the Chairman AI receives all responses
   with provider identity removed (anonymized)
2. **Given** the Chairman receives anonymized responses, **When** synthesis
   completes, **Then** a single unified output is produced that combines the
   best insights
3. **Given** council members provided conflicting recommendations, **When** the
   Chairman synthesizes, **Then** conflicts are explicitly noted with the
   Chairman's resolution rationale
4. **Given** synthesis is complete, **When** I view the output, **Then** it
   follows the same format as single-provider output (backward compatible
   structure)

---

### User Story 4 - Optional Peer Review Stage (Priority: P2)

As a developer seeking maximum quality, I want to optionally enable a peer
review stage where each AI evaluates and ranks the other AIs' responses before
synthesis so that consensus and quality indicators inform the final output.

**Why this priority**: Peer review adds quality signals but increases cost and
latency. Making it optional allows users to choose their quality/cost tradeoff.

**Independent Test**: Can be fully tested by enabling peer review in
configuration, running a council workflow, and verifying each AI provides
rankings of other responses. Delivers quality indicators and consensus metrics.

**Acceptance Scenarios**:

1. **Given** peer review is enabled in configuration, **When** first-opinion
   responses are collected, **Then** each AI receives anonymized responses from
   other AIs for review
2. **Given** an AI is reviewing peer responses, **When** review completes,
   **Then** it provides rankings (best to worst) with brief justifications
3. **Given** all peer reviews are complete, **When** the Chairman synthesizes,
   **Then** peer rankings are included as quality signals in the synthesis
   context
4. **Given** peer review is disabled (default), **When** council runs, **Then**
   synthesis proceeds directly after first opinions without peer review

---

### User Story 5 - Council Configuration (Priority: P2)

As a developer, I want to configure which workflow stages use council mode via a
configuration file so that I can balance quality improvements against cost and
latency for different use cases.

**Why this priority**: Not all stages benefit equally from council.
Configuration allows optimization of the quality/cost tradeoff per project.

**Independent Test**: Can be fully tested by creating a council configuration
file and verifying that specified stages use council while others use
single-provider mode. Delivers per-stage control over council behavior.

**Acceptance Scenarios**:

1. **Given** I create a council configuration file, **When** I specify which
   stages use council, **Then** only those stages execute multi-provider queries
2. **Given** a stage is configured for council mode, **When** that stage runs,
   **Then** it uses all configured AI providers
3. **Given** a stage is not configured for council mode, **When** that stage
   runs, **Then** it uses single-provider mode (current behavior)
4. **Given** no configuration file exists, **When** any stage runs, **Then** the
   system uses sensible defaults (council for planning/analysis, single-provider
   for execution)

---

### User Story 6 - Cost and Usage Visibility (Priority: P3)

As a developer, I want to see estimated and actual costs for council operations
so that I can make informed decisions about when to use council mode.

**Why this priority**: Multi-provider usage multiplies costs. Transparency helps
users budget and optimize usage. Important but not blocking core functionality.

**Independent Test**: Can be fully tested by running council workflows and
verifying cost estimates are shown before execution and actual usage is logged
after. Delivers cost awareness and usage tracking.

**Acceptance Scenarios**:

1. **Given** I initiate a council-enabled workflow, **When** the workflow
   starts, **Then** I see an estimated usage impact (e.g., "Council mode: ~3x
   normal usage")
2. **Given** a council workflow completes, **When** I view the summary, **Then**
   I see actual usage per provider
3. **Given** I want to review historical usage, **When** I access usage logs,
   **Then** I see council vs single-provider usage breakdown

---

### Edge Cases

- What happens when only one AI provider is configured? System operates in
  single-provider mode (current behavior), no council overhead
- What happens when all council members return identical responses? Chairman
  notes consensus and produces streamlined output
- What happens when a provider's credentials are invalid or expired? Provider is
  marked unavailable, council continues with remaining providers, user is
  notified
- What happens when the Chairman AI is also configured as a council member? The
  Chairman is excluded from first opinions to prevent self-bias
- What happens during network issues or high latency? Configurable timeout per
  provider, partial results accepted, failures logged
- What happens when council configuration file is malformed? System falls back
  to defaults with warning message

## Requirements _(mandatory)_

### Functional Requirements

**Provider Configuration:**

- **FR-001**: System MUST allow users to configure credentials for Anthropic,
  Google (Gemini), xAI (Grok), and OpenAI in editor settings
- **FR-002**: System MUST validate credential format before storing
- **FR-003**: System MUST store credentials securely using the editor's secure
  storage mechanism
- **FR-004**: System MUST display which providers are available/configured in a
  summary view

**Multi-Provider Execution:**

- **FR-005**: System MUST execute each parallel agent across all configured AI
  providers simultaneously
- **FR-006**: System MUST handle provider failures gracefully without blocking
  the entire workflow
- **FR-007**: System MUST aggregate responses by agent type with provider
  attribution for internal processing
- **FR-008**: System MUST anonymize provider identity before synthesis (remove
  attribution from responses shown to Chairman)

**Chairman Synthesis:**

- **FR-009**: System MUST designate the requesting AI as Chairman for synthesis
- **FR-010**: System MUST provide the Chairman with all collected responses in a
  structured format
- **FR-011**: System MUST produce a single unified output that follows existing
  output formats
- **FR-012**: System MUST explicitly note and resolve conflicts in council
  member responses

**Peer Review (Optional):**

- **FR-013**: System MUST support an optional peer review stage between first
  opinions and synthesis
- **FR-014**: When enabled, system MUST have each AI rank other AIs' responses
- **FR-015**: System MUST include peer rankings as context for Chairman
  synthesis

**Configuration:**

- **FR-016**: System MUST support a configuration file for per-stage council
  settings
- **FR-017**: System MUST provide sensible defaults when no configuration exists
- **FR-018**: System MUST fall back to single-provider mode when only one
  provider is configured

**Observability:**

- **FR-019**: System MUST show progress indicators during multi-provider
  execution
- **FR-020**: System MUST log usage per provider for cost tracking
- **FR-021**: System MUST display estimated usage impact before council-enabled
  workflows

### Key Entities

- **AI Provider**: Represents a configured AI service (Anthropic, Google, xAI,
  OpenAI) with credentials and availability status
- **Council Member**: An AI provider participating in a specific council
  session, producing first opinions and optionally peer reviews
- **Council Session**: A single execution of the council pattern, containing
  first opinions, optional peer reviews, and synthesized output
- **First Opinion**: A response from a council member to an agent prompt, before
  peer review or synthesis
- **Peer Review**: A council member's evaluation and ranking of other members'
  first opinions
- **Synthesis**: The Chairman's unified output combining insights from all
  council inputs

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can configure at least 4 AI providers within 5 minutes of
  first use
- **SC-002**: Council-enabled workflows complete within 2x the latency of
  single-provider workflows (parallel execution benefit)
- **SC-003**: 90% of council workflows complete successfully even when 1 of 3+
  providers experiences failure
- **SC-004**: Users report higher confidence in planning decisions when using
  council mode (qualitative feedback)
- **SC-005**: Council synthesis outputs pass the same validation checks as
  single-provider outputs (backward compatibility)
- **SC-006**: Usage estimates shown before workflow execution are within 20% of
  actual usage

## Assumptions

- Users have valid credentials for at least one AI provider before using council
  features
- All configured AI providers support the prompt formats used by SpecGofer
  agents
- Network latency to AI providers is acceptable (under 30 seconds for typical
  requests)
- Users understand that council mode increases usage costs proportionally to the
  number of providers
- The requesting AI has sufficient context capacity to receive all council
  responses for synthesis
- AI providers' rate limits are sufficient for parallel requests (or users will
  configure appropriately)

## Dependencies

- Existing editor settings infrastructure (credential storage pattern)
- Existing parallel agent infrastructure (agent dispatch mechanism)
- Existing slash command infrastructure for planning and analysis workflows

## Out of Scope

- Custom AI provider plugins (only the 4 major providers are supported
  initially)
- Automatic provider selection based on task type (all configured providers are
  used)
- Usage-based load balancing across providers
- Provider cost optimization (choosing cheaper providers for simpler tasks)
- Real-time streaming of council responses (batch collection then synthesis)
