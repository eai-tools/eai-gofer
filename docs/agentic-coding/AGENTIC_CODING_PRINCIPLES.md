# Agentic Coding Principles

**Enterprise AI Pty Ltd - Best Practices for AI-Driven Development**

*Last Updated: January 2026*

---

## Executive Summary

Agentic coding is the practice of using AI assistants (Claude Code, GitHub
Copilot, etc.) to autonomously implement software features from specifications.
This document captures the latest research and best practices for achieving
high-quality outcomes with AI agents.

---

## 1. Context Window Management

### The Reality of Context Windows (2025-2026)

While AI models advertise large context windows, **effective accuracy degrades
significantly** as context fills:

| Model              | Advertised | Effective (High Accuracy) | Optimal Target |
| ------------------ | ---------- | ------------------------- | -------------- |
| Claude Sonnet 4    | 200k       | 60k-120k tokens           | 50-60%         |
| Claude Opus 4      | 200k       | 100k-150k tokens          | 60-70%         |
| Gemini 2.5 Pro     | 1M         | ~200k tokens              | 20-30%         |
| GPT-5              | 256k       | ~200k tokens              | 70-80%         |

**Golden Rule**: Target **50-60% of advertised context** for reliable operation.

### Context Health Monitoring

Monitor context usage throughout sessions:

| Status   | Token Usage | Action Required                      |
| -------- | ----------- | ------------------------------------ |
| Healthy  | < 50%       | Continue normally                    |
| Warning  | 50-70%      | Consider saving progress or compacting |
| Critical | > 70%       | Save session and start fresh context |

### Techniques to Manage Context

#### 1. Observation Masking

Replace stale tool outputs with placeholders:

```text
Before: [Full 5000-token file content from earlier in session]
After: <observation_replaced reason="stale_file_read">path/to/file.ts</observation_replaced>
```

**Benefits**: 50%+ cost reduction, 2.6% better solve rates (per 2025 research).

#### 2. Session Handoffs

When context exceeds thresholds:

1. Save current state (progress, decisions, blockers)
2. Start new session with fresh context
3. Load handoff document to restore context
4. Continue with clean context window

**What gets preserved in handoffs**:

- Current task progress and blockers
- Key decisions and rationale
- File modifications made
- Remaining work items

#### 3. Artifact-Based Memory

Store important information outside context in persistent files:

| File                    | Purpose                           |
| ----------------------- | --------------------------------- |
| `constitution.md`       | Coding standards (always loaded)  |
| `research.md`           | Codebase findings                 |
| `session-handoff.md`    | Session state for continuity      |
| `decisions/*.md`        | Architecture Decision Records     |

### Anti-Patterns to Avoid

1. **Reading entire files repeatedly** - Use targeted line ranges
2. **Keeping old tool results** - They consume context without adding value
3. **Verbose prompts** - Be concise; the agent understands context
4. **Not using sub-agents** - Monolithic context degrades faster
5. **Ignoring warning thresholds** - Context rot is gradual then sudden

---

## 2. Structured Output Principles

### Why Structure Matters

AI agents work best when outputs are predictable and parseable. Use:

- **JSON Schema** for data structures
- **Markdown with consistent headers** for documents
- **Explicit status indicators** for progress tracking
- **Typed interfaces** (TypeScript) for all data contracts

### Task Status Format

Use checkboxes with standardized markers:

```markdown
## Tasks

- [ ] T001 [Setup] Create initial project structure
- [x] T002 [Setup] Configure dependencies (completed)
- [ ] T003 [P] [US1] Implement user authentication
```

**Legend**:

- `- [ ]` = pending, `- [x]` = completed
- `T001` = unique ID for traceability
- `[P]` = can run in parallel
- `[US1]` = links to user story

### Error Classification

Categorize errors for appropriate recovery:

| Error Type             | Severity       | Agent Action                  |
| ---------------------- | -------------- | ----------------------------- |
| Syntax/Type error      | Recoverable    | Auto-fix with lint output     |
| Test failure           | Recoverable    | Analyze and fix               |
| Runtime error          | Needs context  | Request file contents         |
| Missing dependency     | Fatal          | Escalate to human             |
| Authentication failure | Fatal          | Escalate to human             |

---

## 3. Constitution-Based Validation

### What is a Constitution?

A project constitution defines **non-negotiable principles** that all code must
follow. AI agents validate against this document continuously.

### Recommended Constitution Sections

```markdown
# Project Constitution

## Code Quality Principles
- TypeScript strict mode, no `any` types
- Maximum file size: 300 lines
- All functions must have explicit return types

## Testing Requirements
- Minimum 80% coverage
- TDD workflow: write tests first
- Real tests with real data (no mocking)

## Security Principles
- Never store plaintext passwords
- JWT tokens expire within 1 hour
- All inputs must be validated

## Performance Requirements
- API responses < 500ms p95
- UI interactions < 100ms response
```

### Agent Validation Loop

1. Agent writes code
2. Agent validates against constitution
3. If violations found, agent fixes before committing
4. Human review as final gate

---

## 4. Research-Plan-Implement Framework

### The Three-Phase Approach

#### Phase 1: Research

- Explore codebase structure
- Identify patterns and conventions
- Map dependencies and interfaces
- Document findings in `research.md`

#### Phase 2: Plan

- Create technical architecture
- Define data models and contracts
- Break into dependency-ordered tasks
- Output: `plan.md`, `tasks.md`

#### Phase 3: Implement

- Execute tasks in dependency order
- Write tests before code (TDD)
- Validate against constitution
- Update task status as completed

### Automatic Chaining

The orchestrator should automatically chain phases:

```text
User Request
    ↓
Research → research.md
    ↓ AUTO
Plan → plan.md, tasks.md
    ↓ AUTO
Implement → [source code]
    ↓ AUTO
Validate → validation-report.md
```

**User only needs to start the process** - orchestrator handles everything.

### Resume Logic

When resuming work, detect the most advanced artifact:

| Has This                | Start At    |
| ----------------------- | ----------- |
| tasks.md (unchecked)    | Implement   |
| plan.md, no tasks.md    | Tasks       |
| spec.md, no plan.md     | Plan        |
| research.md, no spec.md | Specify     |
| Nothing                 | Research    |

---

## 5. Quality Gates and Validation

### Pre-Implementation Gates

- [ ] Constitution loaded and understood
- [ ] Research document created
- [ ] All dependencies mapped
- [ ] Test strategy defined

### Per-Task Gates

- [ ] Tests written before implementation
- [ ] Code passes linting
- [ ] Tests pass
- [ ] Constitution compliance verified

### Post-Implementation Gates

- [ ] All tasks completed
- [ ] Coverage >= 80%
- [ ] No lint errors
- [ ] Documentation updated

---

## 6. Communication Principles

### When Agent Should Ask

- Ambiguous requirements
- Security-sensitive decisions
- Architectural trade-offs
- Out-of-scope requests

### When Agent Should Proceed

- Clear requirements
- Following established patterns
- Routine implementations
- Test-verified changes

### Escalation Hierarchy

1. **Auto-resolve** (confidence >= 80%): Proceed with best judgment
2. **Quick check** (confidence 60-79%): Ask for confirmation
3. **Detailed discussion** (confidence < 60%): Present options with trade-offs
4. **Human required**: Security decisions, breaking changes, new patterns

---

## 7. Session Management Best Practices

### Starting a Session

1. Load constitution and relevant memory files
2. Review any existing progress (handoff documents)
3. Understand current context window usage
4. Plan scope for this session

### During a Session

1. Track token usage
2. Save important decisions to files
3. Checkpoint progress regularly
4. Watch for context health warnings

### Ending a Session

1. Complete current task or reach clean stopping point
2. Save session handoff document
3. Update task status in tasks.md
4. Note any blockers or decisions for next session

---

## 8. Metrics and Monitoring

### Key Metrics to Track

| Metric                  | Target     | Why It Matters                |
| ----------------------- | ---------- | ----------------------------- |
| Error detection latency | < 5s       | Fast feedback for agent       |
| Task completion rate    | > 85%      | Agent effectiveness           |
| Retry success rate      | > 70%      | Recovery capability           |
| Context efficiency      | < 60% used | Room for work                 |
| Test coverage           | > 80%      | Code quality                  |

### Logging Best Practices

Log all agent decisions for debugging:

```json
{
  "timestamp": "2026-01-17T10:30:00Z",
  "stage": "implement",
  "taskId": "T003",
  "decision": "Used existing auth pattern from UserService",
  "confidence": 0.92,
  "contextTokens": 85000
}
```

---

## References

- [MULTI_AGENT_ARCHITECTURE.md](MULTI_AGENT_ARCHITECTURE.md) - Sub-agent patterns
- [AGENTIC_TESTING_PATTERNS.md](AGENTIC_TESTING_PATTERNS.md) - Testing for AI agents
- [ITERATIVE_DEVELOPMENT.md](ITERATIVE_DEVELOPMENT.md) - Skateboard methodology
- [AGENT_TOOLING_REFERENCE.md](AGENT_TOOLING_REFERENCE.md) - MCP tools and APIs

---

**© 2026 Enterprise AI Pty Ltd. All rights reserved.**
